import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, HelpCircle, Settings, User, LogOut } from "lucide-react";
import UserAvatar from "@/components/ui/UserAvatar";
import { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function Header() {
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [, setLocation] = useLocation();
  const { user, logoutMutation } = useAuth();

  return (
    <header className="bg-white border-b border-neutral-200 flex items-center justify-between px-4 py-2 h-12">
      <div className="flex items-center space-x-4">
        <Button 
          variant="ghost" 
          size="icon" 
          className="md:hidden" 
          onClick={() => setShowMobileMenu(!showMobileMenu)}
        >
          <span className="material-icons text-neutral-500">menu</span>
        </Button>
        <div 
          className="text-lg font-semibold text-primary cursor-pointer"
          onClick={() => setLocation("/")}
        >
          SyncBoard
        </div>
      </div>
      <div className="flex items-center space-x-2">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-2.5 top-2.5 text-neutral-400" />
          <Input
            type="text"
            placeholder="Search"
            className="pl-8 h-9 w-full md:w-auto"
          />
        </div>
        <Button variant="ghost" size="icon">
          <HelpCircle className="h-5 w-5 text-neutral-500" />
        </Button>
        <Button variant="ghost" size="icon">
          <Settings className="h-5 w-5 text-neutral-500" />
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <div className="relative cursor-pointer">
              <UserAvatar 
                src={user?.avatar || ''} 
                name={user?.name || 'User'} 
                status={user?.status as any || 'offline'} 
              />
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">{user?.name}</p>
                <p className="text-xs leading-none text-muted-foreground">{user?.email}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setLocation('/profile')}>
              <User className="mr-2 h-4 w-4" />
              <span>Profile</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              onClick={() => {
                logoutMutation.mutate(undefined, {
                  onSuccess: () => setLocation('/auth')
                });
              }}
              disabled={logoutMutation.isPending}
            >
              {logoutMutation.isPending ? (
                <>
                  <span className="mr-2 h-4 w-4 animate-spin">&#8635;</span>
                  <span>Logging out...</span>
                </>
              ) : (
                <>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Log out</span>
                </>
              )}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
