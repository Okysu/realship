import Link from "next/link";
import { Trophy, Medal, Sparkles } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { computeRanking } from "@/lib/scoring/ranking";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { TabButton } from "@/components/ui/tab-button";

const TOP_LIMIT = 100;

export default async function RankingPage({
  searchParams,
}: {
  searchParams: Promise<{ competition?: string }>;
}) {
  const { competition } = await searchParams;

  // 排行榜按赛事分——每个赛事独立排名（维度/权重不同，不可跨赛事混排）
  const comps = await prisma.competition.findMany({
    where: { isPublished: true },
    orderBy: { createdAt: "desc" },
    select: { id: true, title: true, resultsPublished: true },
  });

  if (comps.length === 0) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-12">
        <PageHeader title="排名榜" description="按加权总分排序。重产品，自有公论。" />
        <EmptyState>暂无已发布的赛事。</EmptyState>
      </div>
    );
  }

  const selected = comps.find((c) => c.id === competition) ?? comps[0];
  // 结果门禁：未公布结果的赛事不展示排名（防评审期泄分、名次漂移）
  const { items: ranked, total } = selected.resultsPublished
    ? await computeRanking(selected.id, TOP_LIMIT)
    : { items: [], total: 0 };

  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <PageHeader
        title="排名榜"
        description="按加权总分排序——上架 / 邀测 / 可运行仓库额外加分。重产品，自有公论。"
      />

      {/* 赛事选择（每个赛事独立排名） */}
      {comps.length > 1 && (
        <div className="mb-6 flex flex-wrap gap-2">
          {comps.map((c) => (
            <TabButton
              key={c.id}
              active={c.id === selected.id}
              href={`/ranking?competition=${c.id}`}
            >
              {c.title}
            </TabButton>
          ))}
        </div>
      )}

      {!selected.resultsPublished ? (
        <EmptyState>
          「{selected.title}」正在评审中，结果公布后才会揭晓排名——确保公正、不让未定的分数过早影响判断。
        </EmptyState>
      ) : ranked.length === 0 ? (
        <EmptyState>该赛事暂无可排名的作品。</EmptyState>
      ) : (
        <div className="space-y-3">
          {total > TOP_LIMIT && (
            <p className="text-sm text-muted-foreground">
              共 {total} 件作品，展示综合得分前 {TOP_LIMIT} 名。
            </p>
          )}
          {ranked.map((r, i) => (
            <Link key={r.id} href={`/showcase/${r.id}`} className="block">
              <Card className="flex items-center gap-4 p-4 transition-shadow hover:shadow-[0_2px_4px_rgba(15,23,42,0.05),0_20px_48px_-20px_rgba(15,23,42,0.18)]">
                <RankBadge rank={i + 1} />
                <div className="min-w-0 flex-1">
                  <h2 className="truncate font-semibold text-foreground">
                    {r.title}
                  </h2>
                  <p className="mt-0.5 truncate text-sm text-muted-foreground">
                    {r.authorName} · {r.trackName} · {r.judgeCount} 位评委
                  </p>
                  <div className="mt-1.5 flex flex-wrap gap-3 text-xs text-muted-foreground">
                    {r.bonuses.map((b) => (
                      <span
                        key={b.label}
                        className="inline-flex items-center gap-1"
                      >
                        <Sparkles size={13} className="text-primary" /> {b.label}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <div className="text-2xl font-bold text-foreground">
                    {r.totalScore.toFixed(1)}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    加权 {r.weightedScore.toFixed(1)} + 加分 {r.bonus}
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function RankBadge({ rank }: { rank: number }) {
  const wrap = "flex h-10 w-10 shrink-0 items-center justify-center";
  if (rank === 1)
    return (
      <div className={wrap}>
        <Trophy className="text-yellow-500" size={26} />
      </div>
    );
  if (rank === 2)
    return (
      <div className={wrap}>
        <Medal className="text-slate-400" size={24} />
      </div>
    );
  if (rank === 3)
    return (
      <div className={wrap}>
        <Medal className="text-amber-600" size={24} />
      </div>
    );
  return (
    <div className={wrap}>
      <span className="text-lg font-bold text-muted-foreground">{rank}</span>
    </div>
  );
}
