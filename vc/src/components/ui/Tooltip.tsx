import React, { useState } from 'react';

interface TooltipProps {
  content: string;
  children: React.ReactNode;
  className?: string;
}

export function Tooltip({
  content,
  children,
  className = ''
}: TooltipProps) {
  const [visible, setVisible] = useState(false);

  return (
    <div
      className="relative inline-block"
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
    >
      {children}
      {visible && (
        <div className={`absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2.5 py-1.5 bg-[#090A13] border border-[#232646] text-[10px] text-gray-200 rounded-lg whitespace-normal min-w-[150px] z-50 pointer-events-none transition-all duration-150 animate-in fade-in slide-in-from-bottom-1 text-center font-medium leading-normal shadow-2xl ${className}`}>
          {content}
          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-[#090A13]" />
        </div>
      )}
    </div>
  );
}
