import type { Lesson } from "../../types";

export const lesson: Lesson = {
  id: "8.4.1",
  title: "Bedrock, Azure OpenAI and avoiding surprise bills",
  minutes: 75,
  level: "Intermediate",
  prerequisites: ["7.1.3 Calling LLM APIs", "8.3.1 VPC/VNet, load balancers, IAM/Entra ID, secrets"],
  summary: "Use foundation models through your cloud provider (Claude on Amazon Bedrock and Microsoft Foundry, OpenAI models on Azure OpenAI) with the same code, inside your cloud's identity, network and billing. Then make cloud costs boring: budgets with forecasts, AI-specific alerts, anomaly detection, tagging and an automatic kill switch.",
  terms: [
    {
      term: "Amazon Bedrock",
      def: "AWS's managed service for foundation models from several providers (including Anthropic's Claude), billed through your AWS account.",
    },
    {
      term: "Microsoft Foundry",
      def: "Azure's platform for building with AI models from Microsoft, OpenAI, Anthropic and others; Azure OpenAI is the part that serves OpenAI models.",
    },
    {
      term: "Deployment (Azure)",
      def: "A named instance of a model in your Azure resource, with its own quota. Your code calls the deployment name.",
    },
    {
      term: "TPM / RPM quota",
      def: "Tokens per minute and requests per minute allowed for a model or deployment. Exceeding them returns 429 errors.",
    },
    {
      term: "Provisioned throughput",
      def: "Reserved model capacity billed per hour (Bedrock provisioned throughput, Azure PTUs) instead of per token: predictable latency for steady, high volume.",
    },
    {
      term: "Budget",
      def: "A spending threshold (AWS Budgets, Azure Cost Management budgets) that alerts on actual or forecast spend.",
    },
    {
      term: "Cost allocation tags",
      def: "Tags like owner, env and cost-center that let you split the bill by team, environment and product.",
    },
    {
      term: "Cost anomaly",
      def: "Spend that deviates sharply from the normal pattern, often the first sign of a bug, a leak or abuse.",
    },
  ],
  problem: [
    "DevAtlas's company wants AI calls to go through its AWS and Azure accounts: the security team wants traffic and permissions inside the cloud identity system, and finance wants one bill and committed-spend discounts.",
    "Meanwhile a student project ran over a weekend with a retry loop calling a large model, a forgotten GPU VM ran for a month, and a leaked access key was used to start instances in another region. Each produced a bill nobody expected. Cloud cost control is not about being stingy; it is about never being surprised.",
  ],
  concept: {
    analogy: [
      "Using models through your cloud provider is like ordering from your company's approved supplier: same products, but on the company account, with its purchasing rules and audit trail. **Budgets and alerts** are the card limits and text messages your bank sends; **tags** are the cost-centre codes on every receipt; the **kill switch** is the bank freezing the card when something looks wrong.",
    ],
    precise: [
      "**Why go through the cloud:** IAM / Entra ID authentication instead of separate API keys, private networking (VPC endpoints, private endpoints), data residency and compliance in your regions, consolidated billing and commitments, and provider-native guardrails and logging. Trade-offs: features can arrive later than on the model provider's own API, model IDs and quotas differ, and you must enable model access per region/account.",
      "**Claude on Bedrock and Foundry:** the Anthropic SDK has clients for both (`AnthropicBedrockMantle`, `AnthropicFoundry`) exposing the same Messages API. Bedrock model IDs carry an `anthropic.` prefix; authentication uses AWS SigV4 or Entra ID tokens. Check each platform's feature table before relying on a newer feature.",
      "**Azure OpenAI:** you create a resource, then **deployments** of specific models with TPM quotas; code calls your deployment name. Content filtering is applied by default, and deployment types (standard regional, global, data zone, provisioned) trade price, latency guarantees and data location.",
      "**Cost controls in layers:** (1) budgets per account/subscription with *forecast* alerts, (2) separate budgets for AI services, (3) anomaly detection, (4) mandatory cost tags enforced by policy, (5) application-level limits (per-user budgets, max_tokens, caching, from lesson 7.3.2), and (6) automated responses such as disabling a feature flag.",
      "**Usual surprise-bill causes:** resources left running (GPU VMs, databases, load balancers), NAT gateway and data egress charges, verbose log ingestion, unbounded autoscaling, public IPv4 addresses, retry or agent loops calling large models, and leaked credentials used for crypto mining.",
    ],
  },
  underTheHood: {
    text: [
      "Bedrock requests are signed with AWS Signature Version 4 using the caller's IAM credentials, so IAM policies (for example allowing `bedrock:InvokeModel` only for specific model ARNs) and CloudTrail apply like any AWS API. Foundry accepts Microsoft Entra ID tokens or resource keys.",
      "Quotas are enforced per region and model (TPM/RPM). A 429 means you hit them: retry with backoff, request more quota, spread load across regions (cross-region inference), or buy provisioned capacity for steady load.",
      "Billing data is delayed: cost data typically lags hours to a day, so budgets cannot stop a fast runaway on their own. That is why application-level limits (per-user budgets, max_tokens, rate limits) act in real time and budgets act as the safety net.",
      "AWS Budgets and Azure Cost Management budgets can publish to SNS / Action Groups, which can trigger functions. That is how you automate responses (stop dev VMs, disable a feature flag, page the on-call engineer).",
    ],
    diagram: {
      title: "Defence in depth for cost",
      nodes: [
        { label: "App limits", sub: "per-user $, max_tokens" },
        { label: "Quotas", sub: "TPM / RPM" },
        { label: "Anomaly detection", sub: "spike vs baseline" },
        { label: "Budgets", sub: "forecast + actual" },
        { label: "Automation", sub: "kill switch, stop dev" },
      ],
      edges: ["real time", "minutes", "hours", "action"],
    },
  },
  handsOn: [
    {
      title: "One codebase, three ways to reach Claude",
      code: {
        lang: "python",
        file: "providers.py",
        code: `"""Run the same Claude code on the Anthropic API, Amazon Bedrock or Microsoft Foundry."""
import os

import anthropic

MODEL = "claude-opus-5-5"


def make_client(provider: str | None = None, **kwargs):
    """Returns (client, model_id). Every client exposes the same \`messages.create\` API."""
    provider = provider or os.environ.get("LLM_PROVIDER", "anthropic")
    if provider == "anthropic":
        return anthropic.Anthropic(**kwargs), MODEL                         # ANTHROPIC_API_KEY
    if provider == "bedrock":
        # IAM credentials from the role / profile; model IDs carry an "anthropic." prefix
        return anthropic.AnthropicBedrockMantle(aws_region=os.environ["AWS_REGION"], **kwargs), f"anthropic.{MODEL}"
    if provider == "foundry":
        # Microsoft Foundry resource; prefer Entra ID (azure_ad_token_provider) over API keys
        return anthropic.AnthropicFoundry(resource=os.environ["FOUNDRY_RESOURCE"], **kwargs), MODEL
    raise ValueError(f"unknown provider {provider!r}")


def ask(question: str, provider: str | None = None, **client_kwargs) -> str:
    client, model = make_client(provider, **client_kwargs)
    msg = client.messages.create(model=model, max_tokens=2000, output_config={"effort": "low"},
                                 messages=[{"role": "user", "content": question}])
    return "".join(b.text for b in msg.content if b.type == "text")`,
      },
      notes: [
        "Only construction differs; the `messages.create` call is identical. On Bedrock the workload's IAM role needs permission to invoke the model, and model access must be enabled in that region.",
        "Model IDs and available features differ by platform. Keep them in configuration and check the platform availability tables when adopting a new feature.",
        "Azure OpenAI uses the OpenAI SDK pointed at your resource, with the deployment name as the model; the same 'factory per provider' pattern applies.",
      ],
    },
    {
      title: "Prove the routing offline",
      text: [
        "A mock HTTP transport records each request, so you can test authentication and endpoints for all three providers without accounts or network.",
      ],
      code: {
        lang: "python",
        file: "test_providers.py",
        code: `"""Offline: a mock HTTP transport records where each provider sends the same request."""
import json

import httpx2
import pytest

from providers import ask

REPLY = {"id": "m", "type": "message", "role": "assistant", "model": "x", "stop_reason": "end_turn",
         "stop_sequence": None, "content": [{"type": "text", "text": "ok"}],
         "usage": {"input_tokens": 3, "output_tokens": 1}}


@pytest.fixture
def recorder():
    calls = []

    def handler(request):
        calls.append((str(request.url), request.headers, json.loads(request.content)))
        return httpx2.Response(200, json=REPLY)
    return calls, httpx2.Client(transport=httpx2.MockTransport(handler))


@pytest.mark.parametrize("provider, env, url, model, auth", [
    ("anthropic", {"ANTHROPIC_API_KEY": "sk-test"}, "https://api.anthropic.com/v1/messages",
     "claude-opus-5-5", "x-api-key"),
    ("bedrock", {"AWS_REGION": "eu-west-1", "AWS_ACCESS_KEY_ID": "AKIDTEST", "AWS_SECRET_ACCESS_KEY": "x"},
     "https://bedrock-mantle.eu-west-1.api.aws/anthropic/v1/messages", "anthropic.claude-opus-5-5", "authorization"),
    ("foundry", {"FOUNDRY_RESOURCE": "devatlas-ai", "ANTHROPIC_FOUNDRY_API_KEY": "k"},
     "https://devatlas-ai.services.ai.azure.com/anthropic/v1/messages", "claude-opus-5-5", "api-key"),
])
def test_same_code_three_providers(monkeypatch, recorder, provider, env, url, model, auth):
    for k, v in env.items():
        monkeypatch.setenv(k, v)
    calls, http_client = recorder
    assert ask("hi", provider, http_client=http_client) == "ok"
    sent_url, headers, body = calls[0]
    assert sent_url == url and body["model"] == model and auth in headers`,
      },
      output: "3 passed",
      notes: [
        "Bedrock requests carry a SigV4 `authorization` header; Foundry uses `api-key` (or an Entra ID bearer token); the Anthropic API uses `x-api-key`.",
      ],
    },
    {
      title: "Budgets as code (AWS and Azure)",
      code: {
        lang: "hcl",
        file: "infra/budgets.tf",
        code: `terraform {
  required_providers {
    aws     = { source = "hashicorp/aws", version = "~> 5.0" }
    azurerm = { source = "hashicorp/azurerm", version = "~> 4.0" }
  }
}

variable "alert_email" {
  type = string
}

# AWS: monthly cost budget with an early forecast alert and an actual-spend alert.
resource "aws_budgets_budget" "monthly" {
  name         = "devatlas-monthly"
  budget_type  = "COST"
  limit_amount = "50"
  limit_unit   = "USD"
  time_unit    = "MONTHLY"

  notification {
    comparison_operator        = "GREATER_THAN"
    threshold                  = 80
    threshold_type             = "PERCENTAGE"
    notification_type          = "FORECASTED"
    subscriber_email_addresses = [var.alert_email]
  }
  notification {
    comparison_operator        = "GREATER_THAN"
    threshold                  = 100
    threshold_type             = "PERCENTAGE"
    notification_type          = "ACTUAL"
    subscriber_email_addresses = [var.alert_email]
  }
}

# A separate budget only for AI spend (Bedrock), filtered by service.
resource "aws_budgets_budget" "ai" {
  name         = "devatlas-ai"
  budget_type  = "COST"
  limit_amount = "20"
  limit_unit   = "USD"
  time_unit    = "MONTHLY"
  cost_filter {
    name   = "Service"
    values = ["Amazon Bedrock"]
  }
  notification {
    comparison_operator        = "GREATER_THAN"
    threshold                  = 50
    threshold_type             = "PERCENTAGE"
    notification_type          = "ACTUAL"
    subscriber_email_addresses = [var.alert_email]
  }
}

# Azure: budget on the resource group that holds DevAtlas.
resource "azurerm_resource_group" "devatlas" {
  name     = "devatlas-rg"
  location = "westeurope"
}

resource "azurerm_consumption_budget_resource_group" "monthly" {
  name              = "devatlas-monthly"
  resource_group_id = azurerm_resource_group.devatlas.id
  amount            = 50
  time_grain        = "Monthly"
  time_period {
    start_date = "2026-11-01T00:00:00Z"
  }
  notification {
    operator       = "GreaterThan"
    threshold      = 80
    threshold_type = "Forecasted"
    contact_emails = [var.alert_email]
  }
  notification {
    operator       = "GreaterThan"
    threshold      = 100
    contact_emails = [var.alert_email]
  }
}`,
      },
      output: "$ terraform validate\nSuccess! The configuration is valid.",
      notes: [
        "Use **forecast** alerts: they warn you mid-month that you are on track to overspend, while there is still time to act.",
        "A separate AI budget catches model-spend problems that a large overall budget would hide.",
      ],
    },
    {
      title: "Detect cost anomalies",
      code: {
        lang: "python",
        file: "anomaly.py",
        code: `"""Flag days whose spend jumps well above the recent normal (what cost anomaly detection does)."""
from statistics import median

DAILY = {   # date -> USD, e.g. from the Cost Explorer API or an Azure cost export
    "10-01": 3.1, "10-02": 2.9, "10-03": 3.3, "10-04": 3.0, "10-05": 3.2, "10-06": 3.4, "10-07": 3.1,
    "10-08": 3.6, "10-09": 3.3, "10-10": 14.8, "10-11": 41.2, "10-12": 3.5, "10-13": 3.4,
}


def anomalies(series: dict[str, float], window: int = 7, ratio: float = 2.0, min_usd: float = 5.0):
    days = list(series)
    for i in range(window, len(days)):
        baseline = median(series[d] for d in days[i - window:i])   # median ignores earlier spikes
        today = series[days[i]]
        if today > baseline * ratio and today - baseline > min_usd:
            yield days[i], today, baseline


for day, usd, base in anomalies(DAILY):
    print(f"{day}: \${usd:.2f} vs normal \${base:.2f} ({usd / base:.1f}x)")`,
      },
      output: "10-10: $14.80 vs normal $3.30 (4.5x)\n10-11: $41.20 vs normal $3.30 (12.5x)",
      notes: [
        "Both providers offer managed anomaly detection (AWS Cost Anomaly Detection, Azure cost anomaly alerts). Writing your own once teaches you what they do: compare with a robust baseline and require both a ratio and an absolute difference, so tiny accounts do not alert on cents.",
      ],
    },
  ],
  companies: [
    "**Enterprise AI through the cloud account:** many companies consume foundation models via Bedrock or Foundry so that existing identity, network controls, data-residency commitments and procurement apply, and spend counts toward cloud commitments.",
    "**FinOps teams** publish cost per team and per product from tags, review the top cost drivers weekly, and set budgets per account and environment. Untagged resources are flagged or blocked by policy.",
    "**Automated hygiene:** scheduled jobs stop development environments at night and on weekends, delete unattached disks and old snapshots, and alert on idle load balancers and IPs.",
    "**Leaked-key incidents** are common enough that providers scan public code for credentials, and companies use account-level guardrails (SCPs or Azure Policy) to block expensive instance types or unused regions outright.",
  ],
  mistakes: [
    {
      mistake: "No budget on a personal or student account",
      why: "'I'm only using free tier'",
      wrong: "A forgotten resource or leaked key produces a large bill",
      fix: "Create a small budget with forecast and actual alerts on day one; enable MFA on the root/admin account",
    },
    {
      mistake: "Relying only on budgets to stop runaways",
      why: "Budgets feel like limits",
      wrong: "Billing data lags; a loop can spend a lot before the alert arrives",
      fix: "Real-time app limits (per-user budgets, max_tokens, rate limits) plus budgets as the safety net",
    },
    {
      mistake: "Untagged resources",
      why: "Tags feel like bureaucracy",
      wrong: "Nobody can say which team or feature drives the bill",
      fix: "Required tags enforced by policy and checked in CI",
    },
    {
      mistake: "Assuming every feature exists on every platform",
      why: "Same model name",
      wrong: "Code works on one provider and fails on another",
      fix: "Check platform feature tables; test each provider path",
    },
    {
      mistake: "Forgetting non-obvious charges",
      why: "Only compute is in your mental model",
      wrong: "NAT gateway processing, egress, logs and public IPs dominate small bills",
      fix: "Review the bill by service and usage type monthly; use VPC endpoints and log sampling",
    },
  ],
  bestPractices: [
    {
      tag: "Cost",
      text: "Budgets with forecast alerts per account and per AI service, anomaly detection on, tags enforced, and a monthly review of the top five cost drivers.",
    },
    {
      tag: "Security",
      text: "Use roles / Entra ID for model access, restrict which models a workload may invoke, and block unused regions and instance types with organisation policies.",
    },
    {
      tag: "Reliability",
      text: "Handle 429 quota errors with backoff; for critical traffic, consider fallbacks across regions or providers, tested regularly.",
    },
    {
      tag: "Maintainability",
      text: "Keep provider choice behind one factory and model IDs in configuration, so switching platforms is a config change.",
    },
    {
      tag: "Performance",
      text: "Pick regions close to users and data; use provisioned throughput only when steady volume justifies it.",
    },
  ],
  interview: [
    {
      q: "Why would a company call Claude through Bedrock or Foundry instead of directly?",
      a: "To keep AI usage inside existing cloud governance: IAM / Entra ID authentication and policies, private networking, audit logs, data residency in chosen regions, consolidated billing and commitment discounts, and procurement already in place. Trade-offs include possible feature lag, different model IDs and quotas, and needing to enable model access per region. The code barely changes because the SDK offers clients for each platform.",
    },
    {
      q: "How do you prevent surprise cloud bills?",
      a: "Layered controls: budgets with forecast and actual alerts per account, environment and AI service; anomaly detection; required cost tags; organisation policies blocking unused regions and expensive resource types; automation that stops idle dev resources; and real-time application limits (per-user budgets, max_tokens, rate limits) because billing data lags. Plus regular reviews of the top cost drivers.",
    },
    {
      q: "What is the difference between on-demand and provisioned throughput for models?",
      a: "On-demand bills per token with shared capacity and quota limits: ideal for variable or low volume. Provisioned throughput reserves dedicated capacity for an hourly or committed price: predictable latency and throughput for steady high volume, but you pay even when idle. Decide from measured utilisation.",
    },
  ],
  quickCheck: [
    {
      kind: "mcq",
      prompt: "A buggy retry loop could spend $500 in an hour. Which control acts fast enough to stop it?",
      options: [
        "A monthly AWS Budget alert",
        "A per-user and per-feature spend limit checked in the app before each call",
        "Cost allocation tags",
        "A quarterly FinOps review",
      ],
      answer: 1,
      explanation: "Billing data lags by hours, so budgets alert after the damage. Application limits are checked on every call in real time.",
    },
    {
      kind: "output",
      prompt: "What does this print?",
      code: {
        lang: "python",
        code: `from statistics import median
last7 = [3.0, 3.2, 2.9, 30.0, 3.1, 3.3, 3.0]
today = 9.0
base = median(last7)
print(base, today > base * 2 and today - base > 5)`,
      },
      options: ["3.1 True", "6.9 False", "3.1 False", "3.2 True"],
      answer: 0,
      explanation: "Sorted: 2.9, 3.0, 3.0, 3.1, 3.2, 3.3, 30.0, so the median is 3.1: the earlier spike does not inflate the baseline. 9.0 is more than double and more than $5 above it.",
    },
    {
      kind: "bug",
      prompt: "This code works with the Anthropic API but fails on Bedrock with a model-not-found error. Why?",
      code: {
        lang: "python",
        code: `client = anthropic.AnthropicBedrockMantle(aws_region="eu-west-1")
client.messages.create(model="claude-opus-5-5", max_tokens=500, messages=msgs)`,
      },
      options: [
        "Bedrock needs temperature",
        "Bedrock model IDs carry the anthropic. prefix (anthropic.claude-opus-5-5)",
        "max_tokens is too low",
        "Bedrock only supports streaming",
      ],
      answer: 1,
      explanation: "Same API shape, different model identifiers. Keep model IDs in per-provider configuration (and make sure model access is enabled in that region).",
    },
  ],
  cheatSheet: [
    "Claude: Anthropic API, Amazon Bedrock (`AnthropicBedrockMantle`, `anthropic.` model IDs), Microsoft Foundry (`AnthropicFoundry`).",
    "Azure OpenAI: resource → deployments (your names) → TPM quotas → content filters.",
    "Cloud route = IAM/Entra auth, private networking, residency, one bill.",
    "429 = quota: backoff, more quota, other region, or provisioned throughput.",
    "Budgets: forecast + actual alerts; separate AI budget.",
    "Billing lags: real-time app limits first, budgets as safety net.",
    "Tags: owner, env, cost-center; enforce by policy.",
    "Anomaly = ratio AND absolute jump vs median baseline.",
    "Hidden costs: NAT, egress, logs, idle resources, public IPv4, loops, leaked keys.",
  ],
  homework: {
    basic: {
      title: "Tag compliance report",
      brief: [
        "From a resource inventory (AWS Resource Groups Tagging API or Azure Resource Graph output), report every resource missing required tags or using a non-standard environment value.",
      ],
      criteria: ["Required tags checked", "Allowed values for env enforced", "Readable report with a summary count"],
      hints: ["Set difference finds missing keys: `REQUIRED - tags.keys()`."],
      solution: {
        text: [
          "'Prod' vs 'prod' looks harmless but splits cost reports in two. Normalise values with policy (AWS tag policies, Azure Policy) rather than relying on people.",
        ],
        code: {
          lang: "python",
          file: "tag_report.py",
          code: `"""Every resource needs owner, env and cost-center tags, or nobody can explain the bill."""
REQUIRED = {"owner", "env", "cost-center"}

INVENTORY = [   # e.g. from the AWS Resource Groups Tagging API or Azure Resource Graph
    {"id": "arn:aws:ecs:eu-west-1:1:service/devatlas/ai", "tags": {"owner": "ai-team", "env": "prod", "cost-center": "cc-42"}},
    {"id": "arn:aws:rds:eu-west-1:1:db:devatlas-prod", "tags": {"owner": "platform", "env": "prod"}},
    {"id": "arn:aws:ec2:eu-west-1:1:instance/i-0abc", "tags": {"Name": "test-gpu-box"}},
    {"id": "/subscriptions/s/resourceGroups/devatlas-rg/providers/Microsoft.Web/sites/api",
     "tags": {"owner": "web", "env": "Prod", "cost-center": "cc-42"}},
]
ALLOWED_ENVS = {"dev", "staging", "prod"}

problems = 0
for r in INVENTORY:
    tags = r["tags"]
    missing = sorted(REQUIRED - tags.keys())
    bad_env = "env" in tags and tags["env"] not in ALLOWED_ENVS
    if missing or bad_env:
        problems += 1
        name = r["id"].rsplit("/", 1)[-1].rsplit(":", 1)[-1]
        detail = (f"missing {missing}" if missing else "") + (f" env={tags['env']!r} not allowed" if bad_env else "")
        print(f"{name:16} {detail.strip()}")
print(f"{problems} of {len(INVENTORY)} resources need fixing")`,
        },
        output: "devatlas-prod    missing ['cost-center']\ni-0abc           missing ['cost-center', 'env', 'owner']\napi              env='Prod' not allowed\n3 of 4 resources need fixing",
      },
    },
    intermediate: {
      title: "Forecast AI spend",
      brief: [
        "Forecast the tutor's monthly model cost for six months with 25% monthly traffic growth, with and without prompt caching. Find the month it crosses a $600 budget and propose two changes that would delay it.",
      ],
      criteria: [
        "Uses token counts and a price table",
        "Caching effect modelled",
        "Crossing month identified",
        "Two concrete mitigations",
      ],
      hints: ["Reuse `cost_usd` from lesson 7.3.2's `pricing.py`."],
      solution: {
        text: [
          "The budget is crossed in month 5. Without caching it would be crossed in month 2, so caching alone buys three months.",
          "Mitigations: route simple questions to a small model (lesson 7.1.1's router), cap answer length (output tokens are the largest cost here: 450 × $20/M), and cache frequent answers (lesson 7.3.2).",
        ],
        code: {
          lang: "python",
          file: "forecast.py",
          code: `"""When will AI spend cross the budget? Forecast month by month with traffic growth."""
from pricing import cost_usd   # from lesson 7.3.2: (model, input, output, cache_read) -> USD

BUDGET = 600.0                   # USD per month for AI
requests = 20_000                # tutor requests this month
GROWTH = 0.25                    # +25% per month
TOKENS = dict(input_tokens=1_200, output_tokens=450, cache_read=3_000)   # per request


def monthly(model: str, n: float, cached: bool = True) -> float:
    t = dict(TOKENS)
    if not cached:                                   # cache miss: the prefix is billed as input
        t["input_tokens"] += t.pop("cache_read")
    return n * cost_usd(model, **t)


for month in range(1, 7):
    opus, no_cache = monthly("claude-opus-5-5", requests), monthly("claude-opus-5-5", requests, cached=False)
    flag = "  <- over budget" if opus > BUDGET else ""
    print(f"month {month}: {requests:>7,.0f} req  \${opus:7.2f} (no cache \${no_cache:7.2f}){flag}")
    requests *= 1 + GROWTH`,
        },
        output: "month 1:  20,000 req  $ 288.00 (no cache $ 516.00)\nmonth 2:  25,000 req  $ 360.00 (no cache $ 645.00)\nmonth 3:  31,250 req  $ 450.00 (no cache $ 806.25)\nmonth 4:  39,062 req  $ 562.50 (no cache $1007.81)\nmonth 5:  48,828 req  $ 703.12 (no cache $1259.77)  <- over budget\nmonth 6:  61,035 req  $ 878.91 (no cache $1574.71)  <- over budget",
      },
    },
    challenge: {
      title: "An automatic AI kill switch",
      brief: [
        "Write a Lambda that receives budget alerts via SNS and, when the AI budget is exceeded, sets a feature flag in SSM Parameter Store to false. The app reads the flag and pauses AI features. Test it against LocalStack.",
      ],
      criteria: [
        "Only the AI budget's alerts trigger it",
        "Flag stored in Parameter Store",
        "App-side check function",
        "Test passes against LocalStack",
      ],
      hints: ["SNS delivers `Records[].Sns.Message` to Lambda."],
      solution: {
        text: [
          "Fail safe and visible: the UI should say 'AI features are paused' rather than erroring, and the on-call engineer gets notified. Re-enabling is a deliberate human action after the cause is fixed.",
        ],
        code: {
          lang: "python",
          file: "killswitch.py",
          code: `"""Lambda subscribed to the AI budget's SNS topic: when spend crosses the limit, turn AI off."""
import json
import os

import boto3

ssm = boto3.client("ssm", endpoint_url=os.environ.get("AWS_ENDPOINT_URL"))
FLAG = "/devatlas/prod/features/ai_enabled"


def lambda_handler(event, context):
    for record in event.get("Records", []):
        message = record["Sns"]["Message"]
        if "devatlas-ai" not in message:          # only react to the AI budget's alerts
            continue
        ssm.put_parameter(Name=FLAG, Value="false", Type="String", Overwrite=True)
        print(json.dumps({"action": "ai_disabled", "reason": message[:200]}))
    return {"ai_enabled": ssm.get_parameter(Name=FLAG)["Parameter"]["Value"]}


def ai_enabled() -> bool:
    """The app checks the flag (cache it ~60 s) and shows 'AI features paused' when off."""
    return ssm.get_parameter(Name=FLAG)["Parameter"]["Value"] == "true"

# ---- test_killswitch.py ----
import os

os.environ.update(AWS_ENDPOINT_URL="http://localhost:4566", AWS_DEFAULT_REGION="us-east-1",
                  AWS_ACCESS_KEY_ID="test", AWS_SECRET_ACCESS_KEY="test")       # LocalStack

import killswitch  # noqa: E402


def sns(message: str) -> dict:
    return {"Records": [{"Sns": {"Message": message}}]}


def test_budget_alert_disables_ai_and_others_are_ignored():
    killswitch.ssm.put_parameter(Name=killswitch.FLAG, Value="true", Type="String", Overwrite=True)
    killswitch.lambda_handler(sns("AWS Budget Notification: devatlas-monthly at 80%"), None)
    assert killswitch.ai_enabled()                                   # other budget: ignored
    out = killswitch.lambda_handler(sns("AWS Budget Notification: devatlas-ai exceeded 100%"), None)
    assert out == {"ai_enabled": "false"} and not killswitch.ai_enabled()`,
        },
        output: "1 passed",
      },
    },
    capstone: {
      title: "DevAtlas: provider-agnostic AI and budgets",
      brief: [
        "Add `LLM_PROVIDER` support (anthropic, bedrock, foundry) to the AI service using the factory, with offline tests for all three, and commit `infra/budgets.tf` with an overall and an AI-specific budget.",
      ],
      criteria: [
        "Same feature code for all providers",
        "Model IDs per provider in one place",
        "Offline tests for each provider",
        "Budgets validate with Terraform",
      ],
      hints: ["Pass `http_client=` to the SDK clients in tests to capture requests."],
      solution: {
        text: [
          "Verified: 3 provider tests pass offline; `terraform validate` succeeds for both AWS and Azure budgets. Apply the budgets with real credentials and an alert email address.",
        ],
        code: {
          lang: "python",
          file: "services/ai/providers.py",
          code: `"""Run the same Claude code on the Anthropic API, Amazon Bedrock or Microsoft Foundry."""
import os

import anthropic

MODEL = "claude-opus-5-5"


def make_client(provider: str | None = None, **kwargs):
    """Returns (client, model_id). Every client exposes the same \`messages.create\` API."""
    provider = provider or os.environ.get("LLM_PROVIDER", "anthropic")
    if provider == "anthropic":
        return anthropic.Anthropic(**kwargs), MODEL                         # ANTHROPIC_API_KEY
    if provider == "bedrock":
        # IAM credentials from the role / profile; model IDs carry an "anthropic." prefix
        return anthropic.AnthropicBedrockMantle(aws_region=os.environ["AWS_REGION"], **kwargs), f"anthropic.{MODEL}"
    if provider == "foundry":
        # Microsoft Foundry resource; prefer Entra ID (azure_ad_token_provider) over API keys
        return anthropic.AnthropicFoundry(resource=os.environ["FOUNDRY_RESOURCE"], **kwargs), MODEL
    raise ValueError(f"unknown provider {provider!r}")


def ask(question: str, provider: str | None = None, **client_kwargs) -> str:
    client, model = make_client(provider, **client_kwargs)
    msg = client.messages.create(model=model, max_tokens=2000, output_config={"effort": "low"},
                                 messages=[{"role": "user", "content": question}])
    return "".join(b.text for b in msg.content if b.type == "text")`,
        },
        output: "3 passed\nSuccess! The configuration is valid.",
      },
    },
  },
  deeper: [
    {
      label: "Claude on Amazon Bedrock (Anthropic docs)",
      url: "https://docs.claude.com/en/docs/build-with-claude/claude-on-amazon-bedrock",
    },
    {
      label: "Azure OpenAI in Foundry Models: quotas and limits",
      url: "https://learn.microsoft.com/azure/ai-foundry/openai/quotas-limits",
    },
    {
      label: "AWS Budgets user guide",
      url: "https://docs.aws.amazon.com/cost-management/latest/userguide/budgets-managing-costs.html",
    },
    { label: "FinOps Foundation: FinOps framework", url: "https://www.finops.org/framework/" },
  ],
  nextPreview: "Next: Phase 9, DevOps. You will run DevAtlas's services together with Docker Compose: networks, volumes, healthchecks and a one-command local stack.",
};
