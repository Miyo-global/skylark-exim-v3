# Grey slab and rewind remake: audit and plan

Branch `fix/grey-slab-remake` off `origin/feat/higgsfield-story` (2df8514b). Nothing generated yet. No credits spent.

## How the audit was done
- Every `/story` clip in `src/config/chapters.ts` (31 clips) and every desktop frame sequence in `SEQ` (8 sets: hf-catch, hf-lab, hf-peel, hf-port-1…5) was decoded frame by frame from what the site serves (`public/media/<id>_1920.mp4`, `<id>-f_1920_NNN.webp`).
- One contact sheet per shot in this folder (`<id>.jpg`, `<id>-seq.jpg`): every frame, numbered, with a flat-grey score in the corner (share of the frame covered by the biggest patch of grey, mid-tone, texture-free 8×8 blocks). The score only ranked shots for review; every shot was then checked by eye on 4 full-size frames, and the suspects on 12.
- Rewind check: dense optical flow per frame pair, camera move removed, then per grid cell the motion out vs. back along its main direction. A cell that travels out and comes back by a similar amount is a suspect. Suspects were then checked by eye. Walking, hauling a net, sawing with a knife and parallax from a moving camera also trigger it; those were cleared by eye and are listed at the end.

## Shots to fix (most visible first)

Cost per try = 1 start frame (`gpt_image_2_5`, quality max, 4k) + 1 video (`minimax_h3` 2K, 5 s, trimmed to the clip's frames).
Prices are the ones HIGGSFIELD_LOG.md recorded per job: image **15**, video **10**, so one try = **25**, two tries = **50**.
The model info API does not show prices. The 17 Oct transactions show other GPT Image 2.5 settings at 4.25, so 15 may be high. The first job's real charge will be read from the `balance` delta and logged, and every running total uses real charges.

| # | Shot | Chapter / caption | Paths | Problem | Fix | 1 try | Max (2 tries) |
|---|---|---|---|---|---|---|---|
| 1 | `hf-fish-intake` | "Into the plant." (intake.ocean) | wild catch | Steel trays on the receiving table melt into flat grey slabs over the ice around the tuna and mackerel, in every frame (sheet: all 72) | New start frame from the same camera and layout: real crushed ice, steel trays with clear rims, tuna and mackerel, the two workers checking gills. Then video with a slow forward drift | 25 | 50 |
| 2 | `hf-intake` | "Into the plant." (intake) | farmed | The crate the worker carries toward the camera is a flat grey slab with no ice or shrimp visible, filling ~15 % of the frame in frames 24-71 | New start frame: same bay, trolleys and truck, crate tilted so crushed ice and shrimp show. Video: same walk toward the camera | 25 | 50 |
| 3 | `hf-fish-wash` | "Washed and graded." (process.ocean) | wild catch | (a) Rewind: the right-hand worker lifts a fish from the tray, moves it toward the crates, then puts it back where it was (frames 0-19 out, 32-45 over the crate, 58-71 back at the tray). (b) The grading crates are flat grey blocks | New start frame: spray rail washing mackerel on the left; right-hand worker takes a washed fish from the tray and places it into a steel grading crate beside him. Hairnet, mask, blue gloves, white apron as now. Prompt and end check: one direction only, the fish never returns to the tray. Slow forward camera drift | 25 | 50 |
| 4 | `hf-store` | "Held at −18 °C to −20 °C." / "Held cold until dispatch." | both | Rack shelves on the right hold featureless grey slabs instead of cartons (frames 0-71, in view on the site). A smeared grey panel top-left is cut off by the page's 1.3× zoom (x: 1), so only the racks show | New start frame: same aisle, racks of plain brown cartons and steel boxes with frost, workers and pallet jack as now. Video: same slow walk | 25 | 50 |
| 5 | `hf-wash` | "Washed clean." (process) | farmed | A column of stacked flat grey blocks right of centre beside the grading tables (frames 0-71) | New start frame: same hall and conveyor; that column becomes stacked steel crates with ice. Video: same pan | 25 | 50 |
| 6 | `hf-unload-fish` | "Into the plant." (intake.ocean, beat 3) | wild catch | The three bins inside the truck read as plain grey blocks with a thin strip of fish on top. Mild, small in frame | Optional. New start frame with fish and ice clearly heaped in steel bins. Must still match hf-reverse's last frame (SSIM seam), so the joint is checked first | 25 | 50 |

**Total, shots 1-5, worst case (2 tries each): 250 credits.** Expected with one try each: 125.
**With optional shot 6: 300 worst case.** Both are under the 500 cap. Balance now: 563.36.

Rule per shot: check the start frame against the rules before making video (no grey blocks, no logos, no readable text, no boats or ships; hairnets, masks, blue gloves, white aprons; real ice texture). Then inspect every output frame. If slabs, warped hands or fish, or a reversal remain after 2 tries, the clean start frame goes in as a still with a slow push-in (ffmpeg, 0 credits), and that is logged.

Output: each fixed shot is re-exported as a WebP (and AVIF) 1920 frame sequence like hf-catch / hf-lab / hf-peel (`SEQ` in `src/film/manifest.ts`, `SEQ_CLIPS` in `src/config/chapters.ts`), with the same frame count and `from`/`until`/`span` timing. Chapter order and captions stay the same. Mobile and the 960 tier keep video, re-encoded from the new master.

## Checked and left as they are
| Shot | Why it stays |
|---|---|
| hf-unload-shrimp, hf-unload-crew | Crates show ice and shrimp/fish; the lift goes truck → trolley, one way |
| hf-fish-cut | Slice goes board → ice tray and stays there |
| hf-fish-freeze | Racks show loins and whole fish; grey score is the freezer door and mist |
| hf-lab, hf-peel, hf-iqf | No slabs. iqf: the hand reaches out and back to place shrimp, which is the real repeated action, nothing returns |
| hf-pack | Flaps open, then close: one forward action |
| hf-harvest, hf-sort | Ice boxes on the bank are plain white/grey but read as boxes, small and at the back. Could be added later |
| hf-catch, hf-ice, hf-return, hf-depart | Real deck, fish and ice texture. Hauling motion is the real rhythm |
| hf-arrive, hf-reverse, hf-ponds, hf-sample | No trays or ice; truck moves one way |
| hf-port-1…5, hf-ship, hf-sail (and their sequences) | No slabs. Rewind hits are parallax from the moving camera |

## Open points before Step 2
1. Since 17 Oct the standing rule was zero Higgsfield spend. This plan needs your yes to lift it, up to 500 credits.
2. Adding up to 5 more 1920 frame sets adds about 5-10 MB of WebP per set. `npm run test:weight` will say whether the per-path budget still holds. If it does not, the lowest-priority shot stays video.
