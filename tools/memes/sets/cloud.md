# `cloud` - the memes between the authors' two layouts (sets/cloud.js)

The 29,610 memes of Know Your Meme (the Menche lab's Memes_Data repository, through `MDATA`) as glowing points that flow
from the archive (placed by the tags they share) to the tag network (its 17,243 memes in the authors' eigenvector
layout of their weighted ties), the network's ties drawn within budget, and the story's highlights: communities, the
shell of niches, the commons of classics and its crossing ties, a picked meme, a lit community. Adapted from the CDK5
story's `net` set (`tools/cdk5/sets/net.js`: the move on the GPU and the same function on the CPU, ties following the
points, halos, rings, labels facing the eye, picking with world rays, the near-eye fade, the depth cue). Centred on the
origin; each layout has 90 % of its memes within radius 1.2 (MDATA's frame).

## Deviations from SPEC.md (read first)

- **The archive's lonely memes per meme are not in the data.** `MDATA` gives only their count (`jcAlone`, 11,906), not
  which memes. The set uses `MDATA.alone(i)` when the data offers it (a function: true for an archive meme with no link
  in the archive layout); until then it dims the nearest set the data offers, **the 12,367 memes outside the tag
  network** (the memes tied to none there; most of the archive's 11,906 lonely ones are surely among them, but the sets
  differ). The tag still says `MDATA.jcAlone` ("11,906 with no link"). To make it exact: the generator writes the
  archive's degree-0 flags (`jdeg == 0`, already computed there) and `mdata.js` exposes `alone(i)`; nothing here changes.
- **The communities' names** are the set's (`COMNAME`, from SPEC's list: Music, Social platforms, Image macros, 4chan,
  Politics, General memes, Anime, Film, Games, Streamers, Creepypasta, Phones, TV, Covid, Cartoons, Sport, French TV,
  Gym, Adverts, Wrestling). Tags are drawn for the 19 named ones (0..18, those `MLOOK.com` colours; 19, wrestling with 50
  memes, is grey there and gets a name for explore only). `api().comName(k)` gives them to the engine.
- **The tags' wording** keeps SPEC's sense in the story's words ("ties", "groups"): "The niches · 2 % of their ties leave
  their group", "The commons · a third of their ties reach other groups" (the share in words when it is a plain fraction,
  else a percentage; both from `hyp.bands`).
- **An extra param, `cloud_pulse`** (0..1, default 0): the crossing ties' light running outward grows stronger (for
  chapter 7, "the crossroads' ties pulse outward"). A faint pulse runs whenever `cloud_cross` shows.
- **An extra view, `commons`** (the commons from just outside it), and extra anchors (`commonsTag`, `alone`, `pickTag`,
  `comLit`, `com0..com18`, `core0..core23`) for the set's own tags.

## Data (all `MDATA`; nothing decoded here, nothing computed beyond drawing and choosing what to draw)

Both layouts (`archive`, `net`), `netOf`/`eig`, communities (`com`, `coms`: size, tags, centre), the kept ties (`nb`, `w`),
`deg`, `foreign`, `band`, `tags`, `name`, `hyp` (`core`, `bands`), `jcAlone`. Every number in a tag is read from there.

- **The move** (`cloud_layout` 0..1): each meme after its own seeded delay (at most a third of the move), with a sideways
  bow about the vertical (a swirl), worked out on the graphics card from its two places (filled once, at build); the same
  function on the CPU (`placeAt`) for anchors, halos, rings and picking, so they sit on the points. The 12,367 memes not
  in the network drift outward (12 to 24 % further out) and fade as they go.
- **Ties drawn** (`cloud_links`): each meme's **three strongest kept ties** (by shared tags; equal weights by the lower
  index), both ways, once each: **40,876** segments, filled once. Brightness by weight (log of shared tags); ties longer
  than about 0.35 fade (to 15 % beyond 1.25): they cross the whole cloud and drowned it. A tie shows once both its ends
  have nearly arrived (nothing drawn between flying ends; nothing in the archive layout).
- **The commons' crossing ties** (`cloud_cross`): every kept tie of a commons meme (band 0) whose ends differ in community,
  once each: **6,520**, amber, at full length (they are what reaches the walls), with light running from the commons end
  outward (`uTime`; stronger with `cloud_pulse`).
- **A lit community** (`cloud_com`) draws its other kept ties too (both ends in it, not among the strongest three), up to
  `COMCAP` (12,000; music, the largest, stays under it), in its colour; a **picked meme** (`cloud_pick`) all its kept ties
  (up to 315) in the pick's cyan. These two share one buffer with the crossing ties, refilled only when the pick or the
  community changes. At most **57,337** segments ever drawn at once (measured with everything on, every community).
- **Points**: the CDK5 set's glowing discs. Size 0.011 plus up to 0.005 by ties (log degree), capped at about 0.6 degrees
  across (1.4 for the picked meme and the classics), so standing inside the commons, all within arm's reach, is not a
  wall of blobs; within about 0.15 of the eye they fade. A slow twinkle. The network's points are a little fainter (its
  middle is dense). Depth cue as in the CDK5 set (off near the centre).
- **Picking**: only named memes of the network (never unnamed or flagged ones: never labelled), grown in, and, while a
  community is lit, only its members.
