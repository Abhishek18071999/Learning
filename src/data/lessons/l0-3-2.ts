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
        text: [
          "The point is practising the reviewer's mindset on your own code: you will find at least one thing to improve. Typical findings are missing error handling, a hardcoded value, or a missing test.",
          "first-pr.md is a complete worked example: repo settings for squash-only merging, a filled-in template, two labelled self-review comments with concrete inputs and outputs, the fix commit and the merge. GitHub does not let you approve your own PR, so leave the comments as a 'Comment' review. The slugify outputs quoted in the comments come from running both versions, and the three test cases pass on the fixed version.",
        ],
        code: { lang: "markdown", file: "first-pr.md", code: `# First reviewed PR: "Add slugify() for lesson URLs" (practice repo pr-practice)

## 1. Repo settings: squash only, delete merged branches
\`\`\`bash
gh repo edit --enable-squash-merge --enable-merge-commit=false \\
  --enable-rebase-merge=false --delete-branch-on-merge
\`\`\`
(Web UI: Settings > General > Pull Requests.)

## 2. PR description (filled from .github/pull_request_template.md)
~~~markdown
## What
Adds \`slugify(title)\` in \`textutils.py\`, turning a lesson title into a URL slug:
"DNS & TLS 101" -> "dns-tls-101".

## Why
Closes #1. Lesson URLs currently use numeric ids, which are unreadable when shared.

## How to test
\`python -m pytest -q test_textutils.py\` (3 cases, including edge punctuation and accents)

## Risk
Low. New function, no callers yet. No migrations or config changes.

- [x] Tests added or updated
- [x] No secrets or debug code
~~~

## 3. Self-review comments (Files changed tab, on the first commit)
textutils.py, line 5: \`return re.sub(r"[^a-z0-9]+", "-", title.lower())\`

> **blocking:** Leading and trailing punctuation becomes a hyphen:
> \`slugify("  Hello, World! ")\` returns \`"-hello-world-"\`, which gives URLs like
> \`/lessons/-hello-world-\`. Suggest \`.strip("-")\` on the result, plus a test case.

> **question:** Non-ASCII letters are dropped, not transliterated:
> \`slugify("Café Menu")\` returns \`"caf-menu"\`. Should we normalise with
> \`unicodedata.normalize("NFKD", ...)\` and keep the ASCII part, giving \`"cafe-menu"\`?
> Fine to defer if all titles are English, but then say so in a docstring.

## 4. Fix pushed in a second commit: "Strip edge hyphens and transliterate accents"
Both threads answered with a link to the commit and marked resolved. Tests:
\`("DNS & TLS 101", "dns-tls-101")\`, \`("  Hello, World! ", "hello-world")\`, \`("Café Menu", "cafe-menu")\`: 3 passed.

## 5. Merge
\`\`\`bash
gh pr checks --watch
gh pr merge --squash --delete-branch --subject "Add slugify() for lesson URLs (#2)"
\`\`\`
Result on main: one commit, "Add slugify() for lesson URLs (#2)". The branch is deleted.` },
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
        text: [
          "Read CONTRIBUTING.md first, comment on the issue before starting, keep the change minimal, run the project's tests locally, and reply to every review comment. A merged OSS PR is strong portfolio evidence.",
          "oss.sh wraps the workflow in GitHub CLI commands: find candidate issues, read the issue and CONTRIBUTING, claim the issue with a comment, fork with --clone (origin is your fork, upstream is theirs) and work on a branch. Then push and open a PR whose body starts with `Fixes #N`, so GitHub links the issue and closes it on merge. After review, push follow-up commits to the same branch; the PR updates itself.",
        ],
        code: { lang: "bash", file: "oss.sh", code: `#!/usr/bin/env bash
# Open-source contribution workflow with the GitHub CLI (gh auth login first).
#   ./oss.sh find                          list fresh "good first issue"s
#   ./oss.sh start  <owner/repo> <issue>   read rules, fork, clone, branch
#   ./oss.sh pr     <owner/repo> <issue>   push and open the PR (run inside the clone)
#   ./oss.sh update                        after review: push fixes, show threads
set -euo pipefail

cmd="\${1:-}"
repo="\${2:-}"
issue="\${3:-}"
need_args() { [[ -n "$repo" && "$issue" =~ ^[0-9]+$ ]] || { echo "usage: $0 $cmd <owner/repo> <issue-number>" >&2; exit 2; }; }

case "$cmd" in
  find)
    gh search issues --label "good first issue" --language python --state open \\
      --no-assignee --sort updated --limit 15 ;;
  start)
    need_args
    gh issue view "$issue" --repo "$repo" --comments     # is someone already on it?
    for f in CONTRIBUTING.md .github/CONTRIBUTING.md docs/CONTRIBUTING.md; do
      gh api "repos/$repo/contents/$f" -H "Accept: application/vnd.github.raw" 2>/dev/null && break
    done
    read -rp "Comment on the issue to claim it first? [y/N] " ok
    if [[ "$ok" == y ]]; then
      gh issue comment "$issue" --repo "$repo" \\
        --body "I'd like to take this one. I plan to keep the change minimal and add a test. I'll open a PR within a few days."
    fi
    gh repo fork "$repo" --clone --default-branch-only   # origin = your fork, upstream = theirs
    cd "\${repo#*/}"
    git remote set-head upstream --auto                 # so upstream/HEAD names their default branch
    git switch -c "fix/issue-$issue"
    echo "Now: make the change, run the project's own test/lint commands, commit."
    echo "Then from $(pwd): ../oss.sh pr $repo $issue" ;;
  pr)
    need_args
    [[ -z "$(git status --porcelain)" ]] || { echo "error: commit or stash your changes first" >&2; exit 1; }
    branch=$(git branch --show-current)
    title=$(git log -1 --format=%s)
    git push -u origin "$branch"
    gh pr create --repo "$repo" --head "$(gh api user --jq .login):$branch" --title "$title" \\
      --body "Fixes #$issue

## What
$(git log --format='- %s' "upstream/HEAD..HEAD")

## How I tested
Ran the project's test suite locally as described in CONTRIBUTING.md; all tests pass.

I'm new to this codebase, so feedback on style or approach is very welcome." ;;
  update)
    git push                                           # new commits update the PR
    gh pr view --comments
    gh pr checks ;;
  *)
    echo "usage: $0 find | start <owner/repo> <issue> | pr <owner/repo> <issue> | update" >&2
    exit 2 ;;
esac` },
        pitfalls: ["Working on your fork's main branch, so every later change lands in the same PR", "Reformatting files you did not need to touch, which buries the real change"],
      },
    },
    capstone: {
      title: "DevAtlas: team-ready repository",
      brief: ["Add a PR template, CODEOWNERS, a CI workflow running the AI service tests, and branch protection requiring CI. From now on every DevAtlas change goes through a PR."],
      criteria: ["Template and CODEOWNERS committed", "CI runs on PRs", "main requires the CI check"],
      hints: ["Reuse the workflow from the hands-on section."],
      solution: {
        text: [
          "Even solo, working through PRs gives you a reviewable history and CI gates, which interviewers look at when they browse your GitHub.",
          "ci.yml has two jobs whose names (ai-tests, scripts-lint) become the required checks. There is deliberately no `paths:` filter. Until Phase 1 creates services/ai, the pip and pytest steps are skipped and the check still reports success.",
          "protect-main.sh creates a ruleset through the REST API: PR required, squash only, both checks required and the branch must be up to date (strict), no force pushes or deletion. Approvals are 0 because GitHub does not let you approve your own PR; raise it to 1 and turn on code-owner review when a second person joins.",
        ],
        code: { lang: "yaml", file: ".github/workflows/ci.yml", code: `name: CI
on:
  pull_request:
  push:
    branches: [main]
permissions:
  contents: read
concurrency:
  group: ci-\${{ github.ref }}
  cancel-in-progress: true
jobs:
  ai-tests:
    name: ai-tests                      # this exact name is the required check
    runs-on: ubuntu-latest
    timeout-minutes: 10
    defaults:
      run:
        working-directory: services/ai
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: "3.12"
      # No paths filter: a required check that never runs blocks every PR.
      # Until Phase 1 creates services/ai, the steps skip and the check still reports success.
      - if: hashFiles('services/ai/requirements.txt') != ''
        run: python -m pip install -r requirements.txt
      - if: hashFiles('services/ai/requirements.txt') != ''
        run: python -m pytest -q
  scripts-lint:
    name: scripts-lint
    runs-on: ubuntu-latest
    timeout-minutes: 5
    steps:
      - uses: actions/checkout@v4
      - run: shellcheck scripts/*.sh     # preinstalled on GitHub's Ubuntu runners

# ---- .github/CODEOWNERS ----
# Later lines win. Solo for now; swap in team handles (@org/team) as people join.
*                    @devatlas-asha
/services/ai/        @devatlas-asha
/.github/            @devatlas-asha
/scripts/            @devatlas-asha

# ---- .github/pull_request_template.md ----
## What
<!-- One or two sentences: what changes for the user or the system? -->

## Why
<!-- Link the issue: "Closes #12". What problem does this solve? -->

## How to test
<!-- Commands a reviewer can run, e.g. ./scripts/dev.sh test -->

## Risk
<!-- Migrations? Config changes? Rollback plan? -->

- [ ] Tests added or updated
- [ ] No secrets or debug code

# ---- scripts/protect-main.sh ----
#!/usr/bin/env bash
# Create a ruleset on the default branch: PR required, CI required, no force pushes.
# Run inside the repo after \`gh auth login\`. Settings > Rules > Rulesets shows the result.
set -euo pipefail
gh api --method POST "repos/{owner}/{repo}/rulesets" --input - <<'JSON'
{
  "name": "protect-main",
  "target": "branch",
  "enforcement": "active",
  "conditions": { "ref_name": { "include": ["~DEFAULT_BRANCH"], "exclude": [] } },
  "rules": [
    { "type": "deletion" },
    { "type": "non_fast_forward" },
    { "type": "pull_request",
      "parameters": {
        "required_approving_review_count": 0,
        "dismiss_stale_reviews_on_push": true,
        "require_code_owner_review": false,
        "require_last_push_approval": false,
        "required_review_thread_resolution": true,
        "allowed_merge_methods": ["squash"]
      } },
    { "type": "required_status_checks",
      "parameters": {
        "strict_required_status_checks_policy": true,
        "required_status_checks": [ { "context": "ai-tests" }, { "context": "scripts-lint" } ]
      } }
  ]
}
JSON
echo "ruleset created: direct pushes to main are now rejected"` },
        pitfalls: ["A paths filter on a required workflow: PRs that do not touch those paths wait forever for a check that never runs", "Requiring an approval on a solo repo, which blocks every PR"],
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
