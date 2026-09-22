import { Logo } from "@/components/common/layout/Logo";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="absolute top-0 left-0 right-0 z-50 px-4 sm:px-6 lg:px-8 h-20 flex items-center">
        <Logo />
      </header>
      <div className="flex-1">{children}</div>
    </div>
  );
}
