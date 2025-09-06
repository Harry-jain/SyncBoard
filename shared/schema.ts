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

// Call history table
export const callHistory = pgTable("call_history", {
  id: serial("id").primaryKey(),
  callerId: integer("caller_id").references(() => users.id).notNull(),
  calleeId: integer("callee_id").references(() => users.id).notNull(),
  callType: text("call_type").notNull(), // audio, video
  status: text("status").notNull(), // ringing, ongoing, ended, missed
  startTime: timestamp("start_time"),
  endTime: timestamp("end_time"),
  duration: integer("duration"), // in seconds
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Meetings table
export const meetings = pgTable("meetings", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  meetingId: text("meeting_id").notNull().unique(), // unique meeting identifier
  hostId: integer("host_id").references(() => users.id).notNull(),
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time"),
  isScheduled: boolean("is_scheduled").default(false),
  isRecurring: boolean("is_recurring").default(false),
  recurrencePattern: text("recurrence_pattern"),
  maxParticipants: integer("max_participants").default(100),
  isRecording: boolean("is_recording").default(false),
  recordingUrl: text("recording_url"),
  status: text("status").default("scheduled").notNull(), // scheduled, ongoing, ended, cancelled
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Meeting participants table
export const meetingParticipants = pgTable("meeting_participants", {
  id: serial("id").primaryKey(),
  meetingId: integer("meeting_id").references(() => meetings.id).notNull(),
  userId: integer("user_id").references(() => users.id).notNull(),
  role: text("role").default("participant").notNull(), // host, co-host, participant
  joinedAt: timestamp("joined_at").defaultNow().notNull(),
  leftAt: timestamp("left_at"),
  isMuted: boolean("is_muted").default(false),
  isVideoEnabled: boolean("is_video_enabled").default(true),
  isScreenSharing: boolean("is_screen_sharing").default(false),
});

// Meeting recordings table
export const meetingRecordings = pgTable("meeting_recordings", {
  id: serial("id").primaryKey(),
  meetingId: integer("meeting_id").references(() => meetings.id).notNull(),
  recordingUrl: text("recording_url").notNull(),
  duration: integer("duration").notNull(), // in seconds
  fileSize: integer("file_size"), // in bytes
  status: text("status").default("processing").notNull(), // processing, completed, failed
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Classrooms table - Core classroom management
export const classrooms = pgTable("classrooms", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  subject: text("subject").notNull(),
  gradeLevel: text("grade_level"),
  academicYear: text("academic_year"),
  teacherId: integer("teacher_id").references(() => users.id).notNull(),
  joinCode: text("join_code").unique(), // 7-digit alphanumeric code
  shareableLink: text("shareable_link").unique(),
  maxStudents: integer("max_students").default(30),
  autoApproveStudents: boolean("auto_approve_students").default(true),
  requiresApproval: boolean("requires_approval").default(false),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Classroom members table - Student/teacher enrollment
export const classroomMembers = pgTable("classroom_members", {
  id: serial("id").primaryKey(),
  classroomId: integer("classroom_id").references(() => classrooms.id).notNull(),
  userId: integer("user_id").references(() => users.id).notNull(),
  role: text("role").notNull(), // teacher, co_teacher, student, parent
  joinMethod: text("join_method").notNull(), // code, link, invitation, bulk_import
  joinedAt: timestamp("joined_at").defaultNow().notNull(),
  status: text("status").default("active").notNull(), // active, pending, removed
  lastActiveAt: timestamp("last_active_at"),
});

// Assignments table - Comprehensive assignment management
export const assignments = pgTable("assignments", {
  id: serial("id").primaryKey(),
  classroomId: integer("classroom_id").references(() => classrooms.id).notNull(),
  title: text("title").notNull(),
  instructions: text("instructions"),
  assignmentType: text("assignment_type").notNull(), // document, coding, quiz, presentation
  programmingLanguage: text("programming_language"), // for coding assignments
  points: integer("points"),
  dueDate: timestamp("due_date"),
  availableFrom: timestamp("available_from"),
  availableUntil: timestamp("available_until"),
  allowLateSubmission: boolean("allow_late_submission").default(true),
  latePenaltyPercent: integer("late_penalty_percent").default(0),
  rubricData: jsonb("rubric_data"), // JSON structure for rubrics
  testCases: jsonb("test_cases"), // JSON array for coding assignments
  starterCode: text("starter_code"), // template code for students
  resources: jsonb("resources"), // attached files and links
  createdBy: integer("created_by").references(() => users.id).notNull(),
  isPublished: boolean("is_published").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Assignment submissions table
export const assignmentSubmissions = pgTable("assignment_submissions", {
  id: serial("id").primaryKey(),
  assignmentId: integer("assignment_id").references(() => assignments.id).notNull(),
  studentId: integer("student_id").references(() => users.id).notNull(),
  content: text("content"), // submitted content/code
  files: jsonb("files"), // attached files
  submittedAt: timestamp("submitted_at").defaultNow().notNull(),
  isLate: boolean("is_late").default(false),
  grade: integer("grade"),
  feedback: text("feedback"),
  gradedBy: integer("graded_by").references(() => users.id),
  gradedAt: timestamp("graded_at"),
  status: text("status").default("submitted").notNull(), // submitted, graded, returned
});

// Class notebooks table - OneNote-style notebooks
export const classNotebooks = pgTable("class_notebooks", {
  id: serial("id").primaryKey(),
  classroomId: integer("classroom_id").references(() => classrooms.id).notNull(),
  name: text("name").notNull(),
  description: text("description"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Notebook sections table
export const notebookSections = pgTable("notebook_sections", {
  id: serial("id").primaryKey(),
  notebookId: integer("notebook_id").references(() => classNotebooks.id).notNull(),
  name: text("name").notNull(),
  sectionType: text("section_type").notNull(), // content_library, collaboration_space, student_section
  studentId: integer("student_id").references(() => users.id), // for individual student sections
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Notebook pages table
export const notebookPages = pgTable("notebook_pages", {
  id: serial("id").primaryKey(),
  sectionId: integer("section_id").references(() => notebookSections.id).notNull(),
  title: text("title").notNull(),
  content: text("content"), // rich text content
  pageData: jsonb("page_data"), // structured page data
  createdBy: integer("created_by").references(() => users.id).notNull(),
  isDistributed: boolean("is_distributed").default(false), // distributed to all students
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// WebSocket connections table - For connection management
export const websocketConnections = pgTable("websocket_connections", {
  id: serial("id").primaryKey(),
  connectionId: text("connection_id").unique().notNull(),
  userId: integer("user_id").references(() => users.id).notNull(),
  nodeId: text("node_id").notNull(), // server node identifier
  classroomId: integer("classroom_id").references(() => classrooms.id),
  isActive: boolean("is_active").default(true),
  connectedAt: timestamp("connected_at").defaultNow().notNull(),
  lastPingAt: timestamp("last_ping_at"),
  metadata: jsonb("metadata"), // connection metadata
});

// Collaboration state table - For real-time collaboration
export const collaborationState = pgTable("collaboration_state", {
  id: serial("id").primaryKey(),
  resourceId: text("resource_id").notNull(), // assignment, document, etc.
  resourceType: text("resource_type").notNull(), // assignment, document, notebook
  userId: integer("user_id").references(() => users.id).notNull(),
  cursorPosition: jsonb("cursor_position"),
  selection: jsonb("selection"),
  lastEditAt: timestamp("last_edit_at").defaultNow().notNull(),
  isActive: boolean("is_active").default(true),
});

// Redis cluster configuration table
export const redisClusterConfig = pgTable("redis_cluster_config", {
  id: serial("id").primaryKey(),
  nodeId: text("node_id").unique().notNull(),
  host: text("host").notNull(),
  port: integer("port").notNull(),
  isMaster: boolean("is_master").default(false),
  isActive: boolean("is_active").default(true),
  lastHealthCheck: timestamp("last_health_check"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Load balancer configuration table
export const loadBalancerConfig = pgTable("load_balancer_config", {
  id: serial("id").primaryKey(),
  region: text("region").notNull(),
  nodeId: text("node_id").notNull(),
  capacity: integer("capacity").default(1000), // max connections
  currentLoad: integer("current_load").default(0),
  cpuUsage: integer("cpu_usage").default(0),
  memoryUsage: integer("memory_usage").default(0),
  networkLatency: integer("network_latency").default(0),
  isHealthy: boolean("is_healthy").default(true),
  lastUpdated: timestamp("last_updated").defaultNow().notNull(),
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

// Call history insert schemas
export const insertCallHistorySchema = createInsertSchema(callHistory).pick({
  callerId: true,
  calleeId: true,
  callType: true,
  status: true,
  startTime: true,
  endTime: true,
  duration: true,
});

// Meeting insert schemas
export const insertMeetingSchema = createInsertSchema(meetings).pick({
  title: true,
  description: true,
  meetingId: true,
  hostId: true,
  startTime: true,
  endTime: true,
  isScheduled: true,
  isRecurring: true,
  recurrencePattern: true,
  maxParticipants: true,
  isRecording: true,
  recordingUrl: true,
  status: true,
});

export const insertMeetingParticipantSchema = createInsertSchema(meetingParticipants).pick({
  meetingId: true,
  userId: true,
  role: true,
  joinedAt: true,
  leftAt: true,
  isMuted: true,
  isVideoEnabled: true,
  isScreenSharing: true,
});

export const insertMeetingRecordingSchema = createInsertSchema(meetingRecordings).pick({
  meetingId: true,
  recordingUrl: true,
  duration: true,
  fileSize: true,
  status: true,
});

// Classroom insert schemas
export const insertClassroomSchema = createInsertSchema(classrooms).pick({
  name: true,
  subject: true,
  gradeLevel: true,
  academicYear: true,
  teacherId: true,
  maxStudents: true,
  autoApproveStudents: true,
  requiresApproval: true,
});

export const insertClassroomMemberSchema = createInsertSchema(classroomMembers).pick({
  classroomId: true,
  userId: true,
  role: true,
  joinMethod: true,
  status: true,
});

export const insertAssignmentSchema = createInsertSchema(assignments).pick({
  classroomId: true,
  title: true,
  instructions: true,
  assignmentType: true,
  programmingLanguage: true,
  points: true,
  dueDate: true,
  availableFrom: true,
  availableUntil: true,
  allowLateSubmission: true,
  latePenaltyPercent: true,
  rubricData: true,
  testCases: true,
  starterCode: true,
  resources: true,
  createdBy: true,
  isPublished: true,
});

export const insertAssignmentSubmissionSchema = createInsertSchema(assignmentSubmissions).pick({
  assignmentId: true,
  studentId: true,
  content: true,
  files: true,
  isLate: true,
  grade: true,
  feedback: true,
  gradedBy: true,
  status: true,
});

export const insertClassNotebookSchema = createInsertSchema(classNotebooks).pick({
  classroomId: true,
  name: true,
  description: true,
  isActive: true,
});

export const insertNotebookSectionSchema = createInsertSchema(notebookSections).pick({
  notebookId: true,
  name: true,
  sectionType: true,
  studentId: true,
  isActive: true,
});

export const insertNotebookPageSchema = createInsertSchema(notebookPages).pick({
  sectionId: true,
  title: true,
  content: true,
  pageData: true,
  createdBy: true,
  isDistributed: true,
});

export const insertWebSocketConnectionSchema = createInsertSchema(websocketConnections).pick({
  connectionId: true,
  userId: true,
  nodeId: true,
  classroomId: true,
  isActive: true,
  metadata: true,
});

export const insertCollaborationStateSchema = createInsertSchema(collaborationState).pick({
  resourceId: true,
  resourceType: true,
  userId: true,
  cursorPosition: true,
  selection: true,
  isActive: true,
});

export const insertRedisClusterConfigSchema = createInsertSchema(redisClusterConfig).pick({
  nodeId: true,
  host: true,
  port: true,
  isMaster: true,
  isActive: true,
});

export const insertLoadBalancerConfigSchema = createInsertSchema(loadBalancerConfig).pick({
  region: true,
  nodeId: true,
  capacity: true,
  currentLoad: true,
  cpuUsage: true,
  memoryUsage: true,
  networkLatency: true,
  isHealthy: true,
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

export type InsertCallHistory = z.infer<typeof insertCallHistorySchema>;
export type CallHistory = typeof callHistory.$inferSelect;

export type InsertMeeting = z.infer<typeof insertMeetingSchema>;
export type Meeting = typeof meetings.$inferSelect;

export type InsertMeetingParticipant = z.infer<typeof insertMeetingParticipantSchema>;
export type MeetingParticipant = typeof meetingParticipants.$inferSelect;

export type InsertMeetingRecording = z.infer<typeof insertMeetingRecordingSchema>;
export type MeetingRecording = typeof meetingRecordings.$inferSelect;

// Classroom types
export type InsertClassroom = z.infer<typeof insertClassroomSchema>;
export type Classroom = typeof classrooms.$inferSelect;

export type InsertClassroomMember = z.infer<typeof insertClassroomMemberSchema>;
export type ClassroomMember = typeof classroomMembers.$inferSelect;

export type InsertAssignment = z.infer<typeof insertAssignmentSchema>;
export type Assignment = typeof assignments.$inferSelect;

export type InsertAssignmentSubmission = z.infer<typeof insertAssignmentSubmissionSchema>;
export type AssignmentSubmission = typeof assignmentSubmissions.$inferSelect;

export type InsertClassNotebook = z.infer<typeof insertClassNotebookSchema>;
export type ClassNotebook = typeof classNotebooks.$inferSelect;

export type InsertNotebookSection = z.infer<typeof insertNotebookSectionSchema>;
export type NotebookSection = typeof notebookSections.$inferSelect;

export type InsertNotebookPage = z.infer<typeof insertNotebookPageSchema>;
export type NotebookPage = typeof notebookPages.$inferSelect;

export type InsertWebSocketConnection = z.infer<typeof insertWebSocketConnectionSchema>;
export type WebSocketConnection = typeof websocketConnections.$inferSelect;

export type InsertCollaborationState = z.infer<typeof insertCollaborationStateSchema>;
export type CollaborationState = typeof collaborationState.$inferSelect;

export type InsertRedisClusterConfig = z.infer<typeof insertRedisClusterConfigSchema>;
export type RedisClusterConfig = typeof redisClusterConfig.$inferSelect;

export type InsertLoadBalancerConfig = z.infer<typeof insertLoadBalancerConfigSchema>;
export type LoadBalancerConfig = typeof loadBalancerConfig.$inferSelect;
