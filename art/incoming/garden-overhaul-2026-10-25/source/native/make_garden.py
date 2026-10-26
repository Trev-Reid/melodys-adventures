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

import numpy as np
from PIL import Image

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from pixel import (  # noqa: E402
    BAYER4, canopy, contact_sheet, disc, dither_index, dithered_vgradient, draw, haze, leaf_clumps, leaf_mass, line,
    mix, new, outline, outline_wrap_x, paste, poly, px, ramp, rect, rgb, save, shade_by_light, soft_ellipse, speckle,
    vgradient,
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


# Animated pictures: a strip of frames side by side. Their frame size goes in
# src/assets/gardenSheets.json so the game can cut them up.
SHEETS: dict[str, dict] = {}
SHEETS_JSON = os.path.join(PROJECT, 'src', 'assets', 'gardenSheets.json')


def keep(name: str, img, ui: bool = False):
    (UI if ui else ASSETS).append((name, img))
    return img


def keep_sheet(name: str, frames: list, fps: float, yoyo: bool = False):
    """Save frames (all the same size) as one strip, and record how to animate it."""
    w, h = frames[0].size
    strip = new(w * len(frames), h)
    for i, f in enumerate(frames):
        paste(strip, f, i * w, 0)
    SHEETS[name] = {'frameWidth': w * 2, 'frameHeight': h * 2, 'frames': len(frames), 'fps': fps, 'yoyo': yoyo}
    return keep(name, strip)


# =================================================================================
# Backgrounds (tile horizontally; the game scrolls them at different speeds)
# =================================================================================

def bg_sky():
    """Sky: deep blue at the top fading to a pale haze, with a warm glow where the sun is (top right)."""
    import numpy as np
    from PIL import Image
    W, H = 480, 270
    img = dithered_vgradient(W, H, [(0.0, rgb('3a86d6')), (0.45, rgb('6fb6ea')), (0.8, rgb('a9dbf4')), (1.0, rgb('d2eef7'))])
    a = np.array(img).astype(np.float32)
    yy, xx = np.mgrid[0:H, 0:W]
    d = np.hypot((xx - 410) / 1.1, yy + 20)
    glow = np.exp(-(d / 150) ** 2) * 0.55 + np.exp(-(d / 50) ** 2) * 0.35
    glow = np.clip(glow + (BAYER4[yy % 4, xx % 4] - 0.5) * 0.04, 0, 1)
    for k, c in enumerate((255, 248, 222)):
        a[:, :, k] = a[:, :, k] + (c - a[:, :, k]) * glow
    return keep('bg-sky', Image.fromarray(a.round().astype(np.uint8)))



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
    """Irish countryside far away: blue hills, patchwork fields with hedgerows, a farmhouse."""
    W, H = 480, 170
    img = new(W, H)
    d = draw(img)
    r = random.Random(21)
    tau = math.tau

    def ridge(x, base, amps):
        return base + sum(a * math.sin(x / W * tau * k + ph) for k, a, ph in amps)

    far = [(x, ridge(x, 60, [(1, 10, 0.4), (3, 5, 1.3), (7, 2, 0.2)])) for x in range(0, W + 1, 2)]
    poly(d, [(0, H)] + far + [(W, H)], rgb('93b8c6'))
    hill_amps = [(2, 9, 0.6), (5, 4, 2.0), (9, 2, 1.0)]
    hill = [(x, ridge(x, 86, hill_amps)) for x in range(0, W + 1, 2)]
    poly(d, [(0, H)] + hill + [(W, H)], rgb('8dbd78'))
    # fields: soft patches of different greens and gold, edged by hedgerow dots
    fields = [rgb('94c47c'), rgb('a3cd84'), rgb('bcd68c'), rgb('86ba72'), rgb('accf88'), rgb('cbd892')]
    for _ in range(26):
        cx = r.uniform(0, W)
        cy = r.uniform(96, 150)
        rx, ry = r.uniform(22, 48), r.uniform(5, 10)
        tilt = r.uniform(-0.25, 0.25)
        col = r.choice(fields)
        pts = []
        for k in range(16):
            a = k / 16 * tau
            x = cx + math.cos(a) * rx
            y = cy + math.sin(a) * ry + (x - cx) * tilt
            pts.append((x, max(y, ridge(x, 86, hill_amps) + 2)))
        for off in (-W, 0, W):
            poly(d, [(x + off, y) for x, y in pts], col)
    # hedgerows: wavy dotted lines across the fields, and trees along the ridge
    for k in range(5):
        y0 = 98 + k * 12
        for x in range(0, W, 3):
            y = y0 + 4 * math.sin(x / W * tau * 2 + k) + 2 * math.sin(x / 17 + k)
            if y > ridge(x, 86, hill_amps) + 2 and r.random() < 0.8:
                px(img, x, y, rgb('5f8f55'))
                if r.random() < 0.3:
                    disc(d, x, y - 1, 1.5, rgb('5a8a52'))
    for x in range(0, W, 7):
        if r.random() < 0.6:
            y = ridge(x, 86, hill_amps)
            rr = r.uniform(2.5, 4.5)
            disc(d, x, y - rr + 1, rr, rgb('5a8752'))
            disc(d, x - 1, y - rr, rr * 0.55, rgb('6c9a60'))
    fx, fy = 300, int(ridge(300, 86, hill_amps)) + 5
    rect(d, fx, fy - 7, 14, 7, rgb('f2f3ee'))
    poly(d, [(fx - 1, fy - 7), (fx + 3, fy - 11), (fx + 12, fy - 11), (fx + 15, fy - 7)], rgb('7d8894'))
    rect(d, fx + 3, fy - 5, 2, 2, rgb('8aa0b4'))
    rect(d, fx + 9, fy - 5, 2, 2, rgb('8aa0b4'))
    rect(d, fx + 16, fy - 4, 6, 4, rgb('c9b38a'))  # barn
    disc(d, fx + 26, fy - 6, 4, rgb('5a8752'))
    img = haze(img, rgb('cfe9f2'), 0.3)
    return keep('bg-far', img)




def bg_trees():
    """Big leafy trees behind the garden (mid distance), seamless left to right."""
    W, H = 480, 260
    img = new(W, H)
    d = draw(img)
    r = random.Random(5)
    trees = [(30, 108, 60), (140, 92, 72), (262, 120, 56), (372, 96, 76), (470, 124, 50)]
    trunk = ramp('2e2a24', '3d362d', '4d4438')
    for cx, cy, rad in trees:
        tx = cx + r.uniform(-6, 6)
        for off in (-W, 0, W):
            poly(d, [(tx + off - 8, H), (tx + off - 4, cy + rad * 0.3), (tx + off + 5, cy + rad * 0.3), (tx + off + 9, H)], trunk[1])
            poly(d, [(tx + off + 3, H), (tx + off + 2, cy + rad * 0.3), (tx + off + 5, cy + rad * 0.3), (tx + off + 9, H)], trunk[0])
            line(d, [(tx + off, cy + rad * 0.5), (tx + off - 22, cy + 6)], trunk[1], 3)
            line(d, [(tx + off, cy + rad * 0.6), (tx + off + 24, cy + 14)], trunk[1], 3)
    puffs = []
    for cx, cy, rad in trees:
        puffs.append((cx, cy - rad * 0.25, rad * 0.5))
        for _ in range(12):
            a = r.uniform(0, math.tau)
            dist = r.uniform(rad * 0.25, rad * 0.75)
            puffs.append((cx + math.cos(a) * dist * 1.15, cy + math.sin(a) * dist * 0.7, rad * r.uniform(0.26, 0.4)))
    img = canopy(img, puffs, LEAVES_FAR, seed=11, wrap_w=W, bumpiness=0.12, brightness=0.04)
    hedge = [(x + r.uniform(-3, 3), H - 30 + r.uniform(-5, 4), r.uniform(10, 15)) for x in range(0, W, 12)]
    img = canopy(img, hedge, LEAVES_FAR, seed=12, wrap_w=W, bumpiness=0.1)
    rect(draw(img), 0, H - 18, W, 18, LEAVES_FAR[1])
    img = outline_wrap_x(img, rgb('29473a'))
    img = haze(img, rgb('cfe9f2'), 0.1)
    return keep('bg-trees', img)




def bg_fence():
    """Wooden garden fence with ivy, just behind the play area (repeats sideways)."""
    W, H = 128, 72
    img = new(W, H)
    d = draw(img)
    top = 22
    boards = ramp('5a3a22', '6e4a2c', '835a36', '976b41')
    for i, x in enumerate(range(0, W, 8)):
        c = boards[1 + (i % 3)]
        h = top + (i * 5) % 3
        rect(d, x, h, 8, H - h, c)
        rect(d, x, h, 1, H - h, boards[0])
        rect(d, x + 7, h, 1, H - h, boards[0])
        rect(d, x + 1, h, 6, 1, boards[3])
        for y in range(h + 6, H, 9):  # wood grain
            px(img, x + 3 + (y % 3), y, boards[0])
    for y in (top + 10, top + 36):  # rails
        rect(d, 0, y, W, 4, boards[0])
        rect(d, 0, y, W, 1, boards[1])
    for x in (0, 64):  # posts
        rect(d, x, top - 6, 6, H - top + 6, boards[1])
        rect(d, x + 4, top - 6, 2, H - top + 6, boards[0])
        rect(d, x, top - 7, 6, 2, boards[3])
    r = random.Random(9)
    ivy = []
    for x in (14, 44, 92, 118):
        for _ in range(3):
            ivy.append((x + r.uniform(-8, 8), top + r.uniform(-3, 9), r.uniform(5, 8)))
    img = canopy(img, ivy, LEAVES, seed=13, wrap_w=W)
    img = haze(img, rgb('cfe9f2'), 0.1)
    return keep('bg-fence', img)



# =================================================================================
# Ground & platform tiles (tile in both directions)
# =================================================================================

def tile_dirt():
    """Garden soil: dark loam with clods, pebbles and roots. Repeats in both directions."""
    import numpy as np
    from PIL import Image
    W = H = 32
    r = random.Random(2)
    yy, xx = np.mgrid[0:H, 0:W]
    # soft clumpy noise that wraps: sum of periodic waves
    t = np.zeros((H, W), dtype=np.float32)
    for _ in range(9):
        kx, ky = r.randint(1, 4), r.randint(1, 4)
        ph = r.uniform(0, math.tau)
        t += np.sin((xx * kx / W + yy * ky / H) * math.tau + ph) * r.uniform(0.3, 1.0)
    t = (t - t.min()) / (t.max() - t.min())
    idx = dither_index(t * 0.55 + 0.2, xx, yy, len(SOIL), strength=0.8)
    a = np.zeros((H, W, 4), dtype=np.uint8)
    a[:, :, :3] = np.array(SOIL)[idx]
    a[:, :, 3] = 255
    img = Image.fromarray(a)
    d = draw(img)

    def wrap_rect(x, y, w, h, c):
        for ox in (0, -W):
            for oy in (0, -H):
                rect(d, x + ox, y + oy, w, h, c)

    for _ in range(6):  # pebbles
        x, y = r.randrange(W), r.randrange(H)
        w = r.choice((2, 3, 4))
        wrap_rect(x, y, w, 2, STONE_V2[3])
        wrap_rect(x, y, w - 1, 1, STONE_V2[5])
        wrap_rect(x + 1, y + 2, w - 1, 1, SOIL[0])
    for _ in range(2):  # roots
        x, y = r.randrange(W), r.randrange(H)
        for k in range(r.randint(5, 9)):
            wrap_rect((x + k) % W, (y + int(2 * math.sin(k * 0.8))) % H, 1, 1, rgb('8f6a45'))
    for _ in range(14):  # dark crumbs
        wrap_rect(r.randrange(W), r.randrange(H), 1, 1, SOIL[0])
    return keep('tile-dirt', img)



def tile_stone():
    """Dry stone wall: irregular rounded stones, mortar, moss and the odd fern. Repeats both ways."""
    import numpy as np
    from PIL import Image
    W, H = 48, 48
    r = random.Random(4)
    a = np.zeros((H, W, 4), dtype=np.uint8)
    a[:, :, :3] = STONE_V2[0]
    a[:, :, 3] = 255
    yy, xx = np.mgrid[0:H, 0:W]
    rows = [(0, 11), (11, 9), (20, 12), (32, 9), (41, 7)]
    stones = []
    for ri, (y, h) in enumerate(rows):
        x = r.randint(-8, 0)
        while x < W:
            w = r.randint(9, 17)
            stones.append((x, y, w, h))
            x += w
    n = len(STONE_V2)
    for x0, y0, w, h in stones:
        tone = r.uniform(-0.12, 0.12)
        for ox in (-W, 0, W):
            for oy in (-H, 0, H):
                sx, sy = x0 + ox, y0 + oy
                cx, cy = sx + w / 2, sy + h / 2
                nx = (xx + 0.5 - cx) / (w / 2 - 0.6)
                ny = (yy + 0.5 - cy) / (h / 2 - 0.6)
                inside = (np.abs(nx) ** 3 + np.abs(ny) ** 3) <= 1
                if not inside.any():
                    continue
                lum = -nx * 0.45 - ny * 0.65
                t = np.clip(0.55 + lum * 0.35 + tone, 0, 1)
                idx = dither_index(t, xx, yy, n - 1, strength=0.6) + 1
                a[inside, :3] = np.array(STONE_V2)[idx[inside]]
    img = Image.fromarray(a)
    d = draw(img)
    # moss on top of some stones, a few cracks
    for x0, y0, w, h in stones:
        if r.random() < 0.35:
            mx = (x0 + r.randint(1, max(1, w - 5))) % W
            for k in range(r.randint(3, 6)):
                px(img, (mx + k) % W, (y0 + 1) % H, GRASS_V2[3 + (k % 2)])
                if k % 2:
                    px(img, (mx + k) % W, (y0 + 2) % H, GRASS_V2[2])
        if r.random() < 0.25:
            cx = (x0 + w // 2) % W
            for k in range(3):
                px(img, (cx + k // 2) % W, (y0 + 3 + k) % H, STONE_V2[1])
    return keep('tile-stone', img)



def tile_grass_top():
    """Grass along the top of the ground: blades on top, a lit band, tufts hanging over the edge."""
    W, H = 32, 18
    img = new(W, H)
    d = draw(img)
    r = random.Random(3)
    base = 5  # the platform's top edge lines up with this row
    g = GRASS_V2
    rect(d, 0, base, W, 7, g[4])
    rect(d, 0, base, W, 2, g[5])
    rect(d, 0, base + 5, W, 2, g[3])
    for x in range(W):  # light dither at the top of the band
        if (x * 7) % 3 == 0:
            px(img, x, base + 2, g[5])
        if (x * 5) % 4 == 0:
            px(img, x, base + 4, g[3])
    # hanging fringe (wraps)
    x = 0
    while x < W:
        w = r.choice((2, 3, 3, 4))
        h = r.choice((1, 2, 3, 4, 5))
        for xx in (x, x - W):
            rect(d, xx, base + 7, w, h, g[3])
            rect(d, xx + w - 1, base + 7, 1, h, g[2])
            rect(d, xx + 1, base + 7 + h, max(1, w - 2), 1, g[1])
        x += w + r.choice((0, 1, 1, 2))
    # blades on top: light tips, a few long ones
    for x in range(W):
        h = r.choice((0, 1, 1, 2, 2, 3, 4))
        if h:
            rect(d, x, base - h, 1, h, g[5] if r.random() < 0.5 else g[6])
            if h > 2:
                px(img, x, base - h, g[7])
    # clover / light flecks, tiny daisies and buttercups
    for _ in range(9):
        px(img, r.randrange(W), r.randrange(base + 1, base + 5), g[6])
    for _ in range(2):
        x = r.randrange(1, W - 1)
        px(img, x - 1, base - 2, rgb('ffffff')); px(img, x + 1, base - 2, rgb('ffffff'))
        px(img, x, base - 3, rgb('ffffff')); px(img, x, base - 1, rgb('ffffff'))
        px(img, x, base - 2, rgb('f2c94b'))
    x = r.randrange(1, W - 1)
    px(img, x, base - 2, rgb('ffd83a')); px(img, x + 1, base - 2, rgb('f0b62c'))
    return keep('tile-grass-top', img)



def tile_gravel_top():
    """Gravel path surface with a stone kerb shadow."""
    W, H = 32, 10
    img = new(W, H)
    d = draw(img)
    rect(d, 0, 2, W, 6, GRAVEL[2])
    rect(d, 0, 2, W, 1, GRAVEL[4])
    rect(d, 0, 8, W, 2, STONE_V2[1])
    r = random.Random(6)
    for _ in range(26):  # pebbles: light top, dark under
        x, y = r.randrange(W), r.randrange(3, 7)
        px(img, x, y, GRAVEL[4]); px(img, (x + 1) % W, y, GRAVEL[3]); px(img, x, y + 1, GRAVEL[0])
    for x in range(0, W, 2):
        if r.random() < 0.55:
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
    """Climbing roses / leafy creeper with flowers dotted on it (drawn into img in place)."""
    puffs = []
    for _ in range(int(rx * ry / 6) + 4):
        a = r.uniform(0, math.tau)
        dist = math.sqrt(r.random())
        puffs.append((x + math.cos(a) * rx * dist, y + math.sin(a) * ry * dist, r.uniform(2.6, 4.4)))
    leaves = canopy(new(img.width, img.height), puffs, LEAVES, seed=r.randint(0, 9999), crease=False)
    for _ in range(int(rx * ry * density / 4)):
        fx = x + r.uniform(-rx, rx) * 0.9
        fy = y + r.uniform(-ry, ry) * 0.9
        if 0 <= int(fx) < img.width and 0 <= int(fy) < img.height and leaves.getpixel((int(fx), int(fy)))[3]:
            px(leaves, fx, fy, flowers[1])
            px(leaves, fx + 1, fy, flowers[2])
            px(leaves, fx, fy + 1, flowers[0])
    img.alpha_composite(leaves)



def window(d, img, x, y, w, h):
    rect(d, x - 2, y - 2, w + 4, h + 4, WALL[0])
    rect(d, x, y, w, h, rgb('2f3b48'))
    # sky reflection: a couple of light diagonal streaks inside the glass
    for k in range(7, w, 9):
        line(d, [(x + k, y + 1), (x + k - 6, y + 7)], rgb('6f8ea8'))
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
    """The treehouse: tree, cabin, deck and ladder (treehouse) + the canopy behind it (treehouse-leaves)."""
    W, H = 220, 280
    img = new(W, H)
    d = draw(img)
    r = random.Random(40)
    deck = 150  # deck surface row
    tree_trunk(d, img, W, H - 1, 115, 70, r, width=40)
    for (x0, y0, x1, y1, w) in ((104, 90, 54, 52, 7), (122, 84, 176, 46, 7), (124, 100, 204, 92, 5)):
        line(d, [(x0, y0), (x1, y1)], BARK_V2[2], w)
        line(d, [(x0 + 2, y0 + 1), (x1 + 2, y1 + 1)], BARK_V2[1], max(1, w // 3))
    # cabin
    cab_x, cab_w, cab_top = 50, 112, 82
    planks = ramp('5a3a22', '76502e', '8e623a', 'a57849', 'bd9160')
    rect(d, cab_x, cab_top, cab_w, deck - cab_top, planks[2])
    for y in range(cab_top, deck, 6):
        rect(d, cab_x, y, cab_w, 1, planks[1])
        rect(d, cab_x, y + 1, cab_w, 1, planks[3])
    for x in range(cab_x + 5, cab_x + cab_w, 14):
        px(img, x, cab_top + 4, planks[0]); px(img, x + 6, cab_top + 10, planks[0])
    rect(d, cab_x + cab_w - 10, cab_top, 10, deck - cab_top, planks[1])  # shaded side
    rect(d, cab_x + 60, cab_top + 18, 26, deck - cab_top - 18, rgb('24160c'))   # doorway
    rect(d, cab_x + 63, cab_top + 24, 20, 30, rgb('3a2614'))
    rect(d, cab_x + 66, cab_top + 27, 8, 11, rgb('ffd77a'))                     # lamp glow inside
    rect(d, cab_x + 67, cab_top + 28, 6, 9, rgb('fff1b8'))
    rect(d, cab_x + 14, cab_top + 18, 22, 18, rgb('24160c'))                    # window
    rect(d, cab_x + 16, cab_top + 20, 18, 14, rgb('6d93ad'))
    rect(d, cab_x + 16, cab_top + 20, 18, 3, rgb('a9c8dc'))
    rect(d, cab_x + 24, cab_top + 20, 2, 14, planks[3])
    # tarp roof with folds
    tarp = ramp('1f2533', '2a3142', '374055', '485370')
    poly(d, [(cab_x - 14, cab_top + 6), (cab_x + 34, cab_top - 30), (cab_x + cab_w - 10, cab_top - 30),
             (cab_x + cab_w + 16, cab_top + 6)], tarp[1])
    poly(d, [(cab_x - 14, cab_top + 6), (cab_x + 34, cab_top - 30), (cab_x + 44, cab_top - 26), (cab_x - 2, cab_top + 6)], tarp[3])
    for k in range(1, 5):
        x = cab_x - 14 + k * 30
        line(d, [(x, cab_top + 5), (x + 20, cab_top - 28)], tarp[2])
    for k in range(5):
        x = cab_x - 14 + k * 30
        d.chord((x, cab_top + 2, x + 30, cab_top + 12), 0, 180, fill=(*tarp[1], 255))
    # deck + railing
    rect(d, 20, deck, 176, 8, planks[3])
    rect(d, 20, deck, 176, 2, planks[4])
    rect(d, 20, deck + 6, 176, 2, planks[0])
    for x in range(22, 196, 9):
        rect(d, x, deck - 22, 3, 22, planks[2])
        rect(d, x, deck - 22, 1, 22, planks[4])
        rect(d, x + 2, deck - 22, 1, 22, planks[1])
    rect(d, 20, deck - 24, 176, 4, planks[3])
    rect(d, 20, deck - 24, 176, 1, planks[4])
    line(d, [(30, deck + 8), (100, deck + 52)], planks[1], 4)
    line(d, [(186, deck + 8), (136, deck + 52)], planks[1], 4)
    # red paw flag on the railing
    rect(d, 120, deck - 22, 22, 26, RED[2])
    rect(d, 120, deck - 22, 22, 2, RED[3])
    rect(d, 140, deck - 22, 2, 26, RED[1])
    disc(d, 131, deck - 6, 3, rgb('ffffff'))
    for x, y in ((126, deck - 12), (129, deck - 14), (133, deck - 14), (136, deck - 12)):
        px(img, x, y, rgb('ffffff')); px(img, x, y + 1, rgb('ffffff'))
    # bunting along the roof edge
    for k in range(9):
        x = cab_x - 8 + k * 14
        poly(d, [(x, cab_top + 8), (x + 8, cab_top + 8), (x + 4, cab_top + 14)], [RED[2], rgb('f2c94b'), BLUE[2]][k % 3])
    # ladder
    lx = 66
    rect(d, lx, deck + 8, 3, H - deck - 9, planks[2])
    rect(d, lx + 16, deck + 8, 3, H - deck - 9, planks[2])
    for y in range(deck + 16, H - 2, 12):
        rect(d, lx, y, 19, 3, planks[3])
        rect(d, lx, y + 2, 19, 1, planks[0])
    img = outline(img, OUTLINE)
    keep('treehouse', img)
    back = new(W, H)
    puffs = [(60, 62, 34), (110, 34, 34), (156, 52, 36), (196, 92, 24), (24, 108, 24), (90, 70, 30), (140, 80, 30),
             (186, 128, 20), (34, 76, 24)]
    back = canopy(back, puffs, LEAVES, seed=40)
    back = outline(back, rgb('14290f'))
    keep('treehouse-leaves', back)



def big_tree():
    """A big garden tree: trunk and branches (big-tree) + a canopy that sways (big-tree-leaves)."""
    W, H = 200, 250
    img = new(W, H)
    d = draw(img)
    r = random.Random(44)
    tree_trunk(d, img, W, H - 1, 100, 96, r, width=32)
    for (x0, y0, x1, y1, w) in ((96, 120, 46, 68, 7), (106, 112, 158, 62, 7), (100, 100, 100, 40, 6), (104, 140, 176, 116, 4)):
        line(d, [(x0, y0), (x1, y1)], BARK_V2[2], w)
        line(d, [(x0 + 2, y0 + 1), (x1 + 2, y1 + 1)], BARK_V2[1], max(1, w // 3))
    img = outline(img, OUTLINE)
    keep('big-tree', img)
    leaves = new(W, H)
    puffs = [(100, 34, 30), (64, 52, 30), (138, 50, 32), (36, 82, 26), (84, 78, 34), (128, 82, 32), (168, 84, 25),
             (58, 108, 24), (104, 112, 28), (148, 112, 24), (100, 60, 26)]
    leaves = canopy(leaves, puffs, LEAVES, seed=44)
    leaves = outline(leaves, rgb('14290f'))
    keep('big-tree-leaves', leaves)



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
    r = random.Random(sum(map(ord, name)))
    img = canopy(img, [(14, 10, 8), (9, 12, 6), (19, 12, 6)], LEAVES, seed=sum(map(ord, name)))
    for _ in range(16):
        x, y = 14 + r.uniform(-10, 10), 9 + r.uniform(-8, 6)
        if img.getpixel((int(x), int(y)))[3]:
            px(img, x, y, petals[1]); px(img, x + 1, y, petals[2]); px(img, x, y + 1, petals[0])
    d = draw(img)
    poly(d, [(6, 17), (22, 17), (20, H - 1), (8, H - 1)], TERRACOTTA[2])
    poly(d, [(15, 17), (22, 17), (20, H - 1), (16, H - 1)], TERRACOTTA[1])
    rect(d, 5, 16, 18, 3, TERRACOTTA[3])
    rect(d, 5, 16, 18, 1, rgb('e9a876'))
    img = outline(img, OUTLINE)
    return keep(name, img)



def bush(name, flowers=None, berries=False, w=64, h=40):
    img = new(w, h)
    r = random.Random(sum(map(ord, name)))
    puffs = []
    for _ in range(6):
        puffs.append((w / 2 + r.uniform(-w * 0.28, w * 0.28), h * 0.6 + r.uniform(-h * 0.18, h * 0.12), r.uniform(h * 0.24, h * 0.34)))
    puffs.append((w / 2, h * 0.45, h * 0.32))
    img = canopy(img, puffs, LEAVES, seed=sum(map(ord, name)))
    d = draw(img)
    if flowers:
        # big flower heads: a lit top and a shaded bottom
        for _ in range(9):
            x, y = w / 2 + r.uniform(-w * 0.34, w * 0.34), h * 0.5 + r.uniform(-h * 0.28, h * 0.2)
            if img.getpixel((int(x), int(y)))[3]:
                disc(d, x, y, 3.2, flowers[1])
                disc(d, x - 0.8, y - 0.8, 1.8, flowers[3])
                px(img, x + 1, y + 2, flowers[0]); px(img, x + 2, y + 1, flowers[0])
                px(img, x - 1, y - 1, rgb('ffffff'))
    if berries:
        for _ in range(24):
            x, y = w / 2 + r.uniform(-w * 0.4, w * 0.4), h * 0.55 + r.uniform(-h * 0.35, h * 0.3)
            if img.getpixel((int(x), int(y)))[3]:
                disc(d, x, y, 1.2, RED[2]); px(img, x - 1, y - 1, RED[3])
    img = outline(img, rgb('14290f'))
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
    """Red squirrel: sitting (tail flick on frames 0-2) and running (frames 3-4)."""
    W, H = 26, 22
    fur, dark, light, belly = rgb('c4622a'), rgb('8e3f17'), rgb('e8935a'), rgb('f2d6b4')
    frames = []

    def body(d, img, sit=True, tail_up=0, run=0):
        if sit:
            # bushy tail curling up behind
            d.ellipse((1, 2 - tail_up, 12, 19 - tail_up), fill=(*fur, 255))
            d.ellipse((3, 4 - tail_up, 10, 15 - tail_up), fill=(*light, 255))
            px(img, 2, 10 - tail_up, dark); px(img, 1, 12 - tail_up, dark)
            d.ellipse((9, 8, 19, 21), fill=(*fur, 255))
            d.ellipse((12, 12, 18, 20), fill=(*belly, 255))
            disc(d, 18, 7, 4, fur)
            px(img, 20, 6, rgb('101010')); px(img, 21, 8, rgb('3a2014'))
            poly(d, [(16, 3), (17, 0), (18, 3)], dark)
            rect(d, 15, 13, 3, 2, fur)  # paws held up
            rect(d, 10, H - 2, 9, 2, dark)
        else:
            # running: stretched body, tail streaming behind
            d.ellipse((0, 6, 11, 13), fill=(*fur, 255))
            d.ellipse((2, 7, 9, 11), fill=(*light, 255))
            d.ellipse((8, 9, 20, 17), fill=(*fur, 255))
            disc(d, 20, 10, 3.5, fur)
            px(img, 22, 9, rgb('101010'))
            poly(d, [(19, 7), (20, 4), (21, 7)], dark)
            if run:
                rect(d, 9, 16, 3, 4, dark); rect(d, 16, 16, 3, 4, dark)
            else:
                rect(d, 11, 16, 3, 4, dark); rect(d, 14, 16, 3, 4, dark)

    for spec in ((True, 0, 0), (True, 2, 0), (True, 4, 0), (False, 0, 0), (False, 0, 1)):
        img = new(W, H)
        body(draw(img), img, *spec)
        frames.append(outline(img, OUTLINE))
    return keep_sheet('squirrel', frames, fps=8)



def flowers():
    """A clump of daisies and bluebells that sways in the breeze (4 frames)."""
    W, H = 40, 18
    r = random.Random(60)
    stems = []
    for _ in range(15):
        x = r.uniform(3, W - 3)
        hgt = r.uniform(6, 14)
        kind = r.choice(['daisy', 'daisy', 'blue', 'yellow'])
        stems.append((x, hgt, kind, r.uniform(0, math.tau)))
    frames = []
    for f in range(4):
        img = new(W, H)
        d = draw(img)
        sway = math.sin(f / 4 * math.tau)
        for x, hgt, kind, ph in sorted(stems, key=lambda s: -s[1]):
            bend = sway * hgt / 14 * 1.6 + math.sin(ph) * 0.4
            tip = (x + bend, H - hgt)
            line(d, [(x, H - 1), (x + bend * 0.5, H - hgt * 0.55), tip], LEAVES[3])
            px(img, x + bend * 0.3 - 1, H - hgt * 0.35, LEAVES[4])
            cx, cy = tip
            if kind == 'daisy':
                for ox, oy in ((0, -1), (-1, 0), (1, 0), (0, 1)):
                    px(img, cx + ox, cy + oy, rgb('ffffff'))
                px(img, cx, cy, rgb('f2c94b'))
            elif kind == 'blue':
                px(img, cx, cy, rgb('6a7fd8')); px(img, cx, cy + 1, rgb('4d5fb8')); px(img, cx + 1, cy + 1, rgb('8fa2ea'))
            else:
                px(img, cx, cy, rgb('ffd83a')); px(img, cx + 1, cy, rgb('f0b62c')); px(img, cx, cy - 1, rgb('fff09a'))
        frames.append(img)
    return keep_sheet('flowers', frames, fps=3, yoyo=True)



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



BARK_V2 = ramp('2e1c10', '432a18', '5a3a22', '73502f', '8d683f', 'a8835a')






LEAVES = ramp('163319', '1e461d', '2b5e25', '3a7530', '4f8f38', '6aab42', '8fc752', 'b8e070')



LEAVES_FAR = ramp('2f5a44', '3b6a4d', '497b55', '5a8c5d', '6e9f66', '86b373', '9fc684')



STONE_V2 = ramp('4a453d', '5f594e', '777062', '8f8876', 'a8a08b', 'c0b8a0', 'd8d1b9', 'ebe6d2')



GRASS_V2 = ramp('24501a', '2f6420', '3d7a27', '4f9330', '66ab3a', '84c247', 'a8d95a', 'cdee82')



SOIL = ramp('3a2112', '4d2d18', '613a20', '764a2a', '8b5b34', 'a06e40')



def tile_grass_cap():
    """Rounded end of a grassy ledge (left end; the game flips it for the right end)."""
    W, H = 10, 30
    img = new(W, H)
    d = draw(img)
    g = GRASS_V2
    base = 5
    # rounded overhang: the grass band curls down over the corner
    for y in range(base, base + 7):
        inset = max(0, 3 - (y - base)) if y < base + 3 else 0
        rect(d, 3 + inset, y, W - 3 - inset, 1, g[4] if y < base + 5 else g[3])
    rect(d, 4, base, W - 4, 1, g[5])
    px(img, 3, base + 1, g[5])
    # tufts hanging down the side
    for x, h in ((3, 9), (4, 14), (5, 7), (6, 11), (7, 5), (8, 9)):
        rect(d, x, base + 6, 1, h, g[3] if x % 2 else g[2])
        px(img, x, base + 6 + h, g[1])
    # blades and a dark edge on the outside
    for x, h in ((4, 2), (6, 3), (8, 1), (9, 2)):
        rect(d, x, base - h, 1, h, g[6])
    for y in range(base + 2, base + 18):
        if img.getpixel((3, y))[3] or img.getpixel((4, y))[3]:
            px(img, 2, y, g[1])
    return keep('tile-grass-cap', img)



def fx_images():
    """Soft shapes the game uses for light and shadow."""
    keep('fx-shadow', soft_ellipse(32, 8, (12, 20, 8), 200))
    # a dark band laid over the top of soil/walls, under the grass (shade from the overhang)
    import numpy as np
    from PIL import Image
    H = 14
    a = np.zeros((H, 4, 4), dtype=np.uint8)
    for y in range(H):
        t = (1 - y / H) ** 1.6
        a[y, :, 3] = int(t * 120)
    keep('fx-shade-top', Image.fromarray(a))
    # sunbeams: slanted soft bands, brightest at the top
    W, Hh = 240, 270
    yy, xx = np.mgrid[0:Hh, 0:W]
    beams = np.zeros((Hh, W), dtype=np.float32)
    for cx, width, strength in ((190, 22, 1.0), (140, 12, 0.7), (95, 30, 0.55), (230, 10, 0.6), (40, 16, 0.4)):
        dist = np.abs((xx - cx) + (yy * 0.55))  # slanting down to the left
        beams += np.clip(1 - dist / width, 0, 1) ** 1.5 * strength
    fade = np.clip(1 - yy / Hh, 0, 1) ** 1.2
    v = np.clip(beams * fade, 0, 1)
    v = np.clip(v + (BAYER4[yy % 4, xx % 4] - 0.5) * 0.12, 0, 1)
    b = np.zeros((Hh, W, 4), dtype=np.uint8)
    b[:, :, 0], b[:, :, 1], b[:, :, 2] = 255, 244, 205
    b[:, :, 3] = (v * 150).astype(np.uint8)
    keep('fx-sunrays', Image.fromarray(b))
    # vignette: corners gently darker (stretched over the whole screen)
    Wv, Hv = 160, 90
    yy, xx = np.mgrid[0:Hv, 0:Wv]
    rr = np.hypot((xx + 0.5 - Wv / 2) / (Wv / 2), (yy + 0.5 - Hv / 2) / (Hv / 2))
    v = np.clip((rr - 0.75) / 0.7, 0, 1) ** 1.6
    vg = np.zeros((Hv, Wv, 4), dtype=np.uint8)
    vg[:, :, :3] = (20, 28, 16)
    vg[:, :, 3] = (v * 70).astype(np.uint8)
    keep('fx-vignette', Image.fromarray(vg))
    # a tiny warm speck for pollen / dust in the light
    s = new(2, 2)
    rect(draw(s), 0, 0, 2, 2, rgb('fff3c0'))
    keep('fx-mote', s)



def tree_trunk(d, img, W, H, cx, top, r, width=30):
    """A trunk with roots and shaded bark, from the ground up to `top`."""
    b = BARK_V2
    poly(d, [(cx - width * 0.5, H), (cx - width * 0.32, top), (cx + width * 0.32, top), (cx + width * 0.55, H)], b[2])
    poly(d, [(cx + width * 0.12, H), (cx + width * 0.12, top), (cx + width * 0.32, top), (cx + width * 0.55, H)], b[1])
    poly(d, [(cx - width * 0.5, H), (cx - width * 0.32, top), (cx - width * 0.18, top), (cx - width * 0.3, H)], b[3])
    for k in range(int(width * 0.8)):  # bark lines
        x = cx - width * 0.4 + r.uniform(0, width * 0.85)
        y0 = r.uniform(top + 4, H - 20)
        line(d, [(x, y0), (x + r.choice((-1, 0, 1)), y0 + r.uniform(8, 22))], r.choice((b[0], b[1], b[4])))
    # roots
    poly(d, [(cx - width * 1.1, H), (cx - width * 0.45, H - 14), (cx - width * 0.3, H)], b[2])
    poly(d, [(cx + width * 1.1, H), (cx + width * 0.45, H - 12), (cx + width * 0.3, H)], b[1])
    poly(d, [(cx - 3, H), (cx + 2, H - 8), (cx + 8, H)], b[2])



def tall_grass():
    """A tuft of long grass that waves in the wind (4 frames)."""
    W, H = 26, 22
    r = random.Random(61)
    blades = [(r.uniform(3, W - 3), r.uniform(8, 20), r.uniform(-1.5, 1.5), r.choice(GRASS_V2[3:7])) for _ in range(16)]
    frames = []
    for f in range(4):
        img = new(W, H)
        d = draw(img)
        sway = math.sin(f / 4 * math.tau)
        for x, hgt, lean, col in sorted(blades, key=lambda b: -b[1]):
            bend = lean + sway * hgt / 20 * 2.2
            line(d, [(x, H - 1), (x + bend * 0.4, H - hgt * 0.5), (x + bend, H - hgt)], col)
            px(img, x + bend, H - hgt, GRASS_V2[7] if hgt > 14 else col)
        rect(d, 4, H - 2, W - 8, 2, GRASS_V2[2])
        frames.append(img)
    return keep_sheet('tall-grass', frames, fps=3, yoyo=True)



def washing_line():
    """A washing line between two T-posts with clothes flapping in the breeze (4 frames)."""
    W, H = 150, 90
    frames = []
    post = ramp('5c5c63', '7a7a82', '9a9aa2')
    clothes = [  # x, width, height, colour ramp
        (22, 26, 34, ramp('c9ccd2', 'e8eaee', 'ffffff')),   # sheet
        (56, 18, 18, ramp('9e2020', 'c93030', 'e85050')),   # red t-shirt
        (80, 16, 20, ramp('2a4f99', '3a6bc4', '5e8ee0')),   # blue shirt
        (102, 8, 10, ramp('c99a1e', 'e8bd3a', 'f6d870')),   # yellow sock
        (114, 8, 10, ramp('2f8a4a', '3fa85c', '64c47c')),   # green sock
    ]
    for f in range(4):
        img = new(W, H)
        d = draw(img)
        for x in (6, W - 8):
            rect(d, x, 10, 3, H - 10, post[1])
            rect(d, x + 2, 10, 1, H - 10, post[0])
            rect(d, x - 4, 9, 11, 3, post[1])
        wave = math.sin(f / 4 * math.tau)
        sag = lambda x: 12 + 6 * math.sin(math.pi * (x - 8) / (W - 16))
        line(d, [(x, sag(x)) for x in range(8, W - 6, 4)], rgb('e8e8e8'))
        for i, (x, w, h, c) in enumerate(clothes):
            top = sag(x + w / 2)
            sw = wave * (1.5 + h / 12) * (1 if i % 2 else -1)
            pts = [(x, top), (x + w, top), (x + w + sw, top + h), (x + sw * 0.6, top + h + 1)]
            poly(d, pts, c[1])
            poly(d, [(x + w * 0.6, top), (x + w, top), (x + w + sw, top + h), (x + w * 0.6 + sw, top + h)], c[0])
            line(d, [(x + 1, top + 1), (x + w - 1, top + 1)], c[2])
            if i == 1 or i == 2:  # sleeves
                poly(d, [(x - 4, top + 2), (x, top), (x, top + 6), (x - 3 + sw * 0.3, top + 7)], c[1])
                poly(d, [(x + w, top), (x + w + 4, top + 2), (x + w + 3 + sw * 0.3, top + 7), (x + w, top + 6)], c[0])
            for pegx in (x + 2, x + w - 3):
                rect(d, pegx, top - 2, 1, 4, rgb('c9a46a'))
        frames.append(outline(img, OUTLINE))
    return keep_sheet('washing-line', frames, fps=4, yoyo=True)



def bird_bath():
    """A stone bird bath with water that glints (2 frames)."""
    W, H = 40, 44
    frames = []
    for f in range(2):
        img = new(W, H)
        d = draw(img)
        s = STONE_V2
        rect(d, 10, H - 6, 20, 6, s[3]); rect(d, 10, H - 6, 20, 1, s[5])
        poly(d, [(15, H - 6), (17, 18), (23, 18), (25, H - 6)], s[4])
        poly(d, [(21, H - 6), (21, 18), (23, 18), (25, H - 6)], s[2])
        d.ellipse((2, 10, W - 3, 22), fill=(*s[4], 255))
        d.ellipse((2, 15, W - 3, 24), fill=(*s[2], 255))
        d.ellipse((6, 11, W - 7, 17), fill=(*rgb('5fa8d8'), 255))
        rect(d, 9 + f * 9, 13, 5, 1, rgb('d8f1ff'))
        px(img, 25 - f * 8, 14, rgb('ffffff'))
        frames.append(outline(img, OUTLINE))
    return keep_sheet('bird-bath', frames, fps=1.5)



def gnome():
    """A garden gnome with a red hat and a fishing rod."""
    W, H = 24, 34
    img = new(W, H)
    d = draw(img)
    rect(d, 6, H - 4, 12, 4, rgb('3a3a40'))                 # boots
    poly(d, [(5, H - 4), (7, 16), (17, 16), (19, H - 4)], rgb('2f5fb5'))   # coat
    poly(d, [(12, H - 4), (12, 16), (17, 16), (19, H - 4)], rgb('254a8f'))
    rect(d, 5, 24, 14, 2, rgb('5a3a20'))                    # belt
    rect(d, 11, 24, 2, 2, rgb('e8c23a'))
    disc(d, 12, 13, 5, rgb('f2c7a5'))                        # face
    poly(d, [(6, 14), (18, 14), (15, 24), (12, 26), (9, 24)], rgb('f6f6f2'))   # beard
    px(img, 10, 12, rgb('202020')); px(img, 14, 12, rgb('202020'))
    disc(d, 12, 14, 1.5, rgb('e8a08c'))                      # nose
    poly(d, [(5, 11), (19, 11), (13, 0), (11, 1)], rgb('d23434'))          # hat
    poly(d, [(12, 11), (19, 11), (13, 0)], rgb('a82020'))
    line(d, [(18, 22), (23, 4)], rgb('8a6a40'))              # rod
    line(d, [(23, 4), (23, 16)], rgb('e8e8e8'))
    return keep('gnome', outline(img, OUTLINE))



def robin():
    """A robin: idle, pecking, hopping, and two flying frames."""
    W, H = 16, 14
    brown, dark, red, white = rgb('7a5a3a'), rgb('4e3824'), rgb('e0582a'), rgb('efe6d6')
    frames = []
    for pose in ('idle', 'peck', 'hop', 'fly1', 'fly2'):
        img = new(W, H)
        d = draw(img)
        head = (11, 4) if pose != 'peck' else (12, 7)
        d.ellipse((3, 4, 12, 11), fill=(*brown, 255))           # body
        d.ellipse((7, 6, 12, 11), fill=(*red, 255))             # red breast
        d.ellipse((6, 9, 11, 12), fill=(*white, 255))
        poly(d, [(3, 6), (0, 4), (1, 8)], dark)                  # tail
        disc(d, head[0], head[1], 2.6, brown)
        disc(d, head[0] + 1, head[1] + 1, 1.6, red)
        px(img, head[0] + 1, head[1] - 1, rgb('101010'))
        poly(d, [(head[0] + 2, head[1]), (head[0] + 5, head[1] + 1), (head[0] + 2, head[1] + 1)], rgb('3a2a1a'))
        if pose in ('idle', 'peck'):
            rect(d, 7, 11, 1, 3, dark); rect(d, 9, 11, 1, 3, dark)
        elif pose == 'hop':
            rect(d, 7, 11, 1, 2, dark); rect(d, 9, 11, 1, 2, dark)
        if pose == 'fly1':
            poly(d, [(5, 5), (8, 0), (10, 5)], dark)
        elif pose == 'fly2':
            poly(d, [(5, 7), (8, 12), (10, 7)], dark)
        else:
            poly(d, [(4, 6), (9, 7), (5, 9)], dark)               # folded wing
        frames.append(outline(img, rgb('2a1c12')))
    return keep_sheet('robin', frames, fps=10)



def butterfly():
    """A butterfly flapping (4 frames). Drawn pale so the game can tint it any colour."""
    W, H = 10, 8
    frames = []
    for open_ in (1.0, 0.65, 0.25, 0.65):
        img = new(W, H)
        d = draw(img)
        wx = 4 * open_ + 0.5
        d.ellipse((5 - wx, 1, 5, 5), fill=(255, 255, 255, 255))
        d.ellipse((5, 1, 5 + wx, 5), fill=(255, 255, 255, 255))
        d.ellipse((5 - wx * 0.7, 4, 5, 7), fill=(225, 225, 225, 255))
        d.ellipse((5, 4, 5 + wx * 0.7, 7), fill=(225, 225, 225, 255))
        rect(d, 4, 2, 2, 5, rgb('2a2420'))
        px(img, 3, 1, rgb('2a2420')); px(img, 6, 1, rgb('2a2420'))
        if open_ > 0.5:
            px(img, 2, 3, rgb('3a3430')); px(img, 7, 3, rgb('3a3430'))
        frames.append(img)
    return keep_sheet('butterfly', frames, fps=14)



def leaf():
    """A falling leaf turning over (4 frames)."""
    frames = []
    cols = ramp('3a7530', '5a9a36', '8fc752')
    for f in range(4):
        img = new(7, 7)
        d = draw(img)
        if f == 0:
            poly(d, [(0, 3), (3, 0), (6, 3), (3, 6)], cols[1]); line(d, [(1, 3), (5, 3)], cols[0])
        elif f == 1:
            poly(d, [(1, 5), (2, 1), (5, 1), (4, 5)], cols[2]); line(d, [(2, 4), (4, 2)], cols[1])
        elif f == 2:
            rect(d, 0, 3, 7, 2, cols[0])
        else:
            poly(d, [(1, 1), (5, 2), (5, 5), (2, 5)], cols[1]); line(d, [(2, 2), (4, 4)], cols[0])
        frames.append(img)
    return keep_sheet('leaf', frames, fps=6)



def bird_far():
    """A tiny far-away bird flapping (2 frames)."""
    frames = []
    for up in (True, False):
        img = new(7, 4)
        d = draw(img)
        c = rgb('3a4450')
        if up:
            line(d, [(0, 0), (3, 2), (6, 0)], c)
        else:
            line(d, [(0, 2), (3, 1), (6, 2)], c)
            px(img, 3, 2, c)
        frames.append(img)
    return keep_sheet('bird-far', frames, fps=6)


# =================================================================================
# Teamwork things: the hedge with its garden door, a lever, the basket lift
# =================================================================================

HEDGE = ramp('12290f', '183617', '20461d', '2b5a24', '386f2c', '488535', '5d9c40', '79b54e')


def hedge_arch():
    """A tall clipped hedge with an arched opening for the garden door (the door is separate)."""
    W, H = 52, 150
    a = np.zeros((H, W, 4), dtype=np.uint8)
    yy, xx = np.mgrid[0:H, 0:W]
    top = 5 + (np.sin(xx * 0.9) * 0.8 + np.sin(xx * 0.37 + 1) * 0.9).round().astype(int)   # slightly bumpy clipped top
    solid = yy >= top
    # opening: 32 wide, 78 tall with a round top
    ox, ow, oh = 10, 32, 78
    r = ow / 2
    cx, cy = ox + r - 0.5, H - oh + r
    opening = ((xx >= ox) & (xx < ox + ow) & (yy >= cy)) | (np.hypot(xx - cx, yy - cy) <= r)
    # light from the upper left: lit top band, darker towards the bottom and the right edge
    t = 0.72 - (yy - top) / H * 0.42 - xx / W * 0.22
    t += np.where(yy - top < 4, 0.22, 0)          # the flat clipped top catches the sun
    t -= np.where(xx > W - 5, 0.18, 0)            # shaded right side
    t += np.where(xx < 3, 0.1, 0)
    # around the arch: a shadowed rim inside the opening's edge
    rim = (~opening) & (np.hypot(xx - cx, np.minimum(yy, cy) - cy) <= r + 3) & (yy > H - oh - 3)
    t -= np.where(rim, 0.12, 0)
    idx = dither_index(np.clip(t, 0, 1), xx, yy, len(HEDGE), strength=0.7)
    cols = np.array(HEDGE, dtype=np.uint8)[idx]
    a[solid, :3] = cols[solid]
    a[solid, 3] = 255
    # the opening: dark leafy tunnel, a little lighter at the far end (the garden beyond)
    ti = 0.08 + np.clip((yy - (H - oh)) / oh, 0, 1) * 0.22 + np.where(np.abs(xx - cx) < 9, 0.06, 0)
    ii = dither_index(np.clip(ti, 0, 1), xx, yy, len(HEDGE), strength=0.6)
    inner = np.array(HEDGE, dtype=np.uint8)[ii]
    a[opening & solid, :3] = inner[opening & solid]
    img = Image.fromarray(a)
    img = leaf_clumps(img, HEDGE, 77, spacing=3.2)
    d = draw(img)
    rng = random.Random(78)
    # a few white roses climbing the hedge
    for _ in range(18):
        x, y = rng.uniform(3, W - 4), rng.uniform(10, H - oh - 6)
        if rng.random() < 0.45:
            x = rng.choice((rng.uniform(2, 9), rng.uniform(W - 10, W - 3)))
            y = rng.uniform(10, H - 8)
        if img.getpixel((int(x), int(y)))[3] and not opening[int(y), int(x)]:
            disc(d, x, y, 1.6, rgb('f6f1e4'))
            px(img, x - 1, y - 1, rgb('ffffff'))
            px(img, x + 1, y + 1, rgb('d8cfc0'))
            px(img, x, y, rgb('f2d36b'))
    img = outline(img, LEAF_OUTLINE)
    return keep('hedge-arch', img)


def garden_gate():
    """The arched wooden garden door that fills the hedge opening: closed, and swung open (2 frames)."""
    W, H = 32, 78
    r = W / 2
    cy = r
    planks = ramp('3d2414', '573620', '70482a', '8a5d36', 'a57446', 'bd8c58')
    frames = []
    # closed
    img = new(W, H)
    a = np.zeros((H, W, 4), dtype=np.uint8)
    yy, xx = np.mgrid[0:H, 0:W]
    shape = ((yy >= cy) & (xx >= 0) & (xx < W)) | (np.hypot(xx - (r - 0.5), yy - cy) <= r - 0.3)
    plank = (xx // 5) % 2
    t = 0.55 + plank * 0.1 - yy / H * 0.18 + np.where(xx % 5 == 0, -0.25, 0)
    t += np.where(xx % 5 == 1, 0.1, 0)
    idx = dither_index(np.clip(t, 0, 1), xx, yy, len(planks), strength=0.5)
    cols = np.array(planks, dtype=np.uint8)[idx]
    a[shape, :3] = cols[shape]
    a[shape, 3] = 255
    img = Image.fromarray(a)
    d = draw(img)
    for y in (30, 60):  # ledges
        rect(d, 1, y, W - 2, 4, planks[3])
        rect(d, 1, y, W - 2, 1, planks[5])
        rect(d, 1, y + 3, W - 2, 1, planks[1])
    line(d, [(3, 58), (W - 4, 35)], planks[3], 3)   # diagonal brace
    line(d, [(3, 57), (W - 4, 34)], planks[5])
    iron, iron_hi = rgb('1d1d22'), rgb('5a5a66')
    for y in (31, 61):  # hinge straps
        rect(d, 0, y, 13, 2, iron)
        rect(d, 0, y, 13, 1, iron_hi)
        disc(d, 12, y + 0.5, 1.4, iron)
    d.ellipse((W - 9, 44, W - 4, 51), outline=(*iron, 255), width=1)   # ring latch
    rect(d, W - 8, 42, 3, 3, iron)
    px(img, W - 7, 42, iron_hi)
    img = outline(img, OUTLINE)
    frames.append(img)
    # open: swung towards us on its left hinges - a narrow sliver of door at the left side
    img = new(W, H)
    d = draw(img)
    poly(d, [(0, 10), (8, 16), (8, H - 1), (0, H - 1)], planks[2])
    poly(d, [(6, 15), (8, 16), (8, H - 1), (6, H - 1)], planks[1])
    poly(d, [(0, 10), (2, 11), (2, H - 1), (0, H - 1)], planks[4])
    for y in (31, 61):
        line(d, [(0, y), (8, y + 3)], planks[4], 2)
        line(d, [(0, y), (6, y + 2)], iron)
    img = outline(img, OUTLINE)
    frames.append(img)
    return keep_sheet('gate', frames, fps=1)


def lever():
    """A lever on a little wooden post: pushed left (off) and pulled right (on)."""
    W, H = 18, 30
    frames = []
    for on in (False, True):
        img = new(W, H)
        d = draw(img)
        # arm first, so the post covers its foot
        tip = (15, 5) if on else (3, 5)
        line(d, [(9, 19), tip], rgb('4a4a52'), 2)
        line(d, [(9, 18), (tip[0], tip[1] - 1)], rgb('9a9aa6'))
        disc(d, tip[0], tip[1], 2.6, RED[2])
        px(img, tip[0] - 1, tip[1] - 1, RED[3]); px(img, tip[0] - 1, tip[1] - 2, rgb('ffb0b0'))
        # post with a metal plate
        rect(d, 5, 17, 8, H - 17, WOOD[2])
        rect(d, 5, 17, 2, H - 17, WOOD[3])
        rect(d, 11, 17, 2, H - 17, WOOD[1])
        rect(d, 4, 16, 10, 3, rgb('6a6a74'))
        rect(d, 4, 16, 10, 1, rgb('a8a8b4'))
        disc(d, 9, 19, 1.5, rgb('2a2a30'))
        rect(d, 3, H - 2, 12, 2, WOOD[1])
        frames.append(outline(img, OUTLINE))
    return keep_sheet('lever', frames, fps=1)


WICKER = ramp('5a3a18', '7a5226', '9a6c36', 'b88a4c', 'd4a865', 'e8c48a')


def basket():
    """The lift basket: the front wall (drawn in front of whoever's in it) and the back with the rope handle."""
    W, H = 40, 18
    img = new(W, H)
    a = np.zeros((H, W, 4), dtype=np.uint8)
    yy, xx = np.mgrid[0:H, 0:W]
    inset = (yy / H * 2.5).round().astype(int)   # slightly narrower at the bottom
    shape = (xx >= inset) & (xx < W - inset)
    weave = ((yy // 2) + (xx // 3)) % 2
    t = 0.62 + weave * 0.12 - yy / H * 0.25 - np.where(xx % 6 == 0, 0.2, 0) - xx / W * 0.1
    t += np.where(yy < 3, 0.22, 0)   # rolled rim
    idx = dither_index(np.clip(t, 0, 1), xx, yy, len(WICKER), strength=0.45)
    cols = np.array(WICKER, dtype=np.uint8)[idx]
    a[shape, :3] = cols[shape]
    a[shape, 3] = 255
    img = Image.fromarray(a)
    d = draw(img)
    rect(d, 0, 0, W, 1, WICKER[5])
    rect(d, 0, 2, W, 1, WICKER[1])
    img = outline(img, OUTLINE)
    keep('basket', img)
    # back: the far rim, the inside, and the rope handle up to where the pulley rope ties on
    BW, BH = 40, 40
    back = new(BW, BH)
    d = draw(back)
    rect(d, 1, BH - 18, BW - 2, 17, WICKER[1])
    rect(d, 1, BH - 18, BW - 2, 2, WICKER[3])
    for x in range(3, BW - 2, 4):
        rect(d, x, BH - 15, 1, 13, WICKER[0])
    rope = rgb('d8c49a')
    line(d, [(3, BH - 18), (20, 2)], rope)
    line(d, [(BW - 4, BH - 18), (20, 2)], rope)
    line(d, [(4, BH - 18), (20, 3)], rgb('a08a60'))
    disc(d, 20, 2, 1.6, rgb('7a7a84'))
    back = outline(back, OUTLINE)
    return keep('basket-back', back)


def pulley():
    """The pulley the basket hangs from: a post (standing at the top stop) with an arm and a wheel."""
    W, H = 40, 84
    img = new(W, H)
    d = draw(img)
    w = WOOD
    rect(d, 2, 7, 5, H - 7, w[2])           # post
    rect(d, 2, 7, 2, H - 7, w[3])
    rect(d, 6, 7, 1, H - 7, w[1])
    rect(d, 0, H - 3, 9, 3, w[1])            # foot
    rect(d, 2, 5, 34, 4, w[2])               # arm
    rect(d, 2, 5, 34, 1, w[4])
    rect(d, 2, 8, 34, 1, w[0])
    line(d, [(6, 28), (20, 9)], w[2], 2)    # brace
    line(d, [(6, 27), (19, 9)], w[4])
    rect(d, 29, 9, 2, 3, rgb('3a3a42'))      # hanger
    rope = rgb('d8c49a')
    line(d, [(13, 40), (25, 13)], rope)      # rope from the winch up over the wheel
    line(d, [(14, 41), (26, 14)], rgb('a08a60'))
    disc(d, 30, 12, 5, rgb('3a3a42'))       # wheel
    disc(d, 30, 12, 3.5, rgb('7a7a86'))
    disc(d, 30, 12, 1.2, rgb('2a2a30'))
    px(img, 28, 9, rgb('c8c8d4')); px(img, 27, 10, rgb('a8a8b4'))
    # winch on the post: a drum wound with rope, and a crank handle
    rect(d, 7, 39, 9, 8, w[1])
    for y in range(40, 46, 2):
        rect(d, 7, y, 9, 1, rope)
    rect(d, 7, 39, 9, 1, w[3])
    rect(d, 16, 41, 2, 2, rgb('5a5a64'))
    line(d, [(17, 42), (20, 47)], rgb('5a5a64'), 2)
    rect(d, 19, 46, 3, 3, RED[2])
    img = outline(img, OUTLINE)
    return keep('pulley', img)


PROPS = [house, trampoline, stump, treehouse, big_tree, goal, football, egg_chair,
         lambda: flower_pot('pot-purple', ramp('5a3a90', '8c6ad0', 'c4adf5')),
         lambda: flower_pot('pot-pink', ramp('a03a6a', 'e06aa0', 'ffb0d0')),
         lambda: bush('bush'), lambda: bush('bush-hydrangea', flowers=[rgb('4a5fc0'), rgb('6f86e0'), rgb('9a7fd8'), rgb('b9c8ff')]),
         lambda: bush('bush-berries', berries=True, w=70, h=44), planter, drain, squirrel, flowers, fern,
         tall_grass, washing_line, bird_bath, gnome, robin, butterfly, leaf, bird_far,
         hedge_arch, garden_gate, lever, basket, pulley]


TILES = [bg_sky, bg_clouds, bg_far, bg_trees, bg_fence, tile_dirt, tile_stone, tile_grass_top, tile_grass_cap,
         tile_gravel_top, tile_wood, tile_slab, fx_images, bone, lambda: heart(True), lambda: heart(False), badges, portrait]


# Pictures that were drawn by hand (or made elsewhere) and saved over a generated one are
# kept: the script remembers a fingerprint of everything it wrote, and leaves any file that
# no longer matches alone. Run with --force to redraw everything anyway.
MANIFEST = os.path.join(ROOT, 'generated.json')


def fingerprint(path: str) -> str | None:
    import hashlib
    if not os.path.exists(path):
        return None
    return hashlib.sha1(open(path, 'rb').read()).hexdigest()


def main():
    import json
    force = '--force' in sys.argv
    for f in TILES + PROPS:
        f()
    written = json.load(open(MANIFEST)) if os.path.exists(MANIFEST) else {}
    kept = []
    for folder, items in ((OUT, ASSETS), (UI_OUT, UI)):
        for name, img in items:
            path = os.path.join(folder, f'{name}.png')
            rel = os.path.relpath(path, PROJECT).replace(os.sep, '/')
            current = fingerprint(path)
            if current and not force and written.get(rel) != current:
                kept.append(rel)
                continue
            save(img, path)
            written[rel] = fingerprint(path)
    json.dump(written, open(MANIFEST, 'w'), indent=1, sort_keys=True)
    if SHEETS:
        json.dump(SHEETS, open(SHEETS_JSON, 'w'), indent=1, sort_keys=True)
    contact_sheet(ASSETS + UI, os.path.join(ROOT, 'garden_preview.png'))
    print(f'drew {len(ASSETS)} garden images and {len(UI)} UI images')
    for rel in kept:
        print(f'  kept your own {rel} (delete it, or run with --force, to get the drawn one back)')


if __name__ == '__main__':
    main()
