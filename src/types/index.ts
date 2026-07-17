// ============================================================
// SnapDone — Core Type Definitions
// ============================================================

/** Categories of structured actions that SnapDone can produce */
export type ActionCategory =
  | "reminder"
  | "calendar_event"
  | "task"
  | "grocery_item"
  | "bill_due"
  | "follow_up"
  | "note";

/** The source/origin of a capture */
export type CaptureSource =
  | "camera"
  | "photo_library"
  | "screenshot"
  | "voice_note"
  | "email_forward"
  | "file_import"
  | "share_extension";

/** Processing status of a capture */
export type CaptureStatus =
  | "pending"
  | "processing"
  | "needs_review"
  | "confirmed"
  | "failed";

/** A raw input captured by the user */
export interface Capture {
  id: string;
  source: CaptureSource;
  uri: string;
  thumbnailUri?: string;
  createdAt: string;
  status: CaptureStatus;
  metadata?: {
    width?: number;
    height?: number;
    durationMs?: number;
    fileSize?: number;
    mimeType?: string;
  };
}

/** A structured action extracted from a capture */
export interface Action {
  id: string;
  captureId: string;
  category: ActionCategory;
  title: string;
  description?: string;
  date?: string; // ISO 8601
  time?: string;
  endDate?: string;
  endTime?: string;
  location?: string;
  priority: "low" | "medium" | "high";
  isComplete: boolean;
  isShared: boolean;
  householdId?: string;
  createdByUserId: string;
  assignedToUserId?: string;
  createdAt: string;
  updatedAt: string;
  notes?: string;
  tags?: string[];
}

/** User profile */
export interface User {
  id: string;
  email: string;
  displayName: string;
  avatarUri?: string;
  subscriptionTier: "free" | "monthly" | "annual" | "household";
  subscriptionEndDate?: string;
  createdAt: string;
}

/** Household for sharing */
export interface Household {
  id: string;
  name: string;
  createdByUserId: string;
  members: HouseholdMember[];
  createdAt: string;
}

export interface HouseholdMember {
  userId: string;
  displayName: string;
  role: "admin" | "member";
  joinedAt: string;
}

/** Grocery list item */
export interface GroceryItem {
  id: string;
  name: string;
  quantity?: string;
  isChecked: boolean;
  listId: string;
  addedByUserId: string;
  createdAt: string;
}

/** Notification / reminder */
export interface AppNotification {
  id: string;
  actionId: string;
  title: string;
  body: string;
  scheduledFor: string;
  isDelivered: boolean;
  createdAt: string;
}

/** API response wrapper */
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

/** Share extension payload received from iOS/Android share sheet */
export interface ShareExtensionPayload {
  type: "image" | "video" | "text" | "url" | "file";
  uri: string;
  text?: string;
  subject?: string;
}