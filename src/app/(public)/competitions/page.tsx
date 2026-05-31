import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatDateTime } from "@/lib/utils";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/ui/pagination";

const PER_PAGE = 12;

export default async function CompetitionsListPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { page: pageParam } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);

  const total = await prisma.competition.count({
    where: { isPublished: true, deletedAt: null },
  });
  const competitions = await prisma.competition.findMany({
    where: { isPublished: true, deletedAt: null },
    orderBy: { startAt: "desc" },
    skip: (page - 1) * PER_PAGE,
    take: PER_PAGE,
    include: { _count: { select: { tracks: true } } },
  });
  const totalPages = Math.ceil(total / PER_PAGE);

  return (
    <div className="mx-auto max-w-4xl px-6 py-12">
      <PageHeader title="赛事" />
      {competitions.length === 0 ? (
        <EmptyState>暂无已发布的赛事。</EmptyState>
      ) : (
        <>
          <div className="space-y-4">
            {competitions.map((c) => (
              <Link
                key={c.id}
                href={`/competitions/${c.slug}`}
                className="block rounded-2xl border border-border bg-card p-6 shadow-sm transition-colors hover:border-primary"
              >
                <h2 className="text-lg font-semibold text-foreground">
                  {c.title}
                </h2>
                {c.subtitle && (
                  <p className="mt-1 text-muted-foreground">{c.subtitle}</p>
                )}
                <p className="mt-2 text-sm text-muted-foreground">
                  {c._count.tracks} 个赛道 · {formatDateTime(c.startAt)} 起
                </p>
              </Link>
            ))}
          </div>
          <Pagination page={page} totalPages={totalPages} total={total} />
        </>
      )}
    </div>
  );
}
