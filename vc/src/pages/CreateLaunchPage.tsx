import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { 
  Coins, Sparkles, AlertTriangle, ArrowLeft, Bot, 
  ArrowRight, HelpCircle, HardDrive, ShieldCheck, 
  Check, Calendar, Users, Percent, ShieldAlert 
} from 'lucide-react';
import { useUserStore } from '../store/userStore';
import { useAgentStore } from '../store/agentStore';
import { useSparkStore } from '../store/sparkStore';

export default function CreateLaunchPage() {
  const location = useLocation();
  const navigate = useNavigate();
  
  const { isConnected, walletAddress, connectWallet } = useUserStore();
  const { agents, updateAgentStatus } = useAgentStore();
  const { addProject } = useSparkStore();

  const stateData = location.state as { agentId?: string; agentName?: string; agentTicker?: string; desc?: string } | null;

  // Wizard Step State
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  // STEP 1 FIELDS: Profile
  const [selectedAgentId, setSelectedAgentId] = useState<string>(stateData?.agentId || '');
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<'数据分析' | '交易工具' | '社交' | '监控' | '基础设施' | '创作工具' | 'DeFi'>('数据分析');
  const [tagsInput, setTagsInput] = useState<string>('#TON, #AI');
  const [campaignDesc, setCampaignDesc] = useState('');
  const [teamDesc, setTeamDesc] = useState('');

  // STEP 2 FIELDS: Financials & Milestones
  const [targetAmount, setTargetAmount] = useState<string>('5000');
  const [hardCap, setHardCap] = useState<string>('8000');
  const [useOfFunds, setUseOfFunds] = useState<Array<{ name: string; percentage: number; desc: string }>>([
    { name: "模型开发部署", percentage: 50, desc: "用于租用GPU及Fine-tune模型" },
    { name: "合约审计与做市", percentage: 40, desc: "满足初始AMM与安全多签储备" },
    { name: "日常节点运维", percentage: 10, desc: "处理Telegram及高频API网关" },
  ]);
  const [milestones, setMilestones] = useState<Array<{ title: string; condition: string; releaseRadio: number; status: 'pending' | 'completed' | 'ongoing' }>>([
    { title: "阶段 1: 概念核心发布", condition: "提供可编译FunC合约代码", releaseRadio: 25, status: 'ongoing' },
    { title: "阶段 2: 链上部署测试", condition: "在主网发布测试中继路由", releaseRadio: 25, status: 'pending' },
    { title: "阶段 3: 流动性池注入", condition: "全额代币打底初始做市", releaseRadio: 25, status: 'pending' },
    { title: "阶段 4: 已分配份额自动分配", condition: "开启首轮持有者共建分配", releaseRadio: 25, status: 'pending' },
  ]);

  // STEP 3 FIELDS: Terms & Ratios
  const [assuranceMode, setAssuranceMode] = useState<'staked' | 'unstaked'>('staked');
  const [tokenPrice, setTokenPrice] = useState<string>('0.01'); // 1 Token = 0.01 TON
  const [totalSupply, setTotalSupply] = useState<string>('100000000'); // Default 100M tokens
  const [minInvestment, setMinInvestment] = useState<string>('5');
  const [duration, setDuration] = useState<string>('15');

  // Success indicator
  const [success, setSuccess] = useState(false);

  // Sync details if selectedAgentId changes
  useEffect(() => {
    if (selectedAgentId) {
      const found = agents.find(a => a.id === selectedAgentId);
      if (found) {
        if (!title) {
          setTitle(`${found.name} ($${found.ticker}) 创世代币共建计划`);
        }
        if (!campaignDesc) {
          setCampaignDesc(`本共建旨在为 ${found.name} 提供创世做市储备。支持者将按照 1 TON = ${tokenPrice ? Math.floor(1 / Number(tokenPrice)) : 100} ${found.ticker} 锁定创世纪代币，同时享受该智能体机器人未来产生的已分配份额与记录。`);
        }
        if (!teamDesc) {
          setTeamDesc(`VibeCoder ${found.name} 自治工作室，由 3 名具有多年 TON / FunC 部署经验的白帽子与深度学习研究员发起。`);
        }
      }
    }
  }, [selectedAgentId, agents, title, campaignDesc, tokenPrice]);

  const handleWalletFallback = () => {
    connectWallet();
  };

  const draftAgents = agents.filter(a => a.status === 'draft' || a.status === 'funding');

  const nextStep = () => {
    if (step === 1) {
      if (!selectedAgentId) {
        alert("请先选择一个编译成功的 AI Agent 实例！");
        return;
      }
      if (!title.trim() || !campaignDesc.trim()) {
        alert("请确保完整填报共建标题和详情介绍");
        return;
      }
      setStep(2);
    } else if (step === 2) {
      const g = Number(targetAmount);
      if (isNaN(g) || g <= 0) {
        alert("请设定正确的目标星火共建总 TON 金额");
        return;
      }
      setStep(3);
    } else if (step === 3) {
      const p = Number(tokenPrice);
      if (isNaN(p) || p <= 0) {
        alert("请设定有效的代币兑购参数");
        return;
      }
      setStep(4);
    }
  };

  const handleCreateProject = () => {
    if (!isConnected) {
      handleWalletFallback();
      return;
    }

    const matchedAgent = agents.find(a => a.id === selectedAgentId);
    if (!matchedAgent) return;

    // Split tags block from string
    const tagsArr = tagsInput.split(',').map(s => s.trim()).filter(Boolean);

    // Write campaign into state Store
    addProject({
      agentId: selectedAgentId,
      agentName: matchedAgent.name,
      agentTicker: matchedAgent.ticker,
      title,
      description: campaignDesc,
      goalAmount: Number(targetAmount),
      minInvestment: Number(minInvestment) || 5,
      endTime: new Date(Date.now() + Number(duration) * 24 * 3600 * 1000).toISOString(),
      creatorAddress: walletAddress || 'EqD_creator_88c_tOnKy',
      tokenPrice: Number(tokenPrice) || 0.01,
      category,
      tags: tagsArr,
      assuranceMode,
      milestones,
      useOfFunds,
      teamDesc,
      totalSupply: Number(totalSupply) || 100000000,
    });

    // Update agent status in StudioPage state
    updateAgentStatus(selectedAgentId, 'funding');

    setSuccess(true);
    setTimeout(() => {
      navigate('/launch');
    }, 1800);
  };

  if (!isConnected) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center space-y-6">
        <Bot size={48} className="text-[#635BFF] mx-auto animate-pulse" />
        <h2 className="text-xl font-black text-white">授权当前工作区金库</h2>
        <p className="text-xs text-gray-400 max-w-sm mx-auto leading-relaxed">
          发布共建计划需要冷储备钱包签名，以便将代币分配规则和开发保障押金锁进中继智能合约。请先连接您的 TON 钱包或开发者网关。
        </p>
        <button
          onClick={handleWalletFallback}
          className="px-6 py-2.5 bg-[#635BFF] hover:bg-[#5048E5] text-white text-xs font-bold rounded-xl transition"
        >
          连接开发者钱包 Connect TON Wallet
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6 text-left select-none animate-in fade-in duration-200">
      {/* Upper header */}
      <div className="border-b border-[#1A1F42] pb-4">
        <Link to="/launch" className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-white mb-2 font-semibold">
          <ArrowLeft size={12} />
          <span>返回 Launch 项目列表</span>
        </Link>
        <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
          <Sparkles className="text-[#635BFF]" size={22} />
          <span>申请发起 4-Step 代币共建 (Wizard)</span>
        </h1>
        <p className="text-xs text-gray-400 mt-1">
          多步骤智能向导支持。设置您的代币认购估值比例，并核数 Milestones 安全解锁里程碑，开始接收全网社区联合共建。
        </p>
      </div>

      {success ? (
        <div className="bg-[#0B151F] border border-emerald-900/60 p-8 rounded-2xl text-center space-y-4 animate-in zoom-in-95 leading-normal">
          <ShieldCheck size={48} className="text-emerald-400 mx-auto animate-bounce" />
          <h2 className="text-lg font-black text-white">🎉 4-Step 星火合约发布就绪!</h2>
          <p className="text-xs text-gray-400 max-w-md mx-auto leading-relaxed">
            恭喜！里程碑、预质押策略以及资金结构已经合规生成并广播。正在瞬间更新本地 TON 沙盒块，将前往展示台...
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Top Wizard Steps indicator tabs */}
          <div className="grid grid-cols-4 gap-2 bg-[#0A0D18] p-1 rounded-xl border border-[#191D3C]">
            <button
              onClick={() => setStep(1)}
              className={`py-2 text-[10.5px] font-bold rounded-lg transition text-center ${
                step === 1 ? 'bg-[#1C1A3F] text-white' : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              1. 基础画像 (Info)
            </button>
            <button
              onClick={() => selectedAgentId ? setStep(2) : alert("请先在第一步选择Agent")}
              className={`py-2 text-[10.5px] font-bold rounded-lg transition text-center ${
                step === 2 ? 'bg-[#1C1A3F] text-white' : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              2. 目标与里程碑
            </button>
            <button
              onClick={() => selectedAgentId ? setStep(3) : alert("请先在第一步选择Agent")}
              className={`py-2 text-[10.5px] font-bold rounded-lg transition text-center ${
                step === 3 ? 'bg-[#1C1A3F] text-white' : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              3. 保障机制 (Terms)
            </button>
            <button
              onClick={() => selectedAgentId ? setStep(4) : alert("请先在第一步选择Agent")}
              className={`py-2 text-[10.5px] font-bold rounded-lg transition text-center ${
                step === 4 ? 'bg-[#1C1A3F] text-white' : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              4. 预览与校验
            </button>
          </div>

          {/* Core steps content card */}
          <div className="bg-[#0C0E1D] border border-[#1C2045] p-6 rounded-2xl text-left space-y-6">

            {/* STEP 1 SECTION: Basic Profile */}
            {step === 1 && (
              <div className="space-y-5 animate-in fade-in duration-100">
                <div className="flex items-center gap-2 border-b border-[#212450] pb-2">
                  <Bot size={16} className="text-[#635BFF]" />
                  <h3 className="text-xs font-bold text-white uppercase font-sans">Step 1: 绑定智能体基础信息与资质</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-1.5 text-left">
                    <label className="text-xs text-gray-400 font-semibold block">绑定已编译上链的 AI Agent *</label>
                    <select
                      value={selectedAgentId}
                      onChange={(e) => setSelectedAgentId(e.target.value)}
                      className="w-full bg-[#121429] border border-[#24284D] focus:border-[#635BFF] outline-none rounded-xl px-3.5 py-2.5 text-xs text-gray-200 cursor-pointer"
                    >
                      <option value="">-- 请指定要募集流动性的草稿智能体 --</option>
                      {draftAgents.map((ag) => (
                        <option key={ag.id} value={ag.id}>
                          {ag.name} (${ag.ticker}) - {ag.category} [GitHub: {ag.githubUrl ? '已绑定' : '未声明'}]
                        </option>
                      ))}
                    </select>
                    {draftAgents.length === 0 && (
                      <span className="text-[10px] text-amber-500 block leading-normal mt-1">
                        ⚠️ 沙箱检测：您的账户当前尚未创造出可流转的 Draft 特征代码。请前往 <strong>“Agent Studio” 模块</strong> 输入提示词配置。
                      </span>
                    )}
                  </div>

                  <div className="space-y-1.5 text-left">
                    <label className="text-xs text-gray-400 font-semibold block">选择展示主分类 *</label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value as any)}
                      className="w-full bg-[#121429] border border-[#24284D] focus:border-[#635BFF] outline-none rounded-xl px-3.5 py-2.5 text-xs text-gray-200 cursor-pointer"
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
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-1.5 text-left">
                    <label className="text-xs text-gray-400 font-semibold block">共建公开展示标题 *</label>
                    <input
                      type="text"
                      placeholder="例: OmniSocial 2.0 智能推特网红共建一期"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="w-full bg-[#121429] border border-[#24284D] focus:border-[#635BFF] outline-none rounded-xl px-3.5 py-2.5 text-xs text-gray-200"
                    />
                  </div>
                  <div className="space-y-1.5 text-left">
                    <label className="text-xs text-gray-400 font-semibold block">引流标签汇 (Tags split by comma) *</label>
                    <input
                      type="text"
                      placeholder="#TON, #AI, #博弈"
                      value={tagsInput}
                      onChange={(e) => setTagsInput(e.target.value)}
                      className="w-full bg-[#121429] border border-[#24284D] focus:border-[#635BFF] outline-none rounded-xl px-3.5 py-2.5 text-xs text-gray-200"
                    />
                  </div>
                </div>

                <div className="space-y-1.5 text-left">
                  <label className="text-xs text-gray-400 font-semibold block">共建背景与未来分配描述 (Description) *</label>
                  <textarea
                    placeholder="请输入对支持者的利益和分配阐释。支持者怎样按代币份额分享该 AI 自治分配记录..."
                    value={campaignDesc}
                    onChange={(e) => setCampaignDesc(e.target.value)}
                    rows={3}
                    className="w-full bg-[#121429] border border-[#24284D] focus:border-[#635BFF] outline-none rounded-xl p-3 text-xs text-gray-200 resize-none"
                  />
                </div>

                <div className="space-y-1.5 text-left">
                  <label className="text-xs text-gray-400 font-semibold block">团队和研发实绩声明 (Developer Background)</label>
                  <input
                    type="text"
                    placeholder="例: 顶级FunC密码极客，3年分布式底层编写经验..."
                    value={teamDesc}
                    onChange={(e) => setTeamDesc(e.target.value)}
                    className="w-full bg-[#121429] border border-[#24284D] focus:border-[#635BFF] outline-none rounded-xl px-3.5 py-2.5 text-xs text-gray-200"
                  />
                </div>
              </div>
            )}

            {/* STEP 2 SECTION: Financials & Milestones */}
            {step === 2 && (
              <div className="space-y-5 animate-in fade-in duration-100">
                <div className="flex items-center gap-2 border-b border-[#212450] pb-2">
                  <Percent size={16} className="text-[#10B981]" />
                  <h3 className="text-xs font-bold text-white uppercase font-sans">Step 2: 融资规模指标与分摊里程碑</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-1.5 text-left">
                    <label className="text-xs text-gray-400 font-semibold block">筹资底线目标 (Funding Target) *</label>
                    <div className="relative">
                      <input
                        type="number"
                        placeholder="5000"
                        value={targetAmount}
                        onChange={(e) => setTargetAmount(e.target.value)}
                        className="w-full bg-[#121429] border border-[#24284D] focus:border-[#635BFF] text-white font-mono text-xs rounded-xl px-3.5 py-2.5 outline-none transition"
                      />
                      <span className="absolute right-3.5 top-3 text-[10px] text-gray-500 font-mono">TON</span>
                    </div>
                  </div>

                  <div className="space-y-1.5 text-left">
                    <label className="text-xs text-gray-400 font-semibold block">超募硬顶上限 (Hard Cap) *</label>
                    <div className="relative">
                      <input
                        type="number"
                        placeholder="8000"
                        value={hardCap}
                        onChange={(e) => setHardCap(e.target.value)}
                        className="w-full bg-[#121429] border border-[#24284D] focus:border-[#635BFF] text-white font-mono text-xs rounded-xl px-3.5 py-2.5 outline-none transition"
                      />
                      <span className="absolute right-3.5 top-3 text-[10px] text-gray-500 font-mono">TON</span>
                    </div>
                  </div>
                </div>

                {/* Fund allocation breakdown list */}
                <div className="space-y-2.5 text-left">
                  <span className="text-[10.5px] font-mono text-gray-500 uppercase block">预分配资金用途 (Use of Funds Breakdown)</span>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {useOfFunds.map((u, i) => (
                      <div key={i} className="bg-[#121429] p-3 rounded-xl border border-[#22264E] text-left">
                        <span className="text-xs text-white font-bold block">{u.name}</span>
                        <span className="text-xs font-mono font-black text-sky-400 mt-0.5 block">{u.percentage}% 比例值</span>
                        <span className="text-[9.5px] text-gray-500 mt-1 block leading-normal">{u.desc}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Milestones timeline overview config */}
                <div className="space-y-3 pt-2 text-left">
                  <h4 className="text-xs font-bold text-gray-300">防回撤! 4 阶段资金解锁里程碑监控排程 (4-Phase Milestones Schedule)</h4>
                  <div className="space-y-2.5">
                    {milestones.map((ms, index) => (
                      <div key={index} className="flex gap-3 items-center bg-[#101227] p-2.5 rounded-xl border border-[#232750] text-xs font-mono">
                        <span className="w-5 h-5 rounded-full bg-sky-500/15 text-sky-400 flex items-center justify-center font-bold text-[10px]">
                          P{index + 1}
                        </span>
                        <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-2 text-left">
                          <div>
                            <span className="text-[9px] text-gray-500 block">解锁事项</span>
                            <span className="text-[11px] text-gray-200 font-sans font-bold">{ms.title}</span>
                          </div>
                          <div>
                            <span className="text-[9px] text-gray-500 block">前置卡口条件</span>
                            <span className="text-[10px] text-gray-400 font-sans truncate">{ms.condition}</span>
                          </div>
                          <div>
                            <span className="text-[9px] text-gray-500 block">释放比例金额</span>
                            <span className="text-[11px] text-[#10B981] font-bold">解锁全额的 {ms.releaseRadio}%</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* STEP 3 SECTION: Security assurances & terms */}
            {step === 3 && (
              <div className="space-y-5 animate-in fade-in duration-100">
                <div className="flex items-center gap-2 border-b border-[#212450] pb-2">
                  <ShieldCheck size={16} className="text-amber-500" />
                  <h3 className="text-xs font-bold text-white uppercase font-sans">Step 3: 锁仓保障机制与星火共建期限参数</h3>
                </div>

                {/* Interactive assurance terms selector */}
                <div className="space-y-2.5 text-left">
                  <label className="text-xs text-gray-400 font-semibold block">支持者退款返还保障策略 *</label>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Staked option */}
                    <div 
                      onClick={() => setAssuranceMode('staked')}
                      className={`p-4 rounded-xl border transition-all cursor-pointer flex gap-3 ${
                        assuranceMode === 'staked' 
                          ? 'bg-[#121E23]/30 border-[#10B981] shadow-lg shadow-[#10B981]/5' 
                          : 'bg-[#121429] border-transparent hover:border-gray-500'
                      }`}
                    >
                      <div className="p-1 px-1.5 bg-emerald-500/10 text-emerald-400 rounded-lg h-fit text-xs font-mono font-bold mt-1">
                        RECOMMEND
                      </div>
                      <div className="text-left font-sans space-y-1">
                        <span className="text-[11.5px] font-black text-white flex items-center gap-1">
                          <span>Developer Staked 预押保底保障</span>
                          <ShieldCheck size={12} className="text-emerald-400" />
                        </span>
                        <p className="text-[10px] text-gray-400 leading-relaxed">
                          由平台及全网多签核数里程碑。开发者须质押一部分 $VC 押金，且平台收缴最惠手续费 <strong>5%</strong>。未达成里程碑则返还冷储备退还给支持者。
                        </p>
                      </div>
                    </div>

                    {/* Unstaked option */}
                    <div 
                      onClick={() => setAssuranceMode('unstaked')}
                      className={`p-4 rounded-xl border transition-all cursor-pointer flex gap-3 ${
                        assuranceMode === 'unstaked' 
                          ? 'bg-[#1F121C]/30 border-rose-500 shadow-lg shadow-rose-500/5' 
                          : 'bg-[#121429] border-transparent hover:border-gray-500'
                      }`}
                    >
                      <div className="p-1 px-1.5 bg-rose-500/10 text-rose-400 rounded-lg h-fit text-xs font-mono font-bold mt-1">
                        UNSECURE
                      </div>
                      <div className="text-left font-sans space-y-1">
                        <span className="text-[11.5px] font-black text-rose-300 flex items-center gap-1">
                          <span>Unstaked 自由退还模式</span>
                          <ShieldAlert size={12} className="text-rose-400" />
                        </span>
                        <p className="text-[10px] text-gray-400 leading-relaxed">
                          完全无抵押。开发者不需要质押底款金，但平台提取较高的通道成本抽扣 <strong>15%</strong>。不受到任何里程碑核退强制约束。
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="space-y-1.5 text-left">
                    <label className="text-xs text-gray-400 font-semibold block">代币换售比例 *</label>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.0001"
                        placeholder="0.01"
                        value={tokenPrice}
                        onChange={(e) => setTokenPrice(e.target.value)}
                        className="w-full bg-[#121429] border border-[#24284D] focus:border-[#635BFF] text-white font-mono text-xs rounded-xl px-3.5 py-2.5 outline-none transition"
                      />
                      <span className="absolute right-3.5 top-3 text-[10px] text-gray-500 font-mono">TON</span>
                    </div>
                    <span className="text-[9px] text-gray-500 block leading-normal mt-1">
                      1 创世代币 = {tokenPrice} TON
                    </span>
                  </div>

                  <div className="space-y-1.5 text-left">
                    <label className="text-xs text-gray-400 font-semibold block">代币总发行量 (Total Supply) *</label>
                    <div className="relative">
                      <input
                        type="number"
                        placeholder="100000000"
                        value={totalSupply}
                        onChange={(e) => setTotalSupply(e.target.value)}
                        className="w-full bg-[#121429] border border-[#24284D] focus:border-[#635BFF] text-white font-mono text-xs rounded-xl px-3.5 py-2.5 outline-none transition"
                      />
                      <span className="absolute right-3.5 top-3 text-[10px] text-gray-500 font-mono">TOKENS</span>
                    </div>
                  </div>

                  <div className="space-y-1.5 text-left">
                    <label className="text-xs text-gray-400 font-semibold block">单人最低认缴额度 *</label>
                    <div className="relative">
                      <input
                        type="number"
                        placeholder="5"
                        value={minInvestment}
                        onChange={(e) => setMinInvestment(e.target.value)}
                        className="w-full bg-[#121429] border border-[#24284D] focus:border-[#635BFF] text-white font-mono text-xs rounded-xl px-3.5 py-2.5 outline-none transition"
                      />
                      <span className="absolute right-3.5 top-3 text-[10px] text-gray-500 font-mono">TON</span>
                    </div>
                  </div>

                  <div className="space-y-1.5 text-left">
                    <label className="text-xs text-gray-400 font-semibold block">公开星火共建限期天数 *</label>
                    <select
                      value={duration}
                      onChange={(e) => setDuration(e.target.value)}
                      className="w-full bg-[#121429] border border-[#24284D] focus:border-[#635BFF] outline-none rounded-xl px-3.5 py-2.5 text-xs text-gray-300 transition cursor-pointer"
                    >
                      <option value="7">7 天 (闪筹加速测试)</option>
                      <option value="15">15 天 (官方推荐常规周期)</option>
                      <option value="30">30 天 (大型长线基础设施)</option>
                    </select>
                  </div>
                </div>

                {/* Tokenomics Model visualization */}
                {Number(totalSupply) > 0 && Number(tokenPrice) > 0 && (
                  <div className="p-4.5 bg-[#0C0E20] border border-[#1C2046] rounded-2xl space-y-3.5 text-left">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-white flex items-center gap-1">
                        <Sparkles size={13} className="text-[#8B83FF]" />
                        <span>创代币经济分配模型 (Innovative TGE Allocations)</span>
                      </span>
                      <span className="text-[10px] font-mono text-gray-400">
                        兑购额: {Math.floor(Number(targetAmount) / Number(tokenPrice)).toLocaleString()} Tokens
                      </span>
                    </div>

                    {/* Progress bars visual split */}
                    {(() => {
                      const sales = Math.floor(Number(targetAmount) / Number(tokenPrice));
                      const total = Number(totalSupply);
                      const salesPct = Number(Math.min(95, Math.max(1, (sales / total) * 100)).toFixed(1));
                      const remainingPct = Number((100 - salesPct).toFixed(1));

                      return (
                        <div className="space-y-2">
                          <div className="w-full h-3.5 bg-[#141838] rounded-full overflow-hidden flex">
                            <div 
                              className="h-full bg-gradient-to-r from-[#635BFF] to-sky-400 transition-all duration-300 relative group"
                              style={{ width: `${salesPct}%` }}
                              title="TGE 认购份额"
                            />
                            <div 
                              className="h-full bg-indigo-950 border-l border-indigo-900 transition-all duration-300"
                              style={{ width: `${remainingPct}%` }}
                              title="创世团队锁仓与 AMM 流动质押池"
                            />
                          </div>
                          
                          <div className="flex justify-between items-center text-[10.5px] font-mono leading-relaxed pt-1">
                            <div className="flex items-center gap-1.5">
                              <span className="w-2.5 h-2.5 rounded-full bg-[#635BFF]" />
                              <span className="text-gray-300 font-sans">支持者代币分配 (TGE Round):</span>
                              <span className="font-extrabold text-[#8B83FF]">{salesPct}%</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-right">
                              <span className="w-2.5 h-2.5 rounded-full bg-indigo-850" />
                              <span className="text-gray-300 font-sans">开发者锁仓与流动底仓 (Locked Security pool):</span>
                              <span className="font-extrabold text-blue-400">{remainingPct}%</span>
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>
            )}

            {/* STEP 4 SECTION: Review & Comfirmation summary details */}
            {step === 4 && (
              <div className="space-y-5 animate-in fade-in duration-100">
                <div className="flex items-center gap-2 border-b border-[#212450] pb-2">
                  <ShieldCheck size={16} className="text-emerald-400" />
                  <h3 className="text-xs font-bold text-white uppercase font-sans">Step 4: 合规校准校验大盘 (Final Summary Matrix)</h3>
                </div>

                {/* Summary Grid */}
                <div className="p-4 bg-[#111326] rounded-xl border border-[#22254B] grid grid-cols-1 md:grid-cols-2 gap-6 text-left leading-relaxed">
                  <div className="space-y-2">
                    <span className="text-[10px] font-mono text-gray-500 block">PROFILE DETAILS</span>
                    <h4 className="text-sm font-black text-white">{title}</h4>
                    <p className="text-[11px] text-gray-400 line-clamp-3 leading-relaxed">{campaignDesc}</p>
                    <div className="flex items-center gap-2 pt-1">
                      <span className="p-1 px-2.5 bg-[#635BFF]/10 rounded font-mono text-[9px] text-[#A69FFF] border border-[#2B3062] uppercase">
                        {category} 分类
                      </span>
                    </div>
                  </div>

                  <div className="space-y-3.5 border-t md:border-t-0 md:border-l border-[#22264E] pt-3.5 md:pt-0 md:pl-5 font-mono text-xs">
                    <span className="text-[10px] text-gray-500 block uppercase">Financial Core parameters</span>
                    
                    <div className="space-y-1.5">
                      <div className="flex justify-between">
                        <span className="text-gray-400">融集目标:</span>
                        <span className="font-extrabold text-sky-400">{targetAmount} TON</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">共建硬顶:</span>
                        <span className="font-extrabold text-[#10B981]">{hardCap} TON</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">起认限额:</span>
                        <span className="font-bold text-gray-200">{minInvestment} TON</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">保底安全模式:</span>
                        <span className={`font-bold uppercase ${assuranceMode === 'staked' ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {assuranceMode === 'staked' ? 'Creator STAKED 5% fee' : 'UNSTAKED 15% fee'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">估值比例:</span>
                        <span className="font-bold text-amber-500">1 Tokens = {tokenPrice} TON</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">代币总发行量:</span>
                        <span className="font-bold text-gray-200">{Number(totalSupply).toLocaleString()} TOKENS</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-4.5 bg-[#251F10]/20 border border-amber-900/35 rounded-xl flex items-start gap-2.5">
                  <AlertTriangle className="text-amber-500 shrink-0 mt-0.5" size={16} />
                  <p className="text-[10.5px] text-gray-400 leading-normal">
                    发布后此规则将永久镌入 TON 多签托管。若在 <strong>{duration} 天</strong> 限期周期之内筹集总额度未达 <strong>{targetAmount} TON</strong>，全部款项将由区块链底层原样自动撤回；开发者预质押款项将在平台审计判定后视情扣回。
                  </p>
                </div>
              </div>
            )}

            {/* Bottom Nav arrows inside card */}
            <div className="flex justify-between items-center pt-4 border-t border-[#1C2045]">
              {step > 1 ? (
                <button
                  onClick={() => setStep((step - 1) as any)}
                  className="px-4 py-2 bg-[#121429] hover:bg-[#1A1C3C] border border-[#2A2E59]/60 hover:border-gray-500 text-gray-300 text-xs font-bold rounded-xl transition flex items-center gap-1 cursor-pointer"
                >
                  <ArrowLeft size={13} />
                  <span>上一步 (Back)</span>
                </button>
              ) : (
                <div />
              )}

              {step < 4 ? (
                <button
                  onClick={nextStep}
                  className="px-4 py-2 bg-[#635BFF] hover:bg-[#5048E5] text-white text-xs font-bold rounded-xl transition flex items-center gap-1 cursor-pointer"
                >
                  <span>下一步 (Next)</span>
                  <ArrowRight size={13} />
                </button>
              ) : (
                <button
                  onClick={handleCreateProject}
                  className="px-5 py-2.5 bg-[#10B981] hover:bg-[#079A68] text-[#07080E] text-xs font-black rounded-xl shadow-lg shadow-[#10B981]/15 transition flex items-center gap-1.5 cursor-pointer uppercase tracking-wider"
                >
                  <ShieldCheck size={14} />
                  <span>发布共建合约 Deployment Payload</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
