import { Hono } from 'hono';
import { cors } from 'hono/cors';

type Bindings = {
  DB: D1Database;
};

const app = new Hono<{ Bindings: Bindings }>();

// Enable CORS for frontend integration
app.use('/api/*', cors({
  origin: '*', // In production, replace with specific frontend URL
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
  exposeHeaders: ['Content-Length'],
  maxAge: 600,
  credentials: true,
}));

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
