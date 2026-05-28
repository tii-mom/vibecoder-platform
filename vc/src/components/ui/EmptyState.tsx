import React from 'react';
import { HelpCircle } from 'lucide-react';

interface EmptyStateProps {
  title: string;
  description: string;
  icon?: React.ComponentType<{ size?: number; className?: string }>;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export function EmptyState({
  title,
  description,
  icon: Icon = HelpCircle,
  actionLabel,
  onAction,
  className = ''
}: EmptyStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center p-8 py-16 text-center bg-[#121620] border border-[#22253B] rounded-2xl max-w-lg mx-auto leading-normal ${className}`}>
      <div className="w-12 h-12 rounded-2xl bg-[#1D2136] border border-[#303456] flex items-center justify-center text-[#635BFF] mb-4">
        <Icon size={24} />
      </div>
      <h3 className="text-sm font-black text-white">{title}</h3>
      <p className="text-[11px] text-gray-400 mt-1 max-w-sm leading-relaxed">{description}</p>
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="mt-4.5 px-4.5 py-2 bg-[#635BFF] hover:bg-[#5048E5] text-white text-xs font-bold rounded-xl transition shadow-md shadow-[#635BFF]/15 cursor-pointer"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
