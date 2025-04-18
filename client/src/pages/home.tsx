import { useEffect } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import UserAvatar from "@/components/ui/UserAvatar";
import {
  BarChart,
  MessageSquare,
  FileText,
  Calendar,
  Video,
  UsersRound
} from "lucide-react";

// Define types for our data
interface ActivityItem {
  id: string;
  user: {
    name: string;
    avatar?: string;
    status?: "available" | "busy" | "away" | "offline";
  };
  action: string;
  target?: string;
  timestamp: string;
}

interface DashboardStats {
  unreadMessages: number;
  upcomingMeetings: number;
  sharedFiles: number;
  scheduledCalls: number;
  teamMembers: number;
  activityScore: number;
}

export default function Home() {
  const [, setLocation] = useLocation();
  
  const { data: recentActivity = [], isLoading: isLoadingActivity } = useQuery<ActivityItem[]>({
    queryKey: ["/api/activity"],
  });
  
  const { data: stats = {} as DashboardStats, isLoading: isLoadingStats } = useQuery<DashboardStats>({
    queryKey: ["/api/stats"],
  });
  
  useEffect(() => {
    document.title = "SyncBoard - Dashboard";
  }, []);
  
  // Type assertion for activity item to handle status
  type ActivityStatus = "available" | "busy" | "away" | "offline";
  
  const ActivityItemComponent = ({ activity }: { activity: ActivityItem }) => {
    return (
      <div className="flex items-start space-x-3 mb-4">
        <UserAvatar 
          src={activity.user.avatar} 
          name={activity.user.name} 
          status={activity.user.status as "available" | "busy" | "away" | "offline" | undefined}
        />
        <div>
          <div className="flex space-x-1">
            <span className="font-medium">{activity.user.name}</span>
            <span>{activity.action}</span>
            {activity.target && (
              <span className="font-medium">{activity.target}</span>
            )}
          </div>
          <div className="text-sm text-neutral-500">
            {new Date(activity.timestamp).toLocaleString()}
          </div>
        </div>
      </div>
    );
  };
  
  const StatCard = ({ icon, title, value, onClick }: { 
    icon: React.ReactNode, 
    title: string, 
    value: number | string,
    onClick: () => void 
  }) => {
    return (
      <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={onClick}>
        <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
          {icon}
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{value}</div>
        </CardContent>
      </Card>
    );
  };
  
  return (
    <div className="flex-1 overflow-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {isLoadingStats ? (
          Array(6).fill(0).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="pb-2">
                <div className="h-5 bg-neutral-200 rounded w-24"></div>
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-neutral-200 rounded w-12"></div>
              </CardContent>
            </Card>
          ))
        ) : (
          <>
            <StatCard 
              icon={<MessageSquare className="h-4 w-4 text-primary" />} 
              title="Unread Messages" 
              value={stats?.unreadMessages || 0} 
              onClick={() => setLocation("/chat")}
            />
            <StatCard 
              icon={<Calendar className="h-4 w-4 text-primary" />} 
              title="Upcoming Meetings" 
              value={stats?.upcomingMeetings || 0} 
              onClick={() => setLocation("/calendar")}
            />
            <StatCard 
              icon={<FileText className="h-4 w-4 text-primary" />} 
              title="Shared Files" 
              value={stats?.sharedFiles || 0} 
              onClick={() => setLocation("/files")}
            />
            <StatCard 
              icon={<Video className="h-4 w-4 text-primary" />} 
              title="Scheduled Calls" 
              value={stats?.scheduledCalls || 0} 
              onClick={() => setLocation("/calls")}
            />
            <StatCard 
              icon={<UsersRound className="h-4 w-4 text-primary" />} 
              title="Team Members" 
              value={stats?.teamMembers || 0} 
              onClick={() => setLocation("/teams")}
            />
            <StatCard 
              icon={<BarChart className="h-4 w-4 text-primary" />} 
              title="Activity Score" 
              value={`${stats?.activityScore || 0}%`} 
              onClick={() => {}}
            />
          </>
        )}
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoadingActivity ? (
            Array(5).fill(0).map((_, i) => (
              <div key={i} className="flex items-start space-x-3 mb-4 animate-pulse">
                <div className="rounded-full bg-neutral-200 h-8 w-8"></div>
                <div className="space-y-2 flex-1">
                  <div className="h-4 bg-neutral-200 rounded w-3/4"></div>
                  <div className="h-3 bg-neutral-200 rounded w-1/3"></div>
                </div>
              </div>
            ))
          ) : recentActivity.length === 0 ? (
            <div className="text-center py-6 text-neutral-500">
              No recent activity
            </div>
          ) : (
            recentActivity.map((activity) => (
              <ActivityItemComponent key={activity.id} activity={activity} />
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
