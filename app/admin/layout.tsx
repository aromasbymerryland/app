import type { Metadata } from "next";
import Link from "next/link";
import { signOutAction } from "@/app/auth/actions";
import { requireAdmin } from "@/lib/auth/admin";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

const navigation = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/products", label: "Products" },
  { href: "/admin/orders", label: "Orders" },
  { href: "/admin/support", label: "Help desk" },
  { href: "/admin/settings", label: "Store settings" },
];

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const { profile } = await requireAdmin();
  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <Link href="/" className="wordmark"><span className="wordmark-main">AROMAS</span><span className="wordmark-sub">BY MERRYLAND</span></Link>
        <span className="admin-sidebar-label">THE BACK OFFICE</span>
        <nav aria-label="Admin navigation">
          {navigation.map((item) => <Link href={item.href} key={item.href}>{item.label}<span>→</span></Link>)}
        </nav>
        <div className="admin-sidebar-bottom">
          <span>{profile?.full_name || "Store administrator"}</span>
          <form action={signOutAction}><button type="submit">Sign out</button></form>
        </div>
      </aside>
      <main className="admin-content">{children}</main>
    </div>
  );
}
