# Security posture — CardMeet

This document is a snapshot of the security stance of the CardMeet
production project (`yigwmojgsrpolycqckab.supabase.co`). It is written
in response to the late-April 2026 reporting on Vibe-Coding and
Supabase data leaks (Christopher Helm, 670 German-language sites with
publicly accessible Supabase databases).

The short version: **CardMeet does not match the leak pattern in that
report.** The leaks were caused by AI coding tools accepting
Supabase's permissive defaults — RLS off, anon role can SELECT
everything, public storage buckets that allow listing. Every one of
those defaults is explicitly closed in this project. This file
documents what's closed, what's still open by design, and what we
review on a recurring basis.

---

## Row-level security (RLS)

RLS is enabled on **every table in `public`** that holds user data:

```text
profiles, sessions, session_participants, messages, direct_messages,
friendships, reviews, notifications, lfg_posts, shops, session_alerts,
session_waitlist, push_subscriptions
```

The only exposed table without RLS is `spatial_ref_sys`, which is a
PostGIS system table containing reference-system definitions. It has
no user data — the advisor flags it as `ERROR` but it is a documented
false positive.

### High-sensitivity tables and the policies that gate them

| Table | What's locked down |
|-|-|
| `direct_messages` | INSERT only when sender + receiver are accepted friends (migration 00013). Plus zod UUID validation, 30-msg/60s rate limit and self-DM rejection in the server action. |
| `notifications` | **No INSERT policy at all.** All notifications are produced by `SECURITY DEFINER` triggers (migrations 00012, 00027–00031). A compromised client cannot forge them. |
| `friendships` | Only the requester can INSERT; either party can UPDATE; either party can DELETE. Server actions add an explicit `requester_id = auth.uid() OR addressee_id = auth.uid()` ownership guard so a future RLS regression alone can't break IDOR protection. |
| `sessions` | Host-only UPDATE / DELETE. Anyone can SELECT (sessions are deliberately public). |
| `session_participants` | INSERT / UPDATE limited to own row (`auth.uid() = user_id`). |
| `messages` (session chat) | Only joined participants and the host can SELECT or INSERT. |

### Storage

`avatars` is a public bucket. Listing was hardened on 2026-04-26
(migration 00032):

- Anon SELECT policy `Public avatar read` removed → no path enumeration.
- Four leftover wildcard policies (`Auth upload 1oj01fe_0..3`)
  granting authenticated users `INSERT/UPDATE/SELECT/DELETE` with
  `USING true` across **all** buckets removed.
- Per-user INSERT/UPDATE/DELETE policies remain, scoped to
  `(storage.foldername(name))[1] = auth.uid()::text` so a user can
  only manage objects in their own folder.
- Public read still works via the public CDN URL — `storage.objects`
  RLS is not consulted for public-bucket object GETs.

---

## SECURITY DEFINER functions

The notification system uses `SECURITY DEFINER` triggers because
`notifications` has no INSERT policy. The functions sit in `public`
because triggers can't easily live elsewhere on a Supabase project,
but their REST exposure is locked down (migration 00033):

```text
notify_on_message,
notify_on_direct_message,
notify_on_friend_request,
notify_on_friend_accepted,
notify_on_participant_joined,
notify_on_participant_status_change,
notify_on_session_deleted
  → EXECUTE revoked from PUBLIC, anon, authenticated
```

`notify_session_invite(uuid, uuid[], text, text)` is the only
notification function that is genuinely meant to be called from the
client. It is callable by `authenticated` only (PUBLIC + anon revoked
in 00034), and it host-checks the caller via `auth.uid()` before
fanning out invites.

PostGIS `st_estimatedextent` is owned by `supabase_admin`; the
project owner role cannot revoke its grants. The advisor keeps it on
the warn list — accepted (see "Known advisor findings" below).

All `SECURITY DEFINER` functions have `search_path = public,
pg_catalog` pinned (migration 00030) so a writable schema cannot
shadow tables they call.

---

## Server actions

Sensitive server actions add ownership guards in code on top of RLS,
not as a substitute for it:

- DM send: `zod.uuid().parse(receiverId)`, 2000-char cap, 30-msg/60s
  rate limit, self-DM rejection, RLS error 42501 translated into a
  human-readable German message.
- Friend remove / block: explicit `requester_id = auth.uid() OR
  addressee_id = auth.uid()`.
- Session join / leave / kick: notifications are produced by triggers
  rather than `notifications.insert(...)` — there is no path where a
  server action writes to `notifications` directly.

---

## Auth

- Email + OAuth via Supabase Auth.
- Cookies refreshed on every request through `proxy.ts`
  (Next.js 16-renamed `middleware.ts`) calling `updateSession()`.
- Public-path whitelist in `lib/supabase/middleware.ts:4` —
  `/`, `/login`, `/register`, `/callback`, `/impressum`,
  `/datenschutz`, `/sessions`. Any other path under `/(app)` requires
  a profile row, otherwise the user is bounced to `/login` or
  `/register`.

### Open: HaveIBeenPwned password check

Currently disabled. Has to be flipped manually in the Supabase
dashboard:

> Auth → Providers → Email → "Prevent use of leaked passwords"

Direct link: <https://supabase.com/dashboard/project/yigwmojgsrpolycqckab/auth/providers>

---

## Known advisor findings (intentional / accepted)

The Supabase security advisor still reports:

1. **`rls_disabled_in_public` ERROR on `spatial_ref_sys`** —
   accepted. PostGIS system table, no user data, public read is
   intended by the extension itself.
2. **`extension_in_public` WARN on `postgis`** — accepted for now.
   Moving the extension to its own schema would break every
   geography query in the app; we'll revisit when we have a downtime
   window.
3. **`auth_leaked_password_protection` WARN** — pending the manual
   dashboard toggle described above.

Everything else the advisor flagged on 2026-04-26 has been closed
by migrations 00029–00034.

---

## Reviewing this on a cadence

- Run the advisor monthly:
  <https://supabase.com/dashboard/project/yigwmojgsrpolycqckab/advisors/security>
- After every schema migration: re-run the advisor before merging.
- Anything new on the advisor that isn't in the "intentional" list
  above gets a follow-up migration in this directory and an entry in
  this file.

## Reporting a vulnerability

Email denis.kaliberda@gmail.com. Don't open public GitHub issues for
security reports.
