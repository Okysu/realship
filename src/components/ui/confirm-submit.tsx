"use client";

import { useState, useRef, useEffect, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

// 危险操作二次确认：包裹一个「表单提交按钮」，点击先弹确认框，确认后才真正提交所属 form。
// 用法：把它放进 <form action={...}> 内部，替代原来的 <button>/<Button>。
export function ConfirmSubmit({
  children,
  title = "确认操作",
  message,
  confirmText = "确认删除",
  cancelText = "取消",
  variant = "danger",
  className,
  asLink = false,
}: {
  children: React.ReactNode; // 触发按钮的文案
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "danger" | "primary";
  className?: string;
  asLink?: boolean; // true: 渲染为行内文字链接（用于列表行内的小「删除」）；false: 块状按钮
}) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  // SSR 安全：服务端返回 false，客户端 hydrate 后为 true，避免 createPortal 访问 document 报错
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  // Esc 关闭
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  // 确认：提交按钮所属的 form（用 requestSubmit 以触发 Server Action）。
  function confirm() {
    setOpen(false);
    btnRef.current?.form?.requestSubmit();
  }

  return (
    <>
      {/* 真正的提交按钮，隐藏；由确认框驱动 */}
      <button ref={btnRef} type="submit" className="hidden" aria-hidden />
      {asLink ? (
        <button
          type="button"
          onClick={(e) => {
            // 阻止冒泡：避免触发父级（如 InlineEdit summary 的展开）
            e.stopPropagation();
            e.preventDefault();
            setOpen(true);
          }}
          className={className ?? "text-xs text-danger hover:underline"}
        >
          {children}
        </button>
      ) : (
        <Button
          type="button"
          variant={variant}
          onClick={() => setOpen(true)}
          className={className}
        >
          {children}
        </Button>
      )}

      {mounted &&
        open &&
        createPortal(
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
            onClick={() => setOpen(false)}
          >
            <div
              className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-xl"
              onClick={(e) => e.stopPropagation()}
              role="alertdialog"
              aria-modal="true"
            >
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-danger/10">
                  <AlertTriangle size={20} className="text-danger" />
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="text-base font-semibold text-foreground">
                    {title}
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground">{message}</p>
                </div>
              </div>
              <div className="mt-5 flex justify-end gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setOpen(false)}
                >
                  {cancelText}
                </Button>
                <Button type="button" variant={variant} onClick={confirm}>
                  {confirmText}
                </Button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
