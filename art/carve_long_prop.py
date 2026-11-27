#!/usr/bin/env python3
"""Carve a 1x4 sheet whose FRONT/BACK views are smaller than 14% of the longest view.

The skill slicer's find_views drops those ends, which happens for the pencil and
ruler. This helper locates all four views itself, then uses the same carve /
preview / GIF path as views_to_slices.py.

Usage:
  python3 art/carve_long_prop.py art/handoff/prop_ruler_fourview.png ruler
  python3 art/carve_long_prop.py art/handoff/prop_pencil_fourview.png pencil
"""
from __future__ import annotations

import sys
from pathlib import Path

# Reuse the injection path in process_props' spirit
import numpy as np
from PIL import Image

ROOT = Path("/workspace/tabletop-racer/art")
sys.path.insert(0, str(ROOT))
sys.path.insert(0, "/tmp/sprite-stacking/skills/sprite-stacking/scripts")

from process_props import split_views, TARGETS  # noqa: E402
from views_to_slices import (  # noqa: E402
    build_html_viewer,
    build_preview,
    carve,
    fit,
    one_palette,
    remove_background,
    render_stack_image,
    strip_outline,
    thin_runs,
)


def extract_views(path: Path):
    im = Image.open(path).convert("RGBA")
    rgb = np.asarray(im.convert("RGB"))
    clean = remove_background(np.array(im), tol=28)
    boxes = split_views(rgb)
    if len(boxes) != 4:
        raise SystemExit(f"expected 4 views, found {len(boxes)} in {path}")
    views = []
    for x0, y0, x1, y1 in boxes:
        v = clean[y0:y1, x0:x1].copy()
        ys, xs = np.nonzero(v[..., 3] >= 128)
        v = v[ys.min() : ys.max() + 1, xs.min() : xs.max() + 1]
        v[..., 3] = np.where(v[..., 3] >= 128, 255, 0)
        views.append(v)
    return views


def main():
    if len(sys.argv) < 3:
        print(__doc__)
        return 2
    path = Path(sys.argv[1])
    name = sys.argv[2]
    if name not in TARGETS:
        raise SystemExit(f"unknown prop {name}, expected one of {list(TARGETS)}")
    tw, tl, th, use_round = TARGETS[name]
    top, side, front, back = extract_views(path)
    side_aligned = side[:, ::-1]
    L = max(4, round(th * side.shape[1] / side.shape[0]))
    W = max(4, round(L * top.shape[1] / top.shape[0]))
    H = th
    top = fit(top, W, L)
    side_aligned = fit(side_aligned, L, H)
    front = fit(front, W, H)
    back = fit(back, W, H)
    back_aligned = back[:, ::-1]
    cleaned = [strip_outline(v) for v in (top, side_aligned, front, back_aligned)]
    top, side_aligned, front, back_aligned = one_palette(cleaned, 32)
    vol = carve(top, side_aligned, front, back_aligned, shade=0.12, round_=use_round)
    display = [top, side_aligned[:, ::-1], front, back_aligned[:, ::-1]]
    out = Path(sys.argv[3]) if len(sys.argv) > 3 else ROOT / "handoff"
    out.mkdir(parents=True, exist_ok=True)
    Image.fromarray(np.concatenate(list(vol), axis=1)).save(out / f"prop_{name}_slices.png")
    build_preview(vol, display, out / f"prop_{name}_preview.png")
    build_html_viewer(vol, display, out / f"prop_{name}_viewer.html", title=f"prop_{name}")
    # turntable gif (same recipe as process_props: 15 deg, squash 0.75, 5x nearest)
    frames = []
    scale = 5
    raw = [render_stack_image(vol, ang, squash=0.75, spacing=1.0) for ang in range(0, 360, 15)]
    max_w = max(im.width for im in raw)
    max_h = max(im.height for im in raw)
    for im in raw:
        canvas = Image.new("RGBA", (max_w, max_h), (255, 255, 255, 255))
        canvas.paste(im, ((max_w - im.width) // 2, (max_h - im.height) // 2), im)
        up = canvas.resize((max_w * scale, max_h * scale), Image.NEAREST)
        frames.append(up.convert("P", palette=Image.ADAPTIVE, colors=64))
    gif = out / f"prop_{name}_turntable.gif"
    frames[0].save(gif, save_all=True, append_images=frames[1:], duration=80, loop=0, optimize=False, disposal=2)
    print(f"{vol.shape[0]} slices of {vol.shape[2]}x{vol.shape[1]} px, thin_runs={thin_runs(vol)}")
    print(f"wrote {out / f'prop_{name}_slices.png'}, preview, viewer, {gif.name}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
