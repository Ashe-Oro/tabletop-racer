#!/usr/bin/env python3
"""Draw original, native-resolution orthographic pixel art for the six stacks."""
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw

BG = (250, 250, 250)
INK = (39, 26, 38, 255)
OUTPUT = Path(__file__).resolve().parents[1] / "art" / "placeholders"


def view(width, height):
    image = Image.new("RGBA", (width, height))
    return image, ImageDraw.Draw(image)


def outlined(image):
    pixels = np.array(image)
    solid = pixels[:, :, 3] > 0
    h, w = solid.shape
    padded = np.pad(solid, 1)
    interior = np.logical_and.reduce([
        padded[y:y + h, x:x + w] for y in range(3) for x in range(3)
    ])
    pixels[solid & ~interior] = INK
    return Image.fromarray(pixels)


def car():
    red, light, dark = "#c32c37", "#f05a48", "#8a253a"
    tire, hub, glass, reflection = "#413743", "#8b7276", "#344255", "#7796a0"
    stripe, lamp, tail = "#eddabb", "#ffd263", "#fa594e"
    top, d = view(20, 36)
    for x in (0, 15):
        for y in (4, 24):
            d.rounded_rectangle((x, y, x + 4, y + 8), 2, fill=tire)
    d.polygon([(1, 1), (18, 1), (18, 9), (17, 14), (17, 24),
               (18, 29), (17, 33), (14, 35), (5, 35), (2, 33),
               (1, 29), (2, 24), (2, 14), (1, 9)], fill=red)
    d.rectangle((2, 0, 17, 4), fill=dark)
    d.rectangle((3, 2, 16, 3), fill=light)
    d.polygon([(5, 10), (14, 10), (15, 15), (15, 21),
               (13, 25), (6, 25), (4, 21), (4, 15)], fill=glass)
    d.rectangle((6, 19, 13, 22), fill=reflection)
    d.rectangle((7, 12, 12, 16), fill=light)
    for a, b in ((1, 8), (12, 17), (25, 35)):
        d.rectangle((8, a, 11, b), fill=stripe)
    for x in (3, 13):
        d.rectangle((x, 29, x + 3, 32), fill=lamp)
        d.rectangle((x, 5, x + 3, 6), fill=tail)
    side, d = view(36, 16)
    for x in (4, 23):
        d.rounded_rectangle((x, 7, x + 8, 15), 3, fill=tire)
    d.polygon([(0, 9), (3, 7), (10, 6), (14, 4), (17, 0),
               (22, 0), (25, 3), (28, 7), (31, 7), (31, 3), (34, 3),
               (35, 8), (35, 12), (1, 12), (0, 11)], fill=red)
    d.polygon([(13, 7), (18, 2), (22, 2), (26, 7)], fill=glass)
    d.line((17, 4, 22, 4), fill=reflection, width=2)
    d.rectangle((3, 9, 32, 10), fill=light)
    for x in (5, 24):
        d.ellipse((x, 9, x + 6, 15), fill=tire)
        d.rectangle((x + 2, 11, x + 4, 13), fill=hub)
    d.rectangle((1, 9, 3, 11), fill=lamp)
    d.rectangle((32, 9, 34, 11), fill=tail)

    def end(front):
        image, d = view(20, 16)
        for x in (0, 15):
            d.rounded_rectangle((x, 8, x + 4, 15), 2, fill=tire)
        d.polygon([(1, 8), (3, 6), (5, 3), (7, 0), (12, 0), (14, 3),
                   (16, 6), (18, 8), (18, 12), (1, 12)], fill=red)
        d.rectangle((6, 3, 13, 7), fill=glass)
        d.rectangle((7, 4, 12, 5), fill=reflection)
        if not front:
            d.rectangle((2, 3, 17, 5), fill=dark)
        d.rectangle((8, 8, 11, 11), fill=stripe)
        for x in (3, 13):
            d.rectangle((x, 9, x + 3, 10), fill=lamp if front else tail)
        return image

    return top, side, end(True), end(False)


