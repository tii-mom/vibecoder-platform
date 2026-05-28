> [!WARNING]
> FROZEN: Historical whitepaper draft. Do not use as current public positioning, allocation model, or protocol spec without reconciling against DOCS_FREEZE.md.
> Registry: [DOCS_FREEZE.md](./DOCS_FREEZE.md)

# VibeCoder：基于 TON 链的 AI 项目去信任化微众筹与自动代币化协议

**作者：** VibeCoder 核心贡献者（VibeCoder Core Contributors）
**状态：** 沙盒 / 测试网原型（Sandbox / Testnet Prototype）
**日期：** 2026年5月29日

---

## 摘要

在生成式人工智能（Generative AI）与去中心化技术（Web3）深度交汇的时代，全球软件生产力正遭遇严重的结构性错配：一方面，独立开发者（Vibe Coders）能够以极低成本编写出可运行的 AI 代理（Agents）或微服务，但由于缺乏早期算力成本与冷启动资金，这些项目大多沦为 GitHub 上的死仓库；另一方面，加密货币市场由于“高稀释估值（FDV）/低流通量”项目及零和博弈（Meme/合约 PvP）的内卷，巨额闲置资本处于无序空转状态，同时数以万计已发行的存量代币面临效用枯竭。

为了解决这一资本流向与真实生产力脱节的结构性矛盾，我们设计并实现了 **VibeCoder**——一个部署在 TON (The Open Network) 链之上的微众筹与自动代币化协议。通过自执行的 Tolk 智能合约状态机，VibeCoder 将募资活动、代币部署、做市商流动性注入与里程碑投票治理原子化合一。此外，协议通过**跨链多代币赏金系统（Multi-Chain Bounty Engine）**，实现了为全网存量代币赋能真实消费场景、协助各大公链及项目方开展生态去中心化共建的功能。

本白皮书系统性地阐述了 VibeCoder 协议的博弈论模型、数学公式、合约编译架构及安全审计细节。

---

## 1. 行业现状与痛点剖析：AI 与加密市场的双重危机

要理解 VibeCoder 的设计必然性，必须透视当前人工智能行业与加密货币行业的深层现实。

### 1.1. AI 行业的生存难题：开发门槛降低，运营与生存门槛极高

随着大语言模型（LLM）能力的飞跃，任何人都能在几天内使用 API 封装出功能丰富的 AI 应用（常被称为 AI Wrapper 或 AI Agent）。然而，AI 开发者正面临着残酷的生存鸿沟：
* **算力与调用成本（Run Rate）高昂**：AI 产品不同于传统的 SaaS 软件。每一次用户提问、每一次图像生成，都需要开发者预先支付昂贵的 API 费用（如 OpenAI, Anthropic, DeepSeek 接口费用）或 GPU 托管费用。由于缺乏冷启动资金，许多优秀的产品在上线前夕便因无法承受推理开销而破产。
* **分发通道与垄断困局**：尽管有 GPT Store 等中心化分发平台，但流量与定价权依然牢牢掌握在少数巨头手中。中小型独立 AI 项目缺乏冷启动的宣发资金和用户留存机制。
* **“概念好、落地难”的死局**：GitHub 上堆积了数百万个优秀的 AI 微服务与 Demo。因为没有持续的资金流入以支付运行成本，它们无法被部署为稳定的 SaaS 服务，最终成为死代码。

### 1.2. 加密行业的信任崩塌：高 FDV/低流通代币与 Meme PvP 泥潭

加密货币市场经历了多轮演进，但由于基本面资产（Utility Assets）的缺乏，目前正处于泡沫空转状态：
* **“机构币”的信用破产**：传统的 Web3 融资模式通常为“高 FDV、低初始流通量”。VC 与机构在低价位锁定筹码，上市后将高估值的代币抛售给散户，导致散户对这类“价值币”彻底失去信心。
* **Meme 的投机内卷（PvP）**：由于对机构币的抗拒，散户资金大规模流向无任何实际用途、纯靠情绪驱动的 Meme 代币，或高杠杆合约交易。这是一种极端的、短寿命的零和博弈（即 Player vs Player）。资金在极短的时间内被泵池、拉高、砸盘，导致 99% 的参与者受损，整个行业未沉淀出任何有实际社会价值的技术或应用。
* **存量代币效用匮乏**：市面上数以万计已发行的 ERC-20、SPL 或其他公链代币，在发行初期过后，大多陷入流动性干涸、无真实落地消费场景的境地。代币成为纯粹的价格符号，缺乏与现实劳动力或生产要素的连接。
* **TON 生态的现实转向**：TON 链依托 Telegram 的 9 亿活跃用户，通过 Notcoin, Hamster Kombat 等“Tap-to-Earn（点击即赚）”游戏证明了极强的分发能力 [3]。然而，随着空投代币上线即抛售，单纯的点击类游戏因缺乏实际的效用与商业支撑，陷入了生命周期极短的困境。整个 Web3 行业迫切需要向**“高落地性、用户愿意付费使用”的消费级 Web3 应用（Consumer Crypto）**转型。

