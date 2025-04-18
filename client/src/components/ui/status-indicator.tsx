import { cn } from "@/lib/utils";

interface StatusIndicatorProps {
  status: "available" | "busy" | "away" | "offline";
  className?: string;
}

export default function StatusIndicator({ status, className }: StatusIndicatorProps) {
  return (
    <div 
      className={cn(
        "absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white",
        status === "available" && "bg-status-available",
        status === "busy" && "bg-status-busy",
        status === "away" && "bg-status-away",
        status === "offline" && "bg-status-offline",
        className
      )}
    />
  );
}
