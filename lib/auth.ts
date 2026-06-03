/**
 * Admin login is username-only on screen. Supabase Auth is email-based, so we map
 * every username to a fixed internal domain that is never displayed or delivered.
 * To create an account, set the user's email in the Supabase dashboard to
 * `<username>@ruslie.local` (e.g. admin@ruslie.local).
 */
export const ADMIN_EMAIL_DOMAIN = "ruslie.local";

export function usernameToEmail(username: string): string {
  return `${username.trim().toLowerCase()}@${ADMIN_EMAIL_DOMAIN}`;
}

/**
 * Account roles. Stored in the Supabase user's `app_metadata.role` (admin-only,
 * cannot be self-edited). To make an account view-only, set its app_metadata to
 * `{ "role": "viewer" }` in the Supabase dashboard / SQL. Any account without an
 * explicit role is treated as a full `admin`.
 *
 * A `viewer` is confined to the Queue page and never sees monetary amounts, but
 * may still manage order PDFs and toggle order status.
 */
export type AppRole = "admin" | "viewer";

export function roleFromUser(
  user: { app_metadata?: Record<string, unknown> | null } | null | undefined
): AppRole {
  return user?.app_metadata?.role === "viewer" ? "viewer" : "admin";
}
