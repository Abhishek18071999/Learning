import type { Lesson } from "../../types";

export const lesson: Lesson = {
  id: "3.2.1",
  title: "Box model, flexbox and grid",
  minutes: 70,
  level: "Beginner",
  prerequisites: ["3.1.1 Semantic HTML and accessibility"],
  summary: "Understand how CSS sizes and places boxes, use flexbox for one-dimensional layouts and grid for two-dimensional ones, and build responsive pages with modern CSS (custom properties, clamp, container queries).",
  terms: [
    { term: "Box model", def: "Every element is a box: content, padding, border, margin. `box-sizing: border-box` makes width include padding and border." },
    { term: "Cascade and specificity", def: "Rules for which CSS declaration wins: importance, origin, specificity (id > class > element), then source order." },
    { term: "Flexbox", def: "Layout along one axis (a row or a column): distributing space, aligning items, wrapping." },
    { term: "Grid", def: "Layout in rows and columns at the same time, with explicit tracks and areas." },
    { term: "Responsive design", def: "Layouts that adapt to screen size and user settings, typically mobile-first with media or container queries." },
    { term: "Custom property", def: "A CSS variable like `--accent: #6553f5`, read with `var(--accent)`. Great for themes." },
    { term: "rem / em", def: "Units relative to the root font size (rem) or the element's font size (em). They respect user font settings." },
  ],
  problem: [
    "The DevAtlas dashboard looks fine on the designer's 27-inch monitor. On a phone the cards overflow horizontally, the sidebar covers the content, and a long lesson title pushes a button off-screen. Someone 'fixes' it with negative margins and `position: absolute`, which breaks it on tablets.",
    "Modern CSS (flexbox, grid, clamp, container queries) makes robust layouts short and predictable. Learning how boxes are sized and which tool fits which layout ends the cycle of hacks.",
  ],
  concept: {
    analogy: [
      "**Flexbox** is arranging books on **one shelf**: you decide spacing and alignment along the shelf, and whether they wrap to the next shelf. **Grid** is a **spreadsheet or a city map**: you define rows and columns first, then place items into cells or named areas.",
    ],
    precise: [
      "**Box sizing**: with the default `content-box`, `width: 300px` plus 20px padding and 2px border renders 344px wide. With `border-box` it renders 300px. Most projects set `*, *::before, *::after { box-sizing: border-box; }`.",
      "**Flexbox**: the container sets `display: flex`, direction, `gap`, `justify-content` (main axis) and `align-items` (cross axis). Children grow/shrink with `flex: 1 1 200px` (grow, shrink, basis). `min-width: 0` on a flex child lets long content shrink instead of overflowing.",
      "**Grid**: `grid-template-columns: repeat(auto-fit, minmax(16rem, 1fr))` makes a responsive card grid with no media queries. `grid-template-areas` names regions for page layouts.",
      "**Responsive**: design mobile-first, add `@media (min-width: …)` for larger screens, use relative units, `clamp(min, preferred, max)` for fluid type and spacing, and `@container` queries when a component should adapt to its container rather than the whole viewport.",
    ],
  },
  underTheHood: {
    text: [
      "Rendering pipeline: parse HTML → DOM; parse CSS → CSSOM; combine into a render tree; **layout** computes each box's size and position; **paint** draws pixels; **composite** layers onto the screen. Changing width or font size triggers layout again (expensive); changing `transform` or `opacity` can often skip layout and paint, which is why smooth animations use them.",
      "**Specificity** examples: `#nav a` (1 id, 1 element) beats `.nav .link` (2 classes) beats `a` (1 element). Equal specificity → later rule wins. Keep specificity low (single classes) so styles are easy to override; avoid `!important` except for utilities.",
      "Flex items have `min-width: auto` by default, so they refuse to shrink below their content's minimum size; this is the classic cause of overflowing flex layouts with long words or code blocks.",
    ],
    diagram: {
      title: "Box model (border-box)",
      nodes: [
        { label: "margin", sub: "outside, transparent" },
        { label: "border", sub: "" },
        { label: "padding", sub: "inside border" },
        { label: "content", sub: "width includes padding + border" },
      ],
      edges: ["", "", ""],
    },
  },
  handsOn: [
    {
      title: "A modern CSS base",
      code: {
        lang: "css",
        file: "base.css",
        code: `*, *::before, *::after { box-sizing: border-box; }

:root {
  --bg: #f6f6fa;
  --surface: #ffffff;
  --text: #13141c;
  --accent: #6553f5;
  --radius: 12px;
  --space: clamp(1rem, 0.6rem + 1.5vw, 2rem);     /* fluid spacing */
  font-family: system-ui, sans-serif;
  line-height: 1.6;
}

@media (prefers-color-scheme: dark) {
  :root { --bg: #0a0c12; --surface: #11141d; --text: #e9eaf2; }
}

body { margin: 0; background: var(--bg); color: var(--text); }
img { max-width: 100%; height: auto; display: block; }
h1 { font-size: clamp(1.8rem, 1.2rem + 2.5vw, 3rem); line-height: 1.1; }`,
      },
    },
    {
      title: "Page layout with grid areas (mobile-first)",
      code: {
        lang: "css",
        file: "layout.css",
        code: `.app {
  display: grid;
  min-height: 100vh;
  grid-template-areas:
    "header"
    "main"
    "footer";
  grid-template-rows: auto 1fr auto;
}

@media (min-width: 900px) {
  .app {
    grid-template-columns: 260px 1fr;
    grid-template-areas:
      "sidebar header"
      "sidebar main"
      "sidebar footer";
  }
}

.app > header  { grid-area: header; }
.app > nav     { grid-area: sidebar; display: none; }
.app > main    { grid-area: main; padding: var(--space); min-width: 0; }
.app > footer  { grid-area: footer; }

@media (min-width: 900px) { .app > nav { display: block; } }`,
      },
      notes: ["`min-width: 0` on main lets wide content (code blocks, tables) scroll inside instead of stretching the whole page."],
    },
    {
      title: "Responsive cards without media queries",
      code: {
        lang: "css",
        code: `.cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(16rem, 100%), 1fr));
  gap: 1rem;
}

.card {
  background: var(--surface);
  border-radius: var(--radius);
  padding: 1.25rem;
  display: flex;               /* flex inside grid: stack content, push button down */
  flex-direction: column;
  gap: 0.5rem;
}
.card .actions { margin-top: auto; }`,
      },
      notes: ["`min(16rem, 100%)` prevents overflow on screens narrower than 16rem. `margin-top: auto` in a flex column pushes the actions to the bottom so buttons line up across cards."],
    },
    {
      title: "Flexbox toolbar that never overflows",
      code: {
        lang: "html",
        code: `<header class="toolbar">
  <a class="brand" href="/">DevAtlas</a>
  <input class="search" type="search" placeholder="Search lessons" aria-label="Search lessons">
  <button class="streak" type="button">🔥 12 days</button>
</header>

<style>
.toolbar {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
}
.search {
  flex: 1 1 auto;   /* take the remaining space */
  min-width: 0;     /* allow shrinking below its content size on small screens */
}
.brand, .streak { flex: none; white-space: nowrap; }
</style>`,
      },
    },
    {
      title: "Container queries: a component that adapts to its slot",
      code: {
        lang: "css",
        code: `.lesson-card-wrapper { container-type: inline-size; }

.lesson-card { display: grid; gap: 0.75rem; }

@container (min-width: 32rem) {
  .lesson-card { grid-template-columns: 8rem 1fr; }   /* image beside text when there is room */
}`,
      },
      notes: ["Container queries are supported in all current major browsers; check caniuse.com if you must support old browsers."],
    },
  ],
  companies: [
    "**Design tokens**: companies define colours, spacing, radii and typography as tokens (often CSS custom properties) shared across web, iOS and Android, so a brand change is a token change, not a rewrite.",
    "**Utility-first and component CSS**: some teams use utility frameworks like Tailwind CSS; others use CSS Modules or CSS-in-JS. All of them compile down to the same box model, flexbox and grid, so the fundamentals transfer.",
    "**Performance budgets**: layout shifts (CLS) and slow rendering hurt Core Web Vitals; teams reserve space for images (width/height or aspect-ratio) and avoid layout-triggering animations.",
  ],
  mistakes: [
    { mistake: "Fixed pixel widths everywhere", why: "Matching a design mock exactly", wrong: "Overflow on small screens and ignored user font settings", fix: "Fluid units, max-width, minmax(), clamp(), rem for type" },
    { mistake: "Missing min-width: 0 on flex/grid children", why: "Default min-width: auto", wrong: "Long words or code blocks push layouts off-screen", fix: "Set min-width: 0 (or overflow handling) on the shrinking child" },
    { mistake: "Using flexbox for 2D page grids", why: "Flexbox is familiar", wrong: "Fragile wrappers and uneven columns", fix: "Grid for rows+columns; flex for one-dimensional groups" },
    { mistake: "Escalating specificity and !important", why: "Overriding something quickly", wrong: "Specificity wars; styles impossible to change later", fix: "Flat, single-class selectors; cascade layers (@layer) for ordering" },
    { mistake: "Animating width/top/left", why: "Simple to write", wrong: "Janky animations due to layout every frame", fix: "Animate transform and opacity" },
  ],
  bestPractices: [
    { tag: "Maintainability", text: "Tokens as custom properties; single-class selectors; components own their styles." },
    { tag: "Performance", text: "Reserve space for media (aspect-ratio, width/height attributes) to avoid layout shift." },
    { tag: "Reliability", text: "Test at 320px width, at 200% zoom and with long real content (names, translations)." },
    { tag: "Performance", text: "Prefer CSS for layout and simple interactions over JavaScript." },
  ],
  interview: [
    { q: "Flexbox vs grid?", a: "Flexbox lays out items along one axis and is content-driven: toolbars, button groups, centring. Grid controls rows and columns together and is layout-driven: page structures, card galleries, forms. They combine well: grid for the page, flex inside components." },
    { q: "Explain the box model and box-sizing.", a: "An element's box has content, padding, border and margin. With content-box, width applies to content only, so padding and border add to the rendered size. With border-box, width includes padding and border, which makes sizing predictable." },
    { q: "How does CSS decide which rule applies?", a: "The cascade: origin and !important, then specificity (inline > id > class/attribute/pseudo-class > element), then source order. Cascade layers add explicit ordering between groups of rules." },
  ],
  quickCheck: [
    {
      kind: "output",
      prompt: "With default box-sizing (content-box), how wide is this box on screen?",
      code: { lang: "css", code: ".box { width: 200px; padding: 10px; border: 5px solid; margin: 20px; }" },
      options: ["200px", "230px", "270px", "220px"],
      answer: 1,
      explanation: "200 + 2×10 padding + 2×5 border = 230px (margin is outside the box). With border-box it would be 200px.",
    },
    {
      kind: "mcq",
      prompt: "Which creates a responsive card grid without media queries?",
      options: ["display: flex; flex-wrap: nowrap", "grid-template-columns: repeat(auto-fit, minmax(16rem, 1fr))", "float: left on each card", "position: absolute"],
      answer: 1,
      explanation: "auto-fit with minmax creates as many columns as fit, each at least 16rem.",
    },
    {
      kind: "bug",
      prompt: "A long URL in a flex item pushes the page wider than the phone screen. Most likely fix?",
      options: ["Add z-index", "Set min-width: 0 on the flex item (and overflow-wrap: anywhere on the text)", "Use float", "Add !important to width"],
      answer: 1,
      explanation: "Flex items default to min-width: auto; allow them to shrink and let long words wrap.",
    },
  ],
  cheatSheet: [
    "*, *::before, *::after { box-sizing: border-box }",
    "Flex: one axis; justify-content (main), align-items (cross), gap, flex: 1 1 auto.",
    "Grid: rows + columns; repeat(auto-fit, minmax(…, 1fr)); grid-template-areas.",
    "min-width: 0 on shrinking flex/grid children.",
    "Mobile-first: base styles, then @media (min-width).",
    "clamp(min, fluid, max) for type and spacing.",
    "@container for component-level responsiveness.",
    "Animate transform/opacity, not layout properties.",
  ],
  homework: {
    basic: {
      title: "Centre anything, three ways",
      brief: ["Centre a card horizontally and vertically in the viewport using (1) flexbox, (2) grid, (3) margin auto with a known width. Explain when each is appropriate."],
      criteria: ["Three working versions", "Works on mobile widths", "Short explanation"],
      hints: ["Grid: place-items: center on a min-height: 100vh container."],
      solution: {
        text: ["Grid's place-items is the shortest for a single child; flexbox is natural inside components that already use flex; margin: auto only centres horizontally unless the parent is a flex/grid container."],
        code: {
          lang: "css",
          code: `.flex-center { display: flex; justify-content: center; align-items: center; min-height: 100vh; }
.grid-center { display: grid; place-items: center; min-height: 100vh; }
.margin-center { width: min(30rem, 100% - 2rem); margin-inline: auto; }`,
        },
      },
    },
    intermediate: {
      title: "Build the DevAtlas dashboard layout",
      brief: ["Recreate the dashboard: header, collapsible sidebar on mobile, stat cards in a responsive grid, two panels side by side on desktop and stacked on mobile. No CSS framework."],
      criteria: ["Works from 320px to 1600px without horizontal scroll", "Grid for the page, flex inside components", "Custom properties for colours and spacing"],
      hints: ["Use the layout.css and cards patterns from the hands-on."],
      solution: {
        text: ["Page: grid with areas switching at 900px. Stats: repeat(auto-fit, minmax(min(14rem, 100%), 1fr)). Panels: grid-template-columns: 1fr on mobile, repeat(2, minmax(0, 1fr)) on desktop. The minmax(0, 1fr) avoids content forcing columns wider."],
      },
    },
    challenge: {
      title: "A dark/light theme switcher with system default",
      brief: ["Implement themes with custom properties: follow the OS by default (prefers-color-scheme), allow a manual override saved in localStorage, and avoid a flash of the wrong theme on load."],
      criteria: ["System default respected", "Override persists", "No flash on reload"],
      hints: ["Set a data-theme attribute on <html> in a tiny inline script in <head> before CSS paints."],
      solution: {
        text: ["Tokens under :root, dark values under the media query guarded by :root:not([data-theme=light]), and again under [data-theme=dark]. A blocking inline script reads localStorage and sets data-theme before first paint. This app (DevAtlas itself) uses the same approach."],
        code: {
          lang: "html",
          code: `<script>
  try {
    const t = localStorage.getItem("theme");          // "light" | "dark" | null
    if (t) document.documentElement.dataset.theme = t;
  } catch {}
</script>
<style>
  :root { --bg: #fff; --text: #111; }
  @media (prefers-color-scheme: dark) {
    :root:not([data-theme="light"]) { --bg: #0b0d14; --text: #eee; }
  }
  :root[data-theme="dark"] { --bg: #0b0d14; --text: #eee; }
  body { background: var(--bg); color: var(--text); }
</style>`,
        },
      },
    },
    capstone: {
      title: "DevAtlas: design tokens and layout",
      brief: ["Add `web/src/styles/tokens.css` and `layout.css` to the DevAtlas frontend with colour, spacing, radius and typography tokens, light and dark themes, and the responsive app shell."],
      criteria: ["All colours come from tokens", "Shell responsive at 320/768/1280px", "Visible focus styles kept"],
      hints: ["Screenshot the three widths in DevTools device mode for your PR."],
      solution: {
        text: ["Tokens first means every component in Phase 3.4 uses var(--…) and themes work automatically."],
      },
    },
  },
  deeper: [
    { label: "MDN: CSS layout", url: "https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/CSS_layout" },
    { label: "MDN: CSS grid layout", url: "https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_grid_layout" },
    { label: "web.dev: Learn CSS", url: "https://web.dev/learn/css" },
    { label: "MDN: Container queries", url: "https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_containment/Container_queries" },
  ],
  nextPreview: "Next: browser JavaScript. The DOM, events and fetch: making pages interactive before reaching for a framework.",
};
