import type { Lesson } from "../../types";

export const lesson: Lesson = {
  id: "0.3.2",
  title: "Team workflow: pull requests and code review",
  minutes: 50,
  level: "Beginner",
  prerequisites: ["0.3.1 Git: commits, branches, merges and conflicts", "A GitHub account"],
  summary: "Work like a professional team: small branches, pull requests that are easy to review, code review that finds real problems, and CI that guards main.",
  terms: [
    { term: "Pull request (PR)", def: "A request to merge one branch into another, with a place for discussion, review and automated checks. GitLab calls it a merge request." },
    { term: "Code review", def: "Another engineer reads your change before it merges, to catch bugs, share knowledge and keep the codebase consistent." },
    { term: "CI (Continuous Integration)", def: "Automation that builds and tests every change, e.g. GitHub Actions." },
    { term: "Branch protection", def: "Rules on a branch like main: require a PR, passing checks and approvals before merging." },
    { term: "Squash merge", def: "Combines all commits of a PR into one commit on main." },
    { term: "Fork", def: "Your own copy of someone else's repository, used to contribute to projects you cannot push to." },
  ],
  problem: [
    "A developer pushes 2,000 lines touching 40 files in one PR titled \"updates\". The reviewer skims it, approves after five minutes, and a broken database migration ships to production.",
    "Studies and industry experience agree: review quality drops sharply as PR size grows. Teams that ship fast and safely keep PRs small, describe them well, automate the boring checks, and review for the things machines cannot catch.",
  ],
  concept: {
    analogy: [
      "A PR is like submitting an article to an editor. A short article with a clear headline and summary gets a careful read and useful edits. A 300-page manuscript with \"misc\" on the cover gets a rubber stamp. Spell-check (CI, linters) runs before the editor even looks, so the editor can focus on whether the argument makes sense.",
    ],
    precise: [
      "The GitHub flow: branch from main → commit small steps → push → open a PR with a description → CI runs → reviewers comment → you push fixes → approve → merge (often squash) → delete the branch → deploy.",
      "**Reviewers look for** correctness (does it do what it claims, edge cases, error handling), design (is this the right place and abstraction), security (input validation, secrets, permissions), tests (do they cover the behaviour), and readability. Formatting and style belong to automated tools, not humans.",
      "**Authors make review easy**: one logical change per PR, a description of what and why, how it was tested, screenshots for UI, and a self-review of the diff before requesting review.",
    ],
  },
  underTheHood: {
    text: [
      "A PR is not a Git feature; it is a platform feature (GitHub, GitLab, Azure DevOps, Bitbucket) that compares two branches. CI is triggered by webhooks when you push; results attach to the head commit as **checks**.",
      "Branch protection blocks merging until required checks pass and approvals exist. A CODEOWNERS file auto-requests review from the team that owns a path (e.g. database migrations need the data team).",
      "Merge strategies: **merge commit** keeps every commit plus a merge commit; **squash** turns the PR into one commit (clean history, the PR title becomes the message); **rebase** replays commits linearly. Teams pick one and configure the repo to allow only that.",
    ],
    diagram: {
      title: "GitHub flow",
      nodes: [
        { label: "Branch", sub: "feature/x" },
        { label: "Commits", sub: "small steps" },
        { label: "PR", sub: "description" },
        { label: "CI + review", sub: "checks, comments" },
        { label: "Merge", sub: "squash to main" },
        { label: "Deploy", sub: "automated" },
      ],
      edges: ["", "push", "", "approved + green", ""],
    },
  },
  handsOn: [
    {
      title: "Branch, commit, push",
      code: {
        lang: "bash",
        code: `git switch main && git pull
git switch -c feat/health-endpoint
# ...edit files...
git add -p                      # stage hunk by hunk: forces you to review your own diff
git commit -m "Add /health endpoint returning service status"
git push -u origin feat/health-endpoint`,
      },
      notes: ["`git add -p` shows each change and asks y/n. It is the simplest self-review habit and catches debug prints and stray files."],
    },
    {
      title: "Open the PR from the terminal (optional)",
      code: { lang: "bash", code: `# GitHub CLI: https://cli.github.com
gh pr create --title "Add /health endpoint" --body-file .github/pull_request_template.md
gh pr checks --watch            # watch CI` },
      notes: ["The web UI does the same. The CLI is handy once you open PRs daily."],
    },
    {
      title: "A PR template that makes good descriptions the default",
      code: {
        lang: "markdown",
        file: ".github/pull_request_template.md",
        code: `## What
<!-- One or two sentences: what changes for the user or the system? -->

## Why
<!-- Link the issue. What problem does this solve? -->

## How to test
<!-- Commands or steps a reviewer can follow. -->

## Risk
<!-- Migrations? Config changes? Rollback plan? -->

- [ ] Tests added or updated
- [ ] No secrets or debug code`,
      },
    },
    {
      title: "Minimal CI with GitHub Actions",
      code: {
        lang: "yaml",
        file: ".github/workflows/ci.yml",
        code: `name: CI
on:
  pull_request:
  push:
    branches: [main]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: "3.12"
      - run: pip install -r requirements.txt
      - run: python -m pytest -q`,
      },
      notes: ["Then in Settings → Branches (or Rules), require this check and one approval for main."],
    },
    {
      title: "CODEOWNERS",
      code: {
        lang: "text",
        file: ".github/CODEOWNERS",
        code: `# path              owners
/services/ai/       @your-org/ai-team
/db/migrations/     @your-org/data-team
*.tf                @your-org/platform`,
      },
    },
    {
      title: "Writing review comments that help",
      code: {
        lang: "text",
        code: `Weak:   "This is wrong."
Better: "If items is empty, line 42 divides by zero. Could we return 0 early?
         A test for the empty case would lock this in."

Label intent so the author knows what blocks merging:
  blocking:  "This logs the password in plain text."
  question:  "Why a new HTTP client here instead of the shared one?"
  nit:       "Typo in the variable name (optional)."
  praise:    "Nice: this removed three duplicated queries."`,
      },
    },
  ],
  companies: [
    "**Small PRs are a measured norm.** Many engineering organisations track PR size and review time; teams practicing trunk-based development merge several small PRs per engineer per day, using feature flags to hide unfinished work.",
    "**Two-key rule for risky paths.** CODEOWNERS plus branch protection means database migrations, auth code or infrastructure files cannot merge without the owning team's approval.",
    "**Bots do the boring parts.** Formatters, linters, type checkers, dependency scanners and test coverage run in CI so humans spend review time on design, correctness and security.",
  ],
  mistakes: [
    { mistake: "Huge PRs", why: "Wanting to ship the whole feature at once", wrong: "Shallow reviews, painful conflicts, risky deploys", fix: "Split by layer or step (schema, then API, then UI) and use feature flags" },
    { mistake: "No description", why: "'The code speaks for itself'", wrong: "Reviewers guess intent and miss what matters", fix: "What, why, how to test, risk. Use a template" },
    { mistake: "Reviewing style instead of substance", why: "Style is easy to spot", wrong: "Nit storms while the real bug merges", fix: "Automate formatting; focus reviews on correctness, design, security, tests" },
    { mistake: "Taking review comments personally", why: "Code feels like part of you", wrong: "Defensive discussions slow the team", fix: "Review the code, not the person; ask questions; assume good intent" },
    { mistake: "Approving without running or reading tests", why: "Time pressure", wrong: "The review is theatre; bugs ship with a green tick", fix: "Read the tests first: they tell you what the author believes the code does" },
  ],
  bestPractices: [
    { tag: "Maintainability", text: "Aim for PRs under ~400 changed lines, one logical change each, with a clear title in the imperative mood." },
    { tag: "Reliability", text: "Protect main: required CI checks, at least one approval, no direct pushes, dismiss stale approvals on new commits for sensitive repos." },
    { tag: "Security", text: "Review for secrets, injection risks and permission changes; enable secret scanning and dependency alerts." },
    { tag: "Performance", text: "Review within one working day; slow reviews push people toward bigger PRs." },
  ],
  interview: [
    { q: "What do you look for when reviewing code?", a: "Correctness and edge cases first, then whether tests cover the behaviour, security issues (input handling, secrets, authz), design fit and naming, and finally performance where it matters. Style should be handled by tools. I phrase comments as suggestions or questions and mark which ones block." },
    { q: "How do you handle a large feature without a giant PR?", a: "Break it into vertical or layered steps that each merge safely: schema first, then backend behind a feature flag, then UI. Each PR is reviewable and deployable; the flag keeps unfinished work hidden." },
    { q: "Squash vs merge commits?", a: "Squash gives one clean commit per PR on main, easy to revert and read; you lose intermediate commits. Merge commits keep full history. Many teams squash for small PRs; the important thing is consistency." },
  ],
  quickCheck: [
    {
      kind: "mcq",
      prompt: "Which is the best use of human review time?",
      options: ["Checking indentation", "Checking the logic handles empty input and errors", "Checking import order", "Checking trailing whitespace"],
      answer: 1,
      explanation: "Formatting is automated. Humans add value on correctness, design and security.",
    },
    {
      kind: "mcq",
      prompt: "What does CODEOWNERS do?",
      options: ["Prevents forks", "Automatically requests reviews from owners of changed paths", "Encrypts files", "Runs tests"],
      answer: 1,
      explanation: "Combined with branch protection, it can require owner approval for those paths.",
    },
    {
      kind: "bug",
      prompt: "A team protects main with 'require 1 approval', yet broken code keeps merging. What is missing?",
      options: ["A README", "Required status checks (CI must pass)", "More branches", "Signed commits"],
      answer: 1,
      explanation: "Approval alone does not ensure tests pass. Require the CI check too.",
    },
  ],
  cheatSheet: [
    "Flow: branch → small commits → PR → CI + review → squash merge → delete branch.",
    "PR description: what, why, how to test, risk.",
    "`git add -p` = self-review while staging.",
    "Protect main: PR required, CI required, approvals required.",
    "Automate style; review correctness, design, security, tests.",
    "Label comments: blocking / question / nit / praise.",
    "Under ~400 lines per PR; split big features behind flags.",
  ],
  homework: {
    basic: {
      title: "Your first reviewed PR",
      brief: ["In a practice repo, add a PR template, open a PR that adds a small feature, and review your own diff in the GitHub UI leaving at least two comments as if you were the reviewer."],
      criteria: ["PR uses the template", "Two self-review comments with labels", "Merged with squash"],
      hints: ["Settings → General → Pull Requests lets you allow only squash merging."],
      solution: {
        text: ["The point is practising the reviewer's mindset on your own code: you will find at least one thing to improve. Typical findings are missing error handling, a hardcoded value, or a missing test."],
      },
    },
    intermediate: {
      title: "Review this code",
      brief: ["Write a code review (labelled comments) for the function below. Find at least four issues."],
      criteria: ["At least 4 issues found", "Each comment explains impact and suggests a fix", "Blocking vs nit clearly marked"],
      hints: ["Think: security, correctness, error handling, performance, naming."],
      solution: {
        text: [
          "blocking (security): SQL built with an f-string allows SQL injection; use parameters. blocking (correctness): division by zero when there are no orders. blocking (security/privacy): logging the full user record may leak personal data. question (performance): fetching all orders to count them in Python; use COUNT/AVG in SQL. nit: `d` and `x` names; `calc` is vague.",
        ],
        code: {
          lang: "python",
          file: "under_review.py",
          code: `def calc(db, email):
    user = db.query(f"SELECT * FROM users WHERE email = '{email}'")[0]
    print("user:", user)
    d = db.query(f"SELECT total FROM orders WHERE user_id = {user['id']}")
    x = sum(r["total"] for r in d)
    return x / len(d)

# A reviewed version:
def average_order_value(db, email: str) -> float:
    row = db.query_one(
        "SELECT AVG(o.total) AS avg_total FROM orders o JOIN users u ON u.id = o.user_id WHERE u.email = %s",
        (email,),
    )
    return float(row["avg_total"] or 0.0)`,
        },
      },
    },
    challenge: {
      title: "Contribute to open source",
      brief: ["Find a 'good first issue' in an open-source project you use. Fork, fix, and open a PR following the project's CONTRIBUTING guide. Even a documentation fix counts."],
      criteria: ["PR follows the project's contribution rules", "Description links the issue", "You responded to review feedback"],
      hints: ["GitHub search: label:\"good first issue\" language:python state:open"],
      solution: {
        text: ["Read CONTRIBUTING.md first, comment on the issue before starting, keep the change minimal, run the project's tests locally, and reply to every review comment. A merged OSS PR is strong portfolio evidence."],
      },
    },
    capstone: {
      title: "DevAtlas: team-ready repository",
      brief: ["Add a PR template, CODEOWNERS, a CI workflow running the AI service tests, and branch protection requiring CI. From now on every DevAtlas change goes through a PR."],
      criteria: ["Template and CODEOWNERS committed", "CI runs on PRs", "main requires the CI check"],
      hints: ["Reuse the workflow from the hands-on section."],
      solution: {
        text: ["Even solo, working through PRs gives you a reviewable history and CI gates, which interviewers look at when they browse your GitHub."],
      },
    },
  },
  deeper: [
    { label: "GitHub Docs: About pull requests", url: "https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/proposing-changes-to-your-work-with-pull-requests/about-pull-requests" },
    { label: "Google Engineering Practices: Code Review", url: "https://google.github.io/eng-practices/review/" },
    { label: "GitHub Docs: About code owners", url: "https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-code-owners" },
    { label: "Conventional Comments", url: "https://conventionalcomments.org/" },
  ],
  nextPreview: "Next: your dev environment. VS Code, package managers and Docker Desktop, set up so that 'works on my machine' becomes 'works on every machine'.",
};
