import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { 
  Send, 
  Smile, 
  Paperclip, 
  MoreVertical,
  Users,
  MessageSquare
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface ChatMessage {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  content: string;
  timestamp: Date;
  type: 'text' | 'emoji' | 'file' | 'system';
  isOwn?: boolean;
}

interface CallChatProps {
  messages: ChatMessage[];
  onSendMessage: (content: string) => void;
  onSendEmoji: (emoji: string) => void;
  onSendFile: (file: File) => void;
  participants: Array<{
    id: string;
    name: string;
    avatar?: string;
    isOnline: boolean;
  }>;
  className?: string;
}

const EMOJIS = ['😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '😊', '😇', '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘', '😗', '😙', '😚', '😋', '😛', '😝', '😜', '🤪', '🤨', '🧐', '🤓', '😎', '🤩', '🥳', '😏', '😒', '😞', '😔', '😟', '😕', '🙁', '☹️', '😣', '😖', '😫', '😩', '🥺', '😢', '😭', '😤', '😠', '😡', '🤬', '🤯', '😳', '🥵', '🥶', '😱', '😨', '😰', '😥', '😓', '🤗', '🤔', '🤭', '🤫', '🤥', '😶', '😐', '😑', '😬', '🙄', '😯', '😦', '😧', '😮', '😲', '🥱', '😴', '🤤', '😪', '😵', '🤐', '🥴', '🤢', '🤮', '🤧', '😷', '🤒', '🤕', '🤑', '🤠', '😈', '👿', '👹', '👺', '🤡', '💩', '👻', '💀', '☠️', '👽', '👾', '🤖', '🎃', '😺', '😸', '😹', '😻', '😼', '😽', '🙀', '😿', '😾'];

export default function CallChat({
  messages,
  onSendMessage,
  onSendEmoji,
  onSendFile,
  participants,
  className = ''
}: CallChatProps) {
  const [message, setMessage] = useState('');
  const [showEmojis, setShowEmojis] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = () => {
    if (message.trim()) {
      onSendMessage(message.trim());
      setMessage('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleEmojiClick = (emoji: string) => {
    onSendEmoji(emoji);
    setShowEmojis(false);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onSendFile(file);
    }
  };

  const handleTyping = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMessage(e.target.value);
    
    // In a real implementation, you would send typing indicators
    if (!isTyping) {
      setIsTyping(true);
      // Send typing start signal
    }
    
    // Clear typing indicator after 3 seconds
    setTimeout(() => {
      setIsTyping(false);
      // Send typing stop signal
    }, 3000);
  };

  const renderMessage = (msg: ChatMessage) => {
    if (msg.type === 'system') {
      return (
        <div key={msg.id} className="flex justify-center my-2">
          <Badge variant="secondary" className="text-xs">
            {msg.content}
          </Badge>
        </div>
      );
    }

    return (
      <div
        key={msg.id}
        className={`flex items-start space-x-2 mb-3 ${
          msg.isOwn ? 'flex-row-reverse space-x-reverse' : ''
        }`}
      >
        <Avatar className="h-8 w-8 flex-shrink-0">
          <AvatarImage src={msg.userAvatar} />
          <AvatarFallback>{msg.userName.charAt(0)}</AvatarFallback>
        </Avatar>
        
        <div className={`flex flex-col max-w-xs ${msg.isOwn ? 'items-end' : 'items-start'}`}>
          <div
            className={`px-3 py-2 rounded-lg ${
              msg.isOwn
                ? 'bg-blue-500 text-white'
                : 'bg-gray-200 text-gray-900'
            }`}
          >
            {msg.type === 'emoji' ? (
              <span className="text-2xl">{msg.content}</span>
            ) : (
              <p className="text-sm">{msg.content}</p>
            )}
          </div>
          <span className="text-xs text-gray-500 mt-1">
            {formatDistanceToNow(msg.timestamp, { addSuffix: true })}
          </span>
        </div>
      </div>
    );
  };

  return (
    <div className={`flex flex-col h-full bg-white border-l border-gray-200 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <div className="flex items-center space-x-2">
          <MessageSquare className="h-5 w-5 text-gray-600" />
          <h3 className="font-semibold text-gray-900">Chat</h3>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant="outline" className="text-xs">
            {participants.length} online
          </Badge>
          <Button size="icon" variant="ghost" className="h-8 w-8">
            <MoreVertical className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Participants */}
      <div className="p-3 border-b border-gray-200">
        <div className="flex items-center space-x-2 mb-2">
          <Users className="h-4 w-4 text-gray-600" />
          <span className="text-sm font-medium text-gray-700">Participants</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {participants.map(participant => (
            <div
              key={participant.id}
              className="flex items-center space-x-1 bg-gray-100 rounded-full px-2 py-1"
            >
              <div className={`h-2 w-2 rounded-full ${
                participant.isOnline ? 'bg-green-400' : 'bg-gray-400'
              }`} />
              <span className="text-xs text-gray-700">{participant.name}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-2">
          {messages.map(renderMessage)}
          {typingUsers.length > 0 && (
            <div className="flex items-center space-x-2 text-sm text-gray-500">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
              </div>
              <span>{typingUsers.join(', ')} is typing...</span>
            </div>
          )}
        </div>
        <div ref={messagesEndRef} />
      </ScrollArea>

      {/* Emoji picker */}
      {showEmojis && (
        <div className="p-4 border-t border-gray-200">
          <div className="grid grid-cols-8 gap-2 max-h-32 overflow-y-auto">
            {EMOJIS.map(emoji => (
              <button
                key={emoji}
                onClick={() => handleEmojiClick(emoji)}
                className="text-2xl hover:bg-gray-100 rounded p-1"
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="p-4 border-t border-gray-200">
        <div className="flex items-center space-x-2">
          <Button
            size="icon"
            variant="ghost"
            onClick={() => setShowEmojis(!showEmojis)}
            className="h-8 w-8"
          >
            <Smile className="h-4 w-4" />
          </Button>
          
          <Button
            size="icon"
            variant="ghost"
            onClick={() => fileInputRef.current?.click()}
            className="h-8 w-8"
          >
            <Paperclip className="h-4 w-4" />
          </Button>
          
          <Input
            value={message}
            onChange={handleTyping}
            onKeyPress={handleKeyPress}
            placeholder="Type a message..."
            className="flex-1"
          />
          
          <Button
            onClick={handleSendMessage}
            disabled={!message.trim()}
            size="icon"
            className="h-8 w-8"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
        
        <input
          ref={fileInputRef}
          type="file"
          onChange={handleFileSelect}
          className="hidden"
          accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.txt"
        />
      </div>
    </div>
  );
}