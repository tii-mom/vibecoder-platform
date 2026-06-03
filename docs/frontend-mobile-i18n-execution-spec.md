# Frontend Mobile UX and I18n Execution Spec

Status: ready for implementation threads  
Scope: `/Users/yudeyou/Desktop/VC/vc` frontend only  
Owner role: execution threads implement; reviewer validates against this document

## 1. Purpose

This document defines the execution boundary, rules, tasks, and acceptance criteria for improving VibeCoder frontend quality.

The target is not cosmetic polish. The target is to turn repeated user judgment into product defaults:

- fewer required actions
- clearer mobile-first workflows
- professional, high-trust interface quality
- complete language coverage after switching languages
- predictable acceptance gates that can be run by another thread

The guiding principle is Michael Polanyi's tacit knowledge practice: users should not have to consciously interpret every system detail. The interface should encode expert judgment into default states, progressive disclosure, and context-aware next actions.

## 2. Non-Goals

Do not rewrite the product concept.

Do not change smart contract logic, signer logic, backend API semantics, token economics, wallet protocol behavior, or production network configuration.

Do not add a new UI framework or design system unless a local component cannot satisfy the requirement with reasonable changes.

Do not replace React Router, Zustand, Vite, Tailwind, TON Connect, Recharts, or the existing app architecture.

Do not remove existing routes or features unless they are hidden behind a mobile overflow pattern and remain reachable.

Do not treat generated demo data as disposable if it is visible to users. Visible mock data must follow the same i18n and UX rules as live data.

## 3. Primary Problems To Fix

### 3.1 Mobile Viewport Instability

Current issue:

- `src/components/Layout.tsx` uses `h-screen w-screen overflow-hidden`.
- Mobile browsers and Telegram WebApp can change visible viewport height as browser chrome appears or disappears.
- Top banners, header, recommendation bar, fixed bottom nav, and toasts compete for the same vertical space.

Required outcome:

- Use dynamic viewport-safe layout behavior.
- Main content must remain scrollable.
- Bottom navigation and toasts must not cover primary actions.
- No page should require horizontal scrolling on common mobile widths.

### 3.2 Mobile Cognitive Load

Current issue:

- Mobile users see risk notice, header, recommendation bar, content, bottom nav, and bot toast at once.
- The app exposes product structure before user intent.

Required outcome:

- Mobile first screen should answer:
  1. What is my current state?
  2. What is the best next action?
  3. What can I safely ignore for now?

### 3.3 Navigation Is Page-Oriented Instead Of Task-Oriented

Current issue:

- Bottom nav labels map to internal pages: Explore, Launch, Copilot, Portfolio, More.

Required outcome:

- Mobile navigation should be framed around user intent:
  - Discover
  - Participate
  - Earnings / Portfolio
  - Assistant
  - More / Account

Exact label text must be localized through i18n.

### 3.4 I18n Is Key-Complete But Not Experience-Complete

Observed baseline:

- `en`, `zh`, and `ko` locale files each contain 1628 keys.
- Key counts match.
- Static scan found missing runtime keys from `t()` calls.
- Many visible strings still bypass i18n through hardcoded literals or `language === ...` ternaries.
- Store/mock data contains visible Chinese content.

Required outcome:

- Switching to any supported language produces full visible coverage.
- No UI-visible text is hardcoded in components, stores, service errors, modal labels, chart labels, placeholders, aria labels, title attributes, alt text, toasts, or empty states unless explicitly allowlisted.

## 4. Supported Languages

Current supported languages:

- `en`
- `zh`
- `ko`

Do not add new languages in this work unless explicitly requested.

Every newly added key must exist in all supported locale files.

Every locale must preserve interpolation placeholders exactly. Example:

- English: `Backers: {count}`
- Chinese: `支持者：{count}`
- Korean: `후원자: {count}`

`{count}` must remain `{count}` in every language.

## 5. I18n Rules

### 5.1 Source Of Truth

All UI-visible copy must come from `src/i18n/locales/*.ts` through `t()`.

This includes:

