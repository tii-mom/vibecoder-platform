import { useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';

export default function RiskNotice() {
  const [visible, setVisible] = useState(true);

  if (!visible) return null;

  return (
    <div className="bg-[#15120C] border-b border-amber-950/50 text-amber-300/90 text-xs py-2 px-4 transition-all">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <AlertTriangle size={14} className="text-amber-500 shrink-0 animate-pulse" />
          <p className="leading-snug">
            <span className="font-semibold text-amber-400 mr-1">风险提示 [sandbox — testnet only]：</span>
            AI Agent 运行于链上智能合约与底层大模型，属于早期极高波动性资产。星火共建及支持可能面临代码漏洞、模型偏差及结算风险，请知悉并理性参与。
          </p>
        </div>
        <button
          onClick={() => setVisible(false)}
          className="text-amber-500 hover:text-amber-300 transition-colors p-1 rounded-md hover:bg-amber-500/10 cursor-pointer"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}
