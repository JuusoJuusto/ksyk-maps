#!/usr/bin/env python3
"""Generate crisp favicons from public/ksykmaps_logo_new_new.png (1024x1024 master)."""
from pathlib import Path
from shutil import copy2

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
MASTER = ROOT / "public" / "ksykmaps_logo_new_new.png"
OUT_DIRS = [ROOT / "public", ROOT / "client" / "public"]

SIZES = [
    (16, "favicon-16.png"),
    (32, "favicon-32.png"),
    (48, "favicon-48.png"),
    (64, "favicon-64.png"),
    (128, "favicon-128.png"),
    (180, "apple-touch-icon.png"),
    (192, "icon-192.png"),
    (512, "icon-512.png"),
]


def main() -> None:
    if not MASTER.exists():
        raise SystemExit(f"Missing master logo: {MASTER}")

    src = Image.open(MASTER).convert("RGBA")
    if src.size != (1024, 1024):
        src = src.resize((1024, 1024), Image.Resampling.LANCZOS)

    for out_dir in OUT_DIRS:
        out_dir.mkdir(parents=True, exist_ok=True)
        for size, name in SIZES:
            out = out_dir / name
            if size >= 512:
                resized = src.copy()
            else:
                resized = src.resize((size, size), Image.Resampling.LANCZOS)
            resized.save(out, format="PNG", optimize=False)
        # Full master as 1024 icon (no re-encode loss)
        copy2(MASTER, out_dir / "icon-1024.png")
        master_copy = out_dir / "ksykmaps_logo_new_new.png"
        if master_copy.resolve() != MASTER.resolve():
            copy2(MASTER, master_copy)

    print("Generated brand icons in public/ and client/public/")


if __name__ == "__main__":
    main()
