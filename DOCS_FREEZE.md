# VibeCoder Documentation Freeze Registry

Last updated: 2026-06-04

This registry defines which documents can be used as current implementation sources and which documents are frozen historical context. Frozen documents must not be used as source-of-truth for product, contract, security, deployment, or task decisions unless they are first reconciled here.

## Current Sources Of Truth

| Document | Role | Notes |
| --- | --- | --- |
| `DOCS_FREEZE.md` | Documentation status registry | Start here before using any project document. |
| `CONTRACTS.md` | Contract model source of truth | Current allocation model and active contract boundary. |
| `tools/contract-interface-freeze.md` | Contract interface freeze | Current pre-mainnet interface and get-method boundary. |
| `contracts/deployments/testnet.vc-v3.full.json` | VC v3 testnet deployment source of truth | Current VC v3 full testnet contract registry: base 6 + v3 full 6. |
| `contracts/deployments/testnet.simple-launch.json` | SimpleLaunch testnet deployment source of truth | Current SimpleLaunch success-flow testnet addresses. |
| `contracts/docs/testnet-vc-v3-full-deployment-report.md` | VC v3 deployment evidence | On-chain evidence for the full VC v3 testnet deployment. |
| `contracts/docs/vc-v3-testnet-funding-flow-report.md` | VC v3 funding/flow evidence | Funding, TeamVesting, and SaleVesting buyer-flow evidence. |
| `contracts/docs/simple-launch-v1-testnet-deployment-report.md` | SimpleLaunch deployment/flow evidence | Success and failure/refund flow evidence. |
| `contracts/docs/pre-mainnet-readiness.md` | Testnet deployment readiness | Current testnet addresses and pre-mainnet checks. |
| `contracts/docs/platform-contract-deprecation-and-test-plan.md` | Contract migration status | Active/deprecated platform contract map. |
| `IMPLEMENTATION_STATUS.md` | Implementation status | Current implemented modules and simulator/mock caveats. |
| `REMAINING_TASKS.md` | Open execution work | Current remaining task queue, subject to the source-of-truth documents above. |
| `DEVELOPMENT_RULES.md` | Execution rules | Coding and data discipline for future work. |
| `contracts/docs/vc-tokenomics-v3-contract-plan.md` | v3 tokenomics reference | Target 9.8 亿 VC model, contract split, and implementation rationale. Use deployment manifests for current addresses. |

## Frozen Documents

| Document | Freeze Reason | Replacement / Current Reference |
| --- | --- | --- |
| `VIBECODER_PLAN.md` | Earlier product and execution plan; contract model and scope are partially superseded. | `CONTRACTS.md`, `IMPLEMENTATION_STATUS.md`, `REMAINING_TASKS.md` |
| `VIBECODER_PRODUCT.md` | Product whitepaper contains older funding/allocation framing and should not drive implementation. | `IMPLEMENTATION_STATUS.md`, live UI, `CONTRACTS.md` |
| `VIBECODER_WHITEPAPER.md` | Historical whitepaper draft; not current public positioning or protocol spec. | `CONTRACTS.md`, `IMPLEMENTATION_STATUS.md` |
| `VIBECODER_PHASE_PLAN.md` | Phase plan includes historical milestones and transition notes that are no longer a clean execution source. | `REMAINING_TASKS.md`, `IMPLEMENTATION_STATUS.md` |
| `VIBECODER_UPGRADE_PROPOSAL.md` | Proposal document; useful for rationale, not current spec. | `IMPLEMENTATION_STATUS.md`, `REMAINING_TASKS.md` |
| `VIBECODER_FRONTEND_PROMPTS.md` | Generation prompt pack; old route/page assumptions can conflict with current UI. | Current `vc/src/` code and `REMAINING_TASKS.md` |
| `VIBECODER_CONTRACTS.md` | Older contract-system design with superseded allocation and contract-boundary language. | `CONTRACTS.md`, `tools/contract-interface-freeze.md` |
| `VIBECODER_REMAINING_WORK.md` | Old remaining-work report; explicitly replaced by newer planning docs. | `REMAINING_TASKS.md` |
| `VIBECODER_COMPLETE_TASKS_PROMPT.md` | One-shot execution prompt with stale completion state and route assumptions. | `REMAINING_TASKS.md` |
| `VIBECODER_FOUNDER_PERSPECTIVE.md` | Ideation memo; not a spec. | `VIBECODER_PRODUCT.md` only as historical product context, then current status docs |
| `implementation_plan.md` | Phase-specific implementation plan already executed/partially superseded. | `IMPLEMENTATION_STATUS.md`, `REMAINING_TASKS.md` |
| `task.md` | Historical completed checklist. | `IMPLEMENTATION_STATUS.md` |
| `walkthrough.md` | Historical verification report with point-in-time results. | Re-run current verification commands |
| `HANDOVER_MEMO.md` | Handover snapshot from 2026-05-29; addresses/results may be stale. | `IMPLEMENTATION_STATUS.md`, deployment manifests |
| `SECURITY_AUDIT_REPORT.md` | Point-in-time audit report; several findings may have been remediated. | Current security scans and `IMPLEMENTATION_STATUS.md` |
| `SKILLOPT_GUIDE.md` | References ignored external SkillOpt checkout paths; not current repo source. | Reinstall/update SkillOpt before use |
| `tools/contract-interface-freeze-request.md` | Request document contains now-superseded pending items. | `tools/contract-interface-freeze.md` |
| `vc/chinese_report.txt` | Generated scan output, not documentation. | Re-run the scan if needed |
| `docs/testnet-launch-blockers.md` | Historical 6-contract blocker audit superseded by VC v3 full + SimpleLaunch registry. | Current registry source is `contracts/deployments/testnet.vc-v3.full.json` + `contracts/deployments/testnet.simple-launch.json`. |
| `contracts/deployments/testnet.vc-v3.json` | Intermediate SaleVesting/TeamVesting manifest only. | `contracts/deployments/testnet.vc-v3.full.json` |
| `contracts/deployments/testnet.vc-v3.plan.json` | Historical dry-run plan. | `contracts/deployments/testnet.vc-v3.full.json` |
| `contracts/deployments/testnet.simple-launch.plan.json` | Historical SimpleLaunch dry-run plan with predicted addresses. | `contracts/deployments/testnet.simple-launch.json` |

## Active Contract Boundary

- Current testnet registry truth is VC v3 full + SimpleLaunch: 14 required Worker/frontend contracts.
- The base 6 platform contracts remain active because current platform flows still depend on them.
- `EarlySubscription`, `Strategic`, and legacy `EARLY_SUB` naming are frozen historical references only; do not restore them, insert them into D1, or expose them through frontend/Worker readiness checks.
- D1 registry SQL remains plan-only until a separately approved testnet D1 execution task replaces `ROLLBACK` with `COMMIT`.

## Local Untracked Files Observed During Freeze

The following local untracked files were observed on 2026-06-04 and are intentionally not classified by this registry until a dedicated owner/PR accepts or discards them:

- `contracts/deployments/testnet.vc-v3.full.plan.json`
- `contracts/docs/testnet-vc-v3-funding-plan.md`
- `contracts/scripts/mint-vc-testnet-for-v3.ts`
- `vc/src/components/TonConnectProvider.tsx`
- `vc/src/components/WalletConnectPrompt.tsx`
- `vc/src/i18n/pickLocalized.ts`
- `vc/src/i18n/projectCopy.ts`

## Freeze Rule

When adding or editing documentation, update this registry in the same change if the document's status changes. If a frozen document is revived, remove its freeze banner only after reconciling it against the current source-of-truth documents.
