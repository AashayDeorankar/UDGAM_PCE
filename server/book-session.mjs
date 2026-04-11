/**
 * Sends Book Session form as email (Resend) + WhatsApp (Twilio) to admin and mentor.
 * Requires: RESEND_API_KEY, BOOK_SESSION_ADMIN_EMAIL.
 * Optional WhatsApp: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_FROM, BOOK_SESSION_ADMIN_WHATSAPP.
 * Loads .env so it works when run from Vite dev server (npm run dev) or api.mjs (npm run dev:api).
 */
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { Resend } from "resend";

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadEnv() {
  const paths = [
    join(__dirname, "..", ".env"),
    join(process.cwd(), ".env"),
  ];
  for (const envPath of paths) {
    try {
      const content = readFileSync(envPath, "utf-8");
      for (const line of content.split("\n")) {
        const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
        if (m) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "").trim();
      }
      return;
    } catch (_) {}
  }
}

function getEnvPath() {
  const paths = [join(__dirname, "..", ".env"), join(process.cwd(), ".env")];
  for (const p of paths) {
    try {
      readFileSync(p, "utf-8");
      return p;
    } catch (_) {}
  }
  return null;
}

loadEnv();

function getBookSessionEnv() {
  loadEnv();
  return {
    RESEND_API_KEY: process.env.RESEND_API_KEY || "",
    BOOK_SESSION_ADMIN_EMAIL: process.env.BOOK_SESSION_ADMIN_EMAIL || "",
    RESEND_FROM_EMAIL: process.env.RESEND_FROM_EMAIL || "TechPrep <onboarding@resend.dev>",
    BOOK_SESSION_ADMIN_WHATSAPP: process.env.BOOK_SESSION_ADMIN_WHATSAPP || "",
    TWILIO_WHATSAPP_FROM: process.env.TWILIO_WHATSAPP_FROM || "",
    TWILIO_ACCOUNT_SID: process.env.TWILIO_ACCOUNT_SID || "",
    TWILIO_AUTH_TOKEN: process.env.TWILIO_AUTH_TOKEN || "",
  };
}


