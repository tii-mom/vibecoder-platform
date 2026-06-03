# VibeCoder 合约全景文档 v2.0（最终版）

> 合约唯一事实来源。已对齐全部用户决策。

> **v3 通知:** 平台 VC 经济模型正在向 9.8 亿 VC v3 模型迁移。当前本文档仍为 active contract boundary 的事实来源。v3 目标合约拆分详见 `contracts/docs/vc-tokenomics-v3-contract-plan.md`，尚未实现，请勿作为当前执行依据。

---

## 一、最终分配模型

### TON 流向（募资 100%）

| 比例 | 去向 | 释放方式 |
|------|------|----------|
| 30% | 团队钱包 | 55% 触发后立即 |
| 44% - 48.5% | 治理合约 | 团队申请，持币人 sqrt 投票（根据平台费率动态配平，初始为 48.5%） |
| 18% | 项目方 | 自行支配（建池子、运营等） |
| 3.5% - 8% | 平台 Fund | 平台服务费（动态可调，前期用户少设置为 **3.5%**，后期逐步调升至最大 8%） |

### Token 流向（总供应 100%）

| 比例 | 去向 | 释放方式 |
|------|------|----------|
| 37% | 投资者 | TGE 立即（原 35% 调整为 37%，合并平台费下调的 2% 回馈用户） |
| 40% | 团队 Vesting | 2% TGE + 38% 分 10 轮价格解锁 |
| 10% | 运营合约 | 项目方可随时调用（社区奖励等） |
| 8% | 平台 Fund | TGE 转入（原 10% 改为 8%，对齐 launch_campaign.tolk 实际发币代码） |
| 5% | 项目方 | 和 18% TON 一起建 LP 池 |

---

## 二、合约清单（主网前冻结边界）

### 平台代币系统（active）

| # | 合约 | 职责 | 行数 |
|---|------|------|------|
| P1 | VC Jetton | 平台 VC Jetton master；分发完成后 revoke admin | Acton |
| P2 | Fund | 平台 Fund；项目 token/TON custody、用户 VC deposit/withdraw、项目成功奖励、价格解锁 | Acton |
| P3 | VCRewardPool | 开发者激励 100M + 生态用户奖励 350M；项目/用户 claim cap | Acton |
| P4 | EarlyFundraising | 100,000 TON 早期募资；100M VC allocation；20% 立即释放 + 5 轮价格解锁 | Acton |
| P5 | Launch Fee | VC 质押 + VC 部署费；部署费成功后转入 Fund；退款 bounce rollback | Acton |

### 已移除旧合约

| # | 合约 | 状态 | 说明 |
|---|------|------|------|
| LGC1 | EarlySubscription | Removed | 已由 EarlyFundraising 替换，wrapper、compile entry、测试和源码已移除 |
| LGC2 | Strategic | Removed | 已由 Fund/VCRewardPool 分工替换，wrapper、compile entry 和源码已移除 |

### Launch 系统（5 个，`launch/`）

| # | 合约 | 职责 | 状态 |
|---|------|------|------|
| L1 | Launch Campaign | 三段募资 + 55% 触发 + 治理投票 + 退出 | 已写 |
| L2 | Project Token | 标准 TEP-74，元数据前端填入 | 已写 |
| L3 | Vesting | 团队 38% 分 10 轮价格解锁 | 已写（需改写） |
| L4 | Governance | 持有 50% TON + 10% 运营代币 | 待写 |
| L5 | Token Launcher | 部署 Project Token 的工厂 | 已写 |

### 基础设施

| # | 合约 | 职责 | 状态 |
|---|------|------|------|
| I1 | Oracle | 平台控价（第一期手动喂价） | 待写 |

---

## 三、各合约关键设计

### Vesting（价格解锁，固定模板）

```
- 2% TGE 立即释放
- 38% 分 10 轮，每轮 3.8%
- initialPrice = 用户募资均价（合约自动算）
- 第一轮触发价 = avgPrice × (1 + 50%)^1
- 第 N 轮触发价 = avgPrice × (1 + 50%)^N
- 维持 24 小时（TWAP 或 Oracle 确认）
- TGE → 第 1 轮：30 天时间自动解锁（不需要喂价）
- DEX 上线后：TWAP 链上自动对价
```

### Governance（投票治理）

```
持有：
  - 50% TON（募资锁定部分）
  - 10% 运营代币（项目方可申请，投票释放）

规则：
  - 项目方提交申请（金额 + 用途）
  - 投票权重 = sqrt(持仓量)
  - 投票率 ≥ 15%，同意 > 50% 通过
  - 连续 3 次被拒 → 平台介入
```

---

## 四、目录结构

```
contracts/
├── contracts/
│   ├── platform/
│   │   ├── token-system/
│   │   │   ├── vc-jetton/         # P1
│   │   │   ├── fund/              # P2
│   │   │   ├── vc-reward-pool/    # P3
│   │   │   ├── early-fundraising/ # P4
│   │   │   └── launch-fee/        # P5
│   │   └── infra/
│   │       ├── token-launcher/    # L5
│   │       └── oracle/            # I1
│   │
│   ├── launch/
│   │   ├── launch-campaign/       # L1
│   │   ├── project-token/         # L2
│   │   ├── vesting/               # L3
│   │   └── governance/            # L4
│   │
│   └── infra/
│       └── bot-wallet/
│
├── wrappers/
├── tests/
├── package.json
└── tsconfig.json
```

---

## 五、TGE 流通量

| 来源 | 比例 | 说明 |
|------|------|------|
| 投资者 | 37% | 立即流通 |
| 团队首解锁 | 2% | 立即流通 |
| 平台 Fund | 8% | 持有不抛 |
| 运营 | 10% | 项目方调用 |
| 流动性 | 5% | 建池子 |
| 团队锁仓 | 38% | 价格解锁 |

**TGE 实际抛压 = 35% + 2% = 37%**
