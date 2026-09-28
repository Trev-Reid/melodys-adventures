"""
Generates Melody's pixel-art sprite sheet.

Outputs
  public/assets/sprites/melody.png          normal Melody sprite sheet
  public/assets/sprites/melody_buff.png     SUPER STRENGTH Melody (same frame layout)
  src/characters/melody/melodySheet.json    frame size + animation list + variants (read by the game)
  tools/sprites/*_preview.png               labelled contact sheets for reviewing the art

How it works
  Melody is drawn from a simple "rig": body, neck, head, legs and tail are
  shapes positioned by a pose (joint angles, body tilt, head tilt, ears,
  mouth...). Every frame is the same dog in a different pose, which keeps the
  animation consistent. Shapes are drawn smooth at high resolution, snapped
  to the pixel grid, then coloured, shaded and outlined.

Style guide: white lurcher with a tan saddle and hip patch, tan head with a
white muzzle, rose ears, black collar with a gold tag, short tail, long legs.

Run:  python tools/sprites/make_melody.py      (needs:  pip install pillow)
"""
from __future__ import annotations

import json
import math
import os
from PIL import Image, ImageDraw, ImageFont

# ---- Frame & output -------------------------------------------------------------
W, H = 48, 38          # art pixels per frame, drawn facing right
UPSCALE = 2            # each art pixel -> 2x2 screen pixels
SS = 8                 # supersampling while drawing smooth shapes
COLS = 8
SPACING = 4            # transparent gap between frames (screen px) so neighbours never bleed in
OX, OY = 1.9, 6.0      # shift from rig space into the frame (centres her body)

ROOT = os.path.dirname(os.path.abspath(__file__))
PROJECT = os.path.normpath(os.path.join(ROOT, '..', '..'))
SPRITES_DIR = os.path.join(PROJECT, 'public', 'assets', 'sprites')
OUT_JSON = os.path.join(PROJECT, 'src', 'characters', 'melody', 'melodySheet.json')

# ---- Builds ------------------------------------------------------------------------
# Same poses, different body. 'buff' is SUPER STRENGTH Melody: big chest and
# shoulders, thick legs, bulging thighs, thick neck, determined eyebrows.
BUILDS = {
    'normal': dict(
        front_w=(2.1, 1.6, 1.6), hind_w=(3.2, 1.9, 1.6, 1.6), thigh=(15.0, 14.6, 3.8, 3.6),
        chest=None, neck_top=((0.2, 3.0), (-2.8, 0.2)), muscles=False, brow=False,
    ),
    'buff': dict(
        front_w=(3.0, 2.1, 2.1), hind_w=(4.0, 2.3, 2.1, 2.0), thigh=(14.6, 14.2, 5.2, 4.8),
        chest=[(31.0, 15.2, 4.6, 5.0), (26.4, 11.0, 4.6, 3.4)],   # pecs, shoulder hump
        neck_top=((1.2, 3.6), (-3.6, -0.6)), muscles=True, brow=True,
        # Bulges along each leg: (segment index, position along it 0..1, radius)
        front_bulges=[(0, 0.6, 3.3, 1.3), (1, 0.25, 2.1, 0.7)],   # bicep, forearm (seg, t, radius, push forward)
        hind_bulges=[(1, 0.3, 2.4, -0.8)],                        # calf
    ),
}
MUSCLE_LINE = (176, 160, 142)     # muscle creases on white fur

# ---- Palette ---------------------------------------------------------------------
WHITE = (250, 246, 238)
WHITE_SHADE = (218, 208, 194)
FAR = (192, 180, 166)             # legs on the far side
TAN = (221, 148, 78)
TAN_LIGHT = (238, 181, 116)
TAN_SHADE = (180, 108, 52)
EAR = (170, 98, 46)
EAR_LINE = (116, 64, 30)
COLLAR = (26, 26, 30)
COLLAR_SHINE = (70, 70, 78)
TAG = (230, 186, 60)
NOSE = (34, 30, 32)
EYE = (24, 16, 12)
EYE_SHINE = (255, 255, 255)
MOUTH = (92, 36, 36)
TONGUE = (236, 112, 124)
OUTLINE = (46, 30, 22)
INNER = (128, 100, 80)

# ---- Rig (rig space: ground at y=30.8, facing right) ------------------------------
GROUND = 30.8
SHOULDER = (29.0, 17.0)
HIP = (14.5, 17.0)
TAIL_ROOT = (11.4, 12.4)
BODY_PIVOT = (22.0, 14.0)
HEAD_C = (37.2, 4.6)              # skull centre at rest
FRONT = (4.5, 8.8, 2.0)           # upper arm, forearm, paw
HIND = (5.0, 5.2, 3.8, 1.6)       # thigh, shank, metatarsus, toes
TAIL = (2.4, 2.2, 1.9)            # short tail

