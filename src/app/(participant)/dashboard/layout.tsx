import { requireAuth } from "@/lib/rbac";
import { AppNav } from "@/components/app-nav";
import { UserMenu } from "@/components/user-menu";
import { roleLabels } from "@/lib/labels";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireAuth();

  return (
    <div className="flex flex-1 flex-col bg-muted/30">
      <AppNav
        links={[
          { href: "/dashboard", label: "我的作品" },
          { href: "/competitions", label: "赛事规则" },
          { href: "/showcase", label: "作品展示墙" },
        ]}
        maxWidth="max-w-5xl"
      >
        <UserMenu
          name={user.name ?? null}
          email={user.email ?? ""}
          roleLabel={roleLabels[user.role]}
        />
      </AppNav>
      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-8">
        {children}
      </main>
    </div>
  );
}
