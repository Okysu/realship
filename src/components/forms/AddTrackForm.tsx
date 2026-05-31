"use client";

import { useActionState } from "react";
import { addTrack, type ActionState } from "@/server/actions/admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FieldError } from "@/components/ui/field-error";

export function AddTrackForm({ competitionId }: { competitionId: string }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(
    addTrack,
    undefined,
  );

  return (
    <form action={action} className="flex flex-wrap items-end gap-2">
      <input type="hidden" name="competitionId" value={competitionId} />
      <div className="min-w-40 flex-1">
        <Input name="name" placeholder="赛道名称" required />
        <FieldError messages={state?.fieldErrors?.name} />
      </div>
      <Input name="description" placeholder="赛道说明（可选）" className="flex-1" />
      <Input
        name="sortOrder"
        type="number"
        defaultValue="0"
        className="w-20"
        aria-label="排序"
      />
      <Button type="submit" disabled={pending}>
        添加赛道
      </Button>
      {state?.error && (
        <p className="w-full text-sm text-danger">{state.error}</p>
      )}
    </form>
  );
}
