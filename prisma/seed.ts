import { PrismaClient } from "@prisma/client";
import type {
  User,
  Criterion,
  Stage,
  ExternalLinkType,
  MaterialKind,
  FieldType,
} from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const DEMO_PASSWORD = "Password123!";

// 评分维度（赛道级）
const CRITERIA = [
  {
    key: "runnability",
    name: "可运行 / 真落地",
    weight: 30,
    maxScore: 10,
    favorsRunnable: true,
    description: "是否有可运行的产品；是否上架应用市场 / 提供邀测 / 可运行仓库。",
  },
  {
    key: "innovation",
    name: "创新性",
    weight: 20,
    maxScore: 10,
    favorsRunnable: false,
    description: "解决真实问题的思路是否新颖、是否有差异化价值。",
  },
  {
    key: "completeness",
    name: "完成度",
    weight: 20,
    maxScore: 10,
    favorsRunnable: false,
    description: "功能是否完整可用，体验是否打磨到位。",
  },
  {
    key: "tech_depth",
    name: "技术深度",
    weight: 15,
    maxScore: 10,
    favorsRunnable: false,
    description: "是否充分运用 HarmonyOS 原生能力，工程质量如何。",
  },
  {
    key: "ecosystem",
    name: "生态贡献",
    weight: 15,
    maxScore: 10,
    favorsRunnable: false,
    description: "是否沉淀出可复用、可贡献给鸿蒙生态的组件或能力。",
  },
];

// 提交表单字段（赛事级，动态可配置——不再硬编码在前端）
const FIELDS: {
  key: string;
  label: string;
  type: FieldType;
  rows: number;
  required: boolean;
  placeholder?: string;
}[] = [
  {
    key: "summary",
    label: "项目简介",
    type: "TEXTAREA",
    rows: 3,
    required: true,
    placeholder: "一句话讲清你的产品是什么、解决什么问题",
  },
  {
    key: "techPlan",
    label: "技术方案",
    type: "TEXTAREA",
    rows: 4,
    required: true,
    placeholder: "用到的 HarmonyOS 能力、架构与关键实现",
  },
  {
    key: "innovation",
    label: "创新点",
    type: "TEXTAREA",
    rows: 3,
    required: true,
    placeholder: "与同类产品的差异化价值",
  },
  {
    key: "ecosystem",
    label: "可作为鸿蒙生态贡献的组件 / 能力（可选）",
    type: "TEXTAREA",
    rows: 2,
    required: false,
  },
];

// 加分硬通货（赛事级，动态可配置——分值与项目都可在后台调整）
const BONUS_RULES = [
  {
    key: "app_market",
    label: "上架应用市场",
    points: 3,
    requiresUrl: true,
    description: "提供华为应用市场链接，证明已真实交付。",
  },
  {
    key: "beta_test",
    label: "提供邀测",
    points: 2,
    requiresUrl: true,
    description: "提供邀请测试链接，真实可体验、可上手。",
  },
  {
    key: "runnable_repo",
    label: "可运行仓库",
    points: 2,
    requiresUrl: true,
    description: "提供可运行的代码仓库（鼓励但不强制公开源码）。",
  },
];

const MANIFESTO = `我们办这个评选，是因为见过太多 PPT 赢过产品、概念赢过落地、被推荐的人挤掉认真做事的人。
这里只认跑得起来的东西：上架、邀测、可运行的仓库。每一次评审都全程留痕——谁看了你的作品、看了多久、打开了哪些材料，你都看得到。
让每一个真正能跑起来的产品，被认真看见。`;

const DESCRIPTION = `## 参赛对象
面向所有 HarmonyOS 开发者，个人或团队（队长 + 队员，每队不超过 5 人）均可参赛。

## 参赛形式
提交一个面向 HarmonyOS 的应用 / 服务 / 组件作品，包含：项目说明、技术方案、创新点，以及演示视频（推荐外链）、代码仓库链接（鼓励但不强制公开源码）。

## 评审方式
为节约评委时间、保证审阅质量，本赛采用「AI 提问 + 评委交叉核验」机制：AI 先阅读你的项目材料并生成核查问题，评委需查看你的演示视频 / 产品 / 仓库后逐题作答，再结合是否上架、是否提供邀测进行交叉评判。全程审阅留痕，参赛者可见。

## 加分规则（硬通货）
- 上架华为应用市场：额外加分
- 提供邀测链接：加分
- 提供可运行的代码仓库：加分
纯 PPT / 概念 / H5 套壳且无可运行产品的作品将被识别并扣分。

## 公平承诺
所有作品进入同一评审池，没有「直邀」、没有特权通道。评分维度与权重见下方，全程公开、可复核。`;

