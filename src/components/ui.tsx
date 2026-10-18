import { useState, type ReactNode } from "react";
import type { CodeSample, Diagram } from "../types";
import { tokenize } from "../lib/highlight";
import { rich } from "../lib/rich";

const PLAIN_LANGS = new Set(["text", "markdown", "output"]);

export function CopyButton({ text, label = "Copy" }: { text: string; label?: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      className="btn btn-ghost btn-xs"
      onClick={() => {
        navigator.clipboard?.writeText(text).then(
          () => {
            setDone(true);
            setTimeout(() => setDone(false), 1500);
          },
          () => undefined,
        );
      }}
      aria-label={label}
    >
      {done ? "Copied ✓" : label}
    </button>
  );
}

export function Code({ sample, output }: { sample: CodeSample; output?: string }) {
  const tokens = PLAIN_LANGS.has(sample.lang) ? [{ type: "plain" as const, text: sample.code }] : tokenize(sample.code, sample.lang);
  return (
    <div className="code">
      <div className="code-head">
        <span className="code-dots" aria-hidden>
          <i />
          <i />
          <i />
        </span>
        <span className="code-file">{sample.file ?? sample.lang}</span>
        {sample.file && <span className="code-lang">{sample.lang}</span>}
        <CopyButton text={sample.code} />
      </div>
      <pre>
        <code>
          {tokens.map((t, i) =>
            t.type === "plain" ? t.text : (
              <span key={i} className={`tk-${t.type}`}>
                {t.text}
              </span>
            ),
          )}
        </code>
      </pre>
      {output && (
        <div className="code-output">
          <div className="code-output-label">Expected output</div>
          <pre>{output}</pre>
        </div>
      )}
    </div>
  );
}

export function Flow({ diagram }: { diagram: Diagram }) {
  return (
    <figure className="flow">
      <figcaption className="flow-title">{diagram.title}</figcaption>
      <div className="flow-row">
        {diagram.nodes.map((n, i) => (
          <div className="flow-item" key={i}>
            <div className="flow-node">
              <div className="flow-label">{n.label}</div>
              {n.sub && <div className="flow-sub">{n.sub}</div>}
            </div>
            {i < diagram.nodes.length - 1 && (
              <div className="flow-arrow" aria-hidden>
                <span>{diagram.edges?.[i] ?? ""}</span>
                <svg viewBox="0 0 40 12" width="40" height="12">
                  <path d="M0 6h34M30 1l6 5-6 5" fill="none" stroke="currentColor" strokeWidth="1.6" />
                </svg>
              </div>
            )}
          </div>
        ))}
      </div>
      {diagram.caption && <p className="flow-caption">{rich(diagram.caption)}</p>}
    </figure>
  );
}

export function Ring({ value, size = 64, stroke = 7, label }: { value: number; size?: number; stroke?: number; label?: ReactNode }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const v = Math.max(0, Math.min(1, value));
  return (
    <div className="ring" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={`${Math.round(v * 100)}%`}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--ring-track)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--accent)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${c * v} ${c}`}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <div className="ring-label">{label ?? `${Math.round(v * 100)}%`}</div>
    </div>
  );
}

export function Badge({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "accent" | "good" | "warn" | "bad" }) {
  return <span className={`badge badge-${tone}`}>{children}</span>;
}

export function Section({ id, icon, title, children, kicker }: { id: string; icon: string; title: string; kicker?: string; children: ReactNode }) {
  return (
    <section className="lesson-section" id={id}>
      <h2>
        <span className="sec-icon" aria-hidden>
          {icon}
        </span>
        {title}
        {kicker && <span className="sec-kicker">{kicker}</span>}
      </h2>
      {children}
    </section>
  );
}

export function Empty({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="empty">
      <h3>{title}</h3>
      {children}
    </div>
  );
}
