import { requireRole } from "@/lib/rbac";
import { AppNav } from "@/components/app-nav";
import { UserMenu } from "@/components/user-menu";
import { roleLabels } from "@/lib/labels";

export default async function JudgeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireRole("JUDGE");

  return (
    <div className="flex flex-1 flex-col bg-muted/30">
      <AppNav
        brand={
          <>
            <span className="text-primary">Real</span> 评委后台
          </>
        }
        links={[{ href: "/judge", label: "待评作品" }]}
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
