import { notFound } from "next/navigation";
import { Users, RotateCcw } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import { resetJudgeReview } from "@/server/actions/admin";
import { setAward } from "@/server/actions/lifecycle";
import { BackLink } from "@/components/ui/back-link";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { submissionStatusLabels } from "@/lib/labels";

export default async function AdminSubmissionReviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireRole("ADMIN");
  const { id } = await params;
  const submission = await prisma.submission.findUnique({
    where: { id },
    include: {
      track: { include: { criteria: { orderBy: { sortOrder: "asc" } } } },
      author: { select: { name: true } },
      team: { select: { name: true } },
      assignments: {
        include: { judge: { select: { id: true, name: true, email: true } } },
        orderBy: { assignedAt: "asc" },
      },
      judgeScores: { include: { criterion: { select: { name: true } } } },
      judgeNotes: true,
    },
  });
  if (!submission) notFound();

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <BackLink href="/admin/submissions">返回作品管理</BackLink>
        <div className="mt-2 flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              {submission.title}
            </h1>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {submission.track.name} ·{" "}
              {submission.team?.name ?? submission.author.name ?? "—"}
            </p>
          </div>
          <Badge>{submissionStatusLabels[submission.status]}</Badge>
        </div>
      </div>

      {/* 名次与获奖：名次在「公布结果」时定格；获奖可人工指定 */}
      <Card className="p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-sm">
            <span className="text-muted-foreground">当前名次：</span>
            <span className="font-medium text-foreground">
              {submission.finalRank ? `第 ${submission.finalRank} 名` : "未公布"}
            </span>
            {submission.awardLabel && (
              <Badge tone="warning" className="ml-2">
                🏆 {submission.awardLabel}
              </Badge>
            )}
          </div>
          <form action={setAward} className="flex items-center gap-2">
            <input type="hidden" name="submissionId" value={submission.id} />
            <Input
              name="awardLabel"
              defaultValue={submission.awardLabel ?? ""}
              placeholder="获奖标记（如 一等奖）"
              className="h-9 w-44"
            />
            <Button variant="secondary" className="h-9 shrink-0">
              保存
            </Button>
          </form>
        </div>
      </Card>

      <section>
        <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
          <Users size={18} /> 评委评审（{submission.assignments.length} 位）
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          若某评委误评，可「撤销评审」清除其评分 / 备注 /
          作答，评委即可重新评审——操作全程审计留痕。
        </p>

        <div className="mt-4 space-y-4">
          {submission.assignments.length === 0 && (
            <p className="text-sm text-muted-foreground">尚未分配评委。</p>
          )}
          {submission.assignments.map((a) => {
            const judge = a.judge;
            const scores = submission.judgeScores.filter(
              (s) => s.judgeId === judge.id,
            );
            const note = submission.judgeNotes.find(
              (n) => n.judgeId === judge.id,
            );
            const hasReview = scores.length > 0 || !!note;
            return (
              <Card key={judge.id} className="p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <span className="font-medium text-foreground">
                      {judge.name ?? judge.email}
                    </span>
                    <span className="ml-2 text-xs text-muted-foreground">
                      {judge.email}
                    </span>
                  </div>
                  {hasReview ? (
                    <form action={resetJudgeReview}>
                      <input
                        type="hidden"
                        name="submissionId"
                        value={submission.id}
                      />
                      <input type="hidden" name="judgeId" value={judge.id} />
                      <Button variant="danger" className="h-9 shrink-0 px-3">
                        <RotateCcw size={14} className="mr-1" /> 撤销评审
                      </Button>
                    </form>
                  ) : (
                    <Badge tone="warning">未评审</Badge>
                  )}
                </div>

                {scores.length > 0 && (
                  <table className="mt-3 w-full text-sm">
                    <tbody>
                      {scores.map((s) => (
                        <tr
                          key={s.id}
                          className="border-b border-border/40 last:border-0"
                        >
                          <td className="whitespace-nowrap py-1.5 pr-4 text-muted-foreground">
                            {s.criterion.name}
                          </td>
                          <td className="w-12 py-1.5 text-right font-medium text-foreground">
                            {Number(s.score)}
                          </td>
                          <td className="py-1.5 pl-4 text-muted-foreground">
                            {s.rationale}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
                {note && (
                  <p className="mt-2 rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">
                    备注：{note.note}
                  </p>
                )}
              </Card>
            );
          })}
        </div>
      </section>
    </div>
  );
}
