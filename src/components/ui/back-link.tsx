import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

// 统一的「返回」链接：lucide 箭头替代文本 ←，hover 时箭头左移微动，细节更细腻。
export function BackLink({
  href,
  children,
  className,
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "group inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground",
        className,
      )}
    >
      <ArrowLeft
        size={15}
        className="transition-transform group-hover:-translate-x-0.5"
      />
      {children}
    </Link>
  );
}
