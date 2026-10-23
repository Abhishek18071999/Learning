import type { Lesson } from "../../types";

export const lesson: Lesson = {
  id: "6.5.1",
  title: "Writing design docs, RFCs and ADRs",
  minutes: 70,
  level: "Advanced",
  prerequisites: ["6.1.1 SOLID, patterns and clean architecture", "6.3.2 The design method: requirements, estimates and numbers to know", "0.3.2 Team workflow: pull requests and code review"],
  summary: "Turn a design into a document other people can review and a decision future engineers can trust: the design doc, the RFC, the ADR and the runbook, with a full worked example for DevAtlas bookmarks.",
  terms: [
    { term: "Design doc", def: "A written proposal for a non-trivial change: context, goals and non-goals, requirements, options with trade-offs, the chosen design, failure modes and rollout. It is reviewed before code, and it is a proposal, not a specification." },
    { term: "RFC", def: "Request For Comments. A design document published to a wide audience for asynchronous comment, used when a change affects other teams or an open-source community. The name describes the process: circulate, collect objections, revise, decide." },
    { term: "ADR", def: "Architecture Decision Record. A short, numbered, immutable note capturing one significant decision: context, decision, status and consequences. The set of ADRs is the project's decision log." },
    { term: "Runbook", def: "An operational procedure for a specific situation: deploy, roll back, fail over, rotate a credential, restore a backup. It is written to be followed under pressure, not to explain why the system is shaped this way." },
    { term: "Decision log", def: "The ordered collection of ADRs in a repository. Reading it top to bottom reconstructs why the architecture looks the way it does, including decisions later reversed." },
    { term: "Context", def: "The facts and forces around a decision: constraints, traffic, deadlines, team size, existing systems, regulatory rules. In an ADR it is value-neutral; the argument belongs in the decision and consequences." },
    { term: "Non-goals", def: "Things that could reasonably have been goals but are explicitly excluded, such as 'no real-time sync in v1' or 'ACID is not a goal'. They prevent scope creep and make the trade-off honest." },
    { term: "Trade-off", def: "What you give up to get something. A design document is useful only if it names the cost of the chosen option: latency, money, operational burden, migration risk, team cognitive load." },
    { term: "Design review", def: "A timed meeting or comment window with one question: should we accept, revise or reject this proposal? The author presents, a named decision owner decides, and objections are recorded." },
    { term: "Superseded", def: "An ADR status meaning a later ADR replaced this decision. The old record stays in the log, because knowing what was decided and why is still useful; it is never edited into the new decision." },
    { term: "3 a.m. reader", def: "The exhausted on-call engineer who opens your document during an incident. They need the decision, the exact command, the dashboard and the rollback in the first screen, not a history of the project." },
  ],
  problem: [
    "A product manager asks for saved lessons. Six weeks later the feature ships, and a new engineer asks why bookmarks live in a separate service instead of a table in the main database. Nobody remembers: the reasoning was in a chat thread, two video calls and a pull request description that was overwritten by review comments. The code is documented; the decision is not.",
    "The same failure repeats in the other direction. An engineer opens a pull request with a finished implementation and invites review. Reviewers can only comment on the code that exists, so alternatives were never compared, costs were never estimated, and a reversible choice and an irreversible one receive the same five-minute review. Writing the design down fixes both: it moves the decision earlier, when changing it is cheap, and it leaves a record that survives the people who made it. This lesson covers the four artifacts teams actually use, then writes a complete design doc and a complete ADR for the DevAtlas bookmarks feature.",
  ],
  concept: {
    analogy: [
      "A building project. The design doc is the architect's brief: what the building is for, what it is not for, three layouts with costs, and why this one was chosen. The ADR is the signed permit in the filing cabinet: one decision, its date, its reason, and what it commits the building to. The runbook is the evacuation plan on the wall: what to do at 3 a.m. when the alarm sounds. You would not hand a fire warden the architect's brief and expect them to find the exit.",
      "A court case. The design doc is the brief that argues the options. The design review is the hearing where the argument is tested. The ADR is the ruling, short and citable. Later cases cite the ruling, and if it is overturned the old ruling stays on the books marked as superseded. A runbook is the procedure the clerk follows to file the paperwork.",
    ],
    precise: [
      "**Four artifacts, four jobs.** A design doc is for a *choice that is still open*: it lays out the problem, the constraints and at least two real options, then recommends one. An RFC is a design doc with a wide comment audience and a formal comment period; the content is similar, the process is what differs. An ADR is for a *decision that is made*: one page, one choice, immutable once accepted. A runbook is for *operating the result*: ordered steps, exact commands, verification and rollback. Most features need a design doc (or RFC) first, one or more ADRs when decisions are accepted, and a runbook when they go to production.",
      "**A design doc has a predictable skeleton.** Context and scope; goals and non-goals; functional and non-functional requirements with numbers; options with trade-offs (including 'do nothing'); the chosen design with a data model and API sketch; failure modes; rollout and rollback; open questions. The skeleton is not bureaucracy: each section answers a question a reviewer would otherwise ask, and skipping one moves that question into the meeting, where it costs more.",
      "**An ADR is deliberately small.** Title, status (proposed, accepted, rejected, deprecated, superseded), date, owner, context, decision ('We will ...'), and consequences (positive, negative and neutral). It records *why*, not *how*. Once accepted it is not rewritten: a new ADR supersedes it, and the old file stays with a pointer to its replacement. The decision log is then an append-only history, which is exactly what a future engineer needs.",
      "**Both are written for a reader who was not there.** Lead with the decision or the recommendation, put numbers on claims, name the owner, date the document, and state what would make you change your mind. A document that cannot be summarised in five sentences is not ready for review, and a document with no named decision owner is not a proposal, it is a discussion.",
    ],
  },
  underTheHood: {
    text: [
      "**1. Asynchronous decision-making is the point.** A document lets a reviewer in another timezone read carefully, leave comments and sleep on it. The alternative is a meeting where the loudest person decides. The usual loop: author writes a draft, shares it with two or three closest reviewers for a fast iteration, then opens a comment window of two to five working days, then holds a review whose only output is accept, revise or reject. Publish the deadline and the decision owner with the link, or the document will drift for a month.",
      "**2. Context and scope first, and keep them factual.** State what exists today, what triggered the change, and the boundary of the proposal. Link to dashboards, tickets and prior documents instead of retelling them. The test: a reviewer from another team should understand the problem without reading the rest of the doc, and should know what is explicitly out of scope before they start suggesting features.",
      "**3. Goals and non-goals are different lists.** Goals describe outcomes, not implementations ('a learner can save a lesson from the lesson page', not 'add a bookmarks table'). Non-goals are choices: no folders, no sharing, no offline sync, no cross-device merge in v1. Non-goals are where scope creep dies, and they also protect the chosen design from being judged against requirements it never had.",
      "**4. Requirements need numbers and labels.** 'Fast' is not a requirement. 'p95 read latency under 150 ms at 200 requests per second' is. Every estimate carries its basis: measured, derived from a stated assumption, or unknown with a plan to find out. In this lesson the DevAtlas figures are explicitly assumptions, not analytics; label yours the same way, because a fabricated number is worse than an honest range.",
      "**5. Options are the heart of the document.** At least two genuine alternatives, including doing nothing or the simplest possible version. For each: how it works in two or three sentences, what it costs to build and operate, how it fails, and why it wins or loses against the goals. A strawman alternative is worse than no alternative, because it teaches reviewers that the section is decoration. Finish with a decision table so the comparison is scannable.",
      "**6. The chosen design covers the sharp edges.** A small diagram, the data model, the API shape, the read and write paths, and the cross-cutting concerns: authentication, authorisation, privacy, rate limits, observability. Then failure modes in a table: what breaks, what the user sees, what the system does, how you detect it. A design that has no failure section has not been thought through, only drawn.",
      "**7. An ADR is a ruling, not a second design doc.** Number it sequentially, store it next to the code, and use the same five parts every time. The decision is written in the active voice ('We will store bookmarks in PostgreSQL'), the status is one of a small fixed set, and the consequences include the bad ones. Accepted ADRs are immutable; a changed decision gets a new ADR that says 'supersedes ADR-0007'. Reviewers read the old one to understand the path, not to edit it.",
      "**8. Write for the 3 a.m. reader, then maintain the set.** Operational documents put the action first: symptom, check, command, expected output, rollback, escalation. Design and decision documents put the summary first: one paragraph anyone can quote. Keep an index (`docs/adr/README.md`) with number, title, status and date, review the docs at each milestone, and mark anything stale with a date and an owner. Documents that are not maintained become archaeology; documents with an index and a review date stay useful.",
    ],
    diagram: {
      title: "From open question to operating procedure",
      nodes: [
        { label: "Problem", sub: "constraints, numbers" },
        { label: "Design doc", sub: "options + trade-offs" },
        { label: "Design review", sub: "accept / revise / reject" },
        { label: "ADR", sub: "one decision, immutable" },
        { label: "Runbook", sub: "operate + roll back" },
      ],
      edges: ["write", "review", "record", "operate"],
      caption: "The design doc argues while the choice is open; the ADR records what was decided; the runbook tells someone under pressure what to do.",
    },
  },
  handsOn: [
    {
      title: "Write the full design doc",
      text: [
        "This is a complete design doc for DevAtlas bookmarks. Notice what it does: it states assumptions instead of inventing analytics, compares three real options including the simplest one, and ends with failure modes and a rollout. At roughly two pages it is a 'mini design doc' in the Google sense, which is the right size for one feature.",
      ],
      code: {
        lang: "markdown",
        file: "docs/design/bookmarks.md",
        code: `# Design: Saved lessons (bookmarks)

Status: proposed for review
Author / owner: Priya Nair (learning platform)
Reviewers: API, data, SRE, product
Last updated: 2026-10-21
Review deadline: 2026-10-28

## 1. Context
DevAtlas has 14,000 weekly active learners. Lessons are long, and learners
currently rely on browser tabs or notes to return to one. Support tickets and
interview feedback both ask for a "save for later" list.
Today the API is a single stateless service backed by PostgreSQL. Progress is
already stored per learner. There is no cache tier and no background worker.
All numbers below are assumptions for sizing, not measured analytics. They are
marked [A] where used.
## 2. Goals and non-goals
Goals
- A signed-in learner can save and unsave a lesson from the lesson page.
- A learner can see their saved lessons, newest first, in under 200 ms p95.
- Saved state survives logout and appears on another device.

Non-goals (v1)
- Folders, tags, notes or sharing.
- Offline reading or background sync.
- Anonymous bookmarks merged after sign-up.
- Recommendations based on saved lessons.
- Cross-region active-active writes.

## 3. Requirements
Functional
- POST /v1/bookmarks {lessonId} is idempotent: saving twice is one row.
- DELETE /v1/bookmarks/{lessonId} is idempotent: deleting a missing row is 204.
- GET /v1/bookmarks returns at most 100 items, newest first, with a cursor.

Non-functional
- Read p95 < 200 ms, write p95 < 300 ms at 200 rps peak [A].
- 99.9% monthly availability for bookmark reads; writes may fail closed.
- A learner can only ever see and change their own bookmarks.
- No lesson content is copied into the bookmark store.
- Deletion of an account removes its bookmarks within 30 days.

Sizing assumptions [A]
- 14,000 WAU, 20% use bookmarks, 6 saves per active saver per week.
- 16,800 writes/week is about 0.03 writes/s average, 5/s peak.
- 10 bookmark list views per saver per week is about 0.3 reads/s average,
  40/s peak. Even 10x these numbers leave a single Postgres table comfortable.

## 4. Options considered
### Option A: Browser local storage only
Store a lesson id list in localStorage.
+ No backend, no migration, ships in a day.
- Does not survive logout, device change or cleared storage.
Verdict: fails the cross-device goal. Rejected.
### Option B: One PostgreSQL table in the existing API
Add bookmark(user_id, lesson_id, created_at) with a unique key.
+ Uses the database and deployment the team already operates.
+ One indexed query serves the list; no new infrastructure.
+ Transactional with account deletion.
- Adds write load to the primary; fine at the stated volume.
Verdict: chosen for v1.
### Option C: Dedicated bookmark service with a document store
Separate service, own database, events on save.
+ Independent scaling and a clean boundary for future social features.
- A new deployable, on-call rotation, schema and backup story for 5 writes/s.
- Cross-service consistency for account deletion.
Verdict: premature. Revisit if bookmarks gain sharing or feeds.

| Criterion            | A local | B Postgres | C service |
|----------------------|---------|------------|-----------|
| Cross-device         | no      | yes        | yes       |
| New infrastructure   | none    | none       | high      |
| Build effort         | 1 day   | 3-5 days   | 4-6 weeks |
| Operational burden   | none    | existing   | new team  |
| Meets v1 goals       | no      | yes        | yes       |
## 5. Chosen design
API
- POST   /v1/bookmarks              body {"lessonId": "..."} -> 201 or 200
- DELETE /v1/bookmarks/{lessonId}   -> 204 whether or not a row existed
- GET    /v1/bookmarks?limit=50&cursor=... -> {items, nextCursor}

Data model
- bookmark(id bigserial pk, user_id uuid not null, lesson_id text not null,
  created_at timestamptz not null default now())
- unique (user_id, lesson_id); index (user_id, created_at desc, id desc)
- Foreign keys stay in the application: lessons live in content storage, and
  a deleted lesson simply disappears from reads.

Read path: authenticated request -> API -> one indexed query filtered by
user_id -> rows joined in memory with lesson titles from the content cache.
Write path: upsert with ON CONFLICT DO NOTHING; no read-modify-write race.

Authorization: user_id comes from the verified session, never from the request
body. Every query includes user_id in the WHERE clause.
## 6. Failure modes
| Failure                        | User sees            | System behaviour                              |
|--------------------------------|----------------------|-----------------------------------------------|
| Postgres primary unavailable   | 503 on save/list     | Reads retry twice, then fail; no silent loss  |
| Duplicate save (double click)  | 200, same state      | Unique key + ON CONFLICT DO NOTHING            |
| Lesson deleted after saving    | Item omitted         | Join drops missing lesson; no broken links     |
| Cursor tampered with           | 400 invalid_cursor   | Signed cursor; reject, do not scan             |
| Account deletion               | normal               | Cascade delete job within 30 days              |
## 7. Rollout
1. Ship the table and endpoints behind flag bookmarks_v1 (staff only).
2. Enable for 5% of learners, watch p95, error rate and write QPS for 48 h.
3. Raise to 50%, then 100%, keeping the flag for one week.
4. Backfill nothing: there is no prior data.
Rollback: turn the flag off; the table stays, writes stop, no data is lost.
Owner during rollout: Priya. Dashboard: API latency, 5xx, bookmark QPS.
## 8. Open questions
- Should unsaving be undoable for 10 seconds in the UI? (product)
- Do we need a per-learner cap to bound abuse? (security, by review)
- Is a nightly count needed for analytics, or is the event stream enough? (data)`,
      },
      notes: [
        "Every number is either derived from a labelled assumption or absent. That is deliberate: a reviewer can challenge an assumption, but cannot challenge a number that was never claimed.",
        "The options table is the part reviewers read second (after the summary). Option A is a real alternative that fails a stated goal, and Option C is the one a senior engineer might otherwise advocate, so the document answers the obvious objection before it is raised.",
      ],
    },
    {
      title: "Write the ADR that records the decision",
      text: [
        "The design doc argued; the ADR records the outcome. It is short by design, has a fixed status, and names the consequences including the unpleasant ones. Note the 'Supersedes / superseded by' lines: the log is append-only, so a future change adds a file instead of editing this one.",
      ],
      code: {
        lang: "markdown",
        file: "docs/adr/0007-bookmarks-in-postgres.md",
        code: `# ADR-0007: Store bookmarks in the existing PostgreSQL database

- Status: Accepted
- Date: 2026-10-29
- Owner: Priya Nair (learning platform)
- Deciders: API lead, data lead, SRE lead
- Supersedes: none
- Superseded by: none
- Related: docs/design/bookmarks.md
## Context
Learners asked for a way to save lessons and return to them on another device.
The v1 requirements are a personal list, newest first, under 200 ms p95, with
no sharing, folders or offline support. The sizing assumption is roughly 5
writes/s and 40 reads/s at peak, derived from 14,000 weekly active learners
and a 20% adoption assumption.

The platform already runs a stateless API against PostgreSQL, with progress
stored per learner. There is no cache tier and no background worker. The team
is four engineers and already carries one on-call rotation. Bookmarks are not
expected to become a social feature in the next two quarters.
## Decision
We will store bookmarks in a single PostgreSQL table in the existing API
database, with a unique constraint on (user_id, lesson_id), and expose three
idempotent endpoints: save, delete and list. We will not introduce a separate
service or a document store for v1.

## Alternatives considered
- **Browser local storage.** Rejected: it fails the cross-device requirement
  and disappears when storage is cleared.
- **Dedicated bookmark service with its own store.** Rejected for v1: it adds
  a deployable, a backup story, a schema and an on-call surface for a workload
  the existing primary handles comfortably. It remains the likely choice if
  sharing, feeds or per-item reactions arrive.

## Consequences
Positive
- No new infrastructure, no new on-call rotation, one migration.
- Saves and deletes are transactional and idempotent through the unique key.
- Account deletion can cascade in the same database.

Negative
- Bookmark writes share the primary with progress writes; a future traffic
  spike in bookmarks can affect unrelated endpoints.
- A later move to a separate service requires a data migration and dual writes.
- The table will grow forever unless account deletion and lesson deletion are
  actually implemented and tested.

## Follow-ups
- Add the dashboard and alert for bookmark write QPS and 5xx before rollout.
- Load-test at 10x the assumed peak; revisit this ADR if sharing or public
  collections enter the roadmap; link the runbook at docs/runbooks/bookmarks.md.`,
      },
      notes: [
        "One decision per ADR. If the team later decides to cap saves per learner, that is a separate ADR, not a paragraph added here.",
        "The negative consequences are the useful part. They tell the next engineer which assumption, if it changes, should reopen the decision.",
      ],
    },
    {
      title: "Know which document you are writing",
      text: [
        "The names are often used interchangeably, which is why teams end up with a 15-page 'ADR' nobody maintains. The differences are audience, lifetime and what the reader is supposed to do after reading.",
      ],
      code: {
        lang: "text",
        file: "document-types.txt",
        code: `Artifact      Answers                          Audience            Lifetime
design doc    What should we build and why?    reviewers, team    until shipped, then archive
RFC           Will this break anyone else?     many teams/public  comment period, then decision
ADR           What did we decide, and why?     future engineers   permanent, append-only
runbook       What do I do right now?          on-call            updated every incident

design doc    sections: context, goals/non-goals, requirements, options, design,
              failure modes, rollout, open questions. Argument still open.
RFC           a design doc with a wide audience and a deadline. Same content,
              formal comment period and a named decider.
ADR           context, decision, status, consequences. One page. Never edited
              after acceptance; a new ADR supersedes it.
runbook       symptom, check, command, expected output, rollback, escalate.
              Written for a tired reader with one hand on a pager.

Rule of thumb
- Reversible and local: a PR description is enough.
- Significant and still open: design doc (or RFC if other teams are affected).
- Decided and hard to reverse: ADR, same day.
- Operated by humans: runbook, before launch, tested in staging.`,
      },
      notes: ["An RFC is not a different document shape from a design doc; it is a different social process. If your organisation says 'RFC', ask what the comment deadline and decision rule are, because that is the part that matters."],
    },
    {
      title: "Choose the artifact with a decision tree",
      text: [
        "When a change is proposed, the first question is not 'what should I write' but 'is there a real choice here'. This flowchart keeps the team from writing a design doc for a one-line dependency bump, and from shipping a database migration with only a PR description.",
      ],
      code: {
        lang: "mermaid",
        code: `flowchart TD
  Q{Is there a real choice<br/>with trade-offs?}
  Q -->|No| PR[Proceed in the PR<br/>describe the change]
  Q -->|Yes| R{Does it affect other teams,<br/>users or an open community?}
  R -->|Yes| RFC[RFC or design doc<br/>wide comment window]
  R -->|No| D[Design doc<br/>team review]
  RFC --> REV[Review: accept, revise or reject]
  D --> REV
  REV -->|Accepted| ADR[ADR: one page, immutable]
  ADR --> RUN[Runbook if humans operate it]
  REV -->|Rejected| LOG[Record the rejection<br/>and the reason]
  PR --> END[Implement]
  RUN --> END`,
      },
      notes: ["The rejected branch matters: a rejected RFC with its reasoning is one of the most valuable documents a team owns, because it stops the same proposal from returning every six months."],
    },
    {
      title: "Check a draft before you ask for review",
      text: [
        "Most review time is wasted on documents missing the basics. This small checker looks for the sections that reviewers always ask about, whether the requirements contain a number, and whether an owner is named. Run against a deliberately weak draft, it prints the real output below.",
        "The draft it inspects has context, requirements and a rollout, but no goals, alternatives, failure modes or owner, and its requirements are adjectives. The score is a prompt, not a quality metric: a document can pass this check and still be wrong.",
      ],
      code: {
        lang: "python",
        file: "check_design_doc.py",
        code: `DOC = """# Design: Bookmark lessons

Status: draft
Last updated: 2026-10-20

## Context
Learners lose their place and ask for a way to save lessons.

## Requirements
- Learners can save a lesson.
- Learners can see saved lessons.
- The list loads fast.

## Chosen design
Add a bookmarks table and two endpoints.

## Rollout
Ship it.
"""

checks = [
    ("Context", "## context"),
    ("Goals and non-goals", "## goals"),
    ("Alternatives considered", "## alternatives"),
    ("Failure modes", "## failure modes"),
    ("Rollout", "## rollout"),
]
req = DOC.split("## requirements")[1].split("##")[0] if "## requirements" in DOC else ""
numbered = any(ch.isdigit() for ch in req)
owner = "owner:" in DOC.lower()

print("docs/design/bookmarks-draft.md")
score = 0
for label, needle in checks:
    ok = needle in DOC.lower()
    score += ok
    print(f"  [{'ok' if ok else 'MISS'}]   {label}")
print(f"  [{'ok' if numbered else 'warn'}]   Requirements carry numbers or a bound")
score += numbered
print(f"  [{'ok' if owner else 'MISS'}]   Named owner")
score += owner
total = len(checks) + 2
print(f"score {score}/{total} - " + ("ready for review" if score == total else "not ready for review"))`,
      },
      output: "docs/design/bookmarks-draft.md\n  [ok]   Context\n  [MISS]   Goals and non-goals\n  [MISS]   Alternatives considered\n  [MISS]   Failure modes\n  [ok]   Rollout\n  [warn]   Requirements carry numbers or a bound\n  [MISS]   Named owner\nscore 2/7 - not ready for review",
      notes: [
        "The checker cannot tell whether the alternatives are real or whether the numbers are honest. It only removes the cheapest excuses for a bad review, so reviewers can spend their time on the design.",
        "Wire a check like this into CI on the docs directory if your team keeps design docs in the repo. A missing owner or failure section failing the build is a cheap cultural forcing function.",
      ],
    },
  ],
  companies: [
    "**Python (CPython) - PEPs (verified in this lesson):** PEP 1 defines a Python Enhancement Proposal as a design document with an abstract, motivation, specification, rationale, backwards-compatibility section, rejected ideas and open issues. It also defines the statuses (Draft, Accepted, Rejected, Withdrawn, Final, Superseded) and requires a reference implementation before 'Final'. One document type, one process, thirty years of public decisions.",
    "**Rust - RFCs (verified in this lesson):** the rust-lang/rfcs repository uses a template, a pull request for public comment, and a final comment period before a sub-team decides. The README is explicit that an accepted RFC is active, not a guarantee of implementation, and that substantial changes to an accepted RFC should be new RFCs with a note on the original. That is the supersede-don't-edit rule at community scale.",
    "**Kubernetes - KEPs (verified in this lesson):** the enhancements repository tracks Kubernetes Enhancement Proposals across alpha, beta and stable, with an umbrella issue and a checklist that different approvers sign off at different stages. It is a reminder that one design can span multiple releases, so the tracking document and the decision log have to survive longer than a single PR.",
    "**Google - design docs (verified in this lesson, from a public practitioner write-up):** the widely cited account of Google's practice describes context and scope, goals and non-goals, the design itself, alternatives considered, and cross-cutting concerns such as security and privacy, with a suggested sweet spot of roughly 10 to 20 pages for large projects and 1 to 3 pages for a mini design doc. It also argues for writing one only when the design is genuinely ambiguous or contentious.",
    "**AWS - Prescriptive Guidance on ADRs (verified in this lesson):** AWS's guidance describes proposed, accepted and rejected states, review meetings that begin with 10 to 15 minutes of silent reading, and immutability after acceptance: a new ADR supersedes the old one rather than editing it. That is the same lifecycle Nygard described in 2011, packaged for teams that need a checklist.",
  ],
  mistakes: [
    { mistake: "Solution-first: the document opens with the chosen design", why: "The author has already built it, so the doc becomes a justification", wrong: "Reviewers argue about details of a design whose alternatives were never considered, and the decision is already irreversible", fix: "Write context, goals and at least two real options before writing the chosen design; if the code exists, present it as one option and measure the others on paper" },
    { mistake: "Strawman alternatives", why: "The author needs an 'alternatives' section and picks the weakest one", wrong: "The section teaches reviewers that it is decoration; the strongest objection is never answered", fix: "Include the option a smart colleague would actually propose, plus doing nothing, and state the criterion on which it loses" },
    { mistake: "No numbers anywhere", why: "Estimates feel risky and 'fast' feels safe", wrong: "Review cannot judge feasibility or cost, and the design is argued by taste; incidents later reveal the load was never sized", fix: "Label every figure as measured, derived or assumed; give ranges and a plan to validate the risky ones" },
    { mistake: "No named owner or decision maker", why: "The doc is written by a committee, or ownership feels bureaucratic", wrong: "Comments accumulate, nobody is empowered to decide, and the document dies in review; when it ships, nobody is accountable for the outcome", fix: "One author/owner and one decider, both named at the top, with a review deadline and an explicit accept/revise/reject decision" },
    { mistake: "No non-goals", why: "The team wants to stay flexible", wrong: "Scope grows during review, the design is judged against features it never promised, and v1 slips", fix: "List what is deliberately excluded, and treat additions as new proposals rather than comments on this one" },
    { mistake: "A design doc that is really an implementation manual", why: "Writing code-level detail feels productive", wrong: "Reviewers review naming and classes instead of trade-offs, and the document becomes stale the moment the code changes", fix: "Keep the doc at the level of options, interfaces, data and failure modes; link to the code or a prototype for detail" },
    { mistake: "Editing an accepted ADR to match the new decision", why: "It keeps the log tidy and avoids a duplicate file", wrong: "The history is destroyed; nobody can tell that the decision changed, when, or why, and links in old reviews now point at a different decision", fix: "Add a new numbered ADR that supersedes the old one, mark the old one 'superseded by ADR-00NN', and leave its text untouched" },
    { mistake: "Runbook written for the author, not for 3 a.m.", why: "The author knows the system and writes shorthand", wrong: "The on-call engineer cannot find the command, uses the wrong environment, or misses the rollback; minutes become hours", fix: "Symptom first, exact commands with expected output, explicit environment, rollback, escalation, and a last-tested date" },
  ],
  bestPractices: [
    { tag: "Maintainability", text: "Keep design docs, ADRs and runbooks in the repository next to the code, with an index of number, title, status and date. Link documents to each other instead of duplicating content." },
    { tag: "Reliability", text: "Every design doc has a failure-modes table and a rollback; every launched service has a runbook tested in staging and linked from the ADR. Alert on the failure you wrote down." },
    { tag: "Security", text: "Make authorisation, PII, rate limits and abuse cases explicit sections, not assumptions. A reviewer from security should be able to answer 'what can a malicious user do' from the document alone." },
    { tag: "Cost", text: "Compare options on total cost: build time, infrastructure, on-call and migration, not just the cloud bill. The cheapest design that meets the goals is usually the one with the least new infrastructure." },
    { tag: "Performance", text: "State non-functional requirements as measurable targets with a load assumption, then say how you will measure them. 'Fast' cannot be reviewed or alerted on." },
  ],
  interview: [
    { q: "How do you decide whether to write a design doc, and what goes in it?", a: "I write one when the design is ambiguous or contentious, when other teams are affected, or when the choice is expensive to reverse; a local, obvious change belongs in the pull request instead. The doc has a fixed skeleton: context and scope, goals and non-goals, functional and non-functional requirements with labelled numbers, at least two real options with trade-offs, the chosen design with data model, API and cross-cutting concerns, failure modes, rollout and open questions. I keep it to two pages for a feature and link to detail rather than pasting schemas. The review asks one question, accept/revise/reject, with a named decider and a deadline. The document is a proposal, not a specification, so it lives while the choice is open and is archived once the decision is recorded as an ADR." },
    { q: "Walk me through an ADR. What is its lifecycle, and what happens when the decision changes?", a: "An ADR is a short record of one architecturally significant decision: title, status, date, owner, context, the decision in active voice, and consequences including the negative ones. Statuses are proposed, accepted, rejected, deprecated and superseded. It is stored in the repo with a sequential number, and once accepted it is immutable. If the context changes, we do not edit it: we write a new ADR that says it supersedes the old one, mark the old one with the replacement's number, and keep both. The log becomes an append-only history, which is exactly what a new engineer needs: not just the current rule, but the reasoning and the path that led there. I also link the design doc and the runbook from the ADR so the three artifacts stay connected." },
    { q: "How do you run a design review that actually reaches a decision?", a: "Before the meeting: circulate the doc with a named owner, a named decider and a deadline, and ask reviewers to comment in writing first so the discussion is about substance, not who speaks first. In the meeting, the author states the recommendation and the two strongest objections in five minutes; the rest is structured objection handling, with someone recording decisions and dissent. The output must be one of accept, revise with a named owner and date, or reject with a reason. If the doc is missing alternatives, numbers or failure modes, the right outcome is revise, not verbal patching in the room. After the meeting, publish the outcome, write the ADR the same day, and link it from the design doc. The test of a good review is not that everyone agreed, but that a future engineer can read the record and understand what was decided and what was traded away." },
  ],
  quickCheck: [
    {
      kind: "mcq",
      prompt: "A team is choosing between two databases and the decision will be hard to reverse. They have already met and agreed. Which artifact should they write now?",
      options: ["A runbook", "A design doc that compares the options", "An ADR recording the decision", "A pull request description"],
      answer: 2,
      explanation: "The choice is closed, so the right artifact is a short, immutable ADR: context, decision, status and consequences. A design doc would also have been useful before the meeting, but it is not the record of a decision already made.",
    },
    {
      kind: "output",
      prompt: "ADR-0007 is accepted. A year later the team moves bookmarks to a separate service. What status should ADR-0007 have, and what happens to its text?",
      options: ["Deleted; the new ADR replaces it", "Edited to describe the new service", "Marked superseded by the new ADR; its text stays unchanged", "Marked rejected; the old decision was wrong"],
      answer: 2,
      explanation: "Accepted ADRs are immutable. The new ADR supersedes it, and the old file remains with a pointer to its replacement, so the decision history is preserved.",
    },
    {
      kind: "bug",
      prompt: "A design review finds a five-page document with a detailed chosen design, no alternatives section, no numbers and no named owner. What is the most useful review outcome?",
      options: ["Accept, because the design is detailed", "Revise: add real alternatives, labelled numbers and an owner before deciding", "Reject the feature permanently", "Ask the author to add more code-level detail"],
      answer: 1,
      explanation: "Detail is not the missing ingredient. Without alternatives, numbers and an owner there is nothing to decide and nobody empowered to decide it, so the document goes back for revision rather than being argued line by line.",
    },
  ],
  cheatSheet: [
    "Design doc = choice still open. RFC = design doc with a wide audience and a comment deadline. ADR = decision made. Runbook = how to operate it.",
    "Design doc skeleton: context, goals/non-goals, requirements, options, chosen design, data model/API, failure modes, rollout, open questions.",
    "Every number is measured, derived or assumed. Say which; never present an assumption as analytics.",
    "Options: at least two real ones plus do-nothing, compared on build cost, operating cost, failure behaviour and fit with the goals.",
    "ADR parts: title, status, date, owner, context, decision, consequences. One page, one decision, immutable after acceptance.",
    "ADR lifecycle: proposed -> accepted | rejected; accepted -> superseded | deprecated. A new ADR supersedes the old one; never edit history.",
    "A decision log is append-only. Read it top to bottom to reconstruct why the architecture looks like this.",
    "Design review: written comments first, named decider, deadline, output is accept / revise / reject, dissent recorded.",
    "Write for the 3 a.m. reader: symptom, check, command, expected output, rollback, escalation, last tested date.",
    "Common failures: solution-first, strawman alternatives, no numbers, no owner, no non-goals, implementation manual, edited ADR.",
  ],
  homework: {
    basic: {
      title: "Record one real decision as an ADR",
      brief: [
        "Pick a decision your team already made in the last six months (a library, a database, a queue, a deployment strategy). Write ADR-0001 for it: context, decision, status, consequences, alternatives. Include at least one negative consequence and one follow-up.",
      ],
      criteria: ["Exactly one decision", "Status and date present", "At least two alternatives with a reason for rejection", "At least one negative consequence and one follow-up"],
      hints: ["If you cannot remember the alternatives, ask the person who argued for the other option; that conversation is the value.", "Write the decision in the active voice: 'We will ...'."],
      solution: {
        text: [
          "The ADR below is complete and deliberately short. The key move is that the negative consequence names the condition under which the decision should be revisited, which is more useful than a vague 'may not scale'.",
        ],
        code: {
          lang: "markdown",
          file: "docs/adr/0001-queue-for-email.md",
          code: `# ADR-0001: Send transactional email through a managed queue

- Status: Accepted
- Date: 2026-09-14
- Owner: Platform team
- Deciders: platform lead, backend lead

## Context
Sign-up and password-reset emails are sent inline from the API request. When
the email provider is slow, the request takes seconds; when it is down, the
sign-up fails even though the account was created. Volume is roughly 2,000
emails per day, dominated by password resets.

## Decision
We will publish email jobs to the managed queue already used by the analytics
pipeline, and a small worker will call the email provider with retries and a
dead-letter queue. The API returns success once the job is enqueued.

## Alternatives considered
- **Keep inline sending.** Rejected: couples sign-up availability to a third
  party, and a provider timeout becomes a failed registration.
- **Run our own queue (RabbitMQ).** Rejected: another stateful service to
  operate for 2,000 messages a day, when a managed queue already exists.

## Consequences
Positive
- Sign-up no longer waits on the email provider.
- Retries and a dead-letter queue make failures visible and recoverable.

Negative
- "Email sent" now means "queued"; a provider outage delays delivery rather
  than failing loudly, so support needs a delivery dashboard.
- Adds a worker and a queue dependency to the on-call surface.

## Follow-ups
- Build the delivery dashboard and alert on dead-letter depth; write
  docs/runbooks/email-queue.md before enabling for sign-up; revisit above
  50,000 emails per day.`,
        },
      },
    },
    intermediate: {
      title: "Write a design doc with a real options table",
      brief: [
        "Design a 'resume lesson' feature for DevAtlas: the learner returns to the exact lesson and scroll position. Write a two-page design doc with context, goals and non-goals, requirements carrying labelled assumptions, three options, a decision table and a failure-modes table.",
      ],
      criteria: ["Goals and non-goals are separate", "Every requirement with a number labels its basis", "Three genuine options including do-nothing", "Decision table and failure-modes table"],
      hints: ["Scroll position is the hard part: decide whether it is stored per lesson or per session, and say what happens on a different device.", "Do-nothing is a real option: browser history and tabs already solve part of this."],
      solution: {
        text: [
          "This solution keeps the scope deliberately small. The important reviewer-facing moves are the explicit non-goal (no cross-device scroll sync), the labelled assumptions, and the failure row for a lesson that changed length since the position was saved.",
        ],
        code: {
          lang: "markdown",
          file: "docs/design/resume-lesson.md",
          code: `# Design: Resume a lesson where you left off

Status: proposed
Owner: Marco Silva (learning experience)
Reviewers: API, frontend, data
Last updated: 2026-10-21

## Context and scope
Learners often leave a lesson and return later. Progress today records only
"completed", not position. This proposal covers resuming reading position in
the lesson reader; it does not cover video timestamps or quiz state.

## Goals and non-goals
Goals
- Reopening a lesson offers "Resume at 62%" when a saved position exists.
- Position is saved at most every 5 seconds while reading.
- Works after logout on the same device.
Non-goals
- Syncing the exact scroll position across devices in v1.
- Resume for video, audio or interactive exercises.
## Requirements
Functional
- PUT /v1/progress/{lessonId}/position with a character offset and percentage.
- GET /v1/progress/{lessonId} returns the last position and updatedAt.
- A completed lesson does not show a resume prompt.
Non-functional
- Write p95 < 100 ms; reads are already on the progress path.
- At most one write per learner per 5 seconds (client throttles; server dedupes).
- Position is private to the learner.
Assumptions [A]
- 14,000 WAU, 25% resume at least once a week, about 3 writes per resume.
- 10,500 writes/week is about 0.02 writes/s average, 3/s peak; the payload is
  under 100 bytes, so reuse the progress row rather than adding a table.
## Options
A. Do nothing. Browser back and history already help.
   + Zero work. - No prompt, no cross-session signal, no product value.
B. Add two columns to the existing progress row.
   + One upsert, transactional with completion. - Widens a hot row.
C. Separate lesson_position table keyed by (user_id, lesson_id).
   + Isolates frequent writes from completion state. - One more table.

| Criterion          | A none | B columns | C table |
|--------------------|--------|-----------|---------|
| Build effort       | 0      | 1 day     | 2 days  |
| Write contention   | n/a    | medium    | low     |
| Meets goals        | no     | yes       | yes     |

Chosen: C. The extra day buys isolation from the completion write path.
## Design
- lesson_position(user_id uuid, lesson_id text, char_offset int,
  percent numeric(5,2), updated_at timestamptz, primary key (user_id, lesson_id))
- Upsert on conflict; reject percent outside 0..100; reject offsets beyond
  the current lesson length; throttle client writes; prompt only at 5-95%.
## Failure modes
| Failure                    | Behaviour                                      |
|----------------------------|------------------------------------------------|
| Lesson shortened           | Clamp offset to length; show 100% or resume top |
| Duplicate writes           | Upsert, last write wins; no duplicate rows      |
| Write flood from a client  | Server rate limit per user; drop with 429       |

## Rollout and open questions
Flag resume_position for staff, then 5%, 50%, 100% over a week. Rollback is the
flag; no data migration is needed. Open: should the prompt expire after 30
days? Product to decide before 100%.`,
        },
      },
    },
    challenge: {
      title: "Review a bad design doc and repair it",
      brief: [
        "Take the weak draft from the hands-on checker (or a real document from your team). Write a review memo with at least five specific findings, each naming the missing section or reasoning gap and its consequence. Then produce a repaired outline that would pass review.",
      ],
      criteria: ["At least five findings, each tied to a consequence", "Findings distinguish missing content from weak reasoning", "A repaired outline with the missing sections", "A clear accept/revise/reject recommendation"],
      hints: ["'No alternatives' and 'alternatives are strawmen' are different findings; so are 'no numbers' and 'numbers without a basis'.", "A review memo is itself a document: lead with the recommendation."],
      solution: {
        text: [
          "The memo leads with the outcome, separates missing content from weak reasoning, and ends with what would make the document acceptable. The repaired outline is not a rewrite; it is the contract for the next draft.",
        ],
        code: {
          lang: "markdown",
          file: "docs/reviews/2026-10-21-bookmarks-review.md",
          code: `# Review: Design - Bookmark lessons (draft)

Recommendation: Revise and resubmit. Do not start implementation.
Reviewer: A. Okafor (API)  Date: 2026-10-21

## Findings
1. Missing alternatives. Only the chosen table design is described, so the
   review cannot compare it with local storage or a separate service. The
   likely objection (why not a bookmark service?) is unanswered.
2. Requirements are adjectives, not bounds. "Loads fast" cannot be tested or
   alerted on. State p95 latency, peak request rate and the basis for each.
3. No goals/non-goals split. Without non-goals, folders, sharing and offline
   mode are implicitly in scope, and the estimate is meaningless.
4. No owner or decider. The document cannot be accepted by anyone, so review
   comments have no path to a decision.
5. Failure modes absent. Duplicate saves, a deleted lesson and a database
   outage have no stated behaviour, so the on-call engineer will invent one.
6. Rollout is one line ("Ship it"). No flag, no staged percentage, no
   rollback, no dashboard, no owner during rollout.
## Required for the next draft
- Add options A/B/C with a decision table, including do-nothing.
- Add labelled numbers: WAU assumption, adoption, writes/s and reads/s.
- Add non-goals and an owner/decider with a review deadline.
- Add a failure-modes table, a staged rollout with a rollback flag, and the
  ADR number this decision will produce.

Resubmit by 2026-10-28 for a 30-minute review.`,
        },
        pitfalls: ["Rewriting the document for the author instead of reviewing it", "Listing style issues as if they were reasoning gaps", "Approving because the endpoint sketch looks plausible"],
      },
    },
    capstone: {
      title: "DevAtlas: design doc and ADR set",
      brief: [
        "Create docs/design/bookmarks.md, docs/adr/0007-bookmarks-in-postgres.md and docs/adr/README.md in your DevAtlas repository. The design doc must include options with numbers, failure modes and rollout; the ADR must be immutable and linked from the index; the index must show number, title, status and date. Link the runbook you will write before launch.",
      ],
      criteria: ["Design doc with context, goals/non-goals, labelled numbers, options, failure modes and rollout", "ADR with status, date, owner, context, decision and consequences", "ADR index with at least three entries and correct statuses", "Cross-links between design doc, ADR and runbook"],
      hints: ["Use this lesson's documents as the model, but replace the assumptions with your own and label them.", "The index is what makes the log usable; without it, ADRs become files nobody finds."],
      solution: {
        text: [
          "The deliverable is a small, linked set rather than one long document. The index is the entry point, the design doc holds the argument while the choice is open, and the ADR holds the ruling afterwards. Keeping the three files consistent is the exercise; the numbers here are the lesson's labelled assumptions, not measurements.",
        ],
        code: {
          lang: "markdown",
          file: "docs/adr/README.md + linked files",
          code: `<!-- docs/adr/README.md -->
# Architecture decision log
| ADR  | Title                              | Status   | Date       |
|------|------------------------------------|----------|------------|
| 0001 | Use PostgreSQL as the primary store| Accepted | 2026-08-02 |
| 0006 | Serve lesson content from a CDN    | Accepted | 2026-09-30 |
| 0007 | Store bookmarks in PostgreSQL      | Accepted | 2026-10-29 |
| 0008 | Cap bookmarks at 2,000 per learner | Proposed | 2026-11-04 |
Start with ../design/bookmarks.md; operate with ../runbooks/bookmarks.md.
<!-- docs/design/bookmarks.md (condensed) -->
# Design: Saved lessons
Status: accepted (see ADR-0007) - Owner: Priya Nair - Updated: 2026-10-29
## Context
14,000 WAU [A]. Learners use tabs to return to lessons. The API is stateless,
backed by PostgreSQL; progress is already stored per learner.
## Goals / non-goals
Goals: save and unsave; list newest first under 200 ms p95; survive logout and
device change. Non-goals: folders, sharing, offline sync, recommendations.
## Requirements
- Idempotent POST and DELETE; GET returns 100 items with a signed cursor.
- p95 read < 200 ms, write < 300 ms at 40 reads/s and 5 writes/s peak [A].
- Learner sees only their own rows; account deletion removes rows in 30 days.
## Options
A local storage fails cross-device. B one PostgreSQL table adds no infrastructure
and meets the goals. C a separate service scales independently but adds a
deployable and on-call surface for 5 writes/s. Chosen: B.
## Design
bookmark(id, user_id, lesson_id, created_at), unique (user_id, lesson_id),
index (user_id, created_at desc); three endpoints; user_id from the session.
## Failure modes
Primary down -> 503 after retries. Duplicate save -> unique key, 200. Lesson
deleted -> omitted. Bad cursor -> 400, no scan.
## Rollout
Flag bookmarks_v1: staff, 5%, 50%, 100% over a week. Watch p95, 5xx, write QPS.
Rollback: flag off; table retained. No backfill.
<!-- docs/adr/0007-bookmarks-in-postgres.md (condensed) -->
# ADR-0007: Store bookmarks in PostgreSQL
- Status: Accepted
- Date: 2026-10-29
- Owner: Priya Nair
- Deciders: API lead, data lead, SRE lead
## Context
Personal saved-lesson list, cross-device, about 5 writes/s and 40 reads/s at
peak [A]. One stateless API, one primary database, four engineers, one rotation.
## Decision
We will store bookmarks in a single PostgreSQL table with a unique
(user_id, lesson_id) key and three idempotent endpoints. No separate service.
## Alternatives
Local storage fails cross-device. A separate service adds a deployable, schema,
backup and on-call surface for a workload the primary handles comfortably.
## Consequences
Positive: no new infrastructure, transactional idempotency, cascade delete.
Negative: bookmark writes share the primary; a split needs migration and dual
writes; the table grows unless deletion is enforced and tested.
## Follow-ups
Dashboard and alert before rollout; load-test at 10x assumed peak; revisit if
sharing arrives; write and test ../runbooks/bookmarks.md before launch.`,
        },
      },
    },
  },
  deeper: [
    { label: "Michael Nygard: Documenting Architecture Decisions (2011)", url: "https://cognitect.com/blog/2011/11/15/documenting-architecture-decisions" },
    { label: "ADR GitHub organization: templates and practices", url: "https://adr.github.io/" },
    { label: "Malte Ubl: Design Docs at Google", url: "https://www.industrialempathy.com/posts/design-docs-at-google/" },
    { label: "Rust RFC repository and process", url: "https://github.com/rust-lang/rfcs" },
    { label: "Kubernetes enhancements (KEPs)", url: "https://github.com/kubernetes/enhancements" },
    { label: "AWS Prescriptive Guidance: Architectural decision record process", url: "https://docs.aws.amazon.com/prescriptive-guidance/latest/architectural-decision-records/adr-process.html" },
  ],
  nextPreview: "Next phase: AI engineering. How LLMs really work: tokens, embeddings, attention and sampling, and what that means for cost, latency and hallucinations.",
};
