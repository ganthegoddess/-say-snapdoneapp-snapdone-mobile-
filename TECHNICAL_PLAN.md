# SnapDone Mobile App — Development Plan

**Author:** Mobile Engineer  
**Date:** 2026-07-13  
**Version:** 2.0 (updated per lead feedback)

---

## 1. Framework Decision: Expo (Managed Workflow)

### Decision: Expo SDK 52 (managed workflow with dev-client)

After thorough research, **Expo managed workflow** is the right choice for SnapDone. Here's the rationale:

| Feature | Expo (Managed) | React Native CLI (Bare) | Winner |
|---------|---------------|----------------------|--------|
| Share Extension | ✅ via `expo-share-intent` | ✅ Native modules | Both |
| Camera | ✅ `expo-camera` | ✅ `react-native-vision-camera` | Both |
| Voice Recording | ✅ `expo-av` | ✅ `react-native-audio-recorder` | Both |
| Calendar | ✅ `expo-calendar` | ✅ Native modules | Both |
| Notifications | ✅ `expo-notifications` | ✅ `react-native-push-notification` | Both |
| OTA Updates | ✅ Built-in (`expo-updates`) | ❌ Manual setup needed | **Expo** |
| EAS Build | ✅ Built-in CI/CD | ❌ Manual native build config | **Expo** |
| iOS/Android config | ✅ `app.json` (no Xcode/AS needed) | ❌ Needs Xcode/Android Studio | **Expo** |
| Dev velocity | ✅ Fast (Expo Go for dev) | ❌ Slower (native builds) | **Expo** |
| Native module access | ✅ via `expo-dev-client` | ✅ Full access | Both |
| Bundle size | ⚠️ Slightly larger | ✅ Smaller | **CLI** |
| Upgrade path | ✅ `expo upgrade` | ❌ Manual breakage risk | **Expo** |

### Rationale

Expo SDK 52+ supports **all** native features SnapDone needs:
- `expo-share-intent` — iOS/Android share sheet integration
- `expo-camera` + `expo-image-picker` — Camera capture + photo library
- `expo-av` — Voice note recording and playback
- `expo-calendar` — Native calendar integration
- `expo-notifications` — Local and push notifications
- `expo-secure-store` — JWT token storage
- `expo-dev-client` — Custom native modules when needed

For any **truly custom native module** that Expo doesn't support, we use `expo-dev-client` (a custom dev client with our native modules injected), which is equivalent to the bare workflow but keeps the managed workflow's tooling benefits.

**Key advantage**: OTA updates via `expo-updates` allow us to push JS bundle fixes to users without App Store review — critical for a fast-iterating startup.

---

## 2. Share Extension Implementation

SnapDone's core value prop is "capture anything, from anywhere." The share extension is the primary intake mechanism.

### Architecture

```
┌─────────────────────┐     ┌──────────────────────┐     ┌──────────────────┐
│ Source App          │     │ Share Extension       │     │ SnapDone App     │
│ (Photos, Safari,    │────▶│ (iOS/Android native)  │────▶│ (Main app)       │
│  Files, Mail, Notes)│     │                       │     │                  │
└─────────────────────┘     └──────────────────────┘     └──────────────────┘
                                    │
                                    ▼
                            ┌──────────────────────┐
                            │ expo-share-intent     │
                            │ (native module bridge)│
                            └──────────────────────┘
                                    │
                                    ▼
                            ┌──────────────────────┐
                            │ ShareExtensionHandler │
                            │ (React component)     │
                            │ Parses payload →      │
                            │ Routes to capture flow│
                            └──────────────────────┘
```

### iOS Share Extension

1. **Registration**: `expo-share-intent` registers our app as a share target for:
   - `public.image` (JPEG, PNG, HEIC) — screenshots, photos
   - `public.pdf` — PDF documents
   - `public.plain-text` — text snippets
   - `public.url` — URL links

