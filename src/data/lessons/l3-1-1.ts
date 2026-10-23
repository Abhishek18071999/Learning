import type { Lesson } from "../../types";

export const lesson: Lesson = {
  id: "3.1.1",
  title: "Semantic HTML and accessibility",
  minutes: 60,
  level: "Beginner",
  prerequisites: ["0.1.2 HTTP in depth", "A text editor and a browser"],
  summary: "Write HTML that browsers, search engines and assistive technologies understand: landmarks and heading order, labelled forms, native controls before ARIA, keyboard and dialog focus, contrast, alt text, live regions, and how to verify the result with a screen reader and axe.",
  terms: [
    { term: "Semantic HTML", def: "Using elements for their meaning (`<nav>`, `<button>`, `<h2>`) rather than generic `<div>`s styled to look right. The meaning is what browsers, search engines and assistive technology act on." },
    { term: "Accessibility (a11y)", def: "Making sites usable by everyone, including people who use screen readers, keyboards, magnification, voice control or captions. The '11' counts the letters between the a and the y." },
    { term: "Screen reader", def: "Software that reads the accessibility tree aloud and lets users jump by headings, landmarks, links and form fields (NVDA and JAWS on Windows, VoiceOver on macOS and iOS, TalkBack on Android)." },
    { term: "Accessibility tree", def: "The browser's simplified view of the page: for each meaningful node a role, an accessible name and states such as checked, expanded or invalid. Assistive technology reads this tree, not your HTML source." },
    { term: "Accessible name", def: "The text a control is announced by. It is computed from `aria-labelledby`, then `aria-label`, then a native `<label>` (or `alt`), then the element's content. An empty name makes a control anonymous." },
    { term: "Landmark", def: "A named page region screen-reader users can jump to: `<header>`, `<nav>`, `<main>`, `<aside>`, `<footer>`, `<form>` when named, and `<section>` when labelled. Landmarks replace the visual layout as a navigation map." },
    { term: "Heading order", def: "The sequence of heading levels (h1, h2, h3) that forms the page outline. Screen readers list headings as a table of contents, so levels describe structure, not visual size, and should not skip." },
    { term: "ARIA", def: "Accessible Rich Internet Applications: attributes such as `role`, `aria-label`, `aria-expanded` and `aria-live` that add semantics HTML cannot express. First rule of ARIA: do not use ARIA if a native element already does the job." },
    { term: "WCAG", def: "Web Content Accessibility Guidelines, the standard most accessibility laws and audits reference. Levels A, AA and AAA; AA is the usual target and requires 4.5:1 contrast for normal text, keyboard access and visible focus." },
    { term: "Focus order", def: "The sequence in which Tab and Shift+Tab move through interactive elements. It follows DOM order by default; positive `tabindex` values override it and usually break the visual order." },
    { term: "Focus management", def: "Deliberately moving focus when the page changes: into a dialog when it opens, back to the opener when it closes, and to the first invalid field after a failed submit. Without it, keyboard and screen-reader users are left behind." },
    { term: "Live region", def: "A region (`role=\"status\"`, `role=\"alert\"` or `aria-live`) whose text changes are announced without moving focus. Use it for async results such as 'Saved' or '3 results'; overuse turns the page into noise." },
  ],
  problem: [
    "A DevAtlas prototype builds its 'Next lesson' control as a `<div onclick>`. It looks perfect, but keyboard users cannot reach it, screen readers announce nothing useful, and an accessibility audit for a corporate customer fails. The deal is blocked until it is fixed.",
    "Roughly one in six people worldwide live with a significant disability, and many more use keyboards, zoom or captions situationally. The prototype also fails in quieter ways: its first section jumps from `h1` to `h4`, its email field has only a placeholder, its avatar image has no text alternative, and its modal leaves focus behind the overlay. None of that shows up in a screenshot. Semantic HTML gives you most of accessibility, SEO and robustness for free, and it is far cheaper to do from the start than to retrofit after a procurement review finds it.",
  ],
  concept: {
    analogy: [
      "HTML elements are **road signs**. A `<button>` is a standard stop sign every driver (browser, screen reader, keyboard) understands instantly. A `<div>` painted to look like a stop sign may fool sighted drivers, but GPS systems and anyone not looking at it will drive straight through.",
      "A page without landmarks and headings is a **building with no floor directory**. Sighted visitors can wander until they find the room, but someone who navigates by the directory is stuck at the entrance. `<main>`, `<nav>` and an ordered heading outline are that directory: they say what each part of the page is and how the parts relate, before anyone reads a word.",
    ],
    precise: [
      "Native elements come with built-in **role, name, state and keyboard behaviour**. `<button>` is focusable, activates with Enter and Space, is announced as 'button', submits forms when appropriate and exposes a disabled state. A `<div>` has none of that unless you add tabindex, role, key handlers, focus styles and ARIA yourself, and every one of those additions is a chance to get it wrong.",
      "**Structure** is the first layer: one `<main>` per page, landmarks (`<header>`, `<nav>`, `<main>`, `<aside>`, `<footer>`) for the regions, one `<h1>` for the page subject, and headings in order (h2, then h3) so users can navigate by outline. Label multiple navigation regions (`aria-label=\"Main\"`, `\"Breadcrumb\"`), name sections with `aria-labelledby`, and put a skip link before the header so keyboard users can bypass it.",
      "**Forms** are where accessibility is usually lost. Every input needs a `<label>` tied by `for`/`id` (or wrapping); group related controls with `<fieldset>`/`<legend>`; use the right `type` and `autocomplete` token; show errors as text, not just a red border; link hints and errors with `aria-describedby` and set `aria-invalid`; and move focus to the error summary or first invalid field after a failed submit. Placeholders are examples, never labels.",
      "**Interaction** is the second layer: a link (`<a href>`) navigates to a URL, while a button performs an action on the page. Everything must work from the keyboard in a logical focus order, with a visible focus indicator and no traps. Use native elements before ARIA (the first rule of ARIA), manage focus when a dialog opens and closes, give meaningful images `alt` text and decorative ones `alt=\"\"`, announce async changes with a live region, and meet WCAG 2.2 AA contrast: 4.5:1 for normal text, 3:1 for large text and UI components. Then verify with a keyboard, a screen reader and axe, because no single tool covers all of it.",
    ],
  },
  underTheHood: {
    text: [
      "The browser parses HTML into a DOM and, alongside it, computes an **accessibility tree**: one node per meaningful element, each with a **role** (button, heading level 2, textbox, generic), an **accessible name** and **states** (checked, expanded, invalid, disabled). The name is computed in order: `aria-labelledby`, then `aria-label`, then a native `<label>` (or `alt`), then the element's own text content, with `<title>` as a last resort. Screen readers read this tree through the operating system's accessibility API (UI Automation on Windows, AX on macOS, AT-SPI on Linux). If the role is `generic` and the name is empty, assistive technology has nothing to announce, even when the pixels look perfect.",
      "**Landmarks and headings are the page's map.** `<header>`, `<nav>`, `<main>`, `<aside>` and `<footer>` become navigable regions; a `<section>` becomes a `region` only when it has an accessible name (`aria-labelledby` or `aria-label`), and every `<nav>` on a page should have a distinct label ('Main', 'Breadcrumb', 'Footer'). Heading levels form an outline: start at `h1` for the page's subject, use `h2` for its main sections and `h3` below them, and never pick a level for its font size. Screen readers expose a headings list and a landmarks list, so a skipped level or three unlabelled navs turns that list into a maze. A skip link at the top (`<a href=\"#main\">Skip to content</a>` with `<main id=\"main\" tabindex=\"-1\">`) is the keyboard equivalent of that map.",
      "**Forms: the name, not the placeholder.** Every input needs a programmatic label: `<label for=\"email\">` pointing at `id=\"email\"`, or a wrapping `<label>`. The label supplies the accessible name and enlarges the click/tap target. A placeholder is not a label: it disappears as soon as the user types, is often low contrast, and is not reliably announced as a name. Group related controls with `<fieldset>` and `<legend>` (radio groups especially), use the right `type` (`email`, `tel`, `number`) and `autocomplete` tokens (`email`, `one-time-code`, `current-password`) so password managers and assistive input work. Errors belong in text next to the field and in a summary at the top; link them with `aria-describedby` and mark the field `aria-invalid=\"true\"`, then move focus to the summary or first invalid field on submit. Colour alone (a red border) is not an error message.",
      "**Native first, ARIA second.** The first rule of ARIA is: if a native HTML element or attribute already has the semantics and behaviour you need, use it instead of repurposing a `<div>` and adding ARIA. `<button>` arrives focusable, activates with Enter and Space, submits forms, supports `disabled` and is announced as a button; a `<div role=\"button\" tabindex=\"0\">` arrives with none of that and needs key handlers, focus styles and state management that are easy to get wrong. ARIA changes semantics, not behaviour: `role=\"dialog\"` does not trap focus, and `aria-expanded` does not open anything. Redundant roles (`<button role=\"button\">`) add noise or conflict; a wrong role is worse than no role. Use ARIA for genuine gaps such as tabs, comboboxes, live regions and custom sliders, and follow the WAI-ARIA Authoring Practices pattern for that widget.",
      "**Keyboard operability and focus order.** Every action must work without a mouse: Tab/Shift+Tab to move, Enter to activate links and buttons, Space for buttons, checkboxes and radios, arrow keys inside radio groups, tabs and menus, Escape to dismiss overlays. The tab order follows DOM order, so the DOM must match the visual reading order; CSS reordering (`order`, `flex-direction: row-reverse`, absolute positioning) can make focus jump around the screen. `tabindex=\"0\"` adds an element to the natural order, `tabindex=\"-1\"` makes it focusable only by script, and positive values (1, 2, 3) hijack the whole page order and should not be used. Never remove the focus indicator: style `:focus-visible` instead. A **keyboard trap** (focus that cannot leave a region) is a WCAG failure; the only legitimate trap is a modal dialog, where Tab cycles inside until it closes.",
      "**Dialogs need focus management.** Use the native `<dialog>` element with `showModal()`: it moves the dialog into the top layer, makes the rest of the page inert, handles Escape and confines Tab to the dialog. Move focus to a sensible control when it opens (a heading with `tabindex=\"-1\"`, the first field, or the primary action), and on `close` return focus to the element that opened it; otherwise keyboard users land back at the top of the document and screen-reader users keep reading behind the overlay. A custom `div` dialog must reproduce all of this manually (focus trap, `aria-modal=\"true\"`, Escape, restore focus, background inertness), which is why the native element is the better default. A dialog also needs an accessible name, usually `aria-labelledby` pointing at its heading.",
      "**Contrast and colour.** WCAG 2.2 AA asks for a contrast ratio of at least **4.5:1** for normal text, **3:1** for large text (at least 24 px, or 18.66 px bold) and **3:1** for UI components and focus indicators. The ratio comes from relative luminance, not from how different two colours feel: run the real values. #a0a0a0 on white is 2.61:1 (fails normal text), #767676 on white is 4.54:1 (just passes), and #4a4d5e on white is 8.35:1 (passes AAA). Never use colour as the only carrier of meaning: pair a red error with an icon and text, underline links inside paragraphs, and give chart series patterns or direct labels as well as colours. Disabled controls are exempt from 1.4.3, but users still need to know why they are disabled.",
      "**Alt text is a purpose, not a description of pixels.** A meaningful image needs `alt` that says what the image contributes in context: 'Chart: completion rises from 20% to 64% in eight weeks' rather than 'image' or 'chart.png'. A decorative image uses `alt=\"\"` so it is skipped; omitting `alt` entirely can make some screen readers announce the filename, and the HTML validator flags it. An icon-only button needs an accessible name (`aria-label`, or visually hidden text) and its SVG marked `aria-hidden=\"true\" focusable=\"false\"` so the icon is not announced twice. When an image is the only content of a link, its alt is the link's name, so describe the destination. Complex images (charts, diagrams) need a short alt plus a longer description nearby, linked with `aria-describedby`.",
      "**Live regions and verification.** When JavaScript changes part of the page without navigation (a save confirmation, search results, an error count), put it in a live region: `role=\"status\"` (polite, announced when the user pauses) or `role=\"alert\"` (assertive, interrupts), with `aria-atomic=\"true\"` when the whole message should be read. Do not make every change live, and do not move focus just to announce a status. Verification has layers: `html-validate` and axe catch missing `lang`, labels, alt, heading skips, contrast and some ARIA misuse, but automated tools cover only part of WCAG; then Tab through the page and use a screen reader's headings, landmarks and forms lists. In this lesson html-validate caught seven real problems in one fragment and still missed a clickable `<div>` with no role and a useless `alt=\"divider\"`, which is exactly why the manual pass is not optional.",
    ],
    diagram: {
      title: "From markup to assistive technology",
      nodes: [
        { label: "HTML", sub: "source markup" },
        { label: "DOM", sub: "element tree" },
        { label: "Accessibility tree", sub: "role, name, state" },
        { label: "OS a11y API", sub: "UI Automation / AX" },
        { label: "Screen reader", sub: "\"Next, button\"" },
      ],
      edges: ["parse", "compute", "expose", "read"],
      caption: "Linters read the source; screen readers read the computed tree. A clean lint is a floor, not a ceiling.",
    },
  },
  handsOn: [
    {
      title: "Start from a semantic page skeleton",
      text: [
        "Build the shell before the widget. This page has one `<main>`, a labelled nav, a skip link that targets `main`, a single `h1`, `h2`/`h3` in order, a labelled figure, and a `role=\"status\"` live region. `lang=\"en\"` picks the right pronunciation; `aria-current=\"page\"` marks the active nav item; `main` has `tabindex=\"-1\"` so the skip link can move focus there in every browser. Save it as `skeleton.html`.",
      ],
      code: {
        lang: "html",
        file: "skeleton.html",
        code: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Lesson 3.1.1 - DevAtlas</title>
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
  <main id="main" tabindex="-1">
    <h1>Semantic HTML and accessibility</h1>
    <section aria-labelledby="problem">
      <h2 id="problem">The real-world problem</h2>
      <p>A control built from a div cannot be reached with a keyboard.</p>
    </section>
    <section aria-labelledby="concept">
      <h2 id="concept">Concept</h2>
      <h3>Landmarks</h3>
      <p>Header, nav, main and footer let screen-reader users jump between regions.</p>
      <h3>Buttons and links</h3>
      <p>A link navigates; a button acts on the current page.</p>
    </section>
    <figure>
      <img src="a11y-tree.png" alt="Diagram: HTML becomes the DOM, then the accessibility tree read by screen readers">
      <figcaption>How assistive technology sees your page.</figcaption>
    </figure>
    <button type="button">Mark lesson complete</button>
    <p role="status">Lesson marked complete.</p>
  </main>
  <footer><p>&copy; DevAtlas</p></footer>
</body>
</html>`,
      },
      output: "$ npx --yes html-validate@latest skeleton.html\n$ echo $LASTEXITCODE\n0",
      notes: [
        "The run used `html-validate` 11.17.0 with the configuration shown in the next step: the recommended and a11y presets plus three extra rules (`heading-level`, `input-missing-label`, `no-redundant-role`). It prints nothing when a file passes, so the exit code is the result.",
        "A clean validator run does not mean the page is accessible. It never opens a screen reader, never presses Tab, and cannot judge whether the alt text is useful.",
      ],
    },
    {
      title: "Break it, then fix it, with real validator output",
      text: [
        "Now break it on purpose. The fragment below is a realistic settings page with mistakes that survive visual review: no `lang`, a heading that jumps from `h1` to `h4`, a clickable card built from divs, an image with no `alt`, an email input with only a placeholder, an unlabelled checkbox, a button without `type`, and a div pretending to be a button. Put the config and both files in one folder; the validator resolves `.htmlvalidate.json` automatically.",
      ],
      code: {
        lang: "html",
        file: "bad.html + good.html + .htmlvalidate.json",
        code: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Broken settings page</title>
</head>
<body>
  <div class="nav">
    <a href="/">Home</a>
    <a href="/settings">Settings</a>
  </div>

  <h1>Account settings</h1>
  <h4>Profile</h4>

  <div class="card" onclick="save()">
    <img src="avatar.png">
    <span class="title">Your avatar</span>
    <div class="btn" onclick="save()">Save</div>
  </div>

  <h4>Notifications</h4>
  <form>
    <input type="email" placeholder="Email address">
    <input type="checkbox" name="digest">
    <button onclick="submit()">Send me the digest</button>
  </form>

  <div role="button" aria-label="Open help" onclick="help()">?</div>
  <img src="divider.png" alt="divider">
</body>
</html>

<!-- file: good.html -->
<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><title>Fixed settings page</title></head>
<body>
  <header>
    <nav aria-label="Main">
      <a href="/">Home</a>
      <a href="/settings" aria-current="page">Settings</a>
    </nav>
  </header>
  <main>
    <h1>Account settings</h1>
    <section aria-labelledby="profile">
      <h2 id="profile">Profile</h2>
      <img src="avatar.png" alt="Your current avatar: a blue circle with the letters DA">
      <a class="btn" href="/settings/avatar">Change avatar</a>
    </section>
    <section aria-labelledby="notifications">
      <h2 id="notifications">Notifications</h2>
      <form action="/settings/notifications" method="post">
        <label for="email">Email address</label>
        <input id="email" name="email" type="email" autocomplete="email" aria-describedby="email-hint">
        <p id="email-hint">One digest a week. Unsubscribe any time.</p>
        <label><input type="checkbox" name="digest"> Send me the weekly digest</label>
        <button type="submit">Save notifications</button>
        <button type="button" aria-label="Open help">?</button>
      </form>
    </section>
  </main>
</body>
</html>

<!-- file: .htmlvalidate.json -->
{
  "extends": ["html-validate:recommended", "html-validate:a11y"],
  "rules": {
    "heading-level": "error",
    "input-missing-label": "error",
    "no-redundant-role": "error"
  }
}`,
      },
      output: `$ npx --yes html-validate@latest bad.html
bad.html
   2:2  error  <html> is missing required "lang" attribute                         element-required-attributes
  14:4  error  Heading level can only increase by one, expected <h2> but got <h4>  heading-level
  17:6  error  <img> is missing required "alt" attribute                           wcag/h37
  24:6  error  <input> element does not have a <label>                             input-missing-label
  25:6  error  <input> element does not have a <label>                             input-missing-label
  26:6  error  <button> is missing recommended "type" attribute                    no-implicit-button-type
  29:8  error  Prefer to use the native <button> element                           prefer-native-element

✖ 7 problems (7 errors, 0 warnings)

$ npx --yes html-validate@latest good.html
$ echo $LASTEXITCODE
0`,
      notes: [
        "The validator printed the absolute path of the temporary file; it is shortened to `bad.html` here. The rule-documentation links after the summary are omitted.",
        "It did not report the `<div onclick=\"save()\">` on line 16 or the `alt=\"divider\"` on line 30. The first has no role for the rule to recognise, and the second is technically present but useless. Automated rules find patterns, not intent.",
        "The fixed file exits 0 because it uses `header`/`nav`/`main`, `h1` then `h2`, a real link for navigation and a labelled email input. The decorative divider is removed; if it stayed, it would need `alt=\"\"`. Passing the linter is necessary, not sufficient: contrast, focus order and the quality of the alt text are still on you.",
      ],
    },
    {
      title: "Native elements before ARIA: the comparison table",
      text: [
        "Native HTML is not just 'less code'; it is behaviour you do not have to test. Keep this table nearby. If you find yourself writing `role` + `tabindex` + `keydown` + `aria-*` to recreate something in the left column, stop and use the left column.",
      ],
      code: {
        lang: "text",
        file: "native-vs-aria.txt",
        code: `NATIVE (use this)          FREE BEHAVIOUR                                ARIA-ONLY APPROXIMATION
<button type="button">     focusable; Enter + Space; role=button;         <div role="button" tabindex="0">
                           form submission; disabled semantics           + click + keydown + focus styles
<a href="/x">              focusable; Enter; role=link; URL shown         <span role="link" tabindex="0">
                                                                         + keydown + navigation
<dialog> + showModal()     top layer; background inert; Esc; Tab        <div role="dialog" aria-modal="true">
                           confined to the dialog                        + focus trap + Esc + restore focus
<details><summary>         Enter/Space; aria-expanded maintained          <div role="button" aria-expanded>
                                                                         + click + keydown + panel toggle
<label for="email">        accessible name; click/tap target             aria-label (name only, no target)
<input type="checkbox">    Space; checked state; group by name          role="checkbox" + aria-checked
                                                                         + Space handler
WCAG 2.2 AA minimum contrast
normal text (< 24 px, or < 18.66 px bold)          4.5:1
large text (>= 24 px, or >= 18.66 px bold)         3:1
UI components, icons, focus indicator             3:1
disabled controls                                  exempt from 1.4.3
Computed with the WCAG relative-luminance formula (node, this lesson):
#a0a0a0 on #ffffff   2.61:1   fails normal text
#767676 on #ffffff   4.54:1   passes by 0.04
#4a4d5e on #ffffff   8.35:1   passes AAA`,
      },
      notes: [
        "ARIA is still the right tool for tabs, comboboxes, trees, live regions and custom sliders, where no native element exists. Follow the WAI-ARIA Authoring Practices pattern for those widgets; do not improvise the keyboard model.",
        "The contrast ratios above were computed in this lesson with the WCAG relative-luminance formula, not estimated by eye. A 4.54:1 pass is real but leaves no margin for a slightly lighter token.",
      ],
    },
    {
      title: "Focus management in a native dialog",
      text: [
        "A dialog is the one place a focus trap is correct. Use `<dialog>` with `showModal()`: it enters the top layer, makes the rest of the page inert, closes on Escape, and keeps Tab inside. Move focus to a sensible control on open and return it to the opener on close. The `close` event fires for Escape and for `method=\"dialog\"` submission, so one handler covers both.",
      ],
      code: {
        lang: "html",
        file: "dialog.html",
        code: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Dialog focus</title>
</head>
<body>
  <main>
    <h1>Help</h1>
    <button type="button" id="open-help">Open help</button>
    <dialog id="help-dialog" aria-labelledby="help-title">
      <h2 id="help-title">Keyboard shortcuts</h2>
      <p>Press <kbd>?</kbd> anywhere to reopen this dialog.</p>
      <form method="dialog">
        <button type="submit">Close</button>
      </form>
    </dialog>
  </main>
  <script>
    const dialog = document.getElementById("help-dialog");
    const opener = document.getElementById("open-help");
    opener.addEventListener("click", () => {
      dialog.showModal();
      dialog.querySelector("button[type=submit]").focus();
    });
    dialog.addEventListener("close", () => {
      opener.focus();
    });
  </script>
</body>
</html>`,
      },
      output: "$ npx --yes html-validate@latest dialog.html\n$ echo $LASTEXITCODE\n0",
      notes: [
        "No `role=\"dialog\"` and no `aria-modal=\"true\"` are needed: `showModal()` already provides both the semantics and the modality. Adding the role redundantly is the ARIA habit this lesson warns against.",
        "The validator only proves the markup is well formed. The focus behaviour needs a keyboard pass: open with Enter, Tab to the end and confirm focus wraps inside, press Escape, then confirm focus is back on 'Open help'.",
        "For a custom `div` dialog you would have to reproduce the top layer, inertness, Escape, focus trap and restore yourself. That is a large amount of behaviour to reimplement for no benefit.",
      ],
    },
    {
      title: "Test in layers: keyboard, screen reader, axe",
      text: [
        "Testing is a sequence, not a single tool. Do the cheap checks first, then the expensive ones. The order matters because running a screen reader on a page with a broken outline wastes time on problems a linter could have caught.",
        "Keyboard testing needs no install: Tab and Shift+Tab through the page, then Enter and Space on every control. Watch for focus that is invisible, controls that are unreachable, and focus that cannot leave a region. Zoom to 200% and check that nothing is clipped or hidden.",
      ],
      code: {
        lang: "mermaid",
        file: "a11y-test-loop.mmd",
        code: `flowchart TD
  A[html-validate: structure, names, alt] --> B[Keyboard only: Tab, Shift+Tab, Enter, Space, Escape]
  B --> C[Zoom 200% and check contrast]
  C --> D[Screen reader: headings, landmarks, forms, live regions]
  D --> E[axe DevTools or axe-core in CI]
  E --> F{New blocker?}
  F -- yes --> G[Fix, then repeat from the keyboard pass]
  F -- no --> H[Ship and keep the checks in CI]
  G --> B`,
      },
      notes: [
        "Screen reader: NVDA is free on Windows, VoiceOver is built into macOS. Use the headings list (NVDA `H`, VoiceOver rotor `VO+U`), the landmarks list (NVDA `D`), and forms mode. Listen for each control's name, role and state; a button announced as 'button' with no name is the most common failure.",
        "axe: the DevTools extension for one page, or `npx @axe-core/cli http://localhost:3000` and axe-core inside Playwright for CI. Treat violations as bugs, and treat zero violations as 'no detected bugs', not 'accessible'.",
        "The screen-reader key bindings and the axe command are documented usage shown for reference; the terminal output reproduced in this lesson comes from html-validate. Claiming a screen-reader result you did not hear would be worse than admitting the gap.",
      ],
    },
  ],
  companies: [
    "**Legal and procurement requirements (illustrative):** many jurisdictions require accessible digital services, for example the ADA in the US, Section 508 for US federal procurement, and the European Accessibility Act in the EU. Enterprise buyers often ask for a VPAT or Accessibility Conformance Report before signing, which is exactly the audit that blocked the prototype in the problem.",
    "**Design systems bake accessibility in (illustrative):** teams build accessible buttons, dialogs, menus and fields once, following the WAI-ARIA Authoring Practices, and every product team inherits the keyboard and screen-reader behaviour. Public examples include the GOV.UK Design System, Shopify Polaris and GitHub Primer.",
    "**CI checks (illustrative):** teams run axe-core in component or Playwright tests, Lighthouse CI budgets, and html-validate in a pre-commit hook. The goal is to block regressions such as a removed label or a contrast token change, not to prove the product is accessible.",
    "**Static validation in this lesson (verified in this lesson):** html-validate 11.17.0 with the recommended and a11y presets reported 7 errors in `bad.html` and 0 in `good.html` and `skeleton.html`. It caught the missing `lang`, the heading jump, the missing `alt`, both unlabelled inputs, the button type and the div-as-button; it did not catch the un-roled clickable div, the useless `alt=\"divider\"`, contrast or focus order.",
    "**Screen-reader and disabled-tester programmes (illustrative):** NVDA is free and open source, JAWS is commercial, and VoiceOver ships with Apple platforms. Mature teams pay disabled users to test, because automated tools and sighted QA miss interaction bugs that a daily keyboard user finds in minutes.",
  ],
  mistakes: [
    { mistake: "Clickable divs and spans", why: "Easier to style than buttons", wrong: "Keyboard and screen-reader users cannot use the control; a div has no role, no focus and no Enter/Space behaviour", fix: "Use `<button>` for actions or `<a href>` for navigation, then reset their styles with CSS" },
    { mistake: "outline: none on focus", why: "Designers dislike the default ring", wrong: "Keyboard users lose track of where they are, which fails WCAG 2.4.7", fix: "Style `:focus-visible` with a clear custom outline and leave the default alone" },
    { mistake: "Placeholder instead of label", why: "It looks cleaner", wrong: "The hint disappears when typing, is often low contrast, and is not a reliable accessible name", fix: "Always a visible `<label>` tied by `for`/`id`; placeholders only for examples" },
    { mistake: "Skipping heading levels or using headings for size", why: "Choosing h4 because it looks right", wrong: "The document outline has gaps, so screen-reader heading navigation misrepresents the structure", fix: "Pick levels by structure (h1, h2, h3); size headings with CSS" },
    { mistake: "ARIA everywhere", why: "Believing more ARIA means more accessible", wrong: "Wrong or redundant roles override correct native semantics and confuse users; `role=\"dialog\"` does not add focus trapping", fix: "Native HTML first; ARIA only for real gaps, following the ARIA Authoring Practices" },
    { mistake: "Missing or useless alt text", why: "alt='image' or alt equal to the filename satisfies the attribute", wrong: "Screen-reader users get noise or no information; decorative images become interruptions", fix: "Describe the purpose in context; `alt=\"\"` for decoration; name icon-only buttons" },
    { mistake: "Opening a dialog without moving or restoring focus", why: "The visual overlay looks complete", wrong: "Focus stays on the page behind it, so keyboard users tab through hidden content and screen-reader users may never hear the dialog", fix: "Use `<dialog>` + `showModal()`, focus something inside on open, and return focus to the opener on close" },
    { mistake: "Positive tabindex values", why: "They seem to let you control the order", wrong: "They override DOM order for the whole page and produce a focus sequence that jumps against the visual layout", fix: "Fix the DOM order; use `tabindex=\"0\"` only to join the natural order and `-1` for script focus" },
    { mistake: "Showing errors with colour only", why: "A red border is quick to implement", wrong: "Users with colour-vision deficiency, and screen-reader users, miss both the error and which field caused it", fix: "Add text and an icon, link the message with `aria-describedby`, set `aria-invalid`, and focus the error summary" },
    { mistake: "Changing content silently", why: "The update is obvious on screen", wrong: "A screen reader announces nothing when results load or a save succeeds, so the user thinks the action failed", fix: "Use `role=\"status\"` for polite updates or `role=\"alert\"` for urgent ones; do not move focus just to announce" },
  ],
  bestPractices: [
    { tag: "Reliability", text: "Target WCAG 2.2 AA as the baseline: 4.5:1 contrast for normal text, keyboard access, visible focus, labelled controls and text alternatives." },
    { tag: "Maintainability", text: "Build accessible primitives (Button, Dialog, Field) once, following the ARIA Authoring Practices, and reuse them everywhere." },
    { tag: "Performance", text: "Semantic HTML needs less JavaScript: native buttons, forms, `<details>` and `<dialog>` work before your bundle loads." },
    { tag: "Reliability", text: "Run html-validate and axe in CI, then do a manual keyboard and screen-reader pass on every new page; automated tools catch only a subset." },
    { tag: "Cost", text: "Accessibility retrofits are expensive and block procurement; put it in the definition of done so each component ships correct the first time." },
  ],
  interview: [
    { q: "Why use a <button> instead of a <div> with a click handler?", a: "The button is focusable, works with Enter and Space, exposes the button role and its accessible name to assistive technology, supports the disabled state and participates in form submission. Replicating that on a div requires `tabindex`, `role`, keyboard handlers, focus styles and state management, and any omission breaks a group of users. The same logic applies to links (`<a href>` for navigation), dialogs (`<dialog>` + `showModal()`), and disclosures (`<details>`/`<summary>`): the native element is the tested implementation of the behaviour." },
    { q: "How do you make a form accessible?", a: "A visible `<label>` tied to each input with `for`/`id` (or a wrapping label), grouped controls in `<fieldset>`/`<legend>`, appropriate `type` and `autocomplete` values, hints linked with `aria-describedby`, and error messages in text linked to the field with `aria-invalid=\"true\"`. On submit, keep the data, show a summary at the top, move focus to the summary or the first invalid field, and never rely on colour alone. Native validation helps, but do not remove the server-side checks: assistive technology and custom validation must agree on what went wrong." },
    { q: "When is ARIA appropriate, and how do you manage focus and announcements?", a: "Use ARIA when native HTML cannot express the widget: tabs, comboboxes, trees, live regions or custom sliders. Follow the ARIA Authoring Practices pattern, including its keyboard model and states, rather than inventing one. For dialogs, prefer `<dialog>` with `showModal()`: it gives the top layer, inert background, Escape and a focus trap; move focus inside on open and return it to the opener on close. For asynchronous updates, use a live region (`role=\"status\"` for polite, `role=\"alert\"` for urgent) instead of stealing focus. The first rule still governs everything: no ARIA is better than bad ARIA, and native semantics win whenever they exist." },
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
      prompt: "A page has an `<h1>`, then an `<h3>` for its first section. What is the problem?",
      options: ["`h3` may not follow `h1`", "The heading level skips `h2`, so the outline has a gap", "A page may have only one heading", "`h3` must be inside a `<header>`"],
      answer: 1,
      explanation: "Heading levels describe nesting. Go h1 → h2 → h3; use CSS for size, not a lower level.",
    },
    {
      kind: "bug",
      prompt: "A modal opens, focus moves inside, and Escape closes it, but focus is now on `<body>`. What is the correct fix?",
      options: ["Add `tabindex=\"-1\"` to `<body>`", "Return focus to the element that opened the dialog", "Set `aria-modal=\"false\"` after closing", "Move focus to the page's `<h1>`"],
      answer: 1,
      explanation: "Focus must go back to the opener, so keyboard and screen-reader users resume where they left off. `<dialog>` still needs this in a `close` handler.",
    },
  ],
  cheatSheet: [
    "Landmarks: header, nav, main, aside, footer. One main, one h1, headings in order.",
    "Link = navigation (`<a href>`); button = action. Never clickable divs.",
    "Every input has a `<label>`; group with fieldset/legend; errors in text + `aria-describedby` + `aria-invalid`.",
    "Native HTML first; ARIA only for real gaps; no redundant roles and no ARIA that fakes behaviour.",
    "Keyboard: DOM order, `tabindex` 0 or -1 only, no positive values, visible `:focus-visible`, no traps.",
    "Dialog: `<dialog>` + `showModal()`, focus inside on open, Escape closes, focus returns to the opener.",
    "Images: alt describes purpose; `alt=\"\"` for decoration; icon-only buttons need a name.",
    "Contrast AA: 4.5:1 normal text, 3:1 large text and UI/focus indicators; never colour alone.",
    "Live regions: `role=\"status\"` for polite updates, `role=\"alert\"` for urgent; do not move focus to announce.",
    "Test in layers: html-validate → keyboard → zoom/contrast → screen reader → axe. Tools catch a subset.",
  ],
  homework: {
    basic: {
      title: "Fix the inaccessible card",
      brief: ["Rewrite this lesson card so it is fully accessible: `<div class='card' onclick=\"go('3.1.1')\"><img src='a11y.png'><div class='title'>Semantic HTML</div><div class='btn'>Start</div></div>`."],
      criteria: ["A single real link or button as the interactive element", "A meaningful heading for the title, not a styled div", "Meaningful alt or empty alt with justification, and one accessible name per control"],
      hints: ["What does clicking do: navigate or act?", "The card title already names the destination; does the image add information?"],
      solution: {
        text: ["Clicking navigates, so the card's action is a link. The image is decorative because the title already says what the card is, so alt is empty. The title becomes an `h3` so it appears in the heading list, and the link gets visually hidden text so several 'Start' links are distinguishable in a screen-reader link list."],
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
      hints: ["Roving tabindex: active tab tabindex=0, others tabindex=-1.", "The panel needs an accessible name too: `aria-labelledby` pointing at its tab."],
      solution: {
        text: ["Native details/summary is fully accessible for free. For tabs, roles plus roving tabindex and arrow keys reproduce the behaviour users of desktop apps expect. Add `aria-labelledby` on each panel so the panel is announced with its tab's name, and keep only the selected tab in the Tab order."],
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
    { label: "MDN: The dialog element", url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/dialog" },
    { label: "html-validate rule reference", url: "https://html-validate.org/rules/" },
  ],
  nextPreview: "Next: CSS layout. The box model, flexbox and grid, and responsive design that works from phones to wide screens without hacks.",
};
