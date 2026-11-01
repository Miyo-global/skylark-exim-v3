import { film, type CaptionCopy } from './content.ts'
import { MARKET_COUNT } from './markets.ts'

/**
 * Visual source of one segment. A chapter's scroll length is split evenly across its segments, unless a still or a video sets `span`.
 * - video: public/media/<id>_{m,960,1280,1920}{.av1,.hevc,}.mp4 + <id>_{m,960,1280,1920}.{avif,webp} first-frame posters
 *   + <id>_end_1280.{avif,webp} (scripts/encode-hf.sh)
 * - still: a clip's first frame (every clip tier), or a ph-* stand-in at m / 960 / 1280 / 1920 / 2560, until the scene's clip lands (no label is ever shown; open stand-ins are listed in PR bodies)
 * - gradient: deep-blue stand-in
 * - dom: documentation interlude over a pre-blurred still
 * - globe: the R3F globe
 */
export type Media =
  | { kind: 'video'; id: string; alt: string; /** share of the clip the scroll may show (0–1): holds a push-in before it crops the subject */ until?: number; /** share of the clip where scroll starts, when the head no longer matches the frame held before it */ from?: number; /** share of the chapter's scroll when this clip is not the last one */ span?: number; /** desktop reframe: the picture scaled by `scale` about `x` (0 left – 1 right), to keep a figure cut by the frame edge off screen */ zoom?: { scale: number; x: number } }
  | { kind: 'still'; poster: string; alt: string; /** share of the chapter's scroll, 0–1 (e.g. to end with its caption) */ span?: number }
  | { kind: 'gradient'; alt: string }
  | { kind: 'dom'; poster: string; alt: string }
  | { kind: 'globe'; alt: string }

export type Join = 'shared-frame' | 'crossfade' | 'cut'

export interface Caption extends CaptionCopy {
  at: [number, number]
  /** DOM extra shown with the caption */
  extra?: 'label-card' | 'doc-cards' | 'markets' | 'other-path'
}

export interface ChapterDef {
  id: string
  path: 'ocean' | 'pond' | 'shared'
  /** accessible chapter name */
  label: string
  /** desktop scroll length in vh (mobile uses 0.8×); at least 90 per clip, so a fast scroll still leaves each clip time to load */
  vh: number
  media: Media[]
  captions: Caption[]
  /** how this chapter hands off to the next one */
  joinNext: Join
  /** copy colour scheme; the globe opens into daylight */
  theme?: 'light'
  /** 'soft': a neutral black scrim (bottom, and the side the copy is on) instead of the deep-sea one, for daylight footage and bright interiors (the port and the plant) */
  scrim?: 'soft'
}

/**
 * Phone portrait clips (<id>_m, 810×1440) are a fixed crop of the 2560×1440 master: where the crop's centre sits, as a share
 * of the master's width (0.158–0.842). Picked from first/middle/last frames so the subject stays in frame for the whole
 * clip (contact sheet in the HD PR). Read by scripts/encode-hf.sh; a missing id is centred.
 */
export const CROP_X: Record<string, number> = {
  'hero-loop': 0.5, opening: 0.5,
  'hf-depart': 0.68, 'hf-catch': 0.55, 'hf-ice': 0.45, 'hf-return': 0.55,
  'hf-ponds': 0.5, 'hf-sample': 0.42, 'hf-harvest': 0.45, 'hf-sort': 0.5,
  'hf-arrive': 0.45, 'hf-reverse': 0.55, 'hf-unload-fish': 0.53, 'hf-unload-crew': 0.45, 'hf-unload-shrimp': 0.45, 'hf-intake': 0.3, 'hf-fish-intake': 0.45,
  'hf-wash': 0.45, 'hf-peel': 0.72, 'hf-fish-wash': 0.6, 'hf-fish-cut': 0.4,
  'hf-lab': 0.4, 'hf-iqf': 0.4, 'hf-pack': 0.45, 'hf-store': 0.5, 'hf-fish-freeze': 0.725,
  'hf-ship': 0.5, 'hf-sail': 0.57,
  // the #258 port film, one camera move cut in five: one crop for all five, so the phone joins line up too
  'hf-port-1': 0.45, 'hf-port-2': 0.45, 'hf-port-3': 0.45, 'hf-port-4': 0.45, 'hf-port-5': 0.45,
}

