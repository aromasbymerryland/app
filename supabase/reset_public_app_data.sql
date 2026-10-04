-- DESTRUCTIVE: removes this app's public tables, data, policies, and related
-- database objects. It preserves auth.users, Supabase Storage objects/buckets,
-- and the uuid-ossp extension. Back up the project before running.

drop function if exists public.create_checkout_order(jsonb, text, text, text, text, text, text, uuid) cascade;
drop function if exists public.admin_revenue_total() cascade;
drop function if exists public.restore_cancelled_order_inventory() cascade;
drop function if exists public.set_verified_product_review_owner() cascade;
drop function if exists public.refresh_product_review_rating() cascade;
drop function if exists public.create_razorpay_checkout_order(jsonb, text, text, text, text, text, text, uuid) cascade;
drop function if exists public.attach_razorpay_order(uuid, text) cascade;
drop function if exists public.cancel_pending_razorpay_order(uuid) cascade;
drop function if exists public.mark_razorpay_payment_paid(text, text) cascade;
drop function if exists public.claim_checkout_payment_method(uuid, text) cascade;
drop function if exists public.create_cod_checkout_order(jsonb, text, text, text, text, text, text, uuid) cascade;
drop function if exists public.expire_pending_razorpay_orders() cascade;
drop function if exists public.flag_razorpay_refund_required(text, text) cascade;
drop function if exists public.is_admin() cascade;
drop function if exists public.update_updated_at_column() cascade;
drop function if exists public.handle_new_user() cascade;
drop function if exists public.snapshot_order_invoice_settings() cascade;

drop table if exists
  public.admin_logs,
  public.support_ticket_replies,
  public.support_tickets,
  public.product_reviews,
  public.checkout_payment_selections,
  public.product_fragrance_notes,
  public.product_features,
  public.product_images,
  public.categories,
  public.order_items,
  public.orders,
  public.products,
  public.site_settings,
  public.profiles
cascade;
