import { useEffect } from "react";
import { useLocation } from "wouter";
import { Loader2 } from "lucide-react";
import { handleAuthCallback } from "@/lib/supabase";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function AuthCallback() {
  const [_, setLocation] = useLocation();
  const { toast } = useToast();

  useEffect(() => {
    const processAuthCallback = async () => {
      try {
        // In local development, we don't need to process any auth callback
        // Just redirect to the home page
        setLocation("/");
        
        toast({
          title: "Local Development Mode",
          description: "OAuth authentication is disabled in local development. Use username/password login instead.",
        });
      } catch (error) {
        console.error("Error processing authentication callback:", error);
        
        toast({
          title: "Authentication failed",
          description: error instanceof Error ? error.message : "Failed to complete authentication",
          variant: "destructive",
        });
        
        // Redirect to auth page on error
        setLocation("/auth");
      }
    };
    
    // Small delay to simulate callback processing
    setTimeout(processAuthCallback, 500);
  }, [setLocation, toast]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto mb-4" />
        <h1 className="text-2xl font-bold">Finalizing login...</h1>
        <p className="text-muted-foreground mt-2">Please wait while we complete your authentication.</p>
      </div>
    </div>
  );
}