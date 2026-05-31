import type { Stage, StageStatus } from "@prisma/client";

// 按真实日期推导阶段展示状态，使状态永远跟随当下（不依赖存储的 status 硬编码）。
export function deriveStageStatus(
  stage: Pick<Stage, "startAt" | "endAt">,
  now: Date = new Date(),
): StageStatus {
  if (now < stage.startAt) return "UPCOMING";
  if (now > stage.endAt) return "CLOSED";
  return "OPEN";
}

// 阶段当前是否开放（在 [startAt, endAt] 时间窗内）。
export function isStageOpen(
  stage: Pick<Stage, "startAt" | "endAt">,
  now: Date = new Date(),
): boolean {
  return deriveStageStatus(stage, now) === "OPEN";
}
