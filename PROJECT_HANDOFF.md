# Aromas by Merryland — Project Handoff

This document is the working guide for a future developer or AI continuing this project. Read it together with `AGENTS.md`, `README.md`, and the current Git status. Treat the source and the actual Supabase/Vercel dashboards as authoritative if this document and the live setup differ.

## 1. What this project is

A responsive fragrance storefront for Aromas by Merryland. Customers browse a catalog, save a guest cart and wishlist in their browser, create an account, check out using Cash on Delivery or Razorpay, and see their orders and support requests. Store staff use an admin area to maintain products, orders, support replies, and settings.

This is a Next.js App Router application using Next.js 16.3.6, React 19, TypeScript, Supabase Auth/Postgres/Storage, and Razorpay. It deploys to Vercel. The production URL configured during development is `https://merryland-sandy.vercel.app`; verify the current domain before changing it.

## 2. Where to look

| Area | Main files |
| --- | --- |
| Storefront and product display | `components/storefront.tsx`, `app/page.tsx`, `app/shop/`, `app/globals.css` |
| Catalog reads and preview data | `lib/catalog.ts` |
| Supabase browser/server/admin clients | `lib/supabase/`, `lib/auth/` |
| Signup, sign-in, reset, callback | `app/auth/actions.ts`, `app/auth/callback/route.ts`, `components/auth-form.tsx` |
| Customer details and order history | `app/account/`, `app/orders/[id]/page.tsx` |
| Checkout and order creation | `app/checkout/`, `components/checkout-form.tsx` |
| Razorpay | `lib/payments/razorpay-config.ts`, `app/api/razorpay/`, payment functions in migration 010 |
| Admin tools | `app/admin/` |
| Print/PDF order receipt and GST details | `components/order-invoice.tsx`, `components/print-invoice-button.tsx`, `app/admin/settings/`, migration 011 |
| Supabase schema and upgrades | `supabase/migrations/` |
| Destructive full app-data reset | `supabase/reset_public_app_data.sql` — never run unless the owner explicitly intends to erase app data |
| Project setup and basic feature list | `README.md`, `.env.example` |
| Site origin | `lib/site-url.ts` |

The homepage, product routes, contact route, and robots/sitemap use the shared site-origin helper. The homepage assets are in `public/`: `merryland-hero-warm.png` (hero), `merryland-ritual.webp` (ritual section above “Why choose us?”), and `merryland-auth.webp` (login, signup, forgot-password, and reset-password background). The previous original hero image `merryland-hero.png` is also present; check usage before removing it.

## 3. Implemented functionality

- Responsive storefront, product detail pages, search, and categories.
- Guest cart and wishlist stored in browser local storage.
- Supabase-backed catalog, categories, product images/galleries, fragrance notes, and store settings; a marked preview catalog is available without Supabase.
- Customer signup, sign-in, sign-out, account details, default address, order history, and password reset.
- Customer checkout requires authentication. COD and Razorpay are supported.
- Checkout prices, shipping, stock reservation, and order-item snapshots are calculated transactionally in Postgres, not trusted from the browser.
- Razorpay server-side payment verification and captured-payment webhook validation; unpaid pending orders are intended to expire after 30 minutes.
- Admin product/catalog, store settings, order status/tracking, support desk and audit log tools.
- Support tickets and admin replies are portal-only; email notifications are not implemented.
- Delivered-order item ratings (one 1–5 star rating for each purchased order item).
- Order-page receipt with browser Print / Save as PDF. GST data/rate/tax mode are configurable in Admin and snapshotted when each new order is inserted. GST defaults to 0%, and tax-inclusive pricing is the default.
- Public page metadata, canonical URLs, robots rules, and sitemap.

## 4. Database migrations and live-data caution

The migration files are ordered:

1. `000_initial_schema.sql`
2. `001_secure_checkout.sql`
3. `002_catalog_media.sql`
4. `003_admin_tools.sql`
5. `004_contact_details.sql`
6. `005_customer_profile_updates.sql`
7. `006_order_tracking.sql`
8. `007_support_tickets.sql`
9. `008_support_ticket_replies.sql`
10. `009_verified_product_ratings.sql`
11. `010_razorpay_checkout.sql`
12. `011_order_invoices.sql`
13. `012_update_store_contact_details.sql`

For a new database, apply in order as documented in `README.md`. For an existing database, inspect the actual schema and migration history first; do not blindly replay initial schema or reset data.

**Important existing-project note:** the owner previously ran migration 010 before later checkout-payment protections and expiry/refund handling were incorporated into its final source. Confirm that the live database has the latest `010_razorpay_checkout.sql` functions, not only the earlier version. Migration 011 is new and must be applied before deploying/using invoice page queries and Admin invoice fields. Verify in Supabase after applying; a successful Vercel build does not apply SQL.

Migration 012 updates the store's contact email (`Merryland.mathura@gmail.com`) and phone (`+91 9837349067`) defaults and the existing singleton settings row. Apply it to existing databases to set the currently requested contact details.

