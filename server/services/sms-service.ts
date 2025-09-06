// SMS Service using Twilio (or other SMS provider)
interface SMSResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export class SMSService {
  private accountSid: string;
  private authToken: string;
  private fromNumber: string;

  constructor() {
    this.accountSid = process.env.TWILIO_ACCOUNT_SID || '';
    this.authToken = process.env.TWILIO_AUTH_TOKEN || '';
    this.fromNumber = process.env.TWILIO_FROM_NUMBER || '';
  }

  public async sendSMS(to: string, message: string): Promise<SMSResult> {
    try {
      // In production, use actual Twilio SDK
      // const client = require('twilio')(this.accountSid, this.authToken);
      
      // For development, simulate SMS sending
      console.log(`SMS to ${to}: ${message}`);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      return {
        success: true,
        messageId: `sms_${Date.now()}`
      };
    } catch (error) {
      console.error('SMS sending failed:', error);
      return {
        success: false,
        error: 'Failed to send SMS'
      };
    }
  }

  public async sendVerificationCode(phoneNumber: string, code: string): Promise<SMSResult> {
    const message = `Your SyncBoard verification code is: ${code}\n\nThis code will expire in 10 minutes.`;
    return await this.sendSMS(phoneNumber, message);
  }

  public async send2FACode(phoneNumber: string, code: string): Promise<SMSResult> {
    const message = `Your SyncBoard 2FA code is: ${code}\n\nThis code will expire in 10 minutes.`;
    return await this.sendSMS(phoneNumber, message);
  }
}

export const sendSMS = async (phoneNumber: string, message: string): Promise<boolean> => {
  const smsService = new SMSService();
  const result = await smsService.sendSMS(phoneNumber, message);
  return result.success;
};