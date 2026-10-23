import type { Lesson } from "../../types";

export const lesson: Lesson = {
  id: "1.1.4",
  title: "Testing with pytest",
  minutes: 65,
  level: "Beginner",
  prerequisites: ["1.1.2 OOP, dataclasses and protocols"],
  summary: "Use pytest as a tool: arrange-act-assert, fixtures and scopes, parametrize, errors and warnings, monkeypatch at the boundary, tmp_path, conftest.py, markers and coverage that is honest.",
  terms: [
    { term: "Unit test", def: "Tests one small piece (a function or class) in isolation, in milliseconds. Its failure should point at one behaviour." },
    { term: "Integration test", def: "Tests several pieces together, often with a real database or HTTP layer, to catch wiring and SQL mistakes." },
    { term: "Assertion", def: "A check that must be true, e.g. `assert total == 30`. pytest rewrites assertions so a failure shows the values on both sides." },
    { term: "Arrange-act-assert", def: "The three visible parts of a test: build inputs, call the behaviour once, check the observable result. Often shortened to AAA." },
    { term: "Fixture", def: "A function that prepares something a test needs (data, a temp folder, a fake client). Tests receive it by naming it as a parameter." },
    { term: "Fixture scope", def: "How often a fixture runs: `function` (default), `class`, `module`, `package` or `session`. Wider scopes are faster but share state, so they must be read-only or carefully reset." },
    { term: "Parametrize", def: "Running the same test body with many input/expected pairs; each pair becomes its own test id in the report." },
    { term: "Test double", def: "A stand-in for a real dependency. A stub returns canned answers, a fake has working simple logic, a spy records calls, and a mock is pre-programmed with expectations." },
    { term: "monkeypatch", def: "A built-in pytest fixture that temporarily changes an attribute, dictionary entry or environment variable and undoes it automatically after the test." },
    { term: "tmp_path", def: "A built-in fixture giving each test a unique `pathlib.Path` under pytest's temporary base directory; it disappears from your repo and is cleaned up by the OS." },
    { term: "conftest.py", def: "A file pytest loads automatically. Fixtures and hooks defined there are shared by every test in that directory and below, without imports." },
    { term: "Coverage", def: "The share of statements (line coverage) or branches executed by tests. It shows what was not run, not whether the assertions were any good." },
  ],
  problem: [
    "A teammate changes the discount calculation to fix a rounding bug. Two weeks later finance notices that customers with exactly 100 points were charged full price. Nobody tested the boundary, and nobody dared refactor the function because there were no tests at all.",
    "Tests are how teams change code quickly without breaking it. The goal is not 100% coverage; it is confidence that the important behaviour still works after every change, checked automatically in CI. This lesson is about the tool that makes that cheap: pytest. The testing *method* - which level to test, which double to use, how to design seams - is lesson 1.5.1; here you learn how to drive the tool.",
  ],
  concept: {
    analogy: [
      "Tests are the **safety net under a trapeze**. Without it, performers move slowly and carefully, and every fall is a disaster. With it, they try ambitious moves daily. A good net is in the right places (critical behaviour) and does not get in the way (fast, no flakiness).",
      "A **fixture is a prepared lab bench**. The bench is laid out before the experiment (setup), the experiment runs once (the test), and the bench is cleaned afterwards (teardown). A module-scoped fixture is a shared lab that is prepared once for a whole class of experiments; a session-scoped one is the building itself. Parameterized tests are labelled sample racks: the same procedure runs on every sample, and the label tells you which sample failed.",
    ],
    precise: [
      "Every test follows **Arrange-Act-Assert**: set up inputs and doubles, call the behaviour once, check the observable result. One behaviour per test, named after the behaviour (`test_discount_applies_at_exactly_100_points`). A test that fails should fail for one readable reason; if the assertion diff needs a paragraph of explanation, split the test.",
      "**Fixtures are dependency injection for tests.** A test asks for a fixture by naming it as a parameter; pytest resolves the name, runs the fixture, caches it for the scope, and runs teardown after `yield`. Fixtures can depend on other fixtures, and `conftest.py` shares them with a directory tree. Scopes trade isolation for speed: function scope is the safe default, module or session scope is for expensive, read-only resources.",
      "**Parametrize and the built-ins remove repetition.** `@pytest.mark.parametrize` turns one test body into many reported cases. `pytest.raises(Error, match=...)` asserts both the exception type and its message. `pytest.warns(Warning, match=...)` asserts that a warning is emitted. `tmp_path` gives real filesystem access without writing into the repository, and `monkeypatch` changes environment variables or attributes for one test only.",
      "**Mock at the boundaries, and prefer a seam to a patch.** Replace things that are slow, non-deterministic or external (network, clock, randomness, email, payment), and keep your own logic real. Passing the clock or client in is easier to read than patching a module global, and it survives refactors. Coverage finds untested code; it cannot tell whether an assertion is meaningful. Use it to guide review and to floor critical modules, never as a target on its own.",
    ],
  },
  underTheHood: {
    text: [
      "**Collection and assertion rewriting.** pytest walks `testpaths`, imports files named `test_*.py` or `*_test.py`, and collects functions named `test_*` plus classes named `Test*` (without an `__init__`). At import time it rewrites every `assert` into a form that records the sub-expressions, so a failure can print `assert Decimal('225.00') == Decimal('200.00')` and explain where each side came from. That is why plain `assert` is enough and why assertion rewriting must be enabled for the test modules (plugins and some import hooks can interfere).",
      "**Fixture resolution.** pytest builds a dependency graph from fixture parameter names. A fixture is looked up in the test module, then in `conftest.py` files from the test's directory upward, then in plugins. The first definition wins. A fixture is instantiated once per scope and cached for that scope; teardown registered with `yield` or `request.addfinalizer` runs in reverse order of setup. A session-scoped fixture requested by three modules runs once, so mutable state in it leaks across files unless the fixture resets it.",
      "**Parametrization is test generation.** `@pytest.mark.parametrize('points, expected', [...])` creates one test item per row at collection time. Ids are built from the values (`test_parse_points[100-100]`), which is why a failing id points straight at the input. `pytest.param(..., id='at-threshold')` gives a readable label, and `marks=pytest.mark.xfail` on a row documents a known-bad case without hiding the rest.",
      "**Exceptions and warnings.** `pytest.raises` runs the block and fails if the expected exception is not raised, if a different exception escapes, or if `match` does not find the regex in `str(exception)`. It returns an `ExceptionInfo` object, so you can assert on `exc.value.args` afterwards. `pytest.warns` is the warning equivalent and also fails if no warning is issued. Warnings are collected in a summary; `filterwarnings = ['error']` in configuration turns them into failures, which is how teams stop new deprecations from accumulating.",
      "**monkeypatch is temporary by construction.** `monkeypatch.setenv`, `delenv`, `setattr`, `delattr`, `setitem` and `chdir` record an undo action, and pytest replays those actions after the test, in reverse order, even when the test fails. That makes it safe for environment variables and third-party globals, but it is still a patch: if the code reads the value at import time, patching later changes nothing. A constructor parameter is still the better seam.",
      "**tmp_path and its family.** Each test gets a fresh directory under pytest's base temp directory (`tmp_path`), plus `tmp_path_factory` for making directories at a wider scope. pytest keeps the last three runs' base directories and deletes older ones; the OS eventually removes the rest. Because the path is unique per test, tests can write files in parallel (`pytest-xdist`) without colliding. Never write test output into the repository and then clean it up by hand.",
      "**conftest.py, markers and strictness.** `conftest.py` is imported before the tests in its directory; hooks such as `pytest_collection_modifyitems` and fixtures live there. Markers (`@pytest.mark.slow`, `integration`, `smoke`) are free-form labels until you register them in `[tool.pytest.ini_options] markers = [...]`. With `--strict-markers`, a typo like `@pytest.mark.slwo` becomes an error instead of a silently ignored test. `-m 'not slow'` then gives a fast local loop while CI runs everything.",
      "**Coverage is a tracer, not a judge.** pytest-cov starts coverage.py, which installs a trace function and records executed lines and branch arcs. Line coverage can be 100% while every assertion is `assert True`; branch coverage catches untested `if` paths but still not weak assertions. Mutation testing changes the code and checks that a test fails, which measures the assertions themselves. Use coverage to find risky untested code, set floors for critical modules, and read the `Missing` column rather than celebrating a single number (lesson 1.5.1 covers the method).",
    ],
    diagram: {
      title: "The test pyramid",
      nodes: [
        { label: "Unit", sub: "many · ms · precise" },
        { label: "Integration", sub: "some · real DB/HTTP" },
        { label: "End-to-end", sub: "few · slow · user view" },
      ],
      edges: ["fewer", "fewer"],
      caption: "pytest is the runner for all three levels; the pyramid decides how many of each you write. The method is lesson 1.5.1.",
    },
  },
  handsOn: [
    {
      title: "Install pytest and read a failing assertion",
      text: [
        "Create a virtual environment so the versions are yours: `python -m venv .venv`, activate it, then `python -m pip install pytest pytest-cov`. Save the pricing module from lesson 1.1.2 and the test below. The test is deliberately wrong: 10% off 250 is 225, not 200. Run it before fixing it - a test you have never seen fail is a test you cannot trust.",
      ],
      code: {
        lang: "python",
        file: "test_discount_story.py",
        code: `# pricing.py
from decimal import Decimal, ROUND_HALF_UP
import warnings

def loyalty_discount(price: Decimal, points: int) -> Decimal:
    """10% off at 100+ points, 20% off at 500+ points. Rounded to 2 decimals."""
    if price < 0:
        raise ValueError("price cannot be negative")
    rate = Decimal("0.20") if points >= 500 else Decimal("0.10") if points >= 100 else Decimal("0")
    return (price * (1 - rate)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)

def parse_points(raw: str) -> int:
    """Parse a points string. Above 10,000 the value is capped, with a warning."""
    if not raw.isdigit():
        raise ValueError(f"points must be a whole number, got {raw!r}")
    value = int(raw)
    if value > 10_000:
        warnings.warn("points above 10000 are capped at 10000", UserWarning, stacklevel=2)
        return 10_000
    return value

# test_discount_story.py
from decimal import Decimal
from pricing import loyalty_discount

def test_discount_at_exactly_100_points():
    # deliberately wrong: 10% off 250 is 225.00, not 200.00
    assert loyalty_discount(Decimal("250"), 100) == Decimal("200.00")`,
      },
      output: "$ python -m pytest -q test_discount_story.py\nF                                                                        [100%]\n================================== FAILURES ===================================\n_____________________ test_discount_at_exactly_100_points _____________________\n\n    def test_discount_at_exactly_100_points():\n        # deliberately wrong: 10% off 250 is 225.00, not 200.00\n>       assert loyalty_discount(Decimal(\"250\"), 100) == Decimal(\"200.00\")\nE       AssertionError: assert Decimal('225.00') == Decimal('200.00')\nE        +  where Decimal('225.00') = loyalty_discount(Decimal('250'), 100)\nE        +    where Decimal('250') = Decimal('250')\nE        +  and   Decimal('200.00') = Decimal('200.00')\n\ntest_discount_story.py:6: AssertionError\n=========================== short test summary info ===========================\nFAILED test_discount_story.py::test_discount_at_exactly_100_points - Assertio...\n1 failed in 0.11s",
      notes: [
        "pytest prints the left value, the right value and the call that produced the left one. You do not need `assertEqual` or a message: the diff is the message.",
        "The correct fix here is the expectation (225.00), not the implementation. When a test fails, first decide which side is wrong; changing production code to satisfy a wrong test is how bugs get locked in.",
        "Exit codes matter to CI: 0 means all selected tests passed, 1 means failures, 2 means interrupted, 5 means no tests were collected. A green pipeline must never treat 5 as success.",
      ],
    },
    {
      title: "Run the passing suite; parametrize the boundary cases",
      text: [
        "The boundary is the whole point of the story: 99, 100, 499 and 500 must behave differently. `parametrize` keeps one test body and reports every case separately, so a failure names the exact input. The last two tests cover an exception and a warning with the same tool.",
      ],
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
        loyalty_discount(Decimal("-1"), 0)

# test_parse.py
import pytest
from pricing import parse_points

@pytest.mark.parametrize(
    "raw, expected",
    [("0", 0), ("99", 99), ("100", 100), ("10000", 10000)],
)
def test_parse_points(raw, expected):
    assert parse_points(raw) == expected

def test_points_above_cap_warn():
    with pytest.warns(UserWarning, match="capped"):
        assert parse_points("10001") == 10_000

def test_non_numeric_points_rejected():
    with pytest.raises(ValueError, match="whole number"):
        parse_points("1O0")`,
      },
      output: "$ python -m pytest -q test_pricing.py\n.......                                                                  [100%]\n7 passed in 0.03s\n\n$ python -m pytest -v --no-header test_parse.py\n============================= test session starts =============================\ncollecting ... collected 6 items\n\ntest_parse.py::test_parse_points[0-0] PASSED                             [ 16%]\ntest_parse.py::test_parse_points[99-99] PASSED                           [ 33%]\ntest_parse.py::test_parse_points[100-100] PASSED                         [ 50%]\ntest_parse.py::test_parse_points[10000-10000] PASSED                     [ 66%]\ntest_parse.py::test_points_above_cap_warn PASSED                         [ 83%]\ntest_parse.py::test_non_numeric_points_rejected PASSED                   [100%]\n\n============================== 6 passed in 0.03s ==============================",
      notes: [
        "Each id is generated from the parameter values. `[100-100]` is the case that would have shipped the bug; with `pytest.param(..., id='at-threshold')` it would read `[at-threshold]` instead.",
        "`pytest.raises` fails if no exception is raised or if the type differs. Add `match` so a `ValueError` from an unrelated bug does not satisfy the test accidentally. After the block, `exc.value` lets you assert on the message or attributes.",
        "`pytest.warns` is stricter than reading `warnings.catch_warnings()` yourself: it fails when the warning is missing and checks the text. Run `python -m pytest -W error` to see which warnings your suite would turn into failures in CI.",
        "Fast feedback flags: `-k discount` selects by name, `-x` stops at the first failure, `--lf` reruns the last failures, `-vv` keeps full diffs, and `-q` prints one character per test.",
      ],
    },
    {
      title: "Fixtures, tmp_path, monkeypatch - and coverage",
      text: [
        "`scores` is function-scoped, so each test gets a fresh dictionary; `module_cfg` is module-scoped, so its setup runs once and its teardown runs after the last test in the file. `tmp_path` is a real directory unique to each test, and `monkeypatch` edits an environment variable without leaking it. `-s` shows the prints so you can see the lifecycle; normally pytest captures them.",
      ],
      code: {
        lang: "python",
        file: "test_report.py",
        code: `# report.py
import json
import os

def save_report(path, scores: dict[str, float]) -> None:
    path.write_text(json.dumps(scores, sort_keys=True))

def load_report(path, default=None):
    if not path.exists():
        return default
    return json.loads(path.read_text())

def api_base() -> str:
    return os.environ.get("API_BASE", "http://localhost:8000")

# test_report.py
import json
import pytest
from report import save_report, load_report

@pytest.fixture
def scores():
    print("\\nSETUP: scores fixture built")
    yield {"0.1.1": 1.0, "0.2.1": 0.67}
    print("\\nTEARDOWN: scores fixture dropped")

@pytest.fixture(scope="module")
def module_cfg():
    print("SETUP: module_cfg built once")
    yield {"mode": "test"}
    print("\\nTEARDOWN: module_cfg dropped once")

def test_save_report_writes_sorted_json(tmp_path, scores, module_cfg):
    out = tmp_path / "report.json"
    save_report(out, scores)
    assert json.loads(out.read_text()) == scores
    assert out.read_text().startswith('{"0.1.1"')

def test_load_report_missing_returns_default(tmp_path, module_cfg):
    assert load_report(tmp_path / "missing.json", default={}) == {}

# test_env.py
from report import api_base

def test_api_base_from_env(monkeypatch):
    monkeypatch.setenv("API_BASE", "https://api.devatlas.dev")
    assert api_base() == "https://api.devatlas.dev"

def test_api_base_default(monkeypatch):
    monkeypatch.delenv("API_BASE", raising=False)
    assert api_base() == "http://localhost:8000"

# welcome.py
from datetime import datetime

def welcome(user: str, now: datetime, mailer) -> str:
    greeting = "Good morning" if now.hour < 12 else "Good evening"
    text = f"{greeting}, {user}!"
    mailer.send(user, text)
    return text

# test_welcome.py
from datetime import datetime
from unittest.mock import Mock
from welcome import welcome

def test_morning_greeting_is_mailed():
    mailer = Mock()                                           # boundary: email
    text = welcome("asha", datetime(2026, 10, 18, 9), mailer)  # boundary: clock, passed in
    assert text == "Good morning, asha!"
    mailer.send.assert_called_once_with("asha", "Good morning, asha!")`,
      },
      output: "$ python -m pytest -v --no-header -s test_report.py test_env.py\n============================= test session starts =============================\ncollecting ... collected 4 items\n\ntest_report.py::test_save_report_writes_sorted_json SETUP: module_cfg built once\n\nSETUP: scores fixture built\nPASSED\nTEARDOWN: scores fixture dropped\n\ntest_report.py::test_load_report_missing_returns_default PASSED\nTEARDOWN: module_cfg dropped once\n\ntest_env.py::test_api_base_from_env PASSED\ntest_env.py::test_api_base_default PASSED\n\n============================== 4 passed in 0.08s ==============================\n\n$ python -m pytest -q test_pricing.py test_parse.py test_report.py test_env.py test_welcome.py --cov=pricing --cov=report --cov-branch --cov-report=term-missing\n..................                                                       [100%]\n=============================== tests coverage ================================\n______________ coverage: platform win32, python 3.11.15-final-0 _______________\n\nName         Stmts   Miss Branch BrPart  Cover   Missing\n--------------------------------------------------------\npricing.py      15      0      6      0   100%\nreport.py       10      1      2      1    83%   10\n--------------------------------------------------------\nTOTAL           25      1      8      1    94%\n18 passed in 0.17s",
      notes: [
        "Setup order is dependency order: `module_cfg` is built before the first test, then the function-scoped `scores`; teardown is reverse order. The module fixture's teardown runs after the last test in the file, which is why it appears at the end.",
        "`tmp_path` avoids `open('test.json', 'w')` in the repository. It is unique per test, so parallel runs with `pytest-xdist` cannot collide, and pytest keeps only the last few runs for debugging.",
        "`monkeypatch` records an undo for every change and replays it after the test, even on failure. It is the right tool for environment variables and third-party globals; a constructor argument is still a better seam when you control the code.",
        "In `test_welcome`, the clock and the mailer are parameters, so no patching is needed. `Mock()` is used only for the email boundary, and `assert_called_once_with` checks the exact message that would have been sent. That is the difference between testing your logic and testing a mock.",
        "The coverage report is not an instruction to reach 100%. `report.py` line 10 (reading an existing report) is not exercised by these tests. Either add a test for that path or decide it is not worth it - but make that a decision, not an accident.",
        "`conftest.py` is where the `scores` and `module_cfg` fixtures belong once more than one file needs them; pytest finds them without an import. Keep it small: a 500-line conftest is a sign that fixtures are doing too much.",
      ],
    },
    {
      title: "Compare scopes, doubles and patching",
      text: [
        "Pick fixture scope by the cost of setup and the risk of shared state. Pick the double by the question the test asks. Patching is the last resort, not the default.",
      ],
      code: {
        lang: "text",
        file: "decisions.txt",
        code: `FIXTURE SCOPES
scope      runs                     good for                        risk
function   once per test            most fixtures                   none extra
class      once per test class      shared class setup             state between methods
module     once per module file     schema, seed data, server      state between tests
package    once per package         package-wide resources         hidden ordering
session    once per pytest run      app, connection pool, browser  state across files

DOUBLE / PATCH CHOICES
approach          what it is                                  use when
dependency inj.   pass a real or fake collaborator in          first choice; creates a seam
fake              small working implementation                store/client with real logic
stub              canned answers, no logic                     force one branch/response
spy               records calls, real work still happens        assert a side effect happened
mock              pre-programmed expectations                  interaction itself is the contract
monkeypatch       temporary attribute/env patch, auto-undone    third-party global or environment`,
      },
      notes: [
        "A session-scoped fixture that returns a mutable list is a bug waiting for a second test file. Return immutable data, or reset inside the fixture before each test.",
        "`Mock()` from `unittest.mock` and `mocker` from pytest-mock both work; pytest-mock only adds automatic undo. Use whichever your project already standardises on.",
      ],
    },
    {
      title: "Trace one pytest run",
      text: [
        "This is the lifecycle behind the outputs above. Collection happens before any test runs, fixtures are resolved by name and cached per scope, and teardown runs even when the test fails. Coverage hooks into the same run.",
      ],
      code: {
        lang: "mermaid",
        file: "pytest-run.mmd",
        code: `flowchart TD
  A["Collect test_*.py, test_* functions"] --> B["Resolve fixture names via conftest and plugins"]
  B --> C["Setup: run fixture code before yield"]
  C --> D["Call test: arrange, act, assert"]
  D --> E["Teardown: after yield; monkeypatch undo"]
  E --> F["Report: dots, traceback, coverage, exit code"]`,
      },
      notes: [
        "A failure in setup is reported as an ERROR, not a FAILED test; that distinction tells you whether the test body ever ran.",
        "The same lifecycle applies to a class, a module and a session. Only the scope and the cache lifetime change.",
      ],
    },
  ],
  companies: [
    "**CI gates (GitHub Actions, GitLab CI, Buildkite, illustrative):** every pull request runs the test suite and a failure blocks merging (lesson 0.3.2). Fast suites matter: teams split slow integration tests into a separate job so developers get unit feedback in under a minute. In monorepos, expensive suites run only when their folder changed, behind one always-running result job that branch protection requires.",
    "**Regression tests for every bug (widely adopted practice, illustrative):** a common rule is 'every bug fix comes with a test that fails before the fix and passes after', so the same bug never returns. The 100-point discount story is exactly this case: the test is written at the boundary first, and the fix is verified against it.",
    "**Testcontainers (Docker-based integration tests, illustrative):** it starts a real PostgreSQL, MySQL, Redis or Kafka in a container for the test run, which catches SQL, driver and migration issues that mocks hide. pytest fixtures start and stop the container once per session, keeping the fast unit suite separate.",
    "**pytest plugin ecosystem (pytest-cov, pytest-xdist, pytest-randomly, pytest-mock, illustrative):** coverage, parallel workers, random test order and mock cleanup are plugins rather than core features. Pin their versions in CI: a plugin upgrade can change collection or warning behaviour without any change in your code.",
  ],
  mistakes: [
    { mistake: "Testing implementation details", why: "Mocking every internal call feels thorough", wrong: "Refactors break tests although behaviour is unchanged", fix: "Assert on outputs and observable side effects at boundaries; inject collaborators instead of patching internals" },
    { mistake: "No boundary cases", why: "Testing only the happy path", wrong: "Off-by-one bugs at thresholds reach production", fix: "Parametrize below, at, and above every threshold: 99, 100, 101" },
    { mistake: "Flaky tests depending on time, randomness or network", why: "Calling datetime.now() or real APIs", wrong: "Random failures; people start ignoring red builds", fix: "Inject clock and randomness (seed); fake the network; run the suite in random order to expose shared state" },
    { mistake: "Chasing 100% coverage", why: "It is an easy number to track", wrong: "Tests that execute lines without asserting anything meaningful, and time spent on unreachable error branches", fix: "Use coverage to find untested important code; review assertions and missing lines; floor only critical modules" },
    { mistake: "A required CI check on a workflow with a `paths:` filter", why: "Skipping the test workflow for docs-only PRs saves CI minutes", wrong: "The skipped workflow never reports, so the required check waits forever and those PRs cannot merge", fix: "Drop `paths:` from the trigger, detect changed files in a job, run the tests conditionally, and require a final `if: always()` job that fails only if the tests failed" },
    { mistake: "Using float for money", why: "It is the default number type", wrong: "Rounding errors in totals", fix: "Decimal (or integer cents) with explicit rounding" },
    { mistake: "Putting mutable state in a session-scoped fixture", why: "Setup is expensive and sharing feels efficient", wrong: "One test's changes leak into another; the failure depends on file order", fix: "Keep module/session fixtures immutable or read-only, or reset the state inside the fixture for each test" },
    { mistake: "Using pytest.raises without a match", why: "Any exception of that type appears to prove the behaviour", wrong: "An unrelated ValueError elsewhere satisfies the test", fix: "Assert the type and the message (`match='negative'`), and check `exc.value` when the payload matters" },
    { mistake: "Writing test files into the repository", why: "It is the shortest path to a file", wrong: "Dirty working trees, collisions in parallel runs, and tests that pass only on one machine", fix: "Use tmp_path for per-test files and tmp_path_factory for wider scopes" },
    { mistake: "Silencing warnings globally", why: "The warning summary is noisy", wrong: "A real deprecation or a resource leak is hidden until it breaks in production", fix: "Assert expected warnings with pytest.warns, and turn the rest into errors with `-W error` or `filterwarnings = ['error']`" },
  ],
  bestPractices: [
    { tag: "Maintainability", text: "One behaviour per test, named after the behaviour; Arrange-Act-Assert layout; a failing assertion should explain itself." },
    { tag: "Reliability", text: "Inject time, randomness and I/O so tests are deterministic; every bug fix ships with a regression test." },
    { tag: "Performance", text: "Keep the unit suite under a minute; mark slow tests and run them in a separate CI job; use function scope unless setup is genuinely expensive." },
    { tag: "Reliability", text: "Pin pytest and its plugins, register markers and enable `--strict-markers`, and treat unexpected warnings as errors." },
    { tag: "Maintainability", text: "Measure branch coverage on critical packages, review the missing lines, and never reward a percentage without reading the assertions." },
  ],
  interview: [
    { q: "What makes a good pytest test?", a: "Fast, deterministic, independent of other tests, testing one behaviour through the public interface, with a descriptive name and a clear Arrange-Act-Assert structure. It fails for the right reason, and it survives refactors that keep behaviour. In pytest terms: plain `assert` with informative values, fixtures instead of duplicated setup, parametrize for input tables, and no hidden dependence on execution order." },
    { q: "How do fixture scopes and teardown work, and when is monkeypatch the right tool?", a: "Fixtures are resolved by parameter name from the module, then conftest.py upward, then plugins; the first definition wins. A fixture is cached once per scope and its teardown (code after `yield`, or `request.addfinalizer`) runs in reverse setup order. Use function scope by default, module or session for expensive read-only resources such as a container or connection pool, and reset any mutable state. `monkeypatch` is for temporary changes to environment variables or third-party globals that you cannot pass in; it records an undo and replays it after the test. If you control the code, inject the dependency instead." },
    { q: "How do you test exceptions and warnings, and what does coverage prove?", a: "Use `pytest.raises(ValueError, match='negative')` around the call: it fails if nothing is raised, if the type differs, or if the message does not match, and `exc.value` lets you assert on details. Use `pytest.warns(UserWarning, match='capped')` for warnings, and turn unexpected warnings into errors in CI. Coverage tells you which lines and branches ran; it does not tell you whether the assertions are meaningful. Read the `Missing` column, set floors for critical modules, and use mutation testing when the assertions themselves need checking." },
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
    "Files `test_*.py`, functions `test_*`; plain `assert`; one behaviour per test.",
    "Arrange-Act-Assert; name the behaviour, not the function.",
    "@pytest.mark.parametrize for many cases; test thresholds -1, =, +1; `-k`, `-x`, `--lf`.",
    "pytest.raises(Error, match=...) for errors; pytest.warns(Warning, match=...) for warnings.",
    "Fixtures by parameter name; `yield` for teardown; scopes function (default), class, module, package, session.",
    "tmp_path per test, tmp_path_factory for wider scopes; monkeypatch for env/attributes, auto-undone.",
    "conftest.py shares fixtures without imports; keep it small and local.",
    "Mock boundaries (network, clock, email), not your own logic; dependency injection before patching.",
    "Markers: `@pytest.mark.slow`, run `-m 'not slow'`; register markers and use `--strict-markers`.",
    "Coverage: `--cov=pkg --cov-branch --cov-report=term-missing`; read Missing, do not chase 100%.",
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
        text: [
          "conftest.py holds the fixtures every module shares: sample `Article` objects for dedupe, and a `make_client` fixture that builds an httpx.AsyncClient on MockTransport so the feed tests never touch the network. `make_client` depends on `feed_handler`, so a test can override the fake server by redefining one fixture.",
          "test_feeds.py covers per-feed errors, the empty case and the `devatlas-ingest` CLI (sys.argv and the HTTP boundary are patched, the formatting logic stays real). test_dedupe.py uses the shared `articles` fixture; test_tags.py and test_models.py come from the previous capstones.",
          "`addopts` in pyproject.toml makes every `pytest` run measure coverage of the devatlas_ai package (with branch coverage), print missing lines and fail under 90%. The suite was at 94.5% when the threshold was set; raise it as coverage grows so it can only go up.",
          "The workflow has three jobs. `changes` diffs the PR against its base branch with `git diff --name-only` and outputs `ai=true` only when services/ai or the workflow file changed (pushes to main always run). `test` runs only when `ai` is true: it installs the package with its dev extras, runs mypy, then pytest. `ai-tests-result` has `if: always()`, so it runs on every PR; it passes when `test` succeeded or was skipped, and fails if change detection failed or `test` failed or was cancelled.",
          "Make `ai-tests-result` the required status check in branch protection, not `test`. The trigger deliberately has no `paths:` filter: when a workflow is skipped by `paths:`, its checks are never reported, so a required check stays at 'Expected — Waiting for status to be reported' and blocks every PR that does not touch services/ai.",
        ],
        code: {
          lang: "python", file: "services/ai/tests/conftest.py",
          code: `"""Fixtures shared by every test module in services/ai/tests."""
from collections.abc import Callable
from datetime import datetime

import httpx
import pytest

from devatlas_ai.models import Article

Handler = Callable[[httpx.Request], httpx.Response]


@pytest.fixture
def articles() -> list[Article]:
    """Three articles: the second duplicates the first by title and is older."""
    return [
        Article("Rust 2.0", "https://a.dev/rust/?utm_source=x", datetime(2026, 10, 2, 10)),
        Article("rust 2.0", "https://b.dev/other", datetime(2026, 10, 1, 10)),
        Article("Python 4", "https://a.dev/py", datetime(2026, 10, 3, 10)),
    ]


@pytest.fixture
def feed_handler() -> Handler:
    """Fake feed server: URLs containing 'bad' fail with 500, others return a tiny RSS body."""
    def handler(request: httpx.Request) -> httpx.Response:
        if "bad" in str(request.url):
            return httpx.Response(500)
        return httpx.Response(200, text="<rss/>")
    return handler


@pytest.fixture
def make_client(feed_handler: Handler) -> Callable[[], httpx.AsyncClient]:
    """Build an AsyncClient on MockTransport, so no test touches the network."""
    return lambda: httpx.AsyncClient(transport=httpx.MockTransport(feed_handler))

# ---- services/ai/tests/test_feeds.py ----
import asyncio
from collections.abc import Callable

import httpx
import pytest

from devatlas_ai import feeds
from devatlas_ai.feeds import fetch_all


def test_fetch_all_reports_errors_per_feed(make_client: Callable[[], httpx.AsyncClient]) -> None:
    results = asyncio.run(fetch_all(["https://ok.test/rss", "https://bad.test/rss"], client=make_client()))
    assert results == {"https://ok.test/rss": "<rss/>", "https://bad.test/rss": "error: HTTPStatusError"}


def test_fetch_all_with_no_urls(make_client: Callable[[], httpx.AsyncClient]) -> None:
    assert asyncio.run(fetch_all([], client=make_client())) == {}


def test_cli_prints_size_or_error(
    monkeypatch: pytest.MonkeyPatch,
    capsys: pytest.CaptureFixture[str],
    make_client: Callable[[], httpx.AsyncClient],
) -> None:
    real_fetch_all = feeds.fetch_all

    async def fake_fetch_all(urls: list[str]) -> dict[str, str]:
        return await real_fetch_all(urls, client=make_client())  # boundary: HTTP, faked

    monkeypatch.setattr(feeds, "fetch_all", fake_fetch_all)
    monkeypatch.setattr("sys.argv", ["devatlas-ingest", "https://ok.test/rss", "https://bad.test/rss"])
    feeds.cli()
    assert capsys.readouterr().out == "6\\thttps://ok.test/rss\\nerror: HTTPStatusError\\thttps://bad.test/rss\\n"

# ---- services/ai/tests/test_dedupe.py ----
import pytest

from devatlas_ai.dedupe import dedupe, norm_url
from devatlas_ai.models import Article


@pytest.mark.parametrize(
    ("raw", "expected"),
    [
        ("https://A.dev/x/?utm_source=t&id=3", "https://a.dev/x?id=3"),
        ("https://a.dev/x/", "https://a.dev/x"),
        ("https://a.dev/x#top", "https://a.dev/x"),
    ],
)
def test_norm_url(raw: str, expected: str) -> None:
    assert norm_url(raw) == expected


def test_dedupe_keeps_earliest(articles: list[Article]) -> None:
    assert [a.url for a in dedupe(articles)] == ["https://b.dev/other", "https://a.dev/py"]


def test_dedupe_by_url(articles: list[Article]) -> None:
    same_url = Article("Different title", "https://a.dev/py/?utm_medium=rss", articles[2].published_at)
    assert len(dedupe([articles[2], same_url])) == 1

# ---- services/ai/pyproject.toml (test settings) ----
[project.optional-dependencies]
dev = ["pytest>=8", "pytest-cov>=5", "mypy>=1.10"]

[tool.pytest.ini_options]
testpaths = ["tests"]
addopts = "--cov=devatlas_ai --cov-report=term-missing --cov-fail-under=90"

[tool.coverage.run]
branch = true

[tool.mypy]
strict = true
files = ["src", "tests"]

# ---- .github/workflows/ai-tests.yml ----
name: ai-service tests
# No paths: filter on the trigger. A workflow skipped by paths: never reports its
# checks, so a required check would stay "Expected" and block unrelated PRs forever.
on:
  pull_request:
  push:
    branches: [main]
permissions:
  contents: read
jobs:
  changes:
    runs-on: ubuntu-latest
    outputs:
      ai: \${{ steps.diff.outputs.ai }}
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0   # full history, so the PR base commit is available to diff against
      - id: diff
        env:
          EVENT: \${{ github.event_name }}
          BASE_SHA: \${{ github.event.pull_request.base.sha }}
        run: |
          if [ "$EVENT" != "pull_request" ]; then
            echo "ai=true" >> "$GITHUB_OUTPUT"   # pushes to main always run the suite
          elif git diff --name-only "$BASE_SHA" HEAD | grep -qE '^(services/ai/|\\.github/workflows/ai-tests\\.yml$)'; then
            echo "ai=true" >> "$GITHUB_OUTPUT"
          else
            echo "ai=false" >> "$GITHUB_OUTPUT"
          fi
  test:
    needs: changes
    if: needs.changes.outputs.ai == 'true'
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: services/ai
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: "3.12"
          cache: pip
          cache-dependency-path: services/ai/pyproject.toml
      - run: python -m pip install -e ".[dev]"
      - run: mypy
      # addopts in pyproject.toml adds --cov, prints the report and fails under 90%
      - run: python -m pytest
  # Make THIS job the required status check: it runs on every PR, even when test is skipped.
  ai-tests-result:
    needs: [changes, test]
    if: always()
    runs-on: ubuntu-latest
    steps:
      - env:
          CHANGES: \${{ needs.changes.result }}
          TEST: \${{ needs.test.result }}
        run: |
          echo "changes=$CHANGES test=$TEST"
          # test is "skipped" when services/ai did not change: that is a pass
          if [ "$CHANGES" != "success" ] || [ "$TEST" = "failure" ] || [ "$TEST" = "cancelled" ]; then
            exit 1
          fi`,
        },
        output: "...................                                                      [100%]\n================================ tests coverage ================================\n_______________ coverage: platform linux, python 3.13.16-final-0 _______________\n\nName                          Stmts   Miss Branch BrPart  Cover   Missing\n-------------------------------------------------------------------------\nsrc/devatlas_ai/__init__.py       0      0      0      0   100%\nsrc/devatlas_ai/dedupe.py        19      0      4      0   100%\nsrc/devatlas_ai/feeds.py         30      3      6      2    86%   26, 33, 40\nsrc/devatlas_ai/models.py        53      1     12      2    95%   43, 44->exit\nsrc/devatlas_ai/tags.py          15      0      6      0   100%\n-------------------------------------------------------------------------\nTOTAL                           117      4     28      4    94%\nRequired test coverage of 90% reached. Total coverage: 94.48%\n19 passed in 0.11s",
        pitfalls: ["`--cov=.` instead of `--cov=devatlas_ai` counts the test files themselves and inflates the number", "Setting the threshold above the current coverage on day one, so the first CI run is red and people learn to ignore it", "Creating an AsyncClient in a fixture without closing it; here fetch_all only closes clients it created, and MockTransport holds no sockets", "Putting `paths:` on the trigger of a workflow whose check is required: PRs outside those paths never get the check and can never merge. Filter inside the workflow and require an always-running result job instead"],
      },
    },
  },
  deeper: [
    { label: "pytest documentation", url: "https://docs.pytest.org/" },
    { label: "pytest: How to use fixtures", url: "https://docs.pytest.org/en/stable/how-to/fixtures.html" },
    { label: "pytest: How to parametrize", url: "https://docs.pytest.org/en/stable/how-to/parametrize.html" },
    { label: "pytest: How to monkeypatch", url: "https://docs.pytest.org/en/stable/how-to/monkeypatch.html" },
    { label: "pytest: tmp_path", url: "https://docs.pytest.org/en/stable/how-to/tmp_path.html" },
    { label: "pytest-cov documentation", url: "https://pytest-cov.readthedocs.io/en/latest/" },
  ],
  nextPreview: "Next: JavaScript's event loop. Why setTimeout(fn, 0) does not run immediately, and how to run async work in parallel without bugs.",
};
