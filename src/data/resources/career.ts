import type { ResourceSection } from "../../types";

export const career: ResourceSection = {
  id: "career",
  title: "Career",
  icon: "🎯",
  tagline: "Resume, portfolio and interviews",
  phaseId: 10,
  courses: [
    {
      id: "portfolio",
      title: "Portfolio and resume",
      topics: [
        {
          id: "portfolio-software-engineer-resume",
          title: "Software engineer resume",
          lessonId: "10.1.1",
          revision: [
            "Keep a fresher resume to one page: contact, skills, projects, experience, education.",
            "Write bullets as action + what you built + measurable result (numbers where possible).",
            "Tailor keywords to the job description so applicant tracking systems can match them.",
            "Link GitHub, live demos and LinkedIn; export as PDF with a simple, readable layout.",
          ],
          read: { label: "Writing your software engineer resume - Tech Interview Handbook", url: "https://www.techinterviewhandbook.org/resume/", kind: "article" },
          video: { label: "Resume for software engineer in Hindi | tips fresher and experienced", url: "https://www.youtube.com/watch?v=0QUw_6vvAI8", channel: "Code Step By Step", lang: "Hindi" },
        },
        {
          id: "portfolio-github-profile",
          title: "GitHub profile",
          lessonId: "10.1.1",
          revision: [
            "A repository named exactly like your username with a README.md shows on your GitHub profile page.",
            "Pin up to six repositories or gists to show your best work first.",
            "Each pinned repo should have a clear README: what it does, screenshots, how to run, tech used.",
          ],
          read: { label: "Managing your profile README - GitHub Docs", url: "https://docs.github.com/en/account-and-profile/how-tos/profile-customization/managing-your-profile-readme", kind: "docs" },
          practice: { label: "Pinning items to your profile - GitHub Docs (pick your six best repos)", url: "https://docs.github.com/en/account-and-profile/how-tos/profile-customization/pinning-items-to-your-profile" },
        },
        {
          id: "portfolio-portfolio-projects",
          title: "Portfolio projects",
          lessonId: "10.1.1",
          revision: [
            "Two or three finished, deployed projects beat many half-done tutorial clones.",
            "Pick projects that solve a real problem and show full-stack skills: auth, database, API, deployment.",
            "Document each project: problem, architecture, trade-offs and a live link.",
          ],
        },
        {
          id: "portfolio-linkedin",
          title: "LinkedIn",
          revision: [
            "Use a clear photo and a headline naming your role and main skills, not just 'Student'.",
            "The About section is a short pitch; Featured can link projects, GitHub and your resume.",
            "Turn on Open to Work for recruiters and connect with people at companies you target.",
          ],
        },
      ],
    },
    {
      id: "interviews",
      title: "Interviews",
      topics: [
        {
          id: "interviews-dsa-interview-preparation",
          title: "DSA interview preparation",
          lessonId: "10.2.1",
          revision: [
            "Cover core topics in order: arrays, strings, hashing, two pointers, stacks, linked lists, trees, graphs, DP.",
            "Learn patterns (sliding window, BFS/DFS, binary search on answer) rather than memorising problems.",
            "In the interview, clarify input, state brute force, then optimise and give time/space complexity.",
          ],
          read: { label: "Coding interview study and practice plan - Tech Interview Handbook", url: "https://www.techinterviewhandbook.org/coding-interview-study-plan/", kind: "article" },
          practice: { label: "donnemartin/interactive-coding-challenges (120+ DSA challenge notebooks with tests and solutions)", url: "https://github.com/donnemartin/interactive-coding-challenges" },
        },
        {
          id: "interviews-system-design-interviews",
          title: "System design interviews",
          lessonId: "10.2.1",
          revision: [
            "Start by clarifying functional and non-functional requirements and estimating scale.",
            "Sketch a high-level design (clients, load balancer, services, cache, database), then deep-dive.",
            "Discuss trade-offs: SQL vs NoSQL, consistency vs availability, caching, sharding, replication.",
          ],
          read: { label: "donnemartin/system-design-primer", url: "https://github.com/donnemartin/system-design-primer", kind: "repo" },
          video: { label: "System Design Complete Course 2026 | Hindi + English | 10+ Hours | SDE Interview Preparation", url: "https://www.youtube.com/watch?v=5XmZK5fls5w", channel: "designKarle", lang: "Hindi" },
        },
        {
          id: "interviews-behavioral-interviews-and-star",
          title: "Behavioral interviews and STAR",
          lessonId: "10.2.1",
          revision: [
            "STAR: Situation, Task, Action, Result - a structure for answering 'tell me about a time' questions.",
            "Spend most of the answer on your own Action and end with a concrete, measurable Result.",
            "Prepare 5 to 8 stories (conflict, failure, leadership, tight deadline) that can fit many questions.",
          ],
          read: { label: "Behavioral interviews for Software Engineers: How to prepare - Tech Interview Handbook", url: "https://www.techinterviewhandbook.org/behavioral-interview/", kind: "article" },
          practice: { label: "Common behavioral questions to practice - Tech Interview Handbook", url: "https://www.techinterviewhandbook.org/behavioral-interview-questions/" },
        },
        {
          id: "interviews-mock-interviews",
          title: "Mock interviews",
          revision: [
            "Practise solving problems aloud under a timer, ideally with another person playing interviewer.",
            "Ask for feedback on communication, not just correctness, and repeat weak areas.",
            "Simulate the real setup: shared editor or whiteboard, no autocomplete, 45 minutes.",
          ],
          read: { label: "Mock coding interviews - Tech Interview Handbook", url: "https://www.techinterviewhandbook.org/mock-interviews/", kind: "article" },
        },
      ],
    },
  ],
};
