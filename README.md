# Aromas by Merryland

A responsive fragrance storefront built with the Next.js App Router, TypeScript, and Supabase.

## Run locally

1. Copy `.env.example` to `.env.local`.
2. Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` from your Supabase project. Set `NEXT_PUBLIC_SITE_URL` to the site's canonical origin; use `https://merryland-sandy.vercel.app` for production. It also determines signup-confirmation and password-reset email destinations. Only change it to your local origin when intentionally testing local email callbacks.
3. Back up your Supabase project before any destructive database operation.
4. Only when intentionally rebuilding from scratch, run [`supabase/reset_public_app_data.sql`](./supabase/reset_public_app_data.sql). This permanently deletes this app's public tables and data while leaving Auth users and Storage objects intact.
5. In Supabase SQL Editor, run [`supabase/migrations/000_initial_schema.sql`](./supabase/migrations/000_initial_schema.sql), then run [`supabase/migrations/001_secure_checkout.sql`](./supabase/migrations/001_secure_checkout.sql), [`supabase/migrations/002_catalog_media.sql`](./supabase/migrations/002_catalog_media.sql), [`supabase/migrations/003_admin_tools.sql`](./supabase/migrations/003_admin_tools.sql), [`supabase/migrations/004_contact_details.sql`](./supabase/migrations/004_contact_details.sql), [`supabase/migrations/005_customer_profile_updates.sql`](./supabase/migrations/005_customer_profile_updates.sql), [`supabase/migrations/006_order_tracking.sql`](./supabase/migrations/006_order_tracking.sql), [`supabase/migrations/007_support_tickets.sql`](./supabase/migrations/007_support_tickets.sql), [`supabase/migrations/008_support_ticket_replies.sql`](./supabase/migrations/008_support_ticket_replies.sql), [`supabase/migrations/009_verified_product_ratings.sql`](./supabase/migrations/009_verified_product_ratings.sql), [`supabase/migrations/010_razorpay_checkout.sql`](./supabase/migrations/010_razorpay_checkout.sql), [`supabase/migrations/011_order_invoices.sql`](./supabase/migrations/011_order_invoices.sql), and [`supabase/migrations/012_update_store_contact_details.sql`](./supabase/migrations/012_update_store_contact_details.sql), in that order. Run each whole file once.
6. The initial schema recreates profiles for existing Auth accounts as customers. Re-promote your admin account after all migrations:

   ```sql
   update public.profiles
   set role = 'admin'
   where id = (select id from auth.users where email = 'your-admin-email@example.com');
   ```

7. Add products through the admin dashboard; the reset clears catalog products and orders. In Supabase Auth → URL Configuration, set the production Site URL to `https://merryland-sandy.vercel.app` and allow `https://merryland-sandy.vercel.app/auth/callback` as a Redirect URL. If testing email callbacks locally, separately allow the exact local callback origin and port.
8. In Supabase Auth → Email Templates, make the confirmation and password-reset links use Supabase's `{{ .ConfirmationURL }}` variable. Do not hard-code `{{ .SiteURL }}`, localhost, or a host into these links; the app sends the target host as `emailRedirectTo`/`redirectTo`. After changing templates or URL configuration, trigger a fresh signup/reset email; existing emails do not change.
9. Confirm checkout is installed:

   ```sql
   select to_regprocedure(
     'public.create_checkout_order(jsonb,text,text,text,text,text,text,uuid)'
   );
   ```

   The result should be the function signature, not `NULL`.
