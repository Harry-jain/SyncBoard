import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { ProtectedRoute } from '../lib/protected-route';

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import { Calendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { CalendarIcon, PlusCircle, AlertTriangle, Globe, Building } from 'lucide-react';
import { cn } from '@/lib/utils';

// Define the schema for holidays
const holidayFormSchema = z.object({
  title: z.string().min(3, { message: 'Title must be at least 3 characters long' }),
  description: z.string().optional(),
  date: z.date(),
  isUrgent: z.boolean().default(false),
  institutionId: z.number().optional(),
  isGlobal: z.boolean().default(false),
});

type HolidayFormValues = z.infer<typeof holidayFormSchema>;

interface Institution {
  id: number;
  name: string;
  description: string | null;
  location: string | null;
  type: string;
  createdAt: string;
  updatedAt: string;
}

interface Holiday {
  id: number;
  title: string;
  description: string | null;
  date: string;
  isUrgent: boolean;
  createdBy: number;
  institutionId: number | null;
  isGlobal: boolean;
  createdAt: string;
  updatedAt: string;
}

interface HolidayDetailProps {
  holiday: Holiday;
  onClose: () => void;
  onDelete: (id: number) => void;
}

const HolidayDetail: React.FC<HolidayDetailProps> = ({ holiday, onClose, onDelete }) => {
  const { user } = useAuth();
  const [confirmDelete, setConfirmDelete] = useState(false);
  
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-bold">{holiday.title}</h3>
        {(user?.id === holiday.createdBy || user?.role === 'super_admin') && (
          <div className="space-x-2">
            {!confirmDelete ? (
              <Button variant="destructive" onClick={() => setConfirmDelete(true)}>Delete</Button>
            ) : (
              <>
                <Button variant="outline" onClick={() => setConfirmDelete(false)}>Cancel</Button>
                <Button variant="destructive" onClick={() => onDelete(holiday.id)}>Confirm</Button>
              </>
            )}
          </div>
        )}
      </div>
      
      <div className="text-muted-foreground">
        {format(new Date(holiday.date), 'PPP')}
      </div>
      
      {holiday.description && (
        <div className="mt-4">
          <p className="text-sm text-muted-foreground">{holiday.description}</p>
        </div>
      )}
      
      <div className="flex gap-2 mt-2">
        {holiday.isGlobal && (
          <Badge className="flex items-center gap-1">
            <Globe className="h-3 w-3" />
            Global
          </Badge>
        )}
        {holiday.institutionId && (
          <Badge variant="secondary" className="flex items-center gap-1">
            <Building className="h-3 w-3" />
            Institution
          </Badge>
        )}
        {holiday.isUrgent && (
          <Badge variant="destructive" className="flex items-center gap-1">
            <AlertTriangle className="h-3 w-3" />
            Urgent
          </Badge>
        )}
      </div>
      
      <div className="flex justify-end mt-6">
        <Button onClick={onClose}>Close</Button>
      </div>
    </div>
  );
};

function HolidaysPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [date, setDate] = useState<Date>(new Date());
  const [view, setView] = useState<'all' | 'global' | 'institution' | 'urgent'>('all');
  const [selectedHoliday, setSelectedHoliday] = useState<Holiday | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  
  // Get all holidays
  const { data: holidays = [], isLoading } = useQuery<Holiday[]>({
    queryKey: ['/api/holidays'],
    queryFn: () => apiRequest('GET', '/api/holidays').then(res => res.json()),
  });
  
  // Get institutions
  const { data: institutions = [] } = useQuery({
    queryKey: ['/api/institutions'],
    queryFn: () => apiRequest('GET', '/api/institutions').then(res => res.json()),
  });
  
  // Mutation for creating holidays
  const createHolidayMutation = useMutation({
    mutationFn: async (data: HolidayFormValues) => {
      // Convert date to ISO string
      const formattedData = {
        ...data,
        date: data.date.toISOString(),
      };
      
      const response = await apiRequest('POST', '/api/holidays', formattedData);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Holiday created',
        description: 'The holiday has been created successfully.',
      });
      setIsFormOpen(false);
      queryClient.invalidateQueries({ queryKey: ['/api/holidays'] });
    },
    onError: (error) => {
      toast({
        title: 'Error creating holiday',
        description: 'There was an error creating the holiday. Please try again.',
        variant: 'destructive',
      });
    },
  });
  
  // Mutation for deleting holidays
  const deleteHolidayMutation = useMutation({
    mutationFn: async (holidayId: number) => {
      await apiRequest('DELETE', `/api/holidays/${holidayId}`);
    },
    onSuccess: () => {
      toast({
        title: 'Holiday deleted',
        description: 'The holiday has been deleted successfully.',
      });
      setSelectedHoliday(null);
      queryClient.invalidateQueries({ queryKey: ['/api/holidays'] });
    },
    onError: (error) => {
      toast({
        title: 'Error deleting holiday',
        description: 'There was an error deleting the holiday. Please try again.',
        variant: 'destructive',
      });
    },
  });
  
  // Form for creating holidays
  const form = useForm<HolidayFormValues>({
    resolver: zodResolver(holidayFormSchema),
    defaultValues: {
      title: '',
      description: '',
      date: new Date(),
      isUrgent: false,
      isGlobal: false,
    },
  });
  
  // Filter holidays based on the selected view
  const filteredHolidays = holidays.filter(holiday => {
    if (view === 'global') return holiday.isGlobal;
    if (view === 'institution') return !!holiday.institutionId;
    if (view === 'urgent') return holiday.isUrgent;
    return true;
  });
  
  // Get holidays for the selected date
  const holidaysForSelectedDate = holidays.filter(holiday => {
    const holidayDate = new Date(holiday.date);
    return (
      holidayDate.getDate() === date.getDate() &&
      holidayDate.getMonth() === date.getMonth() &&
      holidayDate.getFullYear() === date.getFullYear()
    );
  });
  
  // Function to handle form submission
  const onSubmit = (data: HolidayFormValues) => {
    createHolidayMutation.mutate(data);
  };
  
  // Only allow super admins and teachers to manage holidays
  const canManageHolidays = user && (user.role === 'super_admin' || user.role === 'teacher');
  
  return (
    <div className="container max-w-7xl mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row gap-8">
        <div className="md:w-1/3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle>Holidays & Closures</CardTitle>
              <CardDescription>
                View important dates and holidays
              </CardDescription>
              {canManageHolidays && (
                <div className="mt-2">
                  <Button 
                    onClick={() => setIsFormOpen(true)} 
                    className="w-full"
                  >
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Add Holiday
                  </Button>
                </div>
              )}
            </CardHeader>
            <CardContent>
              <Calendar
                mode="single"
                selected={date}
                onSelect={(date) => date && setDate(date)}
                className="rounded-md border"
                modifiers={{
                  holiday: holidays.map(holiday => new Date(holiday.date)),
                }}
                modifiersStyles={{
                  holiday: { 
                    fontWeight: 'bold',
                    textDecoration: 'underline',
                    color: 'var(--primary)' 
                  }
                }}
              />
            </CardContent>
            <CardFooter className="flex justify-between border-t pt-4">
              <Button 
                variant="outline" 
                onClick={() => setDate(new Date())}
                size="sm"
              >
                Today
              </Button>
              <Tabs defaultValue="all" value={view} onValueChange={(v) => setView(v as any)}>
                <TabsList>
                  <TabsTrigger value="all">All</TabsTrigger>
                  <TabsTrigger value="global">Global</TabsTrigger>
                  <TabsTrigger value="urgent">Urgent</TabsTrigger>
                </TabsList>
              </Tabs>
            </CardFooter>
          </Card>
          
          {holidaysForSelectedDate.length > 0 && (
            <Card className="mt-4">
              <CardHeader className="pb-2">
                <CardTitle>
                  {format(date, 'PPPP')}
                </CardTitle>
                <CardDescription>
                  {holidaysForSelectedDate.length} holiday(s) on this day
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {holidaysForSelectedDate.map(holiday => (
                    <div 
                      key={holiday.id} 
                      className={cn(
                        "p-3 rounded-md cursor-pointer",
                        holiday.isUrgent ? "bg-red-100 dark:bg-red-900/20" : "bg-muted"
                      )}
                      onClick={() => setSelectedHoliday(holiday)}
                    >
                      <div className="font-medium">{holiday.title}</div>
                      {holiday.description && (
                        <div className="text-sm text-muted-foreground">{holiday.description}</div>
                      )}
                      <div className="flex gap-2 mt-2">
                        {holiday.isGlobal && (
                          <Badge>Global</Badge>
                        )}
                        {holiday.isUrgent && (
                          <Badge variant="destructive">Urgent</Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
        
        <div className="md:w-2/3">
          <Card>
            <CardHeader>
              <CardTitle>All Holidays</CardTitle>
              <CardDescription>
                Upcoming holidays and closures
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-8">
                  Loading holidays...
                </div>
              ) : filteredHolidays.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No holidays found.
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredHolidays
                    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                    .map(holiday => (
                      <div 
                        key={holiday.id} 
                        className={cn(
                          "p-4 rounded-md cursor-pointer transition hover:bg-muted/80",
                          holiday.isUrgent ? "bg-red-100 dark:bg-red-900/20" : "bg-muted"
                        )}
                        onClick={() => setSelectedHoliday(holiday)}
                      >
                        <div className="flex justify-between">
                          <div>
                            <div className="font-medium text-lg">{holiday.title}</div>
                            <div className="text-sm text-muted-foreground">
                              {format(new Date(holiday.date), 'PPP')}
                            </div>
                          </div>
                          <div className="flex gap-2">
                            {holiday.isGlobal && (
                              <Badge className="flex items-center gap-1">
                                <Globe className="h-3 w-3" />
                                Global
                              </Badge>
                            )}
                            {holiday.institutionId && (
                              <Badge variant="secondary" className="flex items-center gap-1">
                                <Building className="h-3 w-3" />
                                Institution
                              </Badge>
                            )}
                            {holiday.isUrgent && (
                              <Badge variant="destructive" className="flex items-center gap-1">
                                <AlertTriangle className="h-3 w-3" />
                                Urgent
                              </Badge>
                            )}
                          </div>
                        </div>
                        {holiday.description && (
                          <div className="text-sm text-muted-foreground mt-2">
                            {holiday.description}
                          </div>
                        )}
                      </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
      
      {/* Holiday Detail Dialog */}
      <Dialog open={!!selectedHoliday} onOpenChange={(open) => !open && setSelectedHoliday(null)}>
        <DialogContent className="sm:max-w-[425px]">
          {selectedHoliday && (
            <HolidayDetail 
              holiday={selectedHoliday} 
              onClose={() => setSelectedHoliday(null)}
              onDelete={deleteHolidayMutation.mutate}
            />
          )}
        </DialogContent>
      </Dialog>
      
      {/* New Holiday Dialog */}
      {canManageHolidays && (
        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Create New Holiday</DialogTitle>
              <DialogDescription>
                Add details for a new holiday or closure date. All fields marked with * are required.
              </DialogDescription>
            </DialogHeader>
            
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Title *</FormLabel>
                      <FormControl>
                        <Input placeholder="Holiday title" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Holiday details" {...field} value={field.value || ''} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="date"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Date *</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={"outline"}
                              className={cn(
                                "w-full pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value ? (
                                format(field.value, "PPP")
                              ) : (
                                <span>Pick a date</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={(date) => date && field.onChange(date)}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="isGlobal"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>Global Holiday</FormLabel>
                          <FormDescription>
                            Applies to all institutions
                          </FormDescription>
                        </div>
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="isUrgent"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>Urgent Notice</FormLabel>
                          <FormDescription>
                            Highlight as important
                          </FormDescription>
                        </div>
                      </FormItem>
                    )}
                  />
                </div>
                
                {!form.watch('isGlobal') && institutions.length > 0 && (
                  <FormField
                    control={form.control}
                    name="institutionId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Institution</FormLabel>
                        <Select
                          onValueChange={(value) => field.onChange(value ? parseInt(value) : undefined)}
                          value={field.value?.toString()}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select an institution" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="">None (Personal)</SelectItem>
                            {institutions.map((institution: Institution) => (
                              <SelectItem key={institution.id} value={institution.id.toString()}>
                                {institution.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          If not global, you can specify an institution
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
                
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createHolidayMutation.isPending}>
                    {createHolidayMutation.isPending ? 'Creating...' : 'Create Holiday'}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

// Export a ProtectedRoute component that wraps the Holidays page
export default function ProtectedHolidaysPage() {
  return (
    <ProtectedRoute path="/holidays" component={HolidaysPage} />
  );
}