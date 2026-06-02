import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bot, Cpu, GitBranch, ArrowRight, CheckCircle2, Terminal, Code2, Play } from 'lucide-react';
import { useUserStore } from '../store/userStore';
import { useAgentStore } from '../store/agentStore';
import { useTranslation } from '../hooks/useTranslation';

export default function StudioPage() {
  const navigate = useNavigate();
  const { isConnected, walletAddress, connectWallet } = useUserStore();
  const { addAgent } = useAgentStore();
  const { t } = useTranslation();

  const [name, setName] = useState('');
  const [ticker, setTicker] = useState('');
  const [category, setCategory] = useState<'数据分析' | '交易工具' | '社交' | '监控' | '基础设施' | '创作工具' | 'DeFi'>('交易工具');
  const [desc, setDesc] = useState('');
  const [caps, setCaps] = useState<string>('');
  const [revModel, setRevModel] = useState('');
  const [model, setModel] = useState('Gemini 2.5 Flash');
  const [github, setGithub] = useState('');

  // Terminal simulator states
  const [compiling, setCompiling] = useState(false);
  const [terminalLogs, setTerminalLogs] = useState<string[]>([]);
  const [compiledAddress, setCompiledAddress] = useState('');
  const [compileSuccess, setCompileSuccess] = useState(false);

  // Set localized defaults after translation hook is available
  useEffect(() => {
    setCaps(t('studio.capsPlaceholder'));
    setRevModel(t('studio.revenueModelDefault'));
  }, [t]);

  const handleWalletFallback = () => {
    connectWallet();
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

  const executeCompile = () => {
    if (!name || !ticker || !desc) {
      alert(t('studio.alertFillForm'));
      return;
    }

    setCompiling(true);
    setCompileSuccess(false);
    setTerminalLogs([]);
    setCompiledAddress('');

    const logs = [
      t('studio.logSandboxStart'),
      t('studio.logRepository').replace('{repo}', github || 'VibeCoder/default-agent-runtime'),
      t('studio.logStaticReview'),
      t('studio.logFineTuning').replace('{model}', model),
      t('studio.logCompilingContracts'),
      t('studio.logGeneratingAbi'),
      t('studio.logAuditPassed'),
      t('studio.logRegisteredEco')
    ];

    let currentLogIndex = 0;
    const interval = setInterval(() => {
      if (currentLogIndex < logs.length) {
        setTerminalLogs(prev => [...prev, logs[currentLogIndex]]);
        currentLogIndex++;
      } else {
        clearInterval(interval);
        const randomHex = Math.random().toString(16).substring(2, 10);
        const mockContractAddress = `EQD4_agEnT_cOnTraCt_${randomHex}_888`;
        setCompiledAddress(mockContractAddress);
        setCompiling(false);
        setCompileSuccess(true);
      }
    }, 450);
  };

  const handlePublishAndCofund = () => {
    const capabilitiesArray = caps.split(',').map(s => s.trim()).filter(Boolean);
    const newAgent = addAgent({
      name,
      ticker: ticker.toUpperCase(),
      description: desc,
      creator: `VibeDev_${walletAddress?.slice(2, 6) || 'creator'}`,
      walletAddress: compiledAddress,
      status: 'funding', // Created in studio -> moves to spark config
      category,
      capabilities: capabilitiesArray.length ? capabilitiesArray : [t('studio.defaultCapFallback')],
      performance: {
        roi: 0,
        tvl: 0
      },
      revenueModel: revModel,
      githubUrl: github || undefined,
      avatarUrl: `https://api.dicebear.com/7.x/bottts/svg?seed=${name}`
    });

    // Cruise into Launch Spark config, passing state
    navigate('/launch/create', { state: { agentId: newAgent.id, agentName: newAgent.name, agentTicker: newAgent.ticker, desc: newAgent.description } });
  };

  // If unauthorized state
  if (!isConnected) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center space-y-6 animate-in fade-in duration-200">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-[#635BFF] to-sky-400 p-0.5 flex items-center justify-center mx-auto shadow-xl shadow-[#635BFF]/10">
          <div className="w-full h-full bg-[#090A13] rounded-[14px] flex items-center justify-center">
            <Bot size={28} className="text-[#635BFF]" />
          </div>
        </div>
        <div className="space-y-2">
          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">{t('studio.authTitle')}</h2>
          <p className="text-xs sm:text-sm text-gray-400 max-w-md mx-auto leading-relaxed">
            {t('studio.authDesc')}
          </p>
        </div>
        <div className="pt-2">
          <button
            onClick={handleWalletFallback}
            className="px-6 py-2.5 bg-[#635BFF] hover:bg-[#5048E5] text-white rounded-full text-xs sm:text-sm font-semibold shadow-lg shadow-[#635BFF]/20 transition cursor-pointer"
          >
            {t('studio.authCTA')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6 text-left select-none animate-in fade-in duration-200">
      <div className="border-b border-[#1E2140] pb-5">
        <div className="flex items-center gap-2">
          <span className="p-1 px-1.5 bg-[#635BFF]/10 rounded border border-[#635BFF]/30 text-xs font-mono font-bold text-[#837BFF]">STAGE 1</span>
          <h1 className="text-2xl font-black text-white tracking-tight">{t('studio.pageTitle')}</h1>
        </div>
        <p className="text-xs text-gray-400 mt-1">
          {t('studio.pageDesc')}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Configurations column */}
        <div className="lg:col-span-7 bg-[#0C0E1D] border border-[#1C203E] rounded-2xl p-6 space-y-5">
          <div className="border-b border-[#1C203E] pb-3">
            <h3 className="text-sm font-bold text-gray-200 tracking-tight flex items-center gap-2">
              <Code2 size={16} className="text-[#635BFF]" />
              <span>{t('studio.basicInfoTitle')}</span>
            </h3>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5 text-left">
              <label className="text-xs text-gray-400 font-semibold font-sans">{t('studio.agentNameLabel')}</label>
              <input
                type="text"
                placeholder={t('studio.agentNamePlaceholder')}
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-[#121429] border border-[#24284D] focus:border-[#635BFF] outline-none rounded-xl px-3 py-2 text-xs transition"
              />
            </div>
            <div className="space-y-1.5 text-left">
              <label className="text-xs text-gray-400 font-semibold">{t('studio.tickerLabel')}</label>
              <input
                type="text"
                placeholder={t('studio.tickerPlaceholder')}
                value={ticker}
                onChange={(e) => setTicker(e.target.value)}
                maxLength={6}
                className="w-full bg-[#121429] border border-[#24284D] focus:border-[#635BFF] outline-none rounded-xl px-3 py-2 text-xs transition font-mono uppercase"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5 text-left">
              <label className="text-xs text-gray-400 font-semibold">{t('studio.categoryLabel')}</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as any)}
                className="w-full bg-[#121429] border border-[#24284D] focus:border-[#635BFF] outline-none rounded-xl px-3 py-2 text-xs text-gray-300 transition cursor-pointer"
              >
                <option value="数据分析">{translateCategory('数据分析')}</option>
                <option value="交易工具">{translateCategory('交易工具')}</option>
                <option value="社交">{translateCategory('社交')}</option>
                <option value="监控">{translateCategory('监控')}</option>
                <option value="基础设施">{translateCategory('基础设施')}</option>
                <option value="创作工具">{translateCategory('创作工具')}</option>
                <option value="DeFi">DeFi</option>
              </select>
            </div>
            <div className="space-y-1.5 text-left">
              <label className="text-xs text-gray-400 font-semibold">{t('studio.modelArchLabel')}</label>
              <select
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="w-full bg-[#121429] border border-[#24284D] focus:border-[#635BFF] outline-none rounded-xl px-3 py-2 text-xs text-gray-300 transition cursor-pointer"
              >
                <option value="Gemini 2.5 Flash">Gemini 2.5 Flash</option>
                <option value="DeepSeek V3 / R1">DeepSeek V3 / R1</option>
                <option value="Llama 3 70B">Llama 3 70B (Anthropic Adapter)</option>
                <option value="Solis FunC Custom VM">Solis FunC Custom VM</option>
              </select>
            </div>
          </div>

          <div className="space-y-1.5 text-left">
            <label className="text-xs text-gray-400 font-semibold">{t('studio.descLabel')}</label>
            <textarea
              placeholder={t('studio.descPlaceholder')}
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              rows={3}
              className="w-full bg-[#121429] border border-[#24284D] focus:border-[#635BFF] outline-none rounded-xl px-3 py-2 text-xs transition font-sans"
            />
          </div>

          <div className="space-y-1.5 text-left">
            <label className="text-xs text-gray-400 font-semibold">{t('studio.capsLabel')}</label>
            <input
              type="text"
              placeholder={t('studio.capsPlaceholder')}
              value={caps}
              onChange={(e) => setCaps(e.target.value)}
              className="w-full bg-[#121429] border border-[#24284D] focus:border-[#635BFF] outline-none rounded-xl px-3 py-2 text-xs transition"
            />
          </div>

          <div className="space-y-1.5 text-left">
            <label className="text-xs text-gray-400 font-semibold">{t('studio.revenueModelLabel')}</label>
            <input
              type="text"
              placeholder={t('studio.revenueModelPlaceholder')}
              value={revModel}
              onChange={(e) => setRevModel(e.target.value)}
              className="w-full bg-[#121429] border border-[#24284D] focus:border-[#635BFF] outline-none rounded-xl px-3 py-2 text-xs transition"
            />
          </div>

          <div className="space-y-1.5 text-left">
            <label className="text-xs text-gray-400 font-semibold">{t('studio.githubLabel')}</label>
            <div className="relative">
              <GitBranch size={13} className="absolute left-3.5 top-3.5 text-gray-500" />
              <input
                type="text"
                placeholder={t('studio.githubPlaceholder')}
                value={github}
                onChange={(e) => setGithub(e.target.value)}
                className="w-full bg-[#121429] border border-[#24284D] focus:border-[#635BFF] outline-none rounded-xl pl-8 pr-3 py-2.5 text-xs transition font-mono"
              />
            </div>
          </div>

          <div className="pt-2">
            <button
              onClick={executeCompile}
              disabled={compiling}
              className="w-full py-2.5 bg-gradient-to-r from-[#635BFF] to-[#867EFF] disabled:from-[#2e2a5fc5] disabled:to-[#1a1b2e] disabled:text-gray-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-[#635BFF]/10 active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer font-sans"
            >
              <Play size={13} />
              <span>{compiling ? t('studio.compilingCTA') : t('studio.compileCTA')}</span>
            </button>
          </div>
        </div>

        {/* Live Compilation screen terminal */}
        <div className="lg:col-span-5 h-[530px] bg-[#07080F] border border-[#212445] rounded-2xl flex flex-col overflow-hidden shadow-2xl">
          <div className="bg-[#10132B] px-4 py-2.5 border-b border-[#212445] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Terminal size={14} className="text-[#635BFF]" />
              <span className="text-xs text-gray-200 font-mono font-bold">LIVE STAGE DEPLOYMENT TERMINAL</span>
            </div>
            <div className="flex gap-1.5">
              <span className="w-2 h-2 rounded-full bg-rose-500" />
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
            </div>
          </div>

          <div className="flex-1 p-4 font-mono text-[11px] space-y-2 overflow-y-auto bg-[#07080E] text-[#B5F5D0] border-b border-[#212445] text-left scrollbar-thin">
            {terminalLogs.length === 0 ? (
              <div className="text-gray-500 flex flex-col items-center justify-center h-full gap-2 font-sans">
                <Cpu size={24} className="text-gray-700 animate-pulse" />
                <p>{t('studio.waitingText')}</p>
              </div>
            ) : (
              terminalLogs.map((log, i) => (
                <div key={i} className="leading-relaxed border-l-2 border-[#1E4334] pl-2 animate-in fade-in slide-in-from-left-2 duration-100 font-mono">
                  {log}
                </div>
              ))
            )}

            {compiling && (
              <div className="text-sky-400 mt-2 flex items-center gap-1.5 animate-pulse font-mono">
                <span>⚡ COMPILING RUST/FunC CONTAINER MODULES...</span>
              </div>
            )}
          </div>

          {/* Compile complete notification */}
          {compileSuccess && compiledAddress && (
            <div className="p-4 bg-[#0F221B]/90 border-t border-[#1F4133] animate-in slide-in-from-bottom duration-200 text-left space-y-3 font-sans">
              <div className="flex items-start gap-2.5">
                <CheckCircle2 size={16} className="text-[#3FCF8E] shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <h4 className="text-xs font-bold text-white">{t('studio.successTitle')}</h4>
                  <p className="text-[10px] text-gray-400 mt-0.5">{t('studio.successDesc')}</p>
                  <p className="text-[10px] text-[#3FCF8E] font-mono select-all truncate mt-1 bg-[#091510] p-1 rounded border border-[#234B3B]/40">
                    {compiledAddress}
                  </p>
                </div>
              </div>

              <button
                onClick={handlePublishAndCofund}
                className="w-full py-2 bg-[#3FCF8E] hover:bg-[#32B87D] text-black rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer"
              >
                <span>{t('studio.nextCTA')}</span>
                <ArrowRight size={13} />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
