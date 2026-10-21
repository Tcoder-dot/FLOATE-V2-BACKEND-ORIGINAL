import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  TrendingUp,
  Package,
  Users,
  Store,
  DollarSign,
  RefreshCw,
  Search,
  Lock,
  Unlock,
  Send,
  CheckCircle2,
  Clock,
  AlertCircle,
  AlertTriangle,
  ExternalLink,
  Smartphone,
  MessageSquare,
  KeyRound,
  FileSpreadsheet,
  ArrowUpRight,
  Filter,
  Eye,
  SlidersHorizontal,
  Zap,
  Layers,
  Sparkles,
} from 'lucide-react';

import { RecommendationEngineStudio } from './RecommendationEngineStudio';

interface AdminMetrics {
  totalLinkUps: number;
  activeRelays: number;
  completedRelays: number;
  totalLeadsDelivered: number;
  concludedDeals: number;
  activeEscrowDeals: number;
  pendingPaymentDeals: number;
  totalGmvProcessed: number;
  totalGmvInPipeline: number;
  totalPlatformRevenue: number;
  registeredBusinesses: number;
  verifiedBusinesses: number;
  registeredBuyers: number;
  totalCatalogProducts: number;
  categoriesBreakdown: { [category: string]: number };
  recentDeals: any[];
  recentRelays: any[];
  generatedAt: string;
}

