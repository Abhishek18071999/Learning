import type { Lesson } from "../../types";

export const lesson: Lesson = {
  id: "5.1.3",
  title: "Data modeling and normalization",
  minutes: 70,
  level: "Intermediate",
  prerequisites: ["5.1.2 Transactions, isolation levels and locking"],
  summary: "Design relational schemas from real requirements: entities and relationships, keys, normal forms in plain language, many-to-many tables, and when deliberate denormalisation is worth it.",
  terms: [
    { term: "Entity", def: "A thing you store facts about: User, Lesson, Enrollment." },
    { term: "Primary key", def: "A column (or set) uniquely identifying each row. Often a surrogate id (auto-increment or UUID)." },
    { term: "Foreign key", def: "A column referencing another table's primary key, enforced by the database." },
    { term: "Cardinality", def: "How many of one entity relate to another: one-to-one, one-to-many, many-to-many." },
    { term: "Normalization", def: "Organising tables so each fact is stored once, removing redundancy that causes update anomalies." },
    { term: "Denormalization", def: "Deliberately duplicating or precomputing data to speed up reads, accepting extra write work." },
    { term: "Natural vs surrogate key", def: "Natural keys come from the domain (email, ISO code); surrogate keys are generated ids with no meaning." },
  ],
  problem: [
    "The first DevAtlas schema has one wide `enrollments` table: user name, user email, course title, course price, lesson list as a comma-separated string, and quiz scores in columns score1…score10. Changing a course title requires updating thousands of rows; one missed row shows two different titles. Querying 'all learners who scored below 60 on any quiz' is a nightmare, and adding an 11th quiz needs a schema change.",
    "Good data modeling prevents these problems at the source. It is one of the most durable skills in software: code gets rewritten, but schemas and the data in them live for years.",
  ],
  concept: {
    analogy: [
      "A normalized schema is a **well-run filing cabinet**: each fact lives in exactly one folder and other folders refer to it by number. If a customer moves house, you update one address card, not every invoice. Denormalization is **keeping a photocopy of the address on each invoice** because the courier needs it fast; worth it sometimes, but now you must keep copies in sync or accept they are a snapshot.",
    ],
    precise: [
      "**Process**: list the nouns (entities) and the questions the app must answer; define relationships and cardinality; pick keys; add constraints (NOT NULL, UNIQUE, FK, CHECK); then check the important queries against indexes (lesson 5.1.1).",
      "**Normal forms, practically**: 1NF: one value per cell, no repeating groups (no comma lists, no score1…score10). 2NF/3NF: every non-key column depends on the key, the whole key, and nothing but the key (course_title belongs in courses, not enrollments). Normalizing to 3NF is the sensible default for transactional systems.",
      "**Many-to-many** needs a junction table: users ↔ courses through enrollments(user_id, course_id, enrolled_at, …), often with its own attributes.",
      "**Denormalize deliberately** for measured read performance or historical truth: store `price_paid` on an order (the price at purchase time is a different fact from the current price), cache counters (lessons_completed) updated in the same transaction, or build read models/materialized views for dashboards.",
    ],
  },
  underTheHood: {
    text: [
      "Update anomaly: a fact stored in many rows can be updated in some and not others. Insert anomaly: you cannot record a course until someone enrolls (because course data lives only in enrollments). Delete anomaly: deleting the last enrollment deletes the course's only record. Normalization removes all three.",
      "Foreign keys make the database reject orphan rows and can cascade deletes or set null. They cost a little on writes (an index lookup) and require an index on the referencing column (InnoDB creates one automatically if missing).",
      "Surrogate integer keys are compact and fast for joins and indexes. UUIDs are globally unique and safe to expose but random v4 UUIDs scatter inserts across B-tree pages; time-ordered UUIDs (v7) keep inserts sequential.",
    ],
    diagram: {
      title: "DevAtlas core model",
      nodes: [
        { label: "users", sub: "id, email UNIQUE" },
        { label: "enrollments", sub: "user_id, course_id (junction)" },
        { label: "courses", sub: "id, title, price" },
        { label: "lessons", sub: "id, course_id, position" },
        { label: "lesson_progress", sub: "user_id, lesson_id, status" },
      ],
      edges: ["1 → many", "many → 1", "1 → many", "1 → many"],
    },
  },
  handsOn: [
    {
      title: "The problem table",
      code: {
        lang: "sql",
        code: `-- ✗ One wide table: redundancy, repeating groups, multi-valued cells
CREATE TABLE enrollments_bad (
  user_name    VARCHAR(100),
  user_email   VARCHAR(254),
  course_title VARCHAR(200),
  course_price DECIMAL(8,2),
  lesson_ids   VARCHAR(1000),       -- '0.1.1,0.1.2,0.2.1'
  score1 DECIMAL(4,3), score2 DECIMAL(4,3) /* … score10 */
);`,
      },
    },
    {
      title: "A normalized schema (MySQL 8 / PostgreSQL compatible SQL)",
      code: {
        lang: "sql",
        file: "schema.sql",
        code: `CREATE TABLE users (
  id         BIGINT PRIMARY KEY AUTO_INCREMENT,      -- PostgreSQL: BIGINT GENERATED ALWAYS AS IDENTITY
  email      VARCHAR(254) NOT NULL UNIQUE,
  name       VARCHAR(100) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE courses (
  id          BIGINT PRIMARY KEY AUTO_INCREMENT,
  slug        VARCHAR(80) NOT NULL UNIQUE,
  title       VARCHAR(200) NOT NULL,
  price_cents INT NOT NULL CHECK (price_cents >= 0)
);

CREATE TABLE lessons (
  id        VARCHAR(16) PRIMARY KEY,                  -- natural key like '5.1.3'
  course_id BIGINT NOT NULL REFERENCES courses(id),
  position  INT NOT NULL,
  title     VARCHAR(200) NOT NULL,
  UNIQUE (course_id, position)
);

CREATE TABLE enrollments (                            -- many-to-many with attributes
  user_id          BIGINT NOT NULL REFERENCES users(id),
  course_id        BIGINT NOT NULL REFERENCES courses(id),
  enrolled_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  price_paid_cents INT NOT NULL,                      -- historical fact, intentionally copied
  PRIMARY KEY (user_id, course_id)
);

CREATE TABLE quiz_attempts (                          -- one row per attempt, not score1..score10
  id         BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id    BIGINT NOT NULL REFERENCES users(id),
  lesson_id  VARCHAR(16) NOT NULL REFERENCES lessons(id),
  score      DECIMAL(4,3) NOT NULL CHECK (score BETWEEN 0 AND 1),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_attempts_user_time (user_id, created_at)  -- PostgreSQL: CREATE INDEX separately
);`,
      },
      notes: ["Inline INDEX inside CREATE TABLE is MySQL syntax; in PostgreSQL write CREATE INDEX … separately. Money is stored as integer cents (or DECIMAL), never FLOAT."],
    },
    {
      title: "Queries that were painful before are now simple",
      code: {
        lang: "python",
        file: "model_demo.py",
        code: `import sqlite3

db = sqlite3.connect(":memory:")
db.executescript("""
CREATE TABLE users (id INTEGER PRIMARY KEY, email TEXT UNIQUE NOT NULL, name TEXT NOT NULL);
CREATE TABLE courses (id INTEGER PRIMARY KEY, title TEXT NOT NULL);
CREATE TABLE lessons (id TEXT PRIMARY KEY, course_id INTEGER NOT NULL REFERENCES courses(id), title TEXT);
CREATE TABLE quiz_attempts (id INTEGER PRIMARY KEY, user_id INTEGER REFERENCES users(id),
                            lesson_id TEXT REFERENCES lessons(id), score REAL CHECK (score BETWEEN 0 AND 1));
INSERT INTO users VALUES (1, 'asha@x.dev', 'Asha'), (2, 'ravi@x.dev', 'Ravi');
INSERT INTO courses VALUES (1, 'DevAtlas Databases');
INSERT INTO lessons VALUES ('5.1.1', 1, 'Indexes'), ('5.1.2', 1, 'Transactions'), ('5.1.3', 1, 'Modeling');
INSERT INTO quiz_attempts (user_id, lesson_id, score) VALUES
  (1, '5.1.1', 1.0), (1, '5.1.2', 0.67), (2, '5.1.1', 0.33), (2, '5.1.3', 0.9);
""")

# Learners who scored below 0.6 on any quiz
print(db.execute("""SELECT DISTINCT u.name FROM users u
                    JOIN quiz_attempts a ON a.user_id = u.id WHERE a.score < 0.6""").fetchall())

# Average score per lesson, including lessons nobody attempted
print(db.execute("""SELECT l.id, ROUND(AVG(a.score), 2), COUNT(a.id) FROM lessons l
                    LEFT JOIN quiz_attempts a ON a.lesson_id = l.id
                    GROUP BY l.id ORDER BY l.id""").fetchall())

# Renaming a course is one UPDATE, everywhere at once
db.execute("UPDATE courses SET title = 'Databases in Depth' WHERE id = 1")
print(db.execute("SELECT c.title FROM lessons l JOIN courses c ON c.id = l.course_id WHERE l.id = '5.1.3'").fetchone())`,
      },
      output: "[('Ravi',)]\n[('5.1.1', 0.67, 2), ('5.1.2', 0.67, 1), ('5.1.3', 0.9, 1)]\n('Databases in Depth',)",
    },
    {
      title: "Deliberate denormalization: a counter kept in the same transaction",
      code: {
        lang: "sql",
        code: `ALTER TABLE users ADD COLUMN lessons_completed INT NOT NULL DEFAULT 0;

-- whenever a lesson is completed (same transaction as the progress row):
BEGIN;
INSERT INTO lesson_progress (user_id, lesson_id, status) VALUES (42, '5.1.3', 'completed');
UPDATE users SET lessons_completed = lessons_completed + 1 WHERE id = 42;
COMMIT;

-- periodic reconciliation job catches drift if a code path ever forgets:
-- UPDATE users u SET lessons_completed = (SELECT COUNT(*) FROM lesson_progress p
--   WHERE p.user_id = u.id AND p.status = 'completed');`,
      },
      notes: ["Only add this after measuring that COUNT(*) per dashboard load is a real cost. The source of truth stays lesson_progress."],
    },
  ],
  companies: [
    "**OLTP vs analytics**: transactional databases (orders, users, payments) are normalized; analytics warehouses (BigQuery, Snowflake, Redshift, Synapse) use denormalized star schemas built by ETL/ELT pipelines for fast aggregations.",
    "**Schema reviews**: many teams require a data-model review for new tables because schema mistakes are expensive to fix once data accumulates; migrations follow expand-and-contract rules (lesson 5.4.1).",
    "**Read models**: high-traffic products often keep a normalized write model plus denormalized read models (materialized views, Redis caches, search indexes) updated from events (CQRS, lesson 6.2.1).",
  ],
  mistakes: [
    { mistake: "Comma-separated values in a column", why: "Quick way to store a list", wrong: "Cannot index, join or validate; queries use LIKE hacks", fix: "A child table with one row per value" },
    { mistake: "Repeating column groups (score1…score10)", why: "Mirrors a spreadsheet", wrong: "Schema change for each new item; awkward queries", fix: "One row per item in a related table" },
    { mistake: "Storing derived or duplicated data without a plan", why: "Avoiding joins", wrong: "Copies drift out of sync", fix: "Normalize by default; denormalize with a sync mechanism and a source of truth" },
    { mistake: "FLOAT for money", why: "Default numeric type", wrong: "Rounding errors in totals and refunds", fix: "Integer cents or DECIMAL with explicit scale" },
    { mistake: "No foreign keys 'for performance'", why: "Fear of overhead", wrong: "Orphan rows and silent data corruption", fix: "Use FKs; measure before removing; handle deletes explicitly" },
  ],
  bestPractices: [
    { tag: "Reliability", text: "Constraints encode business rules: NOT NULL, UNIQUE, FK, CHECK." },
    { tag: "Maintainability", text: "Consistent naming (snake_case plural tables, <table>_id foreign keys, created_at/updated_at)." },
    { tag: "Performance", text: "Design from the main queries; add composite indexes matching them." },
    { tag: "Reliability", text: "Store historical facts explicitly (price_paid) instead of joining to values that can change." },
  ],
  interview: [
    { q: "What is normalization and why does it matter?", a: "Structuring tables so each fact is stored once and every non-key column depends only on the key. It prevents update, insert and delete anomalies and keeps data consistent. In practice, 3NF is the default for transactional systems." },
    { q: "When would you denormalize?", a: "When measurements show reads are too expensive and the duplication can be kept consistent: counters updated in the same transaction, precomputed read models for dashboards, search indexes, or historical snapshots like price at purchase time. Always keep a clear source of truth and a reconciliation path." },
    { q: "How do you model a many-to-many relationship?", a: "With a junction table holding foreign keys to both sides, a composite primary key (or a surrogate key plus a unique constraint) to prevent duplicates, and any attributes of the relationship itself, like enrolled_at or role." },
  ],
  quickCheck: [
    {
      kind: "mcq",
      prompt: "Where should course_title live?",
      options: ["In enrollments, copied per learner", "In courses, referenced by id", "In users", "In a comma-separated field"],
      answer: 1,
      explanation: "It is a fact about the course, so it belongs in courses once.",
    },
    {
      kind: "mcq",
      prompt: "Why store price_paid_cents on enrollments even though courses has price_cents?",
      options: ["It is redundant and wrong", "It records a different fact: the price at purchase time", "For indexing", "SQL requires it"],
      answer: 1,
      explanation: "Course prices change; what the learner paid must not.",
    },
    {
      kind: "bug",
      prompt: "Query 'learners enrolled in course 7' is slow and sometimes wrong. The table stores course_ids as '3,7,12'. Root cause?",
      options: ["Missing ORDER BY", "Violates 1NF: a multi-valued column cannot be indexed or matched reliably ('17' contains '7')", "Wrong isolation level", "Too many columns"],
      answer: 1,
      explanation: "Use an enrollments junction table.",
    },
  ],
  cheatSheet: [
    "Start from entities, relationships and the main queries.",
    "1NF: atomic values, no repeating groups.",
    "3NF: non-key columns depend on the key, the whole key, nothing but the key.",
    "Many-to-many → junction table with composite key.",
    "Constraints: PK, FK, UNIQUE, NOT NULL, CHECK.",
    "Money: cents or DECIMAL. Times: UTC timestamps.",
    "Denormalize deliberately, with a source of truth and reconciliation.",
  ],
  homework: {
    basic: {
      title: "Normalize the spreadsheet",
      brief: ["Turn this spreadsheet into 3NF tables: order_id, customer_name, customer_email, product_names ('Pen, Book'), product_prices ('2.50, 12.00'), order_date, shipping_city. Write CREATE TABLE statements with keys and constraints."],
      criteria: ["customers, products, orders, order_items tables", "Price at purchase stored on order_items", "No multi-valued columns"],
      hints: ["What happens to the product list? What should happen when a product price changes later?"],
      solution: {
        text: ["Customers and products become their own tables; orders reference customers; order_items is the junction with quantity and unit_price_cents captured at purchase."],
        code: {
          lang: "sql",
          code: `CREATE TABLE customers (id BIGINT PRIMARY KEY, name VARCHAR(100) NOT NULL, email VARCHAR(254) NOT NULL UNIQUE);
CREATE TABLE products (id BIGINT PRIMARY KEY, name VARCHAR(200) NOT NULL, price_cents INT NOT NULL CHECK (price_cents >= 0));
CREATE TABLE orders (
  id BIGINT PRIMARY KEY,
  customer_id BIGINT NOT NULL REFERENCES customers(id),
  ordered_at TIMESTAMP NOT NULL,
  shipping_city VARCHAR(100) NOT NULL          -- a fact about this order's delivery
);
CREATE TABLE order_items (
  order_id BIGINT NOT NULL REFERENCES orders(id),
  product_id BIGINT NOT NULL REFERENCES products(id),
  quantity INT NOT NULL CHECK (quantity > 0),
  unit_price_cents INT NOT NULL,                -- price at purchase time
  PRIMARY KEY (order_id, product_id)
);`,
        },
      },
    },
    intermediate: {
      title: "Model tags and prerequisites",
      brief: ["Extend the DevAtlas schema with lesson tags (many-to-many) and lesson prerequisites (a self-referencing many-to-many). Write queries: lessons tagged 'docker'; all direct prerequisites of a lesson; lessons with no prerequisites."],
      criteria: ["tags and lesson_tags tables", "lesson_prerequisites(lesson_id, requires_lesson_id) with a CHECK against self-reference", "Three working queries"],
      hints: ["A self-referencing junction table has two foreign keys to the same table."],
      solution: {
        text: ["Prerequisites form a graph (lesson 2.3.2); the table stores edges, and cycle checks happen in application code or CI."],
        code: {
          lang: "sql",
          code: `CREATE TABLE tags (id BIGINT PRIMARY KEY, name VARCHAR(50) NOT NULL UNIQUE);
CREATE TABLE lesson_tags (
  lesson_id VARCHAR(16) NOT NULL REFERENCES lessons(id),
  tag_id BIGINT NOT NULL REFERENCES tags(id),
  PRIMARY KEY (lesson_id, tag_id)
);
CREATE TABLE lesson_prerequisites (
  lesson_id VARCHAR(16) NOT NULL REFERENCES lessons(id),
  requires_lesson_id VARCHAR(16) NOT NULL REFERENCES lessons(id),
  PRIMARY KEY (lesson_id, requires_lesson_id),
  CHECK (lesson_id <> requires_lesson_id)
);

SELECT l.* FROM lessons l JOIN lesson_tags lt ON lt.lesson_id = l.id JOIN tags t ON t.id = lt.tag_id WHERE t.name = 'docker';
SELECT requires_lesson_id FROM lesson_prerequisites WHERE lesson_id = '9.4.1';
SELECT l.id FROM lessons l WHERE NOT EXISTS (SELECT 1 FROM lesson_prerequisites p WHERE p.lesson_id = l.id);`,
        },
      },
    },
    challenge: {
      title: "Design for history: price changes and audit",
      brief: ["Course prices change over time and finance needs to know the price on any past date. Design a price history table, a query for 'price of course X on date D', and an audit log of who changed it. Discuss alternatives (temporal tables, event sourcing)."],
      criteria: ["Non-overlapping validity ranges", "Correct as-of query", "Audit columns or table"],
      hints: ["valid_from / valid_to (NULL = current)."],
      solution: {
        text: [
          "course_prices(course_id, price_cents, valid_from, valid_to NULL, changed_by). As-of query: WHERE course_id = ? AND valid_from <= :d AND (valid_to IS NULL OR valid_to > :d). Changing a price closes the current row (set valid_to) and inserts a new one in one transaction. Alternatives: SQL Server and MariaDB system-versioned temporal tables do this automatically; event sourcing stores every change as an event and derives state.",
        ],
      },
    },
    capstone: {
      title: "DevAtlas: reviewed MySQL schema",
      brief: ["Write the full DevAtlas relational schema (users, courses, lessons, enrollments, lesson_progress, quiz_attempts, tags, prerequisites, live sessions, bookings) as EF Core migrations, with every constraint, and a short ERD in Mermaid in docs/data-model.md."],
      criteria: ["3NF except documented, deliberate denormalizations", "All FKs and unique constraints present", "ERD committed"],
      hints: ["Mermaid supports erDiagram blocks that GitHub renders."],
      solution: {
        text: ["A reviewed, constraint-rich schema plus an ERD in the repo is exactly what reviewers and future you need when the product grows."],
        code: {
          lang: "markdown",
          file: "docs/data-model.md",
          code: "```mermaid\nerDiagram\n  USERS ||--o{ ENROLLMENTS : has\n  COURSES ||--o{ ENROLLMENTS : has\n  COURSES ||--o{ LESSONS : contains\n  USERS ||--o{ LESSON_PROGRESS : tracks\n  LESSONS ||--o{ LESSON_PROGRESS : tracked_by\n  USERS ||--o{ QUIZ_ATTEMPTS : makes\n  LESSONS ||--o{ QUIZ_ATTEMPTS : for\n```",
        },
      },
    },
  },
  deeper: [
    { label: "PostgreSQL docs: Constraints", url: "https://www.postgresql.org/docs/current/ddl-constraints.html" },
    { label: "MySQL 8.4: FOREIGN KEY constraints", url: "https://dev.mysql.com/doc/refman/8.4/en/create-table-foreign-keys.html" },
    { label: "Wikipedia: Database normalization", url: "https://en.wikipedia.org/wiki/Database_normalization" },
    { label: "Mermaid: Entity Relationship Diagrams", url: "https://mermaid.js.org/syntax/entityRelationshipDiagram.html" },
  ],
  nextPreview: "Next: MongoDB. Document modeling, the aggregation pipeline, and when a document database is the better choice.",
};
