import type { Plan, FAQ } from "./types";

export const plans: Plan[] = [
  {
    id: "basic",
    name: "Basic",
    price: 8.99,
    description: "Perfect for casual viewers",
    features: [
      { text: "HD streaming quality", included: true },
      { text: "Watch on 1 device", included: true },
      { text: "Limited content library", included: true },
      { text: "Ads included", included: false },
      { text: "Download for offline", included: false },
      { text: "4K Ultra HD", included: false },
    ],
    popular: false,
  },
  {
    id: "standard",
    name: "Standard",
    price: 14.99,
    description: "Great for individuals",
    features: [
      { text: "Full HD streaming quality", included: true },
      { text: "Watch on 2 devices", included: true },
      { text: "Full content library", included: true },
      { text: "Ad-free experience", included: true },
      { text: "Download on 2 devices", included: true },
      { text: "4K Ultra HD", included: false },
    ],
    popular: true,
  },
  {
    id: "premium",
    name: "Premium",
    price: 21.99,
    description: "The ultimate experience",
    features: [
      { text: "4K Ultra HD + HDR", included: true },
      { text: "Watch on 4 devices", included: true },
      { text: "Full content library", included: true },
      { text: "Ad-free experience", included: true },
      { text: "Unlimited downloads", included: true },
      { text: "Early access to new content", included: true },
    ],
    popular: false,
  },
];

export const subscriptionFaqs: FAQ[] = [
  {
    question: "Can I change my plan later?",
    answer: "Yes, you can upgrade or downgrade your plan at any time. Changes to your plan will take effect immediately.",
  },
  {
    question: "Is there a free trial?",
    answer: "Yes! All plans come with a 7-day free trial. No credit card required to start.",
  },
  {
    question: "How do I cancel my subscription?",
    answer: "You can cancel anytime from your account settings. Your access continues until the end of your billing period.",
  },
  {
    question: "What payment methods do you accept?",
    answer: "We accept all major credit cards, PayPal, and Apple Pay.",
  },
];
