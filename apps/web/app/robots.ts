import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/profile", "/billing", "/watch"],
    },
    sitemap: "https://streamx.com/sitemap.xml",
  };
}
