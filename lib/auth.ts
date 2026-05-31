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
