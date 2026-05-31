import Link from "next/link";
import { BackLink } from "@/components/ui/back-link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { parseSubmissionContent } from "@/lib/submission-content";
import { requireAuth } from "@/lib/rbac";
import { SubmissionForm } from "@/components/forms/SubmissionForm";
import { AddLinkForm } from "@/components/forms/AddLinkForm";
import { UploadAssetForm } from "@/components/forms/UploadAssetForm";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Section } from "@/components/ui/section";
import { ConfirmSubmit } from "@/components/ui/confirm-submit";
import {
  submitSubmission,
  withdrawSubmission,
  deleteSubmission,
  deleteLink,
  deleteAsset,
  removeBonus,
} from "@/server/actions/submission";
import { removeTeamMember } from "@/server/actions/team";
import { AddTeamMemberForm } from "@/components/forms/AddTeamMemberForm";
import { BonusClaimForm } from "@/components/forms/BonusClaimForm";
import { OpenFeedbackForm } from "@/components/forms/OpenFeedbackForm";
import { FeedbackThreadView } from "@/components/review/feedback-thread-view";
import { submissionStatusLabels, externalLinkTypeLabels } from "@/lib/labels";
import { isRegistrationOpen } from "@/lib/registration";
import { CheckCircle2 } from "lucide-react";

