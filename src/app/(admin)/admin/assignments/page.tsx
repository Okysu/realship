import { Check, Plus } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { autoAssignJudges, toggleAssignment } from "@/server/actions/assignment";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/ui/pagination";
import { TabButton } from "@/components/ui/tab-button";
import type { Prisma } from "@prisma/client";
import { submissionStatusLabels } from "@/lib/labels";

const PER_PAGE = 20;

export default async function AssignmentsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; competition?: string }>;
}) {
  const { page: pageParam, competition } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);

  // 赛事维度：多赛事时按赛事筛选作品
  const competitions = await prisma.competition.findMany({
    where: { deletedAt: null },
    orderBy: { createdAt: "desc" },
    select: { id: true, title: true },
  });
  const selectedComp =
    competition && competitions.some((c) => c.id === competition)
      ? competition
      : undefined;

  const where: Prisma.SubmissionWhereInput = {
    deletedAt: null,
    status: { in: ["SUBMITTED", "UNDER_REVIEW", "SCORED"] },
    ...(selectedComp ? { track: { competitionId: selectedComp } } : {}),
  };
  const total = await prisma.submission.count({ where });
  const submissions = await prisma.submission.findMany({
    where,
    orderBy: { submittedAt: "asc" },
    skip: (page - 1) * PER_PAGE,
    take: PER_PAGE,
    include: {
      track: {
        select: { name: true, competition: { select: { title: true } } },
      },
      author: { select: { id: true } },
      team: { select: { members: { select: { userId: true } } } },
      assignments: { select: { judgeId: true } },
    },
  });
  const judges = await prisma.user.findMany({
    where: { role: "JUDGE" },
    orderBy: { createdAt: "asc" },
    select: { id: true, name: true },
  });
  const totalPages = Math.ceil(total / PER_PAGE);

  const compHref = (id: string | null) =>
    id ? `/admin/assignments?competition=${id}` : "/admin/assignments";

  return (
    <div>
      <PageHeader
        title="评委分配"
        description="平等评审池：自动均衡按 round-robin 分配并回避利益冲突；也可手动逐格切换。"
        action={
          <form action={autoAssignJudges} className="flex items-center gap-2">
            {selectedComp && (
              <input type="hidden" name="competitionId" value={selectedComp} />
            )}
            <label className="text-sm text-muted-foreground">
              每份分配
              <input
                type="number"
                name="perSubmission"
                defaultValue={3}
                min={1}
                max={20}
                className="mx-1.5 h-9 w-14 rounded-lg border border-input bg-card px-2 text-center text-sm text-foreground"
              />
              位评委
            </label>
            <Button>均衡分配</Button>
          </form>
        }
      />

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
        <EmptyState>暂无进入评审池的作品（需有已提交作品）。</EmptyState>
      ) : judges.length === 0 ? (
        <EmptyState>
          暂无评委。请先到「用户与评委」把用户角色设为评委。
        </EmptyState>
      ) : (
        <>
          <Card className="overflow-hidden p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40 text-left text-muted-foreground">
                    <th className="px-4 py-3 font-medium">作品</th>
                    {judges.map((j) => (
                      <th
                        key={j.id}
                        className="whitespace-nowrap px-3 py-3 text-center font-medium"
                      >
                        {j.name ?? "评委"}
                      </th>
                    ))}
                    <th className="px-4 py-3 text-center font-medium">已分配</th>
                  </tr>
                </thead>
                <tbody>
                  {submissions.map((s) => {
                    // 利益冲突：作者本人 + 团队成员不可被分配该作品
                    const conflictIds = new Set<string>([s.author.id]);
                    s.team?.members.forEach((m) => conflictIds.add(m.userId));
                    return (
                      <tr
                        key={s.id}
                        className="border-b border-border/60 transition-colors last:border-0 hover:bg-muted/30"
                      >
                        <td className="px-4 py-3">
                          <div className="font-medium text-foreground">
                            {s.title}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {s.track.competition.title} · {s.track.name} ·{" "}
                            {submissionStatusLabels[s.status]}
                          </div>
                        </td>
                        {judges.map((j) => {
                          const assigned = s.assignments.some(
                            (a) => a.judgeId === j.id,
                          );
                          const conflicted = conflictIds.has(j.id);
                          if (conflicted) {
                            return (
                              <td
                                key={j.id}
                                className="px-3 py-3 text-center text-xs text-muted-foreground"
                                title="利益相关，不可分配"
                              >
                                —
                              </td>
                            );
                          }
                          return (
                            <td key={j.id} className="px-3 py-3 text-center">
                              <form
                                action={toggleAssignment}
                                className="inline"
                              >
                                <input
                                  type="hidden"
                                  name="judgeId"
                                  value={j.id}
                                />
                                <input
                                  type="hidden"
                                  name="submissionId"
                                  value={s.id}
                                />
                                <button
                                  aria-label={assigned ? "取消分配" : "分配"}
                                  className={
                                    assigned
                                      ? "inline-flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground transition-opacity hover:opacity-90"
                                      : "inline-flex h-7 w-7 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:border-primary"
                                  }
                                >
                                  {assigned ? (
                                    <Check size={14} />
                                  ) : (
                                    <Plus size={14} />
                                  )}
                                </button>
                              </form>
                            </td>
                          );
                        })}
                        <td className="px-4 py-3 text-center text-muted-foreground">
                          {s.assignments.length}/{judges.length}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
          <Pagination
            page={page}
            totalPages={totalPages}
            total={total}
            params={{ competition: selectedComp }}
          />
        </>
      )}
    </div>
  );
}
