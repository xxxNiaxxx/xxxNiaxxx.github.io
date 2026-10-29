# Deployment (GitHub → Vercel)

Nothing here has been done for you. Each step uses the owner's own accounts, and production deployment or any paid service needs the owner's explicit decision.

The app lives in the `applyready-ai/` folder of the `xxxNiaxxx/xxxNiaxxx.github.io` repository. Vercel supports this through the project's **Root Directory** setting.

## 1. Before you start

```bash
cd applyready-ai
npm ci
npm run check && npm run build
```

All of these must pass.

## 2. Accounts you need

| Service | Why | Cost |
|---|---|---|
| GitHub | Source (already used) | Free |
| Vercel | Hosting | Hobby is free for personal/non-commercial use; a commercial site needs Pro. Check the current terms. |
| AI provider with an OpenAI-compatible API | Generation | Pay per use. Choose per [PRIVACY.md](PRIVACY.md#the-ai-provider-is-the-main-processor). |
| Upstash Redis | Shared rate limits (and Stripe records) | Has a free tier; add it from Vercel → Storage → Marketplace |
| Stripe | Only if premium themes are enabled | Test mode is free |

## 3. Create the Vercel project

1. https://vercel.com/new → import `xxxNiaxxx/xxxNiaxxx.github.io`.
2. **Root Directory:** `applyready-ai`. Framework: Next.js (auto-detected). Leave the build and install commands at their defaults.
3. Before the first deploy, add the environment variables below. Otherwise the site loads but generation answers "not set up yet", which is the intended safe failure.

## 4. Environment variables (Vercel → Project → Settings → Environment Variables)

Required for generation:

| Name | Value |
|---|---|
| `AI_PROVIDER` | A label, e.g. the provider's name |
| `AI_BASE_URL` | The provider's OpenAI-compatible base URL, ending in `/v1` (never `localhost`: the app refuses it on Vercel) |
| `AI_API_KEY` | The provider's secret key: mark it **Sensitive** |
| `AI_MODEL` | The model id |
| `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` | From Upstash. The Vercel integration adds `KV_REST_API_URL`/`KV_REST_API_TOKEN` automatically; either pair works. |
| `RATE_LIMIT_SALT` | Any long random string |
| `NEXT_PUBLIC_APP_URL` | Your deployed origin, e.g. `https://applyready.example.com` |

Optional: `AI_VISION_MODEL`, a vision-capable model id on the same provider, turns on screenshot import (`MAX_IMAGE_READS_PER_IP_PER_DAY`, default 20). CV file import (PDF/DOCX/TXT) needs no setup.

Recommended: `MAX_GENERATIONS_PER_IP_PER_DAY` (default 10), `MAX_GENERATIONS_GLOBAL_PER_DAY` (default 300; set it from your AI budget), `AI_MAX_OUTPUT_TOKENS` (default 3000), `NEXT_PUBLIC_SUPPORT_CONTACT`.

Redeploy after changing variables. Never put secrets in `NEXT_PUBLIC_*` variables, and never paste them into chats or commits.

## 5. Preview first

Every push creates a preview deployment. Test it with **fictional** CVs:

- [ ] English and Greek generation; one revision; switch versions
- [ ] All three free themes; PDF and DOCX for both the CV and the letter; open them in Word/LibreOffice and a PDF viewer; check the Greek and accented characters
- [ ] Import a PDF and a Word CV; add a screenshot of a job ad (if `AI_VISION_MODEL` is set)
- [ ] Spanish, French and German output
- [ ] Go past the per-IP limit → the "today's limit" message
- [ ] Vercel → Logs: only short JSON event lines, no CV text
- [ ] The privacy notice names your AI provider (edit `privacy` in `src/lib/i18n.ts`)

## 6. Production

Only after the owner approves: promote the preview, or deploy `main`, and attach a custom domain.

## 7. Premium themes (optional, Stripe TEST mode)

1. Stripe Dashboard (test mode) → create two products with one-time prices → copy the `price_…` ids.
2. Developers → Webhooks → add the endpoint `https://YOUR-DOMAIN/api/stripe/webhook` with the events `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed`, `checkout.session.expired` and `charge.refunded`. Copy the signing secret.
3. Set `STRIPE_SECRET_KEY` (sk_test_…), `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_EXECUTIVE`, `STRIPE_PRICE_CREATIVE`, `ENTITLEMENT_SECRET` (32+ random chars) and `PREMIUM_THEMES_ENABLED=true`. Redeploy.
4. Buy with test card `4242 4242 4242 4242`. The theme should unlock after the redirect. Refund it in the Dashboard: the premium export should then be refused.
5. Locally: `stripe listen --forward-to localhost:3000/api/stripe/webhook`, and use the secret it prints.

**Live payments stay off** until the owner has implemented or approved purchase recovery (see README → Premium themes), published refund terms and a support contact, and then set `STRIPE_LIVE_MODE_APPROVED=true` with live keys.
