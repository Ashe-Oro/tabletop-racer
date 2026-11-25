#!/usr/bin/env python3
"""Install sprite strips from four-view sheets or pre-carved PNGs."""
import argparse
import importlib.util
import json
from pathlib import Path
import re
import shutil
import subprocess
import sys
from tempfile import TemporaryDirectory

import numpy as np
from PIL import Image

from generate_placeholders import BG, OUTPUT, generate

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "public/assets"
MANIFEST = ASSETS / "manifest.json"
CHECKS = ROOT / "art/checks"
SLICER = ROOT / "tools/sprite-stacking/scripts/views_to_slices.py"
PRESETS = json.loads((ROOT / "tools/asset_presets.json").read_text())
HANDOFF = ROOT / "art/handoff"
# Exact current filenames only. Archived v1 files use a `_v1_` infix and must never be selected.
# Prefer shipped slices over recarving four-views, because v2 revisions may live only in the strips.
ARTIST_IMPORTS = {
    "car": ("hero_car_a_slices.png", 36),
    "pencil": ("prop_pencil_slices.png", 12),
    "coin": ("prop_coin_stack_slices.png", 16),
    "ruler": ("prop_ruler_slices.png", 8),
    "mug": ("prop_mug_slices.png", 60),
    "cereal_box": ("prop_cereal_box_slices.png", 88),
    "eraser": ("prop_eraser_slices.png", 12),
    "salt_shaker": ("prop_salt_shaker_slices.png", 44),
    "butter_dish": ("prop_butter_dish_slices.png", 26),
    "crumb_pile": ("prop_crumb_pile_slices.png", 12),
}
PLACEHOLDERS = {
    "car": (16, False), "car_placeholder": (16, False), "pencil": (12, False),
    "coin": (6, True), "ruler": (7, False), "mug": (36, False), "cereal_box": (60, False),
}


def read_manifest():
    return json.loads(MANIFEST.read_text()) if MANIFEST.exists() else {}


def carve_sheet(sheet, strip, preview, settings):
    carve_input = sheet
    key_background = settings.pop("key_background", False)
    if sheet.resolve().parent == OUTPUT or key_background:
        # The reserved background also shows through enclosed holes, e.g. the mug handle.
        with Image.open(sheet) as image:
            rgba = np.array(image.convert("RGBA"))
        rgba[np.all(rgba[:, :, :3] == BG, axis=2), 3] = 0
        carve_input = strip.parent / "keyed.png"
        Image.fromarray(rgba).save(carve_input)
    command = [sys.executable, str(SLICER),
               str(carve_input), str(strip), "--preview", str(preview)]
    for key, value in settings.items():
        flag = "--" + key.replace("_", "-")
        if key == "round":
            if value:
                command.append(flag)
        else:
            command.extend([flag, str(value)])
    output = subprocess.check_output(command, text=True)
    for line in output.splitlines():
        if line.startswith("warning:"):
            print(f"{strip.stem}: {line}")


def check_strip(strip, preview, count):
    with Image.open(strip) as image:
        width, height = image.size
        if image.format != "PNG" or width < count or width % count or height < 1:
            raise ValueError(f"Invalid PNG strip dimensions {width}×{height} for {count} slices.")
        rgba = np.array(image.convert("RGBA"))
    slice_width = width // count
    slices = rgba.reshape(height, count, slice_width, 4).transpose(1, 0, 2, 3).copy()
    if not np.any(slices[..., 3]):
        raise ValueError("Slice strip is fully transparent.")
    if not preview.exists():
        spec = importlib.util.spec_from_file_location("views_to_slices", SLICER)
        slicer = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(slicer)
        top = np.zeros_like(slices[0])
        for layer in slices:
            visible = layer[..., 3] > 0
            top[visible] = layer[visible]
        slicer.build_preview(slices, [top], preview)
    return slice_width, height


