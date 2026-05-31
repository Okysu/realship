import Link from "next/link";
import { BackLink } from "@/components/ui/back-link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { CompetitionForm } from "@/components/forms/CompetitionForm";
import { AddTrackForm } from "@/components/forms/AddTrackForm";
import { AddStageForm } from "@/components/forms/AddStageForm";
import { AddCriterionForm } from "@/components/forms/AddCriterionForm";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Section } from "@/components/ui/section";
import {
  toggleCompetitionPublish,
  deleteCompetition,
  deleteTrack,
  deleteStage,
  deleteCriterion,
  deleteSubmissionField,
  deleteBonusRule,
} from "@/server/actions/admin";
import { LifecycleActions } from "@/components/admin/lifecycle-actions";
import { AddFieldForm } from "@/components/forms/AddFieldForm";
import { AddBonusRuleForm } from "@/components/forms/AddBonusRuleForm";
import { InlineEdit } from "@/components/admin/inline-edit";
import { ConfirmSubmit } from "@/components/ui/confirm-submit";
import {
  EditTrackForm,
  EditStageForm,
  EditCriterionForm,
  EditFieldForm,
  EditBonusRuleForm,
} from "@/components/forms/config-edit-forms";
import { stageTypeLabels, stageStatusLabels } from "@/lib/labels";
import { formatDateTime } from "@/lib/utils";
import { deriveStageStatus } from "@/lib/stage";
import { ArrowUpRight } from "lucide-react";

