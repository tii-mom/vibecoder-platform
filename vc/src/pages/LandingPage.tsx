import { Link, useNavigate } from 'react-router-dom';
import { Bot, Coins, ShieldAlert, Cpu, Sparkles, TrendingUp, Users, DollarSign, ArrowRight, ArrowUpRight, Github } from 'lucide-react';
import { useSparkStore } from '../store/sparkStore';
import { useTranslation } from '../hooks/useTranslation';

export default function LandingPage() {
  const navigate = useNavigate();
  const { projects } = useSparkStore();
  const { t } = useTranslation();

  // Filter 4 featured projects for 2x2 grid
  const featuredProjects = projects.slice(0, 4);

  const handleCreateCTA = () => {
    navigate('/launch/create');
  };

  return (
    <div className="bg-[#07080F] min-h-screen text-gray-200">
      <div className="bg-[#1C130C] border-b border-amber-950/40 text-amber-500/90 text-[10px] py-1.5 px-4 text-center font-mono font-medium">
        {t('landing.testnetWarning')}
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
            <span>{t('landing.tagBanner')}</span>
          </div>

          <div className="space-y-4">
            <h1 className="text-4xl sm:text-6xl font-bold text-white tracking-tight leading-[1.1] max-w-4xl mx-auto">
              {t('landing.heroTitle')}<span className="bg-gradient-to-r from-[#635BFF] via-purple-400 to-sky-400 bg-clip-text text-transparent">{t('landing.heroTitleAccent')}</span>
            </h1>
            <div className="text-[11px] font-mono tracking-[0.2em] text-[#8C84FF] uppercase">
              {t('landing.heroSubtitle')}
            </div>
          </div>

          <p className="text-sm sm:text-base text-gray-400 max-w-2xl mx-auto leading-relaxed">
            {t('landing.heroDesc')}
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <button
              onClick={handleCreateCTA}
              className="w-full sm:w-auto px-8 py-3.5 bg-[#635BFF] hover:bg-[#5048E5] text-white rounded-full text-sm font-semibold shadow-xl shadow-[#635BFF]/20 hover:shadow-[#635BFF]/35 transition-all text-center flex items-center justify-center gap-2 cursor-pointer group"
            >
              <span>{t('landing.createCTA')}</span>
              <ArrowRight size={15} className="group-hover:translate-x-1 transition-transform" />
            </button>
            <Link
              to="/launch"
              className="w-full sm:w-auto px-8 py-3.5 bg-[#121424] hover:bg-[#1C1F3D] border border-[#272B51] text-gray-300 hover:text-white rounded-full text-sm font-medium transition cursor-pointer text-center"
            >
              {t('landing.browseCTA')}
            </Link>
          </div>
        </div>
      </section>

      {/* 2. Micro ticker statistics counters with hover cards */}
      <section className="py-12 bg-[#090A14] border-b border-[#14162B]">
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { value: '142', label: t('landing.statsLaunches'), icon: Bot, color: 'text-indigo-400' },
              { value: '1,284,500 TON', label: t('landing.statsRaised'), icon: Coins, color: 'text-emerald-400' },
              { value: '$2,450,000', label: t('landing.statsRevenue'), icon: DollarSign, color: 'text-sky-400' },
              { value: '18,480+', label: t('landing.statsBackers'), icon: Users, color: 'text-purple-400' },
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
          <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">{t('landing.visionTitle')}</h2>
          <p className="text-gray-400 text-xs sm:text-sm max-w-2xl mx-auto">
            {t('landing.visionSubtitle')}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch pt-4">
          {/* Platform Vision intro card */}
          <div className="bg-[#0C0E1D] border border-[#1E2241] p-8 rounded-2xl flex flex-col justify-between">
            <div className="space-y-4">
              <h3 className="text-lg font-black text-[#8C84FF] flex items-center gap-2">
                <Sparkles size={18} className="text-yellow-500 animate-pulse" />
                <span>{t('landing.visionDesc1')}</span>
              </h3>
              <p className="text-xs sm:text-sm text-gray-300 leading-relaxed text-left">
                {t('landing.visionDesc2')}
              </p>
              <p className="text-xs sm:text-sm text-gray-300 leading-relaxed text-left">
                {t('landing.visionDEX')}
              </p>
            </div>
            <div className="pt-6 border-t border-[#1C1F3D] mt-6 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#635BFF]/10 flex items-center justify-center text-xs font-mono font-black text-[#8C84FF]">
                AI
              </div>
              <div className="text-left">
                <span className="text-xs text-white font-bold block">{t('landing.copilotTitle')}</span>
                <span className="text-[10px] text-gray-550 font-mono">{t('landing.copilotDesc')}</span>
              </div>
            </div>
          </div>

          {/* Comparison table */}
          <div className="bg-[#090A14] border border-[#1E2241] rounded-2xl overflow-hidden flex flex-col">
            <div className="grid grid-cols-2 bg-[#1C1F3D]/40 border-b border-[#1E2241] p-4 text-xs font-bold font-mono text-center">
              <div className="text-gray-400 border-r border-[#1E2241]">{t('landing.comparisonOldTitle')}</div>
              <div className="text-emerald-400">{t('landing.comparisonNewTitle')}</div>
            </div>
            <div className="divide-y divide-[#1E2241] flex-1 flex flex-col justify-between">
              {[
                {
                  old: t('landing.comparisonRow1Old'),
                  new: t('landing.comparisonRow1New')
                },
                {
                  old: t('landing.comparisonRow2Old'),
                  new: t('landing.comparisonRow2New')
                },
                {
                  old: t('landing.comparisonRow3Old'),
                  new: t('landing.comparisonRow3New')
                },
                {
                  old: t('landing.comparisonRow4Old'),
                  new: t('landing.comparisonRow4New')
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
          <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">{t('landing.cycleTitle')}</h2>
          <p className="text-gray-400 text-xs sm:text-sm max-w-xl mx-auto">{t('landing.cycleSubtitle')}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            {
              step: '01',
              title: t('landing.cycleStep1Title'),
              desc: t('landing.cycleStep1Desc'),
              badge: t('landing.cycleStep1Badge'),
              badgeColor: 'bg-indigo-950/40 text-indigo-300'
            },
            {
              step: '02',
              title: t('landing.cycleStep2Title'),
              desc: t('landing.cycleStep2Desc'),
              badge: t('landing.cycleStep2Badge'),
              badgeColor: 'bg-amber-950/40 text-amber-300'
            },
            {
              step: '03',
              title: t('landing.cycleStep3Title'),
              desc: t('landing.cycleStep3Desc'),
              badge: t('landing.cycleStep3Badge'),
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
              <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">{t('landing.recommendTitle')}</h2>
              <p className="text-xs text-gray-400">{t('landing.recommendSubtitle')}</p>
            </div>
            <Link
              to="/launch"
              className="text-xs font-semibold text-[#635BFF] hover:text-[#8077FF] flex items-center gap-1 group whitespace-nowrap cursor-pointer"
            >
              <span>{t('landing.viewAllMarket')}</span>
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
                      {proj.status === 'active' ? t('detail.statusActive') : t('detail.statusCompleted')}
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
                      <span className="text-gray-500">{t('landing.raisedProgress')}</span>
                      <span className="text-white font-bold">{proj.raisedAmount} / {proj.goalAmount} TON</span>
                    </div>
                    <div className="w-full bg-[#181A32] h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-[#635BFF] to-[#9E97FF] h-full rounded-full transition-all duration-500"
                        style={{ width: `${proj.progress}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[10px] text-gray-400 font-mono">
                      <span>{t('landing.percentRaised', { percent: proj.progress })}</span>
                      <span>{t('landing.backersCount', { count: proj.investorCount })}</span>
                    </div>
                  </div>

                  <div className="pt-2 flex justify-end">
                    <Link
                      to={`/launch/${proj.id}`}
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#17192C] hover:bg-[#20233E] border border-[#272A4E] text-xs font-semibold text-gray-200 hover:text-white rounded-lg transition"
                    >
                      <span>{t('landing.launchDetailCTA')}</span>
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
          <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">{t('landing.bottomTitle')}</h2>
          <p className="text-xs sm:text-sm text-gray-400 leading-relaxed">
            {t('landing.bottomDesc')}
          </p>
          <div className="pt-2">
            <button
              onClick={handleCreateCTA}
              className="px-8 py-3.5 bg-[#635BFF] hover:bg-[#5048E5] text-white rounded-full text-xs sm:text-sm font-semibold shadow-xl shadow-[#635BFF]/10 hover:shadow-[#635BFF]/30 active:scale-95 transition-all inline-flex items-center gap-2 cursor-pointer"
            >
              <Cpu size={15} />
              <span>{t('landing.bottomCTA')}</span>
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
            <span className="text-xs font-semibold text-gray-400 font-sans">{t('landing.footerCopyright')}</span>
            <span className="text-[10px] font-mono text-gray-600">{t('landing.footerBuiltInSandbox')}</span>
          </div>

          <div className="flex items-center gap-6 text-xs text-gray-500 mt-2 md:mt-0 font-mono">
            <a href="https://github.com/vibecoder" target="_blank" rel="noopener noreferrer" className="hover:text-[#635BFF] transition flex items-center gap-1">
              <Github size={13} />
              <span>GitHub</span>
            </a>
            <span className="text-gray-800">|</span>
            <span className="text-gray-600">{t('landing.footerSecureAudit')}</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
