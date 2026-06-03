// Supabase "Send Email" auth hook.
//
// Renders branded HTML for every auth email (confirm signup, reset password,
// magic link, invite, email change, reauthentication) and sends it via Resend.
//
// It reproduces the exact verify URL Supabase would otherwise generate
// (`${SUPABASE_URL}/auth/v1/verify?token=…&type=…&redirect_to=…`), so link
// behaviour is identical to the previous default templates — only the styling
// changes.
//
// Required function secrets (supabase secrets set …):
//   RESEND_API_KEY          — Resend API key (sends from noreply@simupro.io)
//   SEND_EMAIL_HOOK_SECRET  — the hook signing secret from the Supabase
//                             dashboard, format "v1,whsec_<base64>"
// SUPABASE_URL is injected automatically.

import { Webhook } from "https://esm.sh/standardwebhooks@1.0.0";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
const HOOK_SECRET = (Deno.env.get("SEND_EMAIL_HOOK_SECRET") ?? "").replace(/^v1,whsec_/, "");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const FROM = "SimuPro <noreply@simupro.io>";
const LOGO = "https://www.simupro.io/brand/ems-simupro-logo.png";

type ActionCopy = {
  subject: string;
  heading: string;
  intro: string;
  cta: string;
};

// Per-action subject + copy. Anything unmapped falls back to a generic confirm.
function copyFor(action: string): ActionCopy {
  switch (action) {
    case "signup":
      return {
        subject: "Confirm your SimuPro account",
        heading: "Confirm your email",
        intro:
          "Thanks for signing up for SimuPro. Confirm your email address to activate your account and run your first scenario.",
        cta: "Confirm my email",
      };
    case "recovery":
      return {
        subject: "Reset your SimuPro password",
        heading: "Reset your password",
        intro:
          "We received a request to reset your SimuPro password. Click below to choose a new one. If you didn't request this, you can safely ignore this email.",
        cta: "Reset my password",
      };
    case "magiclink":
      return {
        subject: "Your SimuPro sign-in link",
        heading: "Sign in to SimuPro",
        intro: "Click below to sign in to your account. This link works once and expires shortly.",
        cta: "Sign in",
      };
    case "invite":
      return {
        subject: "You're invited to SimuPro",
        heading: "You've been invited",
        intro: "You've been invited to SimuPro. Click below to accept the invite and set up your account.",
        cta: "Accept invite",
      };
    case "email_change":
    case "email_change_new":
    case "email_change_current":
      return {
        subject: "Confirm your new SimuPro email",
        heading: "Confirm your email change",
        intro: "Confirm this address to finish updating the email on your SimuPro account.",
        cta: "Confirm email change",
      };
    default:
      return {
        subject: "Confirm your SimuPro request",
        heading: "Confirm to continue",
        intro: "Click below to confirm this request on your SimuPro account.",
        cta: "Confirm",
      };
  }
}

const esc = (s: string) =>
  String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// Shared branded shell. `inner` is the action-specific block (button or code).
function shell(heading: string, intro: string, inner: string, preheader: string): string {
  return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><meta name="color-scheme" content="dark"><title>${esc(heading)}</title></head>
<body style="margin:0; padding:0; background-color:#04102b; -webkit-text-size-adjust:100%;">
<div style="display:none; max-height:0; overflow:hidden; opacity:0; color:#04102b; font-size:1px; line-height:1px;">${esc(preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#04102b;"><tr><td align="center" style="padding:36px 16px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:600px; max-width:600px; background-color:#061732; border:1px solid #142554; border-radius:14px; overflow:hidden;">
<tr><td align="center" style="padding:36px 40px 8px 40px;"><img src="${LOGO}" width="150" alt="SimuPro" style="display:block; width:150px; max-width:150px; height:auto; border:0;"></td></tr>
<tr><td style="padding:16px 44px 0 44px; font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
<h1 style="margin:0 0 6px 0; color:#ffffff; font-size:25px; line-height:1.25; font-weight:700;">${esc(heading)}</h1>
<p style="margin:0 0 22px 0; color:#b8c4e0; font-size:15px; line-height:1.6;">${esc(intro)}</p>
${inner}
</td></tr>
<tr><td style="padding:22px 44px; background-color:#040d22; border-top:1px solid #142554; font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
<p style="margin:0; color:#5a6a93; font-size:12px; line-height:1.6;">SimuPro · AI-powered EMS simulation training · <a href="https://www.simupro.io" style="color:#8fdcf6; text-decoration:none;">simupro.io</a></p></td></tr>
</table></td></tr></table></body></html>`;
}

function buttonBlock(url: string, label: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 10px 0;"><tr><td align="center" bgcolor="#16d1ff" style="border-radius:9px;">
<a href="${url}" style="display:inline-block; padding:13px 30px; font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif; font-size:15px; font-weight:700; color:#04102b; text-decoration:none; border-radius:9px;">${esc(label)} →</a></td></tr></table>
<p style="margin:0 0 26px 0; color:#5a6a93; font-size:12.5px; line-height:1.5; word-break:break-all;">Or paste this link into your browser:<br><a href="${url}" style="color:#8fdcf6; text-decoration:none;">${esc(url)}</a></p>`;
}

function codeBlock(token: string): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 22px 0;"><tr><td align="center" style="padding:16px; background-color:#04102b; border:1px dashed #2b3f74; border-radius:10px;">
<span style="font-family:'Courier New',Courier,monospace; font-size:26px; font-weight:700; color:#8fdcf6; letter-spacing:6px;">${esc(token)}</span></td></tr></table>`;
}

Deno.serve(async (req) => {
  if (!RESEND_API_KEY || !HOOK_SECRET) {
    return new Response(JSON.stringify({ error: { http_code: 500, message: "Email hook not configured" } }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  const payload = await req.text();
  const headers = Object.fromEntries(req.headers);

  let data: {
    user: { email: string };
    email_data: {
      token: string;
      token_hash: string;
      redirect_to: string;
      email_action_type: string;
    };
  };
  try {
    data = new Webhook(HOOK_SECRET).verify(payload, headers) as typeof data;
  } catch (_e) {
    return new Response(JSON.stringify({ error: { http_code: 401, message: "Invalid signature" } }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { user, email_data } = data;
  const { token, token_hash, redirect_to, email_action_type } = email_data;
  const c = copyFor(email_action_type);

  // Reauthentication is a code, not a link.
  let inner: string;
  let text: string;
  if (email_action_type === "reauthentication") {
    c.subject = "Your SimuPro verification code";
    c.heading = "Your verification code";
    c.intro = "Enter this code to verify it's you. It expires shortly.";
    inner = codeBlock(token);
    text = `${c.heading}\n\n${c.intro}\n\n${token}\n\n— SimuPro · simupro.io`;
  } else {
    const url = `${SUPABASE_URL}/auth/v1/verify?token=${token_hash}&type=${email_action_type}&redirect_to=${encodeURIComponent(redirect_to)}`;
    inner = buttonBlock(url, c.cta);
    text = `${c.heading}\n\n${c.intro}\n\n${c.cta}: ${url}\n\n— SimuPro · simupro.io`;
  }

  const html = shell(c.heading, c.intro, inner, c.intro);

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: FROM, to: [user.email], subject: c.subject, html, text }),
  });

  if (!res.ok) {
    const detail = await res.text();
    return new Response(JSON.stringify({ error: { http_code: 502, message: `Resend send failed: ${detail.slice(0, 200)}` } }), {
      status: 502,
      headers: { "Content-Type": "application/json" },
    });
  }

  return new Response("{}", { status: 200, headers: { "Content-Type": "application/json" } });
});
