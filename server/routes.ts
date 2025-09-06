import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { WebSocketServer } from "ws";
import WebSocket from "ws";
import { 
  insertMessageSchema, 
  insertCodingEnvironmentSchema, 
  insertGithubRepositorySchema,
  insertGameAccessSchema,
  insertCalendarEventSchema,
  insertEventAttendeeSchema,
  insertHolidaySchema,
  insertCalendarNotificationSchema,
  GameAccess
} from "@shared/schema";
import { setupAuth } from "./auth";
import classroomRoutes from "./routes/classroom";
import authRoutes from "./routes/auth";
import driveRoutes from "./routes/drive";

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup authentication
  const { isAuthenticated, hasRole } = setupAuth(app);
  
  // Register classroom routes
  app.use('/api/classroom', classroomRoutes);
  
  // Register authentication routes
  app.use('/api/auth', authRoutes);
  
  // Register drive routes
  app.use('/api/drive', driveRoutes);
  
  const httpServer = createServer(app);
  
  // WebSocket setup for real-time messaging, calls, and coding collaboration
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  
  // Track active sessions
  const activeCalls = new Map();
  const activeCodeSessions = new Map();
  const connectedClients = new Map();
  
  wss.on('connection', (ws) => {
    console.log('Client connected to WebSocket');
    let userId: number | null = null;
    let activeEnvironmentId: number | null = null;
    
    ws.on('message', async (message) => {
      try {
        const data = JSON.parse(message.toString());
        console.log('Received message:', data);
        
        // Standard message handling
        if (data.type === 'message') {
          // Handle new message
          const validatedData = insertMessageSchema.parse(data.payload);
          const newMessage = await storage.createMessage(validatedData);
          
          // Broadcast to all clients
          wss.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
              client.send(JSON.stringify({
                type: 'new_message',
                payload: newMessage
              }));
            }
          });
        }
        // User identification
        else if (data.type === 'identify') {
          userId = data.userId;
          connectedClients.set(userId, ws);
          console.log(`User ${userId} identified`);
        }
        // Video/Audio Call Handling
        else if (data.type === 'call_request') {
          if (!userId) return;
          
          const targetUser = data.targetUserId;
          const callId = `call_${Date.now()}_${userId}`;
          
          activeCalls.set(callId, {
            id: callId,
            caller: userId,
            target: targetUser,
            type: data.callType,
            startTime: new Date(),
            active: false
          });
          
          // Notify target user if they're online
          const targetWs = connectedClients.get(targetUser);
          if (targetWs && targetWs.readyState === WebSocket.OPEN) {
            const callerInfo = await storage.getUser(userId);
            if (callerInfo) {
              targetWs.send(JSON.stringify({
                type: 'call_request',
                callId: callId,
                caller: {
                  id: callerInfo.id,
                  name: callerInfo.name,
                  avatar: callerInfo.avatar
                },
                callType: data.callType
              }));
            } else {
              ws.send(JSON.stringify({
                type: 'call_error',
                error: 'Caller information not found',
                callId: callId
              }));
            }
          } else {
            // Target user not online
            ws.send(JSON.stringify({
              type: 'call_error',
              error: 'User is not available',
              callId: callId
            }));
          }
        }
        else if (data.type === 'call_accept') {
          if (!userId) return;
          
          const callId = data.callId;
          const call = activeCalls.get(callId);
          
          if (call && call.target === userId) {
            call.active = true;
            
            // Notify the original caller
            const callerWs = connectedClients.get(call.caller);
            if (callerWs && callerWs.readyState === WebSocket.OPEN) {
              const userInfo = await storage.getUser(userId);
              if (userInfo) {
                callerWs.send(JSON.stringify({
                  type: 'call_accept',
                  callId: callId,
                  participant: {
                    id: userInfo.id,
                    name: userInfo.name,
                    avatar: userInfo.avatar
                  }
                }));
              } else {
                // User info not found, send generic response
                callerWs.send(JSON.stringify({
                  type: 'call_accept',
                  callId: callId,
                  participant: {
                    id: userId,
                    name: 'Unknown User',
                    avatar: null
                  }
                }));
              }
            }
            
            // Also notify the accepter with caller info
            const callerInfo = await storage.getUser(call.caller);
            if (callerInfo) {
              ws.send(JSON.stringify({
                type: 'call_accept',
                callId: callId,
                participant: {
                  id: callerInfo.id,
                  name: callerInfo.name,
                  avatar: callerInfo.avatar
                }
              }));
            } else {
              // Caller info not found, send generic response
              ws.send(JSON.stringify({
                type: 'call_accept',
                callId: callId,
                participant: {
                  id: call.caller,
                  name: 'Unknown User',
                  avatar: null
                }
              }));
            }
          }
        }
        else if (data.type === 'call_decline' || data.type === 'call_end') {
          const callId = data.callId;
          const call = activeCalls.get(callId);
          
          if (call) {
            // Notify both parties
            const endReason = data.type === 'call_decline' ? 'declined' : 'ended';
            
            // Notify caller
            const callerWs = connectedClients.get(call.caller);
            if (callerWs && callerWs.readyState === WebSocket.OPEN) {
              const participantInfo = await storage.getUser(call.target);
              if (participantInfo) {
                callerWs.send(JSON.stringify({
                  type: 'call_ended',
                  callId: callId,
                  reason: endReason,
                  participant: {
                    id: participantInfo.id,
                    name: participantInfo.name
                  }
                }));
              } else {
                callerWs.send(JSON.stringify({
                  type: 'call_ended',
                  callId: callId,
                  reason: endReason,
                  participant: {
                    id: call.target,
                    name: 'Unknown User'
                  }
                }));
              }
            }
            
            // Notify target
            const targetWs = connectedClients.get(call.target);
            if (targetWs && targetWs.readyState === WebSocket.OPEN) {
              const callerInfo = await storage.getUser(call.caller);
              if (callerInfo) {
                targetWs.send(JSON.stringify({
                  type: 'call_ended',
                  callId: callId,
                  reason: endReason,
                  participant: {
                    id: callerInfo.id,
                    name: callerInfo.name
                  }
                }));
              } else {
                targetWs.send(JSON.stringify({
                  type: 'call_ended',
                  callId: callId,
                  reason: endReason,
                  participant: {
                    id: call.caller,
                    name: 'Unknown User'
                  }
                }));
              }
            }
            
            // Remove the call
            activeCalls.delete(callId);
          }
        }
        // Collaborative Coding Environment
        else if (data.type === 'join_coding_session') {
          if (!userId) return;
          
          const environmentId = data.environmentId;
          activeEnvironmentId = environmentId;
          
          // Initialize session if not exists
          if (!activeCodeSessions.has(environmentId)) {
            activeCodeSessions.set(environmentId, new Set());
          }
          
          // Add user to the session
          activeCodeSessions.get(environmentId).add(userId);
          
          // Notify other users in the session
          const userInfo = await storage.getUser(userId);
          if (userInfo) {
            broadcastToCodeSession(environmentId, {
              type: 'collaborator_joined',
              environmentId: environmentId,
              user: {
                id: userInfo.id,
                name: userInfo.name,
                avatar: userInfo.avatar
              }
            }, userId); // Exclude the user who just joined
          } else {
            broadcastToCodeSession(environmentId, {
              type: 'collaborator_joined',
              environmentId: environmentId,
              user: {
                id: userId,
                name: 'Unknown User',
                avatar: null
              }
            }, userId);
          }
        }
        else if (data.type === 'leave_coding_session') {
          if (!userId || !activeEnvironmentId) return;
          
          const environmentId = data.environmentId;
          
          // Remove user from session
          if (activeCodeSessions.has(environmentId)) {
            activeCodeSessions.get(environmentId).delete(userId);
            
            // If no users left, cleanup the session
            if (activeCodeSessions.get(environmentId).size === 0) {
              activeCodeSessions.delete(environmentId);
            } else {
              // Notify others
              broadcastToCodeSession(environmentId, {
                type: 'collaborator_left',
                environmentId: environmentId,
                userId: userId
              }, userId);
            }
          }
          
          activeEnvironmentId = null;
        }
        else if (data.type === 'code_update') {
          if (!userId) return;
          
          const environmentId = data.environmentId;
          
          // Broadcast code changes to all users in the session
          broadcastToCodeSession(environmentId, {
            type: 'code_update',
            environmentId: environmentId,
            fileName: data.fileName,
            content: data.content,
            userId: userId
          });
        }
        else if (data.type === 'run_code') {
          if (!userId) return;
          
          // In a real implementation, this would execute the code in a sandbox
          // For this demo, we'll simulate execution
          setTimeout(() => {
            ws.send(JSON.stringify({
              type: 'run_result',
              output: `Executing ${data.mainFile}...\n`,
              finished: false
            }));
          }, 500);
          
          setTimeout(() => {
            ws.send(JSON.stringify({
              type: 'run_result',
              output: `Process started with PID 12345\n`,
              finished: false
            }));
          }, 1000);
          
          setTimeout(() => {
            ws.send(JSON.stringify({
              type: 'run_result',
              output: `Hello, world!\nProgram executed successfully.\n`,
              finished: true
            }));
          }, 2000);
        }
        // WebRTC Signaling
        else if (data.type === 'webrtc_signal') {
          if (!userId) return;
          
          const targetWs = connectedClients.get(data.targetUserId);
          if (targetWs && targetWs.readyState === WebSocket.OPEN) {
            targetWs.send(JSON.stringify({
              type: 'webrtc_signal',
              fromUserId: userId,
              signal: data.signal
            }));
          }
        }
        else if (data.type === 'webrtc_offer') {
          if (!userId) return;
          
          const targetWs = connectedClients.get(data.targetUserId);
          if (targetWs && targetWs.readyState === WebSocket.OPEN) {
            targetWs.send(JSON.stringify({
              type: 'webrtc_offer',
              fromUserId: userId,
              offer: data.offer
            }));
          }
        }
        else if (data.type === 'webrtc_answer') {
          if (!userId) return;
          
          const targetWs = connectedClients.get(data.targetUserId);
          if (targetWs && targetWs.readyState === WebSocket.OPEN) {
            targetWs.send(JSON.stringify({
              type: 'webrtc_answer',
              fromUserId: userId,
              answer: data.answer
            }));
          }
        }
        else if (data.type === 'webrtc_ice_candidate') {
          if (!userId) return;
          
          const targetWs = connectedClients.get(data.targetUserId);
          if (targetWs && targetWs.readyState === WebSocket.OPEN) {
            targetWs.send(JSON.stringify({
              type: 'webrtc_ice_candidate',
              fromUserId: userId,
              candidate: data.candidate
            }));
          }
        }
        // Media controls
        else if (data.type === 'media_toggle') {
          if (!userId) return;
          
          // Broadcast to all participants in the call
          const call = Array.from(activeCalls.values()).find(c => 
            c.caller === userId || c.target === userId
          );
          
          if (call) {
            const otherUserId = call.caller === userId ? call.target : call.caller;
            const otherWs = connectedClients.get(otherUserId);
            
            if (otherWs && otherWs.readyState === WebSocket.OPEN) {
              otherWs.send(JSON.stringify({
                type: 'media_toggle',
                userId: userId,
                mediaType: data.mediaType,
                enabled: data.enabled
              }));
            }
          }
        }
        else if (data.type === 'screen_share_start') {
          if (!userId) return;
          
          // Broadcast to all participants in the call
          const call = Array.from(activeCalls.values()).find(c => 
            c.caller === userId || c.target === userId
          );
          
          if (call) {
            const otherUserId = call.caller === userId ? call.target : call.caller;
            const otherWs = connectedClients.get(otherUserId);
            
            if (otherWs && otherWs.readyState === WebSocket.OPEN) {
              otherWs.send(JSON.stringify({
                type: 'screen_share_start',
                userId: userId,
                stream: data.stream
              }));
            }
          }
        }
        else if (data.type === 'screen_share_stop') {
          if (!userId) return;
          
          // Broadcast to all participants in the call
          const call = Array.from(activeCalls.values()).find(c => 
            c.caller === userId || c.target === userId
          );
          
          if (call) {
            const otherUserId = call.caller === userId ? call.target : call.caller;
            const otherWs = connectedClients.get(otherUserId);
            
            if (otherWs && otherWs.readyState === WebSocket.OPEN) {
              otherWs.send(JSON.stringify({
                type: 'screen_share_stop',
                userId: userId
              }));
            }
          }
        }
      } catch (err) {
        console.error('WebSocket message error:', err);
      }
    });
    
    // Handle disconnection
    ws.on('close', () => {
      if (userId) {
        // Remove from connected clients
        connectedClients.delete(userId);
        
        // Check for active calls and notify other party
        for (const [callId, call] of activeCalls.entries()) {
          if (call.caller === userId || call.target === userId) {
            const otherUserId = call.caller === userId ? call.target : call.caller;
            const otherUserWs = connectedClients.get(otherUserId);
            
            if (otherUserWs && otherUserWs.readyState === WebSocket.OPEN) {
              otherUserWs.send(JSON.stringify({
                type: 'call_ended',
                callId: callId,
                reason: 'disconnected'
              }));
            }
            
            activeCalls.delete(callId);
          }
        }
        
        // Remove from coding sessions
        if (activeEnvironmentId && activeCodeSessions.has(activeEnvironmentId)) {
          activeCodeSessions.get(activeEnvironmentId).delete(userId);
          
          // Notify other collaborators
          broadcastToCodeSession(activeEnvironmentId, {
            type: 'collaborator_left',
            environmentId: activeEnvironmentId,
            userId: userId
          }, userId);
          
          // Cleanup empty sessions
          if (activeCodeSessions.get(activeEnvironmentId).size === 0) {
            activeCodeSessions.delete(activeEnvironmentId);
          }
        }
      }
      
      console.log('Client disconnected from WebSocket');
    });
  });
  
  // Helper to broadcast to a coding session
  function broadcastToCodeSession(environmentId: number, message: any, excludeUserId?: number) {
    if (!activeCodeSessions.has(environmentId)) return;
    
    for (const userId of activeCodeSessions.get(environmentId)) {
      if (excludeUserId && userId === excludeUserId) continue;
      
      const userWs = connectedClients.get(userId);
      if (userWs && userWs.readyState === WebSocket.OPEN) {
        userWs.send(JSON.stringify(message));
      }
    }
  }
  
  // User routes
  app.get('/api/users/me', async (req, res) => {
    // In a real app, this would use authentication
    const currentUser = await storage.getUserByUsername('currentuser');
    res.json(currentUser);
  });
  
  app.get('/api/users/:id', async (req, res) => {
    const user = await storage.getUser(parseInt(req.params.id));
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(user);
  });
  
  // Conversation routes
  app.get('/api/conversations', async (req, res) => {
    const conversations = await storage.getConversations();
    
    // For each conversation, get the latest message to populate lastMessage
    const conversationsWithLastMessage = await Promise.all(
      conversations.map(async (conversation) => {
        const messages = await storage.getMessagesByConversationId(conversation.id);
        const lastMessage = messages.length > 0 ? messages[messages.length - 1] : null;
        
        return {
          ...conversation,
          lastMessage: lastMessage ? lastMessage.content : 'No messages yet',
          timestamp: lastMessage ? lastMessage.timestamp : conversation.createdAt,
        };
      })
    );
    
    res.json(conversationsWithLastMessage);
  });
  
  app.get('/api/conversations/:id', async (req, res) => {
    const conversation = await storage.getConversation(parseInt(req.params.id));
    if (!conversation) {
      return res.status(404).json({ message: 'Conversation not found' });
    }
    
    // Get participants to determine if one-to-one chat
    const participants = await storage.getConversationParticipants(conversation.id);
    
    // If one-to-one chat, get the other user's info
    let otherUser = null;
    if (!conversation.isGroup && participants.length === 2) {
      // Assuming current user is the first participant for demo purposes
      otherUser = await storage.getUser(participants[1].userId);
    }
    
    res.json({
      ...conversation,
      status: otherUser ? otherUser.status : undefined,
    });
  });
  
  app.get('/api/conversations/:id/messages', async (req, res) => {
    const messages = await storage.getMessagesByConversationId(parseInt(req.params.id));
    
    // Populate user info for each message
    const messagesWithUser = await Promise.all(
      messages.map(async (message) => {
        const user = await storage.getUser(message.userId);
        return {
          ...message,
          user: {
            name: user?.name || 'Unknown User',
            avatar: user?.avatar,
          },
        };
      })
    );
    
    res.json(messagesWithUser);
  });
  
  app.post('/api/conversations/:id/messages', async (req, res) => {
    try {
      const conversationId = parseInt(req.params.id);
      const validatedData = insertMessageSchema.parse({
        ...req.body,
        conversationId,
        userId: 1, // Assuming current user for demo
      });
      
      const message = await storage.createMessage(validatedData);
      
      // Get user info
      const user = await storage.getUser(message.userId);
      
      // Create an activity for this message
      await storage.createActivity({
        userId: message.userId,
        action: 'sent a message in',
        target: `conversation ${conversationId}`,
      });
      
      res.status(201).json({
        ...message,
        user: {
          name: user?.name || 'Unknown User',
          avatar: user?.avatar,
        },
      });
    } catch (error) {
      res.status(400).json({ message: 'Invalid message data', error });
    }
  });
  
  // Documents routes
  app.get('/api/documents', isAuthenticated, async (req, res) => {
    if (!req.user) return res.status(401).json({ error: 'User not authenticated' });
    
    // Check for optional query params
    const userId = req.query.userId ? parseInt(req.query.userId as string) : undefined;
    
    // Permission check for viewing other users' documents
    if (userId && userId !== req.user.id && req.user.role !== 'super_admin' && req.user.role !== 'teacher') {
      return res.status(403).json({ error: 'Not authorized to view these documents' });
    }
    
    let documents;
    if (userId) {
      documents = await storage.getDocumentsByUser(userId);
    } else {
      // Default to current user's documents
      documents = await storage.getDocumentsByUser(req.user.id);
    }
    
    res.json(documents);
  });
  
  app.get('/api/conversations/:id/documents', async (req, res) => {
    const documents = await storage.getDocumentsByConversationId(parseInt(req.params.id));
    res.json(documents);
  });
  
  app.get('/api/documents/:id', async (req, res) => {
    const document = await storage.getDocument(parseInt(req.params.id));
    if (!document) {
      return res.status(404).json({ message: 'Document not found' });
    }
    res.json(document);
  });
  
  app.post('/api/documents', isAuthenticated, async (req, res) => {
    try {
      if (!req.user) return res.status(401).json({ error: 'User not authenticated' });
      
      // Prepare document data with owner ID
      const documentData = {
        ...req.body,
        ownerId: req.user.id,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      // Create the document
      const document = await storage.createDocument(documentData);
      
      // Create activity for this action
      await storage.createActivity({
        userId: req.user.id,
        action: 'created document',
        target: document.name,
      });
      
      res.status(201).json(document);
    } catch (error) {
      console.error('Error creating document:', error);
      res.status(400).json({ error: 'Invalid document data', details: error });
    }
  });
  
  app.patch('/api/documents/:id', isAuthenticated, async (req, res) => {
    try {
      if (!req.user) return res.status(401).json({ error: 'User not authenticated' });
      
      const id = parseInt(req.params.id);
      const document = await storage.getDocument(id);
      
      // Check if document exists
      if (!document) {
        return res.status(404).json({ error: 'Document not found' });
      }
      
      // Check ownership or admin rights
      if (document.ownerId !== req.user.id && 
          req.user.role !== 'super_admin' &&
          req.user.role !== 'teacher') {
        return res.status(403).json({ error: 'Not authorized to update this document' });
      }
      
      // Update with current timestamp
      const documentData = {
        ...req.body,
        updatedAt: new Date().toISOString()
      };
      
      // Update the document
      const updatedDocument = await storage.updateDocument(id, documentData);
      
      // Create activity for this update
      await storage.createActivity({
        userId: req.user.id,
        action: 'updated document',
        target: document.name,
      });
      
      res.json(updatedDocument);
    } catch (error) {
      console.error('Error updating document:', error);
      res.status(400).json({ error: 'Invalid update data', details: error });
    }
  });
  
  app.delete('/api/documents/:id', isAuthenticated, async (req, res) => {
    try {
      if (!req.user) return res.status(401).json({ error: 'User not authenticated' });
      
      const id = parseInt(req.params.id);
      const document = await storage.getDocument(id);
      
      // Check if document exists
      if (!document) {
        return res.status(404).json({ error: 'Document not found' });
      }
      
      // Check ownership or admin rights
      if (document.ownerId !== req.user.id && 
          req.user.role !== 'super_admin' &&
          req.user.role !== 'teacher') {
        return res.status(403).json({ error: 'Not authorized to delete this document' });
      }
      
      // Delete the document
      await storage.deleteDocument(id);
      
      // Create activity for this deletion
      await storage.createActivity({
        userId: req.user.id,
        action: 'deleted document',
        target: document.name,
      });
      
      res.status(204).send();
    } catch (error) {
      console.error('Error deleting document:', error);
      res.status(500).json({ error: 'Failed to delete document', details: error });
    }
  });
  
  app.get('/api/documents/:id/comments', async (req, res) => {
    const comments = await storage.getDocumentComments(parseInt(req.params.id));
    
    // Populate user info for each comment
    const commentsWithUser = await Promise.all(
      comments.map(async (comment) => {
        const user = await storage.getUser(comment.userId);
        return {
          ...comment,
          user: {
            name: user?.name || 'Unknown User',
            avatar: user?.avatar,
          },
        };
      })
    );
    
    res.json(commentsWithUser);
  });
  
  app.post('/api/documents/:id/comments', isAuthenticated, async (req, res) => {
    try {
      if (!req.user) return res.status(401).json({ error: 'User not authenticated' });
      
      const documentId = parseInt(req.params.id);
      const document = await storage.getDocument(documentId);
      
      // Check if document exists
      if (!document) {
        return res.status(404).json({ error: 'Document not found' });
      }
      
      // Create the comment
      const commentData = {
        documentId,
        userId: req.user.id,
        content: req.body.content,
        timestamp: new Date().toISOString()
      };
      
      const comment = await storage.createDocumentComment(commentData);
      
      // Get user info
      const user = await storage.getUser(req.user.id);
      
      // Create activity for this comment
      await storage.createActivity({
        userId: req.user.id,
        action: 'commented on document',
        target: document.name,
      });
      
      res.status(201).json({
        ...comment,
        user: {
          name: user?.name || 'Unknown User',
          avatar: user?.avatar,
        },
      });
    } catch (error) {
      console.error('Error creating comment:', error);
      res.status(400).json({ error: 'Invalid comment data', details: error });
    }
  });
  
  // Teams routes
  app.get('/api/teams', async (req, res) => {
    const teams = await storage.getTeams();
    res.json(teams);
  });
  
  app.get('/api/teams/:id', async (req, res) => {
    const team = await storage.getTeam(parseInt(req.params.id));
    if (!team) {
      return res.status(404).json({ message: 'Team not found' });
    }
    res.json(team);
  });
  
  app.get('/api/teams/:id/members', async (req, res) => {
    const members = await storage.getTeamMembers(parseInt(req.params.id));
    
    // Get full user details for each member
    const membersWithDetails = await Promise.all(
      members.map(async (member) => {
        const user = await storage.getUser(member.userId);
        return {
          ...member,
          name: user?.name || 'Unknown User',
          avatar: user?.avatar,
          status: user?.status || 'offline',
        };
      })
    );
    
    res.json(membersWithDetails);
  });
  
  app.get('/api/teams/:id/channels', async (req, res) => {
    const channels = await storage.getChannelsByTeamId(parseInt(req.params.id));
    
    // For each channel, get the message count
    const channelsWithMessageCount = channels.map((channel) => ({
      ...channel,
      messageCount: Math.floor(Math.random() * 100), // Mock message count for demo
    }));
    
    res.json(channelsWithMessageCount);
  });
  
  // Files routes
  app.get('/api/files', async (req, res) => {
    const files = await storage.getFiles();
    res.json(files);
  });
  
  // Activity and stats routes
  app.get('/api/activity', async (req, res) => {
    const activities = await storage.getActivities();
    
    // Populate user info for each activity
    const activitiesWithUser = await Promise.all(
      activities.map(async (activity) => {
        const user = await storage.getUser(activity.userId);
        return {
          ...activity,
          user: {
            name: user?.name || 'Unknown User',
            avatar: user?.avatar,
            status: user?.status || 'offline',
          },
        };
      })
    );
    
    res.json(activitiesWithUser);
  });
  
  app.get('/api/stats', async (req, res) => {
    // Mock stats for demo
    res.json({
      unreadMessages: 5,
      upcomingMeetings: 2,
      sharedFiles: 12,
      scheduledCalls: 1,
      teamMembers: 8,
      activityScore: 85,
    });
  });

  // Calls/meetings routes
  app.get('/api/calls/history', isAuthenticated, async (req, res) => {
    if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
    
    // Mock call history data for demo
    const callHistory = [
      {
        id: 1,
        direction: 'outgoing',
        participant: { id: 2, name: 'Jane Smith' },
        timestamp: '10:30 AM',
        duration: '15m 23s',
        type: 'video',
        missed: false
      },
      {
        id: 2,
        direction: 'incoming',
        participant: { id: 3, name: 'Mike Johnson' },
        timestamp: 'Yesterday',
        duration: '32m 10s',
        type: 'audio',
        missed: false
      },
      {
        id: 3,
        direction: 'incoming',
        participant: { id: 4, name: 'Sarah Williams' },
        timestamp: 'Yesterday',
        duration: '0m 0s',
        type: 'video',
        missed: true
      },
      {
        id: 4,
        direction: 'outgoing',
        participant: { id: 5, name: 'David Brown' },
        timestamp: 'Jan 10',
        duration: '5m 32s',
        type: 'audio',
        missed: false
      }
    ];
    
    res.json(callHistory);
  });
  
  app.get('/api/meetings', isAuthenticated, async (req, res) => {
    if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
    
    // Mock meetings data for demo
    const meetings = [
      {
        id: 1,
        title: 'Weekly Team Sync',
        date: 'Today',
        startTime: '2:00 PM',
        endTime: '3:00 PM',
        organizer: { id: 2, name: 'Jane Smith' },
        participants: [
          { id: 1, name: req.user.name },
          { id: 2, name: 'Jane Smith' },
          { id: 3, name: 'Mike Johnson' },
          { id: 4, name: 'Sarah Williams' }
        ]
      },
      {
        id: 2,
        title: 'Project Review',
        date: 'Tomorrow',
        startTime: '10:00 AM',
        endTime: '11:30 AM',
        organizer: { id: 1, name: req.user.name },
        participants: [
          { id: 1, name: req.user.name },
          { id: 5, name: 'David Brown' },
          { id: 6, name: 'Emily Davis' }
        ]
      },
      {
        id: 3,
        title: 'Quarterly Planning',
        date: 'Jan 15',
        startTime: '9:00 AM',
        endTime: '12:00 PM',
        organizer: { id: 7, name: 'Alex Johnson' },
        participants: [
          { id: 1, name: req.user.name },
          { id: 7, name: 'Alex Johnson' },
          { id: 8, name: 'Chris Anderson' },
          { id: 9, name: 'Taylor Smith' },
          { id: 10, name: 'Jordan Lee' }
        ]
      }
    ];
    
    res.json(meetings);
  });
  
  // Games routes
  app.get('/api/games', isAuthenticated, async (req, res) => {
    if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
    
    // Mock games data for demo
    const games = [
      {
        id: 1,
        name: 'Math Adventure',
        description: 'Practice math skills through an interactive adventure game.',
        difficulty: 'easy',
        category: 'mathematics',
        highScore: 950,
        playCount: 1245,
        ageRange: '8-12'
      },
      {
        id: 2,
        name: 'Code Quest',
        description: 'Learn programming concepts by solving puzzles and completing quests.',
        difficulty: 'medium',
        category: 'programming',
        highScore: 780,
        playCount: 890,
        ageRange: '10-16'
      },
      {
        id: 3,
        name: 'History Explorer',
        description: 'Travel through time and learn about historical events and figures.',
        difficulty: 'easy',
        category: 'history',
        highScore: 850,
        playCount: 720,
        ageRange: '9-14'
      },
      {
        id: 4,
        name: 'Science Lab',
        description: 'Conduct virtual experiments and learn scientific principles.',
        difficulty: 'hard',
        category: 'science',
        highScore: 920,
        playCount: 650,
        ageRange: '12-18'
      },
      {
        id: 5,
        name: 'Language Master',
        description: 'Improve vocabulary and grammar through interactive word games.',
        difficulty: 'medium',
        category: 'language',
        highScore: 880,
        playCount: 925,
        ageRange: '10-15'
      }
    ];
    
    res.json(games);
  });
  
  app.get('/api/games/access', isAuthenticated, async (req, res) => {
    if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
    
    // Only teachers and admins can access all game access records
    if (req.user.role !== 'teacher' && req.user.role !== 'admin' && req.user.role !== 'super_admin') {
      return res.status(403).json({ error: 'Not authorized to view game access records' });
    }
    
    // For teachers, only show records for their students
    let gameAccessList;
    if (req.user.role === 'teacher') {
      gameAccessList = await storage.getGameAccessByTeacher(req.user.id);
    } else {
      // For admins, show all records
      gameAccessList = await storage.getGameAccess(0); // 0 means get all
    }
    
    res.json(gameAccessList);
  });
  
  app.get('/api/games/access/student', isAuthenticated, async (req, res) => {
    if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
    
    // Students can only see their own access records
    if (req.user.role !== 'student') {
      return res.status(403).json({ error: 'Endpoint only for students' });
    }
    
    const accessList = await storage.getGameAccessByStudent(req.user.id);
    res.json(accessList);
  });
  
  app.post('/api/games/access', isAuthenticated, async (req, res) => {
    try {
      if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
      
      // Only teachers and admins can manage game access
      if (req.user.role !== 'teacher' && req.user.role !== 'admin' && req.user.role !== 'super_admin') {
        return res.status(403).json({ error: 'Not authorized to manage game access' });
      }
      
      const { studentId, gameId, granted } = req.body;
      
      // Check if access record already exists
      const existingAccessList = await storage.getGameAccess(0);
      const accessRecord = existingAccessList.find((access) => 
        access.studentId === studentId && access.gameId === gameId
      );
      
      let result;
      if (accessRecord) {
        // Update existing access
        result = await storage.updateGameAccess(accessRecord.id, granted);
      } else {
        // Create new access record
        result = await storage.createGameAccess({
          studentId,
          gameId,
          teacherId: req.user.id,
          granted
        });
      }
      
      // Create activity record
      await storage.createActivity({
        userId: req.user.id,
        action: granted ? 'granted game access to' : 'revoked game access from',
        target: `student ${studentId} for game ${gameId}`
      });
      
      res.status(200).json(result);
    } catch (error) {
      console.error('Error managing game access:', error);
      res.status(400).json({ error: 'Invalid game access data' });
    }
  });
  
  // Application settings
  app.get('/api/settings', isAuthenticated, async (req, res) => {
    if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
    
    // In a real app, these would be fetched from the database
    // For demo, we'll return default settings
    const settings = {
      theme: 'system',
      language: 'en',
      notifications: {
        email: true,
        desktop: true,
        messages: true,
        mentions: true,
        teamUpdates: true
      },
      privacy: {
        showStatus: true,
        showLastSeen: true,
        allowTagging: true,
        autoAcceptMeetings: false
      },
      sound: {
        masterVolume: 80,
        callVolume: 100,
        notificationVolume: 70
      },
      accessibility: {
        highContrast: false,
        reducedMotion: false,
        largeText: false,
        screenReader: false
      }
    };
    
    res.json(settings);
  });
  
  app.post('/api/settings', isAuthenticated, async (req, res) => {
    if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
    
    // In a real app, these would be stored in the database
    // For demo, we'll just return the received settings
    res.json(req.body);
  });
  
  // User management routes for super admin
  app.get('/api/users/students', isAuthenticated, async (req, res) => {
    if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
    
    // Only teachers and admins can view students
    if (req.user.role !== 'teacher' && req.user.role !== 'admin' && req.user.role !== 'super_admin') {
      return res.status(403).json({ error: 'Not authorized to view students' });
    }
    
    // Get all users with student role
    const users = await storage.getUsers();
    const students = users.filter(user => user.role === 'student');
    
    res.json(students);
  });
  
  // Apps routes
  app.get('/api/apps', isAuthenticated, async (req, res) => {
    if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
    
    // Mock apps data for demo
    const apps = [
      {
        id: 1,
        name: 'Whiteboard',
        description: 'Collaborative digital whiteboard for brainstorming and planning.',
        publisher: 'TeamSync',
        icon: 'border_color',
        category: 'Collaboration',
        rating: 4.5,
        installed: true,
        featured: true
      },
      {
        id: 2,
        name: 'Calendar',
        description: 'Schedule and manage meetings, events, and deadlines.',
        publisher: 'TeamSync',
        icon: 'calendar_today',
        category: 'Productivity',
        rating: 4.7,
        installed: true
      },
      {
        id: 3,
        name: 'Forms',
        description: 'Create surveys, quizzes, and collect structured data.',
        publisher: 'TeamSync',
        icon: 'assignment',
        category: 'Data Collection',
        rating: 4.2,
        installed: false
      },
      {
        id: 4,
        name: 'Math Tools',
        description: 'Advanced mathematical tools and equation editor.',
        publisher: 'EduApps',
        icon: 'functions',
        category: 'Education',
        rating: 4.0,
        installed: false,
        new: true
      },
      {
        id: 5,
        name: 'Code Snippets',
        description: 'Share and collaborate on code snippets with syntax highlighting.',
        publisher: 'DevTools',
        icon: 'code',
        category: 'Development',
        rating: 4.8,
        installed: false
      },
      {
        id: 6,
        name: 'Translator',
        description: 'Translate text and documents between multiple languages.',
        publisher: 'LangTools',
        icon: 'translate',
        category: 'Language',
        rating: 4.6,
        installed: false
      },
      {
        id: 7,
        name: 'Polls',
        description: 'Quick polls for team decisions and feedback.',
        publisher: 'TeamSync',
        icon: 'poll',
        category: 'Collaboration',
        rating: 4.3,
        installed: true
      },
      {
        id: 8,
        name: 'Flashcards',
        description: 'Create and study with digital flashcards.',
        publisher: 'EduApps',
        icon: 'style',
        category: 'Education',
        rating: 4.1,
        installed: false,
        featured: true
      }
    ];
    
    res.json(apps);
  });
  
  // Coding environment routes
  app.get('/api/coding-environments', isAuthenticated, async (req, res) => {
    if (!req.user) return res.status(401).json({ error: 'User not authenticated' });
    const environments = await storage.getCodingEnvironments(req.user.id);
    res.json(environments);
  });
  
  app.get('/api/coding-environments/:id', isAuthenticated, async (req, res) => {
    const environment = await storage.getCodingEnvironment(parseInt(req.params.id));
    if (!environment) {
      return res.status(404).json({ error: 'Coding environment not found' });
    }
    
    // Check if user has access (either owner or environment is public)
    if (req.user?.id !== environment.userId && !environment.isPublic) {
      return res.status(403).json({ error: 'No access to this coding environment' });
    }
    
    res.json(environment);
  });
  
  app.post('/api/coding-environments', isAuthenticated, async (req, res) => {
    try {
      if (!req.user) return res.status(401).json({ error: 'User not authenticated' });
      
      const validatedData = insertCodingEnvironmentSchema.parse({
        ...req.body,
        userId: req.user.id,
      });
      
      const environment = await storage.createCodingEnvironment(validatedData);
      
      // Create activity
      await storage.createActivity({
        userId: req.user.id,
        action: 'created a coding environment',
        target: environment.name,
      });
      
      res.status(201).json(environment);
    } catch (error) {
      res.status(400).json({ error: 'Invalid coding environment data', details: error });
    }
  });
  
  app.patch('/api/coding-environments/:id', isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const environment = await storage.getCodingEnvironment(id);
      
      // Check if environment exists
      if (!environment) {
        return res.status(404).json({ error: 'Coding environment not found' });
      }
      
      // Check if user is the owner
      if (req.user?.id !== environment.userId) {
        return res.status(403).json({ error: 'Not authorized to update this environment' });
      }
      
      // Update the environment
      const updatedEnvironment = await storage.updateCodingEnvironment(id, req.body);
      res.json(updatedEnvironment);
    } catch (error) {
      res.status(400).json({ error: 'Invalid update data', details: error });
    }
  });
  
  // GitHub repository routes
  app.get('/api/github-repositories', isAuthenticated, async (req, res) => {
    if (!req.user) return res.status(401).json({ error: 'User not authenticated' });
    
    // Check if user has GitHub credentials
    if (!req.user.githubAccessToken) {
      return res.status(403).json({ error: 'No GitHub access token. Connect your GitHub account first.' });
    }
    
    const repositories = await storage.getGithubRepositories(req.user.id);
    res.json(repositories);
  });
  
  app.post('/api/github-repositories', isAuthenticated, async (req, res) => {
    try {
      if (!req.user) return res.status(401).json({ error: 'User not authenticated' });
      
      // Check if user has GitHub credentials
      if (!req.user.githubAccessToken) {
        return res.status(403).json({ error: 'No GitHub access token. Connect your GitHub account first.' });
      }
      
      const validatedData = insertGithubRepositorySchema.parse({
        ...req.body,
        userId: req.user.id,
      });
      
      const repository = await storage.createGithubRepository(validatedData);
      
      // Create activity
      await storage.createActivity({
        userId: req.user.id,
        action: 'added GitHub repository',
        target: repository.name,
      });
      
      res.status(201).json(repository);
    } catch (error) {
      res.status(400).json({ error: 'Invalid repository data', details: error });
    }
  });
  
  // Game access routes (teacher-only)
  app.get('/api/game-access', isAuthenticated, async (req, res) => {
    if (!req.user) return res.status(401).json({ error: 'User not authenticated' });
    
    let accessEntries: GameAccess[] = [];
    if (req.user.role === 'teacher') {
      // Teachers see all students they've given access to
      accessEntries = await storage.getGameAccessByTeacher(req.user.id);
    } else if (req.user.role === 'student') {
      // Students see their own access status
      accessEntries = await storage.getGameAccessByStudent(req.user.id);
    } else if (req.user.role === 'super_admin') {
      // Super admins can see all access entries (simplified implementation)
      const teamsPromise = storage.getTeams();
      const teams = await teamsPromise;
      
      const teamMembersPromises = teams.map(team => storage.getTeamMembers(team.id));
      const teamMembersArrays = await Promise.all(teamMembersPromises);
      
      const studentMembers = teamMembersArrays.flat().filter(m => m.role === 'student');
      
      const gameAccessPromises = studentMembers.map(member => 
        storage.getGameAccessByStudent(member.userId)
      );
      const gameAccessArrays = await Promise.all(gameAccessPromises);
      
      // Flatten all the access entries
      accessEntries = gameAccessArrays.flat();
    }
    
    // Populate with user details
    const accessWithDetails = await Promise.all(
      accessEntries.map(async (access) => {
        const student = await storage.getUser(access.studentId);
        const teacher = await storage.getUser(access.teacherId);
        return {
          ...access,
          student: {
            id: student?.id,
            name: student?.name || 'Unknown Student',
            username: student?.username,
          },
          teacher: {
            id: teacher?.id,
            name: teacher?.name || 'Unknown Teacher',
            username: teacher?.username,
          }
        };
      })
    );
    
    res.json(accessWithDetails);
  });
  
  app.post('/api/game-access', isAuthenticated, hasRole(['teacher', 'super_admin']), async (req, res) => {
    try {
      if (!req.user) return res.status(401).json({ error: 'User not authenticated' });
      
      const validatedData = insertGameAccessSchema.parse({
        ...req.body,
        teacherId: req.user.id,
      });
      
      // Verify student exists and is actually a student
      const student = await storage.getUser(validatedData.studentId);
      if (!student) {
        return res.status(404).json({ error: 'Student not found' });
      }
      
      if (student.role !== 'student') {
        return res.status(400).json({ error: 'User is not a student' });
      }
      
      const access = await storage.createGameAccess(validatedData);
      
      // Create activity
      await storage.createActivity({
        userId: req.user.id,
        action: access.granted ? 'granted game access to' : 'denied game access to',
        target: student.username,
      });
      
      res.status(201).json(access);
    } catch (error) {
      res.status(400).json({ error: 'Invalid game access data', details: error });
    }
  });
  
  // Get all users (for search & discovery)
  app.get("/api/users", isAuthenticated, async (req, res) => {
    try {
      if (!req.isAuthenticated()) return res.sendStatus(401);
      
      const users = await storage.getUsers();
      
      // Don't send password fields to client
      const safeUsers = users.map(user => {
        const { password, ...safeUser } = user;
        return safeUser;
      });
      
      res.json(safeUsers);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).send("Error fetching users");
    }
  });
  
  // Get or create a direct conversation with another user
  app.post("/api/conversations/direct", isAuthenticated, async (req, res) => {
    try {
      if (!req.isAuthenticated()) return res.sendStatus(401);
      
      const { participantId } = req.body;
      const currentUserId = req.user!.id;
      
      if (participantId === currentUserId) {
        return res.status(400).send("Cannot start a conversation with yourself");
      }
      
      // Check if a direct conversation already exists between these users
      const conversations = await storage.getConversationsByParticipants([currentUserId, participantId]);
      
      if (conversations.length > 0) {
        // Return the existing conversation
        return res.json(conversations[0]);
      }
      
      // Create a new conversation
      const conversation = await storage.createConversation({
        type: "direct",
        name: "Direct Message",
        createdBy: currentUserId,
        isGroup: false
      });
      
      // Add both users as participants
      await storage.addConversationParticipant({
        conversationId: conversation.id,
        userId: currentUserId
      });
      
      await storage.addConversationParticipant({
        conversationId: conversation.id,
        userId: participantId
      });
      
      res.status(201).json(conversation);
    } catch (error) {
      console.error("Error creating conversation:", error);
      res.status(500).send("Error creating conversation");
    }
  });

  // Supabase Auth sync endpoint
  app.post("/api/auth/supabase", async (req, res) => {
    try {
      const { id, email, name, avatar } = req.body;
      
      if (!id || !email) {
        return res.status(400).json({ error: "Missing required fields" });
      }
      
      // Check if user exists by supabaseId
      let user = await storage.getUserBySupabaseId(id);
      
      if (!user) {
        // If not found, check if there's a user with the same email
        user = await storage.getUserByEmail(email);
        
        if (user) {
          // Update existing user with Supabase ID
          user = await storage.updateUser(user.id, { 
            supabaseId: id,
            avatar: avatar || user.avatar
          });
        } else {
          // Create new user
          user = await storage.createUser({
            username: email.split('@')[0],
            email,
            name: name || email.split('@')[0],
            password: '', // Not used with social login
            supabaseId: id,
            avatar,
            role: 'user'
          });
        }
      }
      
      // Set user in session
      if (!user) {
        return res.status(500).json({ error: "Failed to create or retrieve user" });
      }
      
      if (req.login) {
        req.login(user, (err) => {
          if (err) {
            return res.status(500).json({ error: "Failed to log in" });
          }
          return res.status(200).json(user);
        });
      } else {
        return res.status(200).json(user);
      }
    } catch (error) {
      console.error("Error in /api/auth/supabase:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  });
  
  app.patch('/api/game-access/:id', isAuthenticated, hasRole(['teacher', 'super_admin']), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const access = await storage.getGameAccess(id);
      
      // Check if access entry exists
      if (!access) {
        return res.status(404).json({ error: 'Game access entry not found' });
      }
      
      // Check if user is the teacher who granted access or super admin
      if (req.user?.id !== access.teacherId && req.user?.role !== 'super_admin') {
        return res.status(403).json({ error: 'Not authorized to update this access entry' });
      }
      
      // Update the access
      const updatedAccess = await storage.updateGameAccess(id, req.body.granted);
      
      // Create activity
      const student = await storage.getUser(access.studentId);
      await storage.createActivity({
        userId: req.user.id,
        action: updatedAccess?.granted ? 'granted game access to' : 'denied game access to',
        target: student?.username || 'student',
      });
      
      res.json(updatedAccess);
    } catch (error) {
      res.status(400).json({ error: 'Invalid update data', details: error });
    }
  });

  // Calendar Events Routes
  app.get('/api/calendar-events', isAuthenticated, async (req, res) => {
    try {
      // Check for filter params
      const userId = req.query.userId ? parseInt(req.query.userId as string) : undefined;
      const teamId = req.query.teamId ? parseInt(req.query.teamId as string) : undefined;
      const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
      const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;
      
      let events = [];
      
      if (startDate && endDate) {
        // Filter by date range
        events = await storage.getCalendarEventsByDateRange(startDate, endDate);
      } else if (userId) {
        // Filter by user
        events = await storage.getCalendarEventsByUser(userId);
      } else if (teamId) {
        // Filter by team
        events = await storage.getCalendarEventsByTeam(teamId);
      } else {
        // Get all events
        events = await storage.getCalendarEvents();
      }
      
      // If applicable, populate attendance status for current user
      if (req.user) {
        const eventsWithAttendance = await Promise.all(
          events.map(async (event) => {
            const attendees = await storage.getEventAttendees(event.id);
            const currentUserAttendance = attendees.find(a => a.userId === req.user!.id);
            
            return {
              ...event,
              currentUserStatus: currentUserAttendance ? currentUserAttendance.status : 'no_response'
            };
          })
        );
        
        res.json(eventsWithAttendance);
      } else {
        res.json(events);
      }
    } catch (error) {
      console.error('Error fetching calendar events:', error);
      res.status(500).json({ message: 'Error fetching calendar events' });
    }
  });
  
  app.get('/api/calendar-events/:id', isAuthenticated, async (req, res) => {
    try {
      const eventId = parseInt(req.params.id);
      const event = await storage.getCalendarEvent(eventId);
      
      if (!event) {
        return res.status(404).json({ message: 'Calendar event not found' });
      }
      
      // Get attendees for the event
      const attendees = await storage.getEventAttendees(eventId);
      const attendeesWithInfo = await Promise.all(
        attendees.map(async (attendee) => {
          const user = await storage.getUser(attendee.userId);
          return {
            ...attendee,
            user: {
              id: user?.id,
              name: user?.name,
              avatar: user?.avatar,
              role: user?.role
            }
          };
        })
      );
      
      res.json({
        ...event,
        attendees: attendeesWithInfo
      });
    } catch (error) {
      console.error('Error fetching calendar event details:', error);
      res.status(500).json({ message: 'Error fetching calendar event details' });
    }
  });
  
  app.post('/api/calendar-events', isAuthenticated, async (req, res) => {
    try {
      const validatedData = insertCalendarEventSchema.parse({
        ...req.body,
        createdBy: req.user!.id
      });
      
      const event = await storage.createCalendarEvent(validatedData);
      
      // If attendees are specified, add them
      if (req.body.attendees && Array.isArray(req.body.attendees)) {
        for (const attendeeId of req.body.attendees) {
          await storage.createEventAttendee({
            eventId: event.id,
            userId: attendeeId,
            status: 'pending'
          });
          
          // Create notification for each attendee
          await storage.createCalendarNotification({
            eventId: event.id,
            userId: attendeeId,
            isRead: false,
            remindAt: new Date(event.startTime.getTime() - 30 * 60000) // 30 minutes before event
          });
        }
      }
      
      // Create activity for this event creation
      await storage.createActivity({
        userId: req.user!.id,
        action: 'created calendar event',
        target: event.title
      });
      
      res.status(201).json(event);
    } catch (error) {
      console.error('Error creating calendar event:', error);
      res.status(400).json({ message: 'Error creating calendar event', error });
    }
  });
  
  app.patch('/api/calendar-events/:id', isAuthenticated, async (req, res) => {
    try {
      const eventId = parseInt(req.params.id);
      const event = await storage.getCalendarEvent(eventId);
      
      if (!event) {
        return res.status(404).json({ message: 'Calendar event not found' });
      }
      
      // Only creator or admin can update events
      if (event.createdBy !== req.user!.id && req.user!.role !== 'super_admin' && req.user!.role !== 'teacher') {
        return res.status(403).json({ message: 'You do not have permission to update this event' });
      }
      
      // Update the event
      const updatedEvent = await storage.updateCalendarEvent(eventId, req.body);
      
      // Create activity for this event update
      await storage.createActivity({
        userId: req.user!.id,
        action: 'updated calendar event',
        target: event.title
      });
      
      res.json(updatedEvent);
    } catch (error) {
      console.error('Error updating calendar event:', error);
      res.status(400).json({ message: 'Error updating calendar event', error });
    }
  });
  
  app.delete('/api/calendar-events/:id', isAuthenticated, async (req, res) => {
    try {
      const eventId = parseInt(req.params.id);
      const event = await storage.getCalendarEvent(eventId);
      
      if (!event) {
        return res.status(404).json({ message: 'Calendar event not found' });
      }
      
      // Only creator or admin can delete events
      if (event.createdBy !== req.user!.id && req.user!.role !== 'super_admin' && req.user!.role !== 'teacher') {
        return res.status(403).json({ message: 'You do not have permission to delete this event' });
      }
      
      // Delete the event
      await storage.deleteCalendarEvent(eventId);
      
      // Create activity for this event deletion
      await storage.createActivity({
        userId: req.user!.id,
        action: 'deleted calendar event',
        target: event.title
      });
      
      res.status(204).send();
    } catch (error) {
      console.error('Error deleting calendar event:', error);
      res.status(500).json({ message: 'Error deleting calendar event' });
    }
  });
  
  // Calendar Event Attendees Routes
  app.get('/api/calendar-events/:eventId/attendees', isAuthenticated, async (req, res) => {
    try {
      const eventId = parseInt(req.params.eventId);
      const attendees = await storage.getEventAttendees(eventId);
      
      // Populate user data for each attendee
      const attendeesWithUserInfo = await Promise.all(
        attendees.map(async (attendee) => {
          const user = await storage.getUser(attendee.userId);
          return {
            ...attendee,
            user: {
              id: user?.id,
              name: user?.name,
              avatar: user?.avatar,
              role: user?.role
            }
          };
        })
      );
      
      res.json(attendeesWithUserInfo);
    } catch (error) {
      console.error('Error fetching event attendees:', error);
      res.status(500).json({ message: 'Error fetching event attendees' });
    }
  });
  
  app.post('/api/event-attendees', isAuthenticated, async (req, res) => {
    try {
      const validatedData = insertEventAttendeeSchema.parse({
        ...req.body,
        status: req.body.status || 'pending'
      });
      
      // Check if this attendee is already added
      const existingAttendees = await storage.getEventAttendees(validatedData.eventId);
      const alreadyExists = existingAttendees.some(a => a.userId === validatedData.userId);
      
      if (alreadyExists) {
        return res.status(400).json({ message: 'User is already an attendee of this event' });
      }
      
      const attendee = await storage.createEventAttendee(validatedData);
      
      // Create notification for the new attendee
      const event = await storage.getCalendarEvent(validatedData.eventId);
      if (event) {
        await storage.createCalendarNotification({
          eventId: event.id,
          userId: validatedData.userId,
          isRead: false,
          remindAt: new Date(event.startTime.getTime() - 30 * 60000) // 30 minutes before event
        });
      }
      
      res.status(201).json(attendee);
    } catch (error) {
      console.error('Error adding event attendee:', error);
      res.status(400).json({ message: 'Error adding event attendee', error });
    }
  });
  
  app.patch('/api/event-attendees/:id', isAuthenticated, async (req, res) => {
    try {
      const attendeeId = parseInt(req.params.id);
      const { status } = req.body;
      
      const updatedAttendee = await storage.updateEventAttendeeStatus(attendeeId, status);
      
      // Create activity for this response
      if (updatedAttendee) {
        const event = await storage.getCalendarEvent(updatedAttendee.eventId);
        await storage.createActivity({
          userId: req.user!.id,
          action: `responded ${status} to event invitation`,
          target: event ? event.title : `event ${updatedAttendee.eventId}`
        });
      }
      
      res.json(updatedAttendee);
    } catch (error) {
      console.error('Error updating event attendee status:', error);
      res.status(400).json({ message: 'Error updating event attendee status', error });
    }
  });
  
  app.delete('/api/event-attendees/:id', isAuthenticated, async (req, res) => {
    try {
      const attendeeId = parseInt(req.params.id);
      await storage.deleteEventAttendee(attendeeId);
      res.status(204).send();
    } catch (error) {
      console.error('Error removing event attendee:', error);
      res.status(500).json({ message: 'Error removing event attendee' });
    }
  });
  
  // Holiday Routes
  app.get('/api/holidays', isAuthenticated, async (req, res) => {
    try {
      // Check for filter params
      const institutionId = req.query.institutionId ? parseInt(req.query.institutionId as string) : undefined;
      const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
      const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;
      const urgentOnly = req.query.urgentOnly === 'true';
      const globalOnly = req.query.globalOnly === 'true';
      
      let holidays = [];
      
      if (startDate && endDate) {
        // Filter by date range
        holidays = await storage.getHolidaysByDateRange(startDate, endDate);
      } else if (institutionId) {
        // Filter by institution
        holidays = await storage.getHolidaysByInstitution(institutionId);
      } else if (globalOnly) {
        // Get global holidays
        holidays = await storage.getGlobalHolidays();
      } else if (urgentOnly) {
        // Get urgent notifications
        holidays = await storage.getUrgentHolidays();
      } else {
        // Get all holidays
        holidays = await storage.getHolidays();
      }
      
      res.json(holidays);
    } catch (error) {
      console.error('Error fetching holidays:', error);
      res.status(500).json({ message: 'Error fetching holidays' });
    }
  });
  
  app.get('/api/holidays/:id', isAuthenticated, async (req, res) => {
    try {
      const holidayId = parseInt(req.params.id);
      const holiday = await storage.getHoliday(holidayId);
      
      if (!holiday) {
        return res.status(404).json({ message: 'Holiday not found' });
      }
      
      res.json(holiday);
    } catch (error) {
      console.error('Error fetching holiday details:', error);
      res.status(500).json({ message: 'Error fetching holiday details' });
    }
  });
  
  app.post('/api/holidays', isAuthenticated, hasRole(['super_admin', 'teacher']), async (req, res) => {
    try {
      const validatedData = insertHolidaySchema.parse({
        ...req.body,
        createdBy: req.user!.id
      });
      
      const holiday = await storage.createHoliday(validatedData);
      
      // Create activity for this holiday creation
      await storage.createActivity({
        userId: req.user!.id,
        action: 'created holiday',
        target: holiday.title
      });
      
      res.status(201).json(holiday);
    } catch (error) {
      console.error('Error creating holiday:', error);
      res.status(400).json({ message: 'Error creating holiday', error });
    }
  });
  
  app.patch('/api/holidays/:id', isAuthenticated, hasRole(['super_admin', 'teacher']), async (req, res) => {
    try {
      const holidayId = parseInt(req.params.id);
      const holiday = await storage.getHoliday(holidayId);
      
      if (!holiday) {
        return res.status(404).json({ message: 'Holiday not found' });
      }
      
      // Only creator or admin can update holidays
      if (holiday.createdBy !== req.user!.id && req.user!.role !== 'super_admin') {
        return res.status(403).json({ message: 'You do not have permission to update this holiday' });
      }
      
      // Update the holiday
      const updatedHoliday = await storage.updateHoliday(holidayId, req.body);
      
      // Create activity for this holiday update
      await storage.createActivity({
        userId: req.user!.id,
        action: 'updated holiday',
        target: holiday.title
      });
      
      res.json(updatedHoliday);
    } catch (error) {
      console.error('Error updating holiday:', error);
      res.status(400).json({ message: 'Error updating holiday', error });
    }
  });
  
  app.delete('/api/holidays/:id', isAuthenticated, hasRole(['super_admin', 'teacher']), async (req, res) => {
    try {
      const holidayId = parseInt(req.params.id);
      const holiday = await storage.getHoliday(holidayId);
      
      if (!holiday) {
        return res.status(404).json({ message: 'Holiday not found' });
      }
      
      // Only creator or admin can delete holidays
      if (holiday.createdBy !== req.user!.id && req.user!.role !== 'super_admin') {
        return res.status(403).json({ message: 'You do not have permission to delete this holiday' });
      }
      
      // Delete the holiday
      await storage.deleteHoliday(holidayId);
      
      // Create activity for this holiday deletion
      await storage.createActivity({
        userId: req.user!.id,
        action: 'deleted holiday',
        target: holiday.title
      });
      
      res.status(204).send();
    } catch (error) {
      console.error('Error deleting holiday:', error);
      res.status(500).json({ message: 'Error deleting holiday' });
    }
  });
  
  // Calendar Notifications Routes
  app.get('/api/calendar-notifications', isAuthenticated, async (req, res) => {
    try {
      const notifications = await storage.getCalendarNotifications(req.user!.id);
      
      // Populate event data for each notification
      const notificationsWithEventInfo = await Promise.all(
        notifications.map(async (notification) => {
          const event = await storage.getCalendarEvent(notification.eventId);
          return {
            ...notification,
            event: event ? {
              id: event.id,
              title: event.title,
              startTime: event.startTime,
              endTime: event.endTime,
              location: event.location
            } : null
          };
        })
      );
      
      res.json(notificationsWithEventInfo);
    } catch (error) {
      console.error('Error fetching calendar notifications:', error);
      res.status(500).json({ message: 'Error fetching calendar notifications' });
    }
  });
  
  app.patch('/api/calendar-notifications/:id/read', isAuthenticated, async (req, res) => {
    try {
      const notificationId = parseInt(req.params.id);
      const updatedNotification = await storage.markCalendarNotificationAsRead(notificationId);
      
      res.json(updatedNotification);
    } catch (error) {
      console.error('Error marking notification as read:', error);
      res.status(500).json({ message: 'Error marking notification as read' });
    }
  });
  
  app.delete('/api/calendar-notifications/:id', isAuthenticated, async (req, res) => {
    try {
      const notificationId = parseInt(req.params.id);
      await storage.deleteCalendarNotification(notificationId);
      
      res.status(204).send();
    } catch (error) {
      console.error('Error deleting notification:', error);
      res.status(500).json({ message: 'Error deleting notification' });
    }
  });

  return httpServer;
}
