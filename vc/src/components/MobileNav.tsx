import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { 
  Menu, 
  X,
  User,
  LogOut
} from 'lucide-react';
import { useUserStore } from '../store/userStore';

// Custom minimalist luxury high-fidelity SVG icons
const CompassIcon = ({ className, size = 18 }: { className?: string; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <circle cx="12" cy="12" r="9" />
    <polygon points="12,8 14.5,12 12,16 9.5,12" />
  </svg>
);

const BotIcon = ({ className, size = 18 }: { className?: string; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <rect x="3" y="10" width="18" height="10" rx="3" />
    <path d="M12 3V7" />
    <circle cx="12" cy="3" r="1.5" />
    <polyline points="9 14 9.01 14" strokeWidth="2.5" />
    <polyline points="15 14 15.01 14" strokeWidth="2.5" />
    <path d="M7 10V8a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v2" />
  </svg>
);

const CoinsIcon = ({ className, size = 18 }: { className?: string; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <ellipse cx="12" cy="6" rx="9" ry="3" />
    <path d="M3 6V12C3 13.66 7.03 15 12 15C16.97 15 21 13.66 21 12V6" />
    <path d="M3 12V18C3 19.66 7.03 21 12 21C16.97 21 21 19.66 21 18V12" />
  </svg>
);

const RocketIcon = ({ className, size = 18 }: { className?: string; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M4.5 16.5c-1.5 1.5-2.5 3.5-2.5 5.5C4 22 6 21 7.5 19.5" />
    <path d="M12 2C6 2 2 6 2 12c0 2.5 1 4.5 3 6l4-4 4 4 6 3c1.5 2 3.5 3 6 3 0-2.5-1-4.5-3-6l-4-4-4-4Z" />
    <circle cx="15.5" cy="8.5" r="1" />
  </svg>
);

const FolderIcon = ({ className, size = 18 }: { className?: string; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z" />
    <circle cx="12" cy="13" r="2" />
  </svg>
);

const TerminalIcon = ({ className, size = 18 }: { className?: string; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <polyline points="4 17 10 11 4 5" />
    <line x1="12" y1="19" x2="20" y2="19" />
  </svg>
);

const SettingsIcon = ({ className, size = 18 }: { className?: string; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
  </svg>
);

const GiftIcon = ({ className, size = 18 }: { className?: string; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <polyline points="20 12 20 22 4 22 4 12" />
    <rect x="2" y="7" width="20" height="5" />
    <line x1="12" y1="22" x2="12" y2="7" />
    <path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z" />
    <path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z" />
  </svg>
);

const SparklesIcon = ({ className, size = 18 }: { className?: string; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3l1.9 5.8 1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3L12 3Z" />
    <path d="m5 3 0.5 1.5L7 5 5.5 5.5 5 7 4.5 5.5 3 5 4.5 4.5Z" opacity="0.4" />
    <path d="m19 17 0.5 1.5 1.5 0.5-1.5 0.5-0.5 1.5-0.5-1.5-1.5-0.5 1.5-0.5Z" opacity="0.4" />
  </svg>
);

export default function MobileNav() {
  const [showDrawer, setShowDrawer] = useState(false);
  const { walletAddress, isConnected, disconnectWallet } = useUserStore();
  const location = useLocation();

  const primaryItems = [
    { name: '探索', path: '/feed', icon: CompassIcon },
    { name: 'Launch', path: '/launch', icon: CoinsIcon },
    { name: 'Copilot', path: '/copilot', icon: SparklesIcon },
    { name: '持仓', path: '/portfolio', icon: FolderIcon },
  ];

  const secondaryItems = [
    { name: '特权与邀请', path: '/invite', icon: GiftIcon },
    { name: '设置中心', path: '/settings', icon: SettingsIcon },
  ];

  return (
    <>
      {/* Sticky Bottom Bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-[#05060B]/95 backdrop-blur-lg border-t border-[#131626] px-2 pb-safe z-50 flex items-center justify-around select-none">
        {primaryItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname.startsWith(item.path);

          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center justify-center w-14 h-12 rounded-lg transition-all ${
                isActive ? 'text-[#8B83FF]' : 'text-gray-400/60 hover:text-white'
              }`}
            >
              <Icon size={18} />
              <span className="text-[10px] mt-1 font-medium">{item.name}</span>
              {isActive && (
                <span className="w-1 h-1 rounded-full bg-[#8B83FF] mt-0.5 animate-pulse" />
              )}
            </NavLink>
          );
        })}

        {/* More Trigger Button */}
        <button
          onClick={() => setShowDrawer(true)}
          className={`flex flex-col items-center justify-center w-14 h-12 rounded-lg transition-all cursor-pointer ${
            showDrawer ? 'text-[#8B83FF]' : 'text-gray-400/60 hover:text-white'
          }`}
        >
          <Menu size={18} />
          <span className="text-[10px] mt-1 font-medium">更多</span>
        </button>
      </div>

      {/* Drawer Overlay */}
      {showDrawer && (
        <div 
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[90] animate-in fade-in duration-200"
          onClick={() => setShowDrawer(false)}
        >
          {/* Drawer Sheet */}
          <div 
            className="absolute bottom-0 left-0 right-0 bg-[#0C0D1A] border-t border-[#232746] rounded-t-2xl p-6 pb-12 space-y-5 animate-in slide-in-from-bottom duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono text-gray-500 tracking-wider">MORE SERVICES & UTILITIES</span>
              <button 
                onClick={() => setShowDrawer(false)}
                className="text-gray-400 hover:text-white hover:bg-white/5 p-1 rounded-md cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="grid grid-cols-1 gap-2">
              {secondaryItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname.startsWith(item.path);

                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    onClick={() => setShowDrawer(false)}
                    className={`flex items-center gap-3.5 px-4 py-3 rounded-xl border transition-all ${
                      isActive 
                        ? 'bg-[#1C1A3F] border-[#635BFF]/30 text-white' 
                        : 'bg-[#121425] border-transparent text-gray-300 hover:bg-[#1A1D36]'
                    }`}
                  >
                    <Icon size={16} className={isActive ? 'text-[#635BFF]' : 'text-gray-400'} />
                    <span className="text-xs font-semibold">{item.name}</span>
                  </NavLink>
                );
              })}
            </div>

            {/* Quick stats / actions inside drawer */}
            {isConnected && (
              <div className="pt-2 border-t border-[#1F213C] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <User size={14} className="text-gray-500" />
                  <span className="text-xs text-gray-400 font-mono">Wallet Connected</span>
                </div>
                <button
                  onClick={() => {
                    disconnectWallet();
                    setShowDrawer(false);
                  }}
                  className="flex items-center gap-1.5 text-rose-400 hover:text-rose-300 text-xs font-medium cursor-pointer"
                >
                  <LogOut size={13} />
                  <span>Disconnect</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
