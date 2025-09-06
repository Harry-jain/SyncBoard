import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { User } from '@shared/schema';
import { storage } from '../storage';
import { permissionManager } from './permission-manager';

export interface AuthToken {
  userId: number;
  email: string;
  role: string;
  sessionId: string;
  iat: number;
  exp: number;
}

export interface SessionData {
  id: string;
  userId: number;
  ipAddress: string;
  userAgent: string;
  createdAt: Date;
  lastActivity: Date;
  isActive: boolean;
  deviceInfo?: {
    browser: string;
    os: string;
    device: string;
  };
}

export class AuthManager {
  private static instance: AuthManager;
  private activeSessions: Map<string, SessionData> = new Map();
  private userSessions: Map<number, Set<string>> = new Map();
  private readonly JWT_SECRET: string;
  private readonly JWT_EXPIRES_IN: string = '24h';
  private readonly REFRESH_TOKEN_EXPIRES_IN: string = '7d';
  private readonly MAX_SESSIONS_PER_USER: number = 5;
  private readonly SESSION_TIMEOUT: number = 30 * 60 * 1000; // 30 minutes

  private constructor() {
    this.JWT_SECRET = process.env.JWT_SECRET || this.generateSecret();
    this.startSessionCleanup();
  }

  public static getInstance(): AuthManager {
    if (!AuthManager.instance) {
      AuthManager.instance = new AuthManager();
    }
    return AuthManager.instance;
  }

  private generateSecret(): string {
    return crypto.randomBytes(64).toString('hex');
  }

