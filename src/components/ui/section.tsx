import { cn } from "@/lib/utils";

// 带可选标题/描述的卡片区块。
export function Section({
  title,
  description,
  action,
  children,
  className,
}: {
  title?: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "rounded-2xl border border-border bg-card p-6 shadow-sm",
        className,
      )}
    >
      {(title || action) && (
        <div className="mb-1 flex items-center justify-between gap-3">
          {title && (
            <h2 className="text-lg font-semibold text-foreground">{title}</h2>
          )}
          {action}
        </div>
      )}
      {description && (
        <p className="text-sm text-muted-foreground">{description}</p>
      )}
      <div className={title || description ? "mt-4" : ""}>{children}</div>
    </section>
  );
}
