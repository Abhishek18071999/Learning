import type { Lesson } from "../../types";

export const lesson: Lesson = {
  id: "1.4.2",
  title: "Errors, traits and cargo",
  minutes: 70,
  level: "Intermediate",
  prerequisites: ["1.4.1 Ownership, borrowing and lifetimes"],
  summary: "Handle errors the Rust way with Option, Result and the ? operator, define shared behaviour with traits and generics, and use cargo, crates and tests like a professional.",
  terms: [
    { term: "Option<T>", def: "Either Some(value) or None. Rust's replacement for null: absence is a normal outcome, and you must handle the None case." },
    { term: "Result<T, E>", def: "Either Ok(value) or Err(error). Used when an operation can fail and the caller may need to know why." },
    { term: "? operator", def: "Inside a function returning Result (or Option), `expr?` returns the error early or unwraps the success value. It converts the error with From." },
    { term: "panic", def: "An unrecoverable error that stops the thread (e.g. unwrap on None). For bugs, not expected failures." },
    { term: "Trait", def: "A set of methods a type can implement; Rust's version of an interface. Example: Display, Iterator, or your own Summarize." },
    { term: "Default method", def: "A trait method with a body. Implementors get it for free and may override it. Example: `fn summary(&self) { ... }`." },
    { term: "Trait object (dyn Trait)", def: "A value whose concrete type is erased behind a vtable, e.g. `Box<dyn Summarize>`. Enables mixed types in one collection with dynamic dispatch." },
    { term: "Monomorphisation", def: "The compiler generating a specialised copy of a generic function for each concrete type. This is static dispatch: direct, inlinable calls." },
    { term: "Crate", def: "A Rust package/library. Published crates live on crates.io and are added with cargo add." },
    { term: "thiserror", def: "A crate whose derive macro generates Display, Error and From for your error enum, so `?` and logging work without boilerplate." },
    { term: "anyhow", def: "A crate providing one type-erased error with context chaining. Convenient in applications where callers do not match on error kinds." },
    { term: "Workspace", def: "One Cargo.toml grouping several crates that share a lockfile, a target directory and dependency versions." },
  ],
  problem: [
    "The ingester downloads a feed, parses XML, extracts dates and stores items. Any step can fail: network down, invalid XML, a date in the wrong format. In many languages failures are exceptions that can be forgotten; a missing try/catch crashes the whole batch at 3 a.m.",
    "In Rust, a function that can fail says so in its type (`Result`), and the compiler makes the caller deal with it. Option marks absence, Result marks failure with a reason, and `?` keeps the happy path readable. Combined with traits for shared behaviour and cargo for dependencies, tests and lints, this is how Rust services stay reliable as they grow.",
  ],
  concept: {
    analogy: [
      "A `Result` is a **parcel with a label**: either 'contents inside' (Ok) or 'delivery failed, here is why' (Err). You cannot use the contents without reading the label first. The `?` operator is a **conveyor belt**: if the label says failed, the parcel goes straight back to the sender; otherwise it is unwrapped and work continues.",
      "A trait is a **job certification**: any type certified as `Summarize` can be asked to summarize itself, whether it is an Article, a Video or a Podcast. A generic function is a form that accepts anyone with the certificate; a trait object is a queue where all the certificate holders stand together, and each is asked at the counter.",
    ],
    precise: [
      "`Option<T>` models absence: a lookup that may find nothing, a field that may be missing. `Result<T, E>` models failure: an operation that may not complete, where `E` says what went wrong. Using `Option` for a fallible operation throws away the reason; using `Result` for a harmless lookup forces callers to invent an error type. Handle both with `match`, combinators (`map`, `and_then`, `unwrap_or`, `ok_or`) or `?`. `unwrap()`/`expect()` panic and belong in tests, prototypes or truly impossible cases.",
      "`?` propagates an error and converts it with `From::from`, so a function returning `Result<T, AppError>` can use `?` on an `io::Error`, a parse error or a crate error, provided the conversions exist. Libraries should expose a typed error enum (usually with `thiserror`) so callers can match on variants; applications often prefer `anyhow` plus `.context(...)` because they log rather than match. Add context at boundaries, and keep the source chain.",
      "A trait defines behaviour: required methods, default methods, associated types. Generics with bounds (`fn print_all<T: Summarize>(items: &[T])`) are monomorphised into specialised code: static dispatch, zero-cost, but one copy per type. Trait objects (`&dyn Summarize`, `Box<dyn Summarize>`) use a vtable: dynamic dispatch, a small runtime cost, but one collection can hold Article and Video together. Prefer generics until you need heterogeneity or smaller binaries.",
      "Cargo is the build tool and package manager. Dependencies carry semver requirements (`serde = \"1\"`), resolved in `Cargo.lock`; features are additive compile-time switches; workspaces share a lockfile, target directory and dependency versions; profiles choose optimisation. The daily loop is `cargo add`, `cargo test`, `cargo clippy -- -D warnings`, `cargo fmt`, `cargo doc` and `cargo build --release`.",
    ],
  },
  underTheHood: {
    text: [
      "`?` is not magic: inside a function returning `Result<T, E>`, `expr?` is roughly `match expr { Ok(v) => v, Err(e) => return Err(From::from(e)) }`. Inside a function returning `Option<T>`, it does the same with `Some`/`None`. The `From::from(e)` is the important half: `?` does not just return the error, it converts it into the function's error type when a `From` impl exists. That is how `std::io::Error` and `rss::Error` become your `IngestError` with no manual match.",
      "On the error type, `Display` is the human message, `std::error::Error::source` points at the underlying cause, and `From` is the bridge `?` uses. Written by hand that is three impls per variant; `thiserror` turns them into attributes (`#[error(\"...\")]`, `#[from]`, `#[source]`). `anyhow::Error` is a type-erased error with a chain of context, convenient in `main` or a request handler; libraries avoid it because callers cannot exhaustively match a boxed dynamic error.",
      "`Option<T>` exploits niches: for `Option<&T>` and `Option<Box<T>>` the null pointer is `None`, so the enum is the same size as the pointer and costs nothing. `Option<u32>` has no spare bit pattern, so it grows a tag. `Result` is a normal enum with a discriminant. None of this changes semantics: the type tells the caller which case must be handled.",
      "A trait is a set of method signatures a type opts into: `trait Summarize { fn title(&self) -> String; fn summary(&self) -> String { ... } }`. Required methods have no body; default methods do. A bound such as `T: Summarize` is a compile-time promise: inside the function you may call only what the trait (and other bounds) guarantees. The orphan rule stops you implementing a foreign trait for a foreign type, which keeps impls coherent.",
      "Generic functions are monomorphised: the compiler stamps out a copy for each concrete `T`, so calls are direct and inlinable. The price is code size and compile time. `dyn Trait` erases the concrete type behind a fat pointer (data pointer plus vtable pointer); calls go through the vtable at runtime. On a 64-bit target `&Article` is 8 bytes and `&dyn Summarize` is 16, as the hands-on output shows. Use generics by default, trait objects when one collection must hold different types.",
      "Cargo resolves versions from semver requirements: `serde = \"1\"` means `>=1.0.0, <2.0.0`. `Cargo.lock` records the exact resolved graph; commit it for binaries, and let `cargo update` move within the requirements deliberately. Features are additive compile-time switches (`serde` with `derive`); enabling one anywhere in the graph enables it for everyone (feature unification), so a feature should add capability, never change behaviour incompatibly.",
      "A workspace is one Cargo.toml with `[workspace] members = [...]`: members share one lockfile and one `target/` directory, and `[workspace.dependencies]` centralises versions. Build profiles decide the trade-off: `dev` is fast to compile with debug assertions, `release` optimises; `lto` and `codegen-units = 1` can shrink and speed a binary at the cost of build time. `cargo test`, `clippy`, `fmt` and `doc` work per crate or across the workspace.",
      "Design errors at the boundary: parse and validate at the edge, convert into your typed error there, and attach context once (`anyhow::Context`, or a `thiserror` variant with a field). Do not stringify an error early, because the caller and the logs both lose the source chain. Log the chain at the top, return the typed error below.",
    ],
    diagram: {
      title: "Error flow with ?",
      nodes: [
        { label: "fetch()?", sub: "Err → return early" },
        { label: "parse()?", sub: "Err → return early" },
        { label: "validate()?", sub: "Err → return early" },
        { label: "store()?", sub: "Err → return early" },
        { label: "Ok(count)", sub: "all steps succeeded" },
      ],
      edges: ["Ok", "Ok", "Ok", "Ok"],
      caption: "Each `?` is a checkpoint: the first Err leaves the function, converted into its error type; only the all-Ok path reaches the final value.",
    },
  },
  handsOn: [
    {
      title: "Choose the right shape: Option, Result, generics, trait objects",
      text: [
        "The type is the design decision. Read this table before reaching for `unwrap`, `String` errors or `Box<dyn Trait>`; each row is a situation you will meet in the ingester.",
      ],
      code: {
        lang: "text",
        file: "choose.txt",
        code: `Situation                           Choose                      Avoid                    Because
absence is normal (lookup miss)     Option<T>                   Result<T, E>             None means "nothing", not "failed"
caller must know why it failed      Result<T, E>                Option<T>                Err carries the cause
one concrete type at the call site  fn f<T: Trait>(x: &T)       fn f(x: &dyn Trait)      static dispatch: inlined, no vtable
mixed types in one Vec              Vec<Box<dyn Trait>>         Vec<T>                   different sizes need indirection
library callers match on kinds      a thiserror enum            anyhow::Error            variants stay inspectable
application top-level logging       anyhow + context            a giant local enum       one type, full source chain
optional field in JSON              Option<T> + serde default   sentinel values          missing and null stay explicit`,
      },
      notes: ["The first two rows are the Option/Result boundary. The middle two are the static/dynamic dispatch boundary. The last two are the library/application error boundary."],
    },
    {
      title: "Option and Result basics",
      code: {
        lang: "rust",
        file: "src/main.rs",
        code: `fn find_lesson(id: &str) -> Option<&'static str> {
    match id {
        "1.4.1" => Some("Ownership"),
        "1.4.2" => Some("Errors and traits"),
        _ => None,
    }
}

fn parse_minutes(s: &str) -> Result<u32, String> {
    let n: u32 = s.trim().parse().map_err(|e| format!("'{s}' is not a number: {e}"))?;
    if n == 0 {
        return Err("minutes must be > 0".to_string());
    }
    Ok(n)
}

fn main() {
    println!("{}", find_lesson("1.4.2").unwrap_or("unknown"));
    println!("{}", find_lesson("9.9.9").unwrap_or("unknown"));

    for input in ["70", "abc", "0"] {
        match parse_minutes(input) {
            Ok(n) => println!("ok {n}"),
            Err(e) => println!("error: {e}"),
        }
    }
}`,
      },
      output: "Errors and traits\nunknown\nok 70\nerror: 'abc' is not a number: invalid digit found in string\nerror: minutes must be > 0",
      notes: ["`find_lesson` returns `Option` because a miss is ordinary. `parse_minutes` returns `Result` because the caller needs the reason. The `?` after `parse()` propagates the parse error instead of panicking."],
    },
    {
      title: "Propagate with ? and let thiserror write Display",
      text: [
        "The first enum is the hand-written version: `Display` supplies the human message, `std::error::Error` makes it a real error, and `From<ParseIntError>` is what `?` calls. The second enum gets all three from `thiserror`: `#[error(\"...\")]` generates `Display`, `#[from]` generates the `From` impl, and `#[derive(Error)]` wires up `std::error::Error`. `parse_item` uses the generated version; the output is identical, because the derive writes the same code you would have written.",
      ],
      code: {
        lang: "rust",
        file: "src/main.rs",
        code: `use std::fmt;
use std::num::ParseIntError;
use thiserror::Error;

// 1. Hand-written: the three impls a custom error normally needs.
#[allow(dead_code)]                              // kept only to compare with the derive
#[derive(Debug)]
enum ManualError {
    MissingField(&'static str),
    BadNumber(ParseIntError),
}

impl fmt::Display for ManualError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            ManualError::MissingField(name) => write!(f, "missing field '{name}'"),
            ManualError::BadNumber(e) => write!(f, "bad number: {e}"),
        }
    }
}
impl std::error::Error for ManualError {}
impl From<ParseIntError> for ManualError {
    fn from(e: ParseIntError) -> Self { ManualError::BadNumber(e) }
}

// 2. thiserror: the same Display, Error and From impls, generated.
#[derive(Debug, Error)]
enum FeedError {
    #[error("missing field '{0}'")]
    MissingField(&'static str),
    #[error("bad number: {0}")]
    BadNumber(#[from] ParseIntError),
}

#[derive(Debug, PartialEq)]
struct Item { title: String, points: u32 }

fn parse_item(line: &str) -> Result<Item, FeedError> {
    let (title, points) = line.split_once(';').ok_or(FeedError::MissingField("points"))?;
    let points: u32 = points.trim().parse()?;     // ParseIntError -> FeedError via #[from]
    Ok(Item { title: title.trim().to_string(), points })
}

fn main() {
    for line in ["Rust tips; 120", "No points here", "Bad; lots"] {
        match parse_item(line) {
            Ok(item) => println!("{item:?}"),
            Err(e) => println!("error: {e}"),
        }
    }
}`,
      },
      output: "Item { title: \"Rust tips\", points: 120 }\nerror: missing field 'points'\nerror: bad number: invalid digit found in string",
      notes: [
        "`ok_or(...)?` turns the `Option` from `split_once` into a `Result` and propagates it. `parse()?` propagates `ParseIntError`, converted by the generated `From` impl. No `unwrap`, no panic on bad input.",
        "A library would keep this typed enum so callers can `match FeedError::MissingField { .. }`. An application whose `main` only logs might instead use `anyhow::Result` and `.context(\"line: {line}\")`; the context becomes part of the printed chain.",
      ],
    },
    {
      title: "Dispatch: generics vs trait objects, then cargo test and clippy",
      text: [
        "`render_generic` is monomorphised per type: the compiler emits a direct call. `render_dynamic` takes `&dyn Summarize`: a fat pointer to the value plus a vtable, resolved at runtime. Both produce the same text; the difference is in code size, inlining and what can share one collection.",
      ],
      code: {
        lang: "rust",
        file: "src/main.rs",
        code: `trait Summarize {
    fn title(&self) -> String;
    fn summary(&self) -> String {
        format!("{} (read more...)", self.title())
    }
}

struct Article { headline: String, words: usize }
struct Video { name: String, minutes: u32 }

impl Summarize for Article {
    fn title(&self) -> String { self.headline.clone() }
    fn summary(&self) -> String { format!("{} ({} words)", self.headline, self.words) }
}
impl Summarize for Video {
    fn title(&self) -> String { self.name.clone() }
    fn summary(&self) -> String { format!("{} [{} min video]", self.name, self.minutes) }
}

fn render_generic<T: Summarize>(item: &T) -> String { item.summary() }
fn render_dynamic(item: &dyn Summarize) -> String { item.summary() }

fn main() {
    let a = Article { headline: "Ownership explained".into(), words: 900 };
    let v = Video { name: "Borrowing in 5 minutes".into(), minutes: 5 };

    println!("generic: {}", render_generic(&a));
    println!("dynamic: {}", render_dynamic(&v));

    let feed: Vec<Box<dyn Summarize>> = vec![
        Box::new(Article { headline: "Ownership explained".into(), words: 900 }),
        Box::new(Video { name: "Borrowing in 5 minutes".into(), minutes: 5 }),
    ];
    for item in &feed { println!("- {}", item.summary()); }

    println!("&Article = {} bytes, &dyn Summarize = {} bytes",
        std::mem::size_of::<&Article>(), std::mem::size_of::<&dyn Summarize>());
}

#[cfg(test)]
mod tests {
    use super::*;

    fn article() -> Article {
        Article { headline: "Ownership explained".into(), words: 900 }
    }

    #[test]
    fn generic_and_dynamic_agree() {
        let a = article();
        assert_eq!(render_generic(&a), render_dynamic(&a));
        assert_eq!(render_generic(&a), "Ownership explained (900 words)");
    }

    #[test]
    fn trait_objects_mix_types() {
        let feed: Vec<Box<dyn Summarize>> = vec![
            Box::new(article()),
            Box::new(Video { name: "Borrowing in 5 minutes".into(), minutes: 5 }),
        ];
        let lines: Vec<String> = feed.iter().map(|i| i.summary()).collect();
        assert_eq!(lines.len(), 2);
        assert!(lines[1].starts_with("Borrowing in 5 minutes"));
    }
}`,
      },
      output: "cargo run -q\ngeneric: Ownership explained (900 words)\ndynamic: Borrowing in 5 minutes [5 min video]\n- Ownership explained (900 words)\n- Borrowing in 5 minutes [5 min video]\n&Article = 8 bytes, &dyn Summarize = 16 bytes\n\ncargo test -- --nocapture\nrunning 2 tests\ntest tests::generic_and_dynamic_agree ... ok\ntest tests::trait_objects_mix_types ... ok\n\ntest result: ok. 2 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out; finished in 0.00s\n\ncargo clippy --all-targets -- -D warnings\n    Checking rustlab2 v0.1.0 (/app)\n    Finished \`dev\` profile [unoptimized + debuginfo] target(s) in 2.64s",
      notes: [
        "The two pointer sizes are the visible cost of type erasure: `&dyn Summarize` carries data plus vtable, `&Article` carries data only. Static dispatch usually wins for hot paths; dynamic dispatch wins when Article and Video must sit in the same `Vec`.",
        "`cargo test` compiles the `#[cfg(test)]` module, runs each test and reports a summary. `cargo clippy --all-targets -- -D warnings` lints code, tests and examples, and turns every warning into a build failure, which is what you want in CI. Run `cargo fmt --check` in CI too, so formatting is enforced rather than argued about.",
      ],
    },
    {
      title: "Map the error path",
      text: [
        "Draw the path before writing it. Each `?` is a return point; context is added where the error crosses a boundary (HTTP handler, CLI, job runner). `thiserror` variants belong inside the library; `anyhow` context belongs at the top that logs.",
      ],
      code: {
        lang: "mermaid",
        file: "error-flow.mmd",
        code: `flowchart TD
    A[read feed bytes] --> B{read ok?}
    B -- no --> E1[IngestError::Io]
    B -- yes --> C[parse RSS]
    C --> D{parse ok?}
    D -- no --> E2[IngestError::Feed]
    D -- yes --> F[map items]
    F --> G{item valid?}
    G -- no --> E3[IngestError::MissingField]
    G -- yes --> H[write JSON lines]
    H --> I{write ok?}
    I -- no --> E4[IngestError::Json]
    I -- yes --> J[Ok count]
    E1 --> K[main: log Display + source, exit 1]
    E2 --> K
    E3 --> K
    E4 --> K`,
      },
      notes: ["Fail fast for a batch that must be all-or-nothing; collect per-item errors when items are independent. Either way, keep the typed variant and add human context only at the edge where it is logged."],
    },
  ],
  companies: [
    "**Error policy in production services (illustrative):** Rust codebases typically ban `unwrap()` outside tests with clippy lints, use `thiserror` for library errors and `anyhow` (or similar) in binaries, and attach context to errors for logs.",
    "**serde is the de-facto standard (real, documented):** serde handles JSON, YAML and other formats in Rust; most web frameworks (Axum, Actix) use it for request and response bodies.",
    "**Traits for testability (illustrative):** services define traits for repositories and clients, implement them for real infrastructure, and use fake implementations in tests, the same pattern as Python Protocols and C# interfaces.",
    "**Cargo workspaces at scale (illustrative):** large Rust repositories split into a workspace of small crates (core, api, workers), share one lockfile and target directory, and centralise dependency versions in `[workspace.dependencies]` so upgrades happen once.",
    "**Clippy and fmt in CI (illustrative):** teams run `cargo fmt --check` and `cargo clippy --all-targets -- -D warnings` on every pull request, so style and common bug patterns are enforced by the toolchain rather than review comments.",
  ],
  mistakes: [
    { mistake: "unwrap() in production paths", why: "Quick prototyping habits", wrong: "A malformed input panics and kills the worker", fix: "Propagate with ?, handle with match, or use expect with a message only for true invariants" },
    { mistake: "String as the error type everywhere", why: "Easiest to create", wrong: "Callers cannot match on error kinds; context is lost", fix: "An error enum (thiserror) for libraries; anyhow with context for apps" },
    { mistake: "Using Option when None hides a failure", why: "Option is simpler to return", wrong: "The caller cannot tell 'not found' from 'the disk failed'", fix: "Return Result with a variant that names the cause; keep Option for genuine absence" },
    { mistake: "Box<dyn Trait> by default", why: "Familiar from OOP languages", wrong: "Unnecessary allocation and dynamic dispatch", fix: "Generics with trait bounds unless you need mixed types in one collection" },
    { mistake: "Dropping the error source and context", why: "Printing the top message feels sufficient", wrong: "Logs say 'bad number' with no line, file or underlying parse message", fix: "Keep #[source]/#[from], add context at the boundary, log the whole chain once" },
    { mistake: "Ignoring clippy", why: "Code compiles already", wrong: "Missed bugs and non-idiomatic code", fix: "cargo clippy --all-targets -- -D warnings in CI" },
    { mistake: "Not committing Cargo.lock for binaries", why: "Treating it as generated noise", wrong: "Non-reproducible builds", fix: "Commit Cargo.lock for applications; libraries may leave it out" },
    { mistake: "Enabling every feature by default", why: "Features look free", wrong: "Feature unification turns them on across the graph, bloating builds and pulling in TLS or async runtimes you did not choose", fix: "Keep default features minimal and opt in deliberately per crate" },
  ],
  bestPractices: [
    { tag: "Reliability", text: "Return Result from anything that can fail; add context to errors at boundaries; no unwrap in production code." },
    { tag: "Maintainability", text: "Small traits describing capabilities; generics with bounds; derive Debug on public types; document public items with cargo doc." },
    { tag: "Reliability", text: "cargo test, clippy -D warnings and fmt --check in CI." },
    { tag: "Performance", text: "Build with --release for benchmarks and deployment; debug builds can be many times slower. Use generics on hot paths." },
    { tag: "Maintainability", text: "Pin versions in Cargo.lock for binaries, centralise shared dependencies in a workspace, and keep feature flags additive." },
  ],
  interview: [
    { q: "How does Rust handle errors without exceptions, and when do you choose Option, Result, thiserror or anyhow?", a: "Recoverable errors are values: Result<T, E> for failure with a reason, Option<T> for absence. `?` propagates and converts via From, so a function returning Result<T, AppError> stays readable. panic is for bugs, not expected failures. In a library, expose a typed error enum, usually with thiserror, because callers can match variants and you can attach #[source]. In an application, anyhow with .context(...) is often enough because the top level logs rather than branches. Add context at boundaries and never stringify early." },
    { q: "Generics vs trait objects?", a: "Generics with trait bounds are monomorphised: static dispatch, inlinable, zero runtime overhead, but one copy of the code per concrete type, which can increase binary size and compile time. Trait objects (dyn Trait) use a fat pointer and a vtable: dynamic dispatch, a small runtime cost, but one Vec can hold different types and the code is not duplicated. Prefer generics by default; choose dyn when you need heterogeneous collections, plugin-style extensibility or smaller binaries. Both rely on the same trait definition, including default methods." },
    { q: "How do you keep a Rust project healthy with cargo?", a: "Use semver requirements and commit Cargo.lock for binaries so builds are reproducible; run cargo update deliberately, not incidentally. Keep features additive and default features small, because feature unification enables a feature across the whole dependency graph. In a workspace, share one lockfile and target directory and centralise versions in [workspace.dependencies]. In CI run cargo test, cargo clippy --all-targets -- -D warnings, cargo fmt --check and cargo doc; build release artifacts with the release profile, using lto and codegen-units when binary size or runtime matters more than build time." },
  ],
  quickCheck: [
    {
      kind: "mcq",
      prompt: "In `fn load() -> Result<Config, AppError>`, what does `let text = std::fs::read_to_string(path)?;` do on failure?",
      options: ["Panics", "Returns Err from load, converting the io::Error via From", "Returns an empty string", "Retries"],
      answer: 1,
      explanation: "? returns early with the error, converted into AppError if a From<io::Error> implementation exists.",
    },
    {
      kind: "output",
      prompt: "What prints?",
      code: { lang: "rust", code: "let v: Vec<i32> = vec![];\nprintln!(\"{}\", v.first().map(|x| x * 2).unwrap_or(-1));" },
      options: ["0", "-1", "panic", "None"],
      answer: 1,
      explanation: "first() on an empty Vec is None; map skips; unwrap_or gives -1.",
    },
    {
      kind: "mcq",
      prompt: "You are writing a library and callers must match on the kind of failure. What should the public error type be?",
      options: ["String", "anyhow::Error", "A thiserror enum with one variant per failure kind", "Box<dyn std::error::Error>"],
      answer: 2,
      explanation: "A typed enum keeps variants inspectable and still generates Display, Error and From. anyhow and boxed errors erase the type, which is fine for applications but not for callers that match.",
    },
  ],
  cheatSheet: [
    "Option<T>: Some/None, for absence. Result<T, E>: Ok/Err, for failure with a reason.",
    "? propagates errors and converts them via From; it also works on Option in an Option-returning function.",
    "Combinators: map, and_then, ok_or, unwrap_or. Reserve unwrap for tests and true invariants.",
    "Libraries: typed thiserror enum. Applications: anyhow with context. Keep #[source] for the chain.",
    "trait = interface; impl Trait for Type; default methods supply shared behaviour.",
    "Generics T: Trait = static dispatch (monomorphised). dyn Trait = dynamic dispatch via vtable.",
    "Use generics by default; Vec<Box<dyn Trait>> when one collection holds different types.",
    "cargo add · test · clippy --all-targets -- -D warnings · fmt --check · doc · build --release.",
    "Cargo.lock pins the graph for binaries; features are additive and unify across the graph.",
    "Workspaces share a lockfile and target dir; profiles trade compile time for runtime performance.",
  ],
  homework: {
    basic: {
      title: "Parse a config line safely",
      brief: ["Write `fn parse_port(s: &str) -> Result<u16, String>` that rejects non-numbers, 0, and values above 65535 with clear messages. Write tests for each case."],
      criteria: ["No unwrap/panic in the function", "Tests for valid, non-number, zero, too large", "cargo test passes"],
      hints: ["Parsing directly into u16 already rejects values above 65535."],
      solution: {
        text: ["Parsing into u16 gives range checking for free; only 0 needs an explicit check."],
        code: {
          lang: "rust",
          code: `pub fn parse_port(s: &str) -> Result<u16, String> {
    let port: u16 = s.trim().parse().map_err(|_| format!("'{s}' is not a valid port (1-65535)"))?;
    if port == 0 {
        return Err("port must not be 0".into());
    }
    Ok(port)
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test] fn valid() { assert_eq!(parse_port("8080"), Ok(8080)); }
    #[test] fn not_number() { assert!(parse_port("http").is_err()); }
    #[test] fn zero() { assert_eq!(parse_port("0"), Err("port must not be 0".into())); }
    #[test] fn too_large() { assert!(parse_port("70000").is_err()); }
}`,
        },
      },
    },
    intermediate: {
      title: "A Storage trait with two implementations",
      brief: ["Define `trait Storage { fn save(&mut self, item: NewsItem) -> Result<(), StorageError>; fn count(&self) -> usize; }`. Implement `MemoryStorage` and `JsonFileStorage` (appends one JSON line per item). Write a generic `ingest<S: Storage>(store: &mut S, items: Vec<NewsItem>)` that returns how many were saved."],
      criteria: ["Trait with two implementations", "Generic ingest function", "File errors propagated, not panicked"],
      hints: ["OpenOptions::new().create(true).append(true).open(path)", "writeln!(file, \"{}\", serde_json::to_string(&item)?)"],
      solution: {
        text: ["The generic ingest function works with any storage; tests use MemoryStorage."],
        code: {
          lang: "rust",
          code: `use std::fs::OpenOptions;
use std::io::Write;

#[derive(Debug)]
pub enum StorageError { Io(std::io::Error), Json(serde_json::Error) }
impl From<std::io::Error> for StorageError { fn from(e: std::io::Error) -> Self { Self::Io(e) } }
impl From<serde_json::Error> for StorageError { fn from(e: serde_json::Error) -> Self { Self::Json(e) } }

pub trait Storage {
    fn save(&mut self, item: NewsItem) -> Result<(), StorageError>;
    fn count(&self) -> usize;
}

#[derive(Default)]
pub struct MemoryStorage { items: Vec<NewsItem> }
impl Storage for MemoryStorage {
    fn save(&mut self, item: NewsItem) -> Result<(), StorageError> { self.items.push(item); Ok(()) }
    fn count(&self) -> usize { self.items.len() }
}

pub struct JsonFileStorage { path: String, written: usize }
impl Storage for JsonFileStorage {
    fn save(&mut self, item: NewsItem) -> Result<(), StorageError> {
        let mut f = OpenOptions::new().create(true).append(true).open(&self.path)?;
        writeln!(f, "{}", serde_json::to_string(&item)?)?;
        self.written += 1;
        Ok(())
    }
    fn count(&self) -> usize { self.written }
}

pub fn ingest<S: Storage>(store: &mut S, items: Vec<NewsItem>) -> Result<usize, StorageError> {
    let mut saved = 0;
    for item in items { store.save(item)?; saved += 1; }
    Ok(saved)
}`,
        },
      },
    },
    challenge: {
      title: "Collect errors instead of stopping",
      brief: ["Change ingest to process every item, collecting failures, and return `IngestReport { saved: usize, errors: Vec<String> }`. Then compare: when should a batch stop at the first error, and when should it continue?"],
      criteria: ["All items attempted", "Errors reported with item titles", "Written comparison of fail-fast vs best-effort"],
      hints: ["Use match instead of ? inside the loop."],
      solution: {
        text: [
          "Best-effort suits independent items (news articles): one bad item should not block 999 good ones. Fail-fast suits all-or-nothing work (a database migration, a payment batch inside a transaction) where partial success leaves inconsistent state.",
        ],
        code: {
          lang: "rust",
          code: `pub struct IngestReport { pub saved: usize, pub errors: Vec<String> }

pub fn ingest_all<S: Storage>(store: &mut S, items: Vec<NewsItem>) -> IngestReport {
    let mut report = IngestReport { saved: 0, errors: Vec::new() };
    for item in items {
        let title = item.title.clone();
        match store.save(item) {
            Ok(()) => report.saved += 1,
            Err(e) => report.errors.push(format!("{title}: {e:?}")),
        }
    }
    report
}`,
        },
      },
    },
    capstone: {
      title: "DevAtlas: ingester with real parsing and errors",
      brief: ["In services/ingester, define an IngestError enum, parse RSS with a crate (for example `rss` or `quick-xml`), convert items into a serde NewsItem, and write them as JSON lines. No unwrap outside tests; clippy clean."],
      criteria: ["cargo test and clippy -D warnings pass", "Malformed feed returns an error, not a panic", "Output is one JSON object per line"],
      hints: ["Check each crate's docs on docs.rs for the current API before using it."],
      solution: {
        text: [
          "Structure: lib.rs exposes parse_feed(&str) -> Result<Vec<NewsItem>, IngestError>; main.rs reads a file, calls it, writes JSON lines, and exits with a non-zero code on error. Phase 4 turns this into an Axum service that fetches URLs.",
          "`IngestError` is the error enum from the hands-on, with `thiserror` generating the Display and From code: `#[error(...)]` is the message, `#[from]` lets `?` convert io, rss and serde_json errors. `parse_feed` uses the `rss` crate (`Channel::read_from`), and turns an item without a title or link into `MissingField` with its index. Collecting an iterator of `Result`s into `Result<Vec<_>, _>` stops at the first bad item.",
          "`write_json_lines` is generic over `Write`, so the tests write into a `Vec<u8>` and main writes to a buffered stdout. main returns `ExitCode`: 0 on success, 1 on any IngestError, 2 for a usage error, with messages on stderr so stdout stays pure JSON Lines.",
          "Verified with Rust 1.97 (edition 2024, rss 2.1.2, thiserror 2.0.21): `cargo test` 4 passed, `cargo clippy --all-targets -- -D warnings` and `cargo fmt --check` clean. `unwrap` appears only in tests. The output is two runs: a small valid feed, then a truncated one.",
        ],
        code: {
          lang: "rust",
          file: "services/ingester/src/lib.rs",
          code: `//! Parse an RSS feed into NewsItems and write them as JSON lines.
use std::io::Write;

use serde::{Deserialize, Serialize};
use thiserror::Error;

/// Everything that can go wrong while ingesting one feed.
#[derive(Debug, Error)]
pub enum IngestError {
    #[error("could not read feed: {0}")]
    Io(#[from] std::io::Error),
    #[error("malformed feed: {0}")]
    Feed(#[from] rss::Error),
    #[error("item {index} has no {field}")]
    MissingField { index: usize, field: &'static str },
    #[error("could not write JSON: {0}")]
    Json(#[from] serde_json::Error),
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct NewsItem {
    pub title: String,
    pub url: String,
    pub published: Option<String>,
    #[serde(default)]
    pub tags: Vec<String>,
}

/// Parse RSS XML. A malformed document or an item without title/link is an error, never a panic.
pub fn parse_feed(xml: &str) -> Result<Vec<NewsItem>, IngestError> {
    let channel = rss::Channel::read_from(xml.as_bytes())?; // rss::Error -> IngestError via #[from]
    channel
        .items()
        .iter()
        .enumerate()
        .map(|(index, item)| {
            let missing = |field| IngestError::MissingField { index, field };
            Ok(NewsItem {
                title: item
                    .title()
                    .ok_or_else(|| missing("title"))?
                    .trim()
                    .to_string(),
                url: item
                    .link()
                    .ok_or_else(|| missing("link"))?
                    .trim()
                    .to_string(),
                published: item.pub_date().map(str::to_string),
                tags: item
                    .categories()
                    .iter()
                    .map(|c| c.name().to_lowercase())
                    .collect(),
            })
        })
        .collect() // Iterator<Item = Result<T, E>> collects into Result<Vec<T>, E>: stops at the first Err
}

/// Write one JSON object per line (JSON Lines), the format the rest of the pipeline reads.
pub fn write_json_lines<W: Write>(items: &[NewsItem], out: &mut W) -> Result<(), IngestError> {
    for item in items {
        serde_json::to_writer(&mut *out, item)?;
        out.write_all(b"\\n")?;
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    const FEED: &str = r#"<?xml version="1.0"?>
<rss version="2.0"><channel><title>DevAtlas</title><link>https://devatlas.dev</link><description>news</description>
  <item><title>Rust 2.0?</title><link>https://a.dev/rust</link><pubDate>Sat, 17 Oct 2026 09:00:00 GMT</pubDate><category>Rust</category></item>
  <item><title> Python 4 </title><link>https://a.dev/py</link></item>
</channel></rss>"#;

    #[test]
    fn parses_items() {
        let items = parse_feed(FEED).unwrap();
        assert_eq!(items.len(), 2);
        assert_eq!(items[0].tags, vec!["rust"]);
        assert_eq!(items[1].title, "Python 4");
        assert_eq!(items[1].published, None);
    }

    #[test]
    fn malformed_xml_is_an_error_not_a_panic() {
        let err = parse_feed("<rss><channel><item>").unwrap_err();
        assert!(matches!(err, IngestError::Feed(_)), "got {err:?}");
    }

    #[test]
    fn item_without_link_is_reported() {
        let xml = FEED.replace("<link>https://a.dev/py</link>", "");
        let err = parse_feed(&xml).unwrap_err();
        assert_eq!(err.to_string(), "item 1 has no link");
    }

    #[test]
    fn writes_one_json_object_per_line() {
        let items = parse_feed(FEED).unwrap();
        let mut out = Vec::new();
        write_json_lines(&items, &mut out).unwrap();
        let text = String::from_utf8(out).unwrap();
        let back: Vec<NewsItem> = text
            .lines()
            .map(|l| serde_json::from_str(l).unwrap())
            .collect();
        assert_eq!(back, items);
    }
}

// ---- services/ingester/src/main.rs ----
use std::io::{self, BufWriter, Write};
use std::process::ExitCode;

use ingester::{IngestError, parse_feed, write_json_lines};

fn run(path: &str) -> Result<usize, IngestError> {
    let xml = std::fs::read_to_string(path)?;
    let items = parse_feed(&xml)?;
    let mut out = BufWriter::new(io::stdout().lock());
    write_json_lines(&items, &mut out)?;
    out.flush()?;
    Ok(items.len())
}

fn main() -> ExitCode {
    let Some(path) = std::env::args().nth(1) else {
        eprintln!("usage: ingester <feed.xml>");
        return ExitCode::from(2);
    };
    match run(&path) {
        Ok(count) => {
            eprintln!("ingested {count} items from {path}");
            ExitCode::SUCCESS
        }
        Err(e) => {
            eprintln!("error: {e}");
            ExitCode::FAILURE
        }
    }
}

// ---- services/ingester/Cargo.toml (dependencies) ----
[dependencies]
rss = "2"
serde = { version = "1", features = ["derive"] }
serde_json = "1"
thiserror = "2"`,
        },
        output: "cargo run -q -- feed.xml\n{\"title\":\"Rust 1.97 released\",\"url\":\"https://blog.rust-lang.org/\",\"published\":\"Thu, 09 Jul 2026 00:00:00 GMT\",\"tags\":[\"rust\"]}\n{\"title\":\"What is new in .NET\",\"url\":\"https://devblogs.microsoft.com/dotnet/\",\"published\":null,\"tags\":[\"dotnet\",\"csharp\"]}\ningested 2 items from feed.xml\ncargo run -q -- broken.xml; echo \"exit=$?\"\nerror: malformed feed: reached end of input without finding a complete channel\nexit=1",
        pitfalls: [
          "Printing progress messages to stdout: anything reading the JSON Lines then sees a line that is not JSON. Use stderr",
          "`item.link().unwrap()`: one feed with a missing link panics the whole ingester. Return MissingField instead",
          "Writing many items straight to `io::stdout()`: Rust's stdout is line-buffered, so every line becomes a separate write system call. Wrap it in BufWriter and flush at the end",
        ],
      },
    },
  },
  deeper: [
    { label: "The Rust Book: Error Handling", url: "https://doc.rust-lang.org/book/ch09-00-error-handling.html" },
    { label: "The Rust Book: Traits", url: "https://doc.rust-lang.org/book/ch10-02-traits.html" },
    { label: "The Cargo Book", url: "https://doc.rust-lang.org/cargo/" },
    { label: "Cargo reference: Features", url: "https://doc.rust-lang.org/cargo/reference/features.html" },
    { label: "thiserror documentation", url: "https://docs.rs/thiserror/latest/thiserror/" },
    { label: "anyhow documentation", url: "https://docs.rs/anyhow/latest/anyhow/" },
  ],
  nextPreview: "Next phase: data structures and algorithms. Big-O and hash maps: turn an O(n²) solution into O(n) and learn to recognise when a lookup table is the answer.",
};
