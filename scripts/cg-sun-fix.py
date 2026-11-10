"""cg-depart-3: the HD take shows two sun discs from frame ~22 on (the start keyframe's sun drifts right while the end
keyframe's sun fades in beside it). Keeps the end sun (the clip's last frame needs it) and rebuilds the sky over the
start sun from the mirror image of the clean sky on the other side of the kept sun (a sun's glow is near symmetric
left/right; OpenCV inpaint left a pale disc). The patch stays above the breakwater line and fades in over frames 16-22,
so one sun hands over to the other. 0 credits.
  python3 scripts/cg-sun-fix.py <in.mp4> <out.mp4>
Tracks measured on the 1920x1080 take (blob centroids at luma >= 225/245):
  old sun x = 536 + 2 (f - 15), capped at 612; y 198 until f 28, 185 at f 38, 183 after
  new sun x = 614 + 1.03 (f - 28), y ~180
ponytail: hand-measured tracks for this one take; re-measure if the clip is ever re-rendered.
"""
import subprocess, sys
import cv2, numpy as np

src, dst = sys.argv[1], sys.argv[2]
cap = cv2.VideoCapture(src)
w, h = int(cap.get(3)), int(cap.get(4))
ff = subprocess.Popen(['ffmpeg', '-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'bgr24', '-s', f'{w}x{h}', '-r', '24', '-i', '-',
                       '-c:v', 'libx264', '-preset', 'slow', '-crf', '10', '-pix_fmt', 'yuv420p', dst], stdin=subprocess.PIPE)
START, FULL, FLOOR = 16, 22, 208   # FLOOR: lowest row patched, just above the far breakwater
xs = np.arange(w)
f = 0
while True:
    ok, img = cap.read()
    if not ok:
        break
    if f >= START:
        ox = min(612, 536 + 2 * (f - 15))
        oy = 198 if f <= 28 else (185 + (38 - f) * 1.3 if f < 38 else 183)
        nx, ny = 614 + 1.03 * (f - 28), 180
        mask = np.zeros((h, w), np.float32)
        cv2.ellipse(mask, (int(ox), int(oy) - 8), (62, 48), 0, 0, 360, 1.0, -1)
        cv2.circle(mask, (int(nx), int(ny)), 20, 0.0, -1)
        mask[FLOOR:] = 0
        mask = cv2.GaussianBlur(mask, (0, 0), 10)[..., None]
        mirror = img[:, np.clip((2 * nx - xs).astype(int), 0, w - 1)]
        a = min(1.0, (f - START + 1) / (FULL - START + 1))
        img = (img * (1 - mask * a) + mirror * (mask * a)).astype(np.uint8)
    ff.stdin.write(img.tobytes())
    f += 1
ff.stdin.close(); ff.wait()
print(f'{f} frames, old sun replaced from {START} (full from {FULL})')
