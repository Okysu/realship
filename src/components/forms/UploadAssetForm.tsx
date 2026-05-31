"use client";

import { useActionState } from "react";
import { uploadAsset, type ActionState } from "@/server/actions/submission";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";

const assetTypeLabels: Record<string, string> = {
  SLIDE: "PPT/PDF",
  DESIGN: "设计稿",
  DOCUMENT: "文档",
  IMAGE: "图片",
  VIDEO_UPLOAD: "视频",
  OTHER: "其他",
};

export function UploadAssetForm({ submissionId }: { submissionId: string }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(
    uploadAsset,
    undefined,
  );

  return (
    <form action={action} className="flex flex-wrap items-end gap-2">
      <input type="hidden" name="submissionId" value={submissionId} />
      <Select
        name="type"
        defaultValue="SLIDE"
        className="w-32"
        aria-label="附件类型"
      >
        {Object.entries(assetTypeLabels).map(([v, l]) => (
          <option key={v} value={v}>
            {l}
          </option>
        ))}
      </Select>
      <input
        type="file"
        name="file"
        required
        className="flex-1 text-sm text-muted-foreground file:mr-3 file:rounded-lg file:border-0 file:bg-muted file:px-3 file:py-2 file:text-sm file:text-foreground hover:file:bg-accent"
      />
      <Button type="submit" disabled={pending}>
        {pending ? "上传中…" : "上传"}
      </Button>
      {state?.error && (
        <p className="w-full text-sm text-danger">{state.error}</p>
      )}
    </form>
  );
}
