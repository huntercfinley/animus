# Lumen Economy — Spec (draft)

> Status: scoping doc. Reviewed by Hunter + Matt before implementation.
> Build sequence: archetype assignment ships first, Lumen layers on after.

## Overview

Lumen is Animus's earned/purchased currency. It replaces the current per-feature daily/monthly limits with one unified meter the user understands at a glance. **The inner work (shadow exercises) earns it; the externalizations (Go Deeper, imagery, insights, connections) spend it.**

Thematically: doing your psychological work is always free. Asking the app to produce interpretive artifacts on your behalf has a cost. That's Jung.

## Core philosophy

- **Shadow work is free** — for all users, always. It is the only way to earn Lumen.
- **Dream recording and initial interpretation are free** — entry-level value is never gated.
- **Go Deeper is premium-gated** — free users access it via Lumen spend OR rewarded ad (3/day cap) OR premium subscription.
- **Image generation, dream insights, dream connections** — Lumen-spend for free users, unmetered for premium.
- **No streaks, no XP, no daily reminders** — Lumen represents depth, not consistency. Consistent with the existing "no gamification" voice rule.

## Starting balance

- **New user on signup:** 100 Lumen (enough to try every feature a few times).
- **Premium users:** balance still tracked cosmetically but all features are free and unmetered. Purchased Lumen persists across premium sub changes.

## Earning

| Action | Reward | Cap |
|---|---|---|
| Shadow exercise completed (response ≥ 100 chars) | +10 Lumen | 3/day |
| Rewarded ad watched | Single-use Go Deeper credit (not Lumen balance) | 3/day |
| Dream recording | 0 Lumen | n/a — involuntary |
| Daily app open | 0 Lumen | n/a — conflicts with "no habit mechanics" |

**Why cap shadow earn at 3/day:** prevents grinding; keeps each exercise meaningful; matches the existing `shadow_exercise` daily limit type.

**Why 100-char minimum on shadow earn:** prevents users typing "ok" to farm Lumen.

**Why ads credit Go Deeper directly instead of adding to Lumen:** cleaner UX ("watch ad to unlock this Go Deeper" is more legible than "watch ad to earn 10 Lumen which you then spend"), and it caps ad farming at the 3/day ceiling regardless of balance.

## Spending (tentative costs)

| Action | Cost | Notes |
|---|---|---|
| Go Deeper (one exchange pair — question + reply) | 10 Lumen | Cheapest; core drive to engage |
| Dream connection | 15 Lumen | Connects 2 dreams via AI analysis |
| Image generation | 20 Lumen | Imagen 4 Fast ($0.02 raw cost) |
| Image refinement | 20 Lumen | Same as gen |
| Dream insights (weekly/monthly report) | 25 Lumen | Larger model call, higher value |

**Pricing check:** A $4.99 pack at 150 Lumen = ~3.3¢/Lumen. A Go Deeper at 10 Lumen = ~33¢. Raw API cost is ~$0.01. Margin accounts for hosting, Apple's 15–30% cut, and the free tier (ads + shadow work earns) that power users subsidize.

## Premium tier interaction

Premium is part of the Lumen economy, not an escape hatch from it. The flagship benefit is a monthly Lumen grant, not "unlimited everything." This aligns the value proposition with the economy and removes the split between "metered free" and "unmetered premium" experiences.

- **Monthly grant:** 1,500 Lumen auto-deposited on the subscription renewal date. At the $9.99/mo price anchor, premium buys ~2× the per-dollar value of the largest IAP pack — premium is always the best deal.
- **Rollover cap:** Unused Lumen rolls over up to 2× the monthly grant (max stockpile 3,000 before the next grant is capped). Rewards consistent use without enabling infinite hoarding.
- **Unmetered shadow work + dream recording:** These remain free for everyone; premium doesn't need to "unlock" them. Marketing copy: *"Unlimited shadow work. Unlimited dream recording. 1,500 Lumen every month for the deeper work."*
- **Downgrade behavior:** Accumulated Lumen persists when a user cancels premium. The monthly grant simply stops. Cancel feels friendly, not punishing.
- **Purchased Lumen** is always separate from the grant and never expires, regardless of subscription status.
- **Premium day-one balance:** 100 Lumen signup grant + 1,500 first monthly grant = 1,600 Lumen.

## Rewarded ads

- **Provider:** Google AdMob via `react-native-google-mobile-ads`.
- **Placement:** Go Deeper only. Never interrupt the dream recording or shadow work flows.
- **Cap:** 3 free Go Deepers per day via ad credit.
- **UX:** When user taps Go Deeper with insufficient Lumen, show a bottom sheet with three options:
  1. **Watch a short reflection** (if ad_credits_remaining > 0) → "Watch a short ad to go deeper ({X}/3 remaining today)"
  2. **Spend Lumen** (if balance ≥ 10)
  3. **Buy a Lumen pack** → opens shop
- **Privacy:** ATT (App Tracking Transparency) prompt required on iOS 14+. Handle decline gracefully — ads still serve, just non-personalized.
- **Integrity:** Use AdMob SSV (server-side verification) so the ad reward can't be spoofed client-side. The `lumen-ad-credit` edge function validates the SSV token before issuing the credit.

