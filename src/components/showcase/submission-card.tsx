import Link from "next/link";
import { Sparkles } from "lucide-react";
import { Card } from "@/components/ui/card";

export type ShowcaseItem = {
  id: string;
  title: string;
  authorName: string;
  trackName: string;
  preview: string;
  bonuses: { label: string }[];
};

export function SubmissionCard({ item }: { item: ShowcaseItem }) {
  return (
    <Link href={`/showcase/${item.id}`} className="mb-4 block break-inside-avoid">
      <Card className="p-5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_2px_4px_rgba(15,23,42,0.05),0_20px_48px_-20px_rgba(15,23,42,0.18)]">
        <h3 className="font-semibold text-foreground">{item.title}</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          {item.authorName} · {item.trackName}
        </p>
        {item.preview && (
          <p className="mt-2 line-clamp-3 text-sm leading-6 text-muted-foreground">
            {item.preview}
          </p>
        )}
        {item.bonuses.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-3 text-xs text-muted-foreground">
            {item.bonuses.map((b) => (
              <span key={b.label} className="inline-flex items-center gap-1">
                <Sparkles size={12} className="text-primary" /> {b.label}
              </span>
            ))}
          </div>
        )}
      </Card>
    </Link>
  );
}
