import Link from "next/link";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/ui/theme-toggle";

type NavLink = { href: string; label: string };

// 统一顶部导航（毛玻璃 sticky）。各区传入品牌、链接与右侧操作。
export function AppNav({
  brand,
  links = [],
  maxWidth = "max-w-6xl",
  children,
}: {
  brand?: React.ReactNode;
  links?: NavLink[];
  maxWidth?: string;
  children?: React.ReactNode;
}) {
  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/75 backdrop-blur-xl">
      <div
        className={cn(
          "mx-auto flex w-full items-center justify-between px-6 py-3",
          maxWidth,
        )}
      >
        <div className="flex items-center gap-6">
          <Link href="/" className="font-semibold text-foreground">
            {brand ?? (
              <>
                Real<span className="text-primary">ship</span>
              </>
            )}
          </Link>
          <nav className="hidden items-center gap-5 sm:flex">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                {l.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          {children}
        </div>
      </div>
    </header>
  );
}
