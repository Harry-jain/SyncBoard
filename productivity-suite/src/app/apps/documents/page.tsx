'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { FileText, Save, Download, Share, Plus, Folder } from 'lucide-react'

interface Document {
  id: string
  name: string
  content: string
  createdAt: string
  updatedAt: string
}

export default function DocumentsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [documents, setDocuments] = useState<Document[]>([])
  const [currentDocument, setCurrentDocument] = useState<Document | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [documentName, setDocumentName] = useState('')
  const [documentContent, setDocumentContent] = useState('')

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin')
    }
  }, [status, router])

  const createNewDocument = () => {
    const newDoc: Document = {
      id: Date.now().toString(),
      name: 'Untitled Document',
      content: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
    setDocuments([newDoc, ...documents])
    setCurrentDocument(newDoc)
    setDocumentName(newDoc.name)
    setDocumentContent(newDoc.content)
    setIsEditing(true)
  }

  const openDocument = (doc: Document) => {
    setCurrentDocument(doc)
    setDocumentName(doc.name)
    setDocumentContent(doc.content)
    setIsEditing(true)
  }

  const saveDocument = () => {
    if (!currentDocument) return

    const updatedDoc = {
      ...currentDocument,
      name: documentName,
      content: documentContent,
      updatedAt: new Date().toISOString()
    }

    setDocuments(documents.map(doc => 
      doc.id === currentDocument.id ? updatedDoc : doc
    ))
    setCurrentDocument(updatedDoc)
    setIsEditing(false)
  }

  const downloadDocument = () => {
    if (!currentDocument) return

    const blob = new Blob([documentContent], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${currentDocument.name}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

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
                onClick={() => router.push('/dashboard')}
              >
                ← Back to Dashboard
              </Button>
              <h1 className="text-xl font-semibold text-gray-900">
                Documents
              </h1>
            </div>
            <div className="flex items-center space-x-2">
              {isEditing && currentDocument && (
                <>
                  <Button onClick={saveDocument} size="sm">
                    <Save className="h-4 w-4 mr-2" />
                    Save
                  </Button>
                  <Button variant="outline" onClick={downloadDocument} size="sm">
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </Button>
                  <Button variant="outline" size="sm">
                    <Share className="h-4 w-4 mr-2" />
                    Share
                  </Button>
                </>
              )}
              <Button onClick={createNewDocument}>
                <Plus className="h-4 w-4 mr-2" />
                New Document
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Documents List */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Folder className="h-5 w-5 mr-2" />
                  My Documents
                </CardTitle>
                <CardDescription>
                  {documents.length} document{documents.length !== 1 ? 's' : ''}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {documents.map((doc) => (
                    <div
                      key={doc.id}
                      className={`p-3 rounded-lg border cursor-pointer hover:bg-gray-50 ${
                        currentDocument?.id === doc.id ? 'bg-blue-50 border-blue-200' : ''
                      }`}
                      onClick={() => openDocument(doc)}
                    >
                      <div className="flex items-center">
                        <FileText className="h-4 w-4 mr-2 text-gray-500" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {doc.name}
                          </p>
                          <p className="text-xs text-gray-500">
                            {new Date(doc.updatedAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                  {documents.length === 0 && (
                    <div className="text-center text-gray-500 py-8">
                      <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No documents yet</p>
                      <p className="text-sm">Create your first document</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Document Editor */}
          <div className="lg:col-span-3">
            {isEditing && currentDocument ? (
              <Card className="h-full">
                <CardHeader>
                  <Input
                    value={documentName}
                    onChange={(e) => setDocumentName(e.target.value)}
                    className="text-lg font-semibold border-none shadow-none p-0"
                    placeholder="Document name"
                  />
                </CardHeader>
                <CardContent className="h-full">
                  <textarea
                    value={documentContent}
                    onChange={(e) => setDocumentContent(e.target.value)}
                    className="w-full h-96 p-4 border border-gray-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Start writing your document..."
                  />
                </CardContent>
              </Card>
            ) : (
              <Card className="h-96">
                <CardContent className="h-full flex items-center justify-center">
                  <div className="text-center text-gray-500">
                    <FileText className="h-16 w-16 mx-auto mb-4 opacity-50" />
                    <h3 className="text-lg font-medium mb-2">No document selected</h3>
                    <p>Choose a document from the list or create a new one</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}