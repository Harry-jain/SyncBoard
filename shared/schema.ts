import { pgTable, text, serial, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Institutions table
export const institutions = pgTable("institutions", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  address: text("address"),
  contactEmail: text("contact_email"),
  contactPhone: text("contact_phone"),
  website: text("website"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Users table
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  name: text("name").notNull(),
  avatar: text("avatar"),
  status: text("status").default("offline").notNull(),
  email: text("email"),
  role: text("role").default("student").notNull(), // student, teacher, admin
  institutionId: integer("institution_id").references(() => institutions.id),
  designation: text("designation"),
  githubUsername: text("github_username"),
  githubAccessToken: text("github_access_token"),
  supabaseId: text("supabase_id").unique(),
  allowGameAccess: boolean("allow_game_access").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Teams table
export const teams = pgTable("teams", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  avatar: text("avatar"),
  ownerId: integer("owner_id").references(() => users.id).notNull(),
  nextMeeting: timestamp("next_meeting"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Team members table
export const teamMembers = pgTable("team_members", {
  id: serial("id").primaryKey(),
  teamId: integer("team_id").references(() => teams.id).notNull(),
  userId: integer("user_id").references(() => users.id).notNull(),
  role: text("role").default("member").notNull(),
  joinedAt: timestamp("joined_at").defaultNow().notNull(),
});

// Channels table
export const channels = pgTable("channels", {
  id: serial("id").primaryKey(),
  teamId: integer("team_id").references(() => teams.id).notNull(),
  name: text("name").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Conversations table
export const conversations = pgTable("conversations", {
  id: serial("id").primaryKey(),
  name: text("name"),
  isGroup: boolean("is_group").default(false).notNull(),
  avatar: text("avatar"),
  type: text("type").default("direct").notNull(),
  createdBy: integer("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Conversation participants table
export const conversationParticipants = pgTable("conversation_participants", {
  id: serial("id").primaryKey(),
  conversationId: integer("conversation_id").references(() => conversations.id).notNull(),
  userId: integer("user_id").references(() => users.id).notNull(),
  joinedAt: timestamp("joined_at").defaultNow().notNull(),
});

// Messages table
export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  conversationId: integer("conversation_id").references(() => conversations.id).notNull(),
  userId: integer("user_id").references(() => users.id).notNull(),
  content: text("content").notNull(),
  attachment: jsonb("attachment"),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
});

// Documents table
export const documents = pgTable("documents", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type").notNull(), // powerpoint, word, onenote
  content: text("content"),
  slides: jsonb("slides"),
  sections: jsonb("sections"),
  department: text("department"),
  ownerId: integer("owner_id").references(() => users.id).notNull(),
  size: text("size"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Document comments table
export const documentComments = pgTable("document_comments", {
  id: serial("id").primaryKey(),
  documentId: integer("document_id").references(() => documents.id).notNull(),
  userId: integer("user_id").references(() => users.id).notNull(),
  content: text("content").notNull(),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
});

// Files table
export const files = pgTable("files", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type").notNull(),
  size: text("size").notNull(),
  ownerId: integer("owner_id").references(() => users.id).notNull(),
  conversationId: integer("conversation_id").references(() => conversations.id),
  teamId: integer("team_id").references(() => teams.id),
  channelId: integer("channel_id").references(() => channels.id),
  uploadedAt: timestamp("uploaded_at").defaultNow().notNull(),
  modifiedAt: timestamp("modified_at").defaultNow().notNull(),
});

// Activities table
export const activities = pgTable("activities", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  action: text("action").notNull(),
  target: text("target"),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
});

// Coding environments table
export const codingEnvironments = pgTable("coding_environments", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  language: text("language").notNull(), // python, javascript, java, cpp, etc.
  code: text("code"),
  name: text("name").notNull(),
  type: text("type").default("custom"), // jupyter, vscode, custom, etc.
  isPublic: boolean("is_public").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// GitHub repositories table
export const githubRepositories = pgTable("github_repositories", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  name: text("name").notNull(),
  description: text("description"),
  url: text("url").notNull(),
  isPrivate: boolean("is_private").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Game access table
export const gameAccess = pgTable("game_access", {
  id: serial("id").primaryKey(),
  teacherId: integer("teacher_id").references(() => users.id).notNull(),
  studentId: integer("student_id").references(() => users.id).notNull(),
  gameId: integer("game_id").notNull(),
  granted: boolean("granted").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Calendar events table
export const calendarEvents = pgTable("calendar_events", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time").notNull(),
  location: text("location"),
  isAllDay: boolean("is_all_day").default(false),
  createdBy: integer("created_by").references(() => users.id).notNull(),
  teamId: integer("team_id").references(() => teams.id),
  isRecurring: boolean("is_recurring").default(false),
  recurrencePattern: text("recurrence_pattern"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Calendar event attendees
export const eventAttendees = pgTable("event_attendees", {
  id: serial("id").primaryKey(),
  eventId: integer("event_id").references(() => calendarEvents.id).notNull(),
  userId: integer("user_id").references(() => users.id).notNull(),
  status: text("status").notNull().default("pending"), // pending, accepted, declined
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Holidays and important dates
export const holidays = pgTable("holidays", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  date: timestamp("date").notNull(),
  isUrgent: boolean("is_urgent").default(false),
  createdBy: integer("created_by").references(() => users.id).notNull(),
  institutionId: integer("institution_id").references(() => institutions.id),
  isGlobal: boolean("is_global").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Calendar notifications
export const calendarNotifications = pgTable("calendar_notifications", {
  id: serial("id").primaryKey(),
  eventId: integer("event_id").references(() => calendarEvents.id).notNull(),
  userId: integer("user_id").references(() => users.id).notNull(),
  isRead: boolean("is_read").default(false),
  remindAt: timestamp("remind_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Insert schemas
export const insertInstitutionSchema = createInsertSchema(institutions).pick({
  name: true,
  address: true,
  contactEmail: true,
  contactPhone: true,
  website: true,
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  name: true,
  avatar: true,
  status: true,
  email: true,
  role: true,
  institutionId: true,
  designation: true,
  githubUsername: true,
  githubAccessToken: true,
  supabaseId: true,
  allowGameAccess: true,
});

export const insertTeamSchema = createInsertSchema(teams).pick({
  name: true,
  description: true,
  avatar: true,
  ownerId: true,
  nextMeeting: true,
});

export const insertTeamMemberSchema = createInsertSchema(teamMembers).pick({
  teamId: true,
  userId: true,
  role: true,
});

export const insertChannelSchema = createInsertSchema(channels).pick({
  teamId: true,
  name: true,
  description: true,
});

export const insertConversationSchema = createInsertSchema(conversations).pick({
  name: true,
  isGroup: true,
  avatar: true,
  type: true,
  createdBy: true,
});

export const insertConversationParticipantSchema = createInsertSchema(conversationParticipants).pick({
  conversationId: true,
  userId: true,
});

export const insertMessageSchema = createInsertSchema(messages).pick({
  conversationId: true,
  userId: true,
  content: true,
  attachment: true,
});

export const insertDocumentSchema = createInsertSchema(documents).pick({
  name: true,
  type: true,
  content: true,
  slides: true,
  sections: true,
  department: true,
  ownerId: true,
  size: true,
});

export const insertDocumentCommentSchema = createInsertSchema(documentComments).pick({
  documentId: true,
  userId: true,
  content: true,
});

export const insertFileSchema = createInsertSchema(files).pick({
  name: true,
  type: true,
  size: true,
  ownerId: true,
  conversationId: true,
  teamId: true,
  channelId: true,
});

export const insertActivitySchema = createInsertSchema(activities).pick({
  userId: true,
  action: true,
  target: true,
});

export const insertCodingEnvironmentSchema = createInsertSchema(codingEnvironments).pick({
  userId: true,
  language: true,
  code: true,
  name: true,
  type: true,
  isPublic: true,
});

export const insertGithubRepositorySchema = createInsertSchema(githubRepositories).pick({
  userId: true,
  name: true,
  description: true,
  url: true,
  isPrivate: true,
});

export const insertGameAccessSchema = createInsertSchema(gameAccess).pick({
  teacherId: true,
  studentId: true,
  gameId: true,
  granted: true,
});

// Calendar event insert schemas
export const insertCalendarEventSchema = createInsertSchema(calendarEvents).pick({
  title: true,
  description: true,
  startTime: true,
  endTime: true,
  location: true,
  isAllDay: true,
  createdBy: true,
  teamId: true,
  isRecurring: true,
  recurrencePattern: true,
});

export const insertEventAttendeeSchema = createInsertSchema(eventAttendees).pick({
  eventId: true,
  userId: true,
  status: true,
});

export const insertHolidaySchema = createInsertSchema(holidays).pick({
  title: true,
  description: true,
  date: true,
  isUrgent: true,
  createdBy: true,
  institutionId: true,
  isGlobal: true,
});

export const insertCalendarNotificationSchema = createInsertSchema(calendarNotifications).pick({
  eventId: true,
  userId: true,
  isRead: true,
  remindAt: true,
});

// Types
export type InsertInstitution = z.infer<typeof insertInstitutionSchema>;
export type Institution = typeof institutions.$inferSelect;

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertTeam = z.infer<typeof insertTeamSchema>;
export type Team = typeof teams.$inferSelect;

export type InsertTeamMember = z.infer<typeof insertTeamMemberSchema>;
export type TeamMember = typeof teamMembers.$inferSelect;

export type InsertChannel = z.infer<typeof insertChannelSchema>;
export type Channel = typeof channels.$inferSelect;

export type InsertConversation = z.infer<typeof insertConversationSchema>;
export type Conversation = typeof conversations.$inferSelect;

export type InsertConversationParticipant = z.infer<typeof insertConversationParticipantSchema>;
export type ConversationParticipant = typeof conversationParticipants.$inferSelect;

export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type Message = typeof messages.$inferSelect;

export type InsertDocument = z.infer<typeof insertDocumentSchema>;
export type Document = typeof documents.$inferSelect;

export type InsertDocumentComment = z.infer<typeof insertDocumentCommentSchema>;
export type DocumentComment = typeof documentComments.$inferSelect;

export type InsertFile = z.infer<typeof insertFileSchema>;
export type File = typeof files.$inferSelect;

export type InsertActivity = z.infer<typeof insertActivitySchema>;
export type Activity = typeof activities.$inferSelect;

export type InsertCodingEnvironment = z.infer<typeof insertCodingEnvironmentSchema>;
export type CodingEnvironment = typeof codingEnvironments.$inferSelect;

export type InsertGithubRepository = z.infer<typeof insertGithubRepositorySchema>;
export type GithubRepository = typeof githubRepositories.$inferSelect;

export type InsertGameAccess = z.infer<typeof insertGameAccessSchema>;
export type GameAccess = typeof gameAccess.$inferSelect;

export type InsertCalendarEvent = z.infer<typeof insertCalendarEventSchema>;
export type CalendarEvent = typeof calendarEvents.$inferSelect;

export type InsertEventAttendee = z.infer<typeof insertEventAttendeeSchema>;
export type EventAttendee = typeof eventAttendees.$inferSelect;

export type InsertHoliday = z.infer<typeof insertHolidaySchema>;
export type Holiday = typeof holidays.$inferSelect;

export type InsertCalendarNotification = z.infer<typeof insertCalendarNotificationSchema>;
export type CalendarNotification = typeof calendarNotifications.$inferSelect;
