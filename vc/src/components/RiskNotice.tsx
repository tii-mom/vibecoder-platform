import { useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { useTranslation } from '../hooks/useTranslation';

export default function RiskNotice() {
  const { t } = useTranslation();
  const [visible, setVisible] = useState(true);

  if (!visible) return null;

  return (
    <div className="bg-[#15120C] border-b border-amber-950/50 text-amber-300/90 text-xs py-2 px-4 transition-all">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <AlertTriangle size={14} className="text-amber-500 shrink-0 animate-pulse" />
          <p className="leading-snug">
            <span className="font-semibold text-amber-400 mr-1">{t('riskNotice.title')}：</span>
            {t('riskNotice.sandboxWarning')}
          </p>
        </div>
        <button
          onClick={() => setVisible(false)}
          className="text-amber-500 hover:text-amber-300 transition-colors p-1 rounded-md hover:bg-amber-500/10 cursor-pointer"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}
