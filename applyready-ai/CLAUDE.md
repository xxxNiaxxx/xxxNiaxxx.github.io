# ApplyReady AI — Claude Code Project Instructions

You are the implementation agent for this repository. Take the project from the current prototype to a working, tested, deployable MVP. Work in small steps, inspect the existing code before changing it, run checks, fix failures, and keep documentation current.

## Product goal

Build a privacy-conscious, multilingual AI CV tailoring web app called **ApplyReady AI** using Next.js App Router and TypeScript, deployed to Vercel from GitHub.

Core user flow:
1. User selects UI/output language: English, Greek, Spanish, French, or German.
2. User pastes CV text and a job advertisement.
3. User chooses one of three free themes: Classic, Modern, Minimal.
4. App generates a tailored CV, cover letter, and a short skills-gap / verification list.
5. User can request multiple edits to the generated result.
6. User can export the final result as PDF and DOCX.
7. Later, users can purchase premium themes via Stripe Checkout. Premium theme fulfillment must be securely verified server-side.

The initial product should work without accounts. Do not add authentication unless needed for secure purchase fulfillment; if purchase entitlement cannot be implemented safely without accounts, explain that and implement a clearly documented safe staged approach rather than pretending purchases unlock correctly.

## Current product requirements

- Stack: Next.js App Router, TypeScript, React, deployed to Vercel.
- Source control: GitHub.
- AI development: Ollama on the developer's local machine using its OpenAI-compatible API.
- Online AI: configurable OpenAI-compatible provider via server-only environment variables. Do not hard-code a vendor. Never expose API keys to the browser.
- Languages: `en`, `el`, `es`, `fr`, `de`.
- Free themes: `classic`, `modern`, `minimal`.
- User can request multiple revisions; do not silently overwrite the only copy of a previous result.
- PDF and real DOCX exports are required. Browser print-to-PDF alone does not satisfy PDF export; implement a proper download if practical.
- Stripe Checkout for one-time premium theme purchases, webhook signature verification, idempotent purchase fulfillment, and server-side entitlements before accepting real payments.
- No credit card required for free use.
- Avoid collecting/storing CV data unless essential. If persistence is added, specify retention and deletion behavior and minimize stored data.
- Keep AI prompts and logs free of full CV text. Do not log CVs, job ads, API keys, payment details, or other sensitive content.
- Do not invent user skills, experience, credentials, achievements, employers, dates, or qualifications. Put unsupported requirements into a “skills to address / verify” section.
- Validate all untrusted inputs on the server. Handle prompt injection in job ads/CV content as data, not instructions.
- Add useful loading, error, empty, and success states; mobile responsive layout; accessible labels and keyboard navigation.
- Add tests for important logic and routes.

## Important implementation and compliance constraints

1. **Do not claim the app is deployed or that external services are configured unless you actually verified that.**
2. Never deploy to production, create paid resources, change billing settings, or accept real payments without explicit user approval.
3. Do not ask the user to paste API secrets into chat. Explain how to set secrets locally or in Vercel Environment Variables.
4. For European Economic Area users, do not base the production service on a provider's free API tier unless current terms explicitly permit this exact use case. Verify current provider terms and privacy/data processing terms before recommending a provider. The user's website may be free while the app owner pays API usage.
5. Ollama's `localhost` endpoint works only where Ollama is running. Vercel cannot reach the user's laptop's `localhost`. Keep local and production environment examples distinct.
6. The current in-memory rate limiter is not production-safe on serverless. Replace it with a shared durable limiter or clearly gate production launch until one is configured.
7. Do not make premium checkout buttons appear functional if fulfillment is incomplete. Test mode is fine; real payments must remain disabled until entitlement, webhook, idempotency, refund/support behavior, and price configuration are implemented.
8. Keep `.env*` files out of Git, except `.env.example`.
9. Use secure, minimal dependencies. Explain any dependency added and run a production build.
10. Keep the project deployable to Vercel. If a feature cannot be safely completed without credentials or an external account, implement the code/config scaffolding, document the exact manual step, and continue with everything else.

## Execution plan — complete in order

