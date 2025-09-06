'use client'

import { useState } from 'react'
import { signIn, getSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Mail, Lock, Smartphone, Shield } from 'lucide-react'

export default function SignInPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [twoFactorCode, setTwoFactorCode] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [show2FA, setShow2FA] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    try {
      const result = await signIn('credentials', {
        email,
        password,
        twoFactorCode: show2FA ? twoFactorCode : undefined,
        redirect: false,
      })

      if (result?.error) {
        if (result.error === '2FA code required') {
          setShow2FA(true)
          setError('Please enter your 2FA code')
        } else {
          setError(result.error)
        }
      } else if (result?.ok) {
        router.push('/dashboard')
      }
    } catch (error) {
      setError('An error occurred during sign in')
    } finally {
      setIsLoading(false)
    }
  }

  const handleGoogleSignIn = () => {
    signIn('google', { callbackUrl: '/dashboard' })
  }

  const handleMicrosoftSignIn = () => {
    // Microsoft OAuth implementation would go here
    setError('Microsoft sign-in not yet implemented')
  }

  const handleAppleSignIn = () => {
    // Apple OAuth implementation would go here
    setError('Apple sign-in not yet implemented')
  }

  const handlePhoneSignIn = () => {
    // Phone number sign-in implementation would go here
    setError('Phone sign-in not yet implemented')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">Sign In</CardTitle>
          <CardDescription className="text-center">
            Choose your preferred sign-in method
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* OAuth Providers */}
          <div className="space-y-2">
            <Button
              onClick={handleGoogleSignIn}
              variant="outline"
              className="w-full"
            >
              <Mail className="mr-2 h-4 w-4" />
              Continue with Google
            </Button>
            
            <Button
              onClick={handleMicrosoftSignIn}
              variant="outline"
              className="w-full"
            >
              <Shield className="mr-2 h-4 w-4" />
              Continue with Microsoft
            </Button>
            
            <Button
              onClick={handleAppleSignIn}
              variant="outline"
              className="w-full"
            >
              <Shield className="mr-2 h-4 w-4" />
              Continue with Apple
            </Button>
            
            <Button
              onClick={handlePhoneSignIn}
              variant="outline"
              className="w-full"
            >
              <Smartphone className="mr-2 h-4 w-4" />
              Continue with Phone
            </Button>
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <Separator className="w-full" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                Or continue with
              </span>
            </div>
          </div>

          {/* Email/Password Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            {show2FA && (
              <div className="space-y-2">
                <Label htmlFor="twoFactorCode">2FA Code</Label>
                <Input
                  id="twoFactorCode"
                  type="text"
                  placeholder="Enter 6-digit code"
                  value={twoFactorCode}
                  onChange={(e) => setTwoFactorCode(e.target.value)}
                  maxLength={6}
                />
              </div>
            )}

            <div className="flex items-center space-x-2">
              <Checkbox
                id="remember"
                checked={rememberMe}
                onCheckedChange={setRememberMe}
              />
              <Label htmlFor="remember">Remember me</Label>
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>

          <div className="text-center text-sm">
            Don't have an account?{' '}
            <Link href="/auth/signup" className="text-primary hover:underline">
              Sign up
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}