# Fairly level back line from withers to croup, then a short slope to the rump.
TORSO = [(27, 10.4), (22, 10.0), (17.5, 10.0), (13.6, 10.4), (11.5, 11.4), (10.7, 13.6),
         (11.3, 17.6), (15, 18.5), (18, 15.6), (21, 15.2), (25, 17.6), (29, 19.8),
         (32.4, 17.6), (33.4, 14.4), (33, 12)]
SADDLE = [(28.2, 8.5), (19.2, 8.5), (18.8, 13.2), (21.3, 15.6), (25.6, 16.7), (28.4, 13.4)]
HIP_PATCH = [(15.2, 9.5), (10.5, 11.5), (10.3, 16.2), (12.6, 15.2), (14.6, 12.8)]
NECK_BASE = [(28.2, 10.6), (32.9, 13.8)]    # back, front

STAND_F = (0.14, 0.05, 1.35)      # near front leg
STAND_FF = (-0.10, -0.05, 1.35)   # far front leg sits slightly back, so the two legs read separately
# Lurcher stance: thigh nearly straight down, hock high and slightly back,
# lower leg vertical, foot under the rump.
STAND_H = (0.1, -0.4, -0.1, 1.45)
TAIL_REST = (-0.55, -0.25, 0.15)


def P(**kw):
    """A pose. Angles for legs/tail are absolute, from straight down (+ = forward)."""
    p = dict(
        dy=0.0,              # body up/down
        pitch=0.0,           # body tilt in degrees (+ = nose up / rump down)
        pivot=BODY_PIVOT,    # where the tilt happens
        sx=1.0,              # body stretch (sprinting)
        arch=0.0,            # extra curve in the back
        head=(0.0, 0.0),     # head offset
        hrot=0.0,            # head tilt in degrees (+ = nose up)
        ear='back',          # back | up | flat
        eye='open',          # open | closed | wide
        mouth='closed',      # closed | open | tongue
        fn=STAND_F, ff=None, hn=STAND_H, hf=None,
        tail=TAIL_REST,
        tongue_len=0.0,
        grounded=False,      # resting on the ground: snap the lowest pixel onto the ground line
    )
    p.update(kw)
    p['ff'] = p['ff'] or (STAND_FF if p['fn'] == STAND_F else p['fn'])
    p['hf'] = p['hf'] or p['hn']
    return p


# ---- Geometry helpers --------------------------------------------------------------

def rot(pt, c, deg):
    a = math.radians(-deg)  # screen y points down; + deg tilts nose up
    x, y = pt[0] - c[0], pt[1] - c[1]
    return (c[0] + x * math.cos(a) - y * math.sin(a), c[1] + x * math.sin(a) + y * math.cos(a))


def ellipse_pts(cx, cy, rx, ry, n=28):
    return [(cx + rx * math.cos(2 * math.pi * i / n), cy + ry * math.sin(2 * math.pi * i / n)) for i in range(n)]


def chain(start, lengths, angles):
    pts = [start]
    x, y = start
    for L, a in zip(lengths, angles):
        x += L * math.sin(a)
        y += L * math.cos(a)
        pts.append((x, y))
    return pts


class Canvas:
    def __init__(self):
        self.masks: dict[str, Image.Image] = {}

    def _d(self, name):
        if name not in self.masks:
            self.masks[name] = Image.new('L', (W * SS, H * SS), 0)
        return ImageDraw.Draw(self.masks[name])

    @staticmethod
    def _s(pts):
        return [((x + OX) * SS, (y + OY) * SS) for x, y in pts]

    def poly(self, name, pts):
        self._d(name).polygon(self._s(pts), fill=255)

    def line(self, name, pts, width):
        d = self._d(name)
        s = self._s(pts)
        d.line(s, fill=255, width=max(1, int(width * SS)))
        r = width * SS / 2
        for x, y in s:
            d.ellipse([x - r, y - r, x + r, y + r], fill=255)

    def grid(self, name, threshold=0.5):
        if name not in self.masks:
            return set()
        small = self.masks[name].resize((W, H), Image.BOX)
        px = small.load()
        return {(x, y) for y in range(H) for x in range(W) if px[x, y] >= threshold * 255}


def to_px(pt):
    return (int(round(pt[0] + OX - 0.5)), int(round(pt[1] + OY - 0.5)))


