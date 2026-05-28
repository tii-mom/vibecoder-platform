import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate, useLocation } from 'react-router-dom';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, RadialBarChart, RadialBar, Legend, PieChart, Pie, Cell } from 'recharts';
import { 
  ArrowLeft, Bot, MessageSquare, ArrowUp, ShieldCheck, 
  Award, Calendar, Users, HelpCircle, HardDrive, 
  Send, Sparkles, AlertCircle, Heart, Coins, ExternalLink, ShieldAlert, Crown,
  Activity, ClipboardList, CheckCircle
} from 'lucide-react';
import { useSparkStore } from '../store/sparkStore';
import { useUserStore } from '../store/userStore';
import { useGovernanceStore } from '../store/governanceStore';
import { useVestingStore } from '../store/vestingStore';
import { TONService } from '../services/ton';
import LifecycleEmissionCard from '../components/LifecycleEmissionCard';
import CelebrationOverlay from '../components/CelebrationOverlay';
import ShareModal from '../components/ShareModal';

export default function SparkDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { walletAddress, isConnected, profile, connectWallet, addFunds, updateProfile } = useUserStore();
  const { projects, upvoteProject, addComment, advanceProjectMilestone, investInProject, teams } = useSparkStore();
  const { proposals, votes, exitRequests, voteOnProposal, createProposal, createExitRequest } = useGovernanceStore();
  const { rounds, loadRounds } = useVestingStore();

  const [activeTab, setActiveTab] = useState<'overview' | 'spark' | 'health' | 'vesting' | 'governance' | 'proof' | 'discussion'>('overview');
  
  // URL parameters parsing
  const queryParams = new URLSearchParams(location.search);
  const refParam = queryParams.get('ref');
  const teamIdParam = queryParams.get('teamId');

  // Team Spark selection and Overlay states
  const [selectedTeamId, setSelectedTeamId] = useState<string | undefined>(teamIdParam || undefined);
  const [showCelebration, setShowCelebration] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [backedAmount, setBackedAmount] = useState(0);
  const [backedTeamId, setBackedTeamId] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (teamIdParam) {
      setSelectedTeamId(teamIdParam);
    }
  }, [teamIdParam]);

  const invitedTeam = selectedTeamId ? teams.find(t => t.id === selectedTeamId) : undefined;
  const projectActiveTeams = teams.filter(t => t.projectId === id && t.status === 'active');

  const handleSparkSuccess = (amount: number, teamId?: string) => {
    setBackedAmount(amount);
    setBackedTeamId(teamId);
    setShowCelebration(true);
  };

  const handleCelebrationComplete = () => {
    setShowCelebration(false);
    setShowShareModal(true);
  };

  // Synchronize tab from url query parameters or routers State
  useEffect(() => {
    const queryParams = new URLSearchParams(location.search);
    const tabParam = queryParams.get('tab');
    if (tabParam === 'proof' || tabParam === 'spark' || tabParam === 'overview' || tabParam === 'discussion' || tabParam === 'health' || tabParam === 'governance') {
      setActiveTab(tabParam as any);
    } else if (location.state && (location.state as any).activeTab) {
      setActiveTab((location.state as any).activeTab);
    }
  }, [location]);
  const [newCommentText, setNewCommentText] = useState('');
  const [commentSuccess, setCommentSuccess] = useState(false);

  // Investment states
  const [investAmount, setInvestAmount] = useState<string>('20');
  const [success, setSuccess] = useState(false);
  const [errorText, setErrorText] = useState('');
  const [investmentMode, setInvestmentMode] = useState<'solo' | 'team'>('solo');
  const [trialClaimedNotice, setTrialClaimedNotice] = useState<string>('');

  // Governance / Voting local states
  const [voteSubmitting, setVoteSubmitting] = useState<string | null>(null);
  const [withdrawAmount, setWithdrawAmount] = useState<string>('');
  const [withdrawPurpose, setWithdrawPurpose] = useState<string>('');
  const [withdrawSuccess, setWithdrawSuccess] = useState<boolean>(false);
  const [withdrawError, setWithdrawError] = useState<string>('');
  const [exitLoading, setExitLoading] = useState<boolean>(false);
  const [exitSuccess, setExitSuccess] = useState<boolean>(false);
  const [exitMsg, setExitMsg] = useState<string>('');

  // Governance action handlers
  const handleVote = (proposalId: string, vote: 'yes' | 'no') => {
    if (!isConnected || !walletAddress || !project) {
      connectWallet();
      return;
    }
    const userBacking = project.backers?.find(b => b.address === walletAddress);
    if (!userBacking) {
      alert("只有该项目的星火支持者（Backer）才能参与治理投票！");
      return;
    }
    const userTokens = Math.round(userBacking.amount / project.tokenPrice);
    const weight = Math.round(Math.sqrt(userTokens));
    if (weight <= 0) {
      alert("您的投票权重为 0，无法参与投票。");
      return;
    }
    setVoteSubmitting(proposalId);
    setTimeout(() => {
      voteOnProposal(proposalId, project.id, walletAddress, vote, weight);
      setVoteSubmitting(null);
    }, 800);
  };

  const handleCreateProposal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!project || !walletAddress) return;
    
    // Allow creator or sandbox test addresses to trigger mock withdrawal
    if (project.creatorAddress !== walletAddress && walletAddress !== 'VibeDev_88ff') {
      setWithdrawError("仅限项目创建者发起提款提案。");
      return;
    }

    const amount = Number(withdrawAmount);
    if (isNaN(amount) || amount <= 0) {
      setWithdrawError("请输入有效的提款金额！");
      return;
    }

    const projectProposals = proposals[project.id] || [];
    const passedAmount = projectProposals
      .filter(p => p.status === 'passed')
      .reduce((sum, p) => sum + p.amount, 0);
    const totalGovAllocated = project.raisedAmount * 0.5;
    const remainingGovFunds = totalGovAllocated - passedAmount;

    if (amount > remainingGovFunds) {
      setWithdrawError(`提款金额 (${amount} TON) 超出了当前治理锁定的可用余额 (${remainingGovFunds.toFixed(2)} TON)。`);
      return;
    }

    if (!withdrawPurpose.trim()) {
      setWithdrawError("请说明提款的具体用途（服务器扩容、代码优化等）！");
      return;
    }

    setWithdrawError('');
    createProposal(project.id, amount, withdrawPurpose.trim());
    setWithdrawAmount('');
    setWithdrawPurpose('');
    setWithdrawSuccess(true);
    setTimeout(() => setWithdrawSuccess(false), 3000);
  };

  const handleExitProject = () => {
    if (!project || !walletAddress) return;
    const userBacking = project.backers?.find(b => b.address === walletAddress);
    if (!userBacking || userBacking.amount <= 0) {
      alert("您未持有该项目的支持份额，无法申请退出。");
      return;
    }
    
    if (!confirm("您确定要执行合规退出并销毁所持代币吗？此操作将立即赎回您相应比例的 TON 代币。")) {
      return;
    }

    setExitLoading(true);
    setExitMsg('');

    setTimeout(() => {
      const userTokens = Math.round(userBacking.amount / project.tokenPrice);
      const projectProposals = proposals[project.id] || [];
      const passedAmount = projectProposals
        .filter(p => p.status === 'passed')
        .reduce((sum, p) => sum + p.amount, 0);
      const totalGovAllocated = project.raisedAmount * 0.5;
      const remainingRatio = totalGovAllocated > 0 ? (totalGovAllocated - passedAmount) / totalGovAllocated : 1;
      const refundableTON = Number((userBacking.amount * remainingRatio * 0.95).toFixed(2));

      createExitRequest(project.id, walletAddress, refundableTON, userTokens);
      addFunds(refundableTON);

      setExitSuccess(true);
      setExitMsg(`🎉 成功退款！已销毁 ${userTokens} $${project.agentTicker} 代币，赎回 ${refundableTON} TON 到您的钱包账户。`);
      setExitLoading(false);
    }, 1500);
  };

  // Swap states
  const [swapType, setSwapType] = useState<'buy' | 'sell'>('buy');
  const [swapAmount, setSwapAmount] = useState<string>('20');
  const [swapSuccess, setSwapSuccess] = useState(false);
  const [swapSuccessMsg, setSwapSuccessMsg] = useState('');
  const [swapErrText, setSwapErrText] = useState('');

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

  // Swap trigger handler
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
      setSwapErrText('请输入有效的数额（须大于 0）');
      return;
    }

    if (!project) return;

    const tokenBalance = localInventory[project.id] || 0;

    if (swapType === 'buy') {
      if (profile.balanceTON < val) {
        setSwapErrText(`钱包 TON 余额不足，无法买入。当前可用: ${profile.balanceTON} TON。`);
        return;
      }

      const boughtTokens = Number((val / project.tokenPrice).toFixed(2));
      
      updateProfile({
        balanceTON: Number((profile.balanceTON - val).toFixed(2))
      });

      const nextInv = { ...localInventory, [project.id]: (localInventory[project.id] || 0) + boughtTokens };
      saveLocalInventory(nextInv);

      setSwapSuccessMsg(`Swap广播成功！消耗 ${val} TON，兑购到 ${boughtTokens} ${project.agentTicker}`);
      setSwapSuccess(true);
      setSwapAmount('20');
    } else {
      if (tokenBalance < val) {
        setSwapErrText(`可售出的 $${project.agentTicker} 余额不足。当前持有: ${tokenBalance}`);
        return;
      }

      const receivedTON = Number((val * project.tokenPrice).toFixed(2));

      updateProfile({
        balanceTON: Number((profile.balanceTON + receivedTON).toFixed(2))
      });

      const nextInv = { ...localInventory, [project.id]: Math.max(0, Number((tokenBalance - val).toFixed(2))) };
      saveLocalInventory(nextInv);

      setSwapSuccessMsg(`Swap广播成功！卖出 ${val} ${project.agentTicker}，赎回 ${receivedTON} TON`);
      setSwapSuccess(true);
      setSwapAmount('10');
    }
  };

  // Invest handler
  const handleInvest = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorText('');

    if (!isConnected || !profile) {
      handleWalletFallback();
      return;
    }

    const amount = Number(investAmount);
    if (isNaN(amount) || amount <= 0) {
      setErrorText('请输入有效的认缴金额（须大于 0 TON）');
      return;
    }

    if (!project) return;

    if (investmentMode !== 'team' && amount < project.minInvestment) {
      setErrorText(`认缴金额不能低于当前项目的起认额 ${project.minInvestment} TON`);
      return;
    }
    if (investmentMode === 'team' && amount < 5) {
      setErrorText('团队拼团模式起认额不低于 5 TON。');
      return;
    }

    if (profile.balanceTON < amount) {
      setErrorText(`钱包 TON 余额不足。当前余额: ${profile.balanceTON} TON。您可以一键发放下方的新首投 15 TON 体验金！`);
      return;
    }

    const isInvested = investInProject(project.id, amount, profile.walletAddress);
    if (isInvested) {
      updateProfile({
        balanceTON: Number((profile.balanceTON - amount).toFixed(2))
      });
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
      }, 5000);
    } else {
      setErrorText('交易广播异常，请重试');
    }
  };

  // 72H Sandbox Simulation State declarations
  const [isSandboxCollapsed, setIsSandboxCollapsed] = useState(true);
  const [currentHour, setCurrentHour] = useState<number>(0);
  const [simulatedProfit, setSimulatedProfit] = useState<number>(0);
  const [sandboxLogs, setSandboxLogs] = useState<Array<{ time: string; message: string; type: 'info' | 'success' | 'warn' | 'system' }>>([
    { time: "00:00:00", message: "🔒 [SYSTEM] 72H Live Sandbox Code Execution Simulator initialized.", type: 'system' },
    { time: "00:01:10", message: "⚙️ [AST AUDIT] AST structural check passed. Zero external re-entrancy vectors found.", type: 'success' },
    { time: "00:05:30", message: "📡 [NETWORK] Handshake established with TON decentralized proxy nodes.", type: 'info' }
  ]);

  const project = projects.find(p => p.id === id);

  const handleFastForward = (hoursToAdd: number) => {
    if (!project) return;
    const newHour = Math.min(72, currentHour + hoursToAdd);
    if (newHour === currentHour) return;

    setCurrentHour(newHour);
    const addedLogs: typeof sandboxLogs = [];
    const profitSegment = Number((Math.random() * 3.5 + 1.5).toFixed(2));
    setSimulatedProfit(p => Number((p + profitSegment).toFixed(2)));

    // Event timeline milestones mapping
    if (newHour >= 12 && currentHour < 12) {
      addedLogs.push(
        { time: "12:00:00", message: "🤖 [AGENT SIM] Autonomous telemetry scan active. Filtered 45 high-weight arbitrage triggers.", type: 'info' },
        { time: "12:45:00", message: `📈 [YIELD] High-frequency cross-DEX transaction complete! Generated profit: +${(profitSegment * 0.4).toFixed(2)} TON.`, type: 'success' }
      );
      if (project.milestones && project.milestones[0] && project.milestones[0].status !== 'completed') {
        advanceProjectMilestone(project.id, 0, 'completed');
        // Automatically make next milestone ongoing
        if (project.milestones[1] && project.milestones[1].status === 'pending') {
          advanceProjectMilestone(project.id, 1, 'ongoing');
        }
        addedLogs.push({ time: "13:00:00", message: "🏆 [MILESTONE 1 VERIFIED] Concept code draft review OK. Autoreleased 25% funds.", type: 'success' });
      }
    }
    if (newHour >= 24 && currentHour < 24) {
      addedLogs.push(
        { time: "24:00:00", message: "🌐 [COMMUNITY] Auto-posting Twitter and Telegram AI metrics updates.", type: 'info' },
        { time: "24:30:00", message: "⚙️ [DEPLOY] Deploying dynamic smart router test oracle to mainnet.", type: 'success' }
      );
      if (project.milestones && project.milestones[1] && project.milestones[1].status !== 'completed') {
        advanceProjectMilestone(project.id, 1, 'completed');
        if (project.milestones[2] && project.milestones[2].status === 'pending') {
          advanceProjectMilestone(project.id, 2, 'ongoing');
        }
        addedLogs.push({ time: "25:00:00", message: "🏆 [MILESTONE 2 VERIFIED] Decentralized deploy tested pass. Released 25% funds.", type: 'success' });
      }
    }
    if (newHour >= 48 && currentHour < 48) {
      addedLogs.push(
        { time: "48:00:00", message: "⚡ [STRESS TEST] Virtual load: 15,000 transactions/min. Solved dynamic memepool slippage.", type: 'info' },
        { time: "50:00:00", message: `💸 [FEE DISPATCH] Executed on-chain automatic multi-sig tax collection: +${(profitSegment * 0.8).toFixed(2)} TON.`, type: 'success' }
      );
      if (project.milestones && project.milestones[2] && project.milestones[2].status !== 'completed') {
        advanceProjectMilestone(project.id, 2, 'completed');
        if (project.milestones[3] && project.milestones[3].status === 'pending') {
          advanceProjectMilestone(project.id, 3, 'ongoing');
        }
        addedLogs.push({ time: "50:30:00", message: "🏆 [MILESTONE 3 VERIFIED] Scalability & pool seed parameters verified. Released 25% funds.", type: 'success' });
      }
    }
    if (newHour >= 72 && currentHour < 72) {
      addedLogs.push(
        { time: "71:59:00", message: "🛡️ [AUDIT] All compliance checkpoints crossed. Yield routing tables fully updated.", type: 'system' },
        { time: "72:00:00", message: "🎉 [CYCLE PASS] 72-Hour validation complete! Entering autonomous continuous routing mode.", type: 'success' }
      );
      if (project.milestones && project.milestones[3] && project.milestones[3].status !== 'completed') {
        advanceProjectMilestone(project.id, 3, 'completed');
        addedLogs.push({ time: "72:00:00", message: "🏆 [MILESTONE 4 VERIFIED] Fully Commercialized milestone reached! Enabled general AMM seed trading.", type: 'success' });
      }
    } else if (addedLogs.length === 0) {
      addedLogs.push({
        time: `${String(newHour).padStart(2, '0')}:00:00`,
        message: `🔄 [HEARTBEAT] Health ping stable. Node uptime: 100%. Simulated epoch yield: +${profitSegment} TON`,
        type: 'info'
      });
    }

    setSandboxLogs(prev => [...prev, ...addedLogs]);
  };

  const handleResetSandbox = () => {
    if (!project) return;
    setCurrentHour(0);
    setSimulatedProfit(0);
    setSandboxLogs([
      { time: "00:00:00", message: "↩️ [SYSTEM] Sandbox state re-initialized to Hour 0.", type: 'system' },
      { time: "00:01:10", message: "⚙️ [AST AUDIT] AST structural check passed. Zero external re-entrancy vectors found.", type: 'success' }
    ]);
    // Reset milestones back to pending/ongoing to allow re-run of the test sandbox!
    if (project.milestones) {
      advanceProjectMilestone(project.id, 0, 'ongoing');
      advanceProjectMilestone(project.id, 1, 'pending');
      advanceProjectMilestone(project.id, 2, 'pending');
      advanceProjectMilestone(project.id, 3, 'pending');
    }
  };

  const handleWalletFallback = () => {
    connectWallet();
  };

  if (!project) {
    return (
      <div className="max-w-md mx-auto py-24 px-4 text-center space-y-4">
        <Bot size={48} className="text-rose-500 mx-auto animate-bounce" />
        <h2 className="text-lg font-black text-white">未找到项目实例</h2>
        <p className="text-xs text-gray-400">
          该代币或星火项目可能由于本地存储生命周期已被回收。
        </p>
        <Link 
          to="/feed" 
          className="inline-block px-5 py-2 bg-[#635BFF] text-white text-xs font-bold rounded-lg"
        >
          返回探索大厅
        </Link>
      </div>
    );
  }

  // Get Cover Gradient Index
  const getGradientIndex = (id: string) => {
    let sum = 0;
    for (let i = 0; i < id.length; i++) {
      sum += id.charCodeAt(sum % id.length);
    }
    const gradients = [
      'from-[#3B82F6] via-[#1E40AF] to-[#0F172A]',
      'from-[#10B981] via-[#065F46] to-[#0A0F1D]',
      'from-[#F59E0B] via-[#92400E] to-[#0D0B1A]',
      'from-[#EC4899] via-[#9D174D] to-[#0F0C1B]',
      'from-[#8B5CF6] via-[#5B21B6] to-[#080B1A]',
      'from-[#14B8A6] via-[#115E59] to-[#060812]'
    ];
    return gradients[sum % gradients.length];
  };

  const gradientClass = getGradientIndex(project.id);
  const isFinished = project.status === 'success';

  // Calculate simulated remaining days
  const getRemainingDays = () => {
    const end = new Date(project.endTime).getTime();
    const diff = end - Date.now();
    if (diff <= 0) return 0;
    return Math.ceil(diff / (24 * 3600 * 1000));
  };
  const remDays = getRemainingDays();

  // Simulated live income chart for success state / running model
  const simulatedHistory = [
    { day: "05-20", gas: 180, income: 85, payouts: 59 },
    { day: "05-21", gas: 210, income: 110, payouts: 77 },
    { day: "05-22", gas: 250, income: 140, payouts: 98 },
    { day: "05-23", gas: 310, income: 195, payouts: 136 },
    { day: "05-24", gas: 290, income: 180, payouts: 126 },
    { day: "05-25", gas: 360, income: 232, payouts: 162 },
    { day: "05-26", gas: 420, income: 284, payouts: 198 },
    { day: "05-27", gas: 480, income: 322, payouts: 225 }
  ];

  // Simulated Tx list representation
  const simulatedTxs = [
    { id: "tx-da2", action: "收取广告赞助", amount: "84.5 TON", from: "EQF1_sponsor_88", time: "2 小时前", status: "已确认" },
    { id: "tx-f1a", action: "高频博弈获利流", amount: "12.2 TON", from: "Ston.Fi Pool A", time: "5 小时前", status: "已确认" },
    { id: "tx-a09", action: "分配划拨", amount: "-198.0 TON", from: "OSA 分配多签账户", time: "1 天前", status: "已结算分配" },
    { id: "tx-bca", action: "DEX 推理调用版税", amount: "44.0 TON", from: "EQA2_api_caller", time: "1 天前", status: "已确认" }
  ];

  const radialMilestoneData = (project.milestones || []).map((ms, index) => {
    let progressVal = 0;
    if (ms.status === 'completed') progressVal = 100;
    else if (ms.status === 'ongoing') progressVal = Math.min(99, 40 + (currentHour / 72) * 60);
    else progressVal = 10;
    
    let color = '#3B82F6';
    if (index === 0) color = '#10B981';
    else if (index === 1) color = '#635BFF';
    else if (index === 2) color = '#0EA5E9';
    else if (index === 3) color = '#F59E0B';

    return {
      name: ms.title,
      value: progressVal,
      fill: color
    };
  });

  const handlePostComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommentText.trim()) return;

    if (!isConnected) {
      handleWalletFallback();
      return;
    }

    const commentator = profile?.username || 'TON_Gamer_0x8b';
    addComment(project.id, newCommentText.trim(), commentator);
    setNewCommentText('');
    setCommentSuccess(true);
    setTimeout(() => setCommentSuccess(false), 2000);
  };

  const handleUpvote = () => {
    upvoteProject(project.id);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6 text-left select-none animate-in fade-in duration-200">
      {/* Referral welcome banner */}
      {refParam && (
        <div className="bg-emerald-950/20 border border-emerald-500/20 p-3.5 rounded-2xl flex items-center gap-3">
          <Sparkles size={16} className="text-emerald-400 shrink-0" />
          <p className="text-xs text-slate-300 leading-normal">
            🎉 您收到来自 <strong className="text-emerald-400 font-mono">{TONService.shortenAddress(refParam)}</strong> 的推荐！已在您的沙盒会话中激活 <strong>15 TON 首次共建体验金</strong>。
          </p>
        </div>
      )}

      {/* Team Spark co-building invitation card */}
      {invitedTeam && (
        <div className="bg-[#1C160E]/50 border border-amber-500/25 p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <Users size={20} className="text-amber-500 shrink-0 mt-0.5 animate-pulse" />
            <div className="space-y-1">
              <span className="text-[10px] font-mono text-amber-500 font-bold block uppercase tracking-wider">👥 拼单共建邀请 (GROUP SPARK INVITE)</span>
              <p className="text-xs text-gray-300">
                您的好友 <strong className="text-white font-mono">{invitedTeam.creatorName}</strong> 邀请您加入拼单战队共同支持星火！拼单进度: <strong className="text-white font-mono">{invitedTeam.currentAmount}/{invitedTeam.targetAmount} TON</strong>。
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={() => {
                setSelectedTeamId(invitedTeam.id);
                const formEl = document.getElementById('invest-form');
                if (formEl) {
                  formEl.scrollIntoView({ behavior: 'smooth' });
                }
              }}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-black font-extrabold text-xs rounded-xl transition cursor-pointer active:scale-95"
            >
              加入拼单小组
            </button>
            <button 
              onClick={() => setSelectedTeamId(undefined)}
              className="px-3 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-850 text-gray-400 hover:text-white text-xs font-bold rounded-xl transition cursor-pointer"
            >
              独自支持
            </button>
          </div>
        </div>
      )}

      {/* Back to feed anchor */}
      <Link 
        to="/feed" 
        className="inline-flex items-center gap-1.5 text-xs text-gray-400 hover:text-white transition"
        title="Go Back"
      >
        <ArrowLeft size={13} />
        <span>返回项目探索Feed列表</span>
      </Link>

      {/* Hero Header Area */}
      <div className={`rounded-3xl bg-gradient-to-br ${gradientClass} border border-[#212652] overflow-hidden shadow-2xl relative min-h-[220px] flex flex-col justify-end p-6 md:p-8 space-y-4`}>
        {/* Subtle decorative mesh overlay */}
        <div className="absolute inset-0 bg-black/40 mix-blend-multiply pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-end md:justify-between gap-6">
          {/* Brand/Product titles */}
          <div className="space-y-2 max-w-2xl text-left">
            <span className="p-1 px-2 pb-1 bg-white/10 rounded border border-white/20 text-[9.5px] font-mono font-bold tracking-wider text-white">
              {project.category || 'DeFi Autonomous Robot'}
            </span>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-2">
              <span>{project.agentName}</span>
              <span className="text-[#A5C0FF] font-mono font-normal text-lg">(${project.agentTicker})</span>
            </h1>
            <p className="text-xs sm:text-sm text-gray-200 font-medium leading-relaxed max-w-xl">
              {project.title}
            </p>
            <div className="flex flex-wrap items-center gap-2 pt-1 text-[10px] text-gray-300">
              <span className="bg-[#090A14]/70 p-1 px-2 rounded-md font-mono border border-gray-800">
                   多签发布人: {project.creatorAddress}
              </span>
              <span className="bg-[#090A14]/70 p-1 px-2 rounded-md font-sans border border-gray-800 flex items-center gap-1">
                   链上验证：
                <span className={project.onchainVerifyStatus === 'verified' ? 'text-emerald-400 font-bold' : 'text-gray-400'}>
                  {project.onchainVerifyStatus === 'verified' ? 'verified' : 'unverified'}
                </span>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Grid: Wide core workflow tabs (left) and modular Lifecycle Emission Swapper (right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Section: Wide Tabs layout */}
        <div className="lg:col-span-8 space-y-6">
          {/* Header tabs row */}
          <div className="flex bg-[#0A0B16] border border-[#1C1F3F] p-1 rounded-xl scrollbar-thin overflow-x-auto w-full">
            <button
              onClick={() => setActiveTab('overview')}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer whitespace-nowrap px-4 ${
                activeTab === 'overview' ? 'bg-[#1C1A3F] text-white' : 'text-gray-400 hover:text-white'
              }`}
            >
              Overview (项目介绍)
            </button>
            <button
              onClick={() => setActiveTab('spark')}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer whitespace-nowrap px-4 ${
                activeTab === 'spark' ? 'bg-[#1C1A3F] text-white' : 'text-gray-400 hover:text-white'
              }`}
            >
              Spark (星火/里程碑)
            </button>
            <button
              onClick={() => setActiveTab('health')}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer whitespace-nowrap px-4 ${
                activeTab === 'health' ? 'bg-[#1C1A3F] text-white' : 'text-gray-400 hover:text-white'
              }`}
            >
              Project Health (健康度)
              </button>

              <button
                onClick={() => setActiveTab('vesting')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                  activeTab === 'vesting' ? 'bg-[#1C1A3F] text-white' : 'text-gray-400 hover:text-white'
                }`}
              >
              Vesting (解锁)
              </button>

              <button
                onClick={() => setActiveTab('governance')}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer whitespace-nowrap px-4 ${
                activeTab === 'governance' ? 'bg-[#1C1A3F] text-white' : 'text-gray-400 hover:text-white'
              }`}
            >
              Governance (治理/退出)
            </button>
            <button
              onClick={() => setActiveTab('proof')}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer whitespace-nowrap px-4 ${
                activeTab === 'proof' ? 'bg-[#1C1A3F] text-white' : 'text-gray-400 hover:text-white'
              }`}
            >
              Proof (链上存证)
            </button>
            <button
              onClick={() => setActiveTab('discussion')}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer whitespace-nowrap px-4 ${
                activeTab === 'discussion' ? 'bg-[#1C1A3F] text-white' : 'text-gray-400 hover:text-white'
              }`}
            >
              Discussion ({project.commentsCount || project.comments?.length || 0})
            </button>
          </div>

          {/* Tab content rendering logic */}
          <div className="bg-[#0C0E1D] border border-[#1A1F45] rounded-2xl p-6 min-h-[300px] text-left">
            {/* 1. Overview Tab */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                <div className="space-y-2.5">
                  <h3 className="text-sm font-black text-white border-b border-[#21244E] pb-2 flex items-center gap-1.5">
                    <Bot size={15} className="text-[#635BFF]" />
                    <span>智能体设计与架构阐述</span>
                  </h3>
                  <p className="text-xs text-gray-300 leading-relaxed font-sans">{project.description}</p>
                  <p className="text-xs text-gray-400 leading-relaxed font-sans mt-2">
                    通过将核心大模型决策权和微调数据链锚定在 TON 的网络智能合约中，该 Agent 能够摆脱中心化控制器的干预，全天候自主读取 Telegram/Twitter 社交信号并执行对应的套利及内容孵化。
                  </p>
                </div>

                {/* RadialBarChart Milestone Tracker */}
                <div className="bg-[#121429] border border-[#212652] rounded-2xl p-5 text-left space-y-3">
                  <h4 className="text-xs font-black text-white flex items-center gap-1.5 uppercase font-sans text-[#A699FF]">
                    ⌛ 里程碑链上交付圆环雷达 (Milestones Completion Radial Radar)
                  </h4>
                  <div className="flex flex-col md:flex-row items-center gap-6">
                    <div className="w-[180px] h-[180px] shrink-0 relative flex items-center justify-center font-sans">
                      <ResponsiveContainer width="100%" height="100%">
                        <RadialBarChart 
                          cx="50%" 
                          cy="50%" 
                          innerRadius="20%" 
                          outerRadius="100%" 
                          barSize={12} 
                          data={radialMilestoneData}
                        >
                          <RadialBar
                            background={{ fill: '#141630' }}
                            dataKey="value"
                            cornerRadius={5}
                          />
                          <Tooltip 
                            contentStyle={{ backgroundColor: '#090A14', borderColor: '#22254B', color: '#fff', fontSize: '10px' }}
                            formatter={(value: any, name: string, props: any) => [`${value}% 已交付`, props.payload.name]}
                          />
                        </RadialBarChart>
                      </ResponsiveContainer>
                      <div className="absolute text-center">
                        <span className="text-[9px] text-gray-500 font-mono block">AVERAGE</span>
                        <span className="text-sm font-black text-emerald-400 font-mono">
                          {((radialMilestoneData.reduce((sum, d) => sum + d.value, 0)) / radialMilestoneData.length).toFixed(0)}%
                        </span>
                      </div>
                    </div>

                    <div className="flex-1 space-y-2 w-full">
                      {radialMilestoneData.map((ms, idx) => {
                        const originalMs = project.milestones?.[idx];
                        return (
                          <div key={idx} className="flex justify-between items-center text-[10.5px] bg-[#090A15]/60 p-2 rounded-lg border border-[#191D3E]/45">
                            <div className="flex items-center gap-2 max-w-[70%]">
                              <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: ms.fill }} />
                              <span className="text-gray-300 font-bold truncate">{ms.name}</span>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <span className="font-mono text-white font-bold">{ms.value.toFixed(0)}%</span>
                              <span className={`text-[8.5px] px-1.5 py-0.2 rounded uppercase font-sans font-black ${
                                originalMs?.status === 'completed' ? 'bg-emerald-950/40 text-emerald-400' : originalMs?.status === 'ongoing' ? 'bg-sky-955/40 text-sky-400 animate-pulse' : 'bg-slate-900 text-gray-500'
                              }`}>
                                {originalMs?.status || 'pending'}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Screenshot/Demo Placeholder Grid */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-gray-200">系统沙盒运行截图 / 模拟器演示</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 bg-[#121429] border border-[#212650] rounded-xl flex items-center gap-3.5">
                      <div className="p-2.5 bg-[#635BFF]/10 rounded-lg text-[#847BFF]">
                        <HardDrive size={18} />
                      </div>
                      <div className="text-left font-mono">
                        <span className="text-[10.5px] font-bold text-gray-200 block">AST 树自动化翻译模块</span>
                        <span className="text-[9px] text-gray-500">FunC V2 沙盒底层编译器就绪</span>
                      </div>
                    </div>
                    <div className="p-4 bg-[#121429] border border-[#212650] rounded-xl flex items-center gap-3.5">
                      <div className="p-2.5 bg-[#10B981]/10 rounded-lg text-emerald-400">
                        <Award size={18} />
                      </div>
                      <div className="text-left font-mono">
                        <span className="text-[10.5px] font-bold text-gray-200 block">AMM 联合曲线定价回测</span>
                        <span className="text-[9px] text-gray-500">滑点机制损耗低于百分之零点一</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 智能体真实多签交割和共建账本 */}
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between border-b border-[#21244E] pb-2">
                    <h3 className="text-xs font-black text-white flex items-center gap-1.5 uppercase font-sans text-indigo-300">
                      <Coins size={14} className="text-[#FF9F1A]" />
                      <span>智能体多签共建账本 (Multi-Sig Co-building Ledger)</span>
                    </h3>
                  </div>

                  <div className="overflow-x-auto">
                    <div className="min-w-full inline-block align-middle">
                      <div className="overflow-hidden border border-[#21244D] rounded-xl bg-[#090A15]/85">
                        <table className="min-w-full divide-y divide-slate-800/40 text-xs text-left">
                          <thead>
                            <tr className="bg-[#121429]/95 text-gray-400 font-mono text-[9px] uppercase font-black">
                              <th className="p-3 pl-4">交易行动</th>
                              <th className="p-3">交割资产描述</th>
                              <th className="p-3">多签来源</th>
                              <th className="p-3">确认时间</th>
                              <th className="p-3 pr-4 text-center">预期分配表现及变动报告 (Tooltip)</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-800/25 font-mono">
                            {simulatedTxs.map((tx, idx) => {
                              // Expected ROI dynamic calculation as requested
                              const originalAmt = parseFloat(tx.amount);
                              const dynamicROI = (18.5 + (simulatedProfit * 1.25) + (project.progress * 0.15) - (idx * 3.5)).toFixed(2);
                              const simulatedROIValue = (originalAmt && originalAmt > 0) ? (originalAmt * (1 + parseFloat(dynamicROI) / 100)).toFixed(1) : 0;

                              return (
                                <tr key={tx.id} className="hover:bg-white/[0.02] transition">
                                  <td className="p-3 pl-4 font-sans text-left">
                                    <span className="font-mono text-[10px] text-gray-500 block">#{tx.id}</span>
                                    <span className="text-white font-extrabold text-[11.5px] block">{tx.action}</span>
                                  </td>
                                  <td className={`p-3 font-bold ${tx.amount.startsWith('-') ? 'text-amber-400' : 'text-emerald-400'}`}>
                                    {tx.amount.startsWith('-') ? '' : '+'}{tx.amount}
                                  </td>
                                  <td className="p-3 text-gray-400 text-[10.5px] font-sans truncate max-w-[125px]" title={tx.from}>
                                    {tx.from}
                                  </td>
                                  <td className="p-3 text-gray-500 text-[10.5px]">
                                    <span>{tx.time}</span>
                                  </td>
                                  <td className="p-3 pr-4 text-center align-middle">
                                    {/* Tooltip Wrapper */}
                                    <div className="relative group/tool inline-block">
                                      <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#635BFF]/10 hover:bg-[#635BFF]/35 border border-[#635BFF]/35 text-[#A699FF] rounded-lg text-[10px] font-bold cursor-help transition">
                                        <span>分配: {dynamicROI}%</span>
                                        <HelpCircle size={11} className="text-sky-300" />
                                      </span>

                                      {/* Tooltip block positioned absolute */}
                                      <div className="absolute right-0 bottom-full mb-2 hidden group-hover/tool:block w-70 p-4.5 bg-[#090A14] border border-[#21265E] rounded-xl shadow-2xl text-[10.5px] leading-relaxed z-50 text-gray-300 font-sans space-y-2 select-none animate-in fade-in duration-100">
                                        <div className="flex justify-between items-center border-b border-slate-800 pb-1.5">
                                          <span className="font-semibold text-white uppercase tracking-wider text-[10px]">预计预期分配结算报表</span>
                                          <span className="text-[8px] bg-[#635BFF]/20 text-[#A699FF] rounded p-0.5 px-1 font-mono font-bold">LIVE ALLOC</span>
                                        </div>
                                        <p className="text-xs text-gray-400">
                                          该期交割对应合伙资产在当前自治算力表现与模拟累积利润评估下的实时对冲预期分配表现：
                                        </p>
                                        <div className="bg-[#05060E] p-2 rounded border border-slate-800/60 font-mono text-[11px] flex justify-between items-center text-white">
                                          <span>预计预期分配表现:</span>
                                          <span className="text-emerald-400 font-black">{dynamicROI}%</span>
                                        </div>
                                        <div className="text-[10px] space-y-1 pt-1.5 border-t border-slate-800/40 text-gray-400 font-mono">
                                          <div className="flex justify-between">
                                            <span>智能体累积利润:</span>
                                            <span className="text-gray-200">+{simulatedProfit.toFixed(2)} TON</span>
                                          </div>
                                          <div className="flex justify-between">
                                            <span>星火达成进度:</span>
                                            <span className="text-gray-200">{project.progress}%</span>
                                          </div>
                                          {originalAmt && originalAmt > 0 ? (
                                            <div className="flex justify-between border-t border-dashed border-slate-800/50 pt-1 text-white text-[10.5px]">
                                              <span>对应到手估算:</span>
                                              <span className="text-emerald-450 font-black">≈ {simulatedROIValue} TON</span>
                                            </div>
                                          ) : null}
                                        </div>
                                      </div>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Team Info */}
                <div className="space-y-3 pt-2">
                  <h3 className="text-xs font-black text-white border-b border-[#21244E] pb-2 flex items-center gap-1.5">
                    <Users size={14} className="text-sky-400" />
                    <span>自治开发者团队成员构成和往期实绩</span>
                  </h3>
                  <p className="text-xs text-slate-300 leading-relaxed bg-[#101224] p-3 rounded-xl border border-[#20234B]">
                    {project.teamDesc || "VibeCoder 自治开发者联盟团队。该团队核心研发团队具备 5 年以上的链上高频开发经历，由数位区块链智能合约科学家共同创立并维护。已经过多签安全沙盒全链路校验。"}
                  </p>
                </div>
              </div>
            )}

            {/* 2. Spark Tab */}
            {activeTab === 'spark' && (
              <div className="space-y-6 animate-in fade-in duration-100">
                {/* Creator Assurance model details banner */}
                <div className="p-4 bg-[#142A1D]/30 border border-emerald-900/40 rounded-xl space-y-2">
                  <div className="flex items-center gap-2">
                    <ShieldCheck size={16} className="text-emerald-400" />
                    <span className="text-xs font-bold text-white uppercase">
                      保障模式: {project.assuranceMode === 'staked' ? 'Creator Assurance (Staked)' : 'Unstaked (无保障)'}
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-400 leading-relaxed">
                    {project.assuranceMode === 'staked' 
                      ? '该项目开发者已向多签共建金库质押了约 10,000 $VC。在里程碑完成审计并通过之前，共建款将锁在冷托管合约中，由平台和支持者联合掌控，平台手续费仅扣除 5%。'
                      : '该项目采用 Unstaked 自由释放模式，平台手续费提档至 15%，无开发者预质押担保，请支持者注意合理控制资金比例。'}
                  </p>
                </div>

                {/* Milestones timeline */}
                <div className="space-y-4 text-left">
                  <h3 className="text-xs font-bold text-white border-b border-[#21244E] pb-2">星火释放里程碑时间线 (Milestone Timeline)</h3>
                  
                  <div className="space-y-4">
                    {(project.milestones || []).map((ms, index) => (
                      <div key={index} className="flex gap-4 items-start relative pl-2 group">
                        {/* Timeline visual bar */}
                        <div className="flex flex-col items-center">
                          <span className={`w-6 h-6 rounded-full flex items-center justify-center font-mono text-[10px] font-bold ${
                            ms.status === 'completed' ? 'bg-[#10B981] text-black' : ms.status === 'ongoing' ? 'bg-sky-500 text-black animate-pulse' : 'bg-gray-800 text-gray-500'
                          }`}>
                            {index + 1}
                          </span>
                          {index < (project.milestones || []).length - 1 && (
                            <div className="w-0.5 h-12 bg-gray-800 group-hover:bg-gray-700 transition" />
                          )}
                        </div>

                        {/* Title and condition */}
                        <div className="bg-[#101224] p-3 rounded-xl border border-[#1F234C] flex-1">
                          <div className="flex justify-between items-center text-[10.5px]">
                            <span className="font-bold text-white">{ms.title}</span>
                            <span className="bg-[#080916] px-1.5 py-0.2 rounded font-mono text-[9px] text-gray-400">
                              初始释放: {ms.releaseRadio}%
                            </span>
                          </div>
                          <p className="text-[10px] text-gray-400 mt-1">解锁前置说明: {ms.condition}</p>
                          <span className={`text-[9px] font-bold block mt-1 uppercase ${
                            ms.status === 'completed' ? 'text-emerald-400' : ms.status === 'ongoing' ? 'text-sky-400' : 'text-gray-500'
                          }`}>
                            当前进度: {ms.status === 'completed' ? '已核验并通过' : ms.status === 'ongoing' ? '正在加速开发中' : '锁定未解锁'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Jump to fund button overlay */}
                {!isFinished && (
                  <div className="pt-2 text-center">
                    <button
                      onClick={() => navigate(`/launch/${project.id}`)}
                      className="px-6 py-2 bg-[#635BFF] hover:bg-[#5048E5] text-white text-xs font-bold rounded-xl transition cursor-pointer"
                    >
                      立即参与支持
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Project Health Tab */}
            {activeTab === 'health' && (
              <div className="space-y-6 animate-in fade-in duration-150">
                {/* 1. Public Metrics Panel */}
                <div className="bg-[#121424] border border-[#22253E] rounded-2xl p-6 space-y-6">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-[#22253E] pb-4">
                    <div>
                      <span className="text-[10px] text-gray-500 font-mono tracking-wider block">PUBLIC STATUS TELEMETRY</span>
                      <h4 className="text-sm font-bold text-white mt-0.5 flex items-center gap-1.5">
                        <Activity className="text-emerald-400" size={16} />
                        <span>项目运营与健康看板</span>
                      </h4>
                    </div>
                    <span className="p-1 px-3 text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full shrink-0">
                      ⚡ 当前阶段：Stage 2 中段
                    </span>
                  </div>

                  {/* Top Stats Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="bg-[#1A1C2C] border border-[#22253E] rounded-xl p-4.5 text-left">
                      <span className="text-[9.5px] text-gray-400 font-mono tracking-wider block">FUNDING PROGRESS</span>
                      <span className="text-lg font-black text-white block mt-1">
                        {((project.raisedAmount / project.goalAmount) * 100).toFixed(0)}%
                      </span>
                      <div className="text-[9.5px] text-emerald-400 mt-1 font-bold">55% 阈值已达成 ✅</div>
                    </div>
                    <div className="bg-[#1A1C2C] border border-[#22253E] rounded-xl p-4.5 text-left">
                      <span className="text-[9.5px] text-gray-400 font-mono tracking-wider block">TOKEN DEPLOYMENT</span>
                      <span className="text-lg font-black text-white block mt-1">已部署 · 已分配</span>
                      <span className="text-[9.5px] text-gray-505 block mt-1 font-mono">TEP-74 JETTON CONTRACT</span>
                    </div>
                    <div className="bg-[#1A1C2C] border border-[#22253E] rounded-xl p-4.5 text-left">
                      <span className="text-[9.5px] text-gray-400 font-mono tracking-wider block">GOVERNANCE VALUE</span>
                      <span className="text-lg font-black text-white block mt-1">
                        {(() => {
                          const projectProposals = proposals[project.id] || [];
                          const passedAmount = projectProposals
                            .filter(p => p.status === 'passed')
                            .reduce((sum, p) => sum + p.amount, 0);
                          return (project.raisedAmount * 0.5 - passedAmount).toFixed(0);
                        })()} TON
                      </span>
                      <div className="text-[9.5px] text-purple-400 mt-1 font-bold">治理合约托管中</div>
                    </div>
                  </div>

                  {/* Grid of Chart + List Details */}
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                    {/* Recharts Pie Chart (40% width on md+) */}
                    <div className="md:col-span-5 flex flex-col items-center justify-center p-3 bg-[#1A1C2C]/50 border border-[#22253E]/50 rounded-xl min-h-[220px]">
                      <span className="text-[9.5px] text-gray-400 font-bold block mb-2">30/50/18/2 资金流向分布</span>
                      <div className="relative w-40 h-40">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={[
                                { name: '团队运营', value: 30 },
                                { name: '治理锁定', value: 50 },
                                { name: '项目方支配', value: 18 },
                                { name: '平台费', value: 2 },
                              ]}
                              cx="50%"
                              cy="50%"
                              innerRadius={45}
                              outerRadius={65}
                              paddingAngle={3}
                              dataKey="value"
                            >
                              <Cell fill="#635BFF" />
                              <Cell fill="#FFA825" />
                              <Cell fill="#10B981" />
                              <Cell fill="#EF4444" />
                            </Pie>
                            <Tooltip 
                              contentStyle={{ backgroundColor: '#090A13', borderColor: '#23264B', borderRadius: '8px', fontSize: '11px' }}
                              formatter={(value) => [`${value}%`, '占比']}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                          <span className="text-lg font-black text-white font-mono">100%</span>
                          <span className="text-[8px] text-gray-500 font-bold uppercase">Allocated</span>
                        </div>
                      </div>
                    </div>

                    {/* Chart list detail cards (70% width on md+) */}
                    <div className="md:col-span-7 space-y-3.5 text-left">
                      {(() => {
                        const projectProposals = proposals[project.id] || [];
                        const passedAmount = projectProposals
                          .filter(p => p.status === 'passed')
                          .reduce((sum, p) => sum + p.amount, 0);

                        const totalGovAllocated = project.raisedAmount * 0.5;
                        const remainingGovFunds = totalGovAllocated - passedAmount;
                        const teamAllocated = project.raisedAmount * 0.3;
                        const teamReleased = teamAllocated + passedAmount;
                        const projectAllocated = project.raisedAmount * 0.18;
                        const platformFee = project.raisedAmount * 0.02;

                        return (
                          <>
                            {/* Team shares */}
                            <div className="p-3 bg-[#1A1C2C] border border-[#22253E] rounded-xl flex items-center justify-between gap-4">
                              <div className="flex items-center gap-2.5">
                                <div className="w-2.5 h-2.5 rounded-full bg-[#635BFF]" />
                                <div>
                                  <div className="text-xs font-bold text-gray-200">团队运营 (30% Immediate)</div>
                                  <div className="text-[9.5px] text-gray-500 mt-0.5">Launch 成功后立即释放，无需投票</div>
                                </div>
                              </div>
                              <div className="text-right shrink-0">
                                <div className="text-xs font-black text-white">{teamReleased.toFixed(1)} / {teamAllocated.toFixed(0)} TON</div>
                                <span className="p-0.5 px-2 bg-emerald-500/10 text-emerald-450 border border-emerald-500/20 rounded text-[9px] font-bold inline-block mt-0.5">
                                  已释放
                                </span>
                              </div>
                            </div>

                            {/* Gov shares */}
                            <div className="p-3 bg-[#1A1C2C] border border-[#22253E] rounded-xl flex items-center justify-between gap-4">
                              <div className="flex items-center gap-2.5">
                                <div className="w-2.5 h-2.5 rounded-full bg-[#FFA825]" />
                                <div>
                                  <div className="text-xs font-bold text-gray-200">治理托管 (50% Gov Locked)</div>
                                  <div className="text-[9.5px] text-gray-500 mt-0.5">锁定在治理合约，提款需平方根投票通过</div>
                                </div>
                              </div>
                              <div className="text-right shrink-0">
                                <div className="text-xs font-black text-white">{remainingGovFunds.toFixed(1)} / {totalGovAllocated.toFixed(0)} TON</div>
                                <span className="p-0.5 px-2 bg-[#FFA825]/10 text-[#FFA825] border border-[#FFA825]/20 rounded text-[9px] font-bold inline-block mt-0.5">
                                  托管锁定中
                                </span>
                              </div>
                            </div>

                            {/* Project allocation */}
                            <div className="p-3 bg-[#1A1C2C] border border-[#22253E] rounded-xl flex items-center justify-between gap-4">
                              <div className="flex items-center gap-2.5">
                                <div className="w-2.5 h-2.5 rounded-full bg-[#10B981]" />
                                <div>
                                  <div className="text-xs font-bold text-gray-200">项目方支配 (18% Project)</div>
                                  <div className="text-[9.5px] text-gray-500 mt-0.5">建池子、运营、开发等自主支配</div>
                                </div>
                              </div>
                              <div className="text-right shrink-0">
                                <div className="text-xs font-black text-white">{projectAllocated.toFixed(0)} TON</div>
                                <span className="text-[9px] text-[#10B981] font-bold block mt-0.5">可自由支配</span>
                              </div>
                            </div>

                            {/* Platform fee */}
                            <div className="p-3 bg-[#1A1C2C] border border-[#22253E] rounded-xl flex items-center justify-between gap-4">
                              <div className="flex items-center gap-2.5">
                                <div className="w-2.5 h-2.5 rounded-full bg-[#EF4444]" />
                                <div>
                                  <div className="text-xs font-bold text-gray-200">平台费用 (2% Fee)</div>
                                  <div className="text-[9.5px] text-gray-500 mt-0.5">VibeCoder 平台服务费，进入 Fund 金库</div>
                                </div>
                              </div>
                              <div className="text-right shrink-0">
                                <div className="text-xs font-black text-white">{platformFee.toFixed(0)} TON</div>
                                <span className="text-[9px] text-gray-400 font-bold block mt-0.5">已收取</span>
                              </div>
                            </div>
                          </>
                        );
                      })()}
                    </div>
                  </div>

                  {/* Bottom details grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 border-t border-[#22253E] pt-5 text-xs text-gray-300">
                    <div>
                      <span className="text-[9.5px] text-gray-500 block uppercase">解锁状态</span>
                      <span className="font-bold text-amber-500 mt-0.5 block">需投票 (代币未达150%)</span>
                    </div>
                    <div>
                      <span className="text-[9.5px] text-gray-500 block uppercase">活跃用户数</span>
                      <span className="font-bold text-white mt-0.5 block">+12% (本月环比增长)</span>
                    </div>
                    <div>
                      <span className="text-[9.5px] text-gray-500 block uppercase">代币市场价</span>
                      <span className="font-bold text-emerald-400 mt-0.5 block">0.42 TON (+15% 7d)</span>
                    </div>
                    <div>
                      <span className="text-[9.5px] text-gray-500 block uppercase">已交付里程碑</span>
                      <span className="font-bold text-[#8B83FF] mt-0.5 block">●●●●○ 4/5 已完成</span>
                    </div>
                  </div>
                </div>

                {/* 2. Pending Proposals List (Only displayed if user backed this project) */}
                {(() => {
                  const projectProposals = proposals[project.id] || [];
                  const activeProps = projectProposals.filter(p => p.status === 'active');
                  const userBacking = project.backers?.find(b => b.address === walletAddress);
                  const userTokens = userBacking ? Math.round(userBacking.amount / project.tokenPrice) : 0;
                  const userVoteWeight = userTokens > 0 ? Math.round(Math.sqrt(userTokens)) : 0;

                  return (
                    <div className="space-y-4 text-left">
                      <h4 className="text-xs font-black text-white uppercase tracking-wider pl-1">🗳 治理提案投票 (Pending Vote Proposals)</h4>
                      
                      {activeProps.length === 0 ? (
                        <div className="bg-[#121424]/40 border border-[#22253E] p-6 rounded-2xl text-center text-xs text-gray-500 leading-relaxed">
                          当前没有待表决的提款提案。<br />
                          <span className="text-[10px] text-gray-600">当开发者为项目申请二次提款时，会在此处触发共建人投票通知。</span>
                        </div>
                      ) : (
                        activeProps.map((prop) => {
                          const hasVoted = prop.votedAddresses?.includes(walletAddress || "");
                          const totalVotesWeight = prop.yesWeight + prop.noWeight;
                          const yesPercent = totalVotesWeight > 0 ? (prop.yesWeight / totalVotesWeight) * 100 : 0;
                          const noPercent = totalVotesWeight > 0 ? (prop.noWeight / totalVotesWeight) * 100 : 0;

                          return (
                            <div key={prop.id} className="bg-[#121424] border border-[#22253E] rounded-2xl p-5.5 space-y-4">
                              <div className="flex justify-between items-start gap-4 flex-wrap">
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="p-1 px-2 text-[9.5px] font-mono font-bold bg-[#FFA825]/10 text-[#FFA825] border border-[#FFA825]/20 rounded-md">
                                      待表决 提款申请
                                    </span>
                                    <span className="text-xs text-gray-400 font-bold">编号: {prop.id.toUpperCase()}</span>
                                  </div>
                                  <h5 className="text-sm font-bold text-white mt-2 leading-relaxed">
                                    申请提现：<span className="text-[#8B83FF] font-black">{prop.amount} TON</span>
                                  </h5>
                                  <p className="text-xs text-gray-300 mt-1 leading-relaxed bg-[#1A1C2C]/50 p-2.5 rounded-xl border border-slate-900 font-sans">
                                    <strong className="text-gray-400">提款用途描述: </strong>{prop.purpose}
                                  </p>
                                </div>
                                <div className="text-right shrink-0">
                                  <span className="text-[10px] text-rose-400 font-bold block bg-rose-950/20 p-1 px-2.5 rounded-full border border-rose-900/35">
                                    ⏰ 剩余时间: 48小时
                                  </span>
                                </div>
                              </div>

                              {/* Voting stats weight charts */}
                              <div className="space-y-2">
                                <div className="flex justify-between text-[10.5px] font-bold text-gray-400">
                                  <span>支持占比: {yesPercent.toFixed(0)}% (权重 {prop.yesWeight.toFixed(0)})</span>
                                  <span>反对占比: {noPercent.toFixed(0)}% (权重 {prop.noWeight.toFixed(0)})</span>
                                </div>
                                <div className="h-2 w-full bg-[#1A1C2C] rounded-full overflow-hidden flex">
                                  <div className="h-full bg-[#10B981] transition-all duration-300" style={{ width: `${yesPercent}%` }} />
                                  <div className="h-full bg-[#EF4444] transition-all duration-300" style={{ width: `${noPercent}%` }} />
                                </div>
                                <div className="text-[9.5px] text-gray-500 font-sans mt-1">
                                  当前表决人数：{prop.votesCount?.yes || 0} 同意 / {prop.votesCount?.no || 0} 拒绝。投票权重根据持股代币数的平方根（Square Root）计算。
                                </div>
                              </div>

                              {/* Action Buttons panel for Backers */}
                              <div className="border-t border-[#22253E] pt-4.5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                                <div>
                                  {userVoteWeight > 0 ? (
                                    <div className="text-xs text-gray-300 font-bold">
                                      您的持仓: <span className="text-emerald-400">{userTokens}</span> 代币 | 
                                      您的平方根投票权重: <span className="text-indigo-400">{userVoteWeight}</span>
                                    </div>
                                  ) : (
                                    <div className="text-xs text-gray-505 font-bold">
                                      ⚠️ 您未持仓该代币，无法参与治理投票。
                                    </div>
                                  )}
                                </div>

                                {userVoteWeight > 0 && (
                                  <div className="flex items-center gap-2.5 w-full sm:w-auto">
                                    {hasVoted ? (
                                      <div className="p-2 px-4 bg-slate-900 border border-slate-850 text-gray-400 text-xs font-bold rounded-xl flex items-center gap-1.5 w-full justify-center">
                                        <CheckCircle size={14} className="text-emerald-400" />
                                        <span>您已完成对此提案的投票</span>
                                      </div>
                                    ) : (
                                      <>
                                        <button
                                          disabled={voteSubmitting === prop.id}
                                          onClick={() => handleVote(prop.id, 'yes')}
                                          className="flex-1 sm:flex-initial p-2 px-5 bg-emerald-650 hover:bg-emerald-550 text-white text-xs font-black rounded-xl transition cursor-pointer flex items-center justify-center gap-1 min-w-[90px]"
                                        >
                                          {voteSubmitting === prop.id ? '提交中...' : '✅ 同意'}
                                        </button>
                                        <button
                                          disabled={voteSubmitting === prop.id}
                                          onClick={() => handleVote(prop.id, 'no')}
                                          className="flex-1 sm:flex-initial p-2 px-5 bg-rose-650 hover:bg-rose-550 text-white text-xs font-black rounded-xl transition cursor-pointer flex items-center justify-center gap-1 min-w-[90px]"
                                        >
                                          {voteSubmitting === prop.id ? '提交中...' : '❌ 拒绝'}
                                        </button>
                                      </>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  );
                })()}
              </div>
            )}

            {/* Vesting Tab */}
            {activeTab === 'vesting' && (() => {
              const projectRounds = rounds[project.id] || [];
              if (projectRounds.length === 0) {
                const avgPrice = project.raisedAmount > 0 && project.goalAmount > 0
                  ? 0.01 + (project.raisedAmount / project.goalAmount) * 0.005
                  : 0.01;
                loadRounds(project.id, 1000000, avgPrice);
                return <div className="text-gray-400 text-xs p-8 text-center">加载解锁数据...</div>;
              }
              const unlockedRounds = projectRounds.filter(r => r.unlocked).length;
              const totalLocked = 38;
              const unlockedPct = projectRounds[0]?.unlocked ? 2 + (unlockedRounds - 1) * (totalLocked / 10) : 0;
              return (
                <div className="space-y-6 animate-fade-in">
                  {/* Summary header */}
                  <div className="grid grid-cols-4 gap-4">
                    <div className="p-4 bg-[#1A1C2C] border border-[#22253E] rounded-xl text-center">
                      <div className="text-2xl font-black text-white">{unlockedRounds}/10</div>
                      <div className="text-[9px] text-gray-500 mt-1">轮次已解锁</div>
                    </div>
                    <div className="p-4 bg-[#1A1C2C] border border-[#22253E] rounded-xl text-center">
                      <div className="text-2xl font-black text-[#635BFF]">{unlockedPct.toFixed(1)}%</div>
                      <div className="text-[9px] text-gray-500 mt-1">团队已解锁</div>
                    </div>
                    <div className="p-4 bg-[#1A1C2C] border border-[#22253E] rounded-xl text-center">
                      <div className="text-2xl font-black text-[#FFA825]">50%</div>
                      <div className="text-[9px] text-gray-500 mt-1">涨幅/轮</div>
                    </div>
                    <div className="p-4 bg-[#1A1C2C] border border-[#22253E] rounded-xl text-center">
                      <div className="text-2xl font-black text-emerald-400">24h</div>
                      <div className="text-[9px] text-gray-500 mt-1">维持时间</div>
                    </div>
                  </div>

                  {/* Round timeline */}
                  <div className="space-y-2">
                    <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">10 轮解锁进度</span>
                    {projectRounds.map((round) => (
                      <div key={round.round}
                        className={`p-3 border rounded-xl flex items-center gap-4 ${
                          round.unlocked ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-[#1A1C2C] border-[#22253E]'
                        }`}
                      >
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-black shrink-0 ${
                          round.unlocked ? 'bg-emerald-500 text-white' : 'bg-[#22253E] text-gray-500'
                        }`}>
                          {round.unlocked ? '✓' : round.round}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-bold text-white">
                            第 {round.round} 轮 · {round.locked}% 解锁
                          </div>
                          <div className="text-[9px] text-gray-500 mt-0.5">
                            触发价 ≥ {round.priceThreshold} TON
                            {round.matched && !round.unlocked && (
                              <span className="text-amber-400 ml-2">维持中: {round.matchedAt ? Math.ceil((Date.now() - new Date(round.matchedAt).getTime()) / 3600000) : '?'}h/24h</span>
                            )}
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <span className={`text-xs font-black ${round.unlocked ? 'text-emerald-400' : 'text-gray-500'}`}>
                            {round.unlocked ? '✅ 已释放' : round.matched ? '⏳ 等待' : '🔒 锁仓中'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}

            {/* Governance Tab */}
            {activeTab === 'governance' && (
              <div className="space-y-6 animate-in fade-in duration-150">
                {/* 1. Vote History Log List */}
                <div className="bg-[#121424] border border-[#22253E] rounded-2xl p-6 text-left">
                  <div className="border-b border-[#22253E] pb-3 mb-5">
                    <span className="text-[10px] text-gray-500 font-mono tracking-wider block">LEDGER PROTOCOL LOGS</span>
                    <h4 className="text-sm font-bold text-white mt-0.5 flex items-center gap-1.5">
                      <ClipboardList className="text-[#8B83FF]" size={16} />
                      <span>项目治理历史提案公簿</span>
                    </h4>
                  </div>

                  {(() => {
                    const projectProposals = proposals[project.id] || [];
                    const historicalProps = projectProposals.filter(p => p.status !== 'active');

                    if (historicalProps.length === 0) {
                      return (
                        <p className="text-xs text-gray-555 py-6 text-center">暂无历史提案结算记录。</p>
                      );
                    }

                    return (
                      <div className="space-y-3.5">
                        {historicalProps.map((prop) => {
                          const yesWeight = prop.yesWeight || 0;
                          const noWeight = prop.noWeight || 0;
                          const totalWeight = yesWeight + noWeight;
                          const yesPercent = totalWeight > 0 ? (yesWeight / totalWeight) * 100 : 0;
                          const isPassed = prop.status === 'passed';

                          return (
                            <div key={prop.id} className="p-4 bg-[#1A1C2C]/65 border border-[#22253E] rounded-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 text-xs">
                              <div className="space-y-1.5 text-left">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className={`p-0.5 px-2 text-[9px] font-bold rounded ${
                                    isPassed 
                                      ? 'bg-emerald-500/10 text-emerald-450 border border-emerald-500/20' 
                                      : 'bg-rose-500/10 text-rose-450 border border-rose-500/20'
                                  }`}>
                                    {isPassed ? '✓ 提款通过' : '✕ 提案否决'}
                                  </span>
                                  <span className="text-gray-500 font-mono text-[10px]">编号: {prop.id.toUpperCase()}</span>
                                </div>
                                <div className="font-bold text-white text-xs">
                                  资金提款：<span className="text-emerald-450 font-extrabold">+{prop.amount} TON</span>
                                </div>
                                <p className="text-gray-450 text-[11px] leading-relaxed max-w-lg font-sans">
                                  <strong className="text-gray-500">申请用途：</strong>{prop.purpose}
                                </p>
                              </div>

                              <div className="text-left sm:text-right shrink-0">
                                <span className="text-gray-500 text-[10px] block">最终赞成权重占比</span>
                                <span className={`text-sm font-mono font-extrabold block mt-0.5 ${isPassed ? 'text-emerald-450' : 'text-rose-450'}`}>
                                  {yesPercent.toFixed(1)}%
                                </span>
                                <span className="text-[9.5px] text-gray-500 block font-mono mt-0.5">
                                  ({yesWeight.toFixed(0)} YES / {noWeight.toFixed(0)} NO)
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
                </div>

                {/* 2. Creator proposal submission form */}
                {(project.creatorAddress === walletAddress || walletAddress === 'VibeDev_88ff') && (
                  <div className="bg-[#121424] border border-[#22253E] rounded-2xl p-6 text-left">
                    <div className="border-b border-[#22253E] pb-3 mb-5">
                      <span className="text-[10px] text-gray-500 font-mono tracking-wider block">CREATOR CONSOLE ONLY</span>
                      <h4 className="text-sm font-bold text-white mt-0.5">项目创世提款提议发起端</h4>
                    </div>

                    {withdrawSuccess && (
                      <div className="p-3 bg-emerald-950/25 border border-emerald-900/35 text-emerald-400 text-xs rounded-xl mb-4.5">
                        🎉 提款提案已发起成功！已记入治理公账，支持者现在可使用平方根投票对其进行公决。
                      </div>
                    )}

                    {withdrawError && (
                      <div className="p-3 bg-rose-955/20 border border-rose-900/30 text-rose-400 text-xs rounded-xl mb-4.5">
                        ⚠️ {withdrawError}
                      </div>
                    )}

                    <form onSubmit={handleCreateProposal} className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-[10px] text-gray-400 font-bold block uppercase">申请提现 TON 金额 (TON AMOUNT)</label>
                          <input
                            type="text"
                            placeholder="例如：200"
                            value={withdrawAmount}
                            onChange={(e) => setWithdrawAmount(e.target.value)}
                            className="w-full bg-[#1A1C2C] border border-[#22253E] focus:border-[#635BFF] text-white rounded-xl px-3.5 py-2.5 text-xs outline-none transition"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] text-gray-400 font-bold block uppercase">当前可用治理锁定余额</label>
                          <div className="w-full bg-[#1A1C2C] border border-[#22253E] text-gray-405 rounded-xl px-3.5 py-2.5 text-xs outline-none font-mono">
                            {(() => {
                              const projectProposals = proposals[project.id] || [];
                              const passedAmount = projectProposals
                                .filter(p => p.status === 'passed')
                                .reduce((sum, p) => sum + p.amount, 0);
                              return (project.raisedAmount * 0.5 - passedAmount).toFixed(2);
                            })()} TON
                          </div>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] text-gray-400 font-bold block uppercase">提现具体开销用途说明 (WITHDRAWAL PURPOSE)</label>
                        <textarea
                          placeholder="详细描述本次提款的用途，例如：租赁GPU算力、用于推特数据抓取模块研发、服务器流量扩容..."
                          value={withdrawPurpose}
                          onChange={(e) => setWithdrawPurpose(e.target.value)}
                          className="w-full bg-[#1A1C2C] border border-[#22253E] focus:border-[#635BFF] text-white rounded-xl px-3.5 py-2.5 text-xs outline-none transition h-20 resize-none font-sans"
                        />
                      </div>

                      <button
                        type="submit"
                        className="px-6 py-2.5 bg-[#635BFF] hover:bg-[#5048E5] text-white text-xs font-black rounded-xl transition cursor-pointer"
                      >
                        提交并公示提款提案
                      </button>
                    </form>
                  </div>
                )}

                {/* 3. Exit Mechanism Panel */}
                <div className="bg-[#121424] border border-[#22253E] rounded-2xl p-6 text-left space-y-5">
                  <div className="border-b border-[#22253E] pb-3">
                    <span className="text-[10px] text-gray-500 font-mono tracking-wider block">COMPLIANCE AND SAFETY PANELS</span>
                    <h4 className="text-sm font-bold text-white mt-0.5 flex items-center gap-1.5">
                      <ShieldAlert className="text-rose-450" size={16} />
                      <span>合规退出与代币销毁机制</span>
                    </h4>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
                    {/* Left: window and checks */}
                    <div className="md:col-span-7 space-y-4">
                      <div className="flex items-center gap-2 bg-slate-950/20 border border-slate-900 p-3 rounded-xl">
                        <Calendar size={15} className="text-rose-455" />
                        <div>
                          <div className="text-xs font-bold text-white">退出窗口：剩余 42 天</div>
                          <div className="text-[9.5px] text-gray-500 font-sans mt-0.5">项目成功星火建币后 30 - 90 天为退出赎回窗口期</div>
                        </div>
                      </div>

                      <div className="space-y-2.5">
                        <span className="text-[10px] text-gray-400 font-bold block uppercase">合规退出触发条件校验清单</span>
                        <div className="space-y-2 text-[11px] font-sans">
                          <div className="p-3 bg-[#1A1C2C] border border-[#22253E] rounded-xl flex items-center justify-between">
                            <span className="text-gray-300">① 连续 14 天项目没有任何代码/周报更新</span>
                            <span className="text-rose-400 font-extrabold flex items-center gap-1 shrink-0">
                              <AlertCircle size={12} />
                              已触发
                            </span>
                          </div>
                          <div className="p-3 bg-[#1A1C2C] border border-[#22253E] rounded-xl flex items-center justify-between">
                            <span className="text-gray-300">② 代币交易价连续 7 天跌破星火发行价的 50%</span>
                            <span className="text-gray-500 font-semibold flex items-center gap-1 shrink-0">
                              <CheckCircle size={12} className="text-gray-600" />
                              未触发
                            </span>
                          </div>
                        </div>
                        <span className="text-[9.5px] text-gray-500 block leading-normal">
                          💡 说明：满足以上任意一条校验状态即可执行硬退出。当前项目代码静默期已超限，退出判定生效。
                        </span>
                      </div>
                    </div>

                    {/* Right: calculation and submit */}
                    <div className="md:col-span-5 bg-[#1A1C2C] border border-[#22253E] rounded-xl p-5 space-y-4 flex flex-col justify-between">
                      {exitSuccess ? (
                        <div className="space-y-3 py-4 text-center">
                          <CheckCircle className="text-emerald-450 mx-auto" size={32} />
                          <p className="text-xs text-gray-200 leading-relaxed font-sans">{exitMsg}</p>
                        </div>
                      ) : (
                        <>
                          <div className="space-y-3.5">
                            <span className="text-[9.5px] text-gray-400 font-bold block uppercase">退出赎回结算测算</span>
                            {(() => {
                              const userBacking = project.backers?.find(b => b.address === walletAddress);
                              const userTokens = userBacking ? Math.round(userBacking.amount / project.tokenPrice) : 0;
                              
                              const projectProposals = proposals[project.id] || [];
                              const passedAmount = projectProposals
                                .filter(p => p.status === 'passed')
                                .reduce((sum, p) => sum + p.amount, 0);
                              const totalGovAllocated = project.raisedAmount * 0.5;
                              const remainingRatio = totalGovAllocated > 0 ? (totalGovAllocated - passedAmount) / totalGovAllocated : 1;
                              const refundableTON = userBacking ? Number((userBacking.amount * remainingRatio * 0.95).toFixed(2)) : 0;

                              return (
                                <div className="space-y-2 text-xs">
                                  <div className="flex justify-between">
                                    <span className="text-gray-450">将被销毁的代币:</span>
                                    <span className="font-bold text-white font-mono">{userTokens} {project.agentTicker}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-gray-450">折合赎回系数:</span>
                                    <span className="font-bold text-gray-300 font-mono">{(remainingRatio * 0.95 * 100).toFixed(0)}%</span>
                                  </div>
                                  <div className="flex justify-between border-t border-[#22253E] pt-2 mt-1">
                                    <span className="text-gray-400 font-bold">可退回的 TON 资金:</span>
                                    <span className="font-black text-emerald-400 font-mono text-sm">{refundableTON} TON</span>
                                  </div>
                                </div>
                              );
                            })()}
                          </div>

                          <div className="pt-2">
                            {(() => {
                              const userBacking = project.backers?.find(b => b.address === walletAddress);
                              const hasShare = userBacking && userBacking.amount > 0;
                              return (
                                <button
                                  type="button"
                                  disabled={exitLoading || !hasShare}
                                  onClick={handleExitProject}
                                  className={`w-full py-2.5 rounded-xl text-xs font-black transition cursor-pointer flex items-center justify-center gap-1.5 ${
                                    hasShare 
                                      ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-md shadow-rose-950/20' 
                                      : 'bg-slate-900 border border-slate-800 text-gray-500 cursor-not-allowed'
                                  }`}
                                >
                                  {exitLoading ? '正在赎回资金并退款...' : '确认退出并销毁所持代币'}
                                </button>
                              );
                            })()}
                            {!project.backers?.some(b => b.address === walletAddress) && (
                              <span className="text-[9px] text-gray-500 block text-center mt-2 leading-relaxed">
                                您未参与本项目的星火共建，故无份额可赎回。
                              </span>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 3. Proof Tab - 72H Sandbox Simulation Console */}
            {activeTab === 'proof' && (
              <div className="space-y-6 animate-in fade-in duration-150">
                {/* Collapsible Sandbox Console Header */}
                <div className="bg-[#0D0F1F] border border-[#23275A] p-5 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 text-left shadow-lg">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="p-1 px-2 rounded bg-indigo-500/10 border border-indigo-500/20 text-[#A699FF] text-[9px] font-mono font-bold tracking-widest uppercase">72H SANDBOX SIMULATOR</span>
                      <span className="text-[10px] text-emerald-450 font-bold flex items-center gap-1 bg-emerald-500/10 p-0.5 px-2.5 rounded-full border border-emerald-500/20">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        <span>可验证自治审计</span>
                      </span>
                    </div>
                    <h3 className="text-base font-black text-white flex items-center gap-1.5 mt-1">
                      <Bot size={18} className="text-[#635BFF]" />
                      <span>72小时代码试运行与决策加速沙盒</span>
                    </h3>
                    <p className="text-xs text-gray-400 leading-relaxed font-sans">
                      模拟智能体前 72 小时的链上运行状态、收入模式与自动分配划拨机制。默认折叠，可展开进行仿真加速。
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsSandboxCollapsed(!isSandboxCollapsed)}
                    className="px-4 py-2 bg-[#635BFF] hover:bg-[#5048E5] text-white text-xs font-bold rounded-xl transition cursor-pointer shrink-0"
                  >
                    {isSandboxCollapsed ? '展开沙箱模拟器 (Expand)' : '收起沙箱模拟器 (Collapse)'}
                  </button>
                </div>

                {!isSandboxCollapsed && (
                  <>
                    <div className="bg-gradient-to-br from-[#110E34] to-[#0A0B1A] border border-[#26215D] rounded-2xl p-5 relative overflow-hidden text-left">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 blur-2xl pointer-events-none" />
                      
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#212453] pb-4">
                        <div className="space-y-1">
                          <span className="p-1 px-2.5 rounded-full bg-indigo-500/10 border border-indigo-400/30 text-[#A699FF] text-[9.5px] font-mono font-black uppercase tracking-wider">
                            72小时代码试运行与决策加速沙盒 (72H Sandbox Console)
                          </span>
                          <h4 className="text-base font-black text-white flex items-center gap-1.5 mt-1">
                            <Bot size={16} className="text-emerald-400" />
                            <span>项目仿真编译与链上状态演进器</span>
                          </h4>
                        </div>

                        <div className="bg-[#05060E] border border-[#1B1E38] p-2.5 px-4 rounded-xl flex items-center gap-3 shrink-0">
                          <div className="text-left">
                            <span className="text-[9px] text-gray-500 font-mono block">ELAPSED TIME</span>
                            <span className="font-mono text-lg font-black text-white">{currentHour}/72 <span className="text-xs text-gray-400">Hours</span></span>
                          </div>
                          <div className="w-[1px] h-8 bg-slate-800" />
                          <div className="text-left font-mono">
                            <span className="text-[9px] text-gray-500 block">SIMULATED PROFIT</span>
                            <span className="text-sm font-black text-emerald-400">+{simulatedProfit.toFixed(2)} TON</span>
                          </div>
                        </div>
                      </div>

                      {/* Hour Indicator Progress Timeline */}
                      <div className="py-4 select-none">
                        <div className="flex justify-between items-center text-[10px] text-gray-400 mb-2 font-mono">
                          <span>0H (编译/AST检查)</span>
                          <span>24H (沙盒侧链部署)</span>
                          <span>48H (自治算力审计)</span>
                          <span>72H (解锁自动派发)</span>
                        </div>

                        <div className="w-full h-2.5 bg-[#050711] rounded-full overflow-hidden border border-[#1A1F3B] p-0.5 relative">
                          <div 
                            className="h-full bg-gradient-to-r from-indigo-500 via-sky-400 to-emerald-400 rounded-full transition-all duration-300"
                            style={{ width: `${(currentHour / 72) * 100}%` }}
                          />
                          {/* Interval markers */}
                          <span className="absolute left-[33.3%] top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-indigo-800" />
                          <span className="absolute left-[66.6%] top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-sky-800" />
                        </div>
                      </div>

                      {/* Acceleration controllers */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2">
                        <button
                          type="button"
                          onClick={() => handleFastForward(12)}
                          disabled={currentHour >= 72}
                          className="py-1.5 px-3 bg-[#111326] hover:bg-[#1C1F3F] border border-[#212550] text-[#A699FF] hover:text-white rounded-lg text-[10.5px] font-bold transition flex items-center justify-center gap-1 cursor-pointer disabled:opacity-40"
                        >
                          🏃‍♂️ 加速 12 小时 (+12H)
                        </button>
                        <button
                          type="button"
                          onClick={() => handleFastForward(24)}
                          disabled={currentHour >= 72}
                          className="py-1.5 px-3 bg-[#111326] hover:bg-[#1C1F3F] border border-[#212550] text-[#A699FF] hover:text-white rounded-lg text-[10.5px] font-bold transition flex items-center justify-center gap-1 cursor-pointer disabled:opacity-40"
                        >
                          🚀 加速 24 小时 (+24H)
                        </button>
                        <button
                          type="button"
                          onClick={() => handleFastForward(72)}
                          disabled={currentHour >= 72}
                          className="py-1.5 px-3 bg-indigo-505/10 hover:bg-indigo-600/20 text-indigo-400 hover:text-indigo-300 rounded-lg text-[10.5px] font-bold border border-indigo-505/20 transition flex items-center justify-center gap-1 cursor-pointer disabled:opacity-40"
                        >
                          ⚡ 一键完成 72H 循环
                        </button>
                        <button
                          type="button"
                          onClick={handleResetSandbox}
                          className="py-1.5 px-3 bg-red-950/20 hover:bg-red-950/40 text-red-400 hover:text-red-300 rounded-lg text-[10.5px] font-bold border border-red-950/30 transition flex items-center justify-center gap-1 cursor-pointer"
                        >
                          🔄 状态完全重置 (Reset)
                        </button>
                      </div>
                    </div>

                    {/* Virtual Telemetry Terminal Logs window */}
                    <div className="space-y-2 text-left">
                      <div className="flex items-center justify-between text-[11px] text-gray-500 font-mono">
                        <span className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                          <span>实时沙箱审计日志流 (EMULATED TELEMETRY LOGSTREAM)</span>
                        </span>
                        <span>Node: SG_W3_Validator_7</span>
                      </div>

                      <div className="bg-[#05060B] border border-[#191C3E] rounded-2xl p-4 h-60 overflow-y-auto font-mono text-[10.5px] leading-relaxed space-y-2.5 scrollbar-thin scroll-smooth select-text">
                        {sandboxLogs.map((log, index) => {
                          let colorClass = 'text-gray-300';
                          if (log.type === 'success') colorClass = 'text-emerald-400 font-semibold';
                          if (log.type === 'warn') colorClass = 'text-amber-400 font-semibold';
                          if (log.type === 'system') colorClass = 'text-purple-400 font-black';
                          if (log.type === 'info') colorClass = 'text-sky-300';

                          return (
                            <div key={index} className="flex gap-2 items-start hover:bg-white/5 p-1 rounded-md transition duration-75">
                              <span className="text-gray-600 shrink-0 select-none">[{log.time}]</span>
                              <span className={colorClass}>{log.message}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Simulated revenue and layout stats */}
                    <div className="bg-[#0B0C18]/60 p-4 border border-[#1E2145] rounded-xl text-left text-xs leading-relaxed text-gray-400">
                      💡 <strong>提示:</strong> 该测试沙盘基于 72H 自动星火共建规则，当您快进至特定小时后，系统将自动验证和拨付相对应的星火共建阶段。触发的里程碑可在 <strong>“Spark”</strong> 标签页实时核实，其产生的已分配份额记录也将在您的 <strong>“我的持仓控制面板” (Portfolio)</strong> 自动汇总。
                    </div>
                  </>
                )}
              </div>
            )}

            {/* 4. Discussion Tab */}
            {activeTab === 'discussion' && (
              <div className="space-y-5 animate-in fade-in duration-100">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider block border-b border-[#1A1F3F] pb-2">开发者与持有人共识论坛</h3>

                {/* Comment Form Submit block */}
                <form onSubmit={handlePostComment} className="space-y-3">
                  <div className="space-y-1.5 text-left">
                    <label className="text-[10px] text-gray-500 font-mono tracking-wider block">发表你的观点或提问</label>
                    <textarea
                      placeholder={isConnected ? "请发表理性言论，向开发者提出技术或多签治理疑问..." : "请先连接钱包授权后参与发帖研讨..."}
                      disabled={!isConnected}
                      value={newCommentText}
                      onChange={(e) => setNewCommentText(e.target.value)}
                      rows={3}
                      className="w-full bg-[#121429] border border-[#21254F] focus:border-[#635BFF] p-3 text-xs text-gray-200 rounded-xl outline-none transition resize-none"
                    />
                  </div>

                  <div className="flex justify-between items-center">
                    {commentSuccess ? (
                      <span className="text-[11px] text-emerald-400 font-bold flex items-center gap-1 animate-in fade-in">
                        <ShieldCheck size={12} />
                        <span>观点广播成功！正在全分布式节点中同步...</span>
                      </span>
                    ) : (
                      <span className="text-[9.5px] text-gray-500">发言需要遵守 TON 测试沙盒协议。</span>
                    )}

                    <button
                      type="submit"
                      disabled={!isConnected || !newCommentText.trim()}
                      className="px-4 py-2 bg-[#635BFF] hover:bg-[#5048E5] text-white text-xs font-bold rounded-xl shadow-md transition flex items-center gap-1 cursor-pointer disabled:opacity-50"
                    >
                      <Send size={11} />
                      <span>发布评论</span>
                    </button>
                  </div>
                </form>

                {/* Comments Stream feed */}
                <div className="space-y-4 pt-4 border-t border-[#1C1F3F]/60">
                  {(project.comments || []).length === 0 ? (
                    <p className="text-gray-500 text-xs text-center py-6 block">目前尚无探讨观点，快连接钱包来抢占 SF 吧！</p>
                  ) : (
                    <div className="space-y-3 max-h-80 overflow-y-auto pr-1 scrollbar-thin">
                      {(project.comments || []).map((comm) => (
                        <div key={comm.id} className="bg-[#121429] p-3 rounded-xl border border-[#212450] space-y-1 text-left">
                          <div className="flex justify-between items-center text-[10px] text-gray-500 font-mono">
                            <span className="font-bold text-[#8680E5]">@{comm.author}</span>
                            <span>{new Date(comm.timestamp).toLocaleString()}</span>
                          </div>
                          <p className="text-xs text-slate-300 leading-relaxed font-sans">{comm.content}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Unified Lifecycle Emission and Capital Engine */}
        <div className="lg:col-span-4 space-y-6">
          <div id="invest-form">
            <LifecycleEmissionCard
              project={project}
              profile={profile}
              isConnected={isConnected}
              connectWallet={connectWallet}
              updateProfile={updateProfile}
              addFunds={addFunds}
              investInProject={investInProject}
              teamId={selectedTeamId}
              onSuccess={handleSparkSuccess}
            />
          </div>

          {/* Genesis Backer Card */}
          {(() => {
            const firstBacker = project.backers && project.backers.length > 0
              ? [...project.backers].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())[0]
              : null;
            
            return (
              <div className="bg-[#090A13] border border-[#1C1F3F] rounded-3xl p-5 space-y-3 text-left">
                <h3 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5 border-b border-[#141630] pb-2">
                  <Crown size={14} className="text-amber-400" />
                  <span>👑 创世星火支持者 (Genesis Backer)</span>
                </h3>
                
                {firstBacker ? (
                  <div className="flex items-center justify-between gap-3 bg-[#0E101F]/40 border border-[#1D2140] p-3 rounded-2xl">
                    <div className="min-w-0 flex-1">
                      <span className="text-[8.5px] text-gray-500 font-mono block">WALLET ADDRESS</span>
                      <span className="text-[11px] font-mono font-bold text-gray-300 block truncate" title={firstBacker.address}>
                        {firstBacker.address}
                      </span>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-[8.5px] text-gray-500 font-mono block">SUPPORTED</span>
                      <span className="text-xs font-black text-amber-400 font-mono">{firstBacker.amount} TON</span>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 bg-[#0E101F]/20 border border-dashed border-[#1E2245] rounded-2xl text-center">
                    <p className="text-[11px] text-gray-400 leading-relaxed font-sans">
                      首位星火人：<strong className="text-amber-400">虚位以待！</strong><br />
                      参与支持该项目，成为首位创世星火支持者，即可在个人中心点亮专属勋章！
                    </p>
                  </div>
                )}
              </div>
            );
          })()}

          {/* Active Teams list for group buy */}
          {project.status === 'active' && (
            <div className="bg-[#090A13] border border-[#1C1F3F] rounded-3xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-black text-white uppercase tracking-wider">
                  👥 活跃拼单战队 ({projectActiveTeams.length})
                </h3>
                <button
                  onClick={() => {
                    setSelectedTeamId(undefined);
                    const formEl = document.getElementById('invest-form');
                    if (formEl) {
                      formEl.scrollIntoView({ behavior: 'smooth' });
                    }
                  }}
                  className="px-2 py-1.5 bg-[#635BFF]/10 hover:bg-[#635BFF]/20 text-[#8C84FF] text-[10px] font-bold rounded-xl border border-[#635BFF]/20 transition cursor-pointer"
                >
                  + 发起拼单
                </button>
              </div>

              {projectActiveTeams.length === 0 ? (
                <p className="text-[11px] text-gray-500 py-3 text-center border border-dashed border-slate-900 rounded-xl leading-relaxed">
                  暂无活跃拼单。你可以点击上方按钮发起首个拼单小组，邀请好友参与！
                </p>
              ) : (
                <div className="space-y-3.5 pr-1 max-h-[220px] overflow-y-auto scrollbar-thin">
                  {projectActiveTeams.map((team) => {
                    const progress = (team.currentAmount / team.targetAmount) * 100;
                    return (
                      <div key={team.id} className="p-3 bg-[#111324]/40 border border-[#202341] rounded-xl space-y-2.5 text-xs text-left">
                        <div className="flex justify-between items-center">
                          <span className="font-bold text-gray-300 font-sans">{team.creatorName} 的战队</span>
                          <span className="text-[10px] text-sky-400 font-bold bg-sky-950/20 px-1.5 py-0.5 rounded font-mono">
                            {team.members.length} 人已入
                          </span>
                        </div>
                        
                        {/* Progress Bar */}
                        <div className="space-y-1 font-mono text-[10px] text-gray-400">
                          <div className="flex justify-between">
                            <span>已凑: {team.currentAmount}/{team.targetAmount} TON</span>
                            <span>{progress.toFixed(0)}%</span>
                          </div>
                          <div className="h-1 bg-[#05060F] rounded-full overflow-hidden border border-[#161833]">
                            <div 
                              className="h-full bg-gradient-to-r from-[#635BFF] to-sky-400 animate-pulse rounded-full"
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                        </div>

                        <div className="flex justify-between items-center pt-1">
                          <span className="text-[9.5px] text-gray-550">截止时间: 24h 内</span>
                          <button
                            onClick={() => {
                              setSelectedTeamId(team.id);
                              const formEl = document.getElementById('invest-form');
                              if (formEl) {
                                formEl.scrollIntoView({ behavior: 'smooth' });
                              }
                            }}
                            className="px-3 py-1 bg-sky-500 hover:bg-sky-600 text-black font-extrabold text-[10px] rounded-lg transition cursor-pointer active:scale-95"
                          >
                            立即加入
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {showCelebration && (
        <CelebrationOverlay
          projectName={project.agentName}
          amount={backedAmount}
          onComplete={handleCelebrationComplete}
        />
      )}

      {showShareModal && (
        <ShareModal
          project={project}
          amount={backedAmount}
          teamId={backedTeamId}
          onClose={() => {
            setShowShareModal(false);
            setBackedTeamId(undefined);
          }}
        />
      )}

      {/* Floating Simulation Stage Jumper */}
      {activeTab === 'proof' && (
        <div className="fixed bottom-6 right-6 z-50 group flex flex-col items-end gap-2">
          <div className="hidden group-hover:flex flex-col gap-1.5 bg-[#090A14]/95 border border-[#23275A] p-2.5 rounded-2xl shadow-2xl animate-in slide-in-from-bottom duration-150 w-44">
            <span className="text-[9px] font-mono font-black text-indigo-400 px-1 uppercase tracking-widest block border-b border-slate-800/60 pb-1 mb-1 text-center">Stage Jumper</span>
            {[
              { hour: 0, label: "0H - Init AST Check" },
              { hour: 24, label: "24H - Deploy Sandbox" },
              { hour: 48, label: "48H - Audits Scan" },
              { hour: 72, label: "72H - Release Spark" }
            ].map((stg) => (
              <button
                key={stg.hour}
                type="button"
                onClick={() => {
                  if (stg.hour > currentHour) {
                    handleFastForward(stg.hour - currentHour);
                  } else if (stg.hour < currentHour) {
                    // Backtrack hour
                    setCurrentHour(stg.hour);
                    setSimulatedProfit(Number((stg.hour * 0.15).toFixed(2)));
                    setSandboxLogs(prev => [
                      ...prev,
                      { time: "SYSTEM", message: `↩️ Rollback simulation stage to Hour ${stg.hour}.`, type: 'system' }
                    ]);
                  }
                }}
                className={`w-full px-2.5 py-1 text-left rounded-lg text-[10px] font-mono font-bold transition flex justify-between items-center ${
                  currentHour === stg.hour 
                    ? 'bg-[#635BFF] text-white font-black' 
                    : 'text-gray-400 bg-[#121429] hover:bg-[#635BFF]/15 hover:text-white'
                }`}
              >
                <span>{stg.label}</span>
                <span>{currentHour === stg.hour ? '●' : ''}</span>
              </button>
            ))}
          </div>
          <button
            type="button"
            className="w-12 h-12 rounded-full bg-gradient-to-tr from-[#635BFF] to-[#8F7BFF] hover:scale-105 hover:from-[#5048E5] hover:to-[#837BFF] text-white shadow-2xl shadow-[#635BFF]/30 flex items-center justify-center transition-all border border-[#837BFF]/40 active:scale-95 cursor-pointer font-bold relative"
            title="Jump simulation stages"
          >
            <Sparkles size={18} className="text-amber-300 animate-pulse" />
          </button>
        </div>
      )}
    </div>
  );
}