- buttons
- tabs
- nav labels
- banners
- risk notices
- modal titles and descriptions
- form labels
- placeholders
- validation errors
- success messages
- toast text
- chart labels
- table headers
- empty states
- tooltip text
- `title`
- `aria-label`
- image `alt`
- drawer section labels
- status badges
- localized dates or month names where visible

### 5.2 No Language Ternaries In Components

Do not write component-level language branching like:

```ts
language === 'zh' ? '中文' : language === 'ko' ? '한국어' : 'English'
```

Instead, create locale keys and call `t()`.

Allowed exception:

- route-independent language metadata in `LanguageSwitcher`, such as language native names, may live in a typed constant, but any visible UI label around the switcher must still be translated.

### 5.3 No Translation Detection By String Content

Do not infer current language from translated content, for example:

```ts
t('invite.creatorRules').includes('10')
```

Use the `language` value only for non-visible technical behavior if truly necessary. Prefer keys and typed data structures.

### 5.4 Mock And Store Data

Any visible mock/store data must be localized.

Acceptable patterns:

Pattern A: localized fields in data:

```ts
title: {
  en: 'TrendBot Pro',
  zh: 'TrendBot Pro',
  ko: 'TrendBot Pro'
}
```

Pattern B: data id plus locale key:

```ts
titleKey: 'mockAgents.trendbot.title'
```

Pattern B is preferred when text is long.

Do not keep Chinese-only descriptions, categories, capability names, revenue models, project names, fallback messages, or task titles if they are visible.

### 5.5 Categories And Enums

Internal enum values should not be Chinese.

Recommended migration:

- `数据分析` -> `data_analytics`
- `交易工具` -> `trading_tools`
- `社交` -> `social`
- `监控` -> `monitoring`
- `基础设施` -> `infrastructure`
- `创作工具` -> `creator_tools`
- `DeFi` -> `defi`

Visible category labels must be rendered through locale keys.

If full enum migration is too risky for one pass, create a mapping layer and keep old values only as compatibility input.

### 5.6 Missing Key Behavior

Current `getValueByPath()` returns the key string when missing. This is useful during development but unacceptable as a shipped UX.

Required:

- Missing keys must fail CI or test scripts.
- Manual QA must confirm no raw key path like `launchpad.closeCabin` appears in the UI.

### 5.7 Interpolation Safety

All locale placeholders must match across languages.

Execution thread must add or run a script that validates:

- same key set across all locales
- same interpolation placeholder set per key across all locales
- no missing static `t('...')` keys

## 6. Mobile UX Rules

### 6.1 Layout

Use dynamic viewport units for app shell behavior.

Required:

- Replace `h-screen` dependency in the app shell with `min-h-[100dvh]` or equivalent.
- Avoid global `overflow-hidden` that prevents natural mobile page scroll unless the scroll container is explicitly correct.
- Account for safe areas with `env(safe-area-inset-top)` and `env(safe-area-inset-bottom)`.
- Main content must have enough bottom padding for bottom nav and toast overlap.
- Use stable dimensions for bottom nav, header, tabs, icon buttons, and compact controls.

### 6.2 Mobile First Content Order

For each primary page, mobile content order must be:

1. current state summary
2. primary next action
3. highest-value supporting data
4. secondary actions
5. detailed history or advanced controls

Do not put dense charts, long copy, or multiple competing CTAs above the primary next action on mobile.

### 6.3 One Primary CTA Per State

Each screen state should have one visually dominant action.

Examples:

- Portfolio disconnected: `Connect wallet`
- Portfolio connected with claimable rewards: `Claim rewards`
- Launch detail eligible to participate: `Participate`
- Launch detail already backed: `View allocation`
- No testnet balance: `Get testnet funds`

Secondary actions must be quieter.

### 6.4 Progressive Disclosure

Use progressive disclosure for:

- detailed ledger records
- advanced allocation models
- long risk explanations
- chart controls
- SDK docs
- developer-only diagnostics

Mobile users should not be forced through advanced information before completing common actions.

### 6.5 Toasts And Overlays

Toasts must not cover:

- bottom navigation
- primary CTA
- form submit button
- wallet confirmation guidance

On mobile, toast placement must account for bottom nav height and safe area.

### 6.6 Touch Targets

Interactive controls must meet:

