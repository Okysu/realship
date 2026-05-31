import { prisma } from "@/lib/prisma";

export type RankedSubmission = {
  id: string;
  title: string;
  authorName: string;
  trackName: string;
  weightedScore: number; // 维度加权分，归一化到 0~100
  bonus: number; // 加分硬通货合计
  totalScore: number; // weightedScore + bonus
  bonuses: { label: string; points: number }[]; // 已声明的加分项（动态）
  judgeCount: number;
};

export type RankingResult = {
  items: RankedSubmission[]; // 已排序、已限量的榜单
  total: number; // 该赛事入池作品总数（用于「展示前 N / 共 X」提示）
};

// 计算【单个赛事】内进入评审池作品的排名（按加权总分 + 加分硬通货降序）。
// 必须限定赛事——不同赛事的评分维度与权重不同，跨赛事混排没有意义。
// 加分来自作品声明的 SubmissionBonus（按赛事 BonusRule 的分值），不再硬编码。
// 加权分需内存计算后排序（无法用 DB 排序），故全量算分后 slice 出前 limit 名渲染，
// 避免赛事作品过多时一次性渲染上千行。
export async function computeRanking(
  competitionId: string,
  limit = 100,
): Promise<RankingResult> {
  const submissions = await prisma.submission.findMany({
    where: {
      status: { in: ["SUBMITTED", "UNDER_REVIEW", "SCORED"] },
      track: { competitionId },
    },
    include: {
      track: { include: { criteria: true } },
      author: { select: { name: true } },
      team: { select: { name: true } },
      judgeScores: true,
      bonuses: { include: { bonusRule: true } },
    },
  });

  const ranked = submissions.map((s) => {
    let totalWeighted = 0;
    let maxWeighted = 0;
    for (const c of s.track.criteria) {
      const scores = s.judgeScores.filter((js) => js.criterionId === c.id);
      const avg = scores.length
        ? scores.reduce((a, x) => a + Number(x.score), 0) / scores.length
        : 0;
      const w = Number(c.weight);
      totalWeighted += (avg / c.maxScore) * w;
      maxWeighted += w;
    }
    const weightedScore = maxWeighted ? (totalWeighted / maxWeighted) * 100 : 0;
    const bonuses = s.bonuses
      .map((b) => ({ label: b.bonusRule.label, points: b.bonusRule.points }))
      .sort((a, b) => b.points - a.points);
    const bonus = bonuses.reduce((sum, b) => sum + b.points, 0);
    const judgeCount = new Set(s.judgeScores.map((js) => js.judgeId)).size;
    return {
      id: s.id,
      title: s.title,
      authorName: s.team?.name ?? s.author.name ?? "匿名",
      trackName: s.track.name,
      weightedScore,
      bonus,
      totalScore: weightedScore + bonus,
      bonuses,
      judgeCount,
    };
  });

  ranked.sort((a, b) => b.totalScore - a.totalScore);
  return { items: ranked.slice(0, limit), total: ranked.length };
}