2. **Info.plist** (via `app.json` `ios.infoPlist`):
   ```xml
   <key>NSExtensionActivationRule</key>
   <dict>
     <key>NSExtensionActivationSupportsImageWithMaxCount</key>
     <integer>10</integer>
     <key>NSExtensionActivationSupportsFileWithMaxCount</key>
     <integer>5</integer>
     <key>NSExtensionActivationSupportsText</key>
     <true/>
   </dict>
   ```

3. **Flow**:
   - User taps Share in any app → selects SnapDone
   - Native share sheet passes file/URL/text to our extension
   - `expo-share-intent` bridges to JS → fires event
   - App opens (or shows a quick notification) with the capture in processing

### Android Share Intent

1. **Registration**: Intent filters in `AndroidManifest.xml` for `ACTION_SEND`:
   - `image/*` — photos, screenshots
   - `application/pdf` — PDFs
   - `text/plain` — text, URLs
   - `message/rfc822` — email forward

2. **Flow**:
   - User shares from any app → selects SnapDone
   - Android intent delivers the content
   - `expo-share-intent` captures and routes to processing

### Implementation

**`src/components/capture/ShareExtensionHandler.tsx`**:
- Mounted at the root layout level
- Listens for `expo-share-intent` events
- Shows a brief "Processing from share..." sheet overlay
- Validates file type and size (max 20MB per API spec)
- Uploads to `POST /api/v1/capture` via multipart/form-data
- Navigates to the processing confirmation screen

---

## 3. State Management

### Approach: Zustand + TanStack React Query

SnapDone uses a **hybrid approach**:

| Concern | Tool | Why |
|---------|------|-----|
| **Server state** (actions, captures, households, subscription) | TanStack React Query v5 | Caching, background refetch, optimistic updates, pagination, stale-while-revalidate |
| **Client state** (auth tokens, UI preferences, draft capture, onboarding progress) | Zustand v5 | Lightweight, no boilerplate, middleware for persistence, great DevTools |
| **URL state** (current screen, params) | Expo Router (file-based) | Built into the routing system |

### Why not Redux?

Redux is overkill for SnapDone. The app's state is primarily server-driven (list of actions, captures, household data). React Query handles server state better than any client-side store. Client state is minimal (auth token, UI preferences, draft capture), which Zustand handles with ~20 lines of code per store.

### Store Design

**Zustand Stores**:
- `authStore` — JWT token, user profile, isAuthenticated, login/logout actions
- `captureStore` — Draft capture state (URI, type, processing status), in-progress uploads
- `uiStore` — Theme preference, onboarding completed, last viewed tab

**React Query Keys**:
- `['actions', { status, householdId }]` — Action lists
- `['action', id]` — Single action detail
- `['capture', id]` — Capture result polling
- `['households']` — User's households
- `['household', id]` — Household details with members
- `['subscription']` — Current subscription status
- `['user']` — User profile

---

## 4. Navigation Structure

### Router: Expo Router v4 (file-based routing)

```
app/
├── _layout.tsx              # Root: GestureHandlerRootView + StatusBar + Stack
├── index.tsx                # Entry: redirect based on auth/onboarding/subscription
├── onboarding.tsx           # Onboarding flow (welcome → permissions → first capture)
├── paywall.tsx              # Subscription paywall
├── capture.tsx              # Modal: full-screen capture (camera, photo, voice)
├── action/[id].tsx          # Action detail/edit screen
├── processing/[id].tsx      # Processing state (polling for capture result)
│
├── (auth)/                  # Auth group (no tabs)
│   ├── _layout.tsx          # Stack layout for auth screens
│   ├── sign-in.tsx          # Sign in
│   └── sign-up.tsx          # Sign up
│
└── (tabs)/                  # Main tab group
    ├── _layout.tsx          # Bottom tab bar
    ├── index.tsx            # Actions feed (home)
    ├── grocery-lists.tsx    # Grocery lists view
    ├── household.tsx        # Household sharing
    └── settings.tsx         # Settings & profile
```

### Tab Bar Setup

