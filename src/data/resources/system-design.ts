import type { ResourceSection } from "../../types";

export const systemDesign: ResourceSection = {
  id: "system-design",
  title: "Architecture and system design",
  icon: "🏗️",
  tagline: "Design principles and systems that survive real traffic",
  phaseId: 6,
  courses: [
    {
      id: "principles",
      title: "Design principles",
      topics: [
        {
          id: "principles-solid",
          title: "SOLID",
          lessonId: "6.1.1",
          revision: [
            "SOLID: Single responsibility, Open/closed, Liskov substitution, Interface segregation, Dependency inversion.",
            "SRP: a class should have one reason to change. OCP: open for extension, closed for modification.",
            "LSP: subtypes must be usable wherever the base type is expected without breaking behaviour.",
            "DIP: high-level modules depend on abstractions (interfaces), not on concrete low-level classes.",
          ],
          read: { label: "SOLID Principles with Real Life Examples - GeeksforGeeks", url: "https://www.geeksforgeeks.org/system-design/solid-principle-in-programming-understand-with-real-life-examples/", kind: "article" },
          video: { label: "SOLID Principles In Java explained in Hindi (हिंदी) | Single Responsibility Principle code examples", url: "https://www.youtube.com/watch?v=HtZCbqx-5Ac", channel: "AndroJavaTech4U", lang: "Hindi" },
        },
        {
          id: "principles-design-patterns",
          title: "Design patterns",
          lessonId: "6.1.1",
          revision: [
            "GoF patterns fall into three groups: creational (Singleton, Factory, Builder), structural (Adapter, Decorator), behavioural (Strategy, Observer).",
            "Strategy swaps an algorithm behind an interface; Observer notifies subscribers when a subject changes.",
            "Decorator adds behaviour by wrapping an object that shares the same interface, instead of subclassing.",
            "Use a pattern to solve a real recurring problem, not for its own sake.",
          ],
          video: { label: "Design Patterns Tutorial in Hindi", url: "https://www.youtube.com/playlist?list=PL0zysOflRCek8kmc_jYl_6C7tpud7U2V_", channel: "Learn Code With Durgesh", lang: "Hindi" },
        },
        {
          id: "principles-clean-architecture",
          title: "Clean architecture",
          lessonId: "6.1.1",
          revision: [
            "Clean architecture arranges code in concentric layers: entities, use cases, interface adapters, frameworks and drivers.",
            "Dependency rule: source code dependencies point only inward, toward business rules.",
            "Frameworks, UI and databases are details at the outer edge, so business logic can be tested without them.",
          ],
          read: { label: "The Clean Architecture - Clean Coder Blog (Uncle Bob)", url: "https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html", kind: "article" },
        },
        {
          id: "principles-domain-driven-design",
          title: "Domain-driven design",
          revision: [
            "DDD centres the software model on the business domain, built together with domain experts.",
            "Ubiquitous language: one shared vocabulary used in code and conversation within a bounded context.",
            "Bounded context: an explicit boundary inside which a model and its terms have one meaning.",
            "Aggregates group entities and value objects behind one root that guards consistency.",
          ],
        },
      ],
    },
    {
      id: "sysdesign",
      title: "System design",
      topics: [
        {
          id: "sysdesign-how-to-approach-a-system-design-interview",
          title: "How to approach a system design interview",
          lessonId: "6.4.1",
          revision: [
            "Steps: clarify requirements and scope, estimate scale, sketch a high-level design, then deep-dive into key components.",
            "Call out bottlenecks and trade-offs explicitly; there is rarely one right answer.",
            "Separate functional requirements (what it does) from non-functional ones (latency, availability, scale).",
          ],
          read: { label: "System Design Primer: How to approach a system design interview question", url: "https://github.com/donnemartin/system-design-primer/blob/master/README.md#how-to-approach-a-system-design-interview-question", kind: "repo" },
        },
        {
          id: "sysdesign-scalability-vertical-vs-horizontal",
          title: "Scalability: vertical vs horizontal",
          lessonId: "6.3.1",
          revision: [
            "Vertical scaling adds CPU/RAM to one machine: simple, but has a hard ceiling and a single point of failure.",
            "Horizontal scaling adds more machines behind a load balancer; works best with stateless app servers.",
            "A system is scalable if adding resources gives a proportional increase in throughput.",
          ],
          read: { label: "System Design Primer: Horizontal scaling", url: "https://github.com/donnemartin/system-design-primer/blob/master/README.md#horizontal-scaling", kind: "repo" },
        },
        {
          id: "sysdesign-load-balancing",
          title: "Load balancing",
          lessonId: "6.3.1",
          revision: [
            "A load balancer spreads requests across servers and removes unhealthy ones via health checks.",
            "Common algorithms: round robin, weighted round robin, least connections, IP/consistent hash.",
            "Layer 4 balancers route on IP/port; layer 7 balancers can route on URL, headers or cookies.",
          ],
          read: { label: "System Design Primer: Load balancer", url: "https://github.com/donnemartin/system-design-primer/blob/master/README.md#load-balancer", kind: "repo" },
        },
        {
          id: "sysdesign-caching-and-cdns",
          title: "Caching and CDNs",
          lessonId: "6.3.1",
          revision: [
            "Cache-aside: app reads cache, on miss loads from DB and fills cache; write-through and write-behind are alternatives.",
            "Eviction policies like LRU and TTLs keep caches bounded; invalidation is the hard part.",
            "A CDN serves static (and some dynamic) content from edge servers near users to cut latency.",
          ],
          read: { label: "System Design Primer: Cache", url: "https://github.com/donnemartin/system-design-primer/blob/master/README.md#cache", kind: "repo" },
        },
        {
          id: "sysdesign-sql-vs-nosql",
          title: "SQL vs NoSQL",
          revision: [
            "SQL databases give schemas, joins and ACID transactions; good for relational, consistent data.",
            "NoSQL types: key-value, document, wide-column, graph; often favour scale and flexible schemas (BASE).",
            "Choose by access patterns, consistency needs and scale, not by fashion.",
          ],
          read: { label: "System Design Primer: SQL or NoSQL", url: "https://github.com/donnemartin/system-design-primer/blob/master/README.md#sql-or-nosql", kind: "repo" },
        },
        {
          id: "sysdesign-database-replication-and-sharding",
          title: "Database replication and sharding",
          revision: [
            "Replication copies data to other nodes: leader-follower scales reads; multi-leader adds write availability but conflicts.",
            "Sharding splits data across nodes by a shard key so each node holds a subset.",
            "A bad shard key causes hot spots; cross-shard joins and rebalancing add complexity.",
          ],
          read: { label: "System Design Primer: Sharding", url: "https://github.com/donnemartin/system-design-primer/blob/master/README.md#sharding", kind: "repo" },
        },
        {
          id: "sysdesign-cap-theorem",
          title: "CAP theorem",
          lessonId: "6.3.1",
          revision: [
            "CAP: during a network partition a distributed system must choose consistency or availability.",
            "CP systems may reject requests to stay consistent; AP systems answer but may return stale data.",
            "Partitions are unavoidable in practice, so the real choice is C vs A when one happens.",
          ],
          read: { label: "System Design Primer: CAP theorem", url: "https://github.com/donnemartin/system-design-primer/blob/master/README.md#cap-theorem", kind: "repo" },
        },
        {
          id: "sysdesign-consistent-hashing",
          title: "Consistent hashing",
          revision: [
            "Consistent hashing maps keys and nodes onto a ring; a key belongs to the next node clockwise.",
            "Adding or removing a node only moves about 1/N of the keys instead of nearly all of them.",
            "Virtual nodes spread load more evenly across physical servers.",
          ],
        },
        {
          id: "sysdesign-message-queues-and-event-driven-design",
          title: "Message queues and event-driven design",
          lessonId: "6.2.1",
          revision: [
            "Message queues decouple producers from consumers and absorb traffic spikes (e.g. RabbitMQ, SQS, Kafka).",
            "Event-driven systems publish events that many services react to asynchronously.",
            "Plan for at-least-once delivery: make consumers idempotent and handle retries and dead-letter queues.",
          ],
          read: { label: "System Design Primer: Message queues", url: "https://github.com/donnemartin/system-design-primer/blob/master/README.md#message-queues", kind: "repo" },
        },
        {
          id: "sysdesign-monolith-vs-microservices",
          title: "Monolith vs microservices",
          lessonId: "6.2.1",
          revision: [
            "A monolith is one deployable unit: simple to build and debug, harder to scale teams and parts independently.",
            "Microservices are small independently deployable services that talk over the network.",
            "Microservices add network latency, distributed failures and ops overhead; start monolith-first if unsure.",
          ],
          read: { label: "System Design Primer: Microservices", url: "https://github.com/donnemartin/system-design-primer/blob/master/README.md#microservices", kind: "repo" },
        },
        {
          id: "sysdesign-cqrs-and-event-sourcing",
          title: "CQRS and event sourcing",
          lessonId: "6.2.1",
          revision: [
            "CQRS separates the write model (commands) from the read model (queries) so each can be optimised.",
            "Event sourcing stores every state change as an immutable event; current state is rebuilt by replaying events.",
            "Read models are often eventually consistent with the write side.",
          ],
        },
        {
          id: "sysdesign-api-gateway",
          title: "API gateway",
          revision: [
            "An API gateway is a single entry point that routes requests to backend services.",
            "It commonly handles auth, rate limiting, TLS termination, request aggregation and logging.",
            "It can become a bottleneck or single point of failure, so run it redundantly.",
          ],
        },
        {
          id: "sysdesign-back-of-the-envelope-estimation",
          title: "Back-of-the-envelope estimation",
          lessonId: "6.3.1",
          revision: [
            "Estimate QPS from daily active users: requests/day divided by ~86,400 seconds (~10^5).",
            "Know latency orders: memory ~100 ns, SSD read ~100 us, cross-region round trip ~100+ ms.",
            "Estimate storage as items/day x size x retention, and round numbers aggressively.",
          ],
          read: { label: "System Design Primer: Back-of-the-envelope calculations", url: "https://github.com/donnemartin/system-design-primer/blob/master/README.md#back-of-the-envelope-calculations", kind: "repo" },
        },
        {
          id: "sysdesign-design-a-url-shortener",
          title: "Design a URL shortener",
          lessonId: "6.4.1",
          revision: [
            "Core: map a short code to a long URL; reads vastly outnumber writes, so cache hot codes.",
            "Generate codes with base62 encoding of an ID or a hash, handling collisions.",
            "Use a 301/302 redirect; add expiry, analytics and abuse protection as extras.",
          ],
        },
        {
          id: "sysdesign-design-a-rate-limiter",
          title: "Design a rate limiter",
          lessonId: "6.4.1",
          revision: [
            "Algorithms: token bucket, leaky bucket, fixed window counter, sliding window log/counter.",
            "Store counters in a fast shared store like Redis so all servers see the same limits.",
            "Return HTTP 429 Too Many Requests with headers telling clients when to retry.",
          ],
        },
        {
          id: "sysdesign-design-a-chat-system",
          title: "Design a chat system",
          lessonId: "6.4.1",
          revision: [
            "Use persistent connections (WebSockets) so the server can push messages in real time.",
            "Store messages per conversation ordered by time/ID; a wide-column or key-value store fits well.",
            "Track presence with heartbeats and send push notifications to offline users.",
          ],
        },
        {
          id: "sysdesign-design-a-news-feed",
          title: "Design a news feed",
          lessonId: "6.4.1",
          revision: [
            "Fan-out on write pushes posts into followers' feeds; fast reads but costly for celebrities.",
            "Fan-out on read builds the feed at request time; a hybrid handles high-follower accounts.",
            "Cache feeds and rank posts; paginate with cursors.",
          ],
        },
      ],
    },
  ],
};
