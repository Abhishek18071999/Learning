import type { Lesson } from "../../types";

export const lesson: Lesson = {
  id: "9.3.1",
  title: "Terraform",
  minutes: 90,
  level: "Intermediate",
  prerequisites: ["8.3.1 VPC/VNet, load balancers, IAM/Entra ID, secrets", "9.2.1 GitHub Actions and Azure Pipelines"],
  summary: "Manage cloud infrastructure as reviewed code with Terraform: providers, resources, variables with validation, the plan → apply workflow, state and why it must be remote and locked, drift detection, modules, safe refactors with `moved`, adopting existing resources with `import`, and a CI pipeline that blocks dangerous plans. Every command was run against LocalStack.",
  terms: [
    {
      term: "Infrastructure as Code (IaC)",
      def: "Describing infrastructure in versioned files that a tool turns into real resources, instead of clicking in a console.",
    },
    {
      term: "Provider",
      def: "A plugin that talks to one platform's API (aws, azurerm, google, kubernetes, github...).",
    },
    {
      term: "Resource / data source",
      def: "A resource is something Terraform creates and manages; a data source reads something that already exists.",
    },
    {
      term: "State",
      def: "Terraform's record of which real objects belong to which resource addresses, with their last known attributes.",
    },
    {
      term: "Plan / apply",
      def: "Plan computes the difference between code, state and reality; apply executes exactly that plan.",
    },
    {
      term: "Backend",
      def: "Where state is stored. Teams use a remote backend (S3, Azure Storage, Terraform Cloud) with locking.",
    },
    {
      term: "Drift",
      def: "Real infrastructure changed outside Terraform (console clicks, scripts), so it no longer matches the code.",
    },
    {
      term: "Module",
      def: "A reusable folder of Terraform with input variables and outputs, called like a function.",
    },
  ],
  problem: [
    "DevAtlas's AWS account was built by hand over a year. Nobody knows why a security group allows port 22 from everywhere, staging differs from production in ways that cause 'works in staging' bugs, and rebuilding after an accidental deletion would take days of guesswork.",
    "With infrastructure as code, every change is a pull request with a reviewed plan, environments are created from the same modules, and the code is the documentation. But Terraform has its own sharp edges: state files, drift, and plans that quietly delete a database. This lesson covers both the workflow and the safety rails.",
  ],
  concept: {
    analogy: [
      "Terraform is like an **architect's blueprint plus a site manager**. The blueprint (code) describes the finished building. The site manager keeps a **ledger** (state) of what has been built and where. Before any work, they produce a **change list** (plan) for you to approve: 'add two windows, repaint one door, demolish nothing'. If someone renovated without telling them (drift), the next inspection shows it.",
    ],
    precise: [
      "**Declarative:** you describe the desired end state; Terraform builds a dependency graph from references (`aws_s3_bucket.uploads.id`) and creates, updates or deletes resources in the right order, in parallel where possible.",
      "**Workflow:** `init` (download providers, configure backend) → `fmt` and `validate` → `plan -out tfplan` (review!) → `apply tfplan` (exactly what you reviewed). Symbols: `+` create, `~` update in place, `-` destroy, `-/+` replace (destroy then create: data loss for stateful resources).",
      "**State:** maps addresses (`module.storage.aws_s3_bucket.uploads`) to real IDs. It can contain secrets, so store it in an encrypted, versioned remote backend with locking, never in Git. One state per environment (and per large component) limits blast radius.",
      "**Inputs and outputs:** variables (with types, defaults and `validation` blocks), `locals` for derived values, outputs to expose IDs to other configurations or modules. Environments differ only in variable values.",
      "**Safety tools:** `lifecycle { prevent_destroy = true }` on data stores, `moved` blocks for refactors, `import` blocks to adopt existing resources, `-detailed-exitcode` to detect drift in scheduled jobs, and a plan policy check in CI.",
    ],
  },
  underTheHood: {
    text: [
      "During plan, Terraform refreshes state by reading each resource from the provider API, compares the refreshed state with your configuration, and produces a diff. Some attribute changes can be applied in place; others force replacement because the cloud API cannot change them (a bucket's name, a database's engine).",
      "Locking: before writing state, Terraform takes a lock (a DynamoDB item, a blob lease, or with Terraform 1.10+ an S3 lock file). A second run fails with 'Error acquiring the state lock' instead of corrupting state. `force-unlock` exists for crashed runs; use it only when you are sure nothing is running.",
      "Providers are versioned plugins downloaded during `init`; the `.terraform.lock.hcl` file pins their exact versions and checksums. Commit it, so every machine and CI run uses the same provider builds.",
      "`terraform show -json tfplan` exposes the plan as data (`resource_changes[].change.actions`), which is how policy tools (OPA/Conftest, Sentinel, Checkov, or a 30-line script) can approve or block plans automatically.",
    ],
    diagram: {
      title: "Plan before apply",
      nodes: [
        { label: "Code", sub: ".tf files in Git" },
        { label: "State", sub: "remote, locked" },
        { label: "Reality", sub: "cloud APIs" },
        { label: "Plan", sub: "+ ~ - -/+" },
        { label: "Review + policy", sub: "PR, plan_guard" },
        { label: "Apply", sub: "exactly that plan" },
      ],
      edges: ["compare", "refresh", "diff", "approve", "execute"],
    },
  },
  handsOn: [
    {
      title: "A first configuration: variables, locals, resources, outputs",
      code: {
        lang: "hcl",
        file: "main.tf",
        code: `terraform {
  required_version = ">= 1.6"
  required_providers {
    aws = { source = "hashicorp/aws", version = "~> 5.0" }
  }
}

variable "env" {
  type        = string
  description = "Deployment environment"
  validation {
    condition     = contains(["dev", "staging", "prod"], var.env)
    error_message = "env must be dev, staging or prod."
  }
}

locals {
  name = "devatlas-\${var.env}"
  tags = { project = "devatlas", env = var.env, managed_by = "terraform" }
}

resource "aws_s3_bucket" "uploads" {
  bucket = "\${local.name}-uploads"
  tags   = local.tags
}

resource "aws_s3_bucket_versioning" "uploads" {
  bucket = aws_s3_bucket.uploads.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_dynamodb_table" "progress" {
  name         = "\${local.name}-progress"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "pk"
  range_key    = "sk"
  attribute {
    name = "pk"
    type = "S"
  }
  attribute {
    name = "sk"
    type = "S"
  }
  tags = local.tags

  lifecycle {
    prevent_destroy = true # a plan that would delete this table fails
  }
}

output "bucket" {
  value = aws_s3_bucket.uploads.bucket
}
output "table" {
  value = aws_dynamodb_table.progress.name
}`,
      },
      notes: [
        "A second file, `localstack.tf`, holds the provider block pointing at LocalStack (endpoints for s3, dynamodb and sts, `s3_use_path_style`, and the `skip_*` flags). For real AWS it is just `provider \"aws\" { region = \"eu-west-1\" }`.",
      ],
    },
    {
      title: "Validate inputs, plan, apply",
      code: {
        lang: "bash",
        code: `terraform init
terraform plan -var env=qa              # validation rejects it
terraform plan -var env=dev -out tfplan
terraform apply tfplan
terraform state list`,
      },
      output: "│ Error: Invalid value for variable\n│ env must be dev, staging or prod.\n\n  # aws_dynamodb_table.progress will be created\n  # aws_s3_bucket.uploads will be created\n  # aws_s3_bucket_versioning.uploads will be created\nPlan: 3 to add, 0 to change, 0 to destroy.\n\nApply complete! Resources: 3 added, 0 changed, 0 destroyed.\nbucket = \"devatlas-dev-uploads\"\ntable = \"devatlas-dev-progress\"\n\naws_dynamodb_table.progress\naws_s3_bucket.uploads\naws_s3_bucket_versioning.uploads",
    },
    {
      title: "Detect drift and protect data",
      text: [
        "Someone adds a tag in the console. The next plan shows it, and `-detailed-exitcode` returns 2, which a nightly job can alert on. Then try to destroy the table.",
      ],
      code: {
        lang: "bash",
        code: `# (a tag 'owner' was added to the bucket outside Terraform)
terraform plan -var env=dev -detailed-exitcode; echo "exit=$?"
terraform plan -destroy -var env=dev`,
      },
      output: "  # aws_s3_bucket.uploads will be updated in-place\n      ~ tags = {\n          + \"managed_by\" = \"terraform\"\n          - \"owner\"      = \"someone-in-the-console\" -> null\nPlan: 0 to add, 1 to change, 0 to destroy.\nexit=2\n\n│ Error: Instance cannot be destroyed\n│ Resource aws_dynamodb_table.progress has lifecycle.prevent_destroy set, ...",
      notes: ["Exit codes with `-detailed-exitcode`: 0 no changes, 1 error, 2 changes present."],
    },
    {
      title: "Remote state with locking",
      code: {
        lang: "hcl",
        file: "backend.tf",
        code: `# State lives in S3 (versioned, encrypted); a DynamoDB table provides the lock.
# Create the bucket and table once, outside this configuration (a bootstrap step).
terraform {
  backend "s3" {
    bucket         = "devatlas-tfstate"
    key            = "app/dev.tfstate"
    region         = "eu-west-1"
    dynamodb_table = "devatlas-tflock" # Terraform 1.10+: use_lockfile = true instead
    encrypt        = true

    # LocalStack only:
    use_path_style              = true
    skip_credentials_validation = true
    skip_requesting_account_id  = true
    skip_metadata_api_check     = true
    endpoints = {
      s3       = "http://localhost:4566"
      dynamodb = "http://localhost:4566"
    }
  }
}`,
      },
      output: "$ terraform init\nSuccessfully configured the backend \"s3\"!\n$ terraform apply -auto-approve -var env=dev\nApply complete! Resources: 3 added, 0 changed, 0 destroyed.\n# state object in the bucket: ['app/dev.tfstate']\n\n# a second run while the first holds the lock:\n$ terraform plan -var env=dev -lock-timeout=0s\n│ Error: Error acquiring the state lock\n│ Lock Info:\n│   ID:        32898f67-80f3-e9fc-99d8-eb2c29ae44c2\n│   Operation: OperationTypeApply",
      notes: [
        "Turn on versioning for the state bucket: if state is ever corrupted, you can restore the previous version. Restrict who can read it, because state can contain secrets.",
      ],
    },
    {
      title: "Block dangerous plans in CI",
      code: {
        lang: "python",
        file: "scripts/plan_guard.py",
        code: `"""CI gate: fail if a Terraform plan deletes or replaces stateful resources.
Usage: terraform plan -out tfplan && terraform show -json tfplan > plan.json && python plan_guard.py plan.json"""
import json
import sys

STATEFUL = {"aws_s3_bucket", "aws_dynamodb_table", "aws_db_instance", "aws_rds_cluster",
            "azurerm_storage_account", "azurerm_postgresql_flexible_server"}

plan = json.load(open(sys.argv[1]))
summary, blocked = {"create": 0, "update": 0, "delete": 0}, []
for rc in plan.get("resource_changes", []):
    actions = rc["change"]["actions"]                 # e.g. ["create"], ["delete", "create"]
    for a in actions:
        if a in summary:
            summary[a] += 1
    if "delete" in actions and rc["type"] in STATEFUL:
        kind = "REPLACE" if "create" in actions else "DELETE"
        blocked.append(f"{kind} {rc['address']}")

print("plan:", summary)
for b in blocked:
    print("BLOCKED:", b)
sys.exit(1 if blocked else 0)`,
      },
      output: "# after renaming the bucket in code (a forced replacement):\nplan: {'create': 2, 'update': 0, 'delete': 2}\nBLOCKED: REPLACE aws_s3_bucket.uploads\nexit=1",
      notes: [
        "Renaming a bucket looks harmless in a diff, but S3 cannot rename buckets, so Terraform plans destroy + create: every object would be lost. The guard turns that into a failed check that a human must consciously override.",
      ],
    },
  ],
  companies: [
    "**Everything through pull requests:** platform teams run `plan` on every infrastructure PR, post the plan for review, and only apply from main after approval, often with tools like Atlantis, Terraform Cloud/HCP Terraform, Spacelift or plain CI.",
    "**Module libraries:** organisations publish internal modules (network, service, database) with secure defaults, so product teams get compliant infrastructure by filling in a few variables.",
    "**State per environment and component:** large estates split state (network, data, apps; dev, staging, prod) to keep plans fast and limit the blast radius of mistakes.",
    "**Policy as code:** Sentinel, OPA/Conftest or Checkov rules block public buckets, open security groups, untagged resources or deletions of data stores before apply.",
    "**OpenTofu**, the open-source fork created after Terraform's licence change, is a drop-in alternative used by some companies; the language and workflow are the same.",
  ],
  mistakes: [
    {
      mistake: "Local state files (or state in Git)",
      why: "It works on one laptop",
      wrong: "Lost state, conflicting applies, secrets committed",
      fix: "Remote backend with encryption, versioning and locking from day one",
    },
    {
      mistake: "`apply` without reading the plan",
      why: "Auto-approve is convenient",
      wrong: "A forced replacement silently deletes a database or bucket",
      fix: "Plan to a file, review (human + policy check), apply that file",
    },
    {
      mistake: "Renaming resources or moving them into modules",
      why: "Refactoring code feels safe",
      wrong: "Terraform plans destroy + create for the 'new' address",
      fix: "Add `moved` blocks so state follows the code",
    },
    {
      mistake: "Clicking changes in the console",
      why: "Faster in the moment",
      wrong: "Drift; the next apply reverts the change or fails",
      fix: "All changes through code; scheduled drift detection with `-detailed-exitcode`",
    },
    {
      mistake: "One giant state for everything",
      why: "Simple to start",
      wrong: "Slow plans, risky applies, everyone blocked by one lock",
      fix: "Split by environment and component; pass values via outputs or data sources",
    },
    {
      mistake: "Unpinned provider versions",
      why: "Always get the latest",
      wrong: "A provider upgrade changes behaviour mid-project",
      fix: "Version constraints plus a committed `.terraform.lock.hcl`",
    },
  ],
  bestPractices: [
    {
      tag: "Reliability",
      text: "Remote, locked, versioned state per environment; `prevent_destroy` on stateful resources; apply only saved, reviewed plans.",
    },
    {
      tag: "Security",
      text: "Separate read-only plan roles from apply roles, restrict state access, and run policy checks for public exposure and wildcards.",
    },
    {
      tag: "Maintainability",
      text: "Small modules with clear inputs/outputs, `terraform fmt`, `validate` and docs; environments differ only in variables.",
    },
    {
      tag: "Cost",
      text: "Tag everything from a `locals` block; review plans for expensive resource types; destroy ephemeral environments automatically.",
    },
    {
      tag: "Performance",
      text: "Split large configurations; use `-target` only for emergencies, not as a workflow.",
    },
  ],
  interview: [
    {
      q: "What is Terraform state and how should a team manage it?",
      a: "State maps resource addresses in code to real infrastructure IDs and stores their last known attributes, which lets Terraform compute diffs. Teams keep it in a remote backend (S3 with locking, Azure Storage, HCP Terraform) with encryption, versioning and restricted access, use one state per environment or component, never edit it by hand except with state commands, and never commit it because it can contain secrets.",
    },
    {
      q: "How do you refactor Terraform code without destroying resources?",
      a: "Use `moved` blocks (or `terraform state mv` in older versions) to tell Terraform the resource's address changed, then check that the plan shows 'has moved' with no destroy. For resources created outside Terraform, use `import` blocks. Always review the plan for `-/+` replacements before applying.",
    },
    {
      q: "How would you run Terraform in CI/CD safely?",
      a: "On pull requests: fmt check, validate, plan with a read-only role, policy checks on the JSON plan (deletes of stateful resources, public exposure, tags), and post the plan for review. On merge: apply exactly the saved plan with a separate, more privileged role via OIDC, environment by environment with approvals for production, and a lock timeout. Run scheduled plans with -detailed-exitcode to detect drift.",
    },
  ],
  quickCheck: [
    {
      kind: "mcq",
      prompt: "A plan shows `-/+ resource \"aws_db_instance\" \"main\"` after you changed the engine version format. What should you do?",
      options: [
        "Apply: `-/+` means update",
        "Stop: it means destroy and recreate; investigate before applying",
        "Run apply twice",
        "Delete the state file and retry",
      ],
      answer: 1,
      explanation: "`-/+` is a replacement. For a database that means data loss unless you have a migration plan. Find which attribute forces replacement.",
    },
    {
      kind: "output",
      prompt: "What does the plan guard print for this plan JSON?",
      code: {
        lang: "python",
        code: `changes = [
    {"type": "aws_s3_bucket", "address": "aws_s3_bucket.logs", "actions": ["update"]},
    {"type": "aws_dynamodb_table", "address": "aws_dynamodb_table.t", "actions": ["delete", "create"]},
    {"type": "aws_iam_role", "address": "aws_iam_role.r", "actions": ["delete"]},
]
STATEFUL = {"aws_s3_bucket", "aws_dynamodb_table"}
print([c["address"] for c in changes if "delete" in c["actions"] and c["type"] in STATEFUL])`,
      },
      options: [
        "[]",
        "['aws_dynamodb_table.t']",
        "['aws_dynamodb_table.t', 'aws_iam_role.r']",
        "['aws_s3_bucket.logs', 'aws_dynamodb_table.t']",
      ],
      answer: 1,
      explanation: "Only the table is both stateful and deleted (as part of a replacement). Deleting an IAM role loses no data; the bucket is only updated.",
    },
    {
      kind: "bug",
      prompt: "Two engineers ran `terraform apply` at the same time and the state is now inconsistent. What is missing?",
      code: {
        lang: "hcl",
        code: `terraform {
  backend "s3" {
    bucket = "devatlas-tfstate"
    key    = "prod.tfstate"
    region = "eu-west-1"
  }
}`,
      },
      options: [
        "encrypt = true",
        "A lock: dynamodb_table (or use_lockfile = true on Terraform 1.10+)",
        "A different key",
        "versioning on the bucket",
      ],
      answer: 1,
      explanation: "Without a lock, concurrent runs can both read and write state. Encryption and versioning are also good, but locking is what prevents this race.",
    },
  ],
  cheatSheet: [
    "`init` → `fmt` → `validate` → `plan -out tfplan` → review → `apply tfplan`.",
    "`+` create · `~` update · `-` destroy · `-/+` replace (danger for data).",
    "Remote state: encrypted, versioned, locked; one per env/component; never in Git.",
    "Variables with `validation`; `locals` for tags and names; outputs for IDs.",
    "`lifecycle { prevent_destroy = true }` on data stores.",
    "Refactor with `moved`; adopt with `import`; drift via `plan -detailed-exitcode` (2 = changes).",
    "Commit `.terraform.lock.hcl`; pin provider versions.",
    "CI: read-only plan role, policy check on `show -json`, apply role via OIDC.",
  ],
  homework: {
    basic: {
      title: "Environments through variables",
      brief: [
        "Add `dev.tfvars` and `prod.tfvars` for the first configuration. Production must enable point-in-time recovery on the table and use a different name prefix. Show that an invalid environment is rejected.",
      ],
      criteria: [
        "Validation on `env`",
        "Per-environment tfvars",
        "A boolean variable that changes resource settings",
        "Plans for both environments",
      ],
      hints: ["`terraform plan -var-file=prod.tfvars`."],
      solution: {
        text: [
          "Environments should differ only in inputs. Validation turns typos into immediate, readable errors instead of resources named `devatlas-prdo-uploads`.",
        ],
        code: {
          lang: "hcl",
          file: "variables.tf",
          code: `variable "env" {
  type = string
  validation {
    condition     = contains(["dev", "staging", "prod"], var.env)
    error_message = "env must be dev, staging or prod."
  }
}

variable "point_in_time_recovery" {
  type    = bool
  default = false
}

# in aws_dynamodb_table.progress:
#   point_in_time_recovery {
#     enabled = var.point_in_time_recovery
#   }

# ---- dev.tfvars ----
# env = "dev"

# ---- prod.tfvars ----
# env                    = "prod"
# point_in_time_recovery = true`,
        },
        output: "$ terraform plan -var env=qa\n│ Error: Invalid value for variable\n│ env must be dev, staging or prod.",
      },
    },
    intermediate: {
      title: "Adopt a hand-made resource with `import`",
      brief: [
        "Create a bucket outside Terraform (CLI or SDK), then bring it under management with an `import` block without recreating it. Read the plan carefully: what else changes?",
      ],
      criteria: [
        "Plan shows 1 to import and 0 to destroy",
        "Configuration matches the real resource",
        "Explanation of the in-place change",
      ],
      hints: ["`terraform plan -generate-config-out=generated.tf` can write a starting configuration for you."],
      solution: {
        text: [
          "The plan imports the bucket and updates it in place, because the configuration adds tags the hand-made bucket did not have. Import adopts; your code then becomes the source of truth.",
        ],
        code: {
          lang: "hcl",
          file: "import.tf",
          code: `terraform {
  required_providers {
    aws = { source = "hashicorp/aws", version = "~> 5.0" }
  }
}

# Someone created this bucket by hand. Bring it under Terraform without recreating it.
import {
  to = aws_s3_bucket.reports
  id = "devatlas-legacy-reports"
}

resource "aws_s3_bucket" "reports" {
  bucket = "devatlas-legacy-reports"
  tags   = { project = "devatlas", managed_by = "terraform" }
}`,
        },
        output: "Plan: 1 to import, 0 to add, 1 to change, 0 to destroy.\nApply complete! Resources: 1 imported, 0 added, 1 changed, 0 destroyed.",
      },
    },
    challenge: {
      title: "Refactor into a module without destroying anything",
      brief: [
        "Move the bucket, versioning and table from the root into `modules/app_storage`, called as `module.storage`. Use `moved` blocks so the plan shows zero changes to real infrastructure.",
      ],
      criteria: [
        "Module with variables and outputs",
        "Three `moved` blocks",
        "Plan: 0 to add, 0 to change, 0 to destroy",
        "`state list` shows module addresses",
      ],
      hints: ["Run the plan before adding `moved` blocks to see what Terraform would have done."],
      solution: {
        text: [
          "Without `moved`, the same refactor plans 3 destroys and 3 creates, deleting the table's data (or failing on prevent_destroy). With it, state follows the code. Verified on LocalStack.",
        ],
        code: {
          lang: "hcl",
          file: "main.tf",
          code: `terraform {
  required_version = ">= 1.6"
  required_providers {
    aws = { source = "hashicorp/aws", version = "~> 5.0" }
  }
}

variable "env" {
  type = string
  validation {
    condition     = contains(["dev", "staging", "prod"], var.env)
    error_message = "env must be dev, staging or prod."
  }
}

module "storage" {
  source = "./modules/app_storage"
  name   = "devatlas-\${var.env}"
  tags   = { project = "devatlas", env = var.env, managed_by = "terraform" }
}

# The resources already exist at the old addresses. Tell Terraform they moved,
# instead of letting it destroy and recreate them (which would delete data).
moved {
  from = aws_s3_bucket.uploads
  to   = module.storage.aws_s3_bucket.uploads
}
moved {
  from = aws_s3_bucket_versioning.uploads
  to   = module.storage.aws_s3_bucket_versioning.uploads
}
moved {
  from = aws_dynamodb_table.progress
  to   = module.storage.aws_dynamodb_table.progress
}

output "bucket" {
  value = module.storage.bucket
}

# ---- modules/app_storage/main.tf ----
# (variables name and tags; the bucket, versioning and table resources; outputs bucket and table)`,
        },
        output: "  # aws_dynamodb_table.progress has moved to module.storage.aws_dynamodb_table.progress\n  # aws_s3_bucket.uploads has moved to module.storage.aws_s3_bucket.uploads\n  # aws_s3_bucket_versioning.uploads has moved to module.storage.aws_s3_bucket_versioning.uploads\nPlan: 0 to add, 0 to change, 0 to destroy.\n\n$ terraform state list\nmodule.storage.aws_dynamodb_table.progress\nmodule.storage.aws_s3_bucket.uploads\nmodule.storage.aws_s3_bucket_versioning.uploads",
      },
    },
    capstone: {
      title: "DevAtlas: infrastructure pipeline",
      brief: [
        "Lay out `infra/modules/*` and `infra/envs/{dev,prod}` (each with its own backend key), and add a workflow that plans every environment on pull requests with a read-only role, runs the plan guard, and applies the saved plans on main, dev first, prod after approval.",
      ],
      criteria: [
        "Separate state per environment",
        "Plan artifacts applied unchanged",
        "Plan guard in the pipeline",
        "Different roles for plan and apply",
        "actionlint clean",
      ],
      hints: ["`strategy.max-parallel: 1` makes a matrix run sequentially."],
      solution: {
        text: [
          "Applying the uploaded plan file guarantees that what was reviewed is what runs; if anything changed in between, Terraform refuses the stale plan. Keep plan artifacts' retention short: they can contain sensitive values.",
        ],
        code: {
          lang: "yaml",
          file: ".github/workflows/infra.yml",
          code: `name: infra

on:
  pull_request:
    paths: ["infra/**"]
  push:
    branches: [main]
    paths: ["infra/**"]

permissions:
  contents: read
  id-token: write                       # OIDC to AWS

jobs:
  plan:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        env: [dev, prod]
    defaults:
      run:
        working-directory: infra/envs/\${{ matrix.env }}
    steps:
      - uses: actions/checkout@v4
      - uses: hashicorp/setup-terraform@v3
        with:
          terraform_version: "1.9.8"
      - uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: arn:aws:iam::123456789012:role/terraform-plan   # read-only role
          aws-region: eu-west-1
      - run: terraform fmt -check -recursive ../..
      - run: terraform init -input=false
      - run: terraform validate
      - run: terraform plan -input=false -lock-timeout=5m -out tfplan
      - run: terraform show -json tfplan > plan.json
      - run: python3 ../../scripts/plan_guard.py plan.json      # blocks deletes of stateful resources
      - uses: actions/upload-artifact@v4
        with:
          name: tfplan-\${{ matrix.env }}
          path: infra/envs/\${{ matrix.env }}/tfplan

  apply:
    needs: plan
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    strategy:
      max-parallel: 1                   # dev first, then prod
      matrix:
        env: [dev, prod]
    environment: \${{ matrix.env }}      # prod requires an approval
    defaults:
      run:
        working-directory: infra/envs/\${{ matrix.env }}
    steps:
      - uses: actions/checkout@v4
      - uses: hashicorp/setup-terraform@v3
        with:
          terraform_version: "1.9.8"
      - uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: arn:aws:iam::123456789012:role/terraform-apply-\${{ matrix.env }}
          aws-region: eu-west-1
      - uses: actions/download-artifact@v4
        with:
          name: tfplan-\${{ matrix.env }}
          path: infra/envs/\${{ matrix.env }}
      - run: terraform init -input=false
      - run: terraform apply -input=false tfplan               # exactly the plan that was reviewed`,
        },
        output: "$ actionlint\n(no output: no problems found)",
      },
    },
  },
  deeper: [
    { label: "Terraform docs: Language", url: "https://developer.hashicorp.com/terraform/language" },
    {
      label: "Terraform docs: S3 backend",
      url: "https://developer.hashicorp.com/terraform/language/backend/s3",
    },
    {
      label: "Terraform docs: Refactoring with moved blocks",
      url: "https://developer.hashicorp.com/terraform/language/modules/develop/refactoring",
    },
    { label: "OpenTofu documentation", url: "https://opentofu.org/docs/" },
  ],
  nextPreview: "Next: Kubernetes: pods, deployments, services and ingress, and how desired state and rolling updates keep apps running.",
};
