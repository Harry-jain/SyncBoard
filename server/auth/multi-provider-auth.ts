import { eq, and, or } from 'drizzle-orm';
import { db } from '../db';
import { 
  users, 
  authProviders, 
  twoFactorAuth, 
  emailVerifications, 
  phoneVerifications,
  driveStorage,
  InsertUser,
  InsertAuthProvider,
  InsertTwoFactorAuth,
  InsertEmailVerification,
  InsertPhoneVerification,
  InsertDriveStorage
} from '../../shared/schema';
import crypto from 'crypto';
import { sendEmail } from '../services/email-service';
import { sendSMS } from '../services/sms-service';
import { generateTOTP, verifyTOTP } from '../services/totp-service';

export interface AuthResult {
  success: boolean;
  user?: any;
  token?: string;
  requires2FA?: boolean;
  message: string;
  tempToken?: string;
}

export interface LoginRequest {
  method: 'password' | 'code';
  email?: string;
  phoneNumber?: string;
  password?: string;
  code?: string;
  provider?: 'google' | 'microsoft' | 'apple';
  providerToken?: string;
}

export interface SignupRequest {
  email?: string;
  phoneNumber?: string;
  password?: string;
  name: string;
  provider?: 'google' | 'microsoft' | 'apple';
  providerData?: any;
}

export class MultiProviderAuthService {
  private readonly JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
  private readonly CODE_EXPIRY_MINUTES = 10;
  private readonly EMAIL_VERIFICATION_EXPIRY_HOURS = 24;

  // Main authentication method
  public async authenticate(request: LoginRequest): Promise<AuthResult> {
    try {
      // Handle OAuth providers
      if (request.provider && request.providerToken) {
        return await this.handleOAuthLogin(request.provider, request.providerToken);
      }

      // Handle email/password or email/code login
      if (request.email) {
        if (request.method === 'password') {
          return await this.handlePasswordLogin(request.email, request.password!);
        } else if (request.method === 'code') {
          return await this.handleCodeLogin(request.email, request.code!);
        }
      }

      // Handle phone number login
      if (request.phoneNumber) {
        if (request.method === 'password') {
          return await this.handlePasswordLogin(request.phoneNumber, request.password!);
        } else if (request.method === 'code') {
          return await this.handleCodeLogin(request.phoneNumber, request.code!);
        }
      }

      return {
        success: false,
        message: 'Invalid authentication method'
      };
    } catch (error) {
      console.error('Authentication error:', error);
      return {
        success: false,
        message: 'Authentication failed'
      };
    }
  }

  // Handle OAuth login (Google, Microsoft, Apple)
  private async handleOAuthLogin(provider: string, token: string): Promise<AuthResult> {
    try {
      // Verify the OAuth token with the provider
      const providerData = await this.verifyOAuthToken(provider, token);
      
      if (!providerData) {
        return {
          success: false,
          message: 'Invalid OAuth token'
        };
      }

      // Check if user exists with this provider
      const existingProvider = await db.select()
        .from(authProviders)
        .where(and(
          eq(authProviders.provider, provider),
          eq(authProviders.providerId, providerData.id)
        ))
        .limit(1);

      let user;
      if (existingProvider.length > 0) {
        // Update last used timestamp
        await db.update(authProviders)
          .set({ lastUsed: new Date() })
          .where(eq(authProviders.id, existingProvider[0].id));

        // Get user
        const [userData] = await db.select()
          .from(users)
          .where(eq(users.id, existingProvider[0].userId))
          .limit(1);
        
        user = userData;
      } else {
        // Create new user
        user = await this.createUserFromOAuth(provider, providerData);
      }

      if (!user) {
        return {
          success: false,
          message: 'Failed to create or retrieve user'
        };
      }

      // Check if 2FA is required
      const twoFactor = await this.getTwoFactorAuth(user.id);
      if (twoFactor && twoFactor.isEnabled) {
        return {
          success: true,
          requires2FA: true,
          message: 'Two-factor authentication required',
          tempToken: this.generateTempToken(user.id)
        };
      }

      // Generate JWT token
      const jwtToken = this.generateJWT(user);

      return {
        success: true,
        user: this.sanitizeUser(user),
        token: jwtToken,
        message: 'Login successful'
      };
    } catch (error) {
      console.error('OAuth login error:', error);
      return {
        success: false,
        message: 'OAuth authentication failed'
      };
    }
  }

