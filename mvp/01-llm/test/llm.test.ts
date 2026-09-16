import assert from "node:assert/strict"
import test from "node:test"

import { LLM } from "../src/llm.js"
import type { LLMEvent, LLMRequest, Provider, ProviderEvent } from "../src/types.js"

class FakeProvider implements Provider {
  readonly name: string
  readonly model = "fake-model"

  constructor(
    name: string,
    private readonly run: (request: LLMRequest) => AsyncIterable<ProviderEvent>,
  ) {
    this.name = name
  }

  stream(request: LLMRequest): AsyncIterable<ProviderEvent> {
    return this.run(request)
  }
}

async function collect(llm: LLM, request: LLMRequest): Promise<LLMEvent[]> {
  const events: LLMEvent[] = []
  for await (const event of llm.stream(request)) events.push(event)
  return events
}

test("normalizes provider output into LLM events", async () => {
  const provider = new FakeProvider("fake", async function* () {
    yield { type: "text", text: "hello" }
    yield { type: "text", text: " world" }
    yield { type: "finish", reason: "stop", usage: { totalTokens: 12 } }
  })

  const events = await collect(new LLM(provider), {
    messages: [{ role: "user", content: "hi" }],
  })

  assert.deepEqual(events, [
    { type: "start", provider: "fake", model: "fake-model" },
    { type: "text-delta", text: "hello" },
    { type: "text-delta", text: " world" },
    { type: "finish", reason: "stop", usage: { totalTokens: 12 } },
  ])
})

test("turns provider failures into one error event", async () => {
  const provider = new FakeProvider("broken", async function* () {
    throw new Error("provider unavailable")
  })

  const events = await collect(new LLM(provider), {
    messages: [{ role: "user", content: "hi" }],
  })

  assert.equal(events[0]?.type, "start")
  assert.deepEqual(events[1], {
    type: "error",
    message: "provider unavailable",
    aborted: false,
  })
})

test("passes AbortSignal through the LLM boundary", async () => {
  const controller = new AbortController()
  controller.abort()

  const provider = new FakeProvider("abortable", async function* (request) {
    if (request.signal?.aborted) throw new DOMException("Aborted", "AbortError")
    yield { type: "finish", reason: "stop" }
  })

  const events = await collect(new LLM(provider), {
    messages: [{ role: "user", content: "hi" }],
    signal: controller.signal,
  })

  assert.deepEqual(events[1], {
    type: "error",
    message: "Aborted",
    aborted: true,
  })
})

test("consumer code does not change when the provider implementation changes", async () => {
  const answer = async (provider: Provider) => {
    const events = await collect(new LLM(provider), {
      messages: [{ role: "user", content: "hi" }],
    })
    return events.filter((event) => event.type === "text-delta").map((event) => event.text).join("")
  }

  const a = new FakeProvider("a", async function* () {
    yield { type: "text", text: "A" }
    yield { type: "finish", reason: "stop" }
  })
  const b = new FakeProvider("b", async function* () {
    yield { type: "text", text: "B" }
    yield { type: "finish", reason: "stop" }
  })

  assert.equal(await answer(a), "A")
  assert.equal(await answer(b), "B")
})
