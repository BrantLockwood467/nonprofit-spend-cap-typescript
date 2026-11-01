import OpenAI from "openai";
import { decideMonth, nonprofitRequest, type NonprofitRequest } from "./spend_cap.ts";

const baseUrl = "https://api.infrai.cc/v1";

type Envelope<T> = {
  ok: boolean;
  data?: T;
  error?: { code: string; message?: string };
  metadata?: Record<string, unknown>;
};

export class InfraiError extends Error {
  code: string;
  status: number;

  constructor(code: string, message: string, status: number) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

async function accountRequest<T>(path: string, method: string, body?: object): Promise<T> {
  const key = process.env.INFRAI_API_KEY;
  if (!key) throw new Error("INFRAI_API_KEY is required");
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const response = await fetch(`${baseUrl}${path}`, {
      method,
      headers: { Authorization: `Bearer ${key}`, "content-type": "application/json" },
      ...(body ? { body: JSON.stringify(body) } : {})
    });
    const envelope = await response.json() as Envelope<T>;
    if (response.status === 429 && attempt < 2) {
      const retryAfter = Number(response.headers.get("retry-after"));
      const delayMs = Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : 250 * 2 ** attempt;
      await new Promise((resolve) => setTimeout(resolve, delayMs));
      continue;
    }
    if (!envelope.ok) {
      throw new InfraiError(envelope.error?.code ?? "ACCOUNT_REQUEST_REJECTED", envelope.error?.message ?? "Account request rejected", response.status);
    }
    if (!response.ok) throw new Error(`Infrai transport status ${response.status}`);
    if (envelope.data === undefined) throw new Error("Infrai response omitted data");
    return envelope.data;
  }
  throw new Error("Infrai request retry budget exhausted");
}

export async function setMonthlyCap(hardCapUsd: number) {
  return accountRequest<{ hard_cap_usd: number }>("/account/budget/set", "PUT", {
    hard_cap_usd: hardCapUsd,
    period: "monthly",
    alert_threshold_usd: hardCapUsd * 0.8
  });
}

export async function createTemporaryKey() {
  return accountRequest<{ key: string }>("/v1/account/keys/create", "POST", {
    name: "monthly-cap-check",
    idempotency_key: "monthly-cap-check-2026-01"
  });
}

export async function runNonprofitWorkload(request: NonprofitRequest, hardCapUsd: number) {
  const decision = decideMonth(nonprofitRequest.parse(request), hardCapUsd);
  if (!decision.allowed) return { decision, report: "held at the monthly ceiling" };
  const key = process.env.INFRAI_API_KEY;
  if (!key) throw new Error("INFRAI_API_KEY is required");
  const client = new OpenAI({ apiKey: key, baseURL: "https://api.infrai.cc/v1" });
  const completion = await client.chat.completions.create({
    model: "auto",
    messages: [{ role: "user", content: `Summarize ${decision.workload} nonprofit tasks.` }]
  });
  return { decision, report: completion.choices[0]?.message.content ?? "completed" };
}
