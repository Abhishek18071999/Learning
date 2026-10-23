import type { Lesson } from "../../types";

export const lesson: Lesson = {
  id: "1.4.1",
  title: "Ownership, borrowing and lifetimes",
  minutes: 90,
  level: "Intermediate",
  prerequisites: ["Any programming language", "Rust installed via rustup (cargo --version)"],
  summary: "Understand Rust's core idea, ownership, which gives memory safety without a garbage collector. Learn moves, Copy versus Clone, shared and mutable borrows, non-lexical lifetimes, lifetime annotations, Rc and RefCell, and how to read borrow-checker errors calmly.",
  terms: [
    { term: "Ownership", def: "Every value in Rust has exactly one owner (a variable). When the owner goes out of scope, the value is dropped (freed)." },
    { term: "Move", def: "Assigning or passing a heap-owning value (like String or Vec) transfers ownership; the old variable can no longer be used. The transfer itself is cheap: only the stack part is copied, never the heap bytes." },
    { term: "Copy type", def: "A type whose bits can be duplicated implicitly (integers, bool, char, f64, shared references, and tuples/arrays of Copy types). Assignment copies it and both variables stay usable." },
    { term: "Clone", def: "An explicit deep copy through the `Clone` trait. `String::clone` allocates new heap bytes, so it costs time and memory; `Rc::clone` is the exception because it only increments a reference count." },
    { term: "Borrow", def: "A reference to a value without taking ownership: `&T` (shared, read-only, many allowed) or `&mut T` (exclusive, may modify, only one allowed). References are just pointers at runtime; the rules are checked at compile time." },
    { term: "Borrow checker", def: "The compiler pass that enforces: many shared borrows OR exactly one mutable borrow at a time, and no reference outlives the data it points to. It also rejects moving or mutating a value while it is borrowed." },
    { term: "Slice", def: "A borrowed view into part of a collection: `&str` into a String or string literal, `&[T]` into a Vec, array or other slice. A slice is a pointer plus a length, so it never owns the elements." },
    { term: "Non-lexical lifetimes (NLL)", def: "The rule, stable since Rust 1.31, that a borrow ends at its last use rather than at the end of the enclosing block. This is why two sequential `&mut` borrows in one block usually compile." },
    { term: "Lifetime ('a)", def: "The span of code during which a reference is valid. `'a` is a name for such a region, not a duration you can measure. Annotations relate input and output references; they never change how long a value lives." },
    { term: "Lifetime elision", def: "The inference rules that let you omit most lifetime annotations: each input reference gets its own lifetime; one input lifetime is copied to the output; `&self`/`&mut self` supplies the output lifetime." },
    { term: "Rc<T> (reference counting)", def: "A single-threaded smart pointer that shares immutable ownership of a heap value. `Rc::clone` increments a non-atomic strong count; the value is dropped when the last strong reference goes away. Not `Send` or `Sync`." },
    { term: "RefCell<T> (interior mutability)", def: "A container that moves the borrow check to runtime with a borrow flag. `borrow()` and `borrow_mut()` return guards; a conflicting access panics with `already borrowed`. Usually paired with Rc: `Rc<RefCell<T>>`." },
  ],
  problem: [
    "C and C++ give you speed but let you free memory twice, use it after freeing, or let two threads write the same data at once. These bugs cause crashes and many serious security vulnerabilities. Garbage-collected languages (Java, C#, Python, Go) avoid them, but pay with GC pauses and higher memory use.",
    "Rust's answer is ownership: the compiler proves at build time that memory is used safely, so there is no garbage collector and no use-after-free. That is why Rust is chosen for performance-critical services, like the DevAtlas RSS ingester. The price is learning to work with the borrow checker; the compiler's errors are not scolding, they are a precise description of a real aliasing bug, and this lesson teaches you to read them, fix them, and design code that does not fight them.",
  ],
  concept: {
    analogy: [
      "Ownership is like **owning a book**. Only one person owns it at a time. You can **give it away** (move): then it is no longer yours. You can **lend it** for reading to as many friends as you like at once (shared borrows `&`), or lend it to **one** friend to write notes in it, and while they have it nobody else may read it (mutable borrow `&mut`). You can also **photocopy** the book (clone) and keep the original, but the copy costs paper and time. Every loan must end before the book is thrown away (lifetimes), and if the book is a library copy you must not hand out a page after the library has taken it back (returning a reference to a local).",
    ],
    precise: [
      "**Three ownership rules**: each value has exactly one owner; there can be only one owner at a time; when the owner goes out of scope the value is dropped. Types that own heap memory (`String`, `Vec`, `Box`) **move** on assignment, which copies only the stack part and invalidates the old binding. Simple types implement `Copy` and are duplicated implicitly; `Clone` is an explicit, possibly allocating, deep copy.",
      "**Borrowing rules**: at any moment you can have either any number of `&T` or exactly one `&mut T`, never both, and a reference must always point at live data. While a borrow is live the owner may not be moved or mutated (shared borrow) or touched at all (mutable borrow). Since Rust 2018/1.31, **non-lexical lifetimes** end a borrow at its last use, so sequential borrows in one block are usually fine.",
      "**Lifetimes** describe how long references are valid. The compiler infers them in most functions (lifetime elision). When a function returns a reference derived from its inputs, you sometimes annotate which input it comes from: `fn longest<'a>(a: &'a str, b: &'a str) -> &'a str`. The annotation is a constraint, not a runtime instruction. A function cannot return a reference to a value it created locally, because that value is dropped when the function returns.",
      "**Design advice**: take parameters by reference (`&str`, `&[T]`) when you only read, by `&mut` when you modify, and by value when you need to keep or transform ownership. Clone deliberately when you truly need a second copy. Reach for `Rc<RefCell<T>>` only when a graph or shared cache genuinely needs multiple owners and mutation; it replaces compile-time checking with runtime counters and borrow-flag checks, and it panics on a conflicting borrow.",
    ],
  },
  underTheHood: {
    text: [
      "A `String` is three words on the stack (pointer, length, capacity) pointing to bytes on the heap. `let s2 = s1;` copies those three words and marks `s1` uninitialised, so exactly one variable owns the allocation and exactly one `drop` frees it. A move is therefore O(1) no matter how long the string is, and using the old binding afterwards is a compile-time error, not undefined behaviour.",
      "`Copy` is a marker trait for types whose bits may be duplicated safely: integers, `bool`, `char`, floats, shared references, and tuples or arrays of Copy types. Assignment performs a `memcpy` and both variables remain valid. `Clone` is an ordinary trait with a `clone` method that may allocate and copy deeply. Every `Copy` type must also be `Clone`, but not the reverse, and a type that implements `Drop` cannot be `Copy` because both copies would free the same resource.",
      "A shared borrow `&T` is a pointer the compiler treats as read-only; a mutable borrow `&mut T` is a pointer with exclusive access. While a `&mut T` is live the owner cannot be read, written, moved or borrowed; while any `&T` is live the owner cannot be mutated or moved. This is the **aliasing XOR mutation** rule: many readers or one writer, never both. It is what makes data races impossible, and it costs nothing at runtime: `&T` and `&mut T` are just pointers, and the checks happen in the compiler.",
      "The borrow checker does not use the textual end of a block; it uses liveness. Under **non-lexical lifetimes** a borrow ends at its last use, which is why `let a = &mut v; a.push(1); let b = &mut v;` compiles even though both names live in the same block: the first borrow is dead before the second begins. Calls also reborrow automatically: passing `&mut v` to a function usually creates a shorter reborrow instead of moving the `&mut` itself.",
      "A lifetime is a region of code in which a reference is valid. `'a` is a name for such a region, not a duration in milliseconds. Annotations are constraints: `fn longest<'a>(a: &'a str, b: &'a str) -> &'a str` says the returned reference may be used only while both inputs are valid. They never extend or shorten how long a value actually lives; they describe relationships the compiler must check. `'static` means the reference may live for the whole program (string literals, leaked data), not that the value is indestructible in every sense.",
      "Lifetime elision lets you omit annotations in three common cases: each input reference gets its own lifetime; if there is exactly one input lifetime, the output gets it; if there is a `&self` or `&mut self`, the output gets the lifetime of `self`. Otherwise you must write them. A struct that stores references needs a lifetime parameter (`struct Headline<'a> { title: &'a str }`), and the caller must keep the source alive for as long as the struct exists.",
      "A function cannot return a reference to a value it created locally because the local is dropped when the frame ends, leaving a dangling pointer. `fn make() -> &String` fails with E0106 (there is no input to borrow from); adding a named lifetime produces E0515 (cannot return a reference to a local variable). The fixes are to return owned data (`String`, `Vec`, `Box`) or to return a borrow of an input (`fn first_word(s: &str) -> &str`).",
      "`Rc<T>` puts a strong count and a weak count next to the value on the heap. `Rc::clone` increments the strong count (a non-atomic read-modify-write) and is O(1); it does not clone the `T`. The last `Rc` to drop frees the value. `Rc` only gives shared, immutable access, so mutation needs interior mutability: `RefCell<T>` keeps a borrow flag at runtime. `borrow()` increments the shared count, `borrow_mut()` sets the exclusive flag, and a conflicting access panics with `already borrowed` instead of failing to compile. `Rc<RefCell<T>>` therefore moves the borrow check from compile time to run time and is neither `Send` nor `Sync`; for threads use `Arc<Mutex<T>>`.",
      "Read `rustc` errors from the top: the error code and message, the primary span (`^^^`), then the notes showing where the conflicting borrow started and where it is later used. Map the code to the rule: E0382 use after move; E0499 two mutable borrows; E0502 shared borrow then mutation; E0106 or E0515 returning a reference with no valid owner; E0597 a borrow outliving its owner. The `help` lines often contain the exact fix. `rustc --explain E0382` prints a long explanation, and `cargo clippy` catches many ownership smells before they become errors.",
    ],
    diagram: {
      title: "One borrow, from creation to drop",
      nodes: [
        { label: "let mut v", sub: "v owns the Vec" },
        { label: "&v[0]", sub: "shared borrow begins" },
        { label: "last use of first", sub: "borrow ends (NLL)" },
        { label: "v.push(3)", sub: "exclusive &mut v" },
        { label: "end of scope", sub: "v dropped once" },
      ],
      edges: ["borrow", "last use", "mutation", "drop"],
      caption: "The borrow ends at its last use, not at the closing brace. Under NLL the mutation is allowed because no reader is live any more.",
    },
  },
  handsOn: [
    {
      title: "Moves, Copy and Clone",
      text: ["Build a tiny program and run it. `i32` is `Copy`, so `b` is a duplicate. `String` is not, so `let s2 = s1` moves the value and `s1` becomes invalid. `clone()` asks for an explicit deep copy."],
      code: {
        lang: "rust",
        file: "src/main.rs",
        code: `fn main() {
    let a = 5;
    let b = a;                     // i32 is Copy: both usable
    println!("{a} {b}");

    let s1 = String::from("devatlas");
    let s2 = s1;                   // move: s1 is no longer valid
    // println!("{s1}");           // error[E0382]: borrow of moved value
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
      notes: [
        "A move copies only the three-word stack header, then invalidates the old binding. The heap bytes never move, and `drop` runs once, for the new owner.",
        "`Copy` is implicit and free; `Clone` is explicit and may allocate. Cloning a large `Vec` copies every element, so clone deliberately, not to silence an error.",
      ],
    },
    {
      title: "Borrowing: &T, &mut T, NLL and shared ownership",
      text: [
        "A shared borrow lets a function read without taking ownership. A mutable borrow lets it change the value, but only one may be live at a time. Notice the last block: the shared borrow ends at `println!`, so `push` is legal, and the first `&mut` ends at `a.push`, so the second `&mut` is legal. That is NLL at work.",
        "The final lines show the escape hatch for shared mutation: `Rc` shares ownership and `RefCell` moves the borrow check to runtime.",
      ],
      code: {
        lang: "rust",
        file: "src/main.rs",
        code: `use std::cell::RefCell;
use std::rc::Rc;

fn word_count(text: &str) -> usize {              // borrow: read only
    text.split_whitespace().count()
}

fn add_tag(tags: &mut Vec<String>, tag: &str) {   // mutable borrow
    if !tags.iter().any(|t| t == tag) {
        tags.push(tag.to_string());
    }
}

fn main() {
    let title = String::from("Ownership borrowing and lifetimes");
    println!("{} words", word_count(&title));     // title still owned by main
    println!("{title}");

    let mut tags = vec!["rust".to_string()];
    add_tag(&mut tags, "memory");
    add_tag(&mut tags, "rust");
    println!("{tags:?}");

    let mut v = vec![10, 20];
    let first = &v[0];                            // shared borrow
    println!("first = {first}");
    v.push(30);                                   // OK: last use was above

    let a = &mut v;                               // first exclusive borrow
    a.push(40);
    let b = &mut v;                               // OK: a is dead now
    b.push(50);
    println!("{v:?}");

    let shared = Rc::new(RefCell::new(vec![1, 2]));
    let left = Rc::clone(&shared);                // count 2, no Vec copy
    let right = Rc::clone(&shared);               // count 3
    left.borrow_mut().push(3);
    right.borrow_mut().push(4);
    println!("strong count = {}", Rc::strong_count(&shared));
    println!("data = {:?}", shared.borrow());
    let read = left.borrow();
    println!("read guard sees {:?}", *read);
}`,
      },
      output: "4 words\nOwnership borrowing and lifetimes\n[\"rust\", \"memory\"]\nfirst = 10\n[10, 20, 30, 40, 50]\nstrong count = 3\ndata = [1, 2, 3, 4]\nread guard sees [1, 2, 3, 4]",
      notes: [
        "Prefer `&str` over `&String` and `&[T]` over `&Vec<T>` for parameters: they accept more kinds of input, including literals and slices, without losing anything.",
        "`Rc::clone` is cheap because it only bumps a counter. The borrow flag inside `RefCell` is checked on every `borrow` and `borrow_mut`; a second `borrow_mut` while `read` is alive would panic at runtime, not fail to compile.",
      ],
    },
    {
      title: "Read four real borrow-checker errors",
      text: [
        "Each snippet below was compiled separately with `rustc 1.99.1`; the output is copied verbatim. The fixed program at the bottom compiles and runs. Read each error from the top: message, primary span, the note that names the conflicting borrow, then the help.",
      ],
      code: {
        lang: "rust",
        file: "main.rs",
        code: `// 1) use after move
//    let s1 = String::from("devatlas");
//    let s2 = s1;
//    println!("{s1} {s2}");
//
// 2) two mutable borrows alive at the same time
//    let mut v = vec![1, 2, 3];
//    let a = &mut v;
//    let b = &mut v;
//    a.push(4);
//    b.push(5);
//
// 3) returning a reference to a local
//    fn make<'a>() -> &'a String { let s = String::from("local"); &s }
//
// 4) a returned borrow outliving one of its inputs
//    let result;
//    { let b = String::from("checker"); result = longest(&a, &b); }
//    println!("{result}");
//
// 5) shared borrow still used after a mutation
//    let first = &scores[0]; scores.push(90); println!("{first}");

fn longest<'a>(a: &'a str, b: &'a str) -> &'a str {
    if a.len() >= b.len() { a } else { b }
}

fn main() {
    // Fix 1: explicit deep copy, or borrow s1 instead of moving it.
    let s1 = String::from("devatlas");
    let s2 = s1.clone();
    println!("{s1} {s2}");

    // Fix 2: end each exclusive borrow before starting the next.
    let mut v = vec![1, 2, 3];
    { let a = &mut v; a.push(4); }
    { let b = &mut v; b.push(5); }
    println!("{v:?}");

    // Fix 3: return owned data; the caller can borrow it if it wants.
    fn make() -> String { String::from("local") }
    println!("{}", make());

    // Fix 4: keep every borrowed input alive while the result is used.
    let a = String::from("borrow");
    {
        let b = String::from("checker");
        println!("{}", longest(&a, &b));
    }

    // Fix 5: copy the value (i32 is Copy) or read before pushing.
    let mut scores = vec![70, 85];
    let first = scores[0];
    scores.push(90);
    println!("{first} {scores:?}");
}`,
      },
      output: `error[E0382]: borrow of moved value: \`s1\`
 --> e_move.rs:4:16
  |
2 |     let s1 = String::from("devatlas");
  |         -- move occurs because \`s1\` has type \`String\`, which does not implement the \`Copy\` trait
3 |     let s2 = s1;
  |              -- value moved here
4 |     println!("{s1} {s2}");
  |                ^^ value borrowed here after move
  |
help: consider cloning the value if the performance cost is acceptable
  |
3 |     let s2 = s1.clone();
  |                ++++++++

error: aborting due to 1 previous error

For more information about this error, try \`rustc --explain E0382\`.

error[E0499]: cannot borrow \`v\` as mutable more than once at a time
 --> e_two_mut.rs:4:13
  |
3 |     let a = &mut v;
  |             ------ first mutable borrow occurs here
4 |     let b = &mut v;
  |             ^^^^^^ second mutable borrow occurs here
5 |     a.push(4);
  |     - first borrow later used here

error: aborting due to 1 previous error

For more information about this error, try \`rustc --explain E0499\`.

error[E0515]: cannot return reference to local variable \`s\`
 --> e_local2.rs:3:5
  |
3 |     &s
  |     ^^ returns a reference to data owned by the current function

error: aborting due to 1 previous error

For more information about this error, try \`rustc --explain E0515\`.

error[E0597]: \`b\` does not live long enough
  --> e_lifetime.rs:10:30
   |
 9 |         let b = String::from("checker");
   |             - binding \`b\` declared here
10 |         result = longest(&a, &b);
   |                              ^^ borrowed value does not live long enough
11 |     }
   |     - \`b\` dropped here while still borrowed
12 |     println!("{result}");
   |                ------ borrow later used here

error: aborting due to 1 previous error

For more information about this error, try \`rustc --explain E0597\`.

error[E0502]: cannot borrow \`scores\` as mutable because it is also borrowed as immutable
 --> e_0502.rs:4:5
  |
3 |     let first = &scores[0];
  |                  ------ immutable borrow occurs here
4 |     scores.push(90);
  |     ^^^^^^^^^^^^^^^ mutable borrow occurs here
5 |     println!("{first}");
  |                ----- immutable borrow later used here

error: aborting due to 1 previous error

For more information about this error, try \`rustc --explain E0502\`.

===== the fixed program =====
devatlas devatlas
[1, 2, 3, 4, 5]
local
checker
70 [70, 85, 90]`,
      notes: [
        "E0382 says the value was moved, not that memory was freed. The compiler rejects the later read because the heap owner changed; `clone` or a borrow keeps both uses valid.",
        "E0499 and E0502 are the same rule from two directions: a mutable borrow excludes every other access, and a shared borrow excludes mutation. NLL shrinks a borrow to its last use, so often the fix is to reorder statements, not to clone.",
        "E0515 is the important one for API design: a reference must point at something that outlives it. Returning `String` or borrowing an input are the two honest options. E0597 says the caller tried to keep the result longer than one of its inputs; move the use inside the inner scope or return owned data.",
      ],
    },
    {
      title: "Compare the ownership tools",
      text: ["Keep this table nearby. The cost column is about runtime work; the compile-time column is about what the compiler can prove for you."],
      code: {
        lang: "text",
        file: "ownership-tools.txt",
        code: `operation              what happens                       runtime cost              original still usable?
let b = a (i32)        Copy: bitwise duplicate             none (memcpy of 4 bytes)  yes, both valid
let b = a (String)     Move: 3-word header copied          none, O(1)                no, a invalid
a.clone()              Clone: deep copy, new allocation    allocation + memcpy       yes, independent
&a                     Shared borrow: read-only pointer    none                      yes, read-only
&mut a                 Exclusive borrow: write pointer     none                      yes, after it ends
Rc::clone(&a)          Reference count +1                  non-atomic increment      yes, shared owner
a.borrow_mut()         RefCell flag set at runtime         flag check, may panic     yes, if unborrowed

Rule: many &T OR one &mut T, never both. NLL ends a borrow at its last use.
Rc/RefCell move the same rule to runtime; they do not remove it.`,
      },
      notes: [
        "`Rc` uses non-atomic counters because it is single-threaded. Across threads use `Arc`, and pair it with `Mutex` or `RwLock` because `RefCell` is not `Sync`.",
        "A `RefCell` panic is a real bug found late. Prefer restructuring ownership so the compiler catches it, and use `try_borrow_mut` when a conflict is genuinely possible and recoverable.",
      ],
    },
    {
      title: "Draw the borrow timeline",
      text: ["Mermaid makes the NLL rule visible. Paste this into a GitHub Markdown file or the Mermaid live editor; the shared borrow ends before the mutation, and the value is dropped once at the end."],
      code: {
        lang: "mermaid",
        file: "borrow-timeline.mmd",
        code: `sequenceDiagram
    participant Owner as s1 / v (owner)
    participant Heap as heap data
    participant Reader as r: &T
    participant Writer as w: &mut T
    Owner->>Heap: owns (drop will free once)
    Reader->>Heap: shared borrow, many readers allowed
    Note over Reader: last use - borrow ends here (NLL)
    Writer->>Heap: exclusive borrow, no readers alive
    Note over Writer: last use - borrow ends here
    Heap-->>Owner: dropped exactly once at end of scope`,
      },
      notes: [
        "Read the diagram left to right as time. The important part is the gap: a borrow exists from creation to last use, not from creation to the closing brace.",
        "If a reader were used after the writer starts, the diagram would be illegal and the compiler would reject it with E0502 or E0499.",
      ],
    },
  ],
  companies: [
    "**Mozilla and the Firefox team (illustrative):** Rust began at Mozilla, and the Servo browser engine proved that ownership and borrowing could deliver C++-class performance while removing whole classes of memory-safety bugs. Firefox later shipped Rust components such as the style engine, and the language's design still reflects that browser-scale concurrency pressure.",
    "**AWS (illustrative):** AWS uses Rust in performance- and security-sensitive infrastructure, including the Firecracker microVM and parts of S3. Ownership makes it practical to run many isolated workloads in one process without a garbage collector adding latency, and the borrow checker catches data races in the async I/O code before deployment.",
    "**Cloudflare (illustrative):** Cloudflare's Pingora proxy is written in Rust precisely because a proxy must handle enormous concurrency with predictable latency. The aliasing rule turns accidental shared mutable state between request tasks into a compile error instead of a production race.",
    "**Microsoft and Google (illustrative):** Both companies have public Rust adoption stories in low-level components, from Windows kernel code to Android's Bluetooth and DNS modules. The motivation is usually the same: new code should not add memory-safety vulnerabilities, and ownership gives that guarantee without a runtime GC.",
    "**Discord (illustrative):** Discord rewrote a hot read-state service in Rust and reported predictable latency without GC pauses. The lesson generalises: ownership is most valuable where a stop-the-world pause or a use-after-free is expensive, and where a small, well-bounded component can be introduced without rewriting the whole system.",
  ],
  mistakes: [
    { mistake: "clone() everywhere to silence the borrow checker", why: "It makes errors disappear immediately", wrong: "Hidden deep copies of large data, performance loss, and the design problem remains", fix: "Borrow with &/&mut; restructure so borrows end earlier; clone only when you need an independent copy" },
    { mistake: "Fighting lifetimes by returning references to local data", why: "Habit from garbage-collected languages", wrong: "E0106 or E0515: the local is dropped when the function returns, so the reference would dangle", fix: "Return owned data (String, Vec, Box) from functions that create it, or return a borrow of an input" },
    { mistake: "Taking &String or &Vec<T> parameters", why: "It matches the caller's variable type", wrong: "The API is less flexible: string literals and array slices cannot be passed without allocating", fix: "Take &str and &[T], which accept String, literals, Vec and arrays alike" },
    { mistake: "Holding a reference while mutating the collection", why: "Natural in other languages and often compiles there", wrong: "E0502/E0499, because push may reallocate and invalidate the reference; in C++ this is a real use-after-free", fix: "Copy the value if it is Copy, or finish using the reference before mutating" },
    { mistake: "Reaching for Rc<RefCell<T>> early", why: "It feels like garbage-collected sharing and makes the compiler stop complaining", wrong: "Runtime borrow panics, reference cycles that leak, lost Send/Sync, and harder-to-follow code", fix: "Start with plain ownership and borrowing; use Rc/RefCell only where multiple owners are genuinely required" },
    { mistake: "Thinking a lifetime annotation changes how long a value lives", why: "The syntax looks like a duration or a setting", wrong: "You add annotations hoping to extend a borrow, but annotations are checked constraints; invalid code still fails", fix: "Change ownership or scope instead: return owned data, keep the input alive longer, or move the use earlier" },
    { mistake: "Adding blocks and drop() calls until the compiler stops complaining", why: "It can make one error go away", wrong: "The code becomes contorted and may still encode the wrong ownership model, with hidden clones or premature drops", fix: "Identify which value owns the data and who needs access; redesign the function signatures around that" },
    { mistake: "Assuming RefCell checks are free or impossible to hit", why: "borrow() and borrow_mut() look like ordinary method calls", wrong: "Every call checks a flag, and a conflicting access panics at runtime in production", fix: "Keep borrow guards short, never hold one across a callback that might re-enter, and prefer try_borrow_mut where recovery matters" },
  ],
  bestPractices: [
    { tag: "Performance", text: "Borrow by default; move when transferring responsibility; clone deliberately. A move is O(1) and a shared borrow is just a pointer, so the safe design is usually also the fast one." },
    { tag: "Maintainability", text: "Accept &str and &[T] in parameters; return owned types from constructors and builders. This keeps call sites flexible and makes ownership obvious in the signature." },
    { tag: "Reliability", text: "Read the full compiler error and its notes before editing: rustc shows where the conflicting borrow started and where it is used, and `rustc --explain E0502` explains the rule." },
    { tag: "Security", text: "Do not reach for unsafe or raw pointers to bypass the borrow checker. The aliasing rule is what prevents use-after-free and data races; keep that guarantee in the type system." },
    { tag: "Performance", text: "Use Rc only for single-threaded shared ownership and Arc<Mutex<T>> across threads. Keep Rc<RefCell<T>> graphs small and acyclic, or use Weak to break cycles that would leak." },
  ],
  interview: [
    { q: "What problem does Rust's ownership system solve, and what are the three rules?", a: "It gives memory safety without a garbage collector. The rules are: every value has one owner; there is only one owner at a time; when the owner goes out of scope the value is dropped. On top of that, borrowing allows many &T or one &mut T, never both, and no reference may outlive its data. Together these eliminate use-after-free, double free, dangling pointers and data races at compile time, with no runtime GC pauses. The cost is that ownership must be designed explicitly, and the borrow checker rejects programs that would be safe only by accident." },
    { q: "Explain move, Copy, Clone and borrowing, with the cost of each.", a: "A move transfers ownership: assigning a String or Vec copies the small stack header, invalidates the source, and is O(1). Copy is an implicit bitwise duplicate for simple types such as i32 and bool; both bindings stay valid and there is no allocation. Clone is an explicit call that may allocate and copy deeply, so String::clone costs time and memory proportional to the contents; Rc::clone is the exception and only increments a reference count. A borrow lends access without ownership: &T is a read-only pointer and &mut T is an exclusive pointer; both are zero-cost at runtime, but the compiler forbids aliasing mutation and mutation while shared. Choose a borrow for reading, &mut for in-place change, a move to transfer responsibility, and clone only for a genuinely independent copy." },
    { q: "When must you write explicit lifetimes, and why can't a function return a reference to a local?", a: "You write lifetimes when the compiler cannot infer how output references relate to inputs: a function with several reference parameters returning a reference, a struct holding references, or an impl with borrowed data. Elision covers the common cases: one input lifetime flows to the output, and &self supplies the output lifetime. An annotation does not change any value's lifetime; it states an outlives constraint the compiler verifies, such as the result of `longest<'a>(a: &'a str, b: &'a str) -> &'a str` being valid only while both inputs are. A function cannot return a reference to a local because the local's stack frame is gone at return, so the pointer would dangle: rustc reports E0106 without a lifetime, or E0515 with one. Return owned data such as String, or return a borrow of an input. For shared ownership that outlives any single stack frame, use Rc (single-threaded) or Arc (threaded); add RefCell or Mutex when mutation is needed, accepting runtime checks." },
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
      explanation: "Any number of shared borrows, or exactly one mutable borrow, never both. While a &mut is live the owner cannot be read either.",
    },
    {
      kind: "output",
      prompt: "What prints?",
      code: { lang: "rust", code: "let x = 10;\nlet y = x;\nlet s = String::from(\"hi\");\nlet t = &s;\nprintln!(\"{x} {y} {s} {t}\");" },
      options: ["Compile error", "10 10 hi hi", "10 10 hi", "Runtime panic"],
      answer: 1,
      explanation: "i32 is Copy; t only borrows s, so all four are usable. Shared borrows do not take ownership.",
    },
  ],
  cheatSheet: [
    "Three rules: one owner per value; one owner at a time; drop when the owner leaves scope.",
    "Move = O(1) header copy plus invalidation of the source. Copy = implicit bitwise duplicate. Clone = explicit, possibly deep, copy.",
    "Borrowing: many &T OR exactly one &mut T, never both; no reference may outlive its data.",
    "NLL ends a borrow at its last use, not at the closing brace. Reorder statements before cloning.",
    "Lifetime annotations describe relationships and never extend a value's life. `'static` means the reference can live for the whole program.",
    "Elision: one input lifetime flows to the output; &self supplies the output lifetime; otherwise write `'a`.",
    "Never return a reference to a local (E0106/E0515); return owned data or borrow an input.",
    "Rc::clone only increments a non-atomic count; the last strong reference drops the value. Use Weak to break cycles.",
    "RefCell checks borrows at runtime and panics with `already borrowed`; Rc<RefCell<T>> is not Send/Sync. Use Arc<Mutex<T>> across threads.",
    "Error map: E0382 after move, E0499 two &mut, E0502 shared then mutable, E0597 borrow outlives owner. `rustc --explain <code>`.",
  ],
  homework: {
    basic: {
      title: "Fix the compiler errors",
      brief: ["Make each snippet compile with the smallest correct change and explain why: (1) using a String after passing it to a function; (2) pushing to a Vec while holding a reference to an element; (3) returning a &str to a String created inside the function."],
      criteria: ["Three fixed snippets that compile", "One-sentence explanation each", "No unnecessary clones"],
      hints: ["(1) borrow instead of move; (2) copy the element; (3) return String."],
      solution: {
        text: ["Each fix follows ownership rules instead of fighting them. The program below compiles and the output was captured with rustc 1.99.1."],
        code: {
          lang: "rust",
          file: "main.rs",
          code: `// (1) borrow instead of moving
fn shout(s: &str) -> String { s.to_uppercase() }
fn one() { let name = String::from("asha"); let loud = shout(&name); println!("{name} {loud}"); }

// (2) i32 is Copy: copy the value instead of holding a reference
fn two() { let mut v = vec![1, 2]; let first = v[0]; v.push(3); println!("{first} {v:?}"); }

// (3) the String would be dropped at the end of the function, so return it owned
fn three() -> String { let s = String::from("built here"); s }

fn main() { one(); two(); println!("{}", three()); }`,
        },
        output: "asha ASHA\n1 [1, 2, 3]\nbuilt here",
        pitfalls: ["Replacing a move with clone when a borrow would do", "Returning a &'static str from a locally built String"],
      },
    },
    intermediate: {
      title: "Word frequency without clones",
      brief: ["Write `fn top_words(text: &str, n: usize) -> Vec<(&str, usize)>` returning the n most frequent words (case-sensitive is fine), borrowing words from the input instead of allocating new Strings. Explain why the return type can contain &str."],
      criteria: ["Uses HashMap<&str, usize>", "No to_string()/clone() for words", "Explanation of the lifetime relationship"],
      hints: ["The returned slices borrow from `text`; elision ties them to the input.", "Sort by count descending, then word ascending for stable output."],
      solution: {
        text: ["Every &str in the result points into `text`, so the result can live exactly as long as `text` does. The compiler infers this from the single reference input, which is the first elision rule: one input lifetime is copied to the output."],
        code: {
          lang: "rust",
          file: "main.rs",
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
    println!("{:?}", top_words("rust is fast rust is safe rust", 2));
}`,
        },
        output: "[(\"rust\", 3), (\"is\", 2)]",
        pitfalls: ["Adding a lifetime parameter that is not needed; elision already ties the output to `text`", "Calling to_string() for each word, which breaks the zero-copy goal"],
      },
    },
    challenge: {
      title: "A struct that borrows",
      brief: ["Write `struct Headline<'a> { title: &'a str, source: &'a str }` and a function that parses lines like `\"Rust 2.0 released | blog.rust-lang.org\"` into Headlines borrowing from the input string. Show (with a compile error) why the input must outlive the headlines."],
      criteria: ["Struct with a lifetime parameter", "Parser returns Vec<Headline<'_>> borrowing input", "Demonstrated and explained the error when input is dropped early"],
      hints: ["split_once('|') returns Option<(&str, &str)>.", "Dropping the source while headlines are alive is E0505."],
      solution: {
        text: [
          "Borrowing structs avoid copying text when parsing large inputs; the lifetime makes it impossible to keep a Headline after the source text is freed.",
          "Dropping the input early produces a real E0505 from rustc 1.99.1 (a simplified one-field version of the struct):",
          `error[E0505]: cannot move out of \`raw\` because it is borrowed
  --> e0505.rs:11:10
   |
 9 |     let raw = String::from("Rust 2.0 released");
   |         --- binding \`raw\` declared here
10 |     let items = parse(&raw);
   |                       ---- borrow of \`raw\` occurs here
11 |     drop(raw);
   |          ^^^ move out of \`raw\` occurs here
12 |     println!("{items:?}");
   |                ----- borrow later used here
   |
help: consider cloning the value if the performance cost is acceptable
   |
10 |     let items = parse(&raw.clone());
   |                           ++++++++

error: aborting due to 1 previous error

For more information about this error, try \`rustc --explain E0505\`.`,
        ],
        code: {
          lang: "rust",
          file: "main.rs",
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
    for h in &items {
        println!("{} <- {}", h.title, h.source);
    }
    // drop(raw); println!("{items:?}");  // E0505: cannot move out of raw while borrowed
}`,
        },
        output: "Rust 2.0 released <- blog.example\nPostgres tips <- db.example",
        pitfalls: ["Storing a String inside Headline and cloning every line, which defeats the point", "Trying to fix the drop error with clone instead of shortening the borrow"],
      },
    },
    capstone: {
      title: "DevAtlas: Rust ingester skeleton",
      brief: ["Create `services/ingester` with `cargo new`. Add a `parse_feed_titles(xml: &str) -> Vec<&str>` that extracts <title> contents with simple string slicing (a real XML parser comes next lesson), plus unit tests in the same file."],
      criteria: ["cargo test passes", "Function borrows from the input", "cargo clippy has no warnings"],
      hints: ["Find \"<title>\" and \"</title>\" with str::find in a loop over the remaining slice.", "The returned slices are valid only while the input string is alive: that is the lifetime relationship."],
      solution: {
        text: ["Slicing the input keeps it zero-copy; the next lesson replaces it with a proper parser and error handling. The output below is from `cargo test` inside the container, with rustc 1.99.1."],
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
        output: "running 1 test\ntest tests::extracts_titles ... ok\n\ntest result: ok. 1 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out; finished in 0.00s",
        pitfalls: ["Returning Vec<String> and allocating a copy of every title", "Losing the remainder after a missing closing tag and looping forever"],
      },
    },
  },
  deeper: [
    { label: "The Rust Book: Understanding Ownership", url: "https://doc.rust-lang.org/book/ch04-00-understanding-ownership.html" },
    { label: "The Rust Book: Validating References with Lifetimes", url: "https://doc.rust-lang.org/book/ch10-03-lifetime-syntax.html" },
    { label: "The Rust Book: Rc<T>, the Reference Counted Smart Pointer", url: "https://doc.rust-lang.org/book/ch15-04-rc.html" },
    { label: "std::cell::RefCell documentation", url: "https://doc.rust-lang.org/std/cell/struct.RefCell.html" },
    { label: "RFC 2094: Non-Lexical Lifetimes", url: "https://rust-lang.github.io/rfcs/2094-nll.html" },
    { label: "Rust error codes index", url: "https://doc.rust-lang.org/error_codes/error-index.html" },
  ],
  nextPreview: "Next: errors, traits and cargo: Result and the ? operator, traits as Rust's interfaces, and the cargo ecosystem.",
};
