import { Outlet } from 'react-router-dom';
import RiskNotice from './RiskNotice';
import Header from './Header';
import RecommendBar from './RecommendBar';
import Sidebar from './Sidebar';
import MobileNav from './MobileNav';
import TelegramNotificationToast from './TelegramNotificationToast';

export default function Layout() {
  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#0A0B14] text-gray-200 font-sans pt-safe">
      {/* 1. Top Risk Notice Banner */}
      <RiskNotice />

      {/* 2. Top Navigation header */}
      <Header />

      {/* 2.5. Sticky Recommend Bar */}
      <RecommendBar />

      {/* 3. Main Split View Grid */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Sidebar menu on bigger viewports */}
        <Sidebar />

        {/* Core content slot */}
        <main className="flex-1 flex flex-col min-w-0 bg-[#07080E] overflow-y-auto pb-20 md:pb-8 relative scrollbar-thin">
          <div className="w-full max-w-[1350px] mx-auto px-6 md:px-10 lg:px-12 py-10 animate-in fade-in duration-500">
            <Outlet />
          </div>
        </main>
      </div>

      {/* 4. Sticky Mobile navbar tabs on small viewports */}
      <MobileNav />

      {/* 5. Global Telegram Bot simulation notification toast */}
      <TelegramNotificationToast />
    </div>
  );
}
