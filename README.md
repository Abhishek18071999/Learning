# DevAtlas

A mentor-led learning platform for full-stack, AI and DevOps engineering. Lessons are written the way a principal engineer teaches a junior on a real team: the production problem first, an analogy and then the precise mechanism, runnable code, how real companies do it, the mistakes that cost money, interview questions, a quick check, and three tiers of homework with hints and model solutions.

DevAtlas is also the **capstone project**. As learners go through the course, they build their own version of this platform: React frontend, ASP.NET Core API, FastAPI AI tutor with RAG, Rust news ingester, MySQL and MongoDB, all deployed with Docker, GitHub Actions, Terraform and Kubernetes.

## What's inside

| Area | What it does |
|---|---|
| `/start` onboarding | Profile, skill levels, goal, time budget, OS, learning style, and a diagnostic quiz when you claim experience. Produces a personalised, week-by-week roadmap. |
| Lessons | 10 full lessons in the 14-part Mentor format, plus the full 11-phase / 73-lesson curriculum with objectives for upcoming lessons. |
| Quick checks | Multiple choice, predict-the-output and spot-the-bug questions. Answers stay hidden until you choose one. |
| Homework | Basic, intermediate, challenge and capstone tasks with acceptance criteria, one-at-a-time hints, a submission box, a 4-part self-review rubric and model solutions with common pitfalls. |
| Revise | Leitner spaced repetition (1, 2, 4, 8, 16 days) built from completed lessons, plus 3 review questions at the start of each lesson. |
| Quiz and mock interview | 10-question topic quizzes and one-question-at-a-time interview practice with model answers. |
| Capstone | Milestones linked to lessons, architecture overview and a Mermaid diagram to paste into your repo. |
| Tech News | Live stories from the past 7 days via the public Hacker News API, tagged by course topic, with evergreen notes on how companies use each area. News is never generated or rewritten. |
| Command palette | Press `/` or `Ctrl/⌘ + K`, then type a lesson, a term, or a command like `/next`, `/quiz docker` or `/explain TTL`. |
| Progress Card | Copyable summary in the Mentor format. Export and import all progress as JSON in Settings. |

All learner data stays in the browser (localStorage). There is no backend and no tracking.

## Run it

Requires Node 20+.

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # content integrity + logic tests
npm run build      # static site in dist/
```

The build is a static site with hash routing, so `dist/` can be hosted anywhere: GitHub Pages, S3 + CloudFront, Azure Static Web Apps or nginx.

## Project layout

```
src/
  data/curriculum.ts     11 phases, modules and lesson objectives
  data/lessons/          full lessons, one file each, typed by src/types.ts
  data/capstone.ts       capstone parts, milestones, Mermaid architecture
  data/newsTopics.ts     topic rules and industry notes for Tech News
  data/diagnostic.ts     onboarding placement questions
  lib/                   store (localStorage), roadmap, router, highlighter
  components/ pages/     UI
  test/                  vitest suites
```

## Adding a lesson

1. Create `src/data/lessons/lX-Y-Z.ts` exporting a `Lesson` (see `src/types.ts`). Copy an existing lesson for the structure.
2. Register it in `src/data/lessons/index.ts`, in curriculum order.
3. Run `npm test`. The content tests check that every section exists, there are at least 4 mistakes, 3 interview questions and 3 quick-check questions, answer indexes are valid, every homework tier has a model solution, and links use https.
4. Run every code sample yourself and paste real output. Never invent APIs, flags or versions.
