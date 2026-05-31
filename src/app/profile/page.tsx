import { requireAuth } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { signOutAction } from "@/server/actions/auth";
import { AppNav } from "@/components/app-nav";
import { UserMenu } from "@/components/user-menu";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Section } from "@/components/ui/section";
import { Button } from "@/components/ui/button";
import { ProfileForm } from "@/components/forms/ProfileForm";
import { PasswordForm } from "@/components/forms/PasswordForm";
import { roleLabels } from "@/lib/labels";

export default async function ProfilePage() {
  const sessionUser = await requireAuth();
  // 用 findUnique（可空）：会话中的用户可能已不存在（被删 / 开发期 reseed），
  // 此时友好降级为「会话已失效」，引导重新登录，而非抛错崩页。
  const user = await prisma.user.findUnique({
    where: { id: sessionUser.id },
    select: { name: true, email: true, bio: true, role: true },
  });

  if (!user) {
    return (
      <div className="flex flex-1 flex-col">
        <AppNav />
        <main className="mx-auto w-full max-w-md flex-1 px-6 py-16 text-center">
          <h1 className="text-xl font-semibold text-foreground">
            会话已失效
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            你的登录信息已过期或账号不存在，请重新登录。
          </p>
          <form action={signOutAction} className="mt-6">
            <Button type="submit">重新登录</Button>
          </form>
        </main>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col">
      <AppNav>
        <UserMenu
          name={user.name}
          email={user.email}
          roleLabel={roleLabels[user.role]}
        />
      </AppNav>
      <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-10">
        <PageHeader
          title="个人资料"
          description="管理你的昵称、简介与登录密码。"
        />
        <div className="space-y-8">
          <Section title="基本资料">
            <Card className="p-6">
              <ProfileForm name={user.name ?? ""} bio={user.bio ?? ""} />
            </Card>
          </Section>
          <Section title="修改密码">
            <Card className="p-6">
              <PasswordForm />
            </Card>
          </Section>
        </div>
      </main>
    </div>
  );
}
