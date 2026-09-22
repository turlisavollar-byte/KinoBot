import Link from "next/link";
import { Clapperboard } from "lucide-react";
import { cn } from "@/shared/lib";
import { routes } from "@/shared/config";

interface LogoProps {
  className?: string;
  showText?: boolean;
}

export function Logo({ className, showText = true }: LogoProps) {
  return (
    <Link href={routes.home} className={cn("flex items-center gap-2 group", className)}>
      <div className="relative">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-emerald-400 flex items-center justify-center shadow-glow">
          <Clapperboard className="w-5 h-5 text-white" />
        </div>
        <div className="absolute -inset-1 rounded-xl bg-primary/30 blur-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      </div>
      {showText && (
        <span className="text-xl font-bold tracking-tight">
          <span className="text-foreground">Stream</span>
          <span className="text-primary">X</span>
        </span>
      )}
    </Link>
  );
}
