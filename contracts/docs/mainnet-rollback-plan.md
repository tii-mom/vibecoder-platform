# Mainnet Rollback Plan

> Status: draft. Mainnet has not been deployed.

## Rollback Principles

- Immutable contract deployments cannot be deleted; rollback means pausing, replacing routing/config, or deploying corrected contracts.
- Never hide failed or superseded addresses.
- Do not reuse testnet addresses as mainnet addresses.
- Do not execute production D1 rollback SQL without separate approval.

## Contract-Level Actions

- If a deployment transaction fails before activation, stop the run and keep previous production configuration.
- If a non-critical contract deploys with wrong config, mark it superseded and deploy a corrected replacement after review.
- If VC_JETTON distribution is wrong, stop all downstream deploys and produce an incident report before any further mint/admin action.
- If VC_JETTON mint disable or admin transfer/revoke is wrong, stop and escalate before any public launch.
- If SimpleLaunch mainnet deployment is wrong, do not register it in production D1 and do not expose it through Worker/frontend config.

## App/Data Actions

- Keep Worker/frontend pointing at previous reviewed contract manifests until all mainnet verification passes.
- Production D1 migrations must have reviewed reverse plans or compensating migrations.
- Any public announcement waits for final verification.

## Required Incident Record

- Failed step.
- Network and address.
- Expected config.
- Actual config.
- Tx hash or `not captured by script`.
- User-visible impact.
- Replacement or mitigation plan.
