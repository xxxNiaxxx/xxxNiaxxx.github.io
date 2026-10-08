import "server-only";
import nodemailer from "nodemailer";
import { APP_NAME } from "@/lib/brand";

export interface EmailMessage {
  to: string | string[];
  subject: string;
  /** Plain-text body; paragraphs separated by blank lines. Links are made clickable in the HTML version. */
  text: string;
  /** Optional button shown under the text. */
  action?: { label: string; url: string };
}

type Sender = (message: EmailMessage) => Promise<void>;

/**
 * Any SMTP server works: Gmail with an app password (smtp.gmail.com, 465),
 * Brevo, Resend, Mailgun… Without SMTP_HOST nothing is sent and the app
 * shows links to share by hand.
 */
export const emailConfigured = () => !!process.env.SMTP_HOST && !!process.env.SMTP_USER && !!process.env.SMTP_PASSWORD;

let transport: nodemailer.Transporter | null = null;
let override: Sender | null = null;

/** Tests capture emails instead of sending them. */
export function setEmailSenderForTests(sender: Sender | null) {
  override = sender;
}

const escape = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function toHtml({ text, action }: EmailMessage) {
  const paragraphs = text
    .split(/\n{2,}/)
    .map((p) => `<p style="margin:0 0 14px">${escape(p).replace(/\n/g, "<br>").replace(/https?:\/\/\S+/g, (u) => `<a href="${u}">${u}</a>`)}</p>`)
    .join("");
  const button = action
    ? `<p style="margin:22px 0"><a href="${escape(action.url)}" style="background:#0f172a;color:#fff;padding:11px 18px;border-radius:8px;text-decoration:none;font-weight:600">${escape(action.label)}</a></p>`
    : "";
  return `<div style="font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;font-size:15px;line-height:1.55;color:#0f172a;max-width:560px">${paragraphs}${button}<p style="margin-top:28px;color:#64748b;font-size:13px">${escape(APP_NAME)}</p></div>`;
}

/** Sends an email. Returns false when email is not set up or sending failed (the caller falls back to sharing a link). */
export async function sendEmail(message: EmailMessage): Promise<boolean> {
  if (override) {
    await override(message);
    return true;
  }
  if (!emailConfigured()) return false;
  try {
    const port = Number(process.env.SMTP_PORT || 465);
    transport ??= nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port,
      secure: port === 465,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD },
    });
    const text = message.action ? `${message.text}\n\n${message.action.label}: ${message.action.url}` : message.text;
    await transport.sendMail({
      from: process.env.EMAIL_FROM || `${APP_NAME} <${process.env.SMTP_USER}>`,
      to: message.to,
      subject: message.subject,
      text: `${text}\n\n— ${APP_NAME}`,
      html: toHtml(message),
    });
    return true;
  } catch (e) {
    console.error("Email not sent:", e);
    return false;
  }
}

/** Emails that manage the waitlist (ADMIN_EMAILS, comma separated). */
export function platformAdminEmails() {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export const isPlatformAdmin = (email: string) => platformAdminEmails().includes(email.toLowerCase());
