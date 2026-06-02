import { useCallback, useEffect, useState } from 'react';
import { Gift, ExternalLink, Wallet, Zap, AlertTriangle, Loader2 } from 'lucide-react';
import { useUserStore } from '../store/userStore';

const API_BASE = import.meta.env.VITE_API_URL || 'https://api.72h.lol';

interface BountyTaskApi {
  id: string;
  creator_id?: string;
  creator_name?: string;
  creator_type?: string;
  creator_tier?: number;
  task_type?: string;
  title: string;
  target_url?: string;
  url?: string;
  reward_amount?: number | string;
  reward_token?: string;
  total_slots?: number;
  completed_slots?: number;
  token_reward_chain?: string;
  chain?: string;
}

interface BountyTask {
  id: string;
  creatorName: string;
  creatorTier: number;
  creatorType: string;
  taskType: string;
  title: string;
  rewardAmount: number;
  reward: string;
  rewardToken: string;
  totalSlots: number;
  completedSlots: number;
  chain?: string;
  url: string;
}

interface BountyBalance {
  pending_vc?: number | string;
  total_earned_vc?: number | string;
}

const BOUNTY_TYPES: Record<string, string> = {
  FOLLOW_X: 'X 关注',
  RETWEET: 'X 转发',
  JOIN_TG: 'TG 加群',
  JOIN_DISCORD: 'Discord',
  SPARK: 'Spark 项目',
  INVITE: '邀请好友',
};

