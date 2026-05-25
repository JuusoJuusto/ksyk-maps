#!/usr/bin/env python3
"""Generate crisp favicons from the KSYK Maps master logo (1024x1024)."""
from pathlib import Path
from shutil import copy2

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "public" / "ksykmaps_logo_NEW (2).png"
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
    logo_path = SOURCE if SOURCE.exists() else MASTER
    if not logo_path.exists():
        raise SystemExit(f"Missing logo: {SOURCE} or {MASTER}")

    src = Image.open(logo_path).convert("RGBA")
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
        master_copy = out_dir / "ksykmaps_logo_new_new.png"
        src.save(master_copy, format="PNG")
        copy2(master_copy, out_dir / "icon-1024.png")

    print("Generated brand icons in public/ and client/public/")


if __name__ == "__main__":
    main()
