import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowUpRight } from "lucide-react";
import { requireAuth } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { TabButton } from "@/components/ui/tab-button";
import { submissionStatusLabels } from "@/lib/labels";
import type { SubmissionStatus } from "@prisma/client";

const statusTone: Record<SubmissionStatus, "default" | "primary" | "warning"> = {
  DRAFT: "default",
  SUBMITTED: "primary",
  UNDER_REVIEW: "warning",
  SCORED: "primary",
  WITHDRAWN: "default",
};

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ competition?: string }>;
}) {
  const user = await requireAuth();
  if (user.role === "ADMIN") redirect("/admin");
  if (user.role === "JUDGE") redirect("/judge");
  const { competition } = await searchParams;

  // 作者本人 + 团队队员都能看到参与的作品（队员此前完全看不到，是团队功能硬伤）
  const submissions = await prisma.submission.findMany({
    where: {
      OR: [
        { authorId: user.id },
        { team: { members: { some: { userId: user.id } } } },
      ],
    },
    orderBy: { updatedAt: "desc" },
    include: {
      track: { include: { competition: { select: { id: true, title: true } } } },
      _count: { select: { reviewSessions: true } },
    },
  });

  // 赛事维度：参赛者可能跨多赛事投稿
  const compMap = new Map<string, string>();
  for (const s of submissions) {
    compMap.set(s.track.competition.id, s.track.competition.title);
  }
  const competitions = [...compMap.entries()].map(([id, title]) => ({ id, title }));
  const selectedComp =
    competition && compMap.has(competition) ? competition : undefined;
  const rows = submissions.filter(
    (s) => !selectedComp || s.track.competition.id === selectedComp,
  );

  const compHref = (id: string | null) =>
    id ? `/dashboard?competition=${id}` : "/dashboard";

  return (
    <div>
      <PageHeader
        title="我的作品"
        action={
          <Link href="/dashboard/submissions/new">
            <Button>提交新作品</Button>
          </Link>
        }
      />

      {/* 赛事过滤（跨多赛事投稿时显示） */}
      {competitions.length > 1 && (
        <div className="mb-4 flex flex-wrap gap-2">
          <TabButton active={!selectedComp} href={compHref(null)}>
            全部赛事
          </TabButton>
          {competitions.map((c) => (
            <TabButton
              key={c.id}
              active={selectedComp === c.id}
              href={compHref(c.id)}
            >
              {c.title}
            </TabButton>
          ))}
        </div>
      )}

      {submissions.length === 0 ? (
        <EmptyState>还没有作品。点击「提交新作品」开始参赛。</EmptyState>
      ) : (
        <Card className="overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-left text-muted-foreground">
                  <th className="px-4 py-3 font-medium">作品</th>
                  <th className="px-4 py-3 font-medium">赛事 / 赛道</th>
                  <th className="px-4 py-3 text-center font-medium">审阅</th>
                  <th className="px-4 py-3 font-medium">状态</th>
                  <th className="px-4 py-3 text-right font-medium">操作</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((s) => (
                  <tr
                    key={s.id}
                    className="border-b border-border/60 transition-colors last:border-0 hover:bg-muted/30"
                  >
                    <td className="px-4 py-3 font-medium text-foreground">
                      {s.title}
                      {s.authorId !== user.id && (
                        <Badge className="ml-2">团队成员</Badge>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                      {s.track.competition.title}
                      <span className="text-foreground/50"> · </span>
                      {s.track.name}
                    </td>
                    <td className="px-4 py-3 text-center text-muted-foreground">
                      {s._count.reviewSessions > 0
                        ? `${s._count.reviewSessions} 次`
                        : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone={statusTone[s.status]}>
                        {submissionStatusLabels[s.status]}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/dashboard/submissions/${s.id}`}
                        className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                      >
                        {s.authorId === user.id ? "管理" : "查看"}
                        <ArrowUpRight size={14} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
