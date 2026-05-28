import { useState, useEffect } from 'react';
import { useUserStore } from '../store/userStore';
import { Gift, Copy, Check, Info, Shield, HelpCircle, ArrowRight, Wallet, ArrowUpRight } from 'lucide-react';
import { useTranslation } from '../hooks/useTranslation';

const API_BASE = import.meta.env.VITE_API_URL || 'https://api.72h.lol';

interface ExchangeInfo {
  id: string;
  name: string;
  color: string;
  borderColor: string;
  textColor: string;
  btnBg: string;
  logoBg: string;
  tag: string;
  description: string;
  code: string;
  link: string;
  features: string[];
}

const EXCHANGES: ExchangeInfo[] = [
  {
    id: 'binance', name: 'Binance', color: 'from-[#F3BA2F]/10 to-[#F3BA2F]/2',
    borderColor: 'border-[#F3BA2F]/20 hover:border-[#F3BA2F]/40', textColor: 'text-[#F3BA2F]',
    btnBg: 'bg-[#F3BA2F] text-black hover:bg-[#e0ab27]', logoBg: 'bg-[#F3BA2F]/10',
    tag: 'Excellent Depth', description: '',
    code: 'GRO_56789_XKB3R', link: 'https://www.bsmkweb.cc/referral/tier-reward/20260520/claim?ref=GRO_56789_XKB3R',
    features: []
  },
  {
    id: 'okx', name: 'OKX', color: 'from-white/5 to-white/1',
    borderColor: 'border-white/10 hover:border-white/25', textColor: 'text-white',
    btnBg: 'bg-white text-black hover:bg-gray-200', logoBg: 'bg-white/10',
    tag: 'Preferred TON', description: '',
    code: '4987351', link: 'https://www.oqmmpieralz.com/join/4987351',
    features: []
  },
  {
    id: 'bitget', name: 'Bitget', color: 'from-[#00F0FF]/10 to-[#00F0FF]/2',
    borderColor: 'border-[#00F0FF]/20 hover:border-[#00F0FF]/40', textColor: 'text-[#00F0FF]',
    btnBg: 'bg-[#00F0FF] text-black hover:bg-[#00d8e6]', logoBg: 'bg-[#00F0FF]/10',
    tag: 'Fast Trade', description: '',
    code: 'S3H7NVAN', link: 'https://www.bjxnyj.com/zh-CN/referral/register?clacCode=S3H7NVAN',
    features: []
  }
];

