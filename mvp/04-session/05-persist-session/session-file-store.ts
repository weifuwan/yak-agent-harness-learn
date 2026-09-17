import { mkdir, readFile, writeFile } from "node:fs/promises"
import path from "node:path"
import type {
  Session,
  SessionMessage,
} from "../04-multiple-sessions/session-store.js"

export const DEFAULT_SESSION_DIR = path.resolve(process.cwd(), ".sessions")

function validateSessionId(sessionId: string): string {
  const id = sessionId.trim()

  if (!id) {
    throw new Error("sessionId must be a non-empty string")
  }

  if (!/^[a-zA-Z0-9_-]+$/.test(id)) {
    throw new Error(
      "sessionId may only contain letters, numbers, underscore, and hyphen",
    )
  }

  return id
}

function getSessionFilePath(sessionId: string, sessionDir: string): string {
  const id = validateSessionId(sessionId)
  return path.join(sessionDir, `${id}.json`)
}

function isSessionMessage(value: unknown): value is SessionMessage {
  if (typeof value !== "object" || value === null) {
    return false
  }

  const message = value as Record<string, unknown>

  if (message.role === "user") {
    return typeof message.content === "string"
  }

  if (message.role === "tool") {
    return (
      typeof message.tool_call_id === "string" &&
      typeof message.content === "string"
    )
  }

  if (message.role === "assistant") {
    const contentIsValid =
      message.content === null || typeof message.content === "string"
    const toolCallsAreValid =
      message.tool_calls === undefined || Array.isArray(message.tool_calls)

    return contentIsValid && toolCallsAreValid
  }

  return false
}

function parseSession(rawText: string, expectedSessionId: string): Session {
  const parsed = JSON.parse(rawText) as unknown

  if (typeof parsed !== "object" || parsed === null) {
    throw new Error("Persisted session must be a JSON object")
  }

  const value = parsed as Record<string, unknown>

  if (value.id !== expectedSessionId) {
    throw new Error(
      `Persisted session id mismatch: expected '${expectedSessionId}', received '${String(value.id)}'`,
    )
  }

  if (!Array.isArray(value.messages) || !value.messages.every(isSessionMessage)) {
    throw new Error("Persisted session.messages is invalid")
  }

  return {
    id: expectedSessionId,
    messages: value.messages,
  }
}

export async function saveSession(
  session: Session,
  sessionDir = DEFAULT_SESSION_DIR,
): Promise<string> {
  const filePath = getSessionFilePath(session.id, sessionDir)

  await mkdir(sessionDir, { recursive: true })
  await writeFile(filePath, `${JSON.stringify(session, null, 2)}\n`, "utf8")

  return filePath
}

export async function loadSession(
  sessionId: string,
  sessionDir = DEFAULT_SESSION_DIR,
): Promise<Session> {
  const id = validateSessionId(sessionId)
  const filePath = getSessionFilePath(id, sessionDir)
  const rawText = await readFile(filePath, "utf8")

  return parseSession(rawText, id)
}
