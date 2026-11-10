#!/usr/bin/env bash
# Frame sequences for the /story clips that play on the canvas instead of a <video> (#hd2, src/config/chapters.ts SEQ):
# fast camera moves macroblock in video at any byte rate a path can afford, a still frame per position does not (the
# Terminal Industries pattern, already used for the hero: src/film/sequence.ts). Every master frame, so the clip keeps
# its exact frame count and timing.
#   scripts/clip-frames.sh <id>...   (MASTER_ID=<clip whose master to read>, for one id)
# -> public/media/<id>-f_1920_NNN.avif, and a WebP set (.webp, q 75) for a browser without AVIF. Every desktop tier
#    draws the 1920 set: a 2560 set (crf 38, 88 KB a frame) cost the five port clips 25.4 MB of the 60 MB desktop path
#    and left the other 17 clips 1.3 MB each at 2560, less than before the HD pass; the 1920 set is 20.8 MB at crf 36 and ~17 MB at crf 39, which leaves room to keep every other clip at least at its old 2560 bytes. Phones keep
#    the clip's video (chapters.ts SEQ_CLIPS). AVIF (SVT-AV1 still) because on an hf-port-4 frame at 2560 crf 34 is
#    96 KB at SSIM 0.985 where WebP needs q 80 and 184 KB for the same SSIM. crf 39; cap per frame 150 KB, a frame
#    over it steps AVIF crf up by 3 (to 47), WebP q down by 5 (to 5; the WebP set is the fallback for a browser without AVIF).
#    SHARPEN=1 adds a light unsharp=5:5:0.6 after the downscale. SET_KB=<n> caps the AVIF set: the whole set is encoded
#    again from the next crf of 39 42 45 47 50 until it fits (the #story-seq scenes: FROM_SHIPPED=1 SHARPEN=1 SET_KB=5000). The WebP
#    set is the fallback for a browser without AVIF and keeps its per-frame cap only.
#    FRAMES=<n> keeps n evenly spaced master frames, so a set costs its share of the path budget. DENOISE=1 adds hqdn3d
#    before the downscale, for water and grass that stay over the frame cap at the lowest WebP q.
#    CRF=<n> starts the AVIF ladder at n instead of 39 (the CG sets: CRF=30, they were soft at 39 and 15-21 KB a frame).
#    PRESET=<n> is the SVT-AV1 preset (default 6; 4 is ~25 % smaller at the same SSIM). WEBP_KB=<n> caps each WebP frame
#    (default the 150 KB frame cap). perf/story-smooth-scroll: every shipped frame (72 a clip, the trimmed ones fewer) at
#    the set's old bytes: FROM_SHIPPED=1 PRESET=4 SET_KB=<old set> WEBP_KB=<old WebP set / frames>.
set -euo pipefail
PRESET=${PRESET:-6}
cd "$(dirname "$0")/.."
for id in "$@"; do
  # FROM_SHIPPED=1: the clip's shipped 2560 AV1 file, for an id whose masters/ take is not the footage on the site
  in="masters/${MASTER_ID:-$id}/master.mp4"; [ -n "${FROM_SHIPPED:-}" ] && in="public/media/${id}_2560.av1.mp4"
  tmp=$(mktemp -d "${TMPDIR:-/tmp}/cf.XXXXXX")
  rm -f public/media/"$id"-f_*.webp public/media/"$id"-f_*.avif
  line="$id:"
  for tier in 1920; do
    vf=${DENOISE:+hqdn3d=3:3:4:4,}scale=1920:1080:flags=lanczos${SHARPEN:+,unsharp=5:5:0.6}; cap=150
    if [ -n "${FRAMES:-}" ]; then
      nf=$(ffprobe -v error -count_packets -select_streams v -show_entries stream=nb_read_packets -of csv=p=0 "$in")
      vf="select='eq(n\\,round(floor(n*($FRAMES-1)/($nf-1)+0.5)*($nf-1)/($FRAMES-1)))',setpts=N/24/TB,$vf"
    fi
    mkdir -p "$tmp/$tier"
    ffmpeg -nostdin -v error -y -i "$in" -vf "$vf" -fps_mode vfr -start_number 0 "$tmp/$tier/%03d.png"
    for ext in avif webp; do
      ladder="${CRF:+$CRF }39 42 45 47 50 52 54 56 58 60"
      # SET_KB: a probe pass over every 8th frame picks the first crf whose projected set fits, so the full set is
      # encoded once or twice instead of once per ladder step
      if [ $ext = avif ] && [ -n "${SET_KB:-}" ]; then
        frames=("$tmp/$tier"/*.png); nf=${#frames[@]}
        while [ "${ladder#* }" != "$ladder" ]; do
          crf=${ladder%% *}; t=0; k=0
          for ((j = 0; j < nf; j += 8)); do
            ffmpeg -nostdin -v error -y -i "${frames[$j]}" -vf format=yuv420p -c:v libsvtav1 -preset $PRESET -crf $crf -frames:v 1 "$tmp/probe.avif" 2>&1 | grep -v '^Svt' || true
            t=$((t + $(stat -f%z "$tmp/probe.avif"))); k=$((k + 1))
          done
          [ $((t * nf / k)) -le $((SET_KB * 1024)) ] && break
          ladder=${ladder#* }
        done
      fi
      while :; do
        crf=$ladder; total=0; max=0; n=0
        for f in "$tmp/$tier"/*.png; do
          out="public/media/$id-f_${tier}_$(basename "${f%.png}").$ext"
          for q in $([ $ext = avif ] && echo $crf || echo 75 70 65 60 55 50 45 40 35 30 25 20 15 10 5); do
            if [ $ext = avif ]; then
              ffmpeg -nostdin -v error -y -i "$f" -vf format=yuv420p -c:v libsvtav1 -preset $PRESET -crf $q -frames:v 1 "$out" 2>&1 | grep -v '^Svt' || true
            else cwebp -quiet -m 6 -q $q "$f" -o "$out"; fi
            [ "$(stat -f%z "$out")" -le $(($([ $ext = webp ] && echo ${WEBP_KB:-$cap} || echo $cap) * 1024)) ] && break
          done
          s=$(stat -f%z "$out"); total=$((total + s)); [ $s -gt $max ] && max=$s; n=$((n + 1))
        done
        # over the set cap: the whole set again, one step up the crf ladder
        [ $ext = avif ] && [ -n "${SET_KB:-}" ] && [ $total -gt $((SET_KB * 1024)) ] && [ "${ladder#* }" != "$ladder" ] || break
        ladder=${ladder#* }
      done
      line="$line  $tier.$ext $n frames $((total / 1024)) KB (largest $((max / 1024)), from crf ${crf%% *})"
    done
  done
  echo "$line"
  rm -rf "$tmp"
done
