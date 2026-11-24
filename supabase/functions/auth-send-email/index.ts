import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const RESEND_FROM_DOMAIN = Deno.env.get("RESEND_FROM_DOMAIN") || "h2haigroup.com";
const SUPABASE_PROJECT_REF = "yiiptvateqtjcoqtsmot";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (!RESEND_API_KEY) {
    return new Response(
      JSON.stringify({ error: "RESEND_API_KEY not configured" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  try {
    const payload = await req.json();

    const emailData = payload.email_data || {};
    const user = payload.user || {};

    const tokenHash = emailData.token_hash;
    const redirectTo = emailData.redirect_to || "";
    const emailActionType = emailData.email_action_type || "magiclink";
    const toEmail = user.email;
    const userName =
      user.user_metadata?.full_name ||
      user.user_metadata?.name ||
      toEmail?.split("@")[0] ||
      "H2H Member";

    if (!tokenHash || !toEmail) {
      return new Response(
        JSON.stringify({ error: "Missing token_hash or email" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const magicLinkUrl = `https://${SUPABASE_PROJECT_REF}.supabase.co/auth/v1/verify?token_hash=${encodeURIComponent(tokenHash)}&type=${encodeURIComponent(emailActionType)}&redirect_to=${encodeURIComponent(redirectTo)}`;

    const fromEmail = `H2H AI Group <noreply@${RESEND_FROM_DOMAIN}>`;

    let subject = "";
    let html = "";
    let ctaText = "";

    switch (emailActionType) {
      case "signup":
        subject = "Welcome to H2H AI Group — Sign In";
        ctaText = "Complete Registration";
        html = buildMagicLinkEmail(userName, magicLinkUrl, ctaText, "Welcome to H2H AI Group", "Thanks for joining! Click the button below to sign in and complete your registration.");
        break;

      case "magiclink":
        subject = "Sign In to H2H AI Group";
        ctaText = "Sign In to H2H";
        html = buildMagicLinkEmail(userName, magicLinkUrl, ctaText, "Sign In to H2H AI Group", "Click the button below to securely sign in to your H2H account. No password needed.");
        break;

      case "recovery":
        subject = "Reset Your H2H Password";
        ctaText = "Reset Password";
        html = buildMagicLinkEmail(userName, magicLinkUrl, ctaText, "Password Reset", "Click the button below to reset your H2H password. If you did not request this, you can safely ignore this email.");
        break;

      case "email_change":
        subject = "Confirm Your New H2H Email";
        ctaText = "Confirm Email";
        html = buildMagicLinkEmail(userName, magicLinkUrl, ctaText, "Email Change Confirmation", "Click the button below to confirm your new email address for your H2H account.");
        break;

      default:
        subject = "Sign In to H2H AI Group";
        ctaText = "Sign In to H2H";
        html = buildMagicLinkEmail(userName, magicLinkUrl, ctaText, "H2H AI Group", "Click the button below to securely sign in to your H2H account.");
    }

    const resendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [toEmail],
        subject,
        html,
      }),
    });

    if (!resendRes.ok) {
      const errorText = await resendRes.text();
      console.error("Resend API error:", errorText);
      return new Response(
        JSON.stringify({ error: "Failed to send email", detail: errorText }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Auth email hook error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});

function buildMagicLinkEmail(
  userName: string,
  magicLinkUrl: string,
  ctaText: string,
  heading: string,
  subtitle: string
): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 32px 24px; color: #1a1a1a; line-height: 1.7; background-color: #fefdfb;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 16px; overflow: hidden;">
    <tr>
      <td style="padding: 40px 32px 32px; text-align: center;">
        <h1 style="font-size: 22px; font-weight: 700; color: #c78d38; margin: 0 0 8px; letter-spacing: -0.3px;">${heading}</h1>
        <p style="font-size: 14px; color: #666; margin: 0;">${subtitle}</p>
      </td>
    </tr>
    <tr>
      <td style="padding: 0 32px 12px;">
        <p style="font-size: 14px; color: #333; margin: 0;">Hi ${userName},</p>
      </td>
    </tr>
    <tr>
      <td style="padding: 20px 32px 32px; text-align: center;">
        <a href="${magicLinkUrl}" style="display: inline-block; background-color: #c78d38; color: #ffffff; text-decoration: none; padding: 14px 48px; border-radius: 10px; font-size: 16px; font-weight: 600; letter-spacing: 0.2px;" target="_blank">
          ${ctaText}
        </a>
        <p style="font-size: 12px; color: #999; margin: 20px 0 0;">If the button doesn't work, copy and paste this link into your browser:</p>
        <p style="font-size: 11px; color: #bbb; margin: 6px 0 0; word-break: break-all;">
          <a href="${magicLinkUrl}" style="color: #bbb; text-decoration: underline;" target="_blank">${magicLinkUrl}</a>
        </p>
        <p style="font-size: 12px; color: #999; margin: 24px 0 0;">This link expires in 10 minutes.</p>
      </td>
    </tr>
    <tr>
      <td style="padding: 0 32px 32px; border-top: 1px solid #f0ebe0;">
        <p style="font-size: 11px; color: #bbb; text-align: center; margin: 20px 0 0;">
          H2H AI Group &middot;
          <a href="https://h2haigroup.com" style="color: #c78d38; text-decoration: none;" target="_blank">h2haigroup.com</a>
        </p>
      </td>
    </tr>
  </table>
</body>
</html>`;
}