#!/usr/bin/env python3
"""Procedural / cleaned-slice revisions for mug, butter dish, salt shaker, coin stack, and hero car."""
from __future__ import annotations

import shutil
import sys
from pathlib import Path

import numpy as np

sys.path.insert(0, "/workspace/tabletop-racer/art")
from stack_util import (
    HANDOFF, SAFE, ATTEMPTS, load_vol, save_slices, export_prop, before_after, thin_runs,
)

# Locked / already-used palette
CREAM_HI = (0xF4, 0xF0, 0xE6)
CREAM_MID = (0xE8, 0xE3, 0xD4)
CREAM_SH = (0xC9, 0xC2, 0xB4)
CREAM_DEEP = (0xB1, 0xA2, 0x94)
COFFEE = (0x3B, 0x22, 0x18)
GOLD_HI = (0xF0, 0xC5, 0x3A)
GOLD_MID = (0xD4, 0xA0, 0x17)
GOLD_SH = (0x8A, 0x5A, 0x2B)
CHROME_HI = (0xE8, 0xEC, 0xF0)
CHROME_MID = (0x8A, 0x90, 0x98)
CHROME_SH = (0x4A, 0x50, 0x58)
GRAPHITE = (0x2A, 0x2A, 0x2E)
STRIPE = (0xFC, 0xEE, 0xC4)


def luma(rgb) -> np.ndarray:
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    return 0.299 * r + 0.587 * g + 0.114 * b


# ---------- mug ----------
def clean_mug(vol: np.ndarray) -> np.ndarray:
    CX, CY, R_INNER, R_BODY = 42.33, 29.42, 20.0, 30.0
    HANDLE_Z = (17, 45)
    n, L, W = vol.shape[:3]
    zz, yy, xx = np.indices((n, L, W))
    r = np.hypot(xx - CX, yy - CY)
    op = vol[..., 3] > 0
    handle = op & (
        ((r > R_BODY) & (zz >= HANDLE_Z[0]) & (zz <= HANDLE_Z[1]))
        | ((xx < 16) & (zz >= HANDLE_Z[0]) & (zz <= HANDLE_Z[1]) & (r > 22))
    )
    interior = op & ~handle & (r <= R_INNER)
    wall = op & ~handle & ~interior
    coffee_z = zz >= (n - 3)
    coffee = interior & coffee_z & (r <= (R_INNER - 1.2))
    out = vol.copy()
    out[op, :3] = CREAM_MID

    def shade_wall(x, y, z):
        vx, vy = x - CX, y - CY
        rr = max(1e-6, np.hypot(vx, vy))
        nx, ny = vx / rr, vy / rr
        lit = nx * 0.55 + ny * (-0.35)
        v = z / max(n - 1, 1)
        score = lit * 0.75 + (v - 0.45) * 0.5
        if score > 0.28:
            return CREAM_HI
        if score > -0.15:
            return CREAM_MID
        if score > -0.45:
            return CREAM_SH
        return CREAM_DEEP

    wz, wy, wx = np.where(wall)
    for z, y, x in zip(wz, wy, wx):
        out[z, y, x, :3] = shade_wall(x, y, z)
    hz, hy, hx = np.where(handle)
    for z, y, x in zip(hz, hy, hx):
        vx, vy = x - CX, y - CY
        rr = max(1e-6, np.hypot(vx, vy))
        xb = CX + R_BODY * (vx / rr)
        yb = CY + R_BODY * (vy / rr)
        col = shade_wall(xb, yb, z)
        if z < n * 0.22:
            col = CREAM_DEEP if col != CREAM_HI else CREAM_SH
        out[z, y, x, :3] = col
    iz, iy, ix = np.where(interior & ~coffee)
    for z, y, x in zip(iz, iy, ix):
        out[z, y, x, :3] = CREAM_SH if z < n * 0.25 else CREAM_MID
    out[coffee, :3] = COFFEE
    lip = op & ~handle & coffee_z & (r > (R_INNER - 1.2)) & (r <= R_BODY)
    out[lip, :3] = CREAM_HI
    return out


