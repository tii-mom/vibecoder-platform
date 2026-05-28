import React, { useState } from 'react';
import { Bot, ShieldCheck, ToggleLeft, ToggleRight, Sparkles, TrendingUp, Cpu, Sliders, AlertTriangle, ListFilter, Play, History, FileText, CheckCircle2 } from 'lucide-react';
import { useUserStore } from '../store/userStore';
import { useSparkStore } from '../store/sparkStore';
import { Card, CardHeader, CardTitle, CardDescription } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';

export default function CopilotPage() {
  const { isConnected, profile, connectWallet } = useUserStore();
  const { tokens, projects } = useSparkStore();

  // Copilot overall activation state
  const [isCopilotActive, setIsCopilotActive] = useState(true);
  
  // Strategy Rules
  const [minScore, setMinScore] = useState<number>(85);
  const [requireStaked, setRequireStaked] = useState<boolean>(true);
  const [maxVcPerProject, setMaxVcPerProject] = useState<number>(500);
  const [autoLaunchpad, setAutoLaunchpad] = useState<boolean>(true);
  const [autoCompound, setAutoCompound] = useState<boolean>(true);

  // Settings modification notice
  const [saveNotify, setSaveNotify] = useState(false);

  const handleWalletFallback = () => {
    connectWallet();
  };

  const handleApplyRules = (e: React.FormEvent) => {
    e.preventDefault();
    setSaveNotify(true);
    setTimeout(() => setSaveNotify(false), 2000);
  };

  // Static AI project evaluations data matching whitepaper items
  const evaluatedProjects = [
    {
      id: "spark-1",
      name: "OmniSocial Influencer",
      ticker: "OSA",
      score: 92,
      riskLevel: "AAA",
      mode: "Staked 开发者保底",
      desc: "社交分发自运行网红智能体",
      auditDetails: {
        codeDensity: "94% FunC 覆盖率，通过静态 AST 控制流验证",
        socialSignal: "推特真实转评比 &gt; 82%，自主响应密度良好",
        chainLiquidity: "首期流动金储备由 10,000 $VC 质押保底 6 个月",
      },
      assessment: "【强推】核心业务具有成熟的分配共建模型，开发组已质押保底，评分超过阈值，系统自动执行共建。"
    },
    {
      id: "spark-2",
      name: "CodeVibe Auditor",
      ticker: "CVA",
      score: 88,
      riskLevel: "AA",
      mode: "Staked 开发者保底",
      desc: "自动化 FunC 代码静态审计 Agent",
      auditDetails: {
        codeDensity: "静态规则库丰富，合约静态仿真测试完成度极高",
        socialSignal: "社群核心极客留存率 76%，专业口碑优秀",
        chainLiquidity: "质押已就绪，里程碑由 3 个独立多签卫士节点核数",
      },
      assessment: "【推荐】需求硬核，符合 Staked 自锁仓保障，评分达标，系统自动执行建仓。"
    },
    {
      id: "pf-mock",
      name: "PumpFun Agent Mock",
      ticker: "PFM",
      score: 58,
      riskLevel: "C",
      mode: "Unstaked 自由退还模式",
      desc: "一键快速发币高频抢跑土狗机器人",
      auditDetails: {
        codeDensity: "包含大量闭源外部 API 调用，具有未定义溢出风险",
        socialSignal: "社交账号存在明显刷粉 botting 痕迹，互动极假",
        chainLiquidity: "无任何 $VC 质押押金，平台手续费 15%，退回无强制约束",
      },
      assessment: "【忽略】风险评级为 C，且属于 Unstaked 无锁仓保障模型，未达到最低 85 评分指标，Copilot 策略强制跳过防止回撤。"
    }
  ];

  // Automated assistant logging stream
  const executionLogs = [
    {
      time: "2026-05-27 10:14",
      action: "二级 Launchpad 自动兑购完成",
      detail: "自动检测 $TBP 已上市，划转 120 $VC 成功，自动获得 8,000 $TBP 分配到资产账户。"
    },
    {
      time: "2026-05-26 18:22",
      action: "自动触发 Spark Round 共建",
      detail: "判定 OmniSocial ($OSA) 评分 92 &ge; 85 分，且属于 AAA 级 Staked 模式。自动签名并划扣质押共建 500 $VC。"
    },
    {
      time: "2026-05-25 14:02",
      action: "扫描到新项目：PumpFun Agent Mock",
      detail: "项目估值打分为 58 (C 级)。低于策略设置的评分 85 门槛，自动屏蔽，跳过该共建。"
    },
    {
      time: "2026-05-24 09:30",
      action: "分配提取与自动共建",
      detail: "自动查询已结付分配表现: +4.21 TON。已按照 80:20 策略，其中 20% 自动注入 Launchpad AMM 共建池。"
    }
  ];

  if (!isConnected) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-[#0C101B] border border-[#21245D] flex items-center justify-center mx-auto">
          <Bot size={28} className="text-[#635BFF] animate-pulse" />
        </div>
        <div className="space-y-2">
          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">启用 AI 共建助手 (Co-Build Copilot)</h2>
          <p className="text-xs sm:text-sm text-gray-400 max-w-md mx-auto leading-relaxed">
            AI 共建助手可以帮您自动发现优质项目、极速调取代码评分报告、根据策略自动启动 Spark Round，开启您的链上自治分配之路。
          </p>
        </div>
        <div className="pt-2">
          <button
            onClick={handleWalletFallback}
            className="px-6 py-2.5 bg-[#635BFF] hover:bg-[#5048E5] text-white rounded-xl text-xs sm:text-sm font-semibold shadow-lg shadow-[#635BFF]/20 transition cursor-pointer"
          >
            连接开发者钱包并授权
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-6 text-left select-none animate-in fade-in duration-200">
      
      {/* Title Header */}
      <div className="border-b border-[#21243C] pb-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <Bot className="text-[#635BFF]" size={24} />
            <span>🤖 AI 共建助手 (Co-Build Copilot)</span>
            <span className="p-1 px-2.5 bg-yellow-500/10 text-yellow-500 border border-yellow-500/15 rounded text-[10px] font-mono font-bold uppercase tracking-wider">
              Autonomously Active
            </span>
          </h1>
          <p className="text-xs text-gray-400 mt-1">
            首个专为 AI 智能体资产设计的自动化估值资管引擎。通过静态分析、社群信号检索和开发者押金校验，自主决策进行 Spark 份额与 Launchpad 兑配。
          </p>
        </div>

        {/* Global master switch toggle */}
        <button
          onClick={() => setIsCopilotActive(!isCopilotActive)}
          className={`px-4 py-2 rounded-xl text-xs font-black transition flex items-center gap-2 border cursor-pointer ${
            isCopilotActive 
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' 
              : 'bg-slate-800/20 border-slate-750 text-gray-400'
          }`}
        >
          {isCopilotActive ? (
            <>
              <ToggleRight size={18} />
              <span>托管模式已激活 (COPILOT ON)</span>
            </>
          ) : (
            <>
              <ToggleLeft size={18} />
              <span>助手已处于休眠 (COPILOT OFF)</span>
            </>
          )}
        </button>
      </div>

      {/* Overview stats layout */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
        <div className="bg-[#121620] border border-[#22253E] p-4.5 rounded-xl">
          <span className="text-[10px] text-gray-500 font-mono uppercase block">Copilot Status</span>
          <div className="flex items-center gap-2 mt-1.5">
            <span className={`w-2 h-2 rounded-full ${isCopilotActive ? 'bg-emerald-500 animate-pulse' : 'bg-gray-600'}`} />
            <span className="text-sm font-black text-white">{isCopilotActive ? '自动资管中 (ACTIVE)' : '已休眠 (OFF)'}</span>
          </div>
        </div>

        <div className="bg-[#121620] border border-[#22253E] p-4.5 rounded-xl">
          <span className="text-[10px] text-gray-500 font-mono uppercase block">账户可用 VC 底池</span>
          <h4 className="text-base font-black font-mono text-[#8B83FF] mt-1">{profile?.balanceVC || 21500} $VC</h4>
        </div>

        <div className="bg-[#121620] border border-[#22253E] p-4.5 rounded-xl">
          <span className="text-[10px] text-gray-550 font-mono uppercase block">已自动发起早期共建</span>
          <h4 className="text-base font-black font-mono text-emerald-400">800 $VC</h4>
        </div>

        <div className="bg-[#121620] border border-[#22253E] p-4.5 rounded-xl">
          <span className="text-[10px] text-gray-500 font-mono uppercase block">极速抢兑 Launchpad 次数</span>
          <h4 className="text-base font-black font-mono text-sky-450 mt-1">2 次极速兑配</h4>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Strategy Setup parameters */}
        <form onSubmit={handleApplyRules} className="lg:col-span-5 bg-[#0C101A] border border-[#1E223E] rounded-2xl p-6 space-y-5">
          <div className="flex items-center gap-1.5 border-b border-[#21244E] pb-3">
            <Sliders size={15} className="text-[#635BFF]" />
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">设置自动化共建规则 (Auto Strategy)</h3>
          </div>

          <div className="space-y-4">
            
            {/* Rule 1: Min Score */}
            <div className="space-y-2 text-left">
              <label className="text-xs text-gray-400 font-semibold flex justify-between">
                <span>要求 Agent 综合打分下限 *</span>
                <span className="text-[#8B83FF] font-mono font-bold">&ge; {minScore} 分</span>
              </label>
              <input 
                type="range"
                min="50"
                max="95"
                step="5"
                value={minScore}
                onChange={(e) => setMinScore(Number(e.target.value))}
                className="w-full h-1.5 bg-[#121424] rounded-lg appearance-none cursor-pointer accent-[#635BFF]"
              />
              <span className="text-[10px] text-gray-500 block">综合代码、推特活跃度及链上交易频率的多维打分。</span>
            </div>

            {/* Rule 2: Risk control restriction */}
            <div className="flex items-start gap-2 pt-1">
              <input
                id="staked_only" 
                type="checkbox"
                checked={requireStaked}
                onChange={(e) => setRequireStaked(e.target.checked)}
                className="w-4 h-4 rounded bg-[#121424] border-slate-700 text-[#635BFF] focus:ring-0 mt-0.5 cursor-pointer"
              />
              <div className="text-left font-sans text-xs">
                <label htmlFor="staked_only" className="font-bold text-gray-250 cursor-pointer block select-none">仅参与 Staked 开发者保障模式</label>
                <span className="text-[10px] text-gray-550 block">（跳过高风险的 Unstaked 自由释放模式项目，防跑路、机制更安全）</span>
              </div>
            </div>

            {/* Rule 3: Max investment capital */}
            <div className="space-y-1.5 text-left pt-1">
              <label className="text-xs text-gray-400 font-semibold block">单项目最高限制共建数量 ($VC) *</label>
              <select
                value={maxVcPerProject}
                onChange={(e) => setMaxVcPerProject(Number(e.target.value))}
                className="w-full bg-[#121429] border border-slate-800 focus:border-[#635BFF] outline-none rounded-xl px-3.5 py-2 text-xs text-gray-300 transition cursor-pointer"
              >
                <option value="200">200 $VC (稳健探索)</option>
                <option value="500">500 $VC (推荐标准比例)</option>
                <option value="1000">1000 $VC (深度参与)</option>
              </select>
            </div>

            {/* Rule 4: Auto launchpad */}
            <div className="flex items-center justify-between p-3.5 bg-[#121424] rounded-xl border border-slate-850">
              <div className="text-left font-sans text-xs">
                <span className="font-bold text-gray-200 block">自动参与 Launchpad 抢配</span>
                <span className="text-[10px] text-gray-550">首发契约解禁自动兑购。</span>
              </div>
              <input 
                type="checkbox"
                checked={autoLaunchpad}
                onChange={(e) => setAutoLaunchpad(e.target.checked)}
                className="w-4 h-4 rounded bg-[#090A14] border-slate-800 text-emerald-500 cursor-pointer focus:ring-0"
              />
            </div>

            {/* Rule 5: Auto profits routing / compounding */}
            <div className="flex items-center justify-between p-3.5 bg-[#121424] rounded-xl border border-slate-850">
              <div className="text-left font-sans text-xs">
                <span className="font-bold text-gray-200 block">分配额自动划转共建 / 复利</span>
                <span className="text-[10px] text-gray-550">收到的 TON 分配 20% 自动注入。</span>
              </div>
              <input 
                type="checkbox"
                checked={autoCompound}
                onChange={(e) => setAutoCompound(e.target.checked)}
                className="w-4 h-4 rounded bg-[#090A14] border-slate-800 text-emerald-500 cursor-pointer focus:ring-0"
              />
            </div>

          </div>

          <div className="pt-3 border-t border-[#1D213F]">
            {saveNotify ? (
              <div className="bg-emerald-950/20 border border-emerald-900/30 text-emerald-400 text-xs p-2.5 rounded-xl text-center font-bold flex items-center justify-center gap-1">
                <CheckCircle2 size={13} />
                <span>策略设置已合规更新至 AI 决策网关！</span>
              </div>
            ) : (
              <button
                type="submit"
                className="w-full py-2.5 bg-[#635BFF] hover:bg-[#5048E5] text-white font-extrabold text-xs rounded-xl shadow-lg shadow-[#635BFF]/15 active:scale-97 transition text-center cursor-pointer"
              >
                保存策略并立即调优 (Save Setup)
              </button>
            )}
          </div>
        </form>

        {/* Right Tab columns: Project scorecards & Logs */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Section: AI Project Discovery scorecards */}
          <div className="space-y-4">
            <h3 className="text-sm font-black text-white flex items-center gap-1.5">
              <Sparkles size={14} className="text-amber-500" />
              <span>AI 评估中继 & 智能评分报告 (AI Project Scorecards)</span>
            </h3>

            <div className="space-y-4">
              {evaluatedProjects.map((proj) => {
                const meetsThreshold = proj.score >= minScore && (!requireStaked || proj.mode.startsWith('Staked'));

                return (
                  <div key={proj.id} className="bg-[#121620] border border-[#22253E] rounded-xl p-4.5 space-y-3.5 relative overflow-hidden text-left">
                    {/* Upper heading rating block */}
                    <div className="flex items-center justify-between border-b border-slate-850/65 pb-2.5">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white block truncate max-w-[150px]">{proj.name}</span>
                        <span className="p-0.5 px-1.5 bg-[#635BFF]/10 text-[#8B83FF] rounded font-mono text-[9.5px] font-black">${proj.ticker}</span>
                      </div>
                      
                      <div className="flex items-center gap-1.5 font-mono">
                        <span className="text-[10px] text-gray-500">大模型打分:</span>
                        <span className="text-sm font-black text-amber-500">{proj.score}</span>
                        <span className="text-[10.5px] font-bold text-indigo-400 bg-indigo-500/10 px-1.5 rounded">{proj.riskLevel} 级风险</span>
                      </div>
                    </div>

                    {/* Technical aspects */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2 font-mono text-[10px] text-gray-400">
                      <div className="p-2 bg-slate-900/30 rounded border border-slate-900 leading-normal">
                        <span className="text-[9px] text-gray-500 block">代码完整性:</span>
                        <span className="text-gray-300 block font-sans truncate">{proj.auditDetails.codeDensity}</span>
                      </div>
                      <div className="p-2 bg-slate-900/30 rounded border border-slate-900 leading-normal">
                        <span className="text-[9px] text-gray-500 block">社交信号检测:</span>
                        <span className="text-gray-300 block font-sans truncate">{proj.auditDetails.socialSignal}</span>
                      </div>
                      <div className="p-2 bg-slate-900/30 rounded border border-slate-900 leading-normal">
                        <span className="text-[9px] text-gray-500 block">开发者保底质押:</span>
                        <span className="text-gray-300 block font-sans truncate">{proj.auditDetails.chainLiquidity}</span>
                      </div>
                    </div>

                    {/* Copilot verdict assessment */}
                    <div className="p-2.5 bg-[#090A14] rounded-lg border border-slate-900 text-left">
                      <p className="text-[10px] text-slate-350 leading-relaxed font-sans">{proj.assessment}</p>
                      <div className="flex items-center justify-between pt-1.5 mt-1 border-t border-slate-950 text-[9.5px]">
                        <span className="text-gray-500 uppercase font-mono">ASSESSOR VERDICT STATE :</span>
                        <span className={`font-mono font-black ${meetsThreshold ? 'text-emerald-400' : 'text-gray-500'}`}>
                          {meetsThreshold ? '● COMPLIANT (完全满足策略，自动建仓)' : '○ FILTERED OUT (不满足策略设定，已排除)'}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section: Automatic logs dashboard */}
          <div className="space-y-4">
            <h3 className="text-sm font-black text-white flex items-center gap-1.5">
              <History size={13} className="text-[#8B83FF]" />
              <span>智能决策与自动划款执行日志 (Continuous Executor Log)</span>
            </h3>

            <Card className="p-0 overflow-hidden font-mono text-[10px]">
              <div className="divide-y divide-[#21243C]">
                {executionLogs.map((log, index) => (
                  <div key={index} className="p-3.5 hover:bg-[#121620]/40 transition flex items-start gap-4">
                    <span className="text-gray-500 shrink-0 select-none pt-0.5">{log.time}</span>
                    <div className="text-left font-sans space-y-1">
                      <span className="text-xs font-black text-white flex items-center gap-1 font-mono">
                        <ShieldCheck size={11} className="text-emerald-450 shrink-0" />
                        <span>{log.action}</span>
                      </span>
                      <p className="text-[10px] text-gray-400 leading-relaxed">{log.detail}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {/* Section: Copilot vs Traditional Sniper Bots comparison card */}
          <div className="bg-[#090A13] border border-[#161933] rounded-xl p-5 space-y-4">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5 border-b border-[#161933] pb-3">
              <TrendingUp size={13} className="text-[#635BFF]" />
              <span>托管策略优势对照 (Comparison Matrix)</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="bg-[#05060B] border border-[#161933] p-4 rounded-lg space-y-2.5">
                <span className="text-[10px] text-gray-500 font-mono block uppercase">Traditional Algorithms</span>
                <ul className="space-y-1.5 text-gray-400 font-sans text-[11px] list-disc pl-4 leading-relaxed">
                  <li><strong>高维套利抢先交易：</strong> 仅依据 Telegram 事件流或社群高频推文进行盲目套利尝试。</li>
                  <li><strong>高代码暴露：</strong> 缺乏前置静态控制流安全校验，容易触发溢出或重入漏洞。</li>
                  <li><strong>零保障退出：</strong> 在代币解锁或流动性解限周期中，缺乏多签保护与退出归还保障。</li>
                  <li><strong>无再分配路径：</strong> 代币单向买卖损耗极高，无法在生态中自动执行分配复利轮动。</li>
                </ul>
              </div>

              <div className="bg-[#635BFF]/5 border border-[#635BFF]/25 p-4 rounded-lg space-y-2.5">
                <span className="text-[10px] text-[#8B83FF] font-mono block uppercase text-emerald-400">AI Copilot Logic</span>
                <ul className="space-y-1.5 text-gray-300 font-sans text-[11px] list-disc pl-4 leading-relaxed">
                  <li><strong>静态程序安全校验：</strong> 预扫描 FunC/Tact 代码文件，自主产生全维度控制流评分报告。</li>
                  <li><strong>足额质押筛选：</strong> 智能评估开发者质押保底，自主对齐风险预算，自动触发划扣决策。</li>
                  <li><strong>监督节点共识释放：</strong> 绑定链上分配审计网关，仅在满足节点合规释放阈值时安全释放资产。</li>
                  <li><strong>智能复利轮动：</strong> 支持自动化多签分配分流，提取分配自动注入二代 Launchpad 流动池增收。</li>
                </ul>
              </div>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
