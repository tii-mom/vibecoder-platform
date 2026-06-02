import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Trophy, Search, ArrowUpRight, ArrowRight, ChevronDown, ChevronUp,
  TrendingUp, Users, Bot, Star, Award, Star as StarIcon
} from 'lucide-react';
import { useUserStore } from '../store/userStore';
import { useSparkStore } from '../store/sparkStore';
import { useAgentStore } from '../store/agentStore';
import { ProgressBar } from '../components/ui/ProgressBar';
import { AreaChart, Area, ResponsiveContainer, Tooltip as RechartsTooltip } from 'recharts';
import { useTranslation } from '../hooks/useTranslation';

export default function LeaderboardPage() {
  const navigate = useNavigate();
  const { isConnected, walletAddress, profile } = useUserStore();
  const { projects, tokens } = useSparkStore();
  const { agents } = useAgentStore();
  const { t } = useTranslation();

  const [activeTab, setActiveTab] = useState<'creators' | 'investors' | 'robots'>('creators');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);

  // Dynamic utility: Shorten TON address
  const shortenAddress = (addr: string) => {
    if (!addr) return '';
    if (!addr.startsWith('EQ') && !addr.startsWith('UQ')) return addr;
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  const translateCategory = (cat: string) => {
    switch (cat) {
      case '数据分析': return t('launch.categoryData');
      case '交易工具': return t('launch.categoryTrading');
      case '社交': return t('launch.categorySocial');
      case '监控': return t('launch.categoryMonitor');
      case '基础设施': return t('launch.categoryInfra');
      case '创作工具': return t('launch.categoryCreation');
      case 'DeFi': return 'DeFi';
      default: return cat;
    }
  };

  // 1. CALCULATE CREATORS DATA
  const creatorsData = useMemo(() => {
    // Group projects by creatorAddress
    const creatorGroups: Record<string, typeof projects> = {};

    projects.forEach(p => {
      const creator = p.creatorAddress || 'Unknown';
      if (!creatorGroups[creator]) {
        creatorGroups[creator] = [];
      }
      creatorGroups[creator].push(p);
    });

    const list = Object.keys(creatorGroups).map((creator) => {
      const creatorProjects = creatorGroups[creator];
      const totalProjects = creatorProjects.length;
      const totalRaised = creatorProjects.reduce((sum, p) => sum + (p.raisedAmount || 0), 0);

      // Calculate average ROI of listed projects
      let roiSum = 0;
      let ratedProjectsCount = 0;

      const projectDetails = creatorProjects.map(p => {
        const launchPrice = p.tokenPrice || 0.01;
        // Find current price from tokens list or fallback
        const matchingToken = tokens.find(t => t.symbol.toLowerCase() === p.agentTicker.toLowerCase());

        let currentPrice = launchPrice;
        if (matchingToken) {
          currentPrice = matchingToken.price;
        } else if (p.agentTicker === 'OSA') {
          currentPrice = 0.012; // fallback OSA
        } else if (p.agentTicker === 'CVA') {
          currentPrice = 0.015; // fallback CVA
        }

        const isListed = p.status === 'listed' || matchingToken;
        const projectROI = isListed
          ? ((currentPrice - launchPrice) / launchPrice) * 100
          : 0;

        if (isListed) {
          roiSum += projectROI;
          ratedProjectsCount++;
        }

        return {
          id: p.id,
          title: p.title,
          ticker: p.agentTicker,
          launchPrice,
          currentPrice,
          roi: projectROI,
          raised: p.raisedAmount,
          goal: p.goalAmount,
          status: p.status
        };
      });

      const avgROI = ratedProjectsCount > 0 ? roiSum / ratedProjectsCount : 0;

      // Map to creator profiles
      let name = creator;
      let avatar = `https://api.dicebear.com/7.x/bottts/svg?seed=${creator}`;

      if (creator === 'VibeDev_0a8b') {
        name = 'TrendBot Labs';
      } else if (creator === 'VibeDev_88ff') {
        name = 'OmniSocial DAO';
      } else if (creator === 'VibeDev_bc67') {
        name = 'CodeVibe Security';
      } else if (creator === 'VibeDev_a9cc') {
        name = 'Matrix Gaming';
      } else if (walletAddress && creator === walletAddress) {
        name = profile?.username || shortenAddress(walletAddress);
        avatar = profile?.avatar || avatar;
      }

      return {
        id: creator,
        name,
        avatar,
        address: creator,
        totalProjects,
        totalRaised,
        avgROI,
        projects: projectDetails
      };
    });

    // Add extra mock premium creators to populate the list with realistic data
    const mockCreators = [
      {
        id: 'creator-defi-master',
        name: 'DeFi Harvester DAO',
        avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=defiharvester',
        address: 'EQA_defi_harvester_dao_address',
        totalProjects: 3,
        totalRaised: 62000,
        avgROI: 54.8,
        projects: [
          { id: 'mock-p1', title: 'DeFi Yield Harvester V1', ticker: 'DYH', launchPrice: 0.035, currentPrice: 0.0382, roi: 9.14, raised: 42000, goal: 40000, status: 'listed' as const },
          { id: 'mock-p2', title: 'TON Multi-Pool Router', ticker: 'TMP', launchPrice: 0.01, currentPrice: 0.022, roi: 120.0, raised: 15000, goal: 15000, status: 'listed' as const },
          { id: 'mock-p3', title: 'Aggregated Lending Engine', ticker: 'ALE', launchPrice: 0.02, currentPrice: 0.027, roi: 35.0, raised: 5000, goal: 5000, status: 'listed' as const }
        ]
      },
      {
        id: 'creator-agent-alpha',
        name: 'Agent Alpha Corp',
        avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=agentalpha',
        address: 'UQB_agent_alpha_corp_address',
        totalProjects: 1,
        totalRaised: 18000,
        avgROI: 44.5,
        projects: [
          { id: 'mock-p4', title: 'Alpha Sentinel', ticker: 'ASEN', launchPrice: 0.01, currentPrice: 0.01445, roi: 44.5, raised: 18000, goal: 18000, status: 'listed' as const }
        ]
      }
    ];

    // Combine and sort by avgROI descending
    const combined = [...list];
    mockCreators.forEach(mc => {
      if (!combined.some(c => c.id === mc.id)) {
        combined.push(mc);
      }
    });

    return combined.sort((a, b) => b.avgROI - a.avgROI);
  }, [projects, tokens, walletAddress, profile]);

  // 2. CALCULATE INVESTORS DATA
  const investorsData = useMemo(() => {
    // Static base of top investors
    const list = [
      {
        id: 'inv-defi-whale',
        name: 'TON Degen Whale 💎',
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=dwhale',
        address: 'EQD_defi_whale_address_1122',
        totalInvested: 6500,
        valuation: 9425,
        roi: 45.0,
        projectsSupported: [
          { name: 'TrendBot Pro Quant', ticker: 'TBP', invested: 3000, currentWorth: 4900, roi: 63.3 },
          { name: 'OmniSocial Influencer', ticker: 'OSA', invested: 2500, currentWorth: 3000, roi: 20.0 },
          { name: 'DeFi Yield Harvester V1', ticker: 'DYH', invested: 1000, currentWorth: 1525, roi: 52.5 }
        ]
      },
      {
        id: 'inv-alpha-hunter',
        name: 'Alpha Hunter 🏹',
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=ahunter',
        address: 'UQC_alpha_hunter_address_3344',
        totalInvested: 4200,
        valuation: 5850,
        roi: 39.28,
        projectsSupported: [
          { name: 'TrendBot Pro Quant', ticker: 'TBP', invested: 2000, currentWorth: 3266, roi: 63.3 },
          { name: 'Alpha Sentinel', ticker: 'ASEN', invested: 1200, currentWorth: 1734, roi: 44.5 },
          { name: 'Matrix Game Oracle', ticker: 'MGAI', invested: 1000, currentWorth: 850, roi: -15.0 }
        ]
      },
      {
        id: 'inv-ton-hodler',
        name: 'TON Hodler Guild',
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=tonhodler',
        address: 'EQB_ton_hodler_guild_address',
        totalInvested: 3500,
        valuation: 4480,
        roi: 28.0,
        projectsSupported: [
          { name: 'OmniSocial Influencer', ticker: 'OSA', invested: 2000, currentWorth: 2400, roi: 20.0 },
          { name: 'CodeVibe Auditor', ticker: 'CVA', invested: 1500, currentWorth: 2080, roi: 38.6 }
        ]
      },
      {
        id: 'inv-early-bird',
        name: 'Early Bird Capital',
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=earlybird',
        address: 'UQD_early_bird_capital',
        totalInvested: 2200,
        valuation: 2680,
        roi: 21.81,
        projectsSupported: [
          { name: 'Matrix Game Oracle', ticker: 'MGAI', invested: 1200, currentWorth: 1380, roi: 15.0 },
          { name: 'Alpha Sentinel', ticker: 'ASEN', invested: 1000, currentWorth: 1300, roi: 30.0 }
        ]
      }
    ];

    // If wallet connected, dynamically append/merge user's actual portfolio portfolio
    if (isConnected && walletAddress) {
      // Find what projects the user supported from backers list
      const userBacked = projects.filter(p => p.backers?.some(b => b.address === walletAddress));

      // Calculate user total investment
      let userTotalInvested = 0;
      const userProjectsSupported: any[] = [];

      // Add default portfolio investments (OSA and TBP) for richer experience like portfolio page
      const defaultInvestments = [
        { name: 'OmniSocial Influencer V1', ticker: 'OSA', invested: 200, currentPrice: 0.015, launchPrice: 0.012, roi: 25.0 },
        { name: 'TrendBot Pro Quant', ticker: 'TBP', invested: 150, currentPrice: 0.0245, launchPrice: 0.015, roi: 63.3 }
      ];

      defaultInvestments.forEach(di => {
        userTotalInvested += di.invested;
        const currentWorth = di.invested * (1 + di.roi / 100);
        userProjectsSupported.push({
          name: di.name,
          ticker: di.ticker,
          invested: di.invested,
          currentWorth: Number(currentWorth.toFixed(1)),
          roi: di.roi
        });
      });

      userBacked.forEach(p => {
        const backing = p.backers?.find(b => b.address === walletAddress);
        if (backing) {
          const invested = backing.amount;
          userTotalInvested += invested;

          // Find current ROI
          const matchingToken = tokens.find(t => t.symbol.toLowerCase() === p.agentTicker.toLowerCase());
          const launchPrice = p.tokenPrice || 0.01;
          const currentPrice = matchingToken ? matchingToken.price : launchPrice;
          const isListed = p.status === 'listed' || matchingToken;
          const projectROI = isListed ? ((currentPrice - launchPrice) / launchPrice) * 100 : 0;
          const currentWorth = invested * (1 + projectROI / 100);

          userProjectsSupported.push({
            name: p.title,
            ticker: p.agentTicker,
            invested,
            currentWorth: Number(currentWorth.toFixed(1)),
            roi: Number(projectROI.toFixed(1))
          });
        }
      });

      const userValuation = userProjectsSupported.reduce((sum, ps) => sum + ps.currentWorth, 0);
      const userROI = userTotalInvested > 0 ? ((userValuation - userTotalInvested) / userTotalInvested) * 100 : 0;

      list.push({
        id: walletAddress,
        name: `${profile?.username || t('leaderboard.currentUserNameLabel')} (${t('leaderboard.currentUserTag')})`,
        avatar: profile?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${walletAddress}`,
        address: walletAddress,
        totalInvested: userTotalInvested,
        valuation: Number(userValuation.toFixed(1)),
        roi: Number(userROI.toFixed(2)),
        projectsSupported: userProjectsSupported
      });
    }

    return list.sort((a, b) => b.roi - a.roi);
  }, [isConnected, walletAddress, profile, projects, tokens, t]);

  // 3. CALCULATE ROBOTS DATA
  const robotsData = useMemo(() => {
    // Combine agent details with custom ratings
    return agents.map((a, i) => {
      // Find rating / deepseek score
      let score = 85;
      if (a.ticker === 'TBP') score = 94;
      else if (a.ticker === 'DYH') score = 91;
      else if (a.ticker === 'MGAI') score = 86;
      else if (a.ticker === 'OSA') score = 89;
      else if (a.ticker === 'CVA') score = 82;
      else score = 75 + (i * 3) % 20;

      // Check TVL status
      const tvl = a.performance?.tvl || 0;

      return {
        id: a.id,
        name: a.name,
        ticker: a.ticker,
        avatar: a.avatarUrl,
        category: a.category,
        status: a.status,
        score,
        tvl,
        roi: a.performance?.roi || 0,
        winRate: a.performance?.winRate || 0,
        capabilities: a.capabilities || []
      };
    }).sort((a, b) => b.roi - a.roi);
  }, [agents]);

  // Handle accordion row clicks
  const toggleRow = (id: string) => {
    setExpandedRowId(expandedRowId === id ? null : id);
  };

  // Filtered lists based on search query
  const filteredCreators = useMemo(() => {
    return creatorsData.filter(c =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.address.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [creatorsData, searchQuery]);

  const filteredInvestors = useMemo(() => {
    return investorsData.filter(i =>
      i.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      i.address.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [investorsData, searchQuery]);

  const filteredRobots = useMemo(() => {
    return robotsData.filter(r =>
      r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.ticker.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [robotsData, searchQuery]);

  // Mock historical performance chart for expanded accordion views
  const generateAccordionChartData = (baseVal: number, scale = 1) => {
    return [
      { day: 'Day 1', value: baseVal * 0.95 * scale },
      { day: 'Day 2', value: baseVal * 0.98 * scale },
      { day: 'Day 3', value: baseVal * 1.02 * scale },
      { day: 'Day 4', value: baseVal * 0.99 * scale },
      { day: 'Day 5', value: baseVal * 1.05 * scale },
      { day: 'Day 6', value: baseVal * 1.12 * scale },
      { day: 'Day 7', value: baseVal * 1.18 * scale },
    ];
  };

  return (
    <div className="space-y-8 text-left select-none pb-12 animate-in fade-in duration-300">
      {/* 1. Header Area */}
      <div className="border-b border-[#171A30] pb-6 flex flex-col md:flex-row md:items-center justify-between gap-4 font-sans">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
            <Trophy className="text-amber-500 animate-pulse" size={28} />
            <span>{t('leaderboard.pageTitle')}</span>
          </h1>
          <p className="text-sm text-gray-400 mt-2 leading-relaxed">
            {t('leaderboard.pageDesc')}
          </p>
        </div>

        {/* Search input bar */}
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
          <input
            type="text"
            placeholder={
              activeTab === 'creators'
                ? t('leaderboard.searchCreatorsPlaceholder')
                : activeTab === 'investors'
                ? t('leaderboard.searchInvestorsPlaceholder')
                : t('leaderboard.searchRobotsPlaceholder')
            }
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#0E101F] border border-[#222543] rounded-xl pl-10 pr-4 py-2.5 text-xs text-gray-300 placeholder-gray-500 focus:outline-none focus:border-[#635BFF] transition-all"
          />
        </div>
      </div>

      {/* 2. Leaderboard Tabs Switcher */}
      <div className="flex bg-[#0A0D1A] border border-[#161A34] p-1.5 rounded-xl max-w-lg font-sans">
        <button
          onClick={() => { setActiveTab('creators'); setExpandedRowId(null); setSearchQuery(''); }}
          className={`flex-1 py-2.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === 'creators'
              ? 'bg-[#1C1A3F] border border-[#635BFF]/30 text-white shadow shadow-indigo-950'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          <Award size={14} className={activeTab === 'creators' ? 'text-[#8B83FF]' : ''} />
          <span>{t('leaderboard.tabCreators')}</span>
        </button>
        <button
          onClick={() => { setActiveTab('investors'); setExpandedRowId(null); setSearchQuery(''); }}
          className={`flex-1 py-2.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === 'investors'
              ? 'bg-[#1C1A3F] border border-[#635BFF]/30 text-white shadow shadow-indigo-950'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          <Users size={14} className={activeTab === 'investors' ? 'text-[#8B83FF]' : ''} />
          <span>{t('leaderboard.tabInvestors')}</span>
        </button>
        <button
          onClick={() => { setActiveTab('robots'); setExpandedRowId(null); setSearchQuery(''); }}
          className={`flex-1 py-2.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === 'robots'
              ? 'bg-[#1C1A3F] border border-[#635BFF]/30 text-white shadow shadow-indigo-950'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          <Bot size={14} className={activeTab === 'robots' ? 'text-[#8B83FF]' : ''} />
          <span>{t('leaderboard.tabRobots')}</span>
        </button>
      </div>

      {/* 3. Leaders Grid (Cards of Top 3) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 font-sans">
        {activeTab === 'creators' && filteredCreators.slice(0, 3).map((item, idx) => (
          <div key={item.id} className="relative">
            {/* Custom glowing rank background for top 3 */}
            <div className={`absolute inset-0 bg-gradient-to-b ${
              idx === 0
                ? 'from-amber-500/10'
                : idx === 1
                ? 'from-slate-400/10'
                : 'from-amber-700/10'
            } to-transparent blur-xl pointer-events-none rounded-2xl`} />

            <div className={`h-full bg-gradient-to-b from-[#121424] to-[#0A0D18] border ${
              idx === 0
                ? 'border-amber-500/30'
                : idx === 1
                ? 'border-slate-500/20'
                : 'border-amber-700/20'
            } p-5 rounded-2xl relative shadow-lg flex flex-col justify-between`}>
              <div className="absolute top-4 right-4 text-2xl font-black italic opacity-25">
                {idx === 0 ? '🏆' : idx === 1 ? '🥈' : '🥉'}
              </div>
              <div className="flex items-center gap-3 text-left">
                <img src={item.avatar} alt={item.name} className="w-12 h-12 rounded-xl bg-slate-900 border border-slate-800" />
                <div className="min-w-0">
                  <h4 className="text-sm font-black text-white truncate">{item.name}</h4>
                  <span className="text-[10px] text-gray-500 font-mono">{shortenAddress(item.address)}</span>
                </div>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-2 text-left bg-slate-950/40 p-3 rounded-xl border border-slate-900">
                <div>
                  <span className="text-[9.5px] text-gray-500 block">{t('leaderboard.statAvgRoi')}</span>
                  <span className="text-sm font-mono font-black text-emerald-400">+{item.avgROI.toFixed(1)}%</span>
                </div>
                <div>
                  <span className="text-[9.5px] text-gray-500 block">{t('leaderboard.statTotalRaised')}</span>
                  <span className="text-sm font-mono font-black text-white">{item.totalRaised.toLocaleString()} TON</span>
                </div>
              </div>

              <button
                onClick={() => toggleRow(item.id)}
                className="mt-4 w-full py-2 bg-[#635BFF]/10 hover:bg-[#635BFF]/20 text-[#8B83FF] rounded-lg text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer"
              >
                <span>{t('leaderboard.detailCTA')}</span>
                <ChevronDown size={14} className={`transition-transform ${expandedRowId === item.id ? 'rotate-180' : ''}`} />
              </button>
            </div>
          </div>
        ))}

        {activeTab === 'investors' && filteredInvestors.slice(0, 3).map((item, idx) => (
          <div key={item.id} className="relative">
            <div className={`absolute inset-0 bg-gradient-to-b ${
              idx === 0
                ? 'from-amber-500/10'
                : idx === 1
                ? 'from-slate-400/10'
                : 'from-amber-700/10'
            } to-transparent blur-xl pointer-events-none rounded-2xl`} />

            <div className={`h-full bg-gradient-to-b from-[#121424] to-[#0A0D18] border ${
              idx === 0
                ? 'border-amber-500/30'
                : idx === 1
                ? 'border-slate-500/20'
                : 'border-amber-700/20'
            } p-5 rounded-2xl relative shadow-lg flex flex-col justify-between`}>
              <div className="absolute top-4 right-4 text-2xl font-black italic opacity-25">
                {idx === 0 ? '🏆' : idx === 1 ? '🥈' : '🥉'}
              </div>
              <div className="flex items-center gap-3 text-left">
                <img src={item.avatar} alt={item.name} className="w-12 h-12 rounded-xl bg-slate-900 border border-slate-800" />
                <div className="min-w-0">
                  <h4 className="text-sm font-black text-white truncate flex items-center gap-1.5">
                    <span>{item.name}</span>
                    {walletAddress && item.address === walletAddress && (
                      <span className="text-[9px] bg-[#635BFF]/30 text-[#8B83FF] px-1 rounded">{t('leaderboard.currentUserTag')}</span>
                    )}
                  </h4>
                  <span className="text-[10px] text-gray-500 font-mono">{shortenAddress(item.address)}</span>
                </div>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-2 text-left bg-slate-950/40 p-3 rounded-xl border border-slate-900">
                <div>
                  <span className="text-[9.5px] text-gray-500 block">{t('leaderboard.statRoi')}</span>
                  <span className="text-sm font-mono font-black text-emerald-400">+{item.roi.toFixed(1)}%</span>
                </div>
                <div>
                  <span className="text-[9.5px] text-gray-500 block">{t('leaderboard.statNetWorth')}</span>
                  <span className="text-sm font-mono font-black text-amber-500">{item.valuation.toLocaleString()} TON</span>
                </div>
              </div>

              <button
                onClick={() => toggleRow(item.id)}
                className="mt-4 w-full py-2 bg-[#635BFF]/10 hover:bg-[#635BFF]/20 text-[#8B83FF] rounded-lg text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer"
              >
                <span>{t('leaderboard.detailCTA')}</span>
                <ChevronDown size={14} className={`transition-transform ${expandedRowId === item.id ? 'rotate-180' : ''}`} />
              </button>
            </div>
          </div>
        ))}

        {activeTab === 'robots' && filteredRobots.slice(0, 3).map((item, idx) => (
          <div key={item.id} className="relative">
            <div className={`absolute inset-0 bg-gradient-to-b ${
              idx === 0
                ? 'from-amber-500/10'
                : idx === 1
                ? 'from-slate-400/10'
                : 'from-amber-700/10'
            } to-transparent blur-xl pointer-events-none rounded-2xl`} />

            <div className={`h-full bg-gradient-to-b from-[#121424] to-[#0A0D18] border ${
              idx === 0
                ? 'border-amber-500/30'
                : idx === 1
                ? 'border-slate-500/20'
                : 'border-amber-700/20'
            } p-5 rounded-2xl relative shadow-lg flex flex-col justify-between`}>
              <div className="absolute top-4 right-4 text-2xl font-black italic opacity-25">
                {idx === 0 ? '🏆' : idx === 1 ? '🥈' : '🥉'}
              </div>
              <div className="flex items-center gap-3 text-left">
                <img src={item.avatar} alt={item.name} className="w-12 h-12 rounded-xl bg-slate-900 border border-slate-800" />
                <div className="min-w-0">
                  <h4 className="text-sm font-black text-white truncate flex items-center gap-1.5">
                    <span>{item.name}</span>
                    <span className="text-[9.5px] text-[#8B83FF] font-black bg-[#635BFF]/10 px-1 rounded">${item.ticker}</span>
                  </h4>
                  <span className="text-[10px] text-gray-500 font-sans">{translateCategory(item.category)}</span>
                </div>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-2 text-left bg-slate-950/40 p-3 rounded-xl border border-slate-900 font-mono">
                <div>
                  <span className="text-[9.5px] text-gray-500 block">{t('leaderboard.statRoi')}</span>
                  <span className="text-sm font-black text-emerald-400">+{item.roi.toFixed(1)}%</span>
                </div>
                <div>
                  <span className="text-[9.5px] text-gray-500 block">{t('leaderboard.statTvl')}</span>
                  <span className="text-sm font-black text-white">{item.tvl > 0 ? `${item.tvl.toLocaleString()} TON` : t('leaderboard.agentFundingTag')}</span>
                </div>
              </div>

              <button
                onClick={() => toggleRow(item.id)}
                className="mt-4 w-full py-2 bg-[#635BFF]/10 hover:bg-[#635BFF]/20 text-[#8B83FF] rounded-lg text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer"
              >
                <span>{t('leaderboard.detailCTA')}</span>
                <ChevronDown size={14} className={`transition-transform ${expandedRowId === item.id ? 'rotate-180' : ''}`} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* 4. Complete List (Table style with accordions) */}
      <div className="bg-[#090A14] border border-[#161A34] rounded-2xl overflow-hidden shadow-xl font-sans">

        {/* Table header */}
        <div className="grid grid-cols-12 gap-2.5 px-6 py-4 bg-[#0E1020] border-b border-[#1B1F3C] text-[10px] font-mono tracking-wider text-gray-500 text-left font-bold uppercase select-none">
          <div className="col-span-1">{t('leaderboard.colRank')}</div>
          <div className="col-span-4 sm:col-span-5">
            {activeTab === 'creators' ? t('leaderboard.colCreator') : activeTab === 'investors' ? t('leaderboard.colInvestor') : t('leaderboard.colAgent')}
          </div>
          <div className="col-span-3 text-right">
            {activeTab === 'creators' ? t('leaderboard.colLaunchedProjects') : activeTab === 'investors' ? t('leaderboard.colTotalBacked') : t('leaderboard.colTvl')}
          </div>
          <div className="col-span-4 sm:col-span-3 text-right">{t('leaderboard.colRoi')}</div>
        </div>

        {/* Empty State */}
        {((activeTab === 'creators' && filteredCreators.length === 0) ||
          (activeTab === 'investors' && filteredInvestors.length === 0) ||
          (activeTab === 'robots' && filteredRobots.length === 0)) && (
          <div className="text-center py-16 text-gray-500 font-sans text-xs">
            {t('leaderboard.noResults')}
          </div>
        )}

        {/* 4.1. Creator Leaderboard list */}
        {activeTab === 'creators' && filteredCreators.map((item, index) => {
          const isExpanded = expandedRowId === item.id;
          const rank = index + 1;

          return (
            <div key={item.id} className="border-b border-[#14172F]/50">
              {/* Accordion Row Header */}
              <div
                onClick={() => toggleRow(item.id)}
                className={`grid grid-cols-12 gap-2.5 px-6 py-4.5 items-center hover:bg-[#121427]/55 transition cursor-pointer text-left ${
                  isExpanded ? 'bg-[#121428]/40 border-l-2 border-[#8B83FF] pl-5.5' : ''
                }`}
              >
                {/* Rank Badge */}
                <div className="col-span-1 flex items-center font-mono font-black text-sm">
                  {rank === 1 ? (
                    <span className="w-5 h-5 rounded bg-amber-500 text-slate-900 text-[10px] font-black flex items-center justify-center">1</span>
                  ) : rank === 2 ? (
                    <span className="w-5 h-5 rounded bg-slate-400 text-slate-900 text-[10px] font-black flex items-center justify-center">2</span>
                  ) : rank === 3 ? (
                    <span className="w-5 h-5 rounded bg-amber-700 text-white text-[10px] font-black flex items-center justify-center">3</span>
                  ) : (
                    <span className="text-gray-400 font-normal pl-1.5">{rank}</span>
                  )}
                </div>

                {/* Creator Avatar & Address */}
                <div className="col-span-4 sm:col-span-5 flex items-center gap-3">
                  <img src={item.avatar} alt={item.name} className="w-8 h-8 rounded-lg bg-slate-900 border border-slate-800" />
                  <div className="min-w-0 text-left">
                    <span className="text-xs sm:text-sm font-bold text-white block truncate">{item.name}</span>
                    <span className="text-[9.5px] text-gray-500 font-mono block">{shortenAddress(item.address)}</span>
                  </div>
                </div>

                {/* Projects launched count */}
                <div className="col-span-3 text-right flex flex-col items-end justify-center">
                  <span className="text-xs sm:text-sm font-bold text-white font-mono">{item.totalProjects}</span>
                  <span className="text-[9px] text-gray-500 font-sans block sm:hidden">{t('leaderboard.unitProjects')}</span>
                </div>

                {/* ROI Rate */}
                <div className="col-span-4 sm:col-span-3 text-right flex items-center justify-end gap-1 font-mono">
                  <div className="text-right">
                    <span className="text-xs sm:text-sm font-black text-emerald-400">+{item.avgROI.toFixed(2)}%</span>
                    <span className="text-[9.5px] text-gray-500 block font-normal">{t('leaderboard.statTotalRaised')}: {Math.round(item.totalRaised).toLocaleString()} T</span>
                  </div>
                  {isExpanded ? <ChevronUp size={14} className="text-gray-500 shrink-0 ml-1" /> : <ChevronDown size={14} className="text-gray-500 shrink-0 ml-1" />}
                </div>
              </div>

              {/* Accordion Row Details */}
              {isExpanded && (
                <div className="px-6 pb-6 pt-2 bg-[#0A0C16] border-t border-[#13162C]/40 grid grid-cols-1 lg:grid-cols-12 gap-6 text-left animate-in slide-in-from-top-2 duration-150">
                  <div className="lg:col-span-8 space-y-4">
                    <span className="text-[10px] text-gray-500 font-mono tracking-wider font-extrabold block">{t('leaderboard.launchedProjectsTitle')}</span>

                    <div className="space-y-3">
                      {item.projects.map((proj) => (
                        <div key={proj.id} className="bg-[#0F1122] border border-[#1F2244] p-3.5 rounded-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                          <div className="text-left">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-black text-white">{proj.title}</span>
                              <span className="text-[9px] bg-slate-900 text-gray-400 font-mono px-1.5 py-0.2 rounded font-bold">${proj.ticker}</span>
                            </div>
                            <div className="flex items-center gap-4 text-[10.5px] text-gray-500 mt-2 font-mono">
                              <span>{t('leaderboard.launchPriceLabel')} <strong className="text-gray-300">{proj.launchPrice} TON</strong></span>
                              <span>{t('leaderboard.currentPriceLabel')} <strong className="text-gray-300">{proj.currentPrice} TON</strong></span>
                              <span>{t('leaderboard.raisedProgressLabel')} <strong className="text-gray-300">{proj.raised.toLocaleString()} / {proj.goal.toLocaleString()} TON</strong></span>
                            </div>
                          </div>

                          <div className="flex items-center gap-3 self-end sm:self-center font-mono">
                            <div className="text-right">
                              {proj.status === 'listed' ? (
                                <span className={`text-xs font-black px-2 py-0.5 rounded ${
                                  proj.roi >= 0 ? 'bg-emerald-550/10 text-emerald-400' : 'bg-rose-550/10 text-rose-400'
                                }`}>
                                  ROI: {proj.roi >= 0 ? '+' : ''}{proj.roi.toFixed(1)}%
                                </span>
                              ) : (
                                <span className="text-[10px] bg-indigo-950/40 text-indigo-400 border border-indigo-900/30 px-2 py-0.5 rounded font-black">
                                  {t('leaderboard.squadFundingTag')}
                                </span>
                              )}
                            </div>

                            <button
                              onClick={() => navigate(`/launch/${proj.id}`)}
                              className="p-1 hover:bg-[#1E213D] rounded border border-[#2D315C] text-[#8B83FF] hover:text-white transition cursor-pointer"
                              title={t('leaderboard.viewBountyCTA')}
                            >
                              <ArrowRight size={13} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="lg:col-span-4 bg-[#0C0E1B] border border-[#191C3E] rounded-xl p-4 flex flex-col justify-between">
                    <div>
                      <span className="text-[10px] text-gray-500 font-mono tracking-wider font-extrabold block">{t('leaderboard.roiTrendTitle')}</span>
                      <div className="h-28 w-full mt-3">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={generateAccordionChartData(item.avgROI === 0 ? 10 : item.avgROI)}>
                            <defs>
                              <linearGradient id={`grad-c-${item.id}`} x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#10B981" stopOpacity={0.25}/>
                                <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                              </linearGradient>
                            </defs>
                            <RechartsTooltip
                              contentStyle={{ backgroundColor: '#090A14', border: '1px solid #1C1F3F', borderRadius: '8px' }}
                              labelStyle={{ fontSize: '9px', color: '#666', fontFamily: 'monospace' }}
                              itemStyle={{ fontSize: '10.5px', color: '#10B981', fontFamily: 'monospace' }}
                            />
                            <Area type="monotone" dataKey="value" stroke="#10B981" strokeWidth={1.5} fillOpacity={1} fill={`url(#grad-c-${item.id})`} />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-slate-900 text-[10px] text-gray-400 font-sans leading-relaxed">
                      {t('leaderboard.creatorSecurityDesc')}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {/* 4.2. Investor Leaderboard list */}
        {activeTab === 'investors' && filteredInvestors.map((item, index) => {
          const isExpanded = expandedRowId === item.id;
          const rank = index + 1;
          const isCurrentUser = walletAddress && item.address === walletAddress;

          return (
            <div key={item.id} className="border-b border-[#14172F]/50">
              {/* Accordion Row Header */}
              <div
                onClick={() => toggleRow(item.id)}
                className={`grid grid-cols-12 gap-2.5 px-6 py-4.5 items-center hover:bg-[#121427]/55 transition cursor-pointer text-left ${
                  isExpanded ? 'bg-[#121428]/40 border-l-2 border-[#8B83FF] pl-5.5' : ''
                } ${isCurrentUser ? 'bg-[#635BFF]/5 hover:bg-[#635BFF]/10' : ''}`}
              >
                {/* Rank Badge */}
                <div className="col-span-1 flex items-center font-mono font-black text-sm">
                  {rank === 1 ? (
                    <span className="w-5 h-5 rounded bg-amber-500 text-slate-900 text-[10px] font-black flex items-center justify-center">1</span>
                  ) : rank === 2 ? (
                    <span className="w-5 h-5 rounded bg-slate-400 text-slate-900 text-[10px] font-black flex items-center justify-center">2</span>
                  ) : rank === 3 ? (
                    <span className="w-5 h-5 rounded bg-amber-700 text-white text-[10px] font-black flex items-center justify-center">3</span>
                  ) : (
                    <span className="text-gray-400 font-normal pl-1.5">{rank}</span>
                  )}
                </div>

                {/* Investor Avatar & Name */}
                <div className="col-span-4 sm:col-span-5 flex items-center gap-3">
                  <img src={item.avatar} alt={item.name} className="w-8 h-8 rounded-lg bg-slate-900 border border-slate-800" />
                  <div className="min-w-0 text-left">
                    <span className="text-xs sm:text-sm font-bold text-white block truncate flex items-center gap-1.5">
                      <span>{item.name}</span>
                      {isCurrentUser && (
                        <span className="text-[9px] font-black font-sans bg-[#8B83FF]/20 text-[#8B83FF] border border-[#8B83FF]/30 px-1 rounded">{t('leaderboard.currentUserTag')}</span>
                      )}
                    </span>
                    <span className="text-[9.5px] text-gray-500 font-mono block">{shortenAddress(item.address)}</span>
                  </div>
                </div>

                {/* Total invested */}
                <div className="col-span-3 text-right flex flex-col items-end justify-center font-mono">
                  <span className="text-xs sm:text-sm font-bold text-white">{Math.round(item.totalInvested).toLocaleString()} TON</span>
                  <span className="text-[9.5px] text-gray-500 font-sans block sm:hidden">{t('leaderboard.unitInvested')}</span>
                </div>

                {/* Return ROI */}
                <div className="col-span-4 sm:col-span-3 text-right flex items-center justify-end gap-1 font-mono">
                  <div className="text-right">
                    <span className="text-xs sm:text-sm font-black text-emerald-400">+{item.roi.toFixed(2)}%</span>
                    <span className="text-[9.5px] text-gray-500 block font-normal">{t('leaderboard.statNetWorth')}: {Math.round(item.valuation).toLocaleString()} T</span>
                  </div>
                  {isExpanded ? <ChevronUp size={14} className="text-gray-500 shrink-0 ml-1" /> : <ChevronDown size={14} className="text-gray-500 shrink-0 ml-1" />}
                </div>
              </div>

              {/* Accordion Row Details */}
              {isExpanded && (
                <div className="px-6 pb-6 pt-2 bg-[#0A0C16] border-t border-[#13162C]/40 grid grid-cols-1 lg:grid-cols-12 gap-6 text-left animate-in slide-in-from-top-2 duration-150">
                  <div className="lg:col-span-8 space-y-4">
                    <span className="text-[10px] text-gray-500 font-mono tracking-wider font-extrabold block">{t('leaderboard.investmentPortfolioTitle')}</span>

                    {item.projectsSupported.length === 0 ? (
                      <div className="text-xs text-gray-500 py-3 text-center border border-dashed border-slate-900 rounded-lg">
                        {t('leaderboard.noInvestments')}
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {item.projectsSupported.map((sup, sIdx) => (
                          <div key={sIdx} className="bg-[#0F1122] border border-[#1F2244] p-3.5 rounded-xl flex justify-between items-center gap-3">
                            <div className="text-left">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-white">{sup.name}</span>
                                <span className="text-[9px] bg-slate-900 text-gray-400 font-mono px-1.5 py-0.2 rounded font-bold">${sup.ticker}</span>
                              </div>
                              <div className="flex items-center gap-4 text-[10.5px] text-gray-500 mt-2 font-mono">
                                <span>{t('leaderboard.investedLabel')} <strong className="text-gray-300">{sup.invested.toLocaleString()} TON</strong></span>
                                <span>{t('leaderboard.currentWorthLabel')} <strong className="text-gray-300">{sup.currentWorth.toLocaleString()} TON</strong></span>
                              </div>
                            </div>

                            <div className="font-mono">
                              <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                                sup.roi >= 0 ? 'bg-emerald-550/10 text-emerald-400' : 'bg-rose-550/10 text-rose-400'
                              }`}>
                                {sup.roi >= 0 ? '+' : ''}{sup.roi.toFixed(1)}%
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="lg:col-span-4 bg-[#0C0E1B] border border-[#191C3E] rounded-xl p-4 flex flex-col justify-between">
                    <div>
                      <span className="text-[10px] text-gray-500 font-mono tracking-wider font-extrabold block">{t('leaderboard.portfolioValuationTitle')}</span>
                      <div className="h-28 w-full mt-3">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={generateAccordionChartData(item.valuation, 1.05)}>
                            <defs>
                              <linearGradient id={`grad-i-${item.id}`} x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#635BFF" stopOpacity={0.25}/>
                                <stop offset="95%" stopColor="#635BFF" stopOpacity={0}/>
                              </linearGradient>
                            </defs>
                            <RechartsTooltip
                              contentStyle={{ backgroundColor: '#090A14', border: '1px solid #1C1F3F', borderRadius: '8px' }}
                              labelStyle={{ fontSize: '9px', color: '#666', fontFamily: 'monospace' }}
                              itemStyle={{ fontSize: '10.5px', color: '#8B83FF', fontFamily: 'monospace' }}
                            />
                            <Area type="monotone" dataKey="value" stroke="#8B83FF" strokeWidth={1.5} fillOpacity={1} fill={`url(#grad-i-${item.id})`} />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-slate-900 text-[10px] text-gray-400 font-sans leading-relaxed">
                      {t('leaderboard.investorYieldDesc')}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {/* 4.3. Robot Leaderboard list */}
        {activeTab === 'robots' && filteredRobots.map((item, index) => {
          const isExpanded = expandedRowId === item.id;
          const rank = index + 1;

          return (
            <div key={item.id} className="border-b border-[#14172F]/50">
              {/* Accordion Row Header */}
              <div
                onClick={() => toggleRow(item.id)}
                className={`grid grid-cols-12 gap-2.5 px-6 py-4.5 items-center hover:bg-[#121427]/55 transition cursor-pointer text-left ${
                  isExpanded ? 'bg-[#121428]/40 border-l-2 border-[#8B83FF] pl-5.5' : ''
                }`}
              >
                {/* Rank Badge */}
                <div className="col-span-1 flex items-center font-mono font-black text-sm">
                  {rank === 1 ? (
                    <span className="w-5 h-5 rounded bg-amber-500 text-slate-900 text-[10px] font-black flex items-center justify-center">1</span>
                  ) : rank === 2 ? (
                    <span className="w-5 h-5 rounded bg-slate-400 text-slate-900 text-[10px] font-black flex items-center justify-center">2</span>
                  ) : rank === 3 ? (
                    <span className="w-5 h-5 rounded bg-amber-700 text-white text-[10px] font-black flex items-center justify-center">3</span>
                  ) : (
                    <span className="text-gray-400 font-normal pl-1.5">{rank}</span>
                  )}
                </div>

                {/* Robot Details */}
                <div className="col-span-4 sm:col-span-5 flex items-center gap-3">
                  <img src={item.avatar} alt={item.name} className="w-8 h-8 rounded-lg bg-slate-900 border border-slate-800" />
                  <div className="min-w-0 text-left">
                    <span className="text-xs sm:text-sm font-bold text-white block truncate flex items-center gap-1.5">
                      <span>{item.name}</span>
                      <span className="text-[9px] bg-slate-900 text-[#8B83FF] font-mono px-1 rounded">${item.ticker}</span>
                    </span>
                    <span className="text-[9.5px] text-gray-500 font-sans block">{translateCategory(item.category)}</span>
                  </div>
                </div>

                {/* TVL Amount */}
                <div className="col-span-3 text-right flex flex-col items-end justify-center font-mono">
                  {item.tvl > 0 ? (
                    <span className="text-xs sm:text-sm font-bold text-white">{item.tvl.toLocaleString()} TON</span>
                  ) : (
                    <span className="text-[10px] text-indigo-400 font-black">{t('leaderboard.agentFundingTag')}</span>
                  )}
                  <span className="text-[9.5px] text-gray-500 font-sans block sm:hidden">TVL</span>
                </div>

                {/* ROI */}
                <div className="col-span-4 sm:col-span-3 text-right flex items-center justify-end gap-1 font-mono">
                  <div className="text-right">
                    <span className="text-xs sm:text-sm font-black text-emerald-400">+{item.roi.toFixed(1)}%</span>
                    <span className="text-[9.5px] text-gray-500 block font-normal">{t('leaderboard.scoreLabel').replace('{score}', item.score.toString())}</span>
                  </div>
                  {isExpanded ? <ChevronUp size={14} className="text-gray-500 shrink-0 ml-1" /> : <ChevronDown size={14} className="text-gray-500 shrink-0 ml-1" />}
                </div>
              </div>

              {/* Accordion Row Details */}
              {isExpanded && (
                <div className="px-6 pb-6 pt-2 bg-[#0A0C16] border-t border-[#13162C]/40 grid grid-cols-1 lg:grid-cols-12 gap-6 text-left animate-in slide-in-from-top-2 duration-150">
                  <div className="lg:col-span-8 space-y-4">
                    <span className="text-[10px] text-gray-500 font-mono tracking-wider font-extrabold block">{t('leaderboard.capsTitle')}</span>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Metric Card 1 */}
                      <div className="bg-[#0F1122] border border-[#1F2244] p-4 rounded-xl space-y-2">
                        <span className="text-[10px] text-gray-500 font-mono block text-left">{t('leaderboard.winRateTitle')}</span>
                        <div className="flex items-baseline gap-1.5">
                          <span className="text-xl font-bold font-mono text-white">{item.winRate}%</span>
                          <span className="text-[9px] text-[#10B981] font-mono font-bold flex items-center gap-0.5">
                            <TrendingUp size={10} />
                            <span>{t('leaderboard.winRateStable')}</span>
                          </span>
                        </div>
                        <ProgressBar progress={item.winRate} />
                      </div>

                      {/* Metric Card 2 */}
                      <div className="bg-[#0F1122] border border-[#1F2244] p-4 rounded-xl space-y-2">
                        <span className="text-[10px] text-gray-500 font-mono block text-left">{t('leaderboard.securityScoreTitle')}</span>
                        <div className="flex items-baseline gap-1.5">
                          <span className="text-xl font-bold font-mono text-[#8B83FF]">{item.score} / 100</span>
                          <span className="text-[9px] text-gray-500 font-mono">Class A</span>
                        </div>
                        <ProgressBar progress={item.score} />
                      </div>
                    </div>

                    {/* Capabilities badges */}
                    <div className="space-y-2 text-left">
                      <span className="text-[10px] text-gray-500 font-mono block">{t('leaderboard.coreCapabilitiesTitle')}</span>
                      <div className="flex flex-wrap gap-2">
                        {item.capabilities.map((cap, capIdx) => (
                          <span key={capIdx} className="px-2.5 py-1 bg-[#15132A] border border-[#30265B] text-[#A699FF] text-[10px] font-bold rounded-lg flex items-center gap-1 shadow-sm font-sans">
                            <StarIcon size={9} className="text-[#8B83FF] fill-current" />
                            <span>{cap}</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="lg:col-span-4 bg-[#0C0E1B] border border-[#191C3E] rounded-xl p-4 flex flex-col justify-between">
                    <div>
                      <span className="text-[10px] text-gray-500 font-mono tracking-wider font-extrabold block">{t('leaderboard.weeklyTelemetryTitle')}</span>
                      <div className="h-28 w-full mt-3">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={generateAccordionChartData(item.roi, 1.1)}>
                            <defs>
                              <linearGradient id={`grad-r-${item.id}`} x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#10B981" stopOpacity={0.25}/>
                                <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                              </linearGradient>
                            </defs>
                            <RechartsTooltip
                              contentStyle={{ backgroundColor: '#090A14', border: '1px solid #1C1F3F', borderRadius: '8px' }}
                              labelStyle={{ fontSize: '9px', color: '#666', fontFamily: 'monospace' }}
                              itemStyle={{ fontSize: '10.5px', color: '#10B981', fontFamily: 'monospace' }}
                            />
                            <Area type="monotone" dataKey="value" stroke="#10B981" strokeWidth={1.5} fillOpacity={1} fill={`url(#grad-r-${item.id})`} />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    <button
                      onClick={() => navigate(`/copilot`)}
                      className="mt-4 w-full py-2 bg-[#635BFF] hover:bg-[#5048E5] text-white rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-lg shadow-[#635BFF]/15 font-sans"
                    >
                      <Bot size={13} />
                      <span>{t('leaderboard.copilotCTA')}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}

      </div>
    </div>
  );
}
