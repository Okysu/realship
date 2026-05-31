import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/rbac";
import { LoginForm } from "@/components/forms/LoginForm";
import { ThemeToggle } from "@/components/ui/theme-toggle";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ reset?: string }>;
}) {
  if (await getCurrentUser()) redirect("/dashboard");
  const { reset } = await searchParams;

  return (
    <div className="flex flex-1 items-center justify-center px-4 py-16">
      <div className="w-full max-w-md">
        <div className="mb-8 flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2 font-semibold text-foreground"
          >
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-primary" />
            Real<span className="text-primary">ship</span>
          </Link>
          <ThemeToggle />
        </div>
        <div className="rounded-2xl border border-border bg-card p-8 shadow-sm">
          <h1 className="mb-1 text-xl font-semibold text-foreground">登录</h1>
          <p className="mb-6 text-sm text-muted-foreground">
            进入你的公开评选平台
          </p>
          {reset && (
            <p className="mb-4 rounded-lg bg-primary-soft px-3 py-2 text-sm text-primary-soft-foreground">
              密码已重置，请用新密码登录。
            </p>
          )}
          <LoginForm />
          <p className="mt-4 text-center text-sm text-muted-foreground">
            <Link
              href="/forgot-password"
              className="text-primary hover:underline"
            >
              忘记密码？
            </Link>
            　·　还没有账号？
            <Link href="/register" className="text-primary hover:underline">
              注册
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
