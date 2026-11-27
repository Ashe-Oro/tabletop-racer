#!/usr/bin/env python3
"""Gate a 1x4 TOP, SIDE, FRONT, BACK sheet against the style-lock quality bar."""
from __future__ import annotations

import sys
from pathlib import Path

import numpy as np
from PIL import Image

WHITE = np.array([250, 250, 250], dtype=np.int16)


def load(path: Path) -> np.ndarray:
    im = Image.open(path).convert("RGB")
    return np.asarray(im)


def mask_fg(rgb: np.ndarray, tol: int = 18) -> np.ndarray:
    return np.any(np.abs(rgb.astype(np.int16) - WHITE) > tol, axis=2)


def split_views(rgb: np.ndarray) -> list[tuple[int, int, int, int]]:
    """Return up to 4 bounding boxes (x0,y0,x1,y1) left-to-right."""
    m = mask_fg(rgb)
    # column occupancy
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
            xs = start
            xe = i
            ys = np.where(m[:, xs:xe].any(axis=1))[0]
            if len(ys) == 0:
                continue
            boxes.append((xs, int(ys[0]), xe, int(ys[-1]) + 1))
    if in_run:
        xs = start
        xe = m.shape[1]
        ys = np.where(m[:, xs:xe].any(axis=1))[0]
        if len(ys):
            boxes.append((xs, int(ys[0]), xe, int(ys[-1]) + 1))
    # If we got more than 4 (speckle), keep the 4 largest
    if len(boxes) > 4:
        boxes = sorted(boxes, key=lambda b: (b[2] - b[0]) * (b[3] - b[1]), reverse=True)[:4]
        boxes = sorted(boxes, key=lambda b: b[0])
    return boxes


def aa_score(rgb: np.ndarray, box) -> float:
    """Fraction of unique edge-adjacent colors that look like anti-aliased blends vs white."""
    x0, y0, x1, y1 = box
    view = rgb[y0:y1, x0:x1]
    m = mask_fg(view, tol=12)
    if m.sum() == 0:
        return 0.0
    # pixels that are neither near-white nor near-ink and sit on the silhouette edge
    ink = np.all(view.astype(np.int16) < 40, axis=2)
    edge = m & ~ink
    # dilate bg and intersect
    from numpy.lib.stride_tricks import sliding_window_view
    # simple: count mid-luma fringe pixels next to white
    luma = view.astype(np.int16).mean(axis=2)
    bg = ~mask_fg(view, tol=18)
    fringe = 0
    mid = 0
    h, w = luma.shape
    for y, x in zip(*np.where(bg)):
        y0_, y1_ = max(0, y - 1), min(h, y + 2)
        x0_, x1_ = max(0, x - 1), min(w, x + 2)
        neigh = ~bg[y0_:y1_, x0_:x1_]
        if neigh.any():
            mid += 1
            if 40 < luma[y, x] < 235:
                fringe += 1
    return fringe / max(mid, 1)


def main() -> int:
    if len(sys.argv) < 2:
        print("usage: qa_sheet.py sheet.png")
        return 2
    path = Path(sys.argv[1])
    rgb = load(path)
    h, w = rgb.shape[:2]
    print(f"file: {path}")
    print(f"size: {w}x{h}")
    boxes = split_views(rgb)
    print(f"views found: {len(boxes)}")
    names = ["TOP", "SIDE", "FRONT", "BACK"]
    dims = []
    for i, box in enumerate(boxes):
        x0, y0, x1, y1 = box
        vw, vh = x1 - x0, y1 - y0
        dims.append((vw, vh))
        name = names[i] if i < 4 else f"V{i}"
        aa = aa_score(rgb, box)
        print(f"  {name}: {vw}x{vh} at ({x0},{y0})-({x1},{y1})  edge-fringe={aa:.2f}")
    ok = True
    reasons = []
    if len(boxes) != 4:
        ok = False
        reasons.append(f"expected 4 views, found {len(boxes)}")
    if len(boxes) == 4:
        (tw, th), (sw, sh), (fw, fh), (bw, bh) = dims
        def close(a, b, tol=None):
            if tol is None:
                tol = max(3, int(0.04 * max(a, b, 1)))
            return abs(a - b) <= tol
        # TOP length ~ SIDE length (both are the long axis of the car in those views)
        # TOP is typically taller than wide (front down), SIDE is typically wider than tall (front left)
        if not close(th, sw):
            ok = False
            reasons.append(f"TOP length {th} vs SIDE length {sw} mismatch")
        if not close(tw, fw):
            ok = False
            reasons.append(f"TOP width {tw} vs FRONT width {fw} mismatch")
        if not close(tw, bw):
            ok = False
            reasons.append(f"TOP width {tw} vs BACK width {bw} mismatch")
        if not close(sh, fh):
            ok = False
            reasons.append(f"SIDE height {sh} vs FRONT height {fh} mismatch")
        if not close(sh, bh):
            ok = False
            reasons.append(f"SIDE height {sh} vs BACK height {bh} mismatch")
        # aspect expectations (soft)
        if tw >= th:
            reasons.append("WARN: TOP is not taller than wide; nose may not point down")
        if sw <= sh:
            reasons.append("WARN: SIDE is not wider than tall; nose may not point left")
        fringes = [aa_score(rgb, b) for b in boxes]
        if max(fringes) > 0.45:
            ok = False
            reasons.append(f"soft/anti-aliased edges (fringe scores {['%.2f'%f for f in fringes]})")
        elif max(fringes) > 0.25:
            reasons.append(f"WARN: some edge softness (fringe scores {['%.2f'%f for f in fringes]})")
        # layout: 1x4 row means all views share similar y and are left-to-right
        ys = [b[1] for b in boxes]
        if max(ys) - min(ys) > 0.25 * h:
            ok = False
            reasons.append("views are not in a single horizontal row (maybe 2x2)")
    print("PASS" if ok and not any(r.startswith("WARN") and False for r in reasons) else ("PASS WITH WARNINGS" if ok else "FAIL"))
    for r in reasons:
        print(" -", r)
    return 0 if ok else 1


if __name__ == "__main__":
    raise SystemExit(main())
