import type { Lesson } from "../../types";

export const lesson: Lesson = {
  id: "1.5.1",
  title: "How to test software: the pyramid, doubles and testable design",
  minutes: 80,
  level: "Intermediate",
  prerequisites: ["1.1.1 Python essentials: data model, functions and type hints", "1.1.4 Testing with pytest", "0.3.2 Team workflow: pull requests and code review"],
  summary: "Choose the right level for each test, replace slow dependencies with the right double, and design seams so logic can be tested without a browser or a database.",
  terms: [
    { term: "Unit test", def: "A test of one function or class with its slow dependencies replaced. Runs in milliseconds and points at the exact behaviour that broke." },
    { term: "Integration test", def: "A test of your code against a real boundary such as a database, HTTP service, queue or filesystem. Catches SQL, serialization and wiring mistakes that unit tests cannot see." },
    { term: "End-to-end (E2E) test", def: "A test that drives the deployed system through a user journey, from the browser or public API to the database. Highest confidence, slowest and flakiest." },
    { term: "Test double", def: "Any object that stands in for a real dependency during a test, like a stunt double. Stub, fake, spy and mock are kinds of double." },
    { term: "Fake", def: "A working implementation with a shortcut, such as an in-memory store instead of PostgreSQL. It behaves like the real thing but is not production-grade." },
    { term: "Seam", def: "A place where a dependency can be swapped without editing the code under test, usually a constructor parameter or function argument." },
    { term: "Flaky test", def: "A test that passes and fails on the same code, usually because of time, test order, randomness, the network or shared state." },
  ],
  problem: [
    "DevAtlas has two test suites and neither is trusted. The web team keeps 400 Selenium tests that drive a real browser through every lesson page. The suite takes 50 minutes, about one run in five is red for no code change, and the standing advice is to rerun it. Meanwhile two real bugs shipped: the news ingester saved the same article twice when two feeds overlapped, and the progress API overwrote a learner's 80% with an older 40% event.",
    "The other team has the opposite problem: almost no tests, because every test they tried needed a database, a clock and a network call. The pytest lesson taught fixtures and parametrize, but not the decisions that make a suite useful: which level a behaviour belongs to, when to replace a dependency, and how to shape the code so a test is cheap to write. That is this lesson.",
  ],
  concept: {
    analogy: [
      "A restaurant kitchen. Unit tests are tasting each sauce in the prep kitchen: fast, precise, and you know exactly which batch is wrong. Integration tests are checking that the sauce meets the pasta on the line without burning. End-to-end tests are a customer eating the whole meal. All three matter, but if the sauce is salty you do not want to discover it by serving fifty tables.",
      "Test doubles are stunt doubles. A stunt double takes the dangerous jump the actor should not attempt (the payment API, the clock). A stand-in follows blocking marks and writes them down, like a spy. A director with a checklist confirms the actor hit the exact mark, like a mock. You do not hire a stunt double for a scene where the actor just stands there: pure logic needs no double at all.",
    ],
    precise: [
      "**The shape follows the cost of feedback.** Write many unit tests, fewer integration tests and very few end-to-end tests. Unit tests catch branching logic, edge cases and arithmetic in milliseconds. Integration tests catch the assumptions your code makes about SQL, JSON, queues and framework wiring. End-to-end tests catch broken deploys, routing and cross-service flows. The pyramid is a rule of thumb, not a law; what matters is that most failures are found by the cheapest test that can see them.",
      "**Arrange, act, assert.** Each test has three visibly separate parts: set up inputs and doubles; call the behaviour once; assert the observable result. One behaviour per test, and a name that states the behaviour, such as `test_second_save_updates_the_same_row`. If a test needs five lines of setup and two acts, it is usually testing two things.",
      "**Each double answers a different question.** A stub supplies canned answers: what happens when the feed returns an old article? A fake is a working shortcut: does deduplication work against a store that behaves like a set? A spy records what happened: which articles were saved? A mock is pre-programmed with expectations: was `save` called exactly once with this article? Prefer stubs and fakes for state-based tests; reserve mocks for boundaries where the interaction itself is the contract. A suite that mocks everything tests the mocks, not the system.",
      "**Testable design is seams plus injection.** Pass the clock, the feed client and the repository into the object instead of constructing them inside. Keep the decision logic in pure functions where possible, and push I/O to the edges. Then TDD becomes practical: red (a test that fails for the right reason), green (the simplest implementation), refactor (change structure while green). If a test is painful to set up, that pain is design feedback, not a reason to skip the test.",
    ],
  },
  underTheHood: {
    text: [
      "**The arithmetic of a slow suite.** Two thousand unit tests at 5 ms each take 10 seconds. One hundred end-to-end tests at 30 seconds each take 50 minutes, before anyone debugs a failure. Add a test that fails 2% of the time by accident: the chance that at least one of those hundred fails on a given run is about 87%, so the suite is red most of the time even when the code is fine. Feedback that slow stops being feedback.",
      "**Why E2E tests flake, and how to spot one.** Real networks, animation timing, time zones, shared database rows, leftovers from earlier tests and unseeded randomness all make the same code produce different results. Symptoms: passes locally and fails in CI, passes alone and fails in the full run, fails only near midnight, or the same commit is green and then red. Detect flakes by running new tests 20 to 50 times and in random order, and by logging the time and random seed. Quarantine a flake with an owner and a deadline; never make rerunning the suite part of the process.",
      "**TDD is a design loop, not a coverage trick.** Red: a test that fails for the right reason, so you know it can detect the bug. Green: the simplest implementation that passes, even if it is embarrassing. Refactor: improve names and structure with the tests as a safety net. The first test is a specification, and the moment setup becomes awkward it is telling you a seam is missing: the clock is read inside the function, the client is a module-level singleton, or the query is welded to the business rule.",
      "**Coverage measures execution, not verification.** A test with no assertions can execute every line and prove nothing. Line coverage misses branches; branch coverage is better but still blind to weak assertions. Mutation testing changes the code and checks that a test fails, which measures the assertions themselves. Use coverage to find risky untested code, set floors for critical modules, and never reward a percentage on its own. The same warning appears in Google's software engineering book: it is easy to exercise many lines with a few tests without checking that the lines do the right thing.",
    ],
    diagram: {
      title: "Where each test level catches the bug",
      nodes: [
        { label: "Unit", sub: "pure logic, milliseconds" },
        { label: "Integration", sub: "real DB or fake HTTP" },
        { label: "End-to-end", sub: "browser or public API" },
        { label: "Production", sub: "monitoring and canaries" },
      ],
      edges: ["branch and edge cases", "SQL, JSON, wiring", "deploy and routing"],
      caption: "Push each behaviour as far down this chain as it can be proven. The higher levels stay small enough to stay trustworthy.",
    },
  },
  handsOn: [
    {
      title: "Unit-test the ingester with a stub, a fake, a spy and a mock",
      text: [
        "The ingester takes its feed, store and clock through the constructor, which is the seam that makes all four doubles possible. Read the test names as questions: the stub asks what happens with this feed, the fake asks whether deduplication works, the fake also acts as a spy for what was saved, and the mock asserts the exact interaction.",
        "Save as `test_ingest_unit.py` and run `python -m pytest test_ingest_unit.py -q` with pytest installed. The same five tests take a few hundredths of a second because no network, database or system clock is involved.",
      ],
      code: { lang: "python", file: "test_ingest_unit.py", code: `from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from unittest.mock import Mock

@dataclass(frozen=True)
class Article:
    url: str
    title: str
    published: datetime | None

class Feed:
    def fetch(self, topic: str) -> list[Article]:
        raise NotImplementedError

class Store:
    def save(self, article: Article) -> bool:
        raise NotImplementedError

class NewsIngester:
    def __init__(self, feed: Feed, store: Store, now):
        self.feed = feed
        self.store = store
        self.now = now

    def ingest(self, topic: str, max_age_days: int = 7) -> list[str]:
        cutoff = self.now() - timedelta(days=max_age_days)
        saved = []
        for article in self.feed.fetch(topic):
            if article.published is None or article.published >= cutoff:
                if self.store.save(article):
                    saved.append(article.url)
        return saved

class StubFeed(Feed):
    def __init__(self, articles):
        self.articles = articles

    def fetch(self, topic):
        return self.articles

class FakeStore(Store):
    def __init__(self):
        self.rows = {}

    def save(self, article):
        if article.url in self.rows:
            return False
        self.rows[article.url] = article
        return True

NOW = datetime(2026, 10, 22, 12, 0, tzinfo=timezone.utc)
FRESH = Article("https://example.com/a", "Fresh", NOW - timedelta(hours=1))
OLD = Article("https://example.com/b", "Old", NOW - timedelta(days=30))

def test_stub_feed_supplies_canned_articles():
    ingester = NewsIngester(StubFeed([FRESH]), FakeStore(), lambda: NOW)
    assert ingester.ingest("python") == [FRESH.url]

def test_fake_store_dedupes_across_runs():
    store = FakeStore()
    ingester = NewsIngester(StubFeed([FRESH]), store, lambda: NOW)
    assert ingester.ingest("python") == [FRESH.url]
    assert ingester.ingest("python") == []
    assert len(store.rows) == 1

def test_fake_store_is_a_spy_on_what_was_saved():
    store = FakeStore()
    ingester = NewsIngester(StubFeed([FRESH, OLD]), store, lambda: NOW)
    ingester.ingest("python")
    assert list(store.rows) == [FRESH.url]

def test_mock_verifies_the_interaction():
    store = Mock(spec=Store)
    store.save.return_value = True
    NewsIngester(StubFeed([FRESH]), store, lambda: NOW).ingest("python")
    store.save.assert_called_once_with(FRESH)

def test_injected_clock_drops_old_articles():
    ingester = NewsIngester(StubFeed([OLD]), FakeStore(), lambda: NOW)
    assert ingester.ingest("python", max_age_days=7) == []` },
      output: ".....                                                                    [100%]\n5 passed in 0.04s",
      notes: [
        "The mock test is the only interaction test, and it exists because `save` returning False is the contract for duplicates. If you moved deduplication into the store, the fake and the mock would both need rewriting.",
        "The injected `now` is why the old-article test never depends on the day you run it. A direct `datetime.now()` call would make this test fail in a year, or pass for the wrong reason.",
      ],
    },
    {
      title: "Integration-test the progress repository against a real SQLite database",
      text: [
        "Unit tests cannot prove that an upsert is spelled correctly or that a CHECK constraint exists. This test uses a real SQLite file in pytest's `tmp_path`, so every test gets a fresh database. The same five behaviours would run against PostgreSQL in CI with the production engine.",
      ],
      code: { lang: "python", file: "test_progress_integration.py", code: `import sqlite3

import pytest

SCHEMA = """
CREATE TABLE progress (
    learner_id TEXT NOT NULL,
    lesson_id  TEXT NOT NULL,
    percent    INTEGER NOT NULL CHECK (percent BETWEEN 0 AND 100),
    updated_at TEXT NOT NULL,
    PRIMARY KEY (learner_id, lesson_id)
);
"""

class ProgressRepo:
    def __init__(self, conn: sqlite3.Connection):
        self.conn = conn

    def save(self, learner_id, lesson_id, percent, at):
        self.conn.execute(
            """INSERT INTO progress (learner_id, lesson_id, percent, updated_at)
               VALUES (?, ?, ?, ?)
               ON CONFLICT (learner_id, lesson_id) DO UPDATE
               SET percent = excluded.percent, updated_at = excluded.updated_at
               WHERE excluded.updated_at > progress.updated_at""",
            (learner_id, lesson_id, percent, at),
        )
        self.conn.commit()

    def get(self, learner_id, lesson_id):
        row = self.conn.execute(
            "SELECT percent FROM progress WHERE learner_id = ? AND lesson_id = ?",
            (learner_id, lesson_id),
        ).fetchone()
        return row[0] if row else None

    def completed(self, learner_id):
        rows = self.conn.execute(
            """SELECT lesson_id FROM progress
               WHERE learner_id = ? AND percent = 100 ORDER BY lesson_id""",
            (learner_id,),
        ).fetchall()
        return [r[0] for r in rows]

@pytest.fixture
def repo(tmp_path):
    conn = sqlite3.connect(tmp_path / "progress.db")
    conn.executescript(SCHEMA)
    yield ProgressRepo(conn)
    conn.close()

def test_saves_and_reads_progress(repo):
    repo.save("asha", "6.4.2", 40, "2026-10-22T10:00:00Z")
    assert repo.get("asha", "6.4.2") == 40

def test_second_save_updates_the_same_row(repo):
    repo.save("asha", "6.4.2", 40, "2026-10-22T10:00:00Z")
    repo.save("asha", "6.4.2", 100, "2026-10-22T10:05:00Z")
    assert repo.get("asha", "6.4.2") == 100
    assert repo.conn.execute("SELECT COUNT(*) FROM progress").fetchone()[0] == 1

def test_older_event_does_not_overwrite_newer_progress(repo):
    repo.save("asha", "6.4.2", 80, "2026-10-22T10:05:00Z")
    repo.save("asha", "6.4.2", 40, "2026-10-22T10:00:00Z")
    assert repo.get("asha", "6.4.2") == 80

def test_completed_lists_only_finished_lessons(repo):
    repo.save("asha", "6.4.2", 100, "2026-10-22T10:00:00Z")
    repo.save("asha", "1.1.4", 55, "2026-10-22T10:05:00Z")
    repo.save("asha", "0.3.2", 100, "2026-10-22T10:10:00Z")
    assert repo.completed("asha") == ["0.3.2", "6.4.2"]

def test_database_rejects_percent_above_100(repo):
    with pytest.raises(sqlite3.IntegrityError):
        repo.save("asha", "6.4.2", 101, "2026-10-22T10:00:00Z")` },
      output: ".....                                                                    [100%]\n5 passed in 0.09s",
      notes: [
        "The last test only passes because the constraint is in the schema. No amount of unit testing a Python validation function would prove that the deployed table has it.",
        "`tmp_path` is the seam at the filesystem level: each test owns a database file, so tests cannot see each other's rows and can run in any order.",
      ],
    },
    {
      title: "Run one red-green-refactor cycle",
      text: [
        "This script prints the cycle instead of hiding it in a test runner. Run it with `python tdd_cycle.py`. Notice that the first failure is a real assertion about behaviour, not an import error: a test that fails because the module is missing proves nothing yet.",
      ],
      code: { lang: "python", file: "tdd_cycle.py", code: `"""One TDD cycle, printed: red, green, red, green, then a refactor-safety check."""
from datetime import date, timedelta

TODAY = date(2026, 10, 22)

def streak_v1(study_dates):
    return 0

def streak_v2(study_dates):
    return len(set(study_dates))

def streak_v3(study_dates, today=TODAY):
    days = set(study_dates)
    count = 0
    while today - timedelta(days=count) in days:
        count += 1
    return count

def test_counts_consecutive_days(fn):
    days = [TODAY - timedelta(days=i) for i in range(3)]
    result = fn(days)
    assert result == 3, f"expected 3, got {result}"

def test_stops_at_a_gap(fn):
    days = [TODAY, TODAY - timedelta(days=1), TODAY - timedelta(days=3)]
    result = fn(days)
    assert result == 2, f"expected 2, got {result}"

def test_duplicate_days_count_once(fn):
    days = [TODAY, TODAY, TODAY - timedelta(days=1)]
    result = fn(days)
    assert result == 2, f"expected 2, got {result}"

def check(name, fn, test):
    try:
        test(fn)
    except AssertionError as exc:
        print(f"RED   {name}: {exc}")
        return
    print(f"GREEN {name}")

print("cycle 1: write the first test against the simplest implementation")
check("counts consecutive days", streak_v1, test_counts_consecutive_days)

print("cycle 2: make it pass with the simplest thing that could work")
check("counts consecutive days", streak_v2, test_counts_consecutive_days)

print("cycle 3: add the gap case before changing the code")
check("stops at a gap", streak_v2, test_stops_at_a_gap)

print("cycle 4: fix the implementation")
check("stops at a gap", streak_v3, test_stops_at_a_gap)

print("refactor check: both tests still protect the new code")
check("counts consecutive days", streak_v3, test_counts_consecutive_days)
check("duplicate days count once", streak_v3, test_duplicate_days_count_once)` },
      output: "cycle 1: write the first test against the simplest implementation\nRED   counts consecutive days: expected 3, got 0\ncycle 2: make it pass with the simplest thing that could work\nGREEN counts consecutive days\ncycle 3: add the gap case before changing the code\nRED   stops at a gap: expected 2, got 3\ncycle 4: fix the implementation\nGREEN stops at a gap\nrefactor check: both tests still protect the new code\nGREEN counts consecutive days\nGREEN duplicate days count once",
      notes: [
        "The naive `len(set(dates))` is a legitimate green step for the first test and fails the second. That failure is the specification for the gap, written before the fix.",
        "No refactor step prints anything here: refactoring is verified by the existing tests staying green, not by new output.",
      ],
    },
    {
      title: "Choose the lowest level that can catch the bug",
      text: [
        "Ask what has to be true for the bug to appear. If the bug is in a branch, an edge case or arithmetic, a unit test can see it, so write one there. If the bug depends on a real database, JSON shape, queue or framework wiring, only an integration test can see it; a unit test with a fake will happily confirm the fake. If the bug only appears when a request crosses routing, auth and the browser, an end-to-end test earns its cost, but one for the critical path is usually enough.",
        "A useful default: every new branch gets a unit test; every new query, serializer or external client gets one integration test; every release gets a handful of smoke E2E tests on the paths that make money or lose data. When a bug escapes, add a test at the lowest level that would have caught it and ask why no test at that level existed.",
        "Do not duplicate the same assertion at three levels. If a unit test proves the discount calculation and an integration test proves the endpoint returns it, an E2E test asserting the discount again adds runtime, not information. Use the higher level for what the lower level cannot see.",
      ],
    },
    {
      title: "Draw the decision as a flowchart",
      text: [
        "The flowchart is a quick review aid: follow a new behaviour from the top and stop at the first level that can prove it. Tag the slow levels so CI can run the fast ones on every commit.",
      ],
      code: { lang: "mermaid", file: "test-levels.mmd", code: `flowchart TD
    A[New behaviour or escaped bug] --> B{Logic with no I/O?}
    B -- yes --> C[Unit test with a stub or no double]
    B -- no --> D{Does your code touch a real boundary?}
    D -- yes --> E[Integration test: real DB or local fake server]
    D -- no --> F{Only a full user journey proves it?}
    F -- yes --> G[One E2E test for a critical path]
    F -- no --> C
    G --> H[Tag slow, keep few, quarantine flakes]` },
      notes: [
        "If you cannot answer yes at any branch, the behaviour may not be specified yet; write the example down as a failing test before choosing a level.",
      ],
    },
  ],
  companies: [
    "**Google (2015):** its testing blog recommends a 70/20/10 split of unit, integration and end-to-end tests, warns against the inverted ice-cream cone, and documents a team whose end-to-end-heavy suite was slowed by partner and lab failures and whose failing tests were painful to diagnose, [source](https://testing.googleblog.com/2015/04/just-say-no-to-more-end-to-end-tests.html).",
    "**GitHub (2016):** built Scientist to run a rewritten code path as a candidate alongside the original control on production data, randomizing execution order and comparing results; it was used for a multi-year permissions rewrite, a code-search cluster switch and query optimization, [source](https://github.blog/2016-03-10-scientist/).",
    "**Netflix (2010s):** open-sourced Chaos Monkey, a resiliency tool that randomly terminates virtual machine instances and containers in production so engineers build services that tolerate failure, testing failure handling where a staging end-to-end suite cannot, [source](https://github.com/Netflix/chaosmonkey).",
  ],
  mistakes: [
    { mistake: "Testing implementation details", why: "It feels precise to assert that helper A called helper B", wrong: "Every refactor breaks a dozen tests, so the team stops refactoring and the tests become the specification of yesterday's code", fix: "Assert observable behaviour through the public seam; test the private helper by moving it to its own function or class if it is complex" },
    { mistake: "Mocking everything", why: "Mocks make tests fast and isolated", wrong: "The mock returns the JSON shape the test author imagined, the real service returns something else, and the suite is green while production is broken", fix: "Use fakes and stubs for state, keep a contract or integration test against the real shape, and mock only interactions that are the contract" },
    { mistake: "Chasing 100% coverage", why: "A high number looks like quality", wrong: "Tests without assertions, getters tested for the sake of the report, and critical error paths still unverified; the number goes up while confidence does not", fix: "Set floors per critical module, review the uncovered lines, and measure assertion strength with mutation testing where it matters" },
    { mistake: "Rerunning flaky tests", why: "It is faster than debugging", wrong: "A real race or leaked state stays in the suite, engineers stop believing failures, and one day the same class of bug reaches production", fix: "Quarantine with an owner and a deadline, reproduce with repeated runs and random order, fix the source (clock, seed, shared state) and remove the rerun habit" },
    { mistake: "Writing an end-to-end test for every rule", why: "It is the closest thing to a real user", wrong: "The suite takes an hour, fails for unrelated reasons, and a single UI change breaks fifty tests that had nothing to do with the change", fix: "Cover each rule once at the cheapest level that can see it; keep E2E for a few critical journeys" },
  ],
  bestPractices: [
    { tag: "Reliability", text: "Treat a flaky test as a production bug in the test suite: quarantine it, assign an owner, and fail the build on new flakes instead of normalizing reruns." },
    { tag: "Maintainability", text: "One behaviour per test, arrange-act-assert, and a name that states the behaviour. A failing test should tell you what broke without opening the debugger." },
    { tag: "Performance", text: "Keep the unit suite in seconds and run it on every save or commit; run integration tests on every pull request and E2E tests nightly or before release." },
    { tag: "Security", text: "Test authorization at the integration level with a real query: a unit test over a fake repository cannot prove that a learner's `WHERE` clause scopes rows to that learner." },
  ],
  interview: [
    { q: "Explain the test pyramid and why you would not test everything end to end.", a: "Many unit tests, fewer integration tests, very few end-to-end tests. The pyramid follows the cost of feedback: a unit test gives a precise failure in milliseconds, an integration test catches SQL and wiring in around a tenth of a second, and an end-to-end test proves a real journey but takes seconds and flakes for reasons unrelated to the change. An E2E-heavy suite is slow to run and slow to diagnose, so most rules are proven at the lowest level that can see them, and E2E is reserved for critical paths and deploy confidence." },
    { q: "What is the difference between a stub, a fake, a spy and a mock, and when do you use each?", a: "A stub returns canned answers to drive a branch. A fake is a working lightweight implementation, such as an in-memory repository. A spy is a stub that also records calls so you can assert what happened. A mock is pre-programmed with expectations and fails if the interaction differs. I use stubs and fakes by default because state-based tests survive refactors, a spy when the side effect is the point, and a mock only where the call itself is the contract, such as a payment authorization or an email send." },
    { q: "A test is flaky in CI but passes locally. How do you debug it?", a: "Reproduce first: run the test repeatedly and in random order in an environment close to CI, and log the timestamp, random seed and database state. Common causes are real time, unseeded randomness, test order and shared module state, async waits, and data left by another test. I would bisect by running the test alone, then with the file, then with the suite, and inspect fixtures and globals. The fix is to inject a clock or seed, create isolated state per test, and replace sleeps with deterministic synchronization. Until fixed, quarantine it with an owner so it cannot erode trust in the suite." },
  ],
  quickCheck: [
    {
      kind: "mcq",
      prompt: "The news ingester calls a paid summarization API. You need a test where the API returns HTTP 429 so you can check the retry and backoff logic. Which double fits best?",
      options: ["A stub that returns a 429 response", "A fake that stores summaries in memory", "A spy that records how many calls were made", "The real API with a staging key"],
      answer: 0,
      explanation: "You need a canned answer to drive the retry branch, which is exactly a stub. A fake is for a working lightweight implementation, a spy observes calls, and the real API is slow, costs money and cannot reliably produce a 429.",
    },
    {
      kind: "output",
      prompt: "What does this program print?",
      code: { lang: "python", file: "streak.py", code: `from datetime import date, timedelta

def streak(days, today):
    n = 0
    while today - timedelta(days=n) in days:
        n += 1
    return n

days = {date(2026, 10, 22), date(2026, 10, 21), date(2026, 10, 19)}
print(streak(days, date(2026, 10, 22)))` },
      options: ["0", "1", "2", "4"],
      answer: 2,
      explanation: "The count walks back from 22 October: the 22nd and 21st are present, the 20th is missing, so the loop stops at 2. The 19th does not count because the streak is broken.",
    },
    {
      kind: "bug",
      prompt: "A test passes when run alone but fails when the whole file runs. It uses a module-level `CACHE` dict, and a later test asserts the loader was called. What is the most likely cause?",
      options: ["The production code is too slow", "Shared mutable state leaks between tests", "The coverage percentage is below the gate", "The test double returns random values"],
      answer: 1,
      explanation: "An earlier test filled the module-level cache, so the later test no longer exercises the loader. Each test passes in isolation because it starts with an empty cache. Inject a fresh cache or reset it in a fixture.",
    },
  ],
  cheatSheet: [
    "Pyramid: many unit, fewer integration, very few E2E; cost and flakiness grow as you go up.",
    "Unit test = logic with doubles; integration = real boundary; E2E = real journey.",
    "Arrange, act, assert: one behaviour, one act, one clear assertion.",
    "Stub supplies answers, fake works with shortcuts, spy records calls, mock expects interactions.",
    "Prefer state-based tests with stubs and fakes; mock only when the interaction is the contract.",
    "Seams: inject the clock, client and repository through the constructor or arguments.",
    "TDD: red for the right reason, green with the simplest code, refactor while green.",
    "Flake symptoms: passes alone, fails in suite; passes locally, fails in CI; same commit changes colour.",
    "Coverage shows execution, not verification; set floors per critical module, not one vanity number.",
  ],
  homework: {
    basic: {
      title: "Write a unit test and a fake",
      brief: [
        "Build a `TopicPage` that renders a headline from a `Headlines` dependency. Write a fake implementation backed by a dict, then three unit tests: a known topic, an unknown topic, and one that shows the fake works without a database.",
      ],
      criteria: ["The page takes its dependency as a constructor argument", "The fake is a working in-memory implementation, not a mock", "Tests follow arrange-act-assert and cover the missing-topic path"],
      hints: ["The fake can be ten lines: return `None` for a missing slug and let the page decide what to render."],
      solution: {
        text: [
          "The fake is the point of the exercise: it has real behaviour (lookup and `None`) without a database, so the page's branching logic is exercised rather than simulated. The tests read as three questions: known topic, unknown topic, and what the dependency itself returns.",
          "In a larger system the same fake would grow `add` and `remove` methods and become the shared test fixture for every page that reads headlines. That is cheaper and more honest than mocking `get` in every test.",
        ],
        code: { lang: "python", file: "test_hw_basic.py", code: `from dataclasses import dataclass

@dataclass(frozen=True)
class Topic:
    slug: str
    headline: str

class FakeHeadlines:
    """A fake: a working implementation with a shortcut (a dict, not a network call)."""

    def __init__(self, rows: dict[str, str]):
        self.rows = rows

    def get(self, slug: str) -> Topic | None:
        headline = self.rows.get(slug)
        return Topic(slug, headline) if headline else None

class TopicPage:
    def __init__(self, headlines):
        self.headlines = headlines

    def render(self, slug: str) -> str:
        topic = self.headlines.get(slug)
        if topic is None:
            return "Topic not found"
        return f"# {topic.headline}"

def test_renders_a_known_topic():
    page = TopicPage(FakeHeadlines({"python": "Python 3.14 ships"}))
    assert page.render("python") == "# Python 3.14 ships"

def test_unknown_topic_is_a_404_page():
    page = TopicPage(FakeHeadlines({}))
    assert page.render("cobol") == "Topic not found"

def test_fake_can_supply_a_single_topic_without_a_database():
    fake = FakeHeadlines({"ai": "Small models get cheaper"})
    assert fake.get("ai") == Topic("ai", "Small models get cheaper")
    assert fake.get("rust") is None` },
        output: "...                                                                      [100%]\n3 passed in 0.03s",
        pitfalls: ["If the fake raises `KeyError` for a missing slug instead of returning `None`, the 404 branch can never be reached in a test."],
      },
    },
    intermediate: {
      title: "Integration test with a real database",
      brief: [
        "Implement `bump_streak(conn, learner_id, day)`, which inserts a first streak or updates an existing one. Test it against a real SQLite file created by a fixture: first visit, next day, a gap that restarts, a same-day repeat, independent learners, and the CHECK constraint on negative days.",
      ],
      criteria: ["Every test gets a fresh database through `tmp_path`", "The upsert path is covered by a second save", "Two learners do not share a row", "The schema constraint is tested, not just the Python code"],
      hints: ["Use `ON CONFLICT ... DO UPDATE` for SQLite, or `INSERT ... ON CONFLICT` with the same shape in PostgreSQL."],
      solution: {
        text: [
          "The fixture creates the schema once per test file and hands over a connection; `tmp_path` isolates each test. Running the same SQL against SQLite locally and PostgreSQL in CI catches most dialect mistakes while keeping the local loop fast.",
          "The constraint test is the one a unit test cannot replace: it proves the deployed table rejects bad data even if a future caller forgets the Python validation. The gap and same-day tests pin the restart rule, which is the kind of logic that quietly drifts when dates are parsed as strings.",
        ],
        code: { lang: "python", file: "test_hw_integration.py", code: `import sqlite3
from datetime import date, timedelta

import pytest

SCHEMA = """
CREATE TABLE streak (
    learner_id TEXT PRIMARY KEY,
    days       INTEGER NOT NULL CHECK (days >= 0),
    last_day   TEXT NOT NULL
);
"""

def bump_streak(conn, learner_id, day):
    """Continue a streak on the next day, restart it otherwise."""
    row = conn.execute(
        "SELECT days, last_day FROM streak WHERE learner_id = ?", (learner_id,)
    ).fetchone()
    if row is None:
        days = 1
        conn.execute(
            "INSERT INTO streak (learner_id, days, last_day) VALUES (?, 1, ?)",
            (learner_id, day),
        )
    else:
        last = date.fromisoformat(row[1])
        today = date.fromisoformat(day)
        if today == last:
            return row[0]
        days = row[0] + 1 if today == last + timedelta(days=1) else 1
        conn.execute(
            "UPDATE streak SET days = ?, last_day = ? WHERE learner_id = ?",
            (days, day, learner_id),
        )
    conn.commit()
    return days

@pytest.fixture
def conn(tmp_path):
    connection = sqlite3.connect(tmp_path / "streak.db")
    connection.executescript(SCHEMA)
    yield connection
    connection.close()

def test_first_visit_starts_at_one(conn):
    assert bump_streak(conn, "asha", "2026-10-22") == 1

def test_second_visit_increments(conn):
    bump_streak(conn, "asha", "2026-10-22")
    assert bump_streak(conn, "asha", "2026-10-23") == 2

def test_gap_restarts_the_streak(conn):
    bump_streak(conn, "asha", "2026-10-20")
    assert bump_streak(conn, "asha", "2026-10-22") == 1

def test_same_day_does_not_double_count(conn):
    bump_streak(conn, "asha", "2026-10-22")
    assert bump_streak(conn, "asha", "2026-10-22") == 1

def test_learners_have_independent_rows(conn):
    bump_streak(conn, "asha", "2026-10-22")
    bump_streak(conn, "asha", "2026-10-23")
    assert bump_streak(conn, "ravi", "2026-10-23") == 1

def test_the_check_constraint_is_real(conn):
    with pytest.raises(sqlite3.IntegrityError):
        conn.execute(
            "INSERT INTO streak (learner_id, days, last_day) VALUES ('x', -1, '2026-10-22')"
        )` },
      output: "......                                                                   [100%]\n6 passed in 0.10s",
        pitfalls: ["Committing inside the helper is convenient but hides transaction control; in code that must update several tables atomically, pass the transaction boundary up to the caller."],
      },
    },
    challenge: {
      title: "Kill a flaky test",
      brief: [
        "The pair of tests below uses a module-level `CACHE`. Running the whole file gives `1 failed, 1 passed`, but each test alone passes. Reproduce that, explain the order dependence, and remove it without adding sleeps or reruns.",
      ],
      criteria: ["Reproduces the failure and the two passing single-test runs", "Explains why test order changes the result", "Removes the module-level mutable state", "Both tests pass together, alone, and in random order"],
      hints: ["The second test is not wrong about the behaviour; it is wrong to assume it starts with an empty cache.", "A pytest fixture that returns a fresh cache, or an injected cache object, fixes the class of bug rather than this instance."],
      solution: {
        text: [
          "The unfixed pair prints `1 failed, 1 passed`, while either test alone prints `1 passed`. The first test fills the shared cache, so the second test's loader is never called. That is not a flaky test in the network sense; it is test pollution, and it is deterministic once you know the order.",
          "The fix is an object with per-test lifetime plus a fixture, so no test can see another test's rows. The same pattern applies to module-level database connections, environment variables and cached settings. If a test depends on order to pass, it is already broken even on the days it is green.",
        ],
        code: { lang: "python", file: "test_no_shared_state.py", code: `import pytest

class HeadlineCache:
    def __init__(self):
        self.rows: dict[str, str] = {}

    def get(self, topic: str, loader) -> str:
        if topic not in self.rows:
            self.rows[topic] = loader(topic)
        return self.rows[topic]

@pytest.fixture
def cache():
    return HeadlineCache()

def test_caches_the_first_result(cache):
    assert cache.get("python", lambda t: "first") == "first"
    assert cache.get("python", lambda t: "second") == "first"

def test_calls_the_loader_once(cache):
    calls = []
    cache.get("python", lambda t: calls.append(t) or "headline")
    assert calls == ["python"], f"loader called with {calls}"` },
        output: "..                                                                       [100%]\n2 passed in 0.03s",
        pitfalls: ["A fixture that clears a module global after every test still leaves a window where two tests share it; prefer creating the object per test."],
      },
    },
    capstone: {
      title: "DevAtlas: test suite and coverage gate",
      brief: [
        "For your DevAtlas capstone, inventory the behaviours of the news ingester and progress API, choose a level for each, and write the suite. Then add a coverage gate that enforces a total floor plus higher floors for critical modules, failing CI with a readable message.",
      ],
      criteria: ["A table mapping each behaviour to unit, integration or E2E with a reason", "Unit tests inject clock, feed and store; integration tests use a real database", "The gate checks a total floor and per-module floors", "CI runs unit tests on every PR, integration on merge and E2E before release"],
      hints: ["Keep the gate in a small script that reads `coverage.json`, so the policy is reviewable and testable on its own.", "Set critical floors from risk, not from today's number; a new module should not lower the floor for the old ones."],
      solution: {
        text: [
          "The gate is deliberately small: coverage.py writes `coverage.json`, and this script turns the policy into an exit code. It checks the total and then each file, giving critical modules such as the progress repository and news ingester a 90% floor while ordinary modules get 70%. That prevents one well-tested module from hiding an untested critical one behind a healthy total.",
          "The first sample report fails with exit code 1 and names each shortfall; a second report with 92.9% total and every critical module above 90% prints `GATE PASSED` and exits 0. The percentage is a regression alarm, not a goal: pair the gate with review of uncovered lines and, for the critical modules, a few mutation checks.",
        ],
        code: { lang: "python", file: "scripts/coverage_gate.py", code: `"""Fail CI when coverage drops below the agreed floors.

Usage:
    coverage run -m pytest
    coverage json -o coverage.json
    python scripts/coverage_gate.py coverage.json
"""
import json
import sys
from pathlib import Path

TOTAL_FLOOR = 85.0
FILE_FLOOR = 70.0
CRITICAL = {
    "src/progress/repo.py": 90.0,
    "src/news/ingest.py": 90.0,
}

def evaluate(report, total_floor=TOTAL_FLOOR, file_floor=FILE_FLOOR, critical=CRITICAL):
    problems = []
    total = float(report["totals"]["percent_covered"])
    if total < total_floor:
        problems.append(f"total {total:.1f}% is below {total_floor:.1f}%")

    for name, data in sorted(report["files"].items()):
        percent = float(data["summary"]["percent_covered"])
        floor = critical.get(name, file_floor)
        if percent < floor:
            problems.append(f"{name} {percent:.1f}% is below {floor:.1f}%")
    return problems

def main(argv):
    path = Path(argv[1] if len(argv) > 1 else "coverage.json")
    report = json.loads(path.read_text(encoding="utf-8"))
    total = float(report["totals"]["percent_covered"])
    problems = evaluate(report)

    print(f"total coverage: {total:.1f}% (floor {TOTAL_FLOOR:.1f}%)")
    if problems:
        print("GATE FAILED")
        for problem in problems:
            print(f" - {problem}")
        return 1
    print("GATE PASSED")
    print(f"checked {len(report['files'])} files; critical floors: {CRITICAL}")
    return 0

if __name__ == "__main__":
    raise SystemExit(main(sys.argv))` },
        output: "total coverage: 81.7% (floor 85.0%)\nGATE FAILED\n - total 81.7% is below 85.0%\n - src/news/ingest.py 86.0% is below 90.0%\n - src/progress/repo.py 80.0% is below 90.0%",
        pitfalls: ["Gating on a `coverage.json` left over from an earlier run gives a confident answer about the wrong code; regenerate it in the same job as the tests."],
      },
    },
  },
  deeper: [
    { label: "Ham Vocke: The Practical Test Pyramid (2018)", url: "https://martinfowler.com/articles/practical-test-pyramid.html" },
    { label: "Martin Fowler: Test Double (2006)", url: "https://martinfowler.com/bliki/TestDouble.html" },
    { label: "pytest documentation: fixtures", url: "https://docs.pytest.org/en/stable/how-to/fixtures.html" },
    { label: "Google Testing Blog: Just Say No to More End-to-End Tests (2015)", url: "https://testing.googleblog.com/2015/04/just-say-no-to-more-end-to-end-tests.html" },
    { label: "Software Engineering at Google, chapter 11: Testing Overview", url: "https://abseil.io/resources/swe-book/html/ch11.html" },
  ],
  nextPreview: "Next: JavaScript and TypeScript, starting with the event loop and async/await.",
};
