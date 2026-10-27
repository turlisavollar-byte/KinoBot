import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Browse",
  description: "Explore the full StreamX catalog. Filter by genre, year, rating, and type to find exactly what you want to watch next.",
  openGraph: {
    title: "Browse | StreamX",
    description: "Explore the full StreamX catalog.",
  },
};

export default function BrowseLayout({ children }: { children: React.ReactNode }) {
  return children;
}
