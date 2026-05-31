"use client";

import { useActionState } from "react";
import {
  requestPasswordReset,
  type AuthFormState,
} from "@/server/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FieldError } from "@/components/ui/field-error";

export function ForgotPasswordForm() {
  const [state, action, pending] = useActionState<AuthFormState, FormData>(
    requestPasswordReset,
    undefined,
  );

  return (
    <form action={action} className="space-y-4">
      <div>
        <Label htmlFor="email">邮箱</Label>
        <Input id="email" name="email" type="email" required />
        <FieldError messages={state?.errors?.email} />
      </div>
      {state?.message && (
        <p className="rounded-lg bg-primary-soft px-3 py-2 text-sm text-primary-soft-foreground">
          {state.message}
        </p>
      )}
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "发送中…" : "发送重置邮件"}
      </Button>
    </form>
  );
}
