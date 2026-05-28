import { useState } from 'react';
import { useUserStore } from '../store/userStore';
import { useSparkStore } from '../store/sparkStore';
import { TONService } from '../services/ton';
import { Gift, Copy, Check, Users, Shield, Zap, Sparkles, AlertCircle, Crown, Award } from 'lucide-react';

export default function InvitePage() {
  const { isConnected, walletAddress, profile } = useUserStore();
  const { teams, projects } = useSparkStore();
  const [copied, setCopied] = useState(false);

  const referralsCount = profile?.referralsCount || 0;
  const mockEarningsVC = referralsCount * 500;
  const mockEarningsTON = referralsCount * 2.5;

  // Filter teams that the user created or joined
  const myTeams = teams.filter(t => 
    walletAddress && (t.creatorAddress === walletAddress || t.members.some(m => m.address === walletAddress))
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

  const privileges = [
    {
      level: 1,
      requiredCount: 1,
      title: "解锁 Dev Hub 基础审计套件",
      description: "一键分析智能合约 FunC 代码的安全缺陷与静态漏洞特征库。",
      icon: Shield,
      reward: "免费使用 Dev Hub 静态检测"
    },
    {
      level: 2,
      requiredCount: 3,
      title: "算力租赁 15% 永续折扣",
      description: "在 Dev Hub 租用云端 GPU 物理节点算力账单时获得 85 折自动扣减特权。",
      icon: Zap,
      reward: "算力账单 15% 自动豁免"
    },
    {
      level: 3,
      requiredCount: 5,
      title: "Launchpad 创世纪早鸟通道",
      description: "允许比公募支持者提前 3 小时接入新上线 Launchpad 的 AI 智能体份额兑购。",
      icon: Sparkles,
      reward: "早鸟锁定 3 小时优先权"
    }
  ];

  if (!isConnected || !profile) {
    return (
      <div className="max-w-md mx-auto py-24 px-4 text-center space-y-6 animate-in fade-in duration-300">
        <div className="w-16 h-16 rounded-3xl bg-[#635BFF]/10 flex items-center justify-center mx-auto text-[#635BFF] border border-[#635BFF]/25 shadow-lg shadow-[#635BFF]/5">
          <Gift size={28} />
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-black text-white">解锁生态特权与社交裂变</h2>
          <p className="text-xs text-gray-400 leading-relaxed">
            请连接您的 TON 智能钱包，以生成您的专属星火邀请链接，解锁代码审计、算力租赁优惠及早鸟公募特权。
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-10 max-w-5xl mx-auto text-left">
      {/* Header Title */}
      <div className="space-y-1.5 border-b border-[#14162B] pb-6">
        <span className="text-[10px] font-mono text-[#8C84FF] tracking-wider block font-bold uppercase">
          ✦ Global grow & referral hub
        </span>
        <h1 className="text-2xl font-black text-white leading-none">
          特权与社交邀请中心
        </h1>
        <p className="text-xs text-gray-400 max-w-xl">
          邀请好友参与 VibeCoder 星火共建。不仅能共同孵化顶尖 AI 智能体，还可以逐步解锁代码静态审计与早鸟额度等三档生态核心特权。
        </p>
      </div>

      {/* Referral Dashboard Info */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-[#0A0C16] border border-[#1C1F3A] rounded-2xl p-5 flex flex-col justify-between space-y-3 relative overflow-hidden">
          <div className="absolute -right-6 -bottom-6 text-gray-900 opacity-20 pointer-events-none">
            <Users size={80} />
          </div>
          <span className="text-[10px] font-mono text-gray-500 font-bold uppercase tracking-wider">成功邀请人数</span>
          <div className="space-y-1 z-10">
            <h2 className="text-3xl font-black text-white font-mono">{referralsCount} <span className="text-xs text-gray-500 font-sans">人</span></h2>
            <p className="text-[10px] text-[#10B981] font-semibold">首投体验金均已自动发放</p>
          </div>
        </div>

        <div className="bg-[#0A0C16] border border-[#1C1F3A] rounded-2xl p-5 flex flex-col justify-between space-y-3 relative overflow-hidden">
          <span className="text-[10px] font-mono text-gray-500 font-bold uppercase tracking-wider">累计获得 $VC 裂变分配</span>
          <div className="space-y-1 z-10">
            <h2 className="text-3xl font-black text-[#8B83FF] font-mono">+{mockEarningsVC.toLocaleString()} <span className="text-xs text-gray-500 font-sans">VC</span></h2>
            <p className="text-[10px] text-gray-500">每成功邀请 1 人奖励 500 $VC</p>
          </div>
        </div>

        <div className="bg-[#0A0C16] border border-[#1C1F3A] rounded-2xl p-5 flex flex-col justify-between space-y-3 relative overflow-hidden">
          <span className="text-[10px] font-mono text-gray-500 font-bold uppercase tracking-wider">星火裂变加成津贴</span>
          <div className="space-y-1 z-10">
            <h2 className="text-3xl font-black text-sky-400 font-mono">+{mockEarningsTON.toFixed(1)} <span className="text-xs text-gray-500 font-sans">TON</span></h2>
            <p className="text-[10px] text-gray-500">根据成员首次 Spark 的 15% 计提奖励</p>
          </div>
        </div>
      </div>

      {/* Copy link component */}
      <div className="bg-[#0C0E1B] border border-[#21244A] rounded-2xl p-6 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1 text-left">
            <h3 className="text-sm font-bold text-white">您的专属裂变推广链接</h3>
            <p className="text-xs text-gray-400 leading-relaxed">
              将此链接分享给好友。他们连接钱包后将自动充值 <strong>15 TON 首次共建体验金</strong>，并在他们完成首次支持后为您结算特权积分。
            </p>
          </div>
          <button 
            onClick={handleCopy}
            className="px-6 py-2.5 bg-[#635BFF] hover:bg-[#5048E5] text-white rounded-xl text-xs font-semibold shadow-md active:scale-95 transition flex items-center justify-center gap-1.5 cursor-pointer"
          >
            {copied ? <Check size={14} className="text-emerald-300" /> : <Copy size={14} />}
            <span>{copied ? '链接已复制！' : '一键复制专属链接'}</span>
          </button>
        </div>
        <div className="bg-[#060710] border border-[#141630] rounded-xl p-3 flex items-center justify-between gap-3 text-xs font-mono text-[#8C84FF] select-all truncate">
          <span>{inviteLink}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Privileges timeline */}
        <div className="bg-[#090A13] border border-[#181A35] rounded-2xl p-6 space-y-6">
          <h3 className="text-sm font-black text-white uppercase tracking-wider text-left">
            🛡️ 阶梯生态特权解锁进度
          </h3>

          <div className="relative border-l border-[#1F223F] ml-3 pl-6 space-y-6 py-2 text-left">
            {privileges.map((p) => {
              const isUnlocked = referralsCount >= p.requiredCount;
              const Icon = p.icon;

              return (
                <div key={p.level} className="relative">
                  {/* Stepper Dot */}
                  <span className={`absolute -left-[31px] top-0 w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all ${
                    isUnlocked 
                      ? 'bg-emerald-500 border-emerald-400 text-black shadow-lg shadow-emerald-500/20' 
                      : 'bg-[#090A13] border-[#252A4A] text-gray-500'
                  }`}>
                    {isUnlocked && <Check size={10} strokeWidth={3} />}
                  </span>

                  <div className={`space-y-1.5 transition-opacity duration-300 ${isUnlocked ? 'opacity-100' : 'opacity-50'}`}>
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border ${
                        isUnlocked 
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                          : 'bg-gray-500/5 text-gray-500 border-gray-500/10'
                      }`}>
                        邀请 {p.requiredCount} 人
                      </span>
                      <h4 className="text-xs font-black text-white">{p.title}</h4>
                    </div>
                    <p className="text-xs text-gray-400 leading-relaxed pr-2">
                      {p.description}
                    </p>
                    <div className={`flex items-center gap-1.5 text-[10.5px] font-medium font-sans ${isUnlocked ? 'text-emerald-400' : 'text-gray-500'}`}>
                      <Icon size={12} className={isUnlocked ? 'text-emerald-400 animate-pulse' : 'text-gray-600'} />
                      <span>生态回馈：{p.reward}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* My active team buy sparks */}
        <div className="bg-[#090A13] border border-[#181A35] rounded-2xl p-6 flex flex-col justify-between space-y-6">
          <div className="space-y-4">
            <h3 className="text-sm font-black text-white uppercase tracking-wider text-left">
              👥 我参与的拼单共建战队
            </h3>
            
            {myTeams.length === 0 ? (
              <div className="border border-dashed border-[#1E223D] rounded-2xl p-8 text-center text-xs text-gray-500 leading-relaxed py-16">
                <AlertCircle size={20} className="mx-auto text-gray-600 mb-2" />
                <span>您尚未发起或参与任何拼单小组。<br />前往星火主页或具体的 Agent 详情页可以快捷拼单！</span>
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
                          <span className="text-[10px] font-mono text-[#8C84FF] bg-[#8C84FF]/10 px-1.5 py-0.2 rounded font-bold uppercase">
                            {isCreator ? '我发起的' : '已参与'}
                          </span>
                          <h4 className="text-xs font-bold text-white mt-1">
                            {project ? project.agentName : '未知智能体'} 拼单组 #{team.id.slice(-4)}
                          </h4>
                        </div>
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                          team.status === 'success' 
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                            : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                        }`}>
                          {team.status === 'success' ? '拼单成功' : '拼单中'}
                        </span>
                      </div>

                      {/* Progress Bar */}
                      <div className="space-y-1 font-mono text-[10px] text-gray-400">
                        <div className="flex justify-between">
                          <span>共建进度: {team.currentAmount}/{team.targetAmount} TON</span>
                          <span>{progress.toFixed(0)}%</span>
                        </div>
                        <div className="h-1.5 bg-[#05060F] rounded-full overflow-hidden border border-[#161833]">
                          <div 
                            className={`h-full transition-all duration-500 rounded-full ${
                              team.status === 'success' ? 'bg-gradient-to-r from-emerald-500 to-teal-400' : 'bg-gradient-to-r from-[#635BFF] to-sky-400 animate-pulse'
                            }`}
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                      </div>

                      <div className="flex justify-between items-center text-[10px] text-gray-500 font-sans">
                        <span>成员数: {team.members.length} 人</span>
                        {team.status === 'active' && (
                          <span className="text-amber-500/80 font-mono">24h 内截止</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-[#161833] text-[9.5px] text-gray-500 font-sans text-center leading-relaxed">
            * 邀请好友拼单仅为沙盒环境测试，好友加入所扣除金额使用模拟 TON 或体验金垫扣。
          </div>
        </div>
      </div>

      {/* Achievements System */}
      <div className="bg-[#0C0E1B] border border-[#21244A] rounded-3xl p-6 space-y-5 text-left">
        <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
          <Award className="text-amber-450 animate-pulse text-amber-400" size={16} />
          <span>🏆 我的星火荣誉与成就 (My Spark Honors & Achievements)</span>
        </h3>
        <p className="text-xs text-gray-400">
          在 VibeCoder 生态共建中的专属凭证，达成对应条件即可在沙盒中点亮专属荣誉勋章。
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
          {/* Achievement 1: First Spark */}
          <div className={`border rounded-2xl p-4 flex gap-3.5 items-center transition-all ${
            hasBacked 
              ? 'bg-[#121E19]/80 border-emerald-500/30 text-white shadow-lg shadow-emerald-500/5' 
              : 'bg-[#090A13] border-[#1F223F] text-gray-500 opacity-60'
          }`}>
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border transition-all ${
              hasBacked 
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' 
                : 'bg-slate-900 border-slate-850 text-gray-600'
            }`}>
              <Zap size={22} className={hasBacked ? 'animate-bounce text-emerald-400' : ''} />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-1.5">
                <h4 className="text-xs font-black text-white">初试锋芒</h4>
                {hasBacked && <span className="text-[8px] bg-emerald-500/20 text-emerald-400 font-mono px-1 rounded">解锁</span>}
              </div>
              <p className="text-[10px] text-gray-400 leading-relaxed">首次对任意 Agent 注入星火资金共建支持。</p>
            </div>
          </div>

          {/* Achievement 2: Genesis Sparker */}
          <div className={`border rounded-2xl p-4 flex gap-3.5 items-center transition-all ${
            isFirstSparker 
              ? 'bg-[#2A2112]/60 border-amber-500/30 text-white shadow-lg shadow-amber-500/5' 
              : 'bg-[#090A13] border-[#1F223F] text-gray-500 opacity-60'
          }`}>
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border transition-all ${
              isFirstSparker 
                ? 'bg-amber-500/10 text-amber-400 border-amber-550/30' 
                : 'bg-slate-900 border-slate-850 text-gray-600'
            }`}>
              <Crown size={22} className={isFirstSparker ? 'animate-pulse text-amber-405 text-amber-400' : ''} />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-1.5">
                <h4 className="text-xs font-black text-white">创世星火人</h4>
                {isFirstSparker && <span className="text-[8px] bg-amber-500/20 text-amber-400 font-mono px-1 rounded">解锁</span>}
              </div>
              <p className="text-[10px] text-gray-400 leading-relaxed">成为至少一个 AI 智能体项目的首位星火 Backer。</p>
            </div>
          </div>

          {/* Achievement 3: Team Leader */}
          <div className={`border rounded-2xl p-4 flex gap-3.5 items-center transition-all ${
            hasCreatedTeam 
              ? 'bg-[#121A2A]/80 border-sky-500/30 text-white shadow-lg shadow-sky-500/5' 
              : 'bg-[#090A13] border-[#1F223F] text-gray-500 opacity-60'
          }`}>
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border transition-all ${
              hasCreatedTeam 
                ? 'bg-sky-500/10 text-sky-400 border-sky-500/30' 
                : 'bg-slate-900 border-slate-850 text-gray-600'
            }`}>
              <Users size={22} className={hasCreatedTeam ? 'text-sky-400' : ''} />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-1.5">
                <h4 className="text-xs font-black text-white">领袖先锋</h4>
                {hasCreatedTeam && <span className="text-[8px] bg-sky-500/20 text-sky-400 font-mono px-1 rounded">解锁</span>}
              </div>
              <p className="text-[10px] text-gray-400 leading-relaxed">发起过至少一次 Team Spark 极客拼单共建战队。</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
