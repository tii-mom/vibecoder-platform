import React, { useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell } from 'recharts';
import {
  Coins, Flame, DollarSign, ArrowDownUp, TrendingUp, TrendingDown,
  RefreshCw, Layers, ShieldCheck, CheckCircle2, Rocket, Info,
  Sparkles, Calendar, ArrowRight, UserCheck, Wallet, AlertTriangle,
  Settings, History, BookOpen, Globe
} from 'lucide-react';
import { useUserStore } from '../store/userStore';
import { useSparkStore } from '../store/sparkStore';
import { Button } from '../components/ui/Button';
import { Card, CardHeader, CardTitle, CardDescription } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { ProgressBar } from '../components/ui/ProgressBar';
import { useTranslation } from '../hooks/useTranslation';

export default function LaunchpadPage() {
  const { t } = useTranslation();
  const { isConnected, profile, connectWallet, updateProfile } = useUserStore();
  const { tokens, buyToken, sellToken, projects, listProjectOnAMM } = useSparkStore();

  const [activeTab, setActiveTab] = useState<'launchpad' | 'trading'>('trading');

  // TRADING TERMINAL STATE
  const [selectedTokenId, setSelectedTokenId] = useState<string>(tokens[0]?.id || '');
  const [tradeType, setTradeType] = useState<'buy' | 'sell'>('buy');
  const [amount, setAmount] = useState<string>('10');
  const [tradeSuccess, setTradeSuccess] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Refined Interactive states
  const [timeframe, setTimeframe] = useState<'1H' | '4H' | '24H' | '7D' | '1M'>('24H');
  const [slippage, setSlippage] = useState<number>(1.0);
  const [showSlippageModal, setShowSlippageModal] = useState(false);
  const [customSlippage, setCustomSlippage] = useState<string>('');

  const [orderBook, setOrderBook] = useState<{ ask: { price: number; amount: number; total: number }[]; bid: { price: number; amount: number; total: number }[] }>({ ask: [], bid: [] });
  const [recentTrades, setRecentTrades] = useState<{ id: string; type: 'buy' | 'sell'; price: number; amount: number; time: string }[]>([]);

  const activeToken = tokens.find(t => t.id === selectedTokenId) || tokens[0];

  // Helper for generating timeframe-based dynamic chart data
  const getDynamicChartData = () => {
    if (!activeToken) return [];
    const basePrice = activeToken.price;
    const pointsCount = timeframe === '1H' ? 12 : timeframe === '4H' ? 16 : timeframe === '24H' ? 20 : timeframe === '7D' ? 14 : 30;

    // Seeded random number generator so the chart looks consistent for the same tokenId and timeframe
    let seed = activeToken.id.charCodeAt(activeToken.id.length - 1) + timeframe.charCodeAt(0);
    const random = () => {
      const x = Math.sin(seed++) * 10000;
      return x - Math.floor(x);
    };

    const data = [];
    let currentPrice = basePrice * (timeframe === '1H' ? 0.992 : timeframe === '4H' ? 0.98 : timeframe === '24H' ? 0.95 : timeframe === '7D' ? 0.88 : 0.75);

    for (let i = 0; i < pointsCount; i++) {
      const ratio = i / (pointsCount - 1);
      const targetPrice = basePrice * (0.96 + ratio * 0.04 + (random() - 0.5) * 0.02);
      currentPrice = currentPrice * 0.55 + targetPrice * 0.45;

      let label = '';
      if (timeframe === '1H') {
        label = `${((pointsCount - 1 - i) * 5)}m ago`;
      } else if (timeframe === '4H') {
        label = `${((pointsCount - 1 - i) * 15)}m ago`;
      } else if (timeframe === '24H') {
        label = `${String(Math.floor(i * 24 / pointsCount)).padStart(2, '0')}:00`;
      } else if (timeframe === '7D') {
        label = `Day ${i + 1}`;
      } else {
        label = `05-${String(Math.max(1, i + 1)).padStart(2, '0')}`;
      }

      data.push({
        time: label,
        price: Number(currentPrice.toFixed(4)),
        volume: Math.floor(random() * 12000 + 2000)
      });
    }
    // Make sure the last data point matches the active token price exactly
    if (data.length > 0) {
      data[data.length - 1].price = activeToken.price;
    }
    return data;
  };

  // Generate order book and simulated updates
  React.useEffect(() => {
    if (!activeToken) return;
    const basePrice = activeToken.price;

    const generateOrderBook = () => {
      const ask = [];
      const bid = [];
      let askTotal = 0;
      let bidTotal = 0;

      // Asks (Sells) - higher than current price
      for (let i = 5; i >= 1; i--) {
        const p = basePrice * (1 + i * 0.0018);
        const amt = Math.floor(Math.random() * 1200 + 80);
        askTotal += amt;
        ask.push({ price: Number(p.toFixed(4)), amount: amt, total: askTotal });
      }

      // Bids (Buys) - lower than current price
      for (let i = 1; i <= 5; i++) {
        const p = basePrice * (1 - i * 0.0018);
        const amt = Math.floor(Math.random() * 1500 + 100);
        bidTotal += amt;
        bid.push({ price: Number(p.toFixed(4)), amount: amt, total: bidTotal });
      }

      return { ask, bid };
    };

    setOrderBook(generateOrderBook());

    const interval = setInterval(() => {
      setOrderBook(prev => {
        const nextAsk = prev.ask.map(item => {
          const change = Math.floor((Math.random() - 0.5) * 60);
          const nextAmt = Math.max(10, item.amount + change);
          return { ...item, amount: nextAmt };
        });

        const nextBid = prev.bid.map(item => {
          const change = Math.floor((Math.random() - 0.5) * 70);
          const nextAmt = Math.max(10, item.amount + change);
          return { ...item, amount: nextAmt };
        });

        let askTot = 0;
        for (let i = nextAsk.length - 1; i >= 0; i--) {
          askTot += nextAsk[i].amount;
          nextAsk[i].total = askTot;
        }

        let bidTot = 0;
        for (let i = 0; i < nextBid.length; i++) {
          bidTot += nextBid[i].amount;
          nextBid[i].total = bidTot;
        }

        return { ask: nextAsk, bid: nextBid };
      });
    }, 3000);

    return () => clearInterval(interval);
  }, [selectedTokenId]);

  // Generate recent trades feed
  React.useEffect(() => {
    if (!activeToken) return;
    const basePrice = activeToken.price;

    const initialTrades = Array.from({ length: 8 }, (_, idx) => {
      const isBuy = Math.random() > 0.48;
      const amt = Math.floor(Math.random() * 900 + 60);
      const p = basePrice * (1 + (Math.random() - 0.5) * 0.004);
      return {
        id: `t-${idx}-${Date.now()}`,
        type: isBuy ? 'buy' as const : 'sell' as const,
        price: Number(p.toFixed(4)),
        amount: amt,
        time: `${idx + 1}m ago`
      };
    });
    setRecentTrades(initialTrades);

    const interval = setInterval(() => {
      setRecentTrades(prev => {
        const isBuy = Math.random() > 0.45;
        const amt = Math.floor(Math.random() * 800 + 50);
        const p = activeToken.price * (1 + (Math.random() - 0.5) * 0.003);
        const newTrade = {
          id: `t-live-${Date.now()}`,
          type: isBuy ? 'buy' as const : 'sell' as const,
          price: Number(p.toFixed(4)),
          amount: amt,
          time: 'Just now'
        };
        const updated = prev.map(t => {
          if (t.time === 'Just now') return { ...t, time: '5s ago' };
          if (t.time.endsWith('s ago')) {
            const sec = parseInt(t.time) + 5;
            return { ...t, time: `${sec}s ago` };
          }
          return t;
        });
        return [newTrade, ...updated.slice(0, 12)];
      });
    }, 5000);

    return () => clearInterval(interval);
  }, [selectedTokenId]);

  // LAUNCHPAD STATE
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedLaunchProj, setSelectedLaunchProj] = useState<any>(null);
  const [exchangeAmount, setExchangeAmount] = useState<string>('50');
  const [launchStep, setLaunchStep] = useState<'input' | 'processing' | 'success'>('input');
  const [txHash, setTxHash] = useState('');

  const handleWalletFallback = () => {
    connectWallet();
  };

  // Inventory Helper
  const getInventory = (): Record<string, number> => {
    if (typeof window === 'undefined') return {};
    const data = localStorage.getItem('vc_inventory');
    return data ? JSON.parse(data) : { "tok-1": 500, "tok-2": 150, "tok-3": 250 };
  };

  const saveInventory = (inv: Record<string, number>) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('vc_inventory', JSON.stringify(inv));
    }
  };

  const inventory = getInventory();
  const activeOwnedBalance = inventory[activeToken?.id] || 0;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return "bg-sky-500/10 text-sky-400 border border-sky-500/20 animate-pulse";
      case 'success':
        return "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20";
      case 'listed':
        return "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20";
      default:
        return "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'active':
        return t('launchpad.statusActive');
      case 'success':
        return t('launchpad.statusCompleted');
      case 'listed':
        return t('launchpad.statusListed');
      default:
        return t('launchpad.statusUpcoming');
    }
  };

  const getTokenomicsName = (name: string) => {
    if (name.includes("星火认配") || name.includes("Community Share")) {
      return t('launchpad.tokenomicsCommunityShare');
    }
    if (name.includes("团队解锁") || name.includes("Builder Vesting")) {
      return t('launchpad.tokenomicsBuilderVesting');
    }
    if (name.includes("运营代币") || name.includes("Ops Token Pool")) {
      return t('launchpad.tokenomicsOpsPool');
    }
    if (name.includes("平台金库") || name.includes("Platform Fund")) {
      return t('launchpad.tokenomicsPlatformFund');
    }
    if (name.includes("AMM流动底仓") || name.includes("Liquidity Pool")) {
      return t('launchpad.tokenomicsLiquidityPool');
    }
    return name;
  };

  const getVestingText = (vesting: string) => {
    if (vesting === "TGE 释放 100%，AMM 锁定底仓保障" || vesting.includes("TGE 释放 100%")) {
      return t('launchpad.defaultVesting');
    }
    return vesting;
  };

  // Swap Core Trade
  const handleTrade = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setTradeSuccess(false);

    if (!isConnected || !profile) {
      handleWalletFallback();
      return;
    }

    const tradeVal = Number(amount);
    if (isNaN(tradeVal) || tradeVal <= 0) {
      setErrorMsg(t('launchpad.invalidTradeAmount'));
      return;
    }

    if (tradeType === 'buy') {
      if (profile.balanceTON < tradeVal) {
        setErrorMsg(t('launchpad.insufficientTonBalance', { balance: profile.balanceTON }));
        return;
      }

      const ok = buyToken(activeToken.id, tradeVal, profile.walletAddress);
      if (ok) {
        const boughtTokens = Number((tradeVal / activeToken.price).toFixed(2));
        updateProfile({
          balanceTON: Number((profile.balanceTON - tradeVal).toFixed(2)),
          hasGasConsumption: true
        });

        const nextInv = { ...inventory, [activeToken.id]: (inventory[activeToken.id] || 0) + boughtTokens };
        saveInventory(nextInv);

        setSuccessMsg(t('launchpad.buySuccessMsg', { amount: tradeVal, tokens: boughtTokens, symbol: activeToken.symbol }));
        setTradeSuccess(true);

        // Add to recent trades feed
        const newTrade = {
          id: `t-user-${Date.now()}`,
          type: 'buy' as const,
          price: activeToken.price,
          amount: boughtTokens,
          time: 'Just now'
        };
        setRecentTrades(prev => [newTrade, ...prev.slice(0, 12)]);
      }
    } else {
      if (activeOwnedBalance < tradeVal) {
        setErrorMsg(t('launchpad.insufficientTokenBalance', { symbol: activeToken.symbol, balance: activeOwnedBalance }));
        return;
      }

      const ok = sellToken(activeToken.id, tradeVal, profile.walletAddress);
      if (ok) {
        const receivedTON = Number((tradeVal * activeToken.price).toFixed(2));
        updateProfile({
          balanceTON: Number((profile.balanceTON + receivedTON).toFixed(2)),
          hasGasConsumption: true
        });

        const nextInv = { ...inventory, [activeToken.id]: Math.max(0, Number((activeOwnedBalance - tradeVal).toFixed(2))) };
        saveInventory(nextInv);

        setSuccessMsg(t('launchpad.sellSuccessMsg', { amount: tradeVal, symbol: activeToken.symbol, ton: receivedTON }));
        setTradeSuccess(true);

        // Add to recent trades feed
        const newTrade = {
          id: `t-user-${Date.now()}`,
          type: 'sell' as const,
          price: activeToken.price,
          amount: tradeVal,
          time: 'Just now'
        };
        setRecentTrades(prev => [newTrade, ...prev.slice(0, 12)]);
      }
    }
    setAmount('10');
  };

  // Launchpad Project items derived dynamically from store projects
  const launchProjects = projects.map(proj => {
    let statusStr: 'failed' | 'active' | 'success' | 'listed' = 'active';
    if (proj.status === 'active') {
      statusStr = 'active';
    } else if (proj.status === 'success') {
      statusStr = 'success';
    } else if (proj.status === 'listed') {
      statusStr = 'listed';
    } else if (proj.status === 'failed') {
      statusStr = 'failed';
    }

    const tokenomics = proj.tokenomics || [
      { name: "星火认配 Community Share", value: 37, color: "#635BFF" },
      { name: "团队解锁 Builder Vesting", value: 40, color: "#10B981" },
      { name: "运营代币 Ops Token Pool", value: 10, color: "#FFA825" },
      { name: "平台金库 Platform Fund", value: 8, color: "#EF4444" },
      { name: "AMM流动底仓 Liquidity Pool", value: 5, color: "#06B6D4" }
    ];

    return {
      id: proj.id,
      name: proj.agentName,
      symbol: proj.agentTicker,
      launchDate: new Date(proj.endTime).toISOString().split('T')[0],
      totalSupply: proj.totalSupply || 10000000,
      initialPrice: proj.tokenPrice,
      raisedAmount: proj.raisedAmount,
      goalAmount: proj.goalAmount,
      progress: proj.progress,
      status: statusStr,
      tokenomics,
      vesting: proj.vesting || "TGE 释放 100%，AMM 锁定底仓保障"
    };
  });

  // Open Modal to exchange $VC
  const openLaunchModal = (proj: any) => {
    setSelectedLaunchProj(proj);
    setExchangeAmount('50');
    setLaunchStep('input');
    setErrorMsg('');
    setIsModalOpen(true);
  };

  const handleLaunchpadExchange = () => {
    if (!isConnected || !profile) {
      handleWalletFallback();
      return;
    }

    if (profile.balanceVC < 100) {
      setErrorMsg(t('launchpad.vcRequirementError', { balance: profile.balanceVC }));
      return;
    }

    const swapVC = Number(exchangeAmount);
    if (isNaN(swapVC) || swapVC <= 0) {
      setErrorMsg(t('launchpad.invalidExchangeAmount'));
      return;
    }

    if (profile.balanceVC < swapVC) {
      setErrorMsg(t('launchpad.insufficientVcBalance', { amount: swapVC, balance: profile.balanceVC }));
      return;
    }

    setLaunchStep('processing');
    setErrorMsg('');

    // Simulate blockchain delay
    setTimeout(() => {
      // txHash: demo simulation only. Production must use real on-chain txHash from API.
      const hash = import.meta.env.DEV
        ? '0x' + Array.from({length: 32}, () => Math.floor(Math.random()*16).toString(16)).join('')
        : 'PENDING_ONCHAIN';
      setTxHash(hash);

      const tokensReceived = Number((swapVC / selectedLaunchProj.initialPrice).toFixed(1));

      // Update profile balances
      updateProfile({
        balanceVC: Number((profile.balanceVC - swapVC).toFixed(2)),
        balanceTON: Number((profile.balanceTON - 1).toFixed(2)), // 1 TON as a nominal network fee
        hasGasConsumption: true
      });

      // Update local storage inventory
      const lowerSymbol = selectedLaunchProj.symbol.toLowerCase();
      const nextInv = { ...inventory, [`tok-${lowerSymbol}`]: (inventory[`tok-${lowerSymbol}`] || 0) + tokensReceived };
      saveInventory(nextInv);

      setLaunchStep('success');
    }, 2000);
  };

  return (
    <div className="space-y-10 text-left select-none">

      {/* Upper Tab and Header section */}
      <div className="border-b border-[#21253C] pb-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <Rocket className="text-[#635BFF]" size={24} />
            <span>{t('launchpad.title')}</span>
          </h1>
          <p className="text-xs text-gray-400 mt-1">
            {t('launchpad.description')}
          </p>
        </div>

        {/* Outer Tabs switcher */}
        <div className="flex bg-[#121620] p-1 border border-[#22253E] rounded-xl self-start md:self-auto shadow-inner">
          <button
            onClick={() => setActiveTab('launchpad')}
            className={`flex items-center gap-1.5 px-4 py-1.5 text-xs font-black rounded-lg transition-all cursor-pointer ${
              activeTab === 'launchpad' ? 'bg-[#635BFF] text-white shadow-lg' : 'text-gray-400 hover:text-white'
            }`}
          >
            <Sparkles size={12} />
            <span>{t('launchpad.primaryMarket')}</span>
          </button>
          <button
            onClick={() => setActiveTab('trading')}
            className={`flex items-center gap-1.5 px-4 py-1.5 text-xs font-black rounded-lg transition-all cursor-pointer ${
              activeTab === 'trading' ? 'bg-[#635BFF] text-white shadow-lg' : 'text-gray-400 hover:text-white'
            }`}
          >
            <ArrowDownUp size={12} />
            <span>{t('launchpad.secondaryMarket')}</span>
          </button>
        </div>
      </div>

      {activeTab === 'launchpad' ? (
        <div className="space-y-6">

          {/* Statistics grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <Card className="flex items-center justify-between p-5 relative overflow-hidden group">
              <div className="space-y-1">
                <span className="text-[10px] text-gray-500 font-mono tracking-wider block">LAUNCHED AGENTS</span>
                <h3 className="text-xl sm:text-2xl font-black font-mono text-white">{t('launchpad.launchedAgentsCount', { count: 4 })}</h3>
                <span className="text-[10px] text-[#A69FFF] font-medium block">{t('launchpad.launchedAgentsDesc')}</span>
              </div>
              <Rocket size={32} className="text-[#635BFF]/20 group-hover:scale-105 transition duration-300" />
            </Card>

            <Card className="flex items-center justify-between p-5 relative overflow-hidden group">
              <div className="space-y-1">
                <span className="text-[10px] text-gray-500 font-mono tracking-wider block">TOTAL EST. MARKETCAP</span>
                <h3 className="text-xl sm:text-2xl font-black font-mono text-emerald-400">812,000 TON</h3>
                <span className="text-[10px] text-gray-400 font-medium block">{t('launchpad.estMarketCap', { usd: '5,278,000' })}</span>
              </div>
              <DollarSign size={32} className="text-emerald-500/20 group-hover:scale-105 transition duration-300" />
            </Card>

            <Card className="flex items-center justify-between p-5 relative overflow-hidden group">
              <div className="space-y-1">
                <span className="text-[10px] text-gray-500 font-mono tracking-wider block">GLOBAL DEFI HOLDERS</span>
                <h3 className="text-xl sm:text-2xl font-black font-mono text-sky-400">{t('launchpad.globalHoldersCount', { count: '1,240' })}</h3>
                <span className="text-[10px] text-gray-400 font-medium block">{t('launchpad.globalHoldersDesc')}</span>
              </div>
              <Layers size={32} className="text-sky-400/20 group-hover:scale-105 transition duration-300" />
            </Card>
          </div>

          {/* Listing Success banner */}
          {tradeSuccess && successMsg && (
            <div className="p-5 bg-emerald-950/20 border border-emerald-500/35 rounded-2xl text-emerald-400 text-xs font-bold leading-normal flex items-start gap-3.5 animate-in slide-in-from-top duration-300">
              <CheckCircle2 size={18} className="shrink-0 mt-0.5 text-emerald-400" />
              <div>
                <p className="font-extrabold text-[#10B981] text-base">{t('launchpad.liquidityDeploySuccess')}</p>
                <p className="text-gray-300 mt-1 font-sans font-normal leading-relaxed text-xs">{successMsg}</p>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('trading');
                    setTradeSuccess(false);
                    setSuccessMsg('');
                  }}
                  className="mt-3 text-xs bg-[#10B981] hover:bg-[#059669] text-black p-2 px-4 rounded-xl transition font-black cursor-pointer shadow-lg shadow-[#10B981]/20"
                >
                  {t('launchpad.enterTradingTerminal')}
                </button>
              </div>
            </div>
          )}

          {/* Launchpad project rows table */}
          <Card className="p-0 overflow-hidden border border-[#21243C]">
            <div className="p-4 px-5 border-b border-[#21243C] flex items-center justify-between">
              <div>
                <CardTitle>{t('launchpad.primaryMarketTitle')}</CardTitle>
                <CardDescription>{t('launchpad.primaryMarketDesc')}</CardDescription>
              </div>
              <span className="text-[10px] text-indigo-400 font-mono bg-indigo-500/10 p-1 px-2.5 rounded border border-indigo-500/15">
                {t('launchpad.stakingSupported')}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-[#121620]/80 border-b border-[#21243C] text-gray-400 font-mono text-[10px] uppercase">
                    <th className="p-4 pl-5">{t('launchpad.projectLogoName')}</th>
                    <th className="p-4">{t('launchpad.tokenSymbol')}</th>
                    <th className="p-4">{t('launchpad.launchDate')}</th>
                    <th className="p-4">{t('launchpad.totalSupply')}</th>
                    <th className="p-4">{t('launchpad.initialPrice')}</th>
                    <th className="p-4">{t('launchpad.goalRaisedAmount')}</th>
                    <th className="p-4">{t('launchpad.status')}</th>
                    <th className="p-4 pr-5 text-right">{t('launchpad.action')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1D2136]/50">
                  {launchProjects.map((proj) => {
                    const statusColors: Record<string, string> = {
                      "upcoming": "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20",
                      "active": "bg-sky-500/10 text-sky-400 border border-sky-500/20 animate-pulse",
                      "success": "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20",
                      "listed": "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                    };

                    return (
                      <tr key={proj.id} className="hover:bg-[#181C2D]/30 transition group">
                        <td className="p-4 pl-5">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-[#22253D] flex items-center justify-center font-bold text-xs text-sky-400 shrink-0 select-none group-hover:scale-105 transition font-mono uppercase">
                              {proj.symbol.substring(0, 1)}
                            </div>
                            <div>
                              <span className="font-extrabold text-white block text-sm group-hover:text-[#8B83FF] transition">{proj.name}</span>
                              <span className="text-[10px] text-gray-500 block">Autonomously AI Robot</span>
                            </div>
                          </div>
                        </td>
                        <td className="p-4 font-mono font-black text-gray-300">${proj.symbol}</td>
                        <td className="p-4 text-gray-400 font-mono">{proj.launchDate}</td>
                        <td className="p-4 text-gray-300 font-mono">{(proj.totalSupply).toLocaleString()}</td>
                        <td className="p-4 text-[#FF9F1A] font-mono font-bold">{proj.initialPrice} TON</td>
                        <td className="p-4 text-gray-300 font-mono font-bold">{proj.raisedAmount} TON</td>
                        <td className="p-4">
                          <span className={`inline-flex items-center px-1.5 py-0.5 rounded font-mono font-bold text-[10px] ${statusColors[proj.status]}`}>
                            {getStatusLabel(proj.status)}
                          </span>
                        </td>
                        <td className="p-4 pr-5 text-right">
                          {proj.status === "active" ? (
                            <Button
                              onClick={() => openLaunchModal(proj)}
                              size="sm"
                              className="bg-[#635BFF] hover:bg-[#5048E5] text-white font-bold"
                            >
                              {t('launchpad.participateSwap')}
                            </Button>
                          ) : proj.status === "listed" ? (
                            <button
                              onClick={() => {
                                // switch to trading terminal
                                setSelectedTokenId(tokens.find(t => t.symbol === proj.symbol)?.id || tokens[0]?.id || '');
                                setActiveTab('trading');
                              }}
                              className="text-[#635BFF] font-bold text-xs hover:underline flex items-center gap-1 justify-end ml-auto group-hover:translate-x-0.5 transition cursor-pointer font-sans"
                            >
                              <span>{t('launchpad.secondaryTradingTerminal')}</span>
                              <ArrowRight size={12} />
                            </button>
                          ) : proj.status === "success" ? (
                            <button
                              onClick={() => {
                                const ok = listProjectOnAMM(proj.id);
                                if (ok) {
                                  setSuccessMsg(t('launchpad.liquidityDeploySuccess'));
                                  setTradeSuccess(true);
                                  // Automatically select the new token for trading
                                  const newToken = tokens.find(t => t.symbol === proj.symbol);
                                  if (newToken) {
                                    setSelectedTokenId(newToken.id);
                                  } else {
                                    setSelectedTokenId(`tok-${proj.symbol.toLowerCase()}`);
                                  }
                                  setTimeout(() => {
                                    setTradeSuccess(false);
                                    setSuccessMsg('');
                                  }, 8000);
                                }
                              }}
                              className="px-3 py-1.5 bg-[#10B981] hover:bg-[#059669] text-black font-extrabold text-xs rounded-lg active:scale-95 transition shadow-lg shadow-[#10B981]/20 inline-flex items-center gap-1 justify-end cursor-pointer"
                            >
                              <span>{t('launchpad.deployAmm')}</span>
                              <Rocket size={12} />
                            </button>
                          ) : (
                            <span className="text-gray-500 font-mono uppercase text-[10px]">{t('launchpad.upcomingRelease')}</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Guidelines info card */}
          <Card className="p-4 bg-indigo-950/20 border border-indigo-900/30 flex items-start gap-3">
            <Info className="text-[#8B83FF] shrink-0 mt-0.5" size={16} />
            <div className="text-xs text-gray-400 leading-normal">
              <span className="text-white font-bold block pb-0.5">{t('launchpad.guidelinesTitle')}</span>
              {t('launchpad.guideline1')}<br/>
              {t('launchpad.guideline2')}<br/>
              {t('launchpad.guideline3')}
            </div>
          </Card>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left column: Token list rail & Order Book */}
          <div className="lg:col-span-3 space-y-4">
            <div className="bg-[#0C0E1D] border border-[#1C203E] rounded-2xl p-4 space-y-3">
              <span className="text-[10px] text-gray-500 font-mono tracking-wider block px-1">AVAILABLE AGENT TOKENS</span>
              <div className="space-y-2">
                {tokens.map((tok) => {
                  const owned = inventory[tok.id] || 0;
                  const isUp = tok.priceChange24h >= 0;

                  return (
                    <button
                      key={tok.id}
                      onClick={() => {
                        setSelectedTokenId(tok.id);
                        setTradeSuccess(false);
                        setErrorMsg('');
                      }}
                      className={`w-full p-3 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between ${
                        selectedTokenId === tok.id
                          ? 'bg-[#1C1A3F] border-[#635BFF] shadow-lg'
                          : 'bg-[#121424] border-[#1C1E3C] hover:border-[#383C76]'
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-bold text-white">{tok.symbol}</span>
                          {owned > 0 && <span className="bg-[#1C2A20] text-emerald-400 text-[9px] px-1 rounded font-mono font-bold">HOLD</span>}
                        </div>
                        <span className="text-[10px] text-gray-500 block truncate">{tok.name}</span>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="text-xs font-bold font-mono text-gray-200 block">{tok.price} <span className="text-[9px] text-gray-500">TON</span></span>
                        <span className={`text-[10px] font-mono flex items-center justify-end gap-0.5 ${isUp ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {isUp ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                          {isUp ? '+' : ''}{tok.priceChange24h}%
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Simulated Live Order Book */}
            <div className="bg-[#0C0E1D] border border-[#1C203E] rounded-2xl p-4 space-y-3 text-left">
              <div className="flex items-center justify-between px-1">
                <span className="text-[10px] text-gray-500 font-mono tracking-wider">实时委托账本 (ORDER BOOK)</span>
                <span className="text-[9px] bg-emerald-500/10 text-emerald-400 px-1 py-0.5 rounded font-mono font-bold animate-pulse">● LIVE</span>
              </div>
              <div className="space-y-1 font-mono text-[10px]">
                {/* Asks (Sells) */}
                <div className="space-y-0.5">
                  {orderBook.ask.map((item, idx) => (
                    <div key={`ask-${idx}`} className="relative flex justify-between items-center py-0.5 px-1 hover:bg-rose-950/10 rounded">
                      <div className="absolute right-0 top-0 bottom-0 bg-rose-500/5 transition-all duration-300" style={{ width: `${Math.min(100, (item.amount / 1200) * 100)}%` }} />
                      <span className="text-rose-450 z-10">{item.price.toFixed(4)}</span>
                      <span className="text-gray-400 z-10">{item.amount}</span>
                      <span className="text-gray-500 text-[9px] z-10 w-12 text-right">{item.total.toLocaleString()}</span>
                    </div>
                  ))}
                </div>

                {/* Current Price Banner */}
                <div className="border-y border-[#1E2248] py-1.5 my-1.5 text-center flex justify-between px-2 bg-[#121424]/60">
                  <span className="text-xs font-black text-sky-400">{activeToken?.price} TON</span>
                  <span className="text-gray-500 text-[9px]">Spread: 0.0018 TON</span>
                </div>

                {/* Bids (Buys) */}
                <div className="space-y-0.5">
                  {orderBook.bid.map((item, idx) => (
                    <div key={`bid-${idx}`} className="relative flex justify-between items-center py-0.5 px-1 hover:bg-emerald-950/10 rounded">
                      <div className="absolute right-0 top-0 bottom-0 bg-emerald-500/5 transition-all duration-300" style={{ width: `${Math.min(100, (item.amount / 1500) * 100)}%` }} />
                      <span className="text-emerald-400 z-10">{item.price.toFixed(4)}</span>
                      <span className="text-gray-400 z-10">{item.amount}</span>
                      <span className="text-gray-500 text-[9px] z-10 w-12 text-right">{item.total.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Center Column: Area line chart & Project Details */}
          <div className="lg:col-span-6 space-y-6">
            <div className="bg-[#0E1020] border border-[#1E2248] rounded-2xl p-4 flex flex-col justify-between h-[450px]">
              <div>
                <div className="flex items-center justify-between border-b border-[#21254D] pb-3 mb-4">
                  <div className="flex items-center gap-2.5">
                    <span className="w-10 h-10 rounded-xl bg-[#1C1A3F] border border-[#635BFF]/35 flex items-center justify-center font-black text-sm text-[#877EFF] select-none">
                      {activeToken.symbol}
                    </span>
                    <div className="text-left">
                      <h3 className="text-sm font-black text-white tracking-tight">{activeToken.name} {t('launchpad.priceChartTitle')}</h3>
                      <span className="text-[10px] font-mono text-gray-500">AMM CONTINUOUS BONDING CURVE</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    {/* Timeframe Selector */}
                    <div className="flex bg-[#121429] p-0.5 rounded-lg border border-[#21254D]">
                      {(['1H', '4H', '24H', '7D', '1M'] as const).map((tf) => (
                        <button
                          key={tf}
                          onClick={() => setTimeframe(tf)}
                          className={`px-2 py-1 rounded text-[9px] font-bold font-mono transition-all cursor-pointer ${
                            timeframe === tf ? 'bg-[#635BFF] text-white' : 'text-gray-400 hover:text-white'
                          }`}
                        >
                          {tf}
                        </button>
                      ))}
                    </div>

                    <div className="text-right">
                      <span className="text-lg font-black font-mono text-sky-400">{activeToken.price} TON</span>
                      <p className="text-[10px] text-gray-400 font-mono mt-0.5">MCAP: {(activeToken.marketCap).toLocaleString()} TON</p>
                    </div>
                  </div>
                </div>

                {/* Recharts responsive component with dynamic chart data */}
                <div className="h-[280px] w-full mt-2 font-mono text-[10px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={getDynamicChartData()}>
                      <defs>
                        <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#635BFF" stopOpacity={0.4}/>
                          <stop offset="95%" stopColor="#635BFF" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1F2345" vertical={false} />
                      <XAxis dataKey="time" stroke="#4A5288" />
                      <YAxis domain={['auto', 'auto']} stroke="#4A5288" />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#0A0B18', borderColor: '#2E3260', color: '#fff' }}
                        labelClassName="text-gray-400 border-b border-gray-800 pb-1 mb-1 block"
                      />
                      <Area type="monotone" dataKey="price" stroke="#635BFF" strokeWidth={2} fillOpacity={1} fill="url(#colorPrice)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="flex justify-between items-center text-[10px] text-gray-500 border-t border-[#1C203E] pt-3 px-1 mt-2 font-mono">
                <span>24H VOL: {activeToken.volume24h.toLocaleString()} TON</span>
                <span>HOLDERS: {activeToken.holderCount} addresses</span>
              </div>
            </div>

            {/* Corresponding project方 details & perks */}
            {(() => {
              const matchedProj = projects.find(p => p.agentTicker.toLowerCase() === activeToken.symbol.toLowerCase());
              if (!matchedProj) return null;

              return (
                <Card className="p-5 border border-[#1E2248] space-y-4 text-left">
                  <div className="flex items-center justify-between border-b border-[#21254D] pb-3">
                    <div className="flex items-center gap-2">
                      <BookOpen size={16} className="text-[#8B83FF]" />
                      <h4 className="text-xs font-black text-white tracking-tight">PROJECT GENESIS DETAIL</h4>
                    </div>
                    <div className="flex items-center gap-2">
                      {matchedProj.websiteUrl && (
                        <a href={matchedProj.websiteUrl} target="_blank" rel="noopener noreferrer" className="text-[10px] text-gray-400 hover:text-white flex items-center gap-0.5">
                          <Globe size={11} /> Website
                        </a>
                      )}
                      {matchedProj.githubUrl && (
                        <a href={matchedProj.githubUrl} target="_blank" rel="noopener noreferrer" className="text-[10px] text-gray-400 hover:text-white flex items-center gap-0.5">
                          GitHub
                        </a>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                    <div className="space-y-2">
                      <div>
                        <span className="text-[10px] text-gray-500 font-mono block">{t('launchpad.projectBackground')}</span>
                        <p className="text-gray-300 leading-relaxed font-sans">{matchedProj.description}</p>
                      </div>
                      <div>
                        <span className="text-[10px] text-gray-500 font-mono block">{t('launchpad.creatorWallet')}</span>
                        <span className="text-gray-400 font-mono text-[10.5px] bg-[#121424] px-1.5 py-0.5 rounded border border-[#1E2248] truncate block w-fit">
                          {matchedProj.creatorAddress}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div>
                        <span className="text-[10px] text-gray-500 font-mono block">{t('launchpad.teamTechBackground')}</span>
                        <p className="text-gray-300 leading-relaxed font-sans">{matchedProj.teamDesc || t('launchpad.noBackgroundProvided')}</p>
                      </div>
                    </div>
                  </div>

                  {/* Perks card grid */}
                  {matchedProj.extraPerks && (
                    <div className="border-t border-[#21254D] pt-3 space-y-2">
                      <span className="text-[10px] text-amber-400 font-mono block tracking-wider uppercase font-bold flex items-center gap-1">
                        <Sparkles size={11} /> {t('launchpad.holderPerks')}
                      </span>
                      <div className="bg-[#1C172B]/30 border border-[#523B8A]/35 rounded-xl p-3 text-[11px] leading-relaxed text-purple-300">
                        {matchedProj.extraPerks}
                      </div>
                    </div>
                  )}
                </Card>
              );
            })()}
          </div>

          {/* Right column: Swap quick panel & Recent Trades */}
          <div className="lg:col-span-3 space-y-4">
            <div className="bg-[#0C0E1D] border border-slate-800/60 p-5 rounded-2xl space-y-4 shadow-2xl text-left relative">
              <div className="flex bg-[#121429] p-1 rounded-xl border border-slate-800 relative">
                <button
                  onClick={() => { setTradeType('buy'); setTradeSuccess(false); setErrorMsg(''); }}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
                    tradeType === 'buy' ? 'bg-[#635BFF] text-white' : 'text-gray-400 hover:text-white'
                  }`}
                >
                  {t('launchpad.buyTab')}
                </button>
                <button
                  onClick={() => { setTradeType('sell'); setTradeSuccess(false); setErrorMsg(''); }}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
                    tradeType === 'sell' ? 'bg-rose-600 text-white' : 'text-gray-400 hover:text-white'
                  }`}
                >
                  {t('launchpad.sellTab')}
                </button>

                {/* Slippage Setting Gear Icon */}
                <button
                  type="button"
                  onClick={() => setShowSlippageModal(!showSlippageModal)}
                  className="p-1.5 ml-1 rounded-lg bg-[#191D35]/50 border border-slate-800 hover:border-slate-700 text-gray-400 hover:text-white transition cursor-pointer"
                  title={t('launchpad.tradingSettings')}
                >
                  <Settings size={13} />
                </button>

                {/* Slippage Settings Overlay Modal */}
                {showSlippageModal && (
                  <div className="absolute right-0 top-12 z-20 w-48 bg-[#0D0E1C] border border-[#2E335C] rounded-xl p-3 shadow-2xl text-left space-y-3 font-sans animate-in fade-in duration-100 animate-out fade-out">
                    <span className="text-[10px] text-gray-400 font-bold block">{t('launchpad.slippageTolerance')}</span>
                    <div className="grid grid-cols-3 gap-1">
                      {[0.5, 1.0, 3.0].map((val) => (
                        <button
                          key={val}
                          onClick={() => { setSlippage(val); setCustomSlippage(''); }}
                          className={`py-1 rounded text-[10px] font-mono font-bold border transition ${
                            slippage === val && !customSlippage ? 'bg-[#635BFF] text-white border-[#635BFF]' : 'bg-[#121424] text-gray-400 border-slate-800 hover:border-slate-700'
                          }`}
                        >
                          {val}%
                        </button>
                      ))}
                    </div>
                    <div className="space-y-1">
                      <span className="text-[9px] text-gray-500 block">{t('launchpad.customSlippage')}</span>
                      <div className="relative flex items-center">
                        <input
                          type="number"
                          value={customSlippage}
                          placeholder={t('launchpad.custom')}
                          onChange={(e) => {
                            setCustomSlippage(e.target.value);
                            const val = parseFloat(e.target.value);
                            if (!isNaN(val) && val > 0) setSlippage(val);
                          }}
                          className="w-full bg-[#121424] border border-slate-800 rounded px-2 py-1 text-[10px] font-mono text-white outline-none"
                        />
                        <span className="absolute right-2 text-[9px] text-gray-500 font-mono">%</span>
                      </div>
                    </div>
                    <Button size="sm" className="w-full text-[9px] py-1" onClick={() => setShowSlippageModal(false)}>
                      {t('launchpad.saveSettings')}
                    </Button>
                  </div>
                )}
              </div>

              {tradeSuccess ? (
                <div className="p-4 bg-emerald-950/25 border border-emerald-900/40 rounded-xl space-y-4 text-center animate-in zoom-in-95 leading-normal">
                  <CheckCircle2 size={32} className="text-emerald-450 mx-auto animate-bounce" />
                  <div>
                    <h4 className="text-xs font-black text-white">{t('launchpad.tradeSuccess')}</h4>
                    <p className="text-[10px] text-gray-400 mt-1 leading-relaxed">{successMsg}</p>
                  </div>
                  <Button onClick={() => setTradeSuccess(false)} size="sm" className="w-full">
                    {t('launchpad.swapAgain')}
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleTrade} className="space-y-4">
                  <div className="space-y-1.5">
                    <span className="text-[10px] text-gray-500 font-mono tracking-wider block">
                      {tradeType === 'buy' ? t('launchpad.paymentNumberTon') : `${t('launchpad.sellAmount')} (${activeToken.symbol})`}
                    </span>
                    <div className="relative">
                      <input
                        type="number"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        className="w-full bg-[#121429] border border-slate-800 focus:border-[#635BFF] text-white font-mono text-xs rounded-xl px-3.5 py-2.5 outline-none transition"
                      />
                      <span className="absolute right-3.5 top-3 text-[10px] text-gray-400 font-mono font-bold">
                        {tradeType === 'buy' ? 'TON' : activeToken.symbol}
                      </span>
                    </div>

                    <div className="flex justify-between items-center text-[10.5px] text-gray-500 font-mono">
                      <span>
                        {tradeType === 'buy' ? t('launchpad.estimatedReceive') : t('launchpad.estimatedReceiveTon')}
                        <span className="text-white font-semibold">
                          {tradeType === 'buy'
                            ? Number((Number(amount) / activeToken.price).toFixed(2))
                            : Number((Number(amount) * activeToken.price).toFixed(2))}
                        </span>
                      </span>
                      {isConnected && (
                        <span>
                          {t('launchpad.available')} {tradeType === 'buy' ? `${profile?.balanceTON} TON` : `${activeOwnedBalance} ${activeToken.symbol}`}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Enhanced Slippage / Fee details */}
                  <div className="bg-[#121424]/80 p-2.5 rounded-xl border border-[#1C203E] space-y-1.5 text-[9.5px] font-mono text-gray-400">
                    <div className="flex justify-between">
                      <span>{t('launchpad.currentSlippage')}</span>
                      <span className="text-white">{slippage}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span>{t('launchpad.priceImpact')}</span>
                      <span className={`${Number(amount) > 2000 ? 'text-amber-400 font-bold' : 'text-emerald-400'}`}>
                        {Math.min(99.9, (Number(amount) / (activeToken.volume24h || 100000) * 100)).toFixed(2)}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>{t('launchpad.minimumReceived')}</span>
                      <span className="text-white font-bold">
                        {tradeType === 'buy'
                          ? (Number((Number(amount) / activeToken.price) * (1 - slippage/100)).toFixed(2))
                          : (Number((Number(amount) * activeToken.price) * (1 - slippage/100)).toFixed(2))}{' '}
                        {tradeType === 'buy' ? activeToken.symbol : 'TON'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>{t('launchpad.lpFee')}</span>
                      <span className="text-white">{(Number(amount) * 0.0025).toFixed(3)} TON</span>
                    </div>
                  </div>

                  {errorMsg && (
                    <div className="p-2.5 bg-rose-950/25 border border-rose-900/40 text-rose-300 rounded-lg text-[10px] leading-relaxed">
                      ⚠️ {errorMsg}
                    </div>
                  )}

                  <Button type="submit" variant={tradeType === 'buy' ? 'primary' : 'danger'} className="w-full">
                    SWAP {tradeType === 'buy' ? 'BUY' : 'SELL'}
                  </Button>
                </form>
              )}

              <div className="pt-3 border-t border-[#1C1F3D] text-[10px] text-gray-500 leading-normal space-y-1.5">
                <span className="font-extrabold text-gray-400 block pb-0.5">{t('launchpad.bondingCurveMechanism')}</span>
                <span>{t('launchpad.bondingCurveDesc')}</span>
              </div>
            </div>

            {/* Simulated Live Recent Trades Feed */}
            <div className="bg-[#0C0E1D] border border-slate-800/60 p-4 rounded-2xl space-y-3 text-left">
              <div className="flex items-center justify-between border-b border-[#21254D] pb-2">
                <span className="text-[10px] text-gray-500 font-mono tracking-wider flex items-center gap-1">
                  <History size={12} className="text-[#8B83FF]" /> {t('launchpad.recentTradesHistory')}
                </span>
              </div>
              <div className="space-y-1.5 font-mono text-[9.5px] max-h-[180px] overflow-y-auto pr-1">
                {recentTrades.map((tTrade) => (
                  <div key={tTrade.id} className="flex justify-between items-center py-1 border-b border-[#1C1F3D]/30 last:border-b-0 hover:bg-[#121424]/40 px-1 rounded transition duration-150">
                    <span className={`w-8 font-bold ${tTrade.type === 'buy' ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {tTrade.type === 'buy' ? 'BUY' : 'SELL'}
                    </span>
                    <span className="text-gray-300">{tTrade.amount.toLocaleString()} {activeToken.symbol}</span>
                    <span className="text-sky-400 font-bold">{tTrade.price.toFixed(4)} TON</span>
                    <span className="text-gray-500 text-[8.5px] w-12 text-right">{tTrade.time}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ──────────────────────────────────────────────────────── */}
      {/* STON.fi AMM Router Status + Backers Yield Showcase      */}
      {/* ──────────────────────────────────────────────────────── */}
      <div className="space-y-6">
        {/* STON.fi DEX Status Panel */}
        <Card className="p-5 border border-[#21243C] relative overflow-hidden">
          <div className="absolute top-0 right-0 w-40 h-40 bg-[#635BFF]/5 rounded-full blur-3xl pointer-events-none" />
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <ShieldCheck size={16} className="text-emerald-400" />
                <span className="text-xs font-black text-white uppercase tracking-tight">{t('launchpad.dexRouterEngine')}</span>
              </div>
              <p className="text-[10.5px] text-gray-400 leading-relaxed max-w-md">
                {t('launchpad.dexRouterDesc')}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 bg-emerald-500/10 px-3 py-1.5 rounded-lg border border-emerald-500/20">
                <span className="relative flex h-2 w-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span><span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span></span>
                <span className="text-[10px] font-mono font-bold text-emerald-400">{t('launchpad.dexContractActive')}</span>
              </div>
              <div className="text-right hidden sm:block">
                <span className="text-[10px] text-gray-500 block font-mono">Total TVL</span>
                <span className="text-sm font-black font-mono text-white">812,000 <span className="text-[9px] text-gray-400">TON</span></span>
              </div>
            </div>
          </div>
        </Card>

        {/* ★ 星火首发成员收益光荣榜 (Spark Backers Yield Showcase) */}
        {(() => {
          // Build listed projects with backers for the showcase
          const listedWithBackers = projects
            .filter(p => (p.status === 'listed' || p.status === 'success') && p.backers && p.backers.length > 0);

          if (listedWithBackers.length === 0) return null;

          return (
            <Card className="p-0 overflow-hidden border border-[#21243C]">
              <div className="p-5 border-b border-[#21243C] bg-gradient-to-r from-[#0C0E1D] to-[#120E22]">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-black text-white flex items-center gap-2 tracking-tight">
                      <Sparkles size={16} className="text-amber-400 animate-pulse" />
                      <span>{t('launchpad.sparkBackersYieldShowcase')}</span>
                      <span className="text-[9px] font-mono text-gray-500 font-normal">{t('launchpad.sparkBackersYieldShowcaseSub')}</span>
                    </h3>
                    <p className="text-[10.5px] text-gray-500 mt-1">
                      {t('launchpad.sparkBackersYieldDesc')}
                    </p>
                  </div>
                  <span className="text-[9px] text-[#FF9F1A] font-mono bg-amber-500/10 p-1 px-2.5 rounded border border-amber-500/15 font-bold hidden sm:block">
                    🏆 LIVE ROI TRACKING
                  </span>
                </div>
              </div>

              <div className="divide-y divide-[#1D2136]/50">
                {listedWithBackers.map(proj => {
                  const matchedToken = tokens.find(t => t.symbol.toLowerCase() === proj.agentTicker.toLowerCase());
                  const currentPrice = matchedToken?.price || proj.tokenPrice * 1.5;
                  const launchPrice = proj.tokenPrice;
                  const priceGrowth = ((currentPrice - launchPrice) / launchPrice * 100).toFixed(1);

                  return (
                    <div key={proj.id} className="p-5 space-y-4">
                      {/* Project header row */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#635BFF] to-sky-400 p-0.5 shadow-md shrink-0">
                            <div className="w-full h-full bg-[#080913] rounded-[9px] flex items-center justify-center font-bold text-xs text-[#8B83FF] font-mono">
                              {proj.agentTicker.substring(0, 2)}
                            </div>
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-sm font-bold text-white">{proj.agentName}</span>
                              <span className="text-[10px] bg-[#635BFF]/10 text-[#8B83FF] px-1.5 rounded font-mono font-bold">${proj.agentTicker}</span>
                            </div>
                            <div className="flex items-center gap-2 text-[10px] text-gray-500 font-mono mt-0.5">
                              <span>{t('launchpad.initialPrice')} {launchPrice} TON</span>
                              <span>→</span>
                              <span className="text-emerald-400 font-bold">{t('launchpad.currentValue')} {currentPrice} TON</span>
                              <span className={`font-bold ${Number(priceGrowth) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>({Number(priceGrowth) >= 0 ? '+' : ''}{priceGrowth}%)</span>
                            </div>
                          </div>
                        </div>
                        <div className="text-right hidden sm:block">
                          <span className="text-[9px] text-gray-500 block font-mono uppercase">{t('launchpad.exchangeRatio')}</span>
                          <span className="text-xs font-bold text-white font-mono">1 TON = {Math.round(1 / launchPrice).toLocaleString()} {proj.agentTicker}</span>
                        </div>
                      </div>

                      {/* Backers yield table */}
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse text-[10.5px]">
                          <thead>
                            <tr className="bg-[#121620]/80 border-b border-[#21243C] text-gray-400 font-mono text-[9px] uppercase">
                              <th className="p-2.5 pl-3">{t('launchpad.backerWallet')}</th>
                              <th className="p-2.5">{t('launchpad.subscribedAmount')}</th>
                              <th className="p-2.5">{t('launchpad.tokensReceived')}</th>
                              <th className="p-2.5">{t('launchpad.currentWorth')}</th>
                              <th className="p-2.5">{t('launchpad.netProfitTon')}</th>
                              <th className="p-2.5 pr-3 text-right">ROI</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#1D2136]/30">
                            {proj.backers.map((backer, bIdx) => {
                              const cost = backer.amount;
                              const tokensReceived = cost / launchPrice;
                              const currentValue = tokensReceived * currentPrice;
                              const profit = currentValue - cost;
                              const roi = ((profit / cost) * 100).toFixed(1);
                              const isPositive = profit >= 0;
                              const shortAddr = backer.address.length > 12
                                ? `${backer.address.substring(0, 6)}...${backer.address.substring(backer.address.length - 4)}`
                                : backer.address;

                              return (
                                <tr key={bIdx} className="hover:bg-[#181C2D]/30 transition">
                                  <td className="p-2.5 pl-3 font-mono text-gray-300">
                                    <span className="bg-[#1C1F3D] px-1.5 py-0.5 rounded text-[9.5px]">{shortAddr}</span>
                                  </td>
                                  <td className="p-2.5 font-mono text-gray-300 font-bold">{cost.toFixed(1)} TON</td>
                                  <td className="p-2.5 font-mono text-gray-300">{tokensReceived.toFixed(0)} {proj.agentTicker}</td>
                                  <td className="p-2.5 font-mono text-white font-bold">{currentValue.toFixed(1)} TON</td>
                                  <td className={`p-2.5 font-mono font-extrabold ${isPositive ? 'text-emerald-450' : 'text-rose-450'}`}>
                                    {isPositive ? '+' : ''}{profit.toFixed(1)} TON
                                  </td>
                                  <td className={`p-2.5 pr-3 text-right font-mono font-extrabold ${isPositive ? 'text-emerald-450' : 'text-rose-455'}`}>
                                    {isPositive ? '+' : ''}{roi}%
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>

                      {/* Summary stats row */}
                      <div className="flex flex-wrap gap-4 text-[10px] font-mono border-t border-[#1C1F3D] pt-3">
                        <div>
                          <span className="text-gray-500 block">{t('launchpad.totalEntered')}</span>
                          <span className="text-white font-bold">{proj.backers.reduce((s, b) => s + b.amount, 0).toFixed(1)} TON</span>
                        </div>
                        <div>
                          <span className="text-gray-500 block">{t('launchpad.totalWorth')}</span>
                          <span className="text-emerald-400 font-bold">
                            {proj.backers.reduce((s, b) => s + (b.amount / launchPrice) * currentPrice, 0).toFixed(1)} TON
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-500 block">{t('launchpad.totalProfit')}</span>
                          <span className="text-emerald-400 font-extrabold">
                            +{(proj.backers.reduce((s, b) => s + (b.amount / launchPrice) * currentPrice, 0) - proj.backers.reduce((s, b) => s + b.amount, 0)).toFixed(1)} TON
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-500 block">{t('launchpad.avgRoi')}</span>
                          <span className="text-emerald-400 font-extrabold">+{priceGrowth}%</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          );
        })()}

        {/* Current user's holding ROI (if connected) */}
        {isConnected && profile && (() => {
          const myBackedProjects = projects.filter(p =>
            (p.status === 'listed' || p.status === 'success') &&
            p.backers?.some(b => b.address === profile.walletAddress)
          );
          if (myBackedProjects.length === 0) return null;

          return (
            <Card className="p-5 border border-[#635BFF]/25 bg-gradient-to-tr from-[#0C0E1D] to-[#1A152E] relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-[#635BFF]/10 rounded-full blur-3xl pointer-events-none" />
              <h4 className="text-xs font-black text-white flex items-center gap-2 mb-4">
                <Wallet size={14} className="text-[#8B83FF]" />
                <span>{t('launchpad.mySparkReturns')}</span>
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {myBackedProjects.map(proj => {
                  const matchedToken = tokens.find(t => t.symbol.toLowerCase() === proj.agentTicker.toLowerCase());
                  const currentPrice = matchedToken?.price || proj.tokenPrice * 1.5;
                  const myBacker = proj.backers.find(b => b.address === profile.walletAddress);
                  if (!myBacker) return null;
                  const cost = myBacker.amount;
                  const tokensHeld = cost / proj.tokenPrice;
                  const currentValue = tokensHeld * currentPrice;
                  const profit = currentValue - cost;
                  const roi = ((profit / cost) * 100).toFixed(1);

                  return (
                    <div key={proj.id} className="bg-[#0A0B14]/50 border border-[#1E234D] rounded-xl p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-white">{proj.agentName} <span className="text-[#8B83FF] font-mono">${proj.agentTicker}</span></span>
                        <span className={`text-xs font-mono font-extrabold ${profit >= 0 ? 'text-emerald-400' : 'text-rose-450'}`}>{profit >= 0 ? '+' : ''}{roi}%</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
                        <div><span className="text-gray-500 block">{t('launchpad.invested')}</span><span className="text-gray-300 font-bold">{cost.toFixed(1)} TON</span></div>
                        <div><span className="text-gray-500 block">{t('launchpad.currentValue')}</span><span className={`font-bold ${profit >= 0 ? 'text-emerald-400' : 'text-rose-450'}`}>{currentValue.toFixed(1)} TON</span></div>
                        <div><span className="text-gray-500 block">{t('launchpad.tokensHeld')}</span><span className="text-gray-300">{tokensHeld.toFixed(0)} {proj.agentTicker}</span></div>
                        <div><span className="text-gray-500 block">{t('launchpad.netProfit')}</span><span className={`font-extrabold ${profit >= 0 ? 'text-emerald-400' : 'text-rose-450'}`}>{profit >= 0 ? '+' : ''}{profit.toFixed(1)} TON</span></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          );
        })()}
      </div>

      {/* LAUNCHPAD PARTICIPATE MODAL POPUP */}
      {isModalOpen && selectedLaunchProj && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto bg-black/85 backdrop-blur-sm">
          <div className="relative w-full max-w-lg bg-[#121620] border border-[#22253B] rounded-2xl shadow-2xl p-6 text-left transform transition-all animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-[#21253E] pb-3 mb-4">
              <div className="flex items-center gap-2">
                <Rocket className="text-[#635BFF]" size={16} />
                <h3 className="text-sm font-black text-white tracking-tight">{t('launchpad.participateModalTitle', { symbol: selectedLaunchProj.symbol })}</h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-gray-500 hover:text-white hover:bg-[#1E2235] transition"
              >
                &times;
              </button>
            </div>

            {launchStep === 'input' && (
              <div className="space-y-4">
                <p className="text-[11px] text-gray-400 leading-relaxed">
                  {t('launchpad.participateModalDesc', { symbol: selectedLaunchProj.symbol, ratio: Math.floor(1 / selectedLaunchProj.initialPrice) })}
                </p>

                {/* Requirements check banner */}
                <div className="p-3 rounded-xl border flex items-center justify-between text-xs font-mono bg-[#1C1A3F]/30 border-[#635BFF]/35">
                  <div className="flex items-center gap-2">
                    <UserCheck className="text-emerald-450 shrink-0" size={14} />
                    <div>
                      <span className="text-gray-400 block text-[10px]">{t('launchpad.stakingRequirement')}</span>
                      <span className="text-white font-bold font-sans">{t('launchpad.stakingRequirementDesc')}</span>
                    </div>
                  </div>
                  <div>
                    {isConnected && (profile?.balanceVC || 0) >= 100 ? (
                      <Badge variant="success">已符合 (ELIGIBLE)</Badge>
                    ) : (
                      <Badge variant="danger">额度不足 (NOT ELIGIBLE)</Badge>
                    )}
                  </div>
                </div>

                {/* Tokenomics Recharts distribution visualizer */}
                <div className="space-y-1.5 text-left">
                  <span className="text-[10px] text-gray-500 font-mono block uppercase">{t('launchpad.tokenomicsDistribution')}</span>
                  <div className="flex flex-col sm:flex-row gap-4 items-center bg-[#07080F]/50 p-2 text-[10px] rounded-xl border border-slate-900">
                    <div className="w-24 h-24 shrink-0 relative flex items-center justify-center">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={selectedLaunchProj.tokenomics}
                            cx="50%"
                            cy="50%"
                            innerRadius={28}
                            outerRadius={38}
                            paddingAngle={2}
                            dataKey="value"
                          >
                            {selectedLaunchProj.tokenomics.map((entry: any, index: number) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                        </PieChart>
                      </ResponsiveContainer>
                      <span className="absolute font-mono font-black text-center text-[10px] text-white">4-PART</span>
                    </div>
                    <div className="flex-1 grid grid-cols-2 gap-1.5 w-full">
                      {selectedLaunchProj.tokenomics.map((entry: any, idx: number) => (
                        <div key={idx} className="flex gap-1 items-start text-[9px] text-gray-400">
                          <span className="w-1.5 h-1.5 rounded-full mt-1 shrink-0" style={{ backgroundColor: entry.color }} />
                          <span className="leading-tight shrink-0">{getTokenomicsName(entry.name)} ({entry.value}%)</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Unlock Vesting timeline */}
                <div className="space-y-1 text-left">
                  <span className="text-[10px] text-gray-500 font-mono block">{t('launchpad.vestingSchedule')}</span>
                  <div className="p-2.5 bg-[#121424] rounded-xl border border-slate-800 text-[10px] font-medium text-gray-300 leading-normal flex items-start gap-1.5">
                    <Calendar size={13} className="text-[#8B83FF] mt-0.5 shrink-0" />
                    <span>{getVestingText(selectedLaunchProj.vesting)}</span>
                  </div>
                </div>

                {/* Exchange input */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] text-gray-550 font-mono">{t('launchpad.exchangeAmountLabel')}</span>
                    <span className="text-[10px] text-gray-400 font-mono">{t('launchpad.exchangeAvailableBalance', { balance: profile?.balanceVC })}</span>
                  </div>
                  <div className="relative">
                    <input
                      type="number"
                      value={exchangeAmount}
                      onChange={(e) => setExchangeAmount(e.target.value)}
                      className="w-full bg-[#121429] border border-slate-800 focus:border-[#635BFF] text-white font-mono text-xs rounded-xl px-3.5 py-2.5 outline-none transition"
                    />
                    <span className="absolute right-3.5 top-3 text-[10px] text-gray-400 font-mono">VC</span>
                  </div>

                  <div className="flex justify-between items-center text-[10px] text-gray-550 font-mono pt-0.5">
                    <span>
                      {t('launchpad.expectedTokens')}
                      <span className="text-emerald-450 font-extrabold text-xs">
                        {selectedLaunchProj ? (Number(exchangeAmount) / selectedLaunchProj.initialPrice).toFixed(1) : 0} ${selectedLaunchProj.symbol}
                      </span>
                    </span>
                    <span className="text-[#FF9F1A]">{t('launchpad.networkFee')}</span>
                  </div>
                </div>

                {errorMsg && (
                  <div className="p-2.5 bg-rose-950/25 border border-rose-900/40 text-rose-300 rounded-lg text-[10px] leading-relaxed">
                    ⚠️ {errorMsg}
                  </div>
                )}

                <div className="pt-2 border-t border-[#1C1F3D] flex justify-end gap-2.5">
                  <button
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 bg-transparent text-gray-400 hover:text-white text-xs font-bold rounded-xl transition"
                  >
                    {t('launchpad.cancel')}
                  </button>
                  <Button
                    onClick={handleLaunchpadExchange}
                    className="bg-emerald-500 hover:bg-emerald-600 text-[#07080E] font-extrabold"
                  >
                    {t('launchpad.confirmLockSwap')}
                  </Button>
                </div>
              </div>
            )}

            {launchStep === 'processing' && (
              <div className="py-12 text-center space-y-4">
                <RefreshCw className="text-[#635BFF] mx-auto animate-spin" size={32} />
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">{t('launchpad.broadcastingTx')}</h4>
                <p className="text-[10px] text-gray-400 max-w-xs mx-auto leading-relaxed">
                  {t('launchpad.approveInWallet')}
                </p>
              </div>
            )}

            {launchStep === 'success' && (
              <div className="text-center py-6 space-y-4 animate-in zoom-in-95">
                <CheckCircle2 size={40} className="text-emerald-400 mx-auto animate-bounce" />
                <h4 className="text-sm font-black text-white">{t('launchpad.swapSuccessTitle')}</h4>

                <div className="p-3 bg-[#07080F]/85 rounded-xl border border-slate-900 text-left space-y-2 font-mono text-[10.5px]">
                  <div className="flex justify-between">
                    <span className="text-gray-500">{t('launchpad.txHashLabel')}</span>
                    <span className="text-amber-450 truncate max-w-[200px]" title={txHash}>{txHash}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">{t('launchpad.spentVc')}</span>
                    <span className="text-white font-bold">-{exchangeAmount} VC</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">{t('launchpad.gasFeeTon')}</span>
                    <span className="text-white font-bold">-1 TON</span>
                  </div>
                  <div className="flex justify-between border-t border-slate-900 pt-1.5 mt-1">
                    <span className="text-gray-500 font-sans font-bold">{t('launchpad.allocatedTokens')}</span>
                    <span className="text-emerald-450 font-extrabold text-sm font-sans">
                      +{(Number(exchangeAmount) / selectedLaunchProj.initialPrice).toFixed(1)} ${selectedLaunchProj.symbol}
                    </span>
                  </div>
                </div>

                <p className="text-[10.5px] text-gray-400 leading-normal max-w-sm mx-auto">
                  {t('launchpad.successLockboxDesc')}
                </p>

                <Button onClick={() => setIsModalOpen(false)} className="w-full">
                  {t('launchpad.closeCabin')}
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
