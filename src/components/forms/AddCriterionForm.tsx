"use client";

import { useActionState } from "react";
import { addCriterion, type ActionState } from "@/server/actions/admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { FieldError } from "@/components/ui/field-error";

export function AddCriterionForm({
  competitionId,
  trackId,
}: {
  competitionId: string;
  trackId: string;
}) {
  const [state, action, pending] = useActionState<ActionState, FormData>(
    addCriterion,
    undefined,
  );

  return (
    <form action={action} className="space-y-2">
      <input type="hidden" name="competitionId" value={competitionId} />
      <input type="hidden" name="trackId" value={trackId} />
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <div>
          <Input name="key" placeholder="key (runnability)" required />
          <FieldError messages={state?.fieldErrors?.key} />
        </div>
        <div>
          <Input name="name" placeholder="维度名称" required />
          <FieldError messages={state?.fieldErrors?.name} />
        </div>
        <Input
          name="weight"
          type="number"
          step="0.01"
          placeholder="权重"
          required
          aria-label="权重"
        />
        <Input
          name="maxScore"
          type="number"
          defaultValue="10"
          placeholder="满分"
          required
          aria-label="满分"
        />
      </div>
      <Input name="description" placeholder="评分指引（可选，也会提供给 AI 与评委）" />
      <input type="hidden" name="sortOrder" value="0" />
      <label className="flex items-center gap-2 text-sm text-muted-foreground">
        <Checkbox name="favorsRunnable" />
        标记为「可运行 / 真落地」硬通货维度
      </label>
      {state?.error && <p className="text-sm text-danger">{state.error}</p>}
      <Button type="submit" disabled={pending}>
        添加维度
      </Button>
    </form>
  );
}
