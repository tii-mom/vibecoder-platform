import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CheckCircle2, Sparkles, ArrowUpRight, Search, X, Users, Hash, Globe, Loader2 } from 'lucide-react';
import { useSparkStore } from '../store/sparkStore';
import { useAgentStore } from '../store/agentStore';
import { useTranslation } from '../hooks/useTranslation';

const API_BASE = import.meta.env.VITE_API_URL || 'https://api.72h.lol';

interface SearchResult {
  type: 'launch' | 'squad' | 'ecosystem';
  id: string;
  code?: string;
  name?: string;
  ticker?: string;
  title?: string;
  status?: string;
  project_id?: string;
  project_name?: string;
  creator_name?: string;
  current_members?: number;
  target_members?: number;
  current_amount?: number;
  target_amount?: number;
}

export default function LaunchPage() {
  const navigate = useNavigate();
  const { projects, tokens } = useSparkStore();
  const { agents } = useAgentStore();
  const { t } = useTranslation();

  const [selectedCategory, setSelectedCategory] = useState<string>('全部');
  const [statusFilter, setStatusFilter] = useState<'all' | 'funding' | 'listed'>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'hottest' | 'progress'>('newest');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);

  // API search state
  const [apiResults, setApiResults] = useState<SearchResult[] | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const q = searchQuery.trim();
    if (!q) { setApiResults(null); return; }

    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const res = await fetch(`${API_BASE}/api/v1/search?q=${encodeURIComponent(q)}`);
        const data = await res.json();
        if (data.success && data.data) {
          const flat: SearchResult[] = [
            ...(data.data.launches || []).map((r: any) => ({ ...r, type: 'launch' as const })),
            ...(data.data.squads || []).map((r: any) => ({ ...r, type: 'squad' as const })),
            ...(data.data.ecosystems || []).map((r: any) => ({ ...r, type: 'ecosystem' as const })),
          ];
          setApiResults(flat);
        }
      } catch {
        setApiResults(null);
      } finally {
        setSearchLoading(false);
      }
    }, 300);

    return () => clearTimeout(debounceRef.current);
  }, [searchQuery]);

  // Fallback local search (when API fails or for category/status filtering)
  const filteredProjects = projects.filter((proj) => {
    const matchesCategory = selectedCategory === '全部' || proj.category === selectedCategory;
    let matchesStatus = true;
    if (statusFilter === 'funding') matchesStatus = proj.status === 'active';
    else if (statusFilter === 'listed') matchesStatus = proj.status === 'listed' || proj.status === 'success';
    const search = searchQuery.trim();
    if (!search) return matchesCategory && matchesStatus;

    const q = search.toUpperCase();
    const matchesSearch =
      proj.projectCode?.toUpperCase().includes(q) ||
      proj.agentName?.toUpperCase().includes(q) ||
      proj.agentTicker?.toUpperCase().includes(q) ||
      proj.title?.toUpperCase().includes(q) ||
      proj.id?.toUpperCase().includes(q);

    return matchesCategory && matchesStatus && matchesSearch;
  });

  const sortedProjects = [...filteredProjects].sort((a, b) => {
    if (sortBy === 'newest') {
      return b.id.localeCompare(a.id);
    }
    if (sortBy === 'hottest') {
      const aVotes = a.upvotes || 0;
      const bVotes = b.upvotes || 0;
      if (bVotes !== aVotes) return bVotes - aVotes;
      return (b.investorCount || 0) - (a.investorCount || 0);
    }
    if (sortBy === 'progress') {
      return (b.progress || 0) - (a.progress || 0);
    }
    return 0;
  });

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = searchQuery.trim();
    if (!q) return;

    const upperQ = q.toUpperCase();

    // Try direct match from API results first, then local
    const apiMatch = apiResults?.find(r => r.type === 'launch' && r.code?.toUpperCase() === upperQ);
    if (apiMatch) { navigate(`/launch/${apiMatch.id}`); return; }

    const squadApiMatch = apiResults?.find(r => r.type === 'squad' && r.code?.toUpperCase() === upperQ);
    if (squadApiMatch) { navigate(`/launch/${squadApiMatch.project_id}?squad=${squadApiMatch.id}`); return; }

    const projectMatch = projects.find(p => p.projectCode?.toUpperCase() === upperQ);
    if (projectMatch) { navigate(`/launch/${projectMatch.id}`); return; }

    // Try parse full URL
    try {
      if (q.startsWith('http')) {
        const url = new URL(q);
        const hash = url.hash;
        const params = new URLSearchParams(hash.includes('?') ? hash.split('?')[1] : url.search);
        const ref = params.get('ref');
        const squad = params.get('squad');
        const pathMatch = hash.match(/\/launch\/([^?&]+)/);
        if (pathMatch) {
          const navPath = `/launch/${pathMatch[1]}` + (squad ? `?squad=${squad}` : ref ? `?ref=${ref}` : '');
          navigate(navPath);
          return;
        }
      }
    } catch (_) {}
  };

  const clearSearch = () => { setSearchQuery(''); setApiResults(null); setSearchFocused(false); };

  const showSearchResults = searchQuery.trim().length > 0;
  const showApiResults = apiResults !== null;
  const hasSearchResults = showApiResults
    ? apiResults.length > 0
    : (filteredProjects.length > 0);

  function getAgentCategory(agentId: string) {
    return agents.find(a => a.id === agentId)?.category || 'Other';
  }

  function getAgentAvatar(agentId: string, name: string) {
    return agents.find(a => a.id === agentId)?.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${name}`;
  }

  function translateCategory(category: string) {
    switch (category) {
      case '全部': return t('launch.categoryAll');
      case '数据分析': return t('launch.categoryData');
      case '交易工具': return t('launch.categoryTrading');
      case '社交': return t('launch.categorySocial');
      case '监控': return t('launch.categoryMonitor');
      case '基础设施': return t('launch.categoryInfra');
      case '创作工具': return t('launch.categoryCreation');
      case 'DeFi': return 'DeFi';
      default: return category;
    }
  }

  function renderSearchResults() {
    if (searchLoading) {
      return (
        <div className="px-4 py-6 text-center text-xs text-gray-500">
          <Loader2 size={18} className="mx-auto text-gray-600 mb-2 animate-spin" />
          {t('launch.searching')}
        </div>
      );
    }
    if (!showApiResults) return null;

    const launches = apiResults.filter(r => r.type === 'launch');
    const squads = apiResults.filter(r => r.type === 'squad');

    if (launches.length === 0 && squads.length === 0) {
      return (
        <div className="px-4 py-6 text-center text-xs text-gray-500">
          <Globe size={20} className="mx-auto text-gray-600 mb-2" />
          {t('launch.noResults')}
          <div className="mt-2 text-[10px]">{t('launch.noResultsTip')}</div>
        </div>
      );
    }

    return (
      <div className="p-2 space-y-1">
        {launches.length > 0 && (
          <div>
            <div className="px-3 py-1.5 text-[10px] font-mono text-gray-500 uppercase font-bold">{t('launch.launchCampaigns')} ({launches.length})</div>
            {launches.slice(0, 5).map(r => (
              <button key={r.id}
                onMouseDown={() => navigate(`/launch/${r.id}`)}
                className="w-full text-left px-3 py-2 rounded-lg hover:bg-[#1A1D3A] flex items-center gap-3">
                <Hash size={12} className="text-[#8B83FF] shrink-0" />
                <div className="min-w-0">
                  <div className="text-xs font-bold text-white truncate">{r.name || r.title}</div>
                  <div className="text-[10px] text-gray-500 font-mono">{r.code} · ${r.ticker}</div>
                </div>
              </button>
            ))}
          </div>
        )}
        {squads.length > 0 && (
          <div>
            <div className="px-3 py-1.5 text-[10px] font-mono text-gray-500 uppercase font-bold pt-1 border-t border-[#1C2045]">{t('launch.syndicateSquads')} ({squads.length})</div>
            {squads.slice(0, 5).map(r => (
              <button key={r.id}
                onMouseDown={() => navigate(`/launch/${r.project_id}?squad=${r.id}`)}
                className="w-full text-left px-3 py-2 rounded-lg hover:bg-[#1A1D3A] flex items-center gap-3">
                <Users size={12} className="text-amber-400 shrink-0" />
                <div className="min-w-0">
                  <div className="text-xs font-bold text-white truncate">{r.creator_name || t('launch.syndicateSquadName')}</div>
                  <div className="text-[10px] text-gray-500 font-mono">
                    {r.code} · {t('launch.membersCount', { current: r.current_members, target: r.target_members, amount: r.current_amount, total: r.target_amount })}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  const listedProjects = projects.filter(p => p.status === 'listed');

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 text-left select-none animate-in fade-in duration-200">
      <div className="flex flex-col lg:flex-row gap-8 items-start">
        <div className="flex-1 min-w-0 space-y-8">

          {/* Page Header */}
          <div className="border-b border-[#1A1D39] pb-5 flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="p-1 px-1.5 bg-[#635BFF]/10 rounded border border-[#635BFF]/30 text-xs font-mono font-bold text-[#837BFF]">LAUNCHPAD & SPARK</span>
                <h1 className="text-2xl font-black text-white tracking-tight">{t('launch.pageTitle')}</h1>
              </div>

              {/* --- Search Bar --- */}
              <form onSubmit={handleSearchSubmit} className="relative w-full max-w-xl">
                <div className="relative">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" size={14} />
                  <input
                    type="text"
                    placeholder={t('launch.searchPlaceholder')}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onFocus={() => setSearchFocused(true)}
                    onBlur={() => setTimeout(() => setSearchFocused(false), 200)}
                    className="w-full bg-[#0A0C16] border border-[#1C2045] focus:border-[#635BFF] rounded-xl pl-10 pr-10 py-2.5 text-xs text-gray-200 placeholder-gray-600 outline-none transition"
                  />
                  {searchQuery && (
                    <button type="button" onClick={clearSearch} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white">
                      <X size={14} />
                    </button>
                  )}
                </div>

                {/* Search results dropdown */}
                {showSearchResults && searchFocused && (
                  <div className="absolute z-50 mt-1 w-full bg-[#0C0E1D] border border-[#1C2045] rounded-xl shadow-2xl max-h-80 overflow-y-auto">
                    {renderSearchResults()}
                  </div>
                )}
              </form>
            </div>

            <Link
              to="/launch/create"
              className="px-4 py-2 bg-[#635BFF] hover:bg-[#5048E5] text-white rounded-lg text-xs font-bold shadow-lg shadow-[#635BFF]/20 transition flex items-center justify-center gap-1 cursor-pointer font-sans"
            >
              <span>{t('launch.startCampaignCTA')}</span>
              <ArrowUpRight size={13} />
            </Link>
          </div>

          {/* Listing rail (hidden when searching) */}
          {!showSearchResults && listedProjects.length > 0 && (
            <div className="space-y-3.5 bg-[#0A0C16] border border-[#191D3E] p-5 rounded-2xl">
              <div className="flex items-center justify-between border-b border-[#1C2042] pb-2">
                <h3 className="text-xs sm:text-sm font-black text-white flex items-center gap-1.5">
                  <Sparkles size={14} className="text-yellow-400 animate-pulse" />
                  <span>{t('launch.launchedProjectsTitle')}</span>
                </h3>
                <span className="text-[9.5px] text-emerald-400 font-mono bg-emerald-500/10 p-1 px-2 rounded border border-emerald-500/20 font-bold uppercase transition">
                  ● Live AMM DEX Tracking
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {listedProjects.slice(0, 4).map(proj => {
                  const matchedToken = tokens.find(t => t.symbol.toLowerCase() === proj.agentTicker.toLowerCase());
                  const currentPrice = matchedToken?.price || proj.tokenPrice;
                  const growthPct = matchedToken ? (((currentPrice - proj.tokenPrice) / proj.tokenPrice) * 100).toFixed(1) : " +24.5";
                  return (
                    <div key={proj.id} className="bg-[#0D0F24] border border-[#1E234D] rounded-xl p-4 flex flex-col justify-between hover:border-[#635BFF]/50 transition relative overflow-hidden group select-none shadow-sm">
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
                            <span className="text-[9.5px] text-gray-500 font-mono font-bold block mt-0.5">{proj.projectCode} · ${proj.agentTicker}</span>
                          </div>
                        </div>
                        <CheckCircle2 size={15} className="text-emerald-400" />
                      </div>
                      <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-slate-800/60 text-left">
                        <div><span className="text-[8.5px] text-gray-500 block uppercase font-mono font-bold">{t('lifecycle.sparkAmount')}</span><span className="text-[10.5px] font-black font-mono text-white">{proj.goalAmount.toLocaleString()} <span className="text-[7.5px] text-gray-400">TON</span></span></div>
                        <div><span className="text-[8.5px] text-gray-500 block uppercase font-mono font-bold">{t('launch.tokenRatioLabel')}</span><span className="text-[10.5px] font-black font-mono text-gray-300">{proj.tokenPrice} <span className="text-[7.5px] text-gray-400">TON</span></span></div>
                        <div><span className="text-[8.5px] text-gray-500 block uppercase font-mono font-bold">DEX Price</span><span className="text-[10.5px] font-black font-mono text-emerald-400">{currentPrice} <span className="text-[7.5px] text-emerald-500/80">TON</span></span></div>
                      </div>
                      <Link to="/launchpad" className="w-full text-center py-1.5 bg-[#635BFF]/10 text-[#8B83FF] hover:bg-[#635BFF] hover:text-white transition font-extrabold text-[10px] rounded-lg mt-3.5 border border-[#635BFF]/20 cursor-pointer block font-sans">
                        {t('launch.dexHedgingCTA')}
                      </Link>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Filter Segment Toggles (hidden when searching) */}
          {!showSearchResults && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#171A37] pb-4">
              <div className="flex flex-wrap gap-2">
                {['全部', '数据分析', '交易工具', '社交', '监控', '基础设施', '创作工具', 'DeFi'].map((cat) => (
                  <button key={cat} onClick={() => setSelectedCategory(cat)}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-semibold cursor-pointer transition-all ${
                      selectedCategory === cat ? 'bg-[#635BFF] text-white font-bold' : 'bg-[#121426] border border-[#22254C] text-gray-400 hover:text-white hover:border-[#383D75]'
                    }`}>
                    {translateCategory(cat)}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-4 flex-wrap">
                {/* Sort By Toggles */}
                <div className="flex bg-[#121427] border border-[#23275A] p-0.5 rounded-xl">
                  <button onClick={() => setSortBy('newest')} className={`px-2.5 py-1 text-xs font-bold rounded-lg transition cursor-pointer ${sortBy === 'newest' ? 'bg-[#635BFF] text-white shadow-sm' : 'text-gray-400 hover:text-white'}`}>{t('launch.sortByNewest')}</button>
                  <button onClick={() => setSortBy('hottest')} className={`px-2.5 py-1 text-xs font-bold rounded-lg transition cursor-pointer ${sortBy === 'hottest' ? 'bg-[#635BFF] text-white shadow-sm' : 'text-gray-400 hover:text-white'}`}>{t('launch.sortByHottest')}</button>
                  <button onClick={() => setSortBy('progress')} className={`px-2.5 py-1 text-xs font-bold rounded-lg transition cursor-pointer ${sortBy === 'progress' ? 'bg-[#635BFF] text-white shadow-sm' : 'text-gray-400 hover:text-white'}`}>{t('launch.sortByProgress')}</button>
                </div>
                {/* Status Toggles */}
                <div className="flex bg-[#121427] border border-[#23275A] p-0.5 rounded-xl shrink-0">
                  <button onClick={() => setStatusFilter('all')} className={`px-3 py-1 text-xs font-bold rounded-lg transition cursor-pointer ${statusFilter === 'all' ? 'bg-[#635BFF] text-white shadow-sm font-bold' : 'text-gray-400 hover:text-white'}`}>{t('launch.statusAll')}</button>
                  <button onClick={() => setStatusFilter('funding')} className={`px-3 py-1 text-xs font-bold rounded-lg transition cursor-pointer flex items-center gap-1 ${statusFilter === 'funding' ? 'bg-[#635BFF] text-white shadow-sm font-bold' : 'text-gray-400 hover:text-white'}`}><span>{t('launch.statusFunding')}</span></button>
                  <button onClick={() => setStatusFilter('listed')} className={`px-3 py-1 text-xs font-bold rounded-lg transition cursor-pointer flex items-center gap-1 ${statusFilter === 'listed' ? 'bg-[#635BFF] text-white shadow-sm font-bold' : 'text-gray-400 hover:text-white'}`}><span>{t('launch.statusListed')}</span></button>
                </div>
              </div>
            </div>
          )}

          {/* Campaign List Grid */}
          {showSearchResults && !hasSearchResults ? (
            <div className="col-span-full py-16 text-center text-gray-400 font-sans text-xs space-y-3">
              <Globe size={36} className="mx-auto text-gray-600" />
              <p>No results found for "<strong className="text-gray-300">{searchQuery}</strong>"</p>
              <div className="flex gap-3 justify-center">
                <button onClick={clearSearch} className="px-4 py-1.5 bg-[#635BFF]/10 text-[#8B83FF] rounded-lg text-xs border border-[#635BFF]/20 hover:bg-[#635BFF]/20 cursor-pointer">{t('launch.clearSearch')}</button>
                <button onClick={clearSearch} className="px-4 py-1.5 bg-[#635BFF] text-white rounded-lg text-xs cursor-pointer">{t('launch.createSquadCTA')}</button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {sortedProjects.map((proj) => {
                const cat = getAgentCategory(proj.agentId);
                const avatar = getAgentAvatar(proj.agentId, proj.agentName);
                const isFinished = proj.status === 'success' || proj.status === 'listed';

                return (
                  <div key={proj.id}
                    className={`bg-[#0C0E1D] border rounded-2xl p-5 flex flex-col justify-between hover:border-[#3E4379] transition-all duration-300 relative group overflow-hidden ${
                      isFinished ? 'border-[#1E2E28]' : 'border-[#1A1E3C]'
                    }`}>
                    {proj.status === 'success' && (
                      <div className="absolute right-0 top-0 bg-indigo-500/10 text-indigo-400 text-[10px] font-mono font-bold px-3 py-1 border-b border-l border-indigo-500/20 rounded-bl-xl uppercase font-extrabold pb-1">
                        {t('launch.statusCompleted')}
                      </div>
                    )}
                    {proj.status === 'listed' && (
                      <div className="absolute right-0 top-0 bg-emerald-500/10 text-emerald-400 text-[10px] font-mono font-bold px-3 py-1 border-b border-l border-emerald-500/20 rounded-bl-xl uppercase font-extrabold pb-1">
                        {t('launch.statusListedBadge')}
                      </div>
                    )}
                    <div>
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
                          <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                            <span className="text-[10px] text-gray-400 font-semibold">{proj.projectCode} · {translateCategory(proj.category || cat)}</span>
                            {proj.extraPerks && (
                              <span className="px-1.5 py-0.2 rounded text-[8.5px] font-bold bg-[#A855F7]/10 text-[#C084FC] border border-[#A855F7]/25 font-sans tracking-wide">
                                {t('launch.perksLabel')}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <h4 className="text-xs font-bold text-gray-200 line-clamp-1 truncate text-left font-sans">{proj.title}</h4>
                        <p className="text-xs text-gray-400 text-left line-clamp-3 leading-relaxed min-h-[50px] font-sans">{proj.description}</p>
                      </div>
                    </div>
                    <div className="mt-6 space-y-4">
                      <div className="space-y-1.5">
                        <div className="flex justify-between text-[11px] font-mono">
                          <span className="text-gray-500">{t('launch.raisedGoalLabel')}</span>
                          <span className="text-white font-bold">{proj.raisedAmount} / {proj.goalAmount} TON</span>
                        </div>
                        <div className="w-full bg-[#161834] h-2 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full transition-all duration-500 ${isFinished ? 'bg-emerald-400' : 'bg-gradient-to-r from-[#635BFF] to-sky-400'}`} style={{ width: `${proj.progress}%` }} />
                        </div>
                        <div className="flex justify-between text-[10px] text-gray-400 font-mono">
                          <span>{t('launch.progressCompleted', { percent: proj.progress })}</span>
                          <span>{t('launch.backersSupported', { count: proj.investorCount })}</span>
                        </div>
                      </div>
                      <div className="pt-2 flex items-center justify-between gap-3 border-t border-[#1F223E] mt-3">
                        <div className="text-left font-sans">
                          <span className="text-[10px] text-gray-500 font-mono block">{t('launch.tokenRatioLabel')}</span>
                          <span className="text-xs text-white font-mono font-bold">
                            {proj.tokenPrice > 0 ? `1 TON = ${Math.round(1 / proj.tokenPrice).toLocaleString()} ${proj.agentTicker}` : t('launch.noTokenSale')}
                          </span>
                        </div>
                        {proj.status === 'listed' ? (
                          <Link to="/launchpad" className="px-4 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-black text-xs font-extrabold rounded-lg transition shrink-0 font-sans cursor-pointer">{t('launch.dexTradingCTA')}</Link>
                        ) : proj.status === 'success' ? (
                          <Link to="/launchpad" className="px-4 py-1.5 bg-[#635BFF] hover:bg-[#5048E5] text-white text-xs font-extrabold rounded-lg transition shrink-0 font-sans cursor-pointer animate-pulse">{t('launch.deployAmmCTA')}</Link>
                        ) : (
                          <Link to={`/launch/${proj.id}`} className="px-4 py-1.5 bg-[#635BFF] hover:bg-[#5048E5] text-white text-xs font-extrabold rounded-lg transition shadow-md shadow-[#635BFF]/10 shrink-0 font-sans cursor-pointer">{t('launch.joinCampaignCTA')}</Link>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
              {!showSearchResults && filteredProjects.length === 0 && (
                <div className="col-span-full py-16 text-center text-gray-400 font-sans text-xs">{t('launch.noCampaigns')}</div>
              )}
            </div>
          )}
        </div>

        {/* Right Column (hidden when searching) */}
        {!showSearchResults && (
          <div className="w-full lg:w-[280px] flex-shrink-0 flex flex-col gap-6 font-sans">
            <div className="bg-[#0A0C16] border border-[#1C1F3A] rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-[#1C2042] pb-2">
                <span className="text-[10px] font-mono text-[#8C84FF] tracking-wider flex items-center gap-1.5 uppercase font-bold">
                  <span className="relative flex h-1.5 w-1.5"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span><span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span></span>
                  <span>{t('launch.ecoPulse')}</span>
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-[#0D0F24] p-3 rounded-xl border border-slate-800/40 text-left"><div className="text-lg font-black text-[#F97316] font-mono">14</div><div className="text-[9px] text-gray-500 mt-0.5 font-bold">{t('launch.addedProjectsToday')}</div><span className="text-[8.5px] text-emerald-400 font-mono font-bold block mt-0.5">{t('launch.yesterdayIncrease', { count: 2 })}</span></div>
                <div className="bg-[#0D0F24] p-3 rounded-xl border border-slate-800/40 text-left"><div className="text-lg font-black text-emerald-400 font-mono">142</div><div className="text-[9px] text-gray-500 mt-0.5 font-bold">{t('launch.registeredAgents')}</div><span className="text-[8.5px] text-gray-500 font-mono block mt-0.5">{t('launch.sevenDaysIncrease', { count: 12 })}</span></div>
              </div>
              <div className="pt-2 space-y-2.5">
                <div className="text-[9.5px] font-bold text-gray-500 tracking-wider uppercase font-mono">{t('launch.hotTracksWeekly')}</div>
                <div className="space-y-2">
                  <div className="space-y-1"><div className="flex items-center justify-between text-[11px]"><span className="text-gray-300">{t('launch.trackVideo')}</span><span className="text-[9.5px] text-pink-400 font-bold font-mono">88%</span></div><div className="w-full h-1 bg-[#121427] rounded-full overflow-hidden"><div className="h-full bg-pink-500 rounded-full" style={{ width: '88%' }} /></div></div>
                  <div className="space-y-1"><div className="flex items-center justify-between text-[11px]"><span className="text-gray-300">{t('launch.trackDeFi')}</span><span className="text-[9.5px] text-[#F97316] font-bold font-mono">72%</span></div><div className="w-full h-1 bg-[#121427] rounded-full overflow-hidden"><div className="h-full bg-[#F97316] rounded-full" style={{ width: '72%' }} /></div></div>
                  <div className="space-y-1"><div className="flex items-center justify-between text-[11px]"><span className="text-gray-300">{t('launch.trackCoding')}</span><span className="text-[9.5px] text-sky-450 font-bold font-mono">58%</span></div><div className="w-full h-1 bg-[#121427] rounded-full overflow-hidden"><div className="h-full bg-sky-400 rounded-full" style={{ width: '58%' }} /></div></div>
                </div>
              </div>
            </div>
            <div className="bg-[#0A0C16] border border-[#1C1F3A] rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-[#1C2042] pb-2"><span className="text-[10px] font-mono text-[#8C84FF] tracking-wider uppercase font-bold">{t('launch.creatorStackPref')}</span></div>
              <div className="space-y-3.5">
                {[{ name: 'Cursor IDE', pct: 92, color: 'bg-[#635BFF]' },{ name: 'Claude 3.5', pct: 85, color: 'bg-purple-500' },{ name: 'Tolk (TON)', pct: 64, color: 'bg-emerald-400' },{ name: 'v0 (Vercel)', pct: 54, color: 'bg-sky-400' }].map((tool, i) => (
                  <div key={i} className="space-y-1.5"><div className="flex justify-between text-[10.5px]"><span className="text-gray-400">{tool.name}</span><span className="text-white font-bold font-mono">{tool.pct}%</span></div><div className="w-full bg-[#121427] h-1.5 rounded-full overflow-hidden"><div className={`h-full ${tool.color} rounded-full`} style={{ width: `${tool.pct}%` }} /></div></div>
                ))}
              </div>
              <div className="text-[9px] text-gray-500 leading-normal pt-2 text-center border-t border-slate-800/40">{t('launch.stackStatsFooter')}</div>
            </div>
            <div className="bg-[#0A0C16] border border-[#1C1F3A] rounded-2xl p-5 space-y-4 bg-[radial-gradient(circle_at_bottom_left,rgba(99,91,255,0.06),transparent_35%)]">
              <div className="flex items-center justify-between border-b border-[#1C2042] pb-2"><span className="text-[10px] font-mono text-[#8C84FF] tracking-wider uppercase font-bold">{t('launch.weeklyHotCreators')}</span></div>
              <div className="space-y-3">
                {[{ rank: 1, name: 'VibeLord', avatar: 'VL', score: '4,820 SPARK' },{ rank: 2, name: 'TolkMaster', avatar: 'TM', score: '3,210 SPARK' },{ rank: 3, name: 'CyberGeek', avatar: 'CG', score: '2,950 SPARK' }].map((m, idx) => (
                  <div key={idx} className="flex items-center justify-between text-xs"><div className="flex items-center gap-2"><span className={`w-4 h-4 rounded-full flex items-center justify-center font-mono font-black text-[9px] ${m.rank === 1 ? 'bg-amber-500/20 text-amber-400 border border-amber-500/20' : 'bg-[#121427] text-gray-400'}`}>{m.rank}</span><div className="w-6 h-6 rounded bg-[#1C203E] flex items-center justify-center font-mono font-extrabold text-[8px] text-gray-300">{m.avatar}</div><span className="font-bold text-gray-300 truncate max-w-[80px]">{m.name}</span></div><span className="text-[9.5px] text-gray-500 font-mono font-bold">{m.score}</span></div>
                ))}
              </div>
              <Link to="/invite" className="w-full text-center py-1.5 bg-[#635BFF]/10 text-[#8B83FF] hover:bg-[#635BFF] hover:text-white transition font-extrabold text-[10px] rounded-lg mt-2.5 border border-[#635BFF]/20 cursor-pointer block font-sans">
                {t('launch.getCreatorPrivilege')}
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
