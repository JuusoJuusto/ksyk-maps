import admin from 'firebase-admin';

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT || '{}');
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

/**
 * Create a user in Firebase Authentication and send password reset email
 * This uses Firebase's built-in email system - no Gmail SMTP needed!
 */
export async function createFirebaseUserAndSendEmail(
  email: string,
  firstName: string,
  lastName: string,
  role: string
): Promise<{ success: boolean; uid?: string; error?: any; message: string }> {
  
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
    // This link will be sent to the user's email automatically by Firebase
    const resetLink = await admin.auth().generatePasswordResetLink(email, {
      url: 'https://ksykmaps.vercel.app/admin-login',
      handleCodeInApp: false
    });
    
    console.log('✅ Password reset link generated');
    console.log('   Link:', resetLink);
    
    // Step 4: Send password reset email (Firebase sends this automatically!)
    // Firebase will send a beautiful email with your app name and logo
    console.log('📧 Firebase will send password reset email automatically');
    console.log('   To:', email);
    console.log('   Subject: Reset your password for KSYK Maps');
    
    console.log('================================================\n');
    
    return {
      success: true,
      uid: userRecord.uid,
      message: `✅ User created! Firebase sent password reset email to ${email}`
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
