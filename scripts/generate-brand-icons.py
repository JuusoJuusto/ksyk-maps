#!/usr/bin/env python3
"""Generate favicons and PWA icons from public/ksykmaps_logo_NEW (2).png."""
from pathlib import Path
from shutil import copy2

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "public" / "ksykmaps_logo_NEW (2).png"
LOGO_NAME = "ksykmaps_logo_NEW (2).png"
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
    if not SOURCE.exists():
        raise SystemExit(f"Missing logo: {SOURCE}")

    src = Image.open(SOURCE).convert("RGBA")
    if src.size != (1024, 1024):
        src = src.resize((1024, 1024), Image.Resampling.LANCZOS)
        src.save(SOURCE, format="PNG")
        print(f"Normalized master to 1024x1024: {SOURCE}")

    for out_dir in OUT_DIRS:
        out_dir.mkdir(parents=True, exist_ok=True)
        logo_dest = out_dir / LOGO_NAME
        if logo_dest.resolve() != SOURCE.resolve():
            copy2(SOURCE, logo_dest)

        for size, name in SIZES:
            out = out_dir / name
            if size >= 512:
                resized = src.copy()
            else:
                resized = src.resize((size, size), Image.Resampling.LANCZOS)
            resized.save(out, format="PNG", optimize=False)

        src.save(out_dir / "icon-1024.png", format="PNG")
        print(f"  -> {out_dir.relative_to(ROOT)}/")

    print("Done. App logo:", f"/{LOGO_NAME.replace(' ', '%20').replace('(', '%28').replace(')', '%29')}")


if __name__ == "__main__":
    main()
