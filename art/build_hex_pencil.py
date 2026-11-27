#!/usr/bin/env python3
"""Draw a native-resolution hexagonal #2 pencil four-view and pack a 1x4 sheet.

The body is a straight hexagonal prism (flat-top, sitting on a facet) with
3-tone facet bands and 1px dark edge lines. Length 147, bounding width 18,
height 12 — same footprint band as the v1 pencil, about two car lengths.
"""
from __future__ import annotations

from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw

# Locked palette (STYLE.md)
INK = (0x1A, 0x12, 0x10)
WOOD_HI = (0xE8, 0xC4, 0x8A)
WOOD_MID = (0xC9, 0x95, 0x54)
WOOD_SH = (0x8A, 0x5A, 0x2B)
ERASER = (0xE8, 0x90, 0xA0)
CREAM = (0xF4, 0xF0, 0xE6)
CREAM_SH = (0xC9, 0xC2, 0xB4)
CHROME_HI = (0xE8, 0xEC, 0xF0)
CHROME_MID = (0x8A, 0x90, 0x98)
CHROME_SH = (0x4A, 0x50, 0x58)
GRAPHITE = (0x2A, 0x2A, 0x2E)
SOFT_BLACK = (0x1C, 0x1C, 0x20)
WHITE = (255, 255, 255)

# Native hull (matches v1 drop-in: ~18x147x12)
W, L, H = 18, 147, 12

# Length along the pencil, 0 = tip (front), L-1 = eraser (back)
LEN_GRAPHITE = 6
LEN_WOOD = 18
LEN_FERRULE = 10
LEN_ERASER = 10
LEN_BODY = L - LEN_GRAPHITE - LEN_WOOD - LEN_FERRULE - LEN_ERASER  # 103

Y_GRAPHITE = 0
Y_WOOD = LEN_GRAPHITE
Y_BODY = LEN_GRAPHITE + LEN_WOOD
Y_FERRULE = Y_BODY + LEN_BODY
Y_ERASER = Y_FERRULE + LEN_FERRULE


# Discrete flat-top hex, 18 wide x 12 tall, sitting on a facet.
# Mid vertices fill columns 0..17 so the carved/stacked footprint is a true 18.
# z:        0   1   2   3   4   5   6   7   8   9  10  11
HEX_WIDTHS = (10, 12, 14, 16, 16, 18, 18, 16, 16, 14, 12, 10)
# Top-facet edge columns (ends of the z=11 flat, which is cols 4..13)
X_EDGE_L, X_EDGE_R = 4, 13


def hex_x_range(z: int, width: int = W, height: int = H) -> tuple[float, float] | None:
    """Inclusive fractional x-span of the flat-top hex at slice z (0=bottom)."""
    if height == H and width == W and 0 <= z < len(HEX_WIDTHS):
        w = HEX_WIDTHS[z]
        x0 = (width - w) / 2.0
        return x0, x0 + w - 1  # inclusive pixel indices as floats
    # Scaled / generic fallback (used when taper shrinks the profile)
    if z < 0 or z >= height:
        return None
    # Interpolate a similar 10-18-10 diamond in the given height
    cz = (height - 1) / 2.0
    zl = abs((z + 0.5) - 0.5 - cz)  # 0 at mid
    half_h = height / 2.0
    t = min(1.0, zl / half_h)  # 0 mid, 1 flats
    # mid width=width, flat width=width*10/18
    half = (width / 2.0) * (1.0 - t * (1.0 - 10.0 / 18.0))
    cx = (width - 1) / 2.0
    return cx - half + 0.5, cx + half - 0.5


def hex_mask(width: int = W, height: int = H, scale: float = 1.0, cx: float | None = None) -> np.ndarray:
    """Boolean (H, W) mask of the hex, optionally scaled about the center."""
    if cx is None:
        cx = (width - 1) / 2.0
    m = np.zeros((height, width), dtype=bool)
    for z in range(height):
        span = hex_x_range(z, width, height)
        if span is None:
            continue
        x0, x1 = span
        # scale about cx
        mid = (x0 + x1) / 2.0
        # use geometric center
        gc = (width - 1) / 2.0
        x0 = gc + (x0 - gc) * scale
        x1 = gc + (x1 - gc) * scale
        # shift if cx changed? keep centered in the canvas
        ia = max(0, int(np.ceil(x0 - 1e-6)))
        ib = min(width - 1, int(np.floor(x1 + 1e-6)))
        if ib >= ia:
            m[z, ia : ib + 1] = True
    return m


