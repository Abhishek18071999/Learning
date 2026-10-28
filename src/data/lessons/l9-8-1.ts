import type { Lesson } from "../../types";

export const lesson: Lesson = {
  id: "9.8.1",
  title: "SAST, DAST, dependency, container and secret scanning in CI",
  minutes: 85,
  level: "Advanced",
  prerequisites: ["9.2.1 GitHub Actions and Azure Pipelines"],
  summary: "Shift security left into the pipeline: run SAST on your code, SCA on dependencies, secret scanning on every commit, container scanning on images, and DAST on running apps — then triage the findings and fail the build on the ones that actually matter.",
  terms: [
    { term: "Shift left", def: "Moving security checks earlier — into the IDE, the commit and the pipeline — so problems are caught before they reach production." },
    { term: "SAST", def: "Static Application Security Testing: scanning source code for risky patterns (injection, hardcoded secrets, unsafe deserialisation)." },
    { term: "SCA", def: "Software Composition Analysis: scanning dependencies (including transitive ones) for known CVEs." },
    { term: "DAST", def: "Dynamic Application Security Testing: probing a running app for vulnerabilities, like a scanner that attacks the deployed endpoint." },
    { term: "Secret scanning", def: "Detecting leaked credentials (API keys, tokens, private keys) in code and history." },
    { term: "Container scanning", def: "Scanning an image's layers and packages for known vulnerabilities before it runs." },
    { term: "SBOM", def: "Software Bill of Materials — a machine-readable list of every component in an artifact, used to answer 'are we affected?' fast." },
  ],
  problem: [
    "Two months after a release, the team learns a dependency had a critical CVE the whole time, and a commit that 'temporarily' contained an AWS key is still in history. Nothing was caught because security was a manual check before a big release, not a gate on every commit.",
    "The fix is not more vigilance — it is automation. Each scanner answers one question cheaply and continuously: is the code risky (SAST), are the dependencies vulnerable (SCA), did a secret leak (secret scanning), is the image clean (container scanning), and does the running app have exploitable holes (DAST)?",
  ],
  concept: {
    analogy: [
      "A pipeline is a **factory with inspection stations**. SAST inspects the blueprint before anything is built; SCA inspects the parts from suppliers for recalls; secret scanning checks nothing labelled 'confidential' leaves the floor; container scanning inspects the box before it ships; DAST runs a surprise safety audit on the finished product. A defect caught at station one costs a minute; caught at the customer costs a breach.",
    ],
    precise: [
      "**SAST** analyses source with pattern- and flow-based rules (Semgrep, CodeQL, Bandit). It finds injection, unsafe deserialisation and hardcoded secrets without running the code. Expect false positives; tune the rules.",
      "**SCA** reads your lockfile and checks every dependency — direct and transitive — against a CVE database (Dependabot, pip-audit, npm audit, Snyk). The most valuable findings are often transitive ones you never named.",
      "**Secret scanning** matches high-entropy patterns (AWS `AKIA…`, `sk-…`, `ghp_…`, `-----BEGIN PRIVATE KEY-----`) in the repo and its history. A leaked key must be rotated, not just deleted — the commit still exists.",
      "**Container scanning** (Trivy, Grype) unpacks the image and audits the OS packages and app dependencies it contains. A 'slim' base image and multi-stage builds (lesson 9.1.1) shrink the surface before you even scan.",
      "**DAST** attacks a running instance (OWASP ZAP, Burp) from the outside, finding vulnerabilities that only exist in a live, configured app. Run it on a throwaway environment, never production.",
      "**Triage is a policy, not a feeling.** Map severity to action: critical/high fail the build or block the PR; medium opens a ticket; low is noted. Re-scan on schedule, because new CVEs appear for code you did not change.",
    ],
  },
  underTheHood: {
    text: [
      "Every scanner is fundamentally a matcher: a set of rules or a database, run against a target (source, lockfile, image). SAST rules match code patterns; SCA matches package names and versions against CVE records; secret scanners match regex patterns plus entropy checks; container scanners match installed packages against vulnerability feeds.",
      "The pipeline is the natural home because it already runs on every change and can block the merge. A typical flow: secret scan on push → SAST + SCA on pull request → container scan at build → DAST on a staging deploy. Findings become annotations on the PR and build-status checks.",
      "The hard part is not running scanners, it is triage: distinguishing the critical transitive CVE from the theoretical one, and the real leaked key from a test fixture that looks like one. That is why the gate uses severity and the fix is often 'upgrade one dependency, pin one version, rotate one key'.",
    ],
    diagram: {
      title: "Scanners in the pipeline",
      nodes: [
        { label: "Commit", sub: "secret scan" },
        { label: "Pull request", sub: "SAST + SCA" },
        { label: "Build", sub: "container scan" },
        { label: "Staging", sub: "DAST" },
        { label: "Gate", sub: "fail on critical/high" },
      ],
      edges: ["blocks", "blocks", "blocks", "blocks", "deploy"],
    },
  },
  handsOn: [
    {
      title: "Scan source for leaked secrets",
      text: [
        "A secret scanner is a set of high-entropy patterns. Here are four of the most common, run over sample lines — the same idea gitleaks applies to a whole repo.",
      ],
      code: {
        lang: "python",
        file: "secret_scan.py",
        code: `"""A secret scanner: find leaked keys and tokens in source (regex, like gitleaks)."""
import re

LINES = [
    "github_token = ghp_ABCDEFGHIJKLMNOPQRSTUVWXYZ123456",
    'password = "hunter2"',
    "jwt = eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c",
    'const stripe = "pk_live_51AbCdEfGhIjKlMnOp"',
    "ssh_private_key = -----BEGIN RSA PRIVATE KEY----- ...",
    "port = 5432  # not a secret",
]

PATTERNS = {
    "GitHub token": r"ghp_[A-Za-z0-9]{30,}",
    "Stripe live key": r"pk_live_[A-Za-z0-9]{8,}",
    "JWT": r"eyJ[A-Za-z0-9_-]{10,}\\.[A-Za-z0-9_-]{10,}\\.[A-Za-z0-9_-]{10,}",
    "Private key block": r"-----BEGIN [A-Z ]*PRIVATE KEY-----",
}

source = "\\n".join(LINES)
for name, pattern in PATTERNS.items():
    matches = re.findall(pattern, source)
    print(f"{name:20} {'FOUND: ' + matches[0][:24] if matches else 'clean'}")`,
      },
      output: "GitHub token         FOUND: ghp_ABCDEFGHIJKLMNOPQRST\nStripe live key      FOUND: pk_live_51AbCdEfGhIjKlMn\nJWT                  FOUND: eyJhbGciOiJIUzI1NiJ9.eyJ\nPrivate key block    FOUND: -----BEGIN RSA PRIVATE K",
      notes: [
        "A real scanner also checks history and uses entropy, and a found key means *rotate it*, not just remove it — the leaked value already exists in past commits.",
      ],
    },
    {
      title: "Triage a scan report",
      text: [
        "The scanner output is not the decision — the gate is. Map severity to action and block only the findings that warrant it.",
      ],
      code: {
        lang: "python",
        file: "scan_triage.py",
        code: `"""Triage a scan report: block the build on critical/high, allow low."""
findings = [
    {"id": "CVE-2024-1234", "severity": "critical", "package": "libxml2"},
    {"id": "CVE-2024-5678", "severity": "high", "package": "openssl"},
    {"id": "SECRET-LEAK", "severity": "critical", "package": "src/appsettings.json"},
    {"id": "CVE-2024-0001", "severity": "low", "package": "zlib"},
]


def gate(findings):
    blocking = [f for f in findings if f["severity"] in ("critical", "high")]
    for f in findings:
        print(f"  {'BLOCK' if f in blocking else 'allow':5} {f['severity']:8} {f['id']:14} {f['package']}")
    return blocking


blocking = gate(findings)
print(f"\\nbuild {'FAILS' if blocking else 'passes'} with {len(blocking)} blocking finding(s)")`,
      },
      output: "  BLOCK critical CVE-2024-1234  libxml2\n  BLOCK high     CVE-2024-5678  openssl\n  BLOCK critical SECRET-LEAK    src/appsettings.json\n  allow low      CVE-2024-0001  zlib\n\nbuild FAILS with 3 blocking finding(s)",
      notes: [
        "The severity threshold is a product decision you make once. A leaked secret is always critical; a low-severity CVE with no known exploit may just be noted.",
      ],
    },
    {
      title: "Generate an SBOM",
      text: [
        "An SBOM lists every component in your artifact, so when a CVE drops you can answer 'are we affected?' without re-deriving the dependency tree.",
      ],
      code: {
        lang: "python",
        file: "sbom.py",
        code: `"""Emit a minimal SBOM (CycloneDX-style JSON) from a dependency list."""
import json

deps = [
    {"name": "Serilog", "version": "4.1.0"},
    {"name": "StackExchange.Redis", "version": "2.8.16"},
    {"name": "Npgsql", "version": "8.0.4"},
]

sbom = {
    "bomFormat": "CycloneDX",
    "specVersion": "1.5",
    "components": [{"type": "library", **d} for d in deps],
}
print(json.dumps(sbom, indent=2))`,
      },
      output: '{\n  "bomFormat": "CycloneDX",\n  "specVersion": "1.5",\n  "components": [\n    {\n      "type": "library",\n      "name": "Serilog",\n      "version": "4.1.0"\n    },\n    {\n      "type": "library",\n      "name": "StackExchange.Redis",\n      "version": "2.8.16"\n    },\n    {\n      "type": "library",\n      "name": "Npgsql",\n      "version": "8.0.4"\n    }\n  ]\n}',
      notes: [
        "Real SBOMs come from your build tool (CycloneDX plugins for .NET, npm, pip) and are attached to the release. This is the same structure, written by hand to show the shape.",
      ],
    },
  ],
  companies: [
    "**GitHub and GitLab** run secret scanning, dependency review and code scanning on every PR, annotating the diff so a vulnerable dependency or leaked key blocks the merge before a human even reviews.",
    "**Container registries** scan on push (ECR, Azure Container Registry) and can fail the deploy when a critical CVE appears in a base image, months after the image was first built.",
    "**Security teams run DAST** (OWASP ZAP, Burp) against staging after every deploy, because some flaws — broken auth flows, misconfiguration — only exist in a running app.",
    "**Regulated industries** require an SBOM per release so a disclosed CVE can be mapped to affected services in minutes, not weeks.",
  ],
  mistakes: [
    {
      mistake: "Scanning only before a big release",
      why: "Security was always a pre-release ritual",
      wrong: "Weeks of vulnerable code and leaked keys shipped in between",
      fix: "Run secret scan on push and SAST/SCA on every pull request",
    },
    {
      mistake: "Ignoring transitive dependencies",
      why: "'I did not add that package'",
      wrong: "The most dangerous CVE is often in a dependency of a dependency",
      fix: "SCA must walk the full tree, and upgrade the top-level package that pins it",
    },
    {
      mistake: "Deleting a leaked secret without rotating it",
      why: "Removing the line feels like fixing it",
      wrong: "The key still exists in history and is still valid in the cloud",
      fix: "Rotate the key immediately, then purge history where feasible",
    },
    {
      mistake: "Trusting a clean scan as proof of security",
      why: "The scanner said zero findings",
      wrong: "A scanner only knows its rules; it misses logic flaws and novel attacks",
      fix: "Treat scans as one layer, add DAST and a human review, and never stop re-scanning",
    },
    {
      mistake: "Floating versions in the manifest",
      why: "'Always get the latest'",
      wrong: "Builds are non-reproducible and a malicious or broken release slips in",
      fix: "Pin exact versions and upgrade deliberately, with the changelog reviewed",
    },
  ],
  bestPractices: [
    {
      tag: "Security",
      text: "Run secret scanning on every push and fail on any match; rotate (never just delete) leaked credentials.",
    },
    {
      tag: "Reliability",
      text: "Gate merges on critical/high findings, open tickets for medium, and re-scan on schedule for new CVEs.",
    },
    {
      tag: "Maintainability",
      text: "Keep scanner config in the repo and tune rules so the signal stays high — a noisy gate gets ignored.",
    },
    {
      tag: "Cost",
      text: "SAST and SCA are cheap and run on every PR; reserve DAST and container scans for build/staging to control cost.",
    },
    {
      tag: "Performance",
      text: "Cache scanner databases and use slim base images so security checks do not slow the pipeline down.",
    },
  ],
  interview: [
    {
      q: "What is the difference between SAST, SCA and DAST?",
      a: "SAST scans source code for risky patterns; SCA scans dependencies (including transitive) for known CVEs; DAST attacks a running application to find runtime flaws like broken auth or injection. They are complementary: SAST and SCA are static and fast, DAST is dynamic and finds only what a running app exposes.",
    },
    {
      q: "A critical CVE appears in a transitive dependency you never heard of. What do you do?",
      a: "SCA surfaces it because it walks the full tree. Find the top-level dependency that pulls it in, check whether an upgraded version fixes it, bump that version (and verify tests), or apply a temporary mitigation if no fix exists. The SBOM tells you everywhere the vulnerable package is used.",
    },
    {
      q: "Why must a leaked secret be rotated and not just removed?",
      a: "Removing the line fixes the file but not the leak: the value still exists in git history and is still a valid credential. An attacker who already scraped it can keep using it. Rotation invalidates the old value everywhere, which is the only real fix.",
    },
  ],
  quickCheck: [
    {
      kind: "mcq",
      prompt: "Which scanner would find a SQL injection in your source code?",
      options: ["SCA", "SAST", "DAST", "Container scanning"],
      answer: 1,
      explanation: "SAST analyses source for risky patterns like injection. DAST would also find it, but by attacking the running app, not reading the code.",
    },
    {
      kind: "output",
      prompt: "This gate blocks severity 'high' and above. How many findings block?",
      code: {
        lang: "python",
        code: `findings = ["low", "medium", "high", "critical", "critical", "low"]
blocking = [f for f in findings if f in ("high", "critical")]
print(len(blocking))`,
      },
      options: ["2", "3", "4", "6"],
      answer: 1,
      explanation: "high + critical + critical = 3 blocking findings.",
    },
    {
      kind: "bug",
      prompt: "A team deletes an accidentally committed AWS key from the repo and re-runs the pipeline. It passes. What is wrong?",
      options: [
        "The key is still in git history and still valid — it must be rotated",
        "The pipeline should be deleted",
        "Nothing is wrong",
        "SAST would have caught it",
      ],
      answer: 0,
      explanation: "Deleting the line does not undo the leak or invalidate the key. Rotation is the only fix; history should then be purged where feasible.",
    },
  ],
  cheatSheet: [
    "Shift left: catch security at commit, not at the customer.",
    "SAST = source patterns; SCA = dependency CVEs; DAST = attack the running app.",
    "Secret scanning on every push; rotate, never just delete, a leaked key.",
    "Container scanning (Trivy/Grype) audits the image's packages.",
    "Triage is policy: critical/high blocks, medium tickets, low noted.",
    "SCA must include transitive dependencies — the CVE you didn't add.",
    "Pin exact dependency versions; upgrade deliberately.",
    "Emit an SBOM per release so 'are we affected?' is a lookup, not a dig.",
  ],
  homework: {
    basic: {
      title: "Extend the secret scanner",
      brief: [
        "Add two patterns to the scanner — a GitHub token (`ghp_…`) and a JWT (`eyJ…`) — and run it against a sample that has both, plus one that has neither.",
      ],
      criteria: [
        "Two new patterns match correctly",
        "An AWS key absence is reported as clean",
        "Output distinguishes found vs clean",
      ],
      hints: ["JWTs are three base64url segments separated by dots."],
      solution: {
        text: [
          "Good secret patterns are precise enough to avoid false positives but broad enough to catch variants. A JWT is three dot-separated base64url segments, always starting `eyJ`.",
        ],
        code: {
          lang: "python",
          file: "secret_scan2.py",
          code: `"""Extend the scanner: add a GitHub token and a JWT pattern."""
import re

PATTERNS = {
    "AWS access key": r"AKIA[0-9A-Z]{16}",
    "GitHub token": r"ghp_[A-Za-z0-9]{30,}",
    "JWT": r"eyJ[A-Za-z0-9_-]{10,}\\.[A-Za-z0-9_-]{10,}\\.[A-Za-z0-9_-]{10,}",
}
sample = "token = ghp_abcdefghijklmnopqrstuvwxyz123456\\njwt = eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c"
for name, p in PATTERNS.items():
    m = re.search(p, sample)
    print(f"{name:16} {'FOUND' if m else 'clean'}")`,
        },
        output: "AWS access key   clean\nGitHub token     FOUND\nJWT              FOUND",
      },
    },
    intermediate: {
      title: "A configurable severity gate",
      brief: [
        "Write a gate whose blocking threshold is a parameter, and print which findings block for critical, high and medium thresholds.",
      ],
      criteria: [
        "Severity ordering is explicit",
        "Threshold is a parameter, not hardcoded",
        "Output lists the blocked finding ids per threshold",
      ],
      hints: ["Map severity strings to a numeric order first."],
      solution: {
        text: [
          "Parameterising the threshold lets you tighten the gate over time without rewriting it — start by blocking critical, then raise it to high once the team clears the backlog.",
        ],
        code: {
          lang: "python",
          file: "gate_severity.py",
          code: `"""Gate on a configurable severity threshold."""
def gate(findings, threshold="high"):
    order = {"low": 1, "medium": 2, "high": 3, "critical": 4}
    return [f for f in findings if order[f["severity"]] >= order[threshold]]


findings = [
    {"id": "A", "severity": "low"},
    {"id": "B", "severity": "medium"},
    {"id": "C", "severity": "high"},
    {"id": "D", "severity": "critical"},
]
for thr in ("critical", "high", "medium"):
    b = gate(findings, thr)
    print(f"threshold={thr:8} blocks {len(b)} -> {[f['id'] for f in b]}")`,
        },
        output: "threshold=critical blocks 1 -> ['D']\nthreshold=high     blocks 2 -> ['C', 'D']\nthreshold=medium   blocks 3 -> ['B', 'C', 'D']",
      },
    },
    challenge: {
      title: "A supply-chain check",
      brief: [
        "Write a check that flags a dependency manifest for two supply-chain risks: a floating version (`*`) and an internal package name that might collide with a public one (dependency confusion).",
      ],
      criteria: [
        "Floating versions are flagged with a pin recommendation",
        "Internal packages are flagged with a feed/namespace recommendation",
        "Pinned, public packages pass",
      ],
      hints: ["Dependency confusion = an attacker publishing your internal package name to the public registry."],
      solution: {
        text: [
          "The two most common supply-chain mistakes are unpinned versions and internal packages that could be resolved from a public registry. Both are caught with a manifest check before any build runs.",
        ],
        code: {
          lang: "python",
          file: "supply_chain.py",
          code: `"""Supply-chain check: flag unpinned or internal-name dependencies."""
MANIFEST = [
    "pkg:nuget/Serilog@4.1.0",
    "pkg:nuget/Newtonsoft.Json@*",
    "pkg:nuget/internal-common@1.0.0",
    "pkg:nuget/StackExchange.Redis@2.8.16",
]

for pkg in MANIFEST:
    name, version = pkg.split("@")
    if version == "*":
        print(f"RISK: unpinned {name} -> pin an exact version")
    elif name.startswith("pkg:nuget/internal-"):
        print(f"RISK: internal package {name} -> ensure a private feed / namespace")
    else:
        print(f"ok: {name} pinned at {version}")`,
        },
        output: "ok: pkg:nuget/Serilog pinned at 4.1.0\nRISK: unpinned pkg:nuget/Newtonsoft.Json -> pin an exact version\nRISK: internal package pkg:nuget/internal-common -> ensure a private feed / namespace\nok: pkg:nuget/StackExchange.Redis pinned at 2.8.16",
      },
    },
    capstone: {
      title: "DevAtlas: CI security gate",
      brief: [
        "Combine three scanners — secret scan, dependency scan and image scan — into one gate that prints every critical finding and fails the build if any exist.",
      ],
      criteria: [
        "Three scanners run and merge their findings",
        "Critical findings fail the build",
        "A clean image passes",
      ],
      hints: ["Model each scanner as a function returning a list of findings."],
      solution: {
        text: [
          "This is the real CI gate in miniature: each scanner is a step, their findings merge, and the build status is a single boolean. Wire each function to a real tool (gitleaks, Dependabot, Trivy) and you have production.",
        ],
        code: {
          lang: "python",
          file: "ci_sec_gate.py",
          code: `"""A CI security gate: run every scanner, fail on any critical finding."""
def secret_scan(files):
    return ["AWS key in appsettings.json"] if "AKIA" in files else []


def dep_scan(lock):
    return ["CVE-2024-1234 (critical) in libxml2"] if "libxml2" in lock else []


def image_scan(img):
    return [] if "distroless" in img else ["40 critical CVEs in base image"]


def gate():
    results = secret_scan("AKIA...") + dep_scan("libxml2=2.11") + image_scan("mcr.microsoft.com/dotnet/aspnet:8.0")
    for r in results:
        print(f"  BLOCK {r}")
    print(f"build {'FAILS' if results else 'passes'} ({len(results)} critical)")


gate()`,
        },
        output: "  BLOCK AWS key in appsettings.json\n  BLOCK CVE-2024-1234 (critical) in libxml2\n  BLOCK 40 critical CVEs in base image\nbuild FAILS (3 critical)",
      },
    },
  },
  deeper: [
    { label: "OWASP Top 10 for LLM Applications", url: "https://genai.owasp.org/llm-top-10/" },
    { label: "gitleaks: secret scanning for git repos", url: "https://github.com/gitleaks/gitleaks" },
    { label: "Trivy: container and dependency scanning", url: "https://trivy.dev/" },
    { label: "CycloneDX: SBOM specification", url: "https://cyclonedx.org/" },
  ],
  nextPreview: "Next: software supply-chain security — SBOMs, SLSA provenance and dependency attacks like xz and left-pad.",
};
