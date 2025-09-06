import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { webrtcService } from '@/lib/webrtc-service';
import { useCall } from '@/hooks/use-call';

export default function WebRTCTest() {
  const [isInitialized, setIsInitialized] = useState(false);
  const [testResults, setTestResults] = useState<Array<{
    test: string;
    status: 'pending' | 'pass' | 'fail';
    message: string;
  }>>([]);
  const callManager = useCall();

  useEffect(() => {
    initializeWebRTC();
  }, []);

  const initializeWebRTC = async () => {
    try {
      await webrtcService.initialize();
      setIsInitialized(true);
      addTestResult('WebRTC Initialization', 'pass', 'WebRTC service initialized successfully');
    } catch (error) {
      addTestResult('WebRTC Initialization', 'fail', `Failed to initialize: ${error}`);
    }
  };

  const addTestResult = (test: string, status: 'pending' | 'pass' | 'fail', message: string) => {
    setTestResults(prev => [...prev, { test, status, message }]);
  };

  const testMediaPermissions = async () => {
    addTestResult('Media Permissions', 'pending', 'Testing media permissions...');
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: true, 
        video: true 
      });
      
      if (stream.getAudioTracks().length > 0 && stream.getVideoTracks().length > 0) {
        addTestResult('Media Permissions', 'pass', 'Audio and video permissions granted');
        stream.getTracks().forEach(track => track.stop());
      } else {
        addTestResult('Media Permissions', 'fail', 'Media permissions not fully granted');
      }
    } catch (error) {
      addTestResult('Media Permissions', 'fail', `Media permission denied: ${error}`);
    }
  };

  const testScreenShare = async () => {
    addTestResult('Screen Share', 'pending', 'Testing screen share permissions...');
    
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true
      });
      
      if (stream.getVideoTracks().length > 0) {
        addTestResult('Screen Share', 'pass', 'Screen share permissions granted');
        stream.getTracks().forEach(track => track.stop());
      } else {
        addTestResult('Screen Share', 'fail', 'Screen share permissions not granted');
      }
    } catch (error) {
      addTestResult('Screen Share', 'fail', `Screen share permission denied: ${error}`);
    }
  };

  const testWebRTCConnection = async () => {
    addTestResult('WebRTC Connection', 'pending', 'Testing WebRTC peer connection...');
    
    try {
      // Create a simple peer connection test
      const pc = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
      });
      
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          addTestResult('WebRTC Connection', 'pass', 'ICE candidates generated successfully');
        }
      };
      
      pc.oniceconnectionstatechange = () => {
        if (pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed') {
          addTestResult('WebRTC Connection', 'pass', 'ICE connection established');
        }
      };
      
      // Close the connection after a short test
      setTimeout(() => {
        pc.close();
      }, 2000);
      
    } catch (error) {
      addTestResult('WebRTC Connection', 'fail', `WebRTC connection failed: ${error}`);
    }
  };

  const testCallFunctionality = async () => {
    addTestResult('Call Functionality', 'pending', 'Testing call functionality...');
    
    try {
      // Test starting a call (this will fail without a real target, but we can test the setup)
      await callManager.startCall('test_user', { audio: true, video: true });
      addTestResult('Call Functionality', 'pass', 'Call functionality initialized');
    } catch (error) {
      addTestResult('Call Functionality', 'fail', `Call functionality test failed: ${error}`);
    }
  };

  const runAllTests = async () => {
    setTestResults([]);
    
    await testMediaPermissions();
    await testScreenShare();
    await testWebRTCConnection();
    await testCallFunctionality();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pass': return 'bg-green-500';
      case 'fail': return 'bg-red-500';
      default: return 'bg-yellow-500';
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            WebRTC Test Suite
            <Badge variant={isInitialized ? 'default' : 'secondary'}>
              {isInitialized ? 'Initialized' : 'Not Initialized'}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex space-x-2">
            <Button onClick={testMediaPermissions} disabled={!isInitialized}>
              Test Media Permissions
            </Button>
            <Button onClick={testScreenShare} disabled={!isInitialized}>
              Test Screen Share
            </Button>
            <Button onClick={testWebRTCConnection} disabled={!isInitialized}>
              Test WebRTC Connection
            </Button>
            <Button onClick={testCallFunctionality} disabled={!isInitialized}>
              Test Call Functionality
            </Button>
            <Button onClick={runAllTests} disabled={!isInitialized}>
              Run All Tests
            </Button>
          </div>
          
          <div className="space-y-2">
            <h3 className="font-semibold">Test Results:</h3>
            {testResults.length === 0 ? (
              <p className="text-gray-500">No tests run yet</p>
            ) : (
              <div className="space-y-2">
                {testResults.map((result, index) => (
                  <div key={index} className="flex items-center space-x-3 p-2 bg-gray-50 rounded">
                    <div className={`w-3 h-3 rounded-full ${getStatusColor(result.status)}`} />
                    <div className="flex-1">
                      <div className="font-medium">{result.test}</div>
                      <div className="text-sm text-gray-600">{result.message}</div>
                    </div>
                    <Badge variant={result.status === 'pass' ? 'default' : result.status === 'fail' ? 'destructive' : 'secondary'}>
                      {result.status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <h4 className="font-semibold text-blue-900 mb-2">WebRTC Status:</h4>
            <div className="text-sm text-blue-800 space-y-1">
              <div>• WebRTC Service: {isInitialized ? '✅ Ready' : '❌ Not Ready'}</div>
              <div>• Call State: {callManager.isInCall ? '📞 In Call' : '📱 Available'}</div>
              <div>• Participants: {callManager.participants.length}</div>
              <div>• Audio: {callManager.isMuted ? '🔇 Muted' : '🔊 Unmuted'}</div>
              <div>• Video: {callManager.isVideoEnabled ? '📹 Enabled' : '📷 Disabled'}</div>
              <div>• Screen Share: {callManager.isScreenSharing ? '🖥️ Sharing' : '📱 Not Sharing'}</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}