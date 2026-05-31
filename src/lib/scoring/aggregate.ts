import { prisma } from "@/lib/prisma";

export type AggregateResult = {
  totalWeighted: number; // 加权总分（0 ~ maxWeighted）
  maxWeighted: number; // 满分（= 各维度权重之和）
  perCriterion: Array<{
    criterionId: string;
    name: string;
    weight: number;
    maxScore: number;
    favorsRunnable: boolean;
    avgScore: number;
    judgeCount: number;
  }>;
  bonusBadges: string[];
};

// 计算作品加权总分：各维度「评委平均分 / 满分 × 权重」之和。
export async function aggregateSubmissionScore(
  submissionId: string,
): Promise<AggregateResult> {
  const submission = await prisma.submission.findUniqueOrThrow({
    where: { id: submissionId },
    include: {
      track: { include: { criteria: { orderBy: { sortOrder: "asc" } } } },
      judgeScores: true,
      bonuses: { include: { bonusRule: true } },
    },
  });

  let totalWeighted = 0;
  let maxWeighted = 0;

  const perCriterion = submission.track.criteria.map((c) => {
    const scores = submission.judgeScores.filter(
      (s) => s.criterionId === c.id,
    );
    const avg = scores.length
      ? scores.reduce((sum, s) => sum + Number(s.score), 0) / scores.length
      : 0;
    const weight = Number(c.weight);
    totalWeighted += (avg / c.maxScore) * weight;
    maxWeighted += weight;
    return {
      criterionId: c.id,
      name: c.name,
      weight,
      maxScore: c.maxScore,
      favorsRunnable: c.favorsRunnable,
      avgScore: avg,
      judgeCount: scores.length,
    };
  });

  const bonusBadges = submission.bonuses.map((b) => b.bonusRule.label);

  return { totalWeighted, maxWeighted, perCriterion, bonusBadges };
}
