import { setMonthlyCap, runNonprofitWorkload } from "./infrai_service.ts";
import { nonprofitRequest } from "./spend_cap.ts";

const request = nonprofitRequest.parse({
  receiptCount: 120,
  reminderCount: 45,
  reportCount: 3,
  monthSpendUsd: 8
});

const hardCapUsd = 25;
console.log(await setMonthlyCap(hardCapUsd));
console.log(await runNonprofitWorkload(request, hardCapUsd));
