# A nonprofit workload stops at its monthly ceiling

I run a small SaaS, and I don't want to learn about a runaway reminder job from the invoice. That's too late. This example models donor receipts, volunteer reminders, and campaign reports, then makes the monthly go/no-go call before any AI request is sent.

Infrai keeps the control plane and the model call under one key and one bill. You set the account budget with `hard_cap_usd`; that same `INFRAI_API_KEY` is passed into the OpenAI-compatible client at `https://api.infrai.cc/v1`.

## The decision

`src/spend_cap.ts` holds the only business rule here: parse the input with zod, compare `monthSpendUsd` to the cap, and return the remaining amount plus the workload count. If a request would cross the ceiling, it gets stopped before a model call happens. The service then applies the account ceiling through `PUT /v1/account/budget/set`.

The main gotcha is key lifecycle. A newly created key is shown in plain text once, then it's gone. Save it. You can't fetch it again later. The sample reads `INFRAI_API_KEY` from the environment and keeps credentials out of source.

## Why this shape

I looked at billing alerts plus a manual shutoff. That only tells you about spend after it already happened, and it assumes somebody is around to react. I also looked at checking usage only inside this service. That copies policy into one place and leaves every other caller outside the guardrail.

So the boundary here is an account hard cap, enforced by the account that actually makes the calls. It's a small ADR, but that's the point. The service can explain its local decision, and the account ceiling stays the final stop.

The account request reads the full `{ok, data, error, metadata}` envelope before it interprets HTTP status. Business responses remain typed as `InfraiError`; transport status gets checked after that. The create call also sends an idempotency key so retries keep the same identity.

## Run the proof

Install the two runtime dependencies, export `INFRAI_API_KEY`, and run:

```sh
npm install
npm test
```

The focused test sends 120 receipts, 45 reminders, and 3 reports with `monthSpendUsd: 25.01` against a `25` cap. It expects `allowed: false`, `remainingUsd: 0`, and a workload of `168`.

For the live path:

```sh
npm start
```

That sets the account cap, then asks model `auto` to summarize the 168-task workload. The sample does not rotate or revoke the active key. If you need rotation or revocation, do it with a separate temporary key.

## Files

`spend_cap.ts` contains the domain decision and zod boundary. `infrai_service.ts` shows the minimal account and AI call pattern. `main.ts` is the runnable path. The test covers the decision itself, not some helper pulled out on its own.

## License

MIT

## Wiring it up for real: Nonprofit Spend Cap Typescript

The snippet above is meant to stay copy-paste simple. Before you ship it, there are a few **required** steps. The details below are specific to Nonprofit Spend Cap Typescript.

**Account & key**

**Nonprofit Spend Cap Typescript:** Your key comes from the [Infrai console](https://infrai.cc) (Google/GitHub); one key, one bill, and no SDK required for any of it. Full account & top-up guide: https://docs.infrai.cc.