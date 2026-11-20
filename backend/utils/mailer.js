const nodemailer = require('nodemailer');

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function getTransporter() {
  const user = (process.env.SMTP_USER || 'mhmtcetin96@gmail.com').trim();
  const pass = (process.env.SMTP_PASS || '').replace(/\s+/g, '');
  if (!user || !pass) return null;
  return nodemailer.createTransport({
    service: 'gmail',
    auth: { user, pass },
  });
}

async function sendContactNotification({ name, phone, email, subject, message }) {
  const transporter = getTransporter();
  if (!transporter) {
    console.warn('[Mailer] SMTP_PASS tanimli degil; e-posta bildirimi atlandi.');
    return { skipped: true };
  }

  const fromUser = (process.env.SMTP_USER || 'mhmtcetin96@gmail.com').trim();
  const toAddr = (process.env.MAIL_TO || 'mhmtcetin96@gmail.com').trim();
  const cleanSubject = subject ? `${subject} — ${name}` : `Yeni Keşif / İletişim Talebi — ${name}`;

  const text = [
    'Yeni İletişim / Keşif Formu Talebi (antalyadiscephe.com)',
    '--------------------------------------------------------',
    `Ad Soyad : ${name}`,
    `Telefon  : ${phone || '-'}`,
    `E-posta  : ${email || '-'}`,
    `Konu     : ${subject || '-'}`,
    '',
    'Mesaj:',
    message,
  ].join('\n');

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;border:1px solid #e0ddd6;border-radius:10px;overflow:hidden;">
      <div style="background:#1a1a1a;color:#e8b800;padding:16px 20px;font-weight:bold;font-size:16px;">
        Akdeniz Yapı Dekorasyon — Yeni Form Talebi
      </div>
      <div style="padding:20px;background:#ffffff;color:#222;line-height:1.6;">
        <p style="margin:0 0 8px;"><strong>Ad Soyad:</strong> ${escapeHtml(name)}</p>
        <p style="margin:0 0 8px;"><strong>Telefon:</strong> ${phone ? `<a href="tel:${escapeHtml(phone)}">${escapeHtml(phone)}</a>` : '-'}</p>
        <p style="margin:0 0 8px;"><strong>E-posta:</strong> ${escapeHtml(email || '-')}</p>
        <p style="margin:0 0 14px;"><strong>Konu:</strong> ${escapeHtml(subject || '-')}</p>
        <div style="background:#fdf8ee;border-left:4px solid #c9a227;padding:12px 14px;border-radius:6px;white-space:pre-wrap;">${escapeHtml(message)}</div>
      </div>
    </div>`;

  const mailOptions = {
    from: `"Akdeniz Yapı Web Formu" <${fromUser}>`,
    to: toAddr,
    subject: cleanSubject,
    text,
    html,
  };
  if (email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email).trim())) {
    mailOptions.replyTo = String(email).trim();
  }

  return transporter.sendMail(mailOptions);
}

module.exports = { sendContactNotification };
