import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import {
  Settings as SettingsIcon,
  User,
  Bell,
  Lock,
  Volume2,
  Eye,
  Moon,
  Sun,
  Languages,
  Mail,
  MessageSquare,
  Users,
  Check,
  ArrowRight,
  Save,
  UserCog,
  Key,
  Monitor,
  Laptop,
  Phone,
  ExternalLink,
  Loader2,
  AccessibilityIcon
} from 'lucide-react';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Slider } from '@/components/ui/slider';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { queryClient, apiRequest } from '@/lib/queryClient';

// Setting form schema
const settingsFormSchema = z.object({
  theme: z.enum(['light', 'dark', 'system']),
  language: z.string(),
  notifications: z.object({
    email: z.boolean(),
    desktop: z.boolean(),
    messages: z.boolean(),
    mentions: z.boolean(),
    teamUpdates: z.boolean(),
  }),
  privacy: z.object({
    showStatus: z.boolean(),
    showLastSeen: z.boolean(),
    allowTagging: z.boolean(),
    autoAcceptMeetings: z.boolean(),
  }),
  sound: z.object({
    masterVolume: z.number().min(0).max(100),
    callVolume: z.number().min(0).max(100),
    notificationVolume: z.number().min(0).max(100),
  }),
  accessibility: z.object({
    highContrast: z.boolean(),
    reducedMotion: z.boolean(),
    largeText: z.boolean(),
    screenReader: z.boolean(),
  }),
});

// Password change schema
const passwordChangeSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

// Profile form schema
const profileFormSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email format'),
  designation: z.string().optional(),
  avatar: z.string().optional(),
  department: z.string().optional(),
});

type SettingsFormValues = z.infer<typeof settingsFormSchema>;
type PasswordChangeValues = z.infer<typeof passwordChangeSchema>;
type ProfileFormValues = z.infer<typeof profileFormSchema>;

