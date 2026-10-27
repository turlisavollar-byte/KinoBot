import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Subscription Plans",
  description: "Choose the StreamX plan that fits your lifestyle. Basic, Standard, or Premium — all with a 7-day free trial. No contracts, cancel anytime.",
  openGraph: {
    title: "Subscription Plans | StreamX",
    description: "Choose the StreamX plan that fits your lifestyle.",
  },
};

export default function SubscriptionsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