def facet_color_xz(x: int, z: int, material: str) -> tuple[int, int, int]:
    """Pick a 3-tone swatch plus optional edge for a body pixel in the XZ hex."""
    # Bands in z for SIDE-style lighting (top lit, bottom shadowed)
    # and bands in x for TOP-style (center highlight, sides mid).
    # A pixel on the top flat (high z, central x) is highlight.
    # A pixel on a side vertex (mid z, extreme x) is mid/shadow.
    # Dark edge when near a facet boundary.
    span = hex_x_range(z)
    if span is None:
        return WOOD_MID
    x0, x1 = span
    cx = (W - 1) / 2.0
    # Normalized position along width at this z, 0=left, 1=right
    if x1 - x0 < 1e-6:
        u = 0.5
    else:
        u = (x - x0) / (x1 - x0)

    if material == "body":
        hi, mid, sh, edge = WOOD_HI, WOOD_MID, WOOD_SH, GRAPHITE
    elif material == "wood":
        hi, mid, sh, edge = WOOD_HI, WOOD_MID, WOOD_SH, GRAPHITE
    elif material == "ferrule":
        hi, mid, sh, edge = CHROME_HI, CHROME_MID, CHROME_SH, GRAPHITE
    elif material == "eraser":
        hi, mid, sh, edge = CREAM, ERASER, CREAM_SH, GRAPHITE
    elif material == "graphite":
        return GRAPHITE
    else:
        hi, mid, sh, edge = WOOD_HI, WOOD_MID, WOOD_SH, GRAPHITE

    # z bands: 3 facets along height — top, mid, bottom — with a 1px edge between
    # flats occupy the extreme 2 slices; mid the rest, split in half
    if z >= H - 1:
        tone = hi
        on_z_edge = False
    elif z >= H - 2:
        tone = hi
        on_z_edge = False
    elif z == H - 3:
        on_z_edge = True
        tone = mid
    elif z >= 6:
        tone = mid
        on_z_edge = False
    elif z == 5:
        on_z_edge = True
        tone = sh
    else:
        tone = sh
        on_z_edge = False

    # x-edge only on the TOP facet (z 10-11). A full-height dark wall at
    # these columns showed up as a thick black band / stepped side at 90°.
    on_x_edge = (x in (X_EDGE_L, X_EDGE_R)) and (z >= H - 2)

    if material == "body" or material == "wood":
        if on_x_edge or on_z_edge:
            return edge
        # prefer z-based tone for lower slices (side faces), x-based for upper
        if z >= H - 2:
            # top facet (cols 4..13): highlight, edges already handled
            return hi
        return tone

    if material == "ferrule":
        # Chrome tube: highlight on the top slice, mid on the sides, shadow underneath.
        if z >= H - 2:
            return hi
        if z <= 2:
            return sh
        return mid

    if material == "eraser":
        # Mostly pink; a single top-slice cream highlight so TOP stays pink.
        # (TOP samples the highest z; if that z is cream the whole eraser reads white.)
        if z <= 1:
            return sh
        return mid  # ERASER pink

    return tone


def section_at(y: int) -> str:
    if y < Y_WOOD:
        return "graphite"
    if y < Y_BODY:
        return "wood"
    if y < Y_FERRULE:
        return "body"
    if y < Y_ERASER:
        return "ferrule"
    return "eraser"


def taper_scale(y: int) -> float:
    """1 along the body/ferrule; linear cone over the wood+graphite; rounded eraser cap."""
    if y < Y_BODY:
        # cone: 1 at the body join (y=Y_BODY-1? Y_BODY is first body pixel)
        # at y=Y_BODY-1 (last wood? no Y_BODY is first yellow)
        # cone from y=0 (point) to y=Y_BODY-1 (full)
        t = (y + 0.5) / Y_BODY  # 0 at tip, 1 at start of paint
        return max(0.12, t)  # keep a 2-3px graphite point, not a 1px needle
    if y >= Y_ERASER:
        # rounded cap: scale 1 at ferrule join, shrink on the last few pixels
        ey = y - Y_ERASER  # 0..LEN_ERASER-1
        # last 5 px are the rounded end
        cap = LEN_ERASER - 5
        if ey < cap:
            return 1.0
        u = (ey - cap + 0.5) / 5.0  # 0..1 toward the end
        # quarter-circle: scale = sqrt(1-u^2)
        return max(0.35, float(np.sqrt(max(0.0, 1.0 - u * u))))
    return 1.0


