import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { applicationDefault, cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadEnv() {
  const candidates = [
    join(__dirname, "..", ".env"),
    join(process.cwd(), ".env"),
  ];
  for (const envPath of candidates) {
    try {
      const content = readFileSync(envPath, "utf-8");
      for (const line of content.split("\n")) {
        const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
        if (!m) continue;
        process.env[m[1]] = m[2].replace(/^["']|["']$/g, "").trim();
      }
      return;
    } catch (_) {
      // continue trying other paths
    }
  }
}

function getServiceAccountCredential() {
  const rawJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON || "";
  if (rawJson) {
    try {
      return cert(JSON.parse(rawJson));
    } catch (err) {
      throw new Error(`Invalid FIREBASE_SERVICE_ACCOUNT_JSON: ${String(err?.message || err)}`);
    }
  }

  const projectId = process.env.FIREBASE_PROJECT_ID || "";
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL || "";
  const privateKey = (process.env.FIREBASE_PRIVATE_KEY || "").replace(/\\n/g, "\n");
  if (projectId && clientEmail && privateKey) {
    return cert({ projectId, clientEmail, privateKey });
  }

  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    return applicationDefault();
  }

  throw new Error(
    "Firebase Admin not configured. Set FIREBASE_SERVICE_ACCOUNT_JSON or FIREBASE_PROJECT_ID/FIREBASE_CLIENT_EMAIL/FIREBASE_PRIVATE_KEY.",
  );
}

function getAdminApp() {
  loadEnv();
  const apps = getApps();
  if (apps.length > 0) return apps[0];
  const credential = getServiceAccountCredential();
  return initializeApp({ credential });
}

export function getAdminAuth() {
  return getAuth(getAdminApp());
}

export function getAdminDb() {
  return getFirestore(getAdminApp());
}

export function extractBearerToken(authorizationHeader) {
  const value = String(authorizationHeader || "").trim();
  const m = value.match(/^Bearer\s+(.+)$/i);
  return m ? m[1].trim() : "";
}
