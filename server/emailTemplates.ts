/**
 * Professional Email Templates - Wilma Theme
 * Clean blue design matching Wilma branding
 */

const baseStyles = `
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  line-height: 1.6;
  color: #1f2937;
`;

const containerStyles = `
  max-width: 600px;
  margin: 0 auto;
  background: #ffffff;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 4px 12px rgba(0, 61, 130, 0.15);
  border: 2px solid #003d82;
`;

const headerStyles = `
  background: #003d82;
  padding: 30px;
  text-align: center;
  border-bottom: 4px solid #0052a3;
`;

const contentStyles = `
  padding: 40px 30px;
  background: #ffffff;
`;

const cardStyles = `
  background: #f8fafc;
  padding: 25px;
  border-radius: 8px;
  margin: 20px 0;
  border: 2px solid #e2e8f0;
`;

const buttonStyles = `
  display: inline-block;
  padding: 14px 32px;
  background: #003d82;
  color: #ffffff;
  text-decoration: none;
  border-radius: 6px;
  font-weight: 600;
  font-size: 16px;
  transition: background 0.3s ease;
`;

const footerStyles = `
  padding: 25px 30px;
  background: #f8fafc;
  text-align: center;
  font-size: 13px;
  color: #64748b;
  border-top: 2px solid #e2e8f0;
`;

export function getWilmaInvitationEmail(data: {
  firstName: string;
  lastName: string;
  username: string;
  password: string;
  role: string;
  appUrl?: string;
}): string {
  const appUrl = data.appUrl || 'https://ksykmaps.vercel.app';
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Welcome to Wilma</title>
    </head>
    <body style="${baseStyles} margin: 0; padding: 20px; background: #f1f5f9;">
      <div style="${containerStyles}">
        <!-- Header -->
        <div style="${headerStyles}">
          <h1 style="margin: 0; font-size: 32px; font-weight: 700; color: #ffffff;">
            🎓 Tervetuloa Wilmaan
          </h1>
          <p style="margin: 10px 0 0 0; font-size: 16px; color: #dbeafe;">
            Tilisi on luotu • Your account has been created
          </p>
        </div>

        <!-- Content -->
        <div style="${contentStyles}">
          <p style="font-size: 18px; margin: 0 0 25px 0; color: #1f2937;">
            Hei <strong>${data.firstName} ${data.lastName}</strong>,
          </p>
          
          <p style="font-size: 16px; margin: 0 0 25px 0; color: #475569;">
            Wilma-tilisi on luotu onnistuneesti. Voit nyt kirjautua järjestelmään alla olevilla tunnuksilla.
          </p>
          <p style="font-size: 16px; margin: 0 0 25px 0; color: #475569;">
            <em>Your Wilma account has been successfully created. You can now log in with the credentials below.</em>
          </p>

          <!-- Credentials Card -->
          <div style="${cardStyles}">
            <h2 style="margin: 0 0 20px 0; font-size: 20px; color: #003d82; border-bottom: 2px solid #003d82; padding-bottom: 10px;">
              📋 Kirjautumistiedot • Login Credentials
            </h2>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 12px 0; font-weight: 600; color: #64748b; width: 40%;">Käyttäjätunnus • Username:</td>
                <td style="padding: 12px 0; font-family: 'Courier New', monospace; font-size: 16px; font-weight: 700; color: #003d82; background: #ffffff; padding: 8px 12px; border-radius: 4px; border: 1px solid #cbd5e1;">${data.username}</td>
              </tr>
              <tr>
                <td style="padding: 12px 0; font-weight: 600; color: #64748b;">Salasana • Password:</td>
                <td style="padding: 12px 0; font-family: 'Courier New', monospace; font-size: 16px; font-weight: 700; color: #003d82; background: #ffffff; padding: 8px 12px; border-radius: 4px; border: 1px solid #cbd5e1;">${data.password}</td>
              </tr>
              <tr>
                <td style="padding: 12px 0; font-weight: 600; color: #64748b;">Rooli • Role:</td>
                <td style="padding: 12px 0; font-weight: 600; color: #003d82; text-transform: capitalize;">${data.role}</td>
              </tr>
            </table>
          </div>

          <!-- Action Button -->
          <div style="text-align: center; margin: 30px 0;">
            <a href="${appUrl}/wilma" style="${buttonStyles}">
              🚀 Kirjaudu Wilmaan • Login to Wilma
            </a>
          </div>

          <!-- Security Notice -->
          <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; border-radius: 4px; margin: 25px 0;">
            <p style="margin: 0; font-size: 14px; color: #92400e;">
              <strong>🔒 Turvallisuushuomautus • Security Notice:</strong><br>
              Vaihda salasanasi ensimmäisen kirjautumisen jälkeen.<br>
              <em>Please change your password after your first login.</em>
            </p>
          </div>

          <p style="font-size: 14px; margin: 25px 0 0 0; color: #64748b;">
            Jos sinulla on kysyttävää, ota yhteyttä tukeen.<br>
            <em>If you have any questions, please contact support.</em>
          </p>
        </div>

        <!-- Footer -->
        <div style="${footerStyles}">
          <p style="margin: 0 0 10px 0; color: #003d82;">
            <strong>KSYK Maps - Wilma-järjestelmä</strong>
          </p>
          <p style="margin: 0 0 10px 0;">
            © 2026 Nordbyte Studio. Kaikki oikeudet pidätetään.
          </p>
          <p style="margin: 0; font-size: 12px;">
            Tämä viesti on lähetetty automaattisesti. Älä vastaa tähän viestiin.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
}

