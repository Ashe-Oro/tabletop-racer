#!/usr/bin/env python3
"""Draw original, native-resolution orthographic pixel art for the placeholder stacks."""
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
    d.rounded_rectangle((18, 0, 25, 29), 3, fill=blue)
    d.rectangle((20, 3, 23, 27), fill=light)
    d.ellipse((0, 25, 43, 68), fill=blue)
    d.ellipse((2, 27, 41, 66), fill=light)
    d.ellipse((5, 30, 38, 63), fill=dark)
    d.ellipse((7, 32, 36, 61), fill="#573335")
    d.arc((9, 34, 34, 59), 30, 160, fill="#a36649", width=2)
    d.arc((11, 36, 29, 54), 205, 290, fill="#865342", width=2)
    side, d = view(69, 36)
    d.rounded_rectangle((37, 3, 68, 32), 6, fill=blue)
    d.rounded_rectangle((42, 7, 64, 27), 4, fill=(0, 0, 0, 0))
    d.rectangle((44, 4, 62, 5), fill=light)
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


def plate():
    top, d = view(120, 120)
    d.ellipse((0, 0, 119, 119), fill="#c8c6b1")
    d.ellipse((2, 2, 117, 117), fill="#fffae4")
    d.ellipse((8, 8, 111, 111), outline="#558d86", width=3)
    d.ellipse((13, 13, 106, 106), outline="#99b2a0", width=1)
    d.ellipse((22, 22, 97, 97), fill="#e1d6bf")
    d.ellipse((24, 25, 95, 96), fill="#f3ead3")
    d.arc((23, 23, 96, 96), 185, 300, fill="#d1c0a8", width=2)
    d.arc((25, 25, 94, 94), 10, 120, fill="#fff8e2", width=3)
    profile, d = view(120, 10)
    d.polygon([(0, 0), (119, 0), (119, 2), (105, 6),
               (91, 9), (28, 9), (14, 6), (0, 2)], fill="#e3dac5")
    d.line((3, 2, 116, 2), fill="#f7ecd5", width=2)
    d.line((26, 7, 93, 7), fill="#bcb49f", width=2)
    return top, profile, profile, profile


def cup():
    top, d = view(48, 48)
    d.ellipse((0, 0, 47, 47), fill="#ffefcf")
    d.ellipse((3, 3, 44, 44), fill="#a13334")
    d.ellipse((6, 6, 41, 41), fill="#742e32")
    d.ellipse((13, 18, 34, 39), fill="#9d373b")
    d.arc((5, 5, 42, 42), 174, 302, fill="#d05a4c", width=3)
    profile, d = view(48, 48)
    d.polygon([(0, 0), (47, 0), (47, 3), (38, 47), (9, 47), (0, 3)],
              fill="#c8433f")
    d.polygon([(35, 4), (45, 4), (37, 46), (29, 46)], fill="#9d3339")
    d.polygon([(4, 5), (11, 5), (16, 45), (12, 45)], fill="#ed6452")
    d.line((3, 11, 44, 11), fill="#ab3b3d", width=2)
    d.line((7, 4, 14, 44), fill="#fa7c60", width=2)
    d.rectangle((1, 1, 46, 4), fill="#ffefcf")
    return top, profile, profile, profile


