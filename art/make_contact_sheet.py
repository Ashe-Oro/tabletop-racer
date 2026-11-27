#!/usr/bin/env python3
"""Composite carved stacks onto a tiled wood table at a shared art-pixel scale."""
from __future__ import annotations

import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFont

sys.path.insert(0, "/tmp/sprite-stacking/skills/sprite-stacking/scripts")
from views_to_slices import render_stack_image

ROOT = Path("/workspace/tabletop-racer/art/handoff")
SCALE = 4  # integer display scale, same for every object


def load_vol(slices_path: Path) -> np.ndarray:
    im = np.asarray(Image.open(slices_path).convert("RGBA"))
    # horizontal strip of N slices, each W x H, ground on the left
    # We stored concatenate(list(vol), axis=1) where vol is (N, L, W, 4)
    # so strip height = L, width = N * W. We need N from sidecar or filename conventions.
    raise NotImplementedError


def load_vol_known(slices_path: Path, n: int) -> np.ndarray:
    im = np.asarray(Image.open(slices_path).convert("RGBA"))
    h, w = im.shape[:2]
    assert w % n == 0, (slices_path, w, n)
    sw = w // n
    vol = np.stack([im[:, i * sw : (i + 1) * sw] for i in range(n)], axis=0)
    return vol


def render(vol, angle, scale=SCALE):
    im = render_stack_image(vol, angle, squash=0.75, spacing=1.0, shadow=True, outline=True)
    return im.resize((im.width * scale, im.height * scale), Image.NEAREST)


def tile_wood(tile: Image.Image, W: int, H: int) -> Image.Image:
    tw, th = tile.size
    out = Image.new("RGB", (W, H))
    for y in range(0, H, th):
        for x in range(0, W, tw):
            out.paste(tile, (x, y))
    return out.crop((0, 0, W, H))


def paste_center(bg: Image.Image, sprite: Image.Image, cx: int, cy: int):
    # cy is ground contact-ish: place sprite so its bottom-center (minus a little shadow) sits on (cx, cy)
    x = cx - sprite.width // 2
    y = cy - sprite.height + 8 * SCALE  # leave a little shadow hanging
    bg.paste(sprite, (x, y), sprite)


def main():
    # Prefer a modest tile for the backdrop; scale wood down by nearest to ~251 px if huge
    wood = Image.open(ROOT / "table_wood_tile.png").convert("RGB")
    if wood.size[0] > 400:
        factor = max(2, wood.size[0] // 256)
        nw, nh = wood.size[0] // factor, wood.size[1] // factor
        wood = wood.resize((nw, nh), Image.NEAREST)

    # table canvas in screen pixels
    W, H = 1400, 1000
    bg = tile_wood(wood, W, H)

    # assets: name, slices file, slice count, angle, position (cx, cy)
    # Positions chosen so the car sits mid-table with props around it like a circuit
    assets = [
        ("cereal_box", ROOT / "prop_cereal_box_slices.png", 88, 35, (240, 420)),
        ("mug", ROOT / "prop_mug_slices.png", 60, 40, (1120, 400)),
        ("salt_shaker", ROOT / "prop_salt_shaker_slices.png", 44, 50, (980, 320)),
        ("butter_dish", ROOT / "prop_butter_dish_slices.png", 26, 25, (400, 780)),
        ("crumb_pile", ROOT / "prop_crumb_pile_slices.png", 12, 15, (1050, 780)),
        ("eraser", ROOT / "prop_eraser_slices.png", 12, 20, (250, 700)),
        ("coin_stack", ROOT / "prop_coin_stack_slices.png", 16, 30, (700, 280)),
        ("ruler", ROOT / "prop_ruler_slices.png", None, 0, (700, 860)),  # n inferred later
        ("pencil", ROOT / "prop_pencil_slices.png", None, 90, (200, 560)),
        ("car", ROOT / "hero_car_a_slices.png", 36, 35, (700, 560)),
    ]

    # infer slice counts from file width / a known slice width is risky; read from a tiny manifest
    # We'll pass n in a dict built by the caller via env or by reading sidecar... 
    # For now, infer n from filename map filled at runtime by looking at known volumes.
    known_n = {
        "hero_car_a_slices.png": 36,
        "prop_cereal_box_slices.png": 88,
        "prop_mug_slices.png": 60,
        "prop_salt_shaker_slices.png": 44,
        "prop_butter_dish_slices.png": 26,
        "prop_crumb_pile_slices.png": 12,
        "prop_eraser_slices.png": 12,
        "prop_coin_stack_slices.png": 16,
    }
    # pencil and ruler n come from their shipped heights
    from json import loads

    manifest = Path("/tmp/contact_manifest.json")
    if manifest.exists():
        known_n.update(loads(manifest.read_text()))

    layers = []
    for name, path, n, angle, pos in assets:
        if not path.exists():
            print("missing", path)
            continue
        if n is None:
            n = known_n.get(path.name)
        if n is None:
            print("no slice count for", path)
            continue
        vol = load_vol_known(path, n)
        sprite = render(vol, angle)
        # y-sort by ground y
        layers.append((pos[1], pos[0], sprite, name))

    layers.sort()
    canvas = bg.convert("RGBA")
    for cy, cx, sprite, name in layers:
        paste_center(canvas, sprite, cx, cy)

    # title bar
    title = Image.new("RGBA", (W, 36), (26, 18, 16, 230))
    d = ImageDraw.Draw(title)
    d.text((12, 8), "Tabletop Racer  —  art set v1   (shared art-pixel scale, squash 0.75)", fill=(244, 240, 230))
    canvas.paste(title, (0, 0), title)

    out = ROOT / "art_set_v1_contact.png"
    canvas.convert("RGB").save(out, optimize=True)
    print("wrote", out, canvas.size)


if __name__ == "__main__":
    main()
