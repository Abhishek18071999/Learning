import type { Lesson } from "../../types";

export const lesson: Lesson = {
  id: "3.1.1",
  title: "Semantic HTML and accessibility",
  minutes: 60,
  level: "Beginner",
  prerequisites: ["0.1.2 HTTP in depth", "A text editor and a browser"],
  summary: "Write HTML that browsers, search engines and assistive technologies understand: landmarks, headings, forms, buttons vs links, images and keyboard access.",
  terms: [
    { term: "Semantic HTML", def: "Using elements for their meaning (`<nav>`, `<button>`, `<h2>`) rather than generic `<div>`s styled to look right." },
    { term: "Accessibility (a11y)", def: "Making sites usable by everyone, including people using screen readers, keyboards, magnification or voice control." },
    { term: "Screen reader", def: "Software that reads the page aloud and lets users jump by headings, landmarks, links and form fields (NVDA, JAWS, VoiceOver, TalkBack)." },
    { term: "Accessibility tree", def: "The browser's simplified view of the page (roles, names, states) that assistive technology reads." },
    { term: "ARIA", def: "Attributes like `aria-label` and `role` that add accessibility information when HTML alone cannot. First rule of ARIA: prefer native HTML." },
    { term: "WCAG", def: "Web Content Accessibility Guidelines, the standard most accessibility laws and audits reference (levels A, AA, AAA)." },
    { term: "Focus", def: "Which element receives keyboard input. Tab moves focus; a visible focus indicator shows where you are." },
  ],
  problem: [
    "A DevAtlas prototype builds its 'Next lesson' control as a `<div onclick>`. It looks perfect, but keyboard users cannot reach it, screen readers announce nothing useful, and an accessibility audit for a corporate customer fails. The deal is blocked until it is fixed.",
    "Roughly one in six people worldwide live with a significant disability, and many more use keyboards, zoom or captions situationally. Semantic HTML gives you most of accessibility, SEO and robustness for free, and it is far cheaper to do from the start than to retrofit.",
  ],
  concept: {
    analogy: [
      "HTML elements are **road signs**. A `<button>` is a standard stop sign every driver (browser, screen reader, keyboard) understands instantly. A `<div>` painted to look like a stop sign may fool sighted drivers, but GPS systems and anyone not looking at it will drive straight through.",
    ],
    precise: [
      "Native elements come with built-in **role, name, state and keyboard behaviour**. `<button>` is focusable, activates with Enter and Space, and is announced as 'button'. A `<div>` has none of that unless you add tabindex, role, key handlers and ARIA yourself.",
      "**Structure**: one `<h1>` per page and headings in order (h2 → h3) so users can navigate by outline. Landmarks (`<header>`, `<nav>`, `<main>`, `<aside>`, `<footer>`) let screen-reader users jump between regions.",
      "**Links vs buttons**: a link (`<a href>`) navigates to a URL; a button performs an action on the page. **Forms**: every input needs a `<label>`; group related inputs with `<fieldset>`/`<legend>`; show errors in text, not just colour. **Images**: meaningful images need `alt` text; decorative ones use `alt=\"\"`.",
      "WCAG 2.2 level AA is the usual target: sufficient colour contrast (4.5:1 for normal text), everything usable by keyboard, visible focus, no information conveyed only by colour, captions for video.",
    ],
  },
  underTheHood: {
    text: [
      "The browser builds the DOM from your HTML and, from it, an accessibility tree: for each relevant node a **role** (button, heading level 2, textbox), an **accessible name** (from content, label, alt or aria-label) and **states** (expanded, checked, invalid). Screen readers read this tree through OS accessibility APIs.",
      "You can inspect it: Chrome/Edge DevTools → Elements → Accessibility pane, or Firefox's Accessibility Inspector. If the name is empty or the role is 'generic', assistive technology sees nothing useful.",
      "Tab order follows DOM order for focusable elements. Positive tabindex values override it and almost always create confusion; use tabindex=\"0\" (make focusable in order) or \"-1\" (focusable by script only).",
    ],
    diagram: {
      title: "From markup to assistive technology",
      nodes: [
        { label: "HTML", sub: "<button>Next</button>" },
        { label: "DOM", sub: "element tree" },
        { label: "Accessibility tree", sub: "role=button name=Next" },
        { label: "OS a11y API", sub: "" },
        { label: "Screen reader", sub: "\"Next, button\"" },
      ],
      edges: ["parse", "compute", "expose", "read"],
    },
  },
  handsOn: [
    {
      title: "A semantic page skeleton",
      code: {
        lang: "html",
        file: "index.html",
        code: `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Lesson 3.1.1 · DevAtlas</title>
</head>
<body>
  <a class="skip-link" href="#main">Skip to content</a>
  <header>
    <nav aria-label="Main">
      <ul>
        <li><a href="/">Dashboard</a></li>
        <li><a href="/roadmap" aria-current="page">Roadmap</a></li>
      </ul>
    </nav>
  </header>

  <main id="main">
    <h1>Semantic HTML and accessibility</h1>
    <section aria-labelledby="problem">
      <h2 id="problem">The real-world problem</h2>
      <p>…</p>
    </section>
    <figure>
      <img src="a11y-tree.png" alt="Diagram: HTML becomes the DOM, then the accessibility tree read by screen readers">
      <figcaption>How assistive technology sees your page.</figcaption>
    </figure>
    <button type="button">Mark lesson complete</button>
  </main>

  <footer><p>© DevAtlas</p></footer>
</body>
</html>`,
      },
      notes: ["`lang` lets screen readers choose the right voice. `aria-current=\"page\"` tells users which nav item is active. The skip link lets keyboard users bypass navigation."],
    },
    {
      title: "Buttons vs fake buttons",
      code: {
        lang: "html",
        code: `<!-- ✗ Looks clickable, but: not focusable, no Enter/Space, announced as plain text -->
<div class="btn" onclick="next()">Next lesson</div>

<!-- ✓ Native button: focusable, keyboard-operable, announced as "Next lesson, button" -->
<button type="button" class="btn" onclick="next()">Next lesson</button>

<!-- ✓ Navigation is a link, even if styled like a button -->
<a class="btn" href="/lessons/3.2.1">Next lesson</a>

<!-- Icon-only buttons need an accessible name -->
<button type="button" aria-label="Close dialog">
  <svg aria-hidden="true" focusable="false" width="16" height="16"><path d="M2 2l12 12M14 2L2 14"/></svg>
</button>`,
      },
    },
    {
      title: "An accessible form with errors",
      code: {
        lang: "html",
        file: "signup.html",
        code: `<form novalidate>
  <fieldset>
    <legend>Create your DevAtlas account</legend>

    <label for="email">Email</label>
    <input id="email" name="email" type="email" autocomplete="email" required
           aria-describedby="email-hint email-error" aria-invalid="true">
    <p id="email-hint">We'll send your weekly digest here.</p>
    <p id="email-error" class="error">Enter an email like name@example.com</p>

    <label for="goal">Goal</label>
    <select id="goal" name="goal">
      <option>Full-stack</option>
      <option>AI engineer</option>
    </select>

    <label><input type="checkbox" name="digest"> Weekly news digest</label>
  </fieldset>
  <button type="submit">Sign up</button>
</form>`,
      },
      notes: ["`aria-describedby` makes screen readers read the hint and error after the label. `autocomplete` helps password managers and users with motor or memory impairments. Show the error as text, not only a red border."],
    },
    {
      title: "Visible focus and reduced motion in CSS",
      code: {
        lang: "css",
        file: "a11y.css",
        code: `/* Never remove focus outlines without a replacement */
:focus-visible {
  outline: 3px solid #6553f5;
  outline-offset: 2px;
}

.skip-link {
  position: absolute;
  left: -9999px;
}
.skip-link:focus {
  left: 1rem;
  top: 1rem;
}

@media (prefers-reduced-motion: reduce) {
  * { animation: none !important; transition: none !important; }
}`,
      },
    },
    {
      title: "Test it like a user, then with tools",
      code: {
        lang: "text",
        code: `1. Unplug the mouse: Tab through the page. Can you reach and use everything? Is focus always visible?
2. Zoom to 200%: does content still fit without horizontal scrolling?
3. Turn on a screen reader (VoiceOver: Cmd+F5 on macOS; Narrator: Ctrl+Win+Enter on Windows;
   NVDA is free on Windows) and navigate by headings (VoiceOver: VO+Cmd+H; NVDA: H).
4. Run Lighthouse (Chrome DevTools > Lighthouse > Accessibility) or the axe DevTools extension.
5. Check contrast with DevTools' colour picker (shows the contrast ratio and AA/AAA pass).`,
      },
      notes: ["Automated tools catch only part of accessibility problems (commonly estimated around a third or less). Keyboard and screen-reader checks find the rest."],
    },
  ],
  companies: [
    "**Legal and procurement requirements**: many jurisdictions require accessible digital services (for example the ADA in the US, Section 508 for US federal procurement, the European Accessibility Act in the EU). Enterprise customers often require an accessibility conformance report before buying.",
    "**Design systems bake accessibility in**: companies build accessible components once (buttons, dialogs, menus, tabs) following the WAI-ARIA Authoring Practices, so every team inherits correct keyboard and screen-reader behaviour.",
    "**CI checks**: teams run axe-core in component tests or Playwright end-to-end tests to block regressions like missing labels or contrast failures.",
  ],
  mistakes: [
    { mistake: "Clickable divs and spans", why: "Easier to style than buttons", wrong: "Keyboard and screen-reader users cannot use the control", fix: "Use <button> or <a href>; reset their styles with CSS" },
    { mistake: "outline: none on focus", why: "Designers dislike the default ring", wrong: "Keyboard users lose track of where they are", fix: "Style :focus-visible with a clear custom outline" },
    { mistake: "Placeholder instead of label", why: "Cleaner look", wrong: "The hint disappears when typing and is not a reliable accessible name", fix: "Always a visible <label>; placeholders only for examples" },
    { mistake: "Skipping heading levels or using headings for size", why: "Choosing h4 because it looks right", wrong: "Broken document outline for screen-reader navigation", fix: "Pick levels by structure; size with CSS" },
    { mistake: "ARIA everywhere", why: "Believing more ARIA = more accessible", wrong: "Wrong roles override correct native semantics and confuse users", fix: "Native HTML first; ARIA only to fill real gaps, following the ARIA Authoring Practices" },
    { mistake: "Missing or useless alt text", why: "alt='image' or alt equal to the filename", wrong: "Screen-reader users get no information or noise", fix: "Describe the purpose; alt=\"\" for decorative images" },
  ],
  bestPractices: [
    { tag: "Reliability", text: "Target WCAG 2.2 AA: contrast 4.5:1, keyboard access, visible focus, labelled controls, text alternatives." },
    { tag: "Maintainability", text: "Build accessible primitives (Button, Dialog, Field) once and reuse them everywhere." },
    { tag: "Performance", text: "Semantic HTML needs less JavaScript: native buttons, forms and details/summary work before your JS loads." },
    { tag: "Reliability", text: "Add axe checks to tests and do a manual keyboard pass on every new page." },
  ],
  interview: [
    { q: "Why use a <button> instead of a <div> with a click handler?", a: "The button is focusable, works with Enter and Space, exposes the button role and its name to assistive technology, supports disabled state and form submission. Replicating that on a div requires tabindex, role, keyboard handlers and ARIA, and is easy to get wrong." },
    { q: "How do you make a form accessible?", a: "A visible label tied to each input (for/id), grouped controls in fieldset/legend, appropriate input types and autocomplete, error messages in text linked with aria-describedby and aria-invalid, focus moved to the first error on submit, and no reliance on colour alone." },
    { q: "When is ARIA appropriate?", a: "When native HTML cannot express the semantics, for example custom widgets like tabs, comboboxes or live regions announcing updates. Follow the ARIA Authoring Practices patterns, and never use ARIA to override correct native semantics." },
  ],
  quickCheck: [
    {
      kind: "mcq",
      prompt: "A control takes the user to the pricing page. Which element?",
      options: ["<button>", "<a href=\"/pricing\">", "<div onclick>", "<span role=\"button\">"],
      answer: 1,
      explanation: "Navigation is a link. Buttons perform actions on the current page.",
    },
    {
      kind: "bug",
      prompt: "A screen reader announces just 'button' for this control. Why?",
      code: { lang: "html", code: "<button><svg width=\"16\" height=\"16\">…</svg></button>" },
      options: ["SVG is not allowed in buttons", "The button has no accessible name", "type is missing", "Buttons cannot contain images"],
      answer: 1,
      explanation: "Add aria-label=\"Search\" (or visually hidden text) and aria-hidden on the decorative SVG.",
    },
    {
      kind: "mcq",
      prompt: "What alt text should a purely decorative divider image have?",
      options: ["alt=\"divider\"", "No alt attribute", "alt=\"\"", "alt=\"image\""],
      answer: 2,
      explanation: "An empty alt tells assistive technology to skip it. A missing alt may cause the filename to be read.",
    },
  ],
  cheatSheet: [
    "Landmarks: header, nav, main, aside, footer. One h1; headings in order.",
    "Link = navigation; button = action. Never clickable divs.",
    "Every input has a <label>; errors in text + aria-describedby.",
    "alt describes purpose; alt=\"\" for decoration.",
    "Keep :focus-visible outlines; add a skip link.",
    "Contrast ≥ 4.5:1 for body text (WCAG AA).",
    "Native HTML first, ARIA second.",
    "Test: keyboard only, screen reader, then axe/Lighthouse.",
  ],
  homework: {
    basic: {
      title: "Fix the inaccessible card",
      brief: ["Rewrite this lesson card so it is fully accessible: `<div class='card' onclick=\"go('3.1.1')\"><img src='a11y.png'><div class='title'>Semantic HTML</div><div class='btn'>Start</div></div>`."],
      criteria: ["A single real link or button as the interactive element", "Meaningful alt or empty alt with justification", "A heading for the title"],
      hints: ["What does clicking do: navigate or act?"],
      solution: {
        text: ["Clicking navigates, so the card's action is a link. The image is decorative because the title already says what the card is, so alt is empty."],
        code: {
          lang: "html",
          code: `<article class="card">
  <img src="a11y.png" alt="">
  <h3 class="title">Semantic HTML</h3>
  <p>Landmarks, headings, forms and keyboard access.</p>
  <a class="btn" href="/lessons/3.1.1">Start lesson<span class="visually-hidden">: Semantic HTML</span></a>
</article>

<style>
.visually-hidden {
  position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px;
  overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; border: 0;
}
</style>`,
        },
        pitfalls: ["Nesting a button inside a link (invalid interactive nesting)", "Several 'Start' links with identical names, which are ambiguous in a screen-reader link list"],
      },
    },
    intermediate: {
      title: "Keyboard audit",
      brief: ["Audit a website you use daily with keyboard only and a screen reader for 15 minutes. Write five findings with WCAG criteria references and a suggested fix for each."],
      criteria: ["Five specific findings", "Each mapped to a WCAG success criterion (e.g. 2.4.7 Focus Visible)", "Concrete fix suggestions"],
      hints: ["Common finds: invisible focus, unlabeled icon buttons, focus trapped in modals, missing headings."],
      solution: {
        text: [
          "A useful audit finding has four parts: what you did and what happened, the WCAG success criterion it fails (number, name and level), how bad it is for users, and a fix specific enough to implement. Below is a complete example. Its target is the DevAtlas prototype page from this lesson's problem statement, rebuilt with the usual mistakes (a div 'Next lesson', outline: none, an icon-only button, a chat box that traps Tab, grey meta text and a fake heading), so every finding could be reproduced. Use the same format for the site you audit.",
          "Each finding was checked in Chromium 141: the Tab order never reached the div and showed outline-style none on the links and button, a Tab handler kept focus in the chat input on every further Tab, and the accessibility tree showed an unnamed button and 'Next lesson' as plain text. axe-core 4.14 reported button-name, color-contrast, landmark-one-main and page-has-heading-one, but nothing for findings 1, 2 and 4, which is why the manual keyboard pass matters. The 2.6:1 contrast figure is computed for #a0a0a0 on #ffffff.",
          "This example used the accessibility tree instead of a real screen reader; on your own machine, confirm with VoiceOver or NVDA.",
        ],
        code: {
          lang: "markdown",
          file: "a11y-audit.md",
          code: `# Keyboard and screen-reader audit: DevAtlas lesson page (prototype)

- **Date / time spent:** 2026-10-18, 15 minutes
- **Setup:** Chromium 141, keyboard only (Tab, Shift+Tab, Enter, Space, Escape); what a screen reader gets, read from
  the accessibility tree (DevTools Accessibility pane); axe-core 4.14 for a second opinion.
  Still to do: confirm with VoiceOver or NVDA using the headings and landmarks lists.
- **Target:** WCAG 2.2 level AA

## Findings

| # | Finding | WCAG success criterion | Severity | Suggested fix |
|---|---------|------------------------|----------|---------------|
| 1 | "Next lesson" is a \`<div onclick>\`. Tab skips it, Enter does nothing, the accessibility tree exposes it as plain text, so keyboard and screen-reader users cannot continue the course. | 2.1.1 Keyboard (A); 4.1.2 Name, Role, Value (A) | Blocker | It navigates, so use \`<a class="btn" href="/lessons/3.2.1">Next lesson</a>\`. |
| 2 | Focus is invisible on the header links and the search button (\`a:focus, button:focus { outline: none }\`). After two Tabs you cannot tell where you are. | 2.4.7 Focus Visible (AA) | High | Delete the rule; add \`:focus-visible { outline: 3px solid #4b3bd1; outline-offset: 2px; }\`. |
| 3 | The search button contains only an SVG and is announced as "button" with no name. | 4.1.2 Name, Role, Value (A); 1.1.1 Non-text Content (A) | High | \`<button type="button" aria-label="Search lessons">\` and \`aria-hidden="true" focusable="false"\` on the SVG. |
| 4 | Once focus enters the help chat, Tab is captured and always returns to the message box; Escape does nothing. The rest of the page becomes unreachable. | 2.1.2 No Keyboard Trap (A) | Blocker | Remove the Tab handler. If it must be modal, use \`<dialog>\` with \`showModal()\` (Escape closes it) and return focus to the opener. Use a visible \`<label>\` instead of the placeholder (3.3.2). |
| 5 | "Updated 2 days ago · 60 minutes" is \`#a0a0a0\` on white: contrast 2.6:1. The page title is a bold \`<div>\`, so the headings list is empty and there is no \`<main>\` landmark. | 1.4.3 Contrast (Minimum) (AA); 1.3.1 Info and Relationships (A) | Medium | Use \`#4a4d5e\` or darker (at least 4.5:1). Make the title an \`<h1>\` and wrap the content in \`<main>\`; size headings with CSS. |

## What worked
- The header links are real \`<a href>\` elements with clear names, in a logical DOM order.
- The page sets \`lang="en"\` and a descriptive \`<title>\`.

## Next steps
1. Fix the two blockers (1 and 4) first: they stop keyboard users completely.
2. Add axe to component tests so 3 and 5 cannot come back; repeat this manual pass after the fixes, since automated tools did not flag 1, 2 or 4.`,
        },
      },
    },
    challenge: {
      title: "Accessible disclosure without JavaScript, then a tab widget with it",
      brief: ["Build an FAQ with <details>/<summary> (no JS). Then build a tabs component following the WAI-ARIA Authoring Practices pattern: roles tablist/tab/tabpanel, aria-selected, arrow-key navigation, and only the active tab in the tab order."],
      criteria: ["FAQ works with keyboard and screen reader without JS", "Tabs: arrow keys move between tabs, Tab moves into the panel", "Correct ARIA roles and states"],
      hints: ["Roving tabindex: active tab tabindex=0, others tabindex=-1."],
      solution: {
        text: ["Native details/summary is fully accessible for free. For tabs, roles plus roving tabindex and arrow keys reproduce the behaviour users of desktop apps expect."],
        code: {
          lang: "html",
          code: `<div class="tabs">
  <div role="tablist" aria-label="Lesson sections">
    <button role="tab" id="t1" aria-controls="p1" aria-selected="true" tabindex="0">Concept</button>
    <button role="tab" id="t2" aria-controls="p2" aria-selected="false" tabindex="-1">Hands-on</button>
  </div>
  <div role="tabpanel" id="p1" aria-labelledby="t1" tabindex="0">Concept content…</div>
  <div role="tabpanel" id="p2" aria-labelledby="t2" tabindex="0" hidden>Hands-on content…</div>
</div>
<script>
  const tabs = [...document.querySelectorAll('[role="tab"]')];
  function select(tab) {
    tabs.forEach(t => {
      const on = t === tab;
      t.setAttribute("aria-selected", on);
      t.tabIndex = on ? 0 : -1;
      document.getElementById(t.getAttribute("aria-controls")).hidden = !on;
    });
    tab.focus();
  }
  tabs.forEach((t, i) => {
    t.addEventListener("click", () => select(t));
    t.addEventListener("keydown", e => {
      if (e.key === "ArrowRight") select(tabs[(i + 1) % tabs.length]);
      if (e.key === "ArrowLeft") select(tabs[(i - 1 + tabs.length) % tabs.length]);
    });
  });
</script>`,
        },
      },
    },
    capstone: {
      title: "DevAtlas: accessible page shell",
      brief: ["Create the DevAtlas frontend's static shell: skip link, header with nav, main, footer, a lesson page with correct heading hierarchy, and an accessible signup form. Pass Lighthouse accessibility at 100 and a manual keyboard pass."],
      criteria: ["Landmarks and heading outline correct", "All controls keyboard accessible with visible focus", "Lighthouse a11y score 100 plus notes from manual testing"],
      hints: ["Check the heading outline with a browser extension or the screen reader's headings list."],
      solution: {
        text: [
          "Landmarks: a skip link first, then header (brand plus nav with aria-label=\"Main\" and aria-current on the active page), one main, one footer. The lesson is an article with a single h1, h2 per section and h3 below them, so the heading list reads like a table of contents. The signup form uses a visible label for every control, a fieldset/legend for the radio group, autocomplete=\"email\" and a hint tied in with aria-describedby. main has tabindex=\"-1\" so the skip link moves focus there in every browser, and it is excluded from the focus ring because Tab never lands on it.",
          "Focus is never removed: :focus-visible draws a 3 px outline on every link, input and button. Colours meet WCAG AA contrast (axe checks this), and the 'Next lesson' link carries visually hidden text so its accessible name says where it goes.",
          "Verified in Chromium 141 with Playwright and axe-core 4.14 (check.mjs below, output underneath) and with Lighthouse 13.5 (mobile, default settings) against the same files: Accessibility 100, SEO 100. Manual pass notes: every control is reachable with Tab in visual order, the focus ring is visible on each (outline=3px in the output), the skip link appears on first Tab and moves focus to main, and the radio group is one Tab stop with arrow keys moving between options, which is native behaviour. A screen-reader pass was not possible in this environment; do it yourself with VoiceOver or NVDA by listing headings and landmarks.",
        ],
        code: {
          lang: "html",
          file: "site/index.html + site/shell.css + check.mjs",
          code: `<!-- file: site/index.html -->
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="description" content="DevAtlas lesson 3.1.1: semantic HTML and accessibility.">
  <title>Semantic HTML and accessibility · DevAtlas</title>
  <link rel="stylesheet" href="shell.css">
</head>
<body>
  <a class="skip-link" href="#main">Skip to content</a>

  <header class="site-header">
    <a class="brand" href="/">DevAtlas</a>
    <nav aria-label="Main">
      <ul>
        <li><a href="/">Dashboard</a></li>
        <li><a href="/roadmap" aria-current="page">Roadmap</a></li>
        <li><a href="/glossary">Glossary</a></li>
      </ul>
    </nav>
  </header>

  <main id="main" tabindex="-1">
    <article>
      <h1>Semantic HTML and accessibility</h1>
      <p class="meta">Phase 3 · 60 minutes · Beginner</p>

      <section aria-labelledby="problem">
        <h2 id="problem">The real-world problem</h2>
        <p>A "Next lesson" control built from a <code>div</code> cannot be reached with the keyboard.</p>
      </section>

      <section aria-labelledby="concept">
        <h2 id="concept">Concept</h2>
        <h3>Landmarks</h3>
        <p>Header, nav, main and footer let screen-reader users jump between regions.</p>
        <h3>Buttons and links</h3>
        <p>A link navigates; a button acts on the current page.</p>
      </section>

      <a class="button" href="/lessons/3.2.1">Next lesson<span class="visually-hidden">: CSS layout</span></a>
    </article>

    <section aria-labelledby="signup-title" class="signup">
      <h2 id="signup-title">Get the weekly digest</h2>
      <form action="/api/signup" method="post" novalidate>
        <div class="field">
          <label for="email">Email</label>
          <input id="email" name="email" type="email" autocomplete="email" required aria-describedby="email-hint">
          <p id="email-hint" class="hint">One email a week. Unsubscribe any time.</p>
        </div>
        <fieldset>
          <legend>Your goal</legend>
          <label><input type="radio" name="goal" value="full-stack" checked> Full-stack</label>
          <label><input type="radio" name="goal" value="ai"> AI engineer</label>
        </fieldset>
        <label class="check"><input type="checkbox" name="terms" required> I accept the terms</label>
        <button type="submit">Sign up</button>
      </form>
    </section>
  </main>

  <footer class="site-footer">
    <p>© 2026 DevAtlas · <a href="/accessibility">Accessibility statement</a></p>
  </footer>
</body>
</html>

/* file: site/shell.css */
:root { --text: #13141c; --muted: #4a4d5e; --bg: #ffffff; --accent: #4b3bd1; --focus: #4b3bd1; }
*, *::before, *::after { box-sizing: border-box; }
body { margin: 0; font: 1rem/1.6 system-ui, sans-serif; color: var(--text); background: var(--bg); }
a { color: var(--accent); }

.skip-link { position: absolute; left: -9999px; top: 0.5rem; padding: 0.5rem 1rem; background: var(--bg); }
.skip-link:focus { left: 0.5rem; }

.site-header, main, .site-footer { padding: 1rem; max-width: 60rem; margin-inline: auto; }
.site-header { display: flex; flex-wrap: wrap; gap: 1rem; align-items: center; justify-content: space-between; }
.site-header ul { display: flex; gap: 1rem; list-style: none; margin: 0; padding: 0; }
.brand { font-weight: 700; text-decoration: none; }
[aria-current="page"] { font-weight: 700; }
.meta, .hint { color: var(--muted); }

.button, button { display: inline-block; padding: 0.6rem 1.1rem; border: 0; border-radius: 0.5rem;
  background: var(--accent); color: #fff; font: inherit; text-decoration: none; cursor: pointer; }
.field { display: grid; gap: 0.25rem; margin-bottom: 1rem; }
input[type="email"] { padding: 0.5rem; font: inherit; border: 1px solid var(--muted); border-radius: 0.375rem; }
fieldset { margin: 0 0 1rem; border: 1px solid var(--muted); border-radius: 0.375rem; }
.check { display: block; margin-bottom: 1rem; }

/* Visible focus for every interactive element (WCAG 2.4.7) */
:focus-visible { outline: 3px solid var(--focus); outline-offset: 2px; }
main:focus { outline: none; }   /* main only receives focus from the skip link, never from Tab */

.visually-hidden { position: absolute; width: 1px; height: 1px; margin: -1px; padding: 0;
  overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; border: 0; }

@media (prefers-reduced-motion: reduce) { * { animation: none !important; transition: none !important; } }

// file: check.mjs
// npm i -D vite playwright-core axe-core; CHROME_PATH=/path/to/chrome node check.mjs
// Serves ./site with Vite, then runs axe-core and a keyboard walk in Chromium.
import { createRequire } from "node:module";
import { chromium } from "playwright-core";
import { createServer } from "vite";
const require = createRequire(import.meta.url);
const server = await createServer({ root: "site", server: { port: 4311, strictPort: true }, logLevel: "silent" });
await server.listen();
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH });
const page = await browser.newPage();
await page.goto("http://localhost:4311/");

await page.addScriptTag({ path: require.resolve("axe-core") });
const axe = await page.evaluate(() => window.axe.run(document, { runOnly: ["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa", "best-practice"] }));
console.log(\`axe-core \${axe.testEngine.version}: \${axe.violations.length} violations, \${axe.passes.length} rules passed\`);
for (const v of axe.violations) console.log(\` - \${v.id}: \${v.help}\`);

const outline = await page.$$eval("h1, h2, h3, h4", (hs) => hs.map((h) => \`\${"  ".repeat(+h.tagName[1] - 1)}\${h.tagName.toLowerCase()} \${h.textContent.trim()}\`));
console.log("Heading outline:\\n" + outline.join("\\n"));

console.log("Tab order (focus ring width):");
for (let i = 0; i < 11; i++) {
  await page.keyboard.press("Tab");
  console.log(" " + await page.evaluate(() => {
    const el = document.activeElement;
    const name = (el.labels?.[0]?.textContent ?? el.textContent).trim().replace(/\\s+/g, " ");
    return \`\${el.tagName.toLowerCase()}\${el.type ? \`[\${el.type}]\` : ""} "\${name}" outline=\${getComputedStyle(el).outlineWidth}\`;
  }));
}
await page.goto("http://localhost:4311/");
await page.keyboard.press("Tab");
await page.keyboard.press("Enter");
console.log("After skip link, focus is on:", await page.evaluate(() => document.activeElement.id));
await browser.close();
await server.close();`,
        },
        output: `$ node check.mjs
axe-core 4.14.0: 0 violations, 38 rules passed
Heading outline:
h1 Semantic HTML and accessibility
  h2 The real-world problem
  h2 Concept
    h3 Landmarks
    h3 Buttons and links
  h2 Get the weekly digest
Tab order (focus ring width):
 a "Skip to content" outline=3px
 a "DevAtlas" outline=3px
 a "Dashboard" outline=3px
 a "Roadmap" outline=3px
 a "Glossary" outline=3px
 a "Next lesson: CSS layout" outline=3px
 input[email] "Email" outline=3px
 input[radio] "Full-stack" outline=3px
 input[checkbox] "I accept the terms" outline=3px
 button[submit] "Sign up" outline=3px
 a "Accessibility statement" outline=3px
After skip link, focus is on: main`,
        pitfalls: [
          "Removing the outline on :focus to hide the ring on mouse clicks; :focus-visible already does that without hurting keyboard users",
          "A Lighthouse score of 100 is not 'accessible': it runs a subset of automated checks, so the keyboard and screen-reader passes still matter",
        ],
      },
    },
  },
  deeper: [
    { label: "MDN: HTML: A good basis for accessibility", url: "https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/Accessibility/HTML" },
    { label: "W3C: WCAG 2.2 Quick Reference", url: "https://www.w3.org/WAI/WCAG22/quickref/" },
    { label: "WAI-ARIA Authoring Practices Guide", url: "https://www.w3.org/WAI/ARIA/apg/" },
    { label: "web.dev: Learn Accessibility", url: "https://web.dev/learn/accessibility" },
  ],
  nextPreview: "Next: CSS layout. The box model, flexbox and grid, and responsive design that works from phones to wide screens without hacks.",
};
