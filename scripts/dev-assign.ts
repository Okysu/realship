// 开发验证用：把所有评委分配给所有进入评审池的作品（等价于 admin 一键均衡分配）。
// 运行：npx tsx --env-file=.env scripts/dev-assign.ts
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const judges = await prisma.user.findMany({ where: { role: "JUDGE" } });
  const subs = await prisma.submission.findMany({
    where: { status: { in: ["SUBMITTED", "UNDER_REVIEW", "SCORED"] } },
  });
  let n = 0;
  for (const s of subs) {
    for (const j of judges) {
      await prisma.judgeAssignment.upsert({
        where: {
          judgeId_submissionId: { judgeId: j.id, submissionId: s.id },
        },
        create: { judgeId: j.id, submissionId: s.id },
        update: {},
      });
      n++;
    }
  }
  console.log(`分配完成：${judges.length} 评委 × ${subs.length} 作品 = ${n} 条`);
}

main().then(() => prisma.$disconnect());
