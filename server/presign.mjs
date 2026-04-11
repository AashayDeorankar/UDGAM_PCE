/**
 * S3 presigned URL – use from api.mjs or Vite dev server.
 * Loads .env from project root.
 */
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadEnv() {
  const envPath = join(__dirname, "..", ".env");
  try {
    const content = readFileSync(envPath, "utf-8");
    for (const line of content.split("\n")) {
      const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
      if (m) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "").trim();
    }
  } catch (_) {}
}

function parseS3Url(url) {
  if (!url || typeof url !== "string") return null;
  try {
    const u = new URL(url);
    const host = u.hostname.toLowerCase();
    const pathname = u.pathname.replace(/^\/+/, "");
    const vhostMatch = host.match(/^(.+)\.s3(?:[.-]([a-z0-9-]+))?\.amazonaws\.com$/);
    if (vhostMatch) {
      const bucket = vhostMatch[1];
      const regionFromHost = vhostMatch[2] || null;
      const key = pathname ? decodeURIComponent(pathname) : "";
      if (!key) return null;
      return { bucket, key, region: regionFromHost };
    }
    if (host.startsWith("s3.") && host.endsWith(".amazonaws.com")) {
      const regionFromHost = host.replace(/^s3\./, "").replace(/\.amazonaws\.com$/, "") || null;
      const parts = pathname.split("/").filter(Boolean);
      if (parts.length >= 2) {
        const bucket = decodeURIComponent(parts[0]);
        const key = parts.slice(1).map(decodeURIComponent).join("/");
        return { bucket, key, region: regionFromHost };
      }
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Returns presigned URL for the given S3 URL, or the same URL if not S3.
 * @param {string} rawUrl
 * @returns {Promise<{ url: string }>}
 */
export async function getPresignedUrl(rawUrl) {
  loadEnv();
  const AWS_ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID || "";
  const AWS_SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY || "";
  const AWS_REGION = process.env.AWS_REGION || "eu-north-1";

  const s3Params = parseS3Url(rawUrl);
  if (!s3Params) return { url: rawUrl };

  if (!AWS_ACCESS_KEY_ID || !AWS_SECRET_ACCESS_KEY) {
    throw new Error("S3 credentials not configured");
  }

  const { S3Client, GetObjectCommand } = await import("@aws-sdk/client-s3");
  const { getSignedUrl } = await import("@aws-sdk/s3-request-presigner");
  const region = s3Params.region || AWS_REGION;
  const client = new S3Client({
    region,
    credentials: { accessKeyId: AWS_ACCESS_KEY_ID, secretAccessKey: AWS_SECRET_ACCESS_KEY },
  });
  const command = new GetObjectCommand({
    Bucket: s3Params.bucket,
    Key: s3Params.key,
    ResponseContentDisposition: "inline",
  });
  const signedUrl = await getSignedUrl(client, command, { expiresIn: 3600 });
  return { url: signedUrl };
}

/** Firestore category → S3 folder name (matches sync-s3-materials) */
const CATEGORY_TO_S3_FOLDER = {
  "Handwritten-Notes": "notes",
  "PPTs": "ppt",
  "Previous-Year-Papers": "papers",
};

/**
 * Get presigned PUT URL for admin upload. Returns uploadUrl (PUT file here) and fileUrl (store in Firestore; presign GET later).
 * @param {{ branchCode: string, category: string, fileName: string, contentType?: string }} opts
 * @returns {Promise<{ uploadUrl: string, fileUrl: string }>}
 */
export async function getUploadPresignedUrl(opts) {
  loadEnv();
  const AWS_ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID || "";
  const AWS_SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY || "";
  const AWS_REGION = process.env.AWS_REGION || "eu-north-1";
  const S3_BUCKET = process.env.S3_BUCKET || "btech-verse";

  if (!AWS_ACCESS_KEY_ID || !AWS_SECRET_ACCESS_KEY) {
    throw new Error("S3 credentials not configured");
  }

  const folder = CATEGORY_TO_S3_FOLDER[opts.category] || "notes";
  const safeName = (opts.fileName || "file").replace(/[^a-zA-Z0-9._-]/g, "_");
  const key = `${opts.branchCode}/${folder}/${Date.now()}_${safeName}`;

  const { S3Client, PutObjectCommand } = await import("@aws-sdk/client-s3");
  const { getSignedUrl } = await import("@aws-sdk/s3-request-presigner");
  const client = new S3Client({
    region: AWS_REGION,
    credentials: { accessKeyId: AWS_ACCESS_KEY_ID, secretAccessKey: AWS_SECRET_ACCESS_KEY },
  });
  const command = new PutObjectCommand({
    Bucket: S3_BUCKET,
    Key: key,
    ContentType: opts.contentType || "application/octet-stream",
  });
  const uploadUrl = await getSignedUrl(client, command, { expiresIn: 3600 });
  const fileUrl = `https://${S3_BUCKET}.s3.${AWS_REGION}.amazonaws.com/${key}`;
  return { uploadUrl, fileUrl };
}
