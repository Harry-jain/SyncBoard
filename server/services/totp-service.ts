import crypto from 'crypto';

export function generateTOTP(): string {
  return crypto.randomBytes(20).toString('base32');
}

export function generateTOTPCode(secret: string, timeStep: number = 30): string {
  const epoch = Math.round(Date.now() / 1000.0);
  const time = Math.floor(epoch / timeStep);
  
  const key = Buffer.from(secret, 'base32');
  const timeBuffer = Buffer.alloc(8);
  timeBuffer.writeUInt32BE(0, 0);
  timeBuffer.writeUInt32BE(time, 4);
  
  const hmac = crypto.createHmac('sha1', key);
  hmac.update(timeBuffer);
  const hmacResult = hmac.digest();
  
  const offset = hmacResult[hmacResult.length - 1] & 0xf;
  const code = ((hmacResult[offset] & 0x7f) << 24) |
               ((hmacResult[offset + 1] & 0xff) << 16) |
               ((hmacResult[offset + 2] & 0xff) << 8) |
               (hmacResult[offset + 3] & 0xff);
  
  return (code % 1000000).toString().padStart(6, '0');
}

export function verifyTOTP(token: string, secret: string, window: number = 1): boolean {
  const timeStep = 30;
  const epoch = Math.round(Date.now() / 1000.0);
  
  for (let i = -window; i <= window; i++) {
    const time = Math.floor(epoch / timeStep) + i;
    const expectedCode = generateTOTPCode(secret, timeStep);
    if (expectedCode === token) {
      return true;
    }
  }
  
  return false;
}