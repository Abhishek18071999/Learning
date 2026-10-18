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
        text: [
          "The stub /ask is replaced with real retrieval and LLM calls in Phase 7; the API contract stays the same, so the .NET API and React app do not change.",
          "Each feature has its own APIRouter (ask, quiz, suggest). main.py mounts all of them under one parent router with `dependencies=[Depends(require_service_key)]`, so a new feature router is protected as soon as it is included. /health sits on the app itself and stays public for container probes. The key is a SecretStr compared with secrets.compare_digest; it has no default, so a container started without DEVATLAS_SERVICE_KEY fails during startup with a validation error instead of serving requests.",
          "The /suggest trie comes from lesson 2.3.3 (devatlas_ai/suggest.py, unchanged). It is built once in the lifespan and read from app.state.",
          "The tests cover the public health check; 401, 403 and 200 for the service key; 422 field errors; the SSE framing of /ask/stream; quiz bounds; suggest; the exact list of paths in the OpenAPI document; and the startup failure without a key. The Docker image runs as uid 10001. Built and run locally, it answered /health, returned 401 for /quiz without the key, `docker exec ... id` printed uid=10001(app), and starting it without the key failed with 'service_key Field required'.",
        ],
        code: {
          lang: "python",
          code: `# ---- services/ai/devatlas_ai/settings.py ----
from functools import lru_cache
from typing import Annotated

from fastapi import Depends
from pydantic import SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="DEVATLAS_")
    service_key: SecretStr            # required: DEVATLAS_SERVICE_KEY, never logged or printed
    max_question_chars: int = 500


@lru_cache
def get_settings() -> Settings:
    return Settings()


SettingsDep = Annotated[Settings, Depends(get_settings)]

# ---- services/ai/devatlas_ai/security.py ----
import secrets
from typing import Annotated

from fastapi import Header, HTTPException

from devatlas_ai.settings import SettingsDep


def require_service_key(settings: SettingsDep, x_service_key: Annotated[str | None, Header()] = None) -> None:
    if x_service_key is None:
        raise HTTPException(status_code=401, detail="Missing X-Service-Key")
    if not secrets.compare_digest(x_service_key.encode(), settings.service_key.get_secret_value().encode()):
        raise HTTPException(status_code=403, detail="Invalid service key")

# ---- services/ai/devatlas_ai/routers/ask.py ----
import asyncio
from collections.abc import AsyncIterator

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from devatlas_ai.settings import SettingsDep

router = APIRouter(tags=["ask"])


class AskRequest(BaseModel):
    question: str = Field(min_length=3, max_length=2000)
    lesson_id: str | None = Field(default=None, pattern=r"^\\d+\\.\\d+\\.\\d+$")
    top_k: int = Field(default=3, ge=1, le=10)


class Citation(BaseModel):
    lesson_id: str
    title: str


class AskResponse(BaseModel):
    answer: str
    citations: list[Citation]


@router.post("/ask")
async def ask(body: AskRequest, settings: SettingsDep) -> AskResponse:
    if len(body.question) > settings.max_question_chars:
        raise HTTPException(status_code=413, detail="Question too long")
    # Stub until Phase 7 adds retrieval + the LLM call; the contract stays the same.
    return AskResponse(answer=f"(demo) You asked: {body.question}",
                       citations=[Citation(lesson_id="0.3.1", title="Git: commits, branches, merges and conflicts")])


async def fake_llm_tokens(question: str) -> AsyncIterator[str]:
    for word in f"Here is how to approach: {question}".split():
        await asyncio.sleep(0.01)                     # stands in for awaiting the LLM stream
        yield word + " "


@router.post("/ask/stream", response_class=StreamingResponse)
async def ask_stream(body: AskRequest) -> StreamingResponse:
    async def events() -> AsyncIterator[str]:
        async for token in fake_llm_tokens(body.question):
            yield f"data: {token}\\n\\n"
        yield "event: done\\ndata: \\n\\n"
    return StreamingResponse(events(), media_type="text/event-stream")

# ---- services/ai/devatlas_ai/routers/quiz.py ----
from typing import Literal

from fastapi import APIRouter
from pydantic import BaseModel, Field

router = APIRouter(tags=["quiz"])


class QuizRequest(BaseModel):
    lesson_id: str = Field(pattern=r"^\\d+\\.\\d+\\.\\d+$")
    count: int = Field(ge=1, le=10)
    difficulty: Literal["easy", "medium", "hard"] = "medium"


class Question(BaseModel):
    prompt: str
    options: list[str]
    answer: int


@router.post("/quiz")
async def make_quiz(body: QuizRequest) -> list[Question]:
    return [Question(prompt=f"Q{i + 1} about {body.lesson_id} ({body.difficulty})", options=["A", "B", "C", "D"], answer=0)
            for i in range(body.count)]

# ---- services/ai/devatlas_ai/routers/suggest.py ----
from typing import Annotated

from fastapi import APIRouter, Query, Request
from pydantic import BaseModel

from devatlas_ai.suggest import Suggestion, SuggestTrie   # the trie from lesson 2.3.3

router = APIRouter(tags=["suggest"])

CONTENT = [Suggestion("FastAPI for AI and data services", "lesson", 900), Suggestion("Pydantic", "term", 700),
           Suggestion("Dependency injection", "lesson", 650), Suggestion("Docker images", "lesson", 500)]


def build_trie() -> SuggestTrie:
    trie = SuggestTrie()
    for item in CONTENT:                               # in the service: loaded from the content files
        trie.insert(item)
    return trie


class SuggestionOut(BaseModel):
    text: str
    kind: str


@router.get("/suggest", response_model=list[SuggestionOut])
def suggest(request: Request, q: Annotated[str, Query(min_length=1, max_length=64)]) -> list[Suggestion]:
    return request.app.state.trie.suggest(q, k=5)

# ---- services/ai/devatlas_ai/main.py ----
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import APIRouter, Depends, FastAPI

from devatlas_ai.routers import ask, quiz, suggest
from devatlas_ai.security import require_service_key
from devatlas_ai.settings import get_settings


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    get_settings()                                     # missing DEVATLAS_SERVICE_KEY fails at startup, not per request
    app.state.trie = suggest.build_trie()
    yield


def create_app() -> FastAPI:
    app = FastAPI(title="DevAtlas AI service", version="0.1.0", lifespan=lifespan)

    @app.get("/health", tags=["ops"])
    async def health() -> dict[str, str]:
        return {"status": "ok"}

    protected = APIRouter(dependencies=[Depends(require_service_key)])   # every feature route needs the key
    for feature in (ask.router, quiz.router, suggest.router):
        protected.include_router(feature)
    app.include_router(protected)
    return app


app = create_app()                                     # uvicorn devatlas_ai.main:app

# ---- services/ai/tests/test_api.py ----
from collections.abc import Iterator

import pytest
from fastapi.testclient import TestClient
from pydantic import ValidationError

from devatlas_ai.main import create_app
from devatlas_ai.settings import get_settings

KEY = {"X-Service-Key": "test-key"}


@pytest.fixture
def client(monkeypatch: pytest.MonkeyPatch) -> Iterator[TestClient]:
    monkeypatch.setenv("DEVATLAS_SERVICE_KEY", "test-key")
    get_settings.cache_clear()
    with TestClient(create_app()) as c:
        yield c
    get_settings.cache_clear()


def test_health_is_public(client: TestClient) -> None:
    assert client.get("/health").json() == {"status": "ok"}


@pytest.mark.parametrize(("headers", "status"), [({}, 401), ({"X-Service-Key": "wrong"}, 403), (KEY, 200)])
def test_service_key(client: TestClient, headers: dict[str, str], status: int) -> None:
    assert client.post("/ask", json={"question": "What is PKCE?"}, headers=headers).status_code == status


def test_ask_validates_input(client: TestClient) -> None:
    r = client.post("/ask", json={"question": "Hi", "top_k": 50}, headers=KEY)
    assert r.status_code == 422
    assert [e["loc"] for e in r.json()["detail"]] == [["body", "question"], ["body", "top_k"]]


def test_stream_sends_sse_events(client: TestClient) -> None:
    with client.stream("POST", "/ask/stream", json={"question": "undo a commit"}, headers=KEY) as r:
        assert r.headers["content-type"].startswith("text/event-stream")
        body = "".join(r.iter_text())
    assert body.startswith("data: Here ") and body.endswith("event: done\\ndata: \\n\\n")


def test_quiz_and_suggest(client: TestClient) -> None:
    assert len(client.post("/quiz", json={"lesson_id": "4.2.1", "count": 3}, headers=KEY).json()) == 3
    assert client.post("/quiz", json={"lesson_id": "4.2.1", "count": 11}, headers=KEY).status_code == 422
    assert client.get("/suggest", params={"q": "py"}, headers=KEY).json() == [{"text": "Pydantic", "kind": "term"}]


def test_openapi_lists_every_endpoint(client: TestClient) -> None:
    paths = client.get("/openapi.json").json()["paths"]
    assert sorted(paths) == ["/ask", "/ask/stream", "/health", "/quiz", "/suggest"]


def test_missing_service_key_fails_at_startup(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("DEVATLAS_SERVICE_KEY", raising=False)
    get_settings.cache_clear()
    with pytest.raises(ValidationError), TestClient(create_app()):
        pass

# ---- services/ai/requirements.txt ----
fastapi==0.146.0
uvicorn[standard]==0.54.0
pydantic-settings==2.16.0

# ---- services/ai/Dockerfile ----
FROM python:3.13-slim
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY devatlas_ai ./devatlas_ai
RUN useradd --create-home --uid 10001 app
USER app
EXPOSE 8000
CMD ["uvicorn", "devatlas_ai.main:app", "--host", "0.0.0.0", "--port", "8000"]`,
        },
        output: "$ python -m pytest -q -p no:warnings\n.........                                                                [100%]\n9 passed",
        pitfalls: [
          "Recent Starlette versions print a deprecation warning when TestClient runs on httpx and suggest installing httpx2; the tests pass either way (the output above hides warnings with -p no:warnings).",
          "get_settings is cached with lru_cache, so tests that change environment variables must call get_settings.cache_clear().",
        ],
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
