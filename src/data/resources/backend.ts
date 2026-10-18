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
          revision: [],
        },
        {
          id: "apidesign-pagination-and-versioning",
          title: "Pagination and versioning",
          lessonId: "4.4.1",
          revision: [],
        },
        {
          id: "apidesign-graphql",
          title: "GraphQL",
          lessonId: "4.4.1",
          revision: [],
        },
        {
          id: "apidesign-grpc",
          title: "gRPC",
          lessonId: "4.4.1",
          revision: [],
          read: { label: "API Showdown: REST vs. GraphQL vs. gRPC – Which Should You Use? (InfoQ panel transcript)", url: "https://www.infoq.com/presentations/rest-graphql-grpc/", kind: "article" },
          video: { label: "gRPC Explained - Architecture, Speed & Use Cases | Learn gRPC | Hindi | Day 78/100", url: "https://www.youtube.com/watch?v=4v_udyD6fnQ", channel: "Coder's Gyan", lang: "Hindi" },
        },
        {
          id: "apidesign-oauth2-and-openid-connect",
          title: "OAuth2 and OpenID Connect",
          lessonId: "4.1.3",
          revision: [],
        },
        {
          id: "apidesign-idempotency",
          title: "Idempotency",
          lessonId: "4.4.2",
          revision: [],
        },
        {
          id: "apidesign-rate-limiting",
          title: "Rate limiting",
          lessonId: "4.4.2",
          revision: [],
          video: { label: "System Design Mock Interview: Design a Rate Limiter (with Meta Engineering Manager)", url: "https://www.youtube.com/watch?v=SgWb6tWx3S8", channel: "Aced (formerly Exponent)", lang: "English" },
        },
        {
          id: "apidesign-message-queues-and-background-jobs",
          title: "Message queues and background jobs",
          lessonId: "4.4.2",
          revision: [],
        },
        {
          id: "apidesign-caching",
          title: "Caching",
          lessonId: "4.4.2",
          revision: [],
        },
        {
          id: "apidesign-websockets",
          title: "WebSockets",
          revision: [],
        },
        {
          id: "apidesign-openapi-documentation",
          title: "OpenAPI documentation",
          revision: [],
        },
      ],
    },
  ],
};
