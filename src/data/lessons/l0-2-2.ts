import type { Lesson } from "../../types";

export const lesson: Lesson = {
  id: "0.2.2",
  title: "Shell scripting and SSH",
  minutes: 60,
  level: "Beginner",
  prerequisites: ["0.2.1 The terminal"],
  summary: "Turn repeated commands into safe, reusable bash scripts, and connect to remote servers securely with SSH keys and a tidy SSH config.",
  terms: [
    { term: "Shebang", def: "The first line `#!/usr/bin/env bash` that tells the OS which interpreter runs the script." },
    { term: "Exit code", def: "A number a command returns: 0 means success, anything else means failure. Read it with `$?`." },
    { term: "Environment variable", def: "A named value passed to processes, e.g. `PATH` or `DATABASE_URL`. Set with `export NAME=value`." },
    { term: "SSH", def: "Secure Shell: an encrypted protocol to log in to and run commands on remote machines." },
    { term: "Key pair", def: "A private key (keep secret, on your machine) and a public key (safe to share, placed on servers)." },
    { term: "known_hosts", def: "A file where SSH remembers each server's identity, so it can warn you if a server suddenly changes (possible attack)." },
    { term: "cron", def: "The Unix scheduler that runs commands on a timetable, e.g. every night at 02:00." },
  ],
  problem: [
    "Every Friday someone on your team backs up the database by typing six commands from a wiki page. One Friday they skip a step, the backup is empty, and nobody notices until the day it is needed.",
    "On another team, the production server is accessed with a shared password that four ex-employees still know. Scripts and SSH keys fix both: a reviewed script does the same thing every time and fails loudly, and keys give each person access you can revoke individually.",
  ],
  concept: {
    analogy: [
      "A shell script is a **recipe card**: instead of remembering steps, you follow the card exactly. `set -euo pipefail` is a strict chef who stops cooking the moment something burns instead of serving a ruined dish.",
      "An SSH key pair is a **padlock and its key**. You give the padlock (public key) to every server you need; only your key (private key) opens them. Losing access for one person means removing their padlock, not changing everyone's locks.",
    ],
    precise: [
      "Bash runs commands line by line. By default it **continues after errors**, treats unset variables as empty strings, and reports a pipeline's success based only on the last command. `set -e` (exit on error), `set -u` (error on unset variables) and `set -o pipefail` (a pipeline fails if any stage fails) turn those silent failures into stops.",
      "Variables must be **quoted** (`\"$file\"`) or bash splits them on spaces and expands wildcards. Functions, `if`, `for`, `case` and `$(command)` cover almost every script you will need.",
      "SSH uses public-key cryptography: the server stores your public key in `~/.ssh/authorized_keys`; at login it sends a challenge only your private key can answer. Your private key never leaves your machine. Ed25519 keys are the modern default.",
    ],
  },
  underTheHood: {
    text: [
      "When you run `./deploy.sh`, the kernel reads the shebang and starts `bash deploy.sh`. The script runs in a **child process**: `cd` or `export` inside it do not affect your terminal. That is why you `source` files (like `.env` loaders) instead of executing them when you want their variables in your current shell.",
      "Exit codes chain logic: `cmd1 && cmd2` runs cmd2 only if cmd1 succeeded; `cmd1 || cmd2` runs cmd2 only if cmd1 failed. `trap cleanup EXIT` runs a function however the script ends, which is how scripts remove temp files reliably.",
      "On first connection SSH shows the server's fingerprint and stores it in `known_hosts`. If the fingerprint later changes, SSH refuses with a loud warning: either the server was rebuilt or someone is intercepting the connection. Never blindly delete the entry without finding out which.",
    ],
    diagram: {
      title: "SSH key login",
      nodes: [
        { label: "You", sub: "private key ~/.ssh/id_ed25519" },
        { label: "Server", sub: "authorized_keys has public key" },
        { label: "Challenge", sub: "sign this" },
        { label: "Signature", sub: "made with private key" },
        { label: "Verified", sub: "shell opened" },
      ],
      edges: ["connect", "", "sign", "check with public key"],
    },
  },
  handsOn: [
    {
      title: "A safe script template",
      code: {
        lang: "bash",
        file: "backup.sh",
        code: `#!/usr/bin/env bash
set -euo pipefail                        # stop on errors, unset vars, failed pipes

usage() { echo "usage: $0 <source-dir> <backup-dir>" >&2; exit 2; }
[[ $# -eq 2 ]] || usage

src="$1"
dest="$2"
[[ -d "$src" ]] || { echo "error: $src is not a directory" >&2; exit 1; }
mkdir -p "$dest"

stamp=$(date +%Y%m%d-%H%M%S)
archive="$dest/backup-$stamp.tar.gz"
tmp=$(mktemp)
trap 'rm -f "$tmp"' EXIT                 # always clean up, even on failure

tar -czf "$tmp" -C "$src" .
[[ -s "$tmp" ]] || { echo "error: archive is empty" >&2; exit 1; }
mv "$tmp" "$archive"
echo "created $archive ($(du -h "$archive" | cut -f1))"

# keep only the 7 newest backups
ls -1t "$dest"/backup-*.tar.gz | tail -n +8 | xargs -r rm --`,
      },
      notes: ["`xargs -r` (GNU) skips running rm when there is nothing to delete; on macOS, install GNU findutils or drop `-r`.", "Exit code 2 for usage errors and 1 for runtime errors is a common convention."],
    },
    {
      title: "Run it and test the failure paths",
      code: {
        lang: "bash",
        code: `chmod +x backup.sh
mkdir -p ~/lab/data && echo hello > ~/lab/data/a.txt
./backup.sh ~/lab/data ~/lab/backups ; echo "exit=$?"
./backup.sh ; echo "exit=$?"                       # usage error
./backup.sh /does/not/exist ~/lab/b ; echo "exit=$?"`,
      },
      output: "created /home/you/lab/backups/backup-20261018-101500.tar.gz (4.0K)\nexit=0\nusage: ./backup.sh <source-dir> <backup-dir>\nexit=2\nerror: /does/not/exist is not a directory\nexit=1",
    },
    {
      title: "Loops, conditions and functions you will reuse",
      code: {
        lang: "bash",
        code: `# loop over files safely (handles spaces in names)
for f in ./logs/*.log; do
  [[ -e "$f" ]] || continue
  echo "$f has $(wc -l < "$f") lines"
done

# check a command exists
if ! command -v docker >/dev/null 2>&1; then
  echo "docker is required" >&2; exit 1
fi

# default values and required variables
LOG_LEVEL="\${LOG_LEVEL:-info}"                       # default if unset
: "\${DATABASE_URL:?DATABASE_URL must be set}"        # fail with message if unset

# case for sub-commands
case "\${1:-}" in
  start) echo starting ;;
  stop)  echo stopping ;;
  *)     echo "usage: $0 start|stop" >&2; exit 2 ;;
esac`,
      },
    },
    {
      title: "Create an SSH key and a config file",
      code: {
        lang: "bash",
        code: `ssh-keygen -t ed25519 -C "you@example.com"     # accept the default path, set a passphrase
cat ~/.ssh/id_ed25519.pub                        # this public part goes to servers / GitHub

# copy the public key to a server you can already log in to
ssh-copy-id -i ~/.ssh/id_ed25519.pub deploy@203.0.113.10`,
      },
      notes: ["203.0.113.10 is a documentation-only IP address; use your own server. On Windows, OpenSSH ships with Windows 10/11 or use WSL."],
    },
    {
      title: "~/.ssh/config: stop typing long commands",
      code: {
        lang: "text",
        file: "~/.ssh/config",
        code: `Host devatlas-prod
    HostName 203.0.113.10
    User deploy
    IdentityFile ~/.ssh/id_ed25519
    IdentitiesOnly yes

Host github.com
    IdentityFile ~/.ssh/id_ed25519`,
      },
      notes: ["Now `ssh devatlas-prod` connects, and `scp file devatlas-prod:/tmp/` or `ssh devatlas-prod 'df -h'` work with the short name."],
    },
    {
      title: "Schedule the backup with cron",
      code: {
        lang: "bash",
        code: `crontab -e
# minute hour day month weekday  command
0 2 * * * /home/deploy/backup.sh /srv/data /srv/backups >> /var/log/backup.log 2>&1`,
      },
      notes: ["cron runs with a minimal environment: use absolute paths and redirect output to a log, or failures disappear silently."],
    },
  ],
  companies: [
    "**Glue work is bash.** CI steps, container entrypoints, database migration wrappers and one-off operational scripts are often short bash scripts, reviewed like code. Many teams run ShellCheck in CI to catch quoting and error-handling bugs.",
    "**SSH access is managed centrally.** Larger companies avoid long-lived personal keys on servers: they use bastion hosts, short-lived SSH certificates, or cloud tools like AWS Systems Manager Session Manager and Azure Bastion that need no open SSH port at all.",
    "**When a script grows past ~100 lines** or needs real data structures, teams usually rewrite it in Python or Go. Knowing when to stop using bash is part of the skill.",
  ],
  mistakes: [
    { mistake: "Unquoted variables", why: "It works with simple test names", wrong: "Files with spaces break the script or the wrong files are deleted", fix: "Always quote: \"$var\"; run ShellCheck" },
    { mistake: "No set -euo pipefail", why: "Bash's defaults are lenient", wrong: "A failed step is ignored and later steps run on bad data (empty backups)", fix: "Start every script with set -euo pipefail and check important results" },
    { mistake: "Sharing one SSH key or password across a team", why: "Easy onboarding", wrong: "No way to revoke one person; no audit trail", fix: "One key per person (or SSO-based certificates); remove keys at offboarding" },
    { mistake: "Private key without a passphrase on a laptop", why: "Typing passphrases is annoying", wrong: "A stolen laptop means stolen server access", fix: "Use a passphrase with ssh-agent (or a hardware key) so you type it once per session" },
    { mistake: "Deleting known_hosts entries on warnings", why: "The warning blocks your work", wrong: "You might be connecting to an attacker", fix: "Confirm the server was rebuilt (ask, or check the console) before updating the entry" },
  ],
  bestPractices: [
    { tag: "Reliability", text: "Scripts: set -euo pipefail, meaningful exit codes, errors to stderr, trap for cleanup, and a dry-run flag for destructive actions." },
    { tag: "Security", text: "Ed25519 keys with passphrases, PasswordAuthentication no and PermitRootLogin no on servers." },
    { tag: "Maintainability", text: "Run ShellCheck; put scripts in the repo with a usage message; move to Python when logic grows." },
    { tag: "Security", text: "Never put secrets in scripts; read them from environment variables or a secret manager." },
  ],
  interview: [
    { q: "What does set -euo pipefail do?", a: "-e exits when a command fails, -u errors on unset variables, -o pipefail makes a pipeline fail if any command in it fails (not just the last). Together they turn silent failures into immediate stops." },
    { q: "How does SSH key authentication work?", a: "The server holds my public key in authorized_keys. During login it sends a challenge; my client signs it with the private key, and the server verifies the signature with the public key. The private key never leaves my machine, so nothing reusable crosses the network." },
    { q: "How would you give a contractor temporary server access?", a: "Their own key or, better, a short-lived certificate or cloud session tool (SSM, Azure Bastion) with an expiry, scoped to the needed hosts, logged, and removed at the end. Never a shared password or key." },
  ],
  quickCheck: [
    {
      kind: "output",
      prompt: "What prints?",
      code: { lang: "bash", code: "#!/usr/bin/env bash\nset -e\nfalse | true\necho \"reached\"" },
      options: ["Nothing, the script exits", "reached", "An error message", "false"],
      answer: 1,
      explanation: "Without pipefail, a pipeline's status is the last command's (true), so set -e does not trigger. With set -o pipefail it would exit.",
    },
    {
      kind: "bug",
      prompt: "Why does this delete the wrong files when a filename contains a space?",
      code: { lang: "bash", code: "file=\"old report.txt\"\nrm $file" },
      options: ["rm cannot delete .txt files", "Unquoted $file splits into 'old' and 'report.txt'", "Variables need curly braces", "rm needs -f"],
      answer: 1,
      explanation: "Word splitting turns it into `rm old report.txt`. Use rm \"$file\".",
    },
    {
      kind: "mcq",
      prompt: "Which file on the SERVER lists the public keys allowed to log in?",
      options: ["~/.ssh/known_hosts", "~/.ssh/config", "~/.ssh/authorized_keys", "~/.ssh/id_ed25519"],
      answer: 2,
      explanation: "authorized_keys lists allowed public keys. known_hosts (client side) remembers server identities.",
    },
  ],
  cheatSheet: [
    "Start scripts with `#!/usr/bin/env bash` and `set -euo pipefail`.",
    "Quote every variable: \"$var\". Run ShellCheck.",
    "`${VAR:-default}` default; `${VAR:?message}` required.",
    "`trap 'cleanup' EXIT` for temp files. Errors to stderr: `>&2`.",
    "`&&` run if success, `||` run if failure. Exit 0 = success.",
    "`ssh-keygen -t ed25519`; public key → authorized_keys / GitHub.",
    "`~/.ssh/config` Host aliases; never share private keys.",
    "cron: absolute paths, log output, minimal environment.",
  ],
  homework: {
    basic: {
      title: "Disk alert script",
      brief: ["Write `disk_alert.sh <threshold>` that checks every mounted filesystem and prints a line for each one above the threshold percentage. Exit 1 if any is above, 0 otherwise. Validate the argument is a number between 1 and 99."],
      criteria: ["Argument validation with usage message", "Correct exit codes", "Handles mount points with spaces"],
      hints: ["`df -P` gives stable POSIX output.", "`[[ $1 =~ ^[0-9]+$ ]]` checks for digits."],
      solution: {
        text: ["Use df -P for parseable output and awk to filter, then base the exit code on whether awk printed anything."],
        code: {
          lang: "bash",
          file: "disk_alert.sh",
          code: `#!/usr/bin/env bash
set -euo pipefail
[[ $# -eq 1 && $1 =~ ^[0-9]+$ && $1 -ge 1 && $1 -le 99 ]] || { echo "usage: $0 <1-99>" >&2; exit 2; }
threshold=$1
over=$(df -P | awk -v t="$threshold" 'NR>1 { use=$5; sub(/%/,"",use); if (use+0 > t) { $1=$2=$3=$4=$5=""; sub(/^ +/,""); print use "% " $0 } }')
if [[ -n "$over" ]]; then
  echo "$over"
  exit 1
fi
echo "all filesystems below \${threshold}%"`,
        },
        pitfalls: ["Comparing '91%' as a string", "Printing only the 6th field, which breaks for mount points with spaces"],
      },
    },
    intermediate: {
      title: "Deploy script with dry-run",
      brief: ["Write `deploy.sh [--dry-run] <host>` that copies `./dist` to `/srv/app` on the host with rsync over SSH, then restarts a service. In dry-run mode, print every command instead of running it."],
      criteria: ["Argument parsing for --dry-run", "A `run` helper that prints or executes", "Fails cleanly if dist/ is missing"],
      hints: ["Store the dry-run flag and route every action through one function."],
      solution: {
        text: ["A single run() wrapper makes dry-run trivial and consistent."],
        code: {
          lang: "bash",
          file: "deploy.sh",
          code: `#!/usr/bin/env bash
set -euo pipefail
dry=false
if [[ "\${1:-}" == "--dry-run" ]]; then dry=true; shift; fi
host="\${1:?usage: $0 [--dry-run] <host>}"
[[ -d dist ]] || { echo "error: dist/ not found, build first" >&2; exit 1; }

run() {
  if $dry; then printf '[dry-run]'; printf ' %q' "$@"; echo; else "$@"; fi
}

run rsync -az --delete dist/ "$host:/srv/app/"
run ssh "$host" 'sudo systemctl restart devatlas'
echo "deployed to $host"`,
        },
      },
    },
    challenge: {
      title: "Harden SSH on a test server",
      brief: ["On a throwaway VM (local VM, or a free-tier cloud instance you delete afterwards): create a non-root user with sudo, install your key, disable password and root login in sshd_config, and verify a password login is refused. Document every command."],
      criteria: ["Key login works for the new user", "Password and root login refused", "You kept a second session open while changing sshd (safety)"],
      hints: ["`sudo sshd -t` validates the config before restarting.", "Settings: PasswordAuthentication no, PermitRootLogin no."],
      solution: {
        text: [
          "1) `adduser deploy && usermod -aG sudo deploy`. 2) Put your public key in /home/deploy/.ssh/authorized_keys (dir 700, file 600, owned by deploy). 3) In /etc/ssh/sshd_config set `PasswordAuthentication no` and `PermitRootLogin no` (some images also have files in /etc/ssh/sshd_config.d/ that override these). 4) `sudo sshd -t` then restart the SSH service (named ssh or sshd depending on the distro). 5) In a NEW terminal, test `ssh deploy@host` works and `ssh -o PubkeyAuthentication=no deploy@host` is refused, while keeping your original session open in case you locked yourself out.",
        ],
        pitfalls: ["Closing your only session before testing", "Wrong permissions on .ssh, which makes sshd silently ignore the key"],
      },
    },
    capstone: {
      title: "DevAtlas: Makefile-style task script",
      brief: ["Add `scripts/dev.sh` with sub-commands `setup`, `test`, `lint` and `clean` using a case statement. Each sub-command calls the right tool for each part of the repo that exists so far."],
      criteria: ["Usage message for unknown commands", "set -euo pipefail", "Documented in README"],
      hints: ["Reuse setup.sh from the previous lesson for the setup sub-command."],
      solution: {
        text: ["One entry point for common tasks means new contributors never need to memorise per-service commands."],
        code: {
          lang: "bash",
          file: "scripts/dev.sh",
          code: `#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
case "\${1:-}" in
  setup) ./scripts/setup.sh ;;
  test)  (cd services/ai && python -m pytest -q) ;;
  lint)  shellcheck scripts/*.sh ;;
  clean) rm -rf dist services/ai/.pytest_cache ;;
  *)     echo "usage: $0 setup|test|lint|clean" >&2; exit 2 ;;
esac`,
        },
      },
    },
  },
  deeper: [
    { label: "Bash Reference Manual", url: "https://www.gnu.org/software/bash/manual/bash.html" },
    { label: "ShellCheck", url: "https://www.shellcheck.net/" },
    { label: "OpenSSH manual pages", url: "https://www.openssh.com/manual.html" },
    { label: "GitHub Docs: Connecting with SSH", url: "https://docs.github.com/en/authentication/connecting-to-github-with-ssh" },
  ],
  nextPreview: "Next: Git. You will understand what a commit really is, why branches are cheap, and how to resolve a merge conflict without panic.",
};
