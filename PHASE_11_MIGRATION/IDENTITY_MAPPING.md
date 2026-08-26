# IDENTITY_MAPPING.md (Phase 11.4)

Separation principle: BUSINESS IDENTITY (the worker/staff record) ≠ AUTHENTICATION IDENTITY (the login principal).

## Management-V1 identity architecture (already implemented)

```
Supabase auth.users(id)  ──1:1──▶  profiles(id = auth.users.id)
        │                              │
   credentials/JWT                 business data
   (provider-managed,              role/status/rate/balance
    never exported)
```

## Rules

1. **No plaintext/password hashes migrate.** Ever. External Django password hashes are useless and forbidden inputs.
2. Business identity = `profiles.phone` (unique, BR-004) — the human-meaningful key.
3. Authentication identity = Supabase `auth.users` entry linked to `profiles.id`.
4. Association procedure when populating identities:
   - Admin invites user by email/phone in Supabase Auth, OR user self-signups (FR-001 → PENDING).
   - Profile row is created with `id = auth.users.id` automatically at signup (AuthService).
   - For pre-existing business profiles without logins: create auth user, then set `profiles.id` to match within one transaction (admin operation, audited REGISTER/LIFECYCLE event).
5. Session tokens/secrets of any prior system are invalid inputs by definition.

## Status

NOT APPLICABLE for execution now (zero external identities exist). This contract governs ALL future identity population, including the very first staff account (created via Supabase dashboard invite → profile promoted to STAFF/SUPERADMIN through an audited RPC path).
