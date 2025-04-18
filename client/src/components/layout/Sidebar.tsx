import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import UserAvatar from "@/components/ui/UserAvatar";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useParams } from "wouter";

interface SidebarProps {
  title: string;
  type: "chat" | "teams" | "files";
}

export default function Sidebar({ title, type }: SidebarProps) {
  const { id } = useParams();
  const [searchTerm, setSearchTerm] = useState("");

  const { data: items = [], isLoading } = useQuery({
    queryKey: [type === "chat" ? "/api/conversations" : type === "teams" ? "/api/teams" : "/api/files"],
  });

  const filteredItems = items.filter((item: any) => 
    item.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.lastMessage?.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  return (
    <aside className="w-64 bg-neutral-100 border-r border-neutral-200 flex-shrink-0 flex flex-col overflow-hidden mobile-hidden">
      <div className="p-3 border-b border-neutral-200">
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-semibold">{title}</h2>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
            <span className="material-icons text-neutral-500 text-lg">add</span>
          </Button>
        </div>
        <div className="relative">
          <Input
            type="text"
            placeholder={type === "chat" ? "Search conversations" : type === "teams" ? "Search teams" : "Search files"}
            className="pl-8 pr-4 py-1.5 text-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <span className="material-icons text-neutral-400 absolute left-2 top-1.5 text-sm">search</span>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="p-4 text-center text-neutral-500">Loading...</div>
        ) : filteredItems.length === 0 ? (
          <div className="p-4 text-center text-neutral-500">No {type} found</div>
        ) : (
          filteredItems.map((item: any) => (
            <SidebarItem 
              key={item.id} 
              item={item} 
              type={type} 
              isActive={id === item.id.toString()}
            />
          ))
        )}
      </div>
    </aside>
  );
}

interface SidebarItemProps {
  item: any;
  type: "chat" | "teams" | "files";
  isActive: boolean;
}

function SidebarItem({ item, type, isActive }: SidebarItemProps) {
  const [, setLocation] = useLocation();
  
  const getTimeString = (timestamp: string) => {
    const date = new Date(timestamp);
    const today = new Date();
    
    if (date.toDateString() === today.toDateString()) {
      return format(date, 'h:mm a');
    } else if (date.getTime() > today.getTime() - 86400000) {
      return 'Yesterday';
    } else {
      return format(date, 'MM/dd/yyyy');
    }
  };
  
  const handleClick = () => {
    if (type === "chat") {
      setLocation(`/chat/${item.id}`);
    } else if (type === "teams") {
      setLocation(`/teams/${item.id}`);
    } else {
      setLocation(`/files/${item.id}`);
    }
  };
  
  return (
    <div 
      className={cn(
        "p-2 cursor-pointer",
        isActive ? "bg-primary bg-opacity-10 border-l-2 border-primary" : "hover:bg-neutral-200"
      )}
      onClick={handleClick}
    >
      <div className="flex items-center space-x-2">
        <div className="relative">
          {item.avatar ? (
            <UserAvatar src={item.avatar} name={item.name} status={item.status} />
          ) : (
            <div className={cn(
              "w-8 h-8 rounded-full flex items-center justify-center text-white font-medium",
              isActive ? "bg-primary" : "bg-accent"
            )}>
              {item.name.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase()}
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-center">
            <p className="font-medium text-sm truncate">{item.name}</p>
            <span className="text-xs text-neutral-500">
              {getTimeString(item.timestamp)}
            </span>
          </div>
          <p className="text-xs text-neutral-500 truncate">{item.lastMessage}</p>
        </div>
      </div>
    </div>
  );
}
