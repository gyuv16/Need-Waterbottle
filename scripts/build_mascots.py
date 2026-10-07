"""Build WaterBuddy's character frames from page-mascot sprite sheets (MIT).

Usage: python3 scripts/build_mascots.py /path/to/page-mascot

For every character it writes four aligned head frames (walk, ask, run, sad) to
src/assets/mascot/<id>/ and records colours sampled from the art in
src/assets/mascot/characters.json, so the drawn bodies match each head.

Animals keep their shoulders (the drawn body continues the fur). Humans are cut
at the neck so the drawn body can wear clothes in any colour.
"""
import json
import sys
from collections import Counter
from pathlib import Path

from PIL import Image

SRC = Path(sys.argv[1]) / 'characters'
OUT = Path(__file__).resolve().parent.parent / 'src' / 'assets' / 'mascot'
CW, CH, BASE = 320, 360, 356  # canvas, baseline (bottom of shoulders / neck)
QUALITY = 84

ANIMALS = {  # id: (sheet, tail)
    'cat': ('cat', 'long'), 'dog': ('pug', 'curl'), 'bear': ('bear', 'stub'), 'bunny': ('bunny', 'puff'),
    'fox': ('fox', 'bushy'), 'panda': ('panda', 'stub'), 'penguin': ('penguin', 'none'), 'tiger': ('tiger', 'long'),
    'koala': ('koala', 'stub'), 'raccoon': ('raccoon', 'bushy'), 'redpanda': ('redpanda', 'bushy'), 'hamster': ('hamster', 'stub'),
}
HUMANS = {
    'male': ['beard', 'cap', 'bald', 'builder', 'chef', 'grandpa', 'sikh', 'wizard'],
    'female': ['afro', 'ballerina', 'glasses', 'granny', 'hijabi', 'nurse', 'scientist', 'pirate', 'skater'],
}
# Frames per character: the nine head directions d0..d8 (row-major: up-left … down-right, d4 = facing you)
# plus the star-struck reaction used for the chase.
FRAMES = {f'd{r * 3 + c}': ('directions', r, c) for r in range(3) for c in range(3)}
FRAMES['run'] = ('reactions', 1, 1)


def fresh_dir(name):
    """Character folder with any frames from a previous build removed."""
    d = OUT / name
    d.mkdir(parents=True, exist_ok=True)
    for old in d.glob('*.webp'):
        old.unlink()
    return d


def cell(name, sheet, r, c):
    im = Image.open(SRC / name / f'{sheet}.png').convert('RGBA')
    w = im.width // 3
    out = im.crop((c * w, r * w, (c + 1) * w, (r + 1) * w))
    # Keep only the figure: the largest block of filled rows. This drops specks and strips that
    # bled in from neighbouring cells above or below (separated from the figure by a gap).
    a = out.getchannel('A').point(lambda v: 255 if v > 40 else 0)
    rows = [sum(1 for x in range(w) if a.getpixel((x, y))) for y in range(w)]
    blocks, start, gap = [], None, 0
    for y, n in enumerate(rows + [0] * 8):
        if n:
            start = y if start is None else start
            gap, end = 0, y
        elif start is not None:
            gap += 1
            if gap > 6:
                blocks.append((start, end))
                start = None
    top, bottom = max(blocks, key=lambda b: sum(rows[b[0]:b[1] + 1]))
    # Trim thin wisps at the very bottom so the shoulder line is clean.
    while bottom > top and rows[bottom] <= 60:
        bottom -= 1
    return out.crop((0, top, w, bottom + 1))


def opaque_span(im, y):
    xs = [x for x in range(im.width) if im.getpixel((x, y))[3] > 40]
    return (min(xs), max(xs)) if xs else None


