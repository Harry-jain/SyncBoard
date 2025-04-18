import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Bold,
  Italic,
  Underline,
  AlignLeft,
  AlignCenter,
  AlignRight,
  List,
  ListOrdered,
  Image as ImageIcon,
  Type,
  Save,
  FileText
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Document } from '@shared/schema';
import { Separator } from '@/components/ui/separator';

interface WordEditorProps {
  document: Document;
  onSave: (document: Partial<Document>) => void;
}

interface TextStyle {
  bold: boolean;
  italic: boolean;
  underline: boolean;
  align: 'left' | 'center' | 'right';
  fontSize: string;
}

export function WordEditor({ document, onSave }: WordEditorProps) {
  const [content, setContent] = useState('');
  const [currentStyle, setCurrentStyle] = useState<TextStyle>({
    bold: false,
    italic: false,
    underline: false,
    align: 'left',
    fontSize: '16px'
  });
  const [selectedTab, setSelectedTab] = useState<string>('edit');

  useEffect(() => {
    if (document.content) {
      setContent(document.content);
    }
  }, [document]);

  const handleStyleChange = (property: keyof TextStyle, value: any) => {
    setCurrentStyle(prev => ({
      ...prev,
      [property]: value
    }));
  };

  const applyFormattingToSelection = (style: keyof TextStyle) => {
    // This is a simplified example - in a real editor, you would apply
    // formatting to the selected text in the content
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    console.log(`Applying ${style} to selected text`);
    // In a real implementation, you would modify the content here
  };

  const insertElement = (type: 'image' | 'table' | 'list') => {
    let elementHtml = '';
    
    switch (type) {
      case 'image':
        elementHtml = '<div class="image-placeholder bg-gray-200 h-40 flex items-center justify-center border rounded-md my-4"><span class="text-gray-500">Image Placeholder</span></div>';
        break;
      case 'table':
        elementHtml = `
          <table class="border-collapse border w-full my-4">
            <thead>
              <tr class="bg-gray-100">
                <th class="border p-2">Header 1</th>
                <th class="border p-2">Header 2</th>
                <th class="border p-2">Header 3</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td class="border p-2">Cell 1</td>
                <td class="border p-2">Cell 2</td>
                <td class="border p-2">Cell 3</td>
              </tr>
              <tr>
                <td class="border p-2">Cell 4</td>
                <td class="border p-2">Cell 5</td>
                <td class="border p-2">Cell 6</td>
              </tr>
            </tbody>
          </table>
        `;
        break;
      case 'list':
        elementHtml = `
          <ul class="list-disc ml-6 my-4">
            <li class="my-1">List item 1</li>
            <li class="my-1">List item 2</li>
            <li class="my-1">List item 3</li>
          </ul>
        `;
        break;
    }
    
    // In a real implementation, you would insert the HTML at the cursor position
    setContent(prevContent => prevContent + elementHtml);
  };

  const saveDocument = () => {
    onSave({
      content,
      type: 'word'
    });
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onSave({ name: e.target.value });
  };

  const renderPreview = () => {
    return (
      <div className="bg-white rounded-lg shadow-md p-8 mx-auto max-w-3xl min-h-[29.7cm] w-[21cm] border border-gray-200">
        <div className="prose max-w-none" dangerouslySetInnerHTML={{ __html: content }}></div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5" />
          <Input 
            className="font-semibold text-lg border-none focus-visible:ring-0 p-0 h-auto"
            value={document.name}
            onChange={handleNameChange}
            placeholder="Document Title"
          />
        </div>
        <Button onClick={saveDocument}>
          <Save className="w-4 h-4 mr-2" />
          Save
        </Button>
      </div>

      <div className="bg-background border rounded-lg p-2 mb-4">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex border rounded-md">
            <Button 
              variant={currentStyle.bold ? "default" : "ghost"} 
              size="sm" 
              className="rounded-r-none h-8"
              onClick={() => {
                handleStyleChange('bold', !currentStyle.bold);
                applyFormattingToSelection('bold');
              }}
            >
              <Bold className="h-4 w-4" />
            </Button>
            <Button 
              variant={currentStyle.italic ? "default" : "ghost"} 
              size="sm" 
              className="rounded-none border-x-0 h-8"
              onClick={() => {
                handleStyleChange('italic', !currentStyle.italic);
                applyFormattingToSelection('italic');
              }}
            >
              <Italic className="h-4 w-4" />
            </Button>
            <Button 
              variant={currentStyle.underline ? "default" : "ghost"} 
              size="sm" 
              className="rounded-l-none h-8"
              onClick={() => {
                handleStyleChange('underline', !currentStyle.underline);
                applyFormattingToSelection('underline');
              }}
            >
              <Underline className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex border rounded-md">
            <Button 
              variant={currentStyle.align === 'left' ? "default" : "ghost"} 
              size="sm" 
              className="rounded-r-none h-8"
              onClick={() => handleStyleChange('align', 'left')}
            >
              <AlignLeft className="h-4 w-4" />
            </Button>
            <Button 
              variant={currentStyle.align === 'center' ? "default" : "ghost"} 
              size="sm" 
              className="rounded-none border-x-0 h-8"
              onClick={() => handleStyleChange('align', 'center')}
            >
              <AlignCenter className="h-4 w-4" />
            </Button>
            <Button 
              variant={currentStyle.align === 'right' ? "default" : "ghost"} 
              size="sm" 
              className="rounded-l-none h-8"
              onClick={() => handleStyleChange('align', 'right')}
            >
              <AlignRight className="h-4 w-4" />
            </Button>
          </div>

          <Separator orientation="vertical" className="h-8" />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8">
                <Type className="h-4 w-4 mr-1" /> Font Size
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              {['10px', '12px', '14px', '16px', '18px', '24px', '32px'].map(size => (
                <DropdownMenuItem 
                  key={size}
                  onClick={() => handleStyleChange('fontSize', size)}
                  className={currentStyle.fontSize === size ? 'bg-secondary' : ''}
                >
                  {size}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <Separator orientation="vertical" className="h-8" />

          <Button variant="ghost" size="sm" className="h-8" onClick={() => insertElement('list')}>
            <List className="h-4 w-4 mr-1" /> Bullet List
          </Button>
          <Button variant="ghost" size="sm" className="h-8" onClick={() => insertElement('list')}>
            <ListOrdered className="h-4 w-4 mr-1" /> Numbered List
          </Button>
          <Button variant="ghost" size="sm" className="h-8" onClick={() => insertElement('image')}>
            <ImageIcon className="h-4 w-4 mr-1" /> Insert Image
          </Button>
        </div>
      </div>

      <Tabs defaultValue="edit" className="flex-1 flex flex-col" value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="grid w-40 grid-cols-2 mb-4">
          <TabsTrigger value="edit">Edit</TabsTrigger>
          <TabsTrigger value="preview">Preview</TabsTrigger>
        </TabsList>
        <TabsContent value="edit" className="flex-1 data-[state=active]:flex flex-col">
          <div className="flex-1 overflow-auto bg-white rounded-lg shadow-md">
            {/* In a real implementation, this would be a rich text editor component */}
            <Textarea 
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full h-full min-h-[500px] p-8 border-none focus-visible:ring-0 resize-none"
              placeholder="Start typing your document..."
            />
          </div>
        </TabsContent>
        <TabsContent value="preview" className="flex-1 data-[state=active]:flex flex-col overflow-auto">
          <div className="flex-1 overflow-auto bg-gray-100 p-8">
            {renderPreview()}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}