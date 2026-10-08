# Βραχυχρόνια.ai — mobile (Expo)

Companion app for the web app in [`../property-manager`](../property-manager):
**Home** (what needs attention today), **Calendar** (14-day occupancy strip +
arrivals/departures), **Tasks** (complete/start/cancel, cleaning checklists),
**AI** (chat with Approve / Edit / Cancel for proposed actions) and reservation
details with guest messaging. It talks to the same REST API using a bearer
token (`POST /api/mobile/session`).

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

## Scripts

| Command | |
| --- | --- |
| `npx expo start` | dev server / QR code for Expo Go |
| `npm run typecheck` | TypeScript |
| `npm run web` | run in a browser (needs the API to allow the origin — dev only) |
