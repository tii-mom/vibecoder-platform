# Mainnet Preflight Report

> **STATUS: PREFLIGHT ONLY. NO MAINNET DEPLOYMENT EXECUTED.**
> Generated: 2026-06-03
> This is a planning document. All deployment actions require separate approval.

---

## 1. Mainnet Addresses Plan

| Contract | Testnet Address (for reference) | Mainnet Address |
| --- | --- | --- |
| VC_JETTON | `UQAUgPNJOk0ORN9VAgCNuGnwXo_qkbBYOlXs888G96eyvIMf` | TBD (new deploy) |
| FUND | `UQA...` | TBD |
| VC_REWARD_POOL | `UQD...` | TBD |
| SALE_VESTING | `UQAV...` | TBD |
| TEAM_VESTING | `UQD2...` | TBD |
| DEVELOPER_REWARD_POOL | `UQCZ...` | TBD |
| ECOSYSTEM_REWARD_POOL | `UQA-...` | TBD |
| DEVELOPMENT_FUND | `UQDJ...` | TBD |
| RESERVE_VAULT | `UQCo...` | TBD |
| LAUNCH_ESCROW | `UQCj...` | TBD |
| SIMPLE_LAUNCH_CAMPAIGN | `UQCs...` | TBD |

**Rule**: Testnet addresses must never appear in mainnet configuration.

---

## 2. Mainnet Admin / Multisig Plan

| Role | Recommended | Current Testnet |
| --- | --- | --- |
| deployer | Multisig (3/5 or 2/3) | Single key |
| VC_JETTON admin | Multisig with timelock | Single key |
| Pool admins | Platform multisig | Single key |
| fee recipient | Platform treasury | Deployer wallet |
| emergency pause | Admin multisig | Not implemented |

**Recommendation**: Deploy a 2/3 multisig wallet on mainnet before contracts. All admin roles should point to this multisig.

---

## 3. Mainnet VC Supply Plan

Source: `contracts/docs/vc-jetton-mainnet-fixed-supply-strategy.md`

| Item | Target |
| --- | ---: |
| Total supply | 1,000,000,000 VC |
| Mint on deploy | 1,000,000,000 VC |
| Admin revoke | Immediately after pool funding |
| Pool allocations | Per vc-tokenomics-v3-contract-plan.md |

---

## 4. Mainnet D1 Plan

| Step | Action |
| --- | --- |
| 1 | Run D1 migration 0002 (fix schema) in testnet D1 first |
| 2 | Verify testnet contract registry reads correctly |
| 3 | Prepare mainnet INSERT statements (separate SQL file) |
| 4 | Review and approve mainnet SQL |
| 5 | Execute mainnet D1 after contracts deployed |

**Production D1 execution not in scope of this PR.**

---

## 5. Mainnet Deploy Order

1. Deploy VC_JETTON (fixed supply, 1B VC)
2. Deploy SimpleLaunch contracts (LaunchEscrow, SimpleLaunchCampaign)
3. Deploy VC v3 platform contracts:
   a. SaleVesting
   b. TeamVesting
   c. DeveloperRewardPool
   d. EcosystemRewardPool
   e. DevelopmentFund
   f. ReserveVault
4. Fund each pool with VC mint
5. Revoke VC_JETTON admin after funding
6. Register all addresses in D1
7. Verify all get-methods
8. Execute smoke tests
9. Enable frontend/worker mainnet mode

---

## 6. Rollback Plan

| Scenario | Action |
| --- | --- |
| Deployment failure (insufficient gas) | Retry with higher gas |
| Wrong address / misconfiguration | Redeploy (contracts are immutable once deployed) |
| VC_JETTON admin compromise | If before revocation: revoke immediately. If after: no rollback possible (fixed supply). |
| Pool contract bug | Pause via admin function if available; redeploy new pool contract; migrate funds. |
| D1 corruption | Restore from wrangler D1 backup |

---

## 7. Emergency Pause / Recovery Plan

| Contract | Pause Mechanism | Recovery |
| --- | --- | --- |
| VC_JETTON | Admin can disable mint (before revocation) | Not applicable after fixed supply |
| SaleVesting | closeSale (op=6) | Not reversible |
| TeamVesting | Admin feed price control | Can stop unlocks by not feeding |
| Pools | Admin withdraw | Controlled by multisig |

**Gap**: No global circuit breaker. Recommend adding a pause flag to future contract upgrades.

---

## 8. Smoke Test Plan

| Test | Contract | Method |
| --- | --- | --- |
| Jetton transfer | VC_JETTON | Transfer 1 VC between wallets |
| Buy tier | SaleVesting | Buy 5 TON tier, verify allocation |
| Claim VC | SaleVesting | Claim round 1, verify balance |
| Feed price | TeamVesting | Feed price, verify unlockedRounds |
| Contribute | LaunchEscrow | Send TON, verify state |
| Activate | SimpleLaunchCampaign | Activate with 5 contributors |
| Claim token | SimpleLaunchCampaign | Claim allocation |
| Withdraw | LaunchEscrow | Withdraw raised TON |
| Refund | LaunchEscrow | Refund failed campaign |

---

## 9. Post-Deploy Verify Plan

```bash
npm run build:all
npm run typecheck
npm test -- --runInBand
npm run verify:get-methods       # (mainnet addresses)
npm run verify:vc-v3:testnet     # → adapt for mainnet
npm run verify:vc-v3:balances    # → adapt for mainnet
npm run verify:simple-launch:testnet  # → adapt for mainnet
```

---

## 10. Signer Checklist

| Signer | Action |
| --- | --- |
| Signer 1 | Review deploy script, confirm addresses |
| Signer 2 | Review deploy script, confirm addresses |
| Signer 3 | Execute multisig deploy |
| All | Confirm git tag for deploy commit |
| All | Verify no secrets in deploy artifacts |

---

## 11. Human Approval Checklist

Before mainnet deployment, ALL of the following must be confirmed:

- [ ] 1. All testnet flows pass (SimpleLaunch deploy, flow, SaleVesting buyer flow)
- [ ] 2. RPC is operational for mainnet
- [ ] 3. All get-method verifications pass on testnet
- [ ] 4. Testnet D1 registry reviewed
- [ ] 5. Worker/frontend tested against testnet
- [ ] 6. Mainnet admin multisig deployed and tested
- [ ] 7. All mainnet addresses confirmed and peer-reviewed
- [ ] 8. Deploy order documented and reviewed
- [ ] 9. Mainnet VC supply strategy reviewed
- [ ] 10. Rollback plan reviewed
- [ ] 11. Emergency pause procedure documented
- [ ] 12. Smoke test plan approved
- [ ] 13. No secrets in repo (audited)
- [ ] 14. No testnet addresses in mainnet config
- [ ] 15. No mock fallback in production code
- [ ] 16. D1 plan reviewed and approved
- [ ] 17. Audit / security review completed (if applicable)
- [ ] 18. Team sign-off on all items above

**NO MAINNET DEPLOYMENT UNTIL ALL ITEMS CHECKED.**

---

## Boundaries

| Item | Status |
| --- | --- |
| mainnet deployed | NO |
| mainnet VC minted | NO |
| production D1 executed | NO |
| secrets committed | NO |
| testnet addresses in mainnet config | NO |
