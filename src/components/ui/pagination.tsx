import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

// 通用分页：基于 searchParams 的 ?page=，保留其它查询参数（搜索/筛选）。
export function Pagination({
  page,
  totalPages,
  total,
  params = {},
}: {
  page: number;
  totalPages: number;
  total?: number;
  params?: Record<string, string | undefined>;
}) {
  if (totalPages <= 1) {
    return total !== undefined ? (
      <p className="mt-4 text-xs text-muted-foreground">共 {total} 条</p>
    ) : null;
  }

  const href = (p: number) => {
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) if (v) sp.set(k, v);
    sp.set("page", String(p));
    return `?${sp.toString()}`;
  };

  const base =
    "inline-flex h-9 items-center gap-1 rounded-lg border border-border px-3 text-sm transition-colors";

  return (
    <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
      <span>
        第 {page} / {totalPages} 页{total !== undefined && ` · 共 ${total} 条`}
      </span>
      <div className="flex gap-2">
        {page > 1 ? (
          <Link
            href={href(page - 1)}
            className={cn(base, "text-foreground hover:border-primary")}
          >
            <ChevronLeft size={15} /> 上一页
          </Link>
        ) : (
          <span className={cn(base, "opacity-40")}>
            <ChevronLeft size={15} /> 上一页
          </span>
        )}
        {page < totalPages ? (
          <Link
            href={href(page + 1)}
            className={cn(base, "text-foreground hover:border-primary")}
          >
            下一页 <ChevronRight size={15} />
          </Link>
        ) : (
          <span className={cn(base, "opacity-40")}>
            下一页 <ChevronRight size={15} />
          </span>
        )}
      </div>
    </div>
  );
}
