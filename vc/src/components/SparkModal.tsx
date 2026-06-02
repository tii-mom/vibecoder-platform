import React, { useEffect, useState } from 'react';
import { X, Zap, Users, Sparkles, AlertCircle } from 'lucide-react';
import { useTonConnectUI } from '@tonconnect/ui-react';
import { useSparkStore } from '../store/sparkStore';
import { useContractStore } from '../store/contractStore';

const TON_DECIMALS = 9;
const SPARK_OPCODE = 0x111;
const SIMPLE_COMMENT_OPCODE = 0;
const MAX_COMMENT_BYTES = 123; // 127 bytes cell limit minus 4-byte comment opcode.

type FundingMode = 'testnet' | 'sandbox';

const crc32cTable = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i += 1) {
    let crc = i;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc & 1) ? (0x82f63b78 ^ (crc >>> 1)) : (crc >>> 1);
    }
    table[i] = crc >>> 0;
  }
  return table;
})();

const crc32c = (bytes: Uint8Array) => {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc = crc32cTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
};

const toBase64 = (bytes: Uint8Array) => {
  let binary = '';
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
};

const createSingleCellPayload = (data: Uint8Array) => {
  if (data.length > 127) {
    throw new Error('TON payload cell is too large.');
  }

  const header = new Uint8Array([
    0xb5, 0xee, 0x9c, 0x72, // BOC magic
    0x41, // has_crc32c + 1-byte counters/sizes, no index
    0x01, // 1-byte total cell-size offset
    0x01, // cells count
    0x01, // roots count
    0x00, // absent cells
    data.length + 2, // total cell size: descriptors + data
    0x00, // root cell index
    0x00, // cell descriptor: ordinary cell, 0 refs
    data.length * 2, // full-byte bitstring descriptor
  ]);
  const withoutCrc = new Uint8Array(header.length + data.length);
  withoutCrc.set(header);
  withoutCrc.set(data, header.length);

  const checksum = crc32c(withoutCrc);
  const boc = new Uint8Array(withoutCrc.length + 4);
  boc.set(withoutCrc);
  boc[withoutCrc.length] = checksum & 0xff;
  boc[withoutCrc.length + 1] = (checksum >>> 8) & 0xff;
  boc[withoutCrc.length + 2] = (checksum >>> 16) & 0xff;
  boc[withoutCrc.length + 3] = (checksum >>> 24) & 0xff;
  return toBase64(boc);
};

const uint32ToBytes = (value: number) => new Uint8Array([
  (value >>> 24) & 0xff,
  (value >>> 16) & 0xff,
  (value >>> 8) & 0xff,
  value & 0xff,
]);

const createSparkOpcodePayload = () => {
  const data = new Uint8Array(12);
  data.set(uint32ToBytes(SPARK_OPCODE));
  return createSingleCellPayload(data);
};

const createCommentPayload = (comment: string) => {
  const encoder = new TextEncoder();
  const commentBytes = encoder.encode(comment).slice(0, MAX_COMMENT_BYTES);
  const data = new Uint8Array(4 + commentBytes.length);
  data.set(uint32ToBytes(SIMPLE_COMMENT_OPCODE));
  data.set(commentBytes, 4);
  return createSingleCellPayload(data);
};

const parseTonToNano = (value: string) => {
  const normalized = value.trim();
  if (!/^\d+(\.\d{0,9})?$/.test(normalized)) {
    throw new Error('请输入最多 9 位小数的 TON 金额。');
  }
  const [whole, fraction = ''] = normalized.split('.');
  const nano = BigInt(whole) * 10n ** BigInt(TON_DECIMALS)
    + BigInt(fraction.padEnd(TON_DECIMALS, '0'));
  if (nano <= 0n) {
    throw new Error('请输入有效的共建支持金额。');
  }
  return nano.toString();
};

