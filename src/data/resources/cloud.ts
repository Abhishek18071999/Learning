import type { ResourceSection } from "../../types";

export const cloud: ResourceSection = {
  id: "cloud",
  title: "Cloud: AWS and Azure",
  icon: "☁️",
  tagline: "AWS full course and Azure full course",
  phaseId: 8,
  courses: [
    {
      id: "aws",
      title: "AWS",
      topics: [
        {
          id: "aws-cloud-computing-and-aws-basics",
          title: "Cloud computing and AWS basics",
          revision: [
            "Cloud computing = on-demand compute, storage and services over the internet with pay-as-you-go pricing.",
            "Service models: IaaS (EC2), PaaS (Elastic Beanstalk), SaaS; AWS runs the infra, you manage what you deploy.",
            "Shared responsibility: AWS secures the cloud itself; you secure what you put in it (data, IAM, OS patches).",
          ],
        },
        {
          id: "aws-regions-and-availability-zones",
          title: "Regions and availability zones",
          revision: [
            "A Region is a separate geographic area; each has multiple isolated Availability Zones (AZs).",
            "An AZ is one or more data centers with independent power and networking; spread across AZs for high availability.",
            "Edge locations serve CloudFront and Route 53 closer to users; pick a Region by latency, cost, compliance and service availability.",
          ],
          read: { label: "Global infrastructure - Overview of Amazon Web Services", url: "https://docs.aws.amazon.com/whitepapers/latest/aws-overview/global-infrastructure.html", kind: "docs" },
        },
        {
          id: "aws-iam",
          title: "IAM",
          lessonId: "8.3.1",
          revision: [
            "IAM controls who (users, groups, roles) can do what (policies) on which AWS resources.",
            "Policies are JSON documents with Effect, Action, Resource; an explicit Deny always wins.",
            "Prefer roles with temporary credentials over long-lived access keys; follow least privilege and enable MFA.",
          ],
          read: { label: "What is IAM? - AWS Identity and Access Management", url: "https://docs.aws.amazon.com/IAM/latest/UserGuide/introduction.html", kind: "docs" },
          practice: { label: "90DaysOfDevOps Day 38: create IAM users, a DevOps group and policies, launch EC2 as an IAM user", url: "https://github.com/TrainWithShubham/90DaysOfDevOps/blob/master/2023/day38/README.md" },
        },
        {
          id: "aws-ec2",
          title: "EC2",
          lessonId: "8.1.1",
          revision: [
            "EC2 provides resizable virtual servers (instances) launched from an AMI with a chosen instance type.",
            "Security groups are stateful instance-level firewalls; key pairs give SSH access.",
            "Pricing options: On-Demand, Reserved/Savings Plans, Spot (cheap but interruptible).",
          ],
          read: { label: "Choosing an AWS compute service - AWS Decision Guides", url: "https://docs.aws.amazon.com/decision-guides/latest/compute-on-aws-how-to-choose/choosing-aws-compute-service.html", kind: "docs" },
          video: { label: "AWS EC2 vs ECS vs Fargate vs Lambda in Hindi", url: "https://www.youtube.com/watch?v=608MZfIxRn0", channel: "TrainWithShubham", lang: "Hindi" },
          practice: { label: "90DaysOfDevOps Day 40: launch template, launch 3 EC2 instances, optional Auto Scaling group", url: "https://github.com/TrainWithShubham/90DaysOfDevOps/blob/master/2023/day40/README.md" },
        },
        {
          id: "aws-s3",
          title: "S3",
          lessonId: "8.2.1",
          revision: [
            "S3 is object storage: objects (up to 5 TB) stored in buckets with globally unique names.",
            "Storage classes (Standard, Standard-IA, Glacier tiers) trade access cost vs storage cost; lifecycle rules move data between them.",
            "Block Public Access is on by default; use bucket policies, versioning and encryption to protect data.",
          ],
          read: { label: "What is Amazon S3? - Amazon Simple Storage Service", url: "https://docs.aws.amazon.com/AmazonS3/latest/userguide/Welcome.html", kind: "docs" },
          video: { label: "AWS S3 (Simple Storage Service) in Hindi with Practical | AWS Cloud Object Storage | Brain Mentors", url: "https://www.youtube.com/watch?v=1nP6ljDq51Y", channel: "BrainMentors Pvt Ltd", lang: "Hindi" },
        },
        {
          id: "aws-ebs-and-efs",
          title: "EBS and EFS",
          revision: [
            "EBS = block storage volume attached to one EC2 instance in a single AZ (like a virtual disk); snapshots go to S3.",
            "EFS = managed NFS file system that many instances across AZs can mount at once and that grows automatically.",
            "Use EBS for boot/database disks, EFS for shared files, S3 for objects.",
          ],
        },
        {
          id: "aws-vpc-and-networking",
          title: "VPC and networking",
          lessonId: "8.3.1",
          revision: [
            "A VPC is your isolated virtual network with a CIDR range, split into subnets per AZ.",
            "Public subnets route to an Internet Gateway; private subnets reach out via a NAT Gateway.",
            "Security groups are stateful (instance level); network ACLs are stateless (subnet level).",
          ],
          read: { label: "What is Amazon VPC? - Amazon Virtual Private Cloud", url: "https://docs.aws.amazon.com/vpc/latest/userguide/what-is-amazon-vpc.html", kind: "docs" },
          video: { label: "What is VPC and Subnet in AWS FULL DEMO in Hindi", url: "https://www.youtube.com/watch?v=l8Apfw7b6qw", channel: "Cloud Tech Burner", lang: "Hindi" },
        },
        {
          id: "aws-load-balancers-and-auto-scaling",
          title: "Load balancers and Auto Scaling",
          lessonId: "8.3.1",
          revision: [
            "Elastic Load Balancing spreads traffic across targets: ALB (HTTP/HTTPS, layer 7), NLB (TCP/UDP, layer 4).",
            "Health checks remove unhealthy targets from rotation.",
            "Auto Scaling groups keep min/desired/max instance counts and scale on policies such as target CPU utilization.",
          ],
          read: { label: "What is Elastic Load Balancing? - Elastic Load Balancing", url: "https://docs.aws.amazon.com/elasticloadbalancing/latest/userguide/what-is-load-balancing.html", kind: "docs" },
        },
        {
          id: "aws-rds-and-aurora",
          title: "RDS and Aurora",
          lessonId: "8.2.1",
          revision: [
            "RDS is managed relational databases (MySQL, PostgreSQL, MariaDB, Oracle, SQL Server) with backups and patching handled.",
            "Multi-AZ gives standby failover for availability; read replicas scale reads.",
            "Aurora is AWS's MySQL/PostgreSQL-compatible engine with storage replicated six ways across three AZs.",
          ],
          read: { label: "Choosing an AWS database service - AWS Decision Guides", url: "https://docs.aws.amazon.com/decision-guides/latest/databases-on-aws-how-to-choose/databases-on-aws-how-to-choose.html", kind: "docs" },
        },
        {
          id: "aws-dynamodb",
          title: "DynamoDB",
          lessonId: "8.2.1",
          revision: [
            "DynamoDB is a serverless NoSQL key-value and document database with single-digit-millisecond latency.",
            "Every item needs a primary key: partition key, optionally plus sort key; design tables around access patterns.",
            "Capacity modes: on-demand or provisioned; GSIs/LSIs enable alternate query patterns.",
          ],
          practice: { label: "Build a Basic Web Application (AWS hands-on: Amplify, Lambda, DynamoDB, API Gateway)", url: "https://docs.aws.amazon.com/hands-on/latest/build-web-app-s3-lambda-api-gateway-dynamodb/build-web-app-s3-lambda-api-gateway-dynamodb.html" },
        },
        {
          id: "aws-lambda-and-serverless",
          title: "Lambda and serverless",
          lessonId: "8.1.1",
          revision: [
            "Lambda runs your function code in response to events without managing servers; you pay per request and duration.",
            "Max timeout is 15 minutes; memory setting also scales CPU.",
            "Common triggers: API Gateway, S3 events, SQS, EventBridge schedules.",
          ],
          read: { label: "What is AWS Lambda? - AWS Lambda", url: "https://docs.aws.amazon.com/lambda/latest/dg/welcome.html", kind: "docs" },
        },
        {
          id: "aws-ecs-and-eks",
          title: "ECS and EKS",
          lessonId: "8.1.1",
          revision: [
            "ECS is AWS's own container orchestrator using task definitions and services.",
            "EKS is managed Kubernetes; AWS runs the control plane, you run or delegate worker nodes.",
            "Fargate runs ECS/EKS containers serverlessly without managing EC2 instances; images usually come from ECR.",
          ],
        },
        {
          id: "aws-route-53-and-cloudfront",
          title: "Route 53 and CloudFront",
          revision: [
            "Route 53 is AWS's DNS service: hosted zones, records, health checks and routing policies (latency, weighted, failover).",
            "Alias records point a domain at AWS resources like ALBs or CloudFront at no query cost.",
            "CloudFront is a CDN caching content at edge locations; origins can be S3, ALB or any HTTP server.",
          ],
        },
        {
          id: "aws-cloudwatch",
          title: "CloudWatch",
          revision: [
            "CloudWatch collects metrics, logs and events from AWS resources and apps.",
            "Alarms watch a metric against a threshold and can notify SNS or trigger Auto Scaling.",
            "CloudWatch Logs stores log groups/streams; Logs Insights queries them.",
          ],
          read: { label: "What is Amazon CloudWatch? - Amazon CloudWatch", url: "https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/WhatIsCloudWatch.html", kind: "docs" },
        },
        {
          id: "aws-sqs-and-sns",
          title: "SQS and SNS",
          revision: [
            "SQS is a message queue: producers send, consumers poll and delete; decouples components.",
            "Standard queues give at-least-once delivery; FIFO queues keep order and exactly-once processing.",
            "SNS is pub/sub: one message to a topic fans out to many subscribers (SQS, Lambda, email, HTTP).",
          ],
        },
        {
          id: "aws-secrets-manager-and-kms",
          title: "Secrets Manager and KMS",
          lessonId: "8.3.1",
          revision: [
            "Secrets Manager stores and rotates secrets like DB passwords and API keys; apps fetch them at runtime.",
            "KMS creates and manages encryption keys used by S3, EBS, RDS and others.",
            "Envelope encryption: a KMS key encrypts data keys, which encrypt the data; access is controlled by key policies and IAM.",
          ],
        },
        {
          id: "aws-cloudformation-and-cdk",
          title: "CloudFormation and CDK",
          revision: [
            "CloudFormation is infrastructure as code: YAML/JSON templates create stacks of resources.",
            "Change sets preview updates; deleting a stack removes its resources.",
            "AWS CDK lets you define infrastructure in TypeScript, Python, etc. and synthesizes CloudFormation templates (`cdk deploy`).",
          ],
        },
        {
          id: "aws-amazon-bedrock",
          title: "Amazon Bedrock",
          lessonId: "8.4.1",
          revision: [
            "Amazon Bedrock is a managed service giving API access to foundation models from several providers.",
            "Supports knowledge bases (RAG), agents, guardrails and model customization.",
            "Pay per token on-demand or via provisioned throughput; data stays in your AWS account.",
          ],
          read: { label: "Amazon Bedrock - build generative AI applications and agents", url: "https://aws.amazon.com/bedrock/", kind: "docs" },
        },
        {
          id: "aws-billing-budgets-and-cost",
          title: "Billing, budgets and cost",
          lessonId: "8.4.1",
          revision: [
            "AWS Budgets sends alerts when actual or forecasted cost/usage crosses a threshold.",
            "Cost Explorer visualizes spend by service, tag and time; use cost allocation tags.",
            "Free Tier has limits; stop or delete unused resources (EC2, NAT Gateways, EBS) to avoid charges.",
          ],
          video: { label: "Stop AWS Charges 🚨 Set Budget Alerts + Free Credits Explained (AI Safe Guide) | Ep 11 #generativeai", url: "https://www.youtube.com/watch?v=Hj1AtAYqfME", channel: "Peace Of Code", lang: "English" },
          practice: { label: "90DaysOfDevOps Day 78: set up EC2 alerts and AWS billing alerts", url: "https://github.com/TrainWithShubham/90DaysOfDevOps/blob/master/2023/day78/README.md" },
        },
        {
          id: "aws-aws-certifications",
          title: "AWS certifications",
          revision: [
            "Levels: Foundational (Cloud Practitioner, AI Practitioner), Associate, Professional, Specialty.",
            "Cloud Practitioner suits beginners; Solutions Architect Associate is the common next step.",
            "Certifications are valid for three years; exams are multiple choice/multiple response.",
          ],
        },
      ],
    },
    {
      id: "azure",
      title: "Azure",
      topics: [
        {
          id: "azure-azure-basics-and-the-portal",
          title: "Azure basics and the portal",
          revision: [],
        },
        {
          id: "azure-subscriptions-resource-groups-and-regions",
          title: "Subscriptions, resource groups and regions",
          revision: [],
        },
        {
          id: "azure-entra-id-and-rbac",
          title: "Entra ID and RBAC",
          lessonId: "8.3.1",
          revision: [],
        },
        {
          id: "azure-virtual-machines",
          title: "Virtual Machines",
          lessonId: "8.1.1",
          revision: [],
        },
        {
          id: "azure-app-service",
          title: "App Service",
          revision: [],
        },
        {
          id: "azure-azure-functions",
          title: "Azure Functions",
          lessonId: "8.1.1",
          revision: [],
        },
        {
          id: "azure-storage-accounts-and-blob",
          title: "Storage accounts and Blob",
          lessonId: "8.2.1",
          revision: [],
        },
        {
          id: "azure-azure-sql",
          title: "Azure SQL",
          lessonId: "8.2.1",
          revision: [],
        },
        {
          id: "azure-cosmos-db",
          title: "Cosmos DB",
          lessonId: "8.2.1",
          revision: [],
        },
        {
          id: "azure-virtual-networks-and-nsgs",
          title: "Virtual networks and NSGs",
          lessonId: "8.3.1",
          revision: [],
        },
        {
          id: "azure-load-balancer-and-application-gateway",
          title: "Load Balancer and Application Gateway",
          lessonId: "8.3.1",
          revision: [],
        },
        {
          id: "azure-aks-and-container-apps",
          title: "AKS and Container Apps",
          lessonId: "8.1.1",
          revision: [],
        },
        {
          id: "azure-key-vault",
          title: "Key Vault",
          lessonId: "8.3.1",
          revision: [],
        },
        {
          id: "azure-azure-monitor",
          title: "Azure Monitor",
          revision: [],
        },
        {
          id: "azure-arm-templates-and-bicep",
          title: "ARM templates and Bicep",
          revision: [],
        },
        {
          id: "azure-azure-openai",
          title: "Azure OpenAI",
          lessonId: "8.4.1",
          revision: [],
        },
        {
          id: "azure-cost-management",
          title: "Cost Management",
          lessonId: "8.4.1",
          revision: [],
        },
        {
          id: "azure-azure-certifications-az-900-az-104",
          title: "Azure certifications (AZ-900, AZ-104)",
          revision: [],
        },
      ],
    },
  ],
};
