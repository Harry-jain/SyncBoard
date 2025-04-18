import { Button } from "@/components/ui/button";
import UserAvatar from "@/components/ui/UserAvatar";
import { Video, Phone, MoreHorizontal } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

interface ChatHeaderProps {
  conversationId: string;
}

export default function ChatHeader({ conversationId }: ChatHeaderProps) {
  const { data: conversation, isLoading } = useQuery({
    queryKey: [`/api/conversations/${conversationId}`],
  });

  if (isLoading) {
    return (
      <div className="bg-white border-b border-neutral-200 p-3 flex items-center justify-between h-16">
        <div className="animate-pulse flex items-center space-x-3">
          <div className="rounded-full bg-neutral-200 h-8 w-8"></div>
          <div className="space-y-2">
            <div className="h-4 bg-neutral-200 rounded w-32"></div>
            <div className="h-3 bg-neutral-200 rounded w-16"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!conversation) {
    return (
      <div className="bg-white border-b border-neutral-200 p-3 flex items-center justify-between h-16">
        <div>Conversation not found</div>
      </div>
    );
  }

  return (
    <div className="bg-white border-b border-neutral-200 p-3 flex items-center justify-between">
      <div className="flex items-center space-x-3">
        <div className="flex items-center">
          <UserAvatar 
            src={conversation.avatar} 
            name={conversation.name} 
            status={conversation.status} 
          />
        </div>
        <div>
          <h2 className="font-semibold text-neutral-800">{conversation.name}</h2>
          <p className="text-xs text-neutral-500">
            {conversation.status === 'available' ? 'Available' : 
             conversation.status === 'busy' ? 'Busy' : 
             conversation.status === 'away' ? 'Away' : 'Offline'}
          </p>
        </div>
      </div>
      <div className="flex items-center space-x-2">
        <Button variant="ghost" size="icon" className="h-9 w-9">
          <Video className="h-5 w-5 text-neutral-600" />
        </Button>
        <Button variant="ghost" size="icon" className="h-9 w-9">
          <Phone className="h-5 w-5 text-neutral-600" />
        </Button>
        <Button variant="ghost" size="icon" className="h-9 w-9">
          <MoreHorizontal className="h-5 w-5 text-neutral-600" />
        </Button>
      </div>
    </div>
  );
}
