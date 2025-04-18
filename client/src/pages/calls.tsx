import { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import {
  Phone,
  VideoIcon,
  Clock,
  User,
  Calendar,
  Search,
  ArrowUpRight,
  ArrowDownLeft,
  PhoneCall,
  PhoneOff,
  MicOff,
  Mic,
  Video,
  VideoOff,
  Info,
  Mail,
  MessageSquare,
  X,
  MonitorSmartphone,
  Monitor,
  Users,
  UserPlus,
  Filter,
  Loader2,
  Trash,
  Plus,
  MoreVertical
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from '@/components/ui/tabs';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import WebSocketClient, { CallType, CallDirection, CallStatus } from '@/lib/websocket-client';

// Type definitions
type Contact = {
  id: number;
  name: string;
  avatar?: string;
  status: string;
  role: string;
  lastSeen?: string;
  department?: string;
};

type CallHistoryItem = {
  id: number;
  direction: 'incoming' | 'outgoing';
  participant: {
    id: number;
    name: string;
  };
  timestamp: string;
  duration: string;
  type: 'audio' | 'video';
  missed: boolean;
};

type ScheduledMeeting = {
  id: number;
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  organizer: {
    id: number;
    name: string;
  };
  participants: {
    id: number;
    name: string;
  }[];
};

type ActiveCall = {
  id: number;
  user: Contact;
  type: 'audio' | 'video';
  status: 'ringing' | 'ongoing' | 'ended';
  startTime?: Date;
  direction: 'incoming' | 'outgoing';
  videoEnabled: boolean;
  audioEnabled: boolean;
};

export default function Calls() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCall, setActiveCall] = useState<ActiveCall | null>(null);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [showNewMeetingDialog, setShowNewMeetingDialog] = useState(false);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  
  // Fetch contacts
  const { data: contacts, isLoading: isLoadingContacts } = useQuery({
    queryKey: ['/api/users'],
    enabled: !!user
  });
  
  // Fetch call history
  const { data: callHistory, isLoading: isLoadingCallHistory } = useQuery({
    queryKey: ['/api/calls/history'],
    enabled: !!user
  });
  
  // Fetch scheduled meetings
  const { data: scheduledMeetings, isLoading: isLoadingMeetings } = useQuery({
    queryKey: ['/api/meetings'],
    enabled: !!user
  });
  
  // Filter contacts based on search query
  const filteredContacts = searchQuery.trim() === '' 
    ? (Array.isArray(contacts) ? contacts : [])
    : (Array.isArray(contacts) ? contacts.filter((contact: Contact) => 
        contact.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        contact.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (contact.department && contact.department.toLowerCase().includes(searchQuery.toLowerCase()))
      ) : []);
  
  // Setup WebSocket listeners for incoming calls
  useEffect(() => {
    // Handle incoming call
    const handleIncomingCall = (data: any) => {
      if (!data.caller) return;
      
      // Create active call object for the incoming call
      const newCall: ActiveCall = {
        id: data.callId,
        user: {
          id: data.caller.id,
          name: data.caller.name,
          avatar: data.caller.avatar,
          status: 'online',
          role: 'User'
        },
        type: data.callType,
        status: 'ringing',
        direction: 'incoming',
        videoEnabled: data.callType === 'video',
        audioEnabled: true
      };
      
      setActiveCall(newCall);
      
      // Show toast notification
      toast({
        title: `Incoming ${data.callType} call`,
        description: `${data.caller.name} is calling you`,
        duration: 10000
      });
    };
    
    // Register incoming call listener (doesn't depend on activeCall)
    const removeIncomingCallListener = WebSocketClient.addEventListener('call_request', handleIncomingCall);
    
    return () => {
      removeIncomingCallListener();
    };
  }, [toast]);
  
  // Setup WebSocket listeners for call status updates (depends on activeCall)
  useEffect(() => {
    if (!activeCall) return;
    
    // Handle call ended events
    const handleCallStatusUpdate = (data: any) => {
      if (data.callId && data.callId === activeCall.id) {
        setActiveCall(null);
        
        // Show toast notification
        toast({
          title: 'Call ended',
          description: data.reason ? `Call ${data.reason}` : 'The call has ended'
        });
      }
    };
    
    // Handle call accepted
    const handleCallAccepted = (data: any) => {
      if (data.callId && data.callId === activeCall.id) {
        setActiveCall({
          ...activeCall,
          status: 'ongoing',
          startTime: new Date()
        });
        
        toast({
          title: 'Call connected',
          description: `Connected with ${activeCall.user.name}`
        });
      }
    };
    
    // Register WebSocket event listeners for active call updates
    const removeCallEndedListener = WebSocketClient.addEventListener('call_ended', handleCallStatusUpdate);
    const removeCallAcceptedListener = WebSocketClient.addEventListener('call_accept', handleCallAccepted);
    
    // Cleanup function
    return () => {
      removeCallEndedListener();
      removeCallAcceptedListener();
    };
  }, [activeCall, toast]);
  
  // Handle starting a call
  const startCall = (contact: Contact, callType: 'audio' | 'video') => {
    // Create active call object
    const newCall: ActiveCall = {
      id: Date.now(), // This would normally come from the server
      user: contact,
      type: callType,
      status: 'ringing',
      startTime: new Date(),
      direction: 'outgoing',
      videoEnabled: callType === 'video',
      audioEnabled: true
    };
    
    setActiveCall(newCall);
    
    // Send call request via WebSocket
    WebSocketClient.sendMessage('call_request', {
      targetUserId: contact.id,
      callType
    });
    
    // In a real app, this would trigger WebRTC connection setup
    // For now, we'll simulate the call being answered after 2 seconds
    setTimeout(() => {
      if (activeCall && activeCall.id === newCall.id) {
        setActiveCall({
          ...newCall,
          status: 'ongoing'
        });
      }
    }, 2000);
  };
  
  // Handle accepting a call
  const acceptCall = () => {
    if (!activeCall) return;
    
    // Update call status
    setActiveCall({
      ...activeCall,
      status: 'ongoing',
      startTime: new Date()
    });
    
    // Send call accepted message via WebSocket
    WebSocketClient.sendMessage('call_accept', {
      callId: activeCall.id
    });
    
    // In a real app, this would trigger WebRTC connection setup
  };
  
  // Handle rejecting a call
  const rejectCall = () => {
    if (!activeCall) return;
    
    // Send call rejected message via WebSocket
    WebSocketClient.sendMessage('call_decline', {
      callId: activeCall.id
    });
    
    // Clear active call
    setActiveCall(null);
  };
  
  // Handle ending a call
  const endCall = () => {
    if (!activeCall) return;
    
    // Send call ended message via WebSocket
    WebSocketClient.sendMessage('call_end', {
      callId: activeCall.id
    });
    
    // Clear active call
    setActiveCall(null);
  };
  
  // Toggle audio
  const toggleAudio = () => {
    if (!activeCall) return;
    
    setActiveCall({
      ...activeCall,
      audioEnabled: !activeCall.audioEnabled
    });
    
    // In a real app, this would mute/unmute the WebRTC audio track
  };
  
  // Toggle video
  const toggleVideo = () => {
    if (!activeCall) return;
    
    setActiveCall({
      ...activeCall,
      videoEnabled: !activeCall.videoEnabled
    });
    
    // In a real app, this would enable/disable the WebRTC video track
  };
  
  // Format call duration
  const formatCallDuration = (startTime?: Date) => {
    if (!startTime) return '00:00';
    
    const seconds = Math.floor((Date.now() - startTime.getTime()) / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };
  
  // Function to handle creating a new meeting
  const createNewMeeting = (formData: FormData) => {
    // In a real app, this would send the meeting data to the server
    setShowNewMeetingDialog(false);
    
    toast({
      title: 'Meeting scheduled',
      description: 'Your meeting has been scheduled successfully'
    });
  };
  
  // Render contact list for quick calls
  const renderContactList = () => (
    <ScrollArea className="h-[calc(100vh-200px)]">
      <div className="space-y-2 p-2">
        {isLoadingContacts ? (
          <div className="flex justify-center p-4">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          (Array.isArray(filteredContacts) ? filteredContacts : []).map((contact: Contact) => (
            <div 
              key={contact.id}
              className="flex items-center justify-between p-2 rounded-md hover:bg-muted cursor-pointer"
              onClick={() => setSelectedContact(contact)}
            >
              <div className="flex items-center space-x-3">
                <Avatar>
                  <AvatarImage src={contact.avatar} />
                  <AvatarFallback>{contact.name.charAt(0)}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">{contact.name}</p>
                  <p className="text-sm text-muted-foreground">{contact.role}</p>
                </div>
              </div>
              <div className="flex space-x-1">
                <Button 
                  size="icon" 
                  variant="ghost" 
                  onClick={(e) => {
                    e.stopPropagation();
                    startCall(contact, 'audio');
                  }}
                >
                  <Phone className="h-4 w-4" />
                </Button>
                <Button 
                  size="icon" 
                  variant="ghost" 
                  onClick={(e) => {
                    e.stopPropagation();
                    startCall(contact, 'video');
                  }}
                >
                  <VideoIcon className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))
        )}
      </div>
    </ScrollArea>
  );
  
  // Render call history
  const renderCallHistory = () => (
    <ScrollArea className="h-[calc(100vh-200px)]">
      <div className="space-y-2 p-2">
        {isLoadingCallHistory ? (
          <div className="flex justify-center p-4">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          (Array.isArray(callHistory) ? callHistory : []).map((call: CallHistoryItem) => (
            <div 
              key={call.id} 
              className="flex items-center justify-between p-2 rounded-md hover:bg-muted"
            >
              <div className="flex items-center space-x-3">
                {call.direction === 'incoming' ? (
                  <ArrowDownLeft className={`h-4 w-4 ${call.missed ? 'text-destructive' : 'text-green-500'}`} />
                ) : (
                  <ArrowUpRight className="h-4 w-4 text-primary" />
                )}
                <div>
                  <p className="font-medium">{call.participant.name}</p>
                  <div className="flex items-center text-sm text-muted-foreground">
                    <Clock className="mr-1 h-3 w-3" />
                    <span>{call.timestamp}</span>
                    {call.missed ? (
                      <Badge variant="destructive" className="ml-2">Missed</Badge>
                    ) : (
                      <span className="ml-2">{call.duration}</span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex space-x-1">
                <Button 
                  size="icon" 
                  variant="ghost" 
                  onClick={() => {
                    const contact = Array.isArray(contacts) ? contacts.find((c: Contact) => c.id === call.participant.id) : undefined;
                    if (contact) {
                      startCall(contact, 'audio');
                    }
                  }}
                >
                  <Phone className="h-4 w-4" />
                </Button>
                <Button 
                  size="icon" 
                  variant="ghost" 
                  onClick={() => {
                    const contact = Array.isArray(contacts) ? contacts.find((c: Contact) => c.id === call.participant.id) : undefined;
                    if (contact) {
                      startCall(contact, 'video');
                    }
                  }}
                >
                  <VideoIcon className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))
        )}
      </div>
    </ScrollArea>
  );
  
  // Render scheduled meetings
  const renderScheduledMeetings = () => (
    <ScrollArea className="h-[calc(100vh-200px)]">
      <div className="space-y-4 p-2">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Scheduled Meetings</h3>
          <Button 
            onClick={() => setShowNewMeetingDialog(true)}
            size="sm"
          >
            <Plus className="h-4 w-4 mr-1" />
            New Meeting
          </Button>
        </div>
        
        {isLoadingMeetings ? (
          <div className="flex justify-center p-4">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          (Array.isArray(scheduledMeetings) ? scheduledMeetings : []).map((meeting: ScheduledMeeting) => (
            <Card key={meeting.id}>
              <CardHeader className="p-4">
                <div className="flex justify-between items-start">
                  <CardTitle className="text-lg">{meeting.title}</CardTitle>
                  <Button variant="ghost" size="icon">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </div>
                <CardDescription className="flex items-center">
                  <Calendar className="mr-1 h-3 w-3" />
                  {meeting.date} • {meeting.startTime} - {meeting.endTime}
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <p className="text-sm mb-2">Organized by: {meeting.organizer.name}</p>
                <div className="flex -space-x-2">
                  {meeting.participants.slice(0, 5).map((participant, i) => (
                    <Avatar key={participant.id} className="border-2 border-background h-8 w-8">
                      <AvatarFallback>{participant.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                  ))}
                  {meeting.participants.length > 5 && (
                    <div className="flex items-center justify-center h-8 w-8 rounded-full bg-muted border-2 border-background text-xs">
                      +{meeting.participants.length - 5}
                    </div>
                  )}
                </div>
              </CardContent>
              <CardFooter className="p-4 pt-0 flex justify-end">
                <Button variant="outline" size="sm" className="mr-2">
                  Edit
                </Button>
                <Button size="sm">
                  Join
                </Button>
              </CardFooter>
            </Card>
          ))
        )}
      </div>
    </ScrollArea>
  );
  
  // Render active call UI
  const renderActiveCall = () => {
    if (!activeCall) return null;
    
    return (
      <div className="fixed inset-0 bg-background z-50 flex flex-col">
        <div className="p-4 flex justify-between items-center border-b">
          <div className="flex items-center space-x-3">
            <Avatar>
              <AvatarImage src={activeCall.user.avatar} />
              <AvatarFallback>{activeCall.user.name.charAt(0)}</AvatarFallback>
            </Avatar>
            <div>
              <h3 className="font-medium">{activeCall.user.name}</h3>
              <p className="text-sm text-muted-foreground">
                {activeCall.status === 'ringing' ? 'Ringing...' : 
                  activeCall.startTime ? formatCallDuration(activeCall.startTime) : ''}
              </p>
            </div>
          </div>
          <Button 
            size="icon" 
            variant="ghost" 
            onClick={() => setActiveCall(null)}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
        
        <div className="flex-1 flex items-center justify-center bg-muted">
          {activeCall.type === 'video' && activeCall.videoEnabled && (
            <div className="relative w-full h-full">
              {/* Remote video would be shown here */}
              <div className="absolute inset-0 flex items-center justify-center">
                <Avatar className="h-32 w-32">
                  <AvatarImage src={activeCall.user.avatar} />
                  <AvatarFallback className="text-4xl">{activeCall.user.name.charAt(0)}</AvatarFallback>
                </Avatar>
              </div>
              
              {/* Local video (picture-in-picture) */}
              <div className="absolute bottom-4 right-4 w-48 h-36 bg-background border rounded-md overflow-hidden">
                {/* This would be your local video feed */}
                <div className="flex items-center justify-center h-full">
                  <Avatar className="h-16 w-16">
                    <AvatarImage src={user?.avatar} />
                    <AvatarFallback className="text-2xl">{user?.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                </div>
              </div>
            </div>
          )}
          
          {(activeCall.type === 'audio' || !activeCall.videoEnabled) && (
            <Avatar className="h-32 w-32">
              <AvatarImage src={activeCall.user.avatar} />
              <AvatarFallback className="text-4xl">{activeCall.user.name.charAt(0)}</AvatarFallback>
            </Avatar>
          )}
        </div>
        
        <div className="p-6 flex justify-center items-center space-x-4 border-t">
          {activeCall.status === 'ringing' && activeCall.direction === 'incoming' ? (
            <>
              <Button 
                size="icon" 
                variant="destructive" 
                className="h-12 w-12 rounded-full"
                onClick={rejectCall}
              >
                <PhoneOff className="h-6 w-6" />
              </Button>
              <Button 
                size="icon" 
                variant="default" 
                className="h-12 w-12 rounded-full bg-green-500 hover:bg-green-600"
                onClick={acceptCall}
              >
                <PhoneCall className="h-6 w-6" />
              </Button>
            </>
          ) : (
            <>
              <Button 
                size="icon" 
                variant={activeCall.audioEnabled ? "outline" : "secondary"}
                className="h-12 w-12 rounded-full"
                onClick={toggleAudio}
              >
                {activeCall.audioEnabled ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
              </Button>
              
              {activeCall.type === 'video' && (
                <Button 
                  size="icon" 
                  variant={activeCall.videoEnabled ? "outline" : "secondary"}
                  className="h-12 w-12 rounded-full"
                  onClick={toggleVideo}
                >
                  {activeCall.videoEnabled ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
                </Button>
              )}
              
              <Button 
                size="icon" 
                variant="destructive" 
                className="h-12 w-12 rounded-full"
                onClick={endCall}
              >
                <PhoneOff className="h-6 w-6" />
              </Button>
            </>
          )}
        </div>
      </div>
    );
  };
  
  // Render contact details sidebar
  const renderContactDetails = () => {
    if (!selectedContact) return null;
    
    return (
      <div className="border-l w-80 p-4">
        <div className="flex justify-between items-start mb-4">
          <h3 className="text-lg font-semibold">Contact Details</h3>
          <Button 
            size="icon" 
            variant="ghost" 
            onClick={() => setSelectedContact(null)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="flex flex-col items-center mb-6">
          <Avatar className="h-24 w-24 mb-4">
            <AvatarImage src={selectedContact.avatar} />
            <AvatarFallback className="text-3xl">{selectedContact.name.charAt(0)}</AvatarFallback>
          </Avatar>
          <h4 className="text-xl font-medium">{selectedContact.name}</h4>
          <p className="text-muted-foreground">{selectedContact.role}</p>
          <div className="flex mt-2">
            <Badge 
              variant={selectedContact.status === 'online' ? 'default' : 'secondary'}
              className="mr-2"
            >
              {selectedContact.status.charAt(0).toUpperCase() + selectedContact.status.slice(1)}
            </Badge>
            {selectedContact.department && (
              <Badge variant="outline">{selectedContact.department}</Badge>
            )}
          </div>
        </div>
        
        <div className="flex justify-center space-x-2 mb-6">
          <Button 
            variant="outline" 
            size="icon" 
            onClick={() => startCall(selectedContact, 'audio')}
          >
            <Phone className="h-4 w-4" />
          </Button>
          <Button 
            variant="outline" 
            size="icon" 
            onClick={() => startCall(selectedContact, 'video')}
          >
            <VideoIcon className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon">
            <Mail className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon">
            <MessageSquare className="h-4 w-4" />
          </Button>
        </div>
        
        <Separator className="mb-4" />
        
        <div className="space-y-4">
          {selectedContact.lastSeen && (
            <div>
              <h5 className="text-sm font-medium text-muted-foreground mb-1">Last Seen</h5>
              <p className="text-sm">{selectedContact.lastSeen}</p>
            </div>
          )}
          
          <div>
            <h5 className="text-sm font-medium text-muted-foreground mb-1">Recent Interactions</h5>
            <div className="space-y-2">
              {(Array.isArray(callHistory) ? callHistory : []).filter((call: CallHistoryItem) => 
                call.participant.id === selectedContact.id
              ).slice(0, 3).map((call: CallHistoryItem) => (
                <div key={call.id} className="text-sm flex items-center">
                  {call.type === 'audio' ? <Phone className="h-3 w-3 mr-2" /> : <VideoIcon className="h-3 w-3 mr-2" />}
                  <span>{call.timestamp} ({call.duration})</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  };
  
  // Render new meeting dialog
  const renderNewMeetingDialog = () => (
    <Dialog open={showNewMeetingDialog} onOpenChange={setShowNewMeetingDialog}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Schedule New Meeting</DialogTitle>
          <DialogDescription>
            Create a new meeting and invite participants.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={(e) => {
          e.preventDefault();
          createNewMeeting(new FormData(e.target as HTMLFormElement));
        }}>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <label htmlFor="title" className="text-right text-sm font-medium">
                Title
              </label>
              <Input id="title" name="title" className="col-span-3" />
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <label htmlFor="date" className="text-right text-sm font-medium">
                Date
              </label>
              <Input id="date" name="date" type="date" className="col-span-3" />
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <label htmlFor="start-time" className="text-right text-sm font-medium">
                Start Time
              </label>
              <Input id="start-time" name="startTime" type="time" className="col-span-3" />
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <label htmlFor="end-time" className="text-right text-sm font-medium">
                End Time
              </label>
              <Input id="end-time" name="endTime" type="time" className="col-span-3" />
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <label htmlFor="participants" className="text-right text-sm font-medium">
                Participants
              </label>
              <div className="col-span-3">
                <Input id="participants" name="participants" placeholder="Type to search..." />
                <div className="mt-2 flex flex-wrap gap-2">
                  <Badge variant="secondary" className="flex items-center gap-1">
                    Jane Smith <X className="h-3 w-3 cursor-pointer" />
                  </Badge>
                  <Badge variant="secondary" className="flex items-center gap-1">
                    Mike Johnson <X className="h-3 w-3 cursor-pointer" />
                  </Badge>
                </div>
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setShowNewMeetingDialog(false)}>
              Cancel
            </Button>
            <Button type="submit">
              Schedule Meeting
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
  
  return (
    <div className="h-full flex">
      <div className="flex-1 flex flex-col">
        <div className="p-4 border-b">
          <h1 className="text-2xl font-bold mb-2">Calls</h1>
          <div className="flex mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search contacts or call history..."
                className="pl-8"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Button variant="outline" className="ml-2">
              <Filter className="h-4 w-4 mr-2" />
              Filter
            </Button>
          </div>
        </div>
        
        <Tabs defaultValue="contacts" className="flex-1">
          <TabsList className="grid grid-cols-3 mx-4 mt-2">
            <TabsTrigger value="contacts" className="flex items-center">
              <User className="h-4 w-4 mr-2" />
              Contacts
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center">
              <Clock className="h-4 w-4 mr-2" />
              History
            </TabsTrigger>
            <TabsTrigger value="meetings" className="flex items-center">
              <Calendar className="h-4 w-4 mr-2" />
              Meetings
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="contacts" className="flex-1 p-4 pt-2">
            {renderContactList()}
          </TabsContent>
          
          <TabsContent value="history" className="flex-1 p-4 pt-2">
            {renderCallHistory()}
          </TabsContent>
          
          <TabsContent value="meetings" className="flex-1 p-4 pt-2">
            {renderScheduledMeetings()}
          </TabsContent>
        </Tabs>
      </div>
      
      {selectedContact && renderContactDetails()}
      {activeCall && renderActiveCall()}
      {renderNewMeetingDialog()}
    </div>
  );
}