export function getTicketResponseEmail(data: {
  ticketId: string;
  title: string;
  response: string;
  name?: string;
}): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Ticket Response</title>
    </head>
    <body style="${baseStyles} margin: 0; padding: 20px; background: #1a1a2e;">
      <div style="${containerStyles}">
        <!-- Header -->
        <div style="${headerStyles}">
          <h1 style="margin: 0; font-size: 32px; font-weight: 700; color: #ffffff;">
            💬 Ticket Response
          </h1>
          <p style="margin: 10px 0 0 0; font-size: 16px; color: rgba(255, 255, 255, 0.9);">
            We've responded to your ticket
          </p>
        </div>

        <!-- Content -->
        <div style="${contentStyles}">
          <p style="font-size: 18px; margin: 0 0 25px 0; color: #ffffff;">
            Hello${data.name ? ` <strong>${data.name}</strong>` : ''},
          </p>
          
          <p style="font-size: 16px; margin: 0 0 25px 0; color: rgba(255, 255, 255, 0.95);">
            We've reviewed your support ticket and have a response for you.
          </p>

          <!-- Ticket Info Card -->
          <div style="${cardStyles}">
            <h2 style="margin: 0 0 15px 0; font-size: 18px; color: #ffffff;">
              🎫 Ticket #${data.ticketId}
            </h2>
            <p style="margin: 0 0 20px 0; font-size: 16px; font-weight: 600; color: rgba(255, 255, 255, 0.9);">
              ${data.title}
            </p>
            <div style="background: rgba(0, 0, 0, 0.3); padding: 20px; border-radius: 8px; border-left: 4px solid #667eea;">
              <p style="margin: 0; font-size: 15px; color: #ffffff; white-space: pre-wrap;">${data.response}</p>
            </div>
          </div>

          <!-- Action Button -->
          <div style="text-align: center; margin: 30px 0;">
            <a href="https://ksykmaps.vercel.app/support" style="${buttonStyles}">
              📋 View Ticket
            </a>
          </div>

          <p style="font-size: 14px; margin: 25px 0 0 0; color: rgba(255, 255, 255, 0.8);">
            If you need further assistance, please reply to this ticket or create a new one.
          </p>
        </div>

        <!-- Footer -->
        <div style="${footerStyles}">
          <p style="margin: 0 0 10px 0;">
            <strong>KSYK Maps Support Team</strong>
          </p>
          <p style="margin: 0 0 10px 0;">
            © 2026 Nordbyte Studio. All rights reserved.
          </p>
          <p style="margin: 0; font-size: 12px;">
            Support Email: support@nordbytestudio.fi
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
}

