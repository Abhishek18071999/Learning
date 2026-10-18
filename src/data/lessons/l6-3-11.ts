import type { Lesson } from "../../types";

export const lesson: Lesson = {
  id: "6.3.11",
  title: "Asynchronism: message queues, task queues and back pressure",
  minutes: 90,
  level: "Advanced",
  prerequisites: ["4.4.2 Idempotency, rate limiting, queues and caching", "6.3.3 Performance vs scalability, latency vs throughput"],
  summary: "Take slow work off the request path with message and task queues. Understand delivery guarantees (at-least-once), visibility timeouts, idempotent consumers, retries with backoff and jitter, dead-letter queues, the outbox pattern, back pressure with bounded queues, and how to size workers with Little's law.",
  terms: [
    { term: "Message queue", def: "A buffer that stores messages from producers until consumers process them (RabbitMQ, Amazon SQS, Azure Service Bus, Redis streams)." },
    { term: "Task queue", def: "A queue plus a worker framework that runs jobs (functions with arguments), with retries and scheduling (Celery, Sidekiq, Hangfire, BullMQ)." },
    { term: "At-least-once delivery", def: "Every message is delivered one or more times; duplicates are possible, so consumers must be idempotent." },
    { term: "Visibility timeout / ack", def: "A consumer must acknowledge a message within a time limit; otherwise the queue assumes it failed and delivers it again." },
    { term: "Dead-letter queue (DLQ)", def: "Where messages go after too many failed attempts, so one bad message cannot block or loop forever." },
    { term: "Back pressure", def: "Pushing back on producers when consumers cannot keep up (rejecting, slowing, or buffering with a limit) instead of letting queues grow without bound." },
    { term: "Idempotent consumer", def: "A consumer that produces the same result whether a message is processed once or several times." },
    { term: "Outbox pattern", def: "Writing an event to an 'outbox' table in the same database transaction as the business change, then publishing it from there, so the two never disagree." },
  ],
  problem: [
    "DevAtlas sign-up takes 6 seconds: it creates the account, sends a welcome email through a third-party API, generates a starter learning plan with an LLM, and posts to the analytics service. When the email provider is slow, sign-ups time out; when it is down, sign-ups fail completely, even though the account was already created.",
    "None of that extra work needs to finish before the learner sees 'Welcome!'. Moving it to a queue makes sign-up fast and resilient, but queues bring their own failure modes: duplicate emails, jobs lost on crashes, poison messages that retry forever, and queues that grow until the system falls over. This lesson covers both the benefits and the discipline that makes them safe.",
  ],
  concept: {
    analogy: [
      "A restaurant does not cook your meal while you stand at the till. The cashier takes the order, gives you a **ticket number** (HTTP 202 with a job id) and the order slip goes on the **kitchen rail** (the queue). Cooks (workers) take slips in order. If a cook drops a dish, the slip goes back on the rail (retry). If a slip says 'unicorn steak', after two attempts the head chef pins it on a **'problem orders' board** (dead-letter queue). And when the rail is full, the cashier stops taking new orders for a few minutes rather than promising food that cannot be cooked (**back pressure**).",
    ],
    precise: [
      "**When to go async.** Work that is slow, unreliable, or not needed for the immediate response: emails, notifications, image and video processing, report generation, LLM calls whose result can arrive later, syncing to other systems. Keep work synchronous when the user needs the result now or the calculation is cheap; a queue adds latency and moving parts.",
      "**Message queues vs logs.** Classic queues (RabbitMQ, SQS, Service Bus) deliver each message to one consumer and delete it after acknowledgement. Logs (Kafka, Kinesis, Redis Streams) keep an ordered, replayable record; consumers track their own offsets and several consumer groups can read the same data. Use a queue for jobs, a log for event streams with many readers or replay needs.",
      "**Delivery guarantees.** Practical systems give **at-least-once**: a message is redelivered if the consumer crashes or does not ack within the visibility timeout. 'Exactly-once' end to end is really at-least-once delivery plus idempotent processing (dedupe by message id, upserts, conditional writes).",
      "**Retries and DLQs.** Retry transient failures with **exponential backoff and jitter** (e.g. 1 s, 2 s, 4 s… randomised) so retries do not synchronise into waves. Cap attempts and move the message to a DLQ with the error attached; alert on DLQ depth and build a way to replay it after a fix.",
      "**Back pressure.** A queue absorbs bursts, but if the arrival rate stays above the processing rate, it grows forever and latency grows with it (Little's law: wait ≈ queue length ÷ throughput). Bound the queue, scale workers on queue depth or age of the oldest message, and when the limit is hit, reject new work early (HTTP 429/503 with Retry-After) rather than accept work you cannot do.",
      "**Outbox pattern.** 'Save the order, then publish OrderCreated' can fail in between, leaving an order without an event (or an event without an order). Instead, insert the event into an `outbox` table in the same transaction; a relay process publishes outbox rows and marks them sent. Publishing may duplicate, so consumers stay idempotent.",
    ],
  },
  underTheHood: {
    text: [
      "**What happens to one SQS-style message.** Producer sends → message stored redundantly → consumer receives it and it becomes invisible to others for the visibility timeout → consumer processes and deletes (acks). If the consumer crashes, the timeout passes, the message reappears and another consumer gets it: that is a duplicate by design. Long jobs must extend the timeout (heartbeat) or they will be processed twice in parallel.",
      "**Ordering.** Most queues do not guarantee strict order across consumers. If order matters per entity (all events of one learner), use FIFO queues with a message group id (SQS FIFO), session ids (Service Bus) or Kafka partitions keyed by entity id: order is kept within the group, while different groups are processed in parallel.",
      "**Sizing with Little's law.** Workers needed ≈ arrival rate × processing time ÷ target utilisation. If 50 thumbnails per second arrive and each takes 0.4 s, you need 20 busy workers on average; at 70% utilisation, about 29. A spike of 30,000 jobs drains at (workers ÷ processing time − arrival rate) jobs per second, which tells you how long users wait.",
    ],
    diagram: {
      title: "Async sign-up with a queue",
      nodes: [
        { label: "POST /signup", sub: "insert user + outbox row (1 tx)" },
        { label: "Outbox relay", sub: "publish, mark sent" },
        { label: "Queue", sub: "bounded, visibility timeout" },
        { label: "Workers ×N", sub: "idempotent, retries with backoff" },
        { label: "Dead-letter queue", sub: "after 5 attempts, alert" },
      ],
      edges: ["", "UserSignedUp", "receive", "give up"],
      caption: "The request returns in tens of milliseconds; email, plan generation and analytics happen in the background and can be retried safely.",
    },
  },
  handsOn: [
    {
      title: "Bounded vs unbounded queues during a spike",
      text: ["Workers can process 100 jobs per second. Traffic is 80/s, with a 60-second spike of 200/s. Compare an unbounded queue with one bounded at 2,000 jobs that rejects the excess (back pressure)."],
      code: {
        lang: "python",
        file: "backpressure.py",
        code: `CAPACITY = 100                                     # jobs/s the workers can do

def arrivals(t: int) -> int:
    return 200 if 60 <= t < 120 else 80            # spike between t=60 and t=120

def run(max_queue: int | None):
    queue = rejected = 0
    worst_wait = 0.0
    for t in range(300):
        incoming = arrivals(t)
        if max_queue is not None:
            accepted = min(incoming, max_queue - queue + CAPACITY)
            rejected += incoming - accepted
            incoming = accepted
        queue = max(0, queue + incoming - CAPACITY)
        worst_wait = max(worst_wait, queue / CAPACITY)   # Little's law: wait = backlog / throughput
    return worst_wait, rejected

for name, limit in (("unbounded", None), ("bounded 2,000", 2_000)):
    wait, rejected = run(limit)
    print(f"{name:14} worst wait {wait:5.1f} s   rejected {rejected:5d} jobs (told to retry later)")`,
      },
      output: "unbounded      worst wait  60.0 s   rejected     0 jobs (told to retry later)\nbounded 2,000  worst wait  20.0 s   rejected  4000 jobs (told to retry later)",
      notes: [
        "Unbounded, every job is eventually done but some wait a minute, which may be useless (a 'reset password' email that arrives after the link expired). Bounded, the queue caps waiting at 20 s and tells callers to retry later, which keeps the system predictable.",
        "Which is right depends on the job: analytics events can wait, user-facing jobs often should not.",
      ],
    },
    {
      title: "At-least-once delivery and an idempotent consumer",
      code: {
        lang: "python",
        file: "idempotent_consumer.py",
        code: `from collections import deque

queue = deque([{"id": "m1", "to": "asha@example.com"}, {"id": "m2", "to": "ben@example.com"}])
sent_emails: list[str] = []
processed_ids: set[str] = set()          # in production: a table with a unique constraint

def handle(msg, crash_before_ack=False, idempotent=True):
    if idempotent and msg["id"] in processed_ids:
        return "duplicate skipped"
    sent_emails.append(msg["to"])
    processed_ids.add(msg["id"])
    if crash_before_ack:
        queue.append(msg)                 # visibility timeout expires -> redelivered
        return "sent, then crashed before ack"
    return "sent and acked"

for idempotent in (False, True):
    queue = deque([{"id": "m1", "to": "asha@example.com"}, {"id": "m2", "to": "ben@example.com"}])
    sent_emails, processed_ids = [], set()
    first = True
    while queue:
        msg = queue.popleft()
        result = handle(msg, crash_before_ack=(msg["id"] == "m1" and first), idempotent=idempotent)
        first = first and msg["id"] != "m1"
    print(f"idempotent={idempotent}: emails sent {sent_emails}")`,
      },
      output: "idempotent=False: emails sent ['asha@example.com', 'ben@example.com', 'asha@example.com']\nidempotent=True: emails sent ['asha@example.com', 'ben@example.com']",
      notes: ["Make the dedupe record and the side effect atomic where possible (same database transaction), or use the provider's idempotency key (many email and payment APIs accept one) so the provider drops the duplicate for you."],
    },
    {
      title: "Retries with exponential backoff and full jitter",
      code: {
        lang: "python",
        file: "backoff.py",
        code: `import random

def backoff_delays(attempts: int, base: float = 1.0, cap: float = 60.0, seed: int = 3) -> list[float]:
    rng = random.Random(seed)
    return [round(rng.uniform(0, min(cap, base * 2 ** n)), 2) for n in range(attempts)]

print("no jitter:  ", [min(60.0, 1.0 * 2 ** n) for n in range(7)])
print("full jitter:", backoff_delays(7))`,
      },
      output: "no jitter:   [1.0, 2.0, 4.0, 8.0, 16.0, 32.0, 60.0]\nfull jitter: [0.24, 1.09, 1.48, 4.83, 10.01, 2.1, 0.79]",
      notes: ["Without jitter, 10,000 clients that failed at the same moment retry at the same moments too, hammering the recovering service in waves. Full jitter (a random delay between 0 and the exponential cap) spreads them out; it is the approach recommended in the AWS Architecture Blog post 'Exponential Backoff and Jitter'."],
    },
    {
      title: "A Celery task configured for real life",
      code: {
        lang: "python",
        file: "app/tasks.py",
        code: `import smtplib

from celery import Celery

app = Celery("devatlas", broker="amqp://guest:guest@rabbitmq:5672//")
app.conf.update(
    task_acks_late=True,               # ack after the task finishes, so a crash means redelivery
    task_reject_on_worker_lost=True,   # requeue if the worker process dies mid-task
    worker_prefetch_multiplier=1,      # do not hoard messages on one worker
    task_time_limit=60,                # hard kill a stuck task
)


@app.task(
    bind=True,
    autoretry_for=(smtplib.SMTPException, ConnectionError),
    retry_backoff=True,                # 1 s, 2 s, 4 s, ...
    retry_backoff_max=300,
    retry_jitter=True,
    max_retries=6,
)
def send_welcome_email(self, user_id: int, message_id: str) -> None:
    if already_sent(message_id):       # idempotency check against the database
        return
    deliver_email(user_id, idempotency_key=message_id)
    mark_sent(message_id)`,
      },
      notes: [
        "These are real Celery 5 settings; `already_sent`, `deliver_email` and `mark_sent` are your own functions. After `max_retries`, Celery raises the error; route failed tasks to a dead-letter exchange in RabbitMQ (x-dead-letter-exchange) or record them in a failures table for replay.",
        "In .NET the same ideas appear in Hangfire, MassTransit or Azure Service Bus with MaxDeliveryCount and built-in dead-lettering.",
      ],
    },
    {
      title: "The outbox table",
      code: {
        lang: "sql",
        file: "outbox.sql",
        code: `CREATE TABLE outbox (
    id           uuid        PRIMARY KEY,
    topic        text        NOT NULL,
    payload      jsonb       NOT NULL,
    created_at   timestamptz NOT NULL DEFAULT now(),
    published_at timestamptz
);
CREATE INDEX outbox_unpublished ON outbox (created_at) WHERE published_at IS NULL;

BEGIN;
INSERT INTO learners (id, email) VALUES (987, 'asha@example.com');
INSERT INTO outbox (id, topic, payload)
VALUES ('0192f0a4-5b7e-7c3d-9a10-3e5f6a7b8c9d', 'user.signed_up', '{"learner_id": 987}');
COMMIT;                                     -- both rows or neither

-- relay (runs every second; SKIP LOCKED lets several relays run safely)
SELECT id, topic, payload FROM outbox
WHERE published_at IS NULL ORDER BY created_at LIMIT 100
FOR UPDATE SKIP LOCKED;
-- publish each to the broker, then:
UPDATE outbox SET published_at = now() WHERE id = '0192f0a4-5b7e-7c3d-9a10-3e5f6a7b8c9d';`,
      },
      notes: ["Change data capture tools such as Debezium can read the outbox table from the database log instead of polling, which lowers latency and load."],
    },
  ],
  companies: [
    "**Request/response + 202 Accepted.** Long-running operations (video encoding, report exports, AI generation) commonly return 202 with a job id and a status URL, then notify via webhook, WebSocket or email when done. Azure and Google APIs document this as the long-running operation pattern.",
    "**Queues as shock absorbers.** E-commerce companies put order-processing pipelines behind queues so a flash sale fills the queue instead of crashing payment and warehouse systems; workers autoscale on queue depth (e.g. KEDA in Kubernetes, SQS-based scaling policies).",
    "**Outbox and CDC** are standard in microservice architectures to keep databases and event streams consistent; Debezium with Kafka is a widely used open-source combination.",
  ],
  mistakes: [
    { mistake: "Non-idempotent consumers", why: "Assuming each message arrives once", wrong: "Duplicate emails, double charges, double-counted points after redeliveries", fix: "Dedupe by message id, upserts, idempotency keys with external APIs" },
    { mistake: "Infinite retries without a DLQ", why: "Retrying feels safe", wrong: "A poison message loops forever, burning workers and hiding real errors", fix: "Cap attempts, dead-letter with the error, alert and provide replay" },
    { mistake: "Unbounded queues", why: "Queues seem free", wrong: "Backlog grows during long overloads; jobs are processed long after they are useful; memory or storage exhaustion", fix: "Bound queues, scale on depth/age, reject early with 429/503 + Retry-After" },
    { mistake: "Publishing events outside the database transaction", why: "Save then publish is the obvious code", wrong: "A crash between the two leaves systems disagreeing forever", fix: "Outbox pattern (or CDC)" },
    { mistake: "Ack before processing", why: "Default settings in some libraries", wrong: "A crash mid-task loses the job silently", fix: "Ack after success (acks_late), with visibility timeout longer than the task" },
    { mistake: "Retries without jitter", why: "Simple exponential backoff", wrong: "Synchronised retry waves keep a recovering service down", fix: "Exponential backoff with full jitter and a cap" },
  ],
  bestPractices: [
    { tag: "Reliability", text: "Assume at-least-once: idempotent consumers, acks after success, DLQ with alerting and a replay tool." },
    { tag: "Performance", text: "Return 202 with a job id for slow work; keep the request path to what the user needs right now." },
    { tag: "Reliability", text: "Bound every queue; autoscale workers on queue depth or age of the oldest message; shed load early." },
    { tag: "Maintainability", text: "Use the outbox pattern for events that must match database state; version message schemas." },
  ],
  interview: [
    { q: "When do you use a queue, and what problems does it introduce?", a: "For work that is slow, unreliable or not needed for the immediate response, and to absorb bursts. It introduces eventual completion (the user needs status or notifications), duplicates under at-least-once delivery, ordering questions, poison messages, monitoring of queue depth, and the need for back pressure when consumers fall behind." },
    { q: "How do you make message processing effectively exactly-once?", a: "Accept at-least-once delivery and make processing idempotent: record processed message ids in the same transaction as the side effect, use upserts or conditional writes, and pass idempotency keys to external APIs. On the publishing side, use the outbox pattern so events and database changes are committed together." },
    { q: "What is back pressure and how do you implement it?", a: "It is how a system pushes back when it cannot keep up, instead of buffering without limit. Implement with bounded queues, rejecting or slowing producers when full (HTTP 429/503 with Retry-After, blocking publishers), autoscaling consumers on queue depth, and clients that retry with exponential backoff and jitter." },
  ],
  quickCheck: [
    {
      kind: "mcq",
      prompt: "A worker crashes after sending an email but before acknowledging the message. What happens with an SQS-style queue?",
      options: ["The message is lost", "The message becomes visible again after the visibility timeout and is redelivered, so the email may be sent twice", "The queue deletes it automatically", "The producer resends it"],
      answer: 1,
      explanation: "That is at-least-once delivery; idempotency prevents the duplicate side effect.",
    },
    {
      kind: "output",
      prompt: "Jobs arrive at 50 per second and each takes 0.4 s of worker time. Ignoring headroom, how many workers are busy on average?",
      options: ["8", "20", "50", "125"],
      answer: 1,
      explanation: "Little's law: 50 × 0.4 = 20 jobs in progress at any moment.",
    },
    {
      kind: "bug",
      prompt: "One malformed message makes the consumer throw. Queue depth keeps growing and workers are at 100% CPU. What is missing?",
      options: ["More workers", "A maximum delivery count with a dead-letter queue", "A bigger queue", "Ordering guarantees"],
      answer: 1,
      explanation: "The poison message is retried forever; cap attempts and dead-letter it.",
    },
  ],
  cheatSheet: [
    "Async for slow, unreliable, non-immediate work; return 202 + job id.",
    "Queue (one consumer per message) vs log (replayable, many consumer groups).",
    "At-least-once → idempotent consumers; ack after success.",
    "Retries: exponential backoff + full jitter + cap; then DLQ.",
    "Bound queues; scale on depth/age; 429/503 + Retry-After when full.",
    "Workers ≈ rate × time ÷ utilisation (Little's law).",
    "Outbox: event row in the same transaction; relay publishes.",
    "Order per key: FIFO groups, sessions or Kafka partitions.",
  ],
  homework: {
    basic: {
      title: "Size the thumbnail workers",
      brief: [
        "Thumbnail jobs arrive at 50 per second on average and 150 per second for 10 minutes after a school uploads a class photo set. Each job takes 0.4 s. Compute: workers needed at 70% utilisation for the average, the backlog after the 10-minute peak if you keep that number of workers, and how long that backlog takes to drain once traffic returns to average.",
      ],
      criteria: ["Little's law applied", "Backlog computed from rate difference", "Drain time computed", "Recommendation"],
      hints: ["Throughput of W workers = W / 0.4 jobs per second."],
      solution: {
        text: ["29 workers handle the average comfortably (72.5 jobs/s capacity) but fall 77.5 jobs/s behind during the peak, building a backlog of 46,500 jobs that takes about 34 minutes to drain. Autoscaling on queue depth (to 86 workers during the peak) or accepting a 30-minute delay for thumbnails are both valid; the numbers make the trade-off explicit."],
        code: {
          lang: "python",
          file: "size_workers.py",
          code: `import math

job_s = 0.4
avg_rate, peak_rate, peak_minutes = 50, 150, 10
target_util = 0.7

workers = math.ceil(avg_rate * job_s / target_util)
capacity = workers / job_s
backlog = max(0, (peak_rate - capacity) * peak_minutes * 60)
drain_s = backlog / (capacity - avg_rate)
workers_for_peak = math.ceil(peak_rate * job_s / target_util)

print(f"workers for average at {target_util:.0%}: {workers} (capacity {capacity:.1f} jobs/s)")
print(f"backlog after the peak: {backlog:,.0f} jobs")
print(f"drain time after the peak: {drain_s / 60:.0f} min")
print(f"workers to keep up during the peak: {workers_for_peak}")`,
        },
        output: "workers for average at 70%: 29 (capacity 72.5 jobs/s)\nbacklog after the peak: 46,500 jobs\ndrain time after the peak: 34 min\nworkers to keep up during the peak: 86",
      },
    },
    intermediate: {
      title: "Retries and a dead-letter queue",
      brief: [
        "Simulate a consumer that processes 6 messages. Message 'm3' always fails (poison), 'm5' fails twice then succeeds (transient). Retry up to 4 attempts per message, then move to a DLQ with the last error. Print the processing log, the DLQ contents and the total attempts.",
      ],
      criteria: ["Attempt counter per message", "Transient failure eventually succeeds", "Poison message ends in DLQ with its error", "Other messages are not blocked"],
      hints: ["Requeue failed messages at the back so they do not block others."],
      solution: {
        text: ["The transient failure recovers on its third attempt; the poison message is dead-lettered after four, and the other messages are never blocked because failed messages go to the back of the queue. In production you would also delay retries (backoff) rather than requeueing immediately."],
        code: {
          lang: "python",
          file: "dlq.py",
          code: `from collections import deque

MAX_ATTEMPTS = 4
failures_left = {"m5": 2}                       # transient: fails twice

def process(msg_id: str) -> None:
    if msg_id == "m3":
        raise ValueError("payload missing learner_id")
    if failures_left.get(msg_id, 0) > 0:
        failures_left[msg_id] -= 1
        raise TimeoutError("email provider timeout")

queue = deque((f"m{i}", 1) for i in range(1, 7))
dlq, attempts_total = [], 0
while queue:
    msg, attempt = queue.popleft()
    attempts_total += 1
    try:
        process(msg)
        print(f"{msg} ok (attempt {attempt})")
    except Exception as err:
        if attempt >= MAX_ATTEMPTS:
            dlq.append((msg, repr(err)))
            print(f"{msg} -> DLQ after {attempt} attempts")
        else:
            queue.append((msg, attempt + 1))   # real systems: delay with backoff
print("DLQ:", dlq)
print("total attempts:", attempts_total)`,
        },
        output: "m1 ok (attempt 1)\nm2 ok (attempt 1)\nm4 ok (attempt 1)\nm6 ok (attempt 1)\nm5 ok (attempt 3)\nm3 -> DLQ after 4 attempts\nDLQ: [('m3', \"ValueError('payload missing learner_id')\")]\ntotal attempts: 11",
      },
    },
    challenge: {
      title: "Outbox relay with a crash, end to end",
      brief: [
        "Simulate the outbox pattern: a transaction inserts a learner and an outbox row; a relay publishes unpublished rows to a broker and then marks them published. Make the relay crash after publishing but before marking, restart it, and show that the event is published twice but the idempotent consumer applies it once.",
      ],
      criteria: ["Business row and outbox row written atomically", "Crash between publish and mark", "Duplicate on the broker", "Consumer dedupes by event id"],
      hints: ["The crash is the reason the consumer must be idempotent even with an outbox."],
      solution: {
        text: ["The outbox guarantees 'no event lost and no event without its data', but not 'no duplicates': the relay can always crash between publishing and recording that it published. Deduplication by event id at the consumer completes the guarantee."],
        code: {
          lang: "python",
          file: "outbox_sim.py",
          code: `import uuid

db = {"learners": {}, "outbox": []}
broker: list[dict] = []
consumer_seen: set[str] = set()
welcome_emails: list[int] = []

def sign_up(learner_id: int, email: str) -> None:
    # one transaction: both inserts commit together
    db["learners"][learner_id] = email
    db["outbox"].append({"id": str(uuid.UUID(int=learner_id)), "topic": "user.signed_up",
                         "payload": {"learner_id": learner_id}, "published": False})

def relay(crash_after_publish: bool = False) -> None:
    for row in db["outbox"]:
        if row["published"]:
            continue
        broker.append({"id": row["id"], "payload": row["payload"]})
        if crash_after_publish:
            print("relay: crashed after publishing", row["id"][-4:])
            return
        row["published"] = True

def consume() -> None:
    for event in broker:
        if event["id"] in consumer_seen:
            print("consumer: duplicate", event["id"][-4:], "skipped")
            continue
        consumer_seen.add(event["id"])
        welcome_emails.append(event["payload"]["learner_id"])

sign_up(987, "asha@example.com")
relay(crash_after_publish=True)
relay()                                   # restarted relay publishes again
consume()
print("events on broker:", len(broker), "| welcome emails sent:", welcome_emails)`,
        },
        output: "relay: crashed after publishing 03db\nconsumer: duplicate 03db skipped\nevents on broker: 2 | welcome emails sent: [987]",
      },
    },
    capstone: {
      title: "DevAtlas: move slow work off the request path",
      brief: [
        "In your capstone, move at least one slow side effect (welcome email, AI-generated study plan, certificate PDF) to a background worker. Requirements: the endpoint returns 202 with a job id and a status URL; the job is idempotent; retries with backoff and jitter; failures after N attempts go to a DLQ or failures table; a metric or log for queue depth; and a test that runs the job twice and asserts a single side effect.",
      ],
      criteria: ["202 + status endpoint", "Idempotent job with a test", "Bounded retries with backoff", "Dead-letter handling", "Queue depth visible"],
      hints: ["Celery + RabbitMQ or Redis for Python; Hangfire or MassTransit for .NET; BullMQ for Node.", "Use the job id as the idempotency key."],
      solution: {
        text: [
          "The endpoint stores a job row and enqueues; the worker updates the row's status. The status endpoint reads the row, so the client can poll (or receive a WebSocket/SSE push). The idempotency test simply calls the task function twice with the same job id.",
        ],
        code: {
          lang: "markdown",
          file: "docs/background-jobs.md",
          code: `# Background jobs: study plan generation

## API
POST /v1/study-plans            -> 202 {"job_id": "0192...", "status_url": "/v1/jobs/0192..."}
GET  /v1/jobs/{job_id}          -> {"status": "queued|running|done|failed", "result_url": ...}

## Flow
1. Endpoint: INSERT jobs(id, learner_id, kind, status='queued') + outbox row, one transaction.
2. Relay publishes to queue "study-plans" (RabbitMQ, quorum queue, max length 10,000,
   overflow=reject-publish -> endpoint returns 503 + Retry-After: 30).
3. Worker (Celery, acks_late, prefetch 1):
   - if jobs.status == 'done': return            # idempotent
   - status='running'; call LLM with idempotency key = job_id; store plan; status='done'
   - retry on timeouts/429: backoff 2^n s, full jitter, max 5 attempts
   - after 5 attempts: status='failed', message to DLQ "study-plans.dlq", alert
4. Client polls status_url every 2 s (or listens on SSE /v1/jobs/{id}/events).

## Operations
- Metrics: queue depth, age of oldest message, job duration p95, DLQ depth (alert > 0).
- Scaling: KEDA ScaledObject on RabbitMQ queue length, 1-20 workers.
- Replay: \`python -m app.jobs replay --queue study-plans.dlq --since 2026-10-18\`.

## Test
test_generate_plan_is_idempotent: run task twice with the same job_id
-> exactly one plan row, LLM client called once.`,
        },
        pitfalls: ["Polling too fast from many clients becomes its own load problem; use a sensible interval or push updates.", "Jobs that hold database transactions open while calling an LLM: commit before slow external calls."],
      },
    },
  },
  deeper: [
    { label: "System Design Primer: asynchronism (CC BY 4.0)", url: "https://github.com/donnemartin/system-design-primer#asynchronism" },
    { label: "AWS Architecture Blog: Exponential Backoff and Jitter", url: "https://aws.amazon.com/blogs/architecture/exponential-backoff-and-jitter/" },
    { label: "Microservices.io: Transactional outbox", url: "https://microservices.io/patterns/data/transactional-outbox.html" },
    { label: "Amazon SQS: visibility timeout", url: "https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-visibility-timeout.html" },
  ],
  nextPreview: "Next: communication between services. TCP vs UDP, RPC vs REST, and the timeouts, retries and deadlines that keep one slow service from taking down all the others.",
};
