# /story cleanup audit

Audited: what `feat/higgsfield-story` (2df8514b) serves, on the Wild catch and Farmed shrimp paths, desktop and phone. Every frame of all 31 clips (`<id>_1920.mp4`) and all 8 frame sets (`<id>-f_1920_NNN.webp`).
Tool: `scripts/story-audit.py`. Contact sheets with every frame numbered, plus scores: `before/<id>.jpg`, `before/<id>-seq.jpg`, `before/scores.json`.
The scores only rank shots for review. Every sheet was then read by eye, with suspects checked at full size. The rewind score missed the known `hf-fish-wash` reversal, so it is not trusted alone.

## Second pass, 2026-11-05: what the first pass got wrong

The first pass left the truck and the port alone because they showed no melted shapes. Tarun's check of the live site confirmed both as defects, and a read at full size agrees: hf-port-4 frames 16-30 morph the container and show a see-through ladder, and hf-port-5 jumps at frames 28-29, 38-39 and 48-49 (largest step 51 grey levels against a median of 9). The port film is one fast AI camera flight squeezed into 60 frames a shot.

`fix/story-cleanup` was also never pushed before this pass, so the live site showed none of the first pass's remakes.

| # | Shot | Caption | Problem | Fix |
|---|---|---|---|---|
| A | `hf-port-4` | The port | Container morphs and smears, see-through ladder, heavy motion | Remade |
| B | `hf-port-5` | The port | Camera whip with jumps, smeared cranes | Remade |
| C | `hf-port-1`, `-2`, `-3` | The port | Painted look against the remade shots; hf-port-1 holds a 6-frame dissolve at its join | Remade |
| D | `hf-arrive`, `hf-reverse` | Into the plant. | Soft, smeared reflections and ghosted edges in motion | Remade |
| E | Chapter joins | all | Next shot's poster faded in over the picture, double exposures; 15 % overlap into the globe | Overlap removed from the engine |

## What changed, 2026-11-05

| Shot | Result | Credits |
|---|---|---|
| `hf-arrive` | Remade: start frame, then one forward roll | 25 |
| `hf-port-1` | Remade (second start frame after a rejected first) | 40 |
| `hf-port-2`, `hf-port-3` | Remade from the previous shot's last frame | 50 |
| `hf-port-4`, `hf-port-5` | Remade | 50 |
| `hf-reverse` | **Still fallback.** One sharp take reversed away from the bay; the keyframed retry failed twice with no output. Uses its clean 4K frame with a 6 % push-in | 40 |
| `hf-fish-wash` | Not remade. The 2 Nov master already moves one way: fish lifted from the table, laid in the crate, stays there | 0 |

Total 205 credits, log in `HIGGSFIELD_LOG.md`. Before and after for every fixed shot: `before-after/<id>.jpg`, top row base branch, bottom row this branch, first, middle and last frame. Real page walks: `scroll/`. New contact sheets: `after/`, phone crops `after-phone/`.

Engine: every story clip draws on the desktop canvas (36-frame AVIF or WebP sets; 24 for `hf-harvest` and `hf-sort`, 20 for the `hf-reverse` still). Nearest set loads first, one at a time. Frames decode in the worker before drawing, toward the scroll first. Joins never overlap: straight cut inside a chapter, a 2.5 % scroll-linked dip between chapters.

## Verification, 2026-11-05

Measured on a local production build in headless Chromium. No real phone or Safari was tested.

| Check | Result |
|---|---|
| Lighthouse, 5 pages × 3 runs, mobile | Pass. `/story` LCP 1352-1353 ms, CLS 0.0013. Worst LCP: `/quote` 2438 ms. Worst CLS: 0.0013 |
| Weight | Desktop 54.7 / 56.0 MB (limit 60). Retina 54.9 / 55.8 MB. Phone 10.9 / 10.7 MB (limit 12) |
| `tests/story-joins.spec.ts` (new) | Pass both paths: one picture at every 40 px, down and up; canvas frame 0 at y = 0 |
| `tests/story-sync.spec.ts` | Pass both paths: same clip, frame and caption down and back up |
| Scroll walk, desktop and phone, both paths | 44 stops each way: 0 blank, 0 down/up mismatches, 0 page errors |
| Desktop wheel scroll, stale picture | 0 % in every chapter on both paths (base: up to 19 %), 60 fps rAF, 0 long tasks |
| Full Playwright | 204 passed, 24 failed. After that run the desktop stopped requesting the first clip's video; 11 affected specs rerun: 57 passed, 3 failed (`hd`) |

