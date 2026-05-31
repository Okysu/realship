"use client";

import { useActionState } from "react";
import { resetPassword, type AuthFormState } from "@/server/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FieldError } from "@/components/ui/field-error";

export function ResetPasswordForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState<AuthFormState, FormData>(
    resetPassword,
    undefined,
  );

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="token" value={token} />
      <div>
        <Label htmlFor="password">新密码</Label>
        <Input
          id="password"
          name="password"
          type="password"
          placeholder="至少 8 位"
          required
        />
        <FieldError messages={state?.errors?.password} />
      </div>
      {state?.message && (
        <p className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">
          {state.message}
        </p>
      )}
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "重置中…" : "重置密码"}
      </Button>
    </form>
  );
}
