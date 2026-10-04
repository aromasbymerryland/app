import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { signOutAction } from "@/app/auth/actions";
import { AccountProfileForm } from "@/components/account-profile-form";
import { createSupabaseServerClient, isSupabaseConfigured } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Your account" };

export default async function AccountPage() {
  if (!isSupabaseConfigured()) redirect("/login");
  const supabase = await createSupabaseServerClient();
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) redirect("/login");

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("full_name,phone,address,city,state,pincode,role")
    .eq("id", authData.user.id)
    .maybeSingle();
  if (error) throw new Error(`Unable to load your account: ${error.message}`);

  return (
    <main className="account-page">
      <header className="account-header">
        <Link href="/" className="wordmark"><span className="wordmark-main">AROMAS</span><span className="wordmark-sub">BY MERRYLAND</span></Link>
        <form action={signOutAction}><button type="submit" className="account-signout">Sign out</button></form>
      </header>
      <section className="account-welcome">
        <span className="eyebrow">Your little corner</span>
        <h1>Welcome{profile?.full_name ? `, ${profile.full_name.split(" ")[0]}` : ""}.</h1>
        <p>{authData.user.email}</p>
      </section>
      <nav className="account-navigation" aria-label="Account">
        <Link href="/account" aria-current="page">My details</Link>
        <Link href="/account/orders">Your orders</Link>
        <Link href="/support">Help desk</Link>
      </nav>
      <div className="account-cards">
        <section className="account-card account-profile-card">
          <span className="eyebrow">Your details & delivery address</span>
          <h2>Save your details for next time.</h2>
          <p className="account-note">We’ll prefill these details at checkout. You can update them whenever you need.</p>
          <AccountProfileForm
            fullName={profile?.full_name ?? ""}
            phone={profile?.phone ?? ""}
            address={profile?.address ?? ""}
            city={profile?.city ?? ""}
            state={profile?.state ?? ""}
            pincode={profile?.pincode ?? ""}
          />
        </section>
      </div>
      {profile?.role === "admin" && <Link href="/admin" className="text-link">Open store admin <span>→</span></Link>}
      <Link href="/shop" className="account-back-shop">Continue exploring <span>→</span></Link>
    </main>
  );
}
