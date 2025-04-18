import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { 
  SlidersIcon, 
  PlayIcon, 
  PlusIcon, 
  TrashIcon, 
  ImageIcon, 
  Type, 
  Square, 
  MoveHorizontal, 
  MoveVertical,
  PresentationIcon
} from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Document } from '@shared/schema';
import { Slider } from '@/components/ui/slider';

interface PowerPointSlide {
  id: string;
  title: string;
  content: string;
  background: string;
  objects: {
    id: string;
    type: 'text' | 'shape' | 'image';
    content: string;
    x: number;
    y: number;
    width: number;
    height: number;
    color?: string;
    fontSize?: number;
    shape?: 'rectangle' | 'circle' | 'triangle';
  }[];
}

interface PowerPointEditorProps {
  document: Document;
  onSave: (document: Partial<Document>) => void;
}

const DEFAULT_SLIDE: PowerPointSlide = {
  id: '1',
  title: 'New Slide',
  content: '',
  background: '#ffffff',
  objects: [
    {
      id: '1',
      type: 'text',
      content: 'Click to edit title',
      x: 50,
      y: 50,
      width: 500,
      height: 50,
      color: '#000000',
      fontSize: 32
    },
    {
      id: '2',
      type: 'text',
      content: 'Click to edit content',
      x: 50,
      y: 120,
      width: 500,
      height: 300,
      color: '#333333',
      fontSize: 18
    }
  ]
};

