import type { Lesson } from "../../types";

export const lesson: Lesson = {
  id: "3.2.1",
  title: "Box model, flexbox and grid",
  minutes: 70,
  level: "Beginner",
  prerequisites: ["3.1.1 Semantic HTML and accessibility"],
  summary: "Understand how CSS sizes and places boxes, use normal flow, flexbox and grid for the layout each is good at, and build responsive pages with media queries, container queries and a handful of habits that prevent overflow.",
  terms: [
    { term: "Box model", def: "Every element is a box with four layers: content, padding, border and margin. Width and height normally size the content only; `box-sizing: border-box` makes them include padding and border." },
    { term: "Cascade and specificity", def: "Rules for which declaration wins: importance and origin first, then specificity (inline > id > class > element), then source order. `@layer` adds explicit ordering between groups." },
    { term: "Normal flow", def: "The default layout: block boxes stack vertically, inline boxes run along a line and wrap at spaces, and margins can collapse between blocks. Every other layout starts from this." },
    { term: "Block and inline", def: "Block boxes take the full available width and start a new line (`div`, `p`, `section`). Inline boxes sit in a line and only take the width of their content (`span`, `a`, `strong`)." },
    { term: "Flexbox", def: "Layout along one axis, a row or a column. The container distributes free space and aligns items; the layout is driven by the content and the space available." },
    { term: "Main axis and cross axis", def: "The main axis is the direction items flow (`flex-direction`); the cross axis is perpendicular. `justify-content` works on the main axis, `align-items` on the cross axis." },
    { term: "flex: grow shrink basis", def: "The shorthand that sets how an item grows into free space, shrinks when space is short, and what size it starts from, e.g. `flex: 1 1 200px`." },
    { term: "Grid", def: "Layout in rows and columns at the same time. You define tracks and optionally named areas, then place items into cells; the layout is driven by the grid you declare." },
    { term: "fr and minmax()", def: "`fr` is a share of the free space in a grid container. `minmax(16rem, 1fr)` makes a track at least 16rem and then lets it take its share." },
    { term: "Responsive design", def: "Layouts that adapt to viewport size, container size and user settings, typically mobile-first with media queries, container queries and fluid units." },
    { term: "Stacking context", def: "A local layering scope. `z-index` only competes among siblings inside the same stacking context; `position` plus `z-index`, `transform`, `opacity` or `filter` can create one." },
    { term: "Container query", def: "`@container` styles a component based on the size of its nearest container (`container-type: inline-size`), not the whole viewport." },
  ],
  problem: [
    "The DevAtlas dashboard looks fine on the designer's 27-inch monitor. On a phone the cards overflow horizontally, the sidebar covers the content, and a long lesson title pushes a button off-screen. Someone 'fixes' it with negative margins and `position: absolute`, which breaks it on tablets. The code is not obviously wrong: a card is 300px wide, the padding is 20px, the border is 4px, and everyone assumes it occupies 300px. Its used outer width is 348px, because the default `content-box` adds padding and border on top of the width. One card is already wider than a 320px phone, and three of them plus gaps overflow any narrow layout, so the page scrolls sideways.",
    "The rest of the bug is the same story at a different level: a flex child refuses to shrink below the longest word it contains, an implicit grid column grows to the widest item, and a `z-index` that looked fine on one page loses to a transformed ancestor on another. Modern CSS (normal flow, flexbox, grid, `clamp`, container queries) makes robust layouts short and predictable, but only if you know which box is sizing which. This lesson builds that model from the box outward, and replaces the hack cycle with a small set of decisions you can defend.",
  ],
  concept: {
    analogy: [
      "**Flexbox** is arranging books on **one shelf**: you decide spacing and alignment along the shelf, and whether they wrap to the next shelf. **Grid** is a **spreadsheet or a city map**: you define rows and columns first, then place items into cells or named areas.",
      "**Normal flow** is a stack of papers on a desk: each block is placed under the previous one in the order it appears, and inline text flows along a line until it runs out of room. Flexbox and grid do not replace that desk; they put a framework on top of it for one shelf or for the whole grid of pigeonholes. `position: absolute` takes a paper out of the stack and pins it to a coordinate system you chose, which is powerful and exactly why it is a poor default.",
    ],
    precise: [
      "**Box model**: an element's rendered box is content, padding, border and margin. With the default `content-box`, `width: 300px; padding: 20px; border: 4px` occupies 300 + 2×20 + 2×4 = 348px, and margin sits outside that. With `box-sizing: border-box`, the same declarations occupy 300px: the content box shrinks to 300 − 40 − 8 = 252px. A global reset (`*, *::before, *::after { box-sizing: border-box; }`) makes every `width` a promise about the outer box. In normal flow, block-level boxes take the available inline size and stack; inline boxes stay on the line and wrap at spaces; vertical margins between adjacent blocks may collapse to the larger one.",
      "**Flexbox**: `display: flex` lays children out along the main axis set by `flex-direction`. `justify-content` distributes space on the main axis (`flex-start`, `center`, `space-between`, `space-around`, `space-evenly`), `align-items` aligns on the cross axis (`stretch` by default), and `gap` spaces items without margin hacks. `flex: 1 1 200px` means grow 1, shrink 1, basis 200px. Grow distributes positive free space by grow factor; shrink removes a deficit weighted by `shrink × basis`, so wide items give up more. Items default to `min-width: auto` and will not shrink below their min-content width; `min-width: 0` (and `overflow-wrap: anywhere` on long text) lets them.",
      "**Grid**: `display: grid` defines rows and columns together. Tracks can be fixed (`200px`), fractional (`1fr`, a share of the space left after minimums and gaps), or flexible (`minmax(16rem, 1fr)`). `repeat(auto-fit, minmax(min(16rem, 100%), 1fr))` creates as many columns as fit; `auto-fill` keeps empty tracks, `auto-fit` collapses them so the remaining items stretch. `grid-template-areas` names regions (`\"sidebar header\" \"sidebar main\"`) that items claim with `grid-area`, which makes a page shell readable and reorderable. `grid-auto-rows` and implicit tracks handle items you did not place.",
      "**Responsive**: start with the narrow layout, then add `@media (min-width: …)` as space appears; use `rem` for type, `clamp(min, preferred, max)` for fluid type and spacing, `dvh` for mobile viewport height, and `aspect-ratio` to reserve media space. When a component must adapt to the slot it is dropped into rather than the viewport, declare `container-type: inline-size` on its wrapper and use `@container (min-width: …)`. Use media queries for the page shell, container queries for reusable components. Position (`relative`, `absolute`, `fixed`, `sticky`) is for overlays and pinned UI, not for the main layout.",
    ],
  },
  underTheHood: {
    text: [
      "1. **Rendering pipeline.** The browser parses HTML into a DOM and CSS into a CSSOM, combines them into a render tree, then runs **layout** (also called reflow) to compute each box's size and position, **paint** to fill pixels, and **composite** to put layers on screen. A change to width, padding, border, flex-basis or font size invalidates layout; a change to `transform` or `opacity` can often be handled during composite, which is why smooth animation avoids layout properties. `contain: layout` or `content-visibility` lets the browser skip work for off-screen or self-contained subtrees. Layout instability is also what Core Web Vitals measures as CLS: if an image or ad has no reserved space, the browser lays out the page twice and content jumps.",
      "2. **Normal flow is the baseline.** Block-level boxes (a `div`, `p`, `section`, `li`) take the available inline size and stack vertically. Inline boxes (`span`, `a`, `strong`) sit on a line, take their content width, and wrap at spaces; `inline-block` sits on a line but accepts width and height. Adjacent vertical margins between blocks collapse to the larger margin, which surprises people who expect 20px + 20px = 40px. Floats and absolutely positioned boxes take themselves out of this flow. A new **block formatting context** (created by `display: flow-root`, `overflow: auto`, or a flex/grid container) contains its children and stops margins escaping. Logical properties (`margin-inline`, `padding-block`) follow writing direction, so Arabic or vertical Japanese layouts do not need a second stylesheet.",
      "3. **The cascade decides which declaration wins.** Origin and importance first, then specificity (inline style > id > class/attribute/pseudo-class > element), then source order. `#nav a` (1 id, 1 element) beats `.nav .link` (2 classes) beats `a` (1 element). `@layer base, components, utilities;` groups rules so a later layer wins regardless of specificity inside earlier layers, which is how modern resets and utility frameworks coexist. Inheritance matters for text properties (`color`, `font`, `line-height`) but not for box dimensions. Keep specificity flat (single classes) and reserve `!important` for genuinely exceptional utilities.",
      "4. **How flexbox resolves a row.** Each item starts from its flex base size: `flex-basis` if set, otherwise its main size, otherwise its content size. The container sums bases plus gaps and compares with its content box to get free space. Positive free space is distributed by `flex-grow`; negative space is removed in proportion to `flex-shrink × base size`. Each result is clamped by `min-width`/`max-width` (or the block-axis equivalents), which can create a new round of redistribution. Items then align on the cross axis (`align-items`, `align-self`), and `align-content` distributes wrapped lines. `flex-wrap: wrap` turns one line into many; without it, the row shrinks or overflows. The default `min-width: auto` resolves to min-content, which is why long unbroken text and `<pre>` blocks are the usual overflow culprits.",
      "5. **How grid sizes tracks.** Explicit tracks come from `grid-template-rows/columns`; items outside them create implicit tracks sized by `grid-auto-rows/columns`. `1fr` is not \"one equal column\": after fixed tracks, minimums and gaps are subtracted, the remaining space is shared by the fr values, and a track never shrinks below its automatic minimum unless you write `minmax(0, 1fr)`. `minmax(16rem, 1fr)` therefore means \"at least 16rem, then share\" and is the basis of the responsive card grid. `auto-fill` creates as many tracks as fit and leaves empty ones; `auto-fit` collapses empty tracks, so fewer items become wider. `grid-auto-flow: dense` backfills holes at the cost of visual order, and `grid-template-areas` is the most readable way to describe a page shell.",
      "6. **Positioning and stacking.** `position: static` is normal flow. `relative` offsets the box visually but leaves its original space; `absolute` removes it from flow and positions it against the nearest positioned ancestor (or the initial containing block); `fixed` positions against the viewport unless a transformed ancestor becomes its containing block; `sticky` behaves like relative until a scroll threshold, then sticks within its scroll container. `z-index` applies only to positioned or flex/grid items, and only compares siblings inside the same **stacking context**. A `transform`, `opacity` below 1, `filter`, `will-change` or `isolation: isolate` creates a new context, so a child with `z-index: 9999` cannot escape an ancestor that sits below another context. Paint order is roughly backgrounds, negative z-index children, block boxes, floats, inline content, positive z-index children.",
      "7. **Responsive is a strategy, not a breakpoint list.** Mobile-first means the base CSS is the narrow layout and `min-width` media queries add complexity only when there is room. Choose breakpoints where the content breaks, not where a popular device sits; a 900px breakpoint is a guess until you test 320, 375, 768, 1024, 1280 and 1600. `clamp(1rem, 0.6rem + 1.5vw, 2rem)` grows spacing with the viewport but stops at both ends. A container query is the component-level equivalent: `container-type: inline-size` makes the wrapper a query container, then `@container (min-width: 32rem)` changes the card's internal grid based on the slot it received. Container queries require size containment, so the container's size must not depend on its contents in the queried axis.",
      "8. **Debug layout with measurements, not guesses.** DevTools' Layout panel overlays margins, borders, padding and content; the Computed panel shows the used width after the cascade; `outline: 1px solid red` on a suspect element is less destructive than adding borders that change layout. For horizontal overflow, compare `document.documentElement.scrollWidth` with `clientWidth`, then walk down to the widest element. Test 320px width, 200% zoom, a long unbroken URL, a long German compound noun, and a `<pre>` with a 120-character line. If a flex or grid child contains scrollable content, give it `min-width: 0` and put `overflow-x: auto` on the scroller, not on the page. These checks are what the `check.mjs` script in the intermediate homework automates; its output in this lesson is real, while any screenshot you take is your own evidence.",
    ],
    diagram: {
      title: "Box model (border-box)",
      nodes: [
        { label: "margin", sub: "outside, transparent" },
        { label: "border", sub: "inside the width" },
        { label: "padding", sub: "inside the border" },
        { label: "content", sub: "what is left of width" },
      ],
      edges: ["", "", ""],
      caption: "With `border-box`, width and height include padding and border; margin is always outside. The arithmetic in this lesson is CSS, not a rendered screenshot.",
    },
  },
  handsOn: [
    {
      title: "Start from a base that makes boxes predictable",
      text: [
        "The reset below is the one the rest of this lesson assumes: `border-box` on every element and pseudo-element, a fluid `--space` token, a dark-mode branch, and `img { max-width: 100% }`. With `border-box`, a card declared `width: 300px` with `padding: 20px` and `border: 4px` occupies 300px. With the default `content-box` the same declarations occupy 300 + 2×20 + 2×4 = 348px, and the content area is only 300px wide. The card does not know it is overflowing; only the parent does.",
        "Everything in this step is a claim about CSS arithmetic and cascade order. No browser was rendered for it, so treat any description of how it looks as illustrative. The measurable claim is the arithmetic: 348px versus 300px, and the fact that margin is outside both.",
      ],
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
      notes: [
        "`box-sizing` is inherited, so setting it on `*` covers elements you add later; pseudo-elements need the separate `*::before, *::after` selectors.",
        "Margin never counts toward the width, even with `border-box`. If a 300px box also has `margin: 20px`, it reserves 340px in its parent's line.",
        "`--space` uses `clamp(min, preferred, max)`: it grows with the viewport but never below 1rem or above 2rem. Resize the text size in the browser settings to see why `rem` matters; that is an illustrative check, not output we captured here.",
      ],
    },
    {
      title: "Lint a broken stylesheet, then the fixed one",
      text: [
        "Save the three files below in one folder and run stylelint 17.16.0 from that folder. `bad.css` repeats `width` and `padding`, mixes a longhand with a later shorthand, writes `0px`, uses a redundant four-value radius, misspells `box-sizing`, reaches for `!important`, contains an invalid hex colour, orders selectors from higher to lower specificity, and leaves an empty block. Each one is a real layout or cascade bug waiting to happen, and none needs a browser to detect.",
        "This is **real output**, captured on Windows with Node 24.18.0. The runner prints an absolute path; the directory prefix is trimmed below so the filename and line numbers stay readable. `fixed.css` produced no output and exited 0. Linting proves the declarations are well formed; it does not prove the layout is correct, because it cannot know your container width.",
      ],
      code: {
        lang: "css",
        file: "bad.css + fixed.css + .stylelintrc.json",
        code: `/* file: bad.css: layout smells a linter can catch without a browser */
.card {
  width: 320px;
  padding: 20px;
  width: 280px;
  margin: 0px;
  border-radius: 8px 8px 8px 8px;
  padding-left: 8px;
  padding: 1rem;
  box-sizingg: border-box;
  z-index: 10 !important;
  color: #ff00zz;
}

#app .card a {
  color: rebeccapurple;
}

.card a {
  color: purple;
}

.empty {
}

/* file: fixed.css: same intent, predictable boxes, no lint errors */
*, *::before, *::after { box-sizing: border-box; }

.card {
  width: min(100%, 17.5rem); margin: 0; padding: 1rem;
  border-radius: 0.5rem; overflow-wrap: anywhere;
}

.card a { color: purple; }
#app .card a { color: rebeccapurple; }

/* file: .stylelintrc.json */
{ "rules": {
  "block-no-empty": true, "color-no-invalid-hex": true, "declaration-block-no-duplicate-properties": true,
  "declaration-block-no-shorthand-property-overrides": true, "declaration-no-important": true,
  "length-zero-no-unit": true, "no-descending-specificity": true, "property-no-unknown": true,
  "shorthand-property-no-redundant-values": true
} }`,
      },
      output: `$ npx stylelint bad.css --config .stylelintrc.json --formatter compact
bad.css: line 3, col 3, error - Duplicate property "width" (declaration-block-no-duplicate-properties)
bad.css: line 4, col 3, error - Duplicate property "padding" (declaration-block-no-duplicate-properties)
bad.css: line 6, col 12, error - Disallowed unit (length-zero-no-unit)
bad.css: line 7, col 18, error - Expected "8px 8px 8px 8px" to be "8px" (shorthand-property-no-redundant-values)
bad.css: line 9, col 3, error - Overridden property "padding-left" by shorthand "padding" (declaration-block-no-shorthand-property-overrides)
bad.css: line 10, col 3, error - Unknown property "box-sizingg" (property-no-unknown)
bad.css: line 11, col 15, error - Disallowed !important (declaration-no-important)
bad.css: line 12, col 10, error - Invalid hex color "#ff00zz" (color-no-invalid-hex)
bad.css: line 19, col 1, error - Expected selector ".card a" to come before selector "#app .card a", at line 15 (no-descending-specificity)
bad.css: line 23, col 8, error - Empty block (block-no-empty)
$ npx stylelint fixed.css --config .stylelintrc.json --formatter compact
EXIT=0`,
      notes: [
        "The duplicate `padding` is reported at line 4 because line 9 declares `padding` again; stylelint points at the earlier declaration. The fix is one declaration, not a clever override.",
        "`fixed.css` removes every smell: the universal `border-box` reset, one `width: min(100%, 17.5rem)`, `margin: 0`, one padding, a single radius, `overflow-wrap: anywhere`, lower specificity first, and no empty rule. It still cannot promise the card fits your 900px sidebar; only a layout check can.",
        "What lint cannot see: a flex child with `min-width: auto`, an implicit grid column, a `z-index` trapped in a stacking context, or a `100vw` that includes the scrollbar. Those need the arithmetic and measurement habits in the next steps.",
      ],
    },
    {
      title: "Resolve flex grow and shrink with real numbers",
      text: [
        "The script below applies the flexbox base-size and free-space rules to two concrete rows: three items in a 900px container with a 16px gap, first with positive free space and then with a deficit. Run it with `node resolve.mjs`. This is spec arithmetic, not a rendered layout: it prints the widths CSS should produce, and it is how you can predict a row when you cannot open a browser.",
        "Grow distributes positive free space by each item's grow factor. Shrink is weighted by `shrink × basis`, so a wide item gives up more than a narrow one at the same shrink factor. The line `bases 600px` excludes the gaps; free space is 900 − 600 − 2×16 = 268px.",
      ],
      code: {
        lang: "javascript",
        file: "resolve.mjs",
        code: `// resolve.mjs: flexbox and grid arithmetic from the spec, not a browser render
const report = (label, items, container, gap) => {
  const bases = items.reduce((s, i) => s + i.basis, 0);
  const free = container - bases - gap * (items.length - 1);
  const weight = items.reduce((s, i) => s + (free >= 0 ? i.grow : i.shrink * i.basis), 0);
  console.log(label + ": container " + container + "px, gap " + gap + "px, bases " + bases + "px, free " + free + "px");
  items.forEach((i, n) => {
    const share = free >= 0 ? (free * i.grow) / weight : (free * i.shrink * i.basis) / weight;
    const sign = share < 0 ? "-" : "+";
    console.log("  item " + (n + 1) + " (" + (free >= 0 ? "grow " + i.grow : "shrink " + i.shrink) + "): " +
      i.basis + " " + sign + Math.abs(share).toFixed(1) + " = " + (i.basis + share).toFixed(1) + "px");
  });
};

report("flex grow", [{ basis: 200, grow: 1 }, { basis: 200, grow: 1 }, { basis: 200, grow: 2 }], 900, 16);
report("flex shrink", [{ basis: 400, shrink: 1 }, { basis: 400, shrink: 2 }, { basis: 400, shrink: 1 }], 900, 16);

for (const mode of ["auto-fill", "auto-fit"]) {
  const possible = Math.floor((1000 + 16) / (240 + 16));
  const filled = mode === "auto-fit" ? Math.min(possible, 2) : possible;
  const track = (1000 - 16 * (filled - 1)) / filled;
  console.log("grid " + mode + " at 1000px, 2 items, min 240px: " + possible + " possible columns, " +
    filled + " filled, track " + track.toFixed(1) + "px");
}`,
      },
      output: `$ node resolve.mjs
flex grow: container 900px, gap 16px, bases 600px, free 268px
  item 1 (grow 1): 200 +67.0 = 267.0px
  item 2 (grow 1): 200 +67.0 = 267.0px
  item 3 (grow 2): 200 +134.0 = 334.0px
flex shrink: container 900px, gap 16px, bases 1200px, free -332px
  item 1 (shrink 1): 400 -83.0 = 317.0px
  item 2 (shrink 2): 400 -166.0 = 234.0px
  item 3 (shrink 1): 400 -83.0 = 317.0px
grid auto-fill at 1000px, 2 items, min 240px: 3 possible columns, 3 filled, track 322.7px
grid auto-fit at 1000px, 2 items, min 240px: 3 possible columns, 2 filled, track 492.0px`,
      notes: [
        "This is **real output** from the script as shown, not a browser measurement. It assumes every item can shrink to the computed share. Real flex items default to `min-width: auto`, so an item whose min-content width is larger than its share stops shrinking and the row overflows; that is the bug in the quick check.",
        "The grid lines show why `auto-fit` and `auto-fill` differ only when there are fewer items than tracks. With three or more items at this width they produce the same three tracks; with two, `auto-fill` keeps the empty 322.7px track and `auto-fit` collapses it into two 492px tracks.",
        "`gap` is not free space: it is subtracted before grow and shrink run. That is why adding `gap: 24px` changes the arithmetic even when no item's basis changed.",
      ],
    },
    {
      title: "Compare the layout tools",
      text: [
        "Keep this table beside the decision. It is a text summary, not output from a browser; the widths are the arithmetic from the previous step. The point is to make the default choice obvious before you write any CSS.",
      ],
      code: {
        lang: "text",
        file: "layout-tools.txt",
        code: `BOX SIZING
content-box   width applies to the content only    300px + 2*20 padding + 2*4 border = 348px
border-box    width includes padding and border    300px total; content becomes 252px

NORMAL FLOW
block         full inline size, stacks, starts a new line
inline        content width, stays on the line, wraps at spaces
margin        vertical margins between blocks can collapse to the larger one

FLEXBOX vs GRID
flex          one axis, content-driven, items share free space
grid          rows + columns, layout-driven, tracks and named areas
combine       grid for the page, flex inside each component

GRID REPEAT
auto-fill     3 columns at 1000px, 2 items: keeps the empty track, 322.7px each
auto-fit      3 columns at 1000px, 2 items: collapses it, 492px each

RESPONSIVE
media query   the viewport or a device feature changes the layout
container     the component's own inline size changes its layout`,
      },
      notes: [
        "`justify-content` acts on the main axis and `align-items` on the cross axis. When `flex-direction: column`, the labels swap roles, which is why memorising \"justify is horizontal\" fails on a vertical stack.",
        "The flex-versus-grid line is a rule of thumb, not a law: a one-row list is often clearer as a single-column grid, and a two-column form can be easier in grid even though it is short. Pick the tool that names the structure you mean.",
        "`auto-fit` and `auto-fill` are identical once the item count reaches the track count; the difference appears with fewer items, where `auto-fit` lets the remaining items stretch and `auto-fill` leaves holes.",
      ],
    },
    {
      title: "Choose a layout tool with a decision graph",
      text: [
        "This is an **illustrative** Mermaid diagram, not rendered output: follow it from the top and stop at the first branch that matches. It encodes the heuristics in this lesson. The last branch is the important one for reusable components: if the card should change when it sits in a narrow sidebar but not when the page is narrow, the question is about its slot, so the answer is `container-type: inline-size` plus `@container`, not another media query.",
      ],
      code: {
        lang: "mermaid",
        file: "layout-decision.mmd",
        code: `flowchart TD
  A["One axis or two?"] -->|"one row or one column"| B["Flexbox"]
  A -->|"rows and columns together"| C["Grid"]
  B --> D{"Content must shrink?"}
  D -->|"yes"| E["min-width: 0 and overflow-wrap"]
  D -->|"no"| F["justify-content, align-items, gap"]
  C --> G{"Page regions?"}
  G -->|"yes"| H["grid-template-areas"]
  G -->|"no"| I["repeat auto-fit, minmax"]
  H --> J{"Adapt to its slot?"}
  I --> J
  J -->|"yes"| K["container-type: inline-size, @container"]
  J -->|"no"| L["Media query for the page"]`,
      },
      notes: [
        "The graph is deliberately short. If two branches both seem true, prefer the one that describes the structure you want to read in the CSS six months from now.",
        "Mermaid labels are quoted so `:`, `@` and commas cannot be mistaken for syntax. GitHub renders fenced `mermaid` blocks; the lesson page may render it differently, and that rendering is illustrative.",
        "The whole container-query pattern is `container-type: inline-size` on the wrapper plus `@container (min-width: 32rem) { .lesson-card { grid-template-columns: 8rem 1fr; } }`; the wrapper, not the card, is the query container. Container queries are supported in current major browsers; check caniuse.com if you must support older ones. The fallback is the mobile-first layout plus a media query, which is a fine design rather than a failure.",
      ],
    },
  ],
  companies: [
    "**Design tokens (illustrative):** product teams define colours, spacing, radii and typography as tokens, usually CSS custom properties, shared across web, iOS and Android. A brand change becomes a token change, and components never hardcode a hex value. The capstone in this lesson applies the same idea at a smaller scale.",
    "**Utility-first and component CSS (illustrative):** some teams use utility frameworks such as Tailwind CSS; others use CSS Modules or CSS-in-JS. All of them compile down to the same box model, flexbox and grid, so the fundamentals transfer even when the class names look nothing alike. What differs is the review surface, not the layout engine.",
    "**Core Web Vitals teams (illustrative):** layout shift (CLS) and slow rendering hurt the metrics product teams are measured on. The common fixes are layout habits from this lesson: reserve media space with `aspect-ratio` or `width`/`height` attributes, avoid animating layout properties, and keep fonts from swapping in a way that reflows the page.",
    "**Container-query design systems (illustrative):** a component shipped to many slots cannot assume the viewport tells it how much room it has. Teams wrap such components in `container-type: inline-size` and let the component's internal grid change at its own thresholds, so the same card works in a wide main column and a narrow sidebar.",
    "**DevAtlas dashboard shell (verified in this lesson):** the intermediate homework's `check.mjs` loads the dashboard in Chromium 141 at six widths and measures it. Its first run found horizontal scroll at 320px and 375px because the mobile grid column was implicit and grew to the topbar's min-content width; `grid-template-columns: minmax(0, 1fr)` fixed it. The output shown in that tier is real, and it is the same class of bug as the flex `min-width: auto` case in the quick check.",
  ],
  mistakes: [
    { mistake: "Fixed pixel widths everywhere", why: "Matching a design mock exactly", wrong: "Overflow on small screens and ignored user font settings; a 320px card plus padding no longer fits a 320px phone", fix: "Fluid units, max-width, minmax(), clamp(), rem for type, and min(100%, …) for components" },
    { mistake: "Missing min-width: 0 on flex/grid children", why: "Default min-width: auto resolves to min-content", wrong: "Long words, URLs or code blocks push layouts off-screen while the container insists it has room", fix: "Set min-width: 0 on the shrinking child and overflow-wrap: anywhere on the long text; put overflow-x: auto on the scroller" },
    { mistake: "Using flexbox for 2D page grids", why: "Flexbox is familiar and works for the first row", wrong: "Fragile wrappers, uneven columns and percentage-width hacks that break when content changes", fix: "Grid for rows+columns; flex for one-dimensional groups inside the cells" },
    { mistake: "Escalating specificity and !important", why: "Overriding something quickly", wrong: "Specificity wars; styles impossible to change later, and inline overrides that beat every layer", fix: "Flat, single-class selectors; cascade layers (@layer) for ordering; utilities only where they belong" },
    { mistake: "Animating width, top or left", why: "Simple to write", wrong: "Janky animations because every frame invalidates layout, and on a busy page the main thread cannot keep up", fix: "Animate transform and opacity; reserve layout properties for state changes that must reflow" },
    { mistake: "Adding z-index without a stacking context", why: "It looks like the obvious lever", wrong: "A child with z-index: 9999 still sits below another element because an ancestor with transform or opacity created a context that is lower", fix: "Find the nearest stacking context, keep z-index values small and local, and use isolation: isolate to make a context deliberately" },
    { mistake: "Using position: absolute for the whole page layout", why: "It reproduces the mock exactly at one size", wrong: "The page has no intrinsic height, content overlaps at other widths, and screen readers see a visual order that does not match the DOM", fix: "Normal flow plus grid for the shell; absolute only for overlays, badges and decoration anchored to a positioned parent" },
    { mistake: "Using 100vw for full-width elements", why: "It sounds like the viewport", wrong: "On desktop 100vw includes the scrollbar, so the element is a few pixels too wide and creates horizontal scroll", fix: "Use width: 100% inside a block container, or 100dvw only when you have checked the scrollbar; prefer max-width plus margin-inline: auto" },
    { mistake: "Testing one width with short placeholder text", why: "It looks fine on the developer's monitor", wrong: "The bug appears at 320px, at 200% zoom, with a long German noun or a real 120-character URL", fix: "Test 320, 375, 768, 1024, 1280 and 1600; test 200% zoom; test long content and a <pre>; compare scrollWidth with clientWidth" },
  ],
  bestPractices: [
    { tag: "Maintainability", text: "Start every project with `*, *::before, *::after { box-sizing: border-box; }`, tokens as custom properties, and single-class selectors; components own their styles." },
    { tag: "Performance", text: "Reserve space for media with `aspect-ratio` or `width`/`height` attributes, and animate `transform`/`opacity` rather than layout properties, to keep layout work and CLS down." },
    { tag: "Reliability", text: "Test at 320px width, at 200% zoom, and with long real content (names, translations, URLs, `<pre>` lines); compare `scrollWidth` with `clientWidth` instead of trusting a screenshot." },
    { tag: "Performance", text: "Prefer CSS for layout and simple interactions over JavaScript; a grid template costs one style recalculation, while a resize listener costs a callback on every frame." },
    { tag: "Maintainability", text: "Use `minmax(0, 1fr)` for content columns, `min-width: 0` on flex children that must shrink, and `grid-template-areas` for page shells so the layout reads as a diagram in the source." },
  ],
  interview: [
    { q: "Flexbox vs grid: how do you choose?", a: "Start with the shape of the structure, not with familiarity. Flexbox is one-dimensional: `flex-direction` defines a main axis, `justify-content` distributes space on it, `align-items` aligns on the cross axis, and `flex: grow shrink basis` lets items share whatever space is left. It is content-driven, so it is right for toolbars, button groups, rows of meta information and centring a single child. Grid is two-dimensional: you declare rows and columns, and items are placed into tracks or named areas. It is layout-driven, so it is right for page shells, card galleries, forms and any structure where you want the columns to line up across independent children. In real pages they combine: grid for the shell, flex inside the cells. A useful test is whether the layout should still make sense when one item is removed; if the remaining items should reflow along one axis, flex is natural, and if the grid should stay put, grid is natural. Also mention the cost of the wrong tool: flex used for 2D produces wrapper divs and percentage hacks; grid used for a simple toolbar is harmless but noisier." },
    { q: "Explain the box model and box-sizing, including what normal flow does.", a: "An element's box has content, padding, border and margin. With `content-box`, `width` sizes the content, so `width: 300px; padding: 20px; border: 4px` occupies 348px and the content is 300px. With `border-box`, `width` is the outer content-plus-padding-plus-border size: 300px total and 252px of content. Margin is always outside. That is why almost every codebase starts with `*, *::before, *::after { box-sizing: border-box; }`: it makes a width a promise about the space the box reserves. Normal flow is the default placement: block boxes take the available inline size and stack vertically, inline boxes sit on a line and wrap at spaces, and adjacent vertical margins can collapse. Flex and grid replace flow inside their container, but the container itself still participates in normal flow. `position: absolute` takes a box out of flow and positions it against its containing block, which is useful for overlays and dangerous as a page-layout strategy because the page loses its intrinsic height." },
    { q: "A page scrolls horizontally on a phone. How do you find and fix it?", a: "Measure first: compare `document.documentElement.scrollWidth` with `clientWidth`, then walk the DOM for elements whose `getBoundingClientRect().right` exceeds the viewport, or use DevTools to inspect the widest box. The usual suspects are: a flex or grid child with the default `min-width: auto` that refuses to shrink below a long word or a `<pre>` line; an implicit grid column that grew to its content; a fixed pixel width plus padding under `content-box`; `100vw` including the scrollbar; an absolutely positioned decoration; and negative margins. Fix the cause rather than adding `overflow-x: hidden` to the body, which hides the symptom and often breaks `position: sticky`. Typical fixes: `min-width: 0` on the shrinking child, `minmax(0, 1fr)` for content columns, `min(100%, 30rem)` for widths, `overflow-wrap: anywhere` for long tokens, `overflow-x: auto` on the code block, and `width: 100%` instead of `100vw`. Then re-test at 320px, 375px, 200% zoom and with real long content. If you want this automated, the `check.mjs` pattern in this lesson's homework prints the boolean for each width." },
  ],
  quickCheck: [
    { kind: "output", prompt: "With default box-sizing (content-box), how wide is this box on screen?", code: { lang: "css", code: ".box { width: 200px; padding: 10px; border: 5px solid; margin: 20px; }" }, options: ["200px", "230px", "270px", "220px"], answer: 1, explanation: "200 + 2×10 padding + 2×5 border = 230px (margin is outside the box). With border-box it would be 200px." },
    { kind: "mcq", prompt: "Which creates a responsive card grid without media queries?", options: ["display: flex; flex-wrap: nowrap", "grid-template-columns: repeat(auto-fit, minmax(16rem, 1fr))", "float: left on each card", "position: absolute"], answer: 1, explanation: "auto-fit with minmax creates as many columns as fit, each at least 16rem; auto-fill would create the same tracks but keep empty ones." },
    { kind: "bug", prompt: "A long URL in a flex item pushes the page wider than the phone screen. Most likely fix?", options: ["Add z-index", "Set min-width: 0 on the flex item (and overflow-wrap: anywhere on the text)", "Use float", "Add !important to width"], answer: 1, explanation: "Flex items default to min-width: auto; allow them to shrink and let long words wrap." },
  ],
  cheatSheet: [
    "`*, *::before, *::after { box-sizing: border-box; }` — width includes padding and border, margin never does.",
    "Default content-box: 300px width + 20px padding + 4px border = 348px. Border-box: 300px total, 252px content.",
    "Normal flow: blocks stack and take the inline size; inlines sit on a line and wrap; vertical block margins can collapse.",
    "Flex: one axis. `justify-content` = main, `align-items` = cross, `gap` = spacing, `flex: 1 1 200px` = grow/shrink/basis.",
    "Flex algorithm: subtract bases and gaps, then grow by factor or shrink by `shrink × basis`; clamp with min/max.",
    "Grid: rows + columns. `repeat(auto-fit, minmax(min(16rem, 100%), 1fr))`, `grid-template-areas`, `minmax(0, 1fr)`.",
    "`auto-fill` keeps empty tracks; `auto-fit` collapses them, so fewer items stretch. Same result when tracks are full.",
    "`min-width: 0` on a shrinking flex child; `overflow-wrap: anywhere` on long tokens; `overflow-x: auto` on the scroller.",
    "Mobile-first: base layout, then `@media (min-width: …)`; `clamp()` for fluid type/space; `@container` when the component should react to its slot.",
    "`z-index` competes only within a stacking context (`position`, `transform`, `opacity`, `filter`, `isolation`); animate `transform`/`opacity`, not width/top/left.",
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
      hints: ["Use `grid-template-areas` for the shell, `repeat(auto-fit, minmax(min(14rem, 100%), 1fr))` for the stat cards, and flex with `min-width: 0` inside the topbar and panels."],
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
    { label: "MDN: The box model", url: "https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_box_model" },
    { label: "MDN: Stacking context", url: "https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_positioned_layout/Stacking_context" },
    { label: "web.dev: Learn CSS", url: "https://web.dev/learn/css" },
    { label: "MDN: Container queries", url: "https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_containment/Container_queries" },
  ],
  nextPreview: "Next: browser JavaScript. The DOM, events and fetch: making pages interactive before reaching for a framework.",
};
