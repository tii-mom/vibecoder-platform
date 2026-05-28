import React from 'react';

interface TabItem {
  id: string;
  label: string;
  icon?: React.ComponentType<{ size?: number; className?: string }>;
}

interface TabsProps {
  items: TabItem[];
  activeId: string;
  onTabChange: (id: string) => void;
  className?: string;
}

export function Tabs({
  items,
  activeId,
  onTabChange,
  className = ''
}: TabsProps) {
  return (
    <div className={`flex border-b border-[#22253B] gap-1.5 overflow-x-auto scrollbar-none pb-[1px] ${className}`}>
      {items.map((tab) => {
        const Icon = tab.icon;
        const isActive = tab.id === activeId;
        
        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              isActive
                ? 'border-[#635BFF] text-white bg-[#635BFF]/5 font-black'
                : 'border-transparent text-gray-400 hover:text-white hover:bg-[#121620]/40'
            }`}
          >
            {Icon && <Icon size={14} className={isActive ? 'text-[#635BFF]' : 'text-gray-450'} />}
            <span>{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
}
