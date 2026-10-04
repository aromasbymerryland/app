import type { MetadataRoute } from "next";
import { getProducts } from "@/lib/catalog";
import { getSiteUrl } from "@/lib/site-url";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const { products, isPreview } = await getProducts();
  const baseUrl = getSiteUrl();
  return [
    { url: baseUrl, changeFrequency: "weekly", priority: 1 },
    { url: `${baseUrl}/shop`, changeFrequency: "daily", priority: 0.9 },
    { url: `${baseUrl}/contact`, changeFrequency: "monthly", priority: 0.5 },
    ...products.filter(() => !isPreview).map((product) => ({
      url: `${baseUrl}/shop/${product.slug}`,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
  ];
}
