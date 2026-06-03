# VC_JETTON Mainnet Fixed Supply Strategy

> Status: strategy only. No mainnet deployment executed.

## Decision

Mainnet VC_JETTON must not retain unlimited mint authority in a personal wallet.

Recommended mainnet policy:

1. Deploy VC_JETTON mainnet with hard cap enabled.
2. Mint only the reviewed v3 distribution amounts from an approved manifest.
3. Disable mint after final distribution.
4. Transfer admin to a verified multisig/timelock admin, or revoke admin if no post-launch metadata/admin operation is required.
5. Record final `get_jetton_data` output in the mainnet readiness report before launch.

## Fixed Supply Plan

| Bucket | Amount |
| --- | ---: |
| VC v3 SaleVesting | 300,000,000 VC |
| VC v3 TeamVesting | 200,000,000 VC |
| DeveloperRewardPool | 100,000,000 VC |
| EcosystemRewardPool | 100,000,000 VC |
| DevelopmentFund | 100,000,000 VC |
| ReserveVault | 100,000,000 VC |
| Existing/legacy platform allocation reconciliation | 180,000,000 VC |
| Total planned mainnet supply | 980,000,000 VC |

Any change to this table requires a separate reviewed PR before mainnet deployment.

## Admin Strategy

Preferred v1:

1. Use a deployment admin only during reviewed distribution.
2. Disable mint immediately after final distribution.
3. Transfer admin to a multisig or timelock address that has been independently verified.

Allowed alternative:

- Revoke admin after final distribution if the launch team accepts that post-launch metadata and admin updates are impossible.

Rejected:

- Personal wallet retained as admin after public launch.
- Mint enabled after public launch.
- Admin address that is not independently verified in the runbook.

## Mainnet Verification Plan

Required checks before launch:

```bash
cd contracts
npm run build:all
npm run typecheck
npm test -- --runInBand
npm run verify:get-methods
```

Final mainnet-specific verification command must prove:

- `totalSupply == 980,000,000 VC`
- `mintDisabled == true`
- admin is the expected multisig/timelock, or admin is revoked
- all distribution recipient wallets match the reviewed manifest
- no testnet addresses appear in the mainnet manifest

## Rejected Mainnet States

- Personal wallet retained as unlimited mint admin.
- Testnet admin policy copied to mainnet.
- Mint scripts that default to execute mode.
- Mainnet mint without human-reviewed manifest, runbook, and rollback plan.

## Preconditions Before Mainnet

- All v3 platform contracts deployed and flow-tested on testnet.
- SimpleLaunch v1 deployed and flow-tested on testnet.
- D1 SQL plans reviewed but not applied to production by this task.
- Admin authority table reviewed.
- Multisig/timelock address verified independently.
- `EXPECT_VC_ADMIN_REVOKED` or expected multisig/timelock admin check added to final verification command.

## Explicit Non-Actions In This PR

- No mainnet deployment.
- No mainnet mint.
- No D1 SQL execution.
- No secrets or mnemonic changes.
- No Worker/frontend/vc production logic changes.
