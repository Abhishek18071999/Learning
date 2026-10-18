import type { Lesson } from "../../types";

export const lesson: Lesson = {
  id: "1.3.1",
  title: "C# fundamentals and the .NET runtime",
  minutes: 70,
  level: "Beginner",
  prerequisites: ["Any one programming language (Python lessons 1.1.x are enough)", ".NET 8 SDK or later installed (dotnet --version)"],
  summary: "Learn C# the way backend teams use it: the .NET runtime, value vs reference types, classes vs records, nullable reference types, exceptions and the project structure of a real solution.",
  terms: [
    { term: ".NET", def: "Microsoft's open-source, cross-platform runtime and libraries. C# compiles to IL (intermediate language) that the .NET runtime runs." },
    { term: "CLR / JIT", def: "The Common Language Runtime executes IL; the Just-In-Time compiler turns it into machine code at runtime, optimising hot paths." },
    { term: "Value type", def: "A type whose variable holds the data itself (int, double, bool, DateTime, structs). Assigning copies the value." },
    { term: "Reference type", def: "A type whose variable holds a reference to an object on the heap (classes, strings, arrays). Assigning copies the reference." },
    { term: "record", def: "A type designed for data, with value-based equality, a readable ToString and non-destructive mutation via `with`." },
    { term: "Nullable reference types", def: "A compiler feature (enabled by default in new projects) that warns when a value that might be null is used without a check. `string?` may be null; `string` should not be." },
    { term: "Solution / project", def: "A .sln groups projects; each .csproj is one project (an API, a class library, a test project)." },
  ],
  problem: [
    "The DevAtlas main API will be written in ASP.NET Core, the C# web framework used widely in enterprise backends. A new engineer writes a method that updates a `Progress` struct inside a list and is puzzled that the change disappears. Another ships code that throws `NullReferenceException` in production because a user had no email.",
    "Both are fundamentals: value vs reference semantics, and null safety. C# gives you the tools to prevent them, if you know what the language is doing.",
  ],
  concept: {
    analogy: [
      "A **value type** is a photocopy: hand someone a copy of a document and their scribbles do not change your original. A **reference type** is a shared Google Doc link: hand someone the link and their edits show up for everyone holding the link.",
    ],
    precise: [
      "C# is **statically typed** and compiled. `dotnet build` compiles C# to IL in a .dll; `dotnet run` starts the runtime, which JIT-compiles IL to native code. Garbage collection frees heap objects automatically.",
      "**Classes** are reference types with identity: two `new User(\"a\")` objects are different even with equal data. **Records** are for data: equality compares values, `ToString()` prints fields, and `with` creates a modified copy, ideal for DTOs and immutable domain values. **Structs** are small value types (like a point or money amount).",
      "**Nullable reference types** make nullability part of the type. With `<Nullable>enable</Nullable>` (the default in new projects), assigning null to `string` warns, and dereferencing a `string?` without a check warns. Treating these warnings as errors removes most NullReferenceExceptions.",
      "Modern C# (C# 12 on .NET 8) has top-level statements, file-scoped namespaces, `var` type inference, pattern matching, primary constructors and collection expressions. Code is concise without losing type safety.",
    ],
  },
  underTheHood: {
    text: [
      "Local value-type variables typically live on the stack or inline inside the object that contains them; reference-type objects live on the managed heap and the variable holds a pointer. Passing a struct to a method copies it unless you use `ref`/`in`. This is why mutating a struct you got from a `List<T>` indexer changes only a copy (the compiler even rejects some of these mistakes).",
      "`string` is a reference type but **immutable**: every 'modification' creates a new string. Building strings in a loop should use `StringBuilder` or string interpolation on collections (`string.Join`).",
      "Exceptions unwind the stack until a matching `catch`. `using` (or `using var`) guarantees `Dispose()` is called for resources like files, database connections and HTTP responses, even when an exception occurs.",
    ],
    diagram: {
      title: "From C# to running code",
      nodes: [
        { label: "Program.cs", sub: "C# source" },
        { label: "Roslyn compiler", sub: "dotnet build" },
        { label: "IL in .dll", sub: "portable" },
        { label: "CLR + JIT", sub: "dotnet run" },
        { label: "Native code", sub: "+ GC" },
      ],
      edges: ["", "", "", ""],
    },
  },
  handsOn: [
    {
      title: "Create a solution with an app, a library and tests",
      code: {
        lang: "bash",
        code: `mkdir DevAtlas && cd DevAtlas
dotnet new sln -n DevAtlas
dotnet new console -n DevAtlas.Cli
dotnet new classlib -n DevAtlas.Core
dotnet new xunit -n DevAtlas.Core.Tests
dotnet sln add DevAtlas.Cli DevAtlas.Core DevAtlas.Core.Tests
dotnet add DevAtlas.Cli reference DevAtlas.Core
dotnet add DevAtlas.Core.Tests reference DevAtlas.Core
dotnet build`,
      },
      notes: ["Templates and default target framework depend on your installed SDK; .NET 8 is the current long-term support release used in these lessons."],
    },
    {
      title: "Value vs reference, class vs record",
      code: {
        lang: "csharp",
        file: "DevAtlas.Cli/Program.cs",
        code: `// Value type: copy on assignment
int a = 5;
int b = a;
b++;
Console.WriteLine($"a={a}, b={b}");            // a=5, b=6

// Reference type: both variables point to the same object
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

class UserAccount(string email)                 // primary constructor (C# 12)
{
    public string Email { get; set; } = email;
}

record LessonRef(string Id, string Title);`,
      },
      output: "a=5, b=6\nnew@example.com\nTrue\nLessonRef { Id = 1.3.1, Title = C# basics }",
    },
    {
      title: "Null safety in practice",
      code: {
        lang: "csharp",
        code: `string? FindEmail(int userId) => userId == 1 ? "asha@example.com" : null;

string? email = FindEmail(2);
// Console.WriteLine(email.Length);         // warning CS8602: possible null dereference

Console.WriteLine(email?.Length ?? 0);       // ?. and ?? : safe, prints 0

if (email is not null)
{
    Console.WriteLine(email.Length);         // compiler knows it is not null here
}

string display = email ?? "(no email)";`,
      },
      notes: ["Add `<TreatWarningsAsErrors>true</TreatWarningsAsErrors>` (or at least for nullable warnings) in the .csproj so these warnings cannot be ignored."],
    },
    {
      title: "Collections, LINQ preview, pattern matching",
      code: {
        lang: "csharp",
        code: `List<int> scores = [72, 91, 85, 40];                        // collection expression (C# 12)
Dictionary<string, int> minutesByLesson = new() { ["1.3.1"] = 70, ["1.3.2"] = 65 };

double average = scores.Average();
var passed = scores.Where(s => s >= 50).ToList();

string Grade(int score) => score switch                      // switch expression
{
    >= 90 => "A",
    >= 75 => "B",
    >= 50 => "C",
    _ => "Retry",
};

Console.WriteLine($"{average:F1} {string.Join(",", passed)} {Grade(91)} {Grade(40)}");`,
      },
      output: "72.0 72,91,85 A Retry",
    },
    {
      title: "Exceptions and using",
      code: {
        lang: "csharp",
        code: `try
{
    using var reader = new StreamReader("missing.txt");      // disposed automatically
    Console.WriteLine(reader.ReadToEnd());
}
catch (FileNotFoundException ex)
{
    Console.WriteLine($"Not found: {ex.FileName}");
}

// Custom exceptions for domain errors
public sealed class LessonNotFoundException(string id)
    : Exception($"Lesson {id} does not exist");`,
      },
    },
  ],
  companies: [
    "**Enterprise backends**: banks, insurers, retailers, game backends and SaaS companies run large ASP.NET Core estates on Azure, AWS and on-premises Linux. .NET is cross-platform and open source, and commonly deployed in Linux containers.",
    "**Solution structure**: real repositories split a solution into an API project, domain/core libraries, infrastructure (database) libraries and test projects, so business logic can be tested without the web layer.",
    "**Warnings as errors**: many teams enable nullable reference types and treat warnings as errors in CI, which removes a whole class of production crashes.",
  ],
  mistakes: [
    { mistake: "Mutable structs", why: "Structs look like lightweight classes", wrong: "Changes apply to copies and silently vanish", fix: "Make structs readonly; use classes or records for mutable data" },
    { mistake: "Ignoring nullable warnings", why: "They are 'just warnings'", wrong: "NullReferenceException in production", fix: "Fix them and turn on TreatWarningsAsErrors" },
    { mistake: "String concatenation in loops", why: "+ is the obvious operator", wrong: "Many temporary strings, slow and memory-hungry", fix: "StringBuilder or string.Join" },
    { mistake: "Catching Exception everywhere", why: "Feels safe", wrong: "Real bugs are swallowed and data ends up inconsistent", fix: "Catch specific exceptions where you can handle them; log and rethrow otherwise" },
    { mistake: "Forgetting to dispose", why: "GC frees memory, so resources seem fine", wrong: "Leaked file handles and DB connections under load", fix: "using / using var for IDisposable; await using for IAsyncDisposable" },
  ],
  bestPractices: [
    { tag: "Reliability", text: "Nullable enabled, warnings as errors, `required` members for mandatory properties." },
    { tag: "Maintainability", text: "Records for DTOs and immutable values; classes for entities with identity and behaviour." },
    { tag: "Maintainability", text: "Split solutions into API, Core and Infrastructure projects plus tests." },
    { tag: "Performance", text: "Prefer readonly structs for tiny values; avoid boxing and repeated string concatenation in hot paths." },
  ],
  interview: [
    { q: "Value types vs reference types in C#?", a: "Value types (int, structs, enums) hold their data directly and are copied on assignment. Reference types (classes, arrays, strings) hold a reference to a heap object, so assignments share the object. Strings are reference types but immutable." },
    { q: "When do you use a record instead of a class?", a: "For data-centric types where equality should be based on values: DTOs, messages, immutable domain values. Records give value equality, a useful ToString and with-expressions. Use classes for entities with identity and mutable state." },
    { q: "How do nullable reference types help?", a: "They make nullability explicit in the type system: string? may be null, string should not be. The compiler warns on possible null dereferences and on assigning null to non-nullable references, catching NullReferenceExceptions at compile time." },
  ],
  quickCheck: [
    {
      kind: "output",
      prompt: "What prints?",
      code: { lang: "csharp", code: "Console.WriteLine(new P(1) == new P(1));\nConsole.WriteLine(new C { X = 1 } == new C { X = 1 });\n\nrecord P(int X);\nclass C { public int X; }" },
      options: ["True True", "True False", "False False", "False True"],
      answer: 1,
      explanation: "Records compare by value; classes compare references by default.",
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
      kind: "mcq",
      prompt: "What does `dotnet build` produce?",
      options: ["Machine code for one CPU", "IL code in a .dll, run by the .NET runtime", "JavaScript", "A Docker image"],
      answer: 1,
      explanation: "IL is JIT-compiled at runtime (ahead-of-time native compilation is possible too, but not the default).",
    },
  ],
  cheatSheet: [
    "dotnet new sln/console/classlib/xunit; dotnet sln add; dotnet add reference.",
    "Value types copy; reference types share. Strings are immutable references.",
    "record = value equality + with; class = identity.",
    "string? may be null; use ?. ?? and is not null.",
    "Nullable enabled + TreatWarningsAsErrors.",
    "switch expressions and patterns for clean branching.",
    "using / using var for IDisposable.",
  ],
  homework: {
    basic: {
      title: "Model DevAtlas lessons in C#",
      brief: ["In DevAtlas.Core create `record Lesson(string Id, string Title, int Minutes)` with validation (Minutes > 0, Id not empty) and a `Course` class holding a list of lessons with `TotalMinutes`. Add 3 xUnit tests."],
      criteria: ["Validation throws ArgumentException with clear messages", "Course exposes IReadOnlyList<Lesson>", "Tests pass with dotnet test"],
      hints: ["Validate in an explicit constructor or a static Create method."],
      solution: {
        text: ["Expose a read-only view so callers cannot bypass Course's rules by mutating the list."],
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
        if (minutes <= 0) throw new ArgumentException("Minutes must be > 0", nameof(minutes));
        (Id, Title, Minutes) = (id, title, minutes);
    }
}

public sealed class Course(string title)
{
    private readonly List<Lesson> _lessons = [];
    public string Title { get; } = title;
    public IReadOnlyList<Lesson> Lessons => _lessons;
    public int TotalMinutes => _lessons.Sum(l => l.Minutes);

    public void Add(Lesson lesson)
    {
        if (_lessons.Any(l => l.Id == lesson.Id))
            throw new InvalidOperationException($"Lesson {lesson.Id} already exists");
        _lessons.Add(lesson);
    }
}

// DevAtlas.Core.Tests/CourseTests.cs
// [Fact] public void Total_minutes_sums_lessons() {
//     var c = new Course("Phase 1"); c.Add(new Lesson("1.3.1", "C#", 70)); c.Add(new Lesson("1.3.2", "LINQ", 65));
//     Assert.Equal(135, c.TotalMinutes); }
// [Fact] public void Rejects_zero_minutes() => Assert.Throws<ArgumentException>(() => new Lesson("x", "y", 0));`,
        },
      },
    },
    intermediate: {
      title: "Struct copy experiment",
      brief: ["Create a mutable `struct Counter { public int Value; public void Inc() => Value++; }`. Store it in a List<Counter> and in an array, call Inc() through each, and print the results. Explain the difference, then fix it with a readonly struct or a class."],
      criteria: ["Shows the list case does not persist the change (or does not compile)", "Shows the array case does", "Clear explanation of copies"],
      hints: ["Array elements are variables you can modify in place; List indexers return copies."],
      solution: {
        text: [
          "`array[0].Inc()` mutates the element in place, because an array element is a storage location. `list[0].Inc()` calls Inc on a copy returned by the indexer, so the list is unchanged (for field assignment like `list[0].Value = 5` the compiler refuses with CS1612). The fix: avoid mutable structs. Make it `readonly struct` with a method returning a new value, or use a class.",
        ],
      },
    },
    challenge: {
      title: "Result type in C#",
      brief: ["Implement `Result<T>` (success with value, or failure with error message) using records, and rewrite a parsing method to return Result<int> instead of throwing. Use pattern matching to consume it."],
      criteria: ["Abstract record with two sealed subtypes", "Consumer uses a switch expression", "No exceptions for expected failures"],
      hints: ["abstract record Result<T>; sealed record Ok(T Value) : Result<T>; sealed record Err(string Error) : Result<T>."],
      solution: {
        text: ["This mirrors the TypeScript discriminated union from lesson 1.2.3: expected failures become values the compiler makes you handle."],
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
      hints: ["Directory.Build.props in the solution folder is imported by every project below it."],
      solution: {
        text: ["One shared props file keeps settings consistent across projects."],
        code: {
          lang: "text",
          file: "services/api/Directory.Build.props",
          code: `<Project>
  <PropertyGroup>
    <TargetFramework>net8.0</TargetFramework>
    <Nullable>enable</Nullable>
    <ImplicitUsings>enable</ImplicitUsings>
    <TreatWarningsAsErrors>true</TreatWarningsAsErrors>
  </PropertyGroup>
</Project>`,
        },
      },
    },
  },
  deeper: [
    { label: "Microsoft Learn: C# documentation", url: "https://learn.microsoft.com/en-us/dotnet/csharp/" },
    { label: "C# records", url: "https://learn.microsoft.com/en-us/dotnet/csharp/fundamentals/types/records" },
    { label: "Nullable reference types", url: "https://learn.microsoft.com/en-us/dotnet/csharp/nullable-references" },
    { label: "Value types (C# reference)", url: "https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/builtin-types/value-types" },
  ],
  nextPreview: "Next: LINQ, generics and async/await in C#: query data expressively, write reusable code, and keep servers responsive.",
};
