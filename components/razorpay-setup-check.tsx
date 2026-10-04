"use client";

import { useActionState } from "react";
import {
  checkRazorpaySetupAction,
  type RazorpaySetupState,
} from "@/app/checkout/actions";
import type { RazorpaySetupIssue } from "@/lib/payments/razorpay-config";

export function RazorpaySetupCheck({
  initialIssues,
}: {
  initialIssues: RazorpaySetupIssue[];
}) {
  const [state, formAction, pending] = useActionState<RazorpaySetupState, FormData>(
    checkRazorpaySetupAction,
    {},
  );
  const issues = state.issues ?? initialIssues;

  return (
    <section className="razorpay-setup-check" aria-labelledby="razorpay-setup-title">
      <h3 id="razorpay-setup-title">Razorpay setup check</h3>
      <p>This check never displays or returns secret values.</p>
      {issues.length > 0 && (
        <ul className="razorpay-setup-results">
          {issues.map((issue) => (
            <li key={`${issue.setting}-${issue.message}`}>
              <strong>{issue.setting}</strong>: {issue.message}
            </li>
          ))}
        </ul>
      )}
      {state.error && <p className="razorpay-setup-error" role="alert">{state.error}</p>}
      {state.checks && (
        <ul className="razorpay-setup-results">
          {state.checks.map((check) => (
            <li key={check.label} className={check.ok ? "is-ok" : "is-error"}>
              <strong>{check.label}</strong>: {check.message}
            </li>
          ))}
        </ul>
      )}
      <form action={formAction}>
        <button type="submit" className="razorpay-setup-button" disabled={pending}>
          {pending ? "Checking configuration…" : "Check keys and database"}
        </button>
      </form>
      <p className="razorpay-setup-note">
        The webhook secret can only be checked for presence here. Confirm it exactly matches the secret in Razorpay’s Test Mode webhook settings.
      </p>
    </section>
  );
}
