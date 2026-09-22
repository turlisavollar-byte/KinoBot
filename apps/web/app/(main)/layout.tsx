import { Header } from "@/components/common/layout/Header";
import { Footer } from "@/components/common/layout/Footer";
import { SkipLink } from "@/components/common/layout/SkipLink";

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SkipLink />
      <Header />
      <main id="main-content" className="flex-1 pt-16 lg:pt-20">{children}</main>
      <Footer />
    </div>
  );
}
