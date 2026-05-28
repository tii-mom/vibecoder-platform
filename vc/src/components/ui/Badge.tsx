import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'success' | 'warning' | 'info' | 'danger' | 'purple' | 'neutral';
  className?: string;
}

export function Badge({
  children,
  variant = 'info',
  className = ''
}: BadgeProps) {
  const styles = {
    success: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/25',
    warning: 'bg-amber-500/10 text-amber-400 border border-amber-500/25',
    info: 'bg-sky-500/10 text-sky-400 border border-sky-500/25',
    danger: 'bg-rose-500/10 text-rose-400 border border-rose-500/25',
    purple: 'bg-[#635BFF]/10 text-[#8F87FF] border border-[#635BFF]/25',
    neutral: 'bg-gray-500/10 text-gray-400 border border-gray-500/20'
  };

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md font-mono text-[10px] uppercase font-bold tracking-tight shrink-0 select-none ${styles[variant]} ${className}`}>
      {children}
    </span>
  );
}
