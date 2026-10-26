"""
Generates the boy's pixel-art sprite sheets.

Outputs
  public/assets/sprites/boy.png          the boy, every animation
  public/assets/sprites/boy_carry.png    the same layout, holding the football in both hands
  src/characters/boy/boySheet.json       frame size, animations, skins and hand anchors (read by the game)
  tools/sprites/boy_preview.png          labelled contact sheet for reviewing the frames

How it works
  Like make_melody.py, the boy is drawn from a "rig": head, torso, two arms
  and two legs placed by a pose (joint angles, lean, bob, eyes, mouth).
  Every frame is the same boy in a different pose, so the animation stays
  consistent. Shapes are drawn smooth at 8x, snapped to the art-pixel grid,
  shaded from the upper left, given selective dark edges, and exported at 2x.

  This is placeholder art in the look the art director delivered on
  2026-10-25 (teal hoodie, dark shorts, light-soled shoes, brown hair). The
  art director redraws the frames; the layout, the frame size, the feet line
  and the hand anchors in boySheet.json are the contract.

Run:  python tools/sprites/make_boy.py      (needs:  pip install pillow)
      It won't overwrite sheets someone has drawn by hand (--force does, so ask first).
"""
from __future__ import annotations

import json
import math
import os
from PIL import Image, ImageDraw, ImageFont

# ---- Frame & output -------------------------------------------------------------
W, H = 32, 40          # art pixels per frame (64x80 on screen), facing right
UPSCALE = 2
SS = 8
COLS = 8
SPACING = 4            # transparent gap between frames (screen px)
CX = 16.0              # the boy's centre line
GROUND = 40.0          # bottom of the frame: his feet stand here

ROOT = os.path.dirname(os.path.abspath(__file__))
PROJECT = os.path.normpath(os.path.join(ROOT, '..', '..'))
SPRITES_DIR = os.path.join(PROJECT, 'public', 'assets', 'sprites')
OUT_JSON = os.path.join(PROJECT, 'src', 'characters', 'boy', 'boySheet.json')

# ---- Palette (style guide v2: Boy hoodie ramp, and the delivered boy's colours) -------
HOODIE = dict(edge=(23, 62, 64), dark=(29, 104, 108), base=(37, 133, 138), light=(49, 143, 148), hi=(89, 182, 180))
HOODIE_FAR = dict(edge=(23, 62, 64), dark=(23, 62, 64), base=(29, 104, 108), light=(37, 133, 138), hi=(37, 133, 138))
SKIN = dict(edge=(154, 97, 53), dark=(201, 144, 104), base=(237, 188, 139), light=(255, 218, 176), hi=(255, 218, 176))
SKIN_FAR = dict(edge=(154, 97, 53), dark=(170, 116, 80), base=(201, 144, 104), light=(212, 149, 105), hi=(212, 149, 105))
HAIR = dict(edge=(61, 40, 29), dark=(89, 59, 43), base=(112, 67, 43), light=(154, 97, 53), hi=(154, 97, 53))
SHORTS = dict(edge=(26, 37, 45), dark=(36, 52, 62), base=(41, 59, 73), light=(58, 82, 102), hi=(58, 82, 102))
SHOE = dict(edge=(26, 37, 45), dark=(26, 37, 45), base=(36, 52, 62), light=(58, 74, 86), hi=(58, 74, 86))
SOLE = (238, 226, 200)
EYE = (38, 54, 51)
MOUTH = (150, 72, 60)
BLUSH = (232, 150, 120)

# ---- Rig sizes (art px) ----------------------------------------------------------------
THIGH, SHIN = 5.0, 5.0
UPPER_ARM, FOREARM = 4.4, 4.0
HIP_Y = 28.6           # hip height when standing straight
TORSO_H = 8.6          # hip to shoulder
HEAD_R = 5.7


def P(**kw):
    """A pose. Leg and arm angles are in degrees from straight down (+ = forwards)."""
    p = dict(
        dy=0.0,              # whole body up (-) / down (+)
        lean=0.0,            # torso lean, degrees (+ = forwards)
        nl=(0, 0), fl=(0, 0),  # near / far leg: (thigh, shin) absolute angles
        na=(-4, 6), fa=(6, 14),  # near / far arm: (upper, forearm) absolute angles
        head=(0.0, 0.0),     # head offset
        tilt=0.0,            # head tilt, degrees (+ = looking up)
        eye='open',          # open | closed | happy | wide
        mouth='none',        # none | smile | open | o
        toe=(0, 0),          # extra foot angle near / far (+ = toe down, heel up)
        view='side',         # side | back (climbing)
        grounded=True,       # snap the lowest pixel onto the ground line
        carry=None,          # filled in for the carry skin
    )
    p.update(kw)
    return p


def rot(pt, c, deg):
    a = math.radians(deg)
    x, y = pt[0] - c[0], pt[1] - c[1]
    return (c[0] + x * math.cos(a) - y * math.sin(a), c[1] + x * math.sin(a) + y * math.cos(a))


