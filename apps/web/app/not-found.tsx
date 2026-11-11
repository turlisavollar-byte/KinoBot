import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Home, Search } from "lucide-react";
import { routes } from "@/shared/config";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4">
      <div className="relative mb-8">
        <div className="absolute -inset-6 rounded-full bg-primary/10 blur-3xl" />
        <h1 className="relative text-8xl font-bold text-primary tracking-tighter">404</h1>
      </div>
      <h2 className="text-xl font-semibold text-foreground mb-3">Page not found</h2>
      <p className="text-muted-foreground mb-8 text-center max-w-md">
        The page you&apos;re looking for doesn&apos;t exist or has been moved. Let&apos;s get you back to watching.
      </p>
      <div className="flex gap-3">
        <Button asChild className="gap-2">
          <Link href={routes.home}><Home className="w-4 h-4" />Go home</Link>
        </Button>
        <Button variant="outline" asChild className="gap-2">
          <Link href={routes.browse}><Search className="w-4 h-4" />Browse content</Link>
        </Button>
      </div>
    </div>
  );
}
