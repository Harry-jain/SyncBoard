import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import {
  Grid,
  List,
  Search,
  Filter,
  Download,
  CheckCircle,
  Star,
  Sparkles,
  Tag,
  Package,
  Grid3X3,
  ArrowDownToLine,
  Clock,
  X,
  Loader2
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { queryClient } from '@/lib/queryClient';

// Type definitions
type App = {
  id: number;
  name: string;
  description: string;
  publisher: string;
  icon: string;
  category: string;
  rating: number;
  installed: boolean;
  featured?: boolean;
  new?: boolean;
};

export default function Apps() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [showInstalledOnly, setShowInstalledOnly] = useState(false);
  
  // Fetch apps
  const { data: allApps, isLoading } = useQuery({
    queryKey: ['/api/apps'],
    enabled: !!user
  });
  
  // Install app mutation
  const installMutation = useMutation({
    mutationFn: async (appId: number) => {
      // This would be an API call in a real app
      return new Promise<void>((resolve) => setTimeout(() => resolve(), 1000));
    },
    onSuccess: (_, appId) => {
      // Optimistically update the app's installed status
      queryClient.setQueryData(['/api/apps'], (prevData: App[] | undefined) => {
        if (!prevData) return prevData;
        return prevData.map((app) => app.id === appId ? { ...app, installed: true } : app);
      });
      
      toast({
        title: 'App installed',
        description: 'The app has been installed successfully',
      });
    },
    onError: (error) => {
      toast({
        title: 'Installation failed',
        description: 'There was an error installing the app',
        variant: 'destructive',
      });
    }
  });
  
  // Uninstall app mutation
  const uninstallMutation = useMutation({
    mutationFn: async (appId: number) => {
      // This would be an API call in a real app
      return new Promise<void>((resolve) => setTimeout(() => resolve(), 1000));
    },
    onSuccess: (_, appId) => {
      // Optimistically update the app's installed status
      queryClient.setQueryData(['/api/apps'], (prevData: App[] | undefined) => {
        if (!prevData) return prevData;
        return prevData.map((app) => app.id === appId ? { ...app, installed: false } : app);
      });
      
      toast({
        title: 'App uninstalled',
        description: 'The app has been uninstalled successfully',
      });
    },
    onError: (error) => {
      toast({
        title: 'Uninstallation failed',
        description: 'There was an error uninstalling the app',
        variant: 'destructive',
      });
    }
  });
  
  // Filter apps based on search query, category filter, and installed status
  const filteredApps = allApps?.filter((app: App) => {
    // Filter by search query
    const matchesSearch = 
      searchQuery === '' || 
      app.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.publisher.toLowerCase().includes(searchQuery.toLowerCase());
    
    // Filter by category
    const matchesCategory = !categoryFilter || app.category === categoryFilter;
    
    // Filter by installed status
    const matchesInstalled = !showInstalledOnly || app.installed;
    
    return matchesSearch && matchesCategory && matchesInstalled;
  });
  
  // Get unique categories for filter dropdown
  const categories = allApps ? 
    Array.from(new Set(allApps.map((app: App) => app.category))).sort() : 
    [];
  
  // Handle installing an app
  const handleInstall = (appId: number) => {
    installMutation.mutate(appId);
  };
  
  // Handle uninstalling an app
  const handleUninstall = (appId: number) => {
    uninstallMutation.mutate(appId);
  };
  
  // Render app grid
  const renderAppGrid = () => (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 p-4">
      {filteredApps?.map((app: App) => (
        <Card key={app.id} className={`overflow-hidden transition-all hover:shadow-md ${app.featured ? 'border-primary/50' : ''}`}>
          <CardHeader className="p-4 pb-2 space-y-0">
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-3">
                <div className="bg-muted flex items-center justify-center w-12 h-12 rounded-md">
                  <i className="material-icons text-2xl">{app.icon}</i>
                </div>
                <div>
                  <CardTitle className="text-lg flex items-center">
                    {app.name}
                    {app.new && <Badge variant="secondary" className="ml-2 bg-blue-100 text-blue-800">New</Badge>}
                  </CardTitle>
                  <CardDescription className="text-xs">{app.publisher}</CardDescription>
                </div>
              </div>
              {app.installed && <CheckCircle className="h-5 w-5 text-green-500" />}
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-2">
            <p className="text-sm text-muted-foreground h-10 overflow-hidden">{app.description}</p>
            
            <div className="flex justify-between items-center mt-2">
              <Badge variant="outline">{app.category}</Badge>
              <div className="flex items-center">
                <Star className="h-4 w-4 text-yellow-400 fill-yellow-400" />
                <span className="text-sm ml-1">{app.rating.toFixed(1)}</span>
              </div>
            </div>
          </CardContent>
          <CardFooter className="p-4 pt-0">
            {app.installed ? (
              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => handleUninstall(app.id)}
                disabled={uninstallMutation.isPending && uninstallMutation.variables === app.id}
              >
                {uninstallMutation.isPending && uninstallMutation.variables === app.id ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <X className="h-4 w-4 mr-2" />
                )}
                Uninstall
              </Button>
            ) : (
              <Button 
                className="w-full"
                onClick={() => handleInstall(app.id)}
                disabled={installMutation.isPending && installMutation.variables === app.id}
              >
                {installMutation.isPending && installMutation.variables === app.id ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Download className="h-4 w-4 mr-2" />
                )}
                Install
              </Button>
            )}
          </CardFooter>
        </Card>
      ))}
    </div>
  );
  
  // Render app list
  const renderAppList = () => (
    <div className="p-4 space-y-2">
      {filteredApps?.map((app: App) => (
        <div key={app.id} className={`flex items-center p-3 rounded-md border ${app.featured ? 'border-primary/50' : ''} hover:bg-muted/50`}>
          <div className="bg-muted flex items-center justify-center w-10 h-10 rounded-md mr-3">
            <i className="material-icons">{app.icon}</i>
          </div>
          
          <div className="flex-1 mr-4">
            <div className="flex items-center">
              <h3 className="font-medium">{app.name}</h3>
              {app.new && <Badge variant="secondary" className="ml-2 bg-blue-100 text-blue-800">New</Badge>}
            </div>
            <p className="text-sm text-muted-foreground line-clamp-1">{app.description}</p>
          </div>
          
          <div className="flex items-center gap-3 mr-4">
            <Badge variant="outline">{app.category}</Badge>
            <div className="flex items-center">
              <Star className="h-4 w-4 text-yellow-400 fill-yellow-400" />
              <span className="text-sm ml-1">{app.rating.toFixed(1)}</span>
            </div>
          </div>
          
          {app.installed ? (
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => handleUninstall(app.id)}
              disabled={uninstallMutation.isPending && uninstallMutation.variables === app.id}
            >
              {uninstallMutation.isPending && uninstallMutation.variables === app.id ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <X className="h-4 w-4 mr-2" />
              )}
              Uninstall
            </Button>
          ) : (
            <Button 
              size="sm"
              onClick={() => handleInstall(app.id)}
              disabled={installMutation.isPending && installMutation.variables === app.id}
            >
              {installMutation.isPending && installMutation.variables === app.id ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Download className="h-4 w-4 mr-2" />
              )}
              Install
            </Button>
          )}
        </div>
      ))}
    </div>
  );
  
  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b">
        <h1 className="text-2xl font-bold mb-2">Application Store</h1>
        
        <div className="flex flex-col md:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search apps..."
              className="pl-8"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-2">
                <Filter className="h-4 w-4" />
                Filter
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56">
              <DropdownMenuLabel>Filter by Category</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuItem 
                  onClick={() => setCategoryFilter(null)}
                  className={!categoryFilter ? 'bg-muted' : ''}
                >
                  All Categories
                </DropdownMenuItem>
                {categories.map(category => (
                  <DropdownMenuItem 
                    key={category}
                    onClick={() => setCategoryFilter(category)}
                    className={categoryFilter === category ? 'bg-muted' : ''}
                  >
                    {category}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuItem
                  onClick={() => setShowInstalledOnly(!showInstalledOnly)}
                  className="flex items-center justify-between"
                >
                  <span>Show installed only</span>
                  {showInstalledOnly && <CheckCircle className="h-4 w-4" />}
                </DropdownMenuItem>
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
          
          <div className="flex">
            <Button
              variant={viewMode === 'grid' ? 'default' : 'outline'}
              size="icon"
              className="rounded-r-none"
              onClick={() => setViewMode('grid')}
            >
              <Grid3X3 className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'outline'}
              size="icon"
              className="rounded-l-none"
              onClick={() => setViewMode('list')}
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
      
      <Tabs defaultValue="all" className="flex-1">
        <TabsList className="ml-4 mt-2">
          <TabsTrigger value="all">All Apps</TabsTrigger>
          <TabsTrigger value="featured">Featured</TabsTrigger>
          <TabsTrigger value="installed">Installed</TabsTrigger>
        </TabsList>
        
        <ScrollArea className="h-[calc(100vh-220px)]">
          <TabsContent value="all" className="m-0">
            {isLoading ? (
              <div className="flex justify-center p-16">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : filteredApps?.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-16 text-center">
                <Package className="h-16 w-16 text-muted-foreground mb-4" />
                <h3 className="text-xl font-medium">No apps found</h3>
                <p className="text-muted-foreground">
                  Try adjusting your search or filter criteria
                </p>
              </div>
            ) : viewMode === 'grid' ? (
              renderAppGrid()
            ) : (
              renderAppList()
            )}
          </TabsContent>
          
          <TabsContent value="featured" className="m-0">
            {isLoading ? (
              <div className="flex justify-center p-16">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : viewMode === 'grid' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 p-4">
                {filteredApps?.filter((app: App) => app.featured).map((app: App) => (
                  <Card key={app.id} className="overflow-hidden transition-all hover:shadow-md border-primary/50">
                    <CardHeader className="p-4 pb-2 space-y-0">
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-3">
                          <div className="bg-muted flex items-center justify-center w-12 h-12 rounded-md">
                            <i className="material-icons text-2xl">{app.icon}</i>
                          </div>
                          <div>
                            <CardTitle className="text-lg flex items-center">
                              {app.name}
                              <Badge variant="secondary" className="ml-2 bg-primary/20 text-primary">Featured</Badge>
                            </CardTitle>
                            <CardDescription className="text-xs">{app.publisher}</CardDescription>
                          </div>
                        </div>
                        {app.installed && <CheckCircle className="h-5 w-5 text-green-500" />}
                      </div>
                    </CardHeader>
                    <CardContent className="p-4 pt-2">
                      <p className="text-sm text-muted-foreground h-10 overflow-hidden">{app.description}</p>
                      
                      <div className="flex justify-between items-center mt-2">
                        <Badge variant="outline">{app.category}</Badge>
                        <div className="flex items-center">
                          <Star className="h-4 w-4 text-yellow-400 fill-yellow-400" />
                          <span className="text-sm ml-1">{app.rating.toFixed(1)}</span>
                        </div>
                      </div>
                    </CardContent>
                    <CardFooter className="p-4 pt-0">
                      {app.installed ? (
                        <Button 
                          variant="outline" 
                          className="w-full"
                          onClick={() => handleUninstall(app.id)}
                          disabled={uninstallMutation.isPending && uninstallMutation.variables === app.id}
                        >
                          {uninstallMutation.isPending && uninstallMutation.variables === app.id ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          ) : (
                            <X className="h-4 w-4 mr-2" />
                          )}
                          Uninstall
                        </Button>
                      ) : (
                        <Button 
                          className="w-full"
                          onClick={() => handleInstall(app.id)}
                          disabled={installMutation.isPending && installMutation.variables === app.id}
                        >
                          {installMutation.isPending && installMutation.variables === app.id ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          ) : (
                            <Download className="h-4 w-4 mr-2" />
                          )}
                          Install
                        </Button>
                      )}
                    </CardFooter>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="p-4 space-y-2">
                {filteredApps?.filter((app: App) => app.featured).map((app: App) => (
                  <div key={app.id} className="flex items-center p-3 rounded-md border border-primary/50 hover:bg-muted/50">
                    <div className="bg-muted flex items-center justify-center w-10 h-10 rounded-md mr-3">
                      <i className="material-icons">{app.icon}</i>
                    </div>
                    
                    <div className="flex-1 mr-4">
                      <div className="flex items-center">
                        <h3 className="font-medium">{app.name}</h3>
                        <Badge variant="secondary" className="ml-2 bg-primary/20 text-primary">Featured</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-1">{app.description}</p>
                    </div>
                    
                    <div className="flex items-center gap-3 mr-4">
                      <Badge variant="outline">{app.category}</Badge>
                      <div className="flex items-center">
                        <Star className="h-4 w-4 text-yellow-400 fill-yellow-400" />
                        <span className="text-sm ml-1">{app.rating.toFixed(1)}</span>
                      </div>
                    </div>
                    
                    {app.installed ? (
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleUninstall(app.id)}
                        disabled={uninstallMutation.isPending && uninstallMutation.variables === app.id}
                      >
                        {uninstallMutation.isPending && uninstallMutation.variables === app.id ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <X className="h-4 w-4 mr-2" />
                        )}
                        Uninstall
                      </Button>
                    ) : (
                      <Button 
                        size="sm"
                        onClick={() => handleInstall(app.id)}
                        disabled={installMutation.isPending && installMutation.variables === app.id}
                      >
                        {installMutation.isPending && installMutation.variables === app.id ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Download className="h-4 w-4 mr-2" />
                        )}
                        Install
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="installed" className="m-0">
            {isLoading ? (
              <div className="flex justify-center p-16">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : filteredApps?.filter((app: App) => app.installed).length === 0 ? (
              <div className="flex flex-col items-center justify-center p-16 text-center">
                <Package className="h-16 w-16 text-muted-foreground mb-4" />
                <h3 className="text-xl font-medium">No apps installed</h3>
                <p className="text-muted-foreground">
                  Browse the app store to find and install applications
                </p>
              </div>
            ) : viewMode === 'grid' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 p-4">
                {filteredApps?.filter((app: App) => app.installed).map((app: App) => (
                  <Card key={app.id} className={`overflow-hidden transition-all hover:shadow-md ${app.featured ? 'border-primary/50' : ''}`}>
                    <CardHeader className="p-4 pb-2 space-y-0">
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-3">
                          <div className="bg-muted flex items-center justify-center w-12 h-12 rounded-md">
                            <i className="material-icons text-2xl">{app.icon}</i>
                          </div>
                          <div>
                            <CardTitle className="text-lg">{app.name}</CardTitle>
                            <CardDescription className="text-xs">{app.publisher}</CardDescription>
                          </div>
                        </div>
                        <CheckCircle className="h-5 w-5 text-green-500" />
                      </div>
                    </CardHeader>
                    <CardContent className="p-4 pt-2">
                      <p className="text-sm text-muted-foreground h-10 overflow-hidden">{app.description}</p>
                      
                      <div className="flex justify-between items-center mt-2">
                        <Badge variant="outline">{app.category}</Badge>
                        <div className="flex items-center">
                          <Star className="h-4 w-4 text-yellow-400 fill-yellow-400" />
                          <span className="text-sm ml-1">{app.rating.toFixed(1)}</span>
                        </div>
                      </div>
                    </CardContent>
                    <CardFooter className="p-4 pt-0">
                      <Button 
                        variant="outline" 
                        className="w-full"
                        onClick={() => handleUninstall(app.id)}
                        disabled={uninstallMutation.isPending && uninstallMutation.variables === app.id}
                      >
                        {uninstallMutation.isPending && uninstallMutation.variables === app.id ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <X className="h-4 w-4 mr-2" />
                        )}
                        Uninstall
                      </Button>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="p-4 space-y-2">
                {filteredApps?.filter((app: App) => app.installed).map((app: App) => (
                  <div key={app.id} className={`flex items-center p-3 rounded-md border ${app.featured ? 'border-primary/50' : ''} hover:bg-muted/50`}>
                    <div className="bg-muted flex items-center justify-center w-10 h-10 rounded-md mr-3">
                      <i className="material-icons">{app.icon}</i>
                    </div>
                    
                    <div className="flex-1 mr-4">
                      <h3 className="font-medium">{app.name}</h3>
                      <p className="text-sm text-muted-foreground line-clamp-1">{app.description}</p>
                    </div>
                    
                    <div className="flex items-center gap-3 mr-4">
                      <Badge variant="outline">{app.category}</Badge>
                      <div className="flex items-center">
                        <Star className="h-4 w-4 text-yellow-400 fill-yellow-400" />
                        <span className="text-sm ml-1">{app.rating.toFixed(1)}</span>
                      </div>
                    </div>
                    
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleUninstall(app.id)}
                      disabled={uninstallMutation.isPending && uninstallMutation.variables === app.id}
                    >
                      {uninstallMutation.isPending && uninstallMutation.variables === app.id ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <X className="h-4 w-4 mr-2" />
                      )}
                      Uninstall
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </ScrollArea>
      </Tabs>
    </div>
  );
}