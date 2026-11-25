#!/usr/bin/env python3
"""Install stack strips, direction sheets, flat sprites and ground tiles."""
import argparse
import colorsys
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

from generate_placeholders import BG, OUTPUT, PICNIC, generate

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
PICNIC_IDS = tuple(draw.__name__ for draw in PICNIC)
CAR_SLOTS = tuple(f"car_{number}" for number in range(1, 5))
CAR_HUES = {"car_2": 0.60, "car_3": 0.10, "car_4": 0.37}
V3_CAR_NAMES = {"stripe": "car_1", "pickup": "car_2", "f1": "car_3", "taxi": "car_4"}
CAR_NAMES = {
    **V3_CAR_NAMES,
    "hero": "car_1", "hero_red": "car_1", "hero_car_a": "car_1",
    "cobalt": "car_2", "cobalt_gt": "car_2",
    "sunburst": "car_3", "emerald": "car_4",
    **{slot: slot for slot in CAR_SLOTS},
}
DIRECTION_NAME = re.compile(r"cars_v3_(.+)_(\d+)dir\.png", re.IGNORECASE)
PICNIC_NAME = re.compile(r"picnic_([a-z0-9_]+)\.png", re.IGNORECASE)
PICNIC_FRAMES = {"ant_walk": 2}
GROUND_NAMES = ("tablecloth", "grass", "wood")
GROUND_NAME = re.compile(r"ground_([a-z0-9_]+)\.png", re.IGNORECASE)


def read_manifest():
    return json.loads(MANIFEST.read_text()) if MANIFEST.exists() else {}


def write_manifest(manifest, folder):
    updated = folder / "manifest.json"
    updated.write_text(json.dumps(manifest, indent=2, sort_keys=True) + "\n")
    updated.replace(MANIFEST)


def sheet_source(sheet):
    absolute = sheet.resolve()
    return str(absolute.relative_to(ROOT)) if absolute.is_relative_to(ROOT) else sheet.name


def validate_source(sheet):
    if "_v1_" in sheet.name.lower():
        raise ValueError(f"Refusing archived v1 asset: {sheet}")
    if not sheet.is_file():
        raise ValueError(f"Sheet not found: {sheet}")


def validate_id(asset_id):
    if not re.fullmatch(r"[a-z0-9][a-z0-9_-]*", asset_id):
        raise ValueError("Asset ID must use lowercase letters, numbers, underscores or hyphens.")


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
    validate_source(sheet)
    validate_id(asset_id)
    if asset_id not in PRESETS and "slices" not in overrides:
        raise ValueError("New asset IDs require an explicit --slices count.")
    settings = dict(PRESETS.get(asset_id, {}))
    if sheet.resolve().parent == OUTPUT and asset_id in PLACEHOLDERS:
        slices, rounded = PLACEHOLDERS[asset_id]
        settings.update(slices=slices, round=rounded, colours=0, shade=0.14)
    settings.update(overrides)
    count = settings["slices"]
    if count < 1:
        raise ValueError("--slices must be a positive integer.")

    manifest = read_manifest()
    with TemporaryDirectory(dir=ROOT) as temporary:
        folder = Path(temporary)
        strip = folder / f"{asset_id}.png"
        preview = folder / f"{asset_id}_check.png"
        if from_slices:
            shutil.copyfile(sheet, strip)
        else:
            carve_sheet(sheet, strip, preview, settings)
        slice_width, height = check_strip(strip, preview, count)
        manifest[asset_id] = dict(slices=count, sliceWidth=slice_width, sliceHeight=height,
                                  source=sheet_source(sheet))
        (ASSETS / "slices").mkdir(parents=True, exist_ok=True)
        CHECKS.mkdir(parents=True, exist_ok=True)
        strip.replace(ASSETS / "slices" / strip.name)
        preview.replace(CHECKS / preview.name)
        write_manifest(manifest, folder)
    print(f"{asset_id}: {count} slices of {slice_width} × {height} px")


def direction_slot(name):
    return CAR_NAMES.get(re.sub(r"[ -]+", "_", name.lower()))


def direction_entry(sheet, asset_id, directions):
    validate_source(sheet)
    if asset_id not in CAR_SLOTS:
        raise ValueError("Direction sheets require a known car name or an explicit car_1–car_4 ID.")
    if directions not in (8, 16, 32):
        raise ValueError("Direction sheets require 8, 16 or 32 frames.")
    with Image.open(sheet) as image:
        if image.format != "PNG" or image.size != (directions * 32, 32):
            raise ValueError(f"Direction sheets require a {directions * 32} × 32 px PNG strip.")
        alpha = np.array(image.convert("RGBA"))[:, :, 3].reshape(32, directions, 32)
        if not alpha.any(axis=(0, 2)).all():
            raise ValueError("Direction strip has an empty frame.")
    return dict(type="direction", directions=directions, slices=directions,
                sliceWidth=32, sliceHeight=32, source=sheet_source(sheet))


