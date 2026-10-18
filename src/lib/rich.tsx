import type { ReactNode } from "react";

// Renders the small inline markup used in lesson text: `code`, **bold** and [text](https://url).
const PATTERN = /(`[^`]+`|\*\*[^*]+\*\*|\[[^\]]+\]\(https?:\/\/[^)\s]+\))/g;

export function rich(text: string): ReactNode[] {
  return text.split(PATTERN).map((part, i) => {
    if (part.startsWith("`") && part.endsWith("`") && part.length > 1) return <code key={i}>{part.slice(1, -1)}</code>;
    if (part.startsWith("**") && part.endsWith("**") && part.length > 3) return <strong key={i}>{part.slice(2, -2)}</strong>;
    const link = part.match(/^\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)$/);
    if (link)
      return (
        <a key={i} href={link[2]} target="_blank" rel="noreferrer">
          {link[1]}
        </a>
      );
    return part;
  });
}

export function Rich({ text, as: Tag = "p" }: { text: string; as?: "p" | "span" | "li" | "div" }) {
  return <Tag>{rich(text)}</Tag>;
}