def ferrule_crimp(y: int) -> bool:
    # two 1px crimp rings, evenly spaced in the ferrule
    if not (Y_FERRULE <= y < Y_ERASER):
        return False
    # rings at 1/3 and 2/3
    a = Y_FERRULE + LEN_FERRULE // 3
    b = Y_FERRULE + (2 * LEN_FERRULE) // 3
    return y in (a, b)


def volume() -> np.ndarray:
    """RGBA volume (H, L, W) — z, y (tip at 0), x. Ground at z=0."""
    vol = np.zeros((H, L, W, 4), dtype=np.uint8)
    for z in range(H):
        span = hex_x_range(z)
        if span is None:
            continue
        for y in range(L):
            mat = section_at(y)
            scale = taper_scale(y)
            # Same hex profile for body, ferrule, and eraser so the ferrule-to-body
            # join is flush at every z (a rounder/narrower ferrule stepped at 90°).
            # Cone and eraser cap still scale the hex in both x and z.
            cz = (H - 1) / 2.0
            zl = (z + 0.5) - 0.5 - cz
            rz = (H / 2.0) * scale
            if abs(zl) > rz + 1e-6:
                continue
            x0, x1 = span
            cx = (W - 1) / 2.0
            x0 = cx + (x0 - cx) * scale
            x1 = cx + (x1 - cx) * scale
            ia = max(0, int(np.ceil(x0 - 1e-6)))
            ib = min(W - 1, int(np.floor(x1 + 1e-6)))
            for x in range(ia, ib + 1):
                if ferrule_crimp(y):
                    col = GRAPHITE
                else:
                    col = facet_color_xz(x, z, mat)
                vol[z, y, x] = (*col, 255)
    return vol


def to_rgba(rgb, mask) -> np.ndarray:
    """Tight RGBA view, no silhouette outline (for carving / exact 18x147x12)."""
    out = np.zeros((*mask.shape, 4), dtype=np.uint8)
    out[mask] = np.concatenate([rgb[mask], np.full((mask.sum(), 1), 255, np.uint8)], 1)
    return out


def outline_rgba(rgb, mask) -> np.ndarray:
    """Add a 1px INK outline around mask, padded so top/bottom edges are not clipped."""
    h, w = mask.shape
    rgb_p = np.pad(rgb, ((1, 1), (1, 1), (0, 0)))
    mask_p = np.pad(mask, 1)
    pad = np.pad(mask_p, 1)
    ring = ~mask_p & (pad[:-2, 1:-1] | pad[2:, 1:-1] | pad[1:-1, :-2] | pad[1:-1, 2:])
    out = np.zeros((h + 2, w + 2, 4), dtype=np.uint8)
    out[mask_p] = np.concatenate([rgb_p[mask_p], np.full((mask_p.sum(), 1), 255, np.uint8)], 1)
    out[ring] = (*INK, 255)
    return out


def view_top(vol: np.ndarray) -> np.ndarray:
    """TOP: looking down, front (tip) pointing DOWN. Shape (L, W)."""
    # For each (y, x), take the highest opaque z's color
    H_, L_, W_ = vol.shape[:3]
    rgb = np.zeros((L_, W_, 3), dtype=np.uint8)
    mask = np.zeros((L_, W_), dtype=bool)
    for y in range(L_):
        for x in range(W_):
            zs = np.where(vol[:, y, x, 3] > 0)[0]
            if len(zs) == 0:
                continue
            z = zs[-1]
            rgb[y, x] = vol[z, y, x, :3]
            mask[y, x] = True
    # Image y=0 is the top of the picture = BACK (eraser). Front at the bottom.
    # vol y=0 is the tip (front). So flip y.
    rgb = rgb[::-1]
    mask = mask[::-1]
    return rgb, mask


def view_side(vol: np.ndarray) -> np.ndarray:
    """SIDE: front (tip) pointing LEFT. Shape (H, L). Looking from +x (right flank)."""
    H_, L_, W_ = vol.shape[:3]
    rgb = np.zeros((H_, L_, 3), dtype=np.uint8)
    mask = np.zeros((H_, L_), dtype=bool)
    # Looking from the right: the last opaque x (highest x) is the visible surface
    # Image z grows upward? In an image, row 0 is the top. vol z=0 is the ground (bottom).
    for z in range(H_):
        row = H_ - 1 - z  # image row
        for y in range(L_):
            xs = np.where(vol[z, y, :, 3] > 0)[0]
            if len(xs) == 0:
                continue
            x = xs[-1]
            rgb[row, y] = vol[z, y, x, :3]
            mask[row, y] = True
    # Front pointing LEFT: tip (y=0) should be on the left. Already the case.
    return rgb, mask


