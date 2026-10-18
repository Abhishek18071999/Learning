import type { Lesson } from "../../types";

export const lesson: Lesson = {
  id: "1.4.1",
  title: "Ownership, borrowing and lifetimes",
  minutes: 75,
  level: "Intermediate",
  prerequisites: ["Any programming language", "Rust installed via rustup (cargo --version)"],
  summary: "Understand Rust's core idea, ownership, which gives memory safety without a garbage collector. Learn moves, borrows, slices and lifetimes, and how to read borrow-checker errors calmly.",
  terms: [
    { term: "Ownership", def: "Every value in Rust has exactly one owner (a variable). When the owner goes out of scope, the value is dropped (freed)." },
    { term: "Move", def: "Assigning or passing a heap-owning value (like String or Vec) transfers ownership; the old variable can no longer be used." },
    { term: "Borrow", def: "A reference to a value without taking ownership: `&T` (shared, read-only) or `&mut T` (exclusive, can modify)." },
    { term: "Borrow checker", def: "The part of the compiler that enforces: many shared borrows OR one mutable borrow at a time, and no reference outlives its data." },
    { term: "Lifetime", def: "The span of code during which a reference is valid. Usually inferred; sometimes written as 'a to relate input and output references." },
    { term: "Slice", def: "A borrowed view into part of a collection: `&str` into a String, `&[T]` into a Vec." },
    { term: "Copy type", def: "Simple stack-only types (integers, bool, char, f64) that are copied instead of moved." },
  ],
  problem: [
    "C and C++ give you speed but let you free memory twice, use it after freeing, or let two threads write the same data at once. These bugs cause crashes and many serious security vulnerabilities. Garbage-collected languages (Java, C#, Python, Go) avoid them, but pay with GC pauses and higher memory use.",
    "Rust's answer is ownership: the compiler proves at build time that memory is used safely, so there is no garbage collector and no use-after-free. That is why Rust is chosen for performance-critical services, like the DevAtlas RSS ingester. The price is learning to work with the borrow checker; this lesson makes that price small.",
  ],
  concept: {
    analogy: [
      "Ownership is like **owning a book**. Only one person owns it at a time. You can **give it away** (move): then it is no longer yours. You can **lend it** for reading to as many friends as you like at once (shared borrows `&`), or lend it to **one** friend to write notes in it, and while they have it nobody else may read it (mutable borrow `&mut`). Every loan must end before the book is thrown away (lifetimes).",
    ],
    precise: [
      "**Three rules**: each value has one owner; there can be one owner at a time; when the owner goes out of scope the value is dropped. Types that own heap memory (String, Vec, Box) **move** on assignment; simple types implement `Copy` and are duplicated.",
      "**Borrowing rules**: at any moment you can have either any number of `&T` or exactly one `&mut T`, and references must always be valid. These two rules eliminate data races and dangling pointers at compile time.",
      "**Lifetimes** describe how long references are valid. The compiler infers them in most functions (lifetime elision). When a function returns a reference derived from its inputs, you sometimes annotate which input it comes from: `fn longest<'a>(a: &'a str, b: &'a str) -> &'a str`.",
      "**Design advice**: take parameters by reference (`&str`, `&[T]`) when you only read, by `&mut` when you modify, and by value when you need to keep or transform ownership. Clone deliberately when you truly need a second copy.",
    ],
  },
  underTheHood: {
    text: [
      "A `String` is three words on the stack (pointer, length, capacity) pointing to bytes on the heap. Moving a String copies those three words and invalidates the old variable, so only one owner can free the heap bytes. No reference counting, no GC.",
      "At the end of each scope the compiler inserts calls to `drop` in reverse declaration order. You can see it by implementing the `Drop` trait and printing.",
      "Since Rust 2018, Non-Lexical Lifetimes (NLL) end a borrow at its last use, not at the end of the block, which is why code that looks like it overlaps borrows often compiles fine.",
    ],
    diagram: {
      title: "Move vs borrow",
      nodes: [
        { label: "let s1 = String", sub: "s1 owns heap data" },
        { label: "let s2 = s1", sub: "MOVE: s1 invalid" },
        { label: "let r = &s2", sub: "BORROW: s2 still owner" },
        { label: "end of scope", sub: "s2 dropped once" },
      ],
      edges: ["", "", ""],
    },
  },
  handsOn: [
    {
      title: "Create a project",
      code: { lang: "bash", code: "cargo new ownership-lab && cd ownership-lab\ncargo run" },
      output: "Hello, world!",
    },
    {
      title: "Moves and clones",
      code: {
        lang: "rust",
        file: "src/main.rs",
        code: `fn main() {
    let a = 5;
    let b = a;                     // i32 is Copy: both usable
    println!("{a} {b}");

    let s1 = String::from("devatlas");
    let s2 = s1;                   // move: s1 is no longer valid
    // println!("{s1}");           // error[E0382]: borrow of moved value: \`s1\`
    let s3 = s2.clone();           // explicit deep copy
    println!("{s2} {s3}");

    takes_ownership(s3);           // s3 moved into the function
    // println!("{s3}");           // error: value moved
}

fn takes_ownership(text: String) {
    println!("got {text}");
}                                   // text dropped here`,
      },
      output: "5 5\ndevatlas devatlas\ngot devatlas",
    },
    {
      title: "Borrowing: & and &mut",
      code: {
        lang: "rust",
        file: "src/main.rs",
        code: `fn word_count(text: &str) -> usize {          // borrow: read only
    text.split_whitespace().count()
}

fn add_tag(tags: &mut Vec<String>, tag: &str) {  // mutable borrow
    if !tags.iter().any(|t| t == tag) {
        tags.push(tag.to_string());
    }
}

fn main() {
    let title = String::from("Ownership borrowing and lifetimes");
    println!("{} words", word_count(&title));    // title still owned by main
    println!("{title}");

    let mut tags = vec!["rust".to_string()];
    add_tag(&mut tags, "memory");
    add_tag(&mut tags, "rust");
    println!("{tags:?}");
}`,
      },
      output: "4 words\nOwnership borrowing and lifetimes\n[\"rust\", \"memory\"]",
      notes: ["Prefer `&str` over `&String` and `&[T]` over `&Vec<T>` for parameters: they accept more kinds of input."],
    },
    {
      title: "Read a borrow-checker error",
      code: {
        lang: "rust",
        code: `fn main() {
    let mut scores = vec![70, 85];
    let first = &scores[0];        // shared borrow starts
    scores.push(90);               // needs &mut while 'first' is still used below
    println!("{first}");
}`,
      },
      output: "error[E0502]: cannot borrow `scores` as mutable because it is also borrowed as immutable\n  |     let first = &scores[0];\n  |                  ------ immutable borrow occurs here\n  |     scores.push(90);\n  |     ^^^^^^^^^^^^^^^ mutable borrow occurs here\n  |     println!(\"{first}\");\n  |               ------- immutable borrow later used here",
      notes: [
        "Why it matters: push may reallocate the Vec, moving its elements, which would leave `first` pointing at freed memory. In C++ this compiles and crashes later.",
        "Fixes: copy the value (`let first = scores[0];` since i32 is Copy), or finish using `first` before pushing.",
      ],
    },
    {
      title: "Slices and lifetimes",
      code: {
        lang: "rust",
        code: `// The returned slice borrows from 'text', so it cannot outlive it.
fn first_word(text: &str) -> &str {                 // lifetime elided: output tied to input
    text.split_whitespace().next().unwrap_or("")
}

// Two inputs: we must say which one the output borrows from.
fn longest<'a>(a: &'a str, b: &'a str) -> &'a str {
    if a.len() >= b.len() { a } else { b }
}

fn main() {
    let title = String::from("Rust ownership");
    let w = first_word(&title);
    println!("{w}");
    println!("{}", longest("borrow", "checker"));
}`,
      },
      output: "Rust\nchecker",
    },
    {
      title: "Watch drop order",
      code: {
        lang: "rust",
        code: `struct Noisy(&'static str);
impl Drop for Noisy {
    fn drop(&mut self) { println!("drop {}", self.0); }
}

fn main() {
    let _a = Noisy("a");
    {
        let _b = Noisy("b");
        println!("inner scope ends");
    }
    let _c = Noisy("c");
    println!("main ends");
}`,
      },
      output: "inner scope ends\ndrop b\nmain ends\ndrop c\ndrop a",
      notes: ["This is how Rust closes files, sockets and locks automatically: their Drop implementations run when the owner goes out of scope (RAII)."],
    },
  ],
  companies: [
    "**Security-sensitive and performance-critical code**: Rust is used in parts of operating systems, browsers, cloud infrastructure (proxies, storage, virtualisation), databases and CLI tools, often replacing C/C++ components to eliminate memory-safety bugs.",
    "**Gradual adoption**: companies usually introduce Rust for one hot or risky component (a parser, a proxy, an ingester) that talks to the rest of the system over HTTP, gRPC or a queue, exactly like the DevAtlas ingester.",
    "**Fearless concurrency**: the same ownership rules that prevent dangling pointers also prevent data races, so multi-threaded Rust code is checked at compile time.",
  ],
  mistakes: [
    { mistake: "clone() everywhere to silence the borrow checker", why: "It makes errors disappear", wrong: "Hidden copies of large data; performance loss; the design problem remains", fix: "Borrow with &/&mut; restructure so borrows end earlier; clone only when you need an independent copy" },
    { mistake: "Fighting lifetimes by returning references to local data", why: "Habit from GC languages", wrong: "Cannot compile: the local is dropped at function end", fix: "Return owned data (String, Vec) from functions that create it" },
    { mistake: "Taking &String or &Vec<T> parameters", why: "Matches the caller's type", wrong: "Less flexible API (cannot pass string literals or array slices)", fix: "Take &str and &[T]" },
    { mistake: "Holding a reference while mutating the collection", why: "Natural in other languages", wrong: "E0502 errors (and in C++ it would be a real bug)", fix: "Copy the value or finish using the reference before mutating" },
    { mistake: "Overusing Rc<RefCell<T>> early", why: "It feels like GC-style sharing", wrong: "Runtime borrow panics and complicated code", fix: "Start with plain ownership and borrowing; reach for shared ownership only when the design needs it" },
  ],
  bestPractices: [
    { tag: "Performance", text: "Borrow by default; move when transferring responsibility; clone deliberately." },
    { tag: "Maintainability", text: "Accept &str and &[T]; return owned types from constructors and builders." },
    { tag: "Reliability", text: "Read the full compiler error: Rust errors explain the conflict and often suggest the fix (`rustc --explain E0502`)." },
    { tag: "Maintainability", text: "Run `cargo clippy` and `cargo fmt` in CI from day one." },
  ],
  interview: [
    { q: "What problem does Rust's ownership system solve?", a: "Memory safety without garbage collection. The compiler enforces single ownership, automatic drop at scope end, and borrowing rules (many readers or one writer, no dangling references). That eliminates use-after-free, double free, dangling pointers and data races at compile time, with no runtime GC cost." },
    { q: "Move vs borrow vs clone?", a: "A move transfers ownership; the source can no longer be used. A borrow (&T or &mut T) lends access without transferring ownership. A clone creates an independent deep copy. Copy types like integers are copied implicitly." },
    { q: "When do you need explicit lifetime annotations?", a: "When the compiler cannot infer how output references relate to input references, typically a function with several reference parameters returning a reference, or structs that hold references. The annotation does not change how long anything lives; it describes the relationship so the compiler can check it." },
  ],
  quickCheck: [
    {
      kind: "bug",
      prompt: "Why does this fail to compile?",
      code: { lang: "rust", code: "let names = vec![String::from(\"a\")];\nlet moved = names;\nprintln!(\"{}\", names.len());" },
      options: ["len() needs &mut", "names was moved into moved", "vec! is wrong syntax", "String cannot be in a Vec"],
      answer: 1,
      explanation: "Vec owns heap data, so assignment moves it. Use moved.len(), or borrow with let r = &names.",
    },
    {
      kind: "mcq",
      prompt: "Which combination of borrows is allowed at the same time?",
      options: ["Two &mut", "One &mut and one &", "Three &", "One &mut and the owner reading directly"],
      answer: 2,
      explanation: "Any number of shared borrows, or exactly one mutable borrow, never both.",
    },
    {
      kind: "output",
      prompt: "What prints?",
      code: { lang: "rust", code: "let x = 10;\nlet y = x;\nlet s = String::from(\"hi\");\nlet t = &s;\nprintln!(\"{x} {y} {s} {t}\");" },
      options: ["Compile error", "10 10 hi hi", "10 10 hi", "Runtime panic"],
      answer: 1,
      explanation: "i32 is Copy; t only borrows s, so all four are usable.",
    },
  ],
  cheatSheet: [
    "One owner; dropped at end of scope.",
    "String/Vec/Box move on assignment; integers/bools are Copy.",
    "&T many readers OR &mut T one writer.",
    "References must not outlive the data.",
    "Params: &str, &[T], &mut T; return owned data you create.",
    "clone() is explicit and costs a copy.",
    "rustc --explain E0502 for any error code.",
  ],
  homework: {
    basic: {
      title: "Fix the compiler errors",
      brief: ["Make each snippet compile with the smallest correct change and explain why: (1) using a String after passing it to a function; (2) pushing to a Vec while holding a reference to an element; (3) returning a &str to a String created inside the function."],
      criteria: ["Three fixed snippets that compile", "One-sentence explanation each", "No unnecessary clones"],
      hints: ["(1) borrow instead of move; (2) copy the element; (3) return String."],
      solution: {
        text: ["Each fix follows ownership rules instead of fighting them."],
        code: {
          lang: "rust",
          code: `// (1) borrow instead of moving
fn shout(s: &str) -> String { s.to_uppercase() }
fn one() { let name = String::from("asha"); let loud = shout(&name); println!("{name} {loud}"); }

// (2) i32 is Copy: copy the value instead of holding a reference
fn two() { let mut v = vec![1, 2]; let first = v[0]; v.push(3); println!("{first} {v:?}"); }

// (3) the String would be dropped at the end of the function, so return it owned
fn three() -> String { let s = String::from("built here"); s }

fn main() { one(); two(); println!("{}", three()); }`,
        },
      },
    },
    intermediate: {
      title: "Word frequency without clones",
      brief: ["Write `fn top_words(text: &str, n: usize) -> Vec<(&str, usize)>` returning the n most frequent words (case-sensitive is fine), borrowing words from the input instead of allocating new Strings. Explain why the return type can contain &str."],
      criteria: ["Uses HashMap<&str, usize>", "No to_string()/clone() for words", "Explanation of the lifetime relationship"],
      hints: ["The returned slices borrow from `text`; elision ties them to the input."],
      solution: {
        text: ["Every &str in the result points into `text`, so the result can live exactly as long as `text` does. The compiler infers this from the single reference input."],
        code: {
          lang: "rust",
          code: `use std::collections::HashMap;

fn top_words(text: &str, n: usize) -> Vec<(&str, usize)> {
    let mut counts: HashMap<&str, usize> = HashMap::new();
    for w in text.split_whitespace() {
        *counts.entry(w).or_insert(0) += 1;
    }
    let mut pairs: Vec<(&str, usize)> = counts.into_iter().collect();
    pairs.sort_by(|a, b| b.1.cmp(&a.1).then(a.0.cmp(b.0)));   // count desc, then word
    pairs.truncate(n);
    pairs
}

fn main() {
    println!("{:?}", top_words("rust is fast rust is safe rust", 2));   // [("rust", 3), ("is", 2)]
}`,
        },
      },
    },
    challenge: {
      title: "A struct that borrows",
      brief: ["Write `struct Headline<'a> { title: &'a str, source: &'a str }` and a function that parses lines like `\"Rust 2.0 released | blog.rust-lang.org\"` into Headlines borrowing from the input string. Show (with a compile error) why the input must outlive the headlines."],
      criteria: ["Struct with a lifetime parameter", "Parser returns Vec<Headline<'_>> borrowing input", "Demonstrated and explained the error when input is dropped early"],
      hints: ["split_once('|') returns Option<(&str, &str)>."],
      solution: {
        text: ["Borrowing structs avoid copying text when parsing large inputs; the lifetime makes it impossible to keep a Headline after the source text is freed."],
        code: {
          lang: "rust",
          code: `#[derive(Debug)]
struct Headline<'a> {
    title: &'a str,
    source: &'a str,
}

fn parse(input: &str) -> Vec<Headline<'_>> {
    input
        .lines()
        .filter_map(|line| line.split_once('|'))
        .map(|(t, s)| Headline { title: t.trim(), source: s.trim() })
        .collect()
}

fn main() {
    let raw = String::from("Rust 2.0 released | blog.example\nPostgres tips | db.example");
    let items = parse(&raw);
    println!("{items:?}");
    // drop(raw); println!("{items:?}");  // error[E0505]: cannot move out of \`raw\` because it is borrowed
}`,
        },
      },
    },
    capstone: {
      title: "DevAtlas: Rust ingester skeleton",
      brief: ["Create `services/ingester` with `cargo new`. Add a `parse_feed_titles(xml: &str) -> Vec<&str>` that extracts <title> contents with simple string slicing (a real XML parser comes next lesson), plus unit tests in the same file."],
      criteria: ["cargo test passes", "Function borrows from the input", "cargo clippy has no warnings"],
      hints: ["Find \"<title>\" and \"</title>\" with str::find in a loop over the remaining slice."],
      solution: {
        text: ["Slicing the input keeps it zero-copy; the next lesson replaces it with a proper parser and error handling."],
        code: {
          lang: "rust",
          file: "services/ingester/src/lib.rs",
          code: `pub fn parse_feed_titles(xml: &str) -> Vec<&str> {
    let mut titles = Vec::new();
    let mut rest = xml;
    while let Some(start) = rest.find("<title>") {
        let after = &rest[start + "<title>".len()..];
        match after.find("</title>") {
            Some(end) => { titles.push(after[..end].trim()); rest = &after[end..]; }
            None => break,
        }
    }
    titles
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn extracts_titles() {
        let xml = "<rss><title>Feed</title><item><title> A </title></item></rss>";
        assert_eq!(parse_feed_titles(xml), vec!["Feed", "A"]);
    }
}`,
        },
      },
    },
  },
  deeper: [
    { label: "The Rust Book: Understanding Ownership", url: "https://doc.rust-lang.org/book/ch04-00-understanding-ownership.html" },
    { label: "The Rust Book: Validating References with Lifetimes", url: "https://doc.rust-lang.org/book/ch10-03-lifetime-syntax.html" },
    { label: "Rust error codes index", url: "https://doc.rust-lang.org/error_codes/error-index.html" },
    { label: "Rust by Example", url: "https://doc.rust-lang.org/rust-by-example/" },
  ],
  nextPreview: "Next: errors, traits and cargo: Result and the ? operator, traits as Rust's interfaces, and the cargo ecosystem.",
};
