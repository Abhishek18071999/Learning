import type { Lesson } from "../../types";

export const lesson: Lesson = {
  id: "1.4.2",
  title: "Errors, traits and cargo",
  minutes: 70,
  level: "Intermediate",
  prerequisites: ["1.4.1 Ownership, borrowing and lifetimes"],
  summary: "Handle errors the Rust way with Option, Result and the ? operator, define shared behaviour with traits and generics, and use cargo, crates and tests like a professional.",
  terms: [
    { term: "Option<T>", def: "Either Some(value) or None. Rust's replacement for null: you must handle the None case." },
    { term: "Result<T, E>", def: "Either Ok(value) or Err(error). Used for operations that can fail." },
    { term: "? operator", def: "Inside a function returning Result (or Option), `expr?` returns the error early or unwraps the success value." },
    { term: "panic", def: "An unrecoverable error that stops the thread (e.g. unwrap on None). For bugs, not expected failures." },
    { term: "Trait", def: "A set of methods a type can implement; Rust's version of an interface. Example: Display, Iterator, or your own Summarize." },
    { term: "Crate", def: "A Rust package/library. Published crates live on crates.io and are added with cargo add." },
    { term: "derive", def: "`#[derive(Debug, Clone, PartialEq)]` asks the compiler to generate common trait implementations." },
  ],
  problem: [
    "The ingester downloads a feed, parses XML, extracts dates and stores items. Any step can fail: network down, invalid XML, a date in the wrong format. In many languages failures are exceptions that can be forgotten; a missing try/catch crashes the whole batch at 3 a.m.",
    "In Rust, a function that can fail says so in its type (`Result`), and the compiler makes the caller deal with it. Combined with traits for shared behaviour, this is how Rust services stay reliable as they grow.",
  ],
  concept: {
    analogy: [
      "A `Result` is a **parcel with a label**: either 'contents inside' (Ok) or 'delivery failed, here is why' (Err). You cannot use the contents without reading the label first. The `?` operator is a **conveyor belt**: if the label says failed, the parcel goes straight back to the sender; otherwise it is unwrapped and work continues.",
      "A trait is a **job certification**: any type certified as `Summarize` can be asked to summarize itself, whether it is an Article, a Video or a Podcast.",
    ],
    precise: [
      "Rust has no exceptions and no null. Absence is `Option<T>`; failure is `Result<T, E>`. You handle them with `match`, combinators (`map`, `and_then`, `unwrap_or`, `ok_or`) or `?`. `unwrap()`/`expect()` panic on failure and belong in tests, prototypes, or truly impossible cases.",
      "For applications, a common pattern is a crate like `anyhow` for convenient error propagation with context; for libraries, define a specific error enum (often with `thiserror`) so callers can match on error kinds.",
      "Traits define behaviour; generics with trait bounds (`fn print_all<T: Summarize>(items: &[T])`) are compiled to specialised code (zero-cost). Trait objects (`&dyn Summarize`, `Box<dyn Summarize>`) allow mixing different types in one collection with dynamic dispatch.",
      "Cargo builds, tests, documents and manages dependencies: `cargo new`, `cargo add`, `cargo build --release`, `cargo test`, `cargo clippy`, `cargo fmt`. `Cargo.lock` pins exact versions for binaries.",
    ],
  },
  underTheHood: {
    text: [
      "`?` desugars roughly to: match the Result; on Ok(v) produce v; on Err(e) return Err(From::from(e)). The From conversion is why `?` can turn a std::io::Error into your own error type if you implement From.",
      "Option<&T> and Option<Box<T>> use the null pointer as the None representation, so Option costs nothing extra for references (a niche optimisation).",
      "Generic functions are monomorphised: the compiler generates a version per concrete type, so calls are direct and inlinable. `dyn Trait` uses a vtable pointer, a small runtime cost in exchange for flexibility.",
    ],
    diagram: {
      title: "Error flow with ?",
      nodes: [
        { label: "fetch()?", sub: "Err → return early" },
        { label: "parse()?", sub: "Err → return early" },
        { label: "store()?", sub: "Err → return early" },
        { label: "Ok(count)", sub: "all steps succeeded" },
      ],
      edges: ["Ok", "Ok", "Ok"],
    },
  },
  handsOn: [
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
    },
    {
      title: "A custom error enum and the ? operator",
      code: {
        lang: "rust",
        code: `use std::fmt;
use std::num::ParseIntError;

#[derive(Debug)]
enum FeedError {
    MissingField(&'static str),
    BadNumber(ParseIntError),
}

impl fmt::Display for FeedError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            FeedError::MissingField(name) => write!(f, "missing field '{name}'"),
            FeedError::BadNumber(e) => write!(f, "bad number: {e}"),
        }
    }
}
impl std::error::Error for FeedError {}

impl From<ParseIntError> for FeedError {          // lets ? convert automatically
    fn from(e: ParseIntError) -> Self { FeedError::BadNumber(e) }
}

#[derive(Debug, PartialEq)]
struct Item { title: String, points: u32 }

fn parse_item(line: &str) -> Result<Item, FeedError> {
    let (title, points) = line.split_once(';').ok_or(FeedError::MissingField("points"))?;
    let points: u32 = points.trim().parse()?;     // ParseIntError -> FeedError via From
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
      notes: ["The `thiserror` crate generates the Display and From boilerplate with attributes; `anyhow` is popular for application-level code. Writing it by hand once shows what they do."],
    },
    {
      title: "Traits and generics",
      code: {
        lang: "rust",
        code: `trait Summarize {
    fn title(&self) -> String;
    fn summary(&self) -> String {                       // default method
        format!("{} (read more...)", self.title())
    }
}

struct Article { headline: String, words: usize }
struct Video { name: String, minutes: u32 }

impl Summarize for Article {
    fn title(&self) -> String { self.headline.clone() }
}
impl Summarize for Video {
    fn title(&self) -> String { self.name.clone() }
    fn summary(&self) -> String { format!("{} [{} min video]", self.name, self.minutes) }
}

fn print_one<T: Summarize>(item: &T) {                   // static dispatch (generic)
    println!("{}", item.summary());
}

fn print_all(items: &[Box<dyn Summarize>]) {           // dynamic dispatch (mixed types)
    for i in items { println!("- {}", i.summary()); }
}

fn main() {
    let a = Article { headline: "Ownership explained".into(), words: 900 };
    print_one(&a);
    let feed: Vec<Box<dyn Summarize>> = vec![
        Box::new(a),
        Box::new(Video { name: "Borrowing in 5 minutes".into(), minutes: 5 }),
    ];
    print_all(&feed);
}`,
      },
      output: "Ownership explained (read more...)\n- Ownership explained (read more...)\n- Borrowing in 5 minutes [5 min video]",
      notes: ["The `words` field is unused here; the compiler will warn about it (dead_code), which is fine for a demo."],
    },
    {
      title: "Cargo: dependencies, tests, quality",
      code: {
        lang: "bash",
        code: `cargo add serde --features derive      # adds to Cargo.toml
cargo add serde_json
cargo test                             # unit tests in #[cfg(test)] modules + tests/ folder
cargo clippy -- -D warnings            # lints; fail on warnings
cargo fmt                              # format
cargo build --release                  # optimised binary in target/release/`,
      },
    },
    {
      title: "Serialise with serde",
      code: {
        lang: "rust",
        code: `use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
struct NewsItem {
    title: String,
    url: String,
    #[serde(default)]
    tags: Vec<String>,
}

fn main() -> Result<(), serde_json::Error> {      // main can return Result
    let json = r#"{"title":"Rust 1.0 anniversary","url":"https://example.com"}"#;
    let item: NewsItem = serde_json::from_str(json)?;
    println!("{item:?}");
    println!("{}", serde_json::to_string_pretty(&item)?);
    Ok(())
}`,
      },
      output: "NewsItem { title: \"Rust 1.0 anniversary\", url: \"https://example.com\", tags: [] }\n{\n  \"title\": \"Rust 1.0 anniversary\",\n  \"url\": \"https://example.com\",\n  \"tags\": []\n}",
    },
  ],
  companies: [
    "**Explicit errors in production services**: Rust codebases typically ban `unwrap()` outside tests with clippy lints, use thiserror for library errors and anyhow (or similar) in binaries, and attach context to errors for logs.",
    "**serde is the de-facto standard** for JSON, YAML and other formats in Rust; most web frameworks (Axum, Actix) use it for request and response bodies.",
    "**Traits for testability**: services define traits for repositories and clients, implement them for real infrastructure, and use fake implementations in tests, the same pattern as Python Protocols and C# interfaces.",
  ],
  mistakes: [
    { mistake: "unwrap() in production paths", why: "Quick prototyping habits", wrong: "A malformed input panics and kills the worker", fix: "Propagate with ?, handle with match, or use expect with a message only for true invariants" },
    { mistake: "String as the error type everywhere", why: "Easiest to create", wrong: "Callers cannot match on error kinds; context is lost", fix: "An error enum (thiserror) for libraries; anyhow with context for apps" },
    { mistake: "Box<dyn Trait> by default", why: "Familiar from OOP languages", wrong: "Unnecessary allocation and dynamic dispatch", fix: "Generics with trait bounds unless you need mixed types in one collection" },
    { mistake: "Ignoring clippy", why: "Code compiles already", wrong: "Missed bugs and non-idiomatic code", fix: "cargo clippy -- -D warnings in CI" },
    { mistake: "Not committing Cargo.lock for binaries", why: "Treating it as generated noise", wrong: "Non-reproducible builds", fix: "Commit Cargo.lock for applications" },
  ],
  bestPractices: [
    { tag: "Reliability", text: "Return Result from anything that can fail; add context to errors at boundaries; no unwrap in production code." },
    { tag: "Maintainability", text: "Small traits describing capabilities; generics with bounds; derive Debug on public types." },
    { tag: "Reliability", text: "cargo test, clippy -D warnings and fmt --check in CI." },
    { tag: "Performance", text: "Build with --release for benchmarks and deployment; debug builds can be many times slower." },
  ],
  interview: [
    { q: "How does Rust handle errors without exceptions?", a: "Recoverable errors are values: Result<T, E>. Absence is Option<T>. The ? operator propagates errors upward concisely, converting types via From. Unrecoverable bugs use panic. Because errors are in the type signature, callers cannot forget them." },
    { q: "Generics vs trait objects?", a: "Generics with trait bounds are monomorphised: static dispatch, inlinable, zero runtime overhead, but one copy per type. Trait objects (dyn Trait) use a vtable for dynamic dispatch, allowing heterogeneous collections and smaller binaries at a small runtime cost." },
    { q: "When is unwrap acceptable?", a: "In tests, examples, and when an invariant guarantees success and failure would be a bug (prefer expect with a message explaining the invariant). Not for input, network or file operations." },
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
      prompt: "You need a Vec holding both Article and Video values that implement Summarize. What type do you use?",
      options: ["Vec<Summarize>", "Vec<T: Summarize>", "Vec<Box<dyn Summarize>>", "Vec<impl Summarize>"],
      answer: 2,
      explanation: "Different concrete types in one collection need trait objects.",
    },
  ],
  cheatSheet: [
    "Option<T>: Some/None. Result<T, E>: Ok/Err.",
    "? propagates errors (with From conversion).",
    "unwrap_or, map, and_then, ok_or for combinators.",
    "No unwrap in production paths; expect(\"why\") for invariants.",
    "trait = interface; impl Trait for Type; default methods.",
    "Generics T: Trait (static) vs dyn Trait (dynamic).",
    "cargo add · test · clippy · fmt · build --release.",
    "serde derive for JSON in and out.",
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
        text: ["Structure: lib.rs exposes parse_feed(&str) -> Result<Vec<NewsItem>, IngestError>; main.rs reads a file or URL, calls it, writes JSON lines, and exits with a non-zero code on error. Phase 4 turns this into an Axum service."],
      },
    },
  },
  deeper: [
    { label: "The Rust Book: Error Handling", url: "https://doc.rust-lang.org/book/ch09-00-error-handling.html" },
    { label: "The Rust Book: Traits", url: "https://doc.rust-lang.org/book/ch10-02-traits.html" },
    { label: "The Cargo Book", url: "https://doc.rust-lang.org/cargo/" },
    { label: "serde.rs", url: "https://serde.rs/" },
  ],
  nextPreview: "Next phase: data structures and algorithms. Big-O and hash maps: turn an O(n²) solution into O(n) and learn to recognise when a lookup table is the answer.",
};
