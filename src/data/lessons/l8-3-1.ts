import type { Lesson } from "../../types";

export const lesson: Lesson = {
  id: "8.3.1",
  title: "VPC/VNet, load balancers, IAM/Entra ID, secrets",
  minutes: 90,
  level: "Intermediate",
  prerequisites: ["8.1.1 VMs, functions and containers", "0.1.1 What happens when you type a URL", "0.1.2 HTTP in depth"],
  summary: "Design a cloud network where every component can reach only what it needs: subnets across zones, security groups that reference each other, load balancers at the edge, least-privilege identities (AWS IAM, Microsoft Entra ID, managed identities) and secrets fetched at runtime. Built with Terraform and applied to LocalStack.",
  terms: [
    {
      term: "VPC / VNet",
      def: "Your private network in the cloud (AWS Virtual Private Cloud / Azure Virtual Network), with an IP range you choose.",
    },
    {
      term: "Subnet (public / private)",
      def: "A slice of the network in one availability zone. Public subnets route to the internet gateway; private subnets do not.",
    },
    {
      term: "CIDR",
      def: "Notation for IP ranges: 10.20.0.0/16 means the first 16 bits are fixed, giving 65,536 addresses.",
    },
    {
      term: "Security group / NSG",
      def: "A stateful firewall attached to resources (AWS) or subnets/NICs (Azure Network Security Group). Allow rules only on AWS SGs.",
    },
    {
      term: "Load balancer",
      def: "Spreads traffic across healthy instances. L7 (HTTP): AWS ALB, Azure Application Gateway / Front Door. L4 (TCP/UDP): AWS NLB, Azure Load Balancer.",
    },
    {
      term: "IAM role / managed identity",
      def: "An identity a workload assumes to get short-lived credentials, instead of storing keys. Azure calls these managed identities (in Microsoft Entra ID).",
    },
    {
      term: "Least privilege",
      def: "Granting only the actions and resources a principal needs, and nothing more.",
    },
    {
      term: "Secret manager",
      def: "A service that stores, encrypts, audits and rotates secrets: AWS Secrets Manager, Azure Key Vault.",
    },
  ],
  problem: [
    "A security review of DevAtlas finds: the PostgreSQL database has a public IP 'for debugging', every service uses the same AWS access key with AdministratorAccess, the Anthropic API key is in a `.env` file baked into the container image, and nobody can say which services are allowed to talk to which.",
    "Any one of these turns a small bug (an SSRF, a leaked log line, a compromised dependency) into a full breach. This lesson builds the standard defence: private networking, identity per workload, least-privilege policies, and secrets that never touch code or images.",
  ],
  concept: {
    analogy: [
      "Think of an office building. The **VPC** is the building; **subnets** are floors (the lobby is public, offices and the vault are private). **Security groups** are badge readers on each door: the vault door opens only for people coming from the accounting office. The **load balancer** is reception, the only entrance from the street. **IAM roles** are job badges that grant specific rooms and expire at the end of the day, and the **secret manager** is the locked key cabinet that logs every key taken.",
    ],
    precise: [
      "**Network layout:** one VPC/VNet per environment, three tiers of subnets (public for load balancers and NAT, private app, private data) in at least two (ideally three) availability zones. Only the load balancer has a public address. Private resources reach the internet outbound through a NAT gateway, and reach cloud services privately through VPC endpoints / Azure Private Endpoints.",
      "**Firewalls by reference:** AWS security groups are stateful and allow-only; reference other security groups instead of IP ranges (\"db allows 5432 from the app SG\"). Azure NSGs have ordered allow/deny rules and service tags; application security groups play the 'by reference' role.",
      "**Load balancers:** terminate TLS, run health checks, route by host or path (L7), and spread traffic across zones. Global options (CloudFront, Azure Front Door) add a CDN and web application firewall at the edge.",
      "**Identity:** humans sign in through SSO (AWS IAM Identity Center, Microsoft Entra ID) with MFA; workloads use roles / managed identities that issue short-lived credentials automatically. AWS policies are JSON statements (Effect, Action, Resource, Condition); Azure uses RBAC role assignments at a scope (subscription, resource group, resource).",
      "**Policy evaluation (AWS):** an explicit Deny always wins; otherwise an Allow is needed; otherwise the request is implicitly denied. Organisation guardrails (SCPs) and permission boundaries can further limit what any Allow grants.",
      "**Secrets:** stored in Secrets Manager / Key Vault, encrypted with KMS keys, fetched at runtime by the workload's identity, cached briefly, rotated automatically where possible, and never written to images, repos or logs.",
    ],
  },
  underTheHood: {
    text: [
      "A subnet is public only because its **route table** sends `0.0.0.0/0` to an internet gateway. Private subnets send it to a NAT gateway (outbound only) or nowhere. The five addresses AWS reserves per subnet are the network address, the router, DNS, one for future use, and broadcast.",
      "Security groups are **stateful**: if an inbound request is allowed, the response is allowed automatically. Network ACLs (AWS) are stateless and evaluated per subnet, which is why most teams rely on security groups and keep NACLs simple.",
      "Roles work through the Security Token Service: the platform (ECS, Lambda, EC2) calls `AssumeRole` on the workload's behalf and injects temporary credentials (minutes to hours) that the SDK refreshes automatically. Azure managed identities work similarly through a local token endpoint. No long-lived key exists to leak.",
      "Secret managers encrypt secrets with a key in KMS / Key Vault, record every read in an audit log (CloudTrail, Azure Monitor), and can rotate database passwords by running a function that sets a new password and updates the secret.",
    ],
    diagram: {
      title: "Three tiers, one way in",
      nodes: [
        { label: "Internet", sub: "users" },
        { label: "Load balancer", sub: "public subnets, :443" },
        { label: "App", sub: "private subnets, :8080" },
        { label: "Database", sub: "data subnets, :5432" },
        { label: "Secrets", sub: "via role + endpoint" },
      ],
      edges: ["TLS", "SG: from ALB only", "SG: from app only", "IAM role"],
    },
  },
  handsOn: [
    {
      title: "Plan the address space",
      code: {
        lang: "python",
        file: "subnets.py",
        code: `import ipaddress

vpc = ipaddress.ip_network("10.20.0.0/16")          # 65,536 addresses for the whole network
zones = ["a", "b", "c"]

blocks20 = list(vpc.subnets(new_prefix=20))          # sixteen /20 blocks of 4,096
small = list(blocks20[3].subnets(new_prefix=24))     # block 4 split into sixteen /24s

plan = (
    [("app", z, blocks20[i]) for i, z in enumerate(zones)]          # containers need room
    + [("public", z, small[i]) for i, z in enumerate(zones)]         # load balancers, NAT
    + [("data", z, small[8 + i]) for i, z in enumerate(zones)]       # databases, caches
)
for tier, zone, net in plan:
    usable = net.num_addresses - 5                   # AWS reserves 5 addresses per subnet
    print(f"{tier:6} {zone}  {str(net):15} {usable:>5} usable")

nets = [p[2] for p in plan]
assert not any(a.overlaps(b) for i, a in enumerate(nets) for b in nets[i + 1:]), "overlap!"
print("still free: /20 blocks", [str(b) for b in blocks20[4:6]], "... and more")`,
      },
      output: "app    a  10.20.0.0/20     4091 usable\napp    b  10.20.16.0/20    4091 usable\napp    c  10.20.32.0/20    4091 usable\npublic a  10.20.48.0/24     251 usable\npublic b  10.20.49.0/24     251 usable\npublic c  10.20.50.0/24     251 usable\ndata   a  10.20.56.0/24     251 usable\ndata   b  10.20.57.0/24     251 usable\ndata   c  10.20.58.0/24     251 usable\nstill free: /20 blocks ['10.20.64.0/20', '10.20.80.0/20'] ... and more",
      notes: [
        "Choose ranges that do not overlap with other VPCs, offices or partner networks you may connect later (peering and VPNs require non-overlapping ranges). Give container subnets plenty of room: each task or pod can use its own IP.",
      ],
    },
    {
      title: "Build the network with Terraform",
      text: [
        "Applied against LocalStack with a provider block pointing at `localhost:4566`. Terraform's `cidrsubnet` produces exactly the plan above.",
      ],
      code: {
        lang: "hcl",
        file: "infra/network.tf",
        code: `terraform {
  required_providers {
    aws = { source = "hashicorp/aws", version = "~> 5.0" }
  }
}

locals {
  zones = ["eu-west-1a", "eu-west-1b", "eu-west-1c"]
}

resource "aws_vpc" "main" {
  cidr_block           = "10.20.0.0/16"
  enable_dns_hostnames = true
  tags                 = { Name = "devatlas" }
}

resource "aws_subnet" "public" {
  count                   = 3
  vpc_id                  = aws_vpc.main.id
  availability_zone       = local.zones[count.index]
  cidr_block              = cidrsubnet("10.20.48.0/20", 4, count.index) # 10.20.48-50.0/24
  map_public_ip_on_launch = true
  tags                    = { Name = "public-\${count.index}", tier = "public" }
}

resource "aws_subnet" "app" {
  count             = 3
  vpc_id            = aws_vpc.main.id
  availability_zone = local.zones[count.index]
  cidr_block        = cidrsubnet(aws_vpc.main.cidr_block, 4, count.index) # 10.20.0.0, .16.0, .32.0 /20
  tags              = { Name = "app-\${count.index}", tier = "app" }
}

resource "aws_subnet" "data" {
  count             = 3
  vpc_id            = aws_vpc.main.id
  availability_zone = local.zones[count.index]
  cidr_block        = cidrsubnet("10.20.48.0/20", 4, 8 + count.index) # 10.20.56-58.0/24
  tags              = { Name = "data-\${count.index}", tier = "data" }
}

# Security groups reference each other: "only the load balancer may reach the app,
# only the app may reach the database". No IP lists to maintain.
resource "aws_security_group" "alb" {
  name   = "alb"
  vpc_id = aws_vpc.main.id
  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

resource "aws_security_group" "app" {
  name   = "app"
  vpc_id = aws_vpc.main.id
  ingress {
    from_port       = 8080
    to_port         = 8080
    protocol        = "tcp"
    security_groups = [aws_security_group.alb.id]
  }
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

resource "aws_security_group" "db" {
  name   = "db"
  vpc_id = aws_vpc.main.id
  ingress {
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.app.id]
  }
}

output "subnets" {
  value = {
    public = aws_subnet.public[*].cidr_block
    app    = aws_subnet.app[*].cidr_block
    data   = aws_subnet.data[*].cidr_block
  }
}`,
      },
      output: "Apply complete! Resources: 16 added, 0 changed, 0 destroyed.\n\nOutputs:\nsubnets = {\n  \"app\"    = [\"10.20.0.0/20\", \"10.20.16.0/20\", \"10.20.32.0/20\"]\n  \"data\"   = [\"10.20.56.0/24\", \"10.20.57.0/24\", \"10.20.58.0/24\"]\n  \"public\" = [\"10.20.48.0/24\", \"10.20.49.0/24\", \"10.20.50.0/24\"]\n}",
      notes: [
        "16 resources includes the IAM role and secret from the next steps, applied together.",
        "A production version adds route tables, an internet gateway, NAT gateways (one per zone for resilience), VPC endpoints for S3/Secrets Manager/ECR, and flow logs. The community `terraform-aws-modules/vpc` module packages these.",
      ],
    },
    {
      title: "How AWS decides: a policy evaluator you can read",
      code: {
        lang: "python",
        file: "iam_eval.py",
        code: `"""How AWS evaluates identity policies, in 25 lines: explicit Deny > Allow > implicit deny."""
from fnmatch import fnmatchcase

POLICY = {
    "Version": "2012-10-17",
    "Statement": [
        {"Sid": "ReadWriteOwnHomework", "Effect": "Allow",
         "Action": ["s3:GetObject", "s3:PutObject"],
         "Resource": "arn:aws:s3:::devatlas-uploads/homework/*"},
        {"Sid": "ListOnlyHomeworkPrefix", "Effect": "Allow", "Action": "s3:ListBucket",
         "Resource": "arn:aws:s3:::devatlas-uploads",
         "Condition": {"StringLike": {"s3:prefix": "homework/*"}}},
        {"Sid": "NeverDeleteAnything", "Effect": "Deny", "Action": "s3:Delete*", "Resource": "*"},
    ],
}


def as_list(x):
    return x if isinstance(x, list) else [x]


def matches(stmt, action, resource, context):
    if not any(fnmatchcase(action, a) for a in as_list(stmt["Action"])):
        return False
    if not any(fnmatchcase(resource, r) for r in as_list(stmt["Resource"])):
        return False
    for key, pattern in stmt.get("Condition", {}).get("StringLike", {}).items():
        if not fnmatchcase(context.get(key, ""), pattern):
            return False
    return True


def decide(policy, action, resource, context=None):
    hits = [s for s in policy["Statement"] if matches(s, action, resource, context or {})]
    if any(s["Effect"] == "Deny" for s in hits):
        return "DENY (explicit)"
    if any(s["Effect"] == "Allow" for s in hits):
        return "ALLOW"
    return "DENY (implicit: nothing allows it)"


if __name__ == "__main__":
    for action, resource, ctx in [
        ("s3:PutObject", "arn:aws:s3:::devatlas-uploads/homework/u1/a.py", None),
        ("s3:GetObject", "arn:aws:s3:::devatlas-uploads/admin/keys.txt", None),
        ("s3:DeleteObject", "arn:aws:s3:::devatlas-uploads/homework/u1/a.py", None),
        ("s3:ListBucket", "arn:aws:s3:::devatlas-uploads", {"s3:prefix": "homework/u1/"}),
        ("s3:ListBucket", "arn:aws:s3:::devatlas-uploads", {"s3:prefix": ""}),
    ]:
        print(f"{action:16} {resource.split(':::')[1]:38} -> {decide(POLICY, action, resource, ctx)}")`,
      },
      output: "s3:PutObject     devatlas-uploads/homework/u1/a.py      -> ALLOW\ns3:GetObject     devatlas-uploads/admin/keys.txt        -> DENY (implicit: nothing allows it)\ns3:DeleteObject  devatlas-uploads/homework/u1/a.py      -> DENY (explicit)\ns3:ListBucket    devatlas-uploads                       -> ALLOW\ns3:ListBucket    devatlas-uploads                       -> DENY (implicit: nothing allows it)",
      notes: [
        "A simplification of the real engine (which also evaluates resource policies, SCPs, boundaries and many condition operators), but the core rule is exact: explicit deny > allow > implicit deny.",
        "Use the IAM Policy Simulator and IAM Access Analyzer on real accounts to test policies and find unused permissions.",
      ],
    },
    {
      title: "A role that can read exactly one secret",
      code: {
        lang: "hcl",
        file: "infra/iam.tf",
        code: `resource "aws_secretsmanager_secret" "anthropic" {
  name = "devatlas/anthropic"
}

# Who may assume the role: only ECS tasks.
data "aws_iam_policy_document" "ecs_trust" {
  statement {
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["ecs-tasks.amazonaws.com"]
    }
  }
}

# What the role may do: read exactly one secret. Nothing else.
data "aws_iam_policy_document" "ai_task" {
  statement {
    sid       = "ReadAnthropicKey"
    actions   = ["secretsmanager:GetSecretValue"]
    resources = [aws_secretsmanager_secret.anthropic.arn]
  }
}

resource "aws_iam_role" "ai_task" {
  name               = "devatlas-ai-task"
  assume_role_policy = data.aws_iam_policy_document.ecs_trust.json
}

resource "aws_iam_role_policy" "ai_task" {
  name   = "read-anthropic-key"
  role   = aws_iam_role.ai_task.id
  policy = data.aws_iam_policy_document.ai_task.json
}

output "ai_task_role_arn" {
  value = aws_iam_role.ai_task.arn
}`,
      },
      output: "ai_task_role_arn = \"arn:aws:iam::000000000000:role/devatlas-ai-task\"",
      notes: [
        "The trust policy (who can assume the role) and the permissions policy (what the role can do) are separate documents. Both must be right. The Azure equivalent is a user-assigned managed identity with the 'Key Vault Secrets User' role on one vault.",
      ],
    },
    {
      title: "Fetch secrets at runtime and cache them",
      code: {
        lang: "python",
        file: "secrets.py",
        code: `"""Fetch secrets at runtime from a secret manager, cache briefly, never write them to disk."""
import json
import os
import time

import boto3


class SecretCache:
    def __init__(self, fetch, ttl_s: float = 300):
        self.fetch, self.ttl, self.cache = fetch, ttl_s, {}

    def get(self, name: str) -> str:
        hit = self.cache.get(name)
        if hit and time.monotonic() - hit[0] < self.ttl:
            return hit[1]
        value = self.fetch(name)               # re-fetch after TTL: picks up rotated values
        self.cache[name] = (time.monotonic(), value)
        return value


def aws_fetch(name: str) -> str:
    sm = boto3.client("secretsmanager", region_name="eu-west-1",
                      endpoint_url=os.environ.get("AWS_ENDPOINT_URL"))  # unset on real AWS
    return sm.get_secret_value(SecretId=name)["SecretString"]


def azure_fetch(name: str) -> str:
    from azure.identity import DefaultAzureCredential
    from azure.keyvault.secrets import SecretClient
    vault = SecretClient(os.environ["KEY_VAULT_URL"], DefaultAzureCredential())  # managed identity
    return vault.get_secret(name).value


if __name__ == "__main__":
    os.environ.setdefault("AWS_ENDPOINT_URL", "http://localhost:4566")      # LocalStack
    os.environ.setdefault("AWS_ACCESS_KEY_ID", "test")
    os.environ.setdefault("AWS_SECRET_ACCESS_KEY", "test")
    sm = boto3.client("secretsmanager", region_name="eu-west-1", endpoint_url=os.environ["AWS_ENDPOINT_URL"])
    sm.create_secret(Name="devatlas/db", SecretString=json.dumps({"user": "app", "password": "s3cr3t-v1"}))

    calls = []
    secrets = SecretCache(lambda n: calls.append(n) or aws_fetch(n), ttl_s=300)
    for _ in range(3):
        creds = json.loads(secrets.get("devatlas/db"))
    print("user:", creds["user"], "| password length:", len(creds["password"]), "| API calls:", len(calls))`,
      },
      output: "user: app | password length: 9 | API calls: 1",
      notes: [
        "Three reads, one API call: caching keeps latency and cost low, and the TTL means rotated secrets are picked up within minutes.",
        "Never print or log secret values (note the code prints only the length). The Azure path uses `DefaultAzureCredential`, which uses the managed identity in Azure and your `az login` locally.",
      ],
    },
  ],
  companies: [
    "**Landing zones:** organisations create accounts/subscriptions per team and environment with a shared, centrally managed network (hub-and-spoke or AWS Transit Gateway / Azure Virtual WAN), so every team starts from a secure, consistent baseline.",
    "**No long-lived keys:** CI/CD pipelines use OIDC federation (GitHub Actions → AWS role / Entra workload identity) instead of stored cloud keys, and workloads use roles or managed identities exclusively. Leaked static keys are one of the most common causes of cloud breaches.",
    "**Zero trust for internal tools:** instead of VPNs and bastion hosts, many companies use identity-aware proxies and SSM Session Manager / Azure Bastion, where every session is authenticated, authorised and logged.",
    "**Policy as code:** teams lint Terraform and IAM policies in CI (for example with Checkov, tfsec or OPA) and block wildcard permissions or public resources before they are deployed.",
  ],
  mistakes: [
    {
      mistake: "Databases with public IPs",
      why: "Easier debugging from a laptop",
      wrong: "Constant internet scanning and brute force against the database",
      fix: "Data in private subnets; access through SSM/Bastion or a VPN; SG allows only the app",
    },
    {
      mistake: "`Action: \"*\"` and `Resource: \"*\"`",
      why: "Permission errors are annoying",
      wrong: "Any compromise of that workload compromises the whole account",
      fix: "Start from zero, add specific actions on specific ARNs; use Access Analyzer to trim",
    },
    {
      mistake: "Static access keys in apps and CI",
      why: "Tutorials use them",
      wrong: "Keys leak through repos, logs and images, and stay valid until rotated",
      fix: "Roles / managed identities for workloads; OIDC federation for CI",
    },
    {
      mistake: "Secrets baked into images or committed `.env` files",
      why: "It just works",
      wrong: "Anyone with the image or repo has production secrets, forever (git history)",
      fix: "Secret manager at runtime; secret scanning in CI; rotate anything that leaked",
    },
    {
      mistake: "IP-based rules between services",
      why: "Familiar from on-premises firewalls",
      wrong: "Rules break when instances scale or move",
      fix: "Security groups referencing security groups (or Azure application security groups)",
    },
    {
      mistake: "Single-AZ subnets",
      why: "Fewer resources to manage",
      wrong: "A zone outage takes everything down",
      fix: "Subnets and NAT per zone; load balancer across zones",
    },
  ],
  bestPractices: [
    {
      tag: "Security",
      text: "Default deny everywhere: private subnets, SGs referencing SGs, least-privilege roles per workload, secrets from a manager, MFA and SSO for humans.",
    },
    {
      tag: "Reliability",
      text: "Spread subnets, NAT gateways and load balancer targets across at least two availability zones, with health checks.",
    },
    {
      tag: "Maintainability",
      text: "Define networks, roles and policies in Terraform; review them in pull requests with automated policy checks.",
    },
    {
      tag: "Cost",
      text: "NAT gateways and cross-zone data transfer cost money: use VPC endpoints for heavy AWS-service traffic (S3, ECR) and watch data processing charges.",
    },
    {
      tag: "Performance",
      text: "Keep chatty services in the same region and use private endpoints; put a CDN in front of static and cacheable content.",
    },
  ],
  interview: [
    {
      q: "Design the network for a three-tier web app on AWS or Azure.",
      a: "One VPC/VNet per environment with non-overlapping CIDRs; public, app and data subnets in two or three zones. Only the load balancer (with TLS and optionally a WAF) is public. App instances in private subnets accept traffic only from the load balancer's security group; the database accepts only from the app's security group. Outbound internet through NAT per zone, cloud services through private endpoints, and admin access through Session Manager or Bastion rather than open SSH.",
    },
    {
      q: "How does AWS IAM evaluate a request?",
      a: "It collects all applicable policies (identity, resource, SCPs, permission boundaries, session policies). If any matching statement explicitly denies, the request is denied. Otherwise it must be explicitly allowed (and not blocked by SCPs or boundaries); if nothing allows it, it is implicitly denied. Statements match on action, resource and conditions.",
    },
    {
      q: "How should an application get its database password in the cloud?",
      a: "Ideally it does not use a password: use IAM / Entra authentication with short-lived tokens. Otherwise store the password in Secrets Manager or Key Vault, give the workload's role or managed identity read access to that one secret, fetch it at runtime with a short cache, enable rotation, and never put it in code, images, environment files or logs.",
    },
  ],
  quickCheck: [
    {
      kind: "mcq",
      prompt: "The app runs in private subnets and must call the Anthropic API on the internet. What does it need?",
      options: [
        "A public IP on every task",
        "A NAT gateway (or egress proxy) for outbound traffic",
        "An inbound security group rule for port 443 from 0.0.0.0/0",
        "A VPC peering connection",
      ],
      answer: 1,
      explanation: "NAT gives private resources outbound internet access without making them reachable from the internet. Security groups are stateful, so responses are allowed without inbound rules.",
    },
    {
      kind: "output",
      prompt: "What does this print?",
      code: {
        lang: "python",
        code: `import ipaddress
net = ipaddress.ip_network("10.0.0.0/22")
subs = list(net.subnets(new_prefix=24))
print(len(subs), subs[-1], subs[0].num_addresses - 5)`,
      },
      options: ["4 10.0.3.0/24 251", "4 10.0.4.0/24 256", "2 10.0.1.0/24 251", "8 10.0.7.0/24 251"],
      answer: 0,
      explanation: "A /22 holds four /24s: 10.0.0.0 to 10.0.3.0. Each /24 has 256 addresses, minus the 5 AWS reserves = 251.",
    },
    {
      kind: "bug",
      prompt: "This policy is meant to let the app read one bucket's files. What is wrong?",
      code: {
        lang: "json",
        code: `{
  "Effect": "Allow",
  "Action": "s3:*",
  "Resource": "*"
}`,
      },
      options: [
        "Effect must be Deny",
        "It allows every S3 action on every bucket, including deletes and policy changes",
        "JSON keys must be lowercase",
        "It needs a Condition to work",
      ],
      answer: 1,
      explanation: "Least privilege: `\"Action\": \"s3:GetObject\"` on `arn:aws:s3:::bucket-name/*` (plus `s3:ListBucket` on the bucket ARN if listing is needed).",
    },
  ],
  cheatSheet: [
    "VPC (AWS) = VNet (Azure). Public / app / data subnets × 2-3 zones.",
    "Only the load balancer is public. ALB / App Gateway / Front Door = L7; NLB / Azure LB = L4.",
    "SGs are stateful, allow-only; reference SGs, not IPs. NSGs have ordered allow/deny rules.",
    "Private → internet: NAT. Private → cloud services: VPC endpoints / Private Endpoints.",
    "Explicit Deny > Allow > implicit deny.",
    "Workloads: roles / managed identities. Humans: SSO + MFA. CI: OIDC federation.",
    "Policy = specific actions on specific ARNs (+ conditions).",
    "Secrets: Secrets Manager / Key Vault, fetched at runtime, cached, rotated, never logged.",
    "Terraform `cidrsubnet()` + Python `ipaddress` for CIDR planning.",
  ],
  homework: {
    basic: {
      title: "Least privilege for the news tagger",
      brief: [
        "Write the IAM policy for the news-tagger Lambda: write its own logs, read one secret, and write to one DynamoDB table. Prove with the evaluator that it allows what it needs and denies everything else you try.",
      ],
      criteria: [
        "No wildcards in actions",
        "Resources are specific ARNs",
        "At least three allowed and three denied checks",
      ],
      hints: [
        "Secrets Manager ARNs end in a random suffix, so `secret:name-*` is a common, still-specific pattern.",
      ],
      solution: {
        text: [
          "Each statement has a Sid explaining why it exists. Denied checks matter as much as allowed ones: they prove the policy does not grant reads of other secrets or destructive table operations.",
        ],
        code: {
          lang: "python",
          file: "tagger_policy.py",
          code: `from iam_eval import decide

ACCOUNT, REGION = "123456789012", "eu-west-1"
TAGGER_POLICY = {
    "Version": "2012-10-17",
    "Statement": [
        {"Sid": "Logs", "Effect": "Allow", "Action": ["logs:CreateLogStream", "logs:PutLogEvents"],
         "Resource": f"arn:aws:logs:{REGION}:{ACCOUNT}:log-group:/aws/lambda/news-tagger:*"},
        {"Sid": "ReadOneSecret", "Effect": "Allow", "Action": "secretsmanager:GetSecretValue",
         "Resource": f"arn:aws:secretsmanager:{REGION}:{ACCOUNT}:secret:devatlas/news-api-*"},
        {"Sid": "WriteTags", "Effect": "Allow", "Action": ["dynamodb:PutItem", "dynamodb:UpdateItem"],
         "Resource": f"arn:aws:dynamodb:{REGION}:{ACCOUNT}:table/news-tags"},
    ],
}

checks = [
    ("logs:PutLogEvents", f"arn:aws:logs:{REGION}:{ACCOUNT}:log-group:/aws/lambda/news-tagger:log-stream:x", "ALLOW"),
    ("secretsmanager:GetSecretValue", f"arn:aws:secretsmanager:{REGION}:{ACCOUNT}:secret:devatlas/news-api-AbC123", "ALLOW"),
    ("secretsmanager:GetSecretValue", f"arn:aws:secretsmanager:{REGION}:{ACCOUNT}:secret:devatlas/db-XyZ", "DENY"),
    ("dynamodb:PutItem", f"arn:aws:dynamodb:{REGION}:{ACCOUNT}:table/news-tags", "ALLOW"),
    ("dynamodb:DeleteTable", f"arn:aws:dynamodb:{REGION}:{ACCOUNT}:table/news-tags", "DENY"),
    ("dynamodb:Scan", f"arn:aws:dynamodb:{REGION}:{ACCOUNT}:table/users", "DENY"),
]
for action, resource, want in checks:
    got = decide(TAGGER_POLICY, action, resource)
    print(f"{'ok ' if got.startswith(want) else 'BAD'} {action:32} {got}")`,
        },
        output: "ok  logs:PutLogEvents                ALLOW\nok  secretsmanager:GetSecretValue    ALLOW\nok  secretsmanager:GetSecretValue    DENY (implicit: nothing allows it)\nok  dynamodb:PutItem                 ALLOW\nok  dynamodb:DeleteTable             DENY (implicit: nothing allows it)\nok  dynamodb:Scan                    DENY (implicit: nothing allows it)",
      },
    },
    intermediate: {
      title: "Who can reach the database?",
      brief: [
        "Model security groups as data and write a checker that lists everything open to the internet and every path from the internet to the database through security-group references. Plant a misconfiguration and catch it.",
      ],
      criteria: [
        "Direct exposures listed",
        "Indirect paths through references found",
        "Cycles handled",
        "The planted misconfiguration is reported",
      ],
      hints: ["Recursion: a path to `db` from `app` plus a path to `app` from the internet is a path to `db`."],
      solution: {
        text: [
          "The intended path (internet → ALB → app → db) is fine; the direct `internet -> db:5432` is the finding. Tools like AWS Network Access Analyzer and Azure Network Watcher do this analysis on real accounts.",
        ],
        code: {
          lang: "python",
          file: "reachability.py",
          code: `"""Can the internet reach the database? Follow security-group rules like a packet would."""
SGS = {   # name -> list of (port, source); a source is a CIDR or another security group's name
    "alb": [(443, "0.0.0.0/0")],
    "app": [(8080, "alb")],
    "db": [(5432, "app"), (5432, "0.0.0.0/0")],      # someone "temporarily" opened the DB
    "bastion": [(22, "203.0.113.7/32")],
}


def reachable_from_internet(sgs: dict) -> dict[str, list[int]]:
    exposed = {name: [p for p, src in rules if src == "0.0.0.0/0"] for name, rules in sgs.items()}
    return {name: ports for name, ports in exposed.items() if ports}


def chains(sgs: dict, target: str, suffix: tuple = ()):
    """Yield every path from the internet to \`target\` through security-group references."""
    for port, src in sgs[target]:
        hop = f"{target}:{port}"
        if src == "0.0.0.0/0":
            yield ["internet", hop, *suffix]
        elif src in sgs and src not in {h.split(":")[0] for h in suffix}:   # avoid cycles
            yield from chains(sgs, src, (hop, *suffix))


print("open to the internet:", reachable_from_internet(SGS))
for c in chains(SGS, "db"):
    print(" -> ".join(c))`,
        },
        output: "open to the internet: {'alb': [443], 'db': [5432]}\ninternet -> alb:443 -> app:8080 -> db:5432\ninternet -> db:5432",
      },
    },
    challenge: {
      title: "Write the network and identity layer in Terraform",
      brief: [
        "Using the hands-on files as a base, add your own: a security group for a Redis cache reachable only from the app, and a second IAM role for the news tagger with the policy from the basic task (use `aws_iam_policy_document`). Apply it to LocalStack and check the outputs.",
      ],
      criteria: [
        "`terraform fmt -check` and `validate` pass",
        "Cache SG references the app SG",
        "Policy built with `aws_iam_policy_document`, no wildcards",
        "Applies cleanly to LocalStack",
      ],
      hints: [
        "Run Terraform with an AWS provider whose `endpoints` point at http://localhost:4566 and `skip_credentials_validation = true`.",
      ],
      solution: {
        text: [
          "The pattern is the same as `iam.tf` and the `db` security group: one resource per concern, references instead of hard-coded IDs, and outputs for the ARNs other modules need. The provider file below is the LocalStack one used to verify this lesson.",
        ],
        code: {
          lang: "hcl",
          file: "infra/providers.tf",
          code: `# Only for LocalStack practice. On AWS, delete the endpoint and skip_* settings.
provider "aws" {
  region                      = "eu-west-1"
  skip_credentials_validation = true
  skip_requesting_account_id  = true
  skip_metadata_api_check     = true
  endpoints {
    ec2            = "http://localhost:4566"
    iam            = "http://localhost:4566"
    sts            = "http://localhost:4566"
    secretsmanager = "http://localhost:4566"
  }
}`,
        },
      },
    },
    capstone: {
      title: "DevAtlas: network and identity foundation",
      brief: [
        "Commit `infra/network.tf`, `infra/iam.tf` and a provider configuration. The AI service gets its own role that can read only the Anthropic secret; the database is reachable only from the app tier. Document how to apply it to LocalStack and to a real account.",
      ],
      criteria: [
        "Three-tier subnets in three zones",
        "SG chain ALB → app → db",
        "Per-service role with one-secret policy",
        "README section with apply instructions and a cost note (NAT gateways)",
      ],
      hints: ["Keep LocalStack settings in a separate provider file you do not use in production."],
      solution: {
        text: [
          "Verified on LocalStack: 16 resources created. For a real account, remove the endpoint overrides, configure a remote state backend (lesson 9.3.1) and add the internet gateway, route tables and NAT gateways.",
          "Note: LocalStack does not keep subnet tags, so a second `plan` shows tag changes there; on real AWS the configuration converges with no changes.",
        ],
        code: {
          lang: "hcl",
          file: "infra/iam.tf",
          code: `resource "aws_secretsmanager_secret" "anthropic" {
  name = "devatlas/anthropic"
}

# Who may assume the role: only ECS tasks.
data "aws_iam_policy_document" "ecs_trust" {
  statement {
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["ecs-tasks.amazonaws.com"]
    }
  }
}

# What the role may do: read exactly one secret. Nothing else.
data "aws_iam_policy_document" "ai_task" {
  statement {
    sid       = "ReadAnthropicKey"
    actions   = ["secretsmanager:GetSecretValue"]
    resources = [aws_secretsmanager_secret.anthropic.arn]
  }
}

resource "aws_iam_role" "ai_task" {
  name               = "devatlas-ai-task"
  assume_role_policy = data.aws_iam_policy_document.ecs_trust.json
}

resource "aws_iam_role_policy" "ai_task" {
  name   = "read-anthropic-key"
  role   = aws_iam_role.ai_task.id
  policy = data.aws_iam_policy_document.ai_task.json
}

output "ai_task_role_arn" {
  value = aws_iam_role.ai_task.arn
}`,
        },
        output: "Apply complete! Resources: 16 added, 0 changed, 0 destroyed.",
      },
    },
  },
  deeper: [
    {
      label: "AWS: Policy evaluation logic",
      url: "https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_evaluation-logic.html",
    },
    {
      label: "Azure: Virtual network concepts and best practices",
      url: "https://learn.microsoft.com/azure/virtual-network/concepts-and-best-practices",
    },
    {
      label: "Microsoft Entra: Managed identities for Azure resources",
      url: "https://learn.microsoft.com/entra/identity/managed-identities-azure-resources/overview",
    },
    {
      label: "AWS Secrets Manager best practices",
      url: "https://docs.aws.amazon.com/secretsmanager/latest/userguide/best-practices.html",
    },
  ],
  nextPreview: "Next: AI services in the cloud and avoiding surprise bills: Claude on Bedrock and Microsoft Foundry, Azure OpenAI, budgets, alerts and free tiers.",
};
