import type { Lesson } from "../../types";

export const lesson: Lesson = {
  id: "3.5.1",
  title: "XSS, CORS, CSP and Core Web Vitals",
  minutes: 75,
  level: "Intermediate",
  prerequisites: ["3.3.1 DOM, events and fetch", "0.1.2 HTTP in depth"],
  summary: "Protect users from cross-site scripting with escaping and a Content Security Policy, understand what CORS does and does not protect, store tokens safely, and measure and improve LCP, INP and CLS.",
  terms: [
    { term: "XSS", def: "Cross-site scripting: an attacker gets their JavaScript to run in your users' browsers on your site, so it can steal data or act as the user." },
    { term: "Same-origin policy", def: "The browser rule that scripts from one origin (scheme + host + port) cannot read responses from another origin by default." },
    { term: "CORS", def: "Cross-Origin Resource Sharing: response headers by which a server allows specific other origins to read its responses in the browser." },
    { term: "CSP", def: "Content Security Policy: a response header telling the browser which sources of scripts, styles, images and connections are allowed." },
    { term: "CSRF", def: "Cross-site request forgery: another site makes the user's browser send an authenticated request (with cookies) to your site." },
    { term: "LCP / INP / CLS", def: "Core Web Vitals: Largest Contentful Paint (loading), Interaction to Next Paint (responsiveness), Cumulative Layout Shift (visual stability)." },
  ],
  problem: [
    "A DevAtlas forum feature renders learners' answers as Markdown converted to HTML and inserted with dangerouslySetInnerHTML. Someone posts an answer containing a script that reads tokens from localStorage and sends them to their server. Every visitor who views the thread loses their session.",
    "Meanwhile the API team 'fixes' a CORS error by allowing every origin with credentials, and the marketing team notices the landing page loads in 6 seconds on mobile with the button jumping around. Security and performance are both frontend responsibilities, and both have well-understood defences.",
  ],
  concept: {
    analogy: [
      "XSS is a **forged announcement over your building's PA system**: if anyone can get text read out as an instruction, people will follow it because it came from the trusted speaker. Escaping turns their message into quoted text ('someone said: …'), and CSP is a rule that only the official announcer's microphone works.",
      "CORS is **the browser acting as a careful receptionist** for your users: it only hands a cross-origin response to a page if the other server explicitly said that page may see it. It protects users' data in their browser; it does not stop curl or attackers' servers from calling your API.",
    ],
    precise: [
      "**XSS defences**: encode output by default (React escapes text in JSX), never insert untrusted HTML without a sanitiser (DOMPurify), avoid `eval`/`new Function`/inline event handlers, validate URLs (block `javascript:`), and add a strict CSP as defence in depth.",
      "**CSP**: `Content-Security-Policy: default-src 'self'; script-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'` blocks inline and third-party scripts unless allowed. Start in `Content-Security-Policy-Report-Only` mode to find violations before enforcing.",
      "**CORS**: for a browser request from app.devatlas.dev to api.devatlas.dev, the API must reply `Access-Control-Allow-Origin: https://app.devatlas.dev` (an allow-list, not `*` with credentials). Non-simple requests (JSON POST, custom headers) trigger a **preflight** OPTIONS request first. CORS never replaces authentication or authorisation.",
      "**Tokens**: anything in localStorage is readable by any XSS. Prefer HttpOnly, Secure, SameSite cookies for session/refresh tokens (lesson 4.1.3), and protect state-changing requests against CSRF (SameSite plus CSRF tokens or checking Origin).",
      "**Core Web Vitals thresholds (good)**: LCP ≤ 2.5 s, INP ≤ 200 ms, CLS ≤ 0.1, measured at the 75th percentile of real users.",
    ],
  },
  underTheHood: {
    text: [
      "Browsers parse HTML strings into DOM; a string like `<img src=x onerror=…>` creates an element whose error handler runs script. Text nodes (textContent, JSX text) are never parsed as HTML, which is why escaping by default stops most XSS.",
      "A preflight is an OPTIONS request with `Origin`, `Access-Control-Request-Method` and `Access-Control-Request-Headers`. The server answers with allowed origin, methods, headers and optionally `Access-Control-Max-Age` so the browser can cache the result. If the answer does not allow the request, the browser blocks it before sending the real request.",
      "**LCP** is usually the hero image or heading; it is slowed by slow servers, render-blocking CSS/JS and late-discovered images. **INP** measures the delay from a user interaction to the next frame; long JavaScript tasks are the usual cause. **CLS** sums unexpected layout shifts, typically from images without dimensions, late-loading fonts or injected banners.",
    ],
    diagram: {
      title: "CORS preflight",
      nodes: [
        { label: "app.devatlas.dev", sub: "fetch POST JSON" },
        { label: "OPTIONS (preflight)", sub: "Origin, method, headers" },
        { label: "API", sub: "Allow-Origin: app…" },
        { label: "Real POST", sub: "with cookies if allowed" },
        { label: "Response readable", sub: "by the page" },
      ],
      edges: ["browser", "", "allowed", ""],
    },
  },
  handsOn: [
    {
      title: "Render user Markdown safely",
      code: {
        lang: "tsx",
        file: "src/components/Answer.tsx",
        code: `// npm install marked dompurify
import { marked } from "marked";
import DOMPurify from "dompurify";

export function Answer({ markdown }: { markdown: string }) {
  const unsafeHtml = marked.parse(markdown, { async: false }) as string;
  const safeHtml = DOMPurify.sanitize(unsafeHtml);          // strips scripts, event handlers, javascript: URLs
  return <div className="answer" dangerouslySetInnerHTML={{ __html: safeHtml }} />;
}

// Plain text? No HTML needed at all:
export function Comment({ text }: { text: string }) {
  return <p>{text}</p>;                                      // JSX escapes automatically
}`,
      },
      notes: ["Library APIs evolve: check the marked and DOMPurify docs for your versions. Sanitising on the server as well (or storing sanitised HTML) protects other clients that render the content."],
    },
    {
      title: "Dangerous URLs in links",
      code: {
        lang: "tsx",
        code: `function safeHref(url: string): string | undefined {
  try {
    const u = new URL(url, window.location.origin);
    return u.protocol === "https:" || u.protocol === "http:" ? u.href : undefined;   // blocks javascript:, data:
  } catch {
    return undefined;
  }
}

<a href={safeHref(profile.website)} rel="noopener noreferrer" target="_blank">Website</a>`,
      },
    },
    {
      title: "Security headers (example nginx config for the static frontend)",
      code: {
        lang: "text",
        file: "nginx.conf (excerpt)",
        code: `add_header Content-Security-Policy "default-src 'self'; script-src 'self'; style-src 'self' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' data: https:; connect-src 'self' https://api.devatlas.dev; object-src 'none'; base-uri 'self'; frame-ancestors 'none'" always;
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
add_header X-Content-Type-Options "nosniff" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
add_header Permissions-Policy "camera=(), microphone=(), geolocation=()" always;`,
      },
      notes: ["Tailor the CSP to what your app really loads. Roll it out with Content-Security-Policy-Report-Only first and watch the browser console or a report endpoint for violations."],
    },
    {
      title: "CORS on the API (ASP.NET Core example)",
      code: {
        lang: "csharp",
        file: "Program.cs",
        code: `builder.Services.AddCors(options =>
{
    options.AddPolicy("frontend", policy => policy
        .WithOrigins("https://app.devatlas.dev", "http://localhost:5173")   // explicit allow-list
        .WithMethods("GET", "POST", "PUT", "DELETE")
        .WithHeaders("Content-Type", "Authorization")
        .AllowCredentials());                                              // never with AllowAnyOrigin
});

var app = builder.Build();
app.UseCors("frontend");`,
      },
    },
    {
      title: "Measure Core Web Vitals from real users",
      code: {
        lang: "typescript",
        file: "src/vitals.ts",
        code: `// npm install web-vitals
import { onCLS, onINP, onLCP, type Metric } from "web-vitals";

function send(metric: Metric) {
  const body = JSON.stringify({ name: metric.name, value: metric.value, rating: metric.rating, page: location.pathname });
  navigator.sendBeacon?.("/api/vitals", body) || fetch("/api/vitals", { method: "POST", body, keepalive: true });
}

onLCP(send);
onINP(send);
onCLS(send);`,
      },
    },
    {
      title: "Typical fixes for each vital",
      code: {
        lang: "html",
        code: `<!-- LCP: discover the hero image early, and do not lazy-load it -->
<link rel="preload" as="image" href="/hero.avif" fetchpriority="high">
<img src="/hero.avif" alt="DevAtlas dashboard" width="1200" height="630" fetchpriority="high">

<!-- CLS: reserve space with width/height (or CSS aspect-ratio); lazy-load below-the-fold images -->
<img src="/chart.png" alt="Weekly progress chart" width="800" height="400" loading="lazy">

<!-- Fonts: avoid invisible text and big shifts -->
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>

<!-- INP: break up long tasks in JS, e.g.
     await scheduler.yield?.()  or  await new Promise(r => setTimeout(r, 0))  between chunks of work -->`,
      },
    },
  ],
  companies: [
    "**Security headers are audited**: tools like Mozilla Observatory and security scanners in CI check CSP, HSTS and friends; enterprise customers' security questionnaires ask about XSS and CSRF defences.",
    "**Bug bounties**: XSS is among the most frequently reported vulnerability classes on bug bounty platforms; companies pay researchers to find them, which shows how common they still are.",
    "**Performance as a product metric**: e-commerce and media companies publish case studies linking faster LCP and lower INP to higher conversion and engagement, and track Web Vitals from real users in dashboards.",
  ],
  mistakes: [
    { mistake: "dangerouslySetInnerHTML with unsanitised input", why: "Rendering Markdown or rich text quickly", wrong: "Stored XSS affecting every viewer", fix: "Sanitise with DOMPurify (ideally also server-side); prefer plain text" },
    { mistake: "Access-Control-Allow-Origin: * with credentials, or reflecting any Origin", why: "Making the CORS error go away", wrong: "Any website can read authenticated responses for your users", fix: "Explicit origin allow-list; credentials only for trusted origins" },
    { mistake: "Treating CORS as API security", why: "Misunderstanding what it protects", wrong: "APIs left without auth because 'CORS blocks other sites'", fix: "Authenticate and authorise every request server-side" },
    { mistake: "Tokens in localStorage", why: "Easy to read from JS", wrong: "Any XSS steals long-lived tokens", fix: "HttpOnly Secure SameSite cookies for refresh/session tokens; short-lived access tokens in memory" },
    { mistake: "Images without dimensions and lazy-loading the LCP image", why: "Applying loading=lazy everywhere", wrong: "Layout shifts and slow LCP", fix: "Width/height on all images; eager + high priority for the hero image" },
  ],
  bestPractices: [
    { tag: "Security", text: "Escape by default, sanitise any HTML, strict CSP (report-only first), validate URLs, no eval." },
    { tag: "Security", text: "CORS allow-lists per environment; HttpOnly cookies; CSRF protection on state-changing requests." },
    { tag: "Performance", text: "Track LCP, INP and CLS from real users; set budgets and alert on regressions." },
    { tag: "Performance", text: "Preload the LCP resource, reserve space for media, split long JavaScript tasks." },
  ],
  interview: [
    { q: "What is XSS and how do you prevent it?", a: "Untrusted input executed as script in your page. Prevent it with context-aware output encoding (frameworks escape by default), never inserting untrusted HTML without a sanitiser, validating URLs, avoiding eval and inline handlers, and adding a CSP that blocks inline and third-party scripts. HttpOnly cookies limit what a successful XSS can steal." },
    { q: "What does CORS protect against?", a: "It relaxes the browser's same-origin policy in a controlled way: a page from origin A can read responses from origin B only if B allows A. It protects users' data in their browsers from malicious sites. It does not protect the server from direct requests, so APIs still need authentication and authorisation." },
    { q: "How would you improve a poor LCP?", a: "Find the LCP element (Lighthouse or DevTools Performance). Reduce server response time (caching, CDN), remove render-blocking resources, preload and prioritise the LCP image/font, serve modern image formats at the right size, and avoid client-side rendering delays for above-the-fold content." },
  ],
  quickCheck: [
    {
      kind: "mcq",
      prompt: "Which line is vulnerable to XSS if `bio` comes from users?",
      options: ["<p>{bio}</p>", "el.textContent = bio", "<div dangerouslySetInnerHTML={{ __html: bio }} />", "console.log(bio)"],
      answer: 2,
      explanation: "It inserts raw HTML. The JSX text and textContent versions are escaped.",
    },
    {
      kind: "mcq",
      prompt: "Your API has no authentication but only allows CORS from your frontend's origin. Is it protected?",
      options: ["Yes, CORS blocks everyone else", "No: CORS is enforced by browsers only; scripts and servers can call it directly", "Yes, if HTTPS is used", "Only for GET requests"],
      answer: 1,
      explanation: "CORS is not access control for the server. Add authentication and authorisation.",
    },
    {
      kind: "bug",
      prompt: "The page's CLS is 0.35. What is the most likely culprit?",
      code: { lang: "html", code: "<h1>Welcome back</h1>\n<img src=\"/banner.jpg\" alt=\"Course banner\">\n<button>Continue lesson</button>" },
      options: ["The h1 tag", "The image has no width/height, so content jumps when it loads", "The button text", "alt text"],
      answer: 1,
      explanation: "Without reserved space, the button moves down when the image loads. Add width and height (or aspect-ratio).",
    },
  ],
  cheatSheet: [
    "Escape by default; sanitise HTML (DOMPurify); validate URLs; no eval.",
    "CSP: default-src 'self'; script-src 'self'; object-src 'none'. Report-only first.",
    "CORS = browser read permission, not server security. Allow-list origins.",
    "Preflight: OPTIONS before non-simple requests.",
    "Tokens: HttpOnly Secure SameSite cookies; CSRF protection.",
    "Good vitals: LCP ≤ 2.5 s, INP ≤ 200 ms, CLS ≤ 0.1 (p75).",
    "Preload LCP image; width/height on images; split long tasks.",
  ],
  homework: {
    basic: {
      title: "Find and fix three XSS bugs",
      brief: ["Review this component and fix every XSS risk: it renders a username with innerHTML in an effect, a profile link from user data in href, and a comment with dangerouslySetInnerHTML."],
      criteria: ["All three fixed", "Explanation of the attack for each", "No functionality lost (comments still support basic formatting)"],
      hints: ["javascript: URLs execute when clicked."],
      solution: {
        text: ["(1) Render the username as JSX text. (2) Validate the URL protocol (http/https only). (3) Sanitise the comment HTML with DOMPurify, or render Markdown to sanitised HTML."],
        code: {
          lang: "tsx",
          code: `import DOMPurify from "dompurify";

function safeHref(url: string) {
  try { const u = new URL(url); return ["http:", "https:"].includes(u.protocol) ? u.href : undefined; }
  catch { return undefined; }
}

export function Profile({ user }: { user: { name: string; website: string; commentHtml: string } }) {
  return (
    <section>
      <h2>{user.name}</h2>                                                  {/* (1) escaped text */}
      <a href={safeHref(user.website)} rel="noopener noreferrer">Website</a>  {/* (2) no javascript: */}
      <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(user.commentHtml) }} /> {/* (3) */}
    </section>
  );
}`,
        },
      },
    },
    intermediate: {
      title: "Write and test a CSP",
      brief: ["Serve the DevAtlas frontend build with a CSP in report-only mode, fix violations (inline scripts/styles, third-party fonts), then enforce it. Confirm an injected inline script is blocked."],
      criteria: ["No violations in normal use", "Enforced header in place", "Proof that an inline <script> is blocked (console error)"],
      hints: ["Vite production builds avoid inline scripts by default; check third-party embeds."],
      solution: {
        text: [
          "Start in Content-Security-Policy-Report-Only with a strict policy: the browser reports what would be blocked but still runs it, so nothing breaks while you look. On this build the only violation was the small inline theme script in index.html (the no-flash script from 3.2.1). Vite's own output is an external module script, so it is covered by 'self'.",
          "Fix it without 'unsafe-inline': the server hashes each inline <script> in dist/index.html at startup and adds 'sha256-…' to script-src, so the policy always matches the build (the same hash can be pasted into the nginx add_header line from the hands-on). Typical other fixes: for Google Fonts add https://fonts.googleapis.com to style-src and https://fonts.gstatic.com to font-src; for analytics add its origin to script-src and connect-src; replace inline style attributes set by libraries or use nonces. Then switch the header name to Content-Security-Policy.",
          "check-csp.mjs serves the real build three times and drives it in Chromium 141. (1) Report-only without the hash: the app works and one script-src-elem violation for the inline script is reported (the server also received it at /csp-report). (2) With the hash: no violations in normal use, including clicking 'Mark complete'. (3) Enforced, with a script injected the way an XSS payload would be: it does not run and Chrome logs the 'Refused to execute inline script' error.",
        ],
        code: {
          lang: "javascript",
          file: "server.mjs + check-csp.mjs (+ inline script in index.html)",
          code: `// file: index.html (inside <head>, the only inline script)
// <script>try { const t = localStorage.getItem("theme"); if (t) document.documentElement.dataset.theme = t; } catch {}</script>

// file: server.mjs
// Serves the Vite build (dist/) with a Content-Security-Policy.
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import http from "node:http";
import path from "node:path";

const DIST = path.resolve("dist");
const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".json": "application/json" };

// Hash every inline <script> in index.html so the policy matches the build without 'unsafe-inline'
async function inlineScriptHashes() {
  const html = await readFile(path.join(DIST, "index.html"), "utf8");
  return [...html.matchAll(/<script>([\\s\\S]*?)<\\/script>/g)]
    .map((m) => \`'sha256-\${createHash("sha256").update(m[1]).digest("base64")}'\`);
}

export async function startServer({ port = 8080, enforce = false, hashInline = true } = {}) {
  const hashes = hashInline ? await inlineScriptHashes() : [];
  const policy = [
    "default-src 'self'",
    \`script-src 'self' \${hashes.join(" ")}\`.trim(),
    "style-src 'self'",
    "img-src 'self' data:",
    "connect-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "frame-ancestors 'none'",
    "form-action 'self'",
    "report-uri /csp-report",
  ].join("; ");
  const header = enforce ? "Content-Security-Policy" : "Content-Security-Policy-Report-Only";

  const server = http.createServer(async (req, res) => {
    if (req.method === "POST" && req.url === "/csp-report") {      // violation reports from browsers
      let body = "";
      for await (const chunk of req) body += chunk;
      console.error("CSP report:", body.slice(0, 500));
      return res.writeHead(204).end();
    }
    const urlPath = decodeURIComponent(new URL(req.url ?? "/", "http://x").pathname);
    let file = path.join(DIST, urlPath);
    if (!file.startsWith(DIST)) return res.writeHead(400).end();      // no path traversal
    if (!path.extname(file)) file = path.join(DIST, "index.html");   // SPA fallback
    try {
      const body = await readFile(file);
      res.writeHead(200, {
        "Content-Type": TYPES[path.extname(file)] ?? "application/octet-stream",
        [header]: policy,
        "X-Content-Type-Options": "nosniff",
      });
      res.end(body);
    } catch {
      res.writeHead(404).end("Not found");
    }
  });
  await new Promise((resolve) => server.listen(port, resolve));
  return { server, policy, header };
}

if (import.meta.url === \`file://\${process.argv[1]}\`) {
  const { header, policy } = await startServer({ enforce: process.env.CSP_ENFORCE === "1" });
  console.log(\`http://localhost:8080\\n\${header}: \${policy}\`);
}

// file: check-csp.mjs
// CHROME_PATH=/path/to/chrome node check-csp.mjs   (after npm run build)
import { chromium } from "playwright-core";
import { startServer } from "./server.mjs";

const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH });

async function visit(label, options, attack = false) {
  const { server, header } = await startServer({ port: 8081, ...options });
  const page = await browser.newPage();
  const messages = [];
  page.on("console", (m) => { if (m.type() === "error" || m.type() === "warning") messages.push(m.text()); });
  await page.addInitScript(() => {
    window.__violations = [];
    document.addEventListener("securitypolicyviolation", (e) => window.__violations.push(\`\${e.effectiveDirective} blocked \${e.blockedURI}\`));
  });
  await page.goto("http://localhost:8081/");
  await page.getByRole("button", { name: "Mark complete" }).first().click();       // normal use
  if (attack) {
    await page.evaluate(() => {                                                    // simulate an injected script
      const s = document.createElement("script");
      s.textContent = "window.__pwned = true";
      document.body.append(s);
    });
  }
  await page.waitForTimeout(300);
  const violations = await page.evaluate(() => window.__violations);
  const pwned = await page.evaluate(() => window.__pwned === true);
  console.log(\`\\n[\${label}] \${header}\`);
  console.log(\`  app rendered: \${await page.getByText("1 of 3 completed").isVisible()}  violations: \${violations.length ? violations.join("; ") : "none"}\`);
  if (attack) console.log(\`  injected script ran: \${pwned}\`);
  for (const m of messages.filter((t) => !t.startsWith("Failed to load resource"))) console.log(\`  console: \${m}\`);   // skip favicon 404
  await page.close();
  server.close();
}

await visit("1. report-only, no hash", { enforce: false, hashInline: false });
await visit("2. report-only, inline theme script hashed", { enforce: false, hashInline: true });
await visit("3. enforced, plus an injected inline script", { enforce: true, hashInline: true }, true);
await browser.close();`,
        },
        output: `$ node check-csp.mjs
[1. report-only, no hash] Content-Security-Policy-Report-Only
  app rendered: true  violations: script-src-elem blocked inline

[2. report-only, inline theme script hashed] Content-Security-Policy-Report-Only
  app rendered: true  violations: none

[3. enforced, plus an injected inline script] Content-Security-Policy
  app rendered: true  violations: script-src-elem blocked inline
  injected script ran: false
  console: Refused to execute inline script because it violates the following Content Security Policy directive: "script-src 'self' 'sha256-bdyznYulzSGHB3rRO5uV1nvlyFAP4xEFMksag9Ti9zA='". Either the 'unsafe-inline' keyword, a hash ('sha256-p9P13V/N9ceuJE9MsaJmuDIuVOyygVMmpOdZFG+Zcvs='), or a nonce ('nonce-...') is required to enable inline execution.`,
        pitfalls: [
          "Adding 'unsafe-inline' to script-src to silence the report: it re-enables exactly the injected scripts CSP is meant to stop",
          "Hard-coding the hash: any edit to the inline script breaks it; compute it from the build",
          "Report-only forever: it protects nobody until the header is switched to enforcing",
        ],
      },
    },
    challenge: {
      title: "Web Vitals audit and fixes",
      brief: ["Run Lighthouse (mobile) and collect field data with web-vitals on your DevAtlas pages. Fix the worst metric and document before/after numbers with the specific change that caused the improvement."],
      criteria: ["Before/after Lighthouse and RUM numbers", "Root cause identified", "One change per measurable improvement"],
      hints: ["Lab data (Lighthouse) and field data (real users) can disagree; explain why."],
      solution: {
        text: [
          "Method: a demo landing page (v0) with the classic problems, a 3.4 MB PNG hero loaded with loading=lazy and no dimensions, plus a promo banner injected 800 ms after load. I measured Lighthouse 13.5 mobile (devtools throttling, Chromium 141, two runs each) after each single change, so every improvement is tied to one edit. The change list below is the exact diff between v0 and v5; v1 to v5 each add one of these edits.",
          "Root causes. LCP: the hero is the LCP element, it is a huge PNG, and lazy-loading delays discovery. CLS: the image has no width/height, and the banner is inserted above the heading with no reserved space. Fixes in order: (1) resize and re-encode the hero as WebP (3.4 MB to 0.36 MB): LCP 19.4 s to 3.2 s. (2) width/height on the img: CLS 0.076 to 0.046. (3) drop loading=lazy, add fetchpriority=high: no measurable change on this tiny page (LCP stayed 3.2 s), so keep it only because it is correct for an LCP image. (4) reserve 4.5rem for the banner slot: CLS 0.046 to 0. (5) srcset/sizes with an 800 px variant for phones: LCP 3.2 s to 2.0 s, performance 93 to 99.",
          "Honest limits. These are lab numbers from a local server on a simulated slow phone; the page is synthetic. The web-vitals snippet from the hands-on is on the page and posts beacons that the server logs (I saw LCP, INP and CLS lines arrive), but I did not complete a scripted field run, so there are no RUM p75 numbers here. In a real audit, collect field data first and prioritise by p75; lab and field can disagree because field users have different devices, caches and networks.",
        ],
        code: {
          lang: "html",
          file: "v0.html to v5.html (diff) + lighthouse commands",
          code: `<!-- file: v5.html (final page) -->
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="description" content="DevAtlas landing page">
  <title>DevAtlas</title>
  <style>
    body { margin: 0; font: 1rem/1.6 system-ui, sans-serif; color: #13141c; }
    main { max-width: 60rem; margin: auto; padding: 1rem; }
    .hero { width: 100%; height: auto; display: block; }
    .promo { background: #fff4c2; padding: 1rem; }
    .promo-slot { min-height: 4.5rem; } .promo { margin: 0; box-sizing: border-box; height: 4.5rem; }
  </style>
</head>
<body>
  <main>
    <div id="promo-slot" class="promo-slot"></div>
    <h1>Learn full-stack, AI and DevOps engineering</h1>
    <img class="hero" src="hero-1200.webp" srcset="hero-800.webp 800w, hero-1200.webp 1200w" sizes="(max-width: 60rem) calc(100vw - 2rem), 58rem" alt="DevAtlas dashboard showing lesson progress" width="1200" height="675" fetchpriority="high">
    <p>Structured lessons with hands-on projects, quizzes and a capstone in every phase.</p>
    <a href="/signup">Start learning</a>
  </main>
  <script type="module">
    import { onCLS, onINP, onLCP } from "./web-vitals.js";
    const send = (m) => navigator.sendBeacon("/api/vitals", JSON.stringify({ name: m.name, value: m.value, rating: m.rating, page: location.pathname }));
    onLCP(send); onINP(send); onCLS(send);
    // Promo banner arrives after a (simulated) API call
    setTimeout(() => {
      const p = Object.assign(document.createElement("p"), { className: "promo", textContent: "Phase 3 is live: React, CSS and web security." });
      document.querySelector("#promo-slot").append(p);
    }, 800);
  </script>
</body>
</html>

# diff v0.html v5.html (the five changes)
13c13
<     /*SLOT:css*/
---
>     .promo-slot { min-height: 4.5rem; } .promo { margin: 0; box-sizing: border-box; height: 4.5rem; }
20c20
<     <img class="hero" src="hero.png" alt="DevAtlas dashboard showing lesson progress" loading="lazy">
---
>     <img class="hero" src="hero-1200.webp" srcset="hero-800.webp 800w, hero-1200.webp 1200w" sizes="(max-width: 60rem) calc(100vw - 2rem), 58rem" alt="DevAtlas dashboard showing lesson progress" width="1200" height="675" fetchpriority="high">`,
        },
        output: `$ lighthouse http://localhost:4351/vN.html --only-categories=performance --throttling-method=devtools   (mobile, two runs)
v0 baseline        perf 66  LCP 19.4 s  CLS 0.076
v1 WebP hero       perf 90  LCP 3.4 s   CLS 0.076
v2 width/height   perf 92  LCP 3.2 s   CLS 0.046
v3 no lazy+prio    perf 93  LCP 3.2 s   CLS 0.046
v4 banner space    perf 93  LCP 3.2 s   CLS 0
v5 srcset          perf 99  LCP 2.0 s   CLS 0`,
        pitfalls: [
          "Changing several things at once, so you cannot say which one helped",
          "Reading one Lighthouse run as truth: variance is real, repeat and compare the same settings",
          "Lazy-loading the LCP image, which delays the very element you are measuring",
        ],
      },
    },
    capstone: {
      title: "DevAtlas: security headers, CORS and vitals reporting",
      brief: ["Add security headers to the frontend's nginx config, a CORS allow-list to the API for dev and prod origins, sanitise any rendered Markdown, and report Web Vitals to an API endpoint."],
      criteria: ["Mozilla Observatory grade A or better on a deployed preview", "CORS rejects unknown origins (tested)", "Vitals visible in logs"],
      hints: ["Test CORS with curl -H 'Origin: https://evil.example' and inspect the response headers."],
      solution: {
        text: [
          "Four pieces. (1) nginx: HTTP only redirects to HTTPS; the HTTPS server adds the security headers through one shared snippet included in every location (an add_header inside a location silently drops server-level ones), hides the nginx version, caches hashed /assets/ forever and sends index.html with no-cache. The CSP hash in the snippet is the hash of the build's inline theme script from the intermediate tier; recompute it when that script changes. (2) CORS: the API reads its allow-list from configuration (production only app.devatlas.dev, development adds http://localhost:5173), never AllowAnyOrigin with credentials. (3) Vitals: the page sends web-vitals beacons to POST /api/vitals; the endpoint accepts only LCP, INP and CLS, bounds the numbers and page length, and logs one structured line. (4) Markdown: sanitise with DOMPurify as in the hands-on Answer component.",
          "Verified. ASP.NET Core on net9.0 and curl: the two allowed origins get Access-Control-Allow-Origin echoed back, https://evil.example gets none (the browser would block reading the response), and its preflight gets no allow headers at all. In the Production environment http://localhost:5173 is not allowed. A valid beacon returned 204 and was logged as 'web-vital LCP=1834.2 rating=good page=/lessons/3.5.1'; a malformed one returned 400. nginx 1.29 in Docker with a throw-away local CA: HTTP answered 301, HTTPS (HTTP/2) returned the CSP, HSTS, nosniff, X-Frame-Options, Referrer-Policy, Permissions-Policy and Cross-Origin headers, and no Server version.",
          "Not verified: a Mozilla Observatory grade. The scanner needs a public hostname and I could not reach one from this sandbox, so run it against your deployed preview and report the real grade. The vitals endpoint writes to the application log only; ship those logs to your log system to make them visible.",
        ],
        code: {
          lang: "csharp",
          file: "Program.cs + appsettings + nginx config + cors-test.sh",
          code: `// file: api/Program.cs
using System.Text.Json;

var builder = WebApplication.CreateBuilder(args);

// Allowed origins come from configuration: appsettings.json for prod, appsettings.Development.json for dev
string[] origins = builder.Configuration.GetSection("Cors:Origins").Get<string[]>() ?? [];
builder.Services.AddCors(options => options.AddPolicy("frontend", policy => policy
    .WithOrigins(origins)                                   // explicit allow-list, never AllowAnyOrigin
    .WithMethods("GET", "POST", "PUT", "DELETE")
    .WithHeaders("Content-Type", "Authorization")
    .AllowCredentials()
    .SetPreflightMaxAge(TimeSpan.FromMinutes(10))));

var app = builder.Build();
app.UseCors("frontend");

app.MapGet("/api/lessons", () => new[] { new { id = "3.5.1", title = "XSS, CORS, CSP and Core Web Vitals" } });

// Web Vitals beacons (sendBeacon posts text/plain, so read the body ourselves and validate it)
string[] allowedMetrics = ["LCP", "INP", "CLS"];
app.MapPost("/api/vitals", async (HttpRequest request, ILogger<Program> logger) =>
{
    VitalReport? report;
    try { report = await JsonSerializer.DeserializeAsync<VitalReport>(request.Body, JsonSerializerOptions.Web); }
    catch (JsonException) { return Results.BadRequest(); }
    if (report?.Name is null || !allowedMetrics.Contains(report.Name) || report.Value is < 0 or > 600_000 || report.Page is not { Length: <= 200 })
        return Results.BadRequest();
    logger.LogInformation("web-vital {Name}={Value} rating={Rating} page={Page}", report.Name, report.Value, report.Rating, report.Page);
    return Results.NoContent();
});

app.Run();

record VitalReport(string? Name, double Value, string? Rating, string? Page);

// file: api/appsettings.json
{
  "Logging": { "LogLevel": { "Default": "Information", "Microsoft.AspNetCore": "Warning" } },
  "AllowedHosts": "*",
  "Cors": { "Origins": [ "https://app.devatlas.dev" ] }
}

// file: api/appsettings.Development.json
{
  "Cors": { "Origins": [ "https://app.devatlas.dev", "http://localhost:5173" ] }
}

# file: nginx/devatlas.conf
server_tokens off;                                        # no nginx version in responses

server {
    listen 80;
    server_name _;
    return 301 https://$host$request_uri;                 # HTTP only redirects, straight to HTTPS
}

server {
    listen 443 ssl;
    http2 on;
    server_name _;
    ssl_certificate     /etc/nginx/certs/server.crt;
    ssl_certificate_key /etc/nginx/certs/server.key;
    ssl_protocols TLSv1.2 TLSv1.3;

    root /usr/share/nginx/html;

    location /assets/ {                                   # hashed file names: cache for a year
        include /etc/nginx/snippets/security-headers.conf;
        add_header Cache-Control "public, max-age=31536000, immutable" always;
        try_files $uri =404;
    }

    location / {                                          # SPA: unknown paths serve index.html
        include /etc/nginx/snippets/security-headers.conf;
        add_header Cache-Control "no-cache" always;
        try_files $uri /index.html;
    }
}

# file: nginx/security-headers.conf
# Included in every location: an add_header inside a location drops all server-level add_header lines
add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'sha256-bdyznYulzSGHB3rRO5uV1nvlyFAP4xEFMksag9Ti9zA='; style-src 'self'; img-src 'self' data:; font-src 'self'; connect-src 'self' https://api.devatlas.dev; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; upgrade-insecure-requests" always;
add_header Strict-Transport-Security "max-age=63072000; includeSubDomains" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-Frame-Options "DENY" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
add_header Permissions-Policy "camera=(), microphone=(), geolocation=()" always;
add_header Cross-Origin-Resource-Policy "same-origin" always;
add_header Cross-Origin-Opener-Policy "same-origin" always;

# file: cors-test.sh (API running with ASPNETCORE_ENVIRONMENT=Development on :5051)
#!/bin/sh
# CORS and vitals checks against the running API (dev environment on :5051)
API=http://localhost:5051
for origin in https://app.devatlas.dev http://localhost:5173 https://evil.example; do
  echo "== GET from $origin"
  curl -s -o /dev/null -D - -H "Origin: $origin" $API/api/lessons | grep -iE '^(HTTP|access-control)' | tr -d '\\r'
done
echo "== preflight PUT from https://evil.example"
curl -s -o /dev/null -D - -X OPTIONS -H "Origin: https://evil.example" -H "Access-Control-Request-Method: PUT" \\
  -H "Access-Control-Request-Headers: content-type" $API/api/lessons | grep -iE '^(HTTP|access-control)' | tr -d '\\r'
echo "== preflight PUT from https://app.devatlas.dev"
curl -s -o /dev/null -D - -X OPTIONS -H "Origin: https://app.devatlas.dev" -H "Access-Control-Request-Method: PUT" \\
  -H "Access-Control-Request-Headers: content-type" $API/api/lessons | grep -iE '^(HTTP|access-control)' | tr -d '\\r'
echo "== vitals beacon"
curl -s -o /dev/null -w "%{http_code}\\n" -H "Content-Type: text/plain" -d '{"name":"LCP","value":1834.2,"rating":"good","page":"/lessons/3.5.1"}' $API/api/vitals
curl -s -o /dev/null -w "%{http_code}\\n" -d '{"name":"<script>","value":1}' $API/api/vitals`,
        },
        output: `$ ./cors-test.sh
== GET from https://app.devatlas.dev
HTTP/1.1 200 OK
Access-Control-Allow-Credentials: true
Access-Control-Allow-Origin: https://app.devatlas.dev
== GET from http://localhost:5173
HTTP/1.1 200 OK
Access-Control-Allow-Credentials: true
Access-Control-Allow-Origin: http://localhost:5173
== GET from https://evil.example
HTTP/1.1 200 OK
== preflight PUT from https://evil.example
HTTP/1.1 204 No Content
== preflight PUT from https://app.devatlas.dev
HTTP/1.1 204 No Content
Access-Control-Allow-Credentials: true
Access-Control-Allow-Headers: Content-Type,Authorization
Access-Control-Allow-Methods: GET,POST,PUT,DELETE
Access-Control-Allow-Origin: https://app.devatlas.dev
Access-Control-Max-Age: 600
== vitals beacon
204
400`,
        pitfalls: [
          "Treating CORS as protection for the API: curl and other servers ignore it, so authentication and authorisation still apply",
          "Putting add_header in a location block without re-including the shared headers",
          "Shipping the local-development origin in production configuration",
        ],
      },
    },
  },
  deeper: [
    { label: "OWASP: XSS Prevention Cheat Sheet", url: "https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html" },
    { label: "MDN: Content Security Policy", url: "https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CSP" },
    { label: "MDN: CORS", url: "https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CORS" },
    { label: "web.dev: Web Vitals", url: "https://web.dev/articles/vitals" },
  ],
  nextPreview: "Next phase: backend. ASP.NET Core minimal APIs, middleware and dependency injection: the main DevAtlas API.",
};
