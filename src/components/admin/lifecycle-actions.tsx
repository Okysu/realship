"use client";

import { useActionState } from "react";
import { CheckCircle2 } from "lucide-react";
import {
  promoteByRank,
  publishResults,
  unpublishResults,
  type LifecycleState,
} from "@/server/actions/lifecycle";
import { Button } from "@/components/ui/button";
import { ConfirmSubmit } from "@/components/ui/confirm-submit";

type Stage = { id: string; name: string; typeLabel: string };

// 「结果与晋级」交互区：晋级前 N + 公布/撤回结果，操作后显示成功反馈
//（此前 action 无返回，点了「没反应」，这里用 useActionState 把结果消息显式呈现）。
export function LifecycleActions({
  competitionId,
  resultsPublished,
  stages,
}: {
  competitionId: string;
  resultsPublished: boolean;
  stages: Stage[];
}) {
  const [promoteState, promoteAction, promoting] = useActionState<
    LifecycleState,
    FormData
  >(promoteByRank, undefined);
  const [publishState, publishAction, publishing] = useActionState<
    LifecycleState,
    FormData
  >(resultsPublished ? unpublishResults : publishResults, undefined);

  return (
    <div className="space-y-4">
      {/* 晋级：前 N 名进入某阶段 */}
      <div className="rounded-lg border border-border p-4">
        <p className="text-sm font-medium text-foreground">晋级前 N 名</p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          按当前综合得分，把前 N 名作品移入所选阶段（如「初赛前 20 进复赛」）。仅多阶段赛事需要。
        </p>
        <form
          action={promoteAction}
          className="mt-3 flex flex-wrap items-center gap-2"
        >
          <input type="hidden" name="competitionId" value={competitionId} />
          <input
            type="number"
            name="topN"
            defaultValue={10}
            min={1}
            className="h-9 w-20 rounded-lg border border-input bg-card px-2 text-center text-sm text-foreground"
            aria-label="前 N 名"
          />
          <span className="text-sm text-muted-foreground">名 →</span>
          <select
            name="stageId"
            className="h-9 rounded-lg border border-input bg-card px-2 text-sm text-foreground"
            aria-label="目标阶段"
          >
            {stages.map((s) => (
              <option key={s.id} value={s.id}>
                {s.typeLabel} · {s.name}
              </option>
            ))}
          </select>
          <Button variant="secondary" className="h-9" disabled={promoting}>
            {promoting ? "晋级中…" : "晋级"}
          </Button>
        </form>
        {promoteState?.message && (
          <p
            className={`mt-2 flex items-center gap-1.5 text-xs ${promoteState.ok ? "text-primary" : "text-danger"}`}
          >
            {promoteState.ok && <CheckCircle2 size={14} />}
            {promoteState.message}
          </p>
        )}
      </div>

      {/* 公布结果 */}
      <div className="rounded-lg border border-border p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-foreground">
              {resultsPublished ? "结果已公布" : "结果未公布"}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {resultsPublished
                ? "公众可在展示墙/排行榜看到分数、名次与评委评语。"
                : "评审期内分数对公众隐藏；公布后定格名次并揭晓。"}
            </p>
          </div>
          <form action={publishAction}>
            <input type="hidden" name="competitionId" value={competitionId} />
            {resultsPublished ? (
              <ConfirmSubmit
                variant="primary"
                title="撤回公布"
                message="确定撤回吗？分数与名次将重新对公众隐藏。"
                confirmText="确认撤回"
              >
                {publishing ? "处理中…" : "撤回公布"}
              </ConfirmSubmit>
            ) : (
              <ConfirmSubmit
                variant="primary"
                title="公布结果"
                message="确定公布吗？将定格当前名次，并向公众揭晓全部分数与评委评语。"
                confirmText="确认公布"
              >
                {publishing ? "处理中…" : "公布结果"}
              </ConfirmSubmit>
            )}
          </form>
        </div>
        {publishState?.message && (
          <p
            className={`mt-2 flex items-center gap-1.5 text-xs ${publishState.ok ? "text-primary" : "text-danger"}`}
          >
            {publishState.ok && <CheckCircle2 size={14} />}
            {publishState.message}
          </p>
        )}
      </div>
    </div>
  );
}
