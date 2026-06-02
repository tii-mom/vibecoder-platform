import React, { useState } from 'react';
import { Send, Copy, Check, Users, Sparkles, Trophy, ShieldCheck } from 'lucide-react';
import { shareToTelegram } from '../services/telegramAuth';
import { useTranslation } from '../hooks/useTranslation';

interface ShareModalProps {
  project: any;
  amount?: number;
  teamId?: string;
  isCreator?: boolean;
  onClose: () => void;
}

export default function ShareModal({
  project,
  amount = 0,
  teamId,
  isCreator = false,
  onClose
}: ShareModalProps) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);

  // Stable invite code: generated once per mount, persists across re-renders
  const [inviteCode] = useState(() => `VibeDev_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`);

  // Custom URL: if teamId is provided, generate a team link; otherwise, a general referral link
  const inviteLink = isCreator
    ? `${window.location.origin}/#/launch/${project.id}?creatorRef=${inviteCode}`
    : teamId
      ? `${window.location.origin}/#/launch/${project.id}?teamId=${teamId}`
      : `${window.location.origin}/#/launch/${project.id}?invite=${inviteCode}`;

  const shareText = isCreator
    ? t('invite.creatorShareText', { name: project.agentName })
    : teamId
      ? t('invite.teamShareText', { name: project.agentName, amount })
      : t('invite.backerShareText', { name: project.agentName, amount });

  const handleCopy = () => {
    navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleTelegramShare = () => {
    shareToTelegram(inviteLink, shareText);
  };


  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className="w-full max-w-md bg-[#0A0C16]/95 border border-[#1E2241] rounded-3xl p-6 relative shadow-2xl space-y-5 animate-in zoom-in-95 duration-200 text-left"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Sparkles decorations */}
        <div className="absolute -top-3 -right-3 w-10 h-10 rounded-full bg-[#635BFF]/10 flex items-center justify-center border border-[#635BFF]/15 animate-pulse text-[#8C84FF]">
          <Sparkles size={16} />
        </div>

        {/* Title Header */}
        <div className="space-y-1">
          <span className="text-[10px] font-mono text-[#10B981] tracking-wider block font-bold uppercase flex items-center gap-1">
            <span>{t('invite.viralCenter')}</span>
            <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-ping" />
          </span>
          <h2 className="text-lg font-black text-white leading-snug">
            {isCreator ? t('invite.creatorTitle') : t('invite.backerTitle')}
          </h2>
          <p className="text-xs text-gray-400 leading-relaxed">
            {isCreator ? t('invite.creatorDesc') : t('invite.backerDesc')}
          </p>
        </div>

        {/* Viral Incentive Banner */}
        <div className={`p-3 rounded-xl border flex items-center gap-2.5 ${
          isCreator
            ? 'bg-[#181C10]/40 border-amber-500/20 text-amber-300'
            : 'bg-[#101E17]/40 border-emerald-500/20 text-emerald-300'
        }`}>
          {isCreator ? <Trophy size={16} className="shrink-0" /> : <Sparkles size={16} className="shrink-0" />}
          <div className="text-[10.5px] leading-snug font-sans">
            {isCreator ? (
              <span>{t('invite.creatorPrivilegeActive')}</span>
            ) : (
              <span>{t('invite.backerBonusBound')}</span>
            )}
          </div>
        </div>

        {/* Project Card Preview */}
        <div className="bg-[#121429] border border-[#212450] p-4 rounded-2xl flex items-center gap-4 relative overflow-hidden select-none">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-[#635BFF] to-sky-400 flex items-center justify-center text-white font-mono font-black text-sm shadow-inner shrink-0 animate-pulse">
            {project.agentTicker}
          </div>
          <div className="space-y-0.5 min-w-0 flex-1">
            <span className="text-xs font-black text-white block truncate">
              {project.agentName}
            </span>
            {isCreator ? (
              <span className="text-[10px] text-amber-400 block font-mono">
                {t('invite.creatorPass')}
              </span>
            ) : (
              <span className="text-[10px] text-gray-400 block font-mono">
                {t('invite.yourSpark', { amount })}
              </span>
            )}
            <div className="flex items-center gap-1 text-[9px] text-[#A699FF] font-mono pt-0.5">
              <Users size={10} />
              <span>{isCreator ? t('invite.creatorRules') : t('invite.backerGroupStatus')}</span>
            </div>
          </div>
        </div>

        {/* Copy Invite Link Input */}
        <div className="space-y-1.5">
          <label className="text-[10px] text-gray-500 font-mono tracking-wider block">{t('invite.yourInviteLink')}</label>
          <div className="flex gap-2">
            <input
              type="text"
              readOnly
              value={inviteLink}
              className="flex-1 bg-[#121429] border border-[#21254F] py-2.5 px-3.5 text-xs text-gray-400 rounded-xl outline-none font-mono truncate"
            />
            <button
              onClick={handleCopy}
              className="px-3.5 bg-[#121429] hover:bg-[#1E2241] border border-[#21254F] text-white rounded-xl transition flex items-center justify-center cursor-pointer active:scale-95 shrink-0"
            >
              {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} className="text-gray-400" />}
            </button>
          </div>
        </div>

        {/* Share Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 pt-1">
          <button
            onClick={handleTelegramShare}
            className="flex-1 py-3 bg-[#635BFF] hover:bg-[#5048E5] text-white font-extrabold text-xs rounded-xl shadow-lg shadow-[#635BFF]/10 active:scale-95 transition flex items-center justify-center gap-1.5 cursor-pointer border border-[#837BFF]/20"
          >
            <Send size={13} />
            <span>{t('invite.shareToTg')}</span>
          </button>
          <button
            onClick={onClose}
            className="px-6 py-3 bg-[#121429] hover:bg-[#1C1F3D] border border-[#272B51] text-gray-300 hover:text-white rounded-xl text-xs font-bold transition cursor-pointer text-center"
          >
            {t('common.back')}
          </button>
        </div>
      </div>
    </div>
  );
}