# ---------- butter dish ----------
def clean_butter(vol: np.ndarray) -> np.ndarray:
    """Keep occupancy. Recolor: cream body, a 2-slice gold belt that goes all
    the way around the lid join, and soft cream/shadow corners (no ink clusters)."""
    n, L, W = vol.shape[:3]
    op = vol[..., 3] > 0
    lu = luma(vol)
    # Gold-ish pixels in v1
    goldish = op & (vol[..., 0] > 160) & (vol[..., 1] > 110) & (vol[..., 1] < 200) & (vol[..., 2] < 120)
    dark = op & (lu < 80)
    # Find the z where gold is most common — that's the lid seam
    gold_per_z = [int(goldish[z].sum()) for z in range(n)]
    if max(gold_per_z) > 0:
        seam_z = int(np.argmax(gold_per_z))
    else:
        seam_z = n // 2
    # Belt is seam_z and seam_z-1 so it survives 3/4 aliasing
    belt_z = {seam_z, max(0, seam_z - 1)}
    print(f"  butter seam_z={seam_z} gold_per_z={gold_per_z}")

    out = vol.copy()
    zz, yy, xx = np.indices((n, L, W))
    # Bounding box of the dish in XY (use mid slice)
    mid = n // 2
    ys, xs = np.where(op[mid])
    y0, y1, x0, x1 = ys.min(), ys.max(), xs.min(), xs.max()
    cy, cx = (y0 + y1) / 2.0, (x0 + x1) / 2.0

    # Recolor everything cream with vertical + edge form lighting
    oz, oy, ox = np.where(op)
    for z, y, x in zip(oz, oy, ox):
        v = z / max(n - 1, 1)
        # distance to the rim
        edge = min(x - x0, x1 - x, y - y0, y1 - y)
        if v > 0.72 and edge > 2:
            col = CREAM_HI  # lid top
        elif v < 0.22:
            col = CREAM_SH
        elif edge <= 1:
            col = CREAM_SH
        else:
            col = CREAM_MID
        out[z, y, x, :3] = col

    # Gold belt: outer 2 px of the occupancy on belt slices, plus a ring just inside
    for z in belt_z:
        sl = op[z]
        pad = np.pad(sl, 1)
        # 4-neighbour rim
        rim = sl & ~(pad[1:-1, :-2] & pad[1:-1, 2:] & pad[:-2, 1:-1] & pad[2:, 1:-1])
        # also one pixel inward
        rpad = np.pad(rim, 1)
        inner = sl & (rpad[1:-1, :-2] | rpad[1:-1, 2:] | rpad[:-2, 1:-1] | rpad[2:, 1:-1])
        ring = rim | inner
        # highlight on the "front" (low y) and top-ish, mid otherwise
        ys, xs = np.where(ring)
        for y, x in zip(ys, xs):
            out[z, y, x, :3] = GOLD_HI if y < cy else GOLD_MID

    # Soft corners: any remaining very dark pixels become cream shadow, not ink
    lu2 = luma(out)
    leftover = op & (lu2 < 80)
    out[leftover, :3] = CREAM_DEEP
    return out


