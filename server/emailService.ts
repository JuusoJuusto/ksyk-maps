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
 * Wrap any HTML body in the KSYK Maps premium email shell.
 * 680px desktop, graceful mobile collapse. Thin blue accent stripe at top,
 * refined typography, single high-contrast CTA, structured footer.
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
  const visitLabel = language === 'fi' ? 'Avaa sivusto →' : 'Visit site →';

  return `<!DOCTYPE html>
<html lang="${language}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${title}</title>
  <style>
    @media only screen and (max-width:660px){
      .email-wrap{padding:0 0 32px!important}
      .email-card{border-radius:0!important;width:100%!important}
      .email-header,.email-body,.email-footer{padding-left:24px!important;padding-right:24px!important}
      .email-title{font-size:22px!important}
      .btn-cta{display:block!important;text-align:center!important;padding:14px 0!important}
    }
  </style>
</head>
<body style="margin:0;padding:0;background:#eef2f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;color:#0f172a;-webkit-font-smoothing:antialiased;">
  <!-- Preheader -->
  <div style="display:none;font-size:1px;color:#eef2f7;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">${preheader}&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;</div>

  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background:#eef2f7;">
    <tr>
      <td align="center" class="email-wrap" style="padding:40px 16px 52px;">

        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="680" class="email-card" style="max-width:680px;width:100%;background:#ffffff;border-radius:18px;overflow:hidden;box-shadow:0 2px 4px rgba(15,23,42,0.05),0 8px 24px rgba(15,23,42,0.09),0 24px 56px rgba(15,23,42,0.05);">

          <!-- Blue accent stripe -->
          <tr>
            <td style="height:3px;background:linear-gradient(90deg,#1d4ed8 0%,#3b82f6 55%,#93c5fd 100%);line-height:3px;font-size:3px;">&nbsp;</td>
          </tr>

          <!-- Header -->
          <tr>
            <td class="email-header" style="padding:32px 48px 28px;background:#ffffff;border-bottom:1px solid #f1f5f9;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                <tr>
                  <td style="vertical-align:middle;">
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                      <tr>
                        <td style="vertical-align:middle;">
                          <img src="https://ksykmaps.fi/icon-192.png" width="40" height="40" alt="KSYK Maps" style="border-radius:11px;display:block;border:0;" />
                        </td>
                        <td style="vertical-align:middle;padding-left:12px;">
                          <p style="margin:0;font-size:14px;font-weight:700;color:#0f172a;letter-spacing:-0.015em;line-height:1.2;">KSYK Maps</p>
                          <p style="margin:2px 0 0;font-size:11px;color:#94a3b8;letter-spacing:0.01em;">ksykmaps.fi</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                  <td align="right" style="vertical-align:middle;">
                    <a href="${APP_URL}" style="font-size:11px;color:#94a3b8;text-decoration:none;letter-spacing:0.015em;">${visitLabel}</a>
                  </td>
                </tr>
              </table>
              <h1 class="email-title" style="margin:26px 0 0;font-size:28px;font-weight:700;letter-spacing:-0.03em;color:#0f172a;line-height:1.2;">${title}</h1>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td class="email-body" style="padding:36px 48px 32px;font-size:15px;line-height:1.72;color:#334155;">
              ${body}
              ${cta ? `
              <div style="margin:38px 0 8px;">
                <a class="btn-cta" href="${cta.href}" style="display:inline-block;background:#1d4ed8;color:#ffffff;text-decoration:none;font-weight:600;font-size:14px;padding:14px 30px;border-radius:10px;letter-spacing:0.015em;">${cta.label}&nbsp;→</a>
              </div>` : ''}
            </td>
          </tr>

          <!-- Footer divider -->
          <tr>
            <td style="height:1px;background:#f1f5f9;line-height:1px;font-size:1px;">&nbsp;</td>
          </tr>

          <!-- Footer -->
          <tr>
            <td class="email-footer" style="padding:22px 48px 30px;background:#f8fafc;">
              <p style="margin:0;font-size:12px;color:#64748b;line-height:1.65;">
                <strong style="color:#334155;font-weight:600;">© 2026 KSYK Maps</strong>
                &nbsp;&nbsp;·&nbsp;&nbsp;
                <a href="${APP_URL}" style="color:#3b82f6;text-decoration:none;">ksykmaps.fi</a>
                ${language === 'en' ? `&nbsp;&nbsp;·&nbsp;&nbsp;<a href="mailto:${SUPPORT_EMAIL}" style="color:#3b82f6;text-decoration:none;">${SUPPORT_EMAIL}</a>` : ''}
              </p>
              <p style="margin:5px 0 0;font-size:11px;color:#94a3b8;line-height:1.6;">
                ${footerCopy}
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

/** Small metadata chip used inline in email bodies. */
function chip(label: string, value: string, accent = '#1d4ed8'): string {
  return `<span style="display:inline-block;margin:0 6px 6px 0;padding:5px 10px;border-radius:7px;background:#f1f5f9;font-size:12px;vertical-align:middle;">
    <span style="color:#94a3b8;font-weight:600;letter-spacing:0.05em;text-transform:uppercase;font-size:10px;margin-right:5px;">${label}</span><span style="color:${accent};font-weight:700;">${value}</span>
  </span>`;
}

/** Large monospace credential block for passwords, ticket IDs, etc. */
function credentialBox(label: string, value: string): string {
  return `<div style="margin:24px 0;padding:28px 24px;border:1px solid #e2e8f0;border-radius:14px;text-align:center;background:#f8fafc;">
    <p style="margin:0 0 14px 0;font-size:10px;font-weight:700;letter-spacing:0.22em;text-transform:uppercase;color:#64748b;">
      ${label}
    </p>
    <p style="margin:0;font-family:'SFMono-Regular','Consolas','Liberation Mono',Menlo,Courier,monospace;font-size:26px;font-weight:700;letter-spacing:0.1em;color:#0f172a;word-break:break-all;">
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
 * Access request approval — sent when an admin approves a lockout-screen request.
 * v4.7.14 — includes a per-request grant token so the recipient can be
 * signed into the map directly from the email without re-entering their
 * email at the lockout page. The token is opaque and single-purpose:
 * hitting /grant/:token stamps the client's localStorage with a "granted"
 * flag; the access-control gate honours that flag.
 */
