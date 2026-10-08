# Βραχυχρόνια.ai — mobile (Expo)

Mobile app for the web app in [`../property-manager`](../property-manager) —
everything the web app shows is also here:

* **Tabs:** Home (what needs attention today), Calendar, Tasks (complete/start/cancel,
  cleaning checklists, new task with common titles), AI (chat with Approve / Edit / Cancel).
* **More:** Reservations (search, filters, create/edit/cancel, free stays, tax & AADE
  declaration per stay, guest messages with translation), Properties (details, month
  figures, compliance checklist, create/edit, activate/deactivate), Guests, Financials
  (month summary, transactions, add income/expense), Tax & AADE (stay declarations,
  monthly ΤΑΚΚ/VAT filings, annual Ε2 estimate, compliance), AI knowledge, Team
  (members, roles, invitation links via the share sheet) and Settings (profile,
  organization, team switcher, tax regime).

Only the CSV exports for the accountant stay on the web. It talks to the same REST API
using a bearer token (`POST /api/mobile/session`).

Expo SDK 57 · Expo Router · works in **Expo Go** (no native build needed).

## Try it in Expo Go

Your phone and computer must be on the **same Wi-Fi**.

1. Start the backend so the phone can reach it (from `property-manager/`, after the
   setup in its README — database, migrate, seed):

   ```bash
   npm run dev:lan        # Next.js on 0.0.0.0:3000
   ```

2. Start Expo (from `mobile/`):

   ```bash
   npm install
   npx expo start
   ```

3. Install **Expo Go** from the App Store / Google Play, then scan the QR code
   (iOS: Camera app; Android: inside Expo Go).

4. Tap **Use demo account → Sign in**
   (`demo@demo-hospitality.test` / `demo1234`).

The app assumes the API is on the same computer as Expo, port 3000 (it reads
the LAN IP Expo already uses). If not, edit **Server** on the sign-in screen
or set `EXPO_PUBLIC_API_URL` in `mobile/.env` (see `.env.example`).

### Troubleshooting

* **"Can't reach the server"** — check that `npm run dev:lan` is running, that
  the server URL on the sign-in screen shows your computer's LAN IP (not
  `localhost`), and that your firewall allows port 3000. Open
  `http://<that-ip>:3000` in the phone's browser to test.
* **Different networks / corporate Wi-Fi** — run `npx expo start --tunnel` for
  the app, and expose the API with a tunnel too (e.g. `npx localtunnel --port 3000`),
  then put that URL in **Server**.
* **"Project is incompatible with this version of Expo Go"** — update Expo Go;
  this project uses SDK 57.

## Google Play

The app is configured for a Play Store release: package `ai.brachychronia.app`, icons,
EAS build profiles (`eas.json`), in-app account deletion and a privacy policy. The
store build talks to the hosted server set in `eas.json` (`EXPO_PUBLIC_API_URL`).
In store builds the demo-account button and the server field are hidden.

Step-by-step guide (Greek), with listing texts and Data safety answers:
**[PLAY_STORE.md](PLAY_STORE.md)**. Store graphics are in `store/`.

## Scripts

| Command | |
| --- | --- |
| `npx expo start` | dev server / QR code for Expo Go |
| `npm run typecheck` | TypeScript |
| `npm run web` | run in a browser (needs the API to allow the origin — dev only) |