# ---------- salt shaker ----------
def clean_salt(vol: np.ndarray) -> np.ndarray:
    """Stable cylinder + cap. Cap gets a fixed 3-hole pattern and one broad
    highlight, no 1px sparkles that shimmer near 90°."""
    n, L, W = vol.shape[:3]  # 44, 25, 25
    op = vol[..., 3] > 0
    # Cap is the top ~12 slices (metal). Mean luma is a bad signal here
    # because a dark interior pulls every slice under 170.
    cap_z0 = max(0, n - 12)  # z=32..43 on the 44-slice shaker
    print(f"  salt cap from z={cap_z0} to {n-1}")

    cx, cy = (W - 1) / 2.0, (L - 1) / 2.0
    zz, yy, xx = np.indices((n, L, W))
    r = np.hypot(xx - cx, yy - cy)
    out = vol.copy()

    # Body shading (z < cap_z0)
    body = op & (zz < cap_z0)
    bz, by, bx = np.where(body)
    for z, y, x in zip(bz, by, bx):
        vx, vy = x - cx, y - cy
        rr = max(1e-6, np.hypot(vx, vy))
        nx = vx / rr
        lit = nx * 0.7
        v = z / max(cap_z0, 1)
        score = lit + (v - 0.4) * 0.3
        if score > 0.25:
            col = CREAM_HI
        elif score > -0.2:
            col = CREAM_MID
        else:
            col = CREAM_SH
        out[z, y, x, :3] = col

    # Cap: 3-tone metal, 5 holes in a plus/quincunx, one stable highlight wedge
    cap = op & (zz >= cap_z0)
    # holes: 5 dark disks on the TOP-most 2 slices only, fixed positions
    holes = [
        (cx, cy),
        (cx - 5, cy),
        (cx + 5, cy),
        (cx, cy - 5),
        (cx, cy + 5),
    ]
    cz, cy_, cx_ = np.where(cap)
    for z, y, x in zip(cz, cy_, cx_):
        vx, vy = x - cx, y - cy
        rr = max(1e-6, np.hypot(vx, vy))
        nx, ny = vx / rr, vy / rr
        lit = nx * 0.6 + ny * (-0.3)
        is_top = z >= n - 2
        # holes only on the top surface
        in_hole = False
        if is_top:
            for hx, hy in holes:
                if (x - hx) ** 2 + (y - hy) ** 2 <= 1.6 ** 2:
                    in_hole = True
                    break
        if in_hole:
            col = GRAPHITE
        elif lit > 0.35 and z >= cap_z0 + (n - cap_z0) * 0.4:
            col = CHROME_HI
        elif lit > -0.15:
            col = CHROME_MID
        else:
            col = CHROME_SH
        out[z, y, x, :3] = col
    return out


