"use client";

import { useActionState } from "react";
import { addLink, type ActionState } from "@/server/actions/submission";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { FieldError } from "@/components/ui/field-error";
import { externalLinkTypeLabels } from "@/lib/labels";

export function AddLinkForm({ submissionId }: { submissionId: string }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(
    addLink,
    undefined,
  );

  return (
    <form action={action} className="flex flex-wrap items-end gap-2">
      <input type="hidden" name="submissionId" value={submissionId} />
      <Select
        name="type"
        defaultValue="DEMO_VIDEO"
        className="w-36"
        aria-label="链接类型"
      >
        {Object.entries(externalLinkTypeLabels).map(([v, l]) => (
          <option key={v} value={v}>
            {l}
          </option>
        ))}
      </Select>
      <div className="min-w-48 flex-1">
        <Input name="url" type="url" placeholder="https://…" required />
        <FieldError messages={state?.fieldErrors?.url} />
      </div>
      <Input name="label" placeholder="备注（可选）" className="w-32" />
      <Button type="submit" disabled={pending}>
        添加链接
      </Button>
      {state?.error && (
        <p className="w-full text-sm text-danger">{state.error}</p>
      )}
    </form>
  );
}
