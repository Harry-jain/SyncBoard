import crypto from 'crypto';
import { createCipheriv, createDecipheriv, randomBytes, scrypt } from 'crypto';
import { promisify } from 'util';

const scryptAsync = promisify(scrypt);

export interface EncryptionConfig {
  algorithm: string;
  keyLength: number;
  ivLength: number;
  saltLength: number;
  iterations: number;
}

export interface EncryptedData {
  encrypted: string;
  iv: string;
  salt: string;
  tag?: string;
}

export class EncryptionManager {
  private static instance: EncryptionManager;
  private config: EncryptionConfig;
  private masterKey: Buffer;

  private constructor() {
    this.config = {
      algorithm: 'aes-256-gcm',
      keyLength: 32, // 256 bits
      ivLength: 16,  // 128 bits
      saltLength: 32, // 256 bits
      iterations: 100000 // PBKDF2 iterations
    };

    // Generate or load master key
    this.masterKey = this.getOrCreateMasterKey();
  }

  public static getInstance(): EncryptionManager {
    if (!EncryptionManager.instance) {
      EncryptionManager.instance = new EncryptionManager();
    }
    return EncryptionManager.instance;
  }

  private getOrCreateMasterKey(): Buffer {
    const masterKeyEnv = process.env.MASTER_ENCRYPTION_KEY;
    
    if (masterKeyEnv) {
      return Buffer.from(masterKeyEnv, 'hex');
    }

    // Generate new master key (in production, this should be stored securely)
    const masterKey = randomBytes(this.config.keyLength);
    console.warn('⚠️  Generated new master encryption key. Store MASTER_ENCRYPTION_KEY in environment variables for production!');
    console.warn(`Master Key: ${masterKey.toString('hex')}`);
    
    return masterKey;
  }