## IAP — Lumen packs

- **Provider:** `react-native-iap` (Expo SDK 55 compatible; `expo-in-app-purchases` is deprecated).
- **Apple's cut:** 30% first year, 15% after (Small Business Program eligible — Reality Suites qualifies, so 15% from day 1).

| Pack | Price (USD) | Lumen | Value | SKU |
|---|---|---|---|---|
| The Initiate's Pouch | $1.99 | 50 | — | `com.realitysuites.animus.lumen_small` |
| The Seeker's Purse | $4.99 | 150 | **BEST VALUE** | `com.realitysuites.animus.lumen_medium` |
| The Alchemist's Coffer | $9.99 | 350 | — | `com.realitysuites.animus.lumen_large` |
| The Philosopher's Stone | $19.99 | 800 | — | `com.realitysuites.animus.lumen_mega` |

**Apple naming risk:** App Store reviewers sometimes reject IAP with thematic names that don't clearly describe what they unlock. If rejected, fall back to functional names ("50 Lumen", "150 Lumen") in the IAP metadata and keep the Jungian names as display overrides in-app.

**Receipt validation:** server-side via `lumen-purchase` edge function calling Apple's `verifyReceipt` endpoint. Never trust client-side receipts.

## Schema changes

### `profiles` — add column

```sql
ALTER TABLE profiles
  ADD COLUMN lumen_balance INTEGER NOT NULL DEFAULT 100;
```

### `lumen_transactions` — new table (append-only audit ledger)

```sql
CREATE TABLE lumen_transactions (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type                 TEXT NOT NULL CHECK (type IN (
    'initial_grant',
    'shadow_earn',
    'purchase_small',
    'purchase_medium',
    'purchase_large',
    'purchase_mega',
    'spend_go_deeper',
    'spend_image_gen',
    'spend_image_refine',
    'spend_insights',
    'spend_connection',
    'admin_grant'
  )),
  amount               INTEGER NOT NULL,  -- positive earn, negative spend
  balance_after        INTEGER NOT NULL,
  related_dream_id     UUID REFERENCES dreams(id),
  related_exercise_id  UUID REFERENCES shadow_exercises(id),
  metadata             JSONB,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX lumen_transactions_user_created_idx
  ON lumen_transactions(user_id, created_at DESC);
```

**Invariant:** `lumen_transactions` is append-only. Never UPDATE or DELETE rows. `profiles.lumen_balance` must always equal the sum of `amount` across all a user's transactions — enforced by the edge functions below.

### `usage_limits` — deprecate most types

- Keep `shadow_exercise` for the 3/day shadow earn cap.
- Add `ad_credit_go_deeper` for the 3/day ad credit cap.
- Remove (after migration): `go_deeper`, `image_refinement`, `dream_insights`, `dream_connection` — these all become Lumen spends. Keep `image_generation` temporarily during rollout as a safety net.

## Edge functions

### New: `lumen-spend` (atomic balance check + deduct)

```
POST /functions/v1/lumen-spend
Body: { action: 'go_deeper' | 'image_gen' | 'image_refine' | 'insights' | 'connection',
        dream_id?: string, exercise_id?: string }

200 { new_balance: number, transaction_id: string }
402 { error: 'insufficient_lumen', current_balance: number, required: number }
```

Implementation: Postgres transaction that reads `profiles.lumen_balance FOR UPDATE`, checks sufficiency, deducts, inserts the transaction row, commits. This prevents race conditions where a user double-spends the same Lumen.

### New: `lumen-earn-shadow`

```
POST /functions/v1/lumen-earn-shadow
Body: { exercise_id: string }

200 { new_balance: number, earned: number }   // earned: 0 if at cap
```

