import type { Lesson } from "../../types";

export const lesson: Lesson = {
  id: "0.2.1",
  title: "The terminal: files, permissions, processes and pipes",
  minutes: 60,
  level: "Beginner",
  prerequisites: ["0.1.1 What happens when you type a URL", "A Linux or macOS terminal, or WSL on Windows"],
  summary: "Navigate a server, read logs, fix permissions, find the process eating your CPU and chain small commands into powerful ones.",
  terms: [
    { term: "Shell", def: "The program that reads your commands and runs them, usually bash or zsh." },
    { term: "Path", def: "The location of a file. Absolute paths start at / (the root); relative paths start from the current directory." },
    { term: "Permission bits", def: "Read (r=4), write (w=2) and execute (x=1) rights for the owner, the group and everyone else." },
    { term: "Process", def: "A running program with an ID (PID), an owner, memory and open files." },
    { term: "stdin / stdout / stderr", def: "The three standard streams: input, normal output and error output (file descriptors 0, 1 and 2)." },
    { term: "Pipe", def: "The | operator: sends one command's stdout into the next command's stdin." },
    { term: "Signal", def: "A message to a process, e.g. SIGTERM (please stop) or SIGKILL (stop now, cannot be caught)." },
  ],
  problem: [
    "It is 3 a.m. An alert says your API returns 500 errors. You SSH into the server. There is no IDE, no mouse, no dashboard. Just a blinking cursor.",
    "In the next ten minutes you need to find the log file, read the last errors, check if the disk is full, find which process is using all the CPU, and restart the service. Engineers who are fluent in the terminal fix this in minutes. Everyone else waits for someone who is.",
  ],
  concept: {
    analogy: [
      "The Linux terminal is a workshop of small, sharp tools. Each tool does one job very well: `grep` finds lines, `sort` sorts, `wc` counts. A pipe `|` is a conveyor belt between tools. You rarely need a giant tool; you chain small ones.",
    ],
    precise: [
      "Linux follows the Unix philosophy: **everything is a file** (logs, devices, even process info under `/proc`), and **programs read text from stdin and write text to stdout**. This lets the shell connect any program to any other.",
      "Every file has an **owner**, a **group** and **permission bits** for each. Every process has a **PID**, a **user** it runs as, and receives **signals**. Most real problems on servers are one of four things: a missing or wrong file, wrong permissions, a resource (CPU, memory, disk) running out, or a process that is not running.",
    ],
  },
  underTheHood: {
    text: [
      "When you type `grep ERROR app.log | sort | uniq -c`, the shell starts **three processes at the same time** and connects them with pipes. `grep` writes matching lines into the first pipe; `sort` reads them, and only outputs once its input ends; `uniq -c` counts adjacent duplicates. No temporary files are created.",
      "**stderr is not piped by default.** `cmd | grep x` only filters stdout. Errors still go to your screen. Use `2>&1` to merge stderr into stdout when you need both.",
      "Permissions like `-rwxr-x---` read as: file type (`-` file, `d` directory), then owner `rwx`, group `r-x`, others `---`. In octal that is 7 (4+2+1), 5 (4+1), 0, so `chmod 750`.",
    ],
    diagram: {
      title: "A pipeline is a chain of processes",
      nodes: [
        { label: "app.log", sub: "file" },
        { label: "grep ERROR", sub: "filter lines" },
        { label: "sort", sub: "group same lines" },
        { label: "uniq -c", sub: "count" },
        { label: "sort -rn | head", sub: "top offenders" },
      ],
      edges: ["read", "pipe", "pipe", "pipe"],
    },
  },
  handsOn: [
    {
      title: "Navigate and inspect",
      code: {
        lang: "bash",
        code: `pwd                       # where am I?
ls -lah                   # list all files, human-readable sizes
cd /var/log && ls -lt     # newest first
cat /etc/os-release       # which Linux is this?
df -h                     # disk usage per filesystem
du -sh * | sort -h        # which folder is biggest?
free -h                   # memory`,
      },
      notes: ["On macOS, `free` does not exist; use `vm_stat` or Activity Monitor. `/var/log` contents differ between distros."],
    },
    {
      title: "Create a practice log and analyse it",
      text: ["Generate a fake access log, then answer real questions with one-line pipelines."],
      code: {
        lang: "bash",
        file: "make_log.sh",
        code: `mkdir -p ~/lab && cd ~/lab
for i in $(seq 1 500); do
  ip="10.0.0.$((RANDOM % 8))"
  code=$(shuf -n1 -e 200 200 200 200 404 500)
  path=$(shuf -n1 -e /api/users /api/courses /api/news /health)
  echo "$ip - - [$(date '+%d/%b/%Y:%H:%M:%S %z')] \\"GET $path HTTP/1.1\\" $code 512"
done > access.log
wc -l access.log`,
      },
      output: "500 access.log",
      notes: ["`shuf` is part of GNU coreutils. On macOS install coreutils with Homebrew and use `gshuf`, or run this in a Linux container: `docker run -it --rm -v ~/lab:/lab ubuntu bash`."],
    },
    {
      title: "Answer questions with pipelines",
      code: {
        lang: "bash",
        code: `# How many 500 errors?
grep -c '" 500 ' access.log

# Which IPs cause the most 500s?
grep '" 500 ' access.log | awk '{print $1}' | sort | uniq -c | sort -rn | head -3

# Status code breakdown
awk '{print $9}' access.log | sort | uniq -c | sort -rn

# Follow a log live (Ctrl+C to stop)
tail -f access.log`,
      },
      output: "     23 10.0.0.3\n     19 10.0.0.6\n     17 10.0.0.1",
      notes: ["`awk '{print $9}'` prints the 9th whitespace-separated field: here the status code. Your counts will differ because the log is random."],
    },
    {
      title: "Permissions",
      code: {
        lang: "bash",
        code: `echo 'echo hello from script' > hello.sh
./hello.sh            # Permission denied
ls -l hello.sh        # -rw-r--r--
chmod +x hello.sh     # add execute
./hello.sh            # hello from script
chmod 600 secrets.env # owner read/write only (for files holding secrets)`,
      },
    },
    {
      title: "Processes and signals",
      code: {
        lang: "bash",
        code: `sleep 300 &                 # start a background process
ps aux | grep '[s]leep'     # find it (the [s] trick hides the grep itself)
top                         # live view; press q to quit (htop is nicer if installed)
kill <PID>                  # polite SIGTERM: lets the app clean up
kill -9 <PID>               # SIGKILL: last resort, no cleanup

# On systemd-based servers
sudo systemctl status nginx
sudo journalctl -u nginx --since "10 min ago"`,
      },
    },
  ],
  companies: [
    "**Incident response** at most companies still ends at a terminal. Even with dashboards (Grafana, Datadog), engineers SSH or `kubectl exec` into a box to confirm a hypothesis: is the disk full, is the process alive, what is in the last 100 log lines.",
    "**Containers are Linux.** Every Docker image and Kubernetes pod is a Linux process with a filesystem. Debugging them uses exactly these commands. Cloud servers on AWS and Azure default to Linux images for most workloads.",
    "**Automation starts as a pipeline.** Many cron jobs, CI steps and data fixes begin life as a one-liner an engineer typed during an incident, then got saved as a script and reviewed.",
  ],
  mistakes: [
    { mistake: "chmod 777 to 'fix' permission errors", why: "It makes the error go away instantly", wrong: "Any user or compromised process can modify or replace the file", fix: "Find which user needs access (ls -l, ps aux) and grant only that, e.g. chown app:app and chmod 640" },
    { mistake: "kill -9 as the first move", why: "It always works", wrong: "The app cannot flush buffers, close connections or remove lock files, causing data loss or a stuck restart", fix: "Send SIGTERM, wait a few seconds, use SIGKILL only if it is still alive" },
    { mistake: "rm -rf with a variable path", why: "Scripts build paths dynamically", wrong: "If $DIR is empty, `rm -rf $DIR/` becomes `rm -rf /`", fix: "Use `set -u`, quote variables and write `rm -rf \"${DIR:?}\"/` so it fails when DIR is empty" },
    { mistake: "Reading a 5 GB log with cat", why: "cat is the first command people learn", wrong: "Your terminal floods and the server slows down", fix: "Use tail -n 200, less, or grep to read only what you need" },
    { mistake: "Working as root all the time", why: "Avoids sudo prompts", wrong: "One typo can destroy the system; malware gets full control", fix: "Use a normal user and sudo for the specific commands that need it" },
  ],
  bestPractices: [
    { tag: "Security", text: "Least privilege: services run as their own non-root user; secret files are 600 and owned by that user." },
    { tag: "Reliability", text: "Start scripts with `set -euo pipefail` so they stop on errors, unset variables and failed pipeline stages." },
    { tag: "Maintainability", text: "When a one-liner is useful twice, save it as a script with a comment and put it in version control." },
    { tag: "Performance", text: "Filter early in a pipeline: `grep` before `sort`, so later stages process less data." },
  ],
  interview: [
    { q: "A server is slow. What commands do you run first?", a: "uptime (load average), top or htop (CPU and memory per process), df -h (disk full?), free -h (memory and swap), then the application's logs with tail or journalctl. I am narrowing down which resource is saturated before guessing." },
    { q: "What is the difference between SIGTERM and SIGKILL?", a: "SIGTERM asks the process to stop and can be handled, so the app can finish requests and clean up. SIGKILL is handled by the kernel, cannot be caught, and stops the process immediately. Kubernetes and systemd send SIGTERM first and SIGKILL after a grace period." },
    { q: "Explain chmod 640.", a: "Owner read and write (6 = 4+2), group read (4), others nothing (0). Typical for config files a service group must read but not change." },
  ],
  quickCheck: [
    {
      kind: "output",
      prompt: "What does this print?",
      code: { lang: "bash", code: "printf 'b\\na\\nb\\nb\\n' | uniq -c" },
      options: ["3 b and 1 a", "1 b, 1 a, 2 b", "1 a and 3 b", "a b"],
      answer: 1,
      explanation: "uniq only collapses adjacent duplicates. That is why you almost always run sort before uniq -c.",
    },
    {
      kind: "mcq",
      prompt: "Which permission is right for a file containing database passwords that only the app user should read?",
      options: ["777", "644", "600", "755"],
      answer: 2,
      explanation: "600 = owner read/write, nobody else. 644 lets every user on the machine read it.",
    },
    {
      kind: "bug",
      prompt: "This script deleted far more than intended. Why?",
      code: { lang: "bash", code: "#!/bin/bash\nBUILD_DIR=$(get_build_dir)   # returned nothing\nrm -rf $BUILD_DIR/*" },
      options: ["rm needs sudo", "Empty variable made it `rm -rf /*`", "The * is not expanded", "Bash does not support $()"],
      answer: 1,
      explanation: "An empty variable expands to nothing, leaving `/*`. Use set -u and \"${BUILD_DIR:?}\" so the script fails instead.",
    },
  ],
  cheatSheet: [
    "Find: `ls -lah`, `find . -name '*.log'`, `grep -rn 'text' .`",
    "Read: `less`, `tail -n 100`, `tail -f`, `head`",
    "Count and rank: `sort | uniq -c | sort -rn | head`",
    "Disk and memory: `df -h`, `du -sh *`, `free -h`",
    "Processes: `ps aux`, `top`, `kill PID`, `kill -9` only as last resort",
    "Permissions: r=4 w=2 x=1; owner/group/others; secrets = 600",
    "Streams: `>` overwrite, `>>` append, `2>&1` merge stderr",
    "Safe scripts: `set -euo pipefail` and quote every variable",
  ],
  homework: {
    basic: {
      title: "Log detective",
      brief: ["Using the generated access.log, answer with one pipeline each: total requests per path, the IP with the most 404s, and the percentage of requests that failed (status ≥ 400)."],
      criteria: ["Three pipelines, each a single line", "Correct numbers for your log", "A comment explaining each stage"],
      hints: ["Field 7 is the path, field 9 is the status code.", "awk can compute: `awk '$9>=400{f++} END{print f/NR*100}'`"],
      solution: {
        text: ["Let awk do both filtering and arithmetic; it avoids several extra processes."],
        code: {
          lang: "bash",
          code: `awk '{print $7}' access.log | sort | uniq -c | sort -rn          # requests per path
awk '$9==404 {print $1}' access.log | sort | uniq -c | sort -rn | head -1
awk '$9>=400 {f++} END {printf "%.1f%% failed\\n", f/NR*100}' access.log`,
        },
        pitfalls: ["Using grep '404' which also matches paths or sizes containing 404", "Forgetting sort before uniq -c"],
      },
    },
    intermediate: {
      title: "Server health script",
      brief: ["Write `health.sh` that prints: hostname, uptime/load, disk usage of /, memory usage, and the top 5 processes by CPU. It must exit with code 1 if disk usage is above 90%."],
      criteria: ["Starts with set -euo pipefail", "Readable sectioned output", "Correct exit code based on disk usage"],
      hints: ["`df --output=pcent / | tail -1 | tr -dc '0-9'` gives the number (GNU df).", "`ps aux --sort=-%cpu | head -6`"],
      solution: {
        text: ["Keep checks independent and make the script's exit code meaningful so it can be used by cron or a monitoring agent."],
        code: {
          lang: "bash",
          file: "health.sh",
          code: `#!/usr/bin/env bash
set -euo pipefail

echo "== Host: $(hostname)"
echo "== Uptime: $(uptime)"
echo "== Memory"; free -h
echo "== Top CPU processes"; ps aux --sort=-%cpu | head -6

usage=$(df --output=pcent / | tail -1 | tr -dc '0-9')
echo "== Disk / usage: \${usage}%"
if (( usage > 90 )); then
  echo "ALERT: disk above 90%" >&2
  exit 1
fi`,
        },
        pitfalls: ["Parsing `df -h` columns by position, which breaks on long device names", "Printing alerts to stdout instead of stderr"],
      },
    },
    challenge: {
      title: "Find the disk hog",
      brief: ["Simulate an incident: create a 500 MB file somewhere deep in your home directory (`fallocate -l 500M` or `dd`). Then, pretending you do not know where it is, find it using only terminal commands, and write down the exact investigation steps."],
      criteria: ["Investigation goes from broad (df) to narrow (du, find)", "Final command that lists the largest files", "Short incident note: symptom, cause, fix, prevention"],
      hints: ["`du -xh ~ --max-depth=2 | sort -h | tail`", "`find ~ -type f -size +100M -exec ls -lh {} +`"],
      solution: {
        text: [
          "1. `df -h` confirms which filesystem is full. 2. `du -xh --max-depth=1 <mount> | sort -h` finds the biggest top-level folder; repeat one level deeper. 3. `find <dir> -type f -size +100M` lists the large files. 4. Check if a process still holds a deleted file open with `lsof +L1`: deleted-but-open files keep using disk until the process restarts, a classic surprise in real incidents.",
          "Prevention: log rotation (logrotate), disk alerts at 80%, and size limits on temp directories.",
          "Set up the incident with `mkdir -p ~/.cache/thumbnails/old/x && fallocate -l 500M ~/.cache/thumbnails/old/x/core.12345`, then run `./find_disk_hog.sh ~`. The script follows the same path as a human: df, then du one level at a time into the biggest child, then find for files over 100 MB, then lsof +L1 for deleted files that are still open.",
          "Incident note. Symptom: / at 98%, writes failing. Cause: a 500 MB core dump under ~/.cache/thumbnails/old/x. Fix: confirm nothing needs it, delete it, re-run df. Prevention: as above, plus a size limit or cleanup job for cache directories.",
        ],
        code: { lang: "bash", file: "find_disk_hog.sh", code: `#!/usr/bin/env bash
# Find what is eating a filesystem, from broad (df) to narrow (du, find, lsof).
# usage: ./find_disk_hog.sh [start-dir] [min-file-size]   e.g. ./find_disk_hog.sh ~ 100M
set -euo pipefail

start="\${1:-$HOME}"
min_size="\${2:-100M}"
[[ -d "$start" ]] || { echo "error: $start is not a directory" >&2; exit 2; }

echo "== 1. Which filesystem is full?"
df -h "$start"

echo; echo "== 2. Drill down: biggest child at each level (-x stays on this filesystem)"
dir="$start"
while true; do
  du -xh --max-depth=1 "$dir" 2>/dev/null | sort -h | tail -n 4
  # biggest child directory (last line of du is the directory itself, so skip it)
  next=$(du -xk --max-depth=1 "$dir" 2>/dev/null | sort -n | tail -n 2 | head -n 1 | cut -f2-)
  [[ "$next" != "$dir" && -n "$next" ]] || break
  echo "   -> $next"
  dir="$next"
done

echo; echo "== 3. Largest files over $min_size under $start"
find "$start" -xdev -type f -size +"$min_size" -printf '%s\\t%TY-%Tm-%Td %TH:%TM\\t%p\\n' 2>/dev/null |
  sort -rn | head -n 10 |
  awk -F'\\t' '{ printf "%8.0f MB  %s  %s\\n", $1/1024/1024, $2, $3 }'

echo; echo "== 4. Deleted files still held open by a process (space not freed yet)"
if command -v lsof >/dev/null 2>&1; then
  # NLINK 0 = deleted. Ignore anonymous memfd regions; they are not on this disk.
  lsof -nP +L1 2>/dev/null | awk 'NR==1 || ($7 > 100*1024*1024 && $0 !~ /memfd:/)' || true
else
  echo "lsof not installed (apt install lsof)"
fi` },
        pitfalls: ["Running du without -x, so it also walks other mounted filesystems and blames the wrong disk", "Deleting a log a process still has open: the space is not freed until the process restarts or reopens the file"],
      },
    },
    capstone: {
      title: "DevAtlas step 2: project scripts",
      brief: ["Add a `scripts/` folder to DevAtlas with `setup.sh` that checks required tools (git, node, docker, dotnet, python3) and prints which are missing with install hints."],
      criteria: ["Uses `command -v` to detect tools", "Exits non-zero if any tool is missing", "Documented in the README"],
      hints: ["`command -v docker >/dev/null 2>&1 || missing+=(docker)`"],
      solution: {
        text: ["A loop over required tools with an array of missing ones keeps the script short and extendable."],
        code: {
          lang: "bash",
          file: "scripts/setup.sh",
          code: `#!/usr/bin/env bash
set -euo pipefail
required=(git node docker dotnet python3)
missing=()
for tool in "\${required[@]}"; do
  if command -v "$tool" >/dev/null 2>&1; then
    echo "ok       $tool"
  else
    echo "missing  $tool"; missing+=("$tool")
  fi
done
if (( \${#missing[@]} )); then
  echo "Install: \${missing[*]} (see README > Setup)" >&2
  exit 1
fi`,
        },
      },
    },
  },
  deeper: [
    { label: "GNU Coreutils manual", url: "https://www.gnu.org/software/coreutils/manual/coreutils.html" },
    { label: "Bash Reference Manual", url: "https://www.gnu.org/software/bash/manual/bash.html" },
    { label: "The Linux man-pages project", url: "https://man7.org/linux/man-pages/" },
    { label: "Microsoft: Install WSL", url: "https://learn.microsoft.com/en-us/windows/wsl/install" },
  ],
  nextPreview: "Next: shell scripting and SSH. Automate the commands you just learned with safe Bash scripts, and connect to servers securely with keys.",
};
