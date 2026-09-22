export default function Loading() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background">
      <div className="relative flex items-center justify-center">
        <div className="absolute w-16 h-16 rounded-full border-2 border-primary/20" />
        <div className="absolute w-16 h-16 rounded-full border-t-2 border-primary animate-spin" />
        <div className="w-6 h-6 rounded-full bg-primary/20 animate-pulse" />
      </div>
      <p className="mt-6 text-sm text-muted-foreground animate-pulse">Loading your content...</p>
    </div>
  );
}
