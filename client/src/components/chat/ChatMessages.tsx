import { useEffect, useRef } from "react";
import { format } from "date-fns";
import { useQuery } from "@tanstack/react-query";
import UserAvatar from "@/components/ui/UserAvatar";
import { File, Download } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ChatMessagesProps {
  conversationId: string;
}

export default function ChatMessages({ conversationId }: ChatMessagesProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const { data: messages = [], isLoading } = useQuery({
    queryKey: [`/api/conversations/${conversationId}/messages`],
  });
  
  const { data: currentUser } = useQuery({
    queryKey: ["/api/users/me"],
  });
  
  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (isLoading) {
    return (
      <div className="flex-1 overflow-y-auto p-4 bg-neutral-100 space-y-4">
        <div className="animate-pulse flex flex-col space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-start">
              <div className="rounded-full bg-neutral-200 h-8 w-8 mr-2"></div>
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-neutral-200 rounded w-32"></div>
                <div className="h-16 bg-white rounded-lg w-64"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 bg-neutral-100 space-y-4" id="chat-container">
      {messages.map((message: any, index: number) => {
        const isCurrentUser = message.userId === currentUser?.id;
        const showHeader = index === 0 || messages[index - 1].userId !== message.userId;
        const messageTime = new Date(message.timestamp);
        
        return (
          <div key={message.id} className="chat-message-container flex flex-col">
            <div className={`flex items-end mb-4 ${isCurrentUser ? 'justify-end' : ''}`}>
              {!isCurrentUser && (
                <UserAvatar 
                  src={message.user.avatar} 
                  name={message.user.name} 
                  className="mr-2"
                />
              )}
              <div className="max-w-md">
                {showHeader && (
                  <div className={`flex items-baseline mb-1 ${isCurrentUser ? 'justify-end' : ''}`}>
                    {isCurrentUser ? (
                      <>
                        <span className="text-xs text-neutral-500 mr-2">{format(messageTime, 'h:mm a')}</span>
                        <span className="font-medium text-sm">You</span>
                      </>
                    ) : (
                      <>
                        <span className="font-medium text-sm mr-2">{message.user.name}</span>
                        <span className="text-xs text-neutral-500">{format(messageTime, 'h:mm a')}</span>
                      </>
                    )}
                  </div>
                )}
                <div 
                  className={`${
                    isCurrentUser 
                      ? 'bg-primary text-white' 
                      : 'bg-white'
                  } p-3 rounded-lg shadow-sm`}
                >
                  {message.attachment ? (
                    <div className="flex items-center space-x-2 border border-neutral-200 rounded-md p-2 bg-neutral-50">
                      <File className="text-neutral-500" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{message.attachment.name}</p>
                        <p className="text-xs text-neutral-500">{message.attachment.size} • {message.attachment.type}</p>
                      </div>
                      <Button variant="ghost" size="sm">
                        <Download className="h-4 w-4 text-neutral-600" />
                      </Button>
                    </div>
                  ) : (
                    <p>{message.content}</p>
                  )}
                </div>
              </div>
              {isCurrentUser && (
                <UserAvatar 
                  src={currentUser.avatar} 
                  name={currentUser.name} 
                  className="ml-2"
                />
              )}
            </div>
          </div>
        );
      })}
      <div ref={messagesEndRef} />
    </div>
  );
}
