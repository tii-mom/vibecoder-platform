import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Sparkles, ArrowLeft, ArrowRight, Bot, Check, Globe, Gift, ChevronDown, ChevronUp, Info, Calendar, FileText, AlertTriangle } from 'lucide-react';
import { useUserStore } from '../store/userStore';
import { useSparkStore } from '../store/sparkStore';
import type { LaunchType } from '../types/spark';
import { getWalletJwt } from '../services/telegramAuth';
import { useTranslation } from '../hooks/useTranslation';

const API_BASE = import.meta.env.VITE_API_URL || 'https://api.72h.lol';

export default function CreateLaunchPage() {
  const { t, language } = useTranslation();
  const navigate = useNavigate();
  const { isConnected, walletAddress, connectWallet } = useUserStore();
  const { ecosystems, createEcosystem, getEcosystemsByCreator } = useSparkStore();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [submitting, setSubmitting] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  // Step 1
  const [launchType, setLaunchType] = useState<LaunchType>('PROJECT_TOKEN');
  const [ecosystemId, setEcosystemId] = useState('');
  const [newEcoName, setNewEcoName] = useState('');
  const [newEcoDesc, setNewEcoDesc] = useState('');
  const [showNewEcoForm, setShowNewEcoForm] = useState(false);

  // Step 2: token launches
  const [projectName, setProjectName] = useState('');
  const [tokenSymbol, setTokenSymbol] = useState('');
  const [description, setDescription] = useState('');
  const [goalAmount, setGoalAmount] = useState('5000');
  const [extraPerks, setExtraPerks] = useState('');

  // NO_TOKEN specific
  const [deliverableType, setDeliverableType] = useState('preorder');
  const [deliverableDesc, setDeliverableDesc] = useState('');
  const [deliveryDate, setDeliveryDate] = useState('');
  const [disputeRules, setDisputeRules] = useState('refund_if_late');

  // Advanced
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [category, setCategory] = useState('data_analytics');
  const [tagsInput, setTagsInput] = useState('#TON, #AI');
  const [teamDesc, setTeamDesc] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [backerTokenShare, setBackerTokenShare] = useState(37);
  const [parentTokenAddress, setParentTokenAddress] = useState('');

  // Step 3
  const [success, setSuccess] = useState(false);
  const [createdProject, setCreatedProject] = useState<any>(null);

  const myEcosystems = walletAddress ? getEcosystemsByCreator(walletAddress) : [];
  const isNoToken = launchType === 'NO_TOKEN';
  const isHubToken = launchType === 'HUB_TOKEN';

  const LAUNCH_TYPES: { value: LaunchType; label: string; desc: string; shareLabel: string; color: string }[] = [
    {
      value: 'NO_TOKEN',
      label: language === 'zh' ? '小功能 / 版本更新' : language === 'ko' ? '기능 및 버전 업데이트' : 'Features & Version Update',
      desc: language === 'zh' ? '用 Stars 预购、VC 积分或收入分成凭证。不创建新代币，适合插件、功能模块。' : language === 'ko' ? 'Stars 사전 구매, VC 포인트 또는 수익 공유 전표 사용. 신규 토큰 생성 없음, 플러그인 및 모듈에 적합.' : 'Pre-order with Stars, VC points, or revenue share credits. No new tokens created, suitable for plugins or modules.',
      shareLabel: '0%',
      color: 'border-gray-500 text-gray-400'
    },
    {
      value: 'HUB_TOKEN',
      label: language === 'zh' ? '项目方生态母币' : language === 'ko' ? '프로젝트 생태계 메인 토큰' : 'Ecosystem Main Token',
      desc: language === 'zh' ? '建立工作室长期品牌。母币代表生态权益，出让 20%-30% 给 Spark 用户。' : language === 'ko' ? '스튜디오의 장기 브랜드 구축. 메인 토큰은 생태계 권리를 나타내며 Spark 사용자에게 20%-30% 양도.' : 'Establish studio long-term brand. Main token represents ecosystem rights, offering 20%-30% to Spark users.',
      shareLabel: '20%-30%',
      color: 'border-purple-500 text-purple-400'
    },
    {
      value: 'PROJECT_TOKEN',
      label: language === 'zh' ? '独立产品子币' : language === 'ko' ? '독립 제품 서브 토큰' : 'Product Sub-token',
      desc: language === 'zh' ? '独立 AI Agent / SaaS 产品发币。出让 30%-40% 给 Spark 用户。可绑定母币生态。' : language === 'ko' ? '독립된 AI 에이전트 / SaaS 제품 토큰 발행. Spark 사용자에게 30%-40% 양도, 메인 토큰 생태계 연동 가능.' : 'Independent AI Agent / SaaS product token launch. Offering 30%-40% to Spark users, can bind to parent token ecosystem.',
      shareLabel: '30%-40%',
      color: 'border-[#635BFF] text-[#837BFF]'
    },
  ];

  const DELIVERABLE_TYPES = [
    { value: 'preorder', label: language === 'zh' ? '功能预购 (Pre-order)' : language === 'ko' ? '기능 사전 구매 (Pre-order)' : 'Feature Pre-order' },
    { value: 'revenue_share', label: language === 'zh' ? '收入分成凭证 (Revenue Share)' : language === 'ko' ? '수익 공유 증표 (Revenue Share)' : 'Revenue Share Voucher' },
    { value: 'usage_credits', label: language === 'zh' ? '使用额度积分 (Usage Credits)' : language === 'ko' ? '사용 한도 포인트 (Usage Credits)' : 'Usage Credits' },
    { value: 'early_access', label: language === 'zh' ? '抢先体验权 (Early Access)' : language === 'ko' ? '사전 체험 권한 (Early Access)' : 'Early Access' },
    { value: 'other', label: language === 'zh' ? '其他权益' : language === 'ko' ? '기타 권리 혜택' : 'Other Perks' },
  ];

  const DISPUTE_RULES_MAP = [
    { value: 'refund_if_late', label: language === 'zh' ? '未按时交付全额退款' : language === 'ko' ? '미인도 시 전액 환불' : 'Full refund if not delivered on time' },
    { value: 'appeal_7_days', label: language === 'zh' ? '交付后 7 天内可申诉退款' : language === 'ko' ? '인도 후 7일 이내 환불 신청 가능' : 'Appeals for refund allowed within 7 days post-delivery' },
    { value: 'non_refundable_after_delivery', label: language === 'zh' ? '交付后不可退款' : language === 'ko' ? '인도 후 환불 불가' : 'Non-refundable after delivery' },
  ];

  const CATEGORY_OPTIONS = [
    { value: 'data_analytics', label: language === 'zh' ? '数据分析' : language === 'ko' ? '데이터 분석' : 'Data Analysis' },
    { value: 'trading_tools', label: language === 'zh' ? '交易工具' : language === 'ko' ? '거래 도구' : 'Trading Tools' },
    { value: 'social', label: language === 'zh' ? '社交' : language === 'ko' ? '소셜' : 'Social' },
    { value: 'monitoring', label: language === 'zh' ? '监控' : language === 'ko' ? '모니터링' : 'Monitoring' },
    { value: 'infrastructure', label: language === 'zh' ? '基础设施' : language === 'ko' ? '인프라' : 'Infrastructure' },
    { value: 'creator_tools', label: language === 'zh' ? '创作工具' : language === 'ko' ? '창작 도구' : 'Creation Tools' },
    { value: 'defi', label: 'DeFi' },
  ];

  useEffect(() => {
    if (isHubToken) setBackerTokenShare(25);
    else if (launchType === 'PROJECT_TOKEN') setBackerTokenShare(37);
    else setBackerTokenShare(0);
  }, [launchType]);

  const handleCreateEcosystem = async () => {
    if (!newEcoName.trim()) return;
    const eco = await createEcosystem(newEcoName.trim(), newEcoDesc.trim(), walletAddress || '');
    setEcosystemId(eco.id);
    setNewEcoName(''); setNewEcoDesc(''); setShowNewEcoForm(false);
  };

  const nextStep = () => {
    setFormError(null);
    if (step === 1) { setStep(2); return; }
    if (step === 2) {
      if (!projectName.trim()) { setFormError(language === 'zh' ? '请输入项目名称' : language === 'ko' ? '프로젝트 이름을 입력하세요.' : 'Please enter project name'); return; }
      if (!isNoToken && !tokenSymbol.trim()) { setFormError(language === 'zh' ? '请输入代币符号' : language === 'ko' ? '토큰 심볼을 입력하세요.' : 'Please enter token symbol'); return; }
      if (!description.trim()) { setFormError(language === 'zh' ? '请输入一句话描述' : language === 'ko' ? '한 줄 설명을 입력하세요.' : 'Please enter description'); return; }
      if (!goalAmount || isNaN(Number(goalAmount)) || Number(goalAmount) <= 0) { setFormError(language === 'zh' ? '请输入有效的筹资目标金额' : language === 'ko' ? '유효한 목표 모집 금액을 입력하세요.' : 'Please enter a valid funding target amount'); return; }
      if (isNoToken) {
        if (!deliveryDate) { setFormError(language === 'zh' ? '请输入预计交付日期' : language === 'ko' ? '예상 인도일을 입력하세요.' : 'Please enter expected delivery date'); return; }
        if (!deliverableDesc.trim()) { setFormError(language === 'zh' ? '请输入交付物描述' : language === 'ko' ? '인도물 설명을 입력하세요.' : 'Please enter deliverable description'); return; }
      }
      setStep(3);
    }
  };

  const handleLaunch = async () => {
    if (!isConnected) { connectWallet(); return; }
    setSubmitting(true);
    setApiError(null);

    try {
      const tagsArr = tagsInput.split(',').map(s => s.trim()).filter(Boolean);
      const token = getWalletJwt();

      const body: any = {
        name: projectName,
        description,
        goalAmount: Number(goalAmount),
        launchType,
        ecosystemId: ecosystemId || undefined,
        parentTokenAddress: parentTokenAddress || undefined,
        backerTokenShare: isNoToken ? 0 : backerTokenShare,
        category,
        tags: tagsArr,
        teamDesc: teamDesc || undefined,
        websiteUrl: websiteUrl || undefined,
        extraPerks: extraPerks || undefined,
      };

      if (!isNoToken) {
        body.tokenSymbol = tokenSymbol.toUpperCase();
      }
      if (isNoToken) {
        body.deliverableType = deliverableType;
        body.deliverableDesc = deliverableDesc;
        body.deliveryDate = deliveryDate;
        body.disputeRules = disputeRules;
      }

      const res = await fetch(`${API_BASE}/api/v1/launches`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(10000),
      });

      const data = await res.json();

      if (data.success && data.data) {
        const apiData = data.data;
        useSparkStore.setState(s => ({
          projects: [{
            id: apiData.id,
            projectCode: apiData.projectCode,
            agentId: `agent-direct-${Date.now()}`,
            agentName: projectName,
            agentTicker: isNoToken ? 'NOTOKEN' : tokenSymbol.toUpperCase(),
            title: `${projectName}${isNoToken ? '' : ` ($${tokenSymbol.toUpperCase()})`} ${language === 'zh' ? '星火共建计划' : language === 'ko' ? 'Spark 공동 구축 계획' : 'Spark Co-Build Plan'}`,
            description,
            goalAmount: Number(goalAmount),
            raisedAmount: 0,
            investorCount: 0,
            minInvestment: 5,
            status: 'DRAFT' as const,
            endTime: new Date(Date.now() + 15 * 24 * 3650 * 1000).toISOString(),
            creatorAddress: walletAddress || 'EQD_creator',
            tokenPrice: isNoToken ? 0 : 0.01,
            progress: 0,
            backers: [],
            category: category as any,
            tags: tagsArr,
            assuranceMode: 'staked',
            teamDesc: teamDesc || undefined,
            launchType,
            ecosystemId: ecosystemId || undefined,
            parentTokenAddress: parentTokenAddress || undefined,
            backerTokenShare: isNoToken ? 0 : backerTokenShare,
            githubUrl: websiteUrl || undefined,
            websiteUrl: websiteUrl || undefined,
            extraPerks: extraPerks || undefined,
            onchainVerifyStatus: 'unverified',
          }, ...s.projects]
        }));

        setCreatedProject({ ...data.data, tokenSymbol: isNoToken ? undefined : tokenSymbol.toUpperCase() });
        setSuccess(true);
      } else {
        setApiError(data.error || (language === 'zh' ? '创建失败，请重试' : language === 'ko' ? '생성에 실패했습니다. 다시 시도해 주세요.' : 'Creation failed, please try again'));
      }
    } catch (err: any) {
      setApiError(err.message || (language === 'zh' ? '网络连接超时' : language === 'ko' ? '네트워크 연결이 타임아웃되었습니다.' : 'Network connection timeout'));
    } finally {
      setSubmitting(false);
    }
  };

  const selectedType = LAUNCH_TYPES.find(t => t.value === launchType);

  if (!isConnected) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center space-y-6">
        <Bot size={48} className="text-[#635BFF] mx-auto animate-pulse" />
        <h2 className="text-xl font-black text-white">{t('create.connectWalletTitle')}</h2>
        <p className="text-xs text-gray-400 max-w-sm mx-auto leading-relaxed">{t('create.connectWalletDesc')}</p>
        <button onClick={() => connectWallet()} className="px-6 py-2.5 bg-[#635BFF] hover:bg-[#5048E5] text-white text-xs font-bold rounded-xl transition cursor-pointer">{t('create.connectWalletCTA')}</button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6 text-left select-none animate-in fade-in duration-200">
      <div className="border-b border-[#1A1F42] pb-4">
        <Link to="/launch" className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-white mb-2 font-semibold"><ArrowLeft size={12} /><span>{t('create.backToList')}</span></Link>
        <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2"><Sparkles className="text-[#635BFF]" size={22} /><span>{t('create.pageTitle')}</span></h1>
        <p className="text-xs text-gray-400 mt-1">{t('create.pageDesc')}</p>
      </div>

      {success ? (
        <div className="bg-[#0B151F]/90 border border-emerald-500/25 p-8 rounded-3xl text-center space-y-6 animate-in zoom-in-95 duration-300 max-w-2xl mx-auto relative overflow-hidden">
          <div className="absolute -top-10 -left-10 w-40 h-40 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-[#635BFF]/5 rounded-full blur-3xl pointer-events-none" />
          <Gift size={56} className="text-emerald-400 mx-auto" />
          <h2 className="text-xl font-black text-white">{t('create.successTitle')}</h2>
          <p className="text-xs text-emerald-400 font-mono">{t('create.successSubtitle')}</p>

          <div className="bg-[#0C0E1D] border border-[#212450] p-5 rounded-2xl text-left space-y-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#635BFF] to-sky-400 flex items-center justify-center font-mono font-black text-white text-xs">
                {isNoToken ? '⚡' : (tokenSymbol.toUpperCase().slice(0, 3))}
              </div>
              <div>
                <span className="font-extrabold text-white block text-xs">{projectName}</span>
                <span className="text-[10px] text-gray-400 block font-mono">
                  {language === 'zh' ? `编号: ${createdProject?.projectCode} · 目标: ${goalAmount} TON · 类型: ${selectedType?.label}` : language === 'ko' ? `번호: ${createdProject?.projectCode} · 목표: ${goalAmount} TON · 유형: ${selectedType?.label}` : `Code: ${createdProject?.projectCode} · Target: ${goalAmount} TON · Type: ${selectedType?.label}`}
                </span>
              </div>
            </div>
            {isNoToken && (
              <div className="bg-amber-500/5 border border-amber-500/15 rounded-xl p-3 mt-2 text-[10px] text-amber-400 flex items-start gap-2">
                <FileText size={13} className="shrink-0 mt-0.5" />
                <div>
                  <div><strong>{t('create.deliverableTypeLabel').replace(' *', '')}:</strong> {DELIVERABLE_TYPES.find(d => d.value === deliverableType)?.label}</div>
                  <div className="mt-1 text-amber-300/70">{deliverableDesc}</div>
                  <div className="mt-1"><Calendar size={10} className="inline mr-1" />{t('create.deliveryDateLabel').replace(' *', '')}: {deliveryDate}</div>
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-4 justify-center pt-2">
            <button onClick={() => navigate(`/launch/${createdProject?.id || 'spark-latest'}`)} className="px-5 py-2.5 bg-[#10B981] hover:bg-[#0AA270] text-[#07080E] text-xs font-black rounded-xl transition cursor-pointer">{t('create.viewProjectHome')}</button>
            <button onClick={() => navigate('/portfolio')} className="px-5 py-2.5 bg-[#121429] hover:bg-[#1C1F3D] border border-[#272B51] text-gray-300 hover:text-white text-xs font-bold rounded-xl transition cursor-pointer">{t('create.enterPortfolio')}</button>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Step progress */}
          <div className="grid grid-cols-3 gap-2 bg-[#0A0D18] p-1.5 rounded-xl border border-[#191D3C]">
            {[1, 2, 3].map(s => (
              <button key={s} onClick={() => s < step ? setStep(s as 1 | 2 | 3) : undefined}
                className={`py-2 text-[10.5px] font-bold rounded-lg transition text-center ${step === s ? 'bg-[#1C1A3F] text-white border border-[#2E2C5B]' : step > s ? 'text-emerald-400' : 'text-gray-500'}`}>
                {step > s && <Check size={11} className="inline mr-1" />}
                {s === 1 ? t('create.step1') : s === 2 ? t('create.step2') : t('create.step3')}
              </button>
            ))}
          </div>

          {step === 1 && (
            <div className="bg-[#0C0E1D] border border-[#1C2045] p-6 rounded-2xl space-y-6">
              <div className="flex items-center gap-2 border-b border-[#212450] pb-2">
                <Bot size={16} className="text-[#635BFF]" />
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">{t('create.launchTypeHeader')}</h3>
              </div>
              <div className="grid gap-4">
                {LAUNCH_TYPES.map(lt => (
                  <button key={lt.value} onClick={() => setLaunchType(lt.value)}
                    className={`p-4 rounded-2xl border-2 text-left transition-all ${
                      launchType === lt.value ? `${lt.color} bg-[#1A1F42]/30` : 'border-[#1A1E3C] bg-[#0C0E1D] hover:border-gray-600'
                    }`}>
                    <div className="flex items-center justify-between mb-2 border-none">
                      <span className="text-sm font-black text-white">{lt.label}</span>
                      <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${lt.color}`}>{t('create.shareLabel', { ratio: lt.shareLabel })}</span>
                    </div>
                    <p className="text-xs text-gray-400">{lt.desc}</p>
                  </button>
                ))}
              </div>
              {(launchType === 'HUB_TOKEN' || launchType === 'PROJECT_TOKEN') && (
                <div className="space-y-3 border-t border-[#1C2045] pt-4">
                  <label className="text-xs text-gray-400 font-semibold block">{t('create.bindEcoLabel')}</label>
                  {myEcosystems.length > 0 ? (
                    <select value={ecosystemId} onChange={e => setEcosystemId(e.target.value)}
                      className="w-full bg-[#121429] border border-[#24284D] focus:border-[#635BFF] outline-none rounded-xl px-3.5 py-2.5 text-xs text-gray-200 cursor-pointer">
                      <option value="">{t('create.noBindEco')}</option>
                      {myEcosystems.map(eco => (<option key={eco.id} value={eco.id}>{eco.name} ({eco.ecosystemCode})</option>))}
                    </select>
                  ) : null}
                  {!showNewEcoForm ? (
                    <button onClick={() => setShowNewEcoForm(true)} className="text-[10px] text-[#8B83FF] hover:text-white flex items-center gap-1 cursor-pointer font-bold">{t('create.createEcoCTA')}</button>
                  ) : (
                    <div className="bg-[#101224] border border-[#21254F] p-4 rounded-xl space-y-3">
                      <input type="text" placeholder={t('create.ecoNamePlaceholder')} value={newEcoName} onChange={e => setNewEcoName(e.target.value)} className="w-full bg-[#121429] border border-[#24284D] focus:border-[#635BFF] outline-none rounded-xl px-3.5 py-2.5 text-xs text-gray-200" />
                      <input type="text" placeholder={t('create.ecoDescPlaceholder')} value={newEcoDesc} onChange={e => setNewEcoDesc(e.target.value)} className="w-full bg-[#121429] border border-[#24284D] focus:border-[#635BFF] outline-none rounded-xl px-3.5 py-2.5 text-xs text-gray-200" />
                      <button onClick={handleCreateEcosystem} className="w-full py-2 bg-[#635BFF] hover:bg-[#5048E5] text-white text-xs font-bold rounded-xl transition cursor-pointer">{t('create.createEcoBtn')}</button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {step === 2 && (
            <div className="bg-[#0C0E1D] border border-[#1C2045] p-6 rounded-2xl space-y-5">
              <div className="flex items-center gap-2 border-b border-[#212450] pb-2">
                <Info size={16} className="text-[#10B981]" />
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">{t('create.basicInfoTitle')}</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5 text-left">
                  <label className="text-xs text-gray-400 font-semibold">{t('create.projectNameLabel')}</label>
                  <input type="text" placeholder="OmniSocial" value={projectName} onChange={e => setProjectName(e.target.value)}
                    className="w-full bg-[#121429] border border-[#24284D] focus:border-[#635BFF] outline-none rounded-xl px-3.5 py-2.5 text-xs text-gray-200" />
                </div>
                {!isNoToken ? (
                  <div className="space-y-1.5 text-left">
                    <label className="text-xs text-gray-400 font-semibold">{t('create.tokenSymbolLabel')}</label>
                    <input type="text" placeholder="OSA" maxLength={8} value={tokenSymbol}
                      onChange={e => setTokenSymbol(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                      className="w-full bg-[#121429] border border-[#24284D] focus:border-[#635BFF] outline-none rounded-xl px-3.5 py-2.5 text-xs text-gray-200 font-mono" />
                  </div>
                ) : (
                  <div className="space-y-1.5 text-left">
                    <label className="text-xs text-gray-400 font-semibold">{t('create.deliverableTypeLabel')}</label>
                    <select value={deliverableType} onChange={e => setDeliverableType(e.target.value)}
                      className="w-full bg-[#121429] border border-[#24284D] focus:border-[#635BFF] outline-none rounded-xl px-3.5 py-2.5 text-xs text-gray-200 cursor-pointer">
                      {DELIVERABLE_TYPES.map(dt => (<option key={dt.value} value={dt.value}>{dt.label}</option>))}
                    </select>
                  </div>
                )}
              </div>

              <div className="space-y-1.5 text-left">
                <label className="text-xs text-gray-400 font-semibold">{t('create.descLabel')}</label>
                <textarea placeholder={t('create.descPlaceholder')} value={description} onChange={e => setDescription(e.target.value)} rows={2}
                  className="w-full bg-[#121429] border border-[#24284D] focus:border-[#635BFF] outline-none rounded-xl p-3 text-xs text-gray-200 resize-none" />
              </div>

              <div className="space-y-1.5 text-left">
                <label className="text-xs text-gray-400 font-semibold">{t('create.extraPerksLabel')}</label>
                <textarea placeholder={t('create.extraPerksPlaceholder')} value={extraPerks} onChange={e => setExtraPerks(e.target.value)} rows={2}
                  className="w-full bg-[#121429] border border-[#24284D] focus:border-[#635BFF] outline-none rounded-xl p-3 text-xs text-gray-200 resize-none" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5 text-left">
                  <label className="text-xs text-gray-400 font-semibold">{t('create.fundingGoalLabel')}</label>
                  <div className="relative">
                    <input type="number" placeholder="5000" value={goalAmount} onChange={e => setGoalAmount(e.target.value)}
                      className="w-full bg-[#121429] border border-[#24284D] focus:border-[#635BFF] text-white font-mono text-xs rounded-xl px-3.5 py-2.5 outline-none transition" />
                    <span className="absolute right-3.5 top-3 text-[10px] text-gray-550 font-mono">TON</span>
                  </div>
                </div>
                {isNoToken && (
                  <div className="space-y-1.5 text-left">
                    <label className="text-xs text-gray-400 font-semibold">{t('create.deliveryDateLabel')}</label>
                    <input type="date" value={deliveryDate} onChange={e => setDeliveryDate(e.target.value)}
                      className="w-full bg-[#121429] border border-[#24284D] focus:border-[#635BFF] outline-none rounded-xl px-3.5 py-2.5 text-xs text-gray-200" />
                  </div>
                )}
              </div>

              {/* NO_TOKEN extra fields */}
              {isNoToken && (
                <div className="space-y-3 border-t border-[#1C2045] pt-4">
                  <div className="space-y-1.5 text-left">
                    <label className="text-xs text-gray-400 font-semibold">{t('create.deliverableDescLabel')}</label>
                    <textarea placeholder={t('create.deliverableDescPlaceholder')} value={deliverableDesc} onChange={e => setDeliverableDesc(e.target.value)} rows={2}
                      className="w-full bg-[#121429] border border-[#24284D] focus:border-[#635BFF] outline-none rounded-xl p-3 text-xs text-gray-200 resize-none" />
                  </div>
                  <div className="space-y-1.5 text-left">
                    <label className="text-xs text-gray-400 font-semibold">{t('create.disputeRulesLabel')}</label>
                    <select value={disputeRules} onChange={e => setDisputeRules(e.target.value)}
                      className="w-full bg-[#121429] border border-[#24284D] focus:border-[#635BFF] outline-none rounded-xl px-3.5 py-2.5 text-xs text-gray-200 cursor-pointer">
                      {DISPUTE_RULES_MAP.map(r => (<option key={r.value} value={r.value}>{r.label}</option>))}
                    </select>
                  </div>
                </div>
              )}

              {/* Type-specific info */}
              {isNoToken && (
                <div className="bg-amber-500/5 border border-amber-500/15 rounded-xl p-3 text-[10px] text-amber-400 flex items-start gap-2">
                  <AlertTriangle size={13} className="shrink-0 mt-0.5" />
                  <span>{t('create.noTokenDisclaimer')}</span>
                </div>
              )}

              {/* Advanced toggle */}
              <div className="border-t border-[#1C2045] pt-4">
                <button onClick={() => setShowAdvanced(!showAdvanced)}
                  className="text-[10px] text-gray-500 hover:text-gray-300 flex items-center gap-1 font-bold transition cursor-pointer">
                  {showAdvanced ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                  <span>{t('create.advancedSettingsToggle')}</span>
                </button>
                {showAdvanced && (
                  <div className="mt-4 space-y-4 animate-in fade-in duration-150">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-xs text-gray-400 font-semibold">{t('create.categoryLabel')}</label>
                        <select value={category} onChange={e => setCategory(e.target.value as any)}
                          className="w-full bg-[#121429] border border-[#24284D] focus:border-[#635BFF] outline-none rounded-xl px-3.5 py-2.5 text-xs text-gray-200 cursor-pointer">
                          {CATEGORY_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>{option.label}</option>
                          ))}
                        </select>
                      </div>
                      {!isNoToken && (
                        <div className="space-y-1.5">
                          <label className="text-xs text-gray-400 font-semibold">{t('create.sparkSharePercent')}</label>
                          <input type="number" min={isHubToken ? 20 : 30} max={isHubToken ? 30 : 50} value={backerTokenShare}
                            onChange={e => setBackerTokenShare(Number(e.target.value))}
                            className="w-full bg-[#121429] border border-[#24284D] focus:border-[#635BFF] outline-none rounded-xl px-3.5 py-2.5 text-xs text-gray-200" />
                        </div>
                      )}
                      <div className="space-y-1.5">
                        <label className="text-xs text-gray-400 font-semibold">{t('create.tagsLabel')}</label>
                        <input type="text" value={tagsInput} onChange={e => setTagsInput(e.target.value)}
                          className="w-full bg-[#121429] border border-[#24284D] focus:border-[#635BFF] outline-none rounded-xl px-3.5 py-2.5 text-xs text-gray-200" />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs text-gray-400 font-semibold">{t('create.teamDescLabel')}</label>
                      <input type="text" placeholder={t('create.teamDescPlaceholder')} value={teamDesc} onChange={e => setTeamDesc(e.target.value)}
                        className="w-full bg-[#121429] border border-[#24284D] focus:border-[#635BFF] outline-none rounded-xl px-3.5 py-2.5 text-xs text-gray-200" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs text-gray-400 font-semibold">{t('create.projectWebsiteLabel')}</label>
                      <div className="relative">
                        <Globe className="absolute left-3.5 top-3 text-gray-500" size={13} />
                        <input type="url" placeholder="https://..." value={websiteUrl} onChange={e => setWebsiteUrl(e.target.value)}
                          className="w-full bg-[#121429] border border-[#24284D] focus:border-[#635BFF] outline-none rounded-xl pl-9 pr-3.5 py-2.5 text-xs text-gray-200" />
                      </div>
                    </div>
                    {launchType === 'PROJECT_TOKEN' && (
                      <div className="space-y-1.5">
                        <label className="text-xs text-gray-400 font-semibold">{t('create.parentTokenAddressLabel')}</label>
                        <input type="text" placeholder={t('create.parentTokenAddressPlaceholder')} value={parentTokenAddress} onChange={e => setParentTokenAddress(e.target.value)}
                          className="w-full bg-[#121429] border border-[#24284D] focus:border-[#635BFF] outline-none rounded-xl px-3.5 py-2.5 text-xs text-gray-200 font-mono" />
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="bg-[#0C0E1D] border border-[#1C2045] p-6 rounded-2xl space-y-6">
              <div className="flex items-center gap-2 border-b border-[#212450] pb-2">
                <Sparkles size={16} className="text-[#635BFF]" />
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">{t('create.confirmTitle')}</h3>
              </div>

              <div className="bg-[#101224] border border-[#21254F] p-5 rounded-2xl space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-[#635BFF] to-sky-400 flex items-center justify-center font-mono font-black text-white">
                    {isNoToken ? '⚡' : tokenSymbol.toUpperCase().slice(0, 4)}
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-white">{projectName}</h4>
                    <span className="text-[10px] text-gray-400 font-mono">
                      {isNoToken ? '' : `$${tokenSymbol.toUpperCase()} · `}{selectedType?.label} · {goalAmount} TON {language === 'zh' ? '目标' : language === 'ko' ? '목표' : 'Target'}
                    </span>
                  </div>
                </div>

                <div className="bg-[#06070D] p-4 rounded-xl text-xs text-gray-400 space-y-1.5">
                  <p>{description || t('create.noDesc')}</p>
                  {isNoToken && (
                    <div className="pt-2 border-t border-[#1C2045] mt-2 space-y-1">
                      <div className="flex gap-2 text-[10px]">
                        <FileText size={12} className="shrink-0 text-amber-400 mt-0.5" />
                        <span className="text-amber-300/70">{t('create.previewDeliveryType', { type: DELIVERABLE_TYPES.find(d => d.value === deliverableType)?.label || deliverableType })}</span>
                      </div>
                      {deliverableDesc && (
                        <div className="text-[10px] text-gray-400 pl-5">{deliverableDesc}</div>
                      )}
                      <div className="flex gap-2 text-[10px]">
                        <Calendar size={12} className="shrink-0 text-amber-400 mt-0.5" />
                        <span className="text-amber-300/70">{t('create.previewDeliveryDate', { date: deliveryDate, rules: DISPUTE_RULES_MAP.find(r => r.value === disputeRules)?.label || disputeRules })}</span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3 text-[10px] text-gray-500">
                  <div><span className="block text-gray-400 font-semibold">{t('create.previewLaunchType')}</span><span className="text-white">{selectedType?.label}</span></div>
                  <div><span className="block text-gray-400 font-semibold">{t('create.previewShare')}</span><span className="text-white">{isNoToken ? t('create.notApplicable') : `${backerTokenShare}%`}</span></div>
                  <div><span className="block text-gray-400 font-semibold">{t('create.previewModel')}</span><span className="text-white">{isNoToken ? t('create.notApplicable') : t('create.previewModelValue')}</span></div>
                  <div><span className="block text-gray-400 font-semibold">{t('create.previewTrigger')}</span><span className="text-white">{isNoToken ? t('create.deliveryDateReached') : t('create.previewTriggerValue')}</span></div>
                </div>

                {ecosystemId && (
                  <div className="bg-[#635BFF]/5 border border-[#635BFF]/15 rounded-xl p-3 text-[10px] text-[#8B83FF] flex items-center gap-2">
                    <Globe size={12} />
                    <span>{t('create.bindEcoText', { eco: myEcosystems.find(e => e.id === ecosystemId)?.name || ecosystemId })}</span>
                  </div>
                )}
              </div>

              <p className="text-[10px] text-gray-500 text-center leading-relaxed">
                {isNoToken ? t('create.noTokenFooter') : t('create.tokenFooter')}
              </p>

              {apiError && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-[10px] text-rose-400">{apiError}</div>
              )}
            </div>
          )}

          {/* Navigation */}
          {formError && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-[10px] text-rose-400">
              {formError}
            </div>
          )}
          <div className="flex gap-3 justify-between">
            <button onClick={() => step > 1 ? setStep((step - 1) as 1 | 2 | 3) : navigate('/launch')}
              className="px-5 py-2.5 bg-[#121429] hover:bg-[#1C1F3D] border border-[#272B51] text-gray-300 text-xs font-bold rounded-xl transition cursor-pointer flex items-center gap-1">
              <ArrowLeft size={12} /> {t('create.prevStep')}
            </button>

            {step < 3 ? (
              <button onClick={nextStep}
                className="px-5 py-2.5 bg-[#635BFF] hover:bg-[#5048E5] text-white text-xs font-bold rounded-xl transition cursor-pointer flex items-center gap-1">
                {step === 1 ? t('create.nextStep1') : t('create.nextStep2')} <ArrowRight size={12} />
              </button>
            ) : (
              <button onClick={handleLaunch} disabled={submitting}
                className="px-5 py-2.5 bg-[#10B981] hover:bg-[#0AA270] disabled:opacity-50 text-[#07080E] text-xs font-black rounded-xl transition cursor-pointer flex items-center gap-1">
                <Sparkles size={12} /> {submitting ? (language === 'zh' ? '提交中...' : language === 'ko' ? '제출 중...' : 'Submitting...') : t('create.confirmBtn')}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