---

## 2. VibeCoder 的解决之道：连接两端的生产力桥梁

VibeCoder 作为一个“即时募资 + 自动发币 + 链上治理”的一体化协议，扮演了连接这三者的信任桥梁：

### 2.1. 对 AI 开发者：将“代码”转化为“即时算力与首批用户”
在 VibeCoder 上，开发者不需要提交复杂的 PPT，只要提供可运行的 Demo 或 GitHub 仓库验证即可发起 Launch。
* **募资达到 55%** 后，合约将自动部署项目代币 $PROJ，并**立即解锁 30% 资金**至开发者运营钱包。这笔资金为独立开发者提供了及时的“生存续航”，能立刻用于支付 API 调用和 GPU 托管费用，避免了因资金断裂而死在襁褓中。
* 一键发起的 Launch 直接推送至全屏信息流，让好产品直接对话 Telegram 生态的散户用户，瞬间积累第一批核心支持者（种子用户）。

### 2.2. 对加密 Backers：消融信任壁垒，获得“看得见、用得着”的实用代币
VibeCoder 从机制设计上彻底杜绝了传统的空气募资与空气代币：
* **拒绝无 Demo 募资**：平台要求所有项目必须有可验证的落地方案，杜绝纯想法或纯白皮书套利。
* **30/50/20 资金管控**：投资人支持项目的资金并非一次性交予项目方，而是将 **50% 锁定在智能合约中**。团队后续的提款必须由社区通过**平方根投票**表决，或者当代币价格上涨 $\ge 150\%$ 时证明了产品市场契合度（PMF），才会分批解锁。这强力约束了开发者的交付行为。
* **30-90天退出机制**：如果项目方在募资成功后连续 14 天停更代码或不交付进度，用户可以直接销毁 $PROJ，按比例赎回国库剩余的托管 TON。这为散户投资提供了坚实的安全垫。

### 2.3. 对加密市场整体：将“投机资金”沉淀为“AI 生产力代币”与多链落地场景
VibeCoder 将 Meme 经济中疯狂的 FOMO 玩法与社交裂变机制（三阶段阶梯定价、拼单 Team Spark）进行良性重构，将这套高效率的流量分发机制“套”在真正的 AI 技术资产上：
* 投资者购买并持有的项目代币（$PROJ）不是无价值的空气，而是具备**即时的实际效用**（SaaS 使用权）：在代币上市之前，Backer 就可以将代币用于抵扣或直接支付该 AI 应用的 API 调用费用、生成额度或质押获取未来 AI 算力优先分配权。
* **跨链代币效用桥梁**：通过接入任意公链的代币作为赏金任务的结算资产，VibeCoder 赋予了市场上数以百万计的存量代币真实的落地消费场景。代币不再仅仅在交易所空转，而是可以直接雇佣全球开发者解决实际工程问题。
* 资金从纯投机的 Meme/合约，流向了可以产出服务、可以持续吸引外部付费、能实现商业闭环的真实 AI 软件中，推动加密产业向生产力本源回归。

---

## 3. VibeCoder 核心机制与创新设计

VibeCoder 的核心创新在于使用博弈论模型将筹资、做市、分配和退款完全刚性化、链上化。

### 3.1. 信息流发现（Explore-to-Support）

摒弃静态的应用商店展示，将已有 Demo 的项目转化为 30 秒短视频/大图演示，支持 Backer 随时上下滑动、一键 Spark（支持）：
* 通过滑屏和点击的隐式行为训练推荐算法，使用户能快速匹配到感兴趣的技术类别 [6]。

### 3.2. 三阶段阶梯定价

$$P_{\text{Stage 1}} < P_{\text{Stage 2}} < P_{\text{Stage 3}}$$

