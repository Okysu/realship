"use client";

import { useActionState } from "react";
import { addBonusRule, type ActionState } from "@/server/actions/admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { FieldError } from "@/components/ui/field-error";

export function AddBonusRuleForm({ competitionId }: { competitionId: string }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(
    addBonusRule,
    undefined,
  );

  return (
    <form action={action} className="space-y-2">
      <input type="hidden" name="competitionId" value={competitionId} />
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        <div>
          <Input name="key" placeholder="key (app_market)" required />
          <FieldError messages={state?.fieldErrors?.key} />
        </div>
        <div>
          <Input name="label" placeholder="名称（上架应用市场）" required />
          <FieldError messages={state?.fieldErrors?.label} />
        </div>
        <Input
          name="points"
          type="number"
          defaultValue="2"
          placeholder="加分"
          aria-label="加分值"
          required
        />
      </div>
      <Input name="description" placeholder="说明（可选，展示在规则页）" />
      <input type="hidden" name="sortOrder" value="0" />
      <label className="flex items-center gap-2 text-sm text-muted-foreground">
        <Checkbox name="requiresUrl" defaultChecked />
        需要参赛者提供证据链接
      </label>
      {state?.error && <p className="text-sm text-danger">{state.error}</p>}
      <Button type="submit" disabled={pending}>
        添加加分项
      </Button>
    </form>
  );
}