/** Chapters whose copy sits in a right-hand column instead of bottom-left, for editorial rhythm (redesign §6). */
export const COPY_RIGHT = new Set(['o3', 'p2', 'process', 'port'])

/**
 * Clips a desktop plays as a frame sequence on the stage canvas instead of a <video> (#hd2; src/film/sequence.ts, the
 * Terminal Industries pattern): the port film's fast camera moves macroblocked and smeared in video at any byte rate a
 * path can afford. Every master frame as an AVIF still (scripts/clip-frames.sh), so each keeps its frame count and
 * timing. Phones keep the video: 289 phone frames would take most of the 12 MB phone path.
 * hf-catch, hf-peel and hf-lab (#story-seq): the fastest-moving scenes whose 1920 set fits 5 MB, each path's 60 MB
 * desktop budget and the 2560 tier for AV1 and HEVC (scripts/clip-manifest.ts topTier). Every frame of the shipped
 * 2560 clip (FROM_SHIPPED=1 SHARPEN=1 SET_KB=5000 scripts/clip-frames.sh; several masters/ takes are not the footage on
 * the site). SSIM against the 2560 source beats the 1920 video on the frames checked (hf-catch 0.95 vs 0.91-0.93).
 * Left as video: hf-ship (4.6 MB on both paths puts the HEVC 2560 farmed path at 60.5 MB), hf-fish-freeze and hf-return
 * (4.6 / 4.5 MB, no room next to hf-catch on the wild-catch path), hf-fish-wash (waits for new footage).
 */
export const SEQ_CLIPS = ['hf-port-1', 'hf-port-2', 'hf-port-3', 'hf-port-4', 'hf-port-5', 'hf-catch', 'hf-peel', 'hf-lab']

const caps = (id: string, ranges: [number, number][]): Caption[] => film[id].map((c, i) => ({ ...c, at: ranges[i] }))

const OCEAN_ONLY: ChapterDef[] = [
  {
    id: 'o1', path: 'ocean', label: 'Setting out', vh: 200, joinNext: 'crossfade',
    media: [{ kind: 'video', id: 'hf-depart', alt: 'A weathered white and blue fishing boat eases away from the stone quay at sunrise while the crew coil a rope and bring in a fender.' }],
    captions: caps('o1', [[0, 0.92]]),
  },
  {
    id: 'o2', path: 'ocean', label: 'The catch', vh: 140, joinNext: 'crossfade',
    media: [{ kind: 'video', id: 'hf-catch', alt: 'On deck, the boom\'s power block lifts a dripping net full of silver fish in over the rail while the crew lean back and pull it aboard; the fish spill onto the deck beside steel crates of ice.' }],
    captions: caps('o2', [[0.06, 0.95]]),
  },
  {
    id: 'o3', path: 'ocean', label: 'On ice', vh: 100, joinNext: 'crossfade',
    media: [{ kind: 'video', id: 'hf-ice', alt: 'Seen from above, the crew kneel on the wet deck sorting tuna and silver fish into iced steel crates.' }],
    captions: caps('o3', [[0.03, 0.95]]),
  },
  {
    id: 'o4', path: 'ocean', label: 'Back to Vizag', vh: 160, joinNext: 'crossfade',
    media: [{ kind: 'video', id: 'hf-return', alt: 'Porters push trolleys of iced steel crates along the wharf as the fishing boat comes alongside.' }],
    captions: caps('o4', [[0.04, 0.9]]),
  },
]

