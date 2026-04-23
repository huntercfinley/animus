# Animus Security Audit Report

**Date:** 2026-04-21
**Scope:** Full-stack adversarial audit — frontend (React Native/Expo), backend (16 Supabase Edge Functions), database (31 migrations, RLS, RPCs), infrastructure, dependencies, third-party integrations
**Methodology:** Three parallel red-team sweeps (frontend, backend, database/infra), findings deduplicated and cross-referenced

---

## 1. Vulnerability Summary

| Severity | Count |
|----------|-------|
| CRITICAL | 3 |
| HIGH | 6 |
| MEDIUM | 12 |
| LOW | 9 |
| **Total** | **30** |

---

## 2. Detailed Findings

---

### CRITICAL-1: RPC Functions Callable by Any Authenticated User (Infinite Lumen Minting)

**Severity:** CRITICAL
**Affected files:**
- `supabase/migrations/20260414000001_lumen_spend_rpc.sql`
- `supabase/migrations/20260414000002_lumen_earn_rpc.sql`
- `supabase/migrations/20260414000007_lumen_purchase_atomic.sql`
- `supabase/migrations/20260414000008_lumen_monthly_grant.sql`
- `supabase/migrations/20260414000010_lumen_ad_credit_rpc.sql`
- `supabase/migrations/20260414000011_consume_ad_credit_rpc.sql`
- `supabase/migrations/20260414000020_lumen_refund_rpc.sql`
- `supabase/migrations/20260414000023_rate_limits_rpc.sql`

**Description:** All eight `SECURITY DEFINER` RPCs are created in the `public` schema with `GRANT EXECUTE TO service_role` but **no `REVOKE EXECUTE FROM public, anon, authenticated`**. PostgreSQL functions in the `public` schema are executable by the `public` role by default. Supabase's `authenticated` role inherits from `public`. Any authenticated user can call these RPCs directly via `supabase.rpc(...)`.

**Exploitation scenario:**
```javascript
// User calls from any client or curl:
supabase.rpc('lumen_refund_atomic', {
  p_user_id: 'my-user-id',
  p_amount: 999999,
  p_type: 'refund_go_deeper'
})
// Result: 999,999 Lumen credited for free
```

**Impact:** Complete compromise of the Lumen economy. Any authenticated user can mint unlimited currency, drain other users' balances, bypass all rate limits, and access all paid features for free.

**Fix:**
```sql
REVOKE EXECUTE ON FUNCTION public.lumen_spend_atomic FROM public, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.lumen_refund_atomic FROM public, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.lumen_earn_shadow FROM public, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.lumen_purchase_atomic FROM public, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.lumen_monthly_grant FROM public, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.lumen_ad_credit FROM public, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.consume_ad_credit FROM public, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.check_and_increment_rate_limit FROM public, anon, authenticated;
```

---

### CRITICAL-2: RPCs Accept Arbitrary p_user_id With No Auth Verification

**Severity:** CRITICAL
**Affected files:** Same 8 RPCs as CRITICAL-1.

**Description:** Even after fixing CRITICAL-1, the RPCs accept `p_user_id` as a free parameter and never check `auth.uid() = p_user_id`. They're designed for `service_role` edge functions, but the parameter design means any caller with execute permission can target any user. If a future migration accidentally re-grants execute, the vulnerability reopens.

**Exploitation scenario:** User A calls `lumen_spend_atomic` with User B's `p_user_id` to drain their balance to zero.

**Impact:** Cross-user balance manipulation, total economy compromise.

**Fix:** Add defense-in-depth inside each RPC:
```sql
IF auth.uid() IS NOT NULL AND auth.uid() != p_user_id THEN
  RAISE EXCEPTION 'forbidden';
END IF;
```
This allows `service_role` (where `auth.uid()` is NULL) to call with any user_id, but blocks direct client calls targeting other users.

---

### CRITICAL-3: Lumen Purchase Has No Server-Side Receipt Validation

**Severity:** CRITICAL
**Affected file:** `supabase/functions/lumen-purchase/index.ts:40-76`

**Description:** The function accepts `pack`, `transaction_id`, and `product_id` from the client and credits Lumen. It never verifies the transaction with Apple App Store, Google Play, or RevenueCat. The only guard is idempotency on `transaction_id`, but an attacker fabricates new IDs each time.

