import type { Lesson } from "../../types";

export const lesson: Lesson = {
  id: "9.4.1",
  title: "Pods, deployments, services and ingress",
  minutes: 95,
  level: "Advanced",
  prerequisites: ["9.1.2 Docker Compose for multi-service apps", "9.2.1 GitHub Actions and Azure Pipelines"],
  summary: "Kubernetes from the ground up: the desired-state model and control loops, Pods, Deployments and ReplicaSets, rolling updates and rollbacks, Services and EndpointSlices, Ingress, probes, resources and Pod Security. You will deploy DevAtlas's API, watch Kubernetes heal and roll it, and package environments with Kustomize.",
  terms: [
    {
      term: "Cluster / node",
      def: "A cluster is a control plane plus worker nodes (machines) that run containers.",
    },
    {
      term: "Pod",
      def: "The smallest deployable unit: one or more containers sharing a network namespace and volumes, scheduled together on one node.",
    },
    {
      term: "Deployment / ReplicaSet",
      def: "A Deployment declares how many replicas of a pod template should run and how to update them; it manages ReplicaSets, which keep the pod count.",
    },
    {
      term: "Service",
      def: "A stable virtual IP and DNS name that load-balances to the ready pods matching a label selector.",
    },
    {
      term: "EndpointSlice",
      def: "The list of pod IPs currently backing a Service, maintained automatically from readiness.",
    },
    {
      term: "Ingress",
      def: "HTTP(S) routing rules (host, path, TLS) from outside the cluster to Services, implemented by an ingress controller.",
    },
    {
      term: "Probe",
      def: "A check kubelet runs: readiness (send traffic?), liveness (restart?), startup (still booting?).",
    },
    {
      term: "Requests / limits",
      def: "Requests reserve CPU and memory for scheduling; limits cap usage (memory over the limit kills the container).",
    },
  ],
  problem: [
    "DevAtlas now runs on a few VMs with Compose. A VM died at 3 a.m. and the API stayed down until someone woke up; deploys mean SSH-ing into each machine; scaling for an exam week is manual; and there is no way to roll back a bad release quickly.",
    "Kubernetes turns 'run three healthy copies of version 1.5.0 behind a stable address' into a declaration that the cluster enforces continuously: replacing failed pods, spreading them across nodes, rolling out new versions without downtime, and rolling back with one command.",
  ],
  concept: {
    analogy: [
      "Kubernetes is a **thermostat for your applications**. You set the desired temperature (three replicas of image 1.5.0, each with 128 MiB reserved); controllers constantly measure reality and act to close the gap. A pod dies: the room got cold, a new pod is started. You change the image: the setpoint changed, pods are replaced gradually. You never tell it *how*; you tell it *what*.",
    ],
    precise: [
      "**Desired state + control loops:** you submit objects (YAML) to the API server, which stores them in etcd. Controllers (Deployment, ReplicaSet, EndpointSlice...) watch objects and act until actual state matches. The scheduler assigns pods to nodes based on requests, affinity and taints; the kubelet on each node runs them.",
      "**Workloads:** a Deployment owns ReplicaSets, one per pod-template version. A rolling update scales the new ReplicaSet up and the old one down within `maxSurge` / `maxUnavailable`, gated by readiness. Old ReplicaSets are kept (scaled to zero) for `rollout undo`.",
      "**Networking:** every pod gets its own IP; Services give a stable name (`api.devatlas.svc.cluster.local`) and IP, backed by EndpointSlices containing only *ready* pods. Ingress (or the newer Gateway API) routes external HTTP(S) traffic to Services through a controller such as ingress-nginx or a cloud load balancer.",
      "**Health:** readiness controls traffic, liveness restarts stuck containers, startup protects slow starters. Resources: requests for scheduling and fair share, memory limits to contain leaks; CPU limits are often omitted to avoid throttling.",
      "**Security:** run as non-root with a read-only root filesystem, drop capabilities, and enforce Pod Security Standards (`restricted`) per namespace. RBAC limits what users and service accounts can do.",
      "**Managed Kubernetes:** EKS (AWS), AKS (Azure) and GKE (Google) run the control plane for you. Local learning clusters: kind, minikube, k3d, Docker Desktop.",
    ],
  },
  underTheHood: {
    text: [
      "Every object has `spec` (what you want) and `status` (what is). `kubectl apply` sends your spec; controllers write status. Labels and selectors are the glue: a Service finds pods by label, a ReplicaSet counts pods by label. A typo in labels silently breaks the link.",
      "A rolling update with `maxSurge: 1, maxUnavailable: 0` and 3 replicas: create 1 new pod (4 total), wait until it is ready, remove 1 old pod, repeat. If the new version never becomes ready, the rollout stalls with the old pods still serving: readiness probes are what make rollouts safe.",
      "Service traffic: kube-proxy (or an eBPF dataplane like Cilium) programs every node so that the Service's virtual IP is translated to one of the EndpointSlice addresses. When a pod fails readiness, it is removed from the slice within seconds.",
      "Scheduling uses *requests*, not actual usage. A pod requesting 100m CPU fits on a node with 100m unreserved, even if the node is busy. Accurate requests are essential for both reliability and cost.",
    ],
    diagram: {
      title: "From YAML to running pods",
      nodes: [
        { label: "kubectl apply", sub: "Deployment spec" },
        { label: "API server + etcd", sub: "stores desired state" },
        { label: "Controllers", sub: "Deployment → ReplicaSet → Pods" },
        { label: "Scheduler", sub: "pod → node" },
        { label: "kubelet", sub: "runs containers, probes" },
        { label: "Service", sub: "ready pod IPs" },
      ],
      edges: ["", "watch", "pending pods", "assigned", "readiness"],
    },
  },
  handsOn: [
    {
      title: "A namespace that enforces Pod Security",
      code: {
        lang: "yaml",
        file: "k8s/namespace.yaml",
        code: `apiVersion: v1
kind: Namespace
metadata:
  name: devatlas
  labels:
    pod-security.kubernetes.io/enforce: restricted   # reject privileged / root pods`,
      },
      notes: [
        "Create a local cluster first: `kind create cluster` (or minikube / Docker Desktop). The outputs below come from a local Kubernetes 1.33 test cluster; pod names and IPs will differ on yours.",
      ],
    },
    {
      title: "A production-grade Deployment",
      code: {
        lang: "yaml",
        file: "k8s/deployment.yaml",
        code: `apiVersion: apps/v1
kind: Deployment
metadata:
  name: api
  namespace: devatlas
  labels: { app: api }
spec:
  replicas: 3
  revisionHistoryLimit: 5
  selector:
    matchLabels: { app: api }
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1            # at most 1 extra pod during an update
      maxUnavailable: 0      # never drop below 3 ready pods
  template:
    metadata:
      labels: { app: api }
    spec:
      securityContext:
        runAsNonRoot: true
        seccompProfile: { type: RuntimeDefault }
      containers:
        - name: api
          image: ghcr.io/devatlas/api:1.4.0
          ports:
            - { name: http, containerPort: 8000 }
          env:
            - { name: APP_ENV, value: production }
          resources:
            requests: { cpu: 100m, memory: 128Mi }     # what the scheduler reserves
            limits: { memory: 256Mi }                   # OOM-killed above this
          readinessProbe:                               # gate traffic
            httpGet: { path: /health/ready, port: http }
            periodSeconds: 5
            failureThreshold: 3
          livenessProbe:                                # restart if stuck
            httpGet: { path: /health/live, port: http }
            initialDelaySeconds: 10
            periodSeconds: 10
          securityContext:
            allowPrivilegeEscalation: false
            readOnlyRootFilesystem: true
            capabilities: { drop: ["ALL"] }`,
      },
      notes: [
        "Every field earns its place: probes for safe rollouts, requests for scheduling, a memory limit, non-root and read-only filesystem for security, `maxUnavailable: 0` for zero-downtime updates.",
      ],
    },
    {
      title: "A Service and an Ingress",
      code: {
        lang: "yaml",
        file: "k8s/service.yaml + k8s/ingress.yaml",
        code: `apiVersion: v1
kind: Service
metadata:
  name: api
  namespace: devatlas
spec:
  selector: { app: api }          # every ready pod with this label gets traffic
  ports:
    - { name: http, port: 80, targetPort: http }
---
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: devatlas
  namespace: devatlas
spec:
  ingressClassName: nginx
  tls:
    - hosts: [devatlas.example.com]
      secretName: devatlas-tls       # e.g. issued by cert-manager
  rules:
    - host: devatlas.example.com
      http:
        paths:
          - path: /api
            pathType: Prefix
            backend:
              service: { name: api, port: { name: http } }`,
      },
      notes: [
        "`targetPort: http` refers to the container port by name, so changing the port number happens in one place.",
      ],
    },
    {
      title: "Apply and inspect",
      code: {
        lang: "bash",
        code: `kubectl apply -f k8s/namespace.yaml && kubectl apply -f k8s/
kubectl -n devatlas rollout status deploy/api
kubectl -n devatlas get deploy,rs,pods -o wide
kubectl -n devatlas get endpointslices -l kubernetes.io/service-name=api`,
      },
      output: "namespace/devatlas created\ndeployment.apps/api created\ningress.networking.k8s.io/devatlas created\nservice/api created\ndeployment \"api\" successfully rolled out\n\nNAME                  READY   UP-TO-DATE   AVAILABLE   IMAGES\ndeployment.apps/api   3/3     3            3           ghcr.io/devatlas/api:1.4.0\nNAME                             DESIRED   CURRENT   READY\nreplicaset.apps/api-7948546ff7   3         3         3\nNAME                       READY   STATUS    IP         NODE\npod/api-7948546ff7-pklxf   1/1     Running   10.0.0.0   node-000000\npod/api-7948546ff7-rhtgf   1/1     Running   10.0.2.0   node-000002\npod/api-7948546ff7-vcv7j   1/1     Running   10.0.1.0   node-000001\n\nNAME        ADDRESSES                    PORT\napi-6j5jx   10.0.0.0,10.0.2.0,10.0.1.0   8000",
      notes: [
        "The scheduler spread the three pods across three nodes. The EndpointSlice lists exactly the ready pod IPs.",
      ],
    },
    {
      title: "Self-healing, rolling update, rollback, scaling",
      code: {
        lang: "bash",
        code: `kubectl -n devatlas delete pod <one-api-pod>      # a replacement appears immediately
kubectl -n devatlas get pods --no-headers | wc -l

kubectl -n devatlas set image deploy/api api=ghcr.io/devatlas/api:1.5.0
kubectl -n devatlas annotate deploy/api kubernetes.io/change-cause="release 1.5.0: faster quiz grading"
kubectl -n devatlas rollout status deploy/api
kubectl -n devatlas get rs
kubectl -n devatlas rollout history deploy/api

kubectl -n devatlas rollout undo deploy/api        # back to 1.4.0
kubectl -n devatlas scale deploy/api --replicas=5`,
      },
      output: "3\n\nWaiting for deployment \"api\" rollout to finish: 2 out of 3 new replicas have been updated...\nWaiting for deployment \"api\" rollout to finish: 1 old replicas are pending termination...\ndeployment \"api\" successfully rolled out\nNAME             DESIRED   READY    IMAGE\napi-6bb4b95fbb   3         3        ghcr.io/devatlas/api:1.5.0\napi-7948546ff7   0         <none>   ghcr.io/devatlas/api:1.4.0\nREVISION  CHANGE-CAUSE\n1         <none>\n2         release 1.5.0: faster quiz grading\n\ndeployment \"api\" successfully rolled out      # after undo: image ghcr.io/devatlas/api:1.4.0",
      notes: [
        "The old ReplicaSet is kept at 0 replicas: that is what makes `rollout undo` instant. In GitOps setups you roll back by reverting the commit instead, so Git stays the source of truth.",
      ],
    },
    {
      title: "Pod Security in action",
      code: { lang: "bash", code: "kubectl -n devatlas run debug-root --image=alpine:3.20 -- sleep 3600" },
      output: "Error from server (Forbidden): pods \"debug-root\" is forbidden: violates PodSecurity \"restricted:latest\": allowPrivilegeEscalation != false (container must set securityContext.allowPrivilegeEscalation=false), unrestricted capabilities (container must set securityContext.capabilities.drop=[\"ALL\"]), runAsNonRoot != true (...), seccompProfile (...)",
      notes: [
        "The namespace label rejects pods that do not meet the restricted standard, so a shortcut like a root debug pod cannot slip into production. Use `kubectl debug` with an ephemeral container in an appropriate namespace instead.",
      ],
    },
  ],
  companies: [
    "**Managed Kubernetes is the norm:** most companies run EKS, AKS or GKE rather than operating control planes, and focus their effort on platform tooling: ingress, certificates, secrets, observability and deployment pipelines.",
    "**GitOps:** tools like Argo CD and Flux continuously apply manifests from Git to clusters, so the repository is the source of truth and every change is a reviewed commit.",
    "**Platform teams** give developers templates (Helm charts, Kustomize bases or internal developer platforms) with probes, resources and security settings pre-filled, so most teams never write raw manifests from scratch.",
    "**Not everyone needs it:** smaller teams often choose Container Apps, ECS, Cloud Run or App Service instead; Kubernetes pays off with many services, multiple teams and the need for a uniform platform.",
  ],
  mistakes: [
    {
      mistake: "No readiness probe",
      why: "The app 'starts fast'",
      wrong: "Traffic reaches pods before they can serve; rollouts proceed even when the new version is broken",
      fix: "Readiness probe on a real dependency-aware endpoint",
    },
    {
      mistake: "Liveness probe that checks the database",
      why: "One health endpoint for everything",
      wrong: "A database blip restarts every pod, prolonging the outage",
      fix: "Liveness checks only the process; readiness checks dependencies",
    },
    {
      mistake: "No resource requests",
      why: "YAML is shorter",
      wrong: "Overpacked nodes, noisy neighbours, evictions and unpredictable latency",
      fix: "Set requests from measured usage; a memory limit; revisit regularly",
    },
    {
      mistake: "Label typos between selector and template",
      why: "Copy-paste",
      wrong: "Deployment rejected, or a Service with zero endpoints",
      fix: "Keep labels consistent; check `kubectl get endpointslices`",
    },
    {
      mistake: "Using `:latest` images",
      why: "Convenient",
      wrong: "Nodes run different code; rollbacks do nothing",
      fix: "Immutable tags (version or commit SHA), optionally pinned by digest",
    },
    {
      mistake: "`kubectl edit` in production",
      why: "Quick fix",
      wrong: "Drift from Git; the next deploy overwrites the fix",
      fix: "Change manifests in Git and apply via the pipeline or GitOps",
    },
  ],
  bestPractices: [
    {
      tag: "Reliability",
      text: "At least 3 replicas spread across zones, readiness/liveness probes, `maxUnavailable: 0`, a PodDisruptionBudget, and graceful shutdown handling SIGTERM.",
    },
    {
      tag: "Security",
      text: "Pod Security `restricted`, non-root, read-only root filesystem, dropped capabilities, least-privilege RBAC and service accounts, NetworkPolicies between namespaces.",
    },
    {
      tag: "Performance",
      text: "Right-size requests from metrics; avoid CPU limits for latency-sensitive services; use HPA for load-driven scaling.",
    },
    {
      tag: "Cost",
      text: "Requests drive node count: over-requesting wastes money. Use cluster autoscaling, spot/preemptible nodes for tolerant workloads, and scale dev environments to zero at night.",
    },
    {
      tag: "Maintainability",
      text: "Declarative manifests in Git, environments via Kustomize overlays or Helm values, server-side dry runs in CI.",
    },
  ],
  interview: [
    {
      q: "What happens when you run `kubectl apply` on a Deployment?",
      a: "kubectl sends the object to the API server, which authenticates, authorises, runs admission (such as Pod Security), validates and stores it in etcd. The Deployment controller sees the change and creates or updates a ReplicaSet; the ReplicaSet controller creates Pods; the scheduler binds each pod to a node based on requests and constraints; the kubelet pulls images, starts containers and runs probes; ready pods are added to the Service's EndpointSlices.",
    },
    {
      q: "How does a rolling update avoid downtime, and how do you roll back?",
      a: "The Deployment creates a new ReplicaSet and shifts replicas gradually within maxSurge and maxUnavailable, only removing old pods when new ones pass readiness. With maxUnavailable 0, capacity never drops. If the new version fails readiness the rollout stalls without taking traffic. Roll back with `kubectl rollout undo`, which scales the previous ReplicaSet back up, or by reverting the manifest in Git with GitOps.",
    },
    {
      q: "Explain Service types and how Ingress relates to them.",
      a: "ClusterIP (default) is an internal virtual IP; NodePort opens a port on every node; LoadBalancer provisions a cloud load balancer; ExternalName is a DNS alias. Ingress is a separate resource with HTTP host/path/TLS rules, implemented by an ingress controller, which routes to ClusterIP Services, so many services can share one load balancer. The Gateway API is the newer, more expressive successor.",
    },
  ],
  quickCheck: [
    {
      kind: "mcq",
      prompt: "A new version's pods never become ready. With `maxSurge: 1, maxUnavailable: 0`, what do users experience?",
      options: [
        "Downtime until you roll back",
        "Nothing: old pods keep serving and the rollout stalls",
        "Half the requests fail",
        "Kubernetes rolls back automatically",
      ],
      answer: 1,
      explanation: "Old pods are only removed after new ones are ready. The rollout waits (and eventually reports progress deadline exceeded); you then fix or undo it.",
    },
    {
      kind: "output",
      prompt: "Using the HPA formula `ceil(current × current/target)` with min 3 and max 20, how many replicas for 5 pods at 150% CPU with a 60% target?",
      code: {
        lang: "python",
        code: `import math
current, cpu, target = 5, 150, 60
print(max(3, min(20, math.ceil(current * cpu / target))))`,
      },
      options: ["5", "12", "13", "20"],
      answer: 2,
      explanation: "5 × 150 / 60 = 12.5, rounded up to 13, within the [3, 20] range.",
    },
    {
      kind: "bug",
      prompt: "The API server rejects this Deployment. Why?",
      code: {
        lang: "yaml",
        code: `spec:
  selector:
    matchLabels: { app: ai }
  template:
    metadata:
      labels: { app: ai-service }`,
      },
      options: [
        "replicas is missing",
        "The selector does not match the template labels",
        "Labels cannot contain dashes",
        "metadata needs a name",
      ],
      answer: 1,
      explanation: "Real error: `spec.template.metadata.labels: Invalid value: map[string]string{\"app\":\"ai-service\"}: selector does not match template labels`.",
    },
  ],
  cheatSheet: [
    "Desired state (spec) → controllers → actual state (status).",
    "Deployment → ReplicaSet (per version) → Pods; Service → EndpointSlices of ready pods.",
    "`apply -f` · `get/describe` · `logs -f` · `rollout status/history/undo` · `scale` · `set image`.",
    "Readiness = traffic; liveness = restart; startup = slow boot.",
    "Requests for scheduling; memory limit; usually no CPU limit.",
    "`maxSurge: 1, maxUnavailable: 0` for zero-downtime rollouts.",
    "Namespace label `pod-security.kubernetes.io/enforce: restricted`.",
    "Ingress = HTTP routing via a controller; ClusterIP behind it.",
    "`kubectl apply --dry-run=server` validates against the real API.",
    "Managed: EKS, AKS, GKE. Local: kind, minikube, k3d.",
  ],
  homework: {
    basic: {
      title: "Deploy the AI service",
      brief: [
        "Write a Deployment (2 replicas, probes, requests/limits, restricted security context, a longer termination grace period for streaming responses) and a ClusterIP Service for the AI service. Validate with a server-side dry run, apply it, and confirm both pods appear in the EndpointSlice. Also trigger and read the selector-mismatch error once.",
      ],
      criteria: [
        "Passes `--dry-run=server` and the restricted Pod Security check",
        "Selector matches template labels",
        "EndpointSlice shows two ready addresses",
      ],
      hints: ["`kubectl explain deployment.spec.strategy` documents any field."],
      solution: {
        text: [
          "`terminationGracePeriodSeconds: 60` gives in-flight LLM streams time to finish after SIGTERM; your app must stop accepting new requests and drain.",
        ],
        code: {
          lang: "yaml",
          file: "k8s/ai.yaml",
          code: `apiVersion: apps/v1
kind: Deployment
metadata:
  name: ai
  namespace: devatlas
spec:
  replicas: 2
  selector:
    matchLabels: { app: ai }
  template:
    metadata:
      labels: { app: ai }            # must match the selector
    spec:
      securityContext:
        runAsNonRoot: true
        seccompProfile: { type: RuntimeDefault }
      terminationGracePeriodSeconds: 60   # let in-flight LLM streams finish
      containers:
        - name: ai
          image: ghcr.io/devatlas/ai:2.1.0
          ports: [{ name: http, containerPort: 8080 }]
          resources:
            requests: { cpu: 250m, memory: 256Mi }
            limits: { memory: 512Mi }
          readinessProbe:
            httpGet: { path: /healthz, port: http }
          securityContext:
            allowPrivilegeEscalation: false
            capabilities: { drop: ["ALL"] }
---
apiVersion: v1
kind: Service
metadata:
  name: ai
  namespace: devatlas
spec:
  selector: { app: ai }
  ports: [{ name: http, port: 80, targetPort: http }]`,
        },
        output: "deployment.apps/ai created (server dry run)\nservice/ai created (server dry run)\ndeployment \"ai\" successfully rolled out\n10.0.2.3:true 10.0.0.1:true\n\n# with mismatched labels:\nThe Deployment \"ai\" is invalid: spec.template.metadata.labels: Invalid value: map[string]string{\"app\":\"ai-service\"}: `selector` does not match template `labels`",
      },
    },
    intermediate: {
      title: "Survive node maintenance with a PodDisruptionBudget",
      brief: [
        "Scale the API to 5, add a PDB with `minAvailable: 4`, then drain a node. Explain what the PDB guarantees and what it does not.",
      ],
      criteria: [
        "PDB applied and shows allowed disruptions",
        "Drain completes with pods rescheduled",
        "Explanation of voluntary vs involuntary disruptions",
      ],
      hints: ["`kubectl drain <node> --ignore-daemonsets --delete-emptydir-data`."],
      solution: {
        text: [
          "The PDB allowed 1 disruption at a time; the drain evicted the node's two pods one after the other as replacements became ready elsewhere. If replacements were not ready, drain would retry with 'Cannot evict pod as it would violate the pod's disruption budget'.",
          "PDBs protect against *voluntary* disruptions (drains, upgrades, autoscaler scale-downs), not against node crashes. Spread replicas across zones for those.",
        ],
        code: {
          lang: "yaml",
          file: "k8s/pdb.yaml",
          code: `apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: api
  namespace: devatlas
spec:
  minAvailable: 4                  # with 5 replicas: at most 1 pod may be evicted at a time
  selector:
    matchLabels: { app: api }`,
        },
        output: "NAME   MIN AVAILABLE   MAX UNAVAILABLE   ALLOWED DISRUPTIONS\napi    4               N/A               1\nevicting pod devatlas/api-7948546ff7-flvjb\nevicting pod devatlas/api-7948546ff7-qw2xl\npod/api-… evicted (×2)\nnode/node-000000 drained\n\n# pods per node afterwards: 2 on node-000001, 3 on node-000002",
      },
    },
    challenge: {
      title: "Autoscaling: predict the HPA",
      brief: [
        "Write an HPA for the API (3 to 20 replicas, 60% CPU target, slow scale-down). Then implement the HPA's core formula in Python and predict its decisions for several load levels.",
      ],
      criteria: [
        "autoscaling/v2 manifest accepted by the API server",
        "Formula with tolerance and min/max clamp",
        "Explanation of why requests matter for utilisation",
      ],
      hints: ["Utilisation is measured against the CPU *request*, not the limit or the node."],
      solution: {
        text: [
          "CPU utilisation = usage / request. Requests that are too high make the HPA scale too late; too low and it scales too eagerly. The 10% tolerance and the scale-down stabilisation window prevent flapping.",
        ],
        code: {
          lang: "python",
          file: "hpa_math.py",
          code: `"""The HPA formula: desired = ceil(current * currentMetric / target), with a 10% tolerance,
clamped to [minReplicas, maxReplicas]."""
import math


def desired_replicas(current: int, cpu_now: float, cpu_target: float,
                     lo: int = 3, hi: int = 20, tolerance: float = 0.1) -> int:
    ratio = cpu_now / cpu_target
    if abs(ratio - 1) <= tolerance:          # close enough: do nothing (avoids flapping)
        return current
    return max(lo, min(hi, math.ceil(current * ratio)))


for current, cpu in [(3, 62), (3, 90), (5, 150), (8, 20), (10, 300)]:
    print(f"{current:2} pods at {cpu:3}% CPU (target 60%) -> {desired_replicas(current, cpu, 60)} pods")

# ---- k8s/hpa.yaml ----
# apiVersion: autoscaling/v2
# kind: HorizontalPodAutoscaler
# metadata:
#   name: api
#   namespace: devatlas
# spec:
#   scaleTargetRef: { apiVersion: apps/v1, kind: Deployment, name: api }
#   minReplicas: 3
#   maxReplicas: 20
#   metrics:
#     - type: Resource
#       resource:
#         name: cpu
#         target: { type: Utilization, averageUtilization: 60 }   # % of the CPU *request*
#   behavior:
#     scaleDown:
#       stabilizationWindowSeconds: 300      # wait 5 min of low load before removing pods`,
        },
        output: " 3 pods at  62% CPU (target 60%) -> 3 pods\n 3 pods at  90% CPU (target 60%) -> 5 pods\n 5 pods at 150% CPU (target 60%) -> 13 pods\n 8 pods at  20% CPU (target 60%) -> 3 pods\n10 pods at 300% CPU (target 60%) -> 20 pods\nhorizontalpodautoscaler.autoscaling/api created (server dry run)",
      },
    },
    capstone: {
      title: "DevAtlas: Kustomize base and environment overlays",
      brief: [
        "Organise DevAtlas's manifests as a Kustomize base plus `dev` and `prod` overlays: dev runs 1 replica with a commit-SHA image and development settings; prod runs 5 replicas with a release tag, PDB and HPA. Validate both with a server-side dry run.",
      ],
      criteria: [
        "No duplicated YAML between environments",
        "Image tags set per overlay",
        "Both overlays pass `--dry-run=server`",
      ],
      hints: ["`kubectl kustomize overlays/prod | kubectl apply --dry-run=server -f -`"],
      solution: {
        text: [
          "Kustomize is built into kubectl and works without templates: overlays patch the base. CI updates `newTag` with the commit SHA, which is exactly what GitOps tools watch.",
        ],
        code: {
          lang: "yaml",
          file: "k8s/overlays/prod/kustomization.yaml",
          code: `apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
namespace: devatlas
resources:
  - ../../base
  - pdb.yaml
  - hpa.yaml
replicas:
  - { name: api, count: 5 }
images:
  - { name: ghcr.io/devatlas/api, newTag: "1.5.0" }

# ---- k8s/overlays/dev/kustomization.yaml ----
# apiVersion: kustomize.config.k8s.io/v1beta1
# kind: Kustomization
# namespace: devatlas-dev
# resources:
#   - ../../base
# replicas:
#   - { name: api, count: 1 }
# images:
#   - { name: ghcr.io/devatlas/api, newTag: main-3f2a1c9 }   # CI writes the commit SHA here
# patches:
#   - target: { kind: Deployment, name: api }
#     patch: |-
#       - op: replace
#         path: /spec/template/spec/containers/0/env/0/value
#         value: development

# ---- k8s/base/kustomization.yaml ----
# apiVersion: kustomize.config.k8s.io/v1beta1
# kind: Kustomization
# resources:
#   - deployment.yaml
#   - service.yaml
# labels:
#   - pairs: { app.kubernetes.io/part-of: devatlas }`,
        },
        output: "== dev\nservice/api created (server dry run)\ndeployment.apps/api created (server dry run)\n== prod\nservice/api configured (server dry run)\ndeployment.apps/api configured (server dry run)\npoddisruptionbudget.policy/api configured (server dry run)\nhorizontalpodautoscaler.autoscaling/api created (server dry run)",
      },
    },
  },
  deeper: [
    { label: "Kubernetes docs: Concepts", url: "https://kubernetes.io/docs/concepts/" },
    {
      label: "Kubernetes docs: Deployments",
      url: "https://kubernetes.io/docs/concepts/workloads/controllers/deployment/",
    },
    {
      label: "Kubernetes docs: Pod Security Standards",
      url: "https://kubernetes.io/docs/concepts/security/pod-security-standards/",
    },
    { label: "kind: local clusters in Docker", url: "https://kind.sigs.k8s.io/" },
  ],
  nextPreview: "Next: configuration and secrets in Kubernetes, and packaging DevAtlas as a Helm chart.",
};
