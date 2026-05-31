import { notFound } from "next/navigation";
import { CheckCircle2, Sparkles, Users } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { externalLinkTypeLabels } from "@/lib/labels";
import { formatDuration } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { JudgeReviewTabs } from "@/components/showcase/judge-review-tabs";

export default async function ShowcaseDetailPage({
  params,
}: {
  params: Promise<{ submissionId: string }>;
}) {
  const { submissionId } = await params;
  // 仅公开「已发布赛事」下「非草稿」的作品，防止未授权数据泄露
  const submission = await prisma.submission.findFirst({
    where: {
      id: submissionId,
      status: { not: "DRAFT" },
      track: { competition: { isPublished: true } },
    },
    include: {
      track: {
        include: {
          competition: {
            select: {
              title: true,
              resultsPublished: true,
              fields: { orderBy: { sortOrder: "asc" } },
            },
          },
          criteria: { orderBy: { sortOrder: "asc" } },
        },
      },
      author: { select: { name: true } },
      team: {
        include: {
          members: {
            orderBy: { joinedAt: "asc" },
            // 公开页不暴露队员邮箱（PII），仅展示昵称
            include: { user: { select: { name: true } } },
          },
        },
      },
      links: { orderBy: { createdAt: "asc" } },
      bonuses: { include: { bonusRule: true } },
      judgeScores: true,
      judgeNotes: { select: { note: true, judgeId: true } },
      aiRuns: {
        orderBy: { createdAt: "asc" },
        include: {
          questions: {
            orderBy: { order: "asc" },
            include: { answers: { orderBy: { createdAt: "asc" } } },
          },
        },
      },
      reviewSessions: { select: { judgeId: true, durationSec: true } },
    },
  });
  if (!submission) notFound();

  const judgeCount = new Set(
    submission.reviewSessions.map((s) => s.judgeId),
  ).size;
  const totalDuration = submission.reviewSessions.reduce(
    (sum, s) => sum + s.durationSec,
    0,
  );

  const content = (submission.content ?? {}) as Record<string, string>;
  const fields = submission.track.competition.fields;
  // 结果门禁：评审期内对公众隐藏分数/名次/评委明细，防过早泄分与评委互看；公布后揭晓
  const showResults = submission.track.competition.resultsPublished;

  // 加权总分（map 保持纯函数，reduce 累加）
  const perCriterion = submission.track.criteria.map((c) => {
    const scores = submission.judgeScores.filter(
      (s) => s.criterionId === c.id,
    );
    const avg = scores.length
      ? scores.reduce((sum, s) => sum + Number(s.score), 0) / scores.length
      : null;
    return {
      name: c.name,
      maxScore: c.maxScore,
      favorsRunnable: c.favorsRunnable,
      weight: Number(c.weight),
      avg,
      rationales: scores.map((s) => s.rationale),
    };
  });
  const maxWeighted = perCriterion.reduce((sum, c) => sum + c.weight, 0);
  const totalWeighted = perCriterion.reduce(
    (sum, c) => sum + (c.avg !== null ? (c.avg / c.maxScore) * c.weight : 0),
    0,
  );
  const weightedScore = maxWeighted ? (totalWeighted / maxWeighted) * 100 : 0;
  // 加分硬通货来自作品声明（按赛事 BonusRule 分值）
  const bonus = submission.bonuses.reduce(
    (sum, b) => sum + b.bonusRule.points,
    0,
  );
  const totalScore = weightedScore + bonus;
  const hasScores = submission.judgeScores.length > 0;

  const runs = submission.aiRuns; // 多 agent：每个 agent 一条 run
  const primaryRun = runs[0];
  const aiQuestions = primaryRun?.questions ?? [];

  // 评委审阅按评委聚合（匿名 A/B/C）：合并该评委的维度评分 + 评语 + 备注 + AI 作答
  const criterionById = new Map(
    submission.track.criteria.map((c) => [c.id, c]),
  );
  const judgeIds = [
    ...new Set([
      ...submission.judgeScores.map((s) => s.judgeId),
      ...submission.judgeNotes.map((n) => n.judgeId),
      ...aiQuestions.flatMap((q) => q.answers.map((a) => a.judgeId)),
    ]),
  ].sort();
  const judgeReviews = judgeIds.map((jid) => ({
    scores: submission.judgeScores
      .filter((s) => s.judgeId === jid)
      .map((s) => {
        const c = criterionById.get(s.criterionId);
        return {
          name: c?.name ?? "",
          score: Number(s.score),
          maxScore: c?.maxScore ?? 10,
          favorsRunnable: c?.favorsRunnable ?? false,
          rationale: s.rationale,
        };
      }),
    note: submission.judgeNotes.find((n) => n.judgeId === jid)?.note ?? null,
    answers: aiQuestions
      .map((q) => {
        const a = q.answers.find((x) => x.judgeId === jid);
        return a
          ? { questionId: q.id, answer: a.answer, cantConfirm: a.cantConfirm }
          : null;
      })
      .filter((x): x is NonNullable<typeof x> => x !== null),
  }));

  return (
    <article className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="text-3xl font-bold tracking-tight text-foreground">
        {submission.title}
      </h1>
      <p className="mt-2 text-muted-foreground">
        {submission.team?.name ?? submission.author.name ?? "匿名"} ·{" "}
        {submission.track.competition.title} · {submission.track.name}
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {/* 公布后展示名次 / 获奖 */}
        {showResults && submission.awardLabel && (
          <Badge tone="warning">🏆 {submission.awardLabel}</Badge>
        )}
        {showResults && submission.finalRank && (
          <Badge tone="primary">第 {submission.finalRank} 名</Badge>
        )}
        {submission.bonuses.map((b) => (
          <Badge key={b.id} tone="primary">
            <Sparkles size={12} className="mr-1" /> {b.bonusRule.label} +
            {b.bonusRule.points}
          </Badge>
        ))}
      </div>

      {/* 评审中：告知结果尚未公布（不泄分） */}
      {!showResults && (
        <div className="mt-5 rounded-xl border border-border bg-muted/40 p-4 text-sm text-muted-foreground">
          本作品正在评审中——为保证公正，评分、名次与评委评语将在赛事
          <span className="font-medium text-foreground">公布结果</span>
          后揭晓。下方的审阅留痕如实展示「被认真看过」。
        </div>
      )}

      {/* 综合得分 + 审阅统计 */}
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {showResults && hasScores && (
          <Card className="p-4">
            <div className="text-3xl font-bold text-foreground">
              {totalScore.toFixed(1)}
            </div>
            <div className="mt-1 text-xs text-muted-foreground">
              综合得分 = 加权 {weightedScore.toFixed(1)} + 加分 {bonus}
            </div>
          </Card>
        )}
        {judgeCount > 0 && (
          <Card className="flex items-center gap-3 p-4">
            <CheckCircle2 className="shrink-0 text-primary" size={22} />
            <div className="text-sm text-foreground">
              已被 {judgeCount} 位评委认真审阅
              <div className="text-xs text-muted-foreground">
                累计 {formatDuration(totalDuration)}
              </div>
            </div>
          </Card>
        )}
      </div>

      {/* 团队成员 */}
      {submission.team && submission.team.members.length > 0 && (
        <section className="mt-8">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
            <Users size={18} /> 团队 · {submission.team.name}
          </h2>
          <div className="mt-2 flex flex-wrap gap-2">
            {submission.team.members.map((m) => (
              <Badge
                key={m.id}
                tone={m.role === "LEADER" ? "primary" : "default"}
              >
                {m.user.name ?? "匿名队员"}
                {m.role === "LEADER" && " · 队长"}
              </Badge>
            ))}
          </div>
        </section>
      )}

      {/* 项目说明（按赛事字段动态展示） */}
      <section className="mt-8 space-y-4 text-sm">
        {fields.map((f) =>
          content[f.key] ? (
            <Field key={f.key} label={f.label} value={content[f.key]} />
          ) : null,
        )}
      </section>

      {submission.links.length > 0 && (
        <section className="mt-8">
          <h2 className="text-lg font-semibold text-foreground">相关链接</h2>
          <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
            {submission.links.map((l) => (
              <li key={l.id}>
                <strong className="text-foreground">
                  {externalLinkTypeLabels[l.type]}
                </strong>
                ：{" "}
                <a
                  href={l.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  {l.label || l.url}
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* AI 总体评估（多 AI 交叉，降低单模型幻觉）——公布后才揭晓，避免评审期影响 */}
      {showResults && runs.length > 0 && (
        <section className="mt-8">
          <h2 className="text-lg font-semibold text-foreground">
            AI 核查{runs.length > 1 && `（${runs.length} 个 AI 交叉）`}
          </h2>
          <div className="mt-3 space-y-2">
            {runs.map((run) => (
              <div
                key={run.id}
                className="rounded-lg border border-border bg-muted/30 p-3"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <Badge>{run.model}</Badge>
                  {run.flags.map((f) => (
                    <Badge key={f} tone="warning">
                      {f}
                    </Badge>
                  ))}
                </div>
                <p className="mt-1.5 text-sm text-muted-foreground">
                  {run.overallAssessment}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 各维度得分（公布后揭晓；权重始终公开见规则页） */}
      {showResults && hasScores && (
        <section className="mt-8">
          <h2 className="text-lg font-semibold text-foreground">各维度得分</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            评分维度与权重全程公开——详细评语见下方各评委分栏。
          </p>
          <Card className="mt-3 overflow-hidden p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-left text-muted-foreground">
                  <th className="px-4 py-2.5 font-medium">维度</th>
                  <th className="px-4 py-2.5 text-right font-medium">权重</th>
                  <th className="px-4 py-2.5 text-right font-medium">平均分</th>
                </tr>
              </thead>
              <tbody>
                {perCriterion.map((c) => (
                  <tr
                    key={c.name}
                    className="border-b border-border/60 last:border-0"
                  >
                    <td className="px-4 py-2.5 text-foreground">
                      {c.name}
                      {c.favorsRunnable && (
                        <Badge tone="primary" className="ml-2">
                          重落地
                        </Badge>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-right text-muted-foreground">
                      {c.weight}
                    </td>
                    <td className="px-4 py-2.5 text-right text-foreground">
                      {c.avg === null
                        ? "—"
                        : `${c.avg.toFixed(1)} / ${c.maxScore}`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </section>
      )}

      {/* 评委审阅（公布后揭晓：评分 + 评语 + 备注 + AI 作答 按评委分栏） */}
      {showResults && (
        <section className="mt-8">
          <h2 className="text-lg font-semibold text-foreground">评委审阅</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            评委身份匿名，按评委分栏——每位评委的评分、评语与 AI
            问答集中可见，让每个判断都被看见。
          </p>
          <JudgeReviewTabs
            questions={aiQuestions.map((q) => ({
              id: q.id,
              question: q.question,
            }))}
            judges={judgeReviews}
          />
        </section>
      )}
    </article>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="font-medium text-foreground">{label}</p>
      <p className="mt-1 whitespace-pre-wrap text-muted-foreground">{value}</p>
    </div>
  );
}