def shade_muscle(m, within, tanset, put):
    """Make a muscle read as round: shade its lower part, crease underneath."""
    if not m:
        return
    ys = [q[1] for q in m]
    top, bottom = min(ys), max(ys)
    split = top + (bottom - top) * 0.62
    for q in m & within:
        if q[1] >= split:
            put(q, TAN_SHADE if q in tanset else WHITE_SHADE)
    for q in ring(m) & within:
        if q not in m and q[1] >= split:
            put(q, TAN_SHADE if q in tanset else MUSCLE_LINE)


def ring(pixels):
    out = set()
    for (x, y) in pixels:
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            q = (x + dx, y + dy)
            if q not in pixels:
                out.add(q)
    return out


# ---- Drawing one frame ---------------------------------------------------------------

def render(p, build='normal') -> Image.Image:
    cv = Canvas()
    bd = BUILDS[build]
    dy, pitch, piv, sx, arch = p['dy'], p['pitch'], p['pivot'], p['sx'], p['arch']

    def B(pt):
        """Rig body space -> frame: stretch, arch, tilt, lift."""
        x, y = pt
        x = BODY_PIVOT[0] + (x - BODY_PIVOT[0]) * sx
        if y < 14:
            y -= arch * max(0.0, 1 - abs(x - 18.5) / 7.0)
        x, y = rot((x, y), piv, pitch)
        return (x, y + dy)

    Bs = lambda pts: [B(q) for q in pts]

    shoulder, hip, tail_root = B(SHOULDER), B(HIP), B(TAIL_ROOT)
    far_shoulder = (shoulder[0] - 2.2, shoulder[1])
    far_hip = (hip[0] + 1.3, hip[1])

    # Legs (far side first).
    def bulges(name, pts, spec):
        for seg, t, r, push in spec:
            (x0, y0), (x1, y1) = pts[seg], pts[seg + 1]
            cx, cy = x0 + (x1 - x0) * t + push, y0 + (y1 - y0) * t
            cv.poly(name, ellipse_pts(cx, cy, r, r))
            if name == 'near':
                cv.poly(f'mb_{seg}_{t}', ellipse_pts(cx, cy, r, r))

    def front_leg(name, a, angles):
        pts = chain(a, FRONT, angles)
        bulges(name, pts, bd.get('front_bulges', []))
        w = bd['front_w']
        cv.line(name, pts[0:2], w[0])
        cv.line(name, pts[1:3], w[1])
        cv.line(name, pts[2:4], w[2])

    def hind_leg(name, a, angles):
        pts = chain(a, HIND, angles)
        bulges(name, pts, bd.get('hind_bulges', []))
        w = bd['hind_w']
        cv.line(name, pts[0:2], w[0])
        cv.line(name, pts[1:3], w[1])
        cv.line(name, pts[2:4], w[2])
        cv.line(name, pts[3:5], w[3])

    front_leg('far', far_shoulder, p['ff'])
    hind_leg('far', far_hip, p['hf'])

    # Short tail.
    tail_pts = chain(tail_root, TAIL, [a for a in p['tail']])
    cv.line('tail', tail_pts[0:2], 1.8)
    cv.line('tail', tail_pts[1:3], 1.5)
    cv.line('tail', tail_pts[2:4], 1.2)

    # Body.
    cv.poly('body', Bs(TORSO))
    cv.poly('body', Bs(ellipse_pts(*bd['thigh'])))      # hind thigh
    for e in bd['chest'] or []:
        cv.poly('body', Bs(ellipse_pts(*e)))
    if bd['muscles']:
        tx, ty, trx, try_ = bd['thigh']
        cv.poly('m_thigh', Bs(ellipse_pts(tx, ty, trx, try_)))
        cv.poly('m_shoulder', Bs(ellipse_pts(26.4, 11.6, 4.0, 2.8)))
        cv.poly('m_pec', Bs(ellipse_pts(31.0, 15.6, 4.2, 4.4)))
    cv.poly('saddle', Bs(SADDLE))
    cv.poly('hip', Bs(HIP_PATCH))

    # Head: local shapes around the skull centre, then tilted and placed.
    hc = (HEAD_C[0] + p['head'][0], HEAD_C[1] + p['head'][1])
    # The head follows the neck when the body tilts or lifts.
    nb_back, nb_front = B(NECK_BASE[0]), B(NECK_BASE[1])
    base_mid = ((NECK_BASE[0][0] + NECK_BASE[1][0]) / 2, (NECK_BASE[0][1] + NECK_BASE[1][1]) / 2)
    moved_mid = ((nb_back[0] + nb_front[0]) / 2, (nb_back[1] + nb_front[1]) / 2)
    hc = (hc[0] + moved_mid[0] - base_mid[0], hc[1] + moved_mid[1] - base_mid[1])
    hr = p['hrot']

    def Hd(pts):
        return [rot((hc[0] + x, hc[1] + y), hc, hr) for x, y in pts]

    skull = ellipse_pts(0, 0, 3.7, 3.2)
    snout = [(0.6, -2.3), (6.9, 0.1), (7.1, 2.4), (1.0, 3.3)]
    cv.poly('head', Hd(skull))
    cv.poly('head', Hd(snout))
    cv.poly('headtan', Hd([(-4.2, -4.0), (3.0, -3.8), (3.4, -1.2), (2.2, 0.9), (0.2, 1.7), (-1.8, 3.0), (-4.4, 2.2)]))

    # Neck joins body to the back of the head.
    nf, nbk = bd['neck_top']
    if build == 'buff':
        nb_back, nb_front = (nb_back[0] - 1.2, nb_back[1] - 0.4), (nb_front[0] + 0.8, nb_front[1] + 0.4)
    neck = [nb_back, nb_front, Hd([nf])[0], Hd([nbk])[0]]
    cv.poly('neck', neck)

    # Collar across the neck, about 60% of the way up.
    t = 0.58
    cb = (nb_back[0] + (neck[3][0] - nb_back[0]) * t, nb_back[1] + (neck[3][1] - nb_back[1]) * t)
    cf = (nb_front[0] + (neck[2][0] - nb_front[0]) * t, nb_front[1] + (neck[2][1] - nb_front[1]) * t)
    cv.line('collar', [cb, cf], 1.9)

    # Near legs.
    front_leg('near', shoulder, p['fn'])
    hind_leg('near', hip, p['hn'])

    # Ear.
    ears = {
        'back': [(-0.8, -2.8), (-4.3, -2.3), (-3.3, 0.4), (-0.8, -0.5)],
        'flat': [(-1.2, -2.2), (-4.9, -1.2), (-3.4, 1.0), (-1.0, 0.0)],
        'up':   [(-0.6, -2.6), (-2.2, -6.6), (-0.4, -6.0), (0.9, -4.8), (0.8, -2.4)],
    }
    cv.poly('ear', Hd(ears[p['ear']]))

    # Mouth.
    if p['mouth'] in ('open', 'tongue'):
        cv.poly('mouth', Hd([(2.6, 2.0), (6.6, 1.8), (6.0, 3.3), (3.0, 3.4)]))
    if p['mouth'] == 'tongue':
        L = 1.6 + p['tongue_len']
        cv.poly('tongue', Hd([(3.2, 2.7), (5.2, 2.7), (5.0, 3.6 + L), (3.4, 3.4 + L)]))

    # ---- Snap to grid ------------------------------------------------------------
    far, tail = cv.grid('far'), cv.grid('tail', 0.4)
    body, neckpx, head = cv.grid('body'), cv.grid('neck'), cv.grid('head')
    near, ear = cv.grid('near'), cv.grid('ear', 0.45)
    saddle, hipp, headtan = cv.grid('saddle'), cv.grid('hip'), cv.grid('headtan')
    collar = cv.grid('collar', 0.4)
    mouth, tongue = cv.grid('mouth', 0.4), cv.grid('tongue', 0.4)

    solid = body | neckpx | head
    img = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    px = img.load()

    def put(q, c):
        if 0 <= q[0] < W and 0 <= q[1] < H:
            px[q] = c + (255,)

    for q in far:
        put(q, FAR)
    for q in tail:
        put(q, WHITE)
    for q in tail:
        if (q[0], q[1] + 1) not in tail:
            put(q, WHITE_SHADE)

    for q in solid:
        put(q, WHITE)
    # Soft shadow along the underside of the body and neck.
    for (x, y) in body | neckpx:
        if (x, y + 1) not in solid:
            put((x, y), WHITE_SHADE)

    tan = ((saddle | hipp) & body) | (headtan & head)
    for q in tan:
        put(q, TAN)
    for (x, y) in tan:
        if (x, y - 1) not in tan:
            put((x, y), TAN_LIGHT)
        elif (x, y + 1) not in tan:
            put((x, y), TAN_SHADE)

    if bd['muscles']:
        tanset = tan
        for name in ('m_shoulder', 'm_pec', 'm_thigh'):
            shade_muscle(cv.grid(name), body, tanset, put)

    for q in ring(solid) & far:
        put(q, INNER)
    for q in ring(tail) & far:
        put(q, INNER)

    for q in collar & solid:
        put(q, COLLAR)
    top_collar = sorted(collar & solid, key=lambda q: (q[1], q[0]))
    if top_collar:
        put(top_collar[0], COLLAR_SHINE)
        tag = max(collar & solid, key=lambda q: (q[0] + q[1]))
        put((tag[0], tag[1] + 1), TAG)

    for q in near:
        put(q, WHITE)
    for (x, y) in near:
        if (x - 1, y) not in near and (x, y) not in solid:
            put((x, y), WHITE_SHADE)          # back edge of each near leg
    near_top = min(hip[1], shoulder[1]) + OY + 1.5
    for q in ring(near) & (solid | far | tail):
        if q[1] > near_top and q not in collar:
            put(q, INNER)

    if bd['muscles']:
        for name in [k for k in cv.masks if k.startswith('mb_')]:
            shade_muscle(cv.grid(name), near, set(), put)

    for q in ear:
        put(q, EAR)
    for q in ring(ear) & solid:
        put(q, EAR_LINE)

    for q in mouth & head:
        put(q, MOUTH)
    for q in tongue:
        put(q, TONGUE)

    # Nose, eye.
    nose = Hd([(6.4, 0.2)])[0]
    nx, ny = to_px(nose)
    for q in [(nx, ny), (nx + 1, ny), (nx, ny + 1), (nx + 1, ny + 1)]:
        if q in solid or q in ring(solid):
            put(q, NOSE)

    ex, ey = to_px(Hd([(2.0, -0.7)])[0])
    if p['eye'] == 'closed':
        put((ex, ey + 1), EYE)
        put((ex + 1, ey + 1), EYE)
        put((ex - 1, ey), EYE)
    else:
        for q in [(ex, ey), (ex + 1, ey), (ex, ey + 1), (ex + 1, ey + 1)]:
            put(q, EYE)
        put((ex + 1, ey), EYE_SHINE)
        if p['eye'] == 'wide':
            put((ex, ey - 1), EYE)
            put((ex + 1, ey - 1), EYE)
    if bd['brow'] and p['eye'] != 'closed':
        # Determined eyebrow, slanting down towards the nose.
        for q in [(ex - 1, ey - 2), (ex, ey - 2), (ex + 1, ey - 1), (ex + 2, ey - 1)]:
            put(q, OUTLINE)

    img = outline(img)
    if p['grounded']:
        img = snap_to_ground(img)
    return img


