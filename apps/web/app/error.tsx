"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import Link from "next/link";
import { routes } from "@/shared/config";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4">
      <div className="relative mb-8">
        <div className="absolute -inset-6 rounded-full bg-destructive/10 blur-3xl" />
        <div className="relative w-20 h-20 rounded-2xl bg-destructive/10 flex items-center justify-center">
          <AlertTriangle className="w-10 h-10 text-destructive" />
        </div>
      </div>
      <h1 className="text-2xl font-bold text-foreground mb-2">Something went wrong</h1>
      <p className="text-muted-foreground mb-8 text-center max-w-md">
        An unexpected error occurred while loading this page. Please try again or return home.
      </p>
      <div className="flex gap-3">
        <Button onClick={reset} className="gap-2">
          <RefreshCw className="w-4 h-4" />
          Try again
        </Button>
        <Button variant="outline" asChild className="gap-2">
          <Link href={routes.home}><Home className="w-4 h-4" />Go home</Link>
        </Button>
      </div>
      {error.digest && (
        <p className="mt-6 text-xs text-muted-foreground/50">Error ID: {error.digest}</p>
      )}
    </div>
  );
}
