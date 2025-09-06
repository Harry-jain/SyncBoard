import { useState, useEffect, useCallback } from 'react';
import { webrtcService, CallState, Participant, CallOptions } from '@/lib/webrtc-service';
import { useToast } from './use-toast';

export interface CallManager {
  callState: CallState;
  participants: Participant[];
  isInCall: boolean;
  isMuted: boolean;
  isVideoEnabled: boolean;
  isScreenSharing: boolean;
  startCall: (targetUserId: string, options: CallOptions) => Promise<void>;
  acceptCall: (callId: string) => Promise<void>;
  endCall: () => Promise<void>;
  toggleMute: () => void;
  toggleVideo: () => void;
  toggleScreenShare: () => Promise<void>;
  toggleParticipantMute: (userId: string) => void;
  removeParticipant: (userId: string) => void;
}

export function useCall(): CallManager {
  const [callState, setCallState] = useState<CallState>(webrtcService.getCallState());
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [isInCall, setIsInCall] = useState(false);
  const { toast } = useToast();

  // Update call state when WebRTC service state changes
  useEffect(() => {
    const handleCallStateChange = () => {
      const newState = webrtcService.getCallState();
      setCallState(newState);
      setIsInCall(newState.isConnected);
      
      // Update participants list
      setParticipants(Array.from(newState.participants.values()));
    };

    webrtcService.on('callStateChanged', handleCallStateChange);
    webrtcService.on('participantJoined', handleParticipantJoined);
    webrtcService.on('participantLeft', handleParticipantLeft);
    webrtcService.on('incomingCall', handleIncomingCall);
    webrtcService.on('callAccepted', handleCallAccepted);
    webrtcService.on('callEnded', handleCallEnded);
    webrtcService.on('callError', handleCallError);

    return () => {
      webrtcService.off('callStateChanged', handleCallStateChange);
      webrtcService.off('participantJoined', handleParticipantJoined);
      webrtcService.off('participantLeft', handleParticipantLeft);
      webrtcService.off('incomingCall', handleIncomingCall);
      webrtcService.off('callAccepted', handleCallAccepted);
      webrtcService.off('callEnded', handleCallEnded);
      webrtcService.off('callError', handleCallError);
    };
  }, []);

  const handleParticipantJoined = useCallback((participant: Participant) => {
    setParticipants(prev => [...prev.filter(p => p.id !== participant.id), participant]);
    
    toast({
      title: 'Participant joined',
      description: `${participant.name} joined the call`,
      duration: 3000
    });
  }, [toast]);

  const handleParticipantLeft = useCallback(({ userId }: { userId: string }) => {
    setParticipants(prev => prev.filter(p => p.id !== userId));
    
    const participant = participants.find(p => p.id === userId);
    if (participant) {
      toast({
        title: 'Participant left',
        description: `${participant.name} left the call`,
        duration: 3000
      });
    }
  }, [participants, toast]);

  const handleIncomingCall = useCallback((data: any) => {
    toast({
      title: `Incoming ${data.callType} call`,
      description: `${data.caller.name} is calling you`,
      duration: 10000,
      action: (
        <div className="flex space-x-2">
          <button
            onClick={() => acceptCall(data.callId)}
            className="px-3 py-1 bg-green-500 text-white rounded text-sm"
          >
            Accept
          </button>
          <button
            onClick={() => endCall()}
            className="px-3 py-1 bg-red-500 text-white rounded text-sm"
          >
            Decline
          </button>
        </div>
      )
    });
  }, [toast]);

  const handleCallAccepted = useCallback((data: any) => {
    toast({
      title: 'Call connected',
      description: 'You are now connected',
      duration: 3000
    });
  }, [toast]);

  const handleCallEnded = useCallback((data: any) => {
    setIsInCall(false);
    setParticipants([]);
    
    toast({
      title: 'Call ended',
      description: data?.reason ? `Call ${data.reason}` : 'The call has ended',
      duration: 3000
    });
  }, [toast]);

  const handleCallError = useCallback((error: any) => {
    toast({
      title: 'Call error',
      description: error.message || 'An error occurred during the call',
      variant: 'destructive',
      duration: 5000
    });
  }, [toast]);

  const startCall = useCallback(async (targetUserId: string, options: CallOptions) => {
    try {
      await webrtcService.startCall(targetUserId, options);
      
      toast({
        title: 'Call started',
        description: `Starting ${options.video ? 'video' : 'audio'} call...`,
        duration: 3000
      });
    } catch (error) {
      console.error('Failed to start call:', error);
      toast({
        title: 'Failed to start call',
        description: 'Unable to initiate the call. Please try again.',
        variant: 'destructive',
        duration: 5000
      });
    }
  }, [toast]);

  const acceptCall = useCallback(async (callId: string) => {
    try {
      await webrtcService.acceptCall(callId);
      setIsInCall(true);
    } catch (error) {
      console.error('Failed to accept call:', error);
      toast({
        title: 'Failed to accept call',
        description: 'Unable to accept the call. Please try again.',
        variant: 'destructive',
        duration: 5000
      });
    }
  }, [toast]);

  const endCall = useCallback(async () => {
    try {
      await webrtcService.endCall();
      setIsInCall(false);
      setParticipants([]);
    } catch (error) {
      console.error('Failed to end call:', error);
      toast({
        title: 'Failed to end call',
        description: 'Unable to end the call properly.',
        variant: 'destructive',
        duration: 5000
      });
    }
  }, [toast]);

  const toggleMute = useCallback(() => {
    webrtcService.toggleAudio();
  }, []);

  const toggleVideo = useCallback(() => {
    webrtcService.toggleVideo();
  }, []);

  const toggleScreenShare = useCallback(async () => {
    try {
      if (callState.isScreenSharing) {
        webrtcService.stopScreenShare();
      } else {
        await webrtcService.startScreenShare();
      }
    } catch (error) {
      console.error('Failed to toggle screen share:', error);
      toast({
        title: 'Screen share error',
        description: 'Unable to start screen sharing. Please check your permissions.',
        variant: 'destructive',
        duration: 5000
      });
    }
  }, [callState.isScreenSharing, toast]);

  const toggleParticipantMute = useCallback((userId: string) => {
    // In a real implementation, this would send a command to mute/unmute the participant
    // For now, we'll just show a toast
    const participant = participants.find(p => p.id === userId);
    if (participant) {
      toast({
        title: 'Participant muted',
        description: `${participant.name} has been muted`,
        duration: 3000
      });
    }
  }, [participants, toast]);

  const removeParticipant = useCallback((userId: string) => {
    // In a real implementation, this would remove the participant from the call
    const participant = participants.find(p => p.id === userId);
    if (participant) {
      toast({
        title: 'Participant removed',
        description: `${participant.name} has been removed from the call`,
        duration: 3000
      });
    }
  }, [participants, toast]);

  return {
    callState,
    participants,
    isInCall,
    isMuted: callState.isMuted,
    isVideoEnabled: callState.isVideoEnabled,
    isScreenSharing: callState.isScreenSharing,
    startCall,
    acceptCall,
    endCall,
    toggleMute,
    toggleVideo,
    toggleScreenShare,
    toggleParticipantMute,
    removeParticipant
  };
}