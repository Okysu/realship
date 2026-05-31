import Link from "next/link";
import { cn } from "@/lib/utils";

// 统一的胶囊式 Tab 按钮（链接版）：用于赛事 / 赛道 / 状态等筛选切换。
export function TabButton({
  active,
  href,
  children,
}: {
  active: boolean;
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "rounded-full px-3.5 py-1.5 text-sm transition-colors",
        active
          ? "bg-primary text-primary-foreground"
          : "border border-border text-muted-foreground hover:border-primary",
      )}
    >
      {children}
    </Link>
  );
}
