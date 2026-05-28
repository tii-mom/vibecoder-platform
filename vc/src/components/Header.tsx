import WalletButton from './WalletButton';
import LanguageSwitcher from './LanguageSwitcher';
import { useTranslation } from '../hooks/useTranslation';

export default function Header() {
  const { t } = useTranslation();

  return (
    <header className="h-14 bg-[#090A13]/85 backdrop-blur-md border-b border-[#181C30] flex items-center justify-between px-4 sticky top-0 z-40 select-none">
      <div className="flex items-center gap-3">
        <a
          href="/#/feed"
          className="flex items-center group"
        >
          <img
            src="/logo.png"
            className="w-8 h-8 rounded-lg object-contain shadow-md shadow-[#635BFF]/10 group-hover:scale-105 transition-all"
            alt="VibeCoder Logo"
          />
        </a>
        <span className="bg-amber-500/10 text-amber-500 border border-amber-500/20 text-[9px] px-1.5 py-0.5 rounded font-mono font-semibold hidden sm:inline-block">
          {t('header.sandboxTestnet')}
        </span>
      </div>

      {/* Right side: Language Switcher & TON Connect Button */}
      <div className="flex items-center gap-3">
        <LanguageSwitcher />
        <WalletButton />
      </div>
    </header>
  );
}
