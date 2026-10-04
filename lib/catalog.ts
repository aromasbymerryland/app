import { cache } from "react";

export type Product = {
  id: string;
  slug: string;
  name: string;
  category: string;
  categorySlug: string;
  fragranceFamily: string;
  price: number;
  originalPrice: number | null;
  discount: string | null;
  rating: number;
  reviewCount: number;
  type: string;
  badge: string | null;
  shortDescription: string;
  fullDescription: string;
  features: string[];
  fragranceNotes: { top: string[]; heart: string[]; base: string[] };
  intensity: number;
  size: string;
  inStock: boolean;
  stockQuantity: number;
  image: string;
  colorPrimary: string;
  colorSecondary: string;
  imageAlt: string;
  images: ProductImage[];
};

export type ProductImage = {
  imageUrl: string;
  altText: string;
  isPrimary: boolean;
  storagePath?: string | null;
};

export type StoreSettings = {
  storeName: string;
  announcementBar: string;
  contactEmail: string;
  contactPhone: string;
  freeShippingThreshold: number;
  invoiceLegalName?: string | null;
  invoiceAddress?: string | null;
  invoiceGstin?: string | null;
  invoiceState?: string | null;
  invoiceGstRate?: number;
  invoiceTaxMode?: "inclusive" | "exclusive";
};

export type Category = { name: string; slug: string };

export const defaultCategories: Category[] = [
  { name: "Car", slug: "car" },
  { name: "Everyday Spaces", slug: "everyday-spaces" },
  { name: "Spiritual", slug: "spiritual" },
  { name: "Home", slug: "home" },
];

export const defaultStoreSettings: StoreSettings = {
  storeName: "Aromas by Merryland",
  announcementBar: "Made in India • 0% Alcohol • IFRA Certified Fragrances | Free Shipping above ₹1,499",
  contactEmail: "Merryland.mathura@gmail.com",
  contactPhone: "+91 9837349067",
  freeShippingThreshold: 1499,
};

export const previewProducts: Product[] = [
  {
    id: "preview-1",
    slug: "oud-amber-reed-diffuser",
    name: "Oud & Amber",
    category: "Home",
    categorySlug: "home",
    fragranceFamily: "Woody · Amber",
    price: 1299,
    originalPrice: 1599,
    discount: "19% off",
    rating: 4.9,
    reviewCount: 28,
    type: "reed-diffuser",
    badge: "Bestseller",
    shortDescription: "A warm, enveloping stillness for the spaces you love.",
    fullDescription:
      "A quietly opulent blend where luminous amber meets the deep, velvety warmth of oud. Made for slow evenings, thoughtful rituals and rooms that feel unmistakably yours.",
    features: ["Long-lasting fragrance", "Thoughtfully made in India", "Alcohol-free fragrance"],
    fragranceNotes: {
      top: ["Saffron", "Bergamot"],
      heart: ["Rose", "Amber"],
      base: ["Oud", "Sandalwood", "Musk"],
    },
    intensity: 4,
    size: "100 ml",
    inStock: true,
    stockQuantity: 18,
    image:
      "https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?auto=format&fit=crop&w=1100&q=85",
    colorPrimary: "#b48c69",
    colorSecondary: "#352720",
    imageAlt: "Oud and Amber reed diffuser",
    images: [],
  },
  {
    id: "preview-2",
    slug: "rose-oud-car-gem",
    name: "Rose Oud",
    category: "Car",
    categorySlug: "car",
    fragranceFamily: "Floral · Woody",
    price: 699,
    originalPrice: 799,
    discount: "12% off",
    rating: 4.8,
    reviewCount: 19,
    type: "car-gem",
    badge: "A little luxury",
    shortDescription: "A beautiful journey begins before you arrive.",
    fullDescription:
      "Soft petals and soulful woods, composed to turn every drive into a small escape. An elegant scent for the everyday miles and the long way home.",
    features: ["Designed for your car", "A considered everyday luxury", "Made in India"],
    fragranceNotes: {
      top: ["Pink Pepper", "Citrus"],
      heart: ["Damask Rose", "Geranium"],
      base: ["Oud", "Patchouli", "Musk"],
    },
    intensity: 3,
    size: "8 ml",
    inStock: true,
    stockQuantity: 24,
    image:
      "https://images.unsplash.com/photo-1547887538-e3a2f32cb1cc?auto=format&fit=crop&w=1100&q=85",
    colorPrimary: "#b37b83",
    colorSecondary: "#39232b",
    imageAlt: "Rose Oud car fragrance",
    images: [],
  },
  {
    id: "preview-3",
    slug: "sandalwood-serenity-dhoop",
    name: "Sandalwood Serenity",
    category: "Spiritual",
    categorySlug: "spiritual",
    fragranceFamily: "Earthy · Woody",
    price: 549,
    originalPrice: null,
    discount: null,
    rating: 5,
    reviewCount: 12,
    type: "spiritual",
    badge: "For your ritual",
    shortDescription: "A grounding companion to your everyday rituals.",
    fullDescription:
      "The gentle, familiar warmth of sandalwood lends a quiet presence to your moments of reflection. A soulful fragrance to help make space for calm.",
    features: ["Inspired by everyday rituals", "A warm, grounding aroma", "Made in India"],
    fragranceNotes: {
      top: ["Cardamom"],
      heart: ["Sandalwood"],
      base: ["Cedarwood", "Benzoin"],
    },
    intensity: 4,
    size: "40 cones",
    inStock: true,
    stockQuantity: 31,
    image:
      "https://images.unsplash.com/photo-1603006905003-be475563bc59?auto=format&fit=crop&w=1100&q=85",
    colorPrimary: "#b99064",
    colorSecondary: "#392c20",
    imageAlt: "Sandalwood Serenity dhoop cones",
    images: [],
  },
  {
    id: "preview-4",
    slug: "white-tea-everyday-diffuser",
    name: "White Tea & Fig",
    category: "Everyday Spaces",
    categorySlug: "everyday-spaces",
    fragranceFamily: "Fresh · Green",
    price: 1199,
    originalPrice: null,
    discount: null,
    rating: 4.9,
    reviewCount: 21,
    type: "reed-diffuser",
    badge: null,
    shortDescription: "A breath of fresh air, softened by sun-warmed fig.",
    fullDescription:
      "Crisp white tea and green leaves unfold into the gentle sweetness of fig. Light, airy and quietly inviting, it brings an easy sense of balance to your space.",
    features: ["Made for everyday spaces", "Long-lasting fragrance", "Alcohol-free fragrance"],
    fragranceNotes: {
      top: ["White Tea", "Bergamot"],
      heart: ["Green Leaves", "Jasmine"],
      base: ["Fig", "Soft Musk"],
    },
    intensity: 2,
    size: "100 ml",
    inStock: true,
    stockQuantity: 11,
    image:
      "https://images.unsplash.com/photo-1602874801007-bd458bb1b8b6?auto=format&fit=crop&w=1100&q=85",
    colorPrimary: "#c1b99b",
    colorSecondary: "#464536",
    imageAlt: "White Tea and Fig reed diffuser",
    images: [],
  },
];

