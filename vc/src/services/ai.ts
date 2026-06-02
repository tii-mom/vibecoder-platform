export interface CopilotAnalysis {
  score: number;
  category: string;
  summary: string;
  risks: string[];
  strengths: string[];
  unavailable?: boolean;
}

import { getReadonlyJwt } from './telegramAuth';

const API_BASE = import.meta.env.VITE_API_URL || 'https://api.72h.lol';

function getHeaders(): HeadersInit {
  const token = getReadonlyJwt();
  return {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
  };
}


export async function analyzeProject(projectName: string, description: string, raisedAmount: number, goalAmount: number): Promise<CopilotAnalysis> {
  try {
    const res = await fetch(`${API_BASE}/api/v1/ai/analyze`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ projectName, description, raisedAmount, goalAmount })
    });
    if (!res.ok) throw new Error(`API error: ${res.statusText}`);
    const data = await res.json() as any;
    if (!data.success) throw new Error(data.error || 'Failed analysis');
    return data.data;
  } catch (e) {
    console.warn('[Copilot] Backend AI proxy error:', e);
    return {
      score: 0,
      category: 'unavailable',
      summary: 'AI analysis is unavailable. Please try again later.',
      risks: [],
      strengths: [],
      unavailable: true,
    };
  }
}

export async function copilotChat(query: string, context: string): Promise<string> {
  try {
    const res = await fetch(`${API_BASE}/api/v1/ai/chat`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ query, context })
    });
    if (!res.ok) throw new Error(`API error: ${res.statusText}`);
    const data = await res.json() as any;
    if (!data.success) throw new Error(data.error || 'Failed chat');
    return data.data;
  } catch (e) {
    return 'AI 分析服务暂时不可用，请稍后再试。';
  }
}
