import nodemailer from 'nodemailer';

interface EmailTemplate {
  subject: string;
  html: string;
  text: string;
}

export class EmailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransporter({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
  }

  public async sendEmail(to: string, subject: string, data: any): Promise<boolean> {
    try {
      const template = this.getEmailTemplate(subject, data);
      
      const mailOptions = {
        from: process.env.SMTP_FROM || 'noreply@syncboard.com',
        to,
        subject: template.subject,
        html: template.html,
        text: template.text
      };

      await this.transporter.sendMail(mailOptions);
      console.log(`Email sent to ${to}: ${subject}`);
      return true;
    } catch (error) {
      console.error('Email sending failed:', error);
      return false;
    }
  }

  private getEmailTemplate(subject: string, data: any): EmailTemplate {
    switch (subject) {
      case 'SyncBoard Verification Code':
        return this.getVerificationCodeTemplate(data);
      case 'SyncBoard Email Verification':
        return this.getEmailVerificationTemplate(data);
      case 'SyncBoard Password Reset':
        return this.getPasswordResetTemplate(data);
      case 'SyncBoard 2FA Code':
        return this.get2FACodeTemplate(data);
      default:
        return this.getDefaultTemplate(subject, data);
    }
  }

  private getVerificationCodeTemplate(data: any): EmailTemplate {
    return {
      subject: 'Your SyncBoard Verification Code',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px;">SyncBoard</h1>
            <p style="color: white; margin: 10px 0 0 0; font-size: 16px;">Collaborative Development Platform</p>
          </div>
          
          <div style="padding: 40px 30px; background: #f8f9fa;">
            <h2 style="color: #333; margin: 0 0 20px 0;">Verification Code</h2>
            <p style="color: #666; font-size: 16px; line-height: 1.5; margin: 0 0 30px 0;">
              Use the following code to complete your verification:
            </p>
            
            <div style="background: white; border: 2px solid #e9ecef; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0;">
              <span style="font-size: 32px; font-weight: bold; color: #667eea; letter-spacing: 4px;">${data.code}</span>
            </div>
            
            <p style="color: #666; font-size: 14px; margin: 20px 0 0 0;">
              This code will expire in ${data.expiresIn} minutes.
            </p>
          </div>
          
          <div style="background: #f8f9fa; padding: 20px 30px; text-align: center; border-top: 1px solid #e9ecef;">
            <p style="color: #999; font-size: 12px; margin: 0;">
              If you didn't request this code, please ignore this email.
            </p>
          </div>
        </div>
      `,
      text: `Your SyncBoard verification code is: ${data.code}\n\nThis code will expire in ${data.expiresIn} minutes.\n\nIf you didn't request this code, please ignore this email.`
    };
  }

  private getEmailVerificationTemplate(data: any): EmailTemplate {
    return {
      subject: 'Verify Your SyncBoard Account',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px;">SyncBoard</h1>
            <p style="color: white; margin: 10px 0 0 0; font-size: 16px;">Welcome to SyncBoard!</p>
          </div>
          
          <div style="padding: 40px 30px; background: #f8f9fa;">
            <h2 style="color: #333; margin: 0 0 20px 0;">Verify Your Email Address</h2>
            <p style="color: #666; font-size: 16px; line-height: 1.5; margin: 0 0 30px 0;">
              Thank you for signing up! Please click the button below to verify your email address and activate your account.
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${data.verificationUrl}" style="background: #667eea; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
                Verify Email Address
              </a>
            </div>
            
            <p style="color: #666; font-size: 14px; margin: 20px 0 0 0;">
              If the button doesn't work, copy and paste this link into your browser:<br>
              <a href="${data.verificationUrl}" style="color: #667eea;">${data.verificationUrl}</a>
            </p>
          </div>
          
          <div style="background: #f8f9fa; padding: 20px 30px; text-align: center; border-top: 1px solid #e9ecef;">
            <p style="color: #999; font-size: 12px; margin: 0;">
              This verification link will expire in 24 hours.
            </p>
          </div>
        </div>
      `,
      text: `Welcome to SyncBoard!\n\nPlease verify your email address by clicking this link: ${data.verificationUrl}\n\nThis verification link will expire in 24 hours.`
    };
  }

  private getPasswordResetTemplate(data: any): EmailTemplate {
    return {
      subject: 'Reset Your SyncBoard Password',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px;">SyncBoard</h1>
            <p style="color: white; margin: 10px 0 0 0; font-size: 16px;">Password Reset Request</p>
          </div>
          
          <div style="padding: 40px 30px; background: #f8f9fa;">
            <h2 style="color: #333; margin: 0 0 20px 0;">Reset Your Password</h2>
            <p style="color: #666; font-size: 16px; line-height: 1.5; margin: 0 0 30px 0;">
              We received a request to reset your password. Click the button below to create a new password.
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${data.resetUrl}" style="background: #dc3545; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
                Reset Password
              </a>
            </div>
            
            <p style="color: #666; font-size: 14px; margin: 20px 0 0 0;">
              If you didn't request this password reset, please ignore this email or contact support if you have concerns.
            </p>
          </div>
          
          <div style="background: #f8f9fa; padding: 20px 30px; text-align: center; border-top: 1px solid #e9ecef;">
            <p style="color: #999; font-size: 12px; margin: 0;">
              This password reset link will expire in 1 hour.
            </p>
          </div>
        </div>
      `,
      text: `Reset Your SyncBoard Password\n\nClick this link to reset your password: ${data.resetUrl}\n\nIf you didn't request this password reset, please ignore this email.\n\nThis link will expire in 1 hour.`
    };
  }

  private get2FACodeTemplate(data: any): EmailTemplate {
    return {
      subject: 'Your SyncBoard 2FA Code',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px;">SyncBoard</h1>
            <p style="color: white; margin: 10px 0 0 0; font-size: 16px;">Two-Factor Authentication</p>
          </div>
          
          <div style="padding: 40px 30px; background: #f8f9fa;">
            <h2 style="color: #333; margin: 0 0 20px 0;">2FA Verification Code</h2>
            <p style="color: #666; font-size: 16px; line-height: 1.5; margin: 0 0 30px 0;">
              Use the following code to complete your two-factor authentication:
            </p>
            
            <div style="background: white; border: 2px solid #e9ecef; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0;">
              <span style="font-size: 32px; font-weight: bold; color: #667eea; letter-spacing: 4px;">${data.code}</span>
            </div>
            
            <p style="color: #666; font-size: 14px; margin: 20px 0 0 0;">
              This code will expire in 10 minutes.
            </p>
          </div>
          
          <div style="background: #f8f9fa; padding: 20px 30px; text-align: center; border-top: 1px solid #e9ecef;">
            <p style="color: #999; font-size: 12px; margin: 0;">
              If you didn't request this code, please secure your account immediately.
            </p>
          </div>
        </div>
      `,
      text: `Your SyncBoard 2FA code is: ${data.code}\n\nThis code will expire in 10 minutes.\n\nIf you didn't request this code, please secure your account immediately.`
    };
  }

  private getDefaultTemplate(subject: string, data: any): EmailTemplate {
    return {
      subject,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px;">SyncBoard</h1>
          </div>
          
          <div style="padding: 40px 30px; background: #f8f9fa;">
            <h2 style="color: #333; margin: 0 0 20px 0;">${subject}</h2>
            <p style="color: #666; font-size: 16px; line-height: 1.5; margin: 0;">
              ${JSON.stringify(data, null, 2)}
            </p>
          </div>
        </div>
      `,
      text: `${subject}\n\n${JSON.stringify(data, null, 2)}`
    };
  }
}

export const sendEmail = async (to: string, subject: string, data: any): Promise<boolean> => {
  const emailService = new EmailService();
  return await emailService.sendEmail(to, subject, data);
};