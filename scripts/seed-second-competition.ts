// 临时脚本：插入第二个赛事用于验证「展示墙/排行榜赛事筛选」在多赛事时出现。
// 运行：npx tsx --env-file=.env scripts/seed-second-competition.ts
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const daysAgo = (n: number) => new Date(Date.now() - n * 86400000);
const daysFromNow = (n: number) => new Date(Date.now() + n * 86400000);

const CRITERIA = [
  { key: "design", name: "设计与体验", weight: 40, maxScore: 10, favorsRunnable: false, description: "视觉与交互体验。" },
  { key: "runnability", name: "可运行 / 真落地", weight: 35, maxScore: 10, favorsRunnable: true, description: "是否有可运行产品。" },
  { key: "creativity", name: "创意", weight: 25, maxScore: 10, favorsRunnable: false, description: "创意新颖度。" },
];

async function main() {
  // 幂等：先清掉同 slug 的旧赛事
  await prisma.competition.deleteMany({ where: { slug: "real-design-2026" } });

  const players = await prisma.user.findMany({
    where: { role: "PARTICIPANT" },
    orderBy: { createdAt: "asc" },
  });
  const judges = await prisma.user.findMany({ where: { role: "JUDGE" }, orderBy: { createdAt: "asc" } });
  if (players.length < 2 || judges.length < 1) throw new Error("缺少 player/judge，请先 db:seed");

  const comp = await prisma.competition.create({
    data: {
      slug: "real-design-2026",
      title: "Real 设计马拉松 2026",
      subtitle: "另一个赛事——用于验证赛事维度筛选",
      description: "## 赛事说明\n这是第二个赛事，评分维度与权重和主赛事不同。",
      manifesto: "好设计，被看见。",
      startAt: daysAgo(5),
      endAt: daysFromNow(40),
      isPublished: true,
      fields: {
        create: [
          { key: "summary", label: "作品简介", type: "TEXTAREA", rows: 3, required: true, sortOrder: 0 },
          { key: "concept", label: "设计理念", type: "TEXTAREA", rows: 3, required: true, sortOrder: 1 },
        ],
      },
      bonusRules: {
        create: [
          { key: "live_demo", label: "在线 Demo", points: 3, requiresUrl: true, description: "可在线访问的 Demo。", sortOrder: 0 },
        ],
      },
      stages: {
        create: [
          { type: "REGISTRATION", name: "报名", status: "OPEN", startAt: daysAgo(5), endAt: daysFromNow(15), sortOrder: 0 },
          { type: "PRELIMINARY", name: "初赛", status: "REVIEWING", startAt: daysAgo(2), endAt: daysFromNow(15), sortOrder: 1 },
        ],
      },
    },
    include: { stages: true },
  });

  const track = await prisma.track.create({
    data: {
      competitionId: comp.id,
      name: "界面设计",
      description: "UI/UX 设计作品",
      sortOrder: 0,
      criteria: { create: CRITERIA.map((c, i) => ({ ...c, sortOrder: i })) },
    },
    include: { criteria: true },
  });

  const reviewStage = comp.stages.find((s) => s.type === "PRELIMINARY")!;
  const liveDemoRule = await prisma.bonusRule.findFirst({ where: { competitionId: comp.id, key: "live_demo" } });

  const subDefs = [
    {
      title: "极简天气卡片",
      authorIdx: 0,
      content: { summary: "一套极简天气服务卡片设计。", concept: "去除一切冗余，只留温度与趋势。" },
      scores: [9, 7, 8],
      bonus: true,
    },
    {
      title: "拟物计算器（概念稿）",
      authorIdx: 1,
      content: { summary: "拟物风格计算器的视觉概念。", concept: "复刻实体按键的触感。" },
      scores: [6, 3, 7],
      bonus: false,
    },
  ];

  for (const d of subDefs) {
    const sub = await prisma.submission.create({
      data: {
        title: d.title,
        content: d.content,
        authorId: players[d.authorIdx].id,
        trackId: track.id,
        stageId: reviewStage.id,
        status: "UNDER_REVIEW",
        submittedAt: daysAgo(1),
      },
    });
    if (d.bonus && liveDemoRule) {
      await prisma.submissionBonus.create({
        data: { submissionId: sub.id, bonusRuleId: liveDemoRule.id, evidenceUrl: "https://example.com/demo" },
      });
    }
    // 一位评委按维度打分
    await prisma.judgeAssignment.create({ data: { judgeId: judges[0].id, submissionId: sub.id } });
    for (let i = 0; i < track.criteria.length; i++) {
      await prisma.judgeScore.create({
        data: {
          judgeId: judges[0].id,
          submissionId: sub.id,
          criterionId: track.criteria[i].id,
          score: d.scores[i],
          rationale: "演示评分。",
        },
      });
    }
  }

  console.log("第二个赛事已创建：" + comp.title + " (" + comp.slug + ")");
  console.log("作品数：" + subDefs.length);
}

main().then(() => prisma.$disconnect()).catch((e) => { console.error(e); return prisma.$disconnect().finally(() => process.exit(1)); });
