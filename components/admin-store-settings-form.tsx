"use client";

import { useActionState } from "react";
import {
  updateStoreSettingsAction,
  type StoreSettingsActionState,
} from "@/app/admin/settings/actions";

type StoreSettingsFormValues = {
  store_name: string | null;
  announcement_bar: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  free_shipping_threshold: number | null;
  shipping_fee: number | null;
  invoice_legal_name: string | null;
  invoice_address: string | null;
  invoice_gstin: string | null;
  invoice_state: string | null;
  invoice_gst_rate: number | null;
  invoice_tax_mode: string | null;
};

export function AdminStoreSettingsForm({ settings }: { settings: StoreSettingsFormValues }) {
  const [state, formAction, pending] = useActionState<StoreSettingsActionState, FormData>(
    updateStoreSettingsAction,
    {},
  );

  return (
    <form action={formAction} className="admin-form">
      <div className="admin-form-grid">
        <label>Store name<input name="storeName" required minLength={2} maxLength={100} defaultValue={settings.store_name ?? ""} /></label>
        <label>Company / customer care email<input name="contactEmail" type="email" required defaultValue={settings.contact_email ?? ""} /></label>
        <label>Contact phone<input name="contactPhone" type="tel" required maxLength={40} defaultValue={settings.contact_phone ?? ""} /></label>
        <label>Free shipping threshold (₹)<input name="freeShippingThreshold" type="number" min="0" step="0.01" required defaultValue={settings.free_shipping_threshold ?? 1499} /></label>
        <label>Shipping fee (₹)<input name="shippingFee" type="number" min="0" step="0.01" required defaultValue={settings.shipping_fee ?? 99} /></label>
        <label className="admin-form-wide">Announcement bar<textarea name="announcementBar" rows={3} required maxLength={300} defaultValue={settings.announcement_bar ?? ""} /></label>
      </div>
      <div className="admin-settings-divider" />
      <h2>Invoice and GST settings</h2>
      <p className="admin-settings-note">Enter your real registered business details before enabling GST. The GST rate applies to the product subtotal. Inclusive pricing extracts GST from the current prices; exclusive pricing adds GST to future checkout totals. Existing orders retain their original settings. If GST is enabled, all registered business fields are required.</p>
      <div className="admin-form-grid">
        <label>Legal business name<input name="invoiceLegalName" maxLength={150} defaultValue={settings.invoice_legal_name ?? ""} /></label>
        <label>GSTIN<input name="invoiceGstin" maxLength={15} autoCapitalize="characters" defaultValue={settings.invoice_gstin ?? ""} /></label>
        <label className="admin-form-wide">Registered business address<textarea name="invoiceAddress" rows={3} maxLength={500} defaultValue={settings.invoice_address ?? ""} /></label>
        <label>Registered state<input name="invoiceState" maxLength={100} defaultValue={settings.invoice_state ?? ""} /></label>
        <label>GST rate (%)<input name="invoiceGstRate" type="number" min="0" max="100" step="0.01" required defaultValue={settings.invoice_gst_rate ?? 0} /></label>
        <label>Product price tax mode
          <select name="invoiceTaxMode" required defaultValue={settings.invoice_tax_mode ?? "inclusive"}>
            <option value="inclusive">Tax included in listed product prices</option>
            <option value="exclusive">Add tax to listed product prices at checkout</option>
          </select>
        </label>
      </div>
      {state.error && <p className="admin-form-error" role="alert">{state.error}</p>}
      {state.warning && <p className="admin-form-warning" role="status">{state.warning}</p>}
      {state.success && <p className="admin-form-success" role="status">{state.success}</p>}
      <button className="button-dark" type="submit" disabled={pending}>
        {pending ? "Saving settings…" : "Save store settings"} <span>→</span>
      </button>
    </form>
  );
}