export default async function SubmissionWorkbenchPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireAuth();
  const submission = await prisma.submission.findUnique({
    where: { id },
    include: {
      track: {
        include: {
          competition: {
            select: {
              id: true,
              title: true,
              fields: { orderBy: { sortOrder: "asc" } },
              bonusRules: { orderBy: { sortOrder: "asc" } },
            },
          },
        },
      },
      links: { orderBy: { createdAt: "asc" } },
      assets: { where: { status: "READY" }, orderBy: { createdAt: "asc" } },
      bonuses: { include: { bonusRule: true } },
      team: {
        include: {
          members: {
            orderBy: { joinedAt: "asc" },
            include: { user: { select: { name: true, email: true } } },
          },
        },
      },
      judgeScores: { select: { judgeId: true } },
      assignments: { select: { judgeId: true } },
      feedbackThreads: {
        include: { messages: { orderBy: { createdAt: "asc" } } },
      },
    },
  });
  if (!submission || submission.deletedAt) notFound();
  // 作者本人或团队队员可查看；非相关人退回
  const isLeader = submission.authorId === user.id;
  const isMember =
    isLeader ||
    !!(await prisma.teamMember.findFirst({
      where: { team: { submissions: { some: { id: submission.id } } }, userId: user.id },
      select: { id: true },
    }));
  if (!isMember) redirect("/dashboard");

  const competition = submission.track.competition;
  const tracks = await prisma.track.findMany({
    where: { competitionId: competition.id },
    orderBy: { sortOrder: "asc" },
  });
  const trackOptions = tracks.map((t) => ({
    id: t.id,
    name: t.name,
    competitionTitle: competition.title,
  }));
  const content = parseSubmissionContent(submission.content);
  const claimedByRule = new Map(
    submission.bonuses.map((b) => [b.bonusRuleId, b]),
  );

  const isDraft = submission.status === "DRAFT";
  // 报名窗口：截止后不可提交 / 撤回（作品锁定）
  const regOpen = await isRegistrationOpen(competition.id);
  // 仅队长可编辑/管理；队员只读查看
  const canManage = isLeader && isDraft;

  // 评审反馈：对「已评分」的评委可发起工单（评委匿名 A/B/C，按 judgeId 排序保持一致）
  const scoredJudgeIds = [
    ...new Set(submission.judgeScores.map((s) => s.judgeId)),
  ].sort();
  const threadByJudge = new Map(
    submission.feedbackThreads.map((t) => [t.judgeId, t]),
  );
  const judgeLabel = (jid: string) =>
    `评委 ${String.fromCharCode(65 + scoredJudgeIds.indexOf(jid))}`;

  return (
    <div className="max-w-3xl space-y-8">
      <div>
        <BackLink href="/dashboard">返回我的作品</BackLink>
        <div className="mt-2 flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              {submission.title}
            </h1>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {submission.track.competition.title} · {submission.track.name}
            </p>
          </div>
          <Badge>{submissionStatusLabels[submission.status]}</Badge>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {!isLeader ? (
            <span className="inline-flex h-10 items-center rounded-lg bg-muted px-4 text-sm text-muted-foreground">
              你是团队成员（只读）——由队长管理与提交
            </span>
          ) : isDraft ? (
            regOpen ? (
              <form action={submitSubmission}>
                <input type="hidden" name="submissionId" value={submission.id} />
                <Button>提交作品</Button>
              </form>
            ) : (
              <span className="inline-flex h-10 items-center rounded-lg bg-warning-soft px-4 text-sm text-warning-soft-foreground">
                报名已截止，无法提交
              </span>
            )
          ) : regOpen ? (
            <form action={withdrawSubmission}>
              <input type="hidden" name="submissionId" value={submission.id} />
              <Button variant="secondary">撤回以编辑</Button>
            </form>
          ) : (
            <span className="inline-flex h-10 items-center rounded-lg bg-muted px-4 text-sm text-muted-foreground">
              报名已截止，作品已锁定
            </span>
          )}
          <Link
            href={`/dashboard/submissions/${submission.id}/views`}
            className="inline-flex h-10 items-center rounded-lg border border-border px-4 text-sm font-medium text-foreground transition-colors hover:border-primary hover:text-primary"
          >
            谁看过我
          </Link>
        </div>
      </div>

      <Section title="项目说明">
        {canManage ? (
          <SubmissionForm
            tracks={trackOptions}
            fields={competition.fields}
            submission={{
              id: submission.id,
              title: submission.title,
              trackId: submission.trackId,
              content,
            }}
          />
        ) : (
          <div className="space-y-4 text-sm">
            {isLeader && isDraft === false && (
              <p className="text-warning-soft-foreground">
                已提交，撤回后可编辑。
              </p>
            )}
            {competition.fields.map((f) =>
              content[f.key] ? (
                <Field key={f.key} label={f.label} value={content[f.key]} />
              ) : null,
            )}
          </div>
        )}
      </Section>

      {submission.team && (
        <Section
          title="团队成员"
          description={`队长 + 队员，上限 ${submission.team.maxMembers} 人`}
        >
          <div className="space-y-2">
            {submission.team.members.map((m) => (
              <div
                key={m.id}
                className="flex items-center justify-between rounded-lg bg-muted px-3 py-2 text-sm"
              >
                <span className="text-foreground">
                  {m.user.name ?? m.user.email}
                  {m.role === "LEADER" && (
                    <Badge tone="primary" className="ml-2">
                      队长
                    </Badge>
                  )}
                </span>
                {canManage && m.role !== "LEADER" && (
                  <form action={removeTeamMember}>
                    <input type="hidden" name="memberId" value={m.id} />
                    <input
                      type="hidden"
                      name="submissionId"
                      value={submission.id}
                    />
                    <button className="text-danger hover:underline">移除</button>
                  </form>
                )}
              </div>
            ))}
          </div>
          {canManage && (
            <div className="mt-4 border-t border-border pt-4">
              <AddTeamMemberForm
                teamId={submission.team.id}
                submissionId={submission.id}
              />
            </div>
          )}
        </Section>
      )}

      <Section
        title="外部链接"
        description="演示视频推荐外链；仓库 / 应用市场 / 邀测链接也可作为下方加分项的证据。"
      >
        <div className="space-y-2">
          {submission.links.length === 0 && (
            <p className="text-sm text-muted-foreground">还没有链接。</p>
          )}
          {submission.links.map((l) => (
            <div
              key={l.id}
              className="flex items-center justify-between rounded-lg bg-muted px-3 py-2 text-sm"
            >
              <span className="truncate text-foreground">
                <strong>{externalLinkTypeLabels[l.type]}</strong>：{" "}
                <a
                  href={l.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  {l.label || l.url}
                </a>
              </span>
              {canManage && (
                <form action={deleteLink}>
                  <input type="hidden" name="id" value={l.id} />
                  <input
                    type="hidden"
                    name="submissionId"
                    value={submission.id}
                  />
                  <button className="ml-2 shrink-0 text-danger hover:underline">
                    删除
                  </button>
                </form>
              )}
            </div>
          ))}
        </div>

        {isDraft && (
          <div className="mt-4 border-t border-border pt-4">
            <AddLinkForm submissionId={submission.id} />
          </div>
        )}
      </Section>

      {competition.bonusRules.length > 0 && (
        <Section
          title="加分硬通货"
          description="声明可加分项并附证据链接——直接计入综合得分，多劳多得。"
        >
          <div className="space-y-2">
            {competition.bonusRules.map((rule) => {
              const claimed = claimedByRule.get(rule.id);
              return (
                <div
                  key={rule.id}
                  className="rounded-lg bg-muted px-3 py-2.5 text-sm"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="flex items-center gap-2 text-foreground">
                      {claimed && (
                        <CheckCircle2
                          size={16}
                          className="shrink-0 text-primary"
                        />
                      )}
                      {rule.label}
                      <Badge tone="primary">+{rule.points}</Badge>
                    </span>
                    {canManage && claimed && (
                      <form action={removeBonus}>
                        <input
                          type="hidden"
                          name="submissionId"
                          value={submission.id}
                        />
                        <input
                          type="hidden"
                          name="bonusRuleId"
                          value={rule.id}
                        />
                        <button className="shrink-0 text-danger hover:underline">
                          取消
                        </button>
                      </form>
                    )}
                  </div>
                  {claimed?.evidenceUrl && (
                    <a
                      href={claimed.evidenceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-1 block truncate text-xs text-primary hover:underline"
                    >
                      {claimed.evidenceUrl}
                    </a>
                  )}
                  {canManage && (
                    <BonusClaimForm
                      submissionId={submission.id}
                      bonusRuleId={rule.id}
                      requiresUrl={rule.requiresUrl}
                      claimed={!!claimed}
                      defaultUrl={claimed?.evidenceUrl}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </Section>
      )}

      <Section
        title="附件"
        description="单文件不超过 200MB。"
      >
        <div className="space-y-2">
          {submission.assets.length === 0 && (
            <p className="text-sm text-muted-foreground">还没有附件。</p>
          )}
          {submission.assets.map((a) => (
            <div
              key={a.id}
              className="flex items-center justify-between rounded-lg bg-muted px-3 py-2 text-sm"
            >
              <a
                href={`/files/${a.storageKey}`}
                target="_blank"
                rel="noopener noreferrer"
                className="truncate text-primary hover:underline"
              >
                {a.fileName}
              </a>
              <span className="ml-2 flex shrink-0 items-center gap-3 text-muted-foreground">
                {(a.sizeBytes / 1024 / 1024).toFixed(1)}MB
                {canManage && (
                  <form action={deleteAsset}>
                    <input type="hidden" name="id" value={a.id} />
                    <input
                      type="hidden"
                      name="submissionId"
                      value={submission.id}
                    />
                    <button className="text-danger hover:underline">删除</button>
                  </form>
                )}
              </span>
            </div>
          ))}
        </div>
        {canManage && (
          <div className="mt-4 border-t border-border pt-4">
            <UploadAssetForm submissionId={submission.id} />
          </div>
        )}
      </Section>

      {/* 评审反馈工单：对已评分的评委发起反馈，评委可回复（评委匿名） */}
      {scoredJudgeIds.length > 0 && (
        <Section
          title="评审反馈"
          description="对评委的评分有疑问？可向该评委发起反馈，评委会收到并回复——评委身份匿名。"
        >
          <div className="space-y-4">
            {scoredJudgeIds.map((jid) => {
              const label = judgeLabel(jid);
              const thread = threadByJudge.get(jid);
              return (
                <div key={jid}>
                  <p className="mb-2 text-sm font-medium text-foreground">
                    {label}
                  </p>
                  {thread ? (
                    <FeedbackThreadView
                      thread={thread}
                      viewerId={user.id}
                      counterpartLabel={label}
                    />
                  ) : (
                    <OpenFeedbackForm
                      submissionId={submission.id}
                      judgeId={jid}
                      judgeLabel={label}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </Section>
      )}

      {canManage && (
        <div className="rounded-2xl border border-danger/30 bg-danger/5 p-6">
          <form action={deleteSubmission}>
            <input type="hidden" name="submissionId" value={submission.id} />
            <ConfirmSubmit
              title="删除作品"
              message={`确定删除「${submission.title}」吗？删除后将从你的列表移除（数据保留可联系管理员恢复）。`}
              confirmText="确认删除"
            >
              删除作品
            </ConfirmSubmit>
          </form>
        </div>
      )}
    </div>
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
