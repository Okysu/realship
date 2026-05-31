"use client";

import { useActionState } from "react";
import { addSubmissionField, type ActionState } from "@/server/actions/admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { FieldError } from "@/components/ui/field-error";

export function AddFieldForm({ competitionId }: { competitionId: string }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(
    addSubmissionField,
    undefined,
  );

  return (
    <form action={action} className="space-y-2">
      <input type="hidden" name="competitionId" value={competitionId} />
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <div>
          <Input name="key" placeholder="key (summary)" required />
          <FieldError messages={state?.fieldErrors?.key} />
        </div>
        <div>
          <Input name="label" placeholder="标签（项目简介）" required />
          <FieldError messages={state?.fieldErrors?.label} />
        </div>
        <Select name="type" aria-label="字段类型">
          <option value="TEXTAREA">多行文本</option>
          <option value="TEXT">单行文本</option>
        </Select>
        <Input
          name="rows"
          type="number"
          defaultValue="3"
          placeholder="行数"
          aria-label="多行文本行数"
        />
      </div>
      <Input name="placeholder" placeholder="占位提示（可选）" />
      <input type="hidden" name="sortOrder" value="0" />
      <label className="flex items-center gap-2 text-sm text-muted-foreground">
        <Checkbox name="required" defaultChecked />
        必填字段
      </label>
      {state?.error && <p className="text-sm text-danger">{state.error}</p>}
      <Button type="submit" disabled={pending}>
        添加字段
      </Button>
    </form>
  );
}
