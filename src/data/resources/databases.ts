import type { ResourceSection } from "../../types";

export const databases: ResourceSection = {
  id: "databases",
  title: "Databases",
  icon: "🗄️",
  tagline: "SQL, MongoDB, Redis and operations",
  phaseId: 5,
  courses: [
    {
      id: "sql",
      title: "SQL and PostgreSQL",
      topics: [
        {
          id: "sql-relational-databases",
          title: "Relational databases",
          revision: [],
        },
        {
          id: "sql-select-filtering-and-sorting",
          title: "SELECT, filtering and sorting",
          revision: [],
        },
        {
          id: "sql-joins",
          title: "Joins",
          revision: [],
        },
        {
          id: "sql-aggregation-and-group-by",
          title: "Aggregation and GROUP BY",
          revision: [],
        },
        {
          id: "sql-subqueries-and-ctes",
          title: "Subqueries and CTEs",
          revision: [],
        },
        {
          id: "sql-window-functions",
          title: "Window functions",
          revision: [],
        },
        {
          id: "sql-indexes",
          title: "Indexes",
          lessonId: "5.1.1",
          revision: [],
        },
        {
          id: "sql-explain-and-query-plans",
          title: "EXPLAIN and query plans",
          lessonId: "5.1.1",
          revision: [],
        },
        {
          id: "sql-transactions-and-acid",
          title: "Transactions and ACID",
          lessonId: "5.1.2",
          revision: [],
        },
        {
          id: "sql-isolation-levels-and-locking",
          title: "Isolation levels and locking",
          lessonId: "5.1.2",
          revision: [],
        },
        {
          id: "sql-normalization",
          title: "Normalization",
          lessonId: "5.1.3",
          revision: [],
        },
        {
          id: "sql-data-modeling-and-er-diagrams",
          title: "Data modeling and ER diagrams",
          lessonId: "5.1.3",
          revision: [],
        },
      ],
    },
    {
      id: "mongodb",
      title: "MongoDB",
      topics: [
        {
          id: "mongodb-mongodb-crud",
          title: "MongoDB CRUD",
          revision: [],
        },
        {
          id: "mongodb-document-modeling-embed-vs-reference",
          title: "Document modeling: embed vs reference",
          lessonId: "5.2.1",
          revision: [],
        },
        {
          id: "mongodb-mongodb-indexes",
          title: "MongoDB indexes",
          revision: [],
        },
        {
          id: "mongodb-aggregation-pipeline",
          title: "Aggregation pipeline",
          lessonId: "5.2.1",
          revision: [],
        },
      ],
    },
    {
      id: "redis",
      title: "Redis and vectors",
      topics: [
        {
          id: "redis-redis-data-types",
          title: "Redis data types",
          revision: [],
        },
        {
          id: "redis-caching-patterns-cache-aside",
          title: "Caching patterns: cache-aside",
          lessonId: "5.3.1",
          revision: [],
        },
        {
          id: "redis-redis-pub-sub-and-streams",
          title: "Redis pub/sub and streams",
          revision: [],
        },
        {
          id: "redis-pgvector",
          title: "pgvector",
          lessonId: "5.3.1",
          revision: [],
        },
      ],
    },
    {
      id: "dbops",
      title: "Database operations",
      topics: [
        {
          id: "dbops-schema-migrations",
          title: "Schema migrations",
          lessonId: "5.4.1",
          revision: [],
        },
        {
          id: "dbops-backups-and-restore",
          title: "Backups and restore",
          lessonId: "5.4.1",
          revision: [],
        },
        {
          id: "dbops-replication",
          title: "Replication",
          lessonId: "5.4.1",
          revision: [],
        },
        {
          id: "dbops-sharding-and-partitioning",
          title: "Sharding and partitioning",
          lessonId: "5.4.1",
          revision: [],
        },
      ],
    },
  ],
};