type ProductRow = {
  id: string;
  slug: string;
  name: string;
  category: string;
  category_slug: string;
  fragrance_family: string;
  price: number | string;
  original_price: number | string | null;
  discount: string | null;
  rating: number | string | null;
  review_count: number | null;
  type: string | null;
  badge: string | null;
  short_description: string;
  full_description: string;
  features: string[] | null;
  fragrance_notes: { top?: string[]; heart?: string[]; base?: string[] } | null;
  intensity: number | null;
  size: string;
  in_stock: boolean | null;
  stock_quantity: number | null;
  color_primary: string | null;
  color_secondary: string | null;
  product_images?: { image_url: string; storage_path?: string | null; alt_text: string | null; sort_order: number; is_primary: boolean }[];
  product_features?: { feature: string; sort_order: number }[];
  product_fragrance_notes?: { note: string; note_type: "top" | "heart" | "base"; sort_order: number }[];
};

function mapProduct(row: ProductRow): Product {
  const preview = previewProducts.find((product) => product.slug === row.slug);
  const categoryImage = previewProducts.find((product) => product.category === row.category);
  const images = [...(row.product_images ?? [])].sort(
    (left, right) => Number(right.is_primary) - Number(left.is_primary) || left.sort_order - right.sort_order,
  );
  const notes = row.product_fragrance_notes;
  return {
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
    features: row.product_features?.length
      ? [...row.product_features].sort((left, right) => left.sort_order - right.sort_order).map((item) => item.feature)
      : row.features ?? [],
    fragranceNotes: {
      top: notes?.length
        ? notes.filter((note) => note.note_type === "top").sort((left, right) => left.sort_order - right.sort_order).map((note) => note.note)
        : row.fragrance_notes?.top ?? [],
      heart: notes?.length
        ? notes.filter((note) => note.note_type === "heart").sort((left, right) => left.sort_order - right.sort_order).map((note) => note.note)
        : row.fragrance_notes?.heart ?? [],
      base: notes?.length
        ? notes.filter((note) => note.note_type === "base").sort((left, right) => left.sort_order - right.sort_order).map((note) => note.note)
        : row.fragrance_notes?.base ?? [],
    },
    intensity: row.intensity ?? 3,
    size: row.size,
    inStock: Boolean(row.in_stock) && (row.stock_quantity ?? 0) > 0,
    stockQuantity: row.stock_quantity ?? 0,
    image: images[0]?.image_url ?? preview?.image ?? categoryImage?.image ?? previewProducts[0].image,
    imageAlt: images[0]?.alt_text ?? `${row.name} fragrance`,
    images: images.map((image) => ({
      imageUrl: image.image_url,
      altText: image.alt_text ?? `${row.name} fragrance`,
      isPrimary: image.is_primary,
      storagePath: image.storage_path ?? null,
    })),
    colorPrimary: row.color_primary ?? "#b48c69",
    colorSecondary: row.color_secondary ?? "#352720",
  };
}

