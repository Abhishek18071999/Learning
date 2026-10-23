import type { Lesson } from "../../types";

export const lesson: Lesson = {
  id: "6.4.4",
  title: "Design Mint.com: a personal finance app",
  minutes: 90,
  level: "Advanced",
  prerequisites: ["6.3.2 The design method: requirements, estimates and numbers to know", "6.3.8 Scaling relational databases: replication, federation and sharding", "6.3.10 Caching strategies: cache-aside, write-through, write-behind, refresh-ahead", "6.3.11 Asynchronism: message queues, task queues and back pressure"],
  summary: "Design a write-heavy personal finance app: scheduled daily ingestion from 30 million bank accounts, categorise each of 5 billion transactions exactly once at write time, precompute monthly aggregates per user and category, and fire budget notifications as a side effect of the write path — the same pipeline shape as DevAtlas's daily progress rollups.",
  terms: [
    { term: "Bank aggregation", def: "Fetching balances and transactions from many banks on a user's behalf — historically by logging in as the user and reading pages (screen-scraping), today mostly through provider APIs like Plaid's." },
    { term: "Scheduled ingestion", def: "A recurring pull of fresh data on a timetable (daily for users active in the past 30 days, on first link, and on manual refresh) instead of continuous or on-read fetching." },
    { term: "Seller-to-category mapping", def: "A lookup from a transaction's merchant to a budget category, seeded with ~50,000 sellers (~12 MB in memory) and improved by crowd-sourced user corrections." },
    { term: "Monthly aggregate table", def: "Precomputed rows of total spending per (user, month, category), updated as transactions are ingested, so dashboards read a few small rows instead of summing millions of transactions." },
    { term: "Budget notification", def: "A side effect of the write path: after a category's month-to-date total is updated, compare it with the user's budget and notify when it is nearing or exceeding." },
    { term: "Write-heavy workload", def: "A workload with many more writes than reads (Mint: 10:1). You optimise ingestion and precompute aggregates at write time, because reads cannot amortise the work." },
  ],
  problem: [
    "DevAtlas already lives on the pattern this lesson teaches and does not know it. Every lesson completion, quiz answer and streak update writes a progress event; the dashboard aggregates them; the weekly digest summarises a week of them. But the events pile up as raw rows, so the dashboards recompute summaries on every load and the digest job re-scans everything every Sunday. That works today and will not at ten times the learners. Mint.com faced the same shape of problem at absurd scale: pull financial data for millions of users on a schedule, categorise and aggregate it safely, and keep the dashboards fast.",
    "This lesson designs Mint.com end to end: a write-heavy scheduled ingestion pipeline (5 billion transactions a month against 500 million reads), categorisation exactly once at write time, precomputed monthly aggregates, and budget notifications as a side effect of the write path. The same four moves — pull on a schedule, categorise once, aggregate into small rows, notify from the write path — are exactly how DevAtlas's daily progress rollups should work.",
  ],
  concept: {
    analogy: [
      "A bookkeeper for a whole city. Every evening each shop drops a box of receipts at the door (scheduled ingestion, once a day). The bookkeeper stamps each receipt with an expense category the moment it arrives (categorise once, at write time), then adds the amount to that customer's monthly page under the right column (aggregate table). Customers never touch the boxes: they open one page. When a page's total creeps toward the limit the customer wrote on the cover, the bookkeeper drops a note in the post (budget notification as a side effect of the write).",
      "Mint is a warehouse with a friendly shopfront: the messy work — scraping banks, filing receipts, summing columns — happens in the back, on a schedule, so the shopfront only ever serves small, pre-digested answers.",
    ],
    precise: [
      "**Pull on a schedule, not on demand.** Mint updates transactions daily for users active in the past 30 days, on first link, and on manual refresh. A queue holds one job per account and extraction workers drain it. Scraping a bank is slow and fragile, so it must never sit on a user's request path.",
      "**Categorise once, at write time.** Each ingested transaction is assigned a category immediately, from a ~50,000-entry seller map plus crowd-sourced user corrections (the most common override wins, top of a heap). Transactions are never re-categorised automatically, and dashboards never categorise on read.",
      "**Aggregates are rows, not queries.** Monthly spending per (user, month, category) lives in its own table, one row per key, incremented as transactions land. A month view is a few indexed reads — not a scan of 5 billion rows.",
      "**Budget check as a side effect.** After the aggregate update, the budget service compares month-to-date against the user's budget and the notification service fires only when nearing or exceeding. The check rides the write path, so the read path stays light.",
    ],
  },
  underTheHood: {
    text: [
      "**The write path.** The Accounts API (or the scheduler) puts a pull job on a queue — SQS or RabbitMQ. The Transaction Extraction Service drains the queue, pulls new transactions from the financial institution, and stores raw log files in object storage. It calls the Category Service (a seller-to-category dictionary of about 50,000 sellers, roughly 12 MB in memory, with crowd-sourced overrides whose top entry sits in a heap for an O(1) peek) and the Budget Service, which aggregates the month's spending by category and triggers the Notification Service. It then writes the transactions and monthly_spending tables and tells the user the refresh is done through another queue.",
      "**The data model.** Users live in a relational database. The accounts table holds id, created_at, last_update, account_url, account_login, account_password_hash char(64) and user_id, indexed on id, user_id and created_at. The transactions table holds id, created_at, seller varchar(32), amount decimal and user_id — about 50 bytes a row (user_id 8 B, created_at 5 B, seller 32 B, amount 5 B), indexed on id, user_id and created_at. monthly_spending holds id, month_year date, category varchar(32), amount and user_id, indexed on id and user_id. Note the hash: the credential is stored as a 64-character hash, never in the clear.",
      "**The read path.** A Read API checks the memory cache (Redis or Memcached) first for summaries, aggregates and recent transactions — cache-aside — then falls back to SQL. Static content comes from object storage through a CDN. With about 200 reads a second this is a small tier: the lesson is to pay once on the write path so reads are nearly free.",
      "**The MapReduce alternative.** The same aggregation can run as a batch job over the raw logs: the mapper parses each tab-delimited line user_id\\ttimestamp\\tseller\\tamount, categorises the seller and emits ((user_id, yyyy-mm, category), amount); the reducer sums by key; budget notifications are called from the job. This is the pattern behind the hands-on scripts and, in production, behind warehouse rollups.",
      "**Scaling the writes.** 2,000 writes a second can exceed one SQL primary: federation (split by function), sharding by user_id, denormalisation and SQL tuning; move hot data to NoSQL if the access pattern fits; send analytics to a warehouse (Redshift or BigQuery); keep about one month of transactions in the database and the rest in object storage or the warehouse.",
    ],
    diagram: {
      title: "The write path: one account's daily pull",
      nodes: [
        { label: "Accounts API", sub: "enqueue pull job" },
        { label: "Queue", sub: "SQS / RabbitMQ" },
        { label: "Extraction service", sub: "pull + raw logs" },
        { label: "Category + Budget", sub: "categorise, aggregate" },
        { label: "SQL + notifications", sub: "transactions, monthly_spending" },
      ],
      edges: ["daily / first link / refresh", "drain jobs", "categorise once", "upsert, then notify"],
      caption: "The budget check is a side effect of the write; the dashboard only ever reads the tables on the right through a cache.",
    },
  },
  handsOn: [
    {
      title: "Back-of-envelope: every number this design rests on",
      text: ["The System Design Primer's Mint case gives the scale; the ratios, not the exact numbers, decide the design. Run through the arithmetic slowly — write-heavy is the headline."],
      code: {
        lang: "text",
        code: `10 million users x 10 budget categories each = 100M budget items; 30 million connected financial accounts
5 billion transactions a month (2.5 million seconds a month)
5e9 tx/month x 50 bytes = 250 GB/month; /2.5e6 s = 2,000 writes/s; 10:1 write:read -> 200 reads/s
  transaction row = user_id 8 B + created_at 5 B + seller 32 B + amount 5 B = 50 B
  5e9 x 50 B = 250 GB/month; x 36 months = 9 TB in 3 years
500 million read requests a month / 2.5e6 s = 200 reads/s (check: 40 req/s x 2.5e6 s = 100M req/month)
category dictionary: 50,000 sellers x 255 B ~= 12 MB in memory

So: absorb the writes with a queue and precomputed aggregates; serve reads from a small cache.`,
      },
    },
    {
      title: "The whole design in one picture",
      text: ["Write path top-to-bottom, read path along the bottom. The queue absorbs 2,000 writes/s bursts; the cache makes 200 reads/s almost free."],
      code: {
        lang: "mermaid",
        code: `\`\`\`mermaid
flowchart LR
  api["Accounts API"] -->|"enqueue: daily for active users, first link, manual refresh"| q["Queue (SQS / RabbitMQ)"]
  q -->|"drain pull jobs"| ex["Transaction Extraction Service"]
  ex --> raw["Object storage: raw log files"]
  ex --> cat["Category Service: ~50k seller-to-category dict in memory"]
  ex --> bud["Budget Service: monthly aggregation"]
  bud --> db[("SQL: transactions + monthly_spending")]
  bud -->|"nearing / exceeding budget"| notif["Notification Service"]
  notif --> user(["User"]) -->|"~200 reads/s"| read["Read API"]
  read -->|"cache-aside: summaries, aggregates, recent tx"| cache[("Redis / Memcached")] -->|"miss"| db
\`\`\``,
      },
    },
    {
      title: "Categorise once at write time: seed map + crowd overrides",
      text: ["The Category Service: a seeded dictionary for well-known sellers plus crowd-sourced corrections from users' manual re-categorisations. The most common correction wins (a heap peek, O(1)); unknown sellers stay None rather than being guessed."],
      code: {
        lang: "python",
        file: "categorise.py",
        code: `"""Categorise transactions once, at write time.

Mint keeps a seeded seller -> category dictionary (~50,000 sellers, about 12 MB) in memory
plus crowd-sourced corrections from users' manual re-categorisations. The most common
correction for a seller wins (Mint keeps the top entry in a heap, one peek = O(1)); the
seed is the fallback; anything unknown stays uncategorised (None) instead of being guessed.
"""
from collections import Counter, defaultdict
from heapq import heapify

SEED = {
    "Shell": "Transport",
    "Whole Foods": "Groceries",
    "Amazon": "Shopping",
    "Netflix": "Entertainment",
}

# (seller, category) pairs gathered from users' manual re-categorisations
CORRECTIONS = [
    ("Shell", "Fuel"), ("Shell", "Fuel"), ("Shell", "Transport"),
    ("Corner Cafe", "Coffee"), ("Corner Cafe", "Coffee"), ("Corner Cafe", "Coffee"), ("Corner Cafe", "Dining"),
    ("Trader Joes", "Groceries"), ("Trader Joes", "Groceries"),
]

overrides: dict[str, Counter] = defaultdict(Counter)
for seller, category in CORRECTIONS:
    overrides[seller][category] += 1


def top_override(counts: Counter) -> str:
    """Most common category via a max-heap. Mint maintains the heap incrementally so the top
    override is one peek, O(1), when a transaction arrives."""
    heap = [(-count, category) for category, count in counts.items()]
    heapify(heap)
    return heap[0][1]


def categorise(seller: str) -> str | None:
    counts = overrides.get(seller)
    if counts:
        return top_override(counts)     # manual corrections beat the seed
    return SEED.get(seller)             # seeded fallback, else None


for seller in ("Shell", "Whole Foods", "Corner Cafe", "Trader Joes", "Zara"):
    print(f"{seller:>12} -> {categorise(seller)}")`,
      },
      output: "       Shell -> Fuel\n Whole Foods -> Groceries\n Corner Cafe -> Coffee\n Trader Joes -> Groceries\n        Zara -> None",
      notes: ["Shell's crowd corrections (Fuel x2) beat its seed (Transport): users' explicit fixes always win. Unknown sellers stay null — guessing a category at write time poisons every later report."],
    },
    {
      title: "Aggregate with MapReduce and fire budget notifications",
      text: ["The MapReduce alternative: mapper parses the tab-delimited log, categorises, and emits ((user, month, category), amount); reducer sums; the budget check runs only after totals land and notifies only when nearing or exceeding."],
      code: {
        lang: "python",
        file: "aggregate.py",
        code: `"""Daily aggregation, MapReduce-style, over a tab-delimited transaction log.

Each line: user_id \\t timestamp \\t seller \\t amount
Mapper:  parse the line, categorise the seller, emit ((user_id, yyyy-mm, category), amount).
Reducer: sum amounts per key -> one row per key in the monthly_spending table.
Budget:  after the totals land, compare each category with the user's budget and notify only
         when it is nearing (>= 90%) or exceeding the budget. The check is a side effect of
         the write path - dashboards never pay for it.
"""
from collections import defaultdict

LOG = """\\
u1\\t2026-09-01T08:12:00\\tShell\\t45.00
u1\\t2026-09-02T19:45:00\\tWhole Foods\\t88.30
u1\\t2026-09-10T12:00:00\\tNetflix\\t15.99
u1\\t2026-09-11T09:30:00\\tShell\\t52.00
u1\\t2026-09-15T18:20:00\\tCorner Cafe\\t4.75
u2\\t2026-09-03T10:05:00\\tAmazon\\t210.00
u2\\t2026-09-04T11:15:00\\tAmazon\\t35.50
u2\\t2026-09-14T20:00:00\\tWhole Foods\\t61.20
"""

CATEGORY = {"Shell": "Transport", "Whole Foods": "Groceries", "Netflix": "Entertainment",
            "Amazon": "Shopping", "Corner Cafe": "Coffee"}
BUDGETS = {"u1": {"Transport": 90.0}, "u2": {"Shopping": 260.0}}


def mapper(line: str):
    user, ts, seller, amount = line.split("\\t")
    return (user, ts[:7], CATEGORY.get(seller, "Uncategorised")), float(amount)


def reducer(pairs):
    totals: defaultdict[tuple, float] = defaultdict(float)
    for key, amount in pairs:
        totals[key] += amount
    return totals


def check_budgets(totals) -> list[str]:
    notes = []
    for (user, month, category), total in sorted(totals.items()):
        budget = BUDGETS.get(user, {}).get(category)
        if budget is None:
            continue
        if total > budget or total >= 0.9 * budget:
            state = "exceeded" if total > budget else "nearing"
            notes.append(f"notify {user}: {category} {state} budget "
                         f"({total:.2f} vs {budget:.2f} in {month})")
    return notes


totals = reducer(map(mapper, LOG.strip().splitlines()))
print("monthly_spending rows:")
for key in sorted(totals):
    print("  ", key, "->", totals[key])
print("notifications:")
for note in check_budgets(totals):
    print("  ", note)`,
      },
      output: "monthly_spending rows:\n   ('u1', '2026-09', 'Coffee') -> 4.75\n   ('u1', '2026-09', 'Entertainment') -> 15.99\n   ('u1', '2026-09', 'Groceries') -> 88.3\n   ('u1', '2026-09', 'Transport') -> 97.0\n   ('u2', '2026-09', 'Groceries') -> 61.2\n   ('u2', '2026-09', 'Shopping') -> 245.5\nnotifications:\n   notify u1: Transport exceeded budget (97.00 vs 90.00 in 2026-09)\n   notify u2: Shopping nearing budget (245.50 vs 260.00 in 2026-09)",
      notes: ["One reducer pass produces both the aggregate rows and the notifications, and a category with no budget never fires. In production the log is in object storage and the job runs in a warehouse like Redshift or BigQuery."],
    },
    {
      title: "Simulate the scheduled pull: active filter, dedupe, retries",
      text: ["The daily job: queue only accounts active in the last 30 days, skip transactions whose id was already applied, upsert monthly_spending idempotently, and retry a bank that times out — without double-counting anything."],
      code: {
        lang: "python",
        file: "ingest.py",
        code: `"""Scheduled ingestion for Mint: pull accounts active in the last 30 days, dedupe
transactions by id, upsert monthly_spending idempotently, retry failed pulls.

The queue holds one job per active account. A transaction whose id was already applied is
skipped, so a retried pull after a timeout (or a duplicated line from the bank) can never
double-count. A failing bank raises; the worker retries up to 3 times, then parks the job.
"""
import datetime as dt
from collections import defaultdict

TODAY = dt.date(2026, 10, 21)
CATEGORY = {"Shell": "Transport", "Amazon": "Shopping", "Netflix": "Entertainment",
            "Whole Foods": "Groceries"}

accounts = {
    "acct_a": {"user": "u1", "last_active": TODAY - dt.timedelta(days=5)},
    "acct_b": {"user": "u2", "last_active": TODAY - dt.timedelta(days=12)},
    "acct_c": {"user": "u3", "last_active": TODAY - dt.timedelta(days=45)},   # inactive: not queued
    "acct_d": {"user": "u4", "last_active": TODAY - dt.timedelta(days=2)},
}
pending = {
    "acct_a": [("t1", "2026-10-18T09:00:00", "Shell", 45.0),
               ("t2", "2026-10-19T18:30:00", "Shell", 30.0)],
    "acct_b": [("t3", "2026-10-12T12:00:00", "Amazon", 99.0),
               ("t3", "2026-10-12T12:00:00", "Amazon", 99.0)],   # duplicated id in the feed
    "acct_d": [("t4", "2026-10-20T20:15:00", "Netflix", 15.99)],
}

monthly_spending: defaultdict[tuple, float] = defaultdict(float)
applied: set[str] = set()
failures = {"acct_b": 1}                    # acct_b's first pull times out


def fetch(acct_id):
    if failures.get(acct_id, 0) > 0:
        failures[acct_id] -= 1
        raise OSError("institution timed out")
    return pending[acct_id]


def apply(acct_id, txns):
    user = accounts[acct_id]["user"]
    for tid, ts, seller, amount in txns:
        if tid in applied:                  # idempotency boundary
            continue
        key = (user, ts[:7], CATEGORY.get(seller, "Uncategorised"))
        monthly_spending[key] += amount     # upsert: += works whether or not the row exists
        applied.add(tid)


queue = [aid for aid, a in accounts.items() if (TODAY - a["last_active"]).days <= 30]
print("queue (active in last 30 days):", ", ".join(queue))
for acct_id in queue:
    for attempt in (1, 2, 3):
        try:
            txns = fetch(acct_id)
        except OSError as err:
            if attempt == 3:
                print(f"{acct_id}: failed {attempt} attempts ({err}) -> dead-letter queue")
            else:
                print(f"{acct_id}: attempt {attempt} failed ({err}) -> retry")
            continue
        apply(acct_id, txns)
        print(f"{acct_id}: applied on attempt {attempt} ({len(applied)} unique transactions so far)")
        break

print("monthly_spending:")
for key in sorted(monthly_spending):
    print("  ", key, "->", monthly_spending[key])`,
      },
      output: "queue (active in last 30 days): acct_a, acct_b, acct_d\nacct_a: applied on attempt 1 (2 unique transactions so far)\nacct_b: attempt 1 failed (institution timed out) -> retry\nacct_b: applied on attempt 2 (3 unique transactions so far)\nacct_d: applied on attempt 1 (4 unique transactions so far)\nmonthly_spending:\n   ('u1', '2026-10', 'Transport') -> 75.0\n   ('u2', '2026-10', 'Shopping') -> 99.0\n   ('u4', '2026-10', 'Entertainment') -> 15.99",
      notes: ["The 45-day-inactive account never enters the queue; the duplicated t3 and the retried pull both hit the applied-set and add nothing twice. In production the applied-set is a unique index on the transaction id with an INSERT ... ON CONFLICT DO NOTHING."],
    },
  ],
  companies: [
    "**Mint (2006–2024):** Aaron Patzer's Mint.com aggregated bank data through Yodlee, then through Intuit's own system after Intuit bought it for $170 million in 2009. By 2010 Mint connected more than 16,000 US and Canadian financial institutions and over 17 million accounts, passed 20 million users by 2016, and was merged into Credit Karma on 23 March 2024, source [Wikipedia](https://en.wikipedia.org/wiki/Intuit_Mint).",
    "**Plaid (2013–today):** today's aggregation layer: 12,000 financial institutions across 20 countries, used by 1 in 2 banked adults in the US, with over one million daily connections, source [Plaid](https://plaid.com/).",
    "**Intuit Credit Karma (2024–today):** Mint's successor: the Cash Flow product connects bank accounts and cards that are 'updated daily', shows a 'breakdown by category', and covers 12K+ institutions for 140+ million members — the same daily pull, categorise-once and aggregate design at bigger scale, source [Credit Karma](https://www.creditkarma.com/cash-flow).",
  ],
  mistakes: [
    { mistake: "Aggregating on read", why: "It looks simple: SUM over the user's transactions when the dashboard loads", wrong: "Every dashboard view rescans months of rows; p99 climbs with transaction volume, and 5 billion rows make it crawl", fix: "Precompute monthly_spending rows at write time and read a few indexed rows through a cache" },
    { mistake: "Storing raw credentials", why: "The scraper needs the user's bank login", wrong: "A breach leaks bank logins — Mint's own 2010 controversy was that it stored them decryptably", fix: "Store password hashes (char(64)) or OAuth-style tokens from the bank; never plaintext, never decryptable" },
    { mistake: "Re-categorising automatically over user overrides", why: "The seller map 'knows better'", wrong: "The user's manual correction is silently undone on the next pull, and trust dies", fix: "Manual overrides win forever; new transactions use the override, and nothing re-categorises old ones" },
    { mistake: "Scraping banks without rate limits and queues", why: "Scrape when the user refreshes, directly from the request", wrong: "Slow or blocked scrapes stall the request path, and bursts get the aggregator blocked by banks", fix: "Queue one job per account, drain with workers, throttle per institution, and let the user know when the refresh finishes" },
    { mistake: "No idempotency when a pull retries", why: "Retries only happen after failures, which are rare", wrong: "A pull that timed out but actually succeeded is re-applied: duplicated transactions and doubled totals", fix: "Dedupe by transaction id — a unique index and INSERT ... ON CONFLICT DO NOTHING" },
    { mistake: "One big transaction per pull", why: "All-or-nothing feels safe", wrong: "One failed account rolls back the whole day; long transactions hold locks and stall everything else", fix: "Commit per transaction or per account; keep each pull small and independent" },
  ],
  bestPractices: [
    { tag: "Security", text: "Store password hashes or bank-issued tokens, never plaintext or decryptable credentials; Mint's 2010 controversy is the case study." },
    { tag: "Performance", text: "Categorise once at write time and precompute aggregates; the write path absorbs the cost so reads are indexed lookups plus a cache." },
    { tag: "Reliability", text: "Make every pull idempotent: dedupe by transaction id, retry with backoff, park failures in a dead-letter queue, and alert on them." },
    { tag: "Maintainability", text: "Keep raw logs in object storage, about one month of hot rows in SQL, and the rest in a warehouse, so the operational database stays small and the pipeline stays replayable." },
  ],
  interview: [
    { q: "Design Mint.com.", a: "Clarify: connect a financial account, extract transactions daily (for users active in the past 30 days, on first link and on manual refresh), categorise them with manual override and no automatic re-categorisation, analyse monthly spending by category, recommend budgets with override, and notify near or over budget; extra analytics are out of scope. Estimate: 10M users, 30M accounts, 5B transactions a month at ~50 bytes = 250 GB/month, 9 TB in 3 years; 5e9 / 2.5e6 = 2,000 writes/s vs 500M / 2.5e6 = 200 reads/s, a 10:1 write-heavy workload. Design: Accounts API enqueues pull jobs (SQS/RabbitMQ); the extraction service pulls, stores raw logs in object storage, categorises via a ~50k seller map with crowd overrides, and the budget service aggregates monthly_spending and triggers notifications. Data: transactions and monthly_spending tables indexed on id, user_id, created_at; accounts with a char(64) password hash. Read path: Read API with cache-aside Redis/Memcached, static content from object store + CDN. A MapReduce job over the logs is the alternative aggregation. Scale writes with federation, sharding by user_id and a warehouse; keep ~1 month of transactions in SQL." },
    { q: "Mint is write-heavy, which is unusual. What in the design changes because of it?", a: "The usual tricks — cache everything, add read replicas — do not help writes, so the design spends its budget on the write path. First, batch and decouple: a queue absorbs 2,000 writes/s and workers drain it at a safe rate, so banks are never scraped from the request path. Second, categorise once at write time and precompute aggregates per (user, month, category), so the read side needs only a small cache — 200 reads/s — not heavy machinery. Third, idempotency by transaction id, because retries are guaranteed and duplicates corrupt money. Fourth, plan for sharding by user_id from the start (no cross-shard queries needed) and offload old rows to a warehouse so the primary stays small." },
    { q: "One bank changes its web layout and its users' pulls keep failing. What happens in your system and how do you handle it?", a: "The extraction worker for that bank's accounts starts failing; it retries with exponential backoff, then parks jobs in a dead-letter queue and alerts on the queue depth. Idempotency by transaction id means the failed pulls corrupt nothing — no duplicated rows, no doubled totals. The bank is marked degraded: new pulls for it are deprioritised or paused, its users see a 'last updated' status, and previously extracted data stays visible. Engineers fix the scraper or move that bank to an API-based connection; once fixed, the parked jobs are replayed. If the outage is long, aggregate updates just lag — dashboards stay fast because they read precomputed rows, not the bank." },
  ],
  quickCheck: [
    {
      kind: "mcq",
      prompt: "Mint stores 5 billion transactions a month. When should each transaction be assigned its budget category?",
      options: ["When the dashboard renders the user's month view", "Once, when the transaction is ingested, from a seller-to-category map plus user overrides", "On every read, in case the user changed a category", "Never; categories are lazily computed by the bank"],
      answer: 1,
      explanation: "Categorise once at write time; user overrides win and nothing re-categorises automatically. On-read categorisation repeats the same work for every page view.",
    },
    {
      kind: "output",
      prompt: "Back-of-envelope: 5 billion transactions a month at about 50 bytes each. Roughly how much new transaction data is that per month?",
      options: ["25 GB", "250 GB", "2.5 TB", "25 TB"],
      answer: 1,
      explanation: "5e9 x 50 B = 250 GB/month; times 36 months is about 9 TB in 3 years. 2,000 writes/s and only 200 reads/s follow from the same numbers.",
    },
    {
      kind: "bug",
      prompt: "After a network timeout during a daily pull, the worker retries the same account. The user's Groceries total for the month doubled. What is the root cause?",
      options: ["The category service returned null for the seller", "The pull is not idempotent: the retry re-applies the same transactions because there is no dedupe on transaction id", "The budget service notified twice", "The queue delivered the job to two workers"],
      answer: 1,
      explanation: "A pull that timed out can still have committed. Dedupe by transaction id — a unique index with INSERT ... ON CONFLICT DO NOTHING — so retries are harmless.",
    },
  ],
  cheatSheet: [
    "Pull daily for users active in the past 30 days, on first link, and on manual refresh.",
    "Categorise once at write time; user overrides win; never re-categorise automatically.",
    "Aggregate per (user, month, category); the budget check is a side effect of the write.",
    "5e9 tx/month x 50 B = 250 GB/month (~9 TB in 3 years); 2,000 writes/s vs 200 reads/s (10:1).",
    "~50k sellers x 255 B ~= 12 MB in memory; top override via a heap peek, O(1).",
    "Read path: cache-aside Redis/Memcached -> SQL; static content from object store + CDN.",
    "Idempotency by transaction id; retries must never double-count.",
    "Scale writes: federation, sharding by user_id, warehouse for old rows (~1 month hot in SQL).",
  ],
  homework: {
    basic: {
      title: "Categorise transactions",
      brief: [
        "Build the category service: a seller->category map with crowd-sourced overrides. Seed a dictionary of well-known sellers, count user corrections per seller, then categorise a stream of transactions: seeded sellers map to the right category, the most common user override wins for unseeded sellers, and unknown sellers stay uncategorised (null) instead of being guessed.",
      ],
      criteria: ["Seeded sellers map to the right category", "Most common user override wins for unseeded sellers", "Deterministic output"],
      hints: ["Keep two structures: a seeded dict and a Counter of corrections per seller; look up the seed first.", "Break ties explicitly (for example alphabetically) so the output never depends on hash order."],
      solution: {
        text: [
          "The two structures mirror Mint's category service: the seed covers the famous sellers and the crowd vote covers the long tail. I ran the script and checked every line: seeded sellers resolve from the seed, Corner Cafe resolves to its 3-to-1 override, Trader Joes to its 2-to-1 override, and Zara stays None — guessing a category at write time would poison every later report, so None is a feature.",
        ],
        code: {
          lang: "python",
          file: "categorise.py",
          code: `"""Categorise transactions: seeded seller -> category map plus crowd-sourced overrides.
Seeded sellers always win; for unseeded sellers the most common user correction wins, ties
broken alphabetically for deterministic output; unknown sellers stay None - guessing at
write time poisons every later report."""
from collections import Counter, defaultdict

SEED = {
    "Shell": "Transport",
    "Whole Foods": "Groceries",
    "Netflix": "Entertainment",
    "Amazon": "Shopping",
}

CORRECTIONS = [
    ("Corner Cafe", "Coffee"), ("Corner Cafe", "Coffee"), ("Corner Cafe", "Coffee"),
    ("Corner Cafe", "Dining"),
    ("Trader Joes", "Groceries"), ("Trader Joes", "Groceries"),
    ("Trader Joes", "Health"),
]

overrides: dict[str, Counter] = defaultdict(Counter)
for seller, category in CORRECTIONS:
    overrides[seller][category] += 1


def categorise(seller: str) -> str | None:
    if seller in SEED:
        return SEED[seller]
    counts = overrides.get(seller)
    if counts:
        # most common correction wins; ties break alphabetically (deterministic)
        return sorted(counts.items(), key=lambda kv: (-kv[1], kv[0]))[0][0]
    return None


for seller in ("Shell", "Whole Foods", "Corner Cafe", "Trader Joes", "Netflix", "Zara"):
    print(f"{seller:>12} -> {categorise(seller)}")`,
        },
        output: "       Shell -> Transport\n Whole Foods -> Groceries\n Corner Cafe -> Coffee\n Trader Joes -> Groceries\n     Netflix -> Entertainment\n        Zara -> None",
        pitfalls: ["Using set iteration anywhere in the vote counting: dict/set order can differ across runs and silently flip a tied category."],
      },
    },
    intermediate: {
      title: "Aggregate monthly spending and notify",
      brief: [
        "Write a MapReduce-style aggregation over a tab-delimited transaction log producing (user, month, category) totals and budget-exceeded notifications. A mapper parses and categorises each line; a reducer sums per key; a budget check fires a notification only when a category is nearing or exceeding the user's budget — never otherwise.",
      ],
      criteria: ["Mapper/reducer structure", "Correct per-category totals", "Notifications only when nearing/exceeding budget", "Real output"],
      hints: ["Make mapper and reducer pure functions over one line at a time; run the budget check only after totals are computed.", "Use float for amounts here; in production money is stored as decimals, not floats."],
      solution: {
        text: [
          "The mapper/reducer split is what lets this run as a warehouse job over raw logs instead of in the API. I ran it and verified the arithmetic by hand: u1 Transport 40.00 + 38.00 = 78.00 against an 80 budget fires 'nearing' (78 >= 72), u1 Entertainment 31.98 against 20 fires 'exceeded', and u2 Groceries 215 against 250 stays silent — notifications fire only from the two budget checks, and every other category is quiet.",
        ],
        code: {
          lang: "python",
          file: "aggregate.py",
          code: `"""Aggregate monthly spending MapReduce-style over a tab-delimited log, then notify.

Log lines: user_id \\t timestamp \\t seller \\t amount.
Mapper: parse a line, categorise the seller, emit ((user, yyyy-mm, category), amount).
Reducer: sum per key -> the monthly_spending rows.
Budget check: runs after the totals are updated and notifies only when a category is
nearing (>= 90%) or exceeding the user's budget; every other category stays silent.
"""
from collections import defaultdict

LOG = """\\
u1\\t2026-10-03\\tShell\\t40.00
u1\\t2026-10-08\\tShell\\t38.00
u1\\t2026-10-12\\tNetflix\\t15.99
u1\\t2026-10-16\\tNetflix\\t15.99
u2\\t2026-10-05\\tWhole Foods\\t120.00
u2\\t2026-10-09\\tWhole Foods\\t95.00
u2\\t2026-10-15\\tCorner Cafe\\t9.50
"""

CATEGORY = {"Shell": "Transport", "Netflix": "Entertainment",
            "Whole Foods": "Groceries", "Corner Cafe": "Coffee"}
BUDGETS = {"u1": {"Transport": 80.0, "Entertainment": 20.0},
           "u2": {"Groceries": 250.0}}


def mapper(line: str):
    user, ts, seller, amount = line.split("\\t")
    return (user, ts[:7], CATEGORY.get(seller, "Uncategorised")), float(amount)


def reducer(pairs):
    totals = defaultdict(float)
    for key, amount in pairs:
        totals[key] += amount
    return dict(totals)


def notify(totals) -> list[str]:
    fired = []
    for (user, month, category), total in sorted(totals.items()):
        budget = BUDGETS.get(user, {}).get(category)
        if budget is None:
            continue
        if total > budget:
            fired.append(f"{user}: {category} exceeded budget ({total:.2f} vs {budget:.2f})")
        elif total >= 0.9 * budget:
            fired.append(f"{user}: {category} nearing budget ({total:.2f} vs {budget:.2f})")
    return fired


totals = reducer(map(mapper, LOG.strip().splitlines()))
for key in sorted(totals):
    print(f"{key} -> {totals[key]:.2f}")
print("notifications:")
for note in notify(totals):
    print(" ", note)`,
        },
        output: "('u1', '2026-10', 'Entertainment') -> 31.98\n('u1', '2026-10', 'Transport') -> 78.00\n('u2', '2026-10', 'Coffee') -> 9.50\n('u2', '2026-10', 'Groceries') -> 215.00\nnotifications:\n  u1: Entertainment exceeded budget (31.98 vs 20.00)\n  u1: Transport nearing budget (78.00 vs 80.00)",
        pitfalls: ["Firing a notification for every category regardless of budget: users get spammed and the write path pays for checks nobody asked for."],
      },
    },
    challenge: {
      title: "Scheduled ingestion pipeline",
      brief: [
        "Simulate the daily pull: active-in-30-days filter, queue, dedupe by transaction id, idempotent monthly_spending upsert, retries for failed accounts. Accounts inactive for more than 30 days are not queued; a duplicated or redelivered transaction id is applied exactly once; a failing bank is retried and still never double-counts.",
      ],
      criteria: ["Inactive accounts skipped", "Duplicate transactions applied once", "Failure retried without double-counting", "Real output"],
      hints: ["A set of applied transaction ids is the idempotency boundary; in SQL it is a unique index.", "Make one account fail its first fetch and succeed on retry, then prove the totals are unchanged by the failure."],
      solution: {
        text: [
          "The pipeline has three boundaries, and I verified each in the output: loan_u2 (31 days inactive) never appears in the queue; checking_u3's duplicated t4 lands once, so Shopping is 200.00 not 400.00; and card_u1 fails once, retries, and its total appears exactly once. In production the applied-set is a unique index on transaction id, the queue is SQS/RabbitMQ with visibility timeouts, and a dead-letter queue plus an alert replaces the parked-job print.",
        ],
        code: {
          lang: "python",
          file: "pipeline.py",
          code: `"""Scheduled ingestion pipeline: only accounts active in the last 30 days are queued,
transactions are deduped by id, monthly_spending is upserted idempotently, and a failing
account is retried without ever double-counting."""
import datetime as dt
from collections import defaultdict

TODAY = dt.date(2026, 11, 1)
CATEGORY = {"Shell": "Transport", "Netflix": "Entertainment", "Amazon": "Shopping"}

accounts = {
    "checking_u1": {"user": "u1", "last_active": TODAY - dt.timedelta(days=3)},
    "card_u1": {"user": "u1", "last_active": TODAY - dt.timedelta(days=9)},
    "loan_u2": {"user": "u2", "last_active": TODAY - dt.timedelta(days=31)},   # just inactive
    "checking_u3": {"user": "u3", "last_active": TODAY - dt.timedelta(days=7)},
}
pending = {
    "checking_u1": [("t1", "2026-10-28", "Shell", 60.0), ("t2", "2026-10-29", "Shell", 25.0)],
    "card_u1": [("t3", "2026-10-30", "Netflix", 15.99)],
    "checking_u3": [("t4", "2026-10-26", "Amazon", 200.0), ("t4", "2026-10-26", "Amazon", 200.0)],
}

monthly: defaultdict[tuple, float] = defaultdict(float)
applied: set[str] = set()


def fetch(acct_id, fail_this_time: bool):
    if fail_this_time:
        raise ConnectionError("bank unreachable")
    return pending[acct_id]


def apply(acct_id, txns):
    user = accounts[acct_id]["user"]
    for tid, ts, seller, amount in txns:
        if tid in applied:
            continue                          # idempotency: duplicate or redelivered id
        monthly[(user, ts[:7], CATEGORY[seller])] += amount
        applied.add(tid)


queue = [a for a in accounts if (TODAY - accounts[a]["last_active"]).days <= 30]
print("queued (active <= 30 days):", queue)

flaky = {"card_u1": 1}
for acct_id in queue:
    for attempt in (1, 2, 3):
        try:
            txns = fetch(acct_id, flaky.get(acct_id, 0) > 0)
        except ConnectionError as err:
            if flaky.get(acct_id, 0) > 0:
                flaky[acct_id] -= 1
            if attempt == 3:
                print(f"{acct_id}: failed 3 times ({err}) -> parked for manual review")
                break
            print(f"{acct_id}: attempt {attempt} failed ({err}) -> retry")
            continue
        apply(acct_id, txns)
        print(f"{acct_id}: done on attempt {attempt}, unique transactions = {len(applied)}")
        break

print("monthly_spending:")
for key in sorted(monthly):
    print(" ", key, "->", monthly[key])`,
        },
        output: "queued (active <= 30 days): ['checking_u1', 'card_u1', 'checking_u3']\nchecking_u1: done on attempt 1, unique transactions = 2\ncard_u1: attempt 1 failed (bank unreachable) -> retry\ncard_u1: done on attempt 2, unique transactions = 3\nchecking_u3: done on attempt 1, unique transactions = 4\nmonthly_spending:\n  ('u1', '2026-10', 'Entertainment') -> 15.99\n  ('u1', '2026-10', 'Transport') -> 85.0\n  ('u3', '2026-10', 'Shopping') -> 200.0",
        pitfalls: ["Deduplicating per pull instead of globally: a transaction redelivered in a later pull would be applied again."],
      },
    },
    capstone: {
      title: "DevAtlas: progress analytics pipeline",
      brief: [
        "Write docs/design/progress-analytics.md for DevAtlas applying Mint's patterns to learner progress events: daily rollups per (learner, week, topic), streak computation, dashboard cache. Include requirements with an out-of-scope list, estimates with numbers, a Mermaid diagram, and a failure/rollout section.",
      ],
      criteria: ["Requirements and out-of-scope list", "Estimates with numbers", "Mermaid diagram", "Failure/rollout section"],
      hints: ["Reuse the numbers from the hands-on text block; the diagram only needs the write path, the cache and the dashboard.", "The rollup worker is the budget service: it updates aggregates and computes the streak as a side effect."],
      solution: {
        text: [
          "The doc applies the lesson's four moves to DevAtlas: events go through a queue, the rollup worker categorises by topic once and upserts (learner, week, topic) rows idempotently, the streak is a side effect of the write, and the dashboard reads cached aggregates. I checked the arithmetic (160k events/day is ~2/s, rollup rows are tiny, and the cache absorbs nearly all dashboard reads) and the Mermaid diagram parses; a senior reviewer would ask for exactly the two things the failure section covers — retry double-counting and rollup lag.",
        ],
        code: {
          lang: "markdown",
          file: "docs/design/progress-analytics.md",
          code: `# Design: DevAtlas progress analytics pipeline
Status: proposal · Builds on: 6.4.4 (Mint.com) and 6.3.11 (queues) · Owner: platform team
## 1. Requirements

**Functional**
- Daily rollups per (learner, week, topic): lessons completed, minutes studied, quizzes passed.
- Streak: consecutive days with at least one progress event; shown on the dashboard.
- Dashboard reads precomputed aggregates (p95 < 200 ms); weekly digest email built from the same rollups.

**Non-functional**
- Rollup job for a day's events completes within 30 minutes after midnight IST.
- A retried or duplicated event is counted exactly once (idempotency by event id).
- Events are eventually consistent: dashboards may lag a few minutes, never show wrong totals.

**Out of scope:** real-time leaderboards (existing), per-event analytics for the product team (warehouse), cross-device presence.
## 2. Estimates

| | Value |
|---|---|
| Registered / daily active learners | 100,000 / 20,000 |
| Progress events per active learner per day | ~8 -> 160,000 events/day, ~2/s average, ~20/s evening peak |
| Event size | ~100 bytes -> 16 MB/day, ~18 GB in 3 years |
| Rollup rows | 20,000 x 3 topics x 52 weeks ~= 3.1M rows/year: tiny |
| Dashboard reads | 20,000 x 5 views/day ~= 100,000/day ~= 1.2/s: a small cache absorbs nearly all |

Like Mint, the workload is write-heavy relative to the dashboards: pay once on the write path, read almost for free.
## 3. Design

\`\`\`mermaid
flowchart LR
  api["Progress API"] -->|"progress events"| q[("Queue")]
  q -->|"drain"| worker["Rollup worker"]
  worker -->|"idempotent upsert (learner, week, topic)"| sql[("SQL: rollups")]
  worker -->|"streak side effect"| redis[("Redis: streak + dashboard cache")]
  dashboard["Dashboard"] -->|"cache-aside"| redis
  redis -->|"miss"| sql
  digest["Weekly digest job"] --> sql
\`\`\`

- **Write path:** the API appends events; the rollup worker dedupes by event id, upserts the (learner, week, topic) row (ON CONFLICT DO UPDATE amount = amount + EXCLUDED.amount), updates the streak counters in Redis, and invalidates the learner's dashboard cache key.
- **Read path:** dashboard reads cached aggregates; on a miss it reads the rollup table and refills with a TTL.
- **Streak as a side effect:** the worker compares the event's day with last_active in Redis; same day = no-op, yesterday = increment, older = reset to 1.
## 4. Failure modes

| Failure | Behaviour |
|---|---|
| Worker crashes mid-batch | queue visibility timeout redelivers; event-id dedupe prevents double counting |
| Cache stale after rollup | delete-on-write per learner key; worst case one TTL of staleness |
| Rollup lag (job takes > 30 min) | alert on queue age; dashboards show last-rolled-up date |
| Redis lost | streak and cache rebuild from the rollup table; no permanent data lives only in Redis |
## 5. Rollout

1. Shadow run for 7 days: compute rollups in parallel with the current on-read aggregation and diff totals nightly.
2. Flag-flip the dashboard to cached rollups for 5% of learners; success = p95 under 200 ms and zero diff alerts for a week.
3. 100%, then archive raw events older than 90 days to the warehouse.`,
        },
      },
    },
  },
  deeper: [
    { label: "System Design Primer: Design Mint.com (the case this lesson is based on, CC BY 4.0)", url: "https://github.com/donnemartin/system-design-primer/blob/master/solutions/system_design/mint/README.md" },
    { label: "System Design Primer (GitHub)", url: "https://github.com/donnemartin/system-design-primer" },
    { label: "Wikipedia: Intuit Mint (history, Yodlee, the 2010 credential controversy)", url: "https://en.wikipedia.org/wiki/Intuit_Mint" },
    { label: "Plaid: homepage (12,000 institutions across 20 countries)", url: "https://plaid.com/" },
    { label: "Plaid docs: Transactions API (scheduled 1-4x daily updates, merchant and category enrichment)", url: "https://plaid.com/docs/api/products/transactions/" },
    { label: "Intuit Credit Karma: Cash Flow (Mint's successor product)", url: "https://www.creditkarma.com/cash-flow" },
  ],
  nextPreview: "Next: 6.4.5, design a social graph and a search query cache: BFS across shards and an LRU in front of search.",
};
