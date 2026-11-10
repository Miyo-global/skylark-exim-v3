# CG story look

One fixed style for every /story shot. Paste the style block into every image and video prompt, after the shot text.

## Style block (image prompts)

> Photoreal-scale cinematic CG, like a high-end 3D film still. Real-world scale and proportions, physically based
> materials: weathered painted steel, rust streaks, wet surfaces. Realistic water with wake, ripples and reflections.
> Atmospheric haze, film-like dawn or dusk light, deep navy shadows and sky, one warm amber accent (low sun or a work
> lamp). Wide lens (24-35 mm), shallow depth of field, subtle film grain. The subject is the clear hero of the frame.
> One vessel only. No logos, no letters, no numbers, no readable text anywhere. Not a toy, diorama, clay or plastic
> model, no tilt-shift or miniature look, no cartoon shapes, no empty flat studio background.

## Motion block (video prompts)

> Slow, steady cinematic camera: one continuous glide forward, push in or gentle orbit, like a camera on a boat or a
> drone. No handheld shake, no cuts, no zoom jumps. Everything moves forward in time only: nothing reverses, loops or
> returns to where it came from. Real-world scale and physics; the look of the first frame holds to the last.
> No text, no logos.

**Rejected (10 Nov):** the first pass (matte "clean 3D CG", studio light, simple navy background) read as a toy model.

## Approval flow

For each shot: 4 start-frame options (~2 credits each) go to Tarun first. After his pick: one 480p test (15). After the
test passes: HD (80). Never straight to HD.

## Chaining

- The sun sits in the same spot in a shot's start and end frames, or is out of frame in both (Tarun, 10 Nov): a sun
  that moves between the two keyframes renders as two suns mid-shot (cg-depart-3, o2).
- Keep the camera on one line between start and end frames: a big orbit plus descent cuts or dissolves (o2 to B).

- A shot's start frame is the last frame of the previous shot's HD final (`ffmpeg -sseof -0.05 … -update 1`).
- Planned end frames (keyframes) are made first, so each shot gets a start image and an end image.
- One grade on every clip: `scripts/cg-grade.sh` (same curves and saturation for all clips).

## Content rules (frame-check every clip)

- Real facts only (Visakhapatnam, Andhra Pradesh; raw material from farms or fishing vessels). Never "Bay of Bengal", never "purse seine".
- No logos or readable text. One vessel per shot.
- Forward-only actions. No AI errors (extra limbs, merging objects, nets closing on people).
- Indian right-hand-drive trucks; full-size 40 ft reefer container at the port.