def basket():
    straw, pale, brown, edge = "#bd8247", "#dfab65", "#805332", "#a06a3d"

    def weave(width, height):
        image, d = view(width, height)
        d.rounded_rectangle((0, 0, width - 1, height - 1), 12, fill=brown)
        d.rounded_rectangle((3, 3, width - 4, height - 4), 10, fill=straw)
        for row, y in enumerate(range(9, height - 8, 7)):
            d.line((7, y, width - 8, y), fill=edge, width=2)
            for x in range(8 + row % 2 * 7, width - 14, 14):
                d.line((x, y + 2, x + 9, y + 2), fill=pale, width=2)
                d.line((x + 10, y + 3, x + 10, y + 5), fill=brown, width=2)
        return image, d

    top, d = weave(192, 136)
    d.rounded_rectangle((5, 5, 186, 130), 10, outline=pale, width=4)
    d.rounded_rectangle((13, 13, 178, 122), 9, outline=edge, width=3)
    d.line((0, 67, 191, 67), fill=brown, width=3)
    for x in (39, 145):
        d.rounded_rectangle((x, 2, x + 8, 133), 4, fill="#97623d")
        d.line((x + 2, 6, x + 2, 129), fill=pale, width=2)
    d.rounded_rectangle((41, 63, 150, 72), 4, fill="#865535")
    d.line((44, 65, 147, 65), fill=pale, width=2)
    side, d = view(136, 56)
    body, _ = weave(136, 42)
    side.paste(body, (0, 14))
    d.rounded_rectangle((63, 0, 72, 22), 3, fill="#97623d")
    d.line((65, 2, 65, 18), fill=pale, width=2)
    d.rounded_rectangle((0, 15, 135, 23), 3, fill=brown)
    d.line((5, 17, 130, 17), fill=pale, width=2)
    d.rectangle((5, 51, 130, 55), fill=edge)
    end, d = view(192, 56)
    body, _ = weave(192, 42)
    end.paste(body, (0, 14))
    d.rounded_rectangle((41, 0, 150, 28), 12, fill="#97623d")
    d.rounded_rectangle((50, 7, 141, 25), 6, fill=(0, 0, 0, 0))
    d.line((59, 2, 132, 2), fill=pale, width=2)
    d.rounded_rectangle((0, 15, 191, 23), 3, fill=brown)
    d.line((5, 17, 186, 17), fill=pale, width=2)
    d.rectangle((6, 51, 185, 55), fill=edge)
    for x in (39, 145):
        d.rounded_rectangle((x, 15, x + 8, 54), 3, fill="#97623d")
        d.line((x + 2, 18, x + 2, 50), fill=pale, width=2)
    return top, side, end, end


def watermelon():
    top, d = view(84, 68)
    d.polygon([(0, 7), (16, 3), (31, 1), (42, 0), (57, 2), (76, 5),
               (83, 7), (78, 29), (66, 48), (54, 61), (42, 67), (29, 62),
               (17, 51), (7, 34)], fill="#42764c")
    d.polygon([(4, 9), (20, 6), (39, 4), (49, 5), (70, 7), (79, 10),
               (73, 29), (63, 46), (50, 58), (42, 63), (31, 58), (19, 47),
               (10, 31)], fill="#d5df9c")
    d.polygon([(8, 11), (22, 9), (42, 7), (62, 9), (75, 12), (69, 30),
               (58, 47), (42, 58), (29, 51), (17, 37)], fill="#ef725e")
    d.polygon([(9, 13), (35, 9), (58, 11), (73, 14), (64, 21), (33, 21)],
              fill="#ff9477")
    for x, y in ((18, 16), (29, 27), (35, 15), (44, 23), (53, 34),
                 (64, 16), (43, 45), (47, 12), (35, 38), (23, 33), (62, 25)):
        d.polygon([(x, y), (x + 1, y - 1), (x + 3, y + 2), (x + 1, y + 4)],
                  fill="#73383c")
    side, d = view(68, 16)
    d.polygon([(0, 0), (59, 0), (67, 7), (64, 15), (0, 15)], fill="#e75b53")
    d.line((1, 11, 65, 11), fill="#cdd388", width=3)
    d.line((1, 14, 64, 14), fill="#4f8551", width=2)
    end, d = view(84, 16)
    d.polygon([(0, 0), (83, 0), (78, 15), (5, 15)], fill="#ea655a")
    d.line((4, 11, 79, 11), fill="#cdd388", width=3)
    d.line((5, 14, 78, 14), fill="#4f8551", width=2)
    return top, side, end, end


def ketchup():
    red, light, shade, cap = "#bd4138", "#df6350", "#913737", "#f3ddba"
    top, d = view(38, 84)
    d.polygon([(5, 0), (31, 0), (37, 8), (37, 65), (30, 72),
               (25, 75), (23, 83), (14, 83), (12, 75), (7, 72), (0, 65),
               (0, 8)], fill=red)
    d.rounded_rectangle((4, 11, 10, 61), 2, fill=light)
    d.polygon([(32, 8), (36, 11), (36, 64), (29, 70), (30, 15)], fill=shade)
    d.rounded_rectangle((6, 22, 31, 58), 4, fill=cap)
    d.ellipse((11, 30, 26, 47), fill="#de6049")
    d.line((17, 31, 21, 28), fill="#638657", width=3)
    d.line((13, 51, 24, 51), fill="#ae6e52", width=2)
    d.rectangle((15, 75, 22, 82), fill=cap)
    side, d = view(84, 28)
    d.rounded_rectangle((10, 0, 83, 27), 7, fill=red)
    d.rectangle((6, 7, 12, 20), fill=shade)
    d.rounded_rectangle((0, 9, 8, 18), 2, fill=cap)
    d.line((15, 5, 76, 5), fill=light, width=2)
    d.rectangle((24, 7, 61, 17), fill=cap)
    d.line((14, 23, 77, 23), fill=shade, width=3)
    end, d = view(38, 28)
    d.rounded_rectangle((0, 0, 37, 27), 7, fill=red)
    d.rounded_rectangle((13, 9, 24, 18), 3, fill=cap)
    back, d = view(38, 28)
    d.rounded_rectangle((0, 0, 37, 27), 7, fill=red)
    d.line((5, 6, 32, 6), fill=light, width=2)
    return top, side, end, back