def import_directions(sheets):
    if not sheets:
        return
    manifest = read_manifest()
    manifest.update({asset_id: direction_entry(sheet, asset_id, directions)
                     for asset_id, (sheet, directions) in sheets.items()})
    with TemporaryDirectory(dir=ROOT) as temporary:
        folder = Path(temporary)
        for asset_id, (sheet, _) in sheets.items():
            install_png(sheet, ASSETS / "slices" / f"{asset_id}.png", folder)
        write_manifest(manifest, folder)
    for asset_id, (_, directions) in sheets.items():
        print(f"{asset_id}: {directions} directions of 32 × 32 px")


def import_sprite(sheet, asset_id, frames):
    validate_id(asset_id)
    with Image.open(sheet) as image:
        if image.format != "PNG" or image.width % frames:
            raise ValueError(f"Expected a horizontal PNG strip of {frames} equal-width frames.")
        width, height = image.width // frames, image.height
        alpha = image.convert("RGBA").getchannel("A")
        bounds = [alpha.crop((x, 0, x + width, height)).getbbox()
                  for x in range(0, image.width, width)]
    if any(box is None for box in bounds):
        raise ValueError("Flat sprite has an empty frame.")
    manifest = read_manifest()
    entry = dict(type="sprite", width=width, height=height, source=sheet_source(sheet),
                 alphaBounds=[min(box[0] for box in bounds), min(box[1] for box in bounds),
                              max(box[2] for box in bounds), max(box[3] for box in bounds)])
    if frames > 1:
        entry["frames"] = frames
    manifest[asset_id] = entry
    with TemporaryDirectory(dir=ROOT) as temporary:
        folder = Path(temporary)
        install_png(sheet, ASSETS / "slices" / f"{asset_id}.png", folder)
        write_manifest(manifest, folder)
    unit = "frame" if frames == 1 else "frames"
    print(f"{asset_id}: {frames} flat sprite {unit} of {width} × {height} px")


def install_png(sheet, target, folder):
    staged = folder / target.name
    shutil.copyfile(sheet, staged)
    target.parent.mkdir(parents=True, exist_ok=True)
    staged.replace(target)


def import_ground(sheet, name):
    validate_source(sheet)
    if name not in GROUND_NAMES:
        raise ValueError(f"Unknown ground tile {name!r}. Use {', '.join(GROUND_NAMES)}.")
    with Image.open(sheet) as image:
        if image.format != "PNG" or image.size != (128, 128):
            raise ValueError("Ground tiles must be 128 × 128 px PNGs.")
        image.verify()
    target = ASSETS / f"ground_{name}.png"
    manifest = read_manifest()
    manifest.setdefault("ground", {})[name] = target.name
    with TemporaryDirectory(dir=ROOT) as temporary:
        folder = Path(temporary)
        install_png(sheet, target, folder)
        write_manifest(manifest, folder)
    print(f"Installed ground tile: {target.name}")


def recolor_livery(rgba, shift):
    colors, indices = np.unique(rgba.reshape(-1, 4), return_inverse=True, axis=0)
    for color in colors:
        r, g, b, a = map(int, color)
        hue, saturation, value = colorsys.rgb_to_hsv(r / 255, g / 255, b / 255)
        # Retain the glass, trim, wheels and headlights. Shift the existing red body ramp.
        if a and value > 0.25 and saturation > 0.45 and (hue < 0.07 or hue > 0.96):
            rgb = colorsys.hsv_to_rgb((hue + shift) % 1, saturation, value)
            color[:3] = [round(channel * 255) for channel in rgb]
    return colors[indices].reshape(rgba.shape)


def install_car_variants():
    manifest = read_manifest()
    slots = [slot for slot in CAR_SLOTS if manifest.get(slot, {}).get("type") != "direction"]
    if not slots:
        return
    original = ASSETS / "slices/car.png"
    entry = manifest.get("car")
    if not original.is_file() or not entry:
        raise ValueError("The base car strip is missing. Install hero_car_a_slices.png first.")
    with Image.open(original) as image:
        rgba = np.array(image.convert("RGBA"))
    with TemporaryDirectory(dir=ROOT) as temporary:
        folder = Path(temporary)
        for asset_id in slots:
            target = ASSETS / "slices" / f"{asset_id}.png"
            if asset_id == "car_1":
                install_png(original, target, folder)
            else:
                staged = folder / target.name
                Image.fromarray(recolor_livery(rgba, CAR_HUES[asset_id])).save(staged, optimize=True)
                staged.replace(target)
            manifest[asset_id] = {**entry, "type": "stack"}
        write_manifest(manifest, folder)
    print("Installed stack liveries in car_1–car_4 slots without direction sheets.")


