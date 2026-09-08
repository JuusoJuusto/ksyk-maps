import nodemailer from 'nodemailer';

const APP_URL = 'https://ksykmaps.fi';
const ADMIN_URL = `${APP_URL}/admin`;
const SUPPORT_EMAIL = 'juusojuusto112@gmail.com';

/* ── Transporter ────────────────────────────────────────────────────── */

const createTransporter = () => {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
    console.log('⚠️ Email credentials not configured');
    return null;
  }
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.EMAIL_PORT || '587'),
    secure: false,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD.replace(/\s/g, ''),
    },
  });
};

/* ── Shared template helpers ───────────────────────────────────────── */

/**
 * Wrap any HTML body in the KSYK Maps editorial shell — clean Inter-style
 * typography, calm blue gradient header, single accent button, soft footer.
 * The shell is used by every transactional email so the brand stays
 * consistent and recipients learn to trust the look.
 */
function shell(opts: {
  title: string;
  preheader: string;
  body: string;
  cta?: { label: string; href: string };
  language?: 'fi' | 'en';
}): string {
  const { title, preheader, body, cta, language = 'en' } = opts;
  const footerCopy = language === 'fi'
    ? 'Tämä on automaattinen viesti. Älä vastaa tähän sähköpostiin.'
    : 'This is an automated message. Please do not reply to this email.';

  return `<!DOCTYPE html>
<html lang="${language}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${title}</title>
  <style>
    @media only screen and (max-width:600px){
      .email-card{border-radius:0!important}
      .email-header,.email-body,.email-footer{padding-left:20px!important;padding-right:20px!important}
      .email-title{font-size:20px!important}
      .email-cta a{display:block!important;text-align:center!important}
    }
  </style>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;color:#0f172a;-webkit-font-smoothing:antialiased;">
  <div style="display:none;font-size:1px;color:#f1f5f9;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">${preheader}</div>

  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background:#f1f5f9;">
    <tr>
      <td align="center" style="padding:32px 12px 40px;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" class="email-card" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 1px 4px rgba(15,23,42,0.07),0 8px 24px rgba(15,23,42,0.07);">

          <!-- Header: white with logo -->
          <tr>
            <td class="email-header" style="padding:28px 36px 24px;background:#ffffff;border-bottom:1px solid #f1f5f9;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td style="vertical-align:middle;">
                    <img src="https://ksykmaps.fi/icon-192.png" width="36" height="36" alt="KSYK Maps" style="border-radius:9px;display:block;border:0;" />
                  </td>
                  <td style="vertical-align:middle;padding-left:10px;">
                    <p style="margin:0;font-size:14px;font-weight:700;color:#0f172a;letter-spacing:-0.01em;">KSYK Maps</p>
                    <p style="margin:2px 0 0;font-size:11px;color:#94a3b8;">ksykmaps.fi</p>
                  </td>
                </tr>
              </table>
              <h1 class="email-title" style="margin:20px 0 0;font-size:22px;font-weight:700;letter-spacing:-0.02em;color:#0f172a;line-height:1.3;">${title}</h1>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td class="email-body" style="padding:28px 36px 24px;font-size:15px;line-height:1.65;color:#1e293b;">
              ${body}
              ${cta ? `
              <div class="email-cta" style="margin:28px 0 4px;">
                <a href="${cta.href}" style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;font-weight:600;font-size:14px;padding:13px 26px;border-radius:10px;letter-spacing:0.01em;">${cta.label} →</a>
              </div>` : ''}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td class="email-footer" style="padding:18px 36px 24px;border-top:1px solid #f1f5f9;background:#f8fafc;">
              <p style="margin:0;font-size:12px;color:#94a3b8;line-height:1.6;">
                <strong style="color:#475569;">© 2026 KSYK Maps</strong> &nbsp;·&nbsp; <a href="${APP_URL}" style="color:#3b82f6;text-decoration:none;">ksykmaps.fi</a>
              </p>
              <p style="margin:5px 0 0;font-size:11px;color:#94a3b8;line-height:1.6;">
                ${footerCopy}${language === 'fi' ? '' : ` &nbsp;·&nbsp; <a href="mailto:${SUPPORT_EMAIL}" style="color:#3b82f6;text-decoration:none;">${SUPPORT_EMAIL}</a>`}
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/** Renders the small "info chip" used inline in email bodies. */
function chip(label: string, value: string, accent = '#2563eb'): string {
  return `<div style="display:inline-block;margin:0 6px 6px 0;padding:6px 10px;border-radius:8px;background:#f1f5f9;font-size:12px;color:#475569;">
    <span style="color:#94a3b8;font-weight:600;letter-spacing:0.04em;text-transform:uppercase;font-size:10px;margin-right:6px;">${label}</span>
    <span style="color:${accent};font-weight:700;">${value}</span>
  </div>`;
}

/** Big monospace credential block (passwords, ticket IDs). */
function credentialBox(label: string, value: string): string {
  return `<div style="margin:24px 0;padding:24px;border:1.5px dashed #cbd5e1;border-radius:14px;text-align:center;background:#f8fafc;">
    <p style="margin:0 0 12px 0;font-size:10px;font-weight:700;letter-spacing:3px;text-transform:uppercase;color:#64748b;">
      ${label}
    </p>
    <p style="margin:0;font-family:'SFMono-Regular','Consolas','Liberation Mono',Menlo,Courier,monospace;font-size:24px;font-weight:700;letter-spacing:0.08em;color:#0f172a;">
      ${value}
    </p>
  </div>`;
}

/* ── Public API ────────────────────────────────────────────────────── */

export async function sendEmail(options: {
  to: string;
  subject: string;
  html: string;
  text?: string;
}) {
  const transporter = createTransporter();
  if (!transporter) return { success: false, mode: 'console', error: 'Email not configured' };

  try {
    const info = await transporter.sendMail({
      from: `"KSYK Maps" <${process.env.EMAIL_USER}>`,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text || options.subject,
    });
    // email sent successfully — do not log recipient address (PII)
    return { success: true, mode: 'email', messageId: info.messageId };
  } catch (error: any) {
    console.error('❌ Email send error:', error.message);
    return { success: false, error, mode: 'console' };
  }
}

/**
 * Admin invitation — sent when a new admin user is created with the
 * "email password" option. Recipients see their temp password in a big
 * dashed box and a single "Open admin panel" CTA that goes to /admin.
 */
export async function sendPasswordSetupEmail(email: string, firstName: string, tempPassword: string) {
  const transporter = createTransporter();
  if (!transporter) return { success: false, mode: 'console', error: 'Email not configured' };

  const body = `
    <p style="margin:0 0 8px 0;font-size:18px;font-weight:600;color:#0f172a;">Hi ${firstName},</p>
    <p style="margin:0;color:#475569;">
      Your administrator account on <strong>KSYK Maps</strong> has been created. You now have full access to manage rooms, security gates, analytics, and the campus map.
    </p>

    ${credentialBox('Temporary password', tempPassword)}

    <div style="background:#fffbeb;border-left:3px solid #f59e0b;border-radius:8px;padding:14px 16px;margin:0 0 8px 0;">
      <p style="margin:0;font-size:13px;color:#78350f;line-height:1.55;">
        <strong>Change this on first login.</strong> Open the admin panel, sign in with this password, then update it in Profile → Security.
      </p>
    </div>

    <p style="margin:16px 0 0 0;font-size:13px;color:#94a3b8;">
      Sign in at <a href="${ADMIN_URL}" style="color:#3b82f6;text-decoration:none;">${ADMIN_URL.replace('https://','')}</a>
    </p>
  `;

  const html = shell({
    title: 'Welcome to KSYK Maps',
    preheader: `Your admin account is ready · temp password: ${tempPassword}`,
    body,
    cta: { label: 'Open admin panel', href: ADMIN_URL },
  });

  try {
    const info = await transporter.sendMail({
      from: `"KSYK Maps" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: '🗺️ Your KSYK Maps admin account is ready',
      html,
      text: `Hi ${firstName},\n\nYour admin account on KSYK Maps is ready.\n\nTemporary password: ${tempPassword}\n\nSign in: ${ADMIN_URL}\n\nChange your password after first login.\n\n— KSYK Maps`,
    });
    return { success: true, mode: 'email', messageId: info.messageId };
  } catch (error: any) {
    console.error('❌ Admin invite send error:', error.message);
    return { success: false, error, mode: 'console' };
  }
}