募资根据筹集进度划分为 20%、30% 和 50% 三个阶段。Stage 1 提供 $+10\%$ 的项目代币奖励。合约限定了单钱包地址的阶段购买限额。这在激发早期用户支持热情的同时，压低了大户的持仓集中度，有效控制了倾销风险。

### 3.3. 团队拼单共建（Team Spark）

允许 2-5 位用户共享拼单，每人以极低微额（如 10 TON）共同参与投资。该机制无缝支持非 Web3 熟练用户的托管入池，成功邀请他人的发起者可获取“Finder 发现者积分”，用以提升高级查看权限和评审特权。

### 3.4. 55% 阈值成功自动部署机制

募资进度达到 55% 时，平台状态机立即由 `FUNDING` 变更为 `SUCCESS`。此时，系统调用全局工厂合约，自动部署符合 TEP-74 标准的项目代币 $PROJ，分发给 Backers。项目将保持募资通道继续募集至 100% 或截止日期；如截止日仍未达 55%，合约自动执行 full-refund 全额退款，无任何中间费用扣留。

### 3.5. 30/50/20 资金治理模型

募集的 TON 资金通过合约进行刚性分配：
* **30% 运营池**：Launch 成功后立即可提现，用于项目基础设施、服务器和核心 API 采购开销，无提款投票限制，满足初始流动性需求。
* **50% 治理国库**：锁定在 Campaign 合约中。其提取需由开发者提交里程碑方案，经 Backers 投票表决释放；或者代币价格 $\ge 150\%$ 初始 launch 价时解锁。
* **20% 永久 LP 池**：系统以 20% 资金加上等值的项目代币，自动部署至 STON.fi/DeDust，LP 锁仓 12 个月。其每月的手续费按 50% 流动性提供者、30% 团队、20% 平台进行分账。

### 3.6. 投资者保护与退出机制

在 Launch 成功后的 **30 至 90 天** 黄金退出窗口期内，若项目符合以下任何一项红线违规指标，Backer 可一键赎回部分资金：
1. 项目在链上连续 14 天未提交任何代码变更或开发进展。
2. 项目代币价格低于发行价的 50% 且持续 7 天以上。
3. 开发者发起的资金提取申请连续 2 次被社区投出反对票。
4. 核心里程碑交付延期超过 30 天。

退出金额退款计算公式如下：

$$R_j = I_j \times \alpha \times \left( \frac{E_{\text{current}}}{E_{\text{initial}}} \right)$$

其中：
* $R_j$ 为 Backer $j$ 获得的退还 TON 资产数。
* $I_j$ 为该 Backer 初始投入的 TON 数量。
* $\alpha = 0.70$ 是安全系数（预留 30% 已经释放给开发方作为即期运营成本）。
* $E_{\text{current}}$ 为发起退出时治理托管合约的剩余 TON 余额。
* $E_{\text{initial}}$ 为 Launch 成功时锁定的初始托管资金（即总募集金额的 50%）。

*注意：20% LP 资金已永久注入做市商，不可撤销。退出 Backer 的代币将被就地燃烧，从而自动放大剩余 Backers 的代币所有权比率。退出窗口结束后，剩余托管款将永久转入项目财库。*

### 3.7. 防巨鲸的平方根投票机制（Square-Root Voting）

为限制财阀（巨鲸）通过海量资金干预治理决策，VibeCoder 引入了平方根投票权重机制 [7]。设 Backer $i$ 持有的项目代币数量为 $B_i$，则其表决权权重 $W_i$ 的计算公式为：

$$W_i = \sqrt{B_i}$$

若有 $n$ 个独立地址参与投票，则总表决权权重 $V_{\text{total}}$ 为：

$$V_{\text{total}} = \sum_{i=1}^{n} \sqrt{B_i}$$

这一非线性映射机制确保了小额 Backer 群体可以通过协同表决权压倒单个大户的独断行为。

### 3.8. 开发商分级管理体系

平台依据开发商的历史表现，动态调整其上线费率和额度上限：
* **Tier 1 (新手)**：限上线 1 个项目，募资上限为 50,000 TON。不提供平台币质押背书，平台抽取 15% 众筹服务费。
* **Tier 2 (已验证)**：成功运营 1 个项目满 3 个月且未触发退出条款。募资上限增至 200,000 TON，服务费降低至 10%（支持 Staked 模式）。
* **Tier 3 (精英)**：成功交付 2 个及以上项目，且至少有一个项目的代币市价维持在发行价的 200% 以上。募资上限不封顶，特享精英展示标签，服务费降至 5%，LP 锁仓期由 12 个月缩短至 6 个月。

