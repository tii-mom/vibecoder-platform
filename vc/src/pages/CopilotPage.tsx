import React, { useEffect, useState } from 'react';
import { Bot, ShieldCheck, ToggleLeft, ToggleRight, Sparkles, TrendingUp, Cpu, Sliders, AlertTriangle, ListFilter, Play, History, FileText, CheckCircle2, Wallet, Zap, Settings, Clock } from 'lucide-react';
import { useUserStore } from '../store/userStore';
import { useSparkStore } from '../store/sparkStore';
import { analyzeProject } from '../services/ai';
import type { CopilotAnalysis } from '../services/ai';
import { Card, CardHeader, CardTitle, CardDescription } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { useTranslation } from '../hooks/useTranslation';
import { getWalletJwt } from '../services/telegramAuth';

const API_BASE = import.meta.env.VITE_API_URL || 'https://api.72h.lol';

interface AutomationRuleRecord {
  id: string;
  rule_type: string;
  enabled: number | boolean;
  condition_json?: string | Record<string, unknown> | null;
  action_json?: string | Record<string, unknown> | null;
}

export default function CopilotPage() {
  const { isConnected, profile, connectWallet } = useUserStore();
  const { tokens, projects } = useSparkStore();
  const { t, language, setLanguage } = useTranslation();

  // Copilot overall activation state
  const [isCopilotActive, setIsCopilotActive] = useState(true);

  // Strategy Rules
  const [minScore, setMinScore] = useState<number>(85);
  const [requireStaked, setRequireStaked] = useState<boolean>(true);
  const [maxVcPerProject, setMaxVcPerProject] = useState<number>(500);
  const [autoLaunchpad, setAutoLaunchpad] = useState<boolean>(true);
  const [autoCompound, setAutoCompound] = useState<boolean>(true);

  // AI Analysis
  const [aiResult, setAiResult] = useState<CopilotAnalysis | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiProject, setAiProject] = useState('');
  const [rules, setRules] = useState<AutomationRuleRecord[]>([]);
  const [rulesLoading, setRulesLoading] = useState(false);
  const [rulesSaving, setRulesSaving] = useState(false);
  const [rulesError, setRulesError] = useState<string | null>(null);

  const runAiAnalysis = async () => {
    const p = projects[0];
    if (!p) return;
    setAiLoading(true);
    try {
      const r = await analyzeProject(p.agentName, p.description, p.raisedAmount, p.goalAmount);
      setAiResult(r);
    } finally {
      setAiLoading(false);
    }
  };

  // Settings modification notice
  const [saveNotify, setSaveNotify] = useState(false);

  const handleWalletFallback = () => {
    connectWallet();
  };

  const getRulePayload = () => ({
    rule_type: 'auto_spark',
    condition_json: {
      minScore,
      requireStaked,
      autoLaunchpad,
    },
    action_json: {
      maxVcPerProject,
      autoCompound,
    },
    project_id: null,
  });

  const getAuthHeaders = (): HeadersInit => {
    const token = getWalletJwt();
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  };

  const loadRules = async () => {
    const token = getWalletJwt();
    if (!token) return;
    setRulesLoading(true);
    setRulesError(null);
    try {
      const res = await fetch(`${API_BASE}/api/v1/automation/rules`, {
        headers: getAuthHeaders(),
      });
      const data = await res.json() as any;
      if (!res.ok || !data.success) throw new Error(data.error || `Rules API error: ${res.status}`);
      const nextRules = (data.data || []) as AutomationRuleRecord[];
      setRules(nextRules);
      const autoSpark = nextRules.find((rule) => rule.rule_type === 'auto_spark');
      if (autoSpark) {
        const conditions = typeof autoSpark.condition_json === 'string' ? JSON.parse(autoSpark.condition_json || '{}') : autoSpark.condition_json || {};
        const actions = typeof autoSpark.action_json === 'string' ? JSON.parse(autoSpark.action_json || '{}') : autoSpark.action_json || {};
        if (typeof conditions.minScore === 'number') setMinScore(conditions.minScore);
        if (typeof conditions.requireStaked === 'boolean') setRequireStaked(conditions.requireStaked);
        if (typeof conditions.autoLaunchpad === 'boolean') setAutoLaunchpad(conditions.autoLaunchpad);
        if (typeof actions.maxVcPerProject === 'number') setMaxVcPerProject(actions.maxVcPerProject);
        if (typeof actions.autoCompound === 'boolean') setAutoCompound(actions.autoCompound);
        setIsCopilotActive(Boolean(autoSpark.enabled));
      }
    } catch (error: any) {
      setRulesError(error.message || 'Failed to load automation rules');
    } finally {
      setRulesLoading(false);
    }
  };

  useEffect(() => {
    if (isConnected) {
      loadRules();
    }
  }, [isConnected]);

  const handleApplyRules = async (e: React.FormEvent) => {
    e.preventDefault();
    setRulesSaving(true);
    setRulesError(null);
    try {
      const existingRule = rules.find((rule) => rule.rule_type === 'auto_spark');
      const payload = { ...getRulePayload(), enabled: isCopilotActive };
      const res = await fetch(
        existingRule ? `${API_BASE}/api/v1/automation/rules/${existingRule.id}` : `${API_BASE}/api/v1/automation/rules`,
        {
          method: existingRule ? 'PUT' : 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify(payload),
        }
      );
      const data = await res.json() as any;
      if (!res.ok || !data.success) throw new Error(data.error || `Rules API error: ${res.status}`);
      setSaveNotify(true);
      setTimeout(() => setSaveNotify(false), 2000);
      await loadRules();
    } catch (error: any) {
      setRulesError(error.message || 'Failed to save automation rules');
    } finally {
      setRulesSaving(false);
    }
  };

  // Static AI project evaluations data matching whitepaper items
  const evaluatedProjects = [
    {
      id: "spark-1",
      name: "OmniSocial Influencer",
      ticker: "OSA",
      score: 92,
      riskLevel: "AAA",
      mode: t('copilot.evaluatedProjects.osa.mode'),
      desc: t('copilot.evaluatedProjects.osa.desc'),
      auditDetails: {
        codeDensity: t('copilot.evaluatedProjects.osa.codeDensity'),
        socialSignal: t('copilot.evaluatedProjects.osa.socialSignal'),
        chainLiquidity: t('copilot.evaluatedProjects.osa.chainLiquidity'),
      },
      assessment: t('copilot.evaluatedProjects.osa.assessment')
    },
    {
      id: "spark-2",
      name: "CodeVibe Auditor",
      ticker: "CVA",
      score: 88,
      riskLevel: "AA",
      mode: t('copilot.evaluatedProjects.cva.mode'),
      desc: t('copilot.evaluatedProjects.cva.desc'),
      auditDetails: {
        codeDensity: t('copilot.evaluatedProjects.cva.codeDensity'),
        socialSignal: t('copilot.evaluatedProjects.cva.socialSignal'),
        chainLiquidity: t('copilot.evaluatedProjects.cva.chainLiquidity'),
      },
      assessment: t('copilot.evaluatedProjects.cva.assessment')
    },
    {
      id: "pf-mock",
      name: "PumpFun Agent Mock",
      ticker: "PFM",
      score: 58,
      riskLevel: "C",
      mode: t('copilot.evaluatedProjects.pfm.mode'),
      desc: t('copilot.evaluatedProjects.pfm.desc'),
      auditDetails: {
        codeDensity: t('copilot.evaluatedProjects.pfm.codeDensity'),
        socialSignal: t('copilot.evaluatedProjects.pfm.socialSignal'),
        chainLiquidity: t('copilot.evaluatedProjects.pfm.chainLiquidity'),
      },
      assessment: t('copilot.evaluatedProjects.pfm.assessment')
    }
  ];

  // Automated assistant logging stream
  const executionLogs = [
    {
      time: "2026-05-27 10:14",
      action: t('copilot.executionLogs.log1.action'),
      detail: t('copilot.executionLogs.log1.detail')
    },
    {
      time: "2026-05-26 18:22",
      action: t('copilot.executionLogs.log2.action'),
      detail: t('copilot.executionLogs.log2.detail')
    },
    {
      time: "2026-05-25 14:02",
      action: t('copilot.executionLogs.log3.action'),
      detail: t('copilot.executionLogs.log3.detail')
    },
    {
      time: "2026-05-24 09:30",
      action: t('copilot.executionLogs.log4.action'),
      detail: t('copilot.executionLogs.log4.detail')
    }
  ];

  if (!isConnected) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-[#0C101B] border border-[#21245D] flex items-center justify-center mx-auto">
          <Bot size={28} className="text-[#635BFF] animate-pulse" />
        </div>
        <div className="space-y-2">
          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">{t('copilot.connectTitle')}</h2>
          <p className="text-xs sm:text-sm text-gray-400 max-w-md mx-auto leading-relaxed">
            {t('copilot.connectDesc')}
          </p>
        </div>
        <div className="pt-2">
          <button
            onClick={handleWalletFallback}
            className="px-6 py-2.5 bg-[#635BFF] hover:bg-[#5048E5] text-white rounded-xl text-xs sm:text-sm font-semibold shadow-lg shadow-[#635BFF]/20 transition cursor-pointer"
          >
            {t('copilot.connectButton')}
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
            <span>{t('copilot.title')}</span>
            <span className="p-1 px-2.5 bg-yellow-500/10 text-yellow-500 border border-yellow-500/15 rounded text-[10px] font-mono font-bold uppercase tracking-wider">
              {t('copilot.activeStatus')}
            </span>
          </h1>
          <p className="text-xs text-gray-400 mt-1">
            {t('copilot.description')}
          </p>
        </div>

        {/* Language selector and Global master switch toggle */}
        <div className="flex items-center gap-2">
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value as 'en' | 'zh' | 'ko')}
            className="bg-[#121620] border border-[#22253E] text-gray-300 rounded-xl px-3 py-2 text-xs font-bold transition cursor-pointer outline-none focus:border-[#635BFF]"
          >
            <option value="en">English</option>
            <option value="zh">简体中文</option>
            <option value="ko">한국어</option>
          </select>

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
                <span>{t('copilot.copilotOn')}</span>
              </>
            ) : (
              <>
                <ToggleLeft size={18} />
                <span>{t('copilot.copilotOff')}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Overview stats layout */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
        <div className="bg-[#121620] border border-[#22253E] p-4.5 rounded-xl">
          <span className="text-[10px] text-gray-550 font-mono uppercase block">{t('copilot.statsStatus')}</span>
          <div className="flex items-center gap-2 mt-1.5">
            <span className={`w-2 h-2 rounded-full ${isCopilotActive ? 'bg-emerald-500 animate-pulse' : 'bg-gray-600'}`} />
            <span className="text-sm font-black text-white">{isCopilotActive ? t('copilot.statusActive') : t('copilot.statusInactive')}</span>
          </div>
        </div>

        <div className="bg-[#121620] border border-[#22253E] p-4.5 rounded-xl">
          <span className="text-[10px] text-gray-550 font-mono uppercase block">{t('copilot.statsBalance')}</span>
          <h4 className="text-base font-black font-mono text-[#8B83FF] mt-1">{profile?.balanceVC || 21500} $VC</h4>
        </div>

        <div className="bg-[#121620] border border-[#22253E] p-4.5 rounded-xl">
          <span className="text-[10px] text-gray-550 font-mono uppercase block">{t('copilot.statsStaked')}</span>
          <h4 className="text-base font-black font-mono text-emerald-400 mt-1">800 $VC</h4>
        </div>

        <div className="bg-[#121620] border border-[#22253E] p-4.5 rounded-xl">
          <span className="text-[10px] text-gray-550 font-mono uppercase block">{t('copilot.statsLaunchpadCount')}</span>
          <h4 className="text-base font-black font-mono text-sky-450 mt-1">{t('copilot.statsLaunchpadCountValue')}</h4>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

        {/* Left Strategy Setup parameters */}
        <form onSubmit={handleApplyRules} className="lg:col-span-5 bg-[#0C101A] border border-[#1E223E] rounded-2xl p-6 space-y-5">
          <div className="flex items-center gap-1.5 border-b border-[#21244E] pb-3">
            <Sliders size={15} className="text-[#635BFF]" />
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">{t('copilot.strategyTitle')}</h3>
          </div>

          <div className="space-y-4">

            {/* Rule 1: Min Score */}
            <div className="space-y-2 text-left">
              <label className="text-xs text-gray-400 font-semibold flex justify-between">
                <span>{t('copilot.minScoreLabel')}</span>
                <span className="text-[#8B83FF] font-mono font-bold">&ge; {minScore} {t('copilot.point')}</span>
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
              <span className="text-[10px] text-gray-550 block">{t('copilot.minScoreDesc')}</span>
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
                <label htmlFor="staked_only" className="font-bold text-gray-250 cursor-pointer block select-none">{t('copilot.stakedOnlyLabel')}</label>
                <span className="text-[10px] text-gray-555 block">{t('copilot.stakedOnlyDesc')}</span>
              </div>
            </div>

            {/* Rule 3: Max investment capital */}
            <div className="space-y-1.5 text-left pt-1">
              <label className="text-xs text-gray-400 font-semibold block">{t('copilot.maxInvestmentLabel')}</label>
              <select
                value={maxVcPerProject}
                onChange={(e) => setMaxVcPerProject(Number(e.target.value))}
                className="w-full bg-[#121429] border border-slate-800 focus:border-[#635BFF] outline-none rounded-xl px-3.5 py-2 text-xs text-gray-300 transition cursor-pointer"
              >
                <option value="200">{t('copilot.maxInvestmentOpt1')}</option>
                <option value="500">{t('copilot.maxInvestmentOpt2')}</option>
                <option value="1000">{t('copilot.maxInvestmentOpt3')}</option>
              </select>
            </div>

            {/* Rule 4: Auto launchpad */}
            <div className="flex items-center justify-between p-3.5 bg-[#121424] rounded-xl border border-slate-855">
              <div className="text-left font-sans text-xs">
                <span className="font-bold text-gray-200 block">{t('copilot.autoLaunchpadLabel')}</span>
                <span className="text-[10px] text-gray-555">{t('copilot.autoLaunchpadDesc')}</span>
              </div>
              <input
                type="checkbox"
                checked={autoLaunchpad}
                onChange={(e) => setAutoLaunchpad(e.target.checked)}
                className="w-4 h-4 rounded bg-[#090A14] border-slate-800 text-emerald-500 cursor-pointer focus:ring-0"
              />
            </div>

            {/* Rule 5: Auto profits routing / compounding */}
            <div className="flex items-center justify-between p-3.5 bg-[#121424] rounded-xl border border-slate-855">
              <div className="text-left font-sans text-xs">
                <span className="font-bold text-gray-200 block">{t('copilot.autoCompoundLabel')}</span>
                <span className="text-[10px] text-gray-555">{t('copilot.autoCompoundDesc')}</span>
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
                <span>{t('copilot.strategySaveSuccess')}</span>
              </div>
            ) : (
              <button
                disabled={rulesSaving}
                type="submit"
                className="w-full py-2.5 bg-[#635BFF] hover:bg-[#5048E5] disabled:opacity-50 text-white font-extrabold text-xs rounded-xl shadow-lg shadow-[#635BFF]/15 active:scale-97 transition text-center cursor-pointer"
              >
                {rulesSaving ? 'Saving...' : t('copilot.strategySaveBtn')}
              </button>
            )}
            {rulesError && (
              <div className="mt-2 bg-rose-950/20 border border-rose-900/30 text-rose-300 text-[10px] p-2.5 rounded-xl text-center">
                {rulesError}
              </div>
            )}
          </div>
        </form>

        {/* Right Tab columns: Project scorecards & Logs */}
        <div className="lg:col-span-7 space-y-6">

          {/* Section: AI Project Discovery scorecards */}
          <div className="space-y-4">
            <h3 className="text-sm font-black text-white flex items-center gap-1.5">
              <Sparkles size={14} className="text-amber-500" />
              <span>{t('copilot.scorecardTitle')}</span>
            </h3>

            <div className="space-y-4">
              {evaluatedProjects.map((proj) => {
                const meetsThreshold = proj.score >= minScore && (!requireStaked || proj.mode.startsWith('Staked'));

                return (
                  <div key={proj.id} className="bg-[#121620] border border-[#22253E] rounded-xl p-4.5 space-y-3.5 relative overflow-hidden text-left">
                    {/* Upper heading rating block */}
                    <div className="flex items-center justify-between border-b border-slate-855 pb-2.5">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white block truncate max-w-[150px]">{proj.name}</span>
                        <span className="p-0.5 px-1.5 bg-[#635BFF]/10 text-[#8B83FF] rounded font-mono text-[9.5px] font-black">${proj.ticker}</span>
                      </div>

                      <div className="flex items-center gap-1.5 font-mono">
                        <span className="text-[10px] text-gray-550">{t('copilot.scorecardScore')}</span>
                        <span className="text-sm font-black text-amber-500">{proj.score}</span>
                        <span className="text-[10.5px] font-bold text-indigo-400 bg-indigo-500/10 px-1.5 rounded">
                          {language === 'en' ? `Risk Level ${proj.riskLevel}` : `${proj.riskLevel} ${t('copilot.scorecardRiskLevel')}`}
                        </span>
                      </div>
                    </div>

                    {/* Technical aspects */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2 font-mono text-[10px] text-gray-400">
                      <div className="p-2 bg-slate-900/30 rounded border border-slate-900 leading-normal">
                        <span className="text-[9px] text-gray-550 block">{t('copilot.scorecardCodeIntegrity')}</span>
                        <span className="text-gray-300 block font-sans truncate">{proj.auditDetails.codeDensity}</span>
                      </div>
                      <div className="p-2 bg-slate-900/30 rounded border border-slate-900 leading-normal">
                        <span className="text-[9px] text-gray-550 block">{t('copilot.scorecardSocialSignal')}</span>
                        <span className="text-gray-300 block font-sans truncate">{proj.auditDetails.socialSignal}</span>
                      </div>
                      <div className="p-2 bg-slate-900/30 rounded border border-slate-900 leading-normal">
                        <span className="text-[9px] text-gray-550 block">{t('copilot.scorecardLiquidity')}</span>
                        <span className="text-gray-300 block font-sans truncate">{proj.auditDetails.chainLiquidity}</span>
                      </div>
                    </div>

                    {/* Copilot verdict assessment */}
                    <div className="p-2.5 bg-[#090A14] rounded-lg border border-slate-900 text-left">
                      <p className="text-[10px] text-slate-300 leading-relaxed font-sans">{proj.assessment}</p>
                      <div className="flex items-center justify-between pt-1.5 mt-1 border-t border-slate-950 text-[9.5px]">
                        <span className="text-gray-550 uppercase font-mono">{t('copilot.scorecardVerdictTitle')}</span>
                        <span className={`font-mono font-black ${meetsThreshold ? 'text-emerald-400' : 'text-gray-500'}`}>
                          {meetsThreshold ? t('copilot.scorecardVerdictCompliant') : t('copilot.scorecardVerdictFiltered')}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* AI Analysis Card */}
              <div className="p-4 bg-[#121620] border border-[#635BFF]/20 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Bot size={14} className="text-[#635BFF]" />
                    <span className="text-xs font-bold text-white">{t('copilot.aiAnalysisTitle')}</span>
                  </div>
                  <button
                    onClick={runAiAnalysis}
                    disabled={aiLoading || !projects.length}
                    className="px-3 py-1.5 bg-[#635BFF] text-white rounded text-[10px] font-bold hover:bg-[#5245EE] disabled:opacity-40 transition"
                  >
                    {aiLoading ? t('copilot.aiAnalyzing') : t('copilot.aiAnalyzeBtn')}
                  </button>
                </div>
                {aiResult && (
                  <div className="space-y-2 p-3 bg-[#0A0B14] rounded-lg">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        aiResult.score >= 85 ? 'bg-amber-500/10 text-amber-400' :
                        aiResult.score >= 70 ? 'bg-[#635BFF]/10 text-[#635BFF]' :
                        'bg-gray-500/10 text-gray-400'
                      }`}>{t('copilot.aiScore')} {aiResult.score}/100</span>
                      <span className="text-[10px] text-gray-400">{aiResult.summary}</span>
                    </div>
                    {aiResult.strengths.length > 0 && (
                      <div className="text-[10px]">
                        <span className="text-emerald-400 font-bold">{t('copilot.aiStrengths')}</span>
                        {aiResult.strengths.join(', ')}
                      </div>
                    )}
                    {aiResult.risks.length > 0 && (
                      <div className="text-[10px]">
                        <span className="text-red-400 font-bold">{t('copilot.aiRisks')}</span>
                        {aiResult.risks.join(', ')}
                      </div>
                    )}
                  </div>
                )}
              </div>

            </div>
          </div>

          {/* Section: Automatic logs dashboard */}
          <div className="space-y-4">
            <h3 className="text-sm font-black text-white flex items-center gap-1.5">
              <History size={13} className="text-[#8B83FF]" />
              <span>{t('copilot.logTitle')}</span>
            </h3>

            <Card className="p-0 overflow-hidden font-mono text-[10px]">
              <div className="divide-y divide-[#21243C]">
                {executionLogs.map((log, index) => (
                  <div key={index} className="p-3.5 hover:bg-[#121620]/40 transition flex items-start gap-4">
                    <span className="text-gray-550 shrink-0 select-none pt-0.5">{log.time}</span>
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
              <span>{t('copilot.comparisonTitle')}</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="bg-[#05060B] border border-[#161933] p-4 rounded-lg space-y-2.5">
                <span className="text-[10px] text-gray-550 font-mono block uppercase">{t('copilot.comparisonTradTitle')}</span>
                <ul className="space-y-1.5 text-gray-400 font-sans text-[11px] list-disc pl-4 leading-relaxed">
                  <li><strong>{t('copilot.comparisonTrad1Title')}</strong> {t('copilot.comparisonTrad1Desc')}</li>
                  <li><strong>{t('copilot.comparisonTrad2Title')}</strong> {t('copilot.comparisonTrad2Desc')}</li>
                  <li><strong>{t('copilot.comparisonTrad3Title')}</strong> {t('copilot.comparisonTrad3Desc')}</li>
                  <li><strong>{t('copilot.comparisonTrad4Title')}</strong> {t('copilot.comparisonTrad4Desc')}</li>
                </ul>
              </div>

              <div className="bg-[#635BFF]/5 border border-[#635BFF]/25 p-4 rounded-lg space-y-2.5">
                <span className="text-[10px] text-[#8B83FF] font-mono block uppercase text-emerald-400">{t('copilot.comparisonCopilotTitle')}</span>
                <ul className="space-y-1.5 text-gray-300 font-sans text-[11px] list-disc pl-4 leading-relaxed">
                  <li><strong>{t('copilot.comparisonCopilot1Title')}</strong> {t('copilot.comparisonCopilot1Desc')}</li>
                  <li><strong>{t('copilot.comparisonCopilot2Title')}</strong> {t('copilot.comparisonCopilot2Desc')}</li>
                  <li><strong>{t('copilot.comparisonCopilot3Title')}</strong> {t('copilot.comparisonCopilot3Desc')}</li>
                  <li><strong>{t('copilot.comparisonCopilot4Title')}</strong> {t('copilot.comparisonCopilot4Desc')}</li>
                </ul>
              </div>
            </div>
          </div>

          {/* === Automation & Agentic Wallet Section === */}
          <div className="mt-6 space-y-4">
            <div className="flex items-center gap-2 px-1">
              <Zap size={16} className="text-[#635BFF]" />
              <span className="text-sm font-black text-white uppercase tracking-wider">{t('copilot.automationTitle')}</span>
            </div>

            {/* Agentic Wallet Card */}
            <div className="p-4 bg-[#1C1A3F]/50 border border-[#635BFF]/20 rounded-xl">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Wallet size={16} className="text-[#8B83FF]" />
                  <span className="text-xs font-bold text-white">{t('copilot.walletTitle')}</span>
                </div>
                <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 rounded text-[9px] font-bold">
                  {isConnected ? t('copilot.walletAvailable') : t('copilot.walletNeedConnect')}
                </span>
              </div>
              <p className="text-[10px] text-gray-400 mb-3 leading-relaxed">
                {t('copilot.walletDesc')}
              </p>
              <button
                onClick={handleWalletFallback}
                className="w-full py-2.5 bg-[#635BFF] text-white rounded-lg text-xs font-bold hover:bg-[#5245EE] transition flex items-center justify-center gap-2"
              >
                <Bot size={14} />
                {isConnected ? t('copilot.walletCreateBtn') : t('copilot.walletConnectToCreateBtn')}
              </button>
            </div>

            {/* Automation Rules */}
            <div className="p-4 bg-[#121620] border border-[#22253E] rounded-xl space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Settings size={14} className="text-gray-400" />
                  <span className="text-xs font-bold text-white">{t('copilot.autoRulesTitle')}</span>
                </div>
                <span className="text-[9px] text-gray-500 font-mono">
                  {rulesLoading ? 'Loading rules' : `${rules.length} rules`}
                </span>
              </div>
              {rulesError && (
                <div className="p-2 bg-rose-500/10 border border-rose-500/20 rounded text-[10px] text-rose-300">
                  {rulesError}
                </div>
              )}

              {/* Auto-Spark Rule */}
              <div className="p-3 bg-[#1A1C2C] rounded-lg border border-[#22253E] space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles size={12} className="text-[#635BFF]" />
                    <span className="text-[11px] font-bold text-white">{t('copilot.autoSparkTitle')}</span>
                  </div>
                  <button className="text-[10px] text-gray-400 hover:text-white transition">
                    {autoLaunchpad ? <ToggleRight size={18} className="text-[#635BFF]" /> : <ToggleLeft size={18} />}
                  </button>
                </div>
                <div className="flex items-center justify-between text-[9px] font-mono text-gray-500">
                  <span>ID: {rules.find((rule) => rule.rule_type === 'auto_spark')?.id || 'not saved'}</span>
                  <span className={isCopilotActive ? 'text-emerald-400' : 'text-gray-500'}>
                    {isCopilotActive ? 'enabled' : 'disabled'}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[9px] text-gray-550 block">{t('copilot.autoSparkMinScore')}</label>
                    <input type="number" value={minScore} onChange={(e) => setMinScore(Number(e.target.value))}
                      className="w-full bg-[#0A0B14] border border-[#22253E] rounded px-2 py-1 text-[10px] text-white" />
                  </div>
                  <div>
                    <label className="text-[9px] text-gray-550 block">{t('copilot.autoSparkMaxTon')}</label>
                    <input type="number" value={maxVcPerProject / 5} onChange={(e) => setMaxVcPerProject(Number(e.target.value) * 5)}
                      className="w-full bg-[#0A0B14] border border-[#22253E] rounded px-2 py-1 text-[10px] text-white" />
                  </div>
                </div>
              </div>

              {/* Auto-Vote Rule */}
              <div className="p-3 bg-[#1A1C2C] rounded-lg border border-[#22253E] space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldCheck size={12} className="text-emerald-400" />
                    <span className="text-[11px] font-bold text-white">{t('copilot.autoVoteTitle')}</span>
                  </div>
                  <button className="text-[10px]">
                    <ToggleRight size={18} className="text-[#635BFF]" />
                  </button>
                </div>
              </div>

              {/* Auto-Exit Rule */}
              <div className="p-3 bg-[#1A1C2C] rounded-lg border border-[#22253E] space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertTriangle size={12} className="text-red-400" />
                    <span className="text-[11px] font-bold text-white">{t('copilot.autoExitTitle')}</span>
                  </div>
                  <button className="text-[10px]">
                    <ToggleLeft size={18} className="text-gray-600" />
                  </button>
                </div>
              </div>

              {/* Performance */}
              <div className="border-t border-[#22253E] pt-3 flex items-center justify-between text-[10px]">
                <div className="flex items-center gap-2">
                  <Clock size={12} className="text-gray-500" />
                  <span className="text-gray-400">{t('copilot.recentExec')}</span>
                </div>
                <div className="flex gap-3">
                  <span className="text-emerald-400">{t('copilot.recentSparkCount')}</span>
                  <span className="text-emerald-400">{t('copilot.recentVoteCount')}</span>
                  <span className="text-gray-600">{t('copilot.recentExitCount')}</span>
                </div>
              </div>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
