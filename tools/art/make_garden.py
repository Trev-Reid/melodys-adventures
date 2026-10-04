"""
Draws the Home & Garden art: backgrounds, ground tiles, props, bones and HUD
icons, in the same chunky pixel style as Melody (art pixels are 2x2 on screen).

Outputs
  public/assets/garden/*.png        everything the game loads (see GARDEN_ASSETS in src/assets/keys.ts)
  tools/art/garden_preview.png      contact sheet for reviewing the art

Run:  python tools/art/make_garden.py        (needs: pip install pillow numpy)

Every piece is drawn by a function below, so to change one (say, the colour
of the trampoline) find its function, change it and run the script again.
"""
from __future__ import annotations

import math
import os
import random
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from pixel import (  # noqa: E402
    contact_sheet, disc, draw, haze, leaf_mass, line, mix, new, outline, outline_wrap_x, paste, poly, px, ramp,
    rect, rgb, save, shade_by_light, speckle, vgradient,
)

ROOT = os.path.dirname(os.path.abspath(__file__))
PROJECT = os.path.normpath(os.path.join(ROOT, '..', '..'))
OUT = os.path.join(PROJECT, 'public', 'assets', 'garden')
UI_OUT = os.path.join(PROJECT, 'public', 'assets', 'ui')

# ---- Palette -------------------------------------------------------------------
OUTLINE = rgb('2b1d14')
LEAF_OUTLINE = rgb('1f3a14')
GRASS = ramp('2c5a19', '3f7d22', '58a02c', '79c13a', 'a3dc4e', 'c9ee6e')
FOLIAGE = ramp('1f4417', '2f6522', '427f2c', '5b9c37', '7cb946', 'a3d35c')
FOLIAGE_FAR = ramp('3d6b3a', '4f8248', '659a57', '7fb26a', '9ac77f')
DIRT = ramp('4a2a16', '64391e', '7e4c29', '9a6236', 'b57a46')
STONE = ramp('5c5448', '7a7262', '988f7c', 'b5ab95', 'd1c8b0', 'e6dfc9')
GRAVEL = ramp('8a7658', 'a6906c', 'c0aa84', 'd8c5a0', 'ece0c0')
WOOD = ramp('4a2c16', '6b4222', '8c5a30', 'ab7442', 'c99559')
BARK = ramp('3a2414', '553520', '6e4a2e', '8a6240', 'a67c55')
SKY_TOP = rgb('3f9be6')
SKY_BOTTOM = rgb('c3e8f6')
WALL = ramp('b9b3a6', 'd3cec2', 'e8e4da', 'f6f3ec')
ROOF = ramp('1f232c', '2c323d', '3b4250', '4d5566')
DOOR = ramp('4b5f70', '62798c', '7f95a7', '9db0bf')
FLOWER_W = ramp('d9d2c2', 'f4f0e6', 'ffffff')
TERRACOTTA = ramp('7a3a1e', '9e4f2a', 'bf6a3a', 'd98a54')
BLUE = ramp('1a3f8a', '2456b8', '3a74d8', '62a0f0')
RED = ramp('7a1414', 'a82020', 'd23434', 'f05a5a')

rng = random.Random(7)
ASSETS: list[tuple[str, 'Image.Image']] = []  # noqa: F821
UI: list[tuple[str, 'Image.Image']] = []  # noqa: F821


def keep(name: str, img, ui: bool = False):
    (UI if ui else ASSETS).append((name, img))
    return img


# =================================================================================
# Backgrounds (tile horizontally; the game scrolls them at different speeds)
# =================================================================================

def bg_sky():
    return keep('bg-sky', vgradient(4, 270, SKY_TOP, SKY_BOTTOM, steps=14))


def cloud(seed: int, w: int, h: int):
    r = random.Random(seed)
    img = new(w, h)
    d = draw(img)
    for _ in range(14):
        cx = r.uniform(w * 0.15, w * 0.85)
        cy = r.uniform(h * 0.45, h * 0.75)
        rr = r.uniform(h * 0.22, h * 0.42)
        disc(d, cx, cy, rr, (255, 255, 255))
    rect(d, w * 0.12, h * 0.62, w * 0.76, h * 0.3, (255, 255, 255))
    a = img.copy()
    img = shade_by_light(img, ramp('c9dcea', 'e3eef6', 'ffffff', 'ffffff'), light=(-0.3, -1), rng=r, noise=0.05)
    # flat bottom
    d = draw(img)
    rect(d, 0, h * 0.9, w, h, (0, 0, 0))
    a2 = img.load()
    for y in range(int(h * 0.9), h):
        for x in range(w):
            a2[x, y] = (0, 0, 0, 0)
    return img


def bg_clouds():
    keep('cloud-1', cloud(3, 80, 34))
    keep('cloud-2', cloud(11, 56, 26))


def bg_far():
    """Hazy hills, hedgerows and a few conifers far away."""
    W, H = 480, 150
    img = new(W, H)
    d = draw(img)
    r = random.Random(21)
    # rolling hill line
    pts = []
    for x in range(0, W + 1, 4):
        y = 70 + 14 * math.sin(x / W * math.tau * 2 + 0.6) + 8 * math.sin(x / W * math.tau * 5)
        pts.append((x, y))
    poly(d, [(0, H)] + pts + [(W, H)], rgb('8fbf7c'))
    # fields stripes
    for k in range(3):
        y0 = 95 + k * 16
        line(d, [(0, y0 + 6 * math.sin(k)), (W, y0 - 4)], rgb('9fcb86'), 2)
    # hedgerows / tree lines
    for x in range(0, W, 6):
        y = 70 + 14 * math.sin(x / W * math.tau * 2 + 0.6) + 8 * math.sin(x / W * math.tau * 5)
        for k in range(2):
            disc(d, x + r.uniform(-2, 2), y + r.uniform(-1, 3), r.uniform(3, 6), rgb('6f9f63') if k else rgb('7aa86b'))
    # conifers
    for cx in (60, 82, 300, 318, 410):
        base = 78 + r.uniform(-6, 6)
        hgt = r.uniform(40, 62)
        poly(d, [(cx, base - hgt), (cx - 9, base), (cx + 9, base)], rgb('5f8e72'))
        poly(d, [(cx, base - hgt), (cx + 9, base), (cx + 2, base)], rgb('527f66'))
    img = haze(img, SKY_BOTTOM, 0.25)
    return keep('bg-far', img)