**Exploitation scenario:**
```bash
curl -X POST .../functions/v1/lumen-purchase \
  -H "Authorization: Bearer <valid_jwt>" \
  -d '{"pack":"mega","transaction_id":"FAKE-1234","product_id":"animus_lumen_mega"}'
# 800 Lumen credited. Repeat with new fake IDs.
```

**Impact:** Unlimited free Lumen for any authenticated user. All paid features become free. Direct revenue loss.

**Fix:** Validate `transaction_id` against Apple's StoreKit 2 Server API (`/inApps/v1/transactions/{transactionId}`) or RevenueCat's `/v1/receipts` before crediting. Alternatively, use a webhook-driven model where only a verified RevenueCat webhook can credit Lumen.

---

### HIGH-1: Personal Dream Data in Public Git Repository

**Severity:** HIGH
**Affected files:**
- `data/chatgpt-export/conversations-000.json` through `-005.json` (114MB)
- `data/chatgpt-export/dream-extractions.json`
- `data/db_dreams.json` (137KB)

**Description:** The repo is **PUBLIC** (`huntercfinley/animus`). These tracked files contain Hunter's personal ChatGPT conversation exports with intimate dream narratives, Jungian shadow work, and psychological analysis. `db_dreams.json` contains actual dream database records with UUIDs and dates that can be used to construct URLs to the public storage buckets.

**Impact:** Hunter's intimate psychological data is publicly accessible on GitHub right now. Dream IDs from `db_dreams.json` can construct URLs to the public `dream-images` bucket.

**Fix:** Immediately:
1. `git rm --cached data/chatgpt-export/ data/db_dreams.json`
2. Add `data/chatgpt-export/` and `data/db_dreams.json` to `.gitignore`
3. Use `git filter-repo` or BFG Repo-Cleaner to purge from history
4. Force push

---

### HIGH-2: All Edge Functions Deployed with --no-verify-jwt

**Severity:** HIGH
**Affected file:** `package.json:14-15`

**Description:** Both deploy scripts use `--no-verify-jwt`, disabling Supabase's gateway-level JWT verification. Functions still check auth via `getUser()`, but unauthenticated requests reach function runtime, consuming compute. This is a DoS vector and removes defense-in-depth.

**Fix:** Remove `--no-verify-jwt` from both deploy scripts.

**REVERTED 2026-04-22:** The fix broke all user dream saves. Supabase's gateway JWT verifier does not support the ES256 asymmetric algorithm used by the new signing-key system (legacy JWTs disabled 2026-04-12). Every authenticated request returned `UNAUTHORIZED_UNSUPPORTED_TOKEN_ALGORITHM` at the gateway before reaching function code. `--no-verify-jwt` restored. Function-level `supabase.auth.getUser()` still enforces auth (supports ES256). Re-apply this fix once Supabase adds ES256 gateway support, or switch to per-function `verify_jwt` in `supabase/config.toml` once that also supports ES256.

---

### HIGH-3: Ad Credit Endpoint Lacks Server-Side Ad Verification

**Severity:** HIGH
**Affected file:** `supabase/functions/lumen-ad-credit/index.ts:13-56`

**Description:** Grants ad credits without verifying an ad was actually watched. Only protection is a daily cap (3/day). A user can call the endpoint directly without watching any ad.

**Fix:** Implement AdMob Server-Side Verification (SSV). Only credit after receiving the SSV callback.

---

### HIGH-4: Hardcoded Admin UUID in Public Client Bundle

**Severity:** HIGH
**Affected files:** `constants/admin.ts:1-11`, `contexts/SubscriptionContext.tsx:40-44`

**Description:** Hunter's database UUID (`a872fa8e-c789-4eb1-84b9-671981b5fd60`) is hardcoded in the public repo. The client-side premium bypass grants `isPremium = true` locally without server verification.

**Impact:** Admin identity exposed. Client-side premium bypass inconsistent with server-side checks.

**Fix:** Move admin status to database (`is_admin` column). Remove UUID from source code.

---

### HIGH-5: Client-Side Usage Limits Writable by User

**Severity:** HIGH
**Affected files:** `hooks/useUsageLimits.ts:1-77`

**Description:** The `usage_limits` table has INSERT and UPDATE RLS policies for authenticated users. A user can directly UPDATE their rows to set `count = 0`, resetting all client-side limits. Or bypass the client entirely and call edge functions directly.

