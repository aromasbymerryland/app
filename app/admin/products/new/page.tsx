import type { Metadata } from "next";
import Link from "next/link";
import { AdminProductForm } from "@/components/admin-product-form";
import { requireAdmin } from "@/lib/auth/admin";

export const metadata: Metadata = { title: "Add product · Admin" };

export default async function NewAdminProductPage() {
  const { supabase } = await requireAdmin();
  const { data: categories, error } = await supabase.from("categories").select("name,slug").eq("is_active", true).order("sort_order");
  if (error) throw new Error(`Unable to load product categories: ${error.message}`);
  return (
    <>
      <header className="admin-page-heading"><div><Link className="admin-back-link" href="/admin/products">← All products</Link><span className="eyebrow">A new addition</span><h1>Add a product.</h1><p>Give your fragrance a place in the collection.</p></div></header>
      {categories?.length ? <AdminProductForm categories={categories} /> : <p className="admin-empty">Create an active category before adding a product.</p>}
    </>
  );
}