/** 8-char random temp password — readable charset, no 0/O/1/l/I. */
export function generateTempPassword(): string {
  const charset = 'abcdefghjkmnpqrstuvwxyz23456789';
  let pw = '';
  for (let i = 0; i < 8; i++) pw += charset.charAt(Math.floor(Math.random() * charset.length));
  return pw;
}

/**
 * Ticket emails — sent for create / status-update on a support ticket.
 * Used both for the owner (gets the full report) and for the requester
 * (gets the confirmation copy). The CTA always lands on the relevant
 * page on ksykmaps.fi: /admin for owners, / for users.
 */
export async function sendTicketEmail(
  email: string,
  subject: string,
  body: string,
  ticketData?: { ticketId?: string; type?: string; title?: string; status?: string },
) {
  const transporter = createTransporter();
  if (!transporter) return { success: false, mode: 'console', error: 'Email not configured' };

  // Detect owner vs user from the subject — owner messages start with [KSYK Maps].
  const isOwner = subject.startsWith('[KSYK Maps]');
  const ctaLabel = isOwner ? 'Open ticket in admin panel' : 'Visit KSYK Maps';
  const ticketDeepLink = ticketData?.ticketId
    ? `${APP_URL}/admin/tickets/${ticketData.ticketId}`
    : ADMIN_URL;
  const ctaHref = isOwner ? ticketDeepLink : APP_URL;

  const statusColors: Record<string, { bg: string; fg: string }> = {
    pending:    { bg: '#fef3c7', fg: '#92400e' },
    in_progress:{ bg: '#dbeafe', fg: '#1e40af' },
    resolved:   { bg: '#d1fae5', fg: '#065f46' },
    closed:     { bg: '#e2e8f0', fg: '#334155' },
  };
  const statusStyle = ticketData?.status ? statusColors[ticketData.status] || { bg: '#e2e8f0', fg: '#334155' } : null;

  const chipsHtml = ticketData
    ? [
        ticketData.type ? chip('Type', ticketData.type.toUpperCase()) : '',
        ticketData.status ? `<div style="display:inline-block;margin:0 6px 6px 0;padding:6px 12px;border-radius:8px;background:${statusStyle?.bg};font-size:12px;font-weight:700;color:${statusStyle?.fg};letter-spacing:0.04em;text-transform:uppercase;">${ticketData.status.replace('_', ' ')}</div>` : '',
        ticketData.ticketId ? chip('ID', ticketData.ticketId, '#0f172a') : '',
      ].join('')
    : '';

  const bodyHtml = `
    <p style="margin:0 0 8px 0;font-size:18px;font-weight:600;color:#0f172a;">
      ${isOwner ? 'New support ticket' : 'Got your ticket — thank you!'}
    </p>
    <p style="margin:0 0 16px 0;color:#475569;">
      ${isOwner
        ? 'A user just submitted a ticket. Details below.'
        : `Our team will review your ${ticketData?.type || 'request'} shortly. You'll receive an email as the status changes.`}
    </p>

    ${chipsHtml ? `<div style="margin:0 0 16px 0;">${chipsHtml}</div>` : ''}

    ${ticketData?.title ? `<div style="margin:0 0 16px 0;padding:14px 16px;background:#f8fafc;border-radius:10px;border-left:3px solid #2563eb;">
      <p style="margin:0;font-size:11px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;color:#94a3b8;">Subject</p>
      <p style="margin:4px 0 0 0;font-size:15px;font-weight:600;color:#0f172a;">${ticketData.title}</p>
    </div>` : ''}

    <div style="margin:16px 0;padding:16px;background:#f8fafc;border-radius:10px;white-space:pre-wrap;font-size:14px;color:#334155;line-height:1.55;">${body}</div>
  `;

  const html = shell({
    title: isOwner ? 'New support ticket' : 'Ticket received',
    preheader: ticketData?.title || subject,
    body: bodyHtml,
    cta: { label: ctaLabel, href: ctaHref },
  });

  try {
    const info = await transporter.sendMail({
      from: `"KSYK Maps Support" <${process.env.EMAIL_USER}>`,
      to: email,
      subject,
      html,
      text: body,
    });
    return { success: true, mode: 'email', messageId: info.messageId };
  } catch (error: any) {
    console.error('❌ Ticket email error:', error.message);
    return { success: false, error, mode: 'console' };
  }
}

/**
 * Wilma student onboarding email — sent to student + (optionally) each
 * parent. The credentials and CTAs use the same shell, so the brand is
 * consistent with admin and ticket emails.
 */
export async function sendWilmaStudentWelcomeEmail(
  studentEmail: string,
  studentName: string,
  tempPassword: string,
  username: string,
  studentId: string,
  parentEmails?: string[],
) {
  const transporter = createTransporter();
  if (!transporter) return { success: false, mode: 'console', error: 'Email not configured' };

  const studentBody = `
    <p style="margin:0 0 8px 0;font-size:18px;font-weight:600;color:#0f172a;">Hei ${studentName},</p>
    <p style="margin:0 0 20px 0;color:#475569;">
      Wilma-tilisi on luotu. Voit nyt seurata kursseja, arvosanoja ja viestejä koulun Wilman kautta.
    </p>

    <div style="margin:0 0 16px 0;">
      ${chip('Opiskelijanumero', studentId)}
      ${chip('Käyttäjätunnus', username)}
    </div>

    ${credentialBox('Väliaikainen salasana', tempPassword)}

    <div style="background:#fffbeb;border-left:3px solid #f59e0b;border-radius:8px;padding:14px 16px;">
      <p style="margin:0;font-size:13px;color:#78350f;line-height:1.55;">
        <strong>Vaihda salasana ensimmäisen kirjautumisen jälkeen.</strong>
      </p>
    </div>
  `;

  const studentHtml = shell({
    title: 'Tervetuloa Wilmaan',
    preheader: `Käyttäjätunnus ${username} · väliaikainen salasana mukana`,
    body: studentBody,
    cta: { label: 'Kirjaudu sisään', href: APP_URL },
    language: 'fi',
  });

  const parentBody = (parentName: string) => `
    <p style="margin:0 0 8px 0;font-size:18px;font-weight:600;color:#0f172a;">Hei ${parentName},</p>
    <p style="margin:0 0 20px 0;color:#475569;">
      <strong>${studentName}</strong> on saanut Wilma-tilin. Voit seurata lapsesi koulunkäyntiä alla olevilla tiedoilla.
    </p>

    <div style="background:#f0f9ff;border-radius:12px;padding:18px;margin:0 0 16px 0;border:1px solid #bae6fd;">
      <p style="margin:0 0 8px 0;font-size:10px;font-weight:700;letter-spacing:0.2em;text-transform:uppercase;color:#0369a1;">
        Huoltajan kirjautumistiedot
      </p>
      ${chip('Käyttäjätunnus', username, '#0369a1')}
      ${chip('Salasana', tempPassword, '#0369a1')}
    </div>

    <div style="background:#fffbeb;border-left:3px solid #f59e0b;border-radius:8px;padding:14px 16px;">
      <p style="margin:0;font-size:13px;color:#78350f;line-height:1.55;">
        <strong>Vaihda salasana</strong> ensimmäisen kirjautumisen jälkeen sekä omasi että lapsesi.
      </p>
    </div>
  `;

  try {
    await transporter.sendMail({
      from: `"KSYK Maps Wilma" <${process.env.EMAIL_USER}>`,
      to: studentEmail,
      subject: '🎓 Tervetuloa Wilmaan — kirjautumistiedot',
      html: studentHtml,
    });

    if (parentEmails && parentEmails.length > 0) {
      for (const parentEmail of parentEmails) {
        if (!parentEmail) continue;
        const parentName = parentEmail.split('@')[0].split('.').map(
          p => p.charAt(0).toUpperCase() + p.slice(1)
        ).join(' ');
        await transporter.sendMail({
          from: `"KSYK Maps Wilma" <${process.env.EMAIL_USER}>`,
          to: parentEmail,
          subject: `👨‍👩‍👧 ${studentName} – Wilma-tili luotu`,
          html: shell({
            title: 'Huoltajan Wilma-tili',
            preheader: `${studentName} on saanut Wilma-tilin · sinun tunnuksesi liitteenä`,
            body: parentBody(parentName),
            cta: { label: 'Kirjaudu sisään', href: APP_URL },
            language: 'fi',
          }),
        });
      }
    }

    return { success: true, mode: 'email' };
  } catch (error: any) {
    console.error('❌ Wilma welcome error:', error.message);
    return { success: false, error, mode: 'console' };
  }
}
