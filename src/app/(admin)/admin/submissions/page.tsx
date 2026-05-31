import Link from "next/link";
import { ArrowUpRight, Search } from "lucide-react";
import type { SubmissionStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/ui/pagination";
import { TabButton } from "@/components/ui/tab-button";
import { submissionStatusLabels } from "@/lib/labels";

const PER_PAGE = 20;

const statusTone: Record<SubmissionStatus, "default" | "primary" | "warning"> = {
  DRAFT: "default",
  SUBMITTED: "primary",
  UNDER_REVIEW: "warning",
  SCORED: "primary",
  WITHDRAWN: "default",
};

const STATUS_TABS = [
  { value: "", label: "全部" },
  { value: "SUBMITTED", label: "已提交" },
  { value: "UNDER_REVIEW", label: "评审中" },
  { value: "SCORED", label: "已出分" },
  { value: "DRAFT", label: "草稿" },
  { value: "WITHDRAWN", label: "已撤回" },
];

const VALID_STATUS = ["DRAFT", "SUBMITTED", "UNDER_REVIEW", "SCORED", "WITHDRAWN"];

export default async function AdminSubmissionsPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    status?: string;
    competition?: string;
    page?: string;
  }>;
}) {
  await requireRole("ADMIN");
  const { q, status, competition, page: pageParam } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);
  const validStatus =
    status && VALID_STATUS.includes(status)
      ? (status as SubmissionStatus)
      : undefined;

  // 赛事维度：作品按赛事归类，可筛选
  const competitions = await prisma.competition.findMany({
    where: { deletedAt: null },
    orderBy: { createdAt: "desc" },
    select: { id: true, title: true },
  });
  const selectedComp =
    competition && competitions.some((c) => c.id === competition)
      ? competition
      : undefined;

  const where: Prisma.SubmissionWhereInput = {
    deletedAt: null,
    ...(validStatus ? { status: validStatus } : {}),
    ...(selectedComp ? { track: { competitionId: selectedComp } } : {}),
    ...(q ? { title: { contains: q, mode: "insensitive" } } : {}),
  };
  const total = await prisma.submission.count({ where });
  const submissions = await prisma.submission.findMany({
    where,
    orderBy: { createdAt: "desc" },
    skip: (page - 1) * PER_PAGE,
    take: PER_PAGE,
    include: {
      track: {
        select: { name: true, competition: { select: { title: true } } },
      },
      author: { select: { name: true } },
      team: { select: { name: true } },
      _count: { select: { assignments: true } },
      judgeScores: { select: { judgeId: true } },
    },
  });
  const totalPages = Math.ceil(total / PER_PAGE);

  const tabHref = (s: string) => {
    const sp = new URLSearchParams();
    if (s) sp.set("status", s);
    if (q) sp.set("q", q);
    if (selectedComp) sp.set("competition", selectedComp);
    const str = sp.toString();
    return str ? `?${str}` : "/admin/submissions";
  };

  return (
    <div>
      <PageHeader
        title="作品管理"
        description="所有作品总览——按赛事 / 状态筛选，查看评审进度、撤销评委评分。"
      />

      {/* 状态筛选 Tab + 赛事筛选 + 搜索 */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1.5">
          {STATUS_TABS.map((t) => (
            <TabButton
              key={t.value}
              active={(validStatus ?? "") === t.value}
              href={tabHref(t.value)}
            >
              {t.label}
            </TabButton>
          ))}
        </div>
        <form action="/admin/submissions" className="flex gap-2">
          {validStatus && (
            <input type="hidden" name="status" value={validStatus} />
          )}
          {competitions.length > 1 && (
            <Select
              name="competition"
              defaultValue={selectedComp ?? ""}
              className="w-44"
            >
              <option value="">全部赛事</option>
              {competitions.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </Select>
          )}
          <div className="relative">
            <Search
              size={15}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              name="q"
              defaultValue={q}
              placeholder="搜索作品标题"
              className="w-56 pl-9"
            />
          </div>
          <Button type="submit" variant="secondary">
            搜索
          </Button>
        </form>
      </div>

      {submissions.length === 0 ? (
        <EmptyState>没有匹配的作品。</EmptyState>
      ) : (
        <>
          <Card className="overflow-hidden p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40 text-left text-muted-foreground">
                    <th className="px-4 py-3 font-medium">作品</th>
                    <th className="px-4 py-3 font-medium">赛事 / 赛道</th>
                    <th className="px-4 py-3 font-medium">作者 / 团队</th>
                    <th className="px-4 py-3 font-medium">状态</th>
                    <th className="px-4 py-3 text-center font-medium">
                      已评 / 分配
                    </th>
                    <th className="px-4 py-3 text-right font-medium">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {submissions.map((s) => {
                    const scored = new Set(
                      s.judgeScores.map((js) => js.judgeId),
                    ).size;
                    return (
                      <tr
                        key={s.id}
                        className="border-b border-border/60 transition-colors last:border-0 hover:bg-muted/30"
                      >
                        <td className="px-4 py-3 font-medium text-foreground">
                          {s.title}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                          {s.track.competition.title}
                          <span className="text-foreground/60"> · </span>
                          {s.track.name}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                          {s.team?.name ?? s.author.name ?? "—"}
                        </td>
                        <td className="px-4 py-3">
                          <Badge tone={statusTone[s.status]}>
                            {submissionStatusLabels[s.status]}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-center text-muted-foreground">
                          {scored} / {s._count.assignments}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Link
                            href={`/admin/submissions/${s.id}`}
                            className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                          >
                            评分管理 <ArrowUpRight size={14} />
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
          <Pagination
            page={page}
            totalPages={totalPages}
            total={total}
            params={{ q, status: validStatus, competition: selectedComp }}
          />
        </>
      )}
    </div>
  );
}