const toNumber = (value: number | string | undefined, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const formatVc = (value: number) => {
  if (Number.isInteger(value)) return value.toString();
  return value.toFixed(2).replace(/\.00$/, '').replace(/(\.\d)0$/, '$1');
};

const normalizeTask = (task: BountyTaskApi): BountyTask => {
  const rewardAmount = toNumber(task.reward_amount);
  const rewardToken = task.reward_token || 'VC';
  const creatorTier = task.creator_tier ?? 0;
  const chain = task.token_reward_chain || task.chain || undefined;

  return {
    id: task.id,
    creatorName: task.creator_name || task.creator_id || '平台项目方',
    creatorTier,
    creatorType: task.creator_type || (creatorTier === 0 ? '平台项目方' : `${chain || '外部'} 项目`),
    taskType: task.task_type || 'TASK',
    title: task.title,
    rewardAmount,
    reward: `${formatVc(rewardAmount)} ${rewardToken}`,
    rewardToken,
    totalSlots: Math.max(toNumber(task.total_slots), 1),
    completedSlots: toNumber(task.completed_slots),
    chain,
    url: task.target_url || task.url || '#',
  };
};

export default function BountyPage() {
  const { walletAddress, isConnected, connectWallet } = useUserStore();
  const [filter, setFilter] = useState<'all' | 'vc' | 'token'>('all');
  const [showModal, setShowModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState<BountyTask | null>(null);
  const [extWallet, setExtWallet] = useState('');
  const [chatWallet, setChatWallet] = useState('auto');
  const [tasks, setTasks] = useState<BountyTask[]>([]);
  const [pendingVC, setPendingVC] = useState(0);
  const [totalEarned, setTotalEarned] = useState(0);
  const [isLoadingTasks, setIsLoadingTasks] = useState(true);
  const [isLoadingBalance, setIsLoadingBalance] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isClaiming, setIsClaiming] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [claimNotice, setClaimNotice] = useState('');

  const loadTasks = useCallback(async () => {
    setIsLoadingTasks(true);
    try {
      const res = await fetch(`${API_BASE}/api/v1/bounty/tasks`, { signal: AbortSignal.timeout(8000) });
      const payload = await res.json();
      if (!res.ok || !payload.success) throw new Error(payload.error || '任务加载失败');
      setTasks((payload.data || []).map(normalizeTask));
      setStatusMessage('');
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : '任务加载失败');
      setTasks([]);
    } finally {
      setIsLoadingTasks(false);
    }
  }, []);

  const loadBalance = useCallback(async (userId: string) => {
    setIsLoadingBalance(true);
    try {
      const query = new URLSearchParams({ user_id: userId });
      const res = await fetch(`${API_BASE}/api/v1/bounty/balance?${query.toString()}`, { signal: AbortSignal.timeout(8000) });
      const payload = await res.json();
      if (!res.ok || !payload.success) throw new Error(payload.error || '余额加载失败');
      const balance = (payload.data || {}) as BountyBalance;
      setPendingVC(toNumber(balance.pending_vc));
      setTotalEarned(toNumber(balance.total_earned_vc));
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : '余额加载失败');
      setPendingVC(0);
      setTotalEarned(0);
    } finally {
      setIsLoadingBalance(false);
    }
  }, []);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  useEffect(() => {
    if (!walletAddress) {
      setPendingVC(0);
      setTotalEarned(0);
      return;
    }
    loadBalance(walletAddress);
  }, [walletAddress, loadBalance]);

  const submitTask = async () => {
    if (!selectedTask) return;
    if (!walletAddress) {
      setStatusMessage('请先连接钱包，再提交赏金任务。');
      connectWallet();
      return;
    }

    setIsSubmitting(true);
    setStatusMessage('');
    try {
      if (selectedTask.url && selectedTask.url !== '#') window.open(selectedTask.url, '_blank');
      const res = await fetch(`${API_BASE}/api/v1/bounty/tasks/${selectedTask.id}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: walletAddress,
          external_wallet: extWallet || undefined,
        }),
      });
      const payload = await res.json();
      if (!res.ok || !payload.success) throw new Error(payload.error || '任务提交失败');
      setStatusMessage(payload.message || '任务已提交并验证，奖励已计入待提取。');
      setShowModal(false);
      setSelectedTask(null);
      await Promise.all([loadTasks(), loadBalance(walletAddress)]);
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : '任务提交失败');
    } finally {
      setIsSubmitting(false);
    }
  };

  const claimBounty = async () => {
    if (!walletAddress) {
      setStatusMessage('请先连接钱包，再提取 VC。');
      connectWallet();
      return;
    }
    if (pendingVC <= 0) {
      setStatusMessage('当前没有待提取 VC。');
      return;
    }

    setIsClaiming(true);
    setStatusMessage('');
    setClaimNotice('');
    try {
      const res = await fetch(`${API_BASE}/api/v1/bounty/claim`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: walletAddress }),
      });
      const payload = await res.json();
      if (!res.ok || !payload.success) throw new Error(payload.error || '提取失败');
      setClaimNotice(`已登记 ${formatVc(toNumber(payload.amount, pendingVC))} VC，待链上发放。当前后端 claim 仅完成 D1 清账，链上 VC mint/transfer 完成后会更新到账状态。`);
      await loadBalance(walletAddress);
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : '提取失败');
    } finally {
      setIsClaiming(false);
    }
  };

  const filtered = tasks.filter((t) => {
    if (filter === 'vc') return t.rewardToken === 'VC';
    if (filter === 'token') return t.rewardToken !== 'VC';
    return true;
  });

  const tierBadge = (tier: number, chain?: string) => {
    if (tier === 0) return <span className="px-1.5 py-0.5 bg-[#635BFF]/20 text-[#635BFF] rounded text-[9px] font-bold">⭐ 平台</span>;
    if (tier === 1) return <span className="px-1.5 py-0.5 bg-amber-500/20 text-amber-400 rounded text-[9px] font-bold">⭐⭐ TON</span>;
    return <span className="px-1.5 py-0.5 bg-red-500/20 text-red-400 rounded text-[9px] font-bold">⭐⭐⭐ {chain || '外部'}</span>;
  };

  return (
    <div className="h-full overflow-y-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black text-white flex items-center gap-2">
            <Gift size={20} className="text-[#635BFF]" />
            赏金市场
          </h2>
          <p className="text-xs text-gray-500 mt-1">完成任务赚 VC 和代币 · 机器人自动验证</p>
        </div>
        <button
          onClick={() => setChatWallet(chatWallet === 'auto' ? 'manual' : 'auto')}
          className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition ${
            chatWallet === 'auto' ? 'bg-[#635BFF]/20 text-[#635BFF] border border-[#635BFF]/30' : 'bg-[#1A1C2C] text-gray-400 border border-[#22253E]'
          }`}
        >
          {chatWallet === 'auto' ? '🤖 机器人托管' : '👤 手动模式'}
        </button>
      </div>

      {(statusMessage || claimNotice) && (
        <div className={`p-3 border rounded-xl text-xs ${claimNotice ? 'bg-amber-500/10 border-amber-500/20 text-amber-300' : 'bg-[#1A1C2C] border-[#22253E] text-gray-300'}`}>
          {claimNotice || statusMessage}
        </div>
      )}

      {!isConnected && (
        <div className="p-3 bg-[#1A1C2C] border border-[#22253E] rounded-xl flex items-center justify-between gap-3">
          <span className="text-xs text-gray-400">连接钱包后才能读取你的赏金余额、提交任务和提取 VC。</span>
          <button onClick={() => connectWallet()} className="px-3 py-1.5 bg-[#635BFF] text-white rounded-lg text-xs font-bold hover:bg-[#5245EE] transition">
            连接钱包
          </button>
        </div>
      )}

      {/* Earnings bar */}
      <div className="p-4 bg-gradient-to-r from-[#1C1A3F] to-[#1A1C2C] border border-[#22253E] rounded-xl flex items-center justify-between">
        <div className="flex items-center gap-6">
          <div>
            <div className="text-[9px] text-gray-500 uppercase">待提取 VC</div>
            <div className="text-2xl font-black text-[#635BFF]">
              {isLoadingBalance ? <Loader2 size={20} className="animate-spin" /> : formatVc(pendingVC)} <span className="text-[10px] font-normal text-gray-400">VC</span>
            </div>
          </div>
          <div>
            <div className="text-[9px] text-gray-500 uppercase">累计收益</div>
            <div className="text-lg font-bold text-white">
              {isLoadingBalance ? '...' : formatVc(totalEarned)} <span className="text-[10px] text-gray-400">VC</span>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={claimBounty}
            disabled={isClaiming || !walletAddress || pendingVC <= 0}
            className="px-4 py-2 bg-[#635BFF] text-white rounded-lg text-xs font-bold hover:bg-[#5245EE] transition flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isClaiming ? <Loader2 size={13} className="animate-spin" /> : <Wallet size={13} />} 一键提取
          </button>
          <button className="px-3 py-2 bg-[#1A1C2C] border border-[#22253E] text-gray-400 rounded-lg text-[10px] hover:text-white transition">
            设置自动提取
          </button>
        </div>
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
            {f === 'all' ? '全部任务' : f === 'vc' ? 'VC 奖励' : '代币奖励'}
          </button>
        ))}
      </div>

      {/* Task list */}
      <div className="space-y-3">
        {isLoadingTasks && (
          <div className="p-6 bg-[#121620] border border-[#22253E] rounded-xl text-sm text-gray-400 flex items-center gap-2">
            <Loader2 size={16} className="animate-spin" /> 正在加载赏金任务...
          </div>
        )}
        {!isLoadingTasks && filtered.length === 0 && (
          <div className="p-6 bg-[#121620] border border-[#22253E] rounded-xl text-sm text-gray-400">
            暂无符合条件的赏金任务。
          </div>
        )}
        {filtered.map((task) => (
          <div key={task.id} className="p-4 bg-[#121620] border border-[#22253E] rounded-xl hover:border-[#635BFF]/30 transition group">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  {tierBadge(task.creatorTier, task.chain)}
                  <span className="px-1.5 py-0.5 bg-[#22253E] rounded text-[9px] text-gray-400">
                    {BOUNTY_TYPES[task.taskType] || task.taskType}
                  </span>
                </div>
                <div className="text-sm font-bold text-white group-hover:text-[#8B83FF] transition">
                  {task.title}
                </div>
                <div className="text-[10px] text-gray-500 mt-0.5">
                  {task.creatorName} · {task.creatorType}
                </div>
                <div className="flex items-center gap-4 mt-2 text-[10px]">
                  <span className="text-[#635BFF] font-bold">{task.reward} / 人</span>
                  <span className="text-gray-500">{task.completedSlots}/{task.totalSlots} 已完成</span>
                  <div className="w-20 h-1.5 bg-[#22253E] rounded-full overflow-hidden">
                    <div className="h-full bg-[#635BFF] rounded-full" style={{ width: `${Math.min((task.completedSlots / task.totalSlots) * 100, 100)}%` }} />
                  </div>
                </div>
              </div>
              <button
                onClick={() => {
                  setSelectedTask(task);
                  setShowModal(true);
                  setStatusMessage('');
                  setClaimNotice('');
                }}
                className="px-4 py-2 bg-[#635BFF] text-white rounded-lg text-xs font-bold hover:bg-[#5245EE] transition shrink-0 flex items-center gap-1"
              >
                <Zap size={12} /> 查看任务
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Task accept modal */}
      {showModal && selectedTask && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setShowModal(false)}>
          <div className="bg-[#121620] border border-[#22253E] rounded-2xl p-6 w-full max-w-md space-y-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-black text-white">{selectedTask.title}</h3>
            <div className="flex items-center gap-2 text-xs text-gray-400">
              {tierBadge(selectedTask.creatorTier, selectedTask.chain)}
              <span>奖励: <strong className="text-[#635BFF]">{selectedTask.reward}</strong></span>
            </div>

            {selectedTask.creatorTier > 0 && (
              <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg flex items-start gap-2">
                <AlertTriangle size={14} className="text-amber-400 shrink-0 mt-0.5" />
                <div className="text-[10px] text-amber-400">
                  <div className="font-bold mb-0.5">
                    {selectedTask.creatorTier === 1
                      ? `TON 外部项目 · 质押 10 万 VC`
                      : `${selectedTask.chain || '外部'} 链项目 · 质押 50 万 VC`}
                  </div>
                  奖励由创作者手动发放到你的钱包。如未收到，可投诉索赔。
                </div>
              </div>
            )}

            {(selectedTask.rewardToken !== 'VC' && selectedTask.creatorTier > 0) && (
              <div>
                <label className="text-[10px] text-gray-400 block mb-1">
                  {selectedTask.chain || 'TON'} 收款地址
                </label>
                <input
                  type="text"
                  value={extWallet}
                  onChange={(e) => setExtWallet(e.target.value)}
                  placeholder={`输入你的 ${selectedTask.chain || 'TON'} 钱包地址`}
                  className="w-full bg-[#0A0B14] border border-[#22253E] rounded-lg px-3 py-2 text-xs text-white placeholder-gray-500"
                />
              </div>
            )}

            <div className="p-3 bg-[#1A1C2C] border border-[#22253E] rounded-lg text-[10px] text-gray-400">
              点击“接任务并提交”会打开任务链接，并调用后端提交接口完成机器人验证。
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={submitTask}
                disabled={isSubmitting}
                className="flex-1 py-2.5 bg-[#635BFF] text-white rounded-lg text-sm font-bold hover:bg-[#5245EE] transition flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? <Loader2 size={14} className="animate-spin" /> : <ExternalLink size={14} />} 接任务并提交
              </button>
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2.5 bg-[#1A1C2C] border border-[#22253E] text-gray-400 rounded-lg text-sm hover:text-white transition"
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