| Tab | Icon | Purpose |
|-----|------|---------|
| **Actions** | ✓ Checkmark | Action feed with all active reminders, events, tasks, bills |
| **Capture** | 📷 Camera (center, elevated) | Opens camera/photo picker/voice recorder |
| **Lists** | 🛒 Shopping | Grocery lists view (separated from general actions) |
| **Household** | 🏠 House | Household members, shared actions, invite |
| **Settings** | ⚙️ Gear | Profile, subscription, preferences, logout |

### Deep Links

Per backend API spec:
- `snapdone://payment/success` — Post-checkout redirect
- `snapdone://payment/cancel` — Checkout cancellation
- `snapdone://action/:id` — Open specific action
- `snapdone://capture/:id` — View capture result

---

## 5. Camera Integration

### Library: `expo-camera` + `expo-image-picker`

### Photo Capture Flow

1. **Permission check**: `Camera.requestCameraPermissionsAsync()` on first use
2. **Camera UI**: Custom camera view with:
   - Viewfinder with auto-focus
   - Document detection overlay (rectangle guide)
   - Flash toggle
   - Gallery shortcut (open photo library)
   - Capture button
3. **On capture**: 
   - Compress image to 1920px max dimension, 80% JPEG quality
   - Store URI in `captureStore` (draft)
   - Navigate to photo preview screen
4. **Photo library**: `ImagePicker.launchImageLibraryAsync()` with `mediaTypes: ['images']`

### Document Scanning

For the camera, we'll implement a basic document detection overlay using `react-native-reanimated`:
- Semi-transparent rectangle guide in the center of the viewfinder
- Optional: ML Kit document detection (client-side, on-device) for auto-capture when document is in frame
- This is a Phase 2 enhancement; v1 uses manual capture

### Why expo-camera over react-native-vision-camera?

Both are excellent. `expo-camera` is the Expo-maintained option and integrates seamlessly with the managed workflow. `react-native-vision-camera` has better frame processor support but requires a bare workflow. If we need frame processing later, we can drop to `expo-dev-client` with `react-native-vision-camera` as a custom module.

---

## 6. Voice Note Recording

### Library: `expo-av`

### Implementation

**`src/components/capture/VoiceNoteRecorder.tsx`**:

1. **Permission**: `Audio.requestPermissionsAsync()` on first use
2. **Recording UI**:
   - Microphone button (pulse animation when recording)
   - Waveform visualizer (optional, Phase 2)
   - Recording duration display
   - Pause/Resume support
   - Cancel (swipe down)
3. **On stop**:
   - Compress to AAC/MP4 format
   - Max recording duration: 2 minutes (UI countdown)
   - Store URI in `captureStore`
   - Upload to `POST /api/v1/capture` with `input_type: "audio"`

### Audio Settings

```typescript
await Audio.AudioModeSettings({
  allowsRecordingIOS: true,
  playsInSilentModeIOS: true,
  staysActiveInBackground: true,
  shouldDuckAndroid: true,
});

const recording = new Audio.Recording();
await recording.prepareToRecordAsync({
  ...Audio.RecordingOptionsPresets.HIGH_QUALITY,
  // Override for smaller file size
  android: {
    extension: '.m4a',
    outputFormat: Audio.AndroidOutputFormat.MPEG_4,
    audioEncoder: Audio.AndroidAudioEncoder.AAC,
    sampleRate: 44100,
    numberOfChannels: 1,
    bitRate: 64000,  // 64 kbps — good balance of quality vs size
  },
  ios: {
    extension: '.m4a',
    outputFormat: Audio.IOSOutputFormat.MPEG4AAC,
    audioQuality: Audio.IOSAudioQuality.MEDIUM,
    sampleRate: 44100,
    numberOfChannels: 1,
    bitRate: 64000,
  },
});
```

---

## 7. Local Notifications

### Library: `expo-notifications`

### Use Cases

| Trigger | Type | Timing |
|---------|------|--------|
| Reminder for an action | Local (scheduled) | At action's due date/time |
| Event reminder | Local (scheduled) | 15 min / 1 hour / 1 day before (user configurable) |
| Bill due reminder | Local (scheduled) | 3 days before, 1 day before, day of |
| Processing complete | Local (immediate) | When capture finishes processing (if app is backgrounded) |
| Household invite | Push (remote) | When someone invites you |
| Shared action added | Push (remote) | When household member adds an action |

