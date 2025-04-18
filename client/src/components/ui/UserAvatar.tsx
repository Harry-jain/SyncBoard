import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import StatusIndicator from "./status-indicator";

interface UserAvatarProps {
  src?: string;
  name: string;
  status?: "available" | "busy" | "away" | "offline";
  className?: string;
}

export default function UserAvatar({ src, name, status, className = "" }: UserAvatarProps) {
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .substring(0, 2);

  return (
    <div className={`relative ${className}`}>
      <Avatar className="h-8 w-8">
        {src ? (
          <AvatarImage src={src} alt={name} />
        ) : null}
        <AvatarFallback>{initials}</AvatarFallback>
      </Avatar>
      {status && (
        <StatusIndicator status={status} />
      )}
    </div>
  );
}
