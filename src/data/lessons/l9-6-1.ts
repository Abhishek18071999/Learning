import type { Lesson } from "../../types";

export const lesson: Lesson = {
  id: "9.6.1",
  title: "Blue-green, canary, SLOs and postmortems",
  minutes: 85,
  level: "Advanced",
  prerequisites: ["9.4.1 Pods, deployments, services and ingress", "9.5.1 Logs, metrics, traces and DevSecOps"],
  summary: "Ship often without breaking users: choose between rolling, blue-green and canary releases, separate deploy from release with feature flags, define SLOs and error budgets, alert on burn rate, automate canary judgement, and learn from incidents with blameless postmortems. Releases were exercised on a Kubernetes API server; alert rules were unit-tested with promtool.",
  terms: [
    {
      term: "SLI / SLO / SLA",
      def: "Indicator (what you measure, e.g. % successful requests), Objective (the target, e.g. 99.9% over 30 days), Agreement (a contractual promise with consequences, usually looser than the SLO).",
    },
    {
      term: "Error budget",
      def: "The amount of failure the SLO allows (100% − SLO). Spending it is fine; overspending means slowing down and fixing reliability.",
    },
    {
      term: "Burn rate",
      def: "How fast you are spending the error budget relative to plan: 1× empties it exactly at the end of the window; 14.4× empties a 30-day budget in about two days.",
    },
    {
      term: "Blue-green deployment",
      def: "Run the new version (green) alongside the old (blue) and switch all traffic at once; switch back to roll back.",
    },
    {
      term: "Canary release",
      def: "Send a small share of traffic to the new version, compare its health with the stable version, then increase or roll back.",
    },
    {
      term: "Feature flag",
      def: "A runtime switch that turns code paths on for chosen users or percentages, separating deploying code from releasing features.",
    },
    {
      term: "MTTR / MTTD",
      def: "Mean time to recover / to detect: how quickly incidents are noticed and fixed.",
    },
    {
      term: "Blameless postmortem",
      def: "A written incident review focused on how the system allowed the failure and how to prevent recurrence, not on who to blame.",
    },
  ],
  problem: [
    "DevAtlas releases on Friday evenings 'when traffic is low'. Release 1.6.0 broke quiz grading for 18% of submissions for 47 minutes, the alert never fired, and the team argued for a week about whether it was 'really that bad' and whose fault it was.",
    "Mature teams release many times a day with less risk, because they limit the blast radius of each change (canaries, flags), detect problems with SLO-based alerts, roll back in minutes, and turn every incident into concrete improvements.",
  ],
  concept: {
    analogy: [
      "Releasing is like changing a recipe in a busy restaurant. **Blue-green** is preparing the full new menu in a second kitchen and switching the pass in one move (and switching back if diners complain). **Canary** is serving the new dish to one table in ten first and watching their faces. **Feature flags** are cooking the new dish every night but only offering it to staff until it is ready. The **error budget** is how many complaints a month you accept before you stop experimenting and fix the kitchen.",
    ],
    precise: [
      "**Rolling update** (Kubernetes default): replace pods gradually. Cheap, but old and new versions run side by side, and rollback is another rollout. **Blue-green:** two full environments, instant switch and rollback, double capacity during the release, and database changes must work with both versions. **Canary:** a small, increasing share of traffic, with automated comparison of canary vs stable metrics; the safest for user-facing services, and it needs good metrics.",
      "**Compatibility is the real requirement:** during any non-instant release, two versions run at once. APIs and database schemas must be backward and forward compatible (expand → migrate → contract) so either version can serve any request.",
      "**Feature flags** decouple deploy from release: ship code dark, enable it for staff, then 1% → 10% → 100% of users, and turn it off instantly without a deploy. Remove old flags, or they become technical debt.",
      "**SLOs and error budgets:** pick SLIs users feel (availability, latency of key journeys), set realistic objectives, and use the budget as a policy: within budget, ship; budget exhausted, prioritise reliability work. Alert on **burn rate** with two windows (fast: 1 h and 5 min at 14.4×; slow: 6 h and 30 min at 6×) so you page for real problems quickly and ignore blips.",
      "**Incidents:** clear roles (incident commander, communications), mitigate first (roll back, flag off), investigate later. Write a blameless postmortem with impact, timeline, contributing factors and owned, dated action items.",
    ],
  },
  underTheHood: {
    text: [
      "Why 14.4×? A 30-day window is 720 hours. Burning 2% of the budget in 1 hour means 0.02 × 720 = 14.4 times the sustainable rate. Requiring both a long window (1 h) and a short window (5 min) above threshold means the alert fires fast for a real outage and resets quickly once it is fixed.",
      "Canary judgement is statistics: a canary with 3 errors in 1,000 requests vs stable with 18 in 9,000 is noise; 15 in 1,000 is a regression. A two-proportion z-test (or tools such as Kayenta, Argo Rollouts analysis, Flagger) makes the call consistently, and a minimum sample size avoids judging too early.",
      "Traffic splitting mechanisms: replica ratios behind one Service (coarse), ingress controller weights (for example ingress-nginx canary annotations), service meshes and Gateway API `HTTPRoute` weights (precise, header-based routing), or cloud load balancer weighted target groups.",
      "Percentage rollouts hash a stable key (user id + flag name) into buckets, so a user's experience is consistent across requests and raising the percentage only adds users.",
    ],
    diagram: {
      title: "A progressive release",
      nodes: [
        { label: "Deploy dark", sub: "flag off" },
        { label: "Canary 10%", sub: "compare to stable" },
        { label: "30% → 50%", sub: "judge each step" },
        { label: "Promote", sub: "100%, remove flag later" },
        { label: "Or roll back", sub: "minutes, automated" },
      ],
      edges: ["", "healthy", "healthy", ""],
    },
  },
  handsOn: [
    {
      title: "Error budgets and burn rates in numbers",
      code: {
        lang: "python",
        file: "slo.py",
        code: `"""SLOs, error budgets and burn rates."""
MINUTES_30D = 30 * 24 * 60

def error_budget_minutes(slo: float) -> float:
    return (1 - slo) * MINUTES_30D

print(f"{'SLO':>8} {'budget/30 days':>16}")
for slo in (0.99, 0.999, 0.9995, 0.9999):
    m = error_budget_minutes(slo)
    print(f"{slo:8.2%} {m:9.1f} min ({m / 60:4.1f} h)")

# Burn rate = observed error rate / allowed error rate.
# 1.0 spends the budget exactly over 30 days; 14.4 spends 2% of it in one hour.
slo = 0.999
for observed in (0.0005, 0.001, 0.0144, 0.05):
    burn = observed / (1 - slo)
    hours_to_empty = 30 * 24 / burn
    print(f"error rate {observed:6.2%} -> burn rate {burn:5.1f}x, budget gone in {hours_to_empty:7.1f} h")`,
      },
      output: "     SLO   budget/30 days\n  99.00%     432.0 min ( 7.2 h)\n  99.90%      43.2 min ( 0.7 h)\n  99.95%      21.6 min ( 0.4 h)\n  99.99%       4.3 min ( 0.1 h)\nerror rate  0.05% -> burn rate   0.5x, budget gone in  1440.0 h\nerror rate  0.10% -> burn rate   1.0x, budget gone in   720.0 h\nerror rate  1.44% -> burn rate  14.4x, budget gone in    50.0 h\nerror rate  5.00% -> burn rate  50.0x, budget gone in    14.4 h",
      notes: [
        "Each extra nine costs a lot of engineering and allows 10× less failure. 99.99% gives you about 4 minutes a month: less than one slow rollback. Pick SLOs from what users need, not what sounds impressive.",
      ],
    },
    {
      title: "Blue-green on Kubernetes",
      code: {
        lang: "yaml",
        file: "blue-green.yaml",
        code: `# Two complete copies of the API. The Service decides which one gets traffic.
apiVersion: apps/v1
kind: Deployment
metadata: { name: api-blue, namespace: release }
spec:
  replicas: 3
  selector: { matchLabels: { app: api, slot: blue } }
  template:
    metadata: { labels: { app: api, slot: blue, version: "1.5.0" } }
    spec:
      containers: [{ name: api, image: "ghcr.io/devatlas/api:1.5.0" }]
---
apiVersion: apps/v1
kind: Deployment
metadata: { name: api-green, namespace: release }
spec:
  replicas: 3
  selector: { matchLabels: { app: api, slot: green } }
  template:
    metadata: { labels: { app: api, slot: green, version: "1.6.0" } }
    spec:
      containers: [{ name: api, image: "ghcr.io/devatlas/api:1.6.0" }]
---
apiVersion: v1
kind: Service
metadata: { name: api, namespace: release }
spec:
  selector: { app: api, slot: blue }       # live = blue
  ports: [{ port: 80, targetPort: 8000 }]`,
      },
    },
    {
      title: "Switch traffic only when the target is ready",
      code: {
        lang: "bash",
        file: "switch.sh",
        code: `#!/usr/bin/env bash
# Usage: switch.sh blue|green   - point the live Service at a slot, after a smoke test.
set -euo pipefail
NS=release; TARGET="$1"
kubectl -n "$NS" rollout status "deploy/api-$TARGET" --timeout=120s
ready=$(kubectl -n "$NS" get deploy "api-$TARGET" -o jsonpath='{.status.readyReplicas}')
[[ "\${ready:-0}" -ge 3 ]] || { echo "api-$TARGET has only \${ready:-0} ready pods; not switching" >&2; exit 1; }
kubectl -n "$NS" patch service api -p "{\\"spec\\":{\\"selector\\":{\\"app\\":\\"api\\",\\"slot\\":\\"$TARGET\\"}}}"
echo "live slot: $TARGET"`,
      },
      output: "before: 1.5.0 1.5.0 1.5.0\nservice/api patched\nlive slot: green\nafter:  1.6.0 1.6.0 1.6.0\nlive slot: blue\nrolled back: 1.5.0 1.5.0 1.5.0\n\n# with only 2 of 3 green pods ready:\napi-green has only 2 ready pods; not switching",
      notes: [
        "The switch is one Service selector change, so rollback is one more. Keep blue running until green has proven itself, then scale blue down. Database migrations must be compatible with both colours.",
      ],
    },
    {
      title: "A canary by replica ratio",
      code: {
        lang: "yaml",
        file: "canary.yaml",
        code: `# Simplest canary: stable and canary pods share the Service's selector (app: api),
# so traffic splits roughly by pod count: 9 stable + 1 canary = ~10% canary.
apiVersion: apps/v1
kind: Deployment
metadata: { name: api-stable, namespace: canary }
spec:
  replicas: 9
  selector: { matchLabels: { app: api, track: stable } }
  template:
    metadata: { labels: { app: api, track: stable, version: "1.5.0" } }
    spec:
      containers: [{ name: api, image: "ghcr.io/devatlas/api:1.5.0" }]
---
apiVersion: apps/v1
kind: Deployment
metadata: { name: api-canary, namespace: canary }
spec:
  replicas: 1
  selector: { matchLabels: { app: api, track: canary } }
  template:
    metadata: { labels: { app: api, track: canary, version: "1.6.0" } }
    spec:
      containers: [{ name: api, image: "ghcr.io/devatlas/api:1.6.0" }]
---
apiVersion: v1
kind: Service
metadata: { name: api, namespace: canary }
spec:
  selector: { app: api }                    # both tracks
  ports: [{ port: 80, targetPort: 8000 }]`,
      },
      output: "# versions behind the Service's endpoints:\n      9 1.5.0\n      1 1.6.0",
      notes: [
        "Coarse but dependency-free. For precise percentages or header-based routing (send only staff to the canary), use ingress weights, the Gateway API or a progressive-delivery controller such as Argo Rollouts or Flagger.",
      ],
    },
    {
      title: "Judge the canary with statistics",
      code: {
        lang: "python",
        file: "canary_judge.py",
        code: `"""Decide whether a canary is healthy enough to promote: compare its error rate with the
stable version using a two-proportion z-test, and require a minimum sample size."""
import math


def judge(stable_req: int, stable_err: int, canary_req: int, canary_err: int,
          min_requests: int = 500, z_threshold: float = 2.33) -> str:
    if canary_req < min_requests:
        return f"WAIT: only {canary_req} canary requests (need {min_requests})"
    p1, p2 = stable_err / stable_req, canary_err / canary_req
    pooled = (stable_err + canary_err) / (stable_req + canary_req)
    se = math.sqrt(pooled * (1 - pooled) * (1 / stable_req + 1 / canary_req)) or 1e-12
    z = (p2 - p1) / se                      # how many standard errors worse is the canary?
    verdict = "ROLLBACK" if z > z_threshold else "PROMOTE"
    return f"{verdict}: stable {p1:.2%} vs canary {p2:.2%} errors (z = {z:.2f})"


if __name__ == "__main__":
    print(judge(9_000, 18, 300, 2))      # too early to tell
    print(judge(9_000, 18, 1_000, 3))    # 0.30% vs 0.20%: noise
    print(judge(9_000, 18, 1_000, 15))   # 1.50% vs 0.20%: real regression`,
      },
      output: "WAIT: only 300 canary requests (need 500)\nPROMOTE: stable 0.20% vs canary 0.30% errors (z = 0.66)\nROLLBACK: stable 0.20% vs canary 1.50% errors (z = 6.80)",
      notes: [
        "Comparing raw percentages would roll back the second case (0.30% looks worse than 0.20%) even though the difference is noise. Compare latency percentiles the same way in production.",
      ],
    },
  ],
  companies: [
    "**Continuous deployment with guardrails:** large web companies deploy hundreds of times a day using automated canaries that compare dozens of metrics and roll back without a human.",
    "**Feature flag platforms** (LaunchDarkly, Unleash, Flagsmith, OpenFeature-compatible tools, or home-grown systems) are standard for risky features, experiments and kill switches.",
    "**Error budget policies:** SRE teams agree with product teams in advance that exhausting the budget freezes risky launches until reliability work brings the service back within its SLO, which turns reliability arguments into data.",
    "**Postmortem culture:** companies publish internal (and sometimes public) postmortems, track action items like any other work, and review recurring themes quarterly.",
  ],
  mistakes: [
    {
      mistake: "Breaking API or schema changes in one release",
      why: "The new code and new schema work together",
      wrong: "During rollout, old and new versions break each other",
      fix: "Expand → migrate → contract; stay compatible for at least one release",
    },
    {
      mistake: "Fixed-threshold alerts on error rate",
      why: "Simple to write",
      wrong: "Slow leaks never alert; brief spikes page people at night",
      fix: "Multi-window burn-rate alerts tied to the SLO",
    },
    {
      mistake: "Judging canaries by eye or too early",
      why: "Impatience",
      wrong: "Noise causes false rollbacks; real regressions slip through",
      fix: "Minimum sample sizes and statistical comparison against stable",
    },
    {
      mistake: "100% SLO targets",
      why: "Users deserve perfection",
      wrong: "No room for releases or maintenance; impossible to meet; ignored",
      fix: "A realistic SLO from user needs; spend the budget deliberately",
    },
    {
      mistake: "Blame in postmortems",
      why: "Someone 'pushed the button'",
      wrong: "People hide mistakes; the system stays fragile",
      fix: "Ask how the system allowed it; fix guardrails, not people",
    },
    {
      mistake: "Feature flags that live forever",
      why: "Removing them feels optional",
      wrong: "Combinatorial code paths, surprises when old flags flip",
      fix: "Owner and expiry date per flag; remove after full rollout",
    },
  ],
  bestPractices: [
    {
      tag: "Reliability",
      text: "Canary every user-facing release with automated judgement and rollback; keep rollback under 10 minutes and practise it.",
    },
    {
      tag: "Maintainability",
      text: "Write SLOs, alert rules and runbooks as code next to the service; unit-test alert rules.",
    },
    {
      tag: "Security",
      text: "Treat flag and traffic-routing systems as production infrastructure: access control, audit logs and change review.",
    },
    {
      tag: "Performance",
      text: "Include latency SLIs (p95/p99 of key journeys), not only availability; canary judgement must compare latency too.",
    },
    {
      tag: "Cost",
      text: "Blue-green doubles capacity during releases; canaries and flags limit cost and blast radius together.",
    },
  ],
  interview: [
    {
      q: "Compare rolling, blue-green and canary deployments.",
      a: "Rolling replaces instances gradually: cheap and default, but mixed versions and slower rollback. Blue-green runs two full environments and switches traffic at once: instant rollback and clean cutover, but double capacity and every-request-at-once exposure. Canary shifts a small, growing share of traffic and compares health against stable: smallest blast radius and data-driven promotion, but needs good metrics and traffic splitting. All require backward-compatible APIs and schemas.",
    },
    {
      q: "What are SLOs and error budgets, and how do they change team behaviour?",
      a: "An SLO is a target for a user-facing indicator over a window, such as 99.9% successful requests over 30 days; the error budget is the allowed failure, 0.1%. Teams alert on budget burn rate rather than raw thresholds, and use the budget as a policy: while there is budget, ship features and take calculated risks; when it is spent, prioritise reliability. It turns reliability-versus-velocity debates into an agreed, measurable trade-off.",
    },
    {
      q: "Walk me through how you handle a production incident.",
      a: "Acknowledge and declare it, assign an incident commander, communicate status early. Mitigate first: roll back the recent change, disable a flag, scale, or fail over, before diagnosing deeply. Use dashboards, traces and logs to confirm recovery. Afterwards write a blameless postmortem: impact, timeline, root causes and contributing factors, what went well, and owned, dated action items that improve detection, prevention and recovery.",
    },
  ],
  quickCheck: [
    {
      kind: "mcq",
      prompt: "Your 99.9% SLO's monthly budget is 43 minutes. On day 10 you have used 40 minutes. According to an error budget policy, what should happen?",
      options: [
        "Nothing until the SLA is breached",
        "Freeze risky releases and prioritise reliability work until the budget recovers",
        "Lower the SLO to 99%",
        "Release faster to recover",
      ],
      answer: 1,
      explanation: "The budget is nearly spent with 20 days left. The pre-agreed policy shifts focus to reliability: fix causes, add tests and alerts, and ship only low-risk changes.",
    },
    {
      kind: "output",
      prompt: "With a 99.9% SLO, what burn rate does a 2% error rate represent?",
      code: {
        lang: "python",
        code: `slo, observed = 0.999, 0.02
print(round(observed / (1 - slo), 1))`,
      },
      options: ["2.0", "14.4", "20.0", "0.02"],
      answer: 2,
      explanation: "Allowed error rate is 0.1%; 2% is 20 times that. A 30-day budget would be gone in 36 hours: well above the 14.4× fast-burn page threshold.",
    },
    {
      kind: "bug",
      prompt: "Release 1.6.0 renamed a JSON field from `answers` to `responses`. During the rolling update, 20% of quiz submissions fail. What is the root problem?",
      options: [
        "The rollout was too slow",
        "The change was not backward compatible while two versions ran side by side",
        "Kubernetes lost requests",
        "The database was too small",
      ],
      answer: 1,
      explanation: "Accept both field names (expand), migrate clients, then remove the old name later (contract). Any gradual rollout, canary or rolling, exposes incompatibilities between versions.",
    },
  ],
  cheatSheet: [
    "SLI = what you measure; SLO = target; SLA = contract. Error budget = 1 − SLO.",
    "99.9% ≈ 43 min/month; 99.99% ≈ 4.3 min/month.",
    "Burn rate = observed error rate / (1 − SLO). Page: 14.4× (1 h & 5 min). Ticket: 6× (6 h & 30 min).",
    "Rolling (default) · Blue-green (instant switch) · Canary (small share, judged).",
    "Two versions always overlap: expand → migrate → contract.",
    "Judge canaries statistically with minimum samples; automate rollback.",
    "Feature flags: deploy dark, release by percentage, kill switch, then delete the flag.",
    "Incident: mitigate first (rollback/flag off), then investigate. Blameless postmortem with owned actions.",
  ],
  homework: {
    basic: {
      title: "Write a blameless postmortem",
      brief: [
        "Using the scenario in this lesson (1.6.0 broke 18% of quiz submissions for 47 minutes), write a postmortem with summary, impact (including error budget), timeline, contributing factors, what went well, and action items with owners and dates.",
      ],
      criteria: [
        "No blame language",
        "Impact quantified, including budget",
        "Contributing factors, not a single 'root cause'",
        "Specific, owned, dated actions",
      ],
      hints: ["Ask 'how did the system allow this?' at every step of the timeline."],
      solution: {
        text: [
          "Good postmortems are short, factual and actionable. Each action item must make detection faster, prevention more likely or recovery quicker, and must be tracked like any other work.",
        ],
        code: {
          lang: "markdown",
          file: "postmortems/2026-10-14-quiz-grading.md",
          code: `# Postmortem: quiz grading failures, 2026-10-14

**Status:** complete · **Severity:** SEV-2 · **Authors:** on-call + quiz team · **Blameless**

## Summary
For 47 minutes, 18% of quiz submissions failed with HTTP 500. Release 1.6.0 changed the
answer schema; pods running 1.5.0 and 1.6.0 disagreed during the rollout. No data was lost;
1,240 submissions were retried successfully by students.

## Impact
- 47 min of degraded grading (14:02-14:49 UTC); ~2,900 failed requests
- Error budget: 61% of October's 43 min budget consumed (99.9% SLO)

## Timeline (UTC)
- 14:00 1.6.0 rollout starts (rolling update, 10% steps)
- 14:02 5xx rate rises to 4%; no alert (threshold was 5% for 15 min)
- 14:21 Student reports on Discord; on-call acknowledges
- 14:33 Trace shows 1.6.0 pods rejecting payloads from 1.5.0 frontends
- 14:41 \`kubectl rollout undo\`; errors fall
- 14:49 Error rate back to baseline

## Root causes and contributing factors
1. A breaking API change shipped without backward compatibility (old and new versions run side by side during every rollout).
2. Alerting on a fixed 5% threshold missed a sustained 4% failure rate; no burn-rate alert.
3. The canary step was skipped for "small" changes.

## What went well
- Rollback took 8 minutes once diagnosed; traces pinpointed the version mismatch.

## Action items
| Action | Owner | Due |
|---|---|---|
| Add multi-window burn-rate alerts for the API SLO | platform | 10-21 |
| Contract tests: new API must accept previous payload versions | quiz team | 10-24 |
| Canary required for every release; automated judge in pipeline | platform | 10-31 |
| Runbook: "errors during rollout" with the rollback command | on-call | 10-18 |`,
        },
      },
    },
    intermediate: {
      title: "Burn-rate alerts with tests",
      brief: [
        "Write Prometheus recording rules for error ratios over 5m, 30m, 1h and 6h, and two burn-rate alerts (fast page, slow ticket) for a 99.9% SLO. Unit-test that a 5% outage pages within 15 minutes and that steady 0.1% errors never alert.",
      ],
      criteria: ["Recording rules for each window", "Two multi-window alerts", "promtool check and tests pass"],
      hints: ["Recording rules keep alert expressions short and cheap to evaluate."],
      solution: {
        text: [
          "The 'background noise' test is as important as the outage test: it proves the alert will not wake anyone for normal, on-budget error levels. Verified: `SUCCESS: 6 rules found` and the tests pass.",
        ],
        code: {
          lang: "yaml",
          file: "slo_alerts.yml",
          code: `# SLO: 99.9% of API requests succeed over 30 days (error budget 0.1%).
groups:
  - name: api-slo
    rules:
      - record: slo:error_ratio:rate5m
        expr: sum(rate(http_requests_total{status=~"5.."}[5m])) / sum(rate(http_requests_total[5m]))
      - record: slo:error_ratio:rate1h
        expr: sum(rate(http_requests_total{status=~"5.."}[1h])) / sum(rate(http_requests_total[1h]))
      - record: slo:error_ratio:rate30m
        expr: sum(rate(http_requests_total{status=~"5.."}[30m])) / sum(rate(http_requests_total[30m]))
      - record: slo:error_ratio:rate6h
        expr: sum(rate(http_requests_total{status=~"5.."}[6h])) / sum(rate(http_requests_total[6h]))

      # Fast burn: 14.4x budget (2% of the monthly budget in 1 hour). Page someone.
      - alert: ErrorBudgetFastBurn
        expr: slo:error_ratio:rate1h > 14.4 * 0.001 and slo:error_ratio:rate5m > 14.4 * 0.001
        labels: { severity: page }
        annotations: { summary: "API burning error budget 14x too fast" }

      # Slow burn: 6x budget (5% of the budget in 6 hours). Open a ticket.
      - alert: ErrorBudgetSlowBurn
        expr: slo:error_ratio:rate6h > 6 * 0.001 and slo:error_ratio:rate30m > 6 * 0.001
        labels: { severity: ticket }
        annotations: { summary: "API burning error budget 6x too fast" }

# ---- slo_alerts_test.yml (promtool test rules) ----
# rule_files: [slo_alerts.yml]
# evaluation_interval: 1m
# tests:
#   - name: outage pages within minutes
#     interval: 1m
#     input_series:
#       - series: 'http_requests_total{status="200"}'
#         values: '0+950x90'
#       - series: 'http_requests_total{status="500"}'
#         values: '0+0x30 0+50x60'          # healthy for 30 min, then 5% errors
#     alert_rule_test:
#       - eval_time: 29m
#         alertname: ErrorBudgetFastBurn
#         exp_alerts: []
#       - eval_time: 45m
#         alertname: ErrorBudgetFastBurn
#         exp_alerts:
#           - exp_labels: { severity: page }
#             exp_annotations: { summary: "API burning error budget 14x too fast" }
#   - name: background noise never pages
#     interval: 1m
#     input_series:
#       - series: 'http_requests_total{status="200"}'
#         values: '0+999x120'
#       - series: 'http_requests_total{status="500"}'
#         values: '0+1x120'                 # 0.1% errors = exactly on budget
#     alert_rule_test:
#       - eval_time: 120m
#         alertname: ErrorBudgetFastBurn
#         exp_alerts: []
#       - eval_time: 120m
#         alertname: ErrorBudgetSlowBurn
#         exp_alerts: []`,
        },
        output: "$ promtool check rules slo_alerts.yml\n  SUCCESS: 6 rules found\n$ promtool test rules slo_alerts_test.yml\n  SUCCESS",
      },
    },
    challenge: {
      title: "Percentage rollouts with feature flags",
      brief: [
        "Implement deterministic percentage rollouts: each user lands in a stable bucket per flag, raising the percentage only adds users, and an allow-list (staff) always gets the feature. Check the distribution on 20,000 users.",
      ],
      criteria: [
        "Stable assignment per user and flag",
        "Monotonic: 10% users are a subset of 50% users",
        "Allow-list override",
        "Distribution close to the target",
      ],
      hints: ["Hash `flag:user_id`, so different flags get independent buckets."],
      solution: {
        text: [
          "Including the flag name in the hash prevents the same 1% of users from being the guinea pigs for every experiment. In production use an OpenFeature-compatible flag service so flags change without deploys and every change is audited.",
        ],
        code: {
          lang: "python",
          file: "flags.py",
          code: `"""Percentage rollouts with feature flags: deploy dark, then release to 1% -> 10% -> 100%."""
import hashlib


def bucket(flag: str, user_id: str) -> float:
    """Stable number in [0, 100) per user and flag: the same user always gets the same answer."""
    h = hashlib.sha256(f"{flag}:{user_id}".encode()).hexdigest()
    return int(h[:8], 16) % 10_000 / 100


def enabled(flag: str, user_id: str, percent: float, allow: frozenset = frozenset()) -> bool:
    return user_id in allow or bucket(flag, user_id) < percent


users = [f"u{i}" for i in range(20_000)]
for pct in (1, 10, 50):
    on = sum(enabled("new-quiz-engine", u, pct) for u in users)
    print(f"{pct:>3}% rollout -> {on / len(users):6.2%} of users")

# Raising the percentage only ADDS users; nobody flips back and forth.
at10 = {u for u in users if enabled("new-quiz-engine", u, 10)}
at50 = {u for u in users if enabled("new-quiz-engine", u, 50)}
print("everyone from 10% still enabled at 50%:", at10 <= at50)
print("staff always on:", enabled("new-quiz-engine", "staff-ana", 0, allow=frozenset({"staff-ana"})))`,
        },
        output: "  1% rollout ->  1.08% of users\n 10% rollout ->  9.72% of users\n 50% rollout -> 49.70% of users\neveryone from 10% still enabled at 50%: True\nstaff always on: True",
      },
    },
    capstone: {
      title: "DevAtlas: an automated canary release",
      brief: [
        "Write a release controller that sets the canary image, steps traffic through 10%, 30% and 50% by replica ratio, judges each step against stable, and either promotes the image to stable or rolls back. Run it once with a healthy release and once with a bad one.",
      ],
      criteria: [
        "Each step waits for rollout and judges metrics",
        "WAIT and ROLLBACK both stop promotion",
        "Promotion updates stable and returns the canary to 0",
        "Exit code reflects the outcome for CI",
      ],
      hints: [
        "Make the metrics source a function so tests can inject data and production can query Prometheus by a `track` label.",
      ],
      solution: {
        text: [
          "Verified on the Kubernetes test cluster with injected metrics. Production versions of this exist as Argo Rollouts (AnalysisTemplates) and Flagger; writing one yourself shows exactly what they automate.",
        ],
        code: {
          lang: "python",
          file: "release.py",
          code: `"""Progressive canary release for DevAtlas: 10% -> 30% -> 50% -> promote, or roll back.
Usage: python release.py <namespace> <new-image>   (metrics source is pluggable)"""
import json
import subprocess
import sys

from canary_judge import judge

STEPS = [1, 3, 5]                 # canary replicas out of 10 total = 10%, 30%, 50%


def kubectl(*args: str) -> str:
    return subprocess.run(["kubectl", *args], check=True, capture_output=True, text=True).stdout


def set_split(ns: str, canary: int) -> None:
    kubectl("-n", ns, "scale", "deploy/api-canary", f"--replicas={canary}")
    kubectl("-n", ns, "scale", "deploy/api-stable", f"--replicas={10 - canary}")
    for d in ("api-canary", "api-stable"):
        kubectl("-n", ns, "rollout", "status", f"deploy/{d}", "--timeout=120s")


def release(ns: str, image: str, metrics) -> bool:
    kubectl("-n", ns, "set", "image", "deploy/api-canary", f"api={image}")
    for step in STEPS:
        set_split(ns, step)
        verdict = judge(**metrics(step))          # in production: query Prometheus by track label
        print(f"canary {step * 10}%: {verdict}")
        if not verdict.startswith("PROMOTE"):     # ROLLBACK, or WAIT: never promote without evidence
            set_split(ns, 0)
            print("rolled back: all traffic on stable")
            return False
    kubectl("-n", ns, "set", "image", "deploy/api-stable", f"api={image}")   # promote
    set_split(ns, 0)
    print(f"promoted {image} to stable")
    return True


if __name__ == "__main__":
    # Demo metrics: a healthy release, or one whose errors rise with traffic (set BAD=1).
    import os
    bad = os.environ.get("BAD") == "1"
    fake = lambda step: dict(stable_req=9_000, stable_err=18, canary_req=1_000 * step,
                             canary_err=(30 * step if bad else 2 * step))
    ok = release(sys.argv[1], sys.argv[2], fake)
    images = json.loads(kubectl("-n", sys.argv[1], "get", "deploy", "-o", "json"))
    for d in images["items"]:
        print(d["metadata"]["name"], d["spec"]["replicas"], d["spec"]["template"]["spec"]["containers"][0]["image"])
    sys.exit(0 if ok else 1)`,
        },
        output: "$ BAD=1 python release.py canary ghcr.io/devatlas/api:1.6.0-bad\ncanary 10%: ROLLBACK: stable 0.20% vs canary 3.00% errors (z = 12.15)\nrolled back: all traffic on stable\napi-canary 0 ghcr.io/devatlas/api:1.6.0-bad\napi-stable 10 ghcr.io/devatlas/api:1.5.0\n(exit 1)\n\n$ python release.py canary ghcr.io/devatlas/api:1.6.0\ncanary 10%: PROMOTE: stable 0.20% vs canary 0.20% errors (z = 0.00)\ncanary 30%: PROMOTE: ...\ncanary 50%: PROMOTE: ...\npromoted ghcr.io/devatlas/api:1.6.0 to stable\napi-canary 0 ghcr.io/devatlas/api:1.6.0\napi-stable 10 ghcr.io/devatlas/api:1.6.0\n(exit 0)",
      },
    },
  },
  deeper: [
    { label: "Google SRE Workbook: Alerting on SLOs", url: "https://sre.google/workbook/alerting-on-slos/" },
    { label: "Google SRE Book: Postmortem culture", url: "https://sre.google/sre-book/postmortem-culture/" },
    { label: "Argo Rollouts documentation", url: "https://argoproj.github.io/argo-rollouts/" },
    { label: "OpenFeature (feature flag standard)", url: "https://openfeature.dev/" },
  ],
  nextPreview: "Next: Phase 10, your career. You will turn DevAtlas into a portfolio, a resume and a GitHub profile that show impact, not just tasks.",
};
