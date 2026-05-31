import { Badge } from "./badge";
import { submissionStatusLabels, stageStatusLabels } from "@/lib/labels";
import type { SubmissionStatus, StageStatus } from "@prisma/client";

const subTone: Record<SubmissionStatus, "default" | "primary" | "warning"> = {
  DRAFT: "default",
  SUBMITTED: "primary",
  UNDER_REVIEW: "warning",
  SCORED: "primary",
  WITHDRAWN: "default",
};

export function SubmissionStatusBadge({ status }: { status: SubmissionStatus }) {
  return <Badge tone={subTone[status]}>{submissionStatusLabels[status]}</Badge>;
}

const stageTone: Record<StageStatus, "default" | "primary" | "warning"> = {
  UPCOMING: "default",
  OPEN: "primary",
  REVIEWING: "warning",
  CLOSED: "default",
};

export function StageStatusBadge({ status }: { status: StageStatus }) {
  return <Badge tone={stageTone[status]}>{stageStatusLabels[status]}</Badge>;
}
