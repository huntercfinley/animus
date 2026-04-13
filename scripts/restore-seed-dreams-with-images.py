#!/usr/bin/env python3
"""Restore the 55 seed dreams AND upload their images to Supabase storage.

One-shot recovery script. Reads data/seed-dream-content.json and for each dream:
  1. Inserts into dreams (title, journal_text, interpretation, symbols, etc.)
  2. Inserts into dream_symbols
  3. Inserts into dream_conversations
  4. Uploads data/dream-images/dream-{index}.png to dream-images/{user_id}/{dream_id}.png
  5. Patches dreams.image_url with the public URL

Usage:
    ANIMUS_SUPABASE_SERVICE_ROLE_KEY=sb_secret_xxx \\
        python scripts/restore-seed-dreams-with-images.py --user-id <UUID>
"""

import json
import os
import sys
import argparse
from pathlib import Path

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--user-id", required=True, help="Target user UUID")
    parser.add_argument("--skip-images", action="store_true", help="Skip image upload step")
    args = parser.parse_args()

    url = os.environ.get("EXPO_PUBLIC_SUPABASE_URL") or "https://xlumafywghpgallecsvh.supabase.co"
    key = os.environ.get("ANIMUS_SUPABASE_SERVICE_ROLE_KEY") or os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    if not key:
        print("ERROR: set ANIMUS_SUPABASE_SERVICE_ROLE_KEY in environment")
        sys.exit(1)

    try:
        from supabase import create_client
    except ImportError:
        print("Installing supabase-py...")
        os.system(f"{sys.executable} -m pip install supabase --quiet")
        from supabase import create_client

    supabase = create_client(url, key)

    project = Path(__file__).parent.parent
    seed_path = project / "data" / "seed-dream-content.json"
    images_dir = project / "data" / "dream-images"

    with open(seed_path, encoding="utf-8") as f:
        dreams = json.load(f)
    print(f"Loaded {len(dreams)} dreams from seed file")

    mood_map = {
        "anxious": "anxious", "mysterious": "mysterious", "joyful": "joyful",
        "melancholic": "melancholic", "empowering": "joyful",
        "peaceful": "peaceful", "intense": "dark", "transformative": "surreal",
    }

    success = 0
    failed = 0

    for dream in dreams:
        idx = dream["dream_index"]
        title = dream["title"][:60]
        print(f"  [{idx:2}] {title}...", end=" ", flush=True)

        try:
            dream_row = {
                "user_id": args.user_id,
                "recorded_at": f"{dream['original_date']}T08:00:00+00:00",
                "title": dream["title"],
                "journal_text": dream["journal_text"],
                "interpretation": dream["interpretation"],
                "mood": mood_map.get(dream["mood"], dream["mood"]),
                "image_prompt": dream["image_prompt"],
                "model_used": "seed-data",
                "is_favorite": False,
            }
            res = supabase.table("dreams").insert(dream_row).execute()
            dream_id = res.data[0]["id"]

            symbol_rows = [
                {
                    "dream_id": dream_id,
                    "user_id": args.user_id,
                    "symbol": s["symbol"],
                    "archetype": s["archetype"],
                    "sentiment": s["sentiment"],
                }
                for s in dream.get("symbols", [])
            ]
            if symbol_rows:
                supabase.table("dream_symbols").insert(symbol_rows).execute()

            convo_rows = []
            for exchange in dream.get("go_deeper", []):
                n = exchange["exchange"]
                convo_rows.append({
                    "dream_id": dream_id, "role": "user",
                    "content": exchange["user"], "exchange_number": n,
                })
                convo_rows.append({
                    "dream_id": dream_id, "role": "assistant",
                    "content": exchange["assistant"], "exchange_number": n,
                })
            if convo_rows:
                supabase.table("dream_conversations").insert(convo_rows).execute()

            if not args.skip_images:
                img_path = images_dir / f"dream-{idx}.png"
                if img_path.exists():
                    storage_path = f"{args.user_id}/{dream_id}.png"
                    with open(img_path, "rb") as f:
                        img_bytes = f.read()
                    supabase.storage.from_("dream-images").upload(
                        path=storage_path,
                        file=img_bytes,
                        file_options={"content-type": "image/png", "upsert": "true"},
                    )
                    public_url = supabase.storage.from_("dream-images").get_public_url(storage_path)
                    supabase.table("dreams").update({"image_url": public_url}).eq("id", dream_id).execute()
                    img_status = "IMG"
                else:
                    img_status = "no-img"
            else:
                img_status = "skip-img"

            s_count = len(symbol_rows)
            c_count = len(convo_rows) // 2
            print(f"OK ({s_count}s, {c_count}x, {img_status})")
            success += 1
        except Exception as e:
            print(f"FAILED: {str(e)[:120]}")
            failed += 1

    print(f"\nDone: {success} imported, {failed} failed")

if __name__ == "__main__":
    main()
