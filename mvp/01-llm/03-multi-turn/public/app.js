const messages = []

const messagesElement = document.querySelector("#messages")
const form = document.querySelector("#chatForm")
const input = document.querySelector("#promptInput")
const sendButton = document.querySelector("#sendButton")
const clearButton = document.querySelector("#clearButton")
const statusText = document.querySelector("#statusText")
const messagesJson = document.querySelector("#messagesJson")

function updateLearningView() {
  messagesJson.textContent = JSON.stringify(messages, null, 2)
  statusText.textContent = `浏览器 messages: ${messages.length}`
}

function removeEmptyState() {
  messagesElement.querySelector(".empty-state")?.remove()
}

function scrollToBottom() {
  messagesElement.scrollTop = messagesElement.scrollHeight
}

function addUserMessage(content) {
  removeEmptyState()

  const row = document.createElement("div")
  row.className = "message-row user-row"

  const bubble = document.createElement("div")
  bubble.className = "message user-message"
  bubble.textContent = content

  row.appendChild(bubble)
  messagesElement.appendChild(row)
  scrollToBottom()
}

function addAssistantMessage(html) {
  const row = document.createElement("div")
  row.className = "message-row assistant-row"

  const bubble = document.createElement("article")
  bubble.className = "message assistant-message markdown-body"
  bubble.innerHTML = html

  row.appendChild(bubble)
  messagesElement.appendChild(row)
  scrollToBottom()
}

function addErrorMessage(message) {
  const row = document.createElement("div")
  row.className = "message-row assistant-row"

  const bubble = document.createElement("div")
  bubble.className = "message error-message"
  bubble.textContent = `请求失败：${message}`

  row.appendChild(bubble)
  messagesElement.appendChild(row)
  scrollToBottom()
}

function addThinkingMessage() {
  const row = document.createElement("div")
  row.className = "message-row assistant-row"
  row.dataset.pending = "true"

  const bubble = document.createElement("div")
  bubble.className = "message assistant-message pending-message"
  bubble.textContent = "Assistant 正在回答…"

  row.appendChild(bubble)
  messagesElement.appendChild(row)
  scrollToBottom()
  return row
}

async function sendMessage(content) {
  messages.push({ role: "user", content })
  addUserMessage(content)
  updateLearningView()

  const pending = addThinkingMessage()
  sendButton.disabled = true
  clearButton.disabled = true
  input.disabled = true

  try {
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages }),
    })

    const payload = await response.json()
    if (!response.ok) throw new Error(payload.error || `HTTP ${response.status}`)

    pending.remove()
    messages.push({
      role: payload.assistant.role,
      content: payload.assistant.content,
    })
    addAssistantMessage(payload.assistant.html)
    updateLearningView()
  } catch (error) {
    pending.remove()
    messages.pop()
    addErrorMessage(error instanceof Error ? error.message : String(error))
    updateLearningView()
  } finally {
    sendButton.disabled = false
    clearButton.disabled = false
    input.disabled = false
    input.focus()
  }
}

form.addEventListener("submit", async (event) => {
  event.preventDefault()
  const content = input.value.trim()
  if (!content) return
  input.value = ""
  await sendMessage(content)
})

input.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault()
    form.requestSubmit()
  }
})

clearButton.addEventListener("click", () => {
  messages.length = 0
  messagesElement.replaceChildren()

  const state = document.createElement("div")
  state.className = "empty-state"
  state.innerHTML = "<strong>对话已清空。</strong><span>这里没有数据库，也没有浏览器持久化。</span>"
  messagesElement.appendChild(state)

  updateLearningView()
  input.focus()
})

updateLearningView()
