import { useState, useRef, useEffect } from 'react';
import { Wallet, ChevronDown, Check, LogOut, Copy, Plus, Loader2 } from 'lucide-react';
import { useTonConnectUI } from '@tonconnect/ui-react';
import { useUserStore } from '../store/userStore';
import { TONService } from '../services/ton';
import { useTranslation } from '../hooks/useTranslation';

export default function WalletButton() {
  const { t } = useTranslation();
  const { walletAddress, isConnected, profile, connectWallet, disconnectWallet, setTonConnectUI, tokens, addToken } = useUserStore();
  const [tonConnectUI] = useTonConnectUI();
  const [showDropdown, setShowDropdown] = useState(false);
  const [copied, setCopied] = useState(false);

  // Custom token import states
  const [importAddress, setImportAddress] = useState('');
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState('');
  const [importSuccess, setImportSuccess] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);

  // Sync TonConnect UI instance to Zustand store
  useEffect(() => {
    if (tonConnectUI) {
      setTonConnectUI(tonConnectUI);
    }
  }, [tonConnectUI, setTonConnectUI]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleCopy = () => {
    if (walletAddress) {
      navigator.clipboard.writeText(walletAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleImportToken = async (e: React.FormEvent) => {
    e.preventDefault();
    setImportError('');
    setImportSuccess(false);

    if (!importAddress.trim()) return;

    setImporting(true);
    try {
      const ok = await addToken(importAddress.trim());
      if (ok) {
        setImportSuccess(true);
        setImportAddress('');
        setTimeout(() => setImportSuccess(false), 3000);
      } else {
        setImportError(t('wallet.importFailed'));
      }
    } catch (err) {
      setImportError(t('wallet.invalidAddress'));
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {isConnected && profile ? (
        <div className="flex items-center gap-2">
          {/* TON, USDT & VC Balances in navbar */}
          <div className="hidden sm:flex items-center gap-3 px-3 py-1.5 bg-[#121320] border border-[#21233D] rounded-full text-xs font-mono text-gray-400">
            {tokens.slice(0, 3).map((token, idx) => (
              <div key={token.symbol} className="flex items-center gap-1.5">
                <span className="flex items-center gap-1" style={{ color: token.symbol === 'TON' ? '#38bdf8' : token.symbol === 'USDT' ? '#34d399' : '#818cf8' }}>
                  <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: token.symbol === 'TON' ? '#38bdf8' : token.symbol === 'USDT' ? '#34d399' : '#818cf8' }}></span>
                  {token.balance.toFixed(2)} {token.symbol}
                </span>
                {idx < 2 && <span className="text-[#32365A]">|</span>}
              </div>
            ))}
          </div>

          <button
            onClick={() => setShowDropdown(!showDropdown)}
            className="flex items-center gap-2 px-3.5 py-1.5 bg-[#17192A] hover:bg-[#20233C] border border-[#272A4E] text-[#E4E6FB] rounded-full text-sm font-medium transition-all group cursor-pointer"
          >
            <div className="w-5.5 h-5.5 rounded-full bg-gradient-to-r from-[#635BFF] to-sky-400 flex items-center justify-center font-bold text-[10px] text-white">
              TON
            </div>
            <span className="font-mono text-xs text-gray-300">
              {TONService.shortenAddress(walletAddress || "")}
            </span>
            <ChevronDown size={14} className={`text-gray-400 group-hover:text-gray-200 transition-transform ${showDropdown ? 'rotate-180' : ''}`} />
          </button>
        </div>
      ) : (
        <button
          onClick={() => connectWallet()}
          className="flex items-center gap-2 px-4 py-2 bg-[#635BFF] hover:bg-[#5048E5] text-white rounded-full text-sm font-medium shadow-lg shadow-[#635BFF]/20 hover:shadow-[#635BFF]/30 active:scale-95 transition-all cursor-pointer"
        >
          <Wallet size={15} />
          <span>{t('wallet.connectWallet')}</span>
        </button>
      )}

      {/* Wallet Dropdown Actions */}
      {showDropdown && profile && (
        <div className="absolute right-0 mt-2 w-72 bg-[#0F101E]/95 border border-[#242646] rounded-xl shadow-2xl p-3 z-50 text-left animate-in fade-in slide-in-from-top-3 duration-200 backdrop-blur-md">
          <div className="pb-2 mb-2 border-b border-[#21233D]">
            <span className="text-[10px] text-gray-500 font-mono tracking-wider block">{t('wallet.currentWorkspace')}</span>
            <span className="text-xs text-gray-300 font-semibold truncate block mt-0.5">{profile.username}</span>
            <div className="mt-1 flex items-center justify-between text-[11px] text-gray-400 bg-[#121323] p-1.5 rounded font-mono">
              <span className="truncate max-w-[170px]">{walletAddress}</span>
              <button
                onClick={handleCopy}
                className="text-gray-500 hover:text-white p-0.5 transition"
                title={t('wallet.copyAddress')}
              >
                {copied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            {/* Tokens Balance List */}
            <div className="text-[10px] text-gray-500 font-mono tracking-wider">{t('wallet.walletAssets')}</div>
            <div className="max-h-48 overflow-y-auto pr-1 space-y-1.5 scrollbar-thin">
              {tokens.map((token) => (
                <div key={token.masterAddress} className="flex items-center justify-between p-2 bg-[#121323] rounded-lg border border-[#1e2038] text-xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <img
                      src={token.image || 'https://raw.githubusercontent.com/tonkeeper/opentonapi/master/pkg/references/media/token_placeholder.png'}
                      alt={token.symbol}
                      className="w-5 h-5 rounded-full object-cover shrink-0"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'https://raw.githubusercontent.com/tonkeeper/opentonapi/master/pkg/references/media/token_placeholder.png';
                      }}
                    />
                    <div className="truncate">
                      <div className="flex items-center gap-1 min-w-0">
                        <span className="font-semibold text-white font-mono truncate">{token.symbol}</span>
                        {token.masterAddress !== 'native' && (
                          <span className="text-[9px] text-gray-500 font-mono" title={token.masterAddress}>
                            ({token.masterAddress.slice(0, 4)}...{token.masterAddress.slice(-4)})
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-gray-500 block truncate">{token.name}</span>
                    </div>
                  </div>
                  <span className="font-mono text-gray-300 font-semibold shrink-0">{token.balance}</span>
                </div>
              ))}
            </div>

            {/* Custom Token Import Form */}
            <form onSubmit={handleImportToken} className="pt-2 border-t border-[#21233D] space-y-1.5">
              <div className="text-[10px] text-gray-500 font-mono tracking-wider">{t('wallet.importJetton')}</div>
              <div className="flex gap-1.5">
                <input
                  type="text"
                  placeholder={t('wallet.importPlaceholder')}
                  value={importAddress}
                  onChange={(e) => {
                    setImportAddress(e.target.value);
                    setImportError('');
                  }}
                  className="flex-1 bg-[#121323] border border-[#21233D] rounded-lg px-2.5 py-1 text-xs text-white placeholder-gray-650 font-mono focus:border-[#635BFF] outline-none"
                  disabled={importing}
                />
                <button
                  type="submit"
                  disabled={importing || !importAddress.trim()}
                  className="bg-[#635BFF] hover:bg-[#5048E5] text-white p-1.5 rounded-lg transition disabled:opacity-40 flex items-center justify-center shrink-0 cursor-pointer"
                >
                  {importing ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
                </button>
              </div>
              {importError && <div className="text-[9px] text-rose-450 font-mono">{importError}</div>}
              {importSuccess && <div className="text-[9px] text-emerald-450 font-mono">{t('wallet.importSuccess')}</div>}
            </form>

            <button
              onClick={() => {
                disconnectWallet();
                setShowDropdown(false);
              }}
              className="w-full flex items-center gap-2 px-3 py-2 hover:bg-rose-950/30 text-rose-400 hover:text-rose-300 rounded-lg text-xs font-medium transition cursor-pointer text-left border border-transparent hover:border-rose-950/40"
            >
              <LogOut size={14} />
              <span>{t('wallet.disconnectWallet')}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
