import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Document } from '@shared/schema';
import { Link } from 'wouter';
import {
  FileText,
  Presentation,
  BookOpen,
  Search,
  PlusCircle,
  Filter,
  ArrowDownAZ,
  ArrowDownZA,
  Clock,
  Loader2,
  MoreHorizontal,
  Trash2,
  Copy,
  Share2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { formatDistanceToNow } from 'date-fns';

export default function DocumentListPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'name-asc' | 'name-desc'>('newest');
  const [filter, setFilter] = useState<'all' | 'word' | 'powerpoint' | 'onenote'>('all');
  
  // Set document title when component mounts
  useEffect(() => {
    document.title = "SyncBoard - Documents";
  }, []);
  
  const { data: documents, isLoading, error } = useQuery<Document[]>({
    queryKey: ['/api/documents'],
    queryFn: async () => {
      const response = await fetch('/api/documents');
      if (!response.ok) {
        throw new Error('Failed to fetch documents');
      }
      return response.json();
    }
  });
  
  const getDocumentIcon = (type: string) => {
    switch (type) {
      case 'word':
        return <FileText className="h-5 w-5 text-blue-500" />;
      case 'powerpoint':
        return <Presentation className="h-5 w-5 text-orange-500" />;
      case 'onenote':
        return <BookOpen className="h-5 w-5 text-purple-500" />;
      default:
        return <FileText className="h-5 w-5" />;
    }
  };
  
  const getDocumentColorClass = (type: string) => {
    switch (type) {
      case 'word':
        return 'border-blue-200 bg-blue-50 dark:bg-blue-950 dark:border-blue-900';
      case 'powerpoint':
        return 'border-orange-200 bg-orange-50 dark:bg-orange-950 dark:border-orange-900';
      case 'onenote':
        return 'border-purple-200 bg-purple-50 dark:bg-purple-950 dark:border-purple-900';
      default:
        return 'border-gray-200 bg-gray-50 dark:bg-gray-950 dark:border-gray-900';
    }
  };
  
  const formatDate = (date: Date | string) => {
    try {
      const dateObj = date instanceof Date ? date : new Date(date);
      return formatDistanceToNow(dateObj, { addSuffix: true });
    } catch (error) {
      return 'Invalid date';
    }
  };
  
  const filteredDocuments = documents
    ? documents.filter(doc => {
        // Apply type filter
        if (filter !== 'all' && doc.type !== filter) {
          return false;
        }
        
        // Apply search query
        if (searchQuery && !doc.name.toLowerCase().includes(searchQuery.toLowerCase())) {
          return false;
        }
        
        return true;
      })
    : [];
    
  const sortedDocuments = [...filteredDocuments].sort((a, b) => {
    switch (sortBy) {
      case 'newest':
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      case 'oldest':
        return new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
      case 'name-asc':
        return a.name.localeCompare(b.name);
      case 'name-desc':
        return b.name.localeCompare(a.name);
      default:
        return 0;
    }
  });
  
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <h2 className="text-xl font-semibold text-destructive mb-2">Error loading documents</h2>
        <p className="text-muted-foreground">{error.message || 'An error occurred'}</p>
      </div>
    );
  }
  
  return (
    <div className="container py-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">Documents</h1>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" />
              New Document
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <Link href="/document/new?type=word">
              <DropdownMenuItem>
                <FileText className="mr-2 h-4 w-4 text-blue-500" />
                Word Document
              </DropdownMenuItem>
            </Link>
            <Link href="/document/new?type=powerpoint">
              <DropdownMenuItem>
                <Presentation className="mr-2 h-4 w-4 text-orange-500" />
                PowerPoint Presentation
              </DropdownMenuItem>
            </Link>
            <Link href="/document/new?type=onenote">
              <DropdownMenuItem>
                <BookOpen className="mr-2 h-4 w-4 text-purple-500" />
                OneNote Notebook
              </DropdownMenuItem>
            </Link>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search documents..."
            className="pl-9"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline">
              <Filter className="mr-2 h-4 w-4" />
              Filter
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setFilter('all')} className={filter === 'all' ? 'bg-secondary' : ''}>
              All Types
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setFilter('word')} className={filter === 'word' ? 'bg-secondary' : ''}>
              <FileText className="mr-2 h-4 w-4 text-blue-500" />
              Word Documents
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setFilter('powerpoint')} className={filter === 'powerpoint' ? 'bg-secondary' : ''}>
              <Presentation className="mr-2 h-4 w-4 text-orange-500" />
              PowerPoint Presentations
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setFilter('onenote')} className={filter === 'onenote' ? 'bg-secondary' : ''}>
              <BookOpen className="mr-2 h-4 w-4 text-purple-500" />
              OneNote Notebooks
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline">
              {sortBy === 'newest' || sortBy === 'oldest' ? (
                <Clock className="mr-2 h-4 w-4" />
              ) : sortBy === 'name-asc' ? (
                <ArrowDownAZ className="mr-2 h-4 w-4" />
              ) : (
                <ArrowDownZA className="mr-2 h-4 w-4" />
              )}
              Sort
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setSortBy('newest')} className={sortBy === 'newest' ? 'bg-secondary' : ''}>
              <Clock className="mr-2 h-4 w-4" />
              Newest First
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setSortBy('oldest')} className={sortBy === 'oldest' ? 'bg-secondary' : ''}>
              <Clock className="mr-2 h-4 w-4" />
              Oldest First
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setSortBy('name-asc')} className={sortBy === 'name-asc' ? 'bg-secondary' : ''}>
              <ArrowDownAZ className="mr-2 h-4 w-4" />
              Name (A-Z)
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setSortBy('name-desc')} className={sortBy === 'name-desc' ? 'bg-secondary' : ''}>
              <ArrowDownZA className="mr-2 h-4 w-4" />
              Name (Z-A)
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      
      {isLoading ? (
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : sortedDocuments.length === 0 ? (
        <div className="flex flex-col items-center justify-center min-h-[300px] border rounded-lg p-8 text-center">
          <div className="flex flex-col items-center mb-4">
            <FileText className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-xl font-medium mb-2">No documents found</h3>
            <p className="text-muted-foreground mb-6">
              {searchQuery || filter !== 'all'
                ? 'Try adjusting your search or filters'
                : 'Create your first document to get started'}
            </p>
            
            {!(searchQuery || filter !== 'all') && (
              <div className="flex gap-4">
                <Link href="/document/new?type=word">
                  <Button>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Create New Document
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {sortedDocuments.map((doc) => (
            <Link key={doc.id} href={`/document/${doc.id}`}>
              <Card className="cursor-pointer h-full transition-all hover:shadow-md">
                <CardHeader className={`${getDocumentColorClass(doc.type)} rounded-t-lg py-4`}>
                  <div className="flex justify-between items-center">
                    {getDocumentIcon(doc.type)}
                    <TooltipProvider>
                      <DropdownMenu>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                              <Button size="icon" variant="ghost" className="h-8 w-8">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Options</p>
                          </TooltipContent>
                        </Tooltip>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>
                            <Share2 className="mr-2 h-4 w-4" />
                            Share
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Copy className="mr-2 h-4 w-4" />
                            Duplicate
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive">
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TooltipProvider>
                  </div>
                </CardHeader>
                <CardContent className="pt-4">
                  <CardTitle className="truncate text-lg">{doc.name}</CardTitle>
                  <CardDescription className="truncate">
                    {doc.type.charAt(0).toUpperCase() + doc.type.slice(1)} • {doc.size || '0 KB'}
                  </CardDescription>
                </CardContent>
                <CardFooter className="text-xs text-muted-foreground">
                  Last modified {formatDate(doc.updatedAt)}
                </CardFooter>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}