"""
Small pixel-art toolkit used by the art generators (make_garden.py, ...).

Everything is drawn at "art" resolution and saved scaled up 2x with nearest
neighbour, the same as Melody's sprites, so all the art has the same chunky
pixel size on screen.
"""
from __future__ import annotations

import math
import os
import random
from typing import Iterable, Sequence

import numpy as np
from PIL import Image, ImageDraw

UPSCALE = 2
Color = tuple[int, int, int]


def rgb(h: str) -> Color:
    h = h.lstrip('#')
    return (int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16))


def ramp(*hexes: str) -> list[Color]:
    """A shading ramp, darkest first."""
    return [rgb(h) for h in hexes]


def new(w: int, h: int) -> Image.Image:
    return Image.new('RGBA', (w, h), (0, 0, 0, 0))


def draw(img: Image.Image) -> ImageDraw.ImageDraw:
    return ImageDraw.Draw(img)


def save(img: Image.Image, path: str, scale: int = UPSCALE) -> None:
    os.makedirs(os.path.dirname(path), exist_ok=True)
    img.resize((img.width * scale, img.height * scale), Image.NEAREST).save(path)


def px(img: Image.Image, x: int, y: int, c: Color, a: int = 255) -> None:
    if 0 <= x < img.width and 0 <= y < img.height:
        img.putpixel((int(x), int(y)), (*c, a))


def disc(d: ImageDraw.ImageDraw, cx: float, cy: float, r: float, c: Color) -> None:
    d.ellipse((round(cx - r), round(cy - r), round(cx + r), round(cy + r)), fill=(*c, 255))


def rect(d: ImageDraw.ImageDraw, x: float, y: float, w: float, h: float, c: Color) -> None:
    if w <= 0 or h <= 0:
        return
    d.rectangle((round(x), round(y), round(x + w - 1), round(y + h - 1)), fill=(*c, 255))


def poly(d: ImageDraw.ImageDraw, pts: Sequence[tuple[float, float]], c: Color) -> None:
    d.polygon([(round(x), round(y)) for x, y in pts], fill=(*c, 255))


def line(d: ImageDraw.ImageDraw, pts: Sequence[tuple[float, float]], c: Color, w: int = 1) -> None:
    d.line([(round(x), round(y)) for x, y in pts], fill=(*c, 255), width=w)


def outline(img: Image.Image, color: Color, diagonal: bool = False, only_below: bool = False) -> Image.Image:
    """Dark 1px outline around everything opaque (like Melody's)."""
    a = np.array(img)
    solid = np.pad(a[:, :, 3] > 0, 1)
    grow = np.zeros_like(solid)
    shifts = [(0, 1), (0, -1), (1, 0), (-1, 0)]
    if diagonal:
        shifts += [(1, 1), (1, -1), (-1, 1), (-1, -1)]
    if only_below:
        shifts = [(1, 0)]
    for dy, dx in shifts:
        grow |= np.roll(np.roll(solid, dy, axis=0), dx, axis=1)
    edge = (grow & ~solid)[1:-1, 1:-1]
    a[edge] = (*color, 255)
    return Image.fromarray(a)


def outline_wrap_x(img: Image.Image, color: Color) -> Image.Image:
    """Outline for horizontally tiling images (wraps left/right, not top/bottom)."""
    a = np.array(img)
    solid = a[:, :, 3] > 0
    grow = np.zeros_like(solid)
    for dy, dx in [(0, 1), (0, -1), (1, 0), (-1, 0)]:
        s = np.roll(solid, dx, axis=1)
        if dy:
            s = np.roll(s, dy, axis=0)
            if dy > 0:
                s[0, :] = False
            else:
                s[-1, :] = False
        grow |= s
    edge = grow & ~solid
    a[edge] = (*color, 255)
    return Image.fromarray(a)


def shade_by_light(img: Image.Image, ramp_: list[Color], light=(-0.6, -0.8), rng: random.Random | None = None,
                   noise: float = 0.18, mask_color: Color | None = None) -> Image.Image:
    """Recolour opaque pixels with a ramp by their distance to the shape's lit edge.

    Pixels near the upper-left (light) edge get light colours, deeper/lower-right
    pixels darker ones. Gives blobs a rounded, lit look.
    """
    rng = rng or random.Random(1)
    a = np.array(img).astype(np.int32)
    solid = a[:, :, 3] > 0
    if mask_color is not None:
        solid &= (a[:, :, 0] == mask_color[0]) & (a[:, :, 1] == mask_color[1]) & (a[:, :, 2] == mask_color[2])
    ys, xs = np.nonzero(solid)
    if len(xs) == 0:
        return img
    # distance (in steps) from the lit side: march towards the light until outside
    lx, ly = light
    h, w = solid.shape
    depth = np.zeros(len(xs))
    for k in range(1, 10):
        tx = np.clip(np.round(xs + lx * k).astype(int), 0, w - 1)
        ty = np.clip(np.round(ys + ly * k).astype(int), 0, h - 1)
        inside = solid[ty, tx]
        depth += inside
    n = len(ramp_)
    t = depth / 9.0
    t = t + np.array([rng.uniform(-noise, noise) for _ in range(len(xs))])
    idx = np.clip(((1 - t) * (n - 1)).round().astype(int), 0, n - 1)
    for i, (x, y) in enumerate(zip(xs, ys)):
        a[y, x, :3] = ramp_[idx[i]]
    return Image.fromarray(a.astype(np.uint8))


