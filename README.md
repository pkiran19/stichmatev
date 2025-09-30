# StitchMate v2 — Local Stitching Tracker (PWA)

This version adds phone number, address, due date, search & sort, printable receipt, and better export options.

## Files
- `index.html`
- `styles.css`
- `app.js`
- `manifest.json`
- `service-worker.js`
- `README.md`
- `icons/`

## New features
- Save phone & address per recipient
- Record a due date and see overdue orders highlighted
- Search by name / phone / address
- Sort by date or outstanding balance (asc/desc)
- Auto-generate printable receipt (uses browser print)
- Export CSV and JSON backups remain available

## How to build an Android APK (wrapper) — options (instructions)

### Option 1 — PWABuilder (easiest, free)
1. Host the app (GitHub Pages recommended) so it has an HTTPS URL.
2. Go to https://www.pwabuilder.com and enter your app URL.
3. PWABuilder will analyze the PWA and provide options to download an Android package (via Trusted Web Activity / bubblewrap). Follow the wizard to download an APK or App Bundle. PWABuilder provides step-by-step guidance and often free build options.

### Option 2 — Bubblewrap (for developers; produces a TWA)
1. Install Node.js and Java (required for Android build).
2. Install `@bubblewrap/cli` and follow documentation to generate a TWA project from your manifest and site URL.
3. Use Android Studio to open the generated project and build an APK or AAB.

### Option 3 — Capacitor (native wrapper)
1. Install Capacitor and initialize a project.
2. Copy web assets into `www/` and run `npx cap add android` then `npx cap open android` to open Android Studio.
3. Build APK in Android Studio.

### Notes
- All APK builds require an Android build environment (Android Studio, SDK, Java) or a cloud builder like PWABuilder.
- I can prepare a `android/` wrapper project skeleton (config files) but I cannot produce a signed APK from here because Android SDK isn't available in this environment.

## Running locally
- For service worker and installability, host over HTTPS (GitHub Pages or local server with ngrok).

