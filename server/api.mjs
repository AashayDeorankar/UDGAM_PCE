/**
 * Dev API server: /api/presign (S3) and POST /api/chat (OpenRouter).
 * Run: npm run dev:api (port 3001). Vite proxies /api to this when you run npm run dev.
 */
import http from "http";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));

function parseEnv(content) {
  for (const rawLine of content.split("\n")) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const m = line.match(/^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!m) continue;
    let value = m[2].trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
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

loadEnv();

// Render/Railway set PORT; local dev uses CHAT_API_PORT or 3001
const PORT = Number(process.env.PORT) || Number(process.env.CHAT_API_PORT) || 3001;
const { getPresignedUrl, getUploadPresignedUrl, getProfileUploadPresignedUrl } = await import("./presign.mjs");
const { handleChat } = await import("./chat.mjs");
const { handleBookSession } = await import("./book-session.mjs");
const { handleRunCode } = await import("./run-code.mjs");
const { handleMatchmaking } = await import("./matchmaking.mjs");

const { handleInterviewStart, handleInterviewMessage, handleInterviewQuestions, handleInterviewEvaluation, handleInterviewReport, handleInterviewSubmit, handleDashboardSummary } = await import("./interview.mjs");
const { handleFeedback } = await import("./feedback.mjs");
const { getUserSummary, getAdminSummary } = await import("./analytics.mjs");
const { setupSocketServer } = await import("./socket.mjs");
const { getAdminAuth, extractBearerToken } = await import("./firebase-admin.mjs");
const { handleWelcomeEmail } = await import("./welcome-email.mjs");

const server = http.createServer(async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    res.writeHead(200);
    res.end();
    return;
  }

  const rawUrl = req.url || "";
  let pathname = rawUrl.split("?")[0] || "/";
  if (pathname.startsWith("http://") || pathname.startsWith("https://")) {
    try {
      pathname = new URL(pathname).pathname;
    } catch (_) {}
  }
  pathname = pathname.replace(/\/+/g, "/").replace(/\/$/, "") || "/";
  const query = Object.fromEntries(new URL(rawUrl.startsWith("http") ? rawUrl : "http://x" + rawUrl).searchParams);

  const isBookSession = pathname === "/api/book-session" || pathname.endsWith("/book-session");

  // POST /api/book-session – check first, exact path
  if ((req.method || "").toUpperCase() === "POST" && isBookSession) {
    console.log("[api] POST /api/book-session");
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const body = Buffer.concat(chunks).toString("utf8") || "{}";
    try {
      const out = await handleBookSession(body, {
        authorization: req.headers.authorization || "",
      });
      res.writeHead(out.statusCode, { "Content-Type": "application/json" });
      res.end(out.body);
    } catch (err) {
      console.error("[book-session]", err);
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: String(err?.message || err) }));
    }
    return;
  }

  // GET /api/presign?url=...
  if (req.method === "GET" && pathname.includes("presign")) {
    const rawUrl = query.url;
    if (!rawUrl) {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Missing url query" }));
      return;
    }
    try {
      const { url } = await getPresignedUrl(rawUrl);
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ url }));
    } catch (err) {
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: String(err?.message || err) }));
    }
    return;
  }

  // POST /api/chat (OpenRouter) – exact path so /api/book-session doesn't match
  if (pathname === "/api/chat" && (req.method || "").toUpperCase() === "POST") {
    let body = "";
    for await (const chunk of req) body += chunk;
    const out = await handleChat(body);
    res.writeHead(out.statusCode, { "Content-Type": "application/json" });
    res.end(out.body);
    return;
  }

  // POST /api/upload-presign – S3 presigned PUT for admin upload
  if (pathname === "/api/upload-presign" && (req.method || "").toUpperCase() === "POST") {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const body = Buffer.concat(chunks).toString("utf8") || "{}";
    try {
      const data = JSON.parse(body);
      const { uploadUrl, fileUrl } = await getUploadPresignedUrl({
        branchCode: data.branchCode,
        category: data.category,
        fileName: data.fileName,
        contentType: data.contentType,
      });
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ uploadUrl, fileUrl }));
    } catch (err) {
      console.error("[upload-presign]", err);
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: String(err?.message || err) }));
    }
    return;
  }

  // POST /api/profile-upload-presign – S3 presigned PUT for profile image upload
  if (pathname === "/api/profile-upload-presign" && (req.method || "").toUpperCase() === "POST") {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const body = Buffer.concat(chunks).toString("utf8") || "{}";
    try {
      const token = extractBearerToken(req.headers.authorization || "");
      if (!token) {
        res.writeHead(401, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Missing auth token" }));
        return;
      }

      const decoded = await getAdminAuth().verifyIdToken(token, true);
      const data = JSON.parse(body);
      const { uploadUrl, fileUrl } = await getProfileUploadPresignedUrl({
        userId: decoded.uid,
        fileName: data.fileName,
        contentType: data.contentType,
      });
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ uploadUrl, fileUrl }));
    } catch (err) {
      console.error("[profile-upload-presign]", err);
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: String(err?.message || err) }));
    }
    return;
  }

  // POST /api/run-code – run Python (and optionally other langs) on server
  if (pathname === "/api/run-code" && (req.method || "").toUpperCase() === "POST") {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const body = Buffer.concat(chunks).toString("utf8") || "{}";
    try {
      const out = await handleRunCode(body);
      res.writeHead(out.statusCode, { "Content-Type": "application/json" });
      res.end(out.body);
    } catch (err) {
      console.error("[run-code]", err);
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: String(err?.message || err) }));
    }
    return;
  }

  // POST /api/matchmaking – AI mentor matcher
  if (pathname === "/api/matchmaking" && (req.method || "").toUpperCase() === "POST") {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const body = Buffer.concat(chunks).toString("utf8") || "{}";
    try {
      const out = await handleMatchmaking(body);
      res.writeHead(out.statusCode, { "Content-Type": "application/json" });
      res.end(out.body);
    } catch (err) {
      console.error("[matchmaking]", err);
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: String(err?.message || err) }));
    }
    return;
  }

  // POST /api/welcome-email – send welcome email to new user
  if (pathname === "/api/welcome-email" && (req.method || "").toUpperCase() === "POST") {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const body = Buffer.concat(chunks).toString("utf8") || "{}";
    try {
      const out = await handleWelcomeEmail(body, {
        authorization: req.headers.authorization || "",
      });
      res.writeHead(out.statusCode, { "Content-Type": "application/json" });
      res.end(out.body);
    } catch (err) {
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: String(err?.message || err) }));
    }
    return;
  }

  // POST /api/interview/start – start mock interview session
  if (pathname === "/api/interview/start" && (req.method || "").toUpperCase() === "POST") {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const body = Buffer.concat(chunks).toString("utf8") || "{}";
    try {
      const out = await handleInterviewStart(body);
      res.writeHead(out.statusCode, { "Content-Type": "application/json" });
      res.end(out.body);
    } catch (err) {
      console.error("[interview/start]", err);
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: String(err?.message || err) }));
    }
    return;
  }

  // POST /api/interview/message – continue mock interview session
  if (pathname === "/api/interview/message" && (req.method || "").toUpperCase() === "POST") {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const body = Buffer.concat(chunks).toString("utf8") || "{}";
    try {
      const out = await handleInterviewMessage(body);
      res.writeHead(out.statusCode, { "Content-Type": "application/json" });
      res.end(out.body);
    } catch (err) {
      console.error("[interview/message]", err);
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: String(err?.message || err) }));
    }
    return;
  }

  // POST /api/interview/questions – generate interview questions
  if (pathname === "/api/interview/questions" && (req.method || "").toUpperCase() === "POST") {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const body = Buffer.concat(chunks).toString("utf8") || "{}";
    try {
      const out = await handleInterviewQuestions(body);
      res.writeHead(out.statusCode, { "Content-Type": "application/json" });
      res.end(out.body);
    } catch (err) {
      console.error("[interview/questions]", err);
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: String(err?.message || err) }));
    }
    return;
  }


  if (pathname === "/api/interview/evaluate" && (req.method || "").toUpperCase() === "POST") {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const body = Buffer.concat(chunks).toString("utf8") || "{}";
    try {

      const out = await handleInterviewEvaluation(body);
      res.writeHead(out.statusCode, { "Content-Type": "application/json" });
      res.end(out.body);
    } catch (err) {
      console.error("[interview/evaluate]", err);
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: String(err?.message || err) }));
    }
    return;
  }


  // POST /api/interview/report – final report generation
  if (pathname === "/api/interview/report" && (req.method || "").toUpperCase() === "POST") {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const body = Buffer.concat(chunks).toString("utf8") || "{}";
    try {
      const out = await handleInterviewReport(body);
      res.writeHead(out.statusCode, { "Content-Type": "application/json" });
      res.end(out.body);
    } catch (err) {
      console.error("[interview/report]", err);
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: String(err?.message || err) }));
    }
    return;
  }

  // POST /api/interview/submit – evaluate full interview
  if (pathname === "/api/interview/submit" && (req.method || "").toUpperCase() === "POST") {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const body = Buffer.concat(chunks).toString("utf8") || "{}";
    try {
      const out = await handleInterviewSubmit(body);
      res.writeHead(out.statusCode, { "Content-Type": "application/json" });
      res.end(out.body);
    } catch (err) {
      console.error("[interview/submit]", err);
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: String(err?.message || err) }));
    }
    return;
  }

  // POST /api/dashboard/summary – aggregate performance summary
  if (pathname === "/api/dashboard/summary" && (req.method || "").toUpperCase() === "POST") {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const body = Buffer.concat(chunks).toString("utf8") || "{}";
    try {
      const out = await handleDashboardSummary(body);
      res.writeHead(out.statusCode, { "Content-Type": "application/json" });
      res.end(out.body);
    } catch (err) {
      console.error("[dashboard/summary]", err);
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: String(err?.message || err) }));
    }
    return;
  }

  // POST /api/feedback – structured feedback
  if (pathname === "/api/feedback" && (req.method || "").toUpperCase() === "POST") {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const body = Buffer.concat(chunks).toString("utf8") || "{}";
    try {
      const out = await handleFeedback(body);
      res.writeHead(out.statusCode, { "Content-Type": "application/json" });
      res.end(out.body);
    } catch (err) {
      console.error("[feedback]", err);
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: String(err?.message || err) }));
    }
    return;
  }

  // POST /api/personal-analysis – resume + GitHub + LeetCode
  if (pathname === "/api/personal-analysis" && (req.method || "").toUpperCase() === "POST") {
    try {
      const summary = await handlePersonalAnalysis(req);
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(summary));
    } catch (err) {
      console.error("[personal-analysis]", err);
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: String(err?.message || err) }));
    }
    return;
  }

  // GET /api/analytics?userId=... – user summary
  if (pathname === "/api/analytics" && req.method === "GET") {
    const userId = query.userId || "anonymous";
    try {
      const summary = getUserSummary(userId);
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(summary));
    } catch (err) {
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: String(err?.message || err) }));
    }
    return;
  }

  // GET /api/analytics/admin – admin summary
  if (pathname === "/api/analytics/admin" && req.method === "GET") {
    try {
      const summary = getAdminSummary();
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(summary));
    } catch (err) {
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: String(err?.message || err) }));
    }
    return;
  }

  // GET /api/mentor-image?url=... – proxy image so LinkedIn hotlink block is bypassed
  if (req.method === "GET" && pathname === "/api/mentor-image") {
    const imageUrl = query.url;
    if (!imageUrl || !/^https:\/\/(media\.licdn\.com|[\w.-]+\.licdn\.com)/i.test(imageUrl)) {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Invalid url" }));
      return;
    }
    try {
      const resp = await fetch(imageUrl, {
        redirect: "follow",
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Accept": "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
          "Referer": "https://www.linkedin.com/",
          "Sec-Fetch-Dest": "image",
          "Sec-Fetch-Mode": "no-cors",
        },
      });
      if (!resp.ok) {
        res.writeHead(502, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Image fetch failed" }));
        return;
      }
      const contentType = resp.headers.get("content-type") || "image/jpeg";
      res.setHeader("Content-Type", contentType);
      res.setHeader("Cache-Control", "public, max-age=86400");
      const buf = await resp.arrayBuffer();
      res.writeHead(200);
      res.end(Buffer.from(buf));
    } catch (err) {
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: String(err?.message || err) }));
    }
    return;
  }

  res.writeHead(404, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ error: "Not found" }));
});

setupSocketServer(server);

server.listen(PORT, () => {
  console.log(`API: http://localhost:${PORT} (presign + chat + book-session)`);
}).on("error", (err) => {
  if (err.code === "EADDRINUSE") {
    console.error(`Port ${PORT} in use. Run: kill $(lsof -t -i:${PORT})`);
    process.exit(1);
  }
  throw err;
});
