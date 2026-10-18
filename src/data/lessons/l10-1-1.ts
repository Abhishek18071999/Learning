import type { Lesson } from "../../types";

export const lesson: Lesson = {
  id: "10.1.1",
  title: "Portfolio, resume and GitHub profile",
  minutes: 70,
  level: "Beginner",
  prerequisites: ["A finished project (DevAtlas or your own)"],
  summary: "Turn your work into evidence: a project README that a reviewer understands in 60 seconds, resume bullets that show impact with numbers, a GitHub profile that points to your best work, and architecture decision records that prove you think like an engineer. Includes tools that lint your bullets and collect honest facts from your repository.",
  terms: [
    {
      term: "Portfolio project",
      def: "A project built to be shown: deployed, documented, tested, and explained in terms of problems and results.",
    },
    {
      term: "Impact bullet",
      def: "A resume line in the form 'did X, measured by Y, by doing Z', with a concrete result.",
    },
    {
      term: "ATS",
      def: "Applicant Tracking System: software that parses resumes. Simple, single-column layouts and standard headings parse best.",
    },
    {
      term: "README",
      def: "The front page of a repository: what it is, why it matters, how to run it, and how it is built.",
    },
    {
      term: "ADR",
      def: "Architecture Decision Record: a short document capturing a decision, its context, the options and the consequences.",
    },
    {
      term: "Profile README",
      def: "A README in a repository named after your GitHub username, shown at the top of your profile.",
    },
    {
      term: "Signal vs noise",
      def: "What a reviewer can verify quickly (live demo, tests, metrics) versus claims and long lists of technologies.",
    },
  ],
  problem: [
    "You finished DevAtlas: a React app, three backends, Kubernetes, AI features. Your resume says 'Worked on various web projects using many technologies', your GitHub shows 40 forked tutorial repos, and the DevAtlas README is the default template. A recruiter spends about a minute on each candidate, and an engineer reviewing your code spends perhaps five.",
    "The work is real; the evidence is invisible. This lesson packages it so the right people see, in seconds, what you built, why it matters, and that you can be trusted with production code.",
  ],
  concept: {
    analogy: [
      "Your portfolio is a **shop window**, not the warehouse. A passer-by sees three well-lit products with price tags (results) and a door that opens (live demo), not every box in the back room. Your resume is the **catalogue page**: one line per product, each saying what it does for the buyer.",
    ],
    precise: [
      "**Depth beats breadth:** one or two substantial, finished, deployed projects with tests, CI, a clear README and measured results outperform twenty tutorial clones. DevAtlas covers frontend, backends, data, cloud, DevOps and AI: that is a complete story.",
      "**README structure:** one-line pitch and live demo link at the top, screenshot or short video, why it exists, features, architecture diagram, results table with how they were measured, a 3-command quick start, tech list, and what you would do next.",
      "**Resume bullets:** strong past-tense verb + what you did + measurable result + how (the XYZ formula: 'Accomplished X, as measured by Y, by doing Z'). Numbers can be latency, cost, users, time saved, test coverage, eval scores. Only claim numbers you measured and can explain in an interview.",
      "**Resume format:** one page early in your career, single column, standard headings (Summary, Experience or Projects, Skills, Education), PDF, links to GitHub and live demo, no photos, tables or skill bars. Tailor the summary and order of bullets to each role.",
      "**GitHub:** pin your best 4 to 6 repositories, write a short profile README, keep commit history meaningful (small commits with clear messages), and make sure every pinned repo has a README, a license and green CI.",
      "**Show engineering judgement:** ADRs, a postmortem from an incident you handled, an eval report, or a blog post about a trade-off are strong signals that you think beyond 'it works'.",
    ],
  },
  underTheHood: {
    text: [
      "How screening usually works: an ATS parses your resume into fields and a recruiter scans it quickly for role fit (titles, skills, recency) and evidence of impact; then an engineer may look at your GitHub or portfolio for code quality, tests, structure and commit history. Each step rewards clarity over volume.",
      "Parsers struggle with multi-column layouts, text in images, headers and footers, and unusual section names. Keywords matter, but only in context: 'Kubernetes' inside a bullet that shows what you did with it is worth more than a skills list.",
      "Reviewers look for signals they can check in minutes: does the demo work, do the tests run, is the README honest, are there commits over time or one giant upload, is there anything they could not have copied from a tutorial (your own design decisions, measurements, write-ups).",
    ],
    diagram: {
      title: "From project to interview",
      nodes: [
        { label: "Project", sub: "deployed, tested" },
        { label: "README", sub: "pitch, results, run" },
        { label: "Resume", sub: "impact bullets" },
        { label: "Profile", sub: "pinned repos" },
        { label: "Interview", sub: "you explain the trade-offs" },
      ],
      edges: ["documented", "summarised", "linked", "invited"],
    },
  },
  handsOn: [
    {
      title: "A resume bullet linter",
      text: ["Make the rules explicit and check every bullet: strong verb, a number, a result, no filler."],
      code: {
        lang: "python",
        file: "bullets.py",
        code: `"""Score resume bullets: strong verb, concrete result, numbers, and no filler phrases."""
import re

WEAK = ["responsible for", "worked on", "helped", "involved in", "various", "etc", "duties included"]
VERBS = {"built", "designed", "reduced", "cut", "increased", "led", "shipped", "automated", "migrated",
         "launched", "improved", "implemented", "replaced", "scaled", "created", "wrote", "added"}
RESULT = re.compile(r"\\b(reduc|cut|increas|improv|sav|reach|faster|from .* to|without|enabl)", re.I)
NUMBER = re.compile(r"\\d")


def review(bullet: str) -> tuple[int, list[str]]:
    b, notes, score = bullet.strip(), [], 0
    first = b.split()[0].lower().strip(",.")
    if first in VERBS:
        score += 1
    else:
        notes.append(f"start with a strong past-tense verb (not '{first}')")
    if NUMBER.search(b):
        score += 1
    else:
        notes.append("add a number: %, time, users, cost, scale")
    if RESULT.search(b):
        score += 1
    else:
        notes.append("say what changed because of your work")
    for w in WEAK:
        if w in b.lower():
            score -= 1
            notes.append(f"remove filler '{w}'")
    if len(b) > 200:
        notes.append("too long: one line, two at most")
    return max(score, 0), notes


if __name__ == "__main__":
    for bullet in [
        "Responsible for working on the backend and various APIs",
        "Built a FastAPI service for quiz grading",
        "Cut p95 grading latency from 1.2 s to 180 ms by adding Redis caching and a composite index",
        "Automated deployments with GitHub Actions and Terraform, reducing release time from 2 hours to 12 minutes",
    ]:
        score, notes = review(bullet)
        print(f"[{score}/3] {bullet}")
        for n in notes:
            print(f"      - {n}")`,
      },
      output: "[0/3] Responsible for working on the backend and various APIs\n      - start with a strong past-tense verb (not 'responsible')\n      - add a number: %, time, users, cost, scale\n      - say what changed because of your work\n      - remove filler 'responsible for'\n      - remove filler 'various'\n[1/3] Built a FastAPI service for quiz grading\n      - add a number: %, time, users, cost, scale\n      - say what changed because of your work\n[3/3] Cut p95 grading latency from 1.2 s to 180 ms by adding Redis caching and a composite index\n[3/3] Automated deployments with GitHub Actions and Terraform, reducing release time from 2 hours to 12 minutes",
      notes: [
        "A linter cannot judge truth or relevance; it catches the most common weaknesses so your attention goes to the content.",
      ],
    },
    {
      title: "Collect honest facts from your repository",
      code: {
        lang: "python",
        file: "repo_facts.py",
        code: `"""Collect honest, checkable facts about a project for your resume and README.
Usage: python repo_facts.py /path/to/repo"""
import subprocess
import sys
from collections import Counter
from pathlib import Path

LANG = {".py": "Python", ".ts": "TypeScript", ".tsx": "TypeScript", ".js": "JavaScript", ".cs": "C#",
        ".rs": "Rust", ".go": "Go", ".sql": "SQL", ".tf": "Terraform", ".css": "CSS", ".yml": "YAML",
        ".yaml": "YAML", ".md": "Markdown"}


def git(repo: str, *args: str) -> str:
    return subprocess.run(["git", "-C", repo, *args], check=True, capture_output=True, text=True).stdout


repo = sys.argv[1] if len(sys.argv) > 1 else "."
files = git(repo, "ls-files").splitlines()
lines = Counter()
for f in files:
    lang = LANG.get(Path(f).suffix)
    if lang:
        try:
            lines[lang] += sum(1 for _ in open(Path(repo) / f, encoding="utf-8", errors="ignore"))
        except OSError:
            pass
tests = [f for f in files if "test" in Path(f).name.lower()]
commits = git(repo, "rev-list", "--count", "HEAD").strip()
first, last = git(repo, "log", "--reverse", "--format=%as").splitlines()[0], git(repo, "log", "-1", "--format=%as").strip()
workflows = [f for f in files if f.startswith(".github/workflows/")]

print(f"commits: {commits} ({first} -> {last})")
print(f"tracked files: {len(files)}, test files: {len(tests)}, CI workflows: {len(workflows)}")
for lang, n in lines.most_common(5):
    print(f"  {lang:11} {n:7,} lines")`,
      },
      output: "$ python repo_facts.py ~/code/devatlas\ncommits: 20 (2026-10-18 -> 2026-10-18)\ntracked files: 105, test files: 2, CI workflows: 1\n  TypeScript   33,207 lines\n  CSS           2,461 lines\n  Markdown         56 lines\n  YAML             24 lines",
      notes: [
        "(Output from one checkout of the DevAtlas web app; yours will differ.) Lines of code are not a goal, but numbers like test files, CI workflows and eval scores are checkable evidence. Measured performance numbers come from load tests and dashboards, not from guesses.",
      ],
    },
    {
      title: "A README that sells in 60 seconds",
      code: {
        lang: "markdown",
        file: "README.md",
        code: `# DevAtlas

**A learning platform with an AI tutor, daily tech news and progress tracking.**
Live demo: https://devatlas.example.com · 2-minute video: https://youtu.be/… · [Architecture](docs/architecture.md)

![DevAtlas lesson page](docs/screenshot-lesson.png)

## Why it exists
Self-taught developers lose weeks jumping between tutorials. DevAtlas gives one path from
fundamentals to cloud and AI, with exercises checked automatically and an AI tutor that cites the course.

## What it does
- **AI tutor** grounded in lesson notes (RAG, hybrid search, citations); refuses when unsure
- **Progress and streaks** with quizzes, homework and spaced revision
- **Tech news digest** tagged by topic, refreshed daily

## Architecture
\`\`\`mermaid
flowchart LR
  web[React SPA] --> api[ASP.NET Core API]
  web --> ai[FastAPI AI service]
  api --> db[(PostgreSQL)]
  ai --> db
  ai --> claude[Claude API]
  news[Rust news ingester] --> db
\`\`\`
Key decisions are recorded in [docs/adr](docs/adr) (e.g. ADR-003: PostgreSQL + pgvector instead of a separate vector DB).

## Results
| Metric | Value | How measured |
|---|---|---|
| Tutor retrieval recall@3 | 0.90 | 120-question eval set, run in CI |
| p95 grading latency | 180 ms | k6 load test, 200 rps |
| Deploy time | 12 min | GitHub Actions, commit to production |

## Run it locally
\`\`\`bash
git clone https://github.com/asha-dev/devatlas && cd devatlas
cp .env.example .env        # add your ANTHROPIC_API_KEY
./dev.sh up                 # http://localhost:8088
\`\`\`

## Tech
React · TypeScript · ASP.NET Core · FastAPI · Rust · PostgreSQL/pgvector · Redis · Docker · Kubernetes · Terraform · GitHub Actions · OpenTelemetry

## What I would do next
Multi-tenant classrooms, offline mode, and replacing polling with server-sent events for live sessions.`,
      },
      notes: [
        "GitHub renders Mermaid diagrams in Markdown. Every number in the Results table says how it was measured: reviewers trust numbers with a method.",
      ],
    },
    {
      title: "A GitHub profile README",
      text: ["Create a public repository named exactly like your username; its README appears on your profile."],
      code: {
        lang: "markdown",
        file: "asha-dev/README.md",
        code: `### Hi, I'm Asha 👋  Full-stack & cloud engineer

I build AI-enabled web products end to end and like making them fast, observable and cheap to run.

- 🔭 **Now:** [DevAtlas](https://github.com/asha-dev/devatlas): learning platform with a RAG tutor (React, FastAPI, Kubernetes)
- 🧪 **Recent:** cut p95 grading latency from 1.2 s to 180 ms; automated canary releases with SLO alerts
- ✍️ **Writing:** [How I evaluate a RAG tutor in CI](https://asha.dev/rag-evals)
- 📫 asha@example.com · [LinkedIn](https://linkedin.com/in/asha-dev)

**Pinned:** DevAtlas · rust-news-ingester · terraform-aws-devatlas · leetcode-patterns (with tests)`,
      },
    },
  ],
  companies: [
    "**Hiring teams skim:** many recruiters spend about a minute on an initial resume review, so the top third of the page (summary and first project or job) does most of the work.",
    "**Take-home and portfolio reviews:** engineering teams often look for tests, a README, sensible structure and clear commits, and ask you to walk through decisions in a follow-up interview.",
    "**Open-source and writing as signals:** contributions to real projects and clear technical writing are visible proof of collaboration and communication, which many teams value as much as raw coding.",
    "**Referrals beat cold applications:** a portfolio that peers can share ('look at this RAG tutor') turns your network into referrals.",
  ],
  mistakes: [
    {
      mistake: "Listing technologies instead of outcomes",
      why: "It looks impressive",
      wrong: "Reviewers cannot tell what you can actually do",
      fix: "Bullets with verb + result + number + how; skills grouped and short",
    },
    {
      mistake: "Many unfinished tutorial repos",
      why: "Activity feels like progress",
      wrong: "Your best work is buried; copied code is obvious",
      fix: "Pin 4-6 finished projects; archive or make the rest private",
    },
    {
      mistake: "Numbers you cannot defend",
      why: "Bullets need numbers",
      wrong: "An interviewer asks 'how did you measure that?' and trust is gone",
      fix: "Only measured numbers; keep notes on how you measured",
    },
    {
      mistake: "A README with no way to run or see the project",
      why: "It works on your machine",
      wrong: "Reviewers give up in under a minute",
      fix: "Live demo link, screenshot, and a 3-command quick start",
    },
    {
      mistake: "Fancy multi-column resume templates",
      why: "They look modern",
      wrong: "ATS parsing scrambles your content",
      fix: "Single column, standard headings, PDF",
    },
    {
      mistake: "Secrets or personal data in public repos",
      why: "Pushed .env or test data",
      wrong: "Leaked keys get abused; looks careless to reviewers",
      fix: "Secret scanning, .env.example, and rotate anything leaked",
    },
  ],
  bestPractices: [
    {
      tag: "Maintainability",
      text: "Keep the README and ADRs current; outdated instructions on a pinned repo hurt more than missing ones.",
    },
    {
      tag: "Reliability",
      text: "Make sure live demos stay up (health checks, a cheap always-on plan or a recorded video fallback).",
    },
    {
      tag: "Security",
      text: "Run secret scanning on public repos and never include real user data in demos.",
    },
    {
      tag: "Cost",
      text: "Host demos on free or low tiers with budgets and alerts (lesson 8.4.1); scale-to-zero platforms are ideal.",
    },
    {
      tag: "Performance",
      text: "A demo that loads in under two seconds makes a better first impression than any feature list.",
    },
  ],
  interview: [
    {
      q: "Tell me about a project you are proud of.",
      a: "Use a short structure: the problem and who it was for, what you built and your role, two or three key technical decisions with their trade-offs, a measurable result, and what you learned or would change. For DevAtlas: a learning platform with a RAG tutor; chose pgvector inside PostgreSQL over a separate vector database to keep one data store (ADR-003); measured recall@3 of 0.90 on an eval set and cut grading p95 to 180 ms; next I would add multi-tenant classrooms.",
    },
    {
      q: "How do you decide what goes on your resume?",
      a: "Relevance to the role and strength of evidence. I lead with the work closest to the job, write each bullet as result plus method with numbers I measured, cut filler and generic skills, keep it to one page early in my career, and tailor the summary and bullet order per application.",
    },
    {
      q: "Why should we trust the numbers on your resume?",
      a: "Because each comes with a method: eval sets in CI for retrieval quality, load tests for latency, pipeline timings for deploy speed. I can show the scripts, explain the setup and limitations, and describe how the number changed over time.",
    },
  ],
  quickCheck: [
    {
      kind: "mcq",
      prompt: "Which bullet is strongest?",
      options: [
        "Responsible for backend development",
        "Worked with Redis, PostgreSQL and FastAPI",
        "Cut p95 API latency from 1.2 s to 180 ms by adding Redis caching and a composite index",
        "Passionate developer who loves clean code",
      ],
      answer: 2,
      explanation: "It has a strong verb, a measured result and the method. The others describe duties, tools or adjectives.",
    },
    {
      kind: "output",
      prompt: "With the linter's rules, what does `review(\"Built a CLI tool\")` return as its score?",
      code: {
        lang: "python",
        code: `# rules: +1 strong verb, +1 contains a digit, +1 states a result, -1 per filler phrase
bullet = "Built a CLI tool"
score = 1 + 0 + 0
print(max(score, 0))`,
      },
      options: ["0", "1", "2", "3"],
      answer: 1,
      explanation: "'Built' is a strong verb (+1), but there is no number and no result. Rewrite: 'Built a CLI that cut lesson publishing from 20 minutes to 2'.",
    },
    {
      kind: "bug",
      prompt: "A reviewer opens your pinned repo and leaves within 30 seconds. What is the most likely problem?",
      code: {
        lang: "markdown",
        code: `# devatlas

This project was bootstrapped with Vite.

## Available scripts
npm run dev
npm run build`,
      },
      options: [
        "The project name is lowercase",
        "The README never says what the project is, why it matters, or shows it running",
        "It uses Vite",
        "It has too few scripts",
      ],
      answer: 1,
      explanation: "Replace the template with a one-line pitch, a demo link and screenshot, results, architecture and a quick start.",
    },
  ],
  cheatSheet: [
    "1-2 finished, deployed, tested projects > 20 tutorial clones.",
    "README: pitch + demo + screenshot → why → features → architecture → results (with method) → quick start → next.",
    "Bullet = verb + what + measured result + how.",
    "Only numbers you measured and can explain.",
    "Resume: one page, one column, standard headings, PDF, links.",
    "GitHub: pin 4-6 repos with READMEs, licenses, green CI; profile README.",
    "ADRs and postmortems show engineering judgement.",
    "Scan for secrets before making repos public.",
  ],
  homework: {
    basic: {
      title: "Rewrite five bullets",
      brief: [
        "Write five resume bullets about your DevAtlas work (or another project) and run them through the linter until each scores 3/3. Keep a note of how you measured every number.",
      ],
      criteria: ["Five bullets at 3/3", "Each number has a measurement note", "No filler phrases"],
      hints: ["If you have no number yet, go measure one: a load test, a timing, an eval run."],
      solution: {
        text: [
          "Sample before/after: 'Worked on deployments' → 'Automated deployments with GitHub Actions and Terraform, reducing release time from 2 hours to 12 minutes'. The measurement note: 'median of 10 releases before vs after, from pipeline logs'.",
        ],
        code: {
          lang: "python",
          file: "my_bullets.py",
          code: `from bullets import review

MINE = [
    "Cut p95 grading latency from 1.2 s to 180 ms by adding Redis caching and a composite index",
    "Built a RAG tutor over 80 lessons with hybrid search, reaching 0.90 recall@3 on a 120-question eval set",
    "Automated deployments with GitHub Actions and Terraform, reducing release time from 2 hours to 12 minutes",
    "Reduced monthly AI spend by 35% by routing classification to a smaller model",
    "Added OpenTelemetry tracing across 3 services, cutting time to find slow requests from hours to minutes",
]
for b in MINE:
    score, notes = review(b)
    print(score, b[:60], notes)`,
        },
        output: "3 Cut p95 grading latency from 1.2 s to 180 ms by adding Redis []\n3 Built a RAG tutor over 80 lessons with hybrid search, reachi []\n3 Automated deployments with GitHub Actions and Terraform, red []\n3 Reduced monthly AI spend by 35% by routing classification to []\n3 Added OpenTelemetry tracing across 3 services, cutting time  []",
      },
    },
    intermediate: {
      title: "Write two ADRs",
      brief: [
        "Record two real decisions from your project as ADRs: context, options considered, decision, consequences. Link them from the README.",
      ],
      criteria: [
        "Context explains constraints",
        "At least two options compared",
        "Consequences include downsides",
        "Linked from README",
      ],
      hints: ["Good candidates: database choice, monolith vs services, hosting platform, how you call the LLM."],
      solution: {
        text: [
          "ADRs are short on purpose: a page at most. Their value is showing that you considered alternatives and understood the trade-offs, which is exactly what system design interviews probe.",
        ],
        code: {
          lang: "markdown",
          file: "docs/adr/003-pgvector.md",
          code: `# ADR-003: Store embeddings in PostgreSQL with pgvector

- **Status:** accepted · **Date:** 2026-06-12

## Context
The AI tutor needs vector search over ~10k lesson chunks. We already run PostgreSQL for app data.
Options: a managed vector database, OpenSearch, or pgvector in the existing database.

## Decision
Use pgvector with an HNSW index, plus PostgreSQL full-text search for hybrid retrieval.

## Consequences
- One database to operate, back up and secure; permissions are a WHERE clause.
- Good enough at our scale (recall@3 0.90, p95 query 18 ms); revisit above ~5M vectors.
- We depend on the pgvector extension being available on our managed PostgreSQL.`,
        },
      },
    },
    challenge: {
      title: "Write and publish one technical post",
      brief: [
        "Write a 600 to 1,000 word post about one problem you solved in DevAtlas (for example 'How I evaluate a RAG tutor in CI'): the problem, what you tried, what worked, numbers, and what you would do differently. Publish it and link it from your README and profile.",
      ],
      criteria: [
        "Specific problem and measured outcome",
        "Code or diagram included",
        "Honest about trade-offs and failures",
        "Published and linked",
      ],
      hints: ["Outline: hook (the problem) → context → approach → results → lessons → next steps."],
      solution: {
        text: [
          "Outline example. Title: 'My RAG tutor answered confidently and wrongly. Here is the eval that caught it.' 1) The bug: correct-sounding but ungrounded answers. 2) Building a golden set from student questions. 3) Measuring recall@3 and groundedness; calibrating the judge against my own labels (kappa 0.57 at first). 4) Hybrid search and reranking: recall@3 from 0.8 to 0.9. 5) Running it in CI. 6) What I would do with more data.",
          "Posts like this are often what interviewers remember and ask about.",
        ],
      },
    },
    capstone: {
      title: "DevAtlas: resume as code",
      brief: [
        "Keep your resume as a JSON Resume file in a repository, render it to Markdown (and PDF) with a script that refuses to build when any project bullet is weak, and link the published version from your GitHub profile.",
      ],
      criteria: [
        "Single source of truth in JSON",
        "Required fields validated",
        "Bullet lint gate (non-zero exit on weak bullets)",
        "Rendered output committed or published",
      ],
      hints: ["Pandoc or a browser 'print to PDF' turns the Markdown into a clean PDF."],
      solution: {
        text: [
          "The gate keeps quality from slipping when you add bullets in a hurry before an application. Tailor per role by keeping variants of `summary` and bullet order in separate small files.",
        ],
        code: {
          lang: "python",
          file: "render_resume.py",
          code: `"""Render a JSON Resume (jsonresume.org schema subset) to Markdown, linting every bullet first."""
import json
import sys

from bullets import review

REQUIRED = ["name", "label", "email", "summary"]


def render(r: dict) -> str:
    b = r["basics"]
    missing = [k for k in REQUIRED if not b.get(k)]
    if missing:
        raise ValueError(f"basics missing {missing}")
    links = " · ".join([b["email"], b.get("url", "")] + [p["url"] for p in b.get("profiles", [])])
    out = [f"# {b['name']}", f"**{b['label']}** · {links.strip(' ·')}", "", b["summary"], ""]
    out += ["## Projects"]
    for p in r.get("projects", []):
        out += [f"### [{p['name']}]({p['url']})", p["description"]]
        out += [f"- {h}" for h in p["highlights"]]
        out.append("")
    out += ["## Skills"] + [f"- **{s['name']}:** {', '.join(s['keywords'])}" for s in r.get("skills", [])]
    out += ["", "## Education"] + [f"- {e['studyType']} {e['area']}, {e['institution']} ({e['endDate']})"
                                   for e in r.get("education", [])]
    return "\\n".join(out)


resume = json.load(open(sys.argv[1] if len(sys.argv) > 1 else "resume.json"))
weak = [(h, notes) for p in resume.get("projects", []) for h in p["highlights"]
        for score, notes in [review(h)] if score < 3]
for h, notes in weak:
    print(f"WEAK: {h}\\n  " + "\\n  ".join(notes), file=sys.stderr)
print(render(resume))
sys.exit(1 if weak else 0)`,
        },
        output: "$ python render_resume.py resume.json > resume.md   (exit 0)\n# Asha Verma\n**Full-Stack & Cloud Engineer** · asha@example.com · https://asha.dev · https://github.com/asha-dev\n\nBuilds and runs AI-enabled web products end to end: React, FastAPI, PostgreSQL, Kubernetes, Terraform.\n\n## Projects\n### [DevAtlas](https://github.com/asha-dev/devatlas)\n- Built a RAG tutor over 80 lessons with hybrid search, reaching 0.90 recall@3 on a 120-question eval set\n- Cut p95 grading latency from 1.2 s to 180 ms with Redis caching and a composite index\n- Automated canary releases on Kubernetes with SLO burn-rate alerts, cutting rollback time from 40 to 8 minutes\n...",
      },
    },
  },
  deeper: [
    {
      label: "GitHub Docs: Managing your profile README",
      url: "https://docs.github.com/en/account-and-profile/setting-up-and-managing-your-github-profile/customizing-your-profile/managing-your-profile-readme",
    },
    { label: "JSON Resume schema", url: "https://jsonresume.org/schema" },
    { label: "Architecture Decision Records (adr.github.io)", url: "https://adr.github.io/" },
    { label: "Make a README", url: "https://www.makeareadme.com/" },
  ],
  nextPreview: "Next: interviews. Coding problems with a repeatable method, system design with estimates and trade-offs, and behavioural stories in STAR format.",
};
