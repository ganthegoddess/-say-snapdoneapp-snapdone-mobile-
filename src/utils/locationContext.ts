/**
 * Maps free-text action.location values (e.g., "Walmart", "Kroger")
 * to context types and display labels for the location badge and geofence logic.
 */

export interface LocationContextInfo {
  /** Context type for radius/icon lookups */
  type: "grocery_store" | "pharmacy" | "school" | "medical" | "work" | "unknown";
  /** Human-readable label for badges */
  label: string;
  /** Emoji for notifications */
  icon: string;
  /** Geofence radius in meters */
  radius: number;
}

/** Store name to context type mapping */
const STORE_CONTEXT_MAP: Record<string, Omit<LocationContextInfo, "label">> = {
  // Grocery stores
  walmart:     { type: "grocery_store",  icon: "🛒", radius: 500 },
  kroger:      { type: "grocery_store",  icon: "🛒", radius: 500 },
  safeway:     { type: "grocery_store",  icon: "🛒", radius: 500 },
  costco:      { type: "grocery_store",  icon: "🛒", radius: 500 },
  target:      { type: "grocery_store",  icon: "🛒", radius: 500 },
  trader:      { type: "grocery_store",  icon: "🛒", radius: 500 },
  wholefoods:  { type: "grocery_store",  icon: "🛒", radius: 500 },
  aldi:        { type: "grocery_store",  icon: "🛒", radius: 500 },
  publix:      { type: "grocery_store",  icon: "🛒", radius: 500 },
  meijer:      { type: "grocery_store",  icon: "🛒", radius: 500 },
  heb:         { type: "grocery_store",  icon: "🛒", radius: 500 },
  "food lion": { type: "grocery_store",  icon: "🛒", radius: 500 },
  // Pharmacies
  cvs:         { type: "pharmacy",       icon: "💊", radius: 500 },
  walgreens:   { type: "pharmacy",       icon: "💊", radius: 500 },
  pharmacy:    { type: "pharmacy",       icon: "💊", radius: 500 },
  riteaid:     { type: "pharmacy",       icon: "💊", radius: 500 },
  // Schools
  elementary:  { type: "school",         icon: "🏫", radius: 1000 },
  "middle school": { type: "school",     icon: "🏫", radius: 1000 },
  "high school":  { type: "school",      icon: "🏫", radius: 1000 },
  academy:     { type: "school",         icon: "🏫", radius: 1000 },
  school:      { type: "school",         icon: "🏫", radius: 1000 },
  // Medical
  medical:     { type: "medical",        icon: "🏥", radius: 500 },
  hospital:    { type: "medical",        icon: "🏥", radius: 500 },
  clinic:      { type: "medical",        icon: "🏥", radius: 500 },
  dental:      { type: "medical",        icon: "🏥", radius: 500 },
  doctor:      { type: "medical",        icon: "🏥", radius: 500 },
  // Work
  office:      { type: "work",           icon: "💼", radius: 1000 },
  downtown:    { type: "work",           icon: "💼", radius: 1000 },
};

const DEFAULT_CONTEXT: Omit<LocationContextInfo, "label"> = {
  type: "unknown",
  icon: "📍",
  radius: 500,
};

/**
 * Derive location context from a free-text action.location field.
 * Matches known store/brand names by substring. Falls back to generic.
 */
export function locationContextFromText(locationText: string | null | undefined): LocationContextInfo {
  if (!locationText) {
    return { ...DEFAULT_CONTEXT, label: "" };
  }

  const lower = locationText.toLowerCase().trim();

  for (const [key, context] of Object.entries(STORE_CONTEXT_MAP)) {
    if (lower.includes(key)) {
      return { ...context, label: locationText.trim() };
    }
  }

  return { ...DEFAULT_CONTEXT, label: locationText.trim() };
}

/**
 * Simple helper just for the badge display: shows "📍 Near {location}" 
 * with context-specific icon if matched.
 */
export function getLocationBadgeLabel(locationText: string | null | undefined): string | null {
  if (!locationText) return null;
  return locationText.trim();
}

export function getLocationBadgeIcon(locationText: string | null | undefined): string {
  if (!locationText) return "📍";
  return locationContextFromText(locationText).icon;
}
