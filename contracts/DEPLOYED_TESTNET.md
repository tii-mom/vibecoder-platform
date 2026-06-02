# VibeCoder Contracts — Testnet Freeze

Freeze timestamp (UTC): `2026-06-02T15:24:50Z`

This document freezes the contract set after migrating the Tolk source under
`contracts/contracts/**/*.tolk` to the current Acton/Tolk standard-library API
names:

- `getContractData()` → `contract.getData()`
- `setContractData(...)` → `contract.setData(...)`
- `getMyAddress()` → `contract.getAddress()`
- `sendMessage(...)` → `sendRawMessage(...)` for existing manually serialized raw message cells

## Build provenance

- Source tree: current Git branch at this freeze commit.
- Primary target toolchain: Acton/Tolk current standard APIs.
- Local verification note: `acton` is not installed in this container, and the
  public installer URL was blocked by the environment with HTTP 403. Code hashes
  below were generated from Blueprint artifacts using the legacy `@ton/tolk-js`
  compatibility hook in `wrappers/tolkCompatibility.ts`; the compatibility hook
  maps only the renamed stdlib API symbols back to their legacy equivalents for
  local Blueprint/Jest execution.

## Deployment status

No testnet deployment transaction was broadcast from this non-interactive
container because no deployer wallet mnemonic, wallet file, or TON Center API key
was available. Deployment addresses for contracts with constructor data are
state-init dependent and must be filled in after running `scripts/deploy.ts` or
an equivalent Acton deployment with the intended testnet wallet and config.

## Frozen contract artifacts

| Contract | Source | Code hash | Testnet deployment address | Deployment time (UTC) |
| --- | --- | --- | --- | --- |
| EarlySubscription | `contracts/platform/token-system/early-subscription/early_subscription.tolk` | `62e03da46b46da0d98476f8b23c2829c657dc5cef420738aadb0b27427ccaeb4` | Not broadcast in this environment | Not broadcast |
| Fund | `contracts/platform/token-system/fund/fund.tolk` | `f203ee33da1b825c88c972578c0db5889aecfb5ef5d1c88e2048346dd1804837` | Not broadcast in this environment | Not broadcast |
| LaunchCampaign | `contracts/launch/launch-campaign/launch_campaign.tolk` | `97f2286be59d3abc8bd1cdb523f30806161985cee77a945bf2878d41d75d7bfc` | Not broadcast in this environment | Not broadcast |
| LaunchFee | `contracts/platform/token-system/launch-fee/launch_fee.tolk` | `1bb7dc3097b1971873e8e99fbeab6a36fb8c9af90b0e484ca7b98ee0b5bad088` | Not broadcast in this environment | Not broadcast |
| ProjectToken | `contracts/launch/project-token/project_token.tolk` | `0d4b43636015a76839236c800f4b70c90981c85978c015cb2736a3a276f7f53d` | Not broadcast in this environment | Not broadcast |
| ProjectTokenWallet | `contracts/launch/project-token/project_token_wallet.tolk` | `beb6e4d73bf255bc3546391d63bf386b7e527b0a9ba271bbb74ad505f5e15d8e` | Not broadcast in this environment | Not broadcast |
| Strategic | `contracts/platform/token-system/strategic/strategic.tolk` | `88e40e0c9063b5fa4429eb91b18bc5304ba01aec180a84585c2244b7698dc31c` | Not broadcast in this environment | Not broadcast |
| TokenLauncher | `contracts/platform/infra/token-launcher/token_launcher.tolk` | `580b111400c356940ff02d94902dfb03c30f4345335e2eace94aa6b2f862b212` | Not broadcast in this environment | Not broadcast |
| VcJetton | `contracts/platform/token-system/vc-jetton/vc_jetton.tolk` | `79788a4639024a4d9c1658bbca0a6b89782be1c48b5808b1d72c107da1e8717f` | Not broadcast in this environment | Not broadcast |
| Vesting | `contracts/launch/vesting/vesting.tolk` | `e4176c49bbf86eff6b19353dab79c3c95d497132d0f685ed80821b7f35f5faba` | Not broadcast in this environment | Not broadcast |

## Post-deployment update procedure

After broadcasting to TON testnet, update only the `Testnet deployment address`
and `Deployment time (UTC)` columns above with the explorer-visible addresses and
transaction timestamps. Do not change the code hashes unless contract sources or
compiler settings change and a new freeze is intentionally created.
