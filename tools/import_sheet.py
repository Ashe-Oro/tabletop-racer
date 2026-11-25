#!/usr/bin/env python3
"""Carve one four-view sheet or regenerate the complete placeholder set."""
import argparse
import json
from pathlib import Path
import re
import subprocess
import sys
from tempfile import TemporaryDirectory

import numpy as np
from PIL import Image

from generate_placeholders import BG, OUTPUT, generate

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "public/assets"
CHECKS = ROOT / "art/checks"
PRESETS = json.loads((ROOT / "tools/asset_presets.json").read_text())


def import_sheet(sheet, asset_id, overrides):
    if not re.fullmatch(r"[a-z0-9][a-z0-9_-]*", asset_id):
        raise ValueError("Asset ID must use lowercase letters, numbers, underscores or hyphens.")
    if asset_id not in PRESETS and "slices" not in overrides:
        raise ValueError("New asset IDs require an explicit --slices count.")
    settings = {**PRESETS.get(asset_id, {}), **overrides}
    count = settings["slices"]
    if count < 1:
        raise ValueError("--slices must be a positive integer.")

    manifest_path = ASSETS / "manifest.json"
    manifest = json.loads(manifest_path.read_text()) if manifest_path.exists() else {}
    source = str(sheet.resolve().relative_to(ROOT)) if sheet.resolve().is_relative_to(ROOT) else sheet.name
    with TemporaryDirectory(dir=ROOT) as temporary:
        folder = Path(temporary)
        carve_input = sheet
        key_background = settings.pop("key_background", False)
        if sheet.resolve().parent == OUTPUT or key_background:
            # The exact reserved background also shows through enclosed holes, e.g. the mug handle.
            rgba = np.array(Image.open(sheet).convert("RGBA"))
            rgba[np.all(rgba[:, :, :3] == BG, axis=2), 3] = 0
            carve_input = folder / "keyed.png"
            Image.fromarray(rgba).save(carve_input)
        strip = folder / f"{asset_id}.png"
        preview = folder / f"{asset_id}_check.png"
        command = [sys.executable, str(ROOT / "tools/sprite-stacking/scripts/views_to_slices.py"),
                   str(carve_input), str(strip), "--preview", str(preview)]
        for key, value in settings.items():
            flag = "--" + key.replace("_", "-")
            if key == "round":
                if value:
                    command.append(flag)
            else:
                command.extend([flag, str(value)])
        output = subprocess.check_output(command, text=True)
        with Image.open(strip) as image:
            width, height = image.size
            if width < count or width % count or height < 1:
                raise ValueError(f"Invalid strip dimensions {width}×{height} for {count} slices.")
            slice_width = width // count
        manifest[asset_id] = dict(slices=count, sliceWidth=slice_width, sliceHeight=height, source=source)
        new_manifest = folder / "manifest.json"
        new_manifest.write_text(json.dumps(manifest, indent=2, sort_keys=True) + "\n")
        (ASSETS / "slices").mkdir(parents=True, exist_ok=True)
        CHECKS.mkdir(parents=True, exist_ok=True)
        strip.replace(ASSETS / "slices" / strip.name)
        preview.replace(CHECKS / preview.name)
        new_manifest.replace(manifest_path)
    print(f"{asset_id}: {count} slices of {slice_width} × {height} px")
    for line in output.splitlines():
        if line.startswith("warning:"):
            print(line)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("sheet", type=Path, nargs="?")
    parser.add_argument("asset_id", nargs="?")
    parser.add_argument("--all-placeholders", action="store_true")
    parser.add_argument("--slices", type=int)
    parser.add_argument("--round", action=argparse.BooleanOptionalAction, default=None)
    parser.add_argument("--top-nose", choices=["auto", "up", "down"])
    parser.add_argument("--side-nose", choices=["left", "right"])
    parser.add_argument("--order", choices=["auto", "reading"])
    parser.add_argument("--colours", type=int)
    parser.add_argument("--shade", type=float)
    parser.add_argument("--key-background", action="store_true", default=None,
                        help="Treat exactly RGB (250,250,250) as transparent, including enclosed holes.")
    args = parser.parse_args()
    overrides = {key: value for key, value in vars(args).items()
                 if key not in {"sheet", "asset_id", "all_placeholders"} and value is not None}
    try:
        if args.all_placeholders and not (args.sheet or args.asset_id or overrides):
            generate()
            for asset_id in PRESETS:
                import_sheet(OUTPUT / f"{asset_id}.png", asset_id, {})
        elif args.sheet and args.asset_id and not args.all_placeholders:
            import_sheet(args.sheet, args.asset_id, overrides)
        else:
            parser.error("Use SHEET ASSET_ID [overrides] or --all-placeholders.")
    except (OSError, ValueError, subprocess.CalledProcessError) as error:
        parser.exit(1, f"{error}\n")


if __name__ == "__main__":
    main()
