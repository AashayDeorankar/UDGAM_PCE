/**
 * Lists S3 bucket contents and generates public/branch-materials.json.
 * Run: node scripts/sync-s3-materials.mjs
 * Requires .env with AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION, S3_BUCKET.
 *
 * Expected S3 key structure:
 *   {BranchCode}/notes/...     -> handwrittenNotes
 *   {BranchCode}/ppt/...       -> ppt
 *   {BranchCode}/papers/...    -> prevYearPapers
 * (or ppt/, ppts/, prev-year-papers/ - we normalize)
 */

import { S3Client, ListObjectsV2Command } from "@aws-sdk/client-s3";
import { readFileSync, writeFileSync } from "fs";
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

loadEnv();

const region = process.env.AWS_REGION || "eu-north-1";
const bucket = process.env.S3_BUCKET || "btech-verse";

if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
  console.error("Missing AWS_ACCESS_KEY_ID or AWS_SECRET_ACCESS_KEY in .env");
  process.exit(1);
}

const s3 = new S3Client({ region });

const BRANCH_CODES = [
  "CSE",
  "AI/ML",
  "DS",
  "CS",
  "ECE",
  "EE",
  "ME",
  "CE",
];

function categoryFromPrefix(prefix) {
  const p = (prefix || "").toLowerCase();
  if (p.includes("note")) return "handwrittenNotes";
  if (p.includes("ppt") || p === "ppts") return "ppt";
  if (p.includes("paper") || p.includes("prev") || p.includes("pyq") || p.includes("year"))
    return "prevYearPapers";
  return null;
}

function fileName(key) {
  const parts = key.split("/").filter(Boolean);
  return parts[parts.length - 1] || key;
}

function displayName(key) {
  const name = fileName(key);
  return name.replace(/\.[^.]+$/, "").replace(/[-_]/g, " ");
}

async function listAllKeys() {
  const keys = [];
  let continuationToken;
  do {
    const cmd = new ListObjectsV2Command({
      Bucket: bucket,
      ContinuationToken: continuationToken,
    });
    const out = await s3.send(cmd);
    if (out.Contents) keys.push(...out.Contents.map((o) => o.Key).filter(Boolean));
    continuationToken = out.NextContinuationToken;
  } while (continuationToken);
  return keys;
}

function buildManifest(keys) {
  const baseUrl = `https://${bucket}.s3.${region}.amazonaws.com`;
  const out = {};

  for (const code of BRANCH_CODES) {
    out[code] = {
      handwrittenNotes: [],
      ppt: [],
      prevYearPapers: [],
    };
  }

  for (const key of keys) {
    const parts = key.split("/").filter(Boolean);
    if (parts.length < 2) continue;
    const branch = parts[0];
    const folder = parts[1];
    const cat = categoryFromPrefix(folder);
    if (!cat || !BRANCH_CODES.includes(branch)) continue;

    const url = `${baseUrl}/${key}`;
    const name = displayName(key);
    out[branch][cat].push({ name, url });
  }

  return out;
}

async function main() {
  console.log("Listing S3 bucket:", bucket, "region:", region);
  const keys = await listAllKeys();
  console.log("Found", keys.length, "objects");
  const manifest = buildManifest(keys);
  const outPath = join(__dirname, "..", "public", "branch-materials.json");
  writeFileSync(outPath, JSON.stringify(manifest, null, 2), "utf-8");
  console.log("Wrote", outPath);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
