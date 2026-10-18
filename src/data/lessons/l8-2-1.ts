import type { Lesson } from "../../types";

export const lesson: Lesson = {
  id: "8.2.1",
  title: "S3, Blob, RDS, Azure SQL, DynamoDB, Cosmos DB",
  minutes: 85,
  level: "Intermediate",
  prerequisites: [
    "8.1.1 VMs, functions and containers",
    "5.1.1 Indexes and query plans",
    "5.2.1 Document modeling and the aggregation pipeline",
  ],
  summary: "Managed storage on AWS and Azure: object storage (S3, Blob) with presigned and SAS URLs, managed relational databases (RDS, Azure SQL, Azure Database for PostgreSQL) with TLS and token-based auth, and key-value/document stores (DynamoDB, Cosmos DB) designed from access patterns and partition keys. All code runs against local emulators.",
  terms: [
    {
      term: "Object storage",
      def: "Stores files (objects) by key in buckets/containers with HTTP access: Amazon S3, Azure Blob Storage. Cheap, durable, effectively unlimited.",
    },
    {
      term: "Presigned URL / SAS",
      def: "A time-limited, signed URL granting one specific permission on one object, so clients can upload or download directly.",
    },
    {
      term: "Durability vs availability",
      def: "Durability: the chance your data survives. Availability: the chance you can reach it right now. Storage is often far more durable than available.",
    },
    {
      term: "Managed relational DB",
      def: "PostgreSQL, MySQL or SQL Server run for you (backups, patching, failover): Amazon RDS/Aurora, Azure SQL Database, Azure Database for PostgreSQL/MySQL.",
    },
    {
      term: "Multi-AZ / zone-redundant",
      def: "A standby copy in another availability zone that takes over automatically if the primary fails.",
    },
    {
      term: "Read replica",
      def: "A copy that serves read queries to scale reads; usually slightly behind the primary.",
    },
    {
      term: "Partition key",
      def: "The attribute DynamoDB and Cosmos DB hash to decide where an item lives. It determines scalability and which queries are cheap.",
    },
    {
      term: "RU / capacity units",
      def: "Cosmos DB request units and DynamoDB read/write capacity units: the currency of throughput (or pay-per-request).",
    },
  ],
  problem: [
    "DevAtlas needs to store four kinds of data: homework file uploads, users and enrolments with relations and transactions, a firehose of activity events (quiz answers, page views), and the generated news archive.",
    "Putting files in the database bloats backups; putting activity events in PostgreSQL works until it doesn't; choosing DynamoDB without knowing your queries leads to expensive scans; and a single public bucket is how companies end up in the news. Each kind of data has a natural home, and each home has rules.",
  ],
  concept: {
    analogy: [
      "Object storage is a **warehouse with labelled boxes**: you can store anything, retrieve a box by its label, and hand a courier a time-limited pass for one box (a presigned URL). A relational database is an **accountant's ledger**: strict columns, cross-references and transactions that must balance. A key-value store is a **giant set of numbered lockers** across many rooms: instant access if you know the locker number, but searching every locker is slow and expensive, so you plan the numbering around how you will look things up.",
    ],
    precise: [
      "**Object storage (S3, Blob):** objects up to terabytes, addressed by bucket/container + key. Keys look like paths but are flat strings; prefixes are how you list. Features: versioning, lifecycle rules (move to cheaper tiers, expire), server-side encryption by default, event notifications, and presigned/SAS URLs. Block public access unless you are deliberately hosting public assets (then use a CDN).",
      "**Managed relational (RDS/Aurora, Azure SQL, Azure Database for PostgreSQL/MySQL):** the right default for core business data with relationships and transactions. The provider handles backups with point-in-time restore, patching and failover (enable Multi-AZ / zone redundancy). You still own schema design, indexes, queries, connection management and TLS.",
      "**Key-value / document (DynamoDB, Cosmos DB):** single-digit-millisecond access at any scale, but only for queries you designed for. Model from **access patterns**: the partition key spreads load, the sort key orders items within a partition and enables range queries; secondary indexes add more access patterns. Cosmos DB adds multiple APIs (NoSQL, MongoDB, Cassandra, Gremlin, Table) and tunable consistency.",
      "**Choosing:** files → object storage. Relational data, reporting, ad-hoc queries → managed SQL. Massive, simple, predictable access patterns (sessions, events, carts, IoT) or global multi-region writes → DynamoDB/Cosmos DB. Search → a search engine. Most products use several.",
    ],
  },
  underTheHood: {
    text: [
      "Object stores replicate each object across devices and (for zone-redundant classes) across availability zones before confirming a write, which is why they advertise eleven nines (99.999999999%) of designed durability. Availability, the ability to read right now, is a separate and lower number.",
      "A presigned URL is the request (method, bucket, key, expiry, and optional conditions) signed with your credentials using HMAC. The storage service recomputes the signature; any change to the URL breaks it, and it stops working after expiry or if the signing credentials are revoked.",
      "DynamoDB and Cosmos DB hash the partition key to pick a physical partition, each with throughput and size limits. If one key value receives most traffic (a 'hot partition'), that partition throttles while others sit idle. Good keys have many distinct values with evenly spread traffic.",
      "Managed databases still use connections. Each connection costs server memory, and serverless compute can open thousands. Use connection pooling (RDS Proxy, PgBouncer, built-in poolers) and short-lived tokens (IAM / Entra authentication) instead of long-lived passwords.",
    ],
    diagram: {
      title: "Where each kind of DevAtlas data lives",
      nodes: [
        { label: "Homework files", sub: "S3 / Blob + SAS" },
        { label: "Users, courses", sub: "RDS / Azure SQL" },
        { label: "Activity events", sub: "DynamoDB / Cosmos" },
        { label: "News archive", sub: "object storage, cold tier" },
      ],
      edges: ["", "", ""],
      caption: "Pick per data shape and access pattern, not one store for everything.",
    },
  },
  handsOn: [
    {
      title: "S3: private bucket, versioning, lifecycle, presigned URL",
      text: [
        "Run against LocalStack (`docker run -d -p 4566:4566 localstack/localstack`). On AWS, delete the endpoint and dummy keys; boto3 picks up your role or profile.",
      ],
      code: {
        lang: "python",
        file: "s3_demo.py",
        code: `import json
import os
import urllib.request

import boto3

# On AWS, drop endpoint_url and the dummy keys: boto3 finds credentials from the role/profile.
s3 = boto3.client("s3", region_name="us-east-1",
                  endpoint_url=os.environ.get("AWS_ENDPOINT_URL", "http://localhost:4566"),
                  aws_access_key_id="test", aws_secret_access_key="test")
BUCKET = "devatlas-uploads-dev"

s3.create_bucket(Bucket=BUCKET)
s3.put_public_access_block(Bucket=BUCKET, PublicAccessBlockConfiguration={
    "BlockPublicAcls": True, "IgnorePublicAcls": True, "BlockPublicPolicy": True, "RestrictPublicBuckets": True})
s3.put_bucket_versioning(Bucket=BUCKET, VersioningConfiguration={"Status": "Enabled"})
s3.put_bucket_lifecycle_configuration(Bucket=BUCKET, LifecycleConfiguration={"Rules": [{
    "ID": "expire-tmp", "Status": "Enabled", "Filter": {"Prefix": "tmp/"}, "Expiration": {"Days": 7}}]})

key = "homework/u1/7.1.1/solution.py"
s3.put_object(Bucket=BUCKET, Key=key, Body=b"print('hello')\\n", ContentType="text/x-python",
              Metadata={"lesson": "7.1.1"})
s3.put_object(Bucket=BUCKET, Key=key, Body=b"print('hello, v2')\\n", ContentType="text/x-python")

versions = s3.list_object_versions(Bucket=BUCKET, Prefix=key)["Versions"]
print("versions kept:", len(versions))

# A presigned URL lets a browser download (or upload) directly, without your API in the middle.
url = s3.generate_presigned_url("get_object", Params={"Bucket": BUCKET, "Key": key}, ExpiresIn=300)
print("presigned GET:", urllib.request.urlopen(url).read().decode().strip())

listing = s3.list_objects_v2(Bucket=BUCKET, Prefix="homework/u1/")
print("keys:", [o["Key"] for o in listing["Contents"]])`,
      },
      output: "versions kept: 2\npresigned GET: print('hello, v2')\nkeys: ['homework/u1/7.1.1/solution.py']",
      notes: [
        "Versioning keeps the overwritten file: accidental overwrites and deletes become recoverable. Pair it with a lifecycle rule that expires old versions, or storage grows forever.",
      ],
    },
    {
      title: "Azure Blob Storage: the same ideas, Azure names",
      text: [
        "Run against Azurite: `docker run -d -p 10000:10000 mcr.microsoft.com/azure-storage/azurite azurite-blob --blobHost 0.0.0.0` (add `--skipApiVersionCheck` if your SDK is newer than the emulator).",
      ],
      code: {
        lang: "python",
        file: "blob_demo.py",
        code: `import os
import urllib.request
from datetime import datetime, timedelta, timezone

from azure.storage.blob import BlobSasPermissions, BlobServiceClient, ContentSettings, generate_blob_sas

# Azurite (the local Azure Storage emulator) uses this well-known development account.
# On Azure, use DefaultAzureCredential (managed identity) instead of an account key.
CONN = os.environ.get("AZURE_STORAGE_CONNECTION_STRING", "UseDevelopmentStorage=true")
service = BlobServiceClient.from_connection_string(CONN)

container = service.get_container_client("uploads")
if not container.exists():
    container.create_container()                      # private by default

blob = container.get_blob_client("homework/u1/7.1.1/solution.py")
blob.upload_blob(b"print('hello from blob')\\n", overwrite=True,
                 content_settings=ContentSettings(content_type="text/x-python"),
                 metadata={"lesson": "7.1.1"})

# A SAS token is Azure's presigned URL: scoped permission + expiry, signed with the key.
sas = generate_blob_sas(
    account_name=service.account_name, container_name="uploads", blob_name=blob.blob_name,
    account_key=service.credential.account_key, permission=BlobSasPermissions(read=True),
    expiry=datetime.now(timezone.utc) + timedelta(minutes=5),
)
print("SAS GET:", urllib.request.urlopen(f"{blob.url}?{sas}").read().decode().strip())
print("metadata:", blob.get_blob_properties().metadata)
print("blobs:", [b.name for b in container.list_blobs(name_starts_with="homework/u1/")])`,
      },
      output: "SAS GET: print('hello from blob')\nmetadata: {'lesson': '7.1.1'}\nblobs: ['homework/u1/7.1.1/solution.py']",
      notes: [
        "Account keys can sign anything: in production prefer a **user delegation SAS** (signed with an Entra ID identity) and managed identities, so no long-lived key exists in your app.",
      ],
    },
    {
      title: "DynamoDB: design from access patterns",
      code: {
        lang: "python",
        file: "dynamo_demo.py",
        code: `import os
from datetime import datetime, timezone

import boto3
from boto3.dynamodb.conditions import Key
from botocore.exceptions import ClientError

ddb = boto3.resource("dynamodb", region_name="us-east-1",
                     endpoint_url=os.environ.get("AWS_ENDPOINT_URL", "http://localhost:4566"),
                     aws_access_key_id="test", aws_secret_access_key="test")

# Design from the access patterns: "all progress for a user", "one lesson for a user",
# "who completed a lesson" (GSI). One table, generic key names.
table = ddb.create_table(
    TableName="devatlas",
    BillingMode="PAY_PER_REQUEST",
    KeySchema=[{"AttributeName": "pk", "KeyType": "HASH"}, {"AttributeName": "sk", "KeyType": "RANGE"}],
    AttributeDefinitions=[{"AttributeName": n, "AttributeType": "S"} for n in ("pk", "sk", "gsi1pk")],
    GlobalSecondaryIndexes=[{
        "IndexName": "by-lesson",
        "KeySchema": [{"AttributeName": "gsi1pk", "KeyType": "HASH"}, {"AttributeName": "pk", "KeyType": "RANGE"}],
        "Projection": {"ProjectionType": "KEYS_ONLY"},
    }],
)
table.wait_until_exists()


def complete(user: str, lesson: str, score: int) -> bool:
    """Idempotent: the first completion wins; retries and double clicks do nothing."""
    try:
        table.put_item(
            Item={"pk": f"USER#{user}", "sk": f"LESSON#{lesson}", "gsi1pk": f"LESSON#{lesson}",
                  "score": score, "at": datetime.now(timezone.utc).isoformat()},
            ConditionExpression="attribute_not_exists(pk)",
        )
        return True
    except ClientError as e:
        if e.response["Error"]["Code"] == "ConditionalCheckFailedException":
            return False
        raise


print(complete("u1", "7.1.1", 90), complete("u1", "7.1.1", 40))   # second call is a no-op
complete("u1", "7.2.1", 75)
complete("u2", "7.1.1", 60)
table.put_item(Item={"pk": "USER#u1", "sk": "PROFILE", "name": "Ana", "streak": 4})

mine = table.query(KeyConditionExpression=Key("pk").eq("USER#u1") & Key("sk").begins_with("LESSON#"))
print("u1 lessons:", [(i["sk"], int(i["score"])) for i in mine["Items"]])
who = table.query(IndexName="by-lesson", KeyConditionExpression=Key("gsi1pk").eq("LESSON#7.1.1"))
print("completed 7.1.1:", sorted(i["pk"] for i in who["Items"]))`,
      },
      output: "True False\nu1 lessons: [('LESSON#7.1.1', 90), ('LESSON#7.2.1', 75)]\ncompleted 7.1.1: ['USER#u1', 'USER#u2']",
      notes: [
        "Single-table design stores several entity types (profile, progress) under one partition key, so 'everything about a user' is one Query.",
        "The conditional write makes completion idempotent without reading first: the second call fails the condition instead of overwriting the first score.",
        "`Scan` reads the whole table. If you need it in a request path, you are missing an index.",
      ],
    },
    {
      title: "Managed PostgreSQL: TLS and passwordless auth",
      code: {
        lang: "python",
        file: "db.py",
        code: `"""Connect to managed PostgreSQL (RDS / Azure Database for PostgreSQL) safely."""
import os

import psycopg


def password() -> str:
    mode = os.environ.get("DB_AUTH", "password")
    if mode == "aws-iam":                      # short-lived token instead of a stored password
        import boto3
        return boto3.client("rds", region_name=os.environ["AWS_REGION"]).generate_db_auth_token(
            DBHostname=os.environ["DB_HOST"], Port=5432, DBUsername=os.environ["DB_USER"])
    if mode == "azure-entra":                  # Microsoft Entra token via managed identity
        from azure.identity import DefaultAzureCredential
        return DefaultAzureCredential().get_token("https://ossrdbms-aad.database.windows.net/.default").token
    return os.environ["DB_PASSWORD"]           # local development only


def connect() -> psycopg.Connection:
    return psycopg.connect(
        host=os.environ.get("DB_HOST", "localhost"), dbname=os.environ.get("DB_NAME", "devatlas"),
        user=os.environ.get("DB_USER", "postgres"), password=password(),
        sslmode=os.environ.get("DB_SSLMODE", "require"),   # encrypt in transit; verify-full in prod
        connect_timeout=5,
    )


if __name__ == "__main__":
    with connect() as conn:
        ssl, version = conn.execute(
            "SELECT ssl, version FROM pg_stat_ssl WHERE pid = pg_backend_pid()").fetchone()
        print("encrypted:", ssl, version)`,
      },
      output: "encrypted: True TLSv1.3",
      notes: [
        "Shown against a local PostgreSQL with TLS. Against RDS or Azure, use `sslmode=verify-full` with the provider's CA bundle so the client also verifies the server's identity.",
        "IAM / Entra tokens expire after minutes, so a leaked token is far less damaging than a leaked password. Your connection pool must fetch a new token when it opens new connections.",
      ],
    },
    {
      title: "Choosing a partition key (Cosmos DB and DynamoDB)",
      code: {
        lang: "python",
        file: "partition_keys.py",
        code: `"""Pick a partition key (Cosmos DB / DynamoDB) by simulating where today's writes land."""
import random
from collections import Counter

random.seed(42)
LESSONS = [f"{p}.{m}.1" for p in range(11) for m in range(1, 5)]
WEIGHTS = [30 if l.startswith("0.") else 1 for l in LESSONS]       # beginners crowd phase 0
events = [{"userId": f"u{random.randint(1, 5000)}",
           "lessonId": random.choices(LESSONS, WEIGHTS)[0],
           "day": "2026-10-18"} for _ in range(20_000)]

print(f"{'key':10} {'distinct':>8} {'hottest share':>14}")
for key in ("day", "lessonId", "userId"):
    counts = Counter(e[key] for e in events)
    hottest = counts.most_common(1)[0][1] / len(events)
    print(f"{key:10} {len(counts):8} {hottest:14.1%}")`,
      },
      output: "key        distinct  hottest share\nday               1         100.0%\nlessonId         44          18.9%\nuserId         4905           0.1%",
      notes: [
        "Partitioning by day sends every write today to one partition: a classic hot partition. `userId` spreads load evenly and matches the main query ('my progress'). Use a secondary index for 'who completed lesson X'.",
      ],
    },
  ],
  companies: [
    "**Uploads go direct to storage:** web and mobile apps request a presigned or SAS URL from the API and upload straight to S3/Blob, so large files never pass through (or slow down) application servers.",
    "**Relational core, NoSQL edges:** a common pattern is PostgreSQL or SQL Server for accounts, orders and billing, with DynamoDB or Cosmos DB for high-volume, simple-access data such as sessions, carts, feeds and event logs.",
    "**Data lakes on object storage:** analytics teams land events and exports in S3 or Azure Data Lake Storage (Blob-based) as Parquet files and query them with engines like Athena, Synapse, Databricks or Snowflake.",
    "**Bucket misconfiguration** has caused many real data leaks; companies now enforce 'block public access' at the account or organisation level and scan continuously for exceptions.",
  ],
  mistakes: [
    {
      mistake: "Public buckets for user uploads",
      why: "Easiest way to make downloads work",
      wrong: "Anyone with the URL pattern can list or fetch private files",
      fix: "Block public access; serve via short-lived presigned/SAS URLs or a CDN with signed URLs",
    },
    {
      mistake: "Storing files in the database",
      why: "One place for everything",
      wrong: "Huge backups, slow queries, expensive storage",
      fix: "Files in object storage; keys and metadata in the database",
    },
    {
      mistake: "Modelling DynamoDB like SQL tables",
      why: "Habit",
      wrong: "Scans and many round trips for simple pages; high cost",
      fix: "List access patterns first; design keys and indexes for them",
    },
    {
      mistake: "Low-cardinality partition keys",
      why: "'Date' or 'status' looks natural",
      wrong: "Hot partitions, throttling, wasted capacity",
      fix: "High-cardinality keys with even traffic (userId, orderId); add suffixes if needed",
    },
    {
      mistake: "Long-lived database passwords in env files",
      why: "Works everywhere",
      wrong: "Leaked credentials grant full DB access until someone rotates them",
      fix: "IAM / Entra token auth or a secret manager with rotation; TLS always",
    },
    {
      mistake: "Single-AZ production database",
      why: "Cheaper",
      wrong: "An AZ outage or maintenance takes the product down",
      fix: "Multi-AZ / zone-redundant for production; test failover",
    },
  ],
  bestPractices: [
    {
      tag: "Security",
      text: "Block public access by default, encrypt at rest (default on most services) and in transit (TLS, `verify-full`), and grant each service access only to its own bucket prefix or tables.",
    },
    {
      tag: "Reliability",
      text: "Enable versioning on important buckets, point-in-time restore on databases, and practise restoring: a backup you have never restored is a hope, not a backup.",
    },
    {
      tag: "Cost",
      text: "Use lifecycle rules to move old objects to cooler tiers and expire temporary data; use on-demand capacity until traffic is predictable.",
    },
    {
      tag: "Performance",
      text: "Design NoSQL keys for even distribution; add read replicas or caches for read-heavy SQL workloads; keep hot objects behind a CDN.",
    },
    {
      tag: "Maintainability",
      text: "Hide the provider behind a small storage interface and test it with emulators, so tests run locally and switching clouds is contained.",
    },
  ],
  interview: [
    {
      q: "How would you let users upload large files to your app?",
      a: "The API authenticates the user and returns a presigned POST/PUT URL (S3) or a SAS URL (Blob) scoped to one key prefix, a size range and a short expiry. The browser uploads directly to storage; an event notification or a callback then triggers processing (virus scan, thumbnailing) and records metadata in the database. App servers never stream the bytes, and the bucket stays private.",
    },
    {
      q: "When would you choose DynamoDB or Cosmos DB over PostgreSQL?",
      a: "When access patterns are known and simple (get or query by key), scale is very large or spiky, and you want predictable low latency with minimal operations, or need multi-region writes. Examples: sessions, carts, event logs, IoT readings. Choose PostgreSQL for relational data, transactions across entities, ad-hoc queries and reporting. Many systems use both.",
    },
    {
      q: "What makes a good partition key?",
      a: "High cardinality and evenly distributed traffic, and alignment with the most common query so it targets one partition. User id or order id are typical; date, status or country are usually poor because traffic concentrates on a few values. If a key is hot, add a suffix (write sharding) or rethink the model.",
    },
  ],
  quickCheck: [
    {
      kind: "mcq",
      prompt: "Users upload 200 MB videos. What is the best flow?",
      options: [
        "POST the file to the API, which saves it in PostgreSQL",
        "POST to the API, which forwards it to S3",
        "API returns a presigned/SAS URL; the browser uploads directly to object storage",
        "Make the bucket public-write",
      ],
      answer: 2,
      explanation: "Direct-to-storage uploads with a short-lived, scoped URL keep large bytes off your servers and keep the bucket private.",
    },
    {
      kind: "output",
      prompt: "What does this print?",
      code: {
        lang: "python",
        code: `from collections import Counter
writes = ["2026-10-18"] * 8 + ["2026-10-17"] * 2
c = Counter(writes)
print(len(c), c.most_common(1)[0][1] / len(writes))`,
      },
      options: ["2 0.5", "2 0.8", "10 0.8", "1 1.0"],
      answer: 1,
      explanation: "Two distinct keys; the hottest (today) gets 8 of 10 writes. With a date partition key, today's partition takes almost all the traffic.",
    },
    {
      kind: "bug",
      prompt: "A 'mark lesson complete' endpoint sometimes records the second, lower score when users double-click. What is the fix?",
      code: {
        lang: "python",
        code: "table.put_item(Item={\"pk\": f\"USER#{u}\", \"sk\": f\"LESSON#{l}\", \"score\": score})",
      },
      options: [
        "Use a Scan to check first",
        "Add ConditionExpression=\"attribute_not_exists(pk)\" so only the first write succeeds",
        "Increase capacity units",
        "Use a GSI",
      ],
      answer: 1,
      explanation: "A conditional write is atomic. Reading first and then writing has a race window; the condition does both in one step.",
    },
  ],
  cheatSheet: [
    "Files → S3 / Blob. Relations + transactions → RDS / Azure SQL / Azure PostgreSQL. Known key lookups at scale → DynamoDB / Cosmos DB.",
    "Buckets private by default; share via presigned (S3) or SAS (Blob) URLs.",
    "Versioning + lifecycle rules; cooler tiers for rarely read data.",
    "Durability ≠ availability.",
    "Production SQL: Multi-AZ / zone redundant, PITR backups, TLS verify-full, pooling.",
    "Prefer IAM / Entra token auth over stored DB passwords.",
    "NoSQL: list access patterns → partition key + sort key + indexes. Avoid Scan.",
    "Good partition key: many values, even traffic, matches the main query.",
    "Conditional writes for idempotency.",
  ],
  homework: {
    basic: {
      title: "Direct browser uploads with a presigned POST",
      brief: [
        "Build the function behind `POST /homework/upload-url`: it returns a presigned POST that only allows uploads under the user's own prefix and up to 1 MB. Upload a file with it.",
      ],
      criteria: [
        "Key restricted to the user's prefix",
        "Size limit enforced by a condition",
        "Short expiry",
        "Upload succeeds against LocalStack",
      ],
      hints: ["`generate_presigned_post` accepts `Conditions` such as `content-length-range` and `starts-with`."],
      solution: {
        text: [
          "The policy is signed, so the browser cannot change the prefix or size limit. After upload, an S3 event (or a call from the browser) tells the API to record the file and start checks such as virus scanning.",
        ],
        code: {
          lang: "python",
          file: "upload_ticket.py",
          code: `"""Browser uploads straight to S3 with a presigned POST: the API never handles the bytes."""
import os

import boto3
import requests

s3 = boto3.client("s3", region_name="us-east-1",
                  endpoint_url=os.environ.get("AWS_ENDPOINT_URL", "http://localhost:4566"),
                  aws_access_key_id="test", aws_secret_access_key="test")
BUCKET = "devatlas-homework"
s3.create_bucket(Bucket=BUCKET)


def upload_ticket(user: str, lesson: str) -> dict:
    """What POST /homework/upload-url returns to the browser."""
    return s3.generate_presigned_post(
        Bucket=BUCKET,
        Key=f"homework/{user}/{lesson}/\${{filename}}",        # S3 fills in the uploaded file name
        Conditions=[["content-length-range", 1, 1_000_000],   # 1 byte to 1 MB
                    ["starts-with", "$key", f"homework/{user}/{lesson}/"]],
        ExpiresIn=600,
    )


ticket = upload_ticket("u1", "8.2.1")
resp = requests.post(ticket["url"], data=ticket["fields"],
                     files={"file": ("answer.py", b"print('done')\\n")})
print("upload status:", resp.status_code)
print("stored:", [o["Key"] for o in s3.list_objects_v2(Bucket=BUCKET)["Contents"]])`,
        },
        output: "upload status: 204\nstored: ['homework/u1/8.2.1/answer.py']",
      },
    },
    intermediate: {
      title: "Paginate a DynamoDB query",
      brief: [
        "Load 250 activity events for a user, then write a generator that returns events since a date, newest first, page by page using `LastEvaluatedKey`. Count the pages.",
      ],
      criteria: ["Batch writes", "Range condition on the sort key", "Correct pagination loop", "Newest-first order"],
      hints: ["Sort keys like `EVENT#2026-10-14#0001` sort by date as strings."],
      solution: {
        text: [
          "A query returns at most `Limit` items (or 1 MB) per call; the `LastEvaluatedKey` is your cursor. Expose it to API clients as an opaque `next` token, the same cursor pagination you built in lesson 4.4.1.",
        ],
        code: {
          lang: "python",
          file: "paginate.py",
          code: `import os

import boto3
from boto3.dynamodb.conditions import Key

ddb = boto3.resource("dynamodb", region_name="us-east-1",
                     endpoint_url=os.environ.get("AWS_ENDPOINT_URL", "http://localhost:4566"),
                     aws_access_key_id="test", aws_secret_access_key="test")
table = ddb.create_table(
    TableName="devatlas-activity", BillingMode="PAY_PER_REQUEST",
    KeySchema=[{"AttributeName": "pk", "KeyType": "HASH"}, {"AttributeName": "sk", "KeyType": "RANGE"}],
    AttributeDefinitions=[{"AttributeName": "pk", "AttributeType": "S"}, {"AttributeName": "sk", "AttributeType": "S"}],
)
table.wait_until_exists()

with table.batch_writer() as batch:                   # groups writes into 25-item batches
    for i in range(250):
        batch.put_item(Item={"pk": "USER#u1", "sk": f"EVENT#2026-10-{1 + i // 10:02d}#{i:04d}", "kind": "quiz"})


def events_since(user: str, since: str, page_size: int = 100):
    """Yield items page by page. A Query returns at most 1 MB or \`Limit\` items per call."""
    kwargs = {"KeyConditionExpression": Key("pk").eq(f"USER#{user}") & Key("sk").gte(f"EVENT#{since}"),
              "Limit": page_size, "ScanIndexForward": False}       # newest first
    pages = 0
    while True:
        page = table.query(**kwargs)
        pages += 1
        yield from page["Items"]
        if "LastEvaluatedKey" not in page:
            break
        kwargs["ExclusiveStartKey"] = page["LastEvaluatedKey"]   # the cursor for the next page
    print("pages fetched:", pages)


items = list(events_since("u1", "2026-10-11"))
print("events since Oct 11:", len(items), "| newest:", items[0]["sk"])`,
        },
        output: "pages fetched: 2\nevents since Oct 11: 150 | newest: EVENT#2026-10-25#0249",
      },
    },
    challenge: {
      title: "Storage tiers: when is cold storage cheaper?",
      brief: [
        "Model the yearly cost of 2 TB of old homework in hot, cool and archive-instant tiers, including retrieval fees, for different read frequencies. Recommend a lifecycle rule.",
      ],
      criteria: [
        "Storage and retrieval both modelled",
        "Results for several read frequencies",
        "A concrete lifecycle recommendation",
      ],
      hints: ["Cold tiers are cheap to store but charge per GB read and have minimum storage durations."],
      solution: {
        text: [
          "Rarely read data belongs in cold tiers: 5× cheaper than hot. But if each file is read monthly, retrieval fees make the coldest tier the most expensive option.",
          "Recommendation: keep homework hot for 30 days, move to cool after 30, to archive-instant after 180, and expire `tmp/` after 7 days. Re-check against real access logs.",
        ],
        code: {
          lang: "python",
          file: "tiers.py",
          code: `"""Should old homework files move to a cheaper storage class? Approximate per-GB prices;
check the S3 / Blob pricing pages for your region before deciding."""
TIERS = {   # storage $/GB-month, retrieval $/GB, minimum days billed
    "standard (hot)": (0.023, 0.00, 0),
    "infrequent (cool)": (0.0125, 0.01, 30),
    "archive-instant (cold)": (0.004, 0.03, 90),
}


def yearly_cost(tier: str, gb: float, reads_per_year: float) -> float:
    storage, retrieval, _ = TIERS[tier]
    return gb * storage * 12 + gb * reads_per_year * retrieval


GB = 2_000          # two terabytes of old homework
for reads in (0.1, 1, 12):
    costs = {t: yearly_cost(t, GB, reads) for t in TIERS}
    best = min(costs, key=costs.get)
    row = "  ".join(f"{t.split()[0]} \${c:,.0f}" for t, c in costs.items())
    print(f"each file read {reads:>4}x/year: {row}  -> {best}")`,
        },
        output: "each file read  0.1x/year: standard $552  infrequent $302  archive-instant $102  -> archive-instant (cold)\neach file read    1x/year: standard $552  infrequent $320  archive-instant $156  -> archive-instant (cold)\neach file read   12x/year: standard $552  infrequent $540  archive-instant $816  -> infrequent (cool)",
      },
    },
    capstone: {
      title: "DevAtlas: a portable storage layer",
      brief: [
        "Define a `Storage` protocol (put, get, list, download_url) with S3 and Azure Blob implementations, chosen by an environment variable. Write one contract test that runs against both LocalStack and Azurite.",
      ],
      criteria: [
        "One interface, two backends",
        "Signed download URLs on both",
        "Same test passes against both emulators",
        "No credentials in code",
      ],
      hints: ["`pytest.fixture(params=[...])` runs a test once per backend."],
      solution: {
        text: [
          "The contract test is the real deliverable: any new backend (local disk for development, Google Cloud Storage later) must pass it. Verified: 2 passed (S3 on LocalStack, Blob on Azurite).",
        ],
        code: {
          lang: "python",
          file: "services/api/storage.py",
          code: `"""services/api/storage.py: one interface, two clouds. Pick the backend with STORAGE_BACKEND."""
import os
from datetime import datetime, timedelta, timezone
from typing import Protocol


class Storage(Protocol):
    def put(self, key: str, data: bytes, content_type: str) -> None: ...
    def get(self, key: str) -> bytes: ...
    def list(self, prefix: str) -> list[str]: ...
    def download_url(self, key: str, minutes: int = 5) -> str: ...


class S3Storage:
    def __init__(self, bucket: str, **client_kwargs):
        import boto3
        self.s3, self.bucket = boto3.client("s3", **client_kwargs), bucket

    def put(self, key, data, content_type):
        self.s3.put_object(Bucket=self.bucket, Key=key, Body=data, ContentType=content_type)

    def get(self, key):
        return self.s3.get_object(Bucket=self.bucket, Key=key)["Body"].read()

    def list(self, prefix):
        pages = self.s3.get_paginator("list_objects_v2").paginate(Bucket=self.bucket, Prefix=prefix)
        return [o["Key"] for p in pages for o in p.get("Contents", [])]

    def download_url(self, key, minutes=5):
        return self.s3.generate_presigned_url("get_object", Params={"Bucket": self.bucket, "Key": key},
                                              ExpiresIn=minutes * 60)


class BlobStorage:
    def __init__(self, container: str, connection_string: str):
        from azure.storage.blob import BlobServiceClient
        self.service = BlobServiceClient.from_connection_string(connection_string)
        self.container = self.service.get_container_client(container)

    def put(self, key, data, content_type):
        from azure.storage.blob import ContentSettings
        self.container.upload_blob(key, data, overwrite=True,
                                   content_settings=ContentSettings(content_type=content_type))

    def get(self, key):
        return self.container.download_blob(key).readall()

    def list(self, prefix):
        return [b.name for b in self.container.list_blobs(name_starts_with=prefix)]

    def download_url(self, key, minutes=5):
        from azure.storage.blob import BlobSasPermissions, generate_blob_sas
        sas = generate_blob_sas(self.service.account_name, self.container.container_name, key,
                                account_key=self.service.credential.account_key,
                                permission=BlobSasPermissions(read=True),
                                expiry=datetime.now(timezone.utc) + timedelta(minutes=minutes))
        return f"{self.container.url}/{key}?{sas}"


def from_env() -> Storage:
    if os.environ.get("STORAGE_BACKEND", "s3") == "azure":
        return BlobStorage(os.environ["BLOB_CONTAINER"], os.environ["AZURE_STORAGE_CONNECTION_STRING"])
    return S3Storage(os.environ["S3_BUCKET"])

# ---- services/api/test_storage.py ----
"""Contract test: the same assertions run against LocalStack (S3) and Azurite (Blob)."""
import urllib.request
import uuid

import boto3
import pytest
from azure.storage.blob import BlobServiceClient

from storage import BlobStorage, S3Storage

AWS = dict(endpoint_url="http://localhost:4566", region_name="us-east-1",
           aws_access_key_id="test", aws_secret_access_key="test")


@pytest.fixture(params=["s3", "blob"])
def storage(request):
    name = f"t-{uuid.uuid4().hex[:8]}"
    if request.param == "s3":
        boto3.client("s3", **AWS).create_bucket(Bucket=name)
        return S3Storage(name, **AWS)
    BlobServiceClient.from_connection_string("UseDevelopmentStorage=true").create_container(name)
    return BlobStorage(name, "UseDevelopmentStorage=true")


def test_round_trip_list_and_signed_url(storage):
    storage.put("homework/u1/a.py", b"print(1)\\n", "text/x-python")
    storage.put("homework/u1/b.py", b"print(2)\\n", "text/x-python")
    storage.put("homework/u2/c.py", b"print(3)\\n", "text/x-python")
    assert storage.get("homework/u1/a.py") == b"print(1)\\n"
    assert sorted(storage.list("homework/u1/")) == ["homework/u1/a.py", "homework/u1/b.py"]
    assert urllib.request.urlopen(storage.download_url("homework/u2/c.py")).read() == b"print(3)\\n"`,
        },
        output: "2 passed",
      },
    },
  },
  deeper: [
    {
      label: "Amazon S3 user guide: security best practices",
      url: "https://docs.aws.amazon.com/AmazonS3/latest/userguide/security-best-practices.html",
    },
    {
      label: "Azure Blob Storage: SAS overview",
      url: "https://learn.microsoft.com/azure/storage/common/storage-sas-overview",
    },
    {
      label: "DynamoDB: best practices for designing partition keys",
      url: "https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/bp-partition-key-design.html",
    },
    {
      label: "Azure Cosmos DB: partitioning overview",
      url: "https://learn.microsoft.com/azure/cosmos-db/partitioning-overview",
    },
  ],
  nextPreview: "Next: networking and identity: VPCs and VNets, load balancers, IAM and Entra ID, and secrets, so every component can reach only what it needs.",
};
