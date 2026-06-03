# VC Tokenomics v3 合约计划

> 980M VC 总供应模型，7 合约拆分，P0/P1/P2 实施顺序。本文档为 v3 经济模型的目标设计，尚未上链实施。当前 active contract boundary 以 `CONTRACTS.md` 为准。

---

## 一、VC 总供应量

| 参数 | 值 |
|------|-----|
| 总供应量 | 980,000,000 VC（9.8 亿） |
| 小数位数 | 9 |
| nano 总供应量 | 980_000_000_000_000_000 |

### Nano 单位参考

| VC 面值 | nano 值 |
|---------|---------|
| 1 VC | 1_000_000_000 |
| 30M VC | 30_000_000_000_000_000 |
| 50M VC | 50_000_000_000_000_000 |
| 100M VC | 100_000_000_000_000_000 |
| 200M VC | 200_000_000_000_000_000 |
| 300M VC | 300_000_000_000_000_000 |
| 980M VC | 980_000_000_000_000_000 |

### 价格精度

价格以 USD × 1_000_000 存储（6 位小数），例如：

| 美元价格 | 合约内存储值 |
|----------|------------|
| $0.002000 | 2000 |
| $0.005000 | 5000 |
| $0.012500 | 12500 |

---

## 二、分配表（8 项，合计 980M）

| 序号 | 类别 | 数量 | nano 值 | 说明 |
|------|------|------|---------|------|
| 1 | 早期募资 (Early Fundraising) | 100M | 100_000_000_000_000_000 | 对用户早期 TON 募资的 VC 回馈 |
| 2 | 团队激励 (Team Vesting) | 300M | 300_000_000_000_000_000 | 分 10 轮价格解锁，2% TGE 立即释放 |
| 3 | 开发者奖励 (Developer Rewards) | 200M | 200_000_000_000_000_000 | 开发者提交项目、通过审核后的 VC 激励 |
| 4 | 生态用户奖励 (Ecosystem Rewards) | 100M | 100_000_000_000_000_000 | 生态用户参与、推广、活跃奖励 |
| 5 | 平台基金 (Platform Fund) | 80M | 80_000_000_000_000_000 | 平台长期运营、安全预算、合规 |
| 6 | 运营 (Operations) | 50M | 50_000_000_000_000_000 | 社区运营、活动、合作伙伴 |
| 7 | 流动性 (Liquidity) | 100M | 100_000_000_000_000_000 | DEX LP 池建设与流动性激励 |
| 8 | 战略储备 (Strategic Reserve) | 50M | 50_000_000_000_000_000 | 未来战略合作、不可预见需求 |

**合计: 980M = 980_000_000_000_000_000 nano**

---

## 三、合约拆分（7 合约 + get-methods）

### 合约 1: VCJetton — VC Master Token

**职责:** VC 平台代币本身，TEP-74 Jetton master。

**优先级:** P0（所有其他合约的基础依赖）

**关键 get-methods:**

```
get_jetton_data() -> (totalSupply, admin, ...)
get_wallet_address(owner: Address) -> Address
is_minting_allowed() -> Bool
get_mint_cap() -> Int          // 980M nano 总硬顶
get_total_minted() -> Int
```

**v3 变更:** 总供应从 500M → 980M；mint cap 硬编码 980M nano。

---

### 合约 2: Fund — 平台金库

**职责:** 平台 TON/VC 托管、用户 VC deposit/withdraw、项目成功奖励、价格解锁资金池。

**优先级:** P0（与 VCJetton 同为核心依赖）

**关键 get-methods:**

```
get_ton_balance() -> Int
get_vc_balance() -> Int
get_deposit_record(user: Address) -> Cell
get_project_funding(projectId: Int) -> Cell
get_withdrawal_queue(user: Address) -> Cell
```

**v3 变更:** 对齐 980M 分配表，新增 developer reward 与 ecosystem reward 的出金逻辑。

---

### 合约 3: VCRewardPool — 开发者 + 生态奖励分发

**职责:** 管理 200M 开发者奖励 + 100M 生态用户奖励。项目 claim cap 控制，防止单项目垄断。

**优先级:** P0（依赖 VCJetton + Fund）

**关键 get-methods:**

```
get_pool_balance() -> Int
get_developer_pool_remaining() -> Int
get_ecosystem_pool_remaining() -> Int
get_claimable(user: Address) -> Int
get_project_cap(projectId: Int) -> Int
get_total_claimed() -> Int
```

**v3 变更:** pool 规模从旧 450M 调整为 200M + 100M；新增项目级 claim cap。

---

### 合约 4: EarlyFundraising — 早期募资

**职责:** 100,000 TON 早期募资，100M VC allocation，3 档 sale tier + 多轮价格解锁。

**优先级:** P1

**关键 get-methods:**

```
get_round_data() -> Cell
get_contribution(user: Address) -> Cell
get_total_raised() -> Int
get_remaining_allocation() -> Int
get_tier_config(tier: Int) -> Cell
```

**Sale Tiers:**

| Tier | TON 金额 | VC 获得 | 轮数 |
|------|---------|---------|------|
| A | 99 TON | 80,000 VC | 3 轮 |
| B | 299 TON | 250,000 VC | 5 轮 |
| C | 599 TON | 599,000 VC | 10 轮 |

---

### 合约 5: LaunchFee — VC 质押 + 部署费

**职责:** 项目部署时 VC 质押要求 + 部署费收取；成功后退至 Fund，失败时 bounce rollback。

