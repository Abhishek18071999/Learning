import type { Lesson } from "../../types";

export const lesson: Lesson = {
  id: "7.1.3",
  title: "Calling LLM APIs: structured output, tools, streaming",
  minutes: 90,
  level: "Intermediate",
  prerequisites: [
    "7.1.2 Prompt engineering",
    "4.2.1 FastAPI for AI and data services",
    "3.4.1 React components (for the streaming client)",
  ],
  summary: "Use an LLM API like a backend engineer: typed structured output with validation, tool use (function calling) with a safe agent loop, token streaming from FastAPI to the browser, and error handling, retries and tests that never touch the network.",
  terms: [
    {
      term: "Structured output",
      def: "A response constrained to a JSON schema you supply, so your code can parse it without guesswork.",
    },
    {
      term: "Tool use (function calling)",
      def: "You describe functions with a name, description and input schema; the model replies with a request to call one, your code runs it and sends back the result.",
    },
    {
      term: "tool_use / tool_result",
      def: "The content blocks for a tool call request (from the model) and its answer (from your code), linked by an id.",
    },
    {
      term: "stop_reason",
      def: "Why the model stopped: end_turn (finished), tool_use (wants a tool), max_tokens (cut off), refusal, and others.",
    },
    {
      term: "Streaming",
      def: "Receiving the response as a sequence of events while it is generated, instead of waiting for the whole thing.",
    },
    {
      term: "SSE",
      def: "Server-Sent Events: a simple HTTP format (`data: ...` lines) for pushing a stream of events from server to browser.",
    },
    {
      term: "TTFT",
      def: "Time to first token: how long the user waits before anything appears. Streaming makes it the latency users feel.",
    },
    {
      term: "Idempotent",
      def: "Safe to repeat. Retries are only safe for idempotent operations or when you can detect duplicates.",
    },
  ],
  problem: [
    "DevAtlas wants three AI features: parse a student's free-text study note into a progress record, a study assistant that can look up the student's progress and search lessons, and an 'explain this' button that starts answering instantly instead of after 8 seconds.",
    "A naive implementation breaks on day one: regex over prose fails, the model 'guesses' progress instead of reading it, the browser shows a spinner for 8 seconds, a 429 rate-limit error becomes a 500 for the user, and tests call the real API, so they are slow, flaky and cost money. This lesson builds all three features properly.",
  ],
  concept: {
    analogy: [
      "Think of the model as a very capable colleague on a phone call. **Structured output** is handing them a form to fill in rather than asking them to talk. **Tools** are letting them say 'please look up the student's record and read it to me': they cannot touch your database, they ask you, you decide whether to do it and you read back the result. **Streaming** is hearing their answer as they speak instead of waiting for a voicemail.",
    ],
    precise: [
      "**Messages API.** You send `model`, `max_tokens`, an optional `system` prompt and a list of `messages` (alternating user and assistant turns). The API is stateless: you resend the history every call. The response has `content` (a list of typed blocks: `text`, `thinking`, `tool_use`), a `stop_reason` and `usage`.",
      "**Structured output.** Pass a JSON schema (or a Pydantic model via `messages.parse`) and the output is constrained to it. The SDK validates the result into your model; rules a schema cannot express still need code.",
      "**Tool use loop.** (1) Send tools with the request. (2) If `stop_reason == \"tool_use\"`, run every `tool_use` block. (3) Append the assistant message, then one user message containing all `tool_result` blocks (each with the matching `tool_use_id`). (4) Call again. Repeat until `end_turn`, with a turn limit. The SDK's **tool runner** does this loop for you.",
      "**Streaming.** `messages.stream()` yields events while the model generates; `text_stream` gives just the text deltas, and `get_final_message()` gives the complete message with usage. Forward deltas to the browser with SSE.",
      "**Failure handling.** Rate limits (429), overload (529) and server errors (5xx) are temporary: the SDK retries them with exponential backoff, and if they persist you return 503. Bad requests (400) are bugs in your code: do not retry. Always set a timeout.",
    ],
  },
  underTheHood: {
    text: [
      "A tool definition is just text in the prompt: the name, description and JSON schema are shown to the model, which was trained to emit a structured `tool_use` block when a tool would help. The model never executes anything. Your code is the only thing that touches databases and APIs, which is exactly where authorization belongs.",
      "With `strict: true` on a tool (or a JSON schema output format), the API uses constrained decoding: at each step only tokens that keep the JSON valid against the schema are allowed. Validity is guaranteed; correctness is not.",
      "Streaming uses SSE over a single HTTP response: `message_start`, then for each content block `content_block_start`, many `content_block_delta` events, `content_block_stop`, then `message_delta` (stop reason, final usage) and `message_stop`. The SDK assembles these for you.",
      "On current Claude models, forcing a specific tool with `tool_choice` is rejected; you describe tools well, mention them in the prompt, and check whether a `tool_use` block came back.",
      "Thinking: current Claude models may emit `thinking` blocks before the answer. Always select blocks by `type`, and when you continue a tool loop, send the assistant `content` back unmodified (it may include thinking blocks the API expects to see).",
    ],
    diagram: {
      title: "One tool-use round trip",
      nodes: [
        { label: "Your API", sub: "messages + tools" },
        { label: "Model", sub: "stop_reason: tool_use" },
        { label: "Your code", sub: "authorize + run tool" },
        { label: "tool_result", sub: "same tool_use_id" },
        { label: "Model", sub: "end_turn + answer" },
      ],
      edges: ["request", "tool_use blocks", "result or is_error", "next request"],
    },
  },
  handsOn: [
    {
      title: "Structured extraction with validation",
      text: [
        "Turn a student's free-text note into a typed record. Pydantic describes the shape; `messages.parse` constrains the output and validates it.",
      ],
      code: {
        lang: "python",
        file: "extract.py",
        code: `from datetime import date

from anthropic import Anthropic
from pydantic import BaseModel, Field

client = Anthropic()

class StudySession(BaseModel):
    lesson_id: str = Field(pattern=r"^\\d+\\.\\d+\\.\\d+$")
    minutes: int = Field(ge=1, le=600)
    day: date
    mood: int = Field(ge=1, le=5, description="1 = frustrated, 5 = great")

def parse_log(note: str) -> StudySession:
    response = client.messages.parse(
        model="claude-haiku-5-5",
        max_tokens=1000,
        system=f"Extract one study session from the student's note. Today is {date.today():%A}.",
        messages=[{"role": "user", "content": f"<note>{note}</note>"}],
        output_format=StudySession,
    )
    return response.parsed_output        # a validated StudySession

if __name__ == "__main__":
    s = parse_log("did 7.1.3 for about an hour and a half on 14 Oct 2026, felt pretty good")
    print(s)
    print(s.model_dump_json())`,
      },
      output: "lesson_id='7.1.3' minutes=90 day=datetime.date(2026, 10, 14) mood=4\n{\"lesson_id\":\"7.1.3\",\"minutes\":90,\"day\":\"2026-10-14\",\"mood\":4}",
      notes: [
        "Shown output is from a recorded response; the model's extraction can differ.",
        "Constraints like `ge`, `le` and `pattern` are not all enforceable by the API's schema engine. The SDK moves them into the field description for the model and then **validates them in Python**, so an out-of-range value raises `pydantic.ValidationError`. Catch it and retry (homework basic).",
        "Using a small model for extraction is usually enough; check with an eval.",
      ],
    },
    {
      title: "Tool use: the loop, by hand",
      text: [
        "Understand the loop once by writing it yourself. The model asks for tools; your code authorizes and runs them, then reports results, including errors, back.",
      ],
      code: {
        lang: "python",
        file: "tools_loop.py",
        code: `import json

from anthropic import Anthropic

client = Anthropic()
PROGRESS = {"u1": {"done": ["7.1.1", "7.1.2"], "streak_days": 4}}
LESSONS = {"7.1.3": "Calling LLM APIs", "7.2.1": "RAG end to end", "9.1.1": "Docker in depth"}

TOOLS = [
    {
        "name": "get_progress",
        "description": "Get the current student's completed lesson ids and streak. Use before recommending lessons.",
        "strict": True,
        "input_schema": {"type": "object", "properties": {}, "additionalProperties": False},
    },
    {
        "name": "search_lessons",
        "description": "Search DevAtlas lessons by keyword in the title. Returns id and title.",
        "strict": True,
        "input_schema": {
            "type": "object",
            "properties": {"query": {"type": "string"}},
            "required": ["query"],
            "additionalProperties": False,
        },
    },
]

def run_tool(name: str, args: dict, user_id: str) -> str:
    if name == "get_progress":                 # user_id comes from the session, never the model
        return json.dumps(PROGRESS.get(user_id, {"done": [], "streak_days": 0}))
    if name == "search_lessons":
        q = args["query"].strip().lower()
        if len(q) < 2:
            raise ValueError("query must be at least 2 characters")
        return json.dumps([{"id": k, "title": v} for k, v in LESSONS.items() if q in v.lower()])
    raise ValueError(f"unknown tool {name}")

def ask(question: str, user_id: str, max_turns: int = 5) -> str:
    messages = [{"role": "user", "content": question}]
    for _ in range(max_turns):                           # hard stop: never loop forever
        response = client.messages.create(
            model="claude-opus-5-5", max_tokens=4000, tools=TOOLS,
            system="You are the DevAtlas study assistant. Recommend at most 2 lessons.",
            messages=messages,
        )
        if response.stop_reason != "tool_use":
            return "".join(b.text for b in response.content if b.type == "text")
        messages.append({"role": "assistant", "content": response.content})
        results = []
        for block in response.content:
            if block.type != "tool_use":
                continue
            print(f"[tool] {block.name}({block.input})")
            try:
                results.append({"type": "tool_result", "tool_use_id": block.id,
                                "content": run_tool(block.name, block.input, user_id)})
            except Exception as e:                       # let the model see and recover
                results.append({"type": "tool_result", "tool_use_id": block.id,
                                "content": f"Error: {e}", "is_error": True})
        messages.append({"role": "user", "content": results})   # all results, one message
    raise RuntimeError("tool loop did not finish")

if __name__ == "__main__":
    print(ask("What should I study next about RAG?", user_id="u1"))`,
      },
      output: "[tool] get_progress({})\n[tool] search_lessons({'query': 'r'})\n[tool] search_lessons({'query': 'rag'})\nYou finished 7.1.1 and 7.1.2. Next: 7.2.1 RAG end to end.",
      notes: [
        "**Security:** `get_progress` takes no `user_id` argument. The user comes from your session, never from the model, so a prompt like 'show me user u2's progress' cannot work.",
        "The model called two tools in one turn; both results go back in **one** user message. The too-short query raised, and the model saw `is_error: true` and retried with a better query.",
        "`max_turns` stops runaway loops. In production also cap total tokens per request.",
      ],
    },
    {
      title: "The same thing with the SDK's tool runner",
      code: {
        lang: "python",
        file: "runner.py",
        code: `import json

from anthropic import Anthropic, beta_tool

client = Anthropic()
LESSONS = {"7.1.3": "Calling LLM APIs", "7.2.1": "RAG end to end", "9.1.1": "Docker in depth"}

@beta_tool
def search_lessons(query: str) -> str:
    """Search DevAtlas lessons by keyword in the title.

    Args:
        query: A keyword such as "docker" or "rag".
    """
    q = query.lower()
    return json.dumps([{"id": k, "title": v} for k, v in LESSONS.items() if q in v.lower()])

runner = client.beta.messages.tool_runner(
    model="claude-opus-5-5",
    max_tokens=4000,
    tools=[search_lessons],                 # schema generated from the signature + docstring
    messages=[{"role": "user", "content": "Is there a lesson about Docker?"}],
)
for message in runner:                      # one iteration per model turn; tools run in between
    for block in message.content:
        if block.type == "tool_use":
            print(f"[tool] {block.name}({block.input})")
        elif block.type == "text":
            print(block.text)`,
      },
      output: "[tool] search_lessons({'query': 'docker'})\nYes: 9.1.1 Docker in depth.",
      notes: [
        "`@beta_tool` builds the JSON schema from the type hints and the docstring's `Args:` section, so the description you write *is* the tool documentation the model reads.",
        "The tool runner is a beta feature of the Python SDK. Use it by default; drop to the manual loop when you need full control over each step.",
      ],
    },
    {
      title: "Streaming from FastAPI to the browser",
      text: [
        "The server turns SDK text deltas into SSE events. The browser reads the body as a stream (EventSource only supports GET, so we use `fetch`).",
      ],
      code: {
        lang: "python",
        file: "stream_api.py",
        code: `import json

from anthropic import Anthropic
from fastapi import FastAPI
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

app = FastAPI()
client = Anthropic()


class Ask(BaseModel):
    question: str


def sse(event: str, data: dict) -> str:
    return f"event: {event}\\ndata: {json.dumps(data)}\\n\\n"


@app.post("/explain")
def explain(body: Ask) -> StreamingResponse:
    def events():
        with client.messages.stream(
            model="claude-opus-5-5",
            max_tokens=4000,
            output_config={"effort": "low"},
            system="Explain programming concepts to beginners in under 120 words.",
            messages=[{"role": "user", "content": body.question}],
        ) as stream:
            for text in stream.text_stream:          # text deltas as they are generated
                yield sse("delta", {"text": text})
            final = stream.get_final_message()       # full message + usage at the end
        yield sse("done", {"stop_reason": final.stop_reason, "output_tokens": final.usage.output_tokens})

    return StreamingResponse(events(), media_type="text/event-stream")


if __name__ == "__main__":
    from fastapi.testclient import TestClient
    with TestClient(app).stream("POST", "/explain", json={"question": "What is a closure?"}) as r:
        for line in r.iter_lines():
            if line.startswith("data:"):
                print(line)`,
      },
      output: "data: {\"text\": \"A \"}\ndata: {\"text\": \"closure \"}\n...\ndata: {\"text\": \"created. \"}\ndata: {\"stop_reason\": \"end_turn\", \"output_tokens\": 17}",
    },
    {
      title: "Read the stream in the browser",
      code: {
        lang: "typescript",
        file: "web/src/api/streamExplain.ts",
        code: `export async function streamExplain(
  question: string,
  onText: (text: string) => void,
  signal?: AbortSignal,
): Promise<void> {
  const res = await fetch("/api/explain", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question }),
    signal, // lets the UI cancel when the user navigates away
  });
  if (!res.ok || !res.body) throw new Error(\`HTTP \${res.status}\`);

  const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
  let buffer = "";
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += value;
    const events = buffer.split("\\n\\n");
    buffer = events.pop() ?? ""; // keep the incomplete tail for the next chunk
    for (const event of events) {
      const name = event.match(/^event: (.*)$/m)?.[1];
      const data = event.match(/^data: (.*)$/m)?.[1];
      if (name === "delta" && data) onText(JSON.parse(data).text);
    }
  }
}`,
      },
      notes: [
        "Network chunks do not line up with events, so keep the incomplete tail in a buffer. This bug only appears on slow networks, which is why it survives local testing.",
        "In React, append each text piece to state and pass an `AbortController` signal so leaving the page cancels the request (and stops paying for tokens nobody reads).",
      ],
    },
    {
      title: "Errors, retries and timeouts",
      code: {
        lang: "python",
        file: "resilient.py",
        code: `import logging

import anthropic

log = logging.getLogger("devatlas.llm")
# The SDK already retries connection errors, 408, 409, 429 and 5xx with exponential backoff.
client = anthropic.Anthropic(timeout=30.0, max_retries=3)


class LLMUnavailable(Exception):
    """Temporary: tell the user to retry later (HTTP 503 from our API)."""


def complete(prompt: str, *, max_tokens: int = 2000) -> str:
    try:
        msg = client.messages.create(
            model="claude-opus-5-5",
            max_tokens=max_tokens,
            output_config={"effort": "low"},
            messages=[{"role": "user", "content": prompt}],
        )
    except (anthropic.RateLimitError, anthropic.APIConnectionError) as e:   # incl. timeouts
        log.warning("llm unavailable after retries: %s", type(e).__name__)
        raise LLMUnavailable() from e
    except anthropic.APIStatusError as e:
        if e.status_code >= 500:                                  # 500, 529 overloaded, ...
            log.warning("llm unavailable after retries: %s", e.status_code)
            raise LLMUnavailable() from e
        log.error("request rejected %s: %s request_id=%s", e.status_code, e.message, e.request_id)
        raise                                                     # 400/401/403/404: our bug

    if msg.stop_reason == "max_tokens":
        log.warning("truncated at max_tokens=%d request_id=%s", max_tokens, msg._request_id)
    if msg.stop_reason == "refusal":
        return "Sorry, I can't help with that request."
    return "".join(b.text for b in msg.content if b.type == "text")


if __name__ == "__main__":
    logging.basicConfig(level=logging.WARNING, format="%(levelname)s %(message)s")
    print(complete("Say hi"))        # first attempt gets 429, the SDK retries, second succeeds
    try:
        complete("Say hi")           # 529 overloaded on every attempt
    except LLMUnavailable:
        print("-> 503 Service Unavailable, please retry")
    try:
        complete("Say hi")           # 400: never retried
    except anthropic.BadRequestError:
        print("-> 500 to our caller; fix the code")`,
      },
      output: "Hi!\nWARNING llm unavailable after retries: 529\n-> 503 Service Unavailable, please retry\nERROR request rejected 400: Error code: 400 - {...} request_id=req_...\n-> 500 to our caller; fix the code",
      notes: [
        "Temporary errors are retried by the SDK (`max_retries`); you only decide what to tell the user when retries run out. Never retry 400s: the same request fails the same way.",
        "Log the `request_id`; provider support needs it to investigate a specific call.",
      ],
    },
  ],
  companies: [
    "**Support and operations tools** let models call internal APIs (look up an order, check a deployment status) through tools, with authorization enforced in the tool code and human approval for anything that changes data, such as refunds.",
    "**Document pipelines** (invoices, resumes, contracts) use structured output to extract fields into database rows, then validate with code and send low-confidence records to a human review queue.",
    "**Chat products** stream every response: users judge speed by time to first token, not total time. Teams monitor TTFT and tokens per second as product metrics.",
    "**Test suites** at mature teams never call the real model in unit tests. They inject a fake client returning recorded responses, and run a separate, smaller eval job against the real model on a schedule or before release.",
  ],
  mistakes: [
    {
      mistake: "Letting the model pass the user id to a tool",
      why: "It is convenient to put everything in the schema",
      wrong: "Prompt injection or a confused model reads or changes another user's data",
      fix: "Bind identity and permissions in code from the session; tools act only as the current user",
    },
    {
      mistake: "Reading `response.content[0].text`",
      why: "It worked with older models",
      wrong: "Crashes or empty output when the first block is `thinking` or `tool_use`",
      fix: "Select blocks by `type`; join all text blocks",
    },
    {
      mistake: "Sending tool results in separate messages",
      why: "Looping over tool calls and appending each result",
      wrong: "API error or confused model; parallel calls need all results together",
      fix: "One user message with every `tool_result` block, each with its `tool_use_id`",
    },
    {
      mistake: "No turn limit on the agent loop",
      why: "'The model will stop eventually'",
      wrong: "A loop that keeps calling tools burns money and time",
      fix: "Cap turns and tokens; return a graceful message when the cap is hit",
    },
    {
      mistake: "Retrying everything, or nothing",
      why: "Not distinguishing error classes",
      wrong: "400s retried forever, or a single 429 shown to users as a crash",
      fix: "Let the SDK retry 429/5xx with backoff; surface 503 after retries; fix 400s in code",
    },
    {
      mistake: "Unit tests that call the real API",
      why: "Easiest way to 'test it works'",
      wrong: "Slow, flaky, costly CI that fails when the provider has a bad minute",
      fix: "Inject the client; use fakes in unit tests; run real-model evals separately",
    },
  ],
  bestPractices: [
    {
      tag: "Security",
      text: "Tools are your attack surface. Validate tool inputs, enforce authorization inside the tool, prefer read-only tools, and require explicit human approval for actions that write, spend or send.",
    },
    {
      tag: "Reliability",
      text: "Set timeouts and `max_retries`, check `stop_reason` on every response (`max_tokens`, `refusal`), and log `request_id` and token usage.",
    },
    {
      tag: "Performance",
      text: "Stream user-facing responses. Measure TTFT and total latency separately; use smaller models and lower effort where quality allows.",
    },
    {
      tag: "Maintainability",
      text: "Wrap the provider SDK in your own module and inject the client, so features and tests do not depend on a specific vendor or network.",
    },
    {
      tag: "Cost",
      text: "Keep tool definitions and system prompts stable and first for prompt caching; cap `max_tokens`; cancel streams the user abandoned.",
    },
  ],
  interview: [
    {
      q: "Walk me through how tool use (function calling) works.",
      a: "You send tool definitions (name, description, JSON input schema) with the request. If the model decides a tool helps, it stops with `stop_reason: tool_use` and returns `tool_use` blocks with ids and inputs. Your code validates, authorizes and executes them, appends the assistant message, then sends one user message with all `tool_result` blocks referencing those ids (with `is_error` for failures). You call the model again and repeat until it ends its turn, with a cap on turns. The model never executes code itself.",
    },
    {
      q: "How would you stream an LLM response to a web client?",
      a: "On the server, use the SDK's streaming API and forward text deltas as Server-Sent Events from a streaming HTTP response. On the client, read the response body as a stream (fetch with a reader, since EventSource is GET-only), buffer partial chunks until a full event arrives, append text to the UI, and support cancellation with AbortController. Track TTFT and handle errors mid-stream.",
    },
    {
      q: "How do you test code that calls an LLM?",
      a: "Separate concerns. Unit tests inject a fake client with the same interface that returns recorded responses, so they are fast and deterministic and can cover tool calls, errors and truncation. Contract tests check the request shape you send. Quality is tested separately with an eval suite against the real model, run on prompt or model changes and on a schedule, with thresholds that gate releases.",
    },
  ],
  quickCheck: [
    {
      kind: "mcq",
      prompt: "The model returns two `tool_use` blocks in one response. What do you send next?",
      options: [
        "Two user messages, one per tool_result",
        "One user message containing both tool_result blocks with matching tool_use_ids",
        "Only the first result; the model will ask again",
        "A new conversation with the results in the system prompt",
      ],
      answer: 1,
      explanation: "Append the assistant message unchanged, then one user message with every `tool_result`, each linked by `tool_use_id`.",
    },
    {
      kind: "output",
      prompt: "Network chunks arrive like this. What does the buffered SSE parser print?",
      code: {
        lang: "python",
        code: `chunks = ['data: A\\n\\nda', 'ta: B\\n', '\\ndata: C']
buffer = ""
for chunk in chunks:
    buffer += chunk
    *events, buffer = buffer.split("\\n\\n")
    for e in events:
        print(e.removeprefix("data: "), end=" ")`,
      },
      options: ["A B C", "A B", "A da ta: B", "A"],
      answer: 1,
      explanation: "Complete events (ending in a blank line) are printed: A, then B once its second newline arrives. `data: C` has no terminating blank line yet, so it stays in the buffer.",
    },
    {
      kind: "bug",
      prompt: "Users sometimes see other students' progress in the study assistant. Find the bug.",
      code: {
        lang: "python",
        code: `{"name": "get_progress",
 "input_schema": {"type": "object",
   "properties": {"user_id": {"type": "string"}},
   "required": ["user_id"]}}

def run_tool(name, args):
    return db.progress(args["user_id"])`,
      },
      options: [
        "The schema is missing a description",
        "The model chooses which user's data to read; identity must come from the session",
        "run_tool should be async",
        "The tool should return JSON",
      ],
      answer: 1,
      explanation: "Any text the model reads (a crafted question, an injected document) can steer the `user_id` argument. Remove the parameter and use the authenticated user's id in code.",
    },
  ],
  cheatSheet: [
    "Response = blocks (text, thinking, tool_use) + stop_reason + usage. Select blocks by type.",
    "Structured output: `messages.parse(output_format=Model)` → `.parsed_output`; still validate business rules.",
    "Tool loop: tool_use → run → one user msg with all tool_result (tool_use_id) → repeat until end_turn; cap turns.",
    "`is_error: true` lets the model recover from tool failures.",
    "Identity and permissions come from your session, never from tool inputs.",
    "Stream: `with client.messages.stream(...) as s: for t in s.text_stream` → SSE → fetch reader.",
    "Retry 429/5xx (SDK does it), never 400; timeout always; log request_id.",
    "Inject the client; fake it in unit tests; evaluate the real model separately.",
  ],
  homework: {
    basic: {
      title: "Extraction with a self-correcting retry",
      brief: [
        "Extract job postings into a Pydantic model with salary range and skills. Add a business rule the schema cannot express (min ≤ max). On a validation failure, retry once and include the exact error in the prompt.",
      ],
      criteria: [
        "Typed model with constraints",
        "Business rule checked in code",
        "Retry feeds the error back",
        "Tested offline with a fake parse function",
      ],
      hints: ["Catch both `pydantic.ValidationError` and your own `ValueError`."],
      solution: {
        text: [
          "Models fix concrete, specific errors well, so the retry quotes the error message. Limit attempts: if it fails twice, the input is probably ambiguous and belongs in a human review queue.",
        ],
        code: {
          lang: "python",
          file: "extract_job.py",
          code: `from pydantic import BaseModel, Field, ValidationError


class JobPost(BaseModel):
    title: str
    company: str
    remote: bool
    salary_min: int | None = Field(default=None, ge=0)
    salary_max: int | None = Field(default=None, ge=0)
    skills: list[str] = Field(max_length=10)

    def check(self) -> None:                           # rules a schema cannot express
        if self.salary_min and self.salary_max and self.salary_min > self.salary_max:
            raise ValueError("salary_min is greater than salary_max")


def extract_job(text: str, parse, attempts: int = 2) -> JobPost:
    """parse(user_prompt) -> JobPost. Wraps client.messages.parse(..., output_format=JobPost)."""
    prompt = f"<posting>\\n{text}\\n</posting>\\nExtract the job. Use null for unknown salary."
    for attempt in range(1, attempts + 1):
        try:
            job = parse(prompt)
            job.check()
            return job
        except (ValidationError, ValueError) as e:
            if attempt == attempts:
                raise
            # Feed the exact error back: the model fixes concrete errors well.
            prompt += f"\\n\\nYour previous answer was invalid: {e}. Fix it."


replies = iter([
    JobPost(title="Backend Engineer", company="Acme", remote=True, salary_min=120, salary_max=90, skills=["Go"]),
    JobPost(title="Backend Engineer", company="Acme", remote=True, salary_min=90, salary_max=120, skills=["Go"]),
])
prompts = []
job = extract_job("Acme hiring Backend Engineer (remote), Go, $90k-$120k",
                  lambda p: prompts.append(p) or next(replies))
print(job.salary_min, job.salary_max, "| attempts:", len(prompts))
print(prompts[-1].splitlines()[-1])`,
        },
        output: "90 120 | attempts: 2\nYour previous answer was invalid: salary_min is greater than salary_max. Fix it.",
      },
    },
    intermediate: {
      title: "Measure streaming latency",
      brief: [
        "Wrap a streaming call so it reports time to first token, total time, output tokens, tokens per second and stop reason. Run it for three prompts of different lengths and compare.",
      ],
      criteria: [
        "TTFT measured at the first text delta",
        "Usage taken from the final message",
        "A short note comparing the prompts",
      ],
      hints: ["`time.perf_counter()` is the right clock for durations."],
      solution: {
        text: [
          "TTFT is mostly driven by input size and thinking; total time by output length. If TTFT is high, shorten the prompt, use caching or lower effort. If total time is high, ask for shorter answers or use a faster model.",
        ],
        code: {
          lang: "python",
          file: "stream_metrics.py",
          code: `import time

from anthropic import Anthropic

client = Anthropic()


def stream_with_metrics(question: str, on_text=lambda t: print(t, end="", flush=True)) -> dict:
    start = time.perf_counter()
    first = None
    with client.messages.stream(
        model="claude-opus-5-5",
        max_tokens=4000,
        output_config={"effort": "low"},
        messages=[{"role": "user", "content": question}],
    ) as stream:
        for text in stream.text_stream:
            if first is None:
                first = time.perf_counter() - start     # time to first token (TTFT)
            on_text(text)
        msg = stream.get_final_message()
    total = time.perf_counter() - start
    out = msg.usage.output_tokens
    return {
        "ttft_ms": round((first or total) * 1000),
        "total_ms": round(total * 1000),
        "output_tokens": out,
        "tokens_per_s": round(out / max(total - (first or 0), 1e-6)),
        "stop_reason": msg.stop_reason,
    }


if __name__ == "__main__":
    metrics = stream_with_metrics("Explain a Python generator in one sentence.")
    print()
    print(sorted(metrics))`,
        },
      },
    },
    challenge: {
      title: "A write tool with human approval",
      brief: [
        "Add a `create_study_plan` tool that saves data. It must ask the student for approval before writing, validate its inputs, tell the model clearly when the student declines, and the whole run must have an iteration budget.",
      ],
      criteria: [
        "Approval gate inside the tool",
        "Decline path does not write and tells the model not to retry",
        "Iteration cap",
        "Both paths tested offline",
      ],
      hints: [
        "Inject the approval function so tests can pass `lambda s: True` or `False`.",
        "`tool_runner(..., max_iterations=N)` caps model turns.",
      ],
      solution: {
        text: [
          "The gate lives in code, not in the prompt, so no wording can bypass it. In a web app, `approve` becomes a pending action the UI shows with Confirm/Cancel buttons, and the tool returns 'awaiting confirmation' instead of blocking.",
        ],
        code: {
          lang: "python",
          file: "plan_tool.py",
          code: `import json

from anthropic import Anthropic, beta_tool

client = Anthropic()
PLANS: list[dict] = []                     # stands in for the database


def ask_human(summary: str) -> bool:
    return input(f"Allow: {summary}? [y/N] ").strip().lower() == "y"


def make_tools(user_id: str, approve=ask_human):
    @beta_tool
    def create_study_plan(lesson_ids: list[str], minutes_per_day: int) -> str:
        """Save a study plan for the current student. This WRITES data, so it asks the student first.

        Args:
            lesson_ids: Lesson ids in study order, e.g. ["7.1.3", "7.2.1"].
            minutes_per_day: Daily study time, 10 to 240.
        """
        if not 10 <= minutes_per_day <= 240:
            return "Error: minutes_per_day must be between 10 and 240."
        summary = f"plan {lesson_ids} at {minutes_per_day} min/day for {user_id}"
        if not approve(summary):
            return "The student declined. Do not retry; ask what they want to change."
        PLANS.append({"user": user_id, "lessons": lesson_ids, "minutes": minutes_per_day})
        return json.dumps({"saved": True, "plan_id": len(PLANS)})
    return [create_study_plan]


def plan(request: str, user_id: str, approve=ask_human) -> str:
    runner = client.beta.messages.tool_runner(
        model="claude-opus-5-5",
        max_tokens=4000,
        max_iterations=4,                  # budget: at most 4 model turns
        tools=make_tools(user_id, approve),
        messages=[{"role": "user", "content": request}],
    )
    final = None
    for message in runner:
        final = message
    return "".join(b.text for b in final.content if b.type == "text")


if __name__ == "__main__":
    ask = "Plan 7.1.3 then 7.2.1, 30 minutes a day."
    print(plan(ask, "u1", approve=lambda s: False), "| saved:", len(PLANS))
    print(plan(ask, "u1", approve=lambda s: True), "| saved:", len(PLANS))`,
        },
        output: "No problem, nothing was saved. What would you like to change? | saved: 0\nSaved plan #1: 7.1.3 then 7.2.1, 30 min/day. | saved: 1",
      },
    },
    capstone: {
      title: "DevAtlas: streaming tutor and hint API",
      brief: [
        "In the AI service, add POST /explain (streams SSE) and POST /hint (returns a structured `{level, text}` hint that never gives the full solution). Inject the Anthropic client with FastAPI `Depends`, and test both endpoints with a fake client.",
      ],
      criteria: [
        "Streaming endpoint with correct media type",
        "Structured hint with a closed set of levels",
        "Tests use a fake client; no network",
        "Input validation returns 422",
      ],
      hints: ["`@lru_cache` on `get_client` gives one shared client per process."],
      solution: {
        text: [
          "The fake implements only the two SDK methods the app uses, with the same names and shapes. Because the app depends on the interface, not on the network, the tests run in milliseconds and can simulate any response you need.",
        ],
        code: {
          lang: "python",
          file: "services/ai/app.py",
          code: `"""services/ai/app.py: /explain (streaming) and /hint (structured) with an injectable client."""
import json
from functools import lru_cache
from typing import Literal

from anthropic import Anthropic
from fastapi import Depends, FastAPI
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

app = FastAPI()


@lru_cache
def get_client() -> Anthropic:
    return Anthropic(timeout=30.0, max_retries=3)


class Question(BaseModel):
    lesson_id: str
    question: str = Field(min_length=3, max_length=1000)


class Hint(BaseModel):
    level: Literal["nudge", "hint", "near-solution"]
    text: str


@app.post("/explain")
def explain(q: Question, client=Depends(get_client)):
    def events():
        with client.messages.stream(
            model="claude-opus-5-5", max_tokens=4000, output_config={"effort": "low"},
            system=f"You tutor DevAtlas lesson {q.lesson_id}. Be brief and concrete.",
            messages=[{"role": "user", "content": q.question}],
        ) as stream:
            for text in stream.text_stream:
                yield f"data: {json.dumps({'text': text})}\\n\\n"
        yield "data: [DONE]\\n\\n"
    return StreamingResponse(events(), media_type="text/event-stream")


@app.post("/hint", response_model=Hint)
def hint(q: Question, client=Depends(get_client)) -> Hint:
    response = client.messages.parse(
        model="claude-haiku-5-5", max_tokens=1000, output_format=Hint,
        system="Give the smallest hint that unblocks the student. Never give the full solution.",
        messages=[{"role": "user", "content": f"<lesson>{q.lesson_id}</lesson>\\n<question>{q.question}</question>"}],
    )
    return response.parsed_output

# ---- services/ai/test_app.py ----
from contextlib import contextmanager
from types import SimpleNamespace as NS

from fastapi.testclient import TestClient

from app import Hint, app, get_client


class FakeMessages:
    """Same method names as the SDK; returns canned data and records every call."""
    def __init__(self):
        self.calls = []

    @contextmanager
    def stream(self, **kwargs):
        self.calls.append(kwargs)
        yield NS(text_stream=iter(["A closure ", "remembers ", "variables."]))

    def parse(self, **kwargs):
        self.calls.append(kwargs)
        return NS(parsed_output=Hint(level="nudge", text="What does range(len(xs)) return?"))


fake = NS(messages=FakeMessages())
app.dependency_overrides[get_client] = lambda: fake
http = TestClient(app)


def test_explain_streams_server_sent_events():
    r = http.post("/explain", json={"lesson_id": "1.1.3", "question": "What is a closure?"})
    assert r.headers["content-type"].startswith("text/event-stream")
    chunks = [line for line in r.text.splitlines() if line.startswith("data:")]
    assert chunks[0] == 'data: {"text": "A closure "}' and chunks[-1] == "data: [DONE]"
    assert "1.1.3" in fake.messages.calls[-1]["system"]


def test_hint_returns_structured_output():
    r = http.post("/hint", json={"lesson_id": "2.1.1", "question": "my loop is off by one"})
    assert r.json() == {"level": "nudge", "text": "What does range(len(xs)) return?"}
    assert fake.messages.calls[-1]["output_format"] is Hint


def test_rejects_empty_question():
    assert http.post("/hint", json={"lesson_id": "2.1.1", "question": ""}).status_code == 422`,
        },
        output: "3 passed",
      },
    },
  },
  deeper: [
    {
      label: "Anthropic docs: Tool use",
      url: "https://docs.claude.com/en/docs/agents-and-tools/tool-use/overview",
    },
    {
      label: "Anthropic docs: Streaming messages",
      url: "https://docs.claude.com/en/docs/build-with-claude/streaming",
    },
    { label: "Anthropic Python SDK (GitHub)", url: "https://github.com/anthropics/anthropic-sdk-python" },
    {
      label: "MDN: Using server-sent events",
      url: "https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events/Using_server-sent_events",
    },
  ],
  nextPreview: "Next: RAG end to end. You will ground answers in DevAtlas lesson notes with citations, and learn why most RAG failures are retrieval failures.",
};
