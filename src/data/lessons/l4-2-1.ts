import type { Lesson } from "../../types";

export const lesson: Lesson = {
  id: "4.2.1",
  title: "FastAPI for AI and data services",
  minutes: 75,
  level: "Intermediate",
  prerequisites: ["1.1.3 Async Python and packaging", "1.1.4 Testing with pytest", "4.1.1 helpful (API concepts)"],
  summary: "Build a typed, validated, documented Python API with FastAPI and Pydantic: request/response models, async endpoints, dependency injection, error handling, background work, streaming responses and tests.",
  terms: [
    { term: "FastAPI", def: "A Python web framework built on Starlette (ASGI) and Pydantic, using type hints for validation and automatic OpenAPI docs." },
    { term: "Pydantic", def: "A library that validates and parses data into typed models at runtime, with clear error messages." },
    { term: "ASGI / Uvicorn", def: "ASGI is the async server interface for Python web apps; Uvicorn is a fast ASGI server that runs FastAPI." },
    { term: "Dependency (Depends)", def: "FastAPI's DI: a function whose result is injected into endpoints, used for settings, DB sessions, auth and clients." },
    { term: "Lifespan", def: "Startup/shutdown hook for creating and closing shared resources like HTTP clients or model weights." },
    { term: "Streaming response", def: "Sending the response in chunks as they are produced, e.g. LLM tokens via Server-Sent Events." },
  ],
  problem: [
    "The DevAtlas AI service (RAG tutor, quiz generator, news summariser) is Python because the AI ecosystem is Python-first. It needs to accept typed requests from the .NET API, validate them, call slow LLM APIs without blocking, stream answers to the browser, and be easy for teammates to call thanks to accurate docs.",
    "Flask-style hand validation scatters `if 'question' not in body` checks everywhere. FastAPI turns type hints into validation, serialisation and OpenAPI documentation, so the code is shorter and the contract is explicit.",
  ],
  concept: {
    analogy: [
      "FastAPI is a **receptionist with a checklist**: every visitor's form (request) is checked against the template (Pydantic model) before they reach the expert (your function). Missing fields or wrong types are sent back with a precise note (422 error) and the expert never sees invalid data.",
    ],
    precise: [
      "Declare request bodies as Pydantic `BaseModel` classes, query/path parameters as typed function parameters, and responses with `response_model` or return type annotations. FastAPI validates input (422 with field errors on failure), converts output, and generates OpenAPI at /openapi.json with interactive docs at /docs.",
      "**async def** endpoints run on the event loop: use async clients (httpx, async DB drivers, async LLM SDKs). **def** endpoints run in a thread pool, which is fine for blocking libraries. Never call blocking code inside async def (lesson 1.1.3).",
      "**Dependencies** (`Depends`) provide settings, clients, auth checks and DB sessions, and are overridable in tests (`app.dependency_overrides`). **Lifespan** creates shared resources once (an httpx.AsyncClient, a loaded embedding model) and closes them on shutdown.",
      "**Settings** come from environment variables via pydantic-settings, with types and validation, so a missing API key fails at startup rather than on the first request.",
    ],
  },
  underTheHood: {
    text: [
      "Uvicorn receives HTTP, converts it to ASGI events, and calls the FastAPI (Starlette) app. Routing matches the path; FastAPI resolves dependencies (recursively, cached per request), validates parameters with Pydantic (implemented in Rust in Pydantic v2, which makes it fast), calls your function, then serialises the return value with the response model.",
      "Response models are also a security feature: returning a database object through a response model that excludes `password_hash` guarantees the field never leaks, even if the object has it.",
      "StreamingResponse iterates an async generator and writes each chunk as it is yielded. With `text/event-stream` (SSE) browsers can read tokens as they arrive, which is how chat UIs show answers progressively.",
    ],
    diagram: {
      title: "Request through FastAPI",
      nodes: [
        { label: "Uvicorn", sub: "ASGI" },
        { label: "Route match", sub: "/ask" },
        { label: "Dependencies", sub: "settings, client, auth" },
        { label: "Pydantic validate", sub: "422 if invalid" },
        { label: "Your async def", sub: "await LLM" },
        { label: "response_model", sub: "serialise + filter" },
      ],
      edges: ["", "", "", "", ""],
    },
  },
  handsOn: [
    {
      title: "Install and run",
      code: {
        lang: "bash",
        code: `python3 -m venv .venv && source .venv/bin/activate
pip install "fastapi[standard]" pydantic-settings httpx pytest
fastapi dev app.py          # dev server with reload; docs at http://127.0.0.1:8000/docs`,
      },
    },
    {
      title: "A typed AI-service API",
      code: {
        lang: "python",
        file: "app.py",
        code: `from contextlib import asynccontextmanager
from typing import Annotated

import httpx
from fastapi import Depends, FastAPI, HTTPException, Request
from pydantic import BaseModel, Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="DEVATLAS_")
    max_question_chars: int = 500
    llm_base_url: str = "https://api.example.com"     # DEVATLAS_LLM_BASE_URL overrides


@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.http = httpx.AsyncClient(timeout=10)     # one shared client: connection reuse
    yield
    await app.state.http.aclose()


app = FastAPI(title="DevAtlas AI service", version="0.1.0", lifespan=lifespan)


def get_settings() -> Settings:
    return Settings()


def get_http(request: Request) -> httpx.AsyncClient:
    return request.app.state.http


class AskRequest(BaseModel):
    question: str = Field(min_length=3, max_length=2000, examples=["How do I undo a pushed commit?"])
    lesson_id: str | None = Field(default=None, pattern=r"^\\d+\\.\\d+\\.\\d+$")
    top_k: int = Field(default=3, ge=1, le=10)


class Citation(BaseModel):
    lesson_id: str
    title: str


class AskResponse(BaseModel):
    answer: str
    citations: list[Citation]


SettingsDep = Annotated[Settings, Depends(get_settings)]


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/ask", response_model=AskResponse)
async def ask(body: AskRequest, settings: SettingsDep) -> AskResponse:
    if len(body.question) > settings.max_question_chars:
        raise HTTPException(status_code=413, detail="Question too long")
    # Placeholder for retrieval + LLM call (lessons 7.1.x and 7.2.1)
    return AskResponse(
        answer=f"(demo) You asked: {body.question}",
        citations=[Citation(lesson_id="0.3.1", title="Git: commits, branches, merges and conflicts")],
    )`,
      },
      notes: ["Type hints drive everything: validation, conversion, editor autocomplete and the OpenAPI schema at /docs."],
    },
    {
      title: "See validation in action",
      code: {
        lang: "bash",
        code: `curl -s localhost:8000/ask -H 'Content-Type: application/json' -d '{"question":"Hi","top_k":50}' | python3 -m json.tool`,
      },
      output: "{\n    \"detail\": [\n        {\n            \"type\": \"string_too_short\",\n            \"loc\": [\"body\", \"question\"],\n            \"msg\": \"String should have at least 3 characters\",\n            ...\n        },\n        {\n            \"type\": \"less_than_equal\",\n            \"loc\": [\"body\", \"top_k\"],\n            \"msg\": \"Input should be less than or equal to 10\",\n            ...\n        }\n    ]\n}",
      notes: ["HTTP status 422 with one entry per invalid field. Pydantic v2 message wording may vary slightly between versions."],
    },
    {
      title: "Stream an answer token by token (SSE)",
      code: {
        lang: "python",
        code: `import asyncio
from fastapi.responses import StreamingResponse

async def fake_llm_tokens(question: str):
    for word in f"Here is how to approach: {question}".split():
        await asyncio.sleep(0.05)                 # stands in for awaiting the LLM stream
        yield word + " "

@app.post("/ask/stream")
async def ask_stream(body: AskRequest):
    async def events():
        async for token in fake_llm_tokens(body.question):
            yield f"data: {token}\\n\\n"           # Server-Sent Events framing
        yield "event: done\\ndata: \\n\\n"
    return StreamingResponse(events(), media_type="text/event-stream")`,
      },
    },
    {
      title: "Test with TestClient and dependency overrides",
      code: {
        lang: "python",
        file: "test_app.py",
        code: `from fastapi.testclient import TestClient
from app import Settings, app, get_settings

def test_health():
    with TestClient(app) as client:                     # 'with' runs the lifespan
        assert client.get("/health").json() == {"status": "ok"}

def test_validation_error():
    with TestClient(app) as client:
        r = client.post("/ask", json={"question": "Hi"})
        assert r.status_code == 422
        assert r.json()["detail"][0]["loc"] == ["body", "question"]

def test_settings_override():
    app.dependency_overrides[get_settings] = lambda: Settings(max_question_chars=5)
    try:
        with TestClient(app) as client:
            r = client.post("/ask", json={"question": "a long question"})
            assert r.status_code == 413
    finally:
        app.dependency_overrides.clear()`,
      },
      output: "$ python -m pytest -q\n...                                                  [100%]\n3 passed",
    },
  ],
  companies: [
    "**AI and ML serving**: FastAPI is a common choice for model-serving and LLM-orchestration services, often sitting behind a main API in another language, exactly like DevAtlas's .NET API calling the Python AI service.",
    "**Contract-first integration**: the automatically generated OpenAPI lets other teams generate clients (C#, TypeScript) and run contract tests, reducing integration bugs between services written in different languages.",
    "**Streaming UX**: chat products stream tokens over SSE or WebSockets so users see answers immediately instead of waiting many seconds for the full response.",
  ],
  mistakes: [
    { mistake: "Blocking calls inside async def", why: "Using requests or a sync SDK", wrong: "The whole service stalls under concurrent load", fix: "Async clients, or define the endpoint with def, or asyncio.to_thread" },
    { mistake: "Creating an HTTP client per request", why: "Simplest code", wrong: "No connection reuse; slow and socket-hungry", fix: "One client in lifespan, injected via a dependency" },
    { mistake: "Returning ORM objects without a response model", why: "Less typing", wrong: "Internal or sensitive fields leak", fix: "Explicit response models" },
    { mistake: "Secrets read with os.environ scattered in code", why: "Quick access", wrong: "Missing config fails late at runtime", fix: "pydantic-settings validated at startup" },
    { mistake: "Global state mutated by requests", why: "Module-level dicts as caches", wrong: "Race conditions across workers; data lost on restart", fix: "Use Redis or a database for shared state; keep in-process caches read-mostly" },
  ],
  bestPractices: [
    { tag: "Reliability", text: "Pydantic models for every input and output; constrain fields (lengths, ranges, patterns)." },
    { tag: "Performance", text: "Async end to end; shared clients created in lifespan; timeouts on every outbound call." },
    { tag: "Maintainability", text: "Routers per feature (APIRouter), dependencies for cross-cutting concerns, tests with dependency_overrides." },
    { tag: "Security", text: "Authenticate service-to-service calls (lesson 4.1.3) and cap request sizes and token budgets for LLM endpoints." },
  ],
  interview: [
    { q: "Why FastAPI for an AI service?", a: "The AI ecosystem is Python-first, and FastAPI adds async I/O for slow LLM calls, Pydantic validation and serialisation, dependency injection, streaming responses and automatic OpenAPI docs with little code." },
    { q: "async def vs def endpoints in FastAPI?", a: "async def runs on the event loop and must only await non-blocking I/O. def endpoints run in a threadpool, so blocking libraries are acceptable there. Mixing a blocking call into async def blocks every request." },
    { q: "How do you test FastAPI apps?", a: "TestClient (or httpx.AsyncClient with ASGI transport) to call endpoints in process, dependency_overrides to replace settings, auth and external clients with fakes, and pytest fixtures for shared setup. Integration tests can use Testcontainers for real databases." },
  ],
  quickCheck: [
    {
      kind: "mcq",
      prompt: "A request body is missing a required field. What does FastAPI return by default?",
      options: ["500", "400 with HTML", "422 with a JSON list of field errors", "200 with null"],
      answer: 2,
      explanation: "Validation errors become 422 Unprocessable Entity (Content) with details per field.",
    },
    {
      kind: "bug",
      prompt: "Under load, every request to this service waits for the slowest one. Why?",
      code: { lang: "python", code: "@app.post(\"/summarise\")\nasync def summarise(body: Req):\n    r = requests.post(LLM_URL, json=body.model_dump(), timeout=30)\n    return r.json()" },
      options: ["Pydantic is slow", "requests is blocking inside async def, freezing the event loop", "timeout too high", "Missing response_model"],
      answer: 1,
      explanation: "Use httpx.AsyncClient with await, or make the endpoint a plain def.",
    },
    {
      kind: "mcq",
      prompt: "Best place to create a shared httpx.AsyncClient?",
      options: ["Inside each endpoint", "In the lifespan handler, stored on app.state, injected with Depends", "A global created at import time and never closed", "In the test file"],
      answer: 1,
      explanation: "Lifespan creates it once and closes it cleanly on shutdown.",
    },
  ],
  cheatSheet: [
    "Pydantic models for bodies and responses; Field constraints.",
    "422 on invalid input, automatically.",
    "async def + async clients; def for blocking code.",
    "Depends for settings, clients, auth; dependency_overrides in tests.",
    "lifespan: create/close shared resources.",
    "pydantic-settings for typed env config.",
    "StreamingResponse + text/event-stream for token streaming.",
    "/docs and /openapi.json for free.",
  ],
  homework: {
    basic: {
      title: "Quiz generator endpoint (stubbed)",
      brief: ["Add POST /quiz with body {lesson_id, count (1–10), difficulty: 'easy'|'medium'|'hard'} returning a list of questions (stub data). Use Literal for difficulty and a response model."],
      criteria: ["Invalid difficulty → 422", "count bounds enforced", "Tests for valid and invalid input"],
      hints: ["from typing import Literal"],
      solution: {
        text: ["Literal types become enums in OpenAPI and are validated automatically."],
        code: {
          lang: "python",
          code: `from typing import Literal
from pydantic import BaseModel, Field

class QuizRequest(BaseModel):
    lesson_id: str
    count: int = Field(ge=1, le=10)
    difficulty: Literal["easy", "medium", "hard"] = "medium"

class Question(BaseModel):
    prompt: str
    options: list[str]
    answer: int

@app.post("/quiz", response_model=list[Question])
async def make_quiz(body: QuizRequest) -> list[Question]:
    return [Question(prompt=f"Q{i + 1} about {body.lesson_id} ({body.difficulty})", options=["A", "B", "C", "D"], answer=0)
            for i in range(body.count)]`,
        },
      },
    },
    intermediate: {
      title: "API key dependency for service-to-service calls",
      brief: ["Protect all endpoints except /health with an `X-Service-Key` header checked by a dependency (constant-time comparison, key from settings). Return 401 without the header and 403 with a wrong key."],
      criteria: ["Router-level dependency", "secrets.compare_digest", "Tests for missing, wrong and correct keys"],
      hints: ["APIRouter(dependencies=[Depends(require_service_key)])"],
      solution: {
        text: ["A router-level dependency applies to every route in it; health stays on the app outside the router. In production, prefer short-lived tokens or mTLS between services (lesson 4.1.3), but an API key is a reasonable first step on a private network."],
        code: {
          lang: "python",
          code: `import secrets
from fastapi import APIRouter, Depends, Header, HTTPException

def require_service_key(settings: SettingsDep, x_service_key: str | None = Header(default=None)) -> None:
    if x_service_key is None:
        raise HTTPException(status_code=401, detail="Missing X-Service-Key")
    if not secrets.compare_digest(x_service_key, settings.service_key):   # add service_key: str to Settings
        raise HTTPException(status_code=403, detail="Invalid service key")

protected = APIRouter(dependencies=[Depends(require_service_key)])
# move /ask and /quiz onto 'protected', then: app.include_router(protected)`,
        },
      },
    },
    challenge: {
      title: "Consume the SSE stream in the browser",
      brief: ["Write a small frontend function that POSTs to /ask/stream with fetch, reads the response body stream, parses SSE 'data:' lines and appends tokens to the page as they arrive. Handle abort and errors."],
      criteria: ["Incremental rendering", "AbortController to cancel", "Correct SSE parsing across chunk boundaries"],
      hints: ["EventSource only supports GET; with POST, read res.body.getReader() and decode with TextDecoder."],
      solution: {
        text: ["Chunks may split an event in half, so buffer text and process only complete events separated by a blank line."],
        code: {
          lang: "typescript",
          code: `export async function streamAnswer(question: string, onToken: (t: string) => void, signal?: AbortSignal) {
  const res = await fetch("/ask/stream", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question }),
    signal,
  });
  if (!res.ok || !res.body) throw new Error(\`HTTP \${res.status}\`);
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let sep;
    while ((sep = buffer.indexOf("\\n\\n")) !== -1) {
      const event = buffer.slice(0, sep);
      buffer = buffer.slice(sep + 2);
      if (event.startsWith("event: done")) return;
      for (const line of event.split("\\n")) if (line.startsWith("data: ")) onToken(line.slice(6));
    }
  }
}`,
        },
      },
    },
    capstone: {
      title: "DevAtlas: AI service API",
      brief: ["Turn services/ai into a FastAPI app with /health, /ask (stub), /ask/stream, /quiz and /suggest (from lesson 2.3.3), settings via pydantic-settings, a service-key dependency, tests, and a Dockerfile (lesson 9.1.1)."],
      criteria: ["OpenAPI lists every endpoint with schemas", "pytest suite passes in CI", "Container runs as non-root"],
      hints: ["Use APIRouter per feature: routers/ask.py, routers/quiz.py."],
      solution: {
        text: ["The stub /ask is replaced with real retrieval and LLM calls in Phase 7; the API contract stays the same, so the .NET API and React app do not change."],
      },
    },
  },
  deeper: [
    { label: "FastAPI documentation", url: "https://fastapi.tiangolo.com/" },
    { label: "Pydantic documentation", url: "https://docs.pydantic.dev/latest/" },
    { label: "FastAPI: Lifespan events", url: "https://fastapi.tiangolo.com/advanced/events/" },
    { label: "MDN: Using server-sent events", url: "https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events/Using_server-sent_events" },
  ],
  nextPreview: "Next: Rust services with Axum: handlers, extractors and Tokio for performance-critical work.",
};