def napkin():
    top, d = view(96, 96)
    d.polygon([(6, 0), (90, 0), (95, 86), (90, 95), (0, 92), (0, 6)],
              fill="#efe1bf")
    for y in range(7, 86, 11):
        for x in range(7, 86, 11):
            if (x // 11 + y // 11) % 2 == 0:
                d.rectangle((x, y, x + 10, y + 10), fill="#ce766a")
    d.polygon([(0, 52), (45, 94), (0, 92)], fill="#e3cda6")
    d.line((4, 60, 35, 89), fill="#faf0d5", width=3)
    d.line((5, 6, 90, 6), fill="#ffefcf", width=2)
    d.line((91, 11, 94, 80), fill="#dac09c", width=2)
    edge, d = view(96, 6)
    d.polygon([(0, 1), (88, 0), (95, 2), (95, 5), (0, 5)], fill="#e3cda6")
    d.line((4, 2, 91, 2), fill="#f9e8c4")
    d.line((2, 4, 94, 4), fill="#bc826e")
    return top, edge, edge, edge


def fork():
    silver, light, dark = "#9dabb0", "#e5e8df", "#687a86"
    top, d = view(22, 156)
    d.polygon([(7, 0), (14, 0), (16, 3), (14, 102), (21, 120), (21, 142),
               (0, 142), (0, 120), (7, 102), (5, 3)], fill=silver)
    for x in (0, 6, 12, 18):
        d.rounded_rectangle((x, 135, x + 3, 155), 1, fill=silver)
        d.line((x + 1, 140, x + 1, 153), fill=light)
    d.line((9, 5, 9, 101), fill=light, width=2)
    d.line((13, 7, 12, 100), fill=dark)
    d.line((8, 107, 4, 120, 4, 132), fill=light, width=2)
    profile, d = view(156, 8)
    d.polygon([(0, 4), (23, 1), (59, 2), (86, 4), (155, 0), (155, 4),
               (82, 7), (54, 4), (22, 4), (0, 7)], fill=silver)
    d.line((25, 2, 53, 3), fill=light)
    end, d = view(22, 8)
    d.polygon([(3, 0), (18, 0), (21, 3), (21, 7),
               (0, 7), (0, 3)], fill=silver)
    d.line((3, 2, 18, 2), fill=light)
    return top, profile, end, end


def ant():
    shell, bright = "#473437", "#855248"
    top, d = view(8, 10)
    d.line((0, 7, 3, 5, 5, 5, 7, 7), fill=shell, width=2)
    d.line((0, 3, 3, 5, 5, 5, 7, 3), fill=shell, width=2)
    d.ellipse((2, 0, 5, 4), fill=shell)
    d.ellipse((2, 4, 5, 7), fill=bright)
    d.ellipse((2, 7, 5, 9), fill=shell)
    side, d = view(10, 4)
    d.ellipse((5, 0, 9, 3), fill=bright)
    d.ellipse((0, 1, 5, 3), fill=shell)
    end, d = view(8, 4)
    d.ellipse((1, 0, 6, 3), fill=bright)
    d.line((0, 3, 7, 3), fill=shell)
    return top, side, end, end


PICNIC = (plate, cup, basket, watermelon, ketchup, napkin, fork, ant)
ORIGINALS = (car, pencil, coin, ruler, mug, cereal_box)


def generate(drawings=ORIGINALS + PICNIC):
    OUTPUT.mkdir(parents=True, exist_ok=True)
    for draw in drawings:
        factor = 8 if draw in ORIGINALS or draw is ant else 2
        views = [outlined(image).resize((image.width * factor, image.height * factor),
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