export default function OnRampPage() {
  const { isConnected, walletAddress } = useUserStore();
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const { t } = useTranslation();

  // UID verification state
  const [selectedEx, setSelectedEx] = useState<string>('okx');
  const [exchangeUid, setExchangeUid] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info', text: string } | null>(null);
  const [completedExchanges, setCompletedExchanges] = useState<Set<string>>(new Set());

  // Load completed verifications from onramp_verifications table
  useEffect(() => {
    if (!walletAddress) return;
    const checkVerifications = async () => {
      try {
        const token = localStorage.getItem('vc_wallet_jwt');
        if (!token) return;
        const res = await fetch(`${API_BASE}/api/v1/onramp/verifications`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        if (data.success && data.data) {
          const done = new Set<string>();
          data.data.forEach((v: any) => {
            if (v.status === 'VERIFIED' || v.status === 'PENDING_AUTO' || v.status === 'NEEDS_MANUAL_REVIEW') {
              done.add(v.exchange);
            }
          });
          setCompletedExchanges(done);
        }
      } catch (e) { console.error('Failed to load verifications status:', e); }
    };
    checkVerifications();
  }, [walletAddress]);

  const handleCopy = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleSubmitUid = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isConnected || !walletAddress) {
      setMessage({ type: 'error', text: t('onramp.errConnectWallet') });
      return;
    }
    if (!exchangeUid.trim()) {
      setMessage({ type: 'error', text: t('onramp.errEnterUid') });
      return;
    }

    setSubmitting(true);
    setMessage(null);

    try {
      const token = localStorage.getItem('vc_wallet_jwt');
      if (!token) throw new Error(t('onramp.errSessionExpired'));

      const res = await fetch(`${API_BASE}/api/v1/onramp/verify-uid`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ exchange: selectedEx, uid: exchangeUid }),
        signal: AbortSignal.timeout(15000)
      });

      const data = await res.json();

      if (data.success) {
        setMessage({
          type: 'success',
          text: t('onramp.successSubmitted')
        });
        setCompletedExchanges(prev => new Set([...prev, `bounty-${selectedEx}-reg`]));
        setExchangeUid('');
      } else if (res.status === 429) {
        setMessage({ type: 'error', text: t('onramp.errRateLimit') });
      } else {
        setMessage({ type: 'error', text: data.error || t('common.error') });
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || t('common.error') });
    } finally {
      setSubmitting(false);
    }
  };

  const isExchangeDone = (exId: string) => completedExchanges.has(`bounty-${exId}-reg`);

  const localizedExchanges = EXCHANGES.map(ex => {
    switch (ex.id) {
      case 'binance':
        return {
          ...ex,
          name: t('onramp.binanceName'),
          tag: t('onramp.binanceTag'),
          description: t('onramp.binanceDesc'),
          features: [t('onramp.featC2CDepth'), t('onramp.featAntiFreeze'), t('onramp.featTonFast')]
        };
      case 'okx':
        return {
          ...ex,
          name: t('onramp.okxName'),
          tag: t('onramp.okxTag'),
          description: t('onramp.okxDesc'),
          features: [t('onramp.featLowFee'), t('onramp.featWeb3Wallet'), t('onramp.featFastReg')]
        };
      case 'bitget':
        return {
          ...ex,
          name: 'Bitget',
          tag: t('onramp.bitgetTag'),
          description: ex.description || t('onramp.bitgetDesc'),
          features: [t('onramp.featNewAirdrop'), t('onramp.featFreeC2C'), t('onramp.featFastKyc')]
        };
      default:
        return ex;
    }
  });

  return (
    <div className="space-y-10 max-w-5xl mx-auto text-left animate-in fade-in duration-300 select-none">
      {/* Header */}
      <div className="space-y-1.5 border-b border-[#14162B] pb-6">
        <span className="text-[10px] font-mono text-[#8C84FF] tracking-wider block font-bold uppercase">
          ✦ crypto starter · fiat on-ramp guide
        </span>
        <h1 className="text-2xl font-black text-white leading-none">{t('onramp.pageTitle')}</h1>
        <p className="text-xs text-gray-400 max-w-2xl leading-relaxed font-sans">
          {t('onramp.pageDesc')}
          <strong className="text-amber-400">{t('onramp.invitePromo')}</strong>
        </p>
      </div>

      {/* Wallet not connected */}
      {!isConnected && (
        <div className="p-5 bg-amber-500/5 border border-amber-500/15 rounded-2xl flex items-start gap-3">
          <Info className="text-amber-400 shrink-0 mt-0.5" size={18} />
          <div className="text-xs text-amber-300/80 leading-normal">
            <strong>{t('onramp.regNoticeWallet')}</strong>：{t('onramp.regNoticeWalletDesc')}
          </div>
        </div>
      )}

      {/* Exchange Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {localizedExchanges.map((ex) => {
          const isCopied = copiedId === ex.id;
          const done = isExchangeDone(ex.id);

          return (
            <div key={ex.id}
              className={`bg-[#0A0C16] border rounded-2xl p-5 flex flex-col justify-between space-y-4 relative overflow-hidden transition-all duration-300 ${ex.borderColor} bg-gradient-to-br ${ex.color}`}>
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-mono text-gray-400 bg-black/40 px-2 py-0.5 rounded-full font-bold uppercase">{ex.tag}</span>
                {done && (
                  <span className="text-[8px] font-mono bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded font-bold uppercase">{t('onramp.submittedTag')}</span>
                )}
              </div>
              <div className="space-y-2">
                <h3 className="text-base font-black text-white flex items-center gap-2">
                  <span className={`w-2.5 h-2.5 rounded-full ${done ? 'bg-emerald-400' : ''}`} style={{ backgroundColor: done ? undefined : 'currentColor' }} />
                  {ex.name}
                </h3>
                <p className="text-xs text-gray-400 leading-relaxed min-h-[64px] font-sans">{ex.description}</p>
              </div>
              <div className="space-y-1.5 pt-1 border-t border-[#1C1F3A]/60">
                {ex.features.map((f, i) => (
                  <div key={i} className="flex items-center gap-1.5 text-[10px] text-gray-500 font-sans"><Check size={10} className="text-emerald-500" /><span>{f}</span></div>
                ))}
              </div>
              <div className="bg-[#05060F] border border-[#161833] rounded-xl p-3 flex items-center justify-between gap-2">
                <div className="text-left"><div className="text-[8px] text-gray-500 uppercase font-mono">{t('onramp.promoRefCode')}</div><div className="text-xs font-mono font-black text-white select-all">{ex.code}</div></div>
                <button onClick={() => handleCopy(ex.code, ex.id)}
                  className={`p-1.5 rounded-lg border transition-all ${isCopied ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-[#121429] border-[#23284A] text-gray-400 hover:text-white'}`}>
                  {isCopied ? <Check size={12} /> : <Copy size={12} />}
                </button>
              </div>
              <a href={ex.link} target="_blank" rel="noopener noreferrer"
                className={`w-full py-2.5 rounded-xl text-center text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer font-sans ${ex.btnBg}`}>
                <span>{t('onramp.registerCTA')}</span><ArrowUpRight size={13} />
              </a>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Step-by-step tutorial */}
        <div className="bg-[#090A13] border border-[#181A35] rounded-3xl p-6 lg:col-span-2 space-y-5">
          <h3 className="text-sm font-black text-white uppercase tracking-wider text-left flex items-center gap-2">
            <HelpCircle size={16} className="text-[#8B83FF]" />
            <span>{t('onramp.tutorialTitle')}</span>
          </h3>
          <div className="space-y-5 text-left text-xs text-gray-400 leading-relaxed pr-2 font-sans">
            <div className="flex gap-4">
              <span className="w-6 h-6 rounded-full bg-[#1A1C3C] text-white flex items-center justify-center font-mono font-bold shrink-0 text-[10px]">01</span>
              <div className="space-y-1">
                <h4 className="font-bold text-white text-xs">{t('onramp.step1Title')}</h4>
                <p>{t('onramp.step1Desc')}<br />
                <span className="text-amber-400 font-semibold text-[10px]">{t('onramp.step1Warn')}</span></p>
              </div>
            </div>
            <div className="flex gap-4">
              <span className="w-6 h-6 rounded-full bg-[#1A1C3C] text-white flex items-center justify-center font-mono font-bold shrink-0 text-[10px]">02</span>
              <div className="space-y-1">
                <h4 className="font-bold text-white text-xs">{t('onramp.step2Title')}</h4>
                <p>{t('onramp.step2Desc')}</p>
              </div>
            </div>
            <div className="flex gap-4">
              <span className="w-6 h-6 rounded-full bg-[#1A1C3C] text-white flex items-center justify-center font-mono font-bold shrink-0 text-[10px]">03</span>
              <div className="space-y-1">
                <h4 className="font-bold text-white text-xs">{t('onramp.step3Title')}</h4>
                <p>{t('onramp.step3Desc')}<br />
                <span className="text-amber-400 font-semibold font-mono text-[10px]">{t('onramp.step3Warn')}</span></p>
              </div>
            </div>
            <div className="flex gap-4">
              <span className="w-6 h-6 rounded-full bg-[#1A1C3C] text-white flex items-center justify-center font-mono font-bold shrink-0 text-[10px]">04</span>
              <div className="space-y-1">
                <h4 className="font-bold text-white text-xs">{t('onramp.step4Title')}</h4>
                <p>{t('onramp.step4Desc')}</p>
              </div>
            </div>
          </div>

          {/* Safety reminders */}
          <div className="bg-amber-500/5 border border-amber-500/15 rounded-2xl p-4 flex items-start gap-3 mt-4">
            <Shield size={16} className="text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-1.5 text-[10px] text-amber-300/70 leading-relaxed font-sans">
              <h4 className="font-bold text-amber-400 text-xs">{t('onramp.securityRulesTitle')}</h4>
              <ul className="list-disc pl-4 space-y-1">
                <li>{t('onramp.secRule1')}</li>
                <li>{t('onramp.secRule2')}</li>
                <li>{t('onramp.secRule3')}</li>
                <li>{t('onramp.secRule4')}</li>
              </ul>
            </div>
          </div>
        </div>

        {/* UID Verification Panel */}
        <div className="bg-[#090A13] border border-[#181A35] rounded-3xl p-6 flex flex-col justify-between space-y-6">
          <div className="space-y-4">
            <h3 className="text-sm font-black text-white uppercase tracking-wider text-left flex items-center gap-2">
              <Gift size={15} className="text-emerald-400" />
              <span>{t('onramp.claimVcTitle')}</span>
            </h3>
            <p className="text-[11px] text-gray-500 leading-relaxed text-left font-sans">
              {t('onramp.claimVcDesc')}
            </p>

            <form onSubmit={handleSubmitUid} className="space-y-4 text-left">
              <div className="space-y-1">
                <label className="text-[10px] text-gray-500 font-mono font-bold uppercase">{t('onramp.selectExchange')}</label>
                <select value={selectedEx} onChange={(e) => setSelectedEx(e.target.value)}
                  className="w-full bg-[#05060F] border border-[#161833] rounded-xl px-3 py-2.5 text-xs text-white appearance-none cursor-pointer focus:border-[#635BFF] outline-none transition font-sans">
                  <option value="okx">{t('onramp.okxName')}</option>
                  <option value="binance">{t('onramp.binanceName')}</option>
                  <option value="bitget">Bitget</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-gray-500 font-mono font-bold uppercase">{t('onramp.exchangeUidLabel')}</label>
                <input type="text" placeholder={t('onramp.exchangeUidPlaceholder')} value={exchangeUid}
                  onChange={(e) => setExchangeUid(e.target.value.replace(/\D/g, ''))}
                  className="w-full bg-[#05060F] border border-[#161833] rounded-xl px-3 py-2.5 text-xs text-white placeholder-gray-600 focus:border-[#635BFF] outline-none transition font-mono" />
              </div>

              {/* Message */}
              {message && (
                <div className={`p-3 rounded-xl border text-[11px] leading-relaxed font-sans ${
                  message.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' :
                  message.type === 'info' ? 'bg-blue-500/10 border-blue-500/20 text-blue-400' :
                  'bg-rose-500/10 border-rose-500/20 text-rose-400'
                }`}>
                  {message.text}
                </div>
              )}

              <button type="submit" disabled={submitting || isExchangeDone(selectedEx)}
                className="w-full py-3 bg-[#635BFF] hover:bg-[#5245EE] disabled:opacity-50 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-lg shadow-[#635BFF]/10 active:scale-[0.98] font-sans">
                <Gift size={13} />
                {submitting ? t('onramp.verifyingCTA') : isExchangeDone(selectedEx) ? t('onramp.completedCTA') : t('onramp.submitUidCTA')}
              </button>
            </form>
          </div>

          <div className="pt-4 border-t border-[#161833] space-y-2">
            <div className="text-[9px] text-gray-600 font-sans text-center leading-normal">
              {t('onramp.autoProcessFlow')}<br />
              {t('onramp.autoProcessSteps')}
            </div>
            <div className="text-[8px] text-gray-700 font-sans text-center leading-normal border-t border-[#161833] pt-3 mt-2">
              {t('onramp.appealNotice')}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
