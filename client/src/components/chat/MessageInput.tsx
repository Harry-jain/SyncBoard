import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { 
  Bold, 
  Paperclip, 
  SmilePlus, 
  Send, 
  MoreHorizontal,
  FileImage,
  Upload,
} from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface MessageInputProps {
  conversationId: string;
}

export default function MessageInput({ conversationId }: MessageInputProps) {
  const [message, setMessage] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();
  
  const sendMessageMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("POST", `/api/conversations/${conversationId}/messages`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/conversations/${conversationId}/messages`] });
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
    },
  });
  
  const handleSendMessage = () => {
    if (message.trim() === "") return;
    
    sendMessageMutation.mutate({ content: message });
    setMessage("");
  };
  
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };
  
  const handleAttachFile = () => {
    fileInputRef.current?.click();
  };
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // In a real app, you would upload the file to a server here
    // For now, we'll just add a message with an attachment object
    sendMessageMutation.mutate({
      content: "Attached file",
      attachment: {
        name: file.name,
        size: `${(file.size / 1024).toFixed(1)} KB`,
        type: file.type.split('/')[1].toUpperCase(),
      }
    });
    
    // Reset the file input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };
  
  return (
    <div className="bg-white border-t border-neutral-200 p-3">
      <div className="flex items-top">
        <div className="flex space-x-1 mb-2">
          <Button variant="ghost" size="sm" className="h-9 w-9 p-0" title="Format">
            <Bold className="h-5 w-5 text-neutral-600" />
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-9 w-9 p-0" 
            title="Attach"
            onClick={handleAttachFile}
          >
            <Paperclip className="h-5 w-5 text-neutral-600" />
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              onChange={handleFileChange} 
            />
          </Button>
          <Button variant="ghost" size="sm" className="h-9 w-9 p-0" title="Emoji">
            <SmilePlus className="h-5 w-5 text-neutral-600" />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-9 w-9 p-0" title="GIF">
                <span className="material-icons text-neutral-600">gif</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem className="flex items-center gap-2">
                <FileImage className="h-4 w-4" />
                <span>GIF Gallery</span>
              </DropdownMenuItem>
              <DropdownMenuItem className="flex items-center gap-2">
                <Upload className="h-4 w-4" />
                <span>Upload GIF</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      <div className="flex items-end">
        <div className="flex-1">
          <Textarea
            placeholder="Type a message"
            className="resize-none"
            rows={2}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
          />
        </div>
        <div className="ml-2 flex items-center space-x-1">
          <Button variant="ghost" size="icon" className="h-9 w-9">
            <MoreHorizontal className="h-5 w-5 text-neutral-600" />
          </Button>
          <Button 
            className="bg-primary text-white p-1.5 rounded-md hover:bg-secondary"
            size="icon"
            onClick={handleSendMessage}
            disabled={message.trim() === "" || sendMessageMutation.isPending}
          >
            <Send className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