  // Handle password-based login
  private async handlePasswordLogin(identifier: string, password: string): Promise<AuthResult> {
    try {
      // Find user by email or phone
      const [user] = await db.select()
        .from(users)
        .where(or(
          eq(users.email, identifier),
          eq(users.username, identifier)
        ))
        .limit(1);

      if (!user) {
        return {
          success: false,
          message: 'User not found'
        };
      }

      // Verify password (in production, use proper password hashing)
      if (user.password !== password) {
        return {
          success: false,
          message: 'Invalid password'
        };
      }

      // Check if 2FA is required
      const twoFactor = await this.getTwoFactorAuth(user.id);
      if (twoFactor && twoFactor.isEnabled) {
        return {
          success: true,
          requires2FA: true,
          message: 'Two-factor authentication required',
          tempToken: this.generateTempToken(user.id)
        };
      }

      // Generate JWT token
      const jwtToken = this.generateJWT(user);

      return {
        success: true,
        user: this.sanitizeUser(user),
        token: jwtToken,
        message: 'Login successful'
      };
    } catch (error) {
      console.error('Password login error:', error);
      return {
        success: false,
        message: 'Password authentication failed'
      };
    }
  }

  // Handle code-based login (email/SMS verification)
  private async handleCodeLogin(identifier: string, code: string): Promise<AuthResult> {
    try {
      // Find verification record
      const verification = await db.select()
        .from(emailVerifications)
        .where(and(
          eq(emailVerifications.email, identifier),
          eq(emailVerifications.code, code),
          eq(emailVerifications.isUsed, false)
        ))
        .limit(1);

      if (verification.length === 0) {
        return {
          success: false,
          message: 'Invalid or expired code'
        };
      }

      const verificationRecord = verification[0];

      // Check if code is expired
      if (new Date() > verificationRecord.expiresAt) {
        return {
          success: false,
          message: 'Code has expired'
        };
      }

      // Mark code as used
      await db.update(emailVerifications)
        .set({ isUsed: true })
        .where(eq(emailVerifications.id, verificationRecord.id));

      // Get or create user
      let user;
      if (verificationRecord.userId) {
        const [userData] = await db.select()
          .from(users)
          .where(eq(users.id, verificationRecord.userId))
          .limit(1);
        user = userData;
      } else {
        // Create new user from email verification
        user = await this.createUserFromEmail(identifier);
      }

      if (!user) {
        return {
          success: false,
          message: 'Failed to create or retrieve user'
        };
      }

      // Generate JWT token
      const jwtToken = this.generateJWT(user);

      return {
        success: true,
        user: this.sanitizeUser(user),
        token: jwtToken,
        message: 'Login successful'
      };
    } catch (error) {
      console.error('Code login error:', error);
      return {
        success: false,
        message: 'Code authentication failed'
      };
    }
  }

  // Send verification code
  public async sendVerificationCode(identifier: string, type: 'email' | 'phone'): Promise<{ success: boolean; message: string }> {
    try {
      const code = this.generateVerificationCode();
      const expiresAt = new Date(Date.now() + this.CODE_EXPIRY_MINUTES * 60 * 1000);

      if (type === 'email') {
        // Store email verification
        await db.insert(emailVerifications).values({
          email: identifier,
          token: code,
          type: 'signup',
          expiresAt
        });

        // Send email
        await sendEmail(identifier, 'SyncBoard Verification Code', {
          code,
          expiresIn: this.CODE_EXPIRY_MINUTES
        });
      } else {
        // Store phone verification
        await db.insert(phoneVerifications).values({
          phoneNumber: identifier,
          code,
          expiresAt
        });

        // Send SMS
        await sendSMS(identifier, `Your SyncBoard verification code is: ${code}`);
      }

      return {
        success: true,
        message: `Verification code sent to ${identifier}`
      };
    } catch (error) {
      console.error('Send verification code error:', error);
      return {
        success: false,
        message: 'Failed to send verification code'
      };
    }
  }