def bg_trees():
    """Big leafy trees behind the garden (mid distance)."""
    W, H = 480, 260
    img = new(W, H)
    d = draw(img)
    r = random.Random(5)
    trees = [(30, 110, 70, 62), (140, 92, 84, 76), (262, 120, 66, 56), (372, 96, 88, 78), (470, 125, 58, 50)]
    for cx, cy, rx, ry in trees:
        # trunk
        tx = cx + r.uniform(-6, 6)
        poly(d, [(tx - 10, H), (tx - 6, cy + ry * 0.4), (tx + 6, cy + ry * 0.4), (tx + 11, H)], rgb('4d3a2a'))
        line(d, [(tx + 3, H), (tx + 2, cy + ry * 0.5)], rgb('5e4836'), 2)
        line(d, [(tx, cy + ry * 0.5), (tx - 20, cy + 10)], rgb('4d3a2a'), 3)
        line(d, [(tx, cy + ry * 0.6), (tx + 24, cy + 18)], rgb('4d3a2a'), 3)
    for cx, cy, rx, ry in trees:
        for k in range(4):
            leaf_mass(img, cx + r.uniform(-rx * 0.45, rx * 0.45), cy + r.uniform(-ry * 0.35, ry * 0.35),
                      rx * r.uniform(0.55, 0.75), ry * r.uniform(0.55, 0.75), FOLIAGE_FAR, r, blob=(4, 8), wrap_w=W)
        leaf_mass(img, cx, cy + ry * 0.5, rx * 0.9, ry * 0.4, FOLIAGE_FAR[:3], r, blob=(4, 7), wrap_w=W)
    # hedge band along the bottom
    for x in range(-10, W + 10, 7):
        leaf_mass(img, x, H - 26 + r.uniform(-4, 4), 10, 12, FOLIAGE_FAR, r, blob=(3, 5), wrap_w=W, count=8)
    rect(draw(img), 0, H - 16, W, 16, FOLIAGE_FAR[1])
    img = haze(img, SKY_BOTTOM, 0.18)
    return keep('bg-trees', img)


