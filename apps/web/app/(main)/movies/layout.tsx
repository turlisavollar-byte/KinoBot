import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Movies",
  description: "Browse thousands of movies across all genres. From blockbusters to indie gems, stream in stunning HD and 4K quality on StreamX.",
  openGraph: {
    title: "Movies | StreamX",
    description: "Browse thousands of movies across all genres on StreamX.",
  },
};

export default function MoviesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
