import { BackLink } from "@/components/ui/back-link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/rbac";
import { WhoViewedMe, type JudgeView } from "@/components/audit/WhoViewedMe";

export default async function ViewsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireAuth();

  const submission = await prisma.submission.findUnique({
    where: { id },
    select: { authorId: true, title: true },
  });
  if (!submission) notFound();
  if (submission.authorId !== user.id) redirect("/dashboard");

  // 按评委聚合审阅统计——用 groupBy 在 DB 层算「会话数 / 总时长 / 首次时间」，
  // 避免把全部 reviewSession 行拉进内存（审阅会话会随刷新累积，可能无界增长）。
  const stats = await prisma.reviewSession.groupBy({
    by: ["judgeId"],
    where: { submissionId: id },
    _count: { _all: true },
    _sum: { durationSec: true },
    _min: { startedAt: true },
  });

  // 材料：DB 层按 (会话, 种类) 去重，避免拉取「重复点击」累积的全部 materialView 行；
  // 带上会话归属评委，用于按评委归类「看过哪些材料」。
  const materialRows = await prisma.materialView.findMany({
    where: { submissionId: id },
    distinct: ["sessionId", "kind"],
    select: { kind: true, session: { select: { judgeId: true } } },
  });
  const materialsByJudge = new Map<string, Set<string>>();
  for (const m of materialRows) {
    const jid = m.session.judgeId;
    if (!materialsByJudge.has(jid)) materialsByJudge.set(jid, new Set());
    materialsByJudge.get(jid)!.add(m.kind);
  }

  // 按首次查看时间升序——先审阅的评委编号在前（评委 A/B/C），稳定且符合直觉
  const sorted = [...stats].sort(
    (a, b) =>
      (a._min.startedAt?.getTime() ?? 0) - (b._min.startedAt?.getTime() ?? 0),
  );

  const judges: JudgeView[] = sorted.map((s, i) => ({
    label: `评委 ${String.fromCharCode(65 + i)}`,
    sessionCount: s._count._all,
    totalSec: s._sum.durationSec ?? 0,
    firstAt: s._min.startedAt ?? new Date(0),
    materials: Array.from(materialsByJudge.get(s.judgeId) ?? []),
  }));

  return (
    <div className="max-w-3xl">
      <BackLink href={`/dashboard/submissions/${id}`}>返回作品</BackLink>
      <h1 className="mb-1 mt-2 text-2xl font-bold text-foreground">
        谁看过我的作品
      </h1>
      <p className="mb-6 text-sm text-muted-foreground">{submission.title}</p>
      <WhoViewedMe judges={judges} />
    </div>
  );
}
