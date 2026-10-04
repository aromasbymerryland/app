const productionSiteUrl = "https://merryland-sandy.vercel.app";

export function getSiteUrl() {
  const configuredUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  const parsedUrl = new URL(configuredUrl || productionSiteUrl);

  if (!["http:", "https:"].includes(parsedUrl.protocol)) {
    throw new Error("NEXT_PUBLIC_SITE_URL must use http or https.");
  }

  if (process.env.VERCEL_ENV === "production") {
    if (parsedUrl.hostname === "localhost" || parsedUrl.hostname.startsWith("127.")) {
      throw new Error("NEXT_PUBLIC_SITE_URL must not point to localhost in Vercel Production.");
    }
    if (parsedUrl.protocol !== "https:") {
      throw new Error("NEXT_PUBLIC_SITE_URL must use https in Vercel Production.");
    }
  }

  return parsedUrl.origin;
}

export function getAuthCallbackUrl(next: "/account" | "/reset-password") {
  const callbackUrl = new URL("/auth/callback", getSiteUrl());
  callbackUrl.searchParams.set("next", next);
  return callbackUrl.toString();
}
