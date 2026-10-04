import type { Metadata } from "next";
import { AdminStoreSettingsForm } from "@/components/admin-store-settings-form";
import { requireAdmin } from "@/lib/auth/admin";

export const metadata: Metadata = { title: "Store settings · Admin" };
export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  const { supabase } = await requireAdmin();
  const { data: settings, error } = await supabase.from("site_settings").select("store_name,announcement_bar,contact_email,contact_phone,free_shipping_threshold,shipping_fee,invoice_legal_name,invoice_address,invoice_gstin,invoice_state,invoice_gst_rate,invoice_tax_mode").eq("id", 1).maybeSingle();
  if (error) throw new Error(`Unable to load store settings: ${error.message}`);
  if (!settings) throw new Error("The site_settings row is missing. Add the initial settings row before editing.");

  return (
    <>
      <header className="admin-page-heading"><div><span className="eyebrow">Set the atmosphere</span><h1>Store settings.</h1><p>These details appear throughout your storefront and checkout.</p></div></header>
      <section className="admin-panel admin-settings-panel">
        <AdminStoreSettingsForm settings={settings} />
      </section>
    </>
  );
}
