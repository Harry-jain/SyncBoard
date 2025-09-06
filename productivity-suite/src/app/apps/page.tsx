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
  LogOut,
  BarChart3,
  Calendar,
  Mail,
  Users,
  Cloud
} from 'lucide-react'
import Link from 'next/link'

export default function AppsPage() {
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
      color: 'bg-blue-500',
      category: 'Productivity'
    },
    {
      name: 'Spreadsheets',
      description: 'Create and edit spreadsheets',
      icon: Table,
      href: '/apps/spreadsheets',
      color: 'bg-green-500',
      category: 'Productivity'
    },
    {
      name: 'Presentations',
      description: 'Create and edit presentations',
      icon: Presentation,
      href: '/apps/presentations',
      color: 'bg-orange-500',
      category: 'Productivity'
    },
    {
      name: 'Forms',
      description: 'Create and manage forms',
      icon: FileSpreadsheet,
      href: '/apps/forms',
      color: 'bg-purple-500',
      category: 'Productivity'
    },
    {
      name: 'Notebook',
      description: 'Take notes and organize ideas',
      icon: Notebook,
      href: '/apps/notebook',
      color: 'bg-pink-500',
      category: 'Productivity'
    },
    {
      name: 'Drive',
      description: 'Manage your files and folders',
      icon: Folder,
      href: '/apps/drive',
      color: 'bg-indigo-500',
      category: 'Storage'
    },
    {
      name: 'Analytics',
      description: 'View usage statistics and insights',
      icon: BarChart3,
      href: '/apps/analytics',
      color: 'bg-teal-500',
      category: 'Tools'
    },
    {
      name: 'Calendar',
      description: 'Schedule and manage events',
      icon: Calendar,
      href: '/apps/calendar',
      color: 'bg-red-500',
      category: 'Tools'
    },
    {
      name: 'Mail',
      description: 'Send and receive emails',
      icon: Mail,
      href: '/apps/mail',
      color: 'bg-yellow-500',
      category: 'Communication'
    },
    {
      name: 'Teams',
      description: 'Collaborate with your team',
      icon: Users,
      href: '/apps/teams',
      color: 'bg-cyan-500',
      category: 'Communication'
    }
  ]

  const categories = ['All', 'Productivity', 'Storage', 'Tools', 'Communication']
  const [selectedCategory, setSelectedCategory] = useState('All')

  const filteredApps = selectedCategory === 'All' 
    ? productivityApps 
    : productivityApps.filter(app => app.category === selectedCategory)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <Button
                variant="outline"
                onClick={() => router.push('/dashboard')}
              >
                ← Back to Dashboard
              </Button>
              <h1 className="text-xl font-semibold text-gray-900">
                Apps
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
            Welcome to Apps, {session.user?.name || session.user?.email}!
          </h2>
          <p className="text-gray-600">
            Access all your productivity tools and applications in one place.
          </p>
        </div>

        {/* Storage Usage */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Cloud className="h-5 w-5 mr-2" />
              Storage Usage
            </CardTitle>
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

        {/* Category Filter */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Categories</h3>
          <div className="flex flex-wrap gap-2">
            {categories.map((category, index) => (
              <Button
                key={category}
                variant={selectedCategory === category ? 'default' : 'outline'}
                onClick={() => setSelectedCategory(category)}
                className="hover:scale-105 transition-all duration-200 animate-in fade-in-0 slide-in-from-left-4"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                {category}
              </Button>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
          <div className="flex space-x-4">
            <Button className="hover:scale-105 transition-all duration-200 animate-in fade-in-0 slide-in-from-bottom-4" 
                    style={{ animationDelay: '200ms' }}>
              <Plus className="h-4 w-4 mr-2" />
              New File
            </Button>
            <Button variant="outline" className="hover:scale-105 transition-all duration-200 animate-in fade-in-0 slide-in-from-bottom-4" 
                    style={{ animationDelay: '300ms' }}>
              <Upload className="h-4 w-4 mr-2" />
              Upload Files
            </Button>
            <Button variant="outline" className="hover:scale-105 transition-all duration-200 animate-in fade-in-0 slide-in-from-bottom-4" 
                    style={{ animationDelay: '400ms' }}>
              <Folder className="h-4 w-4 mr-2" />
              New Folder
            </Button>
          </div>
        </div>

        {/* Apps Grid */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            {selectedCategory} Apps
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredApps.map((app, index) => (
              <Link key={app.name} href={app.href}>
                <Card className="hover:shadow-lg transition-all duration-300 cursor-pointer group hover:-translate-y-1 animate-in fade-in-0 slide-in-from-bottom-4" 
                      style={{ animationDelay: `${index * 100}ms` }}>
                  <CardHeader className="pb-4">
                    <div className={`w-16 h-16 ${app.color} rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 shadow-lg group-hover:shadow-xl`}>
                      <app.icon className="h-8 w-8 text-white group-hover:scale-110 transition-transform duration-300" />
                    </div>
                    <CardTitle className="text-lg group-hover:text-blue-600 transition-colors duration-300">{app.name}</CardTitle>
                    <CardDescription className="text-sm group-hover:text-gray-600 transition-colors duration-300">{app.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full group-hover:bg-blue-100 group-hover:text-blue-600 transition-colors duration-300">
                        {app.category}
                      </span>
                      <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 transition-all duration-300 group-hover:translate-x-1">
                        Open →
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
          <Card>
            <CardContent className="p-6">
              <div className="text-center text-gray-500">
                <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No recent activity yet</p>
                <p className="text-sm">Start using apps to see your activity here</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}