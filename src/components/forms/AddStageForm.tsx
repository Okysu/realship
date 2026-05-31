"use client";

import { useActionState } from "react";
import { addStage, type ActionState } from "@/server/actions/admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { stageTypeLabels, stageStatusLabels } from "@/lib/labels";

export function AddStageForm({ competitionId }: { competitionId: string }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(
    addStage,
    undefined,
  );

  return (
    <form
      action={action}
      className="space-y-2 rounded-lg border border-dashed border-border p-3"
    >
      <input type="hidden" name="competitionId" value={competitionId} />
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        <Select name="type" defaultValue="REGISTRATION" aria-label="阶段类型">
          {Object.entries(stageTypeLabels).map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </Select>
        <Input name="name" placeholder="阶段名称" required />
        <Select name="status" defaultValue="UPCOMING" aria-label="阶段状态">
          {Object.entries(stageStatusLabels).map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </Select>
        <Input name="startAt" type="datetime-local" required aria-label="开始" />
        <Input name="endAt" type="datetime-local" required aria-label="结束" />
        <Input
          name="sortOrder"
          type="number"
          defaultValue="0"
          aria-label="排序"
        />
      </div>
      {state?.error && <p className="text-sm text-danger">{state.error}</p>}
      <Button type="submit" disabled={pending}>
        添加阶段
      </Button>
    </form>
  );
}
