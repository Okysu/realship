import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
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

export default async function JudgeHomePage({
  searchParams,
}: {
  searchParams: Promise<{ competition?: string }>;
}) {
  const judge = await requireRole("JUDGE");
  const { competition } = await searchParams;

  const assignments = await prisma.judgeAssignment.findMany({
    where: {
      judgeId: judge.id,
      // 利益冲突回避：排除评委自己提交的、或评委所在团队的作品
      submission: {
        authorId: { not: judge.id },
        NOT: { team: { members: { some: { userId: judge.id } } } },
      },
    },
    include: {
      submission: {
        include: {
          track: {
            include: {
              competition: { select: { id: true, title: true } },
              _count: { select: { criteria: true } },
            },
          },
          judgeScores: { where: { judgeId: judge.id }, select: { id: true } },
          bonuses: { include: { bonusRule: { select: { label: true } } } },
        },
      },
    },
    orderBy: { assignedAt: "asc" },
  });

  // 赛事维度：从分配到的作品里收集赛事，供过滤（评委可能跨赛事评审）
  const compMap = new Map<string, string>();
  for (const a of assignments) {
    compMap.set(a.submission.track.competition.id, a.submission.track.competition.title);
  }
  const competitions = [...compMap.entries()].map(([id, title]) => ({ id, title }));
  const selectedComp =
    competition && compMap.has(competition) ? competition : undefined;

  const rows = assignments
    .map((a) => a.submission)
    .filter((s) => !selectedComp || s.track.competition.id === selectedComp);

  const compHref = (id: string | null) =>
    id ? `/judge?competition=${id}` : "/judge";

  return (
    <div>
      <PageHeader
        title="待评作品"
        description="所有作品平等进入同一评审池。AI 会先提问，请查看材料后逐题作答再打分——本次审阅全程留痕，参赛者可见。"
      />

      {/* 赛事过滤（评委跨多赛事时显示） */}
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

      {assignments.length === 0 ? (
        <EmptyState>暂无分配给你的作品。</EmptyState>
      ) : rows.length === 0 ? (
        <EmptyState>该赛事下暂无分配给你的作品。</EmptyState>
      ) : (
        <Card className="overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-left text-muted-foreground">
                  <th className="px-4 py-3 font-medium">作品</th>
                  <th className="px-4 py-3 font-medium">赛事 / 赛道</th>
                  <th className="px-4 py-3 font-medium">加分硬通货</th>
                  <th className="px-4 py-3 font-medium">状态</th>
                  <th className="px-4 py-3 text-center font-medium">评分进度</th>
                  <th className="px-4 py-3 text-right font-medium">操作</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((s) => {
                  const total = s.track._count.criteria;
                  const done = s.judgeScores.length;
                  return (
                    <tr
                      key={s.id}
                      className="border-b border-border/60 transition-colors last:border-0 hover:bg-muted/30"
                    >
                      <td className="px-4 py-3 font-medium text-foreground">
                        {s.title}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                        {s.track.competition.title}
                        <span className="text-foreground/50"> · </span>
                        {s.track.name}
                      </td>
                      <td className="px-4 py-3">
                        {s.bonuses.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {s.bonuses.map((b) => (
                              <Badge key={b.id} tone="primary">
                                {b.bonusRule.label}
                              </Badge>
                            ))}
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <Badge tone={statusTone[s.status]}>
                          {submissionStatusLabels[s.status]}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={
                            done >= total && total > 0
                              ? "text-primary"
                              : "text-muted-foreground"
                          }
                        >
                          {done} / {total}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          href={`/judge/submissions/${s.id}`}
                          className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                        >
                          {done > 0 ? "继续评审" : "去评审"}
                          <ArrowUpRight size={14} />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
