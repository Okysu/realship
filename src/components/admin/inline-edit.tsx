"use client";

import { useState } from "react";
import { Pencil, X } from "lucide-react";

// 行内编辑切换：默认展示只读内容 + 「编辑」按钮，点击展开编辑表单。
// 用于赛道/阶段/维度/字段/加分项的「改而非删了重建」。
export function InlineEdit({
  summary,
  children,
}: {
  summary: React.ReactNode;
  children: React.ReactNode; // 编辑表单（受控于父级 server action）
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded bg-muted px-3 py-1.5 text-sm">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0 flex-1">{summary}</div>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? "收起" : "编辑"}
          className="shrink-0 text-muted-foreground transition-colors hover:text-foreground"
        >
          {open ? <X size={14} /> : <Pencil size={14} />}
        </button>
      </div>
      {open && <div className="mt-2 border-t border-border/60 pt-2">{children}</div>}
    </div>
  );
}