def pencil():
    gold, light, dark = "#e4a436", "#ffd572", "#a96929"
    pink, wood, graphite, metal = "#e77e83", "#e9b47b", "#4b4051", "#a6a8a0"
    top, d = view(12, 83)
    d.polygon([(1, 0), (10, 0), (11, 2), (11, 68), (7, 81),
               (6, 82), (5, 82), (4, 81), (0, 68), (0, 2)], fill=gold)
    d.rectangle((2, 2, 9, 9), fill=pink)
    d.rectangle((1, 10, 10, 16), fill=metal)
    d.rectangle((2, 17, 4, 67), fill=light)
    d.rectangle((8, 17, 10, 67), fill=dark)
    d.polygon([(1, 68), (10, 68), (6, 82), (5, 82)], fill=wood)
    d.polygon([(4, 77), (7, 77), (6, 82), (5, 82)], fill=graphite)
    side, d = view(83, 12)
    d.polygon([(0, 5), (13, 0), (81, 0), (82, 2), (82, 9),
               (80, 11), (13, 11), (0, 6)], fill=gold)
    d.rectangle((66, 1, 72, 10), fill=metal)
    d.rectangle((73, 1, 81, 10), fill=pink)
    d.rectangle((14, 8, 65, 11), fill=dark)
    d.rectangle((14, 1, 65, 3), fill=light)
    d.polygon([(0, 5), (13, 1), (13, 10), (0, 6)], fill=wood)
    d.polygon([(0, 5), (5, 4), (5, 7), (0, 6)], fill=graphite)
    front, d = view(12, 12)
    d.polygon([(3, 0), (8, 0), (11, 3), (11, 8), (8, 11), (3, 11),
               (0, 8), (0, 3)], fill=wood)
    d.rectangle((4, 4, 7, 7), fill=graphite)
    back, d = view(12, 12)
    d.rounded_rectangle((0, 0, 11, 11), 3, fill=pink)
    d.rectangle((3, 2, 8, 3), fill="#f4a29a")
    return top, side, front, back


def coin():
    top, d = view(22, 22)
    d.ellipse((0, 0, 21, 21), fill="#af682e")
    d.ellipse((2, 2, 19, 19), fill="#f1bd55")
    d.ellipse((4, 4, 17, 17), fill="#c18436")
    d.ellipse((5, 5, 16, 16), fill="#daa044")
    d.polygon([(10, 6), (15, 11), (11, 15), (7, 11)], fill="#a86b35")
    d.polygon([(10, 6), (13, 10), (10, 13), (7, 10)], fill="#f5c65d")
    edge, d = view(22, 6)
    d.rounded_rectangle((0, 0, 21, 5), 2, fill="#bd8035")
    d.rectangle((2, 1, 19, 1), fill="#edb052")
    for x in range(3, 19, 3):
        d.rectangle((x, 2, x, 4), fill="#a46230")
    return top, edge, edge, edge


def ruler():
    wood, light, mark = "#d69b5b", "#f0be7e", "#794b3f"
    top, d = view(20, 100)
    d.rectangle((0, 0, 19, 99), fill=wood)
    d.rectangle((2, 2, 8, 97), fill=light)
    d.rectangle((16, 2, 17, 97), fill="#b57549")
    for y in range(4, 97, 4):
        length = 9 if y % 20 == 4 else 6 if y % 8 == 4 else 4
        d.rectangle((1, y, length, y + 1), fill=mark)
    side, d = view(100, 7)
    d.rectangle((0, 0, 99, 6), fill="#b67950")
    d.rectangle((1, 1, 98, 2), fill=light)
    end, d = view(20, 7)
    d.rectangle((0, 0, 19, 6), fill=wood)
    d.rectangle((1, 3, 18, 4), fill="#b67950")
    return top, side, end, end


