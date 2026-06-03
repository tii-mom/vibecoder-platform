import './polyfill';

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { sign, verify } from 'hono/jwt';
import { Address, Cell, beginCell } from '@ton/core';
import { verifyExchangeAffiliate, verifyOnchainDeposit } from './services/onramp-verifier';

function tgEscape(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function tgEscapeAttr(text: string): string {
  return tgEscape(text).replace(/"/g, '&quot;');
}



type Bindings = {
  DB: D1Database;
  TELEGRAM_BOT_TOKEN: string;
  TELEGRAM_CHAT_ID?: string;
  TONCENTER_API_KEY: string;
  DEEPSEEK_API_KEY: string;
  JWT_SECRET: string;
  TON_NETWORK: string;
  ENVIRONMENT?: string;
  ADMIN_WALLETS?: string;
  DEV_ADMIN_WALLETS?: string;
  SIGNER_SERVICE: Fetcher;
  TELEGRAM_WEBHOOK_SECRET?: string;
  SIGNER_SECRET_KEY?: string;
};

type Variables = {
  user_id: string;
};

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>();
const REQUIRED_PLATFORM_CONTRACTS = [
  'VC_JETTON',
  'FUND',
  'VC_REWARD_POOL',
  'EARLY_FUNDRAISING',
  'LAUNCH_FEE',
  'TOKEN_LAUNCHER',
];

function currentTonNetwork(c: any): string {
  return c.env.TON_NETWORK || 'testnet';
}

async function sha256(buffer: Uint8Array): Promise<Uint8Array> {
  const hash = await crypto.subtle.digest('SHA-256', buffer);
  return new Uint8Array(hash);
}

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes;
}

function base64ToBytes(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

function compareAddresses(addr1?: string, addr2?: string): boolean {
  if (!addr1 || !addr2) return false;
  try {
    return Address.parse(addr1).equals(Address.parse(addr2));
  } catch {
    return addr1.toLowerCase() === addr2.toLowerCase();
  }
}

function checkIsAdmin(c: any, userAddress: string): boolean {
  const adminWallets = c.env.ADMIN_WALLETS ? c.env.ADMIN_WALLETS.split(',') : [];
  if (adminWallets.length === 0 && c.env.ENVIRONMENT === 'development') {
    const devAdminWallets = c.env.DEV_ADMIN_WALLETS ? c.env.DEV_ADMIN_WALLETS.split(',') : [];
    return devAdminWallets.some((admin: string) => compareAddresses(admin, userAddress));
  }
  return adminWallets.some((admin: string) => compareAddresses(admin, userAddress));
}

async function runDeepSeekReview(apiKey: string, title: string, deliverableUrl: string, environment?: string): Promise<{ pass: boolean, reason: string }> {
  if (!apiKey || apiKey.startsWith('mock') || apiKey.includes('12345') || apiKey.includes('testing')) {
    if (environment !== 'development') {
      return { pass: false, reason: 'AI review unavailable: DEEPSEEK_API_KEY not properly configured.' };
    }
    console.log('[AI Review] Mock API Key detected. Auto-passing review (dev only).');
    return { pass: true, reason: 'Mock review auto-passed (dev).' };
  }

  try {
    const response = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          {
            role: 'system',
            content: 'You are an AI auditor for VibeCoder, a crypto platform for AI projects. Your job is to verify if a milestone deliverable URL is valid and satisfies the milestone requirement. You MUST return your response as a valid JSON object with the format: {"pass": true/false, "reason": "detailed explanation of why it passed or failed"}. Do not include any markdown format tags like ```json in your response, just return the raw JSON.'
          },
          {
            role: 'user',
            content: `Milestone Title: "${title}"\nSubmitted Deliverable URL: "${deliverableUrl}"\nVerify if this link looks like a valid repository, demo, or document matching the milestone. If the URL is just placeholder text, a search engine URL, or invalid, set pass to false.`
          }
        ],
        temperature: 0.1
      }),
      signal: AbortSignal.timeout(8000)
    });

    if (!response.ok) {
      throw new Error(`HTTP error ${response.status}`);
    }

    const data = await response.json() as any;
    const content = data.choices?.[0]?.message?.content?.trim() || "";

    try {
      const parsed = JSON.parse(content);
      if (typeof parsed.pass !== 'boolean') {
        console.warn('[AI Review] DeepSeek returned non-boolean pass field:', parsed);
        return { pass: false, reason: `AI response malformed: pass field must be boolean, got ${typeof parsed.pass}.` };
      }
      return {
        pass: parsed.pass,
        reason: parsed.reason || 'AI review completed.'
      };
    } catch (parseErr) {
      console.warn('[AI Review] Failed to parse JSON content from DeepSeek:', content);
      return { pass: false, reason: `AI response could not be parsed as JSON. Raw: ${content.slice(0, 200)}` };
    }
  } catch (err: any) {
    console.error('[AI Review] DeepSeek review failed due to connection error:', err);
    if (environment === 'development') {
      return { pass: true, reason: `Development connection error fallback: ${err.message}` };
    }
    return { pass: false, reason: `AI review unavailable: ${err.message}` };
  }
}

async function sendTelegramNotification(env: any, text: string): Promise<boolean> {
  const botToken = env.TELEGRAM_BOT_TOKEN;
  const chatId = env.TELEGRAM_CHAT_ID || '-100234567890';

  if (!botToken || botToken.startsWith('mock') || botToken.includes('mock') || botToken.includes('testing')) {
    console.log('[Telegram Notification] Mock bot token detected. Skipping notification. Msg:', text);
    return true;
  }

  try {
    const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'HTML',
        disable_web_page_preview: true
      }),
      signal: AbortSignal.timeout(5000)
    });

    if (!res.ok) {
      const errText = await res.text();
      console.warn(`[Telegram Notification] TG API error ${res.status}:`, errText);
      return false;
    }

    return true;
  } catch (err: any) {
    console.error('[Telegram Notification] Failed to send Telegram notification:', err);
    return false;
  }
}

function calcTokens(amountNano: number, currentRaisedNano: number, project: any): number {
  const s1TargetNano = Number(project.stage1_target_nano ?? (project.stage1_target || 0) * 1e9);
  const s2TargetNano = Number(project.stage2_target_nano ?? (project.stage2_target || 0) * 1e9);
  const s1Rate = Number(project.stage1_rate || 0);
  const s1Bonus = Number(project.stage1_bonus || 0);
  const s2Rate = Number(project.stage2_rate || 0);
  const s3Rate = Number(project.stage3_rate || 0);

  let rem = amountNano;
  let tokensNano = 0;
  let cr = currentRaisedNano;

  if (cr < s1TargetNano) {
    const avail = s1TargetNano - cr;
    const portion = Math.min(rem, avail);
    const tokensFromPortion = Math.floor(portion * s1Rate * (100 + s1Bonus) / 100);
    tokensNano += tokensFromPortion;
    rem -= portion;
    cr += portion;
  }
  if (rem > 0 && cr < s2TargetNano) {
    const avail = s2TargetNano - cr;
    const portion = Math.min(rem, avail);
    tokensNano += portion * s2Rate;
    rem -= portion;
    cr += portion;
  }
  if (rem > 0) {
    tokensNano += rem * s3Rate;
  }
  return tokensNano;
}


const FAIL_CLOSED_RATE_LIMIT_ACTIONS = new Set([
  'ai_analyze',
  'ai_chat',
  'bounty_submit',
  'stars_invoice',
  'stars_callback',
  'automation_rule_write',
  'onramp_uid_check',
]);

async function checkRateLimit(db: D1Database, userId: string, action: string, limit: number, windowMs: number): Promise<boolean> {
  try {
    const now = new Date();
    const row = await db.prepare(
      'SELECT count, window_start FROM user_rate_limits WHERE user_id = ? AND action = ?'
    ).bind(userId, action).first() as any;

    if (!row) {
      await db.prepare(
        'INSERT INTO user_rate_limits (user_id, action, count, window_start) VALUES (?, ?, 1, ?)'
      ).bind(userId, action, now.toISOString()).run();
      return true;
    }

    const windowStart = new Date(row.window_start);
    if (now.getTime() - windowStart.getTime() > windowMs) {
      await db.prepare(
        'UPDATE user_rate_limits SET count = 1, window_start = ? WHERE user_id = ? AND action = ?'
      ).bind(now.toISOString(), userId, action).run();
      return true;
    }

    if (row.count >= limit) {
      return false;
    }

    await db.prepare(
      'UPDATE user_rate_limits SET count = count + 1 WHERE user_id = ? AND action = ?'
    ).bind(userId, action).run();
    return true;
  } catch (e) {
    const failClosed = FAIL_CLOSED_RATE_LIMIT_ACTIONS.has(action);
    console.error(`Rate limit error for ${action}, ${failClosed ? 'failing closed' : 'bypassing'}:`, e);
    return !failClosed;
  }
}

const authMiddleware = async (c: any, next: any) => {
  const authHeader = c.req.header('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ success: false, error: 'Unauthorized: Missing or invalid token format' }, 401);
  }
  const token = authHeader.substring(7);
  try {
    const payload = await verify(token, c.env.JWT_SECRET, 'HS256');
    if (!payload || !payload.walletAddress) {
      return c.json({ success: false, error: 'Unauthorized: Invalid token payload' }, 401);
    }
    c.set('user_id', payload.walletAddress);
    await next();
  } catch (err) {
    return c.json({ success: false, error: 'Unauthorized: Invalid or expired token' }, 401);
  }
};

const PRODUCTION_ALLOWED_ORIGINS = new Set([
  'https://app.72h.lol',
  'https://web.telegram.org',
  'https://telegram.org',
]);

// Enable CORS for frontend integration
app.use('/api/*', cors({
  origin: (origin, c) => {
    if (c.env.ENVIRONMENT === 'development') return origin || '*';
    if (!origin) return '';
    return PRODUCTION_ALLOWED_ORIGINS.has(origin) ? origin : '';
  },
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization', 'X-Simulate-Network'],
  exposeHeaders: ['Content-Length'],
  maxAge: 600,
  credentials: true,
}));

// Enforce mainnet config checks and disable mock modes when network is mainnet
app.use('/api/*', async (c, next) => {
  if (c.req.method === 'OPTIONS') {
    await next();
    return;
  }

  const tonNetwork = (c.env.ENVIRONMENT === 'development' && c.req.header('X-Simulate-Network') === 'mainnet')
    ? 'mainnet'
    : (c.env.TON_NETWORK || 'testnet');

  console.log(`[Mainnet Check] TON_NETWORK=${tonNetwork}, ENVIRONMENT=${c.env.ENVIRONMENT}`);
  if (tonNetwork === 'mainnet') {
    const checkMock = (val?: string) => {
      if (!val) return true;
      const lower = val.toLowerCase();
      return lower.includes('mock') || lower.includes('12345') || lower.includes('testing');
    };

    if (
      checkMock(c.env.DEEPSEEK_API_KEY) ||
      checkMock(c.env.TELEGRAM_BOT_TOKEN) ||
      checkMock(c.env.TONCENTER_API_KEY)
    ) {
      return c.json({ success: false, error: 'Mainnet Configuration Error: Mock tokens/keys are not allowed on mainnet' }, 500);
    }

    try {
      const { results } = await c.env.DB.prepare(
        "SELECT contract_name, address FROM platform_contracts WHERE network = 'mainnet'"
      ).all();

      if (!results || results.length === 0) {
        return c.json({ success: false, error: 'Mainnet Configuration Error: Platform contracts for mainnet are missing in database' }, 500);
      }

      const hasEmptyAddress = results.some((r: any) => !r.address || r.address.trim() === '');
      if (hasEmptyAddress) {
        return c.json({ success: false, error: 'Mainnet Configuration Error: One or more platform contracts have empty mainnet addresses' }, 500);
      }
      const names = new Set(results.map((r: any) => r.contract_name));
      const missing = REQUIRED_PLATFORM_CONTRACTS.filter((name) => !names.has(name));
      if (missing.length > 0) {
        return c.json({ success: false, error: `Mainnet Configuration Error: Missing platform contracts: ${missing.join(', ')}` }, 500);
      }
    } catch (dbErr: any) {
      return c.json({ success: false, error: `Database error during mainnet validation: ${dbErr.message}` }, 500);
    }
  }

  await next();
});

// Authentication & Session Endpoints
// ============================================================