export function PowerPointEditor({ document, onSave }: PowerPointEditorProps) {
  const [slides, setSlides] = useState<PowerPointSlide[]>([]);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [isPresenting, setIsPresenting] = useState(false);
  const [selectedObject, setSelectedObject] = useState<string | null>(null);

  useEffect(() => {
    // Initialize slides from document if available
    if (document.slides && Array.isArray(document.slides)) {
      setSlides(document.slides);
    } else {
      // Start with a default slide
      setSlides([DEFAULT_SLIDE]);
    }
  }, [document]);

  const saveChanges = () => {
    onSave({
      slides,
      content: JSON.stringify(slides)
    });
  };

  const addNewSlide = () => {
    const newSlideId = (slides.length + 1).toString();
    const newSlide: PowerPointSlide = {
      ...DEFAULT_SLIDE,
      id: newSlideId,
    };
    setSlides([...slides, newSlide]);
    setCurrentSlideIndex(slides.length);
  };

  const deleteSlide = (index: number) => {
    if (slides.length === 1) return;
    
    const newSlides = slides.filter((_, i) => i !== index);
    setSlides(newSlides);
    
    if (currentSlideIndex >= newSlides.length) {
      setCurrentSlideIndex(newSlides.length - 1);
    } else if (currentSlideIndex === index) {
      setCurrentSlideIndex(Math.max(0, index - 1));
    }
  };

  const updateSlideTitle = (index: number, title: string) => {
    const newSlides = [...slides];
    newSlides[index].title = title;
    setSlides(newSlides);
  };

  const updateSlideBackground = (index: number, background: string) => {
    const newSlides = [...slides];
    newSlides[index].background = background;
    setSlides(newSlides);
  };

  const updateObject = (slideIndex: number, objectId: string, updates: Partial<PowerPointSlide['objects'][0]>) => {
    const newSlides = [...slides];
    const objectIndex = newSlides[slideIndex].objects.findIndex(obj => obj.id === objectId);
    if (objectIndex !== -1) {
      newSlides[slideIndex].objects[objectIndex] = {
        ...newSlides[slideIndex].objects[objectIndex],
        ...updates
      };
      setSlides(newSlides);
    }
  };

  const addObject = (slideIndex: number, type: 'text' | 'shape' | 'image') => {
    const newSlides = [...slides];
    const newObjectId = (newSlides[slideIndex].objects.length + 1).toString();
    
    let newObject: PowerPointSlide['objects'][0] = {
      id: newObjectId,
      type,
      content: type === 'text' ? 'New text' : '',
      x: 100,
      y: 100,
      width: 200,
      height: 100,
      color: '#000000'
    };

    if (type === 'shape') {
      newObject.shape = 'rectangle';
    }

    newSlides[slideIndex].objects.push(newObject);
    setSlides(newSlides);
    setSelectedObject(newObjectId);
  };

  const deleteObject = (slideIndex: number, objectId: string) => {
    const newSlides = [...slides];
    newSlides[slideIndex].objects = newSlides[slideIndex].objects.filter(obj => obj.id !== objectId);
    setSlides(newSlides);
    setSelectedObject(null);
  };

  const renderSlidePreview = (slide: PowerPointSlide, index: number) => {
    return (
      <div 
        key={slide.id} 
        className={`relative flex flex-col items-center border rounded-lg p-2 cursor-pointer ${currentSlideIndex === index ? 'border-primary' : 'border-gray-200'}`}
        onClick={() => setCurrentSlideIndex(index)}
      >
        <div className="text-xs truncate w-full text-center mb-1">{slide.title || `Slide ${index + 1}`}</div>
        <div 
          className="w-full h-20 rounded bg-cover bg-center relative" 
          style={{ backgroundColor: slide.background }}
        >
          {slide.objects.map(obj => (
            obj.type === 'text' && (
              <div 
                key={obj.id}
                className="absolute truncate text-[8px] overflow-hidden"
                style={{
                  left: `${obj.x / 6}px`,
                  top: `${obj.y / 6}px`,
                  width: `${obj.width / 6}px`,
                  height: `${obj.height / 6}px`,
                  color: obj.color,
                }}
              >
                {obj.content}
              </div>
            )
          ))}
        </div>
        {slides.length > 1 && (
          <Button 
            variant="ghost" 
            size="icon" 
            className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-destructive text-white"
            onClick={(e) => {
              e.stopPropagation();
              deleteSlide(index);
            }}
          >
            <TrashIcon className="w-3 h-3" />
          </Button>
        )}
      </div>
    );
  };

  const currentSlide = slides[currentSlideIndex] || DEFAULT_SLIDE;

  if (isPresenting) {
    return (
      <div className="fixed inset-0 bg-black flex flex-col items-center justify-center z-50">
        <div 
          className="w-full max-w-4xl h-[calc(100vh-6rem)] rounded shadow-lg relative overflow-hidden"
          style={{ backgroundColor: currentSlide.background }}
        >
          {currentSlide.objects.map(obj => (
            <div 
              key={obj.id}
              className="absolute"
              style={{
                left: `${obj.x}px`,
                top: `${obj.y}px`,
                width: `${obj.width}px`,
                height: `${obj.height}px`,
              }}
            >
              {obj.type === 'text' && (
                <div
                  style={{
                    fontSize: `${obj.fontSize}px`,
                    color: obj.color,
                  }}
                  className="w-full h-full"
                >
                  {obj.content}
                </div>
              )}
              {obj.type === 'shape' && (
                <div 
                  className="w-full h-full"
                  style={{ backgroundColor: obj.color }}
                />
              )}
              {obj.type === 'image' && (
                <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                  <ImageIcon className="w-8 h-8 text-gray-400" />
                </div>
              )}
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between w-full max-w-4xl mt-4">
          <Button
            onClick={() => setCurrentSlideIndex(Math.max(0, currentSlideIndex - 1))}
            disabled={currentSlideIndex === 0}
          >
            Previous
          </Button>
          <div className="text-white">
            Slide {currentSlideIndex + 1} of {slides.length}
          </div>
          <Button
            onClick={() => setCurrentSlideIndex(Math.min(slides.length - 1, currentSlideIndex + 1))}
            disabled={currentSlideIndex === slides.length - 1}
          >
            Next
          </Button>
          <Button
            variant="secondary"
            onClick={() => setIsPresenting(false)}
          >
            Exit Presentation
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <PresentationIcon className="w-5 h-5" />
          <Input 
            className="font-semibold text-lg border-none focus-visible:ring-0 p-0 h-auto"
            value={document.name}
            onChange={(e) => onSave({ name: e.target.value })}
            placeholder="Presentation Title"
          />
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setIsPresenting(true)}>
            <PlayIcon className="w-4 h-4 mr-2" />
            Present
          </Button>
          <Button onClick={saveChanges}>
            Save
          </Button>
        </div>
      </div>
      
      <div className="flex-1 grid grid-cols-[250px_1fr] gap-4">
        {/* Slides panel */}
        <div className="bg-secondary/20 rounded-lg p-4 overflow-y-auto">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-medium">Slides</h3>
            <Button size="sm" variant="ghost" onClick={addNewSlide}>
              <PlusIcon className="w-4 h-4 mr-1" />
              Add
            </Button>
          </div>
          <div className="space-y-2">
            {slides.map((slide, index) => renderSlidePreview(slide, index))}
          </div>
        </div>
        
        {/* Editor panel */}
        <div className="flex flex-col">
          <div className="bg-background border rounded-lg p-1 mb-4">
            <div className="flex items-center gap-2">
              <Button 
                size="sm" 
                variant="ghost"
                onClick={() => addObject(currentSlideIndex, 'text')}
              >
                <Type className="w-4 h-4 mr-1" /> Text
              </Button>
              <Button 
                size="sm" 
                variant="ghost"
                onClick={() => addObject(currentSlideIndex, 'shape')}
              >
                <Square className="w-4 h-4 mr-1" /> Shape
              </Button>
              <Button 
                size="sm" 
                variant="ghost"
                onClick={() => addObject(currentSlideIndex, 'image')}
              >
                <ImageIcon className="w-4 h-4 mr-1" /> Image
              </Button>
              <div className="ml-4 flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Slide Background:</span>
                <input 
                  type="color"
                  value={currentSlide.background}
                  onChange={(e) => updateSlideBackground(currentSlideIndex, e.target.value)}
                  className="w-6 h-6 border-0"
                />
              </div>
            </div>
          </div>
          
          <div className="flex-1 grid grid-cols-[1fr_250px] gap-4">
            {/* Slide preview */}
            <div className="relative border rounded-md overflow-hidden" style={{ 
              backgroundColor: currentSlide.background,
              minHeight: '400px'
            }}>
              {currentSlide.objects.map(obj => (
                <div 
                  key={obj.id}
                  className={`absolute cursor-move border-2 ${selectedObject === obj.id ? 'border-primary' : 'border-transparent'}`}
                  style={{
                    left: `${obj.x}px`,
                    top: `${obj.y}px`,
                    width: `${obj.width}px`,
                    height: `${obj.height}px`,
                  }}
                  onClick={() => setSelectedObject(obj.id)}
                >
                  {obj.type === 'text' && (
                    <Textarea
                      value={obj.content}
                      onChange={(e) => updateObject(currentSlideIndex, obj.id, { content: e.target.value })}
                      className="w-full h-full resize-none border-none focus-visible:ring-0 p-1 overflow-auto"
                      style={{
                        fontSize: `${obj.fontSize}px`,
                        color: obj.color,
                        backgroundColor: 'transparent'
                      }}
                      onClick={(e) => e.stopPropagation()}
                    />
                  )}
                  {obj.type === 'shape' && (
                    <div 
                      className="w-full h-full"
                      style={{ backgroundColor: obj.color }}
                    />
                  )}
                  {obj.type === 'image' && (
                    <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                      <ImageIcon className="w-8 h-8 text-gray-400" />
                    </div>
                  )}
                </div>
              ))}
            </div>
            
            {/* Properties panel */}
            <div className="bg-secondary/20 rounded-lg p-4">
              <h3 className="font-medium mb-3">Properties</h3>
              
              {selectedObject ? (
                <>
                  {(() => {
                    const object = currentSlide.objects.find(obj => obj.id === selectedObject);
                    if (!object) return null;
                    
                    return (
                      <div className="space-y-4">
                        <div className="flex justify-between">
                          <h4 className="text-sm font-medium">
                            {object.type.charAt(0).toUpperCase() + object.type.slice(1)} Object
                          </h4>
                          <Button 
                            size="icon" 
                            variant="destructive" 
                            className="h-6 w-6"
                            onClick={() => deleteObject(currentSlideIndex, object.id)}
                          >
                            <TrashIcon className="h-3 w-3" />
                          </Button>
                        </div>
                        
                        {object.type === 'text' && (
                          <>
                            <div className="space-y-2">
                              <label className="text-xs text-muted-foreground">Text</label>
                              <Textarea
                                value={object.content}
                                onChange={(e) => updateObject(currentSlideIndex, object.id, { content: e.target.value })}
                                className="min-h-[100px]"
                              />
                            </div>
                            
                            <div className="grid grid-cols-2 gap-2">
                              <div className="space-y-2">
                                <label className="text-xs text-muted-foreground">Color</label>
                                <div className="flex">
                                  <input 
                                    type="color"
                                    value={object.color}
                                    onChange={(e) => updateObject(currentSlideIndex, object.id, { color: e.target.value })}
                                    className="w-full h-8"
                                  />
                                </div>
                              </div>
                              <div className="space-y-2">
                                <label className="text-xs text-muted-foreground">Font Size</label>
                                <div className="flex items-center gap-2">
                                  <Slider 
                                    value={[object.fontSize || 16]}
                                    min={8}
                                    max={72}
                                    step={1}
                                    onValueChange={(value) => updateObject(currentSlideIndex, object.id, { fontSize: value[0] })}
                                  />
                                  <span className="text-xs w-8">{object.fontSize}px</span>
                                </div>
                              </div>
                            </div>
                          </>
                        )}
                        
                        {object.type === 'shape' && (
                          <div className="space-y-2">
                            <label className="text-xs text-muted-foreground">Color</label>
                            <input 
                              type="color"
                              value={object.color}
                              onChange={(e) => updateObject(currentSlideIndex, object.id, { color: e.target.value })}
                              className="w-full h-8"
                            />
                          </div>
                        )}
                        
                        <div className="space-y-2">
                          <label className="text-xs text-muted-foreground">Position & Size</label>
                          <div className="grid grid-cols-2 gap-2">
                            <div className="flex items-center gap-1">
                              <MoveHorizontal className="w-3 h-3" />
                              <Input 
                                type="number"
                                value={object.x}
                                onChange={(e) => updateObject(currentSlideIndex, object.id, { x: parseInt(e.target.value) || 0 })}
                                className="h-7"
                              />
                            </div>
                            <div className="flex items-center gap-1">
                              <MoveVertical className="w-3 h-3" />
                              <Input 
                                type="number"
                                value={object.y}
                                onChange={(e) => updateObject(currentSlideIndex, object.id, { y: parseInt(e.target.value) || 0 })}
                                className="h-7"
                              />
                            </div>
                            <div className="flex items-center gap-1">
                              <span className="text-xs">W:</span>
                              <Input 
                                type="number"
                                value={object.width}
                                onChange={(e) => updateObject(currentSlideIndex, object.id, { width: parseInt(e.target.value) || 100 })}
                                className="h-7"
                              />
                            </div>
                            <div className="flex items-center gap-1">
                              <span className="text-xs">H:</span>
                              <Input 
                                type="number"
                                value={object.height}
                                onChange={(e) => updateObject(currentSlideIndex, object.id, { height: parseInt(e.target.value) || 100 })}
                                className="h-7"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </>
              ) : (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-xs text-muted-foreground">Slide Title</label>
                    <Input
                      value={currentSlide.title}
                      onChange={(e) => updateSlideTitle(currentSlideIndex, e.target.value)}
                      placeholder="Slide Title"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-xs text-muted-foreground">Background Color</label>
                    <div className="flex">
                      <input 
                        type="color"
                        value={currentSlide.background}
                        onChange={(e) => updateSlideBackground(currentSlideIndex, e.target.value)}
                        className="w-full h-8"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}