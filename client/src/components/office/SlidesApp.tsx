import React, { useState, useEffect, useRef } from 'react';
import { 
  PlusIcon, 
  TrashIcon, 
  PlayIcon, 
  PauseIcon,
  SkipBackIcon,
  SkipForwardIcon,
  SettingsIcon,
  ShareIcon,
  DownloadIcon,
  UploadIcon,
  EyeIcon,
  EditIcon,
  SaveIcon
} from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';

interface Slide {
  id: number;
  title: string;
  content: string;
  background: string;
  elements: SlideElement[];
}

interface SlideElement {
  id: string;
  type: 'text' | 'image' | 'shape' | 'chart';
  x: number;
  y: number;
  width: number;
  height: number;
  content: string;
  style: any;
}

interface SlidesAppProps {
  documentId: number;
  onSave: (content: any) => void;
  onClose: () => void;
}

export const SlidesApp: React.FC<SlidesAppProps> = ({
  documentId,
  onSave,
  onClose
}) => {
  const [slides, setSlides] = useState<Slide[]>([]);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPresenting, setIsPresenting] = useState(false);
  const [isEditing, setIsEditing] = useState(true);
  const [selectedElement, setSelectedElement] = useState<string | null>(null);
  const [slideTitle, setSlideTitle] = useState('');
  const [slideContent, setSlideContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const canvasRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadDocument();
  }, [documentId]);

  const loadDocument = async () => {
    try {
      const response = await fetch(`/api/drive/documents/${documentId}`);
      const data = await response.json();
      
      if (data.success && data.document) {
        const content = data.document.content || { slides: [] };
        setSlides(content.slides || []);
        if (content.slides.length > 0) {
          setSlideTitle(content.slides[0].title);
          setSlideContent(content.slides[0].content);
        }
      }
    } catch (error) {
      console.error('Failed to load document:', error);
    }
  };

  const saveDocument = async () => {
    try {
      setIsSaving(true);
      const content = { slides };
      await onSave(content);
    } catch (error) {
      console.error('Failed to save document:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const addSlide = () => {
    const newSlide: Slide = {
      id: Date.now(),
      title: 'Untitled Slide',
      content: '',
      background: '#ffffff',
      elements: []
    };
    
    const updatedSlides = [...slides, newSlide];
    setSlides(updatedSlides);
    setCurrentSlide(updatedSlides.length - 1);
    setSlideTitle(newSlide.title);
    setSlideContent(newSlide.content);
  };

  const deleteSlide = (slideId: number) => {
    if (slides.length <= 1) return;
    
    const updatedSlides = slides.filter(slide => slide.id !== slideId);
    setSlides(updatedSlides);
    
    if (currentSlide >= updatedSlides.length) {
      setCurrentSlide(updatedSlides.length - 1);
    }
    
    if (updatedSlides.length > 0) {
      setSlideTitle(updatedSlides[currentSlide]?.title || '');
      setSlideContent(updatedSlides[currentSlide]?.content || '');
    }
  };

  const updateCurrentSlide = (updates: Partial<Slide>) => {
    const updatedSlides = slides.map((slide, index) => 
      index === currentSlide ? { ...slide, ...updates } : slide
    );
    setSlides(updatedSlides);
  };

  const nextSlide = () => {
    if (currentSlide < slides.length - 1) {
      setCurrentSlide(currentSlide + 1);
      setSlideTitle(slides[currentSlide + 1].title);
      setSlideContent(slides[currentSlide + 1].content);
    }
  };

  const prevSlide = () => {
    if (currentSlide > 0) {
      setCurrentSlide(currentSlide - 1);
      setSlideTitle(slides[currentSlide - 1].title);
      setSlideTitle(slides[currentSlide - 1].title);
      setSlideContent(slides[currentSlide - 1].content);
    }
  };

  const startPresentation = () => {
    setIsPresenting(true);
    setIsEditing(false);
  };

  const stopPresentation = () => {
    setIsPresenting(false);
    setIsEditing(true);
  };

  const addTextElement = () => {
    const newElement: SlideElement = {
      id: `element_${Date.now()}`,
      type: 'text',
      x: 100,
      y: 100,
      width: 200,
      height: 50,
      content: 'Double click to edit',
      style: {
        fontSize: 16,
        fontFamily: 'Arial',
        color: '#000000',
        textAlign: 'left'
      }
    };

    const updatedSlides = slides.map((slide, index) => 
      index === currentSlide 
        ? { ...slide, elements: [...slide.elements, newElement] }
        : slide
    );
    setSlides(updatedSlides);
  };

  const addShapeElement = (shapeType: string) => {
    const newElement: SlideElement = {
      id: `element_${Date.now()}`,
      type: 'shape',
      x: 100,
      y: 100,
      width: 100,
      height: 100,
      content: shapeType,
      style: {
        fill: '#3498db',
        stroke: '#2980b9',
        strokeWidth: 2
      }
    };

    const updatedSlides = slides.map((slide, index) => 
      index === currentSlide 
        ? { ...slide, elements: [...slide.elements, newElement] }
        : slide
    );
    setSlides(updatedSlides);
  };

  const updateElement = (elementId: string, updates: Partial<SlideElement>) => {
    const updatedSlides = slides.map((slide, index) => 
      index === currentSlide 
        ? {
            ...slide,
            elements: slide.elements.map(element =>
              element.id === elementId ? { ...element, ...updates } : element
            )
          }
        : slide
    );
    setSlides(updatedSlides);
  };

  const deleteElement = (elementId: string) => {
    const updatedSlides = slides.map((slide, index) => 
      index === currentSlide 
        ? {
            ...slide,
            elements: slide.elements.filter(element => element.id !== elementId)
          }
        : slide
    );
    setSlides(updatedSlides);
  };

  const currentSlideData = slides[currentSlide] || { elements: [] };

  return (
    <div className="h-screen flex flex-col bg-gray-100">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h1 className="text-xl font-semibold">SyncBoard Slides</h1>
          <Badge variant="outline">
            {slides.length} slide{slides.length !== 1 ? 's' : ''}
          </Badge>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={saveDocument}
            disabled={isSaving}
          >
            <SaveIcon className="h-4 w-4 mr-2" />
            {isSaving ? 'Saving...' : 'Save'}
          </Button>
          
          <Button variant="outline" size="sm">
            <ShareIcon className="h-4 w-4 mr-2" />
            Share
          </Button>
          
          <Button variant="outline" size="sm">
            <DownloadIcon className="h-4 w-4 mr-2" />
            Export
          </Button>
          
          <Button variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>

      <div className="flex-1 flex">
        {/* Sidebar */}
        {!isPresenting && (
          <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
            <Tabs defaultValue="slides" className="flex-1">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="slides">Slides</TabsTrigger>
                <TabsTrigger value="elements">Elements</TabsTrigger>
              </TabsList>
              
              <TabsContent value="slides" className="flex-1 p-4">
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="font-medium">Slides</h3>
                    <Button size="sm" onClick={addSlide}>
                      <PlusIcon className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {slides.map((slide, index) => (
                      <Card
                        key={slide.id}
                        className={`cursor-pointer transition-colors ${
                          index === currentSlide ? 'ring-2 ring-blue-500' : ''
                        }`}
                        onClick={() => {
                          setCurrentSlide(index);
                          setSlideTitle(slide.title);
                          setSlideContent(slide.content);
                        }}
                      >
                        <CardContent className="p-3">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <p className="text-sm font-medium">{slide.title}</p>
                              <p className="text-xs text-gray-500">Slide {index + 1}</p>
                            </div>
                            {slides.length > 1 && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deleteSlide(slide.id);
                                }}
                              >
                                <TrashIcon className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="elements" className="flex-1 p-4">
                <div className="space-y-4">
                  <h3 className="font-medium">Add Elements</h3>
                  
                  <div className="space-y-2">
                    <Button
                      variant="outline"
                      className="w-full justify-start"
                      onClick={addTextElement}
                    >
                      <EditIcon className="h-4 w-4 mr-2" />
                      Text
                    </Button>
                    
                    <Button
                      variant="outline"
                      className="w-full justify-start"
                      onClick={() => addShapeElement('rectangle')}
                    >
                      <div className="h-4 w-4 mr-2 bg-gray-400 rounded-sm" />
                      Rectangle
                    </Button>
                    
                    <Button
                      variant="outline"
                      className="w-full justify-start"
                      onClick={() => addShapeElement('circle')}
                    >
                      <div className="h-4 w-4 mr-2 bg-gray-400 rounded-full" />
                      Circle
                    </Button>
                    
                    <Button
                      variant="outline"
                      className="w-full justify-start"
                      onClick={() => addShapeElement('triangle')}
                    >
                      <div className="h-4 w-4 mr-2 bg-gray-400" style={{ clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)' }} />
                      Triangle
                    </Button>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        )}

        {/* Main Content */}
        <div className="flex-1 flex flex-col">
          {/* Toolbar */}
          {!isPresenting && (
            <div className="bg-white border-b border-gray-200 px-4 py-2 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Input
                  value={slideTitle}
                  onChange={(e) => {
                    setSlideTitle(e.target.value);
                    updateCurrentSlide({ title: e.target.value });
                  }}
                  className="font-medium"
                  placeholder="Slide title"
                />
              </div>
              
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={prevSlide}
                  disabled={currentSlide === 0}
                >
                  <SkipBackIcon className="h-4 w-4" />
                </Button>
                
                <span className="text-sm text-gray-500">
                  {currentSlide + 1} of {slides.length}
                </span>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={nextSlide}
                  disabled={currentSlide === slides.length - 1}
                >
                  <SkipForwardIcon className="h-4 w-4" />
                </Button>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={startPresentation}
                >
                  <PlayIcon className="h-4 w-4 mr-2" />
                  Present
                </Button>
              </div>
            </div>
          )}

          {/* Presentation Mode Controls */}
          {isPresenting && (
            <div className="bg-black text-white px-4 py-2 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={prevSlide}
                  disabled={currentSlide === 0}
                  className="text-white hover:bg-gray-800"
                >
                  <SkipBackIcon className="h-4 w-4" />
                </Button>
                
                <span className="text-sm">
                  {currentSlide + 1} of {slides.length}
                </span>
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={nextSlide}
                  disabled={currentSlide === slides.length - 1}
                  className="text-white hover:bg-gray-800"
                >
                  <SkipForwardIcon className="h-4 w-4" />
                </Button>
              </div>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={stopPresentation}
                className="text-white hover:bg-gray-800"
              >
                <PauseIcon className="h-4 w-4 mr-2" />
                Exit
              </Button>
            </div>
          )}

          {/* Slide Canvas */}
          <div className="flex-1 flex items-center justify-center p-8">
            <div
              ref={canvasRef}
              className="bg-white shadow-lg rounded-lg overflow-hidden"
              style={{
                width: '800px',
                height: '600px',
                aspectRatio: '4/3',
                backgroundColor: currentSlideData.background || '#ffffff'
              }}
            >
              {/* Slide Content */}
              <div className="relative w-full h-full">
                {/* Slide Elements */}
                {currentSlideData.elements?.map((element) => (
                  <div
                    key={element.id}
                    className={`absolute border-2 ${
                      selectedElement === element.id ? 'border-blue-500' : 'border-transparent'
                    }`}
                    style={{
                      left: element.x,
                      top: element.y,
                      width: element.width,
                      height: element.height,
                      ...element.style
                    }}
                    onClick={() => setSelectedElement(element.id)}
                    onDoubleClick={() => {
                      if (element.type === 'text') {
                        const newContent = prompt('Enter text:', element.content);
                        if (newContent !== null) {
                          updateElement(element.id, { content: newContent });
                        }
                      }
                    }}
                  >
                    {element.type === 'text' && (
                      <div className="w-full h-full flex items-center justify-center p-2">
                        {element.content}
                      </div>
                    )}
                    
                    {element.type === 'shape' && (
                      <div
                        className="w-full h-full"
                        style={{
                          backgroundColor: element.style.fill,
                          border: `${element.style.strokeWidth}px solid ${element.style.stroke}`,
                          borderRadius: element.content === 'circle' ? '50%' : 
                                       element.content === 'triangle' ? '0' : '4px',
                          clipPath: element.content === 'triangle' ? 'polygon(50% 0%, 0% 100%, 100% 100%)' : 'none'
                        }}
                      />
                    )}
                  </div>
                ))}
                
                {/* Slide Title and Content */}
                <div className="absolute inset-0 p-8">
                  <h1 className="text-4xl font-bold mb-4">{slideTitle}</h1>
                  <Textarea
                    value={slideContent}
                    onChange={(e) => {
                      setSlideContent(e.target.value);
                      updateCurrentSlide({ content: e.target.value });
                    }}
                    className="w-full h-32 text-lg resize-none border-none shadow-none focus:ring-0"
                    placeholder="Slide content..."
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};