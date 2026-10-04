import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth-form";
import { createSupabaseServerClient, isAuthSessionMissingError, isSupabaseConfigured } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Create your account", robots: { index: false, follow: false } };

export default async function SignupPage() {
  const isConfigured = isSupabaseConfigured();
  if (isConfigured) {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.getUser();
    if (error && !isAuthSessionMissingError(error)) {
      console.error("Unable to check the current sign-in state", error);
    } else if (data.user) {
      redirect("/account");
    }
  }

  return <AuthForm mode="signup" isConfigured={isConfigured} />;
}
