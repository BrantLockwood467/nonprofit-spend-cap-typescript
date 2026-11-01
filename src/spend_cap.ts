import { z } from "zod";

export const nonprofitRequest = z.object({
  receiptCount: z.number().int().nonnegative(),
  reminderCount: z.number().int().nonnegative(),
  reportCount: z.number().int().nonnegative(),
  monthSpendUsd: z.number().nonnegative()
});

export type NonprofitRequest = z.infer<typeof nonprofitRequest>;

export function decideMonth(request: NonprofitRequest, hardCapUsd: number) {
  const parsed = nonprofitRequest.parse(request);
  const remainingUsd = Math.max(0, hardCapUsd - parsed.monthSpendUsd);
  return {
    allowed: parsed.monthSpendUsd <= hardCapUsd,
    remainingUsd,
    workload: parsed.receiptCount + parsed.reminderCount + parsed.reportCount
  };
}
