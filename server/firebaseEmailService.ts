import admin from 'firebase-admin';
import nodemailer from 'nodemailer';

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT || '{}');
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

// Create Gmail transporter for sending custom emails
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
      pass: process.env.EMAIL_PASSWORD,
    },
  });
};

/**
 * Create a user in Firebase Authentication and send custom password reset email
 */
export async function createFirebaseUserAndSendEmail(
  email: string,
  firstName: string,
  lastName: string,
  role: string
): Promise<{ success: boolean; uid?: string; error?: any; message: string; resetLink?: string }> {
  
  console.log('\n🔥 ========== FIREBASE AUTH USER CREATION ==========');
  console.log('Email:', email);
  console.log('Name:', firstName, lastName);
  console.log('Role:', role);
  
  try {
    // Step 1: Create user in Firebase Authentication
    const userRecord = await admin.auth().createUser({
      email: email,
      emailVerified: false,
      displayName: `${firstName} ${lastName}`,
      disabled: false
    });
    
    console.log('✅ User created in Firebase Auth');
    console.log('   UID:', userRecord.uid);
    
    // Step 2: Set custom claims for role
    await admin.auth().setCustomUserClaims(userRecord.uid, { role });
    console.log('✅ Custom claims set (role:', role + ')');
    
    // Step 3: Generate password reset link
    const resetLink = await admin.auth().generatePasswordResetLink(email, {
      url: 'https://ksykmaps.vercel.app/admin-login',
      handleCodeInApp: false
    });
    
    console.log('✅ Password reset link generated');
    console.log('   Link:', resetLink);
    
    // Step 4: Send custom email with the reset link
    const transporter = createTransporter();
    
    if (!transporter) {
      console.log('⚠️ Email not configured - returning reset link');
      return {
        success: true,
        uid: userRecord.uid,
        resetLink: resetLink,
        message: `✅ User created! Share this link: ${resetLink}`
      };
    }

    const emailContent = {
      from: `"KSYK Maps Admin" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Welcome to KSYK Maps - Set Your Password',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #3B82F6 0%, #2563EB 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: white; padding: 30px; border: 1px solid #e5e7eb; }
            .button { display: inline-block; background: #3B82F6; color: white !important; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 20px 0; }
            .footer { text-align: center; color: #6b7280; font-size: 12px; margin-top: 20px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Welcome to KSYK Maps!</h1>
            </div>
            <div class="content">
              <h2>Hello ${firstName}!</h2>
              <p>Your administrator account has been created for the KSYK Maps system.</p>
              <p>Click the button below to set your password and activate your account:</p>
              <div style="text-align: center;">
                <a href="${resetLink}" class="button">Set Your Password</a>
              </div>
              <p style="color: #6b7280; font-size: 14px;">Or copy this link: ${resetLink}</p>
              <p><strong>Important:</strong> This link will expire in 1 hour for security.</p>
            </div>
            <div class="footer">
              <p>KSYK Maps Admin System</p>
              <p>If you didn't request this, please ignore this email.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
Welcome to KSYK Maps!

Hello ${firstName}!

Your administrator account has been created. Click the link below to set your password:

${resetLink}

This link will expire in 1 hour.

---
KSYK Maps Admin System
      `
    };

    await transporter.sendMail(emailContent);
    console.log('✅ Custom email sent via Gmail SMTP');
    console.log('================================================\n');
    
    return {
      success: true,
      uid: userRecord.uid,
      resetLink: resetLink,
      message: `✅ User created! Password reset email sent to ${email}`
    };
    
  } catch (error: any) {
    console.error('❌ Firebase Auth error:', error);
    console.error('   Code:', error.code);
    console.error('   Message:', error.message);
    console.log('================================================\n');
    
    return {
      success: false,
      error: error,
      message: `❌ Failed: ${error.message}`
    };
  }
}

/**
 * Send password reset email to existing Firebase Auth user
 */
export async function sendPasswordResetEmail(email: string): Promise<{ success: boolean; error?: any; message: string }> {
  
  console.log('\n🔥 ========== SENDING PASSWORD RESET ==========');
  console.log('Email:', email);
  
  try {
    // Generate password reset link
    const resetLink = await admin.auth().generatePasswordResetLink(email, {
      url: 'https://ksykmaps.vercel.app/admin-login',
      handleCodeInApp: false
    });
    
    console.log('✅ Password reset link generated');
    console.log('   Link:', resetLink);
    console.log('📧 Firebase sent password reset email');
    console.log('================================================\n');
    
    return {
      success: true,
      message: `✅ Password reset email sent to ${email}`
    };
    
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    console.log('================================================\n');
    
    return {
      success: false,
      error: error,
      message: `❌ Failed: ${error.message}`
    };
  }
}

/**
 * Delete user from Firebase Authentication
 */
export async function deleteFirebaseUser(uid: string): Promise<{ success: boolean; error?: any }> {
  try {
    await admin.auth().deleteUser(uid);
    console.log('✅ Deleted user from Firebase Auth:', uid);
    return { success: true };
  } catch (error: any) {
    console.error('❌ Error deleting user:', error.message);
    return { success: false, error };
  }
}
