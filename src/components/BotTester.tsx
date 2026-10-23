import React, { useState, useRef } from 'react';
import { Send, Bot as BotIcon, RefreshCw, Sparkles, Terminal, Smartphone, MessageSquare, PlusCircle, Camera, Image as ImageIcon } from 'lucide-react';

interface ChatMessage {
  id: string;
  sender: 'user' | 'bot';
  text: string;
  image?: { id?: string; url?: string; caption?: string };
  replyMarkup?: any;
  quickReplies?: Array<{ id: string; title: string }>;
  listMenu?: {
    buttonText: string;
    title?: string;
    sections: Array<{
      title: string;
      rows: Array<{ id: string; title: string; description?: string }>;
    }>;
  };
  ctaUrl?: { displayText: string; url: string };
  timestamp: string;
}

function createSampleProductImageBase64(label: string, subtitle: string): string {
  if (typeof document === 'undefined') return '';
  const canvas = document.createElement('canvas');
  canvas.width = 400;
  canvas.height = 400;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, 0, 400, 400);

  ctx.fillStyle = '#1e293b';
  ctx.fillRect(20, 20, 360, 360);

  ctx.fillStyle = '#10b981';
  ctx.fillRect(40, 50, 150, 28);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 12px sans-serif';
  ctx.fillText('PRODUCT VERIFIED', 48, 68);

  ctx.fillStyle = '#f8fafc';
  ctx.font = 'bold 22px sans-serif';
  ctx.fillText(label, 40, 180);

  ctx.fillStyle = '#94a3b8';
  ctx.font = '15px sans-serif';
  ctx.fillText(subtitle, 40, 220);

  const dataUrl = canvas.toDataURL('image/jpeg');
  return dataUrl.replace(/^data:image\/jpeg;base64,/, '');
}

