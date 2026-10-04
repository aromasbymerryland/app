import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Storefront } from "@/components/storefront";
import { getCategories, getProductBySlug, getProducts, getStoreSettings } from "@/lib/catalog";
import { getSiteUrl } from "@/lib/site-url";

export const dynamic = "force-dynamic";

type ProductPageProps = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) return { title: "Fragrance not found | Aromas by Merryland" };
  return {
    title: product.name,
    description: product.shortDescription,
    alternates: { canonical: `/shop/${product.slug}` },
    openGraph: {
      type: "website",
      title: `${product.name} | Aromas by Merryland`,
      description: product.shortDescription,
      url: `/shop/${product.slug}`,
      images: [{ url: product.image, alt: product.name }],
    },
    twitter: {
      card: "summary_large_image",
      title: product.name,
      description: product.shortDescription,
      images: [product.image],
    },
  };
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { slug } = await params;
  const [product, catalog, settings, categories] = await Promise.all([
    getProductBySlug(slug),
    getProducts(),
    getStoreSettings(),
    getCategories(),
  ]);
  if (!product) notFound();
  const productData = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.shortDescription,
    image: product.image,
    category: product.category,
    brand: { "@type": "Brand", name: "Aromas by Merryland" },
    ...(product.reviewCount > 0 ? {
      aggregateRating: {
        "@type": "AggregateRating",
        ratingValue: product.rating,
        reviewCount: product.reviewCount,
        bestRating: 5,
        worstRating: 1,
      },
    } : {}),
    offers: {
      "@type": "Offer",
      priceCurrency: "INR",
      price: product.price,
      availability: product.inStock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      url: new URL(`/shop/${product.slug}`, getSiteUrl()).toString(),
    },
  };
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productData).replace(/</g, "\\u003c") }}
      />
      <Storefront
        products={catalog.products}
        isPreview={catalog.isPreview}
        detailProduct={product}
        settings={settings}
        categories={categories}
      />
    </>
  );
}
