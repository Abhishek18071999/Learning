import { useSyncExternalStore } from "react";

// Hash-based routing: works on any static host (GitHub Pages, S3, Blob Storage) with no server rules.

function current(): string {
  const h = window.location.hash.replace(/^#/, "");
  return h.startsWith("/") ? h : "/";
}

export function useRoute(): string {
  return useSyncExternalStore(
    (cb) => {
      window.addEventListener("hashchange", cb);
      return () => window.removeEventListener("hashchange", cb);
    },
    current,
  );
}

export function navigate(path: string): void {
  if (current() !== path) window.location.hash = path;
  window.scrollTo({ top: 0 });
}

export function match(route: string, pattern: string): Record<string, string> | null {
  const [path] = route.split("?");
  const a = path.split("/").filter(Boolean);
  const b = pattern.split("/").filter(Boolean);
  if (a.length !== b.length) return null;
  const params: Record<string, string> = {};
  for (let i = 0; i < b.length; i++) {
    if (b[i].startsWith(":")) params[b[i].slice(1)] = decodeURIComponent(a[i]);
    else if (a[i] !== b[i]) return null;
  }
  return params;
}

export function query(route: string): URLSearchParams {
  return new URLSearchParams(route.split("?")[1] ?? "");
}
