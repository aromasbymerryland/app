"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth/admin";

export type ProductActionState = { error?: string };

function readProduct(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const slug = String(formData.get("slug") ?? "").trim().toLowerCase();
  const categorySlug = String(formData.get("categorySlug") ?? "").trim();
  const fragranceFamily = String(formData.get("fragranceFamily") ?? "").trim();
  const shortDescription = String(formData.get("shortDescription") ?? "").trim();
  const fullDescription = String(formData.get("fullDescription") ?? "").trim();
  const size = String(formData.get("size") ?? "").trim();
  const type = String(formData.get("type") ?? "reed-diffuser");
  const badge = String(formData.get("badge") ?? "").trim() || null;
  const price = Number(formData.get("price"));
  const originalPriceText = String(formData.get("originalPrice") ?? "").trim();
  const originalPrice = originalPriceText ? Number(originalPriceText) : null;
  const stockQuantity = Number(formData.get("stockQuantity"));
  const intensity = Number(formData.get("intensity"));
  const features = String(formData.get("features") ?? "").split("\n").map((line) => line.trim()).filter(Boolean);
  const notes = (key: string) => String(formData.get(key) ?? "").split(",").map((line) => line.trim()).filter(Boolean);
  if (
    name.length < 2 || name.length > 160 ||
    !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) ||
    !categorySlug || !fragranceFamily ||
    shortDescription.length < 4 || fullDescription.length < 4 ||
    !size || size.length > 80 ||
    !["car-gem", "reed-diffuser", "spiritual"].includes(type) ||
    !Number.isFinite(price) || price < 0 ||
    (originalPrice !== null && (!Number.isFinite(originalPrice) || originalPrice < 0)) ||
    !Number.isInteger(stockQuantity) || stockQuantity < 0 ||
    !Number.isInteger(intensity) || intensity < 1 || intensity > 5 ||
    features.length > 30 ||
    notes("topNotes").length + notes("heartNotes").length + notes("baseNotes").length > 30
  ) return null;

  return {
    name,
    slug,
    category_slug: categorySlug,
    fragrance_family: fragranceFamily,
    short_description: shortDescription,
    full_description: fullDescription,
    size,
    type,
    badge,
    price,
    original_price: originalPrice,
    discount: originalPrice && originalPrice > price ? `${Math.round((1 - price / originalPrice) * 100)}% off` : null,
    stock_quantity: stockQuantity,
    in_stock: stockQuantity > 0,
    intensity,
    features,
    fragrance_notes: { top: notes("topNotes"), heart: notes("heartNotes"), base: notes("baseNotes") },
    is_featured: formData.get("isFeatured") === "on",
    is_published: formData.get("isPublished") === "on",
  };
}

type ImageManifestEntry =
  | { kind: "url"; url: string; alt: string; storagePath: string | null }
  | { kind: "file"; fileIndex: number; alt: string };

type ProductImageRow = {
  product_id: string;
  image_url: string;
  storage_path: string | null;
  alt_text: string;
  sort_order: number;
  is_primary: boolean;
};

function readImageManifest(formData: FormData): ImageManifestEntry[] | null {
  let raw: unknown;
  try {
    raw = JSON.parse(String(formData.get("imageManifest") ?? "[]"));
  } catch {
    return null;
  }
  if (!Array.isArray(raw) || raw.length > 8) return null;
  const entries: ImageManifestEntry[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object" || !("kind" in item) || !("alt" in item) ||
      typeof item.alt !== "string" || item.alt.length > 240) return null;
    if (item.kind === "url" && "url" in item && typeof item.url === "string" && item.url.length <= 2048) {
      try {
        if (new URL(item.url).protocol !== "https:") return null;
      } catch {
        return null;
      }
      const storagePath = "storagePath" in item && typeof item.storagePath === "string" ? item.storagePath : null;
      entries.push({ kind: "url", url: item.url, alt: item.alt, storagePath });
      continue;
    }
    if (item.kind === "file" && "fileIndex" in item && Number.isInteger(item.fileIndex) && item.fileIndex >= 0) {
      entries.push({ kind: "file", fileIndex: item.fileIndex, alt: item.alt });
      continue;
    }
    return null;
  }
  return entries;
}

const imageExtensions: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
};

