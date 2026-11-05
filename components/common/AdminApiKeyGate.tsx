import React, { useState } from "react";
import { KeyRound, ShieldCheck } from "lucide-react";

interface AdminApiKeyGateProps {
  onUnlock: (adminKey: string) => void;
  error?: string;
}

export const AdminApiKeyGate: React.FC<AdminApiKeyGateProps> = ({ onUnlock, error }) => {
  const [adminKey, setAdminKey] = useState("");

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const key = adminKey.trim();
    if (key) onUnlock(key);
  };

  return (
    <main className="min-h-screen bg-[#F7F7F2] px-4 py-10 flex items-center justify-center text-[#13241F]">
      <form onSubmit={handleSubmit} className="w-full max-w-sm bg-white border border-[#123F16]/15 p-6 space-y-5 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 flex items-center justify-center bg-[#E8F5E9] text-[#123F16]">
            <ShieldCheck className="w-5 h-5" aria-hidden="true" />
          </div>
          <div>
            <h1 className="text-base font-extrabold">Admin access</h1>
            <p className="text-xs text-[#5B6E66]">Merchant verification</p>
          </div>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="admin-api-key" className="text-xs font-bold">Admin API key</label>
          <input
            id="admin-api-key"
            type="password"
            value={adminKey}
            onChange={(event) => setAdminKey(event.target.value)}
            autoComplete="current-password"
            required
            className="w-full h-11 px-3 border border-slate-300 text-sm focus:outline-none focus:border-[#123F16]"
          />
        </div>

        {error && <p className="text-xs font-semibold text-red-700" role="alert">{error}</p>}

        <button type="submit" className="w-full h-11 bg-[#123F16] text-white text-sm font-bold flex items-center justify-center gap-2 hover:bg-[#1B5E20]">
          <KeyRound className="w-4 h-4" aria-hidden="true" />
          <span>Unlock review queue</span>
        </button>
      </form>
    </main>
  );
};