- **Which tags show** (communities, classics): those within about 30 degrees of the line of sight (the camera drawing the
  points gives place and direction, so it works for the engine's camera and each eye of a headset), best scored first,
  none within a few degrees of one already shown. Communities: at most six, larger and more central to the view first.
  Classics: inside the commons (eye within 0.6 of its middle) at most five, most viewed first; from outside they crowd
  into a few degrees, so one, clear of the commons' tag.

## Params (the engine eases them; step params are integers, never eased)

| param | default | meaning | story |
| --- | --- | --- | --- |
| `cloud_a` | 1 | fade | |
| `cloud_layout` | 0 | 0 the archive (29,610), 1 the tag network (17,243; the rest drift out and fade) | 0 (ch. 1), 0 → 1 (ch. 2) |
| `cloud_grow` | 1 | the cloud grows from the centre (each meme by its radius and a seeded share); ties after it | 0 → 1 (ch. 1) |
| `cloud_alone` | 0 | the archive's lonely memes dim to faint grey (`MLOOK.C.alone`; see Deviations); tag "11,906 with no link" | ch. 1 |
| `cloud_links` | 0 | the strongest three ties of each meme, blue | ch. 2 on |
| `cloud_comCol` | 0 | memes and ties take their community's colour; tags at the named communities' centres ("Music · rap, song"), at most six | ch. 3 |
| `cloud_shell` | 0 | the outer 25 % (bands 3, 4) brighten cool (`C.shell`), the rest dims to 22 %; tag "The niches · 2 % ..." on a shell meme in front | ch. 5 |
| `cloud_commons` | 0 | the inner 10 % (band 0) glows gold, the rest dims to 20 %; a soft gold glow at its middle seen from outside; tag "The commons · a third ..." | ch. 6, 7 |
| `cloud_cross` | 0 | the commons' 6,520 crossing ties, amber, running out | ch. 6, 7 |
| `cloud_pulse` | 0 | (extra) the light running out along the crossing ties grows stronger | ch. 7 |
| `cloud_core` | 0 | the classics (`hyp.core`, 24) glow; their names, a few at a time, facing you | ch. 6, 7 |
| `cloud_pick` | -1 | step: -1 or a net index: ring, halo, its ties in cyan, its ties' memes lit, the rest steps back; tags "Doge · bitcoin, stare" and "General memes, the commons · 52 % of its ties leave" (community, band, `foreign`) | explore |
| `cloud_com` | -1 | step: -1 or a community: its memes and ties lit in its colour, its other ties drawn, the rest dims; a soft glow at its centre; tag "Politics · 1,485 memes" (the community tags hide meanwhile) | explore |

Everything that belongs to the network (the shell, the commons, the classics, tags at the communities) shows once the
layout is past 0.6 to 0.7.

## Anchors, views

- Anchors: `centre` [0, 0, 0], `top` [0, 1.32, 0], `commons` (the inner 10 %'s mean in the network's layout), `shell` (a
  band-4 meme up and to the right on the front), `pick` (the picked meme, else Doge), `com(k)` (a function: community k's
  centre), `meme(k)` (a function: net meme k's place now, a new array); the tags' own: `commonsTag` (a commons meme just
  above its middle), `alone` (a lonely meme on the front of the archive), `pickTag` (just under the pick, steady on
  screen), `comLit` (the lit community's centre), `com0..com18`, `core0..core23` (`hyp.core`'s order).
- Views (az 25, el 14 is the front): `default` (the whole cloud from outside, 4.6 away), `side` (az + 90), `close` (1.15
  from the front of the shell, looking in), `inside` (the camera at the origin, looking out towards the default view's side:
  the commons all round, radius about 0.33), `above` (72 degrees up), and `commons` (extra: 1.6 from the commons' middle).

## Explore and api()

- Controls: `layout` (Tag network, Archive), `links` (Ties: On, Off), `colour` (Groups, Plain), `look` (Show:
  Everything, The niches, The commons; network only). `explore(c)` gives `cloud_layout`, `cloud_alone` (on in the
  archive), `cloud_links`, `cloud_comCol`, `cloud_shell`, `cloud_commons`, `cloud_cross` and `cloud_core` (with the
  commons). The pick and the community are the engine's step params.
- `api()` (one object, the same every call): `pick(rc)` (a `THREE.Raycaster`, a `THREE.Ray` or `{ origin, direction }`,
  vectors or arrays, **world coordinates**: the named net meme nearest the ray within about 0.6 degrees, nearer ones
  preferred; -1 none; about 9 ms the first ray in a frame, 0.7 ms each next one in headless Chromium), `pos(k, out)` (net
  meme k's place now), `posArchive(i, out)` (an archive meme's), `near(m)` (how near the eyes nothing is drawn, in the world's units: the engine passes 0.35 in a headset, metres, and 0 on a screen; points and the ends of ties fade out from m to 1.5 m, on top of the fade within 0.06 to 0.17 set units), `eye(x, y, z)` (the eye in the set's frame; the set
  also takes it from the camera each render), `comName(k)`, `named` (19), `bandWord(b)`, `n`, `m`.

## Cost (headless Chromium, software GL)

- Build 85 to 145 ms (the top three ties, the crossing ties, the buffers; `MDATA` is decoded before).
- Draw calls: 1 (points) in the archive; 2 with ties; +1 the crossing, community or pick ties; +1 halos, +1 ring: at most
  5. Points 29,610 (+ up to 27 halos); segments 40,876 (ties), + 6,520 (crossing), + a community's others and a pick's: at
  most 57,337.
- `update`: about 0.04 ms a frame with everything on and the layout moving (uniforms, up to 27 halos, a ring, the tags'
  choice); no allocation per frame. A pick refills one attribute of 29,610 values and up to 315 ties; a community up to
  12,000 ties (a few ms).

## Untested

Everything in a headset: standing inside the commons at life size (the point cap, the near-eye fade, how the crossing
ties read reaching out to the walls), the tags' choice following the head, the pick's tolerance with a controller's
ray. Only seen in headless Chromium.
