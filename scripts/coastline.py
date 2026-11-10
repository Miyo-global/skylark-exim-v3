"""
The hero globe's coastlines (src/home/coast.ts), traced from the site's own earth texture, so the picture adds no new
source: python3 scripts/coastline.py

Sea is the dark blue of public/textures/earth_day_2048.webp; the land/sea edge is traced, turned onto the sphere the way
src/home/Orbit.tsx turns it (the same centre and radius), cut at the limb and thinned to a faint line's worth of points.
Needs ffmpeg, numpy and scikit-image.
"""
import subprocess, tempfile, os, re
import numpy as np
from skimage import filters, io, measure

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
orbit = open(os.path.join(ROOT, 'src/home/Orbit.tsx')).read()
R, LON0, LAT0 = (float(re.search(rf'const {k} = (\d+)', orbit).group(1)) for k in ('R', 'LON0', 'LAT0'))
W, H = 1440, 720

png = os.path.join(tempfile.mkdtemp(), 'earth.png')
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', os.path.join(ROOT, 'public/textures/earth_day_2048.webp'), '-vf', f'scale={W}:{H}', png], check=True)
rgb = io.imread(png).astype(float)
# sea: blue well over green (forest and tundra are as green as they are blue; snow and ice are bright in both)
sea = (rgb[..., 2] - rgb[..., 1]) > 25
land = filters.gaussian((~sea).astype(float), 1.4)

rad = np.pi / 180
s0, c0 = np.sin(LAT0 * rad), np.cos(LAT0 * rad)
paths = []
for c in measure.find_contours(land, 0.5):
    if len(c) < 90:  # islets and lakes: noise at a globe a few hundred px wide
        continue
    lat = (90 - c[:, 0] / H * 180) * rad
    lon = (c[:, 1] / W * 360 - 180 - LON0) * rad
    x = R * np.cos(lat) * np.sin(lon)
    y = -R * (c0 * np.sin(lat) - s0 * np.cos(lat) * np.cos(lon))
    front = s0 * np.sin(lat) + c0 * np.cos(lat) * np.cos(lon) > 0.03
    # runs of points on the near side
    start = None
    for i in range(len(front) + 1):
        on = i < len(front) and front[i]
        if on and start is None:
            start = i
        if not on and start is not None:
            run = measure.approximate_polygon(np.column_stack([x[start:i], y[start:i]]), 0.45)
            if len(run) > 3:
                paths.append('M' + 'L'.join(f'{px:.1f} {py:.1f}' for px, py in run))
            start = None

d = ''.join(paths)
out = os.path.join(ROOT, 'src/home/coast.ts')
open(out, 'w').write(
    '/** The coastlines on the near side of the hero globe, in home/Orbit.tsx\'s frame (radius 100). Generated: scripts/coastline.py */\n'
    f"export const COAST = '{d}'\n"
)
print(len(paths), 'lines,', len(d), 'bytes ->', out)
