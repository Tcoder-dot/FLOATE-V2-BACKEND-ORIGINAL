import React, { useState, useEffect } from "react";
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Clock,
  Store,
  MapPin,
  Phone,
  MessageCircle,
  Search,
  Filter,
  RefreshCw,
  Loader2,
  AlertCircle,
  ExternalLink,
  ChevronRight,
  Eye,
  X,
  Building2,
  TrendingUp,
  Activity,
  Layers,
  FileText
} from "lucide-react";
import { BackendUpdateReport } from "./BackendUpdateReport";
import { AdminApiKeyGate } from "./common/AdminApiKeyGate";
import {
  clearAdminApiKey,
  getAdminApiKey,
  getAdminVerifications,
  approveMerchant,
  rejectMerchant,
  saveAdminApiKey,
  VerificationApplication
} from "../services/verificationApi";

interface AdminDashboardProps {
  onNavigateHome?: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  onNavigateHome
}) => {
  const [activeTab, setActiveTab] = useState<"pending_review" | "approved" | "rejected" | "all" | "backend_report">("pending_review");
  const [adminKey, setAdminKey] = useState(getAdminApiKey);
  const [adminKeyError, setAdminKeyError] = useState("");
  const [verifications, setVerifications] = useState<VerificationApplication[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [hubFilter, setHubFilter] = useState("all");
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<{ id: string; text: string; type: "success" | "error" } | null>(null);

  // Rejection modal state
  const [rejectModalItem, setRejectModalItem] = useState<VerificationApplication | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  // Media zoom preview state
  const [previewMedia, setPreviewMedia] = useState<{ type: "video" | "image"; url: string; title: string } | null>(null);

  // Fetch live real database verifications (zero mock data)
  const loadDatabaseVerifications = async () => {
    if (!adminKey) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const res = await getAdminVerifications(activeTab, adminKey);
      if (res && res.success && res.verifications) {
        setVerifications(res.verifications);
      } else {
        setVerifications([]);
        if (/authentication|required|not configured|\b401\b|\b503\b/i.test(res?.message || "")) {
          clearAdminApiKey();
          setAdminKey("");
          setAdminKeyError(res.message || "Admin access could not be verified.");
        }
      }
    } catch (err) {
      console.error("[AdminDashboard] Error loading live database verifications:", err);
      setVerifications([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDatabaseVerifications();
  }, [activeTab, adminKey]);

  const handleApprove = async (appItem: VerificationApplication) => {
    const vendorId = appItem.vendor_id || appItem.id;
    if (!vendorId) return;

    setActionLoadingId(appItem.id);
    setActionMessage(null);
    try {
      const res = await approveMerchant(vendorId, adminKey, "Admin Officer");
      if (res.success) {
        setActionMessage({
          id: appItem.id,
          text: `Approved! ${appItem.business_name} now displays Verified badge in nationwide search.`,
          type: "success"
        });
        setVerifications((prev) =>
          prev.map((item) =>
            item.id === appItem.id ? { ...item, status: "approved" } : item
          )
        );
      } else {
        setActionMessage({
          id: appItem.id,
          text: res.message || "Approval failed.",
          type: "error"
        });
      }
    } catch (err: any) {
      setActionMessage({
        id: appItem.id,
        text: err?.message || "Error approving merchant",
        type: "error"
      });
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleRejectSubmit = async () => {
    if (!rejectModalItem) return;
    const vendorId = rejectModalItem.vendor_id || rejectModalItem.id;
    if (!vendorId) return;

    setActionLoadingId(rejectModalItem.id);
    try {
      const res = await rejectMerchant(vendorId, rejectReason || "Physical verification photo did not clearly show storefront or inventory.", adminKey);
      if (res.success) {
        setActionMessage({
          id: rejectModalItem.id,
          text: `Application rejected. Merchant notified on WhatsApp.`,
          type: "error"
        });
        setVerifications((prev) =>
          prev.map((item) =>
            item.id === rejectModalItem.id ? { ...item, status: "rejected" } : item
          )
        );
        setRejectModalItem(null);
        setRejectReason("");
      }
    } catch (err) {
      console.error("Rejection error:", err);
    } finally {
      setActionLoadingId(null);
    }
  };

  // Filtered applications based on search & hub
  const filteredList = verifications.filter((item) => {
    const q = searchTerm.toLowerCase();
    const matchesSearch =
      !q ||
      item.business_name.toLowerCase().includes(q) ||
      item.owner_name.toLowerCase().includes(q) ||
      (item.whatsapp && item.whatsapp.includes(q)) ||
      item.market.toLowerCase().includes(q) ||
      item.city.toLowerCase().includes(q);

    const matchesHub =
      hubFilter === "all" ||
      item.city.toLowerCase().includes(hubFilter.toLowerCase()) ||
      item.market.toLowerCase().includes(hubFilter.toLowerCase());

    return matchesSearch && matchesHub;
  });

  const pendingCount = verifications.filter(v => v.status === "pending_review" || v.status === "submitted").length;
  const approvedCount = verifications.filter(v => v.status === "approved").length;

  if (!adminKey) {
    return (
      <AdminApiKeyGate
        error={adminKeyError}
        onUnlock={(key) => {
          saveAdminApiKey(key);
          setAdminKey(key);
          setAdminKeyError("");
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#F7F7F2] text-[#111111] font-sans pb-20">
      
      {/* TOP ADMIN HEADER */}
      <header className="sticky top-0 z-30 bg-[#123F16] text-white border-b border-[#1B5E20] shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center border border-white/20">
              <ShieldCheck className="w-5 h-5 text-[#FFC107]" />
            </div>
            <div>
              <h1 className="text-base font-extrabold tracking-tight">FLOATE Admin Operating System</h1>
              <p className="text-[11px] text-white/70">Authoritative Database Console & Merchant Verification</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={loadDatabaseVerifications}
              disabled={isLoading}
              className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition flex items-center gap-1.5 text-xs font-semibold"
              title="Refresh live database"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
              <span className="hidden sm:inline">Sync Live DB</span>
            </button>

            {onNavigateHome && (
              <button
                onClick={onNavigateHome}
                className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition"
              >
                Back to Storefront
              </button>
            )}
          </div>
        </div>
      </header>

      {/* MAIN ADMIN DASHBOARD BODY */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 pt-6 space-y-6">
        
        {/* LIVE DATABASE METRICS */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-xs font-semibold">Active Verifications</span>
              <Layers className="w-4 h-4 text-[#1B5E20]" />
            </div>
            <div className="mt-2">
              <span className="text-2xl font-black text-[#111111]">{verifications.length}</span>
              <span className="text-[11px] text-slate-400 block mt-0.5">Live Database Records</span>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-amber-200 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-amber-600">
              <span className="text-xs font-semibold">Pending Review</span>
              <Clock className="w-4 h-4 text-amber-600" />
            </div>
            <div className="mt-2">
              <span className="text-2xl font-black text-amber-600">{pendingCount}</span>
              <span className="text-[11px] text-slate-400 block mt-0.5">Awaiting Visual Audit</span>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-emerald-200 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-emerald-600">
              <span className="text-xs font-semibold">Verified Badges</span>
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="mt-2">
              <span className="text-2xl font-black text-emerald-600">{approvedCount}</span>
              <span className="text-[11px] text-slate-400 block mt-0.5">Active Shield in Search</span>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-xs font-semibold">Trade Hubs</span>
              <Building2 className="w-4 h-4 text-[#1B5E20]" />
            </div>
            <div className="mt-2">
              <span className="text-2xl font-black text-[#111111]">5</span>
              <span className="text-[11px] text-slate-400 block mt-0.5">Lagos, Onitsha, Aba, Abuja, Kano</span>
            </div>
          </div>
        </div>

        {/* SEARCH & FILTERS BAR */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row gap-3 items-center justify-between">
          
          {/* Status Tabs */}
          <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
            {[
              { id: "pending_review", label: "Pending Audit", count: pendingCount },
              { id: "approved", label: "Approved / Verified", count: approvedCount },
              { id: "rejected", label: "Rejected" },
              { id: "all", label: "All Records", count: verifications.length },
              { id: "backend_report", label: "Backend Report", icon: FileText }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 ${
                  activeTab === tab.id
                    ? "bg-[#1B5E20] text-white shadow-xs"
                    : "bg-slate-100 hover:bg-slate-200 text-slate-600"
                }`}
              >
                {tab.icon && <tab.icon className="w-3 h-3" />}
                <span>{tab.label}</span>
                {tab.count !== undefined && (
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                    activeTab === tab.id ? "bg-white/20 text-white" : "bg-slate-200 text-slate-700"
                  }`}>
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Search Input */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search business, owner, phone..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-1.5 text-xs text-[#111111] placeholder-slate-400 focus:outline-none focus:border-[#1B5E20]"
              />
            </div>

            <select
              value={hubFilter}
              onChange={(e) => setHubFilter(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs text-[#111111] font-medium focus:outline-none"
            >
              <option value="all">All Hubs</option>
              <option value="Lagos">Lagos Hubs</option>
              <option value="Onitsha">Onitsha Main</option>
              <option value="Aba">Ariaria Aba</option>
              <option value="Abuja">Abuja</option>
              <option value="Kano">Kano</option>
            </select>
          </div>
        </div>

        {/* APPLICATIONS LISTING (ZERO MOCK DATA) */}
        {activeTab === "backend_report" ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
            <BackendUpdateReport />
          </div>
        ) : isLoading ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-3">
            <Loader2 className="w-8 h-8 text-[#1B5E20] animate-spin mx-auto" />
            <p className="text-xs text-slate-500 font-semibold">Loading authoritative records from database...</p>
          </div>
        ) : filteredList.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
              <Store className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-[#111111]">No Merchant Applications Found</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                No active database records match your filter in '{activeTab}'. As merchants register on WhatsApp and submit visual proof, they will appear here live.
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredList.map((app) => {
              const initials = app.business_name
                .split(" ")
                .map((w) => w[0])
                .join("")
                .slice(0, 2)
                .toUpperCase();

              const cleanPhone = app.whatsapp.replace(/[^0-9]/g, "");
              const waLink = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(`Hello ${app.owner_name}, this is FLOATE Merchant Verification team regarding your store "${app.business_name}".`)}`;
              const hasPhotos = app.product_photo_urls && app.product_photo_urls.length > 0;

              return (
                <div
                  key={app.id}
                  className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs hover:shadow-md transition space-y-3 flex flex-col justify-between relative overflow-hidden"
                >
                  <div className="space-y-3">
                    {/* Header */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        {hasPhotos ? (
                          <div
                            onClick={() => setPreviewMedia({ type: "image", url: app.product_photo_urls![0], title: `${app.business_name} Storefront` })}
                            className="w-12 h-12 rounded-xl overflow-hidden bg-slate-100 border border-slate-200 shrink-0 cursor-pointer relative group"
                          >
                            <img
                              src={app.product_photo_urls![0]}
                              alt={app.business_name}
                              className="w-full h-full object-cover group-hover:scale-105 transition"
                            />
                            <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                              <Eye className="w-3.5 h-3.5 text-white" />
                            </div>
                          </div>
                        ) : (
                          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#1B5E20] to-[#123F16] text-[#FFC107] font-black text-xs shrink-0 flex items-center justify-center border border-white/20">
                            {initials || "FL"}
                          </div>
                        )}

                        <div className="min-w-0">
                          <h3 className="text-sm font-extrabold text-[#111111] truncate leading-tight">
                            {app.business_name}
                          </h3>
                          <p className="text-[11px] text-slate-500 font-medium truncate">
                            Owner: <span className="font-semibold text-slate-700">{app.owner_name}</span>
                          </p>
                        </div>
                      </div>

                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                        app.status === "approved"
                          ? "bg-emerald-100 text-emerald-800"
                          : app.status === "rejected"
                          ? "bg-red-100 text-red-800"
                          : "bg-amber-100 text-amber-800"
                      }`}>
                        {app.status === "approved" ? "Verified" : app.status === "rejected" ? "Rejected" : "Pending"}
                      </span>
                    </div>

                    {/* Location & Details */}
                    <div className="space-y-1 bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-xs">
                      <div className="flex items-center gap-1.5 text-slate-600 font-medium">
                        <MapPin className="w-3.5 h-3.5 text-[#1B5E20] shrink-0" />
                        <span className="truncate">{app.market}, {app.city}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-slate-600 font-medium">
                        <Store className="w-3.5 h-3.5 text-[#1B5E20] shrink-0" />
                        <span className="truncate">Items: {Array.isArray(app.products) ? app.products.join(", ") : app.products}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-slate-600 font-medium">
                        <Phone className="w-3.5 h-3.5 text-[#1B5E20] shrink-0" />
                        <span className="font-mono text-[11px]">{app.whatsapp}</span>
                      </div>
                    </div>

                    {/* Visual Proofs Section */}
                    {hasPhotos && (
                      <div className="space-y-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Visual Proof Attached:</span>
                        <div className="flex gap-1.5 overflow-x-auto pb-1">
                          {app.product_photo_urls!.map((imgUrl, i) => (
                            <button
                              key={i}
                              type="button"
                              onClick={() => setPreviewMedia({ type: "image", url: imgUrl, title: `${app.business_name} Proof #${i + 1}` })}
                              className="w-12 h-12 rounded-lg overflow-hidden border border-slate-200 shrink-0 hover:opacity-80 transition"
                            >
                              <img src={imgUrl} alt="Store proof" className="w-full h-full object-cover" />
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Action notification message */}
                    {actionMessage && actionMessage.id === app.id && (
                      <div className={`p-2 rounded-xl text-xs font-semibold ${
                        actionMessage.type === "success" ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-800"
                      }`}>
                        {actionMessage.text}
                      </div>
                    )}
                  </div>

                  {/* Actions Bar */}
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                    <a
                      href={waLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="py-1.5 px-2.5 rounded-lg bg-slate-100 hover:bg-[#25D366] hover:text-white text-slate-700 text-xs font-bold transition flex items-center gap-1"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      <span>WhatsApp</span>
                    </a>

                    {app.status !== "approved" && (
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setRejectModalItem(app)}
                          className="px-2.5 py-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 text-xs font-bold transition"
                        >
                          Reject
                        </button>

                        <button
                          type="button"
                          disabled={actionLoadingId === app.id}
                          onClick={() => handleApprove(app)}
                          className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition flex items-center gap-1 disabled:opacity-50"
                        >
                          {actionLoadingId === app.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          )}
                          <span>Approve Badge</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

      </main>

      {/* REJECTION MODAL */}
      {rejectModalItem && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-extrabold text-[#111111]">Reject Verification Application</h3>
              <button onClick={() => setRejectModalItem(null)} className="p-1 rounded-full text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600">
              Provide feedback for <strong className="text-[#111111]">{rejectModalItem.business_name}</strong>. An automated WhatsApp message will guide them to re-upload clear proof.
            </p>

            <textarea
              rows={3}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="e.g. Photo was blurry or did not show stall signage in Balogun market."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-[#111111] focus:outline-none focus:border-[#1B5E20]"
            />

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setRejectModalItem(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRejectSubmit}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition shadow-xs"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MEDIA PREVIEW MODAL */}
      {previewMedia && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="max-w-2xl w-full bg-white rounded-3xl overflow-hidden shadow-2xl space-y-3 p-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-extrabold text-[#111111] truncate">{previewMedia.title}</h4>
              <button onClick={() => setPreviewMedia(null)} className="p-1 text-slate-500 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="max-h-[70vh] overflow-hidden rounded-2xl bg-black flex items-center justify-center">
              <img src={previewMedia.url} alt="Proof preview" className="w-full h-auto max-h-[65vh] object-contain" />
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default AdminDashboard;
