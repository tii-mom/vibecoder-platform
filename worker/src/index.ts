import { Hono } from 'hono';
import { cors } from 'hono/cors';

type Bindings = {
  DB: D1Database;
};

const app = new Hono<{ Bindings: Bindings }>();

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

// 17. GET /api/v1/bounty/balance - Get user VC balance and latest claim state
app.get('/api/v1/bounty/balance', async (c) => {
  try {
    const userId = c.req.query('user_id');
    if (!userId) return c.json({ success: false, error: 'user_id required' }, 400);
    const balance = await c.env.DB.prepare(
      'SELECT * FROM user_vc_balances WHERE user_id = ?'
    ).bind(userId).first();
    const latestClaim = await c.env.DB.prepare(
      'SELECT * FROM bounty_claims WHERE user_id = ? ORDER BY created_at DESC LIMIT 1'
    ).bind(userId).first();
    return c.json({
      success: true,
      data: {
        ...(balance || { pending_vc: 0, total_earned_vc: 0 }),
        latest_claim: latestClaim || null,
      },
    });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// 18. POST /api/v1/bounty/claim - Queue VC claim for off-chain payout worker
app.post('/api/v1/bounty/claim', async (c) => {
  try {
    const { user_id, wallet_address } = await c.req.json();
    if (!user_id || !wallet_address) {
      return c.json({ success: false, error: 'user_id and wallet_address required' }, 400);
    }

    const inFlightClaim = await c.env.DB.prepare(
      `SELECT * FROM bounty_claims
       WHERE user_id = ? AND status IN ('PENDING', 'SUBMITTED')
       ORDER BY created_at DESC LIMIT 1`
    ).bind(user_id).first() as any;
    if (inFlightClaim) {
      return c.json({
        success: true,
        message: 'Claim already queued',
        data: inFlightClaim,
      });
    }

    const balance = await c.env.DB.prepare(
      'SELECT * FROM user_vc_balances WHERE user_id = ?'
    ).bind(user_id).first() as any;
    if (!balance || balance.pending_vc <= 0) {
      return c.json({ success: false, error: 'No pending VC to claim' }, 400);
    }

    const now = new Date().toISOString();
    const claimId = `claim-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    await c.env.DB.prepare(
      `INSERT INTO bounty_claims (id, user_id, wallet_address, amount_vc, status, tx_hash, created_at, updated_at)
       VALUES (?, ?, ?, ?, 'PENDING', NULL, ?, ?)`
    ).bind(claimId, user_id, wallet_address, balance.pending_vc, now, now).run();

    const claim = await c.env.DB.prepare(
      'SELECT * FROM bounty_claims WHERE id = ?'
    ).bind(claimId).first();
    return c.json({
      success: true,
      message: `${balance.pending_vc} VC claim queued for payout`,
      data: claim,
    });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// 19. PUT /api/v1/bounty/claims/:id - Update payout status from background payout script
app.put('/api/v1/bounty/claims/:id', async (c) => {
  try {
    const claimId = c.req.param('id');
    const { status, tx_hash } = await c.req.json();
    const allowedStatuses = new Set(['PENDING', 'SUBMITTED', 'CONFIRMED']);
    if (!allowedStatuses.has(status)) {
      return c.json({ success: false, error: 'status must be PENDING, SUBMITTED, or CONFIRMED' }, 400);
    }

    const claim = await c.env.DB.prepare(
      'SELECT * FROM bounty_claims WHERE id = ?'
    ).bind(claimId).first() as any;
    if (!claim) return c.json({ success: false, error: 'Claim not found' }, 404);

    const now = new Date().toISOString();
    await c.env.DB.prepare(
      'UPDATE bounty_claims SET status = ?, tx_hash = COALESCE(?, tx_hash), updated_at = ? WHERE id = ?'
    ).bind(status, tx_hash || null, now, claimId).run();

    if (status === 'CONFIRMED') {
      await c.env.DB.prepare(
        `UPDATE user_vc_balances
         SET pending_vc = MAX(pending_vc - ?, 0), updated_at = ?
         WHERE user_id = ?`
      ).bind(claim.amount_vc, now, claim.user_id).run();
      await c.env.DB.prepare(
        'UPDATE bounty_submissions SET claimed = 1 WHERE user_id = ? AND claimed = 0'
      ).bind(claim.user_id).run();
    }

    const updatedClaim = await c.env.DB.prepare(
      'SELECT * FROM bounty_claims WHERE id = ?'
    ).bind(claimId).first();
    return c.json({ success: true, data: updatedClaim });
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
