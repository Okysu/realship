import { Suspense } from "react";
import { prisma } from "@/lib/prisma";
import { parseSubmissionContent } from "@/lib/submission-content";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { ShowcaseFilters } from "@/components/showcase/showcase-filters";
import { SubmissionCard } from "@/components/showcase/submission-card";

export default async function ShowcasePage({
  searchParams,
}: {
  searchParams: Promise<{ competition?: string; track?: string; q?: string }>;
}) {
  const { competition, track, q } = await searchParams;

  // 赛事维度：作品展示墙按赛事筛选；切赛事时赛道范围随之收窄
  const competitions = await prisma.competition.findMany({
    where: { isPublished: true, deletedAt: null },
    orderBy: { createdAt: "desc" },
    select: { id: true, title: true },
  });
  const selectedComp =
    competition && competitions.some((c) => c.id === competition)
      ? competition
      : undefined;

  const tracks = await prisma.track.findMany({
    where: {
      competition: {
        isPublished: true,
        ...(selectedComp ? { id: selectedComp } : {}),
      },
    },
    orderBy: [{ competitionId: "asc" }, { sortOrder: "asc" }],
    select: { id: true, name: true },
  });

  const submissions = await prisma.submission.findMany({
    where: {
      deletedAt: null,
      status: { in: ["SUBMITTED", "UNDER_REVIEW", "SCORED"] },
      track: {
        competition: {
          isPublished: true,
          ...(selectedComp ? { id: selectedComp } : {}),
        },
      },
      ...(track && track !== "all" ? { trackId: track } : {}),
      ...(q ? { title: { contains: q, mode: "insensitive" } } : {}),
    },
    orderBy: { submittedAt: "desc" },
    include: {
      track: { select: { name: true } },
      author: { select: { name: true } },
      team: { select: { name: true } },
      bonuses: { include: { bonusRule: { select: { label: true } } } },
    },
  });

  const items = submissions.map((s) => {
    const content = parseSubmissionContent(s.content);
    const preview = Object.values(content).find((v) => v && v.trim()) ?? "";
    return {
      id: s.id,
      title: s.title,
      authorName: s.team?.name ?? s.author.name ?? "匿名",
      trackName: s.track.name,
      preview,
      bonuses: s.bonuses.map((b) => ({ label: b.bonusRule.label })),
    };
  });

  return (
    <div className="mx-auto max-w-5xl px-6 py-12">
      <PageHeader
        title="作品展示墙"
        description="每一个进入评审池的作品都在这里被看见——无论是否获奖。落榜不等于被无视。"
      />

      <Suspense fallback={<div className="mb-6 h-9" />}>
        <ShowcaseFilters competitions={competitions} tracks={tracks} />
      </Suspense>

      {items.length === 0 ? (
        <EmptyState>没有匹配的作品。</EmptyState>
      ) : (
        <div className="columns-1 gap-4 sm:columns-2 lg:columns-3">
          {items.map((item) => (
            <SubmissionCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}
