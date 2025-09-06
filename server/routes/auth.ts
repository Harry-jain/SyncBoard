import express from 'express';
import { MultiProviderAuthService } from '../auth/multi-provider-auth';
import { isAuthenticated } from '../auth';

const router = express.Router();
const authService = new MultiProviderAuthService();

// POST /api/auth/login - Login with email/password or code
router.post('/login', async (req, res) => {
  try {
    const { method, email, phoneNumber, password, code, provider, providerToken } = req.body;
    
    const result = await authService.authenticate({
      method,
      email,
      phoneNumber,
      password,
      code,
      provider,
      providerToken
    });
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(401).json(result);
    }
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, message: 'Login failed' });
  }
});

// POST /api/auth/signup - Sign up with email
router.post('/signup', async (req, res) => {
  try {
    const { email, name, password } = req.body;
    
    // Send verification code
    const result = await authService.sendVerificationCode(email, 'email');
    
    if (result.success) {
      res.json({ success: true, message: 'Verification code sent to your email' });
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ success: false, message: 'Signup failed' });
  }
});

// POST /api/auth/send-code - Send verification code
router.post('/send-code', async (req, res) => {
  try {
    const { identifier, type } = req.body;
    
    const result = await authService.sendVerificationCode(identifier, type);
    res.json(result);
  } catch (error) {
    console.error('Send code error:', error);
    res.status(500).json({ success: false, message: 'Failed to send code' });
  }
});

// POST /api/auth/verify-2fa - Verify 2FA code
router.post('/verify-2fa', async (req, res) => {
  try {
    const { userId, code, method } = req.body;
    
    const result = await authService.verify2FA(userId, code, method);
    res.json(result);
  } catch (error) {
    console.error('2FA verification error:', error);
    res.status(500).json({ success: false, message: '2FA verification failed' });
  }
});

// POST /api/auth/setup-2fa - Setup 2FA
router.post('/setup-2fa', isAuthenticated, async (req, res) => {
  try {
    const { method } = req.body;
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ success: false, message: 'User not authenticated' });
    }
    
    const result = await authService.setup2FA(userId, method);
    res.json(result);
  } catch (error) {
    console.error('2FA setup error:', error);
    res.status(500).json({ success: false, message: '2FA setup failed' });
  }
});

// GET /api/auth/me - Get current user
router.get('/me', isAuthenticated, async (req, res) => {
  try {
    res.json({ success: true, user: req.user });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ success: false, message: 'Failed to get user' });
  }
});

// POST /api/auth/logout - Logout
router.post('/logout', isAuthenticated, async (req, res) => {
  try {
    // In a real app, you would invalidate the JWT token
    res.json({ success: true, message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ success: false, message: 'Logout failed' });
  }
});

export default router;