def snap_to_ground(img: Image.Image) -> Image.Image:
    """Move the drawing down so its lowest pixel sits on the frame's bottom row."""
    bbox = img.getbbox()
    if not bbox:
        return img
    gap = H - bbox[3]
    if gap <= 0:
        return img
    out = Image.new('RGBA', img.size, (0, 0, 0, 0))
    out.paste(img, (0, gap))
    return out


def outline(img: Image.Image) -> Image.Image:
    src = img.load()
    out = img.copy()
    o = out.load()
    for y in range(H):
        for x in range(W):
            if src[x, y][3]:
                continue
            for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                nx, ny = x + dx, y + dy
                if 0 <= nx < W and 0 <= ny < H and src[nx, ny][3]:
                    o[x, y] = OUTLINE + (255,)
                    break
    return out


# ---- Animations -------------------------------------------------------------------------
# name: (frame rate, repeat (-1 loops), [poses])

TAIL_WAG_A = (-1.5, -2.0, -2.5)
TAIL_WAG_B = (-1.1, -1.4, -1.9)
TAIL_STREAM = (-1.75, -1.85, -1.95)
TAIL_STREAM_B = (-1.6, -1.65, -1.75)
TAIL_TUCK = (-0.2, 0.25, 0.8)

GALLOP = [
    dict(dy=-1.2, fn=(1.05, 0.95, 1.6), ff=(0.8, 0.6, 1.5), hn=(-0.35, -1.25, -1.45, -1.9), hf=(-0.15, -1.05, -1.25, -1.7)),
    dict(dy=0.0, fn=(0.45, 0.2, 1.3), ff=(0.8, 0.7, 1.5), hn=(0.1, -1.0, -0.8, -0.6), hf=(0.3, -0.9, -0.6, -0.4)),
    dict(dy=0.2, arch=1.3, fn=(-0.35, -0.55, -1.2), ff=(-0.05, -0.25, -0.6), hn=(1.15, 0.25, 0.7, 1.4), hf=(0.95, 0.05, 0.4, 1.3)),
    dict(dy=0.4, arch=0.8, fn=(0.6, -0.5, 0.6), ff=(0.3, -0.6, 0.3), hn=(0.85, -0.4, 0.2, 1.4), hf=(0.6, -0.7, 0.0, 1.2)),
    dict(dy=-0.4, fn=(0.95, 0.85, 1.5), ff=(0.7, 0.4, 1.3), hn=(0.15, -0.95, -0.6, -0.2), hf=(0.35, -0.85, -0.3, 0.2)),
    dict(dy=-1.0, fn=(1.1, 1.0, 1.6), ff=(0.9, 0.7, 1.5), hn=(-0.25, -1.15, -1.3, -1.7), hf=(-0.05, -1.0, -1.1, -1.4)),
]


