import { createContext, ReactNode, useContext, useEffect, useState } from "react";
import {
  useQuery,
  useMutation,
  UseMutationResult,
} from "@tanstack/react-query";
import { insertUserSchema } from "@shared/schema";
import { User } from "@/lib/types";
import { getQueryFn, apiRequest, queryClient } from "../lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { supabase, signInWithProvider as supabaseSignInWithProvider, signOut as supabaseSignOut } from "@/lib/supabase";
import { Provider } from "@supabase/supabase-js";

type AuthContextType = {
  user: User | null;
  isLoading: boolean;
  error: Error | null;
  loginMutation: UseMutationResult<User, Error, LoginData>;
  logoutMutation: UseMutationResult<void, Error, void>;
  registerMutation: UseMutationResult<User, Error, RegisterData>;
  signInWithProvider: (provider: Provider) => Promise<void>;
};

const loginSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

const registerSchema = insertUserSchema.extend({
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string(),
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type LoginData = z.infer<typeof loginSchema>;
type RegisterData = z.infer<typeof registerSchema>;

export const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  const [supabaseUser, setSupabaseUser] = useState<any>(null);
  
  // Listen for authentication changes
  useEffect(() => {
    // Initial session check
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        handleSupabaseUser(session.user);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          handleSupabaseUser(session.user);
        } else {
          setSupabaseUser(null);
          queryClient.setQueryData(["/api/user"], null);
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleSupabaseUser = async (supabaseUser: any) => {
    setSupabaseUser(supabaseUser);
    
    // If you need to sync this with your backend user
    try {
      // Sync with your backend or create user if they don't exist
      const res = await apiRequest("POST", "/api/auth/supabase", {
        id: supabaseUser.id,
        email: supabaseUser.email,
        name: supabaseUser.user_metadata?.full_name || supabaseUser.email.split('@')[0],
        avatar: supabaseUser.user_metadata?.avatar_url
      });
      
      const user = await res.json();
      queryClient.setQueryData(["/api/user"], user);
    } catch (error) {
      console.error("Error syncing Supabase user with backend:", error);
    }
  };
  
  const {
    data: user,
    error,
    isLoading,
  } = useQuery<User | null, Error>({
    queryKey: ["/api/user"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  const signInWithProvider = async (provider: Provider) => {
    try {
      // Use the shared function from supabase.ts
      await supabaseSignInWithProvider(provider);
    } catch (error: any) {
      toast({
        title: "Login failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginData) => {
      // Special handling for admin login
      if (credentials.username === "TeamSync" && credentials.password === "hush@teamSB123") {
        // Admin bypass - create admin user object
        const adminUser: User = {
          id: 999,
          username: "TeamSync",
          name: "Administrator",
          email: "admin@teamsync.com",
          role: "super_admin",
          status: "available",
          avatar: "",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        return adminUser;
      }
      
      // First try Supabase auth
      const { data, error } = await supabase.auth.signInWithPassword({
        email: credentials.username, // You might need to adjust this if username isn't an email
        password: credentials.password,
      });
      
      if (error) {
        // Fall back to your traditional auth
        const res = await apiRequest("POST", "/api/login", credentials);
        return await res.json();
      }
      
      // We'll rely on the Supabase auth listener to update the user
      return data.user as unknown as User;
    },
    onSuccess: (user: User) => {
      // If this is a traditional login, we need to manually update
      if (!supabaseUser) {
        queryClient.setQueryData(["/api/user"], user);
      }
      
      toast({
        title: "Login successful",
        description: `Welcome back, ${user.name || user.email}!`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Login failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (userData: RegisterData) => {
      // Remove confirmPassword as it's not needed in the API
      const { confirmPassword, ...userDataToSend } = userData;
      
      // Register with Supabase first
      const { data, error } = await supabase.auth.signUp({
        email: userDataToSend.email || userDataToSend.username,
        password: userDataToSend.password,
        options: {
          data: {
            full_name: userDataToSend.name,
          },
        },
      });
      
      if (error) throw error;
      
      // Then sync with your backend
      const res = await apiRequest("POST", "/api/register", {
        ...userDataToSend,
        supabaseId: data.user?.id,
      });
      
      return await res.json();
    },
    onSuccess: (user: User) => {
      queryClient.setQueryData(["/api/user"], user);
      toast({
        title: "Registration successful",
        description: `Welcome, ${user.name}!`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Registration failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      // Use the shared function which handles both Supabase and traditional logout
      await supabaseSignOut();
    },
    onSuccess: () => {
      queryClient.setQueryData(["/api/user"], null);
      toast({
        title: "Logged out",
        description: "You have been successfully logged out.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Logout failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <AuthContext.Provider
      value={{
        user: user ?? null,
        isLoading,
        error,
        loginMutation,
        logoutMutation,
        registerMutation,
        signInWithProvider,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}