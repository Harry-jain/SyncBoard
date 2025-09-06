'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Notebook, Save, Download, Share, Plus, Folder, Search, Tag } from 'lucide-react'

interface Note {
  id: string
  title: string
  content: string
  tags: string[]
  createdAt: string
  updatedAt: string
}

export default function NotebookPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [notes, setNotes] = useState<Note[]>([])
  const [currentNote, setCurrentNote] = useState<Note | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [noteTitle, setNoteTitle] = useState('')
  const [noteContent, setNoteContent] = useState('')
  const [noteTags, setNoteTags] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTag, setSelectedTag] = useState('')

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin')
    }
  }, [status, router])

  const createNewNote = () => {
    const newNote: Note = {
      id: Date.now().toString(),
      title: 'Untitled Note',
      content: '',
      tags: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
    setNotes([newNote, ...notes])
    setCurrentNote(newNote)
    setNoteTitle(newNote.title)
    setNoteContent(newNote.content)
    setNoteTags('')
    setIsEditing(true)
  }

  const openNote = (note: Note) => {
    setCurrentNote(note)
    setNoteTitle(note.title)
    setNoteContent(note.content)
    setNoteTags(note.tags.join(', '))
    setIsEditing(true)
  }

  const saveNote = () => {
    if (!currentNote) return

    const tags = noteTags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0)

    const updatedNote = {
      ...currentNote,
      title: noteTitle,
      content: noteContent,
      tags,
      updatedAt: new Date().toISOString()
    }

    setNotes(notes.map(note => 
      note.id === currentNote.id ? updatedNote : note
    ))
    setCurrentNote(updatedNote)
    setIsEditing(false)
  }

  const deleteNote = (noteId: string) => {
    setNotes(notes.filter(note => note.id !== noteId))
    if (currentNote?.id === noteId) {
      setCurrentNote(null)
      setIsEditing(false)
    }
  }

  const downloadNote = () => {
    if (!currentNote) return

    const content = `# ${currentNote.title}\n\n${currentNote.content}`
    const blob = new Blob([content], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${currentNote.title}.md`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const filteredNotes = notes.filter(note => {
    const matchesSearch = searchQuery === '' || 
      note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      note.content.toLowerCase().includes(searchQuery.toLowerCase())
    
    const matchesTag = selectedTag === '' || note.tags.includes(selectedTag)
    
    return matchesSearch && matchesTag
  })

  const allTags = Array.from(new Set(notes.flatMap(note => note.tags)))

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
                Notebook
              </h1>
            </div>
            <div className="flex items-center space-x-2">
              {isEditing && currentNote && (
                <>
                  <Button onClick={saveNote} size="sm">
                    <Save className="h-4 w-4 mr-2" />
                    Save
                  </Button>
                  <Button variant="outline" onClick={downloadNote} size="sm">
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </Button>
                  <Button variant="outline" size="sm">
                    <Share className="h-4 w-4 mr-2" />
                    Share
                  </Button>
                </>
              )}
              <Button onClick={createNewNote}>
                <Plus className="h-4 w-4 mr-2" />
                New Note
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Notes List */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Folder className="h-5 w-5 mr-2" />
                  My Notes
                </CardTitle>
                <CardDescription>
                  {filteredNotes.length} note{filteredNotes.length !== 1 ? 's' : ''}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {/* Search */}
                <div className="mb-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search notes..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                {/* Tags Filter */}
                {allTags.length > 0 && (
                  <div className="mb-4">
                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant={selectedTag === '' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setSelectedTag('')}
                      >
                        All
                      </Button>
                      {allTags.map(tag => (
                        <Button
                          key={tag}
                          variant={selectedTag === tag ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setSelectedTag(tag)}
                        >
                          {tag}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Notes List */}
                <div className="space-y-2">
                  {filteredNotes.map((note) => (
                    <div
                      key={note.id}
                      className={`p-3 rounded-lg border cursor-pointer hover:bg-gray-50 ${
                        currentNote?.id === note.id ? 'bg-pink-50 border-pink-200' : ''
                      }`}
                      onClick={() => openNote(note)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {note.title}
                          </p>
                          <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                            {note.content}
                          </p>
                          <div className="flex flex-wrap gap-1 mt-2">
                            {note.tags.map((tag, index) => (
                              <span
                                key={index}
                                className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-pink-100 text-pink-800"
                              >
                                <Tag className="h-3 w-3 mr-1" />
                                {tag}
                              </span>
                            ))}
                          </div>
                          <p className="text-xs text-gray-400 mt-1">
                            {new Date(note.updatedAt).toLocaleDateString()}
                          </p>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            deleteNote(note.id)
                          }}
                        >
                          Delete
                        </Button>
                      </div>
                    </div>
                  ))}
                  {filteredNotes.length === 0 && (
                    <div className="text-center text-gray-500 py-8">
                      <Notebook className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No notes found</p>
                      <p className="text-sm">
                        {searchQuery || selectedTag ? 'Try adjusting your filters' : 'Create your first note'}
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Note Editor */}
          <div className="lg:col-span-3">
            {isEditing && currentNote ? (
              <Card className="h-full">
                <CardHeader>
                  <Input
                    value={noteTitle}
                    onChange={(e) => setNoteTitle(e.target.value)}
                    className="text-lg font-semibold border-none shadow-none p-0"
                    placeholder="Note title"
                  />
                  <Input
                    value={noteTags}
                    onChange={(e) => setNoteTags(e.target.value)}
                    className="border-none shadow-none p-0 text-sm"
                    placeholder="Tags (comma separated)"
                  />
                </CardHeader>
                <CardContent className="h-full">
                  <textarea
                    value={noteContent}
                    onChange={(e) => setNoteContent(e.target.value)}
                    className="w-full h-96 p-4 border border-gray-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-pink-500"
                    placeholder="Start writing your note..."
                  />
                </CardContent>
              </Card>
            ) : (
              <Card className="h-96">
                <CardContent className="h-full flex items-center justify-center">
                  <div className="text-center text-gray-500">
                    <Notebook className="h-16 w-16 mx-auto mb-4 opacity-50" />
                    <h3 className="text-lg font-medium mb-2">No note selected</h3>
                    <p>Choose a note from the list or create a new one</p>
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