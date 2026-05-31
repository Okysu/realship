"use client";

import { useActionState } from "react";
import {
  saveReviewNote,
  type ScoreActionState,
} from "@/server/actions/judge-score";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export function ReviewNoteForm({
  submissionId,
  existing,
}: {
  submissionId: string;
  existing?: string;
}) {
  const [state, action, pending] = useActionState<ScoreActionState, FormData>(
    saveReviewNote,
    undefined,
  );

  return (
    <form action={action}>
      <input type="hidden" name="submissionId" value={submissionId} />
      <Textarea
        name="note"
        rows={3}
        defaultValue={existing}
        placeholder="兜底备注：疑似套壳、材料缺失、超出维度的额外亮点等其他情况。"
      />
      <div className="mt-2 flex items-center gap-3">
        <Button type="submit" disabled={pending} variant="secondary">
          保存备注
        </Button>
        {state?.ok && <span className="text-sm text-primary">已保存</span>}
        {state?.error && (
          <span className="text-sm text-danger">{state.error}</span>
        )}
      </div>
    </form>
  );
}
