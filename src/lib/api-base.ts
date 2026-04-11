/**
 * Base URL for API (chat, book-session, presign, etc.).
 * In dev we use same origin (Vite proxy). In production we need the backend URL.
 */
const ENV_BASE = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "");

/** Production backend URL – used when env is missing (e.g. Netlify build without var). */
const PRODUCTION_API_BASE = "https://btechverse-hub.onrender.com";

function isLocalOrLanHost(hostname: string): boolean {
  if (!hostname) return false;
  if (hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1") return true;
  if (hostname.endsWith(".local")) return true;

  // RFC1918 private network ranges
  if (/^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(hostname)) return true;
  if (/^192\.168\.\d{1,3}\.\d{1,3}$/.test(hostname)) return true;
  const match172 = hostname.match(/^172\.(\d{1,3})\.\d{1,3}\.\d{1,3}$/);
  if (match172) {
    const secondOctet = Number(match172[1]);
    if (secondOctet >= 16 && secondOctet <= 31) return true;
  }

  return false;
}

export function getApiBase(): string {
  if (ENV_BASE) return ENV_BASE;
  if (typeof window !== "undefined") {
    if (isLocalOrLanHost(window.location.hostname)) return "";
    return PRODUCTION_API_BASE;
  }
  return "";
}
