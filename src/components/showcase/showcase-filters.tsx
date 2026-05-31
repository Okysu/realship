"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";
import { TabButton } from "@/components/ui/tab-button";

type Track = { id: string; name: string };
type Competition = { id: string; title: string };

export function ShowcaseFilters({
  competitions,
  tracks,
}: {
  competitions: Competition[];
  tracks: Track[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const competition = searchParams.get("competition") ?? "all";
  const track = searchParams.get("track") ?? "all";
  const q = searchParams.get("q") ?? "";

  // 构建 URL，保留其它已选参数；值为 null 则移除该参数
  const href = (updates: Record<string, string | null>) => {
    const sp = new URLSearchParams(searchParams.toString());
    for (const [k, v] of Object.entries(updates)) {
      if (v === null) sp.delete(k);
      else sp.set(k, v);
    }
    const s = sp.toString();
    return s ? `/showcase?${s}` : "/showcase";
  };

  const onSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const value = new FormData(e.currentTarget).get("q");
    router.push(href({ q: value ? String(value) : null }));
  };

  return (
    <div className="mb-6 space-y-3">
      {/* 赛事维度（多赛事时显示；切赛事会清空赛道选择） */}
      {competitions.length > 1 && (
        <div className="flex flex-wrap gap-2">
          <TabButton
            active={competition === "all"}
            href={href({ competition: null, track: null })}
          >
            全部赛事
          </TabButton>
          {competitions.map((c) => (
            <TabButton
              key={c.id}
              active={competition === c.id}
              href={href({ competition: c.id, track: null })}
            >
              {c.title}
            </TabButton>
          ))}
        </div>
      )}

      {/* 赛道维度（按所选赛事范围） */}
      <div className="flex flex-wrap gap-2">
        <TabButton active={track === "all"} href={href({ track: null })}>
          全部赛道
        </TabButton>
        {tracks.map((t) => (
          <TabButton
            key={t.id}
            active={track === t.id}
            href={href({ track: t.id })}
          >
            {t.name}
          </TabButton>
        ))}
      </div>

      <form onSubmit={onSearch} className="relative max-w-md" role="search">
        <Search
          size={16}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
        />
        <input
          type="text"
          name="q"
          defaultValue={q}
          placeholder="搜索作品…"
          className="h-10 w-full rounded-lg border border-input bg-card pl-9 pr-3 text-sm text-foreground outline-none transition-colors focus:border-ring focus:ring-2 focus:ring-ring/20"
        />
      </form>
    </div>
  );
}
