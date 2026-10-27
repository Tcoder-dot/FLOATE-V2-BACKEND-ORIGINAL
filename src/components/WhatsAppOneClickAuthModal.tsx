import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, ShieldCheck, CheckCircle2, ArrowRight, Loader2, RefreshCw, AlertCircle, Copy, Check } from 'lucide-react';

interface WhatsAppOneClickAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthenticated?: (authData: { token: string; refreshToken?: string; vendor: any }) => void;
}

export const WhatsAppOneClickAuthModal: React.FC<WhatsAppOneClickAuthModalProps> = ({
  isOpen,
  onClose,
  onAuthenticated,
}) => {
  const [phone, setPhone] = useState('');
  const [challengeCode, setChallengeCode] = useState<string | null>(null);
  const [whatsappLink, setWhatsappLink] = useState<string | null>(null);
  const [expiresIn, setExpiresIn] = useState<number>(300);
  const [status, setStatus] = useState<'IDLE' | 'REQUESTING' | 'WAITING_WHATSAPP' | 'VERIFIED' | 'EXPIRED' | 'ERROR'>('IDLE');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [vendorInfo, setVendorInfo] = useState<any>(null);

  const pollTimerRef = useRef<NodeJS.Timeout | null>(null);
  const countdownTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!isOpen) {
      resetState();
    }
  }, [isOpen]);

  // Clean up timers on unmount
  useEffect(() => {
    return () => {
      stopPolling();
      stopCountdown();
    };
  }, []);

  const resetState = () => {
    stopPolling();
    stopCountdown();
    setPhone('');
    setChallengeCode(null);
    setWhatsappLink(null);
    setExpiresIn(300);
    setStatus('IDLE');
    setErrorMsg(null);
    setVendorInfo(null);
  };

  const stopPolling = () => {
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  };

  const stopCountdown = () => {
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }
  };

  const handleRequestCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone || phone.trim().length < 8) {
      setErrorMsg('Please enter a valid WhatsApp phone number.');
      return;
    }

    setErrorMsg(null);
    setStatus('REQUESTING');

    try {
      const res = await fetch('/api/v1/auth/whatsapp/request-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: phone.trim() }),
      });

      const data = await res.json();

      if (res.ok && data.status === 'success') {
        setChallengeCode(data.challenge_code);
        setWhatsappLink(data.whatsapp_link);
        setExpiresIn(data.expires_in_seconds || 300);
        setStatus('WAITING_WHATSAPP');

        // Start 1-second interval countdown timer
        startCountdown(data.expires_in_seconds || 300);

        // Start 2-second interval polling timer
        startPolling(data.challenge_code);
      } else {
        setStatus('ERROR');
        setErrorMsg(data.error || 'Failed to request authentication code.');
      }
    } catch (err: any) {
      setStatus('ERROR');
      setErrorMsg(err?.message || 'Network error reaching Floate authentication server.');
    }
  };

  const startCountdown = (initialSeconds: number) => {
    stopCountdown();
    let remaining = initialSeconds;

    countdownTimerRef.current = setInterval(() => {
      remaining -= 1;
      if (remaining <= 0) {
        stopCountdown();
        stopPolling();
        setStatus('EXPIRED');
        setErrorMsg('Authentication challenge code expired. Please request a new code.');
      } else {
        setExpiresIn(remaining);
      }
    }, 1000);
  };

  const startPolling = (code: string) => {
    stopPolling();

    pollTimerRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/v1/auth/whatsapp/session-status?code=${encodeURIComponent(code)}`);
        const data = await res.json();

        if (data.authenticated && data.status === 'VERIFIED') {
          stopPolling();
          stopCountdown();
          setStatus('VERIFIED');
          setVendorInfo(data.vendor);

          if (onAuthenticated) {
            onAuthenticated({
              token: data.token,
              refreshToken: data.refreshToken,
              vendor: data.vendor,
            });
          }
        } else if (data.status === 'EXPIRED') {
          stopPolling();
          stopCountdown();
          setStatus('EXPIRED');
          setErrorMsg('Authentication code expired. Please try again.');
        }
      } catch (err) {
        // Silent catch during background polling
      }
    }, 2000);
  };

  const copyCode = () => {
    if (challengeCode) {
      navigator.clipboard.writeText(`AUTH: ${challengeCode}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (!isOpen) return null;

  const formatSeconds = (totalSecs: number) => {
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-5 text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center font-bold">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white tracking-tight">WhatsApp One-Click Auth</h3>
              <p className="text-xs text-slate-400">FLOATE Merchant Passwordless Login</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Step 1: Input Phone */}
        {status === 'IDLE' || status === 'REQUESTING' || status === 'ERROR' ? (
          <form onSubmit={handleRequestCode} className="space-y-4">
            <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-4 space-y-2 text-xs text-slate-300">
              <div className="flex items-start space-x-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <p>
                  No password or SMS OTP needed! Enter your WhatsApp phone number to generate a secure 1-click verification link.
                </p>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-300">
                WhatsApp Registered Phone Number
              </label>
              <input
                type="tel"
                placeholder="e.g. 08031234567 or +2348031234567"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                disabled={status === 'REQUESTING'}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-all"
                required
              />
            </div>

            {errorMsg && (
              <div className="flex items-center space-x-2 text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 p-3 rounded-xl">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={status === 'REQUESTING'}
              className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-500 active:scale-[0.99] disabled:opacity-50 text-white font-semibold rounded-xl shadow-lg transition-all flex items-center justify-center space-x-2"
            >
              {status === 'REQUESTING' ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Generating Code...</span>
                </>
              ) : (
                <>
                  <span>🔐 Generate WhatsApp Code</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        ) : null}

        {/* Step 2: Waiting for WhatsApp message */}
        {status === 'WAITING_WHATSAPP' && challengeCode ? (
          <div className="space-y-5 text-center py-2">
            <div className="relative inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Loader2 className="w-8 h-8 animate-spin text-emerald-400" />
            </div>

            <div className="space-y-1">
              <h4 className="text-base font-bold text-white">Tap to Open WhatsApp</h4>
              <p className="text-xs text-slate-400">
                Click below to open WhatsApp with pre-filled message: <br />
                <span className="font-mono text-emerald-400 font-bold">AUTH: {challengeCode}</span>
              </p>
            </div>

            {/* Big Action Button */}
            {whatsappLink && (
              <a
                href={whatsappLink}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-lg transition-all flex items-center justify-center space-x-2 text-sm"
              >
                <MessageSquare className="w-5 h-5 fill-current" />
                <span>Open WhatsApp & Send Code</span>
              </a>
            )}

            <div className="flex items-center justify-between bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs">
              <div className="text-left font-mono">
                <span className="text-slate-500 block text-[10px]">CHALLENGE CODE</span>
                <span className="text-emerald-400 font-bold text-sm">AUTH: {challengeCode}</span>
              </div>
              <button
                onClick={copyCode}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg flex items-center space-x-1.5 transition-colors"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
            </div>

            {/* Real-time Status Indicator */}
            <div className="flex items-center justify-center space-x-2 text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 p-2.5 rounded-xl">
              <RefreshCw className="w-3.5 h-3.5 animate-spin shrink-0" />
              <span>
                Listening for WhatsApp webhook verification... ({formatSeconds(expiresIn)})
              </span>
            </div>
          </div>
        ) : null}

        {/* Step 3: Verified Success */}
        {status === 'VERIFIED' ? (
          <div className="space-y-4 text-center py-4 animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 mx-auto rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <div>
              <h4 className="text-xl font-bold text-white">Authenticated!</h4>
              <p className="text-xs text-emerald-400 font-medium mt-1">
                WhatsApp phone verified successfully
              </p>
            </div>

            {vendorInfo && (
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 text-left space-y-1 text-xs text-slate-300">
                <p className="font-semibold text-white">{vendorInfo.businessName}</p>
                <p className="text-slate-400">Phone: +{vendorInfo.whatsapp}</p>
                <p className="text-slate-400">Location: {vendorInfo.city}, {vendorInfo.state}</p>
              </div>
            )}

            <button
              onClick={onClose}
              className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl shadow-lg transition-all"
            >
              Enter Merchant Stall Dashboard
            </button>
          </div>
        ) : null}

        {/* Expired State */}
        {status === 'EXPIRED' ? (
          <div className="space-y-4 text-center py-2">
            <div className="w-12 h-12 mx-auto rounded-full bg-rose-500/10 text-rose-400 flex items-center justify-center">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-base font-bold text-white">Code Expired</h4>
              <p className="text-xs text-slate-400 mt-1">
                The 5-minute authentication window has passed.
              </p>
            </div>
            <button
              onClick={resetState}
              className="w-full py-3 px-4 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded-xl transition-all"
            >
              Try Again
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
};
