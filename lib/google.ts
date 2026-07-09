import type { SupabaseClient } from "@supabase/supabase-js";

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const REVOKE_URL = "https://oauth2.googleapis.com/revoke";
const AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const DRIVE_FILES = "https://www.googleapis.com/drive/v3/files";
const DRIVE_UPLOAD =
  "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart";
const SCOPE = "https://www.googleapis.com/auth/drive.file";
const FOLDER_NAME = "Ruslie Spring Orders";

interface OAuthRow {
  refresh_token: string | null;
  access_token: string | null;
  token_expiry: string | null;
  drive_folder_id: string | null;
}

function env(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env ${name}`);
  return v;
}

export function buildConsentUrl(): string {
  const params = new URLSearchParams({
    client_id: env("GOOGLE_CLIENT_ID"),
    redirect_uri: env("GOOGLE_REDIRECT_URI"),
    response_type: "code",
    scope: SCOPE,
    access_type: "offline",
    prompt: "consent",
  });
  return `${AUTH_URL}?${params.toString()}`;
}

export async function getStoredAuth(
  supabase: SupabaseClient
): Promise<OAuthRow | null> {
  const { data, error } = await supabase
    .from("google_oauth")
    .select("refresh_token, access_token, token_expiry, drive_folder_id")
    .eq("id", 1)
    .maybeSingle();
  if (error) throw error;
  return (data as OAuthRow) ?? null;
}

export async function isConnected(supabase: SupabaseClient): Promise<boolean> {
  const row = await getStoredAuth(supabase);
  return !!row?.refresh_token;
}

export async function exchangeCode(code: string): Promise<{
  refresh_token?: string;
  access_token: string;
  expires_in: number;
}> {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: env("GOOGLE_CLIENT_ID"),
      client_secret: env("GOOGLE_CLIENT_SECRET"),
      redirect_uri: env("GOOGLE_REDIRECT_URI"),
      grant_type: "authorization_code",
    }),
  });
  if (!res.ok) throw new Error(`Token exchange failed: ${await res.text()}`);
  return res.json();
}

async function refreshAccessToken(
  refreshToken: string
): Promise<{ access_token: string; expires_in: number }> {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: env("GOOGLE_CLIENT_ID"),
      client_secret: env("GOOGLE_CLIENT_SECRET"),
      grant_type: "refresh_token",
    }),
  });
  if (!res.ok) throw new Error(`Token refresh failed: ${await res.text()}`);
  return res.json();
}

// Returns a valid access token, refreshing + persisting when expired.
export async function getAccessToken(
  supabase: SupabaseClient
): Promise<string> {
  const row = await getStoredAuth(supabase);
  if (!row?.refresh_token) throw new Error("Google account not connected");

  const stillValid =
    row.access_token &&
    row.token_expiry &&
    new Date(row.token_expiry).getTime() - 60_000 > Date.now();
  if (stillValid) return row.access_token as string;

  const refreshed = await refreshAccessToken(row.refresh_token);
  const expiry = new Date(Date.now() + refreshed.expires_in * 1000).toISOString();
  const { error } = await supabase
    .from("google_oauth")
    .update({ access_token: refreshed.access_token, token_expiry: expiry })
    .eq("id", 1);
  if (error) throw error;
  return refreshed.access_token;
}

async function createFolder(token: string): Promise<string> {
  const res = await fetch(DRIVE_FILES, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: FOLDER_NAME,
      mimeType: "application/vnd.google-apps.folder",
    }),
  });
  if (!res.ok) throw new Error(`Folder create failed: ${await res.text()}`);
  const json = await res.json();
  return json.id as string;
}

// Returns the stored folder id, creating + persisting it if absent.
export async function ensureFolder(
  supabase: SupabaseClient,
  token: string
): Promise<string> {
  const row = await getStoredAuth(supabase);
  if (row?.drive_folder_id) return row.drive_folder_id;
  const folderId = await createFolder(token);
  const { error } = await supabase
    .from("google_oauth")
    .update({ drive_folder_id: folderId })
    .eq("id", 1);
  if (error) throw error;
  return folderId;
}

// Persists tokens after the OAuth callback. Upserts the single row.
export async function saveTokens(
  supabase: SupabaseClient,
  tokens: { refresh_token?: string; access_token: string; expires_in: number }
): Promise<void> {
  const expiry = new Date(Date.now() + tokens.expires_in * 1000).toISOString();
  const payload: Record<string, unknown> = {
    id: 1,
    access_token: tokens.access_token,
    token_expiry: expiry,
  };
  if (tokens.refresh_token) payload.refresh_token = tokens.refresh_token;
  const { error } = await supabase
    .from("google_oauth")
    .upsert(payload, { onConflict: "id" });
  if (error) throw error;
}

// Revokes a token at Google. Best-effort: a token that's already invalid/expired
// returns a 400, which we ignore — the goal is just to ensure it's no longer usable.
export async function revokeToken(token: string): Promise<void> {
  try {
    await fetch(REVOKE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ token }),
    });
  } catch {
    // Network failure shouldn't block clearing the local connection.
  }
}

// Disconnects the Google account: revokes the refresh token at Google, then clears
// the stored tokens. `drive_folder_id` is kept so reconnecting with the same Gmail
// reuses the existing "Ruslie Spring Orders" folder instead of creating a new one.
export async function disconnect(supabase: SupabaseClient): Promise<void> {
  const row = await getStoredAuth(supabase);
  const token = row?.refresh_token ?? row?.access_token;
  if (token) await revokeToken(token);
  const { error } = await supabase
    .from("google_oauth")
    .update({ refresh_token: null, access_token: null, token_expiry: null })
    .eq("id", 1);
  if (error) throw error;
}

export async function uploadImage(
  token: string,
  folderId: string,
  file: File
): Promise<string> {
  const metadata = { name: file.name, parents: [folderId] };
  const form = new FormData();
  form.append(
    "metadata",
    new Blob([JSON.stringify(metadata)], { type: "application/json" })
  );
  form.append("file", file);
  const res = await fetch(DRIVE_UPLOAD, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });
  if (!res.ok) throw new Error(`Upload failed: ${await res.text()}`);
  const json = await res.json();
  return json.id as string;
}

export async function downloadImage(
  token: string,
  fileId: string
): Promise<Response> {
  const res = await fetch(`${DRIVE_FILES}/${fileId}?alt=media`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Download failed: ${await res.text()}`);
  return res;
}

export async function deleteImage(token: string, fileId: string): Promise<void> {
  const res = await fetch(`${DRIVE_FILES}/${fileId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  // 404 means already gone — treat as success.
  if (!res.ok && res.status !== 404)
    throw new Error(`Delete failed: ${await res.text()}`);
}
