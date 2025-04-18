import { useEffect } from "react";
import Sidebar from "@/components/layout/Sidebar";
import { useParams } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Users, MessageSquare, Video, Calendar } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import UserAvatar from "@/components/ui/UserAvatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Define team-related interfaces
interface TeamMember {
  id: string;
  name: string;
  avatar?: string;
  status?: 'available' | 'busy' | 'away' | 'offline';
  role: string;
}

interface TeamChannel {
  id: string;
  name: string;
  description: string;
  messageCount: number;
}

interface Team {
  id: string;
  name: string;
  description?: string;
  nextMeeting?: string;
  created?: string;
  memberCount?: number;
}

export default function Teams() {
  const { id } = useParams();
  
  const { data: team = {} as Team, isLoading } = useQuery<Team>({
    queryKey: [id ? `/api/teams/${id}` : null],
    enabled: !!id
  });
  
  const { data: members = [] } = useQuery<TeamMember[]>({
    queryKey: [id ? `/api/teams/${id}/members` : null],
    enabled: !!id
  });
  
  const { data: channels = [] } = useQuery<TeamChannel[]>({
    queryKey: [id ? `/api/teams/${id}/channels` : null],
    enabled: !!id
  });
  
  useEffect(() => {
    document.title = id ? `SyncBoard - Team Details` : `SyncBoard - Teams`;
  }, [id]);
  
  if (!id) {
    return (
      <>
        <Sidebar title="Teams" type="teams" />
        <main className="flex-1 flex flex-col items-center justify-center bg-neutral-100">
          <div className="text-center max-w-md px-4">
            <h2 className="text-xl font-semibold mb-2">Select a team</h2>
            <p className="text-neutral-500">
              Choose a team from the sidebar or create a new team
            </p>
            <Button className="mt-4">
              <Plus className="h-4 w-4 mr-2" />
              Create New Team
            </Button>
          </div>
        </main>
      </>
    );
  }
  
  if (isLoading) {
    return (
      <>
        <Sidebar title="Teams" type="teams" />
        <main className="flex-1 p-6 overflow-auto">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-neutral-200 rounded w-48"></div>
            <div className="h-32 bg-neutral-200 rounded"></div>
            <div className="h-64 bg-neutral-200 rounded"></div>
          </div>
        </main>
      </>
    );
  }
  
  return (
    <>
      <Sidebar title="Teams" type="teams" />
      <main className="flex-1 p-6 overflow-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">{team?.name}</h1>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            New Channel
          </Button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center">
                <Users className="h-4 w-4 mr-2 text-primary" />
                Members
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{members.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center">
                <MessageSquare className="h-4 w-4 mr-2 text-primary" />
                Channels
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{channels.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center">
                <Calendar className="h-4 w-4 mr-2 text-primary" />
                Next Meeting
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{team.nextMeeting ? new Date(team.nextMeeting).toLocaleDateString() : "None"}</div>
            </CardContent>
          </Card>
        </div>
        
        <Tabs defaultValue="channels">
          <TabsList>
            <TabsTrigger value="channels">Channels</TabsTrigger>
            <TabsTrigger value="members">Members</TabsTrigger>
            <TabsTrigger value="files">Files</TabsTrigger>
          </TabsList>
          
          <TabsContent value="channels" className="mt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {channels.length === 0 ? (
                <Card className="col-span-full">
                  <CardContent className="pt-6 text-center">
                    <p className="text-neutral-500">No channels found</p>
                    <Button className="mt-4">
                      <Plus className="h-4 w-4 mr-2" />
                      Create Channel
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                channels.map((channel: any) => (
                  <Card key={channel.id}>
                    <CardHeader>
                      <CardTitle>{channel.name}</CardTitle>
                      <CardDescription>{channel.description}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <MessageSquare className="h-4 w-4 mr-2 text-neutral-500" />
                          <span className="text-sm">{channel.messageCount} messages</span>
                        </div>
                        <Button variant="outline" size="sm">
                          Join
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="members" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Team Members</CardTitle>
                <CardDescription>People who have access to this team</CardDescription>
              </CardHeader>
              <CardContent>
                {members.length === 0 ? (
                  <p className="text-center text-neutral-500">No members found</p>
                ) : (
                  <div className="space-y-4">
                    {members.map((member: any) => (
                      <div key={member.id} className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <UserAvatar 
                            src={member.avatar} 
                            name={member.name}
                            status={member.status}
                          />
                          <div>
                            <p className="font-medium">{member.name}</p>
                            <p className="text-xs text-neutral-500">{member.role}</p>
                          </div>
                        </div>
                        <Button variant="ghost" size="sm">Message</Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="files" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Shared Files</CardTitle>
                <CardDescription>Files shared in this team</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-center text-neutral-500 py-4">
                  No files have been shared in this team yet
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </>
  );
}
