#!/usr/bin/env python3
"""Shared load/save, stills, turntable GIF, and before/after helpers."""
from __future__ import annotations

import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw

sys.path.insert(0, "/workspace/tabletop-racer/tools/sprite-stacking/scripts")
from views_to_slices import (
    render_stack_image,
    thin_runs,
    build_preview,
    build_html_viewer,
)

HANDOFF = Path("/workspace/tabletop-racer/art/handoff")
SAFE = Path("/workspace/tabletop-racer/art/v2-export")
ATTEMPTS = Path("/workspace/tabletop-racer/art/attempts")
WOOD_PATH = HANDOFF / "table_wood_tile.png"
SLICE_SCRIPTS = "/workspace/tabletop-racer/tools/sprite-stacking/scripts"


def load_vol(path: Path, n: int) -> np.ndarray:
    im = np.asarray(Image.open(path).convert("RGBA"))
    h, w = im.shape[:2]
    assert w % n == 0, (path, w, n)
    sw = w // n
    return np.stack([im[:, i * sw : (i + 1) * sw] for i in range(n)], axis=0)


def save_slices(vol: np.ndarray, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    Image.fromarray(np.concatenate(list(vol), axis=1)).save(path)


def tight_sprite(im: Image.Image, pad: int = 0) -> Image.Image:
    a = np.asarray(im)
    ys, xs = np.where(a[..., 3] > 0)
    if len(ys) == 0:
        return im
    crop = im.crop((xs.min(), ys.min(), xs.max() + 1, ys.max() + 1))
    if pad:
        c = Image.new("RGBA", (crop.width + 2 * pad, crop.height + 2 * pad), (0, 0, 0, 0))
        c.paste(crop, (pad, pad), crop)
        return c
    return crop


def render_scaled(vol, angle, scale=4, squash=0.75) -> Image.Image:
    im = render_stack_image(vol, angle, squash=squash, spacing=1.0, shadow=True, outline=True)
    return im.resize((im.width * scale, im.height * scale), Image.NEAREST)


def write_stills(vol, out_dir: Path, angles=(0, 35, 45, 90, 135, 180, 225, 270, 315), scale=6, prefix="still"):
    out_dir.mkdir(parents=True, exist_ok=True)
    for ang in angles:
        im = render_scaled(vol, ang, scale=scale)
        bg = Image.new("RGBA", im.size, (255, 255, 255, 255))
        bg.paste(im, (0, 0), im)
        bg.convert("RGB").save(out_dir / f"{prefix}_{int(ang):03d}.png")


def write_turntable(vol, path: Path, scale=5, step=15) -> None:
    raw = [render_stack_image(vol, ang, squash=0.75, spacing=1.0) for ang in range(0, 360, step)]
    max_w = max(im.width for im in raw)
    max_h = max(im.height for im in raw)
    frames = []
    for im in raw:
        canvas = Image.new("RGBA", (max_w, max_h), (255, 255, 255, 255))
        canvas.paste(im, ((max_w - im.width) // 2, (max_h - im.height) // 2), im)
        up = canvas.resize((max_w * scale, max_h * scale), Image.NEAREST)
        frames.append(up.convert("P", palette=Image.ADAPTIVE, colors=64))
    path.parent.mkdir(parents=True, exist_ok=True)
    frames[0].save(path, save_all=True, append_images=frames[1:], duration=80, loop=0, optimize=False, disposal=2)


def _wood():
    wood = Image.open(WOOD_PATH).convert("RGB")
    if wood.size[0] > 400:
        factor = max(2, wood.size[0] // 256)
        wood = wood.resize((wood.size[0] // factor, wood.size[1] // factor), Image.NEAREST)
    return wood


def wood_bg(wood, W, H) -> Image.Image:
    bg = Image.new("RGB", (W, H))
    tw, th = wood.size
    for y in range(0, H, th):
        for x in range(0, W, tw):
            bg.paste(wood, (x, y))
    return bg


def on_wood(vol, angle, scale=4, pad=12, wood=None) -> Image.Image:
    if wood is None:
        wood = _wood()
    sprite = tight_sprite(render_scaled(vol, angle, scale=scale), pad=0)
    W, H = sprite.width + pad * 2, sprite.height + pad * 2
    bg = wood_bg(wood, W, H).convert("RGBA")
    bg.paste(sprite, (pad, pad), sprite)
    return bg.convert("RGB")


def before_after(old, new, path: Path, angles=(0, 45, 90, 135), scale=4, title="") -> None:
    wood = _wood()
    rows = []
    for ang in angles:
        o = on_wood(old, ang, scale=scale, wood=wood)
        n = on_wood(new, ang, scale=scale, wood=wood)
        rows.append((ang, o, n))
    gap, header, label_h = 10, 36, 22
    col_w = max(max(o.width, n.width) for _, o, n in rows)
    W = col_w * 2 + gap * 3
    H = header + gap + sum(label_h + max(o.height, n.height) + gap for _, o, n in rows)
    canvas = Image.new("RGB", (W, H), (26, 18, 16))
    d = ImageDraw.Draw(canvas)
    d.text((12, 10), title or "v1 vs v2    4x, squash 0.75", fill=(244, 240, 230))

    def paste_centered(dst, src, box):
        x0, y0, x1, y1 = box
        bw, bh = x1 - x0, y1 - y0
        dst.paste(wood_bg(wood, bw, bh), (x0, y0))
        dst.paste(src, (x0 + (bw - src.width) // 2, y0 + (bh - src.height) // 2))

    y = header + 2
    for ang, o, n in rows:
        rh = max(o.height, n.height)
        d.text((gap, y + 4), f"v1  {ang}°", fill=(232, 196, 138))
        d.text((gap * 2 + col_w, y + 4), f"v2  {ang}°", fill=(232, 196, 138))
        y += label_h
        paste_centered(canvas, o, (gap, y, gap + col_w, y + rh))
        paste_centered(canvas, n, (gap * 2 + col_w, y, gap * 2 + 2 * col_w, y + rh))
        y += rh + gap
    path.parent.mkdir(parents=True, exist_ok=True)
    canvas.save(path)
    print("wrote", path, canvas.size)


def export_prop(vol, name: str, out: Path) -> None:
    out.mkdir(parents=True, exist_ok=True)
    save_slices(vol, out / f"prop_{name}_slices.png")
    write_turntable(vol, out / f"prop_{name}_turntable.gif")
    write_stills(vol, out, prefix="still")
    print(f"{name}: {vol.shape[0]} slices of {vol.shape[2]}x{vol.shape[1]} thin_runs={thin_runs(vol)}")