def shoulders(im, bb):
    """Widest opaque span across the bottom tenth of a bust (robust to ragged fur edges)."""
    h = bb[3] - bb[1]
    spans = [opaque_span(im, y) for y in range(bb[3] - max(6, h // 10), bb[3] - 1)]
    spans = [sp for sp in spans if sp]
    return min(sp[0] for sp in spans), max(sp[1] for sp in spans)


def skin_tone(im, ny):
    """Most common skin-like colour in the cheek area (between the eyes and the neck)."""
    bb = im.getchannel('A').getbbox()
    cx = (bb[0] + bb[2]) // 2
    w = (bb[2] - bb[0]) // 4
    y0 = bb[1] + int((ny - bb[1]) * 0.6)
    px = [im.getpixel((x, y))[:3] for y in range(y0, ny - 4) for x in range(cx - w, cx + w) if im.getpixel((x, y))[3] > 250]
    skin = [(r, g, b) for r, g, b in px if r > g > b and r - b > 25 and r > 70]
    if not skin:
        return '#f2c4a0'
    c = Counter((r // 8 * 8, g // 8 * 8, b // 8 * 8) for r, g, b in skin).most_common(1)[0][0]
    return '#%02x%02x%02x' % c


def neck_row(im):
    """Narrowest row in the lower part of a bust: where the head meets the shoulders."""
    bb = im.getchannel('A').point(lambda v: 255 if v > 40 else 0).getbbox()
    top, bottom = bb[1], bb[3]
    best = None
    for y in range(int(top + (bottom - top) * 0.55), bottom - 8):
        s = opaque_span(im, y)
        if s and (best is None or s[1] - s[0] < best[1]):
            best = (y, s[1] - s[0])
    return best[0]


def place(part, anchor_x, scale):
    part = part.resize((round(part.width * scale), round(part.height * scale)), Image.LANCZOS)
    canvas = Image.new('RGBA', (CW, CH), (0, 0, 0, 0))
    y = BASE - part.height
    if y < 0:
        part = part.crop((0, -y, part.width, part.height))
        y = 0
    canvas.alpha_composite(part, (round(CW / 2 - anchor_x * scale), y))
    return canvas


def colours(im, y0, y1):
    px = [im.getpixel((x, y))[:3] for y in range(y0, y1) for x in range(im.width) if im.getpixel((x, y))[3] > 250]
    common = Counter((r // 8 * 8, g // 8 * 8, b // 8 * 8) for r, g, b in px if max(r, g, b) > 28).most_common()
    return ['#%02x%02x%02x' % c for c, _ in common]


def sample(im, y0, y1, ranges):
    px = [im.getpixel((x, y))[:3] for y in range(y0, y1) for a, b in ranges for x in range(a, b) if im.getpixel((x, y))[3] > 250]
    common = Counter((r // 8 * 8, g // 8 * 8, b // 8 * 8) for r, g, b in px if max(r, g, b) > 28).most_common()
    return ['#%02x%02x%02x' % c for c, _ in common]


def lum(h):
    r, g, b = (int(h[i:i + 2], 16) for i in (1, 3, 5))
    return 0.3 * r + 0.59 * g + 0.11 * b


meta = {'animals': {}, 'humans': {'male': [], 'female': []}}

for cid, (sheet, tail) in ANIMALS.items():
    d = fresh_dir(cid)
    front = cell(sheet, 'directions', 1, 1)
    fbb = front.getchannel('A').point(lambda v: 255 if v > 40 else 0).getbbox()
    scale = 250 / (fbb[2] - fbb[0])  # one scale per character, so turning the head never resizes it
    fx0, fx1 = shoulders(front, fbb)
    for frame, (s, r, c) in FRAMES.items():
        im = cell(sheet, s, r, c)
        bb = im.getchannel('A').point(lambda v: 255 if v > 40 else 0).getbbox()
        x0, x1 = shoulders(im, bb)
        # Reactions are drawn a little larger than directions: match their shoulders to the front frame.
        k = scale * (fx1 - fx0) / (x1 - x0) if s == 'reactions' else scale
        place(im.crop(bb), (x0 + x1) / 2 - bb[0], k).save(d / f'{frame}.webp', quality=QUALITY, method=6)
    y0, y1 = fbb[3] - int((fbb[3] - fbb[1]) * 0.12), fbb[3] - 4
    span = fx1 - fx0
    edge = sample(front, y0, y1, [(fx0 + 6, fx0 + span // 5), (fx1 - span // 5, fx1 - 6)])
    centre = sample(front, y0, y1, [(fx0 + span * 2 // 5, fx1 - span * 2 // 5)])
    body = edge[0]
    belly = next((c for c in centre if abs(lum(c) - lum(body)) > 40), centre[0] if centre else '#f3f3f3')
    meta['animals'][cid] = {'body': body, 'belly': belly, 'tail': tail, 'shoulder': round(span * scale)}

for sex, names in HUMANS.items():
    for name in names:
        d = fresh_dir(name)
        front = cell(name, 'directions', 1, 1)
        fny = neck_row(front)
        fbb = front.crop((0, 0, front.width, fny + 1)).getchannel('A').point(lambda v: 255 if v > 40 else 0).getbbox()
        scale = 200 / (fbb[2] - fbb[0])
        fneck = opaque_span(front, fny)
        for frame, (s, r, c) in FRAMES.items():
            im = cell(name, s, r, c)
            ny = neck_row(im)
            head = im.crop((0, 0, im.width, ny + 1))
            bb = head.getchannel('A').point(lambda v: 255 if v > 40 else 0).getbbox()
            x0, x1 = opaque_span(head, ny)
            k = scale
            if s == 'reactions':  # drawn larger: match the neck width of the front frame
                k = scale * (fneck[1] - fneck[0]) / max(1, x1 - x0)
            place(head.crop(bb), (x0 + x1) / 2 - bb[0], k).save(d / f'{frame}.webp', quality=QUALITY, method=6)
        meta['humans'][sex].append({'id': name, 'skin': skin_tone(front, fny)})

# Pip the mouse (companion): peek, run, hide.
d = fresh_dir('mouse')
for mood, (s, r, c) in {'peek': ('directions', 0, 2), 'run': ('reactions', 2, 2), 'hide': ('reactions', 1, 0)}.items():
    im = cell('mouse', s, r, c)
    bb = im.getchannel('A').point(lambda v: 255 if v > 40 else 0).getbbox()
    x0, x1 = shoulders(im, bb)
    place(im.crop(bb), (x0 + x1) / 2 - bb[0], 140 / (x1 - x0)).save(d / f'{mood}.webp', quality=QUALITY, method=6)

(OUT / 'characters.json').write_text(json.dumps(meta, indent=2))
print(json.dumps(meta, indent=1))
