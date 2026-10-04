import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/site-url";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = getSiteUrl();
  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/shop", "/contact"],
      disallow: ["/account", "/checkout", "/orders", "/admin", "/support", "/login", "/signup", "/forgot-password", "/reset-password", "/auth"],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