**Fix:** Revoke INSERT/UPDATE on `usage_limits` from `authenticated`. Move all limit enforcement server-side via `service_role` RPCs.

---

### HIGH-6: Public Storage Buckets Expose Dream Images Without Auth

**Severity:** HIGH
**Affected file:** `supabase/migrations/20260327000000_initial_schema.sql:285-296`

**Description:** `dream-images`, `report-images`, `avatars`, and `user-photos` buckets are all `public = true` with no auth check in SELECT policies. Anyone with a URL can access any user's dream images, reports, avatars, and appearance photos.

**Fix:** Set sensitive buckets to `public = false`. Use signed URLs with short expiry for client display.

---

### MEDIUM-1: Sentry sendDefaultPii with Login Identifiers

**Severity:** MEDIUM
**Affected file:** `app/_layout.tsx:21`

**Description:** `sendDefaultPii: true` + `tracesSampleRate: 1.0` sends user IPs, device info, and potentially dream content in error contexts to Sentry servers. Login identifiers are sent in extras at `AuthContext.tsx:80`.

**Fix:** Set `sendDefaultPii: false`, reduce `tracesSampleRate` to 0.2, add `beforeSend` hook to strip PII.

---

### MEDIUM-2: Rate Limit Fails Open on Database Error

**Severity:** MEDIUM
**Affected files:** `supabase/functions/interpret-dream/index.ts:157-158`, `supabase/functions/shadow-exercise/index.ts:43`

**Description:** If the rate limit RPC returns a non-rate-limit error (e.g., connection pool exhaustion), the function logs the error and continues processing. Under database stress, all rate limiting silently disables.

**Fix:** Fail closed — return 503 on any rate limit RPC error, not just `rate_limit_exceeded`.

---

### MEDIUM-3: Raw AI Response Leaked on Parse Failure

**Severity:** MEDIUM
**Affected file:** `supabase/functions/interpret-dream/index.ts:212`

**Description:** When AI output fails JSON parsing, the raw response (including potential system prompt echoes) is returned to the client: `{ error: 'Failed to parse AI response', raw: rawContent }`.

**Fix:** Remove `raw` field from error response. Log server-side only.

---

### MEDIUM-4: Error Responses Leak Internal Details

**Severity:** MEDIUM
**Affected files:** `interpret-dream/index.ts:212,227`, `dream-connection/index.ts:72-73`, `shadow-exercise/index.ts:61`, `subscription-sync/index.ts:53`

**Description:** Multiple functions return raw error bodies from external services (Anthropic, RevenueCat) to the client, revealing internal API configuration and subscriber data.

**Fix:** Return generic error messages. Log details server-side only.

---

### MEDIUM-5: Prompt Injection in AI Functions

**Severity:** MEDIUM
**Affected files:** `interpret-dream/index.ts`, `shadow-exercise/index.ts:49-51`, `go-deeper/index.ts:113`

**Description:** User-controlled text interpolated directly into AI prompts. The `symbols` array in shadow-exercise is unvalidated — an attacker can inject arbitrary prompt content.

**Fix:** Validate symbols (short alphanumeric strings, max 50 chars). Accept that prompt injection in user messages is partially mitigable; focus on ensuring no sensitive data leaks in responses (see MEDIUM-3).

---

### MEDIUM-6: Wildcard CORS on All Edge Functions

**Severity:** MEDIUM
**Affected files:** All 16 edge functions.

**Description:** `Access-Control-Allow-Origin: *` on every response. Lower risk for mobile-only, but increases blast radius of any token leak.

**Fix:** Restrict to specific origins or use `null` for mobile-only.

---

### MEDIUM-7: Username Enumeration / Broken RLS Lookup

**Severity:** MEDIUM
**Affected file:** `contexts/AuthContext.tsx:73-77`

**Description:** Username-to-email lookup queries `profiles` with user-scoped client. If unauthenticated, RLS blocks the query (feature is broken). If working, it enables username enumeration via different error messages.

**Fix:** Move username resolution to a server-side `SECURITY DEFINER` RPC that returns only success/failure.

---

### MEDIUM-8: OAuth Flow Without PKCE or State Validation

**Severity:** MEDIUM
**Affected file:** `contexts/AuthContext.tsx:106-137`

