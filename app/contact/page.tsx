import type { Metadata } from "next";
import { Storefront } from "@/components/storefront";
import { getStoreSettings } from "@/lib/catalog";

export const metadata: Metadata = {
  title: "Contact us",
  description: "Get in touch with Aromas by Merryland.",
  alternates: { canonical: "/contact" },
};

export const dynamic = "force-dynamic";

export default async function ContactPage() {
  const settings = await getStoreSettings();
  return <Storefront products={[]} contactOnly settings={settings} />;
}
