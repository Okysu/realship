"use client";

import { useActionState } from "react";
import { addTeamMember, type TeamActionState } from "@/server/actions/team";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function AddTeamMemberForm({
  teamId,
  submissionId,
}: {
  teamId: string;
  submissionId: string;
}) {
  const [state, action, pending] = useActionState<TeamActionState, FormData>(
    addTeamMember,
    undefined,
  );

  return (
    <form action={action} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="teamId" value={teamId} />
      <input type="hidden" name="submissionId" value={submissionId} />
      <Input
        name="email"
        type="email"
        placeholder="队员邮箱（需已注册）"
        required
        className="min-w-48 flex-1"
      />
      <Button type="submit" disabled={pending}>
        添加队员
      </Button>
      {state?.error && (
        <p className="w-full text-sm text-danger">{state.error}</p>
      )}
      {state?.ok && <p className="w-full text-sm text-primary">已添加</p>}
    </form>
  );
}
