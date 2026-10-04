import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) {
    console.error("Auth callback cannot run because Supabase is not configured.");
    return NextResponse.redirect(new URL("/login?error=auth-callback", request.url));
  }

  const code = request.nextUrl.searchParams.get("code");
  const tokenHash = request.nextUrl.searchParams.get("token_hash");
  const otpType = request.nextUrl.searchParams.get("type");
  const requestedPath = request.nextUrl.searchParams.get("next");
  const safePath = requestedPath === "/reset-password"
    ? "/reset-password"
    : requestedPath === "/account"
      ? "/account"
      : "/";
  const response = NextResponse.redirect(new URL("/", request.url));
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookies) {
        for (const { name, value, options } of cookies) {
          request.cookies.set(name, value);
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  let callbackError: { message: string; code?: string } | null = null;
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    callbackError = error;
  } else if (tokenHash && otpType === "recovery") {
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: "recovery" });
    callbackError = error;
  } else {
    callbackError = { message: "The auth callback did not include a supported verification token." };
  }

  if (!callbackError) {
    const { data, error } = await supabase.auth.getUser();
    if (!error && data.user) {
      response.headers.set("location", new URL(safePath, request.url).toString());
      return response;
    }
    callbackError = error ?? { message: "The auth callback did not establish a user session." };
  }

  console.error("Auth callback verification failed", {
    code: callbackError.code,
    message: callbackError.message,
  });
  const failurePath = safePath === "/reset-password" ? "/forgot-password?error=auth-callback" : "/login?error=auth-callback";
  response.headers.set("location", new URL(failurePath, request.url).toString());
  return response;
}
