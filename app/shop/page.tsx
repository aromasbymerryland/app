import type { Metadata } from "next";
import { Storefront } from "@/components/storefront";
import { getCategories, getProducts, getStoreSettings } from "@/lib/catalog";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Shop the collection",
  description: "Discover home, car and ritual fragrances by Aromas by Merryland.",
  alternates: { canonical: "/shop" },
};

export default async function ShopPage() {
  const [{ products, isPreview }, settings, categories] = await Promise.all([
    getProducts(),
    getStoreSettings(),
    getCategories(),
  ]);
  return <Storefront products={products} isPreview={isPreview} settings={settings} categories={categories} shopOnly />;
}
