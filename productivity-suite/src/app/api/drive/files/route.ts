import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const files = await prisma.file.findMany({
      where: { userId: session.user.id },
      include: { folder: true },
      orderBy: { updatedAt: 'desc' }
    })

    return NextResponse.json({ files })

  } catch (error) {
    console.error('Get files error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { name, type, content, mimeType, folderId } = await request.json()

    // Check storage limit
    const user = await prisma.user.findUnique({
      where: { id: session.user.id }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const contentSize = content ? Buffer.byteLength(content, 'utf8') : 0
    
    if (user.storageUsed + contentSize > user.storageLimit) {
      return NextResponse.json(
        { error: 'Storage limit exceeded' },
        { status: 400 }
      )
    }

    const file = await prisma.file.create({
      data: {
        name,
        type,
        content,
        mimeType,
        size: contentSize,
        folderId,
        userId: session.user.id
      }
    })

    // Update user storage usage
    await prisma.user.update({
      where: { id: session.user.id },
      data: { storageUsed: user.storageUsed + contentSize }
    })

    return NextResponse.json({ file })

  } catch (error) {
    console.error('Create file error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}