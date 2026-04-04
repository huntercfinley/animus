#!/usr/bin/env python3
"""Match and copy Nano Banana dream images from Downloads to data/dream-images/.

Usage:
    python scripts/grab-dream-images.py

Scans ~/Downloads for PNG files, matches them to dream image prompts by filename
keywords, and copies them as dream-{N}.png. Skips already-matched images.
"""

import json
import shutil
from pathlib import Path

def main():
    downloads = Path.home() / "Downloads"
    project = Path(__file__).parent.parent
    seed_path = project / "data" / "seed-dream-content.json"
    images_dir = project / "data" / "dream-images"
    images_dir.mkdir(exist_ok=True)

    with open(seed_path, encoding="utf-8") as f:
        dreams = json.load(f)

    # Get all PNG files from Downloads, sorted newest first
    pngs = sorted(downloads.glob("*.png"), key=lambda p: p.stat().st_mtime, reverse=True)

    # Already matched
    existing = {f.name for f in images_dir.glob("dream-*.png")}

    matched = 0
    unmatched_files = []

    for png in pngs:
        # Extract keyword from filename (before timestamp)
        name = png.stem
        # Nano Banana format: Some_Words_Here_YYYYMMDDHHSS
        parts = name.rsplit('_', 1)
        if len(parts) == 2 and parts[1].isdigit() and len(parts[1]) >= 12:
            keyword = parts[0].replace('_', ' ').lower()
        else:
            continue  # Not a Nano Banana file

        # Try to match to a dream prompt
        best_match = None
        best_score = 0

        for d in dreams:
            prompt_lower = d['image_prompt'].lower()
            # Check various prefix lengths for matching
            for length in [25, 20, 15, 12]:
                if keyword[:length] in prompt_lower[:80]:
                    if length > best_score:
                        best_score = length
                        best_match = d
                    break

        if best_match:
            out_name = f"dream-{best_match['dream_index']}.png"
            if out_name in existing:
                continue  # Already have this one

            out_path = images_dir / out_name
            shutil.copy2(png, out_path)
            size_kb = out_path.stat().st_size / 1024
            print(f"  {png.name}")
            print(f"    -> dream-{best_match['dream_index']}.png ({best_match['title']}) [{size_kb:.0f}KB]")
            matched += 1
            existing.add(out_name)
        else:
            unmatched_files.append(png.name)

    # Summary
    total = len(list(images_dir.glob("dream-*.png")))
    print(f"\nMatched {matched} new images. Total: {total}/48 dream images stored.")

    if total < 48:
        missing = []
        for d in dreams:
            if f"dream-{d['dream_index']}.png" not in existing:
                missing.append(d['dream_index'])
        print(f"Missing: dreams {missing}")

    if unmatched_files:
        print(f"\nUnmatched Nano Banana files in Downloads ({len(unmatched_files)}):")
        for f in unmatched_files[:10]:
            print(f"  {f}")

if __name__ == "__main__":
    main()
