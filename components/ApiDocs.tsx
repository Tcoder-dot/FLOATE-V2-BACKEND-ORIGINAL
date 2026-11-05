import React, { useEffect, useState } from 'react';
import { Copy, Check, Server, ShieldCheck, Globe, Key, Terminal, ArrowRight } from 'lucide-react';

export function ApiDocs() {
  const [copied, setCopied] = useState<string | null>(null);
  const [status, setStatus] = useState<any>(null);

  useEffect(() => {
    fetch('/api/bot/status')
      .then((res) => res.json())
      .then((data) => setStatus(data))
      .catch((err) => console.error(err));
  }, []);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 2000);
  };

  const currentOrigin = typeof window !== 'undefined' ? window.location.origin : '';
  const webhookEndpoint = `${currentOrigin}/api/telegram-webhook`;
  const whatsappWebhookEndpoint = `${currentOrigin}/whatsapp-webhook`;
  const simulateEndpoint = `${currentOrigin}/api/bot/simulate`;

  const curlExample = `curl -X POST "${simulateEndpoint}" \\
  -H "Content-Type: application/json" \\
  -d '{"message": "/start", "firstName": "Alex"}'`;

  const setWebhookCurl = `curl -X POST "https://api.telegram.org/bot<YOUR_TELEGRAM_BOT_TOKEN>/setWebhook" \\
  -H "Content-Type: application/json" \\
  -d '{"url": "${webhookEndpoint}"}'`;

  return (
    <div className="space-y-6">
      {/* Bot Environment Status Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">TELEGRAM BOT</span>
            <Key className={`w-4 h-4 ${status?.hasToken ? 'text-emerald-400' : 'text-amber-400'}`} />
          </div>
          <p className="mt-2 text-sm font-semibold text-slate-100">
            {status?.hasToken ? '✅ Configured' : '⚠️ Pending Token'}
          </p>
          <p className="text-[11px] text-slate-400 mt-1">Telegram @BotFather channel</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">WHATSAPP CHANNEL</span>
            <Globe className={`w-4 h-4 ${status?.whatsappConfigured ? 'text-emerald-400' : 'text-emerald-500'}`} />
          </div>
          <p className="mt-2 text-sm font-semibold text-slate-100">
            {status?.whatsappConfigured ? '✅ Cloud API Active' : '🟢 Webhook Ready'}
          </p>
          <p className="text-[11px] text-slate-400 mt-1">Meta WhatsApp Cloud API test channel</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">GEMINI AI</span>
            <ShieldCheck className={`w-4 h-4 ${status?.hasGeminiApiKey ? 'text-emerald-400' : 'text-slate-500'}`} />
          </div>
          <p className="mt-2 text-sm font-semibold text-slate-100">
            {status?.hasGeminiApiKey ? '✅ Enabled' : '⚪ Fallback mode'}
          </p>
          <p className="text-[11px] text-slate-400 mt-1">Voice transcription & search parsing</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">FLUTTERWAVE PAYMENTS</span>
            <ShieldCheck className={`w-4 h-4 ${status?.flutterwaveConfigured ? 'text-emerald-400' : 'text-amber-400'}`} />
          </div>
          <p className="mt-2 text-sm font-semibold text-slate-100">
            {status?.flutterwaveConfigured ? '✅ Active Gateway' : '🟡 Configured / Ready'}
          </p>
          <p className="text-[11px] text-slate-400 mt-1">Escrow SafePay & Automated Payouts</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">Google Sheets DB</span>
            <Server className={`w-4 h-4 ${status?.spreadsheetId ? 'text-emerald-400' : 'text-sky-400'}`} />
          </div>
          <p className="mt-2 text-sm font-semibold text-slate-100">
            {status?.spreadsheetId ? '🟢 Linked Sheet' : '🟡 Ready'}
          </p>
          <p className="text-[11px] text-slate-400 mt-1">Stores bot logs, leads, and vendors</p>
        </div>
      </div>

      {/* Endpoint Reference */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6">
        <h3 className="text-base font-semibold text-slate-100 flex items-center gap-2">
          <Server className="w-5 h-5 text-sky-400" />
          Multi-Channel Webhooks & Express Endpoints
        </h3>

        {/* Search API Endpoint */}
        <div className="space-y-2 p-3 bg-sky-950/20 border border-sky-800/40 rounded-xl">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono bg-sky-950 text-sky-300 border border-sky-700 px-2 py-0.5 rounded font-bold">
                POST /api/search
              </span>
              <span className="text-[10px] text-sky-400 font-medium bg-sky-900/40 px-2 py-0.5 rounded">
                Official Website Integration
              </span>
            </div>
            <button
              onClick={() => copyToClipboard(`${currentOrigin}/api/search`, 'api_search')}
              className="text-xs text-slate-300 hover:text-white flex items-center gap-1 bg-sky-900/60 hover:bg-sky-800/80 px-2.5 py-1 rounded transition-colors"
            >
              {copied === 'api_search' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              Copy /api/search URL
            </button>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            Powers the search console and business listings on your official website. Returns verified business results with pre-built WhatsApp deep-links (<code className="text-emerald-300">whatsappDeepLink</code>) that launch directly into Floate's welcome message, number-save reminder, and Secure Line chat.
          </p>
          <pre className="bg-slate-950 border border-slate-800 p-3 rounded-lg text-xs font-mono text-slate-300 overflow-x-auto">
{`curl -X POST "${currentOrigin}/api/search" \\
  -H "Content-Type: application/json" \\
  -d '{"query": "shoes in onitsha", "location": "Onitsha"}'`}
          </pre>
        </div>

        {/* Website Direct Action Links */}
        <div className="space-y-2 p-3 bg-amber-950/20 border border-amber-800/40 rounded-xl">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono bg-amber-950 text-amber-300 border border-amber-700 px-2 py-0.5 rounded font-bold">
                WEBSITE ACTION LINKS
              </span>
              <span className="text-[10px] text-amber-400 font-medium bg-amber-900/40 px-2 py-0.5 rounded">
                WhatsApp Deep-links
              </span>
            </div>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            Use these direct WhatsApp URL actions on your website header, navbar, and CTA buttons:
          </p>
          <div className="space-y-1.5 text-xs font-mono text-slate-300">
            <div className="flex items-center justify-between bg-slate-950 p-2 rounded border border-slate-800">
              <span><strong>Register Business CTA:</strong> <code className="text-emerald-300">https://wa.me/message/YYWEZAZZIXBRF1?text=REGISTER_BUSINESS</code></span>
              <button onClick={() => copyToClipboard('https://wa.me/message/YYWEZAZZIXBRF1?text=REGISTER_BUSINESS', 'reg_link')} className="text-slate-400 hover:text-white">
                {copied === 'reg_link' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              </button>
            </div>
            <div className="flex items-center justify-between bg-slate-950 p-2 rounded border border-slate-800">
              <span><strong>Vendor Connect CTA:</strong> <code className="text-emerald-300">https://wa.me/message/YYWEZAZZIXBRF1?text=CONNECT_VENDOR_&lt;listing_id&gt;</code></span>
              <button onClick={() => copyToClipboard('https://wa.me/message/YYWEZAZZIXBRF1?text=CONNECT_VENDOR_', 'conn_link')} className="text-slate-400 hover:text-white">
                {copied === 'conn_link' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              </button>
            </div>
          </div>
        </div>

        {/* WhatsApp Webhook Endpoint */}
        <div className="space-y-2 p-3 bg-emerald-950/20 border border-emerald-800/40 rounded-xl">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono bg-emerald-950 text-emerald-300 border border-emerald-700 px-2 py-0.5 rounded font-bold">
                GET / POST /whatsapp-webhook
              </span>
              <span className="text-[10px] text-emerald-400 font-medium bg-emerald-900/40 px-2 py-0.5 rounded">
                Meta Cloud API
              </span>
            </div>
            <button
              onClick={() => copyToClipboard(whatsappWebhookEndpoint, 'wa_webhook')}
              className="text-xs text-slate-300 hover:text-white flex items-center gap-1 bg-emerald-900/60 hover:bg-emerald-800/80 px-2.5 py-1 rounded transition-colors"
            >
              {copied === 'wa_webhook' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              Copy WhatsApp Webhook URL
            </button>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            Meta WhatsApp Cloud API Webhook URL. Handles GET verification challenges and POST incoming text messages, voice notes, and interactive replies.
          </p>
          <div className="text-[11px] text-slate-400 flex flex-wrap items-center gap-3 pt-1">
            <span><strong>Verify Token:</strong> <code className="bg-slate-950 px-1.5 py-0.5 rounded text-emerald-300">floate_wa_verify_token_2026</code></span>
            <span><strong>Fallback Path:</strong> <code className="bg-slate-950 px-1.5 py-0.5 rounded text-slate-300">/api/whatsapp-webhook</code></span>
          </div>
        </div>

        {/* Flutterwave Webhook Endpoint */}
        <div className="space-y-2 p-3 bg-amber-950/20 border border-amber-800/40 rounded-xl">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono bg-amber-950 text-amber-300 border border-amber-700 px-2 py-0.5 rounded font-bold">
                POST /api/flutterwave-webhook
              </span>
              <span className="text-[10px] text-amber-400 font-medium bg-amber-900/40 px-2 py-0.5 rounded">
                Flutterwave Payment Webhook
              </span>
            </div>
            <button
              onClick={() => copyToClipboard(`${currentOrigin}/api/flutterwave-webhook`, 'flw_webhook')}
              className="text-xs text-slate-300 hover:text-white flex items-center gap-1 bg-amber-900/60 hover:bg-amber-800/80 px-2.5 py-1 rounded transition-colors"
            >
              {copied === 'flw_webhook' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              Copy Flutterwave Webhook URL
            </button>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            Enter this URL in your <strong>Flutterwave Dashboard → Settings → Webhooks → URL</strong>. Floate automatically validates the secret hash, confirms escrow payments, releases seller dispatch codes, and disburses payouts in real time.
          </p>
        </div>

        {/* Telegram Webhook Endpoint */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono bg-sky-950 text-sky-300 border border-sky-800 px-2 py-0.5 rounded font-bold">
              POST /api/telegram-webhook
            </span>
            <button
              onClick={() => copyToClipboard(webhookEndpoint, 'webhook')}
              className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1 bg-slate-800 px-2.5 py-1 rounded"
            >
              {copied === 'webhook' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              Copy Webhook URL
            </button>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            Direct target endpoint for Telegram Webhooks. Point your Telegram Bot token here to handle production updates automatically.
          </p>
        </div>

        {/* Endpoint 2 - Sheets DB Records */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono bg-indigo-950 text-indigo-300 border border-indigo-800 px-2 py-0.5 rounded font-bold">
              GET /api/sheets/records
            </span>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            Retrieves recent rows and database records appended by the Telegram bot (/save, user messages, and command logs).
          </p>
        </div>

        {/* Endpoint 3 */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono bg-slate-800 text-slate-300 border border-slate-700 px-2 py-0.5 rounded font-bold">
              POST /api/bot/simulate
            </span>
            <button
              onClick={() => copyToClipboard(curlExample, 'curl')}
              className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1 bg-slate-800 px-2.5 py-1 rounded"
            >
              {copied === 'curl' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              Copy curl command
            </button>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            Programmatic endpoint to test your bot handlers locally or from external scripts.
          </p>
          <pre className="bg-slate-950 border border-slate-800 p-3 rounded-lg text-xs font-mono text-slate-300 overflow-x-auto">
            {curlExample}
          </pre>
        </div>

        {/* Webhook Setup Command */}
        <div className="space-y-2 pt-2 border-t border-slate-800">
          <h4 className="text-xs font-semibold text-slate-200 uppercase tracking-wider">How to register Webhook with Telegram:</h4>
          <pre className="bg-slate-950 border border-slate-800 p-3 rounded-lg text-xs font-mono text-sky-300 overflow-x-auto">
            {setWebhookCurl}
          </pre>
        </div>
      </div>
    </div>
  );
}
