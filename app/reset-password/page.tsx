import type { Metadata } from "next";
import { AuthForm } from "@/components/auth-form";
import { isSupabaseConfigured } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Choose a new password", robots: { index: false, follow: false } };

export default function ResetPasswordPage() {
  return <AuthForm mode="reset" isConfigured={isSupabaseConfigured()} />;
}
