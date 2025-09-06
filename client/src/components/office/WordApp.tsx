import React, { useState, useEffect, useRef } from 'react';
import { 
  SaveIcon,
  ShareIcon,
  DownloadIcon,
  UploadIcon,
  BoldIcon,
  ItalicIcon,
  UnderlineIcon,
  AlignLeftIcon,
  AlignCenterIcon,
  AlignRightIcon,
  AlignJustifyIcon,
  ListIcon,
  ListOrderedIcon,
  QuoteIcon,
  LinkIcon,
  ImageIcon,
  TableIcon,
  TypeIcon,
  PaletteIcon,
  UndoIcon,
  RedoIcon,
  PrintIcon
} from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Badge } from '../ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Slider } from '../ui/slider';

interface WordAppProps {
  documentId: number;
  onSave: (content: any) => void;
  onClose: () => void;
}

interface TextFormatting {
  bold: boolean;
  italic: boolean;
  underline: boolean;
  fontSize: number;
  fontFamily: string;
  color: string;
  backgroundColor: string;
  alignment: 'left' | 'center' | 'right' | 'justify';
}

interface DocumentElement {
  id: string;
  type: 'paragraph' | 'heading' | 'list' | 'image' | 'table' | 'quote';
  content: string;
  formatting: TextFormatting;
  level?: number; // for headings and lists
}

