import React, { useState, useEffect } from "react";
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Clock,
  Video,
  Image as ImageIcon,
  MapPin,
  Phone,
  MessageCircle,
  ExternalLink,
  Search,
  Filter,
  RefreshCw,
  Loader2,
  AlertCircle,
  Store,
  ChevronRight,
  Eye,
  X
} from "lucide-react";
import { LoadingScreen } from "../components/common/LoadingScreen";
import { AdminApiKeyGate } from "../components/common/AdminApiKeyGate";
import {
  clearAdminApiKey,
  getAdminApiKey,
  getAdminVerifications,
  approveMerchant,
  rejectMerchant,
  saveAdminApiKey,
  VerificationApplication
} from "../services/verificationApi";
import { DetailHeader } from "../components/common/DetailHeader";
import { SEO } from "../components/common/SEO";

interface AdminVerificationsPageProps {
  onNavigateHome: () => void;
}

export const AdminVerificationsPage: React.FC<AdminVerificationsPageProps> = ({
  onNavigateHome
}) => {
  const [activeTab, setActiveTab] = useState<"pending_review" | "approved" | "rejected" | "all">("pending_review");
  const [adminKey, setAdminKey] = useState(getAdminApiKey);
  const [adminKeyError, setAdminKeyError] = useState("");
  const [verifications, setVerifications] = useState<VerificationApplication[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<{ id: string; text: string; type: "success" | "error" } | null>(null);

  // Rejection modal state
  const [rejectModalItem, setRejectModalItem] = useState<VerificationApplication | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  // Media zoom modal state
  const [previewMedia, setPreviewMedia] = useState<{ type: "video" | "image"; url: string; title: string } | null>(null);

  const loadData = async () => {
    if (!adminKey) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const res = await getAdminVerifications(activeTab, adminKey);
      if (res.success && res.verifications) {
        setVerifications(res.verifications);
      } else {
        setVerifications([]);
        if (/authentication|required|not configured|\b401\b|\b503\b/i.test(res.message || "")) {
          clearAdminApiKey();
          setAdminKey("");
          setAdminKeyError(res.message || "Admin access could not be verified.");
        }
      }
    } catch (err) {
      console.error("Error loading admin applications:", err);
      setVerifications([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeTab, adminKey]);

  const handleApprove = async (appItem: VerificationApplication) => {
    const vendorId = appItem.vendor_id || appItem.id;
    if (!vendorId) return;

    setActionLoadingId(appItem.id);
    setActionMessage(null);
    try {
      const res = await approveMerchant(vendorId, adminKey, "Admin Lead");
      if (res.success) {
        setActionMessage({
          id: appItem.id,
          text: `Approved! ${appItem.business_name} is now live in search & notified on WhatsApp.`,
          type: "success"
        });
        // Optimistically update list
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

  const handleOpenRejectModal = (appItem: VerificationApplication) => {
    setRejectModalItem(appItem);
    setRejectReason("Please provide a clearer video showing your shop sign and goods on shelves.");
  };

  const handleConfirmReject = async () => {
    if (!rejectModalItem) return;
    const vendorId = rejectModalItem.vendor_id || rejectModalItem.id;
    if (!vendorId) return;

    setActionLoadingId(rejectModalItem.id);
    try {
      const res = await rejectMerchant(vendorId, rejectReason.trim(), adminKey);
      if (res.success) {
        setActionMessage({
          id: rejectModalItem.id,
          text: `Application rejected with feedback sent to merchant on WhatsApp.`,
          type: "success"
        });
        setVerifications((prev) =>
          prev.map((item) =>
            item.id === rejectModalItem.id ? { ...item, status: "rejected", rejection_reason: rejectReason } : item
          )
        );
        setRejectModalItem(null);
      } else {
        alert(res.message || "Failed to reject application");
      }
    } catch (err: any) {
      alert(err?.message || "Error submitting rejection");
    } finally {
      setActionLoadingId(null);
    }
  };

  const filteredItems = verifications.filter((v) => {
    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase();
    return (
      v.business_name?.toLowerCase().includes(q) ||
      v.owner_name?.toLowerCase().includes(q) ||
      v.market?.toLowerCase().includes(q) ||
      v.city?.toLowerCase().includes(q) ||
      v.whatsapp?.includes(q)
    );
  });

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
    <div className="min-h-screen bg-[#FAF8F2] text-[#13241F] pb-24 font-sans">
      <SEO
        title="Admin Verification Portal | FLOATE"
        description="Review, approve, and manage physical stall verification submissions across Nigerian commercial markets."
      />

      <DetailHeader
        title="Admin Verification Portal"
        city="Nigeria"
        onBack={onNavigateHome}
      />

      <main className="max-w-5xl mx-auto px-4 pt-6 space-y-6">
        {/* Top Control Bar */}
        <div className="bg-white rounded-3xl border border-[#0A4D3C]/12 p-4 sm:p-5 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-[#E6F4EA] text-[#0A4D3C]">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-base sm:text-lg font-black text-[#13241F]">
                  Merchant Ground Verifications
                </h1>
                <p className="text-xs text-[#5B6E66] font-medium">
                  Review selfie footage & activate stalls in real-time
                </p>
              </div>
            </div>

            <button
              onClick={loadData}
              disabled={isLoading}
              className="px-4 py-2 rounded-full bg-[#FAF8F2] border border-[#0A4D3C]/15 hover:bg-[#E6F4EA] text-xs font-black text-[#0A4D3C] flex items-center justify-center gap-1.5 transition-colors cursor-pointer self-start sm:self-auto"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
              <span>Refresh Queue</span>
            </button>
          </div>

          {/* Tab Filters */}
          <div className="flex items-center gap-2 overflow-x-auto hide-scrollbar pt-1 border-t border-[#0A4D3C]/10">
            <button
              onClick={() => setActiveTab("pending_review")}
              className={`px-4 py-2 rounded-full text-xs font-black whitespace-nowrap transition-all cursor-pointer ${
                activeTab === "pending_review"
                  ? "bg-[#0A4D3C] text-white shadow-sm"
                  : "bg-[#FAF8F2] text-[#5B6E66] hover:text-[#13241F]"
              }`}
            >
              Pending Review
            </button>

            <button
              onClick={() => setActiveTab("approved")}
              className={`px-4 py-2 rounded-full text-xs font-black whitespace-nowrap transition-all cursor-pointer ${
                activeTab === "approved"
                  ? "bg-[#0A4D3C] text-white shadow-sm"
                  : "bg-[#FAF8F2] text-[#5B6E66] hover:text-[#13241F]"
              }`}
            >
              Approved Stalls
            </button>

            <button
              onClick={() => setActiveTab("rejected")}
              className={`px-4 py-2 rounded-full text-xs font-black whitespace-nowrap transition-all cursor-pointer ${
                activeTab === "rejected"
                  ? "bg-[#0A4D3C] text-white shadow-sm"
                  : "bg-[#FAF8F2] text-[#5B6E66] hover:text-[#13241F]"
              }`}
            >
              Rejected
            </button>

            <button
              onClick={() => setActiveTab("all")}
              className={`px-4 py-2 rounded-full text-xs font-black whitespace-nowrap transition-all cursor-pointer ${
                activeTab === "all"
                  ? "bg-[#0A4D3C] text-white shadow-sm"
                  : "bg-[#FAF8F2] text-[#5B6E66] hover:text-[#13241F]"
              }`}
            >
              All Applications
            </button>
          </div>

          {/* Search Input */}
          <div className="relative">
            <Search className="w-4 h-4 text-[#5B6E66] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by stall name, owner, city, market line, or phone..."
              className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-[#FAF8F2] border border-[#0A4D3C]/15 text-xs text-[#13241F] font-bold focus:border-[#0A4D3C]"
            />
          </div>
        </div>

        {/* Applications List */}
        {isLoading ? (
          <LoadingScreen
            fullScreen={false}
            message="Loading Verification Queue..."
            subtitle="Fetching submitted stall applications from compliance database..."
          />
        ) : filteredItems.length === 0 ? (
          <div className="bg-white rounded-3xl border border-[#0A4D3C]/12 p-12 text-center space-y-3 shadow-xs">
            <Store className="w-10 h-10 text-[#5B6E66] mx-auto opacity-60" />
            <h3 className="text-base font-black text-[#13241F]">No Applications Found</h3>
            <p className="text-xs text-[#5B6E66] max-w-sm mx-auto">
              There are currently no verification applications matching the "{activeTab}" filter.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredItems.map((item) => {
              const isActionLoading = actionLoadingId === item.id;
              const hasVideo = !!item.selfie_video_url;
              const photos = item.product_photo_urls || [];
              const messageForThis = actionMessage?.id === item.id ? actionMessage : null;

              return (
                <div
                  key={item.id}
                  className="bg-white rounded-3xl border border-[#0A4D3C]/12 p-5 sm:p-6 shadow-xs space-y-5 hover:shadow-md transition-all"
                >
                  {/* Item Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#0A4D3C]/10 pb-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h2 className="text-base sm:text-lg font-black text-[#13241F]">
                          {item.business_name}
                        </h2>
                        {item.status === "approved" ? (
                          <span className="bg-[#E6F4EA] text-[#0A4D3C] text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3 text-[#10B981]" />
                            <span>Approved & Live</span>
                          </span>
                        ) : item.status === "rejected" ? (
                          <span className="bg-[#FEE2E2] text-[#DC2626] text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full flex items-center gap-1">
                            <XCircle className="w-3 h-3 text-[#DC2626]" />
                            <span>Rejected</span>
                          </span>
                        ) : (
                          <span className="bg-[#FEF3C7] text-[#78350F] text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full flex items-center gap-1">
                            <Clock className="w-3 h-3 text-[#D97706]" />
                            <span>Pending Review</span>
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 text-xs text-[#5B6E66] font-medium flex-wrap">
                        <span className="font-bold text-[#13241F]">Owner: {item.owner_name}</span>
                        <span>·</span>
                        <span className="flex items-center gap-1 text-[#0A4D3C] font-bold">
                          <MapPin className="w-3 h-3" />
                          <span>{item.market}, {item.city}</span>
                        </span>
                        {item.landmark && (
                          <>
                            <span>·</span>
                            <span>Ref: {item.landmark}</span>
                          </>
                        )}
                      </div>
                    </div>

                    <a
                      href={`https://wa.me/${item.whatsapp.replace(/[^0-9]/g, "")}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3.5 py-1.5 rounded-full bg-[#25D366]/10 text-[#128C7E] hover:bg-[#25D366] hover:text-white text-xs font-black flex items-center gap-1.5 transition-colors self-start sm:self-auto cursor-pointer"
                    >
                      <MessageCircle className="w-3.5 h-3.5 fill-current" />
                      <span>{item.whatsapp}</span>
                    </a>
                  </div>

                  {/* Products Description */}
                  {item.products && (
                    <div className="space-y-1">
                      <span className="text-[10px] font-black uppercase tracking-wider text-[#5B6E66]">
                        Products / Inventory
                      </span>
                      <p className="text-xs text-[#13241F] font-bold bg-[#FAF8F2] p-3 rounded-xl border border-[#0A4D3C]/10">
                        {Array.isArray(item.products) ? item.products.join(", ") : item.products}
                      </p>
                    </div>
                  )}

                  {/* Verification Media Preview Track */}
                  <div className="space-y-2">
                    <span className="text-[10px] font-black uppercase tracking-wider text-[#5B6E66] block">
                      Ground Verification Media
                    </span>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {/* Video Clip */}
                      {hasVideo ? (
                        <div
                          onClick={() => setPreviewMedia({ type: "video", url: item.selfie_video_url!, title: `${item.business_name} - Stall Clip` })}
                          className="relative aspect-video sm:aspect-square rounded-2xl overflow-hidden bg-black border-2 border-[#0A4D3C]/25 flex items-center justify-center cursor-pointer group shadow-xs"
                        >
                          <video src={item.selfie_video_url} className="w-full h-full object-cover opacity-80 group-hover:opacity-100" />
                          <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center text-white gap-1 group-hover:scale-105 transition-transform">
                            <Video className="w-6 h-6 text-[#FACC15]" />
                            <span className="text-[10px] font-black uppercase tracking-wider">Play Stall Video</span>
                          </div>
                        </div>
                      ) : (
                        <div className="aspect-square rounded-2xl bg-[#FAF8F2] border border-dashed border-[#0A4D3C]/20 flex flex-col items-center justify-center text-[#5B6E66] text-xs p-2 text-center">
                          <Video className="w-5 h-5 opacity-40 mb-1" />
                          <span className="text-[10px] font-bold">No Video Attached</span>
                        </div>
                      )}

                      {/* Product Photos */}
                      {photos.map((photoUrl, pIdx) => (
                        <div
                          key={pIdx}
                          onClick={() => setPreviewMedia({ type: "image", url: photoUrl, title: `${item.business_name} - Photo ${pIdx + 1}` })}
                          className="relative aspect-square rounded-2xl overflow-hidden bg-[#13241F] border border-[#0A4D3C]/15 cursor-pointer group shadow-xs"
                        >
                          <img src={photoUrl} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                          <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors" />
                          <span className="absolute bottom-1 right-1 p-1 bg-black/60 rounded-md text-white text-[9px] font-bold flex items-center gap-1">
                            <Eye className="w-2.5 h-2.5" />
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Feedback Message if any */}
                  {messageForThis && (
                    <div
                      className={`p-3.5 rounded-2xl text-xs font-bold flex items-center gap-2 ${
                        messageForThis.type === "success"
                          ? "bg-[#E6F4EA] text-[#0A4D3C] border border-[#10B981]/30"
                          : "bg-[#FEE2E2] text-[#DC2626] border border-[#DC2626]/20"
                      }`}
                    >
                      <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                      <span>{messageForThis.text}</span>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="pt-2 border-t border-[#0A4D3C]/10 flex flex-col sm:flex-row items-center justify-between gap-3">
                    <span className="text-[11px] text-[#5B6E66] font-medium">
                      Token Ref: <code className="font-mono bg-[#FAF8F2] px-1.5 py-0.5 rounded text-[#13241F]">{item.id.slice(0, 10)}...</code>
                    </span>

                    <div className="flex items-center gap-2.5 w-full sm:w-auto">
                      <button
                        onClick={() => handleOpenRejectModal(item)}
                        disabled={isActionLoading || item.status === "rejected"}
                        className="flex-1 sm:flex-initial px-4 py-2.5 rounded-full bg-[#FAF8F2] hover:bg-[#FEE2E2] text-[#DC2626] text-xs font-black border border-[#DC2626]/20 transition-colors disabled:opacity-50 cursor-pointer"
                      >
                        Reject & Request Update
                      </button>

                      <button
                        onClick={() => handleApprove(item)}
                        disabled={isActionLoading || item.status === "approved"}
                        className="flex-1 sm:flex-initial px-6 py-2.5 rounded-full bg-[#0A4D3C] hover:bg-[#064E3B] text-white text-xs font-black shadow-md border-2 border-[#13241F] flex items-center justify-center gap-1.5 transition-transform active:scale-95 disabled:opacity-50 cursor-pointer"
                      >
                        {isActionLoading ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <CheckCircle2 className="w-3.5 h-3.5 text-[#10B981]" />
                        )}
                        <span>{item.status === "approved" ? "Approved" : "Approve Stall"}</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Rejection Modal */}
      {rejectModalItem && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-xl border border-[#0A4D3C]/15 animate-arrange-in">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-black text-[#13241F]">
                Reject Verification Application
              </h3>
              <button
                onClick={() => setRejectModalItem(null)}
                className="p-1 rounded-full hover:bg-[#FAF8F2] text-[#5B6E66]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-[#5B6E66] font-medium leading-relaxed">
              Explain clearly to <strong>{rejectModalItem.business_name}</strong> what needs to be fixed. This message will be sent directly to their WhatsApp.
            </p>

            <textarea
              rows={3}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              className="w-full p-3 rounded-xl bg-[#FAF8F2] border border-[#0A4D3C]/15 text-xs text-[#13241F] font-bold focus:border-[#0A4D3C]"
              placeholder="e.g. Please provide a clearer video showing your stall signage."
            />

            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={() => setRejectModalItem(null)}
                className="flex-1 py-3 rounded-full bg-[#FAF8F2] text-[#13241F] text-xs font-black"
              >
                Cancel
              </button>

              <button
                onClick={handleConfirmReject}
                disabled={!rejectReason.trim()}
                className="flex-1 py-3 rounded-full bg-[#DC2626] hover:bg-[#B91C1C] text-white text-xs font-black shadow-md disabled:opacity-50"
              >
                Send Rejection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Media Zoom Modal */}
      {previewMedia && (
        <div
          onClick={() => setPreviewMedia(null)}
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-2xl w-full bg-black rounded-3xl overflow-hidden border border-white/20 p-2"
          >
            <button
              onClick={() => setPreviewMedia(null)}
              className="absolute top-4 right-4 z-10 p-2 rounded-full bg-black/70 text-white hover:bg-black"
            >
              <X className="w-5 h-5" />
            </button>

            {previewMedia.type === "video" ? (
              <video
                src={previewMedia.url}
                controls
                autoPlay
                playsInline
                className="w-full max-h-[75vh] object-contain rounded-2xl"
              />
            ) : (
              <img
                src={previewMedia.url}
                alt={previewMedia.title}
                className="w-full max-h-[75vh] object-contain rounded-2xl"
              />
            )}

            <div className="p-3 text-center text-xs text-white font-bold">
              {previewMedia.title}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
