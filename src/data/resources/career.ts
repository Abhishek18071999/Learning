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
          revision: [],
          video: { label: "Resume for software engineer in Hindi | tips fresher and experienced", url: "https://www.youtube.com/watch?v=0QUw_6vvAI8", channel: "Code Step By Step", lang: "Hindi" },
        },
        {
          id: "portfolio-github-profile",
          title: "GitHub profile",
          lessonId: "10.1.1",
          revision: [],
          read: { label: "Managing your profile README - GitHub Docs", url: "https://docs.github.com/en/account-and-profile/how-tos/profile-customization/managing-your-profile-readme", kind: "docs" },
          practice: { label: "Pinning items to your profile - GitHub Docs (pick your six best repos)", url: "https://docs.github.com/en/account-and-profile/how-tos/profile-customization/pinning-items-to-your-profile" },
        },
        {
          id: "portfolio-portfolio-projects",
          title: "Portfolio projects",
          lessonId: "10.1.1",
          revision: [],
        },
        {
          id: "portfolio-linkedin",
          title: "LinkedIn",
          revision: [],
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
          revision: [],
          practice: { label: "donnemartin/interactive-coding-challenges (120+ DSA challenge notebooks with tests and solutions)", url: "https://github.com/donnemartin/interactive-coding-challenges" },
        },
        {
          id: "interviews-system-design-interviews",
          title: "System design interviews",
          lessonId: "10.2.1",
          revision: [],
          read: { label: "donnemartin/system-design-primer", url: "https://github.com/donnemartin/system-design-primer", kind: "repo" },
          video: { label: "System Design Complete Course 2026 | Hindi + English | 10+ Hours | SDE Interview Preparation", url: "https://www.youtube.com/watch?v=5XmZK5fls5w", channel: "designKarle", lang: "Hindi" },
        },
        {
          id: "interviews-behavioral-interviews-and-star",
          title: "Behavioral interviews and STAR",
          lessonId: "10.2.1",
          revision: [],
        },
        {
          id: "interviews-mock-interviews",
          title: "Mock interviews",
          revision: [],
        },
      ],
    },
  ],
};