The initial schema may recreate profiles for existing Auth users as customers. If rebuilding from scratch, re-promote the intended admin only after migrations, using the SQL in `README.md`. Do not run `supabase/reset_public_app_data.sql` on a live store without explicit owner approval and a verified backup. It deletes app public tables/data, including orders/products.

## 5. Environment variables and external dashboards

Use Vercel Project Settings → Environment Variables for deployed environments; `.env.local` is local only. Redeploy after changing environment variables.

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_SITE_URL` | Canonical origin and auth email redirect origin. Vercel Production should be `https://merryland-sandy.vercel.app` or the owner's confirmed custom domain. Avoid setting localhost unless deliberately testing local auth emails. |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL. |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase public/publishable client key. |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only Supabase elevated key required for verified payment/webhook operations. Never use a `NEXT_PUBLIC_` prefix. |
| `RAZORPAY_MODE` | `test` or `live`; begin with `test`. |
| `RAZORPAY_KEY_ID` | Razorpay key matching the selected mode. |
| `RAZORPAY_KEY_SECRET` | Server-only Razorpay API secret. |
| `RAZORPAY_WEBHOOK_SECRET` | Server-only secret matching the configured Razorpay webhook. |

The owner previously pasted live-looking credentials into a conversation. Treat them as compromised: rotate the Supabase server key and Razorpay API/webhook secrets, update the environment in Vercel/local environments, and redeploy. Never copy credentials into this document, source control, logs, or browser-exposed environment variables.

In Supabase Auth → URL Configuration:

- Set Site URL to the actual production origin.
- Allow the exact callback URL `https://<production-host>/auth/callback`.
- For local testing, allow the callback URL for the actual local origin and port printed by the dev server.

Signup confirmation and password-reset redirects use `NEXT_PUBLIC_SITE_URL`, not the browser's local origin. Thus a local request may intentionally send a link to the configured production site. Supabase also needs to allow that destination. In Supabase Auth → Email Templates, confirmation and password-reset links must use `{{ .ConfirmationURL }}` so Supabase honors the explicit redirect passed by the app; a template hard-coding `{{ .SiteURL }}` can bypass it. After changing the origin or callback config, request a fresh email; old emails retain their old URL.

Configure the Razorpay webhook at `https://<production-host>/api/razorpay/webhook`, subscribe to `payment.captured`, and enable automatic capture. Use the matching test/live credentials and webhook secret for the environment.

## 6. Production operational setup

- Enable `pg_cron` and schedule `public.expire_pending_razorpay_orders()` at the cadence documented in `README.md`. Without the scheduled job, abandoned Razorpay orders may remain pending and reserve inventory.
- Confirm the site settings row exists and add real products through Admin.
- Test login/signup/reset on the deployed domain and check Supabase Auth/email logs.
- Run full test-mode Razorpay and COD orders. Verify payment state, stock decrement/restoration, webhook, customer order page, admin order actions, and failure/late-payment paths.
- Keep Razorpay in test mode until the full deployed flow passes. Move to live only after Razorpay onboarding and a deliberate live cutover.
- If using GST invoices, enter only genuine legal entity/address/GSTIN/state/rate details. Confirm tax treatment and shipping with a tax professional. Until configured, the page must remain a receipt, not be represented as a GST tax invoice.
- Set up backups, access control for admin accounts, and a routine to monitor failed payments, webhooks, orders, support tickets, and database errors.

## 7. Gaps / not yet complete

These are known limitations, not promises that they are already implemented:

- No full automated refund workflow. A late payment for a cancelled order can be flagged `REFUND_REQUIRED`; an admin must review and refund it manually in Razorpay.
- No order/shipping email notifications; support replies are portal-only.
- No coupon/discount checkout system and no multiple saved customer addresses.
- Legal/commercial readiness needs owner input: accurate shipping, cancellation, returns/refunds, privacy, terms, contact, and business information. The footer currently links some policy labels to homepage fragments; confirm or replace with real policy pages before public launch.
- GST implementation is a configurable single rate on the product subtotal. It does not split different product tax categories or include GST on shipping. Validate accounting/legal requirements before issuing invoices.
- No evidence in this repository that the live Supabase migrations, Vercel env, Razorpay webhook, SMTP, Cron, real catalog, domain, or DNS are currently configured correctly. Verify directly in the provider dashboards.
- `package.json` has lint/build scripts but no test script. Lint/build do not substitute for deployed checkout and email flow tests.

## 8. Validation and continuation instructions

Available checks:

```powershell
npm run lint
npm run build
git diff --check
```

The codebase has been passing lint and production builds during recent changes, but each new change still needs validation. No real Supabase reset, live payment, or production deployment should be performed without the owner's explicit instruction.

For the next AI/developer:

1. Read this file, `AGENTS.md`, and `README.md`.
2. Inspect `git status --short` and existing diffs before editing; preserve the owner's uncommitted changes.
3. Read the relevant installed Next.js guides under `node_modules/next/dist/docs/` before changing Next APIs or conventions.
4. Never ask the owner to paste secrets into chat. Ask them to configure/rotate them in the provider dashboard.
5. Distinguish source-code readiness from live-service readiness. Do not claim an external Supabase/Vercel/Razorpay setup is complete unless it has actually been verified.
