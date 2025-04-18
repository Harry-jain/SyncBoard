import { 
  User, InsertUser, 
  Team, InsertTeam, 
  Channel, InsertChannel,
  TeamMember, InsertTeamMember,
  Conversation, InsertConversation,
  ConversationParticipant, InsertConversationParticipant,
  Message, InsertMessage,
  Document, InsertDocument,
  DocumentComment, InsertDocumentComment,
  File, InsertFile,
  Activity, InsertActivity,
  Institution, InsertInstitution,
  CodingEnvironment, InsertCodingEnvironment,
  GithubRepository, InsertGithubRepository,
  GameAccess, InsertGameAccess,
  CalendarEvent, InsertCalendarEvent,
  EventAttendee, InsertEventAttendee,
  Holiday, InsertHoliday,
  CalendarNotification, InsertCalendarNotification,
  users, teams, teamMembers, channels, conversations, 
  conversationParticipants, messages, documents, documentComments,
  files, activities, institutions, codingEnvironments,
  githubRepositories, gameAccess, calendarEvents, eventAttendees,
  holidays, calendarNotifications
} from "@shared/schema";
import { eq, and, gte, lte } from "drizzle-orm";
import { db } from "./db";
import session from "express-session";
import { createSessionStore } from "./session";

// Interface for storage operations
export interface IStorage {
  // User operations
  getUsers(): Promise<User[]>;
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserBySupabaseId(supabaseId: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, user: Partial<User>): Promise<User | undefined>;
  updateUserStatus(id: number, status: string): Promise<User | undefined>;
  
  // Institution operations
  getInstitutions(): Promise<Institution[]>;
  getInstitution(id: number): Promise<Institution | undefined>;
  createInstitution(institution: InsertInstitution): Promise<Institution>;
  
  // Team operations
  getTeams(): Promise<Team[]>;
  getTeam(id: number): Promise<Team | undefined>;
  createTeam(team: InsertTeam): Promise<Team>;
  
  // Team member operations
  getTeamMembers(teamId: number): Promise<TeamMember[]>;
  addTeamMember(member: InsertTeamMember): Promise<TeamMember>;
  
  // Channel operations
  getChannelsByTeamId(teamId: number): Promise<Channel[]>;
  getChannel(id: number): Promise<Channel | undefined>;
  createChannel(channel: InsertChannel): Promise<Channel>;
  
  // Conversation operations
  getConversations(): Promise<Conversation[]>;
  getConversation(id: number): Promise<Conversation | undefined>;
  getConversationsByParticipants(userIds: number[]): Promise<Conversation[]>;
  createConversation(conversation: InsertConversation): Promise<Conversation>;
  
  // Conversation participant operations
  getConversationParticipants(conversationId: number): Promise<ConversationParticipant[]>;
  addConversationParticipant(participant: InsertConversationParticipant): Promise<ConversationParticipant>;
  
  // Message operations
  getMessagesByConversationId(conversationId: number): Promise<Message[]>;
  createMessage(message: InsertMessage): Promise<Message>;
  
  // Document operations
  getDocuments(): Promise<Document[]>;
  getDocumentsByUser(userId: number): Promise<Document[]>;
  getDocumentsByConversationId(conversationId: number): Promise<Document[]>;
  getDocument(id: number): Promise<Document | undefined>;
  createDocument(document: InsertDocument): Promise<Document>;
  updateDocument(id: number, content: Partial<Document>): Promise<Document | undefined>;
  deleteDocument(id: number): Promise<void>;
  
  // Document comment operations
  getDocumentComments(documentId: number): Promise<DocumentComment[]>;
  createDocumentComment(comment: InsertDocumentComment): Promise<DocumentComment>;
  
  // File operations
  getFiles(): Promise<File[]>;
  getFilesByConversationId(conversationId: number): Promise<File[]>;
  getFilesByTeamId(teamId: number): Promise<File[]>;
  createFile(file: InsertFile): Promise<File>;
  
  // Activity operations
  getActivities(): Promise<Activity[]>;
  createActivity(activity: InsertActivity): Promise<Activity>;
  