def import_named(sheet, asset_id, overrides, from_slices):
    validate_source(sheet)
    if match := DIRECTION_NAME.fullmatch(sheet.name):
        if overrides or from_slices:
            raise ValueError("Direction sheets use the frame count in their filename.")
        name, count = match.groups()
        slot = direction_slot(name)
        if name.lower() in V3_CAR_NAMES and (asset_id is None or asset_id == slot):
            # Artist redraws ship under the same names. Refresh the corresponding sibling
            # sheets together so a single command keeps the supplied car set in sync.
            sheets = {sibling_slot: (sibling, 8) for car, sibling_slot in V3_CAR_NAMES.items()
                      if (sibling := sheet.parent / f"cars_v3_{car}_8dir.png").is_file()}
            sheets[slot] = sheet, int(count)
            import_directions(sheets)
        else:
            import_directions({asset_id or slot: (sheet, int(count))})
    elif match := GROUND_NAME.fullmatch(sheet.name):
        if asset_id or overrides or from_slices:
            raise ValueError("Ground tiles use their filename and take no slicing options.")
        import_ground(sheet, match[1].lower())
    elif match := PICNIC_NAME.fullmatch(sheet.name):
        if overrides or from_slices:
            raise ValueError("Flat picnic sprites take no slicing options.")
        name = match[1].lower()
        import_sprite(sheet, asset_id or name, PICNIC_FRAMES.get(name, 1))
    else:
        if not asset_id:
            raise ValueError("Specify an asset ID or use a recognized v3 filename.")
        if from_slices and overrides.keys() - {"slices"}:
            raise ValueError("Only --slices applies to pre-carved strips.")
        import_sheet(sheet, asset_id, overrides, from_slices)
        if asset_id == "car":
            install_car_variants()


def artist_directions():
    recognized = {}
    for sheet in sorted(HANDOFF.glob("cars_v3_*dir.png")):
        match = DIRECTION_NAME.fullmatch(sheet.name)
        if not match or "_v1_" in sheet.name:
            continue
        name, count = match.groups()
        slot = direction_slot(name)
        if slot is None:
            raise ValueError(f"Unknown car name {name!r} in {sheet.name}. Use a named or explicit car slot.")
        if slot in recognized:
            raise ValueError(f"Multiple v3 direction sheets target {slot}. Keep one sheet per car.")
        recognized[slot] = sheet, int(count)
    return {slot: recognized[slot] for slot in CAR_SLOTS if slot in recognized}


def import_artist():
    directions = artist_directions()
    for asset_id, (filename, slices) in ARTIST_IMPORTS.items():
        sheet = HANDOFF / filename
        if sheet.is_file():
            import_sheet(sheet, asset_id, {"slices": slices}, from_slices=True)
        elif not (ASSETS / "slices" / f"{asset_id}.png").is_file():
            raise ValueError(f"Missing current artist strip: {sheet}")
    for sheet in sorted(HANDOFF.glob("picnic_*.png")):
        if "_v1_" not in sheet.name.lower():
            import_named(sheet, None, {}, False)
    for name in GROUND_NAMES:
        sheet = HANDOFF / f"ground_{name}.png"
        if sheet.is_file():
            import_ground(sheet, name)
    import_directions(directions)
    install_car_variants()


def import_placeholders():
    manifest = read_manifest()
    generate()
    for asset_id in (*PLACEHOLDERS, *PICNIC_IDS):
        entry = manifest.get(asset_id, {})
        sheet_name = "car" if asset_id == "car_placeholder" else asset_id
        if entry.get("source") and entry["source"] != f"art/placeholders/{sheet_name}.png":
            continue
        import_sheet(OUTPUT / f"{sheet_name}.png", asset_id, {})
    install_car_variants()


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
            import_placeholders()
        elif args.all_artist and not (args.sheet or args.asset_id or overrides):
            import_artist()
        elif args.sheet and not (args.all_placeholders or args.all_artist):
            import_named(args.sheet, args.asset_id, overrides, args.from_slices)
        else:
            parser.error("Use [--from-slices] SHEET [ASSET_ID] [overrides], --all-placeholders, or --all-artist.")
    except (OSError, ValueError, subprocess.CalledProcessError) as error:
        parser.exit(1, f"{error}\n")


if __name__ == "__main__":
    main()
