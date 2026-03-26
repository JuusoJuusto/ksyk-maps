import speakeasy from 'speakeasy';
import { storage } from './storage';

export interface TwoFactorSetup {
  secret: string;
  otpauthUrl: string;
  qrCode?: string;
}

export class TwoFactorAuthService {
  /**
   * Generate a new 2FA secret for a user
   */
  static generateSecret(userEmail: string, userName: string): TwoFactorSetup {
    const secret = speakeasy.generateSecret({
      name: `KSYK Maps (${userEmail})`,
      issuer: 'KSYK Maps',
      length: 32,
    });

    return {
      secret: secret.base32,
      otpauthUrl: secret.otpauth_url || '',
    };
  }

  /**
   * Verify a TOTP token
   */
  static verifyToken(secret: string, token: string): boolean {
    return speakeasy.totp.verify({
      secret,
      encoding: 'base32',
      token,
      window: 2, // Allow 2 time steps before/after (60 seconds tolerance)
    });
  }

  /**
   * Enable 2FA for a user
   */
  static async enableTwoFactor(
    userId: string,
    secret: string,
    verificationCode: string
  ): Promise<{ success: boolean; message: string; backupCodes?: string[] }> {
    // Verify the code first
    const isValid = this.verifyToken(secret, verificationCode);
    
    if (!isValid) {
      return {
        success: false,
        message: 'Invalid verification code. Please try again.',
      };
    }

    try {
      // Generate backup codes
      const backupCodes = this.generateBackupCodes();
      
      // Update user in Firebase
      const user = await storage.getUser(userId);
      if (!user) {
        return {
          success: false,
          message: 'User not found',
        };
      }

      await storage.updateUser(userId, {
        ...user,
        twoFactorSecret: secret,
        twoFactorEnabled: true,
        twoFactorBackupCodes: JSON.stringify(backupCodes),
      });

      return {
        success: true,
        message: '2FA enabled successfully!',
        backupCodes,
      };
    } catch (error) {
      console.error('Error enabling 2FA:', error);
      return {
        success: false,
        message: 'Failed to enable 2FA. Please try again.',
      };
    }
  }

  /**
   * Disable 2FA for a user
   */
  static async disableTwoFactor(
    userId: string,
    verificationCode: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      const user = await storage.getUser(userId);
      if (!user || !user.twoFactorSecret) {
        return {
          success: false,
          message: 'User not found or 2FA not enabled',
        };
      }

      // Verify the code first
      const isValid = this.verifyToken(user.twoFactorSecret, verificationCode);
      
      if (!isValid) {
        return {
          success: false,
          message: 'Invalid verification code. Please try again.',
        };
      }

      // Update user in Firebase
      await storage.updateUser(userId, {
        ...user,
        twoFactorSecret: undefined,
        twoFactorEnabled: false,
        twoFactorBackupCodes: undefined,
      });

      return {
        success: true,
        message: '2FA disabled successfully!',
      };
    } catch (error) {
      console.error('Error disabling 2FA:', error);
      return {
        success: false,
        message: 'Failed to disable 2FA. Please try again.',
      };
    }
  }

  /**
   * Generate backup codes for a user
   */
  static generateBackupCodes(count: number = 10): string[] {
    const codes: string[] = [];
    for (let i = 0; i < count; i++) {
      // Generate 8-character alphanumeric codes
      const code = Math.random().toString(36).substring(2, 10).toUpperCase();
      codes.push(code);
    }
    return codes;
  }

  /**
   * Verify a backup code
   */
  static async verifyBackupCode(
    userId: string,
    code: string
  ): Promise<boolean> {
    try {
      const user = await storage.getUser(userId);

      if (!user || !user.twoFactorBackupCodes) {
        return false;
      }

      const backupCodes = JSON.parse(user.twoFactorBackupCodes);
      const codeIndex = backupCodes.indexOf(code.toUpperCase());

      if (codeIndex === -1) {
        return false;
      }

      // Remove the used backup code
      backupCodes.splice(codeIndex, 1);
      
      await storage.updateUser(userId, {
        ...user,
        twoFactorBackupCodes: JSON.stringify(backupCodes),
      });

      return true;
    } catch (error) {
      console.error('Error verifying backup code:', error);
      return false;
    }
  }
}

export default TwoFactorAuthService;
