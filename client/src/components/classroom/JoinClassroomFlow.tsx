import React, { useState, useEffect } from 'react';
import { QrCodeIcon, UsersIcon, LinkIcon, ClipboardIcon } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Alert, AlertDescription } from '../ui/alert';
import { Badge } from '../ui/badge';

interface JoinClassroomFlowProps {
  onJoinSuccess: (classroomId: number) => void;
  onJoinError: (error: string) => void;
}

interface JoinResult {
  success: boolean;
  classroomId?: number;
  message: string;
  requiresApproval?: boolean;
}

export const JoinClassroomFlow: React.FC<JoinClassroomFlowProps> = ({
  onJoinSuccess,
  onJoinError
}) => {
  const [joinCode, setJoinCode] = useState('');
  const [shareableLink, setShareableLink] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [qrCodeData, setQrCodeData] = useState('');

  // Generate QR code data for current join code
  useEffect(() => {
    if (joinCode.length === 7) {
      setQrCodeData(`syncboard://join/${joinCode}`);
    }
  }, [joinCode]);

  const handleJoinCodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (joinCode.length !== 7) {
      setError('Please enter a valid 7-digit join code');
      return;
    }

    await joinClassroom('code', joinCode);
  };

  const handleLinkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shareableLink) {
      setError('Please enter a valid shareable link');
      return;
    }

    // Extract token from link
    const token = shareableLink.split('/').pop();
    if (!token) {
      setError('Invalid shareable link format');
      return;
    }

    await joinClassroom('link', token);
  };

  const joinClassroom = async (method: string, value: string) => {
    setIsLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/classroom/join', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          method,
          value,
        }),
      });

      const result: JoinResult = await response.json();

      if (result.success) {
        setSuccess(result.message);
        if (result.classroomId) {
          setTimeout(() => {
            onJoinSuccess(result.classroomId!);
          }, 2000);
        }
      } else {
        setError(result.message);
        onJoinError(result.message);
      }
    } catch (err) {
      const errorMessage = 'Failed to join classroom. Please try again.';
      setError(errorMessage);
      onJoinError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCodeInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (value.length <= 7) {
      setJoinCode(value);
      setError('');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    // You could add a toast notification here
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Join Classroom</h1>
        <p className="text-gray-600">Enter your class code or use a shareable link to get started</p>
      </div>

      <Tabs defaultValue="code" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="code" className="flex items-center gap-2">
            <UsersIcon className="h-4 w-4" />
            Join Code
          </TabsTrigger>
          <TabsTrigger value="link" className="flex items-center gap-2">
            <LinkIcon className="h-4 w-4" />
            Shareable Link
          </TabsTrigger>
        </TabsList>

        <TabsContent value="code" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Enter Class Code</CardTitle>
              <CardDescription>
                Ask your teacher for the 7-digit class code
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleJoinCodeSubmit} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">
                    Class Code
                  </label>
                  <Input
                    type="text"
                    placeholder="Enter 7-digit code"
                    value={joinCode}
                    onChange={handleCodeInput}
                    className="text-center text-2xl font-mono tracking-wider uppercase"
                    maxLength={7}
                    disabled={isLoading}
                  />
                  <div className="text-xs text-gray-500 text-center">
                    {joinCode.length}/7 characters
                  </div>
                </div>

                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={joinCode.length !== 7 || isLoading}
                >
                  {isLoading ? 'Joining...' : 'Join Classroom'}
                </Button>
              </form>

              {/* QR Code Display */}
              {qrCodeData && (
                <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                  <div className="text-center">
                    <p className="text-sm font-medium text-gray-700 mb-2">
                      Or scan this QR code:
                    </p>
                    <div className="inline-block p-4 bg-white rounded-lg border-2 border-gray-200">
                      {/* QR Code would be rendered here */}
                      <div className="w-32 h-32 bg-gray-100 rounded flex items-center justify-center">
                        <QrCodeIcon className="h-16 w-16 text-gray-400" />
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      {joinCode}
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="link" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Use Shareable Link</CardTitle>
              <CardDescription>
                Paste the shareable link provided by your teacher
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleLinkSubmit} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">
                    Shareable Link
                  </label>
                  <Input
                    type="url"
                    placeholder="https://syncboard.com/join/..."
                    value={shareableLink}
                    onChange={(e) => setShareableLink(e.target.value)}
                    disabled={isLoading}
                  />
                </div>

                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={!shareableLink || isLoading}
                >
                  {isLoading ? 'Joining...' : 'Join Classroom'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Status Messages */}
      {error && (
        <Alert className="mt-6" variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="mt-6" variant="default">
          <AlertDescription className="flex items-center gap-2">
            <Badge variant="secondary">Success</Badge>
            {success}
          </AlertDescription>
        </Alert>
      )}

      {/* Help Section */}
      <Card className="mt-6">
        <CardContent className="pt-6">
          <div className="text-center space-y-2">
            <h3 className="font-medium text-gray-900">Need Help?</h3>
            <p className="text-sm text-gray-600">
              Don't have a code or link? Contact your teacher or check your email for an invitation.
            </p>
            <div className="flex justify-center gap-4 mt-4">
              <Button variant="outline" size="sm">
                <ClipboardIcon className="h-4 w-4 mr-2" />
                Copy Help Text
              </Button>
              <Button variant="outline" size="sm">
                Contact Support
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};