# Tabletop Racer — HUD style (v1)

Source sheet: `hud_style.png` (1536×1024, generated with Codex `image_gen` on the ChatGPT subscription). Palette and letterforms follow `art/STYLE.md`.

## Look

Chunky SNES-era bitmap UI: hard pixels, square letterforms, 1 px ink outlines, no gradients and no photoreal chrome. Panels sit on the playfield (or a dark letterbox) with a 1-px teal (`#2A8F8A`) frame and a single-pixel cream (`#C9C2B4`) south-east drop, not a soft shadow.

| Role | Hex |
| --- | --- |
| Ink / sheet ground | `#1A1210` |
| Cream fill | `#F4F0E6` |
| Cream shadow | `#C9C2B4` |
| Accent red (1st, GO) | `#E23A2B` |
| Accent teal (frames, LAP) | `#2A8F8A` |
| Gold (BEST, the "2" in the countdown) | `#F0C53A` |

## Elements on the sheet

1. **Lap counter** — a compact teal-framed panel. Label `LAP` over a fraction `1/3`, `2/3`, or `3/3` in cream numerals. Place at the top-left of the game view, scale 3–4× nearest-neighbor.
2. **Position** — matching panels for `1st` (accent red), `2nd` and `3rd` (cream). For a single-player time-trial these can sit under the lap counter or be hidden. Same scale as the lap panel.
3. **Timer** — a wider teal-framed panel: live clock `00:32.17` in cream, and a `BEST 00:28.91` line with `BEST` in gold. Place at the top-right. Use the same digit width for every numeral so the clock does not jitter as seconds roll.
4. **Countdown** — large `3`, `2`, `1`, then a fat `GO!` in accent red with a cream outline. These are the biggest glyphs on the sheet and should be centered on the table for about half a second each (or a short bumper) at 4–6× before the race starts. The "2" may be gold to match the sheet; `3` and `1` stay cream.

The small captions (`LAP COUNTER:`, `POSITION:`, …) on the style sheet are labels for this document, not in-game art. Crop them off when slicing sprites.

## Usage

Cut rectangles from `hud_style.png` (or redraw the glyphs at native art size from this reference). Always blit with nearest-neighbor and `imageSmoothingEnabled = false`. Do not introduce a second typeface. If a digit is missing later (for a 9 or a colon variant), copy the stroke weight and cream/ink pairing from the timer row rather than inventing a new font.
