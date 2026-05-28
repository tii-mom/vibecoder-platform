import React, { useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell } from 'recharts';
import { 
  Coins, Flame, DollarSign, ArrowDownUp, TrendingUp, TrendingDown, 
  RefreshCw, Layers, ShieldCheck, CheckCircle2, Rocket, Info, 
  Sparkles, Calendar, ArrowRight, UserCheck, Wallet, AlertTriangle 
} from 'lucide-react';
import { useUserStore } from '../store/userStore';
import { useSparkStore } from '../store/sparkStore';
import { Button } from '../components/ui/Button';
import { Card, CardHeader, CardTitle, CardDescription } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { ProgressBar } from '../components/ui/ProgressBar';

export default function LaunchpadPage() {
  const { isConnected, profile, connectWallet, updateProfile } = useUserStore();
  const { tokens, buyToken, sellToken, projects, listProjectOnAMM } = useSparkStore();

  const [activeTab, setActiveTab] = useState<'launchpad' | 'trading'>('launchpad');
  
  // TRADING TERMINAL STATE
  const [selectedTokenId, setSelectedTokenId] = useState<string>(tokens[0]?.id || '');
  const [tradeType, setTradeType] = useState<'buy' | 'sell'>('buy');
  const [amount, setAmount] = useState<string>('10');
  const [tradeSuccess, setTradeSuccess] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const activeToken = tokens.find(t => t.id === selectedTokenId) || tokens[0];

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
      setErrorMsg('请输入有效的交易数额');
      return;
    }

    if (tradeType === 'buy') {
      if (profile.balanceTON < tradeVal) {
        setErrorMsg(`账户 TON 余额不足，当前可支配余额 ${profile.balanceTON} TON。您可以一键重置钱包或在“我的持仓”领取测试币。`);
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

        setSuccessMsg(`买入交易广播成功！消耗 ${tradeVal} TON，兑购到约 ${boughtTokens} ${activeToken.symbol}`);
        setTradeSuccess(true);
      }
    } else {
      if (activeOwnedBalance < tradeVal) {
        setErrorMsg(`未持有足够的代币 ${activeToken.symbol} 卖出。当前可用余额: ${activeOwnedBalance}`);
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

        setSuccessMsg(`卖出交易广播成功！售出 ${tradeVal} ${activeToken.symbol}，赎回约 ${receivedTON} TON`);
        setTradeSuccess(true);
      }
    }
    setAmount('10');
  };

  // Launchpad Project items derived dynamically from store projects
  const launchProjects = projects.map(proj => {
    let statusStr: '即将' | '进行中' | '已募完' | '已上市' = '进行中';
    if (proj.status === 'active') {
      statusStr = '进行中';
    } else if (proj.status === 'success') {
      statusStr = '已募完';
    } else if (proj.status === 'listed') {
      statusStr = '已上市';
    } else if (proj.status === 'failed') {
      statusStr = '即将';
    }

    const tokenomics = proj.tokenomics || [
      { name: "星火认配 Community Share", value: 50, color: "#635BFF" },
      { name: "开发者质押 Builder Reserves", value: 25, color: "#10B981" },
      { name: "AMM流动底仓 Liquidity Pool", value: 25, color: "#06B6D4" }
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
      setErrorMsg("⚠️ 参与一级 Launchpad 发售需持有 ≥ 100 $VC 代码质押证明！您当前只有 " + profile.balanceVC + " $VC。请在设置或 Studio 完成新发布获取更多 $VC 代金券。");
      return;
    }

    const swapVC = Number(exchangeAmount);
    if (isNaN(swapVC) || swapVC <= 0) {
      setErrorMsg("请输入有效的兑换数量");
      return;
    }

    if (profile.balanceVC < swapVC) {
      setErrorMsg(`您要求兑换 ${swapVC} $VC，但当前只有 ${profile.balanceVC} $VC。`);
      return;
    }

    setLaunchStep('processing');
    setErrorMsg('');

    // Simulate blockchain delay
    setTimeout(() => {
      // Create random simulated TON block transaction hash
      const hash = '0x' + Array.from({length: 32}, () => Math.floor(Math.random()*16).toString(16)).join('');
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
            <span>Launchpad 代币发行终端</span>
          </h1>
          <p className="text-xs text-gray-400 mt-1">
            审核星火共建成功的 AI Agents 一级代币发售、分配比例及二级自动联合报价曲线。
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
            <span>一级发行市场 (Primary Market)</span>
          </button>
          <button
            onClick={() => setActiveTab('trading')}
            className={`flex items-center gap-1.5 px-4 py-1.5 text-xs font-black rounded-lg transition-all cursor-pointer ${
              activeTab === 'trading' ? 'bg-[#635BFF] text-white shadow-lg' : 'text-gray-400 hover:text-white'
            }`}
          >
            <ArrowDownUp size={12} />
            <span>二级交易终端 (AMM Exchange)</span>
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
                <h3 className="text-xl sm:text-2xl font-black font-mono text-white">4 个自治代币</h3>
                <span className="text-[10px] text-[#A69FFF] font-medium block">已累计配股完成一轮全网交割</span>
              </div>
              <Rocket size={32} className="text-[#635BFF]/20 group-hover:scale-105 transition duration-300" />
            </Card>

            <Card className="flex items-center justify-between p-5 relative overflow-hidden group">
              <div className="space-y-1">
                <span className="text-[10px] text-gray-500 font-mono tracking-wider block">TOTAL EST. MARKETCAP</span>
                <h3 className="text-xl sm:text-2xl font-black font-mono text-emerald-400">812,000 TON</h3>
                <span className="text-[10px] text-gray-400 font-medium block">≈ $5,278,000 USD 综合市值</span>
              </div>
              <DollarSign size={32} className="text-emerald-500/20 group-hover:scale-105 transition duration-300" />
            </Card>

            <Card className="flex items-center justify-between p-5 relative overflow-hidden group">
              <div className="space-y-1">
                <span className="text-[10px] text-gray-500 font-mono tracking-wider block">GLOBAL DEFI HOLDERS</span>
                <h3 className="text-xl sm:text-2xl font-black font-mono text-sky-400">1,240 地址数</h3>
                <span className="text-[10px] text-gray-400 font-medium block">全流派智能合约保险签存人数</span>
              </div>
              <Layers size={32} className="text-sky-400/20 group-hover:scale-105 transition duration-300" />
            </Card>
          </div>

          {/* Listing Success banner */}
          {tradeSuccess && successMsg && (
            <div className="p-5 bg-emerald-950/20 border border-emerald-500/35 rounded-2xl text-emerald-400 text-xs font-bold leading-normal flex items-start gap-3.5 animate-in slide-in-from-top duration-300">
              <CheckCircle2 size={18} className="shrink-0 mt-0.5 text-emerald-400" />
              <div>
                <p className="font-extrabold text-[#10B981] text-base">智能合约一键流动性部署成功！</p>
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
                  立即进入二级 AMM 交易终端 (Trading Terminal)
                </button>
              </div>
            </div>
          )}

          {/* Launchpad project rows table */}
          <Card className="p-0 overflow-hidden border border-[#21243C]">
            <div className="p-4 px-5 border-b border-[#21243C] flex items-center justify-between">
              <div>
                <CardTitle>一级代币发售上市大盘</CardTitle>
                <CardDescription>持有 $VC 代金合约证书，即可在 1 TON 的极低网络成本下换购具有多签托管保障的创世代币份额</CardDescription>
              </div>
              <span className="text-[10px] text-indigo-400 font-mono bg-indigo-500/10 p-1 px-2.5 rounded border border-indigo-500/15">
                🔥 质押机制支持中
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-[#121620]/80 border-b border-[#21243C] text-gray-400 font-mono text-[10px] uppercase">
                    <th className="p-4 pl-5">项目 Logo + 名称</th>
                    <th className="p-4">代币符号</th>
                    <th className="p-4">发行日期</th>
                    <th className="p-4">总供应量</th>
                    <th className="p-4">初始价格</th>
                    <th className="p-4">共建额度</th>
                    <th className="p-4">状态</th>
                    <th className="p-4 pr-5 text-right">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1D2136]/50">
                  {launchProjects.map((proj) => {
                    const statusColors = {
                      "即将": "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20",
                      "进行中": "bg-sky-500/10 text-sky-400 border border-sky-500/20 animate-pulse",
                      "已募完": "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20",
                      "已上市": "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
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
                            {proj.status}
                          </span>
                        </td>
                        <td className="p-4 pr-5 text-right">
                          {proj.status === "进行中" ? (
                            <Button 
                              onClick={() => openLaunchModal(proj)}
                              size="sm"
                              className="bg-[#635BFF] hover:bg-[#5048E5] text-white font-bold"
                            >
                              参与兑购 (Swap)
                            </Button>
                          ) : proj.status === "已上市" ? (
                            <button 
                              onClick={() => {
                                // switch to trading terminal
                                setSelectedTokenId(tokens.find(t => t.symbol === proj.symbol)?.id || tokens[0]?.id || '');
                                setActiveTab('trading');
                              }}
                              className="text-[#635BFF] font-bold text-xs hover:underline flex items-center gap-1 justify-end ml-auto group-hover:translate-x-0.5 transition cursor-pointer font-sans"
                            >
                              <span>二级自由交易 Terminal</span>
                              <ArrowRight size={12} />
                            </button>
                          ) : proj.status === "已募完" ? (
                            <button
                              onClick={() => {
                                const ok = listProjectOnAMM(proj.id);
                                if (ok) {
                                  setSuccessMsg(`✨ 代币 “${proj.name} ($${proj.symbol})” 一键锁筹 AMM 部署上市成功！初始流动底仓及报价曲线已实时激活，前往 AMM 终端可以即刻自由交易。`);
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
                              <span>一键 AMM 上市</span>
                              <Rocket size={12} />
                            </button>
                          ) : (
                            <span className="text-gray-500 font-mono uppercase text-[10px]">即将开放发行</span>
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
              <span className="text-white font-bold block pb-0.5">💡 Launchpad 支持规则指引：</span>
              1. 凡是具有 <strong>≥ 100 $VC</strong> 折薪质押的地址均具备创世代币兑换权。
              2. 开发者质押的押金将充入自动流动种子金池，由冷多签智能合约对里程碑进展自动执行核对。
              3. 如里程碑判定不通过或产生恶意代码卷款，该代扣税款及抵押金将按等比例无息交割退还给支持者。
            </div>
          </Card>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left column: Token list rail */}
          <div className="lg:col-span-3 bg-[#0C0E1D] border border-[#1C203E] rounded-2xl p-4 space-y-3">
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

          {/* Center Column: Area line chart */}
          <div className="lg:col-span-6 bg-[#0E1020] border border-[#1E2248] rounded-2xl p-4 flex flex-col justify-between h-[450px]">
            <div>
              <div className="flex items-center justify-between border-b border-[#21254D] pb-3 mb-4">
                <div className="flex items-center gap-2.5">
                  <span className="w-10 h-10 rounded-xl bg-[#1C1A3F] border border-[#635BFF]/35 flex items-center justify-center font-black text-sm text-[#877EFF] select-none">
                    {activeToken.symbol}
                  </span>
                  <div className="text-left">
                    <h3 className="text-sm font-black text-white tracking-tight">{activeToken.name} 行情折现价格</h3>
                    <span className="text-[10px] font-mono text-gray-500">AMM CONTINUOUS BONDING CURVE</span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-lg font-black font-mono text-sky-400">{activeToken.price} TON</span>
                  <p className="text-[10px] text-gray-400 font-mono mt-0.5">MCAP: {(activeToken.marketCap).toLocaleString()} TON</p>
                </div>
              </div>

              {/* Recharts responsive component */}
              <div className="h-[280px] w-full mt-2 font-mono text-[10px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={activeToken.chartData}>
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

          {/* Right column: Swap quick panel */}
          <div className="lg:col-span-3 bg-[#0C0E1D] border border-slate-800/60 p-5 rounded-2xl space-y-4 shadow-2xl text-left">
            <div className="flex bg-[#121429] p-1 rounded-xl border border-slate-800">
              <button
                onClick={() => { setTradeType('buy'); setTradeSuccess(false); setErrorMsg(''); }}
                className={`flex-1 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
                  tradeType === 'buy' ? 'bg-[#635BFF] text-white' : 'text-gray-400 hover:text-white'
                }`}
              >
                买入 (BUY)
              </button>
              <button
                onClick={() => { setTradeType('sell'); setTradeSuccess(false); setErrorMsg(''); }}
                className={`flex-1 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
                  tradeType === 'sell' ? 'bg-rose-600 text-white' : 'text-gray-400 hover:text-white'
                }`}
              >
                卖出 (SELL)
              </button>
            </div>

            {tradeSuccess ? (
              <div className="p-4 bg-emerald-950/25 border border-emerald-900/40 rounded-xl space-y-4 text-center animate-in zoom-in-95 leading-normal">
                <CheckCircle2 size={32} className="text-emerald-400 mx-auto animate-bounce" />
                <div>
                  <h4 className="text-xs font-black text-white">交易成功</h4>
                  <p className="text-[10px] text-gray-400 mt-1 leading-relaxed">{successMsg}</p>
                </div>
                <Button onClick={() => setTradeSuccess(false)} size="sm" className="w-full">
                  再次进行 Swap 交易
                </Button>
              </div>
            ) : (
              <form onSubmit={handleTrade} className="space-y-4">
                <div className="space-y-1.5">
                  <span className="text-[10px] text-gray-500 font-mono tracking-wider block">
                    {tradeType === 'buy' ? 'PAYMENT NUMBER (TON)' : `SELL AMOUNT (${activeToken.symbol})`}
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
                      {tradeType === 'buy' ? '预计兑购：' : '预计套现 TON：'}
                      <span className="text-white font-semibold">
                        {tradeType === 'buy' 
                          ? Number((Number(amount) / activeToken.price).toFixed(2)) 
                          : Number((Number(amount) * activeToken.price).toFixed(2))}
                      </span>
                    </span>
                    {isConnected && (
                      <span>
                        {tradeType === 'buy' ? `可用: ${profile?.balanceTON} TON` : `可用: ${activeOwnedBalance} ${activeToken.symbol}`}
                      </span>
                    )}
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
              <span className="font-extrabold text-gray-400 block pb-0.5">联合曲线算法机制：</span>
              <span>每次买入将导致联合池规模减缩以触发代币价格自上移；套现卖出则让资金返还使得价格下降，保证任何时候都有承兑底层。</span>
            </div>
          </div>
        </div>
      )}

      {/* LAUNCHPAD PARTICIPATE MODAL POPUP */}
      {isModalOpen && selectedLaunchProj && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto bg-black/85 backdrop-blur-sm">
          <div className="relative w-full max-w-lg bg-[#121620] border border-[#22253B] rounded-2xl shadow-2xl p-6 text-left transform transition-all animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-[#21253E] pb-3 mb-4">
              <div className="flex items-center gap-2">
                <Rocket className="text-[#635BFF]" size={16} />
                <h3 className="text-sm font-black text-white tracking-tight">参与 ${selectedLaunchProj.symbol} 一级代币共建兑购</h3>
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
                  ${selectedLaunchProj.symbol} 创世代币共建发行中。支持者可以按初始铸造兑比 <strong>1 TON = {Math.floor(1 / selectedLaunchProj.initialPrice)} ${selectedLaunchProj.symbol}</strong> 用 $VC 抵用进行划转。
                </p>

                {/* Requirements check banner */}
                <div className="p-3 rounded-xl border flex items-center justify-between text-xs font-mono bg-[#1C1A3F]/30 border-[#635BFF]/35">
                  <div className="flex items-center gap-2">
                    <UserCheck className="text-emerald-450 shrink-0" size={14} />
                    <div>
                      <span className="text-gray-400 block text-[10px]">质押资质要求</span>
                      <span className="text-white font-bold font-sans">需持有 &ge; 100 $VC 代码质押证明</span>
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
                  <span className="text-[10px] text-gray-500 font-mono block uppercase">代币经济学分配比例（Tokenomics Distribution）</span>
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
                          <span className="leading-tight shrink-0">{entry.name} ({entry.value}%)</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Unlock Vesting timeline */}
                <div className="space-y-1 text-left">
                  <span className="text-[10px] text-gray-500 font-mono block">防割锁仓与解锁时间线 (Vesting Schedule)</span>
                  <div className="p-2.5 bg-[#121424] rounded-xl border border-slate-800 text-[10px] font-medium text-gray-300 leading-normal flex items-start gap-1.5">
                    <Calendar size={13} className="text-[#8B83FF] mt-0.5 shrink-0" />
                    <span>{selectedLaunchProj.vesting}</span>
                  </div>
                </div>

                {/* Exchange input */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] text-gray-550 font-mono">划拨抵用 $VC 额度数</span>
                    <span className="text-[10px] text-gray-400 font-mono">我的可用余额: <strong className="text-white">{profile?.balanceVC} $VC</strong></span>
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
                      预计换得代币：
                      <span className="text-emerald-450 font-extrabold text-xs">
                        {selectedLaunchProj ? (Number(exchangeAmount) / selectedLaunchProj.initialPrice).toFixed(1) : 0} ${selectedLaunchProj.symbol}
                      </span>
                    </span>
                    <span className="text-[#FF9F1A]">+ 网络交易折费 1 TON</span>
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
                    取消
                  </button>
                  <Button 
                    onClick={handleLaunchpadExchange}
                    className="bg-emerald-500 hover:bg-emerald-600 text-[#07080E] font-extrabold"
                  >
                    确认划转兑换 (Lock Swap)
                  </Button>
                </div>
              </div>
            )}

            {launchStep === 'processing' && (
              <div className="py-12 text-center space-y-4">
                <RefreshCw className="text-[#635BFF] mx-auto animate-spin" size={32} />
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">正在发送代扣代缴交易请求 (Broadcasting Claim Payload)...</h4>
                <p className="text-[10px] text-gray-400 max-w-xs mx-auto leading-relaxed">
                  请在您的 Telegram 钱包或 Tonkeeper 弹窗中批准交易签名。这最多需要几秒，请勿刷新当前控制网关页面。
                </p>
              </div>
            )}

            {launchStep === 'success' && (
              <div className="text-center py-6 space-y-4 animate-in zoom-in-95">
                <CheckCircle2 size={40} className="text-emerald-400 mx-auto animate-bounce" />
                <h4 className="text-sm font-black text-white">🎉 兑换成功 (Launchpad Transferred!)</h4>
                
                <div className="p-3 bg-[#07080F]/85 rounded-xl border border-slate-900 text-left space-y-2 font-mono text-[10.5px]">
                  <div className="flex justify-between">
                    <span className="text-gray-500">成交哈希 Code:</span>
                    <span className="text-amber-450 truncate max-w-[200px]" title={txHash}>{txHash}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">消耗折抵 $VC:</span>
                    <span className="text-white font-bold">-{exchangeAmount} VC</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">扣减燃料 TON:</span>
                    <span className="text-white font-bold">-1 TON</span>
                  </div>
                  <div className="flex justify-between border-t border-slate-900 pt-1.5 mt-1">
                    <span className="text-gray-500 font-sans font-bold">获得分配代币:</span>
                    <span className="text-emerald-400 font-extrabold text-sm font-sans">
                      +{(Number(exchangeAmount) / selectedLaunchProj.initialPrice).toFixed(1)} ${selectedLaunchProj.symbol}
                    </span>
                  </div>
                </div>

                <p className="text-[10.5px] text-gray-400 leading-normal max-w-sm mx-auto">
                  该款项已锁入主网中继托管池，您可以在<strong>“我的持仓 (Portfolio)”</strong>中查验代币分配细节。感谢您共同铸造安全算力网络。
                </p>
                
                <Button onClick={() => setIsModalOpen(false)} className="w-full">
                  关闭发行提示舱 (Minimize)
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
