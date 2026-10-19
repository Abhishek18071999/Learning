import type { ResourceSection } from "../../types";

export const backend: ResourceSection = {
  id: "backend",
  title: "Backend and APIs",
  icon: "🛠️",
  tagline: "FastAPI and API design from REST to queues",
  phaseId: 4,
  courses: [
    {
      id: "fastapi",
      title: "FastAPI",
      topics: [
        {
          id: "fastapi-fastapi-first-api",
          title: "FastAPI first API",
          lessonId: "4.2.1",
          revision: [
            "FastAPI uses Python type hints plus Pydantic models to validate, convert and document request and response data.",
            "Interactive docs are generated for free from the OpenAPI schema: Swagger UI at `/docs` and ReDoc at `/redoc`.",
            "Use `async def` when the handler awaits I/O; a plain `def` also works. Start a dev server with `fastapi dev`.",
            "Built on Starlette and Pydantic, it ranks among the fastest Python frameworks, which suits model-serving and data APIs.",
          ],
          read: { label: "FastAPI official documentation", url: "https://fastapi.tiangolo.com/", kind: "docs" },
          video: { label: "FastAPI Tutorial in Hindi | Lets build a Notes app using FastAPI, MongoDB & Bootstrap 🔥", url: "https://www.youtube.com/watch?v=52c7Kxp_14E", channel: "CodeWithHarry", lang: "Hindi" },
          practice: { label: "Tutorial - User Guide - FastAPI (runnable step-by-step examples)", url: "https://fastapi.tiangolo.com/tutorial/" },
        },
        {
          id: "fastapi-path-and-query-parameters",
          title: "Path and query parameters",
          revision: [],
        },
        {
          id: "fastapi-pydantic-models",
          title: "Pydantic models",
          lessonId: "4.2.1",
          revision: [],
        },
        {
          id: "fastapi-async-endpoints",
          title: "Async endpoints",
          lessonId: "4.2.1",
          revision: [],
        },
        {
          id: "fastapi-dependencies",
          title: "Dependencies",
          revision: [],
        },
        {
          id: "fastapi-databases-with-sqlalchemy",
          title: "Databases with SQLAlchemy",
          revision: [],
        },
        {
          id: "fastapi-oauth2-and-jwt-auth",
          title: "OAuth2 and JWT auth",
          revision: [],
        },
        {
          id: "fastapi-testing-fastapi",
          title: "Testing FastAPI",
          revision: [],
        },
        {
          id: "fastapi-deploying-fastapi",
          title: "Deploying FastAPI",
          revision: [],
        },
      ],
    },
    {
      id: "apidesign",
      title: "API design",
      topics: [
        {
          id: "apidesign-rest-principles",
          title: "REST principles",
          lessonId: "4.4.1",
          revision: [
            "REST models resources identified by URLs and manipulated with HTTP methods like `GET`, `POST`, `PUT`, `PATCH`, `DELETE`.",
            "Requests are stateless: each one carries everything the server needs, such as auth headers.",
            "Use nouns for paths (`/users/42/orders`) and status codes like `201 Created`, `404 Not Found`, `409 Conflict`.",
            "`GET`, `PUT` and `DELETE` are idempotent; `POST` is not.",
          ],
        },
        {
          id: "apidesign-pagination-and-versioning",
          title: "Pagination and versioning",
          lessonId: "4.4.1",
          revision: [
            "Offset pagination (`?limit=20&offset=40`) is simple but slow and unstable on large, changing tables.",
            "Cursor (keyset) pagination returns an opaque `next` cursor and stays consistent while rows are inserted.",
            "Version APIs via the URL (`/v1/`), a header, or media type; avoid breaking changes inside a version.",
          ],
        },
        {
          id: "apidesign-graphql",
          title: "GraphQL",
          lessonId: "4.4.1",
          revision: [
            "GraphQL exposes one endpoint and a typed schema; clients ask for exactly the fields they need.",
            "Operations are queries (read), mutations (write) and subscriptions (real-time).",
            "Resolvers fetch each field; batch with DataLoader to avoid the N+1 query problem.",
          ],
        },
        {
          id: "apidesign-grpc",
          title: "gRPC",
          lessonId: "4.4.1",
          revision: [
            "gRPC is an RPC framework using HTTP/2 and Protocol Buffers for compact binary messages.",
            "Services and messages are defined in `.proto` files; code is generated for client and server.",
            "Supports unary, server-streaming, client-streaming and bidirectional streaming calls.",
          ],
          read: { label: "API Showdown: REST vs. GraphQL vs. gRPC – Which Should You Use? (InfoQ panel transcript)", url: "https://www.infoq.com/presentations/rest-graphql-grpc/", kind: "article" },
          video: { label: "gRPC Explained - Architecture, Speed & Use Cases | Learn gRPC | Hindi | Day 78/100", url: "https://www.youtube.com/watch?v=4v_udyD6fnQ", channel: "Coder's Gyan", lang: "Hindi" },
        },
        {
          id: "apidesign-oauth2-and-openid-connect",
          title: "OAuth2 and OpenID Connect",
          lessonId: "4.1.3",
          revision: [
            "OAuth 2.0 is for delegated authorization: a client gets an access token to call an API on a user's behalf.",
            "Authorization Code flow with PKCE is the recommended flow for web, mobile and SPA apps.",
            "OpenID Connect adds authentication on top of OAuth 2.0 via a signed `id_token` (a JWT) and a userinfo endpoint.",
          ],
        },
        {
          id: "apidesign-idempotency",
          title: "Idempotency",
          lessonId: "4.4.2",
          revision: [
            "An idempotent operation gives the same result no matter how many times it is repeated.",
            "Clients send an `Idempotency-Key` header on `POST` so retries do not create duplicate payments or orders.",
            "The server stores the key with the first response and replays that response for repeated keys.",
          ],
        },
        {
          id: "apidesign-rate-limiting",
          title: "Rate limiting",
          lessonId: "4.4.2",
          revision: [
            "Rate limiting caps how many requests a client may make in a time window to protect the service.",
            "Common algorithms: token bucket, leaky bucket, fixed window and sliding window log/counter.",
            "Reject excess requests with `429 Too Many Requests` and a `Retry-After` header.",
          ],
          video: { label: "System Design Mock Interview: Design a Rate Limiter (with Meta Engineering Manager)", url: "https://www.youtube.com/watch?v=SgWb6tWx3S8", channel: "Aced (formerly Exponent)", lang: "English" },
        },
        {
          id: "apidesign-message-queues-and-background-jobs",
          title: "Message queues and background jobs",
          lessonId: "4.4.2",
          revision: [
            "A queue decouples producers from consumers so slow work (emails, video encoding) runs in the background.",
            "Return `202 Accepted` quickly and let workers process jobs asynchronously with retries.",
            "Make consumers idempotent: most brokers deliver at-least-once, so duplicates can happen; use dead-letter queues for failures.",
          ],
        },
        {
          id: "apidesign-caching",
          title: "Caching",
          lessonId: "4.4.2",
          revision: [
            "Caching stores results closer to the client to cut latency and load (browser, CDN, app cache like Redis).",
            "HTTP caching uses `Cache-Control`, `ETag` and `If-None-Match` to return `304 Not Modified`.",
            "Cache-aside: read cache, on miss load from DB and populate; invalidate or set TTLs to avoid stale data.",
          ],
        },
        {
          id: "apidesign-websockets",
          title: "WebSockets",
          revision: [
            "WebSocket gives a persistent, full-duplex connection over a single TCP connection.",
            "It starts as an HTTP request with an `Upgrade: websocket` header and switches protocol (`101`).",
            "Use it for chat, live dashboards and games; use `wss://` for encrypted connections.",
          ],
        },
        {
          id: "apidesign-openapi-documentation",
          title: "OpenAPI documentation",
          revision: [
            "The OpenAPI Specification describes HTTP APIs in YAML or JSON: paths, operations, parameters, schemas and responses.",
            "Tools like Swagger UI render interactive docs, and generators create client SDKs and server stubs.",
            "Reuse schemas via `components` and `$ref` to keep the spec consistent.",
          ],
        },
      ],
    },
  ],
};
