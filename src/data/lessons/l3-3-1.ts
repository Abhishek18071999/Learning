import type { Lesson } from "../../types";

export const lesson: Lesson = {
  id: "3.3.1",
  title: "DOM, events and fetch",
  minutes: 65,
  level: "Beginner",
  prerequisites: ["3.2.1 Box model, flexbox and grid", "1.2.1 The event loop, promises and async/await"],
  summary: "Make pages interactive with plain JavaScript: understand the DOM as a live tree, query and mutate it safely, handle capture and bubble events, validate forms, and call APIs with fetch. Includes real Node fetch output, status versus network failures, AbortController, race conditions and XSS-safe rendering. The foundation React builds on.",
  terms: [
    { term: "DOM", def: "Document Object Model: the browser's live tree of objects representing the page. JavaScript reads and changes it, and the rendered page follows." },
    { term: "DOM tree", def: "The document as nodes: `document -> html -> head/body -> elements`, with text nodes and comments between them. Elements are one node type, not the only one." },
    { term: "Event", def: "Something that happened (click, input, submit, keydown) that code can react to with a listener." },
    { term: "Event bubbling", def: "Most events travel from the target element up through its ancestors, so a parent can handle events for many children." },
    { term: "Event delegation", def: "One listener on a parent that handles events from many children by checking `event.target` and walking up with `closest()`." },
    { term: "preventDefault", def: "Stops the browser's default action, e.g. a form submit reloading the page or a link navigating. It does not stop the event from travelling." },
    { term: "stopPropagation", def: "Stops the event from reaching the next node in the capture or bubble path. It does not cancel the browser's default action." },
    { term: "Capture phase", def: "The first phase of dispatch, from window down to the target. Listeners registered with `{ capture: true }` run here, before bubble listeners." },
    { term: "textContent vs innerHTML", def: "textContent sets plain text and creates a text node (safe). innerHTML parses HTML into elements and event-handler attributes (dangerous with untrusted data: XSS)." },
    { term: "FormData", def: "A browser API that reads a form's successful controls into key/value pairs. `new FormData(form)` is the shortest way to collect inputs, including files." },
    { term: "AbortController", def: "A standard way to cancel fetch and other async work. Call `controller.abort()`; the pending fetch rejects with an `AbortError`." },
    { term: "Response.ok", def: "True when the HTTP status is 200-299. fetch resolves for 404 and 500 too, so check `ok` (or `status`) before reading the body." },
  ],
  problem: [
    "The DevAtlas glossary page has 300 terms. A first version attaches a click listener to each of the 300 'copy' buttons, re-renders the whole list on every keystroke in the search box, and builds rows with `innerHTML` from API data. It is slow, leaks listeners when the list re-renders, and a glossary entry containing `<img src=x onerror=alert(1)>` executes script on every visitor's page.",
    "The search box has a second failure the first version never sees until the network is slow: requests finish out of order, so an old response for `fl` overwrites the newer results for `flex`. Knowing the DOM, events and fetch directly makes you better at every framework: you understand what React does for you, and you can fix problems when an abstraction leaks.",
  ],
  concept: {
    analogy: [
      "The DOM is the **page's skeleton you can rearrange while the patient is awake**. Event delegation is a **receptionist** at the front desk: instead of a doorbell on every office door, visitors ring once at reception, which checks where they want to go. The receptionist analogy also shows the limit: a visitor who never reaches reception (`stopPropagation`) cannot be helped by the front desk, and a form that is not told to stay (`preventDefault`) walks straight back out of the building.",
    ],
    precise: [
      "Select with `document.querySelector` / `querySelectorAll` (CSS selectors). Create with `document.createElement`, set text with `textContent`, attributes with `setAttribute` or properties, and insert with `append`/`prepend`/`replaceChildren`. Batch changes (build a DocumentFragment or one replaceChildren call) to avoid repeated layout. The tree is live: `getElementsByClassName` returns a live collection, while `querySelectorAll` returns a static NodeList.",
      "Listen with `addEventListener(type, handler)`. Events run capture (window down to target), target, then bubble (target back up to window). Delegation (one listener on a container) handles dynamic children and uses less memory; use `closest()` to find the relevant element from `event.target`. `preventDefault()` cancels the browser action; `stopPropagation()` stops the event travelling. They solve different problems.",
      "**Forms** have their own event and validation model. Listen for `submit` on the form (not `click` on the button), call `preventDefault()` to own the submission, read fields with `FormData` or `form.elements`, and use the built-in constraint validation API (`validity`, `checkValidity()`, `reportValidity()`) for immediate feedback. Client validation is UX; the server must validate again because anyone can call the endpoint directly.",
      "**fetch** returns a promise of a Response; it rejects only on network failure, so check `response.ok`. Reading `response.json()` is a second failure point. Always design UI states: idle, loading, success, empty, error. Cancel stale requests with AbortController (e.g. search-as-you-type). **Security**: never insert untrusted strings with innerHTML. Use textContent, or a sanitiser like DOMPurify if you truly need HTML.",
    ],
  },
  underTheHood: {
    text: [
      "Event dispatch has three phases: **capture** (window down to the target), **target**, and **bubble** (target back up to window). `addEventListener` listens in the bubble phase by default; pass `{ capture: true }` for capture. Some events (focus, blur) do not bubble; use focusin/focusout for delegation. A listener can inspect `event.target` (the deepest element) and `event.currentTarget` (the element the listener is attached to), which is the distinction delegation depends on.",
      "Reading layout properties (offsetHeight, getBoundingClientRect) after writing styles forces the browser to compute layout synchronously ('layout thrashing'). Group reads, then writes, or use requestAnimationFrame for visual updates. Appending 300 rows one at a time can force 300 style/layout passes; a DocumentFragment or replaceChildren swaps the finished subtree once.",
      "The DOM is live: removing an element removes its listeners once nothing references it, but handlers that close over large data or global listeners you forget to remove keep memory alive. A listener on `window` or `document` lives as long as the page; remove it when the component that owns it is destroyed, or attach it to the component's root so it disappears with the subtree.",
      "The tree is made of nodes, not just elements. `document` is the root; `html`, `head` and `body` are elements; the text inside a paragraph is a text node; comments are comment nodes. `childNodes` includes text and comments, while `children` includes only elements. `template.content` is an inert DocumentFragment: its nodes are parsed but not rendered and do not run scripts until you clone and insert them. `closest()` walks up through element ancestors, and `matches()` tests a selector without walking.",
      "Mutation has two very different modes. `createElement` + `textContent` builds nodes directly and can never turn data into markup. `innerHTML = value` hands the string to the HTML parser, which creates elements, attributes and event-handler content. `replaceChildren(...nodes)` removes all old children and inserts the new ones in one operation. `append` moves an existing node rather than copying it; use `cloneNode(true)` when you need a copy. Reading `innerHTML` serialises the current subtree back to a string, which is useful for debugging and dangerous as a template mechanism.",
      "A form submit can start in three ways: the submit button, Enter in a text field, or `form.requestSubmit()`. Listen for `submit` so all three are covered. The browser validates constraints first: `required`, `type=email`, `minlength`, `pattern`, `min`/`max`. If validation fails, the `submit` event does not fire and the browser shows its own message. `novalidate` on the form disables that automatic check so you can render errors yourself; `form.elements.email.validity.valid` and `setCustomValidity()` give you the same information. `new FormData(form)` includes successful controls only, so disabled fields and unchecked checkboxes are absent. `preventDefault()` keeps the page alive; `stopPropagation()` does not.",
      "A fetch call has two stages. The promise resolves when response headers arrive, before the body is read; `res.status` and `res.ok` are available then. The body is a stream: `res.json()` reads and parses it, and rejects with a SyntaxError if the bytes are not JSON, even when the status is 200. The promise rejects without a Response on DNS failure, connection refusal, TLS failure, a CORS rejection, going offline, or an abort. An AbortController turns cancellation into a rejection whose `name` is `AbortError`; `AbortSignal.timeout(ms)` creates a signal that aborts itself, and one signal can be shared by several requests.",
      "Rapid input creates a race because HTTP has no ordering guarantee. Request A (for `fl`) can start first and finish last, overwriting the newer result for `flex`. Three layers fix it. Debounce waits until typing pauses, so fewer requests start. AbortController cancels the previous request, so its handler stops. A sequence number (or comparing the response's query with the current input) is the final guard when a response cannot be aborted or resolves from cache immediately. Treat `AbortError` as expected control flow, not as an error to show the user.",
      "XSS is a parsing problem, not a string problem. `textContent` creates a text node: `<` stays a character. `innerHTML` invokes the HTML parser: `<img src=x onerror=...>` becomes an element with an `onerror` attribute, and the browser runs that handler when the image fails. A `<script>` inserted with innerHTML does not execute in modern browsers, which misleads people into thinking innerHTML is safe; event-handler attributes, `svg` payloads and `javascript:` URLs still execute. Defence in depth is textContent by default, a maintained sanitiser for rich HTML, a Content Security Policy that blocks inline script, and server-side validation.",
    ],
    diagram: {
      title: "One click through capture, target and bubble",
      nodes: [
        { label: "window", sub: "capture ↓" },
        { label: "ul#terms", sub: "capture listener" },
        { label: "button (target)", sub: "target listener" },
        { label: "ul#terms", sub: "bubble: delegated listener" },
        { label: "window", sub: "bubble ↑" },
      ],
      edges: ["", "", "", ""],
      caption: "The event visits each node twice, once downward and once upward. Delegation listens on the upward pass, after the target has already handled the click.",
    },
  },
  handsOn: [
    {
      title: "Build the page, render safely and delegate clicks",
      code: {
        lang: "html",
        file: "glossary.html + glossary.js",
        code: `<!-- file: glossary.html -->
<main>
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
<script type="module" src="./glossary.js"></script>

<!-- file: glossary.js -->
const list = document.querySelector("#terms");
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
      output: `rows: 2
row: DOM | copy | DOM
row: fetch | copy | fetch
delegated handler saw: fetch
status: 2 terms`,
      notes: [
        "This is real output from the render and delegation half of the file, run under Node 24.18.0 with jsdom 29. The search half calls `/api/glossary`, which this lesson does not ship, so its network behaviour is illustrative until you point it at a real endpoint. jsdom does not execute inline event-handler attributes, so the XSS alert in the next step is illustrative; the DOM nodes it creates are real.",
        "`<template>` content is inert: `rowTemplate.content.firstElementChild.cloneNode(true)` gives a fresh row each time, and `textContent` writes a text node. `list.replaceChildren(frag)` swaps the whole list in one operation, so 300 rows do not trigger 300 layouts.",
        "The single click listener on `list` is delegation: it also works for rows rendered after the listener was attached. `closest` walks up from `event.target` to the button, then to the `li`, so a click on the button's text or an icon still resolves.",
        "`controller?.abort()` cancels the previous request before starting the next; the `AbortError` is expected and deliberately ignored. The debounce timer waits 250 ms after the last keystroke, so typing `flex` sends one request, not four.",
        "`role=\"status\"` with `aria-live` announces loading and result counts to screen readers. The live region is updated with `textContent`, so the announcement is text, never markup.",
      ],
    },
    {
      title: "Forms and untrusted output: the two places browsers execute data",
      code: {
        lang: "javascript",
        file: "signup.js + unsafe-vs-safe.js",
        code: `// file: signup.js
const form = document.querySelector("#signup");

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
});

// file: unsafe-vs-safe.js
const def = '<img src=x onerror="alert(document.cookie)">';

li.innerHTML = \`<strong>\${def}</strong>\`;   // BAD: the parser creates an img node with an onerror handler
li.textContent = def;                        // SAFE: one text node, no elements`,
      },
      notes: [
        "`event.preventDefault()` is what stops the full-page navigation. If you call only `event.stopPropagation()`, the form still submits and the browser leaves the page while your fetch is in flight.",
        "`new FormData(form)` collects successful controls: disabled fields and unchecked checkboxes are omitted. `form.elements.email.validity.valid` is the same constraint check the browser runs; `setCustomValidity()` lets you add a rule that is not expressible in HTML.",
        "`button.disabled = true` prevents a double submit, and the catch branch re-enables it. A disabled button left disabled after an error is the most common way a form becomes permanently stuck.",
        "The second file shows the parsing difference directly. `innerHTML` invokes the HTML parser, so the string becomes an `<img>` element with an `onerror` attribute; browsers run that handler when the image fails. `textContent` creates one text node, so the angle brackets are visible characters and nothing executes.",
        "Client validation is UX, not security: anyone can remove attributes, call the API with curl, or replay a request. Validate the same rules on the server, and treat the client check as a faster error message.",
      ],
    },
    {
      title: "Read the order: capture, target, bubble, and which method stops what",
      code: {
        lang: "text",
        file: "events-and-errors.txt",
        code: `EVENT DISPATCH ORDER (addEventListener listens in bubble by default)
1 capture   window -> document -> ... -> parent -> target   { capture: true }
2 target    listeners on the element itself
3 bubble    target -> parent -> ... -> document -> window   default

METHOD                     STOPS                          DOES NOT STOP                 USE FOR
event.preventDefault()     the browser's default action   event propagation             forms, links, toggles
event.stopPropagation()    event travel                   the browser's default action  nested widgets, menus
stopImmediatePropagation() other listeners + travel       nothing                       rare; isolation
return false               both, in a DOM0 onclick only   nothing in addEventListener   legacy code only

FETCH FAILURE TYPE         WHAT HAPPENS                   HOW TO DETECT
HTTP 404 or 500            promise resolves, ok = false   res.ok, res.status
network or DNS failure     promise rejects                catch: TypeError, error.cause.code
manual abort               promise rejects                catch: error.name === "AbortError"
invalid JSON on 200        res.json() rejects             catch: SyntaxError
204 or empty body          res.json() rejects             catch: SyntaxError`,
      },
      notes: [
        "Real observed order from Node 24.18.0 + jsdom 29: `window capture -> ul capture -> button target -> ul bubble -> window bubble`. The same order holds in a browser. Non-bubbling events such as focus and blur skip the bubble phase; listen for focusin and focusout when you need delegation.",
        "`preventDefault()` on a checkbox click left `checked === false` in the same jsdom run: the default toggle was cancelled. `stopPropagation()` would not change `checked`; it would only stop the event reaching ancestors.",
        "`stopImmediatePropagation()` also blocks other listeners on the same element. Reach for it only when two independent widgets genuinely must not share an event, because it makes behaviour order-dependent and hard to debug.",
        "The fetch rows are the taxonomy used by the next step: HTTP errors resolve, network errors reject, aborts reject with a particular name, and invalid JSON rejects at parse time. Matching the symptom to the row is most of fetch debugging.",
      ],
    },
    {
      title: "Fetch a real API: 200, 404, abort, network failure and bad JSON",
      code: {
        lang: "javascript",
        file: "fetch-check.mjs",
        code: `async function main() {
  const res = await fetch("https://jsonplaceholder.typicode.com/users/1");
  const user = await res.json();
  console.log(\`200: status=\${res.status} ok=\${res.ok} type=\${res.headers.get("content-type")}\`);
  console.log(\`name=\${user.name} city=\${user.address.city}\`);

  const missing = await fetch("https://jsonplaceholder.typicode.com/users/999");
  console.log(\`404: status=\${missing.status} ok=\${missing.ok} body=\${JSON.stringify(await missing.text())}\`);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 1);
  try {
    await fetch("https://jsonplaceholder.typicode.com/users/1", { signal: controller.signal });
    console.log("abort: no error");
  } catch (error) {
    console.log(\`abort: \${error.name}: \${error.message}\`);
  } finally {
    clearTimeout(timer);
  }

  try {
    await fetch("https://no-such-host.devatlas.invalid/");
  } catch (error) {
    console.log(\`network: \${error.name}: \${error.message} cause=\${error.cause && error.cause.code}\`);
  }

  const html = await fetch("https://example.com");
  console.log(\`non-JSON: status=\${html.status} type=\${html.headers.get("content-type")}\`);
  try {
    await html.json();
  } catch (error) {
    console.log(\`json parse: \${error.name}: \${error.message}\`);
  }

  const gh = await fetch("https://api.github.com/users/octocat");
  const octocat = await gh.json();
  console.log(\`github: status=\${gh.status} login=\${octocat.login} id=\${octocat.id} public_repos=\${octocat.public_repos} rate_remaining=\${gh.headers.get("x-ratelimit-remaining")}\`);
}
main();`,
      },
      output: `200: status=200 ok=true type=application/json; charset=utf-8
name=Leanne Graham city=Gwenborough
404: status=404 ok=false body="{}"
abort: AbortError: This operation was aborted
network: TypeError: fetch failed cause=ENOTFOUND
non-JSON: status=200 type=text/html; charset=utf-8
json parse: SyntaxError: Unexpected token '<', "<!doctype "... is not valid JSON
github: status=200 login=octocat id=583231 public_repos=8 rate_remaining=53`,
      notes: [
        "Real output from Node 24.18.0, captured against the public APIs listed in the code. `rate_remaining` is a live GitHub header and will differ on your run; the JSONPlaceholder values are stable fixture data. Node 24 has fetch, AbortController and setTimeout globally, so no packages are needed.",
        "The raw 200 body began: {\"id\": 1, \"name\": \"Leanne Graham\", \"username\": \"Bret\", \"email\": \"Sincere@april.biz\"}, followed by a nested address with \"city\": \"Gwenborough\" and \"zipcode\": \"92998-3874\". Those are the exact values the script printed as name=Leanne Graham city=Gwenborough.",
        "The 200 body is a JSON object: `id`, `name`, `username`, `email`, and a nested `address` containing `city` and `zipcode`. `res.json()` parses it into that object, which is why `user.address.city` works. Never parse the JSON yourself unless you need streaming.",
        "`fetch` resolves as soon as headers arrive. A 404 is a completed HTTP exchange, not a rejected promise, so `res.ok` is the check that separates 'the server answered with an error' from 'the request worked'. A 500 behaves the same way.",
        "The abort is deliberate: a 1 ms timer cancels the request. In UI code you trigger `abort()` when a newer keystroke makes the old response irrelevant. `AbortError` is expected control flow, not a user-facing failure.",
        "The network case is a genuine DNS failure: `TypeError: fetch failed` with `cause.code === \"ENOTFOUND\"`. A user sees the same shape on offline, CORS, TLS and connection-refused failures, so show a generic retry message and log the cause.",
        "The GitHub response also carries `x-ratelimit-remaining`, which is why public APIs need deliberate rate-limit handling. Send a token for higher limits and treat 403/429 as retry-after signals, not as bugs in your parser.",
      ],
    },
    {
      title: "Draw the request lifecycle you just implemented",
      code: {
        lang: "mermaid",
        file: "fetch-lifecycle.mmd",
        code: `flowchart TD
  A["input event"] --> B["debounce 250 ms"]
  B --> C{"query changed?"}
  C -->|no| Z["keep current view"]
  C -->|yes| D["abort previous controller"]
  D --> E["fetch(url, { signal })"]
  E -->|network failure| F["error state + Retry"]
  E -->|AbortError| G["ignore: newer request owns the UI"]
  E -->|response received| H{"res.ok?"}
  H -->|no| F
  H -->|yes| I["await res.json()"]
  I -->|SyntaxError| F
  I --> J["render with textContent"]
  J --> K{"any rows?"}
  K -->|yes| L["success state"]
  K -->|no| M["empty state"]`,
      },
      notes: [
        "This is the state machine the search box implements. The important edge is `AbortError -> ignore`: a cancelled request must not overwrite the newer result or flash an error message.",
        "Debounce reduces requests; abort guarantees the last request wins; a sequence number is the fallback when a response cannot be aborted or resolves from cache immediately. Keep all three ideas separate in your head: they solve different parts of the same race.",
        "Render only after `res.ok` and a successful `res.json()`. The error branch must re-enable the form or Retry button, because a disabled control is the most common way an error state becomes permanent.",
        "The empty state is not an error: a valid response with zero matches gets its own message and its own live-region announcement. Users need to know the request succeeded and the search simply matched nothing.",
      ],
    },
  ],
  companies: [
    "**React, Vue and Svelte (illustrative):** all three compile to DOM operations and native events. React's synthetic event system still follows capture and bubble semantics, and its `onChange` is the input event, not the HTML change event. Debugging production issues (event ordering, focus, memory leaks) often means reading DOM behaviour directly in DevTools.",
    "**GitHub REST API (verified in this lesson):** a real request to `https://api.github.com/users/octocat` returned 200 with `login=octocat`, `id=583231` and `public_repos=8` in this lesson's Node run, with `x-ratelimit-remaining` at 53. Public APIs rate-limit anonymous clients, which is why the response also carries a reset time; a production client sends a token and handles 403 and 429 deliberately.",
    "**JSONPlaceholder (verified in this lesson):** the same run fetched `users/1` (200, JSON with a nested address) and `users/999` (404, `ok=false`, body `{}`). It is a useful public fixture precisely because it lets you practise the status branch without inventing a server response.",
    "**OWASP and security reviews (illustrative):** many teams lint against `innerHTML` and require a maintained sanitiser such as DOMPurify for any user-generated HTML, because XSS remains one of the most common web vulnerabilities. A Content Security Policy and Trusted Types are defence in depth, not substitutes for safe insertion.",
    "**Progressive enhancement (illustrative):** content sites, e-commerce checkouts and government services often render HTML on the server and add JavaScript behaviour on top, so pages work even if scripts fail to load. That is the same DOM and form model this lesson uses, with the server doing the first render.",
  ],
  mistakes: [
    { mistake: "innerHTML with untrusted data", why: "Easy templating with template strings", wrong: "Cross-site scripting: attackers run code in users' browsers", fix: "textContent / createElement; sanitise if HTML is required" },
    { mistake: "A listener per item", why: "Attaching in the render loop", wrong: "Memory waste, leaks on re-render, missing listeners for new items", fix: "Event delegation on the container" },
    { mistake: "Not checking response.ok", why: "Assuming fetch throws on 404/500", wrong: "Error pages parsed as data, or a success state shown for a failed request", fix: "if (!res.ok) throw ..." },
    { mistake: "Race conditions in search", why: "Responses arrive out of order", wrong: "An old slow response overwrites newer results", fix: "Debounce, AbortController, ignore AbortError, and verify the query before rendering" },
    { mistake: "No loading, empty and error states", why: "Only designing the happy path", wrong: "Users see a frozen or blank page", fix: "Render every state explicitly; announce changes with a live region" },
    { mistake: "Calling stopPropagation() to stop a form submit", why: "The method names sound interchangeable", wrong: "The event never reaches parent handlers, but the browser still navigates and the fetch is lost", fix: "Call preventDefault() for the default action; use stopPropagation() only to keep an event inside a component" },
    { mistake: "Relying on HTML validation as security", why: "required and pattern feel like checks", wrong: "Anyone can remove the attributes or call the API directly", fix: "Validate on the server too; use client validation for faster, clearer feedback" },
    { mistake: "Assuming every 200 response is JSON", why: "Most APIs return JSON", wrong: "An HTML error page or a proxy login page makes res.json() throw SyntaxError", fix: "Check content-type when unsure, and wrap res.json() in try/catch" },
    { mistake: "Forgetting to disable the submit button", why: "The handler looks idempotent", wrong: "A double click sends two POSTs and creates duplicate records", fix: "Disable the button while pending and re-enable it in the error branch" },
  ],
  bestPractices: [
    { tag: "Security", text: "Text via textContent; never build HTML from user data; set a Content Security Policy (lesson 3.5.1) and sanitise rich HTML with a maintained library." },
    { tag: "Performance", text: "Batch DOM updates (fragments, replaceChildren); debounce input handlers; avoid layout thrashing by grouping reads before writes." },
    { tag: "Reliability", text: "Handle loading, empty, error and stale-response cases for every request. Treat AbortError as expected control flow, not as a failure to display." },
    { tag: "Maintainability", text: "Use data-* attributes for behaviour hooks instead of styling classes, and keep one state variable as the source of truth for each view." },
    { tag: "Cost", text: "Cache stable responses and avoid refetching on every keystroke; fewer requests lower server load, bandwidth bills and rate-limit pressure." },
  ],
  interview: [
    { q: "Explain event capture, target and bubble. How does delegation work, and when do you reach for preventDefault versus stopPropagation?", a: "Dispatch runs capture from window down to the target, then the target listeners, then bubble back up to window. addEventListener listens in bubble by default; { capture: true } opts into capture. Delegation puts one listener on an ancestor and uses event.target plus closest() to find the child, which is why it also works for rows added later and costs one listener instead of hundreds. preventDefault cancels the browser's default action: form submit navigation, link navigation, checkbox toggle. stopPropagation stops the event travelling to the next node; it does not cancel the default action. A form submit handler that calls only stopPropagation still navigates away. Use stopPropagation sparingly, for a nested widget that must not trigger an ancestor; use preventDefault whenever you take over the browser's action in JavaScript." },
    { q: "What does fetch reject on, and how do you handle status, JSON, cancellation and timeouts?", a: "fetch returns a promise that resolves when the response headers arrive, even for 404 or 500. It rejects only when no HTTP response is produced: DNS failure, refused connection, TLS or CORS failure, offline, or an abort. So check res.ok or res.status before reading the body, and treat res.json() as a separate failure point because an HTML proxy page can return 200 with a non-JSON body. For cancellation create an AbortController, pass its signal, call abort() when the request is superseded or the component unmounts, and ignore AbortError rather than showing an error. There is no built-in timeout: combine AbortSignal.timeout(ms) with your own controller if you need one, or use Promise.race carefully. Always have loading, success, empty and error branches." },
    { q: "How do you prevent XSS and stale-response races when rendering API data?", a: "Treat every API string as untrusted. Build elements with createElement and assign textContent, or clone a template and fill its text nodes; never concatenate data into innerHTML. innerHTML invokes the HTML parser, so an img with an onerror attribute or an SVG payload becomes live DOM, and browsers run the handler when the resource fails. If you must accept HTML, sanitise it with a maintained library such as DOMPurify on the client and also on the server, and add a restrictive Content Security Policy as defence in depth. For races, debounce input, abort the previous request with AbortController, ignore AbortError, and verify that the response still matches the current query (a request sequence number) before rendering. Render from one state variable so a slow old response cannot overwrite a newer result, and announce the final state in an aria-live region." },
  ],
  quickCheck: [
    {
      kind: "mcq",
      prompt: "A click on a button inside `<ul id=\"terms\">` triggers a listener on the ul. Why?",
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
      explanation: "The browser's default submit navigates away. Prevent it and handle submission in JavaScript. stopPropagation() would not stop the navigation.",
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
    "querySelector / querySelectorAll; closest() to walk up; matches() to test without walking.",
    "createElement + textContent; DocumentFragment or replaceChildren for batch updates.",
    "addEventListener; delegation on containers; data-* hooks for behaviour.",
    "Events: capture down, target, bubble up. Default is bubble; use { capture: true } to opt in.",
    "preventDefault stops the browser action; stopPropagation stops the event travelling. They are different.",
    "Forms: submit event + preventDefault + FormData + validity. Validate again on the server.",
    "fetch resolves on HTTP errors; check res.ok. Rejects on network failure and abort.",
    "AbortController + debounce for rapid input; ignore AbortError and guard against stale responses.",
    "res.json() can throw even on a 200; wrap it and check content-type when unsure.",
    "Never innerHTML with untrusted data; use textContent, a sanitiser and a CSP.",
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
        text: [
          "Model the page as five explicit states (idle, loading, success, empty, error) and route every change through one show() function that sets data-state on <main>, the live-region status text and the list. 'idle' is the markup before the script runs; search('') moves straight to loading on startup.",
          "All data goes in with textContent on rows cloned from a <template>, so a query like <img src=x onerror=…> is shown as text in the empty message and never parsed. Each search aborts the previous request with AbortController and ignores the resulting AbortError; the input is debounced by 250 ms so typing 'flex' sends one request, not four.",
          "One click listener on <main> handles both the Retry button in the error state and every 'Mark complete' button, including rows rendered later. Fetching a static lessons.json and filtering in the browser keeps the prototype server-free; swap the URL for /api/lessons?q= once the API exists. Serve the folder over HTTP (fetch does not work from file://).",
          "Verified in Chromium with Playwright, with requests intercepted to slow them down or return HTTP 500: loading → success (4 lessons), typing 'flex' → 1 request and 1 lesson, an HTML-looking query → empty state with no <img> created, HTTP 500 → error with Retry, Retry → success, and a slow request superseded by a newer search never overwrote the newer result.",
        ],
        code: {
          lang: "html",
          file: "index.html + app.js + lessons.json",
          code: `<!-- file: index.html -->
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Lessons · DevAtlas</title>
</head>
<body>
  <main id="app" data-state="idle">
    <h1>Lessons</h1>
    <label for="q">Search lessons</label>
    <input id="q" type="search" autocomplete="off">
    <p id="status" role="status" aria-live="polite">Start typing to filter, or wait for the full list.</p>
    <ul id="lessons"></ul>
  </main>
  <template id="lesson-row">
    <li>
      <span class="id"></span> <strong class="title"></strong> <span class="minutes"></span>
      <button type="button" data-action="toggle" aria-pressed="false">Mark complete</button>
    </li>
  </template>
  <script type="module" src="./app.js"></script>
</body>
</html>

<!-- file: app.js -->
const app = document.querySelector("#app");
const input = document.querySelector("#q");
const status = document.querySelector("#status");
const list = document.querySelector("#lessons");
const rowTemplate = document.querySelector("#lesson-row");

const completed = new Set();          // ids the user marked complete (in memory for now)
let controller;                       // AbortController of the in-flight request
let timer;                            // debounce timer

// One function decides what each of the five states looks like: idle, loading, success, empty, error
function show(state, { lessons = [], query = "", message = "" } = {}) {
  app.dataset.state = state;
  list.replaceChildren();
  if (state === "loading") status.textContent = "Loading lessons…";
  if (state === "empty") status.textContent = \`No lessons match "\${query}".\`;   // textContent: never parsed as HTML
  if (state === "error") {
    status.textContent = \`Could not load lessons (\${message}). \`;
    const retry = Object.assign(document.createElement("button"), { type: "button", textContent: "Retry" });
    retry.dataset.action = "retry";
    status.append(retry);
  }
  if (state === "success") {
    status.textContent = \`\${lessons.length} lesson\${lessons.length === 1 ? "" : "s"}\`;
    const frag = document.createDocumentFragment();
    for (const lesson of lessons) {
      const row = rowTemplate.content.firstElementChild.cloneNode(true);
      row.dataset.id = lesson.id;
      row.querySelector(".id").textContent = lesson.id;
      row.querySelector(".title").textContent = lesson.title;
      row.querySelector(".minutes").textContent = \`\${lesson.minutes} min\`;
      const done = completed.has(lesson.id);
      const button = row.querySelector("button");
      button.setAttribute("aria-pressed", String(done));
      button.textContent = done ? "Completed" : "Mark complete";
      frag.append(row);
    }
    list.append(frag);
  }
}

async function search(query) {
  controller?.abort();                                  // a newer search supersedes the old one
  controller = new AbortController();
  show("loading");
  try {
    // Static JSON for now; later: fetch(\`/api/lessons?q=\${encodeURIComponent(query)}\`)
    const res = await fetch("./lessons.json", { signal: controller.signal });
    if (!res.ok) throw new Error(\`HTTP \${res.status}\`);
    const all = await res.json();
    const q = query.toLowerCase();
    const lessons = all.filter((l) => l.title.toLowerCase().includes(q) || l.id.includes(q));
    show(lessons.length ? "success" : "empty", { lessons, query });
  } catch (err) {
    if (err.name === "AbortError") return;              // ignore cancelled requests
    show("error", { message: err.message });
  }
}

input.addEventListener("input", () => {
  clearTimeout(timer);
  timer = setTimeout(() => search(input.value.trim()), 250);
});

// Delegation: one listener handles every current and future button in the page
app.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-action]");
  if (!button) return;
  if (button.dataset.action === "retry") return search(input.value.trim());
  const id = button.closest("li").dataset.id;
  completed.has(id) ? completed.delete(id) : completed.add(id);
  const done = completed.has(id);
  button.setAttribute("aria-pressed", String(done));
  button.textContent = done ? "Completed" : "Mark complete";
});

search("");

<!-- file: lessons.json -->
[
  { "id": "3.1.1", "title": "Semantic HTML and accessibility", "minutes": 60 },
  { "id": "3.2.1", "title": "CSS layout: flexbox and grid", "minutes": 70 },
  { "id": "3.3.1", "title": "DOM, events and fetch", "minutes": 70 },
  { "id": "3.4.1", "title": "React components, props and state", "minutes": 75 }
]`,
        },
        pitfalls: [
          "Forgetting to ignore AbortError, which flashes the error state every time the user keeps typing",
          "Updating the button label in two places (render and click handler) that can drift apart; React removes this whole class of bug next lesson",
        ],
      },
    },
  },
  deeper: [
    { label: "MDN: Introduction to the DOM", url: "https://developer.mozilla.org/en-US/docs/Web/API/Document_Object_Model/Introduction" },
    { label: "MDN: Event bubbling", url: "https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/Scripting/Event_bubbling" },
    { label: "MDN: Using the Fetch API", url: "https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch" },
    { label: "MDN: AbortController", url: "https://developer.mozilla.org/en-US/docs/Web/API/AbortController" },
    { label: "MDN: Client-side form validation", url: "https://developer.mozilla.org/en-US/docs/Learn_web_development/Extensions/Forms/Form_validation" },
    { label: "OWASP: Cross Site Scripting Prevention Cheat Sheet", url: "https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html" },
  ],
  nextPreview: "Next: React with TypeScript. Components, props and state: the same UI, described declaratively.",
};
