import type { Lesson } from "../../types";

export const lesson: Lesson = {
  id: "0.3.1",
  title: "Git: commits, branches, merges and conflicts",
  minutes: 60,
  level: "Beginner",
  prerequisites: ["0.2.1 The terminal", "Git installed (git --version)"],
  summary: "Understand Git's data model so commands stop being magic: snapshots, branches as pointers, merges, rebases and calm conflict resolution.",
  terms: [
    { term: "Repository", def: "A project folder plus its full history, stored in the hidden .git directory." },
    { term: "Commit", def: "A snapshot of all tracked files, with an author, message and a pointer to its parent commit(s). Identified by a hash." },
    { term: "Staging area (index)", def: "The list of changes that will go into the next commit. `git add` puts changes there." },
    { term: "Branch", def: "A movable label pointing at one commit. Creating a branch costs a few bytes." },
    { term: "HEAD", def: "Points to the branch (or commit) you currently have checked out." },
    { term: "Merge", def: "Combines two lines of history, creating a merge commit with two parents when needed." },
    { term: "Rebase", def: "Replays your commits on top of another commit, producing new commits with new hashes." },
    { term: "Remote", def: "Another copy of the repository, usually on GitHub, named origin by default." },
  ],
  problem: [
    "Two developers edit the same checkout function. One fixes a tax bug, the other adds discount codes. Without version control, one person's work silently overwrites the other's, and nobody can say which version is running in production.",
    "Git solves this: every change is recorded, work happens in parallel on branches, and combining work is explicit. But most developers only memorise five commands, so the first merge conflict or a 'detached HEAD' message causes panic. Understanding the model removes the fear.",
  ],
  concept: {
    analogy: [
      "Imagine a photo album of your project. Each **commit** is a photo of the whole project at one moment, with a note on the back and an arrow pointing to the previous photo. A **branch** is a sticky note on one photo saying 'feature-discounts is here'. When you take a new photo on that branch, the sticky note moves to it.",
    ],
    precise: [
      "Git stores **snapshots, not diffs**. Each commit references a tree (the directory structure) and its parent commit(s); unchanged files are shared between snapshots, so this is cheap. Commits form a **directed acyclic graph** (DAG).",
      "A **branch** is a file containing one commit hash. `HEAD` says which branch you are on. Committing creates a new commit whose parent is the current one and moves the branch pointer forward. **Merging** finds the common ancestor and combines both sides' changes; a conflict happens only when both sides changed the same lines (or one edited a file the other deleted).",
      "Three areas matter: the **working directory** (your files), the **staging area** (what you have `git add`-ed) and the **repository** (committed history).",
    ],
  },
  underTheHood: {
    text: [
      "Run `cat .git/HEAD` in any repo: it prints something like `ref: refs/heads/main`. Then `cat .git/refs/heads/main` prints a commit hash. That is all a branch is.",
      "A **fast-forward merge** happens when the target branch has no new commits: Git just moves the pointer. A **three-way merge** uses the common ancestor plus both tips, and records a merge commit with two parents.",
      "`git rebase main` takes your branch's commits, and re-applies them one by one on top of main's latest commit. Because the parent changes, every rebased commit gets a **new hash**. That is why you must not rebase commits other people have already pulled.",
    ],
    diagram: {
      title: "Where a change lives",
      nodes: [
        { label: "Working dir", sub: "edit files" },
        { label: "Staging area", sub: "git add" },
        { label: "Local repo", sub: "git commit" },
        { label: "Remote (GitHub)", sub: "git push" },
      ],
      edges: ["add", "commit", "push"],
      caption: "`git pull` = `git fetch` (download) + `git merge` (or rebase) into your branch.",
    },
  },
  handsOn: [
    {
      title: "Configure Git once",
      code: { lang: "bash", code: `git config --global user.name "Your Name"
git config --global user.email "you@example.com"
git config --global init.defaultBranch main
git config --global pull.rebase false   # explicit: pull merges (choose one and be consistent)` },
    },
    {
      title: "Create history and a branch",
      code: {
        lang: "bash",
        code: `mkdir git-lab && cd git-lab && git init
echo "price = 100" > checkout.txt
git add checkout.txt && git commit -m "Add checkout price"

git switch -c feature/tax          # create and switch to a branch
echo "tax = 0.18" >> checkout.txt
git commit -am "Add tax rate"

git log --oneline --graph --all`,
      },
      output: "* 3f2a1c9 (HEAD -> feature/tax) Add tax rate\n* 8b7d0e4 (main) Add checkout price",
      notes: ["Your hashes will differ: they are computed from the content, author and time."],
    },
    {
      title: "Cause and resolve a conflict",
      code: {
        lang: "bash",
        code: `git switch main
sed -i.bak 's/price = 100/price = 120/' checkout.txt && rm checkout.txt.bak
git commit -am "Raise price"

git switch feature/tax
sed -i.bak 's/price = 100/price = 99/' checkout.txt && rm checkout.txt.bak
git commit -am "Promo price"

git merge main        # CONFLICT (content): Merge conflict in checkout.txt
git status            # shows "both modified"
cat checkout.txt`,
      },
      output: "<<<<<<< HEAD\nprice = 99\ntax = 0.18\n=======\nprice = 120\n>>>>>>> main",
      notes: [
        "Between `<<<<<<< HEAD` and `=======` is your branch; between `=======` and `>>>>>>> main` is the incoming change. The tax line is inside the conflict because Git treats changes to adjacent lines as one overlapping hunk. Decide what the code should be (this is a business question: ask if unsure), edit the file to the final content, remove the markers, then:",
      ],
    },
    {
      title: "Finish the merge",
      code: { lang: "bash", code: `printf 'price = 120\\ntax = 0.18\\n' > checkout.txt
git add checkout.txt
git commit                # completes the merge
git log --oneline --graph --all` },
      notes: ["Changed your mind mid-merge? `git merge --abort` returns to the state before the merge."],
    },
    {
      title: "Undo safely",
      code: {
        lang: "bash",
        code: `git restore file.txt            # discard uncommitted changes in a file
git restore --staged file.txt   # unstage, keep the change
git revert <hash>               # new commit that undoes <hash> (safe on shared branches)
git reflog                      # every position HEAD has been: your safety net`,
      },
    },
  ],
  companies: [
    "**Trunk-based development** is common at companies that deploy many times a day: short-lived branches (hours to a couple of days), small pull requests, and feature flags for unfinished work. Long-lived branches cause painful merges.",
    "**Pull requests are the quality gate.** CI runs tests on every PR, and branch protection rules on GitHub or Azure DevOps require reviews and passing checks before merging to main.",
    "**History is documentation.** Teams use clear commit messages (many use Conventional Commits like `fix: correct tax rounding`) so that `git log` and `git blame` explain why code changed, and so changelogs can be generated.",
  ],
  mistakes: [
    { mistake: "Force-pushing a shared branch", why: "After a rebase, a normal push is rejected", wrong: "Teammates' commits disappear from the remote", fix: "Never rewrite shared history. If you must on your own branch, use --force-with-lease" },
    { mistake: "Committing secrets (.env, keys)", why: "`git add .` adds everything", wrong: "The secret stays in history even after deleting the file; bots scan GitHub for keys", fix: "Use .gitignore, rotate any leaked secret immediately, enable secret scanning" },
    { mistake: "Giant 'misc changes' commits", why: "Committing only at the end of the day", wrong: "Reviews are impossible, bugs cannot be bisected or reverted cleanly", fix: "Small commits, each one logical change with a message explaining why" },
    { mistake: "Resolving conflicts by picking 'mine' everywhere", why: "Wanting the conflict to go away", wrong: "Someone else's fix is silently lost", fix: "Read both sides, understand intent, run tests after resolving" },
    { mistake: "Panicking after a bad reset", why: "Commits look gone", wrong: "People delete and re-clone, losing local work", fix: "`git reflog` shows previous HEAD positions; `git reset --hard <old-hash>` recovers" },
  ],
  bestPractices: [
    { tag: "Security", text: "Add `.env`, credentials and build output to `.gitignore` from day one. Enable GitHub secret scanning and push protection." },
    { tag: "Maintainability", text: "Commit messages: imperative subject under ~72 chars ('Fix tax rounding for INR'), body explains why." },
    { tag: "Reliability", text: "Protect main: require PR review and green CI. Use `git revert` rather than rewriting shared history." },
    { tag: "Performance", text: "Keep large binaries out of Git (use Git LFS or object storage); they bloat every clone forever." },
  ],
  interview: [
    { q: "Merge vs rebase: when do you use each?", a: "Both integrate changes. Merge preserves history exactly and adds a merge commit; it is safe on shared branches. Rebase rewrites your commits onto a new base for a linear history; use it on local or personal branches before opening a PR, never on commits others have pulled." },
    { q: "What is a merge conflict and how do you resolve it?", a: "Git cannot automatically combine changes when both sides edited the same lines. I open the conflicted files, understand both intents, write the correct final code, remove markers, run tests, then git add and commit. If unsure about intent, I ask the other author." },
    { q: "How do you undo a commit that is already pushed to main?", a: "git revert <hash>, which creates a new commit undoing it. It keeps history intact for everyone, unlike reset plus force-push." },
  ],
  quickCheck: [
    {
      kind: "mcq",
      prompt: "What is a Git branch, technically?",
      options: ["A full copy of the project files", "A pointer to a single commit", "A diff against main", "A folder inside .git/objects"],
      answer: 1,
      explanation: "A branch is a reference containing one commit hash. That is why creating branches is instant.",
    },
    {
      kind: "output",
      prompt: "You run `git commit --amend` on a commit with hash a1b2c3. What happens to the hash?",
      options: ["Stays a1b2c3", "A new commit with a new hash replaces it", "Git refuses", "The hash gets a suffix"],
      answer: 1,
      explanation: "Commits are immutable. Amending creates a new commit with new content, so a new hash. The old one still exists in reflog for a while.",
    },
    {
      kind: "bug",
      prompt: "A developer deleted `.env` and committed. The API key is still exposed. Why?",
      options: ["GitHub caches files", "The key is still in earlier commits in history", "Deleting files needs git rm --cached", "It is not exposed"],
      answer: 1,
      explanation: "History keeps every snapshot. Rotate the key first (assume it is compromised), then clean history if needed.",
    },
  ],
  cheatSheet: [
    "Commit = snapshot + parent pointer. Branch = pointer to a commit. HEAD = where you are.",
    "Flow: edit → `git add` → `git commit` → `git push`.",
    "`git switch -c name` creates a branch; `git log --oneline --graph --all` shows the graph.",
    "Conflict: edit to final content, remove markers, `git add`, `git commit`. Or `git merge --abort`.",
    "Undo: `restore` (uncommitted), `revert` (pushed), `reflog` (lost work).",
    "Never rebase or force-push shared branches. Use `--force-with-lease` on your own.",
    "Secrets in history are leaked secrets: rotate them.",
  ],
  homework: {
    basic: {
      title: "Draw the graph",
      brief: ["In a fresh repo, create main with 2 commits, a branch `feature/a` with 2 commits, then add 1 more commit on main. Before merging, draw (on paper or Mermaid) what the graph will look like after `git merge feature/a` into main. Then do it and compare with `git log --graph`."],
      criteria: ["Prediction drawn before running the merge", "Output of git log --oneline --graph --all after merge", "Explains why this was a three-way merge, not fast-forward"],
      hints: ["Fast-forward is only possible when main has no commits the branch lacks."],
      solution: {
        text: ["main and feature/a diverged after commit 2, so Git creates a merge commit with two parents: main's latest commit and feature/a's tip. If main had no new commit, Git would have fast-forwarded instead."],
        code: { lang: "text", code: "*   e5f6 (HEAD -> main) Merge branch 'feature/a'\n|\\\n| * d4c3 (feature/a) A2\n| * c3b2 A1\n* | b2a1 M3\n|/\n* a1z9 M2\n* 9z8y M1" },
      },
    },
    intermediate: {
      title: "Conflict with three changes",
      brief: ["Create a conflict where both branches change the same function in different ways AND one branch also adds a new function. Resolve it so both intents survive. Write a short note on how you decided."],
      criteria: ["Conflict markers removed", "Both behaviours preserved where they are compatible", "A test or run proving the result works"],
      hints: ["Non-overlapping changes merge automatically; only the overlapping hunk conflicts."],
      solution: {
        text: [
          "Git auto-merges the new function because it does not overlap. Only the edited function conflicts. Combine both edits by understanding intent (e.g. one adds validation, the other changes the formula: keep validation and the new formula), then run the code or tests.",
        ],
        pitfalls: ["Accepting one side wholesale and losing the other's fix", "Committing with markers still in the file (search for <<<<<<< before committing)"],
      },
    },
    challenge: {
      title: "Recover lost work",
      brief: ["Make 3 commits, then run `git reset --hard HEAD~3`. Recover all three commits using only Git. Then explain in 3 sentences why this worked and when it would not."],
      criteria: ["Commits recovered", "Uses git reflog", "Explains reflog's limits"],
      hints: ["`git reflog` then `git reset --hard <hash>` or `git branch rescue <hash>`."],
      solution: {
        text: [
          "`git reflog` lists every position HEAD pointed to; the entry before the reset is the old tip. `git reset --hard HEAD@{1}` or `git branch rescue <hash>` restores it.",
          "It works because commits are not deleted immediately; they become unreachable and are garbage-collected later (by default reflog entries expire after about 90 days, unreachable ones after about 30). It does not help for changes that were never committed, or in a different clone.",
        ],
      },
    },
    capstone: {
      title: "DevAtlas step 3: repository hygiene",
      brief: ["Push DevAtlas to GitHub. Add a `.gitignore` (node, dotnet, python), a branch protection rule on main requiring a PR, and open your first PR that adds the setup script from the previous step."],
      criteria: [".gitignore excludes node_modules, bin/obj, __pycache__, .env", "main is protected", "One merged PR with a clear title and description"],
      hints: ["GitHub: Settings → Branches (or Rules → Rulesets)."],
      solution: {
        text: ["Use a PR description with: what changed, why, how it was tested. This habit is what reviewers notice first in a portfolio."],
        code: { lang: "text", file: ".gitignore", code: "node_modules/\ndist/\nbin/\nobj/\n__pycache__/\n.venv/\n.env\n.env.*\n*.log\n.DS_Store" },
      },
    },
  },
  deeper: [
    { label: "Pro Git book (free)", url: "https://git-scm.com/book/en/v2" },
    { label: "Git reference documentation", url: "https://git-scm.com/docs" },
    { label: "GitHub Docs: About pull requests", url: "https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/proposing-changes-to-your-work-with-pull-requests/about-pull-requests" },
    { label: "Conventional Commits", url: "https://www.conventionalcommits.org/" },
  ],
  nextPreview: "Next: Python essentials. Variables as references, mutability traps, functions and type hints: the foundation for the AI service you will build.",
};
