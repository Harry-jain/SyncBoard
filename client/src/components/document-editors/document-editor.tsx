import React, { useState, useEffect } from 'react';
import { Document } from '@shared/schema';
import { PowerPointEditor } from './powerpoint-editor';
import { WordEditor } from './word-editor';
import { OneNoteEditor } from './onenote-editor';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { useParams, useLocation } from 'wouter';
import { Loader2 } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

interface DocumentEditorProps {
  documentId?: number;
  defaultType?: 'powerpoint' | 'word' | 'onenote';
  onSave?: (document: Document) => void;
  isNewDocument?: boolean;
}

export function DocumentEditor({ 
  documentId, 
  defaultType = 'word', 
  onSave,
  isNewDocument = false 
}: DocumentEditorProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  
  // Fetch the document if an ID is provided
  const { 
    data: document, 
    isLoading,
    error 
  } = useQuery<Document>({
    queryKey: ['/api/documents', documentId],
    queryFn: async () => {
      if (!documentId && !isNewDocument) return null;
      
      if (isNewDocument) {
        // Return a new document template
        return {
          id: 0,
          name: 'Untitled Document',
          type: defaultType,
          content: '',
          slides: [],
          sections: [],
          ownerId: 0,
          size: '0 KB',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        } as Document;
      }
      
      const response = await fetch(`/api/documents/${documentId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch document');
      }
      return response.json();
    },
    enabled: !!documentId || isNewDocument
  });
  
  // Save document mutation
  const saveMutation = useMutation({
    mutationFn: async (updatedDocument: Partial<Document>) => {
      if (isNewDocument || !documentId) {
        // Create a new document
        const response = await apiRequest('POST', '/api/documents', {
          ...document,
          ...updatedDocument
        });
        return response.json();
      } else {
        // Update existing document
        const response = await apiRequest('PATCH', `/api/documents/${documentId}`, updatedDocument);
        return response.json();
      }
    },
    onSuccess: (savedDocument) => {
      // Invalidate the document query to get fresh data
      queryClient.invalidateQueries({ queryKey: ['/api/documents', documentId] });
      queryClient.invalidateQueries({ queryKey: ['/api/documents'] });
      
      toast({
        title: 'Document saved',
        description: 'Your document has been saved successfully.'
      });
      
      // If this is a new document, redirect to the edit page for the new document
      if (isNewDocument && savedDocument?.id) {
        setLocation(`/documents/${savedDocument.id}`);
      }
      
      if (onSave) {
        onSave(savedDocument);
      }
    },
    onError: (error) => {
      toast({
        title: 'Error saving document',
        description: error.message || 'An error occurred while saving the document.',
        variant: 'destructive'
      });
    }
  });
  
  // Handle saving the document
  const handleSave = (updates: Partial<Document>) => {
    if (!document) return;
    
    saveMutation.mutate({
      ...updates,
      updatedAt: new Date().toISOString()
    });
  };
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[300px] text-center">
        <h3 className="text-lg font-medium text-destructive">Error loading document</h3>
        <p className="text-muted-foreground">{error.message || 'An error occurred while loading the document.'}</p>
      </div>
    );
  }
  
  if (!document) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[300px] text-center">
        <h3 className="text-lg font-medium">Document not found</h3>
        <p className="text-muted-foreground">The requested document could not be found.</p>
      </div>
    );
  }
  
  // Render the appropriate editor based on document type
  const renderEditor = () => {
    switch (document.type) {
      case 'powerpoint':
        return <PowerPointEditor document={document} onSave={handleSave} />;
      case 'word':
        return <WordEditor document={document} onSave={handleSave} />;
      case 'onenote':
        return <OneNoteEditor document={document} onSave={handleSave} />;
      default:
        return <WordEditor document={document} onSave={handleSave} />;
    }
  };
  
  return (
    <div className="h-full flex flex-col">
      {renderEditor()}
    </div>
  );
}