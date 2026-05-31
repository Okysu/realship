import nodemailer from "nodemailer";

// SMTP 是否已配置——未配置则邮件功能整体降级禁用（不报错、不阻断主流程）。
export function isEmailEnabled(): boolean {
  return !!(
    process.env.SMTP_HOST &&
    process.env.SMTP_USER &&
    process.env.SMTP_PASS
  );
}

export function getAppUrl(): string {
  return process.env.APP_URL?.replace(/\/$/, "") || "http://localhost:3000";
}

function getTransport() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === "true",
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
}

// 发送邮件。未配置 SMTP 时抛错（调用方决定是否容错降级）。
export async function sendEmail(input: {
  to: string;
  subject: string;
  html: string;
}) {
  if (!isEmailEnabled()) throw new Error("邮件服务未配置");
  const from = process.env.SMTP_FROM || process.env.SMTP_USER!;
  await getTransport().sendMail({
    from,
    to: input.to,
    subject: input.subject,
    html: input.html,
  });
}

// 通知：best-effort 发送，未配置 SMTP 或失败均静默（通知非关键路径，不阻断主流程）。
export async function notify(input: {
  to: string;
  subject: string;
  html: string;
}) {
  if (!isEmailEnabled()) return;
  try {
    await sendEmail(input);
  } catch {
    // 通知失败不影响主操作
  }
}

// 简单的品牌化邮件外壳（避免裸文本，提升送达与观感）。
export function emailShell(title: string, body: string): string {
  return `<div style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#0f172a">
  <p style="font-weight:600;font-size:18px;margin:0 0 16px">Real<span style="color:#16a34a">ship</span></p>
  <h1 style="font-size:18px;margin:0 0 12px">${title}</h1>
  ${body}
  <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0" />
  <p style="font-size:12px;color:#64748b;margin:0">Real · 重产品的公开评选 · 此邮件由系统自动发送，请勿直接回复。</p>
</div>`;
}
