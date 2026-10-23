import type { Lesson } from "../../types";

export const lesson: Lesson = {
  id: "0.4.1",
  title: "VS Code, package managers and Docker Desktop",
  minutes: 80,
  level: "Beginner",
  prerequisites: ["0.2.1 The terminal", "0.3.1 Git"],
  summary: "Build a reproducible development environment: pin editors and runtimes, understand package managers and lock files, isolate Python with venvs, and run the whole toolchain in Docker and dev containers.",
  terms: [
    { term: "Package manager (OS)", def: "Installs programs on your computer: winget (Windows), Homebrew (macOS), apt (Ubuntu). It manages machine-wide tools, not a project's libraries." },
    { term: "Package manager (language)", def: "Installs libraries for one project: npm/pnpm/yarn for JavaScript, pip/uv/poetry for Python, cargo for Rust, NuGet for .NET." },
    { term: "Lock file", def: "Records the exact version, download URL and integrity hash of every installed dependency (package-lock.json, pnpm-lock.yaml, poetry.lock, Cargo.lock) so every machine resolves the same tree." },
    { term: "Version manager", def: "Installs and switches runtimes per project, e.g. nvm or fnm for Node, pyenv for Python, rustup for Rust. It works by putting a shim folder first on PATH." },
    { term: "Semantic versioning", def: "MAJOR.MINOR.PATCH. MAJOR may break compatibility, MINOR adds features compatibly, PATCH fixes bugs. Ranges such as ^1.4.2 rely on this promise." },
    { term: "Direct dependency", def: "A library you named yourself in package.json, pyproject.toml or Cargo.toml. It is the part of the tree you chose." },
    { term: "Transitive dependency", def: "A library pulled in by one of your dependencies. Express depends on body-parser, which depends on qs; you ship all three even though you named only Express." },
    { term: "Virtual environment", def: "A folder holding its own interpreter link and site-packages. Activating it only changes PATH and VIRTUAL_ENV, so project libraries never mix with the system Python." },
    { term: "Docker image", def: "An immutable, layered filesystem plus metadata (entrypoint, env, ports). It is a build artifact identified by a digest, not a running program." },
    { term: "Docker container", def: "A running (or stopped) process created from an image, with its own namespaces and a thin writable layer. Deleting the container throws that layer away." },
    { term: "Docker volume", def: "Storage managed by Docker with a lifecycle separate from any container. A volume survives docker rm and is how a database keeps its data." },
    { term: "Dev container", def: "A Docker-based development environment described in .devcontainer/devcontainer.json, so every teammate's editor, runtime and extensions match." },
  ],
  problem: [
    "A new engineer joins and spends three days getting the project to run: the wrong Node version, a Python library compiled for a different OS, a missing environment variable, and a database version that differs from production. On their laptop it finally works. On CI it fails again.",
    "This is the \"works on my machine\" problem, and it is not a personality flaw: it is four different kinds of drift at once. The runtime drifted, the dependency tree drifted, the operating system drifted, and the configuration drifted. Every hour spent fighting the environment is an hour not shipping, so good teams make setup take minutes: pinned runtime versions, lock files, a single setup script, virtual environments, and often a container that already has everything.",
  ],
  concept: {
    analogy: [
      "Your machine is a kitchen. An OS package manager stocks the appliances (Git, Docker, Node). A language package manager stocks the ingredients for one recipe (libraries). A lock file is the exact shopping list with brands, sizes and lot numbers, so the dish tastes the same in every kitchen. A virtual environment is a separate pantry per recipe. A dev container is a food truck: the whole kitchen comes pre-built, identical for every cook, and it does not care what your home kitchen looks like.",
      "Docker adds one more distinction that trips people up. An **image** is the sealed recipe box with every ingredient and the equipment list; a **container** is the meal currently being cooked from it; a **volume** is the shelf that survives after the truck drives away. You can throw away the meal without losing the shelf, and you can cook many meals from one box.",
    ],
    precise: [
      "Separate four layers, because each one is pinned differently. **Tools** (Git, Docker, VS Code) are installed per machine. **Runtimes** (Node 22, Python 3.12, .NET 8) are pinned per project with a version file and a version manager. **Dependencies** (libraries) are pinned per project with a manifest plus a lock file. **Configuration** (ports, database URLs, API keys) is supplied per environment through variables, never through committed files.",
      "**Semantic versioning** gives ranges meaning. `^1.4.2` accepts any 1.x at or above 1.4.2; `~1.4.2` accepts 1.4.x; `1.4.2` accepts exactly that build. A manifest states intent; the lock file records the decision. It freezes the full graph, including **transitive dependencies** you never named, together with the tarball URL and an integrity hash. That is why an application commits its lock file: CI and production then install exactly the tree the developer tested.",
      "Each ecosystem solves isolation slightly differently. npm, pnpm and yarn keep packages under the project (node_modules or a content-addressed store). Python installs into a **virtual environment**, a folder with its own interpreter link and site-packages; `activate` merely puts that folder first on PATH. cargo installs into the project's target directory and locks the graph in Cargo.lock. The shared idea is the same: the project owns its dependency set, not the machine.",
      "**Docker** packages the OS userland, runtime and libraries into an image, then runs it as a container with its own process, network and filesystem view. On Windows and macOS, Docker Desktop runs a small Linux VM, so Linux containers share that VM's kernel; on Linux they use the host kernel directly. A **dev container** takes the final step: VS Code connects to a container, mounts the repository, installs its server and extensions there, and forwards ports back to your browser. The editor UI stays on your host; the code, terminal and debugger run in the pinned environment.",
    ],
  },
  underTheHood: {
    text: [
      "1. **PATH decides which binary runs.** When you type `node`, the shell walks every folder on `PATH` in order and runs the first match. Version managers install a tiny shim early on PATH; the shim reads `.nvmrc` or `.python-version`, picks the matching runtime and forwards the call. That is why `nvm install 22` does not change anything until `nvm use 22`, and why a VS Code window opened before a PATH change keeps the old environment: the integrated terminal inherits the environment of the process that launched the editor. `which -a node` (macOS/Linux) or `Get-Command node -All` (PowerShell) shows every candidate and the winner.",
      "2. **A package manager resolves a graph, not a list.** `npm install` reads package.json, asks the registry for each package's metadata, and applies the range rules to choose versions. It then builds a tree, hoists shared packages toward the top of node_modules to avoid duplicates, and writes the result to package-lock.json. The lock file has a `packages` map keyed by install path; each entry has an exact `version`, a `resolved` tarball URL and an `integrity` hash. On the next install npm prefers those locked versions instead of resolving fresh, so upstream releases cannot silently change your build.",
      "3. **Direct and transitive dependencies are pinned together.** You write `\"express\": \"^4.21.2\"`, but Express declares its own dependencies: body-parser, cookie, debug, and so on. body-parser declares qs, bytes and content-type. You now depend on code you never reviewed, which is why supply-chain attacks target transitive packages and why `npm ls qs` exists: it prints the chain that brought a package in. The lock file is the only file that describes the whole tree; package.json describes only your intent. pnpm and yarn v2+ do the same job with pnpm-lock.yaml and yarn.lock, adding content-addressed stores and stricter resolution.",
      "4. **`npm ci` is a different operation from `npm install`.** `npm install` may update the lock file when the manifest changed. `npm ci` deletes node_modules, installs exactly the locked versions, and exits non-zero if package.json and the lock file disagree. That failure is the feature: CI must never invent a tree nobody tested. Use `npm install` on your machine when you intentionally change dependencies, commit both files, and let CI use `npm ci`. Equivalent switches exist elsewhere: `pip install --require-hashes`, `uv sync --frozen`, `cargo build --locked`.",
      "5. **A virtual environment is a directory plus a PATH trick.** `python -m venv .venv` creates a folder containing a copy or symlink of the interpreter, a `pyvenv.cfg` pointing at the base installation, and an empty `site-packages`. Activation scripts prepend `.venv/bin` (or `.venv\\Scripts`) to PATH and set `VIRTUAL_ENV`; the interpreter itself also checks `pyvenv.cfg`, so even an unactivated absolute path such as `.venv/bin/python` uses the environment. Check with `python -c 'import sys; print(sys.prefix); print(sys.base_prefix)'`: the first is the venv, the second the base interpreter it borrows from. `pip freeze` lists every installed distribution with `==`, which is reproducible but flatter than a real dependency graph; `pyproject.toml` plus a lock file (uv.lock, poetry.lock) keeps the graph and hashes.",
      "6. **Docker is namespaces, cgroups and layers, not a tiny virtual machine per container.** An image is an ordered set of read-only layers addressed by content digest; a `RUN` instruction adds a layer, and identical inputs can reuse cached layers. A container adds a thin writable layer on top and starts one process with its own PID, network, mount and UTS namespaces, limited by cgroups. On Windows or macOS, Docker Desktop runs one Linux VM and all Linux containers share its kernel; that is why a container cannot boot a different kernel and why `uname -r` shows the VM's kernel. `docker run --rm` deletes the container and its writable layer; the image stays in the local store.",
      "7. **Volumes outlive containers.** Anything written to the container's writable layer disappears with `docker rm`. A named volume is a directory managed by Docker and mounted into the container; its lifecycle is independent, so a database can be replaced without losing its files. Bind mounts do the same with a host directory you choose. This is also why deleting a container is not a backup strategy, and why `docker compose down -v` is a destructive command: the `-v` removes named volumes.",
      "8. **A dev container moves the editor's brain, not just the terminal.** The Dev Containers extension starts the container, bind-mounts the workspace, installs VS Code Server inside it, and connects the UI to that server. Extensions listed in devcontainer.json install on the remote side; tasks.json and launch.json run commands and debuggers in the container; forwarded ports appear on localhost. Settings Sync copies your personal settings, keybindings and extensions between machines, but project settings must live in the repo (`.vscode/`, `.editorconfig`, devcontainer.json) or a teammate will not get them.",
      "9. **Secrets belong in the environment, not the repository.** An environment variable is inherited by child processes; it is convenient, but it is not encryption: any process running as you can read it, and a crash dump or verbose log can print it. A git-ignored `.env` file is a local convenience; `.env.example` documents every key with fake values. A committed secret survives in history after deletion and must be rotated, not just removed. In Docker, `ARG` and `ENV` values are baked into image layers and visible in `docker history`; pass secrets at runtime or use BuildKit secret mounts. Production should read from a secret manager or the platform's secret store.",
    ],
    diagram: {
      title: "From pinned files to a running, persistent process",
      nodes: [
        { label: "Repo", sub: ".nvmrc · manifest · lock file" },
        { label: "Resolve", sub: "exact dependency tree" },
        { label: "Image", sub: "OS + runtime + libraries" },
        { label: "Container", sub: "one running process" },
        { label: "Writable layer", sub: "lost on docker rm" },
        { label: "Volume", sub: "survives the container" },
      ],
      edges: ["npm ci / uv sync", "docker build", "docker run", "writes", "mount"],
      caption: "The lock file makes the tree reproducible; the image makes the OS and runtime reproducible; the volume separates data from both.",
    },
  },
  handsOn: [
    {
      title: "Run a container, then read the image store",
      text: [
        "Docker has a client (the `docker` command) and a daemon that does the work. `docker run` asks the daemon for an image; if it is missing, the daemon pulls it from a registry, creates a container, runs its entrypoint and streams the output back. `--rm` deletes the container when it exits, but the image remains cached.",
        "Run both commands yourself. The first output is this machine's real transcript; the second shows the images that were already local after the pull.",
      ],
      code: {
        lang: "bash",
        code: `docker run --rm hello-world
docker images`,
      },
      output: `Hello from Docker!
This message shows that your installation appears to be working correctly.

To generate this message, Docker took the following steps:
 1. The Docker client contacted the Docker daemon.
 2. The Docker daemon pulled the "hello-world" image from the Docker Hub.
    (amd64)
 3. The Docker daemon created a new container from that image which runs the
    executable that produces the output you are currently reading.
 4. The Docker daemon streamed that output to the Docker client, which sent it
    to your terminal.

To try something more ambitious, you can run an Ubuntu container with:
 $ docker run -it ubuntu bash

Share images, automate workflows, and more with a free Docker ID:
 https://hub.docker.com/

For more examples and ideas, visit:
 https://docs.docker.com/get-started/

IMAGE                    ID             DISK USAGE   CONTENT SIZE   EXTRA
debian:bookworm-slim     7ff6ba31527b        116MB         30.6MB        
hello-world:latest       11a3eb1597e8       25.9kB         9.49kB        
jeron-backend:latest     d38b63017306        870MB          194MB   U    
jeron-scheduler:latest   a98d387f74c0        870MB          194MB   U    
jeron-web:latest         42cc6078d052        343MB         86.1MB   U    
mysql:8.0                7dcddc01f13b        1.1GB          249MB        
news-service:latest      c3d93d017660       46.1MB         11.7MB        
postgres:16-alpine       721873c34ceb        420MB          117MB   U    
rust:1.99-slim           00544ccc9431       1.27GB          331MB        
`,
      notes: [
        "`hello-world` is 25.9 kB because it contains one tiny static binary; `rust:1.99-slim` is 1.27 GB because it carries a full toolchain. Image size is a design choice, not a Docker constant.",
        "The `U` column marks images currently used by a container. `docker ps -a` lists containers; `docker images` lists the boxes they were cooked from. `docker volume ls` lists the shelves that survive.",
        "Nothing you do inside `hello-world` changes your host. That isolation is namespaces plus a separate filesystem, not a full virtual machine per container.",
        "Install the core tools from official sources. Windows: `wsl --install`, then `winget install Git.Git Microsoft.VisualStudioCode Docker.DockerDesktop`. macOS after Homebrew: `brew install git` and `brew install --cask visual-studio-code docker`. Ubuntu/WSL: `sudo apt update && sudo apt install -y git curl build-essential`, then follow Docker's official Engine install page. On Windows keep repos inside the WSL filesystem (for example `~/code`) so Linux tools do not crawl across the C: drive boundary.",
      ],
    },
    {
      title: "Read a real lock file",
      text: [
        "Create a throwaway Node project and install one direct dependency. Express is intentionally a small example with a deep tree: the lock file records Express and everything Express itself pulled in.",
        "The commands below are portable across macOS, Linux and WSL. On Windows PowerShell, `npm init -y` and `npm install` work the same; use `Select-String -Context 0,7` instead of `grep -A7`.",
      ],
      code: {
        lang: "bash",
        code: `mkdir lock-demo && cd lock-demo
npm init -y
npm install express@4.21.2
grep -A7 '"node_modules/express"' package-lock.json
grep -A7 '"node_modules/body-parser"' package-lock.json`,
      },
      output: `    "node_modules/express": {
      "version": "4.21.2",
      "resolved": "https://registry.npmjs.org/express/-/express-4.21.2.tgz",
      "integrity": "sha512-28HqgMZAmih1Czt9ny7qr6ek2qddF4FclbMzwhCREB6OFfH+rXAnuNCwo1/wFvrtbgsQDb4kSbX9de9lFbrXnA==",
      "license": "MIT",
      "dependencies": {
        "accepts": "~1.3.8",
        "array-flatten": "1.1.1",

    "node_modules/body-parser": {
      "version": "1.20.3",
      "resolved": "https://registry.npmjs.org/body-parser/-/body-parser-1.20.3.tgz",
      "integrity": "sha512-7rAxByjUMqQ3/bHJy7D6OGXvx/MMc4IqBn/X0fcM1QUcAItpZrBEYhWGem+tzXH90c+G01ypMcYJBO9Y30203g==",
      "license": "MIT",
      "dependencies": {
        "bytes": "3.1.2",
        "content-type": "~1.0.5",`,
      notes: [
        "Express is your **direct** dependency. body-parser is **transitive**: it appears because Express depends on it, and you never wrote its name. The lock file still pins it exactly.",
        "`resolved` is the tarball the installer downloaded; `integrity` is a hash of its contents. If a registry mirror serves different bytes, the install fails instead of silently running different code.",
        "`lockfileVersion: 3` is the modern npm format. pnpm writes `pnpm-lock.yaml`, yarn writes `yarn.lock`, Python's uv writes `uv.lock`, and Rust writes `Cargo.lock`: same idea, different syntax.",
        "After this, run `rm -rf node_modules && npm ci`. It installs exactly these versions. Then edit package.json by hand without updating the lock and run `npm ci` again: it refuses, which is the behaviour CI depends on.",
      ],
    },
    {
      title: "Create a Python virtual environment and freeze it",
      text: [
        "Never install project libraries into the system Python. A venv gives the project its own `site-packages`, so two projects can need different versions of the same library without fighting.",
        "The interpreter and pip commands below were run in a temporary folder; activation only changes which `python` the shell finds. The interpreter reports the venv as `sys.prefix` and the base installation as `sys.base_prefix`; that difference is the isolation.",
      ],
      code: {
        lang: "bash",
        code: `python -m venv .venv

# Windows PowerShell:
.venv\\Scripts\\Activate.ps1
# macOS / Linux / WSL:
source .venv/bin/activate

python --version
python -m pip install requests==2.32.3
python -m pip freeze
python -c "import sys; print(sys.prefix); print(sys.base_prefix)"`,
      },
      output: `Python 3.11.15
certifi==2026.10.19
charset-normalizer==3.5.2
idna==3.20
requests==2.32.3
urllib3==2.8.0
C:\\Users\\cored\\AppData\\Local\\Temp\\opencode\\env-lab\\.venv
C:\\Users\\cored\\AppData\\Roaming\\uv\\python\\cpython-3.11-windows-x86_64-none`,
      notes: [
        "You asked for one package and froze five. requests depends on certifi, charset-normalizer, idna and urllib3. This is the transitive tree in its simplest form.",
        "`pip freeze` is exact (`==`) but flat: it records what is installed, not why. For applications, commit a lock produced by uv or Poetry so hashes and the graph are preserved.",
        "The base interpreter here is uv-managed CPython 3.11, and the venv borrows it. That is why `.python-version` matters: `python -m venv` copies whatever interpreter is first on PATH.",
        "On Windows, activation may be blocked by the execution policy. Use `.venv\\Scripts\\python.exe -m pip ...` directly, or set the policy for the current user after understanding the risk.",
        "Pin the interpreter per project: `nvm install 22 && nvm use 22` then `echo \"22\" > .nvmrc`; `pyenv install 3.12 && pyenv local 3.12` (writes `.python-version`); `dotnet new globaljson --sdk-version 8.0.100 --roll-forward latestFeature`. `--roll-forward latestFeature` accepts newer 8.0.x feature bands instead of forcing one build.",
      ],
    },
    {
      title: "Compare package managers across ecosystems",
      text: [
        "Every ecosystem has the same three concepts, but different file names and commands. Learn the columns, not just your first language: the questions transfer even when the syntax does not.",
      ],
      code: {
        lang: "text",
        file: "package-managers.txt",
        code: `Ecosystem   Manifest              Lock file            Install exactly        Add a dependency
----------- --------------------- -------------------- ---------------------- ----------------------------
npm         package.json          package-lock.json    npm ci                 npm install lodash
pnpm        package.json          pnpm-lock.yaml       pnpm install --frozen-lockfile   pnpm add lodash
yarn        package.json          yarn.lock            yarn install --immutable        yarn add lodash
pip         requirements.txt      (none by default)    pip install -r req.txt          pip install requests
uv          pyproject.toml        uv.lock              uv sync --frozen       uv add requests
poetry      pyproject.toml        poetry.lock          poetry install         poetry add requests
cargo       Cargo.toml            Cargo.lock           cargo build --locked   cargo add serde
apt         (sources.list)        (version pins)       apt install pkg=1.2.3  apt install pkg

Version pinning in a manifest
^1.4.2   any 1.x >= 1.4.2 (minor updates allowed)
~1.4.2   1.4.x only (patch updates allowed)
1.4.2    exactly 1.4.2
*        anything; never use for an application`,
      },
      notes: [
        "Applications commit lock files. Libraries often do not: a library must be installable alongside its consumers' choices, so it commits a range and lets the application lock the resolved tree.",
        "`pnpm` stores each package version once in a content-addressed store and links it into projects, which saves disk on machines with many repositories. `npm` hoists into node_modules; both produce a valid tree.",
        "OS package managers (apt, winget, brew) manage machine tools. They are not a substitute for per-project lock files, and a `sudo npm install -g` is not a setup strategy.",
      ],
    },
    {
      title: "See where VS Code actually runs",
      text: [
        "The editor has two halves: the UI on your host and an extension host plus terminal that can live somewhere else. Locally they are the same machine. With **WSL**, **Remote - SSH** or **Dev Containers**, VS Code installs a small server on the remote side, runs extensions there, and tunnels the UI over a socket. That is why a container can have its own Node version without touching your host.",
        "Settings Sync syncs your personal settings, keybindings and extension list across machines, but it does not replace project configuration. Commit `.vscode/settings.json`, `.vscode/tasks.json` and `.vscode/launch.json` for project behaviour; use `.editorconfig` for formatting basics that every editor honours. `tasks.json` runs build and test commands; `launch.json` tells the debugger how to start the process, set breakpoints and attach to a container.",
      ],
      code: {
        lang: "mermaid",
        file: "editor-architecture.mmd",
        code: `flowchart LR
  A[VS Code UI on host] -->|remote protocol| B[VS Code Server in container]
  B --> C[Workspace bind mount]
  B --> D[Extensions installed remotely]
  D --> E[Node 22 / Python 3.12 / .NET 8]
  E --> F[Image layers]
  F --> G[Container writable layer]
  G --> H[(Named volume)]
  C --> I[Your repository]`,
      },
      notes: [
        "The mermaid block above is source, not a screenshot: GitHub, VS Code preview and the DevAtlas lesson page render it. Change the image tag in devcontainer.json and everyone's diagram still describes the same shape.",
        "Extensions that need to see the remote filesystem (Python, ESLint, rust-analyzer) must be installed on the remote side. devcontainer.json's `customizations.vscode.extensions` does that automatically; installing them only locally is a common reason IntelliSense 'works for me'.",
        "Keep secrets out of devcontainer.json. Use `containerEnv` only for non-secret defaults, and mount secrets at runtime or inject them through your shell.",
        "Daily shortcuts worth learning: `Ctrl/Cmd + P` opens a file by name, `Ctrl/Cmd + Shift + P` opens the command palette, `F12` goes to definition, `Shift + F12` finds references, `F2` renames a symbol everywhere and `F5` starts debugging. Start with the Python, Pylance, ESLint, Prettier, C# Dev Kit, rust-analyzer, Docker, Dev Containers, GitLens and EditorConfig extensions; the project's devcontainer.json should install the ones the team needs.",
      ],
    },
  ],
  companies: [
    "**Docker (verified in this lesson):** the `hello-world` pull, the local image store and the `--rm` lifecycle above are real output from Docker Desktop on Windows. The same image digest produces the same layers on every machine, which is the reproducibility companies buy when they standardise on containers.",
    "**npm and the registry ecosystem (verified in this lesson):** the `resolved` URL and `integrity` hash in the lock file are real npm data. Registries and CI systems rely on those hashes to detect tampering or a broken mirror, and `npm ci` is the default install command in most JavaScript pipelines.",
    "**Python packaging (verified in this lesson):** the venv `sys.prefix` / `sys.base_prefix` split and the five-package freeze are real. Teams that ship Python pin the interpreter with `.python-version` and lock the graph with uv or Poetry so that a base-image update cannot change a transitive library overnight.",
    "**GitHub Codespaces, Gitpod and internal cloud dev environments (illustrative):** they extend the dev-container idea to a prebuilt container per branch, so onboarding is a browser tab and a laptop only runs the editor. Many teams measure 'time to first commit' as an onboarding metric; a one-command setup or a dev container turns days into under an hour. The trade-off is cost, network dependence and the need to keep the image build fast.",
    "**Large monorepos at scale (illustrative):** pnpm's content-addressed store and workspace protocol exist because installing the same dependency in fifty packages wastes disk and time. The lock file becomes a reviewed artifact, and a change to it is treated like a code change.",
  ],
  mistakes: [
    { mistake: "Not committing lock files", why: "They look auto-generated and noisy in review", wrong: "CI and teammates resolve different library versions; the build passes locally and fails or behaves differently elsewhere", fix: "Commit lock files for applications; use npm ci / uv sync --frozen / cargo build --locked in CI" },
    { mistake: "Running npm install in CI", why: "It is the command everyone knows", wrong: "It can update the lock file and install a tree nobody tested, hiding drift instead of failing", fix: "Use npm ci (or the frozen equivalent) so a manifest/lock mismatch is an error" },
    { mistake: "Installing language packages globally", why: "Quick to try something with sudo npm install -g or pip install", wrong: "Projects conflict, upgrades break unrelated projects, and CI cannot reproduce the machine", fix: "Per-project node_modules, venvs and tool manifests; use npx or uvx for one-off tools" },
    { mistake: "Working in the Windows filesystem from WSL", why: "Files are on the C: drive already", wrong: "Builds, git status and file watchers are very slow across the 9p boundary", fix: "Keep repos in the Linux home directory (~/code) and open them with VS Code's WSL extension" },
    { mistake: "Committing .env files or baking them into an image", why: "Convenient to share configuration and make the container 'just work'", wrong: "Secrets leak into Git history and image layers; deleting the commit does not remove them from clones or caches", fix: "Commit .env.example with fake values; inject real values at runtime from the environment or a secret manager; rotate anything that was exposed" },
    { mistake: "Ignoring runtime versions", why: "Whatever is installed seems fine on your laptop", wrong: "Code using new syntax fails in CI or production, and native modules may not even build", fix: "Pin with .nvmrc, .python-version, global.json, rust-toolchain.toml and check them in setup" },
    { mistake: "Treating containers as tiny virtual machines", why: "The isolation feels like a VM", wrong: "You expect a different kernel or persistent files inside the container, then lose data on docker rm and misdiagnose kernel features", fix: "Learn image vs container vs volume; put data in a volume or bind mount, and remember Linux containers share the host or Docker Desktop VM kernel" },
    { mistake: "Assuming Settings Sync is project configuration", why: "Your editor feels identical on every machine", wrong: "A teammate lacks the tasks, launch config, formatter rules and extensions the project needs", fix: "Commit .vscode/ settings, tasks and launch files, .editorconfig, and a devcontainer.json; keep personal preferences in Settings Sync" },
  ],
  bestPractices: [
    { tag: "Maintainability", text: "One command to set up (scripts/setup.sh or a dev container), documented at the top of the README, and tested on a clean clone." },
    { tag: "Reliability", text: "Pin runtimes with version files and lock dependencies; CI installs with npm ci / uv sync --frozen / cargo build --locked." },
    { tag: "Security", text: "Install tools from official sources; keep .env and secrets out of Git and image layers; review new dependencies, including transitive ones." },
    { tag: "Performance", text: "On Windows, develop inside WSL 2; give Docker Desktop enough memory but not all of it; keep image layers small and ordered so the cache helps." },
    { tag: "Cost", text: "Small images and cached layers cut registry storage and CI minutes; a shared pnpm store cuts disk and install time across many repositories." },
  ],
  interview: [
    { q: "A teammate says \"it works on my machine\" but CI fails. How do you diagnose it?", a: "Treat it as drift in four layers and compare them in order. First runtimes: print node -v, python --version, dotnet --list-sdks on both sides and compare with .nvmrc, .python-version and global.json. Second dependencies: confirm the lock file is committed, compare its hash, and run npm ci locally to see whether the manifest and lock actually agree. Third operating system: CPU architecture, libc, native build tools and line endings can all differ; a package with a compiled extension may have been built for the wrong platform. Fourth configuration and state: missing environment variables, a different database version, a cache or a migration that only exists locally. Then reproduce: run the failing command in the same container image CI uses, or open the repo in a dev container. The fix is not 'install the same things by hand'; it is to encode the answer in version files, a lock file, .env.example and a setup script, so the next person does not repeat the investigation." },
    { q: "Explain lock files, semantic versioning, and the difference between direct and transitive dependencies.", a: "Semantic versioning is a promise about compatibility: MAJOR may break, MINOR adds features, PATCH fixes bugs. A manifest uses that promise to state a range, such as ^1.4.2 meaning any 1.x at or above 1.4.2. The registry keeps publishing, so the same range can resolve differently next month; the lock file records the exact decision, including each package's version, tarball URL and integrity hash. Direct dependencies are the ones you named; transitive dependencies are pulled in by them, and you ship both. Express depends on body-parser, which depends on qs, so a lock file can pin dozens of packages for a one-line manifest. npm install may update the lock when the manifest changes; npm ci installs the lock exactly and fails on a mismatch, which is why CI uses it. pnpm, yarn, uv, Poetry and cargo all implement the same contract with different file names, and applications commit the lock while reusable libraries usually do not, because a library must remain compatible with its consumers' choices." },
    { q: "What is the difference between an image, a container and a volume, and where do secrets belong?", a: "An image is an immutable build artifact: ordered read-only layers plus metadata such as the entrypoint, environment and exposed ports, identified by a digest. A container is one process created from that image, with its own namespaces, cgroup limits and a thin writable layer. Deleting the container discards the writable layer but leaves the image. A volume is storage with a lifecycle independent of any container, mounted in at run time; that is where a database's files must live, because docker rm must not destroy data. On Windows and macOS, Docker Desktop runs a Linux VM and all Linux containers share its kernel, so containers are isolated processes, not separate kernels. Secrets should be injected as environment variables at run time or read from a secret manager; they must not be committed in .env, baked into an image with ARG or ENV, or copied into a layer, because image history and Git history both retain them. If a secret did leak, rotate it: removing the file is not enough." },
  ],
  quickCheck: [
    {
      kind: "mcq",
      prompt: "Which file guarantees that `npm ci` installs exactly the same dependency versions everywhere?",
      options: ["package.json", "package-lock.json", ".nvmrc", "node_modules/.bin"],
      answer: 1,
      explanation: "package.json has ranges; the lock file has exact resolved versions, URLs and integrity hashes.",
    },
    {
      kind: "bug",
      prompt: "`node -v` prints v16 even though you ran `nvm install 22` yesterday. Most likely cause?",
      options: ["Node 22 does not exist", "This shell is using a different Node earlier in PATH; run nvm use (or set a default)", "npm is broken", "You need to reinstall Git"],
      answer: 1,
      explanation: "Version managers work through PATH. Run `nvm use 22` or `nvm alias default 22`, and restart the editor so its terminal inherits the new PATH.",
    },
    {
      kind: "mcq",
      prompt: "You delete a database container with `docker rm`. What happens to its data?",
      options: ["It stays in the image", "It stays in the container's writable layer forever", "It is gone unless the data was in a named volume or bind mount", "Docker automatically moves it to a volume"],
      answer: 2,
      explanation: "The writable layer belongs to the container and is deleted with it. Volumes and bind mounts have separate lifecycles.",
    },
  ],
  cheatSheet: [
    "Tools per machine; runtimes per project (.nvmrc, .python-version, global.json); deps per project (manifest + lock file); config per environment (.env, never committed).",
    "Semver: ^1.4.2 = 1.x, ~1.4.2 = 1.4.x, 1.4.2 = exact. The manifest states intent; the lock file records the tree.",
    "Commit lock files for apps; use `npm ci` / `uv sync --frozen` / `cargo build --locked` in CI.",
    "Direct deps you named; transitive deps they pulled in. `npm ls <pkg>` explains why a package is present.",
    "`python -m venv .venv` then activate; `sys.prefix` is the venv, `sys.base_prefix` is the base interpreter.",
    "Windows: WSL 2, code in ~/code inside Linux; restart VS Code after PATH changes.",
    "Image = immutable layers; container = running process + writable layer; volume = data that outlives the container.",
    "Dev container = editor server + toolchain in Docker, one click; commit devcontainer.json and .vscode/ tasks and launch files.",
    "`.env.example` in Git, `.env` never; secrets at runtime or from a secret manager, not in ARG, ENV or image layers.",
    "'command not found' → check PATH and which version manager is active; `which -a` shows the candidates.",
  ],
  homework: {
    basic: {
      title: "Set up your machine",
      brief: ["Install Git, VS Code, Docker, Node 22 (via a version manager), Python 3.12 and the .NET 8 SDK. Record the output of each `--version` command."],
      criteria: ["All six tools report versions", "Node installed via nvm/fnm (or Volta), not a global installer", "Docker can run `docker run hello-world`"],
      hints: ["On Windows, do Node/Python inside WSL.", "Run `which -a node` to prove which copy wins on PATH."],
      solution: {
        text: [
          "Expected: git --version, code --version, docker --version, node -v (v22.x), python3 --version (3.12.x), dotnet --version (8.0.x). `docker run hello-world` should print 'Hello from Docker!'. If Docker fails on Linux with a permission error, add your user to the docker group (`sudo usermod -aG docker $USER`, then log out and in) and understand that this group is effectively root-equivalent.",
          "check_setup.sh records every version and flags what is wrong: Node not installed through nvm, fnm or Volta, the wrong Node or Python version, no .NET 8 SDK, or Docker unable to run hello-world. When Docker fails it prints the daemon's error line, such as a permission error or a registry rate limit. It checks `dotnet --list-sdks` rather than `dotnet --version`, because a newer SDK installed alongside 8.0 is fine. Keep the report: `./check_setup.sh | tee setup-report.txt`.",
        ],
        code: { lang: "bash", file: "check_setup.sh", code: `#!/usr/bin/env bash
# Record the version of every tool the course needs and flag what is missing or wrong.
# usage: ./check_setup.sh | tee setup-report.txt
set -uo pipefail          # no -e: keep checking after a failure, report everything

problems=0
ok()   { printf 'ok    %-8s %s\\n' "$1" "$2"; }
bad()  { printf 'FIX   %-8s %s\\n' "$1" "$2"; problems=$((problems + 1)); }

version_of() { "$@" 2>&1 | head -n 1; }

for tool in git code docker; do
  if command -v "$tool" >/dev/null 2>&1; then ok "$tool" "$(version_of "$tool" --version)"
  else bad "$tool" "not on PATH"; fi
done

if command -v node >/dev/null 2>&1; then
  v=$(node -v); where=$(command -v node)
  if [[ $v == v22.* ]]; then ok node "$v"; else bad node "$v (want v22.x: nvm install 22 && nvm use 22)"; fi
  case "$where" in
    */.nvm/*|*/fnm*/*|*/.volta/*) ok node "from a version manager: $where" ;;
    *) bad node "$where is not from nvm/fnm/Volta" ;;
  esac
else bad node "not on PATH (install nvm, then: nvm install 22)"; fi

if command -v python3 >/dev/null 2>&1; then
  v=$(python3 --version)
  if [[ $v == "Python 3.12."* ]]; then ok python3 "$v"; else bad python3 "$v (want 3.12.x)"; fi
else bad python3 "not on PATH"; fi

if command -v dotnet >/dev/null 2>&1; then
  sdks=$(dotnet --list-sdks 2>/dev/null)
  if grep -q '^8\\.0\\.' <<<"$sdks"; then ok dotnet "SDKs: $(cut -d' ' -f1 <<<"$sdks" | paste -sd' ' -)"
  else bad dotnet "no 8.0 SDK installed (found: \${sdks:-none})"; fi
else bad dotnet "not on PATH"; fi

if command -v docker >/dev/null 2>&1; then
  out=$(docker run --rm hello-world 2>&1)
  if grep -q "Hello from Docker!" <<<"$out"; then ok docker "hello-world ran"
  else bad docker "hello-world failed: $(grep -m1 -iE 'error|denied|cannot' <<<"$out")"; fi
fi

echo
if (( problems )); then echo "$problems item(s) to fix"; exit 1; fi
echo "all tools ready"` },
      },
    },
    intermediate: {
      title: "Reproducibility test",
      brief: ["Create a small Node project with two dependencies. Commit it with its lock file. Clone it into a new folder and run `npm ci`. Then deliberately change package.json without updating the lock file and observe what `npm ci` does."],
      criteria: ["Clean clone installs identically", "You captured and explained the npm ci error", "You can point at the direct and transitive entries in the lock file"],
      hints: ["Change a dependency's version range in package.json by hand.", "Compare `npm ls --all` output before and after the clone."],
      solution: {
        text: [
          "npm ci refuses to install when package.json and package-lock.json are out of sync, with an error explaining that they do not match. That failure is a feature: it stops CI from silently installing something nobody tested. Fix it by running npm install locally and committing the updated lock file.",
          "repro_test.sh runs the whole experiment with two small, exactly pinned dependencies: commit with the lock file, clone, npm ci, compare the dependency trees, then edit package.json by hand. The output is from npm 10.9; other npm versions word the error differently, but they always refuse.",
        ],
        code: { lang: "bash", file: "repro_test.sh", code: `#!/usr/bin/env bash
# Prove a lock file makes installs reproducible, then watch npm ci refuse a drifted package.json.
set -euo pipefail
export GIT_AUTHOR_NAME="Asha" GIT_AUTHOR_EMAIL="asha@example.com"
export GIT_COMMITTER_NAME="Asha" GIT_COMMITTER_EMAIL="asha@example.com"

rm -rf repro-lab && mkdir repro-lab && cd repro-lab
mkdir original && cd original
git init -q -b main
npm init -y >/dev/null
npm install --silent ms@2.1.3 kleur@4.1.5      # two small deps; writes package-lock.json
printf 'node_modules/\\n' > .gitignore
git add . && git commit -qm "Add project with lock file"
npm ls --all > ../original-tree.txt
cd ..

echo "== 1. clean clone + npm ci"
git clone -q original clone && cd clone
npm ci --silent
npm ls --all > ../clone-tree.txt
cd ..
# compare everything except the first line (it contains the folder path)
if diff <(tail -n +2 original-tree.txt) <(tail -n +2 clone-tree.txt); then
  echo "identical dependency tree:"; tail -n +2 clone-tree.txt | sed '/^$/d'
fi

echo "== 2. change package.json by hand, leave the lock file alone"
cd clone
sed -i.bak 's/"kleur": "\\^4.1.5"/"kleur": "^3.0.0"/' package.json && rm package.json.bak
grep '"kleur"' package.json
set +e
npm ci 2>&1 | grep -E '^npm (error|ERR!) (code|.npm ci.|Invalid|Missing)'
status=\${PIPESTATUS[0]}
set -e
echo "npm ci exit code: $status"

echo "== 3. the fix: let npm update the lock file, commit both, ci works again"
npm install --silent
git commit -qam "Downgrade kleur to 3.x"
npm ci --silent && npm ls kleur | tail -n +2` },
        output: "== 1. clean clone + npm ci\nidentical dependency tree:\n+-- kleur@4.1.5\n`-- ms@2.1.3\n== 2. change package.json by hand, leave the lock file alone\n    \"kleur\": \"^3.0.0\",\nnpm error code EUSAGE\nnpm error `npm ci` can only install packages when your package.json and package-lock.json or npm-shrinkwrap.json are in sync. Please update your lock file with `npm install` before continuing.\nnpm error Invalid: lock file's kleur@4.1.5 does not satisfy kleur@3.0.3\nnpm ci exit code: 1\n== 3. the fix: let npm update the lock file, commit both, ci works again\n`-- kleur@3.0.3",
      },
    },
    challenge: {
      title: "Dev container from scratch",
      brief: ["Write a devcontainer.json for a repo that needs Node 22 and Python 3.12, installs dependencies on creation, forwards port 5173, and installs the Python and ESLint extensions remotely. Open it in VS Code (or Codespaces) and run the app inside."],
      criteria: ["Container builds and opens", "postCreateCommand installs deps", "Port forwarded and reachable", "Extensions appear in the container's extension list"],
      hints: ["`\"forwardPorts\": [5173]`", "`\"customizations\": { \"vscode\": { \"extensions\": [...] } }` installs on the remote side."],
      solution: {
        text: ["Start from a base image plus the node and python features (as in the hands-on), add `\"forwardPorts\": [5173]` and `\"postCreateCommand\": \"npm ci && pip install -r requirements.txt\"`. Run `npm run dev -- --host` inside so the server listens on all interfaces in the container. Open the container's Extensions view and confirm Python and ESLint are marked as installed in the container, not just locally."],
        code: {
          lang: "text",
          file: ".devcontainer/devcontainer.json",
          code: `{
  "name": "web-and-ai",
  "image": "mcr.microsoft.com/devcontainers/base:ubuntu",
  "features": {
    "ghcr.io/devcontainers/features/node:1": { "version": "22" },
    "ghcr.io/devcontainers/features/python:1": { "version": "3.12" }
  },
  "forwardPorts": [5173],
  "postCreateCommand": "npm ci && pip install -r requirements.txt",
  "customizations": {
    "vscode": {
      "extensions": ["ms-python.python", "dbaeumer.vscode-eslint"]
    }
  }
}`,
        },
      },
    },
    capstone: {
      title: "DevAtlas: pinned and containerised dev setup",
      brief: ["Add .nvmrc, .python-version, global.json, .editorconfig, .env.example and a .devcontainer to DevAtlas. Update the README with a 'Setup in 5 minutes' section."],
      criteria: ["All version files committed", "Dev container opens and runs setup.sh", "README setup section tested on a clean clone", "No secret appears in any committed file or image layer"],
      hints: ["Ask a friend to follow your README; watch where they get stuck.", "Run `git grep -nE 'sk-|AKIA|API_KEY=.+'` before pushing."],
      solution: {
        text: [
          "The test of success is a clean clone on another machine: if a friend can run the project in under 15 minutes following only the README, your setup is good.",
          "check-pins.sh compares each runtime on PATH with its pin and checks that .env has every key from .env.example. For .NET it simply runs `dotnet --version` in the repo, which fails when no installed SDK satisfies global.json. The dev container runs it after setup.sh, so a wrong pin shows up on the first open.",
        ],
        code: { lang: "bash", file: "scripts/check-pins.sh", code: `#!/usr/bin/env bash
# Compare the runtimes on PATH with the versions this repo pins, and .env with .env.example.
set -uo pipefail
cd "$(dirname "$0")/.." || exit 2
fail=0
report() {  # name, pinned, found, ok?
  if [[ $4 == yes ]]; then printf 'ok    %-7s pinned %-10s found %s\\n' "$1" "$2" "$3"
  else printf 'FIX   %-7s pinned %-10s found %s\\n' "$1" "$2" "$3"; fail=1; fi
}

want=$(tr -d ' v\\n' < .nvmrc)
have=$(node -v 2>/dev/null | tr -d v) || have="missing"
[[ $have == "$want".* ]] && m=yes || m=no; report node "$want" "$have" "$m"

want=$(tr -d ' \\n' < .python-version)
have=$(python3 -c 'import platform; print(platform.python_version())' 2>/dev/null) || have="missing"
[[ $have == "$want".* ]] && m=yes || m=no; report python "$want" "$have" "$m"

# dotnet itself reads global.json: it fails if no installed SDK satisfies the pin.
want=$(grep -oE '"version": *"[^"]+"' global.json | cut -d'"' -f4)
if have=$(dotnet --version 2>/dev/null); then m=yes; else have="no SDK matching global.json"; m=no; fi
report dotnet "$want" "$have" "$m"

if [[ -f .env ]]; then
  missing=$(comm -23 <(grep -oE '^[A-Z_]+=' .env.example | sort) <(grep -oE '^[A-Z_]+=' .env | sort) | tr -d = | paste -sd' ' -)
  [[ -z $missing ]] && m=yes || m=no; report .env "all keys" "\${missing:+missing }\${missing:-all keys}" "$m"
else
  report .env "present" "missing (cp .env.example .env)" no
fi
exit "$fail"

# ---- .nvmrc ----
22

# ---- .python-version ----
3.12

# ---- global.json ----
{
  "sdk": { "version": "8.0.100", "rollForward": "latestFeature" }
}

# ---- .env.example ----
# Copy to .env (gitignored) and fill in real values. Never commit .env.
DATABASE_URL=postgresql://devatlas:devatlas@localhost:5432/devatlas
API_PORT=8000
WEB_PORT=5173
LOG_LEVEL=info
# Leave empty until Phase 7; get your own key, never share one.
ANTHROPIC_API_KEY=

# ---- .devcontainer/devcontainer.json ----
{
  "name": "devatlas",
  "image": "mcr.microsoft.com/devcontainers/base:ubuntu",
  "features": {
    "ghcr.io/devcontainers/features/node:1": { "version": "22" },
    "ghcr.io/devcontainers/features/python:1": { "version": "3.12" },
    "ghcr.io/devcontainers/features/dotnet:2": { "version": "8.0" },
    "ghcr.io/devcontainers/features/docker-in-docker:2": {}
  },
  "forwardPorts": [5173, 8000],
  "postCreateCommand": "cp -n .env.example .env; ./scripts/setup.sh && ./scripts/check-pins.sh",
  "remoteUser": "vscode",
  "customizations": {
    "vscode": {
      "extensions": ["ms-python.python", "dbaeumer.vscode-eslint", "ms-dotnettools.csdevkit", "EditorConfig.EditorConfig"]
    }
  }
}

# ---- .editorconfig (same as the hands-on section) ----
root = true

[*]
charset = utf-8
end_of_line = lf
indent_style = space
indent_size = 2
insert_final_newline = true
trim_trailing_whitespace = true

[*.{py,cs}]
indent_size = 4

# ---- README.md (section) ----
## Setup in 5 minutes

**Option A: dev container (recommended).** Install Docker and VS Code with the Dev Containers
extension, open this folder, choose "Reopen in Container". The container installs Node 22,
Python 3.12 and .NET 8, copies \`.env.example\` to \`.env\`, then runs \`scripts/setup.sh\` and
\`scripts/check-pins.sh\`.

**Option B: on your machine.**
1. \`nvm install\` (reads .nvmrc), \`pyenv install --skip-existing\` (reads .python-version),
   and a .NET 8 SDK (global.json accepts 8.0.100 or any newer 8.0 feature band).
2. \`cp .env.example .env\` and fill in values.
3. \`./scripts/setup.sh && ./scripts/check-pins.sh\`: every line should start with \`ok\`.` },
        pitfalls: ["Pinning an exact patch version (22.11.0) in .nvmrc, so everyone must install that exact build; the major version is usually enough for apps", "Leaving real secrets in .env.example", "Forgetting that .env is copied inside the container, so it must be gitignored on the host too"],
      },
    },
  },
  deeper: [
    { label: "VS Code docs", url: "https://code.visualstudio.com/docs" },
    { label: "Dev Containers specification", url: "https://containers.dev/" },
    { label: "npm docs: npm ci", url: "https://docs.npmjs.com/cli/commands/npm-ci" },
    { label: "Microsoft: Set up a WSL development environment", url: "https://learn.microsoft.com/en-us/windows/wsl/setup/environment" },
    { label: "Docker: Get started", url: "https://docs.docker.com/get-started/" },
    { label: "uv: an extremely fast Python package manager", url: "https://docs.astral.sh/uv/" },
  ],
  nextPreview: "Next: Python essentials. Variables as references, mutability traps, functions and type hints: the foundation for the AI service you will build.",
};