async function clearAll() {
  await prisma.materialView.deleteMany();
  await prisma.reviewSession.deleteMany();
  await prisma.judgeQuestionAnswer.deleteMany();
  await prisma.aiReviewQuestion.deleteMany();
  await prisma.aiReviewRun.deleteMany();
  await prisma.judgeReviewNote.deleteMany();
  await prisma.judgeScore.deleteMany();
  await prisma.judgeAssignment.deleteMany();
  await prisma.submissionBonus.deleteMany();
  await prisma.externalLink.deleteMany();
  await prisma.submissionAsset.deleteMany();
  await prisma.submission.deleteMany();
  await prisma.criterion.deleteMany();
  await prisma.submissionField.deleteMany();
  await prisma.bonusRule.deleteMany();
  await prisma.stage.deleteMany();
  await prisma.track.deleteMany();
  await prisma.competition.deleteMany();
  await prisma.teamMember.deleteMany();
  await prisma.team.deleteMany();
  await prisma.session.deleteMany();
  await prisma.account.deleteMany();
  await prisma.user.deleteMany();
}

const daysAgo = (n: number) => new Date(Date.now() - n * 86400000);
const daysFromNow = (n: number) => new Date(Date.now() + n * 86400000);

async function main() {
  console.log("清空旧数据…");
  await clearAll();

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

  console.log("创建用户…");
  await prisma.user.create({
    data: { email: "admin@real2026.dev", name: "管理员", role: "ADMIN", passwordHash },
  });
  const judges: User[] = [];
  for (let i = 1; i <= 3; i++) {
    judges.push(
      await prisma.user.create({
        data: {
          email: `judge${i}@real2026.dev`,
          name: `评委${i}`,
          role: "JUDGE",
          passwordHash,
          bio: `资深 HarmonyOS 开发者 / 评委${i}`,
        },
      }),
    );
  }
  const players: User[] = [];
  for (let i = 1; i <= 5; i++) {
    players.push(
      await prisma.user.create({
        data: {
          email: `player${i}@real2026.dev`,
          name: `选手${i}`,
          role: "PARTICIPANT",
          passwordHash,
        },
      }),
    );
  }

  console.log("创建赛事 / 表单字段 / 加分项 / 赛道 / 维度 / 阶段…");
  const competition = await prisma.competition.create({
    data: {
      slug: "real-2026",
      title: "Real 2026 鸿蒙创新赛",
      subtitle: "一个重产品、反 PPT、评审全程可追溯的公开评选",
      description: DESCRIPTION,
      manifesto: MANIFESTO,
      startAt: daysAgo(45),
      endAt: daysFromNow(50),
      isPublished: true,
    },
  });

  // 提交表单字段（赛事级，动态）
  for (const [i, f] of FIELDS.entries()) {
    await prisma.submissionField.create({
      data: { competitionId: competition.id, ...f, sortOrder: i },
    });
  }
  // 加分硬通货（赛事级，动态）；记下 key→id 供作品声明
  const bonusByKey = new Map<string, string>();
  for (const [i, b] of BONUS_RULES.entries()) {
    const br = await prisma.bonusRule.create({
      data: { competitionId: competition.id, ...b, sortOrder: i },
    });
    bonusByKey.set(b.key, br.id);
  }

  const trackDefs = [
    { name: "应用与服务", description: "面向终端用户的 HarmonyOS 应用或服务。" },
    { name: "系统与工具", description: "面向开发者 / 系统的工具、框架、组件。" },
    { name: "创意轻应用", description: "元服务、卡片等轻量创意作品。" },
  ];
  const tracks: { id: string; criteria: Criterion[] }[] = [];
  for (const [ti, def] of trackDefs.entries()) {
    const track = await prisma.track.create({
      data: {
        competitionId: competition.id,
        name: def.name,
        description: def.description,
        sortOrder: ti,
      },
    });
    const criteria: Criterion[] = [];
    for (const [ci, c] of CRITERIA.entries()) {
      criteria.push(
        await prisma.criterion.create({
          data: { trackId: track.id, ...c, sortOrder: ci },
        }),
      );
    }
    tracks.push({ id: track.id, criteria });
  }

  const stageDefs = [
    { type: "REGISTRATION", name: "报名", status: "OPEN", startAt: daysAgo(10), endAt: daysFromNow(20) },
    { type: "PRELIMINARY", name: "初赛", status: "REVIEWING", startAt: daysAgo(20), endAt: daysFromNow(20) },
    { type: "SEMIFINAL", name: "复赛", status: "UPCOMING", startAt: daysFromNow(20), endAt: daysFromNow(35) },
    { type: "FINAL", name: "决赛", status: "UPCOMING", startAt: daysFromNow(35), endAt: daysFromNow(50) },
  ] as const;
  let reviewStage: Stage | null = null;
  for (const [si, s] of stageDefs.entries()) {
    const stage = await prisma.stage.create({
      data: {
        competitionId: competition.id,
        type: s.type,
        name: s.name,
        status: s.status,
        startAt: s.startAt,
        endAt: s.endAt,
        sortOrder: si,
      },
    });
    if (s.type === "PRELIMINARY") reviewStage = stage;
  }
  if (!reviewStage) throw new Error("缺少初赛阶段");

  console.log("创建对照作品 A~E…");
  type LinkDef = { type: ExternalLinkType; url: string; label: string };
  type BonusDef = { key: string; evidenceUrl: string };
  type SubDef = {
    title: string;
    content: Record<string, string>;
    trackIdx: number;
    authorIdx: number;
    teamName?: string;
    links: LinkDef[];
    bonuses: BonusDef[];
  };
  const subDefs: SubDef[] = [
    {
      title: "鸿蒙智能家居中控 Pro",
      content: {
        summary: "已上架的全屋智能中控应用，支持分布式流转与服务卡片快控。",
        techPlan: "ArkTS + 分布式软总线，跨设备状态同步；服务卡片快控。",
        innovation: "首创跨设备一拖即控，端侧场景引擎自动联动。",
        ecosystem: "沉淀出可复用的分布式设备控制组件，已开源。",
      },
      trackIdx: 0,
      authorIdx: 0,
      links: [
        { type: "APP_MARKET", url: "https://appgallery.huawei.com/app/A0012026", label: "应用市场" },
        { type: "BETA_TEST", url: "https://example.com/beta/smarthome", label: "邀测链接" },
        { type: "REPO", url: "https://gitee.com/demo/harmony-smarthome", label: "Gitee 仓库" },
        { type: "DEMO_VIDEO", url: "https://www.bilibili.com/video/demo-smarthome", label: "演示视频" },
      ],
      bonuses: [
        { key: "app_market", evidenceUrl: "https://appgallery.huawei.com/app/A0012026" },
        { key: "beta_test", evidenceUrl: "https://example.com/beta/smarthome" },
        { key: "runnable_repo", evidenceUrl: "https://gitee.com/demo/harmony-smarthome" },
      ],
    },
    {
      title: "ArkUI 图表组件库",
      content: {
        summary: "面向开发者的开源 ArkUI 图表组件库，可运行可集成。",
        techPlan: "纯 ArkTS 实现，Canvas 绘制，支持折线/柱状/饼图。",
        innovation: "鸿蒙生态首个声明式图表库，API 友好。",
        ecosystem: "完整开源，可直接被其他鸿蒙应用复用。",
      },
      trackIdx: 1,
      authorIdx: 1,
      links: [
        { type: "REPO", url: "https://gitee.com/demo/arkui-charts", label: "开源仓库" },
        { type: "DEMO_VIDEO", url: "https://www.bilibili.com/video/demo-charts", label: "演示视频" },
      ],
      bonuses: [
        { key: "runnable_repo", evidenceUrl: "https://gitee.com/demo/arkui-charts" },
      ],
    },
    {
      title: "AI 健康管家（概念）",
      content: {
        summary: "一款理念超前的 AI 健康管理应用，将彻底改变健康管理方式。",
        techPlan: "计划使用大模型 + 多模态，方案设计中。",
        innovation: "颠覆式的健康管理理念。",
      },
      trackIdx: 0,
      authorIdx: 2,
      links: [], // 纯 PPT，无任何可运行链接
      bonuses: [], // 无加分硬通货
    },
    {
      title: "潮流社区 H5",
      content: {
        summary: "一个潮流内容社区，体验流畅。",
        techPlan: "基于 Web 技术栈构建。",
        innovation: "丰富的社区玩法。",
      },
      trackIdx: 2,
      authorIdx: 3,
      links: [
        { type: "HOMEPAGE", url: "https://example.com/h5/trend-community", label: "H5 主页" },
      ],
      bonuses: [],
    },
    {
      title: "校园元服务卡片套件",
      content: {
        summary: "团队作品：一组校园场景元服务卡片（课表/成绩/一卡通）。",
        techPlan: "元服务 + 服务卡片，免安装直达。",
        innovation: "校园全场景卡片化，免安装。",
        ecosystem: "卡片模板可贡献给鸿蒙元服务生态。",
      },
      trackIdx: 2,
      authorIdx: 4,
      teamName: "校园鸿蒙队",
      links: [
        { type: "REPO", url: "https://gitee.com/demo/campus-cards", label: "仓库" },
        { type: "DEMO_VIDEO", url: "https://www.bilibili.com/video/demo-campus", label: "演示视频" },
      ],
      bonuses: [
        { key: "runnable_repo", evidenceUrl: "https://gitee.com/demo/campus-cards" },
      ],
    },
  ];

  const created: { id: string; trackIdx: number }[] = [];
  for (const d of subDefs) {
    let teamId: string | null = null;
    if (d.teamName) {
      const team = await prisma.team.create({
        data: {
          name: d.teamName,
          leaderId: players[d.authorIdx].id,
          members: { create: { userId: players[d.authorIdx].id, role: "LEADER" } },
        },
      });
      teamId = team.id;
    }

    const sub = await prisma.submission.create({
      data: {
        title: d.title,
        content: d.content,
        authorId: players[d.authorIdx].id,
        teamId,
        trackId: tracks[d.trackIdx].id,
        stageId: reviewStage.id,
        status: "UNDER_REVIEW",
        submittedAt: daysAgo(7),
        links: { create: d.links.map((l) => ({ ...l })) },
      },
    });
    // 作品对加分项的声明（含证据链接）
    for (const b of d.bonuses) {
      const ruleId = bonusByKey.get(b.key);
      if (ruleId) {
        await prisma.submissionBonus.create({
          data: { submissionId: sub.id, bonusRuleId: ruleId, evidenceUrl: b.evidenceUrl },
        });
      }
    }
    created.push({ id: sub.id, trackIdx: d.trackIdx });
  }

  console.log("评委分配（平等池：所有评委 × 所有作品）…");
  for (const sub of created) {
    for (const judge of judges) {
      await prisma.judgeAssignment.create({
        data: { judgeId: judge.id, submissionId: sub.id },
      });
    }
  }

  console.log("预置评分 / 审计留痕 / AI 审查 / 评委作答…");
  // 评分助手：对作品某赛道维度逐项打分
  async function score(
    subId: string,
    trackIdx: number,
    judge: User,
    scores: number[],
    rationale: string,
  ) {
    const criteria = tracks[trackIdx].criteria;
    for (let i = 0; i < criteria.length; i++) {
      await prisma.judgeScore.create({
        data: {
          judgeId: judge.id,
          submissionId: subId,
          criterionId: criteria[i].id,
          score: scores[i],
          rationale,
        },
      });
    }
  }
  // 审阅会话助手
  async function review(
    subId: string,
    judge: User,
    durationSec: number,
    kinds: string[],
  ) {
    const session = await prisma.reviewSession.create({
      data: {
        judgeId: judge.id,
        submissionId: subId,
        startedAt: daysAgo(2),
        lastHeartbeat: daysAgo(2),
        endedAt: daysAgo(2),
        durationSec,
        userAgent: "seed",
      },
    });
    for (const kind of kinds) {
      await prisma.materialView.create({
        data: {
          sessionId: session.id,
          submissionId: subId,
          kind: kind as MaterialKind,
        },
      });
    }
  }
  // AI 审查助手
  async function ai(
    subId: string,
    assessment: string,
    flags: string[],
    questions: { question: string; intent: string; requiresMaterial: string }[],
  ) {
    const run = await prisma.aiReviewRun.create({
      data: {
        submissionId: subId,
        model: "seed-preset",
        promptUsed: "(seed 预置)",
        rawResponse: "{}",
        overallAssessment: assessment,
        flags,
      },
    });
    await prisma.aiReviewQuestion.createMany({
      data: questions.map((q, i) => ({
        runId: run.id,
        submissionId: subId,
        order: i,
        question: q.question,
        intent: q.intent,
        requiresMaterial: q.requiresMaterial,
      })),
    });
  }
  // 评委作答助手：按问题顺序写入评委回答（展示墙可见，体现「是否真的看了」）
  async function answer(
    subId: string,
    judge: User,
    answers: { answer: string; cantConfirm?: boolean }[],
  ) {
    const qs = await prisma.aiReviewQuestion.findMany({
      where: { submissionId: subId },
      orderBy: { order: "asc" },
    });
    for (let i = 0; i < answers.length && i < qs.length; i++) {
      await prisma.judgeQuestionAnswer.create({
        data: {
          questionId: qs[i].id,
          judgeId: judge.id,
          submissionId: subId,
          answer: answers[i].answer,
          cantConfirm: answers[i].cantConfirm ?? false,
        },
      });
    }
  }

  const [subA, subB, subC, subD, subE] = created;

  // 作品 A：全加分，多评委高分，丰富审阅留痕，AI 无风险，评委逐题作答（真看过）
  await score(subA.id, subA.trackIdx, judges[0], [10, 9, 9, 8, 9], "已上架且可运行，分布式体验扎实。");
  await score(subA.id, subA.trackIdx, judges[1], [9, 8, 9, 8, 8], "邀测体验良好，组件已开源，落地度高。");
  await review(subA.id, judges[0], 1860, ["DETAIL_PAGE", "DEMO_VIDEO", "APP_MARKET", "REPO"]);
  await review(subA.id, judges[1], 1320, ["DETAIL_PAGE", "DEMO_VIDEO", "BETA_TEST"]);
  await review(subA.id, judges[2], 540, ["DETAIL_PAGE", "REPO"]);
  await ai(subA.id, "材料提供了上架、邀测与可运行仓库，可信度高，落地证据充分。", [], [
    { question: "分布式流转在多设备下的实际延迟如何？请展示真机演示。", intent: "验证分布式体验真实性。", requiresMaterial: "DEMO_VIDEO" },
    { question: "应用市场链接的包名是否与仓库一致？", intent: "交叉验证上架与源码一致。", requiresMaterial: "APP_MARKET" },
  ]);
  await answer(subA.id, judges[0], [
    { answer: "已看真机演示视频：三设备间流转延迟约 200ms，切换顺滑，确为真实分布式能力。" },
    { answer: "比对应用市场详情页包名与 Gitee 仓库 module.json5，包名一致，确认上架与源码同源。" },
  ]);

  // 作品 B：开源组件，一评委评分 + 审阅
  await score(subB.id, subB.trackIdx, judges[0], [7, 8, 7, 8, 9], "组件可运行、可复用，生态贡献突出，缺上架。");
  await review(subB.id, judges[0], 720, ["DETAIL_PAGE", "REPO", "DEMO_VIDEO"]);

  // 作品 C（纯 PPT）：AI 识别 concept_only，评委低分，作答时「无法确认」（答不上来 = 没东西看）
  await ai(subC.id, "材料仅有概念描述，无任何可运行证据（无视频 / 仓库 / 上架），存在严重 PPT 风险。", ["concept_only", "no_runnable_evidence"], [
    { question: "请提供任意可运行证据：真机视频、可运行仓库或上架链接。", intent: "验证是否存在可运行产品。", requiresMaterial: "DEMO_VIDEO" },
    { question: "「彻底改变健康管理」具体指哪些已实现的功能？请列出可演示的部分。", intent: "区分已实现与纯设想。", requiresMaterial: "其他" },
  ]);
  await score(subC.id, subC.trackIdx, judges[0], [2, 5, 3, 3, 3], "仅有概念，无可运行产品，落地度低。");
  await answer(subC.id, judges[0], [
    { answer: "材料中没有任何视频、仓库或上架链接，无法找到可运行证据。", cantConfirm: true },
    { answer: "全篇均为设想，未见任何已实现、可演示的功能。", cantConfirm: true },
  ]);

  // 作品 D（H5 套壳）：AI 识别 h5_shell
  await ai(subD.id, "仅提供一个 H5 主页链接，缺乏鸿蒙原生实现证据，疑似 H5 套壳。", ["h5_shell", "unverifiable_claims"], [
    { question: "该作品是否为 HarmonyOS 原生应用？请展示真机中调用原生能力（ArkUI / 系统 API）的证据。", intent: "区分原生应用与 H5 套壳。", requiresMaterial: "DEMO_VIDEO" },
  ]);
  await score(subD.id, subD.trackIdx, judges[0], [3, 6, 5, 2, 4], "疑似 H5 套壳，鸿蒙原生度存疑。");

  // 作品 E（团队）：一评委评分 + 审阅
  await score(subE.id, subE.trackIdx, judges[1], [7, 7, 8, 7, 9], "元服务卡片落地良好，团队协作完整。");
  await review(subE.id, judges[1], 600, ["DETAIL_PAGE", "REPO", "DEMO_VIDEO"]);

  console.log("种子数据完成。");
  console.log(`  管理员：admin@real2026.dev / ${DEMO_PASSWORD}`);
  console.log(`  评委：  judge1~3@real2026.dev / ${DEMO_PASSWORD}`);
  console.log(`  选手：  player1~5@real2026.dev / ${DEMO_PASSWORD}`);
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    return prisma.$disconnect().finally(() => process.exit(1));
  });
