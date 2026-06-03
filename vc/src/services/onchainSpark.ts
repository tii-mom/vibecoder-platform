const API_BASE = import.meta.env.VITE_API_URL || 'https://api.72h.lol';

function getAuthHeaders(): HeadersInit {
  const jwt = localStorage.getItem('vc_session_jwt');
  return {
    'Content-Type': 'application/json',
    ...(jwt ? { 'Authorization': `Bearer ${jwt}` } : {}),
  };
}

export interface PreparedSpark {
  launchId: string;
  campaignAddress: string;
  amountNano: string;
  op: string;
  validUntil: number;
  payloadBase64: string;
  message: {
    address: string;
    amount: string;
    payload: string;
  };
}

export interface SubmitSparkResult {
  status: 'PENDING_ONCHAIN' | 'CONFIRMED' | 'FAILED' | string;
  eventId: string;
  txHash: string | null;
  duplicate?: boolean;
}

export async function prepareOnchainSpark(
  launchId: string,
  amount: number,
): Promise<PreparedSpark> {
  const res = await fetch(
    `${API_BASE}/api/v1/launches/${encodeURIComponent(launchId)}/spark/prepare?amount=${amount}`,
    { headers: getAuthHeaders(), signal: AbortSignal.timeout(8000) },
  );
  const data = await res.json() as any;
  if (!data.success || !data.data) {
    throw new Error(data.error || 'Failed to prepare Spark transaction');
  }
  return data.data as PreparedSpark;
}

export async function submitOnchainSpark(
  launchId: string,
  payload: {
    amountNano: string;
    txBoc?: string;
    clientRef?: string;
  },
): Promise<SubmitSparkResult> {
  const res = await fetch(
    `${API_BASE}/api/v1/launches/${encodeURIComponent(launchId)}/spark/submit`,
    {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        amountNano: payload.amountNano,
        txBoc: payload.txBoc || null,
      }),
      signal: AbortSignal.timeout(8000),
    },
  );
  const data = await res.json() as any;
  if (!data.success || !data.data) {
    throw new Error(data.error || 'Failed to submit Spark transaction');
  }
  return data.data as SubmitSparkResult;
}
