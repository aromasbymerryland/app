"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/admin";

export type StoreSettingsActionState = {
  error?: string;
  success?: string;
  warning?: string;
};

export async function updateStoreSettingsAction(
  _previousState: StoreSettingsActionState,
  formData: FormData,
): Promise<StoreSettingsActionState> {
  const storeName = String(formData.get("storeName") ?? "").trim();
  const announcementBar = String(formData.get("announcementBar") ?? "").trim();
  const contactEmail = String(formData.get("contactEmail") ?? "").trim();
  const contactPhone = String(formData.get("contactPhone") ?? "").trim();
  const freeShippingThresholdValue = String(formData.get("freeShippingThreshold") ?? "").trim();
  const shippingFeeValue = String(formData.get("shippingFee") ?? "").trim();
  const freeShippingThreshold = Number(freeShippingThresholdValue);
  const shippingFee = Number(shippingFeeValue);
  const invoiceLegalName = String(formData.get("invoiceLegalName") ?? "").trim();
  const invoiceAddress = String(formData.get("invoiceAddress") ?? "").trim();
  const invoiceGstin = String(formData.get("invoiceGstin") ?? "").trim().toUpperCase();
  const invoiceState = String(formData.get("invoiceState") ?? "").trim();
  const invoiceGstRateValue = String(formData.get("invoiceGstRate") ?? "").trim();
  const invoiceGstRate = Number(invoiceGstRateValue);
  const invoiceTaxMode = String(formData.get("invoiceTaxMode") ?? "");

  if (storeName.length < 2) return { error: "Store name should not be empty and must contain at least 2 characters." };
  if (storeName.length > 100) return { error: "Store name must be 100 characters or fewer." };
  if (!announcementBar) return { error: "Announcement bar should not be empty." };
  if (announcementBar.length > 300) return { error: "Announcement bar must be 300 characters or fewer." };
  if (!contactEmail) return { error: "Customer care email should not be empty." };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail)) return { error: "Enter a valid customer care email address." };
  if (!contactPhone) return { error: "Contact phone should not be empty." };
  const phoneDigits = contactPhone.replace(/\D/g, "").length;
  if (contactPhone.length > 40 || phoneDigits < 7 || phoneDigits > 15) {
    return { error: "Enter a valid contact phone number with 7 to 15 digits." };
  }
  if (!freeShippingThresholdValue) return { error: "Free shipping threshold should not be empty." };
  if (!Number.isFinite(freeShippingThreshold) || freeShippingThreshold < 0) {
    return { error: "Free shipping threshold must be a number greater than or equal to 0." };
  }
  if (!shippingFeeValue) return { error: "Shipping fee should not be empty." };
  if (!Number.isFinite(shippingFee) || shippingFee < 0) {
    return { error: "Shipping fee must be a number greater than or equal to 0." };
  }
  if (!invoiceGstRateValue) return { error: "GST rate should not be empty; enter 0 if GST is not enabled." };
  if (!Number.isFinite(invoiceGstRate) || invoiceGstRate < 0 || invoiceGstRate > 100) {
    return { error: "GST rate must be between 0 and 100." };
  }
  if (!["inclusive", "exclusive"].includes(invoiceTaxMode)) return { error: "Choose a valid product price tax mode." };
  if (invoiceLegalName.length > 150) return { error: "Legal business name must be 150 characters or fewer." };
  if (invoiceAddress.length > 500) return { error: "Registered business address must be 500 characters or fewer." };
  if (invoiceGstin.length > 15) return { error: "GSTIN must be 15 characters or fewer." };
  if (invoiceState.length > 100) return { error: "Registered state must be 100 characters or fewer." };
  if (invoiceGstRate > 0) {
    if (invoiceLegalName.length < 2) return { error: "Legal business name should not be empty when GST is enabled." };
    if (invoiceAddress.length < 8) return { error: "Registered business address should not be empty when GST is enabled." };
    if (invoiceState.length < 2) return { error: "Registered state should not be empty when GST is enabled." };
    if (!/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][A-Z0-9]Z[A-Z0-9]$/.test(invoiceGstin)) {
      return { error: "Enter a valid 15-character GSTIN when GST is enabled." };
    }
  }

  const { supabase, user } = await requireAdmin();
  const { data, error } = await supabase.from("site_settings").upsert({
    id: 1,
    store_name: storeName,
    announcement_bar: announcementBar,
    contact_email: contactEmail,
    contact_phone: contactPhone,
    free_shipping_threshold: freeShippingThreshold,
    shipping_fee: shippingFee,
    invoice_legal_name: invoiceLegalName || null,
    invoice_address: invoiceAddress || null,
    invoice_gstin: invoiceGstin || null,
    invoice_state: invoiceState || null,
    invoice_gst_rate: invoiceGstRate,
    invoice_tax_mode: invoiceTaxMode,
  }).select("id").maybeSingle();
  if (error) return { error: `Unable to update store settings: ${error.message}` };
  if (!data) return { error: "Store settings were not updated. Check admin permissions and try again." };

  revalidatePath("/");
  revalidatePath("/shop");
  revalidatePath("/admin/settings");
  revalidatePath("/account/orders");

  const { error: logError } = await supabase.from("admin_logs").insert({
    admin_user_id: user.id,
    action: "settings.updated",
    entity_type: "site_settings",
    metadata: { store_name: storeName, invoice_gst_rate: invoiceGstRate, invoice_tax_mode: invoiceTaxMode },
  });
  if (logError) return { warning: `Settings were saved, but audit logging failed: ${logError.message}` };
  return { success: "Store settings saved successfully." };
}