  // Verify 2FA code
  public async verify2FA(userId: number, code: string, method: 'email' | 'sms' | 'authenticator'): Promise<AuthResult> {
    try {
      const twoFactor = await this.getTwoFactorAuth(userId);
      
      if (!twoFactor || !twoFactor.isEnabled) {
        return {
          success: false,
          message: 'Two-factor authentication not enabled'
        };
      }

      let isValid = false;

      if (method === 'authenticator' && twoFactor.secret) {
        isValid = verifyTOTP(code, twoFactor.secret);
      } else if (method === 'email' || method === 'sms') {
        // Check verification codes
        const verification = await db.select()
          .from(method === 'email' ? emailVerifications : phoneVerifications)
          .where(and(
            eq(method === 'email' ? emailVerifications.email : phoneVerifications.phoneNumber, 
                method === 'email' ? twoFactor.userId.toString() : twoFactor.userId.toString()),
            eq(method === 'email' ? emailVerifications.token : phoneVerifications.code, code),
            eq(method === 'email' ? emailVerifications.isUsed : phoneVerifications.isUsed, false)
          ))
          .limit(1);

        if (verification.length > 0) {
          const verificationRecord = verification[0];
          if (new Date() <= verificationRecord.expiresAt) {
            isValid = true;
            // Mark as used
            await db.update(method === 'email' ? emailVerifications : phoneVerifications)
              .set({ isUsed: true })
              .where(eq(method === 'email' ? emailVerifications.id : phoneVerifications.id, verificationRecord.id));
          }
        }
      }

      if (!isValid) {
        return {
          success: false,
          message: 'Invalid or expired 2FA code'
        };
      }

      // Get user and generate final token
      const [user] = await db.select()
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      if (!user) {
        return {
          success: false,
          message: 'User not found'
        };
      }

      const jwtToken = this.generateJWT(user);

      return {
        success: true,
        user: this.sanitizeUser(user),
        token: jwtToken,
        message: '2FA verification successful'
      };
    } catch (error) {
      console.error('2FA verification error:', error);
      return {
        success: false,
        message: '2FA verification failed'
      };
    }
  }

  // Setup 2FA
  public async setup2FA(userId: number, method: 'email' | 'sms' | 'authenticator'): Promise<{ success: boolean; secret?: string; qrCode?: string; message: string }> {
    try {
      let secret: string | undefined;
      let qrCode: string | undefined;

      if (method === 'authenticator') {
        secret = generateTOTP();
        qrCode = this.generateQRCode(userId, secret);
      }

      // Store 2FA setup
      await db.insert(twoFactorAuth).values({
        userId,
        method,
        secret,
        isEnabled: true,
        backupCodes: this.generateBackupCodes()
      });

      return {
        success: true,
        secret,
        qrCode,
        message: `2FA setup successful for ${method}`
      };
    } catch (error) {
      console.error('2FA setup error:', error);
      return {
        success: false,
        message: '2FA setup failed'
      };
    }
  }

  // Create user from OAuth data
  private async createUserFromOAuth(provider: string, providerData: any): Promise<any> {
    try {
      // Create user
      const userData: InsertUser = {
        username: providerData.email.split('@')[0],
        email: providerData.email,
        name: providerData.name,
        password: '', // No password for OAuth users
        avatar: providerData.picture,
        role: 'user'
      };

      const [user] = await db.insert(users).values(userData).returning();

      // Create auth provider record
      await db.insert(authProviders).values({
        userId: user.id,
        provider,
        providerId: providerData.id,
        email: providerData.email,
        isVerified: true,
        isPrimary: true,
        metadata: providerData
      });

      // Create drive storage
      await db.insert(driveStorage).values({
        userId: user.id,
        totalSpace: 5368709120, // 5GB
        usedSpace: 0,
        maxSpace: 5368709120
      });

      return user;
    } catch (error) {
      console.error('Create user from OAuth error:', error);
      return null;
    }
  }

