import { Link } from 'react-router-dom';
import { Cpu, Terminal } from 'lucide-react';
import WalletButton from './WalletButton';

export default function Header() {
  return (
    <header className="h-14 bg-[#090A13]/85 backdrop-blur-md border-b border-[#181C30] flex items-center justify-between px-4 sticky top-0 z-40 select-none">
      {/* Left side: Brand Logo */}
      <Link to="/" className="flex items-center gap-2 group">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-[#635BFF] to-sky-400 p-0.5 flex items-center justify-center shadow-md shadow-[#635BFF]/10 group-hover:scale-105 transition-all">
          <div className="w-full h-full bg-[#090A13] rounded-[6px] flex items-center justify-center">
            <Cpu size={14} className="text-[#635BFF] group-hover:text-sky-400 transition-colors" />
          </div>
        </div>
        <div className="flex flex-col text-left">
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-bold tracking-tight text-white font-sans group-hover:text-gray-100">VibeCoder</span>
            <span className="bg-[#635BFF]/10 text-[#7D75FF] text-[9px] px-1 py-0.2 rounded font-mono font-medium">VC</span>
            <span className="bg-amber-500/10 text-amber-500 border border-amber-500/20 text-[9px] px-1.5 py-0.5 rounded font-mono font-semibold hidden sm:inline-block">sandbox — testnet only</span>
          </div>
          <span className="text-[9px] text-gray-500 font-mono tracking-widest uppercase hidden sm:block">AI AGENT SYNDICATED CAPITAL</span>
        </div>
      </Link>

      {/* Right side: TON Connect Button with wallet status */}
      <div className="flex items-center gap-3">
        <WalletButton />
      </div>
    </header>
  );
}
