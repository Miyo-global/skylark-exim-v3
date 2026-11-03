# HIGGSFIELD_LOG

Media pass per docs/HIGGSFIELD.md + docs/HIGGSFIELD_STORYBOARD.md (issue #175). Masters in `masters/<shot>/` (gitignored, never committed).
Start balance 1910.75 credits (max plan). Credit guard: stop all generation at 1624 credits spent (balance <= 286). Spend is tracked from `balance` calls only.

## 2026-10-10: paused before the first generation
The lead halted the pass on Tarun's order: Higgsfield is paused until the Blender finals are done. No job was submitted. Credits spent: 0. Balance still 1910.75 (max plan). Resume at A2 catch.

## 2026-10-11: resumed (Higgsfield producer)

### Decisions
- **Video model: `minimax_h3` 2K** (10 credits / 5 s). Comparison on HS03 (same start frame, same prompt): minimax_h3 returned 2560x1440 H.264 24 fps, 124 frames, people and rope detail sharp in every sampled frame; `seedance_2_5` 1080p `bitrate_mode: high` (60 credits) returned 1920x1080 HEVC 10-bit 24 fps, 121 frames, but drifted into heavy defocus by 50-100 % and lost face/hand detail. Picked minimax_h3 by contact sheet. Both outputs are 24 fps (no resample needed). minimax output carries an AAC track; it is dropped at encode (`-an`).
- **People start frames: `gpt_image_2_5` quality max, 4k** (15 credits). Comparison on HS03 vs `nano_banana_pro` 4k (4 credits; the job reported model `nano_banana_2`): nano copied the CG poses (lunging figures, hands not on the rope); gpt_image_2_5 gave natural hauling poses with gloved hands on the rope and real faces. Output 3840x2160.
- **Shots without people:** take 1 animated straight from the Blender still (HS01, HS06, HS19, HS20) all read as CG (flat block buildings, toy water/ponds, plastic crane paint). Take 2 for those uses a gpt_image_2_5 realism pass that keeps the Blender composition (the "change the start still" step of HIGGSFIELD.md §3.4).
- **Content rule (coordinator, 2026-10-11):** a closed ring of floats on the sea implies a gear on the never-write list. Sea shots must show the net hauled over the side, a straight float line from the hull or a heaped net; every sea prompt carries "no circular float ring, no encircling net"; no gear is named in prompts. HS03 take 1 PASS revoked for this.
- Reference grading: real photos are viewed in the browser only (nothing downloaded, uploaded or committed). Bing image results for Visakhapatnam crews hauling nets: crews mostly in T-shirts, lungis or shorts, often barefoot, many hands on deck; PVC oilskins mostly appear in non-Indian trawler photos. Our catch frames keep the oilskins from the scene reference; harbour/pond frames use lungis, vests, saris, sandals, which matches the real photos.

- **Seams (coordinator):** neighbouring shots at the same location were regenerated with `end_image` = the next shot's start frame (10 takes, 100 credits). Only HS13 → HS15 passed (the camera glides from the peeling table through the glass door into the lab). The other nine morphed, dissolved, cut mid-clip or never reached the end frame, so those joins keep the 3 % poster cross-fade.
- **Retakes requested by Tarun (2026-10-11):** HS20 (the ship must visibly leave; crane cables must not cross the boom), HS08 (no cropped head on the bottom edge), HS10 (the truck must reverse to the dock). The start frames were fixed first with a gpt_image_2_5 edit pass, then animated.
- **Upscaling not used:** the masters are 2560x1440 and the largest tier is 1920, so `upscale_video` would add nothing.
- **Weight budget held (Tarun):** every clip is trimmed to the 72 frames (3.0 s) its scroll segment needs, at the same bitrate as the full clip, so per-clip quality is unchanged and the files are about 42 % smaller. The window keeps the most motion; seam frames are kept (HS13 ends on HS15's start, so HS13 keeps its tail and HS15 its head). Desktop takes the 1920 tier only above 1600 device px; phones scrub the 720 tier and prefetch only the next clip.

### Takes (job id = first 8 characters)
Credits: gpt_image_2_5 max 4k = 15, nano_banana_pro = 4, minimax_h3 2K 5 s = 10, seedance_2_5 1080p = 60.

| Shot | Kind | Job | Credits | Verdict | Notes |
|---|---|---|---|---|---|
| HS01 | video t1 (Blender still) | ed45a279 | 10 | FAIL | town reads as CG blocks |
| HS01 | image realism pass | 96ffde8d | 15 | PASS | keeps the Blender composition |
| HS01 | video t2 | e0d7f2a4 | 10 | PASS | opening |
| HS02 | image | 7929cecc | 15 | PASS | weathered boat, two crew, mooring buoys only |
| HS02 | video t1 | 71b398b9 | 10 | PASS | hf-depart |
| HS03 | image nano (cmp) | 81513494 | 4 | reject | CG poses copied |
| HS03 | image gpt | eab48ca9 | 15 | revoked | closed float ring (content rule) |
| HS03 | video t1 minimax | 2aebb75e | 10 | FAIL (revoked) | closed float ring |
| HS03 | video seedance (cmp) | f74114a3 | 60 | FAIL | defocus drift |
| HS03 | image re-do | fdf882db | 15 | PASS | net over the rail, straight float line |
| HS03 | video t2 | 2077ab75 | 10 | FAIL | camera swing |
| HS03 | video t3 | 55686b2f | 10 | PASS | hf-catch |
| HS03 | seam take | 109453f1 | 10 | FAIL | cut mid-clip (boundary SSIM 0.16 to 0.62) |
| HS04 | image | 9df94576 | 15 | PASS | crew icing tuna and mackerel |
| HS04 | video t1 | be52f262 | 10 | FAIL | camera rolls, wake jumps |
| HS04 | video t2 | 616b8b36 | 10 | PASS | hf-ice |
| HS05 | image | 4b36f2c3 | 15 | PASS | porters, trolleys, no text |
| HS05 | video t1 | 760751ab | 10 | PASS | hf-return |
| HS06 | video t1 (Blender still) | 0103c86c | 10 | FAIL | toy ponds |
| HS06 | image realism pass | 5dad1f4a | 15 | PASS | |
| HS06 | video t2 | 3d2c5d97 | 10 | PASS | hf-ponds |
| HS07 | image | 2375756a | 15 | PASS | drag net at sunrise |
| HS07 | video t1 | 302d2155 | 10 | FAIL | people merge into the net |
| HS07 | video t2 | 4c2efbba | 10 | PASS | hf-harvest |
| HS07 | seam take | a03288d3 | 10 | FAIL | dissolve |
| HS08 | image | 844b486b | 15 | PASS then replaced | cropped head on the bottom edge (Tarun) |
| HS08 | video t1 | df528e38 | 10 | replaced | |
| HS08 | image fix | 2ddcca3f | 15 | PASS | cropped man removed, everyone whole |
| HS08 | video t2 | 1e9ce243 | 10 | PASS (trimmed 0-71) | the wading worker's legs reach the bottom edge from about frame 96, so the clip keeps frames 0-71 |
| HS09 | image | bd271d65 | 15 | PASS | |
| HS09 | video t1 | f8b7c73b | 10 | PASS | hf-sample |
| HS10 | image | 277ba842 | 15 | PASS then replaced | truck parked (Tarun) |
| HS10 | video t1 | 4481211f | 10 | replaced | truck does not move |
| HS10 | seam take | 9bd29e2c | 10 | FAIL | dissolve |
| HS10 | image fix | 624b85e0 | 15 | PASS | truck 8 m off the dock, reversing lights, worker guiding |
| HS10 | video t2 | b0dee22b | 10 | PASS (trimmed 52-123) | truck reverses about 11 % of the frame width toward the dock; it starts moving at about 1.3 s, so the trim keeps the moving part |
| HS11 | image | 43a75ab5 | 15 | PASS | |
| HS11 | video t1 | 943249cf | 10 | PASS | woman walks out of frame (not a dissolve) |
| HS11 | seam take | f5ee849f | 10 | FAIL | whip pan through blur |
| HS12 | image | c5a25001 | 15 | PASS | |
| HS12 | video t1 | e725f621 | 10 | PASS | hf-wash |
| HS12 | seam take | 7148d291 | 10 | FAIL | cut |
| HS13 | image | e82143fa | 15 | PASS | |
| HS13 | video t1 | 74b8226a | 10 | replaced by the seam take | |
| HS13 | seam take S1 | 8f2f7aff | 10 | PASS | ends on HS15's start, boundary SSIM 0.49 to 0.96 |
| HS14 | image | 8cdeec59 | 15 | PASS | |
| HS14 | video t1 | 66253817 | 10 | PASS | hf-iqf |
| HS14 | seam take | 1a1994a9 | 10 | FAIL | through a white wall |
| HS15 | image | 97cc07c8 | 15 | PASS | |
| HS15 | video t1 | db51b6b8 | 10 | PASS | hf-lab |
| HS15 | seam take | 19d03c55 | 10 | FAIL | lab morphs into the belt |
| HS16 | image | a66e20e2 | 15 | PASS | |
| HS16 | video t1 | c9e3b2e7 | 10 | PASS | hf-pack |
| HS16 | seam take | de1307f5 | 10 | FAIL | double exposure |
| HS17 | image | c146f268 | 15 | PASS | |
| HS17 | video t1 | bf325b72 | 10 | PASS | hf-store |
| HS18 | image | c7066775 | 15 | PASS | |
| HS18 | video t1 | 86a6faf8 | 10 | PASS | hf-stuff |
| HS19 | video t1 (Blender still) | 0ebd8083 | 10 | FAIL | CG crane |
| HS19 | image realism pass | 6e416935 | 15 | PASS | |
| HS19 | video t2 | 210cec73 | 10 | PASS | hf-cranes |
| HS19 | seam take | 3ff6dcdc | 10 | FAIL | end frame not reached (0.18 to 0.44) |
| HS20 | video t1 (Blender still) | 00c684d5 | 10 | FAIL | CG boom and ship |
| HS20 | image realism pass | 2213e141 | 15 | PASS then replaced | cables cross the boom (Tarun) |
| HS20 | video t2 | 0f837d48 | 10 | replaced (Tarun) | ship's motion did not read |
| HS20 | image fix | f141bdc4 | 15 | PASS | cables along the boom on sheaves, quay edge added |
| HS20 | video t3 | b7f46a15 | 10 | FAIL | ship moves about 4.5 % of the frame, camera drifts |
| HS20 | video t4 | 7ceaa4fd | 10 | PASS | ship travels about a third of the frame, boom and quay fixed; small illegible pseudo-lettering on the stern (not readable) |

Image credits 364 (24 gpt_image_2_5 + 1 nano). Video credits 480 (42 minimax_h3 + 1 seedance). Total 844.

### Final clips (trimmed to 72 frames, 3.0 s at 24 fps; before: 124 frames, 5.17 s)
SSIM = 1920 tier vs the trimmed master. Sizes in KB, tiers 1920/1280/960/720 (caps 2,250/2,300/1,400/1,230 in tests/weight.spec.ts). H.264 High, two-pass, GOP 6, no B-frames, faststart, no audio.

| Chapter | Shot | Clip | Frames kept | SSIM | KB |
|---|---|---|---|---|---|
| start | HS01 take2 | opening | 0-71 | 0.967 | 1343/839/496/318 |
| o1 | HS02 take1 | hf-depart | 0-71 | 0.918 | 1426/879/512/320 |
| o2 | HS03 take3 | hf-catch | 0-71 | 0.846 | 1467/912/534/330 |
| o3 | HS04 take2 | hf-ice | 0-71 | 0.849 | 1399/868/517/326 |
| o4 | HS05 take1 | hf-return | 0-71 | 0.891 | 1452/893/518/323 |
| p1 | HS06 take2 | hf-ponds | 0-71 | 0.905 | 1376/847/502/321 |
| p2 | HS09 take1 | hf-sample | 50-121 | 0.931 | 1336/835/499/320 |
| p3 | HS07 take2 | hf-harvest | 0-71 | 0.882 | 1444/891/523/327 |
| p3 | HS08 take2 | hf-sort | 0-71 | 0.858 | 1365/853/517/330 |
| intake | HS10 take2 | hf-arrive | 52-123 | 0.931 | 1315/820/496/318 |
| intake | HS11 take1 | hf-intake | 52-123 | 0.960 | 1309/818/489/315 |
| process | HS12 take1 | hf-wash | 0-71 | 0.934 | 1306/825/495/319 |
| process | HS13 takeS1 | hf-peel | 52-123 | 0.982 | 1306/819/487/313 |
| coldchain | HS15 take1 | hf-lab | 0-71 | 0.985 | 1274/794/479/311 |
| coldchain | HS14 take1 | hf-iqf | 0-71 | 0.938 | 1289/809/491/317 |
| coldchain | HS16 take1 | hf-pack | 52-123 | 0.983 | 1293/809/487/313 |
| coldchain | HS17 take1 | hf-store | 52-123 | 0.961 | 1327/828/495/316 |
| port | HS18 take1 | hf-stuff | 33-104 | 0.945 | 1309/824/495/317 |
| port | HS19 take2 | hf-cranes | 0-71 | 0.937 | 1297/826/499/320 |
| sea | HS20 take4 | hf-ship | 0-71 | 0.826 | 1766/1083/625/388 |

HS20 is encoded at a 20 % higher bitrate than the others (busy water); at the standard rate its SSIM was 0.815; now 0.826.

### Seams (boundary SSIM between neighbouring clips, 1920 tier, measured before trimming; trimmed heads and tails change the cross-fade values, not the shared frame)
Cross-fade joins (separate shots): 01>02 0.42, 02>03 0.22, 03>04 0.16, 04>05 0.19, 05>10 0.32, 06>09 0.25, 09>07 0.23, 07>08 0.18, 08>10 0.22, 10>11 0.38, 11>12 0.29, 12>13 0.34, 15>14 0.35, 14>16 0.39, 16>17 0.53, 18>19 0.28, 19>20 0.18. Shared frame: 13>15 0.96.

### Balance (from `balance` calls only)
| When | Balance | Spent |
|---|---|---|
| start | 1910.75 | 0 |
| after HS03 images | 1891.75 | 19 |
| after first 3 batches | 1656.75 | 254 |
| after realism-pass images submitted | 1571.75 | 339 |
| after plant and remaining shots | 1251.75 | 659 |
| after seam takes | 1151.75 | 759 |
| after Tarun's retakes (3 images, 4 videos) | 1066.75 | 844 |

Credit guard (1,624) not reached: 844 spent, 44 % of the start balance.

## 2026-10-11 (evening): docs chapter, chapter audit, hero loop (#196, #197)

| Shot | Kind | Job | Credits | Verdict | Notes |
|---|---|---|---|---|---|
| HERO | video, minimax_h3 6 s, start = end = HS01 frame | c54da13b | 12 | PASS (with cross-dissolve) | last vs first frame SSIM 0.936 is a visible step; the last 0.5 s is cross-dissolved into the start, so the seam is 0.964, inside the clip's own frame-to-frame range (0.959-0.998). Gulls stay put across the seam. A faint wing double-exposure shows for about 0.2 s. PR #205 |
| DOCS | image, gpt_image_2_5 max 4k | 7dcd96d3 | 15 | PASS | export-office desk; depth of field makes every page and screen unreadable (zoom-checked); left third dark for the copy |
| HS21 | video, minimax_h3 5 s, start = HS20 frame 71 | 03c256e6 | 10 | PASS (trimmed 44-123) | the camera rises over the ship as it sails into deep blue water; the crane boom bends as it leaves the frame before frame 44, so those frames are cut. Replaces the Blender x-ship clip |

Audit (1440 and 390 px, both paths, every chapter at 30 % and 75 % of its scroll): two leftovers found. The docs chapter was a blurred, darkened smudge, and the second half of the sea chapter was the Blender x-ship clip (CG crane, toy ship). Both are fixed in #196. Every other chapter is Higgsfield footage.

Balance (from `balance` calls): 1066.75 before. Then 804.75 after these three jobs, a drop of 262, of which 37 is mine. The other 225 is 15 GPT Image 2.5 generations at 15:24 and 15:44 UTC by a parallel website session on the same account, per the transactions API and the coordinator. Spend since the 1910.75 start: 1106 (all sessions). Credit guard (1,624) not reached.

## 2026-10-12: pond retakes (#224)

Start frames: gpt_image_2_5, quality max 4k, three candidates per shot (contact sheets in docs/review/retakes). The pick is uploaded as a 2560 px JPEG and used as the minimax_h3 2K start image. minimax_h3 at 4 s failed twice (refunded); at 5 s it renders, so every clip is 5 s and trimmed to 72 frames.

| Shot | Kind | Job | Credits | Verdict | Notes |
|---|---|---|---|---|---|
| p2 sample, frames a/b/c | image, gpt_image_2_5 max 4k | 4d2b3e3e / 22c35303 / f7a1fa22 | 45 | b picked | all three pass the brief (meter on a cable, probe in the water, no poles). a: the aerator is small and far off. c: tighter framing, with the meter raised close to his face. b: he looks down at the meter, and the aerator splash fills the middle of the frame |
| p2 sample | video, minimax_h3 2K 5 s, start = b | e282315f | 10 | PASS (trimmed 0-71) | he taps the meter and reads it; the cable hangs naturally; nothing is lifted toward camera; no poles |
| p3 harvest, frames a/b/c | image, gpt_image_2_5 max 4k | 580f99ce / 75985b3e / 4ca3020d | 45 | b picked | a: the float line runs out of the frame at both bottom corners, so the arc does not read. c is also clean. b: the whole float arc sits in front of the four workers, with blue crates, white ice boxes and a plain white truck on the bank |
| p3 harvest | video, minimax_h3 2K 5 s, start = b | 1d6c2362 | 10 | PASS (trimmed 0-71) | the crew pulls the head rope; the float arc tightens in front of them and stays one line; the bank crew lifts blue crates |

The 1920 poster of hf-harvest missed the 120 KB cap even at q 12 (sunlit water), so encode-hf.sh now falls back to a cwebp size search.
## 2026-10-12: fish in the plant, wild path (#225)

Same pipeline as the pond retakes: gpt_image_2_5 max 4k start frames (three candidates each, contact sheets in docs/review/fish) with the hf-wash plant as the look reference, then minimax_h3 2K at 5 s, trimmed to 72 frames. Species: tuna, seer fish and Indian mackerel. The brief named pomfret, which is on the CONTENT.md never-write list, so it is left out.

| Shot | Kind | Job | Credits | Verdict | Notes |
|---|---|---|---|---|---|
| intake, frames a/b/c | image, gpt_image_2_5 max 4k | 25c9f58a / 096ce166 / 93ed896e | 45 | b picked | all clean. a: tight, one table. c: two workers on one tuna. b: two checks side by side, with the receiving door and a truck behind |
| intake | video, minimax_h3 2K 5 s, start = b | f0ef7f47 | 10 | PASS (trimmed 0-71) | the left worker opens the gill cover and checks the gills; the right worker's thermometer barely reads in motion, so the alt text does not mention it |
| wash, frames a/b/c | image, gpt_image_2_5 max 4k | ffb67706 / c7b0a8b2 / ef49b172 | 45 | a picked | all clean. b and c face the table head-on, so the crates crowd the frame edges. a: spray bar along the table and three crates in a row |
| wash | video, minimax_h3 2K 5 s, start = a | 0b746c30 | 10 | PASS (trimmed 0-71) | water sprays steadily; both workers lift rinsed fish into the crates; hands checked at frames 24/36/48/60 |
| cut, frames a/b/c | image, gpt_image_2_5 max 4k | 181806ce / 178f03d4 / ffdb61b1 | 45 | a picked | in b and c the blade tip runs close under the steadying glove. a: a clear gap between blade and hand |
| cut | video, minimax_h3 2K 5 s, start = a | 98c78c63 | 10 | PASS (trimmed 52-123) | the portion is cut, lifted with the free hand and laid on the ice; the knife stays in the cutting hand. The tail is kept because the lift starts at about 3 s |
| freeze, frames a/b/c | image, gpt_image_2_5 max 4k | a4f51e08 / f4360890 / b1dff9fb | 45 | c picked | all clean. a and b put the packer further left. c: packer, rack and freezer door all in frame, vapour at the door |
| freeze | video, minimax_h3 2K 5 s, start = c | 85045087 | 10 | PASS (trimmed 0-71) | the packer settles glazed fish into the carton while the rack goes toward the freezer; after about 3 s the push-in crops the packer, so the head is kept |

Captions are fact-only (skylarkexim.com work flow and company text): receiving checks, washing and grading, IQF or block freezing with glaze, 700-pallet cold store. "Blast freezing" is on the never-write list and is not used.

## 2026-10-12: o2 "The catch" retake (#230)

Start frame: gpt_image_2_5 max 4k, three candidates (docs/review/catch/sheet-catch.jpg). The o1 end frame and the o3 opening are the references, for the boat, crew kit and crates. Video: minimax_h3 2K at 5 s, trimmed to 72 frames.

| Shot | Kind | Job | Credits | Verdict | Notes |
|---|---|---|---|---|---|
| o2 catch, frames a/b/c | image, gpt_image_2_5 max 4k | 6e77e263 / f8150254 / da1c57a7 | 45 | a picked | all three put the crew inside the rail, facing the sea. b and c spread the crew and net across the whole frame. a: the bag hangs from the power block right at the rail, with spilled fish and ice crates in the foreground |
| o2 catch | video, minimax_h3 2K 5 s, start = a | 1f375e2b | 10 | PASS (trimmed 44-115) | all motion is inbound: the bag swings in over the rail, the crew lean back and pull it aboard, and fish spill onto the deck; water runs back into the sea. Frames 48/72/96/120 zoom-checked: the net stays in front of or beside the crew, never through them. Frames 0-43 are cut (the bag only hangs at the rail) |
## 2026-10-12: "Into the plant." as one continuous 3-beat arrival (#229)

Each beat's last frame is the next beat's start frame. Beat 1 has three generated start-frame candidates (docs/review/arrive/sheet-beat1.jpg), with the old hf-arrive end frame as the yard reference. Beats 2 and 3 start from the previous beat's real last frame. minimax_h3 2K at 5 s. Beat 1 is trimmed to frames 52-123. Beats 2 and 3 are retimed from 124 to 72 frames (about 1.7×), so they keep both seam frames.

| Shot | Kind | Job | Credits | Verdict | Notes |
|---|---|---|---|---|---|
| beat 1, frames a/b/c | image, gpt_image_2_5 max 4k | cb792d3d / 92b8b91a / 3d1cc553 | 45 | b picked | all three show the driver. a: the truck is already close to the docks. c: the truck is small and far off. b: the driver is clear at the wheel (zoom-checked), with reefer mist, no logos and the gate open |
| beat 1 (hf-arrive) | video, start = b | 6d8b2945 | 10 | PASS (trimmed 52-123) | the truck comes through the gate and turns toward the docks; the driver is visible throughout, the reefer mists, and the dock worker gestures. The last frame was zoom-checked (driver, hands on wheel) |
| beat 2, take 1 | video, start = beat 1 frame 123 | 88f37e45 | 10 | REJECT | the truck ends side-on along the wall, never backed into a bay (looks like it slides sideways) |
| beat 2, take 2 | video, same start | cb2fa4ae | 10 | REJECT | it reverses with lights on but ends angled near the first bay, not flush in a seal |
| beat 2 end keyframe | image, gpt_image_2_5 max 4k, ref = beat 2 start | de522ff4 | 15 | used | the truck is square in the middle bay with the cab toward the camera, the driver at the mirror and the worker's palm raised (docs/review/arrive/b2-keys.jpg) |
| beat 2 (hf-reverse) | video, start = beat 1 frame 123, end = keyframe | a701641b | 10 | PASS (retimed 124 → 72) | the truck reverses in an arc into the middle bay with red and reverse lights on; the worker walks in from the left and guides it; the driver is visible. First frame vs beat 1's end: SSIM 0.92 |
| beat 3 wild (hf-unload-fish) | video, start = beat 2 frame 123 | 6d198fa0 | 10 | PASS (retimed) | the camera glides past the truck into the dock hall: rear doors open, cold vapour, workers in whites roll crates of whole mackerel on ice onto trolleys, and a probe goes into a crate |
| beat 3 farmed (hf-unload-shrimp) | video, same start | eadaea82 | 10 | PASS (retimed) | the same move with crates of shrimp on ice and a probe check |

Seams: beat 2 last frame vs beat 3 start, SSIM 1.000 (identical). Beat 3 first frame vs that start, 0.91. The engine's 3 % in-chapter crossfade covers both.

Balance after this and the o2 retake: 299.75, so **1,611 used** of the 1,624 guard. That leaves 13, not enough for another image or a pair of videos.

## 2026-11-02: grey slab and rewind remake (fix/grey-slab-remake, docs/review/grey-slab/PLAN.md)

Tarun approved up to 500 credits for shots hf-fish-intake, hf-intake, hf-fish-wash, hf-store and hf-wash, max 2 tries each. Start balance 563.36. Prices from `get_cost` preflights: `gpt_image_2_5` max 4k = 15, `minimax_h3` 2K 5 s = 10. Every start frame is an edit of the shot's own first frame (uploaded as a reference) so camera, layout and lighting match.

| Shot | Kind | Job | Credits | Verdict | Notes |
|---|---|---|---|---|---|
| hf-fish-intake | image, try 1 | 51d0cdfa | 15 | REJECT | sent without the reference frame (my error): clean steel trays and ice, but a different camera and layout |
| hf-intake | image, try 1 | d966811a | 15 | REJECT | same error: no reference frame attached, so it is not the shot's camera |
| hf-fish-intake | image, try 2 (ref) | 351a226f | 15 | PASS | same camera, truck and workers; the grey slabs are now steel trays with rims, the ice is real crushed ice; no text, logos or boats |
| hf-intake | image, try 2 (ref) | 924dcdf5 | 15 | PASS | the carried crate is a steel crate tilted to show shrimp on crushed ice; every trolley crate shows its contents |
| hf-fish-wash | image, try 1 (ref) | e925b591 | 15 | PASS | spray rail on the left; grey boxes are steel grading crates on ice; the right-hand worker holds one washed mackerel over the crate |
| hf-store | image, try 1 (ref) | e278ab11 | 15 | PASS | racks hold brown and frosted white cartons on pallets; the smeared panel is gone |
| hf-wash | image, try 1 (ref) | a90a5b62 | 15 | PASS | the grey block column is stacked steel crates with shrimp on ice (the steel bollard in front was dropped) |
| hf-fish-intake | video, try 2 | 3c9d7916 | 10 | PASS | slow dolly; the workers check gills and probe the tuna; trays and ice stay put; hands zoom-checked; the far door shows sea, sky and a pier line, no boats. Retimed 124 → 72 |
| hf-intake | video, try 2 | 15f45485 | 10 | PASS | she walks toward the camera the whole time; shrimp and ice stay in the crate; the second worker walks away; gloves zoom-checked. Retimed 124 → 72 |
| hf-fish-wash | video, try 1 | 839f1657 | 10 | PASS | one direction only: the right-hand worker takes a washed mackerel from the spray table and lays it in the grading crate (frames 76-124); it stays there and never goes back; the spray rail runs throughout. Retimed 124 → 72 |
| hf-store | video, try 1 | 84a3db07 | 10 | PASS | slow dolly down the aisle; the racks hold cartons in every frame (slab score ≤ 0.7 %); everyone walks one way. Retimed 124 → 72 |
| hf-wash | video, try 1 | e8870523 | 10 | PASS | slow move along the conveyor; the steel crate stacks stay solid; workers grade. Retimed 124 → 72 |

**Total: 155 credits** (7 images, 5 videos; balance 563.36 → 408.36, checked). No still fallback needed: every shot passed within 2 tries. Masters (gitignored): `masters/<id>/master.mp4` (72 frames, 2560×1440, retimed evenly from the 124-frame take) and `masters/<id>/start.png` (the 4K start frame).

The 2026-11-02 total above missed one job: a second `hf-fish-wash` video at 06:02 UTC (10 credits, MiniMax H3), which is the master on disk now. Balance after it: 398.36, read from `balance` and `transactions`. The job id was not recorded.

## 2026-11-03: /story cleanup (fix/story-cleanup, docs/review/cleanup/AUDIT.md)

Tarun approved up to 390 credits, max 2 tries per shot. Start balance 398.36, so the stop line is balance 8.36. Prices from `get_cost`: `gpt_image_2_5` max 4k = 15, `minimax_h3` 2K 5 s = 10. Every start frame is an edit of the shot's own first frame. The five masters from the 2 Nov remake passed a fresh frame check, so they are reused and cost nothing here.

| Shot | Kind | Job | Credits | Running total | Verdict | Notes |
|---|---|---|---|---|---|---|
| hf-unload-fish | image, try 1 (ref) | a4206b24 | 15 | 15 | PASS | same camera and layout; checked against the rules before animating: no grey blocks, real ice, no text, logos or boats |
| hf-iqf | image, try 1 (ref) | 7387e25d | 15 | 30 | PASS | same camera and layout; checked against the rules before animating: no grey blocks, real ice, no text, logos or boats |
| hf-harvest | image, try 1 (ref) | 8b9f8f71 | 15 | 45 | PASS | same camera and layout; checked against the rules before animating: no grey blocks, real ice, no text, logos or boats |
| hf-sort | image, try 1 (ref) | 4592523b | 15 | 60 | PASS | same camera and layout; checked against the rules before animating: no grey blocks, real ice, no text, logos or boats |
| hf-fish-cut | image, try 1 (ref) | 058abe37 | 15 | 75 | PASS | same camera and layout; checked against the rules before animating: no grey blocks, real ice, no text, logos or boats |
| hf-unload-fish | video, try 1 | 78aa38a1 | 10 | 85 | PASS | slow dolly; crates, ice and fish stay solid; the mat stays crisp under thin vapour; no people |
| hf-iqf | video, try 1 | d1fe33fc | 10 | 95 | PASS (retimed 124 → 72) | shrimp stay on the belt and keep their shape; the worker stays still and leaves frame only through the camera move; nothing reaches back over the belt |
| hf-harvest | video, try 1 | 7951f194 | 10 | 105 | PASS (frames 0-104 retimed to 72) | one continuous pull toward the camera; bank crates and ice boxes stay solid; the tail is cut because the left worker slides out of frame |
| hf-sort | video, try 1 | e377e527 | 10 | 115 | REJECT | the push-in is too strong: heads are cropped from about frame 88 and the wading worker leaves the frame |
| hf-fish-cut | video, try 1 | e3b0f3c8 | 10 | 125 | PASS (trimmed 60-108, 49 frames) | frames 112-120 return to the board and frames 24-48 run the blade close to the steadying glove, so both are cut. Kept: the hand takes the portion, lifts it and lays it on the ice, and it stays. 0 credits for the trim |
| hf-sort | video, try 2 | f393f1a9 | 10 | 135 | PASS (frames 0-116 retimed to 72) | heads stay in frame; the bag is lowered and tipped onto the ice in one action and the shrimp stay there; the tail is cut because the wading worker reaches the frame edge |

**Total for this cleanup: 135 credits** (5 images, 6 videos; balance 398.36 → 263.36, checked). Under the 390 cap. No still fallback needed.
