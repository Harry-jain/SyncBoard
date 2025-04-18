import React, { useEffect } from 'react';
import { useParams } from 'wouter';
import { DocumentEditor } from '@/components/document-editors/document-editor';
import { Button } from '@/components/ui/button';
import { ArrowLeft, FileText, Presentation, BookOpen } from 'lucide-react';
import { Link } from 'wouter';
import { Separator } from '@/components/ui/separator';
import { useMediaQuery } from '@/hooks/use-media-query';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useQuery } from '@tanstack/react-query';

export default function DocumentEditPage() {
  const { id } = useParams<{ id: string }>();
  const documentId = id ? parseInt(id) : undefined;
  const isNewDocument = id === 'new';
  const isDesktop = useMediaQuery("(min-width: 768px)");
  
  // Get document title for existing documents
  const { data: document } = useQuery({
    queryKey: [id && !isNewDocument ? `/api/documents/${id}` : null],
    enabled: !!id && !isNewDocument
  });
  
  useEffect(() => {
    document.title = isNewDocument 
      ? "SyncBoard - New Document" 
      : document?.title 
        ? `SyncBoard - ${document.title}` 
        : "SyncBoard - Document Editor";
  }, [isNewDocument, document]);
  
  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden">
      {/* Left sidebar for navigation on desktop */}
      {isDesktop && (
        <aside className="w-[250px] border-r px-4 py-6 hidden md:block">
          <Link href="/documents">
            <Button variant="ghost" className="mb-4 w-full justify-start">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Documents
            </Button>
          </Link>
          
          <h3 className="font-medium mb-2 text-sm">Create New</h3>
          
          <div className="space-y-1 mb-6">
            <Link href="/documents/new?type=word">
              <Button variant="ghost" size="sm" className="w-full justify-start">
                <FileText className="mr-2 h-4 w-4" />
                Word Document
              </Button>
            </Link>
            <Link href="/documents/new?type=powerpoint">
              <Button variant="ghost" size="sm" className="w-full justify-start">
                <Presentation className="mr-2 h-4 w-4" />
                PowerPoint
              </Button>
            </Link>
            <Link href="/documents/new?type=onenote">
              <Button variant="ghost" size="sm" className="w-full justify-start">
                <BookOpen className="mr-2 h-4 w-4" />
                OneNote
              </Button>
            </Link>
          </div>
          
          <Separator className="my-4" />
          
          <h3 className="font-medium mb-2 text-sm">Recent Documents</h3>
          
          <ScrollArea className="h-[calc(100vh-22rem)]">
            <div className="space-y-1">
              {/* Recent documents would be loaded here */}
              <Button variant="ghost" size="sm" className="w-full justify-start">
                <FileText className="mr-2 h-4 w-4" />
                Project Report.docx
              </Button>
              <Button variant="ghost" size="sm" className="w-full justify-start">
                <Presentation className="mr-2 h-4 w-4" />
                Quarterly Update.pptx
              </Button>
              <Button variant="ghost" size="sm" className="w-full justify-start">
                <BookOpen className="mr-2 h-4 w-4" />
                Research Notes.one
              </Button>
            </div>
          </ScrollArea>
        </aside>
      )}
      
      {/* Main content */}
      <main className="flex-1 overflow-auto">
        {!isDesktop && (
          <div className="p-4 border-b">
            <Link href="/documents">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
            </Link>
          </div>
        )}
        
        <div className="p-4 max-w-screen-xl mx-auto h-[calc(100%-4rem)]">
          <DocumentEditor 
            documentId={documentId}
            isNewDocument={isNewDocument}
            // Extract the document type from the URL query parameters if it's a new document
            defaultType={
              isNewDocument && typeof window !== 'undefined'
                ? (new URLSearchParams(window.location.search).get('type') as any) || 'word'
                : undefined
            }
          />
        </div>
      </main>
    </div>
  );
}