import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Search",
  description: "Search for movies and TV series on StreamX. Find your next favorite show by title, genre, or keyword.",
  robots: { index: false, follow: true },
};

export default function SearchLayout({ children }: { children: React.ReactNode }) {
  return children;
}
