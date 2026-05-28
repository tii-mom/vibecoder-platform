import { useEffect, useState } from 'react';

const API_BASE = import.meta.env.VITE_API_URL || 'https://api.72h.lol';

export interface TelegramSession {
  token: string;
  tgId: number;
  username: string | null;
  isWalletConnected: boolean;
}

/** Wallet JWT — used for Spark, Launch, Claim, and other write operations */
export function getWalletJwt(): string | null {
  return localStorage.getItem('vc_session_jwt');
}

/** Telegram-only JWT — not wallet-bound, only for browsing */
export function getTgJwt(): string | null {
  return localStorage.getItem('vc_tg_jwt');
}

/** Readonly auth token — wallet JWT preferred, falls back to TG JWT for browsing */
export function getReadonlyJwt(): string | null {
  return getWalletJwt() || getTgJwt();
}

export function hasWalletJwt(): boolean {
  return !!getWalletJwt();
}

export function useTelegramAuth() {
  const [tgReady, setTgReady] = useState(false);
  const [tgUser, setTgUser] = useState<{ id: number; username?: string; firstName?: string } | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const tg = (window as any).Telegram?.WebApp;
    if (!tg) return;

    setTgReady(true);

    try {
      const initData = tg.initData || '';
      if (initData) {
        const params = new URLSearchParams(initData);
        const userStr = params.get('user');
        if (userStr) {
          const user = JSON.parse(userStr);
          setTgUser(user);
        }
      }
    } catch (_) {}
  }, []);

  const loginWithTelegram = async (): Promise<{ success: boolean; session?: TelegramSession; error?: string }> => {
    const tg = (window as any).Telegram?.WebApp;
    if (!tg) return { success: false, error: 'Not in Telegram Mini App' };

    const initData = tg.initData || '';
    if (!initData) return { success: false, error: 'No Telegram initData available' };

    try {
      const res = await fetch(`${API_BASE}/api/v1/auth/telegram`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ initData }),
      });

      const data = await res.json();
      if (data.success && data.data?.token) {
        // Store TG JWT in vc_tg_jwt (NOT vc_session_jwt) to avoid overwriting wallet session
        localStorage.setItem('vc_tg_jwt', data.data.token);
        localStorage.setItem('vc_tg_session', JSON.stringify({
          tgId: data.data.user.tgId,
          username: data.data.user.username,
          isWalletConnected: false,
        }));

        return {
          success: true,
          session: {
            token: data.data.token,
            tgId: data.data.user.tgId,
            username: data.data.user.username,
            isWalletConnected: false,
          }
        };
      }
      return { success: false, error: data.error || 'Telegram auth failed' };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };

  return { tgReady, tgUser, loginWithTelegram };
}

export function shareToTelegram(url: string, text: string) {
  const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`;
  const tg = (window as any).Telegram?.WebApp;
  if (tg && typeof tg.openTelegramLink === 'function') {
    tg.openTelegramLink(shareUrl);
  } else {
    window.open(shareUrl, '_blank');
  }
}
