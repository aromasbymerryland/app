import Link from "next/link";
import { requireAdmin } from "@/lib/auth/admin";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const { supabase } = await requireAdmin();
  const [products, customers, orders, pending, recent, revenue] = await Promise.all([
    supabase.from("products").select("id", { count: "exact", head: true }),
    supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "customer"),
    supabase.from("orders").select("id", { count: "exact", head: true }),
    supabase.from("orders").select("id", { count: "exact", head: true }).eq("status", "Processing"),
    supabase.from("orders").select("id,order_number,customer_name,status,total,created_at").order("created_at", { ascending: false }).limit(6),
    supabase.rpc("admin_revenue_total"),
  ]);
  for (const result of [products, customers, orders, pending, recent, revenue]) {
    if (result.error) throw new Error(`Unable to load admin dashboard: ${result.error.message}`);
  }

  const metrics = [
    { label: "Catalog products", value: products.count ?? 0 },
    { label: "Customers", value: customers.count ?? 0 },
    { label: "All orders", value: orders.count ?? 0 },
    { label: "To prepare", value: pending.count ?? 0 },
    { label: "Revenue · paid / COD", value: new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(Number(revenue.data ?? 0)) },
  ];

  return (
    <>
      <header className="admin-page-heading"><div><span className="eyebrow">A little overview</span><h1>Good to see you.</h1><p>Here’s how the store is doing today.</p></div><Link className="button-dark" href="/admin/products/new">Add a product <span>+</span></Link></header>
      <section className="admin-metrics" aria-label="Store metrics">
        {metrics.map((metric) => <article key={metric.label}><span>{metric.label}</span><strong>{metric.value}</strong></article>)}
      </section>
      <section className="admin-panel">
        <div className="admin-panel-heading"><div><span className="eyebrow">Fresh from the store</span><h2>Recent orders</h2></div><Link href="/admin/orders">All orders →</Link></div>
        {recent.data?.length ? (
          <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Order</th><th>Customer</th><th>Status</th><th>Total</th><th>Placed</th></tr></thead><tbody>
            {recent.data.map((order) => <tr key={order.id}><td><Link href={`/admin/orders/${order.id}`}>{order.order_number}</Link></td><td>{order.customer_name}</td><td><span className="order-status">{order.status}</span></td><td>{new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(Number(order.total))}</td><td>{new Date(order.created_at).toLocaleDateString("en-IN", { dateStyle: "medium" })}</td></tr>)}
          </tbody></table></div>
        ) : <p className="admin-empty">No orders yet. New orders will show here.</p>}
      </section>
    </>
  );
}
