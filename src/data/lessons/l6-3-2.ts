import type { Lesson } from "../../types";

export const lesson: Lesson = {
  id: "6.3.2",
  title: "The design method: requirements, estimates and numbers to know",
  minutes: 75,
  level: "Advanced",
  prerequisites: ["6.3.1 Scaling, CAP, load balancing and caching layers"],
  summary: "A repeatable four-step method for any system design (use cases and constraints, high-level design, core components, scaling), plus the powers of two, time conversions and latency numbers that let you size storage, traffic and speed in your head.",
  terms: [
    { term: "Functional requirement", def: "What the system must do for a user, e.g. 'a learner can share a code snippet and get a link'." },
    { term: "Non-functional requirement", def: "How well it must do it: latency, availability, durability, cost, security. These drive most design choices." },
    { term: "Read:write ratio", def: "How many reads happen per write. A 10:1 system needs very different scaling from a 1:10 system." },
    { term: "Back-of-the-envelope estimate", def: "A quick calculation with rounded numbers to get the order of magnitude (10 GB or 10 TB?) before building anything." },
    { term: "Powers of two", def: "2¹⁰ ≈ one thousand (KB), 2²⁰ ≈ one million (MB), 2³⁰ ≈ one billion (GB), 2⁴⁰ ≈ one trillion (TB)." },
    { term: "Bottleneck", def: "The single resource that runs out first (CPU, disk, a database lock, network) and limits the whole system." },
    { term: "Order of magnitude", def: "A factor of 10. Estimates aim to be right within one order of magnitude, not to the last digit." },
  ],
  problem: [
    "Your lead asks: 'Learners want to share code snippets with their mentor. Design a Pastebin for DevAtlas and write it up by Friday.' Many engineers open a diagram tool and start drawing microservices, Kafka and Kubernetes. On Thursday someone asks 'how many pastes per day do we expect, and how long do we keep them?' and nobody knows. The design was built on air.",
    "The same thing happens in interviews: candidates who jump straight to boxes get lost, while candidates who spend the first minutes on requirements and numbers make every later choice look obvious. A design method is not bureaucracy; it is the fastest way to a design you can defend.",
  ],
  concept: {
    analogy: [
      "An architect designing a house does not start with the colour of the bathroom tiles. First: **who lives here, how many people, what budget** (requirements). Then a **floor plan** with rooms and doors (high-level design). Then the **plumbing and wiring** of the tricky rooms (core components). Finally: **what if the family doubles?** Add a floor, a bigger boiler (scaling). Skipping the first step is how you get a beautiful house with one bathroom for twelve people.",
    ],
    precise: [
      "**Step 1: use cases, constraints and assumptions.** List who does what (use cases), what is explicitly out of scope, and the numbers: users, requests per month, read:write ratio, size of each item, how long data is kept, latency and availability targets. Write every assumption down so others can challenge it.",
      "**Step 2: high-level design.** Draw the main boxes (clients, web servers, application services, databases, caches, object storage) and trace one request of each use case end to end. Keep it simple enough to fit on one screen.",
      "**Step 3: core components.** Go deep on the two or three parts that make or break the system: the API, the data model, and the key algorithm (for a Pastebin: how to generate short unique ids). Compare at least two options for each and say why you pick one.",
      "**Step 4: scale the design.** Use your numbers to find the bottlenecks, then apply the building blocks from this module (load balancer, replicas, cache, CDN, sharding, queues) one at a time, naming the trade-off each one brings. Iterate: the new design will have a new bottleneck.",
      "**Numbers to carry in your head.** A month has about 2.5 million seconds, so 1 request per second ≈ 2.5 million per month, 40 per second ≈ 100 million per month, 400 per second ≈ 1 billion per month. Memory is roughly 100× faster than an SSD random read; a round trip inside a data centre costs about 0.5 ms; a round trip across an ocean costs about 150 ms.",
    ],
  },
  underTheHood: {
    text: [
      "**Why latency numbers matter.** The classic list (published by Jeff Dean and Peter Norvig, around 2012) says: main memory reference ~100 ns, read 4 KB randomly from SSD ~150 µs, round trip within the same data centre ~500 µs, read 1 MB sequentially from SSD ~1 ms, disk seek ~10 ms, round trip California → Netherlands → California ~150 ms. Modern SSDs and networks are faster than these values, but the **ratios** still hold, and the ratios are what drive design.",
      "**What the ratios tell you.** A page that makes 10 sequential database calls in the same data centre spends about 5 ms on network round trips. The same page talking to a database in another continent spends 1.5 seconds. That is why you put caches near users, batch calls, and keep chatty services in the same region. Reading 1 GB sequentially from memory takes about 0.25 s; from a spinning disk about 30 s. That is why hot data lives in memory.",
      "**Storage and bandwidth come from multiplication.** Items per month × size per item × months kept × copies (replicas, backups) × overhead (indexes). Bandwidth: requests per second × response size. Peak traffic is usually 2× to 10× the average; always design for the peak, then check the cost of the average.",
    ],
    diagram: {
      title: "The four-step design method",
      nodes: [
        { label: "1. Use cases & constraints", sub: "who, what, how much" },
        { label: "2. High-level design", sub: "boxes and one request path" },
        { label: "3. Core components", sub: "API, data model, algorithm" },
        { label: "4. Scale it", sub: "bottleneck → building block" },
      ],
      edges: ["numbers", "zoom in", "measure"],
      caption: "Step 4 loops back: each fix moves the bottleneck somewhere else, so you measure and repeat.",
    },
  },
  handsOn: [
    {
      title: "Write the requirements before drawing any box",
      text: ["This is the Step 1 section of a real design doc for the DevAtlas Pastebin. It takes ten minutes and saves days."],
      code: {
        lang: "markdown",
        file: "docs/design-pastebin.md",
        code: `# DevAtlas Pastebin: design

## 1. Use cases
- A learner pastes code and gets a short link (e.g. devatlas.dev/p/aZ3kQ9x).
- Anyone with the link can view the paste. Views are counted for analytics.
- A paste expires after a chosen time (1 hour to 1 year, default 1 month).

## Out of scope (for now)
- Accounts and editing pastes, syntax-aware search, private pastes.

## Constraints and assumptions
- 10 million new pastes per month, 100 million reads per month (read:write 10:1).
- Average paste 1 KB of text; a paste is never edited.
- Keep pastes for up to 3 years.
- Reads must be fast: p99 under 200 ms. Availability 99.9%.
- Traffic is uneven: peak is about 5x the average (homework deadlines).

## Open questions
- Do mentors need to see pastes from deleted learners? (ask legal)`,
      },
      notes: ["Notice what is missing: no technology names. Requirements describe the problem, not the solution."],
    },
    {
      title: "Turn the requirements into numbers",
      text: ["The primer's trick: 2.5 million seconds per month. Run this and you know whether you need one database or a hundred."],
      code: {
        lang: "python",
        file: "estimate_pastebin.py",
        code: `SECONDS_PER_MONTH = 2.5e6       # 30 days x 86,400 s, rounded for mental maths

writes_per_month = 10e6
reads_per_month = 100e6
paste_kb = 1
months_kept = 36
peak_factor = 5

write_rps = writes_per_month / SECONDS_PER_MONTH
read_rps = reads_per_month / SECONDS_PER_MONTH
storage_gb = writes_per_month * months_kept * paste_kb / 1e6
read_mb_s = read_rps * peak_factor * paste_kb / 1e3

print(f"writes/s  avg {write_rps:5.0f}   peak {write_rps * peak_factor:5.0f}")
print(f"reads/s   avg {read_rps:5.0f}   peak {read_rps * peak_factor:5.0f}")
print(f"storage after 3 years   {storage_gb:6.0f} GB  ({writes_per_month * months_kept / 1e6:.0f} million pastes)")
print(f"read bandwidth at peak  {read_mb_s:6.1f} MB/s")`,
      },
      output: "writes/s  avg     4   peak    20\nreads/s   avg    40   peak   200\nstorage after 3 years      360 GB  (360 million pastes)\nread bandwidth at peak     0.2 MB/s",
      notes: [
        "Conclusion: 200 reads per second and 360 GB fit on a single well-indexed PostgreSQL server with a read replica for safety. No sharding, no Kafka. The numbers just saved you weeks of over-engineering.",
        "The one number that grows without limit is storage, so the design must include expiry and cleanup.",
      ],
    },
    {
      title: "Use latency numbers to compare two designs",
      text: ["A design review is arguing about a page that loads a learner's dashboard with 8 backend calls. Put numbers on it instead of opinions."],
      code: {
        lang: "python",
        file: "latency_compare.py",
        code: `# Rounded figures from the classic latency table (order of magnitude only)
NS = {
    "memory_ref": 100,
    "ssd_random_4kb": 150_000,
    "dc_round_trip": 500_000,
    "cross_ocean_round_trip": 150_000_000,
}

def ms(ns: float) -> float:
    return ns / 1e6

calls = 8
same_dc_sequential = calls * (NS["dc_round_trip"] + NS["ssd_random_4kb"])
same_dc_parallel = NS["dc_round_trip"] + NS["ssd_random_4kb"]          # wait only for the slowest
db_in_other_region = calls * (NS["cross_ocean_round_trip"] + NS["ssd_random_4kb"])
from_cache = calls * (NS["dc_round_trip"] + NS["memory_ref"])

for name, cost in [("same DC, sequential", same_dc_sequential),
                   ("same DC, parallel", same_dc_parallel),
                   ("DB in another region", db_in_other_region),
                   ("same DC, Redis cache", from_cache)]:
    print(f"{name:22} {ms(cost):8.1f} ms")`,
      },
      output: "same DC, sequential         5.2 ms\nsame DC, parallel           0.7 ms\nDB in another region     1201.2 ms\nsame DC, Redis cache        4.0 ms\n",
      notes: [
        "Placement beats code tuning: moving the database to another region costs 230× more than everything else combined. Running calls in parallel beats caching here, because the round trip, not the disk, dominates.",
        "Real numbers vary with hardware; measure your own system (lesson 6.3.3). The ratios are what you remember.",
      ],
    },
    {
      title: "A powers-of-two cheat table you can regenerate",
      code: {
        lang: "python",
        file: "powers.py",
        code: `units = ["KB", "MB", "GB", "TB", "PB"]
for i, unit in enumerate(units, start=1):
    exact = 2 ** (10 * i)
    print(f"2^{10 * i:<3} = {exact:>25,} bytes  ~ 10^{3 * i:<2} = 1 {unit}")`,
      },
      output: "2^10  =                     1,024 bytes  ~ 10^3  = 1 KB\n2^20  =                 1,048,576 bytes  ~ 10^6  = 1 MB\n2^30  =             1,073,741,824 bytes  ~ 10^9  = 1 GB\n2^40  =         1,099,511,627,776 bytes  ~ 10^12 = 1 TB\n2^50  =     1,125,899,906,842,624 bytes  ~ 10^15 = 1 PB",
      notes: ["The error of treating 2¹⁰ as 1,000 is only 2.4% per step, which is fine for estimates. Bits vs bytes is not fine: network speeds are in bits (1 Gbps ≈ 125 MB/s)."],
    },
  ],
  companies: [
    "**Design docs before code.** Google design docs, Uber and many others' RFCs, and Amazon's written narratives all start with context, goals, non-goals and numbers before any architecture. A reviewer's first comment is usually about a missing requirement, not a missing box.",
    "**Interview loops.** Most system design interviews at large companies are scored on exactly these steps: did the candidate clarify requirements, estimate scale, present a clear high-level design, go deep on a component, and discuss trade-offs and bottlenecks.",
    "**Launch and capacity reviews.** Before big events (a sale, an exam season, a product launch) teams redo the estimates with fresh numbers and decide what to pre-scale. The estimate is cheap; the outage it prevents is not.",
  ],
  mistakes: [
    { mistake: "Drawing boxes first", why: "Diagrams feel like progress", wrong: "A design for a problem nobody stated; rework when the real numbers arrive", fix: "Spend the first 10–20% of the time on use cases, constraints and estimates" },
    { mistake: "Designing for Google scale on day one", why: "Copying famous architectures", wrong: "Sharding, Kafka and microservices for 200 requests per second; huge cost and slow delivery", fix: "Let the numbers decide; write down the trigger (e.g. 'shard at 2 TB') for each future step" },
    { mistake: "Ignoring the read:write ratio", why: "Thinking of traffic as one number", wrong: "Write-optimised storage for a read-heavy system, or caches for data that is written constantly", fix: "Estimate reads and writes separately; scale each side with its own tools (cache/replicas vs partitioning/queues)" },
    { mistake: "Mixing bits and bytes", why: "Network speeds are quoted in bits", wrong: "A '1 Gbps' link expected to move 1 GB/s; reality is 125 MB/s, 8× less", fix: "Write units on every number; divide bits by 8" },
    { mistake: "Storage estimate without copies and overhead", why: "Counting only the raw rows", wrong: "Disks fill up years early once replicas, backups and indexes are included", fix: "Multiply by replicas, backups and an index/overhead factor (often 2×)" },
    { mistake: "Average traffic only", why: "Monthly totals are easy to find", wrong: "Outage at the daily peak or a marketing spike", fix: "Apply a peak factor (2–10×) and design for the peak" },
  ],
  bestPractices: [
    { tag: "Maintainability", text: "Keep a design-doc template with sections for use cases, out of scope, constraints, high-level design, core components, scaling and open questions." },
    { tag: "Cost", text: "Pick the simplest design that meets the numbers, and write down the measurable trigger for each future scaling step." },
    { tag: "Performance", text: "Use latency ratios to decide placement: keep chatty components in the same region and hot data in memory." },
    { tag: "Reliability", text: "State availability and durability targets explicitly; they decide how many replicas and regions you need." },
  ],
  interview: [
    { q: "How do you start a system design interview?", a: "Clarify use cases and what is out of scope, then constraints: number of users, requests per second, read:write ratio, data size and retention, latency and availability targets. Turn them into rough numbers (requests per second, storage, bandwidth) out loud. Only then draw a high-level design, go deep on the key components, and scale based on the bottlenecks the numbers reveal." },
    { q: "How much storage does a service with 10 million 1 KB writes per month need over 3 years?", a: "10 million × 1 KB = 10 GB per month; × 36 months = 360 GB raw. With a replica and indexes, plan for roughly 1 TB. That fits on one database server, so storage alone does not force sharding." },
    { q: "Why do latency numbers matter in design?", a: "They show where time goes: memory is about 100× faster than an SSD random read, a same-data-centre round trip is about 0.5 ms and a cross-ocean one about 150 ms. So you cache hot data in memory, avoid sequential cross-region calls, parallelise independent calls and put content near users with CDNs." },
  ],
  quickCheck: [
    {
      kind: "output",
      prompt: "A service handles 400 requests per second on average. Roughly how many requests per month is that?",
      options: ["10 million", "100 million", "1 billion", "100 billion"],
      answer: 2,
      explanation: "400 × 2.5 million seconds per month = 1 billion.",
    },
    {
      kind: "mcq",
      prompt: "Which should come first in a design discussion?",
      options: ["Choosing between PostgreSQL and MongoDB", "Drawing the microservices", "Clarifying use cases, constraints and expected scale", "Picking a cloud provider"],
      answer: 2,
      explanation: "Technology choices only make sense once you know the problem and its numbers.",
    },
    {
      kind: "bug",
      prompt: "A team expects their '10 Gbps' link to copy a 1 TB backup in about 100 seconds. Why do they miss the window?",
      options: ["The link is faulty", "10 Gbps is 10 gigabits, about 1.25 GB/s, so 1 TB takes about 800 seconds or more", "TB means terabits", "Backups cannot use the network"],
      answer: 1,
      explanation: "Network speeds are in bits. Divide by 8 and allow for protocol overhead.",
    },
  ],
  cheatSheet: [
    "Steps: use cases & constraints → high-level design → core components → scale.",
    "1 req/s ≈ 2.5M/month; 40 req/s ≈ 100M/month; 400 req/s ≈ 1B/month.",
    "2¹⁰ ≈ KB, 2²⁰ ≈ MB, 2³⁰ ≈ GB, 2⁴⁰ ≈ TB, 2⁵⁰ ≈ PB.",
    "Memory ~100 ns; SSD random ~150 µs; same-DC round trip ~0.5 ms; cross-ocean ~150 ms.",
    "Storage = items × size × retention × copies × overhead.",
    "Design for peak (2–10× average); bits ÷ 8 = bytes.",
    "Write down assumptions and out-of-scope items.",
  ],
  homework: {
    basic: {
      title: "Estimate a snippet-sharing service with images",
      brief: [
        "DevAtlas Pastebin v2 lets learners attach one screenshot (average 300 KB) to 20% of pastes. Keep the 10 million pastes per month, 10:1 read:write and 3-year retention. Estimate writes and reads per second (average and 5× peak), text and image storage after 3 years, and read bandwidth at peak. State where the images should live.",
      ],
      criteria: ["Every assumption in a named variable", "Separate text and image storage", "A one-line conclusion about where the bottleneck is"],
      hints: ["Images dominate storage and bandwidth; text dominates nothing.", "Object storage (S3, Azure Blob) plus a CDN is the default for images."],
      solution: {
        text: [
          "Images are 98% of storage and almost all of the bandwidth, so they decide the architecture: put them in object storage behind a CDN, and keep only the image key in the database row. The database stays small enough for one server.",
        ],
        code: {
          lang: "python",
          file: "estimate_pastebin_v2.py",
          code: `SECONDS_PER_MONTH = 2.5e6

pastes_per_month = 10e6
reads_per_write = 10
months_kept = 36
peak_factor = 5
text_kb = 1
image_share = 0.2
image_kb = 300

write_rps = pastes_per_month / SECONDS_PER_MONTH
read_rps = write_rps * reads_per_write
total_pastes = pastes_per_month * months_kept
text_gb = total_pastes * text_kb / 1e6
image_tb = total_pastes * image_share * image_kb / 1e9
avg_read_kb = text_kb + image_share * image_kb            # expected bytes per view
peak_read_mb_s = read_rps * peak_factor * avg_read_kb / 1e3

print(f"writes/s avg {write_rps:.0f}, peak {write_rps * peak_factor:.0f}")
print(f"reads/s  avg {read_rps:.0f}, peak {read_rps * peak_factor:.0f}")
print(f"text storage  {text_gb:,.0f} GB")
print(f"image storage {image_tb:,.1f} TB  ({image_tb * 1000 / (image_tb * 1000 + text_gb):.0%} of all bytes)")
print(f"peak read bandwidth {peak_read_mb_s:.1f} MB/s = {peak_read_mb_s * 8:.0f} Mbps")`,
        },
        output: "writes/s avg 4, peak 20\nreads/s  avg 40, peak 200\ntext storage  360 GB\nimage storage 21.6 TB  (98% of all bytes)\npeak read bandwidth 12.2 MB/s = 98 Mbps",
        pitfalls: ["Storing images as BLOBs in the database: backups, replicas and restores all slow down for no benefit.", "Forgetting the CDN: 98 Mbps from your own servers is paid egress you can mostly avoid."],
      },
    },
    intermediate: {
      title: "Estimate a photo feed",
      brief: [
        "A photo app has 1 million daily active users. Each uploads 2 photos per day (2 MB original, plus a 200 KB thumbnail generated by the server) and views 50 thumbnails and 5 originals per day. Peak is 4× average. Estimate uploads per second, views per second, storage per year (with 3 copies) and peak egress in Gbps. Which number worries you most?",
      ],
      criteria: ["Uploads and views separated", "Copies included in storage", "Egress in bits per second", "A reasoned 'what worries me' line"],
      hints: ["86,400 seconds per day.", "Egress = views per second × bytes per view × 8."],
      solution: {
        text: [
          "Storage (about 4.8 PB per year with 3 copies) and egress (about 7.4 Gbps at peak) dominate. Uploads at around 93 per second at peak are trivial for app servers. The design must therefore spend its effort on object storage tiers (move old originals to cheaper cold storage) and a CDN with a high hit rate for thumbnails.",
        ],
        code: {
          lang: "python",
          file: "estimate_photos.py",
          code: `SECONDS_PER_DAY = 86_400

dau = 1_000_000
uploads_per_user = 2
original_mb = 2.0
thumb_mb = 0.2
thumb_views_per_user = 50
original_views_per_user = 5
peak_factor = 4
copies = 3

uploads_s = dau * uploads_per_user / SECONDS_PER_DAY
views_s = dau * (thumb_views_per_user + original_views_per_user) / SECONDS_PER_DAY
storage_pb_year = dau * uploads_per_user * (original_mb + thumb_mb) * 365 * copies / 1e9
bytes_per_user_day_mb = thumb_views_per_user * thumb_mb + original_views_per_user * original_mb
egress_gbps_peak = dau * bytes_per_user_day_mb / SECONDS_PER_DAY * peak_factor * 8 / 1e3

print(f"uploads/s avg {uploads_s:6.1f}  peak {uploads_s * peak_factor:6.1f}")
print(f"views/s   avg {views_s:6.0f}  peak {views_s * peak_factor:6.0f}")
print(f"storage/year with {copies} copies  {storage_pb_year:.2f} PB")
print(f"egress at peak  {egress_gbps_peak:.1f} Gbps")`,
        },
        output: "uploads/s avg   23.1  peak   92.6\nviews/s   avg    637  peak   2546\nstorage/year with 3 copies  4.82 PB\negress at peak  7.4 Gbps",
        pitfalls: ["Forgetting thumbnails are generated work: a queue of resize jobs (lesson 6.3.11) keeps uploads fast.", "Ignoring storage classes: most photos are rarely viewed after a month and can move to cheaper tiers."],
      },
    },
    challenge: {
      title: "Run all four steps: a quiz leaderboard",
      brief: [
        "DevAtlas wants a global and per-school leaderboard for weekly quizzes: 500,000 learners, each submits up to 20 answers a week, the leaderboard page is viewed 2 million times a week with spikes at the Friday deadline. Write a one-page design doc following the four steps: use cases and constraints (with numbers), high-level design, core components (data model and how ranks are computed), and scaling (what breaks first and how you fix it).",
      ],
      criteria: ["All four steps present", "Numbers derived, not guessed", "At least two options compared for ranking", "Bottleneck named with a trigger"],
      hints: ["A Redis sorted set (ZADD, ZREVRANK, ZREVRANGE) gives O(log n) rank updates and reads.", "Per-school boards are just more sorted sets, one per school per week."],
      solution: {
        text: ["A model answer follows the method exactly. The key insight is that the numbers are small (about 17 writes per second on average) but the Friday spike and the 'what is my rank?' query are the real design drivers."],
        code: {
          lang: "markdown",
          file: "docs/design-leaderboard.md",
          code: `# Weekly quiz leaderboard: design

## 1. Use cases, constraints, assumptions
- Learner submits an answer; their weekly score updates within 2 seconds.
- Anyone views the global top 100 and the top 100 of their school.
- A learner sees their own rank ("you are #4,812 of 500,000").
- Out of scope: all-time boards, anti-cheat (separate design).

Numbers
- Writes: 500,000 x 20 / week = 10 million / week = ~17/s average. Friday last hour: assume 30% of the week's answers = 3 million in 3,600 s = ~830/s.
- Reads: 2 million views / week = ~3.3/s average; Friday spike ~200/s.
- Data: 500,000 learners x (id + score) ~ 16 bytes each in a sorted set = ~8 MB per board (plus overhead, under 100 MB in Redis even with 2,000 school boards).

## 2. High-level design
Browser -> API -> (1) PostgreSQL: answers table, source of truth
                  (2) Redis: sorted sets, one global + one per school per week
Leaderboard reads go only to Redis. A nightly job rebuilds Redis from PostgreSQL to fix drift.

## 3. Core components
Ranking options
| Option | Update | "My rank" | Verdict |
|---|---|---|---|
| SQL: ORDER BY score with RANK() | cheap | full scan or big index walk per request | fine below ~50k learners |
| Precompute ranks every 5 minutes | batch job | O(1) read, up to 5 min stale | acceptable but users complain "I just answered!" |
| Redis sorted set | ZINCRBY O(log n) | ZREVRANK O(log n) | **chosen**: fresh and cheap |

Keys: lb:{week}:global, lb:{week}:school:{schoolId}. Each answer -> one transaction in PostgreSQL, then ZINCRBY on both keys. Keys expire 8 weeks after the week ends.

## 4. Scale
- First bottleneck: the Friday spike of ~830 writes/s on PostgreSQL inserts. One primary handles this; if it grows 10x, batch inserts through a queue (6.3.11).
- Redis is single-threaded per instance; ~830 ZINCRBY/s is far below its limit (tens of thousands/s). Add a replica for reads and failover (6.3.4).
- Trigger to revisit: > 5,000 writes/s or > 10 million learners -> shard boards by school.`,
        },
      },
    },
    capstone: {
      title: "DevAtlas: a design-doc template and one filled-in design",
      brief: [
        "Add docs/design-template.md to your capstone repository with the four steps as sections, then fill a copy for one real feature of your capstone (for example AI tutor chat history or lesson progress sync). Include a numbers table and at least one trade-off table.",
      ],
      criteria: ["Template reusable for any feature", "Filled design has real numbers from your capstone's expected usage", "Trade-off table with a chosen option and the reason"],
      hints: ["Keep the template short; long templates are skipped."],
      solution: {
        text: [
          "A good template has prompts in each section so the author knows what to write, plus an 'Open questions' section so unknowns are visible instead of hidden. Fill it once for a real feature to check it works.",
        ],
        code: {
          lang: "markdown",
          file: "docs/design-template.md",
          code: `# <Feature>: design

Author · Reviewers · Status (draft / in review / approved) · Date

## 1. Use cases, constraints, assumptions
Use cases: who does what, in one line each.
Out of scope: what we are deliberately not doing now.
Numbers (show the maths):
| Quantity | Value | Source or assumption |
|---|---|---|
| Users (daily active) | | |
| Writes per second (avg / peak) | | |
| Reads per second (avg / peak) | | |
| Item size and retention | | |
| Storage after 1 and 3 years (with copies) | | |
| Latency target (p99) and availability target | | |

## 2. High-level design
One diagram. Trace each use case through it in one sentence.

## 3. Core components
API (endpoints, request/response), data model (tables or documents, keys, indexes),
key algorithm. For each, a table of options:
| Option | Pros | Cons | Verdict |
|---|---|---|---|

## 4. Scaling and failure
What breaks first (with the number that breaks it), the fix, and the trigger
for applying it. What happens when each dependency is down.

## 5. Open questions
## 6. Rollout and how we will know it works (metrics, alerts)`,
        },
        pitfalls: ["Filling the template after the code is written: it then documents decisions instead of making them."],
      },
    },
  },
  deeper: [
    { label: "System Design Primer: how to approach a design question (CC BY 4.0)", url: "https://github.com/donnemartin/system-design-primer#how-to-approach-a-system-design-interview-question" },
    { label: "System Design Primer: powers of two and latency numbers", url: "https://github.com/donnemartin/system-design-primer#appendix" },
    { label: "Latency numbers every programmer should know (gist)", url: "https://gist.github.com/jboner/2841832" },
    { label: "Design Docs at Google (Industrial Empathy)", url: "https://www.industrialempathy.com/posts/design-docs-at-google/" },
  ],
  nextPreview: "Next: performance vs scalability and latency vs throughput. How to tell a slow system from one that does not scale, and how to find the bottleneck with measurements instead of guesses.",
};
