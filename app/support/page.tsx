import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { SupportTicketForm } from "@/components/support-ticket-form";
import { createSupabaseServerClient, isSupabaseConfigured } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Help desk", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function SupportPage() {
  if (!isSupabaseConfigured()) redirect("/login");
  const supabase = await createSupabaseServerClient();
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) redirect("/login");

  const { data: tickets, error } = await supabase
    .from("support_tickets")
    .select("id,subject,category,status,created_at")
    .eq("user_id", authData.user.id)
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw new Error(`Unable to load your help desk reports: ${error.message}`);
  const ticketIds = (tickets ?? []).map((ticket) => ticket.id);
  const { data: replies, error: repliesError } = ticketIds.length
    ? await supabase
        .from("support_ticket_replies")
        .select("id,ticket_id,message,created_at")
        .in("ticket_id", ticketIds)
        .order("created_at", { ascending: true })
    : { data: [], error: null };
  if (repliesError) throw new Error(`Unable to load help desk replies: ${repliesError.message}`);

  return (
    <main className="support-page">
      <header className="support-heading">
        <Link href="/account" className="support-back">← Your account</Link>
        <span className="eyebrow">Here to help</span>
        <h1>How can we <em>help?</em></h1>
        <p>Tell us what’s going on and our team will review your report. Replies will appear here in your Help desk.</p>
        <span className="support-contact">Submitting as {authData.user.email}</span>
      </header>
      <section className="support-form-panel">
        <span className="eyebrow">New report</span>
        <SupportTicketForm />
      </section>
      <section className="support-history">
        <div className="section-heading">
          <div><span className="eyebrow">Your requests</span><h2>Help desk <em>history.</em></h2></div>
        </div>
        {tickets?.length ? (
          <div className="support-ticket-list">
            {tickets.map((ticket) => (
              <article className="support-ticket-row" key={ticket.id}>
                <div className="support-ticket-row-head">
                  <div><span className="eyebrow">{ticket.category} · {new Date(ticket.created_at).toLocaleDateString("en-IN", { dateStyle: "medium" })}</span><h3>{ticket.subject}</h3></div>
                  <span className={`support-status support-status-${ticket.status.toLowerCase().replace(" ", "-")}`}>{ticket.status}</span>
                </div>
                {(replies ?? []).filter((reply) => reply.ticket_id === ticket.id).map((reply) => (
                  <div className="support-customer-reply" key={reply.id}>
                    <span className="eyebrow">Reply from Merryland · {new Date(reply.created_at).toLocaleDateString("en-IN", { dateStyle: "medium" })}</span>
                    <p>{reply.message}</p>
                  </div>
                ))}
              </article>
            ))}
          </div>
        ) : <p className="support-empty">Your reports and their updates will appear here.</p>}
      </section>
    </main>
  );
}
