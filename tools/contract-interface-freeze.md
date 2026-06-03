# Contract Interface Freeze

Last updated: 2026-06-02

This freezes the pre-mainnet contract boundary used by Acton tests, testnet deployment scripts, and get-method verification.

## Active Platform Deployment

| Contract | Artifact | Status |
| --- | --- | --- |
| `VcJetton` | `vc_jetton` | Keep |
| `Fund` | `fund` | Keep, extended |
| `VCRewardPool` | `vc_reward_pool` | New |
| `EarlyFundraising` | `early_fundraising` | New |
| `LaunchFee` | `launch_fee` | Keep, changed responsibility |
| `TokenLauncher` | `token_launcher` | Keep, changed responsibility |

Removed legacy contracts: `EarlySubscription`, `Strategic`.

## Address Derivation

Platform contracts compute their own VC Jetton wallet at runtime:

```text
selfVcWallet = hash(StateInit(ProjectTokenWallet, {
  balance: 0,
  owner: getMyAddress(),
  master: vcMaster,
  walletCode
}))
```

The historical `myVcWalletAddress` data field remains in wrappers for data-cell compatibility, but active contracts override it after `loadData()`.

## Get Methods

| Contract | Get methods |
| --- | --- |
| `VcJetton` | Standard: `get_jetton_data`, `get_wallet_address(owner)`; compatibility: `getJettonData`, `getWalletAddress(owner)` |
| `Fund` | `getFundData`, `isProjectWhitelisted(project)`, `getProjectTokenBalance(tokenMaster)`, `getUserDeposit(user)`, `getFundStats`, `getProjectReward(project)`, `getFundUnlockState` |
| `VCRewardPool` | `getRewardPoolData`, `getProjectRewardState(project)` |
| `DeveloperRewardPool` | `getDeveloperPoolData`, `getProjectDeveloperReward(project)`, `hasDeveloperClaimed(project)` |
| `EarlyFundraising` | `getFundraisingData`, `getUserAllocation(user)` |
| `SaleVesting` | `getSaleVestingData`, `getUserSaleAllocation(user)`, `getSaleTier(tier)`, `getSaleUnlockState` |
| `TeamVesting` | `getTeamVestingData`, `getTeamVestingRound(r)`, `getTeamClaimable` |
| `LaunchFee` | `getLaunchFeeData`, `getProjectStake(project)`, `getCreatorProjectCount(creator)` |
| `TokenLauncher` | `getLauncherData` |
| `ProjectToken` | `get_jetton_data`, `getJettonData`, `get_wallet_address(owner)`, `getWalletAddress(owner)` |
| `ProjectTokenWallet` | `get_wallet_data`, `getWalletData` |
| `LaunchCampaign` | `getCampaignData`, `getInvestorRecord(investor)`, `getProposal(id)` |

## Inbound Ops

### Fund

| Op | Body |
| --- | --- |
| `1` | `destination:address amount:coins` |
| `2` | `project:address` add allowlist |
| `3` | `project:address` remove allowlist |
| `4` | `amount:coins destination:address` withdraw TON |
| `5` | `tokenMaster:address amount:coins destination:address` withdraw project token |
| `6` | Admin register success: `project:address creator:address`; user withdraw VC: `amount:coins` |
| `7` | `price:coins` feed price |
| `8` | `project:address` claim project reward |
| `0x7362d09c` | Standard Jetton `transfer_notification`; payload ref contains `tokenMaster:address` |

### VCRewardPool

| Op | Body |
| --- | --- |
| `1` | `project creator participants:uint32 success:uint8` |
| `2` | `project user tonAmount:coins` |
| `3` | `project` claim developer reward |
| `4` | `project` claim user reward |
| `5` | `amount destination` withdraw TON |
| `6` | `amount destination` withdraw VC |

### DeveloperRewardPool

| Op | Body | Access |
| --- | --- | --- |
| `1` | `project:address creator:address participants:uint32` register successful project | admin only |
| `2` | `project:address` claim 5,000 VC developer reward | creator only |
| `3` | `amount:coins destination:address` emergency VC withdrawal | admin only |

### EarlyFundraising

| Op | Body |
| --- | --- |
| `1` | Subscribe with TON value |
| `2` | `price:coins` feed price |
| `3` | Claim unlocked VC |
| `4` | `amount destination` withdraw TON |
| `5` | `amount destination` withdraw VC |

### LaunchFee

| Op | Body |
| --- | --- |
| `0x7362d09c` | Standard Jetton notification; payload inner op `1` stake or `2` deployment fee, followed by `project:address` |
| `3` | `project:address` refund stake |
| `4` | `deploymentFee antiSpamStake fundAddress` set params |
| `5` | `amount destination` emergency TON withdrawal |
| `6` | `amount destination` emergency VC withdrawal |

### SaleVesting

| Op | Body |
| --- | --- |
| `1` | `tier:uint8` buy with TON value |
| `2` | `price:coins` feed price |
| `3` | Claim unlocked VC |
| `4` | `amount destination` withdraw TON |
| `5` | `amount destination` withdraw VC |
| `6` | Close sale |

### TeamVesting

| Op | Body | Access |
| --- | --- | --- |
| `1` | `price:coins` feed current price | admin only |
| `2` | (no body) claim unlocked VC | beneficiary only |
| `3` | `amount:coins destination:address` emergency TON withdrawal | admin only |
| `4` | `amount:coins destination:address` emergency VC withdrawal | admin only |

### LaunchCampaign

| Op | Body |
| --- | --- |
| `0x111` | Spark with TON value |
| `0x222` | Refund |
| `0x333` | `amount purpose:slice` submit withdrawal proposal |
| `0x444` | `proposalId:uint32 approve:bool` |
| `0x555` | Direct exit |
| `0x666` | `proposalId:uint32` settle |
| `10` | `platformFeeRate:uint16` |
| `0x7362d09c` | Project-token wallet notification; forward payload op `0x555` exits |

### ProjectToken

| Op | Body | Access |
| --- | --- | --- |
| `21` | `to:address amount:coins response:address forwardAmount:coins payload:slice` mint | admin only; requires `totalSupply + amount <= maxSupply` and `mintDisabled == false` |
| `0x7bdd97de` | `amount:coins from:address response:address` burn | wallet only |
| `3` | `newAdmin:address` change admin | admin only |
| `4` | `content:ref` update metadata | admin only |
| `5` | (no body) disable mint | admin only |

### ProjectTokenWallet

| Op | Body | Access |
| --- | --- | --- |
| `0x0f8a7ea5` | `amount:coins destination:address response:address forwardAmount:coins payload:slice` transfer | owner only |
| `0x178d4519` | `amount:coins from:address response:address forwardAmount:coins payload:slice` internal transfer | wallet or master |
| `0x595f07bc` | `amount:coins response:address` burn | owner only |

## Verification Commands

```bash
cd contracts
npm run build:all
npm test -- --runInBand
npm run typecheck
npm run deploy:testnet:plan
npm run verify:get-methods
```
