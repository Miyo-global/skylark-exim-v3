"""Remove a sun (and its reflection on water) from a generated clip when NO sun may stay (STYLE.md, 11 Nov: sun out of
view or fully hidden). Unlike cg-sun-fix.py, nothing is mirrored in: inside each zone, pixels brighter than the
surrounding haze are pulled down to it. The haze level comes from inpainting a blurred, downsampled brightness map
across the zone, so dark palm fronds in front of the sun keep their shape. 0 credits.
  python3 scripts/cg-sun-cap.py <in.mp4> <out.mp4> --zone F:X:Y:RX:RY ... [--zone ...] [--xmax X] [--ramp N]
Each --zone is one track (points joined by straight lines) and is active only between its first and last frame; its
strength ramps in and out over --ramp frames (no ramp-out at the clip's last frame). --xmax keeps pixels right of X
untouched (e.g. the white truck). Used on:
  p2 (cg-sample) 480p test E1  --zone 0:237:74:48:26 20:240:70:48:26 40:252:70:48:26
                               --zone 38:282:112:72:60 51:290:160:72:60 61:294:150:72:60 81:294:140:72:60 120:294:138:72:60
                               --zone 58:268:224:70:40 69:321:237:62:32 85:310:231:62:36 101:312:252:62:56 120:318:250:62:52 --xmax 362
ponytail: hand-measured zones per take; re-measure on the HD (scale x, y, rx, ry by width/854).
"""
import argparse, subprocess
import cv2, numpy as np

ap = argparse.ArgumentParser()
ap.add_argument('src'); ap.add_argument('dst')
ap.add_argument('--zone', nargs='+', action='append', required=True)
ap.add_argument('--xmax', type=int, default=None)
ap.add_argument('--ramp', type=int, default=8)
ap.add_argument('--keep', type=float, default=0.15, help='share of the brightness above the haze that stays')
a = ap.parse_args()

def zone(pts):
    p = sorted(tuple(map(float, s.split(':'))) for s in pts)
    fs = [q[0] for q in p]
    return fs[0], fs[-1], lambda f: [float(np.interp(f, fs, [q[i] for q in p])) for i in (1, 2, 3, 4)]

zones = [zone(z) for z in a.zone]
cap = cv2.VideoCapture(a.src)
w, h, n = int(cap.get(3)), int(cap.get(4)), int(cap.get(7))
ff = subprocess.Popen(['ffmpeg', '-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'bgr24', '-s', f'{w}x{h}', '-r', '24', '-i', '-',
                       '-c:v', 'libx264', '-preset', 'slow', '-crf', '10', '-pix_fmt', 'yuv420p', a.dst], stdin=subprocess.PIPE)
f = 0
while True:
    ok, img = cap.read()
    if not ok:
        break
    mask = np.zeros((h, w), np.float32)
    for f0, f1, at in zones:
        if not f0 <= f <= f1:
            continue
        k = min(1.0, (f - f0 + 1) / a.ramp, 1.0 if f1 >= n - 1 else (f1 - f + 1) / a.ramp)
        x, y, rx, ry = at(f)
        z = np.zeros_like(mask)
        cv2.ellipse(z, (int(x), int(y)), (int(rx), int(ry)), 0, 0, 360, 1.0, -1)
        mask = np.maximum(mask, z * k)
    if mask.any():
        if a.xmax is not None:
            mask[:, a.xmax:] = 0
        hard = (mask > 0).astype(np.uint8)
        v = img.max(axis=2).astype(np.float32)
        s = 8  # haze level: inpaint the zone on a small blurred brightness map
        small = cv2.resize(cv2.GaussianBlur(v, (0, 0), 3), (w // s, h // s), interpolation=cv2.INTER_AREA)
        hole = cv2.dilate(cv2.resize(hard, (w // s, h // s), interpolation=cv2.INTER_NEAREST), np.ones((3, 3), np.uint8))
        haze = cv2.inpaint(np.clip(small, 0, 255).astype(np.uint8), hole, 5, cv2.INPAINT_TELEA).astype(np.float32)
        haze = cv2.GaussianBlur(cv2.resize(haze, (w, h), interpolation=cv2.INTER_CUBIC), (0, 0), 6)
        capped = np.where(v > haze, haze + (v - haze) * a.keep, v)
        m = cv2.GaussianBlur(mask, (0, 0), 8)
        ratio = (1 - m) + m * capped / np.maximum(v, 1)
        img = np.clip(img * ratio[..., None], 0, 255).astype(np.uint8)
    ff.stdin.write(img.tobytes())
    f += 1
ff.stdin.close(); ff.wait()
print(f'{f} frames, {len(zones)} zones capped to the haze')