### 3.9. 跨链多代币赏金与多链生态共建引擎

为了打破单链生态孤岛，VibeCoder 将其核心赏金板块（Bounty Hub）升级为**多链生态共建枢纽**：
* **全网存量代币落地场景**：平台支持接入包括 Ethereum、Solana、Base、BSC 以及 TON 等任何主流公链的代币，作为赏金任务的实用支付/奖励代币。任何代币持有方可以锁定代币发布具体的开发任务，使得市面上数以千万计已发行、缺乏效用的代币转化为雇佣生产力的“代金券”，建立真实的代币效用与流转速度。
* **公链官方与项目方的生态共建**：任何公链的官方基金会（如 TON Foundation、Solana Foundation 等）或具体的 DApp 项目方，均可在 VibeCoder 上设立专属赏金区，发起定制化生态征集任务。他们可以通过锁定各自的生态代币，召集全球 Vibe Coders 协助其完善 SDK、修补智能合约漏洞、编写文档或开发周边微型应用，从而实现去中心化研发协同，大幅度加速其公链生态的壮大。

---

## 4. 智能合约架构与 Acton 编译工具链

VibeCoder 智能合约群采用高性能 Tolk 语言编写，全面迁移至官方推荐的 **Acton 编译器** 进行生产级构建与主网适配 [9]。

### 4.1. 基于 Acton 的合约编译与开发体系

根据 Acton 的官方规范与工程配置 [9]，VibeCoder 建立了更严谨的开发规范：
* **Acton 工程化管理**：引入统一的 `Acton.toml` 描述文件，约束合约的外部依赖和 TVM 编译目标。在构建前执行 `acton build --clear-cache`，清除脏状态缓存，实现无死角安全构建。
* **Tolk 语法适配**：基于 Acton 的标准头文件引入兼容性转换，支持高级消息发送、精确的哈希运算等。
* **异步消息（Outbound Messages）重入与补偿防御**：由于 TON 是完全异步的区块链 [3]，合约之间相互发送的消息可能会由于对方 Gas 余额不足、地址错误或代码异常而被 TVM 退回（bounced）。在 `LaunchCampaign.tolk` 中注册了严格的 bounce 处理，当 Token Launcher 部署代币或进行批处理 mint 失败时，状态机将主动回滚投资账本，防止资金与账目产生不一致。

### 4.2. 合约调用全景与异步流

```
  Backer 支付 TON 支持 Launch
           │
           ▼
┌──────────────────────────────────────┐
│ ① Launch Campaign Contract          │ <─── 采用双源价格 Oracle [10, 11]
│   - Tolk 编写，Acton 编译器构建       │
│   - 管理筹资状态机、三阶段定价        │
│   - 平方根投票与退出资金退出管理      │
└──────────┬───────────────────────────┘
           │
     55% 阈值成功触发时:
           │
     ┌─────┴───────────────────────────┐
     │                                 │
     ▼                                 ▼
┌──────────────────────┐    ┌──────────────────────────────────┐
│ ② LP Pool Contract   │    │ ③ Token Launcher Contract        │
│   - 20% 资金配比对    │    │   - 全局代币部署工厂             │
│   - 执行向 Backers 分发代币      │
└──────────────────────┘    └──────────┬───────────────────────┘
                                       │
                                 成功部署代币:
                                       │
                                       ▼
                            ┌──────────────────────────────────┐
                            │ ④ Project Token ($PROJ)          │
                            │   - 纯标准 TEP-74 Jetton [4]      │
                            │   - 无内部解锁逻辑, 100% DEX 兼容 │
                            └──────────┬───────────────────────┘
                                       │
                                团队代币锁定释放:
                                       │
                                       ▼
                            ┌──────────────────────────────────┐
                            │ ⑤ Vesting Contract               │
                            │   - 独立锁仓仓位                  │
                            │   - TVM 异步回调解锁              │
                            └──────────────────────────────────┘
```

VibeCoder 包含以下 5 个核心合约 [9]：
1. **Launch Campaign Contract**：核心状态机（`DRAFT` $\rightarrow$ `FUNDING` $\rightarrow$ `SUCCESS` / `FAILED`）。记录投资人账本、总平方根投票权重（`totalSqrtWeight`）。
2. **LP Pool Contract**：管理向 STON.fi/DeDust 提供流动性的本金和交易手续费按比例分配。
3. **Token Launcher**：全局工厂，用于接收 Campaign 的授权并在 55% 成功时部署 TEP-74 代币合约。
4. **Project Token**：完全标准的 TEP-74 Jetton [4]，确保能在交易所直接上线，免去兼容性阻碍。
5. **Vesting Contract**：独立管理项目团队预留的代币释放。支持结合 STON.fi/DeDust 的 TWAP 价格和外部 Oracle 喂价（如 RedStone 预言机）[11]，判定是否达成里程碑释放条件。

