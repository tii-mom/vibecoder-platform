import { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  ChevronRight,
  ChevronLeft,
  Info,
  Bell,
  Trash2,
  Play,
  CheckCircle
} from 'lucide-react';
import { useUserStore } from '../store/userStore';
import { useSparkStore } from '../store/sparkStore';
import { TONService } from '../services/ton';
import { useNotificationStore } from '../store/notificationStore';
import { useTranslation } from '../hooks/useTranslation';

// Custom minimalist luxury high-fidelity SVG icons
const CompassIcon = ({ className, size = 16 }: { className?: string; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <circle cx="12" cy="12" r="9" />
    <polygon points="12,8 14.5,12 12,16 9.5,12" />
  </svg>
);

const BotIcon = ({ className, size = 16 }: { className?: string; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <rect x="3" y="10" width="18" height="10" rx="3" />
    <path d="M12 3V7" />
    <circle cx="12" cy="3" r="1.5" />
    <polyline points="9 14 9.01 14" strokeWidth="2.5" />
    <polyline points="15 14 15.01 14" strokeWidth="2.5" />
    <path d="M7 10V8a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v2" />
  </svg>
);

const CoinsIcon = ({ className, size = 16 }: { className?: string; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <ellipse cx="12" cy="6" rx="9" ry="3" />
    <path d="M3 6V12C3 13.66 7.03 15 12 15C16.97 15 21 13.66 21 12V6" />
    <path d="M3 12V18C3 19.66 7.03 21 12 21C16.97 21 21 19.66 21 18V12" />
  </svg>
);

const RocketIcon = ({ className, size = 16 }: { className?: string; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M4.5 16.5c-1.5 1.5-2.5 3.5-2.5 5.5C4 22 6 21 7.5 19.5" />
    <path d="M12 2C6 2 2 6 2 12c0 2.5 1 4.5 3 6l4-4 4 4 6 3c1.5 2 3.5 3 6 3 0-2.5-1-4.5-3-6l-4-4-4-4Z" />
    <circle cx="15.5" cy="8.5" r="1" />
  </svg>
);

const SparklesIcon = ({ className, size = 16 }: { className?: string; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3l1.9 5.8 1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3L12 3Z" />
    <path d="m5 3 0.5 1.5L7 5 5.5 5.5 5 7 4.5 5.5 3 5 4.5 4.5Z" opacity="0.4" />
    <path d="m19 17 0.5 1.5 1.5 0.5-1.5 0.5-0.5 1.5-0.5-1.5-1.5-0.5 1.5-0.5Z" opacity="0.4" />
  </svg>
);

const FolderIcon = ({ className, size = 16 }: { className?: string; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z" />
    <circle cx="12" cy="13" r="2" />
  </svg>
);

const TerminalIcon = ({ className, size = 16 }: { className?: string; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <polyline points="4 17 10 11 4 5" />
    <line x1="12" y1="19" x2="20" y2="19" />
  </svg>
);

const SettingsIcon = ({ className, size = 16 }: { className?: string; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
  </svg>
);

const GiftIcon = ({ className, size = 16 }: { className?: string; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <polyline points="20 12 20 22 4 22 4 12" />
    <rect x="2" y="7" width="20" height="5" />
    <line x1="12" y1="22" x2="12" y2="7" />
    <path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z" />
    <path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z" />
  </svg>
);

const CreditCardIcon = ({ className, size = 16 }: { className?: string; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <rect x="2" y="5" width="20" height="14" rx="2" />
    <line x1="2" y1="10" x2="22" y2="10" />
  </svg>
);

const TrophyIcon = ({ className, size = 16 }: { className?: string; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
    <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
    <path d="M4 22h16" />
    <path d="M10 14.66V17c0 .55-.45 1-1 1H4v2h16v-2h-5c-.55 0-1-.45-1-1v-2.34" />
    <path d="M12 2a6 6 0 0 1 6 6v3a6 6 0 0 1-6 6 6 6 0 0 1-6-6V8a6 6 0 0 1 6-6z" />
  </svg>
);

const PieIcon = ({ className, size = 16 }: { className?: string; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M21.21 15.89A10 10 0 1 1 8 2.83" />
    <path d="M22 12A10 10 0 0 0 12 2v10z" />
  </svg>
);

export default function Sidebar() {
  const { t } = useTranslation();
  const [collapsed, setCollapsed] = useState(false);
  const { walletAddress, isConnected } = useUserStore();
  const { projects } = useSparkStore();
  const navigate = useNavigate();
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    clearAll,
    simulateMilestoneEvent
  } = useNotificationStore();

  const [isAlertsOpen, setIsAlertsOpen] = useState(false);

  // Background simulation interval representing real-time blockchain telemetry updates
  useEffect(() => {
    const timer = setInterval(() => {
      // Trigger a simulated milestone progression or fund disbursement event
      simulateMilestoneEvent();
    }, 25000); // every 25 seconds

    return () => clearInterval(timer);
  }, [simulateMilestoneEvent]);

  // Dynamically calculate user's portfolio tickers combining local default assets and dynamically backed ones
  const portfolioTickers = new Set(['OSA', 'TBP']);
  projects.forEach(p => {
    if (walletAddress && p.backers?.some(b => b.address === walletAddress)) {
      portfolioTickers.add(p.agentTicker);
    }
  });

  // Prioritize and sort notifications: Portfolio asset unread first, then other unread, then Portfolio read, then general read
  const sortedNotifications = [...notifications].sort((a, b) => {
    const aInPortfolio = portfolioTickers.has(a.ticker);
    const bInPortfolio = portfolioTickers.has(b.ticker);

    const aPriority = aInPortfolio && !a.isRead;
    const bPriority = bInPortfolio && !b.isRead;

    if (aPriority && !bPriority) return -1;
    if (!aPriority && bPriority) return 1;

    if (!a.isRead && b.isRead) return -1;
    if (a.isRead && !b.isRead) return 1;

    if (aInPortfolio && !bInPortfolio) return -1;
    if (!aInPortfolio && bInPortfolio) return 1;

    return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
  });

  const menuItems = [
    { name: t('sidebar.explore'), path: '/feed', icon: CompassIcon, tooltip: t('sidebar.exploreTooltip') },
    { name: t('sidebar.launch'), path: '/launch', icon: CoinsIcon, tooltip: t('sidebar.launchTooltip') },
    { name: t('sidebar.secondaryMarket'), path: '/launchpad', icon: RocketIcon, tooltip: t('sidebar.secondaryMarketTooltip') },
    { name: t('sidebar.fund'), path: '/fund', icon: PieIcon, tooltip: t('sidebar.fundTooltip') },
    { name: t('sidebar.leaderboard'), path: '/leaderboard', icon: TrophyIcon, tooltip: t('sidebar.leaderboardTooltip') },
    { name: t('sidebar.copilot'), path: '/copilot', icon: SparklesIcon, tooltip: t('sidebar.copilotTooltip') },
    { name: t('sidebar.portfolio'), path: '/portfolio', icon: FolderIcon, tooltip: t('sidebar.portfolioTooltip'), showBadge: true },
    { name: t('sidebar.onramp'), path: '/onramp', icon: CreditCardIcon, tooltip: t('sidebar.onrampTooltip') },
    { name: t('sidebar.bounty'), path: '/bounty', icon: CoinsIcon, tooltip: t('sidebar.bountyTooltip') },
    { name: t('sidebar.invite'), path: '/invite', icon: GiftIcon, tooltip: t('sidebar.inviteTooltip') },
    { name: t('sidebar.settings'), path: '/settings', icon: SettingsIcon, tooltip: t('sidebar.settingsTooltip') },
  ];

  return (
    <aside
      className={`hidden md:flex flex-col h-full bg-[#05060B] border-r border-[#131626] transition-all duration-300 relative select-none shrink-0 ${collapsed ? 'w-16' : 'w-60'}`}
    >
      {/* Collapse Toggle trigger */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-16 w-6 h-6 rounded-full bg-[#121426] hover:bg-[#1E223D] border border-[#23284A] flex items-center justify-center text-gray-405 hover:text-white transition cursor-pointer z-40"
      >
        {collapsed ? <ChevronRight size={13} /> : <ChevronLeft size={13} />}
      </button>

      {/* Main navigation menu items */}
      <nav className="flex-1 py-8 px-3 space-y-2 overflow-y-auto">
        <span className={`text-[10px] text-gray-500/80 font-mono tracking-widest block px-2.5 mb-3 transition-opacity ${collapsed ? 'opacity-0 h-0 overflow-hidden' : 'opacity-100'}`}>
          {t('sidebar.workspaceConsole')}
        </span>

        {menuItems.map((item) => {
          const Icon = item.icon;

          return (
            <NavLink
              key={item.path}
              to={item.path}
              title={collapsed ? item.name : undefined}
              className={({ isActive }) => `flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-all group relative duration-200 ${
                isActive
                  ? 'bg-gradient-to-r from-[#1C1B47]/80 to-[#0C0E1A]/85 text-white border-l-2 border-[#635BFF] pl-2.5 font-bold tracking-tight shadow-[0_4px_20px_rgba(99,91,255,0.15)] backdrop-blur-md'
                  : 'text-gray-400/80 hover:text-white hover:bg-[#161830]/40 hover:translate-x-0.5'
              }`}
            >
              {({ isActive }) => (
                <>
                  <Icon size={16} className={`shrink-0 transition-all duration-300 ${isActive ? 'text-[#8B83FF] scale-110 drop-shadow-[0_0_8px_rgba(139,131,255,0.5)]' : 'text-gray-500 group-hover:text-gray-200 group-hover:scale-105'}`} />

                  {!collapsed && (
                    <div className="flex-1 flex items-center justify-between min-w-0">
                      <span className="truncate">{item.name}</span>
                      {item.showBadge && unreadCount > 0 && (
                        <span className="bg-rose-550/90 text-white font-mono text-[9px] px-1.5 py-0.2 rounded-full font-black animate-pulse">
                          {unreadCount}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Collapsed Badge overlay helper */}
                  {collapsed && item.showBadge && unreadCount > 0 && (
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500 animate-pulse border border-[#0C101A]" />
                  )}

                  {/* Collapsed Tooltip helper */}
                  {collapsed && (
                    <div className="absolute left-full ml-2 px-2.5 py-1.5 bg-[#0A0C16]/95 backdrop-blur-md border border-[#232646]/80 text-[11px] text-gray-200 rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 shadow-2xl">
                      {item.name} {item.showBadge && unreadCount > 0 ? `(${unreadCount} ${t('sidebar.unreadBadge')})` : ''}
                    </div>
                  )}
                </>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* --- Real-Time Spark Notification Hub Inside Sidebar --- */}
      <div className="px-3 py-2 border-t border-[#181C30]/70 bg-[#0A0D16]/50">
        {!collapsed ? (
          <div className="space-y-2 text-left">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-gray-500 font-mono tracking-wider flex items-center gap-1.5 uppercase font-bold">
                <Bell size={10} className={unreadCount > 0 ? "text-amber-500 animate-bounce" : "text-gray-500"} />
                <span>{t('sidebar.alertHub')}</span>
                {unreadCount > 0 && (
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" />
                )}
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={simulateMilestoneEvent}
                  title={t('sidebar.clickSimulate')}
                  className="p-1 hover:bg-[#1C1F3D] rounded border border-[#242749]/40 text-sky-400 hover:text-sky-300 transition cursor-pointer"
                >
                  <Play size={10} />
                </button>
                {notifications.length > 0 && (
                  <button
                    onClick={clearAll}
                    title={t('sidebar.clearAlerts')}
                    className="p-1 hover:bg-[#1C1F3D] rounded border border-[#242749]/40 text-gray-500 hover:text-gray-300 transition cursor-pointer"
                  >
                    <Trash2 size={10} />
                  </button>
                )}
              </div>
            </div>

            {/* Notification feed wrapper */}
            <div className="max-h-36 overflow-y-auto space-y-1.5 scrollbar-thin pr-1">
              {sortedNotifications.length === 0 ? (
                <div className="text-[10px] text-gray-600 font-sans py-3 text-center border border-dashed border-slate-900 rounded-lg leading-relaxed">
                  {t('sidebar.noAlerts')}<br />
                  <span className="text-[9px] text-gray-700">
                    {t('sidebar.clickSimulate')}
                  </span>
                </div>
              ) : (
                sortedNotifications.slice(0, 3).map((notif) => {
                  const isPortfolioAsset = portfolioTickers.has(notif.ticker);
                  return (
                    <div
                      key={notif.id}
                      onClick={() => markAsRead(notif.id)}
                      className={`p-2 rounded-lg border text-[10px] cursor-pointer transition relative overflow-hidden text-left ${
                        notif.isRead
                          ? isPortfolioAsset
                            ? 'bg-amber-955/5 border-amber-950/20 text-gray-400'
                            : 'bg-slate-950/20 border-slate-900/60 text-gray-405'
                          : isPortfolioAsset
                            ? 'bg-[#1D172A] border-[#92400E] text-white hover:border-[#D97706] shadow-md shadow-amber-950/40'
                            : 'bg-[#121528] border-[#2A2E55] text-white hover:border-[#3E437C] shadow shadow-indigo-950/30'
                      }`}
                    >
                      {/* Unread dot indicator */}
                      {!notif.isRead && (
                        <span className={`absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full ${isPortfolioAsset ? 'bg-amber-500' : 'bg-[#635BFF]'}`} />
                      )}
                      <div className="font-bold flex items-center justify-between gap-1">
                        <div className="flex items-center gap-1 min-w-0">
                          <span className={`p-0.5 px-1 rounded text-[8px] font-mono leading-none ${isPortfolioAsset ? 'bg-amber-500/20 text-amber-300' : 'bg-slate-900 text-gray-400'}`}>
                            ${notif.ticker}
                          </span>
                          <span className="truncate max-w-[110px]">{notif.title}</span>
                        </div>
                        {isPortfolioAsset && (
                          <span className="text-[8.5px] text-[#FFA825] font-black shrink-0">{t('sidebar.activePortfolio')}</span>
                        )}
                      </div>
                      <p className="text-[9.5px] text-gray-400 leading-normal mt-1 line-clamp-2">{notif.description}</p>
                      {notif.amountTON && (
                        <div className="mt-1 flex gap-1.5 font-mono text-[8.5px] text-emerald-400 font-bold">
                          <span>+{notif.amountTON} TON</span>
                          <span className="text-gray-600">|</span>
                          <span>+{notif.amountVC} $VC</span>
                        </div>
                      )}

                      {/* Direct Navigation Link to Proof Tab */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          markAsRead(notif.id);
                          navigate(`/launch/${notif.projectId}?tab=proof`, { state: { activeTab: 'proof' } });
                        }}
                        className={`mt-1.5 w-full py-1 rounded text-[8.5px] font-black transition flex items-center justify-center gap-1 cursor-pointer border ${
                          isPortfolioAsset
                            ? 'bg-amber-500/15 hover:bg-amber-500/30 text-[#FFAF1E] border-amber-500/35'
                            : 'bg-indigo-500/10 hover:bg-[#635BFF]/25 text-[#A699FF] border-indigo-500/25'
                        }`}
                      >
                        <span>{t('sidebar.verifyProof')}</span>
                      </button>
                    </div>
                  );
                })
              )}
            </div>

            {notifications.length > 0 && unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="w-full py-1 text-[9.5px] text-indigo-400 bg-indigo-950/10 border border-indigo-900/20 rounded hover:bg-indigo-950/20 text-center transition font-semibold cursor-pointer"
              >
                {t('sidebar.markAllAsRead')} ({unreadCount})
              </button>
            )}
          </div>
        ) : (
          /* Collapsed representation */
          <div className="flex flex-col items-center gap-1.5 relative">
            <button
              onClick={() => setIsAlertsOpen(!isAlertsOpen)}
              className="p-2 bg-[#121424] hover:bg-[#1E213D] border border-[#23274A] rounded-xl text-gray-400 hover:text-white transition relative cursor-pointer"
              title={t('sidebar.alertHub')}
            >
              <Bell size={13} className={unreadCount > 0 ? "text-amber-500 animate-pulse" : ""} />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-rose-500 animate-ping" />
              )}
            </button>

            {/* Simulated instant manual button in collapsed state */}
            <button
              onClick={simulateMilestoneEvent}
              className="p-1 hover:bg-[#1C1F3D] rounded border border-slate-900 text-sky-400 hover:text-sky-300 transition text-[8px] cursor-pointer"
              title={t('sidebar.clickSimulate')}
            >
              <Play size={8} />
            </button>

            {/* Floating floating drawer when collapsed */}
            {isAlertsOpen && (
              <div className="absolute left-[54px] bottom-0 w-64 bg-[#090A13] border border-[#23264B] rounded-2xl p-4.5 shadow-2xl z-50 text-left space-y-3.5 animate-in fade-in slide-in-from-left-4 duration-200">
                <div className="flex items-center justify-between border-b border-[#1E213E] pb-2">
                  <span className="text-xs font-black text-white flex items-center gap-1.5">
                    <Bell size={12} className="text-amber-500" />
                    <span>{t('sidebar.alertHub')}</span>
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button onClick={clearAll} className="text-[10px] text-gray-500 hover:text-gray-300">{t('sidebar.clearAlerts')}</button>
                    <button onClick={() => setIsAlertsOpen(false)} className="text-[10px] text-gray-400 hover:text-white">✕</button>
                  </div>
                </div>

                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {sortedNotifications.length === 0 ? (
                    <p className="text-[10px] text-gray-500 text-center py-4">{t('sidebar.noAlerts')}</p>
                  ) : (
                    sortedNotifications.map((notif) => {
                      const isPortfolioAsset = portfolioTickers.has(notif.ticker);
                      return (
                        <div
                          key={notif.id}
                          onClick={() => markAsRead(notif.id)}
                          className={`p-2 rounded-xl border text-[10px] cursor-pointer transition relative overflow-hidden text-left ${
                            notif.isRead
                              ? isPortfolioAsset
                                ? 'bg-amber-955/5 border-amber-950/20 text-gray-400'
                                : 'bg-slate-950/20 border-slate-900/60 text-gray-450'
                              : isPortfolioAsset
                                ? 'bg-[#1D172A] border-[#92400E] text-white hover:border-[#D97706] shadow-md shadow-amber-955/40'
                                : 'bg-[#121528] border-[#2A2E55] text-white hover:border-[#3E437C] shadow shadow-indigo-950/30'
                          }`}
                        >
                          <div className="font-bold flex items-center justify-between gap-1.5 flex-wrap">
                            <span>{notif.title}</span>
                            {isPortfolioAsset && (
                              <span className="text-[8.5px] text-[#FFA825] font-black shrink-0">💼 {t('sidebar.activePortfolio')}</span>
                            )}
                          </div>
                          <p className="text-[9.5px] text-gray-400 mt-0.5 leading-relaxed">{notif.description}</p>

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              markAsRead(notif.id);
                              navigate(`/launch/${notif.projectId}?tab=proof`, { state: { activeTab: 'proof' } });
                            }}
                            className={`mt-1.5 w-full py-1 rounded text-[8.5px] font-bold transition flex items-center justify-center gap-1 cursor-pointer border ${
                              isPortfolioAsset
                                ? 'bg-amber-500/10 hover:bg-amber-500/20 text-[#FFAF1E] border-amber-500/20'
                                : 'bg-[#635BFF]/10 hover:bg-[#635BFF]/20 text-[#A699FF] border-[#635BFF]/20'
                            }`}
                          >
                            <span>{t('sidebar.verifyProof')}</span>
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>

                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="w-full py-1.5 bg-[#635BFF] hover:bg-[#5048E5] text-white text-[10px] rounded-lg text-center font-bold"
                  >
                    {t('sidebar.markAllAsRead')} ({unreadCount})
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Sidebar wallet connectivity summary status */}
      <div className="p-4 border-t border-[#171D33] bg-[#0A0D16]">
        {isConnected ? (
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
            {!collapsed ? (
              <div className="min-w-0 flex-1">
                <span className="text-[10px] text-gray-400 block font-mono">{t('sidebar.walletConnected')}</span>
                <span className="text-[10.5px] text-gray-550 block truncate font-mono">
                  {TONService.shortenAddress(walletAddress || "")}
                </span>
              </div>
            ) : (
              <div className="w-2 h-2 rounded-full bg-emerald-500" title="Connected" />
            )}
          </div>
        ) : (
          <div className="flex items-center gap-2 text-gray-500">
            <Info size={14} className="shrink-0" />
            {!collapsed && (
              <span className="text-[10px] font-mono leading-tight">{t('sidebar.unauthorizedWorkspace')}</span>
            )}
          </div>
        )}
      </div>
    </aside>
  );
}
