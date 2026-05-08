import type { MetadataRoute } from "next";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_ORIGIN || "https://simupro.io";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: [
          "/",
          "/demo",
          "/tools/drug-calculator",
          "/login",
          "/signup",
          "/billing",
          "/privacy",
          "/terms",
          "/refund-policy",
          "/faq",
          "/about",
        ],
        disallow: ["/dashboard/", "/api/", "/auth/", "/monitoring"],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
