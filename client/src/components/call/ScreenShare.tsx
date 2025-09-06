import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { 
  Monitor, 
  MonitorOff, 
  Maximize, 
  Minimize,
  X,
  Share2,
  Pause,
  Play
} from 'lucide-react';

interface ScreenShareProps {
  isSharing: boolean;
  onStartShare: () => Promise<void>;
  onStopShare: () => void;
  onToggleFullscreen?: () => void;
  className?: string;
}

export default function ScreenShare({
  isSharing,
  onStartShare,
  onStopShare,
  onToggleFullscreen,
  className = ''
}: ScreenShareProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [shareError, setShareError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);

  useEffect(() => {
    if (isSharing && stream) {
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    }
  }, [isSharing, stream]);

  const handleStartShare = async () => {
    try {
      setShareError(null);
      await onStartShare();
    } catch (error) {
      console.error('Failed to start screen share:', error);
      setShareError('Failed to start screen sharing. Please check your permissions.');
    }
  };

  const handleStopShare = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    onStopShare();
    setShareError(null);
  };

  const handleToggleFullscreen = () => {
    if (!document.fullscreenElement) {
      videoRef.current?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
    onToggleFullscreen?.();
  };

  const handleTogglePause = () => {
    if (stream) {
      stream.getVideoTracks().forEach(track => {
        track.enabled = isPaused;
      });
      setIsPaused(!isPaused);
    }
  };

  if (!isSharing) {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        <Button
          onClick={handleStartShare}
          variant="outline"
          size="sm"
          className="flex items-center space-x-2"
        >
          <Share2 className="h-4 w-4" />
          <span>Share Screen</span>
        </Button>
        {shareError && (
          <div className="text-red-500 text-sm">
            {shareError}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`relative bg-black rounded-lg overflow-hidden ${className}`}>
      {/* Video element */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="w-full h-full object-contain"
      />
      
      {/* Controls overlay */}
      <div className="absolute top-2 right-2 flex space-x-2">
        <Button
          size="icon"
          variant="secondary"
          onClick={handleTogglePause}
          className="h-8 w-8"
        >
          {isPaused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
        </Button>
        
        <Button
          size="icon"
          variant="secondary"
          onClick={handleToggleFullscreen}
          className="h-8 w-8"
        >
          {isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
        </Button>
        
        <Button
          size="icon"
          variant="destructive"
          onClick={handleStopShare}
          className="h-8 w-8"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
      
      {/* Status indicator */}
      <div className="absolute bottom-2 left-2 flex items-center space-x-2 bg-black bg-opacity-50 text-white px-2 py-1 rounded">
        <Monitor className="h-4 w-4" />
        <span className="text-sm">Screen sharing</span>
        {isPaused && (
          <span className="text-sm text-yellow-400">(Paused)</span>
        )}
      </div>
    </div>
  );
}

// Hook for screen sharing functionality
export function useScreenShare() {
  const [isSharing, setIsSharing] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);

  const startScreenShare = async () => {
    try {
      setError(null);
      
      // Request screen capture
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          mediaSource: 'screen',
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          frameRate: { ideal: 30 }
        },
        audio: true
      });

      setStream(screenStream);
      setIsSharing(true);

      // Handle when user stops sharing via browser UI
      screenStream.getVideoTracks()[0].onended = () => {
        stopScreenShare();
      };

      return screenStream;
    } catch (err) {
      console.error('Screen share error:', err);
      setError('Failed to start screen sharing. Please check your permissions.');
      throw err;
    }
  };

  const stopScreenShare = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setIsSharing(false);
    setError(null);
  };

  return {
    isSharing,
    stream,
    error,
    startScreenShare,
    stopScreenShare
  };
}