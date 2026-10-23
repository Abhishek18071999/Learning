import type { Lesson } from "../../types";

export const lesson: Lesson = {
  id: "0.3.2",
  title: "Team workflow: pull requests and code review",
  minutes: 75,
  level: "Beginner",
  prerequisites: ["0.3.1 Git: commits, branches, merges and conflicts", "A GitHub account"],
  summary: "Work like a professional team: small branches, PRs a reviewer can actually read, code review that finds real problems, CI and CODEOWNERS as guardrails, and a merge strategy you can revert.",
  terms: [
    { term: "Pull request (PR)", def: "A request to merge one branch into another, with a place for discussion, review and automated checks. GitLab calls it a merge request; the Git object it compares is just two commits." },
    { term: "Code review", def: "Another engineer reads your change before it merges, to catch bugs, share knowledge and keep the codebase consistent. It is a gate on the main branch, not a rubber stamp." },
    { term: "Review latency", def: "The time from requesting review to the first substantive response. Most of it is queue time, not reading time, which is why small PRs and fast reviewer response matter more than reviewer brilliance." },
    { term: "Trunk-based development", def: "Everyone integrates into one shared branch (trunk/main) at least daily. Branches live hours, not weeks, and incomplete work hides behind feature flags instead of long-lived branches." },
    { term: "Feature flag", def: "A runtime switch that turns code paths on or off without deploying again. It lets unfinished work merge safely, decouples deploy from release, and gives you a rollback lever that is faster than a revert." },
    { term: "GitFlow", def: "A branching model with long-lived develop and main branches plus release/* and hotfix/* branches. Suited to versioned, scheduled releases; costly for a team deploying several times a day." },
    { term: "Release branch", def: "A branch cut for a version that receives only fixes (release/1.4). Common for mobile apps, libraries and regulated software where several versions must be supported at once." },
    { term: "Branch protection", def: "Rules on main such as 'require a PR, passing checks, an approval and an up-to-date branch'. Enforced by the platform, so a tired human cannot bypass the process." },
    { term: "CODEOWNERS", def: "A file that maps paths to people or teams and auto-requests their review. With code-owner review required, risky paths (auth, migrations, infrastructure) cannot merge without the owner's approval." },
    { term: "Merge commit", def: "A commit with two parents that ties a branch back into main and preserves every original commit and SHA. The history shows exactly when and where work joined." },
    { term: "Squash merge", def: "Combines all commits of a PR into one new commit on main. The PR becomes one revertible unit; the individual commits remain reachable from the PR but not from main's history." },
    { term: "Stacked PR", def: "A chain of small PRs where each branch is based on the one below it. Each review sees only its layer; the bottom merges first, then the next is retargeted and rebased." },
  ],
  problem: [
    "A developer pushes 2,000 lines across 40 files in a PR titled \"updates\". The reviewer has twenty minutes before standup, skims the diff, approves, and a migration that drops a column ships with the release. Nobody lied: a review happened. It just could not work at that size.",
    "Small PRs are not an aesthetic preference; they change the economics of delivery. Review is a queue, and a 2,000-line diff does not get ten times the reading time. Rollback is a `git revert`, and the blast radius is whatever that one commit touched. Bisecting a bug is cheap when each commit is one idea. This lesson builds the system that makes small changes the default: how to branch, how to describe a change, how to review and be reviewed, what automation should own, and which merge strategy keeps main both readable and revertible.",
  ],
  concept: {
    analogy: [
      "A PR is an article submitted to an editor. A 700-word piece with a clear headline, a one-paragraph summary and a note on what to check gets a careful read and useful edits. A 300-page manuscript labelled \"misc\" gets a rubber stamp, because the editor has no way to hold the whole argument in mind. The editor's attention is the scarce resource, not their goodwill.",
      "Rollback is the second half of the analogy. Backing out a small article is tearing out one page; backing out a quarter's work is reprinting the book. A small PR is a single drawer you can close again. A large one is a load-bearing wall: by the time you discover it is wrong, other changes have been built on top of it.",
    ],
    precise: [
      "**Why small PRs win.** Review latency is dominated by waiting, not reading: a reviewer with two free hours and five PRs in the queue will not give your large PR 24 minutes of uninterrupted attention. Small changes get reviewed sooner, more thoroughly and more often, and each review round is short enough to finish in one sitting. Defect detection also falls with size: a reviewer can hold one self-contained change and its tests in working memory, but not forty files of mixed intent. Google's public review guide calls roughly 100 changed lines a reasonable size, 1,000 usually too large, and asks reviewers to respond within one business day (verified in this lesson). Rollback and diagnosis follow the same logic: one logical change is one commit to revert and a narrow range to bisect. \"Small\" means one self-contained change with its tests, not a line-count law; 200 lines spread over 40 files can be harder to review than 400 lines in one coherent module.",
      "**Branching is a bet about integration cost.** Trunk-based development keeps branches alive for hours, merges into main several times a day, and hides unfinished behaviour behind feature flags; it needs fast CI, good monitoring and the discipline to delete flags. GitHub flow is the lightweight web default: one short-lived feature branch, a PR into main, deploy from main. GitFlow adds long-lived `develop`, `release/*` and `hotfix/*` branches so a version can be stabilised while the next one is built; it fits scheduled, versioned releases and costs you merge ceremony on every change. Release branches (`release/1.4`) keep patching old versions after main has moved on, which is normal for mobile apps, libraries and regulated software, but every fix must land twice (main and the release line). Choose by release cadence, how many versions you support, how fast CI is, and whether you can roll back a deploy. A continuously deployed web app usually wants trunk or GitHub flow; GitFlow is not \"more professional\", it is a different cost model.",
      "**The anatomy of a reviewable PR.** The title says what changed in the imperative, with a scope: `feat(api): add GET /health`, not `updates`. The description answers why before what: the problem, a linked issue (`Closes #12`), what changed, how a reviewer can test it, risk and rollback, and screenshots or a short recording for UI. Commit hygiene is part of the description: each commit is one idea that builds and passes tests, the subject is imperative and under ~72 characters, and the body explains why, not what the diff already shows. Do not mix a rename or reformat with a behaviour change; the reviewer cannot see the real change through the noise. Review your own diff before requesting review, and open a draft PR if you want early direction. When you comment, label intent so the author knows what blocks: `praise:`, `suggestion:`, `issue: (blocking)`, `nitpick: (non-blocking)`, `question:`. The label is not bureaucracy; it is how a thread of twenty comments becomes a decision.",
      "**What review is for, and what automation is for.** Humans look for correctness and edge cases, tests that would actually fail if the code broke, security (authorization, input handling, secrets, sensitive logging), design and naming, scope creep, and migration or documentation gaps. They should not spend attention on formatting, import order or trailing whitespace; a formatter and a linter own those. Branch protection turns the process into a gate: a PR is required, named checks must be green, the branch must be up to date, stale approvals are dismissed, and CODEOWNERS routes risky paths to the team that owns them. Merge strategy is a team-wide choice enforced by the repository. A merge commit preserves all commits and the topology; a squash produces one clean, revertible commit per PR; a rebase replays commits linearly and rewrites their SHAs. Stacked PRs keep each review small when a feature is genuinely large: each branch builds on the one below, and the stack merges bottom-up. Finally, feedback is about the code: fix it or explain it, push a commit rather than arguing in the abstract, resolve the thread, and ask for re-review when the diff has changed.",
    ],
  },
  underTheHood: {
    text: [
      "1. **A PR is two refs plus metadata, not a Git object.** The platform stores a base branch (for example `main`), a head branch (`feat/health-endpoint`) and a number. It advertises synthetic refs such as `refs/pull/4/head` (your commits) and `refs/pull/4/merge` (a trial merge), which is why CI can test a merge that does not exist on either branch. The review view is computed from the **merge base**, the last commit the two branches share: `git diff main...HEAD` (three dots) shows what your branch added since it diverged. Two dots (`main..HEAD`) compares the two tips and would show changes made on main as if you had reversed them.",
      "2. **What the reviewer sees is a function of history, not just the final tree.** Opening the PR runs the same merge-base calculation, so a rebase or a force-push changes the commit IDs and can orphan inline comments and collapse the \"changes since your last review\" view. That is why mid-review force-pushes need a warning and a summary of what moved. It is also why the diff can look small even when the branch is behind: the PR shows your delta, but the merge result may need a conflict resolution that nobody reviewed. Branch protection's \"require branches to be up to date\" exists to force that resolution into the PR, where it is visible.",
      "3. **Checks are attached to a commit SHA and re-evaluated on every push.** A push fires a webhook (`pull_request` with action `opened`, `synchronize` or `reopened`), the CI system creates check runs on the head SHA, and branch protection reads their conclusions. Required checks are matched by name, so renaming a job silently removes the gate. A `paths:` filter on a required workflow is a classic deadlock: PRs outside those paths wait forever for a check that never starts. A merge queue goes further: it builds the combination of your branch plus everything ahead of it, so two individually green PRs cannot break main together.",
      "4. **CODEOWNERS is routing; branch protection is enforcement.** The file matches changed paths against patterns, and the **last matching pattern wins**, so a broad `*` rule followed by `/db/migrations/ @org/data-team` routes migrations to the data team. Team handles expand to their members. Routing alone only requests a review; the gate exists when the ruleset enables \"require review from code owners\" and the owner's approval is still present on the latest commit. Settings such as dismissing stale approvals after a push and requiring approval of the last push close the window where an approval covers code the approver never saw.",
      "5. **The three merge strategies produce three different graphs and three different revert stories.** A merge commit has two parents and preserves the original SHAs, so `git log --graph` shows the branch and `git bisect` can land on the exact intermediate commit. A squash creates one commit whose tree equals the merge result but whose only parent is the old main tip; the branch commits become unreachable from main, which is why `git log` is clean and why reverting the PR is one operation. A rebase replays each commit as a new patch on top of the new base, producing new SHAs and a linear history; conflicts are resolved per commit, and anyone who already pulled the old branch now has a diverged history. `git merge --squash` deliberately stops before committing and prints `Squash commit -- not updating HEAD`; the platform performs the commit for you.",
      "6. **Rollback is a design property, not an emergency procedure.** `git revert <sha>` records the inverse change as a new commit, so history stays honest. Reverting a merge commit needs `git revert -m 1 <sha>` to say which parent is the mainline; reverting a squash is an ordinary revert but undoes the whole PR at once, which is safe precisely because the PR was one logical change. Schema changes break the symmetry: reverting application code does not un-drop a column, so migrations use expand/contract (add the new column, dual-write, switch reads, then remove the old one) and feature flags let you stop using a change without rewriting history. Small PRs make all of this cheap: fewer files to conflict, fewer dependants, and a bisect range you can actually inspect.",
      "7. **Review latency is a queueing problem.** If a reviewer can review six PRs a day and ten arrive, the queue grows no matter how fast they read; the fix is smaller batches, a work-in-progress limit, and reviewers treating a first response as a service-level objective. Response time matters more than total time: a quick \"I will look after lunch, here are two initial concerns\" unblocks the author and starts the design conversation early. Draft PRs and stacked PRs keep the author productive while a review waits, but they do not reduce the reviewer's load. Useful metrics are time to first review, number of review rounds, PR size and time to merge; a team optimizing only \"PRs merged per week\" will learn to rubber-stamp.",
      "8. **Stacked PRs trade one big review for a pipeline of small ones.** Branch B is cut from A, C from B, and each PR targets the branch below it, so PR B's diff contains only B's layer. CI runs per layer, reviewers can work in parallel, and the author keeps coding instead of waiting. The cost is merge order: A merges first, B is retargeted to main and rebased, then C, and a change at the bottom forces a rebase of everything above it. Tools such as Graphite, Sapling and git-branchless automate the retargeting; without them, keep stacks two or three deep and never let a stack become a second long-lived branch.",
    ],
    diagram: {
      title: "One small PR, from branch to main",
      nodes: [
        { label: "Branch", sub: "feat/health-endpoint" },
        { label: "Commits", sub: "test first, then code" },
        { label: "PR", sub: "diff vs merge base" },
        { label: "Checks + review", sub: "CI, CODEOWNERS" },
        { label: "Merge", sub: "squash to main" },
      ],
      edges: ["push", "open", "webhook", "green + approved"],
      caption: "The PR compares your branch to the merge base, CI attaches results to the head commit, and protection decides when the merge button unlocks.",
    },
  },
  handsOn: [
    {
      title: "Build a small PR and read its diff",
      text: [
        "Run this in an empty directory. It creates a throwaway repository, writes a failing test for `GET /health`, implements the route, and prints the three views a reviewer uses: the branch graph, the diffstat and the test result. The change is two files and seven added lines, which is the point.",
      ],
      code: {
        lang: "bash",
        file: "small-pr.sh",
        code: `#!/usr/bin/env bash
# Build a small PR from scratch, then inspect it the way a reviewer will.
set -euo pipefail

work="\${1:-pr-lab}"
rm -rf "$work" && mkdir "$work" && cd "$work"
git init -q -b main
git config user.name "DevAtlas Learner"
git config user.email "learner@example.com"

cat > app.py <<'PY'
"""Tiny DevAtlas lesson service: routing only, no framework."""

ROUTES = {
    "/lessons": lambda: (200, [{"id": "0.3.2", "title": "Team workflow"}]),
}


def handle(path: str):
    handler = ROUTES.get(path)
    if handler is None:
        return 404, {"error": "not found"}
    return handler()
PY

cat > test_app.py <<'PY'
from app import handle


def test_lessons_route():
    status, body = handle("/lessons")
    assert status == 200
    assert body[0]["id"] == "0.3.2"
PY

git add .
git commit -qm "Add lesson service skeleton and tests"

# --- the PR: one branch, two commits, one behaviour ---
git switch -qc feat/health-endpoint

cat >> test_app.py <<'PY'


def test_health_reports_ok():
    status, body = handle("/health")
    assert status == 200
    assert body == {"status": "ok"}
PY
git add test_app.py
git commit -qm "Test /health returns 200 and an ok body"

echo "--- test written first: it must fail ---"
python -m pytest -q || true

python - <<'PY'
from pathlib import Path
p = Path("app.py")
p.write_text(p.read_text().replace(
    'ROUTES = {\\n',
    'ROUTES = {\\n    "/health": lambda: (200, {"status": "ok"}),\\n',
))
PY
git add app.py
git commit -qm "Serve /health with a status body"

echo
echo "--- the branch ---"
git log --oneline --graph --decorate --all
echo
echo "--- what the reviewer downloads ---"
git diff --stat main...HEAD
echo
echo "--- tests on the branch ---"
python -m pytest -q
`,
      },
      output: `--- test written first: it must fail ---
.F                                                                       [100%]
================================== FAILURES ===================================
___________________________ test_health_reports_ok ____________________________

    def test_health_reports_ok():
        status, body = handle("/health")
>       assert status == 200
E       assert 404 == 200

test_app.py:12: AssertionError
=========================== short test summary info ===========================
FAILED test_app.py::test_health_reports_ok - assert 404 == 200
1 failed, 1 passed in 0.08s

--- the branch ---
* edf3fcb (HEAD -> feat/health-endpoint) Serve /health with a status body
* 8216e26 Test /health returns 200 and an ok body
* 5537112 (main) Add lesson service skeleton and tests

--- what the reviewer downloads ---
 app.py      | 1 +
 test_app.py | 6 ++++++
 2 files changed, 7 insertions(+)

--- tests on the branch ---
..                                                                       [100%]
2 passed in 0.01s`,
      notes: [
        "The first run is red on purpose: the test exists before the route. A reviewer can see the failing assertion become green, which is stronger evidence than \"tests pass\".",
        "`git diff main...HEAD` uses three dots, so it compares the merge base with your branch. If main moved since you branched, this is still exactly your change, not main's changes reversed.",
      ],
    },
    {
      title: "Fill in the PR description before you ask for review",
      text: [
        "A template is only useful when its fields force a decision. This is the small PR from step 1, written for a reviewer who has no context. Notice the title, the linked issue, the exact test command, and the risk section: together they answer why, what, how and what could go wrong.",
      ],
      code: {
        lang: "markdown",
        file: "pull-request.md",
        code: `Title: feat(api): add GET /health endpoint

## What changed
Adds \`GET /health\` to the lesson service. It returns \`200\` with
\`{"status": "ok"}\` and no database or downstream calls, so it is safe for
the load balancer to poll every 5 seconds.

The test is in \`test_app.py\`; the route is one line in \`ROUTES\`.

## Why
Closes #12. The load balancer is being switched from TCP checks to HTTP
checks next week. Without a real endpoint, every deploy would spend ~30 s
registering as unhealthy, and the rolling deploy would stall.

## How to test
\`python -m pytest -q test_app.py\`, then \`curl -i http://localhost:8000/health\`.
Expected: \`200 OK\` and \`{"status": "ok"}\`.

## Risk and rollback
Low. New route, no existing code path changes, no migrations or config.
Rollback is \`git revert <squash-commit>\`; the load balancer would fall back
to the TCP check it used before, so there is no outage window.

## Screenshots
Not applicable: JSON endpoint, no UI change. Response body is in the
"How to test" section instead.

- [x] Tests added or updated
- [x] No secrets or debug code
- [x] Self-reviewed the diff before requesting review`,
      },
      notes: [
        "The title is imperative and scoped; a reader knows what to expect before opening the diff. `Closes #12` links the issue and closes it on merge.",
        "The 'Why' is the part authors skip and reviewers need most. \"Add /health\" describes the diff; the load balancer story explains why the diff should exist at all.",
        "Screenshots are for UI changes. Saying why they are not applicable is better than leaving a checkbox empty or pasting a screenshot of a terminal that hides the test command.",
        "Risk turns a reviewer's vague unease into a concrete question: what happens if this is wrong, and how do we undo it? For a schema change, this is where expand/contract belongs.",
      ],
    },
    {
      title: "Merge the same two commits three ways",
      text: [
        "This script builds a base repository, adds the health feature on a branch, moves main forward, then applies each merge strategy in a fresh clone. Compare the graphs. The feature commits are identical every time; only the history and the revert unit change.",
      ],
      code: {
        lang: "bash",
        file: "merge-strategies.sh",
        code: `#!/usr/bin/env bash
# The same two commits merged three ways: merge commit, squash, rebase.
set -euo pipefail

work="\${1:-merge-lab}"
rm -rf "$work" && mkdir "$work" && cd "$work"
git init -q -b main base && cd base
git config user.name "DevAtlas Learner"
git config user.email "learner@example.com"

cat > app.py <<'PY'
ROUTES = {
    "/lessons": lambda: (200, [{"id": "0.3.2"}]),
}
PY
git add app.py && git commit -qm "Add lessons route"

# The PR: two commits on a branch.
git switch -qc feat/health
python - <<'PY'
from pathlib import Path
p = Path("app.py")
p.write_text(p.read_text().replace(
    'ROUTES = {\\n',
    'ROUTES = {\\n    "/health": lambda: (200, {"status": "ok"}),\\n',
))
PY
git add app.py && git commit -qm "Serve /health with a status body"
echo "Health: GET /health -> 200 {status: ok}" > README.md
git add README.md && git commit -qm "Document the health contract"

# Meanwhile main moves on: the branch is now behind.
git switch -q main
python - <<'PY'
from pathlib import Path
p = Path("app.py")
p.write_text(p.read_text().replace(
    '    "/lessons": lambda: (200, [{"id": "0.3.2"}]),\\n',
    '    "/lessons": lambda: (200, [{"id": "0.3.2"}]),\\n'
    '    "/version": lambda: (200, {"version": "1"}),\\n',
))
PY
git add app.py && git commit -qm "Add version route"

cd ..
for mode in merge squash rebase; do
  git clone -q base "$mode"
  cd "$mode"
  git config user.name "DevAtlas Learner"
  git config user.email "learner@example.com"
  git switch -qc feat/health origin/feat/health
  git switch -q main
  echo
  echo "=== $mode ==="
  case "$mode" in
    merge)
      git merge -q --no-ff feat/health -m "Merge branch 'feat/health'" ;;
    squash)
      git merge -q --squash feat/health
      git commit -qm "Add /health endpoint (#4)" ;;
    rebase)
      git rebase -q main feat/health
      git switch -q main
      git merge -q --ff-only feat/health ;;
  esac
  git log --graph --oneline --decorate main feat/health
  cd ..
done
`,
      },
      output: `=== merge ===
Auto-merging app.py
*   4f8eac0 (HEAD -> main) Merge branch 'feat/health'
|\\  
| * 2c191c3 (origin/feat/health, feat/health) Document the health contract
| * 689130a Serve /health with a status body
* | e6dfc91 (origin/main, origin/HEAD) Add version route
|/  
* ae5e930 Add lessons route

=== squash ===
Auto-merging app.py
Squash commit -- not updating HEAD
* 06f157b (HEAD -> main) Add /health endpoint (#4)
* e6dfc91 (origin/main, origin/HEAD) Add version route
| * 2c191c3 (origin/feat/health, feat/health) Document the health contract
| * 689130a Serve /health with a status body
|/  
* ae5e930 Add lessons route

=== rebase ===
* 6189118 (HEAD -> main, feat/health) Document the health contract
* 2fbec6c Serve /health with a status body
* e6dfc91 (origin/main, origin/HEAD) Add version route
* ae5e930 Add lessons route`,
      notes: [
        "Merge commit: two parents. Every original commit and SHA survives, so the graph shows where the branch joined. `git bisect` can land on the intermediate commit; reverting needs `git revert -m 1 <merge-sha>`.",
        "Squash: one commit on main named after the PR. The two feature commits still exist in the PR, but not in main's history. Reverting is one ordinary `git revert`, which is why many teams squash small PRs.",
        "Rebase: the two commits are replayed on top of the new main with new SHAs, giving linear history. Never rebase a branch someone else has based work on; their history will not match yours.",
        "The `Squash commit -- not updating HEAD` line is Git being explicit: `--squash` stages the result and waits for you to write the commit message. GitHub does that commit for you.",
      ],
    },
    {
      title: "Compare branching strategies before choosing one",
      text: [
        "There is no universally correct branching model; there is a release cadence, a number of supported versions, and a CI budget. Read this table against your own product, not against what a famous company does.",
      ],
      code: {
        lang: "text",
        file: "branching-strategies.txt",
        code: `strategy        branches you keep              integration point             rollback lever                needs                                fits                              main cost
trunk-based     main only; branches live hours  many PRs per day into main    revert 1 commit or flag off   very fast CI, flags, monitoring      continuously deployed services    flag debt; needs discipline
GitHub flow     one short feature branch       PR into main, usually squash  revert the squash commit      PR checks, branch protection         web apps, OSS, small teams         review latency stalls the branch
GitFlow         main, develop, release/*,      feature -> develop,           revert on the release line;   heavy CI, merge automation,          versioned desktop/mobile,          integration debt,
                hotfix/*                       release -> main + tag         hotfix branch                 scheduled release testing            scheduled releases                 merge ceremony
release branch  main plus release/1.4, ...     fix on main, cherry-pick to   patch tag on release line     backport CI, version matrix          libraries, many supported          fixes land twice; drift
                                               the release branch                                                                                 versions, regulated software`,
      },
      notes: [
        "Trunk-based and GitHub flow are close relatives: both keep main releasable and branches short. The difference is how often you integrate and how much unfinished work travels behind flags.",
        "GitFlow is not wrong; it answers a different question (how do we stabilise 2.3 while 2.4 is in progress?). If you deploy on every merge, its long-lived branches add integration cost without buying you anything.",
        "Release branches are a support promise. Every fix must be cherry-picked and tested on the old line, and main must not accidentally depend on a change that only exists there.",
      ],
    },
    {
      title: "Map the review lifecycle and its gates",
      text: [
        "A PR is a small state machine. Drawing it makes the gates explicit: what must be true before review starts, what sends the change back, and what unlocks merge. Paste this into a GitHub issue or your team docs; it renders natively in Markdown.",
      ],
      code: {
        lang: "mermaid",
        file: "pr-lifecycle.mmd",
        code: `stateDiagram-v2
  [*] --> Draft: push branch, open draft PR
  Draft --> Ready: description + self-review
  Ready --> InReview: request review, CI starts
  InReview --> ChangesRequested: blocking issue
  InReview --> Approved: checks green + approval
  ChangesRequested --> InReview: push fix, resolve threads
  Approved --> Merged: up to date + queue passes
  Merged --> [*]
  note right of Approved: CODEOWNERS approval for owned paths; new pushes dismiss stale approvals.`,
      },
      notes: [
        "Draft is a real state, not a courtesy: it lets CI run and people comment without anyone thinking the change is ready to merge.",
        "`ChangesRequested` is not a rejection. It is the normal loop: push a fix to the same branch, reply in the thread, resolve it, and the PR moves back to review.",
        "The final gate is 'up to date plus queue passes'. A green check on an old base does not prove the combination with today's main works.",
      ],
    },
  ],
  companies: [
    "**Google (verified in this lesson; guidance read at google.github.io/eng-practices):** Google's public review guide calls a change of about 100 lines reasonable and 1,000 lines usually too large, asks reviewers to respond within one business day, and tells reviewers to check design, functionality, complexity, tests, naming and documentation rather than style. It also tells reviewers to praise good work, not only list defects. These are published team practices, not a claim that every Google team behaves identically.",
    "**Meta (illustrative):** Meta has publicly described trunk-based development at very large scale, with small changes reviewed and landed continuously and unfinished behaviour controlled by gates and flags. The engineering constraint is the same one you face in miniature: if thousands of people commit to one branch, every change must be small enough that a broken one is easy to find and revert.",
    "**GitHub (verified in this lesson):** We reproduced the squash operation locally: two branch commits become one commit on main, and `git merge --squash` stops before committing (`Squash commit -- not updating HEAD`). GitHub's platform layer adds the PR number convention, required checks, CODEOWNERS and the merge queue on top of that Git behaviour; the squash result is the same commit shape you saw in step 3.",
    "**Atlassian (illustrative):** Atlassian's Gitflow tutorial now calls Gitflow a legacy workflow that has fallen in popularity in favour of trunk-based development, notes that it can be challenging with CI/CD, and still recommends it for a release-based software workflow. That is exactly the trade-off to internalise: the branch model is a fit for a scheduled release cadence, not a maturity badge.",
    "**Graphite and the stacked-PR tooling ecosystem (illustrative):** Companies such as Graphite build review tools around stacked branches, and open-source tools such as Sapling and git-branchless automate rebasing a chain after the bottom PR merges. The workflow is older than the tools: each PR targets the branch below, so reviewers see one layer at a time. The tooling removes the retargeting toil, not the need to keep the stack shallow.",
  ],
  mistakes: [
    { mistake: "Huge PRs", why: "Wanting to ship the whole feature at once", wrong: "Shallow reviews, painful conflicts, a rollback that undoes unrelated work", fix: "Split by layer or step (schema, API, UI, docs) and hide unfinished behaviour behind a flag" },
    { mistake: "A title and description that restate the diff", why: "\"The code speaks for itself\"", wrong: "Reviewers guess the intent, miss the risk and ask questions the description should have answered", fix: "Imperative title; then why, what, how to test, risk and rollback, linked issue" },
    { mistake: "Mixing a refactor or reformat with a behaviour change", why: "It is convenient to clean up while you are there", wrong: "The real change hides among hundreds of moved lines and the reviewer cannot see it", fix: "Land the refactor first, then the behaviour change on top; keep formatting to its own PR" },
    { mistake: "Reviewing style by hand", why: "Style is easy to spot and feels productive", wrong: "Nit storms exhaust the author while a security or correctness bug merges", fix: "Let a formatter and linter own style; spend human review on correctness, tests, security and design" },
    { mistake: "Approving without reading the tests or running the change", why: "Time pressure and a green CI badge", wrong: "The review is theatre; the test may assert nothing or the check may be stale", fix: "Read the tests first, ask what would fail if the code broke, and run the risky path locally" },
    { mistake: "Force-pushing during review without a note", why: "Rebasing feels cleaner than a merge commit", wrong: "Inline comments are orphaned and the reviewer cannot see what changed since the last round", fix: "Push fix commits during review; if you must rebase, say so and summarise what moved" },
    { mistake: "Arguing with the reviewer instead of the problem", why: "The code feels personal and the thread becomes a contest", wrong: "The PR stalls and the team learns to avoid difficult comments", fix: "Reply with evidence, accept the nit or explain the constraint; mark the thread resolved when the decision is made" },
    { mistake: "Running GitFlow for a service that deploys ten times a day", why: "It looks like the professional model in blog posts", wrong: "Long-lived develop and release branches create integration debt and slow feedback", fix: "Use trunk or GitHub flow with flags and fast CI; add release branches only when you must support old versions" },
  ],
  bestPractices: [
    { tag: "Maintainability", text: "Target one self-contained change under ~400 changed lines, with tests, an imperative title and a description that explains why before what." },
    { tag: "Reliability", text: "Protect main: require a PR, named CI checks, an up-to-date branch and approval; dismiss stale approvals on new commits; revert rather than forward-fix during an incident." },
    { tag: "Security", text: "Route auth, migrations, infrastructure and dependency files to owners with CODEOWNERS, require code-owner review, and scan for secrets; reviewers check authorization and logging, not just formatting." },
    { tag: "Performance", text: "Respond to review requests within one business day and keep the first response short; review latency is on the team's critical path, not a personal courtesy." },
    { tag: "Cost", text: "Small PRs keep CI feedback fast, make bisects narrow and cap the blast radius of a revert; a huge diff spends compute and reviewer time on changes nobody can verify." },
  ],
  interview: [
    { q: "Why do small PRs win? Be specific about review latency, defect detection and rollback.", a: "Start with the queue. Review capacity is finite, and a 2,000-line diff does not receive ten times the attention of a 200-line one; it waits longer and gets a shallower read. Small changes fit into the gaps in a reviewer's day and can be finished in one sitting, so the first response is faster and the review is more thorough. Defect detection follows working memory: a reviewer can hold one behaviour, its tests and its edge cases in mind, but not forty files of mixed intent. Google's public guide puts a reasonable change around 100 lines and 1,000 as usually too large (verified in this lesson). Rollback is the third mechanism: a revert or a bisect is proportional to the change, and one logical commit is one unit to undo. Then show judgement: 'small' means one self-contained change including tests, not a game with line counts, and a 400-line module can be more reviewable than 200 lines spread across 40 files. For a genuinely large feature, split by layer or stack the PRs rather than asking for a heroic review." },
    { q: "Compare trunk-based development, GitHub flow, GitFlow and release branches. How do you choose, and how does the merge strategy fit?", a: "Trunk-based means branches live hours, everyone integrates into main several times a day, and unfinished work is hidden behind flags; it needs fast CI and monitoring, and it pays off when deploys are frequent. GitHub flow is the lighter version: one short-lived feature branch and a PR into main, with main as the deployable branch. GitFlow adds long-lived develop and release branches plus hotfixes, which suits scheduled, versioned releases but adds merge ceremony and integration debt for a continuously deployed service. Release branches keep patching supported versions after main moves on, which mobile, libraries and regulated software need, at the cost of landing every fix twice. My default for a web service is trunk or GitHub flow with feature flags; I add release branches only when a support promise exists. The merge strategy should match: a merge commit preserves the branch and the exact commits (useful for larger integration points, but reverting needs `-m 1`); squash gives one clean revertible commit per small PR; rebase gives linear history but rewrites SHAs, so never rebase a shared branch. Pick one per repository and enforce it in the ruleset rather than relying on habit." },
    { q: "Walk me through reviewing a 600-line PR you do not understand. What do you do before approving?", a: "First, do not approve. Read the description and the linked issue, then ask for the split if the change mixes concerns; a 600-line diff is acceptable only when it is one coherent change. Open the files-changed view and read the tests before the implementation, because they state what the author believes the code does; ask which test would fail if the production change were wrong. Use the three-dot diff so you see the branch's delta against the merge base, and read risky paths first: auth, input validation, migrations, configuration, anything logging user data. Check for secrets, missing authorization, error paths, empty inputs and concurrency. Run the change locally if it is user-facing, or ask for a recording. Label comments: `issue: (blocking)` for correctness or security, `question:` when you need intent, `nitpick: (non-blocking)` for taste, `praise:` when something is genuinely good. If part of the change is outside your expertise, say which parts you reviewed and ask for the right owner. Approve only when you understand the change and the tests, or when your remaining comments are explicitly non-blocking and you trust the author to address them." },
  ],
  quickCheck: [
    {
      kind: "mcq",
      prompt: "Which is the best use of human review time?",
      options: ["Checking indentation", "Checking the logic handles empty input and errors", "Checking import order", "Checking trailing whitespace"],
      answer: 1,
      explanation: "Formatting belongs to a formatter. Humans add value on correctness, design, security and tests.",
    },
    {
      kind: "mcq",
      prompt: "What does CODEOWNERS do?",
      options: ["Prevents forks", "Automatically requests reviews from owners of changed paths", "Encrypts files", "Runs tests"],
      answer: 1,
      explanation: "It routes review requests. Combined with a ruleset that requires code-owner review, it also blocks merging without the owner's approval.",
    },
    {
      kind: "bug",
      prompt: "A team protects main with 'require 1 approval', yet broken code keeps merging. What is missing?",
      options: ["A README", "Required status checks (CI must pass)", "More branches", "Signed commits"],
      answer: 1,
      explanation: "Approval alone does not ensure the tests pass. Require the named CI checks and an up-to-date branch, and dismiss stale approvals when new commits arrive.",
    },
  ],
  cheatSheet: [
    "Flow: branch → small commits (tests included) → draft/ready PR → CI + review → squash or merge → delete branch → deploy.",
    "PR size: one self-contained change; ~100 lines is comfortable, ~400 is a practical ceiling, 1,000 is a review nobody can do well.",
    "Description: imperative title, linked issue, why, what changed, how to test, risk/rollback, screenshots for UI.",
    "Read a PR in this order: description → tests → risky paths → rest of the diff. Ask what would fail if the code broke.",
    "Comment labels: `issue: (blocking)`, `question:`, `suggestion:`, `nitpick: (non-blocking)`, `praise:`.",
    "Branching: trunk or GitHub flow for continuous delivery; GitFlow for scheduled/versioned releases; release branches for supported old versions.",
    "Merge: merge commit preserves SHAs (revert with `-m 1`), squash gives one revertible commit, rebase gives linear history but rewrites SHAs.",
    "Protect main: PR required, named checks required, branch up to date, stale approvals dismissed, no force pushes; CODEOWNERS for risky paths.",
    "Stacks: each PR targets the branch below; merge bottom-up, retarget and rebase the rest; keep the stack shallow.",
    "Review within one business day; fix or explain every comment, resolve threads, and never merge on an approval that predates the last push.",
  ],
  homework: {
    basic: {
      title: "Your first reviewed PR",
      brief: ["In a practice repo, add a PR template, open a PR that adds a small feature, and review your own diff in the GitHub UI leaving at least two comments as if you were the reviewer."],
      criteria: ["PR uses the template", "Two self-review comments with labels", "Merged with squash"],
      hints: ["Settings → General → Pull Requests lets you allow only squash merging.", "Run `git diff main...HEAD` before opening the PR: that is the reviewer's view."],
      solution: {
        text: [
          "The point is practising the reviewer's mindset on your own code: you will find at least one thing to improve. Typical findings are missing error handling, a hardcoded value, or a missing test.",
          "first-pr.md is a complete worked example: repo settings for squash-only merging, a filled-in template, two labelled self-review comments with concrete inputs and outputs, the fix commit and the merge. GitHub does not let you approve your own PR, so leave the comments as a 'Comment' review. The slugify outputs quoted in the comments come from running both versions, and the three test cases pass on the fixed version.",
        ],
        code: { lang: "markdown", file: "first-pr.md", code: `# First reviewed PR: "Add slugify() for lesson URLs"
# Settings > General > Pull Requests: allow squash merge only, delete branches.

## PR description (filled from the template)
~~~markdown
## What
Adds \`slugify(title)\` in \`textutils.py\`: "DNS & TLS 101" -> "dns-tls-101".

## Why
Closes #1. Lesson URLs use numeric ids, which are unreadable when shared.

## How to test
\`python -m pytest -q test_textutils.py\` (3 cases: punctuation, accents, spaces)

## Risk
Low. New function, no callers yet, no migrations or config changes.

- [x] Tests added or updated
- [x] No secrets or debug code
~~~

## Self-review comments (Files changed tab)
textutils.py:5 \`return re.sub(r"[^a-z0-9]+", "-", title.lower())\`

> **issue (blocking):** \`slugify("  Hello, World! ")\` returns \`"-hello-world-"\`,
> so the URL becomes \`/lessons/-hello-world-\`. Add \`.strip("-")\` and a test.

> **question:** \`slugify("Café Menu")\` returns \`"caf-menu"\`. Should we transliterate
> with \`unicodedata.normalize("NFKD", ...)\`, giving \`"cafe-menu"\`? If all titles are
> English, say so in the docstring instead.

## Fix and merge
Commit "Strip edge hyphens and transliterate accents"; both threads resolved;
3 tests pass. Then:
\`gh pr merge --squash --delete-branch --subject "Add slugify() for lesson URLs (#2)"\`
Result on main: one commit, "Add slugify() for lesson URLs (#2)". Branch deleted.` },
      },
    },
    intermediate: {
      title: "Review this code",
      brief: ["Write a code review (labelled comments) for the function below. Find at least four issues, and say which ones block the merge."],
      criteria: ["At least 4 issues found", "Each comment explains impact and suggests a fix", "Blocking vs non-blocking clearly marked", "The fixed version is at least as readable as the original"],
      hints: ["Think: security, correctness, error handling, performance, naming.", "Read the tests first: what would fail if the function were wrong?"],
      solution: {
        text: [
          "**issue: (blocking, security):** the email is interpolated into SQL with an f-string, so `email = \"' OR 1=1 --\"` changes the query. Use a parameter placeholder and pass a tuple.",
          "**issue: (blocking, correctness):** `x / len(d)` divides by zero for a user with no orders, and `db.query(...)[0]` raises `IndexError` for an unknown email. Return a documented empty result or raise a domain error before dividing.",
          "**issue: (blocking, privacy):** `print(\"user:\", user)` writes the full user record, including personal data, to logs. Remove it or log a non-identifying id at debug level.",
          "**question: (performance):** fetching every order to average them in Python moves work and data out of the database. `AVG(o.total)` with a join returns one row; confirm the intended behaviour for users with no orders.",
          "**suggestion: (non-blocking):** `SELECT *` pulls every column; name the columns the function actually needs so a later schema change cannot silently enlarge the query.",
          "**nitpick: (non-blocking):** `calc`, `d` and `x` do not communicate intent; `average_order_value`, `orders` and `total` do. The reviewed version below also separates the lookup from the aggregation.",
          "**praise:** the SQL injection and division by zero are exactly the two failures a reviewer should stop; the fixed function makes both impossible rather than documenting them. Add tests for the empty-orders and unknown-email cases before merging, because neither bug would be caught by the happy path.",
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
        pitfalls: ["Listing style nits as blocking, which buries the SQL injection", "Fixing the injection but leaving the empty-orders division untouched"],
      },
    },
    challenge: {
      title: "Contribute to open source",
      brief: ["Find a 'good first issue' in an open-source project you use. Fork, fix, and open a PR following the project's CONTRIBUTING guide. Even a documentation fix counts."],
      criteria: ["PR follows the project's contribution rules", "Description links the issue", "You responded to review feedback"],
      hints: ["GitHub search: label:\"good first issue\" language:python state:open", "Read the CONTRIBUTING guide before writing code; it often specifies the commit style and test command."],
      solution: {
        text: [
          "Read CONTRIBUTING.md first, comment on the issue before starting, keep the change minimal, run the project's tests locally, and reply to every review comment. A merged OSS PR is strong portfolio evidence.",
          "oss.sh runs the sequence from the issue: read the thread and CONTRIBUTING, claim the issue, fork with --clone (origin is your fork, upstream is theirs), and create a branch. Edit, test and commit yourself, then run the same script's final commands or push and open the PR by hand. The body starts with `Fixes #N`, so GitHub links the issue and closes it on merge. After review, push follow-up commits to the same branch; the PR updates itself.",
          "The review conversation is part of the deliverable. If a maintainer asks for a different approach, make the change or explain the constraint with evidence; do not open a second PR with the same change. Resolve each thread and ask for re-review when the diff has moved.",
        ],
        code: { lang: "bash", file: "oss.sh", code: `#!/usr/bin/env bash
# Contribute a focused fix with the GitHub CLI (run \`gh auth login\` first).
# usage: ./oss.sh <owner/repo> <issue-number>
set -euo pipefail
repo="$1" issue="$2"

gh issue view "$issue" --repo "$repo" --comments    # already claimed?
for f in CONTRIBUTING.md .github/CONTRIBUTING.md; do
  gh api "repos/$repo/contents/$f" -H "Accept: application/vnd.github.raw" && break
done
gh issue comment "$issue" --repo "$repo" \\
  --body "I'd like to take this one. I'll keep the change minimal and add a test."
gh repo fork "$repo" --clone --default-branch-only   # origin = your fork, upstream = theirs
cd "\${repo#*/}"
git remote set-head upstream --auto                 # so upstream/HEAD names their default branch
git switch -c "fix/issue-$issue"
# ...edit, run the project's own tests, commit...
git push -u origin "fix/issue-$issue"
gh pr create --repo "$repo" --head "$(gh api user --jq .login):fix/issue-$issue" \\
  --title "$(git log -1 --format=%s)" --body "Fixes #$issue

## What
The smallest change that fixes the issue.

## How I tested
Ran the suite described in CONTRIBUTING.md; all tests pass.

I'm new here, so feedback on approach is welcome."` },
        pitfalls: ["Working on your fork's main branch, so every later change lands in the same PR", "Reformatting files you did not need to touch, which buries the real change", "Opening a fresh PR instead of pushing a fix commit to the one under review"],
      },
    },
    capstone: {
      title: "DevAtlas: team-ready repository",
      brief: ["Add a PR template, CODEOWNERS, a CI workflow running the AI service tests, a size gate that fails PRs over 400 changed lines, and branch protection requiring those checks. From now on every DevAtlas change goes through a PR."],
      criteria: ["Template and CODEOWNERS committed", "CI and the size gate run on PRs", "main requires the CI checks and blocks direct pushes"],
      hints: ["Reuse the workflow from the hands-on section.", "Before opening the PR, run `git diff --numstat main...HEAD` and add the columns yourself; CI runs the same arithmetic."],
      solution: {
        text: [
          "Even solo, working through PRs gives you a reviewable history and CI gates, which interviewers look at when they browse your GitHub.",
          "ci.yml has three jobs whose names (ai-tests, scripts-lint, pr-size) become the required checks. There is deliberately no `paths:` filter on the required test job. Until Phase 1 creates services/ai, the pip and pytest steps are skipped and the check still reports success.",
          "protect-main.sh creates a ruleset through the REST API: PR required, squash only, all three checks required and the branch must be up to date (strict), no force pushes or deletion. Approvals are 0 because GitHub does not let you approve your own PR; raise it to 1 and turn on code-owner review when a second person joins.",
          "pr-size fails a PR over 400 changed lines. It is a guardrail, not a target: generated files and lockfiles should be split out or excluded, and a coherent 420-line migration may still be the right review unit. The number starts the conversation; the description justifies it.",
        ],
        code: { lang: "yaml", file: ".github/workflows/ci.yml + CODEOWNERS + template + scripts", code: `name: CI
on:
  pull_request:
  push:
    branches: [main]
jobs:
  ai-tests:
    name: ai-tests                      # this exact name is the required check
    runs-on: ubuntu-latest
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
    steps:
      - uses: actions/checkout@v4
      - run: shellcheck scripts/*.sh     # preinstalled on GitHub's Ubuntu runners
  pr-size:
    name: pr-size
    if: github.event_name == 'pull_request'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0                 # need the merge base, not a shallow tip
      - env:
          BASE_SHA: \${{ github.event.pull_request.base.sha }}
        run: |
          git fetch --no-tags origin "$BASE_SHA"
          git diff --numstat "$BASE_SHA"...HEAD |
            awk '{a += $1; d += $2} END {print a + d " changed lines"; exit (a + d > 400)}'

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

## Screenshots
<!-- Required for UI changes; write "not applicable" otherwise. -->

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
        "required_status_checks": [ { "context": "ai-tests" }, { "context": "scripts-lint" }, { "context": "pr-size" } ]
      } }
  ]
}
JSON
echo "ruleset created: direct pushes to main are now rejected"` },
        pitfalls: ["A paths filter on a required workflow: PRs that do not touch those paths wait forever for a check that never runs", "Requiring an approval on a solo repo, which blocks every PR", "Making pr-size required but skipping it on pull_request, so it never reports and every PR waits"],
      },
    },
  },
  deeper: [
    { label: "GitHub Docs: About pull requests", url: "https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/proposing-changes-to-your-work-with-pull-requests/about-pull-requests" },
    { label: "Google Engineering Practices: Code Review", url: "https://google.github.io/eng-practices/review/" },
    { label: "Google Engineering Practices: Small CLs", url: "https://google.github.io/eng-practices/review/developer/small-cls.html" },
    { label: "GitHub Docs: About code owners", url: "https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-code-owners" },
    { label: "Conventional Comments", url: "https://conventionalcomments.org/" },
    { label: "Trunk Based Development", url: "https://trunkbaseddevelopment.com/" },
  ],
  nextPreview: "Next: your dev environment. VS Code, package managers and Docker Desktop, set up so that 'works on my machine' becomes 'works on every machine'.",
};
