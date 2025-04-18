import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { User } from "@/lib/types";
import { getQueryFn } from "@/lib/queryClient";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger 
} from "@/components/ui/dialog";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue 
} from "@/components/ui/select";
import { 
  Card, 
  CardContent, 
  CardHeader 
} from "@/components/ui/card";
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from "@/components/ui/tabs";
import { 
  Button 
} from "@/components/ui/button";
import { 
  Input 
} from "@/components/ui/input";
import { 
  Avatar, 
  AvatarFallback, 
  AvatarImage 
} from "@/components/ui/avatar";
import { 
  Search, 
  Mail, 
  Phone, 
  Video, 
  MessageSquare, 
  UserPlus 
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";

export function UserSearch() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  // Fetch all users
  const { data: users, isLoading } = useQuery<User[]>({
    queryKey: ["/api/users"],
    queryFn: getQueryFn({ on401: "throw" }),
  });

  // Filter users based on search query and role
  const filteredUsers = users?.filter((u) => {
    // Don't show current user in search results
    if (user?.id === u.id) return false;
    
    // Filter by role if selected
    if (selectedRole && u.role !== selectedRole) return false;
    
    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        u.name.toLowerCase().includes(query) ||
        u.username.toLowerCase().includes(query) ||
        (u.email && u.email.toLowerCase().includes(query))
      );
    }
    
    return true;
  });

  // Function to start a conversation with a user
  const startConversation = async (targetUser: User) => {
    try {
      // Create or get existing conversation
      const response = await fetch("/api/conversations/direct", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          participantId: targetUser.id,
        }),
      });
      
      if (!response.ok) throw new Error("Failed to start conversation");
      
      const conversation = await response.json();
      
      // Redirect to the conversation
      window.location.href = `/chat?conversationId=${conversation.id}`;
      
      toast({
        title: "Conversation started",
        description: `You can now chat with ${targetUser.name}`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to start conversation",
        variant: "destructive",
      });
    }
  };

  // Function to initiate email
  const sendEmail = (targetUser: User) => {
    if (targetUser.email) {
      window.location.href = `mailto:${targetUser.email}`;
    } else {
      toast({
        title: "Error",
        description: "User doesn't have an email address",
        variant: "destructive",
      });
    }
  };

  // Function to initiate a voice call
  const startVoiceCall = (targetUser: User) => {
    toast({
      title: "Voice call",
      description: `Initiating voice call with ${targetUser.name}...`,
    });
    // This would be connected to a WebRTC service in a full implementation
  };

  // Function to initiate a video call
  const startVideoCall = (targetUser: User) => {
    toast({
      title: "Video call",
      description: `Initiating video call with ${targetUser.name}...`,
    });
    // This would be connected to a WebRTC service in a full implementation
  };

  // Function to add a user to contacts
  const addToContacts = (targetUser: User) => {
    toast({
      title: "Contact added",
      description: `${targetUser.name} has been added to your contacts`,
    });
    // In a full implementation, this would make an API call to save the contact
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Search className="h-4 w-4" />
          <span>Find People</span>
        </Button>
      </DialogTrigger>
      
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Find People</DialogTitle>
          <DialogDescription>
            Search for students, teachers and collaborators
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <Input 
                placeholder="Search by name, username or email..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full"
              />
            </div>
            <Select onValueChange={(value) => setSelectedRole(value)}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="student">Students</SelectItem>
                <SelectItem value="teacher">Teachers</SelectItem>
                {user?.role === "super_admin" && (
                  <SelectItem value="super_admin">Administrators</SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>
          
          <Tabs defaultValue="all">
            <TabsList className="w-full justify-start">
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="recent">Recent</TabsTrigger>
              <TabsTrigger value="contacts">Contacts</TabsTrigger>
            </TabsList>
            
            <TabsContent value="all" className="mt-4">
              {isLoading ? (
                <div className="text-center py-10">Loading users...</div>
              ) : filteredUsers && filteredUsers.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredUsers.map((user) => (
                    <UserCard
                      key={user.id}
                      user={user}
                      onMessage={() => startConversation(user)}
                      onEmail={() => sendEmail(user)}
                      onVoiceCall={() => startVoiceCall(user)}
                      onVideoCall={() => startVideoCall(user)}
                      onAddContact={() => addToContacts(user)}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-10 text-muted-foreground">
                  No users found matching your criteria
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="recent" className="mt-4">
              <div className="text-center py-10 text-muted-foreground">
                Recent contacts will appear here
              </div>
            </TabsContent>
            
            <TabsContent value="contacts" className="mt-4">
              <div className="text-center py-10 text-muted-foreground">
                Your saved contacts will appear here
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function UserCard({ 
  user, 
  onMessage, 
  onEmail, 
  onVoiceCall, 
  onVideoCall, 
  onAddContact 
}: { 
  user: User, 
  onMessage: () => void, 
  onEmail: () => void, 
  onVoiceCall: () => void, 
  onVideoCall: () => void, 
  onAddContact: () => void 
}) {
  // Get initials for avatar fallback
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase();
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center gap-4">
          <Avatar className="h-12 w-12">
            <AvatarImage src={user.avatar || ""} />
            <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
          </Avatar>
          <div>
            <h3 className="font-semibold text-lg">{user.name}</h3>
            <p className="text-sm text-muted-foreground capitalize">
              {user.role} · {user.status}
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-sm text-muted-foreground mb-4">
          {user.email && <p className="truncate">{user.email}</p>}
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button size="sm" variant="outline" onClick={onMessage}>
            <MessageSquare className="h-4 w-4 mr-1" />
            Message
          </Button>
          {user.email && (
            <Button size="sm" variant="outline" onClick={onEmail}>
              <Mail className="h-4 w-4 mr-1" />
              Email
            </Button>
          )}
          <Button size="sm" variant="outline" onClick={onVoiceCall}>
            <Phone className="h-4 w-4 mr-1" />
            Call
          </Button>
          <Button size="sm" variant="outline" onClick={onVideoCall}>
            <Video className="h-4 w-4 mr-1" />
            Video
          </Button>
          <Button size="sm" variant="outline" onClick={onAddContact}>
            <UserPlus className="h-4 w-4 mr-1" />
            Add
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}