def ext(pt, length, deg):
    """From a point, `length` along an angle measured from straight down (+ = forwards/right)."""
    a = math.radians(deg)
    return (pt[0] + length * math.sin(a), pt[1] + length * math.cos(a))


def ellipse_pts(cx, cy, rx, ry, n=32):
    return [(cx + rx * math.cos(2 * math.pi * i / n), cy + ry * math.sin(2 * math.pi * i / n)) for i in range(n)]


class Canvas:
    """Named masks, drawn smooth at SS x and snapped to art pixels; later layers cover earlier ones."""

    def __init__(self):
        self.order: list[str] = []
        self.masks: dict[str, Image.Image] = {}

    def _d(self, name):
        if name not in self.masks:
            self.masks[name] = Image.new('L', (W * SS, H * SS), 0)
            self.order.append(name)
        return ImageDraw.Draw(self.masks[name])

    def poly(self, name, pts):
        self._d(name).polygon([(x * SS, y * SS) for x, y in pts], fill=255)

    def circle(self, name, c, r):
        self.poly(name, ellipse_pts(c[0], c[1], r, r))

    def line(self, name, a, b, width):
        d = self._d(name)
        s = [(a[0] * SS, a[1] * SS), (b[0] * SS, b[1] * SS)]
        d.line(s, fill=255, width=max(1, int(width * SS)))
        r = width * SS / 2
        for x, y in s:
            d.ellipse([x - r, y - r, x + r, y + r], fill=255)

    def grid(self, name, threshold=0.5):
        small = self.masks[name].resize((W, H), Image.BOX)
        px = small.load()
        return {(x, y) for y in range(H) for x in range(W) if px[x, y] >= threshold * 255}


NEIGHBOURS = ((1, 0), (-1, 0), (0, 1), (0, -1))

# Which material each layer is painted in. Layers are drawn in this order.
MATERIAL = {
    'far_arm': HOODIE_FAR, 'far_hand': SKIN_FAR,
    'far_leg': SKIN_FAR, 'far_shoe': SHOE,
    'near_leg': SKIN, 'near_shoe': SHOE,
    'shorts': SHORTS, 'torso': HOODIE, 'hood': HOODIE, 'neck': SKIN,
    'head': SKIN, 'ear': SKIN_FAR, 'hair': HAIR,
    'near_arm': HOODIE, 'near_hand': SKIN,
}


def render(p) -> tuple[Image.Image, dict]:
    """Draw one frame. Returns the art-pixel image (W x H) and its anchors (in art px)."""
    cv = Canvas()
    anchors = {}
    if p['view'] == 'back':
        draw_back(cv, p, anchors)
    else:
        draw_side(cv, p, anchors)

    # Snap shapes to pixels: each layer covers the ones before it.
    owner: dict[tuple[int, int], str] = {}
    for name in cv.order:
        if name == 'hilite':
            continue
        th = 0.42 if name in ('near_hand', 'far_hand', 'ear', 'near_sole', 'far_sole') else 0.5
        for q in cv.grid(name, th):
            owner[q] = name

    img = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    px = img.load()
    filled = set(owner)

    def group(name):
        return name.split('_')[0] if name.startswith(('near', 'far')) else name

    for (x, y), name in owner.items():
        mat = MATERIAL.get(name)
        if name == 'eye':
            px[x, y] = EYE + (255,)
            continue
        if name == 'mouth':
            px[x, y] = MOUTH + (255,)
            continue
        if name == 'blush':
            px[x, y] = BLUSH + (255,)
            continue
        def same(q, name=name, mat=mat):
            o = owner.get(q)
            if o is None:
                return False
            if name in ('torso', 'hood', 'shorts') and o in ('near_arm', 'near_hand'):
                return True        # the arm is on top: shade the body as if it weren't there
            return MATERIAL.get(o) is mat and group(o) == group(name)
        up, left = (x, y - 1), (x - 1, y)
        down, right = (x, y + 1), (x + 1, y)
        # Edges: the outer silhouette gets the material's darkest tone (selective dark edges).
        outside = [q for q in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)) if q not in filled]
        if outside:
            col = mat['edge']
        elif not same(down) or not same(right):
            col = mat['dark']             # tucked under / behind something: shade
        elif not same(up) or not same(left):
            col = mat['light']            # facing the light (upper left)
        else:
            col = mat['base']
        px[x, y] = col + (255,)

    # Inner separations: near arm and near leg read against the body with a dark seam.
    for (x, y), name in owner.items():
        if name == 'near_arm':
            arm = lambda q: owner.get(q) in ('near_arm', 'near_hand')
            if not arm((x - 1, y)) or (x, y + 1) not in filled:
                col = HOODIE['edge']
            elif not arm((x + 1, y)) or not arm((x, y + 1)):
                col = HOODIE['dark'] if (x + 1, y) in filled or (x, y + 1) in filled else HOODIE['edge']
            elif not arm((x, y - 1)):
                col = HOODIE['light']
            else:
                col = HOODIE['base']
            if (x + 1, y) not in filled:
                col = HOODIE['edge']
            px[x, y] = col + (255,)
        if name in ('near_hand',):
            for dx, dy in NEIGHBOURS:
                if owner.get((x + dx, y + dy)) in ('torso', 'shorts', 'near_arm', 'hood') and dy >= 0:
                    px[x, y] = SKIN['dark'] + (255,)
                    break
        if name.endswith('shoe') and owner.get((x, y + 1)) != name:
            px[x, y] = SOLE + (255,)
        if name == 'near_leg':
            for dx, dy in NEIGHBOURS:
                if owner.get((x + dx, y + dy)) == 'far_leg':
                    px[x, y] = SKIN['dark'] + (255,)
                    break

    # Highlights: a hoodie sheen across the shoulders, and the hood's rim.
    if 'hilite' in cv.masks:
        for q in cv.grid('hilite', 0.5):
            if owner.get(q) in ('torso', 'hood') and px[q][:3] not in (HOODIE['edge'],):
                px[q] = HOODIE['hi'] + (255,)
    return img, anchors


