import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Search, Plus, Filter, Grid, List, MoreHorizontal } from "lucide-react";
import Sidebar from "@/components/layout/Sidebar";
import DocumentEditor from "@/components/document/DocumentEditor";

// Define file interface
interface File {
  id: string;
  name: string;
  type: string;
  owner: string;
  modified: string;
  size?: string;
}

export default function Files() {
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [documentEditor, setDocumentEditor] = useState({
    open: false,
    documentId: "",
    documentType: "powerpoint" as "powerpoint" | "word" | "onenote"
  });
  
  const { data: files = [], isLoading } = useQuery<File[]>({
    queryKey: ["/api/files"],
  });
  
  useEffect(() => {
    document.title = "SyncBoard - Files";
  }, []);
  
  const filteredFiles = files.filter((file: any) => 
    file.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    file.owner.toLowerCase().includes(searchTerm.toLowerCase()) ||
    file.type.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  const handleFileClick = (fileId: string, fileType: string) => {
    setDocumentEditor({
      open: true,
      documentId: fileId,
      documentType: fileType as "powerpoint" | "word" | "onenote"
    });
  };
  
  return (
    <>
      <Sidebar title="Files" type="files" />
      <main className="flex-1 overflow-auto p-6">
        <div className="flex justify-between items-center mb-6 flex-wrap gap-4">
          <h1 className="text-2xl font-bold">Files</h1>
          <div className="flex items-center space-x-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-neutral-400" />
              <Input
                placeholder="Search files"
                className="pl-8 w-[250px]"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Button variant="outline" size="icon">
              <Filter className="h-4 w-4" />
            </Button>
            <div className="border rounded-md flex">
              <Button 
                variant={viewMode === "grid" ? "default" : "ghost"} 
                size="icon" 
                className="rounded-none"
                onClick={() => setViewMode("grid")}
              >
                <Grid className="h-4 w-4" />
              </Button>
              <Button 
                variant={viewMode === "list" ? "default" : "ghost"} 
                size="icon" 
                className="rounded-none"
                onClick={() => setViewMode("list")}
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New
            </Button>
          </div>
        </div>
        
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {Array(12).fill(0).map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-4">
                  <div className="h-6 bg-neutral-200 rounded w-24 mb-2"></div>
                  <div className="h-4 bg-neutral-200 rounded w-16"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredFiles.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-neutral-500 mb-4">No files found</p>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Upload File
            </Button>
          </div>
        ) : viewMode === "grid" ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredFiles.map((file: any) => (
              <Card 
                key={file.id} 
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => handleFileClick(
                  file.id, 
                  file.type === "PowerPoint" ? "powerpoint" : 
                  file.type === "Word" ? "word" : "onenote"
                )}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center">
                      <span className="material-icons text-neutral-500 mr-2">
                        {file.type === "PowerPoint" ? "slideshow" : 
                        file.type === "Word" ? "description" : "event_note"}
                      </span>
                      <span className="font-medium truncate">{file.name}</span>
                    </div>
                    <Button variant="ghost" size="icon" className="h-6 w-6">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="text-xs text-neutral-500">
                    {file.modified} • {file.owner}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {filteredFiles.map((file: any) => (
              <div 
                key={file.id} 
                className="flex items-center justify-between p-3 border rounded-md hover:bg-neutral-50 cursor-pointer"
                onClick={() => handleFileClick(
                  file.id, 
                  file.type === "PowerPoint" ? "powerpoint" : 
                  file.type === "Word" ? "word" : "onenote"
                )}
              >
                <div className="flex items-center flex-1">
                  <span className="material-icons text-neutral-500 mr-3">
                    {file.type === "PowerPoint" ? "slideshow" : 
                    file.type === "Word" ? "description" : "event_note"}
                  </span>
                  <div className="min-w-0">
                    <p className="font-medium truncate">{file.name}</p>
                    <p className="text-xs text-neutral-500">{file.type} • {file.size}</p>
                  </div>
                </div>
                <div className="text-sm text-neutral-500 w-32 truncate">{file.owner}</div>
                <div className="text-sm text-neutral-500 w-32">{file.modified}</div>
                <Button variant="ghost" size="icon">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </main>
      
      <DocumentEditor 
        open={documentEditor.open}
        onClose={() => setDocumentEditor({ ...documentEditor, open: false })}
        documentId={documentEditor.documentId}
        documentType={documentEditor.documentType}
      />
    </>
  );
}
