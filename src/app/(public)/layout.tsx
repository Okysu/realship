import Link from "next/link";
import { getCurrentUser } from "@/lib/rbac";
import { AppNav } from "@/components/app-nav";

export default async function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  return (
    <div className="flex flex-1 flex-col">
      <AppNav
        links={[
          { href: "/competitions", label: "赛事规则" },
          { href: "/showcase", label: "作品展示墙" },
          { href: "/ranking", label: "排名榜" },
        ]}
      >
        {user ? (
          <Link
            href="/dashboard"
            className="rounded-full bg-foreground px-4 py-1.5 text-sm text-background transition-opacity hover:opacity-90"
          >
            我的面板
          </Link>
        ) : (
          <Link
            href="/login"
            className="rounded-full border border-border px-4 py-1.5 text-sm text-muted-foreground transition-colors hover:border-primary hover:text-primary"
          >
            登录
          </Link>
        )}
      </AppNav>
      <main className="flex-1">{children}</main>
      <footer className="border-t border-border/70">
        <div className="mx-auto w-full max-w-6xl px-6 py-6 text-sm text-muted-foreground">
          Real · 独立开发者公开评选 · 与任何官方赛事无关 · 评分权重全程公开
        </div>
      </footer>
    </div>
  );
}
