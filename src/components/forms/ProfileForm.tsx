"use client";

import { useActionState } from "react";
import { updateProfile, type ProfileState } from "@/server/actions/profile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FieldError } from "@/components/ui/field-error";

export function ProfileForm({ name, bio }: { name: string; bio: string }) {
  const [state, action, pending] = useActionState<ProfileState, FormData>(
    updateProfile,
    undefined,
  );

  return (
    <form action={action} className="space-y-4">
      {state?.ok && (
        <p className="rounded-lg bg-primary-soft px-3 py-2 text-sm text-primary-soft-foreground">
          资料已保存
        </p>
      )}
      <div>
        <Label htmlFor="name">昵称</Label>
        <Input id="name" name="name" defaultValue={name} required />
        <FieldError messages={state?.errors?.name} />
      </div>
      <div>
        <Label htmlFor="bio">简介（可选）</Label>
        <Textarea
          id="bio"
          name="bio"
          rows={3}
          defaultValue={bio}
          placeholder="一句话介绍你自己——评委可写专业背景，开发者可写擅长方向"
        />
        <FieldError messages={state?.errors?.bio} />
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "保存中…" : "保存资料"}
      </Button>
    </form>
  );
}
