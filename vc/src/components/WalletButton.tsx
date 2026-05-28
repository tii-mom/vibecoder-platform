import { useState, useRef, useEffect } from 'react';
import { Wallet, ChevronDown, Check, Coins, LogOut, Copy } from 'lucide-react';
import { useTonConnectUI } from '@tonconnect/ui-react';
import { useUserStore } from '../store/userStore';
import { TONService } from '../services/ton';

export default function WalletButton() {
  const { walletAddress, isConnected, profile, connectWallet, disconnectWallet, addFunds, setTonConnectUI } = useUserStore();
  const [tonConnectUI] = useTonConnectUI();
  const [showDropdown, setShowDropdown] = useState(false);
  const [faucetSuccess, setFaucetSuccess] = useState(false);
  const [copied, setCopied] = useState(false);
  
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

  const triggerFaucet = () => {
    addFunds(100, 5000);
    setFaucetSuccess(true);
    setTimeout(() => setFaucetSuccess(false), 3000);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {isConnected && profile ? (
        <div className="flex items-center gap-2">
          {/* TON & VC Balances in navbar */}
          <div className="hidden sm:flex items-center gap-3 px-3 py-1.5 bg-[#121320] border border-[#21233D] rounded-full text-xs font-mono text-gray-400">
            <span className="flex items-center gap-1 text-sky-400">
              <span className="w-1.5 h-1.5 rounded-full bg-sky-400"></span>
              {profile.balanceTON} TON
            </span>
            <span className="text-[#32365A]">|</span>
            <span className="flex items-center gap-1 text-[#635BFF]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#635BFF]"></span>
              {profile.balanceVC} $VC
            </span>
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
          <span>Connect Wallet</span>
        </button>
      )}

      {/* Wallet Dropdown Actions */}
      {showDropdown && profile && (
        <div className="absolute right-0 mt-2 w-64 bg-[#0F101E] border border-[#242646] rounded-xl shadow-2xl p-3 z-50 text-left animate-in fade-in slide-in-from-top-3 duration-200">
          <div className="pb-2 mb-2 border-b border-[#21233D]">
            <span className="text-[10px] text-gray-500 font-mono tracking-wider block">CURRENT WORKSPACE</span>
            <span className="text-xs text-gray-300 font-semibold truncate block mt-0.5">{profile.username}</span>
            <div className="mt-1 flex items-center justify-between text-[11px] text-gray-400 bg-[#121323] p-1.5 rounded font-mono">
              <span className="truncate max-w-[150px]">{walletAddress}</span>
              <button 
                onClick={handleCopy} 
                className="text-gray-500 hover:text-white p-0.5 transition"
                title="Copy Address"
              >
                {copied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
              </button>
            </div>
          </div>

          <div className="space-y-1">
            {/* Show Balance on mobile menu */}
            <div className="sm:hidden p-2 bg-[#121323] rounded-lg mb-2 text-xs font-mono space-y-1">
              <div className="flex justify-between">
                <span className="text-gray-500">TON:</span>
                <span className="text-sky-400 font-semibold">{profile.balanceTON} TON</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">$VC:</span>
                <span className="text-[#635BFF] font-semibold">{profile.balanceVC} $VC</span>
              </div>
            </div>

            {/* Faucet button */}
            <button
              onClick={triggerFaucet}
              disabled={faucetSuccess}
              className={`w-full flex items-center justify-between px-3 py-2 ${faucetSuccess ? 'bg-emerald-950/40 border-emerald-900/40 text-emerald-300' : 'bg-[#1D172F] hover:bg-[#281E43] border border-[#3E2B6B]/40 text-[#B89CF8]'} rounded-lg text-xs font-medium transition cursor-pointer`}
            >
              <span className="flex items-center gap-1.5">
                <Coins size={14} className={faucetSuccess ? 'text-emerald-400' : 'text-[#9A7DFA]'} />
                {faucetSuccess ? 'Claimed successfully!' : 'Claim Faucet (+100 TON / VC)'}
              </span>
              {!faucetSuccess && <span className="bg-[#635BFF]/35 text-[9px] text-[#D8CEFC] px-1.5 py-0.5 rounded font-mono">FREE</span>}
            </button>

            <button
              onClick={() => {
                disconnectWallet();
                setShowDropdown(false);
              }}
              className="w-full flex items-center gap-2 px-3 py-2 hover:bg-rose-950/30 text-rose-400 hover:text-rose-300 rounded-lg text-xs font-medium transition cursor-pointer text-left"
            >
              <LogOut size={14} />
              <span>Disconnect Wallet</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
