"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";

type ReviewQuestion = { id: string; question: string };
type JudgeReview = {
  scores: {
    name: string;
    score: number;
    maxScore: number;
    favorsRunnable: boolean;
    rationale: string;
  }[];
  note: string | null;
  answers: { questionId: string; answer: string; cantConfirm: boolean }[];
};

// 评委审阅（合并视图）：按「评委」分 tab，每个评委一栏，集中看 TA 的
// 维度评分 + 评语 + 兜底备注 + 对 AI 核查问题的逐题作答。评委匿名（A/B/C）。
export function JudgeReviewTabs({
  questions,
  judges,
}: {
  questions: ReviewQuestion[];
  judges: JudgeReview[];
}) {
  const [active, setActive] = useState(0);

  if (judges.length === 0) {
    return (
      <p className="mt-3 text-sm text-muted-foreground">
        还没有评委完成审阅。一旦有评委评分或作答，这里会按评委分栏展示。
      </p>
    );
  }

  const j = judges[Math.min(active, judges.length - 1)];
  const qMap = new Map(questions.map((q) => [q.id, q.question]));

  return (
    <div className="mt-3">
      {/* 评委 tab 切换 */}
      <div className="flex flex-wrap gap-1.5">
        {judges.map((_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setActive(i)}
            className={
              i === active
                ? "rounded-full bg-primary px-3.5 py-1.5 text-sm text-primary-foreground"
                : "rounded-full border border-border px-3.5 py-1.5 text-sm text-muted-foreground transition-colors hover:border-primary"
            }
          >
            评委 {String.fromCharCode(65 + i)}
          </button>
        ))}
      </div>

      <div className="mt-4 space-y-5">
        {/* 维度评分 + 评语 */}
        {j.scores.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-foreground">维度评分</h4>
            <div className="mt-2 space-y-2">
              {j.scores.map((s, i) => (
                <div key={i} className="rounded-lg bg-muted/50 px-3 py-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-foreground">
                      {s.name}
                      {s.favorsRunnable && (
                        <Badge tone="primary" className="ml-2">
                          重落地
                        </Badge>
                      )}
                    </span>
                    <span className="text-sm font-medium text-foreground">
                      {s.score} / {s.maxScore}
                    </span>
                  </div>
                  {s.rationale && (
                    <p className="mt-1 border-l-2 border-border pl-3 text-sm text-muted-foreground">
                      {s.rationale}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 兜底备注 */}
        {j.note && (
          <div>
            <h4 className="text-sm font-medium text-foreground">兜底备注</h4>
            <p className="mt-1.5 border-l-2 border-border pl-3 text-sm text-muted-foreground">
              {j.note}
            </p>
          </div>
        )}

        {/* 对 AI 核查问题的作答 */}
        {questions.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-foreground">
              AI 核查问答
            </h4>
            <ol className="mt-2 space-y-3">
              {questions.map((q, i) => {
                const a = j.answers.find((x) => x.questionId === q.id);
                return (
                  <li key={q.id}>
                    <p className="text-sm font-medium text-foreground">
                      Q{i + 1}. {qMap.get(q.id)}
                    </p>
                    {a ? (
                      <div className="mt-1 rounded-lg border-l-2 border-primary/40 bg-muted/50 py-1.5 pl-3 text-sm">
                        {a.cantConfirm && (
                          <span className="text-xs text-warning-soft-foreground">
                            （材料中无法确认）
                          </span>
                        )}
                        <p className="whitespace-pre-wrap text-foreground">
                          {a.answer}
                        </p>
                      </div>
                    ) : (
                      <p className="mt-1 text-xs text-muted-foreground">
                        该评委未回答此问题。
                      </p>
                    )}
                  </li>
                );
              })}
            </ol>
          </div>
        )}
      </div>
    </div>
  );
}
