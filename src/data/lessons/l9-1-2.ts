import type { Lesson } from "../../types";

export const lesson: Lesson = {
  id: "9.1.2",
  title: "Docker Compose for multi-service apps",
  minutes: 80,
  level: "Intermediate",
  prerequisites: ["9.1.1 Docker in depth: images, layers and multi-stage builds"],
  summary: "Run a real multi-service stack with one command: an nginx proxy, a FastAPI service, PostgreSQL, Redis, a migration job and scaled workers. You will use isolated networks, named volumes, liveness vs readiness healthchecks, startup ordering, profiles, override files for hot reload, and file-based secrets, all verified with Docker Compose.",
  terms: [
    {
      term: "Service",
      def: "One container definition in compose.yaml (image or build, env, ports, volumes). It can run as several replicas.",
    },
    {
      term: "Project",
      def: "The set of containers, networks and volumes Compose creates for one compose.yaml, named by `name:` or the folder.",
    },
    {
      term: "Network",
      def: "A virtual network; containers on it reach each other by service name through Compose's built-in DNS.",
    },
    {
      term: "Named volume",
      def: "Docker-managed storage that survives container replacement, used for database data.",
    },
    {
      term: "Healthcheck",
      def: "A command Docker runs periodically to decide whether a container is healthy.",
    },
    {
      term: "Liveness vs readiness",
      def: "Liveness: is the process alive? Readiness: can it serve traffic right now (dependencies reachable)?",
    },
    {
      term: "Profile",
      def: "A label that keeps optional services (admin tools, load generators) off unless requested.",
    },
    {
      term: "Override file",
      def: "compose.override.yaml, merged automatically on top of compose.yaml; typically holds local-development settings.",
    },
  ],
  problem: [
    "A new DevAtlas engineer's onboarding doc has 14 steps: install PostgreSQL 17 with pgvector, install Redis, create a user, run migrations, export six variables, start the API, start nginx... It takes a day, and 'works on my machine' bugs come from everyone having slightly different versions.",
    "Worse, the API sometimes starts before the database is ready and crashes, the database is reachable from anywhere on the laptop's network, and the password sits in plain text in the compose file. One well-written compose file fixes all of it.",
  ],
  concept: {
    analogy: [
      "Compose is the **seating plan and run sheet for a dinner party**. It lists every guest (service), who sits at which table and can talk to whom (networks), who must arrive before whom (depends_on with health conditions), where coats are kept so they survive the evening (volumes), and which optional guests come only when invited (profiles).",
    ],
    precise: [
      "**Declarative stack:** `compose.yaml` describes services, networks, volumes and secrets. `docker compose up` creates or updates everything to match; `down` removes containers and networks (add `-v` to delete volumes).",
      "**Networking:** each project gets a default network; define your own to isolate tiers. A service on two networks bridges them. `internal: true` removes the route to the outside world. Services reach each other by service name; only `ports:` publishes to the host.",
      "**Startup order that actually works:** `depends_on` with `condition: service_healthy` waits for a healthcheck, and `service_completed_successfully` waits for one-off jobs such as migrations. Without conditions, Compose only waits for the container to *start*, not to be ready.",
      "**Health endpoints:** liveness (`/health/live`, no dependency checks) and readiness (`/health/ready`, checks DB and cache, returns 503 when they fail). Orchestrators restart on failed liveness and stop routing on failed readiness (Kubernetes, lesson 9.4.1).",
      "**Configuration:** variables come from the shell or a `.env` file (`${VAR:?message}` fails fast when missing). Secrets are better as files (`secrets:` mounts them at `/run/secrets/<name>`); official database images accept `*_FILE` variables.",
      "**Environments:** `compose.override.yaml` is merged automatically for local development (bind mounts, hot reload, extra ports). CI and other environments run `-f compose.yaml` explicitly, or add their own files.",
    ],
  },
  underTheHood: {
    text: [
      "Compose talks to the Docker Engine API. It creates a user-defined bridge network per network you declare; Docker's embedded DNS server (127.0.0.11 inside containers) resolves service names to container IPs on networks the caller shares. That is why the proxy could not even resolve `db`: they share no network.",
      "With several replicas (`--scale worker=3`), the service name resolves to all replica IPs. For queue workers, the queue itself (Redis `BRPOP`) distributes jobs: each job is popped by exactly one worker.",
      "A named volume lives in Docker's storage area (`docker volume ls`), independent of containers. Bind mounts (`./api:/app`) map a host folder into the container: perfect for development, risky in production.",
      "Healthcheck status is part of the container state. `docker compose up --wait` blocks until every service is running and healthy, which makes Compose usable in CI for integration tests.",
    ],
    diagram: {
      title: "The DevAtlas local stack",
      nodes: [
        { label: "proxy", sub: "nginx :8088 (frontend)" },
        { label: "api", sub: "FastAPI (frontend + backend)" },
        { label: "migrate", sub: "one-off psql job" },
        { label: "db", sub: "Postgres + volume (backend)" },
        { label: "cache", sub: "Redis + AOF volume (backend)" },
      ],
      edges: ["/api → api:8000", "waits for", "waits healthy", ""],
      caption: "Only the proxy publishes a port. The backend network is internal: no internet, unreachable from the proxy.",
    },
  },
  handsOn: [
    {
      title: "An API with liveness and readiness",
      code: {
        lang: "python",
        file: "api/main.py",
        code: `import os

import psycopg
import redis
from fastapi import FastAPI, Response

app = FastAPI()
DB_URL = os.environ["DATABASE_URL"]
cache = redis.Redis.from_url(os.environ["REDIS_URL"], socket_timeout=1)


@app.get("/health/live")
def live() -> dict:                          # "is the process up?" (no dependencies)
    return {"ok": True}


@app.get("/health/ready")
def ready(response: Response) -> dict:       # "can I serve traffic?" (checks dependencies)
    checks = {}
    try:
        with psycopg.connect(DB_URL, connect_timeout=2) as conn:
            conn.execute("SELECT 1")
        checks["db"] = "ok"
    except Exception as e:
        checks["db"] = type(e).__name__
    try:
        cache.ping()
        checks["redis"] = "ok"
    except Exception as e:
        checks["redis"] = type(e).__name__
    if any(v != "ok" for v in checks.values()):
        response.status_code = 503
    return checks


@app.post("/lessons/{lesson_id}/view")
def view(lesson_id: str) -> dict:
    views = cache.incr(f"views:{lesson_id}")                      # fast counter
    with psycopg.connect(DB_URL) as conn:                           # durable record
        conn.execute("INSERT INTO lesson_views (lesson_id) VALUES (%s)", (lesson_id,))
        total = conn.execute("SELECT count(*) FROM lesson_views WHERE lesson_id = %s",
                             (lesson_id,)).fetchone()[0]
    return {"lesson": lesson_id, "cached_views": views, "stored_views": total}`,
      },
      notes: [
        "Liveness must not check dependencies: if the database is down, restarting every API container does not help and can make recovery slower.",
      ],
    },
    {
      title: "The compose file",
      text: [
        "Also create `proxy/nginx.conf` (proxy `/api/` to `http://api:8000/`), `db/001_init.sql` (creates the `lesson_views` table), `api/Dockerfile`, and a `.env` with `DB_PASSWORD=...` (gitignored; commit `.env.example`).",
      ],
      code: {
        lang: "yaml",
        file: "compose.yaml",
        code: `name: devatlas

services:
  proxy:
    image: nginx:1.27-alpine
    ports: ["8088:80"]                       # the only port published to your machine
    volumes: ["./proxy/nginx.conf:/etc/nginx/conf.d/default.conf:ro"]
    networks: [frontend]
    depends_on:
      api:
        condition: service_healthy

  api:
    build: ./api
    image: devatlas-api:dev
    environment:
      DATABASE_URL: postgresql://app:\${DB_PASSWORD:?set DB_PASSWORD in .env}@db:5432/devatlas
      REDIS_URL: redis://cache:6379/0
    networks: [frontend, backend]            # bridges the two networks
    healthcheck:
      test: ["CMD", "python", "-c", "import urllib.request; urllib.request.urlopen('http://localhost:8000/health/ready')"]
      interval: 5s
      timeout: 3s
      retries: 10
      start_period: 5s
    depends_on:
      migrate:
        condition: service_completed_successfully
      cache:
        condition: service_healthy
    restart: unless-stopped

  migrate:                                   # one-off job: runs, exits 0, then api starts
    image: pgvector/pgvector:pg17
    command: ["psql", "-v", "ON_ERROR_STOP=1", "-f", "/migrations/001_init.sql"]
    environment:
      PGHOST: db
      PGUSER: app
      PGDATABASE: devatlas
      PGPASSWORD: \${DB_PASSWORD}
    volumes: ["./db:/migrations:ro"]
    networks: [backend]
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
    networks: [backend]                      # not reachable from proxy or your machine
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U app -d devatlas"]
      interval: 3s
      retries: 20

  cache:
    image: redis:7.4-alpine
    command: ["redis-server", "--appendonly", "yes"]
    volumes: ["redisdata:/data"]
    networks: [backend]
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 3s
      retries: 20

  adminer:                                   # optional tool: docker compose --profile tools up
    image: adminer:4
    profiles: [tools]
    ports: ["8089:8080"]
    networks: [backend]

networks:
  frontend:
  backend:
    internal: true                           # no route to the internet from this network

volumes:
  pgdata:
  redisdata:`,
      },
    },
    {
      title: "Bring it up and use it",
      code: {
        lang: "bash",
        code: `docker compose up -d --build --wait
docker compose ps
curl localhost:8088/api/health/ready
curl -X POST localhost:8088/api/lessons/9.1.2/view
curl -X POST localhost:8088/api/lessons/9.1.2/view`,
      },
      output: "Container devatlas-db-1 Healthy\nContainer devatlas-cache-1 Healthy\nContainer devatlas-migrate-1 Exited\nContainer devatlas-api-1 Healthy\nContainer devatlas-proxy-1 Healthy\n\nSERVICE   STATUS\napi       Up 6 seconds (healthy)\ncache     Up 10 seconds (healthy)\ndb        Up 10 seconds (healthy)\nproxy     Up Less than a second\n\n{\"db\":\"ok\",\"redis\":\"ok\"}\n{\"lesson\":\"9.1.2\",\"cached_views\":1,\"stored_views\":1}\n{\"lesson\":\"9.1.2\",\"cached_views\":2,\"stored_views\":2}",
      notes: [
        "`migrate` shows `Exited` (code 0): that is success for a one-off job, and it is what released the API to start.",
      ],
    },
    {
      title: "Prove the isolation, persistence and readiness",
      code: {
        lang: "bash",
        code: `# the proxy is not on the backend network: it cannot even resolve the database
docker compose exec proxy wget -qO- -T 2 http://db:5432
# the backend network is internal: no internet from the cache
docker compose exec cache wget -qO- -T 3 http://example.com

# volumes survive down/up
docker compose down && docker compose up -d --wait
curl -X POST localhost:8088/api/lessons/9.1.2/view

# readiness fails when a dependency is down
docker compose stop cache
curl -s -w ' HTTP %{http_code}\\n' localhost:8088/api/health/ready
docker compose start cache`,
      },
      output: "wget: bad address 'db:5432'\nwget: bad address 'example.com'\n{\"lesson\":\"9.1.2\",\"cached_views\":3,\"stored_views\":3}\n{\"db\":\"ok\",\"redis\":\"ConnectionError\"} HTTP 503",
      notes: [
        "Redis kept its counter too, because it runs with `--appendonly yes` on a named volume. Use `docker compose down -v` when you really want a clean slate.",
      ],
    },
    {
      title: "Local development: override file with hot reload",
      code: {
        lang: "yaml",
        file: "compose.override.yaml",
        code: `# Loaded automatically by \`docker compose up\` (not in CI/prod, which pass -f compose.yaml).
services:
  api:
    command: ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
    volumes: ["./api:/app"]                  # edit on your machine, reload in the container
    ports: ["8000:8000"]                     # call the API directly while debugging
    environment:
      LOG_LEVEL: debug`,
      },
      output: "$ docker compose config   # shows the merged result\n$ curl localhost:8000/health/live\n{\"ok\":true}\n# add a /version route to api/main.py and save; a few seconds later:\n$ curl localhost:8000/version\n{\"version\":\"dev-reload\"}",
      notes: [
        "`docker compose watch` (with a `develop.watch` section) is the alternative: it syncs files or rebuilds on change without bind mounts.",
      ],
    },
  ],
  companies: [
    "**One-command onboarding:** teams treat 'clone, copy .env.example, `docker compose up`' as the standard for every repository, cutting onboarding from days to minutes and removing version drift between laptops.",
    "**Integration tests in CI:** pipelines start the real dependencies with Compose (`up --wait`), run tests against them, and tear everything down, so tests use real PostgreSQL and Redis instead of mocks.",
    "**Compose as the bridge to production:** the compose file documents every service, port, variable and dependency, and becomes the blueprint for Kubernetes manifests or Container Apps definitions.",
    "**Small production deployments** (internal tools, side projects) often run Compose on a single VM, accepting the lack of multi-host scheduling in exchange for simplicity.",
  ],
  mistakes: [
    {
      mistake: "`depends_on` without a condition",
      why: "It looks like it handles ordering",
      wrong: "The API starts before PostgreSQL accepts connections and crashes or hangs",
      fix: "`condition: service_healthy` with a real healthcheck; also retry connections in code",
    },
    {
      mistake: "Publishing database ports",
      why: "Handy for desktop tools",
      wrong: "The database is reachable from your network (and the internet on a server)",
      fix: "Keep it on an internal network; use `docker compose exec db psql` or an opt-in tools profile",
    },
    {
      mistake: "Passwords written in compose.yaml",
      why: "Quick to get working",
      wrong: "Secrets end up in Git history",
      fix: "`.env` (gitignored) with `${VAR:?}`; better, file-based `secrets:`",
    },
    {
      mistake: "`localhost` between services",
      why: "Habit from running things directly",
      wrong: "Connection refused: localhost is the container itself",
      fix: "Use service names (`db:5432`, `cache:6379`)",
    },
    {
      mistake: "Readiness checks inside liveness",
      why: "One /health endpoint for everything",
      wrong: "A database blip restarts every API container",
      fix: "Separate live (process) and ready (dependencies) endpoints",
    },
    {
      mistake: "Forgetting `down -v` semantics",
      why: "Assuming down deletes everything, or that it never does",
      wrong: "Lost data, or stale data confusing tests",
      fix: "`down` keeps volumes; `down -v` deletes them. Use it deliberately",
    },
  ],
  bestPractices: [
    {
      tag: "Security",
      text: "Publish only the entry point, isolate data services on internal networks, run as non-root, and pass secrets as files.",
    },
    {
      tag: "Reliability",
      text: "Healthchecks for every long-running service, health-gated startup, migrations as one-off jobs, `restart: unless-stopped`.",
    },
    {
      tag: "Maintainability",
      text: "One compose.yaml for the stack, an override for local dev, `.env.example` documenting every variable, and a helper script for common commands.",
    },
    {
      tag: "Performance",
      text: "Pin image versions, use named volumes for databases (bind mounts are slower on macOS/Windows), and cache dependency layers in Dockerfiles.",
    },
    {
      tag: "Cost",
      text: "Keep optional tools in profiles so laptops and CI runners do not run what nobody uses.",
    },
  ],
  interview: [
    {
      q: "How do you make sure a service starts only when its database is ready?",
      a: "Give the database a healthcheck (pg_isready), and use depends_on with condition service_healthy. Run migrations as a one-off service and make the app depend on it with service_completed_successfully. Still add connection retries with backoff in the app, because dependencies can restart later, and in Kubernetes there is no depends_on: readiness probes and retries do the job.",
    },
    {
      q: "What is the difference between liveness and readiness checks?",
      a: "Liveness answers 'is the process stuck or dead?' and should be cheap and dependency-free; failing it triggers a restart. Readiness answers 'can I serve requests now?' and checks dependencies; failing it takes the instance out of load balancing without restarting it. Mixing them causes restart storms during dependency outages.",
    },
    {
      q: "How do containers in Compose find each other, and how do you isolate them?",
      a: "Compose creates user-defined networks with built-in DNS, so containers resolve each other by service name. Services only see services on shared networks. Define separate frontend and backend networks, attach only the API to both, mark the backend internal to cut internet access, and publish ports only for the entry point.",
    },
  ],
  quickCheck: [
    {
      kind: "mcq",
      prompt: "The API crashes on `docker compose up` with 'connection refused' to PostgreSQL, but works if you restart it. What is the best fix?",
      options: [
        "Add `sleep 10` before starting the API",
        "Add a database healthcheck and `depends_on: db: condition: service_healthy`, plus connection retries",
        "Publish port 5432",
        "Use `network_mode: host`",
      ],
      answer: 1,
      explanation: "Wait for actual readiness rather than guessing a delay, and keep retries in code for later restarts.",
    },
    {
      kind: "output",
      prompt: "30 jobs are pushed to a Redis list and `--scale worker=3` workers each `BRPOP` from it. What does `HVALS jobs:done_by` summed over workers give?",
      options: [
        "90 (each worker processes every job)",
        "30 (each job is processed once)",
        "10 (only one worker runs)",
        "It depends on DNS round robin",
      ],
      answer: 1,
      explanation: "BRPOP atomically removes an item, so each job goes to exactly one worker. In our run each of the 3 workers did 10, but the split can vary; the total is always 30.",
    },
    {
      kind: "bug",
      prompt: "Why can't the proxy reach the API with this configuration?",
      code: {
        lang: "yaml",
        code: `services:
  proxy:
    image: nginx:1.27-alpine
    networks: [frontend]
  api:
    image: devatlas-api:dev
    networks: [backend]
networks:
  frontend:
  backend:
    internal: true`,
      },
      options: [
        "nginx needs port 8000 published",
        "The proxy and api share no network, so `api` does not resolve from the proxy",
        "internal networks block all traffic",
        "Compose needs `links:`",
      ],
      answer: 1,
      explanation: "Attach the API to both networks (`networks: [frontend, backend]`). `links` is legacy and unnecessary on user-defined networks.",
    },
  ],
  cheatSheet: [
    "`docker compose up -d --build --wait` · `ps` · `logs -f svc` · `exec svc sh` · `down` (`-v` deletes volumes).",
    "Service names are hostnames; only `ports:` publish to the host.",
    "Separate networks per tier; `internal: true` = no internet.",
    "`depends_on: {svc: {condition: service_healthy | service_completed_successfully}}`.",
    "Live = process up; Ready = dependencies OK (503 when not).",
    "Named volumes for data; bind mounts for dev code.",
    "`${VAR:?msg}` fails fast; secrets as files under /run/secrets; `POSTGRES_PASSWORD_FILE`.",
    "compose.override.yaml = local dev; CI uses `-f compose.yaml`.",
    "`--scale worker=3`; profiles for optional tools.",
  ],
  homework: {
    basic: {
      title: "Scale a queue worker",
      brief: [
        "Add a worker service that takes 'build digest' jobs from a Redis list and records which replica did each job. Run three replicas, push 30 jobs, and show that every job was processed exactly once.",
      ],
      criteria: [
        "Worker on the backend network only",
        "Three replicas with `--scale`",
        "Proof that the total equals the number of jobs",
      ],
      hints: ["`socket.gethostname()` inside a container is its container id: a handy replica label."],
      solution: {
        text: [
          "Keep the worker in its own compose file and combine with `-f compose.yaml -f compose.worker.yaml`. Verified run: each of 3 workers processed 10 of 30 jobs (the split can vary; the total cannot).",
        ],
        code: {
          lang: "python",
          file: "worker/worker.py",
          code: `"""Pull jobs from a Redis list. Run several copies: each job goes to exactly one worker."""
import json
import os
import socket
import time

import redis

r = redis.Redis.from_url(os.environ["REDIS_URL"])
me = socket.gethostname()                 # container id: shows which replica did the work

print(f"worker {me} ready", flush=True)
while True:
    item = r.brpop("jobs:digest", timeout=5)          # blocks until a job arrives
    if item is None:
        continue
    job = json.loads(item[1])
    time.sleep(0.2)                                    # pretend to build a digest email
    r.hincrby("jobs:done_by", me, 1)
    print(f"{me} built digest for {job['user']}", flush=True)

# ---- compose.worker.yaml ----
# services:
#   worker:
#     build: ./worker
#     image: devatlas-worker:dev
#     environment:
#       REDIS_URL: redis://cache:6379/0
#     networks: [backend]
#     depends_on:
#       cache:
#         condition: service_healthy
#     restart: unless-stopped

# docker compose -f compose.yaml -f compose.worker.yaml up -d --scale worker=3 --wait
# docker compose exec cache sh -c 'for i in $(seq 1 30); do redis-cli LPUSH jobs:digest "{\\"user\\": \\"u$i\\"}"; done'`,
        },
        output: "per-worker counts: 10 10 10\ntotal jobs done: 30",
      },
    },
    intermediate: {
      title: "Hot reload for local development",
      brief: [
        "Write a `compose.override.yaml` that bind-mounts the API source, runs uvicorn with `--reload`, publishes the API port for debugging and sets debug logging. Prove a code change is live without rebuilding.",
      ],
      criteria: [
        "Override merges cleanly (`docker compose config`)",
        "Change visible without `--build`",
        "CI path unaffected (`-f compose.yaml`)",
      ],
      hints: ["`docker compose config --format json` shows the merged service."],
      solution: {
        text: [
          "The override is the hands-on file. Verified: after appending a `/version` route to `api/main.py`, `curl localhost:8000/version` returned the new response within seconds, with no rebuild.",
        ],
        code: {
          lang: "bash",
          file: "check_override.sh",
          code: `docker compose config --format json \\
  | python3 -c "import json,sys; a=json.load(sys.stdin)['services']['api']; print(a['command'][-1], [p['published'] for p in a['ports']])"
docker compose up -d --wait
curl localhost:8000/health/live`,
        },
        output: "--reload ['8000']\n{\"ok\":true}",
      },
    },
    challenge: {
      title: "Secrets as files, not environment variables",
      brief: [
        "Change the stack so the database password is a Compose secret: PostgreSQL reads `POSTGRES_PASSWORD_FILE`, the API reads the file at startup, and the password appears in no container's environment.",
      ],
      criteria: [
        "`secrets:` block with a gitignored file",
        "DB uses `*_FILE`",
        "App reads /run/secrets",
        "`docker inspect` shows no password in Env",
      ],
      hints: ["Generate the file with `python3 -c 'import secrets; print(secrets.token_urlsafe(24))'`."],
      solution: {
        text: [
          "Environment variables leak through `docker inspect`, crash reports, `/proc` and child processes; files under /run/secrets do not appear there. The same pattern maps directly to Kubernetes Secrets mounted as files (lesson 9.4.2).",
        ],
        code: {
          lang: "yaml",
          file: "compose.yaml",
          code: `name: devatlas-secrets

services:
  api:
    build: ./api
    image: devatlas-api:secrets
    environment:
      DATABASE_URL: postgresql://app:{password}@db:5432/devatlas
      DB_PASSWORD_FILE: /run/secrets/db_password
      REDIS_URL: redis://cache:6379/0
    secrets: [db_password]
    ports: ["8000:8000"]
    depends_on:
      db: { condition: service_healthy }
      cache: { condition: service_healthy }

  db:
    image: pgvector/pgvector:pg17
    environment:
      POSTGRES_USER: app
      POSTGRES_DB: devatlas
      POSTGRES_PASSWORD_FILE: /run/secrets/db_password   # official images support *_FILE
    secrets: [db_password]
    volumes: ["./db:/docker-entrypoint-initdb.d:ro"]     # runs .sql files on first start
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U app -d devatlas"]
      interval: 3s
      retries: 20

  cache:
    image: redis:7.4-alpine
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 3s
      retries: 20

secrets:
  db_password:
    file: ./secrets/db_password.txt     # gitignored; in prod this comes from a secret manager

# ---- api/main.py (change) ----
# with open(os.environ["DB_PASSWORD_FILE"]) as f:
#     DB_URL = os.environ["DATABASE_URL"].replace("{password}", f.read().strip())`,
        },
        output: "$ curl localhost:8000/health/ready\n{\"db\":\"ok\",\"redis\":\"ok\"}\n$ docker inspect devatlas-secrets-api-1 devatlas-secrets-db-1 --format '{{json .Config.Env}}' | grep -c \"$(cat secrets/db_password.txt)\"\n0",
      },
    },
    capstone: {
      title: "DevAtlas: the one-command local stack",
      brief: [
        "Finish DevAtlas's compose setup: proxy, API, migrations, PostgreSQL, Redis, worker, optional admin tools profile, and a `dev.sh` helper (up, down, reset, logs, psql, status) that creates `.env` with a random password on first run.",
      ],
      criteria: [
        "Fresh clone → `./dev.sh up` → healthy stack",
        "No secrets committed",
        "Helper fails with usage on unknown commands",
        "README 'Run locally' section",
      ],
      hints: ["`set -euo pipefail` and `cd \"$(dirname \"$0\")\"` make helper scripts safe to run from anywhere."],
      solution: {
        text: [
          "The helper turns tribal knowledge into commands. `reset` is deliberately explicit about deleting volumes. This compose file is the reference for the Kubernetes manifests in lesson 9.4.1.",
        ],
        code: {
          lang: "bash",
          file: "dev.sh",
          code: `#!/usr/bin/env bash
# DevAtlas local stack helper. Usage: ./dev.sh up|down|reset|logs [svc]|psql|status
set -euo pipefail
cd "$(dirname "$0")"

if [[ ! -f .env ]]; then
  cp .env.example .env
  sed -i.bak "s/^DB_PASSWORD=.*/DB_PASSWORD=$(openssl rand -hex 16)/" .env && rm -f .env.bak
  echo "created .env with a random local DB_PASSWORD"
fi

case "\${1:-status}" in
  up)     docker compose up -d --build --wait && echo "ready: http://localhost:8088" ;;
  down)   docker compose down ;;
  reset)  docker compose down -v && echo "volumes deleted; next 'up' starts from an empty database" ;;
  logs)   docker compose logs -f --tail=100 "\${@:2}" ;;
  psql)   docker compose exec db psql -U app -d devatlas ;;
  status) docker compose ps ;;
  *)      echo "usage: $0 up|down|reset|logs [service]|psql|status" >&2; exit 1 ;;
esac`,
        },
        output: "$ ./dev.sh status\ncreated .env with a random local DB_PASSWORD\n$ ./dev.sh nope\nusage: ./dev.sh up|down|reset|logs [service]|psql|status",
      },
    },
  },
  deeper: [
    { label: "Docker docs: Compose file reference", url: "https://docs.docker.com/reference/compose-file/" },
    {
      label: "Docker docs: Control startup order",
      url: "https://docs.docker.com/compose/how-tos/startup-order/",
    },
    { label: "Docker docs: Secrets in Compose", url: "https://docs.docker.com/compose/how-tos/use-secrets/" },
    { label: "Docker docs: Compose Watch", url: "https://docs.docker.com/compose/how-tos/file-watch/" },
  ],
  nextPreview: "Next: CI/CD with GitHub Actions and Azure Pipelines: build, test, scan and deploy on every push, with secrets handled safely.",
};