const POND_ONLY: ChapterDef[] = [
  {
    id: 'p1', path: 'pond', label: 'The ponds', vh: 120, joinNext: 'crossfade',
    media: [{ kind: 'video', id: 'hf-ponds', alt: 'Aerial view over a grid of shrimp ponds on a bright morning, aerators throwing white water, a white refrigerated truck on a bund road.' }],
    captions: caps('p1', [[0, 0.92]]),
  },
  {
    id: 'p2', path: 'pond', label: 'Traceable', vh: 100, joinNext: 'crossfade',
    media: [{ kind: 'video', id: 'hf-sample', alt: 'A farm technician crouches on the pond bank and reads a handheld water meter, its probe hanging on a cable into the pond, aerators churning behind him.' }],
    captions: caps('p2', [[0.02, 0.92]]),
  },
  {
    id: 'p3', path: 'pond', label: 'Harvest', vh: 180, joinNext: 'crossfade',
    media: [
      { kind: 'video', id: 'hf-harvest', alt: 'Sunrise at a shrimp pond: four workers wade behind the drag net, its line of white floats arcing in front of them; on the bank a crew stacks steel crates beside white ice boxes and a white truck.' },
      { kind: 'video', id: 'hf-sort', alt: 'On the pond bank, workers tip live shrimp onto crushed ice in steel and white crates beside the refrigerated truck.' },
    ],
    captions: caps('p3', [[0.02, 0.9]]),
  },
]

/** The farmed path's plant: the shrimp footage and the full work flow (CONTENT.md, written for shrimp). */
const PLANT_POND: ChapterDef[] = [
  {
    id: 'intake', path: 'pond', label: 'Intake', vh: 360, joinNext: 'crossfade', scrim: 'soft',
    media: [
      { kind: 'video', id: 'hf-arrive', alt: 'At dawn a white refrigerated truck drives in through the plant gate, its driver at the wheel and the cooling unit misting, and turns toward the loading docks.' },
      { kind: 'video', id: 'hf-reverse', alt: 'The truck reverses into the insulated dock bay, reverse lights on, as a worker in a hi-vis vest guides it with hand signals and the driver watches the side mirror.' },
      { kind: 'video', id: 'hf-unload-shrimp', alt: 'At the dock, two workers in white coats, hairnets and gloves lift a steel crate of seafood on ice out of the open truck, stacked with steel crates, onto a steel trolley.' },
      { kind: 'video', id: 'hf-intake', alt: 'Inside the receiving bay, a masked worker in a white coat carries a steel crate of shrimp on ice toward the steel trolleys beside the truck, while a second worker walks back to the dock door.' },
    ],
    captions: caps('intake', [[0.02, 0.92]]),
  },
  {
    id: 'process', path: 'pond', label: 'Process', vh: 200, joinNext: 'crossfade', scrim: 'soft',
    media: [
      { kind: 'video', id: 'hf-wash', alt: 'A bright processing hall mid-shift: shrimp ride a conveyor while workers in caps, masks and gloves grade them at the stainless tables beside it.' },
      { kind: 'video', id: 'hf-peel', alt: 'Workers peel and devein shrimp by hand at a stainless table.' },
    ],
    // washing and grading over the wash clip, "Made to order" over the peeling: hf-peel is the peeling alone (it used to
    // glide on into the quality lab, so "Made to order" sat over the lab); the lab clip opens the next chapter with its
    // own caption
    captions: caps('process', [[0.02, 0.24], [0.26, 0.48], [0.52, 0.98]]),
  },
  {
    id: 'coldchain', path: 'pond', label: 'Lab · freeze · pack', vh: 360, joinNext: 'crossfade', scrim: 'soft',
    // one shot per caption: lab, IQF, packing, cold store (each a quarter of the scroll). Each caption sits 0.02 inside
    // its shot's quarter: a caption leaves through a 0.25 s exit before the next one rises, so with ranges on the clip
    // boundaries "Packed and labelled" stayed up over the cold store (and "Frozen at its best" over the packing)
    media: [
      { kind: 'video', id: 'hf-lab', alt: 'In the quality lab, a technician in a white coat inspects a raw shrimp with tweezers at the window bench.' },
      { kind: 'video', id: 'hf-iqf', alt: 'Individually spaced shrimp ride a stainless mesh belt into the IQF freezing tunnel through light cold vapour.' },
      { kind: 'video', id: 'hf-pack', alt: 'A packer in a white coverall places a bag of frozen shrimp into a plain brown carton and closes it.' },
      // a worker at the clip's left edge is cut in half by the frame in every frame: 1.3× anchored right starts the
      // picture at ~26% of the source, past him (~0–21%)
      { kind: 'video', id: 'hf-store', zoom: { scale: 1.3, x: 1 }, alt: 'In the cold store, masked workers in white coats walk an aisle between galvanised steel racks of steel boxes; one pulls a pallet jack by its handle.' },
    ],
    captions: caps('coldchain', [[0.02, 0.23], [0.27, 0.48], [0.52, 0.73], [0.77, 1]]).map((c, i) => (i === 2 ? { ...c, extra: 'label-card' as const } : i === 3 ? { ...c, extra: 'other-path' as const } : c)),
  },
]