- minimum touch target: 44px by 44px
- visible focus/active state
- no text clipping
- no overlapping tap areas

Compact text may be visually small, but the actual tap target must remain large enough.

### 6.7 No Horizontal Scroll

At widths 360, 375, 390, 414, and 430:

- `document.documentElement.scrollWidth <= window.innerWidth + 1`
- no clipped primary button text
- no table/card causing page-wide overflow

Tables should become cards, stacked rows, or horizontally scroll inside a bounded container.

## 7. Visual Quality Rules

### 7.1 Product Direction

This app should feel like a high-trust Web3/AI product console, not a generic marketing page.

Design qualities:

- calm
- precise
- premium
- transaction-safe
- information-rich but not crowded
- mobile-native

Avoid:

- excessive glow
- decorative gradients without function
- too many competing accent colors
- nested cards
- large hero-style typography inside dashboards
- emoji as status system

### 7.2 Color System

Define a clear role for each color:

- primary action
- success
- warning
- danger
- neutral surface
- neutral border
- muted text
- emphasized text

Do not use arbitrary accent colors per component.

Charts may use multiple colors, but chart colors must not redefine the product interaction palette.

### 7.3 Shape System

Use consistent radius rules.

Recommended:

- buttons: 10-12px or pill, consistently
- cards/panels: 12-16px
- dense controls: 8-10px
- bottom sheets: 20-24px top radius

Do not mix `rounded`, `rounded-xl`, `rounded-2xl`, `rounded-3xl`, and full pills without a clear component rule.

### 7.4 Icons

The project already uses `lucide-react`; continue using it for consistency.

Do not add hand-rolled SVG icons for standard concepts where a Lucide icon exists.

If custom SVGs remain, they must be reviewed for consistency and replaced where practical.

### 7.5 Motion

Motion should clarify state change, not decorate.

Required:

- respect reduced-motion preferences
- no infinite pulsing on important controls unless it conveys live status
- drawer and modal animation should be short and predictable

## 8. Page-Level Requirements

### 8.1 App Shell

Files to inspect:

- `src/components/Layout.tsx`
- `src/components/Header.tsx`
- `src/components/RiskNotice.tsx`
- `src/components/RecommendBar.tsx`
- `src/components/MobileNav.tsx`
- `src/components/TelegramNotificationToast.tsx`

Required:

- mobile viewport stable
- top system notices collapsed or combined on mobile
- bottom nav never covers content
- toast placement respects bottom nav
- language switcher fully localized
- wallet button remains reachable

### 8.2 Portfolio

File:

- `src/pages/PortfolioPage.tsx`

Required disconnected state:

- concise explanation
- one primary connect action
- no unnecessary chart/table UI

Required connected state:

- mobile first card summarizes total worth, claimable rewards, active allocations
- primary next action appears above charts/history
- tabs are usable on narrow widths
- charts do not cause overflow
- claim success and error messages localized

### 8.3 Launch / Feed / Launch Detail

Files:

- `src/pages/FeedPage.tsx`
- `src/pages/LaunchPage.tsx`
- `src/pages/LaunchDetail.tsx`

Required:

- categories rendered from locale labels
- no Chinese enum leakage in visible UI
- project cards expose one clear action
- long project descriptions clamp on mobile with detail expansion
- missing detail keys fixed

Known missing keys from static scan include:

- `detail.alertNoShareToExit`
- `detail.confirmExitBurnMessage`
- `detail.statusDelivered`
- `detail.defaultTeamDesc`
- `detail.assuranceModeStaked`
- `detail.assuranceModeUnstaked`
- `detail.currentProgressLabel`
- `detail.statusVerified`
- `detail.statusDeveloping`
- `detail.fundingFlowTitle`
- `detail.govEscrowTitle`
- `detail.govEscrowDesc`
- `detail.secondWithdrawalNotify`
- `detail.proposalYesPercent`
- `detail.proposalNoPercent`
- `detail.proposalVotesSummary`
- `detail.mockOpsPurpose1`
- `detail.mockOpsPurpose2`
- `detail.mockOpsPurpose3`
- `detail.fundsWithdrawalLabel`

### 8.4 Launchpad

File:

- `src/pages/LaunchpadPage.tsx`

Required:

