import React, { useState } from 'react';
import { useFundStore } from '../store/fundStore';
import { useUserStore } from '../store/userStore';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell
} from 'recharts';
import {
  Coins, Wallet, TrendingUp, ShieldCheck, ArrowUpRight, ArrowDownRight,
  HelpCircle, RefreshCw, CheckCircle, ArrowRight, BarChart3, Activity,
  Layers, ExternalLink, Calculator, DollarSign, ArrowDownUp, Info, AlertTriangle, ShieldAlert
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card, CardHeader, CardTitle, CardDescription } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { useTranslation } from '../hooks/useTranslation';

export default function FundPage() {
  const { isConnected, profile, connectWallet } = useUserStore();
  const {
    totalFundVC, totalUserDepositedVC, userDepositedVC, tonReserves,
    portfolio, transactions, depositVC, withdrawVC
  } = useFundStore();
  const { t, language } = useTranslation();

  // New Staking Types: 'flexible' | 'locked'
  const [stakeType, setStakeType] = useState<'flexible' | 'locked'>('locked');
  const [calcPoolType, setCalcPoolType] = useState<'flexible' | 'locked'>('locked');
  const [depositAmount, setDepositAmount] = useState<string>('10000');
  const [withdrawAmount, setWithdrawAmount] = useState<string>('5000');
  const [calcAmount, setCalcAmount] = useState<string>('100000');
  const [actionStep, setActionStep] = useState<'idle' | 'processing' | 'success'>('idle');
  const [activeModal, setActiveModal] = useState<'none' | 'deposit' | 'withdraw'>('none');
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Local state to simulate multi-token dividend claims
  const [isClaiming, setIsClaiming] = useState(false);
  const [claimSuccess, setClaimSuccess] = useState(false);
  const [claimedData, setClaimedData] = useState<string[]>([]);

  // Simulated growth chart data
  const chartData = [
    { name: '05-20', size: 720.0, ton: 0 },
    { name: '05-22', size: 720.5, ton: 15 },
    { name: '05-24', size: 721.2, ton: 40 },
    { name: '05-26', size: 722.0, ton: 75 },
    { name: '05-28', size: 723.45, ton: 105 },
    { name: '05-30', size: (totalFundVC / 1000000), ton: (tonReserves / 1000) }
  ];

  // Allocation Pie Chart Data
  const pieData = [
    { name: t('fund.pieFirstLoss'), value: 720000000, color: '#635BFF' },
    { name: t('fund.pieCommunity'), value: totalUserDepositedVC, color: '#10B981' },
    { name: t('fund.pieVenture'), value: 18000000, color: '#FFA825' }
  ];

  const handleDeposit = async () => {
    if (!isConnected || !profile) {
      connectWallet();
      return;
    }
    setErrorMsg('');
    const amt = Number(depositAmount);
    if (isNaN(amt) || amt <= 0) {
      setErrorMsg(t('fund.errInvalidAmount'));
      return;
    }
    if (profile.balanceVC < amt) {
      setErrorMsg(t('fund.errInsufficientBalance', { balance: profile.balanceVC.toLocaleString() }));
      return;
    }

    setActionStep('processing');
    setTimeout(async () => {
      const ok = await depositVC(amt);
      if (ok) {
        setSuccessMsg(
          stakeType === 'locked'
            ? t('fund.successStakedLocked', { amount: amt.toLocaleString() })
            : t('fund.successStakedFlexible', { amount: amt.toLocaleString() })
        );
        setActionStep('success');
      } else {
        setErrorMsg(t('fund.errTxFailed'));
        setActionStep('idle');
      }
    }, 2000);
  };

  const handleWithdraw = async () => {
    if (!isConnected || !profile) {
      connectWallet();
      return;
    }
    setErrorMsg('');
    const amt = Number(withdrawAmount);
    if (isNaN(amt) || amt <= 0) {
      setErrorMsg(t('fund.errInvalidWithdrawAmount'));
      return;
    }
    if (userDepositedVC < amt) {
      setErrorMsg(t('fund.errInsufficientWithdraw', { balance: userDepositedVC.toLocaleString(), amount: amt.toLocaleString() }));
      return;
    }

    setActionStep('processing');
    setTimeout(async () => {
      const ok = await withdrawVC(amt);
      if (ok) {
        setSuccessMsg(t('fund.successWithdrawMsg', { amount: amt.toLocaleString() }));
        setActionStep('success');
      } else {
        setErrorMsg(t('fund.errWithdrawFailed'));
        setActionStep('idle');
      }
    }, 2000);
  };

  const triggerClaimAll = () => {
    if (!isConnected || userDepositedVC === 0) return;
    setIsClaiming(true);
    setClaimedData([]);

    // Simulate smart contract pull-based claim for TON and Project Tokens
    setTimeout(() => {
      setIsClaiming(false);
      setClaimSuccess(true);
      setClaimedData(['2.5 TON', '310 TBP', '210 MGAI']);
      setTimeout(() => setClaimSuccess(false), 5000);
    }, 2000);
  };

  const openModal = (type: 'deposit' | 'withdraw') => {
    setErrorMsg('');
    setActiveModal(type);
    setActionStep('idle');
  };

  // Calculator logic
  const calcVC = Number(calcAmount) || 0;
  const userSharePercent = totalFundVC > 0 ? (calcVC / totalFundVC) * 100 : 0;

  // Dynamic variables based on flexible/locked pool selection
  const poolApy = calcPoolType === 'locked' ? 15.6 : 3.5;
  const estAnnualTon = calcPoolType === 'locked' ? calcVC * 0.00125 : calcVC * 0.00025;
  const estMonthlyVC = calcPoolType === 'locked' ? calcVC * 0.015 : calcVC * 0.003;

  return (
    <div className="space-y-8 text-left select-none max-w-6xl mx-auto animate-in fade-in duration-300">

      {/* Page Header */}
      <div className="border-b border-[#1C203E] pb-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] font-mono text-[#8C84FF] tracking-widest block font-bold uppercase">
            {t('fund.tagLine')}
          </span>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2.5 mt-1">
            <Layers className="text-[#635BFF] animate-pulse" size={24} />
            <span>{t('fund.pageTitle')}</span>
          </h1>
          <p className="text-xs text-gray-400 mt-1 max-w-3xl leading-relaxed">
            {t('fund.pageDesc')}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <span className="text-[10px] text-emerald-450 font-mono bg-emerald-500/10 p-1.5 px-3 rounded-lg border border-emerald-500/15 flex items-center gap-1.5 font-bold">
            <ShieldCheck size={12} />
            <span>{t('fund.cushionBalanceText')}</span>
          </span>
          <span className="text-[10px] text-sky-400 font-mono bg-sky-500/10 p-1.5 px-3 rounded-lg border border-sky-500/15 flex items-center gap-1.5 font-bold">
            <span>{t('fund.apyBadgeText')}</span>
          </span>
        </div>
      </div>

      {/* Metrics Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <Card className="p-5 relative overflow-hidden group border border-[#1F2344] bg-gradient-to-br from-[#0B0D19] to-[#05060B] hover:border-[#3C4176] transition duration-300 shadow-md hover:shadow-[#635BFF]/5">
          <div className="space-y-1">
            <span className="text-[10px] text-gray-550 font-mono tracking-wider block uppercase">{t('fund.metricTotalVC')}</span>
            <h3 className="text-xl sm:text-2xl font-black font-mono text-white">{(totalFundVC).toLocaleString()}</h3>
            <span className="text-[10.5px] text-[#A69FFF] font-semibold block flex items-center gap-1">
              <TrendingUp size={11} />
              <span>{t('fund.metricTotalVCDesc')}</span>
            </span>
          </div>
          <Coins size={36} className="absolute right-4 bottom-4 text-[#635BFF]/10 group-hover:scale-110 transition duration-300" />
        </Card>

        <Card className="p-5 relative overflow-hidden group border border-[#1F2344] bg-gradient-to-br from-[#0B0D19] to-[#05060B] hover:border-[#217755] transition duration-300 shadow-md hover:shadow-emerald-500/5">
          <div className="space-y-1">
            <span className="text-[10px] text-gray-550 font-mono tracking-wider block uppercase">{t('fund.metricReservesTON')}</span>
            <h3 className="text-xl sm:text-2xl font-black font-mono text-emerald-450">{(tonReserves).toLocaleString()} TON</h3>
            <span className="text-[10.5px] text-emerald-450 font-semibold block">
              {t('fund.metricReservesTONDesc')}
            </span>
          </div>
          <Wallet size={36} className="absolute right-4 bottom-4 text-emerald-500/10 group-hover:scale-110 transition duration-300" />
        </Card>

        <Card className="p-5 relative overflow-hidden group border border-[#1F2344] bg-gradient-to-br from-[#0B0D19] to-[#05060B] hover:border-[#1E6088] transition duration-300 shadow-md hover:shadow-sky-500/5">
          <div className="space-y-1">
            <span className="text-[10px] text-gray-550 font-mono tracking-wider block uppercase">{t('fund.metricUserStaked')}</span>
            <h3 className="text-xl sm:text-2xl font-black font-mono text-sky-400">{(totalUserDepositedVC).toLocaleString()} VC</h3>
            <span className="text-[10.5px] text-gray-400 font-medium block">
              {t('fund.metricUserStakedDesc')}
            </span>
          </div>
          <Activity size={36} className="absolute right-4 bottom-4 text-sky-400/10 group-hover:scale-110 transition duration-300" />
        </Card>

        <Card className="p-5 relative overflow-hidden group border border-[#1F2344] bg-gradient-to-br from-[#0B0D19] to-[#05060B] hover:border-[#8E6325] transition duration-300 shadow-md hover:shadow-amber-500/5">
          <div className="space-y-1">
            <span className="text-[10px] text-gray-550 font-mono tracking-wider block uppercase">{t('fund.metricMyShare')}</span>
            <h3 className="text-xl sm:text-2xl font-black font-mono text-[#FF9F1A]">{(userDepositedVC).toLocaleString()} VC</h3>
            {isConnected ? (
              <span className="text-[10.5px] text-emerald-400 font-semibold block">
                {t('fund.metricMyShareDesc', { percent: totalUserDepositedVC > 0 ? ((userDepositedVC / totalUserDepositedVC) * 100).toFixed(4) : '0.0000' })}
              </span>
            ) : (
              <span className="text-[10.5px] text-gray-500 block">{t('fund.connectWalletActivate')}</span>
            )}
          </div>
          <BarChart3 size={36} className="absolute right-4 bottom-4 text-amber-500/10 group-hover:scale-110 transition duration-300" />
        </Card>
      </div>

      {/* Security Cushion Banner */}
      <div className="p-4 bg-[#0A0F1D] border border-indigo-950/70 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-start gap-3 text-xs leading-relaxed text-gray-400">
          <ShieldAlert className="text-indigo-400 mt-0.5 shrink-0" size={18} />
          <div>
            <strong className="text-white block font-sans">{t('fund.cushionTitle')}</strong>
            {t('fund.cushionDesc')}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0 bg-slate-950 p-2.5 rounded-xl border border-indigo-950/80 font-mono text-[10px] text-gray-300">
          <span>{t('fund.cushionBalanceLabel')}</span>
          <span className="text-indigo-400 font-black">720,000,000 VC</span>
        </div>
      </div>

      {/* Main Charts and Operations */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* Growth Trend Area Chart */}
        <div className="lg:col-span-8 bg-[#090B15] border border-[#1E2248] rounded-2xl p-5 flex flex-col justify-between h-[360px]">
          <div className="flex items-center justify-between border-b border-[#1C203E] pb-3 mb-3">
            <div>
              <h3 className="text-xs font-black text-white tracking-tight uppercase font-mono">{t('fund.chartTitle')}</h3>
              <span className="text-[9.5px] text-gray-500 font-mono block">{t('fund.chartSubtitle')}</span>
            </div>
            <div className="flex items-center gap-4 text-[10.5px] font-mono">
              <span className="flex items-center gap-1.5 text-indigo-400 font-bold">
                <span className="w-2.5 h-2.5 rounded bg-[#635BFF]" />
                <span>{t('fund.chartVcLabel')}</span>
              </span>
              <span className="flex items-center gap-1.5 text-emerald-400 font-bold">
                <span className="w-2.5 h-2.5 rounded bg-[#10B981]" />
                <span>{t('fund.chartTonLabel')}</span>
              </span>
            </div>
          </div>

          <div className="h-[250px] w-full mt-2 font-mono text-[9px] flex gap-4">
            {/* Line chart */}
            <div className="flex-1 h-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorSize" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#635BFF" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#635BFF" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorTon" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10B981" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#181B34" vertical={false} />
                  <XAxis dataKey="name" stroke="#4A5288" />
                  <YAxis stroke="#4A5288" />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#07080F', borderColor: '#1F2344', color: '#fff' }}
                    labelClassName="text-gray-400 border-b border-gray-800 pb-1 mb-1 block"
                  />
                  <Area type="monotone" dataKey="size" stroke="#635BFF" strokeWidth={2} fillOpacity={1} fill="url(#colorSize)" />
                  <Area type="monotone" dataKey="ton" stroke="#10B981" strokeWidth={2} fillOpacity={1} fill="url(#colorTon)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Allocation mini-pie chart */}
            <div className="w-40 h-full hidden sm:block shrink-0 relative flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={35}
                    outerRadius={50}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {pieData.map((entry, idx) => (
                      <Cell key={`cell-${idx}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: '#07080F', borderColor: '#1F2344', color: '#fff', fontSize: '9px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute text-center select-none pointer-events-none">
                <span className="text-[8px] text-gray-555 block font-mono">PORTFOLIO</span>
                <span className="text-[10px] text-white font-extrabold block font-mono">{t('fund.pieLabel')}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Stake Operation Card */}
        <div className="lg:col-span-4 bg-[#090B15] border border-[#1E2248] rounded-2xl p-5 flex flex-col justify-between h-[360px] text-left">
          <div className="space-y-3.5 flex-1 flex flex-col justify-between">
            <div>
              <h3 className="text-xs font-black text-white tracking-tight uppercase font-mono border-b border-[#1C203E] pb-3">{t('fund.terminalTitle')}</h3>
              <p className="text-[10px] text-gray-400 leading-normal mt-3 font-sans">
                {t('fund.terminalDesc')}
              </p>
            </div>

            {/* Current status info */}
            <div className="bg-[#05060E] border border-[#161833] rounded-xl p-3.5 space-y-2.5 font-mono text-[10.5px]">
              <div className="flex justify-between items-center">
                <span className="text-gray-550">{t('fund.walletVcBalance')}</span>
                <span className="text-white font-bold">
                  {isConnected && profile ? profile.balanceVC.toLocaleString() : '0.00'} VC
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-550">{t('fund.myLockedVc')}</span>
                <span className="text-[#FF9F1A] font-extrabold">
                  {userDepositedVC.toLocaleString()} VC
                </span>
              </div>
            </div>

            <div className="space-y-3">
              {isConnected ? (
                <div className="grid grid-cols-2 gap-3.5">
                  <Button
                    onClick={() => openModal('deposit')}
                    className="w-full bg-[#635BFF] hover:bg-[#5245EE] text-white font-bold py-2.5 rounded-xl shadow-lg shadow-[#635BFF]/15 cursor-pointer text-xs"
                  >
                    {t('fund.depositBtn')}
                  </Button>
                  <Button
                    onClick={() => openModal('withdraw')}
                    disabled={userDepositedVC === 0}
                    className="w-full bg-slate-900 border border-[#23284A] hover:bg-[#1E223E] hover:border-[#3A3F6D] text-white font-bold py-2.5 rounded-xl disabled:opacity-50 cursor-pointer text-xs"
                  >
                    {t('fund.withdrawBtn')}
                  </Button>
                </div>
              ) : (
                <Button
                  onClick={() => connectWallet()}
                  className="w-full bg-[#635BFF] hover:bg-[#5245EE] text-white font-black py-2.5 rounded-xl cursor-pointer text-xs shadow-lg shadow-[#635BFF]/15"
                >
                  {t('fund.connectAuthorize')}
                </Button>
              )}
            </div>

            <div className="text-[9px] text-gray-555 border-t border-[#1C1F3A]/70 pt-2 leading-relaxed flex items-start gap-1">
              <HelpCircle size={10} className="shrink-0 mt-0.5" />
              <span>{t('fund.terminalFooter')}</span>
            </div>
          </div>
        </div>

      </div>

      {/* APY Calculator & Info Guide Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 text-left">
        {/* Yield Calculator */}
        <div className="bg-[#090B15] border border-[#1E2248] rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-[#1C203E] pb-3">
            <h3 className="text-xs font-black text-white tracking-tight uppercase font-mono flex items-center gap-1.5">
              <Calculator size={13} className="text-[#635BFF]" />
              <span>{t('fund.calcTitle')}</span>
            </h3>
            {/* Calculator Pool selector */}
            <div className="flex bg-[#05060F] p-0.5 border border-indigo-950 rounded-lg scale-90">
              <button
                onClick={() => setCalcPoolType('flexible')}
                className={`px-2 py-0.5 text-[9px] font-bold rounded transition cursor-pointer ${calcPoolType === 'flexible' ? 'bg-[#635BFF] text-white' : 'text-gray-550'}`}
              >{t('fund.calcFlexible')}</button>
              <button
                onClick={() => setCalcPoolType('locked')}
                className={`px-2 py-0.5 text-[9px] font-bold rounded transition cursor-pointer ${calcPoolType === 'locked' ? 'bg-[#635BFF] text-white' : 'text-gray-550'}`}
              >{t('fund.calcLocked')}</button>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-1">
              <span className="text-[10px] text-gray-550 font-mono block">{t('fund.calcInputLabel')}</span>
              <div className="relative">
                <input
                  type="number"
                  value={calcAmount}
                  onChange={(e) => setCalcAmount(e.target.value.replace(/\D/g, ''))}
                  className="w-full bg-[#05060E] border border-slate-800 focus:border-[#635BFF] text-white font-mono text-xs rounded-xl px-3.5 py-2.5 outline-none transition"
                />
                <span className="absolute right-3.5 top-3 text-[10px] text-gray-500 font-mono font-bold">VC</span>
              </div>
            </div>

            <div className="bg-[#05060E] border border-[#161833] rounded-xl p-3.5 space-y-2.5 font-mono text-[10.5px]">
              <div className="flex justify-between">
                <span className="text-gray-550">{t('fund.calcShare')}</span>
                <span className="text-white font-bold">{userSharePercent.toFixed(6)}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-550">{t('fund.calcApy')}</span>
                <span className="text-[#8C84FF] font-black">{poolApy}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-550">{t('fund.calcEstTon')}</span>
                <span className="text-emerald-450 font-extrabold">+{estAnnualTon.toFixed(2)} TON</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-550">{t('fund.calcEstVc')}</span>
                <span className="text-indigo-400 font-extrabold">+{estMonthlyVC.toLocaleString()} VC</span>
              </div>
            </div>

            <p className="text-[9px] text-gray-550 leading-normal">
              {t('fund.calcDisclaimer')}
            </p>
          </div>
        </div>

        {/* Detailed Staking Mechanism guidelines */}
        <div className="bg-[#090B15] border border-[#1E2248] rounded-2xl p-5 lg:col-span-2 space-y-4">
          <h3 className="text-xs font-black text-white tracking-tight uppercase font-mono flex items-center gap-1.5 border-b border-[#1C203E] pb-3">
            <Info size={13} className="text-[#635BFF]" />
            <span>{t('fund.guideTitle')}</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-gray-400 leading-relaxed font-sans">
            <div className="space-y-2">
              <h4 className="font-extrabold text-white text-xs flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#635BFF]" />
                <span>{t('fund.q1')}</span>
              </h4>
              <p>
                {t('fund.a1')}
              </p>
            </div>

            <div className="space-y-2">
              <h4 className="font-extrabold text-white text-xs flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#635BFF]" />
                <span>{t('fund.q2')}</span>
              </h4>
              <p>
                {t('fund.a2')}
              </p>
            </div>

            <div className="space-y-2">
              <h4 className="font-extrabold text-white text-xs flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#635BFF]" />
                <span>{t('fund.q3')}</span>
              </h4>
              <p>
                {t('fund.a3')}
              </p>
            </div>

            <div className="space-y-2">
              <h4 className="font-extrabold text-white text-xs flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#635BFF]" />
                <span>{t('fund.q4')}</span>
              </h4>
              <p>
                {t('fund.a4')}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Row 4: Investment Portfolio */}
      <Card className="p-0 overflow-hidden border border-[#1E2248] bg-[#090B15]">
        <div className="p-4 px-5 border-b border-[#1C203E] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <CardTitle className="text-sm font-bold uppercase font-mono tracking-wide text-white">{t('fund.portfolioTitle')}</CardTitle>
            <CardDescription className="text-[10px] text-gray-400">{t('fund.portfolioDesc')}</CardDescription>
          </div>

          <div className="flex items-center gap-3">
            {claimSuccess && (
              <span className="text-[10px] text-emerald-450 font-bold bg-emerald-500/10 p-1 px-3.5 rounded border border-emerald-500/15 animate-bounce">
                {t('fund.claimSuccessMsg', { tokens: claimedData.join(', ') })}
              </span>
            )}
            <Button
              onClick={triggerClaimAll}
              disabled={isClaiming || userDepositedVC === 0}
              className="bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-black font-extrabold text-xs px-4 py-2 rounded-xl flex items-center gap-1.5 shadow-lg shadow-emerald-500/10 cursor-pointer"
            >
              {isClaiming ? (
                <>
                  <RefreshCw size={12} className="animate-spin" />
                  <span>{t('fund.claimingStatus')}</span>
                </>
              ) : (
                <>
                  <Coins size={12} />
                  <span>{t('fund.pullRewardBtn')}</span>
                </>
              )}
            </Button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-[11.5px]">
            <thead>
              <tr className="bg-[#05060E] border-b border-[#1E2248] text-gray-500 font-mono text-[9px] uppercase">
                <th className="p-4 pl-5">{t('fund.tableProject')}</th>
                <th className="p-4">{t('fund.tablePrincipal')}</th>
                <th className="p-4">{t('fund.tableTonReturn')}</th>
                <th className="p-4">{t('fund.tableTokenReturn')}</th>
                <th className="p-4">{t('fund.tableRoi')}</th>
                <th className="p-4">{t('fund.tableStatus')}</th>
                <th className="p-4 pr-5 text-right">{t('fund.tableDetail')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1D2136]/40">
              {portfolio.map((item) => {
                const statusColors = {
                  "ongoing": "bg-sky-500/10 text-sky-400 border border-sky-500/20",
                  "completed": "bg-emerald-500/10 text-emerald-455 border border-emerald-500/20"
                };

                return (
                  <tr key={item.id} className="hover:bg-[#12162A]/40 transition group">
                    <td className="p-4 pl-5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-[#181C2F] border border-slate-800 flex items-center justify-center font-bold text-[10px] text-sky-400 font-mono uppercase">
                          {item.ticker.substring(0, 1)}
                        </div>
                        <div>
                          <span className="font-extrabold text-white block text-xs group-hover:text-[#8B83FF] transition">{item.name}</span>
                          <span className="text-[9.5px] font-mono text-gray-555 block">${item.ticker}</span>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 font-mono font-bold text-gray-300">{(item.investedVC).toLocaleString()} VC</td>
                    <td className="p-4 text-emerald-455 font-mono font-bold">+{item.returnsTON > 0 ? (item.returnsTON).toLocaleString() : '0'} TON</td>
                    <td className="p-4 text-gray-300 font-mono font-bold">
                      {item.returnsToken > 0 ? `+${(item.returnsToken).toLocaleString()} $${item.returnedTokenTicker}` : (language === 'zh' ? '筹备锁定中' : language === 'ko' ? '준비 락업 중' : 'Preparing Lockup')}
                    </td>
                    <td className="p-4 text-[#FF9F1A] font-mono font-black">{item.roi}%</td>
                    <td className="p-4">
                      <span className={`inline-flex items-center px-1.5 py-0.5 rounded font-mono font-extrabold text-[9px] ${statusColors[item.status]}`}>
                        {item.status === 'completed' ? t('fund.statusCompleted') : t('fund.statusOngoing')}
                      </span>
                    </td>
                    <td className="p-4 pr-5 text-right">
                      <a href={`#/launch/${item.id === 'proj-1' ? 'spark-3' : item.id === 'proj-2' ? 'spark-4' : item.id === 'proj-3' ? 'spark-1' : 'spark-2'}`}
                        className="text-[#635BFF] font-bold text-[10.5px] hover:underline flex items-center gap-0.5 justify-end ml-auto group-hover:translate-x-0.5 transition cursor-pointer font-sans"
                      >
                        <span>{t('fund.detailConsole')}</span>
                        <ArrowRight size={11} />
                      </a>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Row 5: Transaction Stream Ledger */}
      <Card className="p-0 overflow-hidden border border-[#1E2248] bg-[#090B15]">
        <div className="p-4 px-5 border-b border-[#1C203E] flex items-center justify-between">
          <div>
            <CardTitle className="text-sm font-bold uppercase font-mono tracking-wide text-white">{t('fund.ledgerTitle')}</CardTitle>
            <CardDescription className="text-[10px] text-gray-400">{t('fund.ledgerDesc')}</CardDescription>
          </div>
          <Badge variant="neutral" className="font-mono text-[9px]">REAL-TIME TELEMETRY</Badge>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-[11px] font-mono">
            <thead>
              <tr className="bg-[#05060E] border-b border-[#1E2248] text-gray-500 text-[9px] uppercase">
                <th className="p-4 pl-5">{t('fund.ledgerHash')}</th>
                <th className="p-4">{t('fund.ledgerType')}</th>
                <th className="p-4">{t('fund.ledgerFrom')}</th>
                <th className="p-4">{t('fund.ledgerTo')}</th>
                <th className="p-4">{t('fund.ledgerTime')}</th>
                <th className="p-4 pr-5 text-right">{t('fund.ledgerAmount')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1D2136]/40">
              {transactions.map((tx) => {
                const isDeposit = tx.type === 'user_deposit' || tx.type === 'revenue_inflow' || tx.type === 'system_allocation';
                const typeLabels = {
                  system_allocation: { text: t('fund.typeGenAllocation'), color: "text-[#8B83FF] bg-[#635BFF]/10 border-[#635BFF]/15" },
                  user_deposit: { text: t('fund.typeDeposit'), color: "text-sky-400 bg-sky-500/10 border-sky-500/15" },
                  user_withdraw: { text: t('fund.typeWithdraw'), color: "text-amber-500 bg-amber-500/10 border-amber-500/15" },
                  investment_outflow: { text: t('fund.typeOutflow'), color: "text-rose-455 bg-rose-500/10 border-rose-500/15" },
                  revenue_inflow: { text: t('fund.typeInflow'), color: "text-emerald-450 bg-emerald-500/10 border-emerald-500/15" }
                };

                return (
                  <tr key={tx.id} className="hover:bg-[#12162A]/40 transition">
                    <td className="p-4 pl-5 text-[#8C84FF] font-semibold flex items-center gap-1">
                      <span className="truncate max-w-[100px]">{tx.txHash || 'EQA...d7e4'}</span>
                      <ExternalLink size={10} className="text-gray-600 hover:text-gray-400 cursor-pointer" />
                    </td>
                    <td className="p-4">
                      <span className={`inline-flex px-1.5 py-0.5 rounded text-[8.5px] border ${typeLabels[tx.type].color} font-sans font-bold`}>
                        {typeLabels[tx.type].text}
                      </span>
                    </td>
                    <td className="p-4 text-gray-455 truncate max-w-[140px]" title={tx.from}>{tx.from}</td>
                    <td className="p-4 text-gray-455 truncate max-w-[140px]" title={tx.to}>{tx.to}</td>
                    <td className="p-4 text-gray-550">{tx.date}</td>
                    <td className={`p-4 pr-5 text-right font-black ${isDeposit ? 'text-emerald-450' : 'text-rose-400'}`}>
                      {isDeposit ? '+' : '-'}{tx.amount.toLocaleString()} {tx.token}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* MODAL INTERFACE */}
      {activeModal !== 'none' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto bg-black/85 backdrop-blur-sm">
          <div className="relative w-full max-w-md bg-[#090B15] border border-[#22253B] rounded-2xl shadow-2xl p-6 text-left transform transition-all animate-in zoom-in-95 duration-200">

            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-[#1C203E] pb-3 mb-4">
              <h3 className="text-sm font-black text-white tracking-tight uppercase font-mono">
                {activeModal === 'deposit' ? t('fund.modalDepositTitle') : t('fund.modalWithdrawTitle')}
              </h3>
              <button
                onClick={() => setActiveModal('none')}
                className="p-1 rounded-lg text-gray-500 hover:text-white hover:bg-[#1E2235] transition"
              >
                &times;
              </button>
            </div>

            {/* Modal Body */}
            {actionStep === 'idle' && (
              <div className="space-y-4">
                {activeModal === 'deposit' && (
                  <div className="space-y-2">
                    <span className="text-[10px] text-gray-555 font-mono block uppercase">{t('fund.modalSelectStakeType')}</span>
                    <div className="grid grid-cols-2 gap-3.5">
                      <button
                        type="button"
                        onClick={() => setStakeType('flexible')}
                        className={`p-3 rounded-xl border text-left transition ${
                          stakeType === 'flexible'
                            ? 'bg-[#1C1A3F] border-[#635BFF]'
                            : 'bg-[#05060E] border-slate-800 text-gray-400 hover:border-slate-700'
                        }`}
                      >
                        <span className="text-[10px] font-black block text-white">{t('fund.modalFlexiblePool')}</span>
                        <span className="text-[9px] block text-[#8C84FF] font-mono mt-0.5">{t('fund.modalFlexibleApy')}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setStakeType('locked')}
                        className={`p-3 rounded-xl border text-left transition ${
                          stakeType === 'locked'
                            ? 'bg-[#1C1A3F] border-[#635BFF]'
                            : 'bg-[#05060E] border-slate-800 text-gray-400 hover:border-slate-700'
                        }`}
                      >
                        <span className="text-[10px] font-black block text-white">{t('fund.modalLockedPool')}</span>
                        <span className="text-[9px] block text-emerald-400 font-mono mt-0.5">{t('fund.modalLockedApy')}</span>
                      </button>
                    </div>
                  </div>
                )}

                <p className="text-[10.5px] text-gray-400 leading-relaxed font-sans">
                  {activeModal === 'deposit'
                    ? stakeType === 'locked'
                      ? t('fund.modalLockedDesc')
                      : t('fund.modalFlexibleDesc')
                    : t('fund.modalWithdrawDesc')}
                </p>

                <div className="space-y-1.5 text-left">
                  <div className="flex justify-between items-center font-mono text-[10.5px]">
                    <span className="text-gray-550">{t('fund.modalAmountLabel')}</span>
                    <span className="text-gray-400">
                      {activeModal === 'deposit'
                        ? t('fund.modalAvailWallet', { amount: profile?.balanceVC.toLocaleString() })
                        : t('fund.modalAvailTreasury', { amount: userDepositedVC.toLocaleString() })}
                    </span>
                  </div>
                  <div className="relative">
                    <input
                      type="number"
                      value={activeModal === 'deposit' ? depositAmount : withdrawAmount}
                      onChange={(e) => activeModal === 'deposit' ? setDepositAmount(e.target.value) : setWithdrawAmount(e.target.value)}
                      className="w-full bg-[#05060E] border border-slate-800 focus:border-[#635BFF] text-white font-mono text-xs rounded-xl px-3.5 py-2.5 outline-none transition"
                    />
                    <span className="absolute right-3.5 top-3 text-[10px] text-gray-455 font-mono font-bold">VC</span>
                  </div>
                </div>

                {errorMsg && (
                  <div className="p-2.5 bg-rose-950/25 border border-rose-900/40 text-rose-300 rounded-lg text-[10px] leading-relaxed">
                    ⚠️ {errorMsg}
                  </div>
                )}

                <div className="pt-2 border-t border-[#1C1F3D] flex justify-end gap-2.5">
                  <button
                    onClick={() => setActiveModal('none')}
                    className="px-4 py-2 bg-transparent text-gray-400 hover:text-white text-xs font-bold rounded-xl transition cursor-pointer"
                  >
                    {t('common.cancel')}
                  </button>
                  {activeModal === 'deposit' ? (
                    <Button
                      onClick={handleDeposit}
                      className="bg-[#635BFF] hover:bg-[#5245EE] text-white font-bold"
                    >
                      {t('fund.btnConfirmDeposit')}
                    </Button>
                  ) : (
                    <Button
                      onClick={handleWithdraw}
                      className="bg-emerald-500 hover:bg-emerald-600 text-black font-bold"
                    >
                      {t('fund.btnConfirmWithdraw')}
                    </Button>
                  )}
                </div>
              </div>
            )}

            {actionStep === 'processing' && (
              <div className="py-12 text-center space-y-4">
                <RefreshCw className="text-[#635BFF] mx-auto animate-spin" size={32} />
                <h4 className="text-xs font-bold text-white tracking-wider font-mono">
                  {activeModal === 'deposit' ? t('fund.statusProcessing') : t('fund.statusWithdrawing')}
                </h4>
                <p className="text-[10px] text-gray-400 max-w-xs mx-auto leading-relaxed font-sans">
                  {t('fund.modalSignNotice')}
                </p>
              </div>
            )}

            {actionStep === 'success' && (
              <div className="text-center py-6 space-y-4 animate-in zoom-in-95">
                <CheckCircle size={40} className="text-emerald-450 mx-auto animate-bounce" />
                <h4 className="text-xs font-black text-white uppercase tracking-widest font-mono">{t('fund.modalSuccessTitle')}</h4>

                <p className="text-[11px] text-gray-300 leading-relaxed font-sans max-w-sm mx-auto">
                  {successMsg}
                </p>

                <Button onClick={() => setActiveModal('none')} className="w-full">
                  {t('fund.btnBackToTreasury')}
                </Button>
              </div>
            )}

          </div>
        </div>
      )}

    </div>
  );
}
