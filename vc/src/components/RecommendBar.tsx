import { Sparkles } from 'lucide-react';
import { useTranslation } from '../hooks/useTranslation';
import { useSparkStore } from '../store/sparkStore';

export default function RecommendBar() {
  const { t } = useTranslation();
  const { projects } = useSparkStore();
  const recommended = projects.find((project) => project.status === 'active') || projects[0];

  if (!recommended) return null;

  return (
    <div className="bg-gradient-to-r from-[#17110A] via-[#1F140A] to-[#17110A] border-b border-amber-950/40 text-xs py-2 px-6 flex items-center justify-between text-gray-300 select-none z-30">
      <div className="flex items-center gap-2.5 flex-wrap">
        <span className="bg-gradient-to-r from-[#2A1A0A] to-[#3D250E] text-[#F97316] border border-[#543516] px-2 py-0.5 rounded-full font-black text-[9.5px] uppercase flex items-center gap-1">
          <Sparkles size={10} className="text-[#F97316]" />
          <span>{t('recommendBar.editorsChoice')}</span>
        </span>
        <span className="font-semibold">{t('recommendBar.ifOnlyOneProject')}</span>
        <a
          href={`#/launch/${recommended.id}`}
          className="text-[#F97316] hover:text-[#fb923c] font-black hover:underline transition-all flex items-center gap-0.5"
        >
          <span>{recommended.agentName} (代币 ${recommended.agentTicker})</span>
          <span className="text-[10px] font-normal">&rarr;</span>
        </a>
      </div>

      <div className="hidden sm:flex items-center gap-2 text-gray-500 text-[11px] font-mono">
        <span className="relative flex h-1.5 w-1.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
        </span>
        <span>{t('recommendBar.coGoverningBackers', { count: '12,438' })}</span>
      </div>
    </div>
  );
}