def draw_side(cv: Canvas, p, anchors):
    dy = p['dy']
    hip = (CX - 0.4, HIP_Y + dy)
    lean = p['lean']
    # Torso leans around the hip.
    shoulder = rot((hip[0], hip[1] - TORSO_H), hip, lean)
    neck_base = rot((hip[0] + 0.6, hip[1] - TORSO_H - 0.4), hip, lean)
    head_c = rot((hip[0] + 1.0, hip[1] - TORSO_H - HEAD_R + 0.6), hip, lean)
    head_c = (head_c[0] + p['head'][0], head_c[1] + p['head'][1])

    # --- Far arm (behind everything) ---
    fs = (shoulder[0] - 0.6, shoulder[1] + 1.6)
    fe = ext(fs, UPPER_ARM, p['fa'][0] + lean * 0.3)
    fh = ext(fe, FOREARM, p['fa'][1] + lean * 0.3)
    cv.line('far_arm', fs, fe, 2.6)
    cv.line('far_arm', fe, ext(fe, FOREARM - 1.0, p['fa'][1] + lean * 0.3), 2.3)
    cv.circle('far_hand', fh, 1.3)
    anchors['far_hand'] = fh

    # --- Legs (far, then near) ---
    def leg(side, hip_pt, angles, toe):
        knee = ext(hip_pt, THIGH, angles[0])
        ankle = ext(knee, SHIN, angles[1])
        cv.line(f'{side}_leg', hip_pt, knee, 3.2)
        cv.line(f'{side}_leg', knee, ankle, 2.9)
        # Shoe: points forwards, square to the shin (heel strike tips the toe up, a push-off points it down).
        direction = max(10.0, min(125.0, angles[1] + 90.0 - toe))
        heel = ext(ankle, -1.1, direction)
        toe_pt = ext(ankle, 3.3, direction)
        down = ext((0.0, 0.0), 0.5, direction - 90.0)
        cv.line(f'{side}_shoe', (heel[0] + down[0], heel[1] + down[1]), (toe_pt[0] + down[0], toe_pt[1] + down[1]), 2.5)
        return ankle

    far_hip = (hip[0] - 1.0, hip[1])
    near_hip = (hip[0] + 0.9, hip[1])
    leg('far', far_hip, p['fl'], p['toe'][1])
    leg('near', near_hip, p['nl'], p['toe'][0])

    # Shorts: over the hips and the tops of both thighs.
    for side, h, ang in (('far', far_hip, p['fl']), ('near', near_hip, p['nl'])):
        cv.line('shorts', h, ext(h, THIGH * 0.55, ang[0]), 4.0)
    cv.poly('shorts', [(hip[0] - 3.3, hip[1] - 1.4), (hip[0] + 3.5, hip[1] - 1.4), (hip[0] + 3.5, hip[1] + 1.2), (hip[0] - 3.3, hip[1] + 1.2)])

    # --- Torso: a hoodie, slightly wider at the hem, with the hood bunched behind the neck ---
    def T(pt):
        return rot(pt, hip, lean)
    x0, y0 = hip
    torso = [(x0 - 3.9, y0 + 0.8), (x0 + 4.2, y0 + 0.8), (x0 + 4.5, y0 - 3.0), (x0 + 3.9, y0 - 7.2),
             (x0 + 2.2, y0 - TORSO_H - 0.4), (x0 - 2.0, y0 - TORSO_H - 0.4), (x0 - 4.0, y0 - 7.0), (x0 - 4.3, y0 - 3.0)]
    cv.poly('torso', [T(q) for q in torso])
    cv.line('neck', T((x0 + 0.6, y0 - TORSO_H)), T((x0 + 0.8, y0 - TORSO_H - 1.6)), 2.4)
    cv.poly('hood', [T(q) for q in ellipse_pts(x0 - 2.2, y0 - TORSO_H + 0.4, 2.4, 1.9)])
    cv.poly('hilite', [T(q) for q in [(x0 - 3.0, y0 - 7.6), (x0 + 1.6, y0 - TORSO_H - 0.2), (x0 + 1.6, y0 - TORSO_H + 0.8), (x0 - 2.6, y0 - 6.6)]])

    # --- Head ---
    hc = head_c
    tilt = -p['tilt']

    def Hd(pts):
        return [rot((hc[0] + x, hc[1] + y), hc, tilt) for x, y in pts]

    cv.poly('head', Hd(ellipse_pts(0.2, 0.2, HEAD_R - 0.1, HEAD_R - 0.4)))
    cv.poly('head', Hd([(3.0, 0.0), (5.9, 1.0), (5.6, 2.4), (4.2, 3.6), (2.0, 4.6)]))  # nose and cheek
    cv.poly('ear', Hd(ellipse_pts(-0.8, 1.3, 0.9, 1.2)))
    # Hair: a cap over the top and back, a fringe at the front, tufts at the crown.
    cv.poly('hair', Hd([(-5.4, 3.4), (-5.9, 0.0), (-5.0, -4.0), (-2.2, -6.1), (1.6, -6.3), (4.4, -4.9), (5.7, -2.6),
                        (5.6, -1.2), (3.8, -1.8), (2.2, -1.0), (0.6, -1.4), (-0.6, -0.6), (-1.6, 0.4), (-2.2, 3.0), (-3.6, 4.2)]))
    cv.poly('hair', Hd([(0.2, -6.0), (1.4, -7.4), (2.4, -6.0)]))
    anchors['head'] = hc

    # Face: eye, mouth (drawn as their own layers, on top).
    eye = Hd([(3.1, -0.2)])[0]
    if p['eye'] == 'closed' or p['eye'] == 'happy':
        cv.line('eye', (eye[0] - 0.6, eye[1] + 0.3), (eye[0] + 0.6, eye[1] + 0.3), 0.9)
    elif p['eye'] == 'wide':
        cv.poly('eye', [(eye[0] - 0.5, eye[1] - 1.3), (eye[0] + 0.6, eye[1] - 1.3), (eye[0] + 0.6, eye[1] + 0.9), (eye[0] - 0.5, eye[1] + 0.9)])
    else:
        cv.poly('eye', [(eye[0] - 0.5, eye[1] - 0.8), (eye[0] + 0.6, eye[1] - 0.8), (eye[0] + 0.6, eye[1] + 0.9), (eye[0] - 0.5, eye[1] + 0.9)])
    mouth = Hd([(3.6, 2.9)])[0]
    if p['mouth'] == 'smile':
        cv.line('mouth', (mouth[0] - 0.7, mouth[1]), (mouth[0] + 0.5, mouth[1]), 0.9)
    elif p['mouth'] in ('open', 'o'):
        r = 0.9 if p['mouth'] == 'o' else 1.0
        cv.circle('mouth', (mouth[0] + (0.6 if p['mouth'] == 'o' else 0), mouth[1]), r)
    if p['eye'] == 'happy':
        cv.circle('blush', Hd([(1.6, 2.0)])[0], 0.8)

    # --- Near arm (in front of everything) ---
    ns = (shoulder[0] + 1.6, shoulder[1] + 1.8)
    ne = ext(ns, UPPER_ARM, p['na'][0] + lean * 0.3)
    nh = ext(ne, FOREARM, p['na'][1] + lean * 0.3)
    cv.line('near_arm', ns, ne, 3.0)
    cv.line('near_arm', ne, ext(ne, FOREARM - 1.0, p['na'][1] + lean * 0.3), 2.7)
    cv.circle('near_hand', nh, 1.35)
    anchors['hand'] = nh
    anchors['between_hands'] = ((nh[0] + fh[0]) / 2, (nh[1] + fh[1]) / 2)


