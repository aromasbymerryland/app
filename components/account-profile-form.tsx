"use client";

import { useActionState } from "react";
import { saveProfileAction, type ProfileActionState } from "@/app/account/actions";

export function AccountProfileForm({
  fullName,
  phone,
  address,
  city,
  state,
  pincode,
}: {
  fullName: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
}) {
  const [result, formAction, pending] = useActionState<ProfileActionState, FormData>(
    saveProfileAction,
    {},
  );

  return (
    <form action={formAction} className="account-profile-form">
      <label>Full name<input name="fullName" autoComplete="name" defaultValue={fullName} minLength={2} maxLength={100} required /></label>
      <label>Phone number<input name="phone" type="tel" autoComplete="tel" defaultValue={phone} minLength={7} maxLength={20} required /></label>
      <label className="account-profile-wide">Street address<input name="address" autoComplete="street-address" defaultValue={address} maxLength={500} /></label>
      <label>City<input name="city" autoComplete="address-level2" defaultValue={city} maxLength={100} /></label>
      <label>State<input name="state" autoComplete="address-level1" defaultValue={state} maxLength={100} /></label>
      <label>PIN code<input name="pincode" inputMode="numeric" autoComplete="postal-code" defaultValue={pincode} pattern="[0-9]{6}" maxLength={6} /></label>
      {result.error && <p className="account-profile-message account-profile-error" role="alert">{result.error}</p>}
      {result.success && <p className="account-profile-message account-profile-success" role="status">{result.success}</p>}
      <button className="button-dark" type="submit" disabled={pending}>{pending ? "Saving your details…" : "Save my details"} <span>→</span></button>
    </form>
  );
}