def speckle(img: Image.Image, colors: Sequence[Color], density: float, rng: random.Random,
            region: tuple[int, int, int, int] | None = None, only_on: Color | None = None) -> None:
    """Sprinkle single-pixel noise (texture) over opaque pixels."""
    x0, y0, x1, y1 = region or (0, 0, img.width, img.height)
    for y in range(y0, y1):
        for x in range(x0, x1):
            if rng.random() < density:
                p = img.getpixel((x, y))
                if p[3] == 0:
                    continue
                if only_on is not None and p[:3] != only_on:
                    continue
                img.putpixel((x, y), (*rng.choice(colors), 255))


def leaf_mass(img: Image.Image, cx: float, cy: float, rx: float, ry: float, ramp_: list[Color], rng: random.Random,
              blob: tuple[float, float] = (3, 6), wrap_w: int | None = None, count: int | None = None) -> None:
    """A clump of foliage: many small leafy circles inside an ellipse, lit from the top left.

    ramp_ is darkest first. With wrap_w the clump wraps horizontally (tiling layers).
    """
    d = draw(img)
    count = count or int(rx * ry / 6) + 6
    n = len(ramp_)
    for _ in range(count):
        ang = rng.uniform(0, math.tau)
        rr = math.sqrt(rng.random())
        x = cx + math.cos(ang) * rx * rr
        y = cy + math.sin(ang) * ry * rr
        r = rng.uniform(*blob)
        # light from upper-left: position within clump decides colour
        t = ((x - cx) / rx * 0.55 + (y - cy) / ry * 0.85) * 0.5 + 0.5  # 0 lit .. 1 shade
        t = min(1, max(0, t + rng.uniform(-0.18, 0.18)))
        c = ramp_[min(n - 1, max(0, round((1 - t) * (n - 1))))]
        xs = [x] if wrap_w is None else [x - wrap_w, x, x + wrap_w]
        for xx in xs:
            disc(d, xx, y, r, c)
    # leafy highlight flecks along the lit side
    for _ in range(count // 2):
        ang = rng.uniform(math.pi * 0.9, math.pi * 1.6)
        rr = rng.uniform(0.45, 0.95)
        x = cx + math.cos(ang) * rx * rr
        y = cy + math.sin(ang) * ry * rr
        xs = [x] if wrap_w is None else [x - wrap_w, x, x + wrap_w]
        for xx in xs:
            xi, yi = int(xx) % img.width if wrap_w else int(xx), int(y)
            if 0 <= xi < img.width and 0 <= yi < img.height and img.getpixel((xi, yi))[3]:
                px(img, xi, yi, ramp_[-1])
                px(img, xi + 1, yi, ramp_[-1])


def vgradient(w: int, h: int, top: Color, bottom: Color, steps: int = 12) -> Image.Image:
    """Banded vertical gradient (pixel-art style, no smooth blending)."""
    img = new(w, h)
    d = draw(img)
    for i in range(steps):
        t = i / (steps - 1)
        c = tuple(round(top[k] + (bottom[k] - top[k]) * t) for k in range(3))
        y0 = round(h * i / steps)
        y1 = round(h * (i + 1) / steps)
        rect(d, 0, y0, w, y1 - y0, c)  # type: ignore[arg-type]
    return img


def mix(a: Color, b: Color, t: float) -> Color:
    return tuple(round(a[k] + (b[k] - a[k]) * t) for k in range(3))  # type: ignore[return-value]


def haze(img: Image.Image, toward: Color, t: float) -> Image.Image:
    """Fade colours towards the sky (atmospheric distance)."""
    a = np.array(img).astype(np.float32)
    for k in range(3):
        a[:, :, k] = a[:, :, k] + (toward[k] - a[:, :, k]) * t
    return Image.fromarray(a.round().astype(np.uint8))


def paste(dst: Image.Image, src: Image.Image, x: int, y: int) -> None:
    dst.alpha_composite(src, (int(x), int(y)))


def contact_sheet(items: Iterable[tuple[str, Image.Image]], path: str, bg=(120, 170, 110), scale=2, width=1600) -> None:
    from PIL import ImageFont
    items = list(items)
    x = y = 10
    row_h = 0
    placed = []
    for name, im in items:
        w, h = im.width * scale, im.height * scale
        if x + w > width:
            x = 10
            y += row_h + 26
            row_h = 0
        placed.append((name, im, x, y))
        x += w + 16
        row_h = max(row_h, h)
    sheet = Image.new('RGBA', (width, y + row_h + 36), (*bg, 255))
    d = ImageDraw.Draw(sheet)
    for name, im, x, y in placed:
        sheet.alpha_composite(im.resize((im.width * scale, im.height * scale), Image.NEAREST), (x, y + 14))
        d.text((x, y), name, fill=(20, 20, 20, 255))
    sheet.save(path)
