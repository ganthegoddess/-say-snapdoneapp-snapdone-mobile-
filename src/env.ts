// SnapDone Environment Configuration
// 
// This file manages environment variables for the Expo app.
// In development, values are hardcoded here.
// In production (EAS Build), values come from eas.json env.
//
// IMPORTANT: Replace pk_live_... with your actual Stripe publishable key
// before building for production. You can find it in the Stripe Dashboard:
// https://dashboard.stripe.com/test/apikeys (test) or
// https://dashboard.stripe.com/apikeys (live)

export const ENV = {
  // The API base URL for the backend
  API_URL: process.env.EXPO_PUBLIC_API_URL || "https://5f7a3e77abaf27c48a69cce1b874bb58.ctonew.app",
  
  // Stripe publishable key (starts with pk_live_ for live or pk_test_ for test)
  STRIPE_PUBLISHABLE_KEY: process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY || "pk_live_51TtgNH55NIUFSPQz8jTdmLkq7b8wUbSsuvQMIQ7pHveOejr4aoU58Hy9U6CaKT3G1UFuGkkIweSM2CPauJNMklhQ00gbv5natR",
  
  // Deep linking scheme
  SCHEME: "snapdone",
  
  // App version
  APP_VERSION: "0.1.0",
} as const;

export default ENV;