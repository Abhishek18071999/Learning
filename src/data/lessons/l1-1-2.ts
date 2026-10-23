import type { Lesson } from "../../types";

export const lesson: Lesson = {
  id: "1.1.2",
  title: "OOP, dataclasses and protocols",
  minutes: 75,
  level: "Beginner",
  prerequisites: ["1.1.1 Python essentials"],
  summary: "Model real domains with classes, use dataclasses to remove boilerplate, understand __eq__/__hash__, prefer composition over inheritance, and use Protocols to write code that is easy to test and swap.",
  terms: [
    { term: "Class", def: "A blueprint that bundles data (attributes) and behaviour (methods). An object is one instance of it." },
    { term: "Instance attribute", def: "A value stored on one object, usually in `obj.__dict__`. `self.title = title` creates one per instance." },
    { term: "Class attribute", def: "A value stored on the class and shared by every instance unless an instance shadows it. A mutable class attribute is shared mutable state." },
    { term: "self", def: "The first parameter of an instance method: the specific object the method is called on. Python passes it for you when you write `obj.method()`." },
    { term: "__repr__", def: "The developer-facing string for an object, shown by `repr(obj)` and inside containers. Without it you get `<Point object at 0x...>`, which hides the state." },
    { term: "__hash__", def: "Returns an integer used by `set` and `dict`. Objects that compare equal must return the same hash. Defining `__eq__` sets `__hash__` to `None` unless you define one." },
    { term: "Dataclass", def: "A class decorated with @dataclass; Python generates __init__, __repr__ and __eq__ from the field list." },
    { term: "Inheritance", def: "A class reusing and extending another class (`class Admin(User)`). An 'is-a' relationship, checked nominally by the type system." },
    { term: "Composition", def: "A class holding other objects as fields and delegating work to them. A 'has-a' relationship." },
    { term: "Protocol", def: "A typing.Protocol describes the methods an object must have, without requiring inheritance (structural typing, 'duck typing' that the type checker can verify)." },
    { term: "ABC", def: "Abstract base class from `abc`. A nominal base you must inherit from; `@abstractmethod` makes instantiation fail until every abstract method is implemented." },
    { term: "Structural typing", def: "Compatibility decided by members, not by ancestry: if it has `send(to, text)`, it can be used where a Notifier is expected." },
  ],
  problem: [
    "The DevAtlas progress code passes dictionaries everywhere: `{\"user\": 7, \"lesson\": \"1.1.1\", \"score\": 0.8}`. One function writes `\"score\"`, another reads `\"scores\"`, and a third stores 80 instead of 0.8. Bugs appear far from where the data was created. Then someone puts two equal progress records into a `set` to deduplicate them and the count is wrong, because the class compares by identity and the hashes disagree.",
    "Later the team wants to send notifications by email in production but print them in tests. The code calls the email library directly in 20 places. Classes give data a shape and rules; `__eq__` and `__hash__` make value objects behave inside sets and dictionaries; protocols let you swap implementations without touching callers; composition keeps the pieces independent as the number of combinations grows.",
  ],
  concept: {
    analogy: [
      "A class is a **form template** at a government office: it lists the fields every application must have and the rules for filling them in. Each filled-in form is an object. A class attribute is the stack of blank forms in the drawer, shared by everyone; an instance attribute is what one person wrote on their own copy. A Protocol is a **job description**: 'must be able to send(message)'. Anyone who can do that job can be hired, whether they came from the email department or the SMS department.",
      "Composition is **Lego, not a family tree**. A report *has* a formatter and *has* a delivery channel, so you can click any formatter onto any channel. An inheritance hierarchy tries to pre-build every combination as a separate model, and every new brick forces you to build another row of models.",
    ],
    precise: [
      "A class defines **attributes** and **methods**. Instance attributes live on the object (usually in `obj.__dict__`) and are created by `self.x = ...`; methods are functions stored on the class and bound to the instance at call time, so `obj.method()` passes `obj` as `self`. A class attribute lives on the class and is visible through every instance, but assigning `obj.attr = value` creates an instance attribute that shadows it. Mutating a mutable class attribute (a list, dict or set) changes the one shared object, which is why `tags: list[str] = []` on a class is almost always a bug.",
      "The data model hooks are a contract. `__init__` initialises an already-created object (the real constructor is `__new__`); `__repr__` should be unambiguous and show state; `__eq__` decides value equality; `__hash__` must agree with it. If two objects are equal they must have equal hashes, and a hash must not change while the object is in a set or dict. Python enforces the first half of the rule: a class that defines `__eq__` without `__hash__` gets `__hash__ = None` and becomes unhashable. A `@dataclass` generates `__init__`, `__repr__` and `__eq__`; `frozen=True` also generates `__hash__`, `slots=True` removes `__dict__` and stores fields in fixed slots, and `field(default_factory=...)` gives each instance its own mutable default.",
      "**Protocols** are structural: a class satisfies `Notifier` by having a compatible `send` method, with no import of `Notifier` and no base class. A type checker such as mypy or pyright verifies the shape statically; `@runtime_checkable` adds a shallow `isinstance` check that only tests method presence, not signatures. An **ABC** is nominal: you inherit from it, `@abstractmethod` blocks instantiation until the method exists, and it can share implementation. Use a Protocol at a seam you want to keep decoupled, and an ABC when you need runtime enforcement or shared base behaviour.",
      "**Composition over inheritance** is the default because inheritance couples a child to the parent's internals (the fragile base class problem) and multiplies classes when two dimensions vary independently. A `ReportPipeline` that *has* a `Formatter` and a `Delivery` lets 3 formats and 2 deliveries produce 6 combinations from 6 small classes instead of 10 classes in an inheritance tree, and adding a delivery touches one class. Keep inheritance for genuine 'is-a' trees with shared behaviour, shallow and stable, such as exception hierarchies. And when there is no state, no identity and no polymorphism, skip the class: a pure function plus a frozen dataclass is often the whole design.",
    ],
  },
  underTheHood: {
    text: [
      "1. **Attribute lookup.** `obj.x` first checks the instance `__dict__`, then the class `__dict__`, then each base class in the Method Resolution Order (`type(obj).__mro__`). Methods are just functions stored on the class: `Lesson.__dict__['__init__']` exists, `a.__dict__['__init__']` does not, and `a.__init__` is a bound method that already carries `self=a`. That is why `a.done = True` changes only `a` (an instance entry shadows the class), while `a.tags.append(...)` mutates the single list owned by the class and every instance sees it. The hands-on output makes both cases visible in `__dict__`.",
      "2. **`__init__` is not the constructor.** `__new__` allocates the object and `__init__` fills it in. `@dataclass` reads the class annotations at definition time and writes `__init__`, `__repr__` and `__eq__` as ordinary functions, so the result behaves exactly like hand-written methods. `__post_init__` runs at the end of the generated `__init__`, which is the right place for validation. A default computed per instance needs `field(default_factory=...)`; a literal `tags: list[str] = []` is rejected by dataclasses because every instance would share one list. `frozen=True` blocks `self.x = ...` by raising `FrozenInstanceError`, generates `__hash__`, and forces you to use `object.__setattr__` if `__post_init__` must normalise a field.",
      "3. **`slots=True` and memory.** `@dataclass(slots=True)` (3.10+) creates `__slots__` and removes the per-instance `__dict__`, which cuts memory for many small objects and makes typo'd attributes fail immediately. Two caveats: a subclass that does not declare slots gets a `__dict__` back, and slots are incompatible with multiple inheritance from classes that already define layout. `frozen=True, slots=True` is the common pair for value objects in hot paths.",
      "4. **Equality and hashing are one contract.** `set` and `dict` find a bucket with `hash(obj)` and then confirm with `__eq__`. If `__eq__` says two objects are equal but their hashes differ, both can sit in the same set: the `BadHash` example prints `2` for two equal objects. A mutable object used as a key can also be found, mutated and then lost forever. A plain class compares by identity and hashes by identity; adding `__eq__` removes the inherited hash; `frozen=True` on a dataclass restores it. `field(compare=False)` and `field(hash=False)` let you exclude a field from equality or hashing deliberately.",
      "5. **Protocols are checked by shape.** PEP 544 defines structural subtyping. A `Protocol` class is a specification: you cannot instantiate it, and a concrete class does not appear in its MRO (the hands-on prints `False` for `Notifier in FakeNotifier.__mro__`). mypy and pyright compare parameter names, types and return types, so a `send(self, to)` that is missing `text` is rejected at type-check time even though Python would run it. `@runtime_checkable` only enables `isinstance`/`issubclass`; it checks that the attributes exist, not their signatures, so it is a weak guard, not a substitute for static checking.",
      "6. **ABCs are nominal and enforceable.** `class Repo(ABC)` with `@abstractmethod def save(...)` raises `TypeError: Can't instantiate abstract class Repo with abstract method save` until a subclass implements it. An ABC can also provide shared methods (`describe`), which a Protocol cannot do in the same way. `Repo.register(SomeClass)` creates a virtual subclass without inheritance, useful for adapting third-party types. Use an ABC when the base owns behaviour or when instantiation must be blocked at runtime; use a Protocol when the caller should not have to import your base at all.",
      "7. **Composition makes the axes independent.** The inheritance version of the report code has one leaf class per format x delivery pair: adding a delivery means editing or adding one class per format. The composition version has a `Formatter` Protocol, a `Delivery` Protocol and one `ReportPipeline` that delegates to both. The output of the refactor is identical, but the class count drops from 10 to 6 and a new delivery is one class instead of three. This is dependency injection in miniature: the pipeline receives collaborators through `__init__`, so tests pass a fake and production passes the real adapter.",
      "8. **When not to use OOP.** Python is not Java. A pure transformation is clearer as a function; a group of related functions is a module; JSON at the edge is fine as a dict; a closure can hold a little state without a class. Reach for a class when you have identity (this user, this connection), invariants that must be enforced across several fields, or polymorphism at a seam. Reach for a frozen dataclass for values, a Protocol for the seam, and composition for the wiring. If a class only holds data and has no rules, or only holds one method and no state, a dataclass or a function is probably enough.",
    ],
    diagram: {
      title: "How obj.method() is found",
      nodes: [
        { label: "obj.method()", sub: "call site" },
        { label: "instance __dict__", sub: "data first" },
        { label: "class __dict__", sub: "functions live here" },
        { label: "base classes", sub: "MRO order" },
        { label: "bound method", sub: "self = obj" },
      ],
      edges: ["look up name", "miss", "miss", "bind"],
      caption: "Instance attributes shadow class attributes; methods are class attributes found through the MRO and then bound to the instance.",
    },
  },
  handsOn: [
    {
      title: "Attributes live on the instance, methods on the class",
      text: [
        "Run this and read the `__dict__` lines carefully. `done` is on `a`; `track` and `__init__` are on `Lesson`; `tags` is a mutable class attribute, so appending through `a` changes the one list that `b` also sees. The two points then show the default `object.__repr__` next to the generated dataclass repr. The address is replaced with `0xADDR` so the output is stable on every machine.",
      ],
      code: {
        lang: "python",
        file: "attributes.py",
        code: `import re
from dataclasses import dataclass

class Lesson:
    track = "python"            # class attribute: one value for the whole class
    tags: list[str] = []        # class attribute AND mutable: shared by every instance
    def __init__(self, title: str) -> None:
        self.title = title      # instance attribute: one value per object
        self.done = False
a = Lesson("Classes and instances")
b = Lesson("Dataclasses")
a.done = True                   # rebinding on a...
print(a.done, b.done)           # ...leaves b alone
Lesson.tags.append("oop")       # mutation reaches the one shared list
print(a.tags, b.tags, Lesson.tags)
a.tags.append("shared")         # a.tags is still the class list: no instance copy
print(b.tags)
print("title" in a.__dict__, "done" in a.__dict__, "tags" in a.__dict__)
print("track" in a.__dict__, "track" in Lesson.__dict__)
print("__init__" in Lesson.__dict__, "__init__" in a.__dict__)

class PlainPoint:
    def __init__(self, x: int, y: int) -> None:
        self.x, self.y = x, y

@dataclass
class DataPoint:
    x: int
    y: int

p = PlainPoint(1, 2)
print(re.sub(r"0x[0-9a-fA-F]+", "0xADDR", repr(p)))
print(DataPoint(1, 2))
print(p == PlainPoint(1, 2), DataPoint(1, 2) == DataPoint(1, 2))`,
      },
      output: "True False\n['oop'] ['oop'] ['oop']\n['oop', 'shared']\nTrue True False\nFalse True\nTrue False\n<__main__.PlainPoint object at 0xADDR>\nDataPoint(x=1, y=2)\nFalse True",
      notes: [
        "`a.tags.append` is not an assignment, so it never creates an instance attribute; `a.done = True` is an assignment, so it does. That distinction explains most 'why did my other object change?' bugs.",
        "A dataclass gives you `DataPoint(x=1, y=2)` and value equality for free. A plain class gives identity equality, so two points with the same coordinates print `False`.",
      ],
    },
    {
      title: "__eq__ without __hash__ breaks sets",
      text: [
        "This is the rule that surprises people in production. A class that defines `__eq__` becomes unhashable, because Python sets `__hash__ = None` to stop you from using value equality with an identity hash. A frozen dataclass restores the hash; a mutable dataclass stays unhashable. The last class defines a hash that disagrees with equality, which is worse than no hash at all: two equal objects both survive in a set.",
      ],
      code: {
        lang: "python",
        file: "equality.py",
        code: `from dataclasses import dataclass

class Point:
    def __init__(self, x: int, y: int) -> None:
        self.x, self.y = x, y
    def __eq__(self, other: object) -> bool:
        if not isinstance(other, Point):
            return NotImplemented
        return (self.x, self.y) == (other.x, other.y)
p1, p2 = Point(1, 2), Point(1, 2)
print(p1 == p2)
print(Point.__hash__)                 # defining __eq__ sets __hash__ to None
try:
    {p1, p2}
except TypeError as exc:
    print(type(exc).__name__, exc)

@dataclass(frozen=True)
class FrozenPoint:
    x: int
    y: int
f1, f2 = FrozenPoint(1, 2), FrozenPoint(1, 2)
print(f1 == f2, hash(f1) == hash(f2), len({f1, f2}), f1 in {f2})

@dataclass
class MutablePoint:
    x: int
    y: int
print(MutablePoint.__hash__)
try:
    {MutablePoint(1, 2): "key"}
except TypeError as exc:
    print(type(exc).__name__, exc)

class BadHash:
    def __init__(self, x: int) -> None:
        self.x = x
    def __eq__(self, other: object) -> bool:
        return isinstance(other, BadHash) and self.x == other.x
    def __hash__(self) -> int:
        return id(self)               # equal objects, different hashes: broken contract
print(len({BadHash(1), BadHash(1)}))`,
      },
      output: "True\nNone\nTypeError unhashable type: 'Point'\nTrue True 1 True\nNone\nTypeError unhashable type: 'MutablePoint'\n2",
      notes: [
        "`len({f1, f2})` is 1 because equal frozen points hash the same and collide as intended. `BadHash(1)` compared equal but hashed differently, so the set kept both: the contract is what makes deduplication work.",
        "If a field should not affect equality (a cache, a timestamp), use `field(compare=False)`; if it should not affect the hash, `field(hash=False)`.",
      ],
    },
    {
      title: "A Protocol is satisfied by shape, not by inheritance",
      text: [
        "Neither notifier inherits from `Notifier`; both are accepted by the constructor and by the plain `announce` function because they have a compatible `send`. The `__mro__` line proves there is no hidden base class. The final check shows why a Protocol is a static tool: without `@runtime_checkable`, `issubclass` raises, and with it the check would only look for the method's presence.",
      ],
      code: {
        lang: "python",
        file: "protocols.py",
        code: `from typing import Protocol

class Notifier(Protocol):
    def send(self, to: str, text: str) -> None: ...

class EmailNotifier:
    def __init__(self, smtp_host: str) -> None:
        self.smtp_host = smtp_host
    def send(self, to: str, text: str) -> None:
        print(f"[smtp {self.smtp_host}] to={to}: {text}")

class FakeNotifier:
    def __init__(self) -> None:
        self.sent: list[tuple[str, str]] = []
    def send(self, to: str, text: str) -> None:
        self.sent.append((to, text))

class ProgressService:
    def __init__(self, notifier: Notifier) -> None:
        self.notifier = notifier
    def complete_lesson(self, email: str, lesson_id: str) -> None:
        self.notifier.send(email, f"Well done! You finished lesson {lesson_id}.")

def announce(notifier: Notifier, email: str, text: str) -> None:
    notifier.send(email, text)

ProgressService(EmailNotifier("smtp.example.com")).complete_lesson("a@x.dev", "1.1.2")
fake = FakeNotifier()
ProgressService(fake).complete_lesson("a@x.dev", "1.1.2")
announce(fake, "b@x.dev", "Streak: 5 days")
assert fake.sent == [
    ("a@x.dev", "Well done! You finished lesson 1.1.2."),
    ("b@x.dev", "Streak: 5 days"),
]
print("test passed")
print(FakeNotifier.__mro__)
print(Notifier in FakeNotifier.__mro__)
try:
    print(issubclass(FakeNotifier, Notifier))
except TypeError as exc:
    print(type(exc).__name__, exc)`,
      },
      output: "[smtp smtp.example.com] to=a@x.dev: Well done! You finished lesson 1.1.2.\ntest passed\n(<class '__main__.FakeNotifier'>, <class 'object'>)\nFalse\nTypeError Instance and class checks can only be used with @runtime_checkable protocols",
      notes: [
        "mypy or pyright flags a class whose `send` signature does not match. Python itself only checks when the call happens, which is why the static check is the point.",
        "For a runtime check, use `@runtime_checkable`; remember that it tests attribute presence, not parameter types or return types.",
      ],
    },
    {
      title: "Choose the contract: ABC, Protocol or plain inheritance",
      text: [
        "All three create a relationship, but they cost different amounts of coupling. Keep this table nearby when you design a seam or review a hierarchy.",
      ],
      code: {
        lang: "text",
        file: "contracts.txt",
        code: `Aspect                ABC (nominal)                  Protocol (structural)        Plain inheritance
Declaration           class Repo(ABC)                class Repo(Protocol)         class Child(Base)
Import the base?      yes                            typing.Protocol only         yes
Relationship          explicit "is-a"                implicit "can-do"            explicit "is-a"
Runtime isinstance    works                          needs @runtime_checkable     works
Signature checked     by override and linters        by mypy/pyright, statically  by override and linters
Shared code           yes, methods on the base       no, signatures only          yes
Couples caller to     the base class                 nothing                      the base class
Best for              exceptions, template methods   adapters, fakes, boundaries  shallow domain trees`,
      },
      notes: ["If the caller must not import your module just to type a parameter, choose a Protocol. If you need `isinstance` or shared behaviour, choose an ABC."],
    },
    {
      title: "See the composition refactor as a diagram",
      text: [
        "The before design had one leaf class per format x delivery pair. The after design has two small protocols and one pipeline that holds a formatter and a delivery. The full runnable before/after code and its real output are in the challenge homework below: 10 classes become 6, and a new delivery adds one class instead of three.",
      ],
      code: {
        lang: "mermaid",
        file: "report-pipeline.mmd",
        code: `classDiagram
  class ReportPipeline {
    +Formatter formatter
    +Delivery delivery
    +send(name, rows) str
  }
  class Formatter {
    <<Protocol>>
    +render(rows) str
  }
  class Delivery {
    <<Protocol>>
    +deliver(name, data) str
  }
  class CsvFormatter
  class PdfFormatter
  class HtmlFormatter
  class EmailDelivery
  class S3Delivery
  ReportPipeline --> Formatter : has-a
  ReportPipeline --> Delivery : has-a
  Formatter <|.. CsvFormatter : satisfies
  Formatter <|.. PdfFormatter : satisfies
  Formatter <|.. HtmlFormatter : satisfies
  Delivery <|.. EmailDelivery : satisfies
  Delivery <|.. S3Delivery : satisfies`,
      },
      notes: ["Read `-->` as 'holds a' and `<|..` as 'satisfies this protocol'. No arrow means no coupling."],
    },
  ],
  companies: [
    "**Python's standard library (verified in this lesson).** `dataclasses` produced the `DataPoint(x=1, y=2)` repr and value equality in the first hands-on, and `typing.Protocol` produced the structural acceptance in the third. The tools this lesson teaches are the ones CPython itself ships.",
    "**FastAPI and Pydantic (illustrative).** Request and response bodies are declared as models so invalid data is rejected at the edge. The same boundary rule applies here: convert JSON to typed objects once, then pass domain objects inward.",
    "**pytest and test doubles (illustrative).** A fake that records calls is usually a ten-line class satisfying a Protocol, not a mocking framework. That keeps tests readable and lets the production adapter stay untouched.",
    "**Django and SQLAlchemy (illustrative).** ORM entities are classes with identity and database state; a frozen dataclass is a value object with no identity. Mixing the two is how 'equal' rows become unequal objects, or vice versa, in a set.",
    "**Ports-and-adapters services (illustrative).** Teams define small protocols for databases, queues, email and model providers, with one real adapter and one fake per seam. Swapping a vendor changes one adapter, and the class count grows linearly instead of multiplicatively.",
  ],
  mistakes: [
    { mistake: "Passing dicts everywhere", why: "Dicts are quick to create", wrong: "Typos in keys and wrong units fail far from the cause", fix: "Use dataclasses or Pydantic models with types and validation" },
    { mistake: "Deep inheritance trees", why: "Inheritance looks like reuse", wrong: "A change in a base class breaks distant subclasses (fragile base class)", fix: "Prefer composition; keep inheritance shallow and for real 'is-a'" },
    { mistake: "Mutable shared defaults in classes", why: "`tags: list = []` as a class attribute or dataclass field", wrong: "All instances share one list (dataclasses refuse it with an error)", fix: "`field(default_factory=list)`" },
    { mistake: "Classes with only data and no rules, plus 'manager' functions that modify them", why: "Habit from procedural code", wrong: "Invariants are enforced in some places and forgotten in others", fix: "Put validation and state changes in the class (e.g. __post_init__, methods)" },
    { mistake: "Calling external services directly inside business logic", why: "Fastest to write", wrong: "Untestable code; switching providers means editing everywhere", fix: "Depend on a Protocol and inject the implementation" },
    { mistake: "Defining __eq__ and expecting set membership to work", why: "Equality feels like the whole story", wrong: "Python sets __hash__ to None, so `{a, b}` raises TypeError and dict keys fail", fix: "Define __hash__ consistently, or use `@dataclass(frozen=True)`" },
    { mistake: "Using a frozen dataclass with a list field as a dict key", why: "frozen sounds fully immutable", wrong: "frozen blocks rebinding, but `hash(tuple_of_fields)` still hits the unhashable list", fix: "Store a tuple, or exclude the field from hash with `field(hash=False)`" },
    { mistake: "Using Protocol for runtime checks without @runtime_checkable", why: "It looks like an interface", wrong: "`isinstance` or `issubclass` raises TypeError at runtime", fix: "Use an ABC for nominal runtime checks, or add @runtime_checkable for a shallow presence check" },
  ],
  bestPractices: [
    { tag: "Maintainability", text: "Model domain data with dataclasses (frozen when possible); validate in __post_init__." },
    { tag: "Maintainability", text: "Depend on Protocols, inject implementations through the constructor." },
    { tag: "Reliability", text: "Keep invariants inside the class; expose behaviour via methods, not public mutation." },
    { tag: "Performance", text: "Use `@dataclass(slots=True)` (3.10+) for many small objects to cut memory use." },
    { tag: "Security", text: "Keep secrets out of __repr__ and logs; mark sensitive fields with `field(repr=False)`." },
  ],
  interview: [
    { q: "Composition vs inheritance?", a: "Inheritance models 'is-a' and shares implementation, but the child depends on the parent's internals, so a base-class change can break distant subclasses (the fragile base class problem). Composition models 'has-a': an object holds collaborators and delegates, so each part can be replaced and tested alone. It also scales better when two dimensions vary independently: 3 formats x 2 deliveries is 10 classes in an inheritance tree but 6 small classes with a formatter and a delivery composed into one pipeline. I default to composition, use Protocols at the seams, and keep inheritance shallow for genuine hierarchies such as exceptions." },
    { q: "Protocol vs ABC vs plain inheritance in Python?", a: "A Protocol is structural: a class satisfies it by having compatible members, with no import or base class, and mypy/pyright verify it statically. An ABC is nominal: you inherit from it, @abstractmethod blocks instantiation until the methods exist, and it can share implementation; isinstance works at runtime. Plain inheritance is nominal too, but without the abstract enforcement. I use Protocols for adapters, fakes and boundaries where the caller should stay decoupled, and ABCs when I need runtime enforcement or shared base behaviour. @runtime_checkable only checks attribute presence, not signatures." },
    { q: "What does @dataclass generate, and what is the __eq__/__hash__ rule?", a: "@dataclass generates __init__, __repr__ and __eq__ from annotated fields; optionally order, frozen (which also generates __hash__), slots and keyword-only fields. __post_init__ runs after the generated init for validation, and field(default_factory=...) gives each instance its own mutable default. The rule is that equal objects must have equal hashes: Python sets __hash__ = None when a class defines __eq__ without one, making it unhashable, which is why a plain value class breaks in a set. A frozen dataclass is hashable; a mutable one is not, and a hash that disagrees with equality silently lets duplicates into a set." },
  ],
  quickCheck: [
    {
      kind: "output",
      prompt: "What is printed?",
      code: { lang: "python", code: "from dataclasses import dataclass\n\n@dataclass\nclass P:\n    x: int\n    y: int\n\nprint(P(1, 2) == P(1, 2))" },
      options: ["False", "True", "Error", "None"],
      answer: 1,
      explanation: "Dataclasses generate __eq__ comparing fields. A plain class would compare identity and print False.",
    },
    {
      kind: "mcq",
      prompt: "Your service needs to send SMS in production and record messages in tests. Best design?",
      options: ["if TESTING: ... else: ... inside the service", "Inject an object satisfying a Notifier protocol", "Subclass the SMS library", "Global variable for the SMS client"],
      answer: 1,
      explanation: "Dependency injection with a small interface keeps the service clean and testable.",
    },
    {
      kind: "bug",
      prompt: "Why does this raise an error when the class is defined?",
      code: { lang: "python", code: "from dataclasses import dataclass\n\n@dataclass\nclass Course:\n    title: str\n    tags: list[str] = []" },
      options: ["str needs a default", "Mutable default list is not allowed; use field(default_factory=list)", "list[str] is invalid syntax", "Dataclasses cannot have lists"],
      answer: 1,
      explanation: "Dataclasses detect mutable defaults (list, dict, set) and raise ValueError to prevent shared state.",
    },
  ],
  cheatSheet: [
    "`@dataclass(frozen=True)` for value-like domain objects.",
    "Validate in `__post_init__`; computed values with `@property`.",
    "`field(default_factory=list)` for mutable defaults; `field(repr=False)` for secrets.",
    "`__eq__` without `__hash__` means unhashable: no sets, no dict keys.",
    "Equal objects must have equal hashes; `frozen=True` generates a consistent one.",
    "`@dataclass(frozen=True, slots=True)` for many small immutable objects.",
    "Composition by default; inheritance only for shallow 'is-a'.",
    "Protocol = interface without inheritance; checked by mypy/pyright.",
    "ABC = nominal base with runtime enforcement and shared code.",
    "Inject collaborators via `__init__`; use fakes in tests. No state, no rules, no class.",
  ],
  homework: {
    basic: {
      title: "Model a Course",
      brief: ["Create frozen dataclasses `Lesson(id, title, minutes)` and `Course(title, lessons: tuple[Lesson, ...])` with a `total_minutes` property and validation that minutes > 0 and lesson ids are unique."],
      criteria: ["Frozen dataclasses with type hints", "Validation raises clear ValueErrors", "3 pytest tests"],
      hints: ["Use a tuple for lessons so the frozen Course is truly immutable."],
      solution: {
        text: ["Validation lives in __post_init__ so an invalid Course can never exist. The demo also shows the two failure paths: a non-positive duration and a duplicate lesson id."],
        code: {
          lang: "python",
          file: "course.py",
          code: `from dataclasses import dataclass
@dataclass(frozen=True)
class Lesson:
    id: str
    title: str
    minutes: int
    def __post_init__(self) -> None:
        if self.minutes <= 0:
            raise ValueError(f"lesson {self.id}: minutes must be > 0")
@dataclass(frozen=True)
class Course:
    title: str
    lessons: tuple[Lesson, ...]
    def __post_init__(self) -> None:
        ids = [l.id for l in self.lessons]
        if len(ids) != len(set(ids)):
            raise ValueError("lesson ids must be unique")
    @property
    def total_minutes(self) -> int:
        return sum(l.minutes for l in self.lessons)
course = Course(
    "Python foundations",
    (Lesson("1.1.1", "Python essentials", 60), Lesson("1.1.2", "OOP", 65)),
)
print(course.title, course.total_minutes)

try:
    Lesson("1.1.3", "Broken", 0)
except ValueError as exc:
    print(exc)

try:
    Course("Duplicated", (Lesson("1.1.1", "A", 10), Lesson("1.1.1", "B", 10)))
except ValueError as exc:
    print(exc)`,
        },
        output: "Python foundations 125\nlesson 1.1.3: minutes must be > 0\nlesson ids must be unique",
      },
    },
    intermediate: {
      title: "Repository protocol",
      brief: ["Define a `ProgressRepository` Protocol with `save(result)` and `for_user(user_id)`. Implement `InMemoryProgressRepository`. Write a `ProgressService.average_score(user_id)` that depends only on the protocol, and test it with the in-memory version."],
      criteria: ["Service never imports the concrete repository", "Average of no results returns 0.0", "Tests pass"],
      hints: ["Reuse QuizResult from the hands-on section."],
      solution: {
        text: ["The in-memory repository doubles as a test fake; a MySQL implementation later must only satisfy the same two methods."],
        code: {
          lang: "python",
          file: "repo.py",
          code: `from typing import Protocol
from collections import defaultdict
from progress import QuizResult
class ProgressRepository(Protocol):
    def save(self, result: QuizResult) -> None: ...
    def for_user(self, user_id: int) -> list[QuizResult]: ...
class InMemoryProgressRepository:
    def __init__(self) -> None:
        self._by_user: defaultdict[int, list[QuizResult]] = defaultdict(list)
    def save(self, result: QuizResult) -> None:
        self._by_user[result.user_id].append(result)
    def for_user(self, user_id: int) -> list[QuizResult]:
        return list(self._by_user[user_id])
class ProgressService:
    def __init__(self, repo: ProgressRepository) -> None:
        self.repo = repo
    def average_score(self, user_id: int) -> float:
        results = self.repo.for_user(user_id)
        return sum(r.score for r in results) / len(results) if results else 0.0
def test_average():
    repo = InMemoryProgressRepository()
    svc = ProgressService(repo)
    assert svc.average_score(1) == 0.0
    repo.save(QuizResult(1, "a", 1.0)); repo.save(QuizResult(1, "b", 0.5))
    assert svc.average_score(1) == 0.75`,
        },
      },
    },
    challenge: {
      title: "Refactor an inheritance mess",
      brief: ["Given `class Report`, format subclasses and one leaf per format x delivery pair, the combinations explode. Redesign with composition: a Report pipeline has a Formatter (CSV/PDF/HTML) and a Delivery (email/S3). Show that adding a new delivery needs one new class, not one per format."],
      criteria: ["Two small protocols", "Report composes them", "The before/after run produces the same messages with fewer classes", "Explanation of the class-count difference"],
      hints: ["With inheritance, 3 formats x 2 deliveries = 6 leaf classes plus bases (10). With composition it is 3 formatters + 2 deliveries + 1 pipeline (6).", "Delegation replaces the mixin: the pipeline calls `formatter.render` and `delivery.deliver`."],
      solution: {
        text: ["The before design keeps the format logic in base classes and repeats a `send` method in every leaf. The after design moves format and delivery behind two Protocols and lets one `ReportPipeline` combine any pair. The printed messages match, so the refactor is behaviour-preserving.", "Class count: before 10 (Report + 3 format bases + 6 leaves), after 6 (pipeline + 3 formatters + 2 deliveries). A new delivery adds one class after the refactor, but three classes before it."],
        code: {
          lang: "python",
          file: "reports.py",
          code: `ROWS = [{"user": 1, "score": 0.9}]
def inline(rows: list[dict]) -> str:
    return ",".join(f"{k}={v}" for k, v in rows[0].items())
# ---- before: one subclass per format x delivery combination ----
class Report:
    def __init__(self, rows: list[dict]) -> None:
        self.rows = rows
class CsvReport(Report):
    def render(self) -> str:
        return inline(self.rows)
class PdfReport(Report):
    def render(self) -> str:
        return "PDF[" + inline(self.rows) + "]"
class HtmlReport(Report):
    def render(self) -> str:
        cells = "".join(f"<td>{v}</td>" for v in self.rows[0].values())
        return "<tr>" + cells + "</tr>"
class EmailedCsvReport(CsvReport):
    def send(self) -> str:
        return "email: " + self.render()
class S3CsvReport(CsvReport):
    def send(self) -> str:
        return "s3: " + self.render()
class EmailedPdfReport(PdfReport):
    def send(self) -> str:
        return "email: " + self.render()
class S3PdfReport(PdfReport):
    def send(self) -> str:
        return "s3: " + self.render()
class EmailedHtmlReport(HtmlReport):
    def send(self) -> str:
        return "email: " + self.render()
class S3HtmlReport(HtmlReport):
    def send(self) -> str:
        return "s3: " + self.render()
print("before:", EmailedCsvReport(ROWS).send())
print("before:", S3PdfReport(ROWS).send())
# ---- after: formats and deliveries vary independently ----
from typing import Protocol
class Formatter(Protocol):
    def render(self, rows: list[dict]) -> str: ...
class Delivery(Protocol):
    def deliver(self, name: str, data: str) -> str: ...
class CsvFormatter:
    def render(self, rows: list[dict]) -> str:
        return inline(rows)
class PdfFormatter:
    def render(self, rows: list[dict]) -> str:
        return "PDF[" + inline(rows) + "]"
class HtmlFormatter:
    def render(self, rows: list[dict]) -> str:
        cells = "".join(f"<td>{v}</td>" for v in rows[0].values())
        return "<tr>" + cells + "</tr>"
class EmailDelivery:
    def deliver(self, name: str, data: str) -> str:
        return f"email {name}: {data}"
class S3Delivery:
    def deliver(self, name: str, data: str) -> str:
        return f"s3 {name}: {data}"
class ReportPipeline:
    def __init__(self, formatter: Formatter, delivery: Delivery) -> None:
        self.formatter = formatter
        self.delivery = delivery
    def send(self, name: str, rows: list[dict]) -> str:
        return self.delivery.deliver(name, self.formatter.render(rows))
print("after:", ReportPipeline(CsvFormatter(), EmailDelivery()).send("scores.csv", ROWS))
print("after:", ReportPipeline(PdfFormatter(), S3Delivery()).send("scores.pdf", ROWS))
before = [
    Report, CsvReport, PdfReport, HtmlReport,
    EmailedCsvReport, S3CsvReport, EmailedPdfReport, S3PdfReport,
    EmailedHtmlReport, S3HtmlReport,
]
after = [ReportPipeline, CsvFormatter, PdfFormatter, HtmlFormatter, EmailDelivery, S3Delivery]
print("classes before:", len(before), "after:", len(after))
print("new delivery: before +3, after +1")`,
        },
        output: "before: email: user=1,score=0.9\nbefore: s3: PDF[user=1,score=0.9]\nafter: email scores.csv: user=1,score=0.9\nafter: s3 scores.pdf: PDF[user=1,score=0.9]\nclasses before: 10 after: 6\nnew delivery: before +3, after +1",
        pitfalls: ["Forgetting to delegate and copying format logic into the pipeline, which recreates the explosion", "Putting delivery back into the formatter classes, which couples two axes again"],
      },
    },
    capstone: {
      title: "DevAtlas: domain models",
      brief: ["In services/ai/devatlas_ai/models.py, add frozen dataclasses for Lesson, Chunk and QuizResult with validation, plus a Notifier protocol. Use them in the existing tags and dedupe code instead of raw dicts."],
      criteria: ["No raw dicts crossing module boundaries", "mypy passes", "Tests for validation errors"],
      hints: ["Convert to/from dicts only at the edges (JSON in, JSON out)."],
      solution: {
        text: [
          "Typed models at module boundaries are what make the later FastAPI service straightforward: Pydantic request models can map directly onto them.",
          "models.py holds frozen dataclasses that validate in __post_init__, so an invalid Lesson, Chunk or QuizResult cannot exist. Lesson reuses `normalise` and `add_tag` from tags.py; because it is frozen, `with_tag` returns a new Lesson via `dataclasses.replace`.",
          "The dedupe code from lesson 1.1.1 now takes and returns `Article` objects. The only place a raw dict is read is `Article.from_dict`, the JSON edge. Run with `pytest -q && mypy` from services/ai (the skeleton from the previous capstone).",
        ],
        code: {
          lang: "python", file: "services/ai/devatlas_ai/models.py",
          code: `"""Typed domain models. Raw dicts are converted here, at the edge, and nowhere else."""
import re
from dataclasses import dataclass, field, replace
from datetime import datetime, timezone
from typing import Any, Protocol
from devatlas_ai.tags import add_tag, normalise
LESSON_ID = re.compile(r"^\\d+\\.\\d+\\.\\d+$")
@dataclass(frozen=True)
class Lesson:
    id: str
    title: str
    minutes: int
    tags: tuple[str, ...] = ()
    def __post_init__(self) -> None:
        if not LESSON_ID.match(self.id):
            raise ValueError(f"lesson id must look like 1.2.3, got {self.id!r}")
        if not self.title.strip():
            raise ValueError(f"lesson {self.id}: title must not be empty")
        if self.minutes <= 0:
            raise ValueError(f"lesson {self.id}: minutes must be > 0")
        # frozen: assign the cleaned tags through object.__setattr__
        object.__setattr__(self, "tags", tuple(normalise(self.tags)))
    def with_tag(self, tag: str) -> "Lesson":
        """Return a copy with one more tag; the original is unchanged."""
        return replace(self, tags=tuple(add_tag(tag.strip().lower(), list(self.tags))))
@dataclass(frozen=True)
class Chunk:
    """A slice of lesson text, the unit the AI service will embed and search."""
    lesson_id: str
    index: int
    text: str
    def __post_init__(self) -> None:
        if self.index < 0:
            raise ValueError("chunk index must be >= 0")
        if not self.text.strip():
            raise ValueError(f"chunk {self.lesson_id}#{self.index} is empty")
@dataclass(frozen=True)
class QuizResult:
    user_id: int
    lesson_id: str
    score: float  # 0.0 .. 1.0
    taken_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    def __post_init__(self) -> None:
        if not 0.0 <= self.score <= 1.0:
            raise ValueError(f"score must be between 0 and 1, got {self.score}")
    @property
    def passed(self) -> bool:
        return self.score >= 0.67
@dataclass(frozen=True)
class Article:
    title: str
    url: str
    published_at: datetime
    @classmethod
    def from_dict(cls, raw: dict[str, Any]) -> "Article":
        """The only place a raw article dict is read (JSON in)."""
        return cls(str(raw["title"]), str(raw["url"]), datetime.fromisoformat(raw["published_at"]))
class Notifier(Protocol):
    def send(self, to: str, text: str) -> None: ...
# ---- services/ai/devatlas_ai/dedupe.py ----
from collections.abc import Iterable
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit
from devatlas_ai.models import Article
def norm_url(url: str) -> str:
    p = urlsplit(url.strip())
    query = urlencode([(k, v) for k, v in parse_qsl(p.query) if not k.startswith("utm_")])
    return urlunsplit((p.scheme.lower(), p.netloc.lower(), p.path.rstrip("/"), query, ""))
def dedupe(articles: Iterable[Article]) -> list[Article]:
    """Keep the earliest article per normalised URL or case-insensitive title."""
    seen_urls: set[str] = set()
    seen_titles: set[str] = set()
    out: list[Article] = []
    for a in sorted(articles, key=lambda a: a.published_at):
        u, t = norm_url(a.url), a.title.strip().lower()
        if u in seen_urls or t in seen_titles:
            continue
        seen_urls.add(u)
        seen_titles.add(t)
        out.append(a)
    return out
# ---- services/ai/tests/test_models.py ----
from datetime import datetime
import pytest
from devatlas_ai.dedupe import dedupe
from devatlas_ai.models import Article, Chunk, Lesson, Notifier, QuizResult
def test_lesson_normalises_tags_and_with_tag_returns_copy() -> None:
    lesson = Lesson("1.1.2", "OOP", 65, tags=(" Python", "python", "OOP"))
    assert lesson.tags == ("python", "oop")
    tagged = lesson.with_tag("Protocols")
    assert tagged.tags == ("python", "oop", "protocols")
    assert lesson.tags == ("python", "oop")
@pytest.mark.parametrize(
    ("kwargs", "message"),
    [
        ({"id": "one", "title": "x", "minutes": 5}, "lesson id"),
        ({"id": "1.1.1", "title": "  ", "minutes": 5}, "title"),
        ({"id": "1.1.1", "title": "x", "minutes": 0}, "minutes"),
    ],
)
def test_lesson_validation(kwargs: dict[str, object], message: str) -> None:
    with pytest.raises(ValueError, match=message):
        Lesson(**kwargs)  # type: ignore[arg-type]


def test_chunk_and_quiz_validation() -> None:
    with pytest.raises(ValueError, match="empty"):
        Chunk("1.1.1", 0, "   ")
    with pytest.raises(ValueError, match="between 0 and 1"):
        QuizResult(7, "1.1.1", 80)
    assert QuizResult(7, "1.1.1", 0.8).passed


def test_dedupe_works_on_models() -> None:
    raw = [
        {"title": "Rust 2.0", "url": "https://a.dev/rust/?utm_source=x", "published_at": "2026-10-02T10:00:00"},
        {"title": "rust 2.0", "url": "https://b.dev/other", "published_at": "2026-10-01T10:00:00"},
        {"title": "Python 4", "url": "https://a.dev/py", "published_at": "2026-10-03T10:00:00"},
    ]
    result = dedupe(Article.from_dict(r) for r in raw)
    assert [a.url for a in result] == ["https://b.dev/other", "https://a.dev/py"]
    assert result[0].published_at == datetime(2026, 10, 1, 10)


def test_fake_satisfies_notifier() -> None:
    class FakeNotifier:
        def __init__(self) -> None:
            self.sent: list[tuple[str, str]] = []

        def send(self, to: str, text: str) -> None:
            self.sent.append((to, text))

    fake = FakeNotifier()
    notifier: Notifier = fake  # mypy checks the structural match here
    notifier.send("a@x.dev", "hi")
    assert fake.sent == [("a@x.dev", "hi")]`,
        },
        output: "...........                                                              [100%]\n11 passed in 0.07s\nSuccess: no issues found in 6 source files",
        pitfalls: ["Assigning `self.tags = ...` in __post_init__ of a frozen dataclass raises FrozenInstanceError; use object.__setattr__ or normalise before constructing", "Using `list[str]` for tags on a frozen dataclass: the object is 'frozen' but the list can still be mutated, and the instance is no longer hashable", "Calling `from_dict` deep in business logic instead of at the edge, which brings raw dicts back"],
      },
    },
  },
  deeper: [
    { label: "Python docs: Classes tutorial", url: "https://docs.python.org/3/tutorial/classes.html" },
    { label: "Python docs: dataclasses", url: "https://docs.python.org/3/library/dataclasses.html" },
    { label: "Python docs: special method names and __hash__", url: "https://docs.python.org/3/reference/datamodel.html#object.__hash__" },
    { label: "Python docs: abc, abstract base classes", url: "https://docs.python.org/3/library/abc.html" },
    { label: "PEP 544: Protocols", url: "https://peps.python.org/pep-0544/" },
    { label: "mypy: Protocols and structural subtyping", url: "https://mypy.readthedocs.io/en/stable/protocols.html" },
  ],
  nextPreview: "Next: async Python and packaging. Fetch 50 URLs in the time of one, and package your code so anyone can install it.",
};
