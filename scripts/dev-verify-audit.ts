// 开发验证用：打印某作品的审计留痕与打分数据。
// 运行：npx tsx --env-file=.env scripts/dev-verify-audit.ts <submissionId>
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const subId = process.argv[2] || "cmps1il2v0001g4cokm5z8rju";
  const sub = await prisma.submission.findUnique({
    where: { id: subId },
    select: { title: true, status: true },
  });
  console.log("=== 作品 ===");
  console.log(`${sub?.title}  状态=${sub?.status}`);

  const sessions = await prisma.reviewSession.findMany({
    where: { submissionId: subId },
    include: {
      judge: { select: { name: true } },
      materialViews: true,
    },
  });
  console.log("\n=== 审阅会话（ReviewSession）===");
  for (const s of sessions) {
    console.log(
      `${s.judge.name}：有效时长=${s.durationSec}s，材料查看=${s.materialViews.length} 条 [${s.materialViews
        .map((m) => m.kind)
        .join(", ")}]，结束=${s.endedAt ? "是" : "进行中"}`,
    );
  }

  const scores = await prisma.judgeScore.findMany({
    where: { submissionId: subId },
    include: {
      judge: { select: { name: true } },
      criterion: { select: { name: true } },
    },
  });
  console.log("\n=== 评委打分（JudgeScore）===");
  for (const sc of scores) {
    console.log(
      `${sc.judge.name} - ${sc.criterion.name}：${sc.score} 分 —— ${sc.rationale}`,
    );
  }
}

main().then(() => prisma.$disconnect());
