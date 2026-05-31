import { BackLink } from "@/components/ui/back-link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { parseSubmissionContent } from "@/lib/submission-content";
import { requireRole } from "@/lib/rbac";
import { ReviewTracker } from "@/components/review/ReviewTracker";
import { MaterialLink } from "@/components/review/MaterialLink";
import { ScoreForm } from "@/components/forms/ScoreForm";
import { ReviewNoteForm } from "@/components/forms/ReviewNoteForm";
import { TriggerAiReviewButton } from "@/components/forms/TriggerAiReviewButton";
import { AnswerForm } from "@/components/forms/AnswerForm";
import { FeedbackThreadView } from "@/components/review/feedback-thread-view";
import { finalizeReview, reopenReview } from "@/server/actions/judge-score";
import { Section } from "@/components/ui/section";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { isAiEnabled } from "@/lib/ai/config";
import { isConflicted } from "@/lib/conflict";
import { externalLinkTypeLabels } from "@/lib/labels";
import type { ExternalLinkType, MaterialKind } from "@prisma/client";

const linkKind: Record<ExternalLinkType, MaterialKind> = {
  DEMO_VIDEO: "DEMO_VIDEO",
  REPO: "REPO",
  APP_MARKET: "APP_MARKET",
  BETA_TEST: "BETA_TEST",
  HOMEPAGE: "HOMEPAGE",
  OTHER: "DETAIL_PAGE",
};