def draw_back(cv: Canvas, p, anchors):
    """Climbing: seen from behind, both arms and legs visible."""
    dy = p['dy']
    hip = (CX, HIP_Y + dy)
    lift = p['nl']        # (left knee lift 0..1, right knee lift 0..1)
    arms = p['na']        # (left hand height, right hand height) above the shoulder, art px

    # Legs: a raised knee looks shorter from behind (foreshortened).
    for i, side in enumerate((-1, 1)):
        h = (hip[0] + side * 1.7, hip[1])
        k = lift[i]
        knee = (h[0] + side * 0.5 * k, h[1] + THIGH * (1 - 0.55 * k))
        ankle = (knee[0], knee[1] + SHIN * (1 - 0.15 * k))
        name = 'near_leg' if side > 0 else 'far_leg'
        cv.line(name, h, knee, 2.9)
        cv.line(name, knee, ankle, 2.6)
        shoe = 'near_shoe' if side > 0 else 'far_shoe'
        cv.line(shoe, (ankle[0] - 0.4, ankle[1] + 0.4), (ankle[0] + 0.4, ankle[1] + 0.4), 2.7)
    cv.poly('shorts', [(hip[0] - 3.6, hip[1] - 1.4), (hip[0] + 3.6, hip[1] - 1.4), (hip[0] + 3.9, hip[1] + 2.4),
                       (hip[0] - 3.9, hip[1] + 2.4)])

    x0, y0 = hip
    cv.poly('torso', [(x0 - 4.0, y0 + 0.6), (x0 + 4.0, y0 + 0.6), (x0 + 4.4, y0 - 6.6), (x0 + 2.6, y0 - TORSO_H - 0.2),
                      (x0 - 2.6, y0 - TORSO_H - 0.2), (x0 - 4.4, y0 - 6.6)])
    cv.poly('hood', ellipse_pts(x0, y0 - TORSO_H + 1.2, 3.0, 1.8))
    cv.poly('hilite', [(x0 - 4.0, y0 - 6.8), (x0 - 2.2, y0 - TORSO_H), (x0 - 1.2, y0 - TORSO_H + 0.4), (x0 - 3.2, y0 - 6.0)])

    hc = (x0, y0 - TORSO_H - HEAD_R + 0.8)
    cv.poly('head', ellipse_pts(hc[0], hc[1], HEAD_R - 0.6, HEAD_R - 0.5))
    cv.circle('ear', (hc[0] - HEAD_R + 0.5, hc[1] + 0.8), 1.2)
    cv.circle('ear', (hc[0] + HEAD_R - 0.5, hc[1] + 0.8), 1.2)
    cv.poly('hair', ellipse_pts(hc[0], hc[1] - 0.6, HEAD_R - 0.4, HEAD_R - 0.6))
    cv.poly('hair', [(hc[0] - 0.8, hc[1] - 5.6), (hc[0] + 0.2, hc[1] - 7.0), (hc[0] + 1.2, hc[1] - 5.6)])
    anchors['head'] = hc

    # Arms: hands up on the rungs, at the heights given.
    for i, side in enumerate((-1, 1)):
        s = (x0 + side * 3.6, y0 - TORSO_H + 1.6)
        hand = (x0 + side * 4.6, s[1] - arms[i])
        bend = max(0.0, 1.0 - arms[i] / 14.0)   # a low hand bends the elbow out more
        elbow = (x0 + side * (5.4 + 1.6 * bend), (s[1] + hand[1]) / 2 + 0.4)
        name = 'near_arm' if side > 0 else 'far_arm'
        cv.line(name, s, elbow, 2.6)
        cv.line(name, elbow, hand, 2.4)
        cv.circle('near_hand' if side > 0 else 'far_hand', hand, 1.35)
        anchors['hand' if side > 0 else 'far_hand'] = hand
    anchors['between_hands'] = (x0, y0 - TORSO_H - 2.0)