export async function sendAccessApprovalEmail(email: string, reason?: string, grantToken?: string) {
  const transporter = createTransporter();
  if (!transporter) return { success: false, mode: 'console', error: 'Email not configured' };

  const grantHref = grantToken
    ? `${APP_URL.replace(/\/$/, '')}/grant/${encodeURIComponent(grantToken)}`
    : APP_URL;

  const body = `
    <p style="margin:0 0 16px 0;color:#334155;">
      Your request to access <strong>KSYK Maps</strong> has been approved.
    </p>
    <p style="margin:0 0 20px 0;color:#334155;">
      Use the button below to open the map. The link works from this device — you don't need to re-enter anything.
    </p>
    ${reason ? `<div style="margin:0 0 20px 0;padding:14px 16px;background:#f8fafc;border-radius:10px;border-left:3px solid #2563eb;">
      <p style="margin:0;font-size:11px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;color:#94a3b8;">Your request</p>
      <p style="margin:4px 0 0;font-size:14px;color:#334155;">${reason}</p>
    </div>` : ''}
    <p style="margin:0;font-size:13px;color:#64748b;">
      If the button doesn't work, copy this address into your browser:
      <br>
      <a href="${grantHref}" style="color:#2563eb;word-break:break-all;">${grantHref}</a>
    </p>
  `;

  const html = shell({
    title: 'Access approved',
    preheader: 'Your KSYK Maps access request has been approved.',
    body,
    cta: { label: 'Open KSYK Maps', href: grantHref },
  });

  try {
    const info = await transporter.sendMail({
      from: `"KSYK Maps" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Your KSYK Maps access has been approved',
      html,
      text: `Your KSYK Maps access has been approved.\n\nOpen the map: ${grantHref}\n\n— KSYK Maps`,
    });
    return { success: true, mode: 'email', messageId: info.messageId };
  } catch (error: any) {
    console.error('Access approval email error:', error.message);
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
