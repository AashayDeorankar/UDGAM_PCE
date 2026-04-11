/**
 * POST /api/interview/transcribe-local
 * Multipart form-data: audio (file), debug?
 * Requires: ffmpeg installed, VOSK_MODEL_PATH set
 * Returns: { text, latencyMs, raw? }
 */
import { readFileSync, writeFileSync, unlinkSync, mkdtempSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { tmpdir } from "os";
import { spawn } from "child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));

function parseEnv(content) {
  for (const rawLine of content.split("\n")) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const m = line.match(/^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!m) continue;
    let value = m[2].trim();
    if ((value.startsWith("\"") && value.endsWith("\"")) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    process.env[m[1]] = value;
  }
}

function loadEnv() {
  const candidates = [
    join(process.cwd(), ".env"),
    join(process.cwd(), ".env.local"),
    join(__dirname, "..", ".env"),
    join(__dirname, "..", ".env.local"),
  ];
  for (const envPath of candidates) {
    try {
      const content = readFileSync(envPath, "utf-8");
      parseEnv(content);
    } catch (_) {}
  }
}

function getBoundary(contentType) {
  const match = String(contentType || "").match(/boundary=([^;]+)/i);
  if (!match) return null;
  return match[1].replace(/^"|"$/g, "");
}

function splitBuffer(buffer, delimiter) {
  const parts = [];
  let start = 0;
  let index = buffer.indexOf(delimiter, start);
  while (index !== -1) {
    parts.push(buffer.slice(start, index));
    start = index + delimiter.length;
    index = buffer.indexOf(delimiter, start);
  }
  parts.push(buffer.slice(start));
  return parts;
}

function parseMultipart(buffer, contentType) {
  const boundaryStr = getBoundary(contentType);
  if (!boundaryStr) return null;
  const boundary = Buffer.from(`--${boundaryStr}`);
  const parts = splitBuffer(buffer, boundary);
  const files = {};
  const fields = {};

  for (const rawPart of parts) {
    if (!rawPart.length) continue;
    let part = rawPart;
    if (part.slice(0, 2).toString() === "\r\n") part = part.slice(2);
    if (part.slice(-2).toString() === "\r\n") part = part.slice(0, -2);
    const headerEnd = part.indexOf(Buffer.from("\r\n\r\n"));
    if (headerEnd === -1) continue;
    const headerText = part.slice(0, headerEnd).toString("utf8");
    const body = part.slice(headerEnd + 4);
    const headers = {};
    for (const line of headerText.split("\r\n")) {
      const [name, ...rest] = line.split(":");
      if (!name || !rest.length) continue;
      headers[name.toLowerCase()] = rest.join(":").trim();
    }
    const disposition = headers["content-disposition"] || "";
    const nameMatch = disposition.match(/name="([^"]+)"/i);
    if (!nameMatch) continue;
    const fieldName = nameMatch[1];
    const filenameMatch = disposition.match(/filename="([^"]*)"/i);
    if (filenameMatch) {
      files[fieldName] = {
        filename: filenameMatch[1] || "audio.webm",
        contentType: headers["content-type"] || "application/octet-stream",
        data: body,
      };
    } else {
      fields[fieldName] = body.toString("utf8");
    }
  }

  return { files, fields };
}

function runFfmpeg(inputPath, outputPath) {
  return new Promise((resolve, reject) => {
    const args = [
      "-y",
      "-i",
      inputPath,
      "-ac",
      "1",
      "-ar",
      "16000",
      "-f",
      "wav",
      outputPath,
    ];
    const proc = spawn("ffmpeg", args, { stdio: ["ignore", "pipe", "pipe"] });
    let stderr = "";
    proc.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    proc.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(stderr || "ffmpeg failed"));
    });
    proc.on("error", reject);
  });
}

function safeName(name) {
  return String(name || "audio.webm").replace(/[^a-zA-Z0-9._-]/g, "_");
}

export async function handleInterviewTranscribeLocal({ bodyBuffer, contentType }) {
  loadEnv();
  const modelPath = process.env.VOSK_MODEL_PATH || "";
  if (!modelPath) {
    return { statusCode: 200, body: JSON.stringify({ error: "VOSK_MODEL_PATH not set in .env" }) };
  }

  const parsed = parseMultipart(bodyBuffer, contentType);
  if (!parsed) {
    return { statusCode: 400, body: JSON.stringify({ error: "Invalid multipart payload" }) };
  }

  const audioFile = parsed.files.audio || Object.values(parsed.files)[0];
  if (!audioFile) {
    return { statusCode: 400, body: JSON.stringify({ error: "Missing audio file" }) };
  }

  const debug = String(parsed.fields.debug || "").toLowerCase() === "true" || parsed.fields.debug === "1";
  const startedAt = Date.now();

  const dir = mkdtempSync(join(tmpdir(), "transcribe-local-"));
  const inputName = safeName(audioFile.filename);
  const inputPath = join(dir, inputName);
  const wavPath = join(dir, "audio.wav");

  try {
    writeFileSync(inputPath, audioFile.data);
    await runFfmpeg(inputPath, wavPath);

    const vosk = await import("vosk");
    vosk.setLogLevel(0);
    const model = new vosk.Model(modelPath);
    const rec = new vosk.Recognizer({ model, sampleRate: 16000 });

    const wavData = readFileSync(wavPath);
    rec.acceptWaveform(wavData);
    const result = rec.finalResult();

    rec.free();
    model.free();

    const latencyMs = Date.now() - startedAt;
    return {
      statusCode: 200,
      body: JSON.stringify({
        text: result?.text || "",
        latencyMs,
        raw: debug ? result : undefined,
      }),
    };
  } catch (err) {
    return { statusCode: 200, body: JSON.stringify({ error: err?.message || "Local transcription failed" }) };
  } finally {
    try { unlinkSync(inputPath); } catch (_) {}
    try { unlinkSync(wavPath); } catch (_) {}
  }
}
