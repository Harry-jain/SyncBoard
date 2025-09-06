import React, { useState, useEffect, useRef } from 'react';
import { 
  SaveIcon,
  ShareIcon,
  DownloadIcon,
  UploadIcon,
  PlusIcon,
  TrashIcon,
  EditIcon,
  EyeIcon,
  SearchIcon,
  BookOpenIcon,
  FileTextIcon,
  ImageIcon,
  LinkIcon,
  CodeIcon,
  PaletteIcon,
  SettingsIcon,
  TagIcon,
  CalendarIcon,
  UserIcon,
  MoreHorizontalIcon,
  ChevronRightIcon,
  ChevronDownIcon,
  FolderIcon,
  FolderOpenIcon
} from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Badge } from '../ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Switch } from '../ui/switch';
import { Slider } from '../ui/slider';

interface NotebookSection {
  id: string;
  name: string;
  type: 'content_library' | 'collaboration_space' | 'individual';
  studentId?: number;
  pages: NotebookPage[];
  isExpanded: boolean;
  color: string;
}

interface NotebookPage {
  id: string;
  title: string;
  content: string;
  type: 'text' | 'image' | 'drawing' | 'code' | 'link';
  tags: string[];
  createdBy: number;
  createdAt: Date;
  updatedAt: Date;
  isDistributed: boolean;
  metadata: any;
}

interface Notebook {
  title: string;
  description: string;
  sections: NotebookSection[];
  settings: {
    theme: string;
    allowCollaboration: boolean;
    autoSave: boolean;
    showPageNumbers: boolean;
  };
}

interface NotebookAppProps {
  documentId: number;
  onSave: (content: any) => void;
  onClose: () => void;
}

