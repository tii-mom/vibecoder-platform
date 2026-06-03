import { useState, useEffect } from 'react';
import { Gift, ExternalLink, Wallet, Clock, Zap, AlertTriangle, Lock } from 'lucide-react';
import { useUserStore } from '../store/userStore';
import { getWalletJwt, getReadonlyJwt } from '../services/telegramAuth';
import { useTonConnectUI } from '@tonconnect/ui-react';
import { beginCell, Address, toNano, Cell } from '@ton/core';
import { useTranslation } from '../hooks/useTranslation';
import { getTonapiBase } from '../services/tonNetwork';

const API_BASE = import.meta.env.VITE_API_URL || 'https://api.72h.lol';

interface BountyTask {
  id: string;
  creatorName: string;
  creatorTier: number;
  creatorType: string;
  taskType: string;
  title: string;
  reward: string;
  rewardToken: string;
  totalSlots: number;
  completedSlots: number;
  chain?: string;
  url: string;
}

const MOCK_TASKS: BountyTask[] = [
  { id: 'b1', creatorName: 'OmniSocial', creatorTier: 0, creatorType: 'PROJECT', taskType: 'FOLLOW_X', title: '关注 @OmniSocial 官方 X 账号', reward: '2 VC', rewardToken: 'VC', totalSlots: 200, completedSlots: 87, url: 'https://x.com/omnisocial' },
  { id: 'b2', creatorName: 'CodeVibe', creatorTier: 0, creatorType: 'PROJECT', taskType: 'JOIN_TG', title: '加入 CodeVibe Telegram 开发者社区', reward: '3 VC', rewardToken: 'VC', totalSlots: 150, completedSlots: 42, url: 'https://t.me/codevibe' },
  { id: 'b3', creatorName: 'TON Dogs', creatorTier: 1, creatorType: 'EXTERNAL_TON', taskType: 'RETWEET', title: '转发 TON Dogs NFT 官宣推文', reward: '50 $TDOG', rewardToken: '$TDOG', totalSlots: 500, completedSlots: 234, chain: 'TON', url: 'https://x.com/tondogs' },
  { id: 'b4', creatorName: 'MetaGame', creatorTier: 2, creatorType: 'EXTERNAL_OTHER', taskType: 'JOIN_DISCORD', title: '加入 MetaGame Discord 并验证', reward: '100 $META', rewardToken: '$META', totalSlots: 300, completedSlots: 45, chain: 'BSC', url: 'https://discord.gg/metagame' },
  { id: 'b5', creatorName: 'TrendBot', creatorTier: 0, creatorType: 'PROJECT', taskType: 'SPARK', title: 'Spark TrendBot 项目 ≥ 10 TON', reward: '5 VC', rewardToken: 'VC', totalSlots: 100, completedSlots: 23, url: '#/launch/spark-3' },
];

const mapBountyTask = (r: any): BountyTask => ({
  id: r.id,
  creatorName: r.creator_id || '项目方',
  creatorTier: Number(r.creator_tier || 0),
  creatorType: r.creator_type || 'EXTERNAL_TON',
  taskType: r.task_type || 'FOLLOW_X',
  title: r.title,
  reward: r.is_token_reward
    ? `${r.token_reward_amount} ${r.reward_token || r.token_reward_type}`
    : `${r.reward_amount} VC`,
  rewardToken: r.reward_token || 'VC',
  totalSlots: Number(r.total_slots || 0),
  completedSlots: Number(r.completed_slots || 0),
  chain: r.token_reward_chain || 'TON',
  url: r.target_url || '',
});

