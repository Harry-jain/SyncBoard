import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import {
  Gamepad2,
  Search,
  Filter,
  Trophy,
  Users,
  Clock,
  Info,
  Play,
  Lock,
  BookOpen,
  School,
  Star,
  CheckCircle,
  XCircle,
  Settings,
  Loader2,
  ChevronDown,
  UserPlus,
  Sparkles,
  UserCheck
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Progress } from '@/components/ui/progress';
import { Label } from '@/components/ui/label';
import { queryClient } from '@/lib/queryClient';
import { apiRequest } from '@/lib/queryClient';
import { InsertGameAccess } from '@shared/schema';

// Type definitions
type Game = {
  id: number;
  name: string;
  description: string;
  difficulty: 'easy' | 'medium' | 'hard';
  category: string;
  highScore: number;
  playCount: number;
  ageRange: string;
};

type GameAccess = {
  id: number;
  studentId: number;
  teacherId: number;
  gameId: number;
  granted: boolean;
  createdAt: Date;
  student?: {
    id: number;
    name: string;
    username?: string;
  };
  teacher?: {
    id: number;
    name: string;
    username?: string;
  };
};

export default function Games() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [difficultyFilter, setDifficultyFilter] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);
  const [showAccessDialog, setShowAccessDialog] = useState(false);
  const [showStudentManagementDialog, setShowStudentManagementDialog] = useState(false);
  
  // Fetch available games
  const { data: games, isLoading: isLoadingGames } = useQuery({
    queryKey: ['/api/games'],
    enabled: !!user
  });
  
  // For students, fetch their game access
  const { data: studentAccess, isLoading: isLoadingAccess } = useQuery({
    queryKey: ['/api/games/access/student'],
    enabled: !!user && user.role === 'student'
  });
  
  // For teachers, fetch all game access they manage
  const { data: gameAccessList, isLoading: isLoadingGameAccess } = useQuery({
    queryKey: ['/api/games/access'],
    enabled: !!user && (user.role === 'teacher' || user.role === 'admin' || user.role === 'super_admin')
  });
  
  // For teachers, fetch students they can grant access to
  const { data: students, isLoading: isLoadingStudents } = useQuery({
    queryKey: ['/api/users/students'],
    enabled: !!user && (user.role === 'teacher' || user.role === 'admin' || user.role === 'super_admin')
  });
  
  // Mutation to manage game access
  const manageAccessMutation = useMutation({
    mutationFn: async ({ studentId, gameId, granted }: { studentId: number, gameId: number, granted: boolean }) => {
      const res = await apiRequest('POST', '/api/games/access', { studentId, gameId, granted });
      return await res.json();
    },
    onSuccess: () => {
      // Invalidate the game access query to refresh the data
      queryClient.invalidateQueries({ queryKey: ['/api/games/access'] });
      queryClient.invalidateQueries({ queryKey: ['/api/games/access/student'] });
      
      toast({
        title: 'Access updated',
        description: 'Game access has been updated successfully',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to update access',
        description: 'There was an error updating game access',
        variant: 'destructive',
      });
    }
  });
  
  // Check if student has access to a game
  const hasAccess = (gameId: number) => {
    if (user?.role === 'teacher' || user?.role === 'admin' || user?.role === 'super_admin') {
      return true; // Teachers and admins always have access
    }
    
    if (!studentAccess) return false;
    
    // Check if student has granted access
    return studentAccess.some((access) => 
      access.gameId === gameId && access.granted
    );
  };
  
  // Check if a specific student has access to a specific game
  const studentHasAccess = (studentId: number, gameId: number) => {
    if (!gameAccessList) return false;
    
    // Check if student has granted access
    return gameAccessList.some((access) => 
      access.studentId === studentId && access.gameId === gameId && access.granted
    );
  };
  
  // Filter games based on search query and filters
  const filteredGames = games?.filter((game: Game) => {
    // Filter by search query
    const matchesSearch = 
      searchQuery === '' || 
      game.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      game.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      game.category.toLowerCase().includes(searchQuery.toLowerCase());
    
    // Filter by difficulty
    const matchesDifficulty = !difficultyFilter || game.difficulty === difficultyFilter;
    
    // Filter by category
    const matchesCategory = !categoryFilter || game.category === categoryFilter;
    
    return matchesSearch && matchesDifficulty && matchesCategory;
  });
  
  // Handle granting or revoking access
  const handleAccessChange = (studentId: number, gameId: number, granted: boolean) => {
    manageAccessMutation.mutate({ studentId, gameId, granted });
  };
  
  // Render teacher access management dialog
  const renderAccessManagementDialog = () => {
    if (!selectedGame) return null;
    
    return (
      <Dialog open={showAccessDialog} onOpenChange={setShowAccessDialog}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Manage Student Access for {selectedGame.name}</DialogTitle>
            <DialogDescription>
              Grant or revoke student access to this game. Students will only be able to play the game if access is granted.
            </DialogDescription>
          </DialogHeader>
          
          <div className="mt-4">
            <div className="flex justify-between mb-4">
              <Input
                placeholder="Search students..."
                className="max-w-sm"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <Button 
                onClick={() => setShowStudentManagementDialog(true)}
                className="gap-2"
              >
                <UserPlus className="h-4 w-4" />
                Add Students
              </Button>
            </div>
            
            <div className="border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student</TableHead>
                    <TableHead>Access Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoadingGameAccess ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center py-4">
                        <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                      </TableCell>
                    </TableRow>
                  ) : gameAccessList?.filter((access) => access.gameId === selectedGame.id).length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center py-4 text-muted-foreground">
                        No students have been granted access to this game yet.
                      </TableCell>
                    </TableRow>
                  ) : (
                    gameAccessList?.filter((access) => access.gameId === selectedGame.id).map((access) => (
                      <TableRow key={access.id}>
                        <TableCell className="font-medium">
                          {access.student?.name || `Student #${access.studentId}`}
                        </TableCell>
                        <TableCell>
                          {access.granted ? (
                            <Badge variant="success" className="bg-green-100 text-green-800">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Granted
                            </Badge>
                          ) : (
                            <Badge variant="destructive" className="bg-red-100 text-red-800">
                              <XCircle className="h-3 w-3 mr-1" />
                              Revoked
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant={access.granted ? "destructive" : "default"}
                            size="sm"
                            onClick={() => handleAccessChange(access.studentId, selectedGame.id, !access.granted)}
                            disabled={manageAccessMutation.isPending}
                          >
                            {access.granted ? "Revoke Access" : "Grant Access"}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
          
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setShowAccessDialog(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  };
  
  // Render student management dialog
  const renderStudentManagementDialog = () => {
    if (!selectedGame) return null;
    
    return (
      <Dialog open={showStudentManagementDialog} onOpenChange={setShowStudentManagementDialog}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Add Students to {selectedGame.name}</DialogTitle>
            <DialogDescription>
              Select students to grant access to this game.
            </DialogDescription>
          </DialogHeader>
          
          <div className="mt-4">
            <Input
              placeholder="Search students by name..."
              className="mb-4"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            
            <div className="border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student</TableHead>
                    <TableHead>Current Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoadingStudents ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center py-4">
                        <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                      </TableCell>
                    </TableRow>
                  ) : students?.filter(s => 
                      !searchQuery || s.name.toLowerCase().includes(searchQuery.toLowerCase())
                    ).length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center py-4 text-muted-foreground">
                        No matching students found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    students?.filter(s => 
                      !searchQuery || s.name.toLowerCase().includes(searchQuery.toLowerCase())
                    ).map((student) => (
                      <TableRow key={student.id}>
                        <TableCell className="font-medium">
                          {student.name}
                        </TableCell>
                        <TableCell>
                          {studentHasAccess(student.id, selectedGame.id) ? (
                            <Badge variant="success" className="bg-green-100 text-green-800">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Granted
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-muted-foreground">
                              <XCircle className="h-3 w-3 mr-1" />
                              No Access
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant={studentHasAccess(student.id, selectedGame.id) ? "outline" : "default"}
                            size="sm"
                            onClick={() => handleAccessChange(
                              student.id, 
                              selectedGame.id, 
                              !studentHasAccess(student.id, selectedGame.id)
                            )}
                            disabled={manageAccessMutation.isPending}
                          >
                            {studentHasAccess(student.id, selectedGame.id) ? (
                              <>
                                <XCircle className="h-4 w-4 mr-1" />
                                Remove Access
                              </>
                            ) : (
                              <>
                                <UserCheck className="h-4 w-4 mr-1" />
                                Grant Access
                              </>
                            )}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
          
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setShowStudentManagementDialog(false)}>
              Cancel
            </Button>
            <Button onClick={() => {
              setShowStudentManagementDialog(false);
              // We don't need to do anything here as the changes are made immediately
            }}>
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  };
  
  // Render difficulty badge
  const renderDifficultyBadge = (difficulty: string) => {
    switch (difficulty) {
      case 'easy':
        return <Badge variant="outline" className="bg-green-100 text-green-800 border-green-200">Easy</Badge>;
      case 'medium':
        return <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-200">Medium</Badge>;
      case 'hard':
        return <Badge variant="outline" className="bg-red-100 text-red-800 border-red-200">Hard</Badge>;
      default:
        return <Badge variant="outline">{difficulty}</Badge>;
    }
  };
  
  // Render game cards
  const renderGameCards = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
      {filteredGames?.map((game: Game) => {
        const canPlay = hasAccess(game.id);
        
        return (
          <Card key={game.id} className={`overflow-hidden transition-all hover:shadow-md ${canPlay ? '' : 'opacity-80'}`}>
            <CardHeader className="p-4 pb-2">
              <div className="flex justify-between items-start">
                <CardTitle className="text-lg flex items-center">
                  {game.name}
                  {renderDifficultyBadge(game.difficulty)}
                </CardTitle>
              </div>
              <CardDescription>{game.category} • Age {game.ageRange}</CardDescription>
            </CardHeader>
            
            <CardContent className="p-4 pt-2">
              <p className="text-sm text-muted-foreground mb-4">{game.description}</p>
              
              <div className="flex items-center justify-between text-sm text-muted-foreground mb-2">
                <div className="flex items-center">
                  <Trophy className="h-4 w-4 mr-1" />
                  <span>High Score: {game.highScore}</span>
                </div>
                <div className="flex items-center">
                  <Users className="h-4 w-4 mr-1" />
                  <span>{game.playCount} plays</span>
                </div>
              </div>
            </CardContent>
            
            <CardFooter className="p-4 pt-0 flex justify-between">
              {user?.role === 'teacher' || user?.role === 'admin' || user?.role === 'super_admin' ? (
                <Button 
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSelectedGame(game);
                    setShowAccessDialog(true);
                  }}
                >
                  <Settings className="h-4 w-4 mr-2" />
                  Manage Access
                </Button>
              ) : (
                <div></div>
              )}
              
              <Button 
                disabled={!canPlay}
                onClick={() => {
                  // In a real app, this would launch the game
                  toast({
                    title: 'Game Launched',
                    description: `You are now playing ${game.name}`,
                  });
                }}
              >
                {canPlay ? (
                  <>
                    <Play className="h-4 w-4 mr-2" />
                    Play
                  </>
                ) : (
                  <>
                    <Lock className="h-4 w-4 mr-2" />
                    Locked
                  </>
                )}
              </Button>
            </CardFooter>
          </Card>
        );
      })}
    </div>
  );
  
  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b">
        <h1 className="text-2xl font-bold mb-2">Educational Games</h1>
        
        <div className="flex flex-col md:flex-row gap-2 mb-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search games..."
              className="pl-8"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          
          <div className="flex flex-wrap gap-2">
            <Button
              variant={!difficultyFilter ? 'default' : 'outline'}
              size="sm"
              onClick={() => setDifficultyFilter(null)}
            >
              All Levels
            </Button>
            
            <Button
              variant={difficultyFilter === 'easy' ? 'default' : 'outline'}
              size="sm"
              className={difficultyFilter === 'easy' ? 'bg-green-600 hover:bg-green-700' : 'text-green-600 border-green-200 hover:bg-green-50'}
              onClick={() => setDifficultyFilter('easy')}
            >
              Easy
            </Button>
            
            <Button
              variant={difficultyFilter === 'medium' ? 'default' : 'outline'}
              size="sm"
              className={difficultyFilter === 'medium' ? 'bg-yellow-600 hover:bg-yellow-700' : 'text-yellow-600 border-yellow-200 hover:bg-yellow-50'}
              onClick={() => setDifficultyFilter('medium')}
            >
              Medium
            </Button>
            
            <Button
              variant={difficultyFilter === 'hard' ? 'default' : 'outline'}
              size="sm"
              className={difficultyFilter === 'hard' ? 'bg-red-600 hover:bg-red-700' : 'text-red-600 border-red-200 hover:bg-red-50'}
              onClick={() => setDifficultyFilter('hard')}
            >
              Hard
            </Button>
          </div>
        </div>
        
        <div className="flex flex-wrap gap-2">
          <Button
            variant={!categoryFilter ? 'secondary' : 'outline'}
            size="sm"
            onClick={() => setCategoryFilter(null)}
          >
            All Categories
          </Button>
          
          <Button
            variant={categoryFilter === 'mathematics' ? 'secondary' : 'outline'}
            size="sm"
            onClick={() => setCategoryFilter('mathematics')}
          >
            Mathematics
          </Button>
          
          <Button
            variant={categoryFilter === 'programming' ? 'secondary' : 'outline'}
            size="sm"
            onClick={() => setCategoryFilter('programming')}
          >
            Programming
          </Button>
          
          <Button
            variant={categoryFilter === 'history' ? 'secondary' : 'outline'}
            size="sm"
            onClick={() => setCategoryFilter('history')}
          >
            History
          </Button>
          
          <Button
            variant={categoryFilter === 'science' ? 'secondary' : 'outline'}
            size="sm"
            onClick={() => setCategoryFilter('science')}
          >
            Science
          </Button>
          
          <Button
            variant={categoryFilter === 'language' ? 'secondary' : 'outline'}
            size="sm"
            onClick={() => setCategoryFilter('language')}
          >
            Language
          </Button>
        </div>
      </div>
      
      <Tabs defaultValue="all" className="flex-1">
        <TabsList className="ml-4 mt-2">
          <TabsTrigger value="all">
            <Gamepad2 className="h-4 w-4 mr-2" />
            All Games
          </TabsTrigger>
          <TabsTrigger value="accessible">
            <CheckCircle className="h-4 w-4 mr-2" />
            Accessible Games
          </TabsTrigger>
          {(user?.role === 'teacher' || user?.role === 'admin' || user?.role === 'super_admin') && (
            <TabsTrigger value="manage">
              <Settings className="h-4 w-4 mr-2" />
              Manage Access
            </TabsTrigger>
          )}
        </TabsList>
        
        <ScrollArea className="h-[calc(100vh-200px)]">
          <TabsContent value="all" className="m-0">
            {isLoadingGames ? (
              <div className="flex justify-center p-16">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : filteredGames?.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-16 text-center">
                <Gamepad2 className="h-16 w-16 text-muted-foreground mb-4" />
                <h3 className="text-xl font-medium">No games found</h3>
                <p className="text-muted-foreground">
                  Try adjusting your search or filter criteria
                </p>
              </div>
            ) : (
              renderGameCards()
            )}
          </TabsContent>
          
          <TabsContent value="accessible" className="m-0">
            {isLoadingGames || isLoadingAccess ? (
              <div className="flex justify-center p-16">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : filteredGames?.filter((game: Game) => hasAccess(game.id)).length === 0 ? (
              <div className="flex flex-col items-center justify-center p-16 text-center">
                <Lock className="h-16 w-16 text-muted-foreground mb-4" />
                <h3 className="text-xl font-medium">No accessible games</h3>
                <p className="text-muted-foreground">
                  {user?.role === 'student' 
                    ? 'You do not have access to any games yet. Contact your teacher for access.'
                    : 'No games found matching your criteria.'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
                {filteredGames?.filter((game: Game) => hasAccess(game.id)).map((game: Game) => (
                  <Card key={game.id} className="overflow-hidden transition-all hover:shadow-md">
                    <CardHeader className="p-4 pb-2">
                      <div className="flex justify-between items-start">
                        <CardTitle className="text-lg flex items-center">
                          {game.name}
                          {renderDifficultyBadge(game.difficulty)}
                        </CardTitle>
                      </div>
                      <CardDescription>{game.category} • Age {game.ageRange}</CardDescription>
                    </CardHeader>
                    
                    <CardContent className="p-4 pt-2">
                      <p className="text-sm text-muted-foreground mb-4">{game.description}</p>
                      
                      <div className="flex items-center justify-between text-sm text-muted-foreground mb-2">
                        <div className="flex items-center">
                          <Trophy className="h-4 w-4 mr-1" />
                          <span>High Score: {game.highScore}</span>
                        </div>
                        <div className="flex items-center">
                          <Users className="h-4 w-4 mr-1" />
                          <span>{game.playCount} plays</span>
                        </div>
                      </div>
                    </CardContent>
                    
                    <CardFooter className="p-4 pt-0 flex justify-end">
                      <Button 
                        onClick={() => {
                          // In a real app, this would launch the game
                          toast({
                            title: 'Game Launched',
                            description: `You are now playing ${game.name}`,
                          });
                        }}
                      >
                        <Play className="h-4 w-4 mr-2" />
                        Play
                      </Button>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
          
          {(user?.role === 'teacher' || user?.role === 'admin' || user?.role === 'super_admin') && (
            <TabsContent value="manage" className="m-0">
              {isLoadingGames || isLoadingGameAccess || isLoadingStudents ? (
                <div className="flex justify-center p-16">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <div className="p-4">
                  <h2 className="text-xl font-semibold mb-4">Manage Student Access</h2>
                  
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Game</TableHead>
                          <TableHead>Students with Access</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {games?.map((game: Game) => {
                          const accessCount = gameAccessList?.filter(
                            (access) => access.gameId === game.id && access.granted
                          ).length || 0;
                          
                          return (
                            <TableRow key={game.id}>
                              <TableCell className="font-medium">
                                <div className="flex items-center">
                                  <Gamepad2 className="h-4 w-4 mr-2 text-muted-foreground" />
                                  {game.name}
                                </div>
                                <span className="text-xs text-muted-foreground block mt-1">
                                  {game.category} • {renderDifficultyBadge(game.difficulty)}
                                </span>
                              </TableCell>
                              <TableCell>
                                {accessCount > 0 ? (
                                  <Badge className="bg-primary/20 text-primary">
                                    {accessCount} student{accessCount !== 1 ? 's' : ''}
                                  </Badge>
                                ) : (
                                  <span className="text-muted-foreground text-sm">No access granted</span>
                                )}
                              </TableCell>
                              <TableCell className="text-right">
                                <Button
                                  variant="outline"
                                  onClick={() => {
                                    setSelectedGame(game);
                                    setShowAccessDialog(true);
                                  }}
                                >
                                  Manage Access
                                </Button>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
            </TabsContent>
          )}
        </ScrollArea>
      </Tabs>
      
      {renderAccessManagementDialog()}
      {renderStudentManagementDialog()}
    </div>
  );
}