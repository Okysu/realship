import { z } from "zod";

// AI 审查的结构化输出——强约束，AI 只能产出此结构（防止越权输出）。
export const aiReviewOutputSchema = z.object({
  overallAssessment: z.string(),
  flags: z.array(z.string()),
  questions: z
    .array(
      z.object({
        question: z.string().min(1),
        intent: z.string().optional().default(""),
        requiresMaterial: z.string().optional().default(""),
      }),
    )
    .min(1),
});

export type AiReviewOutput = z.infer<typeof aiReviewOutputSchema>;
