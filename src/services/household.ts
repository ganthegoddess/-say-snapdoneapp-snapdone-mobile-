import { get, post } from "./api";
import { HOUSEHOLDS } from "../constants/api";
import { trackInviteEvent } from "./analytics";

export interface HouseholdSummary {
  id: string;
  name: string;
  role: "admin" | "member";
  member_count: number;
  invite_code: string;
}

export interface HouseholdDetail {
  id: string;
  name: string;
  invite_code: string;
  members: {
    user_id: string;
    display_name: string;
    email: string;
    role: "admin" | "member";
    joined_at: string;
  }[];
  created_at: string;
}

export interface CreateHouseholdResponse {
  id: string;
  name: string;
  invite_code: string;
  member_count: number;
  created_at: string;
}

/** Fetch user's households */
export async function fetchHouseholds(): Promise<{ households: HouseholdSummary[] }> {
  return get<{ households: HouseholdSummary[] }>(HOUSEHOLDS.LIST);
}

/** Get household details with members */
export async function fetchHouseholdDetail(id: string): Promise<HouseholdDetail> {
  return get<HouseholdDetail>(HOUSEHOLDS.DETAIL(id));
}

/** Create a new household */
export async function createHousehold(name: string): Promise<CreateHouseholdResponse> {
  return post<CreateHouseholdResponse>(HOUSEHOLDS.CREATE, { name });
}

/** Join a household via invite code */
export async function joinHousehold(inviteCode: string): Promise<{ household_id: string; name: string; role: string }> {
  const result = await post<{ household_id: string; name: string; role: string }>(HOUSEHOLDS.JOIN, { invite_code: inviteCode });
  // Fire analytics (fire-and-forget)
  trackInviteEvent("invite_joined", { invite_code: inviteCode, household_id: result.household_id });
  return result;
}

/** Leave a household */
export async function leaveHousehold(id: string): Promise<{ message: string }> {
  return post<{ message: string }>(HOUSEHOLDS.LEAVE(id));
}