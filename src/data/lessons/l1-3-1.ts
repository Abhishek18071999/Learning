import type { Lesson } from "../../types";

export const lesson: Lesson = {
  id: "1.3.1",
  title: "C# fundamentals and the .NET runtime",
  minutes: 85,
  level: "Beginner",
  prerequisites: ["Any one programming language (Python lessons 1.1.x are enough)", ".NET 8 SDK or later installed (dotnet --version)"],
  summary: "Learn C# the way backend teams use it: what a variable actually holds, structs vs classes vs records, the three kinds of equality, string immutability and interning, nullable reference types, boxing, and the managed heap and GC - with real .NET output for every experiment.",
  terms: [
    { term: ".NET", def: "Microsoft's open-source, cross-platform runtime and libraries. C# compiles to IL (intermediate language); the runtime executes it. The SDK also contains the CLI: `dotnet new`, `build`, `run` and `test`." },
    { term: "CLR / JIT", def: "The Common Language Runtime loads and executes IL. The Just-In-Time compiler turns IL into machine code, usually method by method, and optimises hot paths. Tiered compilation starts fast and re-JITs code that runs often." },
    { term: "Value type", def: "A type whose variable holds the data itself (`int`, `double`, `bool`, `DateTime`, structs, enums). Assigning or passing it copies the value unless you use `ref`, `in` or `out`." },
    { term: "Reference type", def: "A type whose variable holds a reference to an object (`class`, `string`, arrays, delegates). Assigning copies the reference, so two variables can name the same object." },
    { term: "struct", def: "A value type with fields and methods, but no inheritance. Good for small, immutable values. A mutable struct is a trap: reading it from a list, property or dictionary gives you a copy." },
    { term: "record", def: "A type where the compiler generates value equality, `==`, `Equals`, `GetHashCode`, a readable `ToString`, deconstruction and `with`. A `record class` is a reference type; a `record struct` is a value type." },
    { term: "Value vs reference equality", def: "Value equality compares the data (`record`, `record struct`, `string`, boxed primitives through `Equals`). Reference equality asks whether two references point at the same object (`ReferenceEquals`). A class gets reference equality by default." },
    { term: "String interning", def: "The runtime keeps one copy of each compile-time string literal in an intern pool, so equal literals share an object. `string.Intern` can add a runtime string to the pool; `new string(...)` and most runtime concatenations are not interned." },
    { term: "Nullable reference types (NRT)", def: "A compiler feature that makes nullability part of the type: `string?` may be null, `string` should not be. It emits warnings (CS8600, CS8602, CS8604), not runtime checks; the annotations are erased in IL." },
    { term: "Boxing / unboxing", def: "Boxing copies a value type into a heap object (`object o = 42`); unboxing copies the value back out (`(int)o`). Both copy, and the unbox must use the exact original type." },
    { term: "Managed heap", def: "The region where the GC allocates reference-type objects and boxed values. Allocation is usually a pointer bump in a contiguous segment; the GC later reclaims objects that are no longer reachable." },
    { term: "GC generations", def: "The heap is split into generation 0 (small, collected often), generation 1 (short-lived survivors) and generation 2 (long-lived). Surviving a collection promotes an object. Objects of 85,000 bytes or more go to the Large Object Heap." },
  ],
  problem: [
    "The DevAtlas main API will be written in ASP.NET Core, the C# web framework used widely in enterprise backends. A new engineer updates a `Progress` struct inside a list and is puzzled that the change disappears. Another ships code that throws `NullReferenceException` in production because a user had no email. A third compares two records with `==` and gets `True`, then compares two classes with `==` and gets `False`, and cannot explain why.",
    "All three are the same question: what does a variable hold, where does the value live, and which equality are you asking for? C# gives precise answers, but only if you know the model. This lesson builds that model from real experiments: copies, records, the intern pool, nullable warnings, boxes and GC generations.",
  ],
  concept: {
    analogy: [
      "A **value type** is a photocopy: hand someone a copy of a document and their scribbles do not change your original. A **reference type** is a shared Google Doc link: hand someone the link and their edits show up for everyone holding it.",
      "The stack/heap picture is a useful second analogy: a stack of trays for the current call, a warehouse for objects that outlive it. Treat it as a mental model, not a memory map. The JIT may keep a local in a register, a struct may sit inside a heap object or an array, and an `async` method moves its locals into a state machine on the heap. The language decides copy versus share; the runtime decides machine layout.",
    ],
    precise: [
      "C# is **statically typed** and compiled. `dotnet build` compiles C# to IL in a .dll; `dotnet run` starts the runtime, which JIT-compiles IL to native code. **Value types** (numbers, enums, structs, `DateTime`) hold their data directly and are copied on assignment, argument passing and return. **Reference types** (classes, arrays, strings, delegates) hold a reference; assignment copies the reference, so both variables reach the same object. The storage location is a consequence of the type and the context, not a property you can rely on at the address level.",
      "**Classes** are reference types with identity: two `new User(\"a\")` objects are different even with equal data. **Records** are for data: equality compares values, `ToString()` prints fields, and `with` creates a modified copy. A `record struct` gets value equality but is still a value type, while a `record class` is still a reference type. **Structs** are small value types; a mutable struct read from a `List<T>` indexer, a property or a dictionary is a copy, so mutations quietly vanish. `readonly struct` plus methods that return a new value removes that trap.",
      "**Equality has three forms.** `ReferenceEquals(a, b)` always asks identity and cannot be overloaded. `a.Equals(b)` is virtual: classes default to identity, while records, strings and value types override it to compare contents. `a == b` is an operator: a class gets identity unless it overloads it, `string` overloads it to compare contents, a record synthesises it for value equality, and a plain struct has no `==` unless you write one. `EqualityComparer<T>.Default` uses `IEquatable<T>` first, then `object.Equals`.",
      "**Strings** are reference types but immutable: every 'modification' allocates a new string. Compile-time literals are interned, so two identical literals can be the same object; runtime-built strings usually are not. **Nullable reference types** make nullability part of the type and warn at compile time, but the annotation is erased at runtime. **Boxing** copies a value into a heap object; generic collections avoid it by storing values inline. The **managed heap** is collected in generations, and `using` still exists because the GC does not know how to close a file handle or a socket.",
    ],
  },
  underTheHood: {
    text: [
      "1. **Stack frames and the heap.** Each thread has a stack. A call pushes a frame holding arguments, locals and the return address; returning pops it. A value-type local is usually stored inline in that frame, while a reference-type local stores a pointer and the object lives on the managed heap. That is the mechanism behind `int b = a` copying and `var u2 = u1` sharing. The simplification is real: the JIT may keep a local in a register, inline a small struct into another object, or place it in an array; an `async` method hoists its state into a heap object; a lambda captures variables into a closure object; a boxed struct is a heap object. Never depend on a stack address, and never conclude 'struct = stack, class = heap' as a law. Use language-level tests (`ReferenceEquals`, mutation behaviour) rather than addresses.",
      "2. **Structs copy at every boundary.** Structs are copied when you assign them, pass them by value, return them, read them from a `List<T>` indexer or dictionary value, get them from a property, or iterate with `foreach`. `array[0].Inc()` works because an array element is a storage location; `list[0].Inc()` mutates the copy returned by the indexer, and `list[0].Value = 5` does not even compile (CS1612). `ref`, `in`, `out` and `ref readonly` control the copying. The fix is not 'never use structs': small, immutable structs (a `Money` amount, a point, a `Guid` wrapper) avoid allocations and indirection. Keep them small (a common rule of thumb is 16 to 24 bytes) and make them `readonly`.",
      "3. **Classes and identity.** `new` allocates an object; the variable holds a reference. Two references are equal only if they name the same object, unless the class overrides equality. A mutable object used as a dictionary key is dangerous because its hash can change after insertion, making the entry unreachable by lookup. If a class represents an entity (a user, an order) with a stable id and behaviour, identity equality is usually what you want; implement `IEquatable<T>` and a matching `GetHashCode` only when you deliberately choose value semantics.",
      "4. **Records are compiler-generated data types.** For `record Lesson(string Id, string Title)`, the compiler synthesises `Equals(Lesson)`, `Equals(object)`, `GetHashCode`, `==`, `!=`, `ToString`, `Deconstruct` and a copy constructor used by `with`. Equality compares all instance fields, plus a hidden `EqualityContract` when the record participates in inheritance. `with` is a shallow copy: nested reference fields are still shared. A record is not automatically immutable - if you declare `set` or a mutable collection property, the data can still change. `record struct` has no inheritance and no `EqualityContract`; it gets field-based equality and `==`.",
      "5. **The intern pool.** String literals are interned per process: `\"devatlas\"` in two places is normally one object. `string.Intern(s)` returns the canonical pooled instance for `s`, adding it if needed; `string.IsInterned(s)` returns the pooled instance or `null` without adding. `new string(charArray)`, `Substring`, `ToUpperInvariant` and `string.Concat` on runtime values produce fresh, non-interned strings. Interning is a memory optimisation for a small set of repeated names, not a general deduplication strategy: the pool is process-wide and interned entries can outlive your request, so never intern unbounded user input (a memory-growth and denial-of-service risk).",
      "6. **Nullability is flow analysis, not a runtime guard.** With `<Nullable>enable</Nullable>`, `string?` says 'may be null' and `string` says 'should not be null'. The compiler warns when you dereference a maybe-null value (CS8602), assign null to a non-nullable type (CS8600), or pass a maybe-null argument to a non-null parameter (CS8604). `?.`, `??`, `is not null`, `string.IsNullOrWhiteSpace` and attributes such as `[NotNullWhen(true)]` narrow the flow. The `!` operator silences the warning and moves the risk to runtime. At a JSON, database or HTTP boundary, a non-nullable `string` can still arrive as null; validate there, then trust the type inside your core. Nullable value types (`int?`) are different: they are the real `Nullable<int>` struct.",
      "7. **Boxing copies twice.** `object boxed = 91` allocates a heap object containing an object header and a copy of the int; `(int)boxed` checks the type and copies the value out. Changing the original local or the unboxed copy does not touch the box. Non-generic APIs box: `ArrayList`, `object` parameters, and `string.Format` with struct arguments. Generic collections (`List<int>`, `Dictionary<string, int>`) store values inline in their backing arrays, so iterating them does not allocate a box per element. Boxing is not a bug by itself; boxing in a hot loop or per request is a measurable allocation cost.",
      "8. **The managed heap and the GC.** New objects go into generation 0, a small nursery. A collection starts from roots (stack locals, static fields, GC handles), marks reachable objects, and usually compacts generation 0, promoting survivors to generation 1 and later to generation 2. Generation 2 and the Large Object Heap (objects of 85,000 bytes or more) are collected far less often and are more expensive. Finalizers need special handling and can delay reclamation, which is why `IDisposable` and `using`/`await using` exist for files, sockets, database connections and HTTP responses. `GC.GetGeneration(obj)` reports 0, 1 or 2. Do not call `GC.Collect()` in normal application code; measure allocations with the GC counters or `dotnet-counters` instead.",
    ],
    diagram: {
      title: "One value's journey: copy, reference, heap, generations",
      nodes: [
        { label: "C# expression", sub: "int, struct, class, string" },
        { label: "Value type", sub: "copied inline" },
        { label: "Reference type", sub: "pointer copied" },
        { label: "Managed heap", sub: "header + fields" },
        { label: "GC generations", sub: "0 → 1 → 2" },
      ],
      edges: ["type decides", "or", "new or box", "survives collection"],
      caption: "A boxed value takes the reference path: the box is a heap object. The stack box is a simplification; the JIT may use registers or inline a value inside another object.",
    },
  },
  handsOn: [
    {
      title: "Copy semantics: structs, classes and records",
      text: [
        "Create a console project and replace `Program.cs`: `dotnet new console -n TypeProbe && cd TypeProbe`. New projects enable nullable by default. The first four output lines reproduce the original lesson's value/reference/record demo; the rest adds a mutable struct and a class with the same fields. Run `dotnet run`.",
      ],
      code: {
        lang: "csharp",
        file: "Program.cs",
        code: `using System.Runtime.CompilerServices;

// Value type: copy on assignment
int a = 5;
int b = a;
b++;
Console.WriteLine($"a={a}, b={b}");            // a=5, b=6

// Reference types: both variables hold the same reference
var u1 = new UserAccount("asha@example.com");
var u2 = u1;
u2.Email = "new@example.com";
Console.WriteLine(u1.Email);                    // new@example.com

// Records: value equality and non-destructive mutation
var r1 = new LessonRef("1.3.1", "C# fundamentals");
var r2 = new LessonRef("1.3.1", "C# fundamentals");
Console.WriteLine(r1 == r2);                    // True (classes would print False)
var r3 = r1 with { Title = "C# basics" };
Console.WriteLine(r3);                          // LessonRef { Id = 1.3.1, Title = C# basics }

// A mutable struct and a class with the same shape
var s1 = new ProgressStruct("1.3.1", 10);
var s2 = s1;                                    // copies the two fields
s2.Minutes = 70;
Console.WriteLine($"struct: s1={s1.Minutes}, s2={s2.Minutes}");

var c1 = new ProgressClass("1.3.1", 10);
var c2 = c1;                                    // copies the reference
c2.Minutes = 70;
Console.WriteLine($"class:  c1={c1.Minutes}, c2={c2.Minutes}");
Console.WriteLine($"same object: {ReferenceEquals(c1, c2)}");

// Array elements are variables, so they can be mutated in place
ProgressStruct[] shelf = [new("1.3.1", 10)];
shelf[0].Minutes = 70;
Console.WriteLine($"array: {shelf[0].Minutes}");

// The class object lives on the managed heap; generation 0 is the nursery
Console.WriteLine($"class generation: {GC.GetGeneration(c1)}");
Console.WriteLine($"identity hashes equal: {RuntimeHelpers.GetHashCode(c1) == RuntimeHelpers.GetHashCode(c2)}");

class UserAccount(string email)                 // primary constructor (C# 12)
{
    public string Email { get; set; } = email;
}

record LessonRef(string Id, string Title);

struct ProgressStruct(string id, int minutes)
{
    public string Id = id;
    public int Minutes = minutes;
}

sealed class ProgressClass(string id, int minutes)
{
    public string Id { get; } = id;
    public int Minutes { get; set; } = minutes;
}`,
      },
      output: "a=5, b=6\nnew@example.com\nTrue\nLessonRef { Id = 1.3.1, Title = C# basics }\nstruct: s1=10, s2=70\nclass:  c1=70, c2=70\nsame object: True\narray: 70\nclass generation: 0\nidentity hashes equal: True",
      notes: [
        "`s2 = s1` copied both fields, so changing `s2.Minutes` left `s1` at 10. `c2 = c1` copied only the reference, so both names see 70 and `ReferenceEquals` is true.",
        "The array element is a storage location, so `shelf[0].Minutes = 70` persists. The same mutation through a `List<ProgressStruct>` indexer would change a copy; assigning to a field through the indexer would be CS1612.",
        "`GC.GetGeneration(c1)` printed 0 because the object was allocated after the last collection. A fresh object starts in generation 0; do not read anything into the exact number across runs or machines.",
        "The struct has no object identity to compare. Boxing it would create a new object on each boxing conversion, which is the next experiment.",
        "All three C# experiments in this lesson were built with SDK 10.0.301 targeting `net9.0`, with `DOTNET_ROLL_FORWARD=LatestMajor` so the 9.0 app can run on the newer runtime. The output above is that run.",
      ],
    },
    {
      title: "Equality: records, classes and the intern pool",
      text: [
        "A record's `==` and `.Equals` compare data; a class without an override compares references. `ReferenceEquals` always asks identity and cannot be overloaded. The second half shows that equal string contents do not imply the same object.",
      ],
      code: {
        lang: "csharp",
        file: "Program.cs",
        code: `using System.Text;

// A record, a class and a record struct with identical data
var rec1 = new LessonRecord("1.3.1", "C# fundamentals");
var rec2 = new LessonRecord("1.3.1", "C# fundamentals");
var cls1 = new LessonClass("1.3.1", "C# fundamentals");
var cls2 = new LessonClass("1.3.1", "C# fundamentals");
var str1 = new LessonPoint(70);
var str2 = new LessonPoint(70);

Console.WriteLine($"record  ==        {rec1 == rec2}");
Console.WriteLine($"record  Equals    {rec1.Equals(rec2)}");
Console.WriteLine($"record  RefEquals {ReferenceEquals(rec1, rec2)}");
Console.WriteLine($"class   ==        {cls1 == cls2}");
Console.WriteLine($"class   Equals    {cls1.Equals(cls2)}");
Console.WriteLine($"class   RefEquals {ReferenceEquals(cls1, cls2)}");
Console.WriteLine($"struct  ==        {str1 == str2}");
Console.WriteLine($"struct  Equals    {str1.Equals(str2)}");

var edited = rec1 with { Title = "C# basics" };
Console.WriteLine($"with:             {edited}");
Console.WriteLine($"original:         {rec1}");
var (id, title) = rec1;
Console.WriteLine($"deconstruct:      {id} / {title}");

// Strings are reference types, but the runtime interns literals
string s1 = "devatlas";
string s2 = "devatlas";
string s3 = new string("devatlas".ToCharArray());   // fresh object, not interned
string s4 = string.Intern(s3);                      // reuses the literal from the intern pool
string part1 = "dev";
string part2 = "atlas";
string s5 = string.Concat(part1, part2);            // built at run time, not interned

Console.WriteLine($"literal/literal RefEquals:       {ReferenceEquals(s1, s2)}");
Console.WriteLine($"new string/literal RefEquals:    {ReferenceEquals(s1, s3)}");
Console.WriteLine($"Intern(new string)/literal:      {ReferenceEquals(s1, s4)}");
Console.WriteLine($"Concat/literal RefEquals:         {ReferenceEquals(s1, s5)}");
Console.WriteLine($"s1 == s3 (value equality):        {s1 == s3}");
Console.WriteLine($"IsInterned(\\"devatlas\\"):          {string.IsInterned(s1) is not null}");

string t = s1;
t += "!";
Console.WriteLine($"after +=: s1={s1}, t={t}, same={ReferenceEquals(s1, t)}");
Console.WriteLine($"StringBuilder: {new StringBuilder().Append("dev").Append("atlas")}");

record LessonRecord(string Id, string Title);
record struct LessonPoint(int Minutes);
sealed class LessonClass(string id, string title)
{
    public string Id { get; } = id;
    public string Title { get; } = title;
}`,
      },
      output: "record  ==        True\nrecord  Equals    True\nrecord  RefEquals False\nclass   ==        False\nclass   Equals    False\nclass   RefEquals False\nstruct  ==        True\nstruct  Equals    True\nwith:             LessonRecord { Id = 1.3.1, Title = C# basics }\noriginal:         LessonRecord { Id = 1.3.1, Title = C# fundamentals }\ndeconstruct:      1.3.1 / C# fundamentals\nliteral/literal RefEquals:       True\nnew string/literal RefEquals:    False\nIntern(new string)/literal:      True\nConcat/literal RefEquals:         False\ns1 == s3 (value equality):        True\nIsInterned(\"devatlas\"):          True\nafter +=: s1=devatlas, t=devatlas!, same=False\nStringBuilder: devatlas",
      notes: [
        "The record is `True` on `==` and `.Equals`, but `ReferenceEquals` is `False`: value equality does not pretend the two objects are the same object. The class is `False` on all three because it never overrode equality.",
        "`new string(...)` and runtime `string.Concat` produced distinct objects; literals and `string.Intern` shared the pool entry. `s1 == s3` is still `True` because `string` overloads `==` to compare contents - the most common source of confusion in this lesson.",
        "`t += \"!\"` did not modify `s1`; it created a new string and repointed `t`. In a loop, that is one allocation per iteration, which is why `StringBuilder` or `string.Join` exists.",
      ],
    },
    {
      title: "Nullability warnings and boxing",
      text: [
        "With `<Nullable>enable</Nullable>` (the default in `dotnet new console`), the compiler tracks null flow. It warns but still emits IL; the program below runs because `FindEmail(1)` returns a value. Build first to see the warnings, then run without rebuilding. If the project sets `TreatWarningsAsErrors`, the build stops here - that is exactly the point of the setting.",
      ],
      code: {
        lang: "csharp",
        file: "Program.cs",
        code: `using System.Collections;

string? FindEmail(int userId) => userId == 1 ? "asha@example.com" : null;

string? email = FindEmail(1);
Console.WriteLine(email.Length);            // CS8602: runtime value is not null, compiler cannot know

string name = null;                         // CS8600: null assigned to non-nullable string
Console.WriteLine($"name is null: {name is null}");

if (email is not null)
{
    Console.WriteLine($"checked length: {email.Length}");
}

string display = email ?? "(no email)";
Console.WriteLine(display);

// Boxing: copy a value type into an object on the managed heap
int score = 91;
object boxed = score;
score = 40;
Console.WriteLine($"boxed={boxed}, score={score}");

// Unboxing copies the value back out; the box keeps its own copy
int unboxed = (int)boxed;
unboxed = 0;
Console.WriteLine($"unboxed={unboxed}, boxed={boxed}");

object again = score;
Console.WriteLine($"ReferenceEquals(boxed, again)={ReferenceEquals(boxed, again)}");
Console.WriteLine($"boxed generation={GC.GetGeneration(boxed)}");

// A non-generic collection boxes every int it stores
ArrayList legacy = new() { 91, 92, 93 };
int total = 0;
foreach (object item in legacy) total += (int)item;
Console.WriteLine($"ArrayList total={total}");

// List<int> stores the ints inline in its array: no box per element
List<int> generic = [91, 92, 93];
Console.WriteLine($"List<int> sum={generic.Sum()} (no boxing)");`,
      },
      output: "$ dotnet build\nProgram.cs(6,19): warning CS8602: Dereference of a possibly null reference.\nProgram.cs(8,15): warning CS8600: Converting null literal or possible null value to non-nullable type.\n    2 Warning(s)\n    0 Error(s)\n\n$ dotnet run --no-build\n16\nname is null: True\nchecked length: 16\nasha@example.com\nboxed=91, score=40\nunboxed=0, boxed=91\nReferenceEquals(boxed, again)=False\nboxed generation=0\nArrayList total=276\nList<int> sum=276 (no boxing)",
      notes: [
        "The real build prefixes each warning with the absolute path of `Program.cs` and the `.csproj`; the path is trimmed above for readability. The warning text, line numbers and `16` length are unchanged from the run.",
        "CS8602 and CS8600 are compile-time warnings, not runtime checks. The `string?` annotation is erased in IL; a null arriving from JSON, a database or an HTTP header is still your problem at the boundary. Fix the flow or validate at the edge, and do not use `!` to hide it.",
        "Boxing copied 91 into a heap object. Changing `score` or the unboxed copy did not change the box. `ReferenceEquals(boxed, again)` is `False` because assigning `score` to `object` boxed it a second time, and the two boxes are different objects.",
        "`ArrayList` boxed all three ints; `List<int>` stores them inline in its backing array and `Sum()` does not box. The box reports generation 0 because it was allocated after the last collection.",
      ],
    },
    {
      title: "Compare struct, class and record",
      text: [
        "Use this table when choosing a type. The storage column is the language guarantee; the exact machine layout is the runtime's business. The equality column assumes you have not written custom operators.",
      ],
      code: {
        lang: "text",
        file: "type-choice.txt",
        code: `Type             Storage                          Equality                       Mutation                    Typical use
---------------  -------------------------------  -----------------------------  --------------------------  ---------------------------
struct           value, copied inline            field-by-field via Equals      copies on assignment        small bundle of data
readonly struct  value, copied inline            field-by-field via Equals      none; methods return new    Point, Money, Guid wrapper
record struct    value, copied inline            compiler-generated value       with-expression             small immutable value object
class            reference to a heap object      identity unless overridden     shared through the ref      entity with identity/behaviour
record (class)   reference to a heap object      compiler-generated value       with-expression (shallow)   DTO, message, event, domain value
string           reference to immutable object   value: == is overloaded        none; creates a new string  text`,
      },
      notes: [
        "A plain struct does not get `==` for free; `record struct` does. Value types inherit `Equals(object)` from `System.ValueType`, which compares fields, but the compiler can optimise it.",
        "A `record class` is still a reference type. `with` shallow-copies, so a nested `List<T>` property is shared between the old and new record.",
      ],
    },
    {
      title: "Draw the memory model",
      text: [
        "Mermaid renders this in the lesson page and on GitHub. Follow one expression: the type category decides whether the value is copied inline or a reference is copied; a box takes the reference path.",
      ],
      code: {
        lang: "mermaid",
        file: "memory.mmd",
        code: `flowchart TD
  A["C# expression<br/>int, struct, class, string"] --> B{"Type category"}
  B -->|"value type"| C["Value copied inline<br/>stack frame, array slot or object field"]
  B -->|"reference type"| D["Reference copied<br/>8 bytes on a 64-bit process"]
  D --> E["Object on the managed heap<br/>header + fields"]
  E --> F["GC generations<br/>0, then 1, then 2"]
  C -.->|"boxed into object"| E`,
      },
      notes: [
        "If you remember one thing: a struct variable contains the value, a class variable contains a way to find the value.",
        "The edge from a value type to the heap is boxing. The reverse edge is unboxing, which copies the value back out and requires the exact original type.",
      ],
    },
  ],
  companies: [
    "**Microsoft and the .NET team (verified in this lesson):** the SDK on this machine reports 10.0.301; the probes target `net9.0` and run with `DOTNET_ROLL_FORWARD=LatestMajor`. Every warning, stdout line and generation number in this lesson came from that toolchain, not from memory.",
    "**Enterprise ASP.NET Core estates (illustrative):** banks, insurers, retailers and SaaS companies run large C# services on Azure, AWS and Linux containers. Many enable nullable reference types and treat warnings as errors in CI, and use records for API contracts and immutable domain values.",
    "**Cloud and container platforms (illustrative):** .NET is open source and cross-platform, so the same IL and runtime run on Windows and Linux images. Managed hosting and Kubernetes make the GC's behaviour and container memory limits an operational concern, not just a language detail.",
    "**Game and real-time studios (illustrative):** Unity uses C# with a managed GC. Teams use structs for small vectors and colours, pool objects, and avoid per-frame allocations because a generation 0 collection during a frame is visible to players.",
    "**High-throughput services (illustrative):** ASP.NET Core, `Span<T>`, `ArrayPool<T>` and generic collections exist partly to keep allocations and boxing off the hot path. `List<int>` and `Dictionary<string, T>` avoid the per-element boxes that `ArrayList` and `Hashtable` paid.",
  ],
  mistakes: [
    { mistake: "Mutable structs", why: "Structs look like lightweight classes", wrong: "Changes apply to copies and silently vanish, especially through a List indexer or a property", fix: "Make structs readonly; use classes or records for mutable data" },
    { mistake: "Ignoring nullable warnings", why: "They are 'just warnings'", wrong: "NullReferenceException in production, often from JSON or a database row", fix: "Fix the flow, validate at boundaries, and turn on TreatWarningsAsErrors" },
    { mistake: "String concatenation in loops", why: "+ is the obvious operator", wrong: "One new string per iteration: slow and memory-hungry", fix: "StringBuilder, string.Join, or build once with interpolation" },
    { mistake: "Catching Exception everywhere", why: "Feels safe", wrong: "Real bugs are swallowed and data ends up inconsistent", fix: "Catch specific expected exceptions where you can handle them; log and rethrow otherwise" },
    { mistake: "Forgetting to dispose", why: "GC frees memory, so resources seem fine", wrong: "Leaked file handles, sockets and DB connections under load", fix: "using / using var for IDisposable; await using for IAsyncDisposable" },
    { mistake: "Using `==` on classes and expecting value equality", why: "It worked for strings and records", wrong: "Two objects with identical data compare unequal, so a duplicate check or cache lookup fails", fix: "Implement IEquatable<T> and Equals/GetHashCode, use a record, or use ReferenceEquals when you really mean identity" },
    { mistake: "Making a record mutable and using it as a dictionary key", why: "Records are 'for data', so they feel safe", wrong: "Mutating a field after insertion changes the hash, so the entry cannot be found", fix: "Keep records immutable (init-only or constructor state) or do not use them as keys" },
    { mistake: "Boxing in hot paths", why: "object, ArrayList and non-generic APIs are convenient", wrong: "One heap allocation per value, extra GC pressure and copies on every unbox", fix: "Use generic collections and generic APIs; measure allocations before optimising" },
    { mistake: "Assuming a struct always lives on the stack", why: "It is the usual simplification", wrong: "A struct field inside a class, an array element, a captured variable or a boxed value lives on the heap", fix: "Reason about copy vs share semantics; do not write code that depends on an address or storage location" },
  ],
  bestPractices: [
    { tag: "Reliability", text: "Enable nullable reference types, treat warnings as errors, and use `required` members for mandatory properties." },
    { tag: "Maintainability", text: "Records for DTOs and immutable values; classes for entities with identity and behaviour; `readonly struct` for small values." },
    { tag: "Maintainability", text: "Keep structs small and immutable. If a method must change one, return a new value so the caller cannot lose the change." },
    { tag: "Performance", text: "Prefer generic collections and APIs to avoid boxing; use StringBuilder or string.Join in loops; allocate deliberately in hot paths." },
    { tag: "Security", text: "Validate nulls and lengths at trust boundaries, even with NRT; never intern unbounded user input, and never rely on `!` as a runtime guarantee." },
  ],
  interview: [
    { q: "Value types vs reference types in C# - and what does 'on the stack' really mean?", a: "Value types (int, enums, structs, DateTime) hold their data directly and copy on assignment, argument passing and return. Reference types (classes, arrays, strings, delegates) hold a reference; assignment copies the reference, so both variables reach one object. A local value type is often stored inline in a stack frame, and a reference-type local holds a pointer to a heap object, but that is a simplification: the JIT can use registers, inline a struct into another object, put structs in arrays, hoist async locals into a state-machine object, and box a value onto the heap. Strings are reference types but immutable. The practical test is copy versus share, not 'stack versus heap'. Mention boxing: converting a value type to object copies it into a heap object, and unboxing copies it back out." },
    { q: "When do you use a record instead of a class or a struct?", a: "Use a record for data-centric types where equality should be based on values: DTOs, messages, events, immutable domain values. The compiler generates value equality, ==, GetHashCode, a readable ToString, deconstruction and with-expressions. A record class is still a reference type and with is a shallow copy, so nested mutable collections are shared. A record struct is a value type with value equality; use it for small values where you want no allocation. Use a class for an entity with identity and mutable behaviour, and a readonly struct for a tiny value such as a coordinate or a money amount. If a record is mutable and used as a dictionary key, changing it breaks the hash - keep it immutable." },
    { q: "How do nullable reference types work, and where do they stop helping?", a: "NRT makes nullability part of the type: string? may be null, string should not be. The compiler performs flow analysis and warns on a possible null dereference (CS8602), assigning null to a non-nullable type (CS8600) or passing a maybe-null argument (CS8604). `?.`, `??`, pattern checks and attributes such as [NotNullWhen(true)] narrow the flow; `!` suppresses the warning and moves the risk to runtime. The annotations are erased in IL, so there is no runtime enforcement: a null from JSON, a database or a native interop call can still arrive. Validate at the boundary and treat the warnings as errors in CI. Nullable value types (int?) are different: Nullable<int> is a real struct with HasValue and Value." },
  ],
  quickCheck: [
    {
      kind: "output",
      prompt: "What prints?",
      code: { lang: "csharp", code: "Console.WriteLine(new P(1) == new P(1));\nConsole.WriteLine(new C { X = 1 } == new C { X = 1 });\n\nrecord P(int X);\nclass C { public int X; }" },
      options: ["True True", "True False", "False False", "False True"],
      answer: 1,
      explanation: "Records compare by value; classes compare references by default. The two class instances are different objects, even though their X fields are equal.",
    },
    {
      kind: "bug",
      prompt: "Why does this crash in production for some users?",
      code: { lang: "csharp", code: "string? nickname = user.Nickname;\nvar initials = nickname.Substring(0, 1);" },
      options: ["Substring is deprecated", "nickname can be null; the warning was ignored", "string? is not a valid type", "Substring needs one argument"],
      answer: 1,
      explanation: "Use nickname?.Substring(0, 1) ?? \"?\" or check for null first, and treat nullable warnings as errors.",
    },
    {
      kind: "output",
      prompt: "What prints?",
      code: { lang: "csharp", code: "int x = 91;\nobject first = x;\nobject second = x;\nConsole.WriteLine($\"{ReferenceEquals(first, second)} {first.Equals(second)}\");" },
      options: ["True True", "False True", "False False", "True False"],
      answer: 1,
      explanation: "Each assignment to object boxes x into a new heap object, so identity is false. Equals compares the boxed ints by value, so it is true.",
    },
  ],
  cheatSheet: [
    "dotnet new sln/console/classlib/xunit; dotnet sln add; dotnet add reference.",
    "Value types copy; reference types share. Strings are immutable references with value-based ==.",
    "record = value equality + with; class = identity; record struct = value type with value equality.",
    "== is an operator, Equals is virtual, ReferenceEquals is always identity. They can disagree.",
    "String literals are interned; new string and runtime Concat are not. Use StringBuilder in loops.",
    "string? may be null; use ?. ?? and is not null. NRT warnings are erased at runtime - validate at boundaries.",
    "Boxing copies a value to the heap; unboxing copies it back. Generic collections avoid it.",
    "GC generations: 0 nursery, 1 short-lived survivors, 2 long-lived; the LOH holds objects of 85,000 bytes or more.",
    "using / using var for IDisposable; the GC frees memory but does not close handles.",
    "Nullable enabled + TreatWarningsAsErrors in Directory.Build.props applies to every project.",
  ],
  homework: {
    basic: {
      title: "Model DevAtlas lessons in C#",
      brief: ["In DevAtlas.Core create `record Lesson(string Id, string Title, int Minutes)` with validation (Minutes > 0, Id not empty) and a `Course` class holding a list of lessons with `TotalMinutes`. Add 3 xUnit tests, including one that proves two lessons with the same values are equal."],
      criteria: ["Validation throws ArgumentException with clear messages", "Course exposes IReadOnlyList<Lesson>", "A test asserts record value equality, identity difference and inequality of changed data", "Tests pass with dotnet test"],
      hints: ["Validate in an explicit constructor or a static Create method.", "Records give == for free; compare a with-copy against the original to see the difference."],
      solution: {
        text: [
          "Expose a read-only view so callers cannot bypass Course's rules by mutating the list.",
          "Lesson validates in its constructor, so an invalid lesson cannot exist. Each ArgumentException names the parameter (`nameof`) and says what is wrong, including the bad value for minutes. Course keeps a private List<Lesson> and exposes `_lessons.AsReadOnly()`. Returning the list itself as IReadOnlyList would compile too, but a caller could cast it back to List<Lesson> and add lessons without going through Add.",
          "The tests cover the total, every validation message (one Theory with three cases), duplicate ids, the read-only view, and record value equality. `new Lesson(\"1.3.1\", \"C# fundamentals\", 70) == new Lesson(\"1.3.1\", \"C# fundamentals\", 70)` is true because the compiler generated value equality. Run `dotnet test` from the solution folder. The output below is the real summary on .NET 9 with the timing left out.",
        ],
        code: {
          lang: "csharp",
          file: "DevAtlas.Core/Course.cs",
          code: `namespace DevAtlas.Core;

public sealed record Lesson
{
    public string Id { get; }
    public string Title { get; }
    public int Minutes { get; }

    public Lesson(string id, string title, int minutes)
    {
        if (string.IsNullOrWhiteSpace(id)) throw new ArgumentException("Id is required", nameof(id));
        if (string.IsNullOrWhiteSpace(title)) throw new ArgumentException("Title is required", nameof(title));
        if (minutes <= 0) throw new ArgumentException($"Minutes must be > 0, got {minutes}", nameof(minutes));
        (Id, Title, Minutes) = (id, title, minutes);
    }
}

public sealed class Course(string title)
{
    private readonly List<Lesson> _lessons = [];
    public string Title { get; } = title;
    public IReadOnlyList<Lesson> Lessons => _lessons.AsReadOnly();   // a wrapper: cannot be cast back to List<T>
    public int TotalMinutes => _lessons.Sum(l => l.Minutes);

    public void Add(Lesson lesson)
    {
        if (_lessons.Any(l => l.Id == lesson.Id))
            throw new InvalidOperationException($"Lesson {lesson.Id} already exists");
        _lessons.Add(lesson);
    }
}

// ---- DevAtlas.Core.Tests/CourseTests.cs ----
using DevAtlas.Core;

namespace DevAtlas.Core.Tests;

public class CourseTests
{
    [Fact]
    public void Total_minutes_sums_lessons()
    {
        var course = new Course("Phase 1");
        course.Add(new Lesson("1.3.1", "C# fundamentals", 70));
        course.Add(new Lesson("1.3.2", "LINQ", 65));

        Assert.Equal(135, course.TotalMinutes);
        Assert.Equal(["1.3.1", "1.3.2"], course.Lessons.Select(l => l.Id));
    }

    [Theory]
    [InlineData("", "C#", 70, "id", "Id is required")]
    [InlineData("1.3.1", " ", 70, "title", "Title is required")]
    [InlineData("1.3.1", "C#", 0, "minutes", "Minutes must be > 0, got 0")]
    public void Invalid_lessons_are_rejected_with_a_clear_message(
        string id, string title, int minutes, string param, string message)
    {
        var ex = Assert.Throws<ArgumentException>(() => new Lesson(id, title, minutes));
        Assert.Equal(param, ex.ParamName);
        Assert.StartsWith(message, ex.Message);   // ArgumentException appends " (Parameter 'x')"
    }

    [Fact]
    public void Duplicate_lesson_ids_are_rejected()
    {
        var course = new Course("Phase 1");
        course.Add(new Lesson("1.3.1", "C# fundamentals", 70));

        var ex = Assert.Throws<InvalidOperationException>(() => course.Add(new Lesson("1.3.1", "Again", 10)));
        Assert.Equal("Lesson 1.3.1 already exists", ex.Message);
    }

    [Fact]
    public void Lessons_cannot_be_changed_from_outside()
    {
        var course = new Course("Phase 1");
        course.Add(new Lesson("1.3.1", "C# fundamentals", 70));

        Assert.IsNotType<List<Lesson>>(course.Lessons);                              // no cast back to List<T>
        Assert.Throws<NotSupportedException>(() => ((IList<Lesson>)course.Lessons).Clear());
    }

    [Fact]
    public void Records_compare_by_value()
    {
        var a = new Lesson("1.3.1", "C# fundamentals", 70);
        var b = new Lesson("1.3.1", "C# fundamentals", 70);
        var c = new Lesson("1.3.1", "C# fundamentals", 65);

        Assert.Equal(a, b);
        Assert.True(a == b);
        Assert.False(ReferenceEquals(a, b));
        Assert.NotEqual(a, c);
    }
}`,
        },
        output: "Passed!  - Failed:     0, Passed:     7, Skipped:     0, Total:     7 - DevAtlas.Core.Tests.dll (net9.0)",
        pitfalls: [
          "`public List<Lesson> Lessons { get; }`: callers can Add or Clear directly and skip the duplicate check",
          "Asserting only the exception type: a test that passes for the wrong ArgumentException (say, the wrong parameter) proves little; check ParamName or the message too",
          "Forgetting that a record is not immutable by itself: a `set` property or a mutable collection inside it still changes the data",
        ],
      },
    },
    intermediate: {
      title: "Struct copy experiment",
      brief: ["Create a mutable `struct Counter { public int Value; public void Inc() => Value++; }`. Store it in a List<Counter> and in an array, call Inc() through each, and print the results. Explain the difference, then fix it with a readonly struct or a class."],
      criteria: ["Shows the list case does not persist the change (or does not compile)", "Shows the array case does", "Clear explanation of copies", "Explains why a readonly struct or class removes the trap"],
      hints: ["Array elements are variables you can modify in place; List indexers return copies.", "Try assigning `list[0].Value = 5` and read the compiler error."],
      solution: {
        text: [
          "`array[0].Inc()` mutates the element in place, because an array element is a storage location (a variable). `list[0].Inc()` calls Inc on a copy returned by the List indexer, so the list still holds 0. Assigning a field through the indexer (`list[0].Value = 5`) does not even compile: error CS1612, because the compiler can see the change would be lost.",
          "The copy-out, change, write-back dance works but is easy to forget. The real fix is to avoid mutable structs: a `readonly record struct` whose Inc returns a new value (the caller must store it, so nothing is silently lost), or a class, where the list holds a reference and every access reaches the same object.",
          "Run this as a console app. The output is real; note that the list case prints 0 while the array case prints 1, and both fixes print 1.",
        ],
        code: {
          lang: "csharp", file: "Program.cs",
          code: `// Part 1: a mutable struct, the thing to avoid
var array = new Counter[] { new() };
var list = new List<Counter> { new() };

array[0].Inc();            // array element is a variable: mutated in place
list[0].Inc();             // indexer returns a COPY; Inc() changes the copy
// list[0].Value = 5;      // error CS1612: cannot modify the return value because it is not a variable

Console.WriteLine($"array[0].Value = {array[0].Value}");
Console.WriteLine($"list[0].Value  = {list[0].Value}");

var copy = list[0];        // the workaround: copy out, change, write back
copy.Inc();
list[0] = copy;
Console.WriteLine($"after write-back, list[0].Value = {list[0].Value}");

// Part 2: fix A, an immutable readonly struct whose methods return new values
var fixedList = new List<SafeCounter> { new(0) };
fixedList[0] = fixedList[0].Inc();       // nothing to lose: the new value must be stored
Console.WriteLine($"readonly struct: {fixedList[0].Value}");

// Part 3: fix B, a class (reference type): the list holds a reference to one object
var refList = new List<RefCounter> { new() };
refList[0].Inc();
Console.WriteLine($"class: {refList[0].Value}");

struct Counter
{
    public int Value;
    public void Inc() => Value++;
}

readonly record struct SafeCounter(int Value)
{
    public SafeCounter Inc() => this with { Value = Value + 1 };
}

sealed class RefCounter
{
    public int Value { get; private set; }
    public void Inc() => Value++;
}`,
        },
        output: "array[0].Value = 1\nlist[0].Value  = 0\nafter write-back, list[0].Value = 1\nreadonly struct: 1\nclass: 1",
        pitfalls: ["The same silent copy happens with a struct in a property, a dictionary value, a foreach variable or a readonly field", "Concluding that structs are bad: small immutable structs (DateTime, Guid, a Money value) are fine and avoid heap allocations"],
      },
    },
    challenge: {
      title: "Result type in C#",
      brief: ["Implement `Result<T>` (success with value, or failure with error message) using records, and rewrite a parsing method to return Result<int> instead of throwing. Use pattern matching to consume it.", "Add a `record struct` variant and explain when the struct version is appropriate."],
      criteria: ["Abstract record with two sealed subtypes", "Consumer uses a switch expression", "No exceptions for expected failures", "Explains the allocation trade-off of record class vs record struct"],
      hints: ["abstract record Result<T>; sealed record Ok(T Value) : Result<T>; sealed record Err(string Error) : Result<T>.", "A record struct cannot inherit, so it cannot be a subtype in the same hierarchy; compare the designs."],
      solution: {
        text: [
          "This mirrors the TypeScript discriminated union from lesson 1.2.3: expected failures become values the compiler makes you handle.",
          "The record class version allocates one object per result. That is fine for a request-level parse, and it fits an inheritance hierarchy cleanly. A record struct avoids the allocation but cannot inherit, so you would model the result as a single struct with a success flag and two fields, or keep the class version. Measure before optimising; clarity wins unless the parse is in a tight loop.",
        ],
        code: {
          lang: "csharp",
          code: `static Result<int> ParsePercent(string input) =>
    !int.TryParse(input, out var n) ? new Result<int>.Err($"'{input}' is not a number")
    : n is < 0 or > 100 ? new Result<int>.Err("must be 0-100")
    : new Result<int>.Ok(n);

foreach (var s in new[] { "80", "abc", "150" })
{
    var message = ParsePercent(s) switch
    {
        Result<int>.Ok ok => $"ok {ok.Value}",
        Result<int>.Err err => $"error: {err.Error}",
        _ => throw new InvalidOperationException(),
    };
    Console.WriteLine(message);
}

public abstract record Result<T>
{
    public sealed record Ok(T Value) : Result<T>;
    public sealed record Err(string Error) : Result<T>;
}`,
        },
      },
    },
    capstone: {
      title: "DevAtlas: .NET solution skeleton",
      brief: ["Create `services/api/` with DevAtlas.sln containing DevAtlas.Api (empty web project for now), DevAtlas.Core (domain records) and DevAtlas.Core.Tests. Enable nullable and warnings-as-errors via a Directory.Build.props file."],
      criteria: ["dotnet build and dotnet test pass", "Directory.Build.props applies to all projects", "Added to CI"],
      hints: ["Directory.Build.props in the solution folder is imported by every project below it.", "Put the Lesson/Course record from the basic homework in DevAtlas.Core so the solution has real value semantics to test."],
      solution: {
        text: [
          "One shared props file keeps settings consistent across projects.",
          "MSBuild imports Directory.Build.props from the project's folder or any parent folder before the project file, so every project under services/api gets net9.0, nullable, implicit usings and warnings-as-errors. Because the project file is read afterwards, a `<TargetFramework>` left in a generated .csproj silently wins. That is why the setup deletes those lines; the library's project file ends up nearly empty.",
          "Put the Lesson/Course code and tests from the basic homework into DevAtlas.Core and DevAtlas.Core.Tests. The CI workflow installs the .NET 9 SDK and runs build then test on every pull request. It has no `paths:` filter, so it can be a required check (lesson 1.1.4 explains why).",
          "Verified with the .NET 10 SDK targeting net9.0: `dotnet build DevAtlas.sln` builds all three projects into bin/Debug/net9.0 with 0 warnings, `dotnet test` passes 6 of 6 (add the record equality test from the basic homework and it becomes 7), and adding a possible null dereference to DevAtlas.Api fails the build with error CS8602, which proves the props file reaches every project. The workflow passes actionlint.",
        ],
        code: {
          lang: "text",
          file: "services/api/Directory.Build.props",
          code: `<Project>
  <!-- Imported by every project below services/api, so all of them share these settings -->
  <PropertyGroup>
    <TargetFramework>net9.0</TargetFramework>
    <Nullable>enable</Nullable>
    <ImplicitUsings>enable</ImplicitUsings>
    <TreatWarningsAsErrors>true</TreatWarningsAsErrors>
  </PropertyGroup>
</Project>

# ---- setup commands (run in services/api; .NET 9 SDK or later) ----
dotnet new sln -n DevAtlas                 # on the .NET 10 SDK add --format sln (its default is DevAtlas.slnx)
dotnet new web -n DevAtlas.Api
dotnet new classlib -n DevAtlas.Core
dotnet new xunit -n DevAtlas.Core.Tests
dotnet sln add DevAtlas.Api DevAtlas.Core DevAtlas.Core.Tests
dotnet add DevAtlas.Api reference DevAtlas.Core
dotnet add DevAtlas.Core.Tests reference DevAtlas.Core
# Then delete the <TargetFramework>, <Nullable> and <ImplicitUsings> lines from the three
# generated .csproj files: a value set in the project file overrides Directory.Build.props.

# ---- services/api/DevAtlas.Core/DevAtlas.Core.csproj (after the edit) ----
<Project Sdk="Microsoft.NET.Sdk">

</Project>

# ---- .github/workflows/api-tests.yml ----
name: api tests
on:
  pull_request:
  push:
    branches: [main]
permissions:
  contents: read
jobs:
  test:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: services/api
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-dotnet@v4
        with:
          dotnet-version: "9.0.x"
      - run: dotnet build DevAtlas.sln   # warnings are errors via Directory.Build.props
      - run: dotnet test DevAtlas.sln --no-build`,
        },
        output: "$ dotnet build DevAtlas.sln\n  DevAtlas.Core -> DevAtlas.Core/bin/Debug/net9.0/DevAtlas.Core.dll\n  DevAtlas.Core.Tests -> DevAtlas.Core.Tests/bin/Debug/net9.0/DevAtlas.Core.Tests.dll\n  DevAtlas.Api -> DevAtlas.Api/bin/Debug/net9.0/DevAtlas.Api.dll\nBuild succeeded.\n    0 Warning(s)\n    0 Error(s)",
        pitfalls: [
          "Leaving `<TargetFramework>net10.0</TargetFramework>` in a generated .csproj: it overrides the props file, and that project quietly targets a different framework",
          "Naming the file Directory.Build.props.xml or putting it inside one project folder: then only that project, or none, picks it up",
          "Targeting net9.0 without the .NET 9 runtime on the machine: the build works with a newer SDK, but `dotnet test` and `dotnet run` need the 9.0 runtime (CI installs it with setup-dotnet; locally set DOTNET_ROLL_FORWARD=LatestMajor)",
          "Turning on warnings-as-errors before fixing the nullable warnings: the build stops on the first one, which is the intended behaviour but surprises teams that flip the switch late",
        ],
      },
    },
  },
  deeper: [
    { label: "Microsoft Learn: C# documentation", url: "https://learn.microsoft.com/en-us/dotnet/csharp/" },
    { label: "C# records", url: "https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/builtin-types/record" },
    { label: "Nullable reference types", url: "https://learn.microsoft.com/en-us/dotnet/csharp/nullable-references" },
    { label: "Value types (C# reference)", url: "https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/builtin-types/value-types" },
    { label: "Boxing and unboxing", url: "https://learn.microsoft.com/en-us/dotnet/csharp/programming-guide/types/boxing-and-unboxing" },
    { label: "Fundamentals of garbage collection", url: "https://learn.microsoft.com/en-us/dotnet/standard/garbage-collection/fundamentals" },
  ],
  nextPreview: "Next: LINQ, generics and async/await in C#: query data expressively, write reusable code, and keep servers responsive.",
};
