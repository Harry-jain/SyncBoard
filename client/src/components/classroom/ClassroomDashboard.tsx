import React, { useState, useEffect } from 'react';
import { 
  UsersIcon, 
  BookOpenIcon, 
  CalendarIcon, 
  BarChart3Icon,
  PlusIcon,
  SettingsIcon,
  Share2Icon,
  QrCodeIcon,
  CopyIcon,
  CheckIcon
} from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Alert, AlertDescription } from '../ui/alert';
import { Progress } from '../ui/progress';

interface Classroom {
  id: number;
  name: string;
  subject: string;
  gradeLevel?: string;
  joinCode: string;
  shareableLink: string;
  maxStudents: number;
  isActive: boolean;
  createdAt: string;
}

interface ClassroomStats {
  totalStudents: number;
  activeStudents: number;
  totalAssignments: number;
  pendingSubmissions: number;
  averageGrade: number;
}

interface Assignment {
  id: number;
  title: string;
  assignmentType: string;
  points: number;
  dueDate: string;
  submissionCount: number;
  gradedCount: number;
  isPublished: boolean;
}

interface ClassroomDashboardProps {
  classroom: Classroom;
  userRole: 'teacher' | 'student' | 'co_teacher';
  onNavigateToAssignment: (assignmentId: number) => void;
  onCreateAssignment: () => void;
  onManageStudents: () => void;
}

