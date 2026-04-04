#!/usr/bin/env python3
"""Import seed dream content into Supabase for a specific user.

Usage:
    python scripts/import-seed-dreams.py --user-id <UUID>
    python scripts/import-seed-dreams.py --user-email <email>
    python scripts/import-seed-dreams.py --dry-run

Reads data/seed-dream-content.json and inserts into:
  - dreams (title, journal_text, interpretation, mood, image_prompt, etc.)
  - dream_symbols (symbol, archetype, sentiment)
  - dream_conversations (go-deeper exchanges)

Uses the service role key to bypass RLS.
"""

import json
import os
import sys
import argparse
from pathlib import Path
from datetime import datetime

def load_env():
    """Load credentials from ~/.env"""
    env = {}
    env_path = Path.home() / ".env"
    if env_path.exists():
        with open(env_path) as f:
            for line in f:
                line = line.strip()
                if "=" in line and not line.startswith("#"):
                    key, val = line.split("=", 1)
                    env[key] = val
    # Also check project .env.local
    local_env = Path(__file__).parent.parent / ".env.local"
    if local_env.exists():
        with open(local_env) as f:
            for line in f:
                line = line.strip()
                if "=" in line and not line.startswith("#"):
                    key, val = line.split("=", 1)
                    env[key] = val
    return env

def main():
    parser = argparse.ArgumentParser(description="Import seed dreams into Supabase")
    parser.add_argument("--user-id", help="Target user UUID")
    parser.add_argument("--user-email", help="Look up user by email")
    parser.add_argument("--dry-run", action="store_true", help="Print what would be done without inserting")
    parser.add_argument("--clear-existing", action="store_true", help="Delete existing dreams for this user first")
    args = parser.parse_args()

    env = load_env()
    supabase_url = env.get("EXPO_PUBLIC_SUPABASE_URL")
    service_key = env.get("ANIMUS_SUPABASE_SERVICE_ROLE_KEY")

    if not supabase_url or not service_key:
        print("ERROR: Missing EXPO_PUBLIC_SUPABASE_URL or ANIMUS_SUPABASE_SERVICE_ROLE_KEY")
        sys.exit(1)

    try:
        from supabase import create_client
    except ImportError:
        print("Installing supabase-py...")
        os.system(f"{sys.executable} -m pip install supabase --quiet")
        from supabase import create_client

    supabase = create_client(supabase_url, service_key)

    # Resolve user_id
    user_id = args.user_id
    if args.user_email:
        result = supabase.table("profiles").select("id").eq("email", args.user_email).execute()
        if result.data:
            user_id = result.data[0]["id"]
            print(f"Found user: {user_id} ({args.user_email})")
        else:
            # Try auth.users
            result = supabase.auth.admin.list_users()
            for u in result:
                if hasattr(u, 'email') and u.email == args.user_email:
                    user_id = u.id
                    print(f"Found user in auth: {user_id}")
                    break
            if not user_id:
                print(f"ERROR: No user found with email {args.user_email}")
                sys.exit(1)

    if not user_id and not args.dry_run:
        print("ERROR: --user-id or --user-email required (or use --dry-run)")
        sys.exit(1)

    # Load seed data
    seed_path = Path(__file__).parent.parent / "data" / "seed-dream-content.json"
    with open(seed_path, encoding="utf-8") as f:
        dreams = json.load(f)
    print(f"Loaded {len(dreams)} dreams from seed file")

    if args.dry_run:
        for d in dreams:
            syms = len(d.get("symbols", []))
            exchanges = len(d.get("go_deeper", []))
            print(f"  #{d['dream_index']}: {d['title'][:50]} ({syms} symbols, {exchanges} exchanges)")
        total_rows = len(dreams) + sum(len(d.get("symbols",[])) for d in dreams) + sum(len(d.get("go_deeper",[]))*2 for d in dreams)
        print(f"\nWould insert ~{total_rows} total rows")
        return

    # Optionally clear existing dreams
    if args.clear_existing:
        print("Clearing existing dreams for user...")
        # dream_symbols and dream_conversations cascade-delete from dreams
        result = supabase.table("dreams").delete().eq("user_id", user_id).execute()
        print(f"  Deleted {len(result.data)} existing dreams")

    # Insert dreams
    success = 0
    failed = 0

    for dream in dreams:
        idx = dream["dream_index"]
        print(f"  [{idx}] {dream['title'][:50]}...", end=" ", flush=True)

        try:
            # Map mood to valid DB values
            mood_map = {
                "anxious": "anxious",
                "mysterious": "mysterious",
                "joyful": "joyful",
                "melancholic": "melancholic",
                "empowering": "joyful",  # closest match
                "peaceful": "peaceful",
                "intense": "dark",  # DB uses "dark" for intense
                "transformative": "surreal",  # DB uses "surreal"
            }

            dream_row = {
                "user_id": user_id,
                "recorded_at": f"{dream['original_date']}T08:00:00+00:00",
                "title": dream["title"],
                "journal_text": dream["journal_text"],
                "interpretation": dream["interpretation"],
                "mood": mood_map.get(dream["mood"], dream["mood"]),
                "image_prompt": dream["image_prompt"],
                "model_used": "seed-data",
                "is_favorite": False,
            }

            result = supabase.table("dreams").insert(dream_row).execute()
            dream_id = result.data[0]["id"]

            # Insert symbols
            symbol_rows = []
            for sym in dream.get("symbols", []):
                symbol_rows.append({
                    "dream_id": dream_id,
                    "user_id": user_id,
                    "symbol": sym["symbol"],
                    "archetype": sym["archetype"],
                    "sentiment": sym["sentiment"],
                })
            if symbol_rows:
                supabase.table("dream_symbols").insert(symbol_rows).execute()

            # Insert go-deeper conversations
            convo_rows = []
            for exchange in dream.get("go_deeper", []):
                ex_num = exchange["exchange"]
                convo_rows.append({
                    "dream_id": dream_id,
                    "role": "user",
                    "content": exchange["user"],
                    "exchange_number": ex_num,
                })
                convo_rows.append({
                    "dream_id": dream_id,
                    "role": "assistant",
                    "content": exchange["assistant"],
                    "exchange_number": ex_num,
                })
            if convo_rows:
                supabase.table("dream_conversations").insert(convo_rows).execute()

            syms = len(dream.get("symbols", []))
            exchanges = len(dream.get("go_deeper", []))
            print(f"OK ({syms} symbols, {exchanges*2} messages)")
            success += 1

        except Exception as e:
            print(f"FAILED: {str(e)[:100]}")
            failed += 1

    print(f"\nDone: {success} imported, {failed} failed")

if __name__ == "__main__":
    main()