def walk_frame(i):
    """6-frame walk: legs swing in diagonal pairs."""
    ph = 2 * math.pi * i / 6
    s = math.sin(ph)
    c = math.cos(ph)
    lift_n = max(0.0, c)
    lift_f = max(0.0, -c)
    fn = (0.1 + 0.35 * s, 0.02 + 0.3 * s - 0.6 * lift_n, 1.35)
    ff = (0.1 - 0.35 * s, 0.02 - 0.3 * s - 0.6 * lift_f, 1.35)
    hn = (STAND_H[0] - 0.35 * s, STAND_H[1] - 0.25 * s, STAND_H[2] - 0.2 * s + 0.4 * lift_f, 1.45)
    hf = (STAND_H[0] + 0.35 * s, STAND_H[1] + 0.25 * s, STAND_H[2] + 0.2 * s + 0.4 * lift_n, 1.45)
    return P(dy=-0.25 * abs(c), head=(0.2, 0.3 * abs(s)), fn=fn, ff=ff, hn=hn, hf=hf,
             tail=TAIL_WAG_B if i % 3 == 0 else (-1.2, -1.5, -1.9))


SIT_BASE = dict(pitch=36, pivot=(14.5, 17.0), dy=11.2, head=(-1.2, 2.2), hrot=4,
                fn=(0.02, -0.02, 1.4), ff=(0.1, 0.05, 1.4),
                hn=(2.07, -0.82, 1.57, 1.57), hf=(2.0, -0.9, 1.57, 1.57),
                tail=(-1.6, -1.55, -1.4))

