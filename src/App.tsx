import React, { useState, useEffect } from 'react';
import { Bot, Terminal, Code2, Globe, Store, ExternalLink, Sparkles, ShieldCheck, MapPin, ShoppingBag, Zap } from 'lucide-react';
import { BotTester } from './components/BotTester';
import { ApiDocs } from './components/ApiDocs';
import { WebSearchDemo } from './components/WebSearchDemo';
import { VisualAssetGallery } from './components/VisualAssetGallery';
import { AdminDashboard } from './components/AdminDashboard';
import { LiveVerificationPortal } from './components/LiveVerificationPortal';
import { VendorStorefront } from './components/VendorStorefront';
import { RecommendationEngineStudio } from './components/RecommendationEngineStudio';
import { FrontendHandshakeHub } from './components/FrontendHandshakeHub';

export default function App() {
  const [activeTab, setActiveTab] = useState<'admin' | 'handshake' | 'engine' | 'storefront' | 'verify' | 'search' | 'tester' | 'assets' | 'docs'>('admin');

  // Check URL parameters / path to auto-route to Storefront, Handshake, or Live Verification
  useEffect(() => {
    const path = window.location.pathname;
    const search = window.location.search;
    if (path.includes('/handshake') || search.includes('handshake=') || path.includes('/floate-xyz')) {
      setActiveTab('handshake');
    } else if (
      path.includes('/catalog/') ||
      path.includes('/vendor/') ||
      path.includes('/merchant/') ||
      path.includes('/merchant') ||
      path.startsWith('/@') ||
      search.includes('prod=') ||
      search.includes('vendor=') ||
      search.includes('merchant=')
    ) {
      setActiveTab('storefront');
    } else if (path.includes('/verify') || search.includes('phone=') || search.includes('verify=')) {
      setActiveTab('verify');
    } else if (path.includes('/engine') || search.includes('engine=true')) {
      setActiveTab('engine');
    }
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans antialiased selection:bg-sky-500 selection:text-white">
      {/* Header */}
      <header className="border-b border-slate-800/80 bg-slate-900/50 backdrop-blur sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-start">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-base font-bold text-slate-100 flex items-center gap-2">
                  Floate AI Operating Suite
                  <span className="text-[10px] font-mono bg-emerald-950 text-emerald-300 border border-emerald-800 px-2 py-0.5 rounded-full font-medium">
                    WhatsApp Admin & Storefront
                  </span>
                </h1>
                <p className="text-xs text-slate-400">Executive Telemetry, Web Storefronts, Verified Merchants & WhatsApp Bots</p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-end">
            <button
              onClick={() => setActiveTab('admin')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'admin'
                  ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 shadow-md font-black'
                  : 'text-amber-400 hover:text-amber-300 hover:bg-amber-950/40 border border-amber-500/30'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              Admin Dashboard
            </button>
            <button
              onClick={() => setActiveTab('handshake')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'handshake'
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-slate-950 shadow-md font-black'
                  : 'text-emerald-400 hover:text-emerald-300 hover:bg-emerald-950/40 border border-emerald-500/30'
              }`}
            >
              <Globe className="w-3.5 h-3.5" />
              floate.xyz Handshake
            </button>
            <button
              onClick={() => setActiveTab('engine')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'engine'
                  ? 'bg-gradient-to-r from-sky-500 to-blue-600 text-white shadow-md font-black'
                  : 'text-sky-400 hover:text-sky-300 hover:bg-sky-950/40 border border-sky-500/30'
              }`}
            >
              <Zap className="w-3.5 h-3.5" />
              100k Matchmaker Engine
            </button>
            <button
              onClick={() => setActiveTab('storefront')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'storefront'
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-slate-950 shadow-md font-black'
                  : 'text-emerald-400 hover:text-emerald-300 hover:bg-emerald-950/40 border border-emerald-500/30'
              }`}
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              Web Storefront & Catalogue
            </button>
            <button
              onClick={() => setActiveTab('verify')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
                activeTab === 'verify'
                  ? 'bg-sky-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              <MapPin className="w-3.5 h-3.5" />
              Live GPS Verification
            </button>
            <button
              onClick={() => setActiveTab('search')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
                activeTab === 'search'
                  ? 'bg-sky-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              <Globe className="w-3.5 h-3.5" />
              Web Search API
            </button>
            <button
              onClick={() => setActiveTab('tester')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
                activeTab === 'tester'
                  ? 'bg-sky-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              <Terminal className="w-3.5 h-3.5" />
              Bot Simulator
            </button>
            <button
              onClick={() => setActiveTab('docs')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
                activeTab === 'docs'
                  ? 'bg-sky-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              <Code2 className="w-3.5 h-3.5" />
              API Docs
            </button>

            <a
              href="https://wa.me/"
              target="_blank"
              rel="noopener noreferrer"
              className="ml-1 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 transition-all shadow-sm active:scale-95"
            >
              <Store className="w-3.5 h-3.5" />
              Open WhatsApp
              <ExternalLink className="w-3 h-3 opacity-80" />
            </a>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'admin' && <AdminDashboard />}
        {activeTab === 'handshake' && <FrontendHandshakeHub />}
        {activeTab === 'engine' && <RecommendationEngineStudio />}
        {activeTab === 'storefront' && <VendorStorefront />}
        {activeTab === 'verify' && <LiveVerificationPortal />}
        {activeTab === 'assets' && <VisualAssetGallery />}
        {activeTab === 'search' && <WebSearchDemo />}
        {activeTab === 'tester' && <BotTester />}
        {activeTab === 'docs' && <ApiDocs />}
      </main>
    </div>
  );
}
