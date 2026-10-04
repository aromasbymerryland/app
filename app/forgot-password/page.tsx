import type { Metadata } from "next";
import { AuthForm } from "@/components/auth-form";
import { isSupabaseConfigured } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Reset your password", robots: { index: false, follow: false } };

export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  return <AuthForm mode="forgot" isConfigured={isSupabaseConfigured()} callbackError={error === "auth-callback"} />;
}
