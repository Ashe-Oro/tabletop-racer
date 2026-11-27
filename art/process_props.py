#!/usr/bin/env python3
"""QA, carve, and preview a four-view prop sheet."""
from __future__ import annotations

import argparse
import math
import sys
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path("/workspace/tabletop-racer/art")
SLICER = Path("/tmp/sprite-stacking/skills/sprite-stacking/scripts")
sys.path.insert(0, str(SLICER))
from views_to_slices import (  # noqa: E402
    render_stack_image,
    thin_runs,
    views_to_slices,
)

# Target footprints after carve: (W, L, H, use_round)
TARGETS = {
    "mug": (64, 64, 60, True),
    "cereal_box": (50, 36, 88, False),
    "pencil": (12, 160, 12, False),
    "coin_stack": (22, 22, 16, True),
    "ruler": (16, 180, 8, False),
    "eraser": (28, 16, 12, False),
    "salt_shaker": (24, 24, 44, True),
    "butter_dish": (48, 36, 26, False),
    "crumb_pile": (36, 32, 12, False),
}

WHITE = np.array([248, 248, 248], dtype=np.int16)


def load_rgb(path: Path) -> np.ndarray:
    return np.asarray(Image.open(path).convert("RGB"))


def mask_fg(rgb: np.ndarray, tol: int = 18) -> np.ndarray:
    return np.any(np.abs(rgb.astype(np.int16) - WHITE) > tol, axis=2)


def split_views(rgb: np.ndarray) -> list[tuple[int, int, int, int]]:
    m = mask_fg(rgb)
    cols = m.any(axis=0)
    boxes = []
    in_run = False
    start = 0
    for i, occ in enumerate(cols):
        if occ and not in_run:
            in_run = True
            start = i
        elif not occ and in_run:
            in_run = False
            xs, xe = start, i
            ys = np.where(m[:, xs:xe].any(axis=1))[0]
            if len(ys):
                boxes.append((xs, int(ys[0]), xe, int(ys[-1]) + 1))
    if in_run:
        xs, xe = start, m.shape[1]
        ys = np.where(m[:, xs:xe].any(axis=1))[0]
        if len(ys):
            boxes.append((xs, int(ys[0]), xe, int(ys[-1]) + 1))
    if len(boxes) > 4:
        boxes = sorted(boxes, key=lambda b: (b[2] - b[0]) * (b[3] - b[1]), reverse=True)[:4]
        boxes = sorted(boxes, key=lambda b: b[0])
    return boxes


def aa_score(rgb: np.ndarray, box) -> float:
    x0, y0, x1, y1 = box
    view = rgb[y0:y1, x0:x1]
    luma = view.astype(np.int16).mean(axis=2)
    bg = ~mask_fg(view, tol=18)
    fringe = mid = 0
    h, w = luma.shape
    ys, xs = np.where(bg)
    for y, x in zip(ys, xs):
        neigh = ~bg[max(0, y - 1) : min(h, y + 2), max(0, x - 1) : min(w, x + 2)]
        if neigh.any():
            mid += 1
            if 40 < luma[y, x] < 235:
                fringe += 1
    return fringe / max(mid, 1)


def qa_sheet(path: Path) -> dict:
    rgb = load_rgb(path)
    h, w = rgb.shape[:2]
    boxes = split_views(rgb)
    names = ["TOP", "SIDE", "FRONT", "BACK"]
    rec = {"file": str(path), "size": (w, h), "n_views": len(boxes), "views": [], "ok": True, "reasons": []}
    for i, box in enumerate(boxes):
        vw, vh = box[2] - box[0], box[3] - box[1]
        rec["views"].append({"name": names[i] if i < 4 else f"V{i}", "w": vw, "h": vh, "box": box, "fringe": aa_score(rgb, box)})
    if len(boxes) != 4:
        rec["ok"] = False
        rec["reasons"].append(f"expected 4 views, found {len(boxes)}")
        return rec

    def close(a, b, rel=0.08):
        return abs(a - b) <= max(8, int(rel * max(a, b, 1)))

    tw, th = rec["views"][0]["w"], rec["views"][0]["h"]
    sw, sh = rec["views"][1]["w"], rec["views"][1]["h"]
    fw, fh = rec["views"][2]["w"], rec["views"][2]["h"]
    bw, bh = rec["views"][3]["w"], rec["views"][3]["h"]
    checks = [
        ("TOP length vs SIDE length", th, sw),
        ("TOP width vs FRONT width", tw, fw),
        ("TOP width vs BACK width", tw, bw),
        ("SIDE height vs FRONT height", sh, fh),
        ("SIDE height vs BACK height", sh, bh),
    ]
    for label, a, b in checks:
        if not close(a, b):
            rec["ok"] = False
            rec["reasons"].append(f"{label}: {a} vs {b} ({100*abs(a-b)/max(a,b,1):.1f}%)")
    ys = [b[1] for b in boxes]
    if max(ys) - min(ys) > 0.35 * h:
        rec["ok"] = False
        rec["reasons"].append("views are not in a single horizontal row")
    fringes = [v["fringe"] for v in rec["views"]]
    if max(fringes) > 0.45:
        rec["ok"] = False
        rec["reasons"].append(f"soft edges (fringe {['%.2f'%f for f in fringes]})")
    elif max(fringes) > 0.25:
        rec["reasons"].append(f"WARN: some edge softness (fringe {['%.2f'%f for f in fringes]})")
    return rec


