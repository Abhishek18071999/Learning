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
          revision: [],
        },
        {
          id: "principles-design-patterns",
          title: "Design patterns",
          lessonId: "6.1.1",
          revision: [],
        },
        {
          id: "principles-clean-architecture",
          title: "Clean architecture",
          lessonId: "6.1.1",
          revision: [],
        },
        {
          id: "principles-domain-driven-design",
          title: "Domain-driven design",
          revision: [],
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
          revision: [],
        },
        {
          id: "sysdesign-scalability-vertical-vs-horizontal",
          title: "Scalability: vertical vs horizontal",
          lessonId: "6.3.1",
          revision: [],
        },
        {
          id: "sysdesign-load-balancing",
          title: "Load balancing",
          lessonId: "6.3.1",
          revision: [],
        },
        {
          id: "sysdesign-caching-and-cdns",
          title: "Caching and CDNs",
          lessonId: "6.3.1",
          revision: [],
        },
        {
          id: "sysdesign-sql-vs-nosql",
          title: "SQL vs NoSQL",
          revision: [],
        },
        {
          id: "sysdesign-database-replication-and-sharding",
          title: "Database replication and sharding",
          revision: [],
        },
        {
          id: "sysdesign-cap-theorem",
          title: "CAP theorem",
          lessonId: "6.3.1",
          revision: [],
        },
        {
          id: "sysdesign-consistent-hashing",
          title: "Consistent hashing",
          revision: [],
        },
        {
          id: "sysdesign-message-queues-and-event-driven-design",
          title: "Message queues and event-driven design",
          lessonId: "6.2.1",
          revision: [],
        },
        {
          id: "sysdesign-monolith-vs-microservices",
          title: "Monolith vs microservices",
          lessonId: "6.2.1",
          revision: [],
        },
        {
          id: "sysdesign-cqrs-and-event-sourcing",
          title: "CQRS and event sourcing",
          lessonId: "6.2.1",
          revision: [],
        },
        {
          id: "sysdesign-api-gateway",
          title: "API gateway",
          revision: [],
        },
        {
          id: "sysdesign-back-of-the-envelope-estimation",
          title: "Back-of-the-envelope estimation",
          lessonId: "6.3.1",
          revision: [],
        },
        {
          id: "sysdesign-design-a-url-shortener",
          title: "Design a URL shortener",
          lessonId: "6.4.1",
          revision: [],
        },
        {
          id: "sysdesign-design-a-rate-limiter",
          title: "Design a rate limiter",
          lessonId: "6.4.1",
          revision: [],
        },
        {
          id: "sysdesign-design-a-chat-system",
          title: "Design a chat system",
          lessonId: "6.4.1",
          revision: [],
        },
        {
          id: "sysdesign-design-a-news-feed",
          title: "Design a news feed",
          lessonId: "6.4.1",
          revision: [],
        },
      ],
    },
  ],
};
