"use client";

import { useActionState } from "react";
import {
  createSupportReplyAction,
  type SupportActionState,
} from "@/app/support/actions";

export function SupportReplyForm({ ticketId }: { ticketId: string }) {
  const [state, formAction, pending] = useActionState<SupportActionState, FormData>(
    createSupportReplyAction,
    {},
  );

  return (
    <form action={formAction} className="support-ticket-form support-reply-form">
      <input type="hidden" name="ticketId" value={ticketId} />
      <label>Reply to customer<textarea name="message" required minLength={2} maxLength={5000} rows={6} /></label>
      {state.error && <p className="support-form-message support-form-error" role="alert">{state.error}</p>}
      {state.success && <p className="support-form-message support-form-success" role="status">{state.success}</p>}
      {state.warning && <p className="support-form-message support-form-warning" role="status">{state.warning}</p>}
      <button className="button-dark" type="submit" disabled={pending}>{pending ? "Saving reply…" : "Save reply"} <span>→</span></button>
    </form>
  );
}
