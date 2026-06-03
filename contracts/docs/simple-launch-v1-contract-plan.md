# SimpleLaunch v1 Contract Plan

> Status: frozen contract plan only. Not implemented, not deployed, and not a mainnet instruction.

## 1. Core Goals

- Project owners use the official template to issue project tokens.
- Each project token has fixed supply of 100,000,000 tokens.
- User launch participation sends TON into an official custody contract.
- After more than 5 users participate, the project can activate project token deployment.
- The token may be deployed early, but token distribution must be finalized only after launch finalization.
- Users claim their own project tokens.
- Failed launches let users self-serve refunds; users pay their own refund gas.
- Successful project owners withdraw raised TON from custody after platform fee deduction.
- The platform fund receives a fixed 15% project-token allocation.

## 2. Token Distribution Formula

```text
PROJECT_TOKEN_TOTAL_SUPPLY = 100,000,000
PLATFORM_TOKEN_SHARE = 15,000,000
BASE_TEAM_SHARE = 35,000,000
MAX_USER_SHARE = 50,000,000

achievementRatio = min(totalRaisedTon / targetRaiseTon, 1)

actualUserShare = MAX_USER_SHARE * achievementRatio
actualTeamShare = BASE_TEAM_SHARE + (MAX_USER_SHARE - actualUserShare)
platformShare = PLATFORM_TOKEN_SHARE

userClaim = actualUserShare * userContributionTon / totalRaisedTon
```

Example: target is USD 500,000 equivalent, actual raise is USD 50,000 equivalent.

- `achievementRatio = 10%`
- `actualUserShare = 5,000,000`, or 5% of supply
- `actualTeamShare = 80,000,000`, or 80% of supply
- `platformShare = 15,000,000`, or 15% of supply

Example: target is USD 500,000 equivalent, actual raise reaches or exceeds target.

- `achievementRatio = 100%`
- `actualUserShare = 50,000,000`, or 50% of supply
- `actualTeamShare = 35,000,000`, or 35% of supply
- `platformShare = 15,000,000`, or 15% of supply

## 3. Hard Cap

- `hardCapTon = targetRaiseTon`.
- v1 does not accept new participation after the hard cap.
- v1 rejects over-hardCap contributions instead of partially accepting them.
- Partial acceptance is intentionally excluded to keep accounting and refunds simple.

## 4. Activation Conditions

- `participantCount >= 5`.
- `minContributionTon` must be set to prevent five tiny-account activations.
- Optional `minTotalRaiseTon` may be added before activation.
- Duplicate participants must not increment `participantCount`.

## 5. State Machine

- `DRAFT`
- `FUNDING`
- `ACTIVATED`
- `FINALIZED`
- `FAILED`
- `CANCELLED`
- `REFUNDING`

Successful states allow token claim and disallow refund. Failed/refunding states allow refund and disallow token claim.

## 6. Contract Split

1. `SimpleLaunchCampaign`
2. `LaunchEscrow`
3. `ProjectToken` official template
4. `ProjectTokenWallet` official template

### SimpleLaunchCampaign Responsibilities

- Store `projectOwner`, `teamWallet`, and `platformFund`.
- Store metadata content cell.
- Store `targetRaiseTon`, `hardCapTon`, `minContributionTon`, and `minParticipants`.
- Store token code and wallet code.
- Store escrow address.
- Track `participantCount` and `totalRaisedTon`.
- Update participation records from escrow notifications.
- Allow token deployment activation when `participantCount >= 5`.
- Deploy `ProjectToken` on activation, but do not finalize token allocation at activation time.
- Finalize only after `endTime` or after hard cap is reached.
- Calculate `actualUserShare`, `actualTeamShare`, and `platformShare`.
- Mint `platformShare` to `platformFund`.
- Mint `actualTeamShare` to `teamWallet`.
- Mint `actualUserShare` to campaign self wallet.
- Disable mint after final allocation.
- Let users claim according to contribution ratio.
- Prevent duplicate token claims.
- Reject claims in failed states.
- Reject refunds in successful states.
- Expose complete get methods.

### LaunchEscrow Responsibilities

- Receive user TON.
- Track campaign/user contribution.
- Reject below-minimum contributions.
- Reject contributions over hard cap.
- Notify `SimpleLaunchCampaign` after accepted participation.
- Hold TON until success or failure.
- Let project owner withdraw post-fee TON after success.
- Let platform withdraw fee after success.
- Let users refund after failure/refunding state.
- Prevent duplicate refunds.
- Expose complete get methods.

### ProjectToken Template Responsibilities

- Fixed `maxSupply`.
- Admin mint only before mint is disabled.
- Disable mint after SimpleLaunch finalization.
- Standard Jetton get methods.

## 7. Freeze Old Launch Direction

- Old `LaunchCampaign` is no longer the execution basis for new Launch v1.
- `launch/vesting` is frozen for SimpleLaunch v1.
- Governance is not implemented for SimpleLaunch v1.
- Oracle is not implemented for SimpleLaunch v1.
- `token_launcher` may remain frozen or be adapted later; it is not required for SimpleLaunch v1.

## 8. Planned Ops

`SimpleLaunchCampaign`:

- `OP_PARTICIPATION_NOTIFY = 1`
- `OP_ACTIVATE_TOKEN = 2`
- `OP_FINALIZE = 3`
- `OP_CLAIM_TOKEN = 4`
- `OP_CANCEL = 5`
- `OP_SET_METADATA = 6`
- `OP_MARK_FAILED = 7`

`LaunchEscrow`:

- `OP_PARTICIPATE = 1`
- `OP_WITHDRAW_PROJECT_TON = 2`
- `OP_WITHDRAW_PLATFORM_FEE = 3`
- `OP_REFUND = 4`
- `OP_REGISTER_CAMPAIGN = 5`
- `OP_MARK_FINALIZED = 6`
- `OP_MARK_FAILED = 7`

## 9. Acceptance Tests For Implementation PR

- Deploy campaign and escrow.
- Register campaign.
- 1-4 users cannot activate.
- Fifth unique user can activate.
- Duplicate participant does not increment participant count.
- Below-min contribution rejected.
- Over-hardCap contribution rejected.
- Finalize blocked before `endTime` unless hard cap is reached.
- Under-target distribution: target 500,000, actual 50,000, user pool 5%, team 80%, platform 15%.
- Full-target distribution: user pool 50%, team 35%, platform 15%.
- User claim proportional to contribution.
- Duplicate claim fails.
- Project withdraws TON after fee.
- Platform withdraws fee.
- Failed campaign refunds.
- Refund after claim fails; claim after refund fails.
- `ProjectToken` maxSupply and disable mint are enforced.

## 10. Explicit Non-Actions In This PR

- No `.tolk` changes.
- No wrapper changes.
- No tests changed.
- No deployment.
- No mainnet deployment.
- No D1 SQL execution.
- No claim that SimpleLaunch v1 has been implemented.