**优先级:** P1

**关键 get-methods:**

```
get_fee_config() -> Cell
get_stake_requirement() -> Int
get_stake_balance(project: Address) -> Int
get_deployment_fee() -> Int
get_platform_fee_rate() -> Int
```

---

### 合约 6: Vesting — 团队 10 轮价格解锁

**职责:** 团队 300M VC 按 10 轮价格阶梯自动解锁。每轮 30M VC（300M ÷ 10）。

**优先级:** P2

**关键 get-methods:**

```
get_vesting_schedule(user: Address) -> Cell
get_claimable_amount(user: Address) -> Int
get_round_price(round: Int) -> Int
get_current_round() -> Int
get_total_vested(user: Address) -> Int
```

**价格阶梯（每轮 30M VC）:**

| 轮次 | 触发价格 (USD) | 合约内价格值 | 解锁量 |
|------|---------------|-------------|--------|
| TGE | — | — | 6M (2%) |
| 1 | $0.002000 | 2000 | 30M |
| 2 | $0.005000 | 5000 | 30M |
| 3 | $0.012500 | 12500 | 30M |
| 4 | $0.031250 | 31250 | 30M |
| 5 | $0.078125 | 78125 | 30M |
| 6 | $0.195312 | 195312 | 30M |
| 7 | $0.488281 | 488281 | 30M |
| 8 | $1.220703 | 1220703 | 30M |
| 9 | $3.051758 | 3051758 | 30M |
| 10 | $7.629395 | 7629395 | 30M |

每轮价格 = 上一轮 × 2.5 倍。维持 24h TWAP 确认后方可 claim。

---

### 合约 7: Governance — 治理投票

**职责:** 持有 50% TON + 10% 运营 VC；项目方申请 → 持币人 sqrt 投票。

**优先级:** P2

**关键 get-methods:**

```
get_proposal(proposalId: Int) -> Cell
get_voting_power(user: Address) -> Int
get_proposal_status(proposalId: Int) -> Int
get_active_proposals() -> [Int]
get_vote_result(proposalId: Int) -> Cell
```

---

## 四、当前合约映射（v2 → v3）

| v3 合约 | v2 现状 | 差距 |
|---------|---------|------|
| VCJetton (P0) | P1 VC Jetton (active) | 总供应 500M → 980M，需调整 mint cap |
| Fund (P0) | P2 Fund (active) | 需对齐 v3 分配金额与新出金路径 |
| VCRewardPool (P0) | P3 VCRewardPool (active) | 池子规模需重新分配，新增项目 cap 逻辑 |
| EarlyFundraising (P1) | P4 EarlyFundraising (active) | 100M allocation 对齐；sale tier 需调整 |
| LaunchFee (P1) | P5 Launch Fee (active) | 基本对齐，可能微调 fee rate |
| Vesting (P2) | L3 Vesting (已写，需改写) | 价格阶梯 2.5× 每轮 vs 原 1.5×；总量 300M |
| Governance (P2) | L4 Governance (待写) | 全新实现 |

---

## 五、实施顺序（P0 → P1 → P2）

### P0 — 核心基础（必须先完成）

1. **VCJetton** — mint cap 调整为 980M nano
2. **Fund** — 对齐 v3 分配表，新增出金逻辑
3. **VCRewardPool** — pool 重新分配（200M + 100M），项目 cap

### P1 — 平台核心功能

4. **EarlyFundraising** — 100M allocation + 3 档 sale tier
5. **LaunchFee** — 确认 fee 参数对齐

### P2 — 增强功能

6. **Vesting** — 10 轮 2.5× 价格阶梯解锁
7. **Governance** — sqrt 投票治理

---

## 六、完成状态

| 任务 | 状态 | 备注 |
|------|------|------|
| v3 合约计划文档 | ✅ 完成 | 本文档 |
| PR-C (project token mint cap) | 进行中 | 在父分支上已实现，用于 Launch 侧 mint cap |
| VCJetton mint cap 调整 | ❌ 未开始 | P0 |
| Fund v3 对齐 | ❌ 未开始 | P0 |
| VCRewardPool v3 对齐 | ❌ 未开始 | P0 |
| EarlyFundraising v3 对齐 | ❌ 未开始 | P1 |
| LaunchFee 参数确认 | ❌ 未开始 | P1 |
| Vesting v3 重写 | ❌ 未开始 | P2 |
| Governance 实现 | ❌ 未开始 | P2 |

---

## 七、验收标准

### P0 验收

- [ ] VCJetton 部署且 mint cap = 980_000_000_000_000_000 nano
- [ ] Fund 可正确处理 v3 分配金额的进出金
- [ ] VCRewardPool 池子为 200M + 100M，项目 cap 功能正常

### P1 验收

- [ ] EarlyFundraising 100M allocation 正确，3 档 tier 正常募资
- [ ] LaunchFee 质押 + 部署费 + rollback 全路径通过

### P2 验收

- [ ] Vesting 每轮价格 2.5× 阶梯，12 轮（含 TGE 6M + 10 轮 × 30M）总计 306M 中的 300M 价格解锁部分验证通过
- [ ] Governance 投票权重 = sqrt(持仓)，投票率 ≥ 15%，同意 > 50% 通过

### 全局

- [ ] 全部分配合计 nano = 980_000_000_000_000_000
- [ ] 所有 get-methods 返回正确值
- [ ] P0/P1/P2 按顺序部署，不破坏现有 testnet 状态