# ---- Poses --------------------------------------------------------------------------------

def walk(t, run=False):
    """One frame of a walk (or run) cycle at phase t in [0, 1)."""
    a = 2 * math.pi * t
    if not run:
        swing, knee, arm = 24.0, 46.0, 24.0
    else:
        swing, knee, arm = 38.0, 78.0, 40.0

    def leg(ph):
        thigh = swing * math.sin(ph)
        # The knee bends while the leg swings forwards (and a little on contact).
        bend = knee * max(0.0, math.cos(ph)) ** 1.3 + (6 if not run else 10)
        return (thigh, thigh - bend)

    nl, fl = leg(a), leg(a + math.pi)
    na_up = -arm * math.sin(a)
    fa_up = arm * math.sin(a)
    elbow = 18 if not run else 70
    bob = -(1 - abs(math.sin(a))) * (1.0 if not run else 1.6)
    toe_n = 30 * max(0.0, -math.sin(a)) if True else 0
    toe_f = 30 * max(0.0, math.sin(a))
    return P(dy=bob, lean=(3 if not run else 11), nl=nl, fl=fl,
             na=(na_up, na_up + elbow), fa=(fa_up, fa_up + elbow),
             toe=(toe_n, toe_f), mouth='none' if not run else 'open' if t > 0.4 else 'none')


STAND = dict(nl=(2, 0), fl=(-3, -2), na=(-4, 6), fa=(6, 14))

POSES: dict[str, list] = {}
POSES['idle'] = [P(**STAND), P(**{**STAND, 'dy': 0.5}), P(**{**STAND, 'dy': 0.5, 'na': (-3, 8)}), P(**{**STAND, 'eye': 'closed'})]
POSES['walk'] = [walk(i / 8) for i in range(8)]
POSES['run'] = [walk(i / 6, run=True) for i in range(6)]
POSES['jump'] = [P(dy=-1.0, lean=6, nl=(55, -20), fl=(-20, -60), na=(40, 120), fa=(-20, 30), toe=(30, 40), grounded=False, mouth='open')]
POSES['air'] = [P(dy=-3.0, lean=4, nl=(55, -10), fl=(20, -50), na=(70, 140), fa=(-40, -10), toe=(20, 30), grounded=False, mouth='smile')]
POSES['fall'] = [P(dy=-1.5, lean=-2, nl=(12, 2), fl=(-14, -24), na=(110, 150), fa=(-100, -140), toe=(10, 20), grounded=False, eye='wide', mouth='o'),
                 P(dy=-1.5, lean=-2, nl=(6, -6), fl=(-8, -16), na=(120, 160), fa=(-110, -150), toe=(10, 20), grounded=False, eye='wide', mouth='o')]
