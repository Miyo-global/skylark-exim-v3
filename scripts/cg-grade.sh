#!/usr/bin/env bash
# One grade for every CG story clip (STYLE.md), and exact chaining between clips.
#   scripts/cg-grade.sh <id> <raw.mp4> [prev-raw.mp4]
# -> masters/<id>/master.mp4 (2560×1440, 24 fps, what scripts/encode-hf.sh and scripts/clip-frames.sh read)
# Seedance takes a start image as a reference, not as frame 0 (SSIM ~0.88), so with a previous clip the first 8 frames
# blend in from that clip's last raw frame: frame 0 is then exactly the previous clip's last frame, before the same grade.
# The grade: deband (8-bit sky and water banding), a light contrast lift, and fine static grain so the gradients do not
# band again after the AV1/AVIF encode.
set -euo pipefail
cd "$(dirname "$0")/.."
id="${1:?id}"; raw="${2:?raw clip}"; prev="${3:-}"
mkdir -p "masters/$id"; tmp=$(mktemp -d "${TMPDIR:-/tmp}/cg.XXXXXX"); trap 'rm -rf "$tmp"' EXIT
GRADE="deband=1thr=0.02:2thr=0.02:3thr=0.02:range=22:blur=1,eq=contrast=1.04:saturation=0.96,scale=2560:1440:flags=lanczos,noise=alls=3:allf=p,format=yuv420p"
if [ -n "$prev" ]; then
  ffmpeg -nostdin -v error -y -sseof -0.05 -i "$prev" -update 1 -frames:v 1 "$tmp/prev.png"
  ffmpeg -nostdin -v error -y -i "$raw" -loop 1 -framerate 24 -i "$tmp/prev.png" -filter_complex \
    "[1]format=rgba,fade=out:st=0:d=0.3333:alpha=1[o];[0][o]overlay=shortest=1,$GRADE" \
    -r 24 -c:v libx264 -preset slow -crf 12 -an "masters/$id/master.mp4"
else
  ffmpeg -nostdin -v error -y -i "$raw" -vf "$GRADE" -r 24 -c:v libx264 -preset slow -crf 12 -an "masters/$id/master.mp4"
fi
echo "$id: $(ffprobe -v error -count_frames -show_entries stream=nb_read_frames,width,height -of csv=p=0 "masters/$id/master.mp4")"
