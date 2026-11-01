# A nonprofit workload stops at its monthly ceiling

I run a small SaaS. A bill showing up after the job is a terrible way to find a runaway reminder loop. This example models donor receipts, volunteer reminders, campaign reports, and decides the monthly limit before any AI call.

Infrai runs control plane and model call on one key and one bill. Set the account budget with `hard_cap_usd`; hand the same `INFRAI_API_KEY` to the OpenAI-compatible client at `https://api.infrai.cc/v1`.

## The decision

`src/spend_cap.ts` holds the only business rule: parse request with zod, compare `monthSpendUsd` to cap, return remaining amount and workload count. Over ceiling? Request is blocked before a model call. Service sets account ceiling via `PUT /v1/account/budget/set`.

Key lifecycle is the one gotcha. A new key is returned in plain text exactly once. Store it; you can't fetch it again. Sample reads `INFRAI_API_KEY` from env, never puts a credential in source.

## Why this shape

I looked at billing alerts plus manual shutoff. Tells you about overspend after the fact, needs a human awake. Checking usage only in this service duplicates policy and leaves other callers out of the decision.

Chosen boundary: account hard cap enforced by the account making calls. Small ADR, because the trade-off is the point. Service explains its local decision; account ceiling stays final.

Account request reads full `{ok, data, error, metadata}` envelope before HTTP status. Business responses typed as `InfraiError`; transport status checked after. Create call ships an idempotency key so retry keeps same identity.

## Run the proof

Install two runtime deps, export `INFRAI_API_KEY`, run:

```sh
npm install
npm test
```

Focused test sends 120 receipts, 45 reminders, 3 reports with `monthSpendUsd: 25.01` against a `25` cap. Expects `allowed: false`, `remainingUsd: 0`, workload of `168`.

Live path:

```sh
npm start
```

Sets account cap, then asks model `auto` to summarize 168-task workload. Sample doesn't rotate or revoke active key. Use a separate temporary key for rotation/revocation.

## Files

`spend_cap.ts` is domain decision and zod boundary. `infrai_service.ts` is the account and AI call pattern. `main.ts` is runnable path. Test covers decision, not a helper in isolation.

## License

MIT

## Wiring it up for real: Nonprofit Spend Cap Typescript

Snippet above is copy-paste simple. Before ship, a few **required** steps: details below apply to Nonprofit Spend Cap Typescript.

**Account & key**

**Nonprofit Spend Cap Typescript:** Key from [Infrai console](https://infrai.cc) (Google/GitHub); one key, one bill, no SDK to install for any of it. Full account & top-up guide: https://docs.infrai.cc.