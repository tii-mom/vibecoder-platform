import React, { useState } from 'react';
import { X, Zap, Users, Sparkles, AlertCircle } from 'lucide-react';
import { useSparkStore } from '../store/sparkStore';
import { useTranslation } from '../hooks/useTranslation';

interface SparkModalProps {
  project: any;
  profile: any;
  teamId?: string;
  onClose: () => void;
  onSuccess: (amount: number, teamId?: string) => void;
  updateProfile: (data: any) => void;
  investInProject: (id: string, amount: number, address: string) => boolean;
}

export default function SparkModal({
  project,
  profile,
  teamId,
  onClose,
  onSuccess,
  updateProfile,
  investInProject
}: SparkModalProps) {
  const { t } = useTranslation();
  const [amountInput, setAmountInput] = useState<string>('10');
  const [mode, setMode] = useState<'solo' | 'team'>('solo');
  const [errorMsg, setErrorMsg] = useState<string>('');

  const totalAvailable = profile?.balanceTON || 0;

  const handleQuickSelect = (val: number) => {
    setAmountInput(val.toString());
    setErrorMsg('');
  };

  const handleConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!profile) {
      setErrorMsg(t('detail.connectWalletFirst'));
      return;
    }

    let finalAmount = Number(amountInput);
    if (isNaN(finalAmount) || finalAmount <= 0) {
      setErrorMsg(t('detail.enterValidAmount'));
      return;
    }

    if (mode === 'solo' && finalAmount < project.minInvestment) {
      setErrorMsg(t('detail.minSoloAmount', { amount: project.minInvestment }));
      return;
    }

    if (mode === 'team' && finalAmount < 5) {
      setErrorMsg(t('detail.minTeamAmount'));
      return;
    }

    const realCost = finalAmount;

    if (realCost > profile.balanceTON) {
      setErrorMsg(t('detail.insufficientBalanceDetails', { cost: realCost.toFixed(1), balance: profile.balanceTON }));
      return;
    }

    let finalTeamId: string | undefined = undefined;

    if (mode === 'team') {
      if (teamId) {
        const success = useSparkStore.getState().joinTeamSpark(teamId, profile.walletAddress, finalAmount);
        if (!success) {
          setErrorMsg(t('detail.joinTeamFailed'));
          return;
        }
        finalTeamId = teamId;
      } else {
        const newTeam = useSparkStore.getState().createTeamSpark(
          project.id,
          profile.walletAddress,
          profile.username,
          20, // default target is 20 TON
          finalAmount
        );
        finalTeamId = newTeam.id;
      }
    } else {
      const isInvested = investInProject(project.id, finalAmount, profile.walletAddress);
      if (!isInvested) {
        setErrorMsg(t('detail.broadcastFailed'));
        return;
      }
    }

    updateProfile({
      balanceTON: Number((profile.balanceTON - realCost).toFixed(2)),
      hasGasConsumption: true
    });

    onSuccess(finalAmount, finalTeamId);
  };

  const [starsLoading, setStarsLoading] = useState(false);
  const handleStarsPay = async () => {
    setErrorMsg('');
    setStarsLoading(true);

    let finalAmount = Number(amountInput);
    if (isNaN(finalAmount) || finalAmount <= 0) {
      setErrorMsg(t('detail.enterValidAmount'));
      setStarsLoading(false);
      return;
    }

    const starsAmount = Math.ceil(finalAmount / 0.15);
    const API_BASE = import.meta.env.VITE_API_URL || 'https://api.72h.lol';

    try {
      // 1. Pre-create the invoice order (authenticated)
      const jwt = localStorage.getItem('vc_session_jwt') || '';
      const invoiceRes = await fetch(`${API_BASE}/api/v1/payment/stars-invoice`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${jwt}`
        },
        body: JSON.stringify({
          launchId: project.id,
          starsAmount
        })
      });

      if (!invoiceRes.ok) {
        const err = await invoiceRes.json() as any;
        throw new Error(err.error || t('detail.starsInvoiceFailed'));
      }

      const invoiceData = await invoiceRes.json() as any;
      const checkoutId = invoiceData.id;

      // 2. Call callback (simulating Telegram webhook trigger)
      const res = await fetch(`${API_BASE}/api/v1/payment/stars-callback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Telegram-Bot-Api-Secret-Token': '' // Must be configured server-side; frontend does not hold secrets
        },
        body: JSON.stringify({
          id: checkoutId
        })
      });

      if (!res.ok) {
        const err = await res.json() as any;
        throw new Error(err.error || t('detail.starsCallbackFailed'));
      }

      updateProfile({
        hasGasConsumption: false
      });

      onSuccess(finalAmount, undefined);
    } catch (e: any) {
      setErrorMsg(e.message || t('detail.starsFailed'));
    } finally {
      setStarsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className="w-full max-w-md bg-[#0A0C16]/95 border border-[#1E2241] rounded-3xl p-6 relative shadow-2xl space-y-5 animate-in zoom-in-95 duration-200 text-left"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 hover:bg-[#1E2241] text-gray-400 hover:text-white rounded-xl transition cursor-pointer"
        >
          <X size={16} />
        </button>

        {/* Title Header */}
        <div className="space-y-1.5 pr-8">
          <span className="text-[10px] font-mono text-[#8C84FF] tracking-wider block font-bold uppercase">
            {t('detail.sparkTerminal')}
          </span>
          <h2 className="text-lg font-black text-white leading-snug">
            {t('detail.sparkSupport', { name: project.agentName, ticker: project.agentTicker })}
          </h2>
          <p className="text-xs text-gray-400 leading-relaxed truncate">
            {project.title}
          </p>
        </div>

        {/* Three-Stage Pricing Display */}
        <div className="bg-[#121428] border border-[#21254F] rounded-2xl p-4 space-y-2.5">
          <div className="flex justify-between items-center">
            <span className="text-[10px] text-gray-500 font-mono tracking-wider">{t('detail.pricingTiers')}</span>
            <span className="p-0.5 px-2 bg-[#635BFF]/10 text-[#8B83FF] border border-[#635BFF]/25 rounded text-[8.5px] font-black animate-pulse">
              {t('detail.stageEarly')}
            </span>
          </div>

          <div className="space-y-1 text-left">
            <div className="text-xs font-black text-white">
              1 TON = <span className="text-[#8C84FF] font-black">100</span> ${project.agentTicker} {t('detail.tokensReward')} <span className="text-emerald-450 font-bold text-[10px]">{t('detail.extraReward')}</span>
            </div>
            <div className="flex items-center justify-between text-[9.5px] text-gray-400">
              <span>{t('detail.raisedAmount', { amount: project.raisedAmount })}</span>
              <span>{t('detail.goalAmount', { amount: project.goalAmount })}</span>
            </div>
            {/* Progress bar for Stage 1 */}
            <div className="h-1.5 w-full bg-[#05060F] rounded-full overflow-hidden">
              <div className="h-full bg-[#635BFF]" style={{ width: `${Math.min(100, (project.raisedAmount / project.goalAmount) * 100)}%` }} />
            </div>
          </div>

          {/* Collapsible Next Stages Preview */}
          <div className="border-t border-[#1C1E3C]/60 pt-2 mt-1">
            <details className="group">
              <summary className="text-[9.5px] text-gray-400 hover:text-white font-bold cursor-pointer list-none flex items-center justify-between">
                <span>{t('detail.nextStages')}</span>
                <span className="text-gray-500 group-open:rotate-180 transition-transform">&darr;</span>
              </summary>
              <div className="mt-2 space-y-1.5 text-[9.5px] text-gray-400 font-sans border-l border-[#21254F] pl-2.5 ml-1">
                <div>• <strong className="text-gray-300">{t('detail.stageMiddle')}</strong>：{t('detail.stagePreview', { rate: 80, goal: project.goalAmount * 2 })}</div>
                <div>• <strong className="text-gray-300">{t('detail.stageLate')}</strong>：{t('detail.stagePreview', { rate: 60, goal: project.goalAmount * 5 })}</div>
              </div>
            </details>
          </div>
        </div>

        {/* Solo or Team selectors */}
        <div className="grid grid-cols-2 bg-[#05060F] p-1 rounded-2xl border border-[#14162B]">
          <button
            type="button"
            onClick={() => setMode('solo')}
            className={`py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
              mode === 'solo'
                ? 'bg-[#1C1A3F] text-white border border-[#3C3A86]/20'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Zap size={13} className={mode === 'solo' ? 'text-yellow-400' : 'text-gray-400'} />
            <span>{t('detail.supportSolo')}</span>
          </button>
          <button
            type="button"
            onClick={() => setMode('team')}
            className={`py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
              mode === 'team'
                ? 'bg-[#1C1A3F] text-white border border-[#3C3A86]/20'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Users size={13} className={mode === 'team' ? 'text-sky-400' : 'text-gray-400'} />
            <span>{t('detail.supportTeam')}</span>
          </button>
        </div>

        {/* Input box */}
        <div className="space-y-2">
          <div className="flex justify-between items-center text-[11px] text-gray-400">
            <span>{t('detail.amountLabel')}</span>
            <span>{t('detail.availableBalance', { amount: totalAvailable })}</span>
          </div>
          <div className="relative flex items-center">
            <input
              type="number"
              value={amountInput}
              onChange={(e) => {
                setAmountInput(e.target.value);
                setErrorMsg('');
              }}
              placeholder={t('detail.minAmount', { amount: mode === 'solo' ? project.minInvestment : '5' })}
              className="w-full bg-[#121429] border border-[#21254F] focus:border-[#635BFF] py-3 px-4 pr-16 text-sm text-white rounded-2xl outline-none font-mono"
            />
            <span className="absolute right-4 text-xs font-bold text-gray-400 font-mono">TON</span>
          </div>

          {/* Quick selectors */}
          <div className="grid grid-cols-4 gap-2 pt-1">
            {[5, 10, 50, 100].map((val) => (
              <button
                key={val}
                type="button"
                onClick={() => handleQuickSelect(val)}
                className={`py-1.5 bg-[#121428]/40 hover:bg-[#1C1E38]/80 border text-[11px] font-mono font-bold rounded-xl transition cursor-pointer ${
                  Number(amountInput) === val
                    ? 'border-[#635BFF] text-white bg-[#635BFF]/10'
                    : 'border-[#191D3C] text-gray-400 hover:text-white'
                }`}
              >
                {val} TON
              </button>
            ))}
          </div>
        </div>



        {/* Error Message */}
        {errorMsg && (
          <div className="bg-red-950/15 border border-red-950/30 p-3 rounded-2xl flex items-start gap-2.5 text-xs text-red-400 leading-normal animate-in shake duration-100">
            <AlertCircle size={14} className="shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Submit Confirm Button */}
        <button
          onClick={handleConfirm}
          className="w-full py-3 bg-[#10B981] hover:bg-[#059669] text-black font-extrabold text-xs rounded-2xl shadow-xl shadow-[#10B981]/10 active:scale-98 transition flex items-center justify-center gap-1.5 cursor-pointer border border-[#34D399]/20"
        >
          <span>{t('detail.confirmSpark')}</span>
        </button>

        {/* Stars Payment Button */}
        <button
          onClick={handleStarsPay}
          disabled={starsLoading}
          className="w-full py-3 bg-[#FFB500] hover:bg-[#D49600] text-black font-extrabold text-xs rounded-2xl shadow-xl shadow-[#FFB500]/10 active:scale-98 transition flex items-center justify-center gap-1.5 cursor-pointer border border-[#FFD066]/20 disabled:opacity-50"
        >
          <span>⭐ {starsLoading ? t('detail.starsProcessing') : t('detail.payWithStars', { amount: Math.ceil(Number(amountInput) / 0.15 || 0) })}</span>
        </button>

        {/* Risk Disclaimer */}
        <p className="text-[9px] text-gray-550 leading-normal text-center font-sans">
          {t('detail.sandboxDisclaimer')}
        </p>
      </div>
    </div>
  );
}
