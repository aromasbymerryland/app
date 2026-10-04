"use client";

import { useActionState } from "react";
import { createProductAction, updateProductAction, type ProductActionState } from "@/app/admin/products/actions";
import { AdminImageManager } from "@/components/admin-image-manager";
import type { Category, Product, ProductImage } from "@/lib/catalog";

type FormProduct = Partial<Product> & {
  isFeatured?: boolean;
  isPublished?: boolean;
  images?: ProductImage[];
};

export function AdminProductForm({
  categories,
  product,
}: {
  categories: Category[];
  product?: FormProduct;
}) {
  const action = product?.id
    ? updateProductAction.bind(null, product.id)
    : createProductAction;
  const [state, formAction, pending] = useActionState<ProductActionState, FormData>(action, {});
  return (
    <form action={formAction} className="admin-form">
      <div className="admin-form-grid">
        <label>Product name<input name="name" required minLength={2} maxLength={160} defaultValue={product?.name ?? ""} /></label>
        <label>URL slug<input name="slug" required pattern="[a-z0-9]+(-[a-z0-9]+)*" defaultValue={product?.slug ?? ""} /></label>
        <label>Category<select name="categorySlug" required defaultValue={product?.categorySlug ?? categories[0]?.slug ?? ""}>{categories.map((category) => <option value={category.slug} key={category.slug}>{category.name}</option>)}</select></label>
        <label>Fragrance family<input name="fragranceFamily" required defaultValue={product?.fragranceFamily ?? ""} placeholder="e.g. Woody · Amber" /></label>
        <label>Price (₹)<input name="price" type="number" min="0" step="0.01" required defaultValue={product?.price ?? ""} /></label>
        <label>Original price (₹)<input name="originalPrice" type="number" min="0" step="0.01" defaultValue={product?.originalPrice ?? ""} /></label>
        <label>Stock quantity<input name="stockQuantity" type="number" min="0" step="1" required defaultValue={product?.stockQuantity ?? 0} /></label>
        <label>Size<input name="size" required maxLength={80} defaultValue={product?.size ?? ""} placeholder="e.g. 100 ml" /></label>
        <label>Product type<select name="type" defaultValue={product?.type ?? "reed-diffuser"}><option value="reed-diffuser">Reed diffuser</option><option value="car-gem">Car fragrance</option><option value="spiritual">Spiritual</option></select></label>
        <label>Intensity · 1 to 5<input name="intensity" type="number" min="1" max="5" required defaultValue={product?.intensity ?? 3} /></label>
        <label>Badge<input name="badge" maxLength={40} defaultValue={product?.badge ?? ""} placeholder="Optional" /></label>
        <p className="admin-form-wide admin-rating-note">Product ratings and review counts update automatically from verified customer ratings.</p>
        <label className="admin-form-wide">Short description<input name="shortDescription" required maxLength={220} defaultValue={product?.shortDescription ?? ""} /></label>
        <label className="admin-form-wide">Full description<textarea name="fullDescription" required rows={4} maxLength={3000} defaultValue={product?.fullDescription ?? ""} /></label>
        <label className="admin-form-wide">Features · one per line<textarea name="features" rows={4} defaultValue={product?.features?.join("\n") ?? ""} /></label>
        <label>Top notes · comma separated<input name="topNotes" defaultValue={product?.fragranceNotes?.top.join(", ") ?? ""} /></label>
        <label>Heart notes · comma separated<input name="heartNotes" defaultValue={product?.fragranceNotes?.heart.join(", ") ?? ""} /></label>
        <label>Base notes · comma separated<input name="baseNotes" defaultValue={product?.fragranceNotes?.base.join(", ") ?? ""} /></label>
        <label className="admin-checkbox"><input name="isFeatured" type="checkbox" defaultChecked={product?.isFeatured ?? false} /> Featured on storefront</label>
        <label className="admin-checkbox"><input name="isPublished" type="checkbox" defaultChecked={product?.isPublished ?? true} /> Published in shop</label>
      </div>
      <AdminImageManager images={product?.images} />
      {state.error && <p role="alert" className="admin-form-error">{state.error}</p>}
      <button className="button-dark" type="submit" disabled={pending}>{pending ? "Saving…" : product?.id ? "Save product" : "Create product"} <span>→</span></button>
    </form>
  );
}
