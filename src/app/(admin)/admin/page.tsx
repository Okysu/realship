import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/ui/pagination";

const PER_PAGE = 15;

export default async function AdminHomePage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { page: pageParam } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);

  const total = await prisma.competition.count({ where: { deletedAt: null } });
  const competitions = await prisma.competition.findMany({
    where: { deletedAt: null },
    orderBy: { createdAt: "desc" },
    skip: (page - 1) * PER_PAGE,
    take: PER_PAGE,
    include: { _count: { select: { tracks: true, stages: true } } },
  });
  const totalPages = Math.ceil(total / PER_PAGE);

  return (
    <div>
      <PageHeader
        title="赛事管理"
        action={
          <Link href="/admin/competitions/new">
            <Button>新建赛事</Button>
          </Link>
        }
      />

      {competitions.length === 0 ? (
        <EmptyState>还没有赛事，点击「新建赛事」开始。</EmptyState>
      ) : (
        <>
          <Card className="overflow-hidden p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40 text-left text-muted-foreground">
                    <th className="px-4 py-3 font-medium">赛事</th>
                    <th className="px-4 py-3 font-medium">slug</th>
                    <th className="px-4 py-3 text-center font-medium">赛道</th>
                    <th className="px-4 py-3 text-center font-medium">阶段</th>
                    <th className="px-4 py-3 font-medium">状态</th>
                    <th className="px-4 py-3 text-right font-medium">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {competitions.map((c) => (
                    <tr
                      key={c.id}
                      className="border-b border-border/60 transition-colors last:border-0 hover:bg-muted/30"
                    >
                      <td className="px-4 py-3 font-medium text-foreground">
                        {c.title}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        <code>/{c.slug}</code>
                      </td>
                      <td className="px-4 py-3 text-center text-muted-foreground">
                        {c._count.tracks}
                      </td>
                      <td className="px-4 py-3 text-center text-muted-foreground">
                        {c._count.stages}
                      </td>
                      <td className="px-4 py-3">
                        <Badge tone={c.isPublished ? "primary" : "default"}>
                          {c.isPublished ? "已发布" : "草稿"}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          href={`/admin/competitions/${c.id}`}
                          className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                        >
                          管理 <ArrowUpRight size={14} />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
          <Pagination page={page} totalPages={totalPages} total={total} />
        </>
      )}
    </div>
  );
}
