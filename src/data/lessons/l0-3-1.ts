import type { Lesson } from "../../types";

export const lesson: Lesson = {
  id: "0.3.1",
  title: "Git: commits, branches, merges and conflicts",
  minutes: 90,
  level: "Beginner",
  prerequisites: ["0.2.1 The terminal", "Git installed (git --version)"],
  summary: "Understand Git's data model so commands stop being magic: blobs, trees, commits and tags, refs and HEAD, the index, branches as pointers, three-way merges, rebase, reset, revert and the reflog.",
  terms: [
    { term: "Repository", def: "A project folder plus its full history, stored in the hidden .git directory. The working files are just a checkout of one commit." },
    { term: "Blob", def: "Git's name for one file's contents, stored once and keyed by a hash of that content. A blob has no filename and no permissions; the tree supplies those." },
    { term: "Tree", def: "A directory listing object: one entry per file or subdirectory, each with a mode, an object type, a hash and a name. Trees may point at blobs or at other trees." },
    { term: "Commit", def: "A snapshot of all tracked files, with an author, message, timestamps and a pointer to its parent commit(s). Identified by a hash of that content." },
    { term: "Tag", def: "A named label on an object. A lightweight tag is just a ref; an annotated tag is its own object with a tagger, date and message pointing at a commit." },
    { term: "Ref", def: "A human-readable name for a hash, stored under .git/refs/heads, .git/refs/tags or .git/packed-refs. Branches, tags and remote-tracking branches are all refs." },
    { term: "HEAD", def: "A symbolic ref: normally .git/HEAD contains `ref: refs/heads/main`. If it contains a hash instead, you are in detached HEAD." },
    { term: "Index (staging area)", def: "The binary file .git/index listing the mode, blob hash and path that the next commit will contain. `git add` updates it; `git commit` turns it into a tree." },
    { term: "Branch", def: "A movable label pointing at one commit, stored as a single hash. Creating or deleting a branch costs a few bytes, not a copy of the project." },
    { term: "Merge", def: "Combining two lines of history from their common ancestor. A fast-forward slides the pointer when the target has no new commits; otherwise a three-way merge creates a commit with two parents." },
    { term: "Rebase", def: "Replaying your commits on top of another commit. Because the parent changes, every replayed commit gets a new hash." },
    { term: "Reflog", def: "An append-only local log of every position HEAD and each branch has pointed at, kept in .git/logs. It is the safety net for resets, rebases and amends." },
  ],
  problem: [
    "Two developers edit the same checkout function. One fixes a tax bug, the other adds discount codes. Without version control, one person's work silently overwrites the other's, and nobody can say which version is running in production. With version control but no model in your head, the same thing happens in slower motion: somebody force-pushes, a merge resolution drops a fix, and the history that was supposed to explain the change tells a story nobody can follow.",
    "Git solves both problems: every change is recorded as an immutable snapshot, work happens in parallel on branches, and combining work is explicit. But most developers only memorise five commands, so the first merge conflict, a rebase that rewrites a shared branch, or a 'detached HEAD' message causes panic. Understanding the object model - blobs, trees, commits, refs and the index - removes the fear, because every command becomes a predictable edit to a small graph of hashes.",
  ],
  concept: {
    analogy: [
      "Imagine a photo album of your project. Each **commit** is a photo of the whole project at one moment, with a note on the back and an arrow pointing to the previous photo. A **branch** is a sticky note on one photo saying 'feature-discounts is here'. When you take a new photo on that branch, only the sticky note moves; the old photo is untouched.",
      "The **staging area** is the tray of prints you are about to stick into the album: you choose which changes go in the next photo, so a messy afternoon of edits can still become two clean pictures. A **tag** is an ink stamp on one particular photo ('v1.0 - shipped'), and **HEAD** is the bookmark that says which photo the album is open at.",
    ],
    precise: [
      "Git stores **content-addressed objects**, not diffs. There are four types: **blob** (file contents), **tree** (a directory listing), **commit** (a tree plus parent pointers, author, committer and message) and **annotated tag** (a label with metadata). Every object is named by a hash of its own bytes, so identical content is stored once and any change produces a different hash. A commit's snapshot reuses unchanged blobs and subtrees, which is why a hundred commits touching one file do not cost a hundred copies of the repository.",
      "A **branch** is a ref - a file containing one commit hash. `HEAD` is a symbolic ref pointing at the current branch, or directly at a commit (detached HEAD). Committing writes a new tree and commit, then moves the current branch ref forward. The **index** sits between the working directory and history: `git add` copies a file's content into a blob and records that blob in the index, and `git commit` writes the index as a tree. That is why you can stage one hunk, keep editing, and commit only the staged version.",
      "**Merging** finds the common ancestor of the two tips and combines the changes each side made since then. If one tip is an ancestor of the other, Git can **fast-forward** - just move the pointer - which is indistinguishable from never having branched. Otherwise it performs a **three-way merge** and records a commit with two parents, so the graph remembers that two lines of work were joined. A conflict happens only when both sides changed the same lines, or one side edited a file the other deleted.",
      "The integration commands differ in what they rewrite. **Rebase** replays your commits onto a new base, producing new hashes, so it is for local or personal branches only. **Reset** moves the branch pointer and optionally resets the index (`--mixed`) or the working tree (`--hard`), which is safe only for commits nobody else has. **Revert** adds a new commit that applies the inverse patch, which is the correct tool on a shared branch. And **reflog** records every position HEAD has held, locally, for about 90 days.",
    ],
  },
  underTheHood: {
    text: [
      "1. **Objects, named by their content.** Every object is stored as `type size\\0content`, zlib-compressed, under `.git/objects/ab/cdef...` where `ab` is the first byte of its hash. The hash is SHA-1 (or SHA-256 in newer repositories) of those exact bytes, which has two consequences: the same content always produces the same name, so a file that appears in 500 commits is stored once; and changing one byte produces a completely different name, so history cannot be silently edited. Loose objects are later packed into `.git/objects/pack/*.pack` with deltas for size, but the model is unchanged. `git cat-file -p <hash>` pretty-prints any object, `-t` prints its type and `-s` its size.",
      "2. **A commit is a small text file.** Pretty-print one and you see `tree <hash>` (the root directory), zero or more `parent <hash>` lines, `author`, `committer` and the message. A merge commit has two `parent` lines; the first is 'ours', which matters because `git revert -m 1` and `git log --first-parent` both follow the first parent. Nothing in the commit says which files changed: the snapshot is the tree, and `git log -p` computes a diff on demand by comparing each tree with its parent's.",
      "3. **Trees hold the names, not the blobs.** A tree entry is `mode type hash name`, for example `100644 blob 8f3172... README.md` or `040000 tree f0af83... src`. Modes also distinguish executables (`100755`), symlinks (`120000`) and submodules (`160000`). Because a blob has no path, renaming a file does not create a new blob - it creates a new tree whose entry has a different name. `git ls-tree -r HEAD` flattens the whole snapshot into paths, which is the fastest way to see what a commit really contains.",
      "4. **Refs are the only mutable part.** `cat .git/HEAD` prints `ref: refs/heads/main`, and `cat .git/refs/heads/main` prints a commit hash. Packed refs live in `.git/packed-refs`, so use `git for-each-ref` or `git rev-parse` rather than reading files by hand. Because a branch is one hash, creating one is instant and deleting one loses nothing but the label. Detached HEAD means `.git/HEAD` contains a hash directly: commits you make there belong to no branch and become unreachable when you switch away - `git switch -c rescue` before moving is the fix.",
      "5. **The index is a candidate snapshot.** `.git/index` is a binary list of `(mode, blob hash, path, stat data)` entries. A normal entry is at **stage 0**. During a conflict the same path appears at stages 1, 2 and 3 (base, ours, theirs), which is exactly what `git ls-files -u` shows; resolving means collapsing those three entries back into one stage-0 entry with `git add`. The stat data (mtime, size, inode) lets `git status` skip hashing unchanged files, which is why it is fast on a large repository. The index is also what makes `git diff` (working tree vs index) and `git diff --staged` (index vs HEAD) two different questions.",
      "6. **Merge is a three-way computation.** Git finds the **merge base** - the best common ancestor, usually one commit - then compares base-to-ours and base-to-theirs per file. If only one side changed a file, that side wins; if both changed different hunks, both are applied; if both changed the same lines, Git stops and leaves the conflict for you. When the result is committed, the new tree is written and the commit names both tips as parents. The default strategy since Git 2.34 is `ort` (the message is `Merge made by the 'ort' strategy.`), which replaced `recursive` and handles rename detection and criss-cross merges more reliably.",
      "7. **Conflicts are an index state, not a broken repository.** Git writes the three versions into the index and puts markers in the file: `<<<<<<< HEAD`, your side, `=======`, their side, `>>>>>>> branch`. Setting `merge.conflictStyle` to `diff3` or `zdiff3` also shows the common ancestor between `|||||||` and `=======`, which usually makes the intent obvious. The merge is unfinished but recoverable at any point: `git merge --abort` restores the pre-merge state from `ORIG_HEAD`, and `git commit` after `git add` completes it using the prepared `MERGE_MSG`. Markers left in a committed file are a real bug, so search for `<<<<<<<` before committing.",
      "8. **Rebase replays, it does not move.** `git rebase main` finds the commits reachable from your branch but not from main, checks out main, and re-applies each commit in order, creating a new commit with a new parent - hence a new hash. Conflicts can occur per commit, which is more interruptions but smaller decisions. The old commits are not deleted; they become unreachable and sit in the reflog until garbage collection. That is why a rebase is locally reversible and socially dangerous: your teammates still have the old commits, so their next pull sees two divergent histories built from the same changes.",
      "9. **Undo is moving pointers, not erasing data.** `git reset --soft <commit>` moves only the branch ref, leaving the difference staged; `--mixed` (the default) also resets the index, leaving it in the working tree; `--hard` also overwrites the working tree. `git revert` instead computes the inverse of a commit and records it as a new commit, so everyone's history stays valid. `git reflog` reads `.git/logs/HEAD` (and `.git/logs/refs/...`), which records every move with a reason such as `reset: moving to HEAD~3`. Reflog entries expire after 90 days by default, unreachable objects after 30 - and no reflog can recover edits that were never committed, which is why commit hygiene (small, atomic, well-messaged commits) is also a recovery strategy: a clean history is easy to revert, easy to bisect, and easy to explain in review.",
    ],
    diagram: {
      title: "What a commit actually contains",
      nodes: [
        { label: "Working tree", sub: "your files" },
        { label: "Index", sub: "stage 0 entries" },
        { label: "Commit", sub: "tree + parents" },
        { label: "Root tree", sub: "names + modes" },
        { label: "Blobs / subtrees", sub: "content, stored once" },
      ],
      edges: ["git add", "git commit", "tree", "entries"],
      caption: "`git add` writes a blob and points an index entry at it. `git commit` writes the index as a tree and a commit that names that tree and its parent. Refs then point at the commit.",
    },
  },
  handsOn: [
    {
      title: "Read the object database and the index by hand",
      text: [
        "Build a two-commit repository, then open `.git` with Git's own plumbing commands. `cat-file -p` pretty-prints an object according to its type, `ls-tree` walks a snapshot, and `ls-files --stage` shows what the next commit would contain. Nothing here is a diff: you are looking at the actual stored data.",
      ],
      code: {
        lang: "bash",
        file: "objects.sh",
        code: `git init -q -b main git-lab && cd git-lab
git config core.autocrlf false        # keep line endings identical on Windows
mkdir src
printf '# DevAtlas\\n' > README.md
printf 'const TAX = 0.18;\\n\\nexport function total(price, qty) {\\n  return price * qty * (1 + TAX);\\n}\\n' > src/checkout.js
git add . && git commit -qm "Add checkout total with tax"
printf 'const TAX = 0.18;\\nconst PROMO = 0.10;\\n\\nexport function total(price, qty) {\\n  const subtotal = price * qty;\\n  return round2(subtotal * (1 - PROMO) * (1 + TAX));\\n}\\n\\nexport function round2(n) {\\n  return Math.round(n * 100) / 100;\\n}\\n' > src/checkout.js
git commit -qam "Apply promo before tax and round to 2 decimals"

echo "== git cat-file -p HEAD"
git cat-file -p HEAD
echo "== git cat-file -p HEAD^{tree}"
git cat-file -p 'HEAD^{tree}'
echo "== git ls-tree -r HEAD"
git ls-tree -r HEAD
echo "== git cat-file -p HEAD:src/checkout.js"
git cat-file -p 'HEAD:src/checkout.js'
echo "== cat .git/HEAD"
cat .git/HEAD
echo "== git for-each-ref"
git for-each-ref --format='%(refname) %(objecttype) %(objectname:short)'

printf 'export const CURRENCY = "INR";\\n' >> src/checkout.js
printf 'staged note\\n' > notes.md && git add notes.md
printf 'not added\\n' > scratch.txt
echo "== git status --short"
git status --short
echo "== git ls-files --stage"
git ls-files --stage
echo "== git diff --stat"
git diff --stat
echo "== git diff --staged --stat"
git diff --staged --stat`,
      },
      output: "== git cat-file -p HEAD\ntree 4f76a077afa9e04902b60ed02186586deccdb85b\nparent 7dfd1312d8caecab3e7b09f727d28e90bca7729f\nauthor Asha <asha@example.com> 1767607200 +0000\ncommitter Asha <asha@example.com> 1767607200 +0000\n\nApply promo before tax and round to 2 decimals\n== git cat-file -p HEAD^{tree}\n100644 blob 8f3172935b69285b52a723f9263a0a54163d48a2\tREADME.md\n040000 tree f0af83508eb194fc15ee15ecf283b195467dfcf3\tsrc\n== git ls-tree -r HEAD\n100644 blob 8f3172935b69285b52a723f9263a0a54163d48a2\tREADME.md\n100644 blob 3afd70a61e1fd10f6d77b50b776d5ef05b47e829\tsrc/checkout.js\n== git cat-file -p HEAD:src/checkout.js\nconst TAX = 0.18;\nconst PROMO = 0.10;\n\nexport function total(price, qty) {\n  const subtotal = price * qty;\n  return round2(subtotal * (1 - PROMO) * (1 + TAX));\n}\n\nexport function round2(n) {\n  return Math.round(n * 100) / 100;\n}\n== cat .git/HEAD\nref: refs/heads/main\n== git for-each-ref\nrefs/heads/main commit e9cc246\n== git status --short\nA  notes.md\n M src/checkout.js\n?? scratch.txt\n== git ls-files --stage\n100644 8f3172935b69285b52a723f9263a0a54163d48a2 0\tREADME.md\n100644 c27457a040c835caacf68e99d08412a2b31b552e 0\tnotes.md\n100644 3afd70a61e1fd10f6d77b50b776d5ef05b47e829 0\tsrc/checkout.js\n== git diff --stat\n src/checkout.js | 1 +\n 1 file changed, 1 insertion(+)\n== git diff --staged --stat\n notes.md | 1 +\n 1 file changed, 1 insertion(+)",
      notes: [
        "The commit has a `tree`, a `parent` and a message - that is the whole snapshot-plus-parent model. The blob is just the file's bytes: no filename, no path. `HEAD:src/checkout.js` is the syntax for 'the blob at this path in this commit'.",
        "Status codes are positional. `A ` (letter then space) means staged as new; ` M` (space then letter) means modified in the working tree but not staged; `??` means untracked; `UU` means both sides changed it during a merge. Column one is index-vs-HEAD, column two is working-tree-vs-index.",
        "`git ls-files --stage` ends with stage 0 for every normal entry. During a conflict the same path appears three times at stages 1, 2 and 3, which is the mechanism behind every conflict you will ever resolve.",
        "Set your identity once with `git config --global user.name \"Your Name\"` and `user.email \"you@example.com\"`; that is what appears on the `author` line. Timestamps and identity both feed the hash, so yours will differ - the shapes will not.",
      ],
    },
    {
      title: "Merge: fast-forward, or a real merge commit",
      text: [
        "The same two commits are built twice with identical author dates so the hashes match. In the first repository `main` never moved after branching, so the merge is a **fast-forward**: the pointer slides and no commit is created. In the second, `--no-ff` forces a merge commit so the feature boundary survives in the graph.",
      ],
      code: {
        lang: "bash",
        file: "merge-lab.sh",
        code: `export GIT_AUTHOR_NAME="Asha" GIT_AUTHOR_EMAIL="asha@example.com"
export GIT_COMMITTER_NAME="Asha" GIT_COMMITTER_EMAIL="asha@example.com"
export GIT_AUTHOR_DATE="2026-01-05T10:00:00Z" GIT_COMMITTER_DATE="2026-01-05T10:00:00Z"

build() {
  git init -q -b main "$1" && cd "$1"
  git config core.autocrlf false
  echo "line one" > app.txt
  git add app.txt && git commit -qm "Create app"
  echo "line two" >> app.txt
  git commit -qam "Add second line"
  git switch -qc feature/refund
  echo "refund policy" > refund.txt
  git add refund.txt && git commit -qm "Add refund policy"
  echo "refund flow" >> refund.txt
  git commit -qam "Document refund flow"
}

build ff-lab
git switch -q main
git merge feature/refund
git log --oneline --graph --decorate --all
cd ..

build noff-lab
git switch -q main
git merge --no-ff feature/refund -m "Merge feature/refund into main"
git log --oneline --graph --decorate --all
git cat-file -p HEAD | head -3`,
      },
      output: "Updating 2f36e52..8eb2e77\nFast-forward\n refund.txt | 2 ++\n 1 file changed, 2 insertions(+)\n create mode 100644 refund.txt\n* 8eb2e77 (HEAD -> main, feature/refund) Document refund flow\n* 37c3b1e Add refund policy\n* 2f36e52 Add second line\n* d2d6588 Create app\nMerge made by the 'ort' strategy.\n refund.txt | 2 ++\n 1 file changed, 2 insertions(+)\n create mode 100644 refund.txt\n*   bbc58cf (HEAD -> main) Merge feature/refund into main\n|\\  \n| * 8eb2e77 (feature/refund) Document refund flow\n| * 37c3b1e Add refund policy\n|/  \n* 2f36e52 Add second line\n* d2d6588 Create app\ntree e3045598c78cc70e1e5c726389e1c55230fc38a3\nparent 2f36e5218fde0dc721a6d4d9fac03010fe056901\nparent 8eb2e7774e19fe8c67791510b4309c827469735f",
      notes: [
        "After the fast-forward, `main` and `feature/refund` point at the same commit (8eb2e77). You can delete the branch with no loss of history - there was never any divergence to record.",
        "After `--no-ff`, the merge commit bbc58cf has two `parent` lines. This is what makes the feature reviewable later: `git log --first-parent main` shows 'Merge feature/refund' as one event instead of replaying internals, and `git revert -m 1 bbc58cf` can undo the whole feature in one step.",
        "A fast-forward is only possible when `main` has no commits the branch lacks. If both sides moved, Git must three-way merge, or stop with a conflict. `git merge --ff-only` is a useful guard when you expect a clean slide and want to fail loudly otherwise.",
      ],
    },
    {
      title: "A real conflict, from markers to resolution",
      text: [
        "Both branches change the same line: `main` adds rounding, `feature/tax` adds 18% tax. Git cannot decide the business rule, so it stops and asks. Watch the index stages, the markers, and the fact that a non-conflicting file (`tax.js`) is merged automatically.",
      ],
      code: {
        lang: "bash",
        file: "conflict.sh",
        code: `export GIT_AUTHOR_NAME="Asha" GIT_AUTHOR_EMAIL="asha@example.com"
export GIT_COMMITTER_NAME="Asha" GIT_COMMITTER_EMAIL="asha@example.com"
export GIT_AUTHOR_DATE="2026-01-05T10:00:00Z" GIT_COMMITTER_DATE="2026-01-05T10:00:00Z"

git init -q -b main conflict-lab && cd conflict-lab
git config core.autocrlf false

printf 'export function total(price, qty) {\\n  return price * qty;\\n}\\n' > pricing.js
git add pricing.js && git commit -qm "Add checkout total"

git switch -qc feature/tax
printf 'export function total(price, qty) {\\n  return price * qty * 1.18;\\n}\\n' > pricing.js
printf 'export const TAX_RATE = 0.18;\\n' > tax.js
git add . && git commit -qm "Apply 18% tax"

git switch -q main
printf 'export function total(price, qty) {\\n  return Math.round(price * qty * 100) / 100;\\n}\\n' > pricing.js
git commit -qam "Round totals to 2 decimals"

git merge feature/tax || true
echo "== git status --short"
git status --short
echo "== git ls-files -u  (stages 1=base, 2=ours, 3=theirs)"
git ls-files -u
echo "== pricing.js"
cat pricing.js

printf 'export function total(price, qty) {\\n  return Math.round(price * qty * 1.18 * 100) / 100;\\n}\\n' > pricing.js
printf 'import { total } from "./pricing.js";\\nif (total(100, 2) !== 236) throw new Error("wrong total");\\nconsole.log("total(100, 2) =", total(100, 2));\\n' > check.mjs
echo "== node check.mjs"
node check.mjs
git add pricing.js check.mjs
git commit --no-edit
echo "== git log --oneline --graph --decorate --all"
git log --oneline --graph --decorate --all`,
      },
      output: "Auto-merging pricing.js\nCONFLICT (content): Merge conflict in pricing.js\nAutomatic merge failed; fix conflicts and then commit the result.\n== git status --short\nUU pricing.js\nA  tax.js\n== git ls-files -u  (stages 1=base, 2=ours, 3=theirs)\n100644 c80f26903b7c99eda043bf10a3612df8210e8e68 1\tpricing.js\n100644 e92d52154e725b82ed3fffe88ceea153f218039a 2\tpricing.js\n100644 a8b1120007daf8a3b8837a7488dc683a87e67445 3\tpricing.js\n== pricing.js\nexport function total(price, qty) {\n<<<<<<< HEAD\n  return Math.round(price * qty * 100) / 100;\n=======\n  return price * qty * 1.18;\n>>>>>>> feature/tax\n}\n== node check.mjs\ntotal(100, 2) = 236\n[main 804aa7b] Merge branch 'feature/tax'\n== git log --oneline --graph --decorate --all\n*   804aa7b (HEAD -> main) Merge branch 'feature/tax'\n|\\  \n| * bf882ba (feature/tax) Apply 18% tax\n* | 025680b Round totals to 2 decimals\n|/  \n* 5af13b9 Add checkout total",
      notes: [
        "`UU` means unmerged in both directions. `A  tax.js` shows the other file was merged and staged automatically - conflicts are per overlapping hunk, not per merge.",
        "The three index entries are the base version (stage 1), your version (stage 2) and theirs (stage 3). `git checkout --ours pricing.js` / `--theirs` pull one of those blobs out; editing by hand and running `git add` collapses all three back to stage 0.",
        "The resolution applies tax first, then rounds, because that is the intended business rule. `node check.mjs` proves it before the merge is committed; `git commit` reuses the prepared merge message. If unsure about intent, ask the author - a conflict is a question about behaviour, not a technical error.",
        "Changed your mind mid-merge? `git merge --abort` returns to the state before the merge. `git diff` during a conflict shows a combined diff, which is rarely what you want; open the file instead.",
      ],
    },
    {
      title: "Merge vs rebase vs reset vs revert",
      text: [
        "These commands are not interchangeable; each answers a different question about history. Read the table by asking: what must stay true for other people, and what has already been published?",
      ],
      code: {
        lang: "text",
        file: "integration.txt",
        code: `command              branch ref   index   files   safe on shared?   history effect
git merge            moves        -       -       yes               adds a merge commit (or fast-forwards)
git rebase           moves        -       -       NO                replays your commits, new hashes
git reset --soft     moves        -       -       local only        drops commits, change stays staged
git reset --mixed    moves        yes     -       local only        drops commits, change stays unstaged
git reset --hard     moves        yes     yes     local only        drops commits AND working edits
git revert <hash>    moves        -       -       yes               adds the inverse commit

fast-forward      target branch is an ancestor -> pointer slides, no commit
--no-ff           force a merge commit even when a fast-forward is possible
three-way merge   base + ours + theirs -> one tree; conflict if the same lines changed
ORIG_HEAD         where HEAD was before a merge, rebase or reset
HEAD@{n}          the n-th previous position of HEAD, read from the reflog`,
      },
      notes: [
        "The practical rule: rewrite private history freely (rebase, reset, amend); never rewrite published history (use revert, or a merge). If a rewrite already happened locally, `git reflog` plus `git reset --hard ORIG_HEAD` is the undo.",
        "`reset --soft` is the 'oops, wrong commit message / wrong commit boundary' tool. `--mixed` is 'I staged too much'. `--hard` is 'throw this away', and it is the only one that can destroy uncommitted edits, which no reflog can bring back.",
      ],
    },
    {
      title: "Draw what Git stores",
      text: [
        "Sketch this once and the commands stop being magic. Solid arrows are stored by the commit; dotted arrows are refs, which are the only things that move when you commit, merge, rebase or reset.",
      ],
      code: {
        lang: "mermaid",
        file: "objects.mmd",
        code: `graph TD
  WT["working tree<br/>pricing.js"] -->|git add| IDX["index<br/>stage 0 entries"]
  IDX -->|git commit| C["commit 804aa7b<br/>tree + parent"]
  C --> T["root tree"]
  T --> S["tree src"]
  T --> B1["blob README.md"]
  S --> B2["blob pricing.js"]
  R["refs/heads/main"] -.->|points at| C
  H["HEAD"] -.->|symbolic ref| R
  C -.->|parent| P["commit 025680b"]`,
      },
      notes: [
        "A branch, a tag and HEAD are all just names for hashes. That is why moving between branches is instant and why deleting a branch cannot delete commits that another ref still reaches.",
      ],
    },
  ],
  companies: [
    "**Trunk-based development at large product companies (illustrative):** teams that deploy many times a day keep branches short-lived (hours to a couple of days), merge small pull requests constantly, and hide unfinished work behind feature flags instead of long-lived branches. The reason is structural: the longer two branches diverge, the larger the three-way merge and the higher the chance of semantic conflicts that no marker will show.",
    "**Pull requests as the quality gate (illustrative):** GitHub, GitLab and Azure DevOps all build the same primitive - a branch plus a compare view plus required checks. Branch protection rules require reviews and green CI before merging to main, and many teams require a linear history or squash merges to keep `git log` readable. The merge button is a policy decision about history shape, not just a convenience.",
    "**The Linux kernel workflow (illustrative):** the kernel has thousands of contributors and no single shared branch. Maintainers pull signed tags from subsystem trees, so tags and `--no-ff` merges carry real meaning: a merge commit records who integrated what, and a signed tag records that the tree was reviewed. This is the extreme end of 'history is a durable public record'.",
    "**Conventional Commits and generated changelogs (illustrative):** projects such as Angular popularised `feat:`, `fix:` and `BREAKING CHANGE:` prefixes so tooling can compute the next semantic version and generate release notes from commit subjects. It works because a commit message is data, not decoration - and it only works if commits are small enough for one subject to describe them.",
    "**Git 2.56.0's `ort` merge strategy (verified in this lesson):** the real merge output above says `Merge made by the 'ort' strategy.` - the default since Git 2.34. It replaced `recursive` and handles rename detection, directory/file conflicts and criss-cross histories more predictably. The strategy name in the output is a useful clue when a merge behaves differently on an old Git install.",
  ],
  mistakes: [
    { mistake: "Force-pushing a shared branch", why: "After a rebase or amend, a normal push is rejected", wrong: "Teammates' commits disappear from the remote and their next pull recreates the old history", fix: "Never rewrite published history. If you must on your own branch, use --force-with-lease so you fail if someone else pushed" },
    { mistake: "Committing secrets (.env, keys)", why: "`git add .` adds everything", wrong: "The secret stays in history even after deleting the file; bots scan GitHub for keys within minutes", fix: "Use .gitignore from day one, rotate any leaked secret immediately, enable secret scanning and push protection" },
    { mistake: "Giant 'misc changes' commits", why: "Committing only at the end of the day", wrong: "Reviews are impossible, `git bisect` cannot isolate the bug, and reverting one change reverts five", fix: "One logical change per commit, each with a message explaining why; stage hunks with `git add -p`" },
    { mistake: "Resolving conflicts by picking 'mine' everywhere", why: "Wanting the conflict to go away", wrong: "Someone else's fix is silently lost and tests pass only because the lost code was untested", fix: "Read both sides and the base (diff3 style), understand intent, resolve to the correct behaviour, run tests" },
    { mistake: "Treating `reset --hard` as an undo for uncommitted work", why: "It looks like the universal undo", wrong: "Edits that were never committed are gone; the reflog only stores commits", fix: "Use `git restore` or `git stash` for working-tree changes; reserve `--hard` for discarding a branch position you are sure about" },
    { mistake: "Panicking after a bad reset or rebase", why: "Commits look gone from `git log`", wrong: "People delete and re-clone, losing local branches and uncommitted work", fix: "`git reflog` shows previous HEAD positions; `git branch rescue <hash>` pins the commits before doing anything else" },
    { mistake: "Rebasing a pull-request branch other people are reviewing", why: "'Clean history' feels like an improvement", wrong: "Every reviewer's local branch diverges and inline comments are attached to commits that no longer exist", fix: "Rebase before requesting review; after review, merge or squash instead of rewriting" },
    { mistake: "Leaving conflict markers in a committed file", why: "The tests happened to pass or nobody ran the app", wrong: "`<<<<<<<` reaches production as a syntax error or, worse, silently drops a branch of logic", fix: "Search for markers (`git diff --check`, `grep -rn '<<<<<<<'`) and run tests before `git add` and `git commit`" },
  ],
  bestPractices: [
    { tag: "Security", text: "Add `.env`, credentials and build output to `.gitignore` from day one. Enable secret scanning and push protection, and treat any committed key as compromised and rotate it." },
    { tag: "Maintainability", text: "Commit messages: imperative subject under ~72 characters ('Fix tax rounding for INR'), then a body that explains why. The diff already says what changed." },
    { tag: "Reliability", text: "Protect main: require PR review and green CI. Use `git revert` on shared branches and keep `main` always deployable; a revert should never need a second emergency fix." },
    { tag: "Performance", text: "Keep large binaries out of Git (use Git LFS or object storage). They bloat every clone forever and slow every CI checkout, even after deletion." },
    { tag: "Cost", text: "Small repositories mean fast clones, cheap CI runners and quick incident recovery. History hygiene is an infrastructure cost decision as much as a readability one." },
  ],
  interview: [
    { q: "Explain Git's object model, and why a commit is not a diff.", a: "Git stores four object types, each named by a hash of its own bytes: blobs hold file contents, trees hold directory entries (mode, type, hash, name), commits hold a tree plus parent pointers plus author/committer/message, and annotated tags label an object with metadata. Because names are content hashes, identical content is stored once and any edit produces a new object, so history is immutable. A commit is a full snapshot via its root tree, not a patch; unchanged files are the same blobs referenced again, which is why snapshots are cheap. Diffs are computed on demand by comparing a tree with its parent's tree, which is what `git log -p` and `git show` do. That model explains branches (one hash), cheap branching, merge commits (two parent lines) and why rebasing produces new hashes: the replayed commit has a different parent, so its bytes and hash differ." },
    { q: "Walk me through a merge conflict: what state is the repository in, and how do you resolve it safely?", a: "Git found the merge base, compared base-to-ours and base-to-theirs, and could not combine one or more hunks. It stops before committing and writes three versions of each conflicted path into the index at stages 1 (base), 2 (ours) and 3 (theirs); `git status` shows `UU` and `git ls-files -u` shows the entries. The working file contains markers separating your side from theirs, and with `merge.conflictStyle=diff3` also the base, which is usually the fastest way to understand intent. I read both sides and the base, decide the correct behaviour - often a business question, so I ask the author - edit the file to the final content, remove the markers, and verify with tests or a run. Then `git add` collapses the three entries to stage 0 and `git commit` uses the prepared merge message. `git merge --abort` is available at any point before the commit and restores the pre-merge state; `ORIG_HEAD` records it." },
    { q: "A teammate force-pushed a rebased branch that you had already pulled. What happened, and how do you recover without losing either side's work?", a: "Their commits were replayed onto a new base, so every commit has a new hash. My local branch still points at the old commits, and my new work sits on top of them. Git now sees two histories that contain the same logical changes with different hashes, so a normal pull tries to merge duplicates or reports divergence. First I stop and inspect: `git log --oneline --graph --all` and `git reflog` show both lines and where my work is. To adopt their history I create a safety branch at my current tip (`git branch rescue`), then `git fetch` and `git reset --hard origin/branch`, and finally replay only my own new commits with `git cherry-pick <old-hash>` (or `git rebase --onto`), resolving anything that conflicts. If their force-push was accidental, the remote's reflog is not available to me, but their local reflog or a CI artifact may hold the old tip. The lasting fix is process: use `--force-with-lease`, never rewrite a branch under review, and protect the shared branch." },
  ],
  quickCheck: [
    {
      kind: "mcq",
      prompt: "What is a Git branch, technically?",
      options: ["A full copy of the project files", "A pointer to a single commit", "A diff against main", "A folder inside .git/objects"],
      answer: 1,
      explanation: "A branch is a ref containing one commit hash. That is why creating branches is instant and deleting one loses no commits that another ref still reaches.",
    },
    {
      kind: "output",
      prompt: "After `git reset --soft HEAD~1`, `git status --short` prints `M  notes.md` (letter, then two spaces). What is true?",
      options: ["The commit and the edit are both gone", "The branch moved back one commit and the change is staged", "The change is unstaged but present", "The file is untracked"],
      answer: 1,
      explanation: "`--soft` moves only the branch ref. The index still holds the change, so column one is M and column two is blank.",
    },
    {
      kind: "bug",
      prompt: "You rebase your feature branch and push. A teammate who had pulled it now sees duplicated commits and a broken merge. Why?",
      options: ["The remote is corrupt", "Rebase created new commits with new hashes, so their old commits and yours are different objects", "Rebase deleted their local branch", "Git needs a full clone after any rebase"],
      answer: 1,
      explanation: "Rewriting changes the parent, so the hash changes. Anyone holding the old commits now has a divergent history; only rewrite branches nobody else has pulled.",
    },
  ],
  cheatSheet: [
    "Blob = file content, tree = directory, commit = tree + parent(s), tag = labelled object. All named by a content hash.",
    "A branch is one hash in `.git/refs/heads`; HEAD is `ref: refs/heads/<branch>`. Creating a branch writes a few bytes.",
    "`git cat-file -p <hash>` pretty-prints any object; `git ls-tree -r HEAD` walks a snapshot; `git cat-file -t` gives the type.",
    "Status: `A ` staged, ` M` unstaged, `??` untracked, `UU` conflicted. `git diff` = worktree vs index; `git diff --staged` = index vs HEAD.",
    "Fast-forward = the target is an ancestor, so the pointer slides. `--no-ff` forces a merge commit; `--ff-only` refuses anything else.",
    "Three-way merge = base + ours + theirs. The merge commit has two parents; the first is 'ours' for revert and `--first-parent`.",
    "Conflict: read both sides (use diff3), edit to the final behaviour, remove markers, `git add`, `git commit`. `git merge --abort` bails out.",
    "Rebase rewrites commits (new hashes) for a linear history. Only on branches nobody else has pulled.",
    "`reset --soft` moves the pointer, `--mixed` also resets the index, `--hard` also overwrites files. `revert` adds an inverse commit - safe when shared.",
    "`git reflog` is local and time-limited (90 days by default). It recovers commits, never uncommitted edits.",
  ],
  homework: {
    basic: {
      title: "Undo one commit three ways",
      brief: [
        "In a fresh repo, make three commits to `notes.md`. Undo the last one with `--soft`, inspect status, then `--mixed`, inspect again, then `--hard`. Finally, on the remaining branch, revert a commit and compare the graph with what a reset would have produced.",
      ],
      criteria: ["All three reset modes demonstrated with `git status --short` output", "One sentence per mode on what moved (branch, index, working tree)", "A revert shown with `git log` proving history was added, not rewritten"],
      hints: ["`--soft` keeps the change staged; `--mixed` unstages it; `--hard` deletes it.", "Compare `git log` after reset (commit gone) with `git log` after revert (commit still there, plus a new one)."],
      solution: {
        text: [
          "`--soft` moves only the branch: the commit disappears from `git log`, but the index still matches the old commit's tree, so the change is staged (`M ` in column one). `--mixed` moves the branch and resets the index, so the same change becomes unstaged (` M` in column two). `--hard` also overwrites the working tree, so the content is gone; nothing in Git can recover it because it was never a commit.",
          "`revert` is the opposite approach: it computes the inverse of the chosen commit and records a new commit on top. History grows, every existing hash stays valid, and teammates need no special action - which is why it is the tool for a shared branch.",
          "Note the exact spacing in `git status --short`: `M  notes.md` is staged, ` M notes.md` is not. Reading the two columns is faster than reading the prose.",
        ],
        code: {
          lang: "bash",
          file: "undo-lab.sh",
          code: `#!/usr/bin/env bash
# One commit, undone at all three levels, then a revert for comparison.
set -euo pipefail
export GIT_AUTHOR_NAME="Asha" GIT_AUTHOR_EMAIL="asha@example.com"
export GIT_COMMITTER_NAME="Asha" GIT_COMMITTER_EMAIL="asha@example.com"
export GIT_AUTHOR_DATE="2026-01-05T10:00:00Z" GIT_COMMITTER_DATE="2026-01-05T10:00:00Z"

rm -rf undo-lab && git init -q -b main undo-lab && cd undo-lab
git config core.autocrlf false
printf '# notes\\n' > notes.md && git add notes.md && git commit -qm "Create notes"
printf '# notes\\n- DNS\\n' > notes.md && git commit -qam "Add DNS notes"
printf '# notes\\n- DNS\\n- TCP\\n' > notes.md && git commit -qam "Add TCP notes"

echo "== git log --oneline"; git log --oneline
echo "== git reset --soft HEAD~1"; git reset --soft HEAD~1
echo "== git status --short"; git status --short
echo "== git log --oneline"; git log --oneline
echo "== git reset HEAD  (mixed)"; git reset HEAD
echo "== git status --short"; git status --short
echo "== git reset --hard HEAD"; git reset --hard HEAD
echo "== cat notes.md"; cat notes.md
echo "== git revert --no-edit HEAD"; git revert --no-edit HEAD
echo "== git log --oneline"; git log --oneline
echo "== cat notes.md"; cat notes.md`,
        },
        output: "== git log --oneline\n1bf9dd6 Add TCP notes\n276a216 Add DNS notes\n4d26379 Create notes\n== git reset --soft HEAD~1\n== git status --short\nM  notes.md\n== git log --oneline\n276a216 Add DNS notes\n4d26379 Create notes\n== git reset HEAD  (mixed)\nUnstaged changes after reset:\nM\tnotes.md\n== git status --short\n M notes.md\n== git reset --hard HEAD\nHEAD is now at 276a216 Add DNS notes\n== cat notes.md\n# notes\n- DNS\n== git revert --no-edit HEAD\n[main 9d05ea0] Revert \"Add DNS notes\"\n Date: Mon Jan 5 10:00:00 2026 +0000\n 1 file changed, 1 deletion(-)\n== git log --oneline\n9d05ea0 Revert \"Add DNS notes\"\n276a216 Add DNS notes\n4d26379 Create notes\n== cat notes.md\n# notes",
        pitfalls: ["Expecting the reflog to recover edits destroyed by `--hard` before they were committed", "Using reset on a branch other people have pulled instead of revert"],
      },
    },
    intermediate: {
      title: "Conflict with three changes",
      brief: ["Create a conflict where both branches change the same function in different ways AND one branch also adds a new function. Resolve it so both intents survive. Write a short note on how you decided."],
      criteria: ["Conflict markers removed", "Both behaviours preserved where they are compatible", "A test or run proving the result works"],
      hints: ["Non-overlapping changes merge automatically; only the overlapping hunk conflicts.", "Set `merge.conflictStyle` to `diff3` to see the common ancestor inside the markers."],
      solution: {
        text: [
          "Git auto-merges the new function because it does not overlap. Only the edited function conflicts. Combine both edits by understanding intent (e.g. one adds validation, the other changes the formula: keep validation and the new formula), then run the code or tests.",
          "conflict_lab.sh builds the scenario in a throwaway repo with fixed commit dates, so your hashes match the output. `merge.conflictStyle diff3` adds a `|||||||` section with the original line, which makes intent obvious: main added validation above an unchanged return, the branch changed only the return. Both survive. TAX_RATE and format_total merged automatically because they are separate hunks.",
          "Decision note: the validation and the tax formula are independent, so the resolved function validates first and then applies tax. check_pricing.py proves all three changes are present before the merge is committed.",
        ],
        code: { lang: "bash", file: "conflict_lab.sh", code: `#!/usr/bin/env bash
# Two branches change the same function; one also adds a new function. Merge, resolve, test.
set -euo pipefail
export GIT_AUTHOR_NAME="Asha" GIT_AUTHOR_EMAIL="asha@example.com"
export GIT_COMMITTER_NAME="Asha" GIT_COMMITTER_EMAIL="asha@example.com"
export GIT_AUTHOR_DATE="2026-01-05T10:00:00Z" GIT_COMMITTER_DATE="2026-01-05T10:00:00Z"  # fixed dates: same hashes as shown

rm -rf conflict-lab2 && git init -q -b main conflict-lab2 && cd conflict-lab2
git config merge.conflictStyle diff3          # conflicts also show the common ancestor

cat > pricing.py <<'PY'
"""Checkout pricing."""


def total(price: float, qty: int) -> float:
    return price * qty


def discount(amount: float, percent: float) -> float:
    return amount * (1 - percent / 100)
PY
git add pricing.py && git commit -qm "Add pricing"

git switch -qc feature/tax                    # changes 1 + 2: new formula, new function
cat > pricing.py <<'PY'
"""Checkout pricing."""

TAX_RATE = 0.18


def total(price: float, qty: int) -> float:
    return round(price * qty * (1 + TAX_RATE), 2)


def discount(amount: float, percent: float) -> float:
    return amount * (1 - percent / 100)


def format_total(amount: float) -> str:
    return f"INR {amount:,.2f}"
PY
git commit -qam "Add 18% tax and format_total"

git switch -q main                            # change 3: validation in the same function
cat > pricing.py <<'PY'
"""Checkout pricing."""


def total(price: float, qty: int) -> float:
    if qty <= 0:
        raise ValueError("qty must be positive")
    return price * qty


def discount(amount: float, percent: float) -> float:
    return amount * (1 - percent / 100)
PY
git commit -qam "Reject non-positive quantities"

echo "== merge"
git merge feature/tax || true                 # exits 1 on conflict; we resolve below
echo "== conflicted: $(git diff --name-only --diff-filter=U)"
cat pricing.py

echo "== resolve: keep main's validation AND the branch's tax formula"
python3 - <<'PY'
import re
from pathlib import Path
p = Path("pricing.py")
resolved = ('    if qty <= 0:\\n        raise ValueError("qty must be positive")\\n'
            '    return round(price * qty * (1 + TAX_RATE), 2)\\n')
p.write_text(re.sub(r"<<<<<<< .*?>>>>>>> [^\\n]*\\n", resolved, p.read_text(), flags=re.S))
PY
if grep -nE '^(<<<<<<<|=======|>>>>>>>|\\|{7})' pricing.py; then
  echo "conflict markers left" >&2; exit 1
fi

cat > check_pricing.py <<'PY'
from pricing import discount, format_total, total

assert total(100.0, 2) == 236.0, "tax formula from feature/tax"
try:
    total(100.0, 0)
    raise SystemExit("validation from main was lost")
except ValueError:
    pass
assert format_total(discount(total(1000.0, 1), 10)) == "INR 1,062.00", "new function merged"
print("all 3 checks passed")
PY
python3 check_pricing.py
git add pricing.py check_pricing.py
git commit -q --no-edit                       # completes the merge with the default message
git log --oneline --graph --all` },
        output: "== merge\nAuto-merging pricing.py\nCONFLICT (content): Merge conflict in pricing.py\nAutomatic merge failed; fix conflicts and then commit the result.\n== conflicted: pricing.py\n\"\"\"Checkout pricing.\"\"\"\n\nTAX_RATE = 0.18\n\n\ndef total(price: float, qty: int) -> float:\n<<<<<<< HEAD\n    if qty <= 0:\n        raise ValueError(\"qty must be positive\")\n    return price * qty\n||||||| 5a80c0a\n    return price * qty\n=======\n    return round(price * qty * (1 + TAX_RATE), 2)\n>>>>>>> feature/tax\n\n\ndef discount(amount: float, percent: float) -> float:\n    return amount * (1 - percent / 100)\n\n\ndef format_total(amount: float) -> str:\n    return f\"INR {amount:,.2f}\"\n== resolve: keep main's validation AND the branch's tax formula\nall 3 checks passed\n*   166f8bd Merge branch 'feature/tax'\n|\\  \n| * 653aa48 Add 18% tax and format_total\n* | 5ff4dad Reject non-positive quantities\n|/  \n* 5a80c0a Add pricing",
        pitfalls: ["Accepting one side wholesale and losing the other's fix", "Committing with markers still in the file (search for <<<<<<< before committing)"],
      },
    },
    challenge: {
      title: "Recover lost work",
      brief: ["Make 3 commits, then run `git reset --hard HEAD~3`. Recover all three commits using only Git. Then explain in 3 sentences why this worked and when it would not."],
      criteria: ["Commits recovered", "Uses git reflog", "Explains reflog's limits"],
      hints: ["`git reflog` then `git reset --hard <hash>` or `git branch rescue <hash>`.", "Pin the commits with a branch before moving `main` back."],
      solution: {
        text: [
          "`git reflog` lists every position HEAD pointed to; the entry before the reset is the old tip. `git reset --hard HEAD@{1}` or `git branch rescue <hash>` restores it.",
          "It works because commits are not deleted immediately; they become unreachable and are garbage-collected later (by default reflog entries expire after about 90 days, unreachable objects after about 30). It does not help for changes that were never committed, or in a different clone.",
          "recover_lab.sh reproduces the accident and the rescue. Pin the commits with a branch before anything else (`git branch rescue <hash>`), then move main. `HEAD@{1}` is only the right entry if nothing has moved HEAD since the reset, so read the reflog before using it.",
        ],
        code: { lang: "bash", file: "recover_lab.sh", code: `#!/usr/bin/env bash
# Lose three commits with reset --hard, then get them back with the reflog.
set -euo pipefail
export GIT_AUTHOR_NAME="Asha" GIT_AUTHOR_EMAIL="asha@example.com"
export GIT_COMMITTER_NAME="Asha" GIT_COMMITTER_EMAIL="asha@example.com"
export GIT_AUTHOR_DATE="2026-01-05T10:00:00Z" GIT_COMMITTER_DATE="2026-01-05T10:00:00Z"  # fixed dates: same hashes as shown

rm -rf recover-lab && git init -q -b main recover-lab && cd recover-lab
git config core.autocrlf false
echo "# notes" > notes.md && git add notes.md && git commit -qm "Start notes"
for topic in DNS TCP TLS; do
  echo "- $topic" >> notes.md && git commit -qam "Add $topic notes"
done
echo "== before"; git log --oneline

git reset --hard HEAD~3                       # the "accident"

echo "== reflog: every place HEAD has been"
git reflog -n 6

lost=$(git rev-parse 'HEAD@{1}')             # where HEAD was just before the reset
git branch rescue "$lost"                     # safe first step: pin the commits with a branch
git reset --hard rescue                       # then move main back to them
git branch -d rescue
echo "== recovered"; git log --oneline
cat notes.md` },
        output: "== before\n4357b41 Add TLS notes\n508ff08 Add TCP notes\n6e0526f Add DNS notes\n27c10c4 Start notes\nHEAD is now at 27c10c4 Start notes\n== reflog: every place HEAD has been\n27c10c4 HEAD@{0}: reset: moving to HEAD~3\n4357b41 HEAD@{1}: commit: Add TLS notes\n508ff08 HEAD@{2}: commit: Add TCP notes\n6e0526f HEAD@{3}: commit: Add DNS notes\n27c10c4 HEAD@{4}: commit (initial): Start notes\nHEAD is now at 4357b41 Add TLS notes\nDeleted branch rescue (was 4357b41).\n== recovered\n4357b41 Add TLS notes\n508ff08 Add TCP notes\n6e0526f Add DNS notes\n27c10c4 Start notes\n# notes\n- DNS\n- TCP\n- TLS",
        pitfalls: ["Using HEAD@{1} after other commands have moved HEAD", "Running `git gc --prune=now` or deleting the clone before recovering"],
      },
    },
    capstone: {
      title: "DevAtlas step 3: repository hygiene",
      brief: ["Push DevAtlas to GitHub. Add a `.gitignore` (node, dotnet, python), a branch protection rule on main requiring a PR, and open your first PR that adds the setup script from the previous step."],
      criteria: [".gitignore excludes node_modules, bin/obj, __pycache__, .env", "main is protected", "One merged PR with a clear title and description", "`git check-ignore -v .env` proves the ignore rule matches"],
      hints: ["GitHub: Settings → Branches (or Rules → Rulesets).", "`git status --short --ignored` shows what is ignored with `!!`."],
      solution: {
        text: [
          "Use a PR description with: what changed, why, how it was tested. This habit is what reviewers notice first in a portfolio.",
          "Verify rather than assume: `git check-ignore -v .env` prints the file and line number of the matching rule, and `git status --short --ignored` lists ignored paths with `!!`. If a secret was ever committed, ignoring it now is not enough - rotate it, because history still contains it.",
        ],
        code: { lang: "text", file: ".gitignore", code: "node_modules/\ndist/\nbin/\nobj/\n__pycache__/\n.venv/\n.env\n.env.*\n*.log\n.DS_Store" },
        output: "!! .env\n.gitignore:2:.env\t.env",
      },
    },
  },
  deeper: [
    { label: "Pro Git book (free): Git internals", url: "https://git-scm.com/book/en/v2" },
    { label: "git-cat-file: inspect any object", url: "https://git-scm.com/docs/git-cat-file" },
    { label: "git-merge: strategies, fast-forward and conflicts", url: "https://git-scm.com/docs/git-merge" },
    { label: "git-rebase: replaying commits and --onto", url: "https://git-scm.com/docs/git-rebase" },
    { label: "git-reset: the three modes explained", url: "https://git-scm.com/docs/git-reset" },
    { label: "git-reflog: recover lost commits", url: "https://git-scm.com/docs/git-reflog" },
  ],
  nextPreview: "Next: team workflow. Pull requests, code review and branch protection: how teams ship together without breaking main, and why the history shape you choose in this lesson decides how easy that is.",
};