POSES['land'] = [P(dy=3.2, lean=14, nl=(66, -26), fl=(44, -44), na=(30, 70), fa=(40, 80), toe=(0, 0))]
POSES['climb'] = [P(view='back', nl=(0.0, 0.8), na=(13.0, 6.0), grounded=True),
                  P(view='back', nl=(0.3, 0.4), na=(10.5, 8.5), grounded=True),
                  P(view='back', nl=(0.8, 0.0), na=(6.0, 13.0), grounded=True),
                  P(view='back', nl=(0.4, 0.3), na=(8.5, 10.5), grounded=True)]
POSES['climb_idle'] = [P(view='back', nl=(0.2, 0.2), na=(10.0, 9.0), grounded=True)]
# Picking the ball up off the ground: bend, reach, grab, stand.
POSES['pickup'] = [P(dy=1.0, lean=14, nl=(34, -12), fl=(10, -24), na=(30, 40), fa=(20, 30)),
                   P(dy=3.4, lean=34, nl=(62, -10), fl=(40, -30), na=(46, 40), fa=(30, 30), tilt=-10),
                   P(dy=4.0, lean=40, nl=(66, -10), fl=(46, -30), na=(30, 20), fa=(24, 16), tilt=-14),
                   P(dy=1.4, lean=16, nl=(34, -12), fl=(14, -24), na=(50, 110), fa=(44, 110), mouth='smile'),
                   P(dy=0.0, lean=4, nl=(4, -2), fl=(-4, -6), na=(40, 100), fa=(34, 100), mouth='smile')]
POSES['catch'] = [P(dy=0, lean=-11, nl=(6, -2), fl=(-8, -10), na=(118, 148), fa=(108, 140), tilt=14, eye='wide', mouth='o'),
                  P(dy=0.6, lean=2, nl=(8, -6), fl=(-6, -12), na=(60, 115), fa=(50, 115), mouth='smile')]
# Throwing: the ball leaves his hand on the first frame (the game releases it then), then he follows through.
POSES['throw'] = [P(lean=6, nl=(20, 0), fl=(-18, -22), na=(44, 74), fa=(-30, 0), toe=(0, 30), mouth='open'),
                  P(lean=12, nl=(26, 2), fl=(-22, -30), na=(104, 112), fa=(-40, -10), toe=(0, 40), mouth='open'),
                  P(lean=10, nl=(22, 2), fl=(-14, -26), na=(60, 50), fa=(-10, 20), toe=(0, 30), mouth='smile'),
                  P(lean=4, nl=(8, 0), fl=(-6, -10), na=(10, 20), fa=(10, 20), mouth='smile')]
POSES['throw_up'] = [P(lean=-4, nl=(8, 0), fl=(-10, -14), na=(48, 100), fa=(30, 60), tilt=10, toe=(30, 30), mouth='open'),
                     P(dy=-0.6, lean=-12, nl=(6, 0), fl=(-8, -12), na=(132, 160), fa=(60, 100), tilt=20, toe=(40, 40), mouth='open', grounded=True),
                     P(lean=-10, nl=(6, 0), fl=(-8, -12), na=(122, 145), fa=(40, 70), tilt=16, mouth='smile'),
                     P(lean=0, nl=(4, 0), fl=(-4, -6), na=(20, 30), fa=(10, 20), tilt=6, mouth='smile')]
# Pulling a lever: reach up and forwards, then haul it down.
POSES['pull'] = [P(lean=-2, nl=(14, 0), fl=(-12, -16), na=(104, 118), fa=(100, 120), tilt=8),
                 P(lean=-6, nl=(14, 0), fl=(-12, -16), na=(112, 132), fa=(108, 132), tilt=12, toe=(0, 20)),
                 P(lean=-6, nl=(20, 8), fl=(-6, -10), na=(70, 90), fa=(60, 80), mouth='o'),
                 P(lean=-2, nl=(10, 2), fl=(-6, -10), na=(30, 50), fa=(20, 40), mouth='smile')]
# Opening a gate: reach forwards and push it open.
POSES['open'] = [P(lean=8, nl=(16, 0), fl=(-14, -18), na=(70, 85), fa=(40, 60)),
                 P(lean=16, nl=(24, 4), fl=(-20, -28), na=(88, 92), fa=(60, 80), toe=(0, 30)),
                 P(lean=6, nl=(12, 0), fl=(-10, -14), na=(40, 60), fa=(20, 40), mouth='smile')]
