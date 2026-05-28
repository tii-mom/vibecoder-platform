import React from 'react';
import { useTranslation } from '../../hooks/useTranslation';

interface ProgressBarProps {
  progress: number; // 0 to 100 or higher
  showLabel?: boolean;
  className?: string;
}

export function ProgressBar({
  progress,
  showLabel = false,
  className = ''
}: ProgressBarProps) {
  const { t } = useTranslation();
  const clampedProgress = Math.max(0, Math.min(100, progress));

  // Custom Color Indicator depending on progress
  let progressColor = 'bg-[#635BFF]'; // default purple
  if (clampedProgress < 30) {
    progressColor = 'bg-rose-500';
  } else if (clampedProgress < 75) {
    progressColor = 'bg-amber-500';
  } else {
    progressColor = 'bg-emerald-500';
  }

  return (
    <div className={`w-full space-y-1 ${className}`}>
      <div className="w-full bg-[#1A1C2C] rounded-full h-2 overflow-hidden border border-[#232644]">
        <div
          className={`h-full rounded-full transition-all duration-500 ${progressColor}`}
          style={{ width: `${clampedProgress}%` }}
        />
      </div>
      {showLabel && (
        <div className="flex justify-between items-center text-[10px] text-gray-400 font-mono">
          <span>{t('common.progress')}</span>
          <span className="font-bold text-white">{progress.toFixed(1)}%</span>
        </div>
      )}
    </div>
  );
}
