import type { Metadata } from "next";
import { Storefront } from "@/components/storefront";
import { getCategories, getProducts, getStoreSettings } from "@/lib/catalog";
import { getSiteUrl } from "@/lib/site-url";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Home, Car & Ritual Fragrance",
  description: "Shop thoughtfully made home fragrances, reed diffusers, car scents and ritual aromas from Aromas by Merryland. Crafted in India for the feeling of home.",
  alternates: { canonical: "/" },
};

export default async function Home() {
  const [{ products, isPreview }, settings, categories] = await Promise.all([
    getProducts(),
    getStoreSettings(),
    getCategories(),
  ]);
  const organizationData = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: settings.storeName,
    url: getSiteUrl(),
    email: settings.contactEmail,
  };
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationData).replace(/</g, "\\u003c") }}
      />
      <Storefront products={products} isPreview={isPreview} settings={settings} categories={categories} />
    </>
  );
}
