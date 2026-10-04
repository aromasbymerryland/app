import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { deactivateProductAction } from "@/app/admin/products/actions";
import { requireAdmin } from "@/lib/auth/admin";

export const metadata: Metadata = { title: "Products · Admin" };
export const dynamic = "force-dynamic";

export default async function AdminProductsPage() {
  const { supabase } = await requireAdmin();
  const { data: products, error } = await supabase
    .from("products")
    .select("id,name,slug,category,price,stock_quantity,is_published,product_images(image_url,alt_text,is_primary)")
    .order("created_at", { ascending: false });
  if (error) throw new Error(`Unable to load products: ${error.message}`);

  return (
    <>
      <header className="admin-page-heading">
        <div><span className="eyebrow">Your collection</span><h1>Products.</h1><p>Add, edit, and publish the fragrances in your shop.</p></div>
        <Link className="button-dark" href="/admin/products/new">Add a product <span>+</span></Link>
      </header>
      <section className="admin-panel">
        {products?.length ? (
          <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Product</th><th>Category</th><th>Price</th><th>Stock</th><th>Visibility</th><th>Actions</th></tr></thead><tbody>
            {products.map((product) => {
              const image = Array.isArray(product.product_images)
                ? product.product_images.find((entry) => entry.is_primary) ?? product.product_images[0]
                : null;
              return (
                <tr key={product.id}>
                  <td><div className="admin-product-cell">{image?.image_url && <Image src={image.image_url} alt={image.alt_text ?? ""} width={48} height={58} unoptimized />}<span>{product.name}</span></div></td>
                  <td>{product.category}</td>
                  <td>{new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(Number(product.price))}</td>
                  <td>{product.stock_quantity}</td>
                  <td><span className={`admin-visibility ${product.is_published ? "is-published" : ""}`}>{product.is_published ? "Published" : "Hidden"}</span></td>
                  <td><div className="admin-row-actions"><Link href={`/admin/products/${product.id}/edit`}>Edit</Link>{product.is_published && <form action={deactivateProductAction}><input type="hidden" name="productId" value={product.id} /><button type="submit">Unpublish</button></form>}</div></td>
                </tr>
              );
            })}
          </tbody></table></div>
        ) : <p className="admin-empty">No products yet. Add a fragrance to start building the live catalog.</p>}
      </section>
    </>
  );
}
