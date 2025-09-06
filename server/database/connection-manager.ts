import { Pool, PoolClient, PoolConfig } from 'pg';
import { Redis } from 'ioredis';
import { storage } from '../storage';

export interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  ssl?: boolean | object;
  max?: number;
  min?: number;
  idleTimeoutMillis?: number;
  connectionTimeoutMillis?: number;
}

export interface ConnectionStats {
  totalConnections: number;
  idleConnections: number;
  waitingClients: number;
  queryCount: number;
  errorCount: number;
  averageQueryTime: number;
}

export class ConnectionManager {
  private static instance: ConnectionManager;
  private primaryPool: Pool;
  private readOnlyPool: Pool;
  private redis: Redis;
  private queryCount: number = 0;
  private errorCount: number = 0;
  private queryTimes: number[] = [];
  private readonly MAX_QUERY_TIME_HISTORY = 1000;

  private constructor() {
    this.initializePools();
    this.initializeRedis();
    this.startHealthChecks();
  }

  public static getInstance(): ConnectionManager {
    if (!ConnectionManager.instance) {
      ConnectionManager.instance = new ConnectionManager();
    }
    return ConnectionManager.instance;
  }

  private initializePools(): void {
    const config: DatabaseConfig = {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME || 'syncboard',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'password',
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
      max: parseInt(process.env.DB_MAX_CONNECTIONS || '100'),
      min: parseInt(process.env.DB_MIN_CONNECTIONS || '10'),
      idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT || '30000'),
      connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT || '10000')
    };

    // Primary pool for writes and critical reads
    this.primaryPool = new Pool({
      ...config,
      max: Math.floor(config.max! * 0.7), // 70% for primary
      application_name: 'syncboard_primary'
    });

    // Read-only pool for non-critical reads
    this.readOnlyPool = new Pool({
      ...config,
      max: Math.floor(config.max! * 0.3), // 30% for read-only
      application_name: 'syncboard_readonly'
    });

    // Set up error handling
    this.primaryPool.on('error', (err) => {
      console.error('Primary pool error:', err);
      this.errorCount++;
    });

    this.readOnlyPool.on('error', (err) => {
      console.error('Read-only pool error:', err);
      this.errorCount++;
    });
  }

  private initializeRedis(): void {
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3,
      lazyConnect: true,
      keyPrefix: 'syncboard:'
    });

    this.redis.on('error', (err) => {
      console.error('Redis error:', err);
    });
  }

  // Get connection from appropriate pool
  public async getConnection(readOnly: boolean = false): Promise<PoolClient> {
    const pool = readOnly ? this.readOnlyPool : this.primaryPool;
    const startTime = Date.now();
    
    try {
      const client = await pool.connect();
      const queryTime = Date.now() - startTime;
      this.recordQueryTime(queryTime);
      return client;
    } catch (error) {
      this.errorCount++;
      throw error;
    }
  }

  // Execute query with automatic connection management
  public async query<T = any>(
    text: string, 
    params?: any[], 
    readOnly: boolean = false
  ): Promise<{ rows: T[]; rowCount: number }> {
    const client = await this.getConnection(readOnly);
    const startTime = Date.now();
    
    try {
      const result = await client.query(text, params);
      this.queryCount++;
      return {
        rows: result.rows,
        rowCount: result.rowCount || 0
      };
    } catch (error) {
      this.errorCount++;
      throw error;
    } finally {
      client.release();
      this.recordQueryTime(Date.now() - startTime);
    }
  }

  // Execute transaction
  public async transaction<T>(
    callback: (client: PoolClient) => Promise<T>,
    readOnly: boolean = false
  ): Promise<T> {
    const client = await this.getConnection(readOnly);
    const startTime = Date.now();
    
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      this.queryCount++;
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      this.errorCount++;
      throw error;
    } finally {
      client.release();
      this.recordQueryTime(Date.now() - startTime);
    }
  }

  // Cache operations
  public async cacheGet(key: string): Promise<any> {
    try {
      const value = await this.redis.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error('Cache get error:', error);
      return null;
    }
  }

  public async cacheSet(key: string, value: any, ttlSeconds?: number): Promise<void> {
    try {
      const serialized = JSON.stringify(value);
      if (ttlSeconds) {
        await this.redis.setex(key, ttlSeconds, serialized);
      } else {
        await this.redis.set(key, serialized);
      }
    } catch (error) {
      console.error('Cache set error:', error);
    }
  }

  public async cacheDel(key: string): Promise<void> {
    try {
      await this.redis.del(key);
    } catch (error) {
      console.error('Cache delete error:', error);
    }
  }

  public async cacheInvalidatePattern(pattern: string): Promise<void> {
    try {
      const keys = await this.redis.keys(pattern);
      if (keys.length > 0) {
        await this.redis.del(...keys);
      }
    } catch (error) {
      console.error('Cache invalidate pattern error:', error);
    }
  }

  // Record query time for statistics
  private recordQueryTime(time: number): void {
    this.queryTimes.push(time);
    if (this.queryTimes.length > this.MAX_QUERY_TIME_HISTORY) {
      this.queryTimes.shift();
    }
  }

  // Health checks
  private startHealthChecks(): void {
    setInterval(async () => {
      await this.checkDatabaseHealth();
      await this.checkRedisHealth();
    }, 30000); // Every 30 seconds
  }

  private async checkDatabaseHealth(): Promise<void> {
    try {
      await this.query('SELECT 1', [], true);
    } catch (error) {
      console.error('Database health check failed:', error);
    }
  }

  private async checkRedisHealth(): Promise<void> {
    try {
      await this.redis.ping();
    } catch (error) {
      console.error('Redis health check failed:', error);
    }
  }

  // Get connection statistics
  public getStats(): ConnectionStats {
    const averageQueryTime = this.queryTimes.length > 0 
      ? this.queryTimes.reduce((a, b) => a + b, 0) / this.queryTimes.length 
      : 0;

    return {
      totalConnections: this.primaryPool.totalCount + this.readOnlyPool.totalCount,
      idleConnections: this.primaryPool.idleCount + this.readOnlyPool.idleCount,
      waitingClients: this.primaryPool.waitingCount + this.readOnlyPool.waitingCount,
      queryCount: this.queryCount,
      errorCount: this.errorCount,
      averageQueryTime: Math.round(averageQueryTime)
    };
  }

  // Optimize database connections
  public async optimizeConnections(): Promise<void> {
    try {
      // Analyze query performance
      await this.query(`
        ANALYZE;
      `);

      // Update table statistics
      await this.query(`
        UPDATE pg_stat_user_tables 
        SET n_tup_ins = 0, n_tup_upd = 0, n_tup_del = 0 
        WHERE schemaname = 'public';
      `);

      // Vacuum if needed
      const vacuumNeeded = await this.query(`
        SELECT schemaname, tablename, n_dead_tup, n_live_tup
        FROM pg_stat_user_tables 
        WHERE n_dead_tup > n_live_tup * 0.1;
      `);

      if (vacuumNeeded.rows.length > 0) {
        console.log('Running VACUUM on tables with high dead tuple ratio');
        await this.query('VACUUM ANALYZE;');
      }
    } catch (error) {
      console.error('Database optimization error:', error);
    }
  }

  // Close all connections
  public async close(): Promise<void> {
    await Promise.all([
      this.primaryPool.end(),
      this.readOnlyPool.end(),
      this.redis.quit()
    ]);
  }

  // Get pool for direct access (use with caution)
  public getPrimaryPool(): Pool {
    return this.primaryPool;
  }

  public getReadOnlyPool(): Pool {
    return this.readOnlyPool;
  }

  public getRedis(): Redis {
    return this.redis;
  }
}

export const connectionManager = ConnectionManager.getInstance();