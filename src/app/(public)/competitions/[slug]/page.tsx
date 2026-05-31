import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { stageTypeLabels, stageStatusLabels } from "@/lib/labels";
import { formatDateTime } from "@/lib/utils";
import { deriveStageStatus } from "@/lib/stage";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Markdown } from "@/components/ui/markdown";
import { Sparkles } from "lucide-react";
import type { StageStatus } from "@prisma/client";

const stageTone: Record<StageStatus, "default" | "primary" | "warning"> = {
  UPCOMING: "default",
  OPEN: "primary",
  REVIEWING: "warning",
  CLOSED: "default",
};

export default async function CompetitionDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const competition = await prisma.competition.findFirst({
    where: { slug, isPublished: true, deletedAt: null },
    include: {
      stages: { orderBy: { sortOrder: "asc" } },
      tracks: {
        orderBy: { sortOrder: "asc" },
        include: { criteria: { orderBy: { sortOrder: "asc" } } },
      },
      bonusRules: { orderBy: { sortOrder: "asc" } },
    },
  });
  if (!competition) notFound();

  return (
    <article className="mx-auto max-w-4xl px-6 py-12">
      {/* 宣言 */}
      {competition.manifesto && (
        <div className="mb-8 rounded-2xl border-l-4 border-primary bg-primary-soft p-6">
          <p className="whitespace-pre-wrap text-lg leading-8 text-primary-soft-foreground">
            {competition.manifesto}
          </p>
        </div>
      )}

      <h1 className="text-3xl font-bold tracking-tight text-foreground">
        {competition.title}
      </h1>
      {competition.subtitle && (
        <p className="mt-2 text-lg text-muted-foreground">
          {competition.subtitle}
        </p>
      )}
      <p className="mt-2 text-sm text-muted-foreground">
        {formatDateTime(competition.startAt)} ～ {formatDateTime(competition.endAt)}
      </p>

      {/* 规则正文（Markdown） */}
      <section className="mt-8">
        <h2 className="text-xl font-semibold text-foreground">赛事规则</h2>
        <div className="mt-3">
          <Markdown content={competition.description} />
        </div>
      </section>

      {/* 阶段时间线（状态按真实日期动态计算） */}
      {competition.stages.length > 0 && (
        <section className="mt-10">
          <h2 className="text-xl font-semibold text-foreground">赛程阶段</h2>
          <ol className="mt-4 space-y-3">
            {competition.stages.map((s) => {
              const ds = deriveStageStatus(s);
              return (
                <Card key={s.id} className="flex items-center gap-4 p-4">
                  <Badge tone={stageTone[ds]} className="shrink-0">
                    {stageStatusLabels[ds]}
                  </Badge>
                  <div className="flex-1">
                    <p className="font-medium text-foreground">
                      {stageTypeLabels[s.type]} · {s.name}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {formatDateTime(s.startAt)} ～ {formatDateTime(s.endAt)}
                    </p>
                  </div>
                </Card>
              );
            })}
          </ol>
        </section>
      )}

      {/* 赛道与评分标准（全公开） */}
      <section className="mt-10">
        <h2 className="text-xl font-semibold text-foreground">赛道与评分标准</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          评分维度、权重与满分全程公开、可复核——标准摆在这里，谁是产品谁是 PPT，自有公论。
        </p>
        <div className="mt-4 space-y-6">
          {competition.tracks.map((track) => {
            const totalWeight = track.criteria.reduce(
              (sum, c) => sum + Number(c.weight),
              0,
            );
            return (
              <Card key={track.id} className="p-5">
                <h3 className="font-semibold text-foreground">{track.name}</h3>
                {track.description && (
                  <p className="mt-1 text-sm text-muted-foreground">
                    {track.description}
                  </p>
                )}
                {track.criteria.length > 0 ? (
                  <table className="mt-4 w-full text-sm">
                    <thead>
                      <tr className="border-b border-border text-left text-muted-foreground">
                        <th className="pb-2 font-medium">维度</th>
                        <th className="pb-2 font-medium">说明</th>
                        <th className="pb-2 text-right font-medium">权重</th>
                        <th className="pb-2 text-right font-medium">满分</th>
                      </tr>
                    </thead>
                    <tbody>
                      {track.criteria.map((c) => (
                        <tr key={c.id} className="border-b border-border/60">
                          <td className="py-2 font-medium text-foreground">
                            {c.name}
                            {c.favorsRunnable && (
                              <Badge tone="primary" className="ml-2">
                                硬通货
                              </Badge>
                            )}
                          </td>
                          <td className="py-2 text-muted-foreground">
                            {c.description ?? "—"}
                          </td>
                          <td className="py-2 text-right text-foreground">
                            {Number(c.weight)}
                          </td>
                          <td className="py-2 text-right text-foreground">
                            {c.maxScore}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr>
                        <td className="pt-2 text-muted-foreground" colSpan={2}>
                          权重合计
                        </td>
                        <td className="pt-2 text-right font-semibold text-foreground">
                          {totalWeight}
                        </td>
                        <td />
                      </tr>
                    </tfoot>
                  </table>
                ) : (
                  <p className="mt-2 text-sm text-muted-foreground">
                    该赛道暂未设置评分维度。
                  </p>
                )}
              </Card>
            );
          })}
        </div>
      </section>

      {/* 加分硬通货（按赛事 BonusRule 动态展示，可在后台配置） */}
      {competition.bonusRules.length > 0 && (
        <Card className="mt-10 p-6">
          <h2 className="text-lg font-semibold text-foreground">
            加分硬通货 · 我们只认跑得起来的东西
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            以下加分项可叠加，直接计入综合得分——公开透明，多劳多得。
          </p>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            {competition.bonusRules.map((b) => (
              <div
                key={b.id}
                className="rounded-xl border border-border/70 bg-muted/40 p-4"
              >
                <div className="flex items-center justify-between">
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-primary-soft text-primary">
                    <Sparkles size={18} />
                  </span>
                  <span className="text-sm font-semibold text-primary">
                    +{b.points}
                  </span>
                </div>
                <p className="mt-3 font-medium text-foreground">{b.label}</p>
                {b.description && (
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">
                    {b.description}
                  </p>
                )}
              </div>
            ))}
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            纯 PPT / 概念 / H5 套壳且无可运行产品界面的作品，将被 AI 提问与评委交叉核验识别并扣分。
          </p>
        </Card>
      )}

      {/* CTA */}
      <div className="mt-10 flex flex-wrap gap-3">
        <Link
          href="/register"
          className="rounded-full bg-primary px-6 py-2.5 font-medium text-primary-foreground transition-opacity hover:opacity-90"
        >
          报名参赛
        </Link>
        <Link
          href="/showcase"
          className="rounded-full border border-border px-6 py-2.5 font-medium text-foreground transition-colors hover:border-primary hover:text-primary"
        >
          浏览作品展示墙
        </Link>
      </div>
    </article>
  );
}
