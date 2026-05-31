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
import {
  publishResults,
  unpublishResults,
  promoteByRank,
} from "@/server/actions/lifecycle";
import { AddFieldForm } from "@/components/forms/AddFieldForm";
import { AddBonusRuleForm } from "@/components/forms/AddBonusRuleForm";
import { InlineEdit } from "@/components/admin/inline-edit";
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
  if (!competition) notFound();

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
                      <button className="text-xs text-danger hover:underline">
                        删除赛道
                      </button>
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
                          <button
                            className="text-xs text-danger hover:underline"
                            aria-label="删除维度"
                          >
                            删除
                          </button>
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
                    <button
                      className="text-xs text-danger hover:underline"
                      aria-label="删除字段"
                    >
                      删除
                    </button>
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
                    <button
                      className="text-xs text-danger hover:underline"
                      aria-label="删除加分项"
                    >
                      删除
                    </button>
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
                      <button className="text-xs text-danger hover:underline">
                        删除
                      </button>
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
        description="评审收尾：晋级把当前排名前 N 移入下一阶段；公布结果会定格名次并向公众揭晓分数/评语。"
      >
        {/* 晋级：前 N 名进入某阶段 */}
        <div className="rounded-lg border border-border p-4">
          <p className="text-sm font-medium text-foreground">晋级前 N 名</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            按当前综合得分，把前 N 名作品移入所选阶段（如「初赛前 20 进复赛」）。
          </p>
          <form
            action={promoteByRank}
            className="mt-3 flex flex-wrap items-center gap-2"
          >
            <input type="hidden" name="competitionId" value={competition.id} />
            <input
              type="number"
              name="topN"
              defaultValue={10}
              min={1}
              className="h-9 w-20 rounded-lg border border-input bg-card px-2 text-center text-sm text-foreground"
              aria-label="前 N 名"
            />
            <span className="text-sm text-muted-foreground">名 →</span>
            <select
              name="stageId"
              className="h-9 rounded-lg border border-input bg-card px-2 text-sm text-foreground"
              aria-label="目标阶段"
            >
              {competition.stages.map((s) => (
                <option key={s.id} value={s.id}>
                  {stageTypeLabels[s.type]} · {s.name}
                </option>
              ))}
            </select>
            <Button variant="secondary" className="h-9">
              晋级
            </Button>
          </form>
        </div>

        {/* 公布结果 */}
        <div className="mt-4 rounded-lg border border-border p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-foreground">
                {competition.resultsPublished ? "结果已公布" : "结果未公布"}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {competition.resultsPublished
                  ? "公众可在展示墙/排行榜看到分数、名次与评委评语。"
                  : "评审期内分数对公众隐藏；公布后定格名次并揭晓。"}
              </p>
            </div>
            {competition.resultsPublished ? (
              <form action={unpublishResults}>
                <input
                  type="hidden"
                  name="competitionId"
                  value={competition.id}
                />
                <Button variant="secondary">撤回公布</Button>
              </form>
            ) : (
              <form action={publishResults}>
                <input
                  type="hidden"
                  name="competitionId"
                  value={competition.id}
                />
                <Button>公布结果</Button>
              </form>
            )}
          </div>
        </div>
      </Section>

      <div className="rounded-2xl border border-danger/30 bg-danger/5 p-6">
        <h2 className="text-sm font-semibold text-danger">危险操作</h2>
        <form action={deleteCompetition} className="mt-3">
          <input type="hidden" name="id" value={competition.id} />
          <Button variant="danger">删除赛事（连带赛道/阶段/作品）</Button>
        </form>
      </div>
    </div>
  );
}
