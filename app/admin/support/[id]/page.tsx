import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { updateSupportTicketStatusAction } from "@/app/support/actions";
import { SupportReplyForm } from "@/components/support-reply-form";
import { requireAdmin } from "@/lib/auth/admin";

export const metadata: Metadata = { title: "Support report · Admin" };
export const dynamic = "force-dynamic";

export default async function AdminSupportTicketPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) notFound();
  const { supabase } = await requireAdmin();
  const { data: ticket, error } = await supabase
    .from("support_tickets")
    .select("id,customer_email,subject,category,message,status,created_at")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(`Unable to load support report: ${error.message}`);
  if (!ticket) notFound();
  const { data: replies, error: repliesError } = await supabase
    .from("support_ticket_replies")
    .select("id,message,created_at")
    .eq("ticket_id", id)
    .order("created_at", { ascending: true });
  if (repliesError) throw new Error(`Unable to load support replies: ${repliesError.message}`);

  return (
    <>
      <header className="admin-page-heading">
        <div><Link className="admin-back-link" href="/admin/support">← All reports</Link><span className="eyebrow">{ticket.category} · Received {new Date(ticket.created_at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</span><h1>{ticket.subject}.</h1><p><a href={`mailto:${ticket.customer_email}`}>{ticket.customer_email}</a></p></div>
      </header>
      <section className="admin-panel support-message-panel">
        <span className="eyebrow">Customer report</span>
        <p>{ticket.message}</p>
      </section>
      {replies?.map((reply) => (
        <section className="admin-panel support-message-panel support-admin-reply" key={reply.id}>
          <span className="eyebrow">Admin reply · {new Date(reply.created_at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</span>
          <p>{reply.message}</p>
        </section>
      ))}
      <section className="admin-panel support-admin-status">
        <form action={updateSupportTicketStatusAction} className="admin-status-form">
          <input type="hidden" name="ticketId" value={ticket.id} />
          <label>Report status
            <select name="status" defaultValue={ticket.status}>
              <option>Open</option>
              <option>In progress</option>
              <option>Resolved</option>
            </select>
          </label>
          <button className="button-dark" type="submit">Save status <span>→</span></button>
        </form>
        <SupportReplyForm ticketId={ticket.id} />
        <p className="support-email-note">Replies are saved to the customer’s Help desk page. Email notifications are not enabled.</p>
      </section>
    </>
  );
}