# ---------- coin stack ----------
def clean_coins(vol: np.ndarray) -> np.ndarray:
    """Rebuild as a clean stack of 4 disks in the same 16×17×16 box.
    Smooth sides, one stable rim highlight on each coin's top edge."""
    n, L, W = vol.shape[:3]  # 16, 17, 16
    # Keep the original occupancy's bounding cylinder, but paint clean disks
    op = vol[..., 3] > 0
    # Use a slightly smoothed occupancy: union of circles at the original
    # per-slice centroid/radius, then force each slice to a clean ellipse.
    out = np.zeros_like(vol)
    # 4 coins, ~4 slices each
    # Measure original center
    ys, xs = np.where(op.any(axis=0))
    cy, cx = ys.mean(), xs.mean()
    # radius: use 95th percentile of original mid-stack occupancy
    mid = op[n // 2]
    ry, rx = np.where(mid)
    if len(rx):
        rad = float(np.percentile(np.hypot(rx - cx, ry - cy), 95))
    else:
        rad = min(W, L) / 2.0 - 0.5
    rad = max(rad, 6.0)
    print(f"  coins cx={cx:.1f} cy={cy:.1f} rad={rad:.1f}")

    n_coins = 4
    # slice groups, ground at 0
    # 16 slices: 4,4,4,4
    for z in range(n):
        coin_i = min(n_coins - 1, z * n_coins // n)
        # top of this coin?
        z0 = coin_i * n // n_coins
        z1 = (coin_i + 1) * n // n_coins - 1
        is_top = z == z1
        is_bottom = z == z0
        yy, xx = np.indices((L, W))
        r = np.hypot(xx - cx, yy - cy)
        # very slight radius variation so coins read as a stack, not a cylinder
        # (1 px inset on non-top? no — lumpy sides were the bug. Keep radius
        # identical; the top-rim highlight is what reads as stacked coins.)
        mask = r <= rad + 0.05
        out[z][mask, 3] = 255
        # side shade
        nx = np.divide(xx - cx, np.maximum(r, 1e-6))
        ny = np.divide(yy - cy, np.maximum(r, 1e-6))
        lit = nx * 0.65 + ny * (-0.25)
        col = np.zeros((L, W, 3), dtype=np.uint8)
        col[mask] = GOLD_MID
        col[mask & (lit > 0.25)] = GOLD_HI
        col[mask & (lit < -0.35)] = GOLD_SH
        # top face of each coin: slightly lighter disk, plus a 1px rim highlight
        if is_top:
            col[mask] = GOLD_HI
            rim = mask & (r >= rad - 1.2)
            # highlight only on the lit side of the rim, but a WIDE wedge so it
            # doesn't crawl — a 180° lit half, not a 1px sparkle
            col[rim & (lit > -0.05)] = (0xF8, 0xE0, 0x70)
            col[rim & (lit <= -0.05)] = GOLD_MID
        if is_bottom and coin_i > 0:
            # thin shadow under each coin except the ground one
            col[mask] = GOLD_SH
        out[z, ..., :3] = col
        out[z, ..., 3] = np.where(mask, 255, 0)
    return out


# ---------- hero car ----------
def clean_car(vol: np.ndarray) -> np.ndarray:
    """Keep occupancy almost as-is. (1) White stripe only on the top surface,
    so 135/225 don't show a doubled slab. (2) Soften blocky shoulder corners
    by a 1px chamfer on mid-height edge juts. (3) Leave width alone if already
    43; report per-z width so we can nudge the roof if it's pinched."""
    n, L, W = vol.shape[:3]  # 36, 71, 43
    op = vol[..., 3] > 0
    out = vol.copy()
    # widths
    widths = []
    for z in range(n):
        xs = np.where(op[z].any(axis=0))[0]
        widths.append((int(xs[0]), int(xs[-1]), int(xs[-1] - xs[0] + 1)) if len(xs) else (0, 0, 0))
    print("  car width by z (lo,hi,w):", widths)

    # Stripe pixels (cream/white band)
    stripe = op & (np.abs(vol[..., 0].astype(int) - STRIPE[0]) < 30) & (
        np.abs(vol[..., 1].astype(int) - STRIPE[1]) < 30
    ) & (vol[..., 1] > 180) & (vol[..., 2] > 140)

    # For each (y,x) that has any stripe, keep stripe only on the topmost
    # 2 slices (the visible roof/hood surface). Recolor lower stripe voxels
    # to the nearest non-stripe body color (or a mid red).
    # Find a body red to use as fill
    BODY_RED = (0xEF, 0x36, 0x2F)
    yy, xx = np.indices((L, W))
    # process each column
    for y in range(L):
        for x in range(W):
            zs = np.where(stripe[:, y, x])[0]
            if len(zs) == 0:
                continue
            z_top = int(zs.max())
            keep = {z_top}
            if z_top - 1 in zs:
                keep.add(z_top - 1)
            for z in zs:
                if z not in keep:
                    # replace with a nearby non-stripe color, else body red
                    found = False
                    for dy, dx in ((0, 1), (0, -1), (1, 0), (-1, 0), (0, 2), (0, -2)):
                        yy_, xx_ = y + dy, x + dx
                        if 0 <= yy_ < L and 0 <= xx_ < W and op[z, yy_, xx_] and not stripe[z, yy_, xx_]:
                            out[z, y, x, :3] = vol[z, yy_, xx_, :3]
                            found = True
                            break
                    if not found:
                        out[z, y, x, :3] = BODY_RED

    # Shoulder chamfer: at mid-body z, if a 1px jut (a pixel with only one
    # orthogonal neighbor in XY) sits on the left/right silhouette, drop it
    # (make transparent) — only when it doesn't break a 2-wide structure.
    # Conservative: only z in the fender/hood band, only silhouette pixels
    # that are 1px spurs.
    # Identify mid height (not wheels, not roof). Wheels are low z.
    # We'll chamfer z=8..22 left/right edge spurs.
    for z in range(8, min(24, n)):
        sl = out[z, ..., 3] > 0
        # 4-connected neighbor count
        pad = np.pad(sl, 1)
        nbrs = (
            pad[1:-1, :-2].astype(int)
            + pad[1:-1, 2:]
            + pad[:-2, 1:-1]
            + pad[2:, 1:-1]
        )
        ys, xs = np.where(sl)
        if len(xs) == 0:
            continue
        xmin, xmax = int(xs.min()), int(xs.max())
        # 1px spurs on the left or right rim with only 1 neighbor
        spur = sl & (nbrs <= 1) & ((np.arange(W)[None, :] <= xmin + 1) | (np.arange(W)[None, :] >= xmax - 1))
        out[z][spur, 3] = 0
        out[z][spur, :3] = 0
    return out


def ship(name: str, vol: np.ndarray, prefix: str, angles, title: str, n_old: int) -> None:
    att = ATTEMPTS / f"{name}_v2"
    export_prop(vol, name if name != "car" else "hero_car_a", att)
    # rename car slices if needed
    src_slices = att / (f"prop_{name}_slices.png" if name != "car" else "prop_hero_car_a_slices.png")
    # export_prop uses prop_{name}
    # For car, I passed "hero_car_a" when name==car above... let's just handle paths
    if name == "car":
        slices_src = att / "prop_hero_car_a_slices.png"
        gif_src = att / "prop_hero_car_a_turntable.gif"
        dest_slices = HANDOFF / "hero_car_a_slices.png"
        dest_gif = HANDOFF / "hero_car_a_turntable.gif"
        dest_ba = HANDOFF / "hero_car_a_before_after.png"
        old = load_vol(HANDOFF / "hero_car_a_v1_slices.png", n_old)
    else:
        slices_src = att / f"prop_{name}_slices.png"
        gif_src = att / f"prop_{name}_turntable.gif"
        dest_slices = HANDOFF / f"prop_{name}_slices.png"
        dest_gif = HANDOFF / f"prop_{name}_turntable.gif"
        dest_ba = HANDOFF / f"{name}_before_after.png"
        old = load_vol(HANDOFF / f"prop_{name}_v1_slices.png", n_old)
    shutil.copy(slices_src, dest_slices)
    shutil.copy(gif_src, dest_gif)
    SAFE.mkdir(parents=True, exist_ok=True)
    shutil.copy(dest_slices, SAFE / dest_slices.name)
    shutil.copy(dest_gif, SAFE / dest_gif.name)
    before_after(old, vol, dest_ba, angles=angles, title=title)
    shutil.copy(dest_ba, SAFE / dest_ba.name)


def main():
    # mug
    print("=== mug ===")
    mug_old = load_vol(HANDOFF / "prop_mug_v1_slices.png", 60)
    mug = clean_mug(mug_old)
    ship("mug", mug, "prop_mug", (0, 35, 135, 225),
         "Mug  —  v1 (vertical ink bands)  vs  v2 (smooth cream wall)    4x, squash 0.75", 60)

    print("=== butter dish ===")
    b_old = load_vol(HANDOFF / "prop_butter_dish_v1_slices.png", 26)
    butter = clean_butter(b_old)
    ship("butter_dish", butter, "prop_butter_dish", (0, 35, 135, 225),
         "Butter dish  —  v1 (broken gold seam, heavy corners)  vs  v2    4x, squash 0.75", 26)

    print("=== salt shaker ===")
    s_old = load_vol(HANDOFF / "prop_salt_shaker_v1_slices.png", 44)
    salt = clean_salt(s_old)
    ship("salt_shaker", salt, "prop_salt_shaker", (0, 35, 90, 135),
         "Salt shaker  —  v1 (cap shimmer)  vs  v2 (stable cap)    4x, squash 0.75", 44)

    print("=== coin stack ===")
    c_old = load_vol(HANDOFF / "prop_coin_stack_v1_slices.png", 16)
    coins = clean_coins(c_old)
    ship("coin_stack", coins, "prop_coin_stack", (0, 45, 90, 135),
         "Coin stack  —  v1 (lumpy ridges, crawling rims)  vs  v2    4x, squash 0.75", 16)

    print("=== hero car ===")
    car_old = load_vol(HANDOFF / "hero_car_a_v1_slices.png", 36)
    car = clean_car(car_old)
    ship("car", car, "hero_car_a", (0, 35, 135, 225),
         "Hero Car A  —  v1 (doubled stripe, blocky shoulders)  vs  v2    4x, squash 0.75", 36)
    print("done")


if __name__ == "__main__":
    main()