export function BotTester() {
  const [channel, setChannel] = useState<'whatsapp' | 'telegram'>('whatsapp');
  const [phoneNumber, setPhoneNumber] = useState('23480' + Math.floor(1000000 + Math.random() * 9000000));
  const [senderName, setSenderName] = useState('Chukwuemeka');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      sender: 'bot',
      text: '🟢 Floate AI Live Conversational Engine ready.\n\nType any message or click one of the quick test buttons below to test Step 2 First Contact and Identity routing.',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState<string[]>(['[System] Floate Conversational Simulator ready. Channel: WhatsApp.']);

  const generateNewNumber = () => {
    const randomNum = '23480' + Math.floor(1000000 + Math.random() * 9000000);
    setPhoneNumber(randomNum);
    setMessages([
      {
        id: Date.now().toString(),
        sender: 'bot',
        text: `📱 Switched to brand-new WhatsApp number: +${randomNum}\nSend any message (e.g. "Hi" or "I need shoes") to test Step 2 First Contact.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
    setLogs((prev) => [...prev, `[Session Reset] Switched to new clean number: +${randomNum}`]);
  };

  const sendMessage = async (
    textToSend?: string,
    imagePayload?: { imageBase64?: string; imageMimeType?: string; previewUrl?: string }
  ) => {
    const text = textToSend !== undefined ? textToSend : input;
    if ((!text.trim() && !imagePayload) || loading) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      sender: 'user',
      text: text || (imagePayload ? '📷 [Sent a Product Photo]' : ''),
      image: imagePayload?.previewUrl ? { url: imagePayload.previewUrl, caption: 'Buyer Product Photo' } : undefined,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (textToSend === undefined) setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/bot/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          phone: phoneNumber,
          userId: phoneNumber,
          firstName: senderName,
          channel,
          imageBase64: imagePayload?.imageBase64,
          imageMimeType: imagePayload?.imageMimeType,
        }),
      });

      const contentType = res.headers.get('content-type') || '';
      let data: any = {};
      if (contentType.includes('application/json')) {
        data = await res.json();
      } else {
        const rawText = await res.text();
        console.warn('[Simulator Non-JSON Ingress]:', rawText.substring(0, 300));
        data = {
          replies: [
            {
              chatId: phoneNumber,
              text: `⚠️ Server returned non-JSON HTTP ${res.status}. Processing completed.`,
            },
          ],
          logs: [`[Server Response]: HTTP ${res.status}`],
        };
      }

      if (data.logs) {
        setLogs((prev) => [...prev, ...data.logs]);
      }

      if (data.replies && data.replies.length > 0) {
        data.replies.forEach((reply: any) => {
          const botMsg: ChatMessage = {
            id: (Date.now() + Math.random()).toString(),
            sender: 'bot',
            text: reply.text,
            image: reply.image,
            replyMarkup: reply.replyMarkup,
            quickReplies: reply.quickReplies,
            listMenu: reply.listMenu,
            ctaUrl: reply.ctaUrl,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          };
          setMessages((prev) => [...prev, botMsg]);
        });
      } else {
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now().toString(),
            sender: 'bot',
            text: 'ℹ️ Handled silently without outgoing message response.',
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          },
        ]);
      }
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          sender: 'bot',
          text: `⚠️ Error executing bot handler: ${err?.message || 'Server error'}`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const base64 = dataUrl.split(',')[1];
      sendMessage('', {
        imageBase64: base64,
        imageMimeType: file.type || 'image/jpeg',
        previewUrl: dataUrl,
      });
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleSamplePhotoSearch = (label: string, subtitle: string) => {
    const base64 = createSampleProductImageBase64(label, subtitle);
    const dataUrl = `data:image/jpeg;base64,${base64}`;
    sendMessage('', {
      imageBase64: base64,
      imageMimeType: 'image/jpeg',
      previewUrl: dataUrl,
    });
  };

  const handleButtonClick = (actionText: string) => {
    sendMessage(actionText);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* WhatsApp / Telegram Chat Simulation */}
      <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl flex flex-col h-[680px] shadow-xl overflow-hidden">
        {/* Chat Header */}
        <div className="bg-slate-800/90 backdrop-blur px-5 py-3 border-b border-slate-700/60 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
              channel === 'whatsapp'
                ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-400'
                : 'bg-sky-500/20 border border-sky-500/40 text-sky-400'
            }`}>
              {channel === 'whatsapp' ? <Smartphone className="w-5 h-5" /> : <BotIcon className="w-5 h-5" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-slate-100 text-sm">
                  {channel === 'whatsapp' ? 'Floate AI WhatsApp Simulator' : 'Floate Telegram Simulator'}
                </h3>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-medium ${
                  channel === 'whatsapp' ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' : 'bg-sky-950 text-sky-300 border border-sky-800'
                }`}>
                  {channel.toUpperCase()}
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono mt-0.5 flex items-center gap-2">
                <span>Identity: +{phoneNumber}</span>
                <span className="text-slate-600">•</span>
                <span>Name: {senderName}</span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={generateNewNumber}
              title="Generate a new phone number to test Step 2 First Contact from scratch"
              className="px-2.5 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              New Number
            </button>
            <button
              onClick={() => {
                setMessages([]);
                setLogs(['[System] Chat log cleared.']);
              }}
              className="p-2 text-slate-400 hover:text-slate-200 transition-colors rounded-lg hover:bg-slate-800 text-xs flex items-center gap-1"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Identity & Channel Switcher Toolbar */}
        <div className="px-4 py-2 bg-slate-900 border-b border-slate-800 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span className="text-slate-400 text-[11px] font-medium">Channel:</span>
            <button
              onClick={() => setChannel('whatsapp')}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                channel === 'whatsapp'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              WhatsApp (Step 2)
            </button>
            <button
              onClick={() => setChannel('telegram')}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                channel === 'telegram'
                  ? 'bg-sky-600 text-white shadow-sm'
                  : 'bg-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              Telegram
            </button>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-slate-500 text-[11px]">Phone:</span>
            <input
              type="text"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              className="bg-slate-950 border border-slate-800 text-slate-200 font-mono text-xs px-2 py-0.5 rounded w-32 outline-none focus:border-emerald-500"
            />
            <span className="text-slate-500 text-[11px]">Name:</span>
            <input
              type="text"
              value={senderName}
              onChange={(e) => setSenderName(e.target.value)}
              className="bg-slate-950 border border-slate-800 text-slate-200 text-xs px-2 py-0.5 rounded w-24 outline-none focus:border-emerald-500"
            />
          </div>
        </div>

        {/* Quick Test Scenario Presets Bar */}
        <div className="px-4 py-2.5 bg-slate-950/90 border-b border-slate-800 flex flex-col gap-2 text-xs">
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            <span className="text-emerald-400 font-semibold text-[11px] uppercase tracking-wider whitespace-nowrap">🔍 Search & 10-Card:</span>
            {[
              { label: '👟 Slippers in Enugu (Spotlight: Chivora)', val: 'Leather slippers in Enugu' },
              { label: '📱 iPhones in Enugu (Spotlight: MBAMS)', val: 'iPhones in Enugu' },
              { label: '👜 Bags in Balogun (Spotlight: Jules)', val: 'Designer handbags in Balogun Lagos' },
              { label: '💍 Luxury & Perfumes (Spotlight: Makky)', val: 'Perfumes and jewelry in Nigeria' },
              { label: '💻 Laptops in Lagos', val: 'HP Core i7 laptops in Ikeja' },
            ].map((item) => (
              <button
                key={item.label}
                onClick={() => handleButtonClick(item.val)}
                disabled={loading}
                className="px-2.5 py-1 rounded-md bg-slate-800/90 hover:bg-emerald-950 hover:text-emerald-300 hover:border-emerald-700 border border-slate-700 text-slate-300 whitespace-nowrap transition-colors"
              >
                {item.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 overflow-x-auto">
            <span className="text-amber-400 font-semibold text-[11px] uppercase tracking-wider whitespace-nowrap">📸 Visual Search (AI OCR):</span>
            {[
              { label: '👟 Photo: Leather Slippers', prod: 'Handmade Men Leather Slippers', sub: 'Footwear & Fashion' },
              { label: '💻 Photo: HP Core i7 Laptop', prod: 'HP EliteBook Core i7 Laptop', sub: 'Computers & Tech' },
              { label: '🔋 Photo: 3.5kVA Solar Inverter', prod: '3.5kVA Pure Sine Inverter & Battery', sub: 'Solar & Power' },
              { label: '🚀 Photo: Unmatched Category Item', prod: 'Nuclear Space Propulsion Fuel Cell', sub: 'Aerospace Engineering' },
            ].map((item) => (
              <button
                key={item.label}
                onClick={() => handleSamplePhotoSearch(item.prod, item.sub)}
                disabled={loading}
                className="px-2.5 py-1 rounded-md bg-amber-950/70 hover:bg-amber-900 border border-amber-600/60 text-amber-200 whitespace-nowrap transition-colors"
              >
                {item.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 overflow-x-auto">
            <span className="text-emerald-400 font-semibold text-[11px] uppercase tracking-wider whitespace-nowrap">🛡️ Live Verification & Voice:</span>
            {[
              { label: '🛡️ 1-Tap Live Location Verification', val: 'verify', highlight: true },
              { label: '🎙️ Voice Note: Leather Slippers 10k Onitsha', val: 'I want handmade leather slippers 10k in Onitsha Anambra' },
              { label: '🎙️ Voice Note: 3.5kVA Solar Inverter Alaba', val: 'Abeg find 3.5kva solar inverter in Alaba International Lagos' },
              { label: '🏪 Verify My Store (KYC)', val: 'btn_verif_start' },
            ].map((item) => (
              <button
                key={item.label}
                onClick={() => handleButtonClick(item.val)}
                disabled={loading}
                className={`px-2.5 py-1 rounded-md border whitespace-nowrap transition-colors ${
                  item.highlight
                    ? 'bg-emerald-900/60 hover:bg-emerald-800 text-emerald-200 border-emerald-500/80 font-bold shadow-sm'
                    : 'bg-slate-800/90 hover:bg-emerald-950 hover:text-emerald-300 hover:border-emerald-700 border-slate-700 text-slate-300'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 overflow-x-auto">
            <span className="text-sky-400 font-semibold text-[11px] uppercase tracking-wider whitespace-nowrap">⚡ Actions & Hub:</span>
            {[
              { label: '✨ Viral SafePay Card', val: 'btn_viral_card', highlight: true },
              { label: '👋 "Hi" (First Contact)', val: 'Hi' },
              { label: '1️⃣ Select Option #1', val: '1' },
              { label: '🔒 SafePay (Paused)', val: 'btn_safepay' },
              { label: '✅ I Have Paid', val: 'btn_safepay_paid' },
              { label: '🚪 End Chat', val: 'end chat' },
              { label: '🏪 Merchant Hub', val: 'vendor_hub' },
              { label: '➕ Add Product', val: 'vendor_add_product' },
              { label: '📊 Store Stats', val: 'vendor_analytics' },
            ].map((item) => (
              <button
                key={item.label}
                onClick={() => handleButtonClick(item.val)}
                disabled={loading}
                className={`px-2.5 py-1 rounded-md border whitespace-nowrap transition-colors ${
                  item.highlight
                    ? 'bg-purple-900/60 hover:bg-purple-800 text-purple-200 border-purple-500/80 font-bold shadow-sm'
                    : 'bg-slate-800/90 hover:bg-sky-950 hover:text-sky-300 hover:border-sky-700 border-slate-700 text-slate-300'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {/* Message Stream */}
        <div className="flex-1 p-5 overflow-y-auto space-y-4 bg-slate-950/60">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm ${
                  msg.sender === 'user'
                    ? channel === 'whatsapp'
                      ? 'bg-emerald-600 text-white rounded-br-none'
                      : 'bg-sky-600 text-white rounded-br-none'
                    : 'bg-slate-800 text-slate-100 border border-slate-700/80 rounded-bl-none'
                }`}
              >
                {/* Render Attached Image (Receipt / Success / Viral Card) */}
                {msg.image?.url && (
                  <div className="mb-3 rounded-xl overflow-hidden border border-purple-500/40 bg-slate-950 shadow-lg">
                    <img
                      src={msg.image.url}
                      alt={msg.image.caption || 'Floate SafePay Document'}
                      className="w-full h-auto max-h-[420px] object-contain rounded-t-lg bg-white"
                      loading="lazy"
                    />
                    <div className="p-2.5 bg-slate-900 border-t border-slate-800 flex items-center justify-between text-xs">
                      <span className="text-purple-300 font-semibold truncate">
                        {msg.image.caption || 'Floate SafePay Document'}
                      </span>
                      <a
                        href={msg.image.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-2 py-0.5 rounded bg-purple-950 hover:bg-purple-900 border border-purple-700/80 text-purple-200 text-[11px] font-bold transition-all shrink-0 ml-2"
                      >
                        Open Full ↗
                      </a>
                    </div>
                  </div>
                )}

                <div className="whitespace-pre-wrap font-sans">{msg.text}</div>

                {/* Render Quick Replies (WhatsApp Buttons - max 3) */}
                {msg.quickReplies && msg.quickReplies.length > 0 && (
                  <div className="mt-3 pt-2 border-t border-slate-700/60 flex flex-wrap gap-2">
                    {msg.quickReplies.map((qr) => (
                      <button
                        key={qr.id}
                        onClick={() => handleButtonClick(qr.id)}
                        className="py-1.5 px-3 bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-700/80 text-emerald-300 hover:text-emerald-200 text-xs font-semibold rounded-lg transition-all"
                      >
                        {qr.title}
                      </button>
                    ))}
                  </div>
                )}

                {/* Render Meta WhatsApp Interactive List Menu */}
                {msg.listMenu && (
                  <div className="mt-3 pt-2 border-t border-slate-700/60 space-y-2">
                    <div className="text-[11px] font-semibold text-emerald-400 flex items-center gap-1.5">
                      <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />
                      {msg.listMenu.buttonText || '📋 Select Vendor'}
                    </div>
                    {msg.listMenu.sections.map((sec, sIdx) => (
                      <div key={sIdx} className="bg-slate-900/90 rounded-xl p-2 border border-slate-700/60 space-y-1.5">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-1">
                          {sec.title}
                        </div>
                        <div className="space-y-1">
                          {sec.rows.map((row) => (
                            <button
                              key={row.id}
                              onClick={() => handleButtonClick(row.id)}
                              className="w-full text-left p-2 rounded-lg bg-slate-800/80 hover:bg-emerald-950/70 border border-slate-700/50 hover:border-emerald-500/60 transition-all group"
                            >
                              <div className="text-xs font-medium text-slate-200 group-hover:text-emerald-300">
                                {row.title}
                              </div>
                              {row.description && (
                                <div className="text-[10px] text-slate-400 group-hover:text-slate-300 mt-0.5">
                                  {row.description}
                                </div>
                              )}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Render CTA URL Button */}
                {msg.ctaUrl && (
                  <div className="mt-3 pt-2 border-t border-slate-700/60">
                    <a
                      href={msg.ctaUrl.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 py-1.5 px-3 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium rounded-lg transition-all"
                    >
                      🔗 {msg.ctaUrl.displayText}
                    </a>
                  </div>
                )}

                {/* Render Inline Keyboards if present from Telegram */}
                {msg.replyMarkup?.inline_keyboard && !msg.quickReplies && (
                  <div className="mt-3 pt-2 border-t border-slate-700/50 space-y-1.5">
                    {msg.replyMarkup.inline_keyboard.map((row: any[], rIdx: number) => (
                      <div key={rIdx} className="flex gap-1.5">
                        {row.map((btn: any, bIdx: number) => (
                          <button
                            key={bIdx}
                            onClick={() => handleButtonClick(btn.callback_data || btn.text)}
                            className="flex-1 py-1.5 px-3 bg-slate-700/70 hover:bg-emerald-600/30 hover:border-emerald-500 border border-slate-600 text-emerald-300 hover:text-emerald-200 text-xs font-medium rounded-lg transition-all text-center"
                          >
                            {btn.text}
                          </button>
                        ))}
                      </div>
                    ))}
                  </div>
                )}
                <div className="text-[10px] opacity-60 text-right mt-1.5 font-mono">{msg.timestamp}</div>
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex items-center gap-2 text-slate-400 text-xs bg-slate-800/50 p-3 rounded-xl w-max">
              <Sparkles className="w-4 h-4 animate-spin text-emerald-400" />
              Processing conversational engine logic...
            </div>
          )}
        </div>

        {/* Input Bar */}
        <div className="p-4 bg-slate-900 border-t border-slate-800 flex items-center gap-3">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept="image/*"
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={loading}
            title="Upload photo of product to search with Floate AI Vision"
            className="bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-amber-400 p-2.5 rounded-xl border border-slate-700 transition-colors shrink-0"
          >
            <Camera className="w-4 h-4" />
          </button>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
            placeholder={channel === 'whatsapp' ? "Type a WhatsApp message (e.g., 'Hi', 'I need shoes in Lagos', '1')..." : "Type a command or message..."}
            className="flex-1 bg-slate-950 border border-slate-800 focus:border-emerald-500 text-slate-100 text-sm rounded-xl px-4 py-2.5 outline-none font-sans"
          />
          <button
            onClick={() => sendMessage()}
            disabled={loading || !input.trim()}
            className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white p-2.5 rounded-xl transition-colors"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Execution Logs & Server Console */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col h-[680px]">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
          <h4 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
            <Terminal className="w-4 h-4 text-emerald-400" />
            Live Conversational Logs
          </h4>
          <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest bg-slate-800 px-2 py-0.5 rounded">
            Realtime
          </span>
        </div>

        <div className="flex-1 bg-slate-950 rounded-xl p-3 font-mono text-xs text-slate-300 overflow-y-auto space-y-2 border border-slate-800/80">
          {logs.map((log, i) => (
            <div
              key={i}
              className={`leading-relaxed ${
                log.includes('[Error]') || log.includes('❌')
                  ? 'text-rose-400'
                  : log.includes('✅') || log.includes('Executed')
                  ? 'text-emerald-400'
                  : 'text-slate-400'
              }`}
            >
              {log}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