LIE_BASE = dict(dy=9.2, head=(1.5, 11.0), hrot=-6,
                fn=(1.5, 1.52, 1.6), ff=(1.45, 1.5, 1.6),
                hn=(1.4, -1.7, 1.5, 1.6), hf=(1.35, -1.75, 1.45, 1.55),
                tail=(-1.45, -1.3, -0.9), eye='closed', ear='flat', grounded=True)

ANIMATIONS = {
    'idle': (4, -1, [
        P(),
        P(head=(0, 0.3), tail=(-0.65, -0.35, 0.05)),
        P(head=(0, 0.5), mouth='tongue', tongue_len=0.2),
        P(head=(0, 0.2), mouth='tongue', tail=(-0.65, -0.35, 0.05)),
    ]),
    'walk': (9, -1, [walk_frame(i) for i in range(6)]),
    'run': (14, -1, [P(head=(0.8, 0.8), hrot=-4, ear='flat', mouth='tongue', tongue_len=0.3,
                       tail=TAIL_STREAM if i % 2 == 0 else TAIL_STREAM_B, **g) for i, g in enumerate(GALLOP)]),
    'sprint': (18, -1, [P(sx=1.08, head=(1.2, 1.4), hrot=-8, ear='flat', mouth='tongue', tongue_len=0.6,
                          tail=TAIL_STREAM, **{**g, 'dy': g['dy'] + 0.6}) for g in GALLOP]),
    'jump': (12, 0, [
        P(dy=0.8, pitch=8, head=(0.4, -0.6), hrot=10, ear='up',
          fn=(0.7, -0.4, 0.8), ff=(0.5, -0.5, 0.6), hn=(0.2, -1.0, -0.6, -0.3), hf=(0.4, -0.9, -0.4, 0.0), tail=TAIL_WAG_B),
        P(dy=-0.6, pitch=14, head=(0.6, -0.8), hrot=12, ear='up', mouth='open',
          fn=(1.0, -0.2, 0.9), ff=(0.8, -0.35, 0.7), hn=(-0.3, -1.1, -1.35, -1.8), hf=(-0.1, -0.95, -1.15, -1.6), tail=TAIL_STREAM),
    ]),
    'air': (8, -1, [
        P(dy=-0.6, pitch=4, head=(0.6, -0.2), hrot=4, ear='up', mouth='open',
          fn=(1.15, 0.2, 1.3), ff=(0.95, 0.0, 1.1), hn=(-0.15, -1.2, -1.2, -1.6), hf=(0.05, -1.0, -1.0, -1.3), tail=TAIL_STREAM),
        P(dy=-0.4, pitch=-2, head=(0.6, 0.2), ear='up', mouth='open',
          fn=(1.0, 0.4, 1.4), ff=(0.85, 0.3, 1.3), hn=(0.3, -1.1, -0.8, -0.8), hf=(0.45, -1.0, -0.6, -0.5), tail=TAIL_STREAM_B),
    ]),
    'fall': (6, -1, [
        P(dy=-0.3, pitch=-8, head=(0.5, 0.9), hrot=-6, ear='up', eye='wide',
          fn=(0.55, 0.3, 1.3), ff=(0.75, 0.5, 1.4), hn=(0.9, -0.2, 0.4, 1.3), hf=(0.7, -0.4, 0.2, 1.2), tail=TAIL_WAG_A),
        P(dy=-0.3, pitch=-8, head=(0.5, 1.1), hrot=-6, ear='up', eye='wide',
          fn=(0.5, 0.25, 1.3), ff=(0.7, 0.45, 1.4), hn=(0.95, -0.15, 0.45, 1.3), hf=(0.75, -0.35, 0.25, 1.2), tail=TAIL_WAG_B),
    ]),
    'land': (14, 0, [
        P(dy=2.0, arch=0.6, head=(0.2, 2.2), hrot=-6, ear='flat',
          fn=(0.35, -0.3, 1.4), ff=(0.15, -0.45, 1.3), hn=(0.95, -1.0, 0.25, 1.4), hf=(0.75, -1.1, 0.1, 1.3), tail=TAIL_WAG_B),
        P(dy=0.8, head=(0.1, 1.0), fn=(0.2, -0.1, 1.4), hn=(0.7, -0.85, 0.15, 1.4), tail=TAIL_REST),
    ]),
    'sniff': (6, -1, [
        P(pitch=-6, head=(2.2, 9.5), hrot=-48, ear='flat', fn=(0.25, 0.1, 1.4), ff=(0.15, 0.05, 1.4), tail=TAIL_WAG_B),
        P(pitch=-6, head=(2.4, 10.2), hrot=-52, ear='flat', fn=(0.25, 0.1, 1.4), ff=(0.15, 0.05, 1.4), tail=TAIL_WAG_A),
        P(pitch=-6, head=(1.6, 9.8), hrot=-46, ear='flat', fn=(0.25, 0.1, 1.4), ff=(0.15, 0.05, 1.4), tail=TAIL_WAG_B),
        P(pitch=-6, head=(2.0, 10.4), hrot=-50, ear='flat', fn=(0.25, 0.1, 1.4), ff=(0.15, 0.05, 1.4), tail=TAIL_WAG_A),
    ]),
    'alert': (8, 0, [
        P(head=(0, -0.3), hrot=4, ear='back', tail=TAIL_REST),
        P(head=(0.1, -0.8), hrot=8, ear='up', eye='wide', tail=TAIL_WAG_B),
    ]),
    'happy': (10, -1, [
        P(dy=0.0, head=(0.2, 0.0), hrot=6, ear='back', mouth='tongue', tongue_len=0.4, tail=TAIL_WAG_A),
        P(dy=-0.8, head=(0.3, -0.6), hrot=10, ear='up', mouth='tongue', tongue_len=0.6, tail=TAIL_WAG_B,
          fn=(0.35, 0.1, 1.4), ff=(0.25, 0.0, 1.4)),
        P(dy=0.0, head=(0.2, 0.0), hrot=6, ear='back', mouth='tongue', tongue_len=0.4, tail=TAIL_WAG_A),
        P(dy=0.2, head=(0.1, 0.4), hrot=2, ear='flat', mouth='tongue', tongue_len=0.3, tail=TAIL_WAG_B),
    ]),
    'scared': (8, -1, [
        P(dy=2.4, pitch=-6, head=(-1.0, 3.2), hrot=-10, ear='flat', eye='wide', tail=TAIL_TUCK,
          fn=(-0.1, -0.35, 1.2), ff=(-0.2, -0.4, 1.2), hn=(0.95, -1.1, 0.3, 1.4), hf=(0.8, -1.2, 0.2, 1.3)),
        P(dy=2.6, pitch=-6, head=(-1.2, 3.4), hrot=-12, ear='flat', eye='wide', tail=TAIL_TUCK,
          fn=(-0.12, -0.38, 1.2), ff=(-0.22, -0.42, 1.2), hn=(0.97, -1.12, 0.3, 1.4), hf=(0.82, -1.22, 0.2, 1.3)),
    ]),
    'sit': (6, 0, [
        P(**{**SIT_BASE, 'pitch': 16, 'dy': 5.5, 'head': (-0.4, 1.0), 'hn': (1.3, -1.2, 0.8, 1.5), 'hf': (1.25, -1.25, 0.7, 1.5)}),
        P(**SIT_BASE),
    ]),
    'sit_idle': (3, -1, [
        P(**SIT_BASE),
        P(**{**SIT_BASE, 'mouth': 'tongue', 'head': (0, 0.3)}),
        P(**{**SIT_BASE, 'mouth': 'tongue', 'head': (0, 0.4), 'tail': (-1.4, -1.0, -0.4)}),
        P(**{**SIT_BASE, 'head': (0, 0.2)}),
    ]),
    'lie_down': (6, 0, [
        P(**{**LIE_BASE, 'dy': 5.0, 'head': (1.0, 5.0), 'hrot': -2, 'eye': 'open', 'ear': 'back',
             'fn': (0.9, 0.9, 1.5), 'ff': (0.85, 0.85, 1.5), 'hn': (1.2, -1.4, 0.8, 1.4), 'hf': (1.15, -1.45, 0.7, 1.4)}),
        P(**{**LIE_BASE, 'eye': 'open', 'ear': 'back'}),
    ]),
    'sleep': (2, -1, [
        P(**LIE_BASE),
        P(**{**LIE_BASE, 'dy': 9.5, 'head': (1.5, 11.2)}),
    ]),
    'wake': (6, 0, [
        P(**{**LIE_BASE, 'eye': 'open', 'ear': 'back'}),
        # Big stretch: front down, bottom up.
        P(pitch=-16, pivot=(28, 18), dy=0.5, head=(1.8, 6.5), hrot=12, ear='back', mouth='open', grounded=True,
          fn=(1.35, 1.4, 1.6), ff=(1.3, 1.35, 1.6), hn=(0.35, -0.5, 0.1, 1.4), tail=TAIL_WAG_A),
        P(head=(0, 0.3), mouth='tongue', tail=TAIL_WAG_B),
    ]),
}


