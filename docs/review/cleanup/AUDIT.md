# /story cleanup audit

Audited: what `feat/higgsfield-story` (2df8514b) serves. Every frame of all 31 clips (`<id>_1920.mp4`) and all 8 frame sets (`<id>-f_1920_NNN.webp`).
Tool: `scripts/story-audit.py`. Contact sheets with every frame numbered, plus scores: `before/<id>.jpg`, `before/<id>-seq.jpg`, `before/scores.json`.
The scores only rank shots for review. Every sheet was then read by eye, with suspects checked at 960 px. The rewind score missed the known `hf-fish-wash` reversal, so it is not trusted alone.

## Ranked by how visible the problem is

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
| `hf-arrive`, `hf-reverse` | Truck moves one way. Its reversing is the action, not a rewind |
| `hf-ponds`, `hf-sample` | Clean. Rewind score is the aerator water |
| `hf-port-1` to `hf-port-5`, `hf-ship`, `hf-sail` | No melted shapes. Rewind scores are camera parallax, grey scores are sky and sea |

The "no boats or ships" rule applies to the regenerated plant and pond frames. The ocean and port chapters show boats and ships by design, so they stay.
