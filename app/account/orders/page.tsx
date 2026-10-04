import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { signOutAction } from "@/app/auth/actions";
import { createSupabaseServerClient, isSupabaseConfigured } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Your orders" };

export default async function AccountOrdersPage() {
  if (!isSupabaseConfigured()) redirect("/login");
  const supabase = await createSupabaseServerClient();
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) redirect("/login");

  const { data: orders, error } = await supabase
    .from("orders")
    .select("id,order_number,status,payment_method,payment_status,tracking_url,total,created_at")
    .eq("user_id", authData.user.id)
    .order("created_at", { ascending: false });
  if (error) throw new Error(`Unable to load your orders: ${error.message}`);

  return (
    <main className="account-page">
      <header className="account-header">
        <Link href="/" className="wordmark"><span className="wordmark-main">AROMAS</span><span className="wordmark-sub">BY MERRYLAND</span></Link>
        <form action={signOutAction}><button type="submit" className="account-signout">Sign out</button></form>
      </header>
      <section className="account-welcome"><span className="eyebrow">A little history</span><h1>Your orders.</h1><p>{authData.user.email}</p></section>
      <nav className="account-navigation" aria-label="Account"><Link href="/account">My details</Link><Link href="/account/orders" aria-current="page">Your orders</Link><Link href="/support">Help desk</Link></nav>
      {orders?.length ? (
        <div className="account-orders">
          {orders.map((order) => (
            <Link className="account-order-row" href={`/orders/${order.id}`} key={order.id}>
              <div><span className="eyebrow">{new Date(order.created_at).toLocaleDateString("en-IN", { dateStyle: "medium" })}</span><strong>{order.order_number}</strong></div>
              <span className="account-order-status"><span className="order-status">{order.status}</span>{order.payment_method === "Razorpay" && <small className="account-order-payment-status">{order.payment_status === "PAID" ? "Payment confirmed" : "Payment pending"}</small>}{order.tracking_url && <a href={order.tracking_url} target="_blank" rel="noopener noreferrer">Track package ↗</a>}</span>
              <strong>{new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(Number(order.total))}</strong>
              <span aria-hidden="true">→</span>
            </Link>
          ))}
        </div>
      ) : (
        <div className="account-empty-orders"><p>Nothing on its way just yet.</p><Link href="/shop" className="button-dark">Find your first fragrance <span>→</span></Link></div>
      )}
    </main>
  );
}
