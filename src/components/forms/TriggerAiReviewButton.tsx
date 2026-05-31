"use client";

import { useActionState } from "react";
import { triggerAiReview, type AiActionState } from "@/server/actions/ai-review";
import { Button } from "@/components/ui/button";

export function TriggerAiReviewButton({
  submissionId,
  label = "触发 AI 审查（生成核查问题）",
}: {
  submissionId: string;
  label?: string;
}) {
  const [state, action, pending] = useActionState<AiActionState, FormData>(
    triggerAiReview,
    undefined,
  );

  return (
    <form action={action}>
      <input type="hidden" name="submissionId" value={submissionId} />
      <Button type="submit" disabled={pending} variant="secondary">
        {pending ? "AI 生成中…" : label}
      </Button>
      {state?.error && <p className="mt-2 text-sm text-danger">{state.error}</p>}
    </form>
  );
}
