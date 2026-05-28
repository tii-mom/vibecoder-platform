import { Link, useNavigate } from 'react-router-dom';
import { Bot, Coins, ShieldAlert, Cpu, Sparkles, TrendingUp, Users, DollarSign, ArrowRight, ArrowUpRight, Github } from 'lucide-react';
import { useUserStore } from '../store/userStore';
import { useSparkStore } from '../store/sparkStore';

export default function LandingPage() {
  const navigate = useNavigate();
  const { isConnected, connectWallet } = useUserStore();
  const { projects } = useSparkStore();

  // Filter 4 featured projects for 2x2 grid
  const featuredProjects = projects.slice(0, 4);

  const handleCreateCTA = () => {
    if (!isConnected) {
      connectWallet();
    } else {
      navigate('/studio');
    }
  };

  return (
    <div className="bg-[#07080F] min-h-screen text-gray-200">
      <div className="bg-[#1C130C] border-b border-amber-950/40 text-amber-500/90 text-[10px] py-1.5 px-4 text-center font-mono font-medium">
        ⚠️ sandbox — testnet only (此平台当前运行于 TON Testnet 测试网环境)
      </div>
      {/* 1. Hero Dynamic Panel */}
      <section className="relative overflow-hidden pt-16 pb-24 border-b border-[#14162B]">
        {/* Ambient Grid styling */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#15162c_1px,transparent_1px),linear-gradient(to_bottom,#15162c_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-30 select-none pointer-events-none" />
        
        {/* Soft glowing absolute radial backgrounds */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-[#635BFF] rounded-full blur-[140px] opacity-15 pointer-events-none" />
        <div className="absolute top-40 left-1/3 w-[300px] h-[300px] bg-sky-500 rounded-full blur-[100px] opacity-10 pointer-events-none" />

        <div className="max-w-6xl mx-auto px-4 relative z-10 text-center space-y-8 animate-in fade-in duration-300">
          {/* Tag banner */}
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#101224] border border-[#635BFF]/30 rounded-full text-xs font-medium text-[#8C84FF]">
            <Sparkles size={12} className="text-[#8C84FF]" />
            <span>首个面向全球开发者的 TON 生态 AI Agent 联合公募平台</span>
          </div>

          <div className="space-y-4">
            <h1 className="text-4xl sm:text-6xl font-bold text-white tracking-tight leading-[1.1] max-w-4xl mx-auto">
              Build. Spark. <span className="bg-gradient-to-r from-[#635BFF] via-purple-400 to-sky-400 bg-clip-text text-transparent">Grow.</span>
            </h1>
            <div className="text-[11px] font-mono tracking-[0.2em] text-[#8C84FF] uppercase">
              小梦想，大世界 &bull; Small Dreams, Big World
            </div>
          </div>

          <p className="text-sm sm:text-base text-gray-400 max-w-2xl mx-auto leading-relaxed">
            你的 AI，全球共建。让全球最顶尖的开发者自主孵化链上机器人，全球支持者用 <span className="text-white font-semibold font-mono">$VC / TON</span> 提供流动性与代码治理。
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <button
              onClick={handleCreateCTA}
              className="w-full sm:w-auto px-8 py-3.5 bg-[#635BFF] hover:bg-[#5048E5] text-white rounded-full text-sm font-semibold shadow-xl shadow-[#635BFF]/20 hover:shadow-[#635BFF]/35 transition-all text-center flex items-center justify-center gap-2 cursor-pointer group"
            >
              <span>开始创建你的 Agent</span>
              <ArrowRight size={15} className="group-hover:translate-x-1 transition-transform" />
            </button>
            <Link
              to="/launch"
              className="w-full sm:w-auto px-8 py-3.5 bg-[#121424] hover:bg-[#1C1F3D] border border-[#272B51] text-gray-300 hover:text-white rounded-full text-sm font-medium transition cursor-pointer text-center"
            >
              浏览 Launch 市场
            </Link>
          </div>
        </div>
      </section>

      {/* 2. Micro ticker statistics counters with hover cards */}
      <section className="py-12 bg-[#090A14] border-b border-[#14162B]">
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { value: '142', label: '已孵化 Agent 机器人', icon: Bot, color: 'text-indigo-400' },
              { value: '1,284,500 TON', label: '累计成功筹集资金', icon: Coins, color: 'text-emerald-400' },
              { value: '$2,450,000', label: '全球开发者累计创收', icon: DollarSign, color: 'text-sky-400' },
              { value: '18,480+', label: '活跃全球持币人', icon: Users, color: 'text-purple-400' },
            ].map((stat, i) => {
              const Icon = stat.icon;
              return (
                <div key={i} className="bg-[#0F1121] border border-[#1F2141] p-5 rounded-2xl hover:border-[#393C70] transition-all group">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-gray-500 text-[10px] font-mono tracking-wider">NETWORK METRICS</span>
                    <Icon size={15} className={`${stat.color} group-hover:scale-110 transition-transform`} />
                  </div>
                  <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight">{stat.value}</h3>
                  <p className="text-xs text-gray-400 mt-1">{stat.label}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Positioning & Vision: VibeCoder Spark vs Traditional Crowdfunding */}
      <section className="py-20 max-w-6xl mx-auto px-4 space-y-12 border-b border-[#14162B]">
        <div className="text-center space-y-2">
          <span className="text-xs text-[#635BFF] font-mono font-bold uppercase tracking-widest">POSITIONING & VISION</span>
          <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">星火之聚，燎原之势</h2>
          <p className="text-gray-400 text-xs sm:text-sm max-w-2xl mx-auto">
            VibeCoder 填补了 Vibe 开发者从“完成代码”到“获得资金、用户与持续收入”的鸿沟。
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch pt-4">
          {/* Platform Vision intro card */}
          <div className="bg-[#0C0E1D] border border-[#1E2241] p-8 rounded-2xl flex flex-col justify-between">
            <div className="space-y-4">
              <h3 className="text-lg font-black text-[#8C84FF] flex items-center gap-2">
                <Sparkles size={18} className="text-yellow-500 animate-pulse" />
                <span>什么是 VibeCoder 自动星火共建？</span>
              </h3>
              <p className="text-xs sm:text-sm text-gray-300 leading-relaxed text-left">
                在 Vibe 时代，全球优秀的极客只需动动嘴和键盘就能写出惊艳的 AI 智能体产品。然而如何解决商业化、冷启动、资金缺口和治理问题？
              </p>
              <p className="text-xs sm:text-sm text-gray-300 leading-relaxed text-left">
                VibeCoder 通过创建 <span className="text-white font-bold">Spark (星火募资)</span> 模型，为优秀的 Agent 提供最高 10,000 $VC 储备的开发者质押底池，并通过 <span className="text-[#635BFF] font-bold">智能评估、四阶段里程碑资金自动释放</span> 以及 <span className="text-emerald-400 font-bold">TON Agent 专属收款钱包</span> 彻底解决商业变现。
              </p>
            </div>
            <div className="pt-6 border-t border-[#1C1F3D] mt-6 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#635BFF]/10 flex items-center justify-center text-xs font-mono font-black text-[#8C84FF]">
                AI
              </div>
              <div className="text-left">
                <span className="text-xs text-white font-bold block">AI 共建助手 (Co-Build Copilot)</span>
                <span className="text-[10px] text-gray-550 font-mono">24h 自动发现优质 Agent 资产并推荐共建</span>
              </div>
            </div>
          </div>

          {/* Comparison table */}
          <div className="bg-[#090A14] border border-[#1E2241] rounded-2xl overflow-hidden flex flex-col">
            <div className="grid grid-cols-2 bg-[#1C1F3D]/40 border-b border-[#1E2241] p-4 text-xs font-bold font-mono text-center">
              <div className="text-gray-400 border-r border-[#1E2241]">传统早期支持模式 (Web2/Crypto)</div>
              <div className="text-emerald-400">VibeCoder Spark</div>
            </div>
            <div className="divide-y divide-[#1E2241] flex-1 flex flex-col justify-between">
              {[
                {
                  old: '“捐赠”式共建，得到一句感谢、周边或零承诺，无实际链上分配',
                  new: '转化为 Agent 未来产品分配份额与创世代币额度，持币即享自动分配权'
                },
                {
                  old: '项目后续开发和成功与你没有经济利益挂钩，无法共享增长溢价',
                  new: '项目代币在二层 Launchpad 上市，随用户、营收增长获得持续发展增长'
                },
                {
                  old: '没有约束机制，开发者拿钱可能跑路，毫无共建安全感与约束',
                  new: 'Spark 设立四阶段里程碑防割，开发组需质押底座 + 多签卫士守护解禁'
                },
                {
                  old: '靠纯粹感性决定投不投，充斥着喊单空气和虚假宣发',
                  new: 'AI 助手执掌 AST 静态代码审计、推特信号流打分、冷启动自动托管'
                }
              ].map((row, idx) => (
                <div key={idx} className="grid grid-cols-2 text-[11px] leading-relaxed text-left p-4.5 gap-4">
                  <div className="text-gray-400 border-r border-[#1C1F3D]/70 pr-4 flex items-center">
                    ❌ {row.old}
                  </div>
                  <div className="text-white pl-1 flex items-center">
                    ✅ {row.new}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 3. Three-Step workflow visualizer */}
      <section className="py-20 max-w-6xl mx-auto px-4 space-y-16">
        <div className="text-center space-y-2">
          <span className="text-xs text-[#635BFF] font-mono font-bold uppercase tracking-widest">ECOSYSTEM CYCLE</span>
          <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">三步赋能，让代码变身自运行的链上生产力</h2>
          <p className="text-gray-400 text-xs sm:text-sm max-w-xl mx-auto">VibeCoder 智能孵化闭环：精准连接开发者创造力与全球资本网络流动性。</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            {
              step: '01',
              title: '一站式极速创建 Agent',
              desc: '在 Studio 填参接入大模型，上传你的代码脚本即可自动编译并获得专有 TON 链上安全托管密钥，进入代打服务。',
              badge: 'STUDIO UTILS',
              badgeColor: 'bg-indigo-950/40 text-indigo-300'
            },
            {
              step: '02',
              title: '发起星火，获取启动资金',
              desc: '自动生成代币份额估值，发起联合共建活动。全球支持者使用 TON 份额直接兑换您的 Agent 创世代币分配权。',
              badge: 'SPARK',
              badgeColor: 'bg-amber-950/40 text-amber-300'
            },
            {
              step: '03',
              title: '自动分配，生态长期共赢',
              desc: '代码上线运营开始产出（交易佣金、社交赞助、付费代码服务），产出由 TON 合约定期按份额自动分配。',
              badge: 'ALLOCATION ROUTING',
              badgeColor: 'bg-emerald-950/40 text-emerald-300'
            }
          ].map((item, index) => (
            <div key={index} className="bg-[#0C0E1D] border border-[#1E2241] p-6 rounded-2xl relative space-y-4 hover:border-[#383E71] transition group">
              <span className="absolute right-6 top-4 font-mono font-black text-5xl text-gray-800/20 group-hover:text-[#635BFF]/10 transition-colors">
                {item.step}
              </span>
              <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-mono ${item.badgeColor}`}>
                {item.badge}
              </span>
              <h3 className="text-base font-bold text-white tracking-tight">{item.title}</h3>
              <p className="text-xs text-gray-400 leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 4. Recommend Projects display grid (2x2) */}
      <section className="py-20 bg-[#090A14] border-t border-b border-[#14162B]">
        <div className="max-w-6xl mx-auto px-4 space-y-12">
          <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4">
            <div className="text-left space-y-1">
              <span className="text-xs text-[#635BFF] font-mono font-bold uppercase tracking-widest font-sans">LIVE CAMPAIGN</span>
              <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">推荐孵化中项目</h2>
              <p className="text-xs text-gray-400">正在星火阶段的 AI Agent 项目，拥有极高潜力与独特运营模型。</p>
            </div>
            <Link
              to="/launch"
              className="text-xs font-semibold text-[#635BFF] hover:text-[#8077FF] flex items-center gap-1 group whitespace-nowrap cursor-pointer"
            >
              <span>查看全部 Launch 池</span>
              <ArrowRight size={13} className="group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {featuredProjects.map((proj) => (
              <div 
                key={proj.id}
                className="bg-[#0D0F21] border border-[#1E2243] p-6 rounded-2xl flex flex-col justify-between hover:border-[#363B72] transition duration-200"
              >
                <div>
                  <div className="flex items-center justify-between gap-3 mb-4">
                    <span className="bg-[#635BFF]/10 text-[#7D75FF] font-mono text-[10px] px-2 py-0.5 rounded font-black">
                      ${proj.agentTicker}
                    </span>
                    <span className={`text-[10px] uppercase font-mono px-2 py-0.5 rounded font-bold ${
                      proj.status === 'active' ? 'bg-amber-950/40 text-amber-400 border border-amber-900/40' : 'bg-emerald-950/40 text-emerald-400 border border-emerald-900/40'
                    }`}>
                      {proj.status === 'active' ? '融筹中' : '筹集完毕'}
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-white tracking-tight text-left truncate">{proj.title}</h3>
                  <p className="text-xs text-gray-400 mt-2 text-left line-clamp-2 leading-relaxed">
                    {proj.description}
                  </p>
                </div>

                <div className="mt-6 space-y-4">
                  {/* Progress panel */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-[11px] font-mono">
                      <span className="text-gray-500">已 Spark</span>
                      <span className="text-white font-bold">{proj.raisedAmount} / {proj.goalAmount} TON</span>
                    </div>
                    <div className="w-full bg-[#181A32] h-2 rounded-full overflow-hidden">
                      <div 
                        className="bg-gradient-to-r from-[#635BFF] to-[#9E97FF] h-full rounded-full transition-all duration-500"
                        style={{ width: `${proj.progress}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[10px] text-gray-400 font-mono">
                      <span>{proj.progress}% 完成</span>
                      <span>{proj.investorCount} Backers</span>
                    </div>
                  </div>

                  <div className="pt-2 flex justify-end">
                    <Link
                      to={`/launch/${proj.id}`}
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#17192C] hover:bg-[#20233E] border border-[#272A4E] text-xs font-semibold text-gray-200 hover:text-white rounded-lg transition"
                    >
                      <span>Launch 详情</span>
                      <ArrowUpRight size={13} />
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 5. Bottom Call To Action panel */}
      <section className="py-24 relative overflow-hidden text-center border-t border-[#131527]">
        <div className="absolute top-1/2 -translate-y-1/2 left-1/2 -translate-x-1/2 w-[350px] h-[350px] bg-[#635BFF] rounded-full blur-[140px] opacity-10 pointer-events-none" />
        
        <div className="max-w-xl mx-auto px-4 relative z-10 space-y-6">
          <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">现在就发起你的首个 Web3 AI 机器人</h2>
          <p className="text-xs sm:text-sm text-gray-400 leading-relaxed">
            极简封装、自由募资。无论是交易对冲策略、Discord 社区博弈 AI 还是 Telegram 赛博网红，VibeCoder 都能帮你在 TON 上赋予其代币内核。
          </p>
          <div className="pt-2">
            <button
              onClick={handleCreateCTA}
              className="px-8 py-3.5 bg-[#635BFF] hover:bg-[#5048E5] text-white rounded-full text-xs sm:text-sm font-semibold shadow-xl shadow-[#635BFF]/10 hover:shadow-[#635BFF]/30 active:scale-95 transition-all inline-flex items-center gap-2 cursor-pointer"
            >
              <Cpu size={15} />
              <span>立即连接 TON 启动 Studio</span>
            </button>
          </div>
        </div>
      </section>

      {/* 6. Simple elegant Footer panel */}
      <footer className="py-12 bg-[#05060A] text-gray-500 border-t border-[#101221] select-none text-left">
        <div className="max-w-6xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-[#635BFF] flex items-center justify-center">
              <span className="text-[10px] font-bold text-white">VC</span>
            </div>
            <span className="text-xs font-semibold text-gray-400 font-sans">VibeCoder © 2026.</span>
            <span className="text-[10px] font-mono text-gray-600">Built in sandbox</span>
          </div>

          <div className="flex items-center gap-6 text-xs text-gray-500 mt-2 md:mt-0 font-mono">
            <a href="https://github.com/vibecoder" target="_blank" rel="noopener noreferrer" className="hover:text-[#635BFF] transition flex items-center gap-1">
              <Github size={13} />
              <span>GitHub</span>
            </a>
            <span className="text-gray-800">|</span>
            <span className="text-gray-600">Secure Audit Verified</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
