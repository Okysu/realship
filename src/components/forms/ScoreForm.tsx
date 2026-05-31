"use client";

import { useActionState } from "react";
import { saveScore, type ScoreActionState } from "@/server/actions/judge-score";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";

export function ScoreForm({
  submissionId,
  criterion,
  existing,
}: {
  submissionId: string;
  criterion: {
    id: string;
    name: string;
    maxScore: number;
    favorsRunnable: boolean;
    description: string | null;
  };
  existing?: { score: number; rationale: string };
}) {
  const [state, action, pending] = useActionState<ScoreActionState, FormData>(
    saveScore,
    undefined,
  );

  return (
    <form action={action} className="rounded-lg border border-border p-4">
      <input type="hidden" name="submissionId" value={submissionId} />
      <input type="hidden" name="criterionId" value={criterion.id} />
      <div className="flex items-center justify-between gap-3">
        <div className="font-medium text-foreground">
          {criterion.name}
          {criterion.favorsRunnable && (
            <Badge tone="primary" className="ml-2">
              硬通货
            </Badge>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Input
            name="score"
            type="number"
            min={0}
            max={criterion.maxScore}
            step={0.5}
            defaultValue={existing?.score}
            required
            className="w-20"
          />
          <span className="text-sm text-muted-foreground">
            / {criterion.maxScore}
          </span>
        </div>
      </div>
      {criterion.description && (
        <p className="mt-1 text-xs text-muted-foreground">
          {criterion.description}
        </p>
      )}
      <Textarea
        name="rationale"
        rows={2}
        defaultValue={existing?.rationale}
        placeholder="评分理由（必填）"
        required
        className="mt-2"
      />
      <div className="mt-2 flex items-center gap-3">
        <Button type="submit" disabled={pending} variant="secondary">
          保存此项
        </Button>
        {state?.ok && <span className="text-sm text-primary">已保存</span>}
        {state?.error && (
          <span className="text-sm text-danger">{state.error}</span>
        )}
      </div>
    </form>
  );
}