export function getUserInvitationEmail(data: {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  role: string;
  appUrl?: string;
}): string {
  const appUrl = data.appUrl || 'https://ksykmaps.vercel.app';
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Welcome to KSYK Maps</title>
    </head>
    <body style="${baseStyles} margin: 0; padding: 20px; background: #1a1a2e;">
      <div style="${containerStyles}">
        <!-- Header -->
        <div style="${headerStyles}">
          <h1 style="margin: 0; font-size: 32px; font-weight: 700; color: #ffffff;">
            🗺️ Welcome to KSYK Maps!
          </h1>
          <p style="margin: 10px 0 0 0; font-size: 16px; color: rgba(255, 255, 255, 0.9);">
            Your admin account is ready
          </p>
        </div>

        <!-- Content -->
        <div style="${contentStyles}">
          <p style="font-size: 18px; margin: 0 0 25px 0; color: #ffffff;">
            Hello <strong>${data.firstName} ${data.lastName}</strong>,
          </p>
          
          <p style="font-size: 16px; margin: 0 0 25px 0; color: rgba(255, 255, 255, 0.95);">
            An administrator account has been created for you on KSYK Maps. You can now access the admin panel with your credentials below.
          </p>

          <!-- Credentials Card -->
          <div style="${cardStyles}">
            <h2 style="margin: 0 0 20px 0; font-size: 20px; color: #ffffff; border-bottom: 2px solid rgba(255, 255, 255, 0.2); padding-bottom: 10px;">
              🔑 Your Login Credentials
            </h2>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 12px 0; font-weight: 600; color: rgba(255, 255, 255, 0.8); width: 40%;">Email:</td>
                <td style="padding: 12px 0; font-family: 'Courier New', monospace; font-size: 16px; font-weight: 700; color: #ffffff; background: rgba(0, 0, 0, 0.3); padding: 8px 12px; border-radius: 6px;">${data.email}</td>
              </tr>
              <tr>
                <td style="padding: 12px 0; font-weight: 600; color: rgba(255, 255, 255, 0.8);">Password:</td>
                <td style="padding: 12px 0; font-family: 'Courier New', monospace; font-size: 16px; font-weight: 700; color: #ffffff; background: rgba(0, 0, 0, 0.3); padding: 8px 12px; border-radius: 6px;">${data.password}</td>
              </tr>
              <tr>
                <td style="padding: 12px 0; font-weight: 600; color: rgba(255, 255, 255, 0.8);">Role:</td>
                <td style="padding: 12px 0; font-weight: 600; color: #ffffff; text-transform: capitalize;">${data.role}</td>
              </tr>
            </table>
          </div>

          <!-- Action Button -->
          <div style="text-align: center; margin: 30px 0;">
            <a href="${appUrl}/admin" style="${buttonStyles}">
              🚀 Access Admin Panel
            </a>
          </div>

          <!-- Security Notice -->
          <div style="background: rgba(255, 193, 7, 0.15); border-left: 4px solid #ffc107; padding: 15px; border-radius: 6px; margin: 25px 0;">
            <p style="margin: 0; font-size: 14px; color: #ffffff;">
              <strong>🔒 Security Notice:</strong> Please change your password immediately after your first login.
            </p>
          </div>

          <p style="font-size: 14px; margin: 25px 0 0 0; color: rgba(255, 255, 255, 0.8);">
            Need help? Contact us at support@nordbytestudio.fi
          </p>
        </div>

        <!-- Footer -->
        <div style="${footerStyles}">
          <p style="margin: 0 0 10px 0;">
            <strong>KSYK Maps Admin System</strong>
          </p>
          <p style="margin: 0 0 10px 0;">
            © 2026 Nordbyte Studio. All rights reserved.
          </p>
          <p style="margin: 0; font-size: 12px;">
            This is an automated email. Please do not reply directly to this message.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
}

