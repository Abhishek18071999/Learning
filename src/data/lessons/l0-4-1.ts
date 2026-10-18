import type { Lesson } from "../../types";

export const lesson: Lesson = {
  id: "0.4.1",
  title: "VS Code, package managers and Docker Desktop",
  minutes: 55,
  level: "Beginner",
  prerequisites: ["0.2.1 The terminal", "0.3.1 Git"],
  summary: "Set up a professional, reproducible development environment on Windows, macOS or Linux, and understand version managers, lock files and dev containers.",
  terms: [
    { term: "Package manager (OS)", def: "Installs programs on your computer: winget (Windows), Homebrew (macOS), apt (Ubuntu)." },
    { term: "Package manager (language)", def: "Installs libraries for a project: npm for JavaScript, pip/uv for Python, NuGet for .NET, cargo for Rust." },
    { term: "Lock file", def: "Records the exact versions of every dependency installed (package-lock.json, poetry.lock, Cargo.lock) so every machine gets the same ones." },
    { term: "Version manager", def: "Lets you install and switch between versions of a runtime per project, e.g. nvm or fnm for Node, pyenv for Python." },
    { term: "WSL 2", def: "Windows Subsystem for Linux: a real Linux kernel running alongside Windows, the recommended way to do backend and DevOps work on Windows." },
    { term: "Dev container", def: "A Docker-based development environment described in `.devcontainer/devcontainer.json`, so everyone develops inside the same container." },
    { term: "PATH", def: "The list of folders your shell searches for commands. 'command not found' usually means the program is not on PATH." },
  ],
  problem: [
    "A new engineer joins and spends three days getting the project to run: the wrong Node version, a Python library compiled for a different OS, a missing environment variable, and a database version that differs from production.",
    "Every hour spent fighting the environment is an hour not shipping. Good teams make setup take minutes: pinned runtime versions, lock files, a single setup script, and often a container that already has everything.",
  ],
  concept: {
    analogy: [
      "Your machine is a kitchen. An OS package manager stocks the appliances (Git, Docker, Node). A language package manager stocks the ingredients for one recipe (libraries). A lock file is the exact shopping list with brands and sizes, so the dish tastes the same in every kitchen. A dev container is a food truck: the whole kitchen comes pre-built, identical for every cook.",
    ],
    precise: [
      "Separate three layers: **tools** (Git, Docker, VS Code; installed per machine), **runtimes** (Node 22, Python 3.12, .NET 8; pinned per project with a version file), and **dependencies** (libraries; pinned per project with a lock file).",
      "**Semantic versioning** (MAJOR.MINOR.PATCH): `^1.4.2` in package.json allows 1.x updates; the lock file freezes the exact resolved versions. You commit lock files for applications so CI and production install exactly what you tested.",
      "**Dev containers** move the toolchain into a Docker image. VS Code (with the Dev Containers extension) or GitHub Codespaces opens the folder inside that container, so the editor runs your code in an identical Linux environment on any host OS.",
    ],
  },
  underTheHood: {
    text: [
      "When you type `node`, the shell searches each folder in `PATH` in order and runs the first match. Version managers work by putting a shim folder first in PATH that redirects to the version your project asks for (e.g. from `.nvmrc`).",
      "`npm install` reads package.json, resolves version ranges, writes package-lock.json and fills node_modules. `npm ci` instead installs **exactly** what the lock file says and fails if package.json and the lock disagree: this is what CI should use.",
      "Python virtual environments are folders containing a Python interpreter link and a site-packages directory; `activate` just puts that folder first on PATH.",
    ],
    diagram: {
      title: "Three layers of a reproducible setup",
      nodes: [
        { label: "OS tools", sub: "winget / brew / apt" },
        { label: "Runtimes", sub: ".nvmrc · .python-version" },
        { label: "Dependencies", sub: "lock files" },
        { label: "Config", sub: ".env.example" },
        { label: "Dev container", sub: "all of the above, in Docker" },
      ],
      edges: ["", "", "", "optional"],
    },
  },
  handsOn: [
    {
      title: "Install the core tools",
      code: {
        lang: "bash",
        code: `# Windows (PowerShell as admin): use WSL 2 for the Linux side
wsl --install
winget install Git.Git Microsoft.VisualStudioCode Docker.DockerDesktop

# macOS (after installing Homebrew from https://brew.sh)
brew install git
brew install --cask visual-studio-code docker

# Ubuntu / WSL
sudo apt update && sudo apt install -y git curl build-essential
# Docker Engine: follow https://docs.docker.com/engine/install/ubuntu/`,
      },
      notes: ["Package IDs and install steps change occasionally; if a command fails, check the tool's official install page. On Windows, keep your code inside the WSL filesystem (e.g. ~/code) for much faster file access from Linux tools."],
    },
    {
      title: "Pin runtimes per project",
      code: {
        lang: "bash",
        code: `# Node via nvm (https://github.com/nvm-sh/nvm)
nvm install 22 && nvm use 22
echo "22" > .nvmrc                 # teammates run: nvm use

# Python via pyenv (https://github.com/pyenv/pyenv) or the system Python
pyenv install 3.12 && pyenv local 3.12   # writes .python-version

# .NET: global.json pins the SDK
dotnet new globaljson --sdk-version 8.0.100 --roll-forward latestFeature`,
      },
      notes: ["Use whatever exact versions your project targets; these are examples. `--roll-forward latestFeature` allows newer 8.0.x feature bands."],
    },
    {
      title: "Lock files in action",
      code: {
        lang: "bash",
        code: `mkdir lock-demo && cd lock-demo && npm init -y
npm install express@4            # writes package.json AND package-lock.json
grep '"express"' -A2 package-lock.json | head -3
rm -rf node_modules && npm ci    # exact reinstall from the lock file`,
      },
    },
    {
      title: "VS Code essentials",
      code: {
        lang: "text",
        code: `Ctrl/Cmd + P          open file by name
Ctrl/Cmd + Shift + P  command palette (everything else)
Ctrl/Cmd + \`          integrated terminal
F12 / Shift + F12     go to definition / find references
F2                    rename symbol everywhere
F5                    start debugging

Recommended extensions: Python, Pylance, ESLint, Prettier, C# Dev Kit,
rust-analyzer, Docker, Dev Containers, GitLens, EditorConfig`,
      },
    },
    {
      title: "Share editor settings with the team",
      code: {
        lang: "text",
        file: ".editorconfig",
        code: `root = true

[*]
charset = utf-8
end_of_line = lf
indent_style = space
indent_size = 2
insert_final_newline = true
trim_trailing_whitespace = true

[*.{py,cs}]
indent_size = 4`,
      },
    },
    {
      title: "A dev container for DevAtlas",
      code: {
        lang: "text",
        file: ".devcontainer/devcontainer.json",
        code: `{
  "name": "devatlas",
  "image": "mcr.microsoft.com/devcontainers/base:ubuntu",
  "features": {
    "ghcr.io/devcontainers/features/node:1": { "version": "22" },
    "ghcr.io/devcontainers/features/python:1": { "version": "3.12" },
    "ghcr.io/devcontainers/features/dotnet:2": { "version": "8.0" },
    "ghcr.io/devcontainers/features/docker-in-docker:2": {}
  },
  "postCreateCommand": "./scripts/setup.sh",
  "customizations": {
    "vscode": { "extensions": ["ms-python.python", "dbaeumer.vscode-eslint", "ms-dotnettools.csdevkit"] }
  }
}`,
      },
      notes: ["Open the folder in VS Code and choose 'Reopen in Container'. Feature names and versions are maintained at containers.dev; check there if one fails to resolve."],
    },
  ],
  companies: [
    "**'Time to first commit'** is an onboarding metric at many companies. A one-command setup (script or dev container) turns days into under an hour.",
    "**Cloud development environments** such as GitHub Codespaces or similar internal platforms give each engineer a pre-built container per branch, so laptops just run the editor.",
    "**CI uses the same pins**: `.nvmrc`, `global.json` and lock files are read by CI setup actions, so tests run on the same versions developers use.",
  ],
  mistakes: [
    { mistake: "Not committing lock files", why: "They look auto-generated and noisy", wrong: "CI and teammates get different library versions; 'works on my machine'", fix: "Commit lock files for applications; use npm ci / pip install -r with pinned versions in CI" },
    { mistake: "Installing language packages globally", why: "Quick to try something", wrong: "Projects conflict; upgrades break unrelated projects", fix: "Per-project node_modules, venvs and tool manifests" },
    { mistake: "Working in the Windows filesystem from WSL", why: "Files are on the C: drive already", wrong: "Builds and git are very slow across the boundary", fix: "Keep repos in the Linux home directory (~/code) and open them with VS Code's WSL extension" },
    { mistake: "Committing .env files", why: "Convenient to share config", wrong: "Secrets leak into Git history", fix: "Commit .env.example with fake values; real values come from each developer or a secret manager" },
    { mistake: "Ignoring runtime versions", why: "Whatever is installed seems fine", wrong: "Code using new syntax fails in CI or production", fix: "Pin with .nvmrc, .python-version, global.json, rust-toolchain.toml" },
  ],
  bestPractices: [
    { tag: "Maintainability", text: "One command to set up (scripts/setup.sh or a dev container), documented at the top of the README." },
    { tag: "Reliability", text: "Pin runtimes and lock dependencies; CI uses the same pins." },
    { tag: "Security", text: "Install tools from official sources; keep .env out of Git; review new dependencies before adding them." },
    { tag: "Performance", text: "On Windows, develop inside WSL 2; give Docker Desktop enough memory but not all of it." },
  ],
  interview: [
    { q: "Why commit a lock file?", a: "Version ranges in the manifest can resolve to different versions over time. The lock file records the exact versions resolved, so every developer, CI run and deployment installs the same tree. That makes builds reproducible and avoids surprise breakage from upstream releases." },
    { q: "npm install vs npm ci?", a: "npm install resolves ranges and may update the lock file. npm ci deletes node_modules and installs exactly what the lock file says, failing if it does not match package.json. Use ci in automation." },
    { q: "How would you make onboarding fast for a multi-language repo?", a: "Pin runtime versions with version files, commit lock files, provide .env.example, add a setup script that checks prerequisites and installs dependencies, and offer a dev container so the whole toolchain is one click." },
  ],
  quickCheck: [
    {
      kind: "mcq",
      prompt: "Which file guarantees that `npm ci` installs exactly the same dependency versions everywhere?",
      options: ["package.json", "package-lock.json", ".nvmrc", "node_modules/.bin"],
      answer: 1,
      explanation: "package.json has ranges; the lock file has exact resolved versions.",
    },
    {
      kind: "bug",
      prompt: "`node -v` prints v16 even though you ran `nvm install 22` yesterday. Most likely cause?",
      options: ["Node 22 does not exist", "This shell is using a different Node earlier in PATH; run nvm use (or set a default)", "npm is broken", "You need to reinstall Git"],
      answer: 1,
      explanation: "Version managers work through PATH. Run `nvm use 22` or `nvm alias default 22`.",
    },
    {
      kind: "mcq",
      prompt: "What should go in the repository to document required configuration without leaking secrets?",
      options: [".env", ".env.example with placeholder values", "A screenshot of your terminal", "Nothing"],
      answer: 1,
      explanation: "An example file lists every variable with fake values; real values stay out of Git.",
    },
  ],
  cheatSheet: [
    "Tools per machine; runtimes per project (.nvmrc, .python-version, global.json); deps per project (lock files).",
    "Commit lock files for apps; use `npm ci` in CI.",
    "Windows: WSL 2, code in ~/code inside Linux.",
    "`.env.example` in Git, `.env` never.",
    "`.editorconfig` for shared formatting basics.",
    "Dev container = whole toolchain in Docker, one click.",
    "'command not found' → check PATH and which version manager is active.",
  ],
  homework: {
    basic: {
      title: "Set up your machine",
      brief: ["Install Git, VS Code, Docker, Node 22 (via a version manager), Python 3.12 and the .NET 8 SDK. Record the output of each `--version` command."],
      criteria: ["All six tools report versions", "Node installed via nvm/fnm (or Volta), not a global installer", "Docker can run `docker run hello-world`"],
      hints: ["On Windows, do Node/Python inside WSL."],
      solution: {
        text: ["Expected: git --version, code --version, docker --version, node -v (v22.x), python3 --version (3.12.x), dotnet --version (8.0.x). `docker run hello-world` should print 'Hello from Docker!'. If Docker fails on Linux with a permission error, add your user to the docker group (`sudo usermod -aG docker $USER`, then log out and in) and understand that this group is effectively root-equivalent."],
      },
    },
    intermediate: {
      title: "Reproducibility test",
      brief: ["Create a small Node project with two dependencies. Commit it with its lock file. Clone it into a new folder and run `npm ci`. Then deliberately change package.json without updating the lock file and observe what `npm ci` does."],
      criteria: ["Clean clone installs identically", "You captured and explained the npm ci error"],
      hints: ["Change a dependency's version range in package.json by hand."],
      solution: {
        text: ["npm ci refuses to install when package.json and package-lock.json are out of sync, with an error explaining that they do not match. That failure is a feature: it stops CI from silently installing something nobody tested. Fix it by running npm install locally and committing the updated lock file."],
      },
    },
    challenge: {
      title: "Dev container from scratch",
      brief: ["Write a devcontainer.json for a repo that needs Node 22 and Python 3.12, installs dependencies on creation and forwards port 5173. Open it in VS Code (or Codespaces) and run the app inside."],
      criteria: ["Container builds and opens", "postCreateCommand installs deps", "Port forwarded and reachable"],
      hints: ["`\"forwardPorts\": [5173]`"],
      solution: {
        text: ["Start from a base image plus the node and python features (as in the hands-on), add `\"forwardPorts\": [5173]` and `\"postCreateCommand\": \"npm ci && pip install -r requirements.txt\"`. Run `npm run dev -- --host` inside so the server listens on all interfaces in the container."],
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
  "postCreateCommand": "npm ci && pip install -r requirements.txt"
}`,
        },
      },
    },
    capstone: {
      title: "DevAtlas: pinned and containerised dev setup",
      brief: ["Add .nvmrc, .python-version, global.json, .editorconfig, .env.example and a .devcontainer to DevAtlas. Update the README with a 'Setup in 5 minutes' section."],
      criteria: ["All version files committed", "Dev container opens and runs setup.sh", "README setup section tested on a clean clone"],
      hints: ["Ask a friend to follow your README; watch where they get stuck."],
      solution: {
        text: ["The test of success is a clean clone on another machine: if a friend can run the project in under 15 minutes following only the README, your setup is good."],
      },
    },
  },
  deeper: [
    { label: "VS Code docs", url: "https://code.visualstudio.com/docs" },
    { label: "Dev Containers specification", url: "https://containers.dev/" },
    { label: "npm docs: npm ci", url: "https://docs.npmjs.com/cli/commands/npm-ci" },
    { label: "Microsoft: Set up a WSL development environment", url: "https://learn.microsoft.com/en-us/windows/wsl/setup/environment" },
  ],
  nextPreview: "Next: Python essentials. Variables as references, mutability traps, functions and type hints: the foundation for the AI service you will build.",
};
