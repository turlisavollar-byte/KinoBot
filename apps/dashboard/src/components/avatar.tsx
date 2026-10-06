import {
  Avatar as AvatarRoot,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

type UserAvatarSize = "sm" | "md" | "lg";

const sizeClasses: Record<UserAvatarSize, string> = {
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-14 w-14 text-base",
};

function getInitials(name?: string | null): string {
  if (!name || !name.trim()) return "?";

  const tokens = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);

  if (tokens.length === 0) return "?";

  return tokens
    .map((token) => token.charAt(0).toUpperCase())
    .join("")
    .slice(0, 2);
}

export function UserAvatar({
  src,
  name,
  size = "md",
  className,
}: {
  src?: string | null;
  name?: string | null;
  size?: UserAvatarSize;
  className?: string;
}) {
  const initials = getInitials(name);

  return (
    <AvatarRoot className={cn(sizeClasses[size], className)}>
      {src ? (
        <AvatarImage src={src} alt={name ?? "User"} className="object-cover" />
      ) : null}
      <AvatarFallback className="bg-neutral-200 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-100">
        {initials}
      </AvatarFallback>
    </AvatarRoot>
  );
}

export const Avatar = UserAvatar;
