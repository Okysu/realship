import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/rbac";
import { ForgotPasswordForm } from "@/components/forms/ForgotPasswordForm";
import { ThemeToggle } from "@/components/ui/theme-toggle";

export default async function ForgotPasswordPage() {
  if (await getCurrentUser()) redirect("/dashboard");

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
          <h1 className="mb-1 text-xl font-semibold text-foreground">
            忘记密码
          </h1>
          <p className="mb-6 text-sm text-muted-foreground">
            输入注册邮箱，我们将发送重置链接
          </p>
          <ForgotPasswordForm />
          <p className="mt-4 text-center text-sm text-muted-foreground">
            想起来了？
            <Link href="/login" className="text-primary hover:underline">
              返回登录
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
