export interface User {
  id: number;
  username: string;
  name: string;
  avatar?: string;
  status: "available" | "busy" | "away" | "offline";
  email?: string;
  role?: string;
  supabaseId?: string;
  password?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Conversation {
  id: string;
  participants: string[];
  name: string;
  avatar?: string;
  isGroup: boolean;
  lastMessage: string;
  timestamp: string;
  status?: "available" | "busy" | "away" | "offline";
}

export interface Message {
  id: string;
  conversationId: string;
  userId: string;
  content: string;
  timestamp: string;
  attachment?: {
    name: string;
    size: string;
    type: string;
  };
  user: {
    name: string;
    avatar?: string;
  };
}

export interface Document {
  id: string;
  name: string;
  type: "powerpoint" | "word" | "onenote";
  content: string;
  createdAt: string;
  updatedAt: string;
  ownerId: string;
  size: string;
  slides?: any[];
  sections?: string[];
  department?: string;
}

export interface Comment {
  id: string;
  documentId: string;
  userId: string;
  content: string;
  timestamp: string;
  user: {
    name: string;
    avatar?: string;
  };
}

export interface Team {
  id: string;
  name: string;
  description: string;
  avatar?: string;
  createdAt: string;
  ownerId: string;
  nextMeeting?: string;
}

export interface Channel {
  id: string;
  teamId: string;
  name: string;
  description: string;
  messageCount: number;
}

export interface File {
  id: string;
  name: string;
  type: string;
  size: string;
  owner: string;
  modified: string;
}

export interface Activity {
  id: string;
  userId: string;
  action: string;
  target?: string;
  timestamp: string;
  user: {
    name: string;
    avatar?: string;
    status: "available" | "busy" | "away" | "offline";
  };
}

export interface Stats {
  unreadMessages: number;
  upcomingMeetings: number;
  sharedFiles: number;
  scheduledCalls: number;
  teamMembers: number;
  activityScore: number;
}