  // Coding environment operations
  getCodingEnvironments(userId: number): Promise<CodingEnvironment[]>;
  getCodingEnvironment(id: number): Promise<CodingEnvironment | undefined>;
  createCodingEnvironment(env: InsertCodingEnvironment): Promise<CodingEnvironment>;
  updateCodingEnvironment(id: number, env: Partial<CodingEnvironment>): Promise<CodingEnvironment | undefined>;
  
  // GitHub repository operations
  getGithubRepositories(userId: number): Promise<GithubRepository[]>;
  getGithubRepository(id: number): Promise<GithubRepository | undefined>;
  createGithubRepository(repo: InsertGithubRepository): Promise<GithubRepository>;
  
  // Game access operations
  getGameAccessByStudent(studentId: number): Promise<GameAccess[]>;
  getGameAccessByTeacher(teacherId: number): Promise<GameAccess[]>;
  getGameAccess(id: number): Promise<GameAccess | undefined>;
  createGameAccess(access: InsertGameAccess): Promise<GameAccess>;
  updateGameAccess(id: number, granted: boolean): Promise<GameAccess | undefined>;
  
  // Calendar events operations
  getCalendarEvents(): Promise<CalendarEvent[]>;
  getCalendarEventsByUser(userId: number): Promise<CalendarEvent[]>;
  getCalendarEventsByTeam(teamId: number): Promise<CalendarEvent[]>;
  getCalendarEventsByDateRange(startDate: Date, endDate: Date): Promise<CalendarEvent[]>;
  getCalendarEvent(id: number): Promise<CalendarEvent | undefined>;
  createCalendarEvent(event: InsertCalendarEvent): Promise<CalendarEvent>;
  updateCalendarEvent(id: number, event: Partial<CalendarEvent>): Promise<CalendarEvent | undefined>;
  deleteCalendarEvent(id: number): Promise<void>;
  
  // Calendar event attendees operations
  getEventAttendees(eventId: number): Promise<EventAttendee[]>;
  getEventAttendeesByUser(userId: number): Promise<EventAttendee[]>;
  createEventAttendee(attendee: InsertEventAttendee): Promise<EventAttendee>;
  updateEventAttendeeStatus(id: number, status: string): Promise<EventAttendee | undefined>;
  deleteEventAttendee(id: number): Promise<void>;
  
  // Holidays operations
  getHolidays(): Promise<Holiday[]>;
  getHolidaysByDateRange(startDate: Date, endDate: Date): Promise<Holiday[]>;
  getHolidaysByInstitution(institutionId: number): Promise<Holiday[]>;
  getGlobalHolidays(): Promise<Holiday[]>;
  getUrgentHolidays(): Promise<Holiday[]>;
  getHoliday(id: number): Promise<Holiday | undefined>;
  createHoliday(holiday: InsertHoliday): Promise<Holiday>;
  updateHoliday(id: number, holiday: Partial<Holiday>): Promise<Holiday | undefined>;
  deleteHoliday(id: number): Promise<void>;
  
  // Calendar notifications operations
  getCalendarNotifications(userId: number): Promise<CalendarNotification[]>;
  getCalendarNotification(id: number): Promise<CalendarNotification | undefined>;
  createCalendarNotification(notification: InsertCalendarNotification): Promise<CalendarNotification>;
  markCalendarNotificationAsRead(id: number): Promise<CalendarNotification | undefined>;
  deleteCalendarNotification(id: number): Promise<void>;
  
  // Session store
  sessionStore: session.Store;
}

export class DatabaseStorage implements IStorage {
  sessionStore: session.Store;
  
  constructor() {
    this.sessionStore = createSessionStore();
  }

