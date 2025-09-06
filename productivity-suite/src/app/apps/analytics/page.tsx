'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { 
  BarChart3, 
  TrendingUp, 
  FileText, 
  Table, 
  Presentation, 
  Clock,
  HardDrive,
  Users
} from 'lucide-react'

export default function AnalyticsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [analytics, setAnalytics] = useState({
    totalFiles: 0,
    storageUsed: 0,
    storageLimit: 5368709120,
    recentActivity: [],
    appUsage: {
      documents: 0,
      spreadsheets: 0,
      presentations: 0,
      forms: 0,
      notebook: 0
    }
  })

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin')
    } else if (status === 'authenticated') {
      loadAnalytics()
    }
  }, [status, router])

  const loadAnalytics = async () => {
    // Mock data - in a real app, you'd fetch from API
    setAnalytics({
      totalFiles: 24,
      storageUsed: 1073741824, // 1GB
      storageLimit: 5368709120, // 5GB
      recentActivity: [
        { type: 'document', name: 'Project Report.docx', time: '2 hours ago' },
        { type: 'spreadsheet', name: 'Budget 2024.xlsx', time: '1 day ago' },
        { type: 'presentation', name: 'Q1 Review.pptx', time: '2 days ago' },
        { type: 'form', name: 'Survey Form', time: '3 days ago' },
        { type: 'notebook', name: 'Meeting Notes', time: '1 week ago' }
      ],
      appUsage: {
        documents: 8,
        spreadsheets: 5,
        presentations: 3,
        forms: 2,
        notebook: 6
      }
    })
  }

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const storagePercentage = (analytics.storageUsed / analytics.storageLimit) * 100

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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <Button
                variant="outline"
                onClick={() => router.push('/apps')}
              >
                ← Back to Apps
              </Button>
              <h1 className="text-xl font-semibold text-gray-900">
                Analytics
              </h1>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Files</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics.totalFiles}</div>
              <p className="text-xs text-muted-foreground">
                +2 from last week
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Storage Used</CardTitle>
              <HardDrive className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatBytes(analytics.storageUsed)}</div>
              <p className="text-xs text-muted-foreground">
                {storagePercentage.toFixed(1)}% of limit
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Apps</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">5</div>
              <p className="text-xs text-muted-foreground">
                All apps available
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">This Week</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">12</div>
              <p className="text-xs text-muted-foreground">
                Files created
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Storage Usage */}
          <Card>
            <CardHeader>
              <CardTitle>Storage Usage</CardTitle>
              <CardDescription>
                {formatBytes(analytics.storageUsed)} of {formatBytes(analytics.storageLimit)} used
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="w-full bg-gray-200 rounded-full h-2.5 mb-4">
                <div 
                  className="bg-blue-600 h-2.5 rounded-full" 
                  style={{ width: `${Math.min(storagePercentage, 100)}%` }}
                ></div>
              </div>
              <div className="flex justify-between text-sm text-gray-600">
                <span>Used: {formatBytes(analytics.storageUsed)}</span>
                <span>Available: {formatBytes(analytics.storageLimit - analytics.storageUsed)}</span>
              </div>
            </CardContent>
          </Card>

          {/* App Usage */}
          <Card>
            <CardHeader>
              <CardTitle>App Usage</CardTitle>
              <CardDescription>Files created by app type</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <FileText className="h-4 w-4 text-blue-500" />
                    <span className="text-sm">Documents</span>
                  </div>
                  <span className="text-sm font-medium">{analytics.appUsage.documents}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Table className="h-4 w-4 text-green-500" />
                    <span className="text-sm">Spreadsheets</span>
                  </div>
                  <span className="text-sm font-medium">{analytics.appUsage.spreadsheets}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Presentation className="h-4 w-4 text-orange-500" />
                    <span className="text-sm">Presentations</span>
                  </div>
                  <span className="text-sm font-medium">{analytics.appUsage.presentations}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <BarChart3 className="h-4 w-4 text-purple-500" />
                    <span className="text-sm">Forms</span>
                  </div>
                  <span className="text-sm font-medium">{analytics.appUsage.forms}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <FileText className="h-4 w-4 text-pink-500" />
                    <span className="text-sm">Notebook</span>
                  </div>
                  <span className="text-sm font-medium">{analytics.appUsage.notebook}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Your latest file activities</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {analytics.recentActivity.map((activity, index) => (
                <div key={index} className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                    {activity.type === 'document' && <FileText className="h-4 w-4 text-blue-500" />}
                    {activity.type === 'spreadsheet' && <Table className="h-4 w-4 text-green-500" />}
                    {activity.type === 'presentation' && <Presentation className="h-4 w-4 text-orange-500" />}
                    {activity.type === 'form' && <BarChart3 className="h-4 w-4 text-purple-500" />}
                    {activity.type === 'notebook' && <FileText className="h-4 w-4 text-pink-500" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {activity.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {activity.time}
                    </p>
                  </div>
                  <Clock className="h-4 w-4 text-gray-400" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}