  // Create user from email
  private async createUserFromEmail(email: string): Promise<any> {
    try {
      const userData: InsertUser = {
        username: email.split('@')[0],
        email,
        name: email.split('@')[0],
        password: '', // No password for email-only users
        role: 'user'
      };

      const [user] = await db.insert(users).values(userData).returning();

      // Create email auth provider
      await db.insert(authProviders).values({
        userId: user.id,
        provider: 'email',
        providerId: email,
        email,
        isVerified: true,
        isPrimary: true
      });

      // Create drive storage
      await db.insert(driveStorage).values({
        userId: user.id,
        totalSpace: 5368709120, // 5GB
        usedSpace: 0,
        maxSpace: 5368709120
      });

      return user;
    } catch (error) {
      console.error('Create user from email error:', error);
      return null;
    }
  }

  // Verify OAuth token with provider
  private async verifyOAuthToken(provider: string, token: string): Promise<any> {
    // In production, implement actual OAuth verification
    // This is a simplified version
    switch (provider) {
      case 'google':
        return await this.verifyGoogleToken(token);
      case 'microsoft':
        return await this.verifyMicrosoftToken(token);
      case 'apple':
        return await this.verifyAppleToken(token);
      default:
        return null;
    }
  }

  private async verifyGoogleToken(token: string): Promise<any> {
    // Implement Google OAuth verification
    // For now, return mock data
    return {
      id: 'google_' + Date.now(),
      email: 'user@gmail.com',
      name: 'Google User',
      picture: 'https://via.placeholder.com/150'
    };
  }

  private async verifyMicrosoftToken(token: string): Promise<any> {
    // Implement Microsoft OAuth verification
    return {
      id: 'microsoft_' + Date.now(),
      email: 'user@outlook.com',
      name: 'Microsoft User',
      picture: 'https://via.placeholder.com/150'
    };
  }

  private async verifyAppleToken(token: string): Promise<any> {
    // Implement Apple OAuth verification
    return {
      id: 'apple_' + Date.now(),
      email: 'user@icloud.com',
      name: 'Apple User',
      picture: 'https://via.placeholder.com/150'
    };
  }

  // Get 2FA settings for user
  private async getTwoFactorAuth(userId: number): Promise<any> {
    const [twoFactor] = await db.select()
      .from(twoFactorAuth)
      .where(eq(twoFactorAuth.userId, userId))
      .limit(1);
    
    return twoFactor;
  }

  // Generate verification code
  private generateVerificationCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  // Generate JWT token
  private generateJWT(user: any): string {
    // In production, use proper JWT library
    const payload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // 24 hours
    };
    
    // Simplified JWT generation (use jsonwebtoken in production)
    return Buffer.from(JSON.stringify(payload)).toString('base64');
  }

  // Generate temporary token for 2FA
  private generateTempToken(userId: number): string {
    const payload = {
      userId,
      type: 'temp',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (10 * 60) // 10 minutes
    };
    
    return Buffer.from(JSON.stringify(payload)).toString('base64');
  }

  // Generate backup codes
  private generateBackupCodes(): string[] {
    const codes = [];
    for (let i = 0; i < 10; i++) {
      codes.push(crypto.randomBytes(4).toString('hex').toUpperCase());
    }
    return codes;
  }

  // Generate QR code for authenticator app
  private generateQRCode(userId: number, secret: string): string {
    // In production, use qrcode library
    return `otpauth://totp/SyncBoard:${userId}?secret=${secret}&issuer=SyncBoard`;
  }

  // Sanitize user data
  private sanitizeUser(user: any): any {
    const { password, ...sanitized } = user;
    return sanitized;
  }
}