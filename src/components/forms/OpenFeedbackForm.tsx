"use client";

import { useActionState } from "react";
import {
  openFeedbackThread,
  type FeedbackState,
} from "@/server/actions/feedback";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

// 选手对某位评委发起反馈工单。
export function OpenFeedbackForm({
  submissionId,
  judgeId,
  judgeLabel,
}: {
  submissionId: string;
  judgeId: string;
  judgeLabel: string;
}) {
  const [state, action, pending] = useActionState<FeedbackState, FormData>(
    openFeedbackThread,
    undefined,
  );

  if (state?.ok) {
    return (
      <p className="rounded-lg bg-primary-soft px-3 py-2 text-sm text-primary-soft-foreground">
        已向{judgeLabel}发起反馈，评委回复后你会在此看到。
      </p>
    );
  }

  return (
    <form action={action} className="space-y-2">
      <input type="hidden" name="submissionId" value={submissionId} />
      <input type="hidden" name="judgeId" value={judgeId} />
      <Input name="subject" placeholder={`对${judgeLabel}评审的主题（如：评分疑问）`} required />
      <Textarea
        name="body"
        rows={3}
        placeholder="说明你的疑问或申诉，评委会收到并回复"
        required
      />
      {state?.error && <p className="text-xs text-danger">{state.error}</p>}
      <Button type="submit" disabled={pending} className="h-9">
        {pending ? "提交中…" : `向${judgeLabel}发起反馈`}
      </Button>
    </form>
  );
}
