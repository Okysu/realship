import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

type Tone = "default" | "primary" | "warning";

const tones: Record<Tone, string> = {
  default: "bg-muted text-muted-foreground",
  primary: "bg-primary-soft text-primary-soft-foreground",
  warning: "bg-warning-soft text-warning-soft-foreground",
};

export function Badge({
  tone = "default",
  className,
  ...props
}: ComponentProps<"span"> & { tone?: Tone }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium",
        tones[tone],
        className,
      )}
      {...props}
    />
  );
}
