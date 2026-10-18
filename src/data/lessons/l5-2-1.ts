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
        text: [
          "recipes embeds ingredients and steps (bounded, read together) and a denormalized ratingAvg/ratingCount; reviews is a separate collection {recipeId, userId, stars, text, createdAt}. Indexes: recipes {tags: 1, ratingAvg: -1}; reviews {userId: 1, createdAt: -1}; recipes {createdAt: -1, ratingAvg: -1} or a monthly aggregation over reviews.",
          "Users are referenced, not embedded: one user writes many recipes and reviews, and a name change must not touch thousands of documents. Reviews are referenced because they grow without limit and are listed per user, which an array inside a recipe could not serve.",
          "'Top-rated this month' is read as 'best average stars from reviews written this month', so it is an aggregation over reviews that starts with $match on the createdAt index and joins only the top 3 recipe titles with $lookup. A unique index on (recipeId, userId) enforces one review per user per recipe, and the rating counters on the recipe are updated with an update pipeline, so the count, sum and average change in one atomic write.",
          "The script checks every claim: the validator rejects a recipe with no ingredients (code 121), a second review by the same user fails (11000), and explain() shows each query using its index.",
        ],
        code: {
          lang: "javascript",
          file: "recipes.js",
          code: `// Recipe app model. Run once on an empty database: mongosh "mongodb://localhost:27017/recipes" --quiet recipes.js
// recipes: ingredients and steps are bounded and always shown with the recipe -> embedded
// reviews: unbounded, written by other users, listed per user -> separate collection
// users: shared by recipes and reviews -> separate collection, referenced by _id
db.createCollection("users", { validator: { $jsonSchema: {
  bsonType: "object", required: ["name", "email"],
  properties: { name: { bsonType: "string" }, email: { bsonType: "string", pattern: "^[^@\\\\s]+@[^@\\\\s]+$" } },
} } });
db.createCollection("recipes", { validator: { $jsonSchema: {
  bsonType: "object",
  required: ["title", "authorId", "tags", "ingredients", "steps", "ratingCount", "ratingSum", "createdAt"],
  properties: {
    title: { bsonType: "string", minLength: 3 },
    authorId: { bsonType: "objectId" },
    tags: { bsonType: "array", items: { bsonType: "string" }, maxItems: 10 },
    ingredients: { bsonType: "array", minItems: 1, maxItems: 50, items: {
      bsonType: "object", required: ["name", "qty", "unit"],
      properties: { name: { bsonType: "string" }, qty: { bsonType: ["int", "double"], minimum: 0 }, unit: { bsonType: "string" } },
    } },
    steps: { bsonType: "array", minItems: 1, maxItems: 40, items: { bsonType: "string" } },
    ratingCount: { bsonType: "int", minimum: 0 },          // denormalized from reviews,
    ratingSum: { bsonType: "int", minimum: 0 },            // updated atomically with $inc
    ratingAvg: { bsonType: ["double", "int"], minimum: 0, maximum: 5 },
    createdAt: { bsonType: "date" },
  },
} } });
db.createCollection("reviews", { validator: { $jsonSchema: {
  bsonType: "object", required: ["recipeId", "userId", "stars", "createdAt"],
  properties: { recipeId: { bsonType: "objectId" }, userId: { bsonType: "objectId" },
                stars: { bsonType: "int", minimum: 1, maximum: 5 }, createdAt: { bsonType: "date" } },
} } });

db.users.createIndex({ email: 1 }, { unique: true });
db.recipes.createIndex({ tags: 1, ratingAvg: -1 });                   // Q1: by tag, best rated first
db.reviews.createIndex({ userId: 1, createdAt: -1 });                // Q2: a user's reviews, newest first
db.reviews.createIndex({ createdAt: -1 });                           // Q3: reviews written this month
db.reviews.createIndex({ recipeId: 1, userId: 1 }, { unique: true }); // one review per user per recipe

// ---- sample data ----
const [asha, ravi, meera] = Object.values(db.users.insertMany([
  { name: "Asha", email: "asha@example.com" }, { name: "Ravi", email: "ravi@example.com" },
  { name: "Meera", email: "meera@example.com" }]).insertedIds);
const recipe = (title, tags) => ({ title, authorId: asha, tags, ratingCount: 0, ratingSum: 0, ratingAvg: 0,
  ingredients: [{ name: "rice", qty: 200, unit: "g" }], steps: ["Rinse", "Cook"], createdAt: ISODate("2026-09-01") });
const [dal, biryani, salad] = Object.values(db.recipes.insertMany([
  recipe("Dal tadka", ["vegetarian", "quick"]), recipe("Veg biryani", ["vegetarian"]),
  recipe("Green salad", ["vegan", "quick"])]).insertedIds);

function addReview(recipeId, userId, stars, createdAt) {
  db.reviews.insertOne({ recipeId, userId, stars: NumberInt(stars), createdAt });
  db.recipes.updateOne({ _id: recipeId }, [                         // pipeline update: one atomic document write
    { $set: { ratingCount: { $add: ["$ratingCount", 1] }, ratingSum: { $add: ["$ratingSum", stars] } } },
    { $set: { ratingAvg: { $round: [{ $divide: ["$ratingSum", "$ratingCount"] }, 2] } } },
  ]);
}
addReview(dal, ravi, 5, ISODate("2026-10-02")); addReview(dal, meera, 4, ISODate("2026-10-05"));
addReview(biryani, ravi, 3, ISODate("2026-09-20")); addReview(biryani, meera, 5, ISODate("2026-10-11"));
addReview(salad, ravi, 4, ISODate("2026-10-12"));

try { db.recipes.insertOne({ title: "No steps", authorId: asha, tags: [], ingredients: [], steps: [],
                             ratingCount: 0, ratingSum: 0, createdAt: new Date() }); }
catch (e) { print("invalid recipe rejected, code", e.code); }          // 121 DocumentValidationFailure
try { addReview(dal, ravi, 1, ISODate("2026-10-15")); } catch (e) { print("second review rejected, code", e.code); }  // 11000 duplicate key

// ---- the three queries, each with the index it uses ----
const usedIndexes = (plan) => [...JSON.stringify(plan).matchAll(/"indexName":"([^"]+)"/g)].map((m) => m[1]).join(", ");
const q1 = db.recipes.find({ tags: "vegetarian" }, { title: 1, ratingAvg: 1, _id: 0 }).sort({ ratingAvg: -1 });
printjson(q1.toArray());
print("Q1 uses", usedIndexes(q1.explain().queryPlanner.winningPlan));

const q2 = db.reviews.find({ userId: ravi }, { stars: 1, createdAt: 1, _id: 0 }).sort({ createdAt: -1 });
printjson(q2.toArray().map((r) => \`\${r.createdAt.toISOString().slice(0, 10)} \${r.stars}*\`));
print("Q2 uses", usedIndexes(q2.explain().queryPlanner.winningPlan));

const monthStart = ISODate("2026-10-01");                           // new Date(y, m, 1) in the app
const q3 = [
  { $match: { createdAt: { $gte: monthStart } } },
  { $group: { _id: "$recipeId", avgStars: { $avg: "$stars" }, reviews: { $sum: 1 } } },
  { $sort: { avgStars: -1, reviews: -1, _id: 1 } },
  { $limit: 3 },
  { $lookup: { from: "recipes", localField: "_id", foreignField: "_id", as: "r" } },
  { $project: { _id: 0, title: { $first: "$r.title" }, avgStars: 1, reviews: 1 } },
];
printjson(db.reviews.aggregate(q3).toArray());
print("Q3 uses", usedIndexes(db.reviews.explain().aggregate(q3)));`,
        },
        output: "invalid recipe rejected, code 121\nsecond review rejected, code 11000\n[\n  {\n    title: 'Dal tadka',\n    ratingAvg: 4.5\n  },\n  {\n    title: 'Veg biryani',\n    ratingAvg: 4\n  }\n]\nQ1 uses tags_1_ratingAvg_-1\n[\n  '2026-10-12 4*',\n  '2026-10-02 5*',\n  '2026-09-20 3*'\n]\nQ2 uses userId_1_createdAt_-1\n[\n  {\n    avgStars: 5,\n    reviews: 1,\n    title: 'Veg biryani'\n  },\n  {\n    avgStars: 4.5,\n    reviews: 2,\n    title: 'Dal tadka'\n  },\n  {\n    avgStars: 4,\n    reviews: 1,\n    title: 'Green salad'\n  }\n]\nQ3 uses createdAt_-1",
        pitfalls: [
          "Embedding reviews in the recipe: popular recipes grow without bound, and 'all reviews by Ravi' has to scan every recipe",
          "Recomputing ratingAvg by reading reviews on every page view instead of keeping the counters on the recipe",
        ],
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
          "The script loads 3 days of identical data into all three designs and scales the counts to 30 days. Design A is one small document per minute with an index on (service, ts). Design B is one document per service per hour (`_id` like `svc-07:2026100314`) with a `minutes` array of 60 entries plus pre-aggregates such as maxP99; the ingester appends with `$push` and `$inc` in an upsert, so each document is written 60 times and then never again. Design C is a time series collection with metaField = service.",
          "Measured on MongoDB 8: the per-minute design stores 16.5 MB of BSON and a 4.4 MB index for 3 days (about 44 MB of index per month), and 'last 24 h for svc-07' examines 1,440 documents. Buckets store about half the bytes (field names are not repeated per minute), the index is about 30× smaller (140 KB against 4.6 MB), and the same query examines 24 documents. The query took about 8 ms with per-minute documents, 1.3 ms with buckets and 4 ms with the time series collection on the test machine (timings vary, so they are not in the output).",
          "Recommendation: use a time series collection. It does the bucketing and column compression for you (1.2 MB of BSON instead of 16.5 MB here), still accepts one-document-per-measurement inserts, and supports TTL through expireAfterSeconds. Hand-rolled buckets remain useful when you need custom pre-aggregates in each bucket, or on platforms without time series support. The trade-off of both: updating or deleting an individual measurement is awkward.",
        ],
        code: {
          lang: "python",
          file: "buckets.py",
          code: `"""Per-minute latency metrics for 50 services: one document per measurement vs hourly buckets vs time series."""
import os
import random
from datetime import datetime, timedelta, timezone

from pymongo import ASCENDING, DESCENDING, MongoClient

SERVICES, DAYS = 50, 3                      # 3 days loaded, then scaled to 30 days
START = datetime(2026, 10, 1, tzinfo=timezone.utc)
END = START + timedelta(days=DAYS)
db = MongoClient(os.environ.get("MONGO_URL", "mongodb://localhost:27017"), tz_aware=True).metrics_lab

def measurements():
    rnd = random.Random(1)
    for minute in range(DAYS * 24 * 60):
        ts = START + timedelta(minutes=minute)
        for s in range(SERVICES):
            yield {"service": f"svc-{s:02d}", "ts": ts, "p50": round(rnd.uniform(5, 40), 1), "p99": round(rnd.uniform(50, 400), 1)}

def load() -> None:
    for name in ("raw", "buckets", "ts"):
        db.drop_collection(name)
    db.create_collection("ts", timeseries={"timeField": "ts", "metaField": "service", "granularity": "minutes"})
    db.raw.create_index([("service", ASCENDING), ("ts", DESCENDING)])
    db.buckets.create_index([("service", ASCENDING), ("hour", DESCENDING)])
    rows = list(measurements())
    db.raw.insert_many(rows, ordered=False)
    db.ts.insert_many(rows, ordered=False)
    buckets: dict[tuple, dict] = {}
    for r in rows:  # in production the ingester does: update_one({_id}, {$push: {minutes: ...}, $inc: ...}, upsert=True)
        hour = r["ts"].replace(minute=0)
        b = buckets.setdefault((r["service"], hour), {"_id": f'{r["service"]}:{hour:%Y%m%d%H}', "service": r["service"],
                                                       "hour": hour, "count": 0, "maxP99": 0.0, "minutes": []})
        b["minutes"].append({"m": r["ts"].minute, "p50": r["p50"], "p99": r["p99"]})
        b["count"] += 1
        b["maxP99"] = max(b["maxP99"], r["p99"])               # pre-aggregates make dashboards cheap
    db.buckets.insert_many(list(buckets.values()), ordered=False)

def stats(name: str) -> dict:
    return next(db[name].aggregate([{"$collStats": {"storageStats": {}}}]))["storageStats"]

def last_24h(name: str, filt: dict) -> tuple[int, int]:
    n = db[name].count_documents(filt)
    # documents the server had to read; time series collections read internal compressed buckets instead
    examined = db[name].find(filt).explain()["executionStats"]["totalDocsExamined"] if name != "ts" else -1
    return n, examined

if __name__ == "__main__":
    load()
    db.client.admin.command("fsync")     # flush a checkpoint so on-disk sizes are reported
    since = END - timedelta(hours=24)
    print(f"{'design':<10}{'docs (3 d)':>11}{'docs (30 d)':>12}{'BSON MB':>9}{'disk MB':>9}{'index MB':>9}"
          f"{'24h docs':>9}{'examined':>9}")
    for name, filt in (("raw", {"service": "svc-07", "ts": {"$gte": since}}),
                       ("buckets", {"service": "svc-07", "hour": {"$gte": since}}),
                       ("ts", {"service": "svc-07", "ts": {"$gte": since}})):
        st = stats(name)
        count = db[name].count_documents({})
        n, examined = last_24h(name, filt)
        print(f"{name:<10}{count:>11,}{count * 30 // DAYS:>12,}{st.get('size', 0) / 2**20:>9.1f}{st.get('storageSize', 0) / 2**20:>9.1f}"
              f"{st.get('totalIndexSize', 0) / 2**20:>9.1f}{n:>9}{examined if examined >= 0 else 'n/a':>9}")
    db.client.drop_database("metrics_lab")`,
        },
        output: "design     docs (3 d) docs (30 d)  BSON MB  disk MB index MB 24h docs examined\nraw           216,000   2,160,000     16.5      6.2      4.4     1440     1440\nbuckets         3,600      36,000      9.0      3.3      0.1       24       24\nts            216,000   2,160,000      1.2      0.7      0.0     1440      n/a",
        pitfalls: [
          "Unbounded buckets (one document per service per day of seconds): bound each bucket by time and count",
          "Comparing designs by document count only: look at index size too, because the working set (hot index pages) must fit in RAM",
        ],
      },
    },
    capstone: {
      title: "DevAtlas: content and news in MongoDB",
      brief: ["Move lesson content and news items into MongoDB (lessons, news, comments collections) with validation, indexes (unique url, topic+date, TTL) and an aggregation endpoint for trending topics. Users and progress stay in MySQL."],
      criteria: ["Schema validation on both collections", "Indexes verified with explain()", "Trending endpoint in the AI or .NET service"],
      hints: ["The Rust ingester (lesson 4.3.1) writes news; the .NET API reads it."],
      solution: {
        text: [
          "DevAtlas now uses each database for what it is best at; the architecture diagram in /project shows this split.",
          "migrate() is idempotent: it creates each collection with its JSON Schema validator, or updates the validator with collMod if the collection already exists, then creates the indexes (create_index is a no-op when an identical index exists). Run it from the service's deploy step, like a SQL migration.",
          "news gets three indexes, one per access pattern: unique url (the Rust ingester can retry safely; duplicates fail with 11000), (topics, publishedAt desc) for 'latest in topic', and a TTL index on publishedAt that deletes stories after 90 days and also serves the trending pipeline's $match range. Comments live in their own collection, indexed by (newsId, createdAt).",
          "The `__main__` block is the verification: it seeds the same ten stories as the hands-on, shows the validator and the unique index rejecting bad documents, calls both endpoints through FastAPI's TestClient, and prints which index explain() chose for each query. In production run it with `uvicorn content_store:app`; the .NET API can call /trending or run the same pipeline with the C# driver.",
        ],
        code: {
          lang: "python",
          file: "content_store.py",
          code: `"""DevAtlas AI service: lesson content and news in MongoDB, with a trending-topics endpoint (FastAPI)."""
import os
from datetime import datetime, timedelta, timezone

from fastapi import FastAPI, Query
from pymongo import ASCENDING, DESCENDING, MongoClient
from pymongo.database import Database

client = MongoClient(os.environ.get("MONGO_URL", "mongodb://localhost:27017"), tz_aware=True)
db = client[os.environ.get("MONGO_DB", "devatlas")]

SCHEMAS = {
    "lessons": {"bsonType": "object", "required": ["_id", "title", "level", "minutes", "sections", "updatedAt"],
                "properties": {"_id": {"bsonType": "string", "pattern": r"^\\d+\\.\\d+\\.\\d+$"},
                               "title": {"bsonType": "string", "minLength": 3},
                               "level": {"enum": ["Beginner", "Intermediate", "Advanced"]},
                               "minutes": {"bsonType": "int", "minimum": 5, "maximum": 240},
                               "tags": {"bsonType": "array", "items": {"bsonType": "string"}, "maxItems": 10},
                               "sections": {"bsonType": "array", "maxItems": 30},
                               "updatedAt": {"bsonType": "date"}}},
    "news": {"bsonType": "object", "required": ["url", "title", "source", "publishedAt", "topics"],
             "properties": {"url": {"bsonType": "string", "pattern": "^https?://"},
                            "title": {"bsonType": "string", "minLength": 3},
                            "source": {"bsonType": "string"},
                            "publishedAt": {"bsonType": "date"},
                            "topics": {"bsonType": "array", "items": {"bsonType": "string"}, "maxItems": 10},
                            "points": {"bsonType": "int", "minimum": 0}}},
    "comments": {"bsonType": "object", "required": ["newsId", "userId", "text", "createdAt"],
                 "properties": {"newsId": {"bsonType": "objectId"}, "userId": {"bsonType": "int"},
                                "text": {"bsonType": "string", "minLength": 1, "maxLength": 2000},
                                "createdAt": {"bsonType": "date"}}},
}

def migrate(database: Database) -> None:
    """Idempotent: create collections with validators (or update them) and the indexes."""
    existing = set(database.list_collection_names())
    for name, schema in SCHEMAS.items():
        if name in existing:
            database.command("collMod", name, validator={"$jsonSchema": schema}, validationLevel="strict")
        else:
            database.create_collection(name, validator={"$jsonSchema": schema})
    database.lessons.create_index([("tags", ASCENDING)])
    database.news.create_index([("url", ASCENDING)], unique=True)                          # dedupe the ingester
    database.news.create_index([("topics", ASCENDING), ("publishedAt", DESCENDING)])      # latest in a topic
    database.news.create_index([("publishedAt", ASCENDING)], expireAfterSeconds=90 * 86400)   # TTL + trending range
    database.comments.create_index([("newsId", ASCENDING), ("createdAt", DESCENDING)])

def trending_pipeline(since: datetime, limit: int) -> list[dict]:
    return [
        {"$match": {"publishedAt": {"$gte": since}}},          # first, so the publishedAt index is used
        {"$unwind": "$topics"},
        {"$group": {"_id": "$topics", "stories": {"$sum": 1}, "points": {"$sum": "$points"}}},
        {"$sort": {"stories": -1, "points": -1, "_id": 1}},     # _id breaks ties deterministically
        {"$limit": limit},
        {"$project": {"_id": 0, "topic": "$_id", "stories": 1, "points": 1}},
    ]

app = FastAPI(title="DevAtlas content service")

@app.get("/trending")
def trending(days: int = Query(7, ge=1, le=90), limit: int = Query(5, ge=1, le=20)) -> list[dict]:
    since = datetime.now(timezone.utc) - timedelta(days=days)
    return list(db.news.aggregate(trending_pipeline(since, limit)))

@app.get("/news")
def latest_in_topic(topic: str, limit: int = Query(10, ge=1, le=50)) -> list[dict]:
    cursor = db.news.find({"topics": topic}, {"_id": 0, "title": 1, "url": 1}).sort("publishedAt", -1).limit(limit)
    return list(cursor)

def index_used(explain: dict) -> list[str]:
    found: list[str] = []
    def walk(node):
        if isinstance(node, dict):
            if "indexName" in node:
                found.append(node["indexName"])
            for v in node.values():
                walk(v)
        elif isinstance(node, list):
            for v in node:
                walk(v)
    walk(explain)
    return sorted(set(found))

if __name__ == "__main__":                                       # self-check: python content_store.py
    from fastapi.testclient import TestClient
    from pymongo.errors import DuplicateKeyError, WriteError

    migrate(db)
    db.news.delete_many({})
    now = datetime.now(timezone.utc)
    db.news.insert_many([
        {"url": f"https://ex.com/{i}", "title": f"Story {i}", "source": "hn", "points": 10 * i,
         "publishedAt": now - timedelta(days=i, hours=12), "topics": topics}
        for i, topics in enumerate([["ai"], ["ai", "rust"], ["db"], ["ai", "db"], ["rust"],
                                    ["devops"], ["ai"], ["db"], ["rust", "devops"], ["ai"]])])
    db.lessons.replace_one({"_id": "5.2.1"}, {"_id": "5.2.1", "title": "Document modeling", "level": "Intermediate",
                                              "minutes": 75, "tags": ["mongodb"], "sections": [], "updatedAt": now},
                           upsert=True)
    for bad in ({"url": "https://ex.com/1", "title": "Dup", "source": "hn", "publishedAt": now, "topics": []},
                {"url": "ftp://x", "title": "Bad url", "source": "hn", "publishedAt": now, "topics": []}):
        try:
            db.news.insert_one(bad)
        except (DuplicateKeyError, WriteError) as e:
            print("rejected:", bad["title"], "code", e.code)

    api = TestClient(app)
    print("GET /trending ->", api.get("/trending", params={"limit": 3}).json())
    print("GET /news?topic=rust ->", [n["title"] for n in api.get("/news", params={"topic": "rust", "limit": 2}).json()])
    print("trending uses", index_used(db.command("explain", {"aggregate": "news", "pipeline":
          trending_pipeline(now - timedelta(days=7), 3), "cursor": {}}, verbosity="queryPlanner")))
    print("latest-in-topic uses", index_used(db.news.find({"topics": "rust"}).sort("publishedAt", -1).explain()))`,
        },
        output: "rejected: Dup code 11000\nrejected: Bad url code 121\nGET /trending -> [{'stories': 4, 'points': 100, 'topic': 'ai'}, {'stories': 2, 'points': 50, 'topic': 'db'}, {'stories': 2, 'points': 50, 'topic': 'rust'}]\nGET /news?topic=rust -> ['Story 1', 'Story 4']\ntrending uses ['publishedAt_1']\nlatest-in-topic uses ['topics_1_publishedAt_-1']",
        pitfalls: [
          "Creating the TTL index on a field that is sometimes a string: TTL only expires documents whose field is a BSON date (the validator prevents this)",
          "Changing a validator by dropping and recreating the collection: use collMod, which keeps the data",
        ],
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