### 4.3. 双源价格预言机（Oracle）与资金解锁条件

为了保障合约内退出清算和资金自动解锁的公平与安全，VibeCoder 采用双源预言机：
* **主渠道**：STON.fi 或 DeDust DEX 的 24 小时时间加权平均价格（TWAP）[10]。
* **备用渠道**：引入链下主流预言机喂价（如 RedStone [11]），当主渠道遭遇大额价格操纵或失效时，使用备用价格校验。

托管在治理合约中的 50% 资金，其自动释放条件为：

$$P_{\text{TWAP, 24h}} \ge 1.50 \times P_{\text{Launch}}$$

12个月 LP 锁仓本金提前释放条件为：

$$P_{\text{TWAP, 24h}} \ge 2.00 \times P_{\text{Launch}}$$

若未能达到以上市场表现指标，剩余托管 TON 资金必须依赖平方根投票表决逐笔释放给项目方。

### 4.4. 多链赏金任务非原生代币锁定实现

针对以太坊 ERC-20 或 Solana SPL 等外部非原生代币奖励任务，VibeCoder 构建了混合记账架构：
1. **跨链托管层**：任务发布者将非原生代币锁定在 VibeCoder 的多签托管账户（如 Gnosis Safe [15]）或各公链的单向锁定智能合约中。
2. **链下索引与 D1 状态绑定**：后端 API（Cloudflare Hono + D1 数据库）同步监听该跨链锁定期交易。一旦监测到有效锁定，便为该任务打上 `STAKED` 标记。
3. **完成度证明（Proof of Completion）**：开发者提交完成结果（附带 Git 提交、演示地址或链上日志）。由系统/审核员在后端验证后，修改 D1 任务状态为 `VERIFIED` 并释放锁定资产给开发者地址。这打通了 Web2 的实际研发产出与 Web3 跨链代币的激励传导机制。

---

## 5. 安全性客观分析与审计现状

我们倾听并响应去中心化社区对系统完整性的严苛要求，并在架构上持续强化安全性边界。

### 5.1. 安全审计历史与修补工作

在 2026 年 5 月 29 日，安全审计团队对项目进行了专项审计 [12]。已完成以下缺陷修复（P0/P1 风险）：
* **私钥泄漏清除**：完全移除了早期开发中遗留在 `.env.example` 和 `worker/wrangler.toml` 中的助记词与 API 密钥。生产环境改用 Cloudflare Worker 动态 Secret 进行环境变量注入。
* **API IDOR（越权操作风险）整改**：修复了在读取自动化规则和托管钱包日志时，后端直接信任 query `user_id` 的重大隐患。现在，所有操作严格通过 TonConnect 传入的 `ton_proof` 进行签名重放验证，在 JWT 会话解析中严格绑定认证上下文 [13]。
* **去重竞态（TOCTOU）漏洞防范**：后端 `/api/v1/bounty/stake` 原有的查重与写入不具备原子性。现已将链上交易 hash 的记录和质押确认重构为 SQLite D1 的原子事务批处理（`batch`），避免了质押资格被并发双花套现的漏洞。
* **Fund 空状态保存修复**：解决了 Tolk 源码中空消息处理分支由于在没有先调用 `loadData()` 加载持久化配置的情况下直接写回（`saveData()`）导致合约配置损毁（覆盖为默认值）的问题。修改后的代码在所有外部消息处理分支顶部强制优先执行数据加载，确保了系统持久化字典与 Admin 地址的存储完整性。

### 5.2. TVM 异步设计下的残留挑战

* **Gas 超额与 Lock 风险 (OOG)**：如果单一 Campaign 的 Backer 数量上升到数万个，在达到 55% 时一次性遍历所有的投资地址来分发代币，将极易超出 TVM 的单笔交易 Gas 限制 [14]。
  * *解决方案*：协议已设计异步分页机制。通过链上 cursor，每次调用只批处理（batch）前 N 个 Backer，分步分笔完成整个代币分发流程。