# Calling Melody: hand to mouth, whistle.
POSES['call'] = [P(lean=-2, na=(60, 160), tilt=8, mouth='o', **{k: STAND[k] for k in ('nl', 'fl', 'fa')}),
                 P(lean=-6, dy=-0.4, na=(70, 170), tilt=14, mouth='o', **{k: STAND[k] for k in ('nl', 'fl', 'fa')}),
                 P(lean=-6, dy=-0.4, na=(70, 170), tilt=14, mouth='o', eye='closed', **{k: STAND[k] for k in ('nl', 'fl', 'fa')})]
# "Sit!": point down at the ground in front of him.
POSES['point'] = [P(lean=6, na=(60, 70), tilt=-4, mouth='open', **{k: STAND[k] for k in ('nl', 'fl', 'fa')}),
                  P(lean=10, na=(50, 30), tilt=-10, mouth='open', **{k: STAND[k] for k in ('nl', 'fl', 'fa')}),
                  P(lean=10, na=(50, 30), tilt=-10, mouth='smile', **{k: STAND[k] for k in ('nl', 'fl', 'fa')})]
# Cheering (GOAL! / level done): crouch, jump with both arms up.
POSES['cheer'] = [P(dy=1.6, lean=8, nl=(30, -14), fl=(20, -26), na=(20, 60), fa=(30, 70), eye='happy', mouth='smile'),
                  P(dy=-3.0, lean=-12, nl=(10, -10), fl=(-4, -20), na=(130, 160), fa=(140, 175), eye='happy', mouth='open', grounded=False),
                  P(dy=-3.6, lean=-12, nl=(8, -12), fl=(-6, -22), na=(134, 164), fa=(145, 178), eye='happy', mouth='open', grounded=False),
                  P(dy=0.8, lean=4, nl=(14, -8), fl=(4, -16), na=(110, 150), fa=(120, 150), eye='happy', mouth='smile')]
# Waiting about: hands behind his back, rock on his heels, look up, tap a foot.
_WAIT = dict(nl=(2, 0), fl=(-3, -2), na=(-28, -12), fa=(-22, -6))
POSES['wait'] = [P(**_WAIT), P(**{**_WAIT, 'toe': (-20, -20), 'dy': -0.4}), P(**{**_WAIT, 'tilt': 14}),
                 P(**{**_WAIT, 'tilt': 18, 'eye': 'closed', 'mouth': 'smile'}), P(**{**_WAIT, 'tilt': 10, 'toe': (30, 0), 'nl': (10, 0)}),
                 P(**{**_WAIT, 'toe': (0, 0)})]

ANIMS = {
    'idle': dict(rate=4, repeat=-1), 'walk': dict(rate=10, repeat=-1), 'run': dict(rate=12, repeat=-1),
    'jump': dict(rate=1, repeat=-1), 'air': dict(rate=1, repeat=-1), 'fall': dict(rate=6, repeat=-1), 'land': dict(rate=10, repeat=0),
    'climb': dict(rate=8, repeat=-1), 'climb_idle': dict(rate=1, repeat=-1),
    'pickup': dict(rate=14, repeat=0), 'catch': dict(rate=10, repeat=0),
    'throw': dict(rate=14, repeat=0), 'throw_up': dict(rate=14, repeat=0),
    'pull': dict(rate=10, repeat=0), 'open': dict(rate=10, repeat=0),
    'call': dict(rate=8, repeat=0), 'point': dict(rate=10, repeat=0),
    'cheer': dict(rate=8, repeat=0), 'wait': dict(rate=5, repeat=0),
}
# Animations where he stands on the ground: every frame's feet on the bottom row (art:check checks).
GROUNDED = ['idle', 'walk', 'run', 'land', 'climb', 'climb_idle', 'pickup', 'catch', 'throw', 'throw_up', 'pull', 'open', 'call', 'point', 'wait']

# Holding the football: these animations get carrying arms in the carry skin (both hands round the
# ball in front of his chest). The others are the same in both skins.
CARRY_ANIMS = ['idle', 'walk', 'run', 'jump', 'air', 'fall', 'land', 'wait']


def carry_pose(p):
    if p['view'] == 'back':
        return p
    q = dict(p)
    bob = math.sin(len(str(p['nl'])))  # unused: keep poses deterministic
    del bob
    q['na'] = (22, 92)
    q['fa'] = (16, 88)
    return q


# ---- Build the sheets ----------------------------------------------------------------------

def frame_image(p):
    img, anchors = render(p)
    if p['grounded']:
        # Snap the lowest pixel onto the ground line, so his feet are on the bottom row.
        bbox = img.getbbox()
        if bbox:
            shift = H - bbox[3]
            if shift:
                moved = Image.new('RGBA', (W, H), (0, 0, 0, 0))
                moved.paste(img, (0, shift))
                img = moved
                anchors = {k: (v[0], v[1] + shift) for k, v in anchors.items()}
    return img, anchors


