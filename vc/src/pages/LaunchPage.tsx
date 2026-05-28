import { useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, Sparkles, ArrowUpRight } from 'lucide-react';
import { useSparkStore } from '../store/sparkStore';
import { useAgentStore } from '../store/agentStore';

export default function LaunchPage() {
  const { projects, tokens } = useSparkStore();
  const { agents } = useAgentStore();
  
  const [selectedCategory, setSelectedCategory] = useState<string>('全部');
  const [statusFilter, setStatusFilter] = useState<'all' | 'funding' | 'listed'>('all');

  // Categorize and Status Filter
  const filteredProjects = projects.filter((proj) => {
    // Category check
    const matchesCategory = selectedCategory === '全部' || proj.category === selectedCategory;
    
    // Status check
    let matchesStatus = true;
    if (statusFilter === 'funding') {
      matchesStatus = proj.status === 'active';
    } else if (statusFilter === 'listed') {
      matchesStatus = proj.status === 'listed' || proj.status === 'success';
    }
    
    return matchesCategory && matchesStatus;
  });

  const getAgentCategory = (agentId: string) => {
    return agents.find(a => a.id === agentId)?.category || 'Other';
  };

  const getAgentAvatar = (agentId: string, name: string) => {
    return agents.find(a => a.id === agentId)?.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${name}`;
  };

  // filter only listed projects for top tracking rail
  const listedProjects = projects.filter(p => p.status === 'listed');

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8 text-left select-none animate-in fade-in duration-200">
      {/* Page Header */}
      <div className="border-b border-[#1A1D39] pb-5 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1 px-1.5 bg-[#635BFF]/10 rounded border border-[#635BFF]/30 text-xs font-mono font-bold text-[#837BFF]">LAUNCHPAD & SPARK</span>
            <h1 className="text-2xl font-black text-white tracking-tight">星火支持与代币首发平台</h1>
          </div>
          <p className="text-xs text-gray-400 mt-1">
            支持早期 AI Agent 并锁定代币创世纪份额，查看项目进展记录。项目星火共建成功后按份额自动分配代币至钱包。
          </p>
        </div>
        
        <Link
          to="/launch/create"
          className="px-4 py-2 bg-[#635BFF] hover:bg-[#5048E5] text-white rounded-lg text-xs font-bold shadow-lg shadow-[#635BFF]/20 transition flex items-center justify-center gap-1 cursor-pointer font-sans"
        >
          <span>启动星火项目</span>
          <ArrowUpRight size={13} />
        </Link>
      </div>

      {/* Already Listed Projects Tracking Rail */}
      {listedProjects.length > 0 && (
        <div className="space-y-3.5 bg-[#0A0C16] border border-[#191D3E] p-5 rounded-2xl">
          <div className="flex items-center justify-between border-b border-[#1C2042] pb-2">
            <h3 className="text-xs sm:text-sm font-black text-white flex items-center gap-1.5">
              <Sparkles size={14} className="text-yellow-400 animate-pulse" />
              <span>已上市发射成功的项目追踪栏 (Launched & Listed Projects)</span>
            </h3>
            <span className="text-[9.5px] text-emerald-400 font-mono bg-emerald-500/10 p-1 px-2 rounded border border-emerald-500/20 font-bold uppercase transition">
              ● Live AMM DEX Tracking
            </span>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {listedProjects.map(proj => {
              const matchedToken = tokens.find(t => t.symbol.toLowerCase() === proj.agentTicker.toLowerCase());
              const currentPrice = matchedToken?.price || proj.tokenPrice;
              // Simulate positive market growth since launch price
              const growthPct = matchedToken ? (((currentPrice - proj.tokenPrice) / proj.tokenPrice) * 100).toFixed(1) : " +24.5";
              
              return (
                <div 
                  key={proj.id}
                  className="bg-[#0D0F24] border border-[#1E234D] rounded-xl p-4 flex flex-col justify-between hover:border-[#635BFF]/50 transition relative overflow-hidden group select-none shadow-sm"
                >
                  {/* Subtle success mesh bg */}
                  <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 blur-2xl pointer-events-none" />
                  
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-[#141A35] flex items-center justify-center font-bold text-xs text-[#8B83FF] font-mono border border-slate-800">
                        {proj.agentTicker.substring(0, 1)}
                      </div>
                      <div>
                        <div className="flex items-center gap-1">
                          <span className="font-extrabold text-white text-xs block">{proj.agentName}</span>
                          <span className="text-[9.5px] text-emerald-400 font-mono font-bold block bg-emerald-500/10 p-0.5 px-1.5 rounded">{growthPct}%</span>
                        </div>
                        <span className="text-[9.5px] text-gray-500 font-mono font-bold block mt-0.5">Ticker: ${proj.agentTicker}</span>
                      </div>
                    </div>
                    
                    <CheckCircle2 size={15} className="text-emerald-400" />
                  </div>
                  
                  <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-slate-800/60 text-left">
                    <div>
                      <span className="text-[8.5px] text-gray-500 block uppercase font-mono font-bold">共建额</span>
                      <span className="text-[10.5px] font-black font-mono text-white">{proj.goalAmount.toLocaleString()} <span className="text-[7.5px] text-gray-400">TON</span></span>
                    </div>
                    <div>
                      <span className="text-[8.5px] text-gray-500 block uppercase font-mono font-bold">发行价</span>
                      <span className="text-[10.5px] font-black font-mono text-gray-300">{proj.tokenPrice} <span className="text-[7.5px] text-gray-400">TON</span></span>
                    </div>
                    <div>
                      <span className="text-[8.5px] text-gray-500 block uppercase font-mono font-bold">最新成交</span>
                      <span className="text-[10.5px] font-black font-mono text-emerald-400">{currentPrice} <span className="text-[7.5px] text-emerald-500/80">TON</span></span>
                    </div>
                  </div>
                  
                  <Link
                    to="/launchpad"
                    className="w-full text-center py-1.5 bg-[#635BFF]/10 text-[#8B83FF] hover:bg-[#635BFF] hover:text-white transition font-extrabold text-[10px] rounded-lg mt-3.5 border border-[#635BFF]/20 cursor-pointer block font-sans"
                  >
                    前往二级 AMM 自由对冲
                  </Link>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Filter Segment Toggles */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#171A37] pb-4">
        {/* Categories filter tabs */}
        <div className="flex flex-wrap gap-2">
          {['全部', '数据分析', '交易工具', '社交', '监控', '基础设施', '创作工具', 'DeFi'].map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold cursor-pointer transition-all ${
                selectedCategory === cat
                  ? 'bg-[#635BFF] text-white font-bold'
                  : 'bg-[#121426] border border-[#22254C] text-gray-400 hover:text-white hover:border-[#383D75]'
              }`}
            >
              {cat === '全部' ? '全部项目' : cat}
            </button>
          ))}
        </div>

        {/* Status filters selection tab segment */}
        <div className="flex bg-[#121427] border border-[#23275A] p-0.5 rounded-xl shrink-0">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1 text-xs font-bold rounded-lg transition cursor-pointer ${
              statusFilter === 'all' ? 'bg-[#635BFF] text-white shadow-sm font-bold' : 'text-gray-400 hover:text-white'
            }`}
          >
            全部
          </button>
          <button
            onClick={() => setStatusFilter('funding')}
            className={`px-3 py-1 text-xs font-bold rounded-lg transition cursor-pointer flex items-center gap-1 ${
              statusFilter === 'funding' ? 'bg-[#635BFF] text-white shadow-sm font-bold' : 'text-gray-400 hover:text-white'
            }`}
          >
            <span>共建中</span>
          </button>
          <button
            onClick={() => setStatusFilter('listed')}
            className={`px-3 py-1 text-xs font-bold rounded-lg transition cursor-pointer flex items-center gap-1 ${
              statusFilter === 'listed' ? 'bg-[#635BFF] text-white shadow-sm font-bold' : 'text-gray-400 hover:text-white'
            }`}
          >
            <span>已上市/共建达成</span>
          </button>
        </div>
      </div>

      {/* Campaign List Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredProjects.map((proj) => {
          const cat = getAgentCategory(proj.agentId);
          const avatar = getAgentAvatar(proj.agentId, proj.agentName);
          const isFinished = proj.status === 'success' || proj.status === 'listed';

          return (
            <div 
              key={proj.id}
              className={`bg-[#0C0E1D] border rounded-2xl p-5 flex flex-col justify-between hover:border-[#3E4379] transition-all duration-300 relative group overflow-hidden ${
                isFinished ? 'border-[#1E2E28]' : 'border-[#1A1E3C]'
              }`}
            >
              {/* Status labels */}
              {proj.status === 'success' && (
                <div className="absolute right-0 top-0 bg-indigo-500/10 text-indigo-400 text-[10px] font-mono font-bold px-3 py-1 border-b border-l border-indigo-500/20 rounded-bl-xl uppercase font-extrabold pb-1">
                  共建完成/待上市
                </div>
              )}
              {proj.status === 'listed' && (
                <div className="absolute right-0 top-0 bg-emerald-500/10 text-emerald-400 text-[10px] font-mono font-bold px-3 py-1 border-b border-l border-emerald-500/20 rounded-bl-xl uppercase font-extrabold pb-1">
                  DEX已上市交易
                </div>
              )}

              <div>
                {/* Info Card header */}
                <div className="flex items-center gap-3.5 mb-4 font-sans">
                  <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-[#635BFF] to-sky-400 p-0.5 shadow-md shrink-0">
                    <div className="w-full h-full bg-[#080913] rounded-[9px] flex items-center justify-center overflow-hidden">
                      <img src={avatar} alt={proj.agentName} className="w-8 h-8 object-contain" referrerPolicy="no-referrer" />
                    </div>
                  </div>
                  <div className="min-w-0 text-left">
                    <div className="flex items-center gap-1.5">
                      <h3 className="text-sm font-bold text-white tracking-tight truncate">{proj.agentName}</h3>
                      <span className="text-[10px] bg-[#635BFF]/10 text-[#8B83FF] px-1.5 rounded font-mono font-black">${proj.agentTicker}</span>
                    </div>
                    <span className="text-[10px] text-gray-400 block font-semibold mt-0.5">{proj.category || cat} 分类</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-gray-200 line-clamp-1 truncate text-left font-sans">{proj.title}</h4>
                  <p className="text-xs text-gray-400 text-left line-clamp-3 leading-relaxed min-h-[50px] font-sans">
                    {proj.description}
                  </p>
                </div>
              </div>

              <div className="mt-6 space-y-4">
                {/* Progress bar info */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-[11px] font-mono">
                    <span className="text-gray-500">已 Spark / 目标</span>
                    <span className="text-white font-bold">{proj.raisedAmount} / {proj.goalAmount} TON</span>
                  </div>

                  <div className="w-full bg-[#161834] h-2 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-500 ${
                        isFinished ? 'bg-emerald-400' : 'bg-gradient-to-r from-[#635BFF] to-sky-400'
                      }`}
                      style={{ width: `${proj.progress}%` }}
                    />
                  </div>

                  <div className="flex justify-between text-[10px] text-gray-400 font-mono">
                    <span>{proj.progress}% 完成</span>
                    <span>{proj.investorCount} 支持者参与</span>
                  </div>
                </div>

                {/* Card actions */}
                <div className="pt-2 flex items-center justify-between gap-3 border-t border-[#1F223E] mt-3">
                  <div className="text-left font-sans">
                    <span className="text-[10px] text-gray-500 font-mono block">代币换售比例</span>
                    <span className="text-xs text-white font-mono font-bold font-semibold">1 {proj.agentTicker} = {proj.tokenPrice} TON</span>
                  </div>

                  {proj.status === 'listed' ? (
                    <Link
                      to="/launchpad"
                      className="px-4 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-black text-xs font-extrabold rounded-lg transition shrink-0 font-sans cursor-pointer"
                    >
                      DEX 交易
                    </Link>
                  ) : proj.status === 'success' ? (
                    <Link
                      to="/launchpad"
                      className="px-4 py-1.5 bg-[#635BFF] hover:bg-[#5048E5] text-white text-xs font-extrabold rounded-lg transition shrink-0 font-sans cursor-pointer animate-pulse"
                    >
                      部署 AMM
                    </Link>
                  ) : (
                    <Link
                      to={`/launch/${proj.id}`}
                      className="px-4 py-1.5 bg-[#635BFF] hover:bg-[#5048E5] text-white text-xs font-extrabold rounded-lg transition shadow-md shadow-[#635BFF]/10 shrink-0 font-sans cursor-pointer"
                    >
                      参与共建 &rarr;
                    </Link>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {filteredProjects.length === 0 && (
          <div className="col-span-full py-16 text-center text-gray-400 font-sans text-xs">
            暂无当前分类的星火项目
          </div>
        )}
      </div>
    </div>
  );
}
