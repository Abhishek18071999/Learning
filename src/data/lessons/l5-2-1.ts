import type { Lesson } from "../../types";

export const lesson: Lesson = {
  id: "5.2.1",
  title: "Document modeling and the aggregation pipeline",
  minutes: 75,
  level: "Intermediate",
  prerequisites: ["5.1.3 Data modeling and normalization"],
  summary: "Model data in MongoDB by access pattern: embed vs reference, design documents that grow safely, index for your queries, use the aggregation pipeline for analytics, and decide honestly when a document database beats SQL.",
  terms: [
    { term: "Document", def: "A JSON-like record (stored as BSON) with nested objects and arrays. Documents in a collection can have different shapes." },
    { term: "Collection", def: "A group of documents, roughly like a table." },
    { term: "Embedding", def: "Storing related data inside the parent document (an article's tags or comments)." },
    { term: "Referencing", def: "Storing the id of another document and looking it up separately (like a foreign key, but not enforced)." },
    { term: "Aggregation pipeline", def: "A sequence of stages ($match, $group, $sort, $project, $lookup…) that transform documents, MongoDB's analytics engine." },
    { term: "Schema validation", def: "JSON Schema rules attached to a collection so MongoDB rejects invalid documents." },
  ],
  problem: [
    "DevAtlas stores lesson content (sections, code samples, quizzes, varying per lesson type) and thousands of news articles from different sources with different fields. Squeezing this into rigid relational tables creates dozens of nullable columns or many tiny tables joined on every read.",
    "MongoDB fits content-shaped data read as a whole. But teams that pick MongoDB to 'avoid schemas' often end up with inconsistent documents, unbounded arrays and slow queries. Document modeling is still modeling, just organised around how the app reads and writes.",
  ],
  concept: {
    analogy: [
      "A relational database is a **library card catalogue**: facts split into drawers and cross-referenced. A document database is a **folder per customer**: everything you usually need together is in one folder. Great when you always open the whole folder; awkward when you need to answer questions across all folders, like 'every invoice over $500 from any customer'.",
    ],
    precise: [
      "**Model by access pattern**: data read together is stored together. **Embed** when the child belongs to one parent, is read with it, and is bounded in size (a lesson's sections, an article's tags). **Reference** when data is shared across many parents, is large or unbounded, or changes independently (users, comments that can grow forever).",
      "A single document is updated atomically (and is limited to 16 MB). MongoDB also supports multi-document transactions, but designs that need them constantly are a sign the data is relational.",
      "**Indexes** work like in SQL (B-trees): single field, compound (order matters, the same leftmost-prefix idea as 5.1.1), multikey for arrays, text, TTL (auto-expire documents) and unique. Check plans with `explain()`.",
      "**Choose MongoDB** for flexible, nested, document-shaped data accessed by key or simple filters, content and catalog data, event-ish data with TTLs. **Choose SQL** when data is highly relational, needs complex joins, strict integrity across entities, or heavy ad-hoc reporting. Many companies use both, as DevAtlas does (MySQL for users and progress, MongoDB for content and news).",
    ],
  },
  underTheHood: {
    text: [
      "Documents are stored as BSON (binary JSON with extra types like dates, ObjectId, Decimal128). The WiredTiger storage engine provides document-level concurrency control and compression.",
      "The aggregation pipeline streams documents through stages. Put `$match` (and `$sort` on indexed fields) first so indexes are used and later stages process fewer documents. `$lookup` performs a left outer join, useful occasionally, but heavy use suggests a relational model.",
      "Replica sets provide high availability (one primary, secondaries); sharding distributes collections across machines by a shard key, which must be chosen carefully (lesson 5.4.1).",
    ],
    diagram: {
      title: "Aggregation pipeline",
      nodes: [
        { label: "news collection", sub: "all docs" },
        { label: "$match", sub: "last 7 days (index)" },
        { label: "$unwind", sub: "one doc per tag" },
        { label: "$group", sub: "count by tag" },
        { label: "$sort + $limit", sub: "top 5 tags" },
      ],
      edges: ["", "", "", ""],
    },
  },
  handsOn: [
    {
      title: "Start MongoDB and connect",
      code: {
        lang: "bash",
        code: `docker run -d --name mongo-lab -p 27017:27017 mongo:8
docker exec -it mongo-lab mongosh        # interactive shell
pip install pymongo                      # Python driver for the examples below`,
      },
      notes: ["Use whatever current major MongoDB image tag your team targets; the examples use features available in recent versions."],
    },
    {
      title: "Lesson content: embed what is read together",
      code: {
        lang: "javascript",
        file: "mongosh",
        code: `db.lessons.insertOne({
  _id: "5.2.1",
  title: "Document modeling and the aggregation pipeline",
  level: "Intermediate",
  minutes: 75,
  tags: ["mongodb", "databases", "modeling"],          // bounded array: embed
  sections: [                                           // always rendered together: embed
    { kind: "problem", body: "DevAtlas stores lesson content…" },
    { kind: "handsOn", steps: [{ title: "Start MongoDB", code: "docker run …" }] },
  ],
  quiz: [{ prompt: "Embed or reference?", options: ["Embed", "Reference"], answer: 0 }],
  updatedAt: new Date(),
});

db.lessons.findOne({ _id: "5.2.1" }, { title: 1, minutes: 1, tags: 1 });   // projection
db.lessons.createIndex({ tags: 1 });                    // multikey index on the array
db.lessons.find({ tags: "mongodb" }).explain("executionStats").executionStats.totalDocsExamined;`,
      },
    },
    {
      title: "News articles: references, TTL and schema validation",
      code: {
        lang: "javascript",
        code: `db.createCollection("news", {
  validator: { $jsonSchema: {
    bsonType: "object",
    required: ["url", "title", "source", "publishedAt", "topics"],
    properties: {
      url: { bsonType: "string", pattern: "^https?://" },
      title: { bsonType: "string", minLength: 3 },
      source: { bsonType: "string" },
      publishedAt: { bsonType: "date" },
      topics: { bsonType: "array", items: { bsonType: "string" }, maxItems: 10 },
      points: { bsonType: "int", minimum: 0 },
    },
  } },
});
db.news.createIndex({ url: 1 }, { unique: true });              // dedupe by URL
db.news.createIndex({ topics: 1, publishedAt: -1 });            // "latest in topic" queries
db.news.createIndex({ publishedAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 90 });   // auto-delete after 90 days

// comments are unbounded → separate collection referencing the article
db.comments.insertOne({ newsId: ObjectId(), userId: 42, text: "Great read", createdAt: new Date() });
db.comments.createIndex({ newsId: 1, createdAt: -1 });`,
      },
    },
    {
      title: "Aggregation: trending topics this week (Python)",
      code: {
        lang: "python",
        file: "trending.py",
        code: `from datetime import datetime, timedelta, timezone
from pymongo import MongoClient

client = MongoClient("mongodb://localhost:27017", serverSelectionTimeoutMS=3000)
news = client.devatlas.news

now = datetime.now(timezone.utc)
news.delete_many({})
news.insert_many([
    {"url": f"https://ex.com/{i}", "title": f"Story {i}", "source": "hn",
     "publishedAt": now - timedelta(days=i, hours=12), "topics": topics, "points": 10 * i}
    for i, topics in enumerate([["ai"], ["ai", "rust"], ["db"], ["ai", "db"], ["rust"],
                                ["devops"], ["ai"], ["db"], ["rust", "devops"], ["ai"]])
])

pipeline = [
    {"$match": {"publishedAt": {"$gte": now - timedelta(days=7)}}},    # first: uses an index
    {"$unwind": "$topics"},
    {"$group": {"_id": "$topics", "stories": {"$sum": 1}, "points": {"$sum": "$points"}}},
    {"$sort": {"stories": -1, "points": -1, "_id": 1}},   # _id breaks ties deterministically
    {"$limit": 3},
]
for row in news.aggregate(pipeline):
    print(row)`,
      },
      output: "{'_id': 'ai', 'stories': 4, 'points': 100}\n{'_id': 'db', 'stories': 2, 'points': 50}\n{'_id': 'rust', 'stories': 2, 'points': 50}",
      notes: ["Stories 7, 8 and 9 are older than 7 days and are excluded by $match. db and rust tie on stories and points, so the _id tie-breaker decides their order."],
    },
    {
      title: "Atomic in-place updates",
      code: {
        lang: "javascript",
        code: `// increment counters and push to a bounded array in one atomic document update
db.lessons.updateOne(
  { _id: "5.2.1" },
  {
    $inc: { "stats.views": 1 },
    $push: { recentViewers: { $each: [{ userId: 42, at: new Date() }], $slice: -20 } },   // keep last 20
    $set: { updatedAt: new Date() },
  },
);`,
      },
      notes: ["$slice keeps the array bounded. Unbounded arrays inside documents are a classic MongoDB scaling problem."],
    },
  ],
  companies: [
    "**Content, catalogs and profiles**: CMSs, product catalogs with varying attributes, user profiles/preferences and IoT/event data are common MongoDB workloads, often next to a relational database for transactions.",
    "**Managed services**: MongoDB Atlas, Azure Cosmos DB (with a MongoDB-compatible API) and Amazon DocumentDB (MongoDB-compatible) are popular so teams avoid operating clusters; compatibility varies, so check feature support.",
    "**Polyglot persistence**: companies choose stores per workload: PostgreSQL/MySQL for transactions, MongoDB for documents, Redis for caching, Elasticsearch/OpenSearch for search, a warehouse for analytics.",
  ],
  mistakes: [
    { mistake: "Modeling MongoDB like SQL tables", why: "Familiar habits", wrong: "Many $lookup joins, slow reads, no benefit from documents", fix: "Design documents around read patterns; embed what is read together" },
    { mistake: "Unbounded arrays in a document", why: "Embedding comments or events forever", wrong: "Documents grow toward the 16 MB limit; updates get slow", fix: "Reference unbounded children; bound arrays with $slice" },
    { mistake: "'Schemaless' with no validation", why: "Flexibility", wrong: "Inconsistent fields and types break consumers", fix: "JSON Schema validation and typed models in code" },
    { mistake: "Missing indexes", why: "Small dev data is fast", wrong: "Collection scans (COLLSCAN) in production", fix: "Index query patterns; check explain() for IXSCAN" },
    { mistake: "Choosing MongoDB for highly relational, transactional data", why: "Hype or speed of prototyping", wrong: "Integrity enforced in app code, complex multi-document transactions", fix: "Use a relational database for that part of the system" },
  ],
  bestPractices: [
    { tag: "Maintainability", text: "Document the access patterns each collection serves; validate with JSON Schema." },
    { tag: "Performance", text: "Compound indexes matching filters and sorts; $match early in pipelines; projections to return only needed fields." },
    { tag: "Reliability", text: "Unique indexes for natural keys (url); write concern majority for important writes." },
    { tag: "Cost", text: "TTL indexes to expire old data automatically instead of paying to store it forever." },
  ],
  interview: [
    { q: "When do you embed and when do you reference in MongoDB?", a: "Embed when the data belongs to one parent, is read together with it, and is bounded in size. Reference when it is shared among many documents, unbounded, large, or updated independently. Decide by the application's read and write patterns." },
    { q: "MongoDB vs a relational database?", a: "MongoDB suits flexible, hierarchical, document-shaped data accessed by key or simple filters, scaling horizontally with sharding. Relational databases suit highly related data needing joins, strong integrity constraints, complex transactions and ad-hoc reporting. Many systems use both." },
    { q: "How do you make an aggregation pipeline fast?", a: "Start with $match (and $sort) on indexed fields to reduce documents early, project only needed fields, avoid unnecessary $unwind/$lookup on large sets, and check explain output. For repeated heavy analytics, precompute results or use a warehouse." },
  ],
  quickCheck: [
    {
      kind: "mcq",
      prompt: "A news article can receive thousands of comments over years. How should comments be stored?",
      options: ["Embedded array in the article", "Separate comments collection referencing the article", "A comma-separated string", "In the article's title"],
      answer: 1,
      explanation: "Unbounded, independently changing data should be referenced.",
    },
    {
      kind: "mcq",
      prompt: "Which stage should usually come first in an aggregation pipeline?",
      options: ["$group", "$unwind", "$match on indexed fields", "$out"],
      answer: 2,
      explanation: "Filtering early lets MongoDB use indexes and process fewer documents.",
    },
    {
      kind: "bug",
      prompt: "Queries for the latest stories in a topic are slow; explain() shows COLLSCAN. Index exists on { publishedAt: -1 }. Query: find({ topics: 'ai' }).sort({ publishedAt: -1 }). Best index?",
      options: ["{ title: 1 }", "{ topics: 1, publishedAt: -1 }", "{ publishedAt: 1, topics: 1, url: 1 }", "No index can help"],
      answer: 1,
      explanation: "Equality field first, then the sort field, same as composite indexes in SQL.",
    },
  ],
  cheatSheet: [
    "Model by access pattern: read together → store together.",
    "Embed bounded, owned data; reference shared or unbounded data.",
    "16 MB document limit; single-document updates are atomic.",
    "Compound index: equality fields, then sort/range fields.",
    "Pipeline: $match → $project → $unwind → $group → $sort → $limit.",
    "JSON Schema validation; unique and TTL indexes.",
    "Use SQL where data is relational and integrity-critical.",
  ],
  homework: {
    basic: {
      title: "Model a recipe app",
      brief: ["Design MongoDB collections for recipes (ingredients, steps, tags), users and reviews. Justify each embed/reference choice and write the indexes for: recipes by tag sorted by rating; a user's reviews; top-rated recipes this month."],
      criteria: ["Embed/reference justified per relationship", "Three indexes matching the queries", "Validation schema for recipes"],
      hints: ["Reviews are unbounded; ingredients are bounded."],
      solution: {
        text: ["recipes embeds ingredients and steps (bounded, read together) and a denormalized ratingAvg/ratingCount; reviews is a separate collection {recipeId, userId, stars, text, createdAt}. Indexes: recipes {tags: 1, ratingAvg: -1}; reviews {userId: 1, createdAt: -1}; recipes {createdAt: -1, ratingAvg: -1} or a monthly aggregation over reviews."],
      },
    },
    intermediate: {
      title: "Aggregation report",
      brief: ["Using the news collection, write a pipeline that returns, per source, the number of stories and average points in the last 30 days, only for sources with at least 3 stories, sorted by average points."],
      criteria: ["$match on date first", "$group with $avg", "$match after $group for the threshold"],
      hints: ["A $match after $group filters on computed fields (like HAVING in SQL)."],
      solution: {
        text: ["The second $match acts like SQL's HAVING."],
        code: {
          lang: "python",
          code: `pipeline = [
    {"$match": {"publishedAt": {"$gte": now - timedelta(days=30)}}},
    {"$group": {"_id": "$source", "stories": {"$sum": 1}, "avgPoints": {"$avg": "$points"}}},
    {"$match": {"stories": {"$gte": 3}}},
    {"$sort": {"avgPoints": -1}},
]
print(list(news.aggregate(pipeline)))`,
        },
      },
    },
    challenge: {
      title: "Bucket pattern for metrics",
      brief: ["Store per-minute API latency metrics for 50 services. Compare one document per measurement vs one document per service per hour holding an array of 60 minute-buckets. Estimate document counts, index sizes and query speed for 'last 24h for service X'."],
      criteria: ["Both designs written out", "Back-of-envelope numbers", "Recommendation with trade-offs (or MongoDB time series collections)"],
      hints: ["50 services × 1440 minutes × 30 days."],
      solution: {
        text: [
          "Per-measurement: 50 × 1440 × 30 ≈ 2.16 million documents/month, a large index. Bucketed: 50 × 24 × 30 = 36,000 documents/month, each with a 60-entry array; a 24h query reads 24 documents. MongoDB's native time series collections implement this bucketing automatically and are the recommended choice today.",
        ],
      },
    },
    capstone: {
      title: "DevAtlas: content and news in MongoDB",
      brief: ["Move lesson content and news items into MongoDB (lessons, news, comments collections) with validation, indexes (unique url, topic+date, TTL) and an aggregation endpoint for trending topics. Users and progress stay in MySQL."],
      criteria: ["Schema validation on both collections", "Indexes verified with explain()", "Trending endpoint in the AI or .NET service"],
      hints: ["The Rust ingester (lesson 4.3.1) writes news; the .NET API reads it."],
      solution: {
        text: ["DevAtlas now uses each database for what it is best at; the architecture diagram in /project shows this split."],
      },
    },
  },
  deeper: [
    { label: "MongoDB: Data modeling", url: "https://www.mongodb.com/docs/manual/data-modeling/" },
    { label: "MongoDB: Aggregation pipeline", url: "https://www.mongodb.com/docs/manual/core/aggregation-pipeline/" },
    { label: "MongoDB: Schema validation", url: "https://www.mongodb.com/docs/manual/core/schema-validation/" },
    { label: "MongoDB: Time series collections", url: "https://www.mongodb.com/docs/manual/core/timeseries-collections/" },
  ],
  nextPreview: "Next: Redis caching patterns and pgvector: fast reads and vector search alongside your main database.",
};
