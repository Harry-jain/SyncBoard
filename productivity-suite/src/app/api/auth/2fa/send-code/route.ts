import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { sendTwoFactorCode } from '@/lib/email'
import { randomInt } from 'crypto'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Generate 6-digit code
    const code = randomInt(100000, 999999).toString()
    
    // In a real app, you'd store this code in Redis or database with expiration
    // For now, we'll just send it via email
    
    await sendTwoFactorCode(session.user.email, code)

    return NextResponse.json({
      message: '2FA code sent to your email'
    })

  } catch (error) {
    console.error('2FA send code error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}