/** The wild-catch path's plant (#219): whole fish and tuna loins through the same plant, never a shrimp on screen or in the copy. */
const PLANT_OCEAN: ChapterDef[] = [
  {
    id: 'intake', path: 'ocean', label: 'Intake', vh: 480, joinNext: 'crossfade', scrim: 'soft',
    media: [
      { kind: 'video', id: 'hf-arrive', alt: 'At dawn a white refrigerated truck drives in through the plant gate, its driver at the wheel and the cooling unit misting, and turns toward the loading docks.' },
      { kind: 'video', id: 'hf-reverse', alt: 'The truck reverses into the insulated dock bay, reverse lights on, as a worker in a hi-vis vest guides it with hand signals and the driver watches the side mirror.' },
      { kind: 'video', id: 'hf-unload-fish', alt: 'A refrigerated truck stands backed into the dock seal with its rear doors open; cold vapour drifts out past three steel bins of whole fish on ice, with empty steel trolleys waiting on either side.' },
      { kind: 'video', id: 'hf-unload-crew', alt: 'Two workers in white coats, hairnets and gloves lift a steel crate of whole fish on ice out of the open truck together and set it on a steel trolley at the dock.' },
      { kind: 'video', id: 'hf-fish-intake', alt: 'At the receiving bay, steel trays of whole tuna, seer fish and Indian mackerel on ice; one worker opens a tuna\'s gill cover to check the gills while another inspects a second tuna.' },
    ],
    captions: caps('intake.ocean', [[0.02, 0.92]]),
  },
  {
    id: 'process', path: 'ocean', label: 'Washing and portioning', vh: 180, joinNext: 'crossfade', scrim: 'soft',
    media: [
      { kind: 'video', id: 'hf-fish-wash', alt: 'Whole seer fish and Indian mackerel are rinsed under chilled water on a stainless table and sorted by size into steel crates.' },
      { kind: 'video', id: 'hf-fish-cut', alt: 'A worker portions a deep-red tuna loin on a white board; finished loins lie on crushed ice beside it.' },
    ],
    captions: caps('process.ocean', [[0.04, 0.5], [0.5, 0.96]]),
  },
  {
    // 220: the cold store gets about a screen of scroll (≥ 600 px at 900 high); the freezer push-in crops the front
    // worker's face in its last third, so its scroll stops at 0.6 of the clip
    id: 'coldchain', path: 'ocean', label: 'Freeze and store', vh: 220, joinNext: 'crossfade', scrim: 'soft',
    media: [
      { kind: 'video', id: 'hf-fish-freeze', until: 0.6, span: 0.5, alt: 'A worker in a white coat wheels a steel rack of whole fish and tuna loins into the blast freezer as cold vapour rolls out of the open door.' },
      // a worker at the clip's left edge is cut in half by the frame in every frame: 1.3× anchored right starts the
      // picture at ~26% of the source, past him (~0–21%)
      { kind: 'video', id: 'hf-store', zoom: { scale: 1.3, x: 1 }, alt: 'In the cold store, masked workers in white coats walk an aisle between galvanised steel racks of steel boxes; one pulls a pallet jack by its handle.' },
    ],
    // each caption 0.02 inside its shot's half, so the first one's exit is done before the second rises
    captions: caps('coldchain.ocean', [[0.04, 0.48], [0.52, 1]]).map((c, i) => (i === 1 ? { ...c, extra: 'other-path' as const } : c)),
  },
]

