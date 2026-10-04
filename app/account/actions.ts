"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export type ProfileActionState = { error?: string; success?: string };

export async function saveProfileAction(
  _previousState: ProfileActionState,
  formData: FormData,
): Promise<ProfileActionState> {
  const fullName = String(formData.get("fullName") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const address = String(formData.get("address") ?? "").trim();
  const city = String(formData.get("city") ?? "").trim();
  const state = String(formData.get("state") ?? "").trim();
  const pincode = String(formData.get("pincode") ?? "").trim();
  const addressParts = [address, city, state, pincode];
  const hasAddress = addressParts.some(Boolean);

  if (
    fullName.length < 2 || fullName.length > 100 ||
    !/^[0-9+() -]{7,20}$/.test(phone) ||
    (address.length > 0 && (address.length < 8 || address.length > 500)) ||
    city.length > 100 ||
    state.length > 100 ||
    (pincode !== "" && !/^[0-9]{6}$/.test(pincode)) ||
    (hasAddress && addressParts.some((part) => !part))
  ) {
    return { error: "Check your name, phone, and address details. Enter the full delivery address or leave it blank." };
  }

  const supabase = await createSupabaseServerClient();
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) return { error: "Your session has expired. Please sign in again." };

  const { data, error } = await supabase
    .from("profiles")
    .update({
      full_name: fullName,
      phone,
      address: address || null,
      city: city || null,
      state: state || null,
      pincode: pincode || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", authData.user.id)
    .select("id")
    .maybeSingle();

  if (error) {
    console.error("Customer profile update failed", error);
    return { error: "We couldn’t save your details. Please try again." };
  }
  if (!data) return { error: "We couldn’t find your profile. Please sign out and sign in again." };

  return { success: "Your details and delivery address have been saved." };
}
