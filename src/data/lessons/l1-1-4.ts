import type { Lesson } from "../../types";

export const lesson: Lesson = {
  id: "1.1.4",
  title: "Testing with pytest",
  minutes: 65,
  level: "Beginner",
  prerequisites: ["1.1.2 OOP, dataclasses and protocols"],
  summary: "Write fast, readable tests with pytest: arrange-act-assert, fixtures, parametrize, testing errors, and mocking only at the boundaries of your system.",
  terms: [
    { term: "Unit test", def: "Tests one small piece (a function or class) in isolation, in milliseconds." },
    { term: "Integration test", def: "Tests several pieces together, often with a real database or HTTP layer." },
    { term: "Assertion", def: "A check that must be true, e.g. `assert total == 30`. pytest shows a detailed diff when it fails." },
    { term: "Fixture", def: "A function that prepares something a test needs (data, a temp folder, a fake client). Tests receive it by naming it as a parameter." },
    { term: "Parametrize", def: "Running the same test with many input/expected pairs." },
    { term: "Mock / fake", def: "A stand-in for a real dependency. A fake has working simple logic; a mock records how it was called." },
    { term: "Coverage", def: "The percentage of code lines executed by tests. Useful to find untested code, not proof of quality." },
  ],
  problem: [
    "A teammate changes the discount calculation to fix a rounding bug. Two weeks later finance notices that customers with exactly 100 points were charged full price. Nobody tested the boundary, and nobody dared refactor the function because there were no tests at all.",
    "Tests are how teams change code quickly without breaking it. The goal is not 100% coverage; it is confidence that the important behaviour still works after every change, checked automatically in CI.",
  ],
  concept: {
    analogy: [
      "Tests are the **safety net under a trapeze**. Without it, performers move slowly and carefully, and every fall is a disaster. With it, they try ambitious moves daily. A good net is in the right places (critical behaviour) and does not get in the way (fast, no flakiness).",
    ],
    precise: [
      "Every test follows **Arrange–Act–Assert**: set up inputs, call the code, check the result. One behaviour per test, named after the behaviour (`test_discount_applies_at_exactly_100_points`).",
      "The **test pyramid**: many fast unit tests, fewer integration tests, very few end-to-end tests. Unit tests give quick, precise feedback; integration tests catch wiring problems; E2E tests catch what users actually see but are slow and brittle.",
      "**Mock at the boundaries**: replace things that are slow, non-deterministic or external (network, clock, randomness, email, payment) and keep your own logic real. Mocking your own internal functions makes tests pass while the real code is broken, and makes refactoring painful.",
      "**Test boundaries and edge cases**: empty inputs, one element, exactly at a threshold, negative numbers, None, very large values, duplicates, unicode.",
    ],
  },
  underTheHood: {
    text: [
      "pytest discovers files named `test_*.py`, functions named `test_*`, and rewrites `assert` statements at import time so a failure shows both sides of the comparison. That is why plain `assert` is enough, with no special assertEqual methods.",
      "Fixtures are resolved by parameter name. A fixture can depend on other fixtures, and has a **scope** (function by default; module or session for expensive setup). Code after `yield` in a fixture is teardown.",
      "`conftest.py` holds fixtures shared by all tests in that directory and below. Built-in fixtures include `tmp_path` (a fresh temp folder), `monkeypatch` (set env vars, replace attributes safely) and `capsys` (capture printed output).",
    ],
    diagram: {
      title: "The test pyramid",
      nodes: [
        { label: "Unit", sub: "many · ms · precise" },
        { label: "Integration", sub: "some · real DB/HTTP" },
        { label: "End-to-end", sub: "few · slow · user view" },
      ],
      edges: ["fewer", "fewer"],
    },
  },
  handsOn: [
    {
      title: "Code under test",
      code: {
        lang: "python",
        file: "pricing.py",
        code: `from decimal import Decimal, ROUND_HALF_UP

def loyalty_discount(price: Decimal, points: int) -> Decimal:
    """10% off at 100+ points, 20% off at 500+ points. Rounded to 2 decimals."""
    if price < 0:
        raise ValueError("price cannot be negative")
    rate = Decimal("0.20") if points >= 500 else Decimal("0.10") if points >= 100 else Decimal("0")
    return (price * (1 - rate)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)`,
      },
      notes: ["Money uses Decimal, never float: `0.1 + 0.2 != 0.3` in binary floating point."],
    },
    {
      title: "Parametrized boundary tests and error tests",
      code: {
        lang: "python",
        file: "test_pricing.py",
        code: `from decimal import Decimal
import pytest
from pricing import loyalty_discount

@pytest.mark.parametrize(
    "points, expected",
    [
        (0, "100.00"),
        (99, "100.00"),     # just below the first threshold
        (100, "90.00"),     # exactly at it: the bug from the story
        (499, "90.00"),
        (500, "80.00"),
    ],
)
def test_discount_thresholds(points, expected):
    assert loyalty_discount(Decimal("100"), points) == Decimal(expected)

def test_rounding_half_up():
    assert loyalty_discount(Decimal("10.05"), 100) == Decimal("9.05")   # 9.045 -> 9.05

def test_negative_price_rejected():
    with pytest.raises(ValueError, match="negative"):
        loyalty_discount(Decimal("-1"), 0)`,
      },
      output: "$ python -m pytest -q\n.......                                     [100%]\n7 passed in 0.02s",
    },
    {
      title: "Fixtures and tmp_path",
      code: {
        lang: "python",
        file: "test_report.py",
        code: `import json
import pytest

def save_report(path, scores: dict[str, float]) -> None:
    path.write_text(json.dumps(scores, sort_keys=True))

@pytest.fixture
def scores() -> dict[str, float]:
    return {"0.1.1": 1.0, "0.2.1": 0.67}

def test_save_report_writes_sorted_json(tmp_path, scores):
    out = tmp_path / "report.json"
    save_report(out, scores)
    assert json.loads(out.read_text()) == scores
    assert out.read_text().startswith('{"0.1.1"')`,
      },
    },
    {
      title: "Mock the boundary, not your logic",
      code: {
        lang: "python",
        file: "test_welcome.py",
        code: `from datetime import datetime
from unittest.mock import Mock

def welcome(user: str, now: datetime, mailer) -> str:
    greeting = "Good morning" if now.hour < 12 else "Good evening"
    text = f"{greeting}, {user}!"
    mailer.send(user, text)
    return text

def test_morning_greeting_is_mailed():
    mailer = Mock()                                       # boundary: email
    text = welcome("asha", datetime(2026, 10, 18, 9), mailer)   # boundary: clock, passed in
    assert text == "Good morning, asha!"
    mailer.send.assert_called_once_with("asha", "Good morning, asha!")`,
      },
      notes: ["Passing `now` in (instead of calling datetime.now() inside) makes time controllable. Designing for testability usually means injecting the clock, randomness and I/O."],
    },
    {
      title: "monkeypatch environment variables",
      code: {
        lang: "python",
        code: `import os

def api_base() -> str:
    return os.environ.get("API_BASE", "http://localhost:8000")

def test_api_base_from_env(monkeypatch):
    monkeypatch.setenv("API_BASE", "https://api.devatlas.dev")
    assert api_base() == "https://api.devatlas.dev"

def test_api_base_default(monkeypatch):
    monkeypatch.delenv("API_BASE", raising=False)
    assert api_base() == "http://localhost:8000"`,
      },
    },
    {
      title: "Useful commands",
      code: {
        lang: "bash",
        code: `python -m pytest -q                  # quiet summary
python -m pytest -k discount         # only tests whose name matches
python -m pytest -x --lf             # stop at first failure; rerun last failures
python -m pytest -vv                 # verbose diffs
pip install pytest-cov && python -m pytest --cov=. --cov-report=term-missing`,
      },
    },
  ],
  companies: [
    "**CI gates**: every pull request runs the test suite; failures block merging (lesson 0.3.2). Fast suites matter: teams split slow integration tests into a separate job so developers get unit feedback in under a minute.",
    "**Regression tests for every bug**: a common rule is 'every bug fix comes with a test that fails before the fix and passes after', so the same bug never returns.",
    "**Testcontainers** is widely used for integration tests: it starts a real PostgreSQL, MySQL or Redis in Docker for the test run, which catches SQL and driver issues that mocks hide.",
  ],
  mistakes: [
    { mistake: "Testing implementation details", why: "Mocking every internal call feels thorough", wrong: "Refactors break tests although behaviour is unchanged", fix: "Assert on outputs and observable side effects at boundaries" },
    { mistake: "No boundary cases", why: "Testing only the happy path", wrong: "Off-by-one bugs at thresholds reach production", fix: "Parametrize below, at, and above every threshold" },
    { mistake: "Flaky tests depending on time, randomness or network", why: "Calling datetime.now() or real APIs", wrong: "Random failures; people start ignoring red builds", fix: "Inject clock and randomness (seed); fake the network" },
    { mistake: "Chasing 100% coverage", why: "It is an easy number to track", wrong: "Tests that execute lines without asserting anything meaningful", fix: "Use coverage to find untested important code; review assertions" },
    { mistake: "Using float for money", why: "It is the default number type", wrong: "Rounding errors in totals", fix: "Decimal (or integer cents) with explicit rounding" },
  ],
  bestPractices: [
    { tag: "Maintainability", text: "One behaviour per test, named after the behaviour; Arrange–Act–Assert layout." },
    { tag: "Reliability", text: "Every bug fix ships with a regression test." },
    { tag: "Performance", text: "Keep the unit suite under a minute; mark slow tests and run them in a separate CI job." },
    { tag: "Reliability", text: "Inject time, randomness and I/O so tests are deterministic." },
  ],
  interview: [
    { q: "What makes a good unit test?", a: "Fast, deterministic, independent of other tests, testing one behaviour through the public interface, with a descriptive name and clear Arrange–Act–Assert structure. It should fail for the right reason and survive refactors that keep behaviour." },
    { q: "When do you use mocks?", a: "At system boundaries: network, email, payment, clock, randomness, slow or non-deterministic dependencies. I avoid mocking my own internal code; I prefer simple fakes for complex collaborators and real implementations where they are fast." },
    { q: "Unit vs integration tests?", a: "Unit tests isolate a small piece and run in milliseconds; integration tests check pieces working together, like code plus a real database. You want many unit tests for fast feedback and enough integration tests to catch wiring, SQL and configuration issues." },
  ],
  quickCheck: [
    {
      kind: "mcq",
      prompt: "A discount starts at 100 points. Which test inputs best cover the boundary?",
      options: ["50 and 150", "99, 100 and 101", "0 and 1000", "Only 100"],
      answer: 1,
      explanation: "Test just below, exactly at, and just above the threshold.",
    },
    {
      kind: "bug",
      prompt: "This test fails randomly a few times a month. Why?",
      code: { lang: "python", code: "def test_greeting():\n    assert greet_now().startswith(\"Good morning\")" },
      options: ["startswith is unreliable", "It depends on the real current time", "pytest runs tests in random order", "Strings are immutable"],
      answer: 1,
      explanation: "It only passes when the test runs in the morning. Pass the time in or freeze it.",
    },
    {
      kind: "output",
      prompt: "What does this fixture give the test?",
      code: { lang: "python", code: "@pytest.fixture\ndef numbers():\n    return [3, 1, 2]\n\ndef test_sorted(numbers):\n    numbers.sort()\n    assert numbers == [1, 2, 3]" },
      options: ["The function object numbers", "A fresh list [3, 1, 2] for each test", "A shared list modified across all tests", "None"],
      answer: 1,
      explanation: "Function-scoped fixtures run once per test, so each test gets a fresh list.",
    },
  ],
  cheatSheet: [
    "Files test_*.py, functions test_*; plain assert.",
    "Arrange–Act–Assert; one behaviour per test.",
    "@pytest.mark.parametrize for many cases; test thresholds -1, =, +1.",
    "pytest.raises(Error, match=...) for errors.",
    "Fixtures by parameter name; yield for teardown; conftest.py to share.",
    "tmp_path, monkeypatch, capsys are built in.",
    "Mock boundaries (network, clock, email), not your own logic.",
    "Money: Decimal. Bug fix → regression test.",
  ],
  homework: {
    basic: {
      title: "Test the Streak class",
      brief: ["Write pytest tests for the Streak class from lesson 1.1.2: empty history, today only, yesterday only (streak still counts), a gap, and duplicate records of the same day."],
      criteria: ["At least 5 tests or parametrized cases", "Fixed dates, no datetime.now()", "All pass"],
      hints: ["Build the expected streak by hand for each case before writing the assert."],
      solution: {
        text: ["Parametrize over (recorded day offsets, expected streak) relative to a fixed 'today'."],
        code: {
          lang: "python",
          code: `from datetime import date, timedelta
import pytest
from streak import Streak

TODAY = date(2026, 10, 18)

@pytest.mark.parametrize("offsets, expected", [
    ([], 0),
    ([0], 1),
    ([1], 1),              # yesterday still counts
    ([0, 1, 2, 4], 3),     # gap at 3
    ([0, 0, 1], 2),        # duplicates ignored
])
def test_streak(offsets, expected):
    s = Streak()
    for o in offsets:
        s.record(TODAY - timedelta(days=o))
    assert s.current(TODAY) == expected`,
        },
      },
    },
    intermediate: {
      title: "Shared fixtures with conftest",
      brief: ["Create conftest.py with a fixture `repo` returning an InMemoryProgressRepository pre-loaded with 3 results, and a fixture `service` that depends on it. Write 3 tests for ProgressService using them."],
      criteria: ["Fixture depending on another fixture", "No duplication of setup in tests", "Tests independent of each other"],
      hints: ["A fixture parameter can itself be a fixture name."],
      solution: {
        text: ["Fixtures compose: `service(repo)` receives the repo fixture automatically."],
        code: {
          lang: "python",
          file: "conftest.py",
          code: `import pytest
from progress import QuizResult
from repo import InMemoryProgressRepository, ProgressService

@pytest.fixture
def repo():
    r = InMemoryProgressRepository()
    for lesson, score in [("a", 1.0), ("b", 0.5), ("c", 0.75)]:
        r.save(QuizResult(1, lesson, score))
    return r

@pytest.fixture
def service(repo):
    return ProgressService(repo)

# test_service.py
# def test_average(service): assert service.average_score(1) == 0.75
# def test_unknown_user(service): assert service.average_score(99) == 0.0`,
        },
      },
    },
    challenge: {
      title: "Find the bug with tests first",
      brief: ["The function below should split a list into pages of size n. Write tests first (empty list, exact multiple, remainder, n=1, n larger than list, n=0 rejected), run them, find the bugs, then fix."],
      criteria: ["Tests written before the fix", "At least 2 bugs found", "Fixed version passes all tests"],
      hints: ["Try a list of 5 items with n=2."],
      solution: {
        text: ["Bugs: the range stops early and drops the remainder page; n=0 causes an error deep in range() instead of a clear ValueError. Tests on the remainder and n=0 expose both."],
        code: {
          lang: "python",
          code: `# buggy
def paginate(items, n):
    return [items[i:i + n] for i in range(0, len(items) - n, n)]

# fixed
def paginate(items: list, n: int) -> list[list]:
    if n < 1:
        raise ValueError("page size must be >= 1")
    return [items[i:i + n] for i in range(0, len(items), n)]

assert paginate([1, 2, 3, 4, 5], 2) == [[1, 2], [3, 4], [5]]
assert paginate([], 3) == []
assert paginate([1, 2], 5) == [[1, 2]]`,
        },
      },
    },
    capstone: {
      title: "DevAtlas: test suite and coverage in CI",
      brief: ["Add tests for every module in services/ai (tags, dedupe, models, feeds), a conftest.py with shared fixtures, and run pytest with coverage in CI. Set a minimum coverage threshold that the suite currently meets."],
      criteria: ["CI fails if tests fail", "Coverage report printed in CI", "--cov-fail-under set to a realistic number"],
      hints: ["`pytest --cov=devatlas_ai --cov-fail-under=80`"],
      solution: {
        text: ["Set the threshold at the current level and raise it over time, so coverage can only go up. Review uncovered lines for anything important rather than chasing the number."],
      },
    },
  },
  deeper: [
    { label: "pytest documentation", url: "https://docs.pytest.org/" },
    { label: "pytest: How to use fixtures", url: "https://docs.pytest.org/en/stable/how-to/fixtures.html" },
    { label: "Python docs: unittest.mock", url: "https://docs.python.org/3/library/unittest.mock.html" },
    { label: "Testcontainers for Python", url: "https://testcontainers-python.readthedocs.io/" },
  ],
  nextPreview: "Next: JavaScript's event loop. Why setTimeout(fn, 0) does not run immediately, and how to run async work in parallel without bugs.",
};
