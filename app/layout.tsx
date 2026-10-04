import type { Metadata } from "next";
import "./globals.css";
import { getSiteUrl } from "@/lib/site-url";

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: {
    default: "Aromas by Merryland | Fragrance for the feeling",
    template: "%s | Aromas by Merryland",
  },
  description:
    "Thoughtful fragrance for the little moments that make a place feel like yours. Discover home, car and ritual scents, made in India.",
  keywords: ["home fragrance", "reed diffuser", "car fragrance", "dhoop", "Aromas by Merryland"],
  openGraph: {
    type: "website",
    siteName: "Aromas by Merryland",
    title: "Aromas by Merryland | Fragrance for the feeling",
    description: "Fragrance for the little moments that make a place feel like yours.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Aromas by Merryland | Fragrance for the feeling",
    description: "Fragrance for the little moments that make a place feel like yours.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1, "max-video-preview": -1 },
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return <html lang="en"><body>{children}</body></html>;
}
