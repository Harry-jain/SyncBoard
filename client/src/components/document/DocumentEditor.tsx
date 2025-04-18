import { useState, useEffect } from "react";
import { X, Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight, List, ListOrdered, Image, Link, Table } from "lucide-react";
import PowerPointEditor from "./PowerPointEditor";
import WordEditor from "./WordEditor";
import OneNoteEditor from "./OneNoteEditor";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import UserAvatar from "@/components/ui/UserAvatar";
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { useQuery } from "@tanstack/react-query";

interface DocumentEditorProps {
  open: boolean;
  onClose: () => void;
  documentId: string;
  documentType: "powerpoint" | "word" | "onenote";
}

export default function DocumentEditor({ 
  open, 
  onClose, 
  documentId, 
  documentType 
}: DocumentEditorProps) {
  const [documentName, setDocumentName] = useState("");
  
  const { data: document, isLoading } = useQuery({
    queryKey: [`/api/documents/${documentId}`],
    enabled: open && !!documentId
  });
  
  const { data: comments = [] } = useQuery({
    queryKey: [`/api/documents/${documentId}/comments`],
    enabled: open && !!documentId
  });
  
  useEffect(() => {
    if (document) {
      setDocumentName(document.name);
    }
  }, [document]);
  
  if (!open) return null;
  
  if (isLoading) {
    return (
      <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="max-w-4xl h-[80vh]">
          <div className="animate-pulse space-y-4 w-full h-full">
            <div className="h-6 bg-neutral-200 rounded w-48"></div>
            <div className="h-full bg-neutral-100 rounded"></div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }
  
  return (
    <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-[80%] h-[80vh] p-0" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader className="border-b border-neutral-200 p-3 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <span className="material-icons text-neutral-600">
              {documentType === "powerpoint" ? "slideshow" : 
              documentType === "word" ? "description" : "event_note"}
            </span>
            <Input 
              value={documentName} 
              onChange={(e) => setDocumentName(e.target.value)} 
              className="font-medium max-w-xs" 
            />
            <div className="flex text-sm space-x-4 hidden sm:flex">
              <Button variant="ghost" size="sm">File</Button>
              <Button variant="ghost" size="sm">Home</Button>
              <Button variant="ghost" size="sm">Insert</Button>
              <Button variant="ghost" size="sm">Design</Button>
              {documentType === "powerpoint" && (
                <Button variant="ghost" size="sm">Transitions</Button>
              )}
              <Button variant="ghost" size="sm">View</Button>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5 text-neutral-600" />
          </Button>
        </DialogHeader>
        
        <div className="border-b border-neutral-200 p-2 flex items-center space-x-4">
          <div className="flex items-center space-x-1">
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <Bold className="h-4 w-4 text-neutral-600" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <Italic className="h-4 w-4 text-neutral-600" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <Underline className="h-4 w-4 text-neutral-600" />
            </Button>
          </div>
          <Separator orientation="vertical" className="h-6" />
          <div className="flex items-center space-x-1">
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <AlignLeft className="h-4 w-4 text-neutral-600" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <AlignCenter className="h-4 w-4 text-neutral-600" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <AlignRight className="h-4 w-4 text-neutral-600" />
            </Button>
          </div>
          <Separator orientation="vertical" className="h-6" />
          <div className="flex items-center space-x-1">
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <List className="h-4 w-4 text-neutral-600" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <ListOrdered className="h-4 w-4 text-neutral-600" />
            </Button>
          </div>
          <Separator orientation="vertical" className="h-6" />
          <div className="flex items-center space-x-1">
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <Image className="h-4 w-4 text-neutral-600" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <Link className="h-4 w-4 text-neutral-600" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <Table className="h-4 w-4 text-neutral-600" />
            </Button>
          </div>
        </div>
        
        <div className="flex-1 flex overflow-hidden">
          {documentType === "powerpoint" && <PowerPointEditor document={document} />}
          {documentType === "word" && <WordEditor document={document} />}
          {documentType === "onenote" && <OneNoteEditor document={document} />}
          
          {/* Comments Panel */}
          <div className="w-64 border-l border-neutral-200 bg-white overflow-y-auto">
            <div className="p-3 border-b border-neutral-200">
              <h3 className="font-semibold">Comments</h3>
            </div>
            {comments.length === 0 ? (
              <div className="p-3 text-center text-neutral-500 text-sm">
                No comments yet
              </div>
            ) : (
              comments.map((comment: any) => (
                <div key={comment.id} className="p-3 border-b border-neutral-200">
                  <div className="flex items-start mb-2">
                    <UserAvatar 
                      src={comment.user.avatar} 
                      name={comment.user.name} 
                      className="w-6 h-6 mr-2"
                    />
                    <div>
                      <div className="flex items-baseline">
                        <span className="font-medium text-xs mr-1">{comment.user.name}</span>
                        <span className="text-[10px] text-neutral-500">{new Date(comment.timestamp).toLocaleTimeString()}</span>
                      </div>
                      <p className="text-xs mt-1">{comment.content}</p>
                      <div className="flex items-center mt-1 space-x-2">
                        <Button variant="link" size="sm" className="h-4 p-0 text-[10px]">Reply</Button>
                        <Button variant="link" size="sm" className="h-4 p-0 text-[10px]">Resolve</Button>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
