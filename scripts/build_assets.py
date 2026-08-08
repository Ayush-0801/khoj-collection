"""Produce the two things the loader needs from Logo.png:
  assets/img/khoj-ink.png  - the red ink alone, antialiased, on transparency
  assets/js/khoj-path.js   - the pen path in that image's coordinate space
"""
import json
import os

import numpy as np
from PIL import Image

from penpath import STROKES

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MARGIN = 24

src = Image.open(f"{REPO}/Logo.png").convert("RGB")
a = np.asarray(src).astype(float)
r, g, b = a[:, :, 0], a[:, :, 1], a[:, :, 2]

# Ink opacity: how far each pixel is from the white paper, along the red axis.
redness = r - (g + b) / 2.0
alpha = np.clip((redness - 6.0) / 46.0, 0, 1)

core = redness > 130  # only the fully saturated interior of the stroke
ink_rgb = a[core].mean(axis=0)
print("ink colour:", tuple(int(v) for v in ink_rgb), "->", "#%02x%02x%02x" % tuple(int(v) for v in ink_rgb))

ys, xs = np.nonzero(alpha > 0.35)
x0, y0 = int(max(0, xs.min() - MARGIN)), int(max(0, ys.min() - MARGIN))
x1, y1 = int(min(src.width, xs.max() + MARGIN)), int(min(src.height, ys.max() + MARGIN))
w, h = x1 - x0, y1 - y0
print(f"crop: {x0},{y0} -> {x1},{y1}  ({w}x{h})")

out = np.zeros((src.height, src.width, 4), np.uint8)
out[:, :, 0] = int(ink_rgb[0])
out[:, :, 1] = int(ink_rgb[1])
out[:, :, 2] = int(ink_rgb[2])
out[:, :, 3] = (alpha * 255).astype(np.uint8)
ink = Image.fromarray(out).crop((x0, y0, x1, y1))
ink.save(f"{REPO}/assets/img/khoj-ink.png")
print("wrote assets/img/khoj-ink.png", ink.size)

strokes = [[[round(x - x0, 1), round(y - y0, 1)] for x, y in s] for s in STROKES]
tip = strokes[-1][-1]

js = f"""// Generated from Logo.png by scripts/build_assets.py - do not hand-edit.
// The order in which a pen writes the Khoj signature, in the coordinate space
// of assets/img/khoj-ink.png ({w} x {h}). Each stroke is one pen-down run.
window.KHOJ_PATH = {{
  width: {w},
  height: {h},
  ink: '#{"%02x%02x%02x" % tuple(int(v) for v in ink_rgb)}',
  // The pen lifts here, at the end of the circle's tail. The thread that
  // carries the intro grows out of this exact point.
  tip: {json.dumps(tip)},
  strokes: {json.dumps(strokes)}
}};
"""
open(f"{REPO}/assets/js/khoj-path.js", "w").write(js)
print("wrote assets/js/khoj-path.js; tip =", tip)
