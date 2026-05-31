"use client";

import { useActionState } from "react";
import {
  createSubmission,
  updateSubmission,
  type ActionState,
} from "@/server/actions/submission";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { FieldError } from "@/components/ui/field-error";

type TrackOption = { id: string; name: string; competitionTitle: string };
type FieldDef = {
  key: string;
  label: string;
  type: "TEXT" | "TEXTAREA";
  placeholder: string | null;
  required: boolean;
  rows: number;
};
type SubmissionData = {
  id: string;
  title: string;
  trackId: string;
  content: Record<string, string>;
};

export function SubmissionForm({
  tracks,
  fields,
  submission,
}: {
  tracks: TrackOption[];
  fields: FieldDef[];
  submission?: SubmissionData;
}) {
  const isEdit = !!submission;
  const [state, action, pending] = useActionState<ActionState, FormData>(
    isEdit ? updateSubmission : createSubmission,
    undefined,
  );

  return (
    <form action={action} className="space-y-4">
      {submission && <input type="hidden" name="id" value={submission.id} />}
      {state?.error && (
        <p className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">
          {state.error}
        </p>
      )}
      {state?.ok && (
        <p className="rounded-lg bg-primary-soft px-3 py-2 text-sm text-primary-soft-foreground">
          已保存
        </p>
      )}

      <div>
        <Label htmlFor="title">作品标题</Label>
        <Input id="title" name="title" defaultValue={submission?.title} required />
        <FieldError messages={state?.fieldErrors?.title} />
      </div>

      <div>
        <Label htmlFor="trackId">赛道</Label>
        <Select id="trackId" name="trackId" defaultValue={submission?.trackId}>
          {tracks.map((t) => (
            <option key={t.id} value={t.id}>
              {t.competitionTitle} · {t.name}
            </option>
          ))}
        </Select>
        <FieldError messages={state?.fieldErrors?.trackId} />
      </div>

      {/* 动态字段：按赛事的 SubmissionField 定义渲染，不再硬编码 */}
      {fields.map((f) => {
        const name = `field_${f.key}`;
        const value = submission?.content[f.key] ?? "";
        return (
          <div key={f.key}>
            <Label htmlFor={name}>{f.label}</Label>
            {f.type === "TEXTAREA" ? (
              <Textarea
                id={name}
                name={name}
                rows={f.rows}
                defaultValue={value}
                placeholder={f.placeholder ?? undefined}
                required={f.required}
              />
            ) : (
              <Input
                id={name}
                name={name}
                defaultValue={value}
                placeholder={f.placeholder ?? undefined}
                required={f.required}
              />
            )}
            <FieldError messages={state?.fieldErrors?.[name]} />
          </div>
        );
      })}

      {!isEdit && (
        <div>
          <Label htmlFor="teamName">
            团队名称（可选，填写则按团队参赛，你为队长）
          </Label>
          <Input id="teamName" name="teamName" placeholder="留空则个人参赛" />
        </div>
      )}

      <Button type="submit" disabled={pending}>
        {pending ? "保存中…" : isEdit ? "保存" : "创建作品（草稿）"}
      </Button>
    </form>
  );
}
