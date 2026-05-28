import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft, Terminal, Code2, BookOpen, Sparkles, Check,
  Copy, Play, ShieldAlert, Cpu, Heart, CheckCircle2
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { useTranslation } from '../hooks/useTranslation';

export default function WalletSDKDocPage() {
  const { t, language, setLanguage } = useTranslation();
  const [activeSection, setActiveSection] = useState('quickstart');
  const [copiedSnippetId, setCopiedSnippetId] = useState<string | null>(null);
  const [sandboxLog, setSandboxLog] = useState<string[]>([]);
  const [isRunningSandbox, setIsRunningSandbox] = useState(false);

  // Sync default sandbox log when language changes
  useEffect(() => {
    setSandboxLog([t('walletSDKDoc.sandboxDefaultLog')]);
  }, [language]);

  const sections = [
    { id: 'quickstart', label: t('walletSDKDoc.sections.quickstart.label') },
    { id: 'installation', label: t('walletSDKDoc.sections.installation.label') },
    { id: 'receive-payments', label: t('walletSDKDoc.sections.receivePayments.label') },
    { id: 'yield-routing', label: t('walletSDKDoc.sections.yieldRouting.label') },
    { id: 'proof-of-state', label: t('walletSDKDoc.sections.proofOfState.label') },
    { id: 'users-wallet', label: t('walletSDKDoc.sections.usersWallet.label') },
    { id: 'launch-tokens', label: t('walletSDKDoc.sections.launchTokens.label') },
    { id: 'api-reference', label: t('walletSDKDoc.sections.apiReference.label') }
  ];

  const codeSnippets: Record<string, { desc: string, js: string, response: string }> = {
    quickstart: {
      desc: t('walletSDKDoc.sections.quickstart.desc'),
      js: `import { TONWalletSDK } from '@vibecoder/sdk';

// 初始化 VibeCoder SDK 控制器
const sdk = new TONWalletSDK({
  apiKey: "vc_live_88ff_your_secret_key",
  network: "mainnet" // 或 "testnet"
});

console.log("TON SDK initialized!");`,
      response: `[INFO] TON SDK initialized successfully!
[INFO] Network set to: mainnet
[INFO] Secure API authorization level: verified`
    },
    installation: {
      desc: t('walletSDKDoc.sections.installation.desc'),
      js: `# 使用 npm 安装 VibeCoder 原生 SDK 模块
npm install @vibecoder/sdk --save

# 或者使用 pnpm 极速拉取
pnpm add @vibecoder/sdk`,
      response: `+ @vibecoder/sdk@1.2.4
added 14 packages, audited 125 packages in 1.45s
[SUCCESS] SDK installation complete!`
    },
    'receive-payments': {
      desc: t('walletSDKDoc.sections.receivePayments.desc'),
      js: `// 发起 TON 链上自动收款
const payment = await sdk.payments.createRequest({
  toAddress: "EQD4_OmniLabs_6ef8",
  amountTON: 5.5,                      // 收款金额 5.5 TON
  memo: "OmniSocial Influencer 升级点数",
  onSuccess: (tx) => {
    console.log("付款成功！获得交易哈希: ", tx.hash);
  }
});`,
      response: `{
  "status": "pending",
  "paymentId": "pay_9a8b7c_2026",
  "qrCodeString": "ton://transfer/EQD4_OmniLabs_6ef8?amount=5500000000&text=OmniSocial...",
  "address": "EQD4_...6ef8"
}`
    },
    'yield-routing': {
      desc: t('walletSDKDoc.sections.yieldRouting.desc'),
      js: `// 精准分账：向持有特定 $OSA 的前 100 名用户派发赞助收入
const payoutResult = await sdk.yield.distribute({
  tokenId: "tok-osa",
  amountTON: 150.0, // 分配 150 TON
  relayerAddress: "EQA7_RelayNode_00a1",
  feeDeduction: 0.01 // 1% 作为中继燃料
});

console.log("派发成功，流水账单: ", payoutResult.payoutId);`,
      response: `{
  "status": "broadcasted",
  "payoutId": "yield_osa_55dd",
  "targetsCount": 228,
  "gasConsumed": "0.14 TON",
  "successPercentage": 100
}`
    },
    'proof-of-state': {
      desc: t('walletSDKDoc.sections.proofOfState.desc'),
      js: `// 对特定的 fine-tuned 模型发布哈希指纹存证
const proof = await sdk.proof.register({
  modelName: "OmniSocial-LLM-V2",
  weightsHash: "sha256:7f2c88b6ec4432a1",
  codeGithub: "https://github.com/omnilabs/influencer",
  stakedAmountTON: 100 // 开发者提供 100 TON 保证金
});`,
      response: `{
  "proofId": "att_sha256_7f2c88",
  "timestamp": 1779905391,
  "state": "attested",
  "onchainProofAddress": "EQC9_Proof_88ff"
}`
    },
    'users-wallet': {
      desc: t('walletSDKDoc.sections.usersWallet.desc'),
      js: `// 极简 React hooks 接入
const { wallet, connected, sendTransaction } = useTONConnect();

if (connected) {
  console.log("当前绑定地址: ", wallet.account.address);
}`,
      response: `[INFO] TON Connect: user approved!
[INFO] account.address: EQA7_v1b3C0d3R_8a923fc8_tOnKeEpeR
[INFO] walletProvider: Tonkeeper`
    },
    'launch-tokens': {
      desc: t('walletSDKDoc.sections.launchTokens.desc'),
      js: `// 一键上市部署 bonding curve 联合曲线
const launchResult = await sdk.tokens.launchBondingCurve({
  projectId: "spark-1",
  ticker: "OSA",
  initialSupply: 10000000,
  seedLiquidityTON: 1500, // 星火提取 1500 TON 作做市基金
  developerReservePercent: 25
});`,
      response: `{
  "status": "deployed",
  "tokenId": "tok-osa-bonding",
  "bondingCurveAddress": "EQD4_AMM_991f",
  "initialPrice": "0.012 TON"
}`
    },
    'api-reference': {
      desc: t('walletSDKDoc.sections.apiReference.desc'),
      js: `interface SDKConfiguration {
  apiKey: string;
  network: 'mainnet' | 'testnet';
  timeoutMs?: number;
  relayerUrl?: string;
}

// 静态导出
export declare class TONWalletSDK {
  constructor(config: SDKConfiguration);
  payments: PaymentGateway;
  yield: YieldRouter;
  proof: ProofAttestor;
  tokens: TokenIssuer;
}`,
      response: `[DECLARATIONS] Loaded TypeScript definitions successfully.
All functions are fully guarded by Rust core compiling under WebAssembly.`
    }
  };

  const currentSnip = codeSnippets[activeSection] || codeSnippets.quickstart;

  const handleCopySnippet = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSnippetId(id);
    setTimeout(() => {
      setCopiedSnippetId(null);
    }, 2000);
  };

  const handleRunSandbox = () => {
    setIsRunningSandbox(true);
    setSandboxLog((prev) => [...prev, `[INIT] Ready to run Sandbox call for: "${activeSection}"...`]);

    setTimeout(() => {
      setSandboxLog((prev) => [
        ...prev,
        `[CALL] sdk.${activeSection === 'quickstart' ? 'initialize' : activeSection}.execute()`,
        `[TX] Mocking sandbox cryptographic signature on TON Devnet v4...`,
        `--------------------`,
        currentSnip.response,
        `--------------------`,
        `[SUCCESS] Command executed with return code === 0 🎉`
      ]);
      setIsRunningSandbox(false);
    }, 1500);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 select-none text-left animate-in fade-in duration-200">

      {/* Upper Stripe title */}
      <div className="border-b border-stripe-[#212544] pb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link
            to="/devhub"
            className="p-2 bg-[#121620] hover:bg-[#1E2235] rounded-xl border border-slate-800 text-gray-400 hover:text-white transition"
            title={t('walletSDKDoc.backToDevHub')}
          >
            <ArrowLeft size={16} />
          </Link>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
              <Code2 className="text-[#635BFF]" size={22} />
              <span>{t('walletSDKDoc.title')}</span>
            </h1>
            <p className="text-xs text-gray-400 mt-0.5">
              {t('walletSDKDoc.description')}
            </p>
          </div>
        </div>

        {/* Language selector */}
        <div className="flex items-center gap-2 self-end sm:self-center">
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value as any)}
            className="bg-[#121620] border border-slate-800 text-gray-300 rounded-xl px-3 py-1.5 text-xs outline-none cursor-pointer hover:border-slate-700 hover:text-white transition font-bold"
          >
            <option value="zh">简体中文</option>
            <option value="en">English</option>
            <option value="ko">한국어</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-5">

        {/* Left Side index directories */}
        <div className="lg:col-span-3 space-y-2 bg-[#0C0E1D] p-3 rounded-2xl border border-slate-800/80">
          <span className="text-[10px] text-gray-500 font-mono tracking-wider block px-2.5 pb-1">
            {t('walletSDKDoc.docDirectory')}
          </span>
          <div className="space-y-1">
            {sections.map((sec) => (
              <button
                key={sec.id}
                onClick={() => {
                  setActiveSection(sec.id);
                  setSandboxLog([t('walletSDKDoc.sandboxDefaultLog')]);
                }}
                className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all relative cursor-pointer flex items-center justify-between ${
                  activeSection === sec.id
                    ? 'bg-[#1C1A3F] text-white border-l-3 border-[#635BFF] pl-2.5'
                    : 'text-gray-400 hover:text-white hover:bg-slate-800/20'
                }`}
              >
                <span>{sec.label}</span>
                {sec.id.startsWith('receive') || sec.id.startsWith('yield') ? (
                  <span className="text-[8px] bg-sky-500/10 text-sky-400 p-0.5 px-1.5 rounded uppercase font-mono font-bold">API</span>
                ) : null}
              </button>
            ))}
          </div>

          <div className="pt-4 border-t border-slate-800/40 mt-4 px-2.5 text-[10px] text-gray-500">
            {t('walletSDKDoc.stableVersion')}{' '}
            <strong className="text-gray-300 font-mono">v1.2.4</strong>
          </div>
        </div>

        {/* Right side documentation body and code panel split */}
        <div className="lg:col-span-9 grid grid-cols-1 md:grid-cols-12 gap-5 leading-relaxed items-start">

          {/* Main textual explainer */}
          <div className="md:col-span-7 bg-[#121620] border border-[#22253B] rounded-2xl p-6 space-y-5">
            <div className="space-y-1.5">
              <Badge variant="purple">{t('walletSDKDoc.sdkModuleReference')}</Badge>
              <h2 className="text-base sm:text-lg font-black text-white tracking-tight">
                {sections.find(s => s.id === activeSection)?.label}
              </h2>
            </div>

            <p className="text-xs text-gray-300 leading-relaxed font-sans">
              {currentSnip.desc}
            </p>

            <div className="pt-4 border-t border-slate-800/50 space-y-3.5 text-xs text-gray-400">
              <span className="font-extrabold text-white block">
                {t('walletSDKDoc.safetyPracticeTitle')}
              </span>
              <ul className="list-disc pl-4 space-y-2 leading-relaxed">
                <li>{t('walletSDKDoc.safetyPractice1')}</li>
                <li dangerouslySetInnerHTML={{ __html: t('walletSDKDoc.safetyPractice2') }} />
                <li>{t('walletSDKDoc.safetyPractice3')}</li>
              </ul>
            </div>
          </div>

          {/* Right side snippet blocks and sandbox output client */}
          <div className="md:col-span-5 space-y-5">

            {/* Syntax snippet window */}
            <div className="bg-[#05060C] border border-[#191D3C] rounded-2xl overflow-hidden shadow-2xl">
              <div className="p-3 px-4.5 bg-[#0C0E1D] border-b border-[#191D3C] flex items-center justify-between">
                <span className="text-[10px] text-gray-500 font-mono flex items-center gap-1.5">
                  <Terminal size={11} className="text-[#635BFF]" />
                  <span>SDK_SNIPPET.TS</span>
                </span>
                <button
                  onClick={() => handleCopySnippet(currentSnip.js, activeSection)}
                  className="p-1 rounded text-gray-500 hover:text-white hover:bg-slate-800/50 transition cursor-pointer"
                  title="Copy snippet"
                >
                  {copiedSnippetId === activeSection ? <Check size={12} className="text-emerald-450" /> : <Copy size={12} />}
                </button>
              </div>

              {/* Code layout */}
              <pre className="p-4 overflow-x-auto text-left font-mono text-[10.5px] text-gray-300 leading-relaxed max-h-[220px]">
                <code>{currentSnip.js}</code>
              </pre>
            </div>

            {/* Sandbox tester */}
            <div className="bg-[#0A0C16] border border-[#1D213F] rounded-2xl p-4.5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-gray-404 font-mono font-bold block">ONLINE SANDBOX TESTER</span>
                <Button
                  onClick={handleRunSandbox}
                  loading={isRunningSandbox}
                  size="sm"
                  className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black text-[10px] py-1 px-3"
                >
                  <Play size={10} className="mr-1 mt-0.5 fill-black" />
                  {t('walletSDKDoc.runSandboxBtn')}
                </Button>
              </div>

              <div className="p-3 bg-[#030409] border border-slate-900 rounded-xl max-h-[160px] overflow-y-auto scrollbar-thin text-left">
                <pre className="font-mono text-[9px] text-emerald-400 select-all whitespace-pre-wrap leading-normal">
                  {sandboxLog.map((log, index) => (
                    <div key={index}>{log}</div>
                  ))}
                </pre>
              </div>
            </div>

          </div>

        </div>
      </div>

      {/* Section 6: TON SDK Capability Configuration & Matrix Table */}
      <div className="bg-[#0D0F1F] border border-[#1F2242] rounded-2xl p-6 space-y-5 mt-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#212446] pb-4">
          <div className="text-left">
            <h3 className="text-base font-black text-white tracking-tight flex items-center gap-2">
              <Cpu size={16} className="text-[#8B83FF]" />
              <span>{t('walletSDKDoc.section6Title')}</span>
            </h3>
            <p className="text-[11px] text-gray-400 mt-0.5">
              {t('walletSDKDoc.section6Desc')}
            </p>
          </div>
          <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-2.5 py-1 rounded-full font-mono font-bold tracking-wider self-start sm:self-auto border border-emerald-500/20">
            PROD VERIFIED v1.2.4
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-[#212446] text-gray-500 font-mono text-[10px] uppercase">
                <th className="py-3 px-4">{t('walletSDKDoc.tableHeaders.type')}</th>
                <th className="py-3 px-4">{t('walletSDKDoc.tableHeaders.func')}</th>
                <th className="py-3 px-4">{t('walletSDKDoc.tableHeaders.logic')}</th>
                <th className="py-3 px-4">{t('walletSDKDoc.tableHeaders.gas')}</th>
                <th className="py-3 px-4">{t('walletSDKDoc.tableHeaders.safety')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#181A32]/60 text-gray-300">
              {[
                {
                  type: t('walletSDKDoc.tableRows.payments.type'),
                  func: "sdk.payments.createRequest()",
                  logic: t('walletSDKDoc.tableRows.payments.logic'),
                  gas: t('walletSDKDoc.tableRows.payments.gas'),
                  safety: t('walletSDKDoc.tableRows.payments.safety')
                },
                {
                  type: t('walletSDKDoc.tableRows.yield.type'),
                  func: "sdk.yield.distribute()",
                  logic: t('walletSDKDoc.tableRows.yield.logic'),
                  gas: t('walletSDKDoc.tableRows.yield.gas'),
                  safety: t('walletSDKDoc.tableRows.yield.safety')
                },
                {
                  type: t('walletSDKDoc.tableRows.proof.type'),
                  func: "sdk.proof.register()",
                  logic: t('walletSDKDoc.tableRows.proof.logic'),
                  gas: t('walletSDKDoc.tableRows.proof.gas'),
                  safety: t('walletSDKDoc.tableRows.proof.safety')
                },
                {
                  type: t('walletSDKDoc.tableRows.assurance.type'),
                  func: "sdk.assurance.execLiquidate()",
                  logic: t('walletSDKDoc.tableRows.assurance.logic'),
                  gas: t('walletSDKDoc.tableRows.assurance.gas'),
                  safety: t('walletSDKDoc.tableRows.assurance.safety')
                },
                {
                  type: t('walletSDKDoc.tableRows.tokens.type'),
                  func: "sdk.tokens.launchBondingCurve()",
                  logic: t('walletSDKDoc.tableRows.tokens.logic'),
                  gas: t('walletSDKDoc.tableRows.tokens.gas'),
                  safety: t('walletSDKDoc.tableRows.tokens.safety')
                }
              ].map((row, i) => (
                <tr key={i} className="hover:bg-[#121427]/40 transition-colors">
                  <td className="py-3.5 px-4 font-bold text-white whitespace-nowrap">{row.type}</td>
                  <td className="py-3.5 px-4"><code className="bg-slate-900 px-2 py-0.5 rounded text-[11px] font-mono text-[#8B83FF]">{row.func}</code></td>
                  <td className="py-3.5 px-4 text-xs font-sans text-gray-300 max-w-[280px] leading-relaxed">{row.logic}</td>
                  <td className="py-3.5 px-4 font-mono text-[11px] text-gray-400">{row.gas}</td>
                  <td className="py-3.5 px-4">
                    <span className="p-0.5 px-2 bg-emerald-500/10 text-emerald-400 rounded text-[9.5px] font-mono font-black">
                      {row.safety}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
