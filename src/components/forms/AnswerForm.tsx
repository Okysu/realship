"use client";

import { useActionState } from "react";
import {
  saveQuestionAnswer,
  type AnswerActionState,
} from "@/server/actions/judge-answer";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export function AnswerForm({
  questionId,
  existing,
}: {
  questionId: string;
  existing?: { answer: string; cantConfirm: boolean };
}) {
  const [state, action, pending] = useActionState<AnswerActionState, FormData>(
    saveQuestionAnswer,
    undefined,
  );

  return (
    <form action={action} className="mt-2">
      <input type="hidden" name="questionId" value={questionId} />
      <Textarea
        name="answer"
        rows={2}
        defaultValue={existing?.answer}
        placeholder="查看视频 / 产品后作答…"
      />
      <label className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
        <input
          type="checkbox"
          name="cantConfirm"
          defaultChecked={existing?.cantConfirm}
          className="h-3.5 w-3.5"
        />
        材料中无法确认
      </label>
      <div className="mt-1 flex items-center gap-2">
        <Button type="submit" variant="secondary" disabled={pending}>
          保存作答
        </Button>
        {state?.ok && <span className="text-xs text-primary">已保存</span>}
        {state?.error && (
          <span className="text-xs text-danger">{state.error}</span>
        )}
      </div>
    </form>
  );
}
