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
        text: [
          "The page is a grid with named areas: one column on mobile (topbar, then a sidebar that is hidden until the Menu button opens it, then main) and, from 900px, a 240px sidebar beside the topbar and main. Inside each component it is flexbox: the topbar's search takes the remaining space with flex: 1 1 auto and min-width: 0, and the panel's Resume button is pushed to the bottom with margin-top: auto. Colours, radius and spacing are custom properties, with fluid spacing from clamp().",
          "Stat cards use repeat(auto-fit, minmax(min(14rem, 100%), 1fr)), so they go from 1 to 4 per row without media queries. The two panels use minmax(0, 1fr) columns and sit side by side from 1100px (below that, the 240px sidebar leaves them too narrow); minmax(0, …) stops the long code line from widening its column, so the <pre> scrolls inside instead.",
          "The check script loads the page in Chromium 141 at six widths and measures it. Its first run found horizontal scroll at 320px and 375px: on mobile the grid had no explicit column, and an implicit auto column grows to the topbar's min-content width (474px here, because of the search input's intrinsic size). grid-template-columns: minmax(0, 1fr) fixed it; the output below is from after the fix.",
        ],
        code: {
          lang: "html",
          file: "site/index.html + site/dashboard.css + check.mjs",
          code: `<!-- file: site/index.html -->
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Dashboard · DevAtlas</title>
  <link rel="stylesheet" href="dashboard.css">
</head>
<body>
  <div class="app">
    <header class="topbar">
      <button class="menu-toggle" type="button" aria-expanded="false" aria-controls="sidebar">Menu</button>
      <a class="brand" href="/">DevAtlas</a>
      <input class="search" type="search" aria-label="Search lessons" placeholder="Search lessons">
    </header>

    <nav class="sidebar" id="sidebar" aria-label="Main">
      <ul>
        <li><a href="/" aria-current="page">Dashboard</a></li>
        <li><a href="/roadmap">Roadmap</a></li>
        <li><a href="/glossary">Glossary</a></li>
      </ul>
    </nav>

    <main>
      <h1>Welcome back</h1>
      <ul class="stats">
        <li class="card"><span class="label">Lessons done</span><span class="value">18</span></li>
        <li class="card"><span class="label">Streak</span><span class="value">12 days</span></li>
        <li class="card"><span class="label">Quiz average</span><span class="value">86%</span></li>
        <li class="card"><span class="label">Hours this week</span><span class="value">6.5</span></li>
      </ul>
      <div class="panels">
        <section class="card" aria-labelledby="next">
          <h2 id="next">Continue learning</h2>
          <p>3.2.1 CSS layout: flexbox, grid and responsive design</p>
          <a class="button" href="/lessons/3.2.1">Resume</a>
        </section>
        <section class="card" aria-labelledby="activity">
          <h2 id="activity">Recent activity</h2>
          <pre><code>grid-template-columns: repeat(auto-fit, minmax(min(14rem, 100%), 1fr));</code></pre>
        </section>
      </div>
    </main>
  </div>
  <script>
    const toggle = document.querySelector(".menu-toggle");
    toggle.addEventListener("click", () => {
      const open = toggle.getAttribute("aria-expanded") !== "true";
      toggle.setAttribute("aria-expanded", String(open));
      document.querySelector(".app").classList.toggle("nav-open", open);
    });
  </script>
</body>
</html>

/* file: site/dashboard.css */
*, *::before, *::after { box-sizing: border-box; }
:root {
  --bg: #f6f6fa; --surface: #ffffff; --text: #13141c; --muted: #4a4d5e; --accent: #4b3bd1; --on-accent: #ffffff;
  --radius: 12px;
  --space: clamp(1rem, 0.6rem + 1.5vw, 2rem);
  --gap: 1rem;
}
body { margin: 0; font: 1rem/1.6 system-ui, sans-serif; background: var(--bg); color: var(--text); }
:focus-visible { outline: 3px solid var(--accent); outline-offset: 2px; }

/* Page: grid with named areas, mobile first */
.app {
  display: grid;
  min-height: 100vh;
  grid-template-columns: minmax(0, 1fr);   /* an implicit auto column would grow to the topbar's min-content */
  grid-template-rows: auto auto 1fr;
  grid-template-areas: "topbar" "sidebar" "main";
}
.topbar  { grid-area: topbar; }
.sidebar { grid-area: sidebar; display: none; background: var(--surface); }
main     { grid-area: main; padding: var(--space); min-width: 0; }   /* min-width: 0 lets <pre> scroll inside */
.app.nav-open .sidebar { display: block; }                               /* collapsible on mobile */

@media (min-width: 900px) {
  .app {
    grid-template-columns: 240px minmax(0, 1fr);
    grid-template-rows: auto 1fr;
    grid-template-areas: "sidebar topbar" "sidebar main";
  }
  .sidebar { display: block; }
  .menu-toggle { display: none; }
}

/* Components: flex inside */
.topbar { display: flex; align-items: center; gap: var(--gap); padding: 0.75rem var(--space); background: var(--surface); }
.brand { flex: none; font-weight: 700; color: var(--text); text-decoration: none; }
.search { flex: 1 1 auto; min-width: 0; padding: 0.5rem; font: inherit; border: 1px solid var(--muted); border-radius: 8px; }
.menu-toggle, .button { flex: none; padding: 0.5rem 1rem; border: 0; border-radius: 8px;
  background: var(--accent); color: var(--on-accent); font: inherit; text-decoration: none; }
.sidebar ul { list-style: none; margin: 0; padding: var(--gap); display: flex; flex-direction: column; gap: 0.5rem; }
.sidebar a { color: var(--text); }

.card { background: var(--surface); border-radius: var(--radius); padding: var(--gap); }
.stats {
  list-style: none; margin: 0 0 var(--gap); padding: 0;
  display: grid; gap: var(--gap);
  grid-template-columns: repeat(auto-fit, minmax(min(14rem, 100%), 1fr));   /* no media query needed */
}
.stats .card { display: flex; flex-direction: column; }
.label { color: var(--muted); }
.value { font-size: 1.75rem; font-weight: 700; }

.panels { display: grid; gap: var(--gap); grid-template-columns: minmax(0, 1fr); }
@media (min-width: 1100px) { .panels { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
.panels .card { display: flex; flex-direction: column; gap: 0.5rem; }
.panels .button { align-self: flex-start; margin-top: auto; }
pre { overflow-x: auto; margin: 0; padding: 0.75rem; background: var(--bg); border-radius: 8px; }

// file: check.mjs
// CHROME_PATH=/path/to/chrome node check.mjs : loads the page at several widths and checks the layout
import { chromium } from "playwright-core";
const url = new URL("./site/index.html", import.meta.url).href;
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH });
const page = await browser.newPage();
await page.goto(url);

for (const width of [320, 375, 768, 1024, 1280, 1600]) {
  await page.setViewportSize({ width, height: 900 });
  const r = await page.evaluate(() => {
    const box = (s) => document.querySelector(s).getBoundingClientRect();
    const [a, b] = [...document.querySelectorAll(".panels > .card")].map((e) => e.getBoundingClientRect());
    const stats = [...document.querySelectorAll(".stats .card")].map((e) => Math.round(e.getBoundingClientRect().top));
    return {
      hScroll: document.documentElement.scrollWidth > document.documentElement.clientWidth,
      sidebar: getComputedStyle(document.querySelector(".sidebar")).display !== "none",
      statsPerRow: stats.filter((t) => t === stats[0]).length,
      panels: Math.round(a.top) === Math.round(b.top) ? "side by side" : "stacked",
      preScrolls: document.querySelector("pre").scrollWidth > box("pre").width,
    };
  });
  console.log(\`\${String(width).padStart(4)}px  horizontal scroll: \${r.hScroll ? "YES" : "no"}  sidebar: \${r.sidebar ? "shown" : "hidden"}  \` +
    \`stat cards per row: \${r.statsPerRow}  panels: \${r.panels}  code scrolls inside: \${r.preScrolls}\`);
}

await page.setViewportSize({ width: 375, height: 900 });
await page.click(".menu-toggle");
console.log("375px after Menu click: sidebar", await page.isVisible(".sidebar") ? "shown" : "hidden",
  "aria-expanded =", await page.getAttribute(".menu-toggle", "aria-expanded"));
await browser.close();`,
        },
        output: `$ node check.mjs
 320px  horizontal scroll: no  sidebar: hidden  stat cards per row: 1  panels: stacked  code scrolls inside: true
 375px  horizontal scroll: no  sidebar: hidden  stat cards per row: 1  panels: stacked  code scrolls inside: true
 768px  horizontal scroll: no  sidebar: hidden  stat cards per row: 3  panels: stacked  code scrolls inside: true
1024px  horizontal scroll: no  sidebar: shown  stat cards per row: 3  panels: stacked  code scrolls inside: true
1280px  horizontal scroll: no  sidebar: shown  stat cards per row: 4  panels: side by side  code scrolls inside: true
1600px  horizontal scroll: no  sidebar: shown  stat cards per row: 4  panels: side by side  code scrolls inside: true
375px after Menu click: sidebar shown aria-expanded = true`,
        pitfalls: [
          "Leaving the mobile grid column implicit: auto tracks size to content and cause horizontal scroll on small phones",
          "Using 1fr instead of minmax(0, 1fr) for columns that contain code or long URLs",
        ],
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
        text: [
          "tokens.css is the only file with raw values: colour roles (bg, surface, text, muted, border, accent, on-accent, focus), a spacing scale plus one fluid page gutter, two radii and the type scale. Dark values are declared twice, under prefers-color-scheme guarded by :root:not([data-theme=\"light\"]) and under :root[data-theme=\"dark\"], so the OS setting is followed by default and a manual choice (the challenge tier's inline script) wins either way. Components only reference roles such as var(--color-accent), never a hex value, so a theme is just a different set of token values.",
          "layout.css is mobile first: one minmax(0, 1fr) column with header, a horizontally scrollable nav strip, main and footer; at 768px main gets a readable max width; at 1024px the nav becomes a sticky sidebar column. :focus-visible keeps a 3px outline in the focus colour, which has its own token so it stays visible in dark mode.",
          "check.mjs enforces the criteria instead of trusting screenshots: a regex finds no colour literals in layout.css (its first version flagged 'white-space', hence the stricter pattern), then Chromium 141 loads a demo page at 320, 768 and 1280px in light and dark colour schemes and reports horizontal scroll, where the nav sits, the body background, axe-core 4.14 colour-contrast violations and the focus ring on the first Tab stop. Take screenshots at the same three widths for the PR.",
        ],
        code: {
          lang: "css",
          file: "web/src/styles/tokens.css + layout.css (+ demo page and check)",
          code: `/* file: web/src/styles/tokens.css */
/* Design tokens: the only file allowed to contain raw colour values */
:root {
  color-scheme: light dark;

  /* colour (light) */
  --color-bg: #f6f6fa;
  --color-surface: #ffffff;
  --color-text: #13141c;
  --color-text-muted: #4a4d5e;
  --color-border: #d4d5df;
  --color-accent: #4b3bd1;
  --color-on-accent: #ffffff;
  --color-focus: #4b3bd1;

  /* spacing: 4px scale plus one fluid value for page gutters */
  --space-1: 0.25rem;
  --space-2: 0.5rem;
  --space-3: 1rem;
  --space-4: 1.5rem;
  --space-page: clamp(1rem, 0.6rem + 1.5vw, 2rem);

  /* radius */
  --radius-sm: 6px;
  --radius-md: 12px;

  /* typography */
  --font-sans: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  --font-mono: ui-monospace, "SFMono-Regular", Menlo, monospace;
  --text-sm: 0.875rem;
  --text-md: 1rem;
  --text-xl: clamp(1.6rem, 1.2rem + 2vw, 2.5rem);
  --leading: 1.6;

  /* layout */
  --sidebar-width: 15rem;
}

/* dark: follow the OS unless the user picked light; or the user picked dark */
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
    --color-bg: #0a0c12;
    --color-surface: #141824;
    --color-text: #e9eaf2;
    --color-text-muted: #a9adc0;
    --color-border: #2c3142;
    --color-accent: #8f84ff;
    --color-on-accent: #0a0c12;
    --color-focus: #b3abff;
  }
}
:root[data-theme="dark"] {
  --color-bg: #0a0c12;
  --color-surface: #141824;
  --color-text: #e9eaf2;
  --color-text-muted: #a9adc0;
  --color-border: #2c3142;
  --color-accent: #8f84ff;
  --color-on-accent: #0a0c12;
  --color-focus: #b3abff;
}

/* file: web/src/styles/layout.css */
/* App shell. Every colour, space, radius and font comes from tokens.css */
*, *::before, *::after { box-sizing: border-box; }
body {
  margin: 0;
  font: var(--text-md) / var(--leading) var(--font-sans);
  background: var(--color-bg);
  color: var(--color-text);
}
a { color: var(--color-accent); }
:focus-visible { outline: 3px solid var(--color-focus); outline-offset: 2px; }   /* never removed */

.app {
  display: grid;
  min-height: 100vh;
  grid-template-columns: minmax(0, 1fr);
  grid-template-rows: auto auto 1fr auto;
  grid-template-areas: "header" "nav" "main" "footer";
}
.app > header { grid-area: header; }
.app > nav    { grid-area: nav; }
.app > main   { grid-area: main; padding: var(--space-page); min-width: 0; }
.app > footer { grid-area: footer; padding: var(--space-3) var(--space-page); color: var(--color-text-muted); }

/* Phones: nav is a horizontally scrollable strip under the header */
.app > nav { overflow-x: auto; border-bottom: 1px solid var(--color-border); background: var(--color-surface); }
.app > nav ul { display: flex; gap: var(--space-3); margin: 0; padding: var(--space-2) var(--space-page); list-style: none; }
.app > nav a { white-space: nowrap; color: var(--color-text); }
.app > nav a[aria-current="page"] { color: var(--color-accent); font-weight: 600; }

/* Tablet: content gets a readable max width */
@media (min-width: 768px) {
  .app > main { max-width: 60rem; }
}

/* Desktop: sidebar column */
@media (min-width: 1024px) {
  .app {
    grid-template-columns: var(--sidebar-width) minmax(0, 1fr);
    grid-template-rows: auto 1fr auto;
    grid-template-areas: "nav header" "nav main" "nav footer";
  }
  .app > nav { border-bottom: 0; border-right: 1px solid var(--color-border); overflow: visible; }
  .app > nav ul { flex-direction: column; position: sticky; top: 0; padding: var(--space-4) var(--space-3); }
}

.app > header {
  display: flex; align-items: center; gap: var(--space-3);
  padding: var(--space-2) var(--space-page);
  background: var(--color-surface);
  border-bottom: 1px solid var(--color-border);
}
.brand { flex: none; font-weight: 700; color: var(--color-text); text-decoration: none; }
.search {
  flex: 1 1 auto; min-width: 0; padding: var(--space-2);
  font: inherit; color: inherit; background: var(--color-bg);
  border: 1px solid var(--color-border); border-radius: var(--radius-sm);
}
.button {
  flex: none; padding: var(--space-2) var(--space-3); border: 0; border-radius: var(--radius-sm);
  background: var(--color-accent); color: var(--color-on-accent); font: inherit; cursor: pointer;
}
h1 { font-size: var(--text-xl); line-height: 1.15; }
.card { background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius-md); padding: var(--space-3); }
code, pre { font-family: var(--font-mono); font-size: var(--text-sm); }
pre { overflow-x: auto; }

/* file: web/shell.html (demo page for the check) */
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Shell · DevAtlas</title>
  <link rel="stylesheet" href="src/styles/tokens.css">
  <link rel="stylesheet" href="src/styles/layout.css">
</head>
<body>
  <div class="app">
    <header><a class="brand" href="/">DevAtlas</a><input class="search" type="search" aria-label="Search lessons"><button class="button" type="button">Theme</button></header>
    <nav aria-label="Main"><ul><li><a href="/" aria-current="page">Dashboard</a></li><li><a href="/roadmap">Roadmap</a></li><li><a href="/glossary">Glossary</a></li><li><a href="/news">News</a></li><li><a href="/settings">Settings</a></li></ul></nav>
    <main><h1>CSS layout: flexbox and grid</h1><p class="card">Tokens first: components only use var(--…).</p>
      <pre><code>grid-template-columns: var(--sidebar-width) minmax(0, 1fr); /* a long line that must scroll inside the pre on phones */</code></pre></main>
    <footer>© 2026 DevAtlas</footer>
  </div>
</body>
</html>

/* file: check.mjs */
// CHROME_PATH=/path/to/chrome node check.mjs
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { chromium } from "playwright-core";
const require = createRequire(import.meta.url);

// 1. No raw colours outside tokens.css
const layout = readFileSync("web/src/styles/layout.css", "utf8").replace(/\\/\\*[\\s\\S]*?\\*\\//g, "");
const literals = layout.match(/#[0-9a-f]{3,8}\\b|\\b(?:rgb|hsl|oklch)a?\\(|(?<![\\w-])(?:white|black)(?![\\w-])/gi) ?? [];
console.log(\`colour literals in layout.css: \${literals.length}\`);

// 2. Shell at three widths, light and dark
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH });
for (const colorScheme of ["light", "dark"]) {
  const page = await browser.newPage({ colorScheme });
  await page.goto(new URL("./web/shell.html", import.meta.url).href);
  await page.addScriptTag({ path: require.resolve("axe-core") });
  for (const width of [320, 768, 1280]) {
    await page.setViewportSize({ width, height: 800 });
    const r = await page.evaluate(async () => {
      const nav = document.querySelector("nav").getBoundingClientRect();
      const main = document.querySelector("main").getBoundingClientRect();
      const contrast = await window.axe.run(document, { runOnly: ["color-contrast"] });
      return {
        hScroll: document.documentElement.scrollWidth > document.documentElement.clientWidth,
        nav: nav.right <= main.left ? "sidebar" : "top strip",
        bg: getComputedStyle(document.body).backgroundColor,
        contrastViolations: contrast.violations.length,
      };
    });
    console.log(\`\${colorScheme.padEnd(5)} \${String(width).padStart(4)}px  horizontal scroll: \${r.hScroll ? "YES" : "no"}  nav: \${r.nav}  body bg: \${r.bg}  contrast violations: \${r.contrastViolations}\`);
  }
  await page.keyboard.press("Tab");
  const focus = await page.evaluate(() => { const s = getComputedStyle(document.activeElement); return \`\${s.outlineStyle} \${s.outlineWidth} \${s.outlineColor}\`; });
  console.log(\`\${colorScheme.padEnd(5)} focus ring on first Tab stop: \${focus}\`);
  await page.close();
}
await browser.close();`,
        },
        output: `$ node check.mjs
colour literals in layout.css: 0
light  320px  horizontal scroll: no  nav: top strip  body bg: rgb(246, 246, 250)  contrast violations: 0
light  768px  horizontal scroll: no  nav: top strip  body bg: rgb(246, 246, 250)  contrast violations: 0
light 1280px  horizontal scroll: no  nav: sidebar  body bg: rgb(246, 246, 250)  contrast violations: 0
light focus ring on first Tab stop: solid 3px rgb(75, 59, 209)
dark   320px  horizontal scroll: no  nav: top strip  body bg: rgb(10, 12, 18)  contrast violations: 0
dark   768px  horizontal scroll: no  nav: top strip  body bg: rgb(10, 12, 18)  contrast violations: 0
dark  1280px  horizontal scroll: no  nav: sidebar  body bg: rgb(10, 12, 18)  contrast violations: 0
dark  focus ring on first Tab stop: solid 3px rgb(179, 171, 255)`,
        pitfalls: [
          "Naming tokens after values (--purple-500) instead of roles (--color-accent): dark mode then needs every component changed",
          "Reusing the light accent as the dark focus ring, which can drop below 3:1 against a dark background",
        ],
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
