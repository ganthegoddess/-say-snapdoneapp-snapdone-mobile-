# SnapDone Mobile App

A React Native app built with Expo SDK 52 that turns messy real-world inputs — photos, screenshots, voice notes, and forwarded emails — into structured actions.

## Tech Stack

- **Framework:** Expo SDK 52 (managed workflow)
- **Navigation:** Expo Router v4 (file-based routing)
- **State:** Zustand (client) + TanStack React Query (server)
- **Styling:** NativeWind v4 (Tailwind CSS)
- **Animations:** React Native Reanimated

## Project Structure

```
snapdone-mobile/
├── app/                    # Expo Router pages
│   ├── (auth)/             # Sign-in / sign-up
│   ├── (tabs)/             # Main tab screens (Home, Actions, Calendar, Settings)
│   ├── capture.tsx         # Camera capture screen
│   ├── processing/[id].tsx # AI processing UI
│   ├── action/[id].tsx     # Action detail/edit
│   ├── onboarding.tsx      # First-time onboarding
│   └── paywall.tsx         # Subscription paywall
├── src/
│   ├── components/         # Reusable UI components
│   ├── services/           # API client and service layer
│   ├── hooks/              # Custom React hooks
│   ├── stores/             # Zustand state stores
│   ├── constants/          # API endpoints, colors, config
│   └── types/              # TypeScript type definitions
├── eas.json                # EAS Build configuration
├── app.json                # Expo/App config
└── tsconfig.json           # TypeScript config
```

## Prerequisites

1. **Node.js 18+** and **npm**
2. **Expo CLI:** `npm install -g expo-cli`
3. **Expo Account:** Create one at [expo.dev](https://expo.dev)
4. **Apple Developer Account** ($99/year) — required for iOS builds
5. **Google Play Developer Account** ($25 one-time) — required for Android builds

## Quick Start

```bash
# Install dependencies
npm install

# Start the development server
npx expo start

# Run on iOS simulator
npx expo start --ios

# Run on Android emulator
npx expo start --android
```

## EAS Build (Production Builds)

EAS (Expo Application Services) builds your app in the cloud and generates the final `.ipa` (iOS) and `.apk`/`.aab` (Android) files.

### Setup

1. **Install EAS CLI:**
```bash
npm install -g eas-cli
```

2. **Log in to your Expo account:**
```bash
eas login
```

3. **Configure the project** (first time only):
```bash
eas build:configure
```

### Build Profiles

Three build profiles are defined in `eas.json`:

| Profile | Use Case | Distribution |
|---------|----------|--------------|
| `development` | Local testing with dev client | Internal (QR code) |
| `preview` | Beta testing / TestFlight | Internal / TestFlight |
| `production` | App Store / Google Play | App Store Connect / Google Play Console |

### Build Commands

```bash
# Development build (for local testing with native modules)
eas build --profile development --platform all

# Preview build (for beta testers)
eas build --profile preview --platform all

# Production build (for app store submission)
eas build --profile production --platform all

# Build for specific platform
eas build --profile production --platform ios
eas build --profile production --platform android
```

### For iOS (App Store)

1. Run `eas build --profile production --platform ios`
2. EAS will prompt you to connect your Apple Developer account
3. After the build completes, submit with:
```bash
eas submit --platform ios
```

### For Android (Google Play)

1. Run `eas build --profile production --platform android`
2. EAS will prompt you to generate or upload a keystore
3. After the build completes, submit with:
```bash
eas submit --platform android
```

## Environment Variables

Set these in `eas.json` under each build profile's `env` block:

| Variable | Description | Example |
|----------|-------------|---------|
| `EXPO_PUBLIC_API_URL` | Backend API base URL | `https://snapdoneapp.com` |
| `EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe publishable key | `pk_live_abc123` |

For local development, copy `.env.example` to `.env.local` and fill in the values.

## Store Fees & Enrollment

Before submitting to app stores, enroll in:

1. **Apple Small Business Program** (15% commission vs 30%) — saves ~$150K/year at scale
2. **Google Play 15% tier** — applies automatically for first $1M in revenue

Both require separate enrollment before first app submission.

## App Store Metadata

- **Bundle ID (iOS):** `com.snapdone.app`
- **Package Name (Android):** `com.snapdone.app`
- **Scheme:** `snapdone`

## Key Features (MVP)

- 📸 Camera capture with flash and grid overlay
- 📱 System share sheet integration (photos, text, PDFs)
- 🎤 Voice note recording
- 🤖 AI-powered extraction (via backend API)
- ✅ Action confirmation with calendar/notification integration
- 👪 Household sharing (up to 4 members)
- 💳 Subscription paywall (monthly/annual/household plans)
