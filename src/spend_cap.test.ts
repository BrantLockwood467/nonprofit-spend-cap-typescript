import test from "node:test";
import assert from "node:assert/strict";
import { decideMonth } from "./spend_cap.ts";

test("holds receipts, reminders, and reporting after the monthly ceiling", () => {
  const decision = decideMonth({
    receiptCount: 120,
    reminderCount: 45,
    reportCount: 3,
    monthSpendUsd: 25.01
  }, 25);

  assert.equal(decision.allowed, false);
  assert.equal(decision.remainingUsd, 0);
  assert.equal(decision.workload, 168);
});
