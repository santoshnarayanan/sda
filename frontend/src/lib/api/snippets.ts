// src/lib/api/snippets.ts
import api from "../api";

export type UserSnippet = {
  id?: number;
  user_id: number;
  title: string;
  language: string;
  code: string;
  notes?: string;
};

/** Fetch all snippets for a user */
export async function getSnippets(userId: number): Promise<UserSnippet[]> {
  const { data } = await api.get(`/api/snippets/${userId}`);
  return data;
}

/** Save a new snippet */
export async function addSnippet(snippet: UserSnippet): Promise<{ status: string }> {
  const { data } = await api.post("/api/snippets", snippet);
  return data;
}
