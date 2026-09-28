import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendPasswordSetupEmail(email: string, firstName: string, tempPassword: string) {
  if (!process.env.RESEND_API_KEY) {
    return { success: true, mode: 'console', password: tempPassword };
  }

  try {
    const { data, error } = await resend.emails.send({
      from: 'KSYK Map <onboarding@resend.dev>',
      to: [email],
      subject: 'Welcome to KSYK Map - Your Login Credentials',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #3B82F6; color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
            .password-box { background: white; border: 2px solid #3B82F6; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center; }
            .password { font-size: 24px; font-weight: bold; color: #2563EB; letter-spacing: 2px; font-family: monospace; }
            .button { display: inline-block; background: #3B82F6; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🗺️ Welcome to KSYK Map!</h1>
            </div>
            <div class="content">
              <h2>Hello ${firstName}!</h2>
              <p>Your admin account has been created for the KSYK Map system.</p>
              
              <div class="password-box">
                <p style="margin: 0 0 10px 0; color: #6b7280; font-size: 14px;">Your temporary password:</p>
                <div class="password">${tempPassword}</div>
              </div>
              
              <p><strong>Your login details:</strong></p>
              <ul>
                <li><strong>Email:</strong> ${email}</li>
                <li><strong>Password:</strong> ${tempPassword}</li>
                <li><strong>Login URL:</strong> <a href="https://ksykmaps.fi/admin-login">https://ksykmaps.fi/admin-login</a></li>
              </ul>
              
              <div style="text-align: center;">
                <a href="https://ksykmaps.fi/admin-login" class="button">Login to KSYK Map</a>
              </div>
            </div>
          </div>
        </body>
        </html>
      `,
    });

    if (error) {
      console.error('[resend] Email send error:', error);
      return { success: false, error, mode: 'console', password: tempPassword };
    }

    return { success: true, mode: 'email', messageId: data?.id, password: tempPassword };
  } catch (error: any) {
    console.error('❌ Exception:', error);
    return { success: false, error, mode: 'console', password: tempPassword };
  }
}

export function generateTempPassword(): string {
  const length = 12;
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
  let password = '';
  for (let i = 0; i < length; i++) {
    password += charset.charAt(Math.floor(Math.random() * charset.length));
  }
  return password;
}
