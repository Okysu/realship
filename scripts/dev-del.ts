// 开发用：按 id 删除作品（级联清理其评审/AI/审计数据）。
// 运行：npx tsx --env-file=.env scripts/dev-del.ts <submissionId>
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const id = process.argv[2];
  if (!id) {
    console.log("用法：dev-del.ts <submissionId>");
    return;
  }
  await prisma.submission.delete({ where: { id } });
  console.log("已删除作品", id);
}

main().then(() => prisma.$disconnect());
