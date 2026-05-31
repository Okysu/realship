"use client";

import { useActionState } from "react";
import { setBonus, type ActionState } from "@/server/actions/submission";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// 参赛者声明（或更新证据链接）某个加分项。
export function BonusClaimForm({
  submissionId,
  bonusRuleId,
  requiresUrl,
  claimed,
  defaultUrl,
}: {
  submissionId: string;
  bonusRuleId: string;
  requiresUrl: boolean;
  claimed: boolean;
  defaultUrl?: string | null;
}) {
  const [state, action, pending] = useActionState<ActionState, FormData>(
    setBonus,
    undefined,
  );

  return (
    <form action={action} className="mt-2 flex flex-wrap items-center gap-2">
      <input type="hidden" name="submissionId" value={submissionId} />
      <input type="hidden" name="bonusRuleId" value={bonusRuleId} />
      {requiresUrl && (
        <Input
          name="evidenceUrl"
          placeholder="证据链接 https://…"
          defaultValue={defaultUrl ?? ""}
          className="h-9 max-w-xs"
        />
      )}
      <Button
        type="submit"
        variant="secondary"
        className="h-9 shrink-0 px-3"
        disabled={pending}
      >
        {claimed ? "更新" : "声明加分"}
      </Button>
      {state?.error && (
        <span className="text-xs text-danger">{state.error}</span>
      )}
    </form>
  );
}