def carve(path: Path, name: str, out_dir: Path):
    tw, tl, th, use_round = TARGETS[name]
    sheet = np.array(Image.open(path).convert("RGBA"))
    vol, views = views_to_slices(
        sheet,
        slices=th,
        top_nose="down",
        side_nose="left",
        order="reading",
        colours=32,
        shade=0.12,
        round_=use_round,
    )
    # vol shape: (H, L, W, 4) — confirm against views_to_slices: n, h, w = vol.shape[:3]
    # In render_stack_image: n, h, w = vol.shape[:3]; top was fit to (W, L) then carve...
    # strip concatenate along axis 1: each slice is L x W? print and measure.
    n, sl_h, sl_w = vol.shape[:3]
    thins = thin_runs(vol)
    slices_path = out_dir / f"prop_{name}_slices.png"
    strip = np.concatenate(list(vol), axis=1)
    Image.fromarray(strip).save(slices_path)

    # check sheet via build_preview
    from views_to_slices import build_preview, build_html_viewer
    preview = out_dir / f"prop_{name}_preview.png"
    build_preview(vol, views, preview)
    html = out_dir / f"prop_{name}_viewer.html"
    build_html_viewer(vol, views, html, title=f"prop_{name}")

    # turntable gif
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
    gif = out_dir / f"prop_{name}_turntable.gif"
    frames[0].save(gif, save_all=True, append_images=frames[1:], duration=80, loop=0, optimize=False, disposal=2)

    plan_w, plan_l, slices = sl_w, sl_h, n
    twt, tlt, tht, _ = TARGETS[name]
    def rel(a, b):
        return 100 * abs(a - b) / max(b, 1)
    footprint_ok = rel(plan_w, twt) <= 20 and rel(plan_l, tlt) <= 20 and slices == tht
    return {
        "name": name,
        "vol": (slices, plan_l, plan_w),  # H, L, W
        "thin_runs": thins,
        "slices_path": str(slices_path),
        "preview": str(preview),
        "gif": str(gif),
        "html": str(html),
        "target": (twt, tlt, tht),
        "footprint_ok": footprint_ok,
        "plan_delta_pct": (rel(plan_w, twt), rel(plan_l, tlt)),
    }


def format_qa(rec: dict) -> str:
    lines = [f"file: {rec['file']}", f"size: {rec['size'][0]}x{rec['size'][1]}", f"views: {rec['n_views']}"]
    for v in rec["views"]:
        lines.append(f"  {v['name']}: {v['w']}x{v['h']} fringe={v['fringe']:.2f}")
    lines.append("PASS" if rec["ok"] else "FAIL")
    for r in rec["reasons"]:
        lines.append(f" - {r}")
    return "\n".join(lines)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("sheet")
    ap.add_argument("name")
    ap.add_argument("--out", default=str(ROOT / "carve_preview"))
    args = ap.parse_args()
    sheet = Path(args.sheet)
    rec = qa_sheet(sheet)
    print(format_qa(rec))
    result = carve(sheet, args.name, Path(args.out))
    print(
        f"carve: {result['vol'][2]}x{result['vol'][1]} plan, {result['vol'][0]} slices "
        f"(target {result['target'][0]}x{result['target'][1]}, H={result['target'][2]}) "
        f"delta% W,L={result['plan_delta_pct']} footprint_ok={result['footprint_ok']} "
        f"thin_runs={result['thin_runs']}"
    )
    return 0 if rec["ok"] and result["footprint_ok"] and not result["thin_runs"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
