import type { Lesson } from "../../types";

export const lesson: Lesson = {
  id: "9.10.2",
  title: "AIOps: anomaly detection, incident copilots and where AI fails",
  minutes: 70,
  level: "Advanced",
  prerequisites: ["9.10.1 LLM-assisted DevOps: code review, pipeline debugging, infra and K8s"],
  summary: "Apply AI to operations the right way: a robust anomaly detector (median absolute deviation), alert-storm correlation, incident summarisation, and an on-call copilot — while knowing exactly where the models fail, from seasonality to cold starts.",
  terms: [
    { term: "AIOps", def: "Applying machine learning to operations data — anomaly detection, alert correlation, incident summarisation and root-cause suggestions." },
    { term: "Anomaly detection", def: "Flagging metric values that deviate from the learned baseline, rather than a fixed threshold." },
    { term: "Median absolute deviation (MAD)", def: "A robust dispersion measure that, unlike the standard deviation, is not inflated by the very outlier you are trying to catch." },
    { term: "Alert correlation", def: "Grouping many related alerts (a 5xx spike plus latency plus pool exhaustion) into one incident." },
    { term: "On-call copilot", def: "An assistant that summarises an incident and suggests runbooks, with deterministic rules first and a model for the long tail." },
    { term: "Cold start / seasonality", def: "The two classic AIOps failures: no history to learn from, and a predictable daily/weekly pattern the model mistakes for an anomaly." },
  ],
  problem: [
    "At 3 am the pager fires twenty alerts — a 5xx spike, latency, pool exhaustion, Redis timeouts — that are really one incident. The on-call engineer has to read all twenty and manually stitch together the story. Meanwhile a 'CPU at 95%' alert fires every day at the same time because the model never learned the daily peak is normal.",
    "AIOps promises to fix this: detect real anomalies, correlate the storm into one incident, and summarise it. The catch is knowing where it works — and where a naive model cries wolf.",
  ],
  concept: {
    analogy: [
      "An anomaly detector is a **night guard who learns the rhythm of the building**: footsteps at 3 am are alarming, footsteps at 9 am are the office opening. A static threshold is a guard who calls the police any time more than 80 people enter, including every morning rush. The guard fails in two ways: a brand-new building with no rhythm learned, and a rhythm that changes with the day.",
    ],
    precise: [
      "**Static thresholds break.** A fixed 'CPU > 80%' ignores that some services peak daily. Dynamic baselines learn the normal range and flag only genuine deviations.",
      "**MAD beats z-score for outliers.** The median absolute deviation uses the median, which the outlier barely moves, so one huge spike does not inflate the 'normal' spread and hide itself. z-score's standard deviation is exactly the victim of that inflation.",
      "**Correlation turns twenty alerts into one incident.** Group alerts by source or a common root (the API 5xx spike and the DB pool exhaustion are the same story), and page once.",
      "**An on-call copilot is rules first, model second.** Deterministic runbook lookups for the known symptoms, a model only for the long tail. The summary is a starting point, never a decision.",
      "**AIOps fails on cold starts and seasonality.** A new service has no baseline; a daily/weekly pattern looks like an anomaly to a model that has not learned the season. That is why the engineer stays in the loop.",
    ],
  },
  underTheHood: {
    text: [
      "Anomaly detection is really 'how far is this point from the normal distribution, measured in a robust way'. The median is the robust centre; the median absolute deviation is the robust spread. A point is anomalous when it is many MADs from the median — robust to the outlier because the outlier does not move the median much.",
      "Alert correlation is a grouping problem: cluster alerts by source, time window or a shared signal. A 5xx spike, p99 latency and pool exhaustion within the same minute are one incident, not three pages.",
      "Incident summarisation is the LLM pattern from lesson 9.10.1: feed the timeline, get a short summary. It is fast and useful, but it is a draft — the on-call engineer confirms it against the actual data before acting.",
    ],
    diagram: {
      title: "From alerts to one incident",
      nodes: [
        { label: "Alert storm", sub: "20 alerts" },
        { label: "Correlate", sub: "group by source" },
        { label: "Anomaly?", sub: "MAD vs baseline" },
        { label: "Summarise", sub: "one incident" },
        { label: "Engineer", sub: "confirms + acts" },
      ],
      edges: ["groups", "filters", "drafts", "stays in loop"],
    },
  },
  handsOn: [
    {
      title: "A robust anomaly detector",
      text: [
        "Median absolute deviation flags the spike without the outlier inflating the baseline — the flaw z-score has.",
      ],
      code: {
        lang: "python",
        file: "anomaly_mad.py",
        code: `"""Median absolute deviation: more robust than z-score against outliers."""
def mad(values):
    m = sorted(values)[len(values) // 2]
    med = sorted(abs(x - m) for x in values)[len(values) // 2]
    return m, med


vals = [120, 118, 121, 119, 122, 120, 480, 121, 119]
median, mad_val = mad(vals)
for i, x in enumerate(vals):
    score = abs(x - median) / (mad_val + 1e-9)
    flag = " <-- anomaly" if score > 5 else ""
    print(f"t={i:02d} value={x:4d} score={score:5.1f}{flag}")`,
      },
      output: "t=00 value= 120 score=  0.0\nt=01 value= 118 score=  2.0\nt=02 value= 121 score=  1.0\nt=03 value= 119 score=  1.0\nt=04 value= 122 score=  2.0\nt=05 value= 120 score=  0.0\nt=06 value= 480 score=360.0 <-- anomaly\nt=07 value= 121 score=  1.0\nt=08 value= 119 score=  1.0",
      notes: [
        "The median barely moves when 480 arrives, so the spike stands 360 MADs out — z-score would have inflated the standard deviation and hidden it. That is the whole argument for robust statistics in AIOps.",
      ],
    },
    {
      title: "Correlate an alert storm",
      text: [
        "Twenty alerts that are one incident: group them by source so the on-call engineer pages once, not twenty times.",
      ],
      code: {
        lang: "python",
        file: "alert_noise.py",
        code: `"""Correlate an alert storm into one incident."""
alerts = [
    ("api", "5xx spike"),
    ("api", "latency p99 > 2s"),
    ("db", "connection pool exhausted"),
    ("redis", "timeouts"),
]


def group(alerts):
    by_source = {}
    for source, text in alerts:
        by_source.setdefault(source, []).append(text)
    return by_source


for source, texts in group(alerts).items():
    print(f"{source}: {'; '.join(texts)}")`,
      },
      output: "api: 5xx spike; latency p99 > 2s\ndb: connection pool exhausted\nredis: timeouts",
      notes: [
        "Grouped by source, the storm collapses into 'the API is failing and taking the DB and Redis with it' — one page with the full picture instead of four partial ones.",
      ],
    },
    {
      title: "Summarise an incident timeline",
      text: [
        "An on-call copilot's first job: turn a raw event timeline into one sentence the engineer can act on.",
      ],
      code: {
        lang: "python",
        file: "incident_summary.py",
        code: `"""Auto-summarise an incident timeline."""
events = [
    ("10:01", "deploy v1.4.2"),
    ("10:03", "error rate 0.2% -> 4%"),
    ("10:05", "rollback started"),
    ("10:08", "error rate back to baseline"),
]


def summary(events):
    first, last = events[0], events[-1]
    return f"incident {first[0]}-{last[0]}: {last[1]} (triggered by {first[1]})"


print(summary(events))`,
      },
      output: "incident 10:01-10:08: error rate back to baseline (triggered by deploy v1.4.2)",
      notes: [
        "The summary names the trigger (the deploy) and the outcome (recovered). It is a draft for the postmortem, not the postmortem itself.",
      ],
    },
  ],
  companies: [
    "**Datadog Watchdog and Dynatrace Davis** learn baselines and surface anomalies and root-cause hints, cutting the time to notice a regression.",
    "**PagerDuty and incident.io** correlate alerts and summarise incidents, so the on-call engineer starts from a narrative instead of a storm.",
    "**K8sGPT** reads a cluster's status and events and turns a failure into a plain-language diagnosis — the anomaly-detection analogue for Kubernetes.",
    "**SRE teams** pair these tools with hard rules: the model suggests, the runbook and the engineer decide.",
  ],
  mistakes: [
    {
      mistake: "A static threshold on a seasonal metric",
      why: "One number is easy to configure",
      wrong: "A false alert every day at the daily peak, and alert fatigue follows",
      fix: "Use a dynamic baseline that learns the daily/weekly rhythm",
    },
    {
      mistake: "Using z-score where one big spike matters",
      why: "z-score is the textbook default",
      wrong: "The spike inflates the standard deviation and hides itself",
      fix: "Use a robust spread like the median absolute deviation",
    },
    {
      mistake: "Trusting the anomaly alert as the incident",
      why: "The model flagged it, so it must be real",
      wrong: "A seasonal bump or a cold-start artefact triggers a wild goose chase",
      fix: "Treat the alert as a signal to investigate, confirmed against logs and traces",
    },
    {
      mistake: "No baseline history on a new service",
      why: "Turned on AIOps day one",
      wrong: "The model has nothing to learn from and flags everything",
      fix: "Collect history first, and use simple thresholds until a baseline exists",
    },
  ],
  bestPractices: [
    {
      tag: "Reliability",
      text: "Use dynamic baselines and robust statistics (MAD) so real anomalies stand out and seasonal noise does not page.",
    },
    {
      tag: "Maintainability",
      text: "Correlate alerts into incidents and keep the engineer in the loop — the model suggests, the runbook and engineer decide.",
    },
    {
      tag: "Cost",
      text: "Deterministic rules handle the known symptoms for free; reserve the model for the long tail.",
    },
    {
      tag: "Performance",
      text: "Summarise incident timelines automatically so on-call starts from a narrative, not a storm of alerts.",
    },
  ],
  interview: [
    {
      q: "Why is median absolute deviation more robust than z-score for anomaly detection?",
      a: "z-score uses the mean and standard deviation, both of which a single large outlier inflates — so the outlier can hide itself by widening the 'normal' range. MAD uses the median, which the outlier barely moves, so the spike stands far out. It is the standard robust alternative for noisy metrics.",
    },
    {
      q: "How does AIOps reduce alert noise?",
      a: "It correlates related alerts into one incident — a 5xx spike, latency and pool exhaustion are grouped by source and time — and learns dynamic baselines so predictable daily peaks do not page. The engineer gets one incident with context instead of twenty alerts.",
    },
    {
      q: "Where does AIOps fail?",
      a: "Cold starts (a new service has no history to learn from) and seasonality (a daily or weekly pattern the model mistakes for an anomaly). That is why the engineer stays in the loop: the model flags, the engineer confirms against logs and traces.",
    },
  ],
  quickCheck: [
    {
      kind: "mcq",
      prompt: "A service peaks every weekday at 9 am. A static 'CPU > 80%' alert pages daily. What is the right fix?",
      options: [
        "A dynamic baseline that learns the daily rhythm",
        "Raise the threshold to 99%",
        "Delete the alert",
        "Scale up every morning",
      ],
      answer: 0,
      explanation: "The daily peak is normal. A dynamic baseline learns it and only pages on a genuine deviation.",
    },
    {
      kind: "output",
      prompt: "Which value does this MAD detector flag?",
      code: {
        lang: "python",
        code: `values = [100, 101, 100, 102, 300, 100]
m = sorted(values)[len(values) // 2]
for i, x in enumerate(values):
    if abs(x - m) > 100:
        print("flag", i)`,
      },
      options: ["flag 4", "flag 0", "flag 1", "nothing"],
      answer: 0,
      explanation: "median is 101; only 300 (index 4) is more than 100 away.",
    },
    {
      kind: "bug",
      prompt: "AIOps is enabled on a brand-new service and immediately floods the team with anomalies. What is wrong?",
      options: [
        "There is no historical baseline yet, so every point looks unusual",
        "The service is broken",
        "Anomaly detection cannot work",
        "Nothing is wrong",
      ],
      answer: 0,
      explanation: "Cold start: the model has no baseline to compare against. Collect history and use simple thresholds until then.",
    },
  ],
  cheatSheet: [
    "AIOps = anomaly detection + correlation + summarisation + suggestions.",
    "MAD uses the median, so one spike does not hide itself (unlike z-score).",
    "Dynamic baselines beat static thresholds on seasonal metrics.",
    "Correlate alerts by source/time so one incident pages once.",
    "The summary is a draft — the engineer confirms and decides.",
    "AIOps fails on cold starts and seasonality.",
    "Rules for known symptoms; model for the long tail.",
  ],
  homework: {
    basic: {
      title: "Static vs dynamic threshold",
      brief: ["Show why a static threshold fires on a metric that a dynamic baseline would treat as normal."],
      criteria: ["Static check fires", "Notes the dynamic alternative", "Runs offline"],
      hints: ["Static compares to a fixed number; dynamic learns the range."],
      solution: {
        text: ["A fixed 80 fires on a value of 85 even if 85 is the normal daily peak. A dynamic baseline learns that 85 is normal and only flags genuine deviations."],
        code: {
          lang: "python",
          file: "threshold.py",
          code: `"""Static vs dynamic thresholds."""
def static(metric, threshold):
    return "alert" if metric > threshold else "ok"


print("static:", static(85, 80))
print("dynamic: learn the baseline instead of a fixed 80")`,
        },
        output: "static: alert\ndynamic: learn the baseline instead of a fixed 80",
      },
    },
    intermediate: {
      title: "A MAD-based detector",
      brief: ["Flag a point as anomalous when it is more than k MADs from the median."],
      criteria: ["Computes the median and MAD", "Flags the outlier only", "Runs offline"],
      hints: ["Median = sorted middle; MAD = median of absolute deviations."],
      solution: {
        text: ["This is the robust detector from the lesson: the median is the centre, the MAD the spread, and the outlier stands far out without inflating the spread."],
        code: {
          lang: "python",
          file: "mad_detector.py",
          code: `"""A MAD-based anomaly detector."""
def is_anomaly(values, index, k=5):
    m = sorted(values)[len(values) // 2]
    mad = sorted(abs(x - m) for x in values)[len(values) // 2]
    return abs(values[index] - m) > k * mad


vals = [100, 101, 100, 102, 300, 100]
for i in range(len(vals)):
    print(f"t={i} value={vals[i]} -> {'anomaly' if is_anomaly(vals, i) else 'ok'}")`,
        },
        output: "t=0 value=100 -> ok\nt=1 value=101 -> ok\nt=2 value=100 -> ok\nt=3 value=102 -> ok\nt=4 value=300 -> anomaly\nt=5 value=100 -> ok",
      },
    },
    challenge: {
      title: "Where AIOps fails",
      brief: ["Write a classifier that flags metrics where AIOps would struggle: seasonal patterns and services with no history."],
      criteria: ["Seasonal metrics are flagged", "No-history services are flagged", "Steady baselines pass"],
      hints: ["Check for 'daily', 'seasonal' or 'new' in the metric description."],
      solution: {
        text: ["Knowing where the model fails is as important as knowing where it works. These two cases — seasonality and cold start — account for most AIOps false alarms."],
        code: {
          lang: "python",
          file: "aiops_limits.py",
          code: `"""Where AIOps fails."""
def risk(metric: str) -> str:
    if "daily" in metric or "seasonal" in metric or "new" in metric:
        return "models fail: seasonal pattern or no training data"
    return "model works with enough history"


for m in ("latency with daily peaks", "steady cpu baseline", "a brand-new service"):
    print(f"{m:28} -> {risk(m)}")`,
        },
        output: "latency with daily peaks     -> models fail: seasonal pattern or no training data\nsteady cpu baseline          -> model works with enough history\na brand-new service          -> models fail: seasonal pattern or no training data",
      },
    },
    capstone: {
      title: "DevAtlas: on-call copilot",
      brief: ["Build a copilot that answers alerts with deterministic rules for known symptoms and escalates the rest to a model."],
      criteria: ["Known symptoms hit rules", "Unknown alerts escalate", "Runs offline"],
      hints: ["Rules for disk and 5xx, then a model fallback."],
      solution: {
        text: ["This is the production architecture: deterministic runbook lookups for the common cases, a model only for the long tail, and the engineer deciding at the end."],
        code: {
          lang: "python",
          file: "oncall_copilot2.py",
          code: `"""On-call copilot: summarize + suggest a runbook (rules, then model fallback)."""
def copilot(alert: str) -> str:
    a = alert.lower()
    if "disk" in a:
        return "RULE: disk -> free space / rotate logs"
    if "5xx" in a or "error rate" in a:
        return "RULE: 5xx spike -> check last deploy, roll back"
    return "ESCALATE to model: " + a


for alert in ("disk usage > 95%", "5xx error rate spike", "cache hit ratio dropped"):
    print(copilot(alert))`,
        },
        output: "RULE: disk -> free space / rotate logs\nRULE: 5xx spike -> check last deploy, roll back\nESCALATE to model: cache hit ratio dropped",
      },
    },
  },
  deeper: [
    { label: "Median absolute deviation (Wikipedia)", url: "https://en.wikipedia.org/wiki/Median_absolute_deviation" },
    { label: "Datadog Watchdog: AI anomaly detection", url: "https://www.datadoghq.com/product/platform/watchdog/" },
    { label: "Google SRE book: practical alerting", url: "https://sre.google/sre-book/practical-alerting/" },
    { label: "K8sGPT: AI for Kubernetes", url: "https://k8sgpt.ai/" },
  ],
  nextPreview: "Next: Phase 10, Career — portfolio, resume and interviews: turning all of this into an offer.",
};