### Implementation

**Notification channels** (Android):
```typescript
// Create channels on app start
await Notifications.setNotificationChannelAsync('reminders', {
  name: 'Reminders',
  importance: Notifications.AndroidImportance.HIGH,
  vibrationPattern: [0, 250, 250, 250],
  lightColor: '#0891B2',
});
await Notifications.setNotificationChannelAsync('household', {
  name: 'Household',
  importance: Notifications.AndroidImportance.DEFAULT,
});
```

**Scheduling reminders**:
```typescript
// When action is confirmed
await Notifications.scheduleNotificationAsync({
  content: {
    title: action.title,
    body: action.description ?? 'Tap to view details',
    data: { actionId: action.id, type: 'reminder' },
  },
  trigger: {
    date: new Date(action.dueDate),
    type: Notifications.SchedulableTriggerInputTypes.DATE,
  },
});
```

**Notification tap handling**:
- Configure in `app/_layout.tsx` via `Notifications.addNotificationResponseReceivedListener()`
- Deep link to the action screen: `router.push(`/action/${data.actionId}`)`

---

## 8. Calendar Integration

### Library: `expo-calendar`

### Flow

```
1. User confirms an action with action_type: "event" + due_date
2. App shows bottom sheet: "Add to your calendar?"
   ┌─────────────────────────────────────┐
   │  📅 Add to Calendar                 │
   │  "Dentist Appointment"              │
   │  Tomorrow at 2:00 PM                │
   │                                     │
   │  [Calendar: iCloud] ▼               │
   │  [Alert: 15 min before] ▼           │
   │                                     │
   │  [Add to Calendar]  [Skip]          │
   └─────────────────────────────────────┘
3. If confirmed:
   a. Request calendar permissions (Calendar.requestCalendarPermissionsAsync())
   b. Get or create a "SnapDone" calendar source
   c. Create event via Calendar.createEventAsync()
   d. Send PATCH /api/v1/actions/:id with metadata: { calendar_added: true }
```

### Calendar Source

```typescript
// Create a SnapDone calendar if it doesn't exist
const calendars = await Calendar.getCalendarsAsync();
const snapdoneCalendar = calendars.find(c => c.title === 'SnapDone');

if (!snapdoneCalendar) {
  const calendarId = await Calendar.createCalendarAsync({
    title: 'SnapDone',
    color: '#0891B2',
    entityType: Calendar.EntityTypes.EVENT,
    sourceId: defaultSource.id,
    source: defaultSource,
    name: 'SnapDone',
    ownerAccount: 'snapdone',
    accessLevel: Calendar.CalendarAccessLevel.OWNER,
  });
}
```

### Future: Two-way sync
- Phase 2: Poll for calendar changes and sync back to SnapDone
- Uses `Calendar.getEventsAsync()` with date range

---

## 9. Key Libraries & Dependencies

