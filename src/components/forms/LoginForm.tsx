"use client";

import { useActionState } from "react";
import Link from "next/link";
import { loginUser } from "@/server/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function LoginForm() {
  const [state, action, pending] = useActionState(loginUser, undefined);

  return (
    <form action={action} className="space-y-4">
      {state?.message && (
        <p className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">
          {state.message}
        </p>
      )}
      <div>
        <Label htmlFor="email">邮箱</Label>
        <Input
          id="email"
          name="email"
          type="email"
          required
          placeholder="you@example.com"
        />
      </div>
      <div>
        <Label htmlFor="password">密码</Label>
        <Input id="password" name="password" type="password" required />
      </div>
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "登录中…" : "登录"}
      </Button>
      <p className="text-center text-sm text-muted-foreground">
        还没有账号？
        <Link href="/register" className="text-primary hover:underline">
          注册
        </Link>
      </p>
    </form>
  );
}
