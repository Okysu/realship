import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/rbac";
import { RegisterForm } from "@/components/forms/RegisterForm";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { isEmailEnabled } from "@/lib/email";

export default async function RegisterPage() {
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
            注册参赛者账号
          </h1>
          <p className="mb-6 text-sm text-muted-foreground">
            报名、提交作品、查看「谁看过我」
          </p>
          <RegisterForm emailEnabled={isEmailEnabled()} />
          <p className="mt-4 text-center text-sm text-muted-foreground">
            已有账号？
            <Link href="/login" className="text-primary hover:underline">
              登录
            </Link>
          </p>
        </div>
        <p className="mt-4 text-center text-xs leading-5 text-muted-foreground">
          想成为评委？用同一入口注册后，由主办方在后台审核分配评审席位——
          评审权不自由领取，作品才平等竞争。
        </p>
      </div>
    </div>
  );
}
