# VC v3 Full Testnet Deployment Report

> Status: full VC v3 platform contracts deployed and funded on testnet. Mainnet deployment not executed.

## Manifest

| Item | Value |
| --- | --- |
| Manifest | `contracts/deployments/testnet.vc-v3.full.json` |
| Network | testnet |
| Deployer | `UQCxJ05yeawVWlsN5SfJ-obajgh2lFffR-O7ebH_s_wqQfRq` |
| Generated at | `2026-06-03T16:49:08.868Z` |

## Testnet Contracts

| Contract | Address | Self VC wallet | Funding target | Balance verification |
| --- | --- | --- | ---: | --- |
| SaleVesting | `UQAV6noSRUR7C83RwCB3T4XV0ylVqCAs_Crf1N5aHp6KzScm` | `UQANAqwlEmVLjKB4PfiIDo0HVLtuGmPOID-nbpW3SKd9IN2p` | 300,000,000 VC | OK, 900,000,000 VC |
| TeamVesting | `UQD24kG-Pnl2OyJAs2hYtbRnBVOkgtsdhhD6z14u46NfSkRF` | `UQBFi75JuzGEboqywouPJKGRZSiRmKpVk0nxPTt0tNsmM7lO` | 200,000,000 VC | OK, 560,000,000 VC |
| DeveloperRewardPool | `UQCZFgdSfL4uGwExeG5wGMo96Aly8Lc5sx_Sf_HDpm27b9JD` | `UQA2096EFdYa_wOPUwxFDfwN9FabFxwrmlKInMX4qsRPwBXE` | 100,000,000 VC | OK, 100,000,000 VC |
| EcosystemRewardPool | `UQA-icYnrMhyb7Qe-wvBDH2k9g5a0is_z-jRfKHmW-HeaqV5` | `UQBS3mKuzdveILepkUrqpa_KT558tdMpTjd2tD0tnW53hXJP` | 100,000,000 VC | OK, 100,000,000 VC |
| DevelopmentFund | `UQDJio3xtfCzu7TWhmxc8r1IeGyC2V7Hr0zLo3LTlbHkNm16` | `UQCf4Y6t2WahVNY3uBXjdatL32VhSGf22owl0W8E3l4_OSz_` | 100,000,000 VC | OK, 100,000,000 VC |
| ReserveVault | `UQCoVCCLCf7RxJ7BykJ4UlbhrtPI2I1894yLL2UkAXKiZ6vw` | `UQAt-3WnhIRCzlCkRCACNn9e2J0l73t3npErCmNtSW81x954` | 100,000,000 VC | OK, 100,000,000 VC |

## Verification

| Check | Result |
| --- | --- |
| `npm run build:all` | OK |
| `npm run typecheck` | OK |
| `npm test -- --runInBand` | OK, 93 tests |
| `npm run verify:get-methods` | OK |
| `npm run verify:vc-v3:full:testnet` | OK |
| `npm run verify:vc-v3:full:balances` | OK |
| `npm run test:vc-v3:flows:plan` | OK for current SaleVesting / TeamVesting state |

## Funding

Funding was executed on testnet with VC_JETTON admin mint for the four new VC v3 contracts.

| Target | Amount | Tx hash |
| --- | ---: | --- |
| DeveloperRewardPool | 100,000,000 VC | not captured by script |
| EcosystemRewardPool | 100,000,000 VC | not captured by script |
| DevelopmentFund | 100,000,000 VC | not captured by script |
| ReserveVault | 100,000,000 VC | not captured by script |

## Boundaries

| Item | Status |
| --- | --- |
| mainnet deployed | NO |
| D1 SQL executed | NO |
| secrets committed | NO |
| Worker production logic changed | NO |
| frontend / vc changed | NO |
| tx hashes fabricated | NO |

## Pending

- Run dedicated live flow tests for DeveloperRewardPool, EcosystemRewardPool, DevelopmentFund, and ReserveVault if required by the next deployment gate.
- Update D1 SQL plan with these testnet addresses, but do not execute D1 SQL in this task.
