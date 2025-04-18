import { useEffect, useState } from "react";
import { useParams } from "wouter";
import Sidebar from "@/components/layout/Sidebar";
import ChatHeader from "@/components/chat/ChatHeader";
import ChatMessages from "@/components/chat/ChatMessages";
import MessageInput from "@/components/chat/MessageInput";
import { useQuery } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import DocumentEditor from "@/components/document/DocumentEditor";
import { Document } from "@/lib/types";

export default function Chat() {
  const { id } = useParams();
  const [documentEditor, setDocumentEditor] = useState({
    open: false,
    documentId: "",
    documentType: "powerpoint" as "powerpoint" | "word" | "onenote"
  });
  
  const { data: documents = [] } = useQuery<Document[]>({
    queryKey: [id ? `/api/conversations/${id}/documents` : null],
    enabled: !!id
  });
  
  useEffect(() => {
    document.title = id ? "SyncBoard - Chat" : "SyncBoard - Conversations";
  }, [id]);
  
  if (!id) {
    return (
      <>
        <Sidebar title="Chat" type="chat" />
        <main className="flex-1 flex flex-col items-center justify-center bg-neutral-100">
          <div className="text-center max-w-md px-4">
            <h2 className="text-xl font-semibold mb-2">Select a conversation</h2>
            <p className="text-neutral-500">
              Choose a conversation from the sidebar to start chatting
            </p>
          </div>
        </main>
      </>
    );
  }
  
  const handleDocumentClick = (documentId: string, documentType: "powerpoint" | "word" | "onenote") => {
    setDocumentEditor({
      open: true,
      documentId,
      documentType
    });
  };
  
  return (
    <>
      <Sidebar title="Chat" type="chat" />
      <main className="flex-1 flex flex-col overflow-hidden">
        <ChatHeader conversationId={id} />
        
        <Tabs defaultValue="chat" className="w-full">
          <div className="bg-white border-b border-neutral-200 px-4">
            <TabsList className="bg-transparent p-0">
              <TabsTrigger 
                value="chat" 
                className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none data-[state=active]:bg-transparent rounded-none px-4 py-2"
              >
                Chat
              </TabsTrigger>
              <TabsTrigger 
                value="files" 
                className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none data-[state=active]:bg-transparent rounded-none px-4 py-2"
              >
                Files
              </TabsTrigger>
              <TabsTrigger 
                value="onenote" 
                className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none data-[state=active]:bg-transparent rounded-none px-4 py-2"
              >
                OneNote
              </TabsTrigger>
              <TabsTrigger 
                value="organization" 
                className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none data-[state=active]:bg-transparent rounded-none px-4 py-2"
              >
                Organization
              </TabsTrigger>
            </TabsList>
          </div>
          
          <TabsContent value="chat" className="flex-1 flex flex-col overflow-hidden m-0 data-[state=inactive]:hidden">
            <ChatMessages conversationId={id} />
            <MessageInput conversationId={id} />
          </TabsContent>
          
          <TabsContent value="files" className="flex-1 overflow-auto p-4 m-0 data-[state=inactive]:hidden">
            <h2 className="text-lg font-semibold mb-4">Shared Files</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {documents.length === 0 ? (
                <div className="col-span-full text-center py-8 text-neutral-500">
                  No files shared in this conversation
                </div>
              ) : (
                documents.map((doc: any) => (
                  <div 
                    key={doc.id}
                    className="border border-neutral-200 rounded-md p-3 cursor-pointer hover:border-primary"
                    onClick={() => handleDocumentClick(
                      doc.id, 
                      doc.type === "powerpoint" ? "powerpoint" : 
                      doc.type === "word" ? "word" : "onenote"
                    )}
                  >
                    <div className="flex items-center space-x-3">
                      <span className="material-icons text-neutral-500">
                        {doc.type === "powerpoint" ? "slideshow" : 
                        doc.type === "word" ? "description" : "event_note"}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{doc.name}</p>
                        <p className="text-xs text-neutral-500">
                          {doc.size} • {
                            doc.type === "powerpoint" ? "PowerPoint" : 
                            doc.type === "word" ? "Word" : "OneNote"
                          }
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="onenote" className="flex-1 overflow-auto p-4 m-0 data-[state=inactive]:hidden">
            <h2 className="text-lg font-semibold mb-4">OneNote Notebooks</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {documents.filter((doc: any) => doc.type === "onenote").length === 0 ? (
                <div className="col-span-full text-center py-8 text-neutral-500">
                  No OneNote notebooks in this conversation
                </div>
              ) : (
                documents
                  .filter((doc: any) => doc.type === "onenote")
                  .map((doc: any) => (
                    <div 
                      key={doc.id}
                      className="border border-neutral-200 rounded-md p-3 cursor-pointer hover:border-primary"
                      onClick={() => handleDocumentClick(doc.id, "onenote")}
                    >
                      <div className="flex items-center space-x-3">
                        <span className="material-icons text-neutral-500">event_note</span>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{doc.name}</p>
                          <p className="text-xs text-neutral-500">{doc.size} • OneNote</p>
                        </div>
                      </div>
                    </div>
                  ))
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="organization" className="flex-1 overflow-auto p-4 m-0 data-[state=inactive]:hidden">
            <h2 className="text-lg font-semibold mb-4">Organization</h2>
            <p className="text-neutral-500">
              This tab can be used to organize content, assign tasks, or manage projects within this conversation.
            </p>
          </TabsContent>
        </Tabs>
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
