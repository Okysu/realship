import { Badge } from "@/components/ui/badge";
import { formatDateTime } from "@/lib/utils";
import { FeedbackReplyForm } from "@/components/forms/FeedbackReplyForm";
import { toggleFeedbackResolved } from "@/server/actions/feedback";

export type FeedbackThreadData = {
  id: string;
  subject: string;
  resolved: boolean;
  messages: {
    id: string;
    body: string;
    createdAt: Date | string;
    authorId: string;
  }[];
};

// 工单会话视图（选手端 / 评委端共用）。
// viewerId 用于区分「我」与「对方」；对方按 counterpartLabel 显示（评委匿名时传「评委 A」）。
export function FeedbackThreadView({
  thread,
  viewerId,
  counterpartLabel,
}: {
  thread: FeedbackThreadData;
  viewerId: string;
  counterpartLabel: string;
}) {
  return (
    <div className="rounded-xl border border-border p-4">
      <div className="flex items-center justify-between gap-2">
        <span className="font-medium text-foreground">{thread.subject}</span>
        <div className="flex items-center gap-2">
          <Badge tone={thread.resolved ? "default" : "warning"}>
            {thread.resolved ? "已解决" : "处理中"}
          </Badge>
          <form action={toggleFeedbackResolved}>
            <input type="hidden" name="threadId" value={thread.id} />
            <button className="text-xs text-muted-foreground hover:text-foreground">
              {thread.resolved ? "重新打开" : "标记已解决"}
            </button>
          </form>
        </div>
      </div>

      <div className="mt-3 space-y-2">
        {thread.messages.map((m) => {
          const mine = m.authorId === viewerId;
          return (
            <div
              key={m.id}
              className={
                mine
                  ? "ml-8 rounded-lg bg-primary-soft px-3 py-2"
                  : "mr-8 rounded-lg bg-muted px-3 py-2"
              }
            >
              <div className="text-xs text-muted-foreground">
                {mine ? "我" : counterpartLabel} · {formatDateTime(m.createdAt)}
              </div>
              <p className="mt-0.5 whitespace-pre-wrap text-sm text-foreground">
                {m.body}
              </p>
            </div>
          );
        })}
      </div>

      {!thread.resolved && <FeedbackReplyForm threadId={thread.id} />}
    </div>
  );
}
