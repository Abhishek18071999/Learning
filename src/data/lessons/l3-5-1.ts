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
        text: ["Typical issues: Google Fonts (allow fonts.googleapis.com for styles and fonts.gstatic.com for fonts), analytics scripts (add their origin to script-src and connect-src), inline style attributes from libraries (may need 'unsafe-inline' for style-src or nonces). Then switch the header name from Report-Only to enforcing."],
      },
    },
    challenge: {
      title: "Web Vitals audit and fixes",
      brief: ["Run Lighthouse (mobile) and collect field data with web-vitals on your DevAtlas pages. Fix the worst metric and document before/after numbers with the specific change that caused the improvement."],
      criteria: ["Before/after Lighthouse and RUM numbers", "Root cause identified", "One change per measurable improvement"],
      hints: ["Lab data (Lighthouse) and field data (real users) can disagree; explain why."],
      solution: {
        text: ["Common high-impact fixes: preloading the LCP image and serving it as AVIF/WebP at the right size; adding width/height to images; splitting a large route bundle; deferring third-party scripts. Field data varies by device and network, so prioritise by p75 field values."],
      },
    },
    capstone: {
      title: "DevAtlas: security headers, CORS and vitals reporting",
      brief: ["Add security headers to the frontend's nginx config, a CORS allow-list to the API for dev and prod origins, sanitise any rendered Markdown, and report Web Vitals to an API endpoint."],
      criteria: ["Mozilla Observatory grade A or better on a deployed preview", "CORS rejects unknown origins (tested)", "Vitals visible in logs"],
      hints: ["Test CORS with curl -H 'Origin: https://evil.example' and inspect the response headers."],
      solution: {
        text: ["Security headers plus correct CORS cost a few lines of config and remove whole attack classes; vitals reporting turns performance from opinion into data."],
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