| Library | Version | Purpose | Why this one |
|---------|---------|---------|-------------|
| **expo** | ~52.0.0 | Core framework | Managed workflow, OTA updates, EAS Build |
| **expo-router** | ~4.0.0 | File-based routing | Deep links, typed routes, navigation |
| **nativewind** | ^4.0.0 | TailwindCSS for RN | Brand colors, utility-first, fast dev |
| **tailwindcss** | ^3.4.0 | CSS framework | Design system tokens |
| **@tanstack/react-query** | ^5.60.0 | Server state | Caching, polling, optimistic updates |
| **zustand** | ^5.0.0 | Client state | Lightweight, persist middleware |
| **react-native-reanimated** | ~3.16.0 | Animations | Smooth transitions, gesture-driven UI |
| **react-native-gesture-handler** | ~2.21.0 | Gestures | Swipe-to-dismiss, pinch-to-zoom |
| **react-native-safe-area-context** | ~4.14.0 | Safe area | Notch/island handling |
| **react-native-screens** | ~4.4.0 | Native screens | Performance, native stack |
| **expo-camera** | ~16.0.0 | Camera | Expo-managed, document scanning |
| **expo-image-picker** | ~16.0.0 | Photo library | Gallery access for existing photos |
| **expo-av** | ~15.0.0 | Audio recording | Voice note capture and playback |
| **expo-calendar** | ~14.0.0 | Calendar API | Write events to native calendar |
| **expo-notifications** | ~0.29.0 | Notifications | Local + push, channel support |
| **expo-secure-store** | ~14.0.0 | Secure storage | JWT tokens, encrypted storage |
| **expo-constants** | ~17.0.0 | App constants | API URL, environment config |
| **expo-clipboard** | ~7.0.0 | Clipboard | Paste text from clipboard |
| **expo-file-system** | ~18.0.0 | File system | File cache, temp storage |
| **expo-haptics** | ~14.0.0 | Haptic feedback | Confirm/capture feedback |
| **expo-linking** | ~7.0.0 | Deep links | Payment redirects, external links |
| **expo-mail-composer** | ~14.0.0 | Email | Contact support from app |
| **expo-share-intent** | ~1.0.0 | Share extension | iOS/Android share sheet intake |
| **expo-device** | ~7.0.0 | Device info | Model detection, feature flags |
| **expo-updates** | bundled | OTA updates | JS bundle updates without store review |
| **react-native-toast-message** | ^2.2.0 | Toasts | Success/error feedback |
| **react-native-svg** | ^15.0.0 | SVGs | Custom icons, illustrations |
| **date-fns** | ^4.0.0 | Date utilities | Formatting, parsing, timezone |
| **@shopify/flash-list** | ^1.7.0 | Virtualized list | Performance for action feed |
| **react-native-gesture-handler** | ~2.21.0 | Swipe actions | Complete/dismiss actions |

### Dev Dependencies

| Library | Purpose |
|---------|---------|
| **typescript** | Type safety |
| **eslint** | Code quality |
| **prettier** | Code formatting |
| **jest** | Unit tests |
| **@testing-library/react-native** | Component tests |
| **detox** | E2E tests (iOS) |
| **babel-plugin-module-resolver** | Path aliases (`@/` → `src/`) |

---

## 10. App Store Fee Research

### Apple Small Business Program

**What it is**: Apple reduces the App Store commission from 30% to 15% for qualifying developers.

**Qualification requirements**:
- Must be an **individual developer or organization** registered in the App Store Small Business Program
- **Annual revenue from the prior calendar year** must be ≤ $1,000,000 (USD) **across all associated developer accounts**
- If revenue exceeds $1M in a calendar year, the 30% rate applies for the remainder of that year + the following year
- **Free apps** with no revenue also qualify (no IAP, no paid downloads)
- Applies to **all** App Store digital sales and in-app purchases on iOS, iPadOS, macOS, watchOS, tvOS

