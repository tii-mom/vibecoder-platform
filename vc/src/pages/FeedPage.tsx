import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSparkStore } from '../store/sparkStore';
import { useUserStore } from '../store/userStore';
import { 
  ChevronUp, 
  ChevronDown, 
  Sparkles, 
  Info, 
  Share2, 
  MessageSquare, 
  Users, 
  Zap, 
  SkipForward,
  Award,
  ShieldCheck,
  TrendingUp
} from 'lucide-react';
import SparkModal from '../components/SparkModal';
import CelebrationOverlay from '../components/CelebrationOverlay';
import ShareModal from '../components/ShareModal';

export default function FeedPage() {
  const navigate = useNavigate();
  const { projects, investInProject } = useSparkStore();
  const { profile, updateProfile, isConnected } = useUserStore();

  const [activeIndex, setActiveIndex] = useState(0);
  const activeProject = projects[activeIndex];

  // Modal States
  const [showSparkModal, setShowSparkModal] = useState(false);
  const [backedTeamId, setBackedTeamId] = useState<string | undefined>(undefined);
  const [showCelebration, setShowCelebration] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [backedAmount, setBackedAmount] = useState<number>(0);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (showSparkModal || showCelebration || showShareModal) return;
      if (e.key === 'ArrowDown') {
        handleNext();
      } else if (e.key === 'ArrowUp') {
        handlePrev();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeIndex, showSparkModal, showCelebration, showShareModal]);

  const handleNext = () => {
    if (activeIndex < projects.length - 1) {
      setActiveIndex(prev => prev + 1);
    }
  };

  const handlePrev = () => {
    if (activeIndex > 0) {
      setActiveIndex(prev => prev - 1);
    }
  };

  const handleSparkSuccess = (amount: number, teamId?: string) => {
    setBackedAmount(amount);
    setBackedTeamId(teamId);
    setShowSparkModal(false);
    setShowCelebration(true);
  };

  const handleCelebrationComplete = () => {
    setShowCelebration(false);
    setShowShareModal(true);
  };

  if (!activeProject) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-gray-500 font-mono text-xs">
        <p>暂无正在进行中的星火共建项目。</p>
      </div>
    );
  }

  // Calculate remaining days
  const getRemainingDays = (endTimeStr: string) => {
    const diff = new Date(endTimeStr).getTime() - Date.now();
    return diff <= 0 ? 0 : Math.ceil(diff / (24 * 3600 * 1000));
  };
  const remDays = getRemainingDays(activeProject.endTime);

  return (
    <div className="flex flex-col items-center w-full justify-center space-y-4 max-w-4xl mx-auto">
      {/* Page Header */}
      <div className="w-full flex items-center justify-between px-2">
        <div className="text-left">
          <span className="text-[10px] font-mono text-[#8C84FF] tracking-widest font-black uppercase block">
            ✦ AI Project Discovery Feed
          </span>
          <h1 className="text-xl font-black text-white tracking-tight">星火探索信息流</h1>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-400 font-mono bg-[#121429] p-1.5 px-3 rounded-full border border-[#212450]">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>项目 {activeIndex + 1} / {projects.length}</span>
        </div>
      </div>

      {/* Main card deck structure */}
      <div className="w-full flex items-stretch gap-4 relative">
        {/* Navigation Deck controllers (left sidebar style) */}
        <div className="flex flex-col justify-center gap-3 shrink-0">
          <button
            onClick={handlePrev}
            disabled={activeIndex === 0}
            className="w-10 h-10 rounded-full bg-[#121429]/80 border border-[#212450] flex items-center justify-center text-gray-400 hover:text-white hover:bg-[#1E2140] transition disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
          >
            <ChevronUp size={18} />
          </button>
          <button
            onClick={handleNext}
            disabled={activeIndex === projects.length - 1}
            className="w-10 h-10 rounded-full bg-[#121429]/80 border border-[#212450] flex items-center justify-center text-gray-400 hover:text-white hover:bg-[#1E2140] transition disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
          >
            <ChevronDown size={18} />
          </button>
        </div>

        {/* Central Deck Card */}
        <div className="flex-1 bg-[#0A0C16]/95 border border-[#1E2241] rounded-[32px] overflow-hidden flex flex-col md:flex-row items-stretch shadow-2xl relative min-h-[500px]">
          {/* Card left side: Project visuals and core detail */}
          <div className="flex-1 p-6 sm:p-8 flex flex-col justify-between space-y-6 relative overflow-hidden">
            {/* Visual gradient backdrop */}
            <div className="absolute inset-0 bg-gradient-to-br from-[#635BFF]/5 via-transparent to-transparent pointer-events-none" />

            {/* Top row: Tags and Category */}
            <div className="flex items-center justify-between flex-wrap gap-2 z-10">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded bg-[#635BFF]/10 border border-[#635BFF]/20 text-[#8C84FF] text-[9.5px] font-mono font-bold uppercase tracking-wider">
                  {activeProject.category || '数据分析'}
                </span>
                {activeProject.assuranceMode === 'staked' && (
                  <span className="px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[9.5px] font-mono font-bold uppercase tracking-wider flex items-center gap-1">
                    <ShieldCheck size={11} />
                    <span>Staked 保障</span>
                  </span>
                )}
              </div>
              <span className="text-[10px] text-gray-500 font-mono">
                {activeProject.onchainVerifyStatus === 'verified' ? '✓ 已审计部署' : '⚠️ 未审计'}
              </span>
            </div>

            {/* Middle: Title & AI Score card */}
            <div className="space-y-4 text-left z-10">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#635BFF] to-sky-400 flex items-center justify-center text-white font-mono font-black text-xs shadow-md">
                      {activeProject.agentTicker}
                    </div>
                    <div>
                      <h2 className="text-xl font-black text-white leading-tight">
                        {activeProject.agentName}
                      </h2>
                      <span className="text-[10px] text-gray-500 font-mono">
                        Creator: {activeProject.creatorAddress}
                      </span>
                    </div>
                  </div>
                </div>

                {/* AI Score dashboard badge */}
                <div className="bg-[#121428] border border-[#212450] p-2 rounded-2xl flex items-center gap-2 font-mono shrink-0">
                  <div className="w-9 h-9 rounded-xl bg-[#635BFF]/10 flex items-center justify-center text-xs font-black text-[#8C84FF]">
                    85
                  </div>
                  <div className="text-left text-[8px] leading-tight text-gray-400">
                    <span className="text-[9px] text-white font-bold block">COPILOT</span>
                    <span>AI 评估安全分</span>
                  </div>
                </div>
              </div>

              {/* Title sentence */}
              <h3 className="text-sm font-bold text-white leading-snug">
                {activeProject.title}
              </h3>

              {/* Description */}
              <p className="text-xs text-gray-400 leading-relaxed font-sans line-clamp-3">
                {activeProject.description}
              </p>

              {/* Tag links */}
              <div className="flex items-center gap-2 flex-wrap pt-1.5">
                {(activeProject.tags || []).map((tag, i) => (
                  <span key={i} className="text-[10.5px] font-mono text-gray-500 hover:text-gray-300 cursor-pointer">
                    {tag}
                  </span>
                ))}
              </div>
            </div>

            {/* Bottom: Progress details */}
            <div className="space-y-3 pt-4 border-t border-[#16182E] z-10">
              <div className="flex justify-between items-end">
                <div className="text-left">
                  <span className="text-[10px] text-gray-400 block font-sans">星火共建进度</span>
                  <span className="text-base font-black font-mono text-sky-450 mt-0.5 block">
                    {activeProject.raisedAmount.toLocaleString()} / {activeProject.goalAmount.toLocaleString()} TON
                  </span>
                </div>
                <span className="text-xs font-mono font-black text-[#8C84FF]">{activeProject.progress}%</span>
              </div>

              {/* Progress Slider */}
              <div className="w-full h-1.5 bg-[#080916] rounded-full overflow-hidden p-px">
                <div 
                  className="h-full bg-gradient-to-r from-sky-400 to-[#635BFF] rounded-full transition-all duration-300"
                  style={{ width: `${Math.min(100, activeProject.progress)}%` }}
                />
              </div>

              <div className="flex justify-between items-center text-[10px] text-gray-500 font-mono">
                <span className="flex items-center gap-1">
                  <Users size={11} />
                  <span>{activeProject.investorCount} 人参与共建</span>
                </span>
                <span>{remDays > 0 ? `剩余约: ${remDays} 天` : '已结束'}</span>
              </div>
            </div>
          </div>

          {/* Card right side: Action panel */}
          <div className="w-full md:w-[240px] bg-[#0E1020] border-t md:border-t-0 md:border-l border-[#1E2241] p-6 flex flex-col justify-between space-y-6">
            {/* Quick stats indicator */}
            <div className="space-y-4 text-left">
              <span className="text-[10px] font-mono text-gray-500 tracking-wider font-bold block uppercase">
                ✦ Co-building status
              </span>
              <div className="bg-[#07080E] border border-[#17192C] p-3 rounded-2xl space-y-2">
                <div className="flex items-center justify-between text-[10px] font-mono">
                  <span className="text-gray-400">起共建额</span>
                  <span className="text-white font-bold">{activeProject.minInvestment} TON</span>
                </div>
                <div className="flex items-center justify-between text-[10px] font-mono">
                  <span className="text-gray-400">保底模型</span>
                  <span className="text-emerald-400 font-bold uppercase">{activeProject.assuranceMode}</span>
                </div>
                <div className="flex items-center justify-between text-[10px] font-mono">
                  <span className="text-gray-400">项目状态</span>
                  <span className="text-sky-400 font-bold uppercase">{activeProject.status}</span>
                </div>
              </div>
            </div>

            {/* Core Action buttons stack */}
            <div className="space-y-3">
              {activeProject.status === 'active' ? (
                <button
                  onClick={() => setShowSparkModal(true)}
                  className="w-full py-3.5 bg-[#10B981] hover:bg-[#059669] text-black font-extrabold text-xs rounded-2xl shadow-xl shadow-[#10B981]/15 active:scale-97 transition flex items-center justify-center gap-1.5 cursor-pointer border border-[#34D399]/20"
                >
                  <Sparkles size={13} />
                  <span>✦ Spark this Project</span>
                </button>
              ) : (
                <button
                  disabled
                  className="w-full py-3.5 bg-slate-800 text-gray-500 font-extrabold text-xs rounded-2xl transition flex items-center justify-center gap-1.5 cursor-not-allowed"
                >
                  <span>星火共建已结束</span>
                </button>
              )}

              <button
                onClick={handleNext}
                disabled={activeIndex === projects.length - 1}
                className="w-full py-3 bg-[#17192C] hover:bg-[#21243D] border border-[#272B51] text-gray-300 hover:text-white rounded-2xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer active:scale-97 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <SkipForward size={12} />
                <span>跳过此项目</span>
              </button>
            </div>

            {/* Quick link actions */}
            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-[#1C1F3F]/60">
              <button
                onClick={() => navigate(`/launch/${activeProject.id}`)}
                className="py-2.5 bg-[#07080E] hover:bg-[#121426] border border-[#17192C] rounded-xl text-gray-400 hover:text-white transition flex flex-col items-center justify-center gap-1 cursor-pointer"
                title="查看详情"
              >
                <Info size={14} />
                <span className="text-[9px] font-mono">详情</span>
              </button>
              <button
                onClick={() => {
                  setBackedAmount(10);
                  setShowShareModal(true);
                }}
                className="py-2.5 bg-[#07080E] hover:bg-[#121426] border border-[#17192C] rounded-xl text-gray-400 hover:text-white transition flex flex-col items-center justify-center gap-1 cursor-pointer"
                title="分享链接"
              >
                <Share2 size={14} />
                <span className="text-[9px] font-mono">分享</span>
              </button>
              <button
                onClick={() => navigate(`/launch/${activeProject.id}`)}
                className="py-2.5 bg-[#07080E] hover:bg-[#121426] border border-[#17192C] rounded-xl text-gray-400 hover:text-white transition flex flex-col items-center justify-center gap-1 cursor-pointer relative"
                title="探讨区"
              >
                <MessageSquare size={14} />
                <span className="text-[9px] font-mono">探讨 ({activeProject.commentsCount || 0})</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Pop-up Modals integration */}
      {showSparkModal && (
        <SparkModal
          project={activeProject}
          profile={profile}
          onClose={() => setShowSparkModal(false)}
          onSuccess={handleSparkSuccess}
          updateProfile={updateProfile}
          investInProject={investInProject}
        />
      )}

      {showCelebration && (
        <CelebrationOverlay
          projectName={activeProject.agentName}
          amount={backedAmount}
          onComplete={handleCelebrationComplete}
        />
      )}

      {showShareModal && (
        <ShareModal
          project={activeProject}
          amount={backedAmount}
          teamId={backedTeamId}
          onClose={() => {
            setShowShareModal(false);
            setBackedTeamId(undefined);
          }}
        />
      )}
    </div>
  );
}
