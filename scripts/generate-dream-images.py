#!/usr/bin/env python3
"""Generate dream images using Gemini free tier (Imagen 4.0).

Usage:
    python scripts/generate-dream-images.py [--start N] [--end N] [--delay SECONDS]

Reads image_prompt from data/seed-dream-content.json and saves images to
data/dream-images/dream-{index}.png. Skips already-generated images (resumable).
"""

import json
import os
import sys
import time
import argparse
from pathlib import Path

# Load API key from ~/.env
def load_api_key():
    env_path = Path.home() / ".env"
    with open(env_path) as f:
        for line in f:
            line = line.strip()
            if line.startswith("GEMINI_API_KEY="):
                return line.split("=", 1)[1]
    raise RuntimeError("GEMINI_API_KEY not found in ~/.env")

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--start", type=int, default=1, help="Start dream index")
    parser.add_argument("--end", type=int, default=48, help="End dream index")
    parser.add_argument("--delay", type=float, default=5.0, help="Delay between requests (seconds)")
    parser.add_argument("--model", default="imagen-4.0-generate-001", help="Model to use")
    args = parser.parse_args()

    api_key = load_api_key()

    from google import genai
    from google.genai import types
    client = genai.Client(api_key=api_key)

    # Paths
    script_dir = Path(__file__).parent.parent
    seed_path = script_dir / "data" / "seed-dream-content.json"
    images_dir = script_dir / "data" / "dream-images"
    images_dir.mkdir(exist_ok=True)

    with open(seed_path, encoding="utf-8") as f:
        dreams = json.load(f)

    # Filter to requested range
    dreams = [d for d in dreams if args.start <= d["dream_index"] <= args.end]
    print(f"Generating images for {len(dreams)} dreams ({args.start}-{args.end})")
    print(f"Model: {args.model}, Delay: {args.delay}s")
    print()

    success = 0
    failed = 0
    skipped = 0
    consecutive_failures = 0
    MAX_CONSECUTIVE_FAILURES = 5

    for dream in dreams:
        idx = dream["dream_index"]
        out_path = images_dir / f"dream-{idx}.png"

        # Skip if already generated
        if out_path.exists() and out_path.stat().st_size > 1000:
            print(f"  [{idx}] Already exists, skipping")
            skipped += 1
            continue

        prompt = dream["image_prompt"]
        # Add style guidance for consistency
        full_prompt = f"Create a surreal, dreamlike digital painting. {prompt} The style should be ethereal and painterly, with rich colors and dramatic lighting. No text or words in the image."

        print(f"  [{idx}] {dream['title'][:50]}...", end=" ", flush=True)

        try:
            result = client.models.generate_images(
                model=args.model,
                prompt=full_prompt,
                config=types.GenerateImagesConfig(
                    number_of_images=1,
                    aspect_ratio="1:1",
                    safety_filter_level="BLOCK_LOW_AND_ABOVE",
                ),
            )

            if result.generated_images and len(result.generated_images) > 0:
                img = result.generated_images[0]
                img.image.save(str(out_path))
                size_kb = out_path.stat().st_size / 1024
                print(f"OK ({size_kb:.0f}KB)")
                success += 1
                consecutive_failures = 0
            else:
                print("EMPTY (no image returned, may be safety filter)")
                failed += 1
                consecutive_failures += 1

        except Exception as e:
            err = str(e)
            if "429" in err or "RESOURCE_EXHAUSTED" in err:
                print(f"RATE LIMITED - waiting 60s...")
                time.sleep(60)
                # Retry once
                try:
                    result = client.models.generate_images(
                        model=args.model,
                        prompt=full_prompt,
                        config=types.GenerateImagesConfig(
                            number_of_images=1,
                            aspect_ratio="1:1",
                            safety_filter_level="BLOCK_LOW_AND_ABOVE",
                        ),
                    )
                    if result.generated_images:
                        result.generated_images[0].image.save(str(out_path))
                        print(f"  [{idx}] OK (retry)")
                        success += 1
                        consecutive_failures = 0
                    else:
                        print(f"  [{idx}] EMPTY on retry")
                        failed += 1
                        consecutive_failures += 1
                except Exception as e2:
                    print(f"  [{idx}] FAILED on retry: {e2}")
                    failed += 1
                    consecutive_failures += 1
            else:
                print(f"FAILED: {err[:100]}")
                failed += 1
                consecutive_failures += 1

        # Gate: stop if too many consecutive failures
        if consecutive_failures >= MAX_CONSECUTIVE_FAILURES:
            print(f"\n{MAX_CONSECUTIVE_FAILURES} consecutive failures — stopping.")
            print(f"Resume with: python scripts/generate-dream-images.py --start {idx}")
            break

        # Rate limit delay
        time.sleep(args.delay)

    print(f"\nDone: {success} generated, {failed} failed, {skipped} skipped")

if __name__ == "__main__":
    main()
