# SnapDone — Testing on Your Phone

**Time:** 5 minutes. No build required.

## 1. Install Expo Go on your phone

- **iOS:** [App Store → Expo Go](https://apps.apple.com/app/expo-go/id982107779)
- **Android:** [Google Play → Expo Go](https://play.google.com/store/apps/details?id=host.exp.exponent)

## 2. Start the dev server

Open a terminal on your computer and run:

```bash
cd /path/to/snapdone-mobile
npx expo start
```

A QR code will appear in the terminal.

## 3. Scan the QR code

- **iPhone:** Open the Camera app and point it at the QR code. Tap the banner.
- **Android:** Open Expo Go and tap "Scan QR code".

The app will load on your phone in about 30 seconds.

## What you'll see

| Screen | What to do |
|--------|------------|
| Onboarding | Swipe through 3 screens, tap "Get Started" |
| Sign Up | Enter any email + password (8+ chars) |
| Home | Tap the blue capture button (bottom-right) |
| Camera | Take a photo of anything — a note, flyer, screenshot |
| Processing | Wait 2-3 seconds for AI to read it |
| Confirmation | Review the action, tap Confirm |

## The app connects to the live API

The `API_BASE_URL` is already set to `https://5f7a3e77abaf27c48a69cce1b874bb58.ctonew.app` — this is the live sandbox API, **not localhost**. Verified working:

```
curl https://5f7a3e77abaf27c48a69cce1b874bb58.ctonew.app/api/v1/health
→ {"status":"ok","database":true}
```

## Need help?

- **Phone can't scan QR?** Make sure both devices are on the same Wi-Fi. Type the URL shown in the terminal into Expo Go's "Open project" field.
- **"Network Error"?** Run `curl https://5f7a3e77abaf27c48a69cce1b874bb58.ctonew.app/api/v1/health` in your terminal. If it doesn't return OK, the API server is down.
- **Camera not working?** Check phone Settings > SnapDone > Camera permission.

---

**For production builds** (TestFlight, App Store, Google Play): see `README.md` for EAS Build instructions.