- missing launchpad modal keys fixed
- allocation labels localized
- order book labels localized
- eligibility badges localized
- mobile tables/cards do not overflow

Known missing keys from static scan include:

- `launchpad.participateModalTitle`
- `launchpad.participateModalDesc`
- `launchpad.stakingRequirementDesc`
- `launchpad.vestingSchedule`
- `launchpad.exchangeAmountLabel`
- `launchpad.exchangeAvailableBalance`
- `launchpad.expectedTokens`
- `launchpad.networkFee`
- `launchpad.cancel`
- `launchpad.broadcastingTx`
- `launchpad.approveInWallet`
- `launchpad.swapSuccessTitle`
- `launchpad.txHashLabel`
- `launchpad.spentVc`
- `launchpad.gasFeeTon`
- `launchpad.successLockboxDesc`
- `launchpad.closeCabin`

### 8.5 Invite / Bounty / Create Launch / Dev Hub

Files:

- `src/pages/InvitePage.tsx`
- `src/pages/BountyPage.tsx`
- `src/pages/CreateLaunchPage.tsx`
- `src/pages/DevHubPage.tsx`

Required:

- remove visible language ternaries
- move reward tier text, task titles, validation messages, status names, and template descriptions into locales
- no language inference by checking translated string contents
- share text must be localized

### 8.6 Wallet SDK Docs / Copilot

Files:

- `src/pages/WalletSDKDocPage.tsx`
- `src/pages/CopilotPage.tsx`

Required:

- UI controls localized
- code samples may remain in a technical source language if clearly presented as code, but comments visible inside code samples should be intentionally localized or explicitly treated as code sample content.
- selector options must use locale keys where visible.

## 9. Execution Phases

### Phase 1: Audit And Guardrails

Deliverables:

- list of all missing `t()` keys
- list of hardcoded visible strings by file
- list of language ternaries by file
- list of visible store/mock data fields needing localization
- improved i18n validation script or documented command sequence

Exit criteria:

- implementation thread can identify every category of i18n violation before editing UI.

### Phase 2: I18n Completion

Deliverables:

- all missing locale keys added to `en`, `zh`, `ko`
- visible hardcoded UI strings moved to locale files
- language ternaries removed from visible UI
- mock/store visible text localized or mapped
- placeholders validated across languages

Exit criteria:

- static i18n checks pass
- manual language switching shows no raw key paths and no unintended Chinese/Korean/English leakage.

### Phase 3: App Shell Mobile Fixes

Deliverables:

- dynamic viewport-safe app shell
- mobile-safe top notice/recommend behavior
- bottom nav spacing fixed
- toast positioning fixed
- language switcher mobile behavior verified

Exit criteria:

- mobile viewport tests pass at 360, 375, 390, 414, and 430 widths.

### Phase 4: Primary Workflow Simplification

Deliverables:

- Portfolio mobile states simplified
- Launch/Feed project cards expose next action clearly
- LaunchDetail state-aware CTA hierarchy
- Bounty/Invite/Create flows reduce repeated choices where safe defaults exist

Exit criteria:

- common workflows meet click-count acceptance targets.

### Phase 5: Visual System Pass

Deliverables:

- color role consistency
- radius consistency
- reduced decorative noise
- professional empty/loading/error states
- chart and card density adjusted for mobile

Exit criteria:

- screenshot review passes for all primary routes in all languages.

## 10. Required Verification Commands

Run from:

```bash
cd /Users/yudeyou/Desktop/VC/vc
```

Required commands:

```bash
npm run lint
npm run lint:i18n
npm run build
```

If the i18n scanner is improved or a new scanner is added, run it too and document the command.

Recommended additional checks:

```bash
rg -n "language ===|language !==|\\? '.*' :|\\? \".*\" :" src --glob "*.{ts,tsx}"
rg -n "[\\u4e00-\\u9fff]|[가-힣]" src --glob "!src/i18n/locales/**"
rg -n "title=\"|aria-label=\"|placeholder=\"|alt=\"" src --glob "*.{tsx,jsx}"
```

These `rg` commands may produce false positives. Every result must be either fixed or explicitly allowlisted with a reason.

## 11. Browser Acceptance Matrix