function buildEmailBody(data) {
  const { mentorName, name, year, phone, email, reasonToConnect } = data;
  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Book Session Request</title></head>
<body style="font-family: system-ui, sans-serif; line-height: 1.6; color: #333; max-width: 560px; margin: 0 auto; padding: 20px;">
  <h2 style="color: #0f766e;">New session request – ${mentorName}</h2>
  <p>A student has requested to book a session. Details below.</p>
  <table style="width: 100%; border-collapse: collapse;">
    <tr><td style="padding: 8px 0; border-bottom: 1px solid #eee;"><strong>Mentor</strong></td><td style="padding: 8px 0; border-bottom: 1px solid #eee;">${mentorName}</td></tr>
    <tr><td style="padding: 8px 0; border-bottom: 1px solid #eee;"><strong>Name</strong></td><td style="padding: 8px 0; border-bottom: 1px solid #eee;">${name}</td></tr>
    <tr><td style="padding: 8px 0; border-bottom: 1px solid #eee;"><strong>Year</strong></td><td style="padding: 8px 0; border-bottom: 1px solid #eee;">${year}</td></tr>
    <tr><td style="padding: 8px 0; border-bottom: 1px solid #eee;"><strong>Phone</strong></td><td style="padding: 8px 0; border-bottom: 1px solid #eee;">${phone}</td></tr>
    <tr><td style="padding: 8px 0; border-bottom: 1px solid #eee;"><strong>Email</strong></td><td style="padding: 8px 0; border-bottom: 1px solid #eee;">${email}</td></tr>
    <tr><td style="padding: 8px 0; border-bottom: 1px solid #eee;"><strong>Reason to connect</strong></td><td style="padding: 8px 0; border-bottom: 1px solid #eee;">${reasonToConnect}</td></tr>
  </table>
  <p style="margin-top: 24px; font-size: 14px; color: #666;">Sent from TechPrep Book Session form.</p>
</body>
</html>`;
  const text = [
    `New session request – ${mentorName}`,
    "",
    "Mentor: " + mentorName,
    "Name: " + name,
    "Year: " + year,
    "Phone: " + phone,
    "Email: " + email,
    "Reason to connect: " + reasonToConnect,
    "",
    "Sent from TechPrep Book Session form.",
  ].join("\n");
  return { html, text };
}

/** Same message as plain text for WhatsApp (no HTML) */
function buildWhatsAppMessage(data) {
  const { mentorName, name, year, phone, email, reasonToConnect } = data;
  return [
    "📌 *New session request – " + mentorName + "*",
    "",
    "Mentor: " + mentorName,
    "Name: " + name,
    "Year: " + year,
    "Phone: " + phone,
    "Email: " + email,
    "Reason: " + reasonToConnect,
    "",
    "— TechPrep Book Session",
  ].join("\n");
}

/**
 * Resend expects from = "email@domain.com" or "Name <email@domain.com>".
 * Normalize env value (strip quotes, fix format) so it always passes validation.
 */
function normalizeFromEmail(raw) {
  const s = String(raw || "").trim().replace(/^["']|["']$/g, "").trim();
  if (!s) return "TechPrep <onboarding@resend.dev>";
  const match = s.match(/<([^>]+)>/);
  const email = match ? match[1].trim() : s.includes("@") ? s : "";
  if (email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    const name = match ? s.replace(/<[^>]+>/, "").trim() || "TechPrep" : "TechPrep";
    return `${name} <${email}>`;
  }
  return "TechPrep <onboarding@resend.dev>";
}

/** Send WhatsApp via Twilio. phone = E.164 e.g. 919876543210. creds = { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_FROM } */
async function sendWhatsApp(phone, message, creds) {
  const sid = (creds && creds.TWILIO_ACCOUNT_SID) || process.env.TWILIO_ACCOUNT_SID;
  const token = (creds && creds.TWILIO_AUTH_TOKEN) || process.env.TWILIO_AUTH_TOKEN;
  const from = (creds && creds.TWILIO_WHATSAPP_FROM) || process.env.TWILIO_WHATSAPP_FROM;
  if (!sid || !token || !from) {
    console.log("[book-session] WhatsApp skipped: set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_FROM in .env");
    return;
  }
  const normalized = String(phone).replace(/\D/g, "");
  if (normalized.length < 10) {
    console.log("[book-session] WhatsApp skipped: invalid number length", normalized.length);
    return;
  }
  const to = "whatsapp:" + (normalized.startsWith("91") ? "+" + normalized : "+91" + normalized);
  const auth = Buffer.from(sid + ":" + token).toString("base64");
  const form = new URLSearchParams({
    To: to,
    From: from,
    Body: message,
  });
  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: "POST",
    headers: {
      Authorization: "Basic " + auth,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: form.toString(),
  });
  const bodyText = await res.text();
  if (!res.ok) {
    console.error("[book-session] Twilio WhatsApp error:", res.status, bodyText);
  } else {
    let status = "";
    try {
      const j = JSON.parse(bodyText);
      status = j.status || j.error_message || "";
    } catch (_) {}
    console.log("[book-session] Twilio accepted to", to, status ? "status=" + status : "");
  }
}

export async function handleBookSession(body) {
  try {
    loadEnv();
    const env = getBookSessionEnv();
    const adminEmail = env.BOOK_SESSION_ADMIN_EMAIL;
    const adminWhatsapp = env.BOOK_SESSION_ADMIN_WHATSAPP;
    const fromEmail = normalizeFromEmail(env.RESEND_FROM_EMAIL || "TechPrep <onboarding@resend.dev>");

    const envPath = getEnvPath();
    console.log("[book-session] .env loaded from:", envPath || "NOT FOUND (add .env in project root)");
    console.log("[book-session] RESEND_API_KEY set:", !!env.RESEND_API_KEY, env.RESEND_API_KEY ? "(length " + env.RESEND_API_KEY.length + ")" : "");
    console.log("[book-session] BOOK_SESSION_ADMIN_EMAIL:", adminEmail || "(MISSING – add in .env)");
    console.log("[book-session] BOOK_SESSION_ADMIN_WHATSAPP set:", !!adminWhatsapp);
    console.log("[book-session] Twilio configured:", !!(env.TWILIO_ACCOUNT_SID && env.TWILIO_AUTH_TOKEN && env.TWILIO_WHATSAPP_FROM));

    let payload;
    try {
      payload = typeof body === "string" ? JSON.parse(body) : body;
    } catch (_) {
      return { statusCode: 400, body: JSON.stringify({ error: "Invalid request body" }) };
    }
    const { mentorName, mentorEmail, mentorWhatsapp, name, year, phone, email, reasonToConnect } = payload || {};

  if (!name || !year || !phone || !email || !reasonToConnect || !mentorName) {
    return { statusCode: 400, body: JSON.stringify({ error: "Missing required fields" }) };
  }

  if (!env.RESEND_API_KEY) {
    console.error("[book-session] Aborted: RESEND_API_KEY missing in .env");
    return { statusCode: 500, body: JSON.stringify({ error: "Email not configured. Add RESEND_API_KEY in .env (get key from resend.com)." }) };
  }

  const emailContent = buildEmailBody({
    mentorName,
    name,
    year,
    phone,
    email,
    reasonToConnect,
  });

  const subject = `Session request: ${name} → ${mentorName}`;
  const recipients = [adminEmail].filter(Boolean);
  const isResendFreeTier = !env.RESEND_FROM_EMAIL || fromEmail.includes("onboarding@resend.dev");
  if (!isResendFreeTier && mentorEmail && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mentorEmail)) {
    recipients.push(mentorEmail);
  }
  if (isResendFreeTier && mentorEmail) {
    console.log("[book-session] Resend free tier: sending only to admin. Verify a domain at resend.com/domains to also email mentor.");
  }

  if (recipients.length === 0) {
    console.error("[book-session] Aborted: No recipient. Set BOOK_SESSION_ADMIN_EMAIL=your@email.com in .env");
    return { statusCode: 500, body: JSON.stringify({ error: "No recipient. Add BOOK_SESSION_ADMIN_EMAIL=your@email.com in .env" }) };
  }

  const resendClient = new Resend(env.RESEND_API_KEY);
  try {
    const result = await resendClient.emails.send({
      from: fromEmail,
      to: recipients,
      subject,
      html: emailContent.html,
      text: emailContent.text,
    });
    if (result.error) {
      const errMsg = result.error.message || JSON.stringify(result.error);
      console.error("[book-session] Resend API error:", errMsg);
      return {
        statusCode: 500,
        body: JSON.stringify({
          error: "Email failed: " + errMsg + ". Check RESEND_API_KEY at resend.com and use BOOK_SESSION_ADMIN_EMAIL = your Resend account email for free tier.",
        }),
      };
    }
    console.log("[book-session] Email sent to:", recipients.join(", "));
  } catch (err) {
    console.error("[book-session] Email exception:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: "Email error: " + (err?.message || String(err)) + ". Add RESEND_API_KEY and BOOK_SESSION_ADMIN_EMAIL in .env (project root).",
      }),
    };
  }

  // WhatsApp: same message to admin + mentor (if Twilio configured). Don’t fail request if this errors.
  try {
    const whatsappBody = buildWhatsAppMessage({
      mentorName,
      name,
      year,
      phone,
      email,
      reasonToConnect,
    });
    const normalize = (n) => {
      const raw = String(n || "").replace(/\D/g, "");
      return raw.length >= 10 ? (raw.startsWith("91") ? raw : "91" + raw) : "";
    };
    const toWhatsApp = new Set();
    if (adminWhatsapp) toWhatsApp.add(normalize(adminWhatsapp));
    if (mentorWhatsapp) toWhatsApp.add(normalize(mentorWhatsapp));
    toWhatsApp.delete("");
    if (toWhatsApp.size > 0) {
      console.log("[book-session] Sending WhatsApp to", toWhatsApp.size, "number(s), Twilio configured:", !!(env.TWILIO_ACCOUNT_SID && env.TWILIO_AUTH_TOKEN && env.TWILIO_WHATSAPP_FROM));
      for (const num of toWhatsApp) {
        await sendWhatsApp(num, whatsappBody, env);
      }
    }
  } catch (err) {
    console.error("[book-session] WhatsApp error:", err);
  }

  return { statusCode: 200, body: JSON.stringify({ success: true }) };
  } catch (err) {
    console.error("[book-session] Unexpected error:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err?.message || "Server error. Check terminal for details." }),
    };
  }
}