function isMissingCatalogMigration(error: { code?: string; message?: string }) {
  return (
    error.code === "PGRST200" ||
    error.code === "PGRST204" ||
    error.code === "PGRST205" ||
    error.code === "42703" ||
    error.message?.includes("is_published")
  );
}

const legacyProductColumns =
  "id,slug,name,category,category_slug,fragrance_family,price,original_price,discount,rating,review_count,type,badge,short_description,full_description,features,fragrance_notes,intensity,size,in_stock,stock_quantity,color_primary,color_secondary";

export const getProducts = cache(async (): Promise<{ products: Product[]; isPreview: boolean }> => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return { products: previewProducts, isPreview: true };

  const { createClient } = await import("@supabase/supabase-js");
  const supabase = createClient(url, key);
  const normalized = await supabase
    .from("products")
    .select(
      "id,slug,name,category,category_slug,fragrance_family,price,original_price,discount,rating,review_count,type,badge,short_description,full_description,features,fragrance_notes,intensity,size,in_stock,stock_quantity,color_primary,color_secondary,product_images(image_url,storage_path,alt_text,sort_order,is_primary),product_features(feature,sort_order),product_fragrance_notes(note,note_type,sort_order)",
    )
    .eq("is_published", true)
    .order("created_at", { ascending: false })
    .limit(100);

  if (!normalized.error) {
    return { products: (normalized.data as ProductRow[]).map(mapProduct), isPreview: false };
  }
  if (!isMissingCatalogMigration(normalized.error)) {
    throw new Error(`Unable to load the product catalog: ${normalized.error.message}`);
  }

  console.warn("Normalized catalog migration is not applied yet; loading the existing products schema.");
  const legacy = await supabase
    .from("products")
    .select(legacyProductColumns)
    .order("created_at", { ascending: false })
    .limit(100);
  if (legacy.error) throw new Error(`Unable to load the product catalog: ${legacy.error.message}`);
  return { products: (legacy.data as ProductRow[]).map(mapProduct), isPreview: false };
});

export const getProductBySlug = cache(async (slug: string): Promise<Product | null> => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return previewProducts.find((product) => product.slug === slug) ?? null;

  const { createClient } = await import("@supabase/supabase-js");
  const supabase = createClient(url, key);
  const normalized = await supabase
    .from("products")
    .select(
      "id,slug,name,category,category_slug,fragrance_family,price,original_price,discount,rating,review_count,type,badge,short_description,full_description,features,fragrance_notes,intensity,size,in_stock,stock_quantity,color_primary,color_secondary,product_images(image_url,storage_path,alt_text,sort_order,is_primary),product_features(feature,sort_order),product_fragrance_notes(note,note_type,sort_order)",
    )
    .eq("slug", slug)
    .eq("is_published", true)
    .maybeSingle();

  if (!normalized.error) return normalized.data ? mapProduct(normalized.data as ProductRow) : null;
  if (!isMissingCatalogMigration(normalized.error)) {
    throw new Error(`Unable to load this fragrance: ${normalized.error.message}`);
  }

  console.warn("Normalized catalog migration is not applied yet; loading this product from the existing schema.");
  const legacy = await supabase
    .from("products")
    .select(legacyProductColumns)
    .eq("slug", slug)
    .maybeSingle();
  if (legacy.error) throw new Error(`Unable to load this fragrance: ${legacy.error.message}`);
  return legacy.data ? mapProduct(legacy.data as ProductRow) : null;
});

export const getStoreSettings = cache(async (): Promise<StoreSettings> => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return defaultStoreSettings;

  const { createClient } = await import("@supabase/supabase-js");
  const supabase = createClient(url, key);
  const { data, error } = await supabase
    .from("site_settings")
    .select("store_name,announcement_bar,contact_email,contact_phone,free_shipping_threshold")
    .eq("id", 1)
    .maybeSingle();

  if (error) throw new Error(`Unable to load store settings: ${error.message}`);
  if (!data) return defaultStoreSettings;
  return {
    storeName: data.store_name ?? defaultStoreSettings.storeName,
    announcementBar: data.announcement_bar ?? defaultStoreSettings.announcementBar,
    contactEmail: data.contact_email ?? defaultStoreSettings.contactEmail,
    contactPhone: data.contact_phone ?? defaultStoreSettings.contactPhone,
    freeShippingThreshold: Number(data.free_shipping_threshold ?? defaultStoreSettings.freeShippingThreshold),
  };
});

export const getCategories = cache(async (): Promise<Category[]> => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return defaultCategories;

  const { createClient } = await import("@supabase/supabase-js");
  const supabase = createClient(url, key);
  const { data, error } = await supabase
    .from("categories")
    .select("name,slug")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (error && isMissingCatalogMigration(error)) {
    console.warn("Catalog migration is not applied yet; using the categories from the existing products schema.");
    return defaultCategories;
  }
  if (error) throw new Error(`Unable to load product categories: ${error.message}`);
  return data;
});
