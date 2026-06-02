import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Suspense, lazy } from 'react';
import Layout from './components/Layout';
import TonConnectSync from './components/TonConnectSync';
import TelegramBackButtonSync from './components/TelegramBackButtonSync';

// Lazy load actual pages to prevent large bundle generation
const LandingPage = lazy(() => import('./pages/LandingPage'));
const FeedPage = lazy(() => import('./pages/FeedPage'));
const LaunchDetail = lazy(() => import('./pages/LaunchDetail'));
const StudioPage = lazy(() => import('./pages/StudioPage'));
const CopilotPage = lazy(() => import('./pages/CopilotPage'));
const LaunchPage = lazy(() => import('./pages/LaunchPage'));
const CreateLaunchPage = lazy(() => import('./pages/CreateLaunchPage'));
const PortfolioPage = lazy(() => import('./pages/PortfolioPage'));
const DevHubPage = lazy(() => import('./pages/DevHubPage'));
const WalletSDKDocPage = lazy(() => import('./pages/WalletSDKDocPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));
const InvitePage = lazy(() => import('./pages/InvitePage'));
const BountyPage = lazy(() => import('./pages/BountyPage'));
const OnRampPage = lazy(() => import('./pages/OnRampPage'));
const LeaderboardPage = lazy(() => import('./pages/LeaderboardPage'));
const FundPage = lazy(() => import('./pages/FundPage'));
const LaunchpadPage = lazy(() => import('./pages/LaunchpadPage'));


// A sleek visual loading screen while codechunks load
function RouteLoading() {
  return (
    <div className="h-full w-full bg-[#07080F] flex flex-col items-center justify-center text-gray-400 gap-3 font-mono text-xs py-24 select-none">
      <div className="w-10 h-10 rounded-xl bg-[#635BFF] flex items-center justify-center animate-spin text-white font-black shadow-lg shadow-[#635BFF]/30">
        VC
      </div>
      <span className="tracking-wider animate-pulse pt-2 text-[#837BFF]">CONNECTING VIBECODER NODE CHANNEL...</span>
    </div>
  );
}

// Domain routing guard to keep both public domains focused on the product feed.
function DomainGuard() {
  const hostname = window.location.hostname;
  const hash = window.location.hash;

  // 1. Main domain and app subdomain now open directly into the workspace feed.
  if (hostname === 'app.72h.lol' || hostname === '72h.lol' || hostname === 'www.72h.lol') {
    if (hash === '' || hash === '#/' || hash === '#') {
      return <Navigate to="/feed" replace />;
    }
  }

  return null;
}

export default function App() {
  return (
    <HashRouter>
      <DomainGuard />
      <TonConnectSync />
      <TelegramBackButtonSync />
      <Suspense fallback={<RouteLoading />}>
        <Routes>
          {/* Default entry is the live project feed. Keep the brand page as a secondary route. */}
          <Route path="/" element={<Navigate to="/feed" replace />} />
          <Route path="/about" element={<LandingPage />} />

          {/* Core Authed/DeFi workspace routes with Layout */}
          <Route element={<Layout />}>
            <Route path="/feed" element={<FeedPage />} />
            <Route path="/explore" element={<Navigate to="/feed" replace />} />
            <Route path="/launch/:id" element={<LaunchDetail />} />
            <Route path="/studio" element={<StudioPage />} />
            <Route path="/copilot" element={<CopilotPage />} />
            <Route path="/launch" element={<LaunchPage />} />
            <Route path="/launch/create" element={<CreateLaunchPage />} />
            <Route path="/portfolio" element={<PortfolioPage />} />
            <Route path="/leaderboard" element={<LeaderboardPage />} />
            <Route path="/devhub" element={<DevHubPage />} />
            <Route path="/devhub/docs" element={<WalletSDKDocPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/invite" element={<InvitePage />} />
            <Route path="/bounty" element={<BountyPage />} />
            <Route path="/onramp" element={<OnRampPage />} />
            <Route path="/fund" element={<FundPage />} />
            <Route path="/launchpad" element={<LaunchpadPage />} />
          </Route>

          {/* Safe fallback fallback */}
          <Route path="*" element={<Navigate to="/feed" replace />} />
        </Routes>
      </Suspense>
    </HashRouter>
  );
}
