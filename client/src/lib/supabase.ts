import type { Provider } from '@supabase/supabase-js';
import { apiRequest } from './queryClient';

// Mock Supabase client for local development
// This mock allows the app to run without requiring Supabase credentials
class MockSupabaseClient {
  constructor() {
    console.log('Using MockSupabaseClient for local development');
  }

  auth = {
    signUp: async ({ email, password, options }: { email: string; password: string; options?: { data?: { full_name?: string } } }) => {
      try {
        // Pass through to our backend registration instead
        const response = await apiRequest('POST', '/api/register', {
          email,
          password,
          name: options?.data?.full_name || email.split('@')[0],
          username: email.split('@')[0], // Generate username from email
          role: 'student', // Default role
          status: 'available', // Default status
        });
        
        if (!response.ok) {
          const error = await response.json();
          return { data: null, error: new Error(error.message || 'Registration failed') };
        }

        const user = await response.json();
        return { 
          data: { 
            user: {
              id: user.id,
              email: user.email,
              user_metadata: {
                full_name: user.name
              }
            }
          }, 
          error: null 
        };
      } catch (error) {
        return { data: null, error: error as Error };
      }
    },
    signInWithOAuth: async () => {
      console.log('Mock: signInWithOAuth is not available in local development');
      return { data: null, error: new Error('Not available in local development') };
    },
    signInWithPassword: async ({ email, password }: any) => {
      // Pass through to our backend authentication instead
      try {
        const response = await apiRequest('POST', '/api/login', {
          username: email,
          password: password
        });
        const user = await response.json();
        return { data: { user }, error: null };
      } catch (error) {
        return { data: null, error: error as Error };
      }
    },
    getSession: async () => {
      // Get user from our backend instead
      try {
        const response = await apiRequest('GET', '/api/user');
        if (!response.ok) {
          return { data: { session: null }, error: null };
        }
        const user = await response.json();
        return {
          data: {
            session: {
              user: {
                id: user.id.toString(),
                email: user.email,
                user_metadata: {
                  full_name: user.name,
                  avatar_url: user.avatar
                }
              }
            }
          },
          error: null
        };
      } catch (error) {
        return { data: { session: null }, error: null };
      }
    },
    signOut: async () => {
      try {
        await apiRequest('POST', '/api/logout');
        return { error: null };
      } catch (error) {
        return { error: error as Error };
      }
    },
    onAuthStateChange: () => {
      // Return a mock subscription that does nothing
      return {
        data: {
          subscription: {
            unsubscribe: () => {}
          }
        }
      };
    }
  }
};

// Export a mock client
export const supabase = new MockSupabaseClient();

export const signInWithProvider = async (provider: Provider) => {
  try {
    // In local development, show message about unavailable feature
    console.log(`Sign in with ${provider} is not available in local development`);
    throw new Error(`Sign in with ${provider} is not available in local development mode. Please use username/password login.`);
  } catch (error) {
    console.error("Error signing in with provider:", error);
    throw error;
  }
};

export const handleAuthCallback = async () => {
  try {
    // For local development, we'll just redirect to the home page
    console.log('Auth callback handling is not needed in local development');
    return null;
  } catch (error) {
    console.error("Error handling auth callback:", error);
    throw error;
  }
};

export const signOut = async () => {
  try {
    // Sign out from our backend
    await apiRequest("POST", "/api/logout");
  } catch (error) {
    console.error("Error signing out:", error);
    throw error;
  }
};