10. Run `npm run dev` and open the local address printed by Next.js.
11. To test online payments, set the server-only `SUPABASE_SERVICE_ROLE_KEY`, `RAZORPAY_MODE=test`, `RAZORPAY_KEY_ID` (`rzp_test_...`), and `RAZORPAY_KEY_SECRET` in `.env.local`. Add `RAZORPAY_WEBHOOK_SECRET`, configure a Razorpay webhook to `https://your-domain/api/razorpay/webhook`, and subscribe to the `payment.captured` event. Enable automatic payment capture in Razorpay. For local testing, the webhook endpoint must be reachable through a public HTTPS URL or tunnel. Use the same webhook secret in the Razorpay Dashboard and server environment. Restart the app after changing environment variables. Never expose the service-role key or Razorpay secret in a `NEXT_PUBLIC_` variable.
12. Enable the `pg_cron` extension in Supabase if needed, then schedule this job in Supabase SQL Editor. Pending Razorpay orders older than 30 minutes are cancelled and their reserved stock is restored. If a late captured payment arrives after expiry, the webhook sets the order payment status to `REFUND_REQUIRED`; check the admin order details and refund it in Razorpay.

   ```sql
   select cron.schedule(
     'expire-pending-razorpay-orders',
     '*/15 * * * *',
     'select public.expire_pending_razorpay_orders();'
   );
   ```

Without Supabase credentials, the storefront uses a clearly marked preview catalog. This lets you work on the design before connecting live products.

## Current functionality

- Responsive fragrance storefront, product detail pages, search, and category filters
- Guest cart and wishlist saved in the current browser
- Supabase product/catalog/settings reads, including categories, gallery images, normalized features, and fragrance notes
- Admin product editor supports up to 8 gallery images per product, via drag-and-drop/file upload to Supabase Storage or HTTPS image URLs; reorder images to choose the primary image
- Supabase Auth signup, sign in, email confirmation callback, sign out, and password reset
- Protected customer account and order history
- Customer account page for saving name, phone, and a default delivery address; saved details prefill checkout
- Authenticated checkout with cash on delivery or Razorpay; the database recalculates prices and shipping, locks and decrements stock atomically, and saves order-item price snapshots
- Razorpay payments default to test mode; signed checkout responses are verified against Razorpay’s server API and captured-payment webhooks before an order is marked paid
- Cancellation trigger restores inventory when an order changes to `Cancelled`
- Admin dashboard with role-checked product creation/editing, order status updates, audit logging, and storefront settings
- Customer order pages provide a print/save-as-PDF receipt; GST invoice details, rate, and inclusive/exclusive mode are managed in Admin → Store settings and snapshotted per order
- Admins can add an HTTPS courier tracking link to an order; customers see the tracking link on their order page and order history only after it is added
- Signed-in customers can submit help-desk reports and see their status and admin replies in their Help desk; admins can review, update, and reply from the admin help desk
- Customers can rate products from delivered orders with a single 1–5 star rating per purchased order item; no written reviews or replies

Online checkout requires Razorpay test/live API credentials, a configured `payment.captured` webhook, and the Supabase Cron expiry job. Test mode simulates payments and does not move real money. Before accepting real payments, complete Razorpay onboarding, switch to live credentials and `RAZORPAY_MODE=live`, configure the live webhook, and test the complete flow. Paid Razorpay orders cannot be cancelled in the admin UI until a refund workflow is implemented. Multiple customer addresses, coupons, and order notification emails still need to be implemented before launch.

For GST invoices, run migration `011_order_invoices.sql`, then enter your genuine registered business details, GSTIN, state, and applicable rate under Admin → Store settings. The default tax rate is 0% and prices default to tax-inclusive; tax-exclusive mode adds the configured product-subtotal tax to checkout totals. Verify your GST setup and treatment of shipping with your tax professional before issuing invoices.

If Razorpay is disabled or its credentials fail, use **Razorpay setup check** on checkout. It reports missing variable names, validates the Razorpay key pair with a non-payment API request, and checks the Supabase server key/database functions. It never displays secret values. The webhook secret can only be checked for presence; confirm it matches the value saved in Razorpay Dashboard.

## Security notes

- Supabase service-role and Razorpay secret keys remain server-only; the Razorpay public key ID is passed to checkout.
- Checkout requires an authenticated Supabase user.
- Prices, shipping, and stock are read and applied inside the database checkout function; the browser submits only product IDs and quantities.
- Apply the checkout migration before enabling orders. It adds the customer-owned RLS policies required to view private orders and profiles.
