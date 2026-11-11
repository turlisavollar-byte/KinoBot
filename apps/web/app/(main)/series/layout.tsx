import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "TV Series",
  description: "Discover award-winning TV series and binge-worthy shows. Stream full seasons of your favorite series in HD and 4K on StreamX.",
  openGraph: {
    title: "TV Series | StreamX",
    description: "Discover award-winning TV series on StreamX.",
  },
};

export default function SeriesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
