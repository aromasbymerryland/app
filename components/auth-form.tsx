"use client";

import Link from "next/link";
import { useActionState } from "react";
import {
  sendPasswordResetAction,
  signInAction,
  signUpAction,
  updatePasswordAction,
  type AuthActionState,
} from "@/app/auth/actions";

type AuthMode = "login" | "signup" | "forgot" | "reset";

const actions: Record<AuthMode, (state: AuthActionState, formData: FormData) => Promise<AuthActionState>> = {
  login: signInAction,
  signup: signUpAction,
  forgot: sendPasswordResetAction,
  reset: updatePasswordAction,
};

const content: Record<AuthMode, { eyebrow: string; title: string; description: string; button: string }> = {
  login: { eyebrow: "Welcome back", title: "Good to have you here.", description: "Sign in to find your saved favourites and order updates.", button: "Sign in" },
  signup: { eyebrow: "A place for you", title: "Make yourself at home.", description: "Create an account to save the scents you love and keep up with your orders.", button: "Create account" },
  forgot: { eyebrow: "A little reset", title: "Let’s get you back in.", description: "Enter your email and we’ll send you a link to choose a new password.", button: "Send reset link" },
  reset: { eyebrow: "A fresh start", title: "Choose a new password.", description: "Use at least eight characters for your new password.", button: "Update password" },
};

export function AuthForm({
  mode,
  isConfigured,
  callbackError = false,
}: {
  mode: AuthMode;
  isConfigured: boolean;
  callbackError?: boolean;
}) {
  const [state, formAction, pending] = useActionState(actions[mode], {});
  const text = content[mode];

  return (
    <main className="auth-page">
      <div className="auth-image">
        <span className="eyebrow">Aromas by Merryland</span>
        <p>Little moments.<br /><em>Lovely feelings.</em></p>
        <span className="auth-image-caption">FRAGRANCE FOR THE FEELING</span>
      </div>
      <section className="auth-panel">
        <Link href="/" className="auth-back">← Back to the store</Link>
        <div className="auth-card">
          <span className="eyebrow">{text.eyebrow}</span>
          <h1>{text.title}</h1>
          <p className="auth-description">{text.description}</p>
          {callbackError && (
            <p className="auth-message auth-error" role="alert">
              That sign-in link has expired or could not be verified. Please request a fresh link and try again.
            </p>
          )}
          {!isConfigured && (
            <p className="auth-message auth-error" role="status">
              Authentication is not connected yet. Add your Supabase URL and publishable key to `.env.local`, then restart the app.
            </p>
          )}
          <form action={formAction} className="auth-form">
            {mode === "signup" && (
              <label>
                Your name
                <input name="fullName" type="text" autoComplete="name" minLength={2} maxLength={100} required />
              </label>
            )}
            {mode !== "reset" && (
              <label>
                Email address
                <input name="email" type="email" autoComplete="email" required />
              </label>
            )}
            {(mode === "login" || mode === "signup" || mode === "reset") && (
              <label>
                {mode === "reset" ? "New password" : "Password"}
                <input name="password" type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} minLength={8} required />
              </label>
            )}
            {mode === "reset" && (
              <label>
                Confirm new password
                <input name="confirmPassword" type="password" autoComplete="new-password" minLength={8} required />
              </label>
            )}
            {state.error && <p className="auth-message auth-error" role="alert">{state.error}</p>}
            {state.success && <p className="auth-message auth-success" role="status">{state.success}</p>}
            <button type="submit" className="button-dark auth-submit" disabled={pending || !isConfigured}>
              {pending ? "One moment…" : text.button}
              <span aria-hidden="true">→</span>
            </button>
          </form>
          <div className="auth-links">
            {mode === "login" && <><Link href="/forgot-password">Forgot your password?</Link><p>New to Merryland? <Link href="/signup">Create an account</Link></p></>}
            {mode === "signup" && <p>Already have an account? <Link href="/login">Sign in</Link></p>}
            {mode === "forgot" && <p>Remembered it? <Link href="/login">Back to sign in</Link></p>}
            {mode === "reset" && <p>Need a new link? <Link href="/forgot-password">Request a reset</Link></p>}
          </div>
          <p className="auth-footnote">Your details are kept private and secure.</p>
        </div>
      </section>
    </main>
  );
}
