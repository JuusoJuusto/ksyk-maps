import nodemailer from 'nodemailer';

// Create Gmail transporter
const createTransporter = () => {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
    console.log('⚠️ Email credentials not configured');
    return null;
  }

  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.EMAIL_PORT || '587'),
    secure: false, // true for 465, false for other ports
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD,
    },
  });
};

export async function sendPasswordSetupEmail(email: string, subject: string, body: string) {
  console.log('\n📧 ========== SENDING EMAIL ==========');
  console.log('To:', email);
  console.log('Subject:', subject);
  console.log('Email User:', process.env.EMAIL_USER);
  console.log('Email Host:', process.env.EMAIL_HOST);
  console.log('Email Port:', process.env.EMAIL_PORT);
  console.log('Email configured:', !!(process.env.EMAIL_USER && process.env.EMAIL_PASSWORD));
  console.log('=====================================\n');

  const transporter = createTransporter();

  if (!transporter) {
    console.log('⚠️ Email not configured');
    return { success: false, mode: 'console', error: 'Email not configured' };
  }

  // Check if this is a simple text email or HTML email
  const isSimpleEmail = !body.includes('<html') && !body.includes('<!DOCTYPE');
  
  const emailContent = {
    from: `"KSYK Maps Support" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: subject,
    ...(isSimpleEmail ? {
      text: body,
      html: `<pre style="font-family: Arial, sans-serif; white-space: pre-wrap;">${body}</pre>`
    } : {
      html: body,
      text: body.replace(/<[^>]*>/g, '')
    })
  };

  try {
    console.log('📤 Attempting to send email...');
    const info = await transporter.sendMail(emailContent);

    console.log('✅ Email sent successfully!');
    console.log('   Message ID:', info.messageId);
    console.log('   Response:', info.response);
    return { success: true, mode: 'email', messageId: info.messageId };
  } catch (error: any) {
    console.error('❌ Email send error:', error);
    console.error('   Error code:', error.code);
    console.error('   Error message:', error.message);
    return { success: false, error, mode: 'console' };
  }
}

// Generate a random temporary password
export function generateTempPassword(): string {
  const length = 12;
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
  let password = '';
  for (let i = 0; i < length; i++) {
    password += charset.charAt(Math.floor(Math.random() * charset.length));
  }
  return password;
}
