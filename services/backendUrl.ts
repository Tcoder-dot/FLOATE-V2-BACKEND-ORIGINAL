const configuredBackendUrl =
  import.meta.env.VITE_FLOATE_BACKEND_URL ||
  import.meta.env.NEXT_PUBLIC_FLOATE_BACKEND_URL ||
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.VITE_API_BASE ||
  "https://floate-v2-backend-original.onrender.com";

export const FLOATE_BACKEND_URL = configuredBackendUrl.trim().replace(/\/+$/, "");
