import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { randomUUID } from "node:crypto";
import { CheckoutForm } from "@/components/checkout-form";
import { isSupabaseConfigured, createSupabaseServerClient } from "@/lib/supabase/server";
import { getRazorpayConfiguration, getRazorpaySetupIssues } from "@/lib/payments/razorpay-config";

export const metadata: Metadata = { title: "Secure checkout", robots: { index: false, follow: false } };

export default async function CheckoutPage() {
  if (!isSupabaseConfigured()) {
    return (
      <main className="checkout-page checkout-unavailable">
        <Link href="/" className="wordmark"><span className="wordmark-main">AROMAS</span><span className="wordmark-sub">BY MERRYLAND</span></Link>
        <span className="eyebrow">Almost there</span>
        <h1>Your bag is saved.<br /><em>Checkout is next.</em></h1>
        <p>Connect your Supabase project and apply the secure checkout migration to enable real orders. Your bag stays saved in this browser.</p>
        <Link href="/shop" className="button-dark">Continue exploring <span>→</span></Link>
      </main>
    );
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) redirect("/login");

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("full_name,phone,address,city,state,pincode")
    .eq("id", data.user.id)
    .maybeSingle();
  if (profileError) throw new Error(`Unable to load your checkout profile: ${profileError.message}`);
  const razorpay = getRazorpayConfiguration();
  const razorpaySetupIssues = getRazorpaySetupIssues();

  return (
    <main className="checkout-page">
      <div className="checkout-top"><Link href="/" className="wordmark"><span className="wordmark-main">AROMAS</span><span className="wordmark-sub">BY MERRYLAND</span></Link><span>SECURE CHECKOUT</span><Link href="/shop">Continue shopping</Link></div>
      <div className="checkout-content">
        <div className="checkout-title"><span className="eyebrow">A little closer to home</span><h1>Make it <em>yours.</em></h1><p>One last detail, then your fragrance is on its way.</p></div>
        <CheckoutForm
          email={data.user.email ?? ""}
          profileName={profile?.full_name ?? ""}
          profilePhone={profile?.phone ?? ""}
          profileAddress={profile?.address ?? ""}
          profileCity={profile?.city ?? ""}
          profileState={profile?.state ?? ""}
          profilePincode={profile?.pincode ?? ""}
          checkoutKey={randomUUID()}
          paymentMode={razorpay?.mode === "live" ? "live" : "test"}
          razorpayConfigured={Boolean(razorpay)}
          razorpaySetupIssues={razorpaySetupIssues}
        />
        <aside className="checkout-secure"><span>✳</span><p>Order totals and stock are confirmed securely against the live catalog when you place your order.</p></aside>
      </div>
    </main>
  );
}