**Description:** Google OAuth extracts tokens from URL fragments without `state` parameter validation. No PKCE. Risk of CSRF-based account linking attacks.

**Fix:** Use Supabase's built-in `signInWithOAuth` with PKCE enabled. Validate `state` parameter.

---

### MEDIUM-9: Weak Password Policy

**Severity:** MEDIUM
**Affected files:** `app/(auth)/sign-up.tsx:35-36`, `supabase/config.toml:175`

**Description:** Minimum 6 characters, no complexity requirements. Below NIST SP 800-63B recommendation.

**Fix:** Increase to 8 characters. Set `password_requirements = "letters_digits"`.

---

### MEDIUM-10: No File Size/Type Limits on Original Storage Buckets

**Severity:** MEDIUM
**Affected file:** `supabase/migrations/20260327000000_initial_schema.sql:285-288`

**Description:** `dream-images`, `dream-audio`, `report-images`, `avatars` have no `file_size_limit` or `allowed_mime_types`. Users could upload arbitrary files up to 50MB, potentially using public bucket URLs for malware/phishing hosting.

**Fix:** Add file size limits and MIME type restrictions to each bucket.

---

### MEDIUM-11: shadow-exercise No dream_id Ownership Check

**Severity:** MEDIUM
**Affected file:** `supabase/functions/shadow-exercise/index.ts:46-69`

**Description:** Accepts `dream_id` without verifying the authenticated user owns that dream. Creates exercises linked to other users' dreams.

**Fix:** Verify dream ownership before inserting.

---

### MEDIUM-12: lumen_transactions / daily_rate_limits / ad_credits Missing Write Revocations

**Severity:** MEDIUM
**Affected files:** Migrations for these three tables.

**Description:** RLS deny-by-default blocks writes (no INSERT policy = deny), but no explicit `REVOKE INSERT/UPDATE/DELETE FROM authenticated`. Fragile — a single accidental policy addition breaks the protection.

**Fix:** Add explicit revocations as defense-in-depth.

---

### LOW-1: Unencrypted Offline Dream Database

**Severity:** LOW
**Affected file:** `lib/offline.ts:1-57`

**Description:** SQLite database stores dream transcripts in plaintext. Accessible on jailbroken devices.

---

### LOW-2: Production Console Logging

**Severity:** LOW
**Affected files:** `AuthContext.tsx:36,79`, `lib/ai.ts:90,95,100,132`

**Description:** `console.error` not wrapped in `__DEV__` checks. Accessible via device logs.

---

### LOW-3: Vulnerable @xmldom/xmldom Dependency

**Severity:** LOW
**Description:** Transitive dependency with XML injection CVE. Not directly exploitable in this app.

---

### LOW-4: Delete Account Without Re-Authentication

**Severity:** LOW
**Affected file:** `app/settings.tsx:100-134`

**Description:** Two button taps to permanently delete account. No password re-entry required.

---

### LOW-5: archetype-snapshot / suggest-world-entry No Rate Limiting

**Severity:** LOW
**Description:** No rate limits on these endpoints. No AI calls, but potential database bloat.

---

### LOW-6: Redundant lumen-spend Edge Function (Double-Charge Risk)

**Severity:** LOW
**Affected file:** `supabase/functions/lumen-spend/index.ts`

**Description:** Generic spend endpoint exists alongside feature functions that handle their own spending. Potential double-charging if client calls both.

---

### LOW-7: Email Confirmation Disabled

**Severity:** LOW
**Affected file:** `supabase/config.toml:209`

**Description:** Users can sign up without email verification. Enables account squatting.

---

### LOW-8: Sentry tracesSampleRate: 1.0

**Severity:** LOW
**Description:** 100% trace sampling. Performance overhead and Sentry cost at scale.

---

### LOW-9: GoogleService-Info.plist in Git

**Severity:** LOW
**Description:** iOS Google Services config in public repo. Low risk (client IDs are public by design).

---

## 3. Attack Chains

### Chain A: Infinite Lumen via Direct RPC (CRITICAL-1 + CRITICAL-3)
1. Attacker reads public source code on GitHub
2. Finds `lumen_refund_atomic` RPC function signature
3. Calls `supabase.rpc('lumen_refund_atomic', { p_user_id: their_id, p_amount: 99999, p_type: 'refund_go_deeper' })`
4. Gets 99,999 Lumen credited instantly
5. Uses unlimited Go Deeper, Image Gen, Insights, Connections forever

