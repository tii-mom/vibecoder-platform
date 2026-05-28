import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bot, Cpu, GitBranch, ArrowRight, CheckCircle2, AlertTriangle, Terminal, Code2, Play } from 'lucide-react';
import { useUserStore } from '../store/userStore';
import { useAgentStore } from '../store/agentStore';

export default function StudioPage() {
  const navigate = useNavigate();
  const { isConnected, walletAddress, connectWallet } = useUserStore();
  const { addAgent } = useAgentStore();

  const [name, setName] = useState('');
  const [ticker, setTicker] = useState('');
  const [category, setCategory] = useState<'数据分析' | '交易工具' | '社交' | '监控' | '基础设施' | '创作工具' | 'DeFi'>('交易工具');
  const [desc, setDesc] = useState('');
  const [caps, setCaps] = useState<string>('舆情情感分析, 链上合约策略');
  const [revModel, setRevModel] = useState('50% 按代发金库自动每日派单，20% 回购');
  const [model, setModel] = useState('Gemini 2.5 Flash');
  const [github, setGithub] = useState('');
  
  // Terminal simulator states
  const [compiling, setCompiling] = useState(false);
  const [terminalLogs, setTerminalLogs] = useState<string[]>([]);
  const [compiledAddress, setCompiledAddress] = useState('');
  const [compileSuccess, setCompileSuccess] = useState(false);

  const handleWalletFallback = () => {
    connectWallet();
  };

  const executeCompile = () => {
    if (!name || !ticker || !desc) {
      alert("请完整填写 Agent 核心名称、代币缩写与描述信息。");
      return;
    }

    setCompiling(true);
    setCompileSuccess(false);
    setTerminalLogs([]);
    setCompiledAddress('');

    const logs = [
      `[09:00:01] ⚡ 启动 VibeCoder 远端安全编译沙箱...`,
      `[09:00:02] 📦 正在拉取存储库: ${github || 'VibeCoder/default-agent-runtime'}`,
      `[09:00:03] 🔍 寻找基准编译工具链并进行静态审查...`,
      `[09:00:04] 🔄 正在微调编译依赖：解析 ${model} 指令集套件`,
      `[09:00:05] ⚡ 正在编译 TON/FunC 底层智能钱包收支托管合约...`,
      `[09:00:06] 🛠️ 生成 ABI 签名以及分配地址路由通道代码...`,
      `[09:00:07] 🐳 代码审计：合约状态机检查完毕。零溢出风险。`,
      `[09:00:08] 🎉 部署阶段：已自动向 TON 生态多签网络注册充能`
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
      capabilities: capabilitiesArray.length ? capabilitiesArray : ["链上全自治运行"],
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
      <div className="max-w-2xl mx-auto px-4 py-16 text-center space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-[#635BFF] to-sky-400 p-0.5 flex items-center justify-center mx-auto shadow-xl shadow-[#635BFF]/10">
          <div className="w-full h-full bg-[#090A13] rounded-[14px] flex items-center justify-center">
            <Bot size={28} className="text-[#635BFF]" />
          </div>
        </div>
        <div className="space-y-2">
          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">授权当前工作区</h2>
          <p className="text-xs sm:text-sm text-gray-400 max-w-md mx-auto leading-relaxed">
            创建及编译 AI 机器人智能合约需要接入你的 TON 区块链地址。请先连接你的钱包。
          </p>
        </div>
        <div className="pt-2">
          <button
            onClick={handleWalletFallback}
            className="px-6 py-2.5 bg-[#635BFF] hover:bg-[#5048E5] text-white rounded-full text-xs sm:text-sm font-semibold shadow-lg shadow-[#635BFF]/20 transition cursor-pointer"
          >
            Connect TON Wallet
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6 text-left">
      <div className="border-b border-[#1E2140] pb-5">
        <div className="flex items-center gap-2">
          <span className="p-1 px-1.5 bg-[#635BFF]/10 rounded border border-[#635BFF]/30 text-xs font-mono font-bold text-[#837BFF]">STAGE 1</span>
          <h1 className="text-2xl font-black text-white tracking-tight">Agent Studio</h1>
        </div>
        <p className="text-xs text-gray-400 mt-1">
          配置你的大模型交互指令集，对代码进行静态评估并生成能在 TON 区块链底层进行自动分配与结算的智能钱包。
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Configurations column */}
        <div className="lg:col-span-7 bg-[#0C0E1D] border border-[#1C203E] rounded-2xl p-6 space-y-5">
          <div className="border-b border-[#1C203E] pb-3">
            <h3 className="text-sm font-bold text-gray-200 tracking-tight flex items-center gap-2">
              <Code2 size={16} className="text-[#635BFF]" />
              <span>基本信息与参数设定</span>
            </h3>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5 text-left">
              <label className="text-xs text-gray-400 font-semibold font-sans">机器人名称 (Agent Name) *</label>
              <input
                type="text"
                placeholder="例如 TrendBot Pro"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-[#121429] border border-[#24284D] focus:border-[#635BFF] outline-none rounded-xl px-3 py-2 text-xs transition"
              />
            </div>
            <div className="space-y-1.5 text-left">
              <label className="text-xs text-gray-400 font-semibold">代币交易缩写 (Ticker) *</label>
              <input
                type="text"
                placeholder="例如 TBP"
                value={ticker}
                onChange={(e) => setTicker(e.target.value)}
                maxLength={6}
                className="w-full bg-[#121429] border border-[#24284D] focus:border-[#635BFF] outline-none rounded-xl px-3 py-2 text-xs transition font-mono uppercase"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5 text-left">
              <label className="text-xs text-gray-400 font-semibold">首选分类 (Category)</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as any)}
                className="w-full bg-[#121429] border border-[#24284D] focus:border-[#635BFF] outline-none rounded-xl px-3 py-2 text-xs text-gray-300 transition cursor-pointer"
              >
                <option value="数据分析">数据分析 (Data Analyst)</option>
                <option value="交易工具">交易工具 (Trading Strategy)</option>
                <option value="社交">社交 (Social Content)</option>
                <option value="监控">监控 (Auditing/Guard)</option>
                <option value="基础设施">基础设施 (Infrastructure Node)</option>
                <option value="创作工具">创作工具 (Bot Generator)</option>
                <option value="DeFi">DeFi (Pool Router)</option>
              </select>
            </div>
            <div className="space-y-1.5 text-left">
              <label className="text-xs text-gray-400 font-semibold">大模型架构 (Model Architecture)</label>
              <select
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="w-full bg-[#121429] border border-[#24284D] focus:border-[#635BFF] outline-none rounded-xl px-3 py-2 text-xs text-gray-300 transition cursor-pointer"
              >
                <option value="Gemini 2.5 Flash">Gemini 2.5 Flash</option>
                <option value="DeepSeek V3 / R1">DeepSeek V3 / R1</option>
                <option value="Llama 3 70B">Llama 3 70B (Anthropic Adapter)</option>
                <option value="Solis FunC Custom VM">Solis FunC 专有虚拟机</option>
              </select>
            </div>
          </div>

          <div className="space-y-1.5 text-left">
            <label className="text-xs text-gray-400 font-semibold">机器人功能概述 (Description) *</label>
            <textarea
              placeholder="请详细描述该 Agent 功能机制，例如在什么池子里高频量化策略、服务接口收费比例，以提供星火共建参考..."
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              rows={3}
              className="w-full bg-[#121429] border border-[#24284D] focus:border-[#635BFF] outline-none rounded-xl px-3 py-2 text-xs transition font-sans"
            />
          </div>

          <div className="space-y-1.5 text-left">
            <label className="text-xs text-gray-400 font-semibold">功能特性标签Capabilities（英文逗号分割）</label>
            <input
              type="text"
              placeholder="舆情情感分析, 多协议跨池对冲, 闪电清算预警"
              value={caps}
              onChange={(e) => setCaps(e.target.value)}
              className="w-full bg-[#121429] border border-[#24284D] focus:border-[#635BFF] outline-none rounded-xl px-3 py-2 text-xs transition"
            />
          </div>

          <div className="space-y-1.5 text-left">
            <label className="text-xs text-gray-400 font-semibold">金库结算分配策略 (Revenue Sharing Model)</label>
            <input
              type="text"
              placeholder="例如：60% 派发给持股人，30% 转为二次算力升级，10% 归属开发团队"
              value={revModel}
              onChange={(e) => setRevModel(e.target.value)}
              className="w-full bg-[#121429] border border-[#24284D] focus:border-[#635BFF] outline-none rounded-xl px-3 py-2 text-xs transition"
            />
          </div>

          <div className="space-y-1.5 text-left">
            <label className="text-xs text-gray-400 font-semibold">源代码库 GitHub 地址 (代码需开源透明)</label>
            <div className="relative">
              <GitBranch size={13} className="absolute left-3.5 top-3.5 text-gray-500" />
              <input
                type="text"
                placeholder="https://github.com/username/your-agent"
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
              className="w-full py-2.5 bg-gradient-to-r from-[#635BFF] to-[#867EFF] disabled:from-[#2e2a5fc5] disabled:to-[#1a1b2e] disabled:text-gray-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-[#635BFF]/10 active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Play size={13} />
              <span>{compiling ? '正在安全静态编译...' : '编译代码并进行虚拟节点链上部署'}</span>
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
                <p>等待填参就绪编译...</p>
              </div>
            ) : (
              terminalLogs.map((log, i) => (
                <div key={i} className="leading-relaxed border-l-2 border-[#1E4334] pl-2 animate-in fade-in slide-in-from-left-2 duration-100">
                  {log}
                </div>
              ))
            )}

            {compiling && (
              <div className="text-sky-400 mt-2 flex items-center gap-1.5 animate-pulse">
                <span>⚡ COMPILING RUST/FunC CONTAINER MODULES...</span>
              </div>
            )}
          </div>

          {/* Compile complete notification */}
          {compileSuccess && compiledAddress && (
            <div className="p-4 bg-[#0F221B]/90 border-t border-[#1F4133] animate-in slide-in-from-bottom duration-200 text-left space-y-3">
              <div className="flex items-start gap-2.5">
                <CheckCircle2 size={16} className="text-[#3FCF8E] shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <h4 className="text-xs font-bold text-white">沙箱网络虚拟托管成功!</h4>
                  <p className="text-[10px] text-gray-400 mt-0.5">你的 Agent 代入合约已在 TON 链生成了独立安全的底层冷金库：</p>
                  <p className="text-[10px] text-[#3FCF8E] font-mono select-all truncate mt-1 bg-[#091510] p-1 rounded border border-[#234B3B]/40">
                    {compiledAddress}
                  </p>
                </div>
              </div>
              
              <button
                onClick={handlePublishAndCofund}
                className="w-full py-2 bg-[#3FCF8E] hover:bg-[#32B87D] text-black rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer"
              >
                <span>下一步：发起星火共建流动性</span>
                <ArrowRight size={13} />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
