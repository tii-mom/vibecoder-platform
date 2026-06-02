# Platform Contract Deprecation and Test Migration Plan

## Contract Boundary Freeze

| Contract | Status | Notes |
| --- | --- | --- |
| `VcJetton` | Keep | Token issuance contract. No generic emergency withdrawal requirement. |
| `Fund` | Keep, extended | Keeps project allowlist, project-token custody, TON withdrawal, user VC withdrawal, and adds successful-project VC reward registration and price-gated unlocks. |
| `LaunchFee` | Keep, changed responsibility | Keeps launch fee and anti-spam stake custody. Emergency withdrawal remains required because it custodies assets. |
| `TokenLauncher` | Keep, changed responsibility | Remains the launch orchestration boundary. Should point at current platform contracts after migration. |
| `EarlySubscription` | Removed | Superseded by `EarlyFundraising`. Wrapper, compile entry, test, and source were removed after Acton coverage for active contracts was established. |
| `Strategic` | Removed | Superseded by the `Fund`/`VCRewardPool` split. Wrapper, compile entry, and source were removed. |
| `VCRewardPool` | New | Covers developer incentives and ecosystem user rewards, including project/user accounting, claim caps, and emergency withdrawals. |
| `EarlyFundraising` | New | Covers 100,000 TON raise, 100M VC allocation, 20% immediate release, 5 price-gated rounds, and admin TON withdrawal. |

## Test Migration Plan

1. Use `acton build` artifacts as the only contract code source for migrated TS/Sandbox tests. Done.
2. Add focused migrated tests for `VCRewardPool`, `EarlyFundraising`, and extended `Fund`. Done.
3. Remove legacy compatibility tests after active contract coverage exists. Done for `EarlySubscription`.
4. Active testnet deployment script excludes `EarlySubscription` and `Strategic`. Done in `scripts/deploy-platform-testnet.ts`.
5. Deprecated wrappers, compile entries, old deployment branches, and active docs references for `EarlySubscription` and `Strategic` have been removed.

## Current Migration Checkpoints

- `VCRewardPool`: project registration, developer reward claim, user reward claim cap, duplicate prevention, admin-only rescue.
- `EarlyFundraising`: subscription allocation, immediate 20% release, 24-hour price unlock, claim, admin TON/VC rescue.
- `Fund`: successful project reward registration, 20% initial claim, price-gated round claim, admin-only custody operations.
- `LaunchFee`: standard Jetton `transfer_notification`, fee forwarding, refund bounce rollback, dynamic fee parameters.
- `LaunchCampaign`: Acton artifact test coverage for threshold deployment, project token/wallet StateInit, governance voting, transfer-notification exit, and dynamic platform fee rate.

## Deployment Boundary

- Pre-mainnet active platform deployment: `VcJetton`, `Fund`, `VCRewardPool`, `EarlyFundraising`, `LaunchFee`, `TokenLauncher`.
- Per-project deployment remains `LaunchCampaign` + `ProjectToken` + `ProjectTokenWallet` + `Vesting`.
- `EarlySubscription` and `Strategic` are removed from Acton build, wrappers, scripts, and tests.
- Platform contracts compute their own VC Jetton wallet at runtime from `getMyAddress()`, `vcMaster`, and `vcWalletCode`; the initial `myVcWalletAddress` data field is retained only for data-cell compatibility.
