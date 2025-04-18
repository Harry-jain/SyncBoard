import React, { useState, useEffect } from 'react';
import { Calendar as CalendarUI } from '@/components/ui/calendar';
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
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
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
import { useAuth } from '@/hooks/use-auth';
import { CalendarIcon, PlusCircle, Clock, MapPin } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { ProtectedRoute } from '../lib/protected-route';

// Define the schema for calendar events
const eventFormSchema = z.object({
  title: z.string().min(3, { message: 'Title must be at least 3 characters long' }),
  description: z.string().optional(),
  startTime: z.date(),
  endTime: z.date(),
  location: z.string().optional(),
  isAllDay: z.boolean().default(false),
  teamId: z.number().optional(),
  isRecurring: z.boolean().default(false),
  recurrencePattern: z.string().optional(),
  attendees: z.array(z.number()).optional(),
});

type EventFormValues = z.infer<typeof eventFormSchema>;

interface CalendarEvent {
  id: number;
  title: string;
  description: string | null;
  startTime: string;
  endTime: string;
  location: string | null;
  isAllDay: boolean;
  createdBy: number;
  teamId: number | null;
  isRecurring: boolean;
  recurrencePattern: string | null;
  createdAt: string;
  updatedAt: string;
  currentUserStatus?: string;
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

interface EventAttendee {
  id: number;
  eventId: number;
  userId: number;
  status: string;
  createdAt: string;
  updatedAt: string;
  user: {
    id: number;
    name: string;
    avatar: string | null;
    role: string;
  };
}

interface Team {
  id: number;
  name: string;
  description?: string;
  createdBy: number;
  institutionId?: number;
  createdAt: string;
  updatedAt: string;
}

interface User {
  id: number;
  name: string;
  username: string;
  email: string;
  role: string;
  avatar?: string | null;
  status?: string;
  institutionId?: number | null;
}

interface EventDetailProps {
  event: CalendarEvent;
  onClose: () => void;
  onDelete: (id: number) => void;
}

const EventDetail: React.FC<EventDetailProps> = ({ event, onClose, onDelete }) => {
  const { user } = useAuth();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [attendanceStatus, setAttendanceStatus] = useState(event.currentUserStatus || 'no_response');

  const { data: attendees } = useQuery({
    queryKey: ['/api/calendar-events', event.id, 'attendees'],
    queryFn: ({ queryKey }) => apiRequest(
      'GET', 
      `/api/calendar-events/${queryKey[1]}/attendees`
    ).then(res => res.json()),
    enabled: !!event.id
  });

  const updateAttendanceMutation = useMutation({
    mutationFn: async ({ attendeeId, status }: { attendeeId: number, status: string }) => {
      const response = await apiRequest('PATCH', `/api/event-attendees/${attendeeId}`, { status });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/calendar-events'] });
      queryClient.invalidateQueries({ queryKey: ['/api/calendar-events', event.id, 'attendees'] });
    }
  });

  const handleAttendanceUpdate = (status: string) => {
    const attendee = attendees?.find((a: EventAttendee) => a.userId === user?.id);
    if (attendee) {
      updateAttendanceMutation.mutate({ attendeeId: attendee.id, status });
      setAttendanceStatus(status);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-bold">{event.title}</h3>
        {(user?.id === event.createdBy || user?.role === 'super_admin' || user?.role === 'teacher') && (
          <div className="space-x-2">
            {!confirmDelete ? (
              <Button variant="destructive" onClick={() => setConfirmDelete(true)}>Delete</Button>
            ) : (
              <>
                <Button variant="outline" onClick={() => setConfirmDelete(false)}>Cancel</Button>
                <Button variant="destructive" onClick={() => onDelete(event.id)}>Confirm</Button>
              </>
            )}
          </div>
        )}
      </div>
      
      <div className="flex items-center gap-2 text-muted-foreground">
        <Clock className="h-4 w-4" />
        <span>
          {event.isAllDay 
            ? format(new Date(event.startTime), 'PPP') 
            : `${format(new Date(event.startTime), 'PPP p')} - ${format(new Date(event.endTime), 'p')}`}
        </span>
      </div>
      
      {event.location && (
        <div className="flex items-center gap-2 text-muted-foreground">
          <MapPin className="h-4 w-4" />
          <span>{event.location}</span>
        </div>
      )}
      
      {event.description && (
        <div className="mt-4">
          <h4 className="font-semibold mb-1">Description</h4>
          <p className="text-sm text-muted-foreground">{event.description}</p>
        </div>
      )}
      
      {attendees && attendees.length > 0 && (
        <div className="mt-4">
          <h4 className="font-semibold mb-2">Attendees</h4>
          <div className="grid grid-cols-2 gap-2">
            {attendees.map((attendee: EventAttendee) => (
              <div key={attendee.id} className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                  {attendee.user.avatar ? (
                    <img src={attendee.user.avatar} alt={attendee.user.name} className="h-8 w-8 rounded-full" />
                  ) : (
                    <span className="text-xs">{attendee.user.name.charAt(0)}</span>
                  )}
                </div>
                <div>
                  <div className="text-sm font-medium">{attendee.user.name}</div>
                  <div className="text-xs text-muted-foreground">
                    <Badge variant={
                      attendee.status === 'accepted' ? 'default' : 
                      attendee.status === 'declined' ? 'destructive' : 
                      'outline'
                    }>
                      {attendee.status}
                    </Badge>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Attendance Response Buttons */}
      {user && (
        <div className="mt-4">
          <h4 className="font-semibold mb-2">Your Response</h4>
          <div className="flex gap-2">
            <Button 
              size="sm" 
              variant={attendanceStatus === 'accepted' ? 'default' : 'outline'}
              onClick={() => handleAttendanceUpdate('accepted')}
            >
              Accept
            </Button>
            <Button 
              size="sm" 
              variant={attendanceStatus === 'tentative' ? 'default' : 'outline'}
              onClick={() => handleAttendanceUpdate('tentative')}
            >
              Maybe
            </Button>
            <Button 
              size="sm" 
              variant={attendanceStatus === 'declined' ? 'default' : 'outline'}
              onClick={() => handleAttendanceUpdate('declined')}
            >
              Decline
            </Button>
          </div>
        </div>
      )}
      
      <div className="flex justify-end mt-6">
        <Button onClick={onClose}>Close</Button>
      </div>
    </div>
  );
};

// Define the Calendar component
function CalendarPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [date, setDate] = useState<Date>(new Date());
  const [view, setView] = useState<'month' | 'week' | 'day'>('month');
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  
  // Get all events
  const { data: events = [], isLoading: isLoadingEvents } = useQuery<CalendarEvent[]>({
    queryKey: ['/api/calendar-events'],
    queryFn: () => apiRequest('GET', '/api/calendar-events').then(res => res.json()),
  });
  
  // Get holidays
  const { data: holidays = [], isLoading: isLoadingHolidays } = useQuery<Holiday[]>({
    queryKey: ['/api/holidays'],
    queryFn: () => apiRequest('GET', '/api/holidays').then(res => res.json()),
  });

  // Get teams for team selection
  const { data: teams = [] } = useQuery({
    queryKey: ['/api/teams'],
    queryFn: () => apiRequest('GET', '/api/teams').then(res => res.json()),
  });

  // Get users for attendee selection
  const { data: users = [] } = useQuery({
    queryKey: ['/api/users'],
    queryFn: () => apiRequest('GET', '/api/users').then(res => res.json()),
  });
  
  // Mutation for creating events
  const createEventMutation = useMutation({
    mutationFn: async (data: EventFormValues) => {
      // Convert dates to ISO strings
      const formattedData = {
        ...data,
        startTime: data.startTime.toISOString(),
        endTime: data.endTime.toISOString(),
      };
      
      const response = await apiRequest('POST', '/api/calendar-events', formattedData);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Event created',
        description: 'Your event has been created successfully.',
      });
      setIsFormOpen(false);
      queryClient.invalidateQueries({ queryKey: ['/api/calendar-events'] });
    },
    onError: (error) => {
      toast({
        title: 'Error creating event',
        description: 'There was an error creating your event. Please try again.',
        variant: 'destructive',
      });
    },
  });
  
  // Mutation for deleting events
  const deleteEventMutation = useMutation({
    mutationFn: async (eventId: number) => {
      await apiRequest('DELETE', `/api/calendar-events/${eventId}`);
    },
    onSuccess: () => {
      toast({
        title: 'Event deleted',
        description: 'The event has been deleted successfully.',
      });
      setSelectedEvent(null);
      queryClient.invalidateQueries({ queryKey: ['/api/calendar-events'] });
    },
    onError: (error) => {
      toast({
        title: 'Error deleting event',
        description: 'There was an error deleting the event. Please try again.',
        variant: 'destructive',
      });
    },
  });
  
  // Form for creating events
  const form = useForm<EventFormValues>({
    resolver: zodResolver(eventFormSchema),
    defaultValues: {
      title: '',
      description: '',
      startTime: new Date(),
      endTime: new Date(new Date().setHours(new Date().getHours() + 1)),
      location: '',
      isAllDay: false,
      isRecurring: false,
      recurrencePattern: '',
      attendees: [],
    },
  });
  
  // Get events for the current day
  const eventsForSelectedDate = events.filter(event => {
    const eventDate = new Date(event.startTime);
    return (
      eventDate.getDate() === date.getDate() &&
      eventDate.getMonth() === date.getMonth() &&
      eventDate.getFullYear() === date.getFullYear()
    );
  });
  
  // Get holidays for the current day
  const holidaysForSelectedDate = holidays.filter(holiday => {
    const holidayDate = new Date(holiday.date);
    return (
      holidayDate.getDate() === date.getDate() &&
      holidayDate.getMonth() === date.getMonth() &&
      holidayDate.getFullYear() === date.getFullYear()
    );
  });
  
  // Function to handle form submission
  const onSubmit = (data: EventFormValues) => {
    createEventMutation.mutate(data);
  };
  
  // Effect to update end time when start time changes
  useEffect(() => {
    const startTime = form.watch('startTime');
    const endTime = form.watch('endTime');
    
    if (startTime > endTime) {
      form.setValue('endTime', new Date(new Date(startTime).setHours(startTime.getHours() + 1)));
    }
  }, [form.watch('startTime')]);
  
  return (
    <div className="container max-w-7xl mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row gap-8">
        <div className="md:w-1/3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle>Calendar</CardTitle>
              <CardDescription>
                Manage your schedule and events
              </CardDescription>
              <div className="mt-2">
                <Button 
                  onClick={() => setIsFormOpen(true)} 
                  className="w-full"
                >
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Add Event
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <CalendarUI
                mode="single"
                selected={date}
                onSelect={(date) => date && setDate(date)}
                className="rounded-md border"
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
              <div className="flex space-x-2">
                <Button 
                  variant={view === 'month' ? 'default' : 'outline'} 
                  onClick={() => setView('month')}
                  size="sm"
                >
                  Month
                </Button>
                <Button 
                  variant={view === 'week' ? 'default' : 'outline'} 
                  onClick={() => setView('week')}
                  size="sm"
                >
                  Week
                </Button>
                <Button 
                  variant={view === 'day' ? 'default' : 'outline'} 
                  onClick={() => setView('day')}
                  size="sm"
                >
                  Day
                </Button>
              </div>
            </CardFooter>
          </Card>
          
          {holidaysForSelectedDate.length > 0 && (
            <Card className="mt-4">
              <CardHeader className="pb-2">
                <CardTitle>Holidays</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {holidaysForSelectedDate.map(holiday => (
                    <div 
                      key={holiday.id} 
                      className={cn(
                        "p-3 rounded-md",
                        holiday.isUrgent ? "bg-red-100 dark:bg-red-900/20" : "bg-muted"
                      )}
                    >
                      <div className="font-medium">{holiday.title}</div>
                      {holiday.description && (
                        <div className="text-sm text-muted-foreground">{holiday.description}</div>
                      )}
                      {holiday.isGlobal && (
                        <Badge className="mt-1">Global Holiday</Badge>
                      )}
                      {holiday.isUrgent && (
                        <Badge variant="destructive" className="mt-1">Urgent</Badge>
                      )}
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
              <CardTitle>
                {format(date, 'PPPP')}
              </CardTitle>
              <CardDescription>
                {eventsForSelectedDate.length} events scheduled for today
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingEvents ? (
                <div className="text-center py-8">
                  Loading events...
                </div>
              ) : eventsForSelectedDate.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No events scheduled for today.
                </div>
              ) : (
                <div className="space-y-2">
                  {eventsForSelectedDate.map(event => (
                    <div 
                      key={event.id} 
                      className="p-3 rounded-md bg-muted hover:bg-muted/80 cursor-pointer"
                      onClick={() => setSelectedEvent(event)}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-medium">{event.title}</div>
                          <div className="text-sm text-muted-foreground">
                            {event.isAllDay 
                              ? 'All day' 
                              : `${format(new Date(event.startTime), 'p')} - ${format(new Date(event.endTime), 'p')}`}
                          </div>
                          {event.location && (
                            <div className="text-sm text-muted-foreground flex items-center mt-1">
                              <MapPin className="h-3 w-3 mr-1" />
                              {event.location}
                            </div>
                          )}
                        </div>
                        <Badge 
                          variant={
                            event.currentUserStatus === 'accepted' ? 'default' : 
                            event.currentUserStatus === 'declined' ? 'destructive' : 
                            'outline'
                          }
                        >
                          {event.currentUserStatus === 'accepted' ? 'Going' : 
                           event.currentUserStatus === 'declined' ? 'Not Going' :
                           event.currentUserStatus === 'tentative' ? 'Maybe' :
                           'No Response'}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
      
      {/* Event Detail Dialog */}
      <Dialog open={!!selectedEvent} onOpenChange={(open) => !open && setSelectedEvent(null)}>
        <DialogContent className="sm:max-w-[425px]">
          {selectedEvent && (
            <EventDetail 
              event={selectedEvent} 
              onClose={() => setSelectedEvent(null)}
              onDelete={deleteEventMutation.mutate}
            />
          )}
        </DialogContent>
      </Dialog>
      
      {/* New Event Dialog */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Create New Event</DialogTitle>
            <DialogDescription>
              Add details for your new calendar event. All fields marked with * are required.
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
                      <Input placeholder="Event title" {...field} />
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
                      <Textarea placeholder="Event details" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="startTime"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Start Time *</FormLabel>
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
                                format(field.value, "PPP p")
                              ) : (
                                <span>Pick a date</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <CalendarUI
                            mode="single"
                            selected={field.value}
                            onSelect={(date) => {
                              if (date) {
                                const newDate = new Date(date);
                                newDate.setHours(field.value.getHours());
                                newDate.setMinutes(field.value.getMinutes());
                                field.onChange(newDate);
                              }
                            }}
                            initialFocus
                          />
                          <div className="p-3 border-t border-border">
                            <Input
                              type="time"
                              value={format(field.value, "HH:mm")}
                              onChange={(e) => {
                                const [hours, minutes] = e.target.value.split(":");
                                const newDate = new Date(field.value);
                                newDate.setHours(parseInt(hours));
                                newDate.setMinutes(parseInt(minutes));
                                field.onChange(newDate);
                              }}
                            />
                          </div>
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="endTime"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>End Time *</FormLabel>
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
                                format(field.value, "PPP p")
                              ) : (
                                <span>Pick a date</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <CalendarUI
                            mode="single"
                            selected={field.value}
                            onSelect={(date) => {
                              if (date) {
                                const newDate = new Date(date);
                                newDate.setHours(field.value.getHours());
                                newDate.setMinutes(field.value.getMinutes());
                                field.onChange(newDate);
                              }
                            }}
                            initialFocus
                          />
                          <div className="p-3 border-t border-border">
                            <Input
                              type="time"
                              value={format(field.value, "HH:mm")}
                              onChange={(e) => {
                                const [hours, minutes] = e.target.value.split(":");
                                const newDate = new Date(field.value);
                                newDate.setHours(parseInt(hours));
                                newDate.setMinutes(parseInt(minutes));
                                field.onChange(newDate);
                              }}
                            />
                          </div>
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <FormField
                control={form.control}
                name="isAllDay"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>All day event</FormLabel>
                      <FormDescription>
                        This event will take the entire day
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Location</FormLabel>
                    <FormControl>
                      <Input placeholder="Event location" {...field} value={field.value || ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {teams.length > 0 && (
                <FormField
                  control={form.control}
                  name="teamId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Team</FormLabel>
                      <Select
                        onValueChange={(value) => field.onChange(parseInt(value))}
                        value={field.value?.toString()}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a team" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="">Personal Event</SelectItem>
                          {teams.map((team: Team) => (
                            <SelectItem key={team.id} value={team.id.toString()}>
                              {team.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Team events are visible to all team members
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
              
              <FormField
                control={form.control}
                name="attendees"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Attendees</FormLabel>
                    <div className="flex flex-col space-y-2">
                      {users.map((user: User) => (
                        <div key={user.id} className="flex space-x-2 items-center">
                          <Checkbox
                            id={`user-${user.id}`}
                            checked={field.value?.includes(user.id)}
                            onCheckedChange={(checked) => {
                              const updatedAttendees = checked
                                ? [...(field.value || []), user.id]
                                : (field.value || []).filter((id) => id !== user.id);
                              field.onChange(updatedAttendees);
                            }}
                          />
                          <Label htmlFor={`user-${user.id}`} className="text-sm">
                            {user.name} ({user.role})
                          </Label>
                        </div>
                      ))}
                    </div>
                    <FormDescription>
                      Select users to invite to this event
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createEventMutation.isPending}>
                  {createEventMutation.isPending ? 'Creating...' : 'Create Event'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Export a ProtectedRoute component that wraps the Calendar page
export default function ProtectedCalendarPage() {
  return (
    <ProtectedRoute path="/calendar" component={CalendarPage} />
  );
}