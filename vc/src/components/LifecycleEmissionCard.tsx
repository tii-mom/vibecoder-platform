import React, { useState } from 'react';
import { Coins, Users, Award, ShieldCheck, Zap, Sparkles, HelpCircle } from 'lucide-react';
import { useTranslation } from '../hooks/useTranslation';

import { useSparkStore } from '../store/sparkStore';

interface LifecycleEmissionCardProps {
  project: any;
  profile: any;
  isConnected: boolean;
  connectWallet: (addr?: string) => void;
  updateProfile: (data: any) => void;
  addFunds: (amount: number) => void;
  investInProject: (id: string, amount: number, address: string) => boolean | Promise<boolean>;
  teamId?: string;
  onSuccess?: (amount: number, teamId?: string) => void;
}

export default function LifecycleEmissionCard({
  project,
  profile,
  isConnected,
  connectWallet,
  updateProfile,
  addFunds,
  investInProject,
  teamId,
  onSuccess
}: LifecycleEmissionCardProps) {
  const { t } = useTranslation();
  const isFinished = project.status === 'success';

  // State managers
  const [investAmount, setInvestAmount] = useState<string>('20');
  const [success, setSuccess] = useState(false);
  const [errorText, setErrorText] = useState('');
  const [investmentMode, setInvestmentMode] = useState<'solo' | 'team'>('solo');
  const [trialClaimedNotice, setTrialClaimedNotice] = useState<string>('');

  // Swap states
  const [swapType, setSwapType] = useState<'buy' | 'sell'>('buy');
  const [swapAmount, setSwapAmount] = useState<string>('20');
  const [swapSuccess, setSwapSuccess] = useState(false);
  const [swapSuccessMsg, setSwapSuccessMsg] = useState('');
  const [swapErrText, setSwapErrText] = useState('');

  // Simulated remaining days
  const getRemainingDays = () => {
    const end = new Date(project.endTime).getTime();
    const diff = end - Date.now();
    if (diff <= 0) return 0;
    return Math.ceil(diff / (24 * 3600 * 1000));
  };
  const remDays = getRemainingDays();

  // Local storage inventory helper for swaps
  const getLocalInventory = (): Record<string, number> => {
    if (typeof window === 'undefined') return {};
    const data = localStorage.getItem('vc_inventory');
    return data ? JSON.parse(data) : { "tok-1": 500, "tok-2": 150 };
  };

  const saveLocalInventory = (inv: Record<string, number>) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('vc_inventory', JSON.stringify(inv));
    }
  };

  const localInventory = getLocalInventory();
  const tokenBalance = localInventory[project.id] || 0;

  const handleWalletFallback = () => {
    connectWallet();
  };

  const handleSwap = (e: React.FormEvent) => {
    e.preventDefault();
    setSwapErrText('');
    setSwapSuccess(false);

    if (!isConnected || !profile) {
      handleWalletFallback();
      return;
    }

    const val = Number(swapAmount);
    if (isNaN(val) || val <= 0) {
      setSwapErrText(t('lifecycle.errorSwapInput'));
      return;
    }

    if (swapType === 'buy') {
      if (profile.balanceTON < val) {
        setSwapErrText(t('lifecycle.errorSwapBuyBalance', { balance: profile.balanceTON }));
        return;
      }

      const boughtTokens = Number((val / project.tokenPrice).toFixed(2));

      updateProfile({
        balanceTON: Number((profile.balanceTON - val).toFixed(2))
      });

      const nextInv = { ...localInventory, [project.id]: (localInventory[project.id] || 0) + boughtTokens };
      saveLocalInventory(nextInv);

      setSwapSuccessMsg(t('lifecycle.swapBuySuccess', { val, tokens: boughtTokens, ticker: project.agentTicker }));
      setSwapSuccess(true);
      setSwapAmount('20');
    } else {
      if (tokenBalance < val) {
        setSwapErrText(t('lifecycle.errorSwapSellBalance', { ticker: project.agentTicker, balance: tokenBalance }));
        return;
      }

      const receivedTON = Number((val * project.tokenPrice).toFixed(2));

      updateProfile({
        balanceTON: Number((profile.balanceTON + receivedTON).toFixed(2))
      });

      const nextInv = { ...localInventory, [project.id]: Math.max(0, Number((tokenBalance - val).toFixed(2))) };
      saveLocalInventory(nextInv);

      setSwapSuccessMsg(t('lifecycle.swapSellSuccess', { val, ticker: project.agentTicker, ton: receivedTON }));
      setSwapSuccess(true);
      setSwapAmount('10');
    }
  };

  const handleInvest = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorText('');

    if (!isConnected || !profile) {
      handleWalletFallback();
      return;
    }

    const amount = Number(investAmount);
    if (isNaN(amount) || amount <= 0) {
      setErrorText(t('lifecycle.errorValidAmount'));
      return;
    }

    if (investmentMode !== 'team' && amount < project.minInvestment) {
      setErrorText(t('lifecycle.errorMinInvestment', { amount: project.minInvestment }));
      return;
    }
    if (investmentMode === 'team' && amount < 5) {
      setErrorText(t('lifecycle.errorMinTeamAmount'));
      return;
    }

    if (profile.balanceTON < amount) {
      setErrorText(t('lifecycle.errorInsufficientBalance', { balance: profile.balanceTON }));
      return;
    }

    let finalTeamId: string | undefined = undefined;

    if (investmentMode === 'team') {
      if (teamId) {
        const success = useSparkStore.getState().joinTeamSpark(teamId, profile.walletAddress, amount);
        if (!success) {
          setErrorText(t('lifecycle.errorJoinTeamFailed'));
          return;
        }
        finalTeamId = teamId;
      } else {
        const newTeam = useSparkStore.getState().createTeamSpark(
          project.id,
          profile.walletAddress,
          profile.username,
          20,
          amount
        );
        finalTeamId = newTeam.id;
      }
    } else {
      const isInvested = await investInProject(project.id, amount, profile.walletAddress);
      if (!isInvested) {
        setErrorText(t('lifecycle.errorBroadcastFailed'));
        return;
      }
    }

    updateProfile({
      balanceTON: Number((profile.balanceTON - amount).toFixed(2))
    });
    setSuccess(true);
    setTimeout(() => {
      setSuccess(false);
    }, 5000);

    onSuccess?.(amount, finalTeamId);
  };

  return (
    <div className="bg-[#0A0C16] border border-[#171A30] rounded-3xl p-6 space-y-5 shadow-2xl relative select-none text-left">
      <div className="flex items-center justify-between border-b border-[#161D38] pb-3">
        <span className="text-[10px] font-mono text-gray-400 tracking-wider block font-bold uppercase">
          {t('lifecycle.matrixTitle')}
        </span>
        <span className={`px-2 py-0.5 rounded text-[9px] font-mono ${
          isFinished
            ? 'bg-purple-950/40 text-purple-400 border border-purple-900/40'
            : 'bg-emerald-950/40 text-emerald-400 border border-emerald-900/40'
        }`}>
          {isFinished ? t('lifecycle.finishedStage') : t('lifecycle.activeStage')}
        </span>
      </div>

      {/* Spreading dynamic layout */}
      <div className="space-y-4">
        {/* Core numbers display */}
        <div className="bg-[#121428]/45 border border-[#191D3C] p-4 rounded-2xl flex justify-between items-center">
          <div>
            <span className="text-[10px] text-gray-400 block font-sans">
              {isFinished ? t('lifecycle.raisedAmountCompleted') : t('lifecycle.raisedAmountGoal')}
            </span>
            <span className="text-lg font-black font-mono text-sky-450 block mt-0.5">
              {project.raisedAmount.toLocaleString()} <span className="text-xs text-gray-500">TON</span>
            </span>
            <span className="text-[10px] text-gray-500 font-mono">
              {t('lifecycle.targetLabel')}: {project.goalAmount.toLocaleString()} TON
            </span>
          </div>
          <div className="text-right">
            <span className="text-[10px] text-gray-400 block font-sans">
              {isFinished ? t('lifecycle.swapPrice') : t('lifecycle.seedPrice')}
            </span>
            <span className="bg-[#080916] border border-slate-800 text-white px-2 py-1 rounded-lg text-xs font-mono font-bold block mt-1">
              {project.tokenPrice > 0 ? `1 TON = ${Math.round(1 / project.tokenPrice).toLocaleString()} ${project.agentTicker}` : t('lifecycle.noTokenSale')}
            </span>
          </div>
        </div>

        {/* Progress Bar with rounded boundaries */}
        <div className="space-y-1">
          <div className="flex justify-between text-[10px] font-mono text-gray-400">
            <span>{t('lifecycle.popularity')}</span>
            <span>{project.progress}%</span>
          </div>
          <div className="w-full h-1.5 bg-[#080916] rounded-full overflow-hidden p-px">
            <div
              className="h-full bg-gradient-to-r from-sky-400 to-indigo-500 rounded-full transition-all duration-300"
              style={{ width: `${Math.min(100, project.progress)}%` }}
            />
          </div>
          <div className="flex justify-between text-[9px] text-gray-550 font-mono">
            <span>{t('lifecycle.backersCount', { count: project.investorCount })}</span>
            <span>{isFinished ? t('lifecycle.raisedCompleted') : t('lifecycle.remainingDays', { days: remDays })}</span>
          </div>
        </div>

        {/* Post-funding token distribution model bar */}
        <div className="space-y-2 pt-2 border-t border-[#13162F]/80">
          <span className="text-[10px] text-gray-400 block font-sans">
            {t('lifecycle.modelTitle')}
          </span>
          <div className="w-full h-4 bg-[#080916] rounded-md overflow-hidden flex text-[8.5px] font-mono font-bold border border-slate-800 select-none">
            <div className="h-full bg-emerald-500 text-black flex items-center justify-center font-black" style={{ width: '45%' }} title="早期注资 45%">
              {t('lifecycle.stageEarly')}
            </div>
            <div className="h-full bg-[#635BFF] text-white flex items-center justify-center" style={{ width: '25%' }} title="AMM 二级流通 Swap 25%">
              {t('lifecycle.stageSwap')}
            </div>
            <div className="h-full bg-sky-400 text-black flex items-center justify-center" style={{ width: '20%' }} title="开发者里程碑合规锁仓 20%">
              {t('lifecycle.stageGov')}
            </div>
            <div className="h-full bg-amber-500 text-black flex items-center justify-center font-black" style={{ width: '10%' }} title="拼购极客推广 10%">
              {t('lifecycle.stagePromo')}
            </div>
          </div>

          {/* Legend indicators */}
          <div className="grid grid-cols-2 gap-x-2 gap-y-1 pt-0.5 text-[9.5px] text-gray-500 font-mono">
            <div className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-sm bg-emerald-500 block" />
              <span>{t('lifecycle.descEarly')}</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-sm bg-[#635BFF] block" />
              <span>{t('lifecycle.descSwap')}</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-sm bg-sky-400 block" />
              <span>{t('lifecycle.descGov')}</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-sm bg-amber-500 block" />
              <span>{t('lifecycle.descPromo')}</span>
            </div>
          </div>
        </div>

        {/* Shiyuzhu + HuangZheng gamified engagement boards (Grouped compactly to reduce visual clutter) */}
        {!isFinished && (
          <div className="bg-[#10132B]/20 border border-indigo-950/50 rounded-2xl p-3.5 space-y-2 text-xs leading-normal">
            <div className="flex items-center gap-1.5 text-amber-400 font-mono text-[9px] font-semibold tracking-wider">
              <Award size={12} className="text-amber-400 animate-pulse" />
              <span>{t('lifecycle.privilegeTitle')}</span>
            </div>
            <span className="text-[9.5px] text-gray-400 block leading-normal">
              {t('lifecycle.privilegeDesc', { address: 'EQA7_first_spark_user' })}
            </span>

            <div className="border-t border-dashed border-indigo-950/50 pt-1.5 flex justify-between items-center">
              <span className="text-sky-400 font-mono text-[9px] font-semibold flex items-center gap-1">
                <Users size={11} />
                <span>{t('lifecycle.teamSparkTitle')}</span>
              </span>
              <span className="bg-sky-950/50 border border-sky-900/50 text-sky-300 text-[8.5px] font-bold px-1.5 py-0.2 rounded font-mono">
                Team Spark: 4
              </span>
            </div>
            <span className="text-[9px] text-gray-500 block leading-normal">
              {t('lifecycle.teamSparkDesc', { amount: 35 })}
            </span>
          </div>
        )}

        {/* Dynamic transaction / capital interaction section */}
        <div className="pt-4 border-t border-[#131630]">
          {!isFinished ? (
            /* PRE-FUNDED CAPITAL INPUT CORE */
            <form onSubmit={handleInvest} className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white uppercase flex items-center gap-1">
                  <Zap size={13} className="text-emerald-400 animate-pulse" />
                  <span>{t('lifecycle.supportTerminal')}</span>
                </span>
                <span className="text-[9px] text-[#A699FF] font-mono">
                  {t('lifecycle.minInvestment', { amount: project.minInvestment })}
                </span>
              </div>

              {/* Direct Solo vs Syndicated Joint choice tabs */}
              <div className="grid grid-cols-2 bg-[#05060F] p-1 rounded-xl border border-[#17192C]">
                <button
                  type="button"
                  onClick={() => setInvestmentMode('solo')}
                  className={`py-1 rounded-lg text-xs font-bold transition ${
                    investmentMode === 'solo'
                      ? 'bg-[#1C1A3F] text-white border border-[#3C3A86]/30'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  {t('lifecycle.directSolo')}
                </button>
                <button
                  type="button"
                  onClick={() => setInvestmentMode('team')}
                  className={`py-1 rounded-lg text-xs font-bold transition flex items-center justify-center gap-0.5 ${
                    investmentMode === 'team'
                      ? 'bg-[#1C1A3F] text-white border border-[#3C3A86]/30'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  <Users size={12} className="text-sky-400 shrink-0" />
                  <span>{t('lifecycle.geekTeam')}</span>
                </button>
              </div>

              {/* Input block */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center text-[10px] text-gray-500">
                  <span>{t('lifecycle.sparkAmount')}</span>
                  <span>{t('lifecycle.walletBalance', { balance: profile?.balanceTON || 0 })}</span>
                </div>
                <div className="relative flex items-center">
                  <input
                    type="number"
                    value={investAmount}
                    onChange={(e) => setInvestAmount(e.target.value)}
                    placeholder={t('lifecycle.inputPlaceholder', { amount: investmentMode === 'solo' ? project.minInvestment : '5' })}
                    className="w-full bg-[#121429] border border-[#21254F] focus:border-[#635BFF] py-2 px-3 pr-12 text-xs text-white rounded-xl outline-none font-mono"
                  />
                  <span className="absolute right-3.5 text-[10px] font-black text-gray-400 font-mono">TON</span>
                </div>
              </div>

              {/* Gifting / sandbox fallback trigger */}
              <div className="bg-[#181110]/30 border border-amber-950/20 p-2.5 rounded-xl space-y-1 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-amber-400 font-bold text-[10px]">{t('lifecycle.noTestnetCoins')}</span>
                  <button
                    type="button"
                    onClick={() => {
                      addFunds(15);
                      setTrialClaimedNotice(t('lifecycle.trialClaimedSuccess'));
                      setTimeout(() => setTrialClaimedNotice(''), 3500);
                    }}
                    className="px-1.5 py-0.5 bg-amber-500/10 hover:bg-amber-500/20 text-[#D29E2E] rounded text-[9px] font-bold border border-amber-500/15"
                  >
                    {t('lifecycle.claimTrial')}
                  </button>
                </div>
                <p className="text-[9.5px] text-gray-500 leading-relaxed">
                  {t('lifecycle.trialDesc')}
                </p>
                {trialClaimedNotice && (
                  <p className="text-emerald-400 font-bold block mt-1 animate-in slide-in-from-bottom-2 duration-100 text-[9.5px]">{trialClaimedNotice}</p>
                )}
              </div>

              {errorText && (
                <div className="text-[10px] bg-red-950/15 text-red-400 border border-red-950/30 p-2.5 rounded-xl leading-relaxed">
                  ⚠️ {errorText}
                </div>
              )}

              {success && (
                <div className="text-[10px] bg-emerald-950/25 text-emerald-400 border border-emerald-950/40 p-3 rounded-xl space-y-1 leading-normal">
                  <p className="font-bold">{t('lifecycle.successTitle')}</p>
                  <p className="text-[9px] text-gray-450 leading-relaxed">
                    {t('lifecycle.successDesc')}
                  </p>
                </div>
              )}

              {project.syncStatus === 'pending_sync' && (
                <div className="text-[10px] bg-blue-950/25 text-blue-400 border border-blue-950/40 p-3 rounded-xl space-y-1 leading-normal animate-pulse">
                  <p className="font-bold">{t('lifecycle.syncPendingTitle')}</p>
                  <p className="text-[9px] text-gray-400 leading-relaxed">
                    {t('lifecycle.syncPendingDesc')}
                  </p>
                </div>
              )}

              {project.syncStatus === 'failed' && (
                <div className="text-[10px] bg-red-950/25 text-red-400 border border-red-950/40 p-3 rounded-xl space-y-1 leading-normal">
                  <p className="font-bold">{t('lifecycle.syncFailedTitle')}</p>
                  <p className="text-[9px] text-gray-400 leading-relaxed">
                    {t('lifecycle.syncFailedDesc')}
                  </p>
                </div>
              )}

              <button
                type="submit"
                className="w-full py-2.5 bg-[#10B981] hover:bg-[#059669] text-black font-extrabold text-xs rounded-xl shadow-lg shadow-[#10B981]/10 active:scale-97 transition text-center cursor-pointer border border-[#34D399]/15"
              >
                {t('lifecycle.confirmButton')}
              </button>
            </form>
          ) : (
            /* SECONDARY AMM SWAP EXCHANGE TERMINAL */
            <div className="bg-[#121429]/40 border border-[#21254F]/50 p-5 rounded-2xl text-center space-y-3 font-sans">
              <Sparkles size={20} className="text-sky-400 mx-auto animate-pulse" />
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">{t('lifecycle.swapNotOpenTitle')}</h3>
              <p className="text-[10px] text-gray-400 leading-relaxed">
                {t('lifecycle.swapNotOpenDesc')}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
