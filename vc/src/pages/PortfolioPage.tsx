import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, LineChart, Line, CartesianGrid 
} from 'recharts';
import { 
  Bot, Coins, ArrowUpRight, Award, Receipt, ShieldQuestion, 
  HelpCircle, CheckCircle2, TrendingUp, TrendingDown, Layers, 
  History, Wallet, Star, Sparkles, FolderLock, Plus 
} from 'lucide-react';
import { useUserStore } from '../store/userStore';
import { useSparkStore } from '../store/sparkStore';
import { useAgentStore } from '../store/agentStore';
import { Card, CardHeader, CardTitle, CardDescription } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { ProgressBar } from '../components/ui/ProgressBar';

export default function PortfolioPage() {
  const { isConnected, walletAddress, profile, connectWallet, updateProfile } = useUserStore();
  const navigate = useNavigate();
  const { tokens, projects } = useSparkStore();
  const { agents } = useAgentStore();

  const [activeTab, setActiveTab] = useState<'projects' | 'investments' | 'earnings' | 'assets'>('projects');
  const [chartMode, setChartMode] = useState<'daily' | 'monthly'>('daily');
  const [claimSuccess, setClaimSuccess] = useState(false);
  const [claimedVal, setClaimedVal] = useState(0);
  const [claimError, setClaimError] = useState<string>('');

  // 72H Auto-Reinvestment Optimizer States
  const [isAutoReinvestEnabled, setIsAutoReinvestEnabled] = useState(false);
  const [reinvestAssetTarget, setReinvestAssetTarget] = useState<'OSA' | 'TBP' | 'CVA'>('OSA');
  const [reinvestRatio, setReinvestRatio] = useState<number>(50); // percentage to allocate to compounding
  const [reinvestHistory, setReinvestHistory] = useState<string[]>([
    "2026-05-27 10:14: 自动复投 3.50 TON 已分配份额配股 $OSA 池中",
    "2026-05-25 18:22: 自动复投 1.10 TON 已分配份额配股 $TBP 池中"
  ]);

  // Pre-listing utility states
  const [expandedUtilityId, setExpandedUtilityId] = useState<string | null>(null);
  const [utilityActionLoading, setUtilityActionLoading] = useState<string | null>(null);
  const [utilityMsg, setUtilityMsg] = useState<string>('');

  const handleUtilityAction = (actionType: 'consume' | 'stake' | 'vote', ticker: string, projectId?: string) => {
    setUtilityActionLoading(actionType);
    setUtilityMsg('');

    setTimeout(() => {
      if (actionType === 'consume') {
        setUtilityMsg(`🎉 调用成功！已消耗 0.1 $${ticker} AI 算力额度，成功导出最新的智能体分析报告日志。`);
      } else if (actionType === 'stake') {
        setUtilityMsg(`🎉 质押成功！已成功将部分 $${ticker} 代币划转至 Backer Pool 质押仓，您已获得下一期项目的早鸟优先配售乘数 (1.5x Multiplier)！`);
      } else if (actionType === 'vote') {
        if (projectId) {
          navigate(`/launch/${projectId}?tab=health`);
        } else {
          setUtilityMsg(`⚠️ 项目未部署，无法跳转治理看板。`);
        }
      }
      setUtilityActionLoading(null);
    }, 1200);
  };

  const handleWalletFallback = () => {
    connectWallet();
  };

  // Helper to load inventory from local storage
  const getInventory = (): Record<string, number> => {
    if (typeof window === 'undefined') return {};
    const data = localStorage.getItem('vc_inventory');
    return data ? JSON.parse(data) : { "tok-1": 500, "tok-2": 150, "tok-3": 250, "tok-osa": 100, "tok-cva": 200 };
  };

  const inventory = getInventory();

  // Calculate overall valuation based on live inventory worth
  const calculateWorth = () => {
    let tot = 0;
    tokens.forEach((tok) => {
      const amt = inventory[tok.id] || 0;
      tot += amt * tok.price;
    });
    // Add additional mock holdings from launchpad if any
    if (inventory["tok-osa"]) tot += inventory["tok-osa"] * 0.012;
    if (inventory["tok-cva"]) tot += inventory["tok-cva"] * 0.015;
    return Number(tot.toFixed(2));
  };

  const totalWorthTON = calculateWorth();

  // Tab 1: My Projects (Created by me or OmniLabs representation)
  const myCreatedProjects = projects.filter(p => p.creatorAddress === walletAddress || p.id === 'spark-1');

  // Tab 2: My Investments
  // We include explicit user backed projects + some high fallback records for rich demo
  const backedProjects = projects.filter(p => walletAddress && p.backers?.some(b => b.address === walletAddress));
  const myInvestments = [
    {
      id: "inv-1",
      projectName: "OmniSocial Influencer V1",
      ticker: "OSA",
      investedTON: 200,
      acquiredUnits: 20000,
      currentPrice: 0.015, // in TON
      cumulativeDividends: 8.5,
      mcapChange: 22.4
    },
    {
      id: "inv-2",
      projectName: "TrendBot Pro Quant",
      ticker: "TBP",
      investedTON: 150,
      acquiredUnits: 10000,
      currentPrice: 0.0245,
      cumulativeDividends: 14.2,
      mcapChange: 63.3
    },
    ...backedProjects.map(p => ({
      id: `inv-${p.id}`,
      projectName: p.title,
      ticker: p.agentTicker,
      investedTON: p.backers?.find(b => b.address === walletAddress)?.amount || 50,
      acquiredUnits: (p.backers?.find(b => b.address === walletAddress)?.amount || 50) / p.tokenPrice,
      currentPrice: p.tokenPrice,
      cumulativeDividends: 0,
      mcapChange: 0
    }))
  ];

  // Tab 3: My Earnings data
  const dailyCumulativeEarningsData = [
    { date: '05-01', TrendBot: 1.10, OmniSocial: 0.50, CodeAuditor: 0.30, cumulative: 1.90 },
    { date: '05-02', TrendBot: 1.40, OmniSocial: 0.80, CodeAuditor: 0.50, cumulative: 2.70 },
    { date: '05-03', TrendBot: 1.90, OmniSocial: 1.10, CodeAuditor: 0.60, cumulative: 3.60 },
    { date: '05-04', TrendBot: 2.30, OmniSocial: 1.50, CodeAuditor: 0.90, cumulative: 4.70 },
    { date: '05-05', TrendBot: 3.00, OmniSocial: 1.70, CodeAuditor: 1.20, cumulative: 5.90 },
    { date: '05-06', TrendBot: 3.50, OmniSocial: 2.10, CodeAuditor: 1.50, cumulative: 7.10 },
    { date: '05-07', TrendBot: 3.90, OmniSocial: 2.60, CodeAuditor: 1.70, cumulative: 8.20 },
    { date: '05-08', TrendBot: 4.50, OmniSocial: 3.00, CodeAuditor: 2.00, cumulative: 9.50 },
    { date: '05-09', TrendBot: 5.10, OmniSocial: 3.30, CodeAuditor: 2.20, cumulative: 10.60 },
    { date: '05-10', TrendBot: 5.80, OmniSocial: 3.70, CodeAuditor: 2.50, cumulative: 12.00 },
    { date: '05-11', TrendBot: 6.40, OmniSocial: 4.10, CodeAuditor: 2.90, cumulative: 13.40 },
    { date: '05-12', TrendBot: 7.10, OmniSocial: 4.50, CodeAuditor: 3.20, cumulative: 14.80 },
    { date: '05-13', TrendBot: 7.80, OmniSocial: 4.90, CodeAuditor: 3.50, cumulative: 16.20 },
    { date: '05-14', TrendBot: 8.40, OmniSocial: 5.30, CodeAuditor: 3.90, cumulative: 17.60 },
    { date: '05-15', TrendBot: 9.00, OmniSocial: 5.80, CodeAuditor: 4.20, cumulative: 19.00 },
    { date: '05-16', TrendBot: 9.70, OmniSocial: 6.20, CodeAuditor: 4.60, cumulative: 20.50 },
    { date: '05-17', TrendBot: 10.50, OmniSocial: 6.60, CodeAuditor: 4.90, cumulative: 22.00 },
    { date: '05-18', TrendBot: 11.20, OmniSocial: 7.10, CodeAuditor: 5.30, cumulative: 23.60 },
    { date: '05-19', TrendBot: 11.90, OmniSocial: 7.50, CodeAuditor: 5.60, cumulative: 25.00 },
    { date: '05-20', TrendBot: 12.50, OmniSocial: 8.00, CodeAuditor: 6.00, cumulative: 26.50 },
    { date: '05-21', TrendBot: 13.20, OmniSocial: 8.40, CodeAuditor: 6.40, cumulative: 28.00 },
    { date: '05-22', TrendBot: 13.80, OmniSocial: 8.90, CodeAuditor: 6.70, cumulative: 29.40 },
    { date: '05-23', TrendBot: 14.50, OmniSocial: 9.30, CodeAuditor: 7.10, cumulative: 30.90 },
    { date: '05-24', TrendBot: 15.20, OmniSocial: 9.80, CodeAuditor: 7.50, cumulative: 32.50 },
    { date: '05-25', TrendBot: 15.90, OmniSocial: 10.30, CodeAuditor: 7.80, cumulative: 34.00 },
    { date: '05-26', TrendBot: 16.70, OmniSocial: 10.70, CodeAuditor: 8.20, cumulative: 35.60 },
    { date: '05-27', TrendBot: 17.50, OmniSocial: 11.20, CodeAuditor: 8.60, cumulative: 37.30 },
    { date: '05-28', TrendBot: 18.20, OmniSocial: 11.70, CodeAuditor: 9.00, cumulative: 38.90 }
  ];

  const monthlyEarningsData = [
    { month: '01月', earnings: 1.2 },
    { month: '02月', earnings: 3.8 },
    { month: '03月', earnings: 7.5 },
    { month: '04月', earnings: 12.4 },
    { month: '05月', earnings: 22.7 }
  ];

  const sourceEarningsData = [
    { name: '已分配份额 (Agent Allocations)', value: 65, color: '#635BFF' },
    { name: 'Launchpad 兑回 (Swap Allocation)', value: 20, color: '#10B981' },
    { name: '其他开发者返利 (Rebates)', value: 15, color: '#F59E0B' }
  ];

  const earningsRecords = [
    { id: "e1", time: "2026-05-26 14:32", source: "TrendBot Pro (套利分配)", amount: "4.21 TON", status: "已到账" },
    { id: "e2", time: "2026-05-24 10:11", source: "Launchpad Swap 溢价", amount: "8.50 TON", status: "已到账" },
    { id: "e3", time: "2026-05-21 18:00", source: "OmniSocial 节点结算", amount: "2.10 TON", status: "已到账" },
    { id: "e4", time: "2026-05-18 09:44", source: "Developer Hub 返修算力", amount: "7.89 TON", status: "已到账" }
  ];

  // Tab 4: Assets positions
  const assetPositions = [
    { symbol: "TBP", name: "TrendBot Pro", balance: inventory["tok-1"] || 500, price: tokens.find(t=>t.id==="tok-1")?.price || 0.0245, change: 18.4 },
    { symbol: "MGAI", name: "Matrix Game Oracle", balance: inventory["tok-2"] || 150, price: tokens.find(t=>t.id==="tok-2")?.price || 0.0185, change: -4.2 },
    { symbol: "DYH", name: "DeFi Yield Token", balance: inventory["tok-3"] || 250, price: tokens.find(t=>t.id==="tok-3")?.price || 0.0382, change: 8.9 },
    { symbol: "OSA", name: "OmniSocial Influencer", balance: inventory["tok-osa"] || 0, price: 0.012, change: 12.2 },
    { symbol: "CVA", name: "CodeVibe Auditor", balance: inventory["tok-cva"] || 0, price: 0.015, change: 0.0 }
  ].filter(a => a.balance > 0);

  // Dynamic calculation for Combined Historical Dividends combining local myInvestments and useFundStore (projects)
  const calculateTotalDividends = () => {
    let total = myInvestments.reduce((sum, inv) => sum + (inv.cumulativeDividends || 0), 0);
    projects.forEach((proj) => {
      const userBacking = proj.backers?.find(b => b.address === walletAddress);
      if (userBacking) {
        const completedMilestones = proj.milestones?.filter(m => m.status === 'completed').length || 0;
        const totalMilestones = proj.milestones?.length || 4;
        const dynamicYield = userBacking.amount * (completedMilestones / totalMilestones) * 0.08;
        total += dynamicYield;
      }
    });
    return Number(total.toFixed(2));
  };

  const totalHistoricalDividends = calculateTotalDividends();

  // Claim process
  const handleClaimDividends = () => {
    if (!isConnected || !profile) return;
    setClaimError('');

    // Rule: 体验金分配解锁门槛 ≥ 5 TON 且需一次链上 Gas 消耗，体验金本身使用不受限。
    if (profile.hasUsedTrial) {
      if (profile.balanceTON < 5) {
        setClaimError('⚠️ 提取失败：账户使用过体验金。需要钱包余额 ≥ 5 TON 才能解锁结算提取。');
        return;
      }
      if (!profile.hasGasConsumption) {
        setClaimError('⚠️ 提取失败：账户使用过体验金。需要至少进行一次链上交易消耗 Gas 后才能解锁。');
        return;
      }
    }

    const randomYield = Number((Math.random() * 5 + 3).toFixed(2));
    setClaimedVal(randomYield);
    updateProfile({
      balanceTON: Number((profile.balanceTON + randomYield).toFixed(2))
    });
    setClaimSuccess(true);
    setTimeout(() => {
      setClaimSuccess(false);
    }, 4000);
  };

  if (!isConnected) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-[#0C101B] border border-[#21245D] flex items-center justify-center mx-auto">
          <Receipt size={28} className="text-[#635BFF]" />
        </div>
        <div className="space-y-2">
          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">授权当前工作区</h2>
          <p className="text-xs sm:text-sm text-gray-400 max-w-md mx-auto leading-relaxed">
            查看您的共建持仓、分配算力账户或一键领测试代金券需要连接开发者 TON 钱包。
          </p>
        </div>
        <div className="pt-2">
          <button
            onClick={handleWalletFallback}
            className="px-6 py-2.5 bg-[#635BFF] hover:bg-[#5048E5] text-white rounded-xl text-xs sm:text-sm font-semibold shadow-lg shadow-[#635BFF]/20 transition cursor-pointer"
          >
            连接开发者钱包 Connect TON Wallet
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-10 text-left select-none">
      
      {/* Upper header with profile basic metrics */}
      <div className="border-b border-[#171A30] pb-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-2.5">
            <Coins className="text-[#8B83FF]" size={24} />
            <span>Portfolio</span>
          </h1>
          <p className="text-sm text-gray-400 mt-2 leading-relaxed max-w-3xl font-sans">
            实时汇总您的链上代币配股净值、自制 AI 项目共建进展及自动分配流水。
          </p>
        </div>
      </div>

      {/* PREMIUM SUMMARY CARD: Total Historical Dividends Calculation & Project-wise Breakdown */}
      <div className="bg-gradient-to-r from-[#111326] via-[#0E1022] to-[#0A0C16] border border-[#1C1F3F] rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-[#635BFF]/5 blur-3xl rounded-full -mr-20 -mt-20 pointer-events-none" />
        <div className="absolute bottom-0 left-1/4 w-52 h-52 bg-emerald-500/5 blur-3xl rounded-full pointer-events-none" />
        
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2 text-left">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-0.5 bg-[#635BFF]/10 rounded-full border border-[#635BFF]/20 text-[#8B83FF] text-[10px] font-mono tracking-wider font-medium uppercase">
                分配清算凭证 (ALLOCATION SETTLEMENT CREDENTIALS)
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span className="text-[10px] text-gray-500 font-mono">Real-time sync</span>
            </div>
            
            <h2 className="text-xl font-bold text-white tracking-tight leading-tight flex items-center gap-2">
              <Award className="text-amber-500" size={18} />
              <span>累计已分配记录</span>
            </h2>
            <p className="text-xs text-gray-400 max-w-2xl leading-relaxed">
              汇聚星火市场和 Launchpad 二级市场的多签分配派送。分配已通过智能合约网关进入您关联的 TON 网络钱包中。
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 bg-[#05060D] border border-[#161933] p-4 rounded-xl shrink-0 min-w-[280px]">
            <div className="text-left flex-1">
              <span className="text-[10.5px] text-gray-400 font-mono block font-semibold">COMBINED ALLOCATION</span>
              <div className="flex items-baseline gap-1.5 mt-1">
                <span className="text-3xl font-bold font-mono text-[#F59E0B] tracking-tight">{totalHistoricalDividends.toFixed(2)}</span>
                <span className="text-xs font-mono font-bold text-gray-450">TON</span>
              </div>
              <span className="text-[9.5px] text-emerald-400 font-mono block font-medium mt-1">
                ≈ ${((totalHistoricalDividends) * 6.5).toFixed(2)} USD
              </span>
            </div>
            <div className="hidden sm:block w-px h-12 bg-[#1C1F3F] mx-2" />
            <div className="text-left text-[10px] space-y-1 text-gray-400 self-center">
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#635BFF]" />
                <span>直接支持分配: <strong className="text-white font-mono">22.70 TON</strong></span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span>节点自动结算: <strong className="text-white font-mono">{(totalHistoricalDividends - 22.7).toFixed(2)} TON</strong></span>
              </div>
            </div>
          </div>
        </div>

        {/* Project Snapshot Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-5 mt-5 border-t border-[#1C1F3D] relative z-10 text-left">
          {myInvestments.map((inv, index) => {
            const pairedProj = projects.find(p => p.agentTicker === inv.ticker);
            const statusLabel = pairedProj?.status === 'success' ? '完全商业化 (Success)' : '里程碑释放中 (Ongoing)';
            const progressVal = pairedProj?.progress || 100;
            
            // Calculate detailed contribution
            let displayContribution = inv.cumulativeDividends;
            if (pairedProj) {
              const userBacking = pairedProj.backers?.find(b => b.address === walletAddress);
              if (userBacking) {
                const completedMilestonesCount = pairedProj.milestones?.filter(m => m.status === 'completed').length || 0;
                const totalMilestonesCount = pairedProj.milestones?.length || 4;
                displayContribution += userBacking.amount * (completedMilestonesCount / totalMilestonesCount) * 0.08;
              }
            }

            return (
              <div key={index} className="bg-[#090A14]/60 p-4.5 rounded-xl border border-[#1B1E38] hover:border-[#635BFF]/30 transition duration-150 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-white">{inv.projectName}</span>
                    <span className="font-mono text-[9.5px] text-[#8B83FF] font-black bg-[#635BFF]/10 px-2 py-0.5 rounded">${inv.ticker}</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-gray-500 mt-3 font-mono">
                    <span>持股份额: <strong className="text-gray-300">{Math.floor(inv.acquiredUnits).toLocaleString()}</strong></span>
                    <span>进展进度: <strong className="text-emerald-400">{progressVal}%</strong></span>
                  </div>
                </div>
                <div className="flex items-center justify-between pt-3 border-t border-slate-800/40 mt-3">
                  <span className="text-[10px] text-gray-400 font-sans">{statusLabel}</span>
                  <span className="text-xs text-[#F59E0B] font-black font-mono">+{displayContribution.toFixed(2)} TON</span>
                </div>

                {/* Pre-listing token utilities toggle button */}
                <div className="border-t border-[#1C1F3D] pt-3 mt-3 space-y-3">
                  <button
                    type="button"
                    onClick={() => setExpandedUtilityId(expandedUtilityId === inv.id ? null : inv.id)}
                    className="w-full py-1.5 bg-[#121428]/60 hover:bg-[#1C1E38] border border-[#191D3C] text-[10px] font-bold text-gray-300 rounded-lg transition flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <span>✦ {expandedUtilityId === inv.id ? '收起代币效用控制台' : '查看代币上市前效用'}</span>
                  </button>

                  {expandedUtilityId === inv.id && (
                    <div className="space-y-3 pt-2 animate-in fade-in duration-200 text-left">
                      {utilityMsg && (
                        <div className="p-2 bg-emerald-950/20 border border-emerald-900/35 text-emerald-450 text-[9.5px] rounded-lg leading-relaxed">
                          {utilityMsg}
                        </div>
                      )}

                      <div className="grid grid-cols-3 gap-2">
                        {/* Utility 1: Consumption */}
                        <div className="bg-[#121424] border border-[#21244C]/45 rounded-lg p-2.5 flex flex-col justify-between space-y-2">
                          <div>
                            <div className="text-[9.5px] font-extrabold text-white flex items-center gap-1">
                              <Bot size={11} className="text-[#8B83FF]" />
                              <span>项目内消耗</span>
                            </div>
                            <span className="text-[8px] text-gray-500 mt-1 block leading-normal">
                              调用 AI 生成服务，每次扣减 0.1 代币。
                            </span>
                          </div>
                          <button
                            type="button"
                            disabled={utilityActionLoading !== null}
                            onClick={() => handleUtilityAction('consume', inv.ticker)}
                            className="w-full py-1 bg-[#635BFF] hover:bg-[#5048E5] text-[9.5px] font-bold text-white rounded-md transition cursor-pointer"
                          >
                            {utilityActionLoading === 'consume' ? '调用中...' : '使用'}
                          </button>
                        </div>

                        {/* Utility 2: Staking */}
                        <div className="bg-[#121424] border border-[#21244C]/45 rounded-lg p-2.5 flex flex-col justify-between space-y-2">
                          <div>
                            <div className="text-[9.5px] font-extrabold text-white flex items-center gap-1">
                              <Star size={11} className="text-yellow-500" />
                              <span>Backer Pool</span>
                            </div>
                            <span className="text-[8px] text-gray-500 mt-1 block leading-normal">
                              质押代币，获取下一期早鸟认购特权。
                            </span>
                          </div>
                          <button
                            type="button"
                            disabled={utilityActionLoading !== null}
                            onClick={() => handleUtilityAction('stake', inv.ticker)}
                            className="w-full py-1 bg-amber-600 hover:bg-amber-500 text-[9.5px] font-bold text-white rounded-md transition cursor-pointer"
                          >
                            {utilityActionLoading === 'stake' ? '质押中...' : '质押'}
                          </button>
                        </div>

                        {/* Utility 3: Voting */}
                        <div className="bg-[#121424] border border-[#21244C]/45 rounded-lg p-2.5 flex flex-col justify-between space-y-2">
                          <div>
                            <div className="text-[9.5px] font-extrabold text-white flex items-center gap-1">
                              <Coins size={11} className="text-emerald-450" />
                              <span>治理投票</span>
                            </div>
                            <span className="text-[8px] text-gray-500 mt-1 block leading-normal">
                              前往项目的投票看板，参与资金公决。
                            </span>
                          </div>
                          <button
                            type="button"
                            disabled={utilityActionLoading !== null}
                            onClick={() => handleUtilityAction('vote', inv.ticker, pairedProj?.id)}
                            className="w-full py-1 bg-emerald-600 hover:bg-emerald-500 text-[9.5px] font-bold text-white rounded-md transition cursor-pointer"
                          >
                            投票
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* CORE TOP OVERVIEW GRID: Assets tally and 4 cards */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        {/* Left massive net value banner */}
        <div className="lg:col-span-4 bg-[#121620] border border-[#22253E] rounded-2xl p-6 flex flex-col justify-between shadow-xl">
          <div className="space-y-1">
            <span className="text-[10px] text-gray-500 font-mono tracking-wider block">PORTFOLIO TOTAL NETWORTH</span>
            <div className="flex items-baseline gap-2">
              <h2 className="text-3xl font-black font-mono text-white">{(totalWorthTON + profile.balanceTON).toFixed(2)}</h2>
              <span className="text-xs text-gray-400 font-bold font-mono">TON</span>
            </div>
            <p className="text-[10.5px] text-emerald-450 font-mono flex items-center gap-1 mt-0.5">
              <span>≈ ${((totalWorthTON + profile.balanceTON) * 6.5).toLocaleString()} USD 综合账面资产</span>
            </p>
          </div>

          <div className="pt-4 border-t border-slate-800/60 mt-4 text-[10.5px] text-gray-500 leading-normal">
            其中钱包现金: <strong className="text-white font-mono">{profile.balanceTON} TON</strong> ；代币仓值约: <strong className="text-white font-mono">{totalWorthTON} TON</strong>。
          </div>
        </div>

        {/* Right 4 mini cards layout */}
        <div className="lg:col-span-8 grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-[#121620]/75 border border-[#22253E]/80 p-4.5 rounded-xl flex flex-col justify-between">
            <span className="text-[10px] text-gray-500 font-mono block">VC 持仓余额</span>
            <div className="my-1.5">
              <h4 className="text-lg font-black font-mono text-purple-400">{profile.balanceVC}</h4>
              <span className="text-[9px] text-gray-500 block">代金抵现券</span>
            </div>
            <span className="text-[9px] text-gray-400 leading-normal block">用于优先认购 Launchpad</span>
          </div>

          <div className="bg-[#121620]/75 border border-[#22253E]/80 p-4.5 rounded-xl flex flex-col justify-between">
            <span className="text-[10px] text-gray-500 font-mono block">支持项目数</span>
            <div className="my-1.5">
              <h4 className="text-lg font-black font-mono text-sky-400">{myInvestments.length}</h4>
              <span className="text-[9px] text-gray-500 block">AI 自治资产契约</span>
            </div>
            <span className="text-[9px] text-[#A69FFF] font-medium leading-normal block">通过智能多签托管核数</span>
          </div>

          <div className="bg-[#121620]/75 border border-[#22253E]/80 p-4.5 rounded-xl flex flex-col justify-between">
            <span className="text-[10px] text-gray-500 font-mono block font-bold text-amber-500 flex items-center gap-0.5">
              <span>累计已分配份额</span>
              <Sparkles size={10} />
            </span>
            <div className="my-1.5">
              <h4 className="text-lg font-black font-mono text-[#DCA222]">{totalHistoricalDividends.toFixed(2)} TON</h4>
              <span className="text-[9px] text-gray-400 block pb-1">可提取: {(totalHistoricalDividends * 0.32).toFixed(2)} TON</span>
            </div>
            
            {claimSuccess ? (
              <span className="text-[9.5px] text-emerald-450 font-bold block pt-0.5 animate-pulse">Claimed +{claimedVal} TON</span>
            ) : (
              <div className="space-y-1.5 w-full">
                <button 
                  onClick={handleClaimDividends}
                  className="w-full text-center py-1 bg-amber-500/10 hover:bg-amber-500/20 text-[#D29E2E] hover:text-[#FFAF1E] rounded text-[9.5px] font-bold border border-amber-500/15 cursor-pointer"
                >
                  一键领分配
                </button>
                {claimError && (
                  <span className="text-[8.5px] text-rose-400 font-semibold block leading-tight">{claimError}</span>
                )}
              </div>
            )}
          </div>

          <div className="bg-[#121620]/75 border border-[#22253E]/80 p-4.5 rounded-xl flex flex-col justify-between">
            <span className="text-[10px] text-gray-500 font-mono block">Launchpad 参与</span>
            <div className="my-1.5">
              <h4 className="text-lg font-black font-mono text-teal-400">2 次配股</h4>
              <span className="text-[9px] text-gray-500 block">已抵押解锁 250 $OSA</span>
            </div>
            <span className="text-[9px] text-gray-400 leading-normal block">极客优先兑配已打底</span>
          </div>
        </div>

      </div>

      {/* 72H AUTO-REINVESTMENT & COMPOUNDING SYSTEM */}
      <div className="bg-[#0D0F1F] border border-[#23275A] p-5 rounded-2xl relative overflow-hidden text-left shadow-2xl">
        <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/5 blur-3xl pointer-events-none" />
        
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-1.5 max-w-2xl text-left">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="p-1 px-2 rounded bg-indigo-500/10 border border-indigo-500/20 text-[#A699FF] text-[9px] font-mono font-bold tracking-widest uppercase">72H REINVESTMENT SYSTEM</span>
              {isAutoReinvestEnabled ? (
                <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-1 bg-emerald-500/10 p-0.5 px-2.5 rounded-full border border-emerald-500/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>复投托管在线</span>
                </span>
              ) : (
                <span className="text-[10px] text-gray-500 bg-gray-500/10 p-0.5 px-2.5 rounded-full border border-gray-500/20">复投托管已挂起</span>
              )}
            </div>
            <h3 className="text-base font-black text-white flex items-center gap-1.5">
              <Bot size={18} className="text-[#635BFF]" />
              <span>72H 份额智能复投 & 自动算力倍增器</span>
            </h3>
            <p className="text-xs text-gray-405 leading-relaxed font-sans text-gray-400">
              由 VibeCoder 自治多签核数协议提供系统打底支持。开启后，您的未提取 TON 派发记录将每小时自动以 10%-15% 的二级折让率复投入选定的早期星火或种子流动性池中，享受 72H 星火级复利算力增加。
            </p>
          </div>

          {/* Quick toggle and config tools */}
          <div className="bg-[#05060C] p-4 rounded-xl border border-[#21244C] flex flex-wrap gap-4 items-center shrink-0 min-w-[280px]">
            <div className="text-left space-y-1.5">
              <span className="text-[10px] text-gray-550 font-bold block uppercase tracking-wider text-gray-500">托管工作状态 Toggle</span>
              <button
                type="button"
                onClick={() => {
                  const targetState = !isAutoReinvestEnabled;
                  setIsAutoReinvestEnabled(targetState);
                  if (targetState) {
                    setReinvestHistory(prev => [
                      `${new Date().toISOString().replace('T', ' ').substring(0, 16)}: 🛡️ [Vault] Created auto-allocation mandate into $${reinvestAssetTarget} pool.`,
                      ...prev
                    ]);
                  } else {
                    setReinvestHistory(prev => [
                      `${new Date().toISOString().replace('T', ' ').substring(0, 16)}: 🛑 [Vault] Auto-allocation mandate paused.`,
                      ...prev
                    ]);
                  }
                }}
                className={`p-1.5 px-4 rounded-lg font-black text-xs transition cursor-pointer flex items-center gap-1 ${
                  isAutoReinvestEnabled 
                    ? 'bg-emerald-500 hover:bg-emerald-600 text-black shadow-md shadow-emerald-500/15' 
                    : 'bg-[#635BFF] hover:bg-[#5048E5] text-white shadow-md shadow-[#635BFF]/15'
                }`}
              >
                {isAutoReinvestEnabled ? 'Disable Reinvest (暂停复投)' : 'Enable Auto-Reinvest (开启复投)'}
              </button>
            </div>

            <div className="w-[1px] h-10 bg-slate-800" />

            <div className="text-left space-y-1.5">
              <span className="text-[10px] text-gray-550 font-bold block uppercase text-gray-500">复投标的 Target</span>
              <select
                value={reinvestAssetTarget}
                onChange={(e) => setReinvestAssetTarget(e.target.value as any)}
                className="bg-[#0B0C18] border border-[#212450] text-[#A69FFF] p-1 rounded font-mono font-bold text-xs cursor-pointer outline-none"
              >
                <option value="OSA">OmniSocial ($OSA)</option>
                <option value="TBP">TrendBot ($TBP)</option>
                <option value="CVA">CodeVibe ($CVA)</option>
              </select>
            </div>

            <div className="w-[1px] h-10 bg-slate-800" />

            <div className="text-left space-y-1">
              <span className="text-[10px] text-gray-550 font-bold block uppercase text-gray-500">复投比例 split: {reinvestRatio}%</span>
              <input 
                type="range" 
                min="10" 
                max="100" 
                step="5"
                value={reinvestRatio}
                onChange={(e) => setReinvestRatio(Number(e.target.value))}
                className="w-24 accent-[#635BFF] bg-slate-800 h-1 rounded cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* Live Reinvestment Log stream */}
        <div className="mt-4 pt-4 border-t border-[#1C1F3F] text-left">
          <span className="text-[10px] text-gray-500 font-mono tracking-wider block mb-2 uppercase">托管合约自动滚存记录 (REINVESTMENT AUDIT JOURNAL)</span>
          <div className="bg-[#05060A] border border-[#1A1C35] rounded-xl p-3 max-h-24 overflow-y-auto font-mono text-[10px] leading-relaxed space-y-1 text-gray-400">
            {reinvestHistory.map((item, idx) => (
              <div key={idx} className="flex gap-2 items-start justify-start hover:bg-slate-900/40 p-0.5 rounded">
                <span className="text-emerald-500">&raquo;</span>
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* TABS SELECTOR LIST */}
      <div className="flex border-b border-[#21243C] gap-1.5 overflow-x-auto scrollbar-none pb-[1px] pt-4.5">
        {[
          { id: 'projects', label: 'My Projects (我的项目)', count: myCreatedProjects.length },
          { id: 'investments', label: 'My Support (我的支持)', count: myInvestments.length },
          { id: 'earnings', label: 'My Allocations (我的分配)', count: null },
          { id: 'assets', label: 'Assets (持仓资产)', count: assetPositions.length + 1 }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-1.5 px-4.5 py-2 text-xs font-black border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === tab.id
                ? 'border-[#635BFF] text-white bg-[#635BFF]/5'
                : 'border-transparent text-gray-400 hover:text-white hover:bg-slate-800/25'
            }`}
          >
            <span>{tab.label}</span>
            {tab.count !== null && (
              <span className={`text-[10px] p-0.5 px-1.5 rounded-full font-mono font-bold ${activeTab === tab.id ? 'bg-[#635BFF] text-white' : 'bg-slate-800 text-gray-400'}`}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* TAB 1: My Projects */}
      {activeTab === 'projects' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-black text-white">我发起的星火合伙项目</h3>
              <p className="text-[10.5px] text-gray-400">由您通过 Studio 部署、发布到公开大厅进行算力及开发资金募集的 AI 智能体产品</p>
            </div>
            <Link 
              to="/launch/create"
              className="px-3.5 py-1.5 bg-[#635BFF] hover:bg-[#5048E5] text-white rounded-lg text-[11px] font-bold transition flex items-center gap-1"
            >
              <Plus size={12} />
              <span>筹建新 Agent 代币共建</span>
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {myCreatedProjects.map((p) => {
              const isSuccess = p.status === 'success';
              return (
                <Card key={p.id} hoverable className="flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between border-b border-slate-800/60 pb-3 mb-3.5">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-[#21243C] flex items-center justify-center font-bold text-xs text-sky-400">
                          {p.agentTicker?.substring(0, 1)}
                        </div>
                        <div className="text-left">
                          <h4 className="text-xs font-bold text-white leading-normal truncate max-w-[180px]">{p.title}</h4>
                          <span className="text-[10px] text-gray-500 font-mono">${p.agentTicker} &bull; {p.category}</span>
                        </div>
                      </div>
                      <Badge variant={isSuccess ? "success" : "warning"}>
                        {isSuccess ? "星火共建成功 (Success)" : "星火进行中 (Sparking)"}
                      </Badge>
                    </div>

                    <div className="space-y-4">
                      {/* Progress representation */}
                      <div className="space-y-1">
                        <div className="flex justify-between text-[10px] text-gray-400">
                          <span>已集进度</span>
                          <span className="text-white font-mono font-bold">{p.progress}%</span>
                        </div>
                        <ProgressBar progress={p.progress} />
                      </div>

                      <div className="grid grid-cols-3 gap-2 font-mono text-[10.5px] border-t border-slate-800/30 pt-3">
                        <div>
                          <span className="text-[9px] text-gray-500 block">筹建目标</span>
                          <span className="text-white font-bold">{p.goalAmount} TON</span>
                        </div>
                        <div>
                          <span className="text-[9px] text-gray-500 block">已 Spark 金额</span>
                          <span className="text-emerald-450 font-bold">{p.raisedAmount} TON</span>
                        </div>
                        <div>
                          <span className="text-[9px] text-gray-500 block">产生的税得收入</span>
                          <span className="text-[#FF9F1A] font-bold">14.82 TON</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-800/30 mt-4 flex justify-end">
                    <Link 
                      to={`/launch/${p.id}`}
                      className="px-3 py-1 bg-[#171A2A] hover:bg-slate-800 text-gray-305 hover:text-white rounded-lg text-[10.5px] font-bold transition"
                    >
                      点击查询项目大盘 &rarr;
                    </Link>
                  </div>
                </Card>
              );
            })}

            {myCreatedProjects.length === 0 && (
              <div className="col-span-2 text-center py-12 text-gray-400 text-xs bg-[#121620] rounded-2xl border border-dashed border-[#22253B]">
                您尚未在工作区创建项目。请前往 <strong><Link to="/studio" className="text-[#635BFF] hover:underline">“Agent Studio”</Link></strong> 部署，之后点击“发起共建”。
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: My Investments */}
      {activeTab === 'investments' && (() => {
        const getCategoryThemeColor = (cat: string) => {
          switch (cat.toLowerCase()) {
            case 'social': return '#635BFF';
            case 'trading': return '#10B981';
            case 'defi': return '#0EA5E9';
            case 'ai agent': return '#F59E0B';
            default: return '#A855F7';
          }
        };

        const getCategoryForTicker = (ticker: string) => {
          if (ticker === 'OSA') return 'Social';
          if (ticker === 'TBP') return 'Trading';
          const match = projects.find(p => p.agentTicker === ticker);
          return match?.category || 'DeFi';
        };

        const categoryMap: Record<string, number> = {};
        myInvestments.forEach(inv => {
          const cat = getCategoryForTicker(inv.ticker);
          categoryMap[cat] = (categoryMap[cat] || 0) + (inv.investedTON || 50);
        });

        const totalInvestmentValue = Object.values(categoryMap).reduce((a, b) => a + b, 0);

        const diversityData = Object.keys(categoryMap).map(cat => ({
          name: cat,
          value: categoryMap[cat],
          percentage: Number(((categoryMap[cat] / totalInvestmentValue) * 100).toFixed(1)),
          color: getCategoryThemeColor(cat)
        }));

        return (
          <div className="space-y-4 transition duration-150">
            {/* Category Diversity PieChart Section */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              <div className="lg:col-span-4 bg-[#121620] border border-[#22253E] rounded-2xl p-5 flex flex-col justify-between text-left">
                <div>
                  <h3 className="text-sm font-black text-white flex items-center gap-1.5">
                    <Layers size={15} className="text-[#635BFF]" />
                    <span>资产分类多样性分析 (Portfolio Category Diversity)</span>
                  </h3>
                  <p className="text-[10.5px] text-gray-400 mt-1">
                    实时分析您的 AI 代理板块支持配比，避免单一风险。
                  </p>
                </div>

                <div className="flex flex-col items-center justify-center py-4 relative font-sans">
                  <div className="w-32 h-32 relative flex items-center justify-center">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={diversityData}
                          cx="50%"
                          cy="50%"
                          innerRadius={36}
                          outerRadius={50}
                          paddingAngle={4}
                          dataKey="value"
                        >
                          {diversityData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip 
                          formatter={(value) => [`${value} TON`, '投融资储备']}
                          contentStyle={{ backgroundColor: '#090A14', borderColor: '#22254B', color: '#fff', fontSize: '10px' }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute text-center flex flex-col items-center font-sans">
                      <span className="text-[9px] text-[#A699FF] font-mono uppercase tracking-widest text-[#A699FF]">Total</span>
                      <span className="text-sm font-black font-mono text-white">{totalInvestmentValue.toFixed(0)} T</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-8 bg-[#121620]/60 border border-[#22253E] rounded-2xl p-5 flex flex-col justify-center text-left">
                <span className="text-[10px] text-[#A699FF] font-mono tracking-wider block uppercase mb-4 font-black">
                  🛡️ 链上多样性平衡指数与调仓参考 (Portfolio Diversity Index)
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {diversityData.map((pos, idx) => (
                    <div key={idx} className="bg-[#090A15]/75 p-3.5 rounded-xl border border-slate-800/40 hover:border-slate-700 transition duration-150">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-sm shrink-0 block" style={{ backgroundColor: pos.color }} />
                          <span className="text-[11.5px] font-black text-white">{pos.name} 板块</span>
                        </div>
                        <span className="text-[11px] font-mono font-bold text-[#A699FF]">{pos.percentage}%</span>
                      </div>
                      <div className="flex items-baseline justify-between text-[10px] text-gray-400 font-mono mt-1.5">
                        <span>总支持比重:</span>
                        <span className="text-white font-black">{pos.value.toFixed(1)} TON</span>
                      </div>
                      
                      <div className="w-full bg-[#05060D] h-1.5 rounded-full mt-2 overflow-hidden">
                        <div className="h-full rounded-full transition-all" style={{ width: `${pos.percentage}%`, backgroundColor: pos.color }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="pt-2">
              <h3 className="text-sm font-black text-white">已参与支持的项目契约</h3>
              <p className="text-[10.5px] text-gray-400 font-sans">您在一级星火大厅或 Launchpad 兑配中持有并持续监控的多签保障型 AI 自治股份</p>
            </div>

            <div className="overflow-x-auto">
              <Card className="p-0 overflow-hidden border border-[#21243C]">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-[#121620]/80 border-b border-[#21243C] text-gray-400 font-mono text-[9.5px] uppercase font-bold">
                      <th className="p-4 pl-5">项目名称</th>
                      <th className="p-4">代币符号</th>
                      <th className="p-4">支持金额</th>
                      <th className="p-4">获得股份数 (Units)</th>
                      <th className="p-4">现行股价/净估值</th>
                      <th className="p-4">我的累计分配份额</th>
                      <th className="p-4 pr-5 text-right">操作</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/40">
                    {myInvestments.map((inv) => (
                      <tr key={inv.id} className="hover:bg-slate-800/20 transition">
                        <td className="p-4 pl-5">
                          <span className="font-extrabold text-white block">{inv.projectName}</span>
                          <span className="text-[9.5px] text-gray-500 font-serif">Multisig Safe Lockup</span>
                        </td>
                        <td className="p-4 font-mono font-bold text-indigo-400">${inv.ticker}</td>
                        <td className="p-4 font-mono font-bold text-gray-300">{inv.investedTON} TON</td>
                        <td className="p-4 font-mono text-gray-300">{Math.floor(inv.acquiredUnits).toLocaleString()}</td>
                        <td className="p-4 font-mono">
                          <span className="text-emerald-450 font-bold">{(inv.acquiredUnits * inv.currentPrice).toFixed(1)} TON</span>
                          <span className="text-emerald-500 font-bold block text-[9px]">({inv.currentPrice} TON/个)</span>
                        </td>
                        <td className="p-4 font-mono text-[#FF9F1A] font-extrabold flex items-center gap-1">
                          <span>+{inv.cumulativeDividends} TON</span>
                          <Badge variant="success">已结清</Badge>
                        </td>
                        <td className="p-4 pr-5 text-right">
                          <Link 
                            to="/launchpad"
                            className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 rounded text-[10px] font-bold text-gray-305 transition"
                          >
                            自由 Swap
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Card>
            </div>
          </div>
        );
      })()}

      {/* TAB 3: My Earnings with interactive curves */}
      {activeTab === 'earnings' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Earnings progress curve (Line chart representing growth month-by-month in 2026) */}
          <div className="lg:col-span-8 bg-[#121620] border border-[#22253E] rounded-2xl p-5 space-y-4 text-left">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-black text-white flex items-center gap-1.5">
                  <TrendingUp size={15} className="text-emerald-450" />
                  <span>星火智能资产每日累计分配曲线 (On-chain Cumulative Daily Allocations)</span>
                </h3>
                <p className="text-[10.5px] text-gray-400">
                  {chartMode === 'daily'
                    ? '30天星火级智能资产滚动每日累计总白银、抗回撤表现统计'
                    : '2026 年度每月合并算力及自动化结算快照'}
                </p>
              </div>

              {/* Chart Mode Toggle Buttons */}
              <div className="flex bg-[#0A0D18] p-1 rounded-xl border border-[#23274A] self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => setChartMode('daily')}
                  className={`px-3 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                    chartMode === 'daily'
                      ? 'bg-[#635BFF] text-white shadow-md shadow-[#635BFF]/15'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  每日累计 (Daily Cumulative)
                </button>
                <button
                  type="button"
                  onClick={() => setChartMode('monthly')}
                  className={`px-3 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                    chartMode === 'monthly'
                      ? 'bg-[#635BFF] text-white shadow-md shadow-[#635BFF]/15'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  逐月历史 (Monthly Record)
                </button>
              </div>
            </div>

            <div className="h-[250px] w-full font-mono text-[10px] pt-2">
              <ResponsiveContainer width="100%" height="100%">
                {chartMode === 'daily' ? (
                  <AreaChart data={dailyCumulativeEarningsData}>
                    <defs>
                      <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10B981" stopOpacity={0.25}/>
                        <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorTBP" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#635BFF" stopOpacity={0.15}/>
                        <stop offset="95%" stopColor="#635BFF" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorOSA" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#0EA5E9" stopOpacity={0.15}/>
                        <stop offset="95%" stopColor="#0EA5E9" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#232742" vertical={false} />
                    <XAxis dataKey="date" stroke="#4a4f73" />
                    <YAxis stroke="#4a4f73" />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#090A14', borderColor: '#22254B', color: '#fff' }}
                      labelClassName="font-bold text-[#8B83FF] text-xs"
                    />
                    <Area 
                      type="monotone" 
                      name="累计分配总计" 
                      dataKey="cumulative" 
                      stroke="#10B981" 
                      strokeWidth={3} 
                      fillOpacity={1} 
                      fill="url(#colorTotal)" 
                    />
                    <Area 
                      type="monotone" 
                      name="TrendBot Pro ($TBP)" 
                      dataKey="TrendBot" 
                      stroke="#635BFF" 
                      strokeWidth={1.5} 
                      fillOpacity={0.5} 
                      fill="url(#colorTBP)" 
                    />
                    <Area 
                      type="monotone" 
                      name="OmniSocial ($OSA)" 
                      dataKey="OmniSocial" 
                      stroke="#0EA5E9" 
                      strokeWidth={1.5} 
                      fillOpacity={0.5} 
                      fill="url(#colorOSA)" 
                    />
                  </AreaChart>
                ) : (
                  <AreaChart data={monthlyEarningsData}>
                    <defs>
                      <linearGradient id="colorEarnings" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10B981" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#232742" vertical={false} />
                    <XAxis dataKey="month" stroke="#4a4f73" />
                    <YAxis stroke="#4a4f73" />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#0A0B18', borderColor: '#2E3260', color: '#fff' }}
                    />
                    <Area type="monotone" name="每月分配" dataKey="earnings" stroke="#10B981" strokeWidth={2.5} fillOpacity={1} fill="url(#colorEarnings)" />
                  </AreaChart>
                )}
              </ResponsiveContainer>
            </div>

            {/* Custom chart legend block */}
            {chartMode === 'daily' && (
              <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-1.5 pt-2 border-t border-[#1C203A] text-[9.5px]">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-1.5 bg-[#10B981] rounded-sm" />
                  <span className="text-gray-200 font-bold">累计分配总额 (TON)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-1.5 bg-[#635BFF] rounded-sm" />
                  <span className="text-gray-400">TrendBot Pro ($TBP)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-1.5 bg-[#0EA5E9] rounded-sm" />
                  <span className="text-gray-400">OmniSocial ($OSA)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-1.5 bg-[#F59E0B] rounded-sm animate-pulse" />
                  <span className="text-gray-500">CodeVibe Auditor ($CVA) 等</span>
                </div>
              </div>
            )}
          </div>

          {/* Earnings source breakdown circular pie-chart */}
          <div className="lg:col-span-4 bg-[#121620] border border-[#22253E] rounded-2xl p-5 space-y-4 text-left">
            <div>
              <h3 className="text-sm font-black text-white">配资来源占比 (Sources Split)</h3>
              <p className="text-[10.5px] text-gray-400">折分您所得已分配资金的真实来源通道</p>
            </div>

            <div className="flex flex-col items-center justify-center pt-2">
              <div className="w-28 h-28 relative flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={sourceEarningsData}
                      cx="50%"
                      cy="50%"
                      innerRadius={32}
                      outerRadius={45}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {sourceEarningsData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute text-center">
                  <span className="text-xs font-black font-mono text-emerald-400">85% TON</span>
                </div>
              </div>

              <div className="w-full space-y-1.5 pt-4 text-[10px] text-gray-400">
                {sourceEarningsData.map((entry, idx) => (
                  <div key={idx} className="flex justify-between items-center">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: entry.color }} />
                      <span className="truncate">{entry.name}</span>
                    </div>
                    <span className="font-mono font-bold text-white shrink-0">{entry.value}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Table: Earning records */}
          <Card className="lg:col-span-12 p-0 overflow-hidden border border-[#21243C]">
            <div className="p-4 border-b border-[#21243C]">
              <h4 className="text-xs font-black text-white flex items-center gap-1.5">
                <History size={13} className="text-[#8B83FF]" />
                <span>分配与代币赎回资金流水 (Automatic Allocation Streams Log)</span>
              </h4>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-[#121620]/80 border-b border-[#21243C] text-gray-400 font-mono text-[9px] uppercase">
                    <th className="p-3 pl-5">划拨记录时间</th>
                    <th className="p-3">资金派发源</th>
                    <th className="p-3">打入资金数</th>
                    <th className="p-3 pr-5 text-right">通证交割状态</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/40 font-mono">
                  {earningsRecords.map((rec) => (
                    <tr key={rec.id} className="hover:bg-slate-800/20 transition">
                      <td className="p-3 pl-5 text-gray-500">{rec.time}</td>
                      <td className="p-3 font-semibold text-gray-300 font-sans">{rec.source}</td>
                      <td className="p-3 text-emerald-400 font-black">+{rec.amount}</td>
                      <td className="p-3 pr-5 text-right">
                        <span className="bg-emerald-950 text-emerald-450 border border-emerald-900/30 text-[9px] px-1.5 py-0.2 rounded font-sans font-black">
                          {rec.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

        </div>
      )}

      {/* TAB 4: Assets holdings */}
      {activeTab === 'assets' && (
        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-black text-white font-sans">链上托管资产明细表</h3>
            <p className="text-[10.5px] text-gray-405 font-medium leading-normal">
              显示您在当前 TON 沙盒及 VibeCoder 联合曲线储备池中的代金劵和代代托管仓平衡值。
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* VC native coupon card */}
            <Card className="p-5 border-[#635BFF]/35 relative group overflow-hidden bg-gradient-to-br from-[#121620] to-[#12142B]/90 shadow-xl">
              <div className="absolute top-0 right-0 w-24 h-24 bg-[#635BFF]/10 blur-xl rounded-full" />
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <Badge variant="purple">VibeCoder Native Credential</Badge>
                  <h4 className="text-sm font-black text-white pt-1">VC 代金抵用券 (Platform Gas Credit)</h4>
                </div>
                <Coins size={24} className="text-[#635BFF] shrink-0" />
              </div>

              <div className="my-6">
                <span className="text-[10px] text-gray-500 font-mono tracking-wider block">NATIVE VC HOLDINGS</span>
                <span className="text-3xl font-black font-mono text-white">{profile.balanceVC} <span className="text-xs text-[#8F87FF] font-black uppercase">VC</span></span>
              </div>

              <div className="text-[10px] text-gray-400 leading-normal flex items-start gap-1">
                <Sparkles size={11} className="text-amber-500 shrink-0 mt-0.5" />
                <span>可通过对创世代码进行编译、部署、做市或静态安全模型审计获得。可按 1:1 抵用 Launchpad 代税发行划拨。</span>
              </div>
            </Card>

            {/* Other liquid token lists */}
            <Card className="p-0 overflow-hidden">
              <div className="p-4 px-5 border-b border-slate-800/60 flex items-center justify-between">
                <CardTitle className="text-xs font-black">持有二级市场代币持仓 (Holdings)</CardTitle>
                <span className="text-[9.5px] text-gray-500 font-mono">LIVE ON-CHAIN INVENTORY</span>
              </div>

              <div className="divide-y divide-slate-800/40">
                {assetPositions.map((pos, i) => (
                  <div key={i} className="p-4 px-5 flex items-center justify-between hover:bg-slate-800/10 transition text-xs">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-[#21243C] flex items-center justify-center font-bold text-xs text-[#837BFF]">
                        {pos.symbol}
                      </div>
                      <div className="text-left">
                        <span className="text-white font-extrabold block">{pos.name}</span>
                        <span className="text-[9.5px] text-gray-500 font-mono">${pos.symbol}</span>
                      </div>
                    </div>

                    <div className="text-right space-y-0.5">
                      <span className="text-white font-extrabold font-mono block">{pos.balance} 个</span>
                      <span className="text-[10px] text-emerald-450 font-mono font-bold block">
                        ≈ {(pos.balance * pos.price).toFixed(2)} TON
                      </span>
                    </div>
                  </div>
                ))}

                {assetPositions.length === 0 && (
                  <div className="p-8 text-center text-gray-500 font-sans leading-normal">
                    由于您目前为零持仓，在这里未显示流动资产。可至一级发售 (Launchpad) 抵用换购。
                  </div>
                )}
              </div>
            </Card>
          </div>
        </div>
      )}

    </div>
  );
}