  // Encrypt data with master key
  public async encrypt(data: string, password?: string): Promise<EncryptedData> {
    try {
      const key = password ? await this.deriveKey(password) : this.masterKey;
      const iv = randomBytes(this.config.ivLength);
      const salt = randomBytes(this.config.saltLength);
      
      const cipher = createCipheriv(this.config.algorithm, key, iv);
      
      let encrypted = cipher.update(data, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      const tag = cipher.getAuthTag();
      
      return {
        encrypted,
        iv: iv.toString('hex'),
        salt: salt.toString('hex'),
        tag: tag.toString('hex')
      };
    } catch (error) {
      throw new Error(`Encryption failed: ${error}`);
    }
  }

  // Decrypt data with master key
  public async decrypt(encryptedData: EncryptedData, password?: string): Promise<string> {
    try {
      const key = password ? await this.deriveKey(password, encryptedData.salt) : this.masterKey;
      const iv = Buffer.from(encryptedData.iv, 'hex');
      const tag = Buffer.from(encryptedData.tag || '', 'hex');
      
      const decipher = createDecipheriv(this.config.algorithm, key, iv);
      decipher.setAuthTag(tag);
      
      let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } catch (error) {
      throw new Error(`Decryption failed: ${error}`);
    }
  }

  // Derive key from password using PBKDF2
  private async deriveKey(password: string, salt?: string): Promise<Buffer> {
    const saltBuffer = salt ? Buffer.from(salt, 'hex') : randomBytes(this.config.saltLength);
    const key = await scryptAsync(password, saltBuffer, this.config.keyLength) as Buffer;
    return key;
  }

  // Hash sensitive data (one-way)
  public hash(data: string, salt?: string): string {
    const saltBuffer = salt ? Buffer.from(salt, 'hex') : randomBytes(32);
    const hash = crypto.pbkdf2Sync(data, saltBuffer, this.config.iterations, 64, 'sha512');
    return `${saltBuffer.toString('hex')}:${hash.toString('hex')}`;
  }

  // Verify hash
  public verifyHash(data: string, hash: string): boolean {
    const [salt, hashValue] = hash.split(':');
    const newHash = this.hash(data, salt);
    return newHash === hash;
  }

  // Encrypt file data
  public async encryptFile(fileBuffer: Buffer, password?: string): Promise<EncryptedData> {
    return this.encrypt(fileBuffer.toString('base64'), password);
  }

  // Decrypt file data
  public async decryptFile(encryptedData: EncryptedData, password?: string): Promise<Buffer> {
    const decrypted = await this.decrypt(encryptedData, password);
    return Buffer.from(decrypted, 'base64');
  }

  // Encrypt database fields
  public async encryptDatabaseField(value: string | null): Promise<string | null> {
    if (!value) return null;
    const encrypted = await this.encrypt(value);
    return JSON.stringify(encrypted);
  }

  // Decrypt database fields
  public async decryptDatabaseField(encryptedValue: string | null): Promise<string | null> {
    if (!encryptedValue) return null;
    try {
      const encryptedData = JSON.parse(encryptedValue) as EncryptedData;
      return await this.decrypt(encryptedData);
    } catch (error) {
      console.error('Database field decryption failed:', error);
      return null;
    }
  }

  // Generate secure random token
  public generateSecureToken(length: number = 32): string {
    return randomBytes(length).toString('hex');
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

  // Encrypt user data
  public async encryptUserData(userData: any): Promise<any> {
    const encryptedData = { ...userData };
    
    // Encrypt sensitive fields
    const sensitiveFields = ['email', 'phone', 'address', 'ssn', 'creditCard'];
    
    for (const field of sensitiveFields) {
      if (encryptedData[field]) {
        encryptedData[field] = await this.encryptDatabaseField(encryptedData[field]);
      }
    }
    
    return encryptedData;
  }

  // Decrypt user data
  public async decryptUserData(encryptedData: any): Promise<any> {
    const decryptedData = { ...encryptedData };
    
    // Decrypt sensitive fields
    const sensitiveFields = ['email', 'phone', 'address', 'ssn', 'creditCard'];
    
    for (const field of sensitiveFields) {
      if (decryptedData[field]) {
        decryptedData[field] = await this.decryptDatabaseField(decryptedData[field]);
      }
    }
    
    return decryptedData;
  }

  // Encrypt classroom data
  public async encryptClassroomData(classroomData: any): Promise<any> {
    const encryptedData = { ...classroomData };
    
    // Encrypt sensitive classroom fields
    if (encryptedData.description) {
      encryptedData.description = await this.encryptDatabaseField(encryptedData.description);
    }
    
    return encryptedData;
  }

  // Decrypt classroom data
  public async decryptClassroomData(encryptedData: any): Promise<any> {
    const decryptedData = { ...encryptedData };
    
    if (decryptedData.description) {
      decryptedData.description = await this.decryptDatabaseField(decryptedData.description);
    }
    
    return decryptedData;
  }

  // Encrypt assignment data
  public async encryptAssignmentData(assignmentData: any): Promise<any> {
    const encryptedData = { ...assignmentData };
    
    // Encrypt assignment content
    if (encryptedData.instructions) {
      encryptedData.instructions = await this.encryptDatabaseField(assignmentData.instructions);
    }
    
    if (encryptedData.starterCode) {
      encryptedData.starterCode = await this.encryptDatabaseField(assignmentData.starterCode);
    }
    
    return encryptedData;
  }

  // Decrypt assignment data
  public async decryptAssignmentData(encryptedData: any): Promise<any> {
    const decryptedData = { ...encryptedData };
    
    if (decryptedData.instructions) {
      decryptedData.instructions = await this.decryptDatabaseField(encryptedData.instructions);
    }
    
    if (decryptedData.starterCode) {
      decryptedData.starterCode = await this.decryptDatabaseField(encryptedData.starterCode);
    }
    
    return decryptedData;
  }

  // Encrypt message content
  public async encryptMessage(messageData: any): Promise<any> {
    const encryptedData = { ...messageData };
    
    if (encryptedData.content) {
      encryptedData.content = await this.encryptDatabaseField(messageData.content);
    }
    
    return encryptedData;
  }

  // Decrypt message content
  public async decryptMessage(encryptedData: any): Promise<any> {
    const decryptedData = { ...encryptedData };
    
    if (decryptedData.content) {
      decryptedData.content = await this.decryptDatabaseField(encryptedData.content);
    }
    
    return decryptedData;
  }

  // Generate data integrity hash
  public generateIntegrityHash(data: any): string {
    const dataString = JSON.stringify(data, Object.keys(data).sort());
    return crypto.createHash('sha256').update(dataString).digest('hex');
  }

  // Verify data integrity
  public verifyIntegrityHash(data: any, expectedHash: string): boolean {
    const actualHash = this.generateIntegrityHash(data);
    return actualHash === expectedHash;
  }

  // Encrypt with rotation (for key rotation)
  public async encryptWithRotation(data: string, keyVersion: number = 1): Promise<EncryptedData & { keyVersion: number }> {
    const encrypted = await this.encrypt(data);
    return {
      ...encrypted,
      keyVersion
    };
  }

  // Decrypt with rotation support
  public async decryptWithRotation(encryptedData: EncryptedData & { keyVersion?: number }): Promise<string> {
    // For now, use the same key regardless of version
    // In production, you'd maintain multiple keys and select based on version
    return this.decrypt(encryptedData);
  }

  // Get encryption statistics
  public getStats(): {
    algorithm: string;
    keyLength: number;
    ivLength: number;
    saltLength: number;
    iterations: number;
  } {
    return { ...this.config };
  }
}

export const encryptionManager = EncryptionManager.getInstance();