### Phase 1: Inspect and stabilize
- Inspect all existing files and identify build/type/lint issues.
- Ensure package dependencies are complete and mutually compatible.
- Run `npm install`, `npm run lint`, tests, and `npm run build`; fix failures.
- Keep README and `.env.example` accurate.
- Do not merely report errors; fix them.

### Phase 2: Core user flow
- Improve the landing page and form.
- Make the language selector correctly localize the UI; output language should be independently selectable if that is clearer.
- Implement the three themes so they visibly change the final CV rendering, not just a label.
- Implement AI generation and repeated revision requests with schema validation.
- Preserve prior result in client state during revisions and prevent fabricated facts.
- Add robust errors and timeout handling.
- Add request size limits and safe parsing.

### Phase 3: Export
- Implement a real downloadable PDF export with correct Unicode/font support for Greek, accented Latin characters, and German characters.
- Implement a real downloadable DOCX export.
- Make exports reflect the selected theme and the final CV. Provide separate cover letter export if sensible.
- Ensure filenames are safe and do not contain raw user input.
- Test Greek characters in both formats.

### Phase 4: AI providers
- Keep Ollama as local dev option.
- Support one configurable production OpenAI-compatible API via environment variables.
- Make configuration errors user-friendly without revealing secrets.
- Add token/output limits if supported.
- Document how to choose and configure a compliant paid production provider.
- Never put provider credentials in client-side variables.

### Phase 5: Abuse, privacy, and security
- Replace in-memory rate limiting with a durable shared mechanism suitable for Vercel, or use a well-supported integration that can be configured by the owner.
- Add a per-IP and global budget guard, input length limits, request timeout, and duplicate-request protection where practical.
- Do not store CVs by default. Avoid server logs containing user text.
- Add a plain-language privacy notice and clear warning not to submit unnecessary sensitive personal data.
- Document what goes to the AI provider and how users can delete data (if any is persisted).
- Add appropriate security headers and review dependencies.
- Do not overstate GDPR compliance; document remaining legal review needs.

### Phase 6: Stripe (test mode first)
- Keep premium themes purchasable only through a server-created Checkout Session using fixed server-side Stripe Price IDs.
- Verify webhook signatures using the raw request body.
- Add idempotent event processing and durable purchase/entitlement records.
- Never trust success redirect or client-submitted purchase state.
- Add tests for invalid signature, duplicate event, unknown theme, failed/cancelled checkout.
- If no account exists, propose a secure purchase recovery approach (e.g. email-based magic link) before storing a purchase or unlocking a theme. Do not unlock premium themes using only a query parameter.
- Use Stripe test mode by default. Real payment mode must require owner-controlled environment configuration and explicit owner approval.

### Phase 7: Verification and deployment preparation
- Add a `.env.example` with placeholders only.
- Provide a concise `DEPLOYMENT.md` with exact GitHub and Vercel steps.
- Verify the production build locally.
- Run tests and report exact commands/results.
- Check the final git diff and remove accidental secrets/build artifacts.
- Do not perform an irreversible action. Deployment itself should be prepared but wait for the owner to confirm before production deployment or paid-service activation.

## Definition of done

The MVP is ready for owner review when:
- `npm install` succeeds.
- lint/type checks and tests pass.
- `npm run build` succeeds.
- User can generate and revise a CV with a configured AI provider.
- The UI supports all five languages.
- All three free themes render differently.
- PDF and DOCX downloads work with Greek characters.
- No full CV or job-ad text appears in server logs.
- Rate limiting is suitable for the documented deployment stage.
- Stripe test-mode flow is correctly verified, or explicitly disabled with a precise list of missing setup items.
- README and deployment guide are accurate.
- Final report clearly distinguishes implemented, tested, and still-manual steps.

## How to work

- Start by summarizing the repo and identifying concrete issues.
- Then edit the code directly; do not stop after producing a plan.
- Prefer focused commits or clearly separated changes if git is available.
- If you discover a product decision that can be safely defaulted, choose a sensible default and document it rather than blocking.
- Ask the owner only for information or approval that cannot be inferred, such as credentials, choosing a paid AI vendor, or production deployment approval.
- At the end, report changed files, test results, manual steps, and risks. Never claim tests passed unless you ran them.
