import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  ArrowLeft, Terminal, Code2, BookOpen, Sparkles, Check, 
  Copy, Play, ShieldAlert, Cpu, Heart, CheckCircle2 
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';

export default function WalletSDKDocPage() {
  const [activeSection, setActiveSection] = useState('quickstart');
  const [copiedSnippetId, setCopiedSnippetId] = useState<string | null>(null);
  const [sandboxLog, setSandboxLog] = useState<string[]>(['// 点击上方 “运行沙箱 API” 会在此展示调试返回...']);
  const [isRunningSandbox, setIsRunningSandbox] = useState(false);

  const sections = [
    { id: 'quickstart', label: '快速开始 Quickstart' },
    { id: 'installation', label: 'SDK 安装 Installation' },
    { id: 'receive-payments', label: '1. 自动收款 Collect Pay' },
    { id: 'yield-routing', label: '2. 自动分账 Yield Routing' },
    { id: 'proof-of-state', label: '3. 链上存证 State Attestation' },
    { id: 'users-wallet', label: '4. 用户钱包 Users Wallet' },
    { id: 'launch-tokens', label: '5. 发行代币 Launch Tokens' },
    { id: 'api-reference', label: 'API 参考 API Reference' }
  ];

  const codeSnippets: Record<string, { desc: string, js: string, response: string }> = {
    quickstart: {
      desc: "VibeCoder SDK 可以通过一行命令在您的 AI 智能体程序或 React 程序中接入 TON 链上安全支付担保。您只需要初始化 SDK 并在回调中传递交易要求即可。",
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
      desc: "开发环境最少需要 Node 18+ 环境。可以通过 npm, yarn, 或 pnpm 快速拉取。我们会自带 FunC 静态编译器依赖包。",
      js: `# 使用 npm 安装 VibeCoder 原生 SDK 模块
npm install @vibecoder/sdk --save

# 或者使用 pnpm 极速拉取
pnpm add @vibecoder/sdk`,
      response: `+ @vibecoder/sdk@1.2.4
added 14 packages, audited 125 packages in 1.45s
[SUCCESS] SDK installation complete!`
    },
    'receive-payments': {
      desc: "通过一行简单的 createRequest，拉起标准弹窗、生成二维码，支持用户通过手机端 Tonkeeper, Telegram Wallet 完成资产划付。",
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
      desc: "支持每日产生的 AI 冠名或赞助收入直接划还给代币持有合伙人。支持按代币比例计算自动分账，并广播给中继池执行退佣。",
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
      desc: "利用链上合约存证您的 AI 代码哈希或模型指纹，让任何人或购买者可通过虚拟机直接解密、验证并执行模型安全合规性证明。",
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
      desc: "在浏览器或 Telegram Mini App (TMA) 中接入 TON Connect。让用户不需要离开您的应用，即可查看其原生钱包余额与身份凭证。",
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
      desc: "对于成功的星火项目，可以通过该 SDK 执行一键流动性种子 AMM 池划转。这将自动化部署 bonding curve 并自动上市二级发售大厅。",
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
      desc: "完整的 API 控制台参数以及类型描述。可以通过 TypeScript 类型系统直接联想方法及入参。",
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

  const currentSnip = codeSnippets[activeSection];

  const handleCopySnippet = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSnippetId(id);
    setTimeout(() => {
      setCopiedSnippetId(null);
    }, 2000);
  };

  // Run the sandbox simulation live and update logging window
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
      <div className="border-b border-stripe-[#212544] pb-5 flex items-center gap-3">
        <Link 
          to="/devhub" 
          className="p-2 bg-[#121620] hover:bg-[#1E2235] rounded-xl border border-slate-800 text-gray-400 hover:text-white transition"
          title="返回 Dev Hub 主页"
        >
          <ArrowLeft size={16} />
        </Link>
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <Code2 className="text-[#635BFF]" size={22} />
            <span>TON Smart-Payment SDK 文档柜</span>
          </h1>
          <p className="text-xs text-gray-400 mt-0.5">
            Stripe 风格极简一体代币收款、多层分账及安全代码链上指纹凭证。
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-5">
        
        {/* Left Side index directories */}
        <div className="lg:col-span-3 space-y-2 bg-[#0C0E1D] p-3 rounded-2xl border border-slate-800/80">
          <span className="text-[10px] text-gray-500 font-mono tracking-wider block px-2.5 pb-1">DOCUMENTATION DIRECTORY</span>
          <div className="space-y-1">
            {sections.map((sec) => (
              <button
                key={sec.id}
                onClick={() => {
                  setActiveSection(sec.id);
                  setSandboxLog(['// 点击上方 “运行沙箱 API” 会在此展示调试返回...']);
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
            Current SDK Stable version:{' '}
            <strong className="text-gray-300 font-mono">v1.2.4</strong>
          </div>
        </div>

        {/* Right side documentation body and code panel split */}
        <div className="lg:col-span-9 grid grid-cols-1 md:grid-cols-12 gap-5 leading-relaxed items-start">
          
          {/* Main textual explainer */}
          <div className="md:col-span-7 bg-[#121620] border border-[#22253B] rounded-2xl p-6 space-y-5">
            <div className="space-y-1.5">
              <Badge variant="purple">SDK MODULE / REFERENCE</Badge>
              <h2 className="text-base sm:text-lg font-black text-white tracking-tight">
                {sections.find(s => s.id === activeSection)?.label}
              </h2>
            </div>

            <p className="text-xs text-gray-300 leading-relaxed font-sans">
              {currentSnip.desc}
            </p>

            <div className="pt-4 border-t border-slate-800/50 space-y-3.5 text-xs text-gray-400">
              <span className="font-extrabold text-white block">📖 功能安全和最佳实践说明：</span>
              <ul className="list-disc pl-4 space-y-2 leading-relaxed">
                <li>集成后每次交易无需在智能体端存固私钥，所有的 cryptographic 签名请求都在用户安全的独立 Tonkeeper 虚拟机沙箱执行。</li>
                <li>分账及中继器已通过 <strong>CodeVibe Auditor</strong> 多路流重放漏洞检测。验证契约可在 Dev Hub 执行二次审计。</li>
                <li>分账及支付接口包含内置防割锁，在对应星火生命周期触发自动解签，保障普通质押合伙人的最高资产安全性。</li>
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
                  {copiedSnippetId === activeSection ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
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
                  运行沙箱 API Test
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
              <span>Section 6: TON 机器人收款、分账与自动化 SDK 性能矩阵</span>
            </h3>
            <p className="text-[11px] text-gray-400 mt-0.5">
              原生兼容 Tonkeeper / Telegram Wallet / WebAssembly 虚拟机底层加密特性一览。
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
                <th className="py-3 px-4">核心接口类型</th>
                <th className="py-3 px-4">执行函数 & 静态调用</th>
                <th className="py-3 px-4">链上执行逻辑 / 担保级别</th>
                <th className="py-3 px-4">结算延迟 / Gas 消耗</th>
                <th className="py-3 px-4">风控安全审查等级</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#181A32]/60 text-gray-300">
              {[
                {
                  type: "① 收款与代付",
                  func: "sdk.payments.createRequest()",
                  logic: "支持标准 Memo + 用户独立 App 钱包，兼容多代币 TON / $VC 资产划拨。",
                  gas: "即时确认 / ≤ 0.02 TON",
                  safety: "SECURE (双向非对称加密签名)"
                },
                {
                  type: "② 渐进式里程碑划账",
                  func: "sdk.yield.distribute()",
                  logic: "支持 4 阶段配置参数，由 3 独多签卫士验证解锁，执行 20% 自动复利注入。",
                  gas: "3s / ≤ 0.05 TON",
                  safety: "GUARANTEED (多签节点验证)"
                },
                {
                  type: "③ 链上存证 & 代码核查",
                  func: "sdk.proof.register()",
                  logic: "加密存储精调大模型指纹 (Weights) & 安全网关接入，静态 AST 校验自动报告。",
                  gas: "12s / ≤ 0.08 TON",
                  safety: "AUDITED (静态控制流校验)"
                },
                {
                  type: "④ 开发者保底与退款",
                  func: "sdk.assurance.execLiquidate()",
                  logic: "支持 Staked 模式下 10k $VC 实盘抵押惩扣。遇意外由多签卫士退还至持股人。",
                  gas: "即时锁定 / ≤ 0.01 TON",
                  safety: "MILITARY-GRADE (底仓强制锁仓)"
                },
                {
                  type: "⑤ 用户账号与二级 AMM 发行",
                  func: "sdk.tokens.launchBondingCurve()",
                  logic: "无缝对接 TON Connect。达标后自动发布智能联合曲线 AMM 二级交易大厅。",
                  gas: "5s / ≤ 0.15 TON",
                  safety: "VERIFIED (Bonding Curve)"
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
