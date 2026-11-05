/**
 * Verification & Admin Management API Service
 * Handles Merchant WhatsApp Onboarding Verification & Admin Review Actions
 */
import { FLOATE_BACKEND_URL } from "./backendUrl";

export interface VerificationSessionData {
  success: boolean;
  valid?: boolean;
  token?: string;
  vendor_id?: string;
  owner_name?: string;
  business_name?: string;
  market?: string;
  city?: string;
  landmark?: string;
  whatsapp?: string;
  phone?: string;
  businessName?: string;
  ownerFullName?: string;
  businessModel?: string;
  shopAddress?: string;
  marketLocation?: string;
  ref?: string;
  products?: string | string[];
  status?: "pending" | "submitted" | "approved" | "rejected" | string;
  message?: string;
  expires_at?: string | number;
}

export interface VerificationSubmissionPayload {
  token: string;
  owner_name: string;
  business_name: string;
  market: string;
  city: string;
  landmark?: string;
  products: string | string[];
  whatsapp: string;
  selfie_video_url: string;
  product_photo_urls: string[];
}

export interface VerificationApplication {
  id: string;
  vendor_id?: string;
  token?: string;
  owner_name: string;
  business_name: string;
  market: string;
  city: string;
  landmark?: string;
  business_model?: string;
  description?: string;
  portfolio_url?: string;
  profile_photo_url?: string;
  evidence_photo_url?: string;
  gps_coords?: { lat?: number; lng?: number } | null;
  product?: string;
  price?: string;
  verification_status?: string;
  products: string | string[];
  whatsapp: string;
  selfie_video_url?: string;
  product_photo_urls?: string[];
  status: "pending_review" | "approved" | "rejected" | "submitted" | string;
  submitted_at?: string | number;
  reviewed_at?: string | number;
  reviewer_name?: string;
  rejection_reason?: string;
  created_at?: string | number;
}

export interface AdminVerificationsResponse {
  success: boolean;
  verifications?: VerificationApplication[];
  applications?: VerificationApplication[];
  total?: number;
  message?: string;
}

export const BASE_URL = FLOATE_BACKEND_URL;
const ADMIN_API_KEY_STORAGE = "floate_admin_api_key";

export function getAdminApiKey(): string {
  try {
    return sessionStorage.getItem(ADMIN_API_KEY_STORAGE) || "";
  } catch {
    return "";
  }
}

export function saveAdminApiKey(adminKey: string): void {
  try {
    sessionStorage.setItem(ADMIN_API_KEY_STORAGE, adminKey);
  } catch {}
}

export function clearAdminApiKey(): void {
  try {
    sessionStorage.removeItem(ADMIN_API_KEY_STORAGE);
  } catch {}
}

/**
 * Robust fetch helper that checks remote backend and handles CORS/credentials/fallbacks
 */
async function fetchWithFallback(urlPath: string, options?: RequestInit): Promise<Response> {
  const fullUrl = urlPath.startsWith("http") ? urlPath : `${BASE_URL}${urlPath.startsWith("/") ? urlPath : "/" + urlPath}`;

  const mergedOptions: RequestInit = {
    credentials: "include",
    ...options,
    headers: {
      "Accept": "application/json",
      ...(options?.headers || {})
    }
  };

  try {
    const res = await fetch(fullUrl, mergedOptions);
    return res;
  } catch (err) {
    // If direct remote call fails, try proxying through local endpoint
    if (!urlPath.startsWith("http") && !urlPath.startsWith("/api/proxy")) {
      const localProxyUrl = `/api/proxy?url=${encodeURIComponent(fullUrl)}`;
      try {
        return await fetch(localProxyUrl, mergedOptions);
      } catch (proxyErr) {
        console.warn(`[VerificationApi] Fallback fetch failed for ${fullUrl}:`, proxyErr);
      }
    }
    throw err;
  }
}

export interface VisualVerificationSessionParams {
  token?: string;
  ref?: string;
  phone?: string;
}

export interface VisualVerificationPayload {
  token?: string;
  ref?: string;
  phone: string;
  verificationType: "STOREFRONT_SIGNBOARD" | "INVENTORY_SHELF" | "KYC_SELLER_FACE" | "PERMIT_CAC" | string;
  photoBase64: string;
  notes?: string;
  gpsCoords?: {
    latitude: number;
    longitude: number;
    accuracy?: number;
    address?: string;
  } | null;
}

export interface VisualVerificationResponse {
  success: boolean;
  message?: string;
  status?: string;
  badgeUrl?: string;
  phone?: string;
  verification_id?: string;
}

/**
 * 1. Fetch & Validate Verification Session Token
 * GET /api/verify/session?token={token}&ref={ref}&phone={phone}
 */
