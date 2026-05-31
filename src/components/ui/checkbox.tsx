import type { ComponentProps } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

// 美化复选框：原生 input(appearance-none, peer) + 自绘方块 + Check 图标。
// 选中时填充 primary、显示白色对勾，键盘可聚焦。
export function Checkbox({ className, ...props }: ComponentProps<"input">) {
  return (
    <span className="relative inline-flex h-4 w-4 shrink-0 items-center justify-center">
      <input
        type="checkbox"
        className={cn(
          "peer h-4 w-4 cursor-pointer appearance-none rounded-[5px] border border-input bg-card transition-colors checked:border-primary checked:bg-primary focus-visible:ring-2 focus-visible:ring-ring/30",
          className,
        )}
        {...props}
      />
      <Check
        size={11}
        strokeWidth={3}
        aria-hidden
        className="pointer-events-none absolute text-primary-foreground opacity-0 transition-opacity peer-checked:opacity-100"
      />
    </span>
  );
}