export function getPasswordResetEmail(data: {
  name: string;
  resetLink: string;
}): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Password Reset</title>
    </head>
    <body style="${baseStyles} margin: 0; padding: 20px; background: #1a1a2e;">
      <div style="${containerStyles}">
        <!-- Header -->
        <div style="${headerStyles}">
          <h1 style="margin: 0; font-size: 32px; font-weight: 700; color: #ffffff;">
            🔐 Password Reset Request
          </h1>
          <p style="margin: 10px 0 0 0; font-size: 16px; color: rgba(255, 255, 255, 0.9);">
            Reset your password securely
          </p>
        </div>

        <!-- Content -->
        <div style="${contentStyles}">
          <p style="font-size: 18px; margin: 0 0 25px 0; color: #ffffff;">
            Hello <strong>${data.name}</strong>,
          </p>
          
          <p style="font-size: 16px; margin: 0 0 25px 0; color: rgba(255, 255, 255, 0.95);">
            We received a request to reset your password. Click the button below to create a new password.
          </p>

          <!-- Action Button -->
          <div style="text-align: center; margin: 30px 0;">
            <a href="${data.resetLink}" style="${buttonStyles}">
              🔑 Reset Password
            </a>
          </div>

          <!-- Security Notice -->
          <div style="background: rgba(244, 67, 54, 0.15); border-left: 4px solid #f44336; padding: 15px; border-radius: 6px; margin: 25px 0;">
            <p style="margin: 0 0 10px 0; font-size: 14px; color: #ffffff;">
              <strong>⚠️ Security Alert:</strong>
            </p>
            <p style="margin: 0; font-size: 14px; color: rgba(255, 255, 255, 0.9);">
              If you didn't request this password reset, please ignore this email or contact support if you're concerned about your account security.
            </p>
          </div>

          <p style="font-size: 13px; margin: 25px 0 0 0; color: rgba(255, 255, 255, 0.7);">
            This link will expire in 1 hour for security reasons.
          </p>
        </div>

        <!-- Footer -->
        <div style="${footerStyles}">
          <p style="margin: 0 0 10px 0;">
            <strong>KSYK Maps Security Team</strong>
          </p>
          <p style="margin: 0 0 10px 0;">
            © 2026 Nordbyte Studio. All rights reserved.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
}

export function getWilmaPasswordResetEmail(data: {
  name: string;
  tempPassword: string;
  appUrl?: string;
}): string {
  const appUrl = data.appUrl || 'https://ksykmaps.vercel.app';
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Password Reset - Wilma</title>
    </head>
    <body style="${baseStyles} margin: 0; padding: 20px; background: #f1f5f9;">
      <div style="${containerStyles}">
        <!-- Header -->
        <div style="${headerStyles}">
          <h1 style="margin: 0; font-size: 32px; font-weight: 700; color: #ffffff;">
            🔐 Salasanan palautus • Password Reset
          </h1>
          <p style="margin: 10px 0 0 0; font-size: 16px; color: #dbeafe;">
            Salasanasi on nollattu • Your password has been reset
          </p>
        </div>

        <!-- Content -->
        <div style="${contentStyles}">
          <p style="font-size: 18px; margin: 0 0 25px 0; color: #1f2937;">
            Hei <strong>${data.name}</strong>,
          </p>
          
          <p style="font-size: 16px; margin: 0 0 25px 0; color: #475569;">
            Wilma-salasanasi on nollattu ylläpitäjän toimesta. Alla on uusi väliaikainen salasanasi.
          </p>
          <p style="font-size: 16px; margin: 0 0 25px 0; color: #475569;">
            <em>Your Wilma password has been reset by an administrator. Below is your new temporary password.</em>
          </p>

          <!-- Password Card -->
          <div style="${cardStyles}">
            <h2 style="margin: 0 0 20px 0; font-size: 20px; color: #003d82; border-bottom: 2px solid #003d82; padding-bottom: 10px;">
              🔑 Uusi väliaikainen salasana • New Temporary Password
            </h2>
            <div style="text-align: center; background: #ffffff; padding: 20px; border-radius: 4px; margin: 15px 0; border: 2px solid #003d82;">
              <p style="margin: 0 0 10px 0; font-size: 14px; color: #64748b; text-transform: uppercase; letter-spacing: 1px;">
                Väliaikainen salasana • Temporary Password
              </p>
              <p style="margin: 0; font-family: 'Courier New', monospace; font-size: 24px; font-weight: 700; color: #003d82; letter-spacing: 2px;">
                ${data.tempPassword}
              </p>
            </div>
          </div>

          <!-- Action Button -->
          <div style="text-align: center; margin: 30px 0;">
            <a href="${appUrl}/wilma" style="${buttonStyles}">
              🚀 Kirjaudu Wilmaan • Login to Wilma
            </a>
          </div>

          <!-- Security Notice -->
          <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; border-radius: 4px; margin: 25px 0;">
            <p style="margin: 0 0 10px 0; font-size: 14px; color: #92400e;">
              <strong>🔒 Tärkeää • Important:</strong>
            </p>
            <p style="margin: 0; font-size: 14px; color: #92400e;">
              Sinun on vaihdettava tämä salasana kirjautuessasi sisään. Valitse vahva, ainutlaatuinen salasana.<br>
              <em>You will be required to change this password when you log in. Please choose a strong, unique password.</em>
            </p>
          </div>

          <p style="font-size: 14px; margin: 25px 0 0 0; color: #64748b;">
            Jos et pyytänyt salasanan nollausta, ota yhteyttä ylläpitäjään välittömästi.<br>
            <em>If you didn't request this password reset, please contact your administrator immediately.</em>
          </p>
        </div>

        <!-- Footer -->
        <div style="${footerStyles}">
          <p style="margin: 0 0 10px 0; color: #003d82;">
            <strong>KSYK Maps - Wilma-järjestelmä</strong>
          </p>
          <p style="margin: 0 0 10px 0;">
            © 2026 Nordbyte Studio. Kaikki oikeudet pidätetään.
          </p>
          <p style="margin: 0; font-size: 12px;">
            Tämä on automaattinen turvallisuusviesti. Älä vastaa tähän.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
}

