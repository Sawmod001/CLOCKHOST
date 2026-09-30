/**
 * Email delivery via the Brevo REST API (https://api.brevo.com/v3/smtp/email).
 *
 * Why Brevo: it works with NO custom domain. The owner verifies a plain
 * Gmail address as a "single sender" in the Brevo dashboard, and Brevo sends
 * to any recipient over HTTPS (port 443 — never blocked on serverless).
 * Resend cannot do this: it requires a verified domain for every send.
 *
 * Required env: BREVO_API_KEY, NOTIFY_FROM_EMAIL (the verified Gmail),
 * optional NOTIFY_FROM_NAME (default "ClockHost").
 */

interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
}

export function isEmailConfigured(): boolean {
  return !!(process.env.BREVO_API_KEY && process.env.NOTIFY_FROM_EMAIL);
}

export async function sendEmail({ to, subject, html }: SendEmailInput): Promise<void> {
  const apiKey = process.env.BREVO_API_KEY;
  const fromEmail = process.env.NOTIFY_FROM_EMAIL;
  const fromName = process.env.NOTIFY_FROM_NAME || "ClockHost";
  if (!apiKey || !fromEmail) {
    throw new Error("Email service is not configured (BREVO_API_KEY / NOTIFY_FROM_EMAIL).");
  }

  const response = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: { "Content-Type": "application/json", "api-key": apiKey },
    body: JSON.stringify({
      sender: { name: fromName, email: fromEmail },
      to: [{ email: to }],
      subject,
      htmlContent: html,
    }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`Email send failed (${response.status}): ${detail.slice(0, 200)}`);
  }
}

export async function sendVerificationCode(to: string, name: string, code: string): Promise<void> {
  const safeName = name.replace(/[<>&"]/g, "");
  await sendEmail({
    to,
    subject: `${safeName ? safeName + ", " : ""}your ClockHost verification code is ${code}`,
    html: [
      `<div style="font-family:sans-serif;max-width:480px;margin:0 auto;">`,
      `<h2 style="color:#291411;">Confirm your email</h2>`,
      `<p>Hi ${safeName || "there"}, use this code to confirm your email for ClockHost updates:</p>`,
      `<p style="font-size:32px;font-weight:bold;letter-spacing:8px;color:#80183d;">${code}</p>`,
      `<p style="color:#666;">This code expires in 10 minutes. If you did not ask for this, ignore this email.</p>`,
      `</div>`,
    ].join(""),
  });
}
