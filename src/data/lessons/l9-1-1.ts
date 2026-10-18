import type { Lesson } from "../../types";

export const lesson: Lesson = {
  id: "9.1.1",
  title: "Docker in depth: images, layers and multi-stage builds",
  minutes: 75,
  level: "Intermediate",
  prerequisites: ["0.2.1 The terminal", "Docker Desktop or Docker Engine installed"],
  summary: "Understand what a container actually is, build small and secure images with fast cached builds, and run a multi-service stack with Docker Compose.",
  terms: [
    { term: "Container", def: "An isolated process (or group of processes) on a host, with its own filesystem view, network and resource limits. Not a virtual machine." },
    { term: "Image", def: "A read-only, layered template (filesystem + metadata) used to start containers." },
    { term: "Layer", def: "The filesystem change produced by one Dockerfile instruction. Layers are cached and shared between images." },
    { term: "Registry", def: "A server that stores images, e.g. Docker Hub, GitHub Container Registry, Amazon ECR, Azure Container Registry." },
    { term: "Multi-stage build", def: "A Dockerfile with several FROM stages, where the final image copies only what it needs from earlier ones." },
    { term: "Namespaces and cgroups", def: "Linux kernel features: namespaces isolate what a process can see; cgroups limit what it can use (CPU, memory)." },
  ],
  problem: [
    "\"It works on my machine.\" The API runs on your laptop with Python 3.12 and a library you installed months ago. The server has Python 3.10 and a different OpenSSL. The deploy fails at 6 p.m. on release day.",
    "Even after the team adopts Docker, the image is 1.8 GB, every build takes 6 minutes because dependencies reinstall on each code change, and a security scan finds 300 vulnerabilities in packages you never use. Docker solves environment drift; using it well solves speed, size and security.",
  ],
  concept: {
    analogy: [
      "A Docker image is a **shipping container** for software: everything the app needs is packed inside, and any port (any machine with a container runtime) can handle it the same way. The Dockerfile is the **packing list**, and each line adds a layer, like stacking labelled boxes. If the bottom boxes have not changed, you do not repack them.",
    ],
    precise: [
      "A container is a normal Linux process started with **namespaces** (its own PID tree, network stack, mount table, hostname) and **cgroups** (CPU and memory limits), on top of a layered filesystem built from the image. It shares the host's kernel, so it starts in milliseconds and uses little overhead compared with a VM.",
      "Each Dockerfile instruction (`RUN`, `COPY`, `ADD`) creates a layer. The **build cache** reuses a layer if the instruction and its inputs are unchanged; once one layer changes, every layer after it is rebuilt. Therefore you order instructions **from least to most frequently changed**: base image, system packages, dependency manifests, dependency install, then source code.",
      "On macOS and Windows, Docker Desktop runs a lightweight Linux VM, because containers need a Linux kernel (for Linux containers).",
    ],
  },
  underTheHood: {
    text: [
      "An image is a stack of read-only layers plus a config (entrypoint, env, user, exposed ports). Starting a container adds a thin **writable layer** on top. Data written there disappears when the container is removed, which is why databases use **volumes**.",
      "Layers are content-addressed by hash, so ten images built `FROM python:3.12-slim` store the base layers once and registries transfer only missing layers.",
      "`docker run -p 8080:8000` sets up port forwarding from host port 8080 to the container's port 8000 inside its own network namespace. Inside a Compose network, services reach each other by **service name** via Docker's built-in DNS.",
    ],
    diagram: {
      title: "Image layers (top changes most often)",
      nodes: [
        { label: "python:3.12-slim", sub: "base layers" },
        { label: "requirements.txt", sub: "COPY" },
        { label: "pip install", sub: "RUN (cached)" },
        { label: "app source", sub: "COPY (changes often)" },
        { label: "container", sub: "+ writable layer" },
      ],
      edges: ["", "", "", "docker run"],
      caption: "Change one line of code → only the last COPY layer rebuilds. Dependencies stay cached.",
    },
  },
  handsOn: [
    {
      title: "A small API to containerise",
      code: {
        lang: "python",
        file: "app/main.py",
        code: `# FastAPI app: pip install "fastapi[standard]"
import os
from fastapi import FastAPI

app = FastAPI()

@app.get("/health")
def health() -> dict:
    return {"status": "ok", "env": os.environ.get("APP_ENV", "dev")}`,
      },
    },
    {
      title: "The naive Dockerfile (do not ship this)",
      code: {
        lang: "dockerfile",
        file: "Dockerfile.naive",
        code: `FROM python:3.12
COPY . /app
WORKDIR /app
RUN pip install fastapi[standard] uvicorn
CMD uvicorn app.main:app --host 0.0.0.0`,
      },
      notes: ["Problems: full base image (large), code copied before dependencies (any change reinstalls everything), unpinned versions, runs as root, shell-form CMD (signals not forwarded properly), and `COPY .` may include .env and .git."],
    },
    {
      title: "The production Dockerfile",
      code: {
        lang: "dockerfile",
        file: "Dockerfile",
        code: `# syntax=docker/dockerfile:1

# ---- build stage: install dependencies into a virtual env ----
FROM python:3.12-slim AS build
WORKDIR /app
RUN python -m venv /venv
ENV PATH="/venv/bin:$PATH"
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# ---- runtime stage: only what is needed to run ----
FROM python:3.12-slim AS runtime
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 PATH="/venv/bin:$PATH"
RUN useradd --create-home --uid 10001 appuser
WORKDIR /app
COPY --from=build /venv /venv
COPY app ./app
USER appuser
EXPOSE 8000
HEALTHCHECK --interval=30s --timeout=3s CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8000/health')"
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]`,
      },
      notes: [
        "requirements.txt pins versions, e.g. `fastapi[standard]==<version>`; generate it with `pip freeze` or a lock tool.",
        "Exec-form CMD (JSON array) makes uvicorn PID 1 so it receives SIGTERM directly and shuts down gracefully.",
      ],
    },
    {
      title: "Keep secrets and junk out of the build",
      code: { lang: "text", file: ".dockerignore", code: ".git\n.venv\n__pycache__\n*.pyc\n.env\n.env.*\nnode_modules\ntests\nDockerfile*" },
    },
    {
      title: "Build, run, inspect",
      code: {
        lang: "bash",
        code: `docker build -t devatlas-ai:dev .
docker images devatlas-ai            # compare size with the naive build
docker run -d --name ai -p 8080:8000 -e APP_ENV=local devatlas-ai:dev
curl localhost:8080/health           # {"status":"ok","env":"local"}
docker logs -f ai                    # follow logs
docker exec -it ai sh                # shell inside the container
docker history devatlas-ai:dev       # see each layer and its size
docker stop ai && docker rm ai`,
      },
      notes: ["Edit app/main.py and rebuild: the pip install step shows CACHED. That is the layer ordering paying off."],
    },
    {
      title: "Run the stack with Compose",
      code: {
        lang: "yaml",
        file: "compose.yaml",
        code: `services:
  ai:
    build: .
    ports: ["8080:8000"]
    environment:
      APP_ENV: local
      DATABASE_URL: postgresql://app:\${DB_PASSWORD}@db:5432/devatlas
    depends_on:
      db:
        condition: service_healthy
  db:
    image: pgvector/pgvector:pg17
    environment:
      POSTGRES_USER: app
      POSTGRES_PASSWORD: \${DB_PASSWORD}
      POSTGRES_DB: devatlas
    volumes: ["pgdata:/var/lib/postgresql/data"]
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U app -d devatlas"]
      interval: 5s
      retries: 10
volumes:
  pgdata:`,
      },
      notes: ["Put `DB_PASSWORD=...` in a local `.env` file (gitignored); Compose reads it for variable substitution. Note the API reaches Postgres at host `db`, the service name, not localhost.", "Run with `docker compose up --build`; stop with `docker compose down` (add `-v` to delete the volume)."],
    },
  ],
  companies: [
    "**Containers are the default deployment unit** for backend services: images are built in CI, scanned, pushed to a registry (ECR, ACR, GHCR) and run on Kubernetes, ECS, Azure Container Apps or similar.",
    "**Image hygiene is a security requirement.** Teams scan images in CI (tools such as Trivy, Grype or Docker Scout), use slim or distroless base images, run as non-root, and rebuild regularly to pick up base-image security patches.",
    "**Reproducible dev environments:** Compose files or dev containers let a new engineer run the whole stack with one command on day one, which is a big part of onboarding speed.",
  ],
  mistakes: [
    { mistake: "COPY . before installing dependencies", why: "It is the shortest Dockerfile", wrong: "Every code change reinstalls all dependencies: slow builds", fix: "Copy manifests first, install, then copy source" },
    { mistake: "Running as root", why: "It is the default", wrong: "A container escape or app exploit gets root-level access inside, and often more", fix: "Create a user and add USER; drop capabilities in production" },
    { mistake: "Baking secrets into images", why: "ENV API_KEY=... works", wrong: "Anyone with the image can read the secret from its layers or history", fix: "Inject at runtime via env vars from a secret manager; use BuildKit secret mounts for build-time secrets" },
    { mistake: "Using :latest tags in production", why: "Convenient", wrong: "You cannot tell what is running; rollbacks are guesswork", fix: "Tag with git SHA or version; pin base images (optionally by digest)" },
    { mistake: "Storing data in the container filesystem", why: "Writing files just works", wrong: "Data disappears when the container is replaced", fix: "Use volumes or managed storage (database, object storage)" },
    { mistake: "localhost between containers", why: "It works outside Docker", wrong: "Connection refused: localhost is the container itself", fix: "Use the Compose service name (e.g. db:5432)" },
  ],
  bestPractices: [
    { tag: "Security", text: "Slim/distroless base, non-root USER, .dockerignore for secrets, image scanning in CI, regular rebuilds." },
    { tag: "Performance", text: "Order layers by change frequency; use multi-stage builds; enable BuildKit cache mounts for package managers." },
    { tag: "Reliability", text: "Exec-form CMD for proper signal handling, a HEALTHCHECK (or orchestrator probes), and immutable tags." },
    { tag: "Cost", text: "Smaller images mean faster deploys, less registry storage and less network transfer; clean up old images with registry lifecycle policies." },
  ],
  interview: [
    { q: "Container vs virtual machine?", a: "A VM virtualises hardware and runs a full guest OS with its own kernel. A container is an isolated process sharing the host kernel, isolated with namespaces and limited with cgroups. Containers are lighter and start faster; VMs give stronger isolation." },
    { q: "How do you make Docker builds fast?", a: "Order instructions so rarely changing steps come first (base, system packages, dependency manifest and install) and source code last, use .dockerignore, multi-stage builds, and BuildKit cache mounts; in CI, also use a remote build cache." },
    { q: "How do you secure a container image?", a: "Minimal base image, pinned versions, non-root user, no secrets in layers, scan for vulnerabilities in CI, sign images if your platform supports it, and rebuild often for patches. At runtime: read-only filesystem where possible, dropped capabilities and resource limits." },
  ],
  quickCheck: [
    {
      kind: "bug",
      prompt: "Every one-line code change makes `pip install` run again (4 minutes). Why?",
      code: { lang: "dockerfile", code: "FROM python:3.12-slim\nWORKDIR /app\nCOPY . .\nRUN pip install -r requirements.txt" },
      options: ["pip has no cache", "COPY . . changes whenever any file changes, invalidating later layers", "WORKDIR breaks caching", "slim images cannot cache"],
      answer: 1,
      explanation: "Copy requirements.txt alone, install, then copy the rest.",
    },
    {
      kind: "mcq",
      prompt: "In Compose, the API container connects to Postgres at `localhost:5432` and fails. Fix?",
      options: ["Expose 5432 to the host", "Use the service name `db:5432`", "Run both in one container", "Use host networking always"],
      answer: 1,
      explanation: "Each container has its own network namespace. Compose DNS resolves service names.",
    },
    {
      kind: "mcq",
      prompt: "What do containers share with the host that VMs do not?",
      options: ["The kernel", "The filesystem", "The PID 1 process", "Nothing"],
      answer: 0,
      explanation: "Containers are processes on the host kernel; VMs run their own kernel.",
    },
  ],
  cheatSheet: [
    "Container = process + namespaces + cgroups + layered filesystem.",
    "Layer order: base → system deps → manifests → install → source.",
    "Multi-stage: build in one stage, ship only runtime artefacts.",
    "Non-root USER, .dockerignore, no secrets in images, scan in CI.",
    "Exec-form CMD [\"…\"] for proper signals.",
    "Tag with version/git SHA, not :latest.",
    "Volumes for data; service names for container-to-container networking.",
    "Debug: logs -f, exec -it sh, history, inspect.",
  ],
  homework: {
    basic: {
      title: "Naive vs production image",
      brief: ["Build both Dockerfiles from this lesson. Record image size, cold build time, and rebuild time after a one-line code change for each."],
      criteria: ["Table with size and timings for both", "Explanation of each difference"],
      hints: ["`time docker build ...` and `docker images`. Use `--no-cache` for cold builds."],
      solution: {
        text: ["Expect the production image to be several times smaller (slim base, no build tools) and rebuilds after code changes to take seconds because dependency layers are cached. Exact numbers vary by machine and versions."],
      },
    },
    intermediate: {
      title: "Containerise a Node or .NET app",
      brief: ["Write a multi-stage Dockerfile for a Node (or ASP.NET Core) API: dependency install in a build stage, non-root runtime, healthcheck, .dockerignore."],
      criteria: ["Multi-stage", "Non-root", "Deps cached separately from source", "Runs and responds to /health"],
      hints: ["Node: copy package.json and package-lock.json, run `npm ci`.", ".NET: mcr.microsoft.com/dotnet/sdk for build, mcr.microsoft.com/dotnet/aspnet for runtime."],
      solution: {
        text: ["Node example below. The official node images include a non-root user named node."],
        code: {
          lang: "dockerfile",
          code: `FROM node:22-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

FROM node:22-slim
ENV NODE_ENV=production
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY src ./src
COPY package.json ./
USER node
EXPOSE 3000
CMD ["node", "src/server.js"]`,
        },
      },
    },
    challenge: {
      title: "Scan and harden",
      brief: ["Scan your image with Trivy (`docker run --rm -v /var/run/docker.sock:/var/run/docker.sock aquasec/trivy image devatlas-ai:dev`). Reduce HIGH/CRITICAL findings by at least half and document what you changed."],
      criteria: ["Before/after scan summaries", "Changes justified (base image, removed packages, updates)", "App still works"],
      hints: ["Compare python:3.12 vs python:3.12-slim vs a distroless option."],
      solution: {
        text: ["Most findings come from OS packages in the base image. Moving to a slim or distroless base and rebuilding on the latest patch release typically removes the majority. Remaining ones: update dependencies, or document why an unfixed CVE is not exploitable in your context."],
      },
    },
    capstone: {
      title: "DevAtlas step 10: one-command local stack",
      brief: ["Add Dockerfiles for the AI service and frontend, and a compose.yaml running frontend, AI service, PostgreSQL (pgvector) and MySQL with healthchecks and named volumes. `docker compose up` must bring the whole stack up from a fresh clone."],
      criteria: ["All services healthy", "No secrets committed (.env.example provided)", "README 'Run locally' section"],
      hints: ["Frontend: build with Node, serve the static build with nginx in the runtime stage."],
      solution: {
        text: ["Use depends_on with condition: service_healthy, a .env.example listing every variable, and named volumes for both databases. This compose file later becomes the reference for your Kubernetes manifests."],
      },
    },
  },
  deeper: [
    { label: "Docker docs: Building best practices", url: "https://docs.docker.com/build/building/best-practices/" },
    { label: "Docker docs: Multi-stage builds", url: "https://docs.docker.com/build/building/multi-stage/" },
    { label: "Docker Compose file reference", url: "https://docs.docker.com/reference/compose-file/" },
    { label: "Trivy documentation", url: "https://trivy.dev/" },
  ],
  nextPreview: "Next: Docker Compose for multi-service apps: networks, volumes, healthchecks and profiles, then CI/CD with GitHub Actions to build and push these images automatically.",
};