export async function getVerificationSession(paramsOrToken: string | VisualVerificationSessionParams): Promise<VerificationSessionData> {
  let token = "";
  let ref = "";
  let phone = "";

  if (typeof paramsOrToken === "string") {
    token = paramsOrToken.trim();
  } else if (paramsOrToken && typeof paramsOrToken === "object") {
    token = (paramsOrToken.token || "").trim();
    ref = (paramsOrToken.ref || "").trim();
    phone = (paramsOrToken.phone || "").trim();
  }

  const queryParams = new URLSearchParams();
  if (token) queryParams.set("token", token);
  if (ref) queryParams.set("ref", ref);
  if (phone) queryParams.set("phone", phone);

  const qs = queryParams.toString();
  const endpoints = [
    `/api/verify/session${qs ? `?${qs}` : ""}`,
    `/verify/session${qs ? `?${qs}` : ""}`,
    `/api/v1/verify/session${qs ? `?${qs}` : ""}`
  ];

  for (const endpoint of endpoints) {
    try {
      const res = await fetchWithFallback(endpoint);
      if (res.ok) {
        const data = await res.json();
        const session = data.session || data;
        return {
          ...data,
          ...session,
          business_name: session.business_name || session.businessName || "",
          owner_name: session.owner_name || session.ownerFullName || "",
          market: session.market || session.marketLocation || "",
          whatsapp: session.whatsapp || session.phone || "",
          phone: session.phone || session.whatsapp || phone,
          valid: data.valid ?? true
        };
      }
    } catch (e) {
      // try next endpoint
    }
  }

  // Graceful fallback for offline / mock testing
  return {
    success: false,
    valid: false,
    token,
    phone,
    status: "unavailable",
    message: "Could not validate this verification session with Floate. Please retry."
  };
}

/**
 * Visual Verification Photo Proof Submission Protocol
 * POST /api/verify/submit-visual with { token, ref, phone, verificationType, photoBase64, notes, gpsCoords }
 */
export async function submitVisualVerification(payload: VisualVerificationPayload): Promise<VisualVerificationResponse> {
  const body = JSON.stringify({
    token: payload.token || "",
    ref: payload.ref || "",
    phone: payload.phone,
    verificationType: payload.verificationType || "STOREFRONT_SIGNBOARD",
    photoBase64: payload.photoBase64,
    notes: payload.notes || "",
    gpsCoords: payload.gpsCoords || null
  });

  const endpoints = [
    `/api/verify/submit-visual`,
    `/verify/submit-visual`,
    `/api/v1/verify/submit-visual`
  ];

  for (const endpoint of endpoints) {
    try {
      const res = await fetchWithFallback(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body
      });
      if (res.ok) {
        return await res.json();
      }
    } catch (err) {}
  }

  // Local fallback simulation if offline
  return {
    success: false,
    status: "unavailable",
    message: "Verification proof could not be submitted. Please retry when the backend is available."
  };
}

/**
 * 2. Submit Merchant Verification Application
 * POST /verify/submit
 */
export async function submitVerification(payload: VerificationSubmissionPayload): Promise<{
  success: boolean;
  message?: string;
  vendor_id?: string;
  status?: string;
}> {
  try {
    // Try /verify/submit
    let res = await fetchWithFallback(`/verify/submit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (!res.ok && res.status === 404) {
      res = await fetchWithFallback(`/api/v1/verify/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
    }

    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      return { success: true, ...data };
    }
    return {
      success: false,
      message: data.message || `Submission failed with status ${res.status}`
    };
  } catch (err: any) {
    console.error("Error submitting verification:", err);
    return {
      success: false,
      message: err?.message || "Network error submitting verification application"
    };
  }
}

/**
 * 3. List All Pending & Filtered Applications (Admin)
 * GET /api/v1/admin/verifications?status=...
 */
export async function getAdminVerifications(status: string, adminKey: string): Promise<AdminVerificationsResponse> {
  try {
    const url = status && status !== "all" 
      ? `/api/v1/admin/verifications?status=${encodeURIComponent(status)}`
      : `/api/v1/admin/verifications`;

    const res = await fetchWithFallback(url, { headers: { "x-admin-api-key": adminKey } });
    if (res.ok) {
      const data = await res.json();
      return {
        success: true,
        verifications: data.verifications || data.applications || (Array.isArray(data) ? data : []),
        total: data.total || (Array.isArray(data.verifications) ? data.verifications.length : 0)
      };
    }
    const errData = await res.json().catch(() => ({}));
    return {
      success: false,
      verifications: [],
      message: errData.error || errData.message || `Failed to fetch applications (Status ${res.status})`
    };
  } catch (err: any) {
    console.error("Error loading admin verifications:", err);
    return {
      success: false,
      verifications: [],
      message: err?.message || "Network error loading applications"
    };
  }
}

/**
 * 4. Approve a Store (Instant Search Activation + WhatsApp Notification)
 * POST /api/v1/admin/verifications/:vendorId/approve
 */
export async function approveMerchant(vendorId: string, adminKey: string, reviewerName: string = "Admin"): Promise<{
  success: boolean;
  message?: string;
  vendor?: any;
}> {
  try {
    const res = await fetchWithFallback(`/api/v1/admin/verifications/${encodeURIComponent(vendorId)}/approve`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-admin-api-key": adminKey },
      body: JSON.stringify({ reviewer_name: reviewerName })
    });

    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      return { success: true, ...data };
    }
    return {
      success: false,
      message: data.message || `Failed to approve merchant (${res.status})`
    };
  } catch (err: any) {
    console.error("Error approving merchant:", err);
    return {
      success: false,
      message: err?.message || "Network error approving merchant"
    };
  }
}

/**
 * 5. Reject an Application with Reason
 * POST /api/v1/admin/verifications/:vendorId/reject
 */
export async function rejectMerchant(vendorId: string, reason: string, adminKey: string): Promise<{
  success: boolean;
  message?: string;
}> {
  try {
    const res = await fetchWithFallback(`/api/v1/admin/verifications/${encodeURIComponent(vendorId)}/reject`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-admin-api-key": adminKey },
      body: JSON.stringify({ reason })
    });

    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      return { success: true, ...data };
    }
    return {
      success: false,
      message: data.message || `Failed to reject merchant (${res.status})`
    };
  } catch (err: any) {
    console.error("Error rejecting merchant:", err);
    return {
      success: false,
      message: err?.message || "Network error rejecting merchant"
    };
  }
}
