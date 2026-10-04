import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminProductForm } from "@/components/admin-product-form";
import { requireAdmin } from "@/lib/auth/admin";
import type { Product } from "@/lib/catalog";

export const metadata: Metadata = { title: "Edit product · Admin" };

type EditProductPageProps = { params: Promise<{ id: string }> };

export default async function EditAdminProductPage({ params }: EditProductPageProps) {
  const { id } = await params;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) notFound();
  const { supabase } = await requireAdmin();
  const [productResult, categoryResult] = await Promise.all([
    supabase.from("products").select("id,slug,name,category,category_slug,fragrance_family,price,original_price,discount,rating,review_count,type,badge,short_description,full_description,features,fragrance_notes,intensity,size,in_stock,stock_quantity,is_featured,is_published,product_images(image_url,storage_path,alt_text,sort_order,is_primary),product_features(feature,sort_order),product_fragrance_notes(note,note_type,sort_order)").eq("id", id).maybeSingle(),
    supabase.from("categories").select("name,slug").eq("is_active", true).order("sort_order"),
  ]);
  if (productResult.error) throw new Error(`Unable to load product: ${productResult.error.message}`);
  if (categoryResult.error) throw new Error(`Unable to load categories: ${categoryResult.error.message}`);
  if (!productResult.data) notFound();

  const row = productResult.data;
  const features = Array.isArray(row.product_features) && row.product_features.length
    ? [...row.product_features].sort((a, b) => a.sort_order - b.sort_order).map((item) => item.feature)
    : row.features ?? [];
  const notes = Array.isArray(row.product_fragrance_notes) ? row.product_fragrance_notes : [];
  const image = Array.isArray(row.product_images)
    ? row.product_images.find((item) => item.is_primary) ?? row.product_images[0]
    : null;
  const galleryImages = Array.isArray(row.product_images)
    ? [...row.product_images]
        .sort((left, right) => left.sort_order - right.sort_order)
        .map((item) => ({
          imageUrl: item.image_url,
          altText: item.alt_text ?? `${row.name} fragrance`,
          isPrimary: item.is_primary,
          storagePath: item.storage_path,
        }))
    : [];
  const product: Product & { isFeatured: boolean; isPublished: boolean } = {
    id: row.id,
    slug: row.slug,
    name: row.name,
    category: row.category,
    categorySlug: row.category_slug,
    fragranceFamily: row.fragrance_family,
    price: Number(row.price),
    originalPrice: row.original_price === null ? null : Number(row.original_price),
    discount: row.discount,
    rating: Number(row.rating ?? 5),
    reviewCount: row.review_count ?? 0,
    type: row.type ?? "reed-diffuser",
    badge: row.badge,
    shortDescription: row.short_description,
    fullDescription: row.full_description,
    features,
    fragranceNotes: {
      top: notes.length ? notes.filter((item) => item.note_type === "top").sort((a, b) => a.sort_order - b.sort_order).map((item) => item.note) : row.fragrance_notes?.top ?? [],
      heart: notes.length ? notes.filter((item) => item.note_type === "heart").sort((a, b) => a.sort_order - b.sort_order).map((item) => item.note) : row.fragrance_notes?.heart ?? [],
      base: notes.length ? notes.filter((item) => item.note_type === "base").sort((a, b) => a.sort_order - b.sort_order).map((item) => item.note) : row.fragrance_notes?.base ?? [],
    },
    intensity: row.intensity ?? 3,
    size: row.size,
    inStock: row.in_stock ?? false,
    stockQuantity: row.stock_quantity ?? 0,
    image: image?.image_url ?? "",
    imageAlt: image?.alt_text ?? `${row.name} fragrance`,
    images: galleryImages,
    colorPrimary: "#b48c69",
    colorSecondary: "#352720",
    isFeatured: row.is_featured,
    isPublished: row.is_published,
  };

  return (
    <>
      <header className="admin-page-heading"><div><Link className="admin-back-link" href="/admin/products">← All products</Link><span className="eyebrow">Refine the details</span><h1>Edit product.</h1><p>{product.name}</p></div></header>
      <AdminProductForm categories={categoryResult.data ?? []} product={product} />
    </>
  );
}
