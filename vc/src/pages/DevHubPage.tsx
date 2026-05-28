import { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  Terminal, Code, Cpu, ShieldAlert, Sparkles, CheckSquare, 
  Search, BookOpen, AlertCircle, RefreshCw, Key, CreditCard, 
  Check, Copy, Database, Layers, PlayCircle, Plus, Trash2, Zap, HelpCircle 
} from 'lucide-react';
import { useUserStore } from '../store/userStore';
import { Button } from '../components/ui/Button';
import { Card, CardHeader, CardTitle, CardDescription } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Select } from '../components/ui/Select';
import { Input } from '../components/ui/Input';

export default function DevHubPage() {
  const { isConnected, profile, connectWallet, updateProfile } = useUserStore();

  const handleWalletFallback = () => {
    connectWallet();
  };

  // --- TOP COMPUTE CREDITS STATE ---
  const [computeCredits, setComputeCredits] = useState(1280);

  // --- API KEYS MANAGEMENT STATE ---
  const [apiKeys, setApiKeys] = useState([
    { id: 'key-1', label: 'Default Developer Key', prefix: 'vc_live_88ff_oMniL', createdAt: '2026-05-20' },
    { id: 'key-2', label: 'Production Bot Relayer', prefix: 'vc_live_23dd_StAtE', createdAt: '2026-05-24' }
  ]);
  const [newKeyLabel, setNewKeyLabel] = useState('New Sandbox Key');
  const [copiedKeyId, setCopiedKeyId] = useState<string | null>(null);

  const handleCreateKey = () => {
    if (!isConnected) {
      handleWalletFallback();
      return;
    }
    const randHex = Math.random().toString(16).substring(2, 7).toUpperCase();
    const newKey = {
      id: `key-${Date.now()}`,
      label: newKeyLabel || 'Custom Workspace Key',
      prefix: `vc_live_${randHex}_ArChi`,
      createdAt: new Date().toISOString().split('T')[0]
    };
    setApiKeys([...apiKeys, newKey]);
    setNewKeyLabel('');
  };

  const handleDeleteKey = (id: string) => {
    setApiKeys(apiKeys.filter(k => k.id !== id));
  };

  const handleCopyKey = (prefix: string, id: string) => {
    navigator.clipboard.writeText(`${prefix}************`);
    setCopiedKeyId(id);
    setTimeout(() => setCopiedKeyId(null), 2000);
  };

  // --- GPU CALCULATOR STATE ---
  const [selectedGpu, setSelectedGpu] = useState('rtx4090');
  const [rentHours, setRentHours] = useState('24');
  const [isRenting, setIsRenting] = useState(false);
  const [rentMsg, setRentMsg] = useState('');

  const gpuRates = {
    'rtx4090': { name: 'NVIDIA RTX 4090 (24GB VRAM)', rate: 0.15 }, // rate in TON per hour
    'h100': { name: 'NVIDIA H100 SXM5 (80GB VRAM)', rate: 0.85 },
    'a100': { name: 'NVIDIA A100 Tensor Core (40GB)', rate: 0.45 }
  };

  const selectedGpuMeta = gpuRates[selectedGpu as keyof typeof gpuRates] || gpuRates['rtx4090'];
  const calculatedCostTON = Number((Number(rentHours) * selectedGpuMeta.rate).toFixed(2));

  const handleRentGpu = () => {
    if (!isConnected || !profile) {
      handleWalletFallback();
      return;
    }

    if (profile.balanceTON < calculatedCostTON) {
      setRentMsg(`⚠️ 租用失败: 您当前可支配 TON 额度为 ${profile.balanceTON}，无法支付 ${calculatedCostTON} TON 算力账单。`);
      return;
    }

    setIsRenting(true);
    setRentMsg('');

    setTimeout(() => {
      updateProfile({
        balanceTON: Number((profile.balanceTON - calculatedCostTON).toFixed(2))
      });
      setComputeCredits((prev) => prev + Number(rentHours) * 10);
      setRentMsg(`🎉 租用成功! 已为您的控制台接入 ${selectedGpuMeta.name} 运行池，扣减 ${calculatedCostTON} TON 并已充值 ${Number(rentHours) * 10} 计算点数。`);
      setIsRenting(false);
    }, 1800);
  };

  // --- MODELS STATE ---
  const modelsList = [
    { name: 'Gemini 2.5 Flash', rate: '0.0001 TON / 1K Tokens', status: '流畅' },
    { name: 'DeepSeek V3 (Chat)', rate: '0.00015 TON / 1K Tokens', status: '流畅' },
    { name: 'Claude 3.5 Sonnet', rate: '0.0012 TON / 1K Tokens', status: '流畅' },
    { name: 'GPT-4o API', rate: '0.0008 TON / 1K Tokens', status: '流畅' }
  ];

  // --- TEMPLATES STATE ---
  const templates = [
    { title: '多链套利网格 Bot', desc: '内置 AMM 价格滑点追踪，捕获跨 Dex 价格异动。', type: '交易工具' },
    { title: '全自主推文生成器', desc: '结合 NLP 模型，自驱动发帖排线并接入 Web3 赞助。', type: '社交创作' },
    { title: '合约事件高频警报', desc: '多点备份追踪重放和流溢出漏洞静态预设。', type: '网络监控' }
  ];

  const [deploymentStatus, setDeploymentStatus] = useState<string | null>(null);
  const handleDeployTemplate = (title: string) => {
    setDeploymentStatus(`正在为您的工作台初始化 ${title} 代码仓库...`);
    setTimeout(() => {
      setDeploymentStatus(`🎉 ${title} 已经在您的 Agent Studio 面板下部署完成！您可以点击 Studio 查询、调试代码并发布共建。`);
    }, 2000);
  };

  // --- ORIGINAL COMPILER STATE (Preserved) ---
  const [solidityCode, setSolidityCode] = useState(`// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract SimpleAICallback {
    address public owner;
    mapping(address => uint256) public userDividends;

    constructor() { owner = msg.sender; }

    function payDistribution() external payable {
        userDividends[msg.sender] += msg.value;
    }
}`);
  const [transpiling, setTranspiling] = useState(false);
  const [funcOutput, setFuncOutput] = useState('');
  const [auditing, setAuditing] = useState(false);
  const [auditReport, setAuditReport] = useState<any>(null);

  const handleTranspile = () => {
    setTranspiling(true);
    setFuncOutput('');

    setTimeout(() => {
      setTranspiling(false);
      setFuncOutput(
`#pragma version >=0.4.0;
#include "imports/stdlib.fc";

;; TON Block autonomous callback entry point
() recv_internal(int my_balance, int msg_value, cell in_msg_full, slice in_msg_body) impure {
    if (in_msg_body.slice_empty?()) { return (); }
    
    slice cs = in_msg_full.begin_parse();
    int flags = cs~load_uint(4);
    if (flags & 1) { return (); } ;; ignore bounced msg

    slice sender_addr = cs~load_msg_addr();
    int op = in_msg_body~load_uint(32);
    int query_id = in_msg_body~load_uint(64);

    ;; Handle automated dividend deposition
    if (op == 0x36ae || op == 0x1a8c) {
        ;; Save balance to local state machine cells
        save_data(sender_addr, msg_value + my_balance);
        return ();
    }
}`);
    }, 1500);
  };

  const handleAudit = () => {
    setAuditing(true);
    setAuditReport(null);

    setTimeout(() => {
      setAuditing(false);
      setAuditReport({
        score: 98,
        warnings: 0,
        checks: [
          { name: '防重放攻击 (Replay Attack Prevention)', status: 'PASS', desc: '使用了序列 nonce 与 msg seq_no 签名，防止重签名广播。' },
          { name: '气体滑点溢出 (Gas Slippage Check)', status: 'PASS', desc: '循环结构深度低于 4，符合 FunC 单交易消费池上限。' },
          { name: '冷金库分流溢出极值 (State Mutation Boundary)', status: 'PASS', desc: '存储单元 Cell 开关完全锁合，对特权函数调用了 (throw_unless) 校验。' }
        ],
        advice: '代扣税款分发比例逻辑合规。可以在部署 Studio 成功注册。'
      });
    }, 1200);
  };

  return (
    <div className="space-y-10 text-left select-none">
      
      {/* Upper header section */}
      <div className="border-b border-[#171A30] pb-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-2">
            <Terminal className="text-[#8B83FF]" size={24} />
            <span>Developer Hub</span>
          </h1>
          <p className="text-sm text-gray-400 mt-2 leading-relaxed max-w-2xl">
            提供 TON Wallet SDK 文档库、AI 模型中继 API 密钥管理以及 GPU 点数计算节点租赁控制台。
          </p>
        </div>

        {/* Compute credits balances banner */}
        <div className="flex gap-6 items-center bg-[#0A0B14] p-4.5 px-6 border border-[#171A30] rounded-2xl self-start md:self-auto shadow-sm">
          <div className="flex items-center gap-2.5">
            <Zap className="text-[#FF9F1A] shrink-0" size={18} />
            <div>
              <span className="text-[9px] text-gray-500 block uppercase font-mono tracking-wider font-semibold">COMPUTE CREDITS</span>
              <span className="text-[13px] font-bold font-mono text-white">{computeCredits} 点</span>
            </div>
          </div>
          <div className="h-8 w-[1px] bg-[#171A30]" />
          <div className="flex items-center gap-2.5">
            <Code className="text-[#8B83FF] shrink-0" size={18} />
            <div>
              <span className="text-[9px] text-gray-500 block uppercase font-mono tracking-wider font-semibold">VC COUPONS</span>
              <span className="text-[13px] font-bold font-mono text-[#8B83FF]">{isConnected ? profile?.balanceVC : 0} VC</span>
            </div>
          </div>
        </div>
      </div>

      {/* CORE FOUR UTILITIES GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-10">
        
        {/* CARD 1: TON Wallet SDK (CORE) */}
        <Card className="flex flex-col justify-between p-6">
          <div className="space-y-3.5">
            <div className="flex items-center justify-between">
              <Badge variant="purple">Core Blockchain SDK</Badge>
              <span className="text-[10px] text-gray-500 font-mono">v1.2.4 (stable)</span>
            </div>

            <div>
              <h3 className="text-sm font-black text-white">TON Smart-Payment SDK</h3>
              <p className="text-[11px] text-gray-400 leading-relaxed mt-1">
                让你的智能体或机器人一键接入合规链上支付和自动分账路由。Stripe 风格的开发逻辑，极少行数快速绑定主网收款地址。
              </p>
            </div>

            <div className="p-3 bg-[#07080F]/45 hover:bg-[#07080F] transition border border-dashed border-[#22253B] rounded-xl font-mono text-[10.5px] text-[#A69FFF] flex items-center gap-2">
              <Key size={13} className="shrink-0" />
              <span>sdk.payments.createRequest(...)</span>
            </div>
          </div>

          <div className="pt-6 flex gap-3">
            <Link 
              to="/devhub/docs"
              className="px-4.5 py-2.5 bg-[#635BFF] hover:bg-[#5048E5] text-white text-xs font-bold rounded-xl shadow-lg shadow-[#635BFF]/10 transition flex-1 text-center"
            >
              查看 SDK 文档 &rarr;
            </Link>
            <button
              onClick={() => {
                // Generate quick key
                if (apiKeys.some(k=>k.label === 'Generated SDK Key')) return;
                setApiKeys([...apiKeys, { id: `key-quick`, label: 'Generated SDK Key', prefix: 'vc_live_88ff_QuIcK', createdAt: new Date().toISOString().split('T')[0] }]);
              }}
              className="px-4.5 py-2.5 bg-slate-800 hover:bg-slate-705 text-gray-200 hover:text-white border border-slate-700/60 text-xs font-bold rounded-xl transition"
            >
              获取 API Key
            </button>
          </div>
        </Card>

        {/* CARD 2: GPU Lease Calculator Tool */}
        <Card className="flex flex-col justify-between p-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Badge variant="warning">High Performance Compute</Badge>
              <span className="text-[10px] text-[#FF9F1A] font-mono flex items-center gap-1">
                <Zap size={10} className="fill-warning border-none" />
                <span>实时供应中</span>
              </span>
            </div>

            <div>
              <h3 className="text-sm font-black text-white">GPU 物理算力池租赁</h3>
              <p className="text-[11px] text-gray-400 mt-1">
                按需微调您的 AI 细分模型，提供稳定极低的 GPU 按时租赁。
              </p>
            </div>

            {/* Config options */}
            <div className="grid grid-cols-2 gap-3.5 pt-1.5 text-left">
              <div className="space-y-1">
                <label className="text-[9.5px] text-gray-500 font-bold uppercase font-mono">GPU 模型选择</label>
                <select
                  value={selectedGpu}
                  onChange={(e) => setSelectedGpu(e.target.value)}
                  className="w-full bg-[#121424] border border-[#22253B] text-gray-250 hover:text-white rounded-lg p-2 text-xs outline-none cursor-pointer font-bold"
                >
                  <option value="rtx4090">RTX 4090 (24GB VRAM)</option>
                  <option value="a100">A100 (40GB Tensor)</option>
                  <option value="h100">H100 SXM5 (80GB VRAM)</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[9.5px] text-gray-500 font-bold uppercase font-mono">租用时长选择</label>
                <select
                  value={rentHours}
                  onChange={(e) => setRentHours(e.target.value)}
                  className="w-full bg-[#121424] border border-[#22253B] text-gray-250 hover:text-white rounded-lg p-2 text-xs outline-none cursor-pointer font-bold animate-none"
                >
                  <option value="1">1 小时</option>
                  <option value="12">12 小时</option>
                  <option value="24">24 小时 (日租)</option>
                  <option value="72">72 小时 (特惠三日)</option>
                </select>
              </div>
            </div>

            {/* Simulated cost indicator */}
            <div className="flex justify-between items-center text-[10.5px] font-mono bg-[#07080F]/45 p-2 px-3 border border-slate-900 rounded-xl">
              <span className="text-gray-500">结算费用成本预计:</span>
              <span className="font-extrabold text-amber-500">{calculatedCostTON} TON</span>
            </div>
          </div>

          <div className="pt-4 flex flex-col gap-2">
            <Button 
              onClick={handleRentGpu}
              loading={isRenting}
              className="bg-amber-500 hover:bg-amber-600 text-[#07080F] font-black w-full"
            >
              {isRenting ? '结算合约扣款中...' : '提交租赁订单 (Rent Now)'}
            </Button>
            {rentMsg && (
              <span className="text-[10px] text-gray-404 block pt-1 text-center font-bold font-sans">
                {rentMsg}
              </span>
            )}
          </div>
        </Card>

        {/* CARD 3: Model APIs */}
        <Card className="flex flex-col justify-between p-6">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Badge variant="info">Automated Model Gateway</Badge>
              <span className="text-[9.5px] text-emerald-450 font-mono">API ACTIVE</span>
            </div>

            <div>
              <h3 className="text-sm font-black text-white">模型专属 API 中继</h3>
              <p className="text-[11px] text-gray-400 mt-1">
                无需跨网关代理，一键汇聚头部自然语言大模型 API key。通过我们的代扣税账户实时划扣。
              </p>
            </div>

            <div className="divide-y divide-slate-800/40 border border-slate-850/60 rounded-xl overflow-hidden text-[10px] bg-[#07080F]/45 text-left">
              {modelsList.map((m, i) => (
                <div key={i} className="p-2 px-3 flex items-center justify-between hover:bg-slate-800/10">
                  <span className="text-white font-bold">{m.name}</span>
                  <div className="flex gap-2.5 font-mono">
                    <span className="text-gray-500">{m.rate}</span>
                    <span className="text-emerald-400 font-extrabold uppercase">{m.status}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-4">
            <button 
              onClick={() => {
                if (apiKeys.some(k=>k.label === 'Unified API Key')) return;
                setApiKeys([...apiKeys, { id: `key-api`, label: 'Unified API Key', prefix: 'vc_live_44aa_ArCh', createdAt: new Date().toISOString().split('T')[0] }]);
              }}
              className="w-full py-2.5 bg-slate-800 hover:bg-slate-705 border border-slate-700/60 text-gray-200 hover:text-white font-bold text-xs rounded-xl transition"
            >
              一键配发 Unified API Key
            </button>
          </div>
        </Card>

        {/* CARD 4: Templates */}
        <Card className="flex flex-col justify-between p-6">
          <div className="space-y-3.5">
            <div className="flex items-center justify-between">
              <Badge variant="success">Starter repos</Badge>
              <span className="text-[10px] text-gray-500 font-mono">1-CLICK</span>
            </div>

            <div>
              <h3 className="text-sm font-black text-white">精选极客初始化魔板</h3>
              <p className="text-[11px] text-gray-400 mt-1">
                包含标准安全声明、自動分账以及 TON Connect 二维码拉起的全栈 Agent 网页/插件包代码。
              </p>
            </div>

            <div className="space-y-2">
              {templates.map((t, idx) => (
                <div key={idx} className="p-2.5 bg-[#07080F]/45 rounded-xl border border-dotted border-slate-800 flex items-center justify-between text-[10px]">
                  <div className="text-left min-w-0 flex-1 pr-2">
                    <span className="text-white font-bold block">{t.title}</span>
                    <span className="text-gray-500 block truncate leading-normal">{t.desc}</span>
                  </div>
                  <button
                    onClick={() => handleDeployTemplate(t.title)}
                    className="px-2.5 py-1 bg-[#635BFF] hover:bg-[#5048E5] text-white font-black rounded uppercase text-[9px] shrink-0"
                  >
                    DEPLOY
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-4">
            {deploymentStatus && (
              <span className="text-[10px] text-[#A69FFF] block text-center font-bold py-1.5 animate-pulse leading-normal">
                {deploymentStatus}
              </span>
            )}
          </div>
        </Card>

      </div>

      {/* COMPILER AST TRANSPILER SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2">
        {/* Solidity-to-FunC Automated Transpiler */}
        <div className="bg-[#0C0E1D] border border-[#1E2145] p-5 rounded-2xl space-y-4">
          <div className="flex items-center gap-2.5 pb-2 border-b border-[#1C1F3F]">
            <Code size={18} className="text-[#635BFF]" />
            <div>
              <h3 className="text-sm font-bold text-white tracking-tight">Solidity ➔ FunC 合约一键编译转化</h3>
              <p className="text-[10.5px] text-gray-400 font-medium">快速完成以太坊架构至 TON Telegram 原生智能合约的转换</p>
            </div>
          </div>

          <div className="space-y-1 text-left">
            <span className="text-[10px] text-gray-500 font-mono tracking-wider">INPUT SOLIDITY SOURCE</span>
            <textarea
              value={solidityCode}
              onChange={(e) => setSolidityCode(e.target.value)}
              rows={8}
              className="w-full bg-[#07080F] border border-[#23274E] text-slate-300 font-mono text-[11px] p-3 rounded-xl focus:border-[#635BFF] outline-none transition scrollbar-thin"
            />
          </div>

          <div className="flex justify-end pt-1">
            <button
              onClick={handleTranspile}
              disabled={transpiling}
              className="px-5 py-2 bg-[#635BFF] hover:bg-[#5048E5] text-white rounded-xl text-xs font-bold shadow-md shadow-[#635BFF]/10 active:scale-95 transition flex items-center gap-1.5 cursor-pointer"
            >
              {transpiling ? <RefreshCw size={13} className="animate-spin" /> : <Cpu size={13} />}
              <span>{transpiling ? '正在解析 AST 语义中...' : '开始自动化翻译成 FunC'}</span>
            </button>
          </div>

          {funcOutput && (
            <div className="space-y-2 animate-in slide-in-from-bottom duration-100">
              <span className="text-[10px] text-gray-500 font-mono tracking-wider block">OUTPUT FunC CODE (FOR TON DEPLOYMENT)</span>
              <div className="relative">
                <pre className="w-full bg-[#05060A] text-emerald-400 font-mono text-[10.5px] p-4 rounded-xl overflow-x-auto text-left leading-relaxed max-h-72 border border-emerald-900/30">
                  {funcOutput}
                </pre>
                <span className="absolute right-3 top-3 bg-emerald-950/40 text-emerald-400 text-[9px] px-1.5 py-0.2 rounded font-mono font-bold">FunC ADAPTED</span>
              </div>
            </div>
          )}
        </div>

        {/* Audit vulnerability scanner */}
        <div className="bg-[#0C0E1D] border border-[#1E2145] p-5 rounded-2xl space-y-4">
          <div className="flex items-center gap-2.5 pb-2 border-b border-[#1C1F3F]">
            <Terminal size={18} className="text-sky-400" />
            <div>
              <h3 className="text-sm font-bold text-white tracking-tight">智能合约静态安全审计舱</h3>
              <p className="text-[10.5px] text-gray-400 font-medium">深度扫描合约安全逻辑漏洞，预测防重放与 APY 指标</p>
            </div>
          </div>

          <p className="text-xs text-gray-400 leading-normal">
            在 Studio 发布早期共建新项目前，你可以使用安全扫描仪快速对你已经持有的代码进行多向诊断，确保在测试沙盒和正式分账时不遭到女巫爆破。
          </p>

          <div className="pt-2 flex justify-start">
            <button
              onClick={handleAudit}
              disabled={auditing}
              className="px-5 py-2.5 bg-sky-500 hover:bg-sky-600 font-bold text-[#07080F] rounded-xl text-xs shadow-md shadow-sky-500/10 active:scale-95 transition flex items-center gap-1.5 cursor-pointer"
            >
              <Search size={14} />
              <span>{auditing ? '正在触发静态沙箱溢出扫描...' : '开始漏洞与合规审计'}</span>
            </button>
          </div>

          {auditReport && (
            <div className="space-y-3 p-4 bg-[#0F1722]/80 border border-sky-900/40 rounded-xl animate-in zoom-in-95">
              <div className="flex items-center justify-between border-b border-sky-950 pb-2 border-none">
                <span className="text-xs font-bold text-white">安全指数 (Security Auditing Score)</span>
                <span className="bg-sky-950 text-sky-400 font-mono font-bold text-xs px-2 py-0.5 rounded">
                  {auditReport.score} / 100 [MAX SAFE]
                </span>
              </div>

              <div className="space-y-2">
                {auditReport.checks.map((chk: any, index: number) => (
                  <div key={index} className="space-y-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-semibold text-gray-200">{chk.name}</span>
                      <span className="text-emerald-400 font-bold font-mono text-[9px] p-0.5 px-1 bg-emerald-950/40 border border-emerald-900/30 rounded">
                        {chk.status}
                      </span>
                    </div>
                    <p className="text-[10px] text-gray-400 leading-relaxed text-left pl-1">
                      {chk.desc}
                    </p>
                  </div>
                ))}
              </div>

              <div className="pt-2 border-t border-[#1C1E3F] text-[10.5px] text-gray-400 leading-normal bg-[#090F16] p-2 rounded-lg">
                <span className="font-semibold text-sky-400 block pb-0.5">专家会诊报告：</span>
                {auditReport.advice}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* BOTTOM: MY API KEYS MANAGER */}
      <Card className="p-0 overflow-hidden border border-[#21243C]">
        <div className="p-5 border-b border-[#21243C] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <CardTitle className="text-sm font-black text-white flex items-center gap-2">
              <Key size={16} className="text-[#635BFF]" />
              <span>我的 API 证书密钥保管箱 (Developer API Keys)</span>
            </CardTitle>
            <CardDescription>用于对 SDK 调用执行去中心化中继授权。所有 Key 均保存在本地，随时可以一键撤销安全授权。</CardDescription>
          </div>

          {/* Create new Key form block */}
          <div className="flex gap-2.5 items-center">
            <input
              type="text"
              placeholder="命名新密钥..."
              value={newKeyLabel}
              onChange={(e) => setNewKeyLabel(e.target.value)}
              className="bg-[#121424] border border-[#22253B] focus:border-[#635BFF] text-white rounded-xl px-3 py-1.5 text-xs outline-none max-w-[150px] font-semibold"
            />
            <button
              onClick={handleCreateKey}
              className="px-3 py-1.5 bg-[#635BFF] hover:bg-[#5048E5] text-white text-xs font-bold rounded-xl shadow-md transition flex items-center gap-1 cursor-pointer"
            >
              <Plus size={13} />
              <span>创建密钥</span>
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#121620]/85 border-b border-[#21243C] text-gray-400 font-mono text-[10px] uppercase">
                <th className="p-4 pl-5">密钥标签</th>
                <th className="p-4">公认前缀 (Secret Prefix)</th>
                <th className="p-4">创建日期</th>
                <th className="p-4 pr-5 text-right">操作管理</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/40 font-mono">
              {apiKeys.map((k) => (
                <tr key={k.id} className="hover:bg-slate-800/10 transition">
                  <td className="p-4 pl-5 font-sans font-bold text-gray-200">{k.label}</td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <span className="text-sky-352 font-bold">{k.prefix}****************</span>
                      <button
                        onClick={() => handleCopyKey(k.prefix, k.id)}
                        className="p-1 text-gray-500 hover:text-white hover:bg-slate-800/50 rounded transition cursor-pointer"
                        title="Copy Key Payload"
                      >
                        {copiedKeyId === k.id ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
                      </button>
                    </div>
                  </td>
                  <td className="p-4 text-gray-400">{k.createdAt}</td>
                  <td className="p-4 pr-5 text-right">
                    <button
                      onClick={() => handleDeleteKey(k.id)}
                      className="p-1 px-2 hover:bg-rose-550/15 text-gray-550 hover:text-rose-400 rounded transition flex items-center gap-1.5 justify-end ml-auto cursor-pointer"
                      title="Delete Key"
                    >
                      <Trash2 size={12} />
                      <span className="text-[10px] font-sans">撤销</span>
                    </button>
                  </td>
                </tr>
              ))}

              {apiKeys.length === 0 && (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-gray-500 font-sans">
                    还没有任何可用的 API 凭据。请在右上方命名并点击创建。
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

    </div>
  );
}
