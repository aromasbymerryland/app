import "server-only";

export type RazorpaySetupIssue = {
  setting: string;
  message: string;
};

export function getRazorpaySetupIssues(): RazorpaySetupIssue[] {
  const issues: RazorpaySetupIssue[] = [];
  const mode = process.env.RAZORPAY_MODE ?? "test";
  const keyId = process.env.RAZORPAY_KEY_ID;

  if (!["test", "live"].includes(mode)) {
    issues.push({ setting: "RAZORPAY_MODE", message: "Set this to exactly test or live." });
  }
  if (!keyId) {
    issues.push({ setting: "RAZORPAY_KEY_ID", message: "This environment variable is missing." });
  } else if (["test", "live"].includes(mode) && !keyId.startsWith(mode === "live" ? "rzp_live_" : "rzp_test_")) {
    issues.push({
      setting: "RAZORPAY_KEY_ID",
      message: `The key ID prefix does not match RAZORPAY_MODE=${mode}.`,
    });
  }
  if (!process.env.RAZORPAY_KEY_SECRET) {
    issues.push({ setting: "RAZORPAY_KEY_SECRET", message: "This environment variable is missing." });
  }
  if (!process.env.RAZORPAY_WEBHOOK_SECRET) {
    issues.push({ setting: "RAZORPAY_WEBHOOK_SECRET", message: "This environment variable is missing." });
  }
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    issues.push({ setting: "SUPABASE_SERVICE_ROLE_KEY", message: "This server-only environment variable is missing." });
  }
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    issues.push({ setting: "NEXT_PUBLIC_SUPABASE_URL", message: "This environment variable is missing." });
  }

  return issues;
}

export function getRazorpayConfiguration() {
  const mode = process.env.RAZORPAY_MODE ?? "test";
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (getRazorpaySetupIssues().length || !keyId || !keySecret || !webhookSecret) return null;
  return { mode, keyId, keySecret, webhookSecret };
}