Called by the client after a shadow exercise is archived with a ≥100-char response. Enforces the 3/day cap server-side (don't trust client count). Returns `earned: 0` at cap so the toast reads "tended enough for today" instead of "+10 Lumen."

### New: `lumen-ad-credit`

```
POST /functions/v1/lumen-ad-credit
Body: { ad_reward_token: string, action: 'go_deeper' }

200 { credits_remaining_today: number }
```

Validates AdMob SSV token, increments `ad_credit_go_deeper` in `usage_limits`, returns the remaining count. This does NOT touch Lumen balance — the credit is a single-use bypass on the next Go Deeper call.

### New: `lumen-purchase`

```
POST /functions/v1/lumen-purchase
Body: { receipt: string, product_id: string, transaction_id: string }

200 { new_balance: number, lumen_added: number }
400 { error: 'invalid_receipt' | 'duplicate_transaction' | 'product_mismatch' }
```

Calls Apple's `verifyReceipt` endpoint, checks transaction_id hasn't been processed before (store in metadata), credits Lumen, inserts ledger row. Idempotent on transaction_id.

### Modified: existing feature functions

`go-deeper`, `generate-image`, `dream-insights`, `dream-connection` each get a pre-flight check:

1. If user is premium → proceed.
2. Else, call `lumen-spend` for the cost.
3. On 402 → return 402 to client with a payload the client translates to the "out of Lumen / watch ad / buy pack" sheet.
4. On 200 → proceed with the feature.
5. For `go-deeper` specifically: also check `ad_credit_go_deeper` first — if a credit is available, consume it instead of Lumen.

## Client UX

### Profile screen
- Lumen balance displayed prominently below the dream count pill.
- Visual: glowing serif number with "Lumen" subtitle.
- Tap → opens Lumen shop + transaction history.

### Feature interception modal (when balance insufficient)
- Title: "The depths require Lumen"
- Options (stacked):
  1. **Watch a reflection** (only if Go Deeper + ad credits remaining) — "{X}/3 remaining today"
  2. **Spend {cost} Lumen** — disabled if balance < cost
  3. **Buy a Lumen pack** — opens shop
  4. **Cancel**

### Shop sheet
- Four packs styled as "offerings" using the Jungian naming.
- Each pack shows: name, Lumen amount, price, value (cost per Lumen).
- "Best Value" badge on The Seeker's Purse.
- **Restore Purchases** button (Apple requires it for all IAP apps).
- Link to transaction history.

### Shadow earn feedback
- On archive with earn: subtle toast "+10 Lumen — the work continues" at the bottom of screen.
- On archive at cap: toast "You've tended the inner work enough today. Return tomorrow."
- Never a celebratory animation — subdued, contemplative (consistent with voice).

## Anti-abuse

- Shadow earn gated by 3/day cap + ≥100-char response minimum.
- Ad credits gated by AdMob SSV + 3/day cap.
- IAP receipts validated server-side with dedup on transaction_id.
- `lumen_transactions` is append-only; the edge functions are the only writers.
- Admin grants (`admin_grant` type) reserved for customer-support credits — no UI, SQL-only.

## Finalized decisions (2026-04-13)

All open questions from the scoping phase are resolved.

1. **Go Deeper cost unit:** 10 Lumen per exchange pair (one user question + one AI reply). Maps to the current conversation UX; cleaner than per-turn.
2. **Onboarding grace:** None beyond the 100 Lumen starting balance. 100 Lumen = 10 Go Deepers, enough to feel the feature without a separate grace pool.
3. **Image gen transition:** Full conversion to Lumen. The 10/month free tier is retired at launch. Simpler, avoids dual accounting.
4. **Pack naming:** Ship with the Jungian names. Keep functional fallback SKUs (`50 Lumen`, `150 Lumen`, etc.) pre-prepared in App Store Connect so we can hot-swap metadata if Apple rejects.
5. **Ad placement:** Go Deeper only at launch. Revisit ad-unlocked image gen once we see AdMob fill rate + ATT decline rate in production.
6. **Lumen drip subscription:** Deferred. Premium is the drip (see Premium tier interaction).
7. **Premium tier model:** Premium is inside the Lumen economy via a 1,500 Lumen/month grant with 2× rollover cap. See Premium tier interaction for mechanics.

## Build sequence

1. **Archetype assignment** (separate feature, no Lumen dependency) — ships first.
2. **Schema migration** — `profiles.lumen_balance`, `lumen_transactions` table, `usage_limits` cleanup.
3. **Edge functions** — `lumen-spend`, `lumen-earn-shadow`. Test against Carl account.
4. **Wire into Go Deeper first** — single feature, easy rollback if economy is wrong.
5. **AdMob rewarded ads** — package install, ATT setup, SSV config, `lumen-ad-credit` function.
6. **IAP** — `react-native-iap` install, SKUs in App Store Connect, `lumen-purchase` function, shop UI.
7. **Migrate remaining features** — image gen, insights, connection, refinement.
8. **Retire deprecated usage_limits types.**
9. **Full launch** — update app store listing, marketing copy for Lumen + pack offerings.

## Risks / unknowns

- **Apple IAP rejection** — packs with thematic names may be rejected for not describing what they unlock. Mitigation: keep functional fallback names ready.
- **AdMob fill rates** — vary by region, 50–80% typical. May need mediation (AppLovin MAX, Meta Audience Network) for global coverage.
- **ATT decline rate** — ~50–70% of iOS users decline. Non-personalized ads yield ~40% of personalized eCPM. Plan revenue forecast accordingly.
- **Race conditions** — the `FOR UPDATE` lock in `lumen-spend` must be airtight or users will double-spend. Integration test: 100 concurrent Go Deeper calls with balance = 10 Lumen, only one should succeed.
- **Migration of existing users** — users who have already hit their current daily/monthly limits should get fresh Lumen on migration day, not be immediately locked out. Grant everyone 100 Lumen + reset all `usage_limits` on deploy.
- **Dispute handling** — if Apple issues a refund on a Lumen pack, we need to deduct that Lumen. Requires App Store Server Notifications v2 webhook. Defer to post-launch unless chargeback rates spike.
- **Voice consistency** — "Lumen" as a word is good (light, alchemy, Jungian). "Mana" would have been wrong. Keep the copy elevated: "tended", "offered", "summoned", not "spent", "earned", "grinded."
