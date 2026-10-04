"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type SupportActionState = { error?: string; success?: string; warning?: string };

const issueCategories = ["Order", "Delivery", "Product", "Payment", "Account", "Other"] as const;

export async function createSupportTicketAction(
  _previousState: SupportActionState,
  formData: FormData,
): Promise<SupportActionState> {
  const subject = String(formData.get("subject") ?? "").trim();
  const category = String(formData.get("category") ?? "");
  const message = String(formData.get("message") ?? "").trim();
  if (
    subject.length < 4 || subject.length > 160 ||
    !issueCategories.some((validCategory) => validCategory === category) ||
    message.length < 15 || message.length > 5000
  ) {
    return { error: "Add a subject and a message between 15 and 5,000 characters, and choose a category." };
  }

  const supabase = await createSupabaseServerClient();
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) return { error: "Please sign in to contact the help desk." };
  if (!authData.user.email) return { error: "Your account needs a verified email address before submitting a report." };

  const { error } = await supabase.from("support_tickets").insert({
    user_id: authData.user.id,
    customer_email: authData.user.email,
    subject,
    category,
    message,
  });
  if (error) {
    console.error("Support ticket creation failed", error);
    return { error: "We couldn’t submit your report just now. Please try again." };
  }

  revalidatePath("/support");
  revalidatePath("/admin/support");
  return { success: "Your report has been sent. You can follow its status and read our replies in your Help desk." };
}

export async function createSupportReplyAction(
  _previousState: SupportActionState,
  formData: FormData,
): Promise<SupportActionState> {
  const ticketId = String(formData.get("ticketId") ?? "");
  const message = String(formData.get("message") ?? "").trim();
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(ticketId)) {
    return { error: "This support report could not be found." };
  }
  if (message.length < 2 || message.length > 5000) {
    return { error: "Write a reply between 2 and 5,000 characters." };
  }

  const { supabase, user } = await requireAdmin();
  const { data: ticket, error: ticketError } = await supabase
    .from("support_tickets")
    .select("id,subject,customer_email")
    .eq("id", ticketId)
    .maybeSingle();
  if (ticketError) throw new Error(`Unable to load support report: ${ticketError.message}`);
  if (!ticket) return { error: "This support report could not be found." };

  const { data: reply, error: replyError } = await supabase
    .from("support_ticket_replies")
    .insert({ ticket_id: ticketId, admin_user_id: user.id, message })
    .select("id")
    .single();
  if (replyError) {
    console.error("Support reply save failed", replyError);
    return { error: "We couldn’t save your reply. Please try again." };
  }

  const { error: logError } = await supabase.from("admin_logs").insert({
    admin_user_id: user.id,
    action: "support_ticket.replied",
    entity_type: "support_ticket",
    entity_id: ticket.id,
    metadata: { subject: ticket.subject, customer_email: ticket.customer_email, reply_id: reply.id },
  });
  if (logError) console.error("Support reply audit log failed", logError);

  revalidatePath(`/admin/support/${ticketId}`);
  revalidatePath("/support");
  return {
    success: "Reply saved and visible to the customer in their Help desk.",
    ...(logError ? { warning: "The reply was saved, but its audit record could not be written. Contact support." } : {}),
  };
}

export async function updateSupportTicketStatusAction(formData: FormData) {
  const ticketId = String(formData.get("ticketId") ?? "");
  const status = String(formData.get("status") ?? "");
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(ticketId)) {
    throw new Error("Invalid support ticket ID.");
  }
  if (!["Open", "In progress", "Resolved"].includes(status)) {
    throw new Error("Invalid support ticket status.");
  }

  const { supabase, user } = await requireAdmin();
  const { data: ticket, error } = await supabase
    .from("support_tickets")
    .update({ status })
    .eq("id", ticketId)
    .select("id,subject,customer_email,status")
    .maybeSingle();
  if (error) throw new Error(`Unable to update support ticket: ${error.message}`);
  if (!ticket) throw new Error("Support ticket not found or admin access denied.");

  const { error: logError } = await supabase.from("admin_logs").insert({
    admin_user_id: user.id,
    action: "support_ticket.status_changed",
    entity_type: "support_ticket",
    entity_id: ticket.id,
    metadata: { subject: ticket.subject, customer_email: ticket.customer_email, status: ticket.status },
  });
  if (logError) throw new Error(`Ticket updated, but audit logging failed: ${logError.message}`);

  revalidatePath("/admin/support");
  revalidatePath(`/admin/support/${ticketId}`);
  revalidatePath("/support");
}
