import type { Lesson } from "../../types";

export const lesson: Lesson = {
  id: "9.4.2",
  title: "Config, secrets and Helm",
  minutes: 85,
  level: "Advanced",
  prerequisites: ["9.4.1 Pods, deployments, services and ingress"],
  summary: "Separate configuration from images with ConfigMaps and Secrets, understand what Kubernetes Secrets do and do not protect, make config changes roll out safely, and package DevAtlas as a Helm chart with values per environment, schema validation, upgrades and rollbacks.",
  terms: [
    {
      term: "ConfigMap",
      def: "A Kubernetes object holding non-secret configuration as key-value pairs or files.",
    },
    {
      term: "Secret",
      def: "Like a ConfigMap for sensitive values. Stored base64-encoded; protected by RBAC and (if configured) encryption at rest, not by the encoding.",
    },
    {
      term: "envFrom / valueFrom",
      def: "Ways to turn ConfigMap or Secret keys into environment variables (all keys, or one key).",
    },
    {
      term: "Projected volume / mount",
      def: "Mounting ConfigMap or Secret keys as files; mounted files are updated when the object changes.",
    },
    {
      term: "Helm chart",
      def: "A package of templated Kubernetes manifests plus default values (`values.yaml`) and metadata (`Chart.yaml`).",
    },
    {
      term: "Release / revision",
      def: "An installed instance of a chart (e.g. `api` in namespace `web`); each upgrade creates a new revision you can roll back to.",
    },
    {
      term: "External secrets",
      def: "Tools that sync secrets from AWS Secrets Manager, Azure Key Vault or Vault into the cluster (External Secrets Operator, Secrets Store CSI Driver).",
    },
    {
      term: "Values schema",
      def: "`values.schema.json`, a JSON Schema Helm uses to reject invalid values before rendering.",
    },
  ],
  problem: [
    "The DevAtlas API image has the production database URL baked in, so staging accidentally wrote to production once. Secrets live in a YAML file in Git ('it's base64, it's fine'). Changing `LOG_LEVEL` in a ConfigMap did nothing until someone restarted pods by hand. And the YAML for dev and prod has drifted into two copies that disagree.",
    "One image for every environment, configuration injected at deploy time, secrets that never touch Git, and one packaged chart with per-environment values fixes all four.",
  ],
  concept: {
    analogy: [
      "The container image is a **coffee machine**; ConfigMaps are the **settings card** taped to it (cup size, strength), Secrets are the **key to the cash box**, kept in a locked drawer and handed only to staff who need it. Helm is the **franchise kit**: the same machine, card template and instructions shipped to every café, with each café filling in its own settings.",
    ],
    precise: [
      "**Build once, configure at deploy:** the same image runs in dev and prod; environment-specific values come from ConfigMaps, Secrets and Helm values (the twelve-factor principle).",
      "**Consuming config:** as environment variables (`envFrom`, `valueFrom`), read once at start and never updated; or as mounted files, which the kubelet updates in place (with a delay of up to a minute or so). Changing env-var config therefore needs a rollout: Helm charts add a checksum of the ConfigMap to the pod template so any change triggers one.",
      "**Secrets reality check:** base64 is encoding, not encryption. Protect Secrets with RBAC (few people and service accounts can `get secrets`), encryption at rest in etcd (managed clusters often offer KMS integration), and keep values out of Git: sync them from a secret manager (External Secrets Operator, CSI driver) or commit only encrypted forms (Sealed Secrets, SOPS).",
      "**Helm:** templates use Go templating with `.Values`, `.Release` and `.Chart`; `helm install/upgrade` creates revisions; `helm rollback` restores a previous one; `--atomic` rolls back automatically if the upgrade fails; `helm template` renders locally for review and validation; `values.schema.json` validates inputs.",
    ],
  },
  underTheHood: {
    text: [
      "Secrets are stored in etcd. Anyone who can create a pod in a namespace can mount any Secret in that namespace, which is why namespace boundaries and RBAC matter as much as the Secret object itself.",
      "Mounted Secret/ConfigMap files are symlinks to a timestamped directory; the kubelet swaps the symlink atomically on update. Apps that re-read the file see the new value; apps that cache it forever do not. `subPath` mounts do not receive updates at all.",
      "Helm stores each release revision as a Secret in the release namespace (`sh.helm.release.v1.<name>.v<rev>`), containing the rendered manifests and values. Rollback re-applies a stored revision; it does not undo data changes such as database migrations.",
      "Deployment selectors are immutable. Changing labels used in a selector (for example renaming a chart or release) cannot be applied in place: you must delete and recreate the Deployment, or keep selectors stable from day one.",
    ],
    diagram: {
      title: "Where configuration comes from",
      nodes: [
        { label: "Image", sub: "same everywhere" },
        { label: "values-prod.yaml", sub: "Helm values" },
        { label: "ConfigMap", sub: "env + files" },
        { label: "Secret manager", sub: "Key Vault / AWS SM" },
        { label: "Secret", sub: "synced, RBAC-protected" },
        { label: "Pod", sub: "env vars + mounted files" },
      ],
      edges: ["", "rendered into", "", "External Secrets", "mounted"],
    },
  },
  handsOn: [
    {
      title: "A ConfigMap and a Secret",
      code: {
        lang: "yaml",
        file: "config.yaml",
        code: `apiVersion: v1
kind: ConfigMap
metadata:
  name: api-config
  namespace: devatlas
data:
  APP_ENV: production                 # becomes an env var via envFrom
  LOG_LEVEL: info
  features.json: |                    # becomes a file via a volume
    {"ai_tutor": true, "live_sessions": false}
---
apiVersion: v1
kind: Secret
metadata:
  name: api-secrets
  namespace: devatlas
type: Opaque
stringData:                           # plain text in; stored base64-encoded (NOT encrypted)
  DATABASE_PASSWORD: s3cr3t-from-ci`,
      },
      output: "$ kubectl apply -f config.yaml\nconfigmap/api-config created\nsecret/api-secrets created\n$ kubectl -n devatlas get secret api-secrets -o jsonpath='{.data.DATABASE_PASSWORD}'\nczNjcjN0LWZyb20tY2k=\n$ ... | base64 -d\ns3cr3t-from-ci",
      notes: [
        "Anyone allowed to read Secrets sees the value in one command. Never commit Secret manifests with real values; this one exists to show the mechanics.",
      ],
    },
    {
      title: "Use them as env vars and files",
      code: {
        lang: "yaml",
        file: "deployment.yaml",
        code: `apiVersion: apps/v1
kind: Deployment
metadata:
  name: api
  namespace: devatlas
spec:
  replicas: 3
  selector:
    matchLabels: { app: api }
  template:
    metadata:
      labels: { app: api }
    spec:
      securityContext:
        runAsNonRoot: true
        seccompProfile: { type: RuntimeDefault }
      containers:
        - name: api
          image: ghcr.io/devatlas/api:1.5.0
          envFrom:
            - configMapRef: { name: api-config }      # APP_ENV, LOG_LEVEL (and features.json, ignored)
          env:
            - name: DATABASE_PASSWORD                  # one key from the Secret
              valueFrom:
                secretKeyRef: { name: api-secrets, key: DATABASE_PASSWORD }
          volumeMounts:
            - { name: features, mountPath: /etc/devatlas, readOnly: true }
            - { name: secrets, mountPath: /run/secrets/devatlas, readOnly: true }
          securityContext:
            allowPrivilegeEscalation: false
            capabilities: { drop: ["ALL"] }
      volumes:
        - name: features                               # /etc/devatlas/features.json
          configMap:
            name: api-config
            items: [{ key: features.json, path: features.json }]
        - name: secrets                                # files update when the Secret changes
          secret: { secretName: api-secrets, defaultMode: 0400 }`,
      },
      notes: [
        "Prefer files for secrets: they do not show up in `kubectl describe`, crash dumps or child processes, and they update on rotation.",
      ],
    },
    {
      title: "A Helm chart: Chart.yaml, values and templates",
      code: {
        lang: "yaml",
        file: "charts/devatlas-api/values.yaml",
        code: `apiVersion: v2
name: devatlas-api
description: DevAtlas API service
type: application
version: 0.3.0          # chart version: bump when templates change
appVersion: "1.5.0"    # default image tag

# ---- values.yaml ----
replicaCount: 3

image:
  repository: ghcr.io/devatlas/api
  tag: ""              # defaults to .Chart.AppVersion

config:
  APP_ENV: production
  LOG_LEVEL: info

# Name of an existing Secret (created by External Secrets, Sealed Secrets or CI).
# The chart never contains secret values.
existingSecret: api-secrets

resources:
  requests: { cpu: 100m, memory: 128Mi }
  limits: { memory: 256Mi }

service:
  port: 80`,
      },
    },
    {
      title: "The Deployment template",
      code: {
        lang: "yaml",
        file: "charts/devatlas-api/templates/deployment.yaml",
        code: `apiVersion: apps/v1
kind: Deployment
metadata:
  name: {{ .Release.Name }}
  labels: {{- include "api.labels" . | nindent 4 }}
spec:
  replicas: {{ .Values.replicaCount }}
  selector:
    matchLabels: {{- include "api.selector" . | nindent 6 }}
  template:
    metadata:
      labels: {{- include "api.selector" . | nindent 8 }}
      annotations:
        # Config changes alter this hash, which changes the pod template and triggers a rollout.
        checksum/config: {{ include (print $.Template.BasePath "/configmap.yaml") . | sha256sum }}
    spec:
      securityContext:
        runAsNonRoot: true
        seccompProfile: { type: RuntimeDefault }
      containers:
        - name: api
          image: "{{ .Values.image.repository }}:{{ .Values.image.tag | default .Chart.AppVersion }}"
          ports: [{ name: http, containerPort: 8000 }]
          envFrom:
            - configMapRef: { name: {{ .Release.Name }}-config }
          env:
            - name: DATABASE_PASSWORD
              valueFrom:
                secretKeyRef: { name: {{ .Values.existingSecret }}, key: DATABASE_PASSWORD }
          resources: {{- toYaml .Values.resources | nindent 12 }}
          readinessProbe:
            httpGet: { path: /health/ready, port: http }
          livenessProbe:
            httpGet: { path: /health/live, port: http }
          securityContext:
            allowPrivilegeEscalation: false
            readOnlyRootFilesystem: true
            capabilities: { drop: ["ALL"] }`,
      },
      notes: [
        "`include ... | nindent` reuses label blocks from `_helpers.tpl` with correct indentation. The `checksum/config` annotation is the standard trick that makes config changes roll pods. The chart also has `configmap.yaml` (a `range` over `.Values.config`) and `service.yaml`.",
      ],
    },
    {
      title: "Install, upgrade, roll back",
      code: {
        lang: "bash",
        code: `helm lint charts/devatlas-api
kubectl create namespace web
kubectl -n web create secret generic api-secrets --from-literal=DATABASE_PASSWORD=from-ci
helm install api charts/devatlas-api -n web --wait

helm upgrade api charts/devatlas-api -n web --set config.LOG_LEVEL=debug --wait
kubectl -n web get rs                      # a new ReplicaSet: the checksum changed

# revision 3 ships an image with a bug found after release:
helm upgrade api charts/devatlas-api -n web --reuse-values --set image.tag=1.6.0-broken --wait
helm history api -n web
helm rollback api 2 -n web --wait`,
      },
      output: "1 chart(s) linted, 0 chart(s) failed\nNAME: api\nSTATUS: deployed\nREVISION: 1\n\nREVISION: 2\n(2 ReplicaSets: config change rolled the pods)\n\nREVISION  STATUS      CHART               APP VERSION  DESCRIPTION\n1         superseded  devatlas-api-0.3.0  1.5.0        Install complete\n2         superseded  devatlas-api-0.3.0  1.5.0        Upgrade complete\n3         deployed    devatlas-api-0.3.0  1.5.0        Upgrade complete\nRollback was a success! Happy Helming!\n# image is ghcr.io/devatlas/api:1.5.0 again",
      notes: [
        "On a real cluster, an image that never becomes ready makes `--wait` time out and marks the revision failed; with `--atomic`, Helm rolls back by itself.",
      ],
    },
  ],
  companies: [
    "**Secrets from a manager, not Git:** the common production setup is External Secrets Operator (or the CSI Secrets Store driver) syncing from AWS Secrets Manager, Azure Key Vault or HashiCorp Vault, with workload identity so pods authenticate without static credentials.",
    "**Helm for packaging, GitOps for delivery:** teams publish charts (often to an OCI registry), and Argo CD or Flux deploys them with environment-specific values stored in Git.",
    "**Third-party software via charts:** ingress controllers, cert-manager, monitoring stacks and databases are usually installed from their official Helm charts with pinned versions.",
    "**Config validation in CI:** pipelines run `helm lint`, render templates, and validate them (server-side dry run, kubeconform, policy tools) before anything reaches a cluster.",
  ],
  mistakes: [
    {
      mistake: "Committing Secret YAML to Git",
      why: "'It's base64, it's encoded'",
      wrong: "Anyone with repo access (and history forever) has the credentials",
      fix: "External secret sync, or encrypted-at-rest formats (Sealed Secrets, SOPS); rotate anything leaked",
    },
    {
      mistake: "Changing a ConfigMap and expecting pods to notice",
      why: "Files update, so env vars must too",
      wrong: "Env-var config stays stale until pods restart",
      fix: "Checksum annotation to trigger a rollout, or read config from mounted files",
    },
    {
      mistake: "Baking environment config into images",
      why: "Simple Dockerfile",
      wrong: "Different images per environment; staging can point at production",
      fix: "One image; config from values, ConfigMaps and Secrets",
    },
    {
      mistake: "Copy-pasted manifests per environment",
      why: "Fastest way to make prod differ",
      wrong: "Drift and forgotten fixes",
      fix: "One chart (or Kustomize base) with per-environment values",
    },
    {
      mistake: "Unvalidated values",
      why: "Templates render anything",
      wrong: "`replicaCount: \"3\"` or a typo in LOG_LEVEL ships to production",
      fix: "`values.schema.json` plus lint and dry runs in CI",
    },
    {
      mistake: "Renaming releases or selector labels",
      why: "Tidy naming",
      wrong: "Upgrade fails: selector field is immutable",
      fix: "Keep selector labels stable; plan a delete-and-recreate if you must change them",
    },
  ],
  bestPractices: [
    {
      tag: "Security",
      text: "Secrets from a manager via workload identity, RBAC limiting `get secrets`, encryption at rest, secrets as files with tight modes, and no secrets in charts or Git.",
    },
    {
      tag: "Reliability",
      text: "Use `--atomic --wait` for upgrades, keep a bounded `--history-max`, and remember rollback does not undo schema migrations.",
    },
    {
      tag: "Maintainability",
      text: "One chart, per-environment values files, a values schema, helpers for labels, and pinned chart versions for dependencies.",
    },
    {
      tag: "Performance",
      text: "Avoid huge ConfigMaps (1 MiB limit per object) and re-reading files on every request; cache with a short re-check interval.",
    },
    {
      tag: "Cost",
      text: "Share one chart across services where they truly are alike; maintaining many near-identical charts costs engineering time.",
    },
  ],
  interview: [
    {
      q: "Are Kubernetes Secrets secure?",
      a: "Only with the surrounding controls. Values are base64-encoded, not encrypted, so the protection comes from RBAC on Secret access, namespace isolation (anyone who can create pods in a namespace can mount its secrets), encryption at rest in etcd (ideally via KMS), audit logging, and keeping values out of Git by syncing from a secret manager. Mount them as files and rotate them.",
    },
    {
      q: "How do you roll out a configuration change safely?",
      a: "Treat config like code: change values in Git, render and validate in CI, and deploy through the pipeline. Make the change trigger a rolling update (a checksum annotation of the ConfigMap in the pod template, or a versioned ConfigMap name), so readiness probes gate it and rollback is possible. Mounted files can be hot-reloaded if the app supports it.",
    },
    {
      q: "What does Helm give you over plain YAML?",
      a: "Packaging and lifecycle: templated manifests with values per environment, dependency management, versioned releases with history, upgrade and rollback commands, atomic upgrades, hooks, schema validation, and distribution through chart repositories or OCI registries. Kustomize is the template-free alternative for patching YAML; many teams use Helm for third-party software and either tool for their own services.",
    },
  ],
  quickCheck: [
    {
      kind: "mcq",
      prompt: "You change `LOG_LEVEL` in a ConfigMap consumed via `envFrom`. What happens to running pods?",
      options: [
        "They pick it up within a minute",
        "Nothing until the pods are recreated",
        "Kubernetes restarts them automatically",
        "The ConfigMap update is rejected",
      ],
      answer: 1,
      explanation: "Environment variables are set when the container starts. Mounted files update; env vars do not. Trigger a rollout (checksum annotation or `kubectl rollout restart`).",
    },
    {
      kind: "output",
      prompt: "What does this print?",
      code: {
        lang: "python",
        code: `import base64
stored = "czNjcjN0LWZyb20tY2k="
print(base64.b64decode(stored).decode())`,
      },
      options: ["czNjcjN0LWZyb20tY2k=", "s3cr3t-from-ci", "an error: it is encrypted", "DATABASE_PASSWORD"],
      answer: 1,
      explanation: "Kubernetes Secret data is base64-encoded, which anyone can decode. Protection comes from RBAC and encryption at rest, not from the encoding.",
    },
    {
      kind: "bug",
      prompt: "`helm lint` fails on this values override. Which schema rule catches it?",
      code: {
        lang: "yaml",
        code: `replicaCount: 0
config:
  LOG_LEVEL: loud`,
      },
      options: [
        "None: Helm does not validate values",
        "minimum: 1 on replicaCount and the enum on LOG_LEVEL",
        "Only the enum",
        "Only YAML syntax",
      ],
      answer: 1,
      explanation: "Real output: `replicaCount: Must be greater than or equal to 1` and `config.LOG_LEVEL must be one of the following: \"debug\", \"info\", \"warning\", \"error\"`.",
    },
  ],
  cheatSheet: [
    "One image; config via ConfigMaps, Secrets and Helm values.",
    "Env vars are read once; mounted files update (not with subPath).",
    "Checksum annotation in the pod template = config changes roll pods.",
    "Secrets = base64 + RBAC + encryption at rest. Never in Git.",
    "Sync from a secret manager: External Secrets Operator / CSI driver; or Sealed Secrets / SOPS.",
    "Helm: `lint` · `template` · `install` · `upgrade --atomic --wait` · `history` · `rollback`.",
    "values-dev.yaml / values-prod.yaml; `values.schema.json` validates.",
    "Selector labels are immutable: keep them stable.",
  ],
  homework: {
    basic: {
      title: "Make config changes roll out",
      brief: [
        "Install the chart, change one config value with `helm upgrade --set`, and prove the pods rolled (new ReplicaSet, new checksum). Then explain what would happen without the checksum annotation.",
      ],
      criteria: [
        "Checksum differs between revisions",
        "New ReplicaSet created",
        "Clear explanation of the failure mode without it",
      ],
      hints: ["`kubectl get deploy api -o jsonpath='{.spec.template.metadata.annotations}'`"],
      solution: {
        text: [
          "Without the annotation the ConfigMap changes but the pod template does not, so Kubernetes sees nothing to roll: pods keep the old env vars until some unrelated restart, which is how 'the setting changed itself on Tuesday' mysteries happen.",
        ],
        code: {
          lang: "bash",
          file: "check_rollout.sh",
          code: `kubectl -n web get deploy api -o jsonpath='{.spec.template.metadata.annotations.checksum/config}'; echo
helm upgrade api charts/devatlas-api -n web --set config.LOG_LEVEL=debug --wait
kubectl -n web get deploy api -o jsonpath='{.spec.template.metadata.annotations.checksum/config}'; echo
kubectl -n web get rs --no-headers | wc -l`,
        },
        output: "f5ba5766d6c5cff59d7161450c3aecea7d80d8af627...\ne4415146968c0a2a751898d615fee5...\n2",
      },
    },
    intermediate: {
      title: "Values per environment, validated",
      brief: [
        "Add `values-dev.yaml` and `values-prod.yaml` and a `values.schema.json` that requires a secret name, limits replicas to 1-50 and restricts LOG_LEVEL. Show the rendered differences and a lint failure for bad values.",
      ],
      criteria: [
        "Dev and prod differ only through values files",
        "Schema rejects invalid input with clear messages",
        "Rendered output checked",
      ],
      hints: ["`helm template api chart -f values-prod.yaml | grep replicas`"],
      solution: {
        text: [
          "The schema turns runtime surprises into lint errors in CI. Keep values files small: only what differs from the defaults. Here `values-dev.yaml` sets `replicaCount: 1`, `image.tag: main-3f2a1c9` and `config` with `APP_ENV: development` and `LOG_LEVEL: debug`; `values-prod.yaml` sets `replicaCount: 5` and larger `resources`.",
        ],
        code: {
          lang: "json",
          file: "charts/devatlas-api/values.schema.json",
          code: `{
  "$schema": "https://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": ["replicaCount", "image", "existingSecret"],
  "properties": {
    "replicaCount": { "type": "integer", "minimum": 1, "maximum": 50 },
    "image": {
      "type": "object",
      "required": ["repository"],
      "properties": {
        "repository": { "type": "string", "pattern": "^[a-z0-9./-]+$" },
        "tag": { "type": "string" }
      }
    },
    "config": {
      "type": "object",
      "properties": { "LOG_LEVEL": { "enum": ["debug", "info", "warning", "error"] } }
    },
    "existingSecret": { "type": "string", "minLength": 1 }
  }
}`,
        },
        output: "$ helm lint charts/devatlas-api --set replicaCount=0 --set config.LOG_LEVEL=loud\n[ERROR] values.yaml: - replicaCount: Must be greater than or equal to 1\n- config.LOG_LEVEL: config.LOG_LEVEL must be one of the following: \"debug\", \"info\", \"warning\", \"error\"\n\n== dev:  replicas: 1  image: \"ghcr.io/devatlas/api:main-3f2a1c9\"\n== prod: replicas: 5  image: \"ghcr.io/devatlas/api:1.5.0\"",
      },
    },
    challenge: {
      title: "Rotate secrets without restarts",
      brief: [
        "Write a small reader for a mounted secret file that re-checks the file at most every N seconds and picks up a rotated value without restarting the app. Test it with a fake clock. Describe how the value gets into the file in production.",
      ],
      criteria: [
        "No re-read on every call",
        "Rotation picked up after the interval",
        "Deterministic test with an injected clock",
      ],
      hints: ["Compare the file's modification time (`st_mtime_ns`)."],
      solution: {
        text: [
          "In production: the secret manager rotates the value → External Secrets Operator updates the Kubernetes Secret on its refresh interval → the kubelet updates the mounted file → this reader notices within N seconds. For databases, rotate with two valid credentials during the overlap so in-flight connections keep working.",
        ],
        code: {
          lang: "python",
          file: "secret_file.py",
          code: `"""Read a secret from a mounted file and pick up rotations without restarting.
Kubernetes updates mounted Secret files in place (env vars never change after start)."""
import os
import time


class SecretFile:
    def __init__(self, path: str, check_every_s: float = 30.0, clock=time.monotonic):
        self.path, self.every, self.clock = path, check_every_s, clock
        self._value, self._mtime, self._checked = None, None, float("-inf")

    def get(self) -> str:
        now = self.clock()
        if now - self._checked >= self.every:          # stat() at most every N seconds
            self._checked = now
            mtime = os.stat(self.path).st_mtime_ns
            if mtime != self._mtime:
                with open(self.path) as f:
                    self._value = f.read().strip()
                self._mtime = mtime
        return self._value

# ---- test_secret_file.py ----
import os

from secret_file import SecretFile


def test_picks_up_rotation_after_interval(tmp_path):
    path = tmp_path / "DATABASE_PASSWORD"
    path.write_text("old-password\\n")
    now = [0.0]
    secret = SecretFile(str(path), check_every_s=30, clock=lambda: now[0])
    assert secret.get() == "old-password"

    path.write_text("new-password\\n")
    os.utime(path, ns=(1, 2_000_000_000))      # make sure mtime changes on fast filesystems
    now[0] = 10
    assert secret.get() == "old-password"      # not re-checked yet: no stat storm
    now[0] = 31
    assert secret.get() == "new-password"      # rotation picked up, no restart`,
        },
        output: "1 passed",
      },
    },
    capstone: {
      title: "DevAtlas: deploy the chart from CI",
      brief: [
        "Add a deploy workflow that logs in to the cluster with OIDC, lints the chart, validates the rendered manifests against the cluster API with a server-side dry run, and runs `helm upgrade --install --atomic` with the commit SHA as the image tag.",
      ],
      criteria: [
        "No stored cluster credentials",
        "Lint and server-side validation before deploy",
        "Automatic rollback on failure",
        "actionlint clean",
      ],
      hints: ["`azure/login` with client-id/tenant-id/subscription-id uses federated credentials (OIDC)."],
      solution: {
        text: [
          "Pass the SHA through `${GITHUB_SHA}` in the shell rather than `${{ }}` interpolation: it is safe here, but the habit prevents injection elsewhere. Validated with actionlint; requires an AKS cluster and federated credentials to run.",
        ],
        code: {
          lang: "yaml",
          file: ".github/workflows/deploy.yml",
          code: `name: deploy

on:
  push:
    branches: [main]

permissions:
  contents: read
  id-token: write

jobs:
  deploy:
    runs-on: ubuntu-latest
    environment: production
    steps:
      - uses: actions/checkout@v4
      - uses: azure/setup-helm@v4
        with:
          version: v3.18.4
      - uses: azure/login@v2                   # OIDC (workload identity federation) to Azure
        with:
          client-id: \${{ vars.AZURE_CLIENT_ID }}
          tenant-id: \${{ vars.AZURE_TENANT_ID }}
          subscription-id: \${{ vars.AZURE_SUBSCRIPTION_ID }}
      - run: az aks get-credentials --resource-group devatlas-rg --name devatlas-aks
      - run: helm lint charts/devatlas-api -f charts/values-prod.yaml
      - name: Validate rendered manifests against the cluster API
        run: |
          helm template api charts/devatlas-api -f charts/values-prod.yaml \\
            --set image.tag="\${GITHUB_SHA}" \\
            | kubectl apply --dry-run=server -n devatlas -f -
      - name: Deploy (rolls back automatically if pods never become ready)
        run: |
          helm upgrade --install api charts/devatlas-api -n devatlas \\
            -f charts/values-prod.yaml --set image.tag="\${GITHUB_SHA}" \\
            --atomic --wait --timeout 5m --history-max 10`,
        },
        output: "$ actionlint\n(no output: no problems found)",
      },
    },
  },
  deeper: [
    {
      label: "Kubernetes docs: Secrets (good practices)",
      url: "https://kubernetes.io/docs/concepts/security/secrets-good-practices/",
    },
    {
      label: "Kubernetes docs: ConfigMaps",
      url: "https://kubernetes.io/docs/concepts/configuration/configmap/",
    },
    { label: "Helm docs: Chart template guide", url: "https://helm.sh/docs/chart_template_guide/" },
    { label: "External Secrets Operator", url: "https://external-secrets.io/latest/" },
  ],
  nextPreview: "Next: logs, metrics and traces with OpenTelemetry, and DevSecOps: scanning images and dependencies before attackers do.",
};
