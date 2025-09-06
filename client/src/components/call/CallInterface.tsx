import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { 
  Phone, 
  PhoneOff, 
  Mic, 
  MicOff, 
  Video, 
  VideoOff, 
  Monitor, 
  MonitorOff,
  Users,
  Settings,
  MoreVertical,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  MessageSquare
} from 'lucide-react';
import { webrtcService, CallState, Participant } from '@/lib/webrtc-service';
import CallChat from './CallChat';

interface CallInterfaceProps {
  callId: string;
  participants: Participant[];
  isHost: boolean;
  onEndCall: () => void;
  onToggleMute: () => void;
  onToggleVideo: () => void;
  onToggleScreenShare: () => void;
  onToggleParticipantMute: (userId: string) => void;
  onRemoveParticipant: (userId: string) => void;
}

export default function CallInterface({
  callId,
  participants,
  isHost,
  onEndCall,
  onToggleMute,
  onToggleVideo,
  onToggleScreenShare,
  onToggleParticipantMute,
  onRemoveParticipant
}: CallInterfaceProps) {
  const [callState, setCallState] = useState<CallState>(webrtcService.getCallState());
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showParticipants, setShowParticipants] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [participantVolumes, setParticipantVolumes] = useState<Map<string, number>>(new Map());
  const [chatMessages, setChatMessages] = useState<Array<{
    id: string;
    userId: string;
    userName: string;
    userAvatar?: string;
    content: string;
    timestamp: Date;
    type: 'text' | 'emoji' | 'file' | 'system';
    isOwn?: boolean;
  }>>([]);
  
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRefs = useRef<Map<string, HTMLVideoElement>>(new Map());
  const screenShareRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    // Set up event listeners
    const handleCallStateChange = () => {
      setCallState(webrtcService.getCallState());
    };

    const handleRemoteStream = ({ userId, stream }: { userId: string; stream: MediaStream }) => {
      const videoElement = remoteVideoRefs.current.get(userId);
      if (videoElement) {
        videoElement.srcObject = stream;
      }
    };

    const handleScreenShare = ({ userId, stream }: { userId: string; stream: MediaStream }) => {
      if (screenShareRef.current) {
        screenShareRef.current.srcObject = stream;
      }
    };

    webrtcService.on('callStateChanged', handleCallStateChange);
    webrtcService.on('remoteStream', handleRemoteStream);
    webrtcService.on('participantScreenShareStarted', handleScreenShare);

    return () => {
      webrtcService.off('callStateChanged', handleCallStateChange);
      webrtcService.off('remoteStream', handleRemoteStream);
      webrtcService.off('participantScreenShareStarted', handleScreenShare);
    };
  }, []);

  useEffect(() => {
    // Set up local video stream
    if (localVideoRef.current && callState.localStreams.video) {
      localVideoRef.current.srcObject = callState.localStreams.video;
    }
  }, [callState.localStreams.video]);

  const formatDuration = (startTime: Date) => {
    const now = new Date();
    const diff = Math.floor((now.getTime() - startTime.getTime()) / 1000);
    const minutes = Math.floor(diff / 60);
    const seconds = diff % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const adjustParticipantVolume = (userId: string, volume: number) => {
    setParticipantVolumes(prev => new Map(prev.set(userId, volume)));
    // In a real implementation, you would adjust the audio volume here
  };

  const renderParticipantVideo = (participant: Participant) => {
    const videoRef = (el: HTMLVideoElement | null) => {
      if (el) {
        remoteVideoRefs.current.set(participant.id, el);
      }
    };

    return (
      <div key={participant.id} className="relative group">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={participant.id === 'local'}
          className="w-full h-full object-cover rounded-lg"
        />
        
        {/* Participant info overlay */}
        <div className="absolute bottom-2 left-2 flex items-center space-x-2">
          <Avatar className="h-8 w-8">
            <AvatarImage src={participant.avatar} />
            <AvatarFallback>{participant.name.charAt(0)}</AvatarFallback>
          </Avatar>
          <div className="text-white text-sm">
            <p className="font-medium">{participant.name}</p>
            <div className="flex items-center space-x-1">
              {participant.isMuted && <MicOff className="h-3 w-3" />}
              {!participant.isVideoEnabled && <VideoOff className="h-3 w-3" />}
              {participant.isScreenSharing && <Monitor className="h-3 w-3" />}
            </div>
          </div>
        </div>

        {/* Participant controls (for host) */}
        {isHost && participant.id !== 'local' && (
          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="flex space-x-1">
              <Button
                size="icon"
                variant="secondary"
                className="h-8 w-8"
                onClick={() => onToggleParticipantMute(participant.id)}
              >
                {participant.isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
              </Button>
              <Button
                size="icon"
                variant="destructive"
                className="h-8 w-8"
                onClick={() => onRemoveParticipant(participant.id)}
              >
                <PhoneOff className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderGridLayout = () => {
    const participantCount = participants.length;
    
    if (participantCount === 1) {
      return (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Avatar className="h-32 w-32 mx-auto mb-4">
              <AvatarImage src={participants[0]?.avatar} />
              <AvatarFallback className="text-4xl">{participants[0]?.name.charAt(0)}</AvatarFallback>
            </Avatar>
            <h3 className="text-2xl font-semibold text-white mb-2">{participants[0]?.name}</h3>
            <p className="text-gray-300">Waiting for others to join...</p>
          </div>
        </div>
      );
    }

    if (participantCount === 2) {
      return (
        <div className="flex-1 grid grid-cols-2 gap-4 p-4">
          {participants.map(renderParticipantVideo)}
        </div>
      );
    }

    if (participantCount <= 4) {
      return (
        <div className="flex-1 grid grid-cols-2 gap-4 p-4">
          {participants.map(renderParticipantVideo)}
        </div>
      );
    }

    // For more than 4 participants, use a more complex grid
    return (
      <div className="flex-1 grid grid-cols-3 gap-2 p-4">
        {participants.map(renderParticipantVideo)}
      </div>
    );
  };

  return (
    <div className={`fixed inset-0 bg-gray-900 flex flex-col ${isFullscreen ? 'z-50' : 'z-40'}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-gray-800">
        <div className="flex items-center space-x-4">
          <h2 className="text-xl font-semibold text-white">Meeting</h2>
          <Badge variant="secondary" className="bg-green-500 text-white">
            {formatDuration(new Date())}
          </Badge>
          <Badge variant="outline" className="text-white border-white">
            {participants.length} participant{participants.length !== 1 ? 's' : ''}
          </Badge>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button
            size="icon"
            variant="ghost"
            onClick={() => setShowChat(!showChat)}
            className={`text-white hover:bg-gray-700 ${showChat ? 'bg-gray-700' : ''}`}
          >
            <MessageSquare className="h-5 w-5" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            onClick={() => setShowParticipants(!showParticipants)}
            className="text-white hover:bg-gray-700"
          >
            <Users className="h-5 w-5" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            onClick={() => setShowSettings(!showSettings)}
            className="text-white hover:bg-gray-700"
          >
            <Settings className="h-5 w-5" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            onClick={toggleFullscreen}
            className="text-white hover:bg-gray-700"
          >
            {isFullscreen ? <Minimize className="h-5 w-5" /> : <Maximize className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {/* Main video area */}
      <div className="flex-1 relative">
        {renderGridLayout()}
        
        {/* Screen share overlay */}
        {callState.isScreenSharing && (
          <div className="absolute inset-0 bg-black">
            <video
              ref={screenShareRef}
              autoPlay
              playsInline
              className="w-full h-full object-contain"
            />
          </div>
        )}
      </div>

      {/* Control bar */}
      <div className="flex items-center justify-center space-x-4 p-6 bg-gray-800">
        <Button
          size="icon"
          variant={callState.isMuted ? "destructive" : "secondary"}
          className="h-12 w-12 rounded-full"
          onClick={onToggleMute}
        >
          {callState.isMuted ? <MicOff className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
        </Button>
        
        <Button
          size="icon"
          variant={callState.isVideoEnabled ? "secondary" : "destructive"}
          className="h-12 w-12 rounded-full"
          onClick={onToggleVideo}
        >
          {callState.isVideoEnabled ? <Video className="h-6 w-6" /> : <VideoOff className="h-6 w-6" />}
        </Button>
        
        <Button
          size="icon"
          variant={callState.isScreenSharing ? "default" : "secondary"}
          className="h-12 w-12 rounded-full"
          onClick={onToggleScreenShare}
        >
          {callState.isScreenSharing ? <MonitorOff className="h-6 w-6" /> : <Monitor className="h-6 w-6" />}
        </Button>
        
        <Button
          size="icon"
          variant="destructive"
          className="h-12 w-12 rounded-full"
          onClick={onEndCall}
        >
          <PhoneOff className="h-6 w-6" />
        </Button>
      </div>

      {/* Participants sidebar */}
      {showParticipants && (
        <div className="absolute right-0 top-0 w-80 h-full bg-gray-800 border-l border-gray-700 p-4">
          <h3 className="text-lg font-semibold text-white mb-4">Participants</h3>
          <div className="space-y-2">
            {participants.map(participant => (
              <div key={participant.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-700">
                <div className="flex items-center space-x-3">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={participant.avatar} />
                    <AvatarFallback>{participant.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-white text-sm font-medium">{participant.name}</p>
                    <div className="flex items-center space-x-1">
                      {participant.isMuted && <MicOff className="h-3 w-3 text-red-400" />}
                      {!participant.isVideoEnabled && <VideoOff className="h-3 w-3 text-red-400" />}
                      {participant.isScreenSharing && <Monitor className="h-3 w-3 text-blue-400" />}
                    </div>
                  </div>
                </div>
                {isHost && participant.id !== 'local' && (
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => onRemoveParticipant(participant.id)}
                    className="text-red-400 hover:text-red-300"
                  >
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Settings panel */}
      {showSettings && (
        <div className="absolute right-0 top-0 w-80 h-full bg-gray-800 border-l border-gray-700 p-4">
          <h3 className="text-lg font-semibold text-white mb-4">Settings</h3>
          <div className="space-y-4">
            <div>
              <label className="text-white text-sm font-medium mb-2 block">Audio Input</label>
              <select className="w-full p-2 bg-gray-700 text-white rounded">
                <option>Default Microphone</option>
              </select>
            </div>
            <div>
              <label className="text-white text-sm font-medium mb-2 block">Audio Output</label>
              <select className="w-full p-2 bg-gray-700 text-white rounded">
                <option>Default Speakers</option>
              </select>
            </div>
            <div>
              <label className="text-white text-sm font-medium mb-2 block">Video Camera</label>
              <select className="w-full p-2 bg-gray-700 text-white rounded">
                <option>Default Camera</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Chat panel */}
      {showChat && (
        <div className="absolute right-0 top-0 w-80 h-full bg-white border-l border-gray-300">
          <CallChat
            messages={chatMessages}
            onSendMessage={(content) => {
              const newMessage = {
                id: `msg_${Date.now()}`,
                userId: 'current_user',
                userName: 'You',
                content,
                timestamp: new Date(),
                type: 'text' as const,
                isOwn: true
              };
              setChatMessages(prev => [...prev, newMessage]);
            }}
            onSendEmoji={(emoji) => {
              const newMessage = {
                id: `msg_${Date.now()}`,
                userId: 'current_user',
                userName: 'You',
                content: emoji,
                timestamp: new Date(),
                type: 'emoji' as const,
                isOwn: true
              };
              setChatMessages(prev => [...prev, newMessage]);
            }}
            onSendFile={(file) => {
              const newMessage = {
                id: `msg_${Date.now()}`,
                userId: 'current_user',
                userName: 'You',
                content: `📎 ${file.name}`,
                timestamp: new Date(),
                type: 'file' as const,
                isOwn: true
              };
              setChatMessages(prev => [...prev, newMessage]);
            }}
            participants={participants.map(p => ({
              id: p.id,
              name: p.name,
              avatar: p.avatar,
              isOnline: true
            }))}
          />
        </div>
      )}
    </div>
  );
}