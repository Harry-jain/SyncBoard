'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  Folder, 
  File, 
  Upload, 
  Download, 
  Share, 
  MoreVertical, 
  Search, 
  Grid, 
  List,
  Plus,
  Trash2,
  Edit,
  Star,
  StarOff
} from 'lucide-react'

interface FileItem {
  id: string
  name: string
  type: string
  size: number
  mimeType: string
  createdAt: string
  updatedAt: string
  isStarred?: boolean
}

interface FolderItem {
  id: string
  name: string
  createdAt: string
  updatedAt: string
  fileCount: number
}

export default function DrivePage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [files, setFiles] = useState<FileItem[]>([])
  const [folders, setFolders] = useState<FolderItem[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [selectedItems, setSelectedItems] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin')
    } else if (status === 'authenticated') {
      loadFiles()
    }
  }, [status, router])

  const loadFiles = async () => {
    try {
      setIsLoading(true)
      // In a real app, you'd fetch from the API
      // For now, we'll use mock data
      setFiles([
        {
          id: '1',
          name: 'Project Proposal.docx',
          type: 'document',
          size: 245760,
          mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          createdAt: '2024-01-15T10:30:00Z',
          updatedAt: '2024-01-15T10:30:00Z',
          isStarred: true
        },
        {
          id: '2',
          name: 'Budget 2024.xlsx',
          type: 'spreadsheet',
          size: 189440,
          mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          createdAt: '2024-01-14T14:20:00Z',
          updatedAt: '2024-01-14T14:20:00Z',
          isStarred: false
        },
        {
          id: '3',
          name: 'Q1 Presentation.pptx',
          type: 'presentation',
          size: 2048000,
          mimeType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
          createdAt: '2024-01-13T09:15:00Z',
          updatedAt: '2024-01-13T09:15:00Z',
          isStarred: true
        }
      ])
      
      setFolders([
        {
          id: '1',
          name: 'Work Documents',
          createdAt: '2024-01-10T08:00:00Z',
          updatedAt: '2024-01-15T16:30:00Z',
          fileCount: 12
        },
        {
          id: '2',
          name: 'Personal',
          createdAt: '2024-01-05T12:00:00Z',
          updatedAt: '2024-01-14T18:45:00Z',
          fileCount: 8
        },
        {
          id: '3',
          name: 'Shared',
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-12T11:20:00Z',
          fileCount: 5
        }
      ])
    } catch (error) {
      console.error('Error loading files:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const getFileIcon = (type: string) => {
    switch (type) {
      case 'document':
        return '📄'
      case 'spreadsheet':
        return '📊'
      case 'presentation':
        return '📽️'
      case 'image':
        return '🖼️'
      case 'video':
        return '🎥'
      case 'audio':
        return '🎵'
      default:
        return '📄'
    }
  }

  const filteredFiles = files.filter(file =>
    file.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const filteredFolders = folders.filter(folder =>
    folder.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  if (status === 'loading' || isLoading) {
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
                Drive
              </h1>
            </div>
            <div className="flex items-center space-x-2">
              <Button variant="outline" size="sm">
                <Upload className="h-4 w-4 mr-2" />
                Upload
              </Button>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                New Folder
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search and Controls */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-4">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search files and folders..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 w-64"
                />
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant={viewMode === 'grid' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('grid')}
              >
                <Grid className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('list')}
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Folders */}
        {filteredFolders.length > 0 && (
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Folders</h3>
            <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4' : 'space-y-2'}>
              {filteredFolders.map((folder) => (
                <Card key={folder.id} className="hover:shadow-md transition-shadow cursor-pointer">
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                        <Folder className="h-5 w-5 text-blue-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {folder.name}
                        </p>
                        <p className="text-xs text-gray-500">
                          {folder.fileCount} files
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Files */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Files</h3>
          {filteredFiles.length > 0 ? (
            <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4' : 'space-y-2'}>
              {filteredFiles.map((file) => (
                <Card key={file.id} className="hover:shadow-md transition-shadow cursor-pointer group">
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center text-lg">
                        {getFileIcon(file.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {file.name}
                        </p>
                        <p className="text-xs text-gray-500">
                          {formatFileSize(file.size)} • {new Date(file.updatedAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="sm">
                          {file.isStarred ? <Star className="h-4 w-4 text-yellow-500" /> : <StarOff className="h-4 w-4" />}
                        </Button>
                        <Button variant="ghost" size="sm">
                          <Share className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm">
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="p-12 text-center">
                <File className="h-16 w-16 mx-auto mb-4 text-gray-400" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No files found</h3>
                <p className="text-gray-500 mb-4">
                  {searchQuery ? 'Try adjusting your search terms' : 'Upload files to get started'}
                </p>
                <Button>
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Files
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}