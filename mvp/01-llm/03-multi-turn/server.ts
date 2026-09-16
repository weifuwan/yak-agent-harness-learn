import { createServer, type IncomingMessage, type ServerResponse } from "node:http"
import { readFile } from "node:fs/promises"
import { dirname, extname, join } from "node:path"
import { fileURLToPath } from "node:url"
import MarkdownIt from "markdown-it"

type Message = {
  role: "user" | "assistant"
  content: string
}

const apiKey = process.env.MODEL_API_KEY?.trim()
const baseUrl = (process.env.MODEL_BASE_URL ?? "https://api.deepseek.com").replace(/\/+$/, "")
const model = process.env.MODEL_NAME?.trim() || "deepseek-flash"
const port = Number(process.env.PORT ?? 3030)
const publicDir = join(dirname(fileURLToPath(import.meta.url)), "public")
const markdown = new MarkdownIt({ html: false, linkify: true, breaks: true })

const SYSTEM_PROMPT = [
  "你是一个简洁、准确的编程学习助手。",
  "回答可以使用 Markdown，包括标题、列表、代码块和行内代码。",
  "如果上下文里有前面的 user / assistant 消息，请结合这些历史继续回答。",
].join("\n")

if (!apiKey) {
  throw new Error("MODEL_API_KEY is required. Copy .env.example to .env and fill it in.")
}

function sendJson(response: ServerResponse, status: number, body: unknown) {
  response.writeHead(status, { "Content-Type": "application/json; charset=utf-8" })
  response.end(JSON.stringify(body))
}

async function readJson(request: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = []
  let size = 0

  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
    size += buffer.length
    if (size > 1_000_000) throw new Error("Request body is too large")
    chunks.push(buffer)
  }

  const raw = Buffer.concat(chunks).toString("utf8")
  return raw ? JSON.parse(raw) : {}
}

function normalizeMessages(value: unknown): Message[] {
  if (!Array.isArray(value)) throw new Error("messages must be an array")

  return value.map((item, index) => {
    if (!item || typeof item !== "object") throw new Error(`messages[${index}] must be an object`)
    const record = item as Record<string, unknown>
    if (record.role !== "user" && record.role !== "assistant") {
      throw new Error(`messages[${index}].role must be user or assistant`)
    }
    if (typeof record.content !== "string" || !record.content.trim()) {
      throw new Error(`messages[${index}].content must be a non-empty string`)
    }
    return { role: record.role, content: record.content.trim() }
  })
}

async function callModel(messages: Message[]): Promise<string> {
  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        ...messages,
      ],
      stream: false,
    }),
  })

  const rawBody = await response.text()
  if (!response.ok) throw new Error(`Model HTTP ${response.status}: ${rawBody}`)

  const payload = JSON.parse(rawBody) as {
    choices?: Array<{ message?: { content?: string | null } }>
  }
  const content = payload.choices?.[0]?.message?.content?.trim()
  if (!content) throw new Error("Model returned no assistant text")
  return content
}

const staticTypes: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
}

async function serveStatic(pathname: string, response: ServerResponse) {
  const relative = pathname === "/" ? "index.html" : pathname.slice(1)
  if (!relative || relative.includes("..") || !["index.html", "app.js", "style.css"].includes(relative)) {
    response.writeHead(404)
    response.end("Not Found")
    return
  }

  const file = join(publicDir, relative)
  const content = await readFile(file)
  response.writeHead(200, {
    "Content-Type": staticTypes[extname(file)] ?? "application/octet-stream",
    "Cache-Control": "no-store",
  })
  response.end(content)
}

const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url ?? "/", `http://${request.headers.host ?? "localhost"}`)

    if (request.method === "POST" && url.pathname === "/api/chat") {
      const body = await readJson(request) as { messages?: unknown }
      const messages = normalizeMessages(body.messages)
      if (messages.length === 0 || messages.at(-1)?.role !== "user") {
        throw new Error("messages must end with the current user message")
      }

      const content = await callModel(messages)
      sendJson(response, 200, {
        assistant: {
          role: "assistant",
          content,
          html: markdown.render(content),
        },
        messageCountSentByBrowser: messages.length,
      })
      return
    }

    if (request.method === "GET" && url.pathname === "/api/health") {
      sendJson(response, 200, { ok: true, model })
      return
    }

    if (request.method === "GET") {
      await serveStatic(url.pathname, response)
      return
    }

    response.writeHead(405)
    response.end("Method Not Allowed")
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    sendJson(response, 400, { error: message })
  }
})

server.listen(port, "127.0.0.1", () => {
  console.log(`LLM 03 chat: http://127.0.0.1:${port}`)
  console.log("No database / localStorage / sessionStorage. Refreshing the page clears the conversation.")
})
