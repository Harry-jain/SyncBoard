import React, { useState } from 'react';
import { 
  XIcon, 
  MailIcon, 
  PhoneIcon, 
  LockIcon, 
  EyeIcon, 
  EyeOffIcon,
  CheckIcon,
  AlertCircleIcon,
  LoaderIcon
} from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Badge } from '../ui/badge';
import { Switch } from '../ui/switch';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: any, token: string) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  const [activeTab, setActiveTab] = useState('login');
  const [loginMethod, setLoginMethod] = useState<'password' | 'code'>('password');
  const [signupMethod, setSignupMethod] = useState<'email' | 'phone'>('email');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [twoFactorRequired, setTwoFactorRequired] = useState(false);
  const [tempToken, setTempToken] = useState('');

  // Form states
  const [loginForm, setLoginForm] = useState({
    email: '',
    phoneNumber: '',
    password: '',
    code: ''
  });

  const [signupForm, setSignupForm] = useState({
    name: '',
    email: '',
    phoneNumber: '',
    password: '',
    confirmPassword: '',
    code: ''
  });

  const [twoFactorForm, setTwoFactorForm] = useState({
    code: '',
    method: 'email' as 'email' | 'sms' | 'authenticator'
  });

  if (!isOpen) return null;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          method: loginMethod,
          email: loginForm.email,
          phoneNumber: loginForm.phoneNumber,
          password: loginForm.password,
          code: loginForm.code
        })
      });

      const data = await response.json();

      if (data.success) {
        if (data.requires2FA) {
          setTwoFactorRequired(true);
          setTempToken(data.tempToken);
        } else {
          onSuccess(data.user, data.token);
          onClose();
        }
      } else {
        setError(data.message);
      }
    } catch (error) {
      setError('Login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      if (signupMethod === 'email') {
        const response = await fetch('/api/auth/signup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: signupForm.name,
            email: signupForm.email,
            password: signupForm.password
          })
        });

        const data = await response.json();

        if (data.success) {
          setSuccess('Verification code sent to your email');
          setCodeSent(true);
        } else {
          setError(data.message);
        }
      } else {
        // Phone signup logic
        setError('Phone signup not implemented yet');
      }
    } catch (error) {
      setError('Signup failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendCode = async () => {
    setIsLoading(true);
    setError('');

    try {
      const identifier = signupMethod === 'email' ? signupForm.email : signupForm.phoneNumber;
      const response = await fetch('/api/auth/send-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier,
          type: signupMethod
        })
      });

      const data = await response.json();

      if (data.success) {
        setSuccess(data.message);
        setCodeSent(true);
      } else {
        setError(data.message);
      }
    } catch (error) {
      setError('Failed to send code. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          method: 'code',
          email: signupForm.email,
          code: signupForm.code
        })
      });

      const data = await response.json();

      if (data.success) {
        onSuccess(data.user, data.token);
        onClose();
      } else {
        setError(data.message);
      }
    } catch (error) {
      setError('Verification failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handle2FA = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/verify-2fa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: tempToken, // In real app, extract userId from tempToken
          code: twoFactorForm.code,
          method: twoFactorForm.method
        })
      });

      const data = await response.json();

      if (data.success) {
        onSuccess(data.user, data.token);
        onClose();
      } else {
        setError(data.message);
      }
    } catch (error) {
      setError('2FA verification failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOAuthLogin = async (provider: 'google' | 'microsoft' | 'apple') => {
    setIsLoading(true);
    setError('');

    try {
      // In a real app, this would redirect to OAuth provider
      // For demo, we'll simulate the process
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider,
          providerToken: `mock_${provider}_token_${Date.now()}`
        })
      });

      const data = await response.json();

      if (data.success) {
        if (data.requires2FA) {
          setTwoFactorRequired(true);
          setTempToken(data.tempToken);
        } else {
          onSuccess(data.user, data.token);
          onClose();
        }
      } else {
        setError(data.message);
      }
    } catch (error) {
      setError(`${provider} login failed. Please try again.`);
    } finally {
      setIsLoading(false);
    }
  };

  const resetForms = () => {
    setLoginForm({ email: '', phoneNumber: '', password: '', code: '' });
    setSignupForm({ name: '', email: '', phoneNumber: '', password: '', confirmPassword: '', code: '' });
    setTwoFactorForm({ code: '', method: 'email' });
    setError('');
    setSuccess('');
    setCodeSent(false);
    setTwoFactorRequired(false);
    setTempToken('');
  };

  const handleClose = () => {
    resetForms();
    onClose();
  };

  if (twoFactorRequired) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <Card className="w-full max-w-md mx-4">
          <CardHeader className="text-center">
            <CardTitle className="text-xl">Two-Factor Authentication</CardTitle>
            <p className="text-gray-600">Enter your 2FA code to continue</p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handle2FA} className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">
                  Authentication Method
                </label>
                <select
                  value={twoFactorForm.method}
                  onChange={(e) => setTwoFactorForm(prev => ({ ...prev, method: e.target.value as any }))}
                  className="w-full p-2 border border-gray-300 rounded-md"
                >
                  <option value="email">Email</option>
                  <option value="sms">SMS</option>
                  <option value="authenticator">Authenticator App</option>
                </select>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">
                  Verification Code
                </label>
                <Input
                  type="text"
                  placeholder="Enter 6-digit code"
                  value={twoFactorForm.code}
                  onChange={(e) => setTwoFactorForm(prev => ({ ...prev, code: e.target.value }))}
                  maxLength={6}
                  required
                />
              </div>

              {error && (
                <div className="flex items-center space-x-2 text-red-600 text-sm">
                  <AlertCircleIcon className="h-4 w-4" />
                  <span>{error}</span>
                </div>
              )}

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <LoaderIcon className="h-4 w-4 mr-2 animate-spin" />
                ) : null}
                Verify Code
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <Card className="w-full max-w-md mx-4">
        <CardHeader className="text-center relative">
          <Button
            variant="ghost"
            size="sm"
            className="absolute right-0 top-0"
            onClick={handleClose}
          >
            <XIcon className="h-4 w-4" />
          </Button>
          <CardTitle className="text-2xl">Welcome to SyncBoard</CardTitle>
          <p className="text-gray-600">Sign in to your account or create a new one</p>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Sign In</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
            </TabsList>

            <TabsContent value="login" className="space-y-4">
              {/* OAuth Buttons */}
              <div className="space-y-2">
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => handleOAuthLogin('google')}
                  disabled={isLoading}
                >
                  <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  Continue with Google
                </Button>

                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => handleOAuthLogin('microsoft')}
                  disabled={isLoading}
                >
                  <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24">
                    <path fill="#F25022" d="M1 1h10v10H1z"/>
                    <path fill="#00A4EF" d="M13 1h10v10H13z"/>
                    <path fill="#7FBA00" d="M1 13h10v10H1z"/>
                    <path fill="#FFB900" d="M13 13h10v10H13z"/>
                  </svg>
                  Continue with Microsoft
                </Button>

                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => handleOAuthLogin('apple')}
                  disabled={isLoading}
                >
                  <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
                  </svg>
                  Continue with Apple
                </Button>
              </div>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-gray-500">OR</span>
                </div>
              </div>

              {/* Login Form */}
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="flex space-x-2 mb-4">
                  <Button
                    type="button"
                    variant={loginMethod === 'password' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setLoginMethod('password')}
                    className="flex-1"
                  >
                    Password
                  </Button>
                  <Button
                    type="button"
                    variant={loginMethod === 'code' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setLoginMethod('code')}
                    className="flex-1"
                  >
                    Code
                  </Button>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">
                    Email or Phone
                  </label>
                  <div className="relative">
                    <MailIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      type="text"
                      placeholder="Enter email or phone number"
                      value={loginForm.email || loginForm.phoneNumber}
                      onChange={(e) => {
                        const value = e.target.value;
                        if (value.includes('@')) {
                          setLoginForm(prev => ({ ...prev, email: value, phoneNumber: '' }));
                        } else {
                          setLoginForm(prev => ({ ...prev, phoneNumber: value, email: '' }));
                        }
                      }}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>

                {loginMethod === 'password' ? (
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-1 block">
                      Password
                    </label>
                    <div className="relative">
                      <LockIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Enter password"
                        value={loginForm.password}
                        onChange={(e) => setLoginForm(prev => ({ ...prev, password: e.target.value }))}
                        className="pl-10 pr-10"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2"
                      >
                        {showPassword ? (
                          <EyeOffIcon className="h-4 w-4 text-gray-400" />
                        ) : (
                          <EyeIcon className="h-4 w-4 text-gray-400" />
                        )}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-1 block">
                      Verification Code
                    </label>
                    <div className="flex space-x-2">
                      <Input
                        type="text"
                        placeholder="Enter code"
                        value={loginForm.code}
                        onChange={(e) => setLoginForm(prev => ({ ...prev, code: e.target.value }))}
                        maxLength={6}
                        required
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleSendCode}
                        disabled={isLoading || !loginForm.email}
                      >
                        Send Code
                      </Button>
                    </div>
                  </div>
                )}

                {error && (
                  <div className="flex items-center space-x-2 text-red-600 text-sm">
                    <AlertCircleIcon className="h-4 w-4" />
                    <span>{error}</span>
                  </div>
                )}

                {success && (
                  <div className="flex items-center space-x-2 text-green-600 text-sm">
                    <CheckIcon className="h-4 w-4" />
                    <span>{success}</span>
                  </div>
                )}

                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? (
                    <LoaderIcon className="h-4 w-4 mr-2 animate-spin" />
                  ) : null}
                  Sign In
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup" className="space-y-4">
              <form onSubmit={handleSignup} className="space-y-4">
                <div className="flex space-x-2 mb-4">
                  <Button
                    type="button"
                    variant={signupMethod === 'email' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSignupMethod('email')}
                    className="flex-1"
                  >
                    Email
                  </Button>
                  <Button
                    type="button"
                    variant={signupMethod === 'phone' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSignupMethod('phone')}
                    className="flex-1"
                  >
                    Phone
                  </Button>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">
                    Full Name
                  </label>
                  <Input
                    type="text"
                    placeholder="Enter your full name"
                    value={signupForm.name}
                    onChange={(e) => setSignupForm(prev => ({ ...prev, name: e.target.value }))}
                    required
                  />
                </div>

                {signupMethod === 'email' ? (
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-1 block">
                      Email Address
                    </label>
                    <div className="relative">
                      <MailIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        type="email"
                        placeholder="Enter email address"
                        value={signupForm.email}
                        onChange={(e) => setSignupForm(prev => ({ ...prev, email: e.target.value }))}
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>
                ) : (
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-1 block">
                      Phone Number
                    </label>
                    <div className="relative">
                      <PhoneIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        type="tel"
                        placeholder="Enter phone number"
                        value={signupForm.phoneNumber}
                        onChange={(e) => setSignupForm(prev => ({ ...prev, phoneNumber: e.target.value }))}
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>
                )}

                {!codeSent ? (
                  <>
                    <div>
                      <label className="text-sm font-medium text-gray-700 mb-1 block">
                        Password
                      </label>
                      <div className="relative">
                        <LockIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                          type={showPassword ? 'text' : 'password'}
                          placeholder="Create password"
                          value={signupForm.password}
                          onChange={(e) => setSignupForm(prev => ({ ...prev, password: e.target.value }))}
                          className="pl-10 pr-10"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2"
                        >
                          {showPassword ? (
                            <EyeOffIcon className="h-4 w-4 text-gray-400" />
                          ) : (
                            <EyeIcon className="h-4 w-4 text-gray-400" />
                          )}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="text-sm font-medium text-gray-700 mb-1 block">
                        Confirm Password
                      </label>
                      <div className="relative">
                        <LockIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                          type={showPassword ? 'text' : 'password'}
                          placeholder="Confirm password"
                          value={signupForm.confirmPassword}
                          onChange={(e) => setSignupForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                          className="pl-10"
                          required
                        />
                      </div>
                    </div>

                    {error && (
                      <div className="flex items-center space-x-2 text-red-600 text-sm">
                        <AlertCircleIcon className="h-4 w-4" />
                        <span>{error}</span>
                      </div>
                    )}

                    <Button type="submit" className="w-full" disabled={isLoading}>
                      {isLoading ? (
                        <LoaderIcon className="h-4 w-4 mr-2 animate-spin" />
                      ) : null}
                      Create Account
                    </Button>
                  </>
                ) : (
                  <>
                    <div>
                      <label className="text-sm font-medium text-gray-700 mb-1 block">
                        Verification Code
                      </label>
                      <Input
                        type="text"
                        placeholder="Enter verification code"
                        value={signupForm.code}
                        onChange={(e) => setSignupForm(prev => ({ ...prev, code: e.target.value }))}
                        maxLength={6}
                        required
                      />
                    </div>

                    {error && (
                      <div className="flex items-center space-x-2 text-red-600 text-sm">
                        <AlertCircleIcon className="h-4 w-4" />
                        <span>{error}</span>
                      </div>
                    )}

                    {success && (
                      <div className="flex items-center space-x-2 text-green-600 text-sm">
                        <CheckIcon className="h-4 w-4" />
                        <span>{success}</span>
                      </div>
                    )}

                    <div className="flex space-x-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleSendCode}
                        className="flex-1"
                        disabled={isLoading}
                      >
                        Resend Code
                      </Button>
                      <Button
                        type="submit"
                        onClick={handleVerifyCode}
                        className="flex-1"
                        disabled={isLoading}
                      >
                        {isLoading ? (
                          <LoaderIcon className="h-4 w-4 mr-2 animate-spin" />
                        ) : null}
                        Verify
                      </Button>
                    </div>
                  </>
                )}
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};