/**
 * Base URL for API (chat, book-session, presign, etc.).
 * In dev we use same origin (Vite proxy). In production we need the backend URL.
 */
const ENV_BASE = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "");

/** Production backend URL – used when env is missing (e.g. Netlify build without var). */
const PRODUCTION_API_BASE = "https://btechverse-hub.onrender.com";

export function getApiBase(): string {
  if (ENV_BASE) return ENV_BASE;
  if (typeof window !== "undefined" && !window.location.hostname.includes("localhost")) {
    return PRODUCTION_API_BASE;
  }
  return "";
}