const findEarlyFundraisingAddress = (contracts: Array<{ contract_name: string; address: string }>) => {
  const preferredNames = ['EARLY_FUNDRAISING', 'LAUNCH_CAMPAIGN', 'EARLY_SUB', 'EARLY_SUBSCRIPTION'];
  return preferredNames
    .map((name) => contracts.find((contract) => contract.contract_name?.toUpperCase() === name)?.address)
    .find(Boolean);
};

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
  const [fundingMode, setFundingMode] = useState<FundingMode>('testnet');
  const [hasRequestedContracts, setHasRequestedContracts] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [tonConnectUI] = useTonConnectUI();
  const { contracts, loading: contractsLoading, fetchContracts } = useContractStore();

  const trialBalance = profile?.trialBalance ?? 0;
  const isTrialEligible = profile && !profile.hasUsedTrial && trialBalance > 0;
  const totalAvailable = fundingMode === 'sandbox' ? trialBalance : (profile?.balanceTON || 0);

  useEffect(() => {
    if (contracts.length === 0 && !contractsLoading && !hasRequestedContracts) {
      setHasRequestedContracts(true);
      fetchContracts();
    }
  }, [contracts.length, contractsLoading, fetchContracts, hasRequestedContracts]);

  useEffect(() => {
    if (!isTrialEligible && fundingMode === 'sandbox') {
      setFundingMode('testnet');
    }
  }, [fundingMode, isTrialEligible]);

  const handleQuickSelect = (val: number) => {
    setAmountInput(val.toString());
    setErrorMsg('');
  };

  const completeLocalSpark = (finalAmount: number) => {
    let finalTeamId: string | undefined = undefined;

    if (mode === 'team') {
      if (teamId) {
        const success = useSparkStore.getState().joinTeamSpark(teamId, profile.walletAddress, finalAmount);
        if (!success) {
          throw new Error('加入拼单失败，该拼单可能已结束或已满额。');
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
        throw new Error('交易记录失败，请重试。');
      }
    }

    return finalTeamId;
  };

  const sendTestnetSpark = async (finalAmount: number) => {
    if (!tonConnectUI?.connected) {
      tonConnectUI?.openModal?.();
      throw new Error('请先通过 TonConnect 连接测试网钱包。');
    }

    if (useContractStore.getState().contracts.length === 0) {
      await useContractStore.getState().fetchContracts();
    }

    const contractAddress = findEarlyFundraisingAddress(useContractStore.getState().contracts);
    if (!contractAddress) {
      throw new Error('未找到平台 EARLY_FUNDRAISING 测试网募资合约地址，请稍后重试。');
    }

    const amount = parseTonToNano(amountInput);
    const isLaunchCampaignContract = useContractStore.getState().contracts.some((contract) => {
      const name = contract.contract_name?.toUpperCase();
      return contract.address === contractAddress && (name === 'EARLY_FUNDRAISING' || name === 'LAUNCH_CAMPAIGN');
    });
    const comment = `VibeCoder Spark ${project.id} ${finalAmount} TON ${mode}`;
    const payload = isLaunchCampaignContract ? createSparkOpcodePayload() : createCommentPayload(comment);

    await tonConnectUI.sendTransaction({
      validUntil: Math.floor(Date.now() / 1000) + 10 * 60,
      messages: [
        {
          address: contractAddress,
          amount,
          payload,
        },
      ],
    });
  };

  const handleConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setErrorMsg('');

    if (!profile) {
      setErrorMsg('请先连接您的 TON 钱包。');
      return;
    }

    const finalAmount = Number(amountInput);
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

    if (fundingMode === 'sandbox' && !isTrialEligible) {
      setErrorMsg('当前账号没有可用体验金，请切换为真实 testnet Spark。');
      return;
    }

    if (fundingMode === 'sandbox' && finalAmount > trialBalance) {
      setErrorMsg(`体验金模拟 Spark 只能使用体验金余额，当前体验金为 ${trialBalance} TON。真实 testnet Spark 请切换到链上模式。`);
      return;
    }

    setIsSubmitting(true);
    try {
      if (fundingMode === 'testnet') {
        await sendTestnetSpark(finalAmount);
        const finalTeamId = completeLocalSpark(finalAmount);

        updateProfile({
          hasGasConsumption: true,
        });

        onSuccess(finalAmount, finalTeamId);
        return;
      }

      const finalTeamId = completeLocalSpark(finalAmount);
      updateProfile({
        trialBalance: Number((trialBalance - finalAmount).toFixed(2)),
        hasUsedTrial: true,
      });

      onSuccess(finalAmount, finalTeamId);
    } catch (error) {
      setErrorMsg(error instanceof Error ? error.message : 'Spark 发送失败，请在钱包中确认交易状态后重试。');
    } finally {
      setIsSubmitting(false);
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

        {/* Funding mode selectors */}
        <div className="space-y-2">
          <div className="grid grid-cols-2 bg-[#05060F] p-1 rounded-2xl border border-[#14162B]">
            <button
              type="button"
              onClick={() => {
                setFundingMode('testnet');
                setErrorMsg('');
              }}
              className={`py-2 rounded-xl text-[11px] font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                fundingMode === 'testnet'
                  ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-400/20'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              真实 testnet Spark
            </button>
            <button
              type="button"
              disabled={!isTrialEligible}
              onClick={() => {
                if (!isTrialEligible) return;
                setFundingMode('sandbox');
                setErrorMsg('');
              }}
              className={`py-2 rounded-xl text-[11px] font-bold transition flex items-center justify-center gap-1.5 ${
                fundingMode === 'sandbox'
                  ? 'bg-amber-500/15 text-amber-300 border border-amber-400/20 cursor-pointer'
                  : isTrialEligible
                    ? 'text-gray-400 hover:text-white cursor-pointer'
                    : 'text-gray-600 cursor-not-allowed'
              }`}
            >
              体验金模拟 Spark
            </button>
          </div>
          <p className="text-[9.5px] text-gray-500 leading-relaxed">
            {fundingMode === 'testnet'
              ? '链上模式会通过 TonConnect 向测试网募资合约发送真实 testnet TON；交易提交成功前不会更新 Spark 状态，也不会扣减本地体验金。'
              : '模拟模式只消耗平台体验金，不发起 TonConnect 交易，也不会与真实 testnet TON 余额混扣。'}
          </p>
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
            <span>{fundingMode === 'sandbox' ? '体验金余额' : '测试网余额'}: {totalAvailable} TON</span>
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
          disabled={isSubmitting}
          className={`w-full py-3 bg-[#10B981] hover:bg-[#059669] text-black font-extrabold text-xs rounded-2xl shadow-xl shadow-[#10B981]/10 active:scale-98 transition flex items-center justify-center gap-1.5 border border-[#34D399]/20 ${
            isSubmitting ? 'opacity-70 cursor-wait' : 'cursor-pointer'
          }`}
        >
          <span>{isSubmitting ? '✦ 等待钱包提交交易...' : fundingMode === 'testnet' ? '✦ 确认发送真实 testnet Spark' : '✦ 确认体验金模拟 Spark'}</span>
        </button>

        {/* Risk Disclaimer */}
        <p className="text-[9px] text-gray-550 leading-normal text-center font-sans">
          {fundingMode === 'testnet'
            ? '真实 testnet Spark 会提交 TON 测试网交易；请在钱包中确认收款合约、金额与 payload。'
            : '体验金模拟 Spark 仅为 VibeCoder 沙箱测试环境模拟，不代表真实主网主权代币扣拨。'}
        </p>
      </div>
    </div>
  );
}
