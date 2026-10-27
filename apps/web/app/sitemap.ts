import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = "https://streamx.com";
  const now = new Date();

  return [
    { url: `${baseUrl}/`, lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: `${baseUrl}/browse`, lastModified: now, changeFrequency: "daily", priority: 0.9 },
    { url: `${baseUrl}/movies`, lastModified: now, changeFrequency: "daily", priority: 0.8 },
    { url: `${baseUrl}/series`, lastModified: now, changeFrequency: "daily", priority: 0.8 },
    { url: `${baseUrl}/search`, lastModified: now, changeFrequency: "weekly", priority: 0.6 },
    { url: `${baseUrl}/subscriptions`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${baseUrl}/login`, lastModified: now, changeFrequency: "monthly", priority: 0.3 },
    { url: `${baseUrl}/register`, lastModified: now, changeFrequency: "monthly", priority: 0.3 },
  ];
}