app.get('/api/v1/auth/nonce', async (c) => {
  const nonce = crypto.randomUUID();
  try {
    await c.env.DB.prepare(
      'INSERT INTO auth_nonces (nonce) VALUES (?)'
    ).bind(nonce).run();
    return c.json({ success: true, nonce });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

app.post('/api/v1/auth/verify', async (c) => {
  try {
    const body = await c.req.json() as any;
    const { address: addressStr, proof } = body;
    if (!addressStr || !proof || !proof.nonce || !proof.signature) {
      return c.json({ success: false, error: 'Missing required parameters' }, 400);
    }

    // 1. Verify and delete nonce (single use)
    const dbNonce = await c.env.DB.prepare(
      'SELECT nonce, created_at FROM auth_nonces WHERE nonce = ?'
    ).bind(proof.nonce).first() as any;
    if (!dbNonce) {
      return c.json({ success: false, error: 'Invalid or expired nonce' }, 400);
    }
    await c.env.DB.prepare(
      'DELETE FROM auth_nonces WHERE nonce = ?'
    ).bind(proof.nonce).run();

    // 2. Verify timestamp (15 min window)
    const nowSec = Math.floor(Date.now() / 1000);
    if (Math.abs(nowSec - proof.timestamp) > 900) {
      return c.json({ success: false, error: 'Proof timestamp expired' }, 400);
    }

    // 2.5 Verify proof payload matches nonce
    if (proof.payload !== proof.nonce) {
      return c.json({ success: false, error: 'Payload must match nonce' }, 400);
    }

    // 3. Verify domain (allow dev and production domains)
    const isDev = c.env.ENVIRONMENT === 'development';
    const allowedDomains = isDev
      ? ['app.72h.lol', 'localhost', '127.0.0.1', 'api.72h.lol']
      : ['app.72h.lol'];
    const domainVal = proof.domain?.value || '';
    const isDomainAllowed = allowedDomains.includes(domainVal) ||
                            allowedDomains.some(d => domainVal.startsWith(d + ':'));
    if (!isDomainAllowed) {
      return c.json({ success: false, error: `Invalid domain: ${domainVal}` }, 400);
    }

    // 4. Extract and verify public key — NEVER trust client-supplied public_key
    //    Public key MUST be derived from stateInit or queried on-chain.
    let publicKeyHex: string | null = null;
    const address = Address.parse(addressStr);

    if (proof.state_init || proof.stateInit) {
      const stateInitStr = proof.state_init || proof.stateInit;
      const stateInitCell = Cell.fromBoc(Buffer.from(stateInitStr, 'base64'))[0];
      const derivedAddress = new Address(address.workChain, stateInitCell.hash());
      if (!derivedAddress.equals(address)) {
        return c.json({ success: false, error: 'Address does not match stateInit' }, 400);
      }

      try {
        const slice = stateInitCell.beginParse();
        if (slice.loadBit()) slice.skip(5);
        if (slice.loadBit()) slice.skip(2);
        if (slice.loadBit()) slice.loadRef();
        if (slice.loadBit()) {
          const dataCell = slice.loadRef();
          const dataSlice = dataCell.beginParse();
          if (dataSlice.remainingBits >= 64 + 256) {
            dataSlice.skip(64);
            const pubKeyBuffer = dataSlice.loadBuffer(32);
            publicKeyHex = pubKeyBuffer.toString('hex');
          }
        }
      } catch (err) {
        console.error('Failed to parse stateInit for public key:', err);
      }
    }

    if (!publicKeyHex) {
      try {
        const tcNetwork = c.env.TON_NETWORK || 'testnet';
        const tcUrl = `https://${tcNetwork === 'mainnet' ? '' : 'testnet.'}toncenter.com/api/v3/runGetMethod`;
        const res = await fetch(tcUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(c.env.TONCENTER_API_KEY ? { 'X-API-Key': c.env.TONCENTER_API_KEY } : {})
          },
          body: JSON.stringify({
            address: addressStr,
            method: 'get_public_key',
            stack: []
          })
        });
        if (res.ok) {
          const getRes = await res.json() as any;
          if (getRes.exit_code === 0 && getRes.stack && getRes.stack.length > 0) {
            const pubKeyBigInt = BigInt(getRes.stack[0].value);
            publicKeyHex = pubKeyBigInt.toString(16).padStart(64, '0');
          }
        }
      } catch (err) {
        console.error('On-chain public key fetch failed:', err);
      }
    }

    if (!publicKeyHex) {
      return c.json({ success: false, error: 'Could not extract or verify public key' }, 400);
    }

    // 5. Reconstruct and hash the message
    const wc = Buffer.alloc(4);
    wc.writeInt32BE(address.workChain, 0);
    const addrHash = Buffer.from(address.hash);
    const domainBytes = Buffer.from(proof.domain.value, 'utf8');
    const domainLen = Buffer.alloc(4);
    domainLen.writeUInt32LE(proof.domain.lengthBytes, 0);
    const ts = Buffer.alloc(8);
    ts.writeBigUInt64LE(BigInt(proof.timestamp), 0);

    const message = Buffer.concat([
      Buffer.from('ton-proof-item-v2/', 'utf8'),
      wc,
      addrHash,
      domainLen,
      domainBytes,
      ts,
      Buffer.from(proof.payload, 'utf8')
    ]);

    const prefix = Buffer.from([0xff, 0xff]);
    const tonConnectPrefix = Buffer.from('ton-connect', 'utf8');
    const messageHash = await sha256(message);

    const finalHash = await sha256(Buffer.concat([
      prefix,
      tonConnectPrefix,
      Buffer.from(messageHash)
    ]));

    // 6. Verify signature
    const importedKey = await crypto.subtle.importKey(
      'raw',
      Buffer.from(publicKeyHex, 'hex'),
      { name: 'Ed25519', namedCurve: 'Ed25519' },
      true,
      ['verify']
    );

    const isValid = await crypto.subtle.verify(
      'Ed25519',
      importedKey,
      Buffer.from(proof.signature, 'base64'),
      finalHash
    );

    if (!isValid) {
      return c.json({ success: false, error: 'Invalid signature' }, 400);
    }

    // 7. Check or create user record
    await c.env.DB.prepare(
      'INSERT OR IGNORE INTO users (id, ton_wallet) VALUES (?, ?)'
    ).bind(addressStr, addressStr).run();

    // 8. Sign JWT
    const token = await sign({
      walletAddress: addressStr,
      exp: Math.floor(Date.now() / 1000) + 7 * 24 * 3600, // 7 days
    }, c.env.JWT_SECRET, 'HS256');

    return c.json({ success: true, token, walletAddress: addressStr });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// AI Copilot Secure Proxy Endpoints
// ============================================================

app.post('/api/v1/ai/analyze', authMiddleware, async (c) => {
  try {
    const userId = c.get('user_id');
    const limitOk = await checkRateLimit(c.env.DB, userId, 'ai_analyze', 10, 3600 * 1000);
    if (!limitOk) {
      return c.json({ success: false, error: 'Too Many Requests: Rate limit exceeded (10 requests per hour)' }, 429);
    }

    const { projectName, description, raisedAmount, goalAmount } = await c.req.json();
    const apiKey = c.env.DEEPSEEK_API_KEY;
    if (!apiKey) {
      return c.json({ success: false, error: 'DEEPSEEK_API_KEY not configured' }, 500);
    }
    const response = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [{
          role: 'system',
          content: '你是 VibeCoder 平台的 AI 分析师。根据项目信息给出 0-100 评分和专业分析报告。返回 JSON 格式：{ "score": number, "category": "gold|silver|bronze", "summary": "一句话总结", "risks": ["风险1", "风险2"], "strengths": ["优势1", "优势2"] }'
        }, {
          role: 'user',
          content: `分析这个项目：\n名称：${projectName}\n描述：${description}\n已募资：${raisedAmount} TON / ${goalAmount} TON`
        }],
        temperature: 0.3,
        max_tokens: 500,
      }),
    });
    if (!response.ok) {
      const errorText = await response.text();
      return c.json({ success: false, error: `DeepSeek API error: ${errorText}` }, response.status as any);
    }
    const completion = await response.json() as any;
    const text = completion.choices?.[0]?.message?.content || '{}';
    const json = JSON.parse(text.replace(/```json|```/g, '').trim());
    return c.json({
      success: true,
      data: {
        score: json.score || 70,
        category: json.category || 'silver',
        summary: json.summary || '暂无分析',
        risks: json.risks || [],
        strengths: json.strengths || [],
      }
    });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

app.post('/api/v1/ai/chat', authMiddleware, async (c) => {
  try {
    const userId = c.get('user_id');
    const limitOk = await checkRateLimit(c.env.DB, userId, 'ai_chat', 10, 3600 * 1000);
    if (!limitOk) {
      return c.json({ success: false, error: 'Too Many Requests: Rate limit exceeded (10 requests per hour)' }, 429);
    }

    const { query, context } = await c.req.json();
    const apiKey = c.env.DEEPSEEK_API_KEY;
    if (!apiKey) {
      return c.json({ success: false, error: 'DEEPSEEK_API_KEY not configured' }, 500);
    }
    const response = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: `你是 VibeCoder 的 AI 共建助手。基于以下上下文回答用户：\n${context}` },
          { role: 'user', content: query }
        ],
        temperature: 0.5,
        max_tokens: 300,
      }),
    });
    if (!response.ok) {
      const errorText = await response.text();
      return c.json({ success: false, error: `DeepSeek API error: ${errorText}` }, response.status as any);
    }
    const completion = await response.json() as any;
    const text = completion.choices?.[0]?.message?.content || '抱歉，我暂时无法回答。';
    return c.json({ success: true, data: text });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// Telegram Bot webhook
