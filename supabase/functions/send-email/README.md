# send-email — Supabase Auth "Send Email" hook

Renders **branded** HTML for every auth email (confirm signup, reset password,
magic link, invite, email change, reauthentication) and sends it via Resend.
Replaces the bare Supabase default templates. Link behaviour is unchanged — it
rebuilds the same `${SUPABASE_URL}/auth/v1/verify?...` URL Supabase uses today.

## Secrets (function env)

| Secret | Value |
| --- | --- |
| `RESEND_API_KEY` | Resend API key (sends from `noreply@simupro.io`) |
| `SEND_EMAIL_HOOK_SECRET` | Hook signing secret, format `v1,whsec_<base64>` |

`SUPABASE_URL` is injected automatically.

## Deploy

```bash
supabase functions deploy send-email --no-verify-jwt --project-ref ectvwzaudqazfymcmqcf
supabase secrets set RESEND_API_KEY=... SEND_EMAIL_HOOK_SECRET=v1,whsec_...
```

`--no-verify-jwt` is required: Supabase calls this as a signed webhook, not with
a user JWT. The Standard Webhooks signature is what authenticates the request.

## Enable the hook (dashboard)

Authentication → Hooks → **Send Email** → enable, pointing at:

```
https://ectvwzaudqazfymcmqcf.supabase.co/functions/v1/send-email
```

Use the **same** signing secret you set as `SEND_EMAIL_HOOK_SECRET`.

## ⚠️ Rollback

If auth emails stop arriving, **disable the Send Email hook in the dashboard** —
Supabase immediately reverts to its built-in templates. Always test a real
signup + password reset right after enabling.
