import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { BackLink } from "@/components/ui/back-link";
import { requireAuth } from "@/lib/rbac";
import { getOpenCompetitions } from "@/lib/registration";
import { formatDateTime } from "@/lib/utils";
import { SubmissionForm } from "@/components/forms/SubmissionForm";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";

export default async function NewSubmissionPage({
  searchParams,
}: {
  searchParams: Promise<{ competition?: string }>;
}) {
  await requireAuth();
  const { competition } = await searchParams;

  // 只列出当前开放报名的赛事——报名截止的赛事不出现，自然杜绝逾期提交
  const openComps = await getOpenCompetitions();

  if (openComps.length === 0) {
    return (
      <div className="max-w-2xl">
        <BackLink href="/dashboard">返回我的作品</BackLink>
        <h1 className="mb-1 mt-2 text-2xl font-bold text-foreground">
          提交新作品
        </h1>
        <p className="mb-6 text-sm text-muted-foreground">先选择赛事，再填写作品。</p>
        <EmptyState>暂无开放报名的赛事。报名期内才能提交作品。</EmptyState>
      </div>
    );
  }

  const selected = openComps.find((c) => c.id === competition);

  // 第一步：选择赛事
  if (!selected) {
    return (
      <div className="max-w-2xl">
        <BackLink href="/dashboard">返回我的作品</BackLink>
        <h1 className="mb-1 mt-2 text-2xl font-bold text-foreground">
          提交新作品 · 选择赛事
        </h1>
        <p className="mb-6 text-sm text-muted-foreground">
          请先选择要参加的赛事——不同赛事的赛道、表单与加分规则各不相同。
        </p>
        <div className="space-y-3">
          {openComps.map((c) => {
            const reg = c.stages[0];
            return (
              <Link
                key={c.id}
                href={`/dashboard/submissions/new?competition=${c.id}`}
                className="block"
              >
                <Card className="flex items-center justify-between gap-3 p-5 transition-colors hover:border-primary">
                  <div>
                    <h2 className="font-semibold text-foreground">{c.title}</h2>
                    {c.subtitle && (
                      <p className="mt-0.5 text-sm text-muted-foreground">
                        {c.subtitle}
                      </p>
                    )}
                    {reg && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        报名截止 {formatDateTime(reg.endAt)} · {c.tracks.length}{" "}
                        个赛道
                      </p>
                    )}
                  </div>
                  <ArrowRight
                    size={18}
                    className="shrink-0 text-muted-foreground"
                  />
                </Card>
              </Link>
            );
          })}
        </div>
      </div>
    );
  }

  // 第二步：为所选赛事填写作品
  const options = selected.tracks.map((t) => ({
    id: t.id,
    name: t.name,
    competitionTitle: selected.title,
  }));

  return (
    <div className="max-w-2xl">
      <BackLink href="/dashboard/submissions/new">重新选择赛事</BackLink>
      <h1 className="mb-1 mt-2 text-2xl font-bold text-foreground">
        提交新作品 · {selected.title}
      </h1>
      <p className="mb-6 text-sm text-muted-foreground">
        先创建草稿，再补充演示视频、仓库、应用市场 / 邀测链接与附件，最后提交。
      </p>
      {options.length === 0 ? (
        <EmptyState>该赛事尚未设置赛道，暂不能提交。</EmptyState>
      ) : (
        <Card className="p-6">
          <SubmissionForm tracks={options} fields={selected.fields} />
        </Card>
      )}
    </div>
  );
}