def import_sheet(sheet, asset_id, overrides, from_slices=False):
    if not re.fullmatch(r"[a-z0-9][a-z0-9_-]*", asset_id):
        raise ValueError("Asset ID must use lowercase letters, numbers, underscores or hyphens.")
    if asset_id not in PRESETS and "slices" not in overrides:
        raise ValueError("New asset IDs require an explicit --slices count.")
    settings = dict(PRESETS.get(asset_id, {}))
    if sheet.resolve().parent == OUTPUT and asset_id in PLACEHOLDERS:
        slices, rounded = PLACEHOLDERS[asset_id]
        settings.update(slices=slices, round=rounded, colours=0, shade=0.14)
    settings.update(overrides)
    if not sheet.is_file():
        raise ValueError(f"Sheet not found: {sheet}")
    if "_v1_" in sheet.name:
        raise ValueError(f"Refusing archived v1 asset: {sheet}")
    count = settings["slices"]
    if count < 1:
        raise ValueError("--slices must be a positive integer.")

    manifest = read_manifest()
    source = str(sheet.resolve().relative_to(ROOT)) if sheet.resolve().is_relative_to(ROOT) else sheet.name
    with TemporaryDirectory(dir=ROOT) as temporary:
        folder = Path(temporary)
        strip = folder / f"{asset_id}.png"
        preview = folder / f"{asset_id}_check.png"
        if from_slices:
            shutil.copyfile(sheet, strip)
        else:
            carve_sheet(sheet, strip, preview, settings)
        slice_width, height = check_strip(strip, preview, count)
        manifest[asset_id] = dict(slices=count, sliceWidth=slice_width, sliceHeight=height, source=source)
        new_manifest = folder / "manifest.json"
        new_manifest.write_text(json.dumps(manifest, indent=2, sort_keys=True) + "\n")
        (ASSETS / "slices").mkdir(parents=True, exist_ok=True)
        CHECKS.mkdir(parents=True, exist_ok=True)
        strip.replace(ASSETS / "slices" / strip.name)
        preview.replace(CHECKS / preview.name)
        new_manifest.replace(MANIFEST)
    print(f"{asset_id}: {count} slices of {slice_width} × {height} px")


def import_artist():
    for asset_id, (filename, slices) in ARTIST_IMPORTS.items():
        sheet = HANDOFF / filename
        if "_v1_" in sheet.name:
            raise ValueError(f"Refusing archived v1 asset: {sheet}")
        if not sheet.is_file():
            raise ValueError(f"Missing current artist strip: {sheet}")
        import_sheet(sheet, asset_id, {"slices": slices}, from_slices=True)
    with Image.open(HANDOFF / "table_wood_tile.png") as tile:
        tile.resize((250, 250), Image.Resampling.NEAREST).save(ASSETS / "table_wood_tile.png", optimize=True)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("sheet", type=Path, nargs="?")
    parser.add_argument("asset_id", nargs="?")
    mode = parser.add_mutually_exclusive_group()
    mode.add_argument("--all-placeholders", action="store_true")
    mode.add_argument("--all-artist", action="store_true")
    mode.add_argument("--from-slices", action="store_true", help="Install a pre-carved strip.")
    parser.add_argument("--slices", type=int)
    parser.add_argument("--round", action=argparse.BooleanOptionalAction, default=None)
    parser.add_argument("--top-nose", choices=["auto", "up", "down"])
    parser.add_argument("--side-nose", choices=["left", "right"])
    parser.add_argument("--order", choices=["auto", "reading"])
    parser.add_argument("--colours", type=int)
    parser.add_argument("--shade", type=float)
    parser.add_argument("--bg-tol", type=int, help="Flood-fill background tolerance for opaque sheets.")
    parser.add_argument("--key-background", action="store_true", default=None,
                        help="Treat exactly RGB (250,250,250) as transparent, including enclosed holes.")
    args = parser.parse_args()
    overrides = {key: value for key, value in vars(args).items()
                 if key not in {"sheet", "asset_id", "all_placeholders", "all_artist", "from_slices"}
                 and value is not None}
    try:
        if args.all_placeholders and not (args.sheet or args.asset_id or overrides):
            manifest = read_manifest()
            generate()
            for asset_id in PLACEHOLDERS:
                entry = manifest.get(asset_id)
                source = entry.get("source") if isinstance(entry, dict) else None
                if isinstance(source, str) and source.startswith("art/handoff/"):
                    continue
                sheet_name = "car" if asset_id == "car_placeholder" else asset_id
                import_sheet(OUTPUT / f"{sheet_name}.png", asset_id, {})
        elif args.all_artist and not (args.sheet or args.asset_id or overrides):
            import_artist()
        elif args.sheet and args.asset_id and not (args.all_placeholders or args.all_artist):
            if args.from_slices and overrides.keys() - {"slices"}:
                parser.error("Only --slices applies to pre-carved strips.")
            import_sheet(args.sheet, args.asset_id, overrides, from_slices=args.from_slices)
        else:
            parser.error("Use [--from-slices] SHEET ASSET_ID [overrides], --all-placeholders, or --all-artist.")
    except (OSError, ValueError, subprocess.CalledProcessError) as error:
        parser.exit(1, f"{error}\n")


if __name__ == "__main__":
    main()
