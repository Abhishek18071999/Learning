import type { Lesson } from "../../types";

export const lesson: Lesson = {
  id: "0.2.2",
  title: "Shell scripting and SSH",
  minutes: 90,
  level: "Beginner",
  prerequisites: ["0.2.1 The terminal"],
  summary: "Turn repeated commands into safe, reusable bash scripts, and connect to remote servers securely with SSH keys, aliases, agents and tunnels.",
  terms: [
    { term: "Shebang", def: "The first line `#!/usr/bin/env bash` that tells the kernel which interpreter runs the script. `env` looks up `bash` on `PATH` instead of hard-coding `/bin/bash`." },
    { term: "Exit code", def: "A number from 0 to 255 that a process returns: 0 means success, anything else means failure. Read it with `$?` or test it with `if` and `&&`." },
    { term: "Environment variable", def: "A named value inherited by child processes, e.g. `PATH` or `DATABASE_URL`. `NAME=value` sets it for one command, `export NAME=value` passes it to every child." },
    { term: "Word splitting", def: "After expansion, bash splits an unquoted value on `IFS` (spaces, tabs, newlines by default). This is why `rm $file` can delete the wrong things and `\"$file\"` is the rule." },
    { term: "set -euo pipefail", def: "Three safety switches: exit on a failed command (`-e`), error on an unset variable (`-u`), and fail a pipeline if any stage fails (`-o pipefail`), not just the last one." },
    { term: "trap", def: "Run a command when the shell receives a signal or exits, e.g. `trap 'rm -rf \"$tmp\"' EXIT`. It is how a script cleans up even when it fails halfway." },
    { term: "mktemp", def: "Create a uniquely named file or directory safely with `O_CREAT|O_EXCL`, so another process cannot guess or pre-create the name. `mktemp -d` makes a private directory." },
    { term: "Idempotent", def: "A script that can run twice and leave the system in the same state. `mkdir -p`, `ln -sfn` and check-before-write are the everyday tools for it." },
    { term: "SSH", def: "Secure Shell: an encrypted protocol for logging in to and running commands on remote machines, and for tunnelling other connections." },
    { term: "Key pair", def: "A private key (secret, on your machine, mode 600) and a public key (safe to share, placed in the server's `~/.ssh/authorized_keys`). Ed25519 is the modern default." },
    { term: "ssh-agent", def: "A background process that holds decrypted private keys for your session, so you type the passphrase once. The client asks the agent to sign; the key itself never leaves it." },
    { term: "known_hosts", def: "A client-side file where SSH remembers each server's host key, so it can shout if a server suddenly presents a different identity (possible interception)." },
  ],
  problem: [
    "Every Friday someone on your team backs up the database by typing six commands from a wiki page. One Friday they skip a step, the backup is empty, and nobody notices until the day it is needed.",
    "On another team, the production server is accessed with a shared password that four ex-employees still know. Scripts and SSH keys fix both: a reviewed script does the same thing every time and fails loudly, and keys give each person access you can revoke individually. The hard part is not writing commands. It is writing commands that stop on the first error, survive spaces in filenames, clean up after themselves, can be re-run safely, and travel over a connection you can actually trust.",
  ],
  concept: {
    analogy: [
      "A shell script is a **recipe card**: instead of remembering steps, you follow the card exactly. `set -euo pipefail` is a strict chef who stops cooking the moment something burns instead of serving a ruined dish.",
      "An SSH key pair is a **padlock and its key**. You give the padlock (public key) to every server you need; only your key (private key) opens them. Losing access for one person means removing their padlock, not changing everyone's locks. An agent is a keyring you unlock once in the morning; a host key check is the ID card you inspect before handing over anything.",
    ],
    precise: [
      "Bash runs commands one at a time, each returning an **exit status**. By default it continues after errors, treats unset variables as empty strings, and reports a pipeline's success based only on the last command. `set -e` (exit on error), `set -u` (error on unset variables) and `set -o pipefail` (a pipeline fails if any stage fails) turn those silent failures into stops. Exit 0 means success; every other value is a failure with a meaning you choose.",
      "Variables must be **quoted** (`\"$file\"`) or bash splits them on spaces and expands wildcards. `\"$@\"` passes each argument as its own word; `$*` joins them into one string. Arrays (`servers=(\"web 1\" \"db\")` and `\"${servers[@]}\"`) keep values with spaces intact. Functions, `if`, `for`, `while`, `case` and `$(command)` cover almost every script you will need.",
      "A production script adds three things to that: **cleanup** (`trap ... EXIT` plus `mktemp`), **input handling** (`getopts`, a `usage` function, exit code 2 for bad input), and **idempotency** (safe to run twice). Logs go to stderr, data to stdout, so the script still composes in a pipe.",
      "SSH uses public-key cryptography. The server stores your public key in `~/.ssh/authorized_keys`; at login it sends a challenge only your private key can answer, and verifies the signature with the public key. Your private key never crosses the network. The server also proves *its* identity with a host key, which your client remembers in `known_hosts`; a changed host key is a stop sign, not an annoyance to click away.",
    ],
  },
  underTheHood: {
    text: [
      "1. **From `./script.sh` to a process.** The kernel's `execve` reads the first two bytes. `#!` means the rest of the line is an interpreter, so it starts `/usr/bin/env bash /path/script.sh`. `env` searches `PATH` for `bash`, which is why the same script works on systems where bash is not in `/bin`. The script runs in a **child process**: `cd`, `export` and `set` inside it disappear when it ends. `source file` (or `. file`) is the exception: it runs in your current shell, which is how a `.env` loader can change your environment - and why a `cd` in a sourced file moves you.",
      "2. **Expansion happens in a fixed order.** Brace expansion (`{a,b}`, `{1..3}`) first, then tilde, parameter (`$var`, `${var}`), command substitution (`$(cmd)`), arithmetic (`$((1+2))`), then **word splitting** on `IFS`, then pathname expansion (globbing), then quote removal. Quoting removes the splitting and globbing steps for that word. `\"$@\"` is special: it expands to one word per positional parameter, preserving spaces and empty arguments. `$*` joins them with the first character of `IFS`; unquoted, it is then split again. That single difference is why every wrapper script should end with `\"$@\"`.",
      "3. **What the strict flags really do.** `set -e` exits when a *simple command* fails, but deliberately not when the status is being tested: `if cmd`, `while cmd`, `cmd || fallback`, `cmd && next` and `! cmd` may fail without exiting. It is also suppressed inside a function or subshell whose own status is tested, which surprises people. `set -u` turns an unset variable into an error, but `${VAR:-default}` is the documented way to supply one. `set -o pipefail` makes a pipeline return the rightmost non-zero status instead of the last command's, so `curl ... | jq .` no longer hides a failed download behind a successful `jq`. Bash also keeps every stage in `PIPESTATUS`.",
      "4. **Exit codes are the script's API.** A process returns 0 to 255. 126 means \"found but not executable\", 127 \"command not found\", and 128+N means killed by signal N (130 is Ctrl-C, 143 SIGTERM). `exit` without an argument returns the last status. Tools use other numbers meaningfully: `grep` returns 1 for no match and 2 for a real error; `timeout` returns 124 on timeout. A pipeline's status is the last stage unless `pipefail`. `trap '...' EXIT` runs on normal exit, `exit N`, and a `set -e` abort - but not on `SIGKILL`, and not if the machine dies. Preserve the status inside the trap unless you deliberately want to change it.",
      "5. **Temp files and traps, mechanically.** `mktemp` asks the kernel to create a file or directory with a name that did not exist a microsecond ago (`O_CREAT|O_EXCL`), which is what defeats the classic attack of pre-creating a predictable `/tmp/myapp.tmp` symlink pointing at `/etc/passwd`. `mktemp -d` gives you a private directory to put several files in. The trap string is parsed when the trap is *set*: `trap 'rm -rf \"$work\"' EXIT` expands `$work` at exit time (single quotes), while `trap \"rm -rf $work\" EXIT` freezes the value at definition time. Traps are not stacked per signal; the last one wins, so one cleanup function that handles everything is easier to reason about.",
      "6. **Idempotency, logging and cron.** A deploy script should converge on a state, not replay a history: `mkdir -p`, `ln -sfn`, `install -D -m 644`, and write a file only when its content differs. Check-then-act has a race, so for lock-like files use `mkdir` and treat `EEXIST` as \"someone else won\", or take a `flock -n 9` lock. Log to stderr with a UTC timestamp and a level; keep machine-readable output on stdout. In cron the environment is minimal: no aliases, no functions, often no `PATH` beyond `/usr/bin:/bin`, no terminal, and the working directory is `$HOME`. Use absolute paths, redirect both streams to a log, and wrap the job in `flock -n` so a slow run cannot overlap the next one.",
      "7. **SSH is two proofs, then a channel.** The client opens TCP to port 22 (or `Port`), both sides exchange version banners and negotiate algorithms, then perform a key exchange (Curve25519 in modern OpenSSH) that derives symmetric keys. The server signs the exchange with its **host key**; the client compares that key with `known_hosts`. On a first connection it trusts on first use and stores the key; if the key later changes, it refuses loudly. Only then does authentication start: with `publickey`, the client says which key it wants to use and signs a session-specific challenge. The server checks that key in `authorized_keys` and that permissions are sane. The private key never leaves the client; the agent holds a decrypted copy in memory and signs on request.",
      "8. **Config, tunnels and copies.** `~/.ssh/config` is applied in order and, for most options, the **first** value obtained wins. Command-line `-o` beats the user config, which beats `/etc/ssh/ssh_config`; `Host` blocks can be layered, and `ssh -G host` prints the resolved result without connecting - the fastest way to debug an alias. Forwarding is a channel inside that encrypted session: `-L 8080:db.internal:5432` makes your machine listen on 8080 and asks the server to connect to `db.internal:5432` from its network; `-R` is the same in reverse; `-D 1080` is a SOCKS5 proxy. `scp` copies files over the SSH transport (modern OpenSSH uses SFTP underneath), while `rsync -az` compares both sides and transfers only differences. Passwords over SSH are encrypted in transit, but as an authentication method they are guessable, shared, un-revocable per person and phishable; keys, short-lived certificates and a disabled password method remove that whole class of risk.",
    ],
    diagram: {
      title: "One SSH login, from alias to channel",
      nodes: [
        { label: "ssh devatlas-prod", sub: "~/.ssh/config alias" },
        { label: "TCP + key exchange", sub: "port 22, Curve25519" },
        { label: "Host key check", sub: "known_hosts fingerprint" },
        { label: "Public-key auth", sub: "sign a session challenge" },
        { label: "Encrypted session", sub: "shell, scp, rsync" },
        { label: "Forwarded channel", sub: "-L / -R / -D" },
      ],
      edges: ["resolve alias", "encrypt", "verify server", "open", "tunnel"],
      caption: "Two independent proofs: the server proves its identity with a host key, then you prove yours with a private-key signature. Only after both does a shell or tunnel exist.",
    },
  },
  handsOn: [
    {
      title: "Watch strict mode stop a broken script",
      text: [
        "Both scripts below have the same three steps. The only difference is the second line. Run them and compare the exit codes; then check the two failure modes that `set -e` alone does not catch.",
      ],
      code: {
        lang: "bash",
        file: "strict-demo.sh",
        code: `#!/usr/bin/env bash
work=$(mktemp -d); cd "$work"

cat > lenient.sh <<'SH'
#!/usr/bin/env bash
echo "step 1: start"
false
echo "step 2: still running after false"
cp /nope/missing.txt ./copy.txt
echo "step 3: still running after a failed cp"
SH

cat > strict.sh <<'SH'
#!/usr/bin/env bash
set -euo pipefail
echo "step 1: start"
false
echo "step 2: never printed"
SH

echo "-- no strict mode"
bash lenient.sh; echo "lenient exit=$?"
echo "-- strict mode"
bash strict.sh;  echo "strict exit=$?"

echo "-- pipeline status"
false | true; echo "without pipefail: exit=$?"
( set -o pipefail; false | true ); echo "with pipefail: exit=$?"

echo "-- unset variable"
bash -c 'set -u; echo "user=$USER"; echo "usr=$USR"'; echo "unset exit=$?"

echo "-- what commands return"
true;  echo "true -> $?"
false; echo "false -> $?"
(exit 42); echo "subshell -> $?"
grep -q bash /etc/passwd; echo "grep match -> $?"
grep -q nosuchuser /etc/passwd; echo "grep miss -> $?"`,
      },
      output: "-- no strict mode\nstep 1: start\nstep 2: still running after false\ncp: cannot stat '/nope/missing.txt': No such file or directory\nstep 3: still running after a failed cp\nlenient exit=0\n-- strict mode\nstep 1: start\nstrict exit=1\n-- pipeline status\nwithout pipefail: exit=0\nwith pipefail: exit=1\n-- unset variable\nbash: line 1: USER: unbound variable\nunset exit=127\n-- what commands return\ntrue -> 0\nfalse -> 1\nsubshell -> 42\ngrep match -> 0\ngrep miss -> 1",
      notes: [
        "The lenient script printed `step 3` and exited 0 even though `cp` failed. That is the empty-backup failure from the problem statement. The strict script stopped at `false` and exited 1.",
        "`false | true` returned 0 without `pipefail` because a pipeline's status is its last command's. With `pipefail` it returned 1.",
        "Unset variables exit with 127 in bash 5.2 (the same code as \"command not found\"); do not hard-code that number, just treat non-zero as failure. `grep` uses 1 for \"no match\" and 2 for a real error, which is why scripts distinguish `if ! grep -q ...` from a `grep` crash.",
      ],
    },
    {
      title: "See word splitting, then fix it with quotes and arrays",
      text: [
        "One variable, two ways to expand it. `count` prints how many words bash handed the function; `printf` shows where the boundaries landed. Then compare `\"$@\"`, `$*` and `\"$*\"`, and see why arrays are the right container for lists.",
      ],
      code: {
        lang: "bash",
        file: "quoting.sh",
        code: `#!/usr/bin/env bash
name="Dev Atlas Notes"
count() { echo "got $# argument(s)"; }
count $name
count "$name"
printf 'unquoted: <%s>\\n' $name
printf 'quoted:   <%s>\\n' "$name"
echo

show() { printf 'argc=%d:' "$#"; printf ' <%s>' "$@"; echo; }
set -- a "b c" d
printf '"$@":  '; show "$@"
printf '$*:    '; show $*
printf '"$*":  '; show "$*"
echo

servers=("web 1" "web 2" "db")
echo "array length: \${#servers[@]}"
for s in "\${servers[@]}"; do echo "  server: $s"; done`,
      },
      output: "got 3 argument(s)\ngot 1 argument(s)\nunquoted: <Dev>\nunquoted: <Atlas>\nunquoted: <Notes>\nquoted:   <Dev Atlas Notes>\n\n\"$@\":  argc=3: <a> <b c> <d>\n$*:    argc=4: <a> <b> <c> <d>\n\"$*\":  argc=1: <a b c d>\n\narray length: 3\n  server: web 1\n  server: web 2\n  server: db",
      notes: [
        "Unquoted expansion split `Dev Atlas Notes` into three words and would also have expanded `*` against the current directory. Quoting disabled both splitting and globbing.",
        "`\"$@\"` preserved the argument `b c` as one word. Unquoted `$*` split it into two. `\"$*\"` joined everything into a single string - useful for a log line, wrong for passing arguments on.",
        "`\"${servers[@]}\"` kept `web 1` intact. `for f in $(ls)` and `for f in $list` are the same bug in disguise: parse data with `while IFS= read -r line`, not with word splitting.",
      ],
    },
    {
      title: "The skeleton: flags, traps, temp files and logs",
      text: [
        "This is the shape to reuse for real operational scripts. `getopts` parses flags, `mktemp -d` creates a private workspace, `trap` removes it on every exit path, `log` writes to stderr with a UTC timestamp, and the config write is idempotent: run it twice and the second run leaves the file alone.",
      ],
      code: {
        lang: "bash",
        file: "app.sh",
        code: `#!/usr/bin/env bash
set -euo pipefail

usage() { echo "usage: $0 [-n] [-r RETRIES] ROOT" >&2; exit 2; }
log()   { printf '%s %s\\n' "$(date -u +%H:%M:%SZ)" "$*" >&2; }

dry_run=false
retries=3
while getopts ":nr:h" opt; do
  case $opt in
    n) dry_run=true ;;
    r) retries=$OPTARG ;;
    h) usage ;;
    :) echo "error: -$OPTARG needs a value" >&2; usage ;;
    \\?) echo "error: unknown option -$OPTARG" >&2; usage ;;
  esac
done
shift $((OPTIND - 1))
[[ $# -eq 1 ]] || usage
root=$1

work=$(mktemp -d)
trap 'log "cleanup: rm -rf $work"; rm -rf "$work"' EXIT

log "root=$root retries=$retries dry_run=$dry_run"
mkdir -p "$root"/{bin,conf,data}
if [[ -f "$root/conf/app.env" ]]; then
  log "config exists, leaving it alone"
else
  printf 'LOG_LEVEL=info\\n' > "$root/conf/app.env"
  log "wrote default config"
fi
ln -sfn "$root/conf/app.env" "$root/current"
printf 'release %s\\n' "$retries" > "$work/payload"
log "staged $(wc -c < "$work/payload") bytes in $work"
if $dry_run; then log "dry run: not installing"; exit 0; fi
cp "$work/payload" "$root/data/release.txt"
log "installed release"`,
      },
      output: "-- first run\n08:19:22Z root=/tmp/app retries=3 dry_run=false\n08:19:23Z wrote default config\n08:19:23Z staged 10 bytes in /tmp/tmp.S3eMm3mKhL\n08:19:23Z installed release\n08:19:23Z cleanup: rm -rf /tmp/tmp.S3eMm3mKhL\nexit=0\n-- second run (idempotent)\n08:19:23Z root=/tmp/app retries=3 dry_run=false\n08:19:23Z config exists, leaving it alone\n08:19:23Z staged 10 bytes in /tmp/tmp.lXyUgN9lkI\n08:19:23Z installed release\n08:19:23Z cleanup: rm -rf /tmp/tmp.lXyUgN9lkI\nexit=0\n-- dry run\n08:19:23Z root=/tmp/app retries=3 dry_run=true\n08:19:23Z config exists, leaving it alone\n08:19:23Z staged 10 bytes in /tmp/tmp.P23kdVyrCF\n08:19:23Z dry run: not installing\n08:19:23Z cleanup: rm -rf /tmp/tmp.P23kdVyrCF\nexit=0\n-- missing option value\nerror: -r needs a value\nusage: app.sh [-n] [-r RETRIES] ROOT\nexit=2\n-- unknown option\nerror: unknown option -z\nusage: app.sh [-n] [-r RETRIES] ROOT\nexit=2\n-- missing target\nusage: app.sh [-n] [-r RETRIES] ROOT\nexit=2\n-- failure path: trap still cleans up\n08:19:23Z root=/proc/1/nope retries=3 dry_run=false\nmkdir: cannot create directory '/proc/1/nope': No such file or directory\nmkdir: cannot create directory '/proc/1/nope': No such file or directory\nmkdir: cannot create directory '/proc/1/nope': No such file or directory\n08:19:23Z cleanup: rm -rf /tmp/tmp.W79MImuWnt\nexit=1",
      notes: [
        "Reproduce the transcript by running `bash app.sh /tmp/app` twice, then `bash app.sh -n /tmp/app`, `bash app.sh -r`, `bash app.sh -z /tmp/app`, `bash app.sh`, and finally `bash app.sh /proc/1/nope`.",
        "The timestamps and `tmp.XXXXXXXXXX` suffixes are real but vary per run. The important lines are the two `cleanup:` entries: the trap fired on success and on the `mkdir` failure, so the temp directory never leaked.",
        "`getopts` with a leading `:` gives you the two error cases explicitly: `:` means a missing option value, `?` means an unknown option. Both print a message and exit 2 (bad usage) instead of 1 (runtime failure). That distinction lets a caller tell \"I called it wrong\" from \"it tried and failed\".",
        "`if $dry_run; then` works because the variable holds `true` or `false`, which are commands. The trap string is in single quotes so `$work` is expanded when the trap runs, not when it is defined.",
        "Guard dependencies before doing work: `command -v rsync >/dev/null 2>&1 || { echo \"rsync is required\" >&2; exit 1; }`. The same pattern checks `docker`, `jq` or `psql` in CI images where the tool may be missing.",
        "Loop over files with a guard, never over `ls`: `for f in ./*.log; do [[ -e \"$f\" ]] || continue; echo \"$f has $(wc -l < \"$f\") lines\"; done`. Defaults and requirements stay one-liners: `LOG_LEVEL=\"${LOG_LEVEL:-info}\"` and `: \"${DATABASE_URL:?DATABASE_URL must be set}\"`.",
      ],
    },
    {
      title: "The SSH reference card: config, aliases, tunnels and copies",
      text: [
        "Keep this next to you until it is muscle memory. The `Host` block is an alias: `ssh devatlas-prod` expands to the address, user and key below, and the same alias works for `ssh`, `scp`, `rsync` and `ssh -G`. The table compares the forwarding types and the two copy tools.",
        "Real values from a Debian 12 / OpenSSH 9.2p1 run: `ssh -G devatlas-prod` resolved to `user deploy`, `hostname 203.0.113.10`, `port 22`, `identityfile ~/.ssh/id_ed25519`, `identitiesonly yes`. `203.0.113.10` is a documentation address; replace it with your server.",
      ],
      code: {
        lang: "text",
        file: "ssh-reference.txt",
        code: `~/.ssh/config

Host devatlas-prod
    HostName 203.0.113.10
    User deploy
    IdentityFile ~/.ssh/id_ed25519
    IdentitiesOnly yes
    ServerAliveInterval 30

Host github.com
    User git
    IdentityFile ~/.ssh/id_ed25519

# first key install (you still need one working login)
ssh-keygen -t ed25519 -C "you@example.com"
ssh-copy-id -i ~/.ssh/id_ed25519.pub deploy@203.0.113.10

forwarding and copying at a glance

kind              command                              listens / copies where
-L local          ssh -L 8080:db.internal:5432 host    your machine :8080 -> server -> db.internal:5432
-R remote         ssh -R 8080:localhost:3000 host      server :8080 -> your machine :3000
-D socks proxy    ssh -D 1080 host                     your machine :1080, SOCKS5 into the server's network
scp               scp file host:/tmp/                  one file/dir over SSH (SFTP underneath in OpenSSH 9+)
rsync             rsync -az --delete dist/ host:/app/  only changed bytes, resumable, fast

quoting and redirection you will use daily

"$var"            one word, no splitting or globbing
"$@"              each argument separately (wrap pass-through scripts)
> file  2> err    stdout and stderr to separate files
>> file           append instead of truncate
2>&1              send stderr where stdout currently goes
cmd | tee log     copy the stream to a file and still see it`,
      },
      notes: [
        "Always get the rsync source right, especially with `--delete`: `rsync -az --delete dist/ host:/srv/app/` syncs the *contents* of `dist/`; `dist` without the trailing slash creates `app/dist`. A misplaced slash plus `--delete` has erased production directories.",
        "`-L` is the everyday tunnel (a remote database, an internal dashboard). `-R` is how you expose a local service to a remote network without opening a firewall port. `-D` turns SSH into a SOCKS proxy for a browser. Add `-N` to skip the shell and `-f` to background it, and check the server's `AllowTcpForwarding` if a tunnel is refused.",
        "`ssh -G host` prints the final config (including defaults) without connecting; use it when an alias \"does not work\". `IdentitiesOnly yes` stops the agent from offering every key in turn and hitting `Too many authentication failures`.",
        "The `-L` tunnel is verified end to end in the next step on a loopback server. `-R` and `-D` use the same channel machinery and are standard OpenSSH syntax, shown here as reference rather than as a captured transcript.",
        "For a server you control, `scp` is fine for one file; `rsync` is the right tool for a directory you will deploy again. Neither replaces `set -euo pipefail`: a failed `rsync` must stop the script before the restart command runs.",
      ],
    },
    {
      title: "Follow the SSH login and forwarding flow",
      text: [
        "The diagram is the whole handshake in order. The host-key check is the step people skip, and it is the one that decides whether the encrypted pipe is going to your server or to someone impersonating it.",
        "Verified on Debian 12 with OpenSSH 9.2p1, using a loopback `sshd` on port 2222: the first connection printed `Warning: Permanently added '[127.0.0.1]:2222' (ED25519) to the list of known hosts.` and then `root` / `key-based auth works`. The `known_hosts` entry began with `|1|` because `HashKnownHosts yes` hashes hostnames by default. Asking for password auth with `PubkeyAuthentication=no` produced `root@127.0.0.1: Permission denied (publickey).`; the server no longer offered a password at all.",
        "The same run opened `ssh -N -L 9999:127.0.0.1:2222 root@127.0.0.1`, then a second `ssh -p 9999` through that tunnel printed `reached sshd through the -L tunnel`. After killing the forwarder, port 9999 returned `ssh: connect to host 127.0.0.1 port 9999: Connection refused`: the local listener exists only while the SSH session does.",
        "On the client side, `ssh-keygen -t ed25519 -C you@example.com` printed a fingerprint `SHA256:FVvQ1iCb6FInOUg0/SXK5VJBxYzauS+pSuR9mi/n6as` and wrote `id_ed25519` (private) plus `id_ed25519.pub`. `ssh-add` printed `Identity added: /root/.ssh/id_ed25519 (you@example.com)`, and `ssh-add -l` listed the same SHA256 fingerprint. These are real outputs from the lab container; yours will differ.",
      ],
      code: {
        lang: "mermaid",
        file: "ssh-login.mmd",
        code: `sequenceDiagram
    autonumber
    participant Y as You (laptop)
    participant C as ssh client
    participant A as ssh-agent
    participant S as sshd (server)

    Y->>C: ssh devatlas-prod
    C->>C: read ~/.ssh/config (HostName, User, IdentityFile)
    C->>S: TCP 22, banners, Curve25519 key exchange
    S-->>C: host key + signature over the exchange
    C->>C: compare with ~/.ssh/known_hosts
    alt host key changed
        C-->>Y: WARNING: REMOTE HOST IDENTIFICATION HAS CHANGED
    else host key matches (or first use, stored)
        C->>A: sign the session challenge
        A-->>C: signature (private key stays local)
        C->>S: public key + signature
        S->>S: check authorized_keys and permissions
        S-->>Y: shell, or a channel for -L / -R / -D
    end`,
      },
      notes: [
        "A changed host key is not a prompt to delete `known_hosts`. Confirm out of band (cloud console, a colleague, a rebuild ticket) that the server was reimaged or rotated its key, then remove the old entry with `ssh-keygen -R host` and reconnect.",
        "`authorized_keys` permissions matter: `~/.ssh` should be 700 and `authorized_keys` 600 and owned by the user. If the home directory is group-writable, `sshd` may silently refuse the key, which looks exactly like a wrong key.",
        "Cron is the other half of operational scripting: `0 2 * * * /home/deploy/app.sh /srv/app >> /var/log/app.log 2>&1` runs with a minimal environment and no terminal. Use absolute paths, redirect both streams, and consider `flock -n /tmp/app.lock` so two runs cannot overlap.",
      ],
    },
  ],
  companies: [
    "**GNU Bash / Free Software Foundation (verified in this lesson):** every behaviour in the hands-on - lenient versus strict execution, word splitting, arrays, `trap ... EXIT`, `getopts`, `${VAR:?}` - was run on GNU bash 5.2.15 in `debian:bookworm-slim`. Bash is the default interactive shell on most Linux systems and macOS ships an old 3.2. POSIX `sh` (dash on Debian) lacks arrays and `pipefail`, so `#!/bin/sh` scripts must stay portable.",
    "**OpenSSH / OpenBSD project (verified in this lesson):** the client and server used in the examples are OpenSSH 9.2p1 on Debian 12. The observable details - `ssh -G` resolving a `Host` block, hashed `|1|...` `known_hosts` entries, `Permission denied (publickey)` when password auth is disabled, and a `-L` tunnel that disappears when its session ends - are OpenSSH behaviour, not generic SSH theory.",
    "**GitHub (illustrative):** GitHub accepts SSH keys per account and per repository (deploy keys). `ssh -T git@github.com` prints a greeting instead of a shell. Teams remove a departed engineer's key once, and every repository stops accepting it; a shared password or a shared key cannot give you that. GitHub's docs also push Ed25519 keys and passphrases.",
    "**ShellCheck and CI providers (illustrative):** ShellCheck parses bash and warns about unquoted expansions, useless `cat`, and `rm $var`, which is why many teams run it as a CI gate. GitHub Actions, GitLab CI and Jenkins all execute shell steps with `set -e` semantics of their own, so a script that \"works locally\" can behave differently in CI.",
    "**AWS, Azure and Google Cloud (illustrative):** at scale, companies stop exposing port 22: AWS Systems Manager Session Manager, Azure Bastion and Google Cloud IAP tunnel sessions through an authenticated control plane, with short-lived credentials and an audit log per session. Where SSH remains, expect a bastion host, a CA-issued short-lived certificate, and `PasswordAuthentication no`.",
  ],
  mistakes: [
    { mistake: "Unquoted variables", why: "It works with simple test names", wrong: "Files with spaces break the script, or a glob in the value expands and the wrong files are deleted", fix: "Quote every expansion: \"$var\", \"$@\", \"${arr[@]}\". Run ShellCheck." },
    { mistake: "No set -euo pipefail", why: "Bash's defaults are lenient", wrong: "A failed step is ignored and later steps run on bad data (empty backups, a deploy of an old build)", fix: "Start every script with set -euo pipefail, and test important commands explicitly with if ! cmd" },
    { mistake: "Parsing ls output or looping over $(ls)", why: "It looks like the obvious way to list files", wrong: "Spaces, newlines and leading dashes split names; a file named -rf becomes an option", fix: "Use a glob with a guard (`for f in ./*.log; do [[ -e $f ]] || continue`) or `find ... -print0 | while IFS= read -r -d '' f`" },
    { mistake: "rm -rf with an empty or unset variable", why: "The variable is always set in your shell", wrong: "A typo or an unset variable turns `rm -rf \"$dir/\"` into a much wider delete", fix: "set -u, require the value (`: \"${dir:?}\"`), refuse dangerous paths, and prefer `rm -rf -- \"$dir\"` with a checked absolute path" },
    { mistake: "Predictable temp files and no trap", why: "/tmp/myapp.tmp seems harmless", wrong: "Another user can pre-create a symlink; a failure leaves files and half-written state behind", fix: "Use `tmp=$(mktemp -d)` and `trap 'rm -rf \"$tmp\"' EXIT`" },
    { mistake: "Sharing one SSH key or password across a team", why: "Easy onboarding", wrong: "No way to revoke one person, no attribution in logs, and rotation means touching every server", fix: "One key per person (or SSO-issued short-lived certificates); remove the key at offboarding; audit authorized_keys" },
    { mistake: "Deleting known_hosts entries on warnings", why: "The warning blocks your work", wrong: "You might be connecting to an attacker who is intercepting the session", fix: "Confirm the rebuild or key rotation out of band, then `ssh-keygen -R host` and reconnect" },
    { mistake: "Leaving password auth enabled and keys without passphrases", why: "It is the default on many images, and passphrases feel inconvenient", wrong: "The server is exposed to credential stuffing, and a stolen laptop yields immediate access", fix: "`PasswordAuthentication no`, `KbdInteractiveAuthentication no`, `PermitRootLogin no`; passphrase + ssh-agent (or a hardware key) for private keys; 600 permissions" },
  ],
  bestPractices: [
    { tag: "Reliability", text: "Start with `#!/usr/bin/env bash` and `set -euo pipefail`; use `trap` for cleanup, meaningful exit codes (2 for usage, 1 for runtime), and a `--dry-run` flag for destructive actions." },
    { tag: "Security", text: "Ed25519 keys with passphrases; `PasswordAuthentication no` and `PermitRootLogin no`; verify host keys; never put secrets in scripts or in `ssh` command lines." },
    { tag: "Maintainability", text: "Run ShellCheck, keep scripts in the repository with a usage message, log to stderr with timestamps, and move to Python or Go once the logic needs real data structures." },
    { tag: "Security", text: "Give each person their own key or a short-lived certificate; scope `authorized_keys` with `from=`, `command=` or `restrict` where possible; revoke at offboarding." },
    { tag: "Cost", text: "Idempotent deploy scripts and `rsync --delete` with retention avoid re-uploading and re-storing everything; a `flock` guard prevents duplicate cron runs from doubling compute and storage." },
  ],
  interview: [
    { q: "What exactly does set -euo pipefail do, and where does it still surprise people?", a: "`-e` (errexit) makes the shell exit when a simple command returns non-zero; `-u` (nounset) makes an unset variable an error; `-o pipefail` makes a pipeline return the rightmost non-zero status instead of the last command's. The surprises are all in the exceptions. `-e` does not trigger when the command's status is being tested: `if grep -q x file`, `while read`, `cmd || fallback`, `cmd && next`, and `! cmd` are allowed to fail. It is also suppressed for the body of a function or subshell whose own status is tested, which is why a `set -e` function can appear to run past a failure. A pipeline only sees `pipefail` at the pipeline level; inside, each stage still has its own status, available in `PIPESTATUS`. `-u` rejects `$UNSET` but accepts `${UNSET:-default}`. And none of them runs your cleanup: that is `trap ... EXIT`, which fires on normal exit, `exit N`, and an erexit abort, but not on SIGKILL. In practice: turn all three on, keep cleanup in a trap, and write explicit `if ! cmd; then ...` around the failures you intend to handle.",
    },
    { q: "Walk me through what happens when you run ssh devatlas-prod, including how the server and you prove who you are.", a: "The client first resolves `devatlas-prod` through `~/.ssh/config` (HostName, User, Port, IdentityFile; first value wins, command-line options beat the file). It opens TCP to the port, both sides exchange banners and negotiate algorithms, then perform a key exchange such as Curve25519 to derive symmetric keys. The server signs the exchange with its host key; the client compares that key with `known_hosts`. On first contact it stores the key (trust on first use); on a later mismatch it refuses with a loud warning and does not fall back to a password. Once the transport is authenticated, user authentication begins: with publickey, the client offers a key and signs a session-specific challenge. If the agent is loaded, the agent signs without exposing the private key; otherwise the client prompts for the passphrase to decrypt the key locally. The server checks the key in `authorized_keys` and checks permissions. The private key never crosses the network; the server only ever sees a public key and a signature. Only then is a session channel opened - a shell, an `scp`/`rsync` subsystem, or a forwarded TCP channel for `-L`/`-R`/`-D`.",
    },
    { q: "How would you give a contractor temporary access, and why are passwords over SSH a bad idea even though the connection is encrypted?", a: "Start from least privilege and an expiry. Create a personal account, add their own public key, and prefer a short-lived SSH certificate from a CA (or a cloud session tool such as SSM Session Manager or Azure Bastion) scoped to the hosts and commands they need. Add `from=` or `restrict` options in `authorized_keys`, log sessions, and remove the access at the end - a calendar reminder plus a check that `authorized_keys` no longer contains their key. Never a shared account, shared key or shared password: you cannot revoke one person, you cannot attribute actions, and every rotation touches everyone. Passwords are encrypted inside the SSH tunnel, so the risk is not eavesdropping on the wire; it is that passwords are guessable and reusable across services, they can be phished, they have no per-device binding, and a server with password auth enabled exposes an internet-facing guessing surface. Keys (especially hardware-backed or certificate-based) remove those properties, and disabling password and keyboard-interactive auth removes the surface entirely.",
    },
  ],
  quickCheck: [
    {
      kind: "output",
      prompt: "What prints?",
      code: { lang: "bash", code: "#!/usr/bin/env bash\nset -e\nfalse | true\necho \"reached\"" },
      options: ["Nothing, the script exits", "reached", "An error message", "false"],
      answer: 1,
      explanation: "Without pipefail, a pipeline's status is the last command's (true), so set -e does not trigger. With `set -o pipefail` the pipeline returns 1 and the script exits.",
    },
    {
      kind: "bug",
      prompt: "Why does this delete the wrong files when a filename contains a space?",
      code: { lang: "bash", code: "file=\"old report.txt\"\nrm $file" },
      options: ["rm cannot delete .txt files", "Unquoted $file splits into 'old' and 'report.txt'", "Variables need curly braces", "rm needs -f"],
      answer: 1,
      explanation: "Unquoted expansion splits on IFS, so the command becomes `rm old report.txt`. Use `rm -- \"$file\"`: the quotes stop splitting and `--` stops a leading dash from becoming an option.",
    },
    {
      kind: "mcq",
      prompt: "ssh prints `WARNING: REMOTE HOST IDENTIFICATION HAS CHANGED!` and refuses to connect. What is the right first step?",
      options: ["Delete the known_hosts entry and reconnect", "Verify out of band that the server was rebuilt or its host key rotated", "Reconnect with StrictHostKeyChecking=no", "Switch the server to password authentication"],
      answer: 1,
      explanation: "The warning means the server presented a different host key than the one you trusted. Confirm the change through another channel (console, a colleague, a rebuild ticket) before removing the old entry with `ssh-keygen -R host`. Disabling the check removes the protection entirely.",
    },
  ],
  cheatSheet: [
    "Start scripts with `#!/usr/bin/env bash` and `set -euo pipefail`.",
    "Quote every expansion: `\"$var\"`, `\"$@\"`, `\"${arr[@]}\"`. Unquoted means splitting plus globbing.",
    "`${VAR:-default}` supplies a default; `${VAR:?message}` fails if unset. Exit 2 for usage, 1 for runtime failure.",
    "`tmp=$(mktemp -d)` + `trap 'rm -rf \"$tmp\"' EXIT` cleans up on success, failure and signals you trap.",
    "`if ! cmd; then` for expected failures; `cmd && next` / `cmd || fallback`; check `$?` only right after the command.",
    "`getopts \":nr:h\" opt` + `case` parses flags; `shift $((OPTIND - 1))` leaves positional arguments.",
    "Idempotent: `mkdir -p`, `ln -sfn`, write only when content differs, `flock -n` for cron overlap.",
    "`ssh-keygen -t ed25519`; public key to `~/.ssh/authorized_keys`; private key stays local at mode 600.",
    "`~/.ssh/config` Host aliases; debug with `ssh -G host`; host-key warning means verify, not delete.",
    "Forward: `-L` local, `-R` remote, `-D` SOCKS; copy: `scp` one file, `rsync -az --delete` for directories.",
  ],
  homework: {
    basic: {
      title: "Disk alert script",
      brief: ["Write `disk_alert.sh <threshold>` that checks every mounted filesystem and prints a line for each one above the threshold percentage. Exit 1 if any is above, 0 otherwise. Validate the argument is a number between 1 and 99."],
      criteria: ["Argument validation with usage message", "Correct exit codes", "Handles mount points with spaces"],
      hints: ["`df -P` gives stable POSIX output.", "`[[ $1 =~ ^[0-9]+$ ]]` checks for digits."],
      solution: {
        text: [
          "Use `df -P` for parseable output and `awk` to filter, then base the exit code on whether `awk` printed anything. Validation runs first so a bad argument exits 2 before any work happens.",
          "Real output from `debian:bookworm-slim`: below the threshold the script printed `all filesystems below 50%` and exited 0. With threshold 1 it printed `3% /` and `3% /etc/hosts` and exited 1. With `abc` it printed the usage line and exited 2.",
        ],
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
        output: "all filesystems below 50%\n3% /\n3% /etc/hosts\nusage: disk_alert.sh <1-99>",
        pitfalls: ["Comparing '91%' as a string", "Printing only the 6th field, which breaks for mount points with spaces"],
      },
    },
    intermediate: {
      title: "Safe, self-cleaning backups",
      brief: ["Run the backup script twice (wait a second between runs), then hand it a missing source directory. Explain which line stopped the failing run, which line removed the temporary file, and why the new archive survives retention."],
      criteria: ["A failing run leaves no partial archive and no temp file", "Old archives are pruned without deleting the new one", "Every expansion is quoted and set -euo pipefail is present"],
      hints: ["`trap ... EXIT` runs on the set -e abort too.", "Compare `ls -1t ... | tail -n +$((keep + 1))` with the version in the script."],
      solution: {
        text: [
          "The archive is built into a temp file first and moved into place only after it is non-empty. That ordering is what makes a failed run safe: `mv` is the commit point. The trap removes the temp file whether the script succeeds, fails, or is interrupted by a trapped signal.",
          "Retention uses `ls -1t` (newest first) and `tail -n +N` to skip the newest N, then `xargs -r` so an empty list runs nothing. On macOS, `xargs` lacks `-r`; install GNU findutils or use a `while read` loop. Exit code 2 means bad usage, 1 means a runtime failure.",
        ],
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
        output: "created /home/you/lab/backups/backup-20261018-101500.tar.gz (4.0K)\nexit=0\nusage: ./backup.sh <source-dir> <backup-dir>\nexit=2\nerror: /does/not/exist is not a directory\nexit=1",
        pitfalls: ["Writing the archive directly to its final name, so a failure leaves a corrupt backup that retention will keep", "Using `rm -rf \"$dest\"/*` instead of a guarded pattern"],
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
          "harden_ssh.sh scripts steps 1 to 4 on the server. It writes a drop-in file named 00-hardening.conf because sshd keeps the first value it reads for most settings, and Ubuntu and Debian include sshd_config.d/*.conf in name order at the top of sshd_config. A 00- file beats a cloud image's 50-cloud-init.conf that sets PasswordAuthentication yes; a 99- file would lose. It checks the effective settings with `sshd -T` before reloading.",
          "verify_ssh.sh runs on your machine. A refused password login shows `Permission denied (publickey)`: the server no longer even offers password. The output shown is from a test on Ubuntu 24.04 with OpenSSH 9.6 in a container without systemd, so sshd was restarted by hand. Before hardening the same checks showed `(publickey,password)` and root could log in with a key.",
        ],
        code: { lang: "bash", file: "harden_ssh.sh", code: `#!/usr/bin/env bash
# Harden SSH on a throwaway test server. Run as root ON THE SERVER, from a session
# you keep open until verify_ssh.sh passes from a second terminal.
# usage: sudo ./harden_ssh.sh <new-user> <public-key-file>
set -euo pipefail

user="\${1:?usage: $0 <new-user> <public-key-file>}"
pubkey="\${2:?usage: $0 <new-user> <public-key-file>}"
[[ $EUID -eq 0 ]] || { echo "error: run as root (sudo)" >&2; exit 1; }
grep -qE '^(ssh-ed25519|ecdsa-sha2-nistp[0-9]+|ssh-rsa) ' "$pubkey" ||
  { echo "error: $pubkey does not look like an SSH public key" >&2; exit 1; }

echo "== 1. Non-root user with sudo"
id "$user" >/dev/null 2>&1 || adduser --disabled-password --gecos "" "$user"
usermod -aG sudo "$user"
# sudo needs a password; SSH will not accept it, but sudo will ask for it.
passwd -S "$user" | grep -q " P " || passwd "$user"

echo "== 2. Install the public key (dir 700, file 600, owned by the user)"
home=$(getent passwd "$user" | cut -d: -f6)
install -d -m 700 -o "$user" -g "$user" "$home/.ssh"
auth="$home/.ssh/authorized_keys"
touch "$auth"
grep -qxF "$(cat "$pubkey")" "$auth" || cat "$pubkey" >> "$auth"
chown "$user:$user" "$auth" && chmod 600 "$auth"

echo "== 3. Drop-in config (files in sshd_config.d are read first; first value wins)"
grep -q '^Include /etc/ssh/sshd_config.d/\\*.conf' /etc/ssh/sshd_config ||
  { echo "error: sshd_config has no Include line; edit it directly instead" >&2; exit 1; }
cat > /etc/ssh/sshd_config.d/00-hardening.conf <<CONF
PermitRootLogin no
PasswordAuthentication no
KbdInteractiveAuthentication no
PubkeyAuthentication yes
MaxAuthTries 3
LoginGraceTime 30
X11Forwarding no
CONF

echo "== 4. Validate before touching the running daemon"
install -d -m 755 /run/sshd          # sshd -t needs its privilege separation dir
sshd -t
effective=$(sshd -T -C user="$user",host=test,addr=127.0.0.1)
for want in "permitrootlogin no" "passwordauthentication no" \\
            "kbdinteractiveauthentication no" "pubkeyauthentication yes"; do
  grep -qx "$want" <<<"$effective" || { echo "error: effective config lacks '$want'" >&2; exit 1; }
  echo "ok  $want"
done

echo "== 5. Reload (existing sessions stay open)"
if [[ -d /run/systemd/system ]]; then
  systemctl reload ssh 2>/dev/null || systemctl reload sshd   # Debian/Ubuntu vs RHEL name
else
  echo "no systemd here: restart sshd yourself"
fi
echo "Now, in a NEW terminal: ./verify_ssh.sh <host> $user"

# ---- verify_ssh.sh ----
#!/usr/bin/env bash
# Run from YOUR machine in a NEW terminal while the root session stays open.
# usage: ./verify_ssh.sh <host> [user] [port]     (KEY=path overrides the private key)
set -uo pipefail   # no -e: failed logins are expected results here

host="\${1:?usage: $0 <host> [user] [port]}"
user="\${2:-deploy}"
port="\${3:-22}"
key="\${KEY:-$HOME/.ssh/id_ed25519}"
opts=(-p "$port" -o BatchMode=yes -o ConnectTimeout=5 -o StrictHostKeyChecking=accept-new -o LogLevel=ERROR)
fail=0

out=$(ssh "\${opts[@]}" -i "$key" -o IdentitiesOnly=yes "$user@$host" 'echo "logged in as $(whoami)"' 2>&1)
if [[ $out == "logged in as $user" ]]; then echo "PASS key login: $out"; else echo "FAIL key login: $out"; fail=1; fi

# Ask for password auth only. A hardened server does not even offer it.
out=$(ssh "\${opts[@]}" -o PubkeyAuthentication=no "$user@$host" true 2>&1)
if [[ $out == *"Permission denied (publickey)"* ]]; then
  echo "PASS password login refused: server offers publickey only"
else echo "FAIL password login: $out"; fail=1; fi

out=$(ssh "\${opts[@]}" -i "$key" -o IdentitiesOnly=yes "root@$host" true 2>&1)
if [[ $out == *"Permission denied"* ]]; then echo "PASS root login refused"; else echo "FAIL root login: $out"; fail=1; fi
exit "$fail"` },
        output: "== 1. Non-root user with sudo\n== 2. Install the public key (dir 700, file 600, owned by the user)\n== 3. Drop-in config (files in sshd_config.d are read first; first value wins)\n== 4. Validate before touching the running daemon\nok  permitrootlogin no\nok  passwordauthentication no\nok  kbdinteractiveauthentication no\nok  pubkeyauthentication yes\n== 5. Reload (existing sessions stay open)\nno systemd here: restart sshd yourself\nNow, in a NEW terminal: ./verify_ssh.sh <host> deploy\n\nPASS key login: logged in as deploy\nPASS password login refused: server offers publickey only\nPASS root login refused",
        pitfalls: ["Closing your only session before testing", "Wrong permissions on .ssh, which makes sshd silently ignore the key", "Naming the drop-in 99-hardening.conf, so an earlier file such as 50-cloud-init.conf wins and passwords stay enabled"],
      },
    },
    capstone: {
      title: "DevAtlas: Makefile-style task script",
      brief: ["Extend `scripts/dev.sh` with `setup`, `test`, `lint`, `clean` and `deploy` sub-commands using a case statement. `deploy` must support `--dry-run`, refuse to run without `dist/`, and use the short SSH alias. Add one cron line that runs it safely."],
      criteria: ["Usage message for unknown commands", "set -euo pipefail and a single `run` helper for dry-run", "Documented in README, with the cron line"],
      hints: ["Reuse setup.sh from the previous lesson for the setup sub-command.", "The `run` helper prints with %q so a copied dry-run line is safe to paste."],
      solution: {
        text: [
          "One entry point for common tasks means new contributors never need to memorise per-service commands. Routing every side effect through `run` makes `--dry-run` honest: the same code path prints instead of executing.",
          "Real output from the dry run: `[dry-run] rsync -az --delete dist/ devatlas-prod:/srv/app/` and `[dry-run] ssh devatlas-prod sudo\\ systemctl\\ restart devatlas` (printf %q escapes the spaces), exit 0. Without `dist/`: `error: dist/ not found, build first`, exit 1. An unknown sub-command prints the usage line and exits 2.",
          "Schedule it with `0 2 * * * cd /srv/devatlas && flock -n /tmp/devatlas.lock ./scripts/dev.sh deploy devatlas-prod >> /var/log/devatlas-deploy.log 2>&1`. `flock -n` skips the run if the previous one is still going, and the absolute path plus redirected streams are what cron needs.",
        ],
        code: {
          lang: "bash",
          file: "scripts/dev.sh",
          code: `#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

dry=false
if [[ "\${1:-}" == "--dry-run" ]]; then dry=true; shift; fi
run() { if $dry; then printf '[dry-run]'; printf ' %q' "$@"; echo; else "$@"; fi; }

cmd="\${1:-}"
case "$cmd" in
  setup) ./scripts/setup.sh ;;
  test)  (cd services/ai && python -m pytest -q) ;;
  lint)  shellcheck scripts/*.sh ;;
  clean) rm -rf dist services/ai/.pytest_cache ;;
  deploy)
    host="\${2:?usage: $0 [--dry-run] deploy <host>}"
    [[ -d dist ]] || { echo "error: dist/ not found, build first" >&2; exit 1; }
    run rsync -az --delete dist/ "$host:/srv/app/"
    run ssh "$host" 'sudo systemctl restart devatlas' ;;
  *) echo "usage: $0 [--dry-run] setup|test|lint|clean|deploy <host>" >&2; exit 2 ;;
esac`,
        },
        output: "[dry-run] rsync -az --delete dist/ devatlas-prod:/srv/app/\n[dry-run] ssh devatlas-prod sudo\\ systemctl\\ restart\\ devatlas\nexit=0\nusage: scripts/dev.sh [--dry-run] setup|test|lint|clean|deploy <host>\nexit=2\nerror: dist/ not found, build first\nexit=1",
      },
    },
  },
  deeper: [
    { label: "GNU Bash Reference Manual", url: "https://www.gnu.org/software/bash/manual/bash.html" },
    { label: "ShellCheck: find bugs in your shell scripts", url: "https://www.shellcheck.net/" },
    { label: "OpenSSH manual pages", url: "https://www.openssh.com/manual.html" },
    { label: "man7: ssh_config(5)", url: "https://man7.org/linux/man-pages/man5/ssh_config.5.html" },
    { label: "GitHub Docs: Connecting to GitHub with SSH", url: "https://docs.github.com/en/authentication/connecting-to-github-with-ssh" },
    { label: "rsync documentation", url: "https://rsync.samba.org/documentation.html" },
  ],
  nextPreview: "Next: Git. You will understand what a commit really is, why branches are cheap, and how to resolve a merge conflict without panic.",
};
