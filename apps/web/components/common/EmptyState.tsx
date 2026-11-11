import { cn } from "@/shared/lib";
import { Link } from "@/components/common/Link";

interface EmptyStateProps {
  icon: React.ElementType;
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
  className?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  actionHref,
  className,
}: EmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center text-center py-20 px-4", className)}>
      <div className="relative mb-6">
        <div className="absolute -inset-4 rounded-full bg-primary/10 blur-2xl" />
        <div className="relative w-20 h-20 rounded-2xl bg-secondary/50 flex items-center justify-center">
          <Icon className="w-10 h-10 text-muted-foreground" />
        </div>
      </div>
      <h3 className="text-xl font-semibold text-foreground mb-2">{title}</h3>
      <p className="text-muted-foreground max-w-sm mb-6">{description}</p>
      {actionLabel && actionHref && (
        <Link
          href={actionHref}
          className="inline-flex items-center justify-center rounded-lg bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          {actionLabel}
        </Link>
      )}
    </div>
  );
}
