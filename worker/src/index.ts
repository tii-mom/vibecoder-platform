import { Hono } from 'hono';
import { cors } from 'hono/cors';

type Bindings = {
  DB: D1Database;
};

const app = new Hono<{ Bindings: Bindings }>();


type AnyRecord = Record<string, any>;

const nowIso = () => new Date().toISOString();
const makeId = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const toBool = (value: unknown) => value === 1 || value === true;

const normalizeProposal = (row: AnyRecord) => ({
  id: row.id,
  projectId: row.launch_id,
  amount: Number(row.amount || 0),
  purpose: row.purpose,
  yesWeight: Number(row.yes_weight || 0),
  noWeight: Number(row.no_weight || 0),
  status: String(row.status || 'active').toLowerCase(),
  createdAt: row.created_at,
  expiresAt: row.expires_at,
  votedAddresses: row.voted_addresses ? String(row.voted_addresses).split(',').filter(Boolean) : [],
  votesCount: {
    yes: Number(row.yes_count || 0),
    no: Number(row.no_count || 0),
  },
});

const normalizeVote = (row: AnyRecord) => ({
  id: row.id,
  proposalId: row.proposal_id,
  userAddress: row.user_id,
  weight: Number(row.weight || 0),
  vote: String(row.vote || '').toLowerCase(),
  createdAt: row.created_at,
});

const normalizeVestingRound = (row: AnyRecord) => ({
  round: Number(row.round),
  locked: Number(row.locked),
  unlocked: toBool(row.unlocked),
  priceThreshold: row.price_threshold,
  currentPrice: row.current_price,
  matched: toBool(row.matched),
  matchedAt: row.matched_at,
});

const normalizeOperation = (row: AnyRecord) => ({
  id: row.id,
  projectId: row.launch_id,
  requesterWallet: row.requester_wallet,
  amount: Number(row.amount || 0),
  amountUnit: row.amount_unit || 'PERCENT',
  purpose: row.purpose,
  yesWeight: Number(row.yes_weight || 0),
  noWeight: Number(row.no_weight || 0),
  status: String(row.status || 'active').toLowerCase(),
  txHash: row.tx_hash,
  createdAt: row.created_at,
  expiresAt: row.expires_at,
  votesCount: {
    yes: Number(row.yes_count || 0),
    no: Number(row.no_count || 0),
  },
});

