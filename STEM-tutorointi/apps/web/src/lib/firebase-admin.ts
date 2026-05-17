/**
 * Firebase Admin SDK Configuration
 * 
 * This file initializes Firebase Admin SDK for server-side use.
 * Used for server-side authentication verification, Firestore admin operations,
 * and other privileged Firebase operations.
 * 
 * ⚠️ NEVER import this file in client-side code!
 */

import * as admin from 'firebase-admin';
import { getApps, cert, ServiceAccount } from 'firebase-admin/app';

// Initialize Firebase Admin (singleton pattern)
const initializeFirebaseAdmin = () => {
  // Check if already initialized
  if (getApps().length > 0) {
    return getApps()[0];
  }

  // Get credentials from environment variables
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY;

  // Validate credentials
  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      'Missing Firebase Admin credentials. Please check your environment variables: ' +
      'FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY'
    );
  }

  // Parse private key (handle escaped newlines)
  const formattedPrivateKey = privateKey.replace(/\\n/g, '\n');

  // Create service account credentials
  const serviceAccount: ServiceAccount = {
    projectId,
    clientEmail,
    privateKey: formattedPrivateKey,
  };

  // Initialize Firebase Admin
  return admin.initializeApp({
    credential: cert(serviceAccount),
    projectId,
  });
};

// Initialize on import
const adminApp = initializeFirebaseAdmin();

// Export Firebase Admin services
export const adminAuth = admin.auth();
export const adminDb = admin.firestore();
export const adminStorage = admin.storage();

// Export admin app
export { adminApp };
export default admin;

/**
 * Verify Firebase ID token
 * @param idToken - Firebase ID token from client
 * @returns Decoded token with user information
 */
export async function verifyIdToken(idToken: string) {
  try {
    const decodedToken = await adminAuth.verifyIdToken(idToken);
    return decodedToken;
  } catch (error) {
    console.error('Error verifying ID token:', error);
    throw new Error('Invalid or expired token');
  }
}

/**
 * Get user by UID
 * @param uid - Firebase user UID
 * @returns User record
 */
export async function getUserByUid(uid: string) {
  try {
    const userRecord = await adminAuth.getUser(uid);
    return userRecord;
  } catch (error) {
    console.error('Error getting user:', error);
    throw new Error('User not found');
  }
}

/**
 * Create custom token for user
 * @param uid - Firebase user UID
 * @param additionalClaims - Optional additional claims
 * @returns Custom token
 */
export async function createCustomToken(
  uid: string,
  additionalClaims?: object
) {
  try {
    const customToken = await adminAuth.createCustomToken(uid, additionalClaims);
    return customToken;
  } catch (error) {
    console.error('Error creating custom token:', error);
    throw new Error('Failed to create custom token');
  }
}

/**
 * Set custom user claims (for roles, permissions, etc.)
 * @param uid - Firebase user UID
 * @param claims - Custom claims object
 */
export async function setCustomUserClaims(uid: string, claims: object) {
  try {
    await adminAuth.setCustomUserClaims(uid, claims);
  } catch (error) {
    console.error('Error setting custom claims:', error);
    throw new Error('Failed to set custom claims');
  }
}

/**
 * Delete user
 * @param uid - Firebase user UID
 */
export async function deleteUser(uid: string) {
  try {
    await adminAuth.deleteUser(uid);
  } catch (error) {
    console.error('Error deleting user:', error);
    throw new Error('Failed to delete user');
  }
}

/**
 * Batch get users
 * @param uids - Array of Firebase user UIDs
 * @returns Array of user records
 */
export async function getUsers(uids: string[]) {
  try {
    const getUsersResult = await adminAuth.getUsers(
      uids.map((uid) => ({ uid }))
    );
    return getUsersResult.users;
  } catch (error) {
    console.error('Error getting users:', error);
    throw new Error('Failed to get users');
  }
}