export default function Settings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isAvatarUploading, setIsAvatarUploading] = useState(false);
  
  // Fetch user settings
  const { data: settings, isLoading: isLoadingSettings } = useQuery({
    queryKey: ['/api/settings'],
    enabled: !!user
  });
  
  // Initialize forms
  const settingsForm = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsFormSchema),
    defaultValues: {
      theme: 'system',
      language: 'en',
      notifications: {
        email: true,
        desktop: true,
        messages: true,
        mentions: true,
        teamUpdates: true,
      },
      privacy: {
        showStatus: true,
        showLastSeen: true,
        allowTagging: true,
        autoAcceptMeetings: false,
      },
      sound: {
        masterVolume: 80,
        callVolume: 100,
        notificationVolume: 70,
      },
      accessibility: {
        highContrast: false,
        reducedMotion: false,
        largeText: false,
        screenReader: false,
      },
    }
  });
  
  const passwordForm = useForm<PasswordChangeValues>({
    resolver: zodResolver(passwordChangeSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    }
  });
  
  const profileForm = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      name: user?.name || '',
      email: user?.email || '',
      designation: user?.designation || '',
      avatar: user?.avatar || '',
      department: '',
    }
  });
  
  // Update form values when settings are loaded
  useEffect(() => {
    if (settings) {
      settingsForm.reset({
        theme: settings.theme,
        language: settings.language,
        notifications: settings.notifications,
        privacy: settings.privacy,
        sound: settings.sound,
        accessibility: settings.accessibility,
      });
    }
  }, [settings, settingsForm]);
  
  // Update profile form values when user data changes
  useEffect(() => {
    if (user) {
      profileForm.reset({
        name: user.name,
        email: user.email || '',
        designation: user.designation || '',
        avatar: user.avatar || '',
        department: '',
      });
    }
  }, [user, profileForm]);
  
  // Settings update mutation
  const settingsMutation = useMutation({
    mutationFn: async (data: SettingsFormValues) => {
      const res = await apiRequest('POST', '/api/settings', data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/settings'] });
      
      toast({
        title: 'Settings saved',
        description: 'Your settings have been updated successfully',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to save settings',
        description: 'An error occurred while saving your settings',
        variant: 'destructive',
      });
    }
  });
  
  // Password update mutation
  const passwordMutation = useMutation({
    mutationFn: async (data: PasswordChangeValues) => {
      const res = await apiRequest('POST', '/api/user/password', {
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      });
      return await res.json();
    },
    onSuccess: () => {
      passwordForm.reset();
      
      toast({
        title: 'Password updated',
        description: 'Your password has been changed successfully',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to update password',
        description: 'Please check your current password and try again',
        variant: 'destructive',
      });
    }
  });
  
  // Profile update mutation
  const profileMutation = useMutation({
    mutationFn: async (data: ProfileFormValues) => {
      const res = await apiRequest('PATCH', '/api/user', data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/user'] });
      
      toast({
        title: 'Profile updated',
        description: 'Your profile has been updated successfully',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to update profile',
        description: 'An error occurred while updating your profile',
        variant: 'destructive',
      });
    }
  });
  
  // Form submission handlers
  const onSubmitSettings = (data: SettingsFormValues) => {
    settingsMutation.mutate(data);
  };
  
  const onSubmitPassword = (data: PasswordChangeValues) => {
    passwordMutation.mutate(data);
  };
  
  const onSubmitProfile = (data: ProfileFormValues) => {
    profileMutation.mutate(data);
  };
  
  // Mock function for avatar upload
  const handleAvatarUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    // Simulate uploading
    setIsAvatarUploading(true);
    
    // In a real app, you would upload the file to a server here
    setTimeout(() => {
      // Mock successful upload
      const mockAvatarUrl = 'https://ui-avatars.com/api/?name=' + user?.name.split(' ').join('+');
      profileForm.setValue('avatar', mockAvatarUrl);
      setIsAvatarUploading(false);
      
      toast({
        title: 'Avatar uploaded',
        description: 'Your profile picture has been updated',
      });
    }, 1500);
  };
  
  // Render loading state
  if (isLoadingSettings) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  
  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b">
        <h1 className="text-2xl font-bold mb-2">Settings</h1>
        <p className="text-muted-foreground">
          Manage your account settings and preferences.
        </p>
      </div>
      
      <ScrollArea className="flex-1">
        <div className="p-6">
          <Tabs defaultValue="general">
            <div className="flex gap-6">
              <TabsList className="flex flex-col h-auto p-0 bg-transparent space-y-1">
                <TabsTrigger
                  value="general"
                  className="justify-start px-4 py-2 h-9 font-normal data-[state=active]:bg-muted"
                >
                  <SettingsIcon className="h-4 w-4 mr-2" />
                  General
                </TabsTrigger>
                <TabsTrigger
                  value="profile"
                  className="justify-start px-4 py-2 h-9 font-normal data-[state=active]:bg-muted"
                >
                  <User className="h-4 w-4 mr-2" />
                  Profile
                </TabsTrigger>
                <TabsTrigger
                  value="notifications"
                  className="justify-start px-4 py-2 h-9 font-normal data-[state=active]:bg-muted"
                >
                  <Bell className="h-4 w-4 mr-2" />
                  Notifications
                </TabsTrigger>
                <TabsTrigger
                  value="privacy"
                  className="justify-start px-4 py-2 h-9 font-normal data-[state=active]:bg-muted"
                >
                  <Lock className="h-4 w-4 mr-2" />
                  Privacy
                </TabsTrigger>
                <TabsTrigger
                  value="sound"
                  className="justify-start px-4 py-2 h-9 font-normal data-[state=active]:bg-muted"
                >
                  <Volume2 className="h-4 w-4 mr-2" />
                  Sound
                </TabsTrigger>
                <TabsTrigger
                  value="accessibility"
                  className="justify-start px-4 py-2 h-9 font-normal data-[state=active]:bg-muted"
                >
                  <AccessibilityIcon className="h-4 w-4 mr-2" />
                  Accessibility
                </TabsTrigger>
                <TabsTrigger
                  value="password"
                  className="justify-start px-4 py-2 h-9 font-normal data-[state=active]:bg-muted"
                >
                  <Key className="h-4 w-4 mr-2" />
                  Password
                </TabsTrigger>
              </TabsList>
              
              <div className="flex-1 max-w-3xl">
                <Form {...settingsForm}>
                  <TabsContent value="general" className="mt-0">
                    <Card className="border-none shadow-none">
                      <CardHeader>
                        <CardTitle>General Settings</CardTitle>
                        <CardDescription>
                          Configure your general application preferences.
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-6">
                        <div className="space-y-4">
                          <FormField
                            control={settingsForm.control}
                            name="theme"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Theme</FormLabel>
                                <Select
                                  onValueChange={field.onChange}
                                  defaultValue={field.value}
                                >
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select a theme" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="light">
                                      <div className="flex items-center">
                                        <Sun className="h-4 w-4 mr-2" />
                                        Light
                                      </div>
                                    </SelectItem>
                                    <SelectItem value="dark">
                                      <div className="flex items-center">
                                        <Moon className="h-4 w-4 mr-2" />
                                        Dark
                                      </div>
                                    </SelectItem>
                                    <SelectItem value="system">
                                      <div className="flex items-center">
                                        <Monitor className="h-4 w-4 mr-2" />
                                        System
                                      </div>
                                    </SelectItem>
                                  </SelectContent>
                                </Select>
                                <FormDescription>
                                  Select how TeamSync should appear to you.
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={settingsForm.control}
                            name="language"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Language</FormLabel>
                                <Select
                                  onValueChange={field.onChange}
                                  defaultValue={field.value}
                                >
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select a language" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="en">English</SelectItem>
                                    <SelectItem value="es">Español</SelectItem>
                                    <SelectItem value="fr">Français</SelectItem>
                                    <SelectItem value="de">Deutsch</SelectItem>
                                    <SelectItem value="pt">Português</SelectItem>
                                    <SelectItem value="zh">中文</SelectItem>
                                    <SelectItem value="ja">日本語</SelectItem>
                                  </SelectContent>
                                </Select>
                                <FormDescription>
                                  Choose your preferred language for the application interface.
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        
                        <div>
                          <h3 className="text-lg font-medium mb-4">Devices</h3>
                          <div className="space-y-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Laptop className="h-5 w-5 text-muted-foreground" />
                                <div>
                                  <p className="font-medium">MacBook Pro</p>
                                  <p className="text-sm text-muted-foreground">Current device • Last active now</p>
                                </div>
                              </div>
                              <Button variant="outline" size="sm" disabled>
                                Current
                              </Button>
                            </div>
                            
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Phone className="h-5 w-5 text-muted-foreground" />
                                <div>
                                  <p className="font-medium">iPhone 13</p>
                                  <p className="text-sm text-muted-foreground">Last active 2 hours ago</p>
                                </div>
                              </div>
                              <Button variant="outline" size="sm">
                                Sign Out
                              </Button>
                            </div>
                            
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Monitor className="h-5 w-5 text-muted-foreground" />
                                <div>
                                  <p className="font-medium">Office PC</p>
                                  <p className="text-sm text-muted-foreground">Last active yesterday</p>
                                </div>
                              </div>
                              <Button variant="outline" size="sm">
                                Sign Out
                              </Button>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                      <CardFooter>
                        <Button 
                          type="submit" 
                          onClick={settingsForm.handleSubmit(onSubmitSettings)} 
                          disabled={settingsMutation.isPending}
                        >
                          {settingsMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                          Save Changes
                        </Button>
                      </CardFooter>
                    </Card>
                  </TabsContent>
                  
                  <TabsContent value="profile">
                    <Card className="border-none shadow-none">
                      <CardHeader>
                        <CardTitle>Profile Settings</CardTitle>
                        <CardDescription>
                          Update your personal information and profile details.
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-6">
                        <div className="flex flex-col md:flex-row gap-6">
                          <div className="flex flex-col items-center space-y-4">
                            <Avatar className="h-24 w-24">
                              <AvatarImage src={profileForm.watch('avatar')} />
                              <AvatarFallback className="text-2xl">
                                {user?.name?.charAt(0) || 'U'}
                              </AvatarFallback>
                            </Avatar>
                            
                            <div className="flex flex-col items-center">
                              <Label
                                htmlFor="avatar-upload"
                                className="cursor-pointer text-sm font-medium text-primary hover:underline"
                              >
                                Change avatar
                              </Label>
                              <Input
                                id="avatar-upload"
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={handleAvatarUpload}
                                disabled={isAvatarUploading}
                              />
                              {isAvatarUploading && (
                                <div className="flex items-center mt-2">
                                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                  <span className="text-xs text-muted-foreground">Uploading...</span>
                                </div>
                              )}
                            </div>
                          </div>
                          
                          <div className="flex-1 space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <Label htmlFor="name">Full Name</Label>
                                <Input
                                  id="name"
                                  placeholder="Your full name"
                                  {...profileForm.register('name')}
                                />
                                {profileForm.formState.errors.name && (
                                  <p className="text-sm text-destructive mt-1">
                                    {profileForm.formState.errors.name.message}
                                  </p>
                                )}
                              </div>
                              
                              <div>
                                <Label htmlFor="email">Email</Label>
                                <Input
                                  id="email"
                                  type="email"
                                  placeholder="Your email address"
                                  {...profileForm.register('email')}
                                />
                                {profileForm.formState.errors.email && (
                                  <p className="text-sm text-destructive mt-1">
                                    {profileForm.formState.errors.email.message}
                                  </p>
                                )}
                              </div>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <Label htmlFor="designation">Title/Designation</Label>
                                <Input
                                  id="designation"
                                  placeholder="e.g. Math Teacher"
                                  {...profileForm.register('designation')}
                                />
                              </div>
                              
                              <div>
                                <Label htmlFor="department">Department</Label>
                                <Select
                                  onValueChange={(value) => profileForm.setValue('department', value)}
                                  defaultValue={profileForm.watch('department') || ''}
                                >
                                  <SelectTrigger id="department">
                                    <SelectValue placeholder="Select department" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="">None</SelectItem>
                                    <SelectItem value="math">Mathematics</SelectItem>
                                    <SelectItem value="science">Science</SelectItem>
                                    <SelectItem value="english">English</SelectItem>
                                    <SelectItem value="history">History</SelectItem>
                                    <SelectItem value="art">Art</SelectItem>
                                    <SelectItem value="music">Music</SelectItem>
                                    <SelectItem value="physical">Physical Education</SelectItem>
                                    <SelectItem value="admin">Administration</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                      <CardFooter>
                        <Button 
                          type="button" 
                          onClick={() => profileForm.handleSubmit(onSubmitProfile)()}
                          disabled={profileMutation.isPending}
                        >
                          {profileMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                          Save Profile
                        </Button>
                      </CardFooter>
                    </Card>
                  </TabsContent>
                  
                  <TabsContent value="notifications">
                    <Card className="border-none shadow-none">
                      <CardHeader>
                        <CardTitle>Notification Preferences</CardTitle>
                        <CardDescription>
                          Configure how and when you receive notifications.
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-6">
                        <FormField
                          control={settingsForm.control}
                          name="notifications.email"
                          render={({ field }) => (
                            <FormItem className="flex items-center justify-between space-x-2 space-y-0 rounded-md border p-4">
                              <div className="space-y-0.5">
                                <FormLabel className="text-base font-medium">
                                  <div className="flex items-center">
                                    <Mail className="h-4 w-4 mr-2" />
                                    Email Notifications
                                  </div>
                                </FormLabel>
                                <FormDescription>
                                  Receive notifications via email about important updates.
                                </FormDescription>
                              </div>
                              <FormControl>
                                <Switch 
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={settingsForm.control}
                          name="notifications.desktop"
                          render={({ field }) => (
                            <FormItem className="flex items-center justify-between space-x-2 space-y-0 rounded-md border p-4">
                              <div className="space-y-0.5">
                                <FormLabel className="text-base font-medium">
                                  <div className="flex items-center">
                                    <Bell className="h-4 w-4 mr-2" />
                                    Desktop Notifications
                                  </div>
                                </FormLabel>
                                <FormDescription>
                                  Show desktop notifications when the app is running.
                                </FormDescription>
                              </div>
                              <FormControl>
                                <Switch 
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={settingsForm.control}
                          name="notifications.messages"
                          render={({ field }) => (
                            <FormItem className="flex items-center justify-between space-x-2 space-y-0 rounded-md border p-4">
                              <div className="space-y-0.5">
                                <FormLabel className="text-base font-medium">
                                  <div className="flex items-center">
                                    <MessageSquare className="h-4 w-4 mr-2" />
                                    Message Notifications
                                  </div>
                                </FormLabel>
                                <FormDescription>
                                  Get notified when you receive new messages.
                                </FormDescription>
                              </div>
                              <FormControl>
                                <Switch 
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={settingsForm.control}
                          name="notifications.mentions"
                          render={({ field }) => (
                            <FormItem className="flex items-center justify-between space-x-2 space-y-0 rounded-md border p-4">
                              <div className="space-y-0.5">
                                <FormLabel className="text-base font-medium">
                                  <div className="flex items-center">
                                    <User className="h-4 w-4 mr-2" />
                                    Mention Notifications
                                  </div>
                                </FormLabel>
                                <FormDescription>
                                  Get notified when someone mentions you.
                                </FormDescription>
                              </div>
                              <FormControl>
                                <Switch 
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={settingsForm.control}
                          name="notifications.teamUpdates"
                          render={({ field }) => (
                            <FormItem className="flex items-center justify-between space-x-2 space-y-0 rounded-md border p-4">
                              <div className="space-y-0.5">
                                <FormLabel className="text-base font-medium">
                                  <div className="flex items-center">
                                    <Users className="h-4 w-4 mr-2" />
                                    Team Updates
                                  </div>
                                </FormLabel>
                                <FormDescription>
                                  Get notified about updates to teams you're part of.
                                </FormDescription>
                              </div>
                              <FormControl>
                                <Switch 
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                      </CardContent>
                      <CardFooter>
                        <Button 
                          type="submit" 
                          onClick={settingsForm.handleSubmit(onSubmitSettings)}
                          disabled={settingsMutation.isPending}
                        >
                          {settingsMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                          Save Notification Settings
                        </Button>
                      </CardFooter>
                    </Card>
                  </TabsContent>
                  
                  <TabsContent value="privacy">
                    <Card className="border-none shadow-none">
                      <CardHeader>
                        <CardTitle>Privacy Settings</CardTitle>
                        <CardDescription>
                          Manage how your information is displayed and used.
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-6">
                        <FormField
                          control={settingsForm.control}
                          name="privacy.showStatus"
                          render={({ field }) => (
                            <FormItem className="flex items-center justify-between space-x-2 space-y-0 rounded-md border p-4">
                              <div className="space-y-0.5">
                                <FormLabel className="text-base font-medium">
                                  <div className="flex items-center">
                                    <Eye className="h-4 w-4 mr-2" />
                                    Show Online Status
                                  </div>
                                </FormLabel>
                                <FormDescription>
                                  Let others see when you're online.
                                </FormDescription>
                              </div>
                              <FormControl>
                                <Switch 
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={settingsForm.control}
                          name="privacy.showLastSeen"
                          render={({ field }) => (
                            <FormItem className="flex items-center justify-between space-x-2 space-y-0 rounded-md border p-4">
                              <div className="space-y-0.5">
                                <FormLabel className="text-base font-medium">
                                  <div className="flex items-center">
                                    <Clock className="h-4 w-4 mr-2" />
                                    Show Last Seen
                                  </div>
                                </FormLabel>
                                <FormDescription>
                                  Allow others to see when you were last active.
                                </FormDescription>
                              </div>
                              <FormControl>
                                <Switch 
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={settingsForm.control}
                          name="privacy.allowTagging"
                          render={({ field }) => (
                            <FormItem className="flex items-center justify-between space-x-2 space-y-0 rounded-md border p-4">
                              <div className="space-y-0.5">
                                <FormLabel className="text-base font-medium">
                                  <div className="flex items-center">
                                    <User className="h-4 w-4 mr-2" />
                                    Allow Tagging
                                  </div>
                                </FormLabel>
                                <FormDescription>
                                  Let others tag you in messages and documents.
                                </FormDescription>
                              </div>
                              <FormControl>
                                <Switch 
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={settingsForm.control}
                          name="privacy.autoAcceptMeetings"
                          render={({ field }) => (
                            <FormItem className="flex items-center justify-between space-x-2 space-y-0 rounded-md border p-4">
                              <div className="space-y-0.5">
                                <FormLabel className="text-base font-medium">
                                  <div className="flex items-center">
                                    <Check className="h-4 w-4 mr-2" />
                                    Auto-accept Meeting Invites
                                  </div>
                                </FormLabel>
                                <FormDescription>
                                  Automatically accept meeting invitations.
                                </FormDescription>
                              </div>
                              <FormControl>
                                <Switch 
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                      </CardContent>
                      <CardFooter>
                        <Button 
                          type="submit" 
                          onClick={settingsForm.handleSubmit(onSubmitSettings)}
                          disabled={settingsMutation.isPending}
                        >
                          {settingsMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                          Save Privacy Settings
                        </Button>
                      </CardFooter>
                    </Card>
                  </TabsContent>
                  
                  <TabsContent value="sound">
                    <Card className="border-none shadow-none">
                      <CardHeader>
                        <CardTitle>Sound Settings</CardTitle>
                        <CardDescription>
                          Configure volume levels for different audio sources.
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-8">
                        <FormField
                          control={settingsForm.control}
                          name="sound.masterVolume"
                          render={({ field }) => (
                            <FormItem>
                              <div className="flex justify-between">
                                <FormLabel>Master Volume</FormLabel>
                                <span className="text-sm text-muted-foreground">{field.value}%</span>
                              </div>
                              <FormControl>
                                <Slider
                                  min={0}
                                  max={100}
                                  step={1}
                                  defaultValue={[field.value]}
                                  onValueChange={(values) => field.onChange(values[0])}
                                />
                              </FormControl>
                              <FormDescription>
                                Controls the overall volume of the application.
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={settingsForm.control}
                          name="sound.callVolume"
                          render={({ field }) => (
                            <FormItem>
                              <div className="flex justify-between">
                                <FormLabel>Call Volume</FormLabel>
                                <span className="text-sm text-muted-foreground">{field.value}%</span>
                              </div>
                              <FormControl>
                                <Slider
                                  min={0}
                                  max={100}
                                  step={1}
                                  defaultValue={[field.value]}
                                  onValueChange={(values) => field.onChange(values[0])}
                                />
                              </FormControl>
                              <FormDescription>
                                Volume level for audio and video calls.
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={settingsForm.control}
                          name="sound.notificationVolume"
                          render={({ field }) => (
                            <FormItem>
                              <div className="flex justify-between">
                                <FormLabel>Notification Volume</FormLabel>
                                <span className="text-sm text-muted-foreground">{field.value}%</span>
                              </div>
                              <FormControl>
                                <Slider
                                  min={0}
                                  max={100}
                                  step={1}
                                  defaultValue={[field.value]}
                                  onValueChange={(values) => field.onChange(values[0])}
                                />
                              </FormControl>
                              <FormDescription>
                                Volume level for notification sounds.
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </CardContent>
                      <CardFooter>
                        <Button 
                          type="submit" 
                          onClick={settingsForm.handleSubmit(onSubmitSettings)}
                          disabled={settingsMutation.isPending}
                        >
                          {settingsMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                          Save Sound Settings
                        </Button>
                      </CardFooter>
                    </Card>
                  </TabsContent>
                  
                  <TabsContent value="accessibility">
                    <Card className="border-none shadow-none">
                      <CardHeader>
                        <CardTitle>Accessibility</CardTitle>
                        <CardDescription>
                          Configure settings to improve accessibility.
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-6">
                        <FormField
                          control={settingsForm.control}
                          name="accessibility.highContrast"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-center justify-between rounded-md border p-4">
                              <div className="space-y-0.5">
                                <FormLabel className="text-base">High Contrast</FormLabel>
                                <FormDescription>
                                  Increase contrast for better visibility.
                                </FormDescription>
                              </div>
                              <FormControl>
                                <Switch
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={settingsForm.control}
                          name="accessibility.reducedMotion"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-center justify-between rounded-md border p-4">
                              <div className="space-y-0.5">
                                <FormLabel className="text-base">Reduced Motion</FormLabel>
                                <FormDescription>
                                  Minimize animations and motion effects.
                                </FormDescription>
                              </div>
                              <FormControl>
                                <Switch
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={settingsForm.control}
                          name="accessibility.largeText"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-center justify-between rounded-md border p-4">
                              <div className="space-y-0.5">
                                <FormLabel className="text-base">Large Text</FormLabel>
                                <FormDescription>
                                  Increase the size of text throughout the application.
                                </FormDescription>
                              </div>
                              <FormControl>
                                <Switch
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={settingsForm.control}
                          name="accessibility.screenReader"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-center justify-between rounded-md border p-4">
                              <div className="space-y-0.5">
                                <FormLabel className="text-base">Screen Reader Optimization</FormLabel>
                                <FormDescription>
                                  Optimize the interface for screen readers.
                                </FormDescription>
                              </div>
                              <FormControl>
                                <Switch
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                      </CardContent>
                      <CardFooter>
                        <Button 
                          type="submit" 
                          onClick={settingsForm.handleSubmit(onSubmitSettings)}
                          disabled={settingsMutation.isPending}
                        >
                          {settingsMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                          Save Accessibility Settings
                        </Button>
                      </CardFooter>
                    </Card>
                  </TabsContent>
                </Form>
                
                <TabsContent value="password">
                  <Card className="border-none shadow-none">
                    <CardHeader>
                      <CardTitle>Change Password</CardTitle>
                      <CardDescription>
                        Update your password to maintain account security.
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <form className="space-y-4" onSubmit={passwordForm.handleSubmit(onSubmitPassword)}>
                        <div>
                          <Label htmlFor="currentPassword">Current Password</Label>
                          <Input
                            id="currentPassword"
                            type="password"
                            {...passwordForm.register('currentPassword')}
                          />
                          {passwordForm.formState.errors.currentPassword && (
                            <p className="text-sm text-destructive mt-1">
                              {passwordForm.formState.errors.currentPassword.message}
                            </p>
                          )}
                        </div>
                        
                        <div>
                          <Label htmlFor="newPassword">New Password</Label>
                          <Input
                            id="newPassword"
                            type="password"
                            {...passwordForm.register('newPassword')}
                          />
                          {passwordForm.formState.errors.newPassword && (
                            <p className="text-sm text-destructive mt-1">
                              {passwordForm.formState.errors.newPassword.message}
                            </p>
                          )}
                        </div>
                        
                        <div>
                          <Label htmlFor="confirmPassword">Confirm New Password</Label>
                          <Input
                            id="confirmPassword"
                            type="password"
                            {...passwordForm.register('confirmPassword')}
                          />
                          {passwordForm.formState.errors.confirmPassword && (
                            <p className="text-sm text-destructive mt-1">
                              {passwordForm.formState.errors.confirmPassword.message}
                            </p>
                          )}
                        </div>
                        
                        <div className="bg-muted p-3 rounded-md mt-4 text-sm">
                          <h4 className="font-medium mb-2">Password Requirements:</h4>
                          <ul className="space-y-1 list-disc pl-5">
                            <li>At least 8 characters long</li>
                            <li>At least one uppercase letter</li>
                            <li>At least one lowercase letter</li>
                            <li>At least one number</li>
                            <li>At least one special character</li>
                          </ul>
                        </div>
                        
                        <Button 
                          type="submit" 
                          className="w-full"
                          disabled={passwordMutation.isPending}
                        >
                          {passwordMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                          Change Password
                        </Button>
                      </form>
                    </CardContent>
                  </Card>
                </TabsContent>
              </div>
            </div>
          </Tabs>
        </div>
      </ScrollArea>
    </div>
  );
}