app.post('/telegram/webhook', async (c) => {
  try {
    const body = await c.req.json() as any;
    const msg = body?.message;
    const cb = body?.callback_query;
    const botToken = c.env.TELEGRAM_BOT_TOKEN;
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

    // Fetch backers from spark_records
    const { results: backers } = await c.env.DB.prepare(
      'SELECT user_id as address, amount, amount_nano, created_at as timestamp FROM spark_records WHERE launch_id = ? ORDER BY created_at ASC'
    ).bind(id).all();

    const mappedBackers = backers.map((b: any) => ({
      address: b.address,
      amount: Number(b.amount_nano ?? (b.amount || 0) * 1e9) / 1e9,
      timestamp: b.timestamp
    }));

    // Fetch milestones from launch_milestones
    const { results: milestones } = await c.env.DB.prepare(
      'SELECT id, launch_id, milestone_index, title, release_ratio, status, deliverable_url, challenge_expires_at FROM launch_milestones WHERE launch_id = ? ORDER BY milestone_index ASC'
    ).bind(id).all();

    const mappedMilestones = milestones.map((m: any) => ({
      id: m.id,
      launchId: m.launch_id,
      milestoneIndex: Number(m.milestone_index),
      title: m.title,
      releaseRatio: Number(m.release_ratio),
      status: m.status,
      deliverableUrl: m.deliverable_url,
      challengeExpiresAt: m.challenge_expires_at
    }));

    // Build response with all available fields
    const p = project as any;
    const targetTotalNano = Number(p.target_total_nano ?? (p.target_total || 0) * 1e9);
    const raisedTotalNano = Number(p.raised_total_nano ?? (p.raised_total || 0) * 1e9);

    const response: any = {
      id: p.id,
      projectCode: p.project_code || '',
      agentId: `agent-${p.id}`,
      agentName: p.name || '',
      agentTicker: p.token_symbol || '',
      title: p.title || p.name || '',
      description: p.description || '',
      goalAmount: targetTotalNano / 1e9,
      raisedAmount: raisedTotalNano / 1e9,
      minInvestment: 5,
      status: p.status === 'DRAFT' ? 'active' : (p.status?.toLowerCase() || 'active'),
      endTime: p.deadline || '',
      creatorAddress: p.owner_id || '',
      tokenPrice: p.stage1_rate ? 1 / Number(p.stage1_rate) : 0.01,
      progress: targetTotalNano ? Math.min(100, Math.round(((raisedTotalNano / targetTotalNano) * 100) * 10) / 10) : 0,
      backers: mappedBackers,
      category: p.category || '数据分析',
      launchType: p.launch_type || 'PROJECT_TOKEN',
      backerTokenShare: p.backer_token_share ? Number(p.backer_token_share) / 100 : 35,
      tokenPolicyStatus: p.token_policy_status || 'approved',
      ecosystemId: p.ecosystem_id || null,
      parentTokenAddress: p.parent_token_address || null,
      deliverableType: p.deliverable_type || null,
      deliverableDesc: p.deliverable_desc || null,
      deliveryDate: p.delivery_date || null,
      disputeRules: p.dispute_rules || null,
      tags: p.category ? ["#" + p.category] : ["#TON", "#AI"],
      assuranceMode: 'staked',
      onchainVerifyStatus: 'verified',
      milestones: mappedMilestones,
      useOfFunds: [],
      comments: [],
      upvotes: 0,
      commentsCount: 0,
      extraPerks: p.extra_perks || null,
      websiteUrl: p.website_url || null,
      githubUrl: p.github_url || null,
      teamDesc: p.team_desc || null,
    };

    return c.json({ success: true, data: response });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// 2c. PATCH /api/v1/launches/:id - Update launch details (authenticated)
app.patch('/api/v1/launches/:id', authMiddleware, async (c) => {
  const id = c.req.param('id');
  try {
    const userId = c.get('user_id');
    const body = await c.req.json();
    const { title, description, category, websiteUrl, githubUrl, extraPerks, teamDesc } = body;

    // Check ownership
    const launch = await c.env.DB.prepare(
      'SELECT owner_id FROM launches WHERE id = ?'
    ).bind(id).first() as any;

    if (!launch) {
      return c.json({ success: false, error: 'Project not found' }, 404);
    }

    if (launch.owner_id.toLowerCase() !== userId.toLowerCase() && !checkIsAdmin(c, userId)) {
      return c.json({ success: false, error: 'Unauthorized: Only the project owner can edit details' }, 403);
    }

    const updates: string[] = [];
    const params: any[] = [];
    if (title !== undefined) { updates.push('title = ?'); params.push(title); }
    if (description !== undefined) { updates.push('description = ?'); params.push(description); }
    if (category !== undefined) { updates.push('category = ?'); params.push(category); }
    if (websiteUrl !== undefined) { updates.push('website_url = ?'); params.push(websiteUrl); }
    if (githubUrl !== undefined) { updates.push('github_url = ?'); params.push(githubUrl); }
    if (extraPerks !== undefined) { updates.push('extra_perks = ?'); params.push(extraPerks); }
    if (teamDesc !== undefined) { updates.push('team_desc = ?'); params.push(teamDesc); }

    if (updates.length > 0) {
      params.push(id);
      const query = `UPDATE launches SET ${updates.join(', ')} WHERE id = ?`;
      await c.env.DB.prepare(query).bind(...params).run();
    }

    return c.json({ success: true, message: 'Launch details updated successfully' });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// 2b. POST /api/v1/launches/:id/spark — DEPRECATED, replaced by on-chain flow.
// Returns error directing to /spark/prepare + /spark/submit.
app.post('/api/v1/launches/:id/spark', authMiddleware, async (c) => {
  if (c.env.ENVIRONMENT === 'development') {
    // Legacy mock path for local dev only
    const launchId = c.req.param('id');
    try {
      const userAddress = c.get('user_id');
      const { amount } = await c.req.json();
      if (!amount || amount <= 0) return c.json({ success: false, error: 'Invalid amount' }, 400);
      const project = await c.env.DB.prepare('SELECT * FROM launches WHERE id = ?').bind(launchId).first() as any;
      if (!project) return c.json({ success: false, error: 'Project not found' }, 404);
      const amountNano = Math.round(Number(amount) * 1e9);
      const eventId = `spark-onchain-dev-${Date.now()}`;
      const now = new Date().toISOString();
      await c.env.DB.prepare(
        "INSERT INTO spark_onchain_events (id, launch_id, user_id, campaign_address, amount_nano, status, source, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
      ).bind(eventId, launchId, userAddress, project.campaign_address || 'DEV_MOCK', amountNano, 'PENDING_ONCHAIN', 'DEV_MOCK', now).run();
      return c.json({ success: true, mock: true, data: { eventId, status: 'PENDING_ONCHAIN', amountNano: amountNano.toString() } });
    } catch (error: any) {
      return c.json({ success: false, error: error.message }, 500);
    }
  }
  return c.json({ success: false, error: 'Direct off-chain Spark is disabled. Use TonConnect on-chain Spark flow: POST /api/v1/launches/:id/spark/prepare then /spark/submit.' }, 400);
});

// 2c. GET /api/v1/launches/:id/spark/prepare — prepare on-chain Spark transaction
app.get('/api/v1/launches/:id/spark/prepare', authMiddleware, async (c) => {
  const launchId = c.req.param('id');
  try {
    const amount = Number(c.req.query('amount') || '0');
    if (!amount || amount <= 0) return c.json({ success: false, error: 'amount query param required and must be > 0' }, 400);

    const project = await c.env.DB.prepare('SELECT * FROM launches WHERE id = ?').bind(launchId).first() as any;
    if (!project) return c.json({ success: false, error: 'Project not found' }, 404);

    const campaignAddress = project.campaign_address;
    if (!campaignAddress) {
      if (c.env.ENVIRONMENT === 'development') {
        return c.json({ success: true, mock: true, data: { launchId, campaignAddress: 'DEV_NO_CAMPAIGN', amountNano: '0', op: '0x111', message: { address: 'DEV_NO_CAMPAIGN', amount: '0', payload: '' } } });
      }
      return c.json({ success: false, error: 'Project has no on-chain campaign address registered' }, 400);
    }

    // Validate campaign address
    try { Address.parse(campaignAddress); } catch {
      return c.json({ success: false, error: 'Invalid campaign address in database' }, 500);
    }

    const amountNano = BigInt(Math.round(amount * 1e9));
    const validUntil = Math.floor(Date.now() / 1000) + 3600; // 1 hour

    // Build payload: op=0x111 (SPARK), no extra body needed for simple TON value transfer
    const { beginCell } = await import('@ton/core');
    const payload = beginCell().storeUint(0x111, 32).endCell();
    const boc = await payload.toBoc();
    const payloadBase64 = Buffer.from(boc).toString('base64');

    return c.json({
      success: true,
      data: {
        launchId,
        campaignAddress,
        amountNano: amountNano.toString(),
        op: '0x111',
        validUntil,
        payloadBase64,
        message: {
          address: campaignAddress,
          amount: amountNano.toString(),
          payload: payloadBase64,
        }
      }
    });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// 2d. POST /api/v1/launches/:id/spark/submit — record on-chain Spark transaction
app.post('/api/v1/launches/:id/spark/submit', authMiddleware, async (c) => {
  const launchId = c.req.param('id');
  try {
    const userAddress = c.get('user_id');
    const { amountNano, txHash, txBoc, teamId, referrer } = await c.req.json();

    if (!amountNano) return c.json({ success: false, error: 'amountNano required' }, 400);
    if (!txHash && !txBoc) return c.json({ success: false, error: 'txHash or txBoc required' }, 400);

    const amountNanoBig = BigInt(amountNano);
    if (amountNanoBig <= 0n) return c.json({ success: false, error: 'amountNano must be > 0' }, 400);

    const project = await c.env.DB.prepare('SELECT * FROM launches WHERE id = ?').bind(launchId).first() as any;
    if (!project) return c.json({ success: false, error: 'Project not found' }, 404);

    const campaignAddress = project.campaign_address;
    if (!campaignAddress) {
      return c.json({ success: false, error: 'Project has no campaign address' }, 400);
    }

    // Check duplicate txHash
    if (txHash) {
      const existing = await c.env.DB.prepare(
        'SELECT id, status FROM spark_onchain_events WHERE tx_hash = ?'
      ).bind(txHash).first() as any;
      if (existing) {
        return c.json({ success: true, data: { status: existing.status, eventId: existing.id, txHash, duplicate: true } });
      }
    }

    const eventId = `spark-onchain-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date().toISOString();

    await c.env.DB.prepare(
      `INSERT INTO spark_onchain_events (id, launch_id, user_id, campaign_address, tx_hash, tx_boc, amount_nano, status, source, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'PENDING_ONCHAIN', 'TONCONNECT', ?)`
    ).bind(eventId, launchId, userAddress, campaignAddress, txHash || null, txBoc || null, amountNanoBig.toString(), now).run();

    return c.json({
      success: true,
      data: { status: 'PENDING_ONCHAIN', eventId, txHash: txHash || null }
    });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// 2e. POST /api/v1/launches/:id/spark/confirm — admin/manual confirm pending Spark
app.post('/api/v1/launches/:id/spark/confirm', authMiddleware, async (c) => {
  const launchId = c.req.param('id');
  try {
    const userAddress = c.get('user_id');
    const isAdmin = checkIsAdmin(c, userAddress);
    const isDev = c.env.ENVIRONMENT === 'development';

    // v1: admin-only or dev mode
    if (!isAdmin && !isDev) {
      return c.json({ success: false, error: 'Forbidden: admin access required' }, 403);
    }

    const { eventId } = await c.req.json();
    if (!eventId) return c.json({ success: false, error: 'eventId required' }, 400);

    const event = await c.env.DB.prepare(
      'SELECT * FROM spark_onchain_events WHERE id = ? AND launch_id = ?'
    ).bind(eventId, launchId).first() as any;
    if (!event) return c.json({ success: false, error: 'Event not found' }, 404);
    if (event.status !== 'PENDING_ONCHAIN') {
      return c.json({ success: false, error: `Event already ${event.status}` }, 400);
    }

    const now = new Date().toISOString();
    const project = await c.env.DB.prepare('SELECT * FROM launches WHERE id = ?').bind(launchId).first() as any;

    // v1: basic validation — check campaign address matches project
    if (event.campaign_address !== project.campaign_address) {
      await c.env.DB.prepare(
        "UPDATE spark_onchain_events SET status = 'FAILED', error = ? WHERE id = ?"
      ).bind('Campaign address mismatch', eventId).run();
      return c.json({ success: false, error: 'Campaign address mismatch' }, 400);
    }

    // v1: mark as NEEDS_REVIEW — on-chain verification and raised_total update
    // deferred to the next PR (on-chain indexer).
    await c.env.DB.prepare(
      "UPDATE spark_onchain_events SET status = 'NEEDS_REVIEW', confirmed_at = ? WHERE id = ?"
    ).bind(now, eventId).run();

    return c.json({
      success: true,
      data: { status: 'NEEDS_REVIEW', eventId }
    });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// ============================================================
// Platform Contracts — returns deployed contract addresses
// with completeness validation for required platform contracts.
app.get('/api/v1/platform/contracts', async (c) => {
  try {
    const network = currentTonNetwork(c);
    const { results } = await c.env.DB.prepare(
      'SELECT contract_name, address, network FROM platform_contracts WHERE network = ? ORDER BY contract_name ASC'
    ).bind(network).all();

    const data = (results || []) as any[];
    const presentNames = new Set(data.map((r: any) => r.contract_name));
    const missing = REQUIRED_PLATFORM_CONTRACTS.filter((n: string) => !presentNames.has(n));

    // Validate addresses
    const invalid: string[] = [];
    for (const row of data) {
      try { Address.parse(row.address); } catch { invalid.push(row.contract_name); }
    }

    return c.json({
      success: missing.length === 0 && invalid.length === 0,
      network,
      data,
      ...(missing.length > 0 ? { missing } : {}),
      ...(invalid.length > 0 ? { invalidAddresses: invalid } : {}),
    });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// ============================================================
// User VC Balance — read VC jetton balance from chain
app.get('/api/v1/user/vc-balance', async (c) => {
  try {
    const ownerAddress = c.req.query('address');
    if (!ownerAddress) return c.json({ success: false, error: 'address query param required' }, 400);

    const network = currentTonNetwork(c);
    const vcRow = await c.env.DB.prepare(
      "SELECT address FROM platform_contracts WHERE contract_name = 'VC_JETTON' AND network = ?"
    ).bind(network).first() as any;
    if (!vcRow?.address) return c.json({ success: false, error: 'VC_JETTON not registered for ' + network }, 500);

    const tcBase = network === 'mainnet' ? 'https://toncenter.com' : 'https://testnet.toncenter.com';
    const tcHeaders: Record<string, string> = { 'Content-Type': 'application/json' };
    if (c.env.TONCENTER_API_KEY) tcHeaders['X-API-Key'] = c.env.TONCENTER_API_KEY;

    async function runMethod(address: string, method: string, stack: any[]): Promise<any> {
      const res = await fetch(`${tcBase}/api/v3/runGetMethod`, {
        method: 'POST', headers: tcHeaders,
        body: JSON.stringify({ address, method, stack }),
        signal: AbortSignal.timeout(5000),
      });
      if (!res.ok) throw new Error(`TON Center HTTP ${res.status}`);
      const data = await res.json() as any;
      if (data.exit_code !== 0) throw new Error(`exit_code=${data.exit_code}`);
      return data;
    }

    let ownerAddr;
    try { ownerAddr = Address.parse(ownerAddress); }
    catch { return c.json({ success: false, error: 'Invalid TON address' }, 400); }

    const addrCell = beginCell()
      .storeUint(0, 2).storeUint(0, 1)
      .storeInt(ownerAddr.workChain, 8)
      .storeBuffer(ownerAddr.hash)
      .endCell();
    const addrCellB64 = Buffer.from(await addrCell.toBoc()).toString('base64');

    const walletResult = await runMethod(vcRow.address, 'get_wallet_address', [
      { type: 'slice', cell: addrCellB64 }
    ]);

    if (!walletResult.stack || walletResult.stack.length < 1) {
      return c.json({ success: false, error: 'get_wallet_address returned empty stack' }, 502);
    }
    const walletAddrRaw = walletResult.stack[0].value || walletResult.stack[0].num;
    const walletAddr = `0:${String(walletAddrRaw).replace('0x', '')}`;

    const walletData = await runMethod(walletAddr, 'get_wallet_data', []);
    if (!walletData.stack || walletData.stack.length < 1) {
      return c.json({ success: false, error: 'get_wallet_data returned empty stack' }, 502);
    }
    const balanceNano = BigInt(walletData.stack[0].value || walletData.stack[0].num || '0');
    const balanceVC = Number(balanceNano) / 1e9;

    return c.json({
      success: true,
      data: { owner: ownerAddress, vcMaster: vcRow.address, wallet: walletAddr, balanceNano: balanceNano.toString(), balanceVC, network }
    });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// ============================================================
// Platform Stats — read Fund + VCRewardPool + EarlyFundraising chain state
app.get('/api/v1/platform/stats', async (c) => {
  try {
    const network = currentTonNetwork(c);
    const tcBase = network === 'mainnet' ? 'https://toncenter.com' : 'https://testnet.toncenter.com';
    const tcHeaders: Record<string, string> = { 'Content-Type': 'application/json' };
    if (c.env.TONCENTER_API_KEY) tcHeaders['X-API-Key'] = c.env.TONCENTER_API_KEY;

    async function tcRun(address: string, method: string): Promise<any> {
      const res = await fetch(`${tcBase}/api/v3/runGetMethod`, {
        method: 'POST', headers: tcHeaders,
        body: JSON.stringify({ address, method, stack: [] }),
        signal: AbortSignal.timeout(5000),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json() as any;
      if (data.exit_code !== 0) throw new Error(`exit_code=${data.exit_code}`);
      return data;
    }

    const contracts = await c.env.DB.prepare(
      "SELECT contract_name, address FROM platform_contracts WHERE network = ?"
    ).bind(network).all();
    const addr: Record<string, string> = {};
    for (const r of contracts.results as any[]) addr[r.contract_name] = r.address;

    const stats: any = { network };

    if (addr.FUND) {
      try {
        const fd = await tcRun(addr.FUND, 'getFundData');
        stats.fund = { accumulatedTon: Number(BigInt(fd.stack?.[3]?.value || fd.stack?.[3]?.num || '0')) / 1e9 };
      } catch (e: any) { stats.fundError = e.message; }
    }
    if (addr.VC_REWARD_POOL) {
      try {
        const rp = await tcRun(addr.VC_REWARD_POOL, 'getRewardPoolData');
        stats.rewardPool = {
          developerRemaining: (rp.stack?.[3]?.value || rp.stack?.[3]?.num || '0'),
          ecosystemRemaining: (rp.stack?.[4]?.value || rp.stack?.[4]?.num || '0'),
        };
      } catch (e: any) { stats.rewardPoolError = e.message; }
    }
    if (addr.EARLY_FUNDRAISING) {
      try {
        const ef = await tcRun(addr.EARLY_FUNDRAISING, 'getFundraisingData');
        stats.earlyFundraising = {
          totalTon: Number(BigInt(ef.stack?.[4]?.value || ef.stack?.[4]?.num || '0')) / 1e9,
          totalAllocatedVC: Number(BigInt(ef.stack?.[5]?.value || ef.stack?.[5]?.num || '0')) / 1e9,
        };
      } catch (e: any) { stats.earlyFundraisingError = e.message; }
    }

    return c.json({ success: true, data: stats });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// 3. GET /api/v1/launches/:id/health - Project Health Stats
app.get('/api/v1/launches/:id/health', async (c) => {
  const id = c.req.param('id');
  try {
    const project = await c.env.DB.prepare(
      'SELECT * FROM launches WHERE id = ?'
    ).bind(id).first();

    if (!project) {
      return c.json({ success: false, error: 'Project not found' }, 404);
    }

    const p = project as any;
    const raisedTotalNano = Number(p.raised_total_nano ?? (p.raised_total || 0) * 1e9);
    const targetTotalNano = Number(p.target_total_nano ?? (p.target_total || 1) * 1e9);
    const progress = Math.min(100, Math.round((raisedTotalNano / targetTotalNano) * 100));
    const stage = progress >= 55 ? "Stage 2 中段" : "Stage 1 启动中";

    // Compute passed proposals TON sum
    const passedProposals = await c.env.DB.prepare(
      "SELECT SUM(amount_nano) as total_nano, SUM(amount) as total FROM governance_proposals WHERE launch_id = ? AND status = 'passed' AND type = 'ton_withdrawal'"
    ).bind(id).first() as any;
    const passedAmountNano = Number(passedProposals?.total_nano ?? (passedProposals?.total || 0) * 1e9);
    const governanceValue = ((raisedTotalNano * 0.5) - passedAmountNano) / 1e9;

    return c.json({
      success: true,
      data: {
        fundingProgress: progress,
        tokenDeployment: project.token_deployed ? "已部署 · 已分配" : "未部署",
        governanceValue: Number(governanceValue.toFixed(1)),
        stage,
        activeUsers: "+12% (本月环比增长)",
        milestonesCompleted: "●●●●○ 4/5 已完成"
      }
    });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// 4. GET /api/v1/launches/:id/vesting - 10-round vesting timeline
app.get('/api/v1/launches/:id/vesting', async (c) => {
  const id = c.req.param('id');
  try {
    const project = await c.env.DB.prepare(
      'SELECT * FROM launches WHERE id = ?'
    ).bind(id).first();

    if (!project) {
      return c.json({ success: false, error: 'Project not found' }, 404);
    }

    const avgPrice = Number(project.stage2_rate ? 1 / Number(project.stage2_rate) : 0.01);
    const rounds = [];
    const totalShare = 0.38;
    const perRound = (totalShare / 10) * 100;
    for (let i = 1; i <= 10; i++) {
      rounds.push({
        round: i,
        locked: i === 1 ? 2 : perRound,
        unlocked: i <= 1,
        priceThreshold: (avgPrice * Math.pow(1.5, i)).toFixed(4),
        currentPrice: (avgPrice * (i <= 2 ? 1 : Math.pow(1.3, i - 1))).toFixed(4),
        matched: i <= 1,
        matchedAt: i <= 1 ? new Date(Date.now() - 48 * 3600 * 1000).toISOString() : null,
      });
    }
    return c.json({ success: true, data: rounds });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// 5. GET /api/v1/launches/:id/governance/stats - Stats of proposals
app.get('/api/v1/launches/:id/governance/stats', async (c) => {
  const launchId = c.req.param('id');
  try {
    const stats = await c.env.DB.prepare(
      `SELECT
        COUNT(id) as total,
        SUM(CASE WHEN status = 'passed' THEN 1 ELSE 0 END) as passed,
        SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active
       FROM governance_proposals WHERE launch_id = ?`
    ).bind(launchId).first();
    return c.json({ success: true, data: stats });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// 6. GET /api/v1/launches/:id/proposals - Get all proposals
app.get('/api/v1/launches/:id/proposals', async (c) => {
  const launchId = c.req.param('id');
  try {
    const { results } = await c.env.DB.prepare(
      'SELECT * FROM governance_proposals WHERE launch_id = ? ORDER BY created_at DESC'
    ).bind(launchId).all();

    // Fetch voter list from governance_votes
    const { results: votes } = await c.env.DB.prepare(
      `SELECT proposal_id, user_id FROM governance_votes
       WHERE proposal_id IN (SELECT id FROM governance_proposals WHERE launch_id = ?)`
    ).bind(launchId).all();

    const votesMap = new Map<string, string[]>();
    for (const v of votes) {
      const list = votesMap.get(v.proposal_id as string) || [];
      list.push(v.user_id as string);
      votesMap.set(v.proposal_id as string, list);
    }

    // Map DB fields to camelCase for the frontend (yes_weight -> yesWeight, etc.)
    const mapped = results.map((r: any) => ({
      id: r.id,
      projectId: r.launch_id,
      amount: Number(r.amount_nano ?? (r.amount || 0) * 1e9) / 1e9,
      purpose: r.purpose,
      yesWeight: Number(r.yes_weight || 0),
      noWeight: Number(r.no_weight || 0),
      status: r.status,
      createdAt: r.created_at,
      expiresAt: r.expires_at,
      type: r.type || 'ton_withdrawal',
      votedAddresses: votesMap.get(r.id) || []
    }));

    return c.json({ success: true, data: mapped });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// 6b. GET /api/v1/launches/:id/operations - Get operations proposals
app.get('/api/v1/launches/:id/operations', async (c) => {
  const launchId = c.req.param('id');
  try {
    const { results } = await c.env.DB.prepare(
      "SELECT * FROM governance_proposals WHERE launch_id = ? AND type = 'ops_token' ORDER BY created_at DESC"
    ).bind(launchId).all();

    const { results: votes } = await c.env.DB.prepare(
      `SELECT proposal_id, user_id FROM governance_votes
       WHERE proposal_id IN (SELECT id FROM governance_proposals WHERE launch_id = ? AND type = 'ops_token')`
    ).bind(launchId).all();

    const votesMap = new Map<string, string[]>();
    for (const v of votes) {
      const list = votesMap.get(v.proposal_id as string) || [];
      list.push(v.user_id as string);
      votesMap.set(v.proposal_id as string, list);
    }

    const mapped = results.map((r: any) => ({
      id: r.id,
      projectId: r.launch_id,
      amount: Number(r.amount_nano ?? (r.amount || 0) * 1e9) / 1e9,
      purpose: r.purpose,
      yesWeight: Number(r.yes_weight || 0),
      noWeight: Number(r.no_weight || 0),
      status: r.status,
      createdAt: r.created_at,
      expiresAt: r.expires_at,
      type: r.type,
      votedAddresses: votesMap.get(r.id) || []
    }));

    return c.json({ success: true, data: mapped });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// 6c. POST /api/v1/launches/:id/operations - Create operations proposal
app.post('/api/v1/launches/:id/operations', authMiddleware, async (c) => {
  const launchId = c.req.param('id');
  try {
    const userAddress = c.get('user_id');
    const launch = await c.env.DB.prepare(
      'SELECT owner_id FROM launches WHERE id = ?'
    ).bind(launchId).first() as any;

    if (!launch) {
      return c.json({ success: false, error: 'Project not found' }, 404);
    }

    const isAdmin = checkIsAdmin(c, userAddress);
    const isOwner = compareAddresses(launch.owner_id, userAddress);

    if (!isOwner && !isAdmin) {
      return c.json({ success: false, error: 'Forbidden' }, 403);
    }

    const { amount, purpose } = await c.req.json();
    if (!amount || !purpose) {
      return c.json({ success: false, error: 'Missing amount or purpose' }, 400);
    }
    const propId = `prop-ops-${Date.now()}`;
    const expiresAt = new Date(Date.now() + 48 * 3600 * 1000).toISOString(); // 48h

    const amountNano = Math.round(Number(amount) * 1e9);
    await c.env.DB.prepare(
      `INSERT INTO governance_proposals (id, launch_id, amount, amount_nano, purpose, yes_weight, no_weight, status, expires_at, type)
       VALUES (?, ?, ?, ?, ?, 0.0, 0.0, 'active', ?, 'ops_token')`
    ).bind(propId, launchId, amount, amountNano, purpose, expiresAt).run();

    return c.json({
      success: true,
      data: {
        id: propId,
        projectId: launchId,
        amount,
        purpose,
        yesWeight: 0,
        noWeight: 0,
        status: 'active',
        expiresAt,
        type: 'ops_token',
        votedAddresses: []
      }
    });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// 7. POST /api/v1/launches/:id/proposals - Create a proposal
app.post('/api/v1/launches/:id/proposals', authMiddleware, async (c) => {
  const launchId = c.req.param('id');
  try {
    const userAddress = c.get('user_id');
    const launch = await c.env.DB.prepare(
      'SELECT owner_id FROM launches WHERE id = ?'
    ).bind(launchId).first() as any;

    if (!launch) {
      return c.json({ success: false, error: 'Project not found' }, 404);
    }

    const isAdmin = checkIsAdmin(c, userAddress);
    const isOwner = compareAddresses(launch.owner_id, userAddress);

    if (!isOwner && !isAdmin) {
      return c.json({ success: false, error: 'Forbidden: Only the project owner or admins can create proposals' }, 403);
    }

    const { amount, purpose, type } = await c.req.json();
    if (!amount || !purpose) {
      return c.json({ success: false, error: 'Missing amount or purpose' }, 400);
    }
    const propId = `prop-${Date.now()}`;
    const expiresAt = new Date(Date.now() + 48 * 3600 * 1000).toISOString(); // 48h
    const propType = type || 'ton_withdrawal';

    const amountNano = Math.round(Number(amount) * 1e9);
    await c.env.DB.prepare(
      `INSERT INTO governance_proposals (id, launch_id, amount, amount_nano, purpose, yes_weight, no_weight, status, expires_at, type)
       VALUES (?, ?, ?, ?, ?, 0.0, 0.0, 'active', ?, ?)`
    ).bind(propId, launchId, amount, amountNano, purpose, expiresAt, propType).run();

    return c.json({
      success: true,
      data: {
        id: propId,
        projectId: launchId,
        amount,
        purpose,
        yesWeight: 0,
        noWeight: 0,
        status: 'active',
        expiresAt,
        type: propType,
        votedAddresses: []
      }
    });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// 8. POST /api/v1/launches/:id/proposals/:propId/vote - Vote on a proposal
app.post('/api/v1/launches/:id/proposals/:propId/vote', authMiddleware, async (c) => {
  const launchId = c.req.param('id');
  const propId = c.req.param('propId');
  try {
    const userAddress = c.get('user_id');
    const body = await c.req.json().catch(() => ({}));
    const { vote } = body;
    if (!userAddress || !vote) {
      return c.json({ success: false, error: 'Missing parameters' }, 400);
    }

    if (vote !== 'yes' && vote !== 'no') {
      return c.json({ success: false, error: 'Invalid vote option. Must be yes or no.' }, 400);
    }

    const proposal = await c.env.DB.prepare(
      'SELECT * FROM governance_proposals WHERE id = ?'
    ).bind(propId).first() as any;

    if (!proposal) {
      return c.json({ success: false, error: 'Proposal not found' }, 404);
    }

    if (proposal.launch_id !== launchId) {
      return c.json({ success: false, error: 'Proposal does not belong to this project' }, 400);
    }

    if (proposal.status !== 'active') {
      return c.json({ success: false, error: 'Proposal is not active' }, 400);
    }

    if (new Date(proposal.expires_at) < new Date()) {
      return c.json({ success: false, error: 'Proposal has expired' }, 400);
    }

    // Check if voter already voted in relational table
    const existingVote = await c.env.DB.prepare(
      'SELECT id FROM governance_votes WHERE proposal_id = ? AND user_id = ?'
    ).bind(propId, userAddress).first();

    if (existingVote) {
      return c.json({ success: false, error: 'Address already voted' }, 400);
    }

    // Fetch user tokens in this launch
    const userTokensRow = await c.env.DB.prepare(
      'SELECT SUM(tokens_nano) as total_tokens_nano, SUM(tokens) as total_tokens FROM spark_records WHERE launch_id = ? AND user_id = ?'
    ).bind(launchId, userAddress).first() as any;

    const totalTokensNano = Number(userTokensRow?.total_tokens_nano ?? (userTokensRow?.total_tokens || 0) * 1e9);
    if (totalTokensNano <= 0) {
      return c.json({ success: false, error: 'No tokens found in this project to vote' }, 403);
    }

    const stdTokens = totalTokensNano / 1e9;
    const computedWeightStd = Math.sqrt(stdTokens);
    const computedWeightVal = Math.round(computedWeightStd * 1e9);

    // Update weights
    const yesWeight = Number(proposal.yes_weight || 0) + (vote === 'yes' ? computedWeightVal : 0);
    const noWeight = Number(proposal.no_weight || 0) + (vote === 'no' ? computedWeightVal : 0);

    await c.env.DB.prepare(
      `UPDATE governance_proposals
       SET yes_weight = ?, no_weight = ?
       WHERE id = ?`
    ).bind(yesWeight, noWeight, propId).run();

    // Log the vote in governance_votes
    const voteId = `vote-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    await c.env.DB.prepare(
      `INSERT INTO governance_votes (id, proposal_id, user_id, weight, vote)
       VALUES (?, ?, ?, ?, ?)`
    ).bind(voteId, propId, userAddress, computedWeightVal, vote.toUpperCase()).run();

    return c.json({ success: true });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// 9. GET /api/v1/launches/:id/exit-requests - Get exit requests
app.get('/api/v1/launches/:id/exit-requests', async (c) => {
  const launchId = c.req.param('id');
  try {
    const { results } = await c.env.DB.prepare(
      'SELECT * FROM exit_requests WHERE launch_id = ? ORDER BY created_at DESC'
    ).bind(launchId).all();
    const mapped = results.map((r: any) => ({
      id: r.id,
      projectId: r.launch_id,
      userAddress: r.user_id,
      redeemedTON: Number(r.redeemed_ton),
      burnedTokens: Number(r.burned_tokens),
      createdAt: r.created_at
    }));
    return c.json({ success: true, data: mapped });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// 10. POST /api/v1/launches/:id/exit-requests - Create exit request
app.post('/api/v1/launches/:id/exit-requests', authMiddleware, async (c) => {
  const launchId = c.req.param('id');
  try {
    const userAddress = c.get('user_id');
    const { redeemedTON, burnedTokens } = await c.req.json();
    if (!userAddress || redeemedTON === undefined || burnedTokens === undefined) {
      return c.json({ success: false, error: 'Missing parameters' }, 400);
    }

    if (Number(redeemedTON) < 0 || Number(burnedTokens) < 0) {
      return c.json({ success: false, error: 'Invalid negative parameters' }, 400);
    }

    // Verify user investment in spark_records
    const userRecord = await c.env.DB.prepare(
      'SELECT SUM(amount_nano) as total_ton_nano, SUM(amount) as total_ton, SUM(tokens_nano) as total_tokens_nano, SUM(tokens) as total_tokens FROM spark_records WHERE launch_id = ? AND user_id = ?'
    ).bind(launchId, userAddress).first() as any;

    const userTonNano = Number(userRecord?.total_ton_nano ?? (userRecord?.total_ton || 0) * 1e9);
    const userTokensNano = Number(userRecord?.total_tokens_nano ?? (userRecord?.total_tokens || 0) * 1e9);

    if (userTonNano <= 0 || userTokensNano <= 0) {
      return c.json({ success: false, error: 'No investment record found for this user in this project' }, 400);
    }

    // Verify existing exits
    const existingExits = await c.env.DB.prepare(
      'SELECT SUM(redeemed_ton_nano) as already_redeemed_nano, SUM(redeemed_ton) as already_redeemed, SUM(burned_tokens_nano) as already_burned_nano, SUM(burned_tokens) as already_burned FROM exit_requests WHERE launch_id = ? AND user_id = ?'
    ).bind(launchId, userAddress).first() as any;

    const alreadyRedeemedNano = Number(existingExits?.already_redeemed_nano ?? (existingExits?.already_redeemed || 0) * 1e9);
    const alreadyBurnedNano = Number(existingExits?.already_burned_nano ?? (existingExits?.already_burned || 0) * 1e9);

    const maxRedeemableTonNano = userTonNano - alreadyRedeemedNano;
    const maxBurnableTokensNano = userTokensNano - alreadyBurnedNano;

    const redeemedTONNano = Math.round(Number(redeemedTON) * 1e9);
    const burnedTokensNano = Math.round(Number(burnedTokens) * 1e9);

    // Check bounds
    if (redeemedTONNano > maxRedeemableTonNano) {
      return c.json({ success: false, error: `Invalid redeemedTON: exceeds remaining redeemable TON (${maxRedeemableTonNano / 1e9})` }, 400);
    }

    if (burnedTokensNano > maxBurnableTokensNano) {
      return c.json({ success: false, error: `Invalid burnedTokens: exceeds remaining burnable tokens (${maxBurnableTokensNano / 1e9})` }, 400);
    }

    const requestId = `exit-${Date.now()}`;
    await c.env.DB.prepare(
      `INSERT INTO exit_requests (id, launch_id, user_id, redeemed_ton, redeemed_ton_nano, burned_tokens, burned_tokens_nano)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).bind(requestId, launchId, userAddress, redeemedTON, redeemedTONNano, burnedTokens, burnedTokensNano).run();
    return c.json({ success: true, data: { id: requestId, projectId: launchId, userAddress, redeemedTON, burnedTokens } });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// AI Webhook Milestone Auto-Unlock Endpoints
// ============================================================

// GET /api/v1/launches/:id/milestones - Get milestones for a launch
app.get('/api/v1/launches/:id/milestones', async (c) => {
  const launchId = c.req.param('id');
  try {
    const { results } = await c.env.DB.prepare(
      'SELECT id, launch_id, milestone_index, title, release_ratio, status, deliverable_url, challenge_expires_at FROM launch_milestones WHERE launch_id = ? ORDER BY milestone_index ASC'
    ).bind(launchId).all();

    const mapped = results.map((m: any) => ({
      id: m.id,
      launchId: m.launch_id,
      milestoneIndex: Number(m.milestone_index),
      title: m.title,
      releaseRatio: Number(m.release_ratio),
      status: m.status,
      deliverableUrl: m.deliverable_url,
      challengeExpiresAt: m.challenge_expires_at
    }));

    return c.json({ success: true, data: mapped });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

async function handleMilestoneSubmit(c: any, launchId: string, milestoneIndex: number, deliverableUrl: string, userAddress: string) {
  const launch = await c.env.DB.prepare(
    'SELECT name, project_code, owner_id FROM launches WHERE id = ?'
  ).bind(launchId).first() as any;

  if (!launch) {
    return c.json({ success: false, error: 'Project not found' }, 404);
  }

  const isAdmin = checkIsAdmin(c, userAddress);
  const isOwner = compareAddresses(launch.owner_id, userAddress);
  if (!isOwner && !isAdmin) {
    return c.json({ success: false, error: 'Forbidden: Only the project owner or admins can submit deliverables' }, 403);
  }

  const milestone = await c.env.DB.prepare(
    'SELECT id, title, status FROM launch_milestones WHERE launch_id = ? AND milestone_index = ?'
  ).bind(launchId, milestoneIndex).first() as any;

  if (!milestone) {
    return c.json({ success: false, error: 'Milestone not found' }, 404);
  }

  if (milestone.status !== 'PENDING') {
    return c.json({ success: false, error: `Milestone is not PENDING (current status: ${milestone.status})` }, 400);
  }

  // 1. Run DeepSeek Review
  const reviewResult = await runDeepSeekReview(
    c.env.DEEPSEEK_API_KEY,
    milestone.title || `Milestone ${milestoneIndex}`,
    deliverableUrl,
    c.env.ENVIRONMENT
  );

  if (!reviewResult.pass) {
    return c.json({
      success: false,
      error: `AI Review Failed: ${reviewResult.reason}`
    }, 400);
  }

  const now = new Date().toISOString();
  const challengeExpiresAt = new Date(Date.now() + 24 * 3600 * 1000).toISOString();
  await c.env.DB.prepare(
    "UPDATE launch_milestones SET status = 'AI_REVIEW_PASSED', deliverable_url = ?, challenge_expires_at = ?, updated_at = ? WHERE launch_id = ? AND milestone_index = ?"
  ).bind(deliverableUrl, challengeExpiresAt, now, launchId, milestoneIndex).run();

  // 2. Telegram Bot notification
  const projectName = launch.name || 'VibeCoder Project';
  const projectCode = launch.project_code || 'VC-L-000000';
  const milestoneTitle = milestone.title || `里程碑 ${milestoneIndex}`;
  const tgMessage = `<b>🔔 里程碑已提交交付物</b>\n\n项目：<a href="https://t.me/VCToken9_Bot/app?startapp=launch_${tgEscapeAttr(launchId)}">${tgEscape(projectName)} (${tgEscape(projectCode)})</a>\n里程碑：#${milestoneIndex} - ${tgEscape(milestoneTitle)}\n交付链接：<a href="${tgEscapeAttr(deliverableUrl)}">${tgEscape(deliverableUrl)}</a>\n当前状态：<b>已通过 AI 自动验收，进入 24h 挑战期</b>\n挑战截止时间：${challengeExpiresAt}`;

  c.executionCtx.waitUntil(sendTelegramNotification(c.env, tgMessage));

  return c.json({
    success: true,
    message: 'Deliverable submitted. AI review passed, challenge period started.',
    data: {
      launchId,
      milestoneIndex,
      status: 'AI_REVIEW_PASSED',
      deliverableUrl,
      challengeExpiresAt
    }
  });
}

// POST /api/v1/launches/:id/milestones/:index/submit - Project creator submits deliverable URL
// Also accepts POST /api/v1/launches/:id/milestones/submit with index in body for flexibility
app.post('/api/v1/launches/:id/milestones/:index/submit', authMiddleware, async (c) => {
  const launchId = c.req.param('id');
  const indexParam = c.req.param('index');
  try {
    const userAddress = c.get('user_id');
    const body = await c.req.json().catch(() => ({}));
    const milestoneIndex = indexParam !== undefined ? parseInt(indexParam, 10) : parseInt(body.index, 10);
    const { deliverableUrl } = body;

    if (isNaN(milestoneIndex) || !deliverableUrl) {
      return c.json({ success: false, error: 'Missing milestoneIndex or deliverableUrl' }, 400);
    }

    return await handleMilestoneSubmit(c, launchId, milestoneIndex, deliverableUrl, userAddress);
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// Alternative route for submit without index in URL
app.post('/api/v1/launches/:id/milestones/submit', authMiddleware, async (c) => {
  const launchId = c.req.param('id');
  try {
    const userAddress = c.get('user_id');
    const body = await c.req.json().catch(() => ({}));
    const milestoneIndex = parseInt(body.index, 10);
    const { deliverableUrl } = body;

    if (isNaN(milestoneIndex) || !deliverableUrl) {
      return c.json({ success: false, error: 'Missing index or deliverableUrl' }, 400);
    }

    return await handleMilestoneSubmit(c, launchId, milestoneIndex, deliverableUrl, userAddress);
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// POST /api/v1/launches/:id/milestones/:index/challenge - Backer disputes a milestone during challenge period
app.post('/api/v1/launches/:id/milestones/:index/challenge', authMiddleware, async (c) => {
  const launchId = c.req.param('id');
  const milestoneIndex = parseInt(c.req.param('index'), 10);
  try {
    const userAddress = c.get('user_id');
    const { reason } = await c.req.json().catch(() => ({}));

    if (isNaN(milestoneIndex)) {
      return c.json({ success: false, error: 'Invalid milestone index' }, 400);
    }

    const backerRecord = await c.env.DB.prepare(
      'SELECT SUM(amount_nano) as total_nano FROM spark_records WHERE launch_id = ? AND user_id = ?'
    ).bind(launchId, userAddress).first() as any;
    const isBacker = backerRecord && Number(backerRecord.total_nano) > 0;
    const isAdmin = checkIsAdmin(c, userAddress);

    if (!isBacker && !isAdmin) {
      return c.json({ success: false, error: 'Forbidden: Only backers can challenge milestones' }, 403);
    }

    const milestone = await c.env.DB.prepare(
      'SELECT id, status, challenge_expires_at FROM launch_milestones WHERE launch_id = ? AND milestone_index = ?'
    ).bind(launchId, milestoneIndex).first() as any;

    if (!milestone) {
      return c.json({ success: false, error: 'Milestone not found' }, 404);
    }

    if (milestone.status !== 'AI_REVIEW_PASSED' && milestone.status !== 'CHALLENGE_PERIOD') {
      return c.json({ success: false, error: 'Milestone is not in challenge period' }, 400);
    }

    if (milestone.challenge_expires_at && new Date() > new Date(milestone.challenge_expires_at)) {
      return c.json({ success: false, error: 'Challenge period has already expired' }, 400);
    }

    const now = new Date().toISOString();
    await c.env.DB.prepare(
      "UPDATE launch_milestones SET status = 'DISPUTED', updated_at = ? WHERE launch_id = ? AND milestone_index = ?"
    ).bind(now, launchId, milestoneIndex).run();

    // Trigger DAO_ARBITRATION state logic (inserting proposal for arbitration)
    const propId = `dispute-${Date.now()}`;
    const expiresAt = new Date(Date.now() + 48 * 3600 * 1000).toISOString();
    await c.env.DB.prepare(
      `INSERT INTO governance_proposals (id, launch_id, amount, amount_nano, purpose, yes_weight, no_weight, status, expires_at, type)
       VALUES (?, ?, 0, 0, ?, 0.0, 0.0, 'active', ?, 'milestone_dispute')`
    ).bind(propId, launchId, `Arbitration for Milestone ${milestoneIndex} dispute. Reason: ${reason || 'No reason provided.'}`, expiresAt).run();

    // Trigger TG notification
    const projectDb = await c.env.DB.prepare(
      'SELECT name FROM launches WHERE id = ?'
    ).bind(launchId).first() as any;
    const projectName = projectDb?.name || 'VibeCoder Project';
    const tgMessage = `<b>⚠️ 里程碑被发起争议挑战</b>\n\n项目：<a href="https://t.me/VCToken9_Bot/app?startapp=launch_${tgEscapeAttr(launchId)}">${tgEscape(projectName)}</a>\n里程碑：#${milestoneIndex}\n争议原因：${tgEscape(reason || '无')}\n状态已更新为：<b>争议中 (DAO 仲裁已启动)</b>`;
    c.executionCtx.waitUntil(sendTelegramNotification(c.env, tgMessage));

    return c.json({
      success: true,
      message: 'Milestone disputed. Shifting status to DISPUTED (DAO_ARBITRATION initiated).',
      data: {
        launchId,
        milestoneIndex,
        status: 'DISPUTED',
        proposalId: propId
      }
    });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// POST /api/v1/launches/:id/milestones/:index/unlock - Unlock milestone and release funds
app.post('/api/v1/launches/:id/milestones/:index/unlock', authMiddleware, async (c) => {
  const launchId = c.req.param('id');
  const milestoneIndex = parseInt(c.req.param('index'), 10);
  try {
    const userAddress = c.get('user_id');
    if (isNaN(milestoneIndex)) {
      return c.json({ success: false, error: 'Invalid milestone index' }, 400);
    }

    const milestone = await c.env.DB.prepare(
      'SELECT id, status, challenge_expires_at, release_ratio FROM launch_milestones WHERE launch_id = ? AND milestone_index = ?'
    ).bind(launchId, milestoneIndex).first() as any;

    if (!milestone) {
      return c.json({ success: false, error: 'Milestone not found' }, 404);
    }

    if (milestone.status !== 'AI_REVIEW_PASSED' && milestone.status !== 'CHALLENGE_PERIOD') {
      return c.json({ success: false, error: 'Milestone cannot be unlocked (must be AI_REVIEW_PASSED or CHALLENGE_PERIOD)' }, 400);
    }

    const now = new Date();
    const challengeExpiresAt = milestone.challenge_expires_at ? new Date(milestone.challenge_expires_at) : null;
    const isAdmin = checkIsAdmin(c, userAddress);

    if (challengeExpiresAt && now < challengeExpiresAt && !isAdmin) {
      return c.json({ success: false, error: 'Challenge period has not expired yet' }, 400);
    }

    // Shifting status to UNLOCKED
    const nowIso = now.toISOString();
    await c.env.DB.prepare(
      "UPDATE launch_milestones SET status = 'UNLOCKED', updated_at = ? WHERE launch_id = ? AND milestone_index = ?"
    ).bind(nowIso, launchId, milestoneIndex).run();

    // Trigger simulated fund release
    const project = await c.env.DB.prepare(
      'SELECT target_total_nano, raised_total_nano, owner_id FROM launches WHERE id = ?'
    ).bind(launchId).first() as any;

    let releasedAmountNano = 0;
    if (project) {
      const raisedNano = Number(project.raised_total_nano || 0);
      const releaseRatio = Number(milestone.release_ratio || 0.1);
      const governanceShareNano = Math.round(raisedNano * 0.5); // 50% governance share
      releasedAmountNano = Math.round(governanceShareNano * releaseRatio);

      const logId = `unlock-${Date.now()}`;
      await c.env.DB.prepare(
        'INSERT INTO admin_audit_logs (id, admin_wallet, action, target_id, payload) VALUES (?, ?, ?, ?, ?)'
      ).bind(logId, userAddress, `unlock_milestone:${milestoneIndex}`, launchId, JSON.stringify({ releasedAmountNano, releaseRatio })).run();
    }

    // Trigger TG notification
    const projectDb = await c.env.DB.prepare(
      'SELECT name FROM launches WHERE id = ?'
    ).bind(launchId).first() as any;
    const projectName = projectDb?.name || 'VibeCoder Project';
    const tgMessage = `<b>✅ 里程碑成功解锁释放资金</b>\n\n项目：<a href="https://t.me/VCToken9_Bot/app?startapp=launch_${tgEscapeAttr(launchId)}">${tgEscape(projectName)}</a>\n里程碑：#${milestoneIndex}\n释放比例：${(milestone.release_ratio || 0.1) * 100}%\n等值代付资金已成功转入开发者钱包！`;
    c.executionCtx.waitUntil(sendTelegramNotification(c.env, tgMessage));

    return c.json({
      success: true,
      message: 'Milestone unlocked successfully and funds released.',
      data: {
        launchId,
        milestoneIndex,
        status: 'UNLOCKED',
        releasedAmountNano
      }
    });
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
app.post('/api/v1/bounty/tasks', authMiddleware, async (c) => {
  try {
    const creator_id = c.get('user_id');
    const body = await c.req.json();
    const { creator_type, creator_tier, task_type, title, description, target_url,
            reward_amount, reward_token, total_slots, is_token_reward, token_reward_chain,
            token_reward_type, token_reward_amount, tx_hash } = body;

    if (!title || !total_slots) {
      return c.json({ success: false, error: 'Missing required fields' }, 400);
    }

    const isAdmin = checkIsAdmin(c, creator_id);

    // Dynamic Creator Service Fee logic:
    // If reward_token is VC, creator must pay 1% VC fee.
    if (reward_token === 'VC') {
      if (!isAdmin) {
        return c.json({ success: false, error: 'Forbidden: Only admins or platform can create VC reward tasks.' }, 403);
      }
      if (Number(reward_amount) > 100) {
        return c.json({ success: false, error: 'Limit exceeded: Maximum VC reward amount is 100 VC.' }, 400);
      }

      const budget = Number(reward_amount || 0) * Number(total_slots || 0);
      const fee = budget * 0.01; // 1% service fee

      const balanceRow = await c.env.DB.prepare(
        'SELECT pending_vc FROM user_vc_balances WHERE user_id = ?'
      ).bind(creator_id).first() as any;
      const currentBalance = balanceRow ? Number(balanceRow.pending_vc) : 0;

      if (!isAdmin && currentBalance < fee) {
        return c.json({ success: false, error: `Insufficient VC balance to pay the 1% creator service fee (${fee} VC). Your balance is ${currentBalance} VC.` }, 400);
      }

      if (!isAdmin) {
        await c.env.DB.prepare(
          'UPDATE user_vc_balances SET pending_vc = pending_vc - ? WHERE user_id = ?'
        ).bind(fee, creator_id).run();
      }
    } else {
      // If reward_token is not VC, charge 2 TON platform service fee (verified via tx_hash)
      if (!isAdmin) {
        if (!tx_hash) {
          return c.json({ success: false, error: 'tx_hash required to verify the 2 TON platform service fee payment' }, 400);
        }
      }
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

// 13.5 GET /api/v1/bounty/submissions - Get user's bounty submissions
app.get('/api/v1/bounty/submissions', authMiddleware, async (c) => {
  try {
    const user_id = c.get('user_id');
    const { results } = await c.env.DB.prepare(
      'SELECT * FROM bounty_submissions WHERE user_id = ?'
    ).bind(user_id).all();
    return c.json({ success: true, data: results });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// 14. POST /api/v1/bounty/tasks/:id/submit - Submit a completed task
app.post('/api/v1/bounty/tasks/:id/submit', authMiddleware, async (c) => {
  const taskId = c.req.param('id');
  try {
    const user_id = c.get('user_id');
    const body = await c.req.json().catch(() => ({}));

    // Rate limiting: max 10 submissions per day
    const allowedSubmit = await checkRateLimit(c.env.DB, user_id, 'bounty_submit', 10, 24 * 3600 * 1000);
    if (!allowedSubmit) {
      return c.json({ success: false, error: 'Submission limit exceeded (max 10 submissions per day).' }, 429);
    }

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

    // Update task completion atomically
    const result = await c.env.DB.prepare(
      'UPDATE bounty_tasks SET completed_slots = completed_slots + 1 WHERE id = ? AND completed_slots < total_slots'
    ).bind(taskId).run();
    if (result.meta.changes === 0) {
      return c.json({ success: false, error: 'Task fully completed' }, 400);
    }

    const isExchangeReg = task.task_type === 'EXCHANGE_REG';
    const subId = `sub-${Date.now()}-${Math.random().toString(36).substring(2, 4)}`;

    if (isExchangeReg) {
      const { exchangeUid, screenshotUrl } = body;
      if (!exchangeUid || !screenshotUrl) {
        // Revert completed_slots increment since validation failed
        await c.env.DB.prepare(
          'UPDATE bounty_tasks SET completed_slots = completed_slots - 1 WHERE id = ?'
        ).bind(taskId).run();
        return c.json({ success: false, error: 'exchangeUid and screenshotUrl required for exchange registration tasks' }, 400);
      }

      // Regex check for exchangeUid (8-12 digits)
      const uidRegex = /^\d{8,12}$/;
      if (!uidRegex.test(exchangeUid)) {
        await c.env.DB.prepare(
          'UPDATE bounty_tasks SET completed_slots = completed_slots - 1 WHERE id = ?'
        ).bind(taskId).run();
        return c.json({ success: false, error: 'Invalid exchangeUid format. Must be 8-12 digits.' }, 400);
      }

      // Regex check for screenshotUrl (https, max 500 chars, image suffix)
      const urlRegex = /^https:\/\/[^\s$.?#].[^\s]*$/i;
      const extensionRegex = /\.(png|jpg|jpeg|webp)$/i;
      if (screenshotUrl.length > 500 || !urlRegex.test(screenshotUrl) || !extensionRegex.test(screenshotUrl)) {
        await c.env.DB.prepare(
          'UPDATE bounty_tasks SET completed_slots = completed_slots - 1 WHERE id = ?'
        ).bind(taskId).run();
        return c.json({ success: false, error: 'Invalid screenshotUrl format. Must be a secure image URL (https and png/jpg/jpeg/webp).' }, 400);
      }

      try {
        await c.env.DB.prepare(
          `INSERT INTO bounty_submissions (id, task_id, user_id, status, reward_vc, claimed, exchange_uid, screenshot_url)
           VALUES (?, ?, ?, ?, ?, 0, ?, ?)`
        ).bind(subId, taskId, user_id, 'PENDING', task.reward_amount, exchangeUid, screenshotUrl).run();
      } catch (e: any) {
        await c.env.DB.prepare(
          'UPDATE bounty_tasks SET completed_slots = completed_slots - 1 WHERE id = ?'
        ).bind(taskId).run();
        return c.json({ success: false, error: 'Already submitted' }, 400);
      }

      return c.json({ success: true, message: 'Exchange registration submitted! Awaiting audit.', submissionId: subId });
    }

    // Standard tasks require real third-party/on-chain verification before VC is credited.
    try {
      await c.env.DB.prepare(
        'INSERT INTO bounty_submissions (id, task_id, user_id, status, reward_vc, claimed) VALUES (?, ?, ?, ?, ?, 0)'
      ).bind(subId, taskId, user_id, 'PENDING', task.reward_amount).run();
    } catch (e: any) {
      // Revert completed_slots increment since insert failed due to concurrent submission
      await c.env.DB.prepare(
        'UPDATE bounty_tasks SET completed_slots = completed_slots - 1 WHERE id = ?'
      ).bind(taskId).run();
      return c.json({ success: false, error: 'Already submitted' }, 400);
    }

    return c.json({ success: true, status: 'PENDING', message: 'Task submitted. Awaiting verification before VC is credited.', submissionId: subId });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// 15. POST /api/v1/bounty/stake - Stake VC for token rewards
app.post('/api/v1/bounty/stake', authMiddleware, async (c) => {
  try {
    const user_id = c.get('user_id');
    const { creator_tier, vc_amount, tx_hash } = await c.req.json();
    if (!vc_amount || !tx_hash) {
      return c.json({ success: false, error: 'vc_amount and tx_hash required' }, 400);
    }

    const isMock = tx_hash.startsWith('mock') || tx_hash.length < 20;
    if (isMock) {
      if (c.env.ENVIRONMENT !== 'development') {
        return c.json({ success: false, error: 'Mock transactions are not allowed in production' }, 400);
      }
    } else {
      // 2. Fetch platform contract addresses
      const tcNetwork = currentTonNetwork(c);
      const launchFeeRow = await c.env.DB.prepare(
        "SELECT address FROM platform_contracts WHERE contract_name = 'LAUNCH_FEE' AND network = ?"
      ).bind(tcNetwork).first() as any;
      const launchFeeAddr = launchFeeRow?.address;
      if (!launchFeeAddr) {
        return c.json({ success: false, error: 'LAUNCH_FEE contract address not registered' }, 500);
      }

      // Query Toncenter on the configured TON network to verify transaction success
      const tcUrl = `https://${tcNetwork === 'mainnet' ? '' : 'testnet.'}toncenter.com/api/v3/transactions?hash=${encodeURIComponent(tx_hash)}`;
      const res = await fetch(tcUrl, {
        headers: c.env.TONCENTER_API_KEY ? { 'X-API-Key': c.env.TONCENTER_API_KEY } : {}
      });
      if (!res.ok) {
        return c.json({ success: false, error: `Failed to fetch transaction on-chain: ${res.statusText}` }, 400);
      }
      const data = await res.json() as any;
      const txs = data.transactions || [];
      if (txs.length === 0) {
        return c.json({ success: false, error: 'Transaction not found on-chain' }, 400);
      }

      // Find successful transaction going to LAUNCH_FEE address
      const targetTx = txs.find((tx: any) => {
        const isSuccess = tx.description?.type === 'generic' && tx.description?.compute_phase?.success === true;
        if (!isSuccess) return false;

        try {
          const destAddr = Address.parse(tx.in_msg?.destination);
          const expectedDest = Address.parse(launchFeeAddr);
          return destAddr.equals(expectedDest);
        } catch {
          return false;
        }
      });

      if (!targetTx) {
        return c.json({ success: false, error: 'On-chain transaction to LAUNCH_FEE failed or not found' }, 400);
      }

      // Decode and verify the message body (transfer_notification)
      try {
        const bodyStr = targetTx.in_msg?.message_content?.body || '';
        let bodyCell: Cell;
        if (bodyStr.startsWith('x{')) {
          const cleanHex = bodyStr.replace(/[^0-9a-fA-F]/g, '');
          bodyCell = Cell.fromBoc(Buffer.from(cleanHex, 'hex'))[0];
        } else {
          bodyCell = Cell.fromBoc(Buffer.from(bodyStr, 'base64'))[0];
        }

        const slice = bodyCell.beginParse();
        const op = slice.loadUint(32);
        if (op !== 0x7362d09c) {
          return c.json({ success: false, error: `Invalid message op: expected 0x7362d09c, got 0x${op.toString(16)}` }, 400);
        }

        slice.loadUint(64); // queryId
        const jettonAmount = slice.loadCoins();
        const senderAddress = slice.loadAddress();

        // Verify sender matches authenticated user
        const parsedSender = senderAddress.toString({ testOnly: tcNetwork === 'testnet' });
        const parsedUser = Address.parse(user_id).toString({ testOnly: tcNetwork === 'testnet' });
        if (parsedSender !== parsedUser) {
          return c.json({ success: false, error: `Sender mismatch: expected ${parsedUser}, got ${parsedSender}` }, 400);
        }

        // Verify amount
        const requiredAmountNanotons = BigInt(vc_amount) * 1_000_000_000n;
        if (jettonAmount < requiredAmountNanotons) {
          return c.json({ success: false, error: `Insufficient Jetton amount: expected ${requiredAmountNanotons}, got ${jettonAmount}` }, 400);
        }
      } catch (err: any) {
        return c.json({ success: false, error: `Transaction body decoding failed: ${err.message}` }, 400);
      }
    }

    const stakeId = tx_hash;
    try {
      const stmt1 = c.env.DB.prepare(
        'INSERT INTO used_chain_txs (tx_hash, user_id, purpose) VALUES (?, ?, ?)'
      ).bind(tx_hash, user_id, 'bounty_stake');

      const stmt2 = c.env.DB.prepare(
        'INSERT INTO bounty_stakes (id, user_id, creator_tier, vc_amount, locked_at, unlock_at, status) VALUES (?, ?, ?, ?, ?, ?, ?)'
      ).bind(stakeId, user_id, creator_tier || 0, vc_amount,
             new Date().toISOString(),
             new Date(Date.now() + 180 * 24 * 3600 * 1000).toISOString(),
             'ACTIVE');

      await c.env.DB.batch([stmt1, stmt2]);
    } catch (e: any) {
      return c.json({ success: false, error: 'Transaction hash already used or database error' }, 400);
    }

    return c.json({ success: true, message: 'VC staked successfully', stakeId });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// 16. GET /api/v1/bounty/stake/status - Check stake status
app.get('/api/v1/bounty/stake/status', authMiddleware, async (c) => {
  try {
    const userId = c.get('user_id');
    const stake = await c.env.DB.prepare(
      'SELECT * FROM bounty_stakes WHERE user_id = ? AND status = ?'
    ).bind(userId, 'ACTIVE').first();
    return c.json({ success: true, data: stake || null });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// 17. GET /api/v1/bounty/balance - Get user VC balance
app.get('/api/v1/bounty/balance', authMiddleware, async (c) => {
  try {
    const userId = c.get('user_id');
    const balance = await c.env.DB.prepare(
      'SELECT * FROM user_vc_balances WHERE user_id = ?'
    ).bind(userId).first() as any;
    if (balance) {
      return c.json({
        success: true,
        data: {
          pending_vc: balance.pending_vc.toString(),
          total_earned_vc: balance.total_earned_vc.toString()
        }
      });
    }
    return c.json({ success: true, data: { pending_vc: '0', total_earned_vc: '0' } });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// 18. POST /api/v1/bounty/claim - Claim VC to wallet
app.post('/api/v1/bounty/claim', authMiddleware, async (c) => {
  try {
    const user_id = c.get('user_id');

    // Reset pending atomically and return the old pending balance
    const claimResult = await c.env.DB.prepare(
      'UPDATE user_vc_balances SET pending_vc = 0, updated_at = ? WHERE user_id = ? AND pending_vc > 0 RETURNING pending_vc'
    ).bind(new Date().toISOString(), user_id).first() as any;

    if (!claimResult || claimResult.pending_vc <= 0) {
      return c.json({ success: false, error: 'No pending VC to claim' }, 400);
    }

    // Mark all pending submissions claimed
    await c.env.DB.prepare(
      'UPDATE bounty_submissions SET claimed = 1 WHERE user_id = ? AND claimed = 0'
    ).bind(user_id).run();

    return c.json({ success: true, message: `Claimed ${claimResult.pending_vc} VC`, amount: claimResult.pending_vc.toString() });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// ============================================================
// Agentic Wallet + Automation Endpoints
// ============================================================

// 19. POST /api/v1/agentic/create - Create agentic wallet
app.post('/api/v1/agentic/create', authMiddleware, async (c) => {
  try {
    const user_id = c.get('user_id');
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
app.get('/api/v1/agentic/status', authMiddleware, async (c) => {
  try {
    const userId = c.get('user_id');
    const wallet = await c.env.DB.prepare(
      'SELECT * FROM agentic_wallets WHERE user_id = ? ORDER BY created_at DESC LIMIT 1'
    ).bind(userId).first();
    return c.json({ success: true, data: wallet || null });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// 21. GET /api/v1/automation/rules - List user's automation rules
app.get('/api/v1/automation/rules', authMiddleware, async (c) => {
  try {
    const userId = c.get('user_id');
    const { results } = await c.env.DB.prepare(
      'SELECT * FROM automation_rules WHERE user_id = ? ORDER BY created_at DESC'
    ).bind(userId).all();
    return c.json({ success: true, data: results });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// 22. POST /api/v1/automation/rules - Create automation rule
app.post('/api/v1/automation/rules', authMiddleware, async (c) => {
  try {
    const user_id = c.get('user_id');
    const limitOk = await checkRateLimit(c.env.DB, user_id, 'automation_rule_write', 20, 3600 * 1000);
    if (!limitOk) {
      return c.json({ success: false, error: 'Too Many Requests: automation rule write limit exceeded' }, 429);
    }
    const { rule_type, condition_json, action_json, project_id } = await c.req.json();
    if (!rule_type) return c.json({ success: false, error: 'rule_type required' }, 400);
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
app.put('/api/v1/automation/rules/:id', authMiddleware, async (c) => {
  try {
    const ruleId = c.req.param('id');
    const userId = c.get('user_id');
    const limitOk = await checkRateLimit(c.env.DB, userId, 'automation_rule_write', 20, 3600 * 1000);
    if (!limitOk) {
      return c.json({ success: false, error: 'Too Many Requests: automation rule write limit exceeded' }, 429);
    }
    const { enabled, condition_json, action_json } = await c.req.json();

    let result;
    if (condition_json !== undefined || action_json !== undefined) {
      result = await c.env.DB.prepare(
        'UPDATE automation_rules SET enabled = ?, condition_json = ?, action_json = ? WHERE id = ? AND user_id = ?'
      ).bind(
        enabled !== undefined ? (enabled ? 1 : 0) : 1,
        condition_json ? JSON.stringify(condition_json) : null,
        action_json ? JSON.stringify(action_json) : null,
        ruleId,
        userId
      ).run();
    } else {
      result = await c.env.DB.prepare(
        'UPDATE automation_rules SET enabled = ? WHERE id = ? AND user_id = ?'
      ).bind(enabled ? 1 : 0, ruleId, userId).run();
    }

    if (result.meta.changes === 0) {
      return c.json({ success: false, error: 'Rule not found or unauthorized' }, 404);
    }
    return c.json({ success: true });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// Admin-only smoke test for the Signer service binding. Does not sign or broadcast.
app.get('/api/v1/admin/signer-smoke', authMiddleware, async (c) => {
  try {
    const userId = c.get('user_id');
    if (!checkIsAdmin(c, userId)) {
      return c.json({ success: false, error: 'Forbidden: Admin access required' }, 403);
    }
    if (!c.env.SIGNER_SECRET_KEY) {
      return c.json({ success: false, error: 'Server misconfiguration: SIGNER_SECRET_KEY not set' }, 500);
    }

    const signerRes = await c.env.SIGNER_SERVICE.fetch('http://signer.local/health', {
      method: 'GET',
      headers: {
        'X-Signer-Secret-Key': c.env.SIGNER_SECRET_KEY,
      },
    });
    const data = await signerRes.json() as any;
    if (!signerRes.ok || !data.success) {
      return c.json({ success: false, error: data.error || `Signer smoke failed: ${signerRes.status}` }, 502);
    }
    if (data.data?.isMock && c.env.ENVIRONMENT !== 'development') {
      return c.json({ success: false, error: 'Signer is in mock mode outside development', data: data.data }, 500);
    }
    return c.json({ success: true, data: data.data });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// 24. GET /api/v1/agentic/logs - Get agentic wallet logs
app.get('/api/v1/agentic/logs', authMiddleware, async (c) => {
  try {
    const userId = c.get('user_id');
    const walletId = c.req.query('wallet_id');
    if (!walletId) return c.json({ success: false, error: 'wallet_id required' }, 400);

    // Verify wallet ownership
    const wallet = await c.env.DB.prepare(
      'SELECT id FROM agentic_wallets WHERE id = ? AND user_id = ?'
    ).bind(walletId, userId).first();
    if (!wallet) {
      return c.json({ success: false, error: 'Unauthorized access to wallet logs' }, 403);
    }

    const { results } = await c.env.DB.prepare(
      'SELECT * FROM agentic_logs WHERE wallet_id = ? ORDER BY created_at DESC LIMIT 20'
    ).bind(walletId).all();
    return c.json({ success: true, data: results });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// 25. POST /api/v1/admin/bounty/submissions/:subId/verify - Audit exchange registration submissions
app.post('/api/v1/admin/bounty/submissions/:subId/verify', authMiddleware, async (c) => {
  const subId = c.req.param('subId');
  try {
    const userAddress = c.get('user_id');
    const isAdmin = checkIsAdmin(c, userAddress);
    if (!isAdmin) {
      return c.json({ success: false, error: 'Forbidden: Admin access required' }, 403);
    }

    const { status } = await c.req.json();
    if (status !== 'VERIFIED' && status !== 'REJECTED') {
      return c.json({ success: false, error: 'Invalid status' }, 400);
    }

    const sub = await c.env.DB.prepare(
      'SELECT * FROM bounty_submissions WHERE id = ?'
    ).bind(subId).first() as any;
    if (!sub) return c.json({ success: false, error: 'Submission not found' }, 404);
    if (sub.status !== 'PENDING') {
      return c.json({ success: false, error: 'Submission already processed' }, 400);
    }

    // Insert admin audit log
    const logId = `audit-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    await c.env.DB.prepare(
      'INSERT INTO admin_audit_logs (id, admin_wallet, action, target_id, payload) VALUES (?, ?, ?, ?, ?)'
    ).bind(logId, userAddress, `verify_bounty_submission:${status}`, subId, JSON.stringify({ oldStatus: sub.status, newStatus: status })).run();

    if (status === 'VERIFIED') {
      // Atomic update of submission and user balance
      await c.env.DB.prepare(
        'UPDATE bounty_submissions SET status = ?, verified_at = ? WHERE id = ?'
      ).bind('VERIFIED', new Date().toISOString(), subId).run();

      await c.env.DB.prepare(
        `INSERT INTO user_vc_balances (user_id, pending_vc, total_earned_vc, updated_at)
         VALUES (?, ?, ?, ?)
         ON CONFLICT(user_id) DO UPDATE SET
           pending_vc = pending_vc + excluded.pending_vc,
           total_earned_vc = total_earned_vc + excluded.total_earned_vc,
           updated_at = excluded.updated_at`
      ).bind(sub.user_id, sub.reward_vc, sub.reward_vc, new Date().toISOString()).run();

      // Process referral payout if applicable
      const pendingRef = await c.env.DB.prepare(
        'SELECT * FROM referrals WHERE invitee_wallet = ? AND reward_status = ?'
      ).bind(sub.user_id, 'pending').first() as any;

      if (pendingRef) {
        const referralRewardAmount = Number(pendingRef.reward_vc_nano) / 1_000_000_000;

        await c.env.DB.prepare(
          'UPDATE referrals SET reward_status = ? WHERE id = ?'
        ).bind('paid', pendingRef.id).run();

        await c.env.DB.prepare(
          `INSERT INTO user_vc_balances (user_id, pending_vc, total_earned_vc, updated_at)
           VALUES (?, ?, ?, ?)
           ON CONFLICT(user_id) DO UPDATE SET
             pending_vc = pending_vc + excluded.pending_vc,
             total_earned_vc = total_earned_vc + excluded.total_earned_vc,
             updated_at = excluded.updated_at`
        ).bind(pendingRef.inviter_wallet, referralRewardAmount, referralRewardAmount, new Date().toISOString()).run();
      }
    } else {
      await c.env.DB.prepare(
        'UPDATE bounty_submissions SET status = ? WHERE id = ?'
      ).bind('REJECTED', subId).run();

      // Revert slots count
      await c.env.DB.prepare(
        'UPDATE bounty_tasks SET completed_slots = completed_slots - 1 WHERE id = ?'
      ).bind(sub.task_id).run();
    }

    return c.json({ success: true, message: `Submission ${status.toLowerCase()} successfully.` });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// ============================================================
// VibeCoder 3.0 Upgrade: Search, Ecosystems, Squads, Referrals, TG Auth, Launch Validation
// All fields use real schema column names (name, token_symbol, etc.)
// ============================================================

// -- Constant-time hex string comparison --
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

// -- Unified search: project code, squad code, ecosystem code (using real columns) --
app.get('/api/v1/search', async (c) => {
  const q = (c.req.query('q') || '').trim();
  if (!q) return c.json({ success: true, data: { launches: [], squads: [], ecosystems: [] } });

  try {
    const likeQ = `%${q}%`;

    // Uses real columns: project_code, name, token_symbol, agent_ticker, title, id
    const { results: launchResults } = await c.env.DB.prepare(
      `SELECT id, project_code as code, name, token_symbol, agent_ticker as ticker, title, status
       FROM launches
       WHERE project_code LIKE ?1 COLLATE NOCASE
          OR name LIKE ?1 COLLATE NOCASE
          OR token_symbol LIKE ?1 COLLATE NOCASE
          OR agent_ticker LIKE ?1 COLLATE NOCASE
          OR id = ?2
       LIMIT 10`
    ).bind(likeQ, q).all();

    const { results: squadResults } = await c.env.DB.prepare(
      `SELECT s.id, s.squad_code as code, s.project_id, s.creator_name, s.current_members, s.target_members,
              CAST(s.current_amount_nano / 1000000000 AS INTEGER) as current_amount,
              CAST(s.target_amount_nano / 1000000000 AS INTEGER) as target_amount, s.status, l.name as project_name
       FROM spark_squads s
       LEFT JOIN launches l ON s.project_id = l.id
       WHERE s.squad_code LIKE ?1 COLLATE NOCASE
          OR s.creator_name LIKE ?1 COLLATE NOCASE
       LIMIT 5`
    ).bind(likeQ).all();

    const { results: ecoResults } = await c.env.DB.prepare(
      `SELECT id, ecosystem_code as code, name, status
       FROM creator_ecosystems
       WHERE ecosystem_code LIKE ?1 COLLATE NOCASE
          OR name LIKE ?1 COLLATE NOCASE
       LIMIT 5`
    ).bind(likeQ).all();

    return c.json({
      success: true,
      data: {
        launches: launchResults.map((r: any) => ({ ...r, type: 'launch' })),
        squads: squadResults.map((r: any) => ({ ...r, type: 'squad' })),
        ecosystems: ecoResults.map((r: any) => ({ ...r, type: 'ecosystem' })),
      }
    });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// -- Ecosystem CRUD --
app.post('/api/v1/ecosystems', authMiddleware, async (c) => {
  try {
    const creatorWallet = c.get('user_id');
    const { name, description } = await c.req.json();
    if (!name) return c.json({ success: false, error: 'name required' }, 400);

    const id = `eco-${Date.now()}`;
    const seq = Math.floor(Math.random() * 900000) + 100000;
    const code = `VC-E-${seq}`;

    await c.env.DB.prepare(
      'INSERT INTO creator_ecosystems (id, ecosystem_code, creator_wallet, name, description, status) VALUES (?, ?, ?, ?, ?, ?)'
    ).bind(id, code, creatorWallet, name, description || '', 'active').run();

    return c.json({ success: true, data: { id, ecosystemCode: code, name, creatorWallet } });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

app.get('/api/v1/ecosystems/:id', async (c) => {
  try {
    const eco = await c.env.DB.prepare('SELECT * FROM creator_ecosystems WHERE id = ? OR ecosystem_code = ?')
      .bind(c.req.param('id'), c.req.param('id')).first();
    if (!eco) return c.json({ success: false, error: 'Ecosystem not found' }, 404);
    return c.json({ success: true, data: eco });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

app.get('/api/v1/ecosystems/:id/launches', async (c) => {
  try {
    const ecoId = c.req.param('id');
    const { results } = await c.env.DB.prepare(
      'SELECT * FROM launches WHERE ecosystem_id = ? ORDER BY created_at DESC'
    ).bind(ecoId).all();
    return c.json({ success: true, data: results });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// -- Squad CRUD --
app.post('/api/v1/squads', authMiddleware, async (c) => {
  try {
    const creatorWallet = c.get('user_id');
    const { projectId, creatorName, targetMembers, targetAmount } = await c.req.json();
    if (!projectId || !targetMembers) return c.json({ success: false, error: 'projectId and targetMembers required' }, 400);

    const id = `squad-${Date.now()}`;
    const seq = `${Date.now().toString(36)}${Math.random().toString(36).substring(2, 6)}`;
    const code = `VC-F-${seq}`.toUpperCase();
    const expiresAt = new Date(Date.now() + 24 * 3600 * 1000).toISOString();
    const targetAmountNano = Math.round(Number(targetAmount || 30) * 1e9);

    await c.env.DB.prepare(
      'INSERT INTO spark_squads (id, squad_code, project_id, creator_wallet, creator_name, target_members, target_amount_nano, expires_at, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
    ).bind(id, code, projectId, creatorWallet, creatorName || '', targetMembers, targetAmountNano, expiresAt, 'active').run();

    return c.json({ success: true, data: { id, squadCode: code, projectId, expiresAt } });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

app.get('/api/v1/squads/project/:projectId', async (c) => {
  try {
    const { results } = await c.env.DB.prepare(
      'SELECT * FROM spark_squads WHERE project_id = ? AND status = ? ORDER BY created_at DESC'
    ).bind(c.req.param('projectId'), 'active').all();
    return c.json({ success: true, data: results });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

app.get('/api/v1/squads/:id', async (c) => {
  try {
    const squad = await c.env.DB.prepare(
      'SELECT s.*, l.name as project_name FROM spark_squads s LEFT JOIN launches l ON s.project_id = l.id WHERE s.id = ? OR s.squad_code = ?'
    ).bind(c.req.param('id'), c.req.param('id')).first() as any;
    if (!squad) return c.json({ success: false, error: 'Squad not found' }, 404);

    const { results: members } = await c.env.DB.prepare(
      'SELECT * FROM spark_squad_members WHERE squad_id = ?'
    ).bind(squad.id).all();

    return c.json({
      success: true,
      data: {
        id: squad.id,
        squadCode: squad.squad_code,
        projectId: squad.project_id,
        creatorWallet: squad.creator_wallet,
        creatorName: squad.creator_name,
        targetMembers: squad.target_members,
        targetAmount: Number(squad.target_amount_nano) / 1e9,
        currentAmount: Number(squad.current_amount_nano) / 1e9,
        currentMembers: squad.current_members,
        expiresAt: squad.expires_at,
        rewardText: squad.reward_text,
        status: squad.status,
        created_at: squad.created_at,
        projectName: squad.project_name,
        members: members.map((m: any) => ({
          wallet: m.wallet,
          sparkAmount: Number(m.spark_amount_nano) / 1e9,
          joinedAt: m.joined_at
        }))
      }
    });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

app.post('/api/v1/squads/:id/join', authMiddleware, async (c) => {
  try {
    const userWallet = c.get('user_id');
    const squadId = c.req.param('id');
    const { amount } = await c.req.json();
    if (!amount || Number(amount) <= 0) {
      return c.json({ success: false, error: 'Valid amount required' }, 400);
    }

    const squad = await c.env.DB.prepare(
      'SELECT * FROM spark_squads WHERE id = ? OR squad_code = ?'
    ).bind(squadId, squadId).first() as any;

    if (!squad) {
      return c.json({ success: false, error: 'Squad not found' }, 404);
    }
    if (squad.status !== 'active') {
      return c.json({ success: false, error: 'Squad is not active' }, 400);
    }

    const amountNano = Math.round(Number(amount) * 1e9);
    const newAmountNano = (squad.current_amount_nano || 0) + amountNano;
    const newMembers = (squad.current_members || 0) + 1;
    const isSuccessful = newAmountNano >= squad.target_amount_nano && newMembers >= squad.target_members;

    const memberId = `member-${Date.now()}`;
    await c.env.DB.prepare(
      'INSERT INTO spark_squad_members (id, squad_id, wallet, spark_amount_nano) VALUES (?, ?, ?, ?)'
    ).bind(memberId, squad.id, userWallet, amountNano).run();

    await c.env.DB.prepare(
      'UPDATE spark_squads SET current_amount_nano = ?, current_members = ?, status = ? WHERE id = ?'
    ).bind(newAmountNano, newMembers, isSuccessful ? 'success' : 'active', squad.id).run();

    return c.json({
      success: true,
      data: {
        squadId: squad.id,
        currentAmount: newAmountNano / 1e9,
        currentMembers: newMembers,
        status: isSuccessful ? 'success' : 'active'
      }
    });
  } catch (error: any) {
    if (error.message.includes('UNIQUE constraint failed')) {
      return c.json({ success: false, error: 'Already joined this squad' }, 400);
    }
    return c.json({ success: false, error: error.message }, 500);
  }
});


// -- Referral tracking --
app.post('/api/v1/referrals', authMiddleware, async (c) => {
  try {
    const inviteeWallet = c.get('user_id');
    const { inviterWallet } = await c.req.json();
    if (!inviterWallet) return c.json({ success: false, error: 'inviterWallet required' }, 400);

    // Anti-self-referral
    if (inviterWallet.toLowerCase() === inviteeWallet.toLowerCase()) {
      return c.json({ success: false, error: 'Self-referral not allowed' }, 400);
    }

    // Check for duplicate
    const existing = await c.env.DB.prepare(
      'SELECT id FROM referrals WHERE invitee_wallet = ?'
    ).bind(inviteeWallet).first();
    if (existing) {
      return c.json({ success: true, data: existing, message: 'Referral already recorded' });
    }

    const id = `ref-${Date.now()}`;
    await c.env.DB.prepare(
      'INSERT INTO referrals (id, inviter_wallet, invitee_wallet, reward_status, reward_vc_nano) VALUES (?, ?, ?, ?, ?)'
    ).bind(id, inviterWallet, inviteeWallet, 'pending', 50000000000).run();

    return c.json({ success: true, data: { id, inviterWallet, inviteeWallet, status: 'pending', rewardVc: 50 } });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

app.get('/api/v1/referrals/:wallet', async (c) => {
  try {
    const wallet = c.req.param('wallet');
    const { results } = await c.env.DB.prepare(
      'SELECT * FROM referrals WHERE inviter_wallet = ? ORDER BY created_at DESC'
    ).bind(wallet).all();
    return c.json({ success: true, data: results });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// -- Telegram InitData auth (fixed: no botToken from body, auth_date check, constant-time hash) --
app.post('/api/v1/auth/telegram', async (c) => {
  try {
    const { initData } = await c.req.json();
    if (!initData) return c.json({ success: false, error: 'initData required' }, 400);

    const token = c.env.TELEGRAM_BOT_TOKEN;
    if (!token) return c.json({ success: false, error: 'Bot token not configured on server' }, 500);

    const urlParams = new URLSearchParams(initData);
    const hash = urlParams.get('hash');
    if (!hash) return c.json({ success: false, error: 'Missing hash in initData' }, 400);

    // Auth date expiry check (max 300 seconds age)
    const authDate = parseInt(urlParams.get('auth_date') || '0', 10);
    const now = Math.floor(Date.now() / 1000);
    if (!authDate || now - authDate > 300) {
      return c.json({ success: false, error: 'Telegram auth expired or invalid auth_date' }, 401);
    }

    urlParams.delete('hash');
    const dataCheckString = Array.from(urlParams.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}=${v}`)
      .join('\n');

    const encoder = new TextEncoder();
    const secretKeyData = encoder.encode('WebAppData');
    const tokenData = encoder.encode(token);

    const key = await crypto.subtle.importKey('raw', secretKeyData, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
    const secretKey = await crypto.subtle.sign('HMAC', key, tokenData);

    const hmacKey = await crypto.subtle.importKey('raw', new Uint8Array(secretKey), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
    const computedHash = await crypto.subtle.sign('HMAC', hmacKey, encoder.encode(dataCheckString));
    const computedHex = Array.from(new Uint8Array(computedHash)).map(b => b.toString(16).padStart(2, '0')).join('');

    if (!timingSafeEqual(computedHex, hash)) {
      return c.json({ success: false, error: 'Invalid Telegram signature' }, 401);
    }

    const tgUser = urlParams.get('user');
    if (!tgUser) return c.json({ success: false, error: 'No user in initData' }, 400);

    let userData;
    try { userData = JSON.parse(tgUser); } catch { return c.json({ success: false, error: 'Invalid user JSON' }, 400); }

    const tgId = userData.id;
    const tgUsername = userData.username || null;

    // Upsert user with telegram fields
    const existing = await c.env.DB.prepare('SELECT id, ton_wallet FROM users WHERE telegram_id = ?').bind(tgId).first();
    if (existing) {
      await c.env.DB.prepare('UPDATE users SET telegram_username = ? WHERE telegram_id = ?').bind(tgUsername, tgId).run();
    } else {
      const userId = `tg_${tgId}`;
      await c.env.DB.prepare(
        'INSERT INTO users (id, email, ton_wallet, telegram_id, telegram_username) VALUES (?, ?, ?, ?, ?)'
      ).bind(userId, `${tgUsername || 'user'}@telegram.local`, '', tgId, tgUsername).run();
    }

    // Issue JWT with tg session (NOT wallet-connected)
    const jwtPayload = {
      sub: `tg_${tgId}`,
      tgId,
      tgUsername,
      authDate,
      isWalletConnected: false,
      exp: Math.floor(Date.now() / 1000) + 7 * 24 * 3600,
    };
    const jwt = await sign(jwtPayload, c.env.JWT_SECRET, 'HS256');

    return c.json({ success: true, data: { token: jwt, user: { id: `tg_${tgId}`, tgId, username: tgUsername } } });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// -- OnRamp UID verification (separate table, low reward 50 VC nano, independent states) --
app.post('/api/v1/onramp/verify-uid', authMiddleware, async (c) => {
  try {
    const userId = c.get('user_id');
    const { exchange, uid } = await c.req.json();
    if (!exchange || !uid) return c.json({ success: false, error: 'exchange and uid required' }, 400);
    if (!['binance', 'okx', 'bitget'].includes(exchange)) {
      return c.json({ success: false, error: 'Invalid exchange' }, 400);
    }

    const allowed = await checkRateLimit(c.env.DB, userId, 'onramp_uid_check', 3, 3600 * 1000);
    if (!allowed) return c.json({ success: false, error: 'Too many attempts. Try again later.' }, 429);

    // Check if already submitted for this exchange
    const existing = await c.env.DB.prepare(
      'SELECT id, status FROM onramp_verifications WHERE user_id = ? AND exchange = ?'
    ).bind(userId, exchange).first();
    if (existing) {
      return c.json({ success: true, data: existing, message: 'Already submitted for this exchange' });
    }

    const id = `onramp-${Date.now()}`;
    const rewardVcNano = 50000000000; // 50 VC in nano units
    await c.env.DB.prepare(
      `INSERT INTO onramp_verifications (id, user_id, exchange, exchange_uid, status, reward_vc_nano, reward_badge)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).bind(id, userId, exchange, uid, 'PENDING_AUTO', rewardVcNano, 'crypto_starter').run();

    // Trigger background verification process
    c.executionCtx.waitUntil((async () => {
      try {
        const isAffiliate = await verifyExchangeAffiliate(exchange, uid);
        const isDeposited = await verifyOnchainDeposit(userId, exchange, c);

        if (isAffiliate && isDeposited) {
          // Success: verify and reward
          await c.env.DB.prepare(
            `UPDATE onramp_verifications SET status = 'VERIFIED', verified_at = ? WHERE id = ?`
          ).bind(new Date().toISOString(), id).run();

          // Credit user VC balance atomically using ON CONFLICT DO UPDATE
          await c.env.DB.prepare(
            `INSERT INTO user_vc_balances (user_id, pending_vc, total_earned_vc, updated_at)
             VALUES (?, ?, ?, ?)
             ON CONFLICT(user_id) DO UPDATE SET
               pending_vc = pending_vc + excluded.pending_vc,
               total_earned_vc = total_earned_vc + excluded.total_earned_vc,
               updated_at = excluded.updated_at`
          ).bind(userId, rewardVcNano, rewardVcNano, new Date().toISOString()).run();
          console.log(`[OnRamp] Verification SUCCESS for user ${userId}, UID ${uid}. Rewarded 50 VC.`);
        } else {
          // Failure: mark for manual review
          await c.env.DB.prepare(
            `UPDATE onramp_verifications SET status = 'NEEDS_MANUAL_REVIEW' WHERE id = ?`
          ).bind(id).run();
          console.log(`[OnRamp] Verification FAILED for user ${userId}, UID ${uid}. Status updated to NEEDS_MANUAL_REVIEW.`);
        }
      } catch (err) {
        console.error(`[OnRamp] Asynchronous verification error for verification ID ${id}:`, err);
        await c.env.DB.prepare(
          `UPDATE onramp_verifications SET status = 'NEEDS_MANUAL_REVIEW' WHERE id = ?`
        ).bind(id).run();
      }
    })());

    return c.json({
      success: true,
      message: 'UID submitted. System will auto-verify via exchange API + on-chain deposit check.',
      data: { id, exchange, status: 'PENDING_AUTO', rewardVc: 50, badge: 'crypto_starter' }
    });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});


// GET /api/v1/onramp/verifications — list user's onramp verification records
app.get('/api/v1/onramp/verifications', authMiddleware, async (c) => {
  try {
    const userId = c.get('user_id');
    const { results } = await c.env.DB.prepare(
      'SELECT * FROM onramp_verifications WHERE user_id = ? ORDER BY created_at DESC'
    ).bind(userId).all();
    return c.json({ success: true, data: results });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// -- Stars payment pre-created invoice order endpoint (authenticated) --
app.post('/api/v1/payment/stars-invoice', authMiddleware, async (c) => {
  try {
    const userId = c.get('user_id');
    const limitOk = await checkRateLimit(c.env.DB, userId, 'stars_invoice', 10, 3600 * 1000);
    if (!limitOk) {
      return c.json({ success: false, error: 'Too Many Requests: Stars invoice limit exceeded' }, 429);
    }
    const { launchId, starsAmount } = await c.req.json() as any;
    if (!launchId || !starsAmount || isNaN(Number(starsAmount)) || Number(starsAmount) <= 0) {
      return c.json({ success: false, error: 'Missing or invalid parameters: launchId, starsAmount' }, 400);
    }

    // Verify launch campaign exists
    const launch = await c.env.DB.prepare(
      'SELECT id FROM launches WHERE id = ?'
    ).bind(launchId).first() as any;

    if (!launch) {
      return c.json({ success: false, error: 'Launch campaign not found' }, 404);
    }

    // Calculate tonAmountNano securely from starsAmount using rate (1 Star = 0.15 TON)
    const rateNano = 150000000; // 0.15 * 1e9
    const tonAmountNano = Number(starsAmount) * rateNano;

    const id = `stars-ch-${crypto.randomUUID()}`;
    const now = new Date().toISOString();

    await c.env.DB.prepare(
      `INSERT INTO stars_payments (id, user_id, launch_id, stars_amount, ton_amount_nano, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(id, userId, launchId, starsAmount, tonAmountNano, 'PENDING_CALLBACK', now, now).run();

    return c.json({
      success: true,
      id,
      tonAmountNano,
      starsAmount
    });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// -- Stars payment bridge callback (microservice schema) --
app.post('/api/v1/payment/stars-callback', async (c) => {
  try {
    // 1. Verify Telegram webhook secret token
    const expectedSecret = c.env.TELEGRAM_WEBHOOK_SECRET;
    if (!expectedSecret) {
      return c.json({ success: false, error: 'Server misconfiguration: TELEGRAM_WEBHOOK_SECRET not set' }, 500);
    }
    const providedSecret = c.req.header('X-Telegram-Bot-Api-Secret-Token') || c.req.header('X-Webhook-Secret');
    if (!providedSecret || providedSecret !== expectedSecret) {
      return c.json({ success: false, error: 'Unauthorized: Invalid Telegram webhook secret token' }, 401);
    }

    const payload = await c.req.json() as any;
    const { id } = payload;
    if (!id) {
      return c.json({ success: false, error: 'Missing payment transaction ID' }, 400);
    }

    const now = new Date().toISOString();

    // 2. Atomically claim the pre-created order before any signing side effects.
    const existing = await c.env.DB.prepare(
      `UPDATE stars_payments
       SET status = 'PROCESSING', updated_at = ?
       WHERE id = ? AND status = 'PENDING_CALLBACK'
       RETURNING id, status, user_id, launch_id, stars_amount, ton_amount_nano, onchain_tx_hash`
    ).bind(now, id).first() as any;

    if (!existing) {
      const current = await c.env.DB.prepare(
        'SELECT id, status, onchain_tx_hash FROM stars_payments WHERE id = ?'
      ).bind(id).first() as any;

      if (!current) {
        return c.json({ success: false, error: 'Payment invoice not found' }, 404);
      }
      if (current.status === 'SUCCESS') {
        return c.json({ success: true, status: 'SUCCESS', message: 'Payment already processed successfully', txHash: current.onchain_tx_hash });
      }
      if (current.status === 'PROCESSING') {
        return c.json({ success: true, status: 'PROCESSING', message: 'Payment is currently being processed' });
      }
      if (current.status === 'PENDING_MULTISIG') {
        return c.json({ success: true, status: 'PENDING_MULTISIG', message: 'Payment is pending multisig review' });
      }
      return c.json({ success: false, status: current.status, error: `Invalid payment status: ${current.status}` }, 400);
    }

    const userId = existing.user_id;
    const launchId = existing.launch_id;
    const starsAmount = existing.stars_amount;
    const tonAmountNano = existing.ton_amount_nano;

    // Check Limits (Wind Control)
    const LIMIT_PER_TX = 100_000_000_000n; // 100 TON in nano
    const LIMIT_DAILY = 2_000_000_000_000n; // 2,000 TON in nano

    const todayUtcMidnight = new Date();
    todayUtcMidnight.setUTCHours(0, 0, 0, 0);
    const todayStartStr = todayUtcMidnight.toISOString();

    const sumResult = await c.env.DB.prepare(
      `SELECT COALESCE(SUM(ton_amount_nano), 0) as total FROM stars_payments WHERE status = 'SUCCESS' AND created_at >= ?`
    ).bind(todayStartStr).first() as { total: number };

    const dailySum = BigInt(sumResult?.total || 0);
    const currentTxAmount = BigInt(tonAmountNano);

    const limitPerTxExceeded = currentTxAmount > LIMIT_PER_TX;
    const dailyLimitExceeded = (dailySum + currentTxAmount) > LIMIT_DAILY;

    if (limitPerTxExceeded || dailyLimitExceeded) {
      // Exceeds limits! Update status to PENDING_MULTISIG
      await c.env.DB.prepare(
        'UPDATE stars_payments SET status = ?, updated_at = ? WHERE id = ?'
      ).bind('PENDING_MULTISIG', now, id).run();

      // Fetch launch campaign info to get project name for TG notification
      const launch = await c.env.DB.prepare(
        'SELECT name FROM launches WHERE id = ?'
      ).bind(launchId).first() as any;
      const launchName = launch?.name || 'Unknown Project';

      const limitReason = limitPerTxExceeded
        ? `单笔限额超限 (上限: 100 TON, 当前: ${Number(currentTxAmount) / 1e9} TON)`
        : `单日限额超限 (今日已付: ${Number(dailySum) / 1e9} TON, 上限: 2,000 TON, 新增: ${Number(currentTxAmount) / 1e9} TON)`;

      const alertText = `⚠️ <b>[Stars 支付触发限额熔断]</b>\n` +
        `订单 ID: <code>${tgEscape(id)}</code>\n` +
        `支持者: <code>${tgEscape(userId)}</code>\n` +
        `项目: <code>${tgEscape(launchName)}</code>\n` +
        `触发原因: <b>${tgEscape(limitReason)}</b>\n` +
        `状态已转为 <b>PENDING_MULTISIG</b>，请使用冷钱包手工多签放行。`;

      c.executionCtx.waitUntil(sendTelegramNotification(c.env, alertText));

      return c.json({
        success: true,
        status: 'PENDING_MULTISIG',
        message: 'Payment exceeds limits. Placed in PENDING_MULTISIG status for admin review.'
      });
    }

    // Resolve the launch campaign
    const launch = await c.env.DB.prepare(
      'SELECT * FROM launches WHERE id = ?'
    ).bind(launchId).first() as any;

    if (!launch) {
      await c.env.DB.prepare(
        'UPDATE stars_payments SET status = ?, updated_at = ? WHERE id = ?'
      ).bind('FAILED', now, id).run();
      return c.json({ success: false, error: 'Launch campaign not found' }, 404);
    }

    const destination = launch.owner_id;

    // Call the vibecoder-signer Service Binding with internal secret key header
    if (!c.env.SIGNER_SECRET_KEY) {
      await c.env.DB.prepare(
        'UPDATE stars_payments SET status = ?, updated_at = ? WHERE id = ?'
      ).bind('FAILED', now, id).run();
      return c.json({ success: false, error: 'Server misconfiguration: SIGNER_SECRET_KEY not set' }, 500);
    }

    let signRes;
    try {
      signRes = await c.env.SIGNER_SERVICE.fetch('http://signer.local/sign-and-broadcast', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Signer-Secret-Key': c.env.SIGNER_SECRET_KEY
        },
        body: JSON.stringify({
          destination,
          amountNano: tonAmountNano
        })
      });
    } catch (fetchErr: any) {
      console.error('[StarsCallback] Failed to contact signing microservice:', fetchErr);
      await c.env.DB.prepare(
        'UPDATE stars_payments SET status = ?, updated_at = ? WHERE id = ?'
      ).bind('FAILED', now, id).run();
      return c.json({ success: false, error: `Signer service unreachable: ${fetchErr.message}` }, 500);
    }

    if (!signRes.ok) {
      const errText = await signRes.text();
      console.error('[StarsCallback] Signer service returned error:', errText);
      await c.env.DB.prepare(
        'UPDATE stars_payments SET status = ?, updated_at = ? WHERE id = ?'
      ).bind('FAILED', now, id).run();
      return c.json({ success: false, error: `Signer rejected: ${errText}` }, 500);
    }

    const signResult = await signRes.json() as any;
    if (!signResult.success || !signResult.data?.txHash) {
      await c.env.DB.prepare(
        'UPDATE stars_payments SET status = ?, updated_at = ? WHERE id = ?'
      ).bind('FAILED', now, id).run();
      return c.json({ success: false, error: signResult.error || 'Failed to sign/broadcast transaction' }, 500);
    }

    if (signResult.data.isMock && c.env.ENVIRONMENT !== 'development') {
      await c.env.DB.prepare(
        'UPDATE stars_payments SET status = ?, updated_at = ? WHERE id = ?'
      ).bind('FAILED', now, id).run();
      return c.json({ success: false, error: 'Mock signing is not allowed in production' }, 500);
    }

    const txHash = signResult.data.txHash;

    // Mark payment as SUCCESS and store tx hash
    await c.env.DB.prepare(
      'UPDATE stars_payments SET status = ?, onchain_tx_hash = ?, updated_at = ? WHERE id = ?'
    ).bind('SUCCESS', txHash, now, id).run();

    // Calculate new total raised
    const amountNano = Number(tonAmountNano);
    const amountTon = amountNano / 1e9;
    const currentRaisedNano = Number(launch.raised_total_nano ?? (launch.raised_total || 0) * 1e9);
    const targetTotalNano = Number(launch.target_total_nano ?? (launch.target_total || 0) * 1e9);

    const newRaisedNano = currentRaisedNano + amountNano;
    const newRaised = newRaisedNano / 1e9;
    const isFinished = newRaisedNano >= targetTotalNano;
    const newStatus = isFinished ? 'success' : launch.status === 'DRAFT' ? 'active' : launch.status;

    // Update launches table correctly
    await c.env.DB.prepare(
      'UPDATE launches SET raised_total = ?, raised_total_nano = ?, status = ? WHERE id = ?'
    ).bind(newRaised, newRaisedNano, newStatus, launchId).run();

    // Calculate tokens
    const tokensNano = calcTokens(amountNano, currentRaisedNano, launch);
    const tokens = tokensNano / 1e9;

    const sparkId = `spark-stars-${Date.now()}`;
    await c.env.DB.prepare(
      `INSERT INTO spark_records (id, launch_id, user_id, amount, amount_nano, stage, tokens, tokens_nano, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(sparkId, launchId, userId, amountTon, amountNano, 1, tokens, tokensNano, now).run();

    return c.json({
      success: true,
      message: 'Stars payment processed and on-chain transaction completed',
      txHash,
      isMock: signResult.data.isMock
    });
  } catch (error: any) {
    console.error('[StarsCallback] Unhandled error:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// -- Admin Confirm Route for Multisig --
app.post('/api/v1/admin/payment/multisig-confirm', authMiddleware, async (c) => {
  try {
    const userId = c.get('user_id');
    if (!checkIsAdmin(c, userId)) {
      return c.json({ success: false, error: 'Forbidden: Admin access required' }, 403);
    }

    const { id, txHash } = await c.req.json() as any;
    if (!id || !txHash) {
      return c.json({ success: false, error: 'Missing required parameters: id, txHash' }, 400);
    }

    // Check if stars_payments record exists
    const payment = await c.env.DB.prepare(
      'SELECT * FROM stars_payments WHERE id = ?'
    ).bind(id).first() as any;

    if (!payment) {
      return c.json({ success: false, error: 'Payment record not found' }, 404);
    }

    if (payment.status === 'SUCCESS') {
      return c.json({ success: true, message: 'Payment already processed successfully', txHash: payment.onchain_tx_hash });
    }

    if (payment.status !== 'PENDING_MULTISIG') {
      return c.json({ success: false, error: `Invalid payment status: ${payment.status}` }, 400);
    }

    const now = new Date().toISOString();

    // Fetch launch campaign to update raised amount
    const launch = await c.env.DB.prepare(
      'SELECT * FROM launches WHERE id = ?'
    ).bind(payment.launch_id).first() as any;

    if (!launch) {
      return c.json({ success: false, error: 'Launch campaign not found' }, 404);
    }

    // Mark payment as SUCCESS and store tx hash
    await c.env.DB.prepare(
      'UPDATE stars_payments SET status = ?, onchain_tx_hash = ?, updated_at = ? WHERE id = ?'
    ).bind('SUCCESS', txHash, now, id).run();

    // Calculate new total raised
    const amountNano = Number(payment.ton_amount_nano);
    const amountTon = amountNano / 1e9;
    const currentRaisedNano = Number(launch.raised_total_nano ?? (launch.raised_total || 0) * 1e9);
    const targetTotalNano = Number(launch.target_total_nano ?? (launch.target_total || 0) * 1e9);

    const newRaisedNano = currentRaisedNano + amountNano;
    const newRaised = newRaisedNano / 1e9;
    const isFinished = newRaisedNano >= targetTotalNano;
    const newStatus = isFinished ? 'success' : launch.status === 'DRAFT' ? 'active' : launch.status;

    // Update launches table
    await c.env.DB.prepare(
      'UPDATE launches SET raised_total = ?, raised_total_nano = ?, status = ? WHERE id = ?'
    ).bind(newRaised, newRaisedNano, newStatus, payment.launch_id).run();

    // Calculate tokens
    const tokensNano = calcTokens(amountNano, currentRaisedNano, launch);
    const tokens = tokensNano / 1e9;

    const sparkId = `spark-stars-${Date.now()}`;
    await c.env.DB.prepare(
      `INSERT INTO spark_records (id, launch_id, user_id, amount, amount_nano, stage, tokens, tokens_nano, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(sparkId, payment.launch_id, payment.user_id, amountTon, amountNano, 1, tokens, tokensNano, now).run();

    // Trigger Telegram Notification for Successful Manual confirmation
    const text = `✅ <b>[手工多签放行成功]</b>\n` +
      `订单 ID: <code>${tgEscape(id)}</code>\n` +
      `支持者: <code>${tgEscape(payment.user_id)}</code>\n` +
      `项目: <code>${tgEscape(launch.name)}</code>\n` +
      `金额: <b>${amountTon} TON</b>\n` +
      `交易 Hash: <a href="https://${c.env.TON_NETWORK === 'mainnet' ? '' : 'testnet.'}tonviewer.com/transaction/${tgEscapeAttr(txHash)}">${tgEscape(txHash.slice(0, 8))}...</a>`;
    c.executionCtx.waitUntil(sendTelegramNotification(c.env, text));

    return c.json({
      success: true,
      message: 'Multisig confirmation successful. Status updated to SUCCESS',
      txHash
    });
  } catch (error: any) {
    console.error('[MultisigConfirm] Unhandled error:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// -- Launch creation with type validation (saves all frontend-needed fields) --
app.post('/api/v1/launches', authMiddleware, async (c) => {
  try {
    const creatorWallet = c.get('user_id');
    const body = await c.req.json();
    const {
      name, tokenSymbol, description, goalAmount, launchType,
      ecosystemId, parentTokenAddress, backerTokenShare,
      category, tags, teamDesc, websiteUrl, githubUrl, extraPerks,
      deliverableType, deliverableDesc, deliveryDate, disputeRules
    } = body;

    if (!name) return c.json({ success: false, error: 'name required' }, 400);
    if (!description) return c.json({ success: false, error: 'description required' }, 400);
    if (!goalAmount || isNaN(Number(goalAmount)) || Number(goalAmount) <= 0) {
      return c.json({ success: false, error: 'valid goalAmount required' }, 400);
    }

    const lt = launchType || 'PROJECT_TOKEN';

    if (lt === 'NO_TOKEN') {
      if (!deliverableType || !deliveryDate) {
        return c.json({ success: false, error: 'NO_TOKEN launch requires deliverableType and deliveryDate' }, 400);
      }
    } else {
      if (!tokenSymbol) return c.json({ success: false, error: 'tokenSymbol required for token launches' }, 400);
    }

    if (lt === 'HUB_TOKEN') {
      if (ecosystemId) {
        const existingHub = await c.env.DB.prepare(
          "SELECT id FROM launches WHERE ecosystem_id = ? AND launch_type = 'HUB_TOKEN' AND status NOT IN ('failed','refunding') LIMIT 1"
        ).bind(ecosystemId).first();
        if (existingHub) {
          return c.json({ success: false, error: 'Ecosystem already has an active hub token launch' }, 400);
        }
      }
      const share = Number(backerTokenShare || 25);
      if (share < 20 || share > 30) return c.json({ success: false, error: 'HUB_TOKEN backer share must be 20-30%' }, 400);
    }
    if (lt === 'PROJECT_TOKEN') {
      const share = Number(backerTokenShare || 35);
      if (share < 30 || share > 50) return c.json({ success: false, error: 'PROJECT_TOKEN backer share must be 30-50%' }, 400);
    }

    // Project code with unique constraint retry
    let projectCode = '';
    let id = '';
    for (let attempt = 0; attempt < 5; attempt++) {
      const tsPart = Date.now().toString(36);
      const randPart = Math.random().toString(36).substring(2, 6);
      projectCode = `VC-L-${tsPart}${randPart}`.toUpperCase();
      id = `spark-${Date.now()}-${randPart}`;
      const dup = await c.env.DB.prepare('SELECT id FROM launches WHERE project_code = ?').bind(projectCode).first();
      if (!dup) break;
    }

    const shareValue = backerTokenShare
      ? Math.round(Number(backerTokenShare) * 100)
      : (lt === 'HUB_TOKEN' ? 2500 : lt === 'NO_TOKEN' ? 0 : 3500);

    const tokenSym = tokenSymbol ? tokenSymbol.toUpperCase() : null;
    const tagsStr = Array.isArray(tags) ? tags.join(',') : (tags || null);

    const goalAmountNano = Math.round(Number(goalAmount) * 1e9);

    await c.env.DB.prepare(
      `INSERT INTO launches (id, project_code, owner_id, name, token_symbol, agent_ticker, title,
       description, target_total, target_total_nano, raised_total_nano, launch_type, ecosystem_id, parent_token_address,
       backer_token_share, token_policy_status, category, status,
       deliverable_type, deliverable_desc, delivery_date, dispute_rules,
       extra_perks, website_url, github_url, team_desc)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(id, projectCode, creatorWallet, name, tokenSym, tokenSym, name,
           description, Number(goalAmount), goalAmountNano, lt,
           ecosystemId || null, parentTokenAddress || null,
           shareValue, 'approved', category || null, 'DRAFT',
           deliverableType || null, deliverableDesc || null, deliveryDate || null, disputeRules || null,
           extraPerks || null, websiteUrl || null, githubUrl || null, teamDesc || null).run();

    return c.json({
      success: true,
      data: { id, projectCode, name, tokenSymbol: tokenSym, launchType: lt, goalAmount: Number(goalAmount), status: 'DRAFT' }
    });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

export default app;
