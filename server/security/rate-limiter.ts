import { Request, Response, NextFunction } from 'express';
import { Redis } from 'ioredis';

export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
  keyGenerator?: (req: Request) => string;
  onLimitReached?: (req: Request, res: Response) => void;
}

export interface RateLimitRule {
  path: string;
  method?: string;
  config: RateLimitConfig;
}

export class RateLimiter {
  private static instance: RateLimiter;
  private redis: Redis;
  private rules: Map<string, RateLimitRule> = new Map();
  private ipWhitelist: Set<string> = new Set();
  private ipBlacklist: Set<string> = new Set();

  private constructor() {
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3,
      lazyConnect: true
    });

    this.initializeDefaultRules();
    this.startCleanup();
  }

  public static getInstance(): RateLimiter {
    if (!RateLimiter.instance) {
      RateLimiter.instance = new RateLimiter();
    }
    return RateLimiter.instance;
  }

  private initializeDefaultRules(): void {
    // Authentication endpoints - stricter limits
    this.addRule({
      path: '/api/auth/login',
      method: 'POST',
      config: {
        windowMs: 15 * 60 * 1000, // 15 minutes
        maxRequests: 5, // 5 attempts per 15 minutes
        onLimitReached: (req, res) => {
          console.warn(`Rate limit exceeded for login attempt from ${req.ip}`);
        }
      }
    });

    this.addRule({
      path: '/api/auth/register',
      method: 'POST',
      config: {
        windowMs: 60 * 60 * 1000, // 1 hour
        maxRequests: 3, // 3 registrations per hour
        onLimitReached: (req, res) => {
          console.warn(`Rate limit exceeded for registration attempt from ${req.ip}`);
        }
      }
    });

    // Password reset - very strict
    this.addRule({
      path: '/api/auth/reset-password',
      method: 'POST',
      config: {
        windowMs: 60 * 60 * 1000, // 1 hour
        maxRequests: 2, // 2 password resets per hour
        onLimitReached: (req, res) => {
          console.warn(`Rate limit exceeded for password reset from ${req.ip}`);
        }
      }
    });

    // General API endpoints
    this.addRule({
      path: '/api',
      config: {
        windowMs: 15 * 60 * 1000, // 15 minutes
        maxRequests: 1000, // 1000 requests per 15 minutes
      }
    });

    // WebSocket connections
    this.addRule({
      path: '/ws',
      config: {
        windowMs: 60 * 1000, // 1 minute
        maxRequests: 10, // 10 connection attempts per minute
      }
    });

    // File upload endpoints
    this.addRule({
      path: '/api/files/upload',
      method: 'POST',
      config: {
        windowMs: 60 * 60 * 1000, // 1 hour
        maxRequests: 50, // 50 uploads per hour
      }
    });

    // Classroom join endpoints
    this.addRule({
      path: '/api/classrooms/join',
      method: 'POST',
      config: {
        windowMs: 5 * 60 * 1000, // 5 minutes
        maxRequests: 10, // 10 join attempts per 5 minutes
      }
    });

    // Assignment submission
    this.addRule({
      path: '/api/assignments/submit',
      method: 'POST',
      config: {
        windowMs: 60 * 1000, // 1 minute
        maxRequests: 5, // 5 submissions per minute
      }
    });

    // Search endpoints
    this.addRule({
      path: '/api/search',
      config: {
        windowMs: 60 * 1000, // 1 minute
        maxRequests: 30, // 30 searches per minute
      }
    });
  }

  public addRule(rule: RateLimitRule): void {
    const key = this.generateRuleKey(rule);
    this.rules.set(key, rule);
  }

  private generateRuleKey(rule: RateLimitRule): string {
    return `${rule.method || '*'}:${rule.path}`;
  }

  // Main rate limiting middleware
  public rateLimit() {
    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        // Check if IP is whitelisted
        if (this.ipWhitelist.has(req.ip || '')) {
          return next();
        }

        // Check if IP is blacklisted
        if (this.ipBlacklist.has(req.ip || '')) {
          return res.status(403).json({ 
            error: 'IP address is blacklisted',
            code: 'IP_BLACKLISTED'
          });
        }

        // Find applicable rule
        const rule = this.findApplicableRule(req);
        if (!rule) {
          return next();
        }

        // Generate rate limit key
        const key = this.generateRateLimitKey(req, rule);
        
        // Check current request count
        const currentCount = await this.getCurrentCount(key, rule.config.windowMs);
        
        if (currentCount >= rule.config.maxRequests) {
          // Rate limit exceeded
          if (rule.config.onLimitReached) {
            rule.config.onLimitReached(req, res);
          }

          // Add to blacklist if too many violations
          await this.handleRateLimitExceeded(req.ip || '');

          return res.status(429).json({
            error: 'Rate limit exceeded',
            code: 'RATE_LIMIT_EXCEEDED',
            retryAfter: Math.ceil(rule.config.windowMs / 1000),
            limit: rule.config.maxRequests,
            windowMs: rule.config.windowMs
          });
        }

        // Increment counter
        await this.incrementCounter(key, rule.config.windowMs);

        // Add rate limit headers
        res.set({
          'X-RateLimit-Limit': rule.config.maxRequests.toString(),
          'X-RateLimit-Remaining': Math.max(0, rule.config.maxRequests - currentCount - 1).toString(),
          'X-RateLimit-Reset': new Date(Date.now() + rule.config.windowMs).toISOString()
        });

        next();
      } catch (error) {
        console.error('Rate limiting error:', error);
        // Don't block requests if rate limiting fails
        next();
      }
    };
  }

  private findApplicableRule(req: Request): RateLimitRule | null {
    const path = req.path;
    const method = req.method;

    // First, try exact match with method
    const exactKey = `${method}:${path}`;
    if (this.rules.has(exactKey)) {
      return this.rules.get(exactKey)!;
    }

    // Then try path-only match
    const pathKey = `*:${path}`;
    if (this.rules.has(pathKey)) {
      return this.rules.get(pathKey)!;
    }

    // Finally, try prefix match
    for (const [key, rule] of this.rules.entries()) {
      const [ruleMethod, rulePath] = key.split(':');
      if ((ruleMethod === '*' || ruleMethod === method) && path.startsWith(rulePath)) {
        return rule;
      }
    }

    return null;
  }

  private generateRateLimitKey(req: Request, rule: RateLimitRule): string {
    if (rule.config.keyGenerator) {
      return rule.config.keyGenerator(req);
    }

    // Default key generation
    const ip = req.ip || 'unknown';
    const userId = (req as any).user?.id || 'anonymous';
    const path = rule.path;
    const method = rule.method || '*';

    return `rate_limit:${method}:${path}:${ip}:${userId}`;
  }

  private async getCurrentCount(key: string, windowMs: number): Promise<number> {
    try {
      const count = await this.redis.get(key);
      return count ? parseInt(count) : 0;
    } catch (error) {
      console.error('Redis get error:', error);
      return 0;
    }
  }

  private async incrementCounter(key: string, windowMs: number): Promise<void> {
    try {
      const pipeline = this.redis.pipeline();
      pipeline.incr(key);
      pipeline.expire(key, Math.ceil(windowMs / 1000));
      await pipeline.exec();
    } catch (error) {
      console.error('Redis increment error:', error);
    }
  }

  private async handleRateLimitExceeded(ip: string): Promise<void> {
    try {
      const violationKey = `rate_violations:${ip}`;
      const violations = await this.redis.incr(violationKey);
      
      // Set expiration for violation counter
      await this.redis.expire(violationKey, 24 * 60 * 60); // 24 hours

      // Add to blacklist if too many violations
      if (violations >= 10) {
        this.ipBlacklist.add(ip);
        console.warn(`IP ${ip} added to blacklist due to excessive rate limit violations`);
        
        // Remove from blacklist after 24 hours
        setTimeout(() => {
          this.ipBlacklist.delete(ip);
          console.log(`IP ${ip} removed from blacklist`);
        }, 24 * 60 * 60 * 1000);
      }
    } catch (error) {
      console.error('Rate limit violation handling error:', error);
    }
  }

  // Add IP to whitelist
  public whitelistIP(ip: string): void {
    this.ipWhitelist.add(ip);
  }

  // Add IP to blacklist
  public blacklistIP(ip: string): void {
    this.ipBlacklist.add(ip);
  }

  // Remove IP from blacklist
  public unblacklistIP(ip: string): void {
    this.ipBlacklist.delete(ip);
  }

  // Get rate limit status for IP
  public async getRateLimitStatus(ip: string): Promise<{
    isWhitelisted: boolean;
    isBlacklisted: boolean;
    violations: number;
  }> {
    const violations = await this.redis.get(`rate_violations:${ip}`);
    return {
      isWhitelisted: this.ipWhitelist.has(ip),
      isBlacklisted: this.ipBlacklist.has(ip),
      violations: violations ? parseInt(violations) : 0
    };
  }

  // Cleanup expired keys
  private startCleanup(): void {
    setInterval(async () => {
      try {
        // This is handled by Redis TTL, but we can add additional cleanup here
        const keys = await this.redis.keys('rate_limit:*');
        if (keys.length > 10000) {
          console.warn(`High number of rate limit keys: ${keys.length}`);
        }
      } catch (error) {
        console.error('Rate limit cleanup error:', error);
      }
    }, 60 * 60 * 1000); // Run every hour
  }

  // Get rate limit statistics
  public async getStats(): Promise<{
    totalRules: number;
    whitelistedIPs: number;
    blacklistedIPs: number;
    activeKeys: number;
  }> {
    try {
      const keys = await this.redis.keys('rate_limit:*');
      return {
        totalRules: this.rules.size,
        whitelistedIPs: this.ipWhitelist.size,
        blacklistedIPs: this.ipBlacklist.size,
        activeKeys: keys.length
      };
    } catch (error) {
      console.error('Rate limit stats error:', error);
      return {
        totalRules: this.rules.size,
        whitelistedIPs: this.ipWhitelist.size,
        blacklistedIPs: this.ipBlacklist.size,
        activeKeys: 0
      };
    }
  }

  // Close Redis connection
  public async close(): Promise<void> {
    await this.redis.quit();
  }
}

export const rateLimiter = RateLimiter.getInstance();