  // Authenticate user with email/password
  public async authenticate(email: string, password: string, req: Request): Promise<{
    user: User;
    token: string;
    refreshToken: string;
    sessionId: string;
  }> {
    try {
      // Find user by email
      const user = await storage.getUserByEmail(email);
      if (!user) {
        throw new Error('Invalid credentials');
      }

      // Verify password
      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        throw new Error('Invalid credentials');
      }

      // Check if user is active
      if (user.status === 'inactive' || user.status === 'suspended') {
        throw new Error('Account is inactive or suspended');
      }

      // Create session
      const sessionId = this.createSession(user.id, req);
      
      // Generate tokens
      const token = this.generateAccessToken(user, sessionId);
      const refreshToken = this.generateRefreshToken(user, sessionId);

      // Update user last login
      await storage.updateUser(user.id, {
        lastLogin: new Date().toISOString(),
        status: 'online'
      });

      return {
        user: this.sanitizeUser(user),
        token,
        refreshToken,
        sessionId
      };
    } catch (error) {
      console.error('Authentication error:', error);
      throw error;
    }
  }

  // Create new session
  private createSession(userId: number, req: Request): string {
    const sessionId = crypto.randomUUID();
    const ipAddress = req.ip || req.connection.remoteAddress || 'unknown';
    const userAgent = req.get('User-Agent') || 'unknown';

    // Check session limit
    const userSessionIds = this.userSessions.get(userId) || new Set();
    if (userSessionIds.size >= this.MAX_SESSIONS_PER_USER) {
      // Remove oldest session
      const oldestSessionId = Array.from(userSessionIds)[0];
      this.removeSession(oldestSessionId);
    }

    const sessionData: SessionData = {
      id: sessionId,
      userId,
      ipAddress,
      userAgent,
      createdAt: new Date(),
      lastActivity: new Date(),
      isActive: true,
      deviceInfo: this.parseUserAgent(userAgent)
    };

    this.activeSessions.set(sessionId, sessionData);
    userSessionIds.add(sessionId);
    this.userSessions.set(userId, userSessionIds);

    return sessionId;
  }

  // Generate access token
  private generateAccessToken(user: User, sessionId: string): string {
    const payload: Omit<AuthToken, 'iat' | 'exp'> = {
      userId: user.id,
      email: user.email || '',
      role: user.role,
      sessionId
    };

    return jwt.sign(payload, this.JWT_SECRET, {
      expiresIn: this.JWT_EXPIRES_IN,
      issuer: 'syncboard',
      audience: 'syncboard-users'
    });
  }

  // Generate refresh token
  private generateRefreshToken(user: User, sessionId: string): string {
    const payload = {
      userId: user.id,
      sessionId,
      type: 'refresh'
    };

    return jwt.sign(payload, this.JWT_SECRET, {
      expiresIn: this.REFRESH_TOKEN_EXPIRES_IN,
      issuer: 'syncboard',
      audience: 'syncboard-users'
    });
  }

  // Verify and decode token
  public verifyToken(token: string): AuthToken | null {
    try {
      const decoded = jwt.verify(token, this.JWT_SECRET, {
        issuer: 'syncboard',
        audience: 'syncboard-users'
      }) as AuthToken;

      // Check if session is still active
      const session = this.activeSessions.get(decoded.sessionId);
      if (!session || !session.isActive) {
        return null;
      }

      // Update last activity
      session.lastActivity = new Date();
      
      return decoded;
    } catch (error) {
      console.error('Token verification error:', error);
      return null;
    }
  }

  // Refresh access token
  public async refreshToken(refreshToken: string, req: Request): Promise<{
    token: string;
    refreshToken: string;
  } | null> {
    try {
      const decoded = jwt.verify(refreshToken, this.JWT_SECRET) as any;
      
      if (decoded.type !== 'refresh') {
        throw new Error('Invalid refresh token');
      }

      const session = this.activeSessions.get(decoded.sessionId);
      if (!session || !session.isActive) {
        throw new Error('Session not found or inactive');
      }

      const user = await storage.getUser(decoded.userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Generate new tokens
      const newToken = this.generateAccessToken(user, decoded.sessionId);
      const newRefreshToken = this.generateRefreshToken(user, decoded.sessionId);

      return {
        token: newToken,
        refreshToken: newRefreshToken
      };
    } catch (error) {
      console.error('Token refresh error:', error);
      return null;
    }
  }

  // Logout user
  public async logout(sessionId: string): Promise<void> {
    this.removeSession(sessionId);
  }

  // Logout all sessions for user
  public async logoutAllSessions(userId: number): Promise<void> {
    const userSessionIds = this.userSessions.get(userId);
    if (userSessionIds) {
      for (const sessionId of userSessionIds) {
        this.removeSession(sessionId);
      }
    }
  }

  // Remove session
  private removeSession(sessionId: string): void {
    const session = this.activeSessions.get(sessionId);
    if (session) {
      const userSessionIds = this.userSessions.get(session.userId);
      if (userSessionIds) {
        userSessionIds.delete(sessionId);
        if (userSessionIds.size === 0) {
          this.userSessions.delete(session.userId);
        }
      }
      this.activeSessions.delete(sessionId);
    }
  }

  // Get user from request
  public async getUserFromRequest(req: Request): Promise<User | null> {
    try {
      const token = this.extractTokenFromRequest(req);
      if (!token) return null;

      const decoded = this.verifyToken(token);
      if (!decoded) return null;

      const user = await storage.getUser(decoded.userId);
      return user ? this.sanitizeUser(user) : null;
    } catch (error) {
      console.error('Get user from request error:', error);
      return null;
    }
  }

  // Extract token from request
  private extractTokenFromRequest(req: Request): string | null {
    const authHeader = req.get('Authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }
    return null;
  }

  // Sanitize user data (remove sensitive information)
  private sanitizeUser(user: User): User {
    const { password, ...sanitizedUser } = user;
    return sanitizedUser as User;
  }

  // Parse user agent for device info
  private parseUserAgent(userAgent: string): { browser: string; os: string; device: string } {
    // Simple user agent parsing (in production, use a library like 'ua-parser-js')
    const isMobile = /Mobile|Android|iPhone|iPad/.test(userAgent);
    const isChrome = /Chrome/.test(userAgent);
    const isFirefox = /Firefox/.test(userAgent);
    const isSafari = /Safari/.test(userAgent);
    const isWindows = /Windows/.test(userAgent);
    const isMac = /Mac/.test(userAgent);
    const isLinux = /Linux/.test(userAgent);

    return {
      browser: isChrome ? 'Chrome' : isFirefox ? 'Firefox' : isSafari ? 'Safari' : 'Unknown',
      os: isWindows ? 'Windows' : isMac ? 'macOS' : isLinux ? 'Linux' : 'Unknown',
      device: isMobile ? 'Mobile' : 'Desktop'
    };
  }

  // Session cleanup (remove inactive sessions)
  private startSessionCleanup(): void {
    setInterval(() => {
      const now = new Date();
      for (const [sessionId, session] of this.activeSessions.entries()) {
        const timeSinceActivity = now.getTime() - session.lastActivity.getTime();
        if (timeSinceActivity > this.SESSION_TIMEOUT) {
          this.removeSession(sessionId);
        }
      }
    }, 5 * 60 * 1000); // Run every 5 minutes
  }

  // Get active sessions for user
  public getActiveSessions(userId: number): SessionData[] {
    const userSessionIds = this.userSessions.get(userId);
    if (!userSessionIds) return [];

    return Array.from(userSessionIds)
      .map(sessionId => this.activeSessions.get(sessionId))
      .filter((session): session is SessionData => session !== undefined);
  }

  // Middleware for authentication
  public requireAuth() {
    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        const user = await this.getUserFromRequest(req);
        if (!user) {
          return res.status(401).json({ error: 'Authentication required' });
        }

        req.user = user;
        next();
      } catch (error) {
        console.error('Auth middleware error:', error);
        res.status(401).json({ error: 'Authentication failed' });
      }
    };
  }

  // Middleware for role-based access
  public requireRole(roles: string[]) {
    return (req: Request, res: Response, next: NextFunction) => {
      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      if (!roles.includes(req.user.role)) {
        return res.status(403).json({ 
          error: 'Insufficient permissions',
          required_roles: roles,
          user_role: req.user.role
        });
      }

      next();
    };
  }

  // Hash password
  public async hashPassword(password: string): Promise<string> {
    const saltRounds = 12;
    return bcrypt.hash(password, saltRounds);
  }

  // Verify password
  public async verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  // Generate secure random password
  public generateSecurePassword(length: number = 16): string {
    const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < length; i++) {
      password += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    return password;
  }

  // Get session statistics
  public getSessionStats(): {
    totalSessions: number;
    activeUsers: number;
    sessionsByDevice: Record<string, number>;
  } {
    const sessions = Array.from(this.activeSessions.values());
    const uniqueUsers = new Set(sessions.map(s => s.userId)).size;
    
    const sessionsByDevice: Record<string, number> = {};
    sessions.forEach(session => {
      const device = session.deviceInfo?.device || 'Unknown';
      sessionsByDevice[device] = (sessionsByDevice[device] || 0) + 1;
    });

    return {
      totalSessions: sessions.length,
      activeUsers: uniqueUsers,
      sessionsByDevice
    };
  }
}

export const authManager = AuthManager.getInstance();