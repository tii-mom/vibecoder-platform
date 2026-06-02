import { useState } from 'react';
import { Gift, ExternalLink, Wallet, Clock, Zap, AlertTriangle } from 'lucide-react';

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
  { id: 'b1', creatorName: 'OmniSocial', creatorTier: 0, creatorType: '平台项目方', taskType: 'FOLLOW_X', title: '关注 @OmniSocial 官方 X 账号', reward: '2 VC', rewardToken: 'VC', totalSlots: 200, completedSlots: 87, url: 'https://x.com/omnisocial' },
  { id: 'b2', creatorName: 'CodeVibe', creatorTier: 0, creatorType: '平台项目方', taskType: 'JOIN_TG', title: '加入 CodeVibe Telegram 开发者社区', reward: '3 VC', rewardToken: 'VC', totalSlots: 150, completedSlots: 42, url: 'https://t.me/codevibe' },
  { id: 'b3', creatorName: 'TON Dogs', creatorTier: 1, creatorType: 'TON 外部项目', taskType: 'RETWEET', title: '转发 TON Dogs NFT 官宣推文', reward: '50 $TDOG', rewardToken: '$TDOG', totalSlots: 500, completedSlots: 234, chain: 'TON', url: 'https://x.com/tondogs' },
  { id: 'b4', creatorName: 'MetaGame', creatorTier: 2, creatorType: 'BSC 外部项目', taskType: 'JOIN_DISCORD', title: '加入 MetaGame Discord 并验证', reward: '100 $META', rewardToken: '$META', totalSlots: 300, completedSlots: 45, chain: 'BSC', url: 'https://discord.gg/metagame' },
  { id: 'b5', creatorName: 'TrendBot', creatorTier: 0, creatorType: '平台项目方', taskType: 'SPARK', title: 'Spark TrendBot 项目 ≥ 10 TON', reward: '5 VC', rewardToken: 'VC', totalSlots: 100, completedSlots: 23, url: '#/launch/spark-3' },
];

const BOUNTY_TYPES: Record<string, string> = {
  FOLLOW_X: 'X 关注',
  RETWEET: 'X 转发',
  JOIN_TG: 'TG 加群',
  JOIN_DISCORD: 'Discord',
  SPARK: 'Spark 项目',
  INVITE: '邀请好友',
};

export default function BountyPage() {
  const [filter, setFilter] = useState<'all' | 'vc' | 'token'>('all');
  const [showModal, setShowModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState<BountyTask | null>(null);
  const [extWallet, setExtWallet] = useState('');
  const [chatWallet, setChatWallet] = useState('auto');

  const pendingVC = 47;
  const totalEarned = 156;

  const filtered = MOCK_TASKS.filter((t) => {
    if (filter === 'vc') return t.rewardToken === 'VC';
    if (filter === 'token') return t.rewardToken !== 'VC';
    return true;
  });

  const tierBadge = (tier: number) => {
    if (tier === 0) return <span className="px-1.5 py-0.5 bg-[#635BFF]/20 text-[#635BFF] rounded text-[9px] font-bold">⭐ 平台</span>;
    if (tier === 1) return <span className="px-1.5 py-0.5 bg-amber-500/20 text-amber-400 rounded text-[9px] font-bold">⭐⭐ TON</span>;
    return <span className="px-1.5 py-0.5 bg-red-500/20 text-red-400 rounded text-[9px] font-bold">⭐⭐⭐ {selectedTask?.chain || '外部'}</span>;
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
          <p className="text-xs text-gray-500 mt-1">完成任务赚 testnet VC 和代币 · 机器人自动验证</p>
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

      {/* Earnings bar */}
      <div className="p-4 bg-gradient-to-r from-[#1C1A3F] to-[#1A1C2C] border border-[#22253E] rounded-xl flex items-center justify-between">
        <div className="flex items-center gap-6">
          <div>
            <div className="text-[9px] text-gray-500 uppercase">待提取 testnet VC</div>
            <div className="text-2xl font-black text-[#635BFF]">{pendingVC} <span className="text-[10px] font-normal text-gray-400">VC</span></div>
          </div>
          <div>
            <div className="text-[9px] text-gray-500 uppercase">累计收益（待结算）</div>
            <div className="text-lg font-bold text-white">{totalEarned} <span className="text-[10px] text-gray-400">VC</span></div>
          </div>
        </div>
        <div className="flex gap-2">
          <button className="px-4 py-2 bg-[#635BFF] text-white rounded-lg text-xs font-bold hover:bg-[#5245EE] transition flex items-center gap-1.5">
            <Wallet size={13} /> 一键提取
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
            {f === 'all' ? '全部任务' : f === 'vc' ? 'testnet VC 奖励' : '代币奖励'}
          </button>
        ))}
      </div>

      {/* Task list */}
      <div className="space-y-3">
        {filtered.map((task) => (
          <div key={task.id} className="p-4 bg-[#121620] border border-[#22253E] rounded-xl hover:border-[#635BFF]/30 transition group">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  {tierBadge(task.creatorTier)}
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
                  <span className="text-[#635BFF] font-bold">{task.rewardToken === 'VC' ? `${task.reward} (testnet)` : task.reward} / 人</span>
                  <span className="text-gray-500">{task.completedSlots}/{task.totalSlots} 已完成</span>
                  <div className="w-20 h-1.5 bg-[#22253E] rounded-full overflow-hidden">
                    <div className="h-full bg-[#635BFF] rounded-full" style={{ width: `${(task.completedSlots / task.totalSlots) * 100}%` }} />
                  </div>
                </div>
              </div>
              <button
                onClick={() => {
                  setSelectedTask(task);
                  setShowModal(true);
                }}
                className="px-4 py-2 bg-[#635BFF] text-white rounded-lg text-xs font-bold hover:bg-[#5245EE] transition shrink-0 flex items-center gap-1"
              >
                <Zap size={12} /> 接任务
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
              {tierBadge(selectedTask.creatorTier)}
              <span>奖励: <strong className="text-[#635BFF]">{selectedTask.rewardToken === 'VC' ? `${selectedTask.reward} (testnet VC_JETTON)` : selectedTask.reward}</strong></span>
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

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => {
                  window.open(selectedTask.url, '_blank');
                  setShowModal(false);
                }}
                className="flex-1 py-2.5 bg-[#635BFF] text-white rounded-lg text-sm font-bold hover:bg-[#5245EE] transition flex items-center justify-center gap-1.5"
              >
                <ExternalLink size={14} /> 前往完成任务
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