async function saveProduct(
  formData: FormData,
  productId?: string,
): Promise<ProductActionState> {
  const product = readProduct(formData);
  const imageManifest = readImageManifest(formData);
  const imageFiles = formData.getAll("productImages").filter((entry): entry is File => entry instanceof File && entry.size > 0);
  if (!product) return { error: "Please check the product details, prices, stock, and fragrance notes." };
  if (!imageManifest) return { error: "Check the product gallery. It can contain up to 8 valid images." };
  if (
    imageFiles.length > 8 ||
    imageFiles.reduce((size, file) => size + file.size, 0) > 40 * 1024 * 1024 ||
    imageFiles.some((file) => file.size > 5 * 1024 * 1024 || !imageExtensions[file.type])
  ) {
    return { error: "Product images must be JPG, PNG, WebP, or AVIF files no larger than 5 MB each, with up to 8 images." };
  }
  if (imageManifest.some((entry) => entry.kind === "file" && entry.fileIndex >= imageFiles.length)) {
    return { error: "A selected image is missing. Please choose it again." };
  }

  const { supabase, user } = await requireAdmin();
  const categoryResult = await supabase.from("categories").select("id,name").eq("slug", product.category_slug).maybeSingle();
  if (categoryResult.error) return { error: "Could not verify this category. Please try again." };
  if (!categoryResult.data) return { error: "Choose an active category before saving." };

  const productValues = product;
  const row = {
    ...productValues,
    category: categoryResult.data.name,
    category_id: categoryResult.data.id,
  };
  const result = productId
    ? await supabase.from("products").update(row).eq("id", productId).select("id").maybeSingle()
    : await supabase.from("products").insert(row).select("id").maybeSingle();

  if (result.error) {
    console.error("Admin product save failed", result.error);
    return { error: result.error.code === "23505" ? "A product with that URL slug already exists." : "We couldn’t save the product. Check the details and try again." };
  }
  if (!result.data) return { error: "The product was not saved. Check your admin database permissions." };

  const savedId = result.data.id;
  const featureRows = product.features.map((feature, sort_order) => ({ product_id: savedId, feature, sort_order }));
  const noteRows = (["top", "heart", "base"] as const).flatMap((note_type) =>
    product.fragrance_notes[note_type].map((note, sort_order) => ({ product_id: savedId, note, note_type, sort_order })),
  );
  const [deleteFeatures, deleteNotes] = await Promise.all([
    supabase.from("product_features").delete().eq("product_id", savedId),
    supabase.from("product_fragrance_notes").delete().eq("product_id", savedId),
  ]);
  if (deleteFeatures.error || deleteNotes.error) {
    console.error("Admin product detail cleanup failed", deleteFeatures.error ?? deleteNotes.error);
    return { error: "The product was saved, but its fragrance details could not be updated. Please retry the edit." };
  }
  const insertDetails = await Promise.all([
    featureRows.length ? supabase.from("product_features").insert(featureRows) : Promise.resolve({ error: null }),
    noteRows.length ? supabase.from("product_fragrance_notes").insert(noteRows) : Promise.resolve({ error: null }),
  ]);
  if (insertDetails.some((entry) => entry.error)) {
    console.error("Admin product detail save failed", insertDetails.map((entry) => entry.error));
    return { error: "The product was saved, but its fragrance details could not be saved. Please retry the edit." };
  }

  const uploadedPaths: string[] = [];
  const imageRows: ProductImageRow[] = [];
  for (const [sort_order, entry] of imageManifest.entries()) {
    if (entry.kind === "url") {
      if (entry.storagePath && !entry.storagePath.startsWith(`${savedId}/`)) {
        if (uploadedPaths.length) await supabase.storage.from("products").remove(uploadedPaths);
        return { error: "An existing image reference is invalid. Reload the product editor and try again." };
      }
      imageRows.push({
        product_id: savedId,
        image_url: entry.url,
        storage_path: entry.storagePath,
        alt_text: entry.alt || `${product.name} fragrance`,
        sort_order,
        is_primary: sort_order === 0,
      });
      continue;
    }

    const file = imageFiles[entry.fileIndex];
    const storagePath = `${savedId}/${randomUUID()}.${imageExtensions[file.type]}`;
    const { error: uploadError } = await supabase.storage
      .from("products")
      .upload(storagePath, file, { contentType: file.type, upsert: false });
    if (uploadError) {
      if (uploadedPaths.length) await supabase.storage.from("products").remove(uploadedPaths);
      console.error("Admin product image upload failed", uploadError);
      return { error: "We couldn’t upload a product image. Check Storage permissions and try again." };
    }
    uploadedPaths.push(storagePath);
    const { data: publicUrl } = supabase.storage.from("products").getPublicUrl(storagePath);
    imageRows.push({
      product_id: savedId,
      image_url: publicUrl.publicUrl,
      storage_path: storagePath,
      alt_text: entry.alt || `${product.name} fragrance`,
      sort_order,
      is_primary: sort_order === 0,
    });
  }

  const oldImagesResult = await supabase
    .from("product_images")
    .select("storage_path")
    .eq("product_id", savedId);
  if (oldImagesResult.error) {
    if (uploadedPaths.length) await supabase.storage.from("products").remove(uploadedPaths);
    console.error("Admin product image lookup failed", oldImagesResult.error);
    return { error: "The product images could not be updated. Please retry." };
  }
  const deleteOldImages = await supabase.from("product_images").delete().eq("product_id", savedId);
  if (deleteOldImages.error) {
    if (uploadedPaths.length) await supabase.storage.from("products").remove(uploadedPaths);
    console.error("Admin product image cleanup failed", deleteOldImages.error);
    return { error: "The product images could not be updated. Please retry." };
  }
  if (imageRows.length) {
    const saveImages = await supabase.from("product_images").insert(imageRows);
    if (saveImages.error) {
      if (uploadedPaths.length) await supabase.storage.from("products").remove(uploadedPaths);
      console.error("Admin product image save failed", saveImages.error);
      return { error: "The product was saved, but its gallery could not be saved. Please retry." };
    }
  }
  const obsoletePaths = oldImagesResult.data
    .map((image) => image.storage_path)
    .filter((path): path is string =>
      Boolean(path) && !imageRows.some((image) => image.storage_path === path),
    );
  if (obsoletePaths.length) {
    const { error: removeError } = await supabase.storage.from("products").remove(obsoletePaths);
    if (removeError) {
      console.error("Obsolete product images could not be removed from storage", removeError);
    }
  }

  const { error: logError } = await supabase.from("admin_logs").insert({
    admin_user_id: user.id,
    action: productId ? "product.updated" : "product.created",
    entity_type: "product",
    entity_id: savedId,
    metadata: { slug: product.slug, name: product.name },
  });
  if (logError) {
    console.error("Admin product audit log failed", logError);
    return { error: "The product was saved, but its audit record failed. Contact support before continuing." };
  }

  revalidatePath("/");
  revalidatePath("/shop");
  revalidatePath(`/shop/${product.slug}`);
  revalidatePath("/admin/products");
  redirect("/admin/products");
}

