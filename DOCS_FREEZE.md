# VibeCoder Documentation Freeze Registry

Last updated: 2026-06-02

This registry defines which documents can be used as current implementation sources and which documents are frozen historical context. Frozen documents must not be used as source-of-truth for product, contract, security, deployment, or task decisions unless they are first reconciled here.

## Current Sources Of Truth

| Document | Role | Notes |
| --- | --- | --- |
| `DOCS_FREEZE.md` | Documentation status registry | Start here before using any project document. |
| `CONTRACTS.md` | Contract model source of truth | Current allocation model and active contract boundary. |
| `tools/contract-interface-freeze.md` | Contract interface freeze | Current pre-mainnet interface and get-method boundary. |
| `contracts/docs/pre-mainnet-readiness.md` | Testnet deployment readiness | Current testnet addresses and pre-mainnet checks. |
| `contracts/docs/platform-contract-deprecation-and-test-plan.md` | Contract migration status | Active/deprecated platform contract map. |
| `IMPLEMENTATION_STATUS.md` | Implementation status | Current implemented modules and simulator/mock caveats. |
| `REMAINING_TASKS.md` | Open execution work | Current remaining task queue, subject to the source-of-truth documents above. |
| `DEVELOPMENT_RULES.md` | Execution rules | Coding and data discipline for future work. |

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

## Freeze Rule

When adding or editing documentation, update this registry in the same change if the document's status changes. If a frozen document is revived, remove its freeze banner only after reconciling it against the current source-of-truth documents.
