import React, { useEffect } from "react";
import { Switch, Route, useLocation, useRoute } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import Chat from "@/pages/chat";
import Home from "@/pages/home";
import Teams from "@/pages/teams";
import Files from "@/pages/files";
import AuthPage from "@/pages/auth-page";
import AuthCallback from "@/pages/auth-callback";
import ProfilePage from "@/pages/profile";
import Calls from "@/pages/calls";
import Apps from "@/pages/apps";
import Games from "@/pages/games";
import Settings from "@/pages/settings";
import CodingEnvironment from "@/pages/coding-environment";
import DocumentEdit from "@/pages/document-edit";
import DocumentListPage from "@/pages/document-list";
import Calendar from "@/pages/calendar";
import Holidays from "@/pages/holidays";
import Header from "@/components/layout/Header";
import MainNavigation from "@/components/layout/MainNavigation";
import { AuthProvider } from "@/hooks/use-auth";
import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";

function AuthenticatedRoute({ component: Component, ...rest }: { component: React.ComponentType<any>, path?: string }) {
  const { user, isLoading } = useAuth();
  const [isMatched] = useRoute(rest.path || "/");
  const [, navigate] = useLocation();
  
  if (!isMatched) return null;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    // Use navigate instead of directly modifying window.location
    navigate("/auth");
    return null;
  }

  return <Component />;
}

function AppRoutes() {
  const { user, isLoading } = useAuth();
  const [location, setLocation] = useLocation();
  
  // If still loading, show loading indicator
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  
  // If not logged in, show only auth page
  if (!user) {
    // Use useEffect to handle redirection in AuthenticatedRoute instead of here
    return (
      <Switch>
        <Route path="/auth" component={AuthPage} />
        <Route path="/auth-callback" component={AuthCallback} />
        <Route>
          <AuthPage />
        </Route>
      </Switch>
    );
  }
  
  // When logged in, show full app layout
  return (
    <div className="h-screen flex flex-col overflow-hidden font-segoe">
      <Header />
      <div className="flex flex-1 overflow-hidden">
        <MainNavigation />
        <Switch>
          <Route path="/" component={Home} />
          <Route path="/chat/:id?" component={Chat} />
          <Route path="/teams" component={Teams} />
          <Route path="/files" component={Files} />
          <Route path="/calls" component={Calls} />
          <Route path="/apps" component={Apps} />
          <Route path="/games" component={Games} />
          <Route path="/calendar" component={Calendar} />
          <Route path="/holidays" component={Holidays} />
          <Route path="/settings" component={Settings} />
          <Route path="/coding/:id?" component={CodingEnvironment} />
          <Route path="/documents" component={DocumentListPage} />
          <Route path="/document/:id" component={DocumentEdit} />
          <Route path="/profile" component={ProfilePage} />
          <Route path="/auth" component={AuthPage} />
          <Route component={NotFound} />
        </Switch>
      </div>
    </div>
  );
}

function Router() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}

function App() {
  // Set the default document title for the application
  useEffect(() => {
    document.title = "SyncBoard - Team Collaboration";
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <Router />
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;