**How to enroll**:
1. Sign in to [App Store Connect](https://appstoreconnect.apple.com)
2. Go to "Agreements, Tax, and Banking"
3. Enroll in the Small Business Program
4. Provide tax information and confirm eligibility
5. Apple reviews and approves (typically within a few days)

**For SnapDone**:
- As a pre-revenue startup, we **qualify immediately**
- Monthly ($7.99), Annual ($44.99), and Household ($49.99) subscriptions all qualify for the 15% rate
- We must **enroll before** we submit our first app for review
- 15% rate applies to first $1M in annual revenue

### Google Play 15% Tier

**What it is**: Google reduces the Play Console service fee from 30% to 15% for the first $1M of annual revenue.

**Qualification requirements**:
- **Automatic** — no application needed; Google applies the 15% rate to the first $1M USD of earnings per developer account each year
- Applies to **all** developers, regardless of size, for the first $1M
- After $1M in a calendar year, the rate returns to 30% for earnings above $1M
- Applies to **all** Google Play sales: app purchases, in-app purchases, subscriptions

**Implementation note**:
- Google Play requires using **Google Play's billing system** for in-app purchases and subscriptions
- Stripe cannot be used directly for Google Play purchases
- **Recommended approach**: Use Stripe for web checkout / Apple's in-app purchase, and **RevenueCat** or similar as a unified subscription management layer across stores
- Alternatively, pass through Stripe Checkout via a webview (allowed for cross-platform subscriptions, but Apple requires IAP for digital goods)

**For SnapDone**:
- The 15% rate is automatic for our first $1M in annual revenue
- Estimated net on $7.99/month: $6.79 (after 15% fee vs $5.59 at 30%)
- Annual savings at $1M revenue: ~$150,000

### Combined Impact on Revenue Model

| Metric | 30% fee | 15% fee (qualified) |
|--------|---------|---------------------|
| Monthly ($7.99) | $5.59 net | $6.79 net |
| Annual ($44.99) | $31.49 net | $38.24 net |
| Household ($49.99) | $34.99 net | $42.49 net |
| Per-user net (mix) | ~$33.39 | ~$40.80 |
| 36,000 accounts net | ~$1.02M | ~$1.47M |

**Bottom line**: Enrolling in Apple's Small Business Program saves ~$450K/year at the 6-month target. This is a high-priority action item before app submission.

---

## 11. Project Structure

```
snapdone-mobile/
├── app/                            # Expo Router pages
│   ├── _layout.tsx                 # Root layout
│   ├── index.tsx                   # Entry redirect
│   ├── onboarding.tsx              # Onboarding flow
│   ├── paywall.tsx                 # Subscription paywall
│   ├── capture.tsx                 # Capture modal
│   ├── action/[id].tsx             # Action detail
│   ├── processing/[id].tsx         # Processing state
│   ├── (auth)/
│   │   ├── _layout.tsx
│   │   ├── sign-in.tsx
│   │   └── sign-up.tsx
│   └── (tabs)/
│       ├── _layout.tsx
│       ├── index.tsx               # Actions feed
│       ├── grocery-lists.tsx       # Grocery lists
│       ├── household.tsx           # Household sharing
│       └── settings.tsx            # Settings
│
├── src/
│   ├── assets/
│   │   └── images/
│   ├── components/
│   │   ├── ui/                     # Design system
│   │   │   ├── Button.tsx
│   │   │   ├── Card.tsx
│   │   │   ├── Input.tsx
│   │   │   ├── Badge.tsx
│   │   │   ├── Avatar.tsx
│   │   │   ├── BottomSheet.tsx
│   │   │   └── LoadingOverlay.tsx
│   │   ├── capture/
│   │   │   ├── CaptureButton.tsx
│   │   │   ├── CameraView.tsx
│   │   │   ├── PhotoPreview.tsx
│   │   │   ├── VoiceNoteRecorder.tsx
│   │   │   └── ShareExtensionHandler.tsx
│   │   ├── actions/
│   │   │   ├── ActionCard.tsx
│   │   │   ├── ActionList.tsx
│   │   │   ├── ActionConfirmation.tsx
│   │   │   └── ActionCategoryIcon.tsx
│   │   ├── household/
│   │   │   ├── HouseholdMemberList.tsx
│   │   │   ├── InviteMemberSheet.tsx
│   │   │   └── SharedActionCard.tsx
│   │   └── onboarding/
│   │       ├── WelcomeStep.tsx
│   │       ├── PermissionStep.tsx
│   │       └── FirstCaptureStep.tsx
│   ├── constants/
│   │   ├── colors.ts
│   │   ├── layout.ts
│   │   └── api.ts
│   ├── hooks/
│   │   ├── useAuth.ts
│   │   ├── useCapture.ts
│   │   ├── useActions.ts
│   │   ├── useCamera.ts
│   │   ├── useVoiceNote.ts
│   │   ├── useCalendar.ts
│   │   ├── useNotifications.ts
│   │   ├── useHousehold.ts
│   │   └── useSubscription.ts
│   ├── providers/
│   │   ├── AuthProvider.tsx
│   │   ├── QueryProvider.tsx
│   │   └── ThemeProvider.tsx
│   ├── services/
│   │   ├── api.ts
│   │   ├── auth.ts
│   │   ├── actions.ts
│   │   ├── capture.ts
│   │   ├── household.ts
│   │   └── subscription.ts
│   ├── stores/
│   │   ├── authStore.ts
│   │   ├── captureStore.ts
│   │   └── uiStore.ts
│   ├── types/
│   │   └── index.ts
│   └── utils/
│       ├── permissions.ts
│       ├── formatDate.ts
│       └── shareExtension.ts
│
├── package.json
├── app.json
├── tsconfig.json
├── babel.config.js
├── tailwind.config.js
└── metro.config.js
```

---

## 12. Capture → Action Flow (Detailed)

```
1. INPUT
   ├── Camera (in-app capture)
   │   └── expo-camera → JPEG (1920px, 80% quality)
   ├── Photo Library (existing photo/screenshot)
   │   └── expo-image-picker → JPEG (1920px, 80% quality)
   ├── Share Extension (from any app)
   │   └── expo-share-intent → File URI
   ├── Voice Note (in-app recording)
   │   └── expo-av → AAC/M4A (64kbps, max 2min)
   └── Text/Paste
       └── expo-clipboard → Plain text

2. UPLOAD (POST /api/v1/capture)
   │
   ├── Multipart form upload
   │   ├── file: binary (image, audio, pdf)
   │   └── input_type: "image" | "audio" | "pdf" | "text"
   │
   └── Response: { capture_id, status: "pending", estimated_processing_time_ms }

3. PROCESSING POLLING
   │
   ├── Navigate to /processing/[capture_id]
   ├── Show animated spinner + "Processing your capture..."
   ├── Poll GET /api/v1/capture/:id/result every 2s
   │
   ├── On "completed": Navigate to ActionConfirmation card
   ├── On "failed": Show error + retry button
   └── On timeout (30s): Show "Taking longer than expected..." with dismiss option

4. CONFIRMATION (ActionConfirmation.tsx)
   │
   ┌────────────────────────────────────────────┐
   │  ✅ SnapDone found:                        │
   │  ┌────────────────────────────────────┐    │
   │  │  "Dentist Appointment"             │    │
   │  │  📅 Tomorrow at 2:00 PM            │    │
   │  │  📍 123 Main St, Suite 200         │    │
   │  │                                     │    │
   │  │  Category: [Calendar Event] ▼      │    │
   │  │  Priority: [Medium] ▼              │    │
   │  │  Reminder: [15 min before] ▼       │    │
   │  │  Share with: [Household] ☐         │    │
   │  │                                     │    │
   │  │  [✓ Confirm]  [✏️ Edit]  [🗑️ Dismiss]│    │
   │  └────────────────────────────────────┘    │
   └────────────────────────────────────────────┘

5. ACTION CREATED
   │
   ├── PATCH /api/v1/actions/:id (if user edited)
   ├── Navigate to /(tabs)/
   ├── Schedule local notification (if reminder)
   ├── Write to calendar (if event, with user consent)
   ├── Toast: "✅ Action created!"
   └── Haptic feedback (success)
```

---

## 13. Implementation Phases

### Phase 1: Foundation (Week 1-2)
- [x] Project scaffold and config files
- [ ] Navigation framework (tabs, stack, modals)
- [ ] Auth screens (sign in, sign up)
- [ ] API client with auth token management
- [ ] React Query provider setup
- [ ] Zustand stores (auth, UI)
- [ ] UI component library (Button, Card, Input, etc.)
- [ ] Brand colors, typography, theme

### Phase 2: Core Capture (Week 3-4)
- [ ] Camera integration (photo capture)
- [ ] Photo library picker
- [ ] Voice note recorder
- [ ] Share extension handler
- [ ] Capture upload service
- [ ] Processing polling screen
- [ ] Action confirmation card UI

### Phase 3: Actions & Feed (Week 5-6)
- [ ] Actions feed (home tab with FlashList)
- [ ] Action CRUD (create, edit, complete, delete)
- [ ] Calendar integration
- [ ] Local notification scheduling
- [ ] Grocery lists view
- [ ] Swipe-to-complete/dismiss gestures

### Phase 4: Sharing & Monetization (Week 7-8)
- [ ] Household creation and member management
- [ ] Shared action cards
- [ ] Invite by code flow
- [ ] Paywall screen
- [ ] Subscription management (Stripe via API)
- [ ] Free tier limits enforcement

### Phase 5: Polish & Launch (Week 9-10)
- [ ] Onboarding flow
- [ ] Animations and micro-interactions
- [ ] Error states and edge cases
- [ ] EAS Build configuration
- [ ] App store assets (screenshots, descriptions)
- [ ] Performance optimization
- [ ] Accessibility audit
- [ ] Beta testing (TestFlight / Internal Track)
- [ ] Production release

---

## 14. API Contract Alignment

The mobile app is designed to integrate with the backend API at the following endpoints (per backend team's `snapdone-api-reference.md`):

| Endpoint | Mobile Hook/Service | Notes |
|----------|-------------------|-------|
| `POST /api/v1/auth/signup` | `src/services/auth.ts` | Uses `expo-secure-store` for JWT |
| `POST /api/v1/auth/login` | `src/services/auth.ts` | Stores token + user in Zustand |
| `POST /api/v1/auth/refresh` | `src/services/api.ts` | Interceptor auto-refreshes on 401 |
| `POST /api/v1/capture` | `src/services/capture.ts` | Multipart upload with progress |
| `POST /api/v1/capture/text` | `src/services/capture.ts` | JSON body for text input |
| `GET /api/v1/capture/:id/result` | `src/hooks/useCapture.ts` | Polling every 2s |
| `GET /api/v1/actions` | `src/hooks/useActions.ts` | `@tanstack/react-query` with filters |
| `GET /api/v1/actions/:id` | `src/hooks/useActions.ts` | Single action detail |
| `PATCH /api/v1/actions/:id` | `src/hooks/useActions.ts` | Optimistic update |
| `PATCH /api/v1/actions/:id/complete` | `src/hooks/useActions.ts` | Swipe-to-complete |
| `DELETE /api/v1/actions/:id` | `src/hooks/useActions.ts` | Swipe-to-dismiss |
| `POST /api/v1/households` | `src/services/household.ts` | Create household |
| `GET /api/v1/households` | `src/hooks/useHousehold.ts` | List user's households |
| `GET /api/v1/households/:id` | `src/hooks/useHousehold.ts` | Members detail |
| `POST /api/v1/households/join` | `src/services/household.ts` | Join via invite code |
| `GET /api/v1/subscriptions/status` | `src/hooks/useSubscription.ts` | Subscription state |
| `POST /api/v1/subscriptions/create-checkout` | `src/services/subscription.ts` | Opens Stripe Checkout |
| `POST /api/v1/subscriptions/portal` | `src/services/subscription.ts` | Opens Stripe Customer Portal |
| `POST /api/v1/subscriptions/cancel` | `src/services/subscription.ts` | Cancel at period end |

---

## 15. Key Decisions Summary

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Framework | Expo SDK 52 (managed) | All native features supported; OTA updates; EAS Build; faster dev velocity |
| Navigation | Expo Router 4 (file-based) | Deep links, typed routes, share extension support |
| Styling | NativeWind v4 (Tailwind) | Brand tokens, utility-first, fast iteration |
| Server state | TanStack React Query v5 | Caching, polling, optimistic updates |
| Client state | Zustand v5 | Lightweight, persist middleware, auth tokens |
| Camera | expo-camera | Expo-managed, permission handling, document detection |
| Voice | expo-av | Managed, recording + playback, codec support |
| Calendar | expo-calendar | Native calendar write, event creation |
| Notifications | expo-notifications | Local + push, channels, scheduling |
| Share extension | expo-share-intent | iOS/Android share sheet, file parsing |
| Auth | JWT via expo-secure-store | Stateless, encrypted storage, auto-refresh |
| Store fees | 15% (Apple Small Business + Google Play first $1M) | Enroll before launch; saves ~$150K/year at scale |