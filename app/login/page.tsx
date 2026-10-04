import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth-form";
import { createSupabaseServerClient, isAuthSessionMissingError, isSupabaseConfigured } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Sign in", robots: { index: false, follow: false } };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const isConfigured = isSupabaseConfigured();
  if (isConfigured) {
    const supabase = await createSupabaseServerClient();
    const { data, error: authError } = await supabase.auth.getUser();
    if (authError && !isAuthSessionMissingError(authError)) {
      console.error("Unable to check the current sign-in state", authError);
    } else if (data.user) {
      redirect("/account");
    }
  }

  return (
    <AuthForm
      mode="login"
      isConfigured={isConfigured}
      callbackError={error === "auth-callback"}
    />
  );
}