/** The shared ending, identical on both paths: documents, the port, the ship out to sea, the markets. */
const ENDING: ChapterDef[] = [
  {
    id: 'docs', path: 'shared', label: 'Documentation', vh: 100, joinNext: 'cut',
    media: [{ kind: 'dom', poster: 'ph-docs', alt: 'An export office desk in daylight: shipment folders, a binder of certificates and a laptop with a tracking map. Three cards: export documents, compliance, shipment tracking.' }],
    // leaves before the cut to the port, so "Paperwork, done properly" is never over the port footage
    captions: caps('docs', [[0.05, 0.88]]).map((c) => ({ ...c, extra: 'doc-cards' as const })),
  },
  {
    id: 'port', path: 'shared', label: 'The port', vh: 560, joinNext: 'crossfade', scrim: 'soft',
    media: [
      // #258: one continuous camera move, cut into five segments that share their boundary frames.
      // After the spreader meets the box the camera keeps pushing, and the empty chassis on the right leaves the frame.
      // Hold while that chassis is still in the picture. The lift then starts with the container already off the truck,
      // so this join cuts past the shared boundary frame. hf-port-3 stops on frame 31 of 60 (until 0.53), the last
      // with the chassis whole in a 1440×900 crop, on 91vh of scroll: the least that keeps both ≥ 90vh a segment
      // (story-stuck.spec.ts) and ≥ 0.15 s per 100 px (scene-scrub.spec.ts). hf-port-5 takes the rest.
      { kind: 'video', id: 'hf-port-1', alt: 'On the quay beside the moored container ship, the crane\'s yellow spreader hangs over a white refrigerated container on its red truck; the camera eases in.' },
      { kind: 'video', id: 'hf-port-2', alt: 'The camera keeps easing in on the truck parked under the ship-to-shore crane, its spreader above the container.' },
      { kind: 'video', id: 'hf-port-3', until: 0.53, span: 0.162, alt: 'The crane\'s yellow spreader comes down on its cables onto the white container and locks onto it.' },
      { kind: 'video', id: 'hf-port-4', from: 0.24, alt: 'The crane lifts the container off the truck, carries it out over the ship and sets it down on the stack on deck.' },
      { kind: 'video', id: 'hf-port-5', alt: 'The camera pulls back and rises: a row of ship-to-shore cranes, the loaded container ship at the quay, and open sea beyond the breakwater.' },
    ],
    captions: caps('port', [[0.03, 0.92]]),
  },
  {
    id: 'sea', path: 'shared', label: 'At sea', vh: 180, joinNext: 'crossfade',
    media: [
      { kind: 'video', id: 'hf-ship', alt: 'From high on the crane, the camera looks down on the loaded container ship\'s stacked containers and white bridge as it pulls away from the quay.' },
      { kind: 'video', id: 'hf-sail', alt: 'Seen from straight above, the loaded container ship sails alone across deep blue water, trailing a white wake.' },
    ],
    captions: caps('sea', [[0.04, 0.85]]),
  },
  {
    id: 'world', path: 'shared', label: 'The world', vh: 220, joinNext: 'cut', theme: 'light',
    media: [{ kind: 'globe', alt: `A bright daytime globe with gold routes from Visakhapatnam to ${MARKET_COUNT} markets.` }],
    captions: caps('world', [[0.08, 1.01]]).map((c) => ({ ...c, body: undefined, extra: 'markets' as const })),
  },
]

const sharedFor = (path: 'ocean' | 'pond') => [...(path === 'pond' ? PLANT_POND : PLANT_OCEAN), ...ENDING]

/**
 * Two separate stories (#219): each origin, then its own plant, then the shared ending. No chapter of one path renders on
 * the other. The city view is the homepage's hero only: /story opens straight on o1 / p1 at y = 0, so nothing sits above
 * the story to scroll back up to.
 */
export const OCEAN: ChapterDef[] = [...OCEAN_ONLY, ...sharedFor('ocean')]
export const POND: ChapterDef[] = [...POND_ONLY, ...sharedFor('pond')]
export const chaptersFor = (path: 'ocean' | 'pond') => (path === 'pond' ? POND : OCEAN)

/** A path's first clip (o1 / p1): what /story's loader waits for, and what the homepage prefetches. */
export function firstClip(path: 'ocean' | 'pond') {
  const m = chaptersFor(path).flatMap((ch) => ch.media).find((m) => m.kind === 'video')
  return m?.kind === 'video' ? m : null
}
