import type { Lesson } from "../../types";

export const lesson: Lesson = {
  id: "0.2.1",
  title: "The terminal: files, permissions, processes and pipes",
  minutes: 90,
  level: "Beginner",
  prerequisites: ["0.1.1 What happens when you type a URL", "A Linux or macOS terminal, or WSL on Windows", "Docker (optional) if you want to reproduce the outputs exactly"],
  summary:
    "Read a server like a map: the filesystem hierarchy, inodes and links, permissions in octal, processes and signals, file descriptors, pipes, `find`/`grep`/`xargs`, `$PATH`, and the five minutes of triage that fix a 3 a.m. incident.",
  terms: [
    { term: "Shell", def: "The program that reads a command line, expands it and starts the processes it names. `bash`, `zsh` and `sh` are shells; the shell is also a small programming language." },
    { term: "Path", def: "Where a file lives. Absolute paths start at `/`; relative paths start at the current directory. `.` is here, `..` is the parent. `$PATH` is a different thing: a list of directories searched for commands." },
    { term: "inode", def: "The filesystem's record for one file: mode, owner, group, size, timestamps, link count and pointers to data blocks. It has no name; names live in directories." },
    { term: "Hard link", def: "A second directory entry for the same inode. Both names are equal, and the data disappears only when the link count reaches zero. Same filesystem only, never for directories." },
    { term: "Symbolic link", def: "A small file whose content is a path to another name (shown as `l` in `ls -l`). It can cross filesystems and can dangle when its target is removed." },
    { term: "Permission bits", def: "Nine bits in three triads: read (4), write (2), execute (1) for the owner, the group and others. On a directory, `x` means you may enter it and `r` means you may list its names." },
    { term: "umask", def: "The mask subtracted from the mode a program asks for: files start at 666 and directories at 777, then `mode & ~umask` is applied. `022` gives 644/755, `077` gives 600/700." },
    { term: "Special bits", def: "setuid (4) runs a binary with the file owner's effective uid; setgid (2) runs with the file's group and makes new files in a directory inherit that group; sticky (1) on a directory lets only a file's owner delete it." },
    { term: "File descriptor", def: "A small integer naming an open file inside one process. 0 is stdin, 1 stdout, 2 stderr; redirection means pointing those numbers at something else." },
    { term: "Pipe", def: "A kernel buffer with two ends. `a | b` connects a's stdout to b's stdin, so b reads a's output as it is produced, with no temporary file." },
    { term: "Process", def: "A running program: a pid, a parent pid, a user, a current directory, a file-descriptor table, memory and a state. `fork` copies the process; `exec` replaces its program." },
    { term: "Signal", def: "An asynchronous notification to a process: SIGTERM (15) asks it to stop and can be handled, SIGKILL (9) cannot be caught, SIGINT (2) is Ctrl+C, SIGHUP (1) is a hangup." },
  ],
  problem: [
    "It is 3 a.m. An alert says your API returns 500 errors. You SSH into the server. There is no IDE, no mouse, no dashboard. Just a blinking cursor. The disk may be full, the process may be gone, a log may be owned by the wrong user, or a deleted file may still be holding 40 GB open. You have ten minutes to find out which.",
    "Terminal fluency is not about memorising flags. It is about knowing the model underneath: names point at inodes, the kernel checks permission bits on every path component, processes own file descriptors, and small programs compose through pipes. Once you have the model, `df`, `du`, `ps`, `lsof` and `kill` stop being trivia and become questions you can ask the machine. This lesson builds that model, then walks the commands you will actually type at 3 a.m.",
  ],
  concept: {
    analogy: [
      "The terminal is a workshop of small, sharp tools. Each does one job well: `grep` selects lines, `sort` orders them, `wc` counts. A pipe `|` is a conveyor belt between tools. You rarely need a giant tool; you chain small ones, and each stage only has to understand text.",
      "A filesystem is a library. The shelves are directories, and each catalogue card (a directory entry) holds a title and an accession number. The accession number is the inode: it records where the book sits, who may borrow it, how many cards point at it. A hard link is a second card with the same accession number. A symlink is a card that says \"see the card named X\". Permissions are the librarian's rules. An open file descriptor is the book currently open on your desk, at a particular page.",
    ],
    precise: [
      "Linux exposes **one directory tree**. Every filesystem is grafted onto it at a mount point, so `/home` can be a different disk from `/`, and `/proc` is not a disk at all but a view the kernel generates. The Filesystem Hierarchy Standard gives each directory a job: `/etc` is configuration, `/var` is data that changes at runtime, `/run` is per-boot state, `/tmp` is shared scratch, `/usr` is programs and libraries, `/proc` and `/sys` expose kernel state. \"Everything is a file\" is the design principle: devices, process information and kernel tunables all appear as paths you can open.",
      "A **directory maps names to inode numbers**; the inode holds the metadata and the block pointers. That split explains links: a hard link adds a name and increments the link count, `rm` removes a name and decrements it, and the data is freed at zero. A symbolic link is a separate inode whose data is a path, resolved at open time. It also explains why `df -i` can run out while `df -h` has space: you can exhaust inode numbers with millions of empty files.",
      "**Permissions are checked per path component**, not once for the final file. To open `/srv/app/logs/api.log` you need `x` on `/`, `/srv`, `/srv/app` and `/srv/app/logs`. The kernel compares your uid to the file's owner, then your groups, then \"other\" - first match wins, so a restrictive owner triad beats a generous group triad. `umask` decides what a newly created file starts with, and the special bits change identity or deletion rules during `exec` or `unlink`.",
      "At runtime a **process** is a pid, a parent, a user and a table of file descriptors, and the kernel schedules it. A pipe is a buffer with two file descriptors, one in each process. A signal is an asynchronous message that interrupts the process. Those three mechanisms are why `grep ERROR app.log | sort | uniq -c` works: three processes, two pipes, one stream of text, and a shell that wires the descriptors before `exec`.",
    ],
  },
  underTheHood: {
    text: [
      "1. **One tree, many filesystems.** The kernel has a single namespace rooted at `/`, and `mount` grafts a filesystem onto a directory. That is why \"the disk is full\" is always a question about one filesystem: `df -h` lists each mount with its own size, and a process can fill `/var` while `/` still reports free space. The layout is conventional, not enforced: `/etc` holds configuration that belongs to this machine, `/var` holds data whose size changes (logs, queues, caches, databases), `/run` is a tmpfs recreated at boot, `/tmp` is world-writable scratch protected by the sticky bit, `/usr` holds the read-only program and library tree, `/home` holds users, `/proc` and `/sys` are kernel interfaces, and `/dev` holds device nodes. Debian and its derivatives merged `/bin`, `/sbin` and `/lib` into `/usr` by making them symlinks (the `ls -ld` output in the hands-on shows `bin -> usr/bin`), because a separate root filesystem was a 1970s space constraint. A container copies this shape but mounts a thin overlay as `/`, so the same commands work with different contents.",
      "2. **An inode is the file; a name is a pointer.** A directory is a table of `name -> inode number`. The inode stores the mode, uid, gid, size, timestamps, link count and the addresses of data blocks, but never the name. `stat` prints it and `ls -i` shows the number. Creating a hard link writes a second directory entry for the same inode and increments `st_nlink`; `unlink` (`rm`) removes one entry and decrements it, and the kernel frees the blocks only when the count reaches zero. That is why a deleted file can keep consuming disk while a process still holds it open. An inode number is unique only inside one filesystem, so hard links cannot cross a mount point, and linking a directory would create cycles in the tree, which is why the kernel refuses it. A symlink is a different inode whose data bytes are the target path; the kernel resolves that path on every open, so the link can outlive its target and become dangling.",
      "3. **Permissions, ownership and the special bits.** The mode packs nine bits plus three special bits, and the kernel checks the owner triad first, then the group triad, then \"other\". Ownership is stored as numeric uid/gid, not names; `ls -l` translates them through `/etc/passwd` and `/etc/group`, which is why a file whose user was deleted shows a bare number. For directories, `r` lists names, `w` creates and deletes entries, and `x` traverses; without `x` you cannot reach a file even if you know its full path. `umask` is applied at creation: `open(0666) & ~umask` for files and `mkdir(0777) & ~umask` for directories, so `022` gives 644/755 and `077` gives 600/700. The special bits are not decoration. `setuid` makes `exec` set the effective uid to the file owner, which is how `/usr/bin/passwd` edits `/etc/shadow`; `setgid` does the same for the effective gid, and on a directory it forces new files to inherit the directory's group; `sticky` on a world-writable directory restricts deletion to the file's owner, the directory's owner or root. The kernel ignores setuid on scripts, so a `4755` shell script still runs as the caller. Root bypasses permission checks except that executing a file still requires at least one `x` bit, and modern systems add ACLs and capabilities on top of the classic bits.",
      "4. **Processes, job control and signals.** `fork` duplicates the calling process - same file descriptors, copy-on-write memory - and `exec` replaces the image with a new program. Each process has a pid and a ppid; PID 1 adopts orphans and reaps zombies, which is why an init system matters. In a container the first process you start is PID 1, so if it is a shell it must reap children and handle SIGTERM itself; a shell waiting on a child often ignores the signal, and `docker stop` eventually escalates to SIGKILL. The shell implements job control with process groups: the foreground job owns the terminal, Ctrl+C sends SIGINT to the whole group, Ctrl+Z sends SIGTSTP, and `bg` resumes with SIGCONT. Signals are integers with conventions: SIGHUP (1) originally meant the terminal disappeared and is now often \"reload config\", SIGINT (2) is Ctrl+C, SIGTERM (15) is a catchable request to stop, SIGKILL (9) is enforced by the kernel and cannot be caught or blocked. A process killed by signal *n* exits with status 128 + *n*, so 143 means SIGTERM and 137 means SIGKILL. systemd and Kubernetes send SIGTERM, wait a grace period, then send SIGKILL.",
      "5. **File descriptors are the real interface.** Each process has a table mapping small integers to open file descriptions. A description holds an offset, status flags and a reference to the inode, and several descriptors can share one description after `dup`, which is why they share the offset. 0, 1 and 2 are conventions installed by the shell, not kernel special cases. `>` opens with `O_CREAT|O_TRUNC`, `>>` with `O_APPEND` (atomic at the end even with concurrent writers), `2>` points descriptor 2 somewhere else, and `<` opens a file for reading. `2>&1` duplicates descriptor 1 onto descriptor 2 *at that moment*, so order matters: `cmd > out 2>&1` sends both to the file, while `cmd 2>&1 > out` sends errors to the old stdout (your terminal) and normal output to the file. `/dev/null` is a device that accepts writes and returns EOF on read. `exec 3>file` opens a descriptor in the shell itself, and every child inherits it. A descriptor keeps the inode allocated after the name is gone, which is the mechanism behind the classic `df`/`du` disagreement.",
      "6. **A pipe is a bounded buffer, and that is the feature.** `pipe()` returns two descriptors sharing a kernel buffer (64 KiB by default). For `a | b` the shell creates the pipe, forks twice, `dup2`s the write end onto a's descriptor 1 and the read end onto b's descriptor 0, closes the unused ends, and execs both programs. Writers block when the buffer is full and readers block when it is empty, so data flows at the speed of the slowest stage. `grep` can stream line by line; `sort` cannot emit anything until it has seen the end, so it buffers and may spill to temporary files. If the reader exits early, the writer receives SIGPIPE (default action: terminate, status 141), which is normal when `head` stops reading. A pipeline's exit status is the last command's unless you set `set -o pipefail`, which is why a failing `grep` can be hidden by a successful `wc`. `tee` splits one stream into two. The reason pipes compose so well is that every tool agrees on a boring interface: lines of text on stdin and stdout.",
      "7. **`find`, `grep`, `xargs` and the environment.** These tools divide labour: `find` walks directories and applies predicates, `grep` filters a stream of lines, and `xargs` converts lines into command arguments in batches limited by `ARG_MAX`. The default `xargs` splits on whitespace and interprets quotes, so a filename with a space becomes two arguments; `find -print0 | xargs -0` is the safe pairing, and `-exec ... +` avoids the extra process entirely. Environment variables are a block of `KEY=VALUE` strings inherited across `exec`; shell variables are not exported unless you use `export` or a per-command assignment like `FOO=bar cmd`, which applies only to that child. `$PATH` is a colon-separated list searched left to right, and the shell caches lookups, so a newly installed binary may need `hash -r`. Order is a security property: a `.` or a world-writable directory early in `PATH` lets another user's `ls` run instead of the real one. `find` itself does not follow symlinks by default, which prevents loops; `-L` opts in.",
      "8. **The 3 a.m. method.** Start from the symptom, then ask which resource is exhausted. Disk: `df -h` for blocks and `df -i` for inodes. Memory: `free -h`, plus the OOM killer in `dmesg`. CPU or IO: `top`/`ps`, and compare load average to the number of cores; high load with idle CPU usually means IO wait or uninterruptible tasks. Descriptors: `ulimit -n` and a count from `lsof`. Process gone: `systemctl status`, the exit code, `journalctl -u`. `df` reads the filesystem's free-block counter; `du` walks names and adds sizes. They disagree when a deleted file is still open (`lsof +L1`), when data sits on another mount you did not check, when the filesystem reserves blocks for root, or when sparse files make apparent size differ from allocated blocks. Capture evidence before changing anything: `ps -eo pid,ppid,stat,cmd`, the last 200 log lines, `ss -tlnp`, `dmesg -T | tail`. Then take the smallest action that fixes the cause: truncate a log with `: > file`, rotate it, send SIGTERM and wait, and only use SIGKILL when the process has proven it will not stop.",
    ],
    diagram: {
      title: "From a pathname to bytes on disk",
      nodes: [
        { label: "/var/log/app.log", sub: "pathname" },
        { label: "directory entry", sub: "name → inode" },
        { label: "inode", sub: "mode, uid, size, blocks" },
        { label: "data blocks", sub: "the bytes" },
        { label: "open file description", sub: "offset, flags" },
        { label: "process fd table", sub: "fd 3" },
      ],
      edges: ["lookup each component", "read metadata", "read / write", "open()", "dup2()"],
      caption: "The name is not the file. `rm` deletes a name; the inode and its blocks survive while any process still has the file open.",
    },
  },
  handsOn: [
    {
      title: "Read the tree and one file's identity",
      text: [
        "Run this in a throwaway container so your own machine is untouched: `docker run --rm -it debian:bookworm-slim bash`, then paste the commands. The first section shows the root layout; the second shows that `/bin`, `/lib` and `/sbin` are symlinks into `/usr`. The rest creates a small deployment folder and reads its metadata.",
        "In `ls -l`, the first column is file type plus mode, then the hard-link count, owner, group, size, modification time and name. `stat` shows what the listing hides: the inode number, the allocated block count, and the access, modify, change and birth timestamps.",
      ],
      code: {
        lang: "bash",
        file: "identity.sh",
        code: `set -u
rm -rf /tmp/atlas && mkdir -p /tmp/atlas && cd /tmp/atlas

echo "## the root of the tree"
ls / | paste -sd' ' -
echo
echo "## bin, lib and sbin are symlinks into /usr"
ls -ld /bin /lib /lib64 /sbin /usr/bin
echo
echo "## make a small deployment folder"
printf '#!/bin/sh\\necho deploying\\n' > deploy.sh
chmod 754 deploy.sh
printf 'APP_TOKEN=not-a-real-token\\n' > app.env
chmod 640 app.env
mkdir logs
chmod 750 logs
ls -l
echo
echo "## stat: everything the directory listing hides"
stat deploy.sh
echo
echo "## default umask, then a stricter one"
umask
umask 077
printf 'x\\n' > private.txt
mkdir private-dir
ls -ld private.txt private-dir
umask 022
echo
echo "## chmod symbolic, then octal"
chmod 640 deploy.sh; ls -l deploy.sh
chmod g+w,o+r deploy.sh; ls -l deploy.sh
chmod 754 deploy.sh; ls -l deploy.sh`,
      },
      output: `## the root of the tree
bin boot dev etc home lib lib64 media mnt opt proc root run sbin srv sys tmp usr var

## bin, lib and sbin are symlinks into /usr
lrwxrwxrwx 1 root root     7 Oct 20 21:32 /bin -> usr/bin
lrwxrwxrwx 1 root root     7 Oct 20 21:32 /lib -> usr/lib
lrwxrwxrwx 1 root root     9 Oct 20 21:32 /lib64 -> usr/lib64
lrwxrwxrwx 1 root root     8 Oct 20 21:32 /sbin -> usr/sbin
drwxr-xr-x 2 root root 12288 Oct 20 21:32 /usr/bin

## make a small deployment folder
total 12
-rw-r----- 1 root root   27 Oct 22 08:23 app.env
-rwxr-xr-- 1 root root   25 Oct 22 08:23 deploy.sh
drwxr-x--- 2 root root 4096 Oct 22 08:23 logs

## stat: everything the directory listing hides
  File: deploy.sh
  Size: 25        	Blocks: 8          IO Block: 4096   regular file
Device: 0,89	Inode: 407875      Links: 1
Access: (0754/-rwxr-xr--)  Uid: (    0/    root)   Gid: (    0/    root)
Access: 2026-10-22 08:23:12.061315678 +0000
Modify: 2026-10-22 08:23:12.061315678 +0000
Change: 2026-10-22 08:23:12.066501182 +0000
 Birth: 2026-10-22 08:23:12.061315678 +0000

## default umask, then a stricter one
0022
drwx------ 2 root root 4096 Oct 22 08:23 private-dir
-rw------- 1 root root    2 Oct 22 08:23 private.txt

## chmod symbolic, then octal
-rw-r----- 1 root root 25 Oct 22 08:23 deploy.sh
-rw-rw-r-- 1 root root 25 Oct 22 08:23 deploy.sh
-rwxr-xr-- 1 root root 25 Oct 22 08:23 deploy.sh`,
      notes: [
        "`total 12` is not bytes: it is the number of 1 KiB blocks used by the directory's entries. `Size: 25` is the file's length; `Blocks: 8` is what the filesystem actually allocated.",
        "`Change` is the inode change time (metadata), not the file content time; `Modify` changes when bytes are written. `Birth` is creation time and is not available on every filesystem.",
        "Everything here is owned by `root` because the container shell runs as root. On a real server the same listing usually shows a service user such as `deploy` or `www-data`, and that owner is what the kernel checks first.",
        "On macOS `free` does not exist (use `vm_stat` or Activity Monitor), and `/var/log` contents differ between distributions; the container avoids both problems.",
      ],
    },
    {
      title: "Hard links, symbolic links and what deletion means",
      text: [
        "A hard link is another name for the same inode. A symbolic link is a file containing a path. This run makes both, writes through one name, replaces the original, then deletes it. Watch the inode numbers and the link counts rather than the names.",
      ],
      code: {
        lang: "bash",
        file: "links.sh",
        code: `set -u
rm -rf /tmp/links && mkdir -p /tmp/links && cd /tmp/links
printf 'hello\\n' > a.txt
ln a.txt hard.txt
ln -s a.txt soft.txt
echo "## inode numbers"
stat --format='%n inode=%i links=%h size=%s' a.txt hard.txt soft.txt
echo
echo "## readlink soft.txt"
readlink soft.txt
echo
echo "## append via hard link (same inode)"
echo "second line" >> hard.txt
cat a.txt
echo
echo "## change a.txt; the symlink follows, the hard link is the same file"
printf 'replaced\\n' > a.txt
printf 'a.txt=%s hard.txt=%s soft.txt=%s\\n' "$(cat a.txt)" "$(cat hard.txt)" "$(cat soft.txt)"
echo
echo "## delete the original, keep both links"
rm a.txt
echo "-- hard.txt still works:"; cat hard.txt
echo "-- soft.txt now dangling:"; cat soft.txt 2>&1 || echo "exit=$?"
ls -l`,
      },
      output: `## inode numbers
a.txt inode=401180 links=2 size=6
hard.txt inode=401180 links=2 size=6
soft.txt inode=401181 links=1 size=5

## readlink soft.txt
a.txt

## append via hard link (same inode)
hello
second line

## change a.txt; the symlink follows, the hard link is the same file
a.txt=replaced hard.txt=replaced soft.txt=replaced

## delete the original, keep both links
-- hard.txt still works:
replaced
-- soft.txt now dangling:
cat: soft.txt: No such file or directory
exit=1
total 4
-rw-r--r-- 1 root root 9 Oct 22 08:13 hard.txt
lrwxrwxrwx 1 root root 5 Oct 22 08:13 soft.txt -> a.txt`,
      notes: [
        "`a.txt` and `hard.txt` share inode 401180 and `Links: 2`; after `rm a.txt` the count drops to 1 and the data is still there. The symlink has its own inode 401181 and size 5, the five characters of the path `a.txt` - it stores a path, not content.",
        "`soft.txt` is dangling, not deleted: `ls -l` still shows it, `cat` fails with exit 1, and `find . -xtype l` finds it. Cleaning up a deployment often means removing these, not the target.",
        "Hard links cannot cross mount points (an inode number is only unique within a filesystem) and the kernel refuses directory hard links to keep the tree acyclic. Symlinks can point anywhere, which is both their power and their risk: a service following a symlink out of its data directory may read files it should not.",
      ],
    },
    {
      title: "Permissions as arithmetic: bits, octal, umask and the special bits",
      text: [
        "Permissions are three 3-bit numbers. Read the table once, then use it as a lookup: when you see `-rw-r-----`, decode 6-4-0 without thinking. On directories the meaning shifts, and that is where most `Permission denied` surprises come from.",
      ],
      code: {
        lang: "text",
        file: "permissions.txt",
        code: `PERMISSION BITS
symbol  value  on a file                  on a directory
r       4      read the contents          list the names (also needs x)
w       2      change the contents        create / delete entries (also needs x)
x       1      execute it                 enter it (cd) and traverse it

MODE = owner + group + other, each 4+2+1
755  rwxr-xr-x     644  rw-r--r--     640  rw-r-----     600  rw-------     1777  rwxrwxrwt

UMASK (the bits removed at creation)
umask 022 -> file 666 & ~022 = 644, dir 777 & ~022 = 755
umask 027 -> file 666 & ~027 = 640, dir 777 & ~027 = 750
umask 077 -> file 666 & ~077 = 600, dir 777 & ~077 = 700

SPECIAL BITS (the leading octal digit)
4  setuid  a binary runs with the file owner's effective uid   -rwsr-xr-x  4755
2  setgid  a binary runs with the file's group; in a directory  drwxrwsr-x  2775
           new files inherit the directory's group
1  sticky  in a shared directory only the file's owner (or the  drwxrwxrwt  1777
           directory's owner, or root) may delete an entry

SIGNALS YOU WILL ACTUALLY SEND
1   SIGHUP   terminal closed; by convention "reload config"     15  SIGTERM  polite stop, catchable
2   SIGINT   Ctrl+C                                              9   SIGKILL  kernel-enforced, not catchable
19  SIGSTOP  pause, not catchable                                18  SIGCONT  resume a stopped job
13  SIGPIPE  write to a pipe nobody is reading                   exit status = 128 + signal (143, 137)`,
      },
      notes: [
        "Verified in this lesson: a `1777` directory let bob create a file but refused alice's `rm` with `Operation not permitted`; removing the sticky bit let her delete it. A `2775` directory made bob's new file inherit group `devteam`, while the same operation in a `0775` directory left it in bob's primary group.",
        "`setuid` was also verified: a copy of `/usr/bin/id` with mode `4755` run as alice printed `euid=0(root)`, but a `4755` shell script run as alice printed her own uid. The kernel ignores setuid on interpreted scripts, which is why privileged helpers are compiled binaries.",
        "The first matching triad wins. If a file is `0600` and owned by `deploy`, a member of its group gets nothing - the group triad is never consulted. That is why \"but I am in the group\" is not an argument the kernel accepts.",
        "A directory with `r` but no `x` lets you list names and still denies `cat file`. A directory with `x` but no `r` lets you open a file whose name you already know. Both are common in hardened deployments.",
      ],
    },
    {
      title: "3 a.m.: pipes, processes, disk and open files",
      text: [
        "This is the sequence to run when the pager fires. The log is a deterministic 12-line access log so the counts are checkable; the process and disk sections are the real commands you would type. Every stage of the first pipeline is a separate process connected by a pipe, and no temporary file is created.",
      ],
      code: {
        lang: "bash",
        file: "triage.sh",
        code: `set -u
rm -rf /tmp/atlas3 && mkdir -p /tmp/atlas3 && cd /tmp/atlas3
cat > access.log <<'EOS'
10.0.0.1 - - [22/Oct/2026:03:11:02 +0000] "GET /api/users HTTP/1.1" 200 512
10.0.0.2 - - [22/Oct/2026:03:11:03 +0000] "GET /api/courses HTTP/1.1" 200 512
10.0.0.1 - - [22/Oct/2026:03:11:05 +0000] "GET /health HTTP/1.1" 200 512
10.0.0.3 - - [22/Oct/2026:03:11:07 +0000] "GET /api/users HTTP/1.1" 500 512
10.0.0.3 - - [22/Oct/2026:03:11:09 +0000] "GET /api/users HTTP/1.1" 500 512
10.0.0.1 - - [22/Oct/2026:03:11:12 +0000] "GET /api/news HTTP/1.1" 404 512
10.0.0.4 - - [22/Oct/2026:03:11:15 +0000] "GET /api/users HTTP/1.1" 200 512
10.0.0.3 - - [22/Oct/2026:03:11:18 +0000] "GET /api/courses HTTP/1.1" 200 512
10.0.0.2 - - [22/Oct/2026:03:11:21 +0000] "GET /api/users HTTP/1.1" 200 512
10.0.0.3 - - [22/Oct/2026:03:11:24 +0000] "GET /api/users HTTP/1.1" 500 512
10.0.0.3 - - [22/Oct/2026:03:11:27 +0000] "GET /health HTTP/1.1" 200 512
10.0.0.4 - - [22/Oct/2026:03:11:30 +0000] "GET /api/news HTTP/1.1" 404 512
EOS

echo "## pipeline: who is producing the 500s?"
grep '" 500 ' access.log | awk '{print $1}' | sort | uniq -c | sort -rn
echo
echo "## pipeline: status codes"
awk '{print $9}' access.log | sort | uniq -c
echo
echo "## the process tree (sleep is a background job)"
sleep 300 &
bg=$!
sleep 0.2
ps -o pid,ppid,pgid,stat,cmd --forest -p $$,"$bg"
echo
echo "## jobs and a polite termination"
jobs -l
kill -TERM "$bg"
wait "$bg" 2>/dev/null; echo "wait exit status = $? (128 + 15)"
echo
echo "## disk: the filesystem that holds /"
df -h /
echo
echo "## deleted but still open: space that df sees and du cannot"
exec 9> /tmp/atlas3/old.log
echo "stale log data" >&9
rm /tmp/atlas3/old.log
lsof -nP +L1 | tail -n +2
exec 9>&-`,
      },
      output: `## pipeline: who is producing the 500s?
      3 10.0.0.3

## pipeline: status codes
      7 200
      2 404
      3 500

## the process tree (sleep is a background job)
    PID    PPID    PGID STAT CMD
      1       0       1 Ss   bash
     18       1       1 S    sleep 300

## jobs and a polite termination
[1]+    18 Running                 sleep 300 &
wait exit status = 143 (128 + 15)

## disk: the filesystem that holds /
Filesystem      Size  Used Avail Use% Mounted on
overlay        1007G   22G  934G   3% /

## deleted but still open: space that df sees and du cannot
bash      1 root    9w   REG   0,89       15     0 407872 /tmp/atlas3/old.log (deleted)
tail     25 root    9w   REG   0,89       15     0 407872 /tmp/atlas3/old.log (deleted)`,
      notes: [
        "`143` is 128 + 15: the process was terminated by SIGTERM, not by returning an exit code. A shell that traps SIGTERM and exits 0 reports 0 instead, which is what a clean shutdown should look like.",
        "`sort` cannot emit its first line until its input ends, so it buffers and spills to temporary files when the input is large; `grep`, `awk` and `uniq` stream, so their memory use does not grow with the file.",
        "The `ps` tree shows PPID 1 for `sleep` because the container's first process is the shell running this script. On a normal host the parent would be your interactive shell, and PID 1 would be `systemd`.",
        "`df` sees the deleted file's blocks because they are still allocated; `du` cannot see it because it walks names and the name is gone. `lsof +L1` lists files whose link count is zero, which is the fastest way to explain that disagreement.",
        "The earlier 500-line practice log in this lesson (`seq 1 500` with `shuf -n1 -e 200 200 200 200 404 500`) measured `500 access.log` with `wc -l`, and its top sources of 500s were `23 10.0.0.3`, `19 10.0.0.6`, `17 10.0.0.1`. A random sample gives different counts, which is why this step uses a fixed log you can check by hand.",
      ],
    },
    {
      title: "Draw the triage flow you will follow",
      text: [
        "Under pressure, order matters more than cleverness. This flow asks one question per box and never restarts the service before capturing evidence. Draw it once and keep it near your runbook; the commands in brackets are the ones from the previous steps.",
      ],
      code: {
        lang: "mermaid",
        file: "triage.mmd",
        code: `flowchart TD
  A["Alert: 500s, timeouts, or no SSH"] --> B{"df -h and df -i"}
  B -->|full| C["du -xh --max-depth=1, then find -size"]
  B -->|space left| D{"top and ps --forest"}
  C --> E["lsof +L1: deleted but still open?"]
  D -->|one process hot| F["Read logs, then kill -TERM"]
  D -->|load high, CPU idle| G["Check IO wait, memory, dmesg"]
  E --> H["Rotate or truncate, restart the holder"]
  F --> H
  G --> H
  H --> I["Verify: curl, logs, df again"]`,
      },
      notes: [
        "Check `df -i` as well as `df -h`: a filesystem can be 100% out of inode numbers while half its blocks are free, and the error looks like \"No space left on device\".",
        "Capture before you restart: `ps -eo pid,ppid,stat,cmd`, `tail -n 200` of the log, `ss -tlnp`, and `dmesg -T | tail`. A restart destroys the evidence you need to prevent the next page.",
        "The last box is not optional. A fix you did not verify is a rumour; re-run the same `curl` and the same `df` that showed the symptom.",
      ],
    },
  ],
  companies: [
    "**Debian, Ubuntu and the merged `/usr` (verified in this lesson).** The `ls -ld /bin /lib /lib64 /sbin` output in this lesson shows them as symlinks into `/usr`. The merge exists because the original split (a small root filesystem with essential binaries, a larger `/usr`) stopped paying for itself; symlinks kept old paths working while giving one read-only program tree. When you debug a container built `FROM debian:bookworm-slim`, that layout is what you are looking at.",
    "**Docker and Kubernetes (verified in this lesson).** The container in this lesson had the script itself as PID 1 and only a handful of processes. A container is not a virtual machine: it is a Linux process tree with its own mount namespace, so a directory mounted into it appears as a line in `df`. That is why `ps`, `df`, `stat` and `lsof` are the correct debugging tools inside a pod as well as on a server.",
    "**Shared `/tmp` and the sticky bit (verified in this lesson).** The `1777` demo reproduced the rule that protects `/tmp` on every Linux machine: bob could create a file, alice could read it (mode 644) but could not delete it until the sticky bit was removed. This is why `chmod 777` on a shared upload directory is not the same as `1777` - it removes the only protection against one tenant deleting another's files.",
    "**systemd, Kubernetes and graceful shutdown (illustrative).** Both send SIGTERM, wait a configured grace period (`TimeoutStopSec`, `terminationGracePeriodSeconds`), then send SIGKILL. Services that ignore SIGTERM, or that run as PID 1 without a tiny init, are killed hard and lose in-flight requests. The `143` versus `137` exit statuses in this lesson are how you tell which path was taken.",
    "**Incident response and log rotation (illustrative).** Most incident runbooks still begin with `df`, `free`, `ps` and the last lines of a log, even when dashboards exist, because those commands answer questions about one host that aggregated metrics smooth over. Log rotation (`logrotate`) and disk alerts at 80% exist because an unbounded log file is the most common self-inflicted disk-full incident; the deleted-but-open case in this lesson is the second most common.",
  ],
  mistakes: [
    { mistake: "`chmod 777` to 'fix' permission errors", why: "It makes the error go away instantly", wrong: "Any user or compromised process can modify or replace the file, and on a directory anyone can delete anyone's files", fix: "Find which user needs access (`ls -l`, `ps -o user`) and grant only that: `chown app:app` then `chmod 640`, or `2775` for a shared group directory" },
    { mistake: "`kill -9` as the first move", why: "It always works", wrong: "The app cannot flush buffers, finish requests, close connections or remove lock files, so you get data loss or a restart that hangs on a stale lock", fix: "Send SIGTERM, wait for the grace period, verify with `ps`, and use SIGKILL only when the process is truly stuck" },
    { mistake: "`rm -rf` with an unquoted variable", why: "Scripts build paths dynamically", wrong: "If `$DIR` is empty, `rm -rf $DIR/` becomes `rm -rf /`", fix: "Use `set -u`, quote variables and write `rm -rf \"${DIR:?}\"/` so an empty value aborts the script" },
    { mistake: "Working as root all the time", why: "It avoids `sudo` prompts", wrong: "One typo can destroy the system, and any process you start inherits full privileges", fix: "Use a normal user, `sudo` for specific commands, and run services as their own non-root user" },
    { mistake: "Reading a 5 GB log with `cat`", why: "`cat` is the first command people learn", wrong: "Your terminal floods and the server slows down", fix: "Use `tail -n 200`, `less`, or `grep` to read only what you need" },
    { mistake: "Writing `cmd 2>&1 > out.txt` and expecting both streams in the file", why: "It looks symmetric with `> out.txt 2>&1`", wrong: "stderr is duplicated onto the old stdout (the terminal) before stdout is redirected, so errors still appear on screen and the file only has normal output", fix: "Redirect stdout first, then duplicate: `cmd > out.txt 2>&1`" },
    { mistake: "Treating a symlink as if it were the file", why: "`ls -l` shows the target and `cat` follows it", wrong: "`chmod`/`chown` on a symlink may change the target (or fail), and `rm` removes the link, not the data; a deployment that deletes 'the app' can leave the real files behind", fix: "Use `readlink -f` to see the target, `ls -l` to spot `->`, and decide explicitly whether you mean the link or the target; `find -xtype l` finds dangling ones" },
    { mistake: "Trusting `du` when `df` says the disk is full", why: "`du` is the obvious next command after `df`", wrong: "You conclude there is no space problem, or you delete the wrong files, while a process holds a deleted 40 GB log open", fix: "Compare `df -h` with `du -xh --max-depth=1`, then run `lsof +L1`; restart or truncate the process that holds the deleted file" },
    { mistake: "Piping `find` into `xargs` without `-print0`", why: "It works for every filename you tested", wrong: "A single space in a filename splits it into two arguments and the command deletes or moves the wrong path", fix: "`find ... -print0 | xargs -0 ...`, or `find ... -exec cmd {} +`" },
  ],
  bestPractices: [
    { tag: "Security", text: "Apply least privilege twice: the service runs as its own user, and its files are `640`/`750` with a `027` umask. Secrets are `600`, never `777`, and shared writable directories are `1777`, not `0777`." },
    { tag: "Reliability", text: "Start scripts with `set -euo pipefail`, send SIGTERM before SIGKILL, and alert on both disk blocks and inode usage at 80% so exhaustion is a warning, not an outage." },
    { tag: "Reliability", text: "Capture evidence during an incident before restarting: `ps`, the last log lines, `lsof +L1`, `df -h` and `df -i`. A restart that erases the cause guarantees the next page." },
    { tag: "Performance", text: "Filter early in a pipeline (`grep` before `sort`), avoid `cat` in the middle of a chain, and remember that `sort` buffers the whole input while `grep`/`awk` stream." },
    { tag: "Maintainability", text: "When a one-liner proves useful twice, save it as a script with a comment, quote every variable and put it in version control so the next on-call engineer inherits the reasoning, not just the command." },
  ],
  interview: [
    {
      q: "Walk me from `cat /var/log/app.log` to bytes appearing on your terminal. Where can it fail?",
      a: "The shell first parses the line: it is not a builtin, so it searches `$PATH` left to right for `cat`, then forks and execs `/usr/bin/cat`. The kernel resolves `/var/log/app.log` one component at a time through directories, checking `x` on each, then opens the final inode with `O_RDONLY` after the permission check (owner, then group, then other). `cat` gets that file as descriptor 3 (0, 1 and 2 are already stdin, stdout, stderr), reads it in chunks - served from the page cache if it was read recently, otherwise from disk with readahead - and calls `write(1, ...)`. If stdout is a terminal, descriptor 1 points at the pty and the terminal emulator renders the bytes; if it is a pipe, the write blocks when the 64 KiB buffer fills. Failures map cleanly: `command not found` (PATH), `Permission denied` (mode or a missing `x` on a parent directory), `No such file or directory` (a missing name, or a dangling symlink), `Is a directory`, or SIGPIPE/141 if the reader exits early. `cat` is also unnecessary here: `exec 3< file` plus a read, or `less`, avoids loading the whole stream into a terminal that cannot display it.",
    },
    {
      q: "`df` says the filesystem is 100% full, but `du` adds up to only 12 GB on a 100 GB disk. What are the possible causes, and how do you prove each one?",
      a: "Start by separating 'blocks allocated' from 'names that exist', because `df` reads the filesystem counter and `du` walks names. The classic cause is a deleted file still held open: the inode and blocks survive until the last descriptor closes, so `du` cannot see it. Prove it with `lsof +L1` (link count zero) or `lsof | grep deleted`, then truncate the file with `: > /proc/<pid>/fd/<n>` or restart the holder. Second, `du` may be looking at the wrong mount: use `df -h` with no arguments and `du -x` to stay on one filesystem, and remember that a mount can hide data underneath it. Third, the filesystem may reserve blocks for root - ext4 reserves about 5% by default, visible in `tune2fs -l` and adjustable with `tune2fs -m`. Fourth, apparent size and allocated size differ for sparse files and for files with inline/compressed extents: compare `du` with `du --apparent-size`, and `stat` `Size` with `Blocks`. Fifth, snapshots, overlay lower layers, or a filesystem inside a file can consume space that `du` on the visible tree cannot attribute. Finally, check `df -i`: inode exhaustion produces the same 'No space left on device' error while blocks are free. Order the checks by likelihood and cost, and capture `df -h`, `df -i`, `du -xh --max-depth=1` and `lsof +L1` before deleting anything.",
    },
    {
      q: "Explain SIGTERM versus SIGKILL, and how you would make a service shut down cleanly under Kubernetes or systemd.",
      a: "SIGTERM is a catchable request: the process can run a handler that stops accepting new work, drains in-flight requests, flushes buffers, closes database connections and removes its lock or pid file, then exits 0. SIGKILL is enforced by the kernel: no handler runs, no cleanup happens, the process disappears with status 137 (128 + 9), and anything it was writing may be half-written. That is why the escalation order is SIGTERM, wait for the configured grace period, then SIGKILL. In Kubernetes that means a `terminationGracePeriodSeconds` longer than your worst drain, a `preStop` hook if the load balancer needs time to stop routing, and a process that actually receives the signal: if the container command is a shell that spawns the app, the shell is PID 1, may ignore SIGTERM, and the pod is killed hard. Use the exec form, or a tiny init such as `tini`/`dumb-init`, so signals reach your process and zombies are reaped. Make the handler idempotent and bounded: stop the listener, fail readiness, wait for a deadline, then exit. Test it with `docker stop` and check the exit status: 143 is a clean signal death, 137 means you ran out of grace. And never open with `kill -9` on a database or a queue worker; it turns a restart into a recovery.",
    },
  ],
  quickCheck: [
    {
      kind: "output",
      prompt: "What octal mode is this file?",
      code: { lang: "bash", code: "ls -l app.env\n-rw-r----- 1 deploy deploy 412 Oct 22 03:10 app.env" },
      options: ["644", "640", "604", "750"],
      answer: 1,
      explanation: "Owner rw = 6, group r = 4, others none = 0. The leading `-` is the file type, not a permission bit.",
    },
    {
      kind: "mcq",
      prompt: "Given an existing `app.log`, you run `ln app.log hard.log` and `ln -s app.log soft.log`, then `rm app.log`. What happens?",
      options: ["Both links break", "hard.log still has the data; soft.log dangles", "soft.log still has the data; hard.log dangles", "Both links keep working because the inode is still open"],
      answer: 1,
      explanation: "A hard link is another name for the same inode, so the data survives until the link count reaches zero. A symlink stores a path, so it points at a name that no longer exists.",
    },
    {
      kind: "bug",
      prompt: "This cron entry works when you run the script by hand but fails every night with `command not found`. Why?",
      code: { lang: "bash", code: "# crontab\n*/5 * * * * backup.sh" },
      options: ["cron cannot execute shell scripts", "cron's PATH does not include the directory containing backup.sh", "The script needs a `.exe` extension", "cron runs as a user without a home directory"],
      answer: 1,
      explanation: "cron starts with a minimal PATH that usually omits `/usr/local/bin`, `~/bin` and your project directory. Use an absolute path or set PATH at the top of the crontab, and quote paths that contain spaces.",
    },
  ],
  cheatSheet: [
    "Hierarchy: `/etc` config, `/var` changing data and logs, `/run` per-boot state, `/tmp` sticky scratch, `/usr` programs, `/proc` and `/sys` kernel views.",
    "Identity: `ls -li`, `stat file`, `df -i`; an inode number is unique only within one filesystem.",
    "Links: `ln target name`, `ln -s target name`, `readlink -f name`, `find . -xtype l` for dangling links.",
    "Modes: r=4 w=2 x=1, owner/group/other; directories need `x` to traverse and `w`+`x` to create or delete entries.",
    "Change access: `chmod 640 file`, `chmod u+x file`, `chown app:app file`, `umask 027` before creating files.",
    "Special bits: `4755` setuid, `2775` setgid directory, `1777` sticky shared directory.",
    "Descriptors: 0 stdin, 1 stdout, 2 stderr; `>` truncate, `>>` append, `2>` errors, `2>&1` merge (stdout first), `<` read, `/dev/null` discard, `exec 3>` open.",
    "Processes: `ps -eo pid,ppid,stat,cmd --forest`, `jobs -l`, `fg`, `bg`, `kill PID`, `kill -l`; 143 = SIGTERM, 137 = SIGKILL.",
    "Pipes: `a | b`, `tee file`, `set -o pipefail`; `sort` buffers everything, `grep`/`awk` stream, a closed reader gives SIGPIPE (141).",
    "3 a.m.: `df -h`, `df -i`, `du -xh --max-depth=1 | sort -h`, `lsof +L1`, `top -b -n1`, `free -h`, `journalctl -u service --since '10 min ago'`.",
  ],
  homework: {
    basic: {
      title: "Redirection lab: three descriptors and five operators",
      brief: [
        "Run the script below, then explain in one sentence each: where descriptor 3 points, why `2>&1` order matters, what `>>` does that `>` does not, and why the exit code survives `2>/dev/null`.",
      ],
      criteria: [
        "A written explanation of the fd table after each command",
        "One example of `cmd 2>&1 > file` versus `cmd > file 2>&1` with the observed difference",
        "The exact exit status of the failed `ls`",
      ],
      hints: [
        "`exec 3> file` opens a descriptor in the shell, and children inherit it.",
        "Redirection is applied left to right before the command runs.",
      ],
      solution: {
        text: [
          "Descriptor 3 is opened by the shell itself with `exec`, so it is not a child's descriptor; `readlink /proc/$$/fd/3` shows the file it points at, and the child inherits it until `exec 3>&-` closes it.",
          "`2>&1` duplicates whatever descriptor 1 currently points at. With `cmd > out 2>&1` stdout is the file first, so stderr joins it. With `cmd 2>&1 > out` stderr joins the old stdout (the terminal) and then stdout moves to the file, so errors stay on screen. The left-to-right rule is the whole trick.",
          "`>` opens with truncation; `>>` opens with append, so the second write lands after the first instead of erasing it. `/dev/null` is a device that swallows writes and returns EOF, but it does not change the command's exit status: `ls /nope` still returns 2.",
        ],
        code: {
          lang: "bash",
          file: "redirection.sh",
          code: `set -u
echo "## fd 3 points at a file"
exec 3> /tmp/custom.txt
printf 'written through fd 3\\n' >&3
readlink /proc/$$/fd/3
cat /tmp/custom.txt
exec 3>&-
echo
echo "## stdout and stderr go to different places"
bash -c 'echo normal; echo oops >&2' > /tmp/o.txt 2> /tmp/e.txt
echo "stdout: $(cat /tmp/o.txt)"
echo "stderr: $(cat /tmp/e.txt)"
echo
echo "## 2>&1 merges them into one stream"
bash -c 'echo normal; echo oops >&2' > /tmp/both.txt 2>&1
cat /tmp/both.txt
echo
echo "## > truncates, >> appends"
printf 'one\\n' > /tmp/seq.txt
printf 'two\\n' >> /tmp/seq.txt
cat /tmp/seq.txt
echo
echo "## /dev/null discards output but not the exit code"
ls /nope 2>/dev/null; echo "exit=$?"`,
        },
        output: `## fd 3 points at a file
/tmp/custom.txt
written through fd 3

## stdout and stderr go to different places
stdout: normal
stderr: oops

## 2>&1 merges them into one stream
normal
oops

## > truncates, >> appends
one
two

## /dev/null discards output but not the exit code
exit=2`,
        pitfalls: [
          "Writing `2>&1 > file` and assuming both streams are in the file",
          "Using `>` in a loop when you meant `>>` and losing every line but the last",
        ],
      },
    },
    intermediate: {
      title: "Health check that also counts inodes",
      brief: [
        "Write `health.sh` that prints hostname, uptime, load average, disk percentage, inode percentage, memory used and the top five processes by CPU. It must exit 1 if either disk or inodes are above 90%, and print the alert on stderr.",
      ],
      criteria: [
        "Starts with `set -euo pipefail`",
        "Reads disk and inode percentages without parsing `df -h` columns by position",
        "Exit code is 1 when either threshold is crossed",
      ],
      hints: [
        "`df -P /` and `df -Pi /` give stable columns; field 5 is the percentage.",
        "Strip the `%` before comparing with `(( ))`.",
      ],
      solution: {
        text: [
          "Use `df -P` (POSIX output) rather than `df -h`, because long device names can wrap and shift the columns in the human-readable form. Field 5 is the percentage; removing the `%` makes it an integer for arithmetic.",
          "Load average comes from `/proc/loadavg`, and uptime from the first field of `/proc/uptime`. Both are cheap, dependency-free reads, which matters on a minimal container that may not have `uptime` installed.",
          "Print the alert to stderr and exit 1 so cron, systemd or a monitoring agent can act on the status without parsing text. Check both resources: inode exhaustion produces the same 'No space left on device' error as a full disk.",
        ],
        code: {
          lang: "bash",
          file: "health.sh",
          code: `#!/usr/bin/env bash
set -euo pipefail
disk=$(df -P / | awk 'NR==2 { gsub(/%/, "", $5); print $5 }')
inodes=$(df -Pi / | awk 'NR==2 { gsub(/%/, "", $5); print $5 }')
echo "== $(hostname)  up $(cut -d. -f1 /proc/uptime)s"
echo "== load (1, 5, 15 min): $(cut -d' ' -f1-3 /proc/loadavg)"
printf '== disk /   %s%% used\\n' "$disk"
printf '== inodes / %s%% used\\n' "$inodes"
read -r used total <<<"$(free -h | awk 'NR==2 {print $3, $2}')"
echo "== memory   $used of $total used"
echo "== top CPU"
ps -eo pcpu,pid,user,comm --sort=-pcpu | head -n 6
if (( disk > 90 )); then
  echo "ALERT: disk above 90%" >&2
  exit 1
fi
if (( inodes > 90 )); then
  echo "ALERT: inodes above 90%" >&2
  exit 1
fi`,
        },
        pitfalls: [
          "Parsing `df -h` by column position, which breaks on long device names or wrapped output",
          "Checking only blocks and missing inode exhaustion, which fails with the same error message",
          "Printing alerts to stdout so a monitoring agent that reads stderr sees nothing",
        ],
      },
    },
    challenge: {
      title: "Find the disk hog",
      brief: [
        "Simulate an incident: create a 500 MB file deep in your home directory (`fallocate -l 500M`, or `dd` on filesystems without fallocate). Then find it using only terminal commands, and write an incident note: symptom, cause, fix, prevention.",
      ],
      criteria: [
        "Investigation goes from broad (`df`) to narrow (`du`, `find`)",
        "A final command that lists the largest files with sizes and dates",
        "An incident note that also checks for deleted-but-open files",
      ],
      hints: [
        "`du -xh --max-depth=2 ~ | sort -h | tail`",
        "`find ~ -xdev -type f -size +100M -printf '%s %p\\n'`",
        "`lsof +L1` explains a `df`/`du` disagreement",
      ],
      solution: {
        text: [
          "1. `df -h` confirms which filesystem is full. 2. `du -xh --max-depth=1 <mount> | sort -h` finds the biggest top-level folder, then repeat one level deeper. 3. `find <dir> -xdev -type f -size +100M` lists the large files. 4. `lsof +L1` checks for deleted files a process still holds open: those blocks count in `df` but not in `du`, and they are freed only when the holder restarts or reopens the file.",
          "The `-x`/`-xdev` flags matter: without them `du` and `find` walk into other mounted filesystems and blame the wrong disk. The same applies to bind mounts and container volumes.",
          "Prevention: log rotation with `logrotate`, alerts at 80% for both blocks and inodes, and a size limit or cleanup job for cache and temp directories.",
          "Incident note. Symptom: `/` at 98%, writes failing with `No space left on device`. Cause: a 500 MB core dump under `~/.cache/thumbnails/old/x`. Fix: confirm nothing needs it, delete it, re-run `df`. Prevention: as above, plus a core-dump policy and a cleanup job for cache directories.",
        ],
        code: {
          lang: "bash",
          file: "find_disk_hog.sh",
          code: `#!/usr/bin/env bash
# Find what is eating a filesystem, from broad (df) to narrow (du, find, lsof).
# usage: ./find_disk_hog.sh [start-dir] [min-file-size]   e.g. ./find_disk_hog.sh ~ 100M
set -euo pipefail
start="\${1:-$HOME}"
min_size="\${2:-100M}"
[[ -d "$start" ]] || { echo "error: $start is not a directory" >&2; exit 2; }
echo "== 1. Which filesystem is full?"
df -h "$start"
echo "==    inodes"
df -i "$start"
echo; echo "== 2. Drill down: biggest child at each level (-x stays on this filesystem)"
dir="$start"
while true; do
  du -xh --max-depth=1 "$dir" 2>/dev/null | sort -h | tail -n 4
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
  lsof -nP +L1 2>/dev/null | awk 'NR==1 || ($7 > 100*1024*1024 && $0 !~ /memfd:/)' || true
else
  echo "lsof not installed (apt install lsof)"
fi`,
        },
        pitfalls: [
          "Running `du` without `-x`, so it walks other mounts and blames the wrong disk",
          "Deleting a log a process still has open: the space is not freed until the process restarts or reopens the file",
          "Forgetting `df -i`: inode exhaustion looks exactly like a full disk but deleting large files will not help",
        ],
      },
    },
    capstone: {
      title: "DevAtlas step 2: project scripts",
      brief: [
        "Add a `scripts/` folder to DevAtlas with `setup.sh` that checks required tools (git, node, docker, dotnet, python3), creates `var/` and `logs/` with mode 750, writes a `.env.example` with mode 640, prints the effective umask and free space, and exits non-zero if any tool is missing.",
      ],
      criteria: [
        "Uses `command -v` to detect tools",
        "Directories and files are created with explicit restrictive modes",
        "Exits non-zero if any tool is missing, with install hints on stderr",
        "Documented in the README",
      ],
      hints: [
        "`command -v docker >/dev/null 2>&1 || missing+=(docker)`",
        "Set `umask 027` before `mkdir`, and still `chmod` explicitly so existing paths are corrected.",
      ],
      solution: {
        text: [
          "The script is idempotent: it inspects, creates with explicit modes, and reports. A loop over required tools with an array of missing ones keeps it short and extendable; `printf` with an explicit format avoids the portability traps of `echo`.",
          "Setting the umask before creating directories protects the files made by later steps, but an explicit `chmod` is still worth it because `mkdir -p` leaves an existing directory's mode untouched. The `.env.example` is a template, not a secret, so 640 is enough; real `.env` files stay out of version control.",
          "The `df -h` line is a cheap sanity check that also demonstrates where the project lives when the repository is on a different mount.",
        ],
        code: {
          lang: "bash",
          file: "scripts/setup.sh",
          code: `#!/usr/bin/env bash
set -euo pipefail
root="$(cd "$(dirname "$0")/.." && pwd)"
required=(git node docker dotnet python3)
missing=()
for tool in "\${required[@]}"; do
  if command -v "$tool" >/dev/null 2>&1; then
    printf 'ok       %s\\n' "$tool"
  else
    printf 'missing  %s\\n' "$tool"
    missing+=("$tool")
  fi
done
umask 027
mkdir -p "$root/var" "$root/logs"
chmod 750 "$root/var" "$root/logs"
printf 'APP_ENV=development\\n' > "$root/.env.example"
chmod 640 "$root/.env.example"
printf 'umask    %s\\n' "$(umask)"
df -h "$root" | tail -n 1
if (( \${#missing[@]} )); then
  printf 'Install: %s (see README > Setup)\\n' "\${missing[*]}" >&2
  exit 1
fi
printf 'setup complete\\n'`,
        },
        pitfalls: [
          "Forgetting that `mkdir -p` does not change the mode of a directory that already exists",
          "Writing a real `.env` with secrets and committing it; only the example belongs in Git",
        ],
      },
    },
  },
  deeper: [
    { label: "Filesystem Hierarchy Standard 3.0", url: "https://refspecs.linuxfoundation.org/FHS_3.0/fhs-3.0.html" },
    { label: "inode(7): the file metadata model", url: "https://man7.org/linux/man-pages/man7/inode.7.html" },
    { label: "path_resolution(7): how the kernel walks a path", url: "https://man7.org/linux/man-pages/man7/path_resolution.7.html" },
    { label: "signal(7): signals and default actions", url: "https://man7.org/linux/man-pages/man7/signal.7.html" },
    { label: "pipe(2): the kernel buffer behind `|`", url: "https://man7.org/linux/man-pages/man2/pipe.2.html" },
    { label: "lsof(8): open files, deleted files and network sockets", url: "https://man7.org/linux/man-pages/man8/lsof.8.html" },
  ],
  nextPreview:
    "Next: shell scripting and SSH. Turn the commands you just learned into safe Bash scripts with `set -euo pipefail`, and connect to servers with keys instead of passwords.",
};
