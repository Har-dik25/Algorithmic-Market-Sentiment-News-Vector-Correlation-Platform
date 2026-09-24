/**
 * Production-ready API configuration helper
 * In development, points to local FastAPI backend (http://127.0.0.1:8000).
 * In production, uses NEXT_PUBLIC_API_URL if configured, or falls back to relative/proxy.
 */
export function getApiBaseUrl(): string {
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL.replace(/\/$/, "");
  }
  if (typeof window !== "undefined") {
    if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") {
      return "http://127.0.0.1:8000";
    }
    // In cloud deployment (e.g. Vercel, Render), if NEXT_PUBLIC_API_URL is unset,
    // use relative path or configured proxy
    return "";
  }
  return process.env.INTERNAL_API_URL || "http://127.0.0.1:8000";
}
