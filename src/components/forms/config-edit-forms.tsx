"use client";

import { useActionState } from "react";
import {
  updateTrack,
  updateStage,
  updateCriterion,
  updateSubmissionField,
  updateBonusRule,
  type ActionState,
} from "@/server/actions/admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { stageTypeLabels, stageStatusLabels } from "@/lib/labels";

// 本地化日期 → datetime-local input 需要的 "YYYY-MM-DDTHH:mm"
function toLocalInput(d: Date | string): string {
  const dt = new Date(d);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}T${pad(dt.getHours())}:${pad(dt.getMinutes())}`;
}

function Saved({ state }: { state: ActionState }) {
  if (state?.ok) return <span className="text-xs text-primary">已保存</span>;
  if (state?.error) return <span className="text-xs text-danger">{state.error}</span>;
  return null;
}

export function EditTrackForm({
  competitionId,
  track,
}: {
  competitionId: string;
  track: { id: string; name: string; description: string | null; sortOrder: number };
}) {
  const [state, action, pending] = useActionState<ActionState, FormData>(updateTrack, undefined);
  return (
    <form action={action} className="space-y-2">
      <input type="hidden" name="id" value={track.id} />
      <input type="hidden" name="competitionId" value={competitionId} />
      <div className="grid grid-cols-3 gap-2">
        <Input name="name" defaultValue={track.name} placeholder="赛道名称" required />
        <Input name="description" defaultValue={track.description ?? ""} placeholder="描述（可选）" className="col-span-2" />
      </div>
      <Input name="sortOrder" type="number" defaultValue={track.sortOrder} aria-label="排序" className="w-24" />
      <div className="flex items-center gap-2">
        <Button type="submit" variant="secondary" disabled={pending} className="h-9">保存</Button>
        <Saved state={state} />
      </div>
    </form>
  );
}

export function EditCriterionForm({
  competitionId,
  criterion,
}: {
  competitionId: string;
  criterion: {
    id: string;
    name: string;
    description: string | null;
    weight: string;
    maxScore: number;
    sortOrder: number;
    favorsRunnable: boolean;
    key: string;
  };
}) {
  const [state, action, pending] = useActionState<ActionState, FormData>(updateCriterion, undefined);
  return (
    <form action={action} className="space-y-2">
      <input type="hidden" name="id" value={criterion.id} />
      <input type="hidden" name="competitionId" value={competitionId} />
      <input type="hidden" name="key" value={criterion.key} />
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Input name="name" defaultValue={criterion.name} placeholder="维度名称" required />
        <Input name="weight" type="number" step="0.01" defaultValue={criterion.weight} placeholder="权重" required aria-label="权重" />
        <Input name="maxScore" type="number" defaultValue={criterion.maxScore} placeholder="满分" required aria-label="满分" />
        <Input name="sortOrder" type="number" defaultValue={criterion.sortOrder} aria-label="排序" />
      </div>
      <Input name="description" defaultValue={criterion.description ?? ""} placeholder="评分指引（可选）" />
      <label className="flex items-center gap-2 text-sm text-muted-foreground">
        <Checkbox name="favorsRunnable" defaultChecked={criterion.favorsRunnable} />
        标记为「可运行 / 真落地」硬通货维度
      </label>
      <div className="flex items-center gap-2">
        <Button type="submit" variant="secondary" disabled={pending} className="h-9">保存</Button>
        <Saved state={state} />
      </div>
    </form>
  );
}

export function EditFieldForm({
  competitionId,
  field,
}: {
  competitionId: string;
  field: {
    id: string;
    key: string;
    label: string;
    type: "TEXT" | "TEXTAREA";
    placeholder: string | null;
    required: boolean;
    rows: number;
    sortOrder: number;
  };
}) {
  const [state, action, pending] = useActionState<ActionState, FormData>(updateSubmissionField, undefined);
  return (
    <form action={action} className="space-y-2">
      <input type="hidden" name="id" value={field.id} />
      <input type="hidden" name="competitionId" value={competitionId} />
      <input type="hidden" name="key" value={field.key} />
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Input name="label" defaultValue={field.label} placeholder="标签" required />
        <Select name="type" defaultValue={field.type} aria-label="字段类型">
          <option value="TEXTAREA">多行文本</option>
          <option value="TEXT">单行文本</option>
        </Select>
        <Input name="rows" type="number" defaultValue={field.rows} aria-label="行数" />
        <Input name="sortOrder" type="number" defaultValue={field.sortOrder} aria-label="排序" />
      </div>
      <Input name="placeholder" defaultValue={field.placeholder ?? ""} placeholder="占位提示（可选）" />
      <label className="flex items-center gap-2 text-sm text-muted-foreground">
        <Checkbox name="required" defaultChecked={field.required} />
        必填字段
      </label>
      <div className="flex items-center gap-2">
        <Button type="submit" variant="secondary" disabled={pending} className="h-9">保存</Button>
        <Saved state={state} />
      </div>
    </form>
  );
}

export function EditBonusRuleForm({
  competitionId,
  rule,
}: {
  competitionId: string;
  rule: {
    id: string;
    key: string;
    label: string;
    description: string | null;
    points: number;
    requiresUrl: boolean;
    sortOrder: number;
  };
}) {
  const [state, action, pending] = useActionState<ActionState, FormData>(updateBonusRule, undefined);
  return (
    <form action={action} className="space-y-2">
      <input type="hidden" name="id" value={rule.id} />
      <input type="hidden" name="competitionId" value={competitionId} />
      <input type="hidden" name="key" value={rule.key} />
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        <Input name="label" defaultValue={rule.label} placeholder="名称" required />
        <Input name="points" type="number" defaultValue={rule.points} placeholder="加分" required aria-label="加分" />
        <Input name="sortOrder" type="number" defaultValue={rule.sortOrder} aria-label="排序" />
      </div>
      <Input name="description" defaultValue={rule.description ?? ""} placeholder="说明（可选）" />
      <label className="flex items-center gap-2 text-sm text-muted-foreground">
        <Checkbox name="requiresUrl" defaultChecked={rule.requiresUrl} />
        需要参赛者提供证据链接
      </label>
      <div className="flex items-center gap-2">
        <Button type="submit" variant="secondary" disabled={pending} className="h-9">保存</Button>
        <Saved state={state} />
      </div>
    </form>
  );
}

export function EditStageForm({
  competitionId,
  stage,
}: {
  competitionId: string;
  stage: {
    id: string;
    type: string;
    name: string;
    status: string;
    startAt: Date | string;
    endAt: Date | string;
    sortOrder: number;
  };
}) {
  const [state, action, pending] = useActionState<ActionState, FormData>(updateStage, undefined);
  return (
    <form action={action} className="space-y-2">
      <input type="hidden" name="id" value={stage.id} />
      <input type="hidden" name="competitionId" value={competitionId} />
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Select name="type" defaultValue={stage.type} aria-label="阶段类型">
          {Object.entries(stageTypeLabels).map(([v, l]) => (
            <option key={v} value={v}>{l}</option>
          ))}
        </Select>
        <Input name="name" defaultValue={stage.name} placeholder="阶段名称" required />
        <Select name="status" defaultValue={stage.status} aria-label="状态">
          {Object.entries(stageStatusLabels).map(([v, l]) => (
            <option key={v} value={v}>{l}</option>
          ))}
        </Select>
        <Input name="sortOrder" type="number" defaultValue={stage.sortOrder} aria-label="排序" />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Input name="startAt" type="datetime-local" defaultValue={toLocalInput(stage.startAt)} aria-label="开始" required />
        <Input name="endAt" type="datetime-local" defaultValue={toLocalInput(stage.endAt)} aria-label="结束" required />
      </div>
      <div className="flex items-center gap-2">
        <Button type="submit" variant="secondary" disabled={pending} className="h-9">保存</Button>
        <Saved state={state} />
      </div>
    </form>
  );
}
