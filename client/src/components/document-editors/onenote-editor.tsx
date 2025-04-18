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
  Image as ImageIcon,
  Type,
  Save,
  BookOpen,
  Pencil,
  PlusCircle,
  MoreVertical,
  Trash2,
  ChevronDown,
  ChevronRight,
  CheckSquare,
  Square,
  File
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Document } from '@shared/schema';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface OneNoteSection {
  id: string;
  title: string;
  pages: OneNotePage[];
  isExpanded?: boolean;
}

interface OneNotePage {
  id: string;
  title: string;
  content: string;
}

interface OneNoteEditorProps {
  document: Document;
  onSave: (document: Partial<Document>) => void;
}

export function OneNoteEditor({ document, onSave }: OneNoteEditorProps) {
  const [sections, setSections] = useState<OneNoteSection[]>([]);
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [activePage, setActivePage] = useState<string | null>(null);
  const [currentContent, setCurrentContent] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    // Initialize sections from document if available
    if (document.sections && Array.isArray(document.sections)) {
      setSections(document.sections);
      
      // Set active section and page if not already set
      if (sections.length > 0 && !activeSection) {
        setActiveSection(sections[0].id);
        
        if (sections[0].pages.length > 0 && !activePage) {
          setActivePage(sections[0].pages[0].id);
          setCurrentContent(sections[0].pages[0].content);
        }
      }
    } else {
      // Initialize with default section and page if none exist
      const defaultSection: OneNoteSection = {
        id: '1',
        title: 'New Section',
        isExpanded: true,
        pages: [
          {
            id: '1',
            title: 'New Page',
            content: '<h1>Welcome to OneNote</h1><p>Start typing to add content.</p>'
          }
        ]
      };
      
      setSections([defaultSection]);
      setActiveSection('1');
      setActivePage('1');
      setCurrentContent(defaultSection.pages[0].content);
    }
  }, [document]);

  const saveDocument = () => {
    // Save current content to the active page
    if (activeSection && activePage) {
      const updatedSections = sections.map(section => {
        if (section.id === activeSection) {
          const updatedPages = section.pages.map(page => {
            if (page.id === activePage) {
              return { ...page, content: currentContent };
            }
            return page;
          });
          return { ...section, pages: updatedPages };
        }
        return section;
      });
      
      setSections(updatedSections);
      
      // Update document
      onSave({
        sections: updatedSections,
        content: JSON.stringify(updatedSections)
      });
    }
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onSave({ name: e.target.value });
  };

  const addNewSection = () => {
    const newSectionId = (sections.length + 1).toString();
    const newSection: OneNoteSection = {
      id: newSectionId,
      title: 'New Section',
      isExpanded: true,
      pages: [
        {
          id: '1',
          title: 'New Page',
          content: '<h1>Welcome to a new section</h1><p>Start typing to add content.</p>'
        }
      ]
    };
    
    const updatedSections = [...sections, newSection];
    setSections(updatedSections);
    setActiveSection(newSectionId);
    setActivePage('1');
    setCurrentContent(newSection.pages[0].content);
  };

  const addNewPage = (sectionId: string) => {
    const section = sections.find(s => s.id === sectionId);
    if (!section) return;
    
    const newPageId = (section.pages.length + 1).toString();
    const newPage: OneNotePage = {
      id: newPageId,
      title: 'New Page',
      content: '<h1>Welcome to a new page</h1><p>Start typing to add content.</p>'
    };
    
    const updatedSections = sections.map(s => {
      if (s.id === sectionId) {
        return { ...s, pages: [...s.pages, newPage] };
      }
      return s;
    });
    
    setSections(updatedSections);
    setActiveSection(sectionId);
    setActivePage(newPageId);
    setCurrentContent(newPage.content);
  };

  const deleteSection = (sectionId: string) => {
    const updatedSections = sections.filter(s => s.id !== sectionId);
    setSections(updatedSections);
    
    // If the active section was deleted, set a new active section
    if (activeSection === sectionId && updatedSections.length > 0) {
      setActiveSection(updatedSections[0].id);
      
      if (updatedSections[0].pages.length > 0) {
        setActivePage(updatedSections[0].pages[0].id);
        setCurrentContent(updatedSections[0].pages[0].content);
      } else {
        setActivePage(null);
        setCurrentContent('');
      }
    }
  };

  const deletePage = (sectionId: string, pageId: string) => {
    const section = sections.find(s => s.id === sectionId);
    if (!section || section.pages.length <= 1) return; // Don't delete the last page
    
    const updatedSections = sections.map(s => {
      if (s.id === sectionId) {
        return { ...s, pages: s.pages.filter(p => p.id !== pageId) };
      }
      return s;
    });
    
    setSections(updatedSections);
    
    // If the active page was deleted, set a new active page
    if (activePage === pageId) {
      const updatedSection = updatedSections.find(s => s.id === sectionId);
      if (updatedSection && updatedSection.pages.length > 0) {
        setActivePage(updatedSection.pages[0].id);
        setCurrentContent(updatedSection.pages[0].content);
      }
    }
  };

  const updateSectionTitle = (sectionId: string, title: string) => {
    const updatedSections = sections.map(s => {
      if (s.id === sectionId) {
        return { ...s, title };
      }
      return s;
    });
    setSections(updatedSections);
  };

  const updatePageTitle = (sectionId: string, pageId: string, title: string) => {
    const updatedSections = sections.map(s => {
      if (s.id === sectionId) {
        const updatedPages = s.pages.map(p => {
          if (p.id === pageId) {
            return { ...p, title };
          }
          return p;
        });
        return { ...s, pages: updatedPages };
      }
      return s;
    });
    setSections(updatedSections);
  };

  const toggleSectionExpand = (sectionId: string) => {
    const updatedSections = sections.map(s => {
      if (s.id === sectionId) {
        return { ...s, isExpanded: !s.isExpanded };
      }
      return s;
    });
    setSections(updatedSections);
  };

  const handlePageClick = (sectionId: string, pageId: string) => {
    const section = sections.find(s => s.id === sectionId);
    if (!section) return;
    
    const page = section.pages.find(p => p.id === pageId);
    if (!page) return;
    
    // Save current content to the current active page
    if (activeSection && activePage) {
      const updatedSections = sections.map(s => {
        if (s.id === activeSection) {
          const updatedPages = s.pages.map(p => {
            if (p.id === activePage) {
              return { ...p, content: currentContent };
            }
            return p;
          });
          return { ...s, pages: updatedPages };
        }
        return s;
      });
      setSections(updatedSections);
    }
    
    setActiveSection(sectionId);
    setActivePage(pageId);
    setCurrentContent(page.content);
  };

  const getCurrentPage = () => {
    if (!activeSection || !activePage) return null;
    
    const section = sections.find(s => s.id === activeSection);
    if (!section) return null;
    
    return section.pages.find(p => p.id === activePage) || null;
  };

  const toggleEditMode = () => {
    setIsEditing(!isEditing);
  };

  const renderSideNavigation = () => {
    return (
      <div className="h-full bg-secondary/10 rounded-lg p-2 w-64">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-sm">Notebook</h2>
          <Button variant="ghost" size="icon" onClick={addNewSection}>
            <PlusCircle className="h-4 w-4" />
          </Button>
        </div>
        
        <ScrollArea className="h-[calc(100vh-12rem)]">
          <div className="space-y-1">
            {sections.map(section => (
              <Collapsible
                key={section.id}
                defaultOpen={section.isExpanded}
                className="border rounded-md overflow-hidden mb-2"
              >
                <div className="flex items-center p-2 bg-secondary/30">
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-5 w-5 p-0">
                      {section.isExpanded ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </Button>
                  </CollapsibleTrigger>
                  <Input
                    value={section.title}
                    onChange={(e) => updateSectionTitle(section.id, e.target.value)}
                    className="h-7 bg-transparent border-none focus-visible:ring-0 text-sm p-0 pl-1"
                  />
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-6 w-6">
                        <MoreVertical className="h-3 w-3" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => addNewPage(section.id)}>
                        <PlusCircle className="h-4 w-4 mr-2" />
                        Add Page
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => deleteSection(section.id)}>
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete Section
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <CollapsibleContent>
                  <div className="pl-6 py-1 space-y-1">
                    {section.pages.map(page => (
                      <div
                        key={page.id}
                        className={`flex items-center p-1 rounded-md cursor-pointer ${
                          activeSection === section.id && activePage === page.id
                            ? 'bg-secondary/50'
                            : 'hover:bg-secondary/20'
                        }`}
                        onClick={() => handlePageClick(section.id, page.id)}
                      >
                        <File className="h-4 w-4 mr-2 text-muted-foreground" />
                        <Input
                          value={page.title}
                          onChange={(e) => updatePageTitle(section.id, page.id, e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                          className="h-6 bg-transparent border-none focus-visible:ring-0 text-sm p-0"
                        />
                        {section.pages.length > 1 && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-5 w-5 ml-auto"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    deletePage(section.id, page.id);
                                  }}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Delete page</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                      </div>
                    ))}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            ))}
          </div>
        </ScrollArea>
      </div>
    );
  };

  const renderToolbar = () => {
    if (!isEditing) return null;
    
    return (
      <div className="bg-background border rounded-lg p-2 mb-4">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex border rounded-md">
            <Button 
              variant="ghost" 
              size="sm" 
              className="rounded-r-none h-8"
            >
              <Bold className="h-4 w-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              className="rounded-none border-x-0 h-8"
            >
              <Italic className="h-4 w-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              className="rounded-l-none h-8"
            >
              <Underline className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex border rounded-md">
            <Button 
              variant="ghost" 
              size="sm" 
              className="rounded-r-none h-8"
            >
              <AlignLeft className="h-4 w-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              className="rounded-none border-x-0 h-8"
            >
              <AlignCenter className="h-4 w-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              className="rounded-l-none h-8"
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
                >
                  {size}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <Separator orientation="vertical" className="h-8" />

          <Button variant="ghost" size="sm" className="h-8">
            <CheckSquare className="h-4 w-4 mr-1" /> Checkbox
          </Button>
          <Button variant="ghost" size="sm" className="h-8">
            <ImageIcon className="h-4 w-4 mr-1" /> Insert Image
          </Button>
        </div>
      </div>
    );
  };

  const activeSectionTitle = activeSection
    ? sections.find(s => s.id === activeSection)?.title || 'Section'
    : 'Section';
    
  const activePageTitle = activePage && activeSection
    ? sections.find(s => s.id === activeSection)?.pages.find(p => p.id === activePage)?.title || 'Page'
    : 'Page';

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <BookOpen className="w-5 h-5" />
          <Input 
            className="font-semibold text-lg border-none focus-visible:ring-0 p-0 h-auto"
            value={document.name}
            onChange={handleNameChange}
            placeholder="Notebook Title"
          />
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant={isEditing ? "default" : "outline"} 
            size="sm"
            onClick={toggleEditMode}
          >
            <Pencil className="w-4 h-4 mr-2" />
            {isEditing ? 'Editing' : 'Edit'}
          </Button>
          <Button onClick={saveDocument}>
            <Save className="w-4 h-4 mr-2" />
            Save
          </Button>
        </div>
      </div>
      
      <div className="flex-1 grid grid-cols-[auto_1fr] gap-4">
        {renderSideNavigation()}
        
        <div className="flex flex-col">
          <div className="mb-4">
            <div className="flex items-center">
              <h2 className="text-xl font-semibold">{activePageTitle}</h2>
              <span className="mx-2 text-muted-foreground">•</span>
              <span className="text-sm text-muted-foreground">{activeSectionTitle}</span>
            </div>
          </div>
          
          {renderToolbar()}
          
          <div className="flex-1 bg-background border rounded-lg p-4 overflow-auto">
            {activePage ? (
              isEditing ? (
                <Textarea
                  value={currentContent}
                  onChange={(e) => setCurrentContent(e.target.value)}
                  className="min-h-[500px] border-none focus-visible:ring-0 p-0 resize-none h-full"
                  placeholder="Type your notes here..."
                />
              ) : (
                <div 
                  className="prose max-w-none" 
                  dangerouslySetInnerHTML={{ __html: currentContent }}
                />
              )
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                Select a page to view
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}