All of these also fail on the untouched base branch (2df8514b, same specs and machine): `hd` 3 (it asserts CLS exactly 0; here 0.001-0.002), `markets-globe` 2, `story-stuck` 8, `terminal-mode` 6, `video-smoothness` 6. `story-stuck` step scroll fails on base and passes here. No limit was loosened; tests that assumed a video opening now check the canvas.

**Known limit:** on Fast 4G (9 Mbit/s) a very fast scroll outruns the frames, as it outran the video on base: 69-94 % stale from o3 on (base 52-94 %). The poster of the shot holds until frames land, so the picture is clean but still. A faster link does not show this. Fast flings on a throttled 4× CPU are also still over the 400 ms frozen-picture limit, as on base.

## Phones: video or frames

Tested on the Wild catch path in Chromium's phone emulation (412×915, 4× CPU, Fast 4G, touch swipes), `tests/video-smoothness.spec.ts`. Frames: a temporary build with 14-frame 810×1440 AVIF sets (crf 46) on the intake and port chapters, not committed. No real phone was tested.

| | Video (kept) | 14-frame sets |
|---|---|---|
| Long tasks over 50 ms | 2 (longest 563 ms) | 133 (longest 846 ms) |
| rAF | 56.8 fps | 46.5 fps |
| Stale picture, intake / port | 1.8 % / 1.5 % | 0 % / 0 % |
| Whole path | 10.9 MB | about 13 MB, over the 12 MB phone budget |

The frame build never lags the scroll target, but it has only 14 pictures a shot and it costs the main thread. Phones stay on video, which also never waits on a slow seek here (seek p95 8-12 ms).

## First pass, ranked by how visible the problem is

| # | Shot | Caption | Problem | Frames |
|---|---|---|---|---|
| 1 | `hf-fish-intake` | Into the plant. (wild) | Trays melt into flat grey slabs over the ice around the tuna and mackerel | 0-71 |
| 2 | `hf-fish-wash` | Washed and graded. | Motion reverses: the worker lifts a fish and puts it back. Grading crates are flat grey blocks | 0-71 |
| 3 | `hf-intake` | Into the plant. (farmed) | The crate carried toward the camera is a flat grey slab with no ice or shrimp | 24-71 |
| 4 | `hf-store` | Held at −18 °C to −20 °C. | Rack shelves hold featureless grey slabs | 0-71 |
| 5 | `hf-wash` | Washed clean. | Column of stacked flat grey blocks beside the grading tables | 0-71 |
| 6 | `hf-unload-fish` | Into the plant. (wild) | Three bins are plain grey blocks with a strip of fish on top. The floor mat smears away under the vapour | 0-71, mat 50-71 |
| 7 | `hf-iqf` | Frozen shrimp chapter | Motion loops: the arm reaches over the belt, leaves, and comes back | 0-23, 60-71 |
| 8 | `hf-harvest` | Pond harvest | Row of flat grey blocks on the far bank behind the net crew | 0-71 |
| 9 | `hf-sort` | Pond sorting | Ice boxes read as plain grey blocks, and a flat slab stands on the right | 0-71 |
| 10 | `hf-fish-cut` | Washed and graded. | Melted dark grey blocks in the background behind the worker | 0-71 |

## Checked and left alone

| Shot | Why |
|---|---|
| `hf-unload-shrimp`, `hf-unload-crew` | Crates show ice and shrimp. The lift goes one way, truck to trolley |
| `hf-fish-freeze` | Grey score is freezer door and vapour. Racks show real fish |
| `hf-pack` | Flaps close once, one forward action. Grey score is the steel table |
| `hf-lab`, `hf-peel` | Clean. Grey score is white benches and steel walls |
| `hf-catch`, `hf-ice`, `hf-return`, `hf-depart` | Real deck, fish and water texture. Boats are the subject of these chapters |
| `hf-ponds`, `hf-sample` | Clean. Rewind score is the aerator water |
| `hf-ship`, `hf-sail` | No melted shapes. Rewind scores are camera parallax, grey scores are sky and sea |

The "no boats or ships" rule applies to the regenerated plant and pond frames. The ocean and port chapters show boats and ships by design, so they stay.