def main():
    manifest, n = {}, 0
    for name, (rate, repeat, poses) in ANIMATIONS.items():
        manifest[name] = {'frames': list(range(n, n + len(poses))), 'frameRate': rate, 'repeat': repeat}
        n += len(poses)

    variants = {}
    for build in BUILDS:
        frames = [render(p, build) for _, (_, _, poses) in ANIMATIONS.items() for p in poses]
        file = 'melody.png' if build == 'normal' else f'melody_{build}.png'
        save_sheet(frames, os.path.join(SPRITES_DIR, file))
        preview(frames, manifest, os.path.join(ROOT, file.replace('.png', '_preview.png')))
        variants[build] = f'assets/sprites/{file}'
        print(f'{build}: {len(frames)} frames of {W * UPSCALE}x{H * UPSCALE} -> {file}')

    with open(OUT_JSON, 'w') as fh:
        json.dump({'frameWidth': W * UPSCALE, 'frameHeight': H * UPSCALE, 'spacing': SPACING,
                   'variants': variants, 'animations': manifest}, fh, indent=2)
        fh.write('\n')
    for name, m in manifest.items():
        print(f"  {name:9s} frames {m['frames'][0]}-{m['frames'][-1]}")


def save_sheet(frames, path):
    rows = math.ceil(len(frames) / COLS)
    fw, fh = W * UPSCALE, H * UPSCALE
    sheet = Image.new('RGBA', (COLS * (fw + SPACING) - SPACING, rows * (fh + SPACING) - SPACING), (0, 0, 0, 0))
    for i, f in enumerate(frames):
        big = f.resize((fw, fh), Image.NEAREST)
        sheet.paste(big, ((i % COLS) * (fw + SPACING), (i // COLS) * (fh + SPACING)))
    os.makedirs(os.path.dirname(path), exist_ok=True)
    sheet.save(path)


def preview(frames, manifest, path, scale=3):
    """Labelled contact sheet: one row per animation."""
    fw, fh = W * scale, H * scale
    label_w = 90
    maxlen = max(len(m['frames']) for m in manifest.values())
    img = Image.new('RGB', (label_w + maxlen * (fw + 4), len(manifest) * (fh + 6)), (135, 206, 235))
    d = ImageDraw.Draw(img)
    font = ImageFont.load_default()
    for r, (name, m) in enumerate(manifest.items()):
        y = r * (fh + 6)
        d.rectangle([0, y, label_w - 6, y + fh], fill=(30, 58, 95))
        d.text((8, y + fh // 2 - 6), name, fill=(255, 255, 255), font=font)
        d.line([(label_w, y + fh - 3 * scale * 1.2), (img.width, y + fh - 3 * scale * 1.2)], fill=(90, 160, 90), width=2)
        for c, idx in enumerate(m['frames']):
            f = frames[idx].resize((fw, fh), Image.NEAREST)
            img.paste(f, (label_w + c * (fw + 4), y), f)
    img.save(path)


if __name__ == '__main__':
    main()
