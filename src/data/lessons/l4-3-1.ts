import type { Lesson } from "../../types";

export const lesson: Lesson = {
  id: "4.3.1",
  title: "Axum for performance-critical services",
  minutes: 75,
  level: "Advanced",
  prerequisites: ["1.4.2 Errors, traits and cargo", "4.1.1 Minimal APIs, middleware and DI"],
  summary: "Build a fast, safe HTTP service in Rust with Axum and Tokio: routing, extractors, shared state, typed errors that become HTTP responses, concurrency with tasks, graceful shutdown and tests.",
  terms: [
    { term: "Tokio", def: "Rust's most widely used async runtime: it schedules async tasks across a thread pool and provides async I/O, timers and channels." },
    { term: "Axum", def: "A web framework from the Tokio team, built on hyper (HTTP) and tower (middleware)." },
    { term: "Extractor", def: "A type in a handler's parameters that pulls data from the request: Path, Query, Json, State, headers." },
    { term: "State", def: "Shared application data (config, clients, caches) passed to handlers, usually wrapped in Arc." },
    { term: "Arc / Mutex / RwLock", def: "Arc shares ownership across threads; Mutex/RwLock guard mutable data. Prefer message passing or lock-free structures where possible." },
    { term: "IntoResponse", def: "The trait that turns a handler's return value (including your error type) into an HTTP response." },
    { term: "tower layer", def: "Reusable middleware (timeouts, tracing, compression, rate limiting) applied to routes." },
  ],
  problem: [
    "The DevAtlas news ingester fetches and parses hundreds of RSS feeds every few minutes and serves recent items to the other services. In Python it uses 400 MB of RAM and occasionally stalls under parsing load. Rewriting this one hot, well-defined component in Rust can cut memory and latency substantially while the rest of the system stays unchanged.",
    "Rust web services feel different from C# or Python: errors are values, state sharing is explicit, and the compiler rejects data races. Axum keeps the code close to what you already know: routes, handlers, middleware.",
  ],
  concept: {
    analogy: [
      "Tokio is a **kitchen with a few chefs and many orders**: each order (task) is worked on until it has to wait (oven, fryer = I/O), then a chef picks up another order. Axum is the **front-of-house** that takes orders (requests), checks them (extractors) and hands back plates (responses).",
    ],
    precise: [
      "A handler is an async function whose parameters are extractors and whose return type implements IntoResponse: `async fn get_item(State(app): State<AppState>, Path(id): Path<u64>) -> Result<Json<Item>, AppError>`. If extraction fails (bad JSON, wrong path type), Axum returns a 4xx before your code runs.",
      "**State** is cloned per request, so it should be cheap to clone: wrap shared data in Arc. Use `tokio::sync::RwLock` (or a concurrent map, or a database) for mutable shared data, and never hold a lock across an `.await` with std's Mutex.",
      "**Errors**: define an enum implementing IntoResponse, and `From` conversions from library errors, so `?` works in handlers and every error maps to a status code and JSON body in one place (like ProblemDetails in 4.1.1).",
      "**Concurrency**: `tokio::spawn` runs background tasks (the periodic fetch loop); `futures::stream::iter(...).buffer_unordered(n)` or a JoinSet with a semaphore bounds parallel fetches; `tokio::time::timeout` bounds each call.",
    ],
  },
  underTheHood: {
    text: [
      "Futures in Rust are lazy state machines; nothing runs until a runtime polls them. Tokio's multi-threaded scheduler uses work stealing: idle worker threads take tasks from busy ones. A task that does heavy CPU work without awaiting blocks its worker thread; use `tokio::task::spawn_blocking` for that.",
      "Axum's Router is a tower Service. Layers wrap services (TimeoutLayer, TraceLayer, CorsLayer), the same 'onion' model as ASP.NET Core middleware.",
      "Graceful shutdown: on SIGTERM (what Kubernetes sends), stop accepting new connections and let in-flight requests finish before exiting, so deploys do not drop requests.",
    ],
    diagram: {
      title: "Axum request path",
      nodes: [
        { label: "hyper", sub: "HTTP" },
        { label: "tower layers", sub: "trace, timeout" },
        { label: "Router", sub: "match route" },
        { label: "Extractors", sub: "State, Path, Json" },
        { label: "Handler", sub: "Result<T, AppError>" },
        { label: "IntoResponse", sub: "status + body" },
      ],
      edges: ["", "", "", "", ""],
    },
  },
  handsOn: [
    {
      title: "Create the project",
      code: {
        lang: "bash",
        code: `cargo new news-service && cd news-service
cargo add axum
cargo add tokio --features full
cargo add serde --features derive
cargo add serde_json`,
      },
      notes: ["Axum's API changes between minor versions (0.x); the code below targets recent 0.8-style APIs, including `{id}` path syntax. Check docs.rs/axum for your version."],
    },
    {
      title: "Routes, state, extractors and typed errors",
      code: {
        lang: "rust",
        file: "src/main.rs",
        code: `use std::{collections::HashMap, sync::Arc};

use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    response::{IntoResponse, Response},
    routing::get,
    Json, Router,
};
use serde::{Deserialize, Serialize};
use tokio::sync::RwLock;

#[derive(Clone, Serialize, Deserialize)]
struct NewsItem {
    id: u64,
    title: String,
    url: String,
    topic: String,
}

#[derive(Clone, Default)]
struct AppState {
    items: Arc<RwLock<HashMap<u64, NewsItem>>>,
}

enum AppError {
    NotFound(u64),
    Invalid(String),
}

impl IntoResponse for AppError {
    fn into_response(self) -> Response {
        let (status, message) = match self {
            AppError::NotFound(id) => (StatusCode::NOT_FOUND, format!("news item {id} not found")),
            AppError::Invalid(msg) => (StatusCode::UNPROCESSABLE_ENTITY, msg),
        };
        (status, Json(serde_json::json!({ "error": message }))).into_response()
    }
}

#[derive(Deserialize)]
struct ListParams {
    topic: Option<String>,
    limit: Option<usize>,
}

async fn list_items(State(state): State<AppState>, Query(p): Query<ListParams>) -> Result<Json<Vec<NewsItem>>, AppError> {
    let limit = p.limit.unwrap_or(20);
    if !(1..=100).contains(&limit) {
        return Err(AppError::Invalid("limit must be between 1 and 100".into()));
    }
    let items = state.items.read().await;                  // shared read lock
    let mut out: Vec<NewsItem> = items
        .values()
        .filter(|i| p.topic.as_deref().is_none_or(|t| i.topic == t))
        .cloned()
        .collect();
    out.sort_by_key(|i| std::cmp::Reverse(i.id));
    out.truncate(limit);
    Ok(Json(out))
}

async fn get_item(State(state): State<AppState>, Path(id): Path<u64>) -> Result<Json<NewsItem>, AppError> {
    state.items.read().await.get(&id).cloned().map(Json).ok_or(AppError::NotFound(id))
}

async fn create_item(State(state): State<AppState>, Json(item): Json<NewsItem>) -> Result<(StatusCode, Json<NewsItem>), AppError> {
    if item.title.trim().is_empty() {
        return Err(AppError::Invalid("title is required".into()));
    }
    state.items.write().await.insert(item.id, item.clone());   // exclusive write lock, released at end of statement
    Ok((StatusCode::CREATED, Json(item)))
}

fn app(state: AppState) -> Router {
    Router::new()
        .route("/health", get(|| async { "ok" }))
        .route("/items", get(list_items).post(create_item))
        .route("/items/{id}", get(get_item))
        .with_state(state)
}

#[tokio::main]
async fn main() {
    let listener = tokio::net::TcpListener::bind("0.0.0.0:3000").await.expect("bind port 3000");
    println!("listening on {}", listener.local_addr().unwrap());
    axum::serve(listener, app(AppState::default()))
        .with_graceful_shutdown(async { tokio::signal::ctrl_c().await.ok(); })
        .await
        .expect("server error");
}`,
      },
      notes: ["`Option::is_none_or` needs Rust 1.82+. With older compilers use `p.topic.as_deref().map_or(true, |t| i.topic == t)`. In Kubernetes, also listen for SIGTERM (tokio::signal::unix) for graceful shutdown."],
    },
    {
      title: "Try it",
      code: {
        lang: "bash",
        code: `cargo run &
curl -s -X POST localhost:3000/items -H 'Content-Type: application/json' \\
  -d '{"id":1,"title":"Rust 2024 edition","url":"https://example.com/r","topic":"rust"}'
curl -s "localhost:3000/items?topic=rust"
curl -s -i localhost:3000/items/99 | head -1
curl -s "localhost:3000/items?limit=0"`,
      },
      output: "{\"id\":1,\"title\":\"Rust 2024 edition\",\"url\":\"https://example.com/r\",\"topic\":\"rust\"}\n[{\"id\":1,\"title\":\"Rust 2024 edition\",\"url\":\"https://example.com/r\",\"topic\":\"rust\"}]\nHTTP/1.1 404 Not Found\n{\"error\":\"limit must be between 1 and 100\"}",
    },
    {
      title: "Test the router without a network",
      code: {
        lang: "rust",
        file: "src/main.rs (tests module)",
        code: `// cargo add --dev tower --features util ; cargo add --dev http-body-util
#[cfg(test)]
mod tests {
    use super::*;
    use axum::body::Body;
    use axum::http::Request;
    use http_body_util::BodyExt;
    use tower::ServiceExt;                                 // for oneshot

    #[tokio::test]
    async fn missing_item_returns_404_json() {
        let res = app(AppState::default())
            .oneshot(Request::get("/items/42").body(Body::empty()).unwrap())
            .await
            .unwrap();
        assert_eq!(res.status(), StatusCode::NOT_FOUND);
        let body = res.into_body().collect().await.unwrap().to_bytes();
        assert_eq!(&body[..], br#"{"error":"news item 42 not found"}"#);
    }
}`,
      },
    },
    {
      title: "Background fetch loop with bounded concurrency",
      code: {
        lang: "rust",
        code: `// cargo add reqwest --features json ; cargo add futures
use futures::stream::{self, StreamExt};
use std::time::Duration;

async fn refresh_feeds(client: reqwest::Client, feeds: Vec<String>) -> Vec<(String, Result<usize, String>)> {
    stream::iter(feeds)
        .map(|url| {
            let client = client.clone();                     // cheap: shares the connection pool
            async move {
                let res = tokio::time::timeout(Duration::from_secs(5), client.get(&url).send()).await;
                let outcome = match res {
                    Err(_) => Err("timeout".to_string()),
                    Ok(Err(e)) => Err(e.to_string()),
                    Ok(Ok(r)) => r.text().await.map(|t| t.len()).map_err(|e| e.to_string()),
                };
                (url, outcome)
            }
        })
        .buffer_unordered(8)                                 // at most 8 feeds in flight
        .collect()
        .await
}

// In main: spawn a periodic task
// tokio::spawn(async move {
//     let mut tick = tokio::time::interval(Duration::from_secs(300));
//     loop { tick.tick().await; let results = refresh_feeds(client.clone(), feeds.clone()).await; /* parse + store */ }
// });`,
      },
    },
  ],
  companies: [
    "**Rust for hot paths**: companies adopt Rust for proxies, load balancers, ingestion pipelines, real-time services and CLI tools where memory use, tail latency and safety matter, while keeping most business services in other languages.",
    "**Tokio ecosystem**: Axum, tonic (gRPC), reqwest (HTTP client), sqlx (async SQL with compile-time checked queries) and tracing (structured logs and spans) form a common production stack.",
    "**Service boundaries**: Rust services usually integrate through HTTP/JSON, gRPC or message queues, so a team can rewrite one component without touching others, exactly how DevAtlas's ingester fits in.",
  ],
  mistakes: [
    { mistake: "Holding a std::sync::Mutex guard across .await", why: "Locking then awaiting a network call", wrong: "Compiler errors (non-Send future) or deadlocks and stalls", fix: "Release the lock before awaiting; use tokio::sync locks when you must hold across await" },
    { mistake: "Blocking or CPU-heavy work in async handlers", why: "Parsing big files or hashing inline", wrong: "Worker threads starve; latency spikes for everyone", fix: "tokio::task::spawn_blocking or a dedicated thread pool" },
    { mistake: "unwrap() in handlers", why: "Prototype habits", wrong: "One bad request panics the task and returns a 500 with no context", fix: "Typed AppError implementing IntoResponse; ? with From conversions" },
    { mistake: "Unbounded concurrency", why: "join_all over every URL", wrong: "Socket exhaustion and rate-limit bans", fix: "buffer_unordered(n), Semaphore, or JoinSet with limits" },
    { mistake: "Ignoring graceful shutdown", why: "Ctrl+C works locally", wrong: "Deploys cut off in-flight requests", fix: "with_graceful_shutdown on SIGTERM; readiness probes (lesson 9.4.1)" },
  ],
  bestPractices: [
    { tag: "Reliability", text: "One error enum per service mapped to HTTP in IntoResponse; no panics on bad input." },
    { tag: "Performance", text: "Share clients (reqwest::Client) via state; bound concurrency; timeouts on every outbound call." },
    { tag: "Maintainability", text: "Build the Router in a function so tests can call it with oneshot." },
    { tag: "Reliability", text: "Structured logging with the tracing crate and tower-http TraceLayer; health endpoint for probes." },
  ],
  interview: [
    { q: "How does Axum handle request data?", a: "Through extractors: handler parameters like Path, Query, Json and State implement FromRequestParts/FromRequest. Axum runs them before the handler; failures produce 4xx responses automatically. Return types implement IntoResponse, including Result with a custom error type." },
    { q: "How do you share mutable state between handlers?", a: "Put it in an application state struct shared via Arc, protecting mutable parts with tokio::sync::RwLock/Mutex or concurrent maps, keeping lock scopes short and never holding std locks across await points. For anything that must survive restarts or scale across instances, use a database or Redis." },
    { q: "When would you choose Rust for a service?", a: "When predictable latency, low memory, high throughput or memory safety for untrusted input (parsers, proxies) matter, and the component's scope is clear enough to justify the learning curve. For CRUD-heavy business logic, teams often prefer languages they already know." },
  ],
  quickCheck: [
    {
      kind: "mcq",
      prompt: "Why is AppState's map wrapped in Arc<RwLock<…>>?",
      options: ["For JSON serialisation", "Arc shares it across tasks/threads; RwLock allows many readers or one writer safely", "To make it faster than a HashMap", "Axum requires all state to be locked"],
      answer: 1,
      explanation: "State is cloned per request; Arc shares the same map, the lock protects concurrent mutation.",
    },
    {
      kind: "bug",
      prompt: "Latency spikes when large feeds are parsed. The handler does `let doc = parse_huge_xml(&body);` inside an async fn. Fix?",
      options: ["Use a bigger server", "Move parsing to tokio::task::spawn_blocking", "Add more routes", "Use unwrap"],
      answer: 1,
      explanation: "CPU-heavy work blocks the async worker thread; run it on the blocking pool.",
    },
    {
      kind: "mcq",
      prompt: "A POST with malformed JSON reaches this handler: `async fn create(Json(item): Json<NewsItem>)`. What happens?",
      options: ["Handler runs with default values", "Axum rejects it with a 4xx before the handler runs", "The server panics", "500 error"],
      answer: 1,
      explanation: "The Json extractor fails and Axum returns a client error response.",
    },
  ],
  cheatSheet: [
    "Router::new().route(path, get(h).post(h2)).with_state(state).",
    "Extractors: State, Path, Query, Json, headers.",
    "Return Result<impl IntoResponse, AppError>; impl IntoResponse for AppError.",
    "Arc for sharing; tokio::sync locks across awaits; keep locks short.",
    "spawn for background tasks; spawn_blocking for CPU work.",
    "Bound concurrency: buffer_unordered(n) / Semaphore; timeouts everywhere.",
    "Test with Router + tower::ServiceExt::oneshot.",
    "Graceful shutdown on SIGTERM.",
  ],
  homework: {
    basic: {
      title: "Add DELETE and topic stats",
      brief: ["Add DELETE /items/{id} (204 or 404) and GET /stats returning item counts per topic, with tests using oneshot."],
      criteria: ["Correct status codes", "Stats computed under a read lock only", "Tests pass"],
      hints: ["StatusCode::NO_CONTENT; a HashMap<String, usize> serialises to a JSON object."],
      solution: {
        text: ["Write lock for delete, read lock for stats, both held only for the minimal scope."],
        code: {
          lang: "rust",
          code: `async fn delete_item(State(state): State<AppState>, Path(id): Path<u64>) -> Result<StatusCode, AppError> {
    match state.items.write().await.remove(&id) {
        Some(_) => Ok(StatusCode::NO_CONTENT),
        None => Err(AppError::NotFound(id)),
    }
}

async fn stats(State(state): State<AppState>) -> Json<HashMap<String, usize>> {
    let mut counts = HashMap::new();
    for item in state.items.read().await.values() {
        *counts.entry(item.topic.clone()).or_insert(0) += 1;
    }
    Json(counts)
}

// .route("/items/{id}", get(get_item).delete(delete_item))
// .route("/stats", get(stats))`,
        },
      },
    },
    intermediate: {
      title: "Middleware: timeout, tracing and request ids",
      brief: ["Add tower-http layers: TraceLayer for structured request logs, a TimeoutLayer of 5 seconds, and request-id propagation (SetRequestIdLayer + PropagateRequestIdLayer). Show logs for one request."],
      criteria: ["Layers applied to the router", "Timeout returns a 408/503-style response (depending on configuration)", "Request id present in response headers and logs"],
      hints: ["cargo add tower-http --features trace,timeout,request-id ; cargo add tracing tracing-subscriber"],
      solution: {
        text: [
          "Layers wrap the router like middleware, and order matters. In a ServiceBuilder the first layer is the outermost. SetRequestIdLayer comes before TraceLayer, so the span can read the id. PropagateRequestIdLayer comes before TimeoutLayer, so a 408 produced by the timeout passes back through it and still carries the id. Checked against tower-http 0.7.1 with axum 0.8.9: `TimeoutLayer::new(duration)` is deprecated since tower-http 0.6.7; `with_status_code` makes the status explicit.",
          "The custom make_span_with puts method, URI and request id on the span, so every log line inside the request has them. One request with `curl -H 'x-request-id: demo-1' localhost:3000/items/42` produced (timestamps removed): `DEBUG request{method=GET uri=/items/42 request_id=\"demo-1\"}: tower_http::trace::on_response: finished processing request latency=0 ms status=404`, and the response carried `x-request-id: demo-1`.",
          "The tests use oneshot as in the lesson. The timeout test runs on a paused Tokio clock (`start_paused = true`, which needs tokio's test-util feature), so a handler sleeping 10 seconds hits the 5-second timeout instantly in virtual time.",
        ],
        code: {
          lang: "rust", file: "src/main.rs",
          code: `// cargo add tower --features util
// cargo add tower-http --features trace,timeout,request-id
// cargo add tracing ; cargo add tracing-subscriber --features env-filter
// cargo add --dev tokio --features test-util,macros,rt     (paused clock in the timeout test)
//
// src/main.rs: NewsItem, AppState, AppError and the handlers are unchanged from the lesson.
use std::{collections::HashMap, sync::Arc, time::Duration};

use axum::{
    extract::{Path, Query, State},
    http::{Request, StatusCode},
    response::{IntoResponse, Response},
    routing::get,
    Json, Router,
};
use serde::{Deserialize, Serialize};
use tokio::sync::RwLock;
use tower::ServiceBuilder;
use tower_http::{
    request_id::{MakeRequestUuid, PropagateRequestIdLayer, SetRequestIdLayer},
    timeout::TimeoutLayer,
    trace::TraceLayer,
};

// ... structs and handlers from the lesson ...

fn routes(state: AppState) -> Router {
    Router::new()
        .route("/health", get(|| async { "ok" }))
        .route("/items", get(list_items).post(create_item))
        .route("/items/{id}", get(get_item))
        .with_state(state)
}

/// Middleware stack. ServiceBuilder applies layers top to bottom, outermost first:
/// the id is set before tracing (so the span has it) and copied to the response
/// after the timeout layer (so a 408 also carries it).
fn with_middleware(router: Router) -> Router {
    router.layer(
        ServiceBuilder::new()
            .layer(SetRequestIdLayer::x_request_id(MakeRequestUuid)) // keeps a caller's x-request-id, else a UUID
            .layer(TraceLayer::new_for_http().make_span_with(|req: &Request<_>| {
                let request_id = req.headers().get("x-request-id").and_then(|v| v.to_str().ok()).unwrap_or("-");
                tracing::info_span!("request", method = %req.method(), uri = %req.uri(), request_id)
            }))
            .layer(PropagateRequestIdLayer::x_request_id())
            .layer(TimeoutLayer::with_status_code(StatusCode::REQUEST_TIMEOUT, Duration::from_secs(5))),
    )
}

fn app(state: AppState) -> Router {
    with_middleware(routes(state))
}

#[tokio::main]
async fn main() {
    tracing_subscriber::fmt()
        .with_env_filter(
            tracing_subscriber::EnvFilter::try_from_default_env().unwrap_or_else(|_| "news_service=info,tower_http=debug".into()),
        )
        .init();
    let listener = tokio::net::TcpListener::bind("0.0.0.0:3000").await.expect("bind port 3000");
    tracing::info!("listening on {}", listener.local_addr().expect("local addr"));
    axum::serve(listener, app(AppState::default()))
        .with_graceful_shutdown(async { tokio::signal::ctrl_c().await.ok(); })
        .await
        .expect("server error");
}

#[cfg(test)]
mod tests {
    use super::*;
    use axum::body::Body;
    use tower::ServiceExt;

    #[tokio::test]
    async fn generates_a_request_id_when_missing() {
        let res = app(AppState::default()).oneshot(Request::get("/health").body(Body::empty()).unwrap()).await.unwrap();
        let id = res.headers()["x-request-id"].to_str().unwrap();
        assert_eq!(id.len(), 36, "expected a UUID, got {id}");
    }

    #[tokio::test]
    async fn propagates_the_callers_request_id() {
        let req = Request::get("/items/7").header("x-request-id", "req-123").body(Body::empty()).unwrap();
        let res = app(AppState::default()).oneshot(req).await.unwrap();
        assert_eq!(res.status(), StatusCode::NOT_FOUND);
        assert_eq!(res.headers()["x-request-id"], "req-123");
    }

    #[tokio::test(start_paused = true)] // paused clock: the 10 s sleep finishes instantly in virtual time
    async fn slow_handlers_get_408_with_the_request_id() {
        let slow = Router::new().route("/slow", get(|| async {
            tokio::time::sleep(Duration::from_secs(10)).await;
            "too late"
        }));
        let req = Request::get("/slow").header("x-request-id", "req-slow").body(Body::empty()).unwrap();
        let res = with_middleware(slow).oneshot(req).await.unwrap();
        assert_eq!(res.status(), StatusCode::REQUEST_TIMEOUT);
        assert_eq!(res.headers()["x-request-id"], "req-slow");
    }
}`,
        },
        output: "$ cargo test -q\n\nrunning 3 tests\n...\ntest result: ok. 3 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out",
      },
    },
    challenge: {
      title: "Persist with sqlx and PostgreSQL",
      brief: ["Replace the in-memory map with PostgreSQL using sqlx (PgPool in state), with a migration for the items table, and keep all handler signatures the same. Map sqlx errors into AppError."],
      criteria: ["Pool shared in state", "Migrations via sqlx-cli or sqlx::migrate!", "Unique constraint on url, conflict → 409"],
      hints: ["sqlx::query_as!(…) checks queries at compile time against DATABASE_URL (or offline metadata)."],
      solution: {
        text: ["State becomes { db: PgPool }. Each handler runs a query with bound parameters; a unique-violation error (code 23505) maps to a new AppError::Conflict variant returning 409. Compile-time checked queries catch typos in SQL during cargo build."],
      },
    },
    capstone: {
      title: "DevAtlas: Rust news service",
      brief: ["Combine the ingester parser (lessons 1.4.x) with this Axum service: a background task refreshes feeds every 5 minutes with bounded concurrency, and the API serves /items, /items/{id}, /stats and /health. Containerise it with a multi-stage Dockerfile."],
      criteria: ["Bounded, timed-out feed fetching", "Typed errors, no unwrap in handlers", "Docker image under 50 MB (e.g. distroless or debian-slim runtime stage)"],
      hints: ["Build stage: rust image + cargo build --release; runtime: a slim base with only the binary and CA certificates."],
      solution: {
        text: ["A multi-stage build copies only the compiled binary into a minimal runtime image, typically tens of megabytes, compared with hundreds for a full toolchain image (lesson 9.1.1)."],
      },
    },
  },
  deeper: [
    { label: "Axum docs (docs.rs)", url: "https://docs.rs/axum/latest/axum/" },
    { label: "Tokio tutorial", url: "https://tokio.rs/tokio/tutorial" },
    { label: "tower-http", url: "https://docs.rs/tower-http/latest/tower_http/" },
    { label: "sqlx", url: "https://github.com/launchbadge/sqlx" },
  ],
  nextPreview: "Next: API design: REST, GraphQL and gRPC, versioning and pagination.",
};