def view_front(vol: np.ndarray) -> np.ndarray:
    """FRONT: looking toward the tip. Shape (H, W)."""
    H_, L_, W_ = vol.shape[:3]
    rgb = np.zeros((H_, W_, 3), dtype=np.uint8)
    mask = np.zeros((H_, W_), dtype=bool)
    # Visible surface is the smallest y (the tip) that is opaque; but the SILHOUETTE
    # must be the union (body hex), and the color should show the tip (graphite/wood)
    # in the center of that hex. We composite: silhouette = any y opaque;
    # color = first opaque from the tip, which is the cone/graphite.
    for z in range(H_):
        row = H_ - 1 - z
        for x in range(W_):
            ys = np.where(vol[z, :, x, 3] > 0)[0]
            if len(ys) == 0:
                continue
            y = ys[0]  # nearest to the tip
            rgb[row, x] = vol[z, y, x, :3]
            mask[row, x] = True
    return rgb, mask


def view_back(vol: np.ndarray) -> np.ndarray:
    """BACK: looking toward the eraser. Shape (H, W)."""
    H_, L_, W_ = vol.shape[:3]
    rgb = np.zeros((H_, W_, 3), dtype=np.uint8)
    mask = np.zeros((H_, W_), dtype=bool)
    for z in range(H_):
        row = H_ - 1 - z
        for x in range(W_):
            ys = np.where(vol[z, :, x, 3] > 0)[0]
            if len(ys) == 0:
                continue
            y = ys[-1]  # nearest to the eraser
            rgb[row, x] = vol[z, y, x, :3]
            mask[row, x] = True
    return rgb, mask


def pack_sheet(views: list[np.ndarray], gap: int = 24, pad: int = 16) -> Image.Image:
    """1x4 TOP, SIDE, FRONT, BACK on flat white, 1px outlines already in the views."""
    # views are RGBA
    imgs = [Image.fromarray(v) for v in views]
    widths = [im.width for im in imgs]
    heights = [im.height for im in imgs]
    sheet_w = pad * 2 + sum(widths) + gap * (len(imgs) - 1)
    sheet_h = pad * 2 + max(heights)
    sheet = Image.new("RGB", (sheet_w, sheet_h), WHITE)
    x = pad
    for im, h in zip(imgs, heights):
        y = pad + (max(heights) - h) // 2
        # paste with alpha
        sheet.paste(im, (x, y), im)
        x += im.width + gap
    return sheet


def main():
    out_dir = Path("/workspace/tabletop-racer/art/attempts")
    out_dir.mkdir(parents=True, exist_ok=True)
    vol = volume()
    # save raw volume for debug
    np.save(out_dir / "prop_pencil_hex_vol.npy", vol)
    pairs = [view_top(vol), view_side(vol), view_front(vol), view_back(vol)]
    raw_views = [to_rgba(rgb, mask) for rgb, mask in pairs]
    outlined = [outline_rgba(rgb, mask) for rgb, mask in pairs]
    for name, v in zip(("top", "side", "front", "back"), outlined):
        Image.fromarray(v).save(out_dir / f"prop_pencil_hex_view_{name}.png")
        print(f"{name}: {v.shape[1]}x{v.shape[0]} opaque={int((v[..., 3] > 0).sum())}")
    sheet = pack_sheet(outlined)
    sheet_path = out_dir / "prop_pencil_hex_fourview.png"
    sheet.save(sheet_path)
    raw_sheet = pack_sheet(raw_views)
    raw_path = out_dir / "prop_pencil_hex_fourview_raw.png"
    raw_sheet.save(raw_path)
    # 8x preview of the outlined sheet for humans
    sheet.resize((sheet.width * 8, sheet.height * 8), Image.NEAREST).save(
        out_dir / "prop_pencil_hex_fourview_8x.png"
    )
    print("sheet", sheet.size, "->", sheet_path)
    print("raw sheet", raw_sheet.size, "->", raw_path)
    print("sections: graphite", LEN_GRAPHITE, "wood", LEN_WOOD, "body", LEN_BODY,
          "ferrule", LEN_FERRULE, "eraser", LEN_ERASER, "total", L)


if __name__ == "__main__":
    main()
