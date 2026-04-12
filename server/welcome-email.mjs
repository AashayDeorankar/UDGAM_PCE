/**
 * Send a welcome email on first login.
 * Requires: RESEND_API_KEY
 */
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { Resend } from "resend";
import { extractBearerToken, getAdminAuth, getAdminDb } from "./firebase-admin.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadEnv() {
  const paths = [join(__dirname, "..", ".env"), join(process.cwd(), ".env")];
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

loadEnv();

function getEnv() {
  loadEnv();
  return {
    RESEND_API_KEY: process.env.RESEND_API_KEY || "",
    RESEND_FROM_EMAIL: process.env.RESEND_FROM_EMAIL || "TechPrep <onboarding@resend.dev>",
  };
}

function buildWelcomeEmail(name, role) {
  const displayName = name || "there";
  const roleText = role === "alumni" ? "alumni" : "student";
  const html = `
<!DOCTYPE html>
<html>
  <head><meta charset="utf-8"><title>Welcome to TechPrep</title></head>
  <body style="font-family: Arial, sans-serif; color: #1f1510;">
    <div style="max-width: 640px; margin: 0 auto; padding: 24px; border: 1px solid #e7dfd7; border-radius: 12px;">
      <h2 style="margin-top: 0;">Welcome to TechPrep, ${displayName}!</h2>
      <p>Thanks for signing in. Here is what you can do right away:</p>
      <ul>
        <li>Explore branch-wise notes, PPTs, and previous year papers</li>
        <li>Practice interview prep questions and mock interviews</li>
        <li>Connect with mentors and alumni on the platform</li>
        <li>Upload resources and help your peers</li>
      </ul>
      <p>You are currently signed in as <strong>${roleText}</strong>. If you ever need help, just reply to this email.</p>
      <p style="margin-bottom: 0;">Cheers,<br />TechPrep Team</p>
    </div>
  </body>
</html>
`;
  const text = `Welcome to TechPrep, ${displayName}!\n\nYou can now:\n- Explore branch-wise notes, PPTs, and previous year papers\n- Practice interview prep questions and mock interviews\n- Connect with mentors and alumni on the platform\n- Upload resources and help your peers\n\nYou are currently signed in as ${roleText}.\n\nTechPrep Team`;
  return { html, text };
}

export async function handleWelcomeEmail(body, { authorization }) {
  try {
    const token = extractBearerToken(authorization || "");
    if (!token) {
      return { statusCode: 401, body: JSON.stringify({ error: "Missing auth token" }) };
    }

    const adminAuth = getAdminAuth();
    const adminDb = getAdminDb();
    const decoded = await adminAuth.verifyIdToken(token, true);
    const userSnap = await adminDb.collection("users").doc(decoded.uid).get();
    const userData = userSnap.exists ? userSnap.data() : {};

    if (userData?.welcomeEmailSent) {
      return { statusCode: 200, body: JSON.stringify({ sent: false }) };
    }

    const env = getEnv();
    if (!env.RESEND_API_KEY) {
      return { statusCode: 500, body: JSON.stringify({ error: "RESEND_API_KEY not configured" }) };
    }

    const resend = new Resend(env.RESEND_API_KEY);
    const email = userData?.email || decoded.email;
    if (!email) {
      return { statusCode: 400, body: JSON.stringify({ error: "User email missing" }) };
    }

    const name = userData?.name || decoded.name || "";
    const role = userData?.role || "student";
    const { html, text } = buildWelcomeEmail(name, role);

    await resend.emails.send({
      from: env.RESEND_FROM_EMAIL,
      to: email,
      subject: "Welcome to TechPrep!",
      html,
      text,
    });

    await adminDb.collection("users").doc(decoded.uid).set(
      {
        welcomeEmailSent: true,
        welcomeEmailSentAt: new Date(),
      },
      { merge: true },
    );

    return { statusCode: 200, body: JSON.stringify({ sent: true }) };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: String(err?.message || err) }) };
  }
}
