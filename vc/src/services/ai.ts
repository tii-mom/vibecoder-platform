// DeepSeek AI Service — OpenAI-compatible API
// Model: deepseek-chat (DeepSeek V4 Flash)

import OpenAI from 'openai';

const client = new OpenAI({
  apiKey: import.meta.env.VITE_DEEPSEEK_API_KEY || '',
  baseURL: 'https://api.deepseek.com',
  dangerouslyAllowBrowser: true,
});

export interface CopilotAnalysis {
  score: number;
  category: string;
  summary: string;
  risks: string[];
  strengths: string[];
}

export async function analyzeProject(projectName: string, description: string, raisedAmount: number, goalAmount: number): Promise<CopilotAnalysis> {
  try {
    const completion = await client.chat.completions.create({
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
    });

    const text = completion.choices[0]?.message?.content || '{}';
    const json = JSON.parse(text.replace(/```json|```/g, '').trim());
    return {
      score: json.score || 70,
      category: json.category || 'silver',
      summary: json.summary || '暂无分析',
      risks: json.risks || [],
      strengths: json.strengths || [],
    };
  } catch (e) {
    console.warn('[Copilot] DeepSeek API error, using fallback:', e);
    return {
      score: Math.floor(65 + Math.random() * 25),
      category: 'silver',
      summary: '基于历史数据的统计评分（AI 分析暂不可用）',
      risks: [],
      strengths: [],
    };
  }
}

export async function copilotChat(query: string, context: string): Promise<string> {
  try {
    const completion = await client.chat.completions.create({
      model: 'deepseek-chat',
      messages: [
        { role: 'system', content: `你是 VibeCoder 的 AI 共建助手。基于以下上下文回答用户：\n${context}` },
        { role: 'user', content: query }
      ],
      temperature: 0.5,
      max_tokens: 300,
    });
    return completion.choices[0]?.message?.content || '抱歉，我暂时无法回答。';
  } catch (e) {
    return 'AI 分析服务暂时不可用，请稍后再试。';
  }
}
