import type { Phase } from "../types";

// The full Mentor curriculum. Lessons with full content live in ./lessons and are
// matched by id; every other lesson renders its objectives as a preview.
export const phases: Phase[] = [
  {
    id: 0,
    title: "Foundations",
    tagline: "How computers, the web and your tools really work",
    icon: "🧭",
    weeks: 3,
    areas: ["foundations"],
    modules: [
      {
        id: "0.1",
        title: "How the internet works",
        lessons: [
          { id: "0.1.1", title: "What happens when you type a URL", objectives: ["DNS, TCP, TLS, HTTP end to end", "Read a request in browser DevTools"] },
          { id: "0.1.2", title: "HTTP in depth: methods, status codes, headers, caching", objectives: ["Choose correct methods and status codes", "Use Cache-Control and ETags"] },
        ],
      },
      {
        id: "0.2",
        title: "Linux and the terminal",
        lessons: [
          { id: "0.2.1", title: "The terminal: files, permissions, processes and pipes", objectives: ["Navigate and inspect a server", "Compose commands with pipes"] },
          { id: "0.2.2", title: "Shell scripting and SSH", objectives: ["Write safe bash scripts", "Use SSH keys and config"] },
        ],
      },
      {
        id: "0.3",
        title: "Git and GitHub",
        lessons: [
          { id: "0.3.1", title: "Git: commits, branches, merges and conflicts", objectives: ["Understand the commit graph", "Resolve a merge conflict calmly"] },
          { id: "0.3.2", title: "Team workflow: pull requests and code review", objectives: ["Write a reviewable PR", "Review code like a senior"] },
        ],
      },
      {
        id: "0.4",
        title: "Dev environment",
        lessons: [{ id: "0.4.1", title: "VS Code, package managers and Docker Desktop", objectives: ["Reproducible setup on any OS", "Dev containers basics"] }],
      },
    ],
  },
  {
    id: 1,
    title: "Programming languages",
    tagline: "Python, JavaScript/TypeScript, C# and Rust",
    icon: "⌨️",
    weeks: 8,
    areas: ["programming"],
    modules: [
      {
        id: "1.1",
        title: "Python",
        lessons: [
          { id: "1.1.1", title: "Python essentials: data model, functions and type hints", objectives: ["Mutability and references", "Write typed, testable functions"] },
          { id: "1.1.2", title: "OOP, dataclasses and protocols", objectives: ["Model domains with classes", "Prefer composition"] },
          { id: "1.1.3", title: "Async Python and packaging", objectives: ["asyncio fundamentals", "pyproject.toml and virtual envs"] },
          { id: "1.1.4", title: "Testing with pytest", objectives: ["Fixtures and parametrize", "Mocking boundaries"] },
        ],
      },
      {
        id: "1.2",
        title: "JavaScript and TypeScript",
        lessons: [
          { id: "1.2.1", title: "The event loop, promises and async/await", objectives: ["Predict execution order", "Run async work in parallel safely"] },
          { id: "1.2.2", title: "Closures, scope and modules", objectives: ["Closures in practice", "ES modules"] },
          { id: "1.2.3", title: "TypeScript: types that catch real bugs", objectives: ["Unions and narrowing", "Generics"] },
        ],
      },
      {
        id: "1.3",
        title: "C# and .NET",
        lessons: [
          { id: "1.3.1", title: "C# fundamentals and the .NET runtime", objectives: ["Value vs reference types", "Records and nullability"] },
          { id: "1.3.2", title: "LINQ, generics and async/await", objectives: ["Deferred execution", "Task-based async"] },
          { id: "1.3.3", title: "Dependency injection", objectives: ["Lifetimes: singleton, scoped, transient", "Testable design"] },
        ],
      },
      {
        id: "1.4",
        title: "Rust",
        lessons: [
          { id: "1.4.1", title: "Ownership, borrowing and lifetimes", objectives: ["Why Rust has no GC", "Fix borrow-checker errors"] },
          { id: "1.4.2", title: "Errors, traits and cargo", objectives: ["Result and ?", "Traits and generics"] },
        ],
      },
    ],
  },
  {
    id: 2,
    title: "Data structures and algorithms",
    tagline: "Pattern recognition, not memorisation. Runs alongside every phase",
    icon: "🧮",
    weeks: 12,
    areas: ["dsa"],
    modules: [
      {
        id: "2.1",
        title: "Complexity and hashing",
        lessons: [
          { id: "2.1.1", title: "Big-O and hash maps: from O(n²) to O(n)", objectives: ["Estimate cost before coding", "Spot hash-map problems"] },
          { id: "2.1.2", title: "Two pointers and sliding window", objectives: ["Recognise contiguous-range problems", "Template solutions"] },
        ],
      },
      {
        id: "2.2",
        title: "Linear structures",
        lessons: [
          { id: "2.2.1", title: "Stacks, queues and linked lists", objectives: ["Monotonic stack", "Fast and slow pointers"] },
          { id: "2.2.2", title: "Recursion, sorting and binary search", objectives: ["Binary search on answers", "Merge sort intuition"] },
        ],
      },
      {
        id: "2.3",
        title: "Trees and graphs",
        lessons: [
          { id: "2.3.1", title: "Trees, BSTs and heaps", objectives: ["DFS/BFS on trees", "Top-K with heaps"] },
          { id: "2.3.2", title: "Graphs: BFS, DFS, Dijkstra, union-find", objectives: ["Model problems as graphs", "Shortest paths"] },
          { id: "2.3.3", title: "Tries", objectives: ["Autocomplete", "Prefix search"] },
        ],
      },
      {
        id: "2.4",
        title: "Advanced techniques",
        lessons: [
          { id: "2.4.1", title: "Greedy and backtracking", objectives: ["Prove greedy choices", "Prune search trees"] },
          { id: "2.4.2", title: "Dynamic programming", objectives: ["State, transition, base case", "Top-down vs bottom-up"] },
        ],
      },
    ],
  },
  {
    id: 3,
    title: "Frontend",
    tagline: "Accessible, fast, well-structured user interfaces",
    icon: "🎨",
    weeks: 7,
    areas: ["frontend"],
    modules: [
      { id: "3.1", title: "HTML and accessibility", lessons: [{ id: "3.1.1", title: "Semantic HTML and accessibility", objectives: ["Landmarks and headings", "Keyboard and screen readers"] }] },
      { id: "3.2", title: "CSS", lessons: [{ id: "3.2.1", title: "Box model, flexbox and grid", objectives: ["Layout without hacks", "Responsive design"] }] },
      { id: "3.3", title: "Browser JavaScript", lessons: [{ id: "3.3.1", title: "DOM, events and fetch", objectives: ["Event delegation", "Handle network errors"] }] },
      {
        id: "3.4",
        title: "React with TypeScript",
        lessons: [
          { id: "3.4.1", title: "Components, props and state", objectives: ["Think in components", "Lift state up"] },
          { id: "3.4.2", title: "Hooks and effects done right", objectives: ["When you do not need an effect", "Custom hooks"] },
          { id: "3.4.3", title: "Data fetching, routing and performance", objectives: ["Server state vs UI state", "Memoisation trade-offs"] },
        ],
      },
      { id: "3.5", title: "Frontend security and performance", lessons: [{ id: "3.5.1", title: "XSS, CORS, CSP and Core Web Vitals", objectives: ["Prevent XSS", "Measure LCP, INP, CLS"] }] },
    ],
  },
  {
    id: 4,
    title: "Backend and APIs",
    tagline: "ASP.NET Core, FastAPI and Rust services",
    icon: "🛠️",
    weeks: 8,
    areas: ["backend"],
    modules: [
      {
        id: "4.1",
        title: "ASP.NET Core",
        lessons: [
          { id: "4.1.1", title: "Minimal APIs, middleware and DI", objectives: ["Request pipeline", "Structure a real API"] },
          { id: "4.1.2", title: "EF Core, validation and testing", objectives: ["Migrations", "Integration tests"] },
          { id: "4.1.3", title: "Authentication: JWT, OAuth2 and OIDC", objectives: ["Tokens vs sessions", "Authorisation policies"] },
        ],
      },
      { id: "4.2", title: "FastAPI", lessons: [{ id: "4.2.1", title: "FastAPI for AI and data services", objectives: ["Pydantic models", "Async endpoints"] }] },
      { id: "4.3", title: "Rust services", lessons: [{ id: "4.3.1", title: "Axum for performance-critical services", objectives: ["Handlers and extractors", "Tokio basics"] }] },
      {
        id: "4.4",
        title: "API design and async work",
        lessons: [
          { id: "4.4.1", title: "REST, GraphQL and gRPC; versioning and pagination", objectives: ["Pick the right style", "Cursor pagination"] },
          { id: "4.4.2", title: "Idempotency, rate limiting, queues and caching", objectives: ["Safe retries", "Background jobs"] },
        ],
      },
    ],
  },
  {
    id: 5,
    title: "Databases",
    tagline: "Model data well, query it fast, never lose it",
    icon: "🗄️",
    weeks: 6,
    areas: ["databases"],
    modules: [
      {
        id: "5.1",
        title: "SQL in depth",
        lessons: [
          { id: "5.1.1", title: "Indexes and query plans: why your site is slow on Friday", objectives: ["Read EXPLAIN", "Design composite indexes"] },
          { id: "5.1.2", title: "Transactions, isolation levels and locking", objectives: ["Avoid lost updates", "Deadlocks"] },
          { id: "5.1.3", title: "Data modeling and normalization", objectives: ["Model a real domain", "When to denormalise"] },
        ],
      },
      { id: "5.2", title: "MongoDB", lessons: [{ id: "5.2.1", title: "Document modeling and the aggregation pipeline", objectives: ["Embed vs reference", "When to pick Mongo"] }] },
      { id: "5.3", title: "Redis and vectors", lessons: [{ id: "5.3.1", title: "Redis caching patterns and pgvector", objectives: ["Cache-aside", "Vector indexes"] }] },
      { id: "5.4", title: "Operations", lessons: [{ id: "5.4.1", title: "Migrations, backups, replication and sharding", objectives: ["Zero-downtime migrations", "Restore drills"] }] },
    ],
  },
  {
    id: 6,
    title: "Architecture and system design",
    tagline: "Design systems that survive real traffic",
    icon: "🏛️",
    weeks: 6,
    areas: ["architecture"],
    modules: [
      { id: "6.1", title: "Design principles", lessons: [{ id: "6.1.1", title: "SOLID, patterns and clean architecture", objectives: ["Dependency rule", "Patterns worth knowing"] }] },
      { id: "6.2", title: "Architecture styles", lessons: [{ id: "6.2.1", title: "Monolith, microservices, events and CQRS", objectives: ["Choose by team and domain", "Event-driven trade-offs"] }] },
      { id: "6.3", title: "Scalability", lessons: [{ id: "6.3.1", title: "Scaling, CAP, load balancing and caching layers", objectives: ["Back-of-envelope estimates", "Consistency trade-offs"] }] },
      { id: "6.4", title: "Design cases", lessons: [{ id: "6.4.1", title: "URL shortener, chat, news feed, rate limiter", objectives: ["Interview framework", "Trade-off narration"] }] },
    ],
  },
  {
    id: 7,
    title: "AI engineering",
    tagline: "LLMs, RAG, agents and AI automation in production",
    icon: "🤖",
    weeks: 8,
    areas: ["ai"],
    modules: [
      {
        id: "7.1",
        title: "LLM foundations",
        lessons: [
          { id: "7.1.1", title: "How LLMs work: tokens, embeddings, attention, temperature", objectives: ["Mental model of next-token prediction", "Control cost and randomness"] },
          { id: "7.1.2", title: "Prompt engineering that survives production", objectives: ["Structured prompts", "Few-shot and XML tags"] },
          { id: "7.1.3", title: "Calling LLM APIs: structured output, tools, streaming", objectives: ["Function calling", "Streaming UIs"] },
        ],
      },
      {
        id: "7.2",
        title: "Retrieval-augmented generation",
        lessons: [
          { id: "7.2.1", title: "RAG end to end", objectives: ["Chunk, embed, retrieve, assemble, cite", "Diagnose RAG failures"] },
          { id: "7.2.2", title: "Hybrid search, reranking and RAG evaluation", objectives: ["BM25 + vectors", "Measure retrieval quality"] },
        ],
      },
      {
        id: "7.3",
        title: "Agents and automation",
        lessons: [
          { id: "7.3.1", title: "Agents, tools and MCP", objectives: ["Agent loop", "When a workflow beats an agent"] },
          { id: "7.3.2", title: "Guardrails, evals, cost and observability", objectives: ["Prompt injection defence", "Eval suites"] },
        ],
      },
    ],
  },
  {
    id: 8,
    title: "Cloud: AWS and Azure",
    tagline: "The same ideas on two clouds, side by side",
    icon: "☁️",
    weeks: 6,
    areas: ["cloud"],
    modules: [
      { id: "8.1", title: "Compute", lessons: [{ id: "8.1.1", title: "VMs, functions and containers on AWS and Azure", objectives: ["EC2 vs Azure VMs", "Lambda vs Functions"] }] },
      { id: "8.2", title: "Storage and databases", lessons: [{ id: "8.2.1", title: "S3, Blob, RDS, Azure SQL, DynamoDB, Cosmos DB", objectives: ["Pick a managed store", "Durability vs availability"] }] },
      { id: "8.3", title: "Networking and identity", lessons: [{ id: "8.3.1", title: "VPC/VNet, load balancers, IAM/Entra ID, secrets", objectives: ["Least privilege", "Private networking"] }] },
      { id: "8.4", title: "AI services and cost", lessons: [{ id: "8.4.1", title: "Bedrock, Azure OpenAI and avoiding surprise bills", objectives: ["Budgets and alerts", "Free tiers"] }] },
    ],
  },
  {
    id: 9,
    title: "DevOps and SRE",
    tagline: "Ship safely, run reliably, sleep at night",
    icon: "🚀",
    weeks: 8,
    areas: ["devops"],
    modules: [
      {
        id: "9.1",
        title: "Containers",
        lessons: [
          { id: "9.1.1", title: "Docker in depth: images, layers and multi-stage builds", objectives: ["Small, secure images", "Compose for local stacks"] },
          { id: "9.1.2", title: "Docker Compose for multi-service apps", objectives: ["Networks and volumes", "Healthchecks"] },
        ],
      },
      { id: "9.2", title: "CI/CD", lessons: [{ id: "9.2.1", title: "GitHub Actions and Azure Pipelines", objectives: ["Build, test, deploy", "Secrets in CI"] }] },
      { id: "9.3", title: "Infrastructure as Code", lessons: [{ id: "9.3.1", title: "Terraform", objectives: ["State and modules", "Plan before apply"] }] },
      {
        id: "9.4",
        title: "Kubernetes",
        lessons: [
          { id: "9.4.1", title: "Pods, deployments, services and ingress", objectives: ["Desired state", "Rolling updates"] },
          { id: "9.4.2", title: "Config, secrets and Helm", objectives: ["ConfigMaps and Secrets", "Helm charts"] },
        ],
      },
      { id: "9.5", title: "Observability and security", lessons: [{ id: "9.5.1", title: "Logs, metrics, traces and DevSecOps", objectives: ["OpenTelemetry", "Image and dependency scanning"] }] },
      { id: "9.6", title: "Releases and SRE", lessons: [{ id: "9.6.1", title: "Blue-green, canary, SLOs and postmortems", objectives: ["Safe rollouts", "Error budgets"] }] },
    ],
  },
  {
    id: 10,
    title: "Career",
    tagline: "Turn skills into offers",
    icon: "🎯",
    weeks: 2,
    areas: ["career"],
    modules: [
      { id: "10.1", title: "Portfolio and resume", lessons: [{ id: "10.1.1", title: "Portfolio, resume and GitHub profile", objectives: ["Show impact, not tasks", "README that sells"] }] },
      { id: "10.2", title: "Interviews", lessons: [{ id: "10.2.1", title: "DSA, system design and behavioral interviews", objectives: ["STAR stories", "Think aloud"] }] },
    ],
  },
];

export const allStubs = phases.flatMap((p) => p.modules.flatMap((m) => m.lessons.map((l) => ({ ...l, phase: p, module: m }))));
