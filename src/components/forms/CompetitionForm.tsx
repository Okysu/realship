"use client";

import { useActionState } from "react";
import {
  createCompetition,
  updateCompetition,
  type ActionState,
} from "@/server/actions/admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FieldError } from "@/components/ui/field-error";
import { toDatetimeLocal } from "@/lib/utils";

type Competition = {
  id: string;
  title: string;
  slug: string;
  subtitle: string | null;
  description: string;
  manifesto: string | null;
  startAt: Date | string;
  endAt: Date | string;
};

export function CompetitionForm({
  competition,
}: {
  competition?: Competition;
}) {
  const isEdit = !!competition;
  const [state, action, pending] = useActionState<ActionState, FormData>(
    isEdit ? updateCompetition : createCompetition,
    undefined,
  );

  return (
    <form action={action} className="space-y-4">
      {competition && (
        <input type="hidden" name="id" value={competition.id} />
      )}
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
        <Label htmlFor="title">赛事标题</Label>
        <Input
          id="title"
          name="title"
          defaultValue={competition?.title}
          required
        />
        <FieldError messages={state?.fieldErrors?.title} />
      </div>

      <div>
        <Label htmlFor="slug">slug（URL 标识）</Label>
        <Input
          id="slug"
          name="slug"
          defaultValue={competition?.slug}
          placeholder="real-2026"
          required
        />
        <FieldError messages={state?.fieldErrors?.slug} />
      </div>

      <div>
        <Label htmlFor="subtitle">副标题（可选）</Label>
        <Input
          id="subtitle"
          name="subtitle"
          defaultValue={competition?.subtitle ?? ""}
        />
      </div>

      <div>
        <Label htmlFor="description">赛事规则正文</Label>
        <Textarea
          id="description"
          name="description"
          rows={6}
          defaultValue={competition?.description}
          required
        />
        <FieldError messages={state?.fieldErrors?.description} />
      </div>

      <div>
        <Label htmlFor="manifesto">宣言（可选，展示在公开页顶部）</Label>
        <Textarea
          id="manifesto"
          name="manifesto"
          rows={3}
          defaultValue={competition?.manifesto ?? ""}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="startAt">开始时间</Label>
          <Input
            id="startAt"
            name="startAt"
            type="datetime-local"
            defaultValue={
              competition ? toDatetimeLocal(competition.startAt) : ""
            }
            required
          />
          <FieldError messages={state?.fieldErrors?.startAt} />
        </div>
        <div>
          <Label htmlFor="endAt">结束时间</Label>
          <Input
            id="endAt"
            name="endAt"
            type="datetime-local"
            defaultValue={competition ? toDatetimeLocal(competition.endAt) : ""}
            required
          />
          <FieldError messages={state?.fieldErrors?.endAt} />
        </div>
      </div>

      <Button type="submit" disabled={pending}>
        {pending ? "保存中…" : isEdit ? "保存" : "创建赛事"}
      </Button>
    </form>
  );
}