### Chain B: Cross-User Balance Drain (CRITICAL-1 + CRITICAL-2 + HIGH-4)
1. Attacker finds Hunter's UUID from `constants/admin.ts` in the public repo
2. Calls `supabase.rpc('lumen_spend_atomic', { p_user_id: 'a872fa8e-...', p_amount: 9999, p_type: 'spend_go_deeper' })`
3. Drains the admin account's Lumen to zero

### Chain C: Dream Content Exfiltration (HIGH-1 + HIGH-4 + HIGH-6)
1. Attacker finds Hunter's UUID from `constants/admin.ts`
2. Gets dream IDs from `data/db_dreams.json` (public in git)
3. Constructs URLs: `{supabase_url}/storage/v1/object/public/dream-images/a872fa8e-.../{dream_id}.png`
4. Downloads all dream images without any authentication
5. Cross-references with ChatGPT exports (also public) for full dream narratives

### Chain D: Rate Limit Bypass + API Credit Burn (MEDIUM-2 + HIGH-2)
1. Attacker floods unauthenticated requests (possible because `--no-verify-jwt`)
2. This exhausts DB connection pool
3. Rate limit RPC starts failing with connection errors
4. Rate limiting fails open (continues processing)
5. Attacker sends authenticated interpret-dream requests
6. Burns through Claude/Gemini API credits without limits

### Chain E: Fake Purchase + Prompt Extraction (CRITICAL-3 + MEDIUM-3)
1. Attacker calls lumen-purchase with fabricated transaction IDs for unlimited Lumen
2. Uses unlimited Go Deeper conversations to probe for prompt extraction
3. Crafts adversarial dream transcripts that cause JSON parse failures
4. Receives raw AI output including system prompt via the `raw` field in error response

---

## 4. Secure Design Recommendations

### Immediate (Before App Store Submission)
1. **Deploy RPC REVOKE migration** — Fixes CRITICAL-1, the most severe finding
2. **Remove personal data from git** — `data/chatgpt-export/` and `db_dreams.json` via filter-repo + force push
3. **Remove `--no-verify-jwt`** from deploy scripts
4. **Remove hardcoded admin UUID** from `constants/admin.ts`
5. **Set `sendDefaultPii: false`** in Sentry init

### Before First Paying Users
6. **Add receipt validation** to `lumen-purchase` (Apple StoreKit 2 or RevenueCat server-side)
7. **Add AdMob SSV** to `lumen-ad-credit`
8. **Fail rate limits closed** — return 503 on any RPC error
9. **Sanitize all error responses** — remove raw AI output and external service error bodies
10. **Make dream-images/user-photos buckets private** with signed URLs

### Architectural Improvements
11. **Move all limit enforcement server-side** — revoke client writes on `usage_limits`
12. **Add auth.uid() checks inside RPCs** as defense-in-depth
13. **Add explicit REVOKE** on `lumen_transactions`, `daily_rate_limits`, `ad_credits` tables
14. **Enable PKCE** for OAuth flows
15. **Add file size/MIME limits** to original storage buckets
16. **Enable email confirmation** for production

---

## What's Done Well

The codebase demonstrates strong security awareness in several areas:

- **Token storage** uses `expo-secure-store` (Keychain/Keystore)
- **Column-level grants** correctly lock `subscription_tier` and `lumen_balance` from client writes (migration 19)
- **Atomic Lumen operations** use `FOR UPDATE` locks preventing race conditions
- **Unique indexes** (`idx_lumen_tx_shadow_earn_unique`, `idx_lumen_tx_monthly_grant_unique`) prevent double-credit at the database level
- **SSRF protection** in `analyze-appearance` validates photo URLs against Supabase URL prefix
- **Input size limits** on transcript (10KB), image_prompt (4KB), style_prefix (200ch), message (2KB)
- **Refund on failure** — all AI-consuming functions refund Lumen if the API call fails
- **Server-side spending** — Lumen costs enforced in edge functions, not trusted from client
- **Dream ownership verification** in generate-image, go-deeper, dream-connection, dream-insights
- **RLS enabled on all tables** with proper `auth.uid()` scoping
- **No `eval()`, `dangerouslySetInnerHTML`, or `innerHTML`** in the React Native codebase
- **RevenueCat subscription verification** via server-side API call in `subscription-sync`