def bg_fence():
    """Wooden garden fence with hedge bits, just behind the play area."""
    W, H = 128, 70
    img = new(W, H)
    d = draw(img)
    r = random.Random(9)
    top = 20
    for x in range(0, W, 8):
        c = WOOD[1] if (x // 8) % 2 else WOOD[2]
        rect(d, x, top + (x // 8 % 3), 7, H - top, c)
        rect(d, x + 7, top, 1, H - top, WOOD[0])
    rect(d, 0, top + 10, W, 3, WOOD[0])
    rect(d, 0, top + 34, W, 3, WOOD[0])
    for x in (0, 64):
        rect(d, x, top - 6, 5, H - top + 6, WOOD[1])
    # ivy / hedge creeping over it
    for x in (12, 40, 90, 118):
        leaf_mass(img, x, top + r.uniform(-2, 8), r.uniform(10, 16), r.uniform(7, 11), FOLIAGE, r, blob=(2, 4), wrap_w=W)
    img = haze(img, SKY_BOTTOM, 0.12)
    return keep('bg-fence', img)


# =================================================================================
# Ground & platform tiles (tile in both directions)
# =================================================================================

def tile_dirt():
    W = H = 32
    img = new(W, H)
    d = draw(img)
    rect(d, 0, 0, W, H, DIRT[2])
    r = random.Random(2)
    for _ in range(26):
        x, y = r.randrange(W), r.randrange(H)
        rect(d, x, y, r.choice((1, 2, 3)), 1, r.choice((DIRT[1], DIRT[3], DIRT[1])))
    for _ in range(5):  # pebbles
        x, y = r.randrange(1, W - 3), r.randrange(1, H - 3)
        rect(d, x, y, 3, 2, STONE[2])
        rect(d, x, y, 3, 1, STONE[3])
        rect(d, x, y + 2, 3, 1, DIRT[0])
    return keep('tile-dirt', img)


def tile_stone():
    """Dry stone retaining wall."""
    W, H = 32, 32
    img = new(W, H)
    d = draw(img)
    rect(d, 0, 0, W, H, STONE[0])
    r = random.Random(4)
    rows = [(0, 8), (8, 7), (15, 9), (24, 8)]
    for ri, (y, h) in enumerate(rows):
        x = -((ri * 7) % 12)
        while x < W:
            w = r.choice((9, 11, 13))
            for xx in (x, x - W, x + W):
                rect(d, xx + 1, y + 1, w - 1, h - 1, STONE[2])
                rect(d, xx + 1, y + 1, w - 1, 1, STONE[4])
                rect(d, xx + 1, y + 1, 1, h - 1, STONE[3])
                rect(d, xx + 1, y + h - 1, w - 1, 1, STONE[1])
                rect(d, xx + w - 1, y + 1, 1, h - 1, STONE[1])
            x += w
    speckle(img, [STONE[1], STONE[3]], 0.06, r)
    # moss
    for _ in range(4):
        x, y = r.randrange(W), r.randrange(H)
        rect(d, x, y, 2, 1, GRASS[2])
    return keep('tile-stone', img)


def tile_grass_top():
    """Grass edge laid over the top of ground: blades above, tufts hanging over the soil below."""
    W, H = 32, 16
    img = new(W, H)
    d = draw(img)
    r = random.Random(3)
    base = 4  # grass surface row (the platform's top edge is drawn at this row)
    rect(d, 0, base, W, 6, GRASS[3])
    rect(d, 0, base, W, 1, GRASS[4])
    rect(d, 0, base + 5, W, 1, GRASS[2])
    # hanging tufts (wrap)
    x = 0
    while x < W:
        w = r.choice((3, 4, 5))
        h = r.choice((1, 2, 3, 4))
        for xx in (x, x - W):
            rect(d, xx, base + 6, w, h, GRASS[2])
            rect(d, xx + 1, base + 6 + h, max(1, w - 2), 1, GRASS[1])
        x += w + r.choice((0, 1, 2))
    # blades sticking up
    for x in range(0, W, 2):
        h = r.choice((0, 1, 1, 2, 3))
        if h:
            rect(d, x, base - h, 1, h, GRASS[4] if r.random() < 0.6 else GRASS[3])
    # light flecks
    for _ in range(10):
        px(img, r.randrange(W), r.randrange(base + 1, base + 5), GRASS[5])
    for _ in range(3):  # tiny flowers
        x = r.randrange(1, W - 1)
        px(img, x, base - 1, rgb('ffffff'))
        px(img, x, base, rgb('f2d24b'))
    return keep('tile-grass-top', img)


def tile_gravel_top():
    W, H = 32, 10
    img = new(W, H)
    d = draw(img)
    rect(d, 0, 2, W, 6, GRAVEL[2])
    rect(d, 0, 2, W, 1, GRAVEL[4])
    rect(d, 0, 8, W, 2, STONE[1])  # kerb shadow
    r = random.Random(6)
    for _ in range(60):
        px(img, r.randrange(W), r.randrange(2, 8), r.choice(GRAVEL))
    for x in range(0, W, 3):  # pebbly top edge
        if r.random() < 0.5:
            px(img, x, 1, GRAVEL[3])
    return keep('tile-gravel-top', img)


def tile_wood():
    """Wooden decking / plank platform."""
    W, H = 32, 12
    img = new(W, H)
    d = draw(img)
    rect(d, 0, 0, W, H, WOOD[2])
    rect(d, 0, 0, W, 2, WOOD[4])
    rect(d, 0, 2, W, 1, WOOD[3])
    rect(d, 0, H - 2, W, 2, WOOD[0])
    for x in (0, 16):
        rect(d, x, 0, 1, H, WOOD[0])
        px(img, x + 3, 5, WOOD[0])
        px(img, x + 12, 5, WOOD[0])
    speckle(img, [WOOD[1], WOOD[3]], 0.08, random.Random(8), region=(0, 3, W, H - 2))
    return keep('tile-wood', img)


def tile_slab():
    """Stone slab (stepping stones, wall caps)."""
    W, H = 32, 12
    img = new(W, H)
    d = draw(img)
    rect(d, 0, 0, W, H, STONE[3])
    rect(d, 0, 0, W, 2, STONE[5])
    rect(d, 0, H - 3, W, 3, STONE[1])
    rect(d, 0, 0, 1, H, STONE[1])
    speckle(img, [STONE[2], STONE[4]], 0.1, random.Random(10), region=(1, 2, W, H - 3))
    return keep('tile-slab', img)


# =================================================================================
# Collectible + HUD
# =================================================================================

def bone():
    img = new(18, 10)
    d = draw(img)
    c = ramp('b9862a', 'e0b443', 'f6d873', 'fff3c4')
    for (x, y) in ((3, 3), (3, 6), (14, 3), (14, 6)):
        disc(d, x, y, 2.4, c[2])
    rect(d, 3, 3, 12, 4, c[2])
    img = shade_by_light(img, c, light=(-0.5, -1), noise=0.05)
    img = outline(img, rgb('5a3d10'))
    return keep('bone', img)


def heart(full: bool):
    img = new(13, 12)
    d = draw(img)
    c = RED if full else ramp('3b2a2a', '4e3a3a', '614a4a', '735a5a')
    disc(d, 3.5, 3.5, 3, c[2])
    disc(d, 8.5, 3.5, 3, c[2])
    poly(d, [(0.5, 4.5), (11.5, 4.5), (6, 10.5)], c[2])
    img = shade_by_light(img, c, light=(-0.6, -0.8), noise=0.03)
    if full:
        px(img, 2, 2, rgb('ffd0d0'))
        px(img, 3, 2, rgb('ffd0d0'))
        px(img, 2, 3, rgb('ffd0d0'))
    img = outline(img, rgb('3a0f0f'))
    return keep('heart-full' if full else 'heart-empty', img, ui=True)


def badge(name: str, base: list, icon):
    """Rounded power-up badge with a glowing rim; icon(d, img) draws the symbol."""
    S = 30
    img = new(S, S)
    d = draw(img)
    d.rounded_rectangle((0, 0, S - 1, S - 1), radius=6, fill=(*base[3], 255))
    d.rounded_rectangle((2, 2, S - 3, S - 3), radius=5, fill=(*base[0], 255))
    for y in range(3, S - 3):  # inner glow gradient
        t = y / S
        c = mix(base[1], base[0], t)
        line(d, [(3, y), (S - 4, y)], c)
    icon(d, img)
    d.rounded_rectangle((0, 0, S - 1, S - 1), radius=6, outline=(*mix(base[3], (255, 255, 255), 0.4), 255))
    return keep(f'badge-{name}', img, ui=True)


def icon_sprint(d, img):
    c = rgb('7fdcff')
    # running dog silhouette (side view)
    poly(d, [(6, 14), (12, 11), (19, 11), (23, 8), (26, 9), (25, 12), (22, 13), (20, 16), (13, 16)], c)
    line(d, [(8, 14), (4, 19)], c, 2)
    line(d, [(12, 16), (8, 22)], c, 2)
    line(d, [(19, 15), (24, 20)], c, 2)
    line(d, [(17, 16), (16, 23)], c, 2)
    line(d, [(7, 13), (3, 10)], c, 2)  # tail
    for y, x0 in ((8, 2), (12, 1)):  # speed lines
        line(d, [(x0, y + 9), (x0 + 3, y + 9)], rgb('c9f1ff'))


def icon_strength(d, img):
    c, s = rgb('ffb37a'), rgb('d8763c')
    # flexed arm
    poly(d, [(6, 24), (6, 17), (9, 14), (14, 15), (17, 12), (16, 7), (19, 5), (23, 7), (22, 12), (20, 17), (14, 21), (11, 24)], c)
    poly(d, [(9, 16), (14, 15), (12, 19)], s)
    disc(d, 13, 15, 3.3, c)
    line(d, [(10, 13), (13, 12), (16, 14)], rgb('ffe0c4'))


def icon_sniff(d, img):
    c = rgb('f08cff')
    disc(d, 15, 18, 5, c)
    for x, y in ((8, 11), (12.5, 7.5), (17.5, 7.5), (22, 11)):
        disc(d, x, y, 2.4, c)
    px(img, 14, 16, rgb('ffd6ff'))
    px(img, 13, 17, rgb('ffd6ff'))


def icon_bark(d, img):
    c = rgb('9ff0ff')
    # mouth / megaphone shape + sound arcs
    poly(d, [(5, 12), (11, 12), (17, 7), (17, 23), (11, 18), (5, 18)], c)
    for r_ in (4, 7):
        d.arc((17 - r_, 15 - r_ - 2, 17 + r_ + 4, 15 + r_ + 2), start=-55, end=55, fill=(*c, 255), width=2)


def badges():
    badge('sprint', ramp('0c3a6e', '1e6fbf', '2c86d8', '43b6ff'), icon_sprint)
    badge('strength', ramp('6e2a0c', 'bf4a1e', 'd8622c', 'ff8a43'), icon_strength)
    badge('sniff', ramp('4a0c6e', '8a2cbf', 'a43ed8', 'c86aff'), icon_sniff)
    badge('bark', ramp('0c5a6e', '1e9fbf', '2cb8d8', '43e0ff'), icon_bark)


def portrait():
    """Melody's face in a round frame, cut from her own sprite sheet."""
    from PIL import Image
    sheet = Image.open(os.path.join(PROJECT, 'public', 'assets', 'sprites', 'melody.png')).convert('RGBA')
    # frame 0 (idle, facing right) is the top-left 96x76 cell; her head is at its right side
    # frame 0 (idle, facing right) is the top-left 96x76 cell; her head is at its right side.
    # The crop is in screen pixels, used as art pixels: a chunky close-up.
    head = sheet.crop((62, 8, 96, 44))
    S = 38
    img = new(S, S)
    d = draw(img)
    disc(d, S / 2 - 0.5, S / 2 - 0.5, S / 2 - 0.5, rgb('3b2412'))
    disc(d, S / 2 - 0.5, S / 2 - 0.5, S / 2 - 2, rgb('f3e2c2'))
    disc(d, S / 2 - 0.5, S / 2 - 0.5, S / 2 - 3.5, rgb('9fd06a'))
    inner = new(S, S)
    paste(inner, head, -2, 6)
    # clip to the inner circle
    mask = new(S, S)
    disc(draw(mask), S / 2 - 0.5, S / 2 - 0.5, S / 2 - 3.5, (255, 255, 255))
    import numpy as np
    a = np.array(inner)
    a[:, :, 3] = np.minimum(a[:, :, 3], np.array(mask)[:, :, 3])
    from PIL import Image as I
    img.alpha_composite(I.fromarray(a))
    return keep('portrait-melody', img, ui=True)


# =================================================================================
# Props (decorations). Bottom-centre of each image stands on the ground.
# =================================================================================

def roses(img, x, y, rx, ry, r, flowers=FLOWER_W, density=0.5):
    """Climbing roses / leafy creeper with flowers dotted on it."""
    leaf_mass(img, x, y, rx, ry, FOLIAGE, r, blob=(2, 4))
    for _ in range(int(rx * ry * density / 4)):
        fx = x + r.uniform(-rx, rx) * 0.9
        fy = y + r.uniform(-ry, ry) * 0.9
        if 0 <= int(fx) < img.width and 0 <= int(fy) < img.height and img.getpixel((int(fx), int(fy)))[3]:
            px(img, fx, fy, flowers[1])
            px(img, fx + 1, fy, flowers[2])
            px(img, fx, fy + 1, flowers[0])


def window(d, img, x, y, w, h):
    rect(d, x - 2, y - 2, w + 4, h + 4, WALL[0])
    rect(d, x, y, w, h, rgb('2f3b48'))
    # sky reflection
    for k in range(0, w + h, 6):
        line(d, [(x + k, y), (x + k - 6, y + 6)], rgb('6f8ea8'))
    rect(d, x, y, w, 2, rgb('8fb0c8'))
    # panes
    rect(d, x + w // 2 - 1, y, 2, h, WALL[3])
    rect(d, x, y + h // 2 - 1, w, 2, WALL[3])
    for k in range(1, 3):
        rect(d, x + (w * k) // 4, y, 1, h, WALL[2])
    rect(d, x - 3, y + h + 1, w + 6, 3, STONE[4])  # sill
    rect(d, x - 3, y + h + 3, w + 6, 1, STONE[1])


def house():
    W, H = 300, 172
    img = new(W, H)
    d = draw(img)
    r = random.Random(30)
    G = H - 1  # ground row
    # chimney
    rect(d, 30, 6, 18, 32, WALL[2])
    rect(d, 28, 4, 22, 5, STONE[2])
    rect(d, 33, 0, 5, 5, TERRACOTTA[2])
    rect(d, 40, 0, 5, 5, TERRACOTTA[1])
    # walls
    rect(d, 2, 70, 200, G - 70, WALL[2])
    rect(d, 196, 94, 100, G - 94, WALL[2])
    speckle(img, [WALL[1], WALL[3]], 0.12, r)
    # roof (main)
    poly(d, [(-2, 74), (26, 28), (206, 28), (214, 74)], ROOF[2])
    poly(d, [(184, 98), (202, 62), (292, 62), (300, 98)], ROOF[2])
    for y in range(30, 74, 5):  # slate rows
        x0 = 26 - (y - 28) * 28 / 46
        x1 = 206 + (y - 28) * 8 / 46
        line(d, [(x0, y), (x1, y)], ROOF[1])
        off = (y // 5) % 2 * 4
        for x in range(int(x0) + off, int(x1), 8):
            px(img, x, y + 1, ROOF[0])
            px(img, x, y + 2, ROOF[0])
    for y in range(64, 98, 5):
        x0 = 202 - (y - 62) * 18 / 36
        x1 = 292 + (y - 62) * 8 / 36
        line(d, [(x0, y), (x1, y)], ROOF[1])
    speckle(img, [ROOF[3], ROOF[1]], 0.05, r, region=(0, 28, W, 98), only_on=ROOF[2])
    line(d, [(26, 28), (206, 28)], ROOF[3], 2)   # ridge
    line(d, [(202, 62), (292, 62)], ROOF[3], 2)
    rect(d, -2, 74, 216, 3, ROOF[0])             # eaves + shadow under them
    rect(d, 2, 77, 200, 3, WALL[0])
    rect(d, 184, 98, 116, 3, ROOF[0])
    rect(d, 196, 101, 100, 3, WALL[0])
    # front door with wreath + steps
    rect(d, 36, 114, 28, G - 114, WALL[0])
    rect(d, 39, 117, 22, G - 117, DOOR[1])
    for yy in (121, 138, 155):
        rect(d, 42, yy, 16, 12, DOOR[2])
        rect(d, 42, yy, 16, 1, DOOR[3])
    px(img, 57, 146, rgb('d8b860'))
    d.ellipse((44, 121, 56, 133), outline=(*FOLIAGE[3], 255), width=3)
    px(img, 47, 122, RED[2]); px(img, 53, 124, RED[2]); px(img, 45, 129, RED[3]); px(img, 52, 131, RED[2])
    rect(d, 28, G - 8, 44, 4, STONE[3]); rect(d, 28, G - 8, 44, 1, STONE[5])
    rect(d, 24, G - 4, 52, 4, STONE[2]); rect(d, 24, G - 4, 52, 1, STONE[4])
    # windows
    window(d, img, 92, 104, 34, 40)
    window(d, img, 148, 108, 28, 34)
    window(d, img, 8, 100, 18, 30)
    # post box + lamp
    rect(d, 72, 124, 12, 9, rgb('2a2a2e')); rect(d, 74, 126, 8, 2, rgb('55555c'))
    rect(d, 287, 116, 5, 8, rgb('ece6d0')); rect(d, 286, 114, 7, 2, rgb('2a2a2e'))
    # garage: arched double door
    gx, gw, gt = 212, 70, 118
    d.pieslice((gx, gt - 2, gx + gw, gt + 36), 180, 360, fill=(*WALL[0], 255))
    rect(d, gx, gt + 16, gw, G - gt - 16, WALL[0])
    gx, gw = gx + 3, gw - 6
    d.pieslice((gx, gt + 1, gx + gw, gt + 33), 180, 360, fill=(*DOOR[2], 255))
    rect(d, gx, gt + 16, gw, G - gt - 16, DOOR[2])
    for x in range(gx + 4, gx + gw, 6):
        line(d, [(x, gt + 4 + abs(x - (gx + gw / 2)) * 0.35), (x, G)], DOOR[1])
    rect(d, gx + gw // 2 - 1, gt, 2, G - gt, DOOR[0])
    rect(d, gx + gw // 2 - 6, 148, 3, 6, rgb('2a2a2e')); rect(d, gx + gw // 2 + 3, 148, 3, 6, rgb('2a2a2e'))
    # wall base shadow
    rect(d, 2, G - 2, 294, 2, WALL[0])
    img = outline(img, OUTLINE)
    # climbing roses along the eaves and round the door (after outline so leaves get their own)
    leaves = new(W, H)
    roses(leaves, 70, 80, 34, 8, r)
    roses(leaves, 150, 82, 26, 7, r)
    roses(leaves, 34, 108, 10, 14, r)
    roses(leaves, 30, 136, 8, 20, r)
    roses(leaves, 196, 106, 10, 22, r)
    roses(leaves, 200, 140, 8, 26, r)
    roses(leaves, 240, 104, 22, 6, r)
    leaves = outline(leaves, LEAF_OUTLINE)
    img.alpha_composite(leaves)
    return keep('house', img)


def trampoline():
    W, H = 124, 80
    img = new(W, H)
    d = draw(img)
    mat_y = 50
    black, grey = rgb('1d1f26'), rgb('4a4f5c')
    # legs (W shapes)
    for x in (14, 46, 78, 110):
        line(d, [(x, mat_y + 4), (x - 6, H - 1)], grey, 2)
        line(d, [(x, mat_y + 4), (x + 6, H - 1)], grey, 2)
    # net (behind the mat), semi-transparent mesh
    net = new(W, H)
    nd = draw(net)
    for x in range(8, W - 8, 7):
        line(nd, [(x, 6), (x, mat_y - 4)], (30, 34, 42))
    for y in range(10, mat_y - 4, 7):
        line(nd, [(6, y), (W - 7, y)], (30, 34, 42))
    a = net.split()[3].point(lambda v: 90 if v else 0)
    net.putalpha(a)
    img.alpha_composite(net)
    # poles + top ring
    for x in (6, 34, 90, W - 7):
        rect(d, x - 1, 4, 3, mat_y - 2, black)
        px(img, x, 6, grey)
    rect(d, 6, 3, W - 12, 3, BLUE[1])
    rect(d, 6, 3, W - 12, 1, BLUE[3])
    # mat + padded rim (side view, slightly from above)
    d.ellipse((2, mat_y - 6, W - 3, mat_y + 6), fill=(*BLUE[2], 255))
    d.ellipse((10, mat_y - 4, W - 11, mat_y + 3), fill=(*black, 255))
    rect(d, 2, mat_y, W - 4, 5, BLUE[1])
    rect(d, 2, mat_y + 4, W - 4, 2, BLUE[0])
    line(d, [(16, mat_y - 5), (W - 17, mat_y - 5)], BLUE[3])
    img = outline(img, OUTLINE)
    return keep('trampoline', img)


def stump():
    W, H = 60, 56
    img = new(W, H)
    d = draw(img)
    r = random.Random(12)
    # roots
    poly(d, [(2, H - 1), (12, H - 14), (14, H - 1)], BARK[2])
    poly(d, [(W - 3, H - 1), (W - 12, H - 16), (W - 16, H - 1)], BARK[1])
    poly(d, [(22, H - 1), (28, H - 8), (32, H - 1)], BARK[2])
    rect(d, 8, 8, W - 16, H - 9, BARK[2])
    # bark streaks
    for x in range(9, W - 8, 3):
        c = r.choice((BARK[1], BARK[3], BARK[2], BARK[1]))
        line(d, [(x, 12 + r.randrange(0, 6)), (x + r.choice((-1, 0, 1)), H - 2)], c)
    rect(d, W - 14, 8, 6, H - 9, BARK[1])  # shaded side
    rect(d, 8, 8, 4, H - 9, BARK[3])
    # top
    d.ellipse((7, 2, W - 8, 15), fill=(*rgb('c9a06a'), 255))
    for k, c in ((4, rgb('b58a55')), (8, rgb('a07444')), (12, rgb('8c6237'))):
        d.ellipse((7 + k * 1.4, 2 + k * 0.35, W - 8 - k * 1.4, 15 - k * 0.35), outline=(*c, 255))
    line(d, [(W / 2 - 2, 7), (W / 2 + 8, 11)], rgb('7a5230'))
    # moss
    leaf_mass(img, 14, H - 8, 7, 4, GRASS, r, blob=(1, 2), count=10)
    img = outline(img, OUTLINE)
    return keep('stump', img)


def treehouse():
    W, H = 220, 280
    img = new(W, H)
    d = draw(img)
    r = random.Random(40)
    deck = 150  # deck surface row
    # canopy behind
    for cx, cy, rx, ry in ((60, 60, 62, 50), (150, 48, 70, 52), (110, 30, 60, 34), (190, 90, 34, 40), (24, 110, 30, 34)):
        leaf_mass(img, cx, cy, rx, ry, FOLIAGE, r, blob=(4, 7))
    # trunk + branches
    poly(d, [(92, H - 1), (98, 70), (126, 70), (138, H - 1)], BARK[2])
    poly(d, [(80, H - 1), (92, H - 14), (98, H - 1)], BARK[2])
    poly(d, [(132, H - 1), (140, H - 12), (150, H - 1)], BARK[1])
    for x in range(96, 134, 3):
        line(d, [(x, 80), (x + r.choice((-1, 0, 1)), H - 3)], r.choice((BARK[1], BARK[3], BARK[2])))
    poly(d, [(126, H - 1), (124, 70), (130, 70), (138, H - 1)], BARK[1])
    line(d, [(104, 90), (54, 52)], BARK[2], 7)
    line(d, [(122, 84), (176, 46)], BARK[2], 7)
    line(d, [(124, 100), (200, 92)], BARK[2], 5)
    # cabin
    cab_x, cab_w, cab_top = 50, 112, 82
    rect(d, cab_x, cab_top, cab_w, deck - cab_top, WOOD[2])
    for y in range(cab_top, deck, 6):
        rect(d, cab_x, y, cab_w, 1, WOOD[1])
    for x in range(cab_x, cab_x + cab_w, 16):
        px(img, x + 3, cab_top + 3, WOOD[0])
    rect(d, cab_x + 60, cab_top + 18, 26, deck - cab_top - 18, rgb('2a1a10'))      # doorway
    rect(d, cab_x + 64, cab_top + 26, 10, 14, rgb('f2cf6a'))                         # lamp light inside
    rect(d, cab_x + 14, cab_top + 18, 20, 16, rgb('2a1a10'))                         # window
    rect(d, cab_x + 16, cab_top + 20, 16, 12, rgb('5b7d95'))
    rect(d, cab_x + 23, cab_top + 20, 2, 12, WOOD[3])
    # tarp roof
    poly(d, [(cab_x - 14, cab_top + 6), (cab_x + 34, cab_top - 30), (cab_x + cab_w - 10, cab_top - 30),
             (cab_x + cab_w + 16, cab_top + 6)], rgb('2a3142'))
    poly(d, [(cab_x - 14, cab_top + 6), (cab_x + 34, cab_top - 30), (cab_x + 40, cab_top - 26), (cab_x - 4, cab_top + 6)],
         rgb('3c4660'))
    for k in range(5):  # sagging tarp edge
        x = cab_x - 14 + k * 30
        d.chord((x, cab_top + 2, x + 30, cab_top + 12), 0, 180, fill=(*rgb('2a3142'), 255))
    # deck + railing
    rect(d, 20, deck, 176, 8, WOOD[3])
    rect(d, 20, deck, 176, 2, WOOD[4])
    rect(d, 20, deck + 6, 176, 2, WOOD[0])
    for x in range(22, 196, 9):
        rect(d, x, deck - 22, 3, 22, WOOD[2])
        rect(d, x, deck - 22, 1, 22, WOOD[3])
    rect(d, 20, deck - 24, 176, 4, WOOD[3])
    rect(d, 20, deck - 24, 176, 1, WOOD[4])
    # supports
    line(d, [(30, deck + 8), (96, deck + 50)], WOOD[1], 4)
    line(d, [(186, deck + 8), (136, deck + 50)], WOOD[1], 4)
    # red paw flag on the railing
    rect(d, 120, deck - 22, 22, 26, RED[2])
    rect(d, 120, deck - 22, 22, 2, RED[3])
    rect(d, 140, deck - 22, 2, 26, RED[1])
    disc(d, 131, deck - 6, 3, rgb('ffffff'))
    for x, y in ((126, deck - 12), (129, deck - 14), (133, deck - 14), (136, deck - 12)):
        px(img, x, y, rgb('ffffff'))
        px(img, x, y + 1, rgb('ffffff'))
    # ladder
    lx = 66
    rect(d, lx, deck + 8, 3, H - deck - 9, WOOD[2])
    rect(d, lx + 16, deck + 8, 3, H - deck - 9, WOOD[2])
    for y in range(deck + 16, H - 2, 12):
        rect(d, lx, y, 19, 3, WOOD[3])
        rect(d, lx, y + 2, 19, 1, WOOD[0])
    img = outline(img, OUTLINE)
    # a few leaves in front of the branches
    front = new(W, H)
    for cx, cy in ((40, 128), (196, 118), (170, 70)):
        leaf_mass(front, cx, cy, 20, 12, FOLIAGE, r, blob=(3, 5))
    front = outline(front, LEAF_OUTLINE)
    img.alpha_composite(front)
    return keep('treehouse', img)


def big_tree():
    W, H = 200, 250
    img = new(W, H)
    d = draw(img)
    r = random.Random(44)
    poly(d, [(84, H - 1), (90, 90), (112, 90), (122, H - 1)], BARK[2])
    poly(d, [(72, H - 1), (86, H - 12), (90, H - 1)], BARK[2])
    poly(d, [(116, H - 1), (126, H - 10), (134, H - 1)], BARK[1])
    for x in range(88, 120, 3):
        line(d, [(x, 100), (x, H - 3)], r.choice((BARK[1], BARK[3], BARK[2])))
    line(d, [(96, 110), (50, 70)], BARK[2], 6)
    line(d, [(108, 104), (156, 66)], BARK[2], 6)
    for cx, cy, rx, ry in ((60, 72, 56, 46), (140, 66, 60, 48), (100, 40, 64, 38), (100, 96, 70, 30)):
        leaf_mass(img, cx, cy, rx, ry, FOLIAGE, r, blob=(4, 7))
    img = outline(img, OUTLINE)
    return keep('big-tree', img)


def goal():
    W, H = 112, 60
    img = new(W, H)
    d = draw(img)
    white, shade = rgb('f6f6f2'), rgb('c9c9c2')
    net = new(W, H)
    nd = draw(net)
    for x in range(4, W - 4, 4):
        line(nd, [(x, 4), (x + 6, H - 2)], (230, 230, 230))
    for y in range(6, H, 4):
        line(nd, [(4, y), (W - 4, y)], (230, 230, 230))
    net.putalpha(net.split()[3].point(lambda v: 170 if v else 0))
    img.alpha_composite(net)
    rect(d, 2, 2, W - 4, 4, white)
    rect(d, 2, 2, 4, H - 3, white)
    rect(d, W - 6, 2, 4, H - 3, white)
    rect(d, 2, 5, W - 4, 1, shade)
    line(d, [(10, 6), (18, H - 2)], shade, 2)
    line(d, [(W - 10, 6), (W - 4, H - 2)], shade, 2)
    img = outline(img, rgb('5a5a5a'))
    return keep('goal', img)


def football():
    img = new(12, 12)
    d = draw(img)
    disc(d, 5.5, 5.5, 5, rgb('f6f6f2'))
    img = shade_by_light(img, ramp('a8a8a8', 'd8d8d4', 'f6f6f2', 'ffffff'), noise=0.02)
    d = draw(img)
    poly(d, [(5, 3), (7, 4), (7, 6), (5, 7), (4, 5)], rgb('1d1d1d'))
    px(img, 1, 6, rgb('1d1d1d')); px(img, 9, 2, rgb('1d1d1d')); px(img, 9, 9, rgb('1d1d1d')); px(img, 3, 9, rgb('1d1d1d'))
    img = outline(img, rgb('2a2a2a'))
    return keep('football', img)


def egg_chair():
    W, H = 52, 104
    img = new(W, H)
    d = draw(img)
    dark, mid = rgb('23262c'), rgb('3e434d')
    # stand: arc + base
    d.arc((4, 2, 70, 150), 190, 265, fill=(*dark, 255), width=4)
    rect(d, 2, H - 5, 36, 4, dark)
    rect(d, 6, 60, 4, H - 62, dark)
    # chain
    for y in range(8, 30, 3):
        px(img, 36, y, rgb('8a8a8a'))
        px(img, 37, y + 1, rgb('5a5a5a'))
    # egg
    d.ellipse((18, 28, 50, 86), fill=(*mid, 255))
    for y in range(30, 86, 3):  # wicker weave
        line(d, [(18, y), (50, y)], dark)
    for x in range(20, 50, 4):
        line(d, [(x, 28), (x, 86)], rgb('31353d'))
    d.ellipse((22, 44, 46, 80), fill=(*dark, 255))  # opening
    d.ellipse((24, 58, 46, 80), fill=(*rgb('e8e4da'), 255))  # cushion
    d.ellipse((26, 50, 40, 64), fill=(*rgb('d0cabc'), 255))
    img = outline(img, OUTLINE)
    return keep('egg-chair', img)


def flower_pot(name, petals):
    W, H = 28, 30
    img = new(W, H)
    d = draw(img)
    r = random.Random(hash(name) % 1000)
    leaf_mass(img, 14, 10, 11, 9, FOLIAGE, r, blob=(2, 3.5))
    for _ in range(14):
        x, y = 14 + r.uniform(-10, 10), 9 + r.uniform(-8, 6)
        if img.getpixel((int(x), int(y)))[3]:
            px(img, x, y, petals[1]); px(img, x + 1, y, petals[2]); px(img, x, y + 1, petals[0])
    poly(d, [(6, 17), (22, 17), (20, H - 1), (8, H - 1)], TERRACOTTA[2])
    rect(d, 5, 16, 18, 3, TERRACOTTA[3])
    rect(d, 17, 19, 3, H - 20, TERRACOTTA[1])
    img = outline(img, OUTLINE)
    return keep(name, img)


def bush(name, flowers=None, berries=False, w=64, h=40):
    img = new(w, h)
    r = random.Random(hash(name) % 1000 + 3)
    leaf_mass(img, w / 2, h * 0.58, w * 0.46, h * 0.42, FOLIAGE, r, blob=(3, 5))
    d = draw(img)
    if flowers:
        for _ in range(9):
            x, y = w / 2 + r.uniform(-w * 0.38, w * 0.38), h * 0.5 + r.uniform(-h * 0.3, h * 0.25)
            for k in range(7):
                px(img, x + r.randint(-2, 2), y + r.randint(-2, 2), r.choice(flowers))
    if berries:
        for _ in range(22):
            x, y = w / 2 + r.uniform(-w * 0.4, w * 0.4), h * 0.55 + r.uniform(-h * 0.35, h * 0.3)
            if img.getpixel((int(x), int(y)))[3]:
                disc(d, x, y, 1.2, RED[2]); px(img, x - 1, y - 1, RED[3])
    img = outline(img, LEAF_OUTLINE)
    return keep(name, img)


def planter():
    W, H = 52, 34
    img = new(W, H)
    d = draw(img)
    r = random.Random(50)
    leaf_mass(img, W / 2, 10, 22, 9, FOLIAGE, r, blob=(2, 4))
    rect(d, 2, 14, W - 4, H - 15, WOOD[2])
    for y in (14, 21, 28):
        rect(d, 2, y, W - 4, 1, WOOD[1])
    rect(d, 2, 14, 3, H - 15, WOOD[3]); rect(d, W - 5, 14, 3, H - 15, WOOD[1])
    rect(d, 2, 13, W - 4, 2, WOOD[4])
    img = outline(img, OUTLINE)
    return keep('planter', img)


def drain():
    """Stone-edged drain pipe / tunnel opening, set into a wall."""
    W, H = 44, 36
    img = new(W, H)
    d = draw(img)
    d.pieslice((0, 0, W - 1, 2 * H), 180, 360, fill=(*STONE[2], 255))
    rect(d, 0, H // 2, W, H // 2, STONE[2])
    for k in range(7):  # arch stones
        a = math.pi + k * math.pi / 6
        x, y = W / 2 + math.cos(a) * (W / 2 - 3), H + math.sin(a) * (H - 3)
        px(img, x, y, STONE[0])
    d.pieslice((7, 8, W - 8, 2 * H - 6), 180, 360, fill=(*rgb('15120f'), 255))
    rect(d, 7, H - 6, W - 15, 6, rgb('15120f'))
    d.arc((7, 8, W - 8, 2 * H - 6), 190, 300, fill=(*rgb('4a4038'), 255), width=2)
    img = outline(img, OUTLINE)
    return keep('drain', img)


def squirrel():
    W, H = 24, 22
    img = new(W, H)
    d = draw(img)
    fur, dark, light = rgb('c4622a'), rgb('8e3f17'), rgb('e8935a')
    d.ellipse((1, 1, 12, 19), fill=(*fur, 255))          # bushy tail
    d.ellipse((3, 3, 10, 15), fill=(*light, 255))
    d.ellipse((9, 8, 19, 21), fill=(*fur, 255))          # body
    d.ellipse((12, 12, 18, 20), fill=(*rgb('f2d6b4'), 255))
    disc(d, 18, 7, 4, fur)                                # head
    px(img, 19, 6, rgb('101010'))
    poly(d, [(16, 3), (17, 0), (18, 3)], dark)           # ear
    rect(d, 10, H - 2, 9, 2, dark)
    img = outline(img, OUTLINE)
    return keep('squirrel', img)


def flowers():
    W, H = 40, 16
    img = new(W, H)
    d = draw(img)
    r = random.Random(60)
    for _ in range(14):
        x = r.uniform(2, W - 2)
        hgt = r.uniform(5, 12)
        line(d, [(x, H - 1), (x + r.uniform(-1, 1), H - hgt)], FOLIAGE[2])
        c = r.choice([FLOWER_W, ramp('6a4aa0', '8c6ad0', 'b49af0'), ramp('c08a20', 'f2c84a', 'fff0a0')])
        cx, cy = x, H - hgt
        px(img, cx, cy - 1, c[1]); px(img, cx - 1, cy, c[1]); px(img, cx + 1, cy, c[1]); px(img, cx, cy + 1, c[0])
        px(img, cx, cy, rgb('f2d24b'))
    return keep('flowers', img)


def fern():
    """Big dark leaves for the very front (drawn over everything)."""
    W, H = 110, 60
    img = new(W, H)
    d = draw(img)
    r = random.Random(70)
    c = ramp('0f2410', '163318', '1f4420', '2a5527')
    for _ in range(9):
        bx = r.uniform(10, W - 10)
        ang = r.uniform(-2.4, -0.7)
        ln = r.uniform(30, 55)
        tx, ty = bx + math.cos(ang) * ln, H + math.sin(ang) * ln
        poly(d, [(bx - 6, H), (tx, ty), (bx + 6, H)], r.choice(c[1:]))
        line(d, [(bx, H), (tx, ty)], c[0])
    return keep('fern', img)


PROPS = [house, trampoline, stump, treehouse, big_tree, goal, football, egg_chair,
         lambda: flower_pot('pot-purple', ramp('5a3a90', '8c6ad0', 'c4adf5')),
         lambda: flower_pot('pot-pink', ramp('a03a6a', 'e06aa0', 'ffb0d0')),
         lambda: bush('bush'), lambda: bush('bush-hydrangea', flowers=[rgb('6a8ae0'), rgb('8aa8f0'), rgb('a88ad8'), rgb('c4d4ff')]),
         lambda: bush('bush-berries', berries=True, w=70, h=44), planter, drain, squirrel, flowers, fern]


TILES = [bg_sky, bg_clouds, bg_far, bg_trees, bg_fence, tile_dirt, tile_stone, tile_grass_top, tile_gravel_top,
         tile_wood, tile_slab, bone, lambda: heart(True), lambda: heart(False), badges, portrait]


def main():
    for f in TILES + PROPS:
        f()
    for name, img in ASSETS:
        save(img, os.path.join(OUT, f'{name}.png'))
    for name, img in UI:
        save(img, os.path.join(UI_OUT, f'{name}.png'))
    contact_sheet(ASSETS + UI, os.path.join(ROOT, 'garden_preview.png'))
    print(f'wrote {len(ASSETS)} garden images and {len(UI)} UI images')


if __name__ == '__main__':
    main()
