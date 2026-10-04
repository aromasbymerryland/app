"use client";

import { useActionState } from "react";
import {
  createSupportTicketAction,
  type SupportActionState,
} from "@/app/support/actions";

export function SupportTicketForm() {
  const [state, formAction, pending] = useActionState<SupportActionState, FormData>(
    createSupportTicketAction,
    {},
  );

  return (
    <form action={formAction} className="support-ticket-form">
      <label>What do you need help with?
        <select name="category" defaultValue="Order" required>
          <option>Order</option>
          <option>Delivery</option>
          <option>Product</option>
          <option>Payment</option>
          <option>Account</option>
          <option>Other</option>
        </select>
      </label>
      <label>Subject<input name="subject" required minLength={4} maxLength={160} placeholder="A short summary of the problem" /></label>
      <label>Tell us what happened<textarea name="message" required minLength={15} maxLength={5000} rows={7} placeholder="Share any details that will help us look into this." /></label>
      {state.error && <p className="support-form-message support-form-error" role="alert">{state.error}</p>}
      {state.success && <p className="support-form-message support-form-success" role="status">{state.success}</p>}
      {state.warning && <p className="support-form-message support-form-warning" role="status">{state.warning}</p>}
      <button className="button-dark" type="submit" disabled={pending}>{pending ? "Sending your report…" : "Send to help desk"} <span>→</span></button>
    </form>
  );
}
