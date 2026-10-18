import { useState } from "react";
import type { QuizQuestion } from "../types";
import { rich } from "../lib/rich";
import { Code } from "./ui";

const KIND_LABEL = { mcq: "Multiple choice", output: "Predict the output", bug: "Spot the bug" } as const;

/** One question. Answers stay hidden until the learner commits to a choice. */
export function QuestionCard({
  q,
  index,
  onAnswer,
}: {
  q: QuizQuestion;
  index?: number;
  onAnswer?: (correct: boolean) => void;
}) {
  const [picked, setPicked] = useState<number | null>(null);
  const [checked, setChecked] = useState(false);
  const correct = picked === q.answer;
  return (
    <div className={`question ${checked ? (correct ? "is-correct" : "is-wrong") : ""}`}>
      <div className="question-meta">
        {index !== undefined && <span className="question-num">Q{index + 1}</span>}
        <span className="question-kind">{KIND_LABEL[q.kind]}</span>
      </div>
      <p className="question-prompt">{rich(q.prompt)}</p>
      {q.code && <Code sample={q.code} />}
      <div className="options" role="radiogroup">
        {q.options.map((opt, i) => {
          const state = checked ? (i === q.answer ? "right" : i === picked ? "wrong" : "") : picked === i ? "picked" : "";
          return (
            <button
              key={i}
              role="radio"
              aria-checked={picked === i}
              className={`option ${state}`}
              disabled={checked}
              onClick={() => setPicked(i)}
            >
              <span className="option-key">{String.fromCharCode(65 + i)}</span>
              <span>{rich(opt)}</span>
            </button>
          );
        })}
      </div>
      {!checked ? (
        <button
          className="btn btn-primary btn-sm"
          disabled={picked === null}
          onClick={() => {
            setChecked(true);
            onAnswer?.(picked === q.answer);
          }}
        >
          Check answer
        </button>
      ) : (
        <div className="explanation">
          <strong>{correct ? "Correct." : "Not quite."}</strong> {rich(q.explanation)}
        </div>
      )}
    </div>
  );
}

/** A set of questions with a running score; calls onDone once every question is answered. */
export function QuizSet({ questions, onDone }: { questions: QuizQuestion[]; onDone?: (score: number, total: number) => void }) {
  const [results, setResults] = useState<Record<number, boolean>>({});
  const answered = Object.keys(results).length;
  const score = Object.values(results).filter(Boolean).length;
  return (
    <div className="quiz-set">
      {questions.map((q, i) => (
        <QuestionCard
          key={i}
          q={q}
          index={i}
          onAnswer={(ok) => {
            const next = { ...results, [i]: ok };
            setResults(next);
            if (Object.keys(next).length === questions.length) onDone?.(Object.values(next).filter(Boolean).length, questions.length);
          }}
        />
      ))}
      {answered === questions.length && questions.length > 0 && (
        <div className={`quiz-score ${score / questions.length >= 0.67 ? "good" : "warn"}`}>
          <div className="quiz-score-num">
            {score}/{questions.length}
          </div>
          <div>
            {score === questions.length
              ? "Perfect. You own this topic."
              : score / questions.length >= 0.67
                ? "Solid. Review the explanations for the one you missed."
                : "This topic needs another pass. Re-read the concept and under-the-hood sections, then try the revision deck tomorrow."}
          </div>
        </div>
      )}
    </div>
  );
}
