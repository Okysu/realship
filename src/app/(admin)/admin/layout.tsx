import { requireRole } from "@/lib/rbac";
import { AppNav } from "@/components/app-nav";
import { UserMenu } from "@/components/user-menu";
import { roleLabels } from "@/lib/labels";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireRole("ADMIN");

  return (
    <div className="flex flex-1 flex-col bg-muted/30">
      <AppNav
        brand={
          <>
            <span className="text-primary">Real</span> 管理后台
          </>
        }
        links={[
          { href: "/admin", label: "赛事" },
          { href: "/admin/submissions", label: "作品管理" },
          { href: "/admin/assignments", label: "评委分配" },
          { href: "/admin/users", label: "用户与评委" },
          { href: "/admin/audit", label: "审计日志" },
        ]}
      >
        <UserMenu
          name={user.name ?? null}
          email={user.email ?? ""}
          roleLabel={roleLabels[user.role]}
        />
      </AppNav>
      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-8">
        {children}
      </main>
    </div>
  );
}
