import type { Lesson } from "../../types";
export const lesson: Lesson = {
  id: "3.5.1",
  title: "XSS, CORS, CSP and Core Web Vitals",
  minutes: 90,
  level: "Intermediate",
  prerequisites: ["3.3.1 DOM, events and fetch", "0.1.2 HTTP in depth"],
  summary: "Stop cross-site scripting at the sink, understand what CORS does and does not protect, harden a page with CSP and security headers, block CSRF, and measure and improve LCP, INP and CLS with lab and field data.",
  terms: [
    { term: "XSS", def: "Cross-site scripting: untrusted input becomes executable markup or script in your page, so attacker code runs with your origin's authority and can read tokens, act as the user or rewrite the UI." },
    { term: "Stored XSS", def: "The payload is saved (comment, profile, filename) and served to every viewer later. It is the most damaging form because no crafted link is needed." },
    { term: "Reflected XSS", def: "The payload arrives in the request (query string, form field, header) and is echoed into that same response. It needs a victim to open a crafted URL or submit a form." },
    { term: "DOM-based XSS", def: "The server response is unchanged; client-side code copies attacker-controlled data from a source (URL, referrer, postMessage, storage) into a dangerous sink (innerHTML, eval, location)." },
    { term: "Sanitiser", def: "A library such as DOMPurify that parses untrusted HTML and rebuilds it from an allow-list of tags, attributes and URL schemes, removing scripts, event handlers and javascript: URLs." },
    { term: "Same-origin policy", def: "The browser rule that a page may read responses only from its own origin: same scheme, host and port. CORS is a controlled exception to it." },
    { term: "CORS", def: "Cross-Origin Resource Sharing: response headers by which a server names the other origins a browser may let read its responses. It is enforced by browsers, not by the server." },
    { term: "Preflight", def: "An automatic OPTIONS request the browser sends before a non-simple cross-origin request, asking which method and headers the server will allow." },
    { term: "CSRF", def: "Cross-site request forgery: another site makes the user's browser send an authenticated request, relying on cookies being attached automatically, without needing to read the response." },
    { term: "CSP", def: "Content Security Policy: a response header that allow-lists sources for scripts, styles, images, frames and connections, and can forbid inline script with nonces or hashes." },
    { term: "Nonce", def: "A random, unpredictable value generated per response and put on both the CSP header and each trusted inline script. Only scripts carrying the current nonce may execute." },
    { term: "Core Web Vitals", def: "Field metrics for user experience: Largest Contentful Paint (loading), Interaction to Next Paint (responsiveness) and Cumulative Layout Shift (visual stability), assessed at the 75th percentile." },
  ],
  problem: [
    "A DevAtlas forum feature renders learners' answers as Markdown converted to HTML and inserted with dangerouslySetInnerHTML. Someone posts an answer containing a script that reads tokens from localStorage and sends them to their server. Every visitor who views the thread loses their session.",
    "Meanwhile the API team 'fixes' a CORS error by allowing every origin with credentials, the frontend ships no Content Security Policy, and the marketing team notices the landing page loads in 6 seconds on mobile with the button jumping around. Security and performance are both frontend responsibilities, and both have well-understood defences that start with knowing exactly which browser rule is doing the protecting.",
  ],
  concept: {
    analogy: [
      "XSS is a **forged announcement over your building's PA system**: if anyone can get text read out as an instruction, people will follow it because it came from the trusted speaker. Escaping turns their message into quoted text ('someone said: …'), and CSP is a rule that only the official announcer's microphone works.",
      "CORS is **the browser acting as a careful receptionist** for your users: it only hands a cross-origin response to a page if the other server explicitly said that page may see it. It protects users' data in their browser; it does not stop curl or attackers' servers from calling your API.",
    ],
    precise: [
      "**XSS has three shapes and one root cause.** Stored XSS is saved server-side and served to many viewers; reflected XSS is echoed from the current request; DOM-based XSS never touches the server and flows from a client-side source into a sink. The root cause is always the same: untrusted data reaches a context that parses it. Encode for the destination context. `textContent`, `innerText` and JSX text create text nodes and never parse markup; `innerHTML`, `dangerouslySetInnerHTML`, `insertAdjacentHTML`, `document.write`, `eval` and `new Function` do. For attributes, quote and attribute-encode; for URLs, allow only `http:` and `https:`; for JavaScript contexts, pass data as JSON instead of building code. If rich HTML is a product requirement, parse and rebuild it with an allow-list sanitiser such as DOMPurify, preferably on the server and again at render, and treat CSP as defence in depth rather than the primary fix.",
      "**CSRF abuses ambient authority.** Cookies for your site are attached by the browser to requests initiated by another site, so a form post from evil.example can change state as the logged-in user even though the attacker cannot read the response. CORS does not stop it, because a simple form post needs no read permission. Defend with `SameSite=Lax` or `Strict` cookies, a per-session CSRF token (synchroniser or double-submit) on every state-changing request, an Origin or Referer check on the server, and no state change on GET; requiring a custom header or a JSON content type also forces a preflight that a cross-site form cannot satisfy.",
      "**CORS is a read permission granted by a server to a browser.** An origin is scheme + host + port, so `https://app.devatlas.dev` and `https://api.devatlas.dev` are different origins. A *simple* request (GET, HEAD or POST with only safelisted headers and a form/text content type) is sent immediately and the browser withholds the response unless the reply carries `Access-Control-Allow-Origin` for the caller. Anything else (JSON POST, PUT, DELETE, `Authorization`) triggers a preflight `OPTIONS` carrying `Origin`, `Access-Control-Request-Method` and `Access-Control-Request-Headers`; the browser sends the real request only if the reply allows the method, the headers and the origin. Credentialed requests (`fetch(..., { credentials: 'include' })`) require the exact origin echoed plus `Access-Control-Allow-Credentials: true`, and the spec forbids `*` in that case: a wildcard would let any site read authenticated responses, so the browser rejects the combination outright. Echo only origins on your allow-list, send `Vary: Origin` so shared caches do not serve one origin's headers to another, and remember CORS never authenticates or authorises the caller.",
      "**CSP is an allow-list enforced by the browser, and headers are the rest of the contract.** Directives such as `default-src`, `script-src`, `style-src`, `img-src`, `connect-src`, `object-src`, `base-uri`, `frame-ancestors` and `form-action` name the permitted sources; `'self'` means the page's own origin. For inline script use a fresh random nonce per response (`script-src 'nonce-…'`) or a SHA-256 hash of fixed inline code; `'strict-dynamic'` extends trust to scripts those trusted scripts load. `'unsafe-inline'` permits any inline script and inline event handler, which is exactly the capability an XSS payload needs; browsers ignore it when a nonce or hash is present, but leaving it in means a lost nonce silently reopens the hole. Roll out with `Content-Security-Policy-Report-Only` and a report endpoint, then enforce. Pair it with HSTS, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `Permissions-Policy` and `frame-ancestors 'none'`. Core Web Vitals are judged at p75: LCP ≤ 2.5 s, INP ≤ 200 ms, CLS ≤ 0.1.",
    ],
  },
  underTheHood: {
    text: [
      "HTML is parsed, not concatenated. When a string reaches `innerHTML` or `dangerouslySetInnerHTML`, the HTML parser builds elements and attributes: `<img src=x onerror=…>` becomes an `IMG` node with an error handler that runs script. When the same string reaches `textContent`, the parser is never involved: the angle brackets become text and `innerHTML` reads back as `&lt;img …&gt;`. Context matters as much as the sink. In `<a href=\"…\">` the dangerous values are `javascript:` and some `data:` URLs; in an unquoted attribute a space can break out; inside a `<script>` block or an `onclick` attribute you need JavaScript encoding, which is why passing data as JSON is safer than generating code. Modern frameworks escape text and attribute values for you, but `dangerouslySetInnerHTML`, `v-html`, `[innerHTML]` and `bypassSecurityTrustHtml` explicitly opt out.",
      "The three XSS classes differ in where the trust boundary is crossed, not in the fix. Stored XSS crosses it at write time and detonates for every reader, so one bad comment can compromise an admin. Reflected XSS crosses it in the current response: the payload usually comes from `location.search`, a form field or a header, and the attacker needs the victim to follow a link. DOM-based XSS crosses it entirely in the browser: `location.hash`, `document.referrer`, `postMessage` data or a cached value flows into `element.innerHTML`, `eval`, `location.assign` or `insertAdjacentHTML`, and the server log shows a normal page. Sanitise where the data becomes markup, not only where it is stored: a sanitiser run at ingest can be bypassed by a later template, a different client or a change in allowed tags. Allow-list sanitisers parse with the same engine the browser uses, which is why DOMPurify survives mutation XSS attempts that regex blocklists fail; no regex can reliably classify HTML.",
      "CORS decisions happen in the browser before and after the network call. A request is *simple* when the method is GET, HEAD or POST and every header is safelisted (`Accept`, `Accept-Language`, `Content-Language`, `Content-Type` with `application/x-www-form-urlencoded`, `multipart/form-data` or `text/plain`) and no event listener on the upload stream is used. Simple requests are sent; if the response lacks a matching `Access-Control-Allow-Origin`, the browser refuses to expose it to JavaScript, which is why the Network tab shows a response the code cannot read. For anything else the browser sends `OPTIONS` with the origin and the intended method and headers. The server answers `Access-Control-Allow-Methods` and `Access-Control-Allow-Headers` (or a wildcard that does not cover `Authorization`), optionally `Access-Control-Max-Age` so the result is cached; only then is the real request sent. A 204 with no CORS headers is a normal refusal, not a server bug.",
      "Credentials change every rule. With cookies, TLS client certificates or `Authorization` on a cross-origin fetch, the server must echo the exact requesting origin in `Access-Control-Allow-Origin` and send `Access-Control-Allow-Credentials: true`; `*` is invalid for that request and the browser fails it, even if the server also sends the credentials flag. This is deliberate: a wildcard plus credentials would turn every website into a reader of your authenticated API. Validate the `Origin` header against an allow-list on the server, never reflect arbitrary values, and add `Vary: Origin` so a CDN or reverse proxy does not cache the response with one origin's allow header and serve it to another. Non-safelisted response headers (for example `X-Total-Count`) need `Access-Control-Expose-Headers`. CORS does not stop a request from being sent when it is simple, and it never stops curl, so authentication and authorisation belong on the server.",
      "CSP is evaluated when the browser is about to execute or fetch something, and it fails closed. The policy is a set of directives; a missing directive falls back to `default-src`, and `script-src` is the one that matters for XSS. A nonce must be unpredictable and new for every response, at least 128 bits of randomness, base64-encoded; reusing one across responses or caching the HTML lets an attacker read it and attach it to their payload. A hash works for fixed inline bootstrapping code but must be recomputed whenever that code changes. With a nonce or hash present, `'unsafe-inline'` is ignored by modern browsers; that compatibility trick is not a reason to ship it, because a missing nonce or an older parser turns the policy back into 'allow all inline'. `'strict-dynamic'` lets a trusted script load further scripts, which suits bundlers and tag managers but requires trust in that loader. CSP cannot stop exfiltration to origins you allow in `connect-src`, cannot fix a server that returns attacker HTML as a document, and is weaker without `base-uri 'self'`, `object-src 'none'` and `frame-ancestors 'none'`; it is a second line, not the first.",
      "Security headers are cheap and cumulative. `Strict-Transport-Security: max-age=31536000; includeSubDomains` makes the browser refuse plain HTTP for that host after the first HTTPS visit, closing downgrade and cookie-theft paths; only send it over HTTPS, and think before adding `preload`. `X-Content-Type-Options: nosniff` stops the browser guessing a type and executing an uploaded file as script. `frame-ancestors 'none'` in CSP (with `X-Frame-Options: DENY` for old clients) blocks clickjacking. `Referrer-Policy: strict-origin-when-cross-origin` keeps paths and queries out of cross-site Referer headers. `Permissions-Policy` disables APIs such as camera and geolocation you do not use. `Cross-Origin-Opener-Policy: same-origin` isolates the browsing context, and `Cross-Origin-Resource-Policy` limits who may embed your resources. Cookies deserve the same care: `HttpOnly` hides them from JavaScript, `Secure` keeps them off HTTP, `SameSite` limits cross-site sending. Caching is part of security too: do not let a shared cache store authenticated HTML, and make sure `Vary` reflects the headers that change the response.",
      "LCP measures when the largest image or text block in the viewport has finished rendering. The browser records it as four phases: time to first byte, the delay before the resource is discovered, the resource load time, and the delay before it is painted. Anything that stretches one phase hurts the metric: a slow origin or missing CDN stretches TTFB; render-blocking CSS and synchronous scripts delay discovery and paint; `loading=\"lazy\"` on the hero delays discovery until layout; an oversized PNG or a late web font stretches load or render. The fix follows the phase: cache and serve from an edge, preload the actual LCP resource, give it `fetchpriority=\"high\"`, serve responsive `srcset` sizes in AVIF or WebP, avoid lazy-loading above the fold, and render above-the-fold HTML on the server instead of waiting for client JavaScript.",
      "INP is the time from a user interaction (click, tap, key press) to the next frame the browser paints, covering input delay, event-handler processing and presentation. Long JavaScript tasks block the main thread, so the click waits behind hydration, a large bundle, a third-party tag or a synchronous layout read. Break work into chunks and yield with `scheduler.yield()` or `setTimeout`, defer non-critical scripts, move pure computation to a Web Worker, and avoid reading layout immediately after writing it. CLS sums the layout shift scores of unexpected movements, where each score is the impact fraction times the distance fraction; images and iframes without dimensions, late-loading fonts, injected banners and ads, and animations of `top`, `left`, `width` or `height` are the usual causes. Reserve space with `width`/`height` or `aspect-ratio`, `min-height` for slots, and animate `transform` and `opacity` instead. Measure both worlds: lab tools (Lighthouse, DevTools Performance, WebPageTest) are reproducible and good for diagnosis; field data (Chrome UX Report or your own RUM through the `web-vitals` library) is what users actually experience, and decisions should use the p75, segmented by device and page.",
    ],
    diagram: {
      title: "From untrusted input to a browser decision",
      nodes: [
        { label: "Input", sub: "query, form, stored row" },
        { label: "Sink", sub: "innerHTML, href, eval" },
        { label: "Encode / sanitise", sub: "textContent, DOMPurify" },
        { label: "Policy", sub: "CSP nonce + headers" },
        { label: "Browser", sub: "runs or blocks" },
      ],
      edges: ["reaches a sink?", "escape for context", "defence in depth", "allow / block"],
      caption: "Encoding removes the vulnerability; CSP limits the damage if a sink is missed. Neither replaces the other.",
    },
  },
  handsOn: [
    {
      title: "Reflect a payload and read the real headers",
      text: [
        "This server deliberately reflects `q` into the heading without escaping, so you can see both layers at once: the payload is in the HTML body, and the CSP nonce refuses to execute it. Run it in a scratch directory, then request the page with curl. `NONCE` is fixed here so the output is reproducible; production nonces must be random per response.",
      ],
      code: {
        lang: "javascript",
        file: "server.mjs",
        code: `import http from "node:http";
const ALLOWED = new Set(["https://app.devatlas.dev"]);
const NONCE = "r4nd0mPerResponse";
const CSP = "default-src 'self'; script-src 'self' 'nonce-" + NONCE + "'; style-src 'self'; img-src 'self' data:; connect-src 'self' https://api.devatlas.dev; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'; upgrade-insecure-requests";
const HEADERS = {
  "Content-Security-Policy": CSP,
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
  "X-Frame-Options": "DENY",
  "Cross-Origin-Opener-Policy": "same-origin",
};
const cors = (origin) => ALLOWED.has(origin)
  ? { "Access-Control-Allow-Origin": origin, "Access-Control-Allow-Credentials": "true", Vary: "Origin" }
  : {};
const esc = (s) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
http.createServer((req, res) => {
  const url = new URL(req.url ?? "/", "http://localhost");
  const origin = req.headers.origin;
  const base = Object.assign({ Date: new Date().toUTCString() }, HEADERS, cors(origin));
  if (req.method === "OPTIONS") {
    const allowed = ALLOWED.has(origin);
    const headers = { ...base };
    if (allowed) {
      headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE";
      headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization";
      headers["Access-Control-Max-Age"] = "600";
    }
    res.writeHead(204, headers);
    return res.end();
  }
  if (url.pathname === "/search") {
    const q = url.searchParams.get("q") ?? "";
    const body = "<!doctype html>\\n<html lang=\\"en\\"><head><meta charset=\\"utf-8\\"><title>DevAtlas search</title></head>\\n<body>\\n  <h1>Results for " + q + "</h1>\\n  <p>No lessons matched.</p>\\n  <script nonce=\\"" + NONCE + "\\">document.title = \\"Search: " + esc(q) + "\\";</script>\\n</body></html>";
    res.writeHead(200, { ...base, "Content-Type": "text/html; charset=utf-8", "Content-Length": Buffer.byteLength(body), "Set-Cookie": "session=demo-session; HttpOnly; Secure; SameSite=Lax" });
    return res.end(body);
  }
  if (url.pathname === "/api/lessons") {
    const body = JSON.stringify([{ id: "3.5.1", title: "XSS, CORS, CSP and Core Web Vitals" }]);
    res.writeHead(200, { ...base, "Content-Type": "application/json", "Content-Length": Buffer.byteLength(body) });
    return res.end(body);
  }
  res.writeHead(404, { ...base, "Content-Type": "text/plain" });
  res.end("Not found");
}).listen(8787, () => console.log("listening on http://localhost:8787"));`,
      },
      output: `$ node server.mjs
$ curl -si 'http://localhost:8787/search?q=%3Cscript%3Ealert(document.cookie)%3C%2Fscript%3E'
HTTP/1.1 200 OK
Date: Fri, 23 Oct 2026 09:35:14 GMT
Content-Security-Policy: default-src 'self'; script-src 'self' 'nonce-r4nd0mPerResponse'; style-src 'self'; img-src 'self' data:; connect-src 'self' https://api.devatlas.dev; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'; upgrade-insecure-requests
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=()
X-Frame-Options: DENY
Cross-Origin-Opener-Policy: same-origin
Content-Type: text/html; charset=utf-8
Content-Length: 336
Set-Cookie: session=demo-session; HttpOnly; Secure; SameSite=Lax
Connection: keep-alive
Keep-Alive: timeout=5

<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>DevAtlas search</title></head>
<body>
  <h1>Results for <script>alert(document.cookie)</script></h1>
  <p>No lessons matched.</p>
  <script nonce="r4nd0mPerResponse">document.title = "Search: &lt;script&gt;alert(document.cookie)&lt;/script&gt;";</script>
</body></html>`,
      notes: [
        "The `<h1>` is the vulnerable sink: the string was parsed as markup. The nonced `<script>` is safe because its data went through `esc`, which is context encoding in practice.",
        "The CSP blocks the injected `<script>` because it has no nonce, but that is luck, not a design: the page is still storing attacker HTML. Fix the sink with `textContent` or a sanitiser; keep CSP as the second layer.",
        "`Set-Cookie` shows the other half of token defence: `HttpOnly` means a successful XSS cannot read this cookie, `Secure` keeps it off HTTP, and `SameSite=Lax` limits cross-site sends. `Content-Security-Policy` is the real header above; the browser has no reason to trust a meta tag as much.",
      ],
    },
    {
      title: "Preflight a JSON request, then read the CORS cases",
      text: [
        "The second request below is what the browser sends by itself before `PUT` with `Authorization`. The table is the decision list to memorise; the output is the real filtered response from the lab server (the full response also carries the security headers shown above).",
      ],
      code: {
        lang: "text",
        file: "cors-cases.txt",
        code: `case                                      preflight  server must send                                   browser outcome
simple GET, no credentials                no         ACAO: exact origin, or omit = unreadable          readable only if allowed
simple GET with cookies                   no         ACAO: exact origin + ACAC: true + Vary: Origin    readable only if allowed
JSON POST + Authorization                 yes        ACAO + ACAM + ACAH (+ Max-Age)                    blocked before POST if not allowed
credentialed non-simple fetch             yes        exact origin + ACAC: true; ACAO: * is invalid     wildcard is rejected
any request from an unlisted origin       -          no ACAO (a 204 preflight is normal)               response is not exposed to JS
server-to-server call (curl, another API)  n/a        n/a                                               CORS is irrelevant; use auth

commands:
curl -si -X OPTIONS http://localhost:8787/api/lessons -H 'Origin: https://app.devatlas.dev' -H 'Access-Control-Request-Method: PUT' -H 'Access-Control-Request-Headers: content-type, authorization'
curl -si -X OPTIONS http://localhost:8787/api/lessons -H 'Origin: https://evil.example' -H 'Access-Control-Request-Method: PUT' -H 'Access-Control-Request-Headers: content-type'`,
      },
      output: `$ curl ... -H 'Origin: https://app.devatlas.dev' | grep -iE '^(HTTP|access-control|vary)'
HTTP/1.1 204 No Content
Access-Control-Allow-Origin: https://app.devatlas.dev
Access-Control-Allow-Credentials: true
Vary: Origin
Access-Control-Allow-Methods: GET, POST, PUT, DELETE
Access-Control-Allow-Headers: Content-Type, Authorization
Access-Control-Max-Age: 600

$ curl ... -H 'Origin: https://evil.example' | grep -iE '^(HTTP|access-control|vary)'
HTTP/1.1 204 No Content

$ curl -si http://localhost:8787/api/lessons -H 'Origin: https://evil.example' | grep -iE '^(HTTP|access-control|content-type)'
HTTP/1.1 200 OK
Content-Type: application/json`,
      notes: [
        "The evil preflight still returns 204: nothing is 'blocked' on the server. The browser simply finds no `Access-Control-Allow-Origin` and refuses to send the `PUT` or expose the GET body. Do not test CORS by checking for a 403.",
        "`Vary: Origin` is not optional when a CDN caches the response. Without it, one allowed origin's `Access-Control-Allow-Origin` value can be served to a different origin.",
        "A `text/plain` body (the shape `navigator.sendBeacon` uses) is a simple request, so it never preflights. That is fine for analytics; it is not a reason to skip validation on the endpoint.",
      ],
    },
    {
      title: "Trace a nonce-based CSP",
      text: ["Follow where the nonce is created and why an injected script cannot borrow it. The header and the trusted tag must carry the same value, and both must change together on every response."],
      code: {
        lang: "mermaid",
        file: "csp-flow.mmd",
        code: `sequenceDiagram
  participant B as Browser
  participant S as Server
  participant T as Trusted inline script
  participant X as Injected script
  B->>S: GET /lessons/3.5.1
  S->>S: nonce = base64(128 random bits)
  S-->>B: HTML + CSP: script-src 'self' 'nonce-abc'
  S-->>B: <script nonce="abc">boot()</script>
  B->>B: match nonce on tag and header?
  B->>T: yes - execute
  B-->>X: no nonce - refuse and report
  X-->>S: report-uri POST (not executed)`,
      },
      notes: [
        "Nonce and hash are alternatives. A hash (`script-src 'sha256-…'`) suits fixed bootstrap code but breaks the moment the file changes; a nonce suits per-response HTML but must be random and never cached.",
        "`'strict-dynamic'` is the companion for bundlers: once a nonced loader runs, scripts it inserts are allowed even if their host is not listed. Use it deliberately, and keep `object-src 'none'` and `base-uri 'self'`.",
        "Roll out with `Content-Security-Policy-Report-Only`, read the violation reports, then rename the header. `unsafe-inline` in `script-src` defeats the whole exercise: it is the permission XSS needs.",
      ],
    },
    {
      title: "Prove textContent beats innerHTML",
      text: [
        "jsdom gives you a real DOM in Node. The same string sent to two sinks produces different node trees: `innerHTML` creates an element with an executable handler, `textContent` creates one text node. The second half shows URL protocol validation, the other common XSS sink.",
      ],
      code: {
        lang: "javascript",
        file: "sinks.mjs",
        code: `import { createRequire } from "node:module";
const require = createRequire("C:/Users/cored/Learning/");
const { JSDOM } = require("jsdom");

const payload = '<img src=x onerror="alert(document.cookie)">';
const { window } = new JSDOM("<!doctype html><body><div id=a></div><div id=b></div>");
const a = window.document.querySelector("#a");
const b = window.document.querySelector("#b");

a.innerHTML = payload;
b.textContent = payload;

console.log("innerHTML  ->", a.innerHTML);
console.log("  nodes:", [...a.childNodes].map((n) => n.nodeName).join(", "));
console.log("  img has onerror attr:", a.querySelector("img")?.hasAttribute("onerror"));
console.log("textContent->", b.innerHTML);
console.log("  nodes:", [...b.childNodes].map((n) => n.nodeName).join(", "));

for (const url of ["https://devatlas.dev/profile", "javascript:alert(1)", "data:text/html,<script>alert(1)</script>", "/lessons/3.5.1"]) {
  const u = new URL(url, "https://devatlas.dev");
  const safe = u.protocol === "https:" || u.protocol === "http:";
  console.log("href " + JSON.stringify(url).padEnd(50) + " protocol=" + u.protocol.padEnd(12) + " safe=" + safe);
}`,
      },
      output: `$ node sinks.mjs
innerHTML  -> <img src="x" onerror="alert(document.cookie)">
  nodes: IMG
  img has onerror attr: true
textContent-> &lt;img src=x onerror="alert(document.cookie)"&gt;
  nodes: #text
href "https://devatlas.dev/profile"                    protocol=https:       safe=true
href "javascript:alert(1)"                             protocol=javascript:  safe=false
href "data:text/html,<script>alert(1)</script>"        protocol=data:        safe=false
href "/lessons/3.5.1"                                  protocol=https:       safe=true`,
      notes: [
        "`innerHTML` round-trips as markup because the parser normalised the attribute quotes; the handler survived. `textContent` stores characters, so the read-back is escaped.",
        "URL validation must resolve relative URLs first (`new URL(url, location.origin)`) and then allow only `http:` and `https:`. Blocking the literal string `javascript:` is not enough: encoding and whitespace variants exist.",
      ],
    },
    {
      title: "Measure LCP, INP and CLS",
      text: [
        "Report from real users with `web-vitals`; use Lighthouse and the Performance panel to explain a bad number. The thresholds below are the standard good/needs-improvement/poor boundaries (p75), not a measurement from your site.",
      ],
      code: {
        lang: "typescript",
        file: "src/vitals.ts",
        code: `import { onCLS, onINP, onLCP, type Metric } from "web-vitals";

function send(metric: Metric) {
  const body = JSON.stringify({ name: metric.name, value: metric.value, rating: metric.rating, page: location.pathname });
  navigator.sendBeacon?.("/api/vitals", body) || fetch("/api/vitals", { method: "POST", body, keepalive: true });
}

onLCP(send);
onINP(send);
onCLS(send);

// Lab diagnosis: Lighthouse (mobile, throttled) and the Performance panel.
// Field truth: your RUM p75, or the Chrome UX Report for public pages.`,
      },
      output: `metric  good       needs work   poor       usual cause                              first fix
LCP     <= 2.5 s   <= 4.0 s     > 4.0 s    slow TTFB, lazy hero, huge image        CDN/cache, preload, fetchpriority, srcset
INP     <= 200 ms  <= 500 ms    > 500 ms   long tasks, hydration, heavy handlers   yield/split tasks, defer JS, workers
CLS     <= 0.1     <= 0.25      > 0.25     images/fonts/ads without reserved space width/height, aspect-ratio, slots
(thresholds at p75; illustrative table, not a measurement of this page)`,
      notes: [
        "Lab and field disagree for real reasons: lab is one throttled device and one cold cache; field includes old phones, slow networks and repeat visits. Diagnose in the lab, prioritise by field p75.",
        "LCP is not 'page load'. It is the largest element's paint, so a late cookie banner or a font swap can move it; INP is not FID (FID measured only input delay; INP covers the whole interaction).",
        "Send the metric with `sendBeacon` so it survives page unload; then aggregate by route rather than averaging the whole site, or a fast home page hides a slow lesson page.",
      ],
    },
  ],
  companies: [
    "**Browser vendors and OWASP (illustrative):** XSS remains one of the most reported web vulnerability classes, which is why browsers keep adding defences (CSP, Trusted Types, `SameSite` defaults) and why OWASP publishes context-specific encoding rules rather than one 'escape' function.",
    "**Large consumer sites adopting strict CSP (illustrative):** nonce- and hash-based policies with `strict-dynamic` are the standard way to keep inline bootstrapping code while blocking injected script; the pattern is documented by Google's security teams and visible in the CSP headers of many high-traffic properties.",
    "**CDNs and shared caches (illustrative):** a missing `Vary: Origin` on a CORS response can let an edge cache replay one origin's allow header to another; providers document this because it is a cache-configuration problem, not a browser bug. The same caches must not store authenticated HTML.",
    "**Bug bounty platforms (illustrative):** stored and DOM XSS are consistently among the highest-volume paid reports, and triagers routinely demonstrate impact by reading a session token or performing an action as the victim. That impact model is why `HttpOnly` and CSRF tokens matter even after an XSS is found.",
    "**E-commerce and media companies (illustrative):** public case studies tie improved LCP and INP to conversion and engagement, and teams track p75 per template in RUM dashboards rather than trusting a single Lighthouse score.",
  ],
  mistakes: [
    { mistake: "dangerouslySetInnerHTML with unsanitised input", why: "Rendering Markdown or rich text quickly", wrong: "Stored XSS affecting every viewer of the thread", fix: "Sanitise with DOMPurify (ideally also at ingest); prefer plain text and JSX text" },
    { mistake: "Using innerHTML for 'escaped' strings", why: "The value looks harmless after replacing angle brackets", wrong: "Attribute, URL or JavaScript contexts still break out; quotes and `javascript:` survive", fix: "Use textContent for text and encode for the exact context; validate URL protocols separately" },
    { mistake: "Access-Control-Allow-Origin: * together with credentials", why: "Making the CORS error go away", wrong: "The browser rejects the response, or a reflected origin lets any site read authenticated data", fix: "Exact origin allow-list, `ACAC: true`, and `Vary: Origin`; never reflect arbitrary Origin values" },
    { mistake: "Treating CORS as API security", why: "Misunderstanding what it protects", wrong: "APIs left without auth because 'CORS blocks other sites'", fix: "Authenticate and authorise every request server-side; CORS is a browser read permission only" },
    { mistake: "Tokens in localStorage", why: "Easy to read from JavaScript", wrong: "Any XSS steals long-lived tokens and can replay them elsewhere", fix: "HttpOnly, Secure, SameSite cookies for session/refresh tokens; short-lived access tokens in memory" },
    { mistake: "CSP with 'unsafe-inline' to silence reports", why: "The console noise stops", wrong: "Any injected inline script or event handler runs; the policy provides almost no XSS protection", fix: "Nonce or hash the real inline code, move handlers into files, keep report-only while you migrate" },
    { mistake: "Forgetting Vary: Origin on CORS responses", why: "The response works in local testing", wrong: "A CDN serves one origin's allow header to another origin, or caches a credentialed response", fix: "Send `Vary: Origin`; keep authenticated responses out of shared caches" },
    { mistake: "Lazy-loading the LCP image and omitting dimensions", why: "Applying loading=lazy and width/height everywhere except the hero", wrong: "LCP worsens because discovery is delayed, and CLS grows because space is not reserved", fix: "Eager + high priority for the hero; width/height or aspect-ratio on every image" },
    { mistake: "Judging vitals from one fast laptop run", why: "Local Lighthouse looks green", wrong: "Real users on slow devices and networks see a different p75, often a much worse one", fix: "Collect field data with web-vitals or CrUX; use lab tools to explain, not to declare victory" },
  ],
  bestPractices: [
    { tag: "Security", text: "Escape by default, sanitise any HTML with an allow-list, validate URL protocols, and keep untrusted data out of `innerHTML`, `eval` and inline handlers." },
    { tag: "Security", text: "CORS allow-lists per environment, exact origins with credentials, `Vary: Origin`; authenticate and authorise on the server regardless." },
    { tag: "Security", text: "Strict CSP with a per-response nonce or hash, report-only first, plus HSTS, nosniff, frame-ancestors, Referrer-Policy and Permissions-Policy." },
    { tag: "Security", text: "HttpOnly, Secure, SameSite cookies; CSRF tokens and Origin checks on state-changing requests; no state change on GET." },
    { tag: "Performance", text: "Track LCP, INP and CLS at p75 in the field, set budgets, and fix the phase that is slow: delivery, discovery, main-thread work or layout." },
  ],
  interview: [
    { q: "What are the types of XSS and how do you prevent them?", a: "Stored XSS is saved server-side and served to many users; reflected XSS is echoed from the current request; DOM-based XSS flows from a client-side source such as `location` or `postMessage` into a sink such as `innerHTML` or `eval` without a server round trip. The fix is context-aware output encoding: JSX text and `textContent` create text and never parse markup, attributes need attribute encoding, URLs need an http/https allow-list, and JavaScript contexts should receive JSON rather than generated code. If HTML must be rendered, parse and rebuild it with an allow-list sanitiser such as DOMPurify at render (and preferably at ingest), keep `eval` and inline handlers out, and add a nonce-based CSP as defence in depth. `HttpOnly` cookies limit what a successful XSS can steal, but they do not stop the XSS itself." },
    { q: "Explain CORS, preflight and why `*` with credentials fails.", a: "The same-origin policy stops a page reading another origin's response; CORS lets the target server grant that read with `Access-Control-Allow-Origin`. A simple request (GET/HEAD/POST with safelisted headers and a form or text content type) is sent immediately and the browser only exposes the response if the header matches. Anything else triggers an automatic OPTIONS preflight carrying `Origin`, `Access-Control-Request-Method` and `Access-Control-Request-Headers`; the real request is sent only if the server allows the origin, method and headers, optionally cached by `Access-Control-Max-Age`. With credentials, the server must echo the exact origin and send `Access-Control-Allow-Credentials: true`; the Fetch spec forbids `*` for credentialed requests because that would let every site read authenticated responses, so the browser rejects the response even if the server sent it. Add `Vary: Origin`, expose any custom response headers explicitly, and remember CORS does not authenticate the caller: curl and other servers ignore it, and simple requests are still sent." },
    { q: "How do you diagnose and improve poor Core Web Vitals?", a: "Start with field data at p75 (CrUX or your own RUM through `web-vitals`), segmented by route, device and connection, then reproduce in the lab with Lighthouse and the Performance panel. For LCP, find the LCP element and its phases: improve TTFB with caching and an edge, remove render-blocking CSS/JS, preload the hero and mark it `fetchpriority=\"high\"`, serve responsive modern images, stop lazy-loading above the fold, and render above-the-fold HTML on the server. For INP, find long tasks and heavy handlers: split work, yield with `scheduler.yield()`, defer third-party scripts, reduce hydration and move computation to a worker; avoid synchronous layout reads after writes. For CLS, reserve space with width/height or aspect-ratio, size font fallbacks, reserve slots for banners and ads, and animate only transform and opacity. Change one thing at a time and keep measuring, because lab and field disagree and correlation is not causation." },
  ],
  quickCheck: [
    {
      kind: "mcq",
      prompt: "Which line is vulnerable to XSS if `bio` comes from users?",
      options: ["<p>{bio}</p>", "el.textContent = bio", "<div dangerouslySetInnerHTML={{ __html: bio }} />", "console.log(bio)"],
      answer: 2,
      explanation: "It inserts raw HTML into the parser. JSX text and textContent create text nodes and are safe by default.",
    },
    {
      kind: "bug",
      prompt: "A browser fetch with `credentials: \"include\"` fails and the console mentions a wildcard. The API sends `Access-Control-Allow-Origin: *` and `Access-Control-Allow-Credentials: true`. What is wrong?",
      options: ["The API needs HTTPS", "A credentialed cross-origin response may not use `*`; echo the exact allowed origin and send Vary: Origin", "The browser needs a preflight for every GET", "`credentials` must be `same-origin`"],
      answer: 1,
      explanation: "The Fetch spec rejects a wildcard allow-origin when credentials are included, precisely to stop every site reading authenticated responses.",
    },
    {
      kind: "bug",
      prompt: "The page's CLS is 0.35. What is the most likely culprit?",
      code: { lang: "html", code: "<h1>Welcome back</h1>\n<img src=\"/banner.jpg\" alt=\"Course banner\">\n<button>Continue lesson</button>" },
      options: ["The h1 tag", "The image has no width/height, so content jumps when it loads", "The button text", "alt text"],
      answer: 1,
      explanation: "Without reserved space, the button moves down when the image loads. Add width/height or aspect-ratio.",
    },
  ],
  cheatSheet: [
    "XSS classes: stored (saved), reflected (echoed now), DOM (client source to client sink).",
    "`textContent` and JSX text never parse; `innerHTML`, `dangerouslySetInnerHTML`, `eval` do.",
    "Rich HTML: allow-list sanitiser (DOMPurify) at render; URLs: http/https only.",
    "CSP: `default-src 'self'; script-src 'self' 'nonce-…'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'`.",
    "Nonce must be random per response; `'unsafe-inline'` gives XSS exactly what it needs.",
    "CORS simple request: sent, response withheld without ACAO. Non-simple: preflight OPTIONS first.",
    "Credentials: exact origin echoed + `ACAC: true`; `*` is invalid for credentialed requests.",
    "CSRF: SameSite + per-session token + Origin check; CORS is not CSRF protection.",
    "Headers: HSTS, nosniff, frame-ancestors, Referrer-Policy, Permissions-Policy; HttpOnly/Secure/SameSite cookies.",
    "Vitals at p75: LCP ≤ 2.5 s, INP ≤ 200 ms, CLS ≤ 0.1. Field data first, lab to explain.",
  ],
  homework: {
    basic: {
      title: "Find and fix three XSS bugs",
      brief: ["Review this component and fix every XSS risk: it renders a username with innerHTML in an effect, a profile link from user data in href, and a comment with dangerouslySetInnerHTML."],
      criteria: ["All three fixed", "Explanation of the attack for each", "No functionality lost (comments still support basic formatting)"],
      hints: ["javascript: URLs execute when clicked.", "An effect that writes innerHTML is still a sink even if it runs after render."],
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
      hints: ["Vite production builds avoid inline scripts by default; check third-party embeds.", "Hash the inline script from the build instead of disabling the policy."],
      solution: {
        text: [
          "Start in Content-Security-Policy-Report-Only with a strict policy: the browser reports what would be blocked but still runs it, so nothing breaks while you look. On this build the only violation was the small inline theme script in index.html (the no-flash script from 3.2.1). Vite's own output is an external module script, so it is covered by 'self'.",
          "Fix it without 'unsafe-inline': the server hashes each inline <script> in dist/index.html at startup and adds 'sha256-…' to script-src, so the policy always matches the build (the same hash can be pasted into the nginx add_header line from the hands-on). Typical other fixes: for Google Fonts add https://fonts.googleapis.com to style-src and https://fonts.gstatic.com to font-src; for analytics add its origin to script-src and connect-src; replace inline style attributes set by libraries or use nonces. Then switch the header name to Content-Security-Policy.",
          "check-csp.mjs serves the real build three times and drives it in Chromium 141. (1) Report-only without the hash: the app works and one script-src-elem violation for the inline script is reported (the server also received it at /csp-report). (2) With the hash: no violations in normal use, including clicking 'Mark complete'. (3) Enforced, with a script injected the way an XSS payload would be: it does not run and Chrome logs the 'Refused to execute inline script' error.",
        ],
        code: {
          lang: "javascript",
          file: "server.mjs + check-csp.mjs",
          code: `// file: index.html - the only inline script in the build
// <script>try { const t = localStorage.getItem("theme"); if (t) document.documentElement.dataset.theme = t; } catch {}</script>

// file: server.mjs
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import http from "node:http";
import path from "node:path";

const DIST = path.resolve("dist");
const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".json": "application/json" };

async function inlineScriptHashes() {
  const html = await readFile(path.join(DIST, "index.html"), "utf8");
  return [...html.matchAll(/<script>([\\s\\S]*?)<\\/script>/g)]
    .map((m) => "'sha256-" + createHash("sha256").update(m[1]).digest("base64") + "'");
}

export async function startServer({ port = 8080, enforce = false, hashInline = true } = {}) {
  const hashes = hashInline ? await inlineScriptHashes() : [];
  const policy = [
    "default-src 'self'",
    "script-src 'self' " + hashes.join(" "),
    "style-src 'self'", "img-src 'self' data:", "connect-src 'self'",
    "object-src 'none'", "base-uri 'self'", "frame-ancestors 'none'",
    "form-action 'self'", "report-uri /csp-report",
  ].join("; ").trim();
  const header = enforce ? "Content-Security-Policy" : "Content-Security-Policy-Report-Only";

  const server = http.createServer(async (req, res) => {
    if (req.method === "POST" && req.url === "/csp-report") {
      let body = "";
      for await (const chunk of req) body += chunk;
      console.error("CSP report:", body.slice(0, 500));
      return res.writeHead(204).end();
    }
    const urlPath = decodeURIComponent(new URL(req.url ?? "/", "http://x").pathname);
    let file = path.join(DIST, urlPath);
    if (!file.startsWith(DIST)) return res.writeHead(400).end();
    if (!path.extname(file)) file = path.join(DIST, "index.html");
    try {
      const body = await readFile(file);
      res.writeHead(200, { "Content-Type": TYPES[path.extname(file)] ?? "application/octet-stream", [header]: policy, "X-Content-Type-Options": "nosniff" });
      res.end(body);
    } catch { res.writeHead(404).end("Not found"); }
  });
  await new Promise((resolve) => server.listen(port, resolve));
  return { server, policy, header };
}

// file: check-csp.mjs - CHROME_PATH=/path/to/chrome node check-csp.mjs
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
    document.addEventListener("securitypolicyviolation", (e) => window.__violations.push(e.effectiveDirective + " blocked " + e.blockedURI));
  });
  await page.goto("http://localhost:8081/");
  await page.getByRole("button", { name: "Mark complete" }).first().click();
  if (attack) await page.evaluate(() => { const s = document.createElement("script"); s.textContent = "window.__pwned = true"; document.body.append(s); });
  await page.waitForTimeout(300);
  const violations = await page.evaluate(() => window.__violations);
  const pwned = await page.evaluate(() => window.__pwned === true);
  console.log("[" + label + "] " + header);
  console.log("  app rendered: " + await page.getByText("1 of 3 completed").isVisible() + "  violations: " + (violations.length ? violations.join("; ") : "none"));
  if (attack) console.log("  injected script ran: " + pwned);
  for (const m of messages.filter((t) => !t.startsWith("Failed to load resource"))) console.log("  console: " + m);
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
      hints: ["Lab data (Lighthouse) and field data (real users) can disagree; explain why.", "Change one variable at a time or the numbers tell you nothing."],
      solution: {
        text: [
          "Method: a demo landing page (v0) with the classic problems, a 3.4 MB PNG hero loaded with loading=lazy and no dimensions, plus a promo banner injected 800 ms after load. I measured Lighthouse 13.5 mobile (devtools throttling, Chromium 141, two runs each) after each single change, so every improvement is tied to one edit.",
          "Root causes. LCP: the hero is the LCP element, it is a huge PNG, and lazy-loading delays discovery. CLS: the image has no width/height, and the banner is inserted above the heading with no reserved space. Fixes in order: (1) resize and re-encode the hero as WebP (3.4 MB to 0.36 MB): LCP 19.4 s to 3.2 s. (2) width/height on the img: CLS 0.076 to 0.046. (3) drop loading=lazy, add fetchpriority=high: no measurable change on this tiny page (LCP stayed 3.2 s), so keep it only because it is correct for an LCP image. (4) reserve 4.5rem for the banner slot: CLS 0.046 to 0. (5) srcset/sizes with an 800 px variant for phones: LCP 3.2 s to 2.0 s, performance 93 to 99.",
          "Honest limits. These are lab numbers from a local server on a simulated slow phone; the page is synthetic. The web-vitals snippet from the hands-on is on the page and posts beacons that the server logs (I saw LCP, INP and CLS lines arrive), but I did not complete a scripted field run, so there are no RUM p75 numbers here. In a real audit, collect field data first and prioritise by p75; lab and field can disagree because field users have different devices, caches and networks.",
        ],
        code: {
          lang: "html",
          file: "v5.html + lighthouse commands",
          code: `<!-- final page (v5): the five changes are visible here -->
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>DevAtlas</title>
  <style>
    body { margin: 0; font: 1rem/1.6 system-ui, sans-serif; color: #13141c; }
    main { max-width: 60rem; margin: auto; padding: 1rem; }
    .hero { width: 100%; height: auto; display: block; }
    .promo-slot { min-height: 4.5rem; } .promo { margin: 0; box-sizing: border-box; height: 4.5rem; background: #fff4c2; padding: 1rem; }
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
    setTimeout(() => {
      const p = Object.assign(document.createElement("p"), { className: "promo", textContent: "Phase 3 is live: React, CSS and web security." });
      document.querySelector("#promo-slot").append(p);
    }, 800);
  </script>
</body>
</html>

# lighthouse http://localhost:4351/vN.html --only-categories=performance --throttling-method=devtools   (mobile, two runs)`,
        },
        output: `$ lighthouse http://localhost:4351/vN.html --only-categories=performance --throttling-method=devtools   (mobile, two runs)
v0 baseline        perf 66  LCP 19.4 s  CLS 0.076
v1 WebP hero       perf 90  LCP 3.4 s   CLS 0.076
v2 width/height    perf 92  LCP 3.2 s   CLS 0.046
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
      hints: ["Test CORS with curl -H 'Origin: https://evil.example' and inspect the response headers.", "A 200 with no Access-Control-Allow-Origin is still a correct rejection for a browser."],
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
{ "Logging": { "LogLevel": { "Default": "Information", "Microsoft.AspNetCore": "Warning" } }, "AllowedHosts": "*", "Cors": { "Origins": [ "https://app.devatlas.dev" ] } }

// file: api/appsettings.Development.json
{ "Cors": { "Origins": [ "https://app.devatlas.dev", "http://localhost:5173" ] } }

# file: nginx/devatlas.conf
server_tokens off;
server {
    listen 80;
    return 301 https://$host$request_uri;
}
server {
    listen 443 ssl;
    http2 on;
    ssl_certificate     /etc/nginx/certs/server.crt;
    ssl_certificate_key /etc/nginx/certs/server.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    root /usr/share/nginx/html;
    location /assets/ { include /etc/nginx/snippets/security-headers.conf; add_header Cache-Control "public, max-age=31536000, immutable" always; try_files $uri =404; }
    location / { include /etc/nginx/snippets/security-headers.conf; add_header Cache-Control "no-cache" always; try_files $uri /index.html; }
}

# file: nginx/security-headers.conf
add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'sha256-bdyznYulzSGHB3rRO5uV1nvlyFAP4xEFMksag9Ti9zA='; style-src 'self'; img-src 'self' data:; font-src 'self'; connect-src 'self' https://api.devatlas.dev; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; upgrade-insecure-requests" always;
add_header Strict-Transport-Security "max-age=63072000; includeSubDomains" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-Frame-Options "DENY" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
add_header Permissions-Policy "camera=(), microphone=(), geolocation=()" always;
add_header Cross-Origin-Resource-Policy "same-origin" always;
add_header Cross-Origin-Opener-Policy "same-origin" always;

# file: cors-test.sh (API on :5051, ASPNETCORE_ENVIRONMENT=Development)
#!/bin/sh
API=http://localhost:5051
for origin in https://app.devatlas.dev http://localhost:5173 https://evil.example; do
  echo "== GET from $origin"
  curl -s -o /dev/null -D - -H "Origin: $origin" $API/api/lessons | grep -iE '^(HTTP|access-control)' | tr -d '\\r'
done
echo "== preflight PUT from https://evil.example"
curl -s -o /dev/null -D - -X OPTIONS -H "Origin: https://evil.example" -H "Access-Control-Request-Method: PUT" -H "Access-Control-Request-Headers: content-type" $API/api/lessons | grep -iE '^(HTTP|access-control)' | tr -d '\\r'
echo "== preflight PUT from https://app.devatlas.dev"
curl -s -o /dev/null -D - -X OPTIONS -H "Origin: https://app.devatlas.dev" -H "Access-Control-Request-Method: PUT" -H "Access-Control-Request-Headers: content-type" $API/api/lessons | grep -iE '^(HTTP|access-control)' | tr -d '\\r'
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
    { label: "OWASP: CSRF Prevention Cheat Sheet", url: "https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html" },
    { label: "MDN: Content Security Policy", url: "https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CSP" },
    { label: "MDN: CORS", url: "https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CORS" },
    { label: "web.dev: Web Vitals", url: "https://web.dev/articles/vitals" },
    { label: "web.dev: Interaction to Next Paint", url: "https://web.dev/articles/inp" },
  ],
  nextPreview: "Next phase: backend. ASP.NET Core minimal APIs, middleware and dependency injection: the main DevAtlas API.",
};
