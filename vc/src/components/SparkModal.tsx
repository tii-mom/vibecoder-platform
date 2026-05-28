import React, { useState } from 'react';
import { X, Zap, Users, Sparkles, AlertCircle } from 'lucide-react';
import { useSparkStore } from '../store/sparkStore';

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
  const [amountInput, setAmountInput] = useState<string>('10');
  const [mode, setMode] = useState<'solo' | 'team'>('solo');
  const [errorMsg, setErrorMsg] = useState<string>('');

  const trialBalance = profile?.trialBalance ?? 0;
  const isTrialEligible = profile && !profile.hasUsedTrial && trialBalance > 0;
  const totalAvailable = (profile?.balanceTON || 0) + trialBalance;

  const handleQuickSelect = (val: number) => {
    setAmountInput(val.toString());
    setErrorMsg('');
  };

  const handleConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!profile) {
      setErrorMsg('请先连接您的 TON 钱包。');
      return;
    }

    let finalAmount = Number(amountInput);
    if (isNaN(finalAmount) || finalAmount <= 0) {
      setErrorMsg('请输入有效的共建支持金额。');
      return;
    }

    if (mode === 'solo' && finalAmount < project.minInvestment) {
      setErrorMsg(`起投额为 ${project.minInvestment} TON。`);
      return;
    }

    if (mode === 'team' && finalAmount < 5) {
      setErrorMsg('拼团起购额最少为 5 TON。');
      return;
    }

    // Clean trial balance logic: trial funds are used first, then real balance
    const currentTrialBalance = profile.trialBalance ?? 0;
    const trialUsed = Math.min(finalAmount, currentTrialBalance);
    const realCost = finalAmount - trialUsed;

    if (realCost > profile.balanceTON) {
      setErrorMsg(`余额不足。需要额外支付 ${realCost.toFixed(1)} TON，当前可用余额: ${profile.balanceTON} TON。`);
      return;
    }

    let finalTeamId: string | undefined = undefined;

    if (mode === 'team') {
      if (teamId) {
        const success = useSparkStore.getState().joinTeamSpark(teamId, profile.walletAddress, finalAmount);
        if (!success) {
          setErrorMsg('加入拼单失败，该拼单可能已结束或已满额。');
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
        setErrorMsg('交易广播失败，请重试。');
        return;
      }
    }

    updateProfile({
      balanceTON: Number((profile.balanceTON - realCost).toFixed(2)),
      trialBalance: Number((currentTrialBalance - trialUsed).toFixed(2)),
      hasUsedTrial: trialUsed > 0 ? true : profile.hasUsedTrial,
      hasGasConsumption: realCost > 0 ? true : (profile.hasGasConsumption || false)
    });
    
    onSuccess(finalAmount, finalTeamId);
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
            ✦ Spark Project backer terminal
          </span>
          <h2 className="text-lg font-black text-white leading-snug">
            支持共建 {project.agentName} (${project.agentTicker})
          </h2>
          <p className="text-xs text-gray-400 leading-relaxed truncate">
            {project.title}
          </p>
        </div>

        {/* Three-Stage Pricing Display */}
        <div className="bg-[#121428] border border-[#21254F] rounded-2xl p-4 space-y-2.5">
          <div className="flex justify-between items-center">
            <span className="text-[10px] text-gray-500 font-mono tracking-wider">PRICING TIERS</span>
            <span className="p-0.5 px-2 bg-[#635BFF]/10 text-[#8B83FF] border border-[#635BFF]/25 rounded text-[8.5px] font-black animate-pulse">
              🔥 Stage 1 早鸟 (Early Bird)
            </span>
          </div>

          <div className="space-y-1 text-left">
            <div className="text-xs font-black text-white">
              1 TON = <span className="text-[#8C84FF] font-black">100</span> ${project.agentTicker} 代币 <span className="text-emerald-450 font-bold text-[10px]">+10% 额外奖励</span>
            </div>
            <div className="flex items-center justify-between text-[9.5px] text-gray-400">
              <span>已筹额度: {project.raisedAmount} TON</span>
              <span>目标额度: {project.goalAmount} TON</span>
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
                <span>🔍 下一阶段定价预览 (Next Stages)</span>
                <span className="text-gray-500 group-open:rotate-180 transition-transform">&darr;</span>
              </summary>
              <div className="mt-2 space-y-1.5 text-[9.5px] text-gray-400 font-sans border-l border-[#21254F] pl-2.5 ml-1">
                <div>• <strong className="text-gray-300">Stage 2 中段</strong>：1 TON = 80 代币 (目标 {project.goalAmount * 2} TON)</div>
                <div>• <strong className="text-gray-300">Stage 3 末段</strong>：1 TON = 60 代币 (目标 {project.goalAmount * 5} TON)</div>
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
            <span>直接独立支持</span>
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
            <span>极客拼单共建</span>
          </button>
        </div>

        {/* Input box */}
        <div className="space-y-2">
          <div className="flex justify-between items-center text-[11px] text-gray-400">
            <span>支持共建数额 (TON)</span>
            <span>可用余额: {totalAvailable} TON{trialBalance > 0 ? ` (含体验金 ${trialBalance})` : ''}</span>
          </div>
          <div className="relative flex items-center">
            <input
              type="number"
              value={amountInput}
              onChange={(e) => {
                setAmountInput(e.target.value);
                setErrorMsg('');
              }}
              placeholder={`起额: ${mode === 'solo' ? project.minInvestment : '5'}`}
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

        {/* Trial fund banner */}
        {isTrialEligible && (
          <div className="bg-amber-500/5 border border-amber-500/20 p-3 rounded-2xl flex items-start gap-2.5">
            <Sparkles size={16} className="text-amber-400 shrink-0 mt-0.5 animate-pulse" />
            <div className="space-y-0.5">
              <span className="text-[10px] font-black text-amber-400 block uppercase font-mono tracking-wider">
                🎁 首次体验：使用 {trialBalance} TON 共建体验金
              </span>
              <p className="text-[9.5px] text-gray-450 leading-relaxed">
                平台已为您自动垫付首笔 <strong>{trialBalance} TON</strong> 共建体验金，结算分配解锁门槛为持仓实存资产 ≥ 5 TON 且完成一次链上交互。
              </p>
            </div>
          </div>
        )}

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
          <span>✦ 确认发送星火共建资金</span>
        </button>

        {/* Risk Disclaimer */}
        <p className="text-[9px] text-gray-550 leading-normal text-center font-sans">
          此动作仅为 VibeCoder 沙箱测试环境模拟，不代表真实主网主权代币扣拨。
        </p>
      </div>
    </div>
  );
}
