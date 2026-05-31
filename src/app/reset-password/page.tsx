import Link from "next/link";
import { ResetPasswordForm } from "@/components/forms/ResetPasswordForm";
import { ThemeToggle } from "@/components/ui/theme-toggle";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

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
            重置密码
          </h1>
          {token ? (
            <>
              <p className="mb-6 text-sm text-muted-foreground">
                设置一个新密码（至少 8 位）
              </p>
              <ResetPasswordForm token={token} />
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              链接无效或缺少参数。请从{" "}
              <Link
                href="/forgot-password"
                className="text-primary hover:underline"
              >
                忘记密码
              </Link>{" "}
              重新申请。
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
