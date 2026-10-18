import type { Lesson } from "../../types";

export const lesson: Lesson = {
  id: "3.3.1",
  title: "DOM, events and fetch",
  minutes: 65,
  level: "Beginner",
  prerequisites: ["3.2.1 Box model, flexbox and grid", "1.2.1 The event loop, promises and async/await"],
  summary: "Make pages interactive with plain JavaScript: query and update the DOM safely, handle events with delegation, call APIs with fetch, and render loading and error states. The foundation React builds on.",
  terms: [
    { term: "DOM", def: "Document Object Model: the browser's live tree of objects representing the page. JavaScript reads and changes it." },
    { term: "Event", def: "Something that happened (click, input, submit, keydown) that code can react to with a listener." },
    { term: "Event bubbling", def: "Most events travel from the target element up through its ancestors, so a parent can handle events for many children." },
    { term: "Event delegation", def: "One listener on a parent that handles events from many children by checking `event.target`." },
    { term: "preventDefault", def: "Stops the browser's default action, e.g. a form submit reloading the page." },
    { term: "textContent vs innerHTML", def: "textContent sets plain text (safe). innerHTML parses HTML (dangerous with untrusted data: XSS)." },
  ],
  problem: [
    "The DevAtlas glossary page has 300 terms. A first version attaches a click listener to each of the 300 'copy' buttons, re-renders the whole list on every keystroke in the search box, and builds rows with `innerHTML` from API data. It is slow, leaks listeners when the list re-renders, and a glossary entry containing `<img src=x onerror=alert(1)>` executes script on every visitor's page.",
    "Knowing the DOM, events and fetch directly makes you better at every framework: you understand what React does for you, and you can fix problems when an abstraction leaks.",
  ],
  concept: {
    analogy: [
      "The DOM is the **page's skeleton you can rearrange while the patient is awake**. Event delegation is a **receptionist** at the front desk: instead of a doorbell on every office door, visitors ring once at reception, which checks where they want to go.",
    ],
    precise: [
      "Select with `document.querySelector` / `querySelectorAll` (CSS selectors). Create with `document.createElement`, set text with `textContent`, attributes with `setAttribute` or properties, and insert with `append`/`prepend`/`replaceChildren`. Batch changes (build a DocumentFragment or one replaceChildren call) to avoid repeated layout.",
      "Listen with `addEventListener(type, handler)`. Events bubble, so delegation (one listener on a container) handles dynamic children and uses less memory. Use `closest()` to find the relevant element from `event.target`.",
      "**fetch** returns a promise of a Response; it rejects only on network failure, so check `response.ok`. Always design UI states: idle, loading, success, empty, error. Cancel stale requests with AbortController (e.g. search-as-you-type).",
      "**Security**: never insert untrusted strings with innerHTML. Use textContent, or a sanitiser like DOMPurify if you truly need HTML.",
    ],
  },
  underTheHood: {
    text: [
      "Event dispatch has three phases: **capture** (window down to the target), **target**, and **bubble** (target back up to window). addEventListener listens in the bubble phase by default; pass `{ capture: true }` for capture. Some events (focus, blur) do not bubble; use focusin/focusout for delegation.",
      "Reading layout properties (offsetHeight, getBoundingClientRect) after writing styles forces the browser to compute layout synchronously ('layout thrashing'). Group reads, then writes, or use requestAnimationFrame for visual updates.",
      "The DOM is live: removing an element removes its listeners once nothing references it, but handlers that close over large data or global listeners you forget to remove keep memory alive.",
    ],
    diagram: {
      title: "Click on a button inside a list",
      nodes: [
        { label: "window", sub: "capture ↓" },
        { label: "ul#terms", sub: "" },
        { label: "button (target)", sub: "" },
        { label: "ul#terms", sub: "bubble ↑ (delegated listener)" },
        { label: "window", sub: "" },
      ],
      edges: ["", "", "", ""],
    },
  },
  handsOn: [
    {
      title: "Page and data",
      code: {
        lang: "html",
        file: "glossary.html",
        code: `<main>
  <h1>Glossary</h1>
  <label for="q">Search terms</label>
  <input id="q" type="search" autocomplete="off">
  <p id="status" role="status" aria-live="polite"></p>
  <ul id="terms"></ul>
</main>
<template id="term-row">
  <li class="term">
    <strong class="name"></strong>
    <span class="def"></span>
    <button type="button" data-action="copy">Copy</button>
  </li>
</template>
<script type="module" src="./glossary.js"></script>`,
      },
      notes: ["`role=\"status\"` with `aria-live` announces status changes (loading, '3 results') to screen readers. `<template>` holds inert markup to clone."],
    },
    {
      title: "Safe rendering, delegation and fetch with cancellation",
      code: {
        lang: "javascript",
        file: "glossary.js",
        code: `const list = document.querySelector("#terms");
const status = document.querySelector("#status");
const input = document.querySelector("#q");
const rowTemplate = document.querySelector("#term-row");

function render(terms) {
  const frag = document.createDocumentFragment();
  for (const t of terms) {
    const row = rowTemplate.content.firstElementChild.cloneNode(true);
    row.querySelector(".name").textContent = t.term;    // textContent: never executes HTML
    row.querySelector(".def").textContent = t.def;
    row.dataset.term = t.term;
    frag.append(row);
  }
  list.replaceChildren(frag);                            // one DOM update
  status.textContent = terms.length ? \`\${terms.length} terms\` : "No matching terms";
}

// One listener for every current and future button (delegation)
list.addEventListener("click", async (event) => {
  const button = event.target.closest("button[data-action='copy']");
  if (!button) return;
  const term = button.closest("li").dataset.term;
  await navigator.clipboard.writeText(term);
  button.textContent = "Copied";
  setTimeout(() => (button.textContent = "Copy"), 1200);
});

let controller;
async function search(q) {
  controller?.abort();                                   // cancel the previous request
  controller = new AbortController();
  status.textContent = "Loading…";
  try {
    const res = await fetch(\`/api/glossary?q=\${encodeURIComponent(q)}\`, { signal: controller.signal });
    if (!res.ok) throw new Error(\`HTTP \${res.status}\`);
    render(await res.json());
  } catch (err) {
    if (err.name === "AbortError") return;               // superseded by a newer search
    status.textContent = "Could not load terms. Please try again.";
    console.error(err);
  }
}

let timer;
input.addEventListener("input", () => {                  // debounce (lesson 1.2.2)
  clearTimeout(timer);
  timer = setTimeout(() => search(input.value.trim()), 250);
});
search("");`,
      },
    },
    {
      title: "Forms: validate and submit without reloading",
      code: {
        lang: "javascript",
        code: `const form = document.querySelector("#signup");

form.addEventListener("submit", async (event) => {
  event.preventDefault();                              // stop the full-page reload
  const data = Object.fromEntries(new FormData(form)); // { email: "...", goal: "..." }
  const email = form.elements.email;

  if (!email.validity.valid) {                         // built-in constraint validation
    email.setAttribute("aria-invalid", "true");
    email.focus();
    return;
  }
  email.removeAttribute("aria-invalid");

  const button = form.querySelector("button[type=submit]");
  button.disabled = true;                              // prevent double submits
  try {
    const res = await fetch("/api/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(await res.text());
    form.replaceChildren(Object.assign(document.createElement("p"), { textContent: "Welcome aboard! Check your inbox." }));
  } catch (err) {
    button.disabled = false;
    alert("Signup failed: " + err.message);            // use an inline error element in real UIs
  }
});`,
      },
    },
    {
      title: "Why innerHTML with data is dangerous",
      code: {
        lang: "javascript",
        code: `const def = '<img src=x onerror="alert(document.cookie)">';

li.innerHTML = \`<strong>\${def}</strong>\`;   // ✗ the onerror script runs: XSS
li.textContent = def;                        // ✓ shows the literal text, nothing runs`,
      },
      notes: ["Frameworks like React escape text by default for the same reason; the dangerous escape hatches are named accordingly (dangerouslySetInnerHTML)."],
    },
  ],
  companies: [
    "**Frameworks sit on these APIs**: React, Vue and Svelte all compile to DOM operations and native events. Debugging production issues (event ordering, focus, memory leaks) often means reading DOM behaviour directly in DevTools.",
    "**Progressive enhancement**: content sites, e-commerce checkouts and government services often render HTML on the server and add JavaScript behaviour on top, so pages work even if scripts fail to load.",
    "**Security reviews flag innerHTML**: many teams lint against innerHTML and require sanitisation for any user-generated HTML, because XSS is one of the most common web vulnerabilities.",
  ],
  mistakes: [
    { mistake: "innerHTML with untrusted data", why: "Easy templating with template strings", wrong: "Cross-site scripting: attackers run code in users' browsers", fix: "textContent / createElement; sanitise if HTML is required" },
    { mistake: "A listener per item", why: "Attaching in the render loop", wrong: "Memory waste, leaks on re-render, missing listeners for new items", fix: "Event delegation on the container" },
    { mistake: "Not checking response.ok", why: "Assuming fetch throws on 404/500", wrong: "Error pages parsed as data", fix: "if (!res.ok) throw …" },
    { mistake: "Race conditions in search", why: "Responses arrive out of order", wrong: "An old slow response overwrites newer results", fix: "AbortController or ignore stale responses" },
    { mistake: "No loading, empty and error states", why: "Only designing the happy path", wrong: "Users see a frozen or blank page", fix: "Render every state explicitly; announce changes with a live region" },
  ],
  bestPractices: [
    { tag: "Security", text: "Text via textContent; never build HTML from user data; set a Content Security Policy (lesson 3.5.1)." },
    { tag: "Performance", text: "Batch DOM updates (fragments, replaceChildren); debounce input handlers; avoid layout thrashing." },
    { tag: "Reliability", text: "Handle loading, empty, error and stale-response cases for every request." },
    { tag: "Maintainability", text: "Use data-* attributes for behaviour hooks instead of styling classes." },
  ],
  interview: [
    { q: "What is event delegation and why use it?", a: "Attaching one listener to a common ancestor and using event.target (with closest) to find which child was interacted with. It works because events bubble. It handles dynamically added elements, uses less memory, and avoids attaching and removing many listeners." },
    { q: "How do you prevent XSS when rendering user content?", a: "Insert text with textContent or framework escaping, never innerHTML with untrusted strings; sanitise HTML with a vetted library if HTML is required; set a Content Security Policy; validate and encode on the server too." },
    { q: "How do you handle a search box that fires many requests?", a: "Debounce input, cancel the previous request with AbortController, ignore AbortError, show loading and empty states, and cache recent results." },
  ],
  quickCheck: [
    {
      kind: "mcq",
      prompt: "A click on a button inside <ul id=\"terms\"> triggers a listener on the ul. Why?",
      options: ["Capturing only", "Event bubbling", "The button is the ul", "preventDefault"],
      answer: 1,
      explanation: "Click events bubble from the target up through its ancestors.",
    },
    {
      kind: "bug",
      prompt: "Submitting this form reloads the page and the fetch never completes. Fix?",
      code: { lang: "javascript", code: "form.addEventListener(\"submit\", async () => {\n  await fetch(\"/api/signup\", { method: \"POST\", body: new FormData(form) });\n});" },
      options: ["Use GET", "Call event.preventDefault() in the handler", "Remove async", "Add type=button to the form"],
      answer: 1,
      explanation: "The browser's default submit navigates away. Prevent it and handle submission in JavaScript.",
    },
    {
      kind: "mcq",
      prompt: "Which is safe for displaying a username from the API?",
      options: ["el.innerHTML = name", "el.textContent = name", "document.write(name)", "el.outerHTML = name"],
      answer: 1,
      explanation: "textContent never parses HTML.",
    },
  ],
  cheatSheet: [
    "querySelector / querySelectorAll; closest() to walk up.",
    "createElement + textContent; replaceChildren for batch updates.",
    "addEventListener; delegation on containers; data-* hooks.",
    "Forms: submit event + preventDefault + FormData.",
    "fetch: check res.ok; AbortController for stale requests.",
    "States: idle, loading, success, empty, error.",
    "Never innerHTML with untrusted data.",
    "aria-live status region for dynamic messages.",
  ],
  homework: {
    basic: {
      title: "Todo list with delegation",
      brief: ["Build a todo list (add, toggle done, delete) using one delegated click listener, a form with preventDefault, and textContent everywhere. Persist to localStorage."],
      criteria: ["One click listener on the list", "No innerHTML with user text", "State survives reload"],
      hints: ["Keep an array as the source of truth; render() from it after each change."],
      solution: {
        text: ["A single source of truth plus render() is the same mental model React formalises next lesson."],
        code: {
          lang: "javascript",
          code: `const form = document.querySelector("#add"), list = document.querySelector("#todos");
let todos = JSON.parse(localStorage.getItem("todos") ?? "[]");

function save() { localStorage.setItem("todos", JSON.stringify(todos)); }
function render() {
  list.replaceChildren(...todos.map((t, i) => {
    const li = document.createElement("li");
    li.dataset.index = i;
    const label = document.createElement("span");
    label.textContent = t.text;
    if (t.done) label.style.textDecoration = "line-through";
    const toggle = Object.assign(document.createElement("button"), { textContent: t.done ? "Undo" : "Done", type: "button" });
    toggle.dataset.action = "toggle";
    const del = Object.assign(document.createElement("button"), { textContent: "Delete", type: "button" });
    del.dataset.action = "delete";
    li.append(label, toggle, del);
    return li;
  }));
}

form.addEventListener("submit", (e) => {
  e.preventDefault();
  const text = form.elements.text.value.trim();
  if (!text) return;
  todos.push({ text, done: false }); save(); render(); form.reset();
});

list.addEventListener("click", (e) => {
  const btn = e.target.closest("button[data-action]");
  if (!btn) return;
  const i = Number(btn.closest("li").dataset.index);
  if (btn.dataset.action === "toggle") todos[i].done = !todos[i].done;
  else todos.splice(i, 1);
  save(); render();
});
render();`,
        },
      },
    },
    intermediate: {
      title: "Infinite news list",
      brief: ["Fetch public stories from the Hacker News Algolia API (`https://hn.algolia.com/api/v1/search?tags=story&page=N`) and load the next page when the user scrolls near the bottom, using IntersectionObserver. Show loading and error states."],
      criteria: ["IntersectionObserver on a sentinel element", "No duplicate requests while loading", "Error state with retry"],
      hints: ["Keep `loading` and `page` variables; ignore the observer callback while loading."],
      solution: {
        text: ["Observe a sentinel <div> after the list; when it intersects and nothing is loading, fetch the next page and append rows."],
        code: {
          lang: "javascript",
          code: `const list = document.querySelector("#news"), sentinel = document.querySelector("#more");
let page = 0, loading = false, done = false;

async function loadMore() {
  if (loading || done) return;
  loading = true; sentinel.textContent = "Loading…";
  try {
    const res = await fetch(\`https://hn.algolia.com/api/v1/search?tags=story&page=\${page}\`);
    if (!res.ok) throw new Error(\`HTTP \${res.status}\`);
    const { hits, nbPages } = await res.json();
    for (const h of hits) {
      const li = document.createElement("li");
      const a = Object.assign(document.createElement("a"), { href: h.url ?? \`https://news.ycombinator.com/item?id=\${h.objectID}\`, textContent: h.title });
      li.append(a); list.append(li);
    }
    page += 1; done = page >= nbPages;
    sentinel.textContent = done ? "That's everything" : "";
  } catch (err) {
    sentinel.textContent = "Failed to load. Scroll to retry.";
  } finally {
    loading = false;
  }
}

new IntersectionObserver((entries) => entries[0].isIntersecting && loadMore(), { rootMargin: "400px" }).observe(sentinel);`,
        },
      },
    },
    challenge: {
      title: "Accessible modal dialog",
      brief: ["Build a confirmation dialog with the native <dialog> element: open with showModal(), close on Escape and on the cancel button, return focus to the opening button, and make background content inert."],
      criteria: ["Uses <dialog> and showModal()", "Focus moves into the dialog and returns afterwards", "Works with keyboard and screen reader"],
      hints: ["showModal() makes the rest of the page inert and handles Escape; you only need to restore focus."],
      solution: {
        text: ["The native dialog handles focus trapping, Escape and inertness in modern browsers, which is much safer than a hand-rolled div modal."],
        code: {
          lang: "html",
          code: `<button id="reset">Reset progress</button>
<dialog id="confirm" aria-labelledby="confirm-title">
  <h2 id="confirm-title">Reset all progress?</h2>
  <p>This deletes your lessons, scores and notes from this browser.</p>
  <form method="dialog">
    <button value="cancel" autofocus>Cancel</button>
    <button value="ok">Delete everything</button>
  </form>
</dialog>
<script>
  const opener = document.querySelector("#reset"), dialog = document.querySelector("#confirm");
  opener.addEventListener("click", () => dialog.showModal());
  dialog.addEventListener("close", () => {
    if (dialog.returnValue === "ok") localStorage.clear();
    opener.focus();                       // return focus to where the user was
  });
</script>`,
        },
      },
    },
    capstone: {
      title: "DevAtlas: vanilla prototype of the lesson list",
      brief: ["Before React, build the lesson list page with plain JS: fetch lessons from a JSON file, render with a template, filter with a debounced search box, delegate clicks, and show loading/empty/error states."],
      criteria: ["All five UI states handled", "No innerHTML with data", "Search uses debounce and AbortController"],
      hints: ["Serve the folder with `npx serve` or `python3 -m http.server`; fetch does not work from file:// URLs."],
      solution: {
        text: ["Keep this prototype: comparing it with the React version next lesson makes clear what components and state management add."],
      },
    },
  },
  deeper: [
    { label: "MDN: Introduction to the DOM", url: "https://developer.mozilla.org/en-US/docs/Web/API/Document_Object_Model/Introduction" },
    { label: "MDN: Event bubbling", url: "https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/Scripting/Event_bubbling" },
    { label: "MDN: Using the Fetch API", url: "https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch" },
    { label: "OWASP: Cross Site Scripting Prevention Cheat Sheet", url: "https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html" },
  ],
  nextPreview: "Next: React with TypeScript. Components, props and state: the same UI, described declaratively.",
};