export const ClassroomDashboard: React.FC<ClassroomDashboardProps> = ({
  classroom,
  userRole,
  onNavigateToAssignment,
  onCreateAssignment,
  onManageStudents
}) => {
  const [stats, setStats] = useState<ClassroomStats>({
    totalStudents: 0,
    activeStudents: 0,
    totalAssignments: 0,
    pendingSubmissions: 0,
    averageGrade: 0
  });
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showJoinCode, setShowJoinCode] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    loadClassroomData();
  }, [classroom.id]);

  const loadClassroomData = async () => {
    try {
      setIsLoading(true);
      
      // Load stats
      const statsResponse = await fetch(`/api/classroom/${classroom.id}/stats`);
      const statsData = await statsResponse.json();
      setStats(statsData);

      // Load assignments
      const assignmentsResponse = await fetch(`/api/classroom/${classroom.id}/assignments`);
      const assignmentsData = await assignmentsResponse.json();
      setAssignments(assignmentsData);
    } catch (error) {
      console.error('Failed to load classroom data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const copyJoinCode = async () => {
    try {
      await navigator.clipboard.writeText(classroom.joinCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy join code:', error);
    }
  };

  const copyShareableLink = async () => {
    try {
      await navigator.clipboard.writeText(classroom.shareableLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy shareable link:', error);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getAssignmentTypeColor = (type: string) => {
    const colors = {
      'document': 'bg-blue-100 text-blue-800',
      'coding': 'bg-green-100 text-green-800',
      'quiz': 'bg-purple-100 text-purple-800',
      'presentation': 'bg-orange-100 text-orange-800'
    };
    return colors[type as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Classroom Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg p-6 text-white">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold mb-2">{classroom.name}</h1>
            <p className="text-blue-100 text-lg">{classroom.subject}</p>
            {classroom.gradeLevel && (
              <Badge variant="secondary" className="mt-2">
                Grade {classroom.gradeLevel}
              </Badge>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowJoinCode(!showJoinCode)}
              className="bg-white/10 border-white/20 text-white hover:bg-white/20"
            >
              <Share2Icon className="h-4 w-4 mr-2" />
              Share
            </Button>
            {userRole === 'teacher' && (
              <Button
                variant="outline"
                size="sm"
                onClick={onCreateAssignment}
                className="bg-white/10 border-white/20 text-white hover:bg-white/20"
              >
                <PlusIcon className="h-4 w-4 mr-2" />
                New Assignment
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Join Code Modal */}
      {showJoinCode && (
        <Card className="border-2 border-blue-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <QrCodeIcon className="h-5 w-5" />
              Share Classroom
            </CardTitle>
            <CardDescription>
              Students can join using either the code or link below
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Join Code</label>
                <div className="flex gap-2">
                  <Input
                    value={classroom.joinCode}
                    readOnly
                    className="text-center text-xl font-mono tracking-wider"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={copyJoinCode}
                    className="px-3"
                  >
                    {copied ? <CheckIcon className="h-4 w-4" /> : <CopyIcon className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Shareable Link</label>
                <div className="flex gap-2">
                  <Input
                    value={classroom.shareableLink}
                    readOnly
                    className="text-sm"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={copyShareableLink}
                    className="px-3"
                  >
                    {copied ? <CheckIcon className="h-4 w-4" /> : <CopyIcon className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            </div>
            <div className="text-center">
              <div className="inline-block p-4 bg-white rounded-lg border-2 border-gray-200">
                <div className="w-32 h-32 bg-gray-100 rounded flex items-center justify-center">
                  <QrCodeIcon className="h-16 w-16 text-gray-400" />
                </div>
              </div>
              <p className="text-sm text-gray-600 mt-2">QR Code: {classroom.joinCode}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <UsersIcon className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Students</p>
                <p className="text-2xl font-bold">{stats.totalStudents}</p>
                <p className="text-xs text-green-600">{stats.activeStudents} active</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <BookOpenIcon className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Assignments</p>
                <p className="text-2xl font-bold">{stats.totalAssignments}</p>
                <p className="text-xs text-orange-600">{stats.pendingSubmissions} pending</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <BarChart3Icon className="h-8 w-8 text-purple-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Average Grade</p>
                <p className="text-2xl font-bold">{stats.averageGrade}%</p>
                <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                  <div 
                    className="bg-purple-600 h-2 rounded-full" 
                    style={{ width: `${stats.averageGrade}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <CalendarIcon className="h-8 w-8 text-orange-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Created</p>
                <p className="text-lg font-bold">{formatDate(classroom.createdAt)}</p>
                <p className="text-xs text-gray-500">Class started</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="assignments" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="assignments">Assignments</TabsTrigger>
          <TabsTrigger value="students">Students</TabsTrigger>
          <TabsTrigger value="notebook">Notebook</TabsTrigger>
        </TabsList>

        <TabsContent value="assignments" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Recent Assignments</h2>
            {userRole === 'teacher' && (
              <Button onClick={onCreateAssignment}>
                <PlusIcon className="h-4 w-4 mr-2" />
                New Assignment
              </Button>
            )}
          </div>

          {assignments.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <BookOpenIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No assignments yet</h3>
                <p className="text-gray-600 mb-4">
                  {userRole === 'teacher' 
                    ? 'Create your first assignment to get started'
                    : 'No assignments have been posted yet'
                  }
                </p>
                {userRole === 'teacher' && (
                  <Button onClick={onCreateAssignment}>
                    <PlusIcon className="h-4 w-4 mr-2" />
                    Create Assignment
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {assignments.map((assignment) => (
                <Card 
                  key={assignment.id} 
                  className="hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => onNavigateToAssignment(assignment.id)}
                >
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-medium">{assignment.title}</h3>
                          <Badge className={getAssignmentTypeColor(assignment.assignmentType)}>
                            {assignment.assignmentType}
                          </Badge>
                          {!assignment.isPublished && (
                            <Badge variant="outline">Draft</Badge>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 mb-2">
                          Due: {formatDate(assignment.dueDate)} • {assignment.points} points
                        </p>
                        <div className="flex items-center gap-4 text-sm text-gray-500">
                          <span>{assignment.submissionCount} submissions</span>
                          <span>{assignment.gradedCount} graded</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-gray-500">
                          {assignment.submissionCount > 0 ? (
                            <div className="w-16 bg-gray-200 rounded-full h-2">
                              <div 
                                className="bg-blue-600 h-2 rounded-full" 
                                style={{ 
                                  width: `${(assignment.gradedCount / assignment.submissionCount) * 100}%` 
                                }}
                              ></div>
                            </div>
                          ) : (
                            <span>No submissions</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="students" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Students ({stats.totalStudents})</h2>
            {userRole === 'teacher' && (
              <Button variant="outline" onClick={onManageStudents}>
                <SettingsIcon className="h-4 w-4 mr-2" />
                Manage Students
              </Button>
            )}
          </div>
          
          <Card>
            <CardContent className="p-6">
              <div className="text-center">
                <UsersIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Student Management</h3>
                <p className="text-gray-600 mb-4">
                  View and manage student enrollment, grades, and activity
                </p>
                <Button onClick={onManageStudents}>
                  <SettingsIcon className="h-4 w-4 mr-2" />
                  Manage Students
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notebook" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Class Notebook</h2>
            <Button variant="outline">
              <PlusIcon className="h-4 w-4 mr-2" />
              New Page
            </Button>
          </div>
          
          <Card>
            <CardContent className="p-6">
              <div className="text-center">
                <BookOpenIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Collaborative Notebook</h3>
                <p className="text-gray-600 mb-4">
                  Create and share notes, resources, and collaborative content
                </p>
                <Button>
                  <PlusIcon className="h-4 w-4 mr-2" />
                  Open Notebook
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};