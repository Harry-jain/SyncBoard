import { useLocation } from "wouter";
import { cn } from "@/lib/utils";

type NavItem = {
  icon: string;
  label: string;
  path: string;
  notification?: boolean;
};

const navItems: NavItem[] = [
  { icon: "chat", label: "Chat", path: "/chat", notification: false },
  { icon: "people", label: "Teams", path: "/teams", notification: true },
  { icon: "calendar_today", label: "Calendar", path: "/calendar", notification: false },
  { icon: "event_note", label: "Holidays", path: "/holidays", notification: false },
  { icon: "call", label: "Calls", path: "/calls", notification: false },
  { icon: "description", label: "Files", path: "/files", notification: false },
  { icon: "apps", label: "Apps", path: "/apps", notification: false },
  { icon: "sports_esports", label: "Games", path: "/games", notification: false },
];

export default function MainNavigation() {
  const [location, setLocation] = useLocation();

  const isActive = (path: string) => {
    return location === path || (path !== "/" && location.startsWith(path));
  };

  return (
    <nav className="bg-neutral-700 text-white w-16 flex-shrink-0 flex flex-col items-center py-2">
      {navItems.map((item, index) => (
        <div
          key={item.path}
          className={cn(
            "sidebar-icon flex flex-col items-center justify-center mb-3 p-2 cursor-pointer hover:bg-neutral-600 rounded w-14 relative",
            isActive(item.path) && "active",
            item.notification && "has-notification"
          )}
          onClick={() => setLocation(item.path)}
          style={{
            marginTop: item.icon === "sports_esports" ? "auto" : undefined
          }}
        >
          <span className="material-icons">{item.icon}</span>
          <span className="text-xs mt-1">{item.label}</span>
        </div>
      ))}
    </nav>
  );
}
