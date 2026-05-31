"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { User as UserIcon, LogOut, ChevronDown } from "lucide-react";
import { signOutAction } from "@/server/actions/auth";

// 右上角用户菜单：头像按钮点击弹出（个人资料 / 退出登录）。
// 点击外部或 Esc 关闭。
export function UserMenu({
  name,
  email,
  roleLabel,
}: {
  name: string | null;
  email: string;
  roleLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const initial = (name?.trim()?.[0] ?? email[0] ?? "U").toUpperCase();

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex items-center gap-1.5 rounded-full border border-border py-1 pl-1 pr-2 transition-colors hover:bg-accent"
      >
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-xs font-medium text-primary-foreground">
          {initial}
        </span>
        <ChevronDown
          size={14}
          className={`text-muted-foreground transition-transform ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-50 mt-2 w-56 overflow-hidden rounded-xl border border-border bg-card shadow-[0_8px_32px_-8px_rgba(15,23,42,0.2)]"
        >
          <div className="border-b border-border px-4 py-3">
            <p className="truncate text-sm font-medium text-foreground">
              {name ?? "未命名"}
            </p>
            <p className="truncate text-xs text-muted-foreground">{email}</p>
            {roleLabel && (
              <p className="mt-1 text-xs text-primary">{roleLabel}</p>
            )}
          </div>
          <Link
            href="/profile"
            onClick={() => setOpen(false)}
            role="menuitem"
            className="flex items-center gap-2 px-4 py-2.5 text-sm text-foreground transition-colors hover:bg-accent"
          >
            <UserIcon size={15} /> 个人资料
          </Link>
          <form action={signOutAction} className="border-t border-border">
            <button
              type="submit"
              role="menuitem"
              className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-danger transition-colors hover:bg-accent"
            >
              <LogOut size={15} /> 退出登录
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