  // User operations
  async getUsers(): Promise<User[]> {
    return db.select().from(users);
  }
  
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async getUserBySupabaseId(supabaseId: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.supabaseId, supabaseId));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }
  
  async updateUser(id: number, userData: Partial<User>): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set(userData)
      .where(eq(users.id, id))
      .returning();
    return user;
  }
  
  async updateUserStatus(id: number, status: string): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({ status })
      .where(eq(users.id, id))
      .returning();
    return user;
  }
  
  // Institution operations
  async getInstitutions(): Promise<Institution[]> {
    return db.select().from(institutions);
  }
  
  async getInstitution(id: number): Promise<Institution | undefined> {
    const [institution] = await db.select().from(institutions).where(eq(institutions.id, id));
    return institution;
  }
  
  async createInstitution(insertInstitution: InsertInstitution): Promise<Institution> {
    const [institution] = await db.insert(institutions).values(insertInstitution).returning();
    return institution;
  }

  // Team operations
  async getTeams(): Promise<Team[]> {
    return db.select().from(teams);
  }

  async getTeam(id: number): Promise<Team | undefined> {
    const [team] = await db.select().from(teams).where(eq(teams.id, id));
    return team;
  }

  async createTeam(insertTeam: InsertTeam): Promise<Team> {
    const [team] = await db.insert(teams).values(insertTeam).returning();
    return team;
  }

  // Team member operations
  async getTeamMembers(teamId: number): Promise<TeamMember[]> {
    return db.select().from(teamMembers).where(eq(teamMembers.teamId, teamId));
  }

  async addTeamMember(insertMember: InsertTeamMember): Promise<TeamMember> {
    const [member] = await db.insert(teamMembers).values(insertMember).returning();
    return member;
  }

  // Channel operations
  async getChannelsByTeamId(teamId: number): Promise<Channel[]> {
    return db.select().from(channels).where(eq(channels.teamId, teamId));
  }

  async getChannel(id: number): Promise<Channel | undefined> {
    const [channel] = await db.select().from(channels).where(eq(channels.id, id));
    return channel;
  }

  async createChannel(insertChannel: InsertChannel): Promise<Channel> {
    const [channel] = await db.insert(channels).values(insertChannel).returning();
    return channel;
  }

  // Conversation operations
  async getConversations(): Promise<Conversation[]> {
    return db.select().from(conversations);
  }

  async getConversation(id: number): Promise<Conversation | undefined> {
    const [conversation] = await db.select().from(conversations).where(eq(conversations.id, id));
    return conversation;
  }
  
  async getConversationsByParticipants(userIds: number[]): Promise<Conversation[]> {
    // Get all conversation IDs that have all the specified participants
    // For simplicity, we're looking for direct conversations between exactly 2 users
    if (userIds.length !== 2) {
      return [];
    }
    
    const user1ConversationParticipants = await db
      .select()
      .from(conversationParticipants)
      .where(eq(conversationParticipants.userId, userIds[0]));
      
    const user1ConversationIds = user1ConversationParticipants.map(p => p.conversationId);
    
    // Use separate filter for each ID since we can't use .in() directly
    let query = db
      .select()
      .from(conversations)
      .where(eq(conversations.isGroup, false));
      
    // Get all matching conversations
    const allConversations = await query;
    const matchingConversations = allConversations.filter(
      conv => user1ConversationIds.includes(conv.id)
    );
      
    // Filter to conversations with both users
    const result: Conversation[] = [];
    
    for (const conv of matchingConversations) {
      const participants = await this.getConversationParticipants(conv.id);
      const participantIds = participants.map(p => p.userId);
      
      // Check if all specified users are in this conversation
      if (userIds.every(userId => participantIds.includes(userId)) &&
          participantIds.length === userIds.length) {
        result.push(conv);
      }
    }
    
    return result;
  }

  async createConversation(insertConversation: InsertConversation): Promise<Conversation> {
    const [conversation] = await db.insert(conversations).values(insertConversation).returning();
    return conversation;
  }

  // Conversation participant operations
  async getConversationParticipants(conversationId: number): Promise<ConversationParticipant[]> {
    return db.select().from(conversationParticipants).where(eq(conversationParticipants.conversationId, conversationId));
  }

  async addConversationParticipant(insertParticipant: InsertConversationParticipant): Promise<ConversationParticipant> {
    const [participant] = await db.insert(conversationParticipants).values(insertParticipant).returning();
    return participant;
  }

  // Message operations
  async getMessagesByConversationId(conversationId: number): Promise<Message[]> {
    return db.select().from(messages).where(eq(messages.conversationId, conversationId));
  }

  async createMessage(insertMessage: InsertMessage): Promise<Message> {
    const [message] = await db.insert(messages).values(insertMessage).returning();
    return message;
  }

  // Document operations
  async getDocuments(): Promise<Document[]> {
    return db.select().from(documents);
  }
  
  async getDocumentsByUser(userId: number): Promise<Document[]> {
    return db.select().from(documents).where(eq(documents.ownerId, userId));
  }
  
  async getDocumentsByConversationId(conversationId: number): Promise<Document[]> {
    // This is a simplified approach for demo
    // In real app, you would have a many-to-many table linking documents to conversations
    // Instead of using modulo, we'll just fetch all documents for now
    return db.select().from(documents);
  }

  async getDocument(id: number): Promise<Document | undefined> {
    const [document] = await db.select().from(documents).where(eq(documents.id, id));
    return document;
  }

  async createDocument(insertDocument: InsertDocument): Promise<Document> {
    const [document] = await db.insert(documents).values(insertDocument).returning();
    return document;
  }
  
  async updateDocument(id: number, content: Partial<Document>): Promise<Document | undefined> {
    const [document] = await db
      .update(documents)
      .set(content)
      .where(eq(documents.id, id))
      .returning();
    return document;
  }
  
  async deleteDocument(id: number): Promise<void> {
    await db.delete(documents).where(eq(documents.id, id));
  }

  // Document comment operations
  async getDocumentComments(documentId: number): Promise<DocumentComment[]> {
    return db.select().from(documentComments).where(eq(documentComments.documentId, documentId));
  }

  async createDocumentComment(insertComment: InsertDocumentComment): Promise<DocumentComment> {
    const [comment] = await db.insert(documentComments).values(insertComment).returning();
    return comment;
  }

  // File operations
  async getFiles(): Promise<File[]> {
    return db.select().from(files);
  }

  async getFilesByConversationId(conversationId: number): Promise<File[]> {
    return db.select().from(files).where(eq(files.conversationId, conversationId));
  }

  async getFilesByTeamId(teamId: number): Promise<File[]> {
    return db.select().from(files).where(eq(files.teamId, teamId));
  }

  async createFile(insertFile: InsertFile): Promise<File> {
    const [file] = await db.insert(files).values(insertFile).returning();
    return file;
  }

  // Activity operations
  async getActivities(): Promise<Activity[]> {
    return db.select().from(activities).orderBy(activities.timestamp);
  }

  async createActivity(insertActivity: InsertActivity): Promise<Activity> {
    const [activity] = await db.insert(activities).values(insertActivity).returning();
    return activity;
  }
  
  // Coding environment operations
  async getCodingEnvironments(userId: number): Promise<CodingEnvironment[]> {
    return db.select().from(codingEnvironments).where(eq(codingEnvironments.userId, userId));
  }
  
  async getCodingEnvironment(id: number): Promise<CodingEnvironment | undefined> {
    const [environment] = await db.select().from(codingEnvironments).where(eq(codingEnvironments.id, id));
    return environment;
  }
  
  async createCodingEnvironment(insertEnv: InsertCodingEnvironment): Promise<CodingEnvironment> {
    const [environment] = await db.insert(codingEnvironments).values(insertEnv).returning();
    return environment;
  }
  
  async updateCodingEnvironment(id: number, env: Partial<CodingEnvironment>): Promise<CodingEnvironment | undefined> {
    const [environment] = await db
      .update(codingEnvironments)
      .set(env)
      .where(eq(codingEnvironments.id, id))
      .returning();
    return environment;
  }
  
  // GitHub repository operations
  async getGithubRepositories(userId: number): Promise<GithubRepository[]> {
    return db.select().from(githubRepositories).where(eq(githubRepositories.userId, userId));
  }
  
  async getGithubRepository(id: number): Promise<GithubRepository | undefined> {
    const [repository] = await db.select().from(githubRepositories).where(eq(githubRepositories.id, id));
    return repository;
  }
  
  async createGithubRepository(insertRepo: InsertGithubRepository): Promise<GithubRepository> {
    const [repository] = await db.insert(githubRepositories).values(insertRepo).returning();
    return repository;
  }
  
  // Game access operations
  async getGameAccessByStudent(studentId: number): Promise<GameAccess[]> {
    return db.select().from(gameAccess).where(eq(gameAccess.studentId, studentId));
  }
  
  async getGameAccessByTeacher(teacherId: number): Promise<GameAccess[]> {
    return db.select().from(gameAccess).where(eq(gameAccess.teacherId, teacherId));
  }
  
  async createGameAccess(insertAccess: InsertGameAccess): Promise<GameAccess> {
    const [access] = await db.insert(gameAccess).values(insertAccess).returning();
    return access;
  }
  
  async updateGameAccess(id: number, granted: boolean): Promise<GameAccess | undefined> {
    const [access] = await db
      .update(gameAccess)
      .set({ granted })
      .where(eq(gameAccess.id, id))
      .returning();
    return access;
  }
  
  async getGameAccess(id: number): Promise<GameAccess | undefined> {
    const [access] = await db.select().from(gameAccess).where(eq(gameAccess.id, id));
    return access;
  }

  // Calendar events operations
  async getCalendarEvents(): Promise<CalendarEvent[]> {
    return db.select().from(calendarEvents);
  }
  
  async getCalendarEventsByUser(userId: number): Promise<CalendarEvent[]> {
    // Get events created by this user
    const userEvents = await db.select().from(calendarEvents).where(eq(calendarEvents.createdBy, userId));
    
    // Get events where the user is an attendee
    const attendeeRecords = await db.select().from(eventAttendees).where(eq(eventAttendees.userId, userId));
    const attendeeEventIds = attendeeRecords.map(record => record.eventId);
    
    // If no attendee records, return user events
    if (attendeeEventIds.length === 0) {
      return userEvents;
    }
    
    // Otherwise, get attendee events and combine with user events
    const attendeeEvents: CalendarEvent[] = [];
    for (const eventId of attendeeEventIds) {
      const [event] = await db.select().from(calendarEvents).where(eq(calendarEvents.id, eventId));
      if (event) {
        attendeeEvents.push(event);
      }
    }
    
    // Combine and deduplicate
    const allEvents = [...userEvents, ...attendeeEvents];
    const uniqueEventIds = new Set();
    return allEvents.filter(event => {
      if (uniqueEventIds.has(event.id)) {
        return false;
      }
      uniqueEventIds.add(event.id);
      return true;
    });
  }
  
  async getCalendarEventsByTeam(teamId: number): Promise<CalendarEvent[]> {
    return db.select().from(calendarEvents).where(eq(calendarEvents.teamId, teamId));
  }
  
  async getCalendarEventsByDateRange(startDate: Date, endDate: Date): Promise<CalendarEvent[]> {
    return db
      .select()
      .from(calendarEvents)
      .where(
        and(
          gte(calendarEvents.startTime, startDate),
          lte(calendarEvents.startTime, endDate)
        )
      );
  }
  
  async getCalendarEvent(id: number): Promise<CalendarEvent | undefined> {
    const [event] = await db.select().from(calendarEvents).where(eq(calendarEvents.id, id));
    return event;
  }
  
  async createCalendarEvent(insertEvent: InsertCalendarEvent): Promise<CalendarEvent> {
    const [event] = await db.insert(calendarEvents).values(insertEvent).returning();
    return event;
  }
  
  async updateCalendarEvent(id: number, eventData: Partial<CalendarEvent>): Promise<CalendarEvent | undefined> {
    const [event] = await db
      .update(calendarEvents)
      .set(eventData)
      .where(eq(calendarEvents.id, id))
      .returning();
    return event;
  }
  
  async deleteCalendarEvent(id: number): Promise<void> {
    // Delete attendees first due to foreign key constraint
    await db.delete(eventAttendees).where(eq(eventAttendees.eventId, id));
    // Delete notifications
    await db.delete(calendarNotifications).where(eq(calendarNotifications.eventId, id));
    // Delete the event
    await db.delete(calendarEvents).where(eq(calendarEvents.id, id));
  }
  
  // Calendar event attendees operations
  async getEventAttendees(eventId: number): Promise<EventAttendee[]> {
    return db.select().from(eventAttendees).where(eq(eventAttendees.eventId, eventId));
  }
  
  async getEventAttendeesByUser(userId: number): Promise<EventAttendee[]> {
    return db.select().from(eventAttendees).where(eq(eventAttendees.userId, userId));
  }
  
  async createEventAttendee(insertAttendee: InsertEventAttendee): Promise<EventAttendee> {
    const [attendee] = await db.insert(eventAttendees).values(insertAttendee).returning();
    return attendee;
  }
  
  async updateEventAttendeeStatus(id: number, status: string): Promise<EventAttendee | undefined> {
    const [attendee] = await db
      .update(eventAttendees)
      .set({ status })
      .where(eq(eventAttendees.id, id))
      .returning();
    return attendee;
  }
  
  async deleteEventAttendee(id: number): Promise<void> {
    await db.delete(eventAttendees).where(eq(eventAttendees.id, id));
  }
  
  // Holidays operations
  async getHolidays(): Promise<Holiday[]> {
    return db.select().from(holidays);
  }
  
  async getHolidaysByDateRange(startDate: Date, endDate: Date): Promise<Holiday[]> {
    return db
      .select()
      .from(holidays)
      .where(
        and(
          gte(holidays.date, startDate),
          lte(holidays.date, endDate)
        )
      );
  }
  
  async getHolidaysByInstitution(institutionId: number): Promise<Holiday[]> {
    return db.select().from(holidays).where(eq(holidays.institutionId, institutionId));
  }
  
  async getGlobalHolidays(): Promise<Holiday[]> {
    return db.select().from(holidays).where(eq(holidays.isGlobal, true));
  }
  
  async getUrgentHolidays(): Promise<Holiday[]> {
    return db.select().from(holidays).where(eq(holidays.isUrgent, true));
  }
  
  async getHoliday(id: number): Promise<Holiday | undefined> {
    const [holiday] = await db.select().from(holidays).where(eq(holidays.id, id));
    return holiday;
  }
  
  async createHoliday(insertHoliday: InsertHoliday): Promise<Holiday> {
    const [holiday] = await db.insert(holidays).values(insertHoliday).returning();
    return holiday;
  }
  
  async updateHoliday(id: number, holidayData: Partial<Holiday>): Promise<Holiday | undefined> {
    const [holiday] = await db
      .update(holidays)
      .set(holidayData)
      .where(eq(holidays.id, id))
      .returning();
    return holiday;
  }
  
  async deleteHoliday(id: number): Promise<void> {
    await db.delete(holidays).where(eq(holidays.id, id));
  }
  
  // Calendar notifications operations
  async getCalendarNotifications(userId: number): Promise<CalendarNotification[]> {
    return db.select().from(calendarNotifications).where(eq(calendarNotifications.userId, userId));
  }
  
  async getCalendarNotification(id: number): Promise<CalendarNotification | undefined> {
    const [notification] = await db.select().from(calendarNotifications).where(eq(calendarNotifications.id, id));
    return notification;
  }
  
  async createCalendarNotification(insertNotification: InsertCalendarNotification): Promise<CalendarNotification> {
    const [notification] = await db.insert(calendarNotifications).values(insertNotification).returning();
    return notification;
  }
  
  async markCalendarNotificationAsRead(id: number): Promise<CalendarNotification | undefined> {
    const [notification] = await db
      .update(calendarNotifications)
      .set({ isRead: true })
      .where(eq(calendarNotifications.id, id))
      .returning();
    return notification;
  }
  
  async deleteCalendarNotification(id: number): Promise<void> {
    await db.delete(calendarNotifications).where(eq(calendarNotifications.id, id));
  }
}

export const storage = new DatabaseStorage();