export default function BountyPage() {
  const { walletAddress } = useUserStore();
  const [tonConnectUI] = useTonConnectUI();
  const { t, language } = useTranslation();

  const bountyTypes: Record<string, string> = {
    FOLLOW_X: language === 'zh' ? 'X 关注' : language === 'ko' ? 'X 팔로우' : 'Follow X',
    RETWEET: language === 'zh' ? 'X 转发' : language === 'ko' ? 'X 리트윗' : 'Retweet X',
    JOIN_TG: language === 'zh' ? 'TG 加群' : language === 'ko' ? 'TG 채널 가입' : 'Join Telegram',
    JOIN_DISCORD: 'Discord',
    SPARK: language === 'zh' ? 'Spark 项目' : language === 'ko' ? '프로젝트 Spark' : 'Spark Project',
    INVITE: language === 'zh' ? '邀请好友' : language === 'ko' ? '친구 초대' : 'Invite Friends',
  };

  const getLocalizedTasks = (rawTasks: BountyTask[]) => {
    return rawTasks.map(task => {
      // Localize MOCK tasks
      if (task.id === 'b1') {
        return {
          ...task,
          creatorType: language === 'zh' ? '平台项目方' : language === 'ko' ? '플랫폼 프로젝트' : 'Platform Projects',
          title: language === 'zh' ? '关注 @OmniSocial 官方 X 账号' : language === 'ko' ? '@OmniSocial 공식 X 계정 팔로우' : 'Follow @OmniSocial Official X Account'
        };
      }
      if (task.id === 'b2') {
        return {
          ...task,
          creatorType: language === 'zh' ? '平台项目方' : language === 'ko' ? '플랫폼 프로젝트' : 'Platform Projects',
          title: language === 'zh' ? '加入 CodeVibe Telegram 开发者社区' : language === 'ko' ? 'CodeVibe 텔레그램 개발자 커뮤니티 가입' : 'Join CodeVibe Telegram Developer Community'
        };
      }
      if (task.id === 'b3') {
        return {
          ...task,
          creatorType: language === 'zh' ? 'TON 外部项目' : language === 'ko' ? 'TON 외부 프로젝트' : 'TON External Projects',
          title: language === 'zh' ? '转发 TON Dogs NFT 官宣推文' : language === 'ko' ? 'TON Dogs NFT 공식 발표 트윗 리트윗' : 'Retweet TON Dogs NFT Official Announcement Tweet'
        };
      }
      if (task.id === 'b4') {
        return {
          ...task,
          creatorType: language === 'zh' ? 'BSC 外部项目' : language === 'ko' ? 'BSC 외부 프로젝트' : 'BSC External Projects',
          title: language === 'zh' ? '加入 MetaGame Discord 并验证' : language === 'ko' ? 'MetaGame 디스코드 채널 가입 및 인증' : 'Join MetaGame Discord & Verify'
        };
      }
      if (task.id === 'b5') {
        return {
          ...task,
          creatorType: language === 'zh' ? '平台项目方' : language === 'ko' ? '플랫폼 프로젝트' : 'Platform Projects',
          title: language === 'zh' ? 'Spark TrendBot 项目 ≥ 10 TON' : language === 'ko' ? 'TrendBot 프로젝트에 10 TON 이상 Spark 기부' : 'Spark TrendBot Project ≥ 10 TON'
        };
      }
      // Non-mock tasks CreatorType localization
      const localizedCreatorType = task.creatorType === 'PROJECT'
        ? (language === 'zh' ? '平台项目方' : language === 'ko' ? '플랫폼 프로젝트' : 'Platform Projects')
        : (language === 'zh' ? 'TON 外部项目' : language === 'ko' ? 'TON 외부 프로젝트' : 'TON External Projects');
      return {
        ...task,
        creatorType: localizedCreatorType
      };
    });
  };

  const [filter, setFilter] = useState<'all' | 'vc' | 'token'>('all');
  const [showModal, setShowModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState<BountyTask | null>(null);
  const [extWallet, setExtWallet] = useState('');
  const [exchangeUid, setExchangeUid] = useState('');
  const [screenshotUrl, setScreenshotUrl] = useState('');
  const [chatWallet, setChatWallet] = useState('auto');
  const [selectedTier, setSelectedTier] = useState<number>(0);
  const [stakeAmount, setStakeAmount] = useState<number>(10000);
  const [stakeStatus, setStakeStatus] = useState<any>(null);
  const [stakingLoading, setStakingLoading] = useState(false);
  const [pendingVC, setPendingVC] = useState<number>(0);
  const [totalEarned, setTotalEarned] = useState<number>(0);
  const [claiming, setClaiming] = useState<boolean>(false);

  const [tasks, setTasks] = useState<BountyTask[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(false);
  const [submittingTask, setSubmittingTask] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccessMsg, setSubmitSuccessMsg] = useState<string | null>(null);

  const fetchTasks = async () => {
    setLoadingTasks(true);
    try {
      const res = await fetch(`${API_BASE}/api/v1/bounty/tasks`, {
        signal: AbortSignal.timeout(5000)
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        const mapped = data.data.map(mapBountyTask);
        setTasks(getLocalizedTasks(mapped));
      } else {
        // API returned an explicit failure — do not fallback to mock in production
        console.warn('Bounty tasks API returned success:false', data);
        const isLocalDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
        if (isLocalDev) {
          setTasks(getLocalizedTasks(MOCK_TASKS));
        }
      }
    } catch (e) {
      console.error('Failed to fetch tasks:', e);
      // Only use MOCK_TASKS in local development
      const isLocalDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      if (isLocalDev) {
        setTasks(getLocalizedTasks(MOCK_TASKS));
      }
    }
    setLoadingTasks(false);
  };

  const fetchBountyData = async () => {
    if (!walletAddress) return;
    const token = getReadonlyJwt();
    if (!token) return;

    // 1. Fetch stake status
    try {
      const res = await fetch(`${API_BASE}/api/v1/bounty/stake/status`, {
        headers: {
          'Authorization': `Bearer ${token}`
        },
        signal: AbortSignal.timeout(5000)
      });
      const data = await res.json();
      if (data.success && data.data) {
        setStakeStatus(data.data);
        setSelectedTier(data.data.creator_tier || 0);
        setStakeAmount(data.data.vc_amount || 10000);
      } else {
        setStakeStatus(null);
      }
    } catch (e) { /* silently fail */ }

    // 2. Fetch VC balance
    try {
      const res = await fetch(`${API_BASE}/api/v1/bounty/balance`, {
        headers: {
          'Authorization': `Bearer ${token}`
        },
        signal: AbortSignal.timeout(5000)
      });
      const data = await res.json();
      if (data.success && data.data) {
        setPendingVC(data.data.pending_vc || 0);
        setTotalEarned(data.data.total_earned_vc || 0);
      }
    } catch (e) { /* silently fail */ }
  };

  const handleSubmitTask = async (task: BountyTask) => {
    setSubmittingTask(task.id);
    setSubmitError(null);
    setSubmitSuccessMsg(null);
    try {
      const token = getWalletJwt();
      const res = await fetch(`${API_BASE}/api/v1/bounty/tasks/${task.id}/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ extWallet, exchangeUid, screenshotUrl }),
        signal: AbortSignal.timeout(5000)
      });
      const data = await res.json();
      if (data.success) {
        const submissionStatus = data.status || data.data?.status;
        if (submissionStatus === 'PENDING') {
          setSubmitSuccessMsg(t('bounty.submitPending'));
        } else if (submissionStatus === 'VERIFIED') {
          setSubmitSuccessMsg(t('bounty.successSubmit'));
        } else {
          setSubmitSuccessMsg(t('bounty.successSubmit'));
        }
        await fetchBountyData();
        await fetchTasks();
      } else {
        setSubmitError(t('bounty.errSubmitFailed', { msg: data.error || (language === 'zh' ? '请检查是否已完成或重复提交。' : language === 'ko' ? '완료 여부 또는 중복 제출을 확인하세요.' : 'please check if completed or duplicate.') }));
      }
    } catch (e: any) {
      setSubmitError(t('bounty.errSubmitFailed', { msg: language === 'zh' ? '验证超时或网络错误，请稍后重试。' : language === 'ko' ? '검증 시간 초과 또는 네트워크 오류가 발생했습니다. 나중에 다시 시도하세요.' : 'verification timeout or network error, please try again later.' }));
    }
    setSubmittingTask(null);
  };

  useEffect(() => {
    fetchTasks();
    if (!walletAddress) {
      setStakeStatus(null);
      setPendingVC(0);
      setTotalEarned(0);
      return;
    }
    fetchBountyData();
  }, [walletAddress]);

  const handleStake = async () => {
    if (!walletAddress) {
      alert(t('bounty.errConnectWallet'));
      return;
    }
    setStakingLoading(true);
    try {
      let txHash = '';

      const isLocalDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

      if (isLocalDev && !tonConnectUI.connected) {
        txHash = `mock-tx-${Date.now()}`;
      } else {
        if (!tonConnectUI.connected) {
          alert(t('bounty.errConnectTonStaking'));
          setStakingLoading(false);
          return;
        }

        const contractsRes = await fetch(`${API_BASE}/api/v1/platform/contracts`);
        if (!contractsRes.ok) {
          throw new Error(t('bounty.errGetContract'));
        }
        const contractsData = await contractsRes.json() as any;
        if (!contractsData.success || (contractsData.missing && contractsData.missing.length)) {
          throw new Error(t('bounty.errGetContract'));
        }
        const launchFeeContract = contractsData.data?.find((c: any) => c.contract_name === 'LAUNCH_FEE');
        const vcMasterContract = contractsData.data?.find((c: any) => c.contract_name === 'VC_JETTON');
        if (!launchFeeContract?.address || !vcMasterContract?.address) {
          throw new Error(t('bounty.errGetContract'));
        }
        const launchFeeAddress = launchFeeContract.address;

        const tonapiBase = getTonapiBase();
        const jettonsRes = await fetch(`${tonapiBase}/v2/accounts/${walletAddress}/jettons`);
        if (!jettonsRes.ok) {
          throw new Error(t('bounty.errQueryTokenAccount'));
        }
        const jettonsData = await jettonsRes.json() as any;

        // VC detection: Worker API VC_JETTON address is the primary source of truth.
        // Legacy addresses and symbol fallback are only enabled in local development.
        const apiVcMaster = vcMasterContract?.address;
        const vcMasters: string[] = [];
        if (apiVcMaster) vcMasters.push(apiVcMaster);

        const isLocalDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
        if (isLocalDev) {
          vcMasters.push(
            'EQA7LqItmr4HWs2Ot9OIDvMOtsCTNz0C4leB-x0WHh56DKAZ',
            'UQBvMw7pDIw8XuAXUagcrxjJyGG-6sVKU08D8JhO7JIAyPVI',
          );
        }

        const vcJettonByAddress = jettonsData.balances?.find((b: any) => {
          const addr = b.jetton.address?.toLowerCase();
          return vcMasters.some(m => m.toLowerCase() === addr);
        });
        const vcJetton = vcJettonByAddress || (isLocalDev
          ? jettonsData.balances?.find((b: any) => b.jetton.symbol === 'VC')
          : undefined
        );

        if (!vcJetton || !vcJetton.wallet_address?.address) {
          throw new Error(t('bounty.errNoTokenWallet'));
        }

        const userJettonWalletAddress = vcJetton.wallet_address.address;
        const amountNano = BigInt(Math.round(stakeAmount * 1e9));

        const body = beginCell()
          .storeUint(0xf8a7ea5, 32)
          .storeUint(0, 64)
          .storeCoins(amountNano)
          .storeAddress(Address.parse(launchFeeAddress))
          .storeAddress(Address.parse(walletAddress))
          .storeBit(0)
          .storeCoins(toNano('0.05'))
          .storeBit(0)
          .endCell();

        const bocUint8 = body.toBoc();
        let binary = '';
        for (let i = 0; i < bocUint8.length; i++) {
          binary += String.fromCharCode(bocUint8[i]);
        }
        const bocBase64 = window.btoa(binary);

        const transaction = {
          validUntil: Math.floor(Date.now() / 1000) + 600,
          messages: [
            {
              address: userJettonWalletAddress,
              amount: toNano('0.08').toString(),
              payload: bocBase64
            }
          ]
        };

        const result = await tonConnectUI.sendTransaction(transaction);
        if (!result || !result.boc) {
          throw new Error(t('bounty.errUserCancel'));
        }

        const signedBoc = Uint8Array.from(window.atob(result.boc), c => c.charCodeAt(0));
        const cell = Cell.fromBoc(signedBoc as any)[0];
        const hashUint8 = cell.hash();
        txHash = Array.from(hashUint8).map(b => b.toString(16).padStart(2, '0')).join('');
      }

      const token = getWalletJwt();
      const res = await fetch(`${API_BASE}/api/v1/bounty/stake`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ creator_tier: selectedTier, vc_amount: stakeAmount, tx_hash: txHash }),
        signal: AbortSignal.timeout(10000),
      });

      const data = await res.json() as any;
      if (data.success) {
        const unlockDate = new Date();
        unlockDate.setDate(unlockDate.getDate() + 180);
        setStakeStatus({
          vc_amount: stakeAmount,
          creator_tier: selectedTier,
          unlock_at: unlockDate.toISOString(),
          status: 'ACTIVE'
        });
      } else {
        alert(t('bounty.errConfirmStakingFailed', { msg: data.error || '' }));
      }
    } catch (e: any) {
      console.error('Stake failed:', e);
      alert(t('bounty.errStakingFailed', { msg: e.message || '' }));
    }
    setStakingLoading(false);
  };

  const handleClaimVC = async () => {
    if (!walletAddress || pendingVC <= 0) return;
    setClaiming(true);
    try {
      const token = getWalletJwt();
      const res = await fetch(`${API_BASE}/api/v1/bounty/claim`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        signal: AbortSignal.timeout(5000),
      });
      const data = await res.json();
      if (data.success) {
        setPendingVC(0);
      }
    } catch (e) { console.error('Claim failed:', e); }
    setClaiming(false);
  };

  const filtered = tasks.filter((t) => {
    if (filter === 'vc') return t.rewardToken === 'VC';
    if (filter === 'token') return t.rewardToken !== 'VC';
    return true;
  });

  const tierBadge = (tier: number) => {
    if (tier === 0) return <span className="px-1.5 py-0.5 bg-[#635BFF]/20 text-[#635BFF] rounded text-[9px] font-bold">⭐ {language === 'zh' ? '平台' : language === 'ko' ? '플랫폼' : 'Platform'}</span>;
    if (tier === 1) return <span className="px-1.5 py-0.5 bg-amber-500/20 text-amber-400 rounded text-[9px] font-bold">⭐⭐ TON</span>;
    return <span className="px-1.5 py-0.5 bg-red-500/20 text-red-400 rounded text-[9px] font-bold">⭐⭐⭐ {selectedTask?.chain || (language === 'zh' ? '外部' : language === 'ko' ? '외부' : 'External')}</span>;
  };

  return (
    <div className="h-full overflow-y-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black text-white flex items-center gap-2">
            <Gift size={20} className="text-[#635BFF]" />
            {t('bounty.pageTitle')}
          </h2>
          <p className="text-xs text-gray-500 mt-1">{t('bounty.pageDesc')}</p>
        </div>
        <button
          onClick={() => setChatWallet(chatWallet === 'auto' ? 'manual' : 'auto')}
          className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition ${
            chatWallet === 'auto' ? 'bg-[#635BFF]/20 text-[#635BFF] border border-[#635BFF]/30' : 'bg-[#1A1C2C] text-gray-400 border border-[#22253E]'
          }`}
        >
          {chatWallet === 'auto' ? t('bounty.botHosted') : t('bounty.manualMode')}
        </button>
      </div>

      {/* Earnings bar */}
      <div className="p-4 bg-gradient-to-r from-[#1C1A3F] to-[#1A1C2C] border border-[#22253E] rounded-xl flex items-center justify-between">
        <div className="flex items-center gap-6">
          <div>
            <div className="text-[9px] text-gray-500 uppercase">{t('bounty.pendingVc')}</div>
            <div className="text-2xl font-black text-[#635BFF]">{pendingVC} <span className="text-[10px] font-normal text-gray-400">VC</span></div>
          </div>
          <div>
            <div className="text-[9px] text-gray-500 uppercase">{t('bounty.totalEarnings')}</div>
            <div className="text-lg font-bold text-white">{totalEarned} <span className="text-[10px] text-gray-404">VC</span></div>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleClaimVC}
            disabled={claiming || pendingVC <= 0}
            className="px-4 py-2 bg-[#635BFF] text-white rounded-lg text-xs font-bold hover:bg-[#5245EE] disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center gap-1.5 cursor-pointer"
          >
            <Wallet size={13} /> {claiming ? t('bounty.claiming') : t('bounty.claimCTA')}
          </button>
          <button className="px-3 py-2 bg-[#1A1C2C] border border-[#22253E] text-gray-400 rounded-lg text-[10px] hover:text-white transition">
            {t('bounty.autoClaimSettings')}
          </button>
        </div>
      </div>

      {/* VC Staking Panel */}
      <div className="p-5 bg-gradient-to-br from-[#1C1A3F]/80 to-[#121620] border border-[#635BFF]/20 rounded-xl space-y-4">
        <div className="flex items-center gap-2">
          <Lock size={16} className="text-[#635BFF]" />
          <h3 className="text-sm font-black text-white">{t('bounty.stakeTitle')}</h3>
        </div>

        {/* Tier Cards */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { tier: 0, label: t('bounty.tierPlatform'), amount: 10000, amountLabel: t('bounty.tier1Label') },
            { tier: 1, label: t('bounty.tierExternalTon'), amount: 100000, amountLabel: t('bounty.tier2Label') },
            { tier: 2, label: t('bounty.tierExternalOther'), amount: 500000, amountLabel: t('bounty.tier3Label') },
          ].map((item) => (
            <button
              key={item.tier}
              onClick={() => { setSelectedTier(item.tier); setStakeAmount(item.amount); }}
              className={`p-3 rounded-xl text-center transition border ${
                selectedTier === item.tier
                  ? 'bg-[#635BFF]/15 border-[#635BFF]/50 ring-1 ring-[#635BFF]/30'
                  : 'bg-[#0A0B14] border-[#22253E] hover:border-[#635BFF]/30'
              }`}
            >
              <div className="text-[10px] text-gray-400 mb-1">{item.label}</div>
              <div className={`text-sm font-black ${selectedTier === item.tier ? 'text-[#635BFF]' : 'text-white'}`}>{item.amountLabel}</div>
              <div className="text-[9px] text-gray-500 mt-1">{t('bounty.stakeMonths')}</div>
            </button>
          ))}
        </div>

        {/* Action Row */}
        <div className="flex items-center gap-3">
          <select
            value={stakeAmount}
            onChange={(e) => setStakeAmount(Number(e.target.value))}
            className="flex-1 bg-[#0A0B14] border border-[#22253E] rounded-lg px-3 py-2.5 text-xs text-white appearance-none cursor-pointer focus:border-[#635BFF] outline-none transition"
          >
            {selectedTier === 0 && <>
              <option value={10000}>10,000 VC</option>
              <option value={20000}>20,000 VC</option>
              <option value={50000}>50,000 VC</option>
            </>}
            {selectedTier === 1 && <>
              <option value={100000}>100,000 VC</option>
              <option value={200000}>200,000 VC</option>
            </>}
            {selectedTier === 2 && <>
              <option value={500000}>500,000 VC</option>
              <option value={1000000}>1,000,000 VC</option>
            </>}
          </select>
          <button
            onClick={handleStake}
            disabled={stakingLoading}
            className="px-6 py-2.5 bg-[#635BFF] text-white rounded-lg text-xs font-bold hover:bg-[#5245EE] disabled:opacity-50 transition flex items-center gap-1.5 shrink-0"
          >
            <Lock size={12} />
            {stakingLoading ? t('bounty.staking') : t('bounty.stakeBtn')}
          </button>
        </div>

        {/* Stake Status */}
        {stakeStatus && (
          <div className="p-3 bg-[#0A0B14]/80 border border-emerald-500/20 rounded-lg flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-gray-300">
                {t('bounty.stakedAmount', { amount: (stakeStatus.vc_amount || 0).toLocaleString() })}
                {' · '}
                {t('bounty.unlockDate', { date: new Date(stakeStatus.unlock_at).toLocaleDateString() })}
              </span>
            </div>
            <span className="text-emerald-400 font-mono font-bold">
              {stakeStatus.creator_tier === 0 ? t('bounty.tierPlatform') : stakeStatus.creator_tier === 1 ? t('bounty.tierExternalTon') : t('bounty.tierExternalOther')}
            </span>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        {(['all', 'vc', 'token'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
              filter === f ? 'bg-[#1C1A3F] text-white' : 'text-gray-400 hover:text-white'
            }`}
          >
            {f === 'all' ? t('bounty.taskAll') : f === 'vc' ? t('bounty.taskVcReward') : t('bounty.taskTokenReward')}
          </button>
        ))}
      </div>

      {/* Task list */}
      <div className="space-y-3">
        {loadingTasks ? (
          <div className="text-gray-400 text-xs p-8 text-center animate-pulse">{t('bounty.loadingTasks')}</div>
        ) : filtered.length === 0 ? (
          <div className="text-gray-500 text-xs p-8 text-center bg-[#121620] border border-[#22253E] rounded-xl">{t('bounty.noTasks')}</div>
        ) : (
          filtered.map((task) => (
            <div key={task.id} className="p-4 bg-[#121620] border border-[#22253E] rounded-xl hover:border-[#635BFF]/30 transition group">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    {tierBadge(task.creatorTier)}
                    <span className="px-1.5 py-0.5 bg-[#22253E] rounded text-[9px] text-gray-400">
                      {bountyTypes[task.taskType] || task.taskType}
                    </span>
                  </div>
                  <div className="text-sm font-bold text-white group-hover:text-[#8B83FF] transition">
                    {task.title}
                  </div>
                  <div className="text-[10px] text-gray-500 mt-0.5">
                    {task.creatorName} · {task.creatorType}
                  </div>
                  <div className="flex items-center gap-4 mt-2 text-[10px]">
                    <span className="text-[#635BFF] font-bold">{t('bounty.perPerson', { reward: task.reward })}</span>
                    <span className="text-gray-500">{t('bounty.completedSlots', { completed: task.completedSlots, total: task.totalSlots })}</span>
                    <div className="w-20 h-1.5 bg-[#22253E] rounded-full overflow-hidden">
                      <div className="h-full bg-[#635BFF] rounded-full" style={{ width: `${(task.completedSlots / task.totalSlots) * 100}%` }} />
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setSelectedTask(task);
                    setSubmitError(null);
                    setSubmitSuccessMsg(null);
                    setExchangeUid('');
                    setScreenshotUrl('');
                    setShowModal(true);
                  }}
                  className="px-4 py-2 bg-[#635BFF] text-white rounded-lg text-xs font-bold hover:bg-[#5245EE] transition shrink-0 flex items-center gap-1"
                >
                  <Zap size={12} /> {t('bounty.startTask')}
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Task accept modal */}
      {showModal && selectedTask && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setShowModal(false)}>
          <div className="bg-[#121620] border border-[#22253E] rounded-2xl p-6 w-full max-w-md space-y-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-black text-white">{selectedTask.title}</h3>
            <div className="flex items-center gap-2 text-xs text-gray-400">
              {tierBadge(selectedTask.creatorTier)}
              <span>{t('bounty.reward')} <strong className="text-[#635BFF]">{selectedTask.reward}</strong></span>
            </div>

            {selectedTask.creatorTier > 0 && (
              <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg flex items-start gap-2">
                <AlertTriangle size={14} className="text-amber-400 shrink-0 mt-0.5" />
                <div className="text-[10px] text-amber-400">
                  <div className="font-bold mb-0.5">
                    {selectedTask.creatorTier === 1
                      ? (language === 'zh' ? 'TON 外部项目 · 质押 10 万 VC' : language === 'ko' ? 'TON 외부 프로젝트 · 10만 VC 스테이킹' : 'TON External Project · Stake 100k VC')
                      : (language === 'zh' ? `${selectedTask.chain || '外部'} 链项目 · 质押 50 万 VC` : language === 'ko' ? `${selectedTask.chain || '외부'} 체인 프로젝트 · 50만 VC 스테이킹` : `${selectedTask.chain || 'External'} Chain Project · Stake 500k VC`)}
                  </div>
                  {t('bounty.creatorManualReward')}
                </div>
              </div>
            )}

            {(selectedTask.rewardToken !== 'VC' && selectedTask.creatorTier > 0) && (
              <div>
                <label className="text-[10px] text-gray-400 block mb-1">
                  {t('bounty.walletAddress', { chain: selectedTask.chain || 'TON' })}
                </label>
                <input
                  type="text"
                  value={extWallet}
                  onChange={(e) => setExtWallet(e.target.value)}
                  placeholder={t('bounty.walletPlaceholder', { chain: selectedTask.chain || 'TON' })}
                  className="w-full bg-[#0A0B14] border border-[#22253E] rounded-lg px-3 py-2 text-xs text-white placeholder-gray-500"
                />
              </div>
            )}

            {selectedTask.taskType === 'EXCHANGE_REG' && (
              <>
                <div>
                  <label className="text-[10px] text-gray-400 block mb-1">
                    {t('bounty.exchangeUid')}
                  </label>
                  <input
                    type="text"
                    value={exchangeUid}
                    onChange={(e) => setExchangeUid(e.target.value)}
                    placeholder={t('bounty.exchangeUidPlaceholder')}
                    className="w-full bg-[#0A0B14] border border-[#22253E] rounded-lg px-3 py-2 text-xs text-white placeholder-gray-500 outline-none focus:border-[#635BFF]"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-gray-400 block mb-1">
                    {t('bounty.screenshotUrl')}
                  </label>
                  <input
                    type="text"
                    value={screenshotUrl}
                    onChange={(e) => setScreenshotUrl(e.target.value)}
                    placeholder={t('bounty.screenshotPlaceholder')}
                    className="w-full bg-[#0A0B14] border border-[#22253E] rounded-lg px-3 py-2 text-xs text-white placeholder-gray-500 outline-none focus:border-[#635BFF]"
                  />
                </div>
              </>
            )}

            {submitError && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] rounded-lg">
                ❌ {submitError}
              </div>
            )}

            {submitSuccessMsg && (
              <div className="p-3 bg-[#10B981]/15 border border-[#10B981]/30 text-emerald-400 text-[10px] rounded-lg">
                ✅ {submitSuccessMsg}
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <button
                onClick={async () => {
                  window.open(selectedTask.url, '_blank');
                  await handleSubmitTask(selectedTask);
                }}
                disabled={submittingTask === selectedTask.id || !!submitSuccessMsg}
                className="flex-1 py-2.5 bg-[#635BFF] text-white rounded-lg text-sm font-bold hover:bg-[#5245EE] disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center gap-1.5"
              >
                <ExternalLink size={14} /> {submittingTask === selectedTask.id ? t('bounty.verifying') : submitSuccessMsg ? t('bounty.verifyDone') : t('bounty.goComplete')}
              </button>
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2.5 bg-[#1A1C2C] border border-[#22253E] text-gray-400 rounded-lg text-sm hover:text-white transition"
              >
                {t('bounty.close')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
