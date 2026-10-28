import type { Lesson } from "../../types";

export const lesson: Lesson = {
  id: "9.7.2",
  title: "Subnets, CIDR and IP addressing",
  minutes: 70,
  level: "Intermediate",
  prerequisites: ["9.7.1 OSI, TCP/IP, DNS and TLS: the network one layer at a time"],
  summary: "Plan networks without bit-flipping in your head: read a CIDR prefix, compute the netmask and host count, split a range into subnets, and merge them back — the exact arithmetic behind every VPC, subnet and route table.",
  terms: [
    { term: "CIDR", def: "Classless Inter-Domain Routing — compact range notation like 10.0.0.0/24, where /N counts the fixed network bits." },
    { term: "Subnet", def: "A subdivision of a larger network, created by borrowing host bits for the network part." },
    { term: "Netmask", def: "A 32-bit value with N ones then zeros, used to AND against an IP to find the network address." },
    { term: "Supernet", def: "The inverse of subnetting — aggregating several adjacent subnets into one larger range." },
    { term: "Network / broadcast", def: "The first address (all host bits 0) and last address (all host bits 1) of a range; both are reserved." },
    { term: "Usable hosts", def: "2^(32-N) minus 2 — the addresses available to devices after removing network and broadcast." },
  ],
  problem: [
    "A team sizes a subnet at /24 for a service that only ever runs three instances, then discovers another service needs 300 addresses and there is no room left. Addressing mistakes are cheap to make on paper and expensive to fix in a live cloud.",
    "The skill is the arithmetic: given a /N, know instantly how many addresses it holds, what the mask is, and how to split or merge it. That is what makes cloud network planning predictable instead of guesswork.",
  ],
  concept: {
    analogy: [
      "An IP network is a **street of houses**. The CIDR prefix is the street name plus how many houses are on it: /24 is '256 houses on Elm Street', /28 is '16 houses on the short block'. The netmask is the fence line between the street (network) and the house number (host). Subnetting is dividing one long street into smaller named blocks; supernetting is merging adjacent blocks back into one street.",
    ],
    precise: [
      "**The prefix counts network bits.** 10.0.0.0/24 means the first 24 bits are the network and the remaining 8 are hosts — 2^8 = 256 addresses. Smaller prefix (fewer network bits) = larger network; larger prefix = smaller network.",
      "**The netmask is N ones then zeros.** /24 → 255.255.255.0; /26 → 255.255.255.192. AND the mask with any IP to get its network address.",
      "**Two addresses are always reserved.** The network address (host bits all 0) and the broadcast (host bits all 1), so usable hosts = 2^(32-N) − 2. A /30 has 4 addresses but only 2 usable — the classic point-to-point size.",
      "**Subnetting borrows host bits.** Splitting a /24 into /26 quarters gives four 64-address blocks. Supernetting is the reverse: four adjacent /26s collapse back into one /24 when they are contiguous.",
    ],
  },
  underTheHood: {
    text: [
      "Every CIDR decision is really two numbers: the network prefix length N and the 32-bit address. The netmask is a 32-bit number with N ones followed by 32−N zeros; AND-ing it with an IP zeroes out the host part, leaving the network.",
      "In binary the split is visible: 192.168.1.130 = 11000000.10101000.00000001.10000010. A /24 fixes the first three octets (24 bits) and leaves the last octet as host. A /26 fixes the first 26 bits, so the host part is the last 6 bits — that is where a 'quarter' of a /24 comes from.",
      "Cloud networking is entirely this arithmetic: a VPC gets a /16, which is split into per-AZ public and private subnets, and route tables direct traffic between them. Get the split right up front and growth is a matter of a bigger prefix, not a painful renumber.",
    ],
    diagram: {
      title: "One IP, network vs host",
      nodes: [
        { label: "IP", sub: "192.168.1.130" },
        { label: "network bits", sub: "192.168.1 (24 bits)" },
        { label: "host bits", sub: ".130 (8 bits)" },
        { label: "netmask", sub: "255.255.255.0" },
      ],
      edges: ["splits into", "and", "AND with"],
    },
  },
  handsOn: [
    {
      title: "CIDR math",
      text: [
        "The core arithmetic: from a prefix length, compute the netmask and the number of addresses.",
      ],
      code: {
        lang: "python",
        file: "subnet_math.py",
        code: `"""CIDR math: prefix length -> netmask, host bits, addresses."""
def subnet_info(prefix: int) -> str:
    total = 2 ** (32 - prefix)
    mask = (0xFFFFFFFF << (32 - prefix)) & 0xFFFFFFFF
    octets = [(mask >> (8 * i)) & 0xFF for i in (3, 2, 1, 0)]
    return f"/{prefix}  netmask={'.'.join(map(str, octets))}  hosts={total}"


for p in (24, 26, 28, 30):
    print(subnet_info(p))`,
      },
      output: "/24  netmask=255.255.255.0  hosts=256\n/26  netmask=255.255.255.192  hosts=64\n/28  netmask=255.255.255.240  hosts=16\n/30  netmask=255.255.255.252  hosts=4",
      notes: [
        "Each step up in prefix halves the address count. That single fact — /N+1 halves the network — is most of subnetting intuition.",
      ],
    },
    {
      title: "Usable ranges",
      text: [
        "The usable range is the network minus the two reserved addresses. `ipaddress` computes it exactly.",
      ],
      code: {
        lang: "python",
        file: "cidr_summary.py",
        code: `"""Usable address ranges for common prefixes."""
import ipaddress


def range_for(cidr: str) -> str:
    net = ipaddress.ip_network(cidr, strict=False)
    hosts = list(net.hosts())
    return f"{cidr:12} {hosts[0]} - {hosts[-1]}  ({net.num_addresses - 2} usable)"


for c in ("10.1.0.0/24", "10.1.0.0/28", "10.1.0.0/30"):
    print(range_for(c))`,
      },
      output: "10.1.0.0/24  10.1.0.1 - 10.1.0.254  (254 usable)\n10.1.0.0/28  10.1.0.1 - 10.1.0.14  (14 usable)\n10.1.0.0/30  10.1.0.1 - 10.1.0.2  (2 usable)",
      notes: [
        "The /30 with only two usable addresses is the standard for a point-to-point link between two routers — a common interview question.",
      ],
    },
    {
      title: "See the split in binary",
      text: [
        "Converting an IP to binary makes the network/host split visually obvious — this is what the netmask actually masks.",
      ],
      code: {
        lang: "python",
        file: "ip_binary.py",
        code: `"""See the network/host split of an IP in binary."""
def ip_bits(ip: str) -> str:
    return ".".join(f"{int(o):08b}" for o in ip.split("."))


for ip in ("192.168.1.130", "10.0.0.1"):
    print(ip, "->", ip_bits(ip))`,
      },
      output: "192.168.1.130 -> 11000000.10101000.00000001.10000010\n10.0.0.1 -> 00001010.00000000.00000000.00000001",
      notes: [
        "Under a /24 the first three octets are fixed (network) and the last octet is the host. Borrow bits from that last octet and you have subnets.",
      ],
    },
  ],
  companies: [
    "**Cloud VPCs** are planned as CIDR blocks: a /16 VPC split into /20 or /24 subnets per availability zone, public and private, with route tables between them.",
    "**Kubernetes clusters** reserve a pod CIDR and a service CIDR, chosen not to overlap with the VPC or each other — an overlap here is a classic cluster-wide outage.",
    "**On-prem networks** use private ranges (RFC 1918: 10/8, 172.16/12, 192.168/16) and NAT to reach the internet, so internal addressing is a CIDR-planning exercise.",
    "**Every network migration** — a datacentre move, a VPC peer, a VPN — starts by checking the two sides do not have overlapping CIDRs.",
  ],
  mistakes: [
    {
      mistake: "Reading /24 as '24 hosts'",
      why: "Confusing the mask with the host count",
      wrong: "Subnets sized an order of magnitude too small",
      fix: "The /N counts network bits; hosts = 2^(32-N) minus 2",
    },
    {
      mistake: "Forgetting the two reserved addresses",
      why: "Counting 256 for a /24",
      wrong: "Assigning .0 or .255 and breaking a device",
      fix: "Usable = total − 2 (network + broadcast)",
    },
    {
      mistake: "Overlapping CIDRs between VPC and pod ranges",
      why: "Two teams picked ranges independently",
      wrong: "Routing black-holes or packets going to the wrong place",
      fix: "Reserve a global address plan and check for overlap before peering",
    },
    {
      mistake: "Sizing every subnet identically",
      why: "One size is simpler",
      wrong: "Tiny subnets starve growth while large ones waste space",
      fix: "Right-size per tier: bigger for web/workers, smallest for DB and point-to-point links",
    },
  ],
  bestPractices: [
    {
      tag: "Maintainability",
      text: "Document the address plan (VPC, per-AZ subnets, ranges) so overlaps are caught before they reach the network.",
    },
    {
      tag: "Reliability",
      text: "Leave headroom in subnets for growth — renumbering a live network is far more painful than a slightly larger range.",
    },
    {
      tag: "Cost",
      text: "Right-size rather than overallocate; a /16 of unused space is wasteful, and renumbering is expensive.",
    },
    {
      tag: "Security",
      text: "Keep databases in private subnets reachable only from the app tier, never directly from the internet.",
    },
  ],
  interview: [
    {
      q: "How many usable hosts are in a /26, and why not 64?",
      a: "A /26 has 2^(32-26) = 64 addresses, but the network and broadcast addresses are reserved, so 62 usable. The network address is host-bits-all-zero and the broadcast is host-bits-all-one.",
    },
    {
      q: "What is the difference between a subnet and a supernet?",
      a: "Subnetting splits a larger network into smaller ones by borrowing host bits for the network part. Supernetting is the reverse: aggregating several adjacent subnets into one larger range, usually to reduce routing-table size or simplify a rule.",
    },
    {
      q: "How do you choose the CIDR for a three-tier app?",
      a: "Start from a block big enough for growth (say a /22), split a /24 for the web tier, and split the remainder into /25s for app and database so the database can live in a private subnet. Reserve room for future tiers rather than using every address.",
    },
  ],
  quickCheck: [
    {
      kind: "mcq",
      prompt: "A /28 holds how many usable host addresses?",
      options: ["14", "16", "28", "256"],
      answer: 0,
      explanation: "2^(32-28) = 16 total, minus network and broadcast = 14 usable.",
    },
    {
      kind: "output",
      prompt: "What does this print?",
      code: {
        lang: "python",
        code: `print(2 ** (32 - 26) - 2)`,
      },
      options: ["62", "64", "26", "30"],
      answer: 0,
      explanation: "2^6 = 64 total, minus 2 reserved = 62.",
    },
    {
      kind: "bug",
      prompt: "Two teams both use 10.0.0.0/16 for their VPC and then peer them. What is wrong?",
      options: [
        "The ranges overlap, so routes collide and traffic is misrouted",
        "Peering always works",
        "Private ranges cannot peer",
        "Nothing is wrong",
      ],
      answer: 0,
      explanation: "Overlapping CIDRs make routing ambiguous. Address plans must be non-overlapping before any peering or VPN.",
    },
  ],
  cheatSheet: [
    "The /N counts network bits; hosts = 2^(32-N) minus 2.",
    "Netmask = N ones then zeros; AND with an IP gives the network.",
    "Network + broadcast are always reserved.",
    "Subnetting borrows host bits; supernetting merges adjacent subnets.",
    "A /30 has exactly 2 usable addresses — point-to-point links.",
    "Right-size per tier; leave headroom; keep DB in private subnets.",
    "Check CIDR overlap before any VPC peer or VPN.",
  ],
  homework: {
    basic: {
      title: "Netmask from a prefix",
      brief: ["Write a function that returns the dotted-decimal netmask for a prefix length, and print it for /24, /20 and /16."],
      criteria: ["Correct mask for each prefix", "Uses bit arithmetic", "Runs offline"],
      hints: ["Build a 32-bit mask of N ones, then split into four octets."],
      solution: {
        text: ["The netmask is N ones followed by 32−N zeros. Slicing it into four bytes gives the familiar dotted-decimal form."],
        code: {
          lang: "python",
          file: "subnet_mask.py",
          code: `"""Netmask from a prefix length."""
def netmask(prefix: int) -> str:
    mask = (0xFFFFFFFF << (32 - prefix)) & 0xFFFFFFFF
    return ".".join(str((mask >> (8 * i)) & 0xFF) for i in (3, 2, 1, 0))


for p in (24, 20, 16):
    print(f"/{p} -> {netmask(p)}")`,
        },
        output: "/24 -> 255.255.255.0\n/20 -> 255.255.240.0\n/16 -> 255.255.0.0",
      },
    },
    intermediate: {
      title: "Supernet four /26s into a /24",
      brief: ["Given four adjacent /26 subnets, aggregate them into the single /24 that contains them."],
      criteria: ["Produces the correct /24", "Inputs are the four /26 blocks", "Runs offline"],
      hints: ["`ip_network(...).supernet(new_prefix=24)`."],
      solution: {
        text: ["Supernetting is subnetting in reverse: adjacent, contiguous subnets collapse into their common prefix. This is how route summarisation keeps routing tables small."],
        code: {
          lang: "python",
          file: "supernet.py",
          code: `"""Supernetting: aggregate four /26s back into a /24."""
import ipaddress

subs = [ipaddress.ip_network(f"10.0.0.{i * 64}/26", strict=False) for i in range(4)]
merged = subs[0].supernet(new_prefix=24)
print("inputs:  ", ", ".join(str(s) for s in subs))
print("supernet:", merged)`,
        },
        output: "inputs:   10.0.0.0/26, 10.0.0.64/26, 10.0.0.128/26, 10.0.0.192/26\nsupernet: 10.0.0.0/24",
      },
    },
    challenge: {
      title: "Allocate a /22 into three tiers",
      brief: ["From a 10.20.0.0/22, allocate a web tier, an app tier and a database tier, printing each with its host count."],
      criteria: ["Three non-overlapping ranges", "Web tier larger than app and DB", "Host counts are correct"],
      hints: ["Give web a /24; split the next /24 into two /25s."],
      solution: {
        text: ["This mirrors a real three-tier layout: a large public web tier and smaller app/database tiers, with the database isolated in its own (private) range."],
        code: {
          lang: "python",
          file: "ip_plan.py",
          code: `"""Allocate a /22 into web, app and db tiers."""
import ipaddress

base = ipaddress.ip_network("10.20.0.0/22")
blocks = list(base.subnets(new_prefix=24))
web = blocks[0]
app, db = list(blocks[1].subnets(new_prefix=25))
print("web", web, "(254 hosts)")
print("app", app, "(126 hosts)")
print("db ", db, "(126 hosts)")`,
        },
        output: "web 10.20.0.0/24 (254 hosts)\napp 10.20.1.0/25 (126 hosts)\ndb  10.20.1.128/25 (126 hosts)",
      },
    },
    capstone: {
      title: "DevAtlas: subnet reference table",
      brief: ["Generate a quick reference table of addresses and usable hosts for /24 through /30."],
      criteria: ["Covers /24 through /30", "Shows total and usable counts", "Runs offline"],
      hints: ["Loop over prefix lengths and compute 2^(32-N)."],
      solution: {
        text: ["A one-glance table answers 90% of sizing questions in seconds. Keep it in the runbook next to the CIDR cheat sheet."],
        code: {
          lang: "python",
          file: "subnet_table.py",
          code: `"""A quick reference table for /24 through /30."""
def table():
    for prefix in range(24, 31):
        total = 2 ** (32 - prefix)
        print(f"/{prefix}  {total:3} addresses  {total - 2:3} usable")


table()`,
        },
        output: "/24  256 addresses  254 usable\n/25  128 addresses  126 usable\n/26   64 addresses   62 usable\n/27   32 addresses   30 usable\n/28   16 addresses   14 usable\n/29    8 addresses    6 usable\n/30    4 addresses    2 usable",
      },
    },
  },
  deeper: [
    { label: "Cloudflare: What is a subnet?", url: "https://www.cloudflare.com/learning/network-layer/what-is-a-subnet/" },
    { label: "AWS: VPC CIDR blocks", url: "https://docs.aws.amazon.com/vpc/latest/userguide/vpc-cidr-blocks.html" },
    { label: "ipaddress — Python stdlib docs", url: "https://docs.python.org/3/library/ipaddress.html" },
    { label: "RFC 1918: private address space", url: "https://datatracker.ietf.org/doc/html/rfc1918" },
  ],
  nextPreview: "Next: reverse proxies, load balancing and NAT — routing traffic, spreading load and translating addresses.",
};