export default async function JudgeReviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const judge = await requireRole("JUDGE");

  const assignment = await prisma.judgeAssignment.findUnique({
    where: { judgeId_submissionId: { judgeId: judge.id, submissionId: id } },
  });
  if (!assignment) redirect("/judge");
  // 利益冲突回避：评委不得进入自己/同队作品的评审页
  if (await isConflicted(judge.id, id)) redirect("/judge");

  const submission = await prisma.submission.findUnique({
    where: { id },
    include: {
      track: {
        include: {
          competition: {
            select: {
              title: true,
              fields: { orderBy: { sortOrder: "asc" } },
            },
          },
          criteria: { orderBy: { sortOrder: "asc" } },
        },
      },
      links: { orderBy: { createdAt: "asc" } },
      assets: { where: { status: "READY" }, orderBy: { createdAt: "asc" } },
      bonuses: { include: { bonusRule: true } },
      judgeScores: { where: { judgeId: judge.id } },
      judgeNotes: { where: { judgeId: judge.id } },
      aiRuns: {
        orderBy: { createdAt: "asc" },
        include: {
          questions: {
            orderBy: { order: "asc" },
            include: { answers: { where: { judgeId: judge.id } } },
          },
        },
      },
      feedbackThreads: {
        where: { judgeId: judge.id },
        include: { messages: { orderBy: { createdAt: "asc" } } },
      },
    },
  });
  if (!submission || submission.deletedAt) redirect("/judge");

  const myScores = new Map(
    submission.judgeScores.map((s) => [
      s.criterionId,
      { score: Number(s.score), rationale: s.rationale },
    ]),
  );
  const myNote = submission.judgeNotes[0]?.note;
  const hasCrossEvidence = submission.bonuses.length > 0;
  const content = parseSubmissionContent(submission.content);
  const fields = submission.track.competition.fields;
  const aiEnabled = isAiEnabled();
  const runs = submission.aiRuns; // 多 agent：每个 agent 一条 run
  const primaryRun = runs[0]; // 评委对第一个 agent 的问题作答；多 agent 用于评估交叉比对
  // 评审完成度 + 定稿状态（⑥ 提交评审）
  const totalCriteria = submission.track.criteria.length;
  const scoredCount = submission.judgeScores.length;
  const allScored = totalCriteria > 0 && scoredCount >= totalCriteria;
  const finalized = !!assignment.completedAt;

  return (
    <ReviewTracker submissionId={id}>
      <div className="space-y-6 pb-16">
        <div>
          <BackLink href="/judge">返回待评列表</BackLink>
          <h1 className="mt-2 text-2xl font-bold text-foreground">
            {submission.title}
          </h1>
          <p className="text-sm text-muted-foreground">
            {submission.track.competition.title} · {submission.track.name}
          </p>
        </div>

        {/* ① 查阅材料 */}
        <Section title="① 查阅材料">
          <div className="flex flex-wrap gap-2">
            {submission.bonuses.map((b) => (
              <Badge key={b.id} tone="primary">
                {b.bonusRule.label} +{b.bonusRule.points}
              </Badge>
            ))}
            {!hasCrossEvidence && (
              <Badge tone="warning">
                <AlertTriangle size={12} className="mr-1" /> 暂无上架 / 邀测 /
                可运行仓库等加分硬通货证据
              </Badge>
            )}
          </div>
          <div className="mt-4 space-y-4 text-sm">
            {fields.map((f) =>
              content[f.key] ? (
                <Field key={f.key} label={f.label} value={content[f.key]} />
              ) : null,
            )}
          </div>
        </Section>

        {/* ② 查看材料作答 */}
        <Section
          title="② 查看视频 / 仓库 / 产品"
          description="点击下方链接与附件会被记录（用于证明你认真审阅过，参赛者可见）。"
        >
          <div className="space-y-2">
            {submission.links.length === 0 && (
              <p className="text-sm text-muted-foreground">作者未提供外部链接。</p>
            )}
            {submission.links.map((l) => (
              <div
                key={l.id}
                className="rounded-lg bg-muted px-3 py-2 text-sm text-foreground"
              >
                <strong>{externalLinkTypeLabels[l.type]}</strong>：{" "}
                <MaterialLink
                  href={l.url}
                  kind={linkKind[l.type]}
                  refId={l.id}
                  className="text-primary hover:underline"
                >
                  {l.label || l.url}
                </MaterialLink>
              </div>
            ))}
            {submission.assets.map((a) => (
              <div
                key={a.id}
                className="rounded-lg bg-muted px-3 py-2 text-sm text-foreground"
              >
                <strong>附件</strong>：{" "}
                <MaterialLink
                  href={`/files/${a.storageKey}`}
                  kind="ATTACHMENT"
                  refId={a.id}
                  className="text-primary hover:underline"
                >
                  {a.fileName}
                </MaterialLink>
              </div>
            ))}
            {submission.bonuses
              .filter((b) => b.evidenceUrl)
              .map((b) => (
                <div
                  key={b.id}
                  className="rounded-lg bg-muted px-3 py-2 text-sm text-foreground"
                >
                  <strong>{b.bonusRule.label}（加分证据）</strong>：{" "}
                  <MaterialLink
                    href={b.evidenceUrl!}
                    kind="DETAIL_PAGE"
                    refId={b.id}
                    className="text-primary hover:underline"
                  >
                    {b.evidenceUrl}
                  </MaterialLink>
                </div>
              ))}
          </div>
        </Section>

        {/* ③ AI 核查（多 AI 交叉） */}
        <Section
          title={`③ AI 核查${runs.length > 1 ? `（${runs.length} 个 AI 交叉）` : ""}`}
        >
          {!aiEnabled ? (
            <p className="text-sm text-muted-foreground">
              AI 审查未启用（管理员未配置 AI 端点）。可直接进行人工审阅。
            </p>
          ) : runs.length === 0 ? (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                AI 尚未对此作品提问。生成核查问题后，请查看材料逐题作答——纯概念 /
                套壳的作品往往答不上来。
              </p>
              <TriggerAiReviewButton submissionId={id} />
            </div>
          ) : (
            <div className="space-y-4">
              {/* 多 AI 交叉评估：各 agent 的总体判断与风险标记，比对以发现单模型幻觉 */}
              <div className="space-y-2">
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

              {primaryRun && (
                <ol className="space-y-4">
                  {primaryRun.questions.map((q, i) => (
                    <li
                      key={q.id}
                      className="rounded-lg border border-border p-4"
                    >
                      <p className="font-medium text-foreground">
                        Q{i + 1}. {q.question}
                      </p>
                      {(q.intent || q.requiresMaterial) && (
                        <p className="mt-1 text-xs text-muted-foreground">
                          {q.intent && <>意图：{q.intent}　</>}
                          {q.requiresMaterial && (
                            <>需查看：{q.requiresMaterial}</>
                          )}
                        </p>
                      )}
                      <AnswerForm
                        questionId={q.id}
                        existing={
                          q.answers[0]
                            ? {
                                answer: q.answers[0].answer,
                                cantConfirm: q.answers[0].cantConfirm,
                              }
                            : undefined
                        }
                      />
                    </li>
                  ))}
                </ol>
              )}
              <TriggerAiReviewButton submissionId={id} label="重新生成" />
            </div>
          )}
        </Section>

        {/* ④ 打分 */}
        <Section title={`④ 按公开权重打分（${scoredCount}/${totalCriteria}）`}>
          <div className="space-y-3">
            {submission.track.criteria.map((c) => (
              <ScoreForm
                key={c.id}
                submissionId={id}
                criterion={{
                  id: c.id,
                  name: c.name,
                  maxScore: c.maxScore,
                  favorsRunnable: c.favorsRunnable,
                  description: c.description,
                }}
                existing={myScores.get(c.id)}
              />
            ))}
          </div>
        </Section>

        {/* ⑤ 兜底备注 */}
        <Section title="⑤ 兜底备注">
          <ReviewNoteForm submissionId={id} existing={myNote} />
        </Section>

        {/* ⑥ 提交评审（定稿） */}
        <Section
          title="⑥ 提交评审"
          description="确认评分完成后提交定稿——系统会通知作者「已被一位评委完成评审」。如需修改可撤回。"
        >
          {finalized ? (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-primary-soft px-4 py-3">
              <span className="flex items-center gap-2 text-sm text-primary-soft-foreground">
                <CheckCircle2 size={16} /> 你已提交本作品的评审。
              </span>
              <form action={reopenReview}>
                <input type="hidden" name="submissionId" value={id} />
                <button className="text-sm text-muted-foreground hover:text-foreground">
                  撤回以修改
                </button>
              </form>
            </div>
          ) : allScored ? (
            <form action={finalizeReview}>
              <input type="hidden" name="submissionId" value={id} />
              <Button>提交评审</Button>
            </form>
          ) : (
            <p className="rounded-lg bg-warning-soft px-4 py-3 text-sm text-warning-soft-foreground">
              请先完成全部 {totalCriteria} 个维度的打分（当前 {scoredCount}/
              {totalCriteria}），再提交评审。
            </p>
          )}
        </Section>

        {/* ⑥ 选手反馈工单（选手对你的评审有疑问时在此沟通） */}
        {submission.feedbackThreads.length > 0 && (
          <Section
            title="⑥ 选手反馈"
            description="选手对你的评审提出的疑问 / 申诉——请认真回复，让评判可被复核。"
          >
            <div className="space-y-4">
              {submission.feedbackThreads.map((t) => (
                <FeedbackThreadView
                  key={t.id}
                  thread={t}
                  viewerId={judge.id}
                  counterpartLabel="选手"
                />
              ))}
            </div>
          </Section>
        )}
      </div>
    </ReviewTracker>
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