export const NotebookApp: React.FC<NotebookAppProps> = ({
  documentId,
  onSave,
  onClose
}) => {
  const [notebook, setNotebook] = useState<Notebook>({
    title: 'Untitled Notebook',
    description: '',
    sections: [],
    settings: {
      theme: 'default',
      allowCollaboration: true,
      autoSave: true,
      showPageNumbers: true
    }
  });
  const [selectedSection, setSelectedSection] = useState<string | null>(null);
  const [selectedPage, setSelectedPage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [pageTitle, setPageTitle] = useState('');
  const [pageContent, setPageContent] = useState('');
  const editorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadDocument();
  }, [documentId]);

  const loadDocument = async () => {
    try {
      const response = await fetch(`/api/drive/documents/${documentId}`);
      const data = await response.json();
      
      if (data.success && data.document) {
        const content = data.document.content || {
          title: 'Untitled Notebook',
          description: '',
          sections: [],
          settings: {
            theme: 'default',
            allowCollaboration: true,
            autoSave: true,
            showPageNumbers: true
          }
        };
        setNotebook(content);
        if (content.sections.length === 0) {
          addSection('content_library', 'Content Library');
        }
      }
    } catch (error) {
      console.error('Failed to load document:', error);
    }
  };

  const saveDocument = async () => {
    try {
      setIsSaving(true);
      await onSave(notebook);
    } catch (error) {
      console.error('Failed to save document:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const addSection = (type: NotebookSection['type'], name: string, studentId?: number) => {
    const newSection: NotebookSection = {
      id: `section_${Date.now()}`,
      name,
      type,
      studentId,
      pages: [],
      isExpanded: true,
      color: getRandomColor()
    };

    setNotebook(prev => ({
      ...prev,
      sections: [...prev.sections, newSection]
    }));

    setSelectedSection(newSection.id);
  };

  const addPage = (sectionId: string, type: NotebookPage['type'] = 'text') => {
    const newPage: NotebookPage = {
      id: `page_${Date.now()}`,
      title: `New ${type.charAt(0).toUpperCase() + type.slice(1)} Page`,
      content: '',
      type,
      tags: [],
      createdBy: 1, // Current user ID
      createdAt: new Date(),
      updatedAt: new Date(),
      isDistributed: false,
      metadata: {}
    };

    setNotebook(prev => ({
      ...prev,
      sections: prev.sections.map(section =>
        section.id === sectionId
          ? { ...section, pages: [...section.pages, newPage] }
          : section
      )
    }));

    setSelectedPage(newPage.id);
    setPageTitle(newPage.title);
    setPageContent(newPage.content);
    setIsEditing(true);
  };

  const updatePage = (pageId: string, updates: Partial<NotebookPage>) => {
    setNotebook(prev => ({
      ...prev,
      sections: prev.sections.map(section => ({
        ...section,
        pages: section.pages.map(page =>
          page.id === pageId ? { ...page, ...updates, updatedAt: new Date() } : page
        )
      }))
    }));
  };

  const deletePage = (pageId: string) => {
    setNotebook(prev => ({
      ...prev,
      sections: prev.sections.map(section => ({
        ...section,
        pages: section.pages.filter(page => page.id !== pageId)
      }))
    }));
    
    if (selectedPage === pageId) {
      setSelectedPage(null);
      setIsEditing(false);
    }
  };

  const deleteSection = (sectionId: string) => {
    setNotebook(prev => ({
      ...prev,
      sections: prev.sections.filter(section => section.id !== sectionId)
    }));
    
    if (selectedSection === sectionId) {
      setSelectedSection(null);
      setSelectedPage(null);
      setIsEditing(false);
    }
  };

  const toggleSection = (sectionId: string) => {
    setNotebook(prev => ({
      ...prev,
      sections: prev.sections.map(section =>
        section.id === sectionId ? { ...section, isExpanded: !section.isExpanded } : section
      )
    }));
  };

  const getCurrentPage = (): NotebookPage | null => {
    if (!selectedPage) return null;
    
    for (const section of notebook.sections) {
      const page = section.pages.find(p => p.id === selectedPage);
      if (page) return page;
    }
    return null;
  };

  const getCurrentSection = (): NotebookSection | null => {
    if (!selectedSection) return null;
    return notebook.sections.find(s => s.id === selectedSection) || null;
  };

  const getRandomColor = (): string => {
    const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4'];
    return colors[Math.floor(Math.random() * colors.length)];
  };

  const renderPageContent = (page: NotebookPage) => {
    switch (page.type) {
      case 'text':
        return (
          <div className="prose max-w-none">
            <div
              contentEditable={isEditing}
              suppressContentEditableWarning
              className="min-h-96 p-4 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              onInput={(e) => {
                const content = e.currentTarget.textContent || '';
                setPageContent(content);
                updatePage(page.id, { content });
              }}
            >
              {page.content || 'Start writing...'}
            </div>
          </div>
        );
      
      case 'image':
        return (
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
            <ImageIcon className="h-16 w-16 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-500">Click to add image</p>
          </div>
        );
      
      case 'drawing':
        return (
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
            <PaletteIcon className="h-16 w-16 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-500">Drawing canvas would go here</p>
          </div>
        );
      
      case 'code':
        return (
          <div className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-sm">
            <pre>{page.content || '// Start coding...'}</pre>
          </div>
        );
      
      case 'link':
        return (
          <div className="border border-gray-300 rounded-lg p-4">
            <LinkIcon className="h-6 w-6 text-blue-500 mb-2" />
            <p className="text-blue-500 hover:underline cursor-pointer">
              {page.content || 'Add a link...'}
            </p>
          </div>
        );
      
      default:
        return <div>Unknown page type</div>;
    }
  };

  const filteredSections = notebook.sections.filter(section => {
    if (!searchQuery) return true;
    return section.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
           section.pages.some(page => 
             page.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
             page.content.toLowerCase().includes(searchQuery.toLowerCase())
           );
  });

  return (
    <div className="h-screen flex flex-col bg-gray-100">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h1 className="text-xl font-semibold">SyncBoard Notebook</h1>
          <Badge variant="outline">
            {notebook.sections.reduce((acc, section) => acc + section.pages.length, 0)} pages
          </Badge>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowSettings(!showSettings)}
          >
            <SettingsIcon className="h-4 w-4 mr-2" />
            Settings
          </Button>
          
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
          
          <Button variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>

      <div className="flex-1 flex">
        {/* Sidebar */}
        <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center space-x-2 mb-4">
              <SearchIcon className="h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search pages..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="border-none shadow-none focus:ring-0"
              />
            </div>
            
            <div className="flex space-x-2">
              <Button
                size="sm"
                onClick={() => addSection('content_library', 'New Section')}
              >
                <PlusIcon className="h-4 w-4 mr-2" />
                Add Section
              </Button>
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4">
            <div className="space-y-2">
              {filteredSections.map(section => (
                <div key={section.id} className="border border-gray-200 rounded-lg">
                  <div
                    className="p-3 cursor-pointer hover:bg-gray-50 flex items-center justify-between"
                    onClick={() => {
                      setSelectedSection(section.id);
                      if (section.pages.length > 0) {
                        setSelectedPage(section.pages[0].id);
                        setPageTitle(section.pages[0].title);
                        setPageContent(section.pages[0].content);
                      }
                    }}
                  >
                    <div className="flex items-center space-x-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: section.color }}
                      />
                      <span className="font-medium">{section.name}</span>
                      <Badge variant="outline" className="text-xs">
                        {section.pages.length}
                      </Badge>
                    </div>
                    
                    <div className="flex items-center space-x-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          addPage(section.id);
                        }}
                      >
                        <PlusIcon className="h-4 w-4" />
                      </Button>
                      
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleSection(section.id);
                        }}
                      >
                        {section.isExpanded ? (
                          <ChevronDownIcon className="h-4 w-4" />
                        ) : (
                          <ChevronRightIcon className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                  
                  {section.isExpanded && (
                    <div className="border-t border-gray-200 p-2 space-y-1">
                      {section.pages.map(page => (
                        <div
                          key={page.id}
                          className={`p-2 rounded cursor-pointer hover:bg-gray-50 flex items-center justify-between ${
                            selectedPage === page.id ? 'bg-blue-50 border border-blue-200' : ''
                          }`}
                          onClick={() => {
                            setSelectedPage(page.id);
                            setPageTitle(page.title);
                            setPageContent(page.content);
                            setIsEditing(false);
                          }}
                        >
                          <div className="flex items-center space-x-2">
                            {page.type === 'text' && <FileTextIcon className="h-4 w-4 text-gray-400" />}
                            {page.type === 'image' && <ImageIcon className="h-4 w-4 text-gray-400" />}
                            {page.type === 'code' && <CodeIcon className="h-4 w-4 text-gray-400" />}
                            {page.type === 'link' && <LinkIcon className="h-4 w-4 text-gray-400" />}
                            {page.type === 'drawing' && <PaletteIcon className="h-4 w-4 text-gray-400" />}
                            
                            <span className="text-sm truncate">{page.title}</span>
                          </div>
                          
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              deletePage(page.id);
                            }}
                          >
                            <TrashIcon className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col">
          {/* Page Header */}
          {selectedPage && (
            <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <Input
                  value={pageTitle}
                  onChange={(e) => {
                    setPageTitle(e.target.value);
                    updatePage(selectedPage, { title: e.target.value });
                  }}
                  className="text-lg font-semibold border-none shadow-none focus:ring-0"
                  placeholder="Page title"
                />
                
                <div className="flex space-x-2">
                  <Button
                    size="sm"
                    variant={isEditing ? "default" : "outline"}
                    onClick={() => setIsEditing(!isEditing)}
                  >
                    <EditIcon className="h-4 w-4 mr-2" />
                    {isEditing ? 'View' : 'Edit'}
                  </Button>
                  
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      const page = getCurrentPage();
                      if (page) {
                        addPage(selectedSection!, page.type);
                      }
                    }}
                  >
                    <PlusIcon className="h-4 w-4 mr-2" />
                    New Page
                  </Button>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-500">
                  {getCurrentPage()?.updatedAt.toLocaleDateString()}
                </span>
              </div>
            </div>
          )}

          {/* Page Content */}
          <div className="flex-1 overflow-auto bg-white">
            {selectedPage ? (
              <div className="max-w-4xl mx-auto p-8">
                {getCurrentPage() && renderPageContent(getCurrentPage()!)}
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center text-gray-500">
                  <BookOpenIcon className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                  <p className="text-lg mb-2">Select a page to start</p>
                  <p className="text-sm">Choose a page from the sidebar or create a new one</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};