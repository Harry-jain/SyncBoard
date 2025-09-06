'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { 
  FileText, 
  Table, 
  Presentation, 
  FileSpreadsheet, 
  Notebook, 
  Folder,
  Plus,
  Upload,
  Settings,
  LogOut
} from 'lucide-react'
import Link from 'next/link'

export default function DashboardPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [storageUsed, setStorageUsed] = useState(0)
  const [storageLimit, setStorageLimit] = useState(5368709120) // 5GB

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin')
    }
  }, [status, router])

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  if (!session) {
    return null
  }

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const storagePercentage = (storageUsed / storageLimit) * 100

  const productivityApps = [
    {
      name: 'Documents',
      description: 'Create and edit text documents',
      icon: FileText,
      href: '/apps/documents',
      color: 'bg-blue-500'
    },
    {
      name: 'Spreadsheets',
      description: 'Create and edit spreadsheets',
      icon: Table,
      href: '/apps/spreadsheets',
      color: 'bg-green-500'
    },
    {
      name: 'Presentations',
      description: 'Create and edit presentations',
      icon: Presentation,
      href: '/apps/presentations',
      color: 'bg-orange-500'
    },
    {
      name: 'Forms',
      description: 'Create and manage forms',
      icon: FileSpreadsheet,
      href: '/apps/forms',
      color: 'bg-purple-500'
    },
    {
      name: 'Notebook',
      description: 'Take notes and organize ideas',
      icon: Notebook,
      href: '/apps/notebook',
      color: 'bg-pink-500'
    }
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold text-gray-900">
                Productivity Suite
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-500">
                {formatBytes(storageUsed)} / {formatBytes(storageLimit)} used
              </div>
              <Button variant="outline" size="sm">
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => router.push('/api/auth/signout')}
              >
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Welcome back, {session.user?.name || session.user?.email}!
          </h2>
          <p className="text-gray-600">
            Choose an app to get started or upload files to your drive.
          </p>
        </div>

        {/* Storage Usage */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Storage Usage</CardTitle>
            <CardDescription>
              {formatBytes(storageUsed)} of {formatBytes(storageLimit)} used
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div 
                className="bg-blue-600 h-2.5 rounded-full" 
                style={{ width: `${Math.min(storagePercentage, 100)}%` }}
              ></div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
          <div className="flex space-x-4">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New File
            </Button>
            <Button variant="outline">
              <Upload className="h-4 w-4 mr-2" />
              Upload Files
            </Button>
            <Button variant="outline">
              <Folder className="h-4 w-4 mr-2" />
              New Folder
            </Button>
          </div>
        </div>

        {/* Productivity Apps */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Productivity Apps</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {productivityApps.map((app) => (
              <Link key={app.name} href={app.href}>
                <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                  <CardHeader>
                    <div className={`w-12 h-12 ${app.color} rounded-lg flex items-center justify-center mb-4`}>
                      <app.icon className="h-6 w-6 text-white" />
                    </div>
                    <CardTitle className="text-lg">{app.name}</CardTitle>
                    <CardDescription>{app.description}</CardDescription>
                  </CardHeader>
                </Card>
              </Link>
            ))}
          </div>
        </div>

        {/* Recent Files */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Files</h3>
          <Card>
            <CardContent className="p-6">
              <div className="text-center text-gray-500">
                <Folder className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No recent files yet</p>
                <p className="text-sm">Start creating or upload files to see them here</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}