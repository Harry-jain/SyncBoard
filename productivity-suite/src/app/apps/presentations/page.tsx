'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Presentation, Save, Download, Share, Plus, Folder, Play, ChevronLeft, ChevronRight } from 'lucide-react'

interface Slide {
  id: string
  title: string
  content: string
  layout: 'title' | 'content' | 'two-column'
}

interface Presentation {
  id: string
  name: string
  slides: Slide[]
  createdAt: string
  updatedAt: string
}

export default function PresentationsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [presentations, setPresentations] = useState<Presentation[]>([])
  const [currentPresentation, setCurrentPresentation] = useState<Presentation | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [presentationName, setPresentationName] = useState('')
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0)
  const [isPresenting, setIsPresenting] = useState(false)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin')
    }
  }, [status, router])

  const createNewPresentation = () => {
    const newPresentation: Presentation = {
      id: Date.now().toString(),
      name: 'Untitled Presentation',
      slides: [
        {
          id: '1',
          title: 'Welcome',
          content: 'Start your presentation here',
          layout: 'title'
        }
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
    setPresentations([newPresentation, ...presentations])
    setCurrentPresentation(newPresentation)
    setPresentationName(newPresentation.name)
    setIsEditing(true)
  }

  const openPresentation = (presentation: Presentation) => {
    setCurrentPresentation(presentation)
    setPresentationName(presentation.name)
    setCurrentSlideIndex(0)
    setIsEditing(true)
  }

  const addSlide = () => {
    if (!currentPresentation) return

    const newSlide: Slide = {
      id: Date.now().toString(),
      title: 'New Slide',
      content: 'Add your content here',
      layout: 'content'
    }

    const updatedPresentation = {
      ...currentPresentation,
      slides: [...currentPresentation.slides, newSlide],
      updatedAt: new Date().toISOString()
    }

    setCurrentPresentation(updatedPresentation)
    setPresentations(presentations.map(p => 
      p.id === currentPresentation.id ? updatedPresentation : p
    ))
    setCurrentSlideIndex(updatedPresentation.slides.length - 1)
  }

  const updateSlide = (slideId: string, updates: Partial<Slide>) => {
    if (!currentPresentation) return

    const updatedSlides = currentPresentation.slides.map(slide =>
      slide.id === slideId ? { ...slide, ...updates } : slide
    )

    const updatedPresentation = {
      ...currentPresentation,
      slides: updatedSlides,
      updatedAt: new Date().toISOString()
    }

    setCurrentPresentation(updatedPresentation)
    setPresentations(presentations.map(p => 
      p.id === currentPresentation.id ? updatedPresentation : p
    ))
  }

  const savePresentation = () => {
    if (!currentPresentation) return

    const updatedPresentation = {
      ...currentPresentation,
      name: presentationName,
      updatedAt: new Date().toISOString()
    }

    setPresentations(presentations.map(p => 
      p.id === currentPresentation.id ? updatedPresentation : p
    ))
    setCurrentPresentation(updatedPresentation)
    setIsEditing(false)
  }

  const startPresentation = () => {
    setIsPresenting(true)
    setCurrentSlideIndex(0)
  }

  const nextSlide = () => {
    if (currentPresentation && currentSlideIndex < currentPresentation.slides.length - 1) {
      setCurrentSlideIndex(currentSlideIndex + 1)
    }
  }

  const prevSlide = () => {
    if (currentSlideIndex > 0) {
      setCurrentSlideIndex(currentSlideIndex - 1)
    }
  }

  const exitPresentation = () => {
    setIsPresenting(false)
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

  const currentSlide = currentPresentation?.slides[currentSlideIndex]

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
                Presentations
              </h1>
            </div>
            <div className="flex items-center space-x-2">
              {isEditing && currentPresentation && !isPresenting && (
                <>
                  <Button onClick={addSlide} variant="outline" size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Slide
                  </Button>
                  <Button onClick={savePresentation} size="sm">
                    <Save className="h-4 w-4 mr-2" />
                    Save
                  </Button>
                  <Button onClick={startPresentation} variant="outline" size="sm">
                    <Play className="h-4 w-4 mr-2" />
                    Present
                  </Button>
                </>
              )}
              {isPresenting && (
                <>
                  <Button onClick={prevSlide} variant="outline" size="sm" disabled={currentSlideIndex === 0}>
                    <ChevronLeft className="h-4 w-4 mr-2" />
                    Previous
                  </Button>
                  <Button onClick={nextSlide} variant="outline" size="sm" disabled={currentSlideIndex === (currentPresentation?.slides.length || 1) - 1}>
                    Next
                    <ChevronRight className="h-4 w-4 ml-2" />
                  </Button>
                  <Button onClick={exitPresentation} size="sm">
                    Exit
                  </Button>
                </>
              )}
              {!isPresenting && (
                <Button onClick={createNewPresentation}>
                  <Plus className="h-4 w-4 mr-2" />
                  New Presentation
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {isPresenting ? (
          /* Presentation Mode */
          <div className="h-screen flex items-center justify-center bg-black">
            <div className="w-full max-w-4xl mx-auto p-8">
              <div className="bg-white rounded-lg shadow-2xl h-96 flex flex-col justify-center items-center">
                <h1 className="text-4xl font-bold text-gray-900 mb-4 text-center">
                  {currentSlide?.title}
                </h1>
                <p className="text-xl text-gray-600 text-center">
                  {currentSlide?.content}
                </p>
              </div>
              <div className="text-center mt-8 text-white">
                <p>Slide {currentSlideIndex + 1} of {currentPresentation?.slides.length}</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* Presentations List */}
            <div className="lg:col-span-1">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Folder className="h-5 w-5 mr-2" />
                    My Presentations
                  </CardTitle>
                  <CardDescription>
                    {presentations.length} presentation{presentations.length !== 1 ? 's' : ''}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {presentations.map((presentation) => (
                      <div
                        key={presentation.id}
                        className={`p-3 rounded-lg border cursor-pointer hover:bg-gray-50 ${
                          currentPresentation?.id === presentation.id ? 'bg-orange-50 border-orange-200' : ''
                        }`}
                        onClick={() => openPresentation(presentation)}
                      >
                        <div className="flex items-center">
                          <Presentation className="h-4 w-4 mr-2 text-gray-500" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {presentation.name}
                            </p>
                            <p className="text-xs text-gray-500">
                              {presentation.slides.length} slide{presentation.slides.length !== 1 ? 's' : ''}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                    {presentations.length === 0 && (
                      <div className="text-center text-gray-500 py-8">
                        <Presentation className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>No presentations yet</p>
                        <p className="text-sm">Create your first presentation</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Presentation Editor */}
            <div className="lg:col-span-3">
              {isEditing && currentPresentation ? (
                <div className="space-y-6">
                  <Card>
                    <CardHeader>
                      <Input
                        value={presentationName}
                        onChange={(e) => setPresentationName(e.target.value)}
                        className="text-lg font-semibold border-none shadow-none p-0"
                        placeholder="Presentation name"
                      />
                    </CardHeader>
                  </Card>

                  {/* Slide Editor */}
                  <Card>
                    <CardHeader>
                      <div className="flex justify-between items-center">
                        <h3 className="text-lg font-medium">
                          Slide {currentSlideIndex + 1} of {currentPresentation.slides.length}
                        </h3>
                        <div className="flex space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentSlideIndex(Math.max(0, currentSlideIndex - 1))}
                            disabled={currentSlideIndex === 0}
                          >
                            <ChevronLeft className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentSlideIndex(Math.min(currentPresentation.slides.length - 1, currentSlideIndex + 1))}
                            disabled={currentSlideIndex === currentPresentation.slides.length - 1}
                          >
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Slide Title
                          </label>
                          <Input
                            value={currentSlide?.title || ''}
                            onChange={(e) => updateSlide(currentSlide?.id || '', { title: e.target.value })}
                            placeholder="Enter slide title"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Slide Content
                          </label>
                          <textarea
                            value={currentSlide?.content || ''}
                            onChange={(e) => updateSlide(currentSlide?.id || '', { content: e.target.value })}
                            className="w-full h-32 p-3 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-orange-500"
                            placeholder="Enter slide content"
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Slide Thumbnails */}
                  <Card>
                    <CardHeader>
                      <h3 className="text-lg font-medium">Slides</h3>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-4 gap-4">
                        {currentPresentation.slides.map((slide, index) => (
                          <div
                            key={slide.id}
                            className={`p-4 border rounded-lg cursor-pointer ${
                              index === currentSlideIndex ? 'border-orange-500 bg-orange-50' : 'border-gray-200'
                            }`}
                            onClick={() => setCurrentSlideIndex(index)}
                          >
                            <h4 className="font-medium text-sm mb-2 truncate">{slide.title}</h4>
                            <p className="text-xs text-gray-500 truncate">{slide.content}</p>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              ) : (
                <Card className="h-96">
                  <CardContent className="h-full flex items-center justify-center">
                    <div className="text-center text-gray-500">
                      <Presentation className="h-16 w-16 mx-auto mb-4 opacity-50" />
                      <h3 className="text-lg font-medium mb-2">No presentation selected</h3>
                      <p>Choose a presentation from the list or create a new one</p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}