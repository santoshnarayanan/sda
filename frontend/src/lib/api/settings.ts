// src/lib/api/settings.ts
import api from "../api";

export type UserSettings = {
  user_id: number;
  preferred_model: string;
  language: string;
  tone: string;
  custom_system_prompt?: string;
};

/** Fetch user settings by ID */
export async function getUserSettings(userId: number): Promise<UserSettings | {}> {
  const { data } = await api.get(`/api/settings/${userId}`);
  return data;
}

/** Update user settings */
export async function updateUserSettings(settings: UserSettings): Promise<{ status: string }> {
  const { data } = await api.post("/api/settings", settings);
  return data;
}
