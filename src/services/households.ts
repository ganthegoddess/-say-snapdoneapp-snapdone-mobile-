import { get, post, del } from "./api";
import { HOUSEHOLDS, ACTIONS } from "../constants/api";

export interface HouseholdMember {
  user_id: string;
  display_name: string;
  email: string;
  role: "admin" | "member";
  joined_at: string;
}

export interface Household {
  id: string;
  name: string;
  invite_code: string;
  role?: "admin" | "member";
  member_count?: number;
  members?: HouseholdMember[];
  created_at: string;
}

export interface HouseholdListResponse {
  households: Household[];
}

export interface CreateHouseholdResponse {
  id: string;
  name: string;
  invite_code: string;
  member_count: number;
  created_at: string;
}

export interface JoinHouseholdResponse {
  household_id: string;
  name: string;
  role: "admin" | "member";
}

/** Fetch all households the current user belongs to */
export async function fetchHouseholds(): Promise<HouseholdListResponse> {
  return get<HouseholdListResponse>(HOUSEHOLDS.LIST);
}

/** Get details for a specific household (includes members) */
export async function fetchHousehold(id: string): Promise<Household> {
  return get<Household>(HOUSEHOLDS.DETAIL(id));
}

/** Create a new household */
export async function createHousehold(name: string): Promise<CreateHouseholdResponse> {
  return post<CreateHouseholdResponse>(HOUSEHOLDS.CREATE, { name });
}

/** Join a household via invite code */
export async function joinHousehold(inviteCode: string): Promise<JoinHouseholdResponse> {
  return post<JoinHouseholdResponse>(HOUSEHOLDS.JOIN, { invite_code: inviteCode });
}

/** Leave a household */
export async function leaveHousehold(id: string): Promise<{ message: string }> {
  return del<{ message: string }>(HOUSEHOLDS.LEAVE(id));
}

/** Fetch shared actions for a household */
export async function fetchHouseholdActions(householdId: string, filters?: { status?: string }) {
  const params = new URLSearchParams({ household_id: householdId });
  if (filters?.status) params.set("status", filters.status);
  return get<{ actions: import("./actions").ActionItem[]; total: number }>(
    `/api/v1/actions?${params.toString()}`
  );
}

/** Acknowledge a shared action (mark as seen) */
export async function acknowledgeAction(actionId: string): Promise<void> {
  return post(ACTIONS.ACKNOWLEDGE(actionId), {});
}