def build():
    names = list(ANIMS)
    frames = []      # (anim, pose)
    layout = {}
    for n in names:
        start = len(frames)
        for pose in POSES[n]:
            frames.append((n, pose))
        layout[n] = list(range(start, len(frames)))

    rows = math.ceil(len(frames) / COLS)
    fw, fh = W * UPSCALE, H * UPSCALE
    sheet_w = COLS * fw + (COLS - 1) * SPACING
    sheet_h = rows * fh + (rows - 1) * SPACING

    anchors_out = {'normal': [], 'carry': []}
    sheets = {}
    for skin in ('normal', 'carry'):
        sheet = Image.new('RGBA', (sheet_w, sheet_h), (0, 0, 0, 0))
        for i, (anim, pose) in enumerate(frames):
            p = carry_pose(pose) if skin == 'carry' and anim in CARRY_ANIMS else pose
            img, anchors = frame_image(p)
            big = img.resize((fw, fh), Image.NEAREST)
            col, row = i % COLS, i // COLS
            sheet.paste(big, (col * (fw + SPACING), row * (fh + SPACING)))
            # Anchors in screen px from the frame's bottom-centre (x forwards, y up is negative).
            key = 'between_hands' if (skin == 'carry' and anim in CARRY_ANIMS) else 'hand'
            hx, hy = anchors[key]
            ball = [round((hx - W / 2) * UPSCALE), round((hy - H) * UPSCALE)]
            if skin == 'carry' and anim in CARRY_ANIMS:
                ball[0] += 2           # the ball sits just in front of his hands
            anchors_out[skin].append(ball)
        sheets[skin] = sheet

    os.makedirs(SPRITES_DIR, exist_ok=True)
    # Never paint over hand-drawn sheets: only overwrite files this script wrote itself.
    previous = {}
    if os.path.exists(OUT_JSON):
        with open(OUT_JSON) as f:
            previous = json.load(f).get('generated', {})
    written = {}
    for skin, name in (('normal', 'boy.png'), ('carry', 'boy_carry.png')):
        path = os.path.join(SPRITES_DIR, name)
        if os.path.exists(path) and not FORCE and previous.get(name) != sha1(path):
            raise SystemExit(f'{name} was drawn by hand (it isn\'t the one this script made), so it was left alone.\n'
                             'Run with --force to replace it with the generated placeholder art.')
        sheets[skin].save(path, optimize=True)
        written[name] = sha1(path)

    meta = {
        'about': 'Written by tools/sprites/make_boy.py. Frames are 64x80 with 4px gaps, facing right, feet on the bottom row; '
                 'ball[i] is where the held football goes in frame i (px from the frame\'s bottom-centre, x forwards, y up is negative).',
        'frameWidth': fw,
        'frameHeight': fh,
        'spacing': SPACING,
        'variants': {'normal': 'assets/sprites/boy.png', 'carry': 'assets/sprites/boy_carry.png'},
        'grounded': GROUNDED,
        'carryAnimations': CARRY_ANIMS,
        'animations': {n: {'frames': layout[n], 'frameRate': ANIMS[n]['rate'], 'repeat': ANIMS[n]['repeat']} for n in names},
        'ball': anchors_out,
        'generated': written,
    }
    os.makedirs(os.path.dirname(OUT_JSON), exist_ok=True)
    with open(OUT_JSON, 'w') as f:
        json.dump(meta, f, indent=1)
        f.write('\n')
    preview(frames, layout, sheets)
    print(f'{len(frames)} frames, {rows} rows: boy.png / boy_carry.png {sheet_w}x{sheet_h}, boySheet.json')


def preview(frames, layout, sheets):
    """Contact sheet: each animation in a row, both skins, on a ground line, labelled."""
    fw, fh = W * UPSCALE, H * UPSCALE
    font = ImageFont.load_default()
    names = list(layout)
    max_frames = max(len(v) for v in layout.values())
    label_w = 96
    cell = fw + 6
    row_h = fh + 10
    img = Image.new('RGBA', (label_w + 2 * max_frames * cell + 30, len(names) * row_h + 10), (196, 222, 236, 255))
    d = ImageDraw.Draw(img)
    for r, n in enumerate(names):
        y = 5 + r * row_h
        d.text((6, y + fh // 2 - 6), n, fill=(30, 58, 95, 255), font=font)
        for s, skin in enumerate(('normal', 'carry')):
            x0 = label_w + s * (max_frames * cell + 30)
            d.line([(x0, y + fh), (x0 + len(layout[n]) * cell, y + fh)], fill=(76, 175, 80, 255), width=2)
            for j, idx in enumerate(layout[n]):
                col, row = idx % COLS, idx // COLS
                src = sheets[skin].crop((col * (fw + SPACING), row * (fh + SPACING), col * (fw + SPACING) + fw, row * (fh + SPACING) + fh))
                img.alpha_composite(src, (x0 + j * cell, y))
    img.save(os.path.join(ROOT, 'boy_preview.png'))


def sha1(path):
    """Fingerprint of the pixels (not the file bytes, which copying tools may add metadata to)."""
    import hashlib
    with Image.open(path) as im:
        return hashlib.sha1(im.convert('RGBA').tobytes()).hexdigest()


FORCE = False

if __name__ == '__main__':
    import sys
    FORCE = '--force' in sys.argv
    build()
