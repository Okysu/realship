"use client";

import { useActionState } from "react";
import { replyFeedback, type FeedbackState } from "@/server/actions/feedback";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

// 工单内追加回复（选手或评委共用）。
export function FeedbackReplyForm({ threadId }: { threadId: string }) {
  const [state, action, pending] = useActionState<FeedbackState, FormData>(
    replyFeedback,
    undefined,
  );

  return (
    <form action={action} className="mt-3 space-y-2">
      <input type="hidden" name="threadId" value={threadId} />
      <Textarea name="body" rows={2} placeholder="写下回复…" required />
      {state?.error && <p className="text-xs text-danger">{state.error}</p>}
      <Button type="submit" variant="secondary" disabled={pending} className="h-9">
        {pending ? "发送中…" : "回复"}
      </Button>
    </form>
  );
}