Use the local preview app.

Required routes:

- `/#/feed`
- `/#/launch`
- `/#/launchpad`
- `/#/portfolio`
- `/#/copilot`
- `/#/invite`
- `/#/bounty`
- `/#/settings`

Required mobile viewport widths:

- 360 x 740
- 375 x 812
- 390 x 844
- 414 x 896
- 430 x 932

Required desktop viewport:

- 1280 x 720
- 1440 x 900

For every route and viewport:

- no horizontal page overflow
- no clipped primary CTA
- no bottom nav overlap with primary CTA
- no toast overlap with bottom nav or primary CTA
- no raw i18n key paths visible
- no unintended language leakage
- loading/empty/error states remain readable

For each supported language:

- switch to language
- reload page
- confirm selected language persists
- visit required routes
- confirm visible text coverage

## 12. Workflow Acceptance Targets

### 12.1 Discover And Participate

Starting state: wallet connected and enough test funds.

Target:

- reach a recommended project from mobile home/feed: max 1 primary tap
- participate/back project from project detail: max 2 primary taps after detail page loads
- return to portfolio/allocation confirmation: automatic or max 1 primary tap

### 12.2 Connect Wallet From Portfolio

Starting state: wallet disconnected on `/portfolio`.

Target:

- primary connect CTA visible without scrolling
- only one dominant CTA
- explanatory copy no longer than two short lines on 390px width

### 12.3 Claim Rewards

Starting state: wallet connected with claimable rewards.

Target:

- claim CTA visible above charts/history
- claim interaction max 2 primary taps
- success state shows amount and next action
- failure state explains the exact blocker and recovery action

### 12.4 Change Language

Starting state: any route.

Target:

- language switcher reachable
- language menu labels localized except native language names
- switching language updates current route without navigation reset
- reload preserves selected language

## 13. Definition Of Done

Implementation is complete only when all are true:

- `npm run lint` passes.
- `npm run lint:i18n` passes.
- `npm run build` passes.
- locale key sets match exactly across `en`, `zh`, and `ko`.
- interpolation placeholders match across locales.
- all static `t('...')` keys exist.
- no visible hardcoded text remains outside locale files unless allowlisted.
- no component-level visible language ternaries remain.
- all primary mobile routes pass viewport acceptance.
- all supported languages pass route-level manual QA.
- primary workflows meet click-count targets.
- screenshots for key routes are captured or reviewed in mobile and desktop.
- any remaining exceptions are documented with owner, reason, and follow-up task.

## 14. Allowed Exceptions

The following may remain untranslated:

- product brand names: `VibeCoder`
- token tickers: `VC`, `TON`, `OSA`, `TBP`, etc.
- wallet addresses
- transaction hashes
- URLs
- package names
- code identifiers
- protocol names where translation would be misleading
- code samples, if treated as code sample content

Even when content is allowlisted, surrounding labels must be localized.

Example:

- Allowed: `TON`
- Not allowed: `当前余额: 10 TON` outside locale files

## 15. Reviewer Checklist

Reviewer must check:

- Does the mobile screen make the next action obvious?
- Can a first-time user proceed without understanding internal route structure?
- Did the implementation reduce choices rather than just restyle them?
- Does each language feel native enough for product use?
- Are error states actionable?
- Are risk warnings visible but not constantly blocking useful action?
- Are charts and ledgers secondary to user action on mobile?
- Are all visible strings covered by locale keys or documented exceptions?
- Are screenshots free of overlap, clipping, and raw key paths?

## 16. Initial Findings Snapshot

The following findings triggered this spec:

- `src/components/Layout.tsx` uses `h-screen w-screen overflow-hidden`.
- `src/components/LanguageSwitcher.tsx` contains hardcoded `Switch Language` and `Select Language`.
- `src/components/RecommendBar.tsx` contains hardcoded Chinese text `代币`.
- static `t()` scan found missing keys in `LaunchDetail` and `LaunchpadPage`.
- `InvitePage`, `BountyPage`, `CreateLaunchPage`, and `DevHubPage` contain visible language ternaries.
- store/mock data contains Chinese visible business copy.

Execution threads should re-run scans before editing because the codebase may have changed.