def mug():
    blue, light, dark = "#488f96", "#89c5ba", "#326675"
    top, d = view(44, 69)
    d.rounded_rectangle((14, 0, 29, 29), 6, fill=blue)
    d.rectangle((17, 3, 26, 27), fill=light)
    d.ellipse((0, 25, 43, 68), fill=blue)
    d.ellipse((2, 27, 41, 66), fill=light)
    d.ellipse((5, 30, 38, 63), fill=dark)
    d.ellipse((7, 32, 36, 61), fill="#573335")
    d.arc((9, 34, 34, 59), 30, 160, fill="#a36649", width=2)
    d.arc((11, 36, 29, 54), 205, 290, fill="#865342", width=2)
    side, d = view(69, 36)
    d.rounded_rectangle((38, 5, 68, 28), 6, fill=blue)
    d.rounded_rectangle((42, 10, 63, 23), 3, fill=(0, 0, 0, 0))
    d.rectangle((44, 7, 62, 8), fill=light)
    d.rounded_rectangle((0, 0, 43, 35), 4, fill=blue)
    d.rectangle((2, 2, 41, 4), fill=light)
    d.rectangle((2, 27, 41, 31), fill=dark)
    d.rectangle((5, 8, 9, 24), fill="#66a8a6")
    front, d = view(44, 36)
    d.rounded_rectangle((0, 0, 43, 35), 4, fill=blue)
    d.rectangle((2, 2, 41, 4), fill=light)
    d.rectangle((4, 8, 8, 25), fill="#66a8a6")
    d.rectangle((2, 27, 41, 31), fill=dark)
    back = front.copy()
    d = ImageDraw.Draw(back)
    d.rectangle((14, 6, 29, 9), fill=light)
    d.rectangle((14, 24, 29, 27), fill=dark)
    return top, side, front, back


def cereal_box():
    aqua, paper, orange = "#387d81", "#f3c882", "#d86739"
    top, d = view(31, 48)
    d.rectangle((0, 0, 30, 47), fill="#dc8149")
    d.rectangle((2, 2, 28, 44), fill=paper)
    d.rectangle((2, 16, 28, 19), fill="#bf5e3c")
    d.rectangle((5, 33, 25, 42), fill=aqua)
    side, d = view(48, 60)
    d.rectangle((0, 0, 47, 59), fill="#bc553b")
    d.rectangle((2, 3, 45, 56), fill=orange)
    d.rectangle((8, 10, 37, 49), fill=paper)
    d.rectangle((10, 12, 35, 18), fill=aqua)
    for y in (23, 28, 33, 38, 43):
        d.rectangle((12, y, 32 if y < 42 else 23, y + 1), fill="#966848")
    front, d = view(31, 60)
    d.rectangle((0, 0, 30, 59), fill=orange)
    d.rectangle((2, 3, 28, 20), fill=aqua)
    d.rectangle((5, 7, 25, 10), fill=paper)
    d.rectangle((7, 13, 23, 16), fill="#ebaf5c")
    d.ellipse((4, 24, 26, 49), fill=paper)
    d.ellipse((7, 30, 23, 43), fill="#a75e43")
    for x, y in ((10, 34), (15, 32), (19, 34), (13, 38), (18, 39)):
        d.rectangle((x, y, x + 2, y + 1), fill="#f5bd64")
    d.polygon([(6, 37), (24, 37), (21, 45), (10, 45)], fill=aqua)
    d.rectangle((3, 53, 27, 56), fill="#a7483d")
    back, d = view(31, 60)
    d.rectangle((0, 0, 30, 59), fill=orange)
    d.rectangle((4, 7, 26, 49), fill=paper)
    d.rectangle((6, 10, 24, 15), fill=aqua)
    for y in range(20, 43, 5):
        d.rectangle((7, y, 23, y + 1), fill="#966848")
    return top, side, front, back


def generate():
    OUTPUT.mkdir(parents=True, exist_ok=True)
    for draw in (car, pencil, coin, ruler, mug, cereal_box):
        views = [outlined(image).resize((image.width * 8, image.height * 8),
                                         Image.Resampling.NEAREST) for image in draw()]
        gap = 48
        width = sum(image.width for image in views) + 5 * gap
        height = max(image.height for image in views) + 2 * gap
        sheet = Image.new("RGB", (width, height), BG)
        x = gap
        for image in views:
            sheet.paste(image, (x, (height - image.height) // 2), image)
            x += image.width + gap
        sheet.save(OUTPUT / f"{draw.__name__}.png")


if __name__ == "__main__":
    generate()
