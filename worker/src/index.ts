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

// 3. POST /api/v1/launches - Create a new launch project
app.post('/api/v1/launches', async (c) => {
  try {
    const body = await c.req.json();
    const {
      id,
      owner_id,
      name,
      description,
      target_total,
      stage1_target,
      stage1_rate,
      stage1_bonus,
      stage2_target,
      stage2_rate,
      stage3_rate,
      deploy_threshold,
      deadline
    } = body;

    if (!id || !owner_id || !name || !target_total) {
      return c.json({ success: false, error: 'Missing required parameters' }, 400);
    }

    await c.env.DB.prepare(
      `INSERT INTO launches (
        id, owner_id, name, description, target_total, 
        stage1_target, stage1_rate, stage1_bonus, 
        stage2_target, stage2_rate, stage3_rate, 
        deploy_threshold, raised_total, status, deadline, token_deployed
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 'active', ?, 0)`
    ).bind(
      id, owner_id, name, description || '', target_total,
      stage1_target || (target_total * 0.3), stage1_rate || 100, stage1_bonus || 10,
      stage2_target || (target_total * 0.6), stage2_rate || 80, stage3_rate || 60,
      deploy_threshold || 0.55, deadline || new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString()
    ).run();

    return c.json({ success: true, message: 'Launch project created successfully', projectId: id });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// 4. POST /api/v1/launches/:id/spark - Back/Spark a project
app.post('/api/v1/launches/:id/spark', async (c) => {
  const id = c.req.param('id');
  try {
    const { user_id, amount, stage, tokens } = await c.req.json();
    
    if (!user_id || !amount || !tokens) {
      return c.json({ success: false, error: 'Missing parameters' }, 400);
    }

    // Get project raised total
    const project = await c.env.DB.prepare('SELECT raised_total, target_total, deploy_threshold, status FROM launches WHERE id = ?').bind(id).first() as any;
    if (!project) {
      return c.json({ success: false, error: 'Project not found' }, 404);
    }

    // Insert spark record
    const recordId = `spk-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    await c.env.DB.prepare(
      'INSERT INTO spark_records (id, launch_id, user_id, amount, stage, tokens) VALUES (?, ?, ?, ?, ?, ?)'
    ).bind(recordId, id, user_id, amount, stage || 1, tokens).run();

    // Increment raised amount
    const newRaisedTotal = Number((project.raised_total + amount).toFixed(2));
    let newStatus = project.status;
    let tokenDeployed = 0;

    // Check deploy threshold (55%)
    const thresholdAmount = project.target_total * project.deploy_threshold;
    if (newRaisedTotal >= thresholdAmount && project.status === 'active') {
      newStatus = 'success';
      tokenDeployed = 1;
    }

    await c.env.DB.prepare(
      'UPDATE launches SET raised_total = ?, status = ?, token_deployed = ? WHERE id = ?'
    ).bind(newRaisedTotal, newStatus, tokenDeployed, id).run();

    return c.json({ 
      success: true, 
      message: 'Spark recorded successfully', 
      newRaisedTotal, 
      status: newStatus,
      tokenDeployed: tokenDeployed === 1
    });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// 5. GET /api/v1/launches/:id/proposals - Get all proposals for a project
app.get('/api/v1/launches/:id/proposals', async (c) => {
  const id = c.req.param('id');
  try {
    const { results } = await c.env.DB.prepare(
      'SELECT * FROM governance_proposals WHERE launch_id = ? ORDER BY created_at DESC'
    ).bind(id).all();
    return c.json({ success: true, data: results });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// 6. POST /api/v1/launches/:id/proposals - Create a withdrawal proposal
app.post('/api/v1/launches/:id/proposals', async (c) => {
  const id = c.req.param('id');
  try {
    const { amount, purpose } = await c.req.json();
    if (!amount || !purpose) {
      return c.json({ success: false, error: 'Missing parameters' }, 400);
    }

    const propId = `prop-${Date.now()}`;
    const expiresAt = new Date(Date.now() + 48 * 3600 * 1000).toISOString(); // 48 hours validity

    await c.env.DB.prepare(
      'INSERT INTO governance_proposals (id, launch_id, amount, purpose, yes_weight, no_weight, status, expires_at) VALUES (?, ?, ?, ?, 0, 0, \'active\', ?)'
    ).bind(propId, id, amount, purpose, expiresAt).run();

    return c.json({ success: true, message: 'Proposal created successfully', proposalId: propId });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// 7. POST /api/v1/launches/:id/proposals/:proposalId/vote - Vote on a proposal
app.post('/api/v1/launches/:id/proposals/:proposalId/vote', async (c) => {
  const proposalId = c.req.param('proposalId');
  try {
    const { user_id, weight, vote } = await c.req.json();
    
    if (!user_id || !weight || !vote) {
      return c.json({ success: false, error: 'Missing parameters' }, 400);
    }

    // Check double voting
    const existingVote = await c.env.DB.prepare(
      'SELECT id FROM governance_votes WHERE proposal_id = ? AND user_id = ?'
    ).bind(proposalId, user_id).first();

    if (existingVote) {
      return c.json({ success: false, error: 'User has already voted' }, 400);
    }

    // Insert vote record
    const voteId = `vote-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    await c.env.DB.prepare(
      'INSERT INTO governance_votes (id, proposal_id, user_id, weight, vote) VALUES (?, ?, ?, ?, ?)'
    ).bind(voteId, proposalId, user_id, weight, vote).run();

    // Update proposal weights
    const column = vote === 'yes' ? 'yes_weight' : 'no_weight';
    await c.env.DB.prepare(
      `UPDATE governance_proposals SET ${column} = ${column} + ? WHERE id = ?`
    ).bind(weight, proposalId).run();

    return c.json({ success: true, message: 'Vote recorded successfully' });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// 8. POST /api/v1/launches/:id/exit - Request a compliant exit
app.post('/api/v1/launches/:id/exit', async (c) => {
  const id = c.req.param('id');
  try {
    const { user_id, redeemed_ton, burned_tokens } = await c.req.json();
    
    if (!user_id || !redeemed_ton || !burned_tokens) {
      return c.json({ success: false, error: 'Missing parameters' }, 400);
    }

    const requestId = `exit-${Date.now()}`;
    await c.env.DB.prepare(
      'INSERT INTO exit_requests (id, launch_id, user_id, redeemed_ton, burned_tokens) VALUES (?, ?, ?, ?, ?)'
    ).bind(requestId, id, user_id, redeemed_ton, burned_tokens).run();

    return c.json({ success: true, message: 'Exit request recorded successfully', requestId });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// 9. GET /api/v1/platform/contracts - Get all platform contract addresses
app.get('/api/v1/platform/contracts', async (c) => {
  try {
    const { results } = await c.env.DB.prepare(
      'SELECT * FROM platform_contracts ORDER BY contract_name ASC'
    ).all();
    return c.json({ success: true, data: results });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// 10. GET /api/v1/launches/:id/vesting - Get team vesting status (10 rounds)
app.get('/api/v1/launches/:id/vesting', async (c) => {
  const id = c.req.param('id');
  try {
    const project = await c.env.DB.prepare(
      'SELECT * FROM launches WHERE id = ?'
    ).bind(id).first();
    if (!project) return c.json({ success: false, error: 'Project not found' }, 404);
    // Mock: return 10-round vesting data
    const rounds = [];
    for (let i = 1; i <= 10; i++) {
      rounds.push({
        round: i,
        locked: i === 1 ? 2 : 3.8,
        unlocked: i <= 2,
        priceThreshold: (0.01 * Math.pow(1.5, i)).toFixed(4),
        currentPrice: 0.015,
        matched: i <= 1,
        matchedAt: i <= 1 ? new Date(Date.now() - 48 * 3600 * 1000).toISOString() : null,
      });
    }
    return c.json({ success: true, data: rounds });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// 11. GET /api/v1/launches/:id/health - Project health with new TON model (30/50/18/2)
app.get('/api/v1/launches/:id/health', async (c) => {
  const id = c.req.param('id');
  try {
    const project = await c.env.DB.prepare(
      'SELECT * FROM launches WHERE id = ?'
    ).bind(id).first() as any;
    if (!project) return c.json({ success: false, error: 'Project not found' }, 404);
    const raised = project.raised_total || 0;
    const target = project.target_total || 1;
    return c.json({
      success: true,
      data: {
        tonSplit: { team: 30, governance: 50, project: 18, platformFee: 2 },
        tokenSplit: { investor: 35, teamVesting: 40, ops: 10, platform: 10, lp: 5 },
        progress: Math.min((raised / target) * 100, 100).toFixed(1),
        thresholdReached: (raised / target) >= 0.55,
        status: project.status,
      },
    });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});
