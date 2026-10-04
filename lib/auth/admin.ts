import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function requireAdmin() {
  const supabase = await createSupabaseServerClient();
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) redirect("/login");

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("full_name,role")
    .eq("id", authData.user.id)
    .maybeSingle();
  if (error) throw new Error(`Unable to verify admin access: ${error.message}`);
  if (profile?.role !== "admin") redirect("/account");
  return { supabase, user: authData.user, profile };
}