* **TVM 消息 Bounced 降级补偿**：在 TON 的异步网络模型下，任何跨合约发送的消息都有可能因为对方 gas 不足或地址失效而退回（bounced）。
  * *解决方案*：各合约均注册了严格的 `bounced` 回调函数，若下游代币分发失败，系统会把用户记账状态回滚，并降级处理，保障总账目资金与代币供应量（Supply）的物理守恒。

---

## 6. 结论

VibeCoder 为 AI 时代的“Vibe Coder”提供了一个全新的点对点金融中介消融系统。借助 TON 链的独特高吞吐设计，我们把众筹、做市商流动性、分期治理和防巨鲸民主决策浓缩在自执行的代码层，将流向高风险合约与 Meme 投机的闲置资本引入实际可运行的 AI 软件生产力开发中。

通过阶梯定价、平方根投票、跨链多代币赏金和生态共建引擎的设立，VibeCoder 在最大程度上化解了 AI 开发者和 Backers 之间的“双向信任赤字”，消除了单链生态孤岛，使数以千万计的存量代币与真实的实体技术生产要素相锚定。我们坚信，去中心化协作的终极形态是代码和机制的自我演进，一切利益分配与履约监督都将在链上智能合约的自证中得以完美协调。

---

## 信息来源与文献引用

* **[1] Nakamoto, S. (2008).** *Bitcoin: A Peer-to-Peer Electronic Cash System.* Available at: [https://bitcoin.pdf](https://bitcoin.org/bitcoin.pdf)
* **[2] Belleflamme, P., Lambert, T., & Schwienbacher, A. (2014).** *Crowdfunding: Tapping the right crowd.* Journal of Business Venturing, 29(5), 585-609.
* **[3] TON Core Developer Docs.** *TON Virtual Machine (TVM) and Asynchronous Smart Contracts.* Available at: [https://docs.ton.org/](https://docs.ton.org/)
* **[4] TON Standards. (2022).** *TEP-74: Fungible Tokens (Jettons) Standard.* Available at: [https://github.com/ton-blockchain/TEPs/blob/master/text/0074-jettons-standard.md](https://github.com/ton-blockchain/TEPs/blob/master/text/0074-jettons-standard.md)
* **[5] STON.fi. (2023).** *STON.fi AMM DEX Whitepaper.* Available at: [https://ston.fi/whitepaper.pdf](https://ston.fi/whitepaper.pdf)
* **[6] Covington, P., Adams, J., & Sargin, E. (2016).** *Deep Neural Networks for YouTube Recommendations.* RecSys '16: Proceedings of the 10th ACM Conference on Recommender Systems.
* **[7] Buterin, V., Hitzig, Z., & Weyl, E. G. (2018).** *Liberal Radicalism: A Flexible Design for Common Goods.* Social Science Research Network (SSRN).
* **[8] Douceur, J. R. (2002).** *The Sybil Attack.* International Workshop on Peer-to-Peer Systems (IPTPS).
* **[9] Acton Github Repository.** *Acton Compiler Toolchain for Tolk and FunC Smart Contracts.* Available at: [https://github.com/ton-blockchain/acton](https://github.com/ton-blockchain/acton)
* **[10] Adams, H., Zinsmeister, N., & Salem, M. (2020).** *Uniswap v2 Core.* Available at: [https://uniswap.org/whitepaper.pdf](https://uniswap.org/whitepaper.pdf)
* **[11] RedStone Oracles. (2024).** *RedStone: Modular Oracle Architecture for Next-Gen DeFi.* Available at: [https://redstone.finance/docs](https://redstone.finance/docs)
* **[12] VibeCoder Security Working Group. (2026).** *VibeCoder Security Audit Report.* Project internal repository documentation: [SECURITY_AUDIT_REPORT.md](file:///Users/yudeyou/Desktop/VC/SECURITY_AUDIT_REPORT.md).
* **[13] Telegram Apps SDK. (2024).** *TonConnect 2.0 Proof Verification Standard.* Available at: [https://github.com/ton-connect/sdk](https://github.com/ton-connect/sdk)
* **[14] Wood, G. (2014).** *Ethereum: A Secure Decentralised Generalised Transaction Ledger.* (Gas limit and out-of-gas loop dynamics).
* **[15] Gnosis Safe Team. (2021).** *Gnosis Safe Smart Contract Wallet Specification.* Available at: [https://github.com/safe-global/safe-smart-account](https://github.com/safe-global/safe-smart-account)