export async function createProductAction(_state: ProductActionState, formData: FormData) {
  return saveProduct(formData);
}

export async function updateProductAction(
  productId: string,
  _state: ProductActionState,
  formData: FormData,
) {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(productId)) {
    return { error: "That product could not be found." };
  }
  return saveProduct(formData, productId);
}

export async function deactivateProductAction(formData: FormData) {
  const productId = String(formData.get("productId") ?? "");
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(productId)) {
    throw new Error("Invalid product ID.");
  }
  const { supabase, user } = await requireAdmin();
  const { data, error } = await supabase.from("products").update({ is_published: false }).eq("id", productId).select("id,slug,name").maybeSingle();
  if (error) throw new Error(`Unable to deactivate product: ${error.message}`);
  if (!data) throw new Error("Product not found or admin access denied.");
  const { error: logError } = await supabase.from("admin_logs").insert({
    admin_user_id: user.id,
    action: "product.deactivated",
    entity_type: "product",
    entity_id: productId,
    metadata: { slug: data.slug, name: data.name },
  });
  if (logError) throw new Error(`Product deactivated, but audit logging failed: ${logError.message}`);
  revalidatePath("/");
  revalidatePath("/shop");
  revalidatePath(`/shop/${data.slug}`);
  revalidatePath("/admin/products");
}
