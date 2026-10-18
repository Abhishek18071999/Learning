import type { Lesson } from "../../types";

export const lesson: Lesson = {
  id: "8.1.1",
  title: "VMs, functions and containers on AWS and Azure",
  minutes: 80,
  level: "Intermediate",
  prerequisites: ["0.4.1 VS Code, package managers and Docker Desktop", "4.2.1 FastAPI for AI and data services"],
  summary: "The three ways to run code in the cloud, their AWS and Azure names, and how to choose. You will run the same headline tagger as an AWS Lambda function (deployed to LocalStack, an AWS emulator), as an Azure Function with unit tests, and as a container, then compare costs at different traffic levels.",
  terms: [
    {
      term: "IaaS / PaaS / FaaS",
      def: "Infrastructure as a Service (you manage the OS), Platform as a Service (you manage the app), Functions as a Service (you manage a function).",
    },
    {
      term: "VM",
      def: "A virtual machine: EC2 on AWS, Azure Virtual Machines on Azure. Full OS control, you patch and scale it.",
    },
    {
      term: "Serverless function",
      def: "Code that runs per event and scales to zero: AWS Lambda, Azure Functions. Billed per request and execution time.",
    },
    {
      term: "Managed containers",
      def: "Run your container image without managing servers: AWS ECS on Fargate, Azure Container Apps (Kubernetes options: EKS, AKS).",
    },
    {
      term: "Cold start",
      def: "Extra latency when a function or scaled-to-zero container starts a new execution environment.",
    },
    {
      term: "Region / Availability Zone",
      def: "A region is a geographic area; availability zones are separate data centres inside it. Spread across zones for resilience.",
    },
    {
      term: "Auto scaling",
      def: "Adding or removing capacity automatically from metrics: EC2 Auto Scaling groups, Azure VM Scale Sets, container and function platforms built-in.",
    },
    {
      term: "LocalStack",
      def: "An open-source emulator of AWS APIs that runs in Docker, used for local development and tests.",
    },
  ],
  problem: [
    "DevAtlas now has four backend pieces: the main API, the AI service, a news tagger called a few thousand times a day, and a nightly digest job. A teammate wants to put everything on one big VM 'to keep it simple'; another wants everything serverless 'because it scales'.",
    "Both are expensive mistakes for some of the pieces. A VM runs (and costs) 24/7 even when idle and has to be patched; functions have time limits, cold starts and can cost more under steady load. Choosing compute per workload is one of the most valuable cloud skills.",
  ],
  concept: {
    analogy: [
      "Compute options are like transport. A **VM** is owning a car: total control, but you pay for it parked and you do the maintenance. **Managed containers** are a long-term rental: you choose what goes inside, the company maintains the vehicle. **Functions** are taxis: you pay only per trip and never park, but a long road trip by taxi is ruinous and you may wait for one to arrive (cold start).",
    ],
    precise: [
      "**VMs (EC2, Azure VMs):** you pick CPU, memory, OS image and disks. Use for custom OS needs, special drivers or licences, or legacy apps. You own patching, scaling (Auto Scaling groups / VM Scale Sets) and hardening.",
      "**Functions (Lambda, Azure Functions):** event-driven handlers (HTTP, queue, schedule, file upload) with per-invocation billing and scale to zero. Limits matter: maximum run time (Lambda: 15 minutes), memory, package size, and cold starts. Ideal for spiky, short, event-driven work.",
      "**Managed containers (ECS Fargate, Azure Container Apps; App Service for web apps):** you ship an image; the platform runs, scales and replaces it. No time limit, any language and dependencies, same image locally and in prod. Ideal for APIs with steady traffic and long-lived connections. Kubernetes (EKS, AKS) gives more control at more operational cost (Phase 9).",
      "**Portable design:** keep business logic in plain modules with no cloud imports, and write a thin adapter per platform (Lambda handler, Functions trigger, FastAPI route). Moving between options then means changing the adapter, not the logic.",
    ],
  },
  underTheHood: {
    text: [
      "A function platform keeps a pool of **execution environments** (lightweight VMs or containers). The first request to a new environment runs your module-level code (imports, client creation): that is the cold start. Later requests reuse the environment and skip it, which is why you create SDK clients and database pools at module scope.",
      "Function billing is requests × price per request + (duration × memory) × price per GB-second. Memory size usually also scales CPU, so more memory can make a function faster *and* cheaper.",
      "Containers on Fargate or Container Apps run in isolated micro-VMs or sandboxes; you pay for allocated vCPU and memory while tasks run. Container Apps can also scale to zero on HTTP or queue triggers, blurring the line with functions.",
      "Whatever you choose, run at least two instances across availability zones for production APIs, put a load balancer or the platform's ingress in front, and keep state out of the compute (databases, object storage, caches), so any instance can be replaced.",
    ],
    diagram: {
      title: "One codebase, three ways to run it",
      nodes: [
        { label: "tagging.py", sub: "pure logic" },
        { label: "Lambda handler", sub: "event → dict" },
        { label: "Azure Function", sub: "HttpRequest → HttpResponse" },
        { label: "FastAPI + Docker", sub: "ECS / Container Apps" },
        { label: "VM", sub: "systemd + uvicorn" },
      ],
      edges: ["adapter", "adapter", "adapter", "same image"],
    },
  },
  handsOn: [
    {
      title: "Business logic with no cloud imports",
      code: {
        lang: "python",
        file: "tagging.py",
        code: `"""Shared business logic: no cloud imports, so it runs anywhere."""

TOPICS = {"security": ["cve", "exploit", "patch", "breach"], "ai": ["llm", "model", "agent"],
          "cloud": ["aws", "azure", "kubernetes", "lambda"]}


def tag(headline: str) -> str:
    h = headline.lower()
    return next((t for t, words in TOPICS.items() if any(w in h for w in words)), "other")`,
      },
      notes: [
        "Everything cloud-specific lives in small adapters. This file is unit-tested once and reused by every deployment option.",
      ],
    },
    {
      title: "AWS Lambda adapter",
      code: {
        lang: "python",
        file: "handler.py",
        code: `"""AWS Lambda entry point: a thin adapter around the shared tagging logic."""
import json

from tagging import tag


def lambda_handler(event, context):
    # API Gateway / Function URL events carry the HTTP body as a string
    body = json.loads(event.get("body") or "{}")
    headline = body.get("headline", "").strip()
    if not headline:
        return {"statusCode": 400, "body": json.dumps({"error": "headline is required"})}
    return {
        "statusCode": 200,
        "headers": {"content-type": "application/json"},
        "body": json.dumps({"headline": headline, "topic": tag(headline)}),
    }`,
      },
      notes: [
        "Return the API Gateway / Function URL response shape: `statusCode`, `headers`, and `body` as a string.",
      ],
    },
    {
      title: "Deploy and invoke on LocalStack",
      text: [
        "LocalStack emulates AWS APIs in Docker, so you can practise without an account or a bill: `docker run -d -p 4566:4566 -v /var/run/docker.sock:/var/run/docker.sock localstack/localstack`. The boto3 code is identical for real AWS; only the endpoint and credentials differ.",
      ],
      code: {
        lang: "python",
        file: "deploy_local.py",
        code: `"""Deploy and invoke the function on LocalStack (an AWS emulator). Same boto3 code works on AWS."""
import io
import json
import zipfile

import boto3

aws = dict(endpoint_url="http://localhost:4566", region_name="us-east-1",
           aws_access_key_id="test", aws_secret_access_key="test")   # LocalStack dummy creds
lam, iam = boto3.client("lambda", **aws), boto3.client("iam", **aws)

role = iam.create_role(
    RoleName="news-tagger-role",
    AssumeRolePolicyDocument=json.dumps({"Version": "2012-10-17", "Statement": [{
        "Effect": "Allow", "Principal": {"Service": "lambda.amazonaws.com"}, "Action": "sts:AssumeRole"}]}),
)["Role"]["Arn"]

buf = io.BytesIO()
with zipfile.ZipFile(buf, "w") as z:
    z.write("handler.py")
    z.write("tagging.py")
lam.create_function(FunctionName="news-tagger", Runtime="python3.12", Role=role,
                    Handler="handler.lambda_handler", Code={"ZipFile": buf.getvalue()},
                    MemorySize=256, Timeout=10)
lam.get_waiter("function_active_v2").wait(FunctionName="news-tagger")

for payload in [{"body": json.dumps({"headline": "Critical CVE patched in OpenSSH"})}, {"body": "{}"}]:
    out = lam.invoke(FunctionName="news-tagger", Payload=json.dumps(payload))
    print(json.loads(out["Payload"].read()))`,
      },
      output: "{'statusCode': 200, 'headers': {'content-type': 'application/json'}, 'body': '{\"headline\": \"Critical CVE patched in OpenSSH\", \"topic\": \"security\"}'}\n{'statusCode': 400, 'body': '{\"error\": \"headline is required\"}'}",
      notes: [
        "LocalStack runs the function in a real Lambda runtime container, so this is a genuine execution, not a mock.",
        "On real AWS, use infrastructure as code (Terraform, lesson 9.3.1, or AWS SAM/CDK) rather than scripts, and attach only the permissions the function needs.",
      ],
    },
    {
      title: "The same function on Azure Functions, with tests",
      code: {
        lang: "python",
        file: "function_app.py",
        code: `"""Azure Functions (Python v2 programming model): the same tagger as an HTTP function."""
import json

import azure.functions as func

from tagging import tag

app = func.FunctionApp(http_auth_level=func.AuthLevel.FUNCTION)   # requires a function key


@app.route(route="tag", methods=["POST"])
def tag_headline(req: func.HttpRequest) -> func.HttpResponse:
    try:
        headline = (req.get_json().get("headline") or "").strip()
    except ValueError:
        headline = ""
    if not headline:
        return func.HttpResponse(json.dumps({"error": "headline is required"}), status_code=400,
                                 mimetype="application/json")
    return func.HttpResponse(json.dumps({"headline": headline, "topic": tag(headline)}),
                             mimetype="application/json")

# ---- test_function_app.py ----
import json

import azure.functions as func

from function_app import tag_headline


def call(body: bytes) -> func.HttpResponse:
    req = func.HttpRequest(method="POST", url="/api/tag", body=body, headers={"content-type": "application/json"})
    return tag_headline.build().get_user_function()(req)


def test_tags_a_headline():
    resp = call(json.dumps({"headline": "New LLM agent framework released"}).encode())
    assert resp.status_code == 200 and json.loads(resp.get_body())["topic"] == "ai"


def test_rejects_missing_or_invalid_body():
    assert call(b"{}").status_code == 400
    assert call(b"not json").status_code == 400`,
      },
      output: "2 passed",
      notes: [
        "The Python v2 programming model uses decorators on a `FunctionApp`. `AuthLevel.FUNCTION` requires a function key; put an API gateway or Entra ID auth in front for user-facing APIs.",
        "Run locally with Azure Functions Core Tools (`func start`) and deploy with `func azure functionapp publish <app-name>`.",
      ],
    },
    {
      title: "The same logic as a container",
      code: {
        lang: "dockerfile",
        file: "Dockerfile",
        code: `FROM python:3.12-slim
WORKDIR /app
RUN pip install --no-cache-dir "fastapi==0.115.*" "uvicorn[standard]==0.32.*"
COPY tagging.py main.py ./
USER nobody
EXPOSE 8080
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8080"]`,
      },
      output: "$ docker build -t news-tagger:1 . && docker run -p 8080:8080 news-tagger:1\n$ curl -X POST localhost:8080/tag -H 'content-type: application/json' -d '{\"headline\":\"Azure Kubernetes Service adds new GPU nodes\"}'\n{\"headline\":\"Azure Kubernetes Service adds new GPU nodes\",\"topic\":\"cloud\"}",
      notes: [
        "`main.py` is a 15-line FastAPI app calling `tag()`. This exact image runs on ECS Fargate, Azure Container Apps, App Service, Kubernetes or a VM with Docker.",
      ],
    },
    {
      title: "Compare the monthly bill",
      code: {
        lang: "python",
        file: "compare_cost.py",
        code: `"""Rough monthly compute cost for one small API. Prices are approximate us-east-1 list
prices used for comparison only; always confirm with the AWS/Azure pricing calculators."""
HOURS = 730

def function_cost(req_per_month: float, avg_ms: float = 120, memory_gb: float = 0.25) -> float:
    per_request, per_gb_second = 0.20 / 1e6, 0.0000166667      # Lambda-style pricing
    return req_per_month * per_request + req_per_month * avg_ms / 1000 * memory_gb * per_gb_second

def container_cost(tasks: int = 1, vcpu: float = 0.25, gb: float = 0.5) -> float:
    return tasks * HOURS * (vcpu * 0.04048 + gb * 0.004445)    # Fargate-style pricing

def vm_cost(instances: int = 1, hourly: float = 0.0208) -> float:
    return instances * HOURS * hourly                           # small burstable VM

if __name__ == "__main__":
    print(f"{'requests/month':>15} {'function':>9} {'container':>10} {'vm':>7}")
    for req in (100_000, 1_000_000, 10_000_000, 100_000_000):
        tasks = max(1, round(req / 30_000_000))   # assume one small task handles ~30M req/month
        print(f"{req:>15,} {function_cost(req):9.2f} {container_cost(tasks):10.2f} {vm_cost(tasks):7.2f}")`,
      },
      output: " requests/month  function  container      vm\n        100,000      0.07       9.01   15.18\n      1,000,000      0.70       9.01   15.18\n     10,000,000      7.00       9.01   15.18\n    100,000,000     70.00      27.03   45.55",
      notes: [
        "Functions win by a mile at low or spiky traffic (and free tiers make small workloads nearly free); always-on compute wins at sustained load. The model ignores load balancers, data transfer and free tiers: add them for real decisions.",
      ],
    },
  ],
  companies: [
    "**Mixed estates are normal:** a typical product runs its main API on containers, event handlers (uploads, webhooks, queue consumers, schedules) on functions, and a few VMs for legacy or specialised software.",
    "**Containers as the default unit:** many companies standardise on container images so the same artifact moves through dev, CI and production, and can be moved between platforms or clouds.",
    "**Graviton / Arm instances:** teams commonly move containers and functions to Arm-based compute for better price-performance when their dependencies support it.",
    "**Platform teams** wrap these choices in templates ('golden paths'), so product teams pick 'HTTP API' or 'scheduled job' and get a pre-approved, monitored setup.",
  ],
  mistakes: [
    {
      mistake: "One big VM for everything",
      why: "It feels simple",
      wrong: "A single point of failure, manual patching, paying 24/7 for idle capacity",
      fix: "Pick compute per workload; keep at least two instances across zones for production",
    },
    {
      mistake: "Functions for long or steady workloads",
      why: "'Serverless scales'",
      wrong: "Timeouts on long jobs, high bills under constant traffic, cold starts on every scale-out",
      fix: "Use containers for steady APIs and long-running work",
    },
    {
      mistake: "Creating clients inside the handler",
      why: "Copying a tutorial",
      wrong: "Every invocation pays for new connections; databases run out of connections",
      fix: "Create clients and pools at module scope; reuse them across invocations",
    },
    {
      mistake: "Business logic tangled with the cloud SDK",
      why: "Writing the handler first",
      wrong: "Hard to test and impossible to move",
      fix: "Pure logic module plus thin adapters per platform",
    },
    {
      mistake: "Storing state on the instance",
      why: "Writing files to local disk works in testing",
      wrong: "Data disappears when the platform replaces or scales instances",
      fix: "Use object storage, databases and caches for state",
    },
  ],
  bestPractices: [
    {
      tag: "Cost",
      text: "Match the billing model to the traffic shape: per-request for spiky or low traffic, per-hour for steady load. Re-check the choice when traffic changes.",
    },
    {
      tag: "Reliability",
      text: "Run production services in at least two availability zones, with health checks so the platform replaces unhealthy instances.",
    },
    {
      tag: "Security",
      text: "Give each function or task its own role/identity with least-privilege permissions; never bake credentials into images or code.",
    },
    {
      tag: "Maintainability",
      text: "Keep logic cloud-agnostic and deploy with infrastructure as code so environments are reproducible.",
    },
    {
      tag: "Performance",
      text: "Initialise SDK clients once, keep packages small for faster cold starts, and consider minimum instances for latency-sensitive endpoints.",
    },
  ],
  interview: [
    {
      q: "When would you use serverless functions instead of containers?",
      a: "For event-driven, short-running and spiky workloads: webhooks, file-processing triggers, scheduled jobs, low-traffic APIs. You pay per execution, scale to zero and manage no servers. Containers are better for steady traffic (cheaper per request at sustained load), long-running work, long-lived connections such as WebSockets, or heavy dependencies, and they avoid cold starts and function time limits.",
    },
    {
      q: "What is a cold start and how do you reduce it?",
      a: "The latency when a platform creates a new execution environment: provisioning, loading the runtime and running initialisation code. Reduce it with smaller packages and fewer imports, lazy-loading rarely used modules, initialising clients once at module scope, choosing runtimes with fast startup, more memory (more CPU), and provisioned concurrency or minimum instances for critical paths.",
    },
    {
      q: "Map these AWS services to Azure: EC2, Lambda, ECS Fargate, EKS.",
      a: "EC2 → Azure Virtual Machines (with VM Scale Sets for auto scaling). Lambda → Azure Functions. ECS on Fargate → Azure Container Apps (or App Service for web apps, Container Instances for simple single containers). EKS → AKS. The concepts transfer; the details (limits, pricing, identity integration) differ.",
    },
  ],
  quickCheck: [
    {
      kind: "mcq",
      prompt: "A video transcoding job takes 40 minutes and runs a few times a day. Where should it run?",
      options: [
        "AWS Lambda",
        "A container task (ECS Fargate / Container Apps job) started per video",
        "A VM that runs 24/7",
        "In the browser",
      ],
      answer: 1,
      explanation: "It exceeds Lambda's 15-minute limit, and it is idle most of the day, so an always-on VM wastes money. A container task started per job runs as long as needed and costs nothing when idle.",
    },
    {
      kind: "output",
      prompt: "This Lambda module is invoked three times in the same warm execution environment. What is printed in the logs?",
      code: {
        lang: "python",
        code: `print("init")
count = 0

def handler(event, context):
    global count
    count += 1
    print(f"call {count}")`,
      },
      options: [
        "init call 1 call 2 call 3",
        "init call 1 init call 1 init call 1",
        "call 1 call 2 call 3",
        "init call 1 call 1 call 1",
      ],
      answer: 0,
      explanation: "Module-level code runs once per execution environment (the cold start). The handler runs per invocation and module state survives between warm invocations.",
    },
    {
      kind: "bug",
      prompt: "This function works in testing but the database runs out of connections under load. Why?",
      code: {
        lang: "python",
        code: `import psycopg

def lambda_handler(event, context):
    conn = psycopg.connect(DATABASE_URL)
    rows = conn.execute("SELECT ...").fetchall()
    return {"statusCode": 200, "body": json.dumps(rows)}`,
      },
      options: [
        "psycopg is not supported on Lambda",
        "A new connection per invocation, never closed; hundreds of concurrent environments multiply it",
        "fetchall is too slow",
        "The handler must be async",
      ],
      answer: 1,
      explanation: "Open the connection at module scope (reused while warm), close it properly, and put a connection pooler (RDS Proxy, PgBouncer) in front, because each concurrent environment holds its own connection.",
    },
  ],
  cheatSheet: [
    "VM = EC2 / Azure VM: full control, you patch and scale.",
    "Function = Lambda / Azure Functions: per-request billing, scale to zero, time limits, cold starts.",
    "Containers = ECS Fargate / Container Apps (App Service for web apps); EKS / AKS for Kubernetes.",
    "Spiky, short, event-driven → function. Steady, long, WebSockets → container. Custom OS → VM.",
    "Module scope runs once per environment: create clients there.",
    "Pure logic + thin adapter per platform.",
    "Stateless compute; state in managed storage.",
    "Two+ instances across zones for production.",
    "Practise AWS locally with LocalStack; Azure Functions with Core Tools.",
  ],
  homework: {
    basic: {
      title: "Choose compute for DevAtlas",
      brief: [
        "For each DevAtlas workload (news tagger, nightly digest, live-session WebSocket hub, main API, model fine-tuning), choose VM, function or container and justify it. Encode your rules as a function so the reasoning is explicit and testable.",
      ],
      criteria: [
        "Each workload has a choice and a reason",
        "Rules cover run time, traffic shape, connections and OS needs",
        "Code runs and prints the table",
      ],
      hints: ["Start from the hard limits (OS control, run time), then optimise for cost."],
      solution: {
        text: [
          "Hard constraints first (custom OS → VM; >15 min or WebSockets → container), then cost (spiky or mostly idle → function; steady → container). Real decisions add team skills and existing platform choices.",
        ],
        code: {
          lang: "python",
          file: "choose_compute.py",
          code: `from dataclasses import dataclass


@dataclass
class Workload:
    name: str
    max_run_seconds: float      # longest single job/request
    traffic: str                # "spiky", "steady" or "idle-mostly"
    needs_os_control: bool = False
    long_lived_connections: bool = False


def choose_compute(w: Workload) -> tuple[str, str]:
    if w.needs_os_control:
        return "VM", "custom OS, drivers or licensed software"
    if w.max_run_seconds > 900 or w.long_lived_connections:
        return "container", "long jobs or WebSockets exceed function limits"
    if w.traffic in ("spiky", "idle-mostly"):
        return "function", "pay per request and scale to zero"
    return "container", "steady traffic is cheaper on always-on containers"


for w in [
    Workload("news tagger API", 0.2, "spiky"),
    Workload("nightly digest email", 120, "idle-mostly"),
    Workload("live-session WebSocket hub", 3600, "steady", long_lived_connections=True),
    Workload("main web API", 1, "steady"),
    Workload("GPU model fine-tuning", 7200, "idle-mostly", needs_os_control=True),
]:
    kind, why = choose_compute(w)
    print(f"{w.name:28} -> {kind:9} ({why})")`,
        },
        output: "news tagger API              -> function  (pay per request and scale to zero)\nnightly digest email         -> function  (pay per request and scale to zero)\nlive-session WebSocket hub   -> container (long jobs or WebSockets exceed function limits)\nmain web API                 -> container (steady traffic is cheaper on always-on containers)\nGPU model fine-tuning        -> VM        (custom OS, drivers or licensed software)",
      },
    },
    intermediate: {
      title: "See cold starts happen",
      brief: [
        "Deploy a function that reports whether each invocation was a cold start and how long initialisation took. Invoke it several times on LocalStack and explain the results.",
      ],
      criteria: [
        "Module-level initialisation measured",
        "Cold vs warm invocations distinguished",
        "Explanation of why clients belong at module scope",
      ],
      hints: ["A module-level counter survives between warm invocations."],
      solution: {
        text: [
          "Only the first invocation is cold. Concurrency creates more environments, each with its own cold start, so a traffic spike causes a burst of cold starts. Keep init light and reuse clients.",
        ],
        code: {
          lang: "python",
          file: "cold/handler.py",
          code: `import json
import os
import time

import boto3

# Module scope runs once per execution environment (the cold start), then is reused.
INIT_STARTED = time.perf_counter()
s3 = boto3.client("s3", endpoint_url=os.environ.get("AWS_ENDPOINT_URL"))   # create clients once
INIT_MS = round((time.perf_counter() - INIT_STARTED) * 1000)
invocations = 0


def lambda_handler(event, context):
    global invocations
    invocations += 1
    return {"statusCode": 200, "body": json.dumps({
        "cold_start": invocations == 1,
        "invocation_in_this_environment": invocations,
        "init_ms": INIT_MS,
    })}`,
        },
        output: "{'cold_start': True, 'invocation_in_this_environment': 1}\n{'cold_start': False, 'invocation_in_this_environment': 2}\n{'cold_start': False, 'invocation_in_this_environment': 3}",
      },
    },
    challenge: {
      title: "Find the break-even point",
      brief: [
        "Using the cost model, find the monthly request volume where one always-on container becomes cheaper than functions, and show how function duration changes the answer.",
      ],
      criteria: [
        "Break-even computed numerically",
        "Converted to average requests per second",
        "Sensitivity to duration shown",
      ],
      hints: ["Bisection: if functions are still cheaper at the midpoint, the break-even is higher."],
      solution: {
        text: [
          "With these assumptions the break-even is about 13 million requests a month, roughly 5 requests per second on average. Faster functions push it higher, so optimising duration is also a cost optimisation. Traffic peaks matter too: one container may not handle the peak, which moves the break-even.",
        ],
        code: {
          lang: "python",
          file: "break_even.py",
          code: `from compare_cost import container_cost, function_cost


def break_even(lo: float = 1e3, hi: float = 1e9) -> float:
    """Requests/month where an always-on container becomes cheaper than functions (bisection)."""
    for _ in range(60):
        mid = (lo + hi) / 2
        if function_cost(mid) < container_cost(1):
            lo = mid
        else:
            hi = mid
    return hi


r = break_even()
print(f"break-even ≈ {r:,.0f} requests/month ≈ {r / 30 / 86400:.1f} requests/second on average")
for ms in (50, 120, 500):
    print(f"avg {ms:>3} ms/request: function costs \${function_cost(10_000_000, avg_ms=ms):.2f} at 10M requests")`,
        },
        output: "break-even ≈ 12,871,446 requests/month ≈ 5.0 requests/second on average\navg  50 ms/request: function costs $4.08 at 10M requests\navg 120 ms/request: function costs $7.00 at 10M requests\navg 500 ms/request: function costs $22.83 at 10M requests",
      },
    },
    capstone: {
      title: "DevAtlas: ship the AI service image to AWS or Azure",
      brief: [
        "Write an ECS Fargate task definition for the AI service (health check, logs, secrets from Secrets Manager, Arm64) and one deploy script that builds the image once and deploys it to ECS or Azure Container Apps.",
      ],
      criteria: [
        "Secrets referenced, never inlined",
        "Health check and log configuration",
        "Same image version deployed to either cloud",
        "Script fails fast on errors",
      ],
      hints: ["`jq` can set the image tag in the task definition without editing the file."],
      solution: {
        text: [
          "The task definition separates the **execution role** (pull the image, read secrets, write logs) from the **task role** (what the app itself may call), a least-privilege split you will use in lesson 8.3.1.",
          "Validated locally (JSON and shell syntax, image build); the cloud deploy needs real accounts. Replace the account ids and names with yours.",
        ],
        code: {
          lang: "bash",
          file: "infra/deploy.sh",
          code: `#!/usr/bin/env bash
# Build once, deploy the same image to AWS (ECS Fargate) or Azure (Container Apps).
set -euo pipefail
VERSION="\${1:?usage: deploy.sh <version> aws|azure}"
TARGET="\${2:?usage: deploy.sh <version> aws|azure}"

docker build -t "devatlas-ai:\${VERSION}" services/ai

if [[ "$TARGET" == "aws" ]]; then
  REGISTRY="123456789012.dkr.ecr.eu-west-1.amazonaws.com"
  aws ecr get-login-password --region eu-west-1 | docker login --username AWS --password-stdin "$REGISTRY"
  docker tag "devatlas-ai:\${VERSION}" "\${REGISTRY}/devatlas-ai:\${VERSION}"
  docker push "\${REGISTRY}/devatlas-ai:\${VERSION}"
  jq --arg img "\${REGISTRY}/devatlas-ai:\${VERSION}" '.containerDefinitions[0].image = $img' \\
    infra/taskdef.json > /tmp/taskdef.json            # same file, new image tag
  aws ecs register-task-definition --cli-input-json file:///tmp/taskdef.json
  aws ecs update-service --cluster devatlas --service ai --task-definition devatlas-ai
else
  az acr build --registry devatlasacr --image "devatlas-ai:\${VERSION}" services/ai
  az containerapp update --name devatlas-ai --resource-group devatlas-rg \\
    --image "devatlasacr.azurecr.io/devatlas-ai:\${VERSION}"
fi

# ---- infra/taskdef.json ----
# {
#   "family": "devatlas-ai",
#   "requiresCompatibilities": ["FARGATE"],
#   "networkMode": "awsvpc",
#   "cpu": "512",
#   "memory": "1024",
#   "runtimePlatform": { "cpuArchitecture": "ARM64", "operatingSystemFamily": "LINUX" },
#   "executionRoleArn": "arn:aws:iam::123456789012:role/devatlas-ecs-execution",
#   "taskRoleArn": "arn:aws:iam::123456789012:role/devatlas-ai-task",
#   "containerDefinitions": [
#     {
#       "name": "ai",
#       "image": "123456789012.dkr.ecr.eu-west-1.amazonaws.com/devatlas-ai:1.4.0",
#       "essential": true,
#       "portMappings": [{ "containerPort": 8080, "protocol": "tcp" }],
#       "environment": [{ "name": "DEVATLAS_MODEL", "value": "claude-opus-5-5" }],
#       "secrets": [
#         { "name": "ANTHROPIC_API_KEY",
#           "valueFrom": "arn:aws:secretsmanager:eu-west-1:123456789012:secret:devatlas/anthropic" }
#       ],
#       "healthCheck": {
#         "command": ["CMD-SHELL", "python -c \\"import urllib.request; urllib.request.urlopen('http://localhost:8080/healthz')\\""],
#         "interval": 15, "timeout": 5, "retries": 3, "startPeriod": 20
#       },
#       "logConfiguration": {
#         "logDriver": "awslogs",
#         "options": { "awslogs-group": "/devatlas/ai", "awslogs-region": "eu-west-1", "awslogs-stream-prefix": "ai" }
#       }
#     }
#   ]
# }`,
        },
      },
    },
  },
  deeper: [
    { label: "AWS Lambda developer guide", url: "https://docs.aws.amazon.com/lambda/latest/dg/welcome.html" },
    {
      label: "Azure Functions Python developer guide",
      url: "https://learn.microsoft.com/azure/azure-functions/functions-reference-python",
    },
    {
      label: "Azure Container Apps overview",
      url: "https://learn.microsoft.com/azure/container-apps/overview",
    },
    { label: "LocalStack documentation", url: "https://docs.localstack.cloud/" },
  ],
  nextPreview: "Next: storage and databases in the cloud: S3 and Blob Storage, managed SQL, DynamoDB and Cosmos DB, and how to pick one.",
};