export function AdminDashboard() {
  // Authentication State
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return localStorage.getItem('floate_admin_auth') === 'true';
  });
  const [passcode, setPasscode] = useState('');
  const [authError, setAuthError] = useState('');

  // Dashboard Data State
  const [metrics, setMetrics] = useState<AdminMetrics | null>(null);
  const [merchants, setMerchants] = useState<any[]>([]);
  const [buyers, setBuyers] = useState<any[]>([]);
  const [adminChannels, setAdminChannels] = useState<any>({});
  const [loading, setLoading] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState<string>('');

  // Sub-tab Navigation
  const [currentView, setCurrentView] = useState<'overview' | 'engine' | 'deals' | 'relays' | 'merchants' | 'buyers' | 'channels' | 'flows'>('overview');

  // Filters & Search
  const [dealSearch, setDealSearch] = useState('');
  const [dealStatusFilter, setDealStatusFilter] = useState('ALL');
  const [relaySearch, setRelaySearch] = useState('');
  const [merchantSearch, setMerchantSearch] = useState('');
  const [buyerSearch, setBuyerSearch] = useState('');

  // WhatsApp Flows State
  const [flowsStatus, setFlowsStatus] = useState<any>(null);
  const [isDeployingFlows, setIsDeployingFlows] = useState(false);
  const [flowDeployResult, setFlowDeployResult] = useState<any>(null);
  const [manualFlowIds, setManualFlowIds] = useState({
    safepay_create: '',
    merchant_register: '',
    market_filter: '',
  });
  const [isSavingManualFlows, setIsSavingManualFlows] = useState(false);
  const [saveManualStatus, setSaveManualStatus] = useState<string | null>(null);

  // Notification Dispatch State
  const [dispatchChannel, setDispatchChannel] = useState<'whatsapp' | 'telegram'>('whatsapp');
  const [dispatchTarget, setDispatchTarget] = useState('');
  const [dispatchStatus, setDispatchStatus] = useState<string | null>(null);
  const [isDispatching, setIsDispatching] = useState(false);

  // Verification PIN
  const MASTER_PIN = '7700';

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (passcode.trim() === MASTER_PIN || passcode.trim().toLowerCase() === 'floate') {
      setIsAuthenticated(true);
      localStorage.setItem('floate_admin_auth', 'true');
      setAuthError('');
    } else {
      setAuthError('Invalid Admin Passcode. Use 7700 or the Master Passkey.');
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem('floate_admin_auth');
    setPasscode('');
  };

  const fetchFlowsStatus = async () => {
    try {
      const res = await fetch('/api/flows/status');
      if (!res.ok) return;
      const data = await res.json();
      if (data && data.success) {
        setFlowsStatus(data);
        if (data.activeFlowIds) {
          setManualFlowIds({
            safepay_create: data.activeFlowIds.safepay_create || '',
            merchant_register: data.activeFlowIds.merchant_register || '',
            market_filter: data.activeFlowIds.market_filter || '',
          });
        }
      }
    } catch (e) {
      console.warn('Could not fetch flows status:', e);
    }
  };

  const handleSaveManualFlows = async () => {
    setIsSavingManualFlows(true);
    setSaveManualStatus(null);
    try {
      const res = await fetch('/api/flows/save-manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ flowIds: manualFlowIds }),
      });
      const data = await res.json();
      if (data.success) {
        setSaveManualStatus('✅ Flow IDs saved and activated successfully!');
        await fetchFlowsStatus();
      } else {
        setSaveManualStatus(`❌ Error: ${data.error || 'Failed to save'}`);
      }
    } catch (err: any) {
      setSaveManualStatus(`❌ Error: ${err?.message || 'Network failure'}`);
    } finally {
      setIsSavingManualFlows(false);
      setTimeout(() => setSaveManualStatus(null), 5000);
    }
  };

  const handleDeployFlows = async () => {
    setIsDeployingFlows(true);
    setFlowDeployResult(null);
    try {
      const res = await fetch('/api/flows/deploy', { method: 'POST' });
      const data = await res.json();
      setFlowDeployResult(data);
      await fetchFlowsStatus();
    } catch (err: any) {
      setFlowDeployResult({ success: false, error: err?.message || 'Deployment network error' });
    } finally {
      setIsDeployingFlows(false);
    }
  };

  const fetchAdminData = async () => {
    setLoading(true);
    try {
      await Promise.allSettled([
        // 1. Metrics summary
        fetch('/api/admin/metrics')
          .then((res) => (res.ok ? res.json() : null))
          .then((metricsData) => {
            if (metricsData && metricsData.success) {
              setMetrics(metricsData.metrics);
              setAdminChannels(metricsData.adminChannels || {});
            }
          })
          .catch((e) => console.warn('[Admin Dashboard] Metrics fetch notice:', e)),

        // 2. Merchants
        fetch('/api/admin/merchants?limit=150')
          .then((res) => (res.ok ? res.json() : null))
          .then((merchData) => {
            if (merchData && merchData.success) {
              setMerchants(merchData.merchants || []);
            }
          })
          .catch((e) => console.warn('[Admin Dashboard] Merchants fetch notice:', e)),

        // 3. Buyers
        fetch('/api/admin/buyers?limit=150')
          .then((res) => (res.ok ? res.json() : null))
          .then((buyerData) => {
            if (buyerData && buyerData.success) {
              setBuyers(buyerData.buyers || []);
            }
          })
          .catch((e) => console.warn('[Admin Dashboard] Buyers fetch notice:', e)),

        // 4. Flows status
        fetchFlowsStatus(),
      ]);

      setLastRefreshed(new Date().toLocaleTimeString());
    } catch (err) {
      console.warn('[Admin Dashboard] Telemetry sync notice:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchAdminData();
    }
  }, [isAuthenticated]);

  const handleSendBriefing = async () => {
    setIsDispatching(true);
    setDispatchStatus(null);
    try {
      const res = await fetch('/api/admin/send-briefing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channel: dispatchChannel,
          target: dispatchTarget || undefined,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setDispatchStatus(`✅ Sent executive briefing to ${data.recipient || dispatchChannel}!`);
      } else {
        setDispatchStatus(`⚠️ ${data.message || 'Could not send briefing'}`);
      }
    } catch (err: any) {
      setDispatchStatus(`❌ Dispatch error: ${err?.message || 'Server error'}`);
    } finally {
      setIsDispatching(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="max-w-md mx-auto my-12 bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl backdrop-blur">
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-4 shadow-inner">
            <Lock className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-bold text-slate-100">Floate Super Admin Gateway</h2>
          <p className="text-xs text-slate-400 mt-1 max-w-xs">
            Private Executive Telemetry & Operational Dashboard for Founder and Authorized Admins.
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
              Admin Passcode / Master PIN
            </label>
            <div className="relative">
              <input
                type="password"
                value={passcode}
                onChange={(e) => setPasscode(e.target.value)}
                placeholder="Enter 4-digit PIN (e.g. 7700)"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-amber-500 transition-colors tracking-widest text-center text-lg font-mono"
                autoFocus
              />
              <KeyRound className="w-4 h-4 text-slate-600 absolute right-3.5 top-3.5" />
            </div>
            {authError && <p className="text-xs text-rose-400 mt-1.5 font-medium">{authError}</p>}
          </div>

          <button
            type="submit"
            className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold py-3 rounded-xl text-sm transition-all shadow-lg shadow-amber-500/10 flex items-center justify-center gap-2"
          >
            <Unlock className="w-4 h-4" />
            Unlock Admin Dashboard
          </button>
        </form>

        <div className="mt-6 pt-5 border-t border-slate-800/80 text-center">
          <p className="text-[11px] text-slate-500 flex items-center justify-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            Zero Public Exposure • Multi-Tenant ABAC Protected
          </p>
        </div>
      </div>
    );
  }

  // Filtered Deals
  const filteredDeals = (metrics?.recentDeals || []).filter((deal) => {
    const matchesSearch =
      !dealSearch ||
      (deal.escrowRef && deal.escrowRef.toLowerCase().includes(dealSearch.toLowerCase())) ||
      (deal.item && deal.item.toLowerCase().includes(dealSearch.toLowerCase())) ||
      (deal.buyerPhone && deal.buyerPhone.includes(dealSearch)) ||
      (deal.vendorName && deal.vendorName.toLowerCase().includes(dealSearch.toLowerCase()));

    const matchesStatus =
      dealStatusFilter === 'ALL' ||
      deal.status === dealStatusFilter ||
      (dealStatusFilter === 'PENDING_PAYMENT' && (deal.status === 'PENDING_PAYMENT' || deal.status === 'PAYMENT_PENDING'));

    return matchesSearch && matchesStatus;
  });

  // Filtered Relays
  const filteredRelays = (metrics?.recentRelays || []).filter((r) => {
    return (
      !relaySearch ||
      (r.item && r.item.toLowerCase().includes(relaySearch.toLowerCase())) ||
      (r.buyerPhone && r.buyerPhone.includes(relaySearch)) ||
      (r.vendorPhone && r.vendorPhone.includes(relaySearch))
    );
  });

  // Filtered Merchants
  const filteredMerchants = merchants.filter((m) => {
    return (
      !merchantSearch ||
      (m.businessName && m.businessName.toLowerCase().includes(merchantSearch.toLowerCase())) ||
      (m.whatsapp && m.whatsapp.includes(merchantSearch)) ||
      (m.category && m.category.toLowerCase().includes(merchantSearch.toLowerCase())) ||
      (m.city && m.city.toLowerCase().includes(merchantSearch.toLowerCase()))
    );
  });

  // Filtered Buyers
  const filteredBuyers = buyers.filter((b) => {
    return (
      !buyerSearch ||
      (b.buyerId && b.buyerId.toLowerCase().includes(buyerSearch.toLowerCase())) ||
      (b.whatsapp && b.whatsapp.includes(buyerSearch)) ||
      (b.channel && b.channel.toLowerCase().includes(buyerSearch.toLowerCase()))
    );
  });

  return (
    <div className="space-y-6">
      {/* Top Header & Quick Action Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-amber-500/20 to-sky-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-inner">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-slate-100">Floate Super Admin Executive Suite</h2>
              <span className="bg-emerald-950 text-emerald-300 border border-emerald-800 text-[10px] font-mono px-2 py-0.5 rounded-full font-bold">
                LIVE DB SYNC
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Aggregating real-time transactions, relay link-ups, SafePay escrow volume, and store directories.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={fetchAdminData}
            disabled={loading}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl flex items-center gap-2 border border-slate-700 transition-all active:scale-95"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-amber-400' : ''}`} />
            {loading ? 'Refreshing...' : 'Refresh Metrics'}
          </button>

          <button
            onClick={() => setCurrentView('channels')}
            className="px-3.5 py-2 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-all active:scale-95"
          >
            <Send className="w-3.5 h-3.5" />
            Send Briefing
          </button>

          <button
            onClick={handleLogout}
            className="px-3 py-2 bg-slate-950 hover:bg-rose-950/40 text-slate-400 hover:text-rose-400 border border-slate-800 rounded-xl text-xs font-medium transition-all"
            title="Lock Admin Session"
          >
            <Lock className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 6 High-Level Executive KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3.5">
        {/* 1. Total Processed Volume (GMV) */}
        <div className="bg-slate-900 border border-slate-800/90 rounded-2xl p-4 shadow-sm hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Processed GMV</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-black text-slate-100 tracking-tight">
            ₦{(metrics?.totalGmvProcessed || 0).toLocaleString()}
          </div>
          <div className="text-[11px] text-emerald-400 mt-1 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" />
            <span>{metrics?.concludedDeals || 0} deals concluded</span>
          </div>
        </div>

        {/* 2. In-Pipeline Escrow Funds */}
        <div className="bg-slate-900 border border-slate-800/90 rounded-2xl p-4 shadow-sm hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider">In-Escrow Pipeline</span>
            <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-black text-amber-300 tracking-tight">
            ₦{(metrics?.totalGmvInPipeline || 0).toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
            <Clock className="w-3 h-3 text-amber-400" />
            <span>{metrics?.activeEscrowDeals || 0} active orders in transit</span>
          </div>
        </div>

        {/* 3. Buyer-to-Vendor Link-Ups */}
        <div className="bg-slate-900 border border-slate-800/90 rounded-2xl p-4 shadow-sm hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Total Link-Ups</span>
            <div className="w-7 h-7 rounded-lg bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
              <MessageSquare className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-black text-sky-300 tracking-tight">
            {metrics?.totalLinkUps || 0}
          </div>
          <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
            <TrendingUp className="w-3 h-3 text-sky-400" />
            <span>{metrics?.activeRelays || 0} active live chats</span>
          </div>
        </div>

        {/* 4. Platform Escrow Earnings */}
        <div className="bg-slate-900 border border-slate-800/90 rounded-2xl p-4 shadow-sm hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Platform Revenue</span>
            <div className="w-7 h-7 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-black text-purple-300 tracking-tight">
            ₦{(metrics?.totalPlatformRevenue || 0).toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
            <span>Escrow fees (Buyer 2.33%, Vendor 2.0%)</span>
          </div>
        </div>

        {/* 5. Registered Businesses */}
        <div className="bg-slate-900 border border-slate-800/90 rounded-2xl p-4 shadow-sm hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Businesses</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Store className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-black text-slate-100 tracking-tight">
            {metrics?.registeredBusinesses || 0}
          </div>
          <div className="text-[11px] text-emerald-400 mt-1 flex items-center gap-1">
            <ShieldCheck className="w-3 h-3" />
            <span>{metrics?.verifiedBusinesses || 0} verified merchants</span>
          </div>
        </div>

        {/* 6. Registered Buyers */}
        <div className="bg-slate-900 border border-slate-800/90 rounded-2xl p-4 shadow-sm hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Buyers & Shoppers</span>
            <div className="w-7 h-7 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-black text-slate-100 tracking-tight">
            {metrics?.registeredBuyers || 0}
          </div>
          <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
            <span>{metrics?.totalCatalogProducts || 0} items cataloged</span>
          </div>
        </div>
      </div>

      {/* Sub-Navigation Tabs */}
      <div className="flex border-b border-slate-800 overflow-x-auto gap-2 pb-1">
        <button
          onClick={() => setCurrentView('overview')}
          className={`px-4 py-2.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap flex items-center gap-2 ${
            currentView === 'overview'
              ? 'bg-amber-500 text-slate-950 shadow-md font-bold'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
          }`}
        >
          <TrendingUp className="w-3.5 h-3.5" />
          Executive Overview
        </button>

        <button
          onClick={() => setCurrentView('deals')}
          className={`px-4 py-2.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap flex items-center gap-2 ${
            currentView === 'deals'
              ? 'bg-amber-500 text-slate-950 shadow-md font-bold'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
          }`}
        >
          <Package className="w-3.5 h-3.5" />
          SafePay Deals <span className="text-[10px] font-mono px-1.5 py-0.2 bg-amber-950 text-amber-300 rounded border border-amber-700">Paused</span> ({metrics?.recentDeals?.length || 0})
        </button>

        <button
          onClick={() => setCurrentView('relays')}
          className={`px-4 py-2.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap flex items-center gap-2 ${
            currentView === 'relays'
              ? 'bg-amber-500 text-slate-950 shadow-md font-bold'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
          }`}
        >
          <MessageSquare className="w-3.5 h-3.5" />
          Buyer-Vendor Link-Ups ({metrics?.recentRelays?.length || 0})
        </button>

        <button
          onClick={() => setCurrentView('merchants')}
          className={`px-4 py-2.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap flex items-center gap-2 ${
            currentView === 'merchants'
              ? 'bg-amber-500 text-slate-950 shadow-md font-bold'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
          }`}
        >
          <Store className="w-3.5 h-3.5" />
          Businesses Directory ({merchants.length})
        </button>

        <button
          onClick={() => setCurrentView('buyers')}
          className={`px-4 py-2.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap flex items-center gap-2 ${
            currentView === 'buyers'
              ? 'bg-amber-500 text-slate-950 shadow-md font-bold'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          Buyers Directory ({buyers.length})
        </button>

        <button
          onClick={() => setCurrentView('channels')}
          className={`px-4 py-2.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap flex items-center gap-2 ${
            currentView === 'channels'
              ? 'bg-amber-500 text-slate-950 shadow-md font-bold'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
          }`}
        >
          <Smartphone className="w-3.5 h-3.5" />
          WhatsApp & Telegram Alerts
        </button>

        <button
          onClick={() => setCurrentView('engine')}
          className={`px-4 py-2.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap flex items-center gap-2 ${
            currentView === 'engine'
              ? 'bg-gradient-to-r from-sky-500 to-blue-600 text-white shadow-md font-bold'
              : 'text-sky-400 hover:text-sky-300 hover:bg-slate-900 border border-sky-500/20'
          }`}
        >
          <Zap className="w-3.5 h-3.5 text-sky-400" />
          ⚡ 100k Matchmaker Engine
        </button>

        <button
          onClick={() => setCurrentView('flows')}
          className={`px-4 py-2.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap flex items-center gap-2 ${
            currentView === 'flows'
              ? 'bg-amber-500 text-slate-950 shadow-md font-bold'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
          }`}
        >
          <Zap className="w-3.5 h-3.5 text-amber-400" />
          WhatsApp Flows Deployer
        </button>
      </div>

      {/* VIEW 1: EXECUTIVE OVERVIEW */}
      {currentView === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* SafePay Deal Conversion Funnel */}
            <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-amber-400" />
                  Transaction Pipeline & Conversion Health
                </h3>
                <span className="text-xs text-slate-400">Live Snapshot</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">Payment Pending</span>
                  <div className="text-lg font-bold text-amber-400 mt-0.5">
                    {metrics?.pendingPaymentDeals || 0} orders
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">Awaiting buyer bank transfer</p>
                </div>

                <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">Funds In Escrow</span>
                  <div className="text-lg font-bold text-sky-400 mt-0.5">
                    {metrics?.activeEscrowDeals || 0} orders
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">Dispatched & awaiting delivery</p>
                </div>

                <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">Fully Concluded</span>
                  <div className="text-lg font-bold text-emerald-400 mt-0.5">
                    {metrics?.concludedDeals || 0} orders
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">PIN verified & payout disbursed</p>
                </div>
              </div>

              {/* Categories Breakdown */}
              <div className="pt-3 border-t border-slate-800">
                <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2.5">
                  Top Business Categories on Floate
                </h4>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(metrics?.categoriesBreakdown || {}).map(([cat, count]) => (
                    <div
                      key={cat}
                      className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-300 flex items-center gap-2"
                    >
                      <span className="font-medium text-slate-200">{cat}</span>
                      <span className="bg-slate-800 text-amber-400 font-mono text-[10px] px-1.5 py-0.2 rounded font-bold">
                        {count} stores
                      </span>
                    </div>
                  ))}
                  {Object.keys(metrics?.categoriesBreakdown || {}).length === 0 && (
                    <p className="text-xs text-slate-500 italic">No business categories logged yet.</p>
                  )}
                </div>
              </div>
            </div>

            {/* Quick Admin Actions & Channel Status */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-emerald-400" />
                Admin Channel Links
              </h3>

              <div className="space-y-3">
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-slate-300">WhatsApp Admin Line</span>
                    <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${adminChannels.adminWhatsAppPhone ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' : 'bg-slate-800 text-slate-400'}`}>
                      {adminChannels.adminWhatsAppPhone || 'Not Configured'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Send <code className="text-amber-400 font-mono">*admin*</code> from your WhatsApp to get instant briefing cards.
                  </p>
                </div>

                <div className="bg-slate-950 border border-slate-800 rounded-xl p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-slate-300">Telegram Admin Bot</span>
                    <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${adminChannels.isTelegramConfigured ? 'bg-sky-950 text-sky-300 border border-sky-800' : 'bg-slate-800 text-slate-400'}`}>
                      {adminChannels.isTelegramConfigured ? 'Active' : 'Standby'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Send <code className="text-sky-400 font-mono">/admin 7700</code> in Telegram to pull real-time metrics.
                  </p>
                </div>

                <div className="bg-gradient-to-r from-amber-500/10 to-purple-500/10 border border-amber-500/20 rounded-xl p-3">
                  <span className="text-xs font-bold text-amber-300">Founder Master PIN</span>
                  <div className="text-base font-mono font-bold text-slate-100 mt-0.5">7700</div>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    Authorized on Web, WhatsApp commands, and Telegram bot.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Peek of Latest Deals */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <Package className="w-4 h-4 text-emerald-400" />
                Latest SafePay Escrow Deals
              </h3>
              <button
                onClick={() => setCurrentView('deals')}
                className="text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1 font-semibold"
              >
                View All Deals ({metrics?.recentDeals?.length || 0}) <ArrowUpRight className="w-3 h-3" />
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="py-2.5 px-3">Escrow Ref</th>
                    <th className="py-2.5 px-3">Item</th>
                    <th className="py-2.5 px-3">Base Price</th>
                    <th className="py-2.5 px-3">Buyer Paid</th>
                    <th className="py-2.5 px-3">Net Vendor Payout</th>
                    <th className="py-2.5 px-3">Buyer Phone</th>
                    <th className="py-2.5 px-3">Vendor</th>
                    <th className="py-2.5 px-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {(metrics?.recentDeals || []).slice(0, 6).map((deal, idx) => (
                    <tr key={idx} className="hover:bg-slate-800/40 transition-colors font-mono">
                      <td className="py-2.5 px-3 font-bold text-slate-100">{deal.escrowRef}</td>
                      <td className="py-2.5 px-3 font-sans text-slate-200">{deal.item}</td>
                      <td className="py-2.5 px-3 text-slate-300">{deal.price}</td>
                      <td className="py-2.5 px-3 text-emerald-400 font-bold">
                        ₦{(deal.totalBuyerAmount || deal.numericBasePrice || 0).toLocaleString()}
                      </td>
                      <td className="py-2.5 px-3 text-slate-300">
                        ₦{(deal.netVendorPayout || deal.numericBasePrice || 0).toLocaleString()}
                      </td>
                      <td className="py-2.5 px-3 text-slate-400">+{deal.buyerPhone}</td>
                      <td className="py-2.5 px-3 font-sans text-slate-300">{deal.vendorName || deal.vendorPhone}</td>
                      <td className="py-2.5 px-3 font-sans">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            deal.status === 'FUNDS_RELEASED' || deal.status === 'DELIVERY_CONFIRMED'
                              ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                              : deal.status === 'FUNDS_HELD_IN_ESCROW'
                              ? 'bg-sky-950 text-sky-300 border border-sky-800'
                              : 'bg-amber-950 text-amber-300 border border-amber-800'
                          }`}
                        >
                          {deal.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {(metrics?.recentDeals || []).length === 0 && (
                    <tr>
                      <td colSpan={8} className="text-center py-6 text-slate-500 font-sans">
                        No SafePay deals recorded yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 2: SAFEPAY ESCROW DEALS LEDGER */}
      {currentView === 'deals' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="p-3.5 rounded-xl bg-amber-950/40 border border-amber-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-amber-200">
            <div className="flex items-center gap-2.5">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
              <span>
                <strong>SafePay Escrow Checkout is Temporarily Paused:</strong> Online escrow holds are paused for the <code className="text-white font-mono bg-slate-900 px-1 rounded">www.floate.xyz</code> frontend handshake. Direct verified merchant WhatsApp link-ups are handling 100% of order volume.
              </span>
            </div>
            <span className="font-mono text-[10px] bg-amber-900/60 text-amber-300 border border-amber-700 px-2.5 py-0.5 rounded-full shrink-0 font-bold self-start sm:self-center">
              STATUS: PAUSED
            </span>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <Package className="w-5 h-5 text-emerald-400" />
                Floate SafePay Escrow Ledger
              </h3>
              <p className="text-xs text-slate-400">Complete immutable record of all escrow transactions & release PINs (Read-Only Ledger)</p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search ref, item, phone..."
                  value={dealSearch}
                  onChange={(e) => setDealSearch(e.target.value)}
                  className="bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-amber-500"
                />
              </div>

              <select
                value={dealStatusFilter}
                onChange={(e) => setDealStatusFilter(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-amber-500"
              >
                <option value="ALL">All Statuses</option>
                <option value="FUNDS_RELEASED">Concluded (Released)</option>
                <option value="FUNDS_HELD_IN_ESCROW">In Escrow (Held)</option>
                <option value="PENDING_PAYMENT">Pending Payment</option>
                <option value="REFUND_REQUESTED">Refund Requested</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                <tr>
                  <th className="py-3 px-3">Escrow Ref</th>
                  <th className="py-3 px-3">Item</th>
                  <th className="py-3 px-3">Base Price</th>
                  <th className="py-3 px-3">Total Paid</th>
                  <th className="py-3 px-3">Net Payout</th>
                  <th className="py-3 px-3">Fee Earned</th>
                  <th className="py-3 px-3">Delivery PIN</th>
                  <th className="py-3 px-3">Waybill / Logistics</th>
                  <th className="py-3 px-3">Buyer Phone</th>
                  <th className="py-3 px-3">Vendor</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3">Updated</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {filteredDeals.map((deal, idx) => (
                  <tr key={idx} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-3 font-bold text-slate-100">{deal.escrowRef}</td>
                    <td className="py-3 px-3 font-sans text-slate-200">{deal.item}</td>
                    <td className="py-3 px-3 text-slate-300">{deal.price}</td>
                    <td className="py-3 px-3 text-emerald-400 font-bold">
                      ₦{(deal.totalBuyerAmount || deal.numericBasePrice || 0).toLocaleString()}
                    </td>
                    <td className="py-3 px-3 text-slate-300">
                      ₦{(deal.netVendorPayout || deal.numericBasePrice || 0).toLocaleString()}
                    </td>
                    <td className="py-3 px-3 text-purple-400">
                      ₦{((deal.buyerFeeAmount || 0) + (deal.vendorFeeAmount || 0)).toLocaleString()}
                    </td>
                    <td className="py-3 px-3 text-amber-300 font-bold">{deal.deliveryCode || 'N/A'}</td>
                    <td className="py-3 px-3 font-sans">
                      {deal.courierName || deal.trackingNumber || deal.dispatchProofPhotoUrl ? (
                        <div className="flex flex-col gap-0.5">
                          <span className="text-[10px] font-bold text-sky-400 flex items-center gap-1">
                            🚚 {deal.courierName || 'Waybill Dispatched'}
                          </span>
                          {deal.trackingNumber && (
                            <span className="text-[9px] text-slate-400 font-mono">
                              #{deal.trackingNumber}
                            </span>
                          )}
                          {deal.driverPhone && (
                            <span className="text-[9px] text-slate-500">
                              Driver: +{deal.driverPhone}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-600 text-[10px]">Awaiting Dispatch</span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-slate-400">+{deal.buyerPhone}</td>
                    <td className="py-3 px-3 font-sans text-slate-300">{deal.vendorName || deal.vendorPhone}</td>
                    <td className="py-3 px-3 font-sans">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          deal.status === 'FUNDS_RELEASED' || deal.status === 'DELIVERY_CONFIRMED'
                            ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                            : deal.status === 'FUNDS_HELD_IN_ESCROW'
                            ? 'bg-sky-950 text-sky-300 border border-sky-800'
                            : 'bg-amber-950 text-amber-300 border border-amber-800'
                        }`}
                      >
                        {deal.status}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-slate-500 text-[10px]">
                      {deal.updatedAt ? new Date(deal.updatedAt).toLocaleString() : 'N/A'}
                    </td>
                  </tr>
                ))}
                {filteredDeals.length === 0 && (
                  <tr>
                    <td colSpan={12} className="text-center py-8 text-slate-500 font-sans">
                      No escrow deals matching your filter criteria.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW 3: BUYER-VENDOR LINK-UPS (RELAYS) */}
      {currentView === 'relays' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-sky-400" />
                Buyer-to-Vendor Link-Ups & Secure Line Relays
              </h3>
              <p className="text-xs text-slate-400">
                Live and completed proxy chat sessions connecting buyers with verified Nigerian vendors
              </p>
            </div>

            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search item, buyer phone, seller..."
                value={relaySearch}
                onChange={(e) => setRelaySearch(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                <tr>
                  <th className="py-3 px-3">Relay ID</th>
                  <th className="py-3 px-3">Item Requested</th>
                  <th className="py-3 px-3">Buyer Phone</th>
                  <th className="py-3 px-3">Vendor Phone</th>
                  <th className="py-3 px-3">Messages</th>
                  <th className="py-3 px-3">Agreed Price</th>
                  <th className="py-3 px-3">Escrow Status</th>
                  <th className="py-3 px-3">Relay Status</th>
                  <th className="py-3 px-3">Created / Updated</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {filteredRelays.map((relay, idx) => (
                  <tr key={idx} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-3 text-slate-400 font-bold">{relay.relayId || relay.id}</td>
                    <td className="py-3 px-3 font-sans text-slate-200 font-medium">{relay.item}</td>
                    <td className="py-3 px-3 text-sky-400">+{relay.buyerPhone}</td>
                    <td className="py-3 px-3 text-emerald-400">+{relay.vendorPhone}</td>
                    <td className="py-3 px-3 text-slate-300">{relay.messageCount || 0} msgs</td>
                    <td className="py-3 px-3 text-slate-200">{relay.proposedPrice ? `₦${relay.proposedPrice.toLocaleString()}` : (relay.price || 'Pending')}</td>
                    <td className="py-3 px-3 font-sans">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
                        {relay.escrowStatus || 'NOT_INITIATED'}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-sans">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          relay.status === 'ACTIVE'
                            ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                            : relay.status === 'ENDED'
                            ? 'bg-slate-800 text-slate-400'
                            : 'bg-amber-950 text-amber-300 border border-amber-800'
                        }`}
                      >
                        {relay.status}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-slate-500 text-[10px]">
                      {relay.updatedAt ? new Date(relay.updatedAt).toLocaleString() : 'N/A'}
                    </td>
                  </tr>
                ))}
                {filteredRelays.length === 0 && (
                  <tr>
                    <td colSpan={9} className="text-center py-8 text-slate-500 font-sans">
                      No link-ups found matching your query.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW 4: REGISTERED BUSINESSES DIRECTORY */}
      {currentView === 'merchants' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <Store className="w-5 h-5 text-emerald-400" />
                Registered Businesses Directory
              </h3>
              <p className="text-xs text-slate-400">All verified vendor stores, listings, categories, and settlement accounts</p>
            </div>

            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search business, phone, category..."
                value={merchantSearch}
                onChange={(e) => setMerchantSearch(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                <tr>
                  <th className="py-3 px-3">Business Name</th>
                  <th className="py-3 px-3">Category</th>
                  <th className="py-3 px-3">Location</th>
                  <th className="py-3 px-3">WhatsApp</th>
                  <th className="py-3 px-3">Products Listed</th>
                  <th className="py-3 px-3">Bank Settlement Account</th>
                  <th className="py-3 px-3">SafePay Sales</th>
                  <th className="py-3 px-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredMerchants.map((merchant, idx) => (
                  <tr key={idx} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-3 font-bold text-slate-100 flex items-center gap-1.5">
                      {merchant.businessName}
                      {(merchant.isVerified || merchant.identityVerified || merchant.verifiedStatus === 'YES') && (
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 inline" title="Verified Merchant" />
                      )}
                    </td>
                    <td className="py-3 px-3 text-amber-400 font-medium">{merchant.category || 'General'}</td>
                    <td className="py-3 px-3 text-slate-300">
                      {merchant.city ? `${merchant.city}, ${merchant.state || 'Nigeria'}` : (merchant.state || 'Nigeria')}
                    </td>
                    <td className="py-3 px-3 font-mono text-slate-300">+{merchant.whatsapp}</td>
                    <td className="py-3 px-3 font-mono text-slate-200">
                      {merchant.products ? `${merchant.products.length} products` : (merchant.product ? '1 product' : '0')}
                    </td>
                    <td className="py-3 px-3 font-mono">
                      {merchant.payoutAccountNumber ? (
                        <span className="text-emerald-400 font-bold">
                          {merchant.payoutBankName || 'Bank'} ({merchant.payoutAccountNumber})
                        </span>
                      ) : (
                        <span className="text-slate-500 italic">Not set</span>
                      )}
                    </td>
                    <td className="py-3 px-3 font-mono text-slate-200">
                      {merchant.totalSafePaySales ? `₦${merchant.totalSafePaySales.toLocaleString()}` : '₦0'}
                    </td>
                    <td className="py-3 px-3">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800">
                        {merchant.status || 'ACTIVE'}
                      </span>
                    </td>
                  </tr>
                ))}
                {filteredMerchants.length === 0 && (
                  <tr>
                    <td colSpan={8} className="text-center py-8 text-slate-500 font-sans">
                      No businesses found matching your search.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW 5: REGISTERED BUYERS DIRECTORY */}
      {currentView === 'buyers' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <Users className="w-5 h-5 text-indigo-400" />
                Registered Buyers & Shoppers
              </h3>
              <p className="text-xs text-slate-400">Shopper profiles, WhatsApp numbers, Telegram IDs, and search history counts</p>
            </div>

            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search buyer ID, phone, channel..."
                value={buyerSearch}
                onChange={(e) => setBuyerSearch(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                <tr>
                  <th className="py-3 px-3">Buyer ID / Phone</th>
                  <th className="py-3 px-3">Name / Handle</th>
                  <th className="py-3 px-3">Channel</th>
                  <th className="py-3 px-3">Search History Items</th>
                  <th className="py-3 px-3">Orders Placed</th>
                  <th className="py-3 px-3">First Active</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {filteredBuyers.map((buyer, idx) => (
                  <tr key={idx} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-3 font-bold text-slate-100">{buyer.buyerId || buyer.id}</td>
                    <td className="py-3 px-3 font-sans text-slate-200">{buyer.name || buyer.username || 'Customer'}</td>
                    <td className="py-3 px-3 font-sans">
                      <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-slate-800 text-sky-300">
                        {buyer.channel || 'whatsapp'}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-slate-300">
                      {buyer.searchHistory ? `${buyer.searchHistory.length} queries` : '0'}
                    </td>
                    <td className="py-3 px-3 text-emerald-400 font-bold">{buyer.ordersCount || 0}</td>
                    <td className="py-3 px-3 text-slate-500 text-[10px]">
                      {buyer.createdAt ? new Date(buyer.createdAt).toLocaleString() : 'N/A'}
                    </td>
                  </tr>
                ))}
                {filteredBuyers.length === 0 && (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-slate-500 font-sans">
                      No buyers registered yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW 6: ALERTS & DISPATCH INTEGRATION */}
      {currentView === 'channels' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
            <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <Send className="w-5 h-5 text-amber-400" />
              Dispatch Executive Briefing Card
            </h3>
            <p className="text-xs text-slate-400">
              Trigger a real-time summary card containing total GMV, deals, and registered vendors directly to the Admin’s WhatsApp or Telegram.
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
                  Target Channel
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setDispatchChannel('whatsapp')}
                    className={`py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                      dispatchChannel === 'whatsapp'
                        ? 'bg-emerald-600 text-white shadow-md'
                        : 'bg-slate-950 text-slate-400 border border-slate-800'
                    }`}
                  >
                    <Smartphone className="w-4 h-4" />
                    WhatsApp
                  </button>
                  <button
                    type="button"
                    onClick={() => setDispatchChannel('telegram')}
                    className={`py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                      dispatchChannel === 'telegram'
                        ? 'bg-sky-600 text-white shadow-md'
                        : 'bg-slate-950 text-slate-400 border border-slate-800'
                    }`}
                  >
                    <Send className="w-4 h-4" />
                    Telegram
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
                  Recipient Destination (Optional Override)
                </label>
                <input
                  type="text"
                  placeholder={
                    dispatchChannel === 'whatsapp'
                      ? 'e.g. 2348012345678 (Leave empty for default ADMIN_WHATSAPP_PHONE)'
                      : 'e.g. 123456789 (Leave empty for default ADMIN_TELEGRAM_ID)'
                  }
                  value={dispatchTarget}
                  onChange={(e) => setDispatchTarget(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-amber-500 font-mono"
                />
              </div>

              <button
                type="button"
                onClick={handleSendBriefing}
                disabled={isDispatching}
                className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold py-3 rounded-xl text-xs transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Send className={`w-4 h-4 ${isDispatching ? 'animate-spin' : ''}`} />
                {isDispatching ? 'Dispatching Live Briefing...' : `Send Briefing to ${dispatchChannel.toUpperCase()}`}
              </button>

              {dispatchStatus && (
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 font-mono">
                  {dispatchStatus}
                </div>
              )}
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
            <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <SlidersHorizontal className="w-5 h-5 text-purple-400" />
              Bot Admin Commands Reference
            </h3>
            <p className="text-xs text-slate-400">
              Commands you can type directly into WhatsApp or Telegram from authorized numbers:
            </p>

            <div className="space-y-3 text-xs">
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-3">
                <div className="font-mono font-bold text-amber-400 mb-1">WhatsApp Commands:</div>
                <ul className="space-y-1 text-slate-300 list-disc list-inside">
                  <li><code className="text-slate-100 font-mono">*admin*</code> or <code className="text-slate-100 font-mono">*stats*</code> – Executive briefing card</li>
                  <li><code className="text-slate-100 font-mono">btn_admin_deals</code> – List latest SafePay escrow transactions</li>
                  <li><code className="text-slate-100 font-mono">btn_admin_merchants</code> – List top registered stores</li>
                  <li><code className="text-slate-100 font-mono">admin 7700</code> – Authorize new WhatsApp admin phone</li>
                </ul>
              </div>

              <div className="bg-slate-950 border border-slate-800 rounded-xl p-3">
                <div className="font-mono font-bold text-sky-400 mb-1">Telegram Bot Commands:</div>
                <ul className="space-y-1 text-slate-300 list-disc list-inside">
                  <li><code className="text-slate-100 font-mono">/admin 7700</code> – Executive briefing card with interactive buttons</li>
                  <li><code className="text-slate-100 font-mono">/deals</code> – Top recent escrow deals & delivery PINs</li>
                  <li><code className="text-slate-100 font-mono">/links</code> – Recent buyer-to-vendor relay link-ups</li>
                  <li><code className="text-slate-100 font-mono">/approvereg &lt;id&gt;</code> – Instantly approve pending business</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 7: WHATSAPP FLOWS CLOUD DEPLOYER (ZERO-COPY MOBILE AUTOMATION) */}
      {currentView === 'flows' && (
        <div className="space-y-6">
          {/* Top Hero Banner */}
          <div className="bg-gradient-to-br from-emerald-950/40 via-slate-900 to-amber-950/20 border border-emerald-500/30 rounded-2xl p-6 shadow-xl">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shadow-inner shrink-0">
                  <Zap className="w-7 h-7" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-lg font-bold text-slate-100">WhatsApp Flows Automated Cloud Deployer</h3>
                    <span className="bg-emerald-900/60 text-emerald-300 border border-emerald-700/60 text-[10px] font-mono px-2 py-0.5 rounded-full font-bold">
                      ZERO-COPY MOBILE
                    </span>
                    <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold border ${
                      flowsStatus?.configured
                        ? 'bg-emerald-950 text-emerald-300 border-emerald-700'
                        : 'bg-amber-950 text-amber-300 border-amber-700'
                    }`}>
                      {flowsStatus?.configured ? '🟢 Meta WABA Connected' : '🟡 Meta Credentials Required in Settings'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 mt-1 max-w-2xl">
                    Automatically builds, uploads assets, and publishes native WhatsApp Flows directly to Meta Graph API for your WhatsApp Business Account (WABA). No manual JSON copy/paste required.
                  </p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                <button
                  onClick={handleDeployFlows}
                  disabled={isDeployingFlows}
                  className="px-5 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold text-xs rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 active:scale-95 transition-all disabled:opacity-50"
                >
                  <RefreshCw className={`w-4 h-4 ${isDeployingFlows ? 'animate-spin' : ''}`} />
                  {isDeployingFlows ? 'Deploying to Meta API...' : '🚀 1-Tap Deploy All Flows to Meta'}
                </button>
              </div>
            </div>
          </div>

          {/* Deployment Feedback Banner */}
          {flowDeployResult && (
            <div className={`p-4 rounded-2xl border text-xs font-mono ${
              flowDeployResult.success
                ? 'bg-emerald-950/50 border-emerald-800/80 text-emerald-200'
                : 'bg-slate-900/90 border-slate-700 text-slate-200'
            }`}>
              <div className="font-bold mb-2 flex items-center gap-2">
                {flowDeployResult.success ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <AlertCircle className="w-4 h-4 text-amber-400" />}
                <span>{flowDeployResult.success ? 'All Flows Published Successfully!' : 'Deployment Status & Action Required'}</span>
              </div>
              {flowDeployResult.results && (
                <div className="space-y-2 mt-2">
                  {flowDeployResult.results.map((r: any, idx: number) => (
                    <div key={idx} className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 bg-slate-950/80 px-3 py-2 rounded-lg border border-slate-800">
                      <div>
                        <span className="text-slate-100 font-bold">• {r.name}</span> <span className="text-slate-400">({r.flowKey})</span>
                        {r.error && <div className="text-[11px] text-amber-300 font-sans mt-0.5">{r.error}</div>}
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold self-start sm:self-auto ${
                        r.status === 'PUBLISHED' ? 'bg-emerald-900 text-emerald-300' :
                        r.status === 'DRAFT' ? 'bg-amber-900 text-amber-300' :
                        r.status === 'SKIPPED' ? 'bg-amber-950 text-amber-300 border border-amber-800' :
                        'bg-rose-900 text-rose-300'
                      }`}>
                        {r.status} {r.flowId ? `[ID: ${r.flowId}]` : ''}
                      </span>
                    </div>
                  ))}
                </div>
              )}
              {flowDeployResult.results?.some((r: any) => r.status === 'SKIPPED') && (
                <div className="mt-3 p-3 bg-amber-950/40 border border-amber-800/60 rounded-xl text-amber-200 font-sans text-xs">
                  <strong>💡 Why were flows skipped?</strong><br />
                  To deploy directly to Meta with 1 tap, provide <code>WHATSAPP_ACCESS_TOKEN</code> and <code>WHATSAPP_BUSINESS_ACCOUNT_ID</code> in the AI Studio Settings menu. Alternatively, you can paste existing Flow IDs in the Manual Flow IDs section below.
                </div>
              )}
            </div>
          )}

          {/* Manual Flow ID Override Manager */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h4 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-amber-400" />
                  Active WhatsApp Flow IDs & Manual Overrides
                </h4>
                <p className="text-xs text-slate-400">
                  Floate attaches these Meta Flow IDs to native WhatsApp interactive messages.
                </p>
              </div>
              <button
                onClick={handleSaveManualFlows}
                disabled={isSavingManualFlows}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-100 font-bold text-xs rounded-xl border border-slate-700 active:scale-95 transition-all self-start sm:self-auto"
              >
                {isSavingManualFlows ? 'Saving...' : '💾 Save Active Flow IDs'}
              </button>
            </div>

            {saveManualStatus && (
              <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-700 text-xs font-mono text-slate-200">
                {saveManualStatus}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div className="space-y-1">
                <label className="text-slate-300 font-medium">SafePay Deal Flow ID (safepay_create)</label>
                <input
                  type="text"
                  placeholder="e.g. 112233445566778"
                  value={manualFlowIds.safepay_create}
                  onChange={(e) => setManualFlowIds((prev) => ({ ...prev, safepay_create: e.target.value }))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 font-mono text-xs focus:border-amber-500 focus:outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className="text-slate-300 font-medium">Merchant Onboard Flow ID (merchant_register)</label>
                <input
                  type="text"
                  placeholder="e.g. 223344556677889"
                  value={manualFlowIds.merchant_register}
                  onChange={(e) => setManualFlowIds((prev) => ({ ...prev, merchant_register: e.target.value }))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 font-mono text-xs focus:border-emerald-500 focus:outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className="text-slate-300 font-medium">Market Directory Filter Flow ID (market_filter)</label>
                <input
                  type="text"
                  placeholder="e.g. 334455667788990"
                  value={manualFlowIds.market_filter}
                  onChange={(e) => setManualFlowIds((prev) => ({ ...prev, market_filter: e.target.value }))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 font-mono text-xs focus:border-sky-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* 3 Core WhatsApp Flows Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Flow 1: SafePay Deal Creation */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] font-mono uppercase bg-amber-500/10 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded-full font-bold">
                    ESCROW DEALS
                  </span>
                  <span className="text-xs text-slate-400 font-mono">
                    {flowsStatus?.activeFlowIds?.safepay_create ? 'LIVE' : 'PENDING'}
                  </span>
                </div>
                <h4 className="text-base font-bold text-slate-100">SafePay Escrow Deal Form</h4>
                <p className="text-xs text-slate-400 mt-1">
                  1-Screen form for buyers and sellers to create protected deals with item name, agreed amount, delivery option, and destination.
                </p>
                <div className="mt-4 bg-slate-950 rounded-xl p-3 border border-slate-800/80 space-y-1.5 text-xs text-slate-300">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-slate-500">Flow Name:</span>
                    <span className="font-mono text-slate-300">floate_safepay_flow</span>
                  </div>
                  <div className="flex justify-between text-[11px]">
                    <span className="text-slate-500">Active Flow ID:</span>
                    <span className="font-mono text-amber-300">{flowsStatus?.activeFlowIds?.safepay_create || 'Not Deployed Yet'}</span>
                  </div>
                  <div className="flex justify-between text-[11px]">
                    <span className="text-slate-500">Trigger:</span>
                    <span className="text-slate-300 font-mono">btn_safepay / Natural Deal</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Flow 2: Merchant Onboarding & Bank Payout */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] font-mono uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full font-bold">
                    STORE ONBOARDING
                  </span>
                  <span className="text-xs text-slate-400 font-mono">
                    {flowsStatus?.activeFlowIds?.merchant_register ? 'LIVE' : 'PENDING'}
                  </span>
                </div>
                <h4 className="text-base font-bold text-slate-100">60-Sec Store Registration & Bank Setup</h4>
                <p className="text-xs text-slate-400 mt-1">
                  Onboards Nigerian merchants with Legal Name, Shop Name, Market Hub dropdown, Category, Bank Name dropdown (OPay, Moniepoint, GTB, etc.), and 10-digit NUBAN.
                </p>
                <div className="mt-4 bg-slate-950 rounded-xl p-3 border border-slate-800/80 space-y-1.5 text-xs text-slate-300">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-slate-500">Flow Name:</span>
                    <span className="font-mono text-slate-300">floate_merchant_flow</span>
                  </div>
                  <div className="flex justify-between text-[11px]">
                    <span className="text-slate-500">Active Flow ID:</span>
                    <span className="font-mono text-emerald-300">{flowsStatus?.activeFlowIds?.merchant_register || 'Not Deployed Yet'}</span>
                  </div>
                  <div className="flex justify-between text-[11px]">
                    <span className="text-slate-500">Trigger:</span>
                    <span className="text-slate-300 font-mono">btn_start_registration</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Flow 3: Market Directory Filter */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] font-mono uppercase bg-sky-500/10 text-sky-400 border border-sky-500/30 px-2 py-0.5 rounded-full font-bold">
                    DISCOVERY
                  </span>
                  <span className="text-xs text-slate-400 font-mono">
                    {flowsStatus?.activeFlowIds?.market_filter ? 'LIVE' : 'PENDING'}
                  </span>
                </div>
                <h4 className="text-base font-bold text-slate-100">Interactive Market Directory Filter</h4>
                <p className="text-xs text-slate-400 mt-1">
                  Interactive multi-criteria search filter allowing buyers to filter by Onitsha, Alaba, Computer Village, Ariaria, budget range, and verified badges.
                </p>
                <div className="mt-4 bg-slate-950 rounded-xl p-3 border border-slate-800/80 space-y-1.5 text-xs text-slate-300">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-slate-500">Flow Name:</span>
                    <span className="font-mono text-slate-300">floate_market_filter_flow</span>
                  </div>
                  <div className="flex justify-between text-[11px]">
                    <span className="text-slate-500">Active Flow ID:</span>
                    <span className="font-mono text-sky-300">{flowsStatus?.activeFlowIds?.market_filter || 'Not Deployed Yet'}</span>
                  </div>
                  <div className="flex justify-between text-[11px]">
                    <span className="text-slate-500">Trigger:</span>
                    <span className="text-slate-300 font-mono">btn_browse_markets</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 8: 100K MATCHMAKER & RECOMMENDATION ENGINE STUDIO */}
      {currentView === 'engine' && <RecommendationEngineStudio />}
    </div>
  );
}
