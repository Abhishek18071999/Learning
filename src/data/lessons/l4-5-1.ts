import type { Lesson } from "../../types";

export const lesson: Lesson = {
  id: "4.5.1",
  title: "The OWASP Top 10, with hands-on exploits and fixes",
  minutes: 90,
  level: "Advanced",
  prerequisites: ["3.5.1 XSS, CORS, CSP and Core Web Vitals", "4.1.1 Minimal APIs, middleware and DI", "4.1.3 Authentication: JWT, OAuth2 and OIDC"],
  summary: "Use the OWASP Top 10 (2021) as a map, then exploit and fix the failures backend engineers actually ship: broken object-level access control, SQL injection, weak password storage, insecure defaults, outdated dependencies, authentication and logging gaps, and SSRF.",
  terms: [
    { term: "Broken access control (A01)", def: "A missing or wrong server-side check that lets a user act on a record or function outside their permissions. It is the first risk in the 2021 list; OWASP reports 94% test coverage for this category and maps the object-id pattern to CWE-639." },
    { term: "IDOR", def: "Insecure direct object reference: the API accepts an object identifier from the client (an invoice number, a file id) and returns or changes that object without checking that the caller owns it. In the 2021 list it is one of the failure modes inside broken access control." },
    { term: "Injection (A03)", def: "Untrusted data is interpreted as part of a command or query. SQL injection is CWE-89; OWASP reports 94% of applications tested for some form of injection, with 274,228 occurrences in the contributed data." },
    { term: "Cryptographic failure (A02)", def: "Sensitive data is protected with no cryptography, weak cryptography or the wrong kind: plaintext, fast hashes, unsalted hashes, hardcoded keys, or passwords encrypted instead of hashed." },
    { term: "Security misconfiguration (A05)", def: "The software is secure in theory but deployed wrong: default accounts, debug mode, verbose errors, open storage, directory listing, missing security headers, unnecessary features exposed." },
    { term: "SSRF (A10)", def: "Server-side request forgery: the application fetches a user-supplied URL, so the attacker can make the server reach internal services, cloud metadata or files it could not reach directly. OWASP maps it to CWE-918 and recommends an allowlist, not a deny list." },
    { term: "Security logging and monitoring failure (A09)", def: "Logins, access-control failures and high-value actions are not logged, not monitored, or not alerted on, so a breach runs undetected. OWASP maps it to CWE-778, CWE-117, CWE-223 and CWE-532." },
  ],
  problem: [
    "DevAtlas has forty thousand learners and a security review booked for Friday. On Tuesday a learner emails support: the receipt link for their invoice ends in 1042, and changing it to 1043 shows someone else's name and amount. By Wednesday the team has four more findings. The course search box accepts a single quote and returns the accounts table. The password reset table stores unsalted SHA-256 hashes. The admin export endpoint checks that you are logged in but not that you are an admin. And the 'import a cover image from a URL' feature happily fetches http://169.254.169.254/latest/meta-data/.",
    "None of these is exotic. Each is a missing or misplaced control at one point in the request path, and each appears in the OWASP Top 10. The list is not a penetration-test report and not a compliance certificate; it is a map of where these failures cluster. This lesson reads the map, then exploits and fixes the parts a backend engineer touches every sprint: object-level authorization, query construction, password storage, deployment defaults, dependency hygiene, authentication, logging and outbound requests.",
  ],
  concept: {
    analogy: [
      "A hotel with ten checkpoints. The front desk checks that you are a guest (authentication). Your keycard opens your room and not the room next door, even though both doors look the same (access control). Guests write requests on a form instead of shouting orders into the kitchen (injection). Valuables go in a safe, not a shoebox (cryptography). The master key is not left under the mat, the debug panel is not on the lobby wall, and the old lock firmware gets updated (configuration and components). The cameras record who entered the server room (logging), and the concierge does not fetch a parcel from any address a stranger writes down (SSRF).",
      "The ten items are not ten separate locks. They are ten ways the same building fails at different checkpoints, which is why one missing check can appear under two categories. The useful question is never 'are we OWASP compliant?' but 'at this checkpoint, what can the caller control, and where is that control enforced?'",
    ],
    precise: [
      "**What the list is.** The OWASP Top 10 is an awareness document: a broad consensus about the most critical risks to web applications, ranked with contributed vulnerability data and a community survey. The 2021 edition is the one this lesson uses ([the list](https://owasp.org/Top10/2021/)). The project site now says the most current release is the 2025 edition, so treat 2021 as a durable map rather than a version number to quote forever. It is not a test standard; OWASP's ASVS is the verifiable requirements document, and the Cheat Sheets give the fixes.",
      "**The map.** A01 Broken Access Control, A02 Cryptographic Failures, A03 Injection, A04 Insecure Design, A05 Security Misconfiguration, A06 Vulnerable and Outdated Components, A07 Identification and Authentication Failures, A08 Software and Data Integrity Failures, A09 Security Logging and Monitoring Failures, A10 Server-Side Request Forgery. The order is a ranking, not a build order, and the categories overlap: a leaked access token can be A01, A02 and A07 at once.",
      "**The backend subset.** Most server-side findings land in eight of the ten. Enforce object ownership on every read and write (A01). Keep data and commands separate (A03). Store passwords with a slow, salted hash (A02). Ship deny-by-default configuration and generic errors (A05). Know what you depend on and patch it (A06). Resist credential stuffing and rotate sessions (A07). Record and alert on security events without logging secrets (A09). Constrain outbound requests with an allowlist (A10). A04 and A08 are design and supply-chain concerns that shape all eight.",
      "**How to use it.** At each trust boundary, write down what the caller controls and which server-side control consumes it. Then test the control with the inputs an attacker would send, not the inputs your UI sends. Centralise the control so a new endpoint cannot forget it: one authorization policy, one query helper, one password module, one egress client. Put the tests in CI, and log the denials so the next attempt is visible.",
    ],
  },
  underTheHood: {
    text: [
      "**A01: the id is not a permission.** An endpoint receives an object id, loads the row and returns it. Authentication proved who the caller is; nothing proved they may see this row. OWASP calls this out explicitly: permitting someone to view or edit another account by supplying its unique identifier is an insecure direct object reference, mapped to CWE-639 ([A01](https://owasp.org/Top10/2021/A01_2021-Broken_Access_Control/)). The fix is a server-side decision about the record, made on every route and every verb, not a hidden button and not an unguessable UUID. Return the same 404 for 'missing' and 'not yours' so the endpoint does not become an existence oracle.",
      "**A03: data becomes code.** A SQL string is a program: the keywords are structure and the literals are data. Concatenating input erases the boundary, so a quote closes the literal and the rest is parsed as SQL. Parameter binding keeps the boundary: the driver sends the statement and the values separately, and the database never parses a value as structure ([A03](https://owasp.org/Top10/2021/A03_2021-Injection/)). Binding does not cover identifiers such as table or column names; OWASP notes those cannot be escaped and must be allowlisted. The same shape recurs in shell commands, LDAP, ORM raw fragments and template engines: the fix is a safe API that separates code from data, with validation as a second layer.",
      "**A02: passwords are not encryption problems.** A fast hash such as SHA-256 is designed to be cheap, so a GPU tries billions of guesses per second; an unsalted hash lets one precomputed table crack every user with the same password. OWASP recommends Argon2id first, then scrypt, then bcrypt for legacy systems, and PBKDF2-HMAC-SHA256 with 600,000 iterations when FIPS is required ([A02](https://owasp.org/Top10/2021/A02_2021-Cryptographic_Failures/), [Password Storage Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html)). Generate a unique random salt per password, store the parameters with the hash, compare with a constant-time function, and rehash on login when the parameters age. Passwords are hashed, never encrypted; encryption is reversible, and the key becomes the next thing to steal.",
      "**A05, A06, A07: the platform and the front door.** Misconfiguration is what turns a secure library into an insecure service: debug pages, default admin accounts, open buckets, directory listing, permissive CORS, missing HSTS ([A05](https://owasp.org/Top10/2021/A05_2021-Security_Misconfiguration/)). Outdated components are the same story one layer down: you cannot patch what you cannot inventory, and OWASP notes that this is the only category with no CVEs mapped to its CWEs, so a default exploit and impact weight is used ([A06](https://owasp.org/Top10/2021/A06_2021-Vulnerable_and_Outdated_Components/)). Authentication failures cover credential stuffing, weak password rules, account enumeration, session ids in URLs, and sessions that survive logout; MFA, rate limiting, generic error messages and rotation after login are the baseline ([A07](https://owasp.org/Top10/2021/A07_2021-Identification_and_Authentication_Failures/)).",
      "**A09 and A10: see it, and constrain it.** Without logs and alerts, a breach is discovered by a third party. Log authentication and access-control failures with enough user context to investigate, keep logs out of the response, encode them so log injection cannot forge entries, and alert on patterns ([A09](https://owasp.org/Top10/2021/A09_2021-Security_Logging_and_Monitoring_Failures/)). SSRF is the outbound mirror of injection: the server makes a request on the attacker's behalf. Validate the scheme, host and port against a positive allowlist, resolve the name and connect to the checked IP, block loopback, private, link-local and metadata addresses, disable redirects, cap time and size, and never return the raw upstream response ([A10](https://owasp.org/Top10/2021/A10_2021-Server-Side_Request_Forgery_%28SSRF%29/)). OWASP is explicit that a deny list or regular expression is not a mitigation; attackers have payload lists.",
    ],
    diagram: {
      title: "Where the 2021 categories sit in one request",
      nodes: [
        { label: "Attacker input", sub: "URL, JSON, headers, files" },
        { label: "Access check", sub: "A01 object ownership" },
        { label: "Interpreter", sub: "A03 SQL, shell, template" },
        { label: "Outbound fetch", sub: "A10 URL allowlist" },
        { label: "Data and secrets", sub: "A02 hashes, keys, TLS" },
        { label: "Logs and alerts", sub: "A09 detection" },
      ],
      edges: ["A01: change the id", "A03: data becomes code", "A10: server fetches any URL", "A02: leak at rest or in transit", "A09: no record, no alert"],
      caption: "A05 (configuration), A06 (components) and A07 (authentication) are the platform and front door around this flow; A04 and A08 shape the design and the supply chain before the request arrives.",
    },
  },
  handsOn: [
    {
      title: "SQL injection in a live SQLite database",
      text: ["The script builds a real in-memory database, runs a search the way a first draft often does (an f-string), then sends the same input through a parameterised query. The payload does not guess a password; it changes the shape of the query so the database returns a different table's rows."],
      code: { lang: "python", file: "sqli_demo.py", code: `"""A real SQLite database, one unsafe query and one safe query.

The payload does not guess a password: it changes the shape of the query so the
database returns rows from another table.
"""
import sqlite3

db = sqlite3.connect(":memory:")
db.executescript(
    """
    CREATE TABLE accounts (
        id INTEGER PRIMARY KEY,
        email TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL
    );
    CREATE TABLE progress (
        learner TEXT NOT NULL,
        course TEXT NOT NULL,
        minutes INTEGER NOT NULL
    );
    INSERT INTO accounts VALUES
        (1, 'asha@devatlas.dev', 'pbkdf2_sha256$600000$0011223344556677$aabbccddeeff0011'),
        (2, 'ravi@devatlas.dev', 'pbkdf2_sha256$600000$8899aabbccddeeff$0011223344556677'),
        (3, 'mei@devatlas.dev',  'pbkdf2_sha256$600000$ffeeddccbbaa9988$8899aabbccddeeff');
    INSERT INTO progress VALUES
        ('asha', 'sql-basics', 120),
        ('asha', 'http-apis', 45),
        ('ravi', 'sql-basics', 80),
        ('mei', 'auth', 200);
    """
)

PAYLOAD = "' UNION SELECT email, password_hash, 0 FROM accounts -- "


def vulnerable_search(learner: str) -> tuple[str, list[tuple]]:
    sql = f"SELECT learner, course, minutes FROM progress WHERE learner = '{learner}'"
    return sql, db.execute(sql).fetchall()


def safe_search(learner: str) -> tuple[str, list[tuple]]:
    sql = "SELECT learner, course, minutes FROM progress WHERE learner = ?"
    return sql, db.execute(sql, (learner,)).fetchall()


print("normal search for asha:", len(vulnerable_search("asha")[1]), "rows")
print("payload:", PAYLOAD)
sql, rows = vulnerable_search(PAYLOAD)
print("vulnerable query returned", len(rows), "rows (all accounts):")
for row in rows:
    print("  ", row)
print("parameterised query returned", len(safe_search(PAYLOAD)[1]), "rows")` },
      output: "normal search for asha: 2 rows\npayload: ' UNION SELECT email, password_hash, 0 FROM accounts -- \nvulnerable query returned 3 rows (all accounts):\n   ('asha@devatlas.dev', 'pbkdf2_sha256$600000$0011223344556677$aabbccddeeff0011', 0)\n   ('mei@devatlas.dev', 'pbkdf2_sha256$600000$ffeeddccbbaa9988$8899aabbccddeeff', 0)\n   ('ravi@devatlas.dev', 'pbkdf2_sha256$600000$8899aabbccddeeff$0011223344556677', 0)\nparameterised query returned 0 rows",
      notes: [
        "The payload needs the same number of columns as the original SELECT; the literal 0 fills the integer column. Real attackers enumerate column counts first.",
        "The fixed query binds the whole payload as one string, so SQLite compares it to stored learner names and finds nothing. Binding sends the statement and the values on separate paths; the database never parses the value as structure.",
        "Parameter binding cannot cover table names, column names or the direction in an ORDER BY. Those must come from an allowlist, as OWASP notes in A03:2021.",
      ],
    },
    {
      title: "Store passwords with a salted, slow hash",
      text: ["Python's standard library ships PBKDF2-HMAC-SHA256, so there is no excuse for SHA-256(password). The script hashes the same password twice to show that the salts differ, verifies the right and wrong password, and times one hash."],
      code: { lang: "python", file: "pbkdf2_demo.py", code: `"""Salted PBKDF2-HMAC-SHA256 password storage with a constant-time check."""
import hashlib
import hmac
import secrets
import time

ITERATIONS = 600_000          # OWASP Password Storage Cheat Sheet, PBKDF2-HMAC-SHA256


def hash_password(password: str, iterations: int = ITERATIONS) -> str:
    salt = secrets.token_bytes(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, iterations)
    return f"pbkdf2_sha256\${iterations}\${salt.hex()}\${digest.hex()}"


def verify_password(password: str, stored: str) -> bool:
    algorithm, iterations, salt_hex, digest_hex = stored.split("$")
    if algorithm != "pbkdf2_sha256":
        return False
    candidate = hashlib.pbkdf2_hmac(
        "sha256", password.encode("utf-8"), bytes.fromhex(salt_hex), int(iterations)
    )
    return hmac.compare_digest(candidate, bytes.fromhex(digest_hex))


start = time.perf_counter()
first = hash_password("correct horse battery staple")
second = hash_password("correct horse battery staple")
elapsed = (time.perf_counter() - start) / 2

print("same password, different stored value:", first != second)
print("stored prefix:", "$".join(first.split("$")[:2]) + "$<salt>$<digest>")
print("verify correct password:", verify_password("correct horse battery staple", first))
print("verify wrong password:  ", verify_password("Correct horse battery staple", first))
print(f"one hash: {elapsed:.1f} s, {ITERATIONS:,} iterations, 16-byte salt, 32-byte digest")` },
      output: "same password, different stored value: True\nstored prefix: pbkdf2_sha256$600000$<salt>$<digest>\nverify correct password: True\nverify wrong password:   False\none hash: 0.2 s, 600,000 iterations, 16-byte salt, 32-byte digest",
      notes: [
        "OWASP's order is Argon2id, then scrypt, then bcrypt for legacy systems; PBKDF2-HMAC-SHA256 at 600,000 iterations is the FIPS-friendly choice. At about 0.2 s per hash, one attacker guess costs about 0.2 s of CPU here, which is the point.",
        "A unique salt means two users with the same password get different stored values, so one rainbow table cannot crack the whole table. The salt is not secret; it is stored beside the hash.",
        "`hmac.compare_digest` compares in constant time so the response time does not leak how much of the hash matched. Never compare password hashes with `==`.",
      ],
    },
    {
      title: "Stop an IDOR with object-level checks",
      text: ["Authentication answers 'who are you?'; authorization answers 'may you do this to this object?'. The first function answers only the first question. The second checks ownership (or an admin role) and returns the same 404 for a missing row and someone else's row."],
      code: { lang: "python", file: "idor_demo.py", code: `"""Object-level authorization: the invoice id is not a permission slip."""
from dataclasses import dataclass


@dataclass(frozen=True)
class Invoice:
    id: int
    owner: str
    amount_inr: int


INVOICES = {
    101: Invoice(101, "asha", 4_900),
    102: Invoice(102, "ravi", 12_500),
    103: Invoice(103, "mei", 1_200),
}


def vulnerable_get(current_user: str, invoice_id: int) -> Invoice | None:
    return INVOICES.get(invoice_id)          # authenticated, but not authorised


def fixed_get(current_user: str, invoice_id: int) -> Invoice | None:
    invoice = INVOICES.get(invoice_id)
    if invoice is None or invoice.owner != current_user:
        return None                          # same 404 whether missing or not yours
    return invoice


print("asha reads her own invoice 101:", vulnerable_get("asha", 101))
print("asha reads ravi's invoice 102 (old code):", vulnerable_get("asha", 102))
print("asha reads ravi's invoice 102 (fixed):", fixed_get("asha", 102))
print("ravi reads his own invoice 102 (fixed):", fixed_get("ravi", 102))
print("unknown id 999 (fixed):", fixed_get("asha", 999))` },
      output: "asha reads her own invoice 101: Invoice(id=101, owner='asha', amount_inr=4900)\nasha reads ravi's invoice 102 (old code): Invoice(id=102, owner='ravi', amount_inr=12500)\nasha reads ravi's invoice 102 (fixed): None\nravi reads his own invoice 102 (fixed): Invoice(id=102, owner='ravi', amount_inr=12500)\nunknown id 999 (fixed): None",
      notes: [
        "Switching to UUIDs makes the id harder to guess but does not authorise anything: an attacker can still copy an id from a shared link, a log or another response.",
        "Put the ownership rule in one policy function and call it from every route that loads an object, so a new endpoint cannot quietly skip it. Return 404 rather than 403 when the caller is not allowed to know the object exists.",
        "OWASP's A01 prevention list asks for record-ownership checks, deny by default, server-side enforcement, unit and integration tests for access control, and logging of failures.",
      ],
    },
    {
      title: "Read a pull request like an attacker",
      text: [
        "Start at the trust boundary: every parameter in the route, every field in the JSON body, every header you read, every uploaded file, every URL you fetch. For each one, ask two questions: what can this value reach, and where is the server-side check? A value that reaches a database, a shell, a file path or an outbound HTTP client without a check is a finding waiting for a test.",
        "Trace each value to its sink. The sink is usually obvious: a query string, `subprocess`, a template, an `open()` call, an HTTP client. Then look for the control at the sink, not at the edge. A length check in the browser is not a control. A WAF rule is not a control. A hidden button is not a control. The control is code that runs on the server and can be tested without a browser.",
        "Finish with the boring surfaces that cause expensive incidents: debug pages and stack traces in production, default accounts, storage buckets open to the world, dependencies pinned three years ago, secrets in git history, logs that contain tokens, and alerts that nobody reads. Write each finding as exploit, impact, fix, and a test that fails before the fix and passes after it. That last part is what turns a review into an engineering change.",
      ],
    },
    {
      title: "SSRF: allowlist the destination, not the payload",
      text: ["An image importer takes a URL from the user and fetches it. On a cloud host, the interesting address is not the public internet; it is the instance metadata service, internal admin panels and localhost. This is the decision flow OWASP's SSRF prevention guidance describes: allowlist the destination, pin the resolved address, and fail closed."],
      code: { lang: "mermaid", file: "ssrf-allowlist.mmd", code: `flowchart TD
    A[User submits image URL] --> B{Scheme is https?}
    B -- no --> R[Reject 400]
    B -- yes --> C{Host on allowlist?}
    C -- no --> R
    C -- yes --> D[Resolve DNS and pin the IP]
    D --> E{Private, loopback, link-local or metadata IP?}
    E -- yes --> R
    E -- no --> F[GET with redirects off, 3 s timeout, 5 MB cap]
    F --> G[Return bytes to the page, never the raw upstream response]` },
      notes: [
        "OWASP's A10 page says to enforce the URL scheme, port and destination with a positive allowlist, disable HTTP redirections, and not to mitigate SSRF with a deny list or regular expression. Attackers have payload lists and alternate encodings.",
        "Resolve the hostname once, check every returned address, and connect to that checked IP. Otherwise a DNS-rebinding answer can change between the check and the request, a time-of-check/time-of-use race.",
        "Block 127.0.0.0/8, 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16, 169.254.0.0/16 (cloud metadata), ::1 and fc00::/7 at the application layer, and again with an egress firewall. Return the fetched bytes, not the upstream headers or error body.",
      ],
    },
  ],
  companies: [
    "**Meta (September 2018):** a bug in the 'View As' privacy feature let attackers steal access tokens for almost 50 million accounts, and Meta reset tokens for another 40 million as a precaution, logging out around 90 million people ([Meta's security update](https://about.fb.com/news/2018/09/security-update/)). The post describes three interacting bugs: a view-only interface that could post, a video uploader that minted a token with the wrong permissions, and a token generated for the profile being viewed rather than the viewer. A privacy feature became a way to act as another user: broken access control at the object level.",
    "**Capital One (2019):** the company disclosed unauthorized access to information on about 100 million people in the United States and 6 million in Canada, after a configuration vulnerability in its infrastructure was exploited ([Capital One's press release](https://www.capitalone.com/about/newsroom/capital-one-announces-data-security-incident/)). Capital One calls it a configuration vulnerability and says it fixed it immediately; public reporting and the criminal case describe an SSRF-style request that reached a cloud metadata service. The lesson is not 'the cloud is insecure' but 'a server that fetches user-influenced destinations needs an allowlist and network egress rules'.",
    "**Uber (2016):** attackers used credentials found in a private GitHub repository to reach a database containing records of 57 million riders and drivers, then demanded a payment; the breach was concealed from regulators and users, and Uber's former chief security officer was convicted in 2022 of obstruction and misprision ([U.S. Department of Justice](https://www.justice.gov/usao-ndca/pr/former-uber-chief-security-officer-convicted-obstruction-justice-and-misprision)). Hardcoded credentials in a repository are an A02/A07 failure; the concealment is an A09 failure, because nobody could respond to what nobody was allowed to record.",
  ],
  mistakes: [
    { mistake: "Hiding the button instead of checking the API", why: "The UI shows only the learner's own records", wrong: "The attacker calls the endpoint directly with another record id and the server returns it", fix: "Enforce object-level authorization on the server, deny by default, and test the API with two different users" },
    { mistake: "Escaping quotes or adding a WAF rule instead of parameterising", why: "'We sanitise the input' feels safer than changing the query", wrong: "Numeric contexts, second-order data, UNION payloads and alternate encodings get through; a WAF is a speed bump, not a boundary", fix: "Bind every value; allowlist identifiers such as column and sort names; never build SQL by concatenation" },
    { mistake: "Hashing passwords with SHA-256, MD5 or a site-wide salt", why: "It is a hash, and hashes are one-way", wrong: "Fast hashes fall to GPUs and a shared salt falls to one rainbow table; a stolen table becomes plaintext in hours", fix: "Argon2id, scrypt or bcrypt; PBKDF2-HMAC-SHA256 at 600,000 iterations where required; unique salt; compare_digest; rehash on login" },
    { mistake: "Shipping debug mode, default accounts and verbose errors", why: "It is only a staging default", wrong: "Production returns stack traces with library versions, an admin/admin account is live, and an open bucket exposes uploads", fix: "Deny by default: no default credentials, debug off, generic error pages, least-privilege cloud roles, automated configuration checks" },
    { mistake: "Pinning old dependencies and never scanning them", why: "Upgrades break things", wrong: "A known CVE in a framework or transitive library is exploited for months after a patch exists", fix: "Inventory every direct and transitive dependency, generate an SBOM, alert on CVEs, and set a patch SLA with a tested upgrade path" },
    { mistake: "Blocking SSRF with a deny list of 'bad' hosts", why: "It stops the payload from the last incident", wrong: "Decimal, octal and IPv6 encodings, DNS rebinding and open redirects bypass the list; internal names are missed", fix: "Positive allowlist of scheme, host and port; resolve and pin the IP; block private ranges; disable redirects; egress firewall" },
    { mistake: "Logging full request bodies and never alerting", why: "More logs must be better", wrong: "Passwords, tokens and personal data end up in a searchable log store, while the actual attack produces no alert", fix: "Log security events with user context, redact secrets, keep logs append-only, and alert on auth and access-control failure patterns" },
  ],
  bestPractices: [
    { tag: "Security", text: "Put object-level authorization in one policy layer and call it from every route that loads a record. Deny by default, test it with two users, and return 404 when the caller may not know the object exists." },
    { tag: "Security", text: "Bind query values, allowlist identifiers, and give the application a least-privilege database account. Run the same rule for shell, LDAP and template calls: keep data out of the command." },
    { tag: "Maintainability", text: "Keep one password module, one egress client and one logging module, so a fix lands everywhere at once. Add regression tests for each finding before the fix, and keep them in CI." },
    { tag: "Reliability", text: "Inventory dependencies, watch CVEs and patch on a schedule you can prove. Log and alert on authentication and access-control failures, redact secrets, and rehearse the incident runbook." },
  ],
  interview: [
    { q: "A learner changes /api/invoices/1042 to /api/invoices/1043 and receives another learner's invoice. What is the flaw, and how do you fix it everywhere?", a: "It is broken object-level access control, an IDOR (CWE-639). Authentication established the caller but the handler never checked that the invoice belongs to them. I would load the invoice with a query scoped by owner, or load it and run a single authorization policy that compares the record's owner or tenant to the caller, including an admin override. Return 404 for both missing and forbidden so the endpoint does not confirm which ids exist. Then add an integration test with two users and the same id, audit every route that takes an object id, and log denials. UUIDs and hidden buttons are not fixes." },
    { q: "Why is hashlib.sha256(password) wrong, and what replaces it?", a: "SHA-256 is fast by design, so a GPU can try billions of guesses per second, and without a salt the same password produces the same hash everywhere, which makes rainbow tables and cross-account cracking trivial. Replace it with a slow, salted password hash: Argon2id first, then scrypt, then bcrypt for legacy systems, or PBKDF2-HMAC-SHA256 with at least 600,000 iterations when FIPS is required. Generate a random salt per password with secrets, store the algorithm and parameters beside the hash, compare with hmac.compare_digest, and rehash on the next successful login when parameters change. Never encrypt passwords; encryption is reversible." },
    { q: "A feature fetches an image from a user-supplied URL. How do you stop SSRF?", a: "Constrain the destination, not the payload. Allow only https, allowlist the hostnames and ports the feature legitimately needs, resolve the hostname, check every resolved address against private, loopback, link-local and metadata ranges, and connect to the checked IP so DNS cannot rebind between check and use. Disable redirects, set short timeouts and a size cap, return only the image bytes rather than the raw upstream response, and add an egress firewall that blocks the metadata service and internal networks. OWASP specifically warns against deny lists and regular expressions: attackers have encodings and payload lists that get around them." },
  ],
  quickCheck: [
    {
      kind: "mcq",
      prompt: "A search endpoint builds `SELECT id, email FROM users WHERE email = '` + input + `'`. Which change actually removes the SQL injection?",
      options: ["Escape single quotes in the input", "Use a parameterised query and bind the input as a value", "Hide database errors from the response", "Put a WAF rule in front of the endpoint"],
      answer: 1,
      explanation: "Binding keeps the statement and the value on separate paths, so the database never parses the input as SQL. Escaping and WAF rules are bypassable, and hiding errors only hides the symptom.",
    },
    {
      kind: "bug",
      prompt: "An authenticated learner changes /api/invoices/1042 to /api/invoices/1043 and gets another learner's invoice. The handler loads the invoice by id and returns it. What is the flaw?",
      options: ["Missing CSRF token", "Broken object-level access control (IDOR)", "Weak password hashing", "Server-side request forgery"],
      answer: 1,
      explanation: "The caller was authenticated but the record's owner was never checked: CWE-639, one of the failure modes in OWASP A01. The fix is a server-side ownership check, not a less guessable id.",
    },
    {
      kind: "mcq",
      prompt: "Which password storage scheme follows OWASP's guidance?",
      options: ["SHA-256 of the password", "MD5 with one salt shared by the whole site", "PBKDF2-HMAC-SHA256 with 600,000 iterations and a unique 16-byte salt", "AES-256 encryption with the key stored in the repository"],
      answer: 2,
      explanation: "OWASP recommends a slow, salted password hash: Argon2id, scrypt or bcrypt, with PBKDF2-HMAC-SHA256 at 600,000 iterations for FIPS. Fast hashes, shared salts and reversible encryption are the failures A02 describes.",
    },
  ],
  cheatSheet: [
    "Map: A01 access control, A02 crypto, A03 injection, A04 design, A05 configuration, A06 components, A07 authentication, A08 integrity, A09 logging, A10 SSRF.",
    "Authorization: check the object's owner or tenant on the server for every read and write; deny by default; 404 for both missing and forbidden; IDOR is CWE-639.",
    "SQL: statement text and values travel separately; never concatenate; allowlist table, column and sort names; use a least-privilege database user.",
    "Passwords: Argon2id, scrypt or bcrypt; PBKDF2-HMAC-SHA256 at 600,000 iterations; unique random salt; compare_digest; rehash on login; never encrypt or store plaintext.",
    "Configuration: no default accounts, debug off, generic errors, security headers, no public buckets, no directory listing; verify it automatically.",
    "Components: inventory direct and transitive dependencies, generate an SBOM, watch CVEs, remove unused packages, patch on a stated schedule.",
    "Authentication: MFA, rate limits and delays, generic messages to prevent enumeration, rotate the session id after login, short-lived tokens, real logout.",
    "Logging: record logins, failures and access-control denials with user context; redact secrets; encode log fields; alert on patterns and keep an incident runbook.",
    "SSRF: allowlist scheme, host and port; resolve and pin the IP; block private, loopback, link-local and metadata ranges; disable redirects; cap time and size.",
  ],
  homework: {
    basic: {
      title: "SQL injection: break it, then fix it",
      brief: [
        "Recreate the login query from the lesson in SQLite, first as string concatenation and then with parameters. Log in as the admin using the email `admin@devatlas.dev' -- ` and any password, print the generated SQL, then show that the parameterised version rejects the same input and still accepts the correct password.",
      ],
      criteria: ["The vulnerable query returns the admin row for the injection", "The generated SQL is printed so the comment is visible", "The fixed query rejects the injection and accepts the real password", "The explanation says why escaping quotes is not equivalent to binding"],
      hints: ["The `-- ` starts a SQL comment in SQLite; everything after it, including the password check, is ignored."],
      solution: {
        text: ["The attack works because the quote closes the email literal and the comment removes the password condition. Binding makes the whole attack string an email value, so the lookup fails. The SHA-256 here is only a stand-in so the demo has something to compare; the challenge tier replaces it with PBKDF2."],
        code: { lang: "python", file: "hw_basic_sqli.py", code: `"""Break a login with a comment, then make the query treat input as data."""
import hashlib
import sqlite3


def sha256(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


db = sqlite3.connect(":memory:")
db.executescript(
    """
    CREATE TABLE accounts (
        id INTEGER PRIMARY KEY,
        email TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL
    );
    """
)
db.executemany(
    "INSERT INTO accounts (email, password_hash, role) VALUES (?, ?, ?)",
    [
        ("asha@devatlas.dev", sha256("asha-demo-pass"), "learner"),
        ("admin@devatlas.dev", sha256("admin-demo-pass"), "admin"),
    ],
)

ATTACK_EMAIL = "admin@devatlas.dev' -- "
ATTACK_HASH = "anything"


def vulnerable_login(email: str, password_hash: str) -> tuple[str, tuple | None]:
    sql = (
        f"SELECT email, role FROM accounts "
        f"WHERE email = '{email}' AND password_hash = '{password_hash}'"
    )
    return sql, db.execute(sql).fetchone()


def safe_login(email: str, password_hash: str) -> tuple[str, tuple | None]:
    sql = "SELECT email, role FROM accounts WHERE email = ? AND password_hash = ?"
    return sql, db.execute(sql, (email, password_hash)).fetchone()


print("vulnerable, wrong password:", vulnerable_login("admin@devatlas.dev", sha256("guess"))[1])
sql, row = vulnerable_login(ATTACK_EMAIL, ATTACK_HASH)
print("vulnerable, injection:", row)
print("vulnerable SQL:", sql)
print("safe, same injection:", safe_login(ATTACK_EMAIL, ATTACK_HASH)[1])
print("safe, correct password:", safe_login("admin@devatlas.dev", sha256("admin-demo-pass"))[1])` },
        output: "vulnerable, wrong password: None\nvulnerable, injection: ('admin@devatlas.dev', 'admin')\nvulnerable SQL: SELECT email, role FROM accounts WHERE email = 'admin@devatlas.dev' -- ' AND password_hash = 'anything'\nsafe, same injection: None\nsafe, correct password: ('admin@devatlas.dev', 'admin')",
        pitfalls: ["Thinking an ORM removes the risk: raw fragments, string-built ORDER BY and dynamic table names are still injection points."],
      },
    },
    intermediate: {
      title: "Stop an IDOR",
      brief: [
        "Model document downloads with three users (one admin) and four documents, one of them public. Implement the naive handler that trusts the document id, then the fixed handler with one policy function. Print a matrix of users and document ids and show that a missing id and someone else's id return the same 404.",
      ],
      criteria: ["At least three users, including an admin", "The owner can read their document; another learner cannot", "The admin can read a confidential document, and a public document is readable by anyone", "Missing and forbidden ids both return 404", "The policy lives in one function"],
      hints: ["Add a public classification before adding an admin, so the policy has three branches worth testing."],
      solution: {
        text: ["The matrix is the test. If the same function handles every download, one branch per classification is enough, and new endpoints can reuse it. The 404 keeps the endpoint from telling an attacker which document ids exist."],
        code: { lang: "python", file: "hw_intermediate_idor.py", code: `"""Stop an IDOR with one policy function and the same 404 for every denial."""
from dataclasses import dataclass


@dataclass(frozen=True)
class Document:
    id: str
    owner: str
    title: str
    classification: str


DOCS = {
    "DOC-1": Document("DOC-1", "asha", "sql-notes.pdf", "private"),
    "DOC-2": Document("DOC-2", "ravi", "payroll.xlsx", "confidential"),
    "DOC-3": Document("DOC-3", "asha", "reading-list.md", "private"),
    "DOC-4": Document("DOC-4", "mei", "public-syllabus.pdf", "public"),
}


def can_view(user: str, doc: Document) -> bool:
    if user == "admin":
        return True
    if doc.classification == "public":
        return True
    return doc.owner == user


def download(user: str, doc_id: str) -> tuple[int, str | None]:
    doc = DOCS.get(doc_id)
    if doc is None or not can_view(user, doc):
        return 404, None                  # do not reveal that the id exists
    return 200, doc.title


cases = [
    ("asha", "DOC-1"),
    ("asha", "DOC-2"),
    ("ravi", "DOC-2"),
    ("mei", "DOC-4"),
    ("asha", "DOC-4"),
    ("admin", "DOC-2"),
    ("asha", "DOC-9"),
]
for user, doc_id in cases:
    status, title = download(user, doc_id)
    print(f"{user:6} {doc_id}  {status}  {title or '-'}")` },
        output: "asha   DOC-1  200  sql-notes.pdf\nasha   DOC-2  404  -\nravi   DOC-2  200  payroll.xlsx\nmei    DOC-4  200  public-syllabus.pdf\nasha   DOC-4  200  public-syllabus.pdf\nadmin  DOC-2  200  payroll.xlsx\nasha   DOC-9  404  -",
        pitfalls: ["Checking ownership only in the list endpoint and forgetting the detail endpoint, the export endpoint and the attachment endpoint."],
      },
    },
    challenge: {
      title: "Password hashing and secrets",
      brief: [
        "Implement register and login with PBKDF2-HMAC-SHA256 at 600,000 iterations, a unique salt and a pepper read from the environment. Accept legacy `sha256$...` hashes for existing users, verify them, and transparently upgrade to PBKDF2 on the next successful login. Show that a wrong password never upgrades anything.",
      ],
      criteria: ["600,000 iterations and a 16-byte random salt", "Verification uses hmac.compare_digest", "The pepper comes from an environment variable or secret manager, never source", "A correct legacy login upgrades the hash; a wrong legacy login does not", "The stored format records the algorithm and parameters"],
      hints: ["Put the algorithm prefix first in the stored string so migration code can dispatch on it without guessing."],
      solution: {
        text: ["A pepper is a secret added to every password before hashing, kept outside the database; unlike a salt it is not stored per user, so a stolen table is not enough to start cracking offline. The demo reads it from the environment and notes when it is absent, which is how the production check should behave. The upgrade happens only after a successful verification, which is the one moment the plaintext is available."],
        code: { lang: "python", file: "hw_challenge_hash.py", code: `"""Hash new passwords with PBKDF2 and upgrade legacy hashes on the next login."""
import hashlib
import hmac
import os
import secrets

ITERATIONS = 600_000
PEPPER = os.environ.get("DEVATLAS_PEPPER", "")      # in production: secret manager, not source


def hash_password(password: str) -> str:
    salt = secrets.token_bytes(16)
    material = (password + PEPPER).encode("utf-8")
    digest = hashlib.pbkdf2_hmac("sha256", material, salt, ITERATIONS)
    return f"pbkdf2_sha256\${ITERATIONS}\${salt.hex()}\${digest.hex()}"


def verify_password(password: str, stored: str) -> bool:
    if stored.startswith("sha256$"):
        legacy = stored.removeprefix("sha256$")
        candidate = hashlib.sha256(password.encode("utf-8")).hexdigest()
        return hmac.compare_digest(candidate, legacy)
    algorithm, iterations, salt_hex, digest_hex = stored.split("$")
    if algorithm != "pbkdf2_sha256":
        return False
    material = (password + PEPPER).encode("utf-8")
    candidate = hashlib.pbkdf2_hmac(
        "sha256", material, bytes.fromhex(salt_hex), int(iterations)
    )
    return hmac.compare_digest(candidate, bytes.fromhex(digest_hex))


def login(password: str, stored: str) -> tuple[bool, str, str]:
    if not verify_password(password, stored):
        return False, stored, "denied"
    if stored.startswith("sha256$"):
        return True, hash_password(password), "upgraded"
    return True, stored, "unchanged"


legacy = "sha256$" + hashlib.sha256(b"devatlas-demo").hexdigest()
ok, upgraded, action = login("devatlas-demo", legacy)
print("legacy login:", ok, action, "->", "$".join(upgraded.split("$")[:2]) + "$<salt>$<digest>")
ok, same, action = login("devatlas-demo", upgraded)
print("second login:", ok, action, "-> value unchanged:", same == upgraded)
ok, _, action = login("wrong-password", upgraded)
print("wrong password:", ok, action)
print("pepper loaded from environment:", bool(PEPPER))` },
        output: "legacy login: True upgraded -> pbkdf2_sha256$600000$<salt>$<digest>\nsecond login: True unchanged -> value unchanged: True\nwrong password: False denied\npepper loaded from environment: False",
        pitfalls: ["Rotating the pepper without a migration plan locks every user out; store a pepper id with the hash if you need rotation."],
      },
    },
    capstone: {
      title: "DevAtlas: security review",
      brief: [
        "Produce a security review for your DevAtlas capstone: a request/data-flow sketch, a table of at least eight findings mapped to OWASP 2021 categories, one exploit and one fix per finding, the tests that prove each fix, and an owner plus deadline for the ones you are not fixing this sprint.",
        "Cover the backend surface you actually built: every route that takes an object id, every query built by hand, the password and token handling, configuration differences between local and production, dependencies and their lockfile, logs and alerts, and any endpoint that fetches a URL.",
      ],
      criteria: ["Findings are mapped to A01-A10 with the affected route or file", "Each finding has an exploit, an impact and a concrete fix", "Each fix has a regression test that fails before and passes after", "Dependencies, configuration, logs and outbound requests are all covered", "Unfixed items have an owner, a deadline and a compensating control"],
      hints: ["Start from the data flow, not the scanner output: scanners miss object-level authorization because it needs two users and business context."],
      solution: {
        text: ["A review is done when the fixes are testable and the residual risk is written down. The template below keeps the findings tied to the 2021 map, forces an exploit and a test for each one, and records what is deliberately deferred."],
        code: { lang: "markdown", file: "docs/security-review.md", code: `# DevAtlas security review

Scope: learner API, auth service, progress service, admin export, image importer
Reviewers: backend owner + one engineer who did not build the feature
Date: 2026-10-22 Â· Next review: before the next public launch

## 1. Data flow

Browser -> API gateway -> auth service (tokens) -> learner API -> MySQL
                                      -> progress service -> MongoDB
Admin console -> API gateway -> admin export -> object storage
Learner -> image importer -> outbound HTTPS -> allowlisted image hosts

Trust boundaries: browser/API, API/database, API/cloud metadata, API/third-party host.

## 2. Findings

| # | Finding | OWASP 2021 | Exploit | Fix | Test |
|---|---|---|---|---|---|
| 1 | Invoice detail checks login, not ownership | A01 | Change 1042 to 1043 | Owner-or-admin policy on load; 404 on denial | Two users, same id, expect 404 |
| 2 | Course search concatenates the term | A03 | Quote + UNION reads accounts | Bind the value; allowlist sort column | Payload returns 0 rows |
| 3 | Legacy passwords are unsalted SHA-256 | A02 | Rainbow table on a leaked dump | PBKDF2-SHA256 600k, unique salt, upgrade on login | Hash differs across users; upgrade asserted |
| 4 | Staging debug page reachable in prod | A05 | Stack trace reveals versions and paths | Debug off, generic error handler, config test in CI | Prod request returns 500 without trace |
| 5 | Two-year-old framework with known CVE | A06 | Public exploit against the pinned version | Patch, SBOM, weekly CVE job, 7-day SLA | Build fails on a blocked CVE |
| 6 | No rate limit or MFA on staff login | A07 | Credential stuffing | MFA, per-account delay, generic errors, session rotation | 20 failures trigger lockout and alert |
| 7 | No alert on repeated 404/403 | A09 | Enumeration goes unnoticed | Structured denial log, alert on threshold, redact tokens | Synthetic burst pages on-call |
| 8 | Image importer fetches any URL | A10 | GET 169.254.169.254 metadata | https + host allowlist, pinned IP, no redirects, egress deny | Metadata URL rejected before connect |

## 3. Deferred, with a reason

| Item | Why now | Owner | Deadline | Compensating control |
|---|---|---|---|---|
| Full SBOM in the release pipeline | Tooling migration | Platform | 2026-12-01 | Weekly dependency report, manual CVE check |
| Per-tenant encryption keys | Single tenant today | Backend | 2027-Q1 | Encryption at rest with a managed key, access logged |

## 4. Verification

- Regression tests for findings 1-3 and 8 run on every pull request.
- A configuration check runs against staging and production after deploy.
- The dependency job runs nightly and opens a ticket for any CVSS >= 7.
- A synthetic access-control failure is sent to the log pipeline monthly; on-call must acknowledge the alert.

## 5. Sign-off

Residual risk accepted by: backend owner Â· Date: 2026-10-22
Open critical/high findings: 0 Â· Medium: 2 (both have owners and dates)` },
      },
    },
  },
  deeper: [
    { label: "OWASP Top 10:2021 - the list and the ten category pages", url: "https://owasp.org/Top10/2021/" },
    { label: "OWASP Application Security Verification Standard (ASVS): testable requirements", url: "https://owasp.org/projects/asvs" },
    { label: "OWASP Password Storage Cheat Sheet: Argon2id, scrypt, bcrypt and PBKDF2 parameters", url: "https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html" },
    { label: "OWASP SQL Injection Prevention Cheat Sheet", url: "https://cheatsheetseries.owasp.org/cheatsheets/SQL_Injection_Prevention_Cheat_Sheet.html" },
    { label: "OWASP Server-Side Request Forgery Prevention Cheat Sheet", url: "https://cheatsheetseries.owasp.org/cheatsheets/Server_Side_Request_Forgery_Prevention_Cheat_Sheet.html" },
    { label: "CWE-639: Authorization Bypass Through User-Controlled Key (IDOR)", url: "https://cwe.mitre.org/data/definitions/639.html" },
  ],
  nextPreview: "Next phase: databases in depth. Indexes and query plans: why your site is slow on Friday, and how to read EXPLAIN to fix it.",
};
