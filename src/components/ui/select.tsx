import type { ComponentProps } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

// 原生 select 美化封装：隐藏系统箭头、自绘 ChevronDown。
// className 作用于外层容器（控制宽度等布局），select 自身固定 h-10 w-full。
export function Select({ className, ...props }: ComponentProps<"select">) {
  return (
    <div className={cn("relative", className)}>
      <select
        className="h-10 w-full appearance-none rounded-lg border border-input bg-card pl-3 pr-9 text-sm text-foreground outline-none transition-colors hover:border-ring/60 focus:border-ring focus:ring-2 focus:ring-ring/20"
        {...props}
      />
      <ChevronDown
        size={16}
        aria-hidden
        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
      />
    </div>
  );
}