export function getWilmaParentInvitationEmail(data: {
  parentFirstName: string;
  parentLastName: string;
  parentUsername: string;
  parentPassword: string;
  studentFirstName: string;
  studentLastName: string;
  studentClass: string;
  appUrl?: string;
}): string {
  const appUrl = data.appUrl || 'https://ksykmaps.vercel.app';
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Wilma Parent Account - KSYK Maps</title>
    </head>
    <body style="${baseStyles} margin: 0; padding: 20px; background: #f1f5f9;">
      <div style="${containerStyles}">
        <!-- Header -->
        <div style="${headerStyles}">
          <h1 style="margin: 0; font-size: 32px; font-weight: 700; color: #ffffff;">
            👨‍👩‍👧‍👦 Tervetuloa Wilmaan
          </h1>
          <p style="margin: 10px 0 0 0; font-size: 16px; color: #dbeafe;">
            Huoltajatili luotu • Parent Account Created
          </p>
        </div>

        <!-- Content -->
        <div style="${contentStyles}">
          <p style="font-size: 18px; margin: 0 0 25px 0; color: #1f2937;">
            Hei <strong>${data.parentFirstName} ${data.parentLastName}</strong>,
          </p>
          
          <p style="font-size: 16px; margin: 0 0 25px 0; color: #475569;">
            Lapsesi <strong>${data.studentFirstName} ${data.studentLastName}</strong> (luokka <strong>${data.studentClass}</strong>) on lisätty Wilma-järjestelmään.
          </p>
          <p style="font-size: 16px; margin: 0 0 25px 0; color: #475569;">
            <em>Your child <strong>${data.studentFirstName} ${data.studentLastName}</strong> (class <strong>${data.studentClass}</strong>) has been added to the Wilma system.</em>
          </p>

          <!-- Parent Credentials Card -->
          <div style="${cardStyles}">
            <h2 style="margin: 0 0 20px 0; font-size: 20px; color: #003d82; border-bottom: 2px solid #003d82; padding-bottom: 10px;">
              🔑 SINUN kirjautumistietosi • YOUR Login Credentials
            </h2>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 12px 0; font-weight: 600; color: #64748b; width: 40%;">Käyttäjätunnus • Username:</td>
                <td style="padding: 12px 0; font-family: 'Courier New', monospace; font-size: 16px; font-weight: 700; color: #003d82; background: #ffffff; padding: 8px 12px; border-radius: 4px; border: 1px solid #cbd5e1;">${data.parentUsername}</td>
              </tr>
              <tr>
                <td style="padding: 12px 0; font-weight: 600; color: #64748b;">Salasana • Password:</td>
                <td style="padding: 12px 0; font-family: 'Courier New', monospace; font-size: 16px; font-weight: 700; color: #003d82; background: #ffffff; padding: 8px 12px; border-radius: 4px; border: 1px solid #cbd5e1;">${data.parentPassword}</td>
              </tr>
              <tr>
                <td style="padding: 12px 0; font-weight: 600; color: #64748b;">Rooli • Role:</td>
                <td style="padding: 12px 0; font-weight: 600; color: #003d82;">Huoltaja • Parent</td>
              </tr>
            </table>
          </div>

          <!-- Child Info Card -->
          <div style="background: #e0f2fe; border: 2px solid #0284c7; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin: 0 0 15px 0; font-size: 18px; color: #0369a1;">
              👶 Lapsesi tiedot • Your Child's Information
            </h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; font-weight: 600; color: #0369a1; width: 40%;">Nimi • Name:</td>
                <td style="padding: 8px 0; color: #0c4a6e; font-weight: 600;">${data.studentFirstName} ${data.studentLastName}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: 600; color: #0369a1;">Luokka • Class:</td>
                <td style="padding: 8px 0; color: #0c4a6e; font-weight: 600;">${data.studentClass}</td>
              </tr>
            </table>
          </div>

          <!-- What You Can Do -->
          <div style="background: #f0fdf4; border: 2px solid #22c55e; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin: 0 0 15px 0; font-size: 18px; color: #15803d;">
              ✅ Mitä voit tehdä Wilmassa • What You Can Do in Wilma
            </h3>
            <ul style="margin: 0; padding-left: 20px; color: #166534;">
              <li style="margin: 8px 0;">Seurata lapsesi arvosanoja • Track your child's grades</li>
              <li style="margin: 8px 0;">Nähdä lukujärjestyksen • View the schedule</li>
              <li style="margin: 8px 0;">Ilmoittaa poissaolot • Report absences</li>
              <li style="margin: 8px 0;">Lukea viestit opettajilta • Read messages from teachers</li>
              <li style="margin: 8px 0;">Nähdä kotitehtävät ja kokeet • See homework and exams</li>
            </ul>
          </div>

          <!-- Action Button -->
          <div style="text-align: center; margin: 30px 0;">
            <a href="${appUrl}/wilma" style="${buttonStyles}">
              🚀 Kirjaudu Wilmaan • Login to Wilma
            </a>
          </div>

          <!-- Security Notice -->
          <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; border-radius: 4px; margin: 25px 0;">
            <p style="margin: 0 0 10px 0; font-size: 14px; color: #92400e;">
              <strong>🔒 Turvallisuushuomautus • Security Notice:</strong>
            </p>
            <p style="margin: 0; font-size: 14px; color: #92400e;">
              Vaihda salasanasi ensimmäisen kirjautumisen jälkeen. Älä jaa tunnuksiasi kenellekään.<br>
              <em>Please change your password after your first login. Never share your credentials with anyone.</em>
            </p>
          </div>

          <p style="font-size: 14px; margin: 25px 0 0 0; color: #64748b;">
            Jos sinulla on kysyttävää, ota yhteyttä koulun tukeen.<br>
            <em>If you have any questions, please contact school support.</em>
          </p>
        </div>

        <!-- Footer -->
        <div style="${footerStyles}">
          <p style="margin: 0 0 10px 0; color: #003d82;">
            <strong>KSYK Maps - Wilma-järjestelmä</strong>
          </p>
          <p style="margin: 0 0 10px 0;">
            © 2026 Nordbyte Studio. Kaikki oikeudet pidätetään.
          </p>
          <p style="margin: 0; font-size: 12px;">
            Tämä viesti on lähetetty automaattisesti. Älä vastaa tähän viestiin.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
}
