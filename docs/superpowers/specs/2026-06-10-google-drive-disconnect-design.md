# Google Drive disconnect — design

## Problem

The queue page can connect Google Drive (`/api/google/connect`) but has no way to
disconnect. The "Connect Google Account" banner is gated on `connected`
(`isConnected()` = a `refresh_token` exists in `google_oauth`). Once connected,
the banner disappears and there is no UI to reset the connection — the only way to
re-authorize is to edit the database by hand.

## Goal

Add a Disconnect action to the queue page that revokes access at Google and clears
the stored tokens, making the Connect banner reappear.

## Behaviour

1. **Revoke at Google.** Call `https://oauth2.googleapis.com/revoke?token=<refresh_token>`.
   Best-effort: an already-invalid token is treated as success (we still clear locally).
2. **Clear local tokens.** `update google_oauth set refresh_token=null,
   access_token=null, token_expiry=null where id=1`.
3. **Keep `drive_folder_id`.** Reconnecting with the same Gmail reuses the existing
   "Ruslie Spring Orders" folder instead of creating a duplicate.

## Components

### `lib/google.ts`
- `revokeToken(token: string): Promise<void>` — POST to the revoke endpoint;
  ignore non-OK responses (token may already be invalid).
- `disconnect(supabase): Promise<void>` — read stored auth, revoke the
  `refresh_token` (best-effort), then null the token columns, keeping
  `drive_folder_id`.

### `app/api/google/disconnect/route.ts`
- `POST`. Auth gate identical to the image route: must be logged in; viewers are
  forbidden (`roleFromUser(user) === "viewer"` → 403). Calls `disconnect`,
  returns `{ ok: true }`, or `500 { error }` on failure.

### `components/QueueClient.tsx`
- Mirror the `connected` prop into local state so the UI flips immediately after
  disconnect (no page refresh).
- When connected AND `canManagePdf`, render a slim status row in the same slot the
  connect banner uses: "Google Drive terhubung" + a **Putuskan** button.
- The button confirms ("Putuskan koneksi Google Drive?"), POSTs to the route, and
  on success sets local state to disconnected — which reveals the existing Connect
  banner. Failures surface in the existing page-level error banner.

## Edge cases

- The app uses the `drive.file` scope. After revoke + reconnect with the **same**
  Google account, access to the previously-created folder persists, so folder reuse
  works. Reconnecting with a **different** account would leave `drive_folder_id`
  pointing at an inaccessible folder — out of scope (intent is same Gmail).

## Out of scope (YAGNI)

- Auto-healing when the saved folder is missing/inaccessible.
- Disconnect UI anywhere other than the queue page.
- Confirmation toast/animation beyond the existing inline banners.
