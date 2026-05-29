import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Settings, Shield, Key, CheckCircle, Wallet, UserCircle, 
  ChevronRight, RefreshCw, LogOut,   Copy, Check, Info, Bell, BellRing, Coins,
  Bot, Terminal, CheckCircle2
} from 'lucide-react';
import { useUserStore } from '../store/userStore';
import { useContractStore } from '../store/contractStore';
import { Button } from '../components/ui/Button';
import { Card, CardHeader, CardTitle, CardDescription } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';

export default function SettingsPage() {
  const { isConnected, profile, updateProfile, connectWallet, disconnectWallet } = useUserStore();
  const navigate = useNavigate();

  const [username, setUsername] = useState(profile?.username || 'VibeDev_0a8b');
  const [role, setRole] = useState(profile?.role || 'developer');
  const [gateway, setGateway] = useState('toncenter_mainnet');
  const [customRpcUrl, setCustomRpcUrl] = useState('https://mainnet.tonhubapi.com/v2/jsonRPC');
  const [customApiKey, setCustomApiKey] = useState('vc_live_88ff_oMniLSandboxApiKey');
  const [alertLevel, setAlertLevel] = useState('info');

  // Notifications toggles
  const [notifFunding, setNotifFunding] = useState(true);
  const [notifDividends, setNotifDividends] = useState(true);
  const [notifAudits, setNotifAudits] = useState(false);

  // States
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);
  const [faucetLoading, setFaucetLoading] = useState<string | null>(null);
  const [faucetMsg, setFaucetMsg] = useState('');

  const handleWalletFallback = () => {
    connectWallet();
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (isConnected && profile) {
      updateProfile({ 
        username, 
        role: role as 'developer' | 'investor' 
      });
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  // Faucet claim helper (Claim 50 TON or 100 $VC instantly)
  const handleFaucetClaim = (type: 'TON' | 'VC') => {
    if (!isConnected || !profile) {
      handleWalletFallback();
      return;
    }

    setFaucetLoading(type);
    setFaucetMsg('');

    setTimeout(() => {
      if (type === 'TON') {
        updateProfile({
          balanceTON: Number((profile.balanceTON + 50).toFixed(2))
        });
        setFaucetMsg('🎉 成功领取 50 TON 测试代金券！账户已刷新。');
      } else {
        updateProfile({
          balanceVC: Number((profile.balanceVC + 100).toFixed(2))
        });
        setFaucetMsg('🎉 成功领取 100 $VC 代码质押券！可在 Launchpad 抵用。');
      }
      setFaucetLoading(null);
    }, 1200);
  };

  const handleCopyAddress = () => {
    if (!profile?.walletAddress) return;
    navigator.clipboard.writeText(profile.walletAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="space-y-10 text-left select-none">
      
      {/* Title */}
      <div className="border-b border-[#171A30] pb-8">
        <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-2.5">
          <Settings className="text-[#8B83FF]" size={24} />
          <span>Settings</span>
        </h1>
        <p className="text-sm text-gray-400 mt-2 leading-relaxed max-w-3xl font-sans">
          自定义您的极客开发者别称、申领免费沙盒调试金、切换 RPC 物联网节点网络并管理自动化分配警报。
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-start">
        
        {/* Left main settings columns */}
        <div className="lg:col-span-8 space-y-6">
          <form onSubmit={handleSave} className="bg-[#121620] border border-[#22253E] rounded-2xl p-6 space-y-5">
            
            {/* 1. Profile information */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-[#22253C]">
                <UserCircle size={15} className="text-[#635BFF]" />
                <span className="text-xs font-black text-white">1. 用户身份卡片 (Profile Preferences)</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1 text-left">
                  <label className="text-[10px] text-gray-400 font-bold block uppercase">开发者别名 Username</label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full bg-[#1A1C2C] border border-[#22253E] focus:border-[#635BFF] text-white rounded-xl px-3.5 py-2.5 text-xs outline-none transition"
                  />
                </div>

                <div className="space-y-1 text-left">
                  <label className="text-[10px] text-gray-400 font-bold block uppercase">工作区角色 Professional Role</label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as 'developer' | 'investor' | 'both')}
                    className="w-full bg-[#1A1C2C] border border-[#22253E] focus:border-[#635BFF] text-white rounded-xl px-3.5 py-2.5 text-xs outline-none cursor-pointer"
                  >
                    <option value="developer">Developer (人工智能合约极客)</option>
                    <option value="investor">DeFi Backer (共建支持者)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* 2. Gateway configurations */}
            <div className="space-y-4 pt-2">
              <div className="flex items-center gap-2 pb-2 border-b border-[#22253C]">
                <Key size={15} className="text-[#635BFF]" />
                <span className="text-xs font-black text-white">2. RPC 智慧网关与自备 Key (Gateway Configs)</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1 text-left">
                  <label className="text-[10px] text-gray-400 font-bold block uppercase">API 调配服务节点</label>
                  <select
                    value={gateway}
                    onChange={(e) => setGateway(e.target.value)}
                    className="w-full bg-[#1A1C2C] border border-[#22253E] focus:border-[#635BFF] text-white rounded-xl px-3.5 py-2.5 text-xs outline-none cursor-pointer"
                  >
                    <option value="toncenter_mainnet">Toncenter V2 RPC - 官方主网主干线</option>
                    <option value="toncenter_testnet">Toncenter V2 RPC - 官方测试沙盒段</option>
                    <option value="ton_access">Orbs TON Access - 链下分布式路由</option>
                  </select>
                </div>

                <div className="space-y-1 text-left">
                  <label className="text-[10px] text-gray-400 font-bold block uppercase">自定义 RPC 节点节点 URL</label>
                  <input
                    type="text"
                    value={customRpcUrl}
                    onChange={(e) => setCustomRpcUrl(e.target.value)}
                    className="w-full bg-[#1A1C2C] border border-[#22253E] text-gray-300 rounded-xl px-3.5 py-2.5 text-xs outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1 text-left pt-1">
                <label className="text-[10px] text-gray-405 font-bold block uppercase">自备 LLM 大模型密钥 (API Key Access)</label>
                <input
                  type="password"
                  value={customApiKey}
                  onChange={(e) => setCustomApiKey(e.target.value)}
                  placeholder="请输入您的 Gemini / DeepSeek API 令牌..."
                  className="w-full bg-[#1A1C2C] border border-[#22253E] text-gray-300 rounded-xl px-3.5 py-2.5 text-xs outline-none font-mono"
                />
              </div>
            </div>

            {/* 3. Notification triggers */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center gap-2 pb-2 border-b border-[#22253C]">
                <Bell size={15} className="text-[#635BFF]" />
                <span className="text-xs font-black text-white">3. 通道提醒与分账推送 (Notification Settings)</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                <label className="flex items-center gap-2 cursor-pointer bg-[#1A1C2C] p-3 rounded-xl border border-slate-800/80">
                  <input
                    type="checkbox"
                    checked={notifFunding}
                    onChange={() => setNotifFunding(!notifFunding)}
                    className="accent-[#635BFF] cursor-pointer"
                  />
                  <span className="text-xs text-gray-300 font-bold">星火募资状态变更</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer bg-[#1A1C2C] p-3 rounded-xl border border-slate-800/80">
                  <input
                    type="checkbox"
                    checked={notifDividends}
                    onChange={() => setNotifDividends(!notifDividends)}
                    className="accent-[#635BFF] cursor-pointer"
                  />
                  <span className="text-xs text-gray-300 font-bold">已分配份额结算自动通知</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer bg-[#1A1C2C] p-3 rounded-xl border border-slate-800/80">
                  <input
                    type="checkbox"
                    checked={notifAudits}
                    onChange={() => setNotifAudits(!notifAudits)}
                    className="accent-[#635BFF] cursor-pointer"
                  />
                  <span className="text-xs text-gray-300 font-bold">审计安全报警拦截</span>
                </label>
              </div>
            </div>

            {/* 4. Fault protection status */}
            <div className="space-y-3.5 pt-2">
              <div className="flex items-center gap-2 pb-2 border-b border-[#22253C]">
                <Shield size={15} className="text-[#635BFF]" />
                <span className="text-xs font-black text-white">4. 自动化防重放及多签保护警报 (Security)</span>
              </div>

              <div className="flex flex-col sm:flex-row gap-5 font-bold text-xs text-gray-300">
                {['off', 'info', 'strict'].map((lvl) => (
                  <label key={lvl} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="security_lvl"
                      value={lvl}
                      checked={alertLevel === lvl}
                      onChange={() => setAlertLevel(lvl)}
                      className="accent-[#635BFF]"
                    />
                    <span className="capitalize">
                      {lvl === 'off' ? '完全放权 (Bypass)' : lvl === 'info' ? '仅告静态溢出重放 (Info - Recommended)' : '强力多签阻截 (Strict Pro)'}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Save Button */}
            <div className="pt-4 flex items-center justify-between border-t border-[#22253E] mt-6">
              {saved ? (
                <div className="text-emerald-450 text-xs font-bold flex items-center gap-1.5 animate-in fade-in">
                  <CheckCircle size={14} />
                  <span>参数设置已成功写入本地安全冷存储段。</span>
                </div>
              ) : (
                <div className="text-[10px] text-gray-500 font-mono">
                  SENSITIVE PREFERENCES LOCAL STORAGE GUARANTEE
                </div>
              )}
              <Button type="submit">
                保存当前设定的参数
              </Button>
            </div>

          </form>
        </div>

        {/* Right sandbox billing wallet and claim units console */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* Wallet Cockpit connection status card */}
          <Card className="p-5.5 space-y-4">
            <span className="text-[10px] text-gray-500 font-mono tracking-wider block">TESTNET WALLET CONNECTIVITY</span>
            {isConnected ? (
              <div className="space-y-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <span className="text-xs font-black text-white font-sans">{profile?.username || "Dev User"}</span>
                    <Badge variant="success">已授权 (AUTHORIZED)</Badge>
                  </div>
                  <Wallet className="text-emerald-400 shrink-0" size={24} />
                </div>

                <div className="p-3 bg-[#07080F]/60 rounded-xl border border-slate-900 font-mono text-[10px] select-all space-y-1.5 leading-normal">
                  <span className="text-gray-500 font-sans block">绑定的沙盒合约地址/公钥:</span>
                  <div className="flex items-center justify-between gap-1.5">
                    <span className="text-gray-300 block truncate max-w-[190px] font-bold" title={profile?.walletAddress}>{profile?.walletAddress}</span>
                    <button 
                      onClick={handleCopyAddress}
                      className="text-gray-500 hover:text-white transition cursor-pointer"
                    >
                      {copied ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
                    </button>
                  </div>
                </div>

                <div className="flex justify-between items-center text-xs font-mono pt-1">
                  <div>
                    <span className="text-[9px] text-gray-500 block">TON CASH</span>
                    <span className="text-white font-extrabold">{profile?.balanceTON} TON</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[9px] text-gray-500 block">VC CREDITS</span>
                    <span className="text-purple-400 font-extrabold">{profile?.balanceVC} VC</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={disconnectWallet}
                  className="w-full py-2 bg-rose-600/10 hover:bg-rose-600/20 text-rose-450 hover:text-rose-400 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer mt-2"
                >
                  <LogOut size={12} />
                  <span>断开钱包并清除参数</span>
                </button>
              </div>
            ) : (
              <div className="py-6 text-center space-y-3.5 leading-normal">
                <Wallet className="text-gray-505 mx-auto opacity-70" size={32} />
                <div>
                  <h4 className="text-xs font-bold text-gray-300">尚未建立沙盒连接</h4>
                  <p className="text-[10px] text-gray-505 max-w-xs mx-auto mt-0.5">连接 VibeCoder 仿真节点，即可解锁每日代金券和领币控制端。</p>
                </div>
                <Button onClick={handleWalletFallback} className="w-full">
                  连接极客 Connect Wallet
                </Button>
              </div>
            )}
          </Card>

          {/* Test Faucets section */}
          <Card className="p-5.5 space-y-4">
            <span className="text-[10px] text-gray-500 font-mono tracking-wider block">SANDBOX FAUCETS CONSOLE</span>
            
            <div className="space-y-3.5">
              <div>
                <h4 className="text-xs font-bold text-white">沙盒子代币申领中心</h4>
                <p className="text-[10px] text-gray-405 leading-relaxed mt-0.5">测试网代币非主网真金。可在星火大厅以及 Launchpad 发行中完成代码模拟流转交割校验。</p>
              </div>

              {faucetMsg && (
                <div className="p-2.5 bg-emerald-950/25 border border-emerald-900/35 text-emerald-400 text-[10px] leading-relaxed rounded-xl">
                  {faucetMsg}
                </div>
              )}

              {/* Claims options grid */}
              <div className="space-y-2.5">
                <Button
                  onClick={() => handleFaucetClaim('TON')}
                  loading={faucetLoading === 'TON'}
                  variant="secondary"
                  className="w-full justify-between"
                >
                  <span className="text-left">申领 +50 TON Faucet Fuel</span>
                  <ChevronRight size={12} />
                </Button>

                <Button
                  onClick={() => handleFaucetClaim('VC')}
                  loading={faucetLoading === 'VC'}
                  variant="secondary"
                  className="w-full justify-between"
                >
                  <span className="text-left text-purple-400">申领 +100 VC Launchpad Credits</span>
                  <ChevronRight size={12} />
                </Button>
              </div>
            </div>
          </Card>

          {/* Developer Console Quick Entry */}
          <Card className="p-5.5 space-y-4">
            <span className="text-[10px] text-gray-500 font-mono tracking-wider block">DEVELOPER CONSOLE</span>
            
            <div className="space-y-3.5 text-left">
              <div>
                <h4 className="text-xs font-bold text-white">开发者工作台快速入口</h4>
                <p className="text-[10px] text-gray-400 leading-relaxed mt-0.5">
                  在此可快速前往 Agent Studio 进行智能体自主开发与参数部署，或查阅 Dev Hub 代码安全审计与自动分账 SDK 文档。
                </p>
              </div>

              <div className="space-y-2.5">
                <button
                  type="button"
                  onClick={() => navigate('/studio')}
                  className="w-full bg-[#1A1C2C] border border-[#22253E] hover:border-[#635BFF]/60 hover:bg-[#1C1D3A] text-white rounded-xl p-3.5 text-xs outline-none transition text-left flex items-center justify-between cursor-pointer group"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 bg-[#635BFF]/10 text-[#8B83FF] rounded-lg group-hover:bg-[#635BFF]/20 transition">
                      <Bot size={14} />
                    </div>
                    <div>
                      <div className="font-bold text-xs text-gray-200">Agent Studio</div>
                      <div className="text-[9.5px] text-gray-500 mt-0.5">构建和发布智能 Agents</div>
                    </div>
                  </div>
                  <ChevronRight size={12} className="text-gray-500 group-hover:text-white transition" />
                </button>

                <button
                  type="button"
                  onClick={() => navigate('/devhub')}
                  className="w-full bg-[#1A1C2C] border border-[#22253E] hover:border-[#635BFF]/60 hover:bg-[#1C1D3A] text-white rounded-xl p-3.5 text-xs outline-none transition text-left flex items-center justify-between cursor-pointer group"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-lg group-hover:bg-indigo-500/20 transition">
                      <Terminal size={14} />
                    </div>
                    <div>
                      <div className="font-bold text-xs text-gray-200">Dev Hub</div>
                      <div className="text-[9.5px] text-gray-500 mt-0.5">静态安全校验与自动分账 SDK</div>
                    </div>
                  </div>
                  <ChevronRight size={12} className="text-gray-500 group-hover:text-white transition" />
                </button>
              </div>
            </div>
          </Card>

          {/* Contract Addresses */}
          <Card className="mt-6">
            <div className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <Bot size={14} className="text-[#635BFF]" />
                <span className="text-xs font-bold text-white">Testnet 合约地址</span>
              </div>
              <ContractList />
            </div>
          </Card>

        </div>

      </div>

    </div>
  );
}

function ContractList() {
  const { contracts, loading, fetchContracts } = useContractStore();
  const [copied, setCopied] = useState('');

  useEffect(() => { fetchContracts(); }, []);

  if (loading) return <div className="text-[10px] text-gray-500">加载中...</div>;
  if (!contracts.length) return <div className="text-[10px] text-gray-500">暂无合约数据</div>;

  return (
    <div className="space-y-1.5">
      {contracts.map((c) => (
        <div key={c.contract_name} className="flex items-center justify-between text-[10px] p-1.5 hover:bg-[#1A1C2C] rounded transition">
          <span className="text-gray-400 font-mono w-28 shrink-0">{c.contract_name}</span>
          <code className="text-[#8B83FF] font-mono truncate mx-2 flex-1 text-right">{c.address.substring(0,12)}...{c.address.substring(c.address.length-8)}</code>
          <button onClick={() => { navigator.clipboard.writeText(c.address); setCopied(c.contract_name); setTimeout(()=>setCopied(''),2000); }}
            className="p-1 hover:bg-[#22253E] rounded text-gray-500 hover:text-white shrink-0">
            {copied === c.contract_name ? <CheckCircle2 size={12} className="text-emerald-400" /> : <Copy size={12} />}
          </button>
        </div>
      ))}
    </div>
  );
}
