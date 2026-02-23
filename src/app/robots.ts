import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://dominia.app";

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/dashboard/", "/settings/", "/api/", "/domains/"],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
