import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth/admin";

export const metadata: Metadata = { title: "Orders · Admin" };
export const dynamic = "force-dynamic";

export default async function AdminOrdersPage() {
  const { supabase } = await requireAdmin();
  const { data: orders, error } = await supabase
    .from("orders")
    .select("id,order_number,customer_name,customer_email,status,payment_method,payment_status,total,created_at")
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) throw new Error(`Unable to load orders: ${error.message}`);

  return (
    <>
      <header className="admin-page-heading"><div><span className="eyebrow">From your customers</span><h1>Orders.</h1><p>Review purchases and keep every delivery moving.</p></div></header>
      <section className="admin-panel">
        {orders?.length ? (
          <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Order</th><th>Customer</th><th>Payment</th><th>Status</th><th>Total</th><th>Placed</th><th><span className="sr-only">Order actions</span></th></tr></thead><tbody>
            {orders.map((order) => <tr key={order.id}><td>{order.order_number}</td><td><span className="admin-customer">{order.customer_name}<small>{order.customer_email}</small></span></td><td>{order.payment_status === "PAID" ? "Paid" : order.payment_status === "REFUND_REQUIRED" ? "Refund required" : order.payment_method === "Razorpay" ? "Payment pending" : "Pay on delivery"}</td><td><span className="order-status">{order.status}</span></td><td>{new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(Number(order.total))}</td><td>{new Date(order.created_at).toLocaleDateString("en-IN", { dateStyle: "medium" })}</td><td><Link className="admin-order-details-link" href={`/admin/orders/${order.id}`}>View details <span aria-hidden="true">→</span></Link></td></tr>)}
          </tbody></table></div>
        ) : <p className="admin-empty">No orders have arrived yet.</p>}
      </section>
    </>
  );
}