export default async function EditCompetitionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const competition = await prisma.competition.findUnique({
    where: { id },
    include: {
      tracks: {
        orderBy: { sortOrder: "asc" },
        include: { criteria: { orderBy: { sortOrder: "asc" } } },
      },
      stages: { orderBy: { sortOrder: "asc" } },
      fields: { orderBy: { sortOrder: "asc" } },
      bonusRules: { orderBy: { sortOrder: "asc" } },
    },
  });
  if (!competition || competition.deletedAt) notFound();

  return (
    <div className="max-w-4xl space-y-8">
      <div>
        <BackLink href="/admin">返回赛事列表</BackLink>
        <div className="mt-2 flex items-center justify-between gap-3">
          <h1 className="text-2xl font-bold text-foreground">
            {competition.title}
          </h1>
          <div className="flex items-center gap-3">
            {competition.isPublished && (
              <Link
                href={`/competitions/${competition.slug}`}
                target="_blank"
                className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
              >
                查看公开页 <ArrowUpRight size={14} />
              </Link>
            )}
            <form action={toggleCompetitionPublish}>
              <input type="hidden" name="id" value={competition.id} />
              <Button variant={competition.isPublished ? "secondary" : "primary"}>
                {competition.isPublished ? "取消发布" : "发布"}
              </Button>
            </form>
          </div>
        </div>
      </div>

      <Section title="基本信息">
        <CompetitionForm
          competition={{
            id: competition.id,
            title: competition.title,
            slug: competition.slug,
            subtitle: competition.subtitle,
            description: competition.description,
            manifesto: competition.manifesto,
            startAt: competition.startAt,
            endAt: competition.endAt,
          }}
        />
      </Section>

      <Section
        title="赛道与评分维度"
        description="维度的权重、满分与「硬通货」标记都会在公开规则页完整展示。"
      >
        <div className="mb-5">
          <AddTrackForm competitionId={competition.id} />
        </div>

        {competition.tracks.length === 0 && (
          <p className="text-sm text-muted-foreground">还没有赛道。</p>
        )}

        <div className="space-y-4">
          {competition.tracks.map((track) => (
            <div key={track.id} className="rounded-lg border border-border p-4">
              <InlineEdit
                summary={
                  <div>
                    <strong className="text-foreground">{track.name}</strong>
                    {track.description && (
                      <span className="ml-2 text-sm text-muted-foreground">
                        {track.description}
                      </span>
                    )}
                    <form action={deleteTrack} className="ml-2 inline">
                      <input type="hidden" name="id" value={track.id} />
                      <input
                        type="hidden"
                        name="competitionId"
                        value={competition.id}
                      />
                      <ConfirmSubmit
                        asLink
                        title="删除赛道"
                        message={`确定删除赛道「${track.name}」吗？该赛道下的评分维度与作品归属将一并移除，不可恢复。`}
                      >
                        删除赛道
                      </ConfirmSubmit>
                    </form>
                  </div>
                }
              >
                <EditTrackForm
                  competitionId={competition.id}
                  track={{
                    id: track.id,
                    name: track.name,
                    description: track.description,
                    sortOrder: track.sortOrder,
                  }}
                />
              </InlineEdit>

              <div className="mt-3 space-y-1">
                {track.criteria.map((c) => (
                  <InlineEdit
                    key={c.id}
                    summary={
                      <span className="text-foreground">
                        {c.name}{" "}
                        <code className="text-muted-foreground">{c.key}</code> · 权重{" "}
                        {String(c.weight)} · 满分 {c.maxScore}
                        {c.favorsRunnable && (
                          <Badge tone="primary" className="ml-2">
                            硬通货
                          </Badge>
                        )}
                        <form action={deleteCriterion} className="ml-2 inline">
                          <input type="hidden" name="id" value={c.id} />
                          <input
                            type="hidden"
                            name="competitionId"
                            value={competition.id}
                          />
                          <ConfirmSubmit
                            asLink
                            title="删除评分维度"
                            message={`确定删除维度「${c.name}」吗？已有评委对该维度的打分将一并失效。`}
                          >
                            删除
                          </ConfirmSubmit>
                        </form>
                      </span>
                    }
                  >
                    <EditCriterionForm
                      competitionId={competition.id}
                      criterion={{
                        id: c.id,
                        key: c.key,
                        name: c.name,
                        description: c.description,
                        weight: String(c.weight),
                        maxScore: c.maxScore,
                        sortOrder: c.sortOrder,
                        favorsRunnable: c.favorsRunnable,
                      }}
                    />
                  </InlineEdit>
                ))}
              </div>

              <div className="mt-3 border-t border-border pt-3">
                <AddCriterionForm
                  competitionId={competition.id}
                  trackId={track.id}
                />
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section
        title="提交表单字段"
        description="参赛者提交作品时填写的字段——在这里定义，不再硬编码。"
      >
        <div className="mb-4 space-y-1.5">
          {competition.fields.length === 0 && (
            <p className="text-sm text-muted-foreground">
              还没有字段。下方添加后，参赛者的提交表单会按此动态渲染。
            </p>
          )}
          {competition.fields.map((f) => (
            <InlineEdit
              key={f.id}
              summary={
                <span className="text-foreground">
                  {f.label}{" "}
                  <code className="text-muted-foreground">{f.key}</code> ·{" "}
                  {f.type === "TEXTAREA" ? "多行" : "单行"}
                  {f.required && (
                    <Badge tone="primary" className="ml-2">
                      必填
                    </Badge>
                  )}
                  <form action={deleteSubmissionField} className="ml-2 inline">
                    <input type="hidden" name="id" value={f.id} />
                    <input
                      type="hidden"
                      name="competitionId"
                      value={competition.id}
                    />
                    <ConfirmSubmit
                      asLink
                      title="删除提交字段"
                      message={`确定删除字段「${f.label}」吗？已提交作品中该字段的内容将不再展示。`}
                    >
                      删除
                    </ConfirmSubmit>
                  </form>
                </span>
              }
            >
              <EditFieldForm
                competitionId={competition.id}
                field={{
                  id: f.id,
                  key: f.key,
                  label: f.label,
                  type: f.type,
                  placeholder: f.placeholder,
                  required: f.required,
                  rows: f.rows,
                  sortOrder: f.sortOrder,
                }}
              />
            </InlineEdit>
          ))}
        </div>
        <div className="border-t border-border pt-3">
          <AddFieldForm competitionId={competition.id} />
        </div>
      </Section>

      <Section
        title="加分硬通货"
        description="可叠加的硬加分项与分值——直接计入综合得分，并在规则页公开。"
      >
        <div className="mb-4 space-y-1.5">
          {competition.bonusRules.length === 0 && (
            <p className="text-sm text-muted-foreground">
              还没有加分项。下方添加后，参赛者可在作品中声明并附证据链接。
            </p>
          )}
          {competition.bonusRules.map((b) => (
            <InlineEdit
              key={b.id}
              summary={
                <span className="text-foreground">
                  {b.label}{" "}
                  <code className="text-muted-foreground">{b.key}</code>
                  <Badge tone="primary" className="ml-2">
                    +{b.points}
                  </Badge>
                  {b.requiresUrl && (
                    <span className="ml-2 text-xs text-muted-foreground">
                      需证据链接
                    </span>
                  )}
                  <form action={deleteBonusRule} className="ml-2 inline">
                    <input type="hidden" name="id" value={b.id} />
                    <input
                      type="hidden"
                      name="competitionId"
                      value={competition.id}
                    />
                    <ConfirmSubmit
                      asLink
                      title="删除加分项"
                      message={`确定删除加分项「${b.label}」吗？已声明该加分的作品将失去对应加分。`}
                    >
                      删除
                    </ConfirmSubmit>
                  </form>
                </span>
              }
            >
              <EditBonusRuleForm
                competitionId={competition.id}
                rule={{
                  id: b.id,
                  key: b.key,
                  label: b.label,
                  description: b.description,
                  points: b.points,
                  requiresUrl: b.requiresUrl,
                  sortOrder: b.sortOrder,
                }}
              />
            </InlineEdit>
          ))}
        </div>
        <div className="border-t border-border pt-3">
          <AddBonusRuleForm competitionId={competition.id} />
        </div>
      </Section>

      <Section title="赛事阶段">
        <div className="mb-4 space-y-2">
          {competition.stages.length === 0 && (
            <p className="text-sm text-muted-foreground">还没有阶段。</p>
          )}
          {competition.stages.map((s) => {
            const ds = deriveStageStatus(s);
            return (
              <InlineEdit
                key={s.id}
                summary={
                  <span className="text-foreground">
                    <strong>{stageTypeLabels[s.type]}</strong> · {s.name} ·{" "}
                    <span className="text-muted-foreground">
                      {stageStatusLabels[ds]}
                    </span>{" "}
                    · {formatDateTime(s.startAt)} ~ {formatDateTime(s.endAt)}
                    <form action={deleteStage} className="ml-2 inline">
                      <input type="hidden" name="id" value={s.id} />
                      <input
                        type="hidden"
                        name="competitionId"
                        value={competition.id}
                      />
                      <ConfirmSubmit
                        asLink
                        title="删除阶段"
                        message={`确定删除阶段「${s.name}」吗？该阶段下的作品将失去阶段归属。`}
                      >
                        删除
                      </ConfirmSubmit>
                    </form>
                  </span>
                }
              >
                <EditStageForm
                  competitionId={competition.id}
                  stage={{
                    id: s.id,
                    type: s.type,
                    name: s.name,
                    status: s.status,
                    startAt: s.startAt,
                    endAt: s.endAt,
                    sortOrder: s.sortOrder,
                  }}
                />
              </InlineEdit>
            );
          })}
        </div>
        <AddStageForm competitionId={competition.id} />
      </Section>

      <Section
        title="结果与晋级"
        description="评审收尾用的两个快捷操作（无需填表）：①「晋级」把当前排名前 N 名一键移入下一阶段，仅多阶段赛事需要；②「公布结果」把名次定格并向公众揭晓分数与评语——评审期内这些对公众隐藏。"
      >
        <LifecycleActions
          competitionId={competition.id}
          resultsPublished={competition.resultsPublished}
          stages={competition.stages.map((s) => ({
            id: s.id,
            name: s.name,
            typeLabel: stageTypeLabels[s.type],
          }))}
        />
      </Section>

      <div className="rounded-2xl border border-danger/30 bg-danger/5 p-6">
        <h2 className="text-sm font-semibold text-danger">危险操作</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          删除赛事会将其从所有列表隐藏（软删除，数据保留可恢复）。
        </p>
        <form action={deleteCompetition} className="mt-3">
          <input type="hidden" name="id" value={competition.id} />
          <ConfirmSubmit
            title="删除赛事"
            message={`确定删除赛事「${competition.title}」吗？将从所有列表隐藏（数据保留，可恢复）。`}
            confirmText="确认删除赛事"
          >
            删除赛事
          </ConfirmSubmit>
        </form>
      </div>
    </div>
  );
}
