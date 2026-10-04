import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth/admin";

export const metadata: Metadata = { title: "Help desk · Admin" };
export const dynamic = "force-dynamic";

export default async function AdminSupportPage() {
  const { supabase } = await requireAdmin();
  const { data: tickets, error } = await supabase
    .from("support_tickets")
    .select("id,customer_email,subject,category,status,created_at")
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) throw new Error(`Unable to load support reports: ${error.message}`);

  return (
    <>
      <header className="admin-page-heading">
        <div><span className="eyebrow">Customer care</span><h1>Help desk.</h1><p>Review customer reports and keep support requests moving.</p></div>
      </header>
      <section className="admin-panel">
        {tickets?.length ? (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead><tr><th>Report</th><th>Customer</th><th>Category</th><th>Status</th><th>Received</th><th><span className="sr-only">Ticket actions</span></th></tr></thead>
              <tbody>
                {tickets.map((ticket) => (
                  <tr key={ticket.id}>
                    <td>{ticket.subject}</td>
                    <td>{ticket.customer_email}</td>
                    <td>{ticket.category}</td>
                    <td><span className={`support-status support-status-${ticket.status.toLowerCase().replace(" ", "-")}`}>{ticket.status}</span></td>
                    <td>{new Date(ticket.created_at).toLocaleDateString("en-IN", { dateStyle: "medium" })}</td>
                    <td><Link className="admin-order-details-link" href={`/admin/support/${ticket.id}`}>View report <span aria-hidden="true">→</span></Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <p className="admin-empty">No customer reports yet.</p>}
      </section>
    </>
  );
}
