"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  createUploadTicket,
  confirmUpload,
} from "@/server/actions/submission";
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

type Phase = "idle" | "preparing" | "uploading" | "confirming";

export function UploadAssetForm({ submissionId }: { submissionId: string }) {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("idle");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [assetType, setAssetType] = useState("SLIDE");
  const fileRef = useRef<HTMLInputElement>(null);

  const busy = phase !== "idle";

  // 预签名直传三步：① 申请票据（登记 PENDING + 拿直传 URL）
  // ② 浏览器 PUT 直传对象存储（不经服务器）③ confirm 确认置 READY。
  async function handleUpload() {
    setError(null);
    const file = fileRef.current?.files?.[0];
    if (!file) {
      setError("请选择文件");
      return;
    }

    // ① 申请上传票据
    setPhase("preparing");
    setProgress(0);
    const ticketForm = new FormData();
    ticketForm.set("submissionId", submissionId);
    ticketForm.set("type", assetType);
    ticketForm.set("fileName", file.name);
    ticketForm.set("sizeBytes", String(file.size));
    ticketForm.set("contentType", file.type || "application/octet-stream");
    const res = await createUploadTicket(undefined, ticketForm);
    if (!res?.ok || !res.ticket) {
      setError(res?.error ?? "申请上传失败");
      setPhase("idle");
      return;
    }
    const { assetId, uploadUrl, headers } = res.ticket;

    // ② 浏览器直传（XHR 以获取真实进度）
    setPhase("uploading");
    try {
      await putWithProgress(uploadUrl, file, headers, setProgress);
    } catch {
      setError("上传失败，请重试");
      setPhase("idle");
      return;
    }

    // ③ 确认上传完成
    setPhase("confirming");
    const confirmForm = new FormData();
    confirmForm.set("submissionId", submissionId);
    confirmForm.set("assetId", assetId);
    const done = await confirmUpload(undefined, confirmForm);
    if (!done?.ok) {
      setError(done?.error ?? "确认上传失败");
      setPhase("idle");
      return;
    }

    // 成功：重置表单并刷新列表
    if (fileRef.current) fileRef.current.value = "";
    setPhase("idle");
    setProgress(0);
    router.refresh();
  }

  const label =
    phase === "preparing"
      ? "准备中…"
      : phase === "uploading"
        ? `上传中 ${progress}%`
        : phase === "confirming"
          ? "确认中…"
          : "上传";

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-end gap-2">
        <Select
          name="type"
          value={assetType}
          onChange={(e) => setAssetType(e.target.value)}
          className="w-32"
          aria-label="附件类型"
          disabled={busy}
        >
          {Object.entries(assetTypeLabels).map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </Select>
        <input
          ref={fileRef}
          type="file"
          name="file"
          required
          disabled={busy}
          className="flex-1 text-sm text-muted-foreground file:mr-3 file:rounded-lg file:border-0 file:bg-muted file:px-3 file:py-2 file:text-sm file:text-foreground hover:file:bg-accent disabled:opacity-50"
        />
        <Button type="button" onClick={handleUpload} disabled={busy}>
          {label}
        </Button>
      </div>
      {phase === "uploading" && (
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
      {error && <p className="text-sm text-danger">{error}</p>}
    </div>
  );
}

// 用 XMLHttpRequest 直传以获取进度（fetch 无法读上传进度）。
function putWithProgress(
  url: string,
  file: File,
  headers: Record<string, string>,
  onProgress: (pct: number) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    for (const [k, v] of Object.entries(headers)) {
      xhr.setRequestHeader(k, v);
    }
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    };
    xhr.onload = () => {
      // S3/R2 直传成功多为 200；本地端点返回 204
      if (xhr.status >= 200 && xhr.status < 300) resolve();
      else reject(new Error(`上传失败：${xhr.status}`));
    };
    xhr.onerror = () => reject(new Error("网络错误"));
    xhr.send(file);
  });
}
