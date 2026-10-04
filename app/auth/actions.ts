"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getAuthCallbackUrl } from "@/lib/site-url";

export type AuthActionState = { error?: string; success?: string };

function getPasswordResetErrorMessage(error: { code?: string; status?: number; message: string }) {
  const code = error.code?.toLowerCase() ?? "";
  const message = error.message.toLowerCase();
  if (code.includes("redirect") || message.includes("redirect") && (message.includes("allow") || message.includes("url"))) {
    return "Supabase rejected the reset callback URL. In Supabase Auth → URL Configuration, allow the exact callback URL for this site, including its port in local development.";
  }
  if (code === "over_email_send_rate_limit" || error.status === 429) {
    return "Supabase is rate-limiting reset emails. Wait a while before trying again, or review the Auth email rate limits in Supabase.";
  }
  if (code === "email_address_not_authorized") {
    return "Supabase’s default email service cannot send to this address. Configure custom SMTP in Supabase Auth, or use an address allowed by the default email service.";
  }
  if (code === "email_provider_disabled") {
    return "Email sign-in is disabled for this Supabase project. Enable the email provider in Supabase Auth settings.";
  }
  if (error.status !== undefined && error.status >= 500) {
    return "Supabase’s Auth or email service is unavailable. Check the project status and Auth email/SMTP logs, then try again.";
  }
  return "Supabase rejected the reset-email request. Check Supabase Auth email settings and the allowed callback URL, then try again.";
}

function getCredentials(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { error: "Enter a valid email address." } as const;
  }
  if (password.length < 8) {
    return { error: "Your password must be at least 8 characters." } as const;
  }
  return { email, password } as const;
}

export async function signInAction(
  _previousState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const credentials = getCredentials(formData);
  if ("error" in credentials) return credentials;

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword(credentials);
  if (error) return { error: "Those details didn’t match an account. Please try again." };
  redirect("/account");
}

export async function signUpAction(
  _previousState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const credentials = getCredentials(formData);
  if ("error" in credentials) return credentials;
  const fullName = String(formData.get("fullName") ?? "").trim();
  if (fullName.length < 2 || fullName.length > 100) {
    return { error: "Enter your name (between 2 and 100 characters)." };
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signUp({
    ...credentials,
    options: {
      data: { full_name: fullName },
      emailRedirectTo: getAuthCallbackUrl("/account"),
    },
  });
  if (error) return { error: "We couldn’t create your account. Check your details and try again." };
  if (data.session) redirect("/account");
  return { success: "Please check your email to confirm your account before signing in." };
}

export async function sendPasswordResetAction(
  _previousState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { error: "Enter a valid email address." };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: getAuthCallbackUrl("/reset-password"),
  });
  if (error) {
    console.error("Password reset email request failed", { code: error.code, status: error.status });
    return { error: getPasswordResetErrorMessage(error) };
  }
  return { success: "If an account exists for that email, a reset link is on its way." };
}

export async function updatePasswordAction(
  _previousState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const password = String(formData.get("password") ?? "");
  const confirmation = String(formData.get("confirmPassword") ?? "");
  if (password.length < 8) return { error: "Your password must be at least 8 characters." };
  if (password !== confirmation) return { error: "Those passwords don’t match." };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: "We couldn’t update your password. Request a new reset link and try again." };
  redirect("/account");
}

export async function signOutAction() {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signOut();
  if (error) throw new Error(`Unable to sign out: ${error.message}`);
  redirect("/");
}
