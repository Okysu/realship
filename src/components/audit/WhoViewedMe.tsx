import { CheckCircle2 } from "lucide-react";
import { formatDateTime, formatDuration } from "@/lib/utils";
import { materialKindLabels } from "@/lib/labels";
import { Card } from "@/components/ui/card";

export type JudgeView = {
  label: string;
  sessionCount: number;
  totalSec: number;
  firstAt: Date | string;
  materials: string[];
};

const kindLabel = (k: string) =>
  (materialKindLabels as Record<string, string>)[k] ?? k;

export function WhoViewedMe({ judges }: { judges: JudgeView[] }) {
  if (judges.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
        还没有评委查看你的作品。一旦有人审阅，这里会如实显示——你不会再面对「零流量」的沉默。
      </div>
    );
  }

  const totalSec = judges.reduce((sum, j) => sum + j.totalSec, 0);

  return (
    <div>
      <p className="flex items-center gap-2 rounded-lg bg-primary-soft px-4 py-3 text-sm text-primary-soft-foreground">
        <CheckCircle2 size={16} className="shrink-0" />
        <span>
          {judges.length} 位评委审阅过你的作品 · 累计 {formatDuration(totalSec)}
          ——有据可查，被认真看过。
        </span>
      </p>
      <div className="mt-4 space-y-3">
        {judges.map((j) => (
          <Card key={j.label} className="p-4">
            <div className="flex items-center justify-between">
              <span className="font-medium text-foreground">{j.label}</span>
              <span className="text-sm text-muted-foreground">
                累计 {formatDuration(j.totalSec)}
              </span>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              首次查看 {formatDateTime(j.firstAt)} · {j.sessionCount} 次会话
            </p>
            {j.materials.length > 0 && (
              <p className="mt-2 text-sm text-muted-foreground">
                看过：
                {j.materials.map((m) => (
                  <span
                    key={m}
                    className="ml-1 inline-block rounded bg-muted px-2 py-0.5 text-xs text-muted-foreground"
                  >
                    {kindLabel(m)}
                  </span>
                ))}
              </p>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}