const ensureVestingRounds = async (db: D1Database, launchId: string, avgPrice: number) => {
  const existing = await db.prepare(
    'SELECT * FROM vesting_rounds WHERE launch_id = ? ORDER BY round ASC'
  ).bind(launchId).all<AnyRecord>();

  if (existing.results.length > 0) {
    return existing.results;
  }

  const createdAt = nowIso();
  const totalShare = 0.38;
  const perRound = (totalShare / 10) * 100;
  const inserts = [];
  for (let i = 1; i <= 10; i++) {
    const matched = i <= 1 ? 1 : 0;
    const unlocked = i <= 1 ? 1 : 0;
    inserts.push(
      db.prepare(
        `INSERT OR IGNORE INTO vesting_rounds
        (id, launch_id, round, locked, price_threshold, current_price, matched, matched_at, unlocked, unlocked_at, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(
        `${launchId}-vesting-${i}`,
        launchId,
        i,
        i === 1 ? 2 : perRound,
        (avgPrice * Math.pow(1.5, i)).toFixed(4),
        (avgPrice * (i <= 2 ? 1 : Math.pow(1.3, i - 1))).toFixed(4),
        matched,
        matched ? createdAt : null,
        unlocked,
        unlocked ? createdAt : null,
        createdAt,
        createdAt
      )
    );
  }
  await db.batch(inserts);
  const { results } = await db.prepare(
    'SELECT * FROM vesting_rounds WHERE launch_id = ? ORDER BY round ASC'
  ).bind(launchId).all<AnyRecord>();
  return results;
};

// Enable CORS for frontend integration
app.use('/api/*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
  exposeHeaders: ['Content-Length'],
  maxAge: 600,
  credentials: true,
}));

// Telegram Bot webhook
app.post('/telegram/webhook', async (c) => {
  try {
    const body = await c.req.json() as any;
    const msg = body?.message;
    const cb = body?.callback_query;
    const botToken = '8221556211:AAFXHq3EufSUArqnHoOn-36INjwUL4imQXQ';
    const tgApi = (method: string, data: any) =>
      fetch(`https://api.telegram.org/bot${botToken}/${method}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

    // Handle callback queries (inline button clicks)
    if (cb) {
      const cbId = cb.id;
      const cbData = cb.data;
      const chatId = cb.message?.chat?.id;
      await tgApi('answerCallbackQuery', { callback_query_id: cbId });

      if (cbData === 'menu') {
        await tgApi('sendMessage', {
          chat_id: chatId, parse_mode: 'HTML',
          text: mainMenuText(),
          reply_markup: mainMenuKeyboard(),
        });
      } else if (cbData === 'launch_nav') {
        await tgApi('sendMessage', {
          chat_id: chatId, parse_mode: 'HTML',
          text: '📋 <b>Launch 项目市场</b>\n\n发现早期 AI Agent 项目，查看融资进度、团队信息、代币经济模型。',
          reply_markup: { inline_keyboard: [[{ text: '🚀 浏览项目', web_app: { url: 'https://app.72h.lol#/launch' } }]] }
        });
      } else if (cbData === 'spark_nav') {
        await tgApi('sendMessage', {
          chat_id: chatId, parse_mode: 'HTML',
          text: '⚡ <b>发现项目 · 一键 Spark</b>\n\n全屏竖滑信息流，刷到感兴趣的 AI 项目直接 Spark 支持。',
          reply_markup: { inline_keyboard: [[{ text: '⚡ 开始刷项目', web_app: { url: 'https://app.72h.lol#/feed' } }]] }
        });
      } else if (cbData === 'portfolio_nav') {
        await tgApi('sendMessage', {
          chat_id: chatId, parse_mode: 'HTML',
          text: '💼 <b>我的持仓</b>\n\n查看你支持的项目、持有的代币、解锁进度和收益。',
          reply_markup: { inline_keyboard: [[{ text: '💼 打开持仓', web_app: { url: 'https://app.72h.lol#/portfolio' } }]] }
        });
      } else if (cbData === 'bounty_nav') {
        await tgApi('sendMessage', {
          chat_id: chatId, parse_mode: 'HTML',
          text: '🎯 <b>赏金市场 · 赚 VC</b>\n\n关注 X、加群、Spark 项目 — 完成任务得 VC。机器人自动验证！',
          reply_markup: { inline_keyboard: [[{ text: '🎯 赏金市场', web_app: { url: 'https://app.72h.lol#/bounty' } }]] }
        });
      } else if (cbData === 'copilot_nav') {
        await tgApi('sendMessage', {
          chat_id: chatId, parse_mode: 'HTML',
          text: '🤖 <b>AI Copilot</b>\n\nDeepSeek AI 智能评分、风险检测、自动 Spark 策略。',
          reply_markup: { inline_keyboard: [[{ text: '🤖 打开 Copilot', web_app: { url: 'https://app.72h.lol#/copilot' } }]] }
        });
      } else if (cbData === 'invite_nav') {
        await tgApi('sendMessage', {
          chat_id: chatId, parse_mode: 'HTML',
          text: '👥 <b>邀请好友 · 解锁特权</b>\n\n1人=审计端 · 3人=算力折扣 · 5人=早鸟通道。',
          reply_markup: { inline_keyboard: [[{ text: '👥 邀请好友', web_app: { url: 'https://app.72h.lol#/invite' } }]] }
        });
      } else if (cbData === 'help_nav') {
        await tgApi('sendMessage', {
          chat_id: chatId, parse_mode: 'HTML',
          text: '❓ <b>帮助中心</b>\n\nVibeCoder = AI 项目发现与 Launch 平台。\n开发者发起 Launch → 用户 Spark 支持 → 55% 自动部署代币。',
          reply_markup: { inline_keyboard: [[{ text: '🚀 立即体验', web_app: { url: 'https://app.72h.lol' } }]] }
        });
      }
      return c.json({ ok: true });
    }

    if (!msg) return c.json({ ok: true });
    const chatId = msg.chat?.id;
    const text = (msg.text || '').trim();

    if (!chatId) return c.json({ ok: true });

    // /start — welcome message with inline keyboard
    if (text === '/start' || text.includes('/start')) {
      await tgApi('sendMessage', {
        chat_id: chatId, parse_mode: 'HTML',
        text: welcomeText(msg.chat?.first_name || ''),
        reply_markup: mainMenuKeyboard(),
      });
    }
    // /launch
    else if (text === '/launch') {
      await tgApi('sendMessage', {
        chat_id: chatId, parse_mode: 'HTML',
        text: '📋 <b>Launch 项目市场</b>\n\n发现早期 AI Agent 项目，查看融资进度、团队信息、代币经济模型。每个项目都经过 AI Copilot 智能评分。',
        reply_markup: { inline_keyboard: [
          [{ text: '🚀 浏览项目', web_app: { url: 'https://app.72h.lol#/launch' } }],
          [{ text: '📋 返回主菜单', callback_data: 'menu' }],
        ]}
      });
    }
    // /spark
    else if (text === '/spark' || text === '/feed') {
      await tgApi('sendMessage', {
        chat_id: chatId, parse_mode: 'HTML',
        text: '⚡ <b>发现项目 · 一键 Spark</b>\n\n全屏竖滑信息流，刷到感兴趣的项目直接 Spark 支持。三段式定价，早鸟更多代币奖励！',
        reply_markup: { inline_keyboard: [
          [{ text: '⚡ 开始刷项目', web_app: { url: 'https://app.72h.lol#/feed' } }],
          [{ text: '📋 返回主菜单', callback_data: 'menu' }],
        ]}
      });
    }
    // /portfolio
    else if (text === '/portfolio') {
      await tgApi('sendMessage', {
        chat_id: chatId, parse_mode: 'HTML',
        text: '💼 <b>我的持仓</b>\n\n查看你支持的项目、持有的代币、解锁进度和收益。随时管理你的 AI 资产组合。',
        reply_markup: { inline_keyboard: [
          [{ text: '💼 打开持仓', web_app: { url: 'https://app.72h.lol#/portfolio' } }],
          [{ text: '📋 返回主菜单', callback_data: 'menu' }],
        ]}
      });
    }
    // /bounty
    else if (text === '/bounty') {
      await tgApi('sendMessage', {
        chat_id: chatId, parse_mode: 'HTML',
        text: '🎯 <b>赏金市场 · 做任务赚 VC</b>\n\n关注 X、加入社群、Spark 项目 — 完成简单任务获得 VC 奖励。机器人自动验证，收益实时到账！',
        reply_markup: { inline_keyboard: [
          [{ text: '🎯 赏金市场', web_app: { url: 'https://app.72h.lol#/bounty' } }],
          [{ text: '📋 返回主菜单', callback_data: 'menu' }],
        ]}
      });
    }
    // /copilot
    else if (text === '/copilot') {
      await tgApi('sendMessage', {
        chat_id: chatId, parse_mode: 'HTML',
        text: '🤖 <b>AI 共建助手 Copilot</b>\n\nDeepSeek AI 驱动的智能分析引擎。自动化评分、风险检测、策略推荐。配置自动 Spark 规则，AI 替你管理投资。',
        reply_markup: { inline_keyboard: [
          [{ text: '🤖 打开 Copilot', web_app: { url: 'https://app.72h.lol#/copilot' } }],
          [{ text: '📋 返回主菜单', callback_data: 'menu' }],
        ]}
      });
    }
    // /invite
    else if (text === '/invite') {
      await tgApi('sendMessage', {
        chat_id: chatId, parse_mode: 'HTML',
        text: '👥 <b>邀请好友 · 解锁特权</b>\n\n邀请 1 人解锁审计端 · 3 人解锁算力折扣 · 5 人解锁早鸟通道。查看你的邀请进度和已解锁特权。',
        reply_markup: { inline_keyboard: [
          [{ text: '👥 邀请好友', web_app: { url: 'https://app.72h.lol#/invite' } }],
          [{ text: '📋 返回主菜单', callback_data: 'menu' }],
        ]}
      });
    }
    // /help
    else if (text === '/help') {
      await tgApi('sendMessage', {
        chat_id: chatId, parse_mode: 'HTML',
        text: '❓ <b>帮助中心</b>\n\n<b>什么是 VibeCoder？</b>\nAI 项目发现与 Launch 平台。开发者发起 Launch，用户 Spark 支持。55% 募资达成自动部署代币。\n\n<b>怎么开始？</b>\n点击下方按钮进入 Mini App，连接 TON 钱包即可。\n\n<b>什么是 VC？</b>\nVC 是平台代币。做赏金任务赚 VC，质押 VC 发起 Launch，用 VC 解锁 AI 深度分析。',
        reply_markup: { inline_keyboard: [
          [{ text: '🚀 立即体验', web_app: { url: 'https://app.72h.lol' } }],
        ]}
      });
    }
    // Fallback
    else {
      await tgApi('sendMessage', {
        chat_id: chatId, parse_mode: 'HTML',
        text: `👋 嗨 ${msg.chat?.first_name || '朋友'}！我是 VibeCoder Bot。\n\n发送 /start 查看完整功能菜单 🚀`,
        reply_markup: { inline_keyboard: [
          [{ text: '🚀 打开 VibeCoder', web_app: { url: 'https://app.72h.lol' } }],
        ]}
      });
    }

    return c.json({ ok: true });
  } catch (e) {
    return c.json({ ok: false }, 500);
  }
});

function welcomeText(name: string): string {
  return `<b>🚀 欢迎来到 VibeCoder，${name || '朋友'}！</b>\n\n<b>AI 项目发现与 Launch 平台</b>\n发现下一个顶级 AI Agent，一键 Spark 支持，55% 自动部署代币。\n\n━━━━━━━━━━━━━━\n✨ <b>快速开始</b>\n━━━━━━━━━━━━━━\n• 📋 浏览 Launch 项目市场\n• ⚡ 刷 Feed 一键 Spark\n• 💼 管理你的持仓组合\n• 🎯 做赏金任务赚 VC\n• 🤖 AI Copilot 智能分析\n\n<b>💰 新用户免费领 15 TON 体验金</b>\n点击下方按钮立即体验 👇`;
}

function mainMenuText(): string {
  return `<b>📋 功能菜单</b>\n\n请选择你需要的功能：`;
}

function mainMenuKeyboard() {
  return {
    inline_keyboard: [
      [{ text: '🚀 打开 VibeCoder', web_app: { url: 'https://app.72h.lol' } }],
      [
        { text: '📋 Launch 市场', callback_data: 'launch_nav' },
        { text: '⚡ 刷 Feed', callback_data: 'spark_nav' },
      ],
      [
        { text: '💼 持仓', callback_data: 'portfolio_nav' },
        { text: '🎯 赏金', callback_data: 'bounty_nav' },
      ],
      [
        { text: '🤖 Copilot', callback_data: 'copilot_nav' },
        { text: '👥 邀请', callback_data: 'invite_nav' },
      ],
      [{ text: '❓ 帮助', callback_data: 'help_nav' }],
    ],
  };
}

// 1. GET /api/v1/launches - Get all launch projects
app.get('/api/v1/launches', async (c) => {
  try {
    const { results } = await c.env.DB.prepare(
      'SELECT * FROM launches ORDER BY created_at DESC'
    ).all();
    return c.json({ success: true, data: results });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// 2. GET /api/v1/launches/:id - Get a single launch project detail
app.get('/api/v1/launches/:id', async (c) => {
  const id = c.req.param('id');
  try {
    const project = await c.env.DB.prepare(
      'SELECT * FROM launches WHERE id = ?'
    ).bind(id).first();

    if (!project) {
      return c.json({ success: false, error: 'Project not found' }, 404);
    }

    // Fetch backers
    const { results: backers } = await c.env.DB.prepare(
      'SELECT user_id as address, amount, created_at as timestamp FROM spark_records WHERE launch_id = ? ORDER BY created_at ASC'
    ).bind(id).all();

    // Fetch milestones status
    const mockMilestones = [
      { title: '阶段 1: 核心产品开发', condition: '智能合约静态分析核心算法研发完成', releaseRadio: 30, status: 'completed' },
      { title: '阶段 2: 测试网启动', condition: '多维度安全扫描及自动提款投票验证通过', releaseRadio: 30, status: 'completed' },
      { title: '阶段 3: 主网安全集成', condition: '防重放机制审计与 72H 沙盒环境交付完成', releaseRadio: 20, status: 'ongoing' },
      { title: '阶段 4: LP 池完全部署', condition: '流动性自动配股与 $OSA Token 发行完全部署', releaseRadio: 20, status: 'pending' },
    ];

    return c.json({ 
      success: true, 
      data: { 
        ...project, 
        backers,
          milestones: mockMilestones
      }
    });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});


// 3. GET /api/v1/launches/:id/health - Get launch on-chain and treasury health
app.get('/api/v1/launches/:id/health', async (c) => {
  const id = c.req.param('id');
  try {
    const launch = await c.env.DB.prepare('SELECT * FROM launches WHERE id = ?').bind(id).first<AnyRecord>();
    if (!launch) return c.json({ success: false, error: 'Project not found' }, 404);

    const contracts = await c.env.DB.prepare('SELECT * FROM launch_contracts WHERE launch_id = ?').bind(id).first<AnyRecord>();
    const sparkStats = await c.env.DB.prepare(
      `SELECT COUNT(*) as backers_count, COALESCE(SUM(amount), 0) as total_amount
       FROM spark_records WHERE launch_id = ?`
    ).bind(id).first<AnyRecord>();
    const onchainStats = await c.env.DB.prepare(
      `SELECT COUNT(*) as records_count,
              COALESCE(SUM(CASE WHEN status = 'confirmed' THEN amount ELSE 0 END), 0) as confirmed_amount,
              COALESCE(SUM(amount), 0) as recorded_amount
       FROM onchain_spark_records WHERE launch_id = ?`
    ).bind(id).first<AnyRecord>();
    const opsStats = await c.env.DB.prepare(
      `SELECT COUNT(*) as requests_count,
              COALESCE(SUM(CASE WHEN status = 'passed' THEN amount ELSE 0 END), 0) as used_percent
       FROM operations_requests WHERE launch_id = ?`
    ).bind(id).first<AnyRecord>();

    const raisedTotal = Number(launch.raised_total || 0);
    const targetTotal = Number(launch.target_total || 0);
    return c.json({
      success: true,
      data: {
        launchId: id,
        status: launch.status,
        tokenDeployed: toBool(launch.token_deployed),
        deployThreshold: Number(launch.deploy_threshold || 0.55),
        raisedTotal,
        targetTotal,
        progress: targetTotal > 0 ? Number(((raisedTotal / targetTotal) * 100).toFixed(2)) : 0,
        contracts: contracts || null,
        spark: {
          backersCount: Number(sparkStats?.backers_count || 0),
          totalAmount: Number(sparkStats?.total_amount || 0),
          onchainRecordsCount: Number(onchainStats?.records_count || 0),
          onchainRecordedAmount: Number(onchainStats?.recorded_amount || 0),
          onchainConfirmedAmount: Number(onchainStats?.confirmed_amount || 0),
        },
        operations: {
          poolPercent: Number(launch.ops_token_share || 10),
          usedPercent: Number(opsStats?.used_percent || 0),
          requestsCount: Number(opsStats?.requests_count || 0),
        },
      },
    });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// 4. GET /api/v1/launches/:id/vesting - Get or seed 10 vesting rounds
app.get('/api/v1/launches/:id/vesting', async (c) => {
  const id = c.req.param('id');
  try {
    const launch = await c.env.DB.prepare('SELECT * FROM launches WHERE id = ?').bind(id).first<AnyRecord>();
    if (!launch) return c.json({ success: false, error: 'Project not found' }, 404);
    const targetTotal = Number(launch.target_total || 0);
    const raisedTotal = Number(launch.raised_total || 0);
    const avgPrice = targetTotal > 0 ? 0.01 + (raisedTotal / targetTotal) * 0.005 : 0.01;
    const rounds = await ensureVestingRounds(c.env.DB, id, avgPrice);
    return c.json({ success: true, data: rounds.map(normalizeVestingRound) });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// 5. GET /api/v1/launches/:id/operations - List operation token requests
app.get('/api/v1/launches/:id/operations', async (c) => {
  const id = c.req.param('id');
  try {
    const { results } = await c.env.DB.prepare(
      'SELECT * FROM operations_requests WHERE launch_id = ? ORDER BY created_at DESC'
    ).bind(id).all<AnyRecord>();
    const usedPercent = results
      .filter((row) => String(row.status).toLowerCase() === 'passed')
      .reduce((sum, row) => sum + Number(row.amount || 0), 0);
    return c.json({
      success: true,
      data: {
        poolPercent: 10,
        usedPercent,
        availablePercent: Math.max(0, 10 - usedPercent),
        requests: results.map(normalizeOperation),
      },
    });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// 6. POST /api/v1/launches/:id/operations - Create operation token request
app.post('/api/v1/launches/:id/operations', async (c) => {
  const id = c.req.param('id');
  try {
    const body = await c.req.json<AnyRecord>();
    const amount = Number(body.amount);
    const purpose = String(body.purpose || '').trim();
    if (!Number.isFinite(amount) || amount <= 0) {
      return c.json({ success: false, error: 'valid amount required' }, 400);
    }
    if (!purpose) return c.json({ success: false, error: 'purpose required' }, 400);

    const launch = await c.env.DB.prepare('SELECT id FROM launches WHERE id = ?').bind(id).first();
    if (!launch) return c.json({ success: false, error: 'Project not found' }, 404);

    const requestId = makeId('ops');
    const createdAt = nowIso();
    const expiresAt = new Date(Date.now() + 48 * 3600 * 1000).toISOString();
    await c.env.DB.prepare(
      `INSERT INTO operations_requests
       (id, launch_id, requester_wallet, amount, amount_unit, purpose, status, created_at, updated_at, expires_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      requestId,
      id,
      body.requester_wallet || body.userAddress || null,
      amount,
      body.amount_unit || 'PERCENT',
      purpose,
      'active',
      createdAt,
      createdAt,
      expiresAt
    ).run();

    const row = await c.env.DB.prepare('SELECT * FROM operations_requests WHERE id = ?').bind(requestId).first<AnyRecord>();
    return c.json({ success: true, data: normalizeOperation(row!) }, 201);
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// 7. GET /api/v1/launches/:id/governance/stats - Get launch governance aggregates
app.get('/api/v1/launches/:id/governance/stats', async (c) => {
  const id = c.req.param('id');
  try {
    const { results: proposalRows } = await c.env.DB.prepare(
      `SELECT p.*,
              GROUP_CONCAT(v.user_id) as voted_addresses,
              SUM(CASE WHEN LOWER(v.vote) = 'yes' THEN 1 ELSE 0 END) as yes_count,
              SUM(CASE WHEN LOWER(v.vote) = 'no' THEN 1 ELSE 0 END) as no_count
       FROM governance_proposals p
       LEFT JOIN governance_votes v ON v.proposal_id = p.id
       WHERE p.launch_id = ?
       GROUP BY p.id
       ORDER BY p.created_at DESC`
    ).bind(id).all<AnyRecord>();
    const { results: voteRows } = await c.env.DB.prepare(
      `SELECT v.* FROM governance_votes v
       INNER JOIN governance_proposals p ON p.id = v.proposal_id
       WHERE p.launch_id = ?
       ORDER BY v.created_at DESC`
    ).bind(id).all<AnyRecord>();
    const { results: exitRows } = await c.env.DB.prepare(
      'SELECT * FROM exit_requests WHERE launch_id = ? ORDER BY created_at DESC'
    ).bind(id).all<AnyRecord>();
    const { results: operationsRows } = await c.env.DB.prepare(
      'SELECT * FROM operations_requests WHERE launch_id = ? ORDER BY created_at DESC'
    ).bind(id).all<AnyRecord>();

    return c.json({
      success: true,
      data: {
        proposals: proposalRows.map(normalizeProposal),
        votes: voteRows.map(normalizeVote),
        exitRequests: exitRows.map((row) => ({
          id: row.id,
          projectId: row.launch_id,
          userAddress: row.user_id,
          redeemedTON: Number(row.redeemed_ton || 0),
          burnedTokens: Number(row.burned_tokens || 0),
          createdAt: row.created_at,
        })),
        operations: operationsRows.map(normalizeOperation),
        stats: {
          activeProposals: proposalRows.filter((row) => String(row.status).toLowerCase() === 'active').length,
          passedProposals: proposalRows.filter((row) => String(row.status).toLowerCase() === 'passed').length,
          rejectedProposals: proposalRows.filter((row) => String(row.status).toLowerCase() === 'rejected').length,
          votesCount: voteRows.length,
          exitRequestsCount: exitRows.length,
        },
      },
    });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// 8. POST /api/v1/launches/:id/governance/vote - Record governance vote
app.post('/api/v1/launches/:id/governance/vote', async (c) => {
  const id = c.req.param('id');
  try {
    const body = await c.req.json<AnyRecord>();
    const proposalId = String(body.proposal_id || body.proposalId || '').trim();
    const userId = String(body.user_id || body.userAddress || '').trim();
    const vote = String(body.vote || '').toLowerCase();
    const weight = Number(body.weight || 0);
    if (!proposalId || !userId || !['yes', 'no'].includes(vote) || !Number.isFinite(weight) || weight <= 0) {
      return c.json({ success: false, error: 'proposal_id, user_id, vote and positive weight required' }, 400);
    }

    const proposal = await c.env.DB.prepare(
      'SELECT * FROM governance_proposals WHERE id = ? AND launch_id = ?'
    ).bind(proposalId, id).first<AnyRecord>();
    if (!proposal) return c.json({ success: false, error: 'Proposal not found' }, 404);

    const existing = await c.env.DB.prepare(
      'SELECT id FROM governance_votes WHERE proposal_id = ? AND user_id = ?'
    ).bind(proposalId, userId).first();
    if (existing) return c.json({ success: false, error: 'User already voted' }, 409);

    const voteId = makeId('vote');
    const createdAt = nowIso();
    await c.env.DB.prepare(
      'INSERT INTO governance_votes (id, proposal_id, user_id, weight, vote, created_at) VALUES (?, ?, ?, ?, ?, ?)'
    ).bind(voteId, proposalId, userId, weight, vote.toUpperCase(), createdAt).run();
    await c.env.DB.prepare(
      `UPDATE governance_proposals
       SET yes_weight = yes_weight + ?, no_weight = no_weight + ?
       WHERE id = ? AND launch_id = ?`
    ).bind(vote === 'yes' ? weight : 0, vote === 'no' ? weight : 0, proposalId, id).run();

    const updated = await c.env.DB.prepare(
      `SELECT p.*,
              GROUP_CONCAT(v.user_id) as voted_addresses,
              SUM(CASE WHEN LOWER(v.vote) = 'yes' THEN 1 ELSE 0 END) as yes_count,
              SUM(CASE WHEN LOWER(v.vote) = 'no' THEN 1 ELSE 0 END) as no_count
       FROM governance_proposals p
       LEFT JOIN governance_votes v ON v.proposal_id = p.id
       WHERE p.id = ? AND p.launch_id = ?
       GROUP BY p.id`
    ).bind(proposalId, id).first<AnyRecord>();

    return c.json({
      success: true,
      data: {
        vote: { id: voteId, proposalId, userAddress: userId, weight, vote, createdAt },
        proposal: normalizeProposal(updated!),
      },
    });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// 9. POST /api/v1/launches/:id/spark/record - Record on-chain Spark transaction
app.post('/api/v1/launches/:id/spark/record', async (c) => {
  const id = c.req.param('id');
  try {
    const body = await c.req.json<AnyRecord>();
    const wallet = String(body.wallet || body.user_id || '').trim();
    const txHash = String(body.tx_hash || body.txHash || '').trim();
    const amount = Number(body.amount);
    if (!wallet || !txHash || !Number.isFinite(amount) || amount <= 0) {
      return c.json({ success: false, error: 'wallet, tx_hash and positive amount required' }, 400);
    }

    const launch = await c.env.DB.prepare('SELECT id FROM launches WHERE id = ?').bind(id).first();
    if (!launch) return c.json({ success: false, error: 'Project not found' }, 404);

    const status = String(body.status || 'pending').toLowerCase();
    const createdAt = nowIso();
    const recordId = makeId('spark-tx');
    await c.env.DB.prepare(
      `INSERT OR REPLACE INTO onchain_spark_records
       (id, launch_id, wallet, amount, tx_hash, status, confirmed_at, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, COALESCE((SELECT created_at FROM onchain_spark_records WHERE tx_hash = ?), ?), ?)`
    ).bind(
      recordId,
      id,
      wallet,
      amount,
      txHash,
      status,
      status === 'confirmed' ? createdAt : null,
      txHash,
      createdAt,
      createdAt
    ).run();

    const row = await c.env.DB.prepare('SELECT * FROM onchain_spark_records WHERE tx_hash = ?').bind(txHash).first<AnyRecord>();
    return c.json({ success: true, data: row }, 201);
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// ============================================================
// Platform Contracts — returns deployed contract addresses
app.get('/api/v1/platform/contracts', async (c) => {
  try {
    const { results } = await c.env.DB.prepare(
      'SELECT contract_name, address FROM platform_contracts ORDER BY contract_name ASC'
    ).all();
    return c.json({ success: true, data: results });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// Bounty System Endpoints
// ============================================================

// 12. GET /api/v1/bounty/tasks - List bounty tasks
app.get('/api/v1/bounty/tasks', async (c) => {
  try {
    const { results } = await c.env.DB.prepare(
      'SELECT * FROM bounty_tasks WHERE status = ? ORDER BY created_at DESC'
    ).bind('ACTIVE').all();
    return c.json({ success: true, data: results });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// 13. POST /api/v1/bounty/tasks - Create a bounty task
app.post('/api/v1/bounty/tasks', async (c) => {
  try {
    const body = await c.req.json();
    const { creator_id, creator_type, creator_tier, task_type, title, description, target_url,
            reward_amount, reward_token, total_slots, is_token_reward, token_reward_chain,
            token_reward_type, token_reward_amount } = body;

    if (!creator_id || !title || !total_slots) {
      return c.json({ success: false, error: 'Missing required fields' }, 400);
    }

    // Check stake for token rewards
    if (is_token_reward) {
      const stake = await c.env.DB.prepare(
        'SELECT * FROM bounty_stakes WHERE user_id = ? AND status = ?'
      ).bind(creator_id, 'ACTIVE').first() as any;
      if (!stake) {
        return c.json({ success: false, error: 'VC stake required for token rewards. Stake first via /bounty/stake.' }, 403);
      }
      const requiredStake = creator_tier === 0 ? 10000 : creator_tier === 1 ? 100000 : 500000;
      if (stake.vc_amount < requiredStake) {
        return c.json({ success: false, error: `Insufficient stake. Need ${requiredStake} VC (current: ${stake.vc_amount})` }, 403);
      }
    }

    const taskId = `bounty-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    await c.env.DB.prepare(
      `INSERT INTO bounty_tasks (id, creator_id, creator_type, creator_tier, task_type, title, description,
       target_url, reward_amount, reward_token, total_slots, completed_slots, vc_stake,
       is_token_reward, token_reward_chain, token_reward_type, token_reward_amount, status, expires_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, ?, ?, ?, ?, 'ACTIVE', ?)`
    ).bind(taskId, creator_id, creator_type || 'USER', creator_tier || 0, task_type, title, description || '',
           target_url, reward_amount || 0, reward_token || 'VC', total_slots,
           is_token_reward || 0, token_reward_chain || '', token_reward_type || '', token_reward_amount || 0,
           new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString()
    ).run();

    return c.json({ success: true, message: 'Task created', taskId });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// 14. POST /api/v1/bounty/tasks/:id/submit - Submit a completed task
app.post('/api/v1/bounty/tasks/:id/submit', async (c) => {
  const taskId = c.req.param('id');
  try {
    const { user_id } = await c.req.json();
    if (!user_id) return c.json({ success: false, error: 'user_id required' }, 400);

    const task = await c.env.DB.prepare(
      'SELECT * FROM bounty_tasks WHERE id = ? AND status = ?'
    ).bind(taskId, 'ACTIVE').first() as any;
    if (!task) return c.json({ success: false, error: 'Task not found or expired' }, 404);
    if (task.completed_slots >= task.total_slots) {
      return c.json({ success: false, error: 'Task fully completed' }, 400);
    }

    // Check duplicate
    const existing = await c.env.DB.prepare(
      'SELECT id FROM bounty_submissions WHERE task_id = ? AND user_id = ?'
    ).bind(taskId, user_id).first();
    if (existing) return c.json({ success: false, error: 'Already submitted' }, 400);

    // Auto-verify (mock — real implementation checks X/TG API)
    const subId = `sub-${Date.now()}-${Math.random().toString(36).substring(2, 4)}`;
    await c.env.DB.prepare(
      'INSERT INTO bounty_submissions (id, task_id, user_id, status, reward_vc, claimed, verified_at) VALUES (?, ?, ?, ?, ?, 0, ?)'
    ).bind(subId, taskId, user_id, 'VERIFIED', task.reward_amount, new Date().toISOString()).run();

    // Update task completion
    await c.env.DB.prepare(
      'UPDATE bounty_tasks SET completed_slots = completed_slots + 1 WHERE id = ?'
    ).bind(taskId).run();

    // Credit user VC balance
    const balance = await c.env.DB.prepare(
      'SELECT * FROM user_vc_balances WHERE user_id = ?'
    ).bind(user_id).first() as any;
    if (balance) {
      await c.env.DB.prepare(
        'UPDATE user_vc_balances SET pending_vc = pending_vc + ?, total_earned_vc = total_earned_vc + ?, updated_at = ? WHERE user_id = ?'
      ).bind(task.reward_amount, task.reward_amount, new Date().toISOString(), user_id).run();
    } else {
      await c.env.DB.prepare(
        'INSERT INTO user_vc_balances (user_id, pending_vc, total_earned_vc, updated_at) VALUES (?, ?, ?, ?)'
      ).bind(user_id, task.reward_amount, task.reward_amount, new Date().toISOString()).run();
    }

    return c.json({ success: true, message: 'Task verified! VC credited to balance.', submissionId: subId });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// 15. POST /api/v1/bounty/stake - Stake VC for token rewards
app.post('/api/v1/bounty/stake', async (c) => {
  try {
    const { user_id, creator_tier, vc_amount } = await c.req.json();
    if (!user_id || !vc_amount) return c.json({ success: false, error: 'user_id and vc_amount required' }, 400);

    const stakeId = `stake-${Date.now()}`;
    await c.env.DB.prepare(
      'INSERT OR REPLACE INTO bounty_stakes (id, user_id, creator_tier, vc_amount, locked_at, unlock_at, status) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).bind(stakeId, user_id, creator_tier || 0, vc_amount,
           new Date().toISOString(),
           new Date(Date.now() + 180 * 24 * 3600 * 1000).toISOString(),
           'ACTIVE'
    ).run();

    return c.json({ success: true, message: 'VC staked successfully', stakeId });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// 16. GET /api/v1/bounty/stake/status - Check stake status
app.get('/api/v1/bounty/stake/status', async (c) => {
  try {
    const userId = c.req.query('user_id');
    if (!userId) return c.json({ success: false, error: 'user_id query param required' }, 400);
    const stake = await c.env.DB.prepare(
      'SELECT * FROM bounty_stakes WHERE user_id = ? AND status = ?'
    ).bind(userId, 'ACTIVE').first();
    return c.json({ success: true, data: stake || null });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// 17. GET /api/v1/bounty/balance - Get user VC balance
app.get('/api/v1/bounty/balance', async (c) => {
  try {
    const userId = c.req.query('user_id');
    if (!userId) return c.json({ success: false, error: 'user_id required' }, 400);
    const balance = await c.env.DB.prepare(
      'SELECT * FROM user_vc_balances WHERE user_id = ?'
    ).bind(userId).first();
    return c.json({ success: true, data: balance || { pending_vc: 0, total_earned_vc: 0 } });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// 18. POST /api/v1/bounty/claim - Claim VC to wallet
app.post('/api/v1/bounty/claim', async (c) => {
  try {
    const { user_id } = await c.req.json();
    if (!user_id) return c.json({ success: false, error: 'user_id required' }, 400);
    const balance = await c.env.DB.prepare(
      'SELECT * FROM user_vc_balances WHERE user_id = ?'
    ).bind(user_id).first() as any;
    if (!balance || balance.pending_vc <= 0) {
      return c.json({ success: false, error: 'No pending VC to claim' }, 400);
    }
    // Reset pending
    await c.env.DB.prepare(
      'UPDATE user_vc_balances SET pending_vc = 0, updated_at = ? WHERE user_id = ?'
    ).bind(new Date().toISOString(), user_id).run();
    // Mark all pending submissions claimed
    await c.env.DB.prepare(
      'UPDATE bounty_submissions SET claimed = 1 WHERE user_id = ? AND claimed = 0'
    ).bind(user_id).run();
    return c.json({ success: true, message: `Claimed ${balance.pending_vc} VC`, amount: balance.pending_vc });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// ============================================================
// Agentic Wallet + Automation Endpoints
// ============================================================

// 19. POST /api/v1/agentic/create - Create agentic wallet
app.post('/api/v1/agentic/create', async (c) => {
  try {
    const { user_id } = await c.req.json();
    if (!user_id) return c.json({ success: false, error: 'user_id required' }, 400);
    const walletId = `aw-${Date.now()}`;
    const dashboardUrl = `https://agents.ton.org/setup/${walletId}`;
    await c.env.DB.prepare(
      'INSERT INTO agentic_wallets (id, user_id, wallet_address, status, dashboard_url) VALUES (?, ?, ?, ?, ?)'
    ).bind(walletId, user_id, '', 'PENDING', dashboardUrl).run();
    return c.json({ success: true, walletId, dashboardUrl });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// 20. GET /api/v1/agentic/status - Get agentic wallet status
app.get('/api/v1/agentic/status', async (c) => {
  try {
    const userId = c.req.query('user_id');
    if (!userId) return c.json({ success: false, error: 'user_id required' }, 400);
    const wallet = await c.env.DB.prepare(
      'SELECT * FROM agentic_wallets WHERE user_id = ? ORDER BY created_at DESC LIMIT 1'
    ).bind(userId).first();
    return c.json({ success: true, data: wallet || null });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// 21. GET /api/v1/automation/rules - List user's automation rules
app.get('/api/v1/automation/rules', async (c) => {
  try {
    const userId = c.req.query('user_id');
    if (!userId) return c.json({ success: false, error: 'user_id required' }, 400);
    const { results } = await c.env.DB.prepare(
      'SELECT * FROM automation_rules WHERE user_id = ? ORDER BY created_at DESC'
    ).bind(userId).all();
    return c.json({ success: true, data: results });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// 22. POST /api/v1/automation/rules - Create automation rule
app.post('/api/v1/automation/rules', async (c) => {
  try {
    const { user_id, rule_type, condition_json, action_json, project_id } = await c.req.json();
    if (!user_id || !rule_type) return c.json({ success: false, error: 'user_id and rule_type required' }, 400);
    const ruleId = `rule-${Date.now()}`;
    await c.env.DB.prepare(
      'INSERT INTO automation_rules (id, user_id, rule_type, project_id, condition_json, action_json) VALUES (?, ?, ?, ?, ?, ?)'
    ).bind(ruleId, user_id, rule_type, project_id || null,
           JSON.stringify(condition_json || {}), JSON.stringify(action_json || {})).run();
    return c.json({ success: true, ruleId });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// 23. PUT /api/v1/automation/rules/:id - Toggle rule enabled
app.put('/api/v1/automation/rules/:id', async (c) => {
  try {
    const ruleId = c.req.param('id');
    const { enabled } = await c.req.json();
    await c.env.DB.prepare(
      'UPDATE automation_rules SET enabled = ? WHERE id = ?'
    ).bind(enabled ? 1 : 0, ruleId).run();
    return c.json({ success: true });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// 24. GET /api/v1/agentic/logs - Get agentic wallet logs
app.get('/api/v1/agentic/logs', async (c) => {
  try {
    const walletId = c.req.query('wallet_id');
    if (!walletId) return c.json({ success: false, error: 'wallet_id required' }, 400);
    const { results } = await c.env.DB.prepare(
      'SELECT * FROM agentic_logs WHERE wallet_id = ? ORDER BY created_at DESC LIMIT 20'
    ).bind(walletId).all();
    return c.json({ success: true, data: results });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

export default app;