export const WordApp: React.FC<WordAppProps> = ({
  documentId,
  onSave,
  onClose
}) => {
  const [document, setDocument] = useState<{
    title: string;
    content: DocumentElement[];
    settings: any;
  }>({
    title: 'Untitled Document',
    content: [],
    settings: {}
  });
  const [selectedElement, setSelectedElement] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showFormatting, setShowFormatting] = useState(true);
  const [currentFormatting, setCurrentFormatting] = useState<TextFormatting>({
    bold: false,
    italic: false,
    underline: false,
    fontSize: 12,
    fontFamily: 'Arial',
    color: '#000000',
    backgroundColor: '#ffffff',
    alignment: 'left'
  });
  const editorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadDocument();
  }, [documentId]);

  const loadDocument = async () => {
    try {
      const response = await fetch(`/api/drive/documents/${documentId}`);
      const data = await response.json();
      
      if (data.success && data.document) {
        const content = data.document.content || { title: 'Untitled Document', content: [], settings: {} };
        setDocument(content);
        if (content.content.length === 0) {
          addParagraph();
        }
      }
    } catch (error) {
      console.error('Failed to load document:', error);
    }
  };

  const saveDocument = async () => {
    try {
      setIsSaving(true);
      await onSave(document);
    } catch (error) {
      console.error('Failed to save document:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const addElement = (type: DocumentElement['type']) => {
    const newElement: DocumentElement = {
      id: `element_${Date.now()}`,
      type,
      content: '',
      formatting: { ...currentFormatting },
      level: type === 'heading' ? 1 : undefined
    };

    setDocument(prev => ({
      ...prev,
      content: [...prev.content, newElement]
    }));

    setSelectedElement(newElement.id);
  };

  const addParagraph = () => addElement('paragraph');
  const addHeading = () => addElement('heading');
  const addList = () => addElement('list');
  const addQuote = () => addElement('quote');

  const updateElement = (id: string, updates: Partial<DocumentElement>) => {
    setDocument(prev => ({
      ...prev,
      content: prev.content.map(element =>
        element.id === id ? { ...element, ...updates } : element
      )
    }));
  };

  const deleteElement = (id: string) => {
    setDocument(prev => ({
      ...prev,
      content: prev.content.filter(element => element.id !== id)
    }));
    setSelectedElement(null);
  };

  const applyFormatting = (formatting: Partial<TextFormatting>) => {
    if (selectedElement) {
      updateElement(selectedElement, {
        formatting: { ...currentFormatting, ...formatting }
      });
    }
    setCurrentFormatting(prev => ({ ...prev, ...formatting }));
  };

  const getElementStyle = (element: DocumentElement): React.CSSProperties => {
    return {
      fontWeight: element.formatting.bold ? 'bold' : 'normal',
      fontStyle: element.formatting.italic ? 'italic' : 'normal',
      textDecoration: element.formatting.underline ? 'underline' : 'none',
      fontSize: `${element.formatting.fontSize}px`,
      fontFamily: element.formatting.fontFamily,
      color: element.formatting.color,
      backgroundColor: element.formatting.backgroundColor,
      textAlign: element.formatting.alignment,
      margin: '8px 0',
      padding: element.type === 'quote' ? '16px' : '0',
      borderLeft: element.type === 'quote' ? '4px solid #e2e8f0' : 'none',
      fontStyle: element.type === 'quote' ? 'italic' : 'normal'
    };
  };

  const renderElement = (element: DocumentElement) => {
    const Tag = element.type === 'heading' ? `h${element.level || 1}` as keyof JSX.IntrinsicElements :
                element.type === 'quote' ? 'blockquote' :
                element.type === 'list' ? 'ul' : 'p';

    return (
      <div
        key={element.id}
        className={`relative group ${
          selectedElement === element.id ? 'ring-2 ring-blue-500' : ''
        }`}
        onClick={() => setSelectedElement(element.id)}
      >
        <Tag style={getElementStyle(element)}>
          {element.type === 'list' ? (
            <li>{element.content}</li>
          ) : (
            element.content || 'Click to edit...'
          )}
        </Tag>
        
        {selectedElement === element.id && (
          <div className="absolute -right-8 top-0 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => deleteElement(element.id)}
            >
              ×
            </Button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="h-screen flex flex-col bg-gray-100">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h1 className="text-xl font-semibold">SyncBoard Word</h1>
          <Badge variant="outline">
            {document.content.length} element{document.content.length !== 1 ? 's' : ''}
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
        <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
          <Tabs defaultValue="formatting" className="flex-1">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="formatting">Formatting</TabsTrigger>
              <TabsTrigger value="insert">Insert</TabsTrigger>
            </TabsList>
            
            <TabsContent value="formatting" className="flex-1 p-4">
              <div className="space-y-4">
                <h3 className="font-medium">Text Formatting</h3>
                
                {/* Font Family */}
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">Font Family</label>
                  <Select
                    value={currentFormatting.fontFamily}
                    onValueChange={(value) => applyFormatting({ fontFamily: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Arial">Arial</SelectItem>
                      <SelectItem value="Times New Roman">Times New Roman</SelectItem>
                      <SelectItem value="Calibri">Calibri</SelectItem>
                      <SelectItem value="Georgia">Georgia</SelectItem>
                      <SelectItem value="Verdana">Verdana</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                {/* Font Size */}
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">
                    Font Size: {currentFormatting.fontSize}px
                  </label>
                  <Slider
                    value={[currentFormatting.fontSize]}
                    onValueChange={([value]) => applyFormatting({ fontSize: value })}
                    min={8}
                    max={72}
                    step={1}
                    className="w-full"
                  />
                </div>
                
                {/* Text Style */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Text Style</label>
                  <div className="flex space-x-2">
                    <Button
                      size="sm"
                      variant={currentFormatting.bold ? "default" : "outline"}
                      onClick={() => applyFormatting({ bold: !currentFormatting.bold })}
                    >
                      <BoldIcon className="h-4 w-4" />
                    </Button>
                    
                    <Button
                      size="sm"
                      variant={currentFormatting.italic ? "default" : "outline"}
                      onClick={() => applyFormatting({ italic: !currentFormatting.italic })}
                    >
                      <ItalicIcon className="h-4 w-4" />
                    </Button>
                    
                    <Button
                      size="sm"
                      variant={currentFormatting.underline ? "default" : "outline"}
                      onClick={() => applyFormatting({ underline: !currentFormatting.underline })}
                    >
                      <UnderlineIcon className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                
                {/* Text Alignment */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Alignment</label>
                  <div className="flex space-x-2">
                    <Button
                      size="sm"
                      variant={currentFormatting.alignment === 'left' ? "default" : "outline"}
                      onClick={() => applyFormatting({ alignment: 'left' })}
                    >
                      <AlignLeftIcon className="h-4 w-4" />
                    </Button>
                    
                    <Button
                      size="sm"
                      variant={currentFormatting.alignment === 'center' ? "default" : "outline"}
                      onClick={() => applyFormatting({ alignment: 'center' })}
                    >
                      <AlignCenterIcon className="h-4 w-4" />
                    </Button>
                    
                    <Button
                      size="sm"
                      variant={currentFormatting.alignment === 'right' ? "default" : "outline"}
                      onClick={() => applyFormatting({ alignment: 'right' })}
                    >
                      <AlignRightIcon className="h-4 w-4" />
                    </Button>
                    
                    <Button
                      size="sm"
                      variant={currentFormatting.alignment === 'justify' ? "default" : "outline"}
                      onClick={() => applyFormatting({ alignment: 'justify' })}
                    >
                      <AlignJustifyIcon className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                
                {/* Colors */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Text Color</label>
                  <div className="flex space-x-2">
                    <input
                      type="color"
                      value={currentFormatting.color}
                      onChange={(e) => applyFormatting({ color: e.target.value })}
                      className="w-8 h-8 border border-gray-300 rounded"
                    />
                    <span className="text-sm text-gray-500">{currentFormatting.color}</span>
                  </div>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="insert" className="flex-1 p-4">
              <div className="space-y-4">
                <h3 className="font-medium">Insert Elements</h3>
                
                <div className="space-y-2">
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={addParagraph}
                  >
                    <TypeIcon className="h-4 w-4 mr-2" />
                    Paragraph
                  </Button>
                  
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={addHeading}
                  >
                    <TypeIcon className="h-4 w-4 mr-2" />
                    Heading
                  </Button>
                  
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={addList}
                  >
                    <ListIcon className="h-4 w-4 mr-2" />
                    List
                  </Button>
                  
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={addQuote}
                  >
                    <QuoteIcon className="h-4 w-4 mr-2" />
                    Quote
                  </Button>
                  
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => addElement('image')}
                  >
                    <ImageIcon className="h-4 w-4 mr-2" />
                    Image
                  </Button>
                  
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => addElement('table')}
                  >
                    <TableIcon className="h-4 w-4 mr-2" />
                    Table
                  </Button>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col">
          {/* Toolbar */}
          <div className="bg-white border-b border-gray-200 px-4 py-2 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Button variant="outline" size="sm">
                <UndoIcon className="h-4 w-4" />
              </Button>
              
              <Button variant="outline" size="sm">
                <RedoIcon className="h-4 w-4" />
              </Button>
              
              <div className="w-px h-6 bg-gray-300 mx-2" />
              
              <Button variant="outline" size="sm">
                <PrintIcon className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="flex items-center space-x-2">
              <Input
                value={document.title}
                onChange={(e) => setDocument(prev => ({ ...prev, title: e.target.value }))}
                className="font-medium border-none shadow-none focus:ring-0"
                placeholder="Document title"
              />
            </div>
          </div>

          {/* Document Editor */}
          <div className="flex-1 overflow-auto bg-white">
            <div className="max-w-4xl mx-auto p-8">
              <div ref={editorRef} className="min-h-full">
                {document.content.length === 0 ? (
                  <div className="text-center text-gray-500 py-16">
                    <TypeIcon className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                    <p className="text-lg mb-2">Start writing your document</p>
                    <p className="text-sm">Click "Insert" in the sidebar to add content</p>
                  </div>
                ) : (
                  document.content.map(renderElement)
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};