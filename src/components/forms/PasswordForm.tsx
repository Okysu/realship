"use client";

import { useActionState } from "react";
import { changePassword, type ProfileState } from "@/server/actions/profile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FieldError } from "@/components/ui/field-error";

export function PasswordForm() {
  const [state, action, pending] = useActionState<ProfileState, FormData>(
    changePassword,
    undefined,
  );

  return (
    <form action={action} className="space-y-4">
      {state?.ok && (
        <p className="rounded-lg bg-primary-soft px-3 py-2 text-sm text-primary-soft-foreground">
          密码已更新
        </p>
      )}
      {state?.error && (
        <p className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">
          {state.error}
        </p>
      )}
      <div>
        <Label htmlFor="currentPassword">当前密码</Label>
        <Input
          id="currentPassword"
          name="currentPassword"
          type="password"
          required
        />
        <FieldError messages={state?.errors?.currentPassword} />
      </div>
      <div>
        <Label htmlFor="newPassword">新密码</Label>
        <Input
          id="newPassword"
          name="newPassword"
          type="password"
          placeholder="至少 8 位"
          required
        />
        <FieldError messages={state?.errors?.newPassword} />
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "更新中…" : "更新密码"}
      </Button>
    </form>
  );
}
