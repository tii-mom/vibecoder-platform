import { useState, useMemo } from 'react';
import { useUserStore } from '../store/userStore';
import { useSparkStore } from '../store/sparkStore';
import { Gift, Copy, Check, Users, Shield, Zap, Sparkles, AlertCircle, Crown, Award, TrendingUp, Share2, Plus } from 'lucide-react';
import { shareToTelegram } from '../services/telegramAuth';
import { useTranslation } from '../hooks/useTranslation';

export default function InvitePage() {
  const { isConnected, walletAddress, profile, updateProfile } = useUserStore();
  const { teams, projects, referrals, addReferral, squads } = useSparkStore();
  const [copied, setCopied] = useState(false);
  const { t } = useTranslation();

  const myReferrals = useMemo(() =>
    referrals.filter(r => walletAddress && r.inviterWallet === walletAddress),
    [referrals, walletAddress]
  );

  const earnedCount = myReferrals.filter(r => r.rewardStatus === 'earned' || r.rewardStatus === 'claimed').length;
  const pendingCount = myReferrals.filter(r => r.rewardStatus === 'pending').length;
  const referralsCount = myReferrals.length;
  // Note: earnings shown below are local estimates for display.
  // Actual VC/TON balances are managed by the Worker API and on-chain data.
  const mockEarningsVC = earnedCount * 50;
  const mockEarningsTON = earnedCount * 2.5;

  const myTeams = teams.filter(t =>
    walletAddress && (t.creatorAddress === walletAddress || t.members.some(m => m.address === walletAddress))
  );
  const mySquads = useMemo(() =>
    squads.filter(s => walletAddress && s.creatorWallet === walletAddress),
    [squads, walletAddress]
  );

  const hasBacked = projects.some(p => p.backers?.some(b => b.address === walletAddress));
  const isFirstSparker = projects.some(p => {
    if (!p.backers || p.backers.length === 0) return false;
    const earliest = [...p.backers].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())[0];
    return earliest && walletAddress && earliest.address === walletAddress;
  });
  const hasCreatedTeam = teams.some(t => walletAddress && t.creatorAddress === walletAddress);

  const inviteLink = isConnected && walletAddress
    ? `${window.location.origin}/#/feed?ref=${walletAddress}`
    : `${window.location.origin}/#/feed?ref=EQD_demo_invite`;

  const handleCopy = () => {
    navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const generateSquadLink = (squadId: string): string => {
    if (!walletAddress) return '';
    const squad = squads.find(s => s.id === squadId);
    if (!squad) return `${window.location.origin}/#/feed?ref=${walletAddress}`;
    return `${window.location.origin}/#/launch/${squad.projectId}?squad=${squad.id}&ref=${walletAddress}`;
  };

  const copySquadLink = (squadId: string) => {
    navigator.clipboard.writeText(generateSquadLink(squadId));
  };

  const privileges = [
    { level: 1, requiredCount: 1, title: t('invite.creatorRules').includes('10') ? "解锁 Dev Hub 基础审计套件" : "Unlock Dev Hub Basic Auditing Suite", description: t('invite.creatorRules').includes('10') ? "一键分析智能合约 FunC 代码的安全缺陷与静态漏洞特征库。" : "One-click analysis of smart contract FunC code safety issues.", icon: Shield, reward: t('invite.creatorRules').includes('10') ? "免费使用 Dev Hub 静态检测" : "Free static code analysis on Dev Hub" },
    { level: 2, requiredCount: 3, title: t('invite.creatorRules').includes('10') ? "算力租赁 15% 永续折扣" : "15% Lifetime Discount on Compute", description: t('invite.creatorRules').includes('10') ? "在 Dev Hub 租用云端 GPU 物理节点算力账单时获得 85 折自动扣减特权。" : "Automatically get a 15% discount when leasing cloud GPU nodes on Dev Hub.", icon: Zap, reward: t('invite.creatorRules').includes('10') ? "算力账单 15% 自动豁免" : "15% automatically waived on compute bills" },
    { level: 3, requiredCount: 5, title: t('invite.creatorRules').includes('10') ? "Launchpad 创世纪早鸟通道" : "Launchpad Genesis Early-Bird Access", description: t('invite.creatorRules').includes('10') ? "允许比公募支持者提前 3 小时接入新上线 Launchpad 的 AI 智能体份额兑购。" : "Access primary Launchpad token sales 3 hours before public backers.", icon: Sparkles, reward: t('invite.creatorRules').includes('10') ? "早鸟锁定 3 小时优先权" : "Early-bird 3-hour locking priority" }
  ];

  // Helper to translate privilege data dynamically based on active locale
  const getLocalizedPrivilege = (level: number) => {
    const raw = privileges.find(p => p.level === level);
    if (!raw) return { title: '', description: '', reward: '' };

    // We can map these dynamically to ensure proper language rendering
    switch(level) {
      case 1:
        return {
          title: t('invite.creatorRules').includes('10') ? "解锁 Dev Hub 基础审计套件" : t('invite.creatorRules').includes('10') === false && t('invite.connectWalletUnlock').includes('TON') ? "Unlock Dev Hub Basic Auditing Suite" : "Dev Hub 기초 감사 패키지 해제",
          description: t('invite.creatorRules').includes('10') ? "一键分析智能合约 FunC 代码的安全缺陷与静态漏洞特征库。" : t('invite.creatorRules').includes('10') === false && t('invite.connectWalletUnlock').includes('TON') ? "One-click analysis of smart contract FunC code safety issues." : "클릭 한 번으로 스마트 계약 FunC 코드의 보안 결함 및 정적 취약점 라이브러리를 분석합니다.",
          reward: t('invite.creatorRules').includes('10') ? "免费使用 Dev Hub 静态检测" : t('invite.creatorRules').includes('10') === false && t('invite.connectWalletUnlock').includes('TON') ? "Free static code analysis on Dev Hub" : "Dev Hub 정적 테스트 무료 사용"
        };
      case 2:
        return {
          title: t('invite.creatorRules').includes('10') ? "算力租赁 15% 永续折扣" : t('invite.creatorRules').includes('10') === false && t('invite.connectWalletUnlock').includes('TON') ? "15% Lifetime Discount on Compute" : "컴퓨팅 임대 15% 영구 할인",
          description: t('invite.creatorRules').includes('10') ? "在 Dev Hub 租用云端 GPU 物理节点算力账单时获得 85 折自动扣减特权。" : t('invite.creatorRules').includes('10') === false && t('invite.connectWalletUnlock').includes('TON') ? "Automatically get a 15% discount when leasing cloud GPU nodes on Dev Hub." : "Dev Hub에서 클라우드 GPU 물리 노드 컴퓨팅 성능 임대 시 15% 자동 할인 혜택을 제공합니다.",
          reward: t('invite.creatorRules').includes('10') ? "算力账单 15% 自动豁免" : t('invite.creatorRules').includes('10') === false && t('invite.connectWalletUnlock').includes('TON') ? "15% automatically waived on compute bills" : "컴퓨팅 청구서 15% 자동 면제"
        };
      case 3:
      default:
        return {
          title: t('invite.creatorRules').includes('10') ? "Launchpad 创世纪早鸟通道" : t('invite.creatorRules').includes('10') === false && t('invite.connectWalletUnlock').includes('TON') ? "Launchpad Genesis Early-Bird Access" : "Launchpad 제네시스 얼리버드 채널",
          description: t('invite.creatorRules').includes('10') ? "允许比公募支持者提前 3 小时接入新上线 Launchpad 的 AI 智能体份额兑购。" : t('invite.creatorRules').includes('10') === false && t('invite.connectWalletUnlock').includes('TON') ? "Access primary Launchpad token sales 3 hours before public backers." : "새로 출시된 Launchpad의 AI 에이전트 지분 구매에 일반 후원자보다 3시간 더 일찍 참여할 수 있습니다.",
          reward: t('invite.creatorRules').includes('10') ? "早鸟锁定 3 小时优先权" : t('invite.creatorRules').includes('10') === false && t('invite.connectWalletUnlock').includes('TON') ? "Early-bird 3-hour locking priority" : "얼리버드 3시간 우선권 잠금"
        };
    }
  };

  if (!isConnected || !profile) {
    return (
      <div className="max-w-md mx-auto py-24 px-4 text-center space-y-6 animate-in fade-in duration-300">
        <div className="w-16 h-16 rounded-3xl bg-[#635BFF]/10 flex items-center justify-center mx-auto text-[#635BFF] border border-[#635BFF]/25 shadow-lg shadow-[#635BFF]/5">
          <Gift size={28} />
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-black text-white">{t('invite.inviteTitle')}</h2>
          <p className="text-xs text-gray-400 leading-relaxed">
            {t('invite.connectWalletUnlock')}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-10 max-w-5xl mx-auto text-left">
      <div className="space-y-1.5 border-b border-[#14162B] pb-6">
        <span className="text-[10px] font-mono text-[#8C84FF] tracking-wider block font-bold uppercase">
          ✦ Global grow & referral hub
        </span>
        <h1 className="text-2xl font-black text-white leading-none">{t('invite.pageTitle')}</h1>
        <p className="text-xs text-gray-400 max-w-xl">
          {t('invite.pageDesc')}
        </p>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="border border-[#1C1F3A] rounded-2xl p-5 flex flex-col justify-between space-y-3 relative overflow-hidden bg-gradient-to-br from-[#0E1020] to-[#06070E] bg-[radial-gradient(circle_at_top_right,rgba(99,91,255,0.08),transparent_40%)] hover:border-[#635BFF]/30 transition-all duration-300 group">
          <div className="absolute -right-6 -bottom-6 text-gray-900 opacity-20 pointer-events-none group-hover:scale-105 transition-transform duration-300"><Users size={80} /></div>
          <span className="text-[10px] font-mono text-gray-500 font-bold uppercase tracking-wider">{t('invite.referredCount')}</span>
          <div className="space-y-1 z-10 text-left">
            <h2 className="text-3xl font-black text-white font-mono">{referralsCount} <span className="text-xs text-gray-500 font-sans">{t('invite.people')}</span></h2>
            <p className="text-[10px] text-[#10B981] font-semibold">
              {pendingCount > 0 ? t('invite.pendingFirstSpark').replace('{count}', String(pendingCount)) : t('invite.experienceSent')}
            </p>
          </div>
        </div>

        <div className="border border-[#1C1F3A] rounded-2xl p-5 flex flex-col justify-between space-y-3 relative overflow-hidden bg-gradient-to-br from-[#0E1020] to-[#06070E] bg-[radial-gradient(circle_at_top_right,rgba(168,85,247,0.08),transparent_40%)] hover:border-[#A855F7]/30 transition-all duration-300">
          <span className="text-[10px] font-mono text-gray-500 font-bold uppercase tracking-wider block">
            {t('invite.mockEarningsVc')}
          </span>
          <div className="space-y-1 z-10 text-left">
            <h2 className="text-3xl font-black text-[#8B83FF] font-mono">+{mockEarningsVC.toLocaleString()} <span className="text-xs text-gray-500 font-sans">VC</span></h2>
            <p className="text-[10px] text-gray-500 font-medium">{t('invite.vcRewardDesc')}</p>
          </div>
        </div>

        <div className="border border-[#1C1F3A] rounded-2xl p-5 flex flex-col justify-between space-y-3 relative overflow-hidden bg-gradient-to-br from-[#0E1020] to-[#06070E] bg-[radial-gradient(circle_at_top_right,rgba(56,189,248,0.08),transparent_40%)] hover:border-[#38BDF8]/30 transition-all duration-300">
          <span className="text-[10px] font-mono text-gray-500 font-bold uppercase tracking-wider block">{t('invite.sparkBonusAllowance')}</span>
          <div className="space-y-1 z-10 text-left">
            <h2 className="text-3xl font-black text-sky-400 font-mono">+{mockEarningsTON.toFixed(1)} <span className="text-xs text-gray-500 font-sans">TON</span></h2>
            <p className="text-[10px] text-gray-500 font-medium">{t('invite.tonRewardDesc')}</p>
          </div>
        </div>

        <div className="border border-[#1C1F3A] rounded-2xl p-5 flex flex-col justify-between space-y-3 relative overflow-hidden bg-gradient-to-br from-[#0E1020] to-[#06070E] bg-[radial-gradient(circle_at_top_right,rgba(245,158,11,0.08),transparent_40%)] hover:border-[#F59E0B]/30 transition-all duration-300">
          <span className="text-[10px] font-mono text-gray-500 font-bold uppercase tracking-wider block">{t('invite.mySquads')}</span>
          <div className="space-y-1 z-10 text-left">
            <h2 className="text-3xl font-black text-amber-400 font-mono">{mySquads.length} <span className="text-xs text-gray-500 font-sans">{t('invite.units')}</span></h2>
            <p className="text-[10px] text-gray-500 font-medium">{t('invite.squadRecruiting')}</p>
          </div>
        </div>
      </div>

      {/* Invite link */}
      <div className="bg-[#0C0E1B] border border-[#21244A] rounded-2xl p-6 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1 text-left">
            <h3 className="text-sm font-bold text-white">{t('invite.yourInviteLink')}</h3>
            <p className="text-xs text-gray-400 leading-relaxed">
              {t('invite.rewardsDesc')}
            </p>
          </div>
          <div className="flex gap-2 shrink-0">
            <button onClick={handleCopy} className="px-4 py-2.5 bg-[#1F223F] hover:bg-[#2F325E] text-white rounded-xl text-xs font-semibold shadow-md active:scale-95 transition flex items-center justify-center gap-1.5 cursor-pointer border border-[#30335D]">
              {copied ? <Check size={14} className="text-emerald-300" /> : <Copy size={14} />}
              <span>{copied ? t('common.copied') : t('invite.copyLink')}</span>
            </button>
            <button
              onClick={() => shareToTelegram(inviteLink, '我正在参与 VibeCoder 星火共建。邀请你共同孵化顶尖 AI 智能体，一同瓜分生态平台代币与额外奖励！')}
              className="px-4 py-2.5 bg-[#635BFF] hover:bg-[#5048E5] text-white rounded-xl text-xs font-semibold shadow-md active:scale-95 transition flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Share2 size={14} />
              <span>{t('invite.shareToTg')}</span>
            </button>
          </div>
        </div>
        <div className="bg-[#060710] border border-[#141630] rounded-xl p-3 flex items-center justify-between gap-3 text-xs font-mono text-[#8C84FF] select-all truncate">
          <span>{inviteLink}</span>
        </div>
      </div>

      {/* Referral records list */}
      {myReferrals.length > 0 && (
        <div className="bg-[#090A13] border border-[#181A35] rounded-2xl p-6 space-y-4">
          <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
            <TrendingUp size={16} className="text-[#8B83FF]" />
            <span>{t('invite.referralRecords')}</span>
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="text-gray-500 font-mono border-b border-[#1F223F]">
                  <th className="pb-2 font-bold uppercase text-[10px]">{t('invite.invitedWallet')}</th>
                  <th className="pb-2 font-bold uppercase text-[10px]">{t('invite.firstSpark')}</th>
                  <th className="pb-2 font-bold uppercase text-[10px]">{t('invite.rewardAmount')}</th>
                  <th className="pb-2 font-bold uppercase text-[10px]">{t('invite.status')}</th>
                </tr>
              </thead>
              <tbody>
                {myReferrals.map((r) => (
                  <tr key={r.id} className="border-b border-[#12142A] hover:bg-[#0C0E1D]/50">
                    <td className="py-2.5 font-mono text-gray-400 text-[10px]">{r.inviteeWallet?.slice(0, 12)}...</td>
                    <td className="py-2.5 text-gray-400 text-[10px]">{r.firstSparkAmount ? `${r.firstSparkAmount} TON` : '—'}</td>
                    <td className="py-2.5 font-mono text-[#8B83FF] font-bold text-[10px]">{r.rewardVcAmount} VC</td>
                    <td className="py-2.5">
                      <span className={`text-[9px] px-2 py-0.5 rounded font-bold ${
                        r.rewardStatus === 'earned' || r.rewardStatus === 'claimed'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : r.rewardStatus === 'flagged'
                            ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                            : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                      }`}>
                        {r.rewardStatus === 'earned' || r.rewardStatus === 'claimed' ? t('invite.statusEarned') :
                         r.rewardStatus === 'flagged' ? t('invite.statusFlagged') : t('invite.statusPending')}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Privileges */}
        <div className="bg-[#090A13] border border-[#181A35] rounded-2xl p-6 space-y-6">
          <h3 className="text-sm font-black text-white uppercase tracking-wider text-left">{t('invite.privilegesUnlockProgress')}</h3>
          <div className="relative border-l border-[#1F223F] ml-3 pl-6 space-y-6 py-2 text-left">
            {privileges.map((p) => {
              const isUnlocked = referralsCount >= p.requiredCount;
              const Icon = p.icon;
              const localized = getLocalizedPrivilege(p.level);
              return (
                <div key={p.level} className="relative">
                  <span className={`absolute -left-[31px] top-0 w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all ${
                    isUnlocked ? 'bg-emerald-500 border-emerald-400 text-black shadow-lg shadow-emerald-500/20' : 'bg-[#090A13] border-[#252A4A] text-gray-500'
                  }`}>
                    {isUnlocked && <Check size={10} strokeWidth={3} />}
                  </span>
                  <div className={`space-y-1.5 transition-opacity duration-300 ${isUnlocked ? 'opacity-100' : 'opacity-50'}`}>
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border ${
                        isUnlocked ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-gray-500/5 text-gray-500 border-gray-500/10'
                      }`}>
                        {t('invite.creatorRules').includes('10') ? `邀请 ${p.requiredCount} 人` : t('invite.connectWalletUnlock').includes('TON') ? `Invite ${p.requiredCount} ${p.requiredCount > 1 ? 'people' : 'person'}` : `${p.requiredCount}명 초대`}
                      </span>
                      <h4 className="text-xs font-black text-white">{localized.title}</h4>
                    </div>
                    <p className="text-xs text-gray-400 leading-relaxed pr-2">{localized.description}</p>
                    <div className={`flex items-center gap-1.5 text-[10.5px] font-medium font-sans ${isUnlocked ? 'text-emerald-400' : 'text-gray-500'}`}>
                      <Icon size={12} className={isUnlocked ? 'text-emerald-400 animate-pulse' : 'text-gray-600'} />
                      <span>{t('invite.ecosystemFeedback')}{localized.reward}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* My Teams + Squads */}
        <div className="space-y-6">
          {/* Squads */}
          <div className="bg-[#090A13] border border-[#181A35] rounded-2xl p-6 flex flex-col justify-between space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black text-white uppercase tracking-wider text-left">{t('invite.mySquadsTitle')}</h3>
              <a href="#/launch/create?squad" className="px-3 py-1 bg-[#635BFF]/10 text-[#8B83FF] hover:bg-[#635BFF]/20 rounded-lg text-[10px] font-bold border border-[#635BFF]/20 flex items-center gap-1 cursor-pointer">
                <Plus size={11} /> {t('invite.startSquad')}
              </a>
            </div>

            {mySquads.length === 0 ? (
              <div className="border border-dashed border-[#1E223D] rounded-2xl p-8 text-center text-xs text-gray-500 leading-relaxed py-10">
                <AlertCircle size={20} className="mx-auto text-gray-600 mb-2" />
                <span>{t('invite.noSquadsDesc')}</span>
              </div>
            ) : (
              <div className="space-y-3 max-h-[200px] overflow-y-auto pr-1 text-left">
                {mySquads.map(squad => {
                  const proj = projects.find(p => p.id === squad.projectId);
                  const memberProgress = (squad.currentMembers / squad.targetMembers) * 100;
                  const amountProgress = Math.min(100, (squad.currentAmount / squad.targetAmount) * 100);

                  return (
                    <div key={squad.id} className="p-3 bg-[#111324]/50 border border-[#202341] rounded-xl space-y-2.5">
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="text-[10px] font-mono text-amber-400 bg-amber-500/10 px-1.5 py-0.2 rounded font-bold uppercase">{squad.squadCode}</span>
                          <h4 className="text-xs font-bold text-white mt-1">{proj ? proj.agentName : '未知项目'} · {t('invite.squadGroup')}</h4>
                        </div>
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                          squad.status === 'success' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                        }`}>
                          {squad.status === 'success' ? t('invite.statusSuccess') : t('invite.statusRecruiting')}
                        </span>
                      </div>
                      <div className="space-y-1.5 font-mono text-[10px] text-gray-400">
                        <div className="flex justify-between"><span>{t('invite.memberProgress')} {squad.currentMembers}/{squad.targetMembers}{t('invite.people')}</span><span>{memberProgress.toFixed(0)}%</span></div>
                        <div className="h-1.5 bg-[#05060F] rounded-full overflow-hidden border border-[#161833]">
                          <div className="h-full bg-gradient-to-r from-amber-500 to-orange-400 rounded-full transition-all" style={{ width: `${memberProgress}%` }} />
                        </div>
                        <div className="flex justify-between"><span>{t('invite.amountProgress')} {squad.currentAmount}/{squad.targetAmount} TON</span><span>{amountProgress.toFixed(0)}%</span></div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            const link = generateSquadLink(squad.id);
                            shareToTelegram(link, `我正在为项目发起 Squad 组队集火！还差几人点燃早鸟奖励。独立 Spark 资金，安全可退，达标全队白名单！`);
                          }}
                          className="flex-1 py-1.5 bg-[#635BFF]/10 hover:bg-[#635BFF]/20 text-[#8B83FF] rounded-lg text-[10px] font-bold border border-[#635BFF]/20 flex items-center justify-center gap-1 cursor-pointer transition-all"
                        >
                          <Share2 size={10} /> {t('invite.shareToTelegram')}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Teams */}
          <div className="bg-[#090A13] border border-[#181A35] rounded-2xl p-6 flex flex-col justify-between space-y-4">
            <h3 className="text-sm font-black text-white uppercase tracking-wider text-left">{t('invite.myJoinedTeams')}</h3>
            {myTeams.length === 0 ? (
              <div className="border border-dashed border-[#1E223D] rounded-2xl p-8 text-center text-xs text-gray-500 leading-relaxed py-16">
                <AlertCircle size={20} className="mx-auto text-gray-600 mb-2" />
                <span>{t('invite.noTeamsDesc')}</span>
              </div>
            ) : (
              <div className="space-y-3.5 max-h-[300px] overflow-y-auto pr-1 text-left">
                {myTeams.map((team) => {
                  const project = projects.find(p => p.id === team.projectId);
                  const progress = (team.currentAmount / team.targetAmount) * 100;
                  const isCreator = team.creatorAddress === walletAddress;
                  return (
                    <div key={team.id} className="p-3 bg-[#111324]/50 border border-[#202341] rounded-xl space-y-2.5">
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="text-[10px] font-mono text-[#8C84FF] bg-[#8C84FF]/10 px-1.5 py-0.2 rounded font-bold uppercase">{isCreator ? t('invite.myCreated') : t('invite.joined')}</span>
                          <h4 className="text-xs font-bold text-white mt-1">{project ? project.agentName : '未知智能体'} {t('invite.teamGroup')} #{team.id.slice(-4)}</h4>
                        </div>
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                          team.status === 'success' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                        }`}>{team.status === 'success' ? t('invite.teamSuccess') : t('invite.teamActive')}</span>
                      </div>
                      <div className="space-y-1 font-mono text-[10px] text-gray-400">
                        <div className="flex justify-between"><span>{t('invite.buildProgress')} {team.currentAmount}/{team.targetAmount} TON</span><span>{progress.toFixed(0)}%</span></div>
                        <div className="h-1.5 bg-[#05060F] rounded-full overflow-hidden border border-[#161833]">
                          <div className={`h-full transition-all duration-500 rounded-full ${team.status === 'success' ? 'bg-gradient-to-r from-emerald-500 to-teal-400' : 'bg-gradient-to-r from-[#635BFF] to-sky-400 animate-pulse'}`} style={{ width: `${progress}%` }} />
                        </div>
                      </div>
                      <div className="flex justify-between items-center text-[10px] text-gray-500 font-sans">
                        <span>{t('invite.membersCount').replace('{count}', String(team.members.length))}</span>
                        {team.status === 'active' && <span className="text-amber-500/80 font-mono">{t('invite.expiresIn24h')}</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Achievements */}
      <div className="bg-[#0C0E1B] border border-[#21244A] rounded-3xl p-6 space-y-5 text-left">
        <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
          <Award className="text-amber-400" size={16} />
          <span>{t('invite.mySparkAchievements')}</span>
        </h3>
        <p className="text-xs text-gray-400">{t('invite.achievementsDesc')}</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
          <div className={`border rounded-2xl p-4 flex gap-3.5 items-center transition-all ${hasBacked ? 'bg-[#121E19]/80 border-emerald-500/30 text-white shadow-lg shadow-emerald-500/5' : 'bg-[#090A13] border-[#1F223F] text-gray-500 opacity-60'}`}>
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border transition-all ${hasBacked ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-slate-900 border-slate-850 text-gray-600'}`}>
              <Zap size={22} className={hasBacked ? 'animate-bounce text-emerald-400' : ''} />
            </div>
            <div className="space-y-1"><div className="flex items-center gap-1.5"><h4 className="text-xs font-black text-white">{t('invite.achievement1Title')}</h4>{hasBacked && <span className="text-[8px] bg-emerald-500/20 text-emerald-400 font-mono px-1 rounded">{t('invite.achievementUnlocked')}</span>}</div><p className="text-[10px] text-gray-400 leading-relaxed">{t('invite.achievement1Desc')}</p></div>
          </div>
          <div className={`border rounded-2xl p-4 flex gap-3.5 items-center transition-all ${isFirstSparker ? 'bg-[#2A2112]/60 border-amber-500/30 text-white shadow-lg shadow-amber-500/5' : 'bg-[#090A13] border-[#1F223F] text-gray-500 opacity-60'}`}>
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border transition-all ${isFirstSparker ? 'bg-amber-500/10 text-amber-400 border-amber-550/30' : 'bg-slate-900 border-slate-850 text-gray-600'}`}>
              <Crown size={22} className={isFirstSparker ? 'animate-pulse text-amber-400' : ''} />
            </div>
            <div className="space-y-1"><div className="flex items-center gap-1.5"><h4 className="text-xs font-black text-white">{t('invite.achievement2Title')}</h4>{isFirstSparker && <span className="text-[8px] bg-amber-500/20 text-amber-400 font-mono px-1 rounded">{t('invite.achievementUnlocked')}</span>}</div><p className="text-[10px] text-gray-400 leading-relaxed">{t('invite.achievement2Desc')}</p></div>
          </div>
          <div className={`border rounded-2xl p-4 flex gap-3.5 items-center transition-all ${hasCreatedTeam ? 'bg-[#121A2A]/80 border-sky-500/30 text-white shadow-lg shadow-sky-500/5' : 'bg-[#090A13] border-[#1F223F] text-gray-500 opacity-60'}`}>
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border transition-all ${hasCreatedTeam ? 'bg-sky-500/10 text-sky-400 border-sky-500/30' : 'bg-slate-900 border-slate-850 text-gray-600'}`}>
              <Users size={22} className={hasCreatedTeam ? 'text-sky-400' : ''} />
            </div>
            <div className="space-y-1"><div className="flex items-center gap-1.5"><h4 className="text-xs font-black text-white">{t('invite.achievement3Title')}</h4>{hasCreatedTeam && <span className="text-[8px] bg-sky-500/20 text-sky-400 font-mono px-1 rounded">{t('invite.achievementUnlocked')}</span>}</div><p className="text-[10px] text-gray-400 leading-relaxed">{t('invite.achievement3Desc')}</p></div>
          </div>
        </div>
      </div>

      <div className="pt-2 pb-4 text-[9px] text-gray-600 font-sans text-center leading-relaxed">
        {t('invite.disclaimer')}
      